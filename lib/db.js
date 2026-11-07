'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const cfg = require('./config');

fs.mkdirSync(path.join(cfg.dataDir, 'uploads'), { recursive: true });
const db = new DatabaseSync(process.env.DB_FILE || path.join(cfg.dataDir, 'beautyhub.db'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');

db.exec(`
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
`);

// Migração: banner do perfil da profissional
if (!db.prepare('PRAGMA table_info(setups)').all().some(c => c.name === 'banner')) {
  db.exec("ALTER TABLE setups ADD COLUMN banner TEXT NOT NULL DEFAULT ''");
}

// Planos iniciais (configuração editável no painel admin, não é conteúdo de exemplo)
if (!db.prepare('SELECT 1 FROM plans LIMIT 1').get()) {
  const off = { galeria: false, destaquePerfil: false, avaliacoes: false, agendamento: false, prioridade: false, selo: false, destaqueHome: false, newsletter: false, suporte: false };
  const defs = [
    ['basico', 'Básico', 49.9, 0, { proc: 5, ...off }],
    ['profissional', 'Profissional', 79.9, 1, { proc: 0, ...off, galeria: true, destaquePerfil: true, avaliacoes: true, agendamento: true, prioridade: true }],
    ['premium', 'Premium', 129.9, 0, { proc: 0, galeria: true, destaquePerfil: true, avaliacoes: true, agendamento: true, prioridade: true, selo: true, destaqueHome: true, newsletter: true, suporte: true }]
  ];
  defs.forEach(([k, n, p, pop, perms], i) =>
    db.prepare('INSERT INTO plans(key,name,price,pop,perms,pos) VALUES(?,?,?,?,?,?)').run(k, n, p, pop, JSON.stringify(perms), i));
}

const cache = new Map();
const st = sql => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
const one = (sql, ...p) => st(sql).get(...p);
const all = (sql, ...p) => st(sql).all(...p).map(r => ({ ...r }));
const run = (sql, ...p) => st(sql).run(...p);
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
const now = () => new Date().toISOString();

module.exports = { db, one, all, run, tx, now };
