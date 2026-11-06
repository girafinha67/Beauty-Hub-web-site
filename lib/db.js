'use strict';
/* Camada de banco assíncrona.
   - Com TURSO_DATABASE_URL: banco remoto libSQL (SQLite na nuvem), usado na Vercel.
   - Sem ela: SQLite local (node:sqlite) em DATA_DIR, usado no computador e nos testes.
   O SQL é o mesmo nos dois (dialeto SQLite). */
const fs = require('node:fs');
const path = require('node:path');
const { AsyncLocalStorage } = require('node:async_hooks');
const cfg = require('./config');

const REMOTE = !!process.env.TURSO_DATABASE_URL;
const als = new AsyncLocalStorage();

/* ---------- driver local (node:sqlite) ---------- */
function localDriver() {
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(path.join(cfg.dataDir, 'uploads'), { recursive: true });
  const db = new DatabaseSync(process.env.DB_FILE || path.join(cfg.dataDir, 'beautyhub.db'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const cache = new Map();
  const st = sql => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
  /* Uma transação por vez; consultas de fora esperam a transação terminar. */
  let gate = Promise.resolve();
  const wait = async () => { let g; do { g = gate; await g; } while (g !== gate); };
  return {
    raw: db,
    async script(sql) { await wait(); db.exec(sql); },
    async one(sql, args, inTx) { if (!inTx) await wait(); const r = st(sql).get(...args); return r ? { ...r } : undefined; },
    async all(sql, args, inTx) { if (!inTx) await wait(); return st(sql).all(...args).map(r => ({ ...r })); },
    async run(sql, args, inTx) {
      if (!inTx) await wait();
      const r = st(sql).run(...args);
      return { lastInsertRowid: r.lastInsertRowid, changes: Number(r.changes) };
    },
    async tx(fn) {
      const prev = gate; let release;
      gate = new Promise(r => { release = r; });
      await prev;
      db.exec('BEGIN IMMEDIATE');
      try { const r = await fn(); db.exec('COMMIT'); return r; }
      catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
      finally { release(); }
    },
    close() { try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); db.close(); } catch {} }
  };
}

/* ---------- driver remoto (libSQL / Turso) ---------- */
function remoteDriver() {
  const { createClient } = require('@libsql/client/web');
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  const toRows = rs => rs.rows.map(r => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
  const ex = (target, sql, args) => target.execute({ sql, args: (args || []).map(v => (v === undefined ? null : v)) });
  return {
    raw: client,
    async script(sql) { await client.executeMultiple(sql); },
    async one(sql, args, t) { return toRows(await ex(t || client, sql, args))[0]; },
    async all(sql, args, t) { return toRows(await ex(t || client, sql, args)); },
    async run(sql, args, t) { const rs = await ex(t || client, sql, args); return { lastInsertRowid: rs.lastInsertRowid, changes: rs.rowsAffected }; },
    async tx(fn) {
      const t = await client.transaction('write');
      try { const r = await fn(t); await t.commit(); return r; }
      catch (e) { try { await t.rollback(); } catch {} throw e; }
      finally { try { t.close(); } catch {} }
    },
    close() { try { client.close(); } catch {} }
  };
}

if (!REMOTE && cfg.onVercel) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN nas variáveis de ambiente da Vercel.');
const drv = REMOTE ? remoteDriver() : localDriver();

/* ---------- esquema ---------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL, tel TEXT NOT NULL, doc TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  obj TEXT NOT NULL DEFAULT 'encontrar', papel TEXT NOT NULL DEFAULT 'Cliente',
  role TEXT NOT NULL DEFAULT 'user',
  pw TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(
  token_hash TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reset_tokens(
  token_hash TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS setups(
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  done INTEGER NOT NULL DEFAULT 0,
  photo TEXT NOT NULL DEFAULT '',
  rua TEXT NOT NULL DEFAULT '', num TEXT NOT NULL DEFAULT '', bairro TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '', uf TEXT NOT NULL DEFAULT '', cep TEXT NOT NULL DEFAULT '',
  lat REAL, lng REAL,
  pref TEXT NOT NULL DEFAULT '[]',
  nome_prof TEXT NOT NULL DEFAULT '', spec TEXT NOT NULL DEFAULT '', anos TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
  atend TEXT NOT NULL DEFAULT 'estudio', mesmo INTEGER NOT NULL DEFAULT 1, w TEXT NOT NULL DEFAULT '{}', raio INTEGER NOT NULL DEFAULT 10,
  dias TEXT NOT NULL DEFAULT '[2,3,4,5,6]', abre TEXT NOT NULL DEFAULT '09:00', fecha TEXT NOT NULL DEFAULT '18:00',
  pagto TEXT NOT NULL DEFAULT '["Pix"]',
  wa TEXT NOT NULL DEFAULT '', ig TEXT NOT NULL DEFAULT '', agenda TEXT NOT NULL DEFAULT '',
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS services(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, preco REAL NOT NULL, duracao INTEGER NOT NULL, pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS services_acc ON services(account_id);
CREATE TABLE IF NOT EXISTS photos(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  file TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS images(
  name TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS plans(
  key TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, pop INTEGER NOT NULL DEFAULT 0,
  perms TEXT NOT NULL, pos INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS registrations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, nome TEXT NOT NULL, descricao TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL, cycle TEXT NOT NULL DEFAULT 'mensal',
  status TEXT NOT NULL DEFAULT 'pendente',
  pay_status TEXT NOT NULL DEFAULT 'aguardando', paid_until TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  mp_payment_id TEXT NOT NULL UNIQUE, amount REAL NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS listings(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  mod TEXT NOT NULL, title TEXT NOT NULL, desc TEXT NOT NULL, cat TEXT NOT NULL, city TEXT NOT NULL,
  date TEXT, end TEXT, modal TEXT NOT NULL DEFAULT '', nivel TEXT NOT NULL DEFAULT '', stxt TEXT NOT NULL DEFAULT '',
  atend TEXT NOT NULL DEFAULT '', envio TEXT NOT NULL DEFAULT '', marca TEXT NOT NULL DEFAULT '', price REAL,
  tags TEXT NOT NULL DEFAULT '[]', prods TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pendente', featured INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS listings_mod ON listings(mod, status);
CREATE TABLE IF NOT EXISTS favorites(
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, ref TEXT NOT NULL,
  PRIMARY KEY(account_id, ref)
);
CREATE TABLE IF NOT EXISTS follows(
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  pro_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY(account_id, pro_id)
);
CREATE TABLE IF NOT EXISTS interests(
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  PRIMARY KEY(account_id, listing_id)
);
CREATE TABLE IF NOT EXISTS appointments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  pro_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  service TEXT NOT NULL, price REAL NOT NULL, duration INTEGER NOT NULL,
  date TEXT NOT NULL, time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'solicitado',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS appt_pro ON appointments(pro_id, date);
CREATE INDEX IF NOT EXISTS appt_client ON appointments(client_id);
CREATE TABLE IF NOT EXISTS reviews(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  pro_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  nota INTEGER NOT NULL, texto TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'aprovada', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  a_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  b_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  last_at TEXT NOT NULL, UNIQUE(a_id, b_id)
);
CREATE TABLE IF NOT EXISTS messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conv_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT
);
CREATE INDEX IF NOT EXISTS msg_conv ON messages(conv_id, id);
CREATE TABLE IF NOT EXISTS notifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, text TEXT NOT NULL, link TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notif_acc ON notifications(account_id, read);
CREATE TABLE IF NOT EXISTS groups(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  creator_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS group_members(
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY(group_id, account_id)
);
CREATE TABLE IF NOT EXISTS threads(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  question TEXT NOT NULL, tag TEXT NOT NULL DEFAULT 'Geral', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  texto TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_acc ON posts(account_id, id);
CREATE TABLE IF NOT EXISTS replies(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS job_marks(key TEXT PRIMARY KEY, at TEXT NOT NULL);
`;

const PLAN_OFF = { galeria: false, destaquePerfil: false, avaliacoes: false, agendamento: false, prioridade: false, selo: false, destaqueHome: false, newsletter: false, suporte: false };
const PLAN_DEFS = [
  ['basico', 'Básico', 49.9, 0, { proc: 5, ...PLAN_OFF }],
  ['profissional', 'Profissional', 79.9, 1, { proc: 0, ...PLAN_OFF, galeria: true, destaquePerfil: true, avaliacoes: true, agendamento: true, prioridade: true }],
  ['premium', 'Premium', 129.9, 0, { proc: 0, galeria: true, destaquePerfil: true, avaliacoes: true, agendamento: true, prioridade: true, selo: true, destaqueHome: true, newsletter: true, suporte: true }]
];

let readyP = null;
function ready() {
  if (!readyP) readyP = (async () => {
    if (REMOTE) await drv.run('PRAGMA foreign_keys=ON', []).catch(() => {});
    await drv.script(SCHEMA);
    // Planos iniciais (configuração editável no painel admin, não é conteúdo de exemplo)
    if (!(await drv.one('SELECT 1 FROM plans LIMIT 1', []))) {
      for (const [i, [k, n, p, pop, perms]] of PLAN_DEFS.entries())
        await drv.run('INSERT OR IGNORE INTO plans(key,name,price,pop,perms,pos) VALUES(?,?,?,?,?,?)', [k, n, p, pop, JSON.stringify(perms), i]);
    }
  })().catch(e => { readyP = null; throw e; });
  return readyP;
}

/* Dentro de tx(), one/all/run usam a mesma transação (AsyncLocalStorage). */
const inTx = () => { const s = als.getStore(); return s ? (REMOTE ? s.t : true) : undefined; };
const one = async (sql, ...p) => { await ready(); return drv.one(sql, p, inTx()); };
const all = async (sql, ...p) => { await ready(); return drv.all(sql, p, inTx()); };
const run = async (sql, ...p) => { await ready(); return drv.run(sql, p, inTx()); };
async function tx(fn) {
  await ready();
  if (als.getStore()) return fn(); // já dentro de uma transação
  return drv.tx(t => als.run({ t }, fn));
}
const exec = async sql => { await ready(); return drv.script(sql); };
const now = () => new Date().toISOString();
const close = () => drv.close();

module.exports = { one, all, run, tx, exec, now, ready, close, REMOTE, db: { raw: drv.raw } };
