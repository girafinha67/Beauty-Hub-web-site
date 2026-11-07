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
const ANOS_ORD = ['Menos de 1 ano', '1 a 2 anos', '3 a 5 anos', 'Mais de 5 anos'];
const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 20);
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const strip = p => { const { canReview, galeria, boost, ...o } = p; return o; };
const proId = s => { const m = String(s).match(/^p(\d+)$/); if (!m) throw new HttpError(404, 'Profissional não encontrada.'); return +m[1]; };

function visibleListings(extra = '', ...params) {
  return D.all(`${D.LISTING_SQL} WHERE l.status='aprovado' AND l.hidden=0 ${extra}`, ...params);
}

R.get('/api/pros', ctx => {
  const me = ctx.account, q = ctx.query;
  let L = D.loadPros({ viewerId: me ? me.id : 0 });
  if (q.cat && CATF[q.cat]) L = L.filter(CATF[q.cat]);
  if (q.q) { const w = D.norm(q.q).split(/\s+/).filter(Boolean); L = L.filter(p => { const h = D.norm([p.name, p.role, p.city, p.bio, p.services.map(s => s.n).join(' ')].join(' ')); return w.every(x => h.includes(x)); }); }
  if (q.ver === '1') L = L.filter(p => p.verified);
  /* ----- filtros avançados (todos opcionais e combináveis) ----- */
  if (q.atend === 'estudio') L = L.filter(p => p.atend !== 'domicilio');
  if (q.atend === 'domicilio') L = L.filter(p => p.atend === 'domicilio' || p.atend === 'ambos');
  const pmin = num(q.pmin), pmax = num(q.pmax);
  if (pmin !== null || pmax !== null) L = L.filter(p => p.services.some(s => (pmin === null || s.p >= pmin) && (pmax === null || s.p <= pmax)));
  const rmin = num(q.rmin);
  if (rmin) L = L.filter(p => p.rating >= rmin);
  const spec = list(q.spec).map(D.norm);
  if (spec.length) L = L.filter(p => spec.includes(D.norm(p.role)));
  const svc = list(q.svc).map(D.norm);
  if (svc.length) L = L.filter(p => svc.some(x => p.services.some(s => D.norm(s.n).includes(x))));
  if (q.city) { const c = D.norm(q.city); L = L.filter(p => D.norm(p.city).includes(c)); }
  const pag = list(q.pag);
  if (pag.length) L = L.filter(p => pag.every(x => (p.pagto || []).includes(x)));
  const dia = list(q.dia).map(Number).filter(d => d >= 0 && d <= 6);
  if (dia.length) L = L.filter(p => dia.some(d => (p.dias || []).includes(d)));
  if (q.hoje === '1') {
    const now = D.nowLocal(), wd = D.weekday(now.date);
    L = L.filter(p => (p.dias || []).includes(wd) && p.abre && p.fecha && now.min >= D.toMin(p.abre) && now.min < D.toMin(p.fecha));
  }
  const am = ANOS_ORD.indexOf(q.anos);
  if (am > 0) L = L.filter(p => ANOS_ORD.indexOf(p.anos) >= am);
  if (q.rev === '1') L = L.filter(p => p.reviews > 0);
  if (q.novo === '1') L = L.filter(p => !p.reviews);
  if (q.fotos === '1') L = L.filter(p => p.cover || p.photo);
  if (q.wa === '1') L = L.filter(p => p.wa);
  if (q.agenda === '1') L = L.filter(p => p.agenda);
  if (q.sort === 'fav') {
    const favs = me ? new Set(D.all('SELECT ref FROM favorites WHERE account_id=?', me.id).map(r => r.ref)) : new Set();
    L = L.filter(p => favs.has(p.id));
  }
  const mc = me ? D.norm((D.one('SELECT cidade FROM setups WHERE account_id=?', me.id) || {}).cidade) : '';
  const near = p => mc && D.norm(p.city).startsWith(mc) ? 1 : 0;
  if (q.sort === 'price') L.sort((a, b) => minPrice(a) - minPrice(b));
  else if (q.sort === 'rate') L.sort((a, b) => b.rating - a.rating || b.boost - a.boost);
  else L.sort((a, b) => near(b) - near(a) || b.boost - a.boost || b.rating - a.rating);
  const limit = Math.min(+q.limit || 200, 200);
  return { items: L.slice(0, limit).map(strip) };
});

R.get('/api/pros/:id', ctx => {
  const id = proId(ctx.params.id);
  const p = D.loadPros({ viewerId: ctx.account ? ctx.account.id : 0, id })[0];
  if (!p) throw new HttpError(404, 'Profissional não encontrada.');
  const gallery = p.galeria ? D.all('SELECT file url FROM photos WHERE account_id=? ORDER BY id DESC LIMIT 20', id)
    : D.all('SELECT file url FROM photos WHERE account_id=? ORDER BY id DESC LIMIT 3', id);
  const reviews = p.canReview ? D.all(`SELECT r.nota, r.texto, r.created_at, a.nome FROM reviews r JOIN accounts a ON a.id=r.author_id
      WHERE r.pro_id=? AND r.status='aprovada' ORDER BY r.id DESC LIMIT 20`, id).map(r => ({ nota: r.nota, texto: r.texto, at: r.created_at, autor: r.nome.split(' ')[0] })) : [];
  const posts = D.all('SELECT id, texto, photo, created_at at FROM posts WHERE account_id=? ORDER BY id DESC LIMIT 30', id);
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (p.canReview) D.all(`SELECT nota, COUNT(*) n FROM reviews WHERE pro_id=? AND status='aprovada' GROUP BY nota`, id).forEach(r => { dist[r.nota] = r.n; });
  return { ...strip(p), gallery: gallery.map(g => g.url), reviewList: reviews, posts, dist };
});

R.get('/api/search', ctx => {
  const words = D.norm(ctx.query.q).split(/\s+/).filter(Boolean);
  if (!words.length) return { items: [], pros: [] };
  const me = ctx.account ? ctx.account.id : 0;
  const hay = it => D.norm([it.title, it.desc, it.cat, it.city, it.byName, it.marca, D.json(it.tags, []).join(' '), D.json(it.prods, []).join(' '), it.stxt].join(' '));
  const items = visibleListings().filter(it => words.every(w => hay(it).includes(w))).map(l => D.listingJson(l, me));
  const pros = D.loadPros({ viewerId: me }).filter(p => { const h = D.norm([p.name, p.role, p.city, p.bio, p.services.map(s => s.n).join(' ')].join(' ')); return words.every(w => h.includes(w)); }).map(strip);
  return { items, pros };
});

R.get('/api/radar', ctx => {
  const today = D.nowLocal().date, me = ctx.account ? ctx.account.id : 0;
  const rows = visibleListings(`AND l.date IS NOT NULL AND l.date<>'' AND COALESCE(NULLIF(l.end,''), l.date) >= ? ORDER BY l.date`, today);
  return { items: rows.map(l => D.listingJson(l, me)) };
});

R.get('/api/favorites', { auth: true }, ctx => {
  const refs = D.all('SELECT ref FROM favorites WHERE account_id=?', ctx.account.id).map(r => r.ref);
  const lids = new Set(refs.filter(r => r[0] === 'l')), pids = new Set(refs.filter(r => r[0] === 'p'));
  return {
    items: visibleListings().filter(l => lids.has('l' + l.id)).map(l => D.listingJson(l, ctx.account.id)),
    pros: D.loadPros({ viewerId: ctx.account.id }).filter(p => pids.has(p.id)).map(strip)
  };
});

module.exports = { visibleListings };
