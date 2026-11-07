/* ===== Estrutura: cabeçalho, rodapé, topo das páginas =====
   As páginas têm um só conteúdo e duas "cascas": computador (site, menu no topo) e celular (app, barra inferior).
   header() abre a casca e footer() fecha. O que fica no meio é o mesmo e se ajusta por CSS. */
const app=()=>$('#app');
const TAB_OF={home:'home',agendamentos:'agendamentos',mensagens:'mensagens',perfil:'perfil'};
let SHELL='',SHELLBAR=true;
const isAdmin=()=>!!S.acc&&S.acc.role==='admin';
const regRoute=()=>S.reg?'meu-perfil':'cadastro';
const bellBtn=()=>`<button class="ib" data-xnotif aria-label="Notificações">${ic('bell')}${S.counts.notif?`<span class="cnt">${S.counts.notif}</span>`:''}</button>`;
function header(route,o={}){SHELL=route;SHELLBAR=!o.nobar;return DESK()?deskHeader(route,o):mobHeader(route,o)}

function deskHeader(route,o={}){
  if(o.nobar||needSetup())return `<header class="hdr"><div class="wrap">${brand()}<div class="hdr-r"><button class="btn sm" data-logout>Sair da conta</button></div></div></header>`;
  const cur=NAV_OF[route]||'',a=myAcc()||{},nm=firstName()||'Conta';
  const items=[['perfil','Meu perfil','user'],['agendamentos','Agendamentos','cal'],['mensagens','Mensagens','chat'],['favoritos','Favoritos','heart'],[regRoute(),S.reg?'Meu plano e divulgação':'Criar perfil de divulgação','star']];
  if(isAdmin())items.push(['admin','Painel administrativo','cog']);
  return `<header class="hdr"><div class="wrap">${brand()}
   <nav class="nav" id="nav" aria-label="Principal">${NAV.map(([r,l])=>`<button data-go="${r}" ${cur===r?'aria-current="page"':''}>${l}</button>`).join('')}</nav>
   <div class="hdr-r">
    ${bellBtn()}
    <button class="ib" data-go="favoritos" aria-label="Favoritos">${ic('heart')}${S.favs.length?`<span class="cnt">${S.favs.length}</span>`:''}</button>
    <div class="acc"><button class="accb" data-acc aria-haspopup="true" aria-expanded="false"><span class="av">${esc(initials(a.nome||nm))}</span><span class="nm">${esc(nm)}</span>${ic('chev')}</button>
     <div class="pop" id="acc-pop" hidden>${items.map(([r,t,i])=>`<button data-go="${r}">${ic(i)}<span>${t}</span></button>`).join('')}<hr><button data-logout class="out">${ic('out')}<span>Sair da conta</span></button></div></div>
   </div></div></header>`;
}
function mobHeader(route,o={}){
  const main=TAB_OF[route]!==undefined,setup=route==='configurar-perfil';
  const bar=main
   ?`${logoRow()}<div class="ap-act">${bellBtn()}<button class="ib" data-xmore aria-label="Mais opções">${ic('dots')}</button></div>`
   :`<button class="ap-back" ${setup?'data-xback':'data-back'} aria-label="${setup&&needSetup()?'Sair da conta':'Voltar'}">${ic('back')}</button>${logoRow()}<span class="ap-sp"></span>`;
  return `<div class="app ${o.nobar?'nobar':''}"><header class="ap-top ${main?'home':''}">${bar}</header>`;
}

const legalLinks=()=>[['Sobre','sobre'],['Dúvidas frequentes','faq'],['Termos de uso','termos'],['Privacidade','priv'],...(S.cfg.contactEmail?[['Contato','contato']]:[])];
const legalLine=()=>`© ${new Date().getFullYear()} Beauty Hub`;
function deskFooter(){
  const L=([t,k])=>`<li><button data-info="${k}">${t}</button></li>`;
  return `<footer class="ftr"><div class="wrap"><div class="ftr-row">${brand()}
   <ul class="ftr-links">${legalLinks().map(L).join('')}</ul></div>
   <p class="legal">${legalLine()}</p></div></footer>`;
}
function mobLegal(){
  return `<footer class="m-legal"><ul>${legalLinks().map(([t,k])=>`<li><button data-info="${k}">${t}</button></li>`).join('')}</ul><p class="legal">${legalLine()}</p></footer>`;
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
   ${home?`<div class="hero-act"><button class="btn" data-go="${regRoute()}">${S.reg?'Meu plano e divulgação':'Divulgar meu trabalho'} ${ic('arrow')}</button><button class="btn ghost" data-go="network">Conhecer a comunidade</button></div>`:''}
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
const loadingHTML=()=>`<div class="ap-empty"><p>Carregando…</p></div>`;

/* ===== Páginas de módulo ===== */
/* ===== busca e filtros das páginas de módulo (cursos, eventos, lojas...), para qualquer tipo de conta ===== */
const MF={},MFI={};let MFK='';
const mfNew=()=>({q:'',city:'',cat:[],modal:[],nivel:[],atend:[],envio:[],marca:[],pmin:'',pmax:'',when:'',fav:false});
const MFG=[['cat','Categoria'],['modal','Modalidade'],['nivel','Nível'],['atend','Atendimento'],['envio','Envio'],['marca','Marca']];
const mfNum=v=>{const n=parseFloat(String(v==null?'':v).replace(/[^\d,.-]/g,'').replace(/\.(?=\d{3}\b)/g,'').replace(',','.'));return Number.isFinite(n)?n:null};
const mfNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const mfOpts=(items,k)=>[...new Set(items.map(i=>i[k]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'));
function mfCount(f){let n=0;if(f.q.trim())n++;if(f.city.trim())n++;MFG.forEach(([k])=>{if(f[k].length)n++});if(f.pmin!==''||f.pmax!=='')n++;if(f.when)n++;if(f.fav)n++;return n}
function mfApply(items,f){
  const q=mfNorm(f.q.trim()),c=mfNorm(f.city.trim()),pmin=mfNum(f.pmin),pmax=mfNum(f.pmax),today=isoDate(new Date()),wk=isoDate(new Date(Date.now()+7*864e5)),mo=isoDate(new Date(Date.now()+31*864e5));
  return items.filter(i=>{
    if(q&&!mfNorm([i.title,i.desc,i.cat,i.city,i.byName,i.marca,(i.tags||[]).join(' ')].join(' ')).includes(q))return false;
    if(c&&!mfNorm(i.city).includes(c))return false;
    for(const [k] of MFG)if(f[k].length&&!f[k].includes(i[k]))return false;
    const p=mfNum(i.price);if(pmin!==null&&(p===null||p<pmin))return false;if(pmax!==null&&(p===null||p>pmax))return false;
    if(f.when){const d=i.date||'';if(!d||d<today)return false;if(f.when==='week'&&d>wk)return false;if(f.when==='month'&&d>mo)return false}
    if(f.fav&&!S.favs.includes(i.id))return false;
    return true});
}
const mfBar=k=>{const f=MF[k],n=mfCount(f);return `<div class="mf-bar"><div class="ap-search mf-s">${ic('search')}<input type="search" data-mf-q placeholder="Buscar nesta página" value="${esc(f.q)}" aria-label="Buscar nesta página"><button class="fl" data-mf-open aria-label="Filtros${n?' ('+n+' ativos)':''}">${ic('sliders')}${n?`<i class="fl-n">${n}</i>`:''}</button></div></div>`};
const mfList=k=>{const items=mfApply(MFI[k]||[],MF[k]);return items.length?items.map(card).join(''):empty(mfCount(MF[k])?'Nada com esses filtros. Tente remover algum.':'Nada publicado aqui por enquanto.')};
function mfSheet(){
  const k=MFK,f=MF[k],all=MFI[k]||[],has=all.some(i=>mfNum(i.price)!==null),hasD=all.some(i=>i.date);
  const chips=(g)=>{const o=mfOpts(all,g);return o.length?`<div class="xchips">${o.map(v=>`<button type="button" class="xchip" data-mf-t="${g}" data-v="${esc(v)}" aria-pressed="${f[g].includes(v)}">${esc(v)}</button>`).join('')}</div>`:''};
  openSheet(`${closeBtn}<div class="body xfs"><h2>Filtros</h2>
   ${MFG.map(([g,l])=>{const c=chips(g);return c?`<span class="xcap">${l}</span>${c}`:''}).join('')}
   <span class="xcap">Cidade ou bairro</span><input class="xin" type="search" data-mf-city placeholder="Ex.: São Luís" value="${esc(f.city)}" aria-label="Cidade">
   ${has?`<span class="xcap">Faixa de preço (R$)</span><div class="xrange"><input type="number" inputmode="numeric" min="0" placeholder="De" data-mf-pmin value="${esc(f.pmin)}" aria-label="Preço mínimo"><span>até</span><input type="number" inputmode="numeric" min="0" placeholder="Até" data-mf-pmax value="${esc(f.pmax)}" aria-label="Preço máximo"></div>`:''}
   ${hasD?`<span class="xcap">Quando</span><div class="xchips">${[['','Qualquer data'],['week','Próximos 7 dias'],['month','Próximos 30 dias'],['next','Só futuros']].map(([v,l])=>`<button type="button" class="xchip" data-mf-when="${v}" aria-pressed="${f.when===v}">${l}</button>`).join('')}</div>`:''}
   <label class="xck"><input type="checkbox" data-mf-fav ${f.fav?'checked':''}><span>Somente meus favoritos</span></label>
   <div class="row-actions xfa"><button class="btn" data-mf-done>${mfLabel()}</button><button class="btn ghost" data-mf-clear>Limpar filtros</button></div></div>`);
}
const mfLabel=()=>{const n=mfApply(MFI[MFK]||[],MF[MFK]).length;return n?`Ver ${n} resultado${n===1?'':'s'}`:'Nenhum resultado'};
function mfRefresh(){const l=$('#mf-list');if(l)l.innerHTML=mfList(MFK);const d=$('[data-mf-done]');if(d)d.textContent=mfLabel();const b=$('[data-mf-open]');if(b){const n=mfCount(MF[MFK]);b.querySelector('.fl-n')?.remove();if(n)b.insertAdjacentHTML('beforeend',`<i class="fl-n">${n}</i>`)}}
let mfT;
document.addEventListener('input',e=>{const t=e.target;if(!t.matches||!MFK||!MF[MFK])return;const f=MF[MFK];
  if(t.matches('[data-mf-q]'))f.q=t.value;else if(t.matches('[data-mf-city]'))f.city=t.value;else if(t.matches('[data-mf-pmin]'))f.pmin=t.value===''?'':String(Math.max(0,+t.value));else if(t.matches('[data-mf-pmax]'))f.pmax=t.value===''?'':String(Math.max(0,+t.value));else return;
  clearTimeout(mfT);mfT=setTimeout(mfRefresh,200)});
document.addEventListener('change',e=>{const t=e.target;if(t.matches&&t.matches('[data-mf-fav]')&&MFK){MF[MFK].fav=t.checked;mfRefresh()}});
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-mf-open],[data-mf-t],[data-mf-when],[data-mf-done],[data-mf-clear]');if(!t||!MFK||!MF[MFK])return;
  const f=MF[MFK];
  if(t.matches('[data-mf-open]'))return mfSheet();
  if(t.matches('[data-mf-t]')){const g=t.dataset.mfT,v=t.dataset.v,i=f[g].indexOf(v);i>=0?f[g].splice(i,1):f[g].push(v);t.setAttribute('aria-pressed',i<0);return mfRefresh()}
  if(t.matches('[data-mf-when]')){f.when=t.dataset.mfWhen;document.querySelectorAll('[data-mf-when]').forEach(b=>b.setAttribute('aria-pressed',b===t));return mfRefresh()}
  if(t.matches('[data-mf-done]'))return closeSheet();
  if(t.matches('[data-mf-clear]')){MF[MFK]=mfNew();closeSheet();const l=$('#mf-list');if(l)l.innerHTML=mfList(MFK);const s=$('[data-mf-q]');if(s)s.value='';mfRefresh()}});
async function modPage(k){
  const M=MODS[k],r=await GET('/api/listings?mod='+k),items=remember(r.items);
  MFK=k;MFI[k]=items;MF[k]=MF[k]||mfNew();
  app().innerHTML=header(k)+hero({title:M.title,sub:M.sub})+
  `<main class="wrap">${items.length?mfBar(k):''}<div class="list" id="mf-list">${mfList(k)}</div>${ctaBand(M.cta)}</main>`+footer();
}
function mercadoPage(){
  const ks=['lojas','marcas','tecnologia','campeonatos'];
  app().innerHTML=header('mercado')+hero({title:'Mercado',sub:'Lojas, marcas, tecnologia e campeonatos reunidos em um só lugar.'})+
  `<main class="wrap"><div class="mod-grid mt40">${ks.map(k=>tile(k,MODS[k].sub)).join('')}</div></main>`+footer();
}

/* ===== Busca, favoritos, radar ===== */
const MOD_KEYS=['educacao','eventos','campeonatos','lojas','marcas','tecnologia'];
function resultsBlock(items,pros){
  let h='';
  MOD_KEYS.forEach(k=>{const l=items.filter(i=>i.mod===k);if(l.length)h+=`${secH(MOD_NAME[k])}<div class="grid">${l.map(card).join('')}</div>`});
  const mt=items.filter(i=>i.mod==='network');
  if(mt.length)h+=`${secH('Meetups')}<div class="grid">${mt.map(card).join('')}</div>`;
  if(pros.length)h+=`${secH('Profissionais')}<div class="grid">${pros.map(proCard).join('')}</div>`;
  return h;
}
async function searchPage(){
  const q=S.q||'',r=q.trim()?await GET('/api/search?q='+encodeURIComponent(q)):{items:[],pros:[]};
  const items=remember(r.items),pros=remember(r.pros);
  app().innerHTML=header('busca')+hero({title:'Busca',sub:q?`Resultados para “${esc(q)}”`:'Digite um termo para buscar.',search:true,q})+
  `<main class="wrap">${items.length+pros.length?resultsBlock(items,pros):`<div class="mt40">${empty(q?'Nada encontrado. Tente outra palavra, como uma técnica ou o nome de uma cidade.':'Use o campo acima para buscar em todo o Beauty Hub.')}</div>`}</main>`+footer();
}
async function favPage(){
  const r=await GET('/api/favorites'),items=remember(r.items),pros=remember(r.pros);
  app().innerHTML=header('favoritos')+hero({title:'Favoritos',sub:'O que você salvou para consultar depois.'})+
  `<main class="wrap">${items.length+pros.length?resultsBlock(items,pros):`<div class="mt40">${empty('Você ainda não salvou nada. Toque no coração de um curso, evento, loja ou perfil para guardar aqui.')}</div>`}</main>`+footer();
}
async function radarPage(){
  const rows=remember((await GET('/api/radar')).items);
  app().innerHTML=header('radar')+hero({title:'Radar',sub:'O que vem por aí: eventos, cursos, campeonatos e encontros, em ordem de data.'})+
  `<main class="wrap"><div class="stack mt40 narrow">${rows.length?rows.map(i=>{const d=pd(i.date);return `<div class="row-card" data-open="${i.id}" style="cursor:pointer"><div class="dt"><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div><div style="flex:1;min-width:0"><h3>${esc(i.title)}</h3><small>${MOD_NAME[i.mod]} · ${esc(i.city)} · ${inDays(i.date)}</small></div><button class="btn sm ghost" data-open="${i.id}">Ver</button></div>`}).join(''):empty('Nenhuma data por enquanto.')}</div></main>`+footer();
}

/* ===== Network ===== */
async function netPage(){
  const n=await GET('/api/network');remember(n.meetups);remember(n.pros);
  const meet=m=>{const mj=S.joined.includes('m:'+m.id);return `<article class="card" data-open="${m.id}"><span class="badge">${esc(m.cat)}</span><h3><button data-open="${m.id}">${esc(m.title)}</button></h3><p>${esc(m.desc)}</p><ul class="meta"><li>${ic('cal')}${fd(m.date)}</li><li>${ic('pin')}${esc(m.city)}</li></ul><div class="card-f"><small style="color:var(--muted)">${m.going} confirmado${m.going===1?'':'s'}</small><button class="btn sm" data-meet="${m.id}" aria-pressed="${mj}">${mj?'Participação confirmada':'Quero participar'}</button></div></article>`};
  const grp=g=>{const j=S.joined.includes('g:'+g.id);return `<div class="row-card"><div class="av">${ic('users')}</div><div style="flex:1;min-width:0"><b>${esc(g.name)}</b><small style="display:block">${g.members.toLocaleString('pt-BR')} membro${g.members===1?'':'s'}</small></div><button class="btn sm ${j?'':'ghost'}" data-group="${g.id}" aria-pressed="${j}">${j?'Participando':'Entrar'}</button></div>`};
  const thr=t=>`<div class="row-card" data-thread="${t.id}" style="cursor:pointer"><div class="av">${initials(t.by)}</div><div style="flex:1;min-width:0"><h3>${esc(t.q)}</h3><small>${esc(t.by)} · ${ago(t.at)} · ${t.replies} resposta${t.replies===1?'':'s'}</small></div></div>`;
  app().innerHTML=header('network')+hero({title:'Network',sub:'Conecte-se com profissionais, participe de encontros e troque experiências.'})+
  `<main class="wrap">
   ${secH('Encontros',`<button class="lk2" data-newlisting="network">Criar meetup ${ic('plus')}</button>`)}<div class="grid">${n.meetups.length?n.meetups.map(meet).join(''):empty('Nenhum encontro marcado por enquanto.')}</div>
   ${n.pros.length?`${secH('Profissionais em destaque')}<div class="grid">${n.pros.map(proCard).join('')}</div>`:''}
   ${secH('Grupos',`<button class="lk2" data-newgroup>Criar grupo ${ic('plus')}</button>`)}<div class="stack narrow">${n.groups.length?n.groups.map(grp).join(''):empty('Ainda não há grupos. Crie o primeiro.')}</div>
   ${secH('Conversas',`<button class="lk2" data-newthread>Nova pergunta ${ic('plus')}</button>`)}<div class="stack narrow">${n.threads.length?n.threads.map(thr).join(''):empty('Ninguém perguntou nada ainda. Comece uma conversa.')}</div>
   ${ctaBand({title:'Você é profissional da área?',text:'Crie seu perfil, seja encontrada e conecte-se com profissionais de todo o Brasil.',btn:'Divulgar meu trabalho',tipo:'profissional'})}</main>`+footer();
}
