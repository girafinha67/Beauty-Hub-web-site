'use strict';
const http = require('node:http');
const cfg = require('./lib/config');
require('./lib/db');
const { handler } = require('./lib/http');
const { startJobs } = require('./lib/jobs');
['auth', 'profile', 'pros', 'booking', 'chat', 'community', 'registration', 'admin', 'misc'].forEach(r => require('./routes/' + r));

function start(port = cfg.port) {
  const server = http.createServer(handler);
  server.requestTimeout = 30000;
  return new Promise(res => server.listen(port, () => res(server)));
}
module.exports = { start };

if (require.main === module) {
  start().then(s => {
    console.log(`Beauty Hub rodando em ${cfg.baseUrl} (porta ${s.address().port})`);
    if (!cfg.resendKey) console.log('Aviso: RESEND_API_KEY não configurada — e-mails (redefinir senha) aparecem só neste log.');
    if (!cfg.mpToken) console.log('Aviso: MP_ACCESS_TOKEN não configurado — pagamento online desativado (o admin confirma manualmente).');
    startJobs();
    const stop = () => { s.close(() => { try { require('./lib/db').db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); require('./lib/db').db.close(); } catch {} process.exit(0); }); setTimeout(() => process.exit(0), 8000).unref(); };
    process.on('SIGTERM', stop); process.on('SIGINT', stop);
  });
}
