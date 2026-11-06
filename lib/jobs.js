'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cfg = require('./config');
const { db, one, all, run, now } = require('./db');

db.exec('CREATE TABLE IF NOT EXISTS job_marks(key TEXT PRIMARY KEY, at TEXT NOT NULL)');
const marked = k => !!one('SELECT 1 FROM job_marks WHERE key=?', k);
const mark = k => run('INSERT OR IGNORE INTO job_marks(key,at) VALUES(?,?)', k, now());
const dmy = d => d.slice(0, 10).split('-').reverse().join('/');

function notify(accountId, kind, text, link) {
  run('INSERT INTO notifications(account_id,kind,text,link,read,created_at) VALUES(?,?,?,?,0,?)', accountId, kind, text, link || '', now());
}

/* Avisa 3 dias antes de o plano vencer e quando vence. */
function planNotices() {
  const soon = new Date(Date.now() + 3 * 864e5).toISOString();
  all(`SELECT id, account_id, paid_until FROM registrations WHERE pay_status='pago' AND paid_until IS NOT NULL AND paid_until>? AND paid_until<=?`, now(), soon)
    .forEach(r => { const k = `plan-soon:${r.id}:${r.paid_until}`; if (marked(k)) return; mark(k);
      notify(r.account_id, 'plano', `Seu plano vence em ${dmy(r.paid_until)}. Renove para manter os recursos ativos.`, 'meu-perfil'); });
  all(`SELECT id, account_id, paid_until FROM registrations WHERE pay_status='pago' AND paid_until IS NOT NULL AND paid_until<=?`, now())
    .forEach(r => { const k = `plan-end:${r.id}:${r.paid_until}`; if (marked(k)) return; mark(k);
      notify(r.account_id, 'plano', `Seu plano venceu em ${dmy(r.paid_until)}. Faça o pagamento para reativar.`, 'meu-perfil'); });
}

/* Lembrete no dia anterior para cliente e profissional. */
function appointmentReminders() {
  const d = new Date(Date.now() + 864e5);
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: cfg.tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const tomorrow = fmt.format(d);
  all(`SELECT id, client_id, pro_id, service, time FROM appointments WHERE status='confirmado' AND date=?`, tomorrow).forEach(a => {
    const k = `appt-rem:${a.id}`; if (marked(k)) return; mark(k);
    notify(a.client_id, 'agenda', `Lembrete: ${a.service} amanhã às ${a.time}.`, 'agenda');
    notify(a.pro_id, 'agenda', `Lembrete: atendimento de ${a.service} amanhã às ${a.time}.`, 'agenda');
  });
}

/* Cópia consistente do banco (1 por dia, guarda as 7 últimas). */
function backup() {
  if (process.env.DB_FILE === ':memory:') return null;
  const dir = path.join(cfg.dataDir, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `beautyhub-${new Date().toISOString().slice(0, 10)}.db`);
  if (fs.existsSync(file)) return null;
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  fs.readdirSync(dir).filter(f => /^beautyhub-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().slice(0, -7)
    .forEach(f => fs.unlinkSync(path.join(dir, f)));
  return file;
}

function cleanup() {
  run('DELETE FROM job_marks WHERE at<?', new Date(Date.now() - 90 * 864e5).toISOString());
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
}

function runAll() {
  for (const fn of [planNotices, appointmentReminders, backup, cleanup]) {
    try { fn(); } catch (e) { console.error('[rotina]', fn.name, e.message); }
  }
}
function startJobs() {
  setTimeout(runAll, 5000).unref();
  return setInterval(runAll, 36e5).unref();
}
module.exports = { startJobs, runAll, planNotices, appointmentReminders, backup };
