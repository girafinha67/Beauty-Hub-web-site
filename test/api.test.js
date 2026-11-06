'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { boot, CPF } = require('./helpers');
let T, pro, cli, adm;
const signup = (c, o) => c.post('/api/auth/signup', { nome: 'Maria Silva', tel: '41999998888', senha: 'Senha@123', aceite: true, obj: 'encontrar', papel: 'Cliente', ...o });
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const addr = { rua: 'Rua A', num: '10', bairro: 'Centro', cidade: 'Curitiba', uf: 'PR', cep: '80000-000' };

before(async () => { T = await boot(); pro = T.client(); cli = T.client(); adm = T.client(); });
after(() => T.server.close());

test('segurança básica: exige cabeçalho anti-CSRF e login', async () => {
  const r = await fetch(T.base + '/api/auth/login', { method: 'POST', body: '{}' });
  assert.equal(r.status, 403);
  assert.equal((await cli.get('/api/appointments')).status, 401);
  assert.equal((await cli.get('/api/admin/overview')).status, 401);
  assert.equal((await fetch(T.base + '/uploads/../../etc/passwd')).status, 404);
});

test('cadastro valida CPF, e-mail e senha no servidor', async () => {
  const r = await signup(cli, { nome: 'X', doc: '11111111111', email: 'ruim', senha: '123' });
  assert.equal(r.status, 422);
  assert.ok(r.body.fields.nome && r.body.fields.doc && r.body.fields.email && r.body.fields.senha);
});

test('cadastro, login, logout e senha guardada com hash', async () => {
  let r = await signup(pro, { nome: 'Helena Duarte', doc: CPF[0], email: 'helena@x.com', obj: 'divulgar', papel: '' });
  assert.equal(r.status, 200); assert.equal(r.body.account.isPro, true);
  assert.equal((await signup(T.client(), { doc: CPF[1], email: 'HELENA@x.com' })).status, 422);
  assert.match((await T.db.one('SELECT pw FROM accounts WHERE email=?', 'helena@x.com')).pw, /^scrypt\$/);
  await pro.post('/api/auth/logout');
  assert.equal((await pro.get('/api/appointments')).status, 401);
  assert.equal((await pro.post('/api/auth/login', { email: 'helena@x.com', senha: 'errada@1' })).status, 401);
  r = await pro.post('/api/auth/login', { email: 'helena@x.com', senha: 'Senha@123' });
  assert.equal(r.status, 200);
  r = await signup(cli, { nome: 'Ana Cliente', doc: CPF[1], email: 'ana@x.com' }); assert.equal(r.status, 200);
  r = await signup(adm, { nome: 'Admin Geral', doc: CPF[2], email: 'adm@x.com' }); assert.equal(r.status, 200);
  await T.db.run(`UPDATE accounts SET role='admin' WHERE email='adm@x.com'`);
});

test('perfil profissional exige dados reais e aparece na busca só depois de pronto', async () => {
  assert.equal((await T.client().get('/api/pros')).body.items.length, 0);
  let r = await pro.put('/api/me/setup', { ...addr, nomeProf: 'Helena Lash', spec: 'Lash Designer', doc: CPF[0], atend: 'estudio', mesmo: true, services: [], dias: [], abre: '10:00', fecha: '09:00', pagto: ['Pix'], wa: '', ig: '' });
  assert.equal(r.status, 422); assert.ok(r.body.fields.services && r.body.fields.dias && r.body.fields.fecha && r.body.fields.wa);
  const all = [0, 1, 2, 3, 4, 5, 6];
  r = await pro.put('/api/me/setup', { ...addr, nomeProf: 'Helena Lash', spec: 'Lash Designer', doc: CPF[0], bio: 'Volume russo', atend: 'estudio', mesmo: true,
    services: [{ n: 'Volume russo', p: '260,00', d: 120 }, { n: 'Manutenção', p: 130, d: 60 }], dias: all, abre: '08:00', fecha: '20:00', pagto: ['Pix'], wa: '(41) 99999-0000', ig: '@helena.lash' });
  assert.equal(r.status, 200); assert.equal(r.body.services[0].p, 260);
  const list = (await cli.get('/api/pros')).body.items;
  assert.equal(list.length, 1); assert.equal(list[0].name, 'Helena Lash'); assert.equal(list[0].wa, '5541999990000');
  assert.equal(list[0].doc, undefined);
  assert.equal((await cli.get('/api/pros?q=russo')).body.items.length, 1);
  assert.equal((await cli.get('/api/pros?q=unha')).body.items.length, 0);
});

test('upload de foto valida o conteúdo do arquivo', async () => {
  assert.equal((await pro.raw('/api/me/photo', Buffer.from('<svg onload=alert(1)>'))).status, 415);
  const r = await pro.raw('/api/me/photo', PNG);
  assert.equal(r.status, 200);
  const img = await fetch(T.base + r.body.photo);
  assert.equal(img.status, 200); assert.equal(img.headers.get('content-type'), 'image/png');
});

let apptId, svcId, proRef;
test('agendamento: horários livres, conflito, confirmação e conclusão', async () => {
  const p = (await cli.get('/api/pros')).body.items[0]; proRef = p.id; svcId = p.services[0].id;
  const day = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  let r = await cli.get(`/api/pros/${proRef}/slots?svc=${svcId}&date=${day}`); assert.equal(r.status, 200);
  assert.ok(r.body.slots.includes('08:00') && r.body.slots.includes('18:00') && !r.body.slots.includes('19:00'));
  r = await cli.post('/api/appointments', { pro: proRef, svc: svcId, date: day, time: '09:00' }); assert.equal(r.status, 200); apptId = r.body.id;
  r = await cli.post('/api/appointments', { pro: proRef, svc: svcId, date: day, time: '10:00' }); assert.equal(r.status, 409, 'sobreposição');
  assert.ok(!(await cli.get(`/api/pros/${proRef}/slots?svc=${svcId}&date=${day}`)).body.slots.includes('09:30'));
  assert.equal((await cli.post('/api/appointments', { pro: proRef, svc: svcId, date: '2020-01-01', time: '09:00' })).status, 400);
  assert.equal((await pro.post('/api/appointments', { pro: proRef, svc: svcId, date: day, time: '15:00' })).status, 400, 'não agenda consigo mesma');
});

test('fluxo do agendamento: pro confirma, cliente não pode concluir, conclusão só no dia', async () => {
  assert.equal((await cli.patch('/api/appointments/' + apptId, { status: 'confirmado' })).status, 409);
  assert.equal((await pro.patch('/api/appointments/' + apptId, { status: 'confirmado' })).status, 200);
  assert.equal((await pro.patch('/api/appointments/' + apptId, { status: 'concluido' })).status, 409, 'ainda não chegou o dia');
  await T.db.run(`UPDATE appointments SET date='2020-01-01' WHERE id=?`, apptId);
  assert.equal((await pro.patch('/api/appointments/' + apptId, { status: 'concluido' })).status, 200);
  const mine = (await cli.get('/api/appointments')).body.items[0];
  assert.equal(mine.status, 'concluido'); assert.equal(mine.canReview, false, 'plano sem avaliações');
  assert.ok((await pro.get('/api/me')).body.counts.notif >= 1);
});

test('plano: cadastro de divulgação, aprovação e pagamento manual pelo admin liberam avaliações', async () => {
  let r = await pro.post('/api/registration', { tipo: 'profissional', nome: 'Helena Lash', descricao: '', plan: 'profissional', cycle: 'mensal' });
  assert.equal(r.status, 200); assert.equal(r.body.reg.status, 'pendente');
  assert.equal((await pro.post('/api/registration/pay')).status, 503);
  assert.equal((await pro.get('/api/admin/overview')).status, 403);
  const id = r.body.reg.id;
  assert.equal((await adm.patch('/api/admin/registrations/' + id, { status: 'aprovado' })).status, 200);
  assert.equal((await pro.get('/api/me')).body.reg.active, false, 'aprovado mas sem pagamento');
  assert.equal((await adm.patch('/api/admin/registrations/' + id, { pay_status: 'pago', verified: true })).status, 200);
  const me = (await pro.get('/api/me')).body; assert.equal(me.reg.active, true);
  const mine = (await cli.get('/api/appointments')).body.items[0]; assert.equal(mine.canReview, true);
  assert.equal((await cli.post('/api/appointments/' + apptId + '/review', { nota: 9 })).status, 422);
  assert.equal((await cli.post('/api/appointments/' + apptId + '/review', { nota: 5, texto: 'Perfeito' })).status, 200);
  assert.equal((await cli.post('/api/appointments/' + apptId + '/review', { nota: 5 })).status, 409);
  const p = (await cli.get('/api/pros')).body.items[0];
  assert.equal(p.rating, 5); assert.equal(p.reviews, 1); assert.equal(p.verified, true);
  const det = (await cli.get('/api/pros/' + p.id)).body; assert.equal(det.reviewList[0].autor, 'Ana');
  assert.equal((await adm.get('/api/admin/overview')).body.revenue, 79.9);
});

test('mensagens, favoritos, seguir e notificações', async () => {
  const proAcc = (await pro.get('/api/me')).body.account.id;
  let r = await cli.post('/api/conversations', { to: proAcc }); assert.equal(r.status, 200); const cid = r.body.id;
  assert.equal((await cli.post(`/api/conversations/${cid}/messages`, { body: '   ' })).status, 400);
  assert.equal((await cli.post(`/api/conversations/${cid}/messages`, { body: 'Olá! Tem horário?' })).status, 200);
  assert.equal((await pro.get('/api/counters')).body.msgs, 1);
  assert.equal((await adm.get(`/api/conversations/${cid}/messages`)).status, 404, 'terceiros não leem');
  r = await pro.get(`/api/conversations/${cid}/messages`); assert.equal(r.body.items[0].body, 'Olá! Tem horário?'); assert.equal(r.body.items[0].mine, false);
  assert.equal((await pro.get('/api/counters')).body.msgs, 0);
  assert.equal((await cli.post('/api/favorites/toggle', { ref: proRef })).body.on, true);
  assert.deepEqual((await cli.get('/api/me')).body.favs, [proRef]);
  assert.equal((await cli.get('/api/favorites')).body.pros.length, 1);
  assert.equal((await cli.post('/api/favorites/toggle', { ref: 'p9999' })).status, 404);
  assert.equal((await cli.post('/api/follows/toggle', { pro: proRef })).body.on, true);
  assert.equal((await pro.post('/api/follows/toggle', { pro: proRef })).status, 400);
  await pro.post('/api/notifications/read');
  assert.equal((await pro.get('/api/counters')).body.notif, 0);
});

test('anúncios: só perfil aprovado do tipo certo publica; admin aprova; interesse conta', async () => {
  const body = { mod: 'eventos', title: 'Encontro Lash Sul', desc: 'Palestras e networking.', cat: 'Congresso', cidade: 'Curitiba', uf: 'PR', date: new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10) };
  assert.equal((await pro.post('/api/listings', body)).status, 403, 'perfil profissional não publica evento');
  assert.equal((await cli.post('/api/listings', { ...body, mod: 'network', cat: 'Meetup', title: 'Meetup Curitiba' })).status, 200, 'meetup é livre');
  assert.equal((await cli.get('/api/network')).body.meetups.length, 0, 'pendente não aparece');
  const pend = (await adm.get('/api/admin/listings')).body.items[0];
  assert.equal(pend.status, 'pendente');
  await adm.patch('/api/admin/listings/' + pend.id, { status: 'aprovado' });
  const net = (await cli.get('/api/network')).body; assert.equal(net.meetups.length, 1);
  assert.equal((await pro.post(`/api/listings/${pend.id}/interest`)).body.count, 1);
  assert.equal((await pro.get('/api/me')).body.joined.includes('m:' + pend.id), true);
  assert.equal((await adm.post('/api/listings', { ...body, cat: 'Inexistente' })).status, 422);
  assert.equal((await adm.post('/api/listings', body)).body.status, 'aprovado');
  assert.equal((await cli.get('/api/listings?mod=eventos')).body.items.length, 1);
  assert.equal((await cli.get('/api/radar')).body.items.length, 2);
  assert.equal((await cli.get('/api/search?q=lash sul')).body.items.length, 1);
});

test('network: grupos e conversas', async () => {
  let r = await cli.post('/api/groups', { name: 'Lash Designers Brasil' }); assert.equal(r.status, 200);
  assert.equal((await pro.post('/api/groups', { name: 'lash designers brasil' })).status, 409);
  assert.equal((await pro.post(`/api/groups/${r.body.id}/join`)).body.members, 2);
  r = await cli.post('/api/threads', { q: 'Qual cola vocês usam?', tag: 'Lash Designers' }); const tid = r.body.id;
  assert.equal((await pro.post(`/api/threads/${tid}/replies`, { body: 'Uso a de secagem rápida.' })).status, 200);
  const t = (await cli.get('/api/threads/' + tid)).body; assert.equal(t.replies.length, 1); assert.equal(t.by, 'Ana Cliente');
  assert.equal((await adm.post('/api/admin/threads/' + tid.slice(1) + '/delete')).status, 200);
  assert.equal((await cli.get('/api/threads/' + tid)).status, 404);
});

test('redefinição de senha invalida sessões; exclusão de conta apaga tudo', async () => {
  const c = T.client(); await signup(c, { nome: 'Rita Souza', doc: CPF[3], email: 'rita@x.com' });
  await c.post('/api/auth/forgot', { email: 'rita@x.com' });
  assert.equal((await c.post('/api/auth/forgot', { email: 'naoexiste@x.com' })).status, 200);
  assert.equal((await c.post('/api/auth/reset', { token: 'falso', senha: 'Nova@1234' })).status, 400);
  const crypto = require('node:crypto'), tok = 'tok-de-teste';
  await T.db.run('INSERT INTO reset_tokens(token_hash,account_id,expires_at) VALUES(?,?,?)', crypto.createHash('sha256').update(tok).digest('hex'), (await T.db.one('SELECT id FROM accounts WHERE email=?', 'rita@x.com')).id, Date.now() + 1e5);
  assert.equal((await c.post('/api/auth/reset', { token: tok, senha: 'fraca' })).status, 422);
  assert.equal((await c.post('/api/auth/reset', { token: tok, senha: 'Nova@1234' })).status, 200);
  assert.equal((await c.get('/api/appointments')).status, 401, 'sessão antiga caiu');
  assert.equal((await c.post('/api/auth/login', { email: 'rita@x.com', senha: 'Nova@1234' })).status, 200);
  assert.equal((await c.post('/api/me/delete', { senha: 'errada' })).status, 403);
  assert.equal((await c.post('/api/me/delete', { senha: 'Nova@1234' })).status, 200);
  assert.equal((await T.db.one('SELECT COUNT(*) n FROM accounts WHERE email=?', 'rita@x.com')).n, 0);
});

test('health check e rotinas automáticas (aviso de plano, lembrete, backup)', async () => {
  const r = await cli.get('/api/health');
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  const jobs = require('../lib/jobs');
  await assert.doesNotReject(async () => { await jobs.planNotices(); await jobs.appointmentReminders(); await jobs.backup(); });
  const gz = await fetch(T.base + '/app.js', { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(gz.status, 200);
});

test('publicações: texto, foto opcional, exclusão e moderação', async () => {
  const pc = T.client(), ac = T.client();
  let r = await signup(pc, { nome: 'Paula Lima', doc: CPF[2], email: 'paula@x.com', obj: 'divulgar', papel: '' });
  assert.equal(r.status, 200);
  assert.equal((await pc.raw('/api/me/posts?texto=oi', Buffer.alloc(0))).status, 409); // perfil incompleto
  await pc.put('/api/me/setup', { ...addr, nomeProf: 'Paula Studio', spec: 'Lash Designer', doc: CPF[2], anos: '3', bio: '', atend: 'estudio', mesmo: true, w: {}, raio: 10, dias: [1, 2, 3], abre: '09:00', fecha: '18:00', pagto: ['Pix'], wa: '41999998888', ig: '', pref: [], services: [{ n: 'Fio a fio', p: 80, d: 90 }] });
  assert.equal((await pc.raw('/api/me/posts', Buffer.alloc(0))).status, 422);
  r = await pc.raw('/api/me/posts?texto=' + encodeURIComponent('Novidade no estúdio'), Buffer.alloc(0));
  assert.equal(r.status, 200); assert.equal(r.body.photo, '');
  const r2 = await pc.raw('/api/me/posts?texto=com%20foto', PNG);
  assert.equal(r2.status, 200); assert.match(r2.body.photo, /^\/uploads\//);
  const img = await fetch(T.base + r2.body.photo); assert.equal(img.status, 200); assert.equal(img.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG);
  const pid = (await T.db.one('SELECT account_id id FROM posts LIMIT 1')).id;
  const d = await ac.get('/api/pros/p' + pid);
  assert.equal(d.status, 200); assert.equal(d.body.posts.length, 2); assert.equal(d.body.dist[5], 0);
  assert.equal((await pc.del('/api/me/posts/' + r.body.id)).status, 200);
  assert.equal((await ac.get('/api/pros/p' + pid)).body.posts.length, 1);
  assert.equal((await pc.raw('/api/me/posts?texto=x', Buffer.from('nao-imagem-nao-imagem'))).status, 415);
});
