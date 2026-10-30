/* ===== Dados de exemplo (protótipo): um exemplar fictício de cada coisa. Em produção virão do banco de dados. ===== */
const rel=n=>{const d=new Date();d.setDate(d.getDate()+n);const p=x=>String(x).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const STATES = {PR:['Curitiba','São José dos Pinhais','Londrina'],SP:['São Paulo','Campinas'],RJ:['Rio de Janeiro','Niterói'],MG:['Belo Horizonte'],RS:['Porto Alegre'],SC:['Florianópolis']};

const PROS = [
 {id:'p1',atend:'estudio',raio:10,name:'Helena Duarte',role:'Educadora de Lash',tipo:'Educadoras',city:'Curitiba - PR',tags:['Volume Brasileiro','Mapeamento'],rating:4.9,reviews:128,verified:true,bio:'Educadora com foco em volume brasileiro e mapeamento, formando lash designers em turmas pequenas.',services:[{n:'Extensão de cílios – Fio a fio',p:180,d:150},{n:'Volume brasileiro',p:230,d:180},{n:'Remoção de extensão',p:60,d:45}]},
 {id:'p2',atend:'ambos',raio:15,name:'Camila Prado',role:'Lash Designer',tipo:'Lash Designers',city:'Curitiba - PR',tags:['Volume russo','Híbrido'],rating:4.8,reviews:96,verified:true,bio:'Especialista em volume russo e híbrido, com atendimento em estúdio próprio.',services:[{n:'Volume russo',p:260,d:210},{n:'Volume híbrido',p:220,d:180},{n:'Manutenção',p:130,d:90}]},
 {id:'p3',atend:'domicilio',raio:20,name:'Bianca Nogueira',role:'Lash Lifting e Brow',tipo:'Lash Designers',city:'São José dos Pinhais - PR',tags:['Lash lifting','Fio a fio'],rating:4.7,reviews:64,verified:false,bio:'Lash lifting com efeito natural e extensão fio a fio para o dia a dia.',services:[{n:'Lash lifting',p:150,d:60},{n:'Extensão de cílios – Fio a fio',p:170,d:120}]},
 {id:'p4',atend:'estudio',raio:10,name:'Larissa Moreira',role:'Lash Designer',tipo:'Lash Designers',city:'São Paulo - SP',tags:['Volume brasileiro','Volume russo'],rating:4.9,reviews:210,verified:true,bio:'Mapeamento personalizado e volumes sofisticados, com foco em durabilidade.',services:[{n:'Volume brasileiro',p:250,d:180},{n:'Volume russo',p:290,d:210},{n:'Remoção de extensão',p:70,d:45}]},
 {id:'p5',atend:'estudio',raio:10,name:'Fernanda Melo',role:'Palestrante',tipo:'Palestrantes',city:'Belo Horizonte - MG',tags:['Mercado','Vendas'],rating:4.8,reviews:41,verified:true,bio:'Palestrante sobre gestão de estúdio, atendimento e crescimento no mercado de cílios.',services:[{n:'Palestra para eventos e equipes',p:900,d:120},{n:'Mentoria de negócios',p:350,d:60}]}
];
const COURSES = [
 {id:'c1',title:'Especialização em Volume Brasileiro',desc:'Do mapeamento ao acabamento, com prática em modelo.',cat:'Especializações',by:'p1',city:'Curitiba - PR',date:rel(24),modal:'Presencial',nivel:'Intermediário',tags:['Volume Brasileiro','Mapeamento']}
];
const EVENTS = [
 {id:'e1',title:'Encontro Lash Sul 2026',desc:'Palestras, demonstrações e networking para profissionais de extensão de cílios.',cat:'Congresso',city:'Curitiba - PR',date:rel(16),end:rel(17),tags:['Palestras','Networking'],featured:true}
];
const CHAMPS = [
 {id:'k1',title:'Copa Lash Aurora 2026',desc:'Competição com categorias técnicas e premiação.',cat:'Competição',status:'Inscrições abertas',city:'São Paulo - SP',date:rel(40),modal:'Presencial',tags:['Fio a fio','Volume']}
];
const STORES = [
 {id:'s1',title:'Ateliê dos Cílios',desc:'Insumos e acessórios para lash designers.',cat:'Loja online',city:'Curitiba - PR',atend:'Atacado e varejo',envio:'Envio nacional',rating:4.9,reviews:210,tags:['Fios','Acessórios']}
];
const BRANDS = [
 {id:'m1',title:'Lumi Lash',desc:'Fios e adesivos desenvolvidos para o dia a dia do estúdio.',cat:'Marca oficial',city:'São Paulo - SP',atend:'Atacado e varejo',envio:'Envio nacional',rating:4.8,reviews:142,prods:['Fios','Adesivos'],tags:['Fios','Adesivos']}
];
const TECH = [
 {id:'t1',title:'Luminária LED para Atendimento',desc:'Iluminação precisa para conforto visual durante a aplicação.',cat:'Luzes e iluminação',marca:'Aurora Tech',price:499.9,rating:4.9,reviews:120,city:'Curitiba - PR',tags:['Iluminação']}
];
const MEETUPS = [
 {id:'u1',title:'Meetup Lash Curitiba',desc:'Encontro de profissionais para trocar experiências e criar parcerias.',cat:'Meetup',city:'Curitiba - PR',date:rel(12),going:32}
];
const GROUPS = [
 {id:'gr1',name:'Lash Designers Brasil',members:2184}
];
const THREADS = [
 {id:'d1',q:'Qual cola vocês estão usando?',by:'Camila Prado',when:'2h atrás',tag:'Lash Designers',replies:[['Helena Duarte','Uso uma de secagem rápida no verão e uma mais lenta quando a umidade está baixa.']]}
];

/* ===== Planos ===== */
const PLAN_DEFAULTS = {
 basico:{name:'Básico',price:49.9,perms:{proc:5,galeria:false,destaquePerfil:false,avaliacoes:false,agendamento:false,prioridade:false,selo:false,destaqueHome:false,newsletter:false,suporte:false}},
 profissional:{name:'Profissional',price:79.9,pop:true,perms:{proc:0,galeria:true,destaquePerfil:true,avaliacoes:true,agendamento:true,prioridade:true,selo:false,destaqueHome:false,newsletter:false,suporte:false}},
 premium:{name:'Premium',price:129.9,perms:{proc:0,galeria:true,destaquePerfil:true,avaliacoes:true,agendamento:true,prioridade:true,selo:true,destaqueHome:true,newsletter:true,suporte:true}}
};
const PERM_LABELS = {galeria:'Galeria de fotos e vídeos',destaquePerfil:'Perfil em destaque',avaliacoes:'Avaliações de clientes',agendamento:'Link de agendamento',prioridade:'Prioridade nas buscas',selo:'Selo de verificação',destaqueHome:'Destaque na home',newsletter:'Divulgação na newsletter',suporte:'Suporte prioritário'};

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
const SERVICES = {
 'Cílios':['Extensão de cílios – Fio a fio','Volume brasileiro','Volume russo','Volume híbrido','Lash lifting','Remoção de extensão']
};
const SPECIALTIES = ['Lash Designer','Educadora','Brow Designer','Esteticista','Nail Designer','Micropigmentadora'];

/* ===== Painel administrativo (exemplos) ===== */
const SEED_REGS = [
 {id:'r1',nome:'Ana Luiza Oliveira',tipo:'Profissional',cidade:'Curitiba - PR',plano:'profissional',data:rel(-2),status:'pendente'}
];
const SEED_REVIEWS = [
 {id:'v1',alvo:'Helena Duarte',autor:'Mariana Silva',nota:5,texto:'Atendimento impecável, resultado incrível.',status:'pendente'}
];
