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

/* ===== Estado (salvo apenas neste navegador) ===== */
const KEY='beautyhub-proto-v2';
let S=null;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
S=Object.assign({accounts:[],session:null,profiles:{},favs:[],follows:[],joined:[],interest:[],replies:{},user:null,regStatus:{},revStatus:{},feat:{},hidden:{},plans:null,q:''},S||{});
if(!S.accounts.some(a=>a.id===S.session))S.session=null;
S.user=S.session?(S.profiles[S.session]||null):null;
function save(){if(S.session)S.profiles[S.session]=S.user;try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
const PLANS=()=>S.plans||JSON.parse(JSON.stringify(PLAN_DEFAULTS));

function benefits(p){
  const x=p.perms,out=['Perfil com localização e contatos'];
  out.push(x.proc>0?`Até ${x.proc} procedimentos`:'Procedimentos ilimitados');
  out.push(x.galeria?'Galeria de fotos e vídeos':'Fotos do seu trabalho');
  ['destaquePerfil','avaliacoes','agendamento','prioridade','selo','destaqueHome','newsletter','suporte'].forEach(k=>{if(x[k])out.push(PERM_LABELS[k])});
  return out;
}

/* ===== Módulos e dados ===== */
const pro=id=>PROS.find(p=>p.id===id);
const DATA={
 educacao:COURSES.map(c=>({...c,mod:'educacao',byName:pro(c.by).name})),
 eventos:EVENTS.map(c=>({...c,mod:'eventos'})),
 campeonatos:CHAMPS.map(c=>({...c,mod:'campeonatos'})),
 lojas:STORES.map(c=>({...c,mod:'lojas'})),
 marcas:BRANDS.map(c=>({...c,mod:'marcas'})),
 tecnologia:TECH.map(c=>({...c,mod:'tecnologia'}))
};
const MEET=MEETUPS.map(m=>({...m,mod:'network',tags:[]}));
const ALL=[...Object.values(DATA).flat(),...MEET];
const byId=id=>ALL.find(i=>i.id===id)||PROS.find(p=>p.id===id);
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

const isFeat=it=>S.feat[it.id]!==undefined?S.feat[it.id]:!!it.featured;
const visible=it=>!S.hidden[it.id];
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const hay=it=>norm([it.title,it.desc,it.cat,it.city,it.byName,it.marca,(it.tags||[]).join(' '),(it.prods||[]).join(' '),it.status,it.name,it.role].join(' '));

/* ===== Cartões ===== */
function badgeOf(it){return it.mod==='educacao'?it.modal:it.mod==='campeonatos'?it.status:it.cat}
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
  return `<article class="card" data-open="${p.id}">
   <div class="mini"><div class="av lg">${initials(p.name)}</div><div class="grow"><h3 style="padding:0;font-size:28px"><button data-open="${p.id}">${esc(p.name)}</button></h3><small>${esc(p.role)}${p.verified?` · <span class="verified">${ic('shield')}Verificada</span>`:''}</small></div></div>
   <ul class="meta"><li>${ic('pin')}<span>${esc(p.city)}</span></li></ul>
   <div class="card-f"><span class="rate">${ic('star','fill')} ${rateTxt(p)} <span>(${p.reviews})</span></span><button class="btn sm" data-follow="${p.id}" aria-pressed="${f}">${f?'Seguindo':'Seguir'}</button></div></article>`;
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
