'use strict';
const { R, HttpError } = require('../lib/http');
const V = require('../lib/validate');
const D = require('../lib/domain');
const cfg = require('../lib/config');
const { regJson } = require('../lib/me');
const pay = require('../lib/payments');

const TIPOS = ['profissional', 'educacao', 'loja', 'fornecedor', 'palestrante', 'evento', 'marca', 'campeonato'];

function validate(b, plans) {
  const E = {}, nome = V.str(b.nome, 80), descricao = V.str(b.descricao, 500);
  if (nome.length < 2) E.nome = 'Informe o nome que será exibido.';
  if (!plans[b.plan]) E.plan = 'Escolha um plano.';
  if (!['mensal', 'anual'].includes(b.cycle)) E.cycle = 'Escolha o ciclo de cobrança.';
  return { E, nome, descricao };
}

R.post('/api/registration', { auth: true }, ctx => {
  const me = ctx.account, b = ctx.body, plans = D.plansMap();
  if (D.one('SELECT 1 FROM registrations WHERE account_id=?', me.id)) throw new HttpError(409, 'Você já tem um cadastro de divulgação.');
  if (!TIPOS.includes(b.tipo)) throw new HttpError(422, 'Escolha o tipo de perfil.', { tipo: 'Escolha o tipo de perfil.' });
  const { E, nome, descricao } = validate(b, plans);
  if (Object.keys(E).length) throw new HttpError(422, 'Confira os campos.', E);
  const now = D.now();
  D.tx(() => {
    D.run('INSERT INTO registrations(account_id,tipo,nome,descricao,plan,cycle,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', me.id, b.tipo, nome, descricao, b.plan, b.cycle, now, now);
    if ((b.tipo === 'profissional' || b.tipo === 'palestrante') && !D.isProAcc(me)) D.run(`UPDATE accounts SET obj='divulgar' WHERE id=?`, me.id);
    D.all(`SELECT id FROM accounts WHERE role='admin'`).forEach(a => D.notify(a.id, 'admin', `Novo cadastro aguardando análise: ${nome}.`, 'admin'));
  });
  return { reg: regJson(me.id, plans), isPro: D.isProAcc(D.one('SELECT * FROM accounts WHERE id=?', me.id)) };
});

R.put('/api/registration', { auth: true }, ctx => {
  const me = ctx.account, b = ctx.body, plans = D.plansMap();
  const reg = D.one('SELECT * FROM registrations WHERE account_id=?', me.id);
  if (!reg) throw new HttpError(404, 'Você ainda não tem cadastro de divulgação.');
  const { E, nome, descricao } = validate({ ...b, plan: b.plan || reg.plan, cycle: b.cycle || reg.cycle }, plans);
  if (Object.keys(E).length) throw new HttpError(422, 'Confira os campos.', E);
  const planChange = (b.plan && b.plan !== reg.plan) || (b.cycle && b.cycle !== reg.cycle);
  if (planChange && D.payOk(reg)) throw new HttpError(409, 'Seu plano já está pago. Fale com o suporte para trocar.');
  const status = reg.status === 'recusado' ? 'pendente' : reg.status;
  D.run('UPDATE registrations SET nome=?, descricao=?, plan=?, cycle=?, status=?, updated_at=? WHERE id=?', nome, descricao, b.plan || reg.plan, b.cycle || reg.cycle, status, D.now(), reg.id);
  return { reg: regJson(me.id, plans) };
});

R.post('/api/registration/delete', { auth: true }, ctx => {
  D.tx(() => {
    D.run(`DELETE FROM listings WHERE owner_id=? AND mod<>'network'`, ctx.account.id);
    D.run('DELETE FROM registrations WHERE account_id=?', ctx.account.id);
  });
  return { ok: true };
});

R.post('/api/registration/pay', { auth: true }, async ctx => {
  if (!cfg.mpToken) throw new HttpError(503, 'O pagamento online ainda não está configurado. A equipe confirma o pagamento manualmente.');
  const reg = D.one('SELECT * FROM registrations WHERE account_id=?', ctx.account.id);
  if (!reg) throw new HttpError(404, 'Você ainda não tem cadastro de divulgação.');
  const plan = D.plansMap()[reg.plan];
  try { return { url: await pay.createCheckout(reg, plan, ctx.account) }; }
  catch (e) { console.error('[pagamento]', e.message); throw new HttpError(502, 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.'); }
});

R.post('/api/payments/confirm', { auth: true }, async ctx => {
  if (!cfg.mpToken) throw new HttpError(503, 'Pagamento online não configurado.');
  const reg = D.one('SELECT * FROM registrations WHERE account_id=?', ctx.account.id);
  if (!reg) throw new HttpError(404, 'Cadastro não encontrado.');
  try { await pay.applyPayment(String(ctx.body.payment_id || ''), reg.id); } catch (e) { console.error('[pagamento]', e.message); }
  return { reg: regJson(ctx.account.id) };
});

R.post('/api/webhooks/mercadopago', { webhook: true }, async ctx => {
  if (!cfg.mpToken) return { ok: true };
  const b = ctx.body || {}, q = ctx.query;
  const type = b.type || q.type || q.topic;
  const id = (b.data && b.data.id) || q['data.id'] || (q.topic === 'payment' ? q.id : '');
  if (type === 'payment' && id) { try { await pay.applyPayment(String(id)); } catch (e) { console.error('[webhook]', e.message); throw new HttpError(500, 'retry'); } }
  return { ok: true };
});
