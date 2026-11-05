/* ===== Painel administrativo (exige conta administradora; os dados vêm do servidor) ===== */
const A={tab:'visao',reg:'todos'};
const statusPill=s=>`<span class="status ${s==='aprovado'||s==='aprovada'||s==='pago'||s==='isento'?'ok':s==='pendente'||s==='aguardando'?'':'bad'}">${esc(s[0].toUpperCase()+s.slice(1))}</span>`;
async function adminPage(){
  const tabs=[['visao','Visão geral'],['cad','Cadastros'],['cont','Conteúdo'],['planos','Planos'],['mod','Moderação']];
  let body='',pend=0;
  const ov=await GET('/api/admin/overview');pend=ov.pending+ov.listingsPending;
  if(A.tab==='visao'){
    body=`<div class="stats"><div class="stat"><b>${ov.accounts}</b><small>Contas criadas</small></div><div class="stat"><b>${ov.regs}</b><small>Cadastros de divulgação</small></div><div class="stat"><b>${ov.pending}</b><small>Cadastros aguardando análise</small></div><div class="stat"><b>${ov.listingsPending}</b><small>Anúncios aguardando aprovação</small></div><div class="stat"><b>${ov.active}</b><small>Perfis com plano ativo</small></div><div class="stat"><b>${BRL(ov.revenue)}</b><small>Receita mensal dos planos pagos</small></div></div>`;
  }
  if(A.tab==='cad'){
    const list=(await GET('/api/admin/registrations?status='+A.reg)).items;
    body=`<div class="chips" style="margin-bottom:16px">${['todos','pendente','aprovado','recusado','suspenso'].map(s=>`<button class="chip ${A.reg===s?'on':''}" data-areg="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}</div>
    <div class="tw"><table><thead><tr><th>Nome</th><th>Perfil</th><th>Cidade</th><th>Plano</th><th>Pagamento</th><th>Selo</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.map(r=>{
      const pl=S.plans[r.plan]||{name:r.plan},tp=(PROFILE_TYPES.find(t=>t.id===r.tipo)||{}).name||r.tipo;
      return `<tr><td><b style="font-weight:500">${esc(r.nome)}</b><br><small style="color:var(--muted)">${esc(r.owner)} · ${esc(r.email)} · ${esc(r.tel)}</small></td><td>${esc(tp)}</td><td>${esc(r.cidade||'—')}</td><td>${esc(pl.name)}<br><small style="color:var(--muted)">${r.cycle}</small></td>
       <td>${statusPill(r.pay_status==='pago'&&!r.payOk?'vencido':r.pay_status)}${r.pay_status==='pago'&&r.paid_until?`<br><small style="color:var(--muted)">até ${dmy(r.paid_until)}</small>`:''}<br><button class="btn sm ghost" data-regpay="${r.id}:pago">Confirmar pagamento</button> <button class="btn sm ghost" data-regpay="${r.id}:isento">Isentar</button></td>
       <td><label class="ck"><input type="checkbox" data-averify="${r.id}" ${r.verified?'checked':''}><span>Verificada</span></label></td><td>${statusPill(r.status)}</td>
       <td><div class="row-actions"><button class="btn sm" data-reg="${r.id}:aprovado">Aprovar</button><button class="btn sm ghost" data-reg="${r.id}:recusado">Recusar</button><button class="btn sm ghost" data-reg="${r.id}:suspenso">Suspender</button></div></td></tr>`}).join('')||'<tr><td colspan="8" style="text-align:center;color:var(--muted)">Nenhum cadastro neste filtro.</td></tr>'}</tbody></table></div>`;
  }
  if(A.tab==='cont'){
    const rows=(await GET('/api/admin/listings')).items;
    body=`<p style="color:var(--muted);margin-top:0">Aprove anúncios novos e defina o que aparece em destaque ou oculto nas páginas públicas.</p><div class="tw"><table><thead><tr><th>Título</th><th>Módulo</th><th>Responsável</th><th>Status</th><th>Destaque</th><th>Visível</th><th>Ações</th></tr></thead><tbody>${rows.map(i=>`<tr><td><b style="font-weight:500">${esc(i.title)}</b><br><small style="color:var(--muted)">${esc(i.city)}</small></td><td>${MOD_NAME[i.mod]||i.mod}</td><td>${esc(i.owner)}</td><td>${statusPill(i.status)}</td>
      <td><input type="checkbox" data-afeat="${i.id}" ${i.featured?'checked':''} aria-label="Destaque"></td><td><input type="checkbox" data-ahide="${i.id}" ${i.hidden?'':'checked'} aria-label="Visível"></td>
      <td><div class="row-actions"><button class="btn sm" data-lst="${i.id}:aprovado">Aprovar</button><button class="btn sm ghost" data-lst="${i.id}:recusado">Recusar</button><button class="btn sm ghost" data-dellisting="${i.id}" aria-label="Excluir">${ic('trash')}</button></div></td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--muted)">Nenhum anúncio ainda.</td></tr>'}</tbody></table></div>`;
  }
  if(A.tab==='planos'){
    const P=(await GET('/api/admin/plans')).plans;S.plans=P;
    body=`<p style="color:var(--muted);margin-top:0">As alterações valem para o cadastro e para todos os perfis. Procedimentos: 0 significa ilimitado.</p><div class="stack">${Object.entries(P).map(([k,p])=>`<div class="panel" data-plan-panel="${k}"><h3>${esc(p.name)}</h3><div class="filters" style="margin:0 0 16px"><div class="f"><label for="pp-${k}">Preço mensal (R$)</label><input id="pp-${k}" type="number" min="0" step="0.01" value="${p.price}" data-pplan="${k}"></div><div class="f"><label for="pc-${k}">Limite de procedimentos</label><input id="pc-${k}" type="number" min="0" step="1" value="${p.perms.proc}" data-pplan="${k}"></div></div>
     <div class="perm">${Object.entries(PERM_LABELS).map(([pk,l])=>`<label class="ck"><input type="checkbox" data-pplan="${k}" data-pperm="${pk}" ${p.perms[pk]?'checked':''}><span>${l}</span></label>`).join('')}</div></div>`).join('')}</div>`;
  }
  if(A.tab==='mod'){
    const rv=(await GET('/api/admin/reviews')).items,th=(await GET('/api/admin/threads')).items;
    body=`<h2 style="font-size:28px">Avaliações</h2><div class="tw"><table><thead><tr><th>Avaliação</th><th>Sobre</th><th>Nota</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rv.map(v=>`<tr><td><b style="font-weight:500">${esc(v.autor)}</b><br><small style="color:var(--muted)">${esc(v.texto||'Sem comentário')}</small></td><td>${esc(v.alvo)}</td><td>${v.nota}</td><td>${statusPill(v.status)}</td><td><div class="row-actions">${v.status==='aprovada'?`<button class="btn sm ghost" data-rev="${v.id}:removida">Remover</button>`:`<button class="btn sm" data-rev="${v.id}:aprovada">Restaurar</button>`}</div></td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--muted)">Nenhuma avaliação ainda.</td></tr>'}</tbody></table></div>
    <h2 style="font-size:28px;margin-top:32px">Conversas do Network</h2><div class="tw"><table><thead><tr><th>Pergunta</th><th>Autor</th><th>Ação</th></tr></thead><tbody>${th.map(t=>`<tr><td>${esc(t.question)}<br><small style="color:var(--muted)">${esc(t.tag)} · ${ago(t.created_at)}</small></td><td>${esc(t.autor)}</td><td><button class="btn sm ghost" data-delthread="${t.id}">${ic('trash')}Excluir</button></td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--muted)">Nenhuma conversa.</td></tr>'}</tbody></table></div>`;
  }
  if(A.tab==='mod'){const ps=(await GET('/api/admin/posts')).items;body+=`<h2 style="font-size:28px;margin-top:32px">Publicações</h2><div class="tw"><table><thead><tr><th>Publicação</th><th>Autora</th><th>Ação</th></tr></thead><tbody>${ps.map(x=>`<tr><td>${esc(x.texto||'(só foto)')}${x.photo?` <a href="${esc(x.photo)}" target="_blank" rel="noopener">foto</a>`:''}<br><small style="color:var(--muted)">${ago(x.created_at)}</small></td><td>${esc(x.autor)}</td><td><button class="btn sm ghost" data-adelpost="${x.id}">${ic('trash')}Excluir</button></td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--muted)">Nenhuma publicação.</td></tr>'}</tbody></table></div>`}
  app().innerHTML=header('admin')+`<main class="wrap" style="padding-bottom:8px"><h1 class="pg-h1">Painel administrativo</h1><div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${A.tab===k}" data-atab="${k}">${l}${(k==='cad'&&ov.pending)||(k==='cont'&&ov.listingsPending)?` (${k==='cad'?ov.pending:ov.listingsPending})`:''}</button>`).join('')}</div>${body}</main>`+footer();
}

/* ===== Roteador ===== */
const ROUTES=['home','eventos','educacao','campeonatos','lojas','marcas','tecnologia','network','mercado','radar','busca','favoritos','cadastro','meu-perfil','admin','entrar','criar-conta','configurar-perfil','agendamentos','mensagens','perfil','profissional'];
let routeSeq=0;
async function route(){
  const seq=++routeSeq;
  let [r,arg]=(location.hash||'#home').slice(1).split('/');if(!ROUTES.includes(r))r='home';if(r==='profissional'&&!/^p\d+$/.test(arg||''))r='home';
  const redir=to=>{r=to;history.replaceState(null,'','#'+to)};
  if(!S.acc&&!AUTH_ROUTES.includes(r))redir('entrar');
  if(S.acc&&AUTH_ROUTES.includes(r))redir('home');
  if(S.acc&&needSetup()&&r!=='configurar-perfil'&&!AUTH_ROUTES.includes(r))redir('configurar-perfil');
  if(r==='admin'&&!isAdmin())redir('home');
  if(r!=='mensagens')MSG.cur=null;
  CUR=r;document.body.classList.toggle('appmode',!AUTH_ROUTES.includes(r));
  if(AUTH_ROUTES.includes(r)){authPage(r);document.title=(r==='entrar'?'Entrar':'Criar conta')+' | Beauty Hub';return}
  const pages={home:homePage,mercado:mercadoPage,network:netPage,radar:radarPage,busca:searchPage,favoritos:favPage,cadastro:signupPage,'meu-perfil':meuPerfil,admin:adminPage,'configurar-perfil':()=>setupPage(),agendamentos:agendaPage,mensagens:msgPage,perfil:perfilPage,profissional:()=>proPage(arg)};
  try{await (MODS[r]?modPage(r):pages[r]())}
  catch(e){
    if(seq!==routeSeq||e.status===401)return;
    app().innerHTML=header(r)+`<main class="wrap"><div class="empty-state mt40"><p>${esc(e.message||'Não foi possível carregar.')}</p><button class="btn" data-retry>Tentar de novo</button></div></main>`+footer();
  }
  if(seq!==routeSeq)return;
  const t={home:'Beauty Hub',cadastro:'Cadastro | Beauty Hub','meu-perfil':'Meu perfil | Beauty Hub',admin:'Admin | Beauty Hub',busca:'Busca | Beauty Hub',favoritos:'Favoritos | Beauty Hub',mercado:'Mercado | Beauty Hub',network:'Network | Beauty Hub',radar:'Radar | Beauty Hub','configurar-perfil':(needSetup()?'Complete seu cadastro':'Editar perfil')+' | Beauty Hub',agendamentos:'Agendamentos | Beauty Hub',mensagens:'Mensagens | Beauty Hub',perfil:'Meu perfil | Beauty Hub',profissional:'Perfil | Beauty Hub'};
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
const reloadHere=()=>route();

/* ===== Eventos de interface ===== */
document.addEventListener('click',e=>{
  const t=e.target;let el;
  const pop=$('#acc-pop');
  if(t.closest('[data-acc]')){const b=t.closest('[data-acc]'),o=pop.hidden;pop.hidden=!o;b.setAttribute('aria-expanded',o);return}
  if(pop&&!pop.hidden&&!t.closest('#acc-pop'))pop.hidden=true;
  if(t.closest('[data-reload]')){location.reload();return}
  if(t.closest('[data-retry]')){route();return}
  if(t.closest('[data-logout]')){logout();return}
  if(t.closest('[data-back]')){if(history.length>1)history.back();else go('home');return}
  if(t.id==='ov'||t.closest('[data-close]')){closeSheet();return}
  if(el=t.closest('[data-fav]')){if(needLogin())return;const id=el.dataset.fav;act(async()=>{const r=await POST('/api/favorites/toggle',{ref:id});if(r.on)S.favs.push(id);else S.favs=S.favs.filter(x=>x!==id);syncFav(id);toast(r.on?'Salvo nos favoritos':'Removido dos favoritos');if(CUR==='favoritos'&&$('#ov').hidden)favPage()});return}
  if(el=t.closest('[data-follow]')){const id=el.dataset.follow;act(async()=>{const r=await POST('/api/follows/toggle',{pro:id});if(r.on)S.follows.push(id);else S.follows=S.follows.filter(x=>x!==id);$$(`[data-follow="${id}"]`).forEach(b=>{b.textContent=r.on?'Seguindo':'Seguir';b.setAttribute('aria-pressed',r.on)});toast(r.on?'Você começou a seguir':'Você deixou de seguir')});return}
  if(el=t.closest('[data-meet]')){const id=el.dataset.meet;act(async()=>{const r=await POST(`/api/listings/${id}/interest`),k='m:'+id;S.joined=S.joined.filter(x=>x!==k);if(r.on)S.joined.push(k);toast(r.on?'Participação confirmada':'Participação cancelada');if(CUR==='network')netPage();if(!$('#ov').hidden){const it=byId(id);if(it)it.going=r.count;openItem(id)}});return}
  if(el=t.closest('[data-group]')){const id=el.dataset.group;act(async()=>{const r=await POST(`/api/groups/${id}/join`),k='g:'+id;S.joined=S.joined.filter(x=>x!==k);if(r.on)S.joined.push(k);toast(r.on?'Você entrou no grupo':'Você saiu do grupo');netPage()});return}
  if(el=t.closest('[data-interest]')){const id=el.dataset.interest;act(async()=>{const r=await POST(`/api/listings/${id}/interest`);S.interest=S.interest.filter(x=>x!==id);if(r.on)S.interest.push(id);el.textContent=r.on?'Interesse registrado':'Tenho interesse';el.setAttribute('aria-pressed',r.on);toast(r.on?'Interesse registrado':'Interesse removido')});return}
  if(el=t.closest('[data-thread]')){act(()=>openThread(el.dataset.thread));return}
  if(el=t.closest('[data-reply]')){const id=el.dataset.reply,v=$('#reply-t').value.trim();if(!v){toast('Escreva sua resposta antes de enviar');return}act(async()=>{await POST(`/api/threads/${id}/replies`,{body:v});await openThread(id);toast('Resposta enviada');if(CUR==='network')netPage()});return}
  if(t.closest('[data-newthread]')){if(needLogin())return;openSheet(`${closeBtn}<div class="body"><h2>Nova pergunta</h2><form class="form" id="thread-form" novalidate><div class="f"><label for="nt-q">Sua pergunta</label><textarea id="nt-q" maxlength="200" style="min-height:80px"></textarea></div><div class="f"><label for="nt-tag">Assunto</label><select id="nt-tag">${THREAD_TAGS.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="err" id="nt-err" role="alert" style="color:var(--bad);font-size:13px"></div><button class="btn" type="submit">Publicar</button></form></div>`);return}
  if(t.closest('[data-newgroup]')){if(needLogin())return;openSheet(`${closeBtn}<div class="body"><h2>Criar grupo</h2><form class="form" id="group-form" novalidate><div class="f"><label for="ng-n">Nome do grupo</label><input id="ng-n" type="text" maxlength="60"></div><div class="err" id="ng-err" role="alert" style="color:var(--bad);font-size:13px"></div><button class="btn" type="submit">Criar grupo</button></form></div>`);return}
  if(el=t.closest('[data-newlisting]')){if(needLogin())return;openListingForm(el.dataset.newlisting);return}
  if(el=t.closest('[data-dellisting]')){if(!el.dataset.sure){el.dataset.sure='1';el.innerHTML='Confirmar?';return}act(async()=>{await POST(`/api/listings/${el.dataset.dellisting}/delete`);toast('Anúncio excluído');route()});return}
  if(el=t.closest('[data-open]')){openItem(el.dataset.open);return}
  if(el=t.closest('[data-info]')){openInfo(el.dataset.info);return}
  if(el=t.closest('[data-signup]')){
    const tp=el.dataset.signup;if(needLogin())return;
    if(S.reg){const mod=TIPO_MOD[S.reg.tipo];if(S.reg.tipo===tp&&mod&&S.reg.status==='aprovado'){openListingForm(mod);return}go('meu-perfil');return}
    D=newDraft(tp);go('cadastro');return}
  if(el=t.closest('[data-msg]')){startConv(+el.dataset.msg);return}
  if(el=t.closest('[data-conv]')){MSG.cur=+el.dataset.conv;route();return}
  if(t.closest('[data-convback]')){MSG.cur=null;route();return}
  if(el=t.closest('[data-aact]')){const [id,st]=el.dataset.aact.split(':');act(async()=>{await PATCH('/api/appointments/'+id,{status:st});toast('Agendamento atualizado');agendaPage();refreshCounters()});return}
  if(el=t.closest('[data-review]')){openReview(+el.dataset.review);return}
  if(el=t.closest('[data-star]')){REV.nota=+el.dataset.star;paintStars();return}
  if(t.closest('[data-sendreview]')){if(!REV.nota){$('#rv-err').textContent='Escolha uma nota de 1 a 5 estrelas.';return}act(async()=>{await POST(`/api/appointments/${REV.id}/review`,{nota:REV.nota,texto:$('#rv-t').value});closeSheet();toast('Avaliação enviada. Obrigada!');agendaPage()});return}
  if(t.closest('[data-pay]')){act(async()=>{const r=await POST('/api/registration/pay');location.href=r.url});return}
  if(el=t.closest('[data-go]')){closeSheet();$('#nav')?.classList.remove('open');go(el.dataset.go);return}
  if(t.closest('[data-menu]')){const n=$('#nav'),o=n.classList.toggle('open');t.closest('[data-menu]').setAttribute('aria-expanded',o);return}
  /* cadastro */
  if(el=t.closest('[data-tipo]')){D.tipo=el.dataset.tipo;stepRender();return}
  if(t.closest('[data-snext]')){nextStep();return}
  if(t.closest('[data-sback]')){D.step--;D.err={};stepRender();return}
  if(el=t.closest('[data-cycle]')){D.cycle=el.dataset.cycle;stepRender();return}
  if(el=t.closest('[data-plan]')){D.plano=el.dataset.plan;stepRender();return}
  if(t.closest('[data-sfinish]')){finishSignup();return}
  /* perfil */
  if(el=t.closest('[data-ptab]')){PT=el.dataset.ptab;meuPerfil();return}
  if(el=t.closest('[data-delphoto]')){act(async()=>{await DEL('/api/me/gallery/'+el.dataset.delphoto);await loadMe();toast('Foto removida');meuPerfil()});return}
  if(t.closest('[data-delete-profile]')){const b=t.closest('[data-delete-profile]');if(b.dataset.sure){act(async()=>{await POST('/api/registration/delete');await loadMe();D=newDraft();toast('Cadastro excluído');meuPerfil()})}else{b.dataset.sure='1';b.textContent='Toque de novo para confirmar a exclusão'}return}
  if(t.closest('[data-delaccount]')){openSheet(`${closeBtn}<div class="body"><h2>Excluir minha conta</h2><p style="margin:0;color:var(--muted)">Isso apaga seus dados, agendamentos, mensagens e anúncios, e não pode ser desfeito. Confirme com a sua senha.</p><form class="form" id="delete-form" novalidate><div class="f"><label for="dl-s">Senha</label><input id="dl-s" type="password" autocomplete="current-password"></div><div class="err" id="dl-err" role="alert" style="color:var(--bad);font-size:13px"></div><button class="btn" type="submit">Excluir definitivamente</button></form></div>`);return}
  /* admin */
  if(el=t.closest('[data-atab]')){A.tab=el.dataset.atab;adminPage();return}
  if(el=t.closest('[data-areg]')){A.reg=el.dataset.areg;adminPage();return}
  if(el=t.closest('[data-reg]')){const [id,st]=el.dataset.reg.split(':');act(async()=>{await PATCH('/api/admin/registrations/'+id,{status:st});toast('Status atualizado: '+st);adminPage()});return}
  if(el=t.closest('[data-regpay]')){const [id,st]=el.dataset.regpay.split(':');act(async()=>{await PATCH('/api/admin/registrations/'+id,{pay_status:st});toast('Pagamento atualizado');adminPage()});return}
  if(el=t.closest('[data-lst]')){const [id,st]=el.dataset.lst.split(':');act(async()=>{await PATCH('/api/admin/listings/'+id,{status:st});toast('Anúncio '+st);adminPage()});return}
  if(el=t.closest('[data-rev]')){const [id,st]=el.dataset.rev.split(':');act(async()=>{await PATCH('/api/admin/reviews/'+id,{status:st});toast('Avaliação '+st);adminPage()});return}
  if(el=t.closest('[data-delthread]')){act(async()=>{await POST(`/api/admin/threads/${el.dataset.delthread}/delete`);toast('Conversa excluída');adminPage()});return}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#ov').hidden)closeSheet();const p=$('#acc-pop');if(p)p.hidden=true}});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.bind){const k=t.dataset.bind;D.fresh=false;D[k]=t.type==='checkbox'?t.checked:t.value;if(D.err[k]){delete D.err[k];const er=t.closest('.f,.ck')?.querySelector('.err');if(er)er.remove()}if(k==='descricao')$('#bio-n').textContent=t.value.length}
});
document.addEventListener('change',e=>{
  const t=e.target,d=t.dataset||{};
  if(d.afeat){act(async()=>{await PATCH('/api/admin/listings/'+d.afeat,{featured:t.checked});toast('Destaque atualizado')});return}
  if(d.ahide){act(async()=>{await PATCH('/api/admin/listings/'+d.ahide,{hidden:!t.checked});toast(t.checked?'Item visível':'Item oculto nas páginas públicas')});return}
  if(d.averify){act(async()=>{await PATCH('/api/admin/registrations/'+d.averify,{verified:t.checked});toast(t.checked?'Perfil verificado':'Verificação removida')});return}
  if(d.pplan){
    const k=d.pplan,box=t.closest('[data-plan-panel]'),perms={proc:parseInt($('#pc-'+k).value,10)};
    $$('[data-pperm]',box).forEach(c=>perms[c.dataset.pperm]=c.checked);
    act(async()=>{const r=await PUT('/api/admin/plans/'+k,{price:parseFloat($('#pp-'+k).value),perms});S.plans=r.plans;toast('Plano atualizado')});
    return;
  }
  if(t.type==='file'&&d.galadd!==undefined){
    const f=t.files[0];if(!f)return;if(!/^image\//.test(f.type)){toast('Escolha uma imagem');return}
    const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
      const sc=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      c.toBlob(b=>act(async()=>{await API('POST','/api/me/gallery',b,true);await loadMe();toast('Foto adicionada');meuPerfil()}),'image/jpeg',.85)};
      im.onerror=()=>toast('Não consegui abrir essa imagem');im.src=r.result};r.readAsDataURL(f);t.value='';
  }
});
document.addEventListener('submit',e=>{
  const f=e.target;
  if(f.id==='login-form'||f.id==='signup-form'||f.id==='forgot-form'||f.id==='reset-form')return; /* tratados em auth.js */
  e.preventDefault();
  if(f.id==='q-form'){S.q=$('#q').value.trim();if(CUR==='busca')searchPage();else go('busca');return}
  if(f.id==='contact-form'){
    act(async()=>{try{S.setup=await PUT('/api/me/contacts',{wa:$('#c-wa').value,ig:$('#c-ig').value,agenda:$('#c-ag').disabled?'':$('#c-ag').value});toast('Contatos salvos');meuPerfil()}catch(er){const m=Object.values(er.fields||{})[0];toast(m||er.message)}});return}
  if(f.id==='thread-form'){const q=$('#nt-q').value.trim();act(async()=>{try{const r=await POST('/api/threads',{q,tag:$('#nt-tag').value});closeSheet();toast('Pergunta publicada');netPage()}catch(er){$('#nt-err').textContent=er.message}});return}
  if(f.id==='group-form'){const n=$('#ng-n').value.trim();act(async()=>{try{await POST('/api/groups',{name:n});closeSheet();toast('Grupo criado');netPage();await loadMe()}catch(er){$('#ng-err').textContent=er.message}});return}
  if(f.id==='msg-form'){const ta=$('#msg-t'),v=ta.value.trim();if(!v)return;ta.value='';act(async()=>{await POST(`/api/conversations/${MSG.cur}/messages`,{body:v});await pollThread()});return}
  if(f.id==='delete-form'){const pw=$('#dl-s').value;act(async()=>{try{await POST('/api/me/delete',{senha:pw});closeSheet();S.acc=null;S.setup=null;S.reg=null;stopPolling();toast('Conta excluída');go('entrar')}catch(er){$('#dl-err').textContent=er.message}});return}
  if(f.id==='listing-form'){
    const mod=f.dataset.mod,F=FORMS[mod],g=k=>{const x=$('#lf-'+k);return x?x.value.trim():''};
    const body={mod,title:g('title'),desc:g('desc'),cat:g('cat'),cidade:g('cidade'),uf:g('uf'),date:g('date'),end:g('end'),tags:g('tags')};
    (F.extra||[]).forEach(k=>body[k]=g(k));
    act(async()=>{try{const r=await POST('/api/listings',body);closeSheet();toast(r.status==='aprovado'?'Publicado!':'Enviado para aprovação da equipe');if(CUR==='meu-perfil'||CUR==='network'||MODS[CUR])route()}catch(er){if(er.fields&&Object.keys(er.fields).length)openListingForm(mod,er.fields,body);else toast(er.message)}});
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

/* ===== Início: pergunta ao servidor quem está logado e só então desenha a tela ===== */
async function boot(){
  const qs=new URLSearchParams(location.search);let resetToken=null,payId=null;
  if(qs.get('reset'))resetToken=qs.get('reset');
  if(qs.get('checkout')==='return')payId=qs.get('payment_id')||qs.get('collection_id');
  if(qs.has('reset')||qs.has('checkout'))history.replaceState(null,'',location.pathname+location.hash);
  try{await loadMe()}catch(e){app().innerHTML=`<main class="wrap"><div class="empty-state mt40"><p>${esc(e.message)}</p><button class="btn" data-reload>Tentar de novo</button></div></main>`;return}
  if(S.acc){startPolling();if(payId&&S.reg)await act(async()=>{const r=await POST('/api/payments/confirm',{payment_id:payId});S.reg=r.reg;toast(r.reg.payOk?'Pagamento confirmado!':'Pagamento em processamento. Avisaremos quando for confirmado.')})}
  await route();
  if(resetToken)openReset(resetToken);
}
boot();
