/* ===== Painel administrativo ===== */
const A={tab:'visao',reg:'todos'};
function regs(){
  const r=SEED_REGS.map(x=>({...x,status:S.regStatus[x.id]||x.status}));
  if(S.user)r.unshift({id:'u0',nome:S.user.nomeProf||S.user.nome,tipo:PROFILE_TYPES.find(t=>t.id===S.user.tipo).name,cidade:S.user.cidade+' - '+S.user.uf,plano:S.user.plano,data:S.user.data,status:S.user.status,own:true});
  return r;
}
function setReg(id,st){if(id==='u0'&&S.user)S.user.status=st;else S.regStatus[id]=st;save()}
const statusPill=s=>`<span class="status ${s==='aprovado'?'ok':s==='pendente'?'':'bad'}">${s[0].toUpperCase()+s.slice(1)}</span>`;
function adminPage(){
  const R=regs(),P=PLANS(),pend=R.filter(r=>r.status==='pendente').length,act=R.filter(r=>r.status==='aprovado');
  const rev=act.reduce((s,r)=>s+(P[r.plano]?P[r.plano].price:0),0);
  const tabs=[['visao','Visão geral'],['cad','Cadastros'],['cont','Conteúdo'],['planos','Planos'],['mod','Moderação']];
  let body='';
  if(A.tab==='visao'){
    body=`<div class="stats"><div class="stat"><b>${R.length}</b><small>Cadastros recebidos</small></div><div class="stat"><b>${pend}</b><small>Aguardando análise</small></div><div class="stat"><b>${act.length}</b><small>Perfis ativos</small></div><div class="stat"><b>${BRL(rev)}</b><small>Receita mensal estimada</small></div></div>`;
  }
  if(A.tab==='cad'){
    const list=R.filter(r=>A.reg==='todos'||r.status===A.reg);
    body=`<div class="chips" style="margin-bottom:16px">${['todos','pendente','aprovado','recusado','suspenso'].map(s=>`<button class="chip ${A.reg===s?'on':''}" data-areg="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}</div>
    <div class="tw"><table><thead><tr><th>Nome</th><th>Perfil</th><th>Cidade</th><th>Plano</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.map(r=>`<tr><td><b style="font-weight:500">${esc(r.nome)}</b>${r.own?' <small style="color:var(--rose)">(seu cadastro de teste)</small>':''}<br><small style="color:var(--muted)">${fd(r.data)}</small></td><td>${esc(r.tipo)}</td><td>${esc(r.cidade)}</td><td>${esc(P[r.plano]?P[r.plano].name:r.plano)}</td><td>${statusPill(r.status)}</td><td><div class="row-actions">${r.status!=='aprovado'?`<button class="btn sm" data-reg="${r.id}:aprovado">Aprovar</button>`:`<button class="btn sm ghost" data-reg="${r.id}:suspenso">Suspender</button>`}${r.status==='pendente'?`<button class="btn sm ghost" data-reg="${r.id}:recusado">Recusar</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="6" style="color:var(--muted)">Nenhum cadastro com esse status.</td></tr>'}</tbody></table></div>`;
  }
  if(A.tab==='cont'){
    const rows=Object.values(DATA).flat();
    body=`<p style="color:var(--muted);margin-top:0">Defina o que aparece em destaque e o que fica visível nas páginas públicas.</p><div class="tw"><table><thead><tr><th>Título</th><th>Módulo</th><th>Cidade</th><th>Destaque</th><th>Visível</th></tr></thead><tbody>${rows.map(i=>`<tr><td>${esc(i.title)}</td><td>${MOD_NAME[i.mod]}</td><td>${esc(i.city)}</td><td><input type="checkbox" data-afeat="${i.id}" aria-label="Destaque: ${esc(i.title)}" ${isFeat(i)?'checked':''}></td><td><input type="checkbox" data-ahide="${i.id}" aria-label="Visível: ${esc(i.title)}" ${visible(i)?'checked':''}></td></tr>`).join('')}</tbody></table></div>`;
  }
  if(A.tab==='planos'){
    body=`<p style="color:var(--muted);margin-top:0">Alterações valem para o cadastro e para os perfis, neste navegador.</p><div class="stack">${Object.entries(P).map(([k,p])=>`<div class="panel"><h3>${esc(p.name)}</h3><div class="filters" style="margin:0 0 16px"><div class="f"><label for="pp-${k}">Preço mensal (R$)</label><input id="pp-${k}" type="number" min="0" step="0.1" value="${p.price}" data-pprice="${k}"></div><div class="f"><label for="pl-${k}">Limite de procedimentos (0 = ilimitado)</label><input id="pl-${k}" type="number" min="0" step="1" value="${p.perms.proc}" data-pproc="${k}"></div></div>
     <div class="perm">${Object.entries(PERM_LABELS).map(([pk,l])=>`<label class="ck"><input type="checkbox" data-pperm="${k}:${pk}" ${p.perms[pk]?'checked':''}><span>${l}</span></label>`).join('')}</div></div>`).join('')}</div>`;
  }
  if(A.tab==='mod'){
    body=`<div class="tw"><table><thead><tr><th>Avaliação</th><th>Sobre</th><th>Nota</th><th>Status</th><th>Ações</th></tr></thead><tbody>${SEED_REVIEWS.map(v=>{const st=S.revStatus[v.id]||v.status;return `<tr><td><b style="font-weight:500">${esc(v.autor)}</b><br><small style="color:var(--muted)">${esc(v.texto)}</small></td><td>${esc(v.alvo)}</td><td>${v.nota}/5</td><td>${statusPill(st==='aprovada'?'aprovado':st==='removida'?'recusado':'pendente').replace('Aprovado','Aprovada').replace('Recusado','Removida')}</td><td><div class="row-actions">${st!=='aprovada'?`<button class="btn sm" data-rev="${v.id}:aprovada">Aprovar</button>`:''}${st!=='removida'?`<button class="btn sm ghost" data-rev="${v.id}:removida">Remover</button>`:''}</div></td></tr>`}).join('')}</tbody></table></div>`;
  }
  app().innerHTML=header('admin')+`<main class="wrap" style="padding-bottom:8px"><div class="adm-warn"><b>Protótipo.</b> Painel aberto para demonstração; os dados ficam só neste navegador. Na versão final, o acesso exige login de administrador.</div>
   <h1 class="pg-h1">Painel administrativo</h1><div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${A.tab===k}" data-atab="${k}">${l}${k==='cad'&&pend?` (${pend})`:''}</button>`).join('')}</div>${body}</main>`+footer();
}

/* ===== Roteador ===== */
const ROUTES=['home','eventos','educacao','campeonatos','lojas','marcas','tecnologia','network','mercado','radar','busca','favoritos','cadastro','meu-perfil','admin','entrar','criar-conta','configurar-perfil','agendamentos','mensagens','perfil'];
function route(){
  let r=(location.hash||'#home').slice(1);if(!ROUTES.includes(r))r='home';
  if(!S.session&&!AUTH_ROUTES.includes(r)){r='entrar';history.replaceState(null,'','#entrar')}
  if(S.session&&AUTH_ROUTES.includes(r)){r='home';history.replaceState(null,'','#home')}
  if(needSetup()&&r!=='configurar-perfil'&&!AUTH_ROUTES.includes(r)){r='configurar-perfil';history.replaceState(null,'','#configurar-perfil')}
  CUR=r;document.body.classList.toggle('appmode',!AUTH_ROUTES.includes(r));
  if(AUTH_ROUTES.includes(r)){authPage(r);document.title=(r==='entrar'?'Entrar':'Criar conta')+' | Beauty Hub';return}
  if(MODS[r])modPage(r);
  else({home:homePage,mercado:mercadoPage,network:netPage,radar:radarPage,busca:searchPage,favoritos:favPage,cadastro:signupPage,'meu-perfil':meuPerfil,admin:adminPage,'configurar-perfil':()=>setupPage(),agendamentos:agendaPage,mensagens:msgPage,perfil:perfilPage})[r]();
  const t={home:'Beauty Hub',cadastro:'Cadastro | Beauty Hub','meu-perfil':'Meu perfil | Beauty Hub',admin:'Admin | Beauty Hub',busca:'Busca | Beauty Hub',favoritos:'Favoritos | Beauty Hub',mercado:'Mercado | Beauty Hub',network:'Network | Beauty Hub',radar:'Radar | Beauty Hub','configurar-perfil':(needSetup()?'Complete seu cadastro':'Editar perfil')+' | Beauty Hub',agendamentos:'Agendamentos | Beauty Hub',mensagens:'Mensagens | Beauty Hub',perfil:'Perfil | Beauty Hub'};
  document.title=t[r]||(MOD_NAME[r]+' | Beauty Hub');
  window.scrollTo(0,0);
}
function go(r){if(location.hash==='#'+r)route();else location.hash=r}
function refreshHeader(){const h=$('.hdr');if(h)h.outerHTML=deskHeader(CUR)}
function syncFav(id){
  const f=S.favs.includes(id);
  $$(`[data-fav="${id}"]`).forEach(b=>{b.classList.toggle('on',f);b.setAttribute('aria-pressed',f);if(b.classList.contains('heart'))b.setAttribute('aria-label',f?'Remover dos favoritos':'Salvar nos favoritos');else{const s=$('span',b);if(s)s.textContent=f?'Salvo nos favoritos':'Salvar nos favoritos'}});
  refreshHeader();
}

/* ===== Eventos de interface ===== */
document.addEventListener('click',e=>{
  const t=e.target;let el;
  const pop=$('#acc-pop');
  if(t.closest('[data-acc]')){const b=t.closest('[data-acc]'),o=pop.hidden;pop.hidden=!o;b.setAttribute('aria-expanded',o);return}
  if(pop&&!pop.hidden&&!t.closest('#acc-pop'))pop.hidden=true;
  if(t.closest('[data-back]')){if(history.length>1)history.back();else go('home');return}
  if(t.id==='ov'||t.closest('[data-close]')){closeSheet();return}
  if(el=t.closest('[data-fav]')){const id=el.dataset.fav,i=S.favs.indexOf(id);if(i>=0)S.favs.splice(i,1);else S.favs.push(id);save();syncFav(id);toast(i>=0?'Removido dos favoritos':'Salvo nos favoritos');if(CUR==='favoritos'&&$('#ov').hidden)favPage();return}
  if(el=t.closest('[data-follow]')){const id=el.dataset.follow,i=S.follows.indexOf(id);if(i>=0)S.follows.splice(i,1);else S.follows.push(id);save();$$(`[data-follow="${id}"]`).forEach(b=>{b.textContent=i>=0?'Seguir':'Seguindo';b.setAttribute('aria-pressed',i<0)});toast(i>=0?'Você deixou de seguir':'Você está seguindo');return}
  if(el=t.closest('[data-meet]')){const k='m:'+el.dataset.meet,i=S.joined.indexOf(k);if(i>=0)S.joined.splice(i,1);else S.joined.push(k);save();toast(i>=0?'Participação cancelada':'Participação confirmada');if(CUR==='network')netPage();if(!$('#ov').hidden)openItem(el.dataset.meet);return}
  if(el=t.closest('[data-group]')){const k='g:'+el.dataset.group,i=S.joined.indexOf(k);if(i>=0)S.joined.splice(i,1);else S.joined.push(k);save();toast(i>=0?'Você saiu do grupo':'Você entrou no grupo');netPage();return}
  if(el=t.closest('[data-interest]')){const id=el.dataset.interest,i=S.interest.indexOf(id);if(i>=0)S.interest.splice(i,1);else S.interest.push(id);save();el.textContent=i>=0?'Tenho interesse':'Interesse registrado';el.setAttribute('aria-pressed',i<0);toast(i>=0?'Interesse removido':'Interesse registrado');return}
  if(el=t.closest('[data-thread]')){openThread(el.dataset.thread);return}
  if(el=t.closest('[data-reply]')){const id=el.dataset.reply,v=$('#reply-t').value.trim();if(!v){toast('Escreva sua resposta antes de enviar');return}(S.replies[id]=S.replies[id]||[]).push([S.user?(S.user.nomeProf||S.user.nome):'Você',v]);save();openThread(id);toast('Resposta enviada');if(CUR==='network')netPage();return}
  if(el=t.closest('[data-open]')){openItem(el.dataset.open);return}
  if(el=t.closest('[data-info]')){openInfo(el.dataset.info);return}
  if(el=t.closest('[data-signup]')){D=newDraft(el.dataset.signup);go('cadastro');return}
  if(el=t.closest('[data-go]')){closeSheet();$('#nav')?.classList.remove('open');go(el.dataset.go);return}
  if(t.closest('[data-menu]')){const n=$('#nav'),o=n.classList.toggle('open');t.closest('[data-menu]').setAttribute('aria-expanded',o);return}
  /* cadastro */
  if(el=t.closest('[data-tipo]')){D.tipo=el.dataset.tipo;stepRender();return}
  if(t.closest('[data-snext]')){nextStep();return}
  if(t.closest('[data-sback]')){D.step--;if(D.step===2)D.step=1;D.err={};stepRender();return}
  if(el=t.closest('[data-cycle]')){D.cycle=el.dataset.cycle;stepRender();return}
  if(el=t.closest('[data-plan]')){D.plano=el.dataset.plan;stepRender();return}
  if(t.closest('[data-sfinish]')){finishSignup();return}
  /* perfil */
  if(el=t.closest('[data-ptab]')){PT=el.dataset.ptab;meuPerfil();return}
  if(t.closest('[data-delete-profile]')){if(t.closest('[data-delete-profile]').dataset.sure){S.user=null;save();D=newDraft();toast('Cadastro excluído');meuPerfil()}else{const b=t.closest('[data-delete-profile]');b.dataset.sure='1';b.textContent='Toque de novo para confirmar a exclusão'}return}
  /* admin */
  if(el=t.closest('[data-atab]')){A.tab=el.dataset.atab;adminPage();return}
  if(el=t.closest('[data-areg]')){A.reg=el.dataset.areg;adminPage();return}
  if(el=t.closest('[data-reg]')){const [id,st]=el.dataset.reg.split(':');setReg(id,st);toast('Status atualizado: '+st);adminPage();return}
  if(el=t.closest('[data-rev]')){const [id,st]=el.dataset.rev.split(':');S.revStatus[id]=st;save();toast('Avaliação '+st);adminPage();return}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#ov').hidden)closeSheet();const p=$('#acc-pop');if(p)p.hidden=true}});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.bind){const k=t.dataset.bind;D[k]=t.type==='checkbox'?t.checked:t.value;if(D.err[k]){delete D.err[k];const er=t.closest('.f,.ck')?.querySelector('.err');if(er)er.remove()}if(k==='bio')$('#bio-n').textContent=t.value.length}
  if(t.dataset&&t.dataset.svc){const s=t.dataset.svc,i=D.services.indexOf(s);if(t.checked&&i<0)D.services.push(s);if(!t.checked&&i>=0)D.services.splice(i,1);D.err.services&&(delete D.err.services,$('.err')?.remove())}
  if(t.id==='svc-q'){const q=norm(t.value);$$('#svc [data-s]').forEach(l=>{l.hidden=q&&!l.dataset.s.includes(q)})}
});
document.addEventListener('change',e=>{
  const t=e.target,d=t.dataset||{};
  if(d.bind==='uf'){D.uf=t.value;D.cidade=STATES[D.uf][0];stepRender();return}
  if(d.afeat){S.feat[d.afeat]=t.checked;save();toast('Destaque atualizado');return}
  if(d.ahide){S.hidden[d.ahide]=!t.checked;save();toast(t.checked?'Item visível':'Item oculto nas páginas públicas');return}
  if(d.pprice||d.pproc||d.pperm){
    const P=PLANS();
    if(d.pprice){const n=parseFloat(t.value);if(!(n>=0)){toast('Informe um preço válido');return}P[d.pprice].price=n}
    if(d.pproc){const n=parseInt(t.value,10);if(!(n>=0)){toast('Informe um limite válido');return}P[d.pproc].perms.proc=n}
    if(d.pperm){const [pk,perm]=d.pperm.split(':');P[pk].perms[perm]=t.checked}
    S.plans=P;save();toast('Plano atualizado');
  }
});
document.addEventListener('submit',e=>{
  const f=e.target;e.preventDefault();
  if(f.id==='q-form'){S.q=$('#q').value.trim();save();if(CUR==='busca')searchPage();else go('busca');return}
  if(f.id==='contact-form'){
    const wa=$('#c-wa').value.replace(/\D/g,''),ig=$('#c-ig').value.trim().replace(/^@/,''),ag=$('#c-ag').value.trim();
    if(wa&&(wa.length<10||wa.length>11)){toast('WhatsApp: informe DDD e número, só com números');return}
    if(ig&&!/^[A-Za-z0-9._]{1,30}$/.test(ig)){toast('Instagram: use só letras, números, ponto e sublinhado');return}
    if(ag&&!/^https:\/\/[^\s]+$/.test(ag)){toast('Link de agendamento: use um endereço começando com https://');return}
    S.user.wa=wa?'55'+wa:'';S.user.ig=ig;if(!$('#c-ag').disabled)S.user.agenda=ag;save();toast('Contatos salvos');meuPerfil();
  }
});
addEventListener('hashchange',route);
/* Trocou de celular para computador (ou o contrário): refaz a página no layout certo, sem perder o que foi digitado. */
MQ.addEventListener('change',()=>{
  setDev();
  if(AUTH_ROUTES.includes(CUR))return;
  const y=scrollY;
  if(CUR==='configurar-perfil'&&P)setupPage(true);else route();
  scrollTo(0,y);
});
document.addEventListener('DOMContentLoaded',route);
if(document.readyState!=='loading')route();
