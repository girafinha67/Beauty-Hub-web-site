'use strict';
const { R, HttpError } = require('../lib/http');
const V = require('../lib/validate');
const D = require('../lib/domain');
const { setupJson, counters } = require('../lib/me');

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const ATEND = ['estudio', 'domicilio', 'ambos'];
const PAGTO = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'];
const DURS = [30, 45, 60, 90, 120, 150, 180, 210, 240];
const GALLERY_FREE = 3, GALLERY_PLAN = 20;

function addrCheck(o, pre, E) {
  const g = k => V.str(o && o[k], 120);
  if (!g('rua')) E[pre + 'rua'] = 'Informe a rua ou avenida.';
  if (!g('num')) E[pre + 'num'] = 'Informe o número (ou S/N).';
  if (!g('cidade')) E[pre + 'cidade'] = 'Informe a cidade.';
  if (!UFS.includes(o && o.uf)) E[pre + 'uf'] = 'Escolha a UF.';
  if (g('cep') && V.digits(g('cep')).length !== 8) E[pre + 'cep'] = 'O CEP tem 8 números.';
}
const addrOf = o => ({ rua: V.str(o.rua, 120), num: V.str(o.num, 20), bairro: V.str(o.bairro, 80), cidade: V.str(o.cidade, 80), uf: o.uf || '', cep: V.str(o.cep, 9) });

R.get('/api/me/setup', { auth: true }, ctx => setupJson(ctx.account));

R.put('/api/me/setup', { auth: true }, ctx => {
  const acc = ctx.account, b = ctx.body, pro = D.isProAcc(acc), E = {};
  addrCheck(b, '', E);
  const w = b.w && typeof b.w === 'object' ? b.w : {};
  let services = [], dias = [2, 3, 4, 5, 6], pagto = ['Pix'], atend = 'estudio', raio = 10, abre = '09:00', fecha = '18:00', wa = '', ig = '', agenda = '';
  if (pro) {
    if (V.str(b.nomeProf, 80).length < 2) E.nomeProf = 'Informe o nome que será exibido.';
    if (!V.str(b.spec, 60)) E.spec = 'Escolha sua especialidade.';
    if (!(V.cpfOk(b.doc) || V.cnpjOk(b.doc))) E.doc = 'CPF ou CNPJ inválido. Confira os números.';
    atend = ATEND.includes(b.atend) ? b.atend : 'estudio';
    if (atend !== 'domicilio' && !b.mesmo) addrCheck(w, 'w.', E);
    const list = Array.isArray(b.services) ? b.services.slice(0, 40) : [];
    if (!list.length) E.services = 'Adicione ao menos um serviço.';
    const seen = new Set();
    list.forEach((s, i) => {
      const n = V.str(s && s.n, 60), p = parseFloat(String(s && s.p).replace(',', '.')), d = +(s && s.d);
      if (n.length < 2) E['svc' + i] = 'Informe o nome do serviço.';
      else if (seen.has(D.norm(n))) E['svc' + i] = 'Serviço repetido.';
      else if (!(p > 0 && p < 100000)) E['svc' + i] = 'Informe o preço de “' + n + '”.';
      else if (!DURS.includes(d)) E['svc' + i] = 'Duração inválida.';
      seen.add(D.norm(n));
      services.push({ n, p: Math.round(p * 100) / 100, d });
    });
    dias = Array.isArray(b.dias) ? [...new Set(b.dias.map(Number).filter(x => x >= 0 && x <= 6))].sort() : [];
    if (!dias.length) E.dias = 'Escolha ao menos um dia.';
    abre = b.abre; fecha = b.fecha;
    if (!V.isTime(abre) || !V.isTime(fecha) || abre >= fecha) E.fecha = 'O horário de fechamento deve ser depois da abertura.';
    pagto = (Array.isArray(b.pagto) ? b.pagto : []).filter(x => PAGTO.includes(x));
    const wd = V.digits(b.wa);
    if (wd.length < 10 || wd.length > 11) E.wa = 'Informe o WhatsApp com DDD.'; else wa = wd;
    ig = V.str(b.ig, 31).replace(/^@/, '');
    if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) E.ig = 'Use só letras, números, ponto e sublinhado.';
    raio = [5, 10, 20, 30, 50].includes(+b.raio) ? +b.raio : 10;
    agenda = V.str(b.agenda, 300);
    if (agenda && !/^https:\/\/[^\s]+$/.test(agenda)) E.agenda = 'Use um endereço começando com https://';
  }
  if (Object.keys(E).length) throw new HttpError(422, 'Confira os campos destacados.', E);

  const a = addrOf(b), wk = addrOf(w), pref = (Array.isArray(b.pref) ? b.pref : []).map(x => V.str(x, 40)).filter(Boolean).slice(0, 12);
  const lat = Number.isFinite(+b.lat) && b.lat !== null ? +b.lat : null, lng = Number.isFinite(+b.lng) && b.lng !== null ? +b.lng : null;
  D.tx(() => {
    D.run('INSERT INTO setups(account_id) VALUES(?) ON CONFLICT(account_id) DO NOTHING', acc.id);
    D.run(`UPDATE setups SET done=1, rua=?, num=?, bairro=?, cidade=?, uf=?, cep=?, lat=?, lng=?, pref=?,
      nome_prof=?, spec=?, anos=?, bio=?, atend=?, mesmo=?, w=?, raio=?, dias=?, abre=?, fecha=?, pagto=?, wa=?, ig=?, agenda=?, updated_at=? WHERE account_id=?`,
      a.rua, a.num, a.bairro, a.cidade, a.uf, a.cep, lat, lng, JSON.stringify(pref),
      pro ? V.str(b.nomeProf, 80) : '', pro ? V.str(b.spec, 60) : '', pro ? V.str(b.anos, 40) : '', pro ? V.str(b.bio, 500) : '',
      atend, b.mesmo === false ? 0 : 1, JSON.stringify(wk), raio, JSON.stringify(dias), abre, fecha, JSON.stringify(pagto), wa, ig, agenda, D.now(), acc.id);
    D.run('DELETE FROM services WHERE account_id=?', acc.id);
    if (pro) {
      services.forEach((s, i) => D.run('INSERT INTO services(account_id,nome,preco,duracao,pos) VALUES(?,?,?,?,?)', acc.id, s.n, s.p, s.d, i));
      D.run('UPDATE accounts SET doc=? WHERE id=?', V.digits(b.doc), acc.id);
    }
  });
  return setupJson(D.one('SELECT * FROM accounts WHERE id=?', acc.id));
});

R.put('/api/me/contacts', { auth: true }, ctx => {
  const acc = ctx.account, b = ctx.body, E = {};
  const s = D.one('SELECT * FROM setups WHERE account_id=?', acc.id);
  if (!s || !s.done) throw new HttpError(409, 'Complete seu cadastro antes de editar os contatos.');
  const wa = V.digits(b.wa), ig = V.str(b.ig, 31).replace(/^@/, ''), agenda = V.str(b.agenda, 300);
  if (D.isProAcc(acc) && (wa.length < 10 || wa.length > 11)) E.wa = 'Informe o WhatsApp com DDD.';
  if (!D.isProAcc(acc) && wa && (wa.length < 10 || wa.length > 11)) E.wa = 'Informe o WhatsApp com DDD.';
  if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) E.ig = 'Use só letras, números, ponto e sublinhado.';
  if (agenda) {
    const perms = D.permsOf(D.one('SELECT * FROM registrations WHERE account_id=?', acc.id), D.plansMap());
    if (!perms.agendamento) E.agenda = 'O link de agendamento faz parte de planos com agendamento ativo.';
    else if (!/^https:\/\/[^\s]+$/.test(agenda)) E.agenda = 'Use um endereço começando com https://';
  }
  if (Object.keys(E).length) throw new HttpError(422, 'Confira os campos.', E);
  D.run('UPDATE setups SET wa=?, ig=?, agenda=? WHERE account_id=?', wa, ig, agenda, acc.id);
  return setupJson(acc);
});

/* ---------- fotos ---------- */
R.post('/api/me/photo', { auth: true, raw: true }, ctx => {
  const url = D.saveImage(ctx.body);
  D.run('INSERT INTO setups(account_id) VALUES(?) ON CONFLICT(account_id) DO NOTHING', ctx.account.id);
  const old = D.one('SELECT photo FROM setups WHERE account_id=?', ctx.account.id).photo;
  D.run('UPDATE setups SET photo=? WHERE account_id=?', url, ctx.account.id);
  D.removeImage(old);
  return { photo: url };
});

R.post('/api/me/banner', { auth: true, raw: true }, ctx => {
  if (!D.isProAcc(ctx.account)) throw new HttpError(403, 'O banner é para perfis profissionais.');
  const url = D.saveImage(ctx.body);
  D.run('INSERT INTO setups(account_id) VALUES(?) ON CONFLICT(account_id) DO NOTHING', ctx.account.id);
  const old = D.one('SELECT banner FROM setups WHERE account_id=?', ctx.account.id).banner;
  D.run('UPDATE setups SET banner=? WHERE account_id=?', url, ctx.account.id);
  D.removeImage(old);
  return { banner: url };
});
R.delete('/api/me/banner', { auth: true }, ctx => {
  const old = (D.one('SELECT banner FROM setups WHERE account_id=?', ctx.account.id) || {}).banner;
  D.run("UPDATE setups SET banner='' WHERE account_id=?", ctx.account.id);
  D.removeImage(old);
  return { banner: '' };
});

function galleryLimit(accId) {
  const reg = D.one('SELECT * FROM registrations WHERE account_id=?', accId);
  return D.permsOf(reg, D.plansMap()).galeria ? GALLERY_PLAN : GALLERY_FREE;
}
R.post('/api/me/gallery', { auth: true, raw: true }, ctx => {
  if (!D.isProAcc(ctx.account)) throw new HttpError(403, 'A galeria é para perfis profissionais.');
  const max = galleryLimit(ctx.account.id);
  if (D.one('SELECT COUNT(*) n FROM photos WHERE account_id=?', ctx.account.id).n >= max)
    throw new HttpError(409, `Você já tem ${max} fotos. Remova uma ou escolha um plano com galeria maior.`);
  const url = D.saveImage(ctx.body);
  const r = D.run('INSERT INTO photos(account_id,file,created_at) VALUES(?,?,?)', ctx.account.id, url, D.now());
  return { id: Number(r.lastInsertRowid), url, max };
});
R.delete('/api/me/gallery/:id', { auth: true }, ctx => {
  const p = D.one('SELECT * FROM photos WHERE id=? AND account_id=?', +ctx.params.id, ctx.account.id);
  if (!p) throw new HttpError(404, 'Foto não encontrada.');
  D.run('DELETE FROM photos WHERE id=?', p.id);
  D.removeImage(p.file);
  return { ok: true };
});

/* ---------- favoritos e seguidores ---------- */
R.post('/api/favorites/toggle', { auth: true }, ctx => {
  const ref = String(ctx.body.ref || ''), m = ref.match(/^([pl])(\d+)$/);
  if (!m) throw new HttpError(400, 'Item inválido.');
  const exists = m[1] === 'p'
    ? D.one(`SELECT 1 FROM setups WHERE account_id=? AND done=1`, +m[2])
    : D.one(`SELECT 1 FROM listings WHERE id=? AND status='aprovado' AND hidden=0`, +m[2]);
  const had = D.one('SELECT 1 FROM favorites WHERE account_id=? AND ref=?', ctx.account.id, ref);
  if (had) D.run('DELETE FROM favorites WHERE account_id=? AND ref=?', ctx.account.id, ref);
  else if (!exists) throw new HttpError(404, 'Item não encontrado.');
  else D.run('INSERT INTO favorites(account_id,ref) VALUES(?,?)', ctx.account.id, ref);
  return { on: !had };
});

R.post('/api/follows/toggle', { auth: true }, ctx => {
  const m = String(ctx.body.pro || '').match(/^p(\d+)$/);
  if (!m) throw new HttpError(400, 'Perfil inválido.');
  const id = +m[1];
  if (id === ctx.account.id) throw new HttpError(400, 'Você não pode seguir o próprio perfil.');
  const target = D.one('SELECT * FROM accounts WHERE id=?', id);
  if (!target || !D.isProAcc(target)) throw new HttpError(404, 'Perfil não encontrado.');
  const had = D.one('SELECT 1 FROM follows WHERE account_id=? AND pro_id=?', ctx.account.id, id);
  if (had) D.run('DELETE FROM follows WHERE account_id=? AND pro_id=?', ctx.account.id, id);
  else { D.run('INSERT INTO follows(account_id,pro_id) VALUES(?,?)', ctx.account.id, id); D.notify(id, 'follow', `${ctx.account.nome.split(' ')[0]} começou a seguir você.`); }
  return { on: !had };
});

/* ---------- notificações ---------- */
R.get('/api/notifications', { auth: true }, ctx => ({
  items: D.all('SELECT id, kind, text, link, read, created_at FROM notifications WHERE account_id=? ORDER BY id DESC LIMIT 40', ctx.account.id)
}));
R.post('/api/notifications/read', { auth: true }, ctx => { D.run('UPDATE notifications SET read=1 WHERE account_id=?', ctx.account.id); return { ok: true }; });
R.get('/api/counters', { auth: true }, ctx => counters(ctx.account.id));
