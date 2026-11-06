'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { R, HttpError } = require('../lib/http');
const cfg = require('../lib/config');

const TITLES = { termos: 'Termos de uso', priv: 'Política de privacidade', contato: 'Contato' };
const FILES = { termos: 'termos.html', priv: 'privacidade.html' };
R.get('/api/content/:key', async ctx => {
  const k = ctx.params.key;
  if (!TITLES[k]) throw new HttpError(404, 'Página não encontrada.');
  if (k === 'contato') {
    if (!cfg.contactEmail) throw new HttpError(404, 'Contato não configurado.');
    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return { title: TITLES[k], html: `<p>Fale com a equipe do Beauty Hub pelo e-mail <b>${esc(cfg.contactEmail)}</b>.</p>` };
  }
  return { title: TITLES[k], html: fs.readFileSync(path.join(cfg.root, 'content', FILES[k]), 'utf8') };
});

R.get('/api/health', async () => {
  require('../lib/db').one('SELECT 1 ok');
  return { ok: true, uptime: Math.round(process.uptime()) };
});

/* Rotinas diárias (avisos de plano, lembretes). A Vercel chama esta rota pelo Cron e envia CRON_SECRET. */
R.get('/api/cron', async ctx => {
  if (!cfg.cronSecret || ctx.req.headers.authorization !== 'Bearer ' + cfg.cronSecret) throw new HttpError(401, 'Não autorizado.');
  await require('../lib/jobs').runAll();
  return { ok: true };
});
