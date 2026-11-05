'use strict';
/* Conferências online feitas pelo servidor: o domínio do e-mail existe (DNS) e o CNPJ existe e está ativo na Receita (BrasilAPI).
   Se o serviço externo estiver fora do ar, a conferência é ignorada (nunca bloqueia o cadastro por falha de terceiros).
   Desligue com VERIFY_ONLINE=0. */
const dns = require('node:dns').promises;
const R = require('./rules');
const on = () => process.env.VERIFY_ONLINE !== '0';
const cache = new Map(), TTL = 6 * 36e5;
async function cached(key, fn) {
  const c = cache.get(key); if (c && Date.now() - c.t < TTL) return c.v;
  const v = await fn(); if (v !== undefined) { cache.set(key, { t: Date.now(), v }); if (cache.size > 2000) cache.delete(cache.keys().next().value); } return v;
}
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms).unref())]);

/* Se o DNS do servidor não resolve nem um domínio conhecido, ele está sem rede: nesse caso não dá para concluir nada. */
const dnsWorks = () => cached('dns-canary', async () => { try { await timeout(dns.resolveMx('gmail.com'), 3500); return true; } catch (e) { return e.code === 'ENOTFOUND' || e.code === 'ENODATA' ? false : undefined; } });
/* '' = ok; texto = erro */
async function emailDomain(email) {
  if (!on()) return '';
  const dom = String(email).trim().toLowerCase().split('@')[1];
  if (!dom) return R.EMAIL_MSG;
  const r = await cached('mx:' + dom, async () => {
    try { const mx = await timeout(dns.resolveMx(dom), 3500); return mx && mx.length ? 'ok' : 'no'; }
    catch (e) {
      if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') {
        try { await timeout(dns.resolve4(dom), 3500); return 'ok'; } catch (e2) { return e2.code === 'ENOTFOUND' || e2.code === 'ENODATA' ? 'no' : undefined; }
      }
      return undefined; // falha de rede/DNS: não bloqueia
    }
  });
  if (r === 'no' && !(await dnsWorks())) return '';
  return r === 'no' ? 'O domínio desse e-mail não existe. Confira como você digitou.' : '';
}
/* { msg:'' | erro, razao?:string } */
async function cnpjReceita(cnpj) {
  cnpj = R.digits(cnpj);
  if (!on() || !R.cnpjOk(cnpj)) return { msg: '' };
  const r = await cached('cnpj:' + cnpj, async () => {
    try {
      const res = await timeout(fetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpj, { headers: { Accept: 'application/json' } }), 5000);
      if (res.status === 404) return { found: false };
      if (!res.ok) return undefined;
      const j = await res.json();
      return { found: true, ativa: /ativa/i.test(String(j.descricao_situacao_cadastral || '')) || +j.situacao_cadastral === 2, razao: j.razao_social || '' };
    } catch { return undefined; }
  });
  if (!r) return { msg: '' };
  if (!r.found) return { msg: 'Esse CNPJ não foi encontrado na Receita Federal.' };
  if (!r.ativa) return { msg: 'Esse CNPJ não está ativo na Receita Federal.' };
  return { msg: '', razao: r.razao };
}
module.exports = { emailDomain, cnpjReceita };
