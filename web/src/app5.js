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
const greet=()=>{const h=new Date().getHours();return h<5?'Boa madrugada':h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'};
setInterval(()=>{const k=document.querySelector('.ap-hero .kk');if(k&&k.textContent!==greet())k.textContent=greet()},30000);
document.addEventListener('visibilitychange',()=>{const k=document.querySelector('.ap-hero .kk');if(k)k.textContent=greet()});
const brl0=n=>'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});

/* ----- peças visuais ----- */
const logoRow=()=>`<div class="ap-logo">${logoMark(true)}<b>Beauty Hub</b></div>`;
function avatarHTML(photo,name,cls=''){return `<div class="ap-av ${cls}">${photo?`<img src="${esc(photo)}" alt="">`:(name?`<span>${esc(initials(name))}</span>`:ic('user'))}</div>`}
function tabbar(cur){
 const T=[['home','home','Home'],['agendamentos','cal','Agendamentos'],['mensagens','chat','Mensagens'],['perfil','user','Perfil']];
 return `<nav class="tabbar" aria-label="Principal">${T.map(([r,i,l])=>`<button data-go="${r}" ${cur===r?'aria-current="page"':''}>${ic(i)}<span>${l}</span>${r==='mensagens'&&S.counts.msgs?`<em class="cnt">${S.counts.msgs}</em>`:''}</button>`).join('')}</nav>`;
}
/* ===================== CONFIGURAR PERFIL ===================== */
let P=null,PE={},SUG={},srchT,cepT,qT;
function newSetup(){
 const a=myAcc()||{},old=mySetup();
 const base={photo:'',banner:'',rua:'',num:'',bairro:'',cidade:'',uf:'',cep:'',lat:null,lng:null,pref:[],
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
function addrBlock(t){
 const k=s=>t?t+'.'+s:s,tg=t||'main';
 return `<button type="button" class="xloc" data-xloc="${tg}">${ic('locate')}Usar minha localização atual</button>
 <div class="xf"><div class="xsearch">${ic('search')}<input type="search" data-xbusca="${tg}" placeholder="Buscar endereço" autocomplete="off" aria-label="Buscar endereço"></div><div class="xsug" id="x-sug-${tg}"></div></div>
 ${xf(k('rua'),'Rua/Avenida',{ph:'Rua/Avenida',req:1,auto:'street-address'})}${xf(k('num'),'Número',{ph:'Número',req:1,mode:'numeric'})}${xf(k('bairro'),'Bairro')}
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
  ${pro?`<div class="ap-banner${P.banner?' has':''}"${P.banner?` style="background-image:url('${esc(P.banner)}')"`:''}><div class="ap-bn-a"><label class="ap-bn-b" for="x-banner">${ic('camera')}<span>${P.banner?'Trocar banner':'Adicionar banner'}</span><input id="x-banner" type="file" accept="image/*" hidden></label>${P.banner?`<button type="button" class="ap-bn-x" data-xdelbanner aria-label="Remover banner">${ic('trash')}</button>`:''}</div></div>`:''}
  <div class="ap-who${pro?' ovl':''}"><label class="ap-photo" for="x-photo">${avatarHTML(P.photo,'','xl')}<span class="cam">${ic('camera')}</span><input id="x-photo" type="file" accept="image/*" hidden></label>
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
function readBanner(f){
 if(!f)return;if(!/^image\//.test(f.type)){toast('Escolha uma imagem');return}
 const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
  const W=1280,Hh=427,c=document.createElement('canvas');c.width=W;c.height=Hh;
  const k=Math.max(W/im.width,Hh/im.height),sw=W/k,sh=Hh/k;
  c.getContext('2d').drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,0,0,W,Hh);
  c.toBlob(b=>act(async()=>{const r=await API('POST','/api/me/banner',b,true);P.banner=r.banner;if(S.setup)S.setup.banner=r.banner;setupPage(true);toast('Banner atualizado')}),'image/jpeg',.85)};
  im.onerror=()=>toast('Não consegui abrir essa imagem');im.src=r.result};
 r.readAsDataURL(f);
}
function readPhoto(f){
 if(!f)return;if(!/^image\//.test(f.type)){toast('Escolha uma imagem');return}
 const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
  const s=640,c=document.createElement('canvas');c.width=c.height=s;const m=Math.min(im.width,im.height);
  c.getContext('2d').drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,s,s);
  c.toBlob(b=>act(async()=>{const r=await API('POST','/api/me/photo',b,true);P.photo=r.photo;if(S.setup)S.setup.photo=r.photo;setupPage(true);toast('Foto atualizada')}),'image/jpeg',.85)};
  im.onerror=()=>toast('Não consegui abrir essa imagem');im.src=r.result};
 r.readAsDataURL(f);
}
function addrErrors(o,pre,E,nomeLocal){
 if(!o.rua.trim())E[pre+'rua']='Informe a rua ou avenida.';
 if(!o.num.trim())E[pre+'num']='Informe o número (ou S/N).';
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
const HF=()=>({ver:false,atend:'',pmin:'',pmax:'',rmin:0,spec:[],svc:[],city:'',pag:[],dia:[],hoje:false,anos:'',rev:false,novo:false,fotos:false,wa:false,agenda:false});
const H=Object.assign({q:'',cat:'',sort:'near',all:false},HF());
const hCount=()=>{let n=0;if(H.ver)n++;if(H.atend)n++;if(H.pmin!==''||H.pmax!=='')n++;if(H.rmin)n++;if(H.spec.length)n++;if(H.svc.length)n++;if(H.city.trim())n++;if(H.pag.length)n++;if(H.dia.length)n++;if(H.hoje)n++;if(H.anos)n++;if(H.rev)n++;if(H.novo)n++;if(H.fotos)n++;if(H.wa)n++;if(H.agenda)n++;return n};
const minPrice=p=>p.services.length?Math.min(...p.services.map(s=>s.p)):1e9;
let PROS_LIST=[],loadSeq=0;
async function loadPros(){
 const seq=++loadSeq,q=new URLSearchParams();
 if(H.cat)q.set('cat',H.cat);if(H.q.trim())q.set('q',H.q.trim());if(H.ver)q.set('ver','1');q.set('sort',H.sort);
 if(H.atend)q.set('atend',H.atend);if(H.pmin!=='')q.set('pmin',H.pmin);if(H.pmax!=='')q.set('pmax',H.pmax);if(H.rmin)q.set('rmin',H.rmin);
 if(H.spec.length)q.set('spec',H.spec.join(','));if(H.svc.length)q.set('svc',H.svc.join(','));if(H.city.trim())q.set('city',H.city.trim());
 if(H.pag.length)q.set('pag',H.pag.join(','));if(H.dia.length)q.set('dia',H.dia.join(','));if(H.anos)q.set('anos',H.anos);
 ['hoje','rev','novo','fotos','wa','agenda'].forEach(k=>{if(H[k])q.set(k,'1')});
 const r=await GET('/api/pros?'+q);
 if(seq===loadSeq)PROS_LIST=remember(r.items);
}
const homeList=()=>PROS_LIST;
function proCardApp(p){
 const f=S.favs.includes(p.id),top=p.services.slice(0,2).map(s=>s.n.replace('Extensão de cílios – ','')),mp=minPrice(p);
 return `<article class="pc${p.cover?' has-cv':''}" data-xpro="${p.id}" tabindex="0" role="button" aria-label="Ver ${esc(p.name)}">
  ${p.cover?`<img class="pc-cv" src="${esc(p.cover)}" alt="" loading="lazy">`:avatarHTML(p.photo,p.name)}<div class="pc-b"><h3>${esc(p.name)}${p.own?' <em>você</em>':''}</h3><small>${esc(p.role)}${p.verified?` · <span class="verified">${ic('shield')}Verificada</span>`:''}</small>
  <div class="pc-m">${p.rating?`<span class="rate">${ic('star','fill')} ${rateTxt(p)} <span>(${p.reviews})</span></span>`:'<span class="novo">Novo</span>'}<span>${ic('pin')}${esc(p.city)}</span></div>
  <div class="pc-t">${top.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>
  <div class="pc-r"><button class="pc-fav ${f?'on':''}" data-fav="${p.id}" aria-pressed="${f}" aria-label="${f?'Remover dos favoritos':'Salvar nos favoritos'}">${ic('heart')}</button>${mp<1e9?`<small>a partir de</small><b>${brl0(mp)}</b>`:''}</div></article>`;
}
function homeListHTML(){
 const L=homeList(),show=(H.all||DESK())?L:L.slice(0,4);
 const emp=hCount()?'Nenhuma profissional com esses filtros. Tente remover algum.':H.cat?'Nenhuma profissional nesta categoria por enquanto.':H.sort==='fav'?'Você ainda não favoritou ninguém. Toque no coração de uma profissional para salvar.':'Nenhuma profissional encontrada.';
 return (show.length?show.map(proCardApp).join(''):`<div class="ap-empty">${ic('eyel')}<p>${emp}</p></div>`)+(!H.all&&!DESK()&&L.length>4?`<button class="btn ghost ap-more" data-xall>Ver todas (${L.length})</button>`:'');
}
async function homePage(){
 await act(loadPros);
 const a=myAcc()||{},pro=isPro(a),st=mySetup(),cur=CATS.find(c=>c[0]===H.cat);
 const sorts=[['near','Perto de você'],['fav','Favoritos'],['price','Preço (menor)'],['rate','Melhor avaliação']];
 app().innerHTML=header('home')+`<main class="wrap">
  <section class="ap-hero">${lashArc()}<span class="kk">${greet()}</span><h1>${esc(firstName())}</h1>
   <p>${pro?'Como está o seu estúdio hoje?':'Encontre quem cuida do seu olhar.'}</p>
   <div class="ap-search">${ic('search')}<input id="x-q" type="search" placeholder="Buscar serviço ou profissional" value="${esc(H.q)}" aria-label="Buscar serviço ou profissional"><button class="fl" data-xfilter aria-label="Filtros${hCount()?' ('+hCount()+' ativos)':''}">${ic('sliders')}${hCount()?`<i class="fl-n">${hCount()}</i>`:''}</button></div></section>
  ${pro&&st?`<div class="ap-pro"><div>${ic('eyel')}<span><b>${esc(st.nomeProf||a.nome)}</b><small>${(st.services||[]).length} serviço${(st.services||[]).length===1?'':'s'} · ${esc(st.cidade)} - ${esc(st.uf)}</small></span></div><button class="btn sm ghost" data-go="configurar-perfil">Editar</button></div>`:''}
  <div class="ap-sh"><h2>Explore por categoria</h2></div>
  <div class="tiles">${CATS.map(([k,l,i])=>`<button class="tile" ${k[0]==='@'?`data-go="${k.slice(1)}"`:`data-xcat="${k}" aria-pressed="${H.cat===k}"`}><span class="ti">${ic(i)}</span><span class="tl">${l}</span></button>`).join('')}</div>
  <div class="xchips sorts" role="group" aria-label="Ordenar">${sorts.map(([k,l])=>`<button class="xchip lg" data-xsort="${k}" aria-pressed="${H.sort===k}">${l}</button>`).join('')}</div>
  <div class="ap-sh"><h2>${cur?cur[1]:'Especialistas em destaque'}</h2><button class="lk2" data-xall>${H.all?'Ver menos':'Ver todos'} ${ic('arrow')}</button></div>
  <div id="x-list" class="pcs">${homeListHTML()}</div></main>`+footer();
}
const FSPEC=SPECIALTIES.filter(x=>x!=='Palestrante');
const FSVC=(SERVICES['Cílios']||[]).map(n=>[n.replace('Extensão de cílios – ',''),n.replace('Extensão de cílios – ','')]);
const FCHIP=(items,sel,attr)=>`<div class="xchips">${items.map(([v,l])=>`<button type="button" class="xchip" ${attr}="${esc(v)}" aria-pressed="${sel.includes(v)}">${esc(l)}</button>`).join('')}</div>`;
const FTOG=(k,label)=>`<label class="xck"><input type="checkbox" data-xtog="${k}" ${H[k]?'checked':''}><span>${label}</span></label>`;
function openFilter(){
 const sorts=[['near','Perto de você'],['price','Menor preço'],['rate','Melhor avaliação']];
 openSheet(`${closeBtn}<div class="body xfs"><h2>Filtros</h2>
  <span class="xcap">Ordenar por</span>
  <div class="xchips">${sorts.map(([k,l])=>`<button class="xchip lg" data-xsortf="${k}" aria-pressed="${H.sort===k}">${l}</button>`).join('')}</div>
  <span class="xcap">Tipo de atendimento</span>
  <div class="xchips">${[['','Qualquer'],['estudio','No estúdio'],['domicilio','A domicílio']].map(([v,l])=>`<button type="button" class="xchip" data-xf-atend="${v}" aria-pressed="${H.atend===v}">${l}</button>`).join('')}</div>
  <span class="xcap">Faixa de preço (R$)</span>
  <div class="xrange"><input type="number" inputmode="numeric" min="0" step="10" placeholder="De" data-xf-pmin value="${esc(H.pmin)}" aria-label="Preço mínimo"><span>até</span><input type="number" inputmode="numeric" min="0" step="10" placeholder="Até" data-xf-pmax value="${esc(H.pmax)}" aria-label="Preço máximo"></div>
  <span class="xcap">Avaliação mínima</span>
  <div class="xchips">${[[0,'Todas'],[3,'3+ ★'],[4,'4+ ★'],[4.5,'4,5+ ★'],[5,'5 ★']].map(([v,l])=>`<button type="button" class="xchip" data-xf-rmin="${v}" aria-pressed="${H.rmin===v}">${l}</button>`).join('')}</div>
  <span class="xcap">Especialidade</span>${FCHIP(FSPEC.map(x=>[x,x]),H.spec,'data-xf-spec')}
  <span class="xcap">Serviço oferecido</span>${FCHIP(FSVC,H.svc,'data-xf-svc')}
  <span class="xcap">Cidade ou bairro</span>
  <input class="xin" type="search" placeholder="Ex.: São José de Ribamar" data-xf-city value="${esc(H.city)}" aria-label="Cidade">
  <span class="xcap">Atende nos dias</span>${FCHIP(DIAS.map((d,i)=>[String(i),d]),H.dia.map(String),'data-xf-dia')}
  ${FTOG('hoje','Aberta agora')}
  <span class="xcap">Experiência mínima</span>
  <div class="xchips">${[['','Qualquer'],...ANOS.slice(1).map(a=>[a,a])].map(([v,l])=>`<button type="button" class="xchip" data-xf-anos="${esc(v)}" aria-pressed="${H.anos===v}">${l}</button>`).join('')}</div>
  <span class="xcap">Formas de pagamento aceitas</span>${FCHIP(PAGTO.map(x=>[x,x]),H.pag,'data-xf-pag')}
  <span class="xcap">Perfil</span>
  ${FTOG('ver','Mostrar apenas perfis verificados')}${FTOG('rev','Apenas com avaliações de clientes')}${FTOG('novo','Apenas profissionais novas (sem avaliações)')}${FTOG('fotos','Apenas com fotos no perfil')}${FTOG('wa','Com WhatsApp para contato')}${FTOG('agenda','Com link de agendamento')}
  <div class="row-actions xfa"><button class="btn" data-xf-apply>${xfLabel()}</button><button class="btn ghost" data-xclear>Limpar filtros</button></div></div>`);
}
const xfLabel=()=>PROS_LIST.length?`Ver ${PROS_LIST.length} resultado${PROS_LIST.length===1?'':'s'}`:'Nenhum resultado';
let xfT;
function xfRefresh(now){
 clearTimeout(xfT);
 xfT=setTimeout(async()=>{
  await act(loadPros);
  const b=$('#x-list');if(b)b.innerHTML=homeListHTML();
  const ap=document.querySelector('[data-xf-apply]');if(ap)ap.textContent=xfLabel();
  const fl=document.querySelector('.ap-search .fl');if(fl){const n=hCount();fl.querySelector('.fl-n')?.remove();if(n)fl.insertAdjacentHTML('beforeend',`<i class="fl-n">${n}</i>`)}
 },now?0:300);
}
function xfSet(el,fn){fn();H.all=false;el.closest('.xchips')&&el.closest('.xchips').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===el?'true':'false'));xfRefresh(true)}
function xfToggle(el,arr){const v=el.dataset[Object.keys(el.dataset)[0]],i=arr.indexOf(v);i>=0?arr.splice(i,1):arr.push(v);el.setAttribute('aria-pressed',i<0);H.all=false;xfRefresh(true)}
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
 if(t.closest('[data-xdelbanner]')){act(async()=>{await DEL('/api/me/banner');P.banner='';if(S.setup)S.setup.banner='';setupPage(true);toast('Banner removido')});return}
 if(t.closest('[data-xfilter]')){openFilter();return}
 if(el=t.closest('[data-xsortf]')){xfSet(el,()=>{H.sort=el.dataset.xsortf});return}
 if(el=t.closest('[data-xf-atend]')){xfSet(el,()=>{H.atend=el.dataset.xfAtend});return}
 if(el=t.closest('[data-xf-rmin]')){xfSet(el,()=>{H.rmin=+el.dataset.xfRmin});return}
 if(el=t.closest('[data-xf-anos]')){xfSet(el,()=>{H.anos=el.dataset.xfAnos});return}
 if(el=t.closest('[data-xf-spec]')){xfToggle(el,H.spec);return}
 if(el=t.closest('[data-xf-svc]')){xfToggle(el,H.svc);return}
 if(el=t.closest('[data-xf-pag]')){xfToggle(el,H.pag);return}
 if(el=t.closest('[data-xf-dia]')){const v=el.dataset.xfDia,i=H.dia.indexOf(+v);i>=0?H.dia.splice(i,1):H.dia.push(+v);el.setAttribute('aria-pressed',i<0);xfRefresh(true);return}
 if(t.closest('[data-xf-apply]')){closeSheet();homePage();return}
 if(el=t.closest('[data-xcat]')){H.cat=H.cat===el.dataset.xcat?'':el.dataset.xcat;H.all=false;homePage();return}
 if(el=t.closest('[data-xsort]')){H.sort=el.dataset.xsort;H.all=false;if(el.hasAttribute('data-xclose'))closeSheet();homePage();return}
 if(t.closest('[data-xall]')){H.all=!H.all;homePage();return}
 if(t.closest('[data-xclear]')){H.sort='near';Object.assign(H,HF());H.cat='';H.q='';H.all=false;closeSheet();homePage();return}
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
 if(t.hasAttribute&&t.hasAttribute('data-xf-pmin')){H.pmin=t.value===''?'':String(Math.max(0,+t.value));xfRefresh();return}
 if(t.hasAttribute&&t.hasAttribute('data-xf-pmax')){H.pmax=t.value===''?'':String(Math.max(0,+t.value));xfRefresh();return}
 if(t.hasAttribute&&t.hasAttribute('data-xf-city')){H.city=t.value;xfRefresh();return}
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
 if(t.id==='x-banner'){readBanner(t.files[0]);return}
 if(t.id==='b-svc'||t.id==='b-dt'){refreshSlots();return}
 if(d.xver!==undefined){H.ver=t.checked;homePage();return}
 if(d.xtog){H[d.xtog]=t.checked;H.all=false;xfRefresh(true);return}
 if(d.xsvc){const [i,f]=d.xsvc.split(':');P.services[+i][f]=t.value;return}
 if(d.px==='mesmo'){P.mesmo=t.checked;setupPage(true)}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.pc[data-xpro]')){e.preventDefault();PP.tab='pubs';go('profissional/'+e.target.dataset.xpro)}});
