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
