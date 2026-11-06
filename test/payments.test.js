'use strict';
const http = require('node:http');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

let mpServer, T, pro, adm, regId, lastPref;
const PAYMENTS = {};
before(async () => {
  // Mercado Pago de mentira (só neste teste): guarda preferências e responde pagamentos
  mpServer = http.createServer((req, res) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.headers.authorization !== 'Bearer TESTE') { res.statusCode = 401; return res.end('{"message":"no"}'); }
      if (req.url === '/checkout/preferences') { lastPref = JSON.parse(b); return res.end(JSON.stringify({ init_point: 'https://mp.test/pay/abc' })); }
      const m = req.url.match(/^\/v1\/payments\/(\d+)$/);
      if (m && PAYMENTS[m[1]]) return res.end(JSON.stringify(PAYMENTS[m[1]]));
      res.statusCode = 404; res.end('{"message":"nf"}');
    });
  });
  await new Promise(r => mpServer.listen(0, r));
  process.env.MP_ACCESS_TOKEN = 'TESTE';
  process.env.MP_API_BASE = 'http://127.0.0.1:' + mpServer.address().port;
  T = await require('./helpers').boot();
  const { CPF } = require('./helpers');
  pro = T.client(); adm = T.client();
  await pro.post('/api/auth/signup', { nome: 'Helena Duarte', tel: '41999998888', doc: CPF[0], email: 'h@x.com', senha: 'Senha@123', aceite: true, obj: 'divulgar' });
  await adm.post('/api/auth/signup', { nome: 'Admin Geral', tel: '41999998888', doc: CPF[1], email: 'a@x.com', senha: 'Senha@123', aceite: true, obj: 'encontrar' });
  T.db.run(`UPDATE accounts SET role='admin' WHERE email='a@x.com'`);
});
after(() => { T.server.close(); mpServer.close(); });

test('checkout usa o preço do plano e a referência do cadastro', async () => {
  const r = await pro.post('/api/registration', { tipo: 'profissional', nome: 'Helena', plan: 'premium', cycle: 'anual' });
  regId = r.body.reg.id;
  const p = await pro.post('/api/registration/pay');
  assert.equal(p.body.url, 'https://mp.test/pay/abc');
  assert.equal(lastPref.items[0].unit_price, 1299); // 129,90 x 10 meses (anual)
  assert.equal(lastPref.external_reference, `reg:${regId}:anual`);
});

test('webhook só libera o plano com pagamento aprovado e valor correto, uma única vez', async () => {
  const hook = id => fetch(T.base + '/api/webhooks/mercadopago', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'payment', data: { id } }) });
  const active = async () => (await pro.get('/api/me')).body.reg;
  await adm.patch('/api/admin/registrations/' + regId, { status: 'aprovado' });
  PAYMENTS['1001'] = { status: 'pending', external_reference: `reg:${regId}:anual`, transaction_amount: 1299 };
  assert.equal((await hook('1001')).status, 200); assert.equal((await active()).payOk, false);
  PAYMENTS['1002'] = { status: 'approved', external_reference: `reg:${regId}:anual`, transaction_amount: 10 };
  await hook('1002'); assert.equal((await active()).payOk, false, 'valor menor que o plano');
  PAYMENTS['1003'] = { status: 'approved', external_reference: `reg:${regId}:anual`, transaction_amount: 1299 };
  await hook('1003');
  let reg = await active(); assert.equal(reg.payOk, true); assert.equal(reg.active, true);
  const until = reg.paid_until;
  await hook('1003'); assert.equal((await active()).paid_until, until, 'repetir o aviso não estende o plano');
  assert.equal(T.db.one('SELECT COUNT(*) n FROM payments').n, 1);
});

test('retorno do checkout confirma pelo próprio usuário, mas só o próprio cadastro', async () => {
  const other = T.client();
  const { CPF } = require('./helpers');
  await other.post('/api/auth/signup', { nome: 'Outra Pessoa', tel: '41999998888', doc: CPF[2], email: 'o@x.com', senha: 'Senha@123', aceite: true, obj: 'divulgar' });
  await other.post('/api/registration', { tipo: 'loja', nome: 'Loja', plan: 'basico', cycle: 'mensal' });
  PAYMENTS['2001'] = { status: 'approved', external_reference: `reg:${regId}:anual`, transaction_amount: 1299 };
  const c = await other.post('/api/payments/confirm', { payment_id: '2001' });
  assert.equal(c.body.reg.payOk, false);
});
