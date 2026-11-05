'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cfg = require('./config');
const { one, all, run, tx, now } = require('./db');
const { digits } = require('./validate');
const { HttpError, UPLOADS } = require('./http');

const json = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/* ---------- tempo (no fuso do negócio) ---------- */
const tzFmt = new Intl.DateTimeFormat('en-CA', { timeZone: cfg.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function nowLocal() {
  const p = Object.fromEntries(tzFmt.formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fromMin = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const weekday = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); };

/* Situação do expediente agora: aberto até que horas, ou em quantos minutos volta a atender. */
function hoursState(dias, abre, fecha, clock) {
  const day = weekday(clock.date), a = toMin(abre), f = toMin(fecha);
  if (dias.includes(day) && clock.min >= a && clock.min < f) return { open: true, until: fecha, back: 0 };
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7;
    if (!dias.includes(d)) continue;
    if (i === 0 && clock.min >= a) continue;
    return { open: false, until: '', back: i * 1440 + a - clock.min };
  }
  return { open: false, until: '', back: null };
}

/* ---------- planos e permissões ---------- */
const BASE_PERMS = { proc: 0, galeria: false, destaquePerfil: false, avaliacoes: false, agendamento: false, prioridade: false, selo: false, destaqueHome: false, newsletter: false, suporte: false };
const plansMap = () => Object.fromEntries(all('SELECT * FROM plans ORDER BY pos').map(p => [p.key, { name: p.name, price: p.price, pop: !!p.pop, perms: { ...BASE_PERMS, ...json(p.perms, {}) } }]));
const payOk = r => !!r && (r.pay_status === 'isento' || (r.pay_status === 'pago' && !!r.paid_until && r.paid_until > now()));
const regActive = r => !!r && r.status === 'aprovado' && payOk(r);
function permsOf(reg, plans) { return regActive(reg) ? (plans[reg.plan] || { perms: BASE_PERMS }).perms : BASE_PERMS; }
const planAmount = (p, cycle) => Math.round(p.price * (cycle === 'anual' ? 10 : 1) * 100) / 100;

/* ---------- notificações ---------- */
function notify(accountId, kind, text, link = '') {
  run('INSERT INTO notifications(account_id,kind,text,link,read,created_at) VALUES(?,?,?,?,0,?)', accountId, kind, text, link, now());
}

/* ---------- profissionais ---------- */
const isProAcc = a => a.obj === 'divulgar' || a.papel === 'Profissional de beleza';
const roundHalf = n => Math.round(n * 10) / 10;

function loadPros({ viewerId = 0, id = 0 } = {}) {
  const plans = plansMap();
  const rows = all(`SELECT a.id, a.nome, a.verified vflag, s.photo, s.cidade, s.uf, s.bairro, s.nome_prof, s.spec, s.anos, s.bio, s.atend, s.mesmo, s.w, s.raio,
      s.dias, s.abre, s.fecha, s.pagto, s.wa, s.ig, s.agenda,
      r.status rstatus, r.plan, r.cycle, r.pay_status, r.paid_until
    FROM accounts a JOIN setups s ON s.account_id=a.id LEFT JOIN registrations r ON r.account_id=a.id
    WHERE s.done=1 AND (a.obj='divulgar' OR a.papel='Profissional de beleza')
      AND EXISTS(SELECT 1 FROM services v WHERE v.account_id=a.id) ${id ? 'AND a.id=' + (+id | 0) : ''}`);
  if (!rows.length) return [];
  const svcs = {};
  all('SELECT id, account_id, nome, preco, duracao FROM services ORDER BY pos, id').forEach(s => (svcs[s.account_id] = svcs[s.account_id] || []).push(s));
  const cover = Object.fromEntries(all(`SELECT account_id, photo FROM posts WHERE photo<>'' AND id IN (SELECT MAX(id) FROM posts WHERE photo<>'' GROUP BY account_id)`).map(r => [r.account_id, r.photo]));
  const rate = Object.fromEntries(all(`SELECT pro_id, AVG(nota) avg, COUNT(*) n FROM reviews WHERE status='aprovada' GROUP BY pro_id`).map(r => [r.pro_id, r]));
  const nphotos = Object.fromEntries(all('SELECT account_id, COUNT(*) n FROM photos GROUP BY account_id').map(r => [r.account_id, r.n]));
  const nfollow = Object.fromEntries(all('SELECT pro_id, COUNT(*) n FROM follows GROUP BY pro_id').map(r => [r.pro_id, r.n]));
  const clock = nowLocal();
  return rows.map(a => {
    const reg = a.plan ? { status: a.rstatus, pay_status: a.pay_status, paid_until: a.paid_until, plan: a.plan } : null;
    const perms = permsOf(reg, plans);
    let list = svcs[a.id] || [];
    if (perms.proc > 0) list = list.slice(0, perms.proc);
    const w = json(a.w, {}), wk = (a.atend === 'domicilio' || a.mesmo) ? a : w;
    const rt = rate[a.id];
    const waD = digits(a.wa);
    return {
      id: 'p' + a.id, acc: a.id,
      name: a.nome_prof || a.nome, role: a.spec || 'Profissional',
      city: `${wk.cidade || a.cidade} - ${wk.uf || a.uf}`, hood: wk.bairro || a.bairro || '',
      followers: nfollow[a.id] || 0,
      photos: perms.galeria ? (nphotos[a.id] || 0) : Math.min(3, nphotos[a.id] || 0),
      hours: hoursState(json(a.dias, []), a.abre, a.fecha, clock),
      services: list.map(s => ({ id: s.id, n: s.nome, p: s.preco, d: s.duracao })),
      rating: perms.avaliacoes && rt ? roundHalf(rt.avg) : 0,
      reviews: perms.avaliacoes && rt ? rt.n : 0,
      verified: !!a.vflag || perms.selo,
      cover: cover[a.id] || '', bio: a.bio, photo: a.photo, atend: a.atend, raio: a.raio, anos: a.anos,
      dias: json(a.dias, []), abre: a.abre, fecha: a.fecha, pagto: json(a.pagto, []),
      wa: waD ? '55' + waD : '', ig: a.ig, agenda: perms.agendamento ? a.agenda : '',
      own: a.id === viewerId,
      boost: (perms.prioridade ? 1 : 0) + (perms.destaqueHome ? 1 : 0),
      canReview: perms.avaliacoes, galeria: perms.galeria
    };
  });
}

/* ---------- listagens ---------- */
function listingJson(l, viewerId = 0) {
  const n = l.n_int || 0;
  return {
    id: 'l' + l.id, mod: l.mod, title: l.title, desc: l.desc, cat: l.cat, city: l.city, date: l.date || '', end: l.end || '',
    modal: l.modal, nivel: l.nivel, stxt: l.stxt, atend: l.atend, envio: l.envio, marca: l.marca, price: l.price,
    tags: json(l.tags, []), prods: json(l.prods, []), byName: l.byName, featured: !!l.featured,
    going: n, owner: l.owner_id, mine: l.owner_id === viewerId, status: l.status, hidden: !!l.hidden
  };
}
const LISTING_SQL = `SELECT l.*, COALESCE(r.nome, a.nome) byName,
    (SELECT COUNT(*) FROM interests i WHERE i.listing_id=l.id) n_int
  FROM listings l JOIN accounts a ON a.id=l.owner_id LEFT JOIN registrations r ON r.account_id=a.id`;

/* ---------- upload de imagens ---------- */
function sniffImage(b) {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
function saveImage(buf) {
  if (!Buffer.isBuffer(buf) || !buf.length) throw new HttpError(400, 'Envie uma imagem.');
  if (buf.length > 6 * 1024 * 1024) throw new HttpError(413, 'A imagem passa de 6 MB.');
  const ext = sniffImage(buf);
  if (!ext) throw new HttpError(415, 'Formato não aceito. Use JPG, PNG ou WebP.');
  const name = crypto.randomBytes(16).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  return '/uploads/' + name;
}
function removeImage(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const f = path.join(UPLOADS, path.basename(url));
  try { fs.unlinkSync(f); } catch { /* já removida */ }
}

module.exports = { json, norm, nowLocal, toMin, fromMin, weekday, BASE_PERMS, plansMap, payOk, regActive, permsOf, planAmount, notify, isProAcc, loadPros, listingJson, LISTING_SQL, saveImage, removeImage, one, all, run, tx, now };
