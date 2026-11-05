'use strict';
const { R, HttpError } = require('../lib/http');
const V = require('../lib/validate');
const D = require('../lib/domain');

const display = id => D.one(`SELECT a.id, a.obj, a.papel, COALESCE(NULLIF(s.nome_prof,''), a.nome) name, COALESCE(s.photo,'') photo
  FROM accounts a LEFT JOIN setups s ON s.account_id=a.id WHERE a.id=?`, id);
function convFor(id, me) {
  const c = D.one('SELECT * FROM conversations WHERE id=?', +id);
  if (!c || (c.a_id !== me && c.b_id !== me)) throw new HttpError(404, 'Conversa não encontrada.');
  return c;
}

R.get('/api/conversations', { auth: true }, ctx => {
  const me = ctx.account.id;
  const rows = D.all('SELECT * FROM conversations WHERE a_id=? OR b_id=? ORDER BY last_at DESC LIMIT 100', me, me);
  return {
    items: rows.map(c => {
      const other = display(c.a_id === me ? c.b_id : c.a_id);
      const last = D.one('SELECT sender_id, body, created_at FROM messages WHERE conv_id=? ORDER BY id DESC LIMIT 1', c.id);
      const unread = D.one('SELECT COUNT(*) n FROM messages WHERE conv_id=? AND sender_id<>? AND read_at IS NULL', c.id, me).n;
      return { id: c.id, with: { id: other.id, name: other.name, photo: other.photo }, last: last ? { body: last.body, at: last.created_at, mine: last.sender_id === me } : null, unread };
    }).filter(c => c.last)
  };
});

R.post('/api/conversations', { auth: true }, ctx => {
  const me = ctx.account.id, to = +ctx.body.to;
  if (!to || to === me || !D.one('SELECT 1 FROM accounts WHERE id=?', to)) throw new HttpError(400, 'Destinatário inválido.');
  const [a, b] = me < to ? [me, to] : [to, me];
  D.run('INSERT INTO conversations(a_id,b_id,last_at) VALUES(?,?,?) ON CONFLICT(a_id,b_id) DO NOTHING', a, b, D.now());
  const c = D.one('SELECT id FROM conversations WHERE a_id=? AND b_id=?', a, b);
  const other = display(to);
  return { id: c.id, with: { id: other.id, name: other.name, photo: other.photo } };
});

R.get('/api/conversations/:id/messages', { auth: true }, ctx => {
  const me = ctx.account.id, c = convFor(ctx.params.id, me), after = +ctx.query.after || 0;
  D.run('UPDATE messages SET read_at=? WHERE conv_id=? AND sender_id<>? AND read_at IS NULL', D.now(), c.id, me);
  const items = D.all('SELECT id, sender_id, body, created_at FROM messages WHERE conv_id=? AND id>? ORDER BY id LIMIT 200', c.id, after)
    .map(m => ({ id: m.id, mine: m.sender_id === me, body: m.body, at: m.created_at }));
  const other = display(c.a_id === me ? c.b_id : c.a_id);
  return { items, with: { id: other.id, name: other.name, photo: other.photo } };
});

const sendLimit = require('../lib/security').limiter(30, 6e4);
R.post('/api/conversations/:id/messages', { auth: true }, ctx => {
  const me = ctx.account, c = convFor(ctx.params.id, me.id), body = V.str(ctx.body.body, 2000);
  if (!body) throw new HttpError(400, 'Escreva uma mensagem.');
  if (!sendLimit(String(me.id))) throw new HttpError(429, 'Você está enviando mensagens rápido demais.');
  const now = D.now();
  const r = D.run('INSERT INTO messages(conv_id,sender_id,body,created_at) VALUES(?,?,?,?)', c.id, me.id, body, now);
  D.run('UPDATE conversations SET last_at=? WHERE id=?', now, c.id);
  return { id: Number(r.lastInsertRowid), at: now };
});
