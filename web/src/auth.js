/* ===== Entrada: login, criação de conta e redefinição de senha (tudo no servidor) ===== */
Object.assign(ICONS,{
 mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
 phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
 idcard:'<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10.5h18M7 15h4"/>',
 eye:'<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M3 3l18 18M10.6 6.2A9.6 9.6 0 0 1 12 5.5C18.4 5.5 22 12 22 12a17 17 0 0 1-3.2 3.9M6.6 7.7A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
 chev:'<path d="m9 5 7 7-7 7"/>',
 back:'<path d="m15 5-7 7 7 7"/>',
 out:'<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>'
});
const AUTH_ROUTES=['entrar','criar-conta'];
const AU={obj:'encontrar',papel:'Cliente',nome:'',tel:'',doc:'',email:'',senha:'',aceite:false,err:{}};
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const senhaOk=v=>v.length>=8&&/\d/.test(v)&&/[^A-Za-z0-9]/.test(v);
const digits=v=>String(v||'').replace(/\D/g,'');
function cpfOk(v){
  v=digits(v);if(v.length!==11||/^(\d)\1+$/.test(v))return false;
  for(const n of [9,10]){let s=0;for(let i=0;i<n;i++)s+=+v[i]*(n+1-i);const d=(s*10)%11%10;if(d!==+v[n])return false}
  return true;
}
function cnpjOk(v){
  v=digits(v);if(v.length!==14||/^(\d)\1+$/.test(v))return false;
  for(const n of [12,13]){let s=0,p=n-7;for(let i=0;i<n;i++){s+=+v[i]*p--;if(p<2)p=9}const d=s%11<2?0:11-s%11;if(d!==+v[n])return false}
  return true;
}
const maskTel=v=>{v=digits(v).slice(0,11);return v.length>10?`(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`:v.length>6?`(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`:v.length>2?`(${v.slice(0,2)}) ${v.slice(2)}`:v};
const censorDoc=v=>{const d=String(v||'').replace(/\D/g,'');if(d.length===11)return '***.'+d.slice(3,6)+'.'+d.slice(6,9)+'-**';if(d.length===14)return '**.***.'+d.slice(5,8)+'/'+d.slice(8,12)+'-**';return d?'•'.repeat(Math.min(d.length,14)):''};
const censorMail=e=>{const [u,d]=String(e||'').split('@');if(!d)return '';const [dn,...t]=d.split('.');return u.slice(0,1)+'•••••@'+dn.slice(0,1)+'•••'+(t.length?'.'+t.join('.'):'')};
const maskDoc=(v,cnpj)=>{v=digits(v).slice(0,cnpj?14:11);
  if(v.length>11)return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/,'$1.$2.$3/$4-$5').replace(/[-/.]$/,'');
  return v.replace(/^(\d{3})(\d{0,3})(\d{0,3})(\d{0,2})$/,(m,a,b,c,d)=>a+(b?'.'+b:'')+(c?'.'+c:'')+(d?'-'+d:''))};
async function logout(){
  try{await POST('/api/auth/logout')}catch(e){}
  S={acc:null,setup:null,reg:null,favs:[],follows:[],interest:[],joined:[],counts:{notif:0,msgs:0},plans:S.plans,cfg:S.cfg,q:''};
  CACHE.clear();stopPolling();closeSheet();go('entrar');
}

/* ----- visual ----- */
const logoMark=(sm)=>`<span class="pinlogo ${sm?'sm':''}"><svg viewBox="0 0 64 52" aria-hidden="true"><text x="32" y="42" text-anchor="middle" font-family="'Cormorant Garamond',Georgia,serif" font-size="50" font-weight="300" letter-spacing="-7" fill="currentColor">BH</text></svg></span>`;
const bubbles='<i class="bubble b1"></i><i class="bubble b2"></i><i class="bubble b3"></i><i class="bubble b4"></i>';
const fld=(id,label,icon,attrs,err,extra='')=>`<div class="af"><label for="${id}">${label}</label><div class="inp ${err?'bad':''}">${ic(icon)}<input id="${id}" ${attrs}>${extra}</div>${err?`<div class="err" role="alert">${err}</div>`:''}</div>`;
const eyeBtn=`<button type="button" class="eye" data-eye aria-label="Mostrar senha">${ic('eye')}</button>`;

function loginPage(msg){
  app().innerHTML=`<div class="auth">${bubbles}<div class="auth-in">
   <div class="auth-logo">${logoMark()}<b>Beauty Hub</b><small>O ponto de encontro do mercado da beleza.</small></div>
   <h1>Entrar</h1><span class="uline"></span><p class="lead">Acesse sua conta Beauty Hub.</p>
   <form id="login-form" novalidate>
    ${fld('l-email','E-mail','mail','type="email" autocomplete="email" placeholder="seu@email.com" value="'+esc(AU.email)+'"','')}
    ${fld('l-senha','Senha','lock','type="password" autocomplete="current-password" placeholder="••••••••"','',eyeBtn)}
    <div class="forgot"><button type="button" data-auth="forgot">Esqueci minha senha</button></div>
    <div class="err formerr" id="l-err" role="alert">${msg||''}</div>
    <button class="abtn" type="submit">Entrar</button>
   </form>
   <button class="altcard" data-auth="signup"><span class="ico">${ic('user')}</span><span class="tx"><small>Não tem conta?</small><b>Crie sua conta</b></span>${ic('chev')}</button>
  </div></div>`;
}
function signupAuthPage(){
  const E=AU.err,enc=AU.obj==='encontrar';
  const opt=(k,ico,t,d)=>`<button type="button" class="objcard" data-obj="${k}" aria-pressed="${AU.obj===k}"><span class="oi">${ic(ico)}</span><span class="ot"><b>${t}</b><small>${d}</small></span><i class="radio"></i></button>`;
  app().innerHTML=`<div class="auth">${bubbles}
   <div class="auth-top"><button class="backb" data-auth="login" aria-label="Voltar para entrar">${ic('back')}</button>${logoMark(true)}<span class="sp"></span></div>
   <div class="auth-in wide">
   <h1>Crie sua conta</h1><span class="uline"></span><p class="lead">Junte-se ao Beauty Hub e conecte-se com o mercado da beleza.</p>
   <form id="signup-form" novalidate>
    <span class="cap">Qual o seu objetivo?</span>
    <div class="objs">${opt('encontrar','search','Quero encontrar','Procure profissionais, cursos, eventos e lojas.')}${opt('divulgar','star','Quero divulgar','Mostre seu trabalho ou negócio no Beauty Hub.')}</div>
    ${enc?`<span class="cap">Você é:</span><div class="inp sel"><select id="s-papel" data-au="papel" aria-label="Você é">${['Cliente','Aluna ou estudante','Profissional de beleza'].map(o=>`<option ${o===AU.papel?'selected':''}>${o}</option>`).join('')}</select>${ic('chev')}</div>`:''}
    ${fld('s-nome','Nome completo','user','type="text" data-au="nome" autocomplete="name" placeholder="Ex: Maria Silva" value="'+esc(AU.nome)+'"',E.nome)}
    ${fld('s-tel','Telefone','phone','type="tel" data-au="tel" inputmode="tel" autocomplete="tel" placeholder="Ex: (41) 99999-9999" value="'+esc(AU.tel)+'"',E.tel)}
    ${fld('s-doc',enc?'CPF':'CPF ou CNPJ','idcard','type="text" data-au="doc" inputmode="numeric" placeholder="'+(enc?'000.000.000-00':'000.000.000-00 ou 00.000.000/0000-00')+'" value="'+esc(AU.doc)+'"',E.doc)}
    ${fld('s-email','E-mail','mail','type="email" data-au="email" autocomplete="email" placeholder="nome@email.com" value="'+esc(AU.email)+'"',E.email)}
    ${fld('s-senha','Senha','lock','type="password" data-au="senha" autocomplete="new-password" placeholder="••••••••" value="'+esc(AU.senha)+'"',E.senha,eyeBtn)}
    <p class="hint">A senha deve ter no mínimo 8 caracteres, incluindo um número e um caractere especial (!@#$%...).</p>
    <label class="ck2"><input type="checkbox" data-au="aceite" ${AU.aceite?'checked':''}><span>Ao criar minha conta, eu concordo com os <button type="button" class="lk" data-info="termos">Termos de Uso</button> e a <button type="button" class="lk" data-info="priv">Política de Privacidade</button> do Beauty Hub.</span></label>
    ${E.aceite?`<div class="err" role="alert">${E.aceite}</div>`:''}
    ${E.form?`<div class="err formerr" role="alert">${esc(E.form)}</div>`:''}
    <div class="err formerr" role="alert">${E.form||''}</div>
    <button class="abtn" type="submit">Criar conta</button>
   </form></div></div>`;
}
function authPage(r){window.scrollTo(0,0);r==='criar-conta'?signupAuthPage():loginPage()}

/* ----- ações ----- */
document.addEventListener('click',e=>{
  const t=e.target;let el;
  if(el=t.closest('[data-auth]')){
    const a=el.dataset.auth;
    if(a==='signup'){AU.err={};go('criar-conta')}
    else if(a==='login'){go('entrar')}
    else if(a==='forgot'){openForgot()}
    return;
  }
  if(el=t.closest('[data-obj]')){AU.obj=el.dataset.obj;AU.err={};signupAuthPage();return}
  if(el=t.closest('[data-eye]')){const i=el.parentElement.querySelector('input'),show=i.type==='password';i.type=show?'text':'password';el.innerHTML=ic(show?'eyeoff':'eye');el.setAttribute('aria-label',show?'Ocultar senha':'Mostrar senha');return}
  if(t.closest('[data-logout]')){logout();toast('Você saiu da conta');return}
},true);
document.addEventListener('input',e=>{
  const t=e.target,k=t.dataset&&t.dataset.au;if(!k)return;
  if(k==='tel')t.value=maskTel(t.value);
  if(k==='doc')t.value=maskDoc(t.value,AU.obj==='divulgar');
  AU[k]=t.type==='checkbox'?t.checked:t.value;
  if(AU.err[k]){delete AU.err[k];const er=t.closest('.af,.ck2')?.querySelector('.err');if(er)er.remove();t.closest('.inp')?.classList.remove('bad')}
});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.au==='papel')AU.papel=t.value});

document.addEventListener('submit',async e=>{
  const f=e.target;
  if(f.id==='login-form'){
    e.preventDefault();
    const em=$('#l-email').value.trim().toLowerCase(),pw=$('#l-senha').value;AU.email=em;
    const box=$('#l-err');
    if(!emailOk(em)||!pw){box.textContent='Informe seu e-mail e sua senha.';return}
    try{applyMe(await POST('/api/auth/login',{email:em,senha:pw}))}catch(er){box.textContent=er.message;return}
    AU.senha='';toast('Bem-vinda, '+firstName()+'!');startPolling();go('home');
  }
  if(f.id==='signup-form'){
    e.preventDefault();
    const E={},enc=AU.obj==='encontrar';
    if(AU.nome.trim().split(/\s+/).filter(Boolean).length<2||AU.nome.trim().length<5)E.nome='Informe seu nome completo.';
    const tel=digits(AU.tel);if(tel.length<10||tel.length>11)E.tel='Informe o telefone com DDD.';
    if(enc?!cpfOk(AU.doc):!(cpfOk(AU.doc)||cnpjOk(AU.doc)))E.doc=enc?'CPF inválido. Confira os números.':'CPF ou CNPJ inválido. Confira os números.';
    const em=AU.email.trim().toLowerCase();
    if(!emailOk(em))E.email='Informe um e-mail válido, como nome@email.com.';
    if(!senhaOk(AU.senha))E.senha='A senha precisa de 8 caracteres, um número e um caractere especial.';
    if(!AU.aceite)E.aceite='Aceite os termos para continuar.';
    if(!Object.keys(E).length){
      try{applyMe(await POST('/api/auth/signup',{obj:AU.obj,papel:AU.papel,nome:AU.nome.trim(),tel:AU.tel,doc:AU.doc,email:em,senha:AU.senha,aceite:AU.aceite}))}
      catch(er){Object.assign(E,er.fields||{});if(!Object.keys(E).length)E.form=er.message}
    }
    AU.err=E;
    if(Object.keys(E).length){signupAuthPage();const first=$('.err');first&&first.closest('.af,.ck2')?.querySelector('input,select')?.focus();return}
    Object.assign(AU,{senha:'',aceite:false,err:{}});
    toast('Conta criada com sucesso!');startPolling();go('configurar-perfil');
  }
  if(f.id==='forgot-form'){
    e.preventDefault();
    const em=$('#fg-email').value.trim().toLowerCase(),box=$('#fg-err');
    if(!emailOk(em)){box.textContent='Informe um e-mail válido.';return}
    try{await POST('/api/auth/forgot',{email:em})}catch(er){box.textContent=er.message;return}
    AU.email=em;closeSheet();toast('Se esse e-mail tiver conta, enviamos o link para criar uma nova senha.');
  }
  if(f.id==='reset-form'){
    e.preventDefault();
    const pw=$('#rs-senha').value,box=$('#rs-err');
    if(!senhaOk(pw)){box.textContent='A nova senha precisa de 8 caracteres, um número e um caractere especial.';return}
    try{await POST('/api/auth/reset',{token:f.dataset.token,senha:pw})}catch(er){box.textContent=er.message;return}
    closeSheet();toast('Senha redefinida. Entre com a nova senha.');go('entrar');
  }
});
function openForgot(){
  openSheet(`${closeBtn}<div class="body"><h2>Redefinir senha</h2><p style="margin:0;color:var(--muted)">Informe o e-mail da conta. Enviaremos um link para você escolher uma nova senha.</p>
   <form id="forgot-form" class="form" novalidate><div class="f"><label for="fg-email">E-mail</label><input id="fg-email" type="email" autocomplete="email" value="${esc(AU.email)}"></div><div class="err" id="fg-err" role="alert" style="color:var(--bad);font-size:13px"></div><button class="btn" type="submit">Enviar link</button></form></div>`);
}
function openReset(token){
  openSheet(`${closeBtn}<div class="body"><h2>Nova senha</h2><p style="margin:0;color:var(--muted)">Escolha uma nova senha para a sua conta.</p>
   <form id="reset-form" class="form" data-token="${esc(token)}" novalidate><div class="f"><label for="rs-senha">Nova senha</label><input id="rs-senha" type="password" autocomplete="new-password"></div><p class="hint">Mínimo de 8 caracteres, com um número e um caractere especial.</p><div class="err" id="rs-err" role="alert" style="color:var(--bad);font-size:13px"></div><button class="btn" type="submit">Salvar nova senha</button></form></div>`);
}
