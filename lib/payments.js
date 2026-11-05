'use strict';
const cfg = require('./config');
const D = require('./domain');

async function mp(path, opts = {}) {
  const r = await fetch(cfg.mpApi + path, { ...opts, headers: { Authorization: 'Bearer ' + cfg.mpToken, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${j.message || JSON.stringify(j).slice(0, 200)}`);
  return j;
}
const PERIOD_DAYS = { mensal: 30, anual: 365 };

async function createCheckout(reg, plan, account) {
  const amount = D.planAmount(plan, reg.cycle);
  const body = {
    items: [{ id: reg.plan, title: `Beauty Hub – plano ${plan.name} (${reg.cycle})`, quantity: 1, currency_id: 'BRL', unit_price: amount }],
    external_reference: `reg:${reg.id}:${reg.cycle}`,
    payer: { email: account.email },
    back_urls: { success: `${cfg.baseUrl}/?checkout=return`, failure: `${cfg.baseUrl}/?checkout=return`, pending: `${cfg.baseUrl}/?checkout=return` },
    statement_descriptor: 'BEAUTYHUB'
  };
  if (/^https:\/\//.test(cfg.baseUrl)) { body.auto_return = 'approved'; body.notification_url = `${cfg.baseUrl}/api/webhooks/mercadopago`; }
  const j = await mp('/checkout/preferences', { method: 'POST', body: JSON.stringify(body) });
  return j.init_point;
}

/** Confere o pagamento direto na API do Mercado Pago e libera o plano. Seguro para chamar várias vezes. */
async function applyPayment(paymentId, onlyRegId = 0) {
  if (!/^\d{3,20}$/.test(String(paymentId))) return { applied: false, reason: 'id' };
  const p = await mp('/v1/payments/' + paymentId);
  if (p.status !== 'approved') return { applied: false, status: p.status };
  const m = String(p.external_reference || '').match(/^reg:(\d+):(mensal|anual)$/);
  if (!m) return { applied: false, reason: 'referencia' };
  const reg = D.one('SELECT * FROM registrations WHERE id=?', +m[1]);
  if (!reg || (onlyRegId && reg.id !== onlyRegId)) return { applied: false, reason: 'cadastro' };
  const plan = D.plansMap()[reg.plan];
  const expected = D.planAmount(plan, m[2]);
  if (Number(p.transaction_amount) + 0.01 < expected) { console.error('[pagamento] valor menor que o plano', paymentId); return { applied: false, reason: 'valor' }; }
  const ins = D.run('INSERT OR IGNORE INTO payments(registration_id,mp_payment_id,amount,created_at) VALUES(?,?,?,?)', reg.id, String(paymentId), Number(p.transaction_amount), D.now());
  if (!ins.changes) return { applied: false, already: true };
  const base = reg.paid_until && reg.paid_until > D.now() ? Date.parse(reg.paid_until) : Date.now();
  const until = new Date(base + PERIOD_DAYS[m[2]] * 864e5).toISOString();
  D.run(`UPDATE registrations SET pay_status='pago', paid_until=?, cycle=?, updated_at=? WHERE id=?`, until, m[2], D.now(), reg.id);
  D.notify(reg.account_id, 'plano', `Pagamento confirmado! Seu plano ${plan.name} está pago até ${until.slice(0, 10).split('-').reverse().join('/')}.`, 'meu-perfil');
  return { applied: true };
}
module.exports = { createCheckout, applyPayment, PERIOD_DAYS };
