'use strict';
const { digits, cpfOk, cnpjOk, nomeErro, emailErro, emailOk } = require('./rules');
const senhaOk = v => typeof v === 'string' && v.length >= 8 && v.length <= 200 && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);
const maskTel = v => { v = digits(v).slice(0, 11); return v.length > 10 ? `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}` : v.length > 6 ? `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}` : v; };
const maskDoc = v => { v = digits(v); return v.length === 11 ? v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : v.length === 14 ? v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : v; };
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
const isTime = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
module.exports = { digits, nomeErro, emailErro, emailOk, senhaOk, cpfOk, cnpjOk, maskTel, maskDoc, str, isDate, isTime };
