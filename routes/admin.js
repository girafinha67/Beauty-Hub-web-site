'use strict';
const { R, HttpError } = require('../lib/http');
const D = require('../lib/domain');
const { PERIOD_DAYS } = require('../lib/payments');

const A = { admin: true };
const REG_STATUS = ['pendente', 'aprovado', 'recusado', 'suspenso'], PAY = ['aguardando', 'pago', 'isento'];
const dmy = d => d.slice(0, 10).split('-').reverse().join('/');

R.get('/api/admin/overview', A, async () => {
  const plans = await D.plansMap();
  const regs = await D.all('SELECT * FROM registrations');
  const act = regs.filter(D.regActive);
  const rev = act.filter(r => r.pay_status === 'pago').reduce((s, r) => s + (plans[r.plan] ? plans[r.plan].price * (r.cycle === 'anual' ? 10 / 12 : 1) : 0), 0);
  return {
    accounts: (await D.one('SELECT COUNT(*) n FROM accounts')).n, regs: regs.length,
    pending: regs.filter(r => r.status === 'pendente').length, active: act.length,
    listingsPending: (await D.one(`SELECT COUNT(*) n FROM listings WHERE status='pendente'`)).n,
    appointments: (await D.one('SELECT COUNT(*) n FROM appointments')).n, revenue: Math.round(rev * 100) / 100
  };
});

R.get('/api/admin/registrations', A, async ctx => {
  const st = ctx.query.status;
  return {
    items: (await D.all(`SELECT r.id, r.tipo, r.nome, r.plan, r.cycle, r.status, r.pay_status, r.paid_until, r.created_at, a.nome owner, a.email, a.tel, a.doc, a.verified,
        COALESCE(s.cidade || ' - ' || s.uf, '') cidade
      FROM registrations r JOIN accounts a ON a.id=r.account_id LEFT JOIN setups s ON s.account_id=a.id ${REG_STATUS.includes(st) ? 'WHERE r.status=?' : 'WHERE ?=?'} ORDER BY r.id DESC`,
      ...(REG_STATUS.includes(st) ? [st] : [1, 1]))).map(r => ({ ...r, verified: !!r.verified, payOk: D.payOk(r) }))
  };
});

R.patch('/api/admin/registrations/:id', A, async ctx => {
  const reg = await D.one('SELECT * FROM registrations WHERE id=?', +ctx.params.id);
  if (!reg) throw new HttpError(404, 'Cadastro não encontrado.');
  const b = ctx.body;
  await D.tx(async () => {
    if (b.status !== undefined) {
      if (!REG_STATUS.includes(b.status)) throw new HttpError(400, 'Status inválido.');
      await D.run('UPDATE registrations SET status=?, updated_at=? WHERE id=?', b.status, D.now(), reg.id);
      if (b.status !== reg.status) await D.notify(reg.account_id, 'cadastro', {
        aprovado: 'Seu cadastro foi aprovado! Você já pode divulgar no Beauty Hub.', recusado: 'Seu cadastro foi recusado. Revise os dados e envie novamente.',
        suspenso: 'Seu cadastro foi suspenso. Fale com a equipe do Beauty Hub.', pendente: 'Seu cadastro voltou para análise.' }[b.status], 'meu-perfil');
    }
    if (b.pay_status !== undefined) {
      if (!PAY.includes(b.pay_status)) throw new HttpError(400, 'Pagamento inválido.');
      const until = b.pay_status === 'pago' ? new Date(Date.now() + PERIOD_DAYS[reg.cycle] * 864e5).toISOString() : null;
      await D.run('UPDATE registrations SET pay_status=?, paid_until=?, updated_at=? WHERE id=?', b.pay_status, until, D.now(), reg.id);
      if (b.pay_status === 'pago') await D.notify(reg.account_id, 'plano', `Pagamento confirmado! Seu plano está pago até ${dmy(until)}.`, 'meu-perfil');
    }
    if (b.verified !== undefined) await D.run('UPDATE accounts SET verified=? WHERE id=?', b.verified ? 1 : 0, reg.account_id);
  });
  return { ok: true };
});

R.get('/api/admin/listings', A, async () => ({
  items: (await D.all(`${D.LISTING_SQL} ORDER BY CASE l.status WHEN 'pendente' THEN 0 ELSE 1 END, l.id DESC LIMIT 300`)).map(l => ({ ...D.listingJson(l), owner: l.byName }))
}));
R.patch('/api/admin/listings/:id', A, async ctx => {
  const m = ctx.params.id.match(/^l(\d+)$/), l = m && await D.one('SELECT * FROM listings WHERE id=?', +m[1]);
  if (!l) throw new HttpError(404, 'Anúncio não encontrado.');
  const b = ctx.body;
  if (b.status !== undefined) {
    if (!['pendente', 'aprovado', 'recusado'].includes(b.status)) throw new HttpError(400, 'Status inválido.');
    await D.run('UPDATE listings SET status=? WHERE id=?', b.status, l.id);
    if (b.status !== l.status && b.status !== 'pendente') await D.notify(l.owner_id, 'anuncio', `Seu anúncio “${l.title}” foi ${b.status === 'aprovado' ? 'aprovado e já está publicado' : 'recusado'}.`, 'meu-perfil');
  }
  if (b.featured !== undefined) await D.run('UPDATE listings SET featured=? WHERE id=?', b.featured ? 1 : 0, l.id);
  if (b.hidden !== undefined) await D.run('UPDATE listings SET hidden=? WHERE id=?', b.hidden ? 1 : 0, l.id);
  return { ok: true };
});

R.get('/api/admin/plans', A, async () => ({ plans: await D.plansMap() }));
R.put('/api/admin/plans/:key', A, async ctx => {
  const cur = (await D.plansMap())[ctx.params.key];
  if (!cur) throw new HttpError(404, 'Plano não encontrado.');
  const price = +ctx.body.price, perms = { ...cur.perms };
  if (!(price >= 0 && price < 100000)) throw new HttpError(422, 'Informe um preço válido.');
  const src = ctx.body.perms || {};
  for (const k of Object.keys(D.BASE_PERMS)) {
    if (k === 'proc') { const n = +src.proc; if (!Number.isInteger(n) || n < 0) throw new HttpError(422, 'Limite de procedimentos inválido.'); perms.proc = n; }
    else if (k in src) perms[k] = !!src[k];
  }
  await D.run('UPDATE plans SET price=?, perms=? WHERE key=?', Math.round(price * 100) / 100, JSON.stringify(perms), ctx.params.key);
  return { plans: await D.plansMap() };
});

R.get('/api/admin/reviews', A, async () => ({
  items: await D.all(`SELECT r.id, r.nota, r.texto, r.status, r.created_at, a.nome autor, COALESCE(NULLIF(s.nome_prof,''), p.nome) alvo
    FROM reviews r JOIN accounts a ON a.id=r.author_id JOIN accounts p ON p.id=r.pro_id LEFT JOIN setups s ON s.account_id=p.id ORDER BY r.id DESC LIMIT 100`)
}));
R.patch('/api/admin/reviews/:id', A, async ctx => {
  if (!['aprovada', 'removida'].includes(ctx.body.status)) throw new HttpError(400, 'Status inválido.');
  const r = await D.run('UPDATE reviews SET status=? WHERE id=?', ctx.body.status, +ctx.params.id);
  if (!r.changes) throw new HttpError(404, 'Avaliação não encontrada.');
  return { ok: true };
});

R.get('/api/admin/threads', A, async () => ({
  items: await D.all(`SELECT t.id, t.question, t.tag, t.created_at, a.nome autor FROM threads t JOIN accounts a ON a.id=t.author_id ORDER BY t.id DESC LIMIT 100`)
}));
R.post('/api/admin/threads/:id/delete', A, async ctx => {
  const r = await D.run('DELETE FROM threads WHERE id=?', +ctx.params.id);
  if (!r.changes) throw new HttpError(404, 'Conversa não encontrada.');
  return { ok: true };
});
