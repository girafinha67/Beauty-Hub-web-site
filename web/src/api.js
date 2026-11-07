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
