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
  clearTimeout(toast.t);toast.t=setTimeout(()=>{b.innerHTML=''},2800);
}
const closeBtn=`<button class="x" data-close aria-label="Fechar">${ic('close')}</button>`;
function favBtn(id){const f=S.favs.includes(id);return `<button class="btn ghost" data-fav="${id}" aria-pressed="${f}">${ic('heart')} <span>${f?'Salvo nos favoritos':'Salvar nos favoritos'}</span></button>`}
const needLogin=()=>{if(!S.acc){go('entrar');return true}return false};

function openItem(id){
  if(String(id)[0]==='p')return openPro(id);
  const it=byId(id);if(!it)return;
  const facts=[];
  if(it.date||it.mod==='educacao')facts.push(['Quando',whenTxt(it)]);
  facts.push(['Local',it.city]);
  if(it.mod==='educacao')facts.push(['Educadora',it.byName],['Modalidade',it.modal],['Nível',it.nivel]);
  if(it.mod==='campeonatos')facts.push(['Inscrições',it.stxt]);
  if(it.atend)facts.push(['Atendimento',it.atend],['Envio',it.envio]);
  if(it.mod==='tecnologia')facts.push(['Marca',it.marca],['Preço de referência',BRL(it.price)]);
  if(it.mod==='network')facts.push(['Confirmados',String(it.going)],['Organização',it.byName]);
  if(it.prods&&it.prods.length)facts.push(['Produtos',it.prods.join(', ')]);
  const on=it.mod==='network'?S.joined.includes('m:'+it.id):S.interest.includes(it.id);
  const act=it.mod==='network'?`<button class="btn" data-meet="${it.id}" aria-pressed="${on}">${on?'Participação confirmada':'Quero participar'}</button>`:`<button class="btn" data-interest="${it.id}" aria-pressed="${on}">${on?'Interesse registrado':'Tenho interesse'}</button>`;
  openSheet(`${closeBtn}<div class="body"><span class="badge">${esc(badgeOf(it))}</span><h2>${esc(it.title)}</h2><p style="margin:0;color:var(--muted)">${esc(it.desc)}</p>
   <div class="facts">${facts.map(([a,b])=>`<div class="fact"><small>${a}</small>${esc(b)}</div>`).join('')}</div>
   ${(it.tags||[]).length?`<div class="tags">${it.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`:''}
   <div class="row-actions">${it.mine?'':act}${it.mine?'':`<button class="btn ghost" data-msg="${it.owner}">${ic('chat')}Falar com o responsável</button>`}${favBtn(it.id)}</div>
   <p class="note">Inscrição, compra e pagamento acontecem direto com o responsável, fora do Beauty Hub.</p></div>`);
}
async function openThread(id){
  const t=await GET('/api/threads/'+id);
  openSheet(`${closeBtn}<div class="body"><span class="tag">${esc(t.tag)}</span><h2>${esc(t.q)}</h2><small style="color:var(--muted)">${esc(t.by)} · ${ago(t.at)}</small>
   <div class="stack">${t.replies.length?t.replies.map(r=>`<div class="row-card" style="align-items:flex-start"><div class="av">${initials(r.by)}</div><div><b>${esc(r.by)}</b> <small>${ago(r.at)}</small><p style="margin:2px 0 0">${esc(r.body)}</p></div></div>`).join(''):'<p class="note">Ainda sem respostas. Seja a primeira.</p>'}</div>
   <div class="f"><label for="reply-t">Sua resposta</label><textarea id="reply-t" maxlength="1000" style="min-height:80px"></textarea></div><div class="row-actions"><button class="btn" data-reply="${t.id}">Responder</button></div></div>`);
}
const INFO={
 sobre:['Sobre o Beauty Hub','<p>O Beauty Hub conecta clientes, profissionais, educadoras, lojas, marcas, eventos e campeonatos do mercado da beleza. Começamos pelo segmento Lash e a estrutura já prevê novas categorias.</p>'],
 prof:['Para profissionais','<p>Crie seu perfil, escolha um plano e seja encontrada por clientes e parceiros. As clientes solicitam horários e mandam mensagens direto pelo Beauty Hub; o pagamento do serviço é combinado com você.</p>'],
 emp:['Para empresas','<p>Lojas, marcas, fornecedores e organizadores de eventos têm cadastro próprio, com anúncios aprovados pela equipe e destaque conforme o plano.</p>'],
 faq:['Dúvidas frequentes','<p><b>O Beauty Hub vende serviços?</b><br>Não. A plataforma divulga profissionais e empresas e organiza solicitações de horário. O pagamento dos serviços é combinado diretamente com a profissional.</p><p><b>Como funciona a aprovação?</b><br>Todo cadastro de divulgação entra em análise e só libera os recursos do plano depois de aprovado pela equipe e com o pagamento em dia.</p><p><b>Posso cancelar meu plano?</b><br>Sim, a qualquer momento. O perfil continua ativo enquanto o pagamento estiver em dia.</p><p><b>Quais planos existem?</b><br>Básico, Profissional e Premium, com cobrança mensal ou anual (2 meses grátis).</p>']
};
async function openInfo(k){
  if(INFO[k]){const [t,h]=INFO[k];openSheet(`${closeBtn}<div class="body"><h2>${t}</h2><div class="stack" style="color:var(--muted)">${h}</div></div>`);return}
  await act(async()=>{const r=await GET('/api/content/'+k);openSheet(`${closeBtn}<div class="body"><h2>${esc(r.title)}</h2><div class="stack" style="color:var(--muted)">${r.html}</div></div>`)});
}

/* ===== Cadastro de divulgação em 3 passos ===== */
const defaultPlan=()=>{const P=PLANS(),k=Object.keys(P);return k.find(x=>P[x].pop)||k[0]};
const newDraft=tipo=>({step:1,tipo:tipo||'profissional',nome:(S.setup&&S.setup.nomeProf)||(S.acc?S.acc.nome:''),descricao:(S.setup&&S.setup.bio)||'',plano:defaultPlan(),cycle:'mensal',err:{},busy:false,done:false,fresh:true});
let D=newDraft();
const fe=k=>D.err[k]?`<div class="err" role="alert">${esc(D.err[k])}</div>`:'';
function planPrice(p){return D.cycle==='mensal'?`${BRL(p.price)} <small>/mês</small>`:`${BRL(p.price*10)} <small>/ano</small>`}
function stepHTML(){
  const head=(t,l)=>`<div class="steps" aria-hidden="true">${[1,2,3].map(i=>`<i class="${i<=D.step?'on':''}"></i>`).join('')}</div><span class="eyebrow">Passo ${D.step} de 3</span><h2>${t}</h2><p class="lead">${l}</p>`;
  const back=D.step>1?`<button class="btn ghost" data-sback>Voltar</button>`:'<span></span>';
  if(D.step===1)return head('Qual é o seu perfil?','Escolha a categoria que melhor representa você ou o seu negócio.')+
   `<div class="opts">${PROFILE_TYPES.map(t=>`<button class="opt" data-tipo="${t.id}" aria-pressed="${D.tipo===t.id}">${ic(t.icon)}<b>${t.name}</b><small>${t.sub}</small></button>`).join('')}</div><div class="nav-row">${back}<button class="btn" data-snext>Continuar ${ic('arrow')}</button></div>`;
  if(D.step===2)return head('Dados do seu perfil','Como você quer aparecer no Beauty Hub.')+
   `<form class="form" novalidate><div class="f"><label for="b-np">Nome de exibição (pessoa, estúdio, loja, evento…)</label><input id="b-np" type="text" maxlength="80" data-bind="nome" value="${esc(D.nome)}">${fe('nome')}</div>
    <div class="f"><label for="b-bio">Descrição (opcional)</label><textarea id="b-bio" maxlength="500" data-bind="descricao">${esc(D.descricao)}</textarea><div class="hint"><span id="bio-n">${D.descricao.length}</span>/500</div></div>
    ${D.tipo==='profissional'||D.tipo==='palestrante'?`<p class="note">Seus serviços, horários, endereço e contatos você preenche em “Editar perfil” logo depois.</p>`:`<p class="note">Depois da aprovação você publica seus anúncios (cursos, eventos, produtos…) no seu perfil.</p>`}</form>
    <div class="nav-row">${back}<button class="btn" data-snext>Continuar ${ic('arrow')}</button></div>`;
  const P=PLANS();
  return head('Escolha seu plano','Selecione o plano ideal para o seu perfil.')+
   `<div style="display:flex;justify-content:center"><div class="seg" role="group" aria-label="Ciclo de cobrança"><button data-cycle="mensal" aria-pressed="${D.cycle==='mensal'}">Mensal</button><button data-cycle="anual" aria-pressed="${D.cycle==='anual'}">Anual<small>2 meses grátis</small></button></div></div>
    <div class="plans">${Object.entries(P).map(([k,p])=>`<div class="plan ${p.pop?'pop':''} ${D.plano===k?'sel':''}">${p.pop?'<span class="pop-t">Mais popular</span>':''}<h3>${esc(p.name)}</h3><div class="price">${planPrice(p)}</div>${D.cycle==='anual'?`<small style="color:var(--muted)">Equivale a ${BRL(p.price*10/12)} por mês</small>`:''}<ul>${benefits(p).map(b=>`<li>${ic('check')}<span>${esc(b)}</span></li>`).join('')}</ul><button class="btn ${D.plano===k?'':'ghost'}" data-plan="${k}" aria-pressed="${D.plano===k}">${D.plano===k?'Plano selecionado':'Selecionar plano'}</button></div>`).join('')}</div>
    <p style="font-size:13px;color:var(--muted);text-align:center">Seu cadastro passa por análise da equipe. Os recursos do plano são liberados após a aprovação e a confirmação do pagamento. Você pode cancelar a qualquer momento.</p>
    ${D.err.form?`<div class="err" role="alert" style="text-align:center">${esc(D.err.form)}</div>`:''}
    <div class="nav-row">${back}<button class="btn" data-sfinish ${D.busy?'disabled':''}>Concluir cadastro ${ic('check')}</button></div>`;
}
function signupPage(){
  if(S.reg){go('meu-perfil');return}
  if(D.fresh&&!D.done)D=newDraft(D.tipo);
  app().innerHTML=header('cadastro')+`<main class="wrap"><div class="su"><div class="su-card" id="su">${D.done?doneHTML():stepHTML()}</div></div></main>`+footer();
}
function doneHTML(){
  const pro=D.tipo==='profissional'||D.tipo==='palestrante';
  return `<div class="success"><div class="ok">${ic('check')}</div><h2>Cadastro enviado!</h2><p class="lead" style="max-width:420px;margin:8px auto 20px">Seu perfil está em análise. Você acompanha o status e o pagamento do plano no seu perfil.${pro?' Enquanto isso, complete seus dados profissionais para aparecer nas buscas.':''}</p><div class="row-actions" style="justify-content:center">${pro?'<button class="btn" data-go="configurar-perfil">Completar perfil profissional</button>':''}<button class="btn ${pro?'ghost':''}" data-go="meu-perfil">Acessar meu perfil</button></div></div>`;
}
function validate(){
  const e={};
  if(D.step===2&&D.nome.trim().length<2)e.nome='Informe o nome que será exibido.';
  return e;
}
function stepRender(){const c=$('#su');if(c){c.innerHTML=D.done?doneHTML():stepHTML();window.scrollTo({top:0})}}
function nextStep(){
  D.fresh=false;D.err=validate();
  if(Object.keys(D.err).length){stepRender();const first=$('.err');if(first)first.closest('.f,.ck,.form')?.querySelector('input,select,textarea')?.focus();return}
  D.step++;stepRender();
}
async function finishSignup(){
  if(D.busy)return;D.busy=true;D.err={};stepRender();
  try{
    const r=await POST('/api/registration',{tipo:D.tipo,nome:D.nome.trim(),descricao:D.descricao.trim(),plan:D.plano,cycle:D.cycle});
    S.reg=r.reg;await loadMe();D.done=true;
  }catch(e){D.err=Object.assign({form:e.message},e.fields||{})}
  D.busy=false;stepRender();
}

/* ===== Meu perfil de divulgação ===== */
let PT='sobre',MYLIST=[];
const permsNow=()=>S.reg&&S.reg.active&&S.plans[S.reg.plan]?S.plans[S.reg.plan].perms:{proc:0};
const isProTipo=()=>S.reg&&(S.reg.tipo==='profissional'||S.reg.tipo==='palestrante');
const dmy=iso=>String(iso||'').slice(0,10).split('-').reverse().join('/');
async function meuPerfil(){
  if(!S.reg){app().innerHTML=header('meu-perfil')+`<main class="wrap"><div class="empty-state mt40"><h2 style="font-size:34px;color:var(--ink)">Você ainda não divulga seu trabalho</h2><p>Faça o cadastro em 3 passos e escolha um plano para aparecer no Beauty Hub.</p><button class="btn" data-go="cadastro">Divulgar meu trabalho ${ic('arrow')}</button></div></main>`+footer();return}
  const u=S.reg,st=S.setup||{},P=PLANS()[u.plan]||{name:u.plan,price:0,perms:{}},x=permsNow(),tipo=PROFILE_TYPES.find(t=>t.id===u.tipo)||{name:u.tipo};
  const mine=await GET('/api/listings/mine');MYLIST=mine.items;
  let myposts=[];if(PT==='publicacoes'&&isProTipo()){try{myposts=(await GET('/api/me/posts')).items}catch(e){}}
  let rev=[];
  if(isProTipo()&&S.acc){try{rev=(await GET('/api/pros/p'+S.acc.id)).reviewList||[]}catch(e){}}
  const stMap={pendente:['Em análise',''],aprovado:['Aprovado','ok'],recusado:['Recusado','bad'],suspenso:['Suspenso','bad']};
  const [stT,stC]=stMap[u.status]||stMap.pendente;
  const firstWith=perm=>Object.values(PLANS()).find(p=>p.perms[perm]);
  const tabs=[['sobre','Sobre'],['anuncios','Anúncios']];
  if(isProTipo())tabs.push(['servicos','Serviços'],['avaliacoes','Avaliações'],['fotos','Fotos'],['publicacoes','Publicações']);
  tabs.push(['local','Localização']);
  if(!tabs.some(t=>t[0]===PT))PT='sobre';
  const svcAll=st.services||[],svcs=x.proc>0?svcAll.slice(0,x.proc):svcAll;
  let body='';
  if(PT==='sobre')body=`<p>${u.descricao?esc(u.descricao):'Adicione uma descrição para contar sobre o seu trabalho.'}</p>`;
  if(PT==='anuncios'){
    const okMod=TIPO_MOD[u.tipo],can=okMod&&u.status==='aprovado';
    const stl={pendente:'Em análise',aprovado:'Publicado',recusado:'Recusado'};
    body=`${okMod?`<div class="row-actions"><button class="btn sm" data-newlisting="${okMod}" ${can?'':'disabled'}>Novo ${FORMS[okMod].label}</button>${can?'':'<small style="color:var(--muted)">Disponível depois da aprovação do cadastro.</small>'}</div>`:''}
     ${MYLIST.length?`<div class="stack">${MYLIST.map(l=>`<div class="row-card"><div style="flex:1;min-width:0"><h3>${esc(l.title)}</h3><small>${MOD_NAME[l.mod]} · ${stl[l.status]||l.status}${l.hidden?' · oculto':''}${l.date?' · '+dateLabel(l):''}</small></div><button class="btn sm ghost" data-dellisting="${l.id}" aria-label="Excluir ${esc(l.title)}">${ic('trash')}</button></div>`).join('')}</div>`:`<p class="note">Você ainda não publicou anúncios.</p>`}`;
  }
  if(PT==='servicos')body=svcAll.length?`<ul class="meta" style="font-size:14.5px;gap:8px">${svcs.map(s=>`<li>${ic('check')}${esc(s.n)} · ${brl0(s.p)} · ${durTxt(s.d)}</li>`).join('')}</ul>${svcAll.length>svcs.length?`<p class="locked">${ic('lock')}O plano ${esc(P.name)} exibe até ${x.proc} procedimentos. ${svcAll.length-svcs.length} ficam ocultos.</p>`:''}<div class="row-actions"><button class="btn sm ghost" data-go="configurar-perfil">Editar serviços</button></div>`:`<p>Nenhum serviço cadastrado. <button class="linkbtn" data-go="configurar-perfil">Adicionar serviços</button></p>`;
  if(PT==='avaliacoes')body=x.avaliacoes?(rev.length?`<div class="stack">${rev.map(r=>`<div class="row-card" style="align-items:flex-start"><div class="av">${esc(initials(r.autor))}</div><div><b>${esc(r.autor)}</b> <span class="rate">${ic('star','fill')} ${r.nota}</span> <small>${ago(r.at)}</small>${r.texto?`<p style="margin:2px 0 0">${esc(r.texto)}</p>`:''}</div></div>`).join('')}</div>`:`<div class="empty-state">Ainda sem avaliações. Clientes avaliam depois de um atendimento concluído.</div>`):`<p class="locked">${ic('lock')}Avaliações de clientes estão disponíveis a partir do plano ${esc((firstWith('avaliacoes')||{}).name||'superior')}, com o plano ativo.</p>`;
  if(PT==='fotos'){
    const g=st.gallery||[],max=x.galeria?20:3;
    body=`<div class="gal">${g.map(p=>`<div><img src="${esc(p.url)}" alt="Foto do trabalho" loading="lazy"><button class="gdel" data-delphoto="${p.id}" aria-label="Remover foto">${ic('trash')}</button></div>`).join('')}${g.length<max?`<label class="gal-add">${ic('camera')}<span>Adicionar foto</span><input type="file" accept="image/jpeg,image/png,image/webp" data-galadd hidden></label>`:''}</div><p style="color:var(--muted);font-size:13px">${g.length} de ${max} fotos. ${x.galeria?'Galeria ampliada do seu plano.':'Planos com galeria liberam mais fotos.'}</p>`;
  }
  if(PT==='publicacoes')body=postsTab(myposts);
  if(PT==='local')body=st.cidade?`<p>${esc([st.rua&&(st.rua+', '+st.num),st.bairro].filter(Boolean).join(' · '))}</p><p>${esc(st.cidade)} - ${esc(st.uf)}</p><div class="row-actions"><button class="btn sm ghost" data-go="configurar-perfil">Editar endereço</button></div>`:'<p>Informe seu endereço em “Editar perfil”.</p>';
  const link=(href,label,icn)=>`<a class="btn ghost sm" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${ic(icn)}${label}</a>`;
  const waD=digits(st.wa),wa=waD?link('https://wa.me/55'+waD,'WhatsApp','chat'):'',ig=st.ig?link('https://instagram.com/'+st.ig,'Instagram','user'):'';
  const payLine=u.payOk?`Plano pago até ${dmy(u.paid_until)||'sem vencimento'}.`:u.pay_status==='pago'?'Pagamento vencido. Renove para manter os recursos do plano.':'Pagamento pendente.';
  const needsPay=!u.payOk;
  app().innerHTML=header('meu-perfil')+`<main class="wrap"><div class="pf"><div style="min-width:0">
   <div class="pf-hero">${avatarHTML(st.photo,u.nome,'lg')}<div style="flex:1;min-width:200px"><span class="status ${stC}">${stT}</span> ${S.acc&&x.selo?`<span class="verified">${ic('shield')}Verificada</span>`:''}<h1>${esc(u.nome)}</h1><p style="margin:4px 0 0;color:var(--muted)">${esc(tipo.name)}${st.cidade?' · '+esc(st.cidade)+' - '+esc(st.uf):''}</p></div></div>
   <div class="row-actions" style="margin-top:14px">${wa}${ig}${!wa&&!ig?'<small style="color:var(--muted)">Adicione seus contatos ao lado para aparecerem aqui.</small>':''}</div>
   <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${PT===k}" data-ptab="${k}">${l}${k==='avaliacoes'&&!x.avaliacoes?' '+ic('lock'):''}</button>`).join('')}</div><div class="stack">${body}</div></div>
   <aside style="min-width:0"><div class="panel"><h3>Seu plano</h3><div style="font-size:26px;font-weight:500">${esc(P.name)} <small style="font-size:14px;color:var(--muted)">${BRL(P.price)}/mês · ${u.cycle}</small></div><p class="note" style="margin:6px 0">${payLine}${u.status!=='aprovado'?' Os recursos são liberados após a aprovação.':''}</p>
    ${needsPay&&S.cfg.payments?`<button class="btn sm" data-pay>Pagar ${BRL(u.amount)} agora</button>`:needsPay?`<p class="note">A equipe confirma o pagamento e libera o plano.</p>`:''}
    <ul class="meta" style="margin:10px 0;flex-direction:column;gap:6px">${benefits(P).map(b=>`<li>${ic('check')}${esc(b)}</li>`).join('')}</ul></div>
   <div class="panel"><h3>Contatos</h3><form class="form" id="contact-form" novalidate><div class="f"><label for="c-wa">WhatsApp (com DDD)</label><input id="c-wa" type="text" inputmode="tel" value="${esc(st.wa||'')}" placeholder="(41) 99999-9999"></div><div class="f"><label for="c-ig">Instagram (usuário)</label><input id="c-ig" type="text" value="${esc(st.ig||'')}" placeholder="seuperfil"></div><div class="f"><label for="c-ag">Link de agendamento (https://…)</label><input id="c-ag" type="text" value="${esc(st.agenda||'')}" ${x.agendamento?'':'disabled'} placeholder="https://"></div>${x.agendamento?'':`<small class="locked">${ic('lock')}Disponível a partir do plano ${esc((firstWith('agendamento')||{}).name||'superior')}, com o plano ativo</small>`}<button class="btn sm" type="submit">Salvar contatos</button></form></div>
   <button class="btn ghost sm" data-delete-profile>Excluir meu cadastro de divulgação</button></aside></div></main>`+footer();
}

/* ===== Novo anúncio ===== */
function openListingForm(mod,E={},v={}){
  const F=FORMS[mod];if(!F)return;
  const val=k=>esc(v[k]==null?'':v[k]);
  const err=k=>E[k]?`<div class="err" role="alert">${esc(E[k])}</div>`:'';
  const sel=(k,label,opts)=>`<div class="f"><label for="lf-${k}">${label}</label><select id="lf-${k}"><option value="">Selecione</option>${opts.map(o=>`<option ${v[k]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>${err(k)}</div>`;
  const inp=(k,label,type='text',attrs='')=>`<div class="f"><label for="lf-${k}">${label}</label><input id="lf-${k}" type="${type}" value="${val(k)}" ${attrs}>${err(k)}</div>`;
  const today=isoDate(today_());
  openSheet(`${closeBtn}<div class="body"><h2>Novo ${F.label}</h2><form class="form" id="listing-form" data-mod="${mod}" novalidate>
   ${inp('title','Título','text','maxlength="120"')}
   <div class="f"><label for="lf-desc">Descrição</label><textarea id="lf-desc" maxlength="600" style="min-height:90px">${val('desc')}</textarea>${err('desc')}</div>
   ${sel('cat','Categoria',F.cats)}
   <div class="xrow"><div class="f" style="flex:2"><label for="lf-cidade">Cidade</label><input id="lf-cidade" type="text" value="${esc(v.cidade||(S.setup&&S.setup.cidade)||'')}">${err('cidade')}</div><div class="f" style="flex:1"><label for="lf-uf">UF</label><select id="lf-uf"><option value="">UF</option>${UFS.map(u=>`<option ${(v.uf||(S.setup&&S.setup.uf))===u?'selected':''}>${u}</option>`).join('')}</select>${err('uf')}</div></div>
   ${F.date?inp('date','Data'+(F.date==='opt'?' de início (opcional)':''),'date',`min="${today}"`):''}${F.end?inp('end','Data final (opcional)','date',`min="${today}"`):''}
   ${(F.extra||[]).map(k=>OPTS[k]?sel(k,EXTRA_LABEL[k],OPTS[k]):k==='price'?inp(k,EXTRA_LABEL[k],'number','min="0" step="0.01" inputmode="decimal"'):inp(k,EXTRA_LABEL[k])).join('')}
   ${inp('tags','Etiquetas (separe por vírgula, opcional)')}
   <p class="note">${mod==='network'?'Encontros passam por aprovação da equipe antes de aparecer.':'Seu anúncio passa por aprovação da equipe antes de aparecer.'}</p>
   <button class="btn" type="submit">Enviar para aprovação</button></form></div>`);
}
const today_=()=>new Date();
