/* ============ la table : un document partagé, fusionné pièce par pièce ============
   Chaque personnage, chaque séance et chaque paragraphe du compte rendu porte sa date
   de modification : la plus récente gagne. Les jets s'ajoutent sans jamais s'écraser. */

const CLE_TABLE = 'faelorenn.table';
const CLE_MOI = 'faelorenn.table.moi';
const MAX_JETS = 400;

let T = videTable();
/* campagne : celle que ce navigateur suit. Chacun la sienne : l'un joue la première, l'autre la deuxième */
const MOI = {joueur:'', perso:'', seance:'', seanceFixee:false, campagne:'', mode:'d100', vuePnj:'fiches', des:'site'};
const SYNC = {poignee:null, nom:'', vu:0, dernier:0, etat:'local', erreur:'', ecrit:null, boucle:null};

function videTable(){ return {format:'faelorenn-table', version:1, nom:'', maj:0, campagnes:{}, personnages:{}, journal:{}, blocs:{}, pnj:{}, lieux:{}, liens:{}, positions:{}, rencontres:{}, adversaires:{}, missions:{}, objets:{}, argent:{}, tables:{}, hub:{}, oracle:null, jets:[], viderAvant:0}; }
/* objets : ce que chacun porte dans son sac, pièce par pièce. argent : chaque pièce qui entre ou sort de sa bourse.
   Chacun sa ligne, datée : deux joueurs qui achètent en même temps, les deux achats comptent.
   campagnes : plusieurs parties dans le même monde, chacune avec sa compagnie et ses séances */
const CLES_FUSION = ['campagnes','personnages','journal','blocs','pnj','lieux','liens','positions','rencontres','adversaires','missions','objets','argent','tables','hub'];
function nouvelId(p){ return (p || 'x') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
/* un nom donne son identifiant : deux joueurs qui créent « Nahya » chacun de leur côté créent la même fiche */
function slug(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x'; }
function idLibre(base, table){ return !table[base] || table[base].supprime ? base : base + '-' + Math.random().toString(36).slice(2, 6); }
const maintenant = () => Date.now();
/* le Registre de la Table et le Registre des Visages s'ouvrent chacun dans son onglet, toujours le même */
const ONGLET_TIRAGES = 'faelorenn-tirages';
const ONGLET_TABLE = 'faelorenn-table', ONGLET_VISAGES = 'faelorenn-visages', ONGLET_PROGRESSION = 'faelorenn-progression', ONGLET_MISSIONS = 'faelorenn-missions', ONGLET_FICHE = 'faelorenn-marchefleurs';
function ouvrirPage(url, onglet){
  let w = null;
  try{ w = window.open(url, onglet); }catch(e){ w = null; }
  if(!w) location.href = url;
  else try{ w.focus(); }catch(e){}
}

/* ---------- les PV et les PC : une base datée pour chacun, et les coups qui s'y ajoutent ----------
   Deux ordinateurs qui retirent des PV en même temps : les deux coups comptent. La base des PV (pv0)
   date de majPv, celle des PC (pc0) de majPc ; chaque coup est un événement daté, gardé s'il est plus
   récent que sa base, rejoué dans l'ordre du temps et borné par le maximum qu'il avait en tombant (m).
   Le maximum d'aujourd'hui a le dernier mot. Défaire un coup le marque (x), sans l'effacer. */
const GARDE_COUPS = 7 * 24 * 3600e3;
const depuisDe = (x, q) => q === 'pc' ? (x.majPc != null ? +x.majPc : +x.majPv || 0) : (+x.majPv || 0);
function normEvts(o, x){
  const m = {};
  if(o && typeof o === 'object') Object.keys(o).forEach(k => {
    const e = o[k];
    if(!e || typeof e !== 'object' || isNaN(+e.d) || isNaN(+e.t)) return;
    const q = e.q === 'pc' ? 'pc' : 'pv';
    if(x && +e.t <= depuisDe(x, q)) return;
    m[k] = {q:q, d:Math.round(+e.d), t:+e.t};
    if(e.m != null && !isNaN(+e.m)) m[k].m = +e.m;
    if(e.x) m[k].x = true;
  });
  return m;
}
function recalculerVie(x){
  const borne = (v, max) => max == null ? Math.max(0, v) : Math.max(0, Math.min(max, v));
  let pv = x.pvMax == null ? null : x.pv0 == null ? x.pvMax : Math.max(0, x.pv0);
  let pc = x.pcMax == null ? null : x.pc0 == null ? x.pcMax : Math.max(0, x.pc0);
  const dPv = depuisDe(x, 'pv'), dPc = depuisDe(x, 'pc');
  Object.keys(x.vie || {}).map(k => Object.assign({id:k}, x.vie[k]))
    .filter(e => !e.x && e.t > (e.q === 'pc' ? dPc : dPv))
    .sort((a, b) => (a.t - b.t) || (a.id < b.id ? -1 : 1))
    .forEach(e => {
      if(e.q === 'pc'){ if(pc != null) pc = borne(pc + e.d, e.m != null ? e.m : x.pcMax); }
      else if(pv != null) pv = borne(pv + e.d, e.m != null ? e.m : x.pvMax);
    });
  x.pv = pv == null ? null : borne(pv, x.pvMax);
  if(x.pcMax != null) x.pcc = borne(pc, x.pcMax);
  return x;
}
/* au-delà de quatre-vingts coups, ceux de plus d'une semaine rejoignent la base : le fichier ne grossit pas sans fin.
   Une semaine, c'est le temps qu'un ordinateur resté hors ligne a pour rendre les siens */
function compacter(x){
  const ks = Object.keys(x.vie || {});
  if(ks.length <= 80) return;
  const seuil = maintenant() - GARDE_COUPS;
  ['pv','pc'].forEach(q => {
    const vieux = {};
    ks.forEach(k => { const e = x.vie[k]; if(e.q === q && e.t <= seuil) vieux[k] = e; });
    if(!Object.keys(vieux).length) return;
    const b = recalculerVie(Object.assign({}, x, {vie:vieux}));
    if(q === 'pv'){ x.pv0 = b.pv; x.majPv = Math.max(depuisDe(x, 'pv'), seuil); }
    else { x.pc0 = b.pcc; x.majPc = Math.max(depuisDe(x, 'pc'), seuil); }
  });
  x.vie = normEvts(x.vie, x);
}
/* un coup : il s'ajoute à ce que les autres ont fait au même moment */
function coup(x, q, d){
  d = Math.round(+d || 0);
  if(!x || !d) return '';
  q = q === 'pc' ? 'pc' : 'pv';
  compacter(x);
  const id = nouvelId('v');
  const e = {q:q, d:d, t:Math.max(maintenant(), depuisDe(x, q) + 1)};
  const m = q === 'pc' ? x.pcMax : x.pvMax;
  if(m != null) e.m = m;
  x.vie = Object.assign({}, x.vie || {});
  x.vie[id] = e;
  recalculerVie(x);
  return id;
}
function annulerCoups(x, ids){
  if(!x || !ids || !ids.length) return;
  x.vie = Object.assign({}, x.vie || {});
  ids.forEach(id => { if(x.vie[id]) x.vie[id] = Object.assign({}, x.vie[id], {x:true}); });
  recalculerVie(x);
}
/* une nouvelle base, pour les PV, pour les PC, ou les deux : remettre au plein, une fiche qui entre.
   Ce qui est plus vieux qu'elle y est compris ; undefined laisse l'autre base telle quelle */
function baseVie(x, pv, pc){
  const t = maintenant();
  if(pv !== undefined){ x.pv0 = pv; x.majPv = t; }
  if(pc !== undefined && x.pcMax != null){ x.pc0 = pc; x.majPc = t; }
  x.vie = normEvts(x.vie, x);
  recalculerVie(x);
}
/* à la fusion : pour les PV comme pour les PC, la base la plus récente, et tous les coups d'après, des deux côtés */
function fondreVie(garde, autre){
  const recente = q => {
    const a = depuisDe(garde, q), b = depuisDe(autre, q);
    if(a !== b) return b > a ? autre : garde;
    /* à égalité parfaite, une règle fixe, pour que l'ordre de la fusion ne change rien */
    const va = q === 'pc' ? garde.pc0 : garde.pv0, vb = q === 'pc' ? autre.pc0 : autre.pv0;
    return vb != null && (va == null || vb < va) ? autre : garde;
  };
  const bPv = recente('pv');
  const r = Object.assign({}, garde, {pv0:bPv.pv0, majPv:depuisDe(bPv, 'pv')});
  if(garde.pcMax != null){ const bPc = recente('pc'); r.pc0 = bPc.pc0; r.majPc = depuisDe(bPc, 'pc'); }
  const vie = {};
  [garde.vie || {}, autre.vie || {}].forEach(m => Object.keys(m).forEach(k => {
    const e = m[k];
    if(!e || e.t <= depuisDe(r, e.q)) return;
    vie[k] = vie[k] ? (e.x && !vie[k].x ? Object.assign({}, vie[k], {x:true}) : vie[k]) : e;
  }));
  r.vie = vie;
  return recalculerVie(r);
}

/* ---------- forme d'un personnage ---------- */
function videPerso(){
  const car = {}, comp = {};
  CARS.forEach(c => car[c] = 8);
  ALLSKILLS.forEach(o => comp[o.s] = 16);
  return {id:nouvelId('p'), maj:0, joueur:'', nom:'', peuple:'', voie:'', sub:{}, campagne:'', campagneT:0,
    car:car, comp:comp, compCar:{}, bonusPratique:40, domaine:'', pratiques:[],
    pvMax:8, pv:8, pcMax:4, pcc:4, red:0, armes:[], sac:[], bourse:'', texte:'',
    traits:'', contrainte:'', armure:'', peupleComp:'',
    prog:{points:[], achats:[]}};
}
function normPerso(o){
  const c = videPerso();
  if(!o || typeof o !== 'object') return c;
  const txt = v => (v == null ? '' : String(v));
  const num = (v, d) => (v == null || isNaN(+v)) ? d : +v;
  c.id = typeof o.id === 'string' && o.id ? o.id : nouvelId('p');
  c.maj = num(o.maj, 0);
  c.majPv = num(o.majPv, 0);
  c.supprime = !!o.supprime;
  /* entré dans le monde : il n'est plus à la table, sa fiche de PNJ le continue dans le Registre des Visages */
  c.monde = txt(o.monde);
  c.mondeT = num(o.mondeT, 0);
  /* la campagne où il joue, avec sa propre date : sans elle (une fiche d'avant les campagnes), il est de la première */
  c.campagne = txt(o.campagne);
  c.campagneT = num(o.campagneT, 0);
  ['joueur','nom','peuple','voie','domaine','bourse','texte','traits','contrainte','armure','peupleComp'].forEach(k => c[k] = txt(o[k]));
  c.sub = o.sub && typeof o.sub === 'object' ? o.sub : {};
  CARS.forEach(x => c.car[x] = num(o.car && o.car[x], 8));
  ALLSKILLS.forEach(s => c.comp[s.s] = num(o.comp && o.comp[s.s], c.car[s.car] * 2));
  /* une compétence retirée dans le Registre des Compétences garde son total sur la fiche : si elle revient, il est là */
  if(o.comp && typeof o.comp === 'object'){
    let ajoutees = 0;
    Object.keys(o.comp).slice(0, 200).forEach(k => {
      if(ajoutees < 60 && k !== '__proto__' && k.length < 80 && !(k in c.comp) && o.comp[k] != null && !isNaN(+o.comp[k])){ c.comp[k] = +o.comp[k]; ajoutees++; }
    });
  }
  /* une compétence déplacée sous une autre caractéristique dans le Registre des Compétences : le total de la fiche suit,
     et ce qui a été gagné en jeu reste (un total vaut la caractéristique fois deux, plus ce qu'on y a mis).
     `compCar` dit sous quelle caractéristique chaque total déplacé est écrit : sans elle, c'est celle du livre */
  c.compCar = {};
  if(o.compCar && typeof o.compCar === 'object'){
    Object.keys(o.compCar).slice(0, 200).forEach(k => {
      if(k !== '__proto__' && k.length < 80 && CARS.indexOf(o.compCar[k]) >= 0 && Object.prototype.hasOwnProperty.call(c.comp, k)) c.compCar[k] = o.compCar[k];
    });
  }
  regVueCompetences().forEach(k => {
    if(!Object.prototype.hasOwnProperty.call(c.comp, k.cle)) return;
    /* un total écrit sur la fiche se déplace ; une compétence qui n'en a pas suit sa caractéristique toute seule */
    const ecrit = o.comp && typeof o.comp === 'object' && o.comp[k.cle] != null && !isNaN(+o.comp[k.cle]);
    const base = c.compCar[k.cle] || k.carLivre;
    if(ecrit && base && base !== k.car && c.car[base] != null && c.car[k.car] != null) c.comp[k.cle] += (c.car[k.car] - c.car[base]) * 2;
    if(k.car !== k.carLivre) c.compCar[k.cle] = k.car; else delete c.compCar[k.cle];
  });
  c.bonusPratique = num(o.bonusPratique, 40);
  c.pratiques = Array.isArray(o.pratiques) ? o.pratiques.slice(0, 40).map(p => ({
    n:txt(p && p.n), j:txt(p && p.j) || 'aucun jet', pc:num(p && p.pc, 0), pct:txt(p && p.pct),
    d:txt(p && p.d), base:!!(p && p.base), banniere:!!(p && p.banniere),
    /* une Pratique apprise en jeu garde son propre bonus : elle démarre à +20 */
    b:p && p.b != null && !isNaN(+p.b) ? +p.b : null, maitre:txt(p && p.maitre), dom:txt(p && p.dom)
  })).filter(p => p.n) : [];
  /* le jet que le livre donnait avant « une caractéristique par liste » : voir JETS_REALIGNES */
  c.pratiques.forEach(p => {
    const r = JETS_REALIGNES.find(x => x.de === p.j && clePratRealigne(x.n) === clePratRealigne(p.n) && (!x.txtDe || p.d === x.txtDe));
    if(r){ p.j = r.vers; if(r.txtVers) p.d = r.txtVers; }
  });
  /* une Pratique retouchée dans le Registre des Compétences : la fiche qui en est restée à une version d'avant prend la nouvelle,
     une fiche retouchée à la main ne bouge pas */
  c.pratiques.forEach(p => {
    const m = regMajCopie(p, c.domaine);
    if(m){ p.n = m.n; p.d = m.d; p.j = m.j; p.pc = m.pc; p.pct = m.pct || ''; p.base = !!m.base; }
  });
  c.pvMax = num(o.pvMax, num(o.pv, c.car.Constitution));
  c.pv = num(o.pv, c.pvMax);
  c.pcMax = num(o.pcMax, Math.floor(c.car.Contenance / 2));
  c.pcc = num(o.pcc, c.pcMax);
  /* une fiche d'avant les coups : ses PV et ses PC deviennent la base */
  c.pv0 = num(o.pv0, c.pv);
  c.pc0 = num(o.pc0, c.pcc);
  c.majPc = num(o.majPc, c.majPv);
  c.vie = normEvts(o.vie, c);
  recalculerVie(c);
  c.red = num(o.red, 0);
  c.armes = Array.isArray(o.armes) ? o.armes.slice(0, 20).map(a => ({nom:txt(a && a.nom), de:txt(a && a.de), notes:txt(a && a.notes),
    /* sa portée, en pas : vide, elle se lit sur le nom de l'arme */
    portee:(a && a.portee != null && a.portee !== '' && isFinite(+a.portee)) ? Math.max(0, Math.min(500, Math.round(+a.portee))) : null})).filter(a => a.nom) : [];
  /* ce qu'il parcourt en un round, en pas : vide, c'est dix */
  c.vitesse = (o.vitesse == null || o.vitesse === '' || isNaN(+o.vitesse)) ? null : Math.max(0, Math.min(200, Math.round(+o.vitesse)));
  c.sac = Array.isArray(o.sac) ? o.sac.slice(0, 80).map(txt).filter(Boolean) : [];
  const pg = o.prog && typeof o.prog === 'object' ? o.prog : {};
  /* un achat garde tout ce qu'il faut pour être défait, même après un rechargement */
  c.prog = {
    points: Array.isArray(pg.points) ? pg.points.filter(x => x && typeof x === 'object').map(x => ({
      id:txt(x.id) || nouvelId('g'), t:num(x.t, 0), quoi:txt(x.quoi), n:num(x.n, 0), bloc:txt(x.bloc), mission:txt(x.mission)})) : [],
    achats: Array.isArray(pg.achats) ? pg.achats.filter(x => x && typeof x === 'object').map(x => ({
      id:txt(x.id) || nouvelId('a'), t:num(x.t, 0), type:txt(x.type), cible:txt(x.cible), n:num(x.n, 1),
      jet:txt(x.jet), pc:num(x.pc, 0), pct:txt(x.pct), texte:txt(x.texte), detail:txt(x.detail), cout:num(x.cout, 0), bloc:txt(x.bloc),
      maitre:txt(x.maitre), dom:txt(x.dom), b:x.b == null || isNaN(+x.b) ? null : +x.b,
      ev:Array.isArray(x.ev) ? x.ev.filter(e => typeof e === 'string') : [],
      avant:x.avant && typeof x.avant === 'object' ? {nom:txt(x.avant.nom), de:txt(x.avant.de), notes:txt(x.avant.notes)} : null})) : []
  };
  return c;
}
/* une fiche sortie du Registre du Havre */
function depuisFiche(o){
  const c = normPerso({
    nom:o.nom, peuple:o.peuple, voie:o.voie, sub:o.sub, car:o.car, comp:o.comp, compCar:o.compCar,
    bonusPratique:o.bonusPratique, domaine:o.domaine, pratiques:o.pratiques,
    pvMax:o.pv, pv:o.pv, pcMax:o.pc, pcc:o.pc, red:o.red,
    armes:o.armes, sac:o.sac, bourse:o.bourse,
    traits:o.traits, contrainte:o.contrainte, armure:o.armure, peupleComp:o.peupleComp
  });
  c.joueur = MOI.joueur;
  baseVie(c, c.pvMax, c.pcMax);
  return c;
}

/* ---------- un paragraphe du compte rendu ---------- */
const TYPES_BLOC = ['narration','scene','dit','fait','encadre','achat','note','rencontre','oracle'];
const txtOu = v => (v == null ? '' : String(v));
function normJetBloc(j){
  if(!j || typeof j !== 'object') return null;
  return {id:txtOu(j.id), quoi:txtOu(j.quoi), mode:j.mode === 'd20' ? 'd20' : 'd100',
    jet:+j.jet || 0, seuil:j.seuil == null ? null : +j.seuil,
    reussite:!!j.reussite, critique:!!j.critique, echecCrit:!!j.echecCrit, marge:+j.marge || 0,
    note:txtOu(j.note), main:!!j.main, val:j.val == null ? null : +j.val, mod:+j.mod || 0,
    rea:j.rea === 'esquive' || j.rea === 'parade' ? j.rea : '', sans:!!j.sans};
}
function normVie(v){
  if(!v || typeof v !== 'object') return null;
  return {id:txtOu(v.id), nom:txtOu(v.nom), delta:+v.delta || 0, quoi:v.quoi === 'pc' ? 'pc' : 'pv',
    reste:v.reste == null || v.reste === '' ? null : +v.reste, max:v.max == null || v.max === '' ? null : +v.max};
}
function normBloc(o){
  o = o && typeof o === 'object' ? o : {};
  const q = o.qui && typeof o.qui === 'object' ? o.qui : {};
  const vies = Array.isArray(o.vies) ? o.vies : o.pv ? [o.pv] : [];
  return {
    id: txtOu(o.id) || nouvelId('b'), maj:+o.maj || 0, supprime:!!o.supprime,
    seance: txtOu(o.seance), ordre: +o.ordre || 0,
    type: TYPES_BLOC.indexOf(o.type) >= 0 ? o.type : 'narration',
    qui: {k: ['perso','pnj','mj'].indexOf(q.k) >= 0 ? q.k : 'mj', id:txtOu(q.id), nom:txtOu(q.nom)},
    texte: txtOu(o.texte), auteur: txtOu(o.auteur), rencontre: txtOu(o.rencontre),
    /* une réponse de l'oracle : sa plausibilité, le d20, la réponse, et si c'est le site qui a lancé */
    oracle: normOracleBloc(o.oracle),
    jet: normJetBloc(o.jet),
    degats: o.degats && typeof o.degats === 'object'
      ? {txt:txtOu(o.degats.txt), total:+o.degats.total || 0, des:txtOu(o.degats.des), double:!!o.degats.double} : null,
    vies: vies.map(normVie).filter(v => v && v.delta)
  };
}

/* ---------- les PNJ et leurs liens ---------- */
const PEUPLES_LIVRE = ['Humains','Élytris','Nyréens',"Ori'Ican",'Cimérans','Ilvès','Vaellen','Écorciens'];
const ATTITUDES = [{k:'amical', l:'Amical'}, {k:'neutre', l:'Neutre'}, {k:'mefiant', l:'Méfiant'}, {k:'hostile', l:'Hostile'}, {k:'inconnu', l:'On ne sait pas'}];
const STATUTS = [{k:'vivant', l:'En vie'}, {k:'mort', l:'Mort'}, {k:'disparu', l:'Disparu'}];
const TYPES_LIEN = [
  {k:'famille', l:'Famille', mutuel:false, ex:'grand-mère de'},
  {k:'amour', l:'Amour', mutuel:true, ex:'amoureux'},
  {k:'ami', l:'Amitié', mutuel:true, ex:'amis d’enfance'},
  {k:'allie', l:'Alliance', mutuel:true, ex:'font équipe'},
  {k:'mentor', l:'Maître et élève', mutuel:false, ex:'instructeur de'},
  {k:'travail', l:'Travail, service', mutuel:false, ex:'travaille pour'},
  {k:'dette', l:'Dette, promesse', mutuel:false, ex:'doit un service à'},
  {k:'rival', l:'Rivalité', mutuel:true, ex:'rivaux depuis l’enfance'},
  {k:'brouille', l:'Brouille', mutuel:true, ex:'ne se parlent plus depuis la dispute'},
  {k:'ennemi', l:'Hostilité', mutuel:true, ex:'veut sa peau'},
  {k:'autre', l:'Autre', mutuel:false, ex:'connaît'}
];
/* une attaque de PNJ : la sienne, ou celle de base de son espèce. « j » : la caractéristique qui la lance */
function normAtqPnj(a){
  if(!a || typeof a !== 'object' || !txtOu(a.n)) return null;
  return {n:txtOu(a.n).slice(0, 60), t:a.t === 'mag' ? 'mag' : 'phy', p:txtOu(a.p).slice(0, 40),
    e:txtOu(a.e).slice(0, 300), el:txtOu(a.el), ty:txtOu(a.ty).slice(0, 40),
    j:CARS.indexOf(a.j) >= 0 ? a.j : ''};
}
/* ses sept caractéristiques, d'office selon son rang : du corps, peu de tête, comme les monstres d'ailleurs.
   La table en tire ses valeurs comme pour un personnage : la caractéristique fois deux, plus le bonus du rang. */
const CAR_PNJ = {
  1:{'Force':6, 'Dextérité':8, 'Constitution':6, 'Intelligence':4, 'Sagesse':6, 'Charisme':5, 'Contenance':5},
  2:{'Force':9, 'Dextérité':9, 'Constitution':9, 'Intelligence':6, 'Sagesse':8, 'Charisme':7, 'Contenance':7},
  3:{'Force':12, 'Dextérité':11, 'Constitution':11, 'Intelligence':8, 'Sagesse':10, 'Charisme':9, 'Contenance':9},
  4:{'Force':14, 'Dextérité':12, 'Constitution':13, 'Intelligence':10, 'Sagesse':11, 'Charisme':10, 'Contenance':11},
  5:{'Force':17, 'Dextérité':14, 'Constitution':16, 'Intelligence':13, 'Sagesse':13, 'Charisme':12, 'Contenance':14}
};
const BONUS_PNJ = {1:10, 2:20, 3:30, 4:40, 5:50};
/* ce que son métier ajoute ou retire : un tireur est adroit, une brute est forte et lente d'esprit.
   « De son espèce » pousse la caractéristique sous laquelle sa Pratique se lance. */
const CAR_TYPE = {
  guerrier: {'Force':2, 'Constitution':1, 'Intelligence':-1, 'Charisme':-1},
  brute:    {'Force':3, 'Constitution':2, 'Dextérité':-1, 'Intelligence':-2, 'Charisme':-1},
  archer:   {'Dextérité':3, 'Sagesse':1, 'Force':-1, 'Charisme':-1},
  roublard: {'Dextérité':3, 'Charisme':1, 'Force':-1, 'Constitution':-1, 'Sagesse':-1},
  praticien:{'Contenance':3, 'Intelligence':2, 'Force':-2, 'Constitution':-1},
  meneur:   {'Charisme':3, 'Contenance':1, 'Sagesse':1, 'Force':-1, 'Dextérité':-1},
  soutien:  {'Sagesse':3, 'Contenance':1, 'Charisme':1, 'Force':-1, 'Dextérité':-1}
};
/* le genre de combattant qu'il est : il décide de son autre attaque. « De son espèce » prend une vraie
   Pratique de la liste de son peuple, plus forte que celle donnée d'office ; les autres genres tirent dans
   les attaques de ce genre, pour un peuple qui n'ouvre aucune liste, les Humains, ou pour un soldat
   qui se bat à l'arme plutôt qu'à la Pratique. */
const TYPES_PNJ = [
  {k:'espece', l:'De son espèce, une Pratique de sa liste', c:'de son espèce'},
  {k:'guerrier', l:'Combattant, au contact', c:'combattant'},
  {k:'brute', l:'Brute, elle renverse', c:'brute'},
  {k:'archer', l:'Tireur, à distance', c:'tireur'},
  {k:'roublard', l:'Roublard, en traître', c:'roublard'},
  {k:'praticien', l:'Praticien, une Pratique apprise ailleurs', c:'praticien'},
  {k:'meneur', l:'Meneur, il commande', c:'meneur'},
  {k:'soutien', l:'Soutien, il tient les autres debout', c:'soutien'}
];
const motType = k => { const x = TYPES_PNJ.find(y => y.k === k); return x ? x.c : ''; };
/* ses caractéristiques d'office : celles de son rang, corrigées par son métier. « jet » est la caractéristique
   sous laquelle son attaque d'espèce se lance, pour le genre « de son espèce ». */
function carsPnjDeRang(r, type, jet){
  const base = CAR_PNJ[r] || CAR_PNJ[2];
  let d = CAR_TYPE[type] || {};
  if(type === 'espece') d = Object.assign({'Intelligence':1, 'Force':-1}, CARS.indexOf(jet) >= 0 ? {[jet]:3} : {'Contenance':3});
  const out = {};
  CARS.forEach(x => { out[x] = Math.max(1, Math.min(40, base[x] + (d[x] || 0))); });
  return out;
}
/* sous quoi ses attaques se lancent : celle de son espèce d'abord, la sienne ensuite */
const jetDeFiche = (a1, a2) => (a1 && a1.j) || (a2 && a2.j) || '';
function normCarPnj(o, rang, type, jet){
  const base = carsPnjDeRang(rang, type, jet), out = {};
  CARS.forEach(x => {
    const v = o ? o[x] : null;
    out[x] = (v == null || v === '' || isNaN(+v)) ? base[x] : Math.max(1, Math.min(40, Math.round(+v)));
  });
  return out;
}
/* la valeur d'une de ses caractéristiques, sur cent : fois deux, plus le bonus de son rang */
function valCarPnj(p, x){
  const c = p && p.combat;
  if(!c || !c.car || c.car[x] == null) return null;
  return c.car[x] * 2 + (c.bonus || 0);
}
/* ce qu'il faut pour le faire se battre : son rang, sa réduction, ses dés, ses cartes, ses caractéristiques,
   l'attaque de base de son espèce et la sienne. « dans » et « seance » disent s'il est dans le combat du moment */
function normCombatPnj(c){
  if(!c || typeof c !== 'object') return null;
  const n = (v, max, def) => (v == null || v === '' || isNaN(+v)) ? def : Math.max(0, Math.min(max, Math.round(+v)));
  const rang = Math.min(5, Math.max(1, n(c.rang, 5, 2) || 2));
  const type = TYPES_PNJ.some(x => x.k === c.type) ? c.type : 'espece';
  const a1 = normAtqPnj(c.a1), a2 = normAtqPnj(c.a2);
  return {cote:c.cote === 'eux' ? 'eux' : 'nous', rang:rang,
    red:n(c.red, 10, 0), deg:txtOu(c.deg).slice(0, 20), cartes:Math.min(3, Math.max(1, n(c.cartes, 3, 1) || 1)),
    vit:(c.vit == null || c.vit === '' || isNaN(+c.vit)) ? null : Math.max(0, Math.min(200, Math.round(+c.vit))),
    car:normCarPnj(c.car, rang, type, jetDeFiche(a1, a2)), bonus:n(c.bonus, 100, BONUS_PNJ[rang] || 20),
    type:type,
    a1:a1, a1non:!!c.a1non, a2:a2, seance:txtOu(c.seance), dans:!!c.dans};
}
function normPnj(o){
  o = o && typeof o === 'object' ? o : {};
  const num = v => (v == null || v === '' || isNaN(+v)) ? null : Math.max(0, Math.round(+v));
  const p = {id:txtOu(o.id) || nouvelId('n'), maj:+o.maj || 0, majPv:+o.majPv || 0, supprime:!!o.supprime,
    nom:txtOu(o.nom), peuple:txtOu(o.peuple), role:txtOu(o.role), groupe:txtOu(o.groupe), lieu:txtOu(o.lieu),
    attitude: ATTITUDES.some(a => a.k === o.attitude) ? o.attitude : 'inconnu',
    statut: STATUTS.some(x => x.k === o.statut) ? o.statut : 'vivant',
    seance:txtOu(o.seance), texte:txtOu(o.texte), auteur:txtOu(o.auteur),
    valeurs: Array.isArray(o.valeurs) ? o.valeurs.filter(v => v && txtOu(v.n).trim()).slice(0, 20).map(v => ({n:txtOu(v.n).trim(), v:Math.max(0, Math.round(+v.v || 0))})) : [],
    pvMax:num(o.pvMax), pv:num(o.pv),
    /* l'année de sa naissance, dans le compte de la Réunion : son âge se lit par rapport au jour de la campagne,
       et deux campagnes qui ne se jouent pas au même moment ne lui donnent pas le même âge */
    ne:(o.ne == null || o.ne === '' || isNaN(+o.ne)) ? null : Math.round(+o.ne),
    /* un ancien personnage : le personnage d'où il vient */
    pj:txtOu(o.pj),
    /* ce qu'il faut pour le faire se battre : sa propre date, une retouche de sa fiche ne l'efface pas */
    combat:normCombatPnj(o.combat), majCombat:+o.majCombat || 0};
  p.pv0 = o.pv0 !== undefined ? num(o.pv0) : p.pv;
  p.vie = normEvts(o.vie, p);
  return recalculerVie(p);
}
/* les priorités d'un round : une carte par combattant, de la plus petite à la plus grande.
   « a » : il a déjà agi ce round */
function normInit(o){
  if(!o || typeof o !== 'object') return null;
  const c = Array.isArray(o.c) ? o.c.filter(x => x && typeof x === 'object').slice(0, 80).map(x => ({
    k:(x.k === 'perso' || x.k === 'pnj') ? x.k : 'adv', id:txtOu(x.id),
    n:Math.max(1, Math.round(+x.n) || 1), a:!!x.a})).filter(x => x.id) : [];
  if(!c.length) return null;
  c.sort((x, y) => x.n - y.n);
  return {r:Math.max(1, Math.round(+o.r) || 1), c:c};
}
/* une rencontre venue du Registre des Rencontres, et ceux qui la composent */
function normRencontre(o){
  o = o && typeof o === 'object' ? o : {};
  return {id:txtOu(o.id) || nouvelId('r'), maj:+o.maj || 0, supprime:!!o.supprime, seance:txtOu(o.seance), bloc:txtOu(o.bloc),
    titre:txtOu(o.titre), pourquoi:txtOu(o.pourquoi), fini:!!o.fini, auteur:txtOu(o.auteur)};
}
function normAdversaire(o){
  o = o && typeof o === 'object' ? o : {};
  const n = v => (v == null || v === '' || isNaN(+v)) ? 0 : Math.max(0, Math.round(+v));
  const a2 = o.a2 && typeof o.a2 === 'object' ? o.a2 : null;
  const x = {id:txtOu(o.id) || nouvelId('a'), maj:+o.maj || 0, majPv:+o.majPv || 0, supprime:!!o.supprime,
    rencontre:txtOu(o.rencontre), ordre:+o.ordre || 0, nom:txtOu(o.nom), rang:Math.min(5, Math.max(1, n(o.rang) || 1)),
    pvMax:n(o.pvMax), pv:n(o.pv), red:n(o.red), deg:txtOu(o.deg), cartes:n(o.cartes),
    a2: a2 && txtOu(a2.n) ? {n:txtOu(a2.n), t:a2.t === 'mag' ? 'mag' : 'phy', p:txtOu(a2.p), e:txtOu(a2.e), el:txtOu(a2.el), ty:txtOu(a2.ty).slice(0, 40)} : null,
    tr: Array.isArray(o.tr) ? o.tr.filter(x => typeof x === 'string').slice(0, 20) : [],
    traits:txtOu(o.traits), p:txtOu(o.p), renf:txtOu(o.renf),
    vit:(o.vit == null || o.vit === '' || isNaN(+o.vit)) ? null : Math.max(0, Math.min(200, Math.round(+o.vit))),
    /* d'où il vient : la créature du livre ou de ton bestiaire, son nom sans numéro, ses familles, ce qu'il laisse */
    cid:txtOu(o.cid), base:txtOu(o.base), fam: Array.isArray(o.fam) ? o.fam.filter(x => typeof x === 'string').slice(0, 20) : [],
    butin:txtOu(o.butin), fouille:normFouille(o.fouille),
    /* ses tables de butin partagées, telles qu'au moment où il est entré en scène */
    tables: Array.isArray(o.tables) ? o.tables.filter(t => t && typeof t === 'object').slice(0, 10)
      .map(t => ({k:txtOu(t.k), l:txtOu(t.l).slice(0, 60), lignes:txtOu(t.lignes).slice(0, 6000)})) : []};
  x.pv0 = o.pv0 != null && !isNaN(+o.pv0) ? n(o.pv0) : x.pv;
  x.vie = normEvts(o.vie, x);
  return recalculerVie(x);
}
/* ce qu'on a trouvé sur lui : pris par un personnage (fait), ou laissé là (laisse) */
function normFouille(f){
  if(!f || typeof f !== 'object' || (f.etat !== 'fait' && f.etat !== 'laisse')) return null;
  /* objet, argent : la pile du sac ou la ligne de bourse qu'elle a données, pour la défaire */
  return {etat:f.etat, texte:txtOu(f.texte), qui:txtOu(f.qui), bloc:txtOu(f.bloc), t:+f.t || 0, objet:txtOu(f.objet), argent:txtOu(f.argent)};
}
const typeLienOk = k => TYPES_LIEN.some(t => t.k === k) ? k : 'autre';

/* ---------- les missions du Havre ----------
   Ce que le Havre affiche au tableau : la commande (qui demande, quoi, où), la paie et les points annoncés avant le
   départ (Livre V), l'annonce qu'on lit le matin, les visages, la rencontre prévue, et le côté MJ.
   etat : au tableau, en cours (lancée dans une séance), bouclée, tombée à l'eau */
const ETATS_MISSION = ['tableau','cours','bouclee','ratee'];
function normMission(o){
  o = o && typeof o === 'object' ? o : {};
  const t = (v, n) => txtOu(v).slice(0, n || 4000);
  const g = MISSIONS.find(x => x.k === o.genre) || MISSIONS[1];
  const pts = o.points == null || o.points === '' || isNaN(+o.points) ? g.n : Math.max(0, Math.min(50, Math.round(+o.points)));
  const r = o.rencontre && typeof o.rencontre === 'object' ? o.rencontre : {};
  return {id:txtOu(o.id) || nouvelId('m'), maj:+o.maj || 0, supprime:!!o.supprime, auteur:t(o.auteur, 80),
    titre:t(o.titre, 120), genre:g.k, paie:o.paie == null ? g.paie : t(o.paie, 60), points:pts,
    qui:t(o.qui, 240), demande:t(o.demande, 240), ou:t(o.ou, 240),
    annonce:t(o.annonce), complication:t(o.complication, 1500), cache:t(o.cache, 1500), notes:t(o.notes),
    pnj: Array.isArray(o.pnj) ? o.pnj.filter(p => p && typeof p === 'object' && txtOu(p.nom).trim()).slice(0, 12).map(p => ({
      nom:t(p.nom, 80).trim(), role:t(p.role, 160), peuple:t(p.peuple, 40), texte:t(p.texte, 1500),
      attitude: ATTITUDES.some(a => a.k === p.attitude) ? p.attitude : 'inconnu'})) : [],
    rencontre:{inten: ['esc','ser','mor'].indexOf(r.inten) >= 0 ? r.inten : '', fam:t(r.fam, 60), note:t(r.note, 400)},
    etat: ETATS_MISSION.indexOf(o.etat) >= 0 ? o.etat : 'tableau',
    seance:t(o.seance, 80), lancee:+o.lancee || 0, fin:t(o.fin, 80), finie:+o.finie || 0, bloc:t(o.bloc, 80),
    gagnants:Math.max(0, Math.round(+o.gagnants || 0)), majEtat:+o.majEtat || 0};
}
/* où en est une mission a sa propre date : une retouche du texte faite ailleurs ne ramène pas une mission bouclée
   au tableau. Une mission retirée le reste, quoi qu'on ait écrit ailleurs depuis */
const CHAMPS_ETAT_MISSION = ['etat','seance','lancee','fin','finie','bloc','gagnants','majEtat'];
function fondreMission(garde, autre){
  if(garde.supprime || autre.supprime) return garde.supprime ? garde : autre;
  if((+autre.majEtat || 0) <= (+garde.majEtat || 0)) return garde;
  const x = Object.assign({}, garde);
  CHAMPS_ETAT_MISSION.forEach(c => { x[c] = autre[c]; });
  return x;
}
/* l'oracle : ce qu'un paragraphe en garde, et les seuils de la table */
function normOracleBloc(o){
  if(!o || typeof o !== 'object') return null;
  const p = PLAUSIBLES.some(x => x.k === o.p) ? o.p : 'neutre';
  const r = REPONSES_ORACLE.some(x => x.k === o.r) ? o.r : '';
  if(!r) return null;
  const d = Math.round(+o.d);
  return {p:p, r:r, d:isFinite(d) && d >= 1 && d <= 20 ? d : null, site:!!o.site, lieu:txtOu(o.lieu).slice(0, 160)};
}
function normReglagesOracle(o){
  if(!o || typeof o !== 'object' || !o.lignes || typeof o.lignes !== 'object') return null;
  const lignes = {};
  for(const x of PLAUSIBLES){ const b = bornesOk(o.lignes[x.k]); if(!b) return null; lignes[x.k] = b; }
  return {lignes:lignes, maj:+o.maj || 0};
}
/* un objet du sac : une pile (douze flèches), avec ce qu'il fait. armure et bouclier se portent */
const SORTES_OBJET = ['objet','conso','armure','bouclier'];
function normObjet(o){
  o = o && typeof o === 'object' ? o : {};
  const t = (v, n) => txtOu(v).slice(0, n);
  const sorte = SORTES_OBJET.indexOf(o.sorte) >= 0 ? o.sorte : 'objet';
  const n = Math.round(+o.n);
  return {id:txtOu(o.id) || nouvelId('o'), maj:+o.maj || 0, supprime:!!o.supprime, perso:t(o.perso, 120),
    nom:t(o.nom, 160).trim() || 'Un objet', n:isFinite(n) && n >= 1 ? Math.min(n, 999) : 1, sorte:sorte,
    red: sorte === 'armure' || sorte === 'bouclier' ? Math.max(0, Math.min(10, Math.round(+o.red || 0))) : 0,
    porte: (sorte === 'armure' || sorte === 'bouclier') && !!o.porte,
    effet:t(o.effet, 300), note:t(o.note, 400), origine:t(o.origine, 200),
    prix: o.prix == null || o.prix === '' || isNaN(+o.prix) ? null : Math.max(0, Math.round(+o.prix)),
    t:+o.t || 0};
}
/* une ligne de la bourse, en argents : positive quand elle entre, négative quand elle sort */
function normArgent(o){
  o = o && typeof o === 'object' ? o : {};
  const n = Math.round(+o.n);
  return {id:txtOu(o.id) || nouvelId('a'), maj:+o.maj || 0, supprime:!!o.supprime, perso:txtOu(o.perso).slice(0, 120),
    n:isFinite(n) ? Math.max(-1e6, Math.min(1e6, n)) : 0, motif:txtOu(o.motif).slice(0, 240),
    seance:txtOu(o.seance).slice(0, 80), bloc:txtOu(o.bloc).slice(0, 80), mission:txtOu(o.mission).slice(0, 80),
    t:+o.t || 0};
}
function normLien(o){
  o = o && typeof o === 'object' ? o : {};
  return {id:txtOu(o.id) || nouvelId('l'), maj:+o.maj || 0, supprime:!!o.supprime,
    de:txtOu(o.de), vers:txtOu(o.vers), type:typeLienOk(o.type),
    texte:txtOu(o.texte), mutuel:!!o.mutuel, notes:txtOu(o.notes),
    /* depuis quelle séance il est ce qu'il est, et pourquoi il l'est devenu */
    depuis:txtOu(o.depuis), raison:txtOu(o.raison), cree:+o.cree || 0,
    /* ce que le lien a été avant de changer en jeu : une amitié devenue brouille garde son passé,
       de quelle séance à quelle séance, et ce qui l'avait fait naître */
    hist: Array.isArray(o.hist) ? o.hist.filter(h => h && typeof h === 'object').slice(-20).map(h => ({
      type:typeLienOk(h.type), texte:txtOu(h.texte), mutuel:!!h.mutuel, de:txtOu(h.de), vers:txtOu(h.vers),
      depuis:txtOu(h.depuis), jusqua:txtOu(h.jusqua || h.seance), raison:txtOu(h.raison), t:+h.t || 0})) : []};
}

/* ---------- les campagnes ----------
   Plusieurs parties dans le même monde, sans en arrêter une pour en lancer une autre. Chacune a sa compagnie, ses séances
   et ses missions en cours ; le monde est commun : les PNJ et leurs liens, le tableau du Havre, le bestiaire.
   Un personnage et une séance portent la campagne où ils sont, avec une date à eux. Sans campagne (la table d'avant, ou
   une version qui ne les connaît pas), ils sont de la première. */
const ID_DEFAUT = 'c-principale';
function normCampagne(o){
  o = o && typeof o === 'object' ? o : {};
  return {id:txtOu(o.id) || nouvelId('c'), maj:+o.maj || 0, supprime:!!o.supprime,
    nom:txtOu(o.nom).replace(/\s+/g, ' ').trim().slice(0, 80) || 'Sans nom', majNom:+o.majNom || 0,
    creee:+o.creee || 0, auteur:txtOu(o.auteur).slice(0, 80),
    /* en cours, ou terminée : ses personnages sont alors entrés dans le monde */
    etat: o.etat === 'finie' ? 'finie' : 'cours', majEtat:+o.majEtat || 0, finie:+o.finie || 0,
    /* les jets d'avant cette date sont vidés, dans cette campagne seulement */
    jetsAvant:+o.jetsAvant || 0,
    /* où elle en est dans le monde : l'année de la Réunion et le jour dans l'année, avec leur propre date.
       Deux campagnes peuvent se jouer à dix ans d'écart, et les PNJ n'y ont pas le même âge. */
    an:(o.an == null || o.an === '' || isNaN(+o.an)) ? AN_DEFAUT : Math.max(0, Math.min(999999, Math.round(+o.an))),
    jour:(o.jour == null || o.jour === '' || isNaN(+o.jour)) ? 1 : Math.max(1, Math.min(JOURS_AN, Math.round(+o.jour))),
    majDate:+o.majDate || 0};
}
const parCreation = (a, b) => ((+a.creee || 0) - (+b.creee || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/* la première campagne : celle d'avant, sinon la plus ancienne. C'est là que va tout ce qui n'a pas de campagne */
function campagneDefautDans(t){
  const l = Object.keys((t && t.campagnes) || {}).map(k => t.campagnes[k]).filter(c => c && !c.supprime);
  return l.find(c => c.id === ID_DEFAUT) || l.sort(parCreation)[0] || null;
}
/* la campagne d'une fiche ou d'une séance : la sienne si elle existe encore, la première sinon ; '' s'il n'y en a aucune */
function campagneEffDans(t, id, def){
  const c = id && t.campagnes && t.campagnes[id];
  if(c && !c.supprime) return id;
  const d = def === undefined ? campagneDefautDans(t) : def;
  return d ? d.id : '';
}
/* la campagne d'un personnage ou d'une séance a sa propre date : la plus récente gagne, et « aucune » (une version
   d'avant qui a retouché la fiche sans la connaître) ne défait pas une campagne */
function fondreCampagneChamp(garde, autre){
  const a = +garde.campagneT || 0, b = +autre.campagneT || 0, ca = garde.campagne || '', cb = autre.campagne || '';
  let c = ca, t = a;
  if(b > a){ c = cb; t = b; }
  else if(b === a && ca !== cb && (!ca || (cb && cb < ca))){ c = cb; t = b; }
  if(c === ca && t === a) return garde;
  return Object.assign({}, garde, {campagne:c, campagneT:t});
}
/* le nom, l'état et la purge des jets d'une campagne ont chacun leur date : un nom changé ici ne défait pas
   une campagne close ailleurs */
function fondreCampagneRec(garde, autre){
  const x = Object.assign({}, garde);
  const tn = +garde.majNom || 0, un = +autre.majNom || 0;
  if(un > tn || (un === tn && autre.nom < garde.nom)){ x.nom = autre.nom; x.majNom = un; }
  const te = +garde.majEtat || 0, ue = +autre.majEtat || 0;
  if(ue > te || (ue === te && autre.etat < garde.etat)){ x.etat = autre.etat; x.majEtat = ue; x.finie = autre.finie; }
  x.jetsAvant = Math.max(+garde.jetsAvant || 0, +autre.jetsAvant || 0);
  x.creee = Math.min(+garde.creee || 0, +autre.creee || 0);
  /* le jour de jeu a sa propre date : un nom changé ailleurs ne remonte pas le temps */
  const td = +garde.majDate || 0, ud = +autre.majDate || 0;
  if(ud > td){ x.an = autre.an; x.jour = autre.jour; x.majDate = ud; }
  return x;
}

/* ---------- ce que la fiche donne ---------- */
function carD20(c, car){ return d20v(c.car[car] * 2); }
function compTotal(c, s){ return c.comp[s] != null ? c.comp[s] : c.car[CAR_DE[s]] * 2; }
/* les compétences qui suivent une caractéristique quand elle monte ou redescend : celles d'aujourd'hui, et celles que le Registre
   des Compétences a retirées mais dont la fiche garde le total (elles le retrouvent si elles reviennent) */
function compsSuivies(c){
  const out = ALLSKILLS.map(o => ({s:o.s, car:o.car})), vu = {};
  out.forEach(o => { vu[o.s] = 1; });
  regVueCompetences().forEach(k => {
    if(k.retire && !vu[k.cle] && Object.prototype.hasOwnProperty.call(c.comp, k.cle)) out.push({s:k.cle, car:k.car});
  });
  return out;
}
function pratValeur(c, p){
  if(JETS_SANS.indexOf(p.j) >= 0) return {jet:p.j, val:null, par:''};
  const propre = (c.car[p.j] || 8) * 2 + (p.b != null ? p.b : (c.bonusPratique || 40));
  const geste = GESTE[p.j] ? compTotal(c, GESTE[p.j]) : 0;
  return {jet:p.j, val:Math.max(propre, geste), par: geste > propre ? GESTE[p.j] : ''};
}
function pointsGagnes(c){ return (c.prog.points || []).reduce((a, x) => a + x.n, 0); }
function pointsDepenses(c){ return (c.prog.achats || []).reduce((a, x) => a + x.cout, 0); }
function pointsRestants(c){ return pointsGagnes(c) - pointsDepenses(c); }

/* ---------- fusion ---------- */
function fusionner(a, b){
  const out = videTable();
  out.maj = Math.max(a.maj || 0, b.maj || 0);
  out.nom = (b.maj || 0) > (a.maj || 0) ? (b.nom || a.nom || '') : (a.nom || b.nom || '');
  CLES_FUSION.forEach(k => {
    const m = {};
    Object.keys(a[k] || {}).forEach(id => m[id] = a[k][id]);
    Object.keys(b[k] || {}).forEach(id => {
      const x = b[k][id], y = m[id];
      if(!y){ m[id] = x; return; }
      let garde = (x.maj || 0) > (y.maj || 0) ? x : y;
      /* le sac et la bourse : à égalité de date, une règle fixe, pour que chaque ordinateur garde la même ligne */
      if((k === 'objets' || k === 'argent') && (x.maj || 0) === (y.maj || 0) && JSON.stringify(x) > JSON.stringify(y)) garde = x;
      const autre = garde === x ? y : x;
      /* les PV et les PC vivent leur propre vie pendant un combat : la base la plus récente, et tous les coups */
      if(k === 'personnages' || k === 'pnj' || k === 'adversaires') garde = fondreVie(garde, autre);
      /* entrer dans le monde, et en revenir, a sa propre date : une retouche de sa fiche faite ailleurs ne le ramène pas à la table */
      if(k === 'personnages' && (autre.mondeT || 0) > (garde.mondeT || 0)) garde = Object.assign({}, garde, {monde:autre.monde || '', mondeT:autre.mondeT});
      /* le lieu d'une séance a sa propre date : un titre changé ailleurs au même moment ne l'efface pas */
      if(k === 'journal' && (autre.majLieu || 0) > (garde.majLieu || 0)) garde = Object.assign({}, garde, {lieu:autre.lieu || '', majLieu:autre.majLieu});
      /* les cartes du round : celles du dernier tirage, d'où qu'il vienne */
      if(k === 'journal' && (autre.majInit || 0) > (garde.majInit || 0)) garde = Object.assign({}, garde, {init:autre.init || null, majInit:autre.majInit});
      /* la carte de combat, et les jetons dessus : chacun sa date */
      if(k === 'journal' && (autre.majCarte || 0) > (garde.majCarte || 0)) garde = Object.assign({}, garde, {carte:autre.carte || null, majCarte:autre.majCarte});
      if(k === 'journal' && (autre.majJetons || 0) > (garde.majJetons || 0)) garde = Object.assign({}, garde, {jetons:autre.jetons || {}, majJetons:autre.majJetons});
      /* ce que chacun subit : sa propre date, comme les jetons */
      if(k === 'journal' && (autre.majEtats || 0) > (garde.majEtats || 0)) garde = Object.assign({}, garde, {etats:autre.etats || {}, majEtats:autre.majEtats});
      /* ce qu'il faut pour se battre : sa propre date, comme les PV */
      if(k === 'pnj' && (autre.majCombat || 0) > (garde.majCombat || 0)) garde = Object.assign({}, garde, {combat:autre.combat || null, majCombat:autre.majCombat});
      if(k === 'missions') garde = fondreMission(garde, autre);
      if(k === 'campagnes') garde = fondreCampagneRec(garde, autre);
      /* la campagne d'un personnage ou d'une séance a sa propre date : une retouche faite ailleurs ne la change pas */
      if(k === 'personnages' || k === 'journal') garde = fondreCampagneChamp(garde, autre);
      m[id] = garde;
    });
    out[k] = m;
  });
  /* les seuils de l'oracle : les plus récents */
  out.oracle = a.oracle && b.oracle ? ((b.oracle.maj || 0) > (a.oracle.maj || 0) ? b.oracle : a.oracle) : (a.oracle || b.oracle || null);
  /* un historique vidé l'est chez tout le monde : ce qui est plus vieux que le coup de balai ne revient pas.
     Chaque campagne a le sien : vider les jets de l'une ne touche pas ceux de l'autre */
  out.viderAvant = Math.max(a.viderAvant || 0, b.viderAvant || 0);
  const def = campagneDefautDans(out);
  const camp = j => campagneEffDans(out, j.campagne, def);
  const avantDe = j => { const c = out.campagnes[camp(j)]; return c ? +c.jetsAvant || 0 : 0; };
  /* le même jet des deux côtés : celui qui dit sa campagne l'emporte (une version d'avant les campagnes recopie les jets sans elle) */
  const pris = {};
  (a.jets || []).concat(b.jets || []).forEach(j => { if(!j || !j.id) return; const p = pris[j.id]; if(!p || (!p.campagne && j.campagne)) pris[j.id] = j; });
  const jets = Object.keys(pris).map(k => pris[k]).filter(j => (j.t || 0) > out.viderAvant && (j.t || 0) > avantDe(j));
  jets.sort((x, y) => (x.t || 0) - (y.t || 0));
  /* quatre cents par campagne : une partie bavarde ne chasse pas l'historique d'une autre */
  const compte = {};
  out.jets = jets.reverse().filter(j => { const c = camp(j); compte[c] = (compte[c] || 0) + 1; return compte[c] <= MAX_JETS; }).reverse();
  return out;
}
function normTable(o){
  const t = videTable();
  if(!o || typeof o !== 'object') return t;
  t.nom = typeof o.nom === 'string' ? o.nom : '';
  t.maj = +o.maj || 0;
  t.viderAvant = +o.viderAvant || 0;
  Object.keys(o.campagnes || {}).forEach(id => { const c = normCampagne(o.campagnes[id]); c.id = id; t.campagnes[id] = c; });
  Object.keys(o.personnages || {}).forEach(id => {
    const c = normPerso(o.personnages[id]);
    c.id = id;
    t.personnages[id] = c;
  });
  Object.keys(o.journal || {}).forEach(id => {
    const e = o.journal[id] || {};
    t.journal[id] = {id:id, maj:+e.maj || 0, supprime:!!e.supprime, seance:String(e.seance == null ? '' : e.seance),
      date:String(e.date || ''), titre:String(e.titre || ''), texte:String(e.texte || ''), auteur:String(e.auteur || ''),
      /* où l'on est, pour l'oracle : « Un visage connu ? ». Il a sa propre date */
      lieu:String(e.lieu || '').slice(0, 160), majLieu:+e.majLieu || 0,
      /* la campagne dont c'est la séance, avec sa propre date */
      campagne:String(e.campagne || ''), campagneT:+e.campagneT || 0,
      /* les cartes du round en cours, avec leur propre date */
      init:normInit(e.init), majInit:+e.majInit || 0,
      /* la carte de combat et les jetons posés dessus, chacun avec sa propre date */
      carte:normCarte(e.carte), majCarte:+e.majCarte || 0,
      jetons:normJetons(e.jetons), majJetons:+e.majJetons || 0,
      /* ce que chacun subit, et où en est celui qui est à terre : leur propre date */
      etats:normEtats(e.etats), majEtats:+e.majEtats || 0,
      /* le jour de jeu où cette séance s'ouvre */
      jourJeu:(e.jourJeu == null || e.jourJeu === '' || isNaN(+e.jourJeu)) ? null : Math.max(0, Math.round(+e.jourJeu))};
  });
  Object.keys(o.blocs || {}).forEach(id => { const b = normBloc(o.blocs[id]); b.id = id; t.blocs[id] = b; });
  Object.keys(o.tables || {}).forEach(id => { const x = normTableTirage(o.tables[id]); x.id = id; t.tables[id] = x; });
  Object.keys(o.pnj || {}).forEach(id => { const p = normPnj(o.pnj[id]); p.id = id; t.pnj[id] = p; });
  Object.keys(o.liens || {}).forEach(id => { const l = normLien(o.liens[id]); l.id = id; t.liens[id] = l; });
  Object.keys(o.rencontres || {}).forEach(id => { const r = normRencontre(o.rencontres[id]); r.id = id; t.rencontres[id] = r; });
  Object.keys(o.adversaires || {}).forEach(id => { const a = normAdversaire(o.adversaires[id]); a.id = id; t.adversaires[id] = a; });
  Object.keys(o.missions || {}).forEach(id => { const m = normMission(o.missions[id]); m.id = id; t.missions[id] = m; });
  Object.keys(o.hub || {}).forEach(k => { const x = normHub(o.hub[k]); if(x) t.hub[k] = x; });
  Object.keys(o.lieux || {}).forEach(id => { const x = normLieu(o.lieux[id]); x.id = id; t.lieux[id] = x; });
  t.oracle = normReglagesOracle(o.oracle);
  Object.keys(o.objets || {}).forEach(id => { const x = normObjet(o.objets[id]); x.id = id; t.objets[id] = x; });
  Object.keys(o.argent || {}).forEach(id => { const x = normArgent(o.argent[id]); x.id = id; t.argent[id] = x; });
  Object.keys(o.positions || {}).forEach(r => {
    const p = o.positions[r];
    if(p && isFinite(+p.x) && isFinite(+p.y)) t.positions[r] = {x:+p.x, y:+p.y, maj:+p.maj || 0, supprime:!!p.supprime};
  });
  /* une séance écrite avant les paragraphes : son texte devient le premier, sous un nom fixe
     pour que deux joueurs qui l'ouvrent ne le recopient pas deux fois */
  Object.keys(t.journal).forEach(id => {
    const e = t.journal[id];
    const cle = 'b-ancien-' + id;
    if(e.texte && !t.blocs[cle]) t.blocs[cle] = normBloc({id:cle, maj:e.maj, seance:id, ordre:0, type:'narration', texte:e.texte, auteur:e.auteur});
  });
  t.jets = (Array.isArray(o.jets) ? o.jets : []).filter(j => j && j.id).map(j => ({
    id:String(j.id), t:+j.t || 0, auteur:String(j.auteur || ''), perso:String(j.perso || ''),
    quoi:String(j.quoi || ''), formule:String(j.formule || ''), jet:+j.jet || 0, seuil:j.seuil == null ? null : +j.seuil,
    mode:String(j.mode || 'd20'), reussite:!!j.reussite, note:String(j.note || ''), main:!!j.main,
    campagne:String(j.campagne || '')
  }));
  /* quatre cents par campagne, comme à la fusion : le fichier lu n'est pas tronqué plus court que la table d'ici */
  const defJ = campagneDefautDans(t), compteJ = {};
  t.jets = t.jets.reverse().filter(j => { const c = campagneEffDans(t, j.campagne, defJ); compteJ[c] = (compteJ[c] || 0) + 1; return compteJ[c] <= MAX_JETS; }).reverse();
  return t;
}

/* ---------- ce navigateur ---------- */
let MOI_VU = {};   /* les réglages tels qu'on les a lus ou écrits : ce qui a bougé depuis vient de cet onglet */
const copie = o => JSON.parse(JSON.stringify(o));
/* les réglages gardés par un autre onglet : on les prend, sauf ceux que cet onglet vient de changer */
function adopterMoi(r){
  if(!r || typeof r !== 'object') return;
  Object.keys(r).forEach(k => { if(JSON.stringify(MOI[k]) === JSON.stringify(MOI_VU[k])) MOI[k] = r[k]; });
}
function sauverLocal(){
  /* un autre onglet a pu garder la table entre-temps : on fond sa copie avant d'écrire la nôtre */
  try{ const r = localStorage.getItem(CLE_TABLE); if(r) T = fusionner(T, normTable(JSON.parse(r))); }catch(e){}
  try{ localStorage.setItem(CLE_TABLE, JSON.stringify(T)); }catch(e){}
  try{
    adopterMoi(JSON.parse(localStorage.getItem(CLE_MOI) || 'null'));
    localStorage.setItem(CLE_MOI, JSON.stringify(MOI));
    MOI_VU = copie(MOI);
  }catch(e){}
}
function chargerLocal(){
  try{ const r = localStorage.getItem(CLE_TABLE); if(r) T = normTable(JSON.parse(r)); }catch(e){}
  try{ const r = localStorage.getItem(CLE_MOI); if(r) Object.assign(MOI, JSON.parse(r)); }catch(e){}
  MOI_VU = copie(MOI);
}

/* toute modification passe par là : on date, on garde, on envoie au fichier */
function changer(fn){
  fn();
  T.maj = maintenant();
  sauverLocal();
  planifierEcriture();
  dessiner();
}
/* vie : seuls les PV et les PC ont bougé. On ne date qu'eux, pour qu'une fiche retouchée
   ailleurs au même moment ne soit pas écrasée par un coup reçu ici */
function majPerso(c, vie){
  /* vie : les PV et les PC écrits tels quels deviennent la nouvelle base */
  if(vie) baseVie(c, c.pv, c.pcc);
  else c.maj = maintenant();
  T.personnages[c.id] = c;
}
/* un bouton dessiné plus tôt touche la fiche d'aujourd'hui : une fusion venue d'ailleurs a pu la remplacer depuis */
function surPerso(id, fn, vie){
  changer(() => { const c = T.personnages[id]; if(!c || c.supprime) return; fn(c); majPerso(c, vie); });
}

/* ---------- le fichier partagé ---------- */
const FSA = () => typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';

function ouvrirBase(){
  return new Promise((ok, ko) => {
    const r = indexedDB.open('faelorenn-table', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('cle'); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}
function garderPoignee(h){
  return ouvrirBase().then(db => new Promise((ok) => {
    const tx = db.transaction('cle', 'readwrite');
    tx.objectStore('cle').put(h, 'fichier');
    tx.oncomplete = () => ok(true);
    tx.onerror = () => ok(false);
  })).catch(() => false);
}
function reprendrePoignee(){
  return ouvrirBase().then(db => new Promise((ok) => {
    const tx = db.transaction('cle', 'readonly');
    const q = tx.objectStore('cle').get('fichier');
    q.onsuccess = () => ok(q.result || null);
    q.onerror = () => ok(null);
  })).catch(() => null);
}
function oublierPoignee(){
  return ouvrirBase().then(db => new Promise((ok) => {
    const tx = db.transaction('cle', 'readwrite');
    tx.objectStore('cle').delete('fichier');
    tx.oncomplete = () => ok(true);
    tx.onerror = () => ok(false);
  })).catch(() => false);
}

function attacher(h, nom){
  if(SYNC.etat === 'github') ghTableArreter();
  SYNC.poignee = h;
  SYNC.nom = nom || (h && h.name) || 'table.json';
  SYNC.etat = 'fichier';
  SYNC.erreur = '';
  garderPoignee(h);
  demarrerBoucle();
  return lireFichier(true).then(() => ecrireFichier());
}
function detacher(){
  SYNC.poignee = null; SYNC.nom = ''; SYNC.etat = 'local'; SYNC.vu = 0;
  if(SYNC.boucle){ clearInterval(SYNC.boucle); SYNC.boucle = null; }
  oublierPoignee();
  dessiner();
}

function lireFichier(force){
  if(!SYNC.poignee) return Promise.resolve(false);
  return SYNC.poignee.getFile().then(f => {
    if(!force && f.lastModified === SYNC.vu) return false;
    SYNC.vu = f.lastModified;
    return f.text().then(txt => {
      if(!txt.trim()) return false;
      let o = null;
      try{ o = JSON.parse(txt); }catch(e){ SYNC.erreur = 'Le fichier n’est pas lisible.'; dessiner(); return false; }
      if(!o || o.format !== 'faelorenn-table'){ SYNC.erreur = 'Ce fichier n’est pas une table Faelorenn.'; dessiner(); return false; }
      SYNC.erreur = '';
      T = fusionner(T, normTable(o));
      SYNC.dernier = maintenant();
      sauverLocal();
      dessiner();
      return true;
    });
  }).catch(e => {
    SYNC.erreur = (e && e.name === 'NotAllowedError') ? 'Le navigateur a repris la main sur le fichier : reconnecte-le.' : 'Le fichier n’a pas pu être lu.';
    dessiner();
    return false;
  });
}

/* on relit, on fusionne, puis on écrit : deux joueurs ne s'effacent pas */
function ecrireFichier(){
  if(!SYNC.poignee) return Promise.resolve(false);
  return SYNC.poignee.getFile()
    .then(f => f.text().then(txt => {
      if(txt.trim()){
        try{
          const o = JSON.parse(txt);
          if(o && o.format === 'faelorenn-table') T = fusionner(T, normTable(o));
        }catch(e){}
      }
      return SYNC.poignee.createWritable();
    }))
    .then(w => w.write(JSON.stringify(T, null, 1)).then(() => w.close()))
    .then(() => SYNC.poignee.getFile())
    .then(f => {
      SYNC.vu = f.lastModified;
      SYNC.dernier = maintenant();
      SYNC.erreur = '';
      sauverLocal();
      dessiner();
      return true;
    })
    .catch(e => {
      SYNC.erreur = (e && e.name === 'NotAllowedError') ? 'Le navigateur a repris la main sur le fichier : reconnecte-le.' : 'L’écriture dans le fichier a échoué.';
      dessiner();
      return false;
    });
}
function planifierEcriture(){
  if(SYNC.etat === 'github'){ ghPlanifier(); return; }
  if(!SYNC.poignee) return;
  clearTimeout(SYNC.ecrit);
  SYNC.ecrit = setTimeout(ecrireFichier, 900);
}
function demarrerBoucle(){
  if(SYNC.boucle) clearInterval(SYNC.boucle);
  SYNC.boucle = setInterval(() => { if(SYNC.poignee && !document.hidden) lireFichier(false); }, 4000);
}

/* au chargement : on retrouve le fichier de la dernière fois s'il nous laisse entrer */
function reprendreFichier(){
  if(!FSA()) return Promise.resolve(false);
  return reprendrePoignee().then(h => {
    if(!h) return false;
    if(!h.queryPermission) return false;
    return h.queryPermission({mode:'readwrite'}).then(p => {
      if(p === 'granted'){ SYNC.poignee = h; SYNC.nom = h.name; SYNC.etat = 'fichier'; demarrerBoucle(); return lireFichier(true); }
      SYNC.poignee = h; SYNC.nom = h.name; SYNC.etat = 'attente';
      dessiner();
      return false;
    });
  }).catch(() => false);
}
function redemander(){
  if(!SYNC.poignee || !SYNC.poignee.requestPermission) return;
  SYNC.poignee.requestPermission({mode:'readwrite'}).then(p => {
    if(p === 'granted'){ SYNC.etat = 'fichier'; demarrerBoucle(); lireFichier(true).then(ecrireFichier); }
    else { SYNC.erreur = 'Sans autorisation, le fichier reste fermé.'; dessiner(); }
  });
}

/* ---------- le .json qu'on s'envoie ---------- */
function tableJson(){ return JSON.stringify(T, null, 1); }
function importerTable(txt){
  let o = null;
  try{ o = JSON.parse(txt); }catch(e){ return {ok:false, msg:'Ce fichier n’est pas lisible.'}; }
  if(!o || typeof o !== 'object') return {ok:false, msg:'Ce fichier n’est pas lisible.'};
  if(o.format === 'faelorenn-personnage'){
    const c = depuisFiche(o);
    const deja = persoALaTable(c.nom);
    if(deja) return {ok:false, msg:'« ' + (c.nom || 'Sans nom') + ' » est déjà ' + dejaALaTable(deja) + '. Pour le remplacer, retire d’abord l’ancien.'};
    c.id = idLibre('p-' + slug(c.nom), T.personnages);
    rattacher(c);
    changer(() => majPerso(c));
    return {ok:true, msg:'« ' + (c.nom || 'Sans nom') + ' » est entré dans la table' + (plusieursCampagnes() ? ' de « ' + nomCampagne(idCourante()) + ' »' : '') + '.'};
  }
  if(o.format !== 'faelorenn-table') return {ok:false, msg:'Ce fichier n’est ni une table ni une fiche Faelorenn.'};
  /* une table jouée à part a ses propres « séance 1 » : les fondre telles quelles mélangerait deux parties */
  const homonymes = seancesHomonymes(normTable(o));
  if(homonymes.length) return {ok:false, msg:'Ce fichier a ses propres séances : sa « séance ' + (T.journal[homonymes[0]].seance || '?') + ' » n’est pas celle d’ici, elle n’a aucun paragraphe en commun. Pour l’ajouter comme une campagne de plus, c’est « Ajouter une table comme campagne », sous la liste des campagnes.'};
  const vivants = m => Object.keys(m).filter(k => m[k] && !m[k].supprime).length;
  const compte = () => ({p:vivants(T.personnages), b:vivants(T.blocs), n:vivants(T.pnj), l:vivants(T.liens), m:vivants(T.missions), o:vivants(T.objets)});
  const avant = compte();
  changer(() => { T = fusionner(T, normTable(o)); });
  const apres = compte(), np = apres.p - avant.p, nb = apres.b - avant.b, nn = apres.n - avant.n, nl = apres.l - avant.l, nm = apres.m - avant.m, no = apres.o - avant.o;
  const bouts = [];
  if(nm > 0) bouts.push(nm + ' mission' + (nm > 1 ? 's' : ''));
  if(no > 0) bouts.push(no + ' objet' + (no > 1 ? 's' : '') + ' dans les sacs');
  if(np > 0) bouts.push(np + ' personnage' + (np > 1 ? 's' : ''));
  if(nb > 0) bouts.push(nb + ' paragraphe' + (nb > 1 ? 's' : '') + ' de séance');
  if(nn > 0) bouts.push(nn + ' fiche' + (nn > 1 ? 's' : '') + ' de PNJ');
  if(nl > 0) bouts.push(nl + ' lien' + (nl > 1 ? 's' : ''));
  const liste = bouts.length > 1 ? bouts.slice(0, -1).join(', ') + ' et ' + bouts[bouts.length - 1] : bouts.join('');
  return {ok:true, msg: bouts.length ? 'Table fusionnée : ' + liste + ' de plus.' : 'Table fusionnée, rien de neuf.'};
}
