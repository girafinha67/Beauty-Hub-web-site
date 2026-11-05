'use strict';
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
process.env.DB_FILE = ':memory:'; process.env.VERIFY_ONLINE = '0';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-'));
module.exports.boot = async () => {
  const { start } = require('../server');
  const server = await start(0);
  const base = 'http://127.0.0.1:' + server.address().port;
  const client = () => {
    let cookie = '';
    const call = async (method, url, body, raw) => {
      const h = { 'X-BH': '1', ...(cookie ? { Cookie: cookie } : {}) };
      if (body && !raw) h['Content-Type'] = 'application/json';
      const r = await fetch(base + url, { method, headers: h, body: raw ? body : body ? JSON.stringify(body) : undefined });
      const sc = r.headers.getSetCookie();
      if (sc.length) { const v = sc[0].split(';')[0]; cookie = v.endsWith('=') ? '' : v; }
      let j = null; try { j = await r.json(); } catch {}
      return { status: r.status, body: j };
    };
    return { get: u => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b), patch: (u, b) => call('PATCH', u, b), del: u => call('DELETE', u), raw: (u, buf) => call('POST', u, buf, true) };
  };
  return { server, base, client, db: require('../lib/db') };
};
module.exports.CPF = ['52998224725', '11144477735', '39053344705', '16899535009', '71428793860'];
module.exports.CNPJ = '11222333000181';
