'use strict';
const { R, HttpError } = require('../lib/http');
const D = require('../lib/domain');

const minPrice = p => p.services.length ? Math.min(...p.services.map(s => s.p)) : 1e9;
const CATF = {
  salao: p => p.atend !== 'domicilio',
  estrelas: p => Math.round(p.rating) === 5,
  palestrante: p => /palestr|educador/.test(D.norm(p.role)),
  verif: p => p.verified,
  domicilio: p => p.atend === 'domicilio' || p.atend === 'ambos'
};
const strip = p => { const { canReview, galeria, boost, ...o } = p; return o; };
const proId = s => { const m = String(s).match(/^p(\d+)$/); if (!m) throw new HttpError(404, 'Profissional não encontrada.'); return +m[1]; };

async function visibleListings(extra = '', ...params) {
  return await D.all(`${D.LISTING_SQL} WHERE l.status='aprovado' AND l.hidden=0 ${extra}`, ...params);
}

R.get('/api/pros', async ctx => {
  const me = ctx.account, q = ctx.query;
  let L = await D.loadPros({ viewerId: me ? me.id : 0 });
  if (q.cat && CATF[q.cat]) L = L.filter(CATF[q.cat]);
  if (q.q) { const w = D.norm(q.q).split(/\s+/).filter(Boolean); L = L.filter(p => { const h = D.norm([p.name, p.role, p.city, p.bio, p.services.map(s => s.n).join(' ')].join(' ')); return w.every(x => h.includes(x)); }); }
  if (q.ver === '1') L = L.filter(p => p.verified);
  if (q.sort === 'fav') {
    const favs = me ? new Set((await D.all('SELECT ref FROM favorites WHERE account_id=?', me.id)).map(r => r.ref)) : new Set();
    L = L.filter(p => favs.has(p.id));
  }
  const mc = me ? D.norm((await D.one('SELECT cidade FROM setups WHERE account_id=?', me.id) || {}).cidade) : '';
  const near = p => mc && D.norm(p.city).startsWith(mc) ? 1 : 0;
  if (q.sort === 'price') L.sort((a, b) => minPrice(a) - minPrice(b));
  else if (q.sort === 'rate') L.sort((a, b) => b.rating - a.rating || b.boost - a.boost);
  else L.sort((a, b) => near(b) - near(a) || b.boost - a.boost || b.rating - a.rating);
  const limit = Math.min(+q.limit || 200, 200);
  return { items: L.slice(0, limit).map(strip) };
});

R.get('/api/pros/:id', async ctx => {
  const id = proId(ctx.params.id);
  const p = (await D.loadPros({ viewerId: ctx.account ? ctx.account.id : 0, id }))[0];
  if (!p) throw new HttpError(404, 'Profissional não encontrada.');
  const gallery = p.galeria ? await D.all('SELECT file url FROM photos WHERE account_id=? ORDER BY id DESC LIMIT 20', id)
    : await D.all('SELECT file url FROM photos WHERE account_id=? ORDER BY id DESC LIMIT 3', id);
  const reviews = p.canReview ? (await D.all(`SELECT r.nota, r.texto, r.created_at, a.nome FROM reviews r JOIN accounts a ON a.id=r.author_id
      WHERE r.pro_id=? AND r.status='aprovada' ORDER BY r.id DESC LIMIT 20`, id)).map(r => ({ nota: r.nota, texto: r.texto, at: r.created_at, autor: r.nome.split(' ')[0] })) : [];
  const posts = await D.all('SELECT id, texto, photo, created_at at FROM posts WHERE account_id=? ORDER BY id DESC LIMIT 30', id);
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (p.canReview) (await D.all(`SELECT nota, COUNT(*) n FROM reviews WHERE pro_id=? AND status='aprovada' GROUP BY nota`, id)).forEach(r => { dist[r.nota] = r.n; });
  return { ...strip(p), gallery: gallery.map(g => g.url), reviewList: reviews, posts, dist };
});

R.get('/api/search', async ctx => {
  const words = D.norm(ctx.query.q).split(/\s+/).filter(Boolean);
  if (!words.length) return { items: [], pros: [] };
  const me = ctx.account ? ctx.account.id : 0;
  const hay = it => D.norm([it.title, it.desc, it.cat, it.city, it.byName, it.marca, D.json(it.tags, []).join(' '), D.json(it.prods, []).join(' '), it.stxt].join(' '));
  const items = (await visibleListings()).filter(it => words.every(w => hay(it).includes(w))).map(l => D.listingJson(l, me));
  const pros = (await D.loadPros({ viewerId: me })).filter(p => { const h = D.norm([p.name, p.role, p.city, p.bio, p.services.map(s => s.n).join(' ')].join(' ')); return words.every(w => h.includes(w)); }).map(strip);
  return { items, pros };
});

R.get('/api/radar', async ctx => {
  const today = D.nowLocal().date, me = ctx.account ? ctx.account.id : 0;
  const rows = await visibleListings(`AND l.date IS NOT NULL AND l.date<>'' AND COALESCE(NULLIF(l.end,''), l.date) >= ? ORDER BY l.date`, today);
  return { items: rows.map(l => D.listingJson(l, me)) };
});

R.get('/api/favorites', { auth: true }, async ctx => {
  const refs = (await D.all('SELECT ref FROM favorites WHERE account_id=?', ctx.account.id)).map(r => r.ref);
  const lids = new Set(refs.filter(r => r[0] === 'l')), pids = new Set(refs.filter(r => r[0] === 'p'));
  return {
    items: (await visibleListings()).filter(l => lids.has('l' + l.id)).map(l => D.listingJson(l, ctx.account.id)),
    pros: (await D.loadPros({ viewerId: ctx.account.id })).filter(p => pids.has(p.id)).map(strip)
  };
});

module.exports = { visibleListings };
