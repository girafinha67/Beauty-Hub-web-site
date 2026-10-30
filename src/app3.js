/* ===== Janelas, avisos e detalhes ===== */
let lastFocus=null,CUR='home';
function openSheet(html){
  const o=$('#ov');lastFocus=document.activeElement;
  o.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-label="Detalhes" tabindex="-1">${html}</div>`;
  o.hidden=false;$('.sheet',o).focus();
}
function closeSheet(){const o=$('#ov');o.hidden=true;o.innerHTML='';if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}}
function toast(msg){
  const b=$('#toast');b.innerHTML=`<div class="toast">${esc(msg)}</div>`;
  clearTimeout(toast.t);toast.t=setTimeout(()=>{b.innerHTML=''},2400);
}
const closeBtn=`<button class="x" data-close aria-label="Fechar">${ic('close')}</button>`;
function favBtn(id){const f=S.favs.includes(id);return `<button class="btn ghost" data-fav="${id}" aria-pressed="${f}">${ic('heart')} <span>${f?'Salvo nos favoritos':'Salvar nos favoritos'}</span></button>`}
function openItem(id){
  const it=byId(id);if(!it)return;
  if(it.tipo){
    const f=S.follows.includes(it.id);
    openSheet(`${closeBtn}<div class="body"><div class="mini"><div class="av lg">${initials(it.name)}</div><div class="grow"><h2 style="padding:0">${esc(it.name)}</h2><small>${esc(it.role)}${it.verified?` · <span class="verified">${ic('shield')}Verificada</span>`:''}</small></div></div>
     <span class="rate">${ic('star','fill')} ${rateTxt(it)} <span>(${it.reviews} avaliações)</span></span>
     <p style="margin:0;color:var(--muted)">${esc(it.bio)}</p><div class="facts"><div class="fact"><small>Cidade</small>${esc(it.city)}</div><div class="fact"><small>Especialidades</small>${esc(it.tags.join(', '))}</div></div>
     <div class="row-actions"><button class="btn" data-follow="${it.id}" aria-pressed="${f}">${f?'Seguindo':'Seguir'}</button>${favBtn(it.id)}</div></div>`);
    return;
  }
  const facts=[];
  if(it.date||it.mod==='educacao')facts.push(['Quando',whenTxt(it)]);
  facts.push(['Local',it.city]);
  if(it.mod==='educacao')facts.push(['Educadora',it.byName],['Nível',it.nivel]);
  if(it.mod==='campeonatos')facts.push(['Inscrições',it.status]);
  if(it.atend)facts.push(['Atendimento',it.atend],['Envio',it.envio]);
  if(it.mod==='tecnologia')facts.push(['Marca',it.marca],['Preço de referência',BRL(it.price)]);
  if(it.mod==='network')facts.push(['Confirmados','+'+(it.going+(S.joined.includes('m:'+it.id)?1:0))]);
  const act=it.mod==='network'?`<button class="btn" data-meet="${it.id}" aria-pressed="${S.joined.includes('m:'+it.id)}">${S.joined.includes('m:'+it.id)?'Participação confirmada':'Quero participar'}</button>`:`<button class="btn" data-interest="${it.id}" aria-pressed="${S.interest.includes(it.id)}">${S.interest.includes(it.id)?'Interesse registrado':'Tenho interesse'}</button>`;
  openSheet(`${closeBtn}<div class="body"><span class="badge">${esc(badgeOf(it))}</span><h2>${esc(it.title)}</h2><p style="margin:0;color:var(--muted)">${esc(it.desc)}</p>
   <div class="facts">${facts.map(([a,b])=>`<div class="fact"><small>${a}</small>${esc(b)}</div>`).join('')}</div>
   ${(it.tags||[]).length?`<div class="tags">${it.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`:''}
   <div class="row-actions">${act}${favBtn(it.id)}</div>
   <p class="note">Inscrição, compra e agendamento acontecem direto com o responsável, fora do Beauty Hub.</p></div>`);
}
function openThread(id){
  const t=THREADS.find(x=>x.id===id),extra=S.replies[id]||[];
  openSheet(`${closeBtn}<div class="body"><span class="tag">${t.tag}</span><h2>${esc(t.q)}</h2><small style="color:var(--muted)">${esc(t.by)} · ${t.when}</small>
   <div class="stack">${[...t.replies,...extra].map(([a,b])=>`<div class="row-card" style="align-items:flex-start"><div class="av">${initials(a)}</div><div><b>${esc(a)}</b><p style="margin:2px 0 0">${esc(b)}</p></div></div>`).join('')}</div>
   <div class="f"><label for="reply-t">Sua resposta</label><textarea id="reply-t" style="min-height:80px"></textarea></div><div class="row-actions"><button class="btn" data-reply="${id}">Responder</button></div></div>`);
}
const INFO={
 sobre:['Sobre o Beauty Hub','<p>O Beauty Hub conecta profissionais, educadoras, lojas, marcas, eventos e campeonatos do mercado da beleza. Começamos pelo segmento Lash e a estrutura já prevê novas categorias.</p>'],
 prof:['Para profissionais','<p>Crie seu perfil, escolha um plano e seja encontrada por clientes e parceiros. Os contatos e agendamentos acontecem fora da plataforma, no seu WhatsApp, Instagram ou link de agendamento.</p>'],
 emp:['Para empresas','<p>Lojas, marcas, fornecedores e organizadores de eventos têm cadastro próprio, com página, mapa e destaque conforme o plano.</p>'],
 contato:['Contato','<p>O canal de contato oficial será definido pelo cliente antes da publicação.</p>'],
 faq:['Dúvidas frequentes','<p><b>O Beauty Hub vende serviços?</b><br>Não. A plataforma divulga profissionais e empresas. Contratação e pagamento dos serviços acontecem fora dela.</p><p><b>Como funciona a aprovação?</b><br>Todo cadastro entra em análise e só fica visível depois de aprovado pela equipe.</p><p><b>Posso cancelar meu plano?</b><br>Sim, a qualquer momento. O perfil continua ativo enquanto o pagamento estiver em dia.</p><p><b>Quais planos existem?</b><br>Básico, Profissional e Premium, com cobrança mensal ou anual (2 meses grátis).</p>'],
 termos:['Termos de uso','<p>Texto jurídico a ser fornecido e revisado antes da publicação.</p>'],
 priv:['Política de privacidade','<p>Texto jurídico a ser fornecido e revisado antes da publicação. Neste protótipo, os dados ficam salvos apenas no seu navegador.</p>']
};
function openInfo(k){const [t,h]=INFO[k];openSheet(`${closeBtn}<div class="body"><h2>${t}</h2><div class="stack" style="color:var(--muted)">${h}</div></div>`)}

/* ===== Cadastro em 5 passos ===== */
const acc0=()=>S.accounts.find(a=>a.id===S.session)||{};
const newDraft=tipo=>({step:1,tipo:tipo||'profissional',nome:acc0().nome||'',email:acc0().email||'',senha:'',aceite:true,nomeProf:'',spec:'',bio:'',uf:'PR',cidade:'Curitiba',soBairro:true,services:[],plano:'profissional',cycle:'mensal',err:{},done:false});
let D=newDraft();
const fe=k=>D.err[k]?`<div class="err" role="alert">${D.err[k]}</div>`:'';
function planPrice(p){return D.cycle==='mensal'?`${BRL(p.price)} <small>/mês</small>`:`${BRL(p.price*10)} <small>/ano</small>`}
function stepHTML(){
  const shown=D.step>2?D.step-1:D.step;
  const head=(t,l)=>`<div class="steps" aria-hidden="true">${[1,2,3,4].map(i=>`<i class="${i<=shown?'on':''}"></i>`).join('')}</div><span class="eyebrow">Passo ${shown} de 4</span><h2>${t}</h2><p class="lead">${l}</p>`;
  const back=D.step>1?`<button class="btn ghost" data-sback>Voltar</button>`:'<span></span>';
  if(D.step===1)return head('Qual é o seu perfil?','Escolha a categoria que melhor representa você ou o seu negócio.')+
   `<div class="opts">${PROFILE_TYPES.map(t=>`<button class="opt" data-tipo="${t.id}" aria-pressed="${D.tipo===t.id}">${ic(t.icon)}<b>${t.name}</b><small>${t.sub}</small></button>`).join('')}</div><div class="nav-row">${back}<button class="btn" data-snext>Continuar ${ic('arrow')}</button></div>`;
  if(D.step===2)return head('Crie sua conta','Preencha seus dados para continuar.')+
   `<form class="form" id="su-form" novalidate><div class="f"><label for="b-nome">Nome completo</label><input id="b-nome" type="text" data-bind="nome" autocomplete="name" value="${esc(D.nome)}">${fe('nome')}</div>
    <div class="f"><label for="b-email">E-mail</label><input id="b-email" type="email" data-bind="email" autocomplete="email" value="${esc(D.email)}">${fe('email')}</div>
    <div class="f"><label for="b-senha">Senha (mínimo 8 caracteres)</label><input id="b-senha" type="password" data-bind="senha" autocomplete="new-password" value="${esc(D.senha)}">${fe('senha')}</div>
    <label class="ck"><input type="checkbox" data-bind="aceite" ${D.aceite?'checked':''}><span>Li e concordo com os <button type="button" class="linkbtn" style="text-transform:none;letter-spacing:0;font-size:13.5px;text-decoration:underline" data-info="termos">Termos de Uso</button> e a <button type="button" class="linkbtn" style="text-transform:none;letter-spacing:0;font-size:13.5px;text-decoration:underline" data-info="priv">Política de Privacidade</button>.</span></label>${fe('aceite')}</form>
    <div class="nav-row">${back}<button class="btn" data-snext>Continuar ${ic('arrow')}</button></div>`;
  if(D.step===3)return head('Dados do seu perfil','Agora conte mais sobre você e o seu trabalho.')+
   `<form class="form" novalidate><div class="f"><label for="b-np">Nome profissional (como será exibido)</label><input id="b-np" type="text" data-bind="nomeProf" value="${esc(D.nomeProf)}">${fe('nomeProf')}</div>
    <div class="f"><label for="b-spec">Especialidade principal</label><select id="b-spec" data-bind="spec"><option value="">Selecione</option>${SPECIALTIES.map(s=>`<option ${s===D.spec?'selected':''}>${s}</option>`).join('')}</select>${fe('spec')}</div>
    <div class="f"><label for="b-bio">Bio (fale um pouco sobre você)</label><textarea id="b-bio" maxlength="500" data-bind="bio">${esc(D.bio)}</textarea><div class="hint"><span id="bio-n">${D.bio.length}</span>/500</div></div>
    <div class="f"><label for="b-uf">Localização de atendimento</label><div class="row-actions"><select id="b-uf" data-bind="uf" style="flex:1;min-width:110px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:11px">${Object.keys(STATES).map(s=>`<option ${s===D.uf?'selected':''}>${s}</option>`).join('')}</select><select id="b-cid" aria-label="Cidade" data-bind="cidade" style="flex:2;min-width:150px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:11px">${STATES[D.uf].map(c=>`<option ${c===D.cidade?'selected':''}>${c}</option>`).join('')}</select></div>${fe('cidade')}</div>
    <label class="ck"><input type="checkbox" data-bind="soBairro" ${D.soBairro?'checked':''}><span>Exibir apenas a região ou bairro, sem endereço completo.</span></label></form>
    <div class="nav-row">${back}<button class="btn" data-snext>Continuar ${ic('arrow')}</button></div>`;
  if(D.step===4)return head('Selecione seus serviços','Marque os procedimentos que você realiza.')+
   `<div class="form" style="max-width:none"><div class="search" style="box-shadow:none;margin-top:0;max-width:420px">${ic('search')}<input id="svc-q" type="search" placeholder="Buscar procedimento…" aria-label="Buscar procedimento"></div>${fe('services')}
    <div class="svc" id="svc">${Object.entries(SERVICES).map(([g,l],_,all)=>`${all.length>1?`<h4>${g}</h4>`:''}${l.map(s=>`<label class="ck" data-s="${esc(norm(s))}"><input type="checkbox" data-svc="${esc(s)}" ${D.services.includes(s)?'checked':''}><span>${s}</span></label>`).join('')}`).join('')}</div></div>
    <div class="nav-row">${back}<button class="btn" data-snext>Continuar ${ic('arrow')}</button></div>`;
  const P=PLANS(),lim=P[D.plano].perms.proc;
  return head('Escolha seu plano','Selecione o plano ideal para ter seu perfil ativo.')+
   `<div style="display:flex;justify-content:center"><div class="seg" role="group" aria-label="Ciclo de cobrança"><button data-cycle="mensal" aria-pressed="${D.cycle==='mensal'}">Mensal</button><button data-cycle="anual" aria-pressed="${D.cycle==='anual'}">Anual<small>2 meses grátis</small></button></div></div>
    <div class="plans">${Object.entries(P).map(([k,p])=>`<div class="plan ${p.pop?'pop':''} ${D.plano===k?'sel':''}">${p.pop?'<span class="pop-t">Mais popular</span>':''}<h3>${esc(p.name)}</h3><div class="price">${planPrice(p)}</div>${D.cycle==='anual'?`<small style="color:var(--muted)">Equivale a ${BRL(p.price*10/12)} por mês</small>`:''}<ul>${benefits(p).map(b=>`<li>${ic('check')}<span>${esc(b)}</span></li>`).join('')}</ul><button class="btn ${D.plano===k?'':'ghost'}" data-plan="${k}" aria-pressed="${D.plano===k}">${D.plano===k?'Plano selecionado':'Selecionar plano'}</button></div>`).join('')}</div>
    ${lim>0&&D.services.length>lim?`<p style="color:var(--warn);font-size:13.5px">Você marcou ${D.services.length} procedimentos e o plano ${esc(P[D.plano].name)} exibe até ${lim}. Escolha outro plano ou reduza a lista.</p>`:''}
    <p style="font-size:13px;color:var(--muted);text-align:center">Você poderá cancelar a sua assinatura a qualquer momento. Seu perfil permanece ativo enquanto o pagamento estiver em dia. A cobrança automática será ativada na versão final, com o meio de pagamento escolhido.</p>
    <div class="nav-row">${back}<button class="btn" data-sfinish>Concluir cadastro ${ic('check')}</button></div>`;
}
function signupPage(){
  app().innerHTML=header('cadastro')+`<main class="wrap"><div class="su"><div class="su-card" id="su">${D.done?doneHTML():stepHTML()}</div></div></main>`+footer();
}
function doneHTML(){return `<div class="success"><div class="ok">${ic('check')}</div><h2>Cadastro realizado com sucesso!</h2><p class="lead" style="max-width:420px;margin:8px auto 20px">Seu perfil está em análise e em breve estará ativo no Beauty Hub. Você acompanha o status no seu perfil.</p><div class="row-actions" style="justify-content:center"><button class="btn" data-go="meu-perfil">Acessar meu perfil</button><button class="btn ghost" data-go="home">Voltar para o início</button></div></div>`}
function validate(){
  const e={},v=s=>String(s||'').trim();
  if(D.step===2){
    if(v(D.nome).length<3)e.nome='Informe seu nome completo.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v(D.email)))e.email='Informe um e-mail válido, como nome@email.com.';
    if(D.senha.length<8)e.senha='A senha precisa ter pelo menos 8 caracteres.';
    if(!D.aceite)e.aceite='Aceite os termos para continuar.';
  }
  if(D.step===3){
    if(v(D.nomeProf).length<2)e.nomeProf='Informe o nome que será exibido no perfil.';
    if(!D.spec)e.spec='Escolha sua especialidade principal.';
    if(!D.cidade)e.cidade='Escolha a cidade.';
  }
  if(D.step===4&&D.tipo==='profissional'&&!D.services.length)e.services='Marque ao menos um procedimento.';
  return e;
}
function stepRender(){const c=$('#su');if(c){c.innerHTML=D.done?doneHTML():stepHTML();window.scrollTo({top:0})}}
function nextStep(){
  D.err=validate();
  if(Object.keys(D.err).length){stepRender();const first=$('.err');if(first)first.closest('.f,.ck,.form')?.querySelector('input,select,textarea')?.focus();return}
  D.step++;if(D.step===2)D.step=3;stepRender();
}
function finishSignup(){
  const lim=PLANS()[D.plano].perms.proc;
  S.user={tipo:D.tipo,nome:D.nome.trim(),email:D.email.trim(),nomeProf:D.nomeProf.trim(),spec:D.spec,bio:D.bio.trim(),uf:D.uf,cidade:D.cidade,soBairro:D.soBairro,services:D.services.slice(),plano:D.plano,cycle:D.cycle,status:'pendente',data:new Date().toISOString().slice(0,10),wa:'',ig:'',agenda:''};
  save();D.done=true;D.senha='';stepRender();
}

/* ===== Meu perfil ===== */
let PT='sobre';
function meuPerfil(){
  const u=S.user;
  if(!u){app().innerHTML=header('meu-perfil')+`<main class="wrap"><div class="empty-state" style="margin-top:40px"><h2 style="font-size:34px;color:var(--ink)">Você ainda não tem um perfil</h2><p>Faça o cadastro em 4 passos e escolha um plano para aparecer no Beauty Hub.</p><button class="btn" data-go="cadastro">Criar meu perfil ${ic('arrow')}</button></div></main>`+footer();return}
  const P=PLANS()[u.plano],x=P.perms,tipo=PROFILE_TYPES.find(t=>t.id===u.tipo);
  const stMap={pendente:['Em análise',''],aprovado:['Aprovado','ok'],recusado:['Recusado','bad'],suspenso:['Suspenso','bad']};
  const [stT,stC]=stMap[u.status]||stMap.pendente;
  const svcs=x.proc>0?u.services.slice(0,x.proc):u.services;
  const firstWith=perm=>Object.values(PLANS()).find(p=>p.perms[perm]);
  const tabs=[['sobre','Sobre'],['servicos','Serviços'],['avaliacoes','Avaliações'],['fotos','Fotos'],['local','Localização']];
  let body='';
  if(PT==='sobre')body=`<p>${u.bio?esc(u.bio):'Adicione uma bio para contar sobre o seu trabalho. Você poderá editar depois.'}</p><div class="tags">${svcs.slice(0,6).map(s=>`<span class="tag">${esc(s)}</span>`).join('')}</div>`;
  if(PT==='servicos')body=svcs.length?`<ul class="meta" style="font-size:14.5px;gap:8px">${svcs.map(s=>`<li>${ic('check')}${esc(s)}</li>`).join('')}</ul>${u.services.length>svcs.length?`<p class="locked">${ic('lock')}O plano ${esc(P.name)} exibe até ${x.proc} procedimentos. ${u.services.length-svcs.length} ficam ocultos.</p>`:''}`:'<p>Nenhum procedimento marcado.</p>';
  if(PT==='avaliacoes')body=x.avaliacoes?`<div class="empty-state">Ainda sem avaliações. Depois da aprovação, clientes poderão avaliar o seu trabalho.</div>`:`<p class="locked">${ic('lock')}Avaliações de clientes estão disponíveis a partir do plano ${esc(firstWith('avaliacoes').name)}.</p>`;
  if(PT==='fotos')body=`<div class="thumbs">${Array.from({length:x.galeria?6:3},()=>`<div>${ic('eyel')}</div>`).join('')}</div><p style="color:var(--muted);font-size:13px">${x.galeria?'Galeria de fotos e vídeos.':'Fotos do seu trabalho.'} O envio de arquivos entra na etapa de armazenamento de mídia do projeto.</p>`;
  if(PT==='local')body=`<p>${esc(u.cidade)} - ${esc(u.uf)}</p><p style="color:var(--muted)">${u.soBairro?'Exibindo apenas a região ou bairro, sem endereço completo.':'Endereço completo será exibido no perfil.'}</p>`;
  const link=(href,label,icn)=>`<a class="btn ghost sm" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${ic(icn)}${label}</a>`;
  const wa=u.wa?link('https://wa.me/'+u.wa,'WhatsApp','chat'):'',ig=u.ig?link('https://instagram.com/'+u.ig,'Instagram','user'):'',ag=x.agendamento&&u.agenda?link(u.agenda,'Agendar','cal'):'';
  app().innerHTML=header('meu-perfil')+`<main class="wrap"><div class="pf"><div style="min-width:0">
   <div class="pf-hero"><div class="av lg">${initials(u.nomeProf||u.nome)}</div><div style="flex:1;min-width:200px"><span class="status ${stC}">${stT}</span> ${x.selo&&u.status==='aprovado'?`<span class="verified">${ic('shield')}Verificada</span>`:''}<h1>${esc(u.nomeProf||u.nome)}</h1><p style="margin:4px 0 0;color:var(--muted)">${esc(u.spec)} · ${esc(tipo.name)} · ${esc(u.cidade)} - ${esc(u.uf)}</p></div></div>
   <div class="row-actions" style="margin-top:14px">${wa}${ig}${ag}${!wa&&!ig&&!ag?'<small style="color:var(--muted)">Adicione seus contatos ao lado para aparecerem aqui.</small>':''}</div>
   <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${PT===k}" data-ptab="${k}">${l}${k==='avaliacoes'&&!x.avaliacoes?' '+ic('lock'):''}</button>`).join('')}</div><div class="stack">${body}</div></div>
   <aside style="min-width:0"><div class="panel"><h3>Seu plano</h3><div style="font-size:26px;font-weight:500">${esc(P.name)} <small style="font-size:14px;color:var(--muted)">${BRL(P.price)}/mês · ${u.cycle}</small></div><ul class="meta" style="margin:10px 0;flex-direction:column;gap:6px">${benefits(P).map(b=>`<li>${ic('check')}${esc(b)}</li>`).join('')}</ul></div>
   <div class="panel"><h3>Contatos</h3><form class="form" id="contact-form" novalidate><div class="f"><label for="c-wa">WhatsApp (com DDD)</label><input id="c-wa" type="text" inputmode="tel" value="${esc(u.wa?u.wa.replace(/^55/,''):'')}" placeholder="41999999999"></div><div class="f"><label for="c-ig">Instagram (usuário)</label><input id="c-ig" type="text" value="${esc(u.ig)}" placeholder="seuperfil"></div><div class="f"><label for="c-ag">Link de agendamento (https://…)</label><input id="c-ag" type="text" value="${esc(u.agenda)}" ${x.agendamento?'':'disabled'} placeholder="https://"></div>${x.agendamento?'':`<small class="locked">${ic('lock')}Disponível a partir do plano ${esc(firstWith('agendamento').name)}</small>`}<button class="btn sm" type="submit">Salvar contatos</button></form></div>
   <button class="btn ghost sm" data-delete-profile>Excluir meu cadastro</button></aside></div></main>`+footer();
}
