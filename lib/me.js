'use strict';
const cfg = require('./config');
const D = require('./domain');
const { maskTel, maskDoc } = require('./validate');

const WK = { rua: '', num: '', bairro: '', cidade: '', uf: '', cep: '' };

function regJson(accId, plans = D.plansMap()) {
  const r = D.one('SELECT * FROM registrations WHERE account_id=?', accId);
  if (!r) return null;
  return {
    id: r.id, tipo: r.tipo, nome: r.nome, descricao: r.descricao, plan: r.plan, cycle: r.cycle,
    status: r.status, pay_status: r.pay_status, paid_until: r.paid_until, payOk: D.payOk(r), active: D.regActive(r),
    data: r.created_at.slice(0, 10), amount: plans[r.plan] ? D.planAmount(plans[r.plan], r.cycle) : 0
  };
}

function setupJson(acc) {
  const s = D.one('SELECT * FROM setups WHERE account_id=?', acc.id);
  const services = D.all('SELECT nome n, preco p, duracao d FROM services WHERE account_id=? ORDER BY pos, id', acc.id);
  const gallery = D.all('SELECT id, file url FROM photos WHERE account_id=? ORDER BY id', acc.id);
  if (!s) {
    return { done: false, photo: '', rua: '', num: '', bairro: '', cidade: '', uf: '', cep: '', lat: null, lng: null, pref: [], nomeProf: '', spec: '', anos: '', bio: '',
      doc: maskDoc(acc.doc), atend: 'estudio', mesmo: true, w: { ...WK }, raio: 10, services: [], dias: [2, 3, 4, 5, 6], abre: '09:00', fecha: '18:00', pagto: ['Pix'],
      wa: maskTel(acc.tel), ig: '', agenda: '', gallery };
  }
  return {
    done: !!s.done, photo: s.photo, rua: s.rua, num: s.num, bairro: s.bairro, cidade: s.cidade, uf: s.uf, cep: s.cep, lat: s.lat, lng: s.lng,
    pref: D.json(s.pref, []), nomeProf: s.nome_prof, spec: s.spec, anos: s.anos, bio: s.bio, doc: maskDoc(acc.doc),
    atend: s.atend, mesmo: !!s.mesmo, w: { ...WK, ...D.json(s.w, {}) }, raio: s.raio, services,
    dias: D.json(s.dias, []), abre: s.abre, fecha: s.fecha, pagto: D.json(s.pagto, []), wa: maskTel(s.wa), ig: s.ig, agenda: s.agenda, gallery
  };
}

function counters(accId) {
  return {
    notif: D.one('SELECT COUNT(*) n FROM notifications WHERE account_id=? AND read=0', accId).n,
    msgs: D.one(`SELECT COUNT(*) n FROM messages m JOIN conversations c ON c.id=m.conv_id
      WHERE m.read_at IS NULL AND m.sender_id<>? AND (c.a_id=? OR c.b_id=?)`, accId, accId, accId).n
  };
}

function meJson(acc) {
  const plans = D.plansMap();
  const base = { cfg: { contactEmail: cfg.contactEmail, payments: !!cfg.mpToken }, plans };
  if (!acc) return { account: null, ...base };
  const ints = D.all(`SELECT i.listing_id id, l.mod FROM interests i JOIN listings l ON l.id=i.listing_id WHERE i.account_id=?`, acc.id);
  return {
    ...base,
    account: { id: acc.id, nome: acc.nome, email: acc.email, tel: acc.tel, doc: acc.doc, obj: acc.obj, papel: acc.papel, role: acc.role, isPro: D.isProAcc(acc) },
    setup: setupJson(acc),
    reg: regJson(acc.id, plans),
    favs: D.all('SELECT ref FROM favorites WHERE account_id=?', acc.id).map(r => r.ref),
    follows: D.all('SELECT pro_id FROM follows WHERE account_id=?', acc.id).map(r => 'p' + r.pro_id),
    interest: ints.filter(i => i.mod !== 'network').map(i => 'l' + i.id),
    joined: [
      ...ints.filter(i => i.mod === 'network').map(i => 'm:l' + i.id),
      ...D.all('SELECT group_id FROM group_members WHERE account_id=?', acc.id).map(g => 'g:g' + g.group_id)
    ],
    counts: counters(acc.id)
  };
}
module.exports = { meJson, setupJson, regJson, counters };
