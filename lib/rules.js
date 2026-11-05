/* Regras de validação compartilhadas: o MESMO arquivo roda no servidor (require) e no navegador (build.py embute no app.js). */
const digits = v => String(v == null ? '' : v).replace(/\D/g, '');
function cpfOk(v) {
  v = digits(v); if (v.length !== 11 || /^(\d)\1+$/.test(v)) return false;
  for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += +v[i] * (n + 1 - i); if ((s * 10) % 11 % 10 !== +v[n]) return false; }
  return true;
}
function cnpjOk(v) {
  v = digits(v); if (v.length !== 14 || /^(\d)\1+$/.test(v)) return false;
  for (const n of [12, 13]) { let s = 0, p = n - 7; for (let i = 0; i < n; i++) { s += +v[i] * p--; if (p < 2) p = 9; } const d = s % 11 < 2 ? 0 : 11 - s % 11; if (d !== +v[n]) return false; }
  return true;
}
/* Nome completo: só letras, ao menos nome + sobrenome, sem lixo tipo "aaa bbb" ou "teste teste". Devolve '' se ok, senão a mensagem. */
const NOME_MSG = 'Informe seu nome completo (nome e sobrenome, só letras).';
const PARTICULAS = ['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'la', 'van', 'von', 'bin', 'al'];
const NOME_FALSO = ['teste', 'test', 'asdf', 'asdfg', 'qwerty', 'fulano', 'ciclano', 'beltrano', 'nome', 'sobrenome', 'xxxx', 'abcd', 'aaaa', 'usuario'];
function nomeErro(v) {
  const n = String(v == null ? '' : v).trim().replace(/\s+/g, ' ');
  if (n.length < 5 || n.length > 120) return NOME_MSG;
  if (!/^\p{L}[\p{L}'’.\- ]*$/u.test(n)) return 'O nome deve ter só letras, sem números ou símbolos.';
  const ws = n.split(' ').filter(Boolean), sig = ws.filter(w => !PARTICULAS.includes(w.toLowerCase()));
  if (sig.length < 2 || sig.some(w => w.replace(/[^\p{L}]/gu, '').length < 2)) return NOME_MSG;
  if (!sig.some(w => w.replace(/[^\p{L}]/gu, '').length >= 3)) return NOME_MSG;
  for (const w of sig) {
    const l = w.toLowerCase().replace(/[^\p{L}]/gu, '');
    if (/(.)\1{2,}/u.test(l) || (l.length >= 3 && !/[aeiouyáéíóúâêôãõàü]/.test(l)) || NOME_FALSO.includes(l)) return 'Esse nome não parece real. Digite seu nome completo como no documento.';
  }
  if (new Set(sig.map(w => w.toLowerCase())).size < 2) return 'Esse nome não parece real. Digite seu nome completo como no documento.';
  return '';
}
/* E-mail: sintaxe, regras próprias do Gmail, erros de digitação comuns e e-mails descartáveis.
   { login:true } só confere a sintaxe (não bloqueia contas antigas). Existência do domínio (DNS) é conferida no servidor. */
const TYPOS = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.com.br': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gamil.com': 'gmail.com', 'gimail.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'icloud.con': 'icloud.com' };
const DESCARTAVEIS = ['mailinator.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'throwawaymail.com', 'maildrop.cc', 'dispostable.com'];
const EMAIL_MSG = 'Informe um e-mail válido, como nome@gmail.com.';
function emailErro(v, o) {
  const e = String(v == null ? '' : v).trim().toLowerCase();
  if (!e || e.length > 160) return EMAIL_MSG;
  const m = e.match(/^([^@\s]+)@([^@\s]+)$/);
  if (!m) return EMAIL_MSG;
  const [, local, dom] = m;
  if (local.length > 64 || !/^[a-z0-9._%+\-]+$/.test(local) || /^\.|\.$|\.\./.test(local)) return EMAIL_MSG;
  const labels = dom.split('.');
  if (labels.length < 2 || labels.some(l => !l || l.length > 63 || !/^[a-z0-9-]+$/.test(l) || /^-|-$/.test(l)) || !/^[a-z]{2,}$/.test(labels[labels.length - 1])) return EMAIL_MSG;
  if (o && o.login) return '';
  if (TYPOS[dom]) return `Esse e-mail parece ter um erro. Você quis dizer ${local}@${TYPOS[dom]}?`;
  if (DESCARTAVEIS.includes(dom)) return 'Use um e-mail pessoal. E-mails temporários não são aceitos.';
  if (dom === 'gmail.com' || dom === 'googlemail.com') {
    const base = local.split('+')[0];
    if (base.length < 6 || base.length > 30 || !/^[a-z0-9.]+$/.test(base) || /^\.|\.$|\.\./.test(base) || !/[a-z]/.test(base)) return 'Esse endereço do Gmail não é válido. Ele tem de 6 a 30 letras ou números (pode ter pontos).';
  }
  return '';
}
const emailOk = v => !emailErro(v, { login: true });
if (typeof module !== 'undefined') module.exports = { digits, cpfOk, cnpjOk, nomeErro, emailErro, emailOk, NOME_MSG, EMAIL_MSG };
