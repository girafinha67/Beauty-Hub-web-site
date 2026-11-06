'use strict';
const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const cfg = require('./config');
const { sessionAccount } = require('./security');

class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
const routes = [];
function add(method, p, opts, handler) {
  if (typeof opts === 'function') { handler = opts; opts = {}; }
  const keys = [];
  const rx = new RegExp('^' + p.replace(/:([a-z]+)/gi, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ method, rx, keys, opts, handler });
}
const R = { get: (...a) => add('GET', ...a), post: (...a) => add('POST', ...a), put: (...a) => add('PUT', ...a), patch: (...a) => add('PATCH', ...a), delete: (...a) => add('DELETE', ...a) };

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

function secHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://nominatim.openstreetmap.org https://viacep.com.br; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (cfg.prod) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
function sendJson(res, status, obj, cookies) {
  const body = JSON.stringify(obj);
  if (cookies && cookies.length) res.setHeader('Set-Cookie', cookies);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function parseCookies(h) {
  const o = {};
  String(h || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return o;
}
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { reject(new HttpError(413, 'Arquivo ou texto grande demais.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const clientIp = req => (cfg.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '';

const COOKIE = 'bh_sid';
const sessionCookie = (t, maxAgeSec) =>
  `${COOKIE}=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${cfg.cookieSecure ? '; Secure' : ''}`;

async function api(req, res, url) {
  const method = req.method;
  let matched = null, pathOk = false;
  for (const r of routes) {
    const m = url.pathname.match(r.rx);
    if (!m) continue;
    pathOk = true;
    if (r.method === method) { matched = { r, m }; break; }
  }
  if (!matched) return sendJson(res, pathOk ? 405 : 404, { error: pathOk ? 'Método não permitido.' : 'Rota não encontrada.' });
  const { r, m } = matched;
  if (method !== 'GET' && !r.opts.webhook && req.headers['x-bh'] !== '1') return sendJson(res, 403, { error: 'Requisição inválida.' });

  const cookies = [];
  const sid = parseCookies(req.headers.cookie)[COOKIE];
  const ctx = {
    req, res, url, ip: clientIp(req), sid, cookies,
    params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])),
    query: Object.fromEntries(url.searchParams),
    account: await sessionAccount(sid), body: null,
    setCookie: c => cookies.push(c)
  };
  if (r.opts.auth || r.opts.admin) {
    if (!ctx.account) throw new HttpError(401, 'Entre na sua conta para continuar.');
    if (r.opts.admin && ctx.account.role !== 'admin') throw new HttpError(403, 'Acesso restrito.');
  }
  if (method !== 'GET' && method !== 'DELETE') {
    const raw = await readBody(req, r.opts.raw ? 4.2 * 1024 * 1024 : 256 * 1024);
    if (r.opts.raw) ctx.body = raw;
    else if (raw.length) {
      try { ctx.body = JSON.parse(raw.toString('utf8')); } catch { throw new HttpError(400, 'JSON inválido.'); }
    } else ctx.body = {};
    if (!r.opts.raw && (ctx.body === null || typeof ctx.body !== 'object')) throw new HttpError(400, 'Corpo inválido.');
  }
  const out = await r.handler(ctx);
  sendJson(res, 200, out === undefined ? { ok: true } : out, cookies);
}

const GZ = new Map();
function serveFile(req, res, file, extra = {}) {
  let st;
  try { st = fs.statSync(file); } catch { return false; }
  if (!st.isFile()) return false;
  const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
  const h = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'ETag': etag, 'Cache-Control': 'no-cache', ...extra };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, h); res.end(); return true; }
  const ext = path.extname(file).toLowerCase();
  if (['.html', '.js', '.css', '.svg', '.json'].includes(ext) && st.size > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    let z = GZ.get(file);
    if (!z || z.etag !== etag) { z = { etag, buf: zlib.gzipSync(fs.readFileSync(file), { level: 9 }) }; GZ.set(file, z); }
    h['Content-Encoding'] = 'gzip'; h['Vary'] = 'Accept-Encoding'; h['Content-Length'] = z.buf.length;
    res.writeHead(200, h);
    if (req.method === 'HEAD') res.end(); else res.end(z.buf);
    return true;
  }
  h['Content-Length'] = st.size;
  res.writeHead(200, h);
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  return true;
}
function safeJoin(base, rel) {
  const full = path.resolve(base, '.' + path.sep + rel);
  return full.startsWith(base + path.sep) || full === base ? full : null;
}
const PUBLIC = path.join(cfg.root, 'public');
const UPLOADS = path.join(cfg.dataDir, 'uploads');

async function handler(req, res) {
  secHeaders(res);
  try {
    const url = new URL(req.url, 'http://x');
    let p;
    try { p = decodeURIComponent(url.pathname); } catch { return sendJson(res, 400, { error: 'Endereço inválido.' }); }
    if (p.startsWith('/api/')) { url.pathname = p; return await api(req, res, url); }
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Método não permitido.' });
    if (p.startsWith('/uploads/')) {
      const name = p.slice(9);
      if (/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name)) {
        const img = await require('./db').one('SELECT mime, data FROM images WHERE name=?', name);
        if (img) {
          const buf = Buffer.from(img.data);
          res.writeHead(200, { 'Content-Type': img.mime, 'Content-Length': buf.length, 'Cache-Control': 'public, max-age=31536000, immutable' });
          return void (req.method === 'HEAD' ? res.end() : res.end(buf));
        }
      }
      const f = safeJoin(UPLOADS, name); // fotos antigas gravadas em disco (versão sem Vercel)
      if (f && serveFile(req, res, f, { 'Cache-Control': 'public, max-age=31536000, immutable' })) return;
    } else {
      const f = safeJoin(PUBLIC, p === '/' ? 'index.html' : p.slice(1));
      if (f && serveFile(req, res, f)) return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Não encontrado');
  } catch (e) {
    if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message, ...(e.fields ? { fields: e.fields } : {}) });
    console.error('[erro]', req.method, req.url, e);
    if (!res.headersSent) sendJson(res, 500, { error: 'Erro interno. Tente novamente.' });
  }
}
module.exports = { HttpError, R, handler, sessionCookie, UPLOADS };
