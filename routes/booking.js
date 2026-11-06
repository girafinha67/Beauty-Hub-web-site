'use strict';
const { R, HttpError } = require('../lib/http');
const V = require('../lib/validate');
const D = require('../lib/domain');

const STEP = 30;
async function slotsFor(pro, dur, date) {
  if (!pro.dias.includes(D.weekday(date))) return [];
  const open = D.toMin(pro.abre), close = D.toMin(pro.fecha);
  const busy = (await D.all(`SELECT time, duration FROM appointments WHERE pro_id=? AND date=? AND status IN ('solicitado','confirmado')`, pro.acc, date))
    .map(b => [D.toMin(b.time), D.toMin(b.time) + b.duration]);
  const nl = D.nowLocal(), out = [];
  for (let t = open; t + dur <= close; t += STEP) {
    if (date === nl.date && t <= nl.min) continue;
    if (busy.some(([s, e]) => t < e && s < t + dur)) continue;
    out.push(D.fromMin(t));
  }
  return out;
}
function checkDate(date) {
  if (!V.isDate(date)) throw new HttpError(400, 'Data inválida.');
  const nl = D.nowLocal();
  if (date < nl.date) throw new HttpError(400, 'Escolha uma data a partir de hoje.');
  const max = new Date(Date.parse(nl.date + 'T00:00:00Z') + 180 * 864e5).toISOString().slice(0, 10);
  if (date > max) throw new HttpError(400, 'Só é possível agendar com até 6 meses de antecedência.');
}
async function getPro(idStr, viewer) {
  const m = String(idStr).match(/^p(\d+)$/);
  const p = m && (await D.loadPros({ viewerId: viewer, id: +m[1] }))[0];
  if (!p) throw new HttpError(404, 'Profissional não encontrada.');
  return p;
}

R.get('/api/pros/:id/slots', { auth: true }, async ctx => {
  const pro = await getPro(ctx.params.id, ctx.account.id);
  const svc = pro.services.find(s => s.id === +ctx.query.svc);
  if (!svc) throw new HttpError(400, 'Escolha um serviço.');
  checkDate(ctx.query.date);
  return { slots: await slotsFor(pro, svc.d, ctx.query.date) };
});

R.post('/api/appointments', { auth: true }, async ctx => {
  const me = ctx.account, b = ctx.body;
  const pro = await getPro(b.pro, me.id);
  if (pro.acc === me.id) throw new HttpError(400, 'Você não pode agendar com o seu próprio perfil.');
  const svc = pro.services.find(s => s.id === +b.svc);
  if (!svc) throw new HttpError(400, 'Escolha um serviço.');
  checkDate(b.date);
  if (!V.isTime(b.time) || !(await slotsFor(pro, svc.d, b.date)).includes(b.time)) throw new HttpError(409, 'Esse horário não está mais disponível. Escolha outro.');
  const open = (await D.one(`SELECT COUNT(*) n FROM appointments WHERE client_id=? AND status='solicitado'`, me.id)).n;
  if (open >= 10) throw new HttpError(429, 'Você tem muitas solicitações em aberto. Aguarde as respostas.');
  const now = D.now();
  const r = await D.run('INSERT INTO appointments(client_id,pro_id,service,price,duration,date,time,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
    me.id, pro.acc, svc.n, svc.p, svc.d, b.date, b.time, 'solicitado', now, now);
  await D.notify(pro.acc, 'agenda', `${me.nome.split(' ')[0]} solicitou ${svc.n} em ${b.date.split('-').reverse().join('/')} às ${b.time}.`, 'agendamentos');
  return { id: Number(r.lastInsertRowid) };
});

function apptJson(a, me, plans) {
  const mine = a.client_id === me;
  const canReview = mine && a.status === 'concluido' && !a.review_id && a.pro_reviews;
  return {
    id: a.id, role: mine ? 'client' : 'pro', other: mine ? a.pro_name : a.client_name, otherId: mine ? a.pro_id : a.client_id,
    proRef: 'p' + a.pro_id, service: a.service, price: a.price, duration: a.duration, date: a.date, time: a.time, status: a.status,
    clientPhone: !mine && (a.status === 'confirmado' || a.status === 'concluido') ? a.client_tel : '',
    reviewed: !!a.review_id, canReview: !!canReview
  };
}
R.get('/api/appointments', { auth: true }, async ctx => {
  const me = ctx.account.id, plans = await D.plansMap();
  const rows = await D.all(`SELECT a.*, COALESCE(NULLIF(s.nome_prof,''), p.nome) pro_name, c.nome client_name, c.tel client_tel, r.id review_id,
      reg.status rstatus, reg.plan, reg.pay_status, reg.paid_until
    FROM appointments a JOIN accounts p ON p.id=a.pro_id JOIN accounts c ON c.id=a.client_id
    LEFT JOIN setups s ON s.account_id=a.pro_id LEFT JOIN reviews r ON r.appointment_id=a.id
    LEFT JOIN registrations reg ON reg.account_id=a.pro_id
    WHERE a.client_id=? OR a.pro_id=? ORDER BY a.date, a.time`, me, me);
  rows.forEach(a => { a.pro_reviews = D.permsOf(a.plan ? { status: a.rstatus, pay_status: a.pay_status, paid_until: a.paid_until, plan: a.plan } : null, plans).avaliacoes; });
  return { items: rows.map(a => apptJson(a, me, plans)) };
});

const TEXT = { confirmado: 'confirmou', recusado: 'recusou', cancelado: 'cancelou', concluido: 'concluiu' };
R.patch('/api/appointments/:id', { auth: true }, async ctx => {
  const me = ctx.account, a = await D.one('SELECT * FROM appointments WHERE id=?', +ctx.params.id);
  if (!a || (a.client_id !== me.id && a.pro_id !== me.id)) throw new HttpError(404, 'Agendamento não encontrado.');
  const to = ctx.body.status, isPro = a.pro_id === me.id;
  const allowed = isPro
    ? { solicitado: ['confirmado', 'recusado'], confirmado: ['concluido', 'cancelado'] }
    : { solicitado: ['cancelado'], confirmado: ['cancelado'] };
  if (!(allowed[a.status] || []).includes(to)) throw new HttpError(409, 'Essa ação não está disponível para este agendamento.');
  if (to === 'concluido' && a.date > D.nowLocal().date) throw new HttpError(409, 'Só dá para concluir no dia do atendimento ou depois.');
  await D.run('UPDATE appointments SET status=?, updated_at=? WHERE id=?', to, D.now(), a.id);
  const who = (await D.one(`SELECT COALESCE(NULLIF(s.nome_prof,''), x.nome) n FROM accounts x LEFT JOIN setups s ON s.account_id=x.id WHERE x.id=?`, me.id)).n;
  await D.notify(isPro ? a.client_id : a.pro_id, 'agenda', `${who} ${TEXT[to]} o agendamento de ${a.service} (${a.date.split('-').reverse().join('/')} às ${a.time}).`, 'agendamentos');
  return { ok: true, status: to };
});

R.post('/api/appointments/:id/review', { auth: true }, async ctx => {
  const me = ctx.account, a = await D.one('SELECT * FROM appointments WHERE id=?', +ctx.params.id);
  if (!a || a.client_id !== me.id) throw new HttpError(404, 'Agendamento não encontrado.');
  if (a.status !== 'concluido') throw new HttpError(409, 'Você só pode avaliar depois que o atendimento for concluído.');
  if (await D.one('SELECT 1 FROM reviews WHERE appointment_id=?', a.id)) throw new HttpError(409, 'Você já avaliou este atendimento.');
  const pro = (await D.loadPros({ id: a.pro_id }))[0];
  if (!pro || !pro.canReview) throw new HttpError(409, 'Esta profissional não recebe avaliações no momento.');
  const nota = +ctx.body.nota, texto = V.str(ctx.body.texto, 600);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) throw new HttpError(422, 'Escolha uma nota de 1 a 5.', { nota: 'Escolha uma nota de 1 a 5.' });
  await D.run('INSERT INTO reviews(appointment_id,pro_id,author_id,nota,texto,status,created_at) VALUES(?,?,?,?,?,?,?)', a.id, a.pro_id, me.id, nota, texto, 'aprovada', D.now());
  await D.notify(a.pro_id, 'review', `${me.nome.split(' ')[0]} avaliou seu atendimento com ${nota} ${nota === 1 ? 'estrela' : 'estrelas'}.`, 'perfil');
  return { ok: true };
});
