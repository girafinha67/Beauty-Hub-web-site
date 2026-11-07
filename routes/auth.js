'use strict';
const { R, HttpError, sessionCookie } = require('../lib/http');
const S = require('../lib/security');
const V = require('../lib/validate');
const D = require('../lib/domain');
const cfg = require('../lib/config');
const { sendMail } = require('../lib/mail');
const { meJson } = require('../lib/me');

const signupLimit = S.limiter(10, 36e5), loginIp = S.limiter(30, 9e5), loginMail = S.limiter(8, 9e5), forgotLimit = S.limiter(5, 36e5);
const EMAIL_NORM = v => String(v || '').trim().toLowerCase();

R.get('/api/me', ctx => meJson(ctx.account));

R.post('/api/auth/signup', async ctx => {
  if (!signupLimit(ctx.ip)) throw new HttpError(429, 'Muitas tentativas. Aguarde um pouco e tente de novo.');
  const b = ctx.body, E = {};
  const enc = b.obj !== 'divulgar';
  const obj = enc ? 'encontrar' : 'divulgar';
  const papel = enc ? (['Cliente', 'Aluna ou estudante', 'Profissional de beleza'].includes(b.papel) ? b.papel : 'Cliente') : '';
  const nome = V.str(b.nome, 120), email = EMAIL_NORM(b.email), tel = V.digits(b.tel), doc = V.digits(b.doc);
  if (nome.split(/\s+/).filter(Boolean).length < 2 || nome.length < 5) E.nome = 'Informe seu nome completo.';
  if (tel.length < 10 || tel.length > 11) E.tel = 'Informe o telefone com DDD.';
  if (enc ? !V.cpfOk(doc) : !(V.cpfOk(doc) || V.cnpjOk(doc))) E.doc = enc ? 'CPF inválido. Confira os números.' : 'CPF ou CNPJ inválido. Confira os números.';
  if (!V.emailOk(email)) E.email = 'Informe um e-mail válido, como nome@email.com.';
  else if (D.one('SELECT 1 FROM accounts WHERE email=?', email)) E.email = 'Este e-mail já tem cadastro. Volte e entre na sua conta.';
  if (!V.senhaOk(b.senha)) E.senha = 'A senha precisa de 8 caracteres, um número e um caractere especial.';
  if (b.aceite !== true) E.aceite = 'Aceite os termos para continuar.';
  if (Object.keys(E).length) throw new HttpError(422, 'Confira os campos.', E);
  const r = D.run('INSERT INTO accounts(nome,tel,doc,email,obj,papel,pw,created_at) VALUES(?,?,?,?,?,?,?,?)',
    nome, V.maskTel(tel), doc, email, obj, papel, await S.hashPassword(b.senha), D.now());
  const t = S.createSession(Number(r.lastInsertRowid));
  ctx.setCookie(sessionCookie(t, 30 * 86400));
  return meJson(D.one('SELECT * FROM accounts WHERE id=?', Number(r.lastInsertRowid)));
});

R.post('/api/auth/login', async ctx => {
  const email = EMAIL_NORM(ctx.body.email), pw = typeof ctx.body.senha === 'string' ? ctx.body.senha : '';
  if (!loginIp(ctx.ip) || !loginMail(email)) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  if (!V.emailOk(email) || !pw) throw new HttpError(400, 'Informe seu e-mail e sua senha.');
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
  if (s) { D.removeImage(s.photo); D.removeImage(s.banner); }
  D.all('SELECT file FROM photos WHERE account_id=?', acc.id).forEach(p => D.removeImage(p.file));
  D.all('SELECT photo FROM posts WHERE account_id=?', acc.id).forEach(p => D.removeImage(p.photo));
  D.run('DELETE FROM accounts WHERE id=?', acc.id); // apaga em cascata tudo da conta
  ctx.setCookie(sessionCookie('', 0));
  return { ok: true };
});
