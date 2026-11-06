'use strict';
// Uso: node scripts/make-admin.js email@dominio.com   (a conta precisa já existir)
const { one, run } = require('../lib/db');
const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('Informe o e-mail: node scripts/make-admin.js email@dominio.com'); process.exit(1); }
const a = one('SELECT id FROM accounts WHERE email=?', email);
if (!a) { console.error('Nenhuma conta com esse e-mail. Crie a conta no site primeiro.'); process.exit(1); }
run(`UPDATE accounts SET role='admin' WHERE id=?`, a.id);
console.log('Pronto: ' + email + ' agora é administradora.');
