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
