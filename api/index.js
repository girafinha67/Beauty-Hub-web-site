'use strict';
// Entrada serverless da Vercel: todas as rotas /api/* e /uploads/* chegam aqui.
['auth', 'profile', 'pros', 'booking', 'chat', 'community', 'registration', 'posts', 'admin', 'misc'].forEach(r => require('../routes/' + r));
const { handler } = require('../lib/http');
module.exports = (req, res) => handler(req, res);
