'use strict';
const { R, HttpError, sessionCookie } = require('../lib/http');
const S = require('../lib/security');
const V = require('../lib/validate');
const D = require('../lib/domain');
const cfg = require('../lib/config');
const { sendMail } = require('../lib/mail');
const { meJson } = require('../lib/me');
const verify = require('../lib/verify');

const checkLimit = S.limiter(60, 6e5), signupLimit = S.limiter(10, 36e5), loginIp = S.limiter(30, 9e5), loginMail = S.limiter(8, 9e5), forgotLimit = S.limiter(5, 36e5);
const EMAIL_NORM = v => String(v || '').trim().toLowerCase();

R.get('/api/me', ctx => meJson(ctx.account));

R.post('/api/auth/signup', async ctx => {
  if (!signupLimit(ctx.ip)) throw new HttpError(429, 'Muitas tentativas. Aguarde um pouco e tente de novo.');
  const b = ctx.body, E = {};
  const enc = b.obj !== 'divulgar';
  const obj = enc ? 'encontrar' : 'divulgar';
  const papel = enc ? (['Cliente', 'Aluna ou estudante', 'Profissional de beleza'].includes(b.papel) ? b.papel : 'Cliente') : '';
  const nome = V.str(b.nome, 120).replace(/\s+/g, ' '), email = EMAIL_NORM(b.email), tel = V.digits(b.tel), doc = V.digits(b.doc);
  E.nome = V.nomeErro(nome);
  if (tel.length < 10 || tel.length > 11) E.tel = 'Informe o telefone com DDD.';
  if (enc ? !V.cpfOk(doc) : !(V.cpfOk(doc) || V.cnpjOk(doc))) E.doc = enc ? 'CPF inválido. Confira os números.' : 'CPF ou CNPJ inválido. Confira os números.';
  else if (doc.length === 14) E.doc = (await verify.cnpjReceita(doc)).msg;
  E.email = V.emailErro(email) || (await verify.emailDomain(email));
  if (!E.email && D.one('SELECT 1 FROM accounts WHERE email=?', email)) E.email = 'Este e-mail já tem cadastro. Volte e entre na sua conta.';
  for (const k of ['nome', 'doc', 'email']) if (!E[k]) delete E[k];
  if (!V.senhaOk(b.senha)) E.senha = 'A senha precisa de 8 caracteres, um número e um caractere especial.';
  if (b.aceite !== true) E.aceite = 'Aceite os termos para continuar.';
  if (Object.keys(E).length) throw new HttpError(422, 'Confira os campos.', E);
  const r = D.run('INSERT INTO accounts(nome,tel,doc,email,obj,papel,pw,created_at) VALUES(?,?,?,?,?,?,?,?)',
    nome, V.maskTel(tel), doc, email, obj, papel, await S.hashPassword(b.senha), D.now());
  const t = S.createSession(Number(r.lastInsertRowid));
  ctx.setCookie(sessionCookie(t, 30 * 86400));
  return meJson(D.one('SELECT * FROM accounts WHERE id=?', Number(r.lastInsertRowid)));
});

/* Conferência de um campo enquanto a pessoa digita (sem criar nada). */
R.post('/api/validate', async ctx => {
  if (!checkLimit(ctx.ip)) throw new HttpError(429, 'Muitas conferências. Aguarde um pouco.');
  const { campo, valor } = ctx.body || {};
  if (campo === 'email') { const e = EMAIL_NORM(valor); const msg = V.emailErro(e) || (await verify.emailDomain(e)); return { ok: !msg, msg }; }
  if (campo === 'nome') { const msg = V.nomeErro(valor); return { ok: !msg, msg }; }
  if (campo === 'doc') {
    const d = V.digits(valor);
    if (d.length === 11) return V.cpfOk(d) ? { ok: true, msg: '', tipo: 'CPF' } : { ok: false, msg: 'CPF inválido. Confira os números.' };
    if (d.length === 14) {
      if (!V.cnpjOk(d)) return { ok: false, msg: 'CNPJ inválido. Confira os números.' };
      const r = await verify.cnpjReceita(d); return { ok: !r.msg, msg: r.msg, tipo: 'CNPJ', razao: r.razao || '' };
    }
    return { ok: false, msg: 'Digite os 11 números do CPF ou os 14 do CNPJ.' };
  }
  throw new HttpError(400, 'Campo inválido.');
});

R.post('/api/auth/login', async ctx => {
  const email = EMAIL_NORM(ctx.body.email), pw = typeof ctx.body.senha === 'string' ? ctx.body.senha : '';
  if (!loginIp(ctx.ip) || !loginMail(email)) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  if (!email || !pw) throw new HttpError(400, 'Informe seu e-mail e sua senha.');
  if (!V.emailOk(email)) throw new HttpError(400, 'Informe um e-mail válido.');
  const acc = D.one('SELECT * FROM accounts WHERE email=?', email);
  if (!acc) { await S.burnTime(pw); throw new HttpError(401, 'E-mail ou senha incorretos.'); }
  if (!(await S.verifyPassword(pw, acc.pw))) throw new HttpError(401, 'E-mail ou senha incorretos.');
  ctx.setCookie(sessionCookie(S.createSession(acc.id), 30 * 86400));
  return meJson(acc);
});

R.post('/api/auth/logout', ctx => {
  S.destroySession(ctx.sid);
  ctx.setCookie(sessionCookie('', 0));
  return { ok: true };
});

R.post('/api/auth/forgot', async ctx => {
  const email = EMAIL_NORM(ctx.body.email);
  if (!V.emailOk(email)) throw new HttpError(400, 'Informe um e-mail válido.');
  if (!forgotLimit(ctx.ip) || !forgotLimit('m:' + email)) throw new HttpError(429, 'Muitas tentativas. Tente de novo mais tarde.');
  const acc = D.one('SELECT * FROM accounts WHERE email=?', email);
  if (acc) {
    const t = S.token();
    D.run('DELETE FROM reset_tokens WHERE account_id=?', acc.id);
    D.run('INSERT INTO reset_tokens(token_hash,account_id,expires_at) VALUES(?,?,?)', S.sha(t), acc.id, Date.now() + 36e5);
    await sendMail({ to: acc.email, subject: 'Redefinir sua senha no Beauty Hub',
      text: `Olá, ${acc.nome.split(' ')[0]}!\n\nPara escolher uma nova senha, abra o link abaixo (vale por 1 hora):\n${cfg.baseUrl}/?reset=${t}\n\nSe não foi você, ignore este e-mail.` });
  }
  return { ok: true }; // mesma resposta exista a conta ou não
});

R.post('/api/auth/reset', async ctx => {
  const t = typeof ctx.body.token === 'string' ? ctx.body.token : '';
  if (!V.senhaOk(ctx.body.senha)) throw new HttpError(422, 'A nova senha precisa de 8 caracteres, um número e um caractere especial.');
  const row = D.one('SELECT * FROM reset_tokens WHERE token_hash=?', S.sha(t));
  if (!row || row.expires_at < Date.now()) throw new HttpError(400, 'Link inválido ou vencido. Peça um novo.');
  const pw = await S.hashPassword(ctx.body.senha);
  D.tx(() => {
    D.run('UPDATE accounts SET pw=? WHERE id=?', pw, row.account_id);
    D.run('DELETE FROM reset_tokens WHERE account_id=?', row.account_id);
    D.run('DELETE FROM sessions WHERE account_id=?', row.account_id);
  });
  return { ok: true };
});

R.post('/api/me/delete', { auth: true }, async ctx => {
  const acc = ctx.account;
  if (!(await S.verifyPassword(String(ctx.body.senha || ''), acc.pw))) throw new HttpError(403, 'Senha incorreta.');
  const s = D.one('SELECT photo FROM setups WHERE account_id=?', acc.id);
  if (s) D.removeImage(s.photo);
  D.all('SELECT file FROM photos WHERE account_id=?', acc.id).forEach(p => D.removeImage(p.file));
  D.all('SELECT photo FROM posts WHERE account_id=?', acc.id).forEach(p => D.removeImage(p.photo));
  D.run('DELETE FROM accounts WHERE id=?', acc.id); // apaga em cascata tudo da conta
  ctx.setCookie(sessionCookie('', 0));
  return { ok: true };
});
