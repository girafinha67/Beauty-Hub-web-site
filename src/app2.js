/* ===== Estrutura: cabeçalho, rodapé, topo das páginas =====
   As páginas têm um só conteúdo e duas "cascas": computador (site, menu no topo) e celular (app, barra inferior).
   header() abre a casca e footer() fecha. O que fica no meio é o mesmo e se ajusta por CSS. */
const app=()=>$('#app');
const TAB_OF={home:'home',agendamentos:'agendamentos',mensagens:'mensagens',perfil:'perfil'};
let SHELL='',SHELLBAR=true;
function header(route,o={}){SHELL=route;SHELLBAR=!o.nobar;return DESK()?deskHeader(route,o):mobHeader(route,o)}

function deskHeader(route,o={}){
  if(o.nobar||needSetup())return `<header class="hdr"><div class="wrap">${brand()}<div class="hdr-r"><button class="btn sm" data-logout>Sair da conta</button></div></div></header>`;
  const cur=NAV_OF[route]||'',a=myAcc()||{},nm=firstName()||'Conta';
  const items=[['perfil','Meu perfil','user'],['agendamentos','Agendamentos','cal'],['mensagens','Mensagens','chat'],['favoritos','Favoritos','heart'],[S.user?'meu-perfil':'cadastro',S.user?'Meu plano e divulgação':'Criar perfil profissional','star']];
  return `<header class="hdr"><div class="wrap">${brand()}
   <nav class="nav" id="nav" aria-label="Principal">${NAV.map(([r,l])=>`<button data-go="${r}" ${cur===r?'aria-current="page"':''}>${l}</button>`).join('')}</nav>
   <div class="hdr-r">
    <button class="ib" data-go="favoritos" aria-label="Favoritos">${ic('heart')}${S.favs.length?`<span class="cnt">${S.favs.length}</span>`:''}</button>
    <div class="acc"><button class="accb" data-acc aria-haspopup="true" aria-expanded="false"><span class="av">${esc(initials(a.nome||nm))}</span><span class="nm">${esc(nm)}</span>${ic('chev')}</button>
     <div class="pop" id="acc-pop" hidden>${items.map(([r,t,i])=>`<button data-go="${r}">${ic(i)}<span>${t}</span></button>`).join('')}<hr><button data-logout class="out">${ic('out')}<span>Sair da conta</span></button></div></div>
   </div></div></header>`;
}
function mobHeader(route,o={}){
  const main=TAB_OF[route]!==undefined,setup=route==='configurar-perfil';
  const bar=main
   ?`${logoRow()}<div class="ap-act"><button class="ib" data-xnotif aria-label="Notificações">${ic('bell')}</button><button class="ib" data-xmore aria-label="Mais opções">${ic('dots')}</button></div>`
   :`<button class="ap-back" ${setup?'data-xback':'data-back'} aria-label="${setup&&needSetup()?'Sair da conta':'Voltar'}">${ic('back')}</button>${logoRow()}<span class="ap-sp"></span>`;
  return `<div class="app ${o.nobar?'nobar':''}"><header class="ap-top ${main?'home':''}">${bar}</header>`;
}

const LEGAL=[['Sobre','sobre'],['Dúvidas frequentes','faq'],['Termos de uso','termos'],['Privacidade','priv'],['Contato','contato']];
function deskFooter(){
  const L=([t,k])=>`<li><button data-info="${k}">${t}</button></li>`;
  return `<footer class="ftr"><div class="wrap"><div class="ftr-row">${brand()}
   <ul class="ftr-links">${LEGAL.map(L).join('')}<li><button data-go="admin">Painel administrativo</button></li></ul></div>
   <p class="legal">© 2026 Beauty Hub · Protótipo com dados fictícios.</p></div></footer>`;
}
function mobLegal(){
  return `<footer class="m-legal"><ul>${LEGAL.map(([t,k])=>`<li><button data-info="${k}">${t}</button></li>`).join('')}<li><button data-go="admin">Painel administrativo</button></li></ul><p class="legal">© 2026 Beauty Hub · Protótipo com dados fictícios.</p></footer>`;
}
function footer(){
  if(DESK())return deskFooter();
  const main=TAB_OF[SHELL]!==undefined;
  return `${main||!SHELLBAR?'':mobLegal()}${SHELLBAR?tabbar(TAB_OF[SHELL]||''):''}</div>`;
}

function deskHero({title,sub,search,q,ph,home}){
  return `<section class="hero ${home?'home':''}">${home?lashArc():''}<div class="wrap">
   <h1>${title}</h1><p class="sub">${sub}</p>
   ${search?`<form class="search" id="q-form" role="search">${ic('search')}<input id="q" type="search" placeholder="${esc(ph||'Buscar no Beauty Hub')}" value="${esc(q||'')}" aria-label="Buscar"><button class="btn sm" type="submit">Buscar</button></form>`:''}
   ${home?`<div class="hero-act"><button class="btn" data-go="${S.user?'meu-perfil':'cadastro'}">${S.user?'Meu perfil':'Criar meu perfil'} ${ic('arrow')}</button><button class="btn ghost" data-go="network">Conhecer a comunidade</button></div>`:''}
  </div></section>`;
}
function mobHero({title,sub,search,q,ph}){
  return `<h1 class="ap-title">${title}</h1>${sub?`<p class="ap-sub">${sub}</p>`:''}${search?`<form class="ap-search" id="q-form" role="search">${ic('search')}<input id="q" type="search" placeholder="${esc(ph||'Buscar no Beauty Hub')}" value="${esc(q||'')}" aria-label="Buscar"><button class="fl" type="submit" aria-label="Buscar">${ic('arrow')}</button></form>`:''}`;
}
const hero=o=>DESK()?deskHero(o):mobHero(o);
function ctaBand(c){
  return `<section class="cta"><div><h3>${c.title}</h3><p>${c.text}</p></div><button class="btn" data-signup="${c.tipo}">${c.btn} ${ic('arrow')}</button></section>`;
}
function secH(t,link){return `<div class="sec-h"><h2>${t}</h2>${link||''}</div>`}
const tile=(k,desc)=>`<button class="mod" data-go="${k}"><span class="ico">${ic(MOD_ICON[k])}</span><h3>${MOD_NAME[k]}</h3><small>${desc}</small></button>`;
const empty=t=>`<div class="empty-state">${t}</div>`;

/* ===== Páginas de módulo ===== */
function modPage(k){
  const M=MODS[k],items=DATA[k].filter(visible);
  app().innerHTML=header(k)+hero({title:M.title,sub:M.sub})+
  `<main class="wrap"><div class="list">${items.length?items.map(card).join(''):empty('Nada publicado aqui por enquanto.')}</div>${ctaBand(M.cta)}</main>`+footer();
}
function mercadoPage(){
  const ks=['lojas','marcas','tecnologia','campeonatos'];
  app().innerHTML=header('mercado')+hero({title:'Mercado',sub:'Lojas, marcas, tecnologia e campeonatos reunidos em um só lugar.'})+
  `<main class="wrap"><div class="mod-grid mt40">${ks.map(k=>tile(k,MODS[k].sub)).join('')}</div></main>`+footer();
}

/* ===== Busca, favoritos, radar ===== */
function resultsBlock(items,pros){
  const groups=Object.keys(DATA).map(k=>[k,items.filter(i=>i.mod===k)]).filter(g=>g[1].length);
  const mt=items.filter(i=>i.mod==='network');
  let h='';
  groups.forEach(([k,l])=>h+=`${secH(MOD_NAME[k])}<div class="grid">${l.map(card).join('')}</div>`);
  if(mt.length)h+=`${secH('Meetups')}<div class="grid">${mt.map(card).join('')}</div>`;
  if(pros.length)h+=`${secH('Profissionais')}<div class="grid">${pros.map(proCard).join('')}</div>`;
  return h;
}
function searchPage(){
  const q=S.q||'',words=norm(q).split(/\s+/).filter(Boolean);
  const items=words.length?ALL.filter(visible).filter(i=>words.every(w=>hay(i).includes(w))):[];
  const pros=words.length?PROS.filter(p=>words.every(w=>hay(p).includes(w))):[];
  app().innerHTML=header('busca')+hero({title:'Busca',sub:q?`Resultados para “${esc(q)}”`:'Digite um termo para buscar.',search:true,q})+
  `<main class="wrap">${items.length+pros.length?resultsBlock(items,pros):`<div class="mt40">${empty(q?'Nada encontrado. Tente outra palavra, como uma técnica ou o nome de uma cidade.':'Use o campo acima para buscar em todo o Beauty Hub.')}</div>`}</main>`+footer();
}
function favPage(){
  const items=S.favs.map(byId).filter(x=>x&&x.mod);const pros=S.favs.map(byId).filter(x=>x&&x.tipo);
  app().innerHTML=header('favoritos')+hero({title:'Favoritos',sub:'O que você salvou para consultar depois.'})+
  `<main class="wrap">${items.length+pros.length?resultsBlock(items,pros):`<div class="mt40">${empty('Você ainda não salvou nada. Toque no coração de um curso, evento, loja ou perfil para guardar aqui.')}</div>`}</main>`+footer();
}
function radarPage(){
  const rows=ALL.filter(i=>i.date&&visible(i)&&daysTo(i.end||i.date)>=0).sort((a,b)=>a.date.localeCompare(b.date));
  app().innerHTML=header('radar')+hero({title:'Radar',sub:'O que vem por aí: eventos, cursos, campeonatos e encontros, em ordem de data.'})+
  `<main class="wrap"><div class="stack mt40 narrow">${rows.length?rows.map(i=>{const d=pd(i.date);return `<div class="row-card" data-open="${i.id}" style="cursor:pointer"><div class="dt"><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div><div style="flex:1;min-width:0"><h3>${esc(i.title)}</h3><small>${MOD_NAME[i.mod]} · ${esc(i.city)} · ${inDays(i.date)}</small></div><button class="btn sm ghost" data-open="${i.id}">Ver</button></div>`}).join(''):empty('Nenhuma data por enquanto.')}</div></main>`+footer();
}

/* ===== Network ===== */
function netPage(){
  const m=MEET.filter(visible)[0],g=GROUPS[0],t=THREADS[0],j=S.joined.includes('g:'+g.id),mj=m&&S.joined.includes('m:'+m.id);
  app().innerHTML=header('network')+hero({title:'Network',sub:'Conecte-se com profissionais, participe de encontros e troque experiências.'})+
  `<main class="wrap">
   ${secH('Comunidade')}<div class="grid">${proCard(PROS[0])}${m?`<article class="card" data-open="${m.id}"><span class="badge">${m.cat}</span><h3><button data-open="${m.id}">${esc(m.title)}</button></h3><p>${esc(m.desc)}</p><ul class="meta"><li>${ic('cal')}${fd(m.date)}</li><li>${ic('pin')}${esc(m.city)}</li></ul><div class="card-f"><small style="color:var(--muted)">+${m.going+(mj?1:0)} confirmados</small><button class="btn sm" data-meet="${m.id}" aria-pressed="${mj}">${mj?'Participação confirmada':'Quero participar'}</button></div></article>`:''}</div>
   ${secH('Conversas')}<div class="stack narrow">
    <div class="row-card"><div class="av">${ic('users')}</div><div class="grow mini" style="flex:1;min-width:0"><div class="grow"><b>${g.name}</b><small>${(g.members+(j?1:0)).toLocaleString('pt-BR')} membros</small></div></div><button class="btn sm ${j?'':'ghost'}" data-group="${g.id}" aria-pressed="${j}">${j?'Participando':'Entrar'}</button></div>
    <div class="row-card" data-thread="${t.id}" style="cursor:pointer"><div class="av">${initials(t.by)}</div><div style="flex:1;min-width:0"><h3>${esc(t.q)}</h3><small>${esc(t.by)} · ${t.when} · ${t.replies.length+(S.replies[t.id]||[]).length} respostas</small></div></div></div>
   ${ctaBand({title:'Você é profissional da área?',text:'Crie seu perfil, seja encontrada e conecte-se com profissionais de todo o Brasil.',btn:'Criar perfil',tipo:'profissional'})}</main>`+footer();
}
