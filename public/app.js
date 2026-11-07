/* ===== Listas fixas da interface (opções de formulários). Nenhum dado de exemplo: tudo o que é conteúdo vem do servidor. ===== */
const PROFILE_TYPES = [
 {id:'profissional',icon:'user',name:'Profissional',sub:'Lash, brows, estética e mais'},
 {id:'educacao',icon:'cap',name:'Educação',sub:'Cursos e especializações'},
 {id:'loja',icon:'bag',name:'Loja',sub:'Lojas físicas e online'},
 {id:'fornecedor',icon:'box',name:'Fornecedor',sub:'Distribuidores e atacado'},
 {id:'palestrante',icon:'chat',name:'Palestrante',sub:'Especialistas que ensinam'},
 {id:'evento',icon:'cal',name:'Evento',sub:'Congressos, feiras e workshops'},
 {id:'marca',icon:'tag',name:'Marca',sub:'Marcas de produtos e serviços'},
 {id:'campeonato',icon:'trophy',name:'Campeonato',sub:'Competições e seletivas'}
];
/* tipo de perfil -> módulo onde ele publica anúncios */
const TIPO_MOD = {educacao:'educacao',evento:'eventos',campeonato:'campeonatos',loja:'lojas',marca:'marcas',fornecedor:'tecnologia'};
const SERVICES = {'Cílios':['Extensão de cílios – Fio a fio','Volume brasileiro','Volume russo','Volume híbrido','Lash lifting','Remoção de extensão']};
const SPECIALTIES = ['Lash Designer','Educadora','Brow Designer','Esteticista','Nail Designer','Micropigmentadora','Palestrante'];
const PERM_LABELS = {galeria:'Galeria de fotos e vídeos',destaquePerfil:'Perfil em destaque',avaliacoes:'Avaliações de clientes',agendamento:'Link de agendamento',prioridade:'Prioridade nas buscas',selo:'Selo de verificação',destaqueHome:'Destaque na home',newsletter:'Divulgação na newsletter',suporte:'Suporte prioritário'};
/* campos dos anúncios por módulo (o servidor valida de novo) */
const FORMS = {
 educacao:{label:'curso',cats:['Cursos','Especializações','Mentorias','Workshops'],date:'opt',extra:['modal','nivel']},
 eventos:{label:'evento',cats:['Congresso','Feira','Workshop','Encontro','Palestra'],date:'req',end:true},
 campeonatos:{label:'campeonato',cats:['Competição','Seletiva'],date:'req',extra:['stxt']},
 lojas:{label:'loja',cats:['Loja online','Loja física'],extra:['atend','envio']},
 marcas:{label:'marca',cats:['Marca oficial','Distribuidor'],extra:['atend','envio','prods']},
 tecnologia:{label:'produto',cats:['Luzes e iluminação','Equipamentos','Mobiliário','Software'],extra:['marca','price']},
 network:{label:'meetup',cats:['Meetup'],date:'req'}
};
const OPTS = {modal:['Presencial','Online','Híbrido'],nivel:['Iniciante','Intermediário','Avançado'],stxt:['Inscrições abertas','Inscrições encerradas','Em breve'],atend:['Atacado e varejo','Atacado','Varejo'],envio:['Envio nacional','Envio regional','Retirada no local']};
const EXTRA_LABEL = {modal:'Modalidade',nivel:'Nível',stxt:'Situação das inscrições',atend:'Atendimento',envio:'Envio',marca:'Marca',price:'Preço de referência (R$)',prods:'Produtos (separe por vírgula)'};
const THREAD_TAGS = ['Geral','Lash Designers','Educação','Mercado','Equipamentos'];

/* ===== Estado e comunicação com o servidor (nada é salvo só no navegador) ===== */
let S={acc:null,setup:null,reg:null,favs:[],follows:[],interest:[],joined:[],counts:{notif:0,msgs:0},plans:{},cfg:{},q:''};
const CACHE=new Map();
const remember=l=>{(l||[]).forEach(x=>CACHE.set(x.id,x));return l||[]};
class ApiError extends Error{constructor(status,msg,fields){super(msg);this.status=status;this.fields=fields||{}}}
async function API(method,url,body,raw){
  const h={'X-BH':'1'};let b;
  if(raw){b=body;h['Content-Type']='application/octet-stream'}
  else if(body!==undefined){b=JSON.stringify(body);h['Content-Type']='application/json'}
  let r;
  try{r=await fetch(url,{method,headers:h,body:b,credentials:'same-origin'})}
  catch(e){throw new ApiError(0,'Sem conexão com o servidor. Verifique sua internet e tente de novo.')}
  let j=null;try{j=await r.json()}catch(e){}
  if(!r.ok){
    /* Um 401 isolado não derruba a conta: antes de sair, confere com o servidor se a sessão realmente acabou. */
    if(r.status===401&&S.acc&&!url.startsWith('/api/auth/')){
      let gone=false;
      for(let i=0;i<2&&!gone;i++){
        try{const m=await fetch('/api/me',{credentials:'same-origin',headers:{'X-BH':'1'},cache:'no-store'});const mj=await m.json();
          if(mj&&mj.account){gone=false;break}gone=i===1}catch(e){gone=false;break}
        if(!gone)await new Promise(z=>setTimeout(z,350));
      }
      if(gone){S.acc=null;S.setup=null;S.reg=null;try{toast('Sua sessão terminou. Entre novamente para continuar.')}catch(e){}go('entrar')}
      else throw new ApiError(503,'Não consegui concluir agora. Tente de novo em instantes.');
    }
    /* Perfil que aparece na lista mas ainda não respondeu: tenta mais uma vez antes de mostrar erro. */
    if(r.status===404&&method==='GET'&&/^\/api\/pros\/p\d+$/.test(url)&&!API._retry){
      API._retry=true;try{await new Promise(z=>setTimeout(z,400));return await API(method,url,body,raw)}finally{API._retry=false}
    }
    throw new ApiError(r.status,(j&&j.error)||'Algo deu errado. Tente de novo.',j&&j.fields);
  }
  return j;
}
const GET=u=>API('GET',u),POST=(u,b)=>API('POST',u,b||{}),PUT=(u,b)=>API('PUT',u,b),PATCH=(u,b)=>API('PATCH',u,b),DEL=u=>API('DELETE',u);
function applyMe(j){
  S.cfg=j.cfg||{};S.plans=j.plans||{};S.acc=j.account||null;S.setup=j.setup||null;S.reg=j.reg||null;
  S.favs=j.favs||[];S.follows=j.follows||[];S.interest=j.interest||[];S.joined=j.joined||[];S.counts=j.counts||{notif:0,msgs:0};
}
async function loadMe(){applyMe(await GET('/api/me'))}
/* roda uma ação de interface e mostra o erro em aviso, sem quebrar a tela */
async function act(fn){try{return await fn()}catch(e){toast(e.message||'Algo deu errado.');return undefined}}
const ago=iso=>{
  const s=Math.max(0,(Date.now()-new Date(iso).getTime())/1e3);
  if(s<60)return 'agora';if(s<3600)return Math.floor(s/60)+' min atrás';if(s<86400)return Math.floor(s/3600)+' h atrás';if(s<604800)return Math.floor(s/86400)+' d atrás';
  const d=new Date(iso);return d.toLocaleDateString('pt-BR');
};
const isoDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

/* ===== Dispositivo: celular (app) ou computador (site) =====
   O site escolhe a "casca" pela largura da tela e troca sozinho se a janela mudar (girar o celular, redimensionar). */
const MQ=matchMedia('(min-width:1024px)');
const DESK=()=>MQ.matches;
const setDev=()=>{document.documentElement.dataset.dev=DESK()?'d':'m'};
setDev();

/* ===== Utilidades ===== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BRL=n=>'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const ICONS={
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 heart:'<path d="M12 20s-7.5-4.6-9-9.4C2 7.2 4.2 4.5 7.2 4.5c1.9 0 3.4 1 4.8 2.8 1.4-1.8 2.9-2.8 4.8-2.8 3 0 5.2 2.7 4.2 6.1-1.5 4.8-9 9.4-9 9.4z"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 cap:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6"/>',
 trophy:'<path d="M8 4h8v6a4 4 0 0 1-8 0zM8 6H4c0 3 1.5 4.5 4 5M16 6h4c0 3-1.5 4.5-4 5M12 14v4M8 20h8"/>',
 store:'<path d="M4 9l1.5-5h13L20 9v11H4zM4 9h16M10 20v-6h4v6"/>',
 bag:'<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
 cog:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.5 2.5 3.5 5.5"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
 chat:'<path d="M4 5h16v11H9l-5 4z"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
 box:'<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9"/>',
 truck:'<path d="M2 6h11v10H2zM13 9h4l3 3v4h-7"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m8.5 12 2.5 2.5L15.5 10"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
 bars:'<path d="M5 20v-6M12 20V8M19 20V4"/>',
 eyel:'<path d="M3 13c3.5-4 14.5-4 18 0-3.5 4-14.5 4-18 0z"/><path d="M5 8 7 10M9 5.5l.8 2.5M14 5.5l-.8 2.5M19 8l-2 2"/>',
 radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12 18 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>',
 plus:'<path d="M12 5v14M5 12h14"/>'
};
const ic=(n,cls='')=>`<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;
const MON=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MONTHS=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const pd=iso=>{const [y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d)};
const fd=iso=>{const t=pd(iso);return `${t.getDate()} de ${MONTHS[t.getMonth()]} de ${t.getFullYear()}`};
const today=()=>{const t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate())};
const daysTo=iso=>Math.round((pd(iso)-today())/864e5);
function dateLabel(it){
  if(!it.date)return 'Início imediato';
  if(!it.end)return fd(it.date);
  const a=pd(it.date),b=pd(it.end);
  if(a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear())return `${a.getDate()} a ${b.getDate()} de ${MONTHS[a.getMonth()]} de ${a.getFullYear()}`;
  return fd(it.date)+' a '+fd(it.end);
}
function whenTxt(it){
  if(!it.date)return 'Início imediato';
  const last=daysTo(it.end||it.date);
  return last<0?dateLabel(it)+' (encerrado)':dateLabel(it);
}
const inDays=iso=>{const d=daysTo(iso);return d<0?'encerrado':d===0?'hoje':d===1?'amanhã':`em ${d} dias`};
const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
const hash=s=>{let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))>>>0;return h};

const PLANS=()=>S.plans;

function benefits(p){
  const x=p.perms,out=['Perfil com localização e contatos'];
  out.push(x.proc>0?`Até ${x.proc} procedimentos`:'Procedimentos ilimitados');
  out.push(x.galeria?'Galeria de fotos e vídeos':'Fotos do seu trabalho');
  ['destaquePerfil','avaliacoes','agendamento','prioridade','selo','destaqueHome','newsletter','suporte'].forEach(k=>{if(x[k])out.push(PERM_LABELS[k])});
  return out;
}

/* ===== Módulos e dados ===== */
const byId=id=>CACHE.get(id);
const MOD_ICON={educacao:'cap',eventos:'cal',campeonatos:'trophy',lojas:'store',marcas:'tag',tecnologia:'cog',network:'users'};
const MOD_NAME={educacao:'Educação',eventos:'Eventos',campeonatos:'Campeonatos',lojas:'Lojas',marcas:'Marcas',tecnologia:'Tecnologia',network:'Network'};
const MODS={
 educacao:{title:'Educação',sub:'Cursos, especializações e mentorias para evoluir na carreira.',
  cta:{title:'Você é educadora?',text:'Divulgue seus cursos e conecte-se com alunas de todo o Brasil.',btn:'Cadastrar meu curso',tipo:'educacao'}},
 eventos:{title:'Eventos',sub:'Congressos, feiras, workshops e encontros do mercado de cílios.',
  cta:{title:'Você organiza um evento?',text:'Divulgue seu evento e seja encontrado por profissionais de todo o Brasil.',btn:'Cadastrar meu evento',tipo:'evento'}},
 campeonatos:{title:'Campeonatos',sub:'Competições e seletivas para mostrar o seu talento.',
  cta:{title:'Organiza um campeonato?',text:'Divulgue sua competição e alcance profissionais de todo o Brasil.',btn:'Cadastrar meu campeonato',tipo:'campeonato'}},
 lojas:{title:'Lojas',sub:'Lojas de produtos para extensão de cílios, na sua cidade e em todo o Brasil.',
  cta:{title:'Quer divulgar sua loja?',text:'Seja encontrada por profissionais de todo o Brasil.',btn:'Cadastrar minha loja',tipo:'loja'}},
 marcas:{title:'Marcas',sub:'As marcas que desenvolvem produtos e soluções para a sua carreira.',
  cta:{title:'É uma marca de produtos para lash?',text:'Cadastre sua marca e conecte-se com profissionais de todo o Brasil.',btn:'Cadastrar minha marca',tipo:'marca'}},
 tecnologia:{title:'Tecnologia',sub:'Equipamentos e inovações para o seu atendimento.',
  cta:{title:'Trabalha com tecnologia para lash?',text:'Cadastre sua empresa e alcance profissionais de todo o Brasil.',btn:'Cadastrar minha empresa',tipo:'fornecedor'}}
};
const NAV=[['home','Explorar'],['eventos','Eventos'],['educacao','Educação'],['mercado','Mercado'],['network','Network'],['radar','Radar']];
const NAV_OF={home:'home',eventos:'eventos',educacao:'educacao',mercado:'mercado',lojas:'mercado',marcas:'mercado',tecnologia:'mercado',campeonatos:'mercado',network:'network',radar:'radar'};

const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/* ===== Cartões ===== */
function badgeOf(it){return it.mod==='educacao'?it.modal:it.mod==='campeonatos'?it.stxt:it.cat}
function metaOf(it){
  const m=[];
  if(it.mod==='educacao')m.push(['user',it.byName]);
  if(it.mod==='tecnologia')m.push(['bag',BRL(it.price)]);
  m.push(['pin',it.city]);
  if(it.date)m.push(['cal',whenTxt(it)]);
  return m;
}
const rateTxt=it=>`${it.rating.toFixed(1).replace('.',',')}`;
function card(it){
  const fav=S.favs.includes(it.id);
  const rate=it.rating?`<span class="rate">${ic('star','fill')} ${rateTxt(it)} <span>(${it.reviews})</span></span>`:'<span></span>';
  return `<article class="card" data-open="${it.id}">
   <button class="heart ${fav?'on':''}" data-fav="${it.id}" aria-pressed="${fav}" aria-label="${fav?'Remover dos favoritos':'Salvar nos favoritos'}">${ic('heart')}</button>
   <span class="badge">${esc(badgeOf(it))}</span>
   <h3><button data-open="${it.id}">${esc(it.title)}</button></h3>
   <p>${esc(it.desc)}</p>
   <ul class="meta">${metaOf(it).map(([i,t])=>`<li>${ic(i)}<span>${esc(t)}</span></li>`).join('')}</ul>
   <div class="card-f">${rate}<span class="more">Ver detalhes ${ic('arrow')}</span></div></article>`;
}
function proCard(p){
  const f=S.follows.includes(p.id);
  return `<article class="card" data-xpro="${p.id}">
   <div class="mini">${avatarHTML(p.photo,p.name,'lg')}<div class="grow"><h3 style="padding:0;font-size:28px"><button data-xpro="${p.id}">${esc(p.name)}</button></h3><small>${esc(p.role)}${p.verified?` · <span class="verified">${ic('shield')}Verificada</span>`:''}</small></div></div>
   <ul class="meta"><li>${ic('pin')}<span>${esc(p.city)}</span></li></ul>
   <div class="card-f">${p.rating?`<span class="rate">${ic('star','fill')} ${rateTxt(p)} <span>(${p.reviews})</span></span>`:'<span class="novo">Novo</span>'}<button class="btn sm" data-follow="${p.id}" aria-pressed="${f}">${f?'Seguindo':'Seguir'}</button></div></article>`;
}
/* Detalhe decorativo: uma linha de cílios, bem discreta. */
function lashArc(){
  let l='',lid='';
  for(let i=0;i<=24;i++){
    const t=i/24,x=20+t*360,y=170-Math.sin(t*Math.PI)*58,th=-Math.PI/2+(t-.5)*1.4,L=22+Math.sin(t*Math.PI)*40;
    const ex=x+Math.cos(th)*L,ey=y+Math.sin(th)*L,cx=x+Math.cos(th)*L*.55+(t<.5?-4:4),cy=y+Math.sin(th)*L*.55;
    lid+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);
    if(i%1===0)l+=`M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  }
  return `<svg class="lash" viewBox="0 0 400 200" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="${lid}"/><path d="${l}"/></g></svg>`;
}
const brand=()=>`<button class="logo" data-go="home" aria-label="Beauty Hub, início">${logoMark(true)}<span>Beauty Hub</span></button>`;

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
async function modPage(k){
  const M=MODS[k],r=await GET('/api/listings?mod='+k),items=remember(r.items);
  app().innerHTML=header(k)+hero({title:M.title,sub:M.sub})+
  `<main class="wrap"><div class="list">${items.length?items.map(card).join(''):empty('Nada publicado aqui por enquanto.')}</div>${ctaBand(M.cta)}</main>`+footer();
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

/* ===== Estilo aplicativo: configurar perfil, home, agendamentos, mensagens, perfil ===== */
Object.assign(ICONS,{
 fan:'<path d="M12 20 4 8M12 20 8 5M12 20l4-15M12 20l8-12M12 20V4"/>',
 curl:'<path d="M4 16c3-6 13-6 16 0M4 16h16"/><path d="M12 9V4M9 5.5 12 4l3 1.5"/>',
 sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
 eraser:'<path d="m7 20-4-4L14 5l6 6-8 9zM9 20h11M7 11l6 6"/>',
 camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
 home:'<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
 dots:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
 locate:'<path d="m4 11 16-7-7 16-2-7z"/>',
 trash:'<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
 sliders:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
 mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
 brush:'<path d="m5 19 10-10M14 4l6 6-3 3-6-6zM5 19l-1 1"/>'
});
const APP_ROUTES=['home','agendamentos','mensagens','perfil','configurar-perfil'];
const UFS=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const DIAS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const PAGTO=['Pix','Cartão de crédito','Cartão de débito','Dinheiro'];
const ANOS=['Menos de 1 ano','1 a 2 anos','3 a 5 anos','Mais de 5 anos'];
const ATEND=[['estudio','No estúdio'],['domicilio','A domicílio'],['ambos','Estúdio e domicílio']];
const DURS=[30,45,60,90,120,150,180,210,240];
const PREFS=['Natural','Fio a fio','Volume brasileiro','Volume russo','Híbrido','Lash lifting','Efeito gatinho','Boneca'];
const durTxt=m=>m<60?m+' min':(m%60?Math.floor(m/60)+'h'+String(m%60).padStart(2,'0'):Math.floor(m/60)+'h');
const isPro=a=>!!a&&!!a.isPro;
const myAcc=()=>S.acc;
const mySetup=()=>S.setup;
const needSetup=()=>!!S.acc&&!(S.setup&&S.setup.done);
const maskCep=v=>{v=digits(v).slice(0,8);return v.length>5?v.slice(0,5)+'-'+v.slice(5):v};
const gp=(o,k)=>k.split('.').reduce((a,p)=>a==null?a:a[p],o);
const sp=(o,k,v)=>{const p=k.split('.'),l=p.pop();let c=o;p.forEach(x=>c=c[x]);c[l]=v};
const firstName=()=>String((myAcc()||{}).nome||'').split(' ')[0]||'';
const greet=()=>{const h=new Date().getHours();return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'};
const brl0=n=>'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});

/* ----- peças visuais ----- */
const logoRow=()=>`<div class="ap-logo">${logoMark(true)}<b>Beauty Hub</b></div>`;
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.parentNode&&t.parentNode.classList&&t.parentNode.classList.contains('ap-av')){t.parentNode.innerHTML=ic('user')}},true);
function avatarHTML(photo,name,cls=''){return `<div class="ap-av ${cls}">${photo?`<img src="${esc(photo)}" alt="" decoding="async">`:(name?`<span>${esc(initials(name))}</span>`:ic('user'))}</div>`}
function tabbar(cur){
 const T=[['home','home','Home'],['agendamentos','cal','Agendamentos'],['mensagens','chat','Mensagens'],['perfil','user','Perfil']];
 return `<nav class="tabbar" aria-label="Principal">${T.map(([r,i,l])=>`<button data-go="${r}" ${cur===r?'aria-current="page"':''}>${ic(i)}<span>${l}</span>${r==='mensagens'&&S.counts.msgs?`<em class="cnt">${S.counts.msgs}</em>`:''}</button>`).join('')}</nav>`;
}
/* ===================== CONFIGURAR PERFIL ===================== */
let P=null,PE={},SUG={},srchT,cepT,qT;
function newSetup(){
 const a=myAcc()||{},old=mySetup();
 const base={photo:'',rua:'',num:'',bairro:'',cidade:'',uf:'',cep:'',lat:null,lng:null,pref:[],
  nomeProf:'',spec:'',anos:'',bio:'',doc:a.doc||'',atend:'estudio',mesmo:true,w:{rua:'',num:'',bairro:'',cidade:'',uf:'',cep:''},raio:10,
  services:[],dias:[2,3,4,5,6],abre:'09:00',fecha:'18:00',pagto:['Pix'],wa:maskTel(a.tel||''),ig:'',agenda:''};
 const o=Object.assign(base,old?JSON.parse(JSON.stringify(old)):{});delete o.gallery;return o;
}
const xerr=k=>PE[k]?`<div class="xerr" role="alert">${PE[k]}</div>`:'';
function xf(k,label,o={}){
 const id='x-'+k.replace('.','-'),v=gp(P,k)??'';
 return `<div class="xf ${o.cls||''}"><label for="${id}">${label}${o.req?' *':''}</label><input id="${id}" data-px="${k}" type="${o.type||'text'}" ${o.mode?`inputmode="${o.mode}"`:''} ${o.max?`maxlength="${o.max}"`:''} ${o.auto?`autocomplete="${o.auto}"`:''} placeholder="${esc(o.ph||label)}" value="${esc(v)}" class="${PE[k]?'bad':''}">${xerr(k)}</div>`;
}
function xsel(k,label,opts,o={}){
 const id='x-'+k.replace('.','-'),v=gp(P,k)??'';
 return `<div class="xf ${o.cls||''}"><label for="${id}">${label}${o.req?' *':''}</label><select id="${id}" data-px="${k}" class="${PE[k]?'bad':''}"><option value="">${o.ph||'Selecione'}</option>${opts.map(x=>`<option ${String(x)===String(v)?'selected':''}>${esc(x)}</option>`).join('')}</select>${xerr(k)}</div>`;
}
const chips=(arr,sel,attr)=>`<div class="xchips">${arr.map(([v,l])=>`<button type="button" class="xchip" ${attr}="${esc(v)}" aria-pressed="${sel.includes(v)}">${esc(l)}</button>`).join('')}</div>`;
const isSN=v=>/^s\/?n$/i.test(String(v||'').trim());
function numField(key,tg){
 const sn=isSN(gp(P,key)),id='x-'+key.replace('.','-');
 const f=xf(key,'Número',{ph:'Número',req:1,mode:'numeric'});
 return (sn?f.replace(`id="${id}"`,`id="${id}" disabled`):f)+`<label class="xck xsn"><input type="checkbox" data-xsn="${tg}" ${sn?'checked':''}><span>Sem número (S/N)</span></label>`;
}
function addrBlock(t){
 const k=s=>t?t+'.'+s:s,tg=t||'main';
 return `<button type="button" class="xloc" data-xloc="${tg}">${ic('locate')}Usar minha localização atual</button>
 <div class="xf"><div class="xsearch">${ic('search')}<input type="search" data-xbusca="${tg}" placeholder="Buscar endereço" autocomplete="off" aria-label="Buscar endereço"></div><div class="xsug" id="x-sug-${tg}"></div></div>
 ${xf(k('rua'),'Rua/Avenida',{ph:'Rua/Avenida',req:1,auto:'street-address'})}${numField(k('num'),tg)}${xf(k('bairro'),'Bairro')}
 <div class="xrow">${xf(k('cidade'),'Cidade',{req:1,cls:'g'})}${xsel(k('uf'),'UF',UFS,{req:1,ph:'UF',cls:'uf'})}</div>${xf(k('cep'),'CEP',{ph:'00000-000',mode:'numeric'})}`;
}
function svcCard(s,i){
 return `<div class="xsvc"><div class="xsvc-h"><b>${esc(s.n)}</b><button type="button" class="xdel" data-xdelsvc="${i}" aria-label="Remover ${esc(s.n)}">${ic('trash')}</button></div>
 <div class="xrow"><div class="xf g"><label for="sp${i}">Preço (R$)</label><input id="sp${i}" type="number" inputmode="decimal" min="0" step="0.01" data-xsvc="${i}:p" placeholder="0,00" value="${esc(s.p)}" class="${PE['svc'+i]?'bad':''}"></div>
 <div class="xf g"><label for="sd${i}">Duração</label><select id="sd${i}" data-xsvc="${i}:d">${DURS.map(d=>`<option value="${d}" ${+s.d===d?'selected':''}>${durTxt(d)}</option>`).join('')}</select></div></div>${xerr('svc'+i)}</div>`;
}
function proSections(){
 const wk=P.atend!=='domicilio',dom=P.atend!=='estudio';
 const quick=(SERVICES['Cílios']||[]).filter(n=>!P.services.some(s=>s.n===n));
 return `
 <section class="xsec"><h2>Perfil profissional</h2><p class="xd">Estas informações aparecem para as clientes que encontrarem você.</p>
  ${xf('nomeProf','Nome profissional ou do estúdio',{req:1,ph:'Ex: Helena Lash Studio'})}
  ${xsel('spec','Especialidade principal',SPECIALTIES,{req:1})}
  ${xsel('anos','Tempo de experiência',ANOS)}
  <div class="xf"><label for="x-bio">Sobre o seu trabalho</label><textarea id="x-bio" data-px="bio" maxlength="500" placeholder="Conte sua experiência, técnicas e diferenciais.">${esc(P.bio)}</textarea><div class="xh"><span id="x-bio-n">${P.bio.length}</span>/500</div></div>
  ${xf('doc','CPF ou CNPJ',{req:1,mode:'numeric',ph:'000.000.000-00 ou 00.000.000/0000-00'})}<p class="xh">Usado para verificar o seu perfil. Não aparece publicamente.</p></section>
 <section class="xsec"><h2>Local de trabalho</h2><p class="xd">Onde você atende suas clientes.</p>
  <div class="xseg" role="group" aria-label="Tipo de atendimento">${ATEND.map(([v,l])=>`<button type="button" data-xatend="${v}" aria-pressed="${P.atend===v}">${l}</button>`).join('')}</div>
  ${wk?`<label class="xck"><input type="checkbox" data-px="mesmo" ${P.mesmo?'checked':''}><span>O estúdio fica no endereço informado acima</span></label>${P.mesmo?'':`<h3 class="xsub">Endereço do estúdio</h3>${addrBlock('w')}`}`:''}
  ${dom?`<div class="xf raio"><label for="x-raio">Atendo a domicílio em até</label><select id="x-raio" data-px="raio">${[5,10,20,30,50].map(n=>`<option value="${n}" ${+P.raio===n?'selected':''}>${n} km</option>`).join('')}</select></div>`:''}</section>
 <section class="xsec"><h2>Serviços</h2><p class="xd">Adicione o que você faz, com preço e duração.</p>
  ${quick.length?`<span class="xcap">Toque para adicionar</span><div class="xchips">${quick.map(n=>`<button type="button" class="xchip add" data-xaddsvc="${esc(n)}">${ic('plus')}${esc(n.replace('Extensão de cílios – ',''))}</button>`).join('')}</div>`:''}
  <div class="xadd"><input id="x-custom" type="text" maxlength="60" placeholder="Outro serviço (ex: Manutenção)" aria-label="Outro serviço"><button type="button" class="btn sm ghost" data-xcustom>Adicionar</button></div>
  ${xerr('services')}<div class="xsvcs">${P.services.map(svcCard).join('')}</div></section>
 <section class="xsec"><h2>Horários e pagamento</h2>
  <span class="xcap">Dias de atendimento</span>${chips(DIAS.map((d,i)=>[String(i),d]),P.dias.map(String),'data-xdia')}${xerr('dias')}
  <div class="xrow"><div class="xf g"><label for="x-abre">Abre às</label><input id="x-abre" type="time" data-px="abre" value="${esc(P.abre)}"></div><div class="xf g"><label for="x-fecha">Fecha às</label><input id="x-fecha" type="time" data-px="fecha" value="${esc(P.fecha)}" class="${PE.fecha?'bad':''}"></div></div>${xerr('fecha')}
  <span class="xcap">Formas de pagamento</span>${chips(PAGTO.map(x=>[x,x]),P.pagto,'data-xpag')}</section>
 <section class="xsec"><h2>Contatos</h2><p class="xd">As clientes solicitam horários e falam com você pelo Beauty Hub e pelo WhatsApp. O pagamento do serviço é combinado direto com você.</p>
  ${xf('wa','WhatsApp (com DDD)',{req:1,type:'tel',mode:'tel',ph:'(00) 00000-0000'})}${xf('ig','Instagram (usuário)',{ph:'seuperfil'})}</section>`;
}
function setupPage(keep,focusNum){
 const y=window.scrollY;
 if(!keep||!P){P=newSetup();PE={}}
 const a=myAcc()||{},pro=isPro(a),edit=!needSetup();
 const sub=edit?'Atualize seus dados quando quiser.':pro?'Precisamos de mais alguns dados para publicar o seu perfil profissional.':'Precisamos de mais alguns dados para liberar o app.';
 app().innerHTML=header('configurar-perfil',{nobar:true})+hero({title:edit?'Editar perfil':'Complete seu cadastro',sub})+`<main class="wrap">
  <div class="ap-who ${pro?'hasb':''}">${pro?`<label class="ap-banner" for="x-banner" ${P.banner?`style="background-image:url('${esc(P.banner)}')"`:''}><span class="bcam">${ic('camera')}${P.banner?'Editar banner':'Adicionar banner'}</span><input id="x-banner" type="file" accept="image/*" hidden></label>`:''}<label class="ap-photo" for="x-photo">${avatarHTML(P.photo,'','xl')}<span class="cam">${ic('camera')}</span><input id="x-photo" type="file" accept="image/*" hidden></label>
   <b>${esc(a.nome||'')}</b><span class="pill">${ic(pro?'eyel':'user')}${pro?'Profissional':'Cliente'}</span><small>${esc(a.doc||'')}</small></div>
  <div class="xform"><section class="xsec"><h2>Endereço</h2><p class="xd">Ative sua localização ou busque seu endereço, depois confirme o número.</p>${addrBlock('')}</section>
  ${pro?proSections():`<section class="xsec"><h2>Estilos que você gosta</h2><p class="xd">Opcional. Ajuda a encontrar profissionais para o seu tipo de olhar.</p>${chips(PREFS.map(x=>[x,x]),P.pref,'data-xpref')}</section>`}</div>
  <div class="xtip">${ic('eyel')}<p>${pro?'Depois de concluir, adicione fotos dos seus trabalhos no perfil. Elas fazem toda a diferença para novas clientes.':'Depois de concluir, salve suas profissionais favoritas e solicite um horário direto pelo app.'}</p></div>
  <button class="abtn xfinish" data-xfinish>${edit?'Salvar alterações':'Concluir cadastro'}</button></main>`+footer();
 window.scrollTo(0,y);
 if(focusNum)$('#x-num')?.focus();
}

/* ----- ações do formulário ----- */
function fillAddr(a,t,la,lo){
 const o=t==='w'?P.w:P;
 o.rua=a.road||a.pedestrian||a.residential||o.rua;o.num=a.house_number||o.num;
 o.bairro=a.suburb||a.neighbourhood||a.city_district||a.quarter||o.bairro;
 o.cidade=a.city||a.town||a.village||a.municipality||o.cidade;
 const iso=a['ISO3166-2-lvl4']||'';if(iso.startsWith('BR-'))o.uf=iso.slice(3);
 if(a.postcode)o.cep=maskCep(a.postcode);
 if(la!=null&&t!=='w'){P.lat=la;P.lng=lo}
}
function useLoc(t){
 if(!navigator.geolocation){toast('Localização indisponível neste aparelho');return}
 toast('Buscando sua localização…');
 navigator.geolocation.getCurrentPosition(async pos=>{
  const la=pos.coords.latitude,lo=pos.coords.longitude;
  try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=pt-BR&lat=${la}&lon=${lo}`);const j=await r.json();
   fillAddr(j.address||{},t,la,lo);setupPage(true,true);toast('Endereço preenchido. Confira o número.')}
  catch(e){if(t!=='w'){P.lat=la;P.lng=lo}toast('Não consegui achar o endereço. Preencha manualmente.')}
 },()=>toast('Permissão negada. Busque o endereço ou preencha manualmente.'),{enableHighAccuracy:true,timeout:12000});
}
async function searchAddr(q,t){
 const box=$('#x-sug-'+t);if(!box)return;
 try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=5&accept-language=pt-BR&q='+encodeURIComponent(q));SUG[t]=await r.json();
  box.innerHTML=SUG[t].length?SUG[t].map((x,i)=>`<button type="button" data-xsug="${t}:${i}">${ic('pin')}<span>${esc(x.display_name)}</span></button>`).join(''):'<small>Nenhum endereço encontrado.</small>';
 }catch(e){box.innerHTML='<small>Busca indisponível agora. Preencha manualmente.</small>'}
}
async function cepLookup(t){
 const o=t==='w'?P.w:P,c=digits(o.cep);if(c.length!==8)return;
 try{const r=await fetch('https://viacep.com.br/ws/'+c+'/json/'),j=await r.json();if(j.erro)return;
  if(j.logradouro)o.rua=j.logradouro;if(j.bairro)o.bairro=j.bairro;if(j.localidade)o.cidade=j.localidade;if(j.uf)o.uf=j.uf;setupPage(true,true)}catch(e){}
}
function readPhoto(f){
 if(!f)return;if(!/^image\//.test(f.type)){toast('Escolha uma imagem');return}
 const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
  const s=640,c=document.createElement('canvas');c.width=c.height=s;const m=Math.min(im.width,im.height);
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,s,s);g.drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,s,s);
  c.toBlob(b=>act(async()=>{const r=await API('POST','/api/me/photo',b,true);P.photo=r.photo;if(S.setup)S.setup.photo=r.photo;setupPage(true);toast('Foto atualizada')}),'image/jpeg',.85)};
  im.onerror=()=>toast('Não consegui abrir essa imagem');im.src=r.result};
 r.readAsDataURL(f);
}
function readBanner(f){
 if(!f)return;if(!/^image\//.test(f.type)){toast('Escolha uma imagem');return}
 const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
  const W=1600,H=640,c=document.createElement('canvas');c.width=W;c.height=H;
  const sc=Math.max(W/im.width,H/im.height),w=im.width*sc,h=im.height*sc;
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);g.drawImage(im,(W-w)/2,(H-h)/2,w,h);
  c.toBlob(b=>act(async()=>{const r=await API('POST','/api/me/banner',b,true);if(P)P.banner=r.banner;if(S.setup)S.setup.banner=r.banner;if(CUR==='profissional'){await proPage()}else{setupPage(true)}toast('Banner atualizado')}),'image/jpeg',.85)};
  im.onerror=()=>toast('Não consegui abrir essa imagem');im.src=r.result};
 r.readAsDataURL(f);
}
function addrErrors(o,pre,E,nomeLocal){
 if(!o.rua.trim())E[pre+'rua']='Informe a rua ou avenida.';
 if(!o.num.trim())E[pre+'num']='Informe o número ou marque “Sem número”.';
 if(!o.cidade.trim())E[pre+'cidade']='Informe a cidade.';
 if(!o.uf)E[pre+'uf']='Escolha a UF.';
 if(o.cep&&digits(o.cep).length!==8)E[pre+'cep']='O CEP tem 8 números.';
}
function validateSetup(){
 const E={},pro=isPro(myAcc());
 addrErrors(P,'',E);
 if(pro){
  if(P.nomeProf.trim().length<2)E.nomeProf='Informe o nome que será exibido.';
  if(!P.spec)E.spec='Escolha sua especialidade.';
  if(!(cpfOk(P.doc)||cnpjOk(P.doc)))E.doc='CPF ou CNPJ inválido. Confira os números.';
  if(P.atend!=='domicilio'&&!P.mesmo)addrErrors(P.w,'w.',E);
  if(!P.services.length)E.services='Adicione ao menos um serviço.';
  P.services.forEach((s,i)=>{const v=parseFloat(String(s.p).replace(',','.'));if(!(v>0))E['svc'+i]='Informe o preço de “'+s.n+'”.'});
  if(!P.dias.length)E.dias='Escolha ao menos um dia.';
  if(!P.abre||!P.fecha||P.abre>=P.fecha)E.fecha='O horário de fechamento deve ser depois da abertura.';
  const w=digits(P.wa);if(w.length<10||w.length>11)E.wa='Informe o WhatsApp com DDD.';
  const ig=P.ig.trim().replace(/^@/,'');if(ig&&!/^[A-Za-z0-9._]{1,30}$/.test(ig))E.ig='Use só letras, números, ponto e sublinhado.';
 }
 return E;
}
async function finishSetup(){
 PE=validateSetup();
 const fail=()=>{setupPage(true);const el=$('.xerr');if(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.closest('.xf,.xsvc')?.querySelector('input,select,textarea')?.focus({preventScroll:true})}toast('Confira os campos destacados')};
 if(Object.keys(PE).length){fail();return}
 const was=!needSetup(),out=JSON.parse(JSON.stringify(P));
 out.ig=out.ig.trim().replace(/^@/,'');
 out.services=out.services.map(s=>({n:s.n.trim(),p:parseFloat(String(s.p).replace(',','.')),d:+s.d}));
 try{S.setup=await PUT('/api/me/setup',out);await loadMe()}
 catch(e){if(e.fields&&Object.keys(e.fields).length){PE=e.fields;fail()}else toast(e.message);return}
 toast(was?'Perfil atualizado':'Tudo pronto, '+firstName()+'!');
 go(was?'perfil':'home');
}

/* ===================== HOME ===================== */
const CATS=[
 ['salao','Salões por perto','store'],['estrelas','5 estrelas','star'],['palestrante','Palestrantes','mic'],['verif','Verificadas','shield'],
 ['domicilio','A domicílio','home'],['@educacao','Cursos','cap'],['@eventos','Eventos','cal'],['@lojas','Produtos','bag']];
const H={q:'',cat:'',sort:'near',all:false,ver:false};
const minPrice=p=>p.services.length?Math.min(...p.services.map(s=>s.p)):1e9;
let PROS_LIST=[],loadSeq=0;
async function loadPros(){
 const seq=++loadSeq,q=new URLSearchParams();
 if(H.cat)q.set('cat',H.cat);if(H.q.trim())q.set('q',H.q.trim());if(H.ver)q.set('ver','1');q.set('sort',H.sort);
 const r=await GET('/api/pros?'+q);
 if(seq===loadSeq)PROS_LIST=remember(r.items);
}
const homeList=()=>PROS_LIST;
function proCardApp(p){
 const f=S.favs.includes(p.id),top=p.services.slice(0,2).map(s=>s.n.replace('Extensão de cílios – ','')),mp=minPrice(p);
 return `<article class="pc" data-xpro="${p.id}" tabindex="0" role="button" aria-label="Ver ${esc(p.name)}">
  ${p.cover?`<img class="pc-cv" src="${esc(p.cover)}" alt="" loading="lazy">`:avatarHTML(p.photo,p.name)}<div class="pc-b"><h3>${esc(p.name)}${p.own?' <em>você</em>':''}</h3><small>${esc(p.role)}${p.verified?` · <span class="verified">${ic('shield')}Verificada</span>`:''}</small>
  <div class="pc-m">${p.rating?`<span class="rate">${ic('star','fill')} ${rateTxt(p)} <span>(${p.reviews})</span></span>`:'<span class="novo">Novo</span>'}<span>${ic('pin')}${esc(p.city)}</span></div>
  <div class="pc-t">${top.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>
  <div class="pc-r"><button class="pc-fav ${f?'on':''}" data-fav="${p.id}" aria-pressed="${f}" aria-label="${f?'Remover dos favoritos':'Salvar nos favoritos'}">${ic('heart')}</button>${mp<1e9?`<small>a partir de</small><b>${brl0(mp)}</b>`:''}</div></article>`;
}
function homeListHTML(){
 const L=homeList(),show=(H.all||DESK())?L:L.slice(0,4);
 const emp=H.cat?'Nenhuma profissional nesta categoria por enquanto.':H.sort==='fav'?'Você ainda não favoritou ninguém. Toque no coração de uma profissional para salvar.':'Nenhuma profissional encontrada.';
 return (show.length?show.map(proCardApp).join(''):`<div class="ap-empty">${ic('eyel')}<p>${emp}</p></div>`)+(!H.all&&!DESK()&&L.length>4?`<button class="btn ghost ap-more" data-xall>Ver todas (${L.length})</button>`:'');
}
async function homePage(){
 await act(loadPros);
 const a=myAcc()||{},pro=isPro(a),st=mySetup(),cur=CATS.find(c=>c[0]===H.cat);
 const sorts=[['near','Perto de você'],['fav','Favoritos'],['price','Preço (menor)'],['rate','Melhor avaliação']];
 app().innerHTML=header('home')+`<main class="wrap">
  <section class="ap-hero">${lashArc()}<span class="kk">${greet()}</span><h1>${esc(firstName())}</h1>
   <p>${pro?'Como está o seu estúdio hoje?':'Encontre quem cuida do seu olhar.'}</p>
   <div class="ap-search">${ic('search')}<input id="x-q" type="search" placeholder="Buscar serviço ou profissional" value="${esc(H.q)}" aria-label="Buscar serviço ou profissional"><button class="fl" data-xfilter aria-label="Filtros">${ic('sliders')}</button></div></section>
  ${pro&&st?`<div class="ap-pro"><div>${ic('eyel')}<span><b>${esc(st.nomeProf||a.nome)}</b><small>${(st.services||[]).length} serviço${(st.services||[]).length===1?'':'s'} · ${esc(st.cidade)} - ${esc(st.uf)}</small></span></div><button class="btn sm ghost" data-go="configurar-perfil">Editar</button></div>`:''}
  <div class="ap-sh"><h2>Explore por categoria</h2></div>
  <div class="tiles">${CATS.map(([k,l,i])=>`<button class="tile" ${k[0]==='@'?`data-go="${k.slice(1)}"`:`data-xcat="${k}" aria-pressed="${H.cat===k}"`}><span class="ti">${ic(i)}</span><span class="tl">${l}</span></button>`).join('')}</div>
  <div class="xchips sorts" role="group" aria-label="Ordenar">${sorts.map(([k,l])=>`<button class="xchip lg" data-xsort="${k}" aria-pressed="${H.sort===k}">${l}</button>`).join('')}</div>
  <div class="ap-sh"><h2>${cur?cur[1]:'Especialistas em destaque'}</h2><button class="lk2" data-xall>${H.all?'Ver menos':'Ver todos'} ${ic('arrow')}</button></div>
  <div id="x-list" class="pcs">${homeListHTML()}</div></main>`+footer();
}
function openFilter(){
 openSheet(`${closeBtn}<div class="body"><h2>Filtros</h2><span class="xcap">Ordenar por</span>
  <div class="xchips">${[['near','Perto de você'],['price','Menor preço'],['rate','Melhor avaliação']].map(([k,l])=>`<button class="xchip lg" data-xsort="${k}" data-xclose aria-pressed="${H.sort===k}">${l}</button>`).join('')}</div>
  <label class="xck"><input type="checkbox" data-xver ${H.ver?'checked':''}><span>Mostrar apenas perfis verificados</span></label>
  <div class="row-actions"><button class="btn" data-close>Aplicar</button><button class="btn ghost" data-xclear>Limpar filtros</button></div></div>`);
}
function openMore(){
 const L=[['eventos','Eventos','cal'],['educacao','Educação','cap'],['mercado','Mercado','store'],['network','Network','users'],['radar','Radar','radar'],['favoritos','Favoritos','heart']];
 openSheet(`${closeBtn}<div class="body"><h2>Explorar mais</h2><div class="xmenu">${L.map(([r,t,i])=>`<button data-go="${r}">${ic(i)}<span>${t}</span>${ic('chev')}</button>`).join('')}<button data-logout class="out">${ic('out')}<span>Sair da conta</span></button></div></div>`);
}

/* ===================== PROFISSIONAL (detalhe) E AGENDAMENTO ===================== */
function openPro(id){return act(async()=>{
 const p=await GET('/api/pros/'+id);CACHE.set(p.id,p);
 const facts=[['Local',p.city]];
 if(p.atend)facts.push(['Atendimento',(ATEND.find(x=>x[0]===p.atend)||[])[1]+(p.atend!=='estudio'?` (até ${p.raio} km)`:'')]);
 if(p.dias)facts.push(['Horários',p.dias.map(d=>DIAS[d]).join(', ')+' · '+p.abre+' às '+p.fecha]);
 if(p.pagto&&p.pagto.length)facts.push(['Pagamento',p.pagto.join(', ')]);
 if(p.anos)facts.push(['Experiência',p.anos]);
 const ext=(h,l)=>`<a class="btn ghost" href="${esc(h)}" target="_blank" rel="noopener noreferrer">${l}</a>`;
 openSheet(`${closeBtn}<div class="body"><div class="mini">${avatarHTML(p.photo,p.name,'lg')}<div class="grow"><h2 style="padding:0">${esc(p.name)}</h2><small>${esc(p.role)}${p.verified?` · <span class="verified">${ic('shield')}Verificada</span>`:''}</small></div></div>
  ${p.rating?`<span class="rate">${ic('star','fill')} ${rateTxt(p)} <span>(${p.reviews} avaliações)</span></span>`:''}
  ${p.bio?`<p style="margin:0;color:var(--muted)">${esc(p.bio)}</p>`:''}
  ${p.gallery.length?`<div class="gal ro">${p.gallery.map(u=>`<div><img src="${esc(u)}" alt="Trabalho de ${esc(p.name)}" loading="lazy"></div>`).join('')}</div>`:''}
  <div class="xps">${p.services.map(s=>`<div><span>${esc(s.n)}<small>${durTxt(s.d)}</small></span><b>${brl0(s.p)}</b></div>`).join('')}</div>
  <div class="facts">${facts.map(([a,b])=>`<div class="fact"><small>${a}</small>${esc(b)}</div>`).join('')}</div>
  ${p.reviewList&&p.reviewList.length?`<div class="stack"><b>Avaliações</b>${p.reviewList.map(r=>`<div class="row-card" style="align-items:flex-start"><div class="av">${esc(initials(r.autor))}</div><div><b>${esc(r.autor)}</b> <span class="rate">${ic('star','fill')} ${r.nota}</span> <small>${ago(r.at)}</small>${r.texto?`<p style="margin:2px 0 0">${esc(r.texto)}</p>`:''}</div></div>`).join('')}</div>`:''}
  <div class="row-actions">${p.own?'':`<button class="btn" data-xbook="${id}">Solicitar horário</button><button class="btn ghost" data-msg="${p.acc}">${ic('chat')}Mensagem</button>`}${p.wa?ext('https://wa.me/'+p.wa,ic('chat')+'WhatsApp'):''}${p.ig?ext('https://instagram.com/'+p.ig,'Instagram'):''}${p.agenda?ext(p.agenda,ic('cal')+'Agenda online'):''}</div>
  <div class="row-actions">${favBtn(id)}</div></div>`);
})}
let BOOK=null;
function openBook(id){
 if(needLogin())return;
 const p=byId(id);if(!p||p.own)return;
 const t=new Date(),iso=isoDate(t);BOOK=id;
 openSheet(`${closeBtn}<div class="body"><h2>Solicitar horário</h2><p style="margin:0;color:var(--muted)">com ${esc(p.name)}</p>
  <div class="form"><div class="f"><label for="b-svc">Serviço</label><select id="b-svc">${p.services.map(s=>`<option value="${s.id}">${esc(s.n)} · ${brl0(s.p)} · ${durTxt(s.d)}</option>`).join('')}</select></div>
  <div class="f"><label for="b-dt">Data</label><input id="b-dt" type="date" min="${iso}" value="${iso}"></div>
  <div class="f"><label for="b-hr">Horário</label><select id="b-hr"><option>Carregando…</option></select><div class="hint" id="b-info"></div></div>
  <button class="btn" data-xconfirm="${id}" id="b-ok" disabled>Enviar solicitação</button></div>
  <p class="note">A profissional recebe a solicitação e confirma ou sugere outro horário. O pagamento do serviço é combinado diretamente com ela.</p></div>`);
 refreshSlots();
}
async function refreshSlots(){
 const sel=$('#b-hr');if(!sel||!BOOK)return;
 const svc=$('#b-svc').value,d=$('#b-dt').value,ok=$('#b-ok'),info=$('#b-info');
 ok.disabled=true;
 if(!d){sel.innerHTML='<option value="">Escolha a data</option>';return}
 sel.innerHTML='<option value="">Carregando…</option>';
 try{
  const r=await GET(`/api/pros/${BOOK}/slots?svc=${svc}&date=${d}`);
  if(!$('#b-hr')||$('#b-dt').value!==d||$('#b-svc').value!==svc)return;
  sel.innerHTML=r.slots.length?r.slots.map(h=>`<option>${h}</option>`).join(''):'<option value="">Sem horários</option>';
  info.textContent=r.slots.length?'':'Sem horários livres neste dia. Tente outra data.';ok.disabled=!r.slots.length;
 }catch(e){sel.innerHTML='<option value="">—</option>';info.textContent=e.message}
}
async function confirmBook(id){
 const svc=+$('#b-svc').value,date=$('#b-dt').value,time=$('#b-hr').value;
 if(!date||!time){toast('Escolha a data e o horário');return}
 $('#b-ok').disabled=true;
 try{await POST('/api/appointments',{pro:id,svc,date,time});closeSheet();toast('Solicitação enviada');go('agendamentos')}
 catch(e){toast(e.message);refreshSlots()}
}
const AG_ST={solicitado:'Solicitado',confirmado:'Confirmado',recusado:'Recusado',cancelado:'Cancelado',concluido:'Concluído'};
async function agendaPage(){
 const L=(await GET('/api/appointments')).items,upcoming=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time);
 const card=x=>{
  const d=pd(x.date),acts=[];
  if(x.role==='pro'){
   if(x.status==='solicitado')acts.push(['confirmado','Confirmar',''],['recusado','Recusar','ghost']);
   if(x.status==='confirmado')acts.push(['concluido','Concluir',''],['cancelado','Cancelar','ghost']);
  }else if(x.status==='solicitado'||x.status==='confirmado')acts.push(['cancelado','Cancelar','ghost']);
  const ph=digits(x.clientPhone);
  return `<article class="pc ag"><div class="dt"><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div><div class="pc-b"><h3>${esc(x.service)}</h3><small>${esc(x.other)} · ${x.time} · ${brl0(x.price)}</small><div class="pc-t"><span class="st-${x.status}">${AG_ST[x.status]}</span></div>
   <div class="row-actions" style="margin-top:8px">${acts.map(([s,l,c])=>`<button class="btn sm ${c}" data-aact="${x.id}:${s}">${l}</button>`).join('')}${x.canReview?`<button class="btn sm" data-review="${x.id}">Avaliar</button>`:''}${ph?`<a class="btn sm ghost" href="https://wa.me/55${ph}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`:''}<button class="btn sm ghost" data-msg="${x.otherId}">${ic('chat')}Mensagem</button></div></div></article>`;
 };
 const recv=L.filter(x=>x.role==='pro').sort(upcoming),mine=L.filter(x=>x.role==='client').sort(upcoming);
 app().innerHTML=header('agendamentos')+hero({title:'Agendamentos',sub:'Seus horários e as solicitações que você recebeu.'})+`<main class="wrap">
  ${recv.length?`<div class="ap-sh"><h2>Solicitações recebidas</h2></div><div class="pcs">${recv.map(card).join('')}</div>`:''}
  <div class="ap-sh"><h2>${recv.length?'Meus horários como cliente':'Meus horários'}</h2></div>
  <div class="pcs">${mine.length?mine.map(card).join(''):`<div class="ap-empty">${ic('cal')}<p>Você ainda não solicitou nenhum horário.</p><button class="btn" data-go="home">Ver profissionais</button></div>`}</div></main>`+footer();
}
let REV=null;
function openReview(id){
 REV={id,nota:0};
 openSheet(`${closeBtn}<div class="body"><h2>Avaliar atendimento</h2><div class="stars" role="group" aria-label="Nota">${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" aria-label="${n} estrela${n>1?'s':''}">${ic('star')}</button>`).join('')}</div>
  <div class="f"><label for="rv-t">Comentário (opcional)</label><textarea id="rv-t" maxlength="600" style="min-height:80px"></textarea></div><div class="err" id="rv-err" role="alert" style="color:var(--bad);font-size:13px"></div>
  <div class="row-actions"><button class="btn" data-sendreview>Enviar avaliação</button></div></div>`);
}
function paintStars(){$$('.stars button').forEach(b=>b.classList.toggle('on',+b.dataset.star<=REV.nota))}

/* ----- mensagens ----- */
let MSG={cur:null,peer:null,items:[],list:[],lastId:0};
async function msgPage(){
 if(MSG.cur){await openThreadView();return}
 const L=(await GET('/api/conversations')).items;MSG.list=L;
 app().innerHTML=header('mensagens')+hero({title:'Mensagens',sub:'Suas conversas com profissionais e clientes.'})+`<main class="wrap"><div class="stack narrow">${L.length?L.map(c=>`<button class="row-card conv" data-conv="${c.id}">${avatarHTML(c.with.photo,c.with.name)}<div style="flex:1;min-width:0;text-align:left"><b>${esc(c.with.name)}</b><small style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.last.mine?'Você: ':''}${esc(c.last.body)}</small></div><small>${ago(c.last.at)}</small>${c.unread?`<span class="cnt inl">${c.unread}</span>`:''}</button>`).join(''):`<div class="ap-empty">${ic('chat')}<p>Nenhuma conversa ainda. Abra o perfil de uma profissional e toque em Mensagem.</p><button class="btn" data-go="home">Ver profissionais</button></div>`}</div></main>`+footer();
}
const bubble=m=>`<div class="bub ${m.mine?'me':''}"><p>${esc(m.body).replace(/\n/g,'<br>')}</p><small>${new Date(m.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div>`;
async function openThreadView(){
 const r=await GET(`/api/conversations/${MSG.cur}/messages`);MSG.peer=r.with;MSG.items=r.items;MSG.lastId=r.items.length?r.items[r.items.length-1].id:0;
 app().innerHTML=header('mensagens')+`<main class="wrap"><div class="thread narrow"><div class="th-h"><button class="btn sm ghost" data-convback>${ic('back')}Conversas</button>${avatarHTML(r.with.photo,r.with.name)}<b>${esc(r.with.name)}</b></div>
  <div class="bubs" id="bubs">${r.items.length?r.items.map(bubble).join(''):'<p class="note" style="text-align:center">Escreva a primeira mensagem.</p>'}</div>
  <form class="th-f" id="msg-form"><textarea id="msg-t" maxlength="2000" rows="1" placeholder="Escreva uma mensagem" aria-label="Mensagem"></textarea><button class="btn" type="submit" aria-label="Enviar">${ic('arrow')}</button></form></div></main>`+footer();
 const b=$('#bubs');if(b)b.scrollTop=b.scrollHeight;
 refreshCounters();
}
async function pollThread(){
 if(CUR!=='mensagens'||!MSG.cur||!$('#bubs'))return;
 const r=await GET(`/api/conversations/${MSG.cur}/messages?after=${MSG.lastId}`);
 if(!r.items.length)return;
 const b=$('#bubs'),atEnd=b.scrollHeight-b.scrollTop-b.clientHeight<60;
 b.querySelector('.note')?.remove();
 b.insertAdjacentHTML('beforeend',r.items.map(bubble).join(''));MSG.lastId=r.items[r.items.length-1].id;
 if(atEnd)b.scrollTop=b.scrollHeight;refreshCounters();
}
async function startConv(accId){
 if(needLogin())return;
 await act(async()=>{const r=await POST('/api/conversations',{to:accId});MSG.cur=r.id;closeSheet();go('mensagens');if(CUR==='mensagens')route()});
}

/* ----- notificações e contadores ----- */
async function refreshCounters(){
 try{S.counts=await GET('/api/counters')}catch(e){return}
 paintBadges();
}
function paintBadges(){
 $$('[data-xnotif]').forEach(b=>{b.querySelector('.cnt')?.remove();if(S.counts.notif)b.insertAdjacentHTML('beforeend',`<span class="cnt">${S.counts.notif}</span>`)});
 $$('.tabbar [data-go="mensagens"]').forEach(b=>{b.querySelector('.cnt')?.remove();if(S.counts.msgs)b.insertAdjacentHTML('beforeend',`<em class="cnt">${S.counts.msgs}</em>`)});
}
let pollT=null,pollMsgT=null;
function startPolling(){
 stopPolling();
 pollT=setInterval(()=>{if(!document.hidden&&S.acc)refreshCounters()},30000);
 pollMsgT=setInterval(()=>{if(!document.hidden&&S.acc)act(pollThread)},5000);
}
function stopPolling(){clearInterval(pollT);clearInterval(pollMsgT)}
async function openNotifs(){
 if(needLogin())return;
 await act(async()=>{
  const items=(await GET('/api/notifications')).items;
  openSheet(`${closeBtn}<div class="body"><h2>Notificações</h2><div class="stack">${items.length?items.map(n=>`<${n.link?'button data-go="'+esc(n.link)+'"':'div'} class="row-card nrow ${n.read?'':'new'}" style="text-align:left"><div style="flex:1;min-width:0"><span>${esc(n.text)}</span><small style="display:block;color:var(--muted)">${ago(n.created_at)}</small></div></${n.link?'button':'div'}>`).join(''):'<div class="empty-state">Nenhuma notificação por enquanto.</div>'}</div></div>`);
  if(S.counts.notif){await POST('/api/notifications/read');S.counts.notif=0;paintBadges()}
 });
}

/* ===================== PERFIL (aba) ===================== */
function perfilPage(){
 const a=myAcc()||{},s=mySetup()||{},pro=isPro(a),wk=(s.atend==='domicilio'||s.mesmo)?s:(s.w||{});
 const row=(l,v)=>v?`<div class="fact"><small>${l}</small>${esc(v)}</div>`:'';
 const addr=o=>[o.rua&&(o.rua+', '+o.num),o.bairro,o.cidade&&(o.cidade+' - '+o.uf),o.cep].filter(Boolean).join(' · ');
 app().innerHTML=header('perfil')+hero({title:'Meu perfil',sub:'Seus dados e preferências.'})+`<main class="wrap"><div class="pf2"><div class="pf2-a">
  <div class="ap-who left">${avatarHTML(s.photo,a.nome,'xl')}<b>${esc(pro?(s.nomeProf||a.nome):a.nome)}</b><span class="pill">${ic(pro?'eyel':'user')}${pro?esc(s.spec||'Profissional'):'Cliente'}</span><small>${esc(a.email||'')}</small></div>
  <div class="row-actions" style="justify-content:center"><button class="btn" data-go="configurar-perfil">Editar perfil</button></div></div>
  <div class="pf2-b"><section class="xsec"><h2>Endereço</h2><div class="facts">${row('Endereço',addr(s))}</div></section>
  ${pro?`<section class="xsec"><h2>Serviços</h2><div class="xps">${(s.services||[]).map(v=>`<div><span>${esc(v.n)}<small>${durTxt(v.d)}</small></span><b>${brl0(v.p)}</b></div>`).join('')}</div></section>
  <section class="xsec"><h2>Atendimento</h2><div class="facts">${row('Tipo',(ATEND.find(x=>x[0]===s.atend)||[])[1])}${s.atend!=='domicilio'?row('Local de trabalho',addr(wk)):''}${s.atend!=='estudio'?row('Raio a domicílio','até '+s.raio+' km'):''}${row('Horários',(s.dias||[]).map(d=>DIAS[d]).join(', ')+' · '+s.abre+' às '+s.fecha)}${row('Pagamento',(s.pagto||[]).join(', '))}${row('WhatsApp',s.wa)}${row('Instagram',s.ig?'@'+s.ig:'')}</div></section>`
  :`<section class="xsec"><h2>Estilos que você gosta</h2><div class="xchips">${(s.pref||[]).length?s.pref.map(x=>`<span class="xchip" aria-pressed="true">${esc(x)}</span>`).join(''):'<small style="color:var(--muted)">Nenhum estilo escolhido.</small>'}</div></section>`}
  ${pro?`<section class="xsec"><h2>Publicações</h2><p class="xd">Compartilhe novidades com suas clientes, com ou sem foto.</p><div class="row-actions"><button class="btn" data-newpost>${ic('plus')}Nova publicação</button><button class="btn ghost" data-xpro="p${a.id}">Ver meu perfil público</button></div></section>`:''}
  <section class="xsec"><h2>Plano e divulgação</h2><p class="xd">${S.reg?'Veja o status do seu cadastro, plano e anúncios.':'Escolha um plano para destacar o seu perfil e liberar mais recursos.'}</p><button class="btn ghost" data-go="${regRoute()}">${S.reg?'Ver meu plano':'Escolher plano'}</button></section>
  </div><div class="pf2-c"><section class="xsec"><div class="xmenu">${[['favoritos','Favoritos','heart'],['eventos','Eventos','cal'],['educacao','Educação','cap'],['mercado','Mercado','store'],['network','Network','users']].concat(isAdmin()?[['admin','Painel administrativo','cog']]:[]).map(([r,t,i])=>`<button data-go="${r}">${ic(i)}<span>${t}</span>${ic('chev')}</button>`).join('')}<button data-logout class="out">${ic('out')}<span>Sair da conta</span></button></div></section>
  <section class="xsec"><h2>Privacidade</h2><p class="xd">Excluir sua conta apaga seus dados, agendamentos, mensagens e anúncios.</p><button class="btn ghost sm" data-delaccount>Excluir minha conta</button></section></div></div></main>`+footer();
}

/* ===================== EVENTOS ===================== */
document.addEventListener('click',e=>{
 const t=e.target;let el;
 if(t.closest('[data-fav]'))return;
 if(t.closest('[data-xback]')){if(needSetup()){logout();toast('Você saiu da conta')}else go('perfil');return}
 if(t.closest('[data-xnotif]')){openNotifs();return}
 if(t.closest('[data-xmore]')){openMore();return}
 if(t.closest('[data-xfilter]')){openFilter();return}
 if(el=t.closest('[data-xcat]')){H.cat=H.cat===el.dataset.xcat?'':el.dataset.xcat;H.all=false;homePage();return}
 if(el=t.closest('[data-xsort]')){H.sort=el.dataset.xsort;H.all=false;if(el.hasAttribute('data-xclose'))closeSheet();homePage();return}
 if(t.closest('[data-xall]')){H.all=!H.all;homePage();return}
 if(t.closest('[data-xclear]')){H.sort='near';H.ver=false;H.cat='';H.q='';closeSheet();homePage();return}
 if(el=t.closest('[data-xpro]')){PP.tab='pubs';closeSheet();go('profissional/'+el.dataset.xpro);return}
 if(el=t.closest('[data-xbook]')){openBook(el.dataset.xbook);return}
 if(el=t.closest('[data-xconfirm]')){confirmBook(el.dataset.xconfirm);return}
 /* configurar perfil */
 if(el=t.closest('[data-xloc]')){useLoc(el.dataset.xloc==='w'?'w':'');return}
 if(el=t.closest('[data-xsug]')){const [g,i]=el.dataset.xsug.split(':'),x=SUG[g][+i];fillAddr(x.address||{},g==='w'?'w':'',+x.lat,+x.lon);setupPage(true,true);return}
 if(el=t.closest('[data-xatend]')){P.atend=el.dataset.xatend;setupPage(true);return}
 if(el=t.closest('[data-xdia]')){const d=+el.dataset.xdia,i=P.dias.indexOf(d);i>=0?P.dias.splice(i,1):P.dias.push(d);P.dias.sort();delete PE.dias;setupPage(true);return}
 if(el=t.closest('[data-xpag]')){const v=el.dataset.xpag,i=P.pagto.indexOf(v);i>=0?P.pagto.splice(i,1):P.pagto.push(v);setupPage(true);return}
 if(el=t.closest('[data-xpref]')){const v=el.dataset.xpref,i=P.pref.indexOf(v);i>=0?P.pref.splice(i,1):P.pref.push(v);setupPage(true);return}
 if(el=t.closest('[data-xaddsvc]')){P.services.push({n:el.dataset.xaddsvc,p:'',d:90});delete PE.services;setupPage(true);return}
 if(t.closest('[data-xcustom]')){const v=$('#x-custom').value.trim();if(v.length<2){toast('Digite o nome do serviço');return}if(P.services.some(s=>norm(s.n)===norm(v))){toast('Esse serviço já está na lista');return}P.services.push({n:v,p:'',d:90});delete PE.services;setupPage(true);return}
 if(el=t.closest('[data-xdelsvc]')){P.services.splice(+el.dataset.xdelsvc,1);PE={};setupPage(true);return}
 if(t.closest('[data-xfinish]')){finishSetup();return}
});
document.addEventListener('input',e=>{
 const t=e.target,d=t.dataset||{};
 if(t.id==='x-q'){H.q=t.value;H.all=false;clearTimeout(qT);qT=setTimeout(async()=>{await act(loadPros);const b=$('#x-list');if(b)b.innerHTML=homeListHTML()},250);return}
 if(d.xbusca){clearTimeout(srchT);const q=t.value.trim(),g=d.xbusca;if(q.length<4){const b=$('#x-sug-'+g);if(b)b.innerHTML='';return}srchT=setTimeout(()=>searchAddr(q,g),500);return}
 if(d.xsvc){const [i,f]=d.xsvc.split(':');P.services[+i][f]=t.value;if(f==='p'){delete PE['svc'+i];t.classList.remove('bad');t.closest('.xsvc')?.querySelector('.xerr')?.remove()}return}
 if(d.px){
  const k=d.px;let v=t.type==='checkbox'?t.checked:t.value;
  if(k==='cep'||k==='w.cep')v=t.value=maskCep(v);
  if(k==='wa')v=t.value=maskTel(v);
  if(k==='doc')v=t.value=maskDoc(v,true);
  sp(P,k,v);
  if(k==='bio')$('#x-bio-n').textContent=v.length;
  if(PE[k]){delete PE[k];t.classList.remove('bad');t.closest('.xf')?.querySelector('.xerr')?.remove()}
  if((k==='cep'||k==='w.cep')&&digits(v).length===8){clearTimeout(cepT);cepT=setTimeout(()=>cepLookup(k==='cep'?'':'w'),400)}
 }
});
document.addEventListener('change',e=>{
 const t=e.target,d=t.dataset||{};
 if(t.id==='x-photo'){readPhoto(t.files[0]);return}
 if(t.id==='x-banner'||t.id==='x-banner-pp'){readBanner(t.files[0]);t.value='';return}
 if(d.xsn!==undefined){const o=d.xsn==='w'?P.w:P,pre=d.xsn==='w'?'w.':'';o.num=t.checked?'S/N':'';delete PE[pre+'num'];setupPage(true);return}
 if(t.id==='b-svc'||t.id==='b-dt'){refreshSlots();return}
 if(d.xver!==undefined){H.ver=t.checked;homePage();return}
 if(d.xsvc){const [i,f]=d.xsvc.split(':');P.services[+i][f]=t.value;return}
 if(d.px==='mesmo'){P.mesmo=t.checked;setupPage(true)}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.pc[data-xpro]')){e.preventDefault();PP.tab='pubs';go('profissional/'+e.target.dataset.xpro)}});

/* ===== Página da profissional (abas Publicações / Sobre / Avaliações) e publicações ===== */
const PP={id:'',tab:'pubs'};
const DIAS_FULL=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const notaTxt=n=>n>=4.5?'Muito satisfeito!':n>=3.5?'Satisfeito':n>=2.5?'Pouco satisfeito':n>=1.5?'Insatisfeito':'Totalmente insatisfeito';
const NOTA_L={5:'Muito satisfeito',4:'Satisfeito',3:'Pouco satisfeito',2:'Insatisfeito',1:'Totalmente insatisfeito'};
const starsRow=n=>Array.from({length:5},(_,i)=>`<span class="${i<n?'on':''}">${ic('star','fill')}</span>`).join('');
function postCard(p,who){
  return `<article class="post"><header>${avatarHTML(who.photo,who.name)}<div><b>${esc(who.name)}</b><small>${ago(p.at)}</small></div></header>
   ${p.texto?`<p>${esc(p.texto)}</p>`:''}${p.photo?`<img src="${esc(p.photo)}" alt="Foto da publicação de ${esc(who.name)}" loading="lazy">`:''}</article>`;
}
async function proPage(id){
  if(id&&id!==PP.id){PP.id=id;PP.tab='pubs'}
  const p=await GET('/api/pros/'+PP.id);CACHE.set(p.id,p);
  const svc=p.services.slice().sort((a,b)=>a.p-b.p)[0],today=new Date().getDay(),at=(ATEND.find(x=>x[0]===p.atend)||[])[1]||'';
  const tabs=[['pubs','Publicações'],['sobre','Sobre'],['aval','Avaliações']];
  const last=(p.reviewList||[])[0],tot=p.reviews||0,dist=p.dist||{};
  let body='';
  if(PP.tab==='pubs'){
    body=`${p.gallery.length?`<h2 class="pp-h">${ic('camera')}Galeria de fotos</h2><div class="gal ro">${p.gallery.map(u=>`<div><img src="${esc(u)}" alt="Trabalho de ${esc(p.name)}" loading="lazy"></div>`).join('')}</div>`:''}
     <h2 class="pp-h">Publicações</h2>${p.posts.length?`<div class="posts">${p.posts.map(x=>postCard(x,p)).join('')}</div>`:`<div class="empty-state">${p.own?'Você ainda não publicou. Crie sua primeira publicação em Meu perfil.':'Esta profissional ainda não fez publicações.'}</div>`}`;
  }
  if(PP.tab==='sobre'){
    const hr=DIAS_FULL.map((n,i)=>`<div class="pp-hr"><span>${n}${i===today?' <em>Hoje</em>':''}</span><b>${(p.dias||[]).includes(i)?`${esc(p.abre)} às ${esc(p.fecha)}`:'Não atende'}</b></div>`).join('');
    body=`<h2 class="pp-h">${ic('user')}Sobre</h2>
     <div class="pp-box"><h3>Descrição</h3><p>${p.bio?esc(p.bio):'Esta profissional ainda não escreveu uma descrição.'}</p></div>
     <div class="pp-box"><h3>Informações</h3><div class="pp-chips">${[p.anos&&'Experiência: '+p.anos,at&&at+(p.atend!=='estudio'?` (até ${p.raio} km)`:''),...(p.pagto||[])].filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>
     <div class="pp-box"><h3>Serviços oferecidos</h3><div class="xps">${p.services.map(s=>`<div><span>${esc(s.n)}<small>${durTxt(s.d)}</small></span><b>${brl0(s.p)}</b></div>`).join('')}</div></div>
     <div class="pp-box"><h3>Horário de expediente</h3>${hr}<small class="pp-note">A disponibilidade real aparece ao solicitar o horário.</small></div>`;
  }
  if(PP.tab==='aval'){
    const list=p.reviewList||[];
    body=`<h2 class="pp-h">Avaliações de ${esc(p.name)}</h2>
     ${tot?`<div class="pp-sum"><div><b>${rateTxt(p)}</b><div class="stars">${starsRow(Math.round(p.rating))}</div></div><div class="mid">${notaTxt(p.rating)}</div><div class="end"><b>${tot}</b> avaliaç${tot===1?'ão':'ões'} feita${tot===1?'':'s'}</div></div>
     <div class="pp-dist">${[5,4,3,2,1].map(n=>`<div><span>${n}</span><i><u style="width:${tot?Math.round((dist[n]||0)/tot*100):0}%"></u></i><em>${NOTA_L[n]}</em></div>`).join('')}</div>`:`<div class="empty-state">Ainda sem avaliações. Clientes avaliam depois de um atendimento concluído.</div>`}
     <div class="pp-safe"><b>${ic('shield')}Avaliações seguras</b><p>Só avalia quem teve um atendimento concluído pelo Beauty Hub, e a equipe revisa o conteúdo. Compartilhe sua experiência com tranquilidade.</p></div>
     ${list.length?`<h3 class="pp-h2">Mais recentes</h3><div class="stack">${list.map(r=>`<div class="pp-rev"><div class="av">${esc(initials(r.autor))}</div><div><b>${esc(r.autor)}</b><small>${ago(r.at)}</small><div class="rate">${r.nota} ${ic('star','fill')} ${NOTA_L[r.nota]||''}</div>${r.texto?`<p>${esc(r.texto)}</p>`:''}</div></div>`).join('')}</div>`:''}`;
  }
  const ext=(h,l)=>`<a class="btn ghost" href="${esc(h)}" target="_blank" rel="noopener noreferrer">${l}</a>`;
  app().innerHTML=header('profissional',{nobar:true})+`<main class="wrap pp">
   <div class="pp-cover" ${p.banner?`style="background-image:url('${esc(p.banner)}')"`:''}>${p.own?`<label class="bcam" for="x-banner-pp">${ic('camera')}<span>${p.banner?'Editar banner':'Adicionar banner'}</span><input id="x-banner-pp" type="file" accept="image/*" hidden></label>`:''}</div>
   <div class="pp-id">${avatarHTML(p.photo,p.name,'xl')}<div><h1>${esc(p.name)}</h1><small>${esc(p.role)} · ${esc(p.city)}</small>${p.verified?`<span class="pp-ver">${ic('shield')}Perfil verificado</span>`:''}</div></div>
   ${tot?`<div class="pp-rec"><div class="pp-rec-h"><span>Avaliações recentes</span><span class="rate">${ic('star','fill')} ${rateTxt(p)} <span>(${tot})</span></span></div>
     <div class="pp-rec-b">${last?`<div class="pp-mini"><b>${last.nota} ★ · ${ago(last.at)}</b><span>${esc((last.texto||NOTA_L[last.nota]||'').slice(0,60))}</span></div>`:''}<button class="btn ghost" data-pptab="aval">Ler avaliações</button></div></div>`:''}
   <div class="pp-info"><div class="pp-box"><small>${ic('tag')} Valores</small><span>a partir de</span><b class="pr">${svc?brl0(svc.p):'—'}</b><span>${svc?durTxt(svc.d):''}</span></div>
    <div class="pp-box"><small>${ic('pin')} Localização</small><b>${esc(p.city)}</b><span>${esc(at)}</span></div></div>
   <div class="row-actions">${p.own?'':`<button class="btn ghost" data-msg="${p.acc}">${ic('chat')}Mensagem</button>`}${p.wa?ext('https://wa.me/'+p.wa,ic('chat')+'WhatsApp'):''}${p.ig?ext('https://instagram.com/'+p.ig,'Instagram'):''}${p.agenda?ext(p.agenda,ic('cal')+'Agenda online'):''}${favBtn(p.id)}</div>
   <div class="tabs pp-tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${PP.tab===k}" data-pptab="${k}">${l}${k==='aval'&&tot?`<small>(${tot})</small>`:''}</button>`).join('')}</div>
   ${body}</main>
   <div class="pp-bar"><div><small>a partir de</small><b>${svc?brl0(svc.p):'—'}</b>${svc?`<small>(${durTxt(svc.d)})</small>`:''}</div>${p.own?`<button class="btn" data-go="meu-perfil">Gerenciar perfil</button>`:`<button class="btn" data-xbook="${p.id}">Solicitar horário</button>`}</div>`;
}

/* ----- publicações (no Meu perfil) ----- */
function resizeImg(file,max){return new Promise((res,rej)=>{
  const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
    const sc=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.toBlob(b=>b?res(b):rej(new Error('Não consegui preparar a imagem')),'image/jpeg',.85)};
    im.onerror=()=>rej(new Error('Não consegui abrir essa imagem'));im.src=r.result};r.readAsDataURL(file)})}
function postsTab(list){
  const who={name:(S.setup&&S.setup.nomeProf)||(S.acc&&S.acc.nome)||'',photo:S.setup&&S.setup.photo};
  return `${pubForm()}
   <div class="row-actions"><button class="btn sm ghost" data-xpro="p${S.acc.id}">Ver como as clientes veem</button></div>
   ${list.length?`<div class="posts">${list.map(x=>`<div class="post-own">${postCard(x,who)}<button class="btn sm ghost" data-delpost="${x.id}" aria-label="Excluir publicação">${ic('trash')}Excluir</button></div>`).join('')}</div>`:`<p class="note">Você ainda não publicou. A foto é opcional: pode publicar só com texto.</p>`}`;
}
function pubForm(){
  return `<div class="pubf"><textarea id="np-t" maxlength="1000" placeholder="Compartilhe uma novidade, promoção ou dica com suas clientes…" aria-label="Texto da publicação"></textarea>
   <div class="pubf-r"><label class="btn ghost sm">${ic('camera')}Foto (opcional)<input id="np-f" type="file" accept="image/jpeg,image/png,image/webp" hidden></label><span id="np-n" class="note"></span><button class="btn sm" type="button" data-postsend>Publicar</button></div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;if(t.id==='np-f'){const n=$('#np-n');if(n)n.textContent=t.files[0]?t.files[0].name:''}});
document.addEventListener('click',e=>{
  const t=e.target;let el;
  if(el=t.closest('[data-pptab]')){PP.tab=el.dataset.pptab;proPage();window.scrollTo(0,0);return}
  if(t.closest('[data-postsend]')){
    const txt=($('#np-t').value||'').trim(),f=$('#np-f').files[0];
    if(!txt&&!f){toast('Escreva algo ou escolha uma foto');return}
    act(async()=>{
      const blob=f?await resizeImg(f,1600):new Blob([]);
      await API('POST','/api/me/posts?texto='+encodeURIComponent(txt),blob,true);
      toast('Publicado!');closeSheet();if(CUR==='perfil')perfilPage();else meuPerfil()});
    return;
  }
  if(el=t.closest('[data-delpost]')){
    if(!el.dataset.sure){el.dataset.sure='1';el.textContent='Confirmar?';return}
    act(async()=>{await DEL('/api/me/posts/'+el.dataset.delpost);toast('Publicação excluída');meuPerfil()});return}
  if(el=t.closest('[data-adelpost]')){act(async()=>{await POST(`/api/admin/posts/${el.dataset.adelpost}/delete`);toast('Publicação removida');adminPage()});return}
});

function openPostSheet(){openSheet(`${closeBtn}<div class="body"><h2>Nova publicação</h2><p class="note" style="margin:0">A foto é opcional.</p>${pubForm()}</div>`)}
document.addEventListener('click',e=>{if(e.target.closest('[data-newpost]'))openPostSheet()});

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
  {const h=document.documentElement;h.classList.remove('rt');void h.offsetWidth;h.classList.add('rt');clearTimeout(route._t);route._t=setTimeout(()=>h.classList.remove('rt'),1100)}
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
