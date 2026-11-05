'use strict';
const cfg = require('./config');
// Envia e-mail pelo Resend. Sem RESEND_API_KEY, escreve no log do servidor (útil em desenvolvimento).
async function sendMail({ to, subject, text }) {
  if (!cfg.resendKey) { console.log(`[e-mail para ${to}] ${subject}\n${text}\n`); return false; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.mailFrom, to: [to], subject, text })
    });
    if (!r.ok) console.error('[e-mail] falhou', r.status, await r.text());
    return r.ok;
  } catch (e) { console.error('[e-mail] erro', e.message); return false; }
}
module.exports = { sendMail };
