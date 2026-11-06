'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cfg = require('./config');
const db = require('./db');
const { one, all, run, now } = db;

const marked = async k => !!(await one('SELECT 1 FROM job_marks WHERE key=?', k));
const mark = k => run('INSERT OR IGNORE INTO job_marks(key,at) VALUES(?,?)', k, now());
const dmy = d => d.slice(0, 10).split('-').reverse().join('/');

async function notify(accountId, kind, text, link) {
  await run('INSERT INTO notifications(account_id,kind,text,link,read,created_at) VALUES(?,?,?,?,0,?)', accountId, kind, text, link || '', now());
}

/* Avisa 3 dias antes de o plano vencer e quando vence. */
async function planNotices() {
  const soon = new Date(Date.now() + 3 * 864e5).toISOString();
  for (const r of await all(`SELECT id, account_id, paid_until FROM registrations WHERE pay_status='pago' AND paid_until IS NOT NULL AND paid_until>? AND paid_until<=?`, now(), soon)) {
    const k = `plan-soon:${r.id}:${r.paid_until}`; if (await marked(k)) continue; await mark(k);
    await notify(r.account_id, 'plano', `Seu plano vence em ${dmy(r.paid_until)}. Renove para manter os recursos ativos.`, 'meu-perfil');
  }
  for (const r of await all(`SELECT id, account_id, paid_until FROM registrations WHERE pay_status='pago' AND paid_until IS NOT NULL AND paid_until<=?`, now())) {
    const k = `plan-end:${r.id}:${r.paid_until}`; if (await marked(k)) continue; await mark(k);
    await notify(r.account_id, 'plano', `Seu plano venceu em ${dmy(r.paid_until)}. Faça o pagamento para reativar.`, 'meu-perfil');
  }
}

/* Lembrete no dia anterior para cliente e profissional. */
async function appointmentReminders() {
  const d = new Date(Date.now() + 864e5);
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: cfg.tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const tomorrow = fmt.format(d);
  for (const a of await all(`SELECT id, client_id, pro_id, service, time FROM appointments WHERE status='confirmado' AND date=?`, tomorrow)) {
    const k = `appt-rem:${a.id}`; if (await marked(k)) continue; await mark(k);
    await notify(a.client_id, 'agenda', `Lembrete: ${a.service} amanhã às ${a.time}.`, 'agenda');
    await notify(a.pro_id, 'agenda', `Lembrete: atendimento de ${a.service} amanhã às ${a.time}.`, 'agenda');
  }
}

/* Cópia consistente do banco (1 por dia, guarda as 7 últimas). */
async function backup() {
  if (process.env.DB_FILE === ':memory:' || db.REMOTE || cfg.onVercel) return null; // na nuvem o provedor do banco cuida dos backups
  const dir = path.join(cfg.dataDir, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `beautyhub-${new Date().toISOString().slice(0, 10)}.db`);
  if (fs.existsSync(file)) return null;
  await db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  fs.readdirSync(dir).filter(f => /^beautyhub-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().slice(0, -7)
    .forEach(f => fs.unlinkSync(path.join(dir, f)));
  return file;
}

async function cleanup() {
  await run('DELETE FROM job_marks WHERE at<?', new Date(Date.now() - 90 * 864e5).toISOString());
  if (!db.REMOTE) await db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
}

async function runAll() {
  for (const fn of [planNotices, appointmentReminders, backup, cleanup]) {
    try { await fn(); } catch (e) { console.error('[rotina]', fn.name, e.message); }
  }
}
function startJobs() {
  setTimeout(runAll, 5000).unref();
  return setInterval(runAll, 36e5).unref();
}
module.exports = { startJobs, runAll, planNotices, appointmentReminders, backup };
