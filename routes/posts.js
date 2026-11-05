'use strict';
const { R, HttpError } = require('../lib/http');
const D = require('../lib/domain');
const limit = require('../lib/security').limiter(20, 36e5);

/* Publicação da profissional: texto e/ou foto (a foto é opcional). Corpo = imagem (pode ir vazio), texto na query. */
R.post('/api/me/posts', { auth: true, raw: true }, ctx => {
  const me = ctx.account;
  if (!D.isProAcc(me)) throw new HttpError(403, 'Publicações são para perfis profissionais.');
  if (!D.one('SELECT 1 FROM setups WHERE account_id=? AND done=1', me.id)) throw new HttpError(409, 'Conclua o seu perfil antes de publicar.');
  if (!limit(String(me.id))) throw new HttpError(429, 'Muitas publicações em pouco tempo. Tente mais tarde.');
  const texto = String(ctx.query.texto || '').replace(/\r\n/g, '\n').trim().slice(0, 1000);
  const hasPhoto = Buffer.isBuffer(ctx.body) && ctx.body.length > 0;
  if (!texto && !hasPhoto) throw new HttpError(422, 'Escreva algo ou escolha uma foto.', { texto: 'Escreva algo ou escolha uma foto.' });
  const photo = hasPhoto ? D.saveImage(ctx.body) : '';
  const r = D.run('INSERT INTO posts(account_id,texto,photo,created_at) VALUES(?,?,?,?)', me.id, texto, photo, D.now());
  const name = (D.one('SELECT nome_prof FROM setups WHERE account_id=?', me.id) || {}).nome_prof || me.nome;
  D.all('SELECT account_id FROM follows WHERE pro_id=?', me.id).forEach(f => D.notify(f.account_id, 'publicacao', `${name} fez uma nova publicação.`, 'profissional/p' + me.id));
  return { id: Number(r.lastInsertRowid), texto, photo };
});
R.get('/api/me/posts', { auth: true }, ctx =>
  ({ items: D.all('SELECT id, texto, photo, created_at at FROM posts WHERE account_id=? ORDER BY id DESC LIMIT 100', ctx.account.id) }));
R.delete('/api/me/posts/:id', { auth: true }, ctx => {
  const p = D.one('SELECT * FROM posts WHERE id=? AND account_id=?', +ctx.params.id, ctx.account.id);
  if (!p) throw new HttpError(404, 'Publicação não encontrada.');
  D.run('DELETE FROM posts WHERE id=?', p.id); D.removeImage(p.photo);
  return { ok: true };
});
/* Moderação */
R.get('/api/admin/posts', { admin: true }, () => ({
  items: D.all(`SELECT p.id, p.texto, p.photo, p.created_at, a.nome autor FROM posts p JOIN accounts a ON a.id=p.account_id ORDER BY p.id DESC LIMIT 100`)
}));
R.post('/api/admin/posts/:id/delete', { admin: true }, ctx => {
  const p = D.one('SELECT * FROM posts WHERE id=?', +ctx.params.id);
  if (!p) throw new HttpError(404, 'Publicação não encontrada.');
  D.run('DELETE FROM posts WHERE id=?', p.id); D.removeImage(p.photo);
  return { ok: true };
});
