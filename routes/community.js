'use strict';
const { R, HttpError } = require('../lib/http');
const V = require('../lib/validate');
const D = require('../lib/domain');
const { visibleListings } = require('./pros');

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const ATEND = ['Atacado e varejo', 'Atacado', 'Varejo'], ENVIO = ['Envio nacional', 'Envio regional', 'Retirada no local'];
const MODS = {
  educacao: { tipo: 'educacao', cats: ['Cursos', 'Especializações', 'Mentorias', 'Workshops'], date: 'opt', course: true },
  eventos: { tipo: 'evento', cats: ['Congresso', 'Feira', 'Workshop', 'Encontro', 'Palestra'], date: 'req', end: true },
  campeonatos: { tipo: 'campeonato', cats: ['Competição', 'Seletiva'], date: 'req', champ: true },
  lojas: { tipo: 'loja', cats: ['Loja online', 'Loja física'], shop: true },
  marcas: { tipo: 'marca', cats: ['Marca oficial', 'Distribuidor'], shop: true, prods: true },
  tecnologia: { tipo: 'fornecedor', cats: ['Luzes e iluminação', 'Equipamentos', 'Mobiliário', 'Software'], price: true },
  network: { tipo: null, cats: ['Meetup'], date: 'req' }
};
const list = (v, n, max) => (Array.isArray(v) ? v : String(v || '').split(',')).map(x => V.str(x, max)).filter(Boolean).slice(0, n);

R.get('/api/listings', ctx => {
  const mod = ctx.query.mod;
  if (!MODS[mod]) throw new HttpError(400, 'Módulo inválido.');
  const me = ctx.account ? ctx.account.id : 0;
  const rows = visibleListings('AND l.mod=? ORDER BY l.featured DESC, COALESCE(NULLIF(l.date,\'\'),\'9999\') , l.id DESC', mod);
  return { items: rows.map(l => D.listingJson(l, me)) };
});

R.get('/api/listings/mine', { auth: true }, ctx => ({
  items: D.all(`${D.LISTING_SQL} WHERE l.owner_id=? ORDER BY l.id DESC`, ctx.account.id).map(l => D.listingJson(l, ctx.account.id))
}));

R.post('/api/listings', { auth: true }, ctx => {
  const me = ctx.account, b = ctx.body, M = MODS[b.mod];
  if (!M) throw new HttpError(400, 'Módulo inválido.');
  const reg = D.one('SELECT * FROM registrations WHERE account_id=?', me.id);
  if (me.role !== 'admin' && M.tipo && !(reg && reg.status === 'aprovado' && reg.tipo === M.tipo))
    throw new HttpError(403, 'Seu cadastro precisa estar aprovado neste tipo de perfil para publicar aqui.');
  if (me.role !== 'admin' && D.one('SELECT COUNT(*) n FROM listings WHERE owner_id=?', me.id).n >= 30) throw new HttpError(429, 'Limite de anúncios atingido.');
  const E = {}, today = D.nowLocal().date;
  const title = V.str(b.title, 120), desc = V.str(b.desc, 600), cat = V.str(b.cat, 40), cidade = V.str(b.cidade, 80);
  if (title.length < 3) E.title = 'Informe o título.';
  if (desc.length < 10) E.desc = 'Descreva em pelo menos 10 caracteres.';
  if (!M.cats.includes(cat)) E.cat = 'Escolha a categoria.';
  if (!cidade) E.cidade = 'Informe a cidade.';
  if (!UFS.includes(b.uf)) E.uf = 'Escolha a UF.';
  let date = '', end = '';
  if (M.date) {
    date = V.str(b.date, 10);
    if (date ? !V.isDate(date) : M.date === 'req') E.date = 'Informe a data.';
    else if (date && date < today) E.date = 'A data não pode ser no passado.';
    end = V.str(b.end, 10);
    if (M.end && end) { if (!V.isDate(end) || end < date) E.end = 'A data final deve ser igual ou depois da inicial.'; } else end = '';
  }
  let modal = '', nivel = '', stxt = '', atend = '', envio = '', marca = '', price = null;
  if (M.course) { modal = ['Presencial', 'Online', 'Híbrido'].includes(b.modal) ? b.modal : ''; nivel = ['Iniciante', 'Intermediário', 'Avançado'].includes(b.nivel) ? b.nivel : ''; if (!modal) E.modal = 'Escolha a modalidade.'; if (!nivel) E.nivel = 'Escolha o nível.'; }
  if (M.champ) { stxt = ['Inscrições abertas', 'Inscrições encerradas', 'Em breve'].includes(b.stxt) ? b.stxt : ''; if (!stxt) E.stxt = 'Escolha a situação das inscrições.'; }
  if (M.shop) { atend = ATEND.includes(b.atend) ? b.atend : ''; envio = ENVIO.includes(b.envio) ? b.envio : ''; if (!atend) E.atend = 'Escolha o tipo de atendimento.'; if (!envio) E.envio = 'Escolha o envio.'; }
  if (M.price) { marca = V.str(b.marca, 60); price = parseFloat(String(b.price).replace(',', '.')); if (!marca) E.marca = 'Informe a marca.'; if (!(price > 0)) E.price = 'Informe o preço de referência.'; }
  if (Object.keys(E).length) throw new HttpError(422, 'Confira os campos.', E);
  const r = D.run(`INSERT INTO listings(owner_id,mod,title,desc,cat,city,date,end,modal,nivel,stxt,atend,envio,marca,price,tags,prods,status,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, me.id, b.mod, title, desc, cat, `${cidade} - ${b.uf}`, date || null, end || null, modal, nivel, stxt, atend, envio, marca, price,
    JSON.stringify(list(b.tags, 8, 30)), JSON.stringify(M.prods ? list(b.prods, 8, 30) : []), me.role === 'admin' ? 'aprovado' : 'pendente', D.now());
  if (me.role !== 'admin') D.all(`SELECT id FROM accounts WHERE role='admin'`).forEach(a => D.notify(a.id, 'admin', `Novo anúncio aguardando aprovação: ${title}.`, 'admin'));
  return { id: 'l' + Number(r.lastInsertRowid), status: me.role === 'admin' ? 'aprovado' : 'pendente' };
});

R.post('/api/listings/:id/delete', { auth: true }, ctx => {
  const m = ctx.params.id.match(/^l(\d+)$/), l = m && D.one('SELECT * FROM listings WHERE id=?', +m[1]);
  if (!l || (l.owner_id !== ctx.account.id && ctx.account.role !== 'admin')) throw new HttpError(404, 'Anúncio não encontrado.');
  D.run('DELETE FROM listings WHERE id=?', l.id);
  return { ok: true };
});

R.post('/api/listings/:id/interest', { auth: true }, ctx => {
  const m = ctx.params.id.match(/^l(\d+)$/), l = m && D.one(`SELECT * FROM listings WHERE id=? AND status='aprovado' AND hidden=0`, +m[1]);
  if (!l) throw new HttpError(404, 'Anúncio não encontrado.');
  const had = D.one('SELECT 1 FROM interests WHERE account_id=? AND listing_id=?', ctx.account.id, l.id);
  if (had) D.run('DELETE FROM interests WHERE account_id=? AND listing_id=?', ctx.account.id, l.id);
  else {
    D.run('INSERT INTO interests(account_id,listing_id) VALUES(?,?)', ctx.account.id, l.id);
    if (l.owner_id !== ctx.account.id) D.notify(l.owner_id, 'interesse', `${ctx.account.nome.split(' ')[0]} ${l.mod === 'network' ? 'vai participar de' : 'tem interesse em'} “${l.title}”.`);
  }
  return { on: !had, count: D.one('SELECT COUNT(*) n FROM interests WHERE listing_id=?', l.id).n };
});

/* ---------- Network: meetups, grupos e conversas ---------- */
const authorName = `COALESCE(NULLIF(s.nome_prof,''), a.nome)`;
const threadRow = t => ({ id: 't' + t.id, q: t.question, by: t.by, at: t.created_at, tag: t.tag, replies: t.n });

R.get('/api/network', ctx => {
  const me = ctx.account ? ctx.account.id : 0, today = D.nowLocal().date;
  const meetups = visibleListings(`AND l.mod='network' AND COALESCE(NULLIF(l.end,''), l.date) >= ? ORDER BY l.date`, today).map(l => D.listingJson(l, me));
  const groups = D.all(`SELECT g.id, g.name, (SELECT COUNT(*) FROM group_members m WHERE m.group_id=g.id) members FROM groups g ORDER BY members DESC, g.id DESC LIMIT 50`)
    .map(g => ({ id: 'g' + g.id, name: g.name, members: g.members }));
  const threads = D.all(`SELECT t.*, ${authorName} by, (SELECT COUNT(*) FROM replies r WHERE r.thread_id=t.id) n
    FROM threads t JOIN accounts a ON a.id=t.author_id LEFT JOIN setups s ON s.account_id=a.id ORDER BY t.id DESC LIMIT 30`).map(threadRow);
  const pros = D.loadPros({ viewerId: me }).sort((a, b) => b.rating - a.rating || b.boost - a.boost).slice(0, 3).map(({ canReview, galeria, boost, ...p }) => p);
  return { meetups, groups, threads, pros };
});

const limitPost = require('../lib/security').limiter(20, 36e5);
R.post('/api/groups', { auth: true }, ctx => {
  const name = V.str(ctx.body.name, 60);
  if (name.length < 3) throw new HttpError(422, 'Dê um nome ao grupo (mínimo 3 letras).');
  if (!limitPost('g' + ctx.account.id)) throw new HttpError(429, 'Muitas criações seguidas. Tente mais tarde.');
  if (D.one('SELECT 1 FROM groups WHERE name=?', name)) throw new HttpError(409, 'Já existe um grupo com esse nome.');
  const r = D.run('INSERT INTO groups(name,creator_id,created_at) VALUES(?,?,?)', name, ctx.account.id, D.now());
  D.run('INSERT INTO group_members(group_id,account_id) VALUES(?,?)', Number(r.lastInsertRowid), ctx.account.id);
  return { id: 'g' + Number(r.lastInsertRowid) };
});
R.post('/api/groups/:id/join', { auth: true }, ctx => {
  const m = ctx.params.id.match(/^g(\d+)$/), g = m && D.one('SELECT * FROM groups WHERE id=?', +m[1]);
  if (!g) throw new HttpError(404, 'Grupo não encontrado.');
  const had = D.one('SELECT 1 FROM group_members WHERE group_id=? AND account_id=?', g.id, ctx.account.id);
  if (had) D.run('DELETE FROM group_members WHERE group_id=? AND account_id=?', g.id, ctx.account.id);
  else D.run('INSERT INTO group_members(group_id,account_id) VALUES(?,?)', g.id, ctx.account.id);
  return { on: !had, members: D.one('SELECT COUNT(*) n FROM group_members WHERE group_id=?', g.id).n };
});

const TAGS = ['Geral', 'Lash Designers', 'Educação', 'Mercado', 'Equipamentos'];
R.post('/api/threads', { auth: true }, ctx => {
  const q = V.str(ctx.body.q, 200), tag = TAGS.includes(ctx.body.tag) ? ctx.body.tag : 'Geral';
  if (q.length < 8) throw new HttpError(422, 'Escreva a pergunta com pelo menos 8 caracteres.');
  if (!limitPost('t' + ctx.account.id)) throw new HttpError(429, 'Muitas publicações seguidas. Tente mais tarde.');
  const r = D.run('INSERT INTO threads(author_id,question,tag,created_at) VALUES(?,?,?,?)', ctx.account.id, q, tag, D.now());
  return { id: 't' + Number(r.lastInsertRowid) };
});
const threadId = s => { const m = String(s).match(/^t(\d+)$/); const t = m && D.one('SELECT * FROM threads WHERE id=?', +m[1]); if (!t) throw new HttpError(404, 'Conversa não encontrada.'); return t; };
R.get('/api/threads/:id', ctx => {
  const t = threadId(ctx.params.id);
  const by = D.one(`SELECT ${authorName} n FROM accounts a LEFT JOIN setups s ON s.account_id=a.id WHERE a.id=?`, t.author_id).n;
  const replies = D.all(`SELECT ${authorName} by, r.body, r.created_at at FROM replies r JOIN accounts a ON a.id=r.author_id LEFT JOIN setups s ON s.account_id=a.id WHERE r.thread_id=? ORDER BY r.id LIMIT 200`, t.id);
  return { id: 't' + t.id, q: t.question, by, at: t.created_at, tag: t.tag, replies };
});
R.post('/api/threads/:id/replies', { auth: true }, ctx => {
  const t = threadId(ctx.params.id), body = V.str(ctx.body.body, 1000);
  if (!body) throw new HttpError(400, 'Escreva sua resposta antes de enviar.');
  if (!limitPost('r' + ctx.account.id)) throw new HttpError(429, 'Muitas respostas seguidas. Tente mais tarde.');
  D.run('INSERT INTO replies(thread_id,author_id,body,created_at) VALUES(?,?,?,?)', t.id, ctx.account.id, body, D.now());
  if (t.author_id !== ctx.account.id) D.notify(t.author_id, 'resposta', `${ctx.account.nome.split(' ')[0]} respondeu a sua pergunta “${t.question.slice(0, 50)}”.`, 'network');
  return { ok: true };
});
module.exports = { MODS, TAGS };
