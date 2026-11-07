'use strict';
const crypto = require('node:crypto');
const { one, run, now } = require('./db');

const scrypt = (pw, salt) => new Promise((res, rej) =>
  crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? rej(e) : res(k)));

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await scrypt(pw, salt)).toString('base64')}`;
}
async function verifyPassword(pw, stored) {
  const [t, s, h] = String(stored).split('$');
  if (t !== 'scrypt' || !s || !h) return false;
  const k = await scrypt(pw, Buffer.from(s, 'base64'));
  const hb = Buffer.from(h, 'base64');
  return hb.length === k.length && crypto.timingSafeEqual(hb, k);
}
let dummy;
async function burnTime(pw) { dummy = dummy || await hashPassword('x'); await verifyPassword(pw, dummy); }

const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');

const SESSION_SEC = 180 * 86400, SESSION_MS = SESSION_SEC * 1000;
function createSession(accountId) {
  const t = token();
  run('INSERT INTO sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)', sha(t), accountId, Date.now() + SESSION_MS, Date.now());
  return t;
}
function sessionAccount(t) {
  if (!t) return null;
  const h = sha(t);
  const s = one('SELECT * FROM sessions WHERE token_hash=?', h);
  if (!s) return null;
  if (s.expires_at < Date.now()) { run('DELETE FROM sessions WHERE token_hash=?', h); return null; }
  const renew = s.expires_at - Date.now() < SESSION_MS * 0.8;
  if (renew) run('UPDATE sessions SET expires_at=? WHERE token_hash=?', Date.now() + SESSION_MS, h);
  const acc = one('SELECT * FROM accounts WHERE id=?', s.account_id) || null;
  if (acc && renew) Object.defineProperty(acc, '__renewed', { value: true, enumerable: false });
  return acc;
}
const destroySession = t => t && run('DELETE FROM sessions WHERE token_hash=?', sha(t));
setInterval(() => { try { run('DELETE FROM sessions WHERE expires_at<?', Date.now()); run('DELETE FROM reset_tokens WHERE expires_at<?', Date.now()); } catch {} }, 36e5).unref();

function limiter(max, windowMs) {
  const hits = new Map();
  setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (!v.some(t => n - t < windowMs)) hits.delete(k); }, windowMs).unref();
  return key => {
    const n = Date.now(), a = (hits.get(key) || []).filter(t => n - t < windowMs);
    if (a.length >= max) { hits.set(key, a); return false; }
    a.push(n); hits.set(key, a); return true;
  };
}
module.exports = { SESSION_SEC, hashPassword, verifyPassword, burnTime, sha, token, createSession, sessionAccount, destroySession, limiter, now };
