'use strict';
/* Versão dos dados públicos: sobe a cada escrita bem-sucedida e invalida os caches de leitura. */
const c = { ver: 1, bump() { c.ver++; } };
module.exports = c;
