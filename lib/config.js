'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

// Leitor mínimo de .env (sem dependências)
try {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* sem .env, tudo bem */ }

const e = process.env;
const prod = e.NODE_ENV === 'production';
const port = +e.PORT || 3000;

module.exports = {
  root,
  prod,
  port,
  baseUrl: (e.BASE_URL || (e.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + e.VERCEL_PROJECT_PRODUCTION_URL : `http://localhost:${port}`)).replace(/\/$/, ''),
  dataDir: path.resolve(root, e.DATA_DIR || 'data'),
  tz: e.APP_TZ || 'America/Sao_Paulo',
  trustProxy: e.TRUST_PROXY === '1' || !!e.VERCEL,
  onVercel: !!e.VERCEL,
  cronSecret: e.CRON_SECRET || '',
  cookieSecure: e.COOKIE_SECURE ? e.COOKIE_SECURE === '1' : prod,
  resendKey: e.RESEND_API_KEY || '',
  mailFrom: e.MAIL_FROM || 'Beauty Hub <onboarding@resend.dev>',
  mpToken: e.MP_ACCESS_TOKEN || '',
  mpApi: (e.MP_API_BASE || 'https://api.mercadopago.com').replace(/\/$/, ''),
  contactEmail: e.CONTACT_EMAIL || ''
};
