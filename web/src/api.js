/* ===== Estado e comunicação com o servidor (nada é salvo só no navegador) ===== */
let S={acc:null,setup:null,reg:null,favs:[],follows:[],interest:[],joined:[],counts:{notif:0,msgs:0},plans:{},cfg:{},q:''};
const CACHE=new Map();
const remember=l=>{(l||[]).forEach(x=>CACHE.set(x.id,x));return l||[]};
class ApiError extends Error{constructor(status,msg,fields){super(msg);this.status=status;this.fields=fields||{}}}
async function API(method,url,body,raw){
  const h={'X-BH':'1'};let b;
  if(raw){b=body;h['Content-Type']='application/octet-stream'}
  else if(body!==undefined){b=JSON.stringify(body);h['Content-Type']='application/json'}
  let r,j=null;
  const tries=method==='GET'?3:1;
  for(let n=0;n<tries;n++){
    try{r=await fetch(url,{method,headers:h,body:b,credentials:'same-origin'})}
    catch(e){r=null}
    if(r&&![502,503,504].includes(r.status))break;
    if(n<tries-1)await new Promise(ok=>setTimeout(ok,500*(n+1)+Math.random()*300));
  }
  if(!r)throw new ApiError(0,'Sem conexão com o servidor. Verifique sua internet e tente de novo.');
  try{j=await r.json()}catch(e){}
  if(!r.ok){
    if(r.status===401&&S.acc&&!url.startsWith('/api/auth/')){S.acc=null;S.setup=null;S.reg=null;go('entrar')}
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

/* rede de segurança: nenhum erro solto deixa a tela em branco ou mostra texto técnico */
addEventListener('unhandledrejection',e=>{e.preventDefault();console.error(e.reason)});
addEventListener('error',e=>{if(e&&e.target&&e.target.tagName==='IMG')return;console.error(e.error||e.message)});
/* imagem que não carrega (arquivo removido, rede ruim) some em vez de mostrar ícone quebrado */
document.addEventListener('error',e=>{const t=e.target;if(!t||t.tagName!=='IMG')return;t.style.visibility='hidden';const p=t.parentElement;if(p)p.classList.add('img-bad');const c=t.closest('.pc');if(c)c.classList.remove('has-cv')},true);
addEventListener('offline',()=>{try{toast('Você está sem internet. Assim que voltar, tudo continua de onde parou.')}catch(e){}});
addEventListener('online',()=>{try{toast('Conexão restabelecida.')}catch(e){}});
