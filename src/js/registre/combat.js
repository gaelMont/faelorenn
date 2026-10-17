/* ============ le combat : une rencontre du Registre des Rencontres, suivie dans la séance ============
   Le Registre des Rencontres pose la rencontre validée dans ce navigateur (CLE_ENVOI) ; la table la
   prend, l'écrit dans la séance en cours et suit les PV de ceux d'en face. Le reste, le récit,
   c'est vous qui l'écrivez autour. Le même tirage se fait aussi ici, à côté du récit (rencontre.js). */

const CLE_ENVOI = 'faelorenn.envoi.rencontre';
const ENVOI = {attente:null};
let FIN_ARMEE = '';
let ADV_SUPPR = '';

function rencontresDe(sid){
  return Object.keys(T.rencontres).map(k => T.rencontres[k]).filter(r => r && !r.supprime && r.seance === sid)
    .sort((a, b) => ((T.blocs[a.bloc] || {}).ordre || a.maj) - ((T.blocs[b.bloc] || {}).ordre || b.maj));
}
function adversairesDe(rid){
  return Object.keys(T.adversaires).map(k => T.adversaires[k]).filter(a => a && !a.supprime && a.rencontre === rid)
    .sort((x, y) => (x.ordre - y.ordre) || (x.id < y.id ? -1 : 1));
}
function unAdversaire(id){ const a = id && T.adversaires[id]; return a && !a.supprime ? a : null; }
/* toutes les rencontres pas finies de la séance affichée : des renforts envoyés à part restent en face avec les autres */
function rencontresEnCours(){ const e = seanceCourante(); return e ? rencontresDe(e.id).filter(r => !r.fini) : []; }
function combatEnCours(){ const l = rencontresEnCours(); return l.length ? l[l.length - 1] : null; }
function adversairesEnCombat(){ return rencontresEnCours().reduce((acc, r) => acc.concat(adversairesDe(r.id)), []); }
const aTerre = a => a.pvMax > 0 && a.pv <= 0;

/* « Bandit de route (×2), Sergent du Sang » */
function listeNoms(liste){
  const n = {}, ordre = [];
  liste.forEach(x => { if(!n[x]){ n[x] = 0; ordre.push(x); } n[x]++; });
  return ordre.map(x => x + (n[x] > 1 ? ' (×' + n[x] + ')' : '')).join(', ');
}

/* ce qu'un adversaire envoyé devient à la table : d'où il vient, son nom sans numéro, ce qu'il laisse */
function champsAdv(a){
  return {rang:a.r, pvMax:a.pvMax, pv:a.pv, red:a.red, deg:a.deg, cartes:a.cartes, a2:a.a2, tr:a.tr, traits:a.traits, p:a.p, renf:a.renf,
    cid:a.cid, base:a.n, fam:a.fam, butin:a.butin, tables:a.tables};
}
/* les noms en face restent uniques dans le combat : un autre « Loup de bordure » prend le numéro d'après,
   même si l'on en a retiré un entre-temps, et même s'il vient d'une autre rencontre en cours */
const nomSansNumero = a => a.base || String(a.nom || '').replace(/ \d+$/, '');
function enJeu(sid){
  const ids = rencontresDe(sid).filter(r => !r.fini).map(r => r.id);
  return Object.keys(T.adversaires).map(k => T.adversaires[k]).filter(x => x && ids.indexOf(x.rencontre) >= 0);
}
function nommer(adv, pris){
  const max = {}, deja = {}, neufs = {}, vus = {};
  pris.forEach(x => {
    const b = nomSansNumero(x), m = / (\d+)$/.exec(x.nom || '');
    deja[b] = 1;
    max[b] = Math.max(max[b] || 0, m && x.nom !== b ? +m[1] : 1);
  });
  adv.forEach(a => { neufs[a.n] = (neufs[a.n] || 0) + 1; });
  return adv.map(a => {
    if(!deja[a.n] && neufs[a.n] === 1) return a.n;
    vus[a.n] = (vus[a.n] || 0) + 1;
    return a.n + ' ' + ((max[a.n] || 0) + vus[a.n]);
  });
}
/* la rencontre entre dans une séance ; ses identifiants viennent d'elle et de la séance : deux onglets ne la posent
   pas deux fois, et la même composition renvoyée à la séance suivante y entre bien */
/* l'identifiant d'une séance tel qu'il entre dans ceux d'une rencontre : court, et jamais le même pour deux séances
   (le nom d'une campagne peut être long : « s-campagne-solo-d-oceane-1 » et « …-2 » ne se distinguent qu'au bout) */
function courtDeSeance(id){
  const s = String(id).replace(/[^\w-]/g, '');
  if(s.length <= 20) return s;
  let h = 0;
  for(let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return s.slice(0, 12) + '-' + (h >>> 0).toString(36);
}
function poserRencontre(o, e){
  e = e || seanceCourante();
  if(!e) return '';
  const base = String(o.id || nouvelId('x')).replace(/[^\w-]/g, '').slice(0, 40) + '-' + courtDeSeance(e.id);
  const rid = 'r-' + base;
  if(T.rencontres[rid] && !T.rencontres[rid].supprime) return 'deja';
  const t = maintenant(), noms = nommer(o.adversaires, enJeu(e.id));
  changer(() => {
    const bid = 'b-' + rid;
    T.rencontres[rid] = normRencontre({id:rid, maj:t, seance:e.id, bloc:bid, titre:o.titre || '', pourquoi:o.pourquoi || '', auteur:MOI.joueur || ''});
    o.adversaires.forEach((a, i) => {
      const x = normAdversaire(Object.assign(champsAdv(a), {id:'a-' + base + '-' + (i + 1), maj:t, rencontre:rid, ordre:i, nom:noms[i]}));
      T.adversaires[x.id] = x;
    });
    T.blocs[bid] = normBloc({id:bid, maj:t, seance:e.id, ordre:t, type:'rencontre', rencontre:rid, auteur:MOI.joueur || '',
      texte:'Rencontre : ' + listeNoms(o.adversaires.map(a => a.n)) + '.' + (o.pourquoi ? '\n' + o.pourquoi : '')});
  });
  return 'posee';
}
/* ce que le Registre des Rencontres a laissé pour la table */
function lireEnvoi(){
  let o = null;
  try{ o = JSON.parse(localStorage.getItem(CLE_ENVOI) || 'null'); }catch(e){ o = null; }
  if(!o || !Array.isArray(o.adversaires) || !o.adversaires.length){ ENVOI.attente = null; dessinerCombat(); return; }
  /* la séance la plus récente, même si l'on relisait une ancienne : c'est là qu'on joue */
  const e = seances()[0];
  if(!e){ ENVOI.attente = o; dessinerCombat(); return; }
  const r = poserRencontre(o, e);
  ENVOI.attente = null;
  try{ localStorage.removeItem(CLE_ENVOI); }catch(x){}
  if(seanceCourante() !== e){ choisirSeance(e.id); BED = null; }
  msgTable(r === 'deja' ? 'Cette rencontre est déjà dans la séance ' + (e.seance || '') + '.'
    : 'La rencontre est dans la séance ' + (e.seance || '') + ' : ' + listeNoms(o.adversaires.map(a => a.n)) + '.', true);
  dessinerSeance(true);
  /* le combat se voit : la séance à l'écran, et le haut de la colonne d'à côté */
  const cote = document.querySelector('.jeu-cote'); if(cote) cote.scrollTop = 0;
  const sec = $('secSeance');
  if(sec){ const r = sec.getBoundingClientRect(); if(r.bottom < 80 || r.top > innerHeight - 80) sec.scrollIntoView({block:'start', behavior:'smooth'}); }
}

/* ---------- ce qu'on fait pendant le combat ---------- */
function changerPvAdversaire(a, n){
  changer(() => { const x = unAdversaire(a.id); if(x) coup(x, 'pv', n); });
}
function formuleDe(txt){ const m = /(\d*d\d+(?:\s*[+\-]\s*\d+)?)/i.exec(txt || ''); return m ? m[1].replace(/\s+/g, '') : ''; }
/* le genre de dégâts d'une attaque d'en face : l'élément de son attaque propre ; pour une entrée du livre, qui ne
   le note pas, ce que disent son nom et son effet. La Sève, l'eau, la pierre, le vent et la Mue : l'armure les arrête */
const MOTS_ELEMENT = [
  [/rien n.arr[êe]te|traverse l.armure/i, 'nrj'],
  [/l.armure l.arr[êe]te/i, 'mat'],
  [/feu|flamm|flamb|br[ûu]l|braise|ilv[èe]s/i, 'feu'],
  [/ombre|n[ïi]hr|onde|zhern|sacr[ée]|ysse/i, 'nrj'],
  [/s[èe]ve|\beau\b|pierre|vent|\bmue\b/i, 'mat']
];
function sorteAttaque(a, propre){
  if(!propre || !a.a2) return 'phy';
  const d = DOMAINES.find(x => x.k === a.a2.el);
  if(d) return d.sorte;
  if(a.a2.t !== 'mag') return 'phy';
  const txt = [a.a2.n, a.a2.e, a.a2.p, a.nom].join(' ');
  const m = MOTS_ELEMENT.find(x => x[0].test(txt));
  return m ? m[1] : 'nrj';
}
/* un adversaire frappe : il touche d'office. Le compositeur se prépare pour le MJ, avec les dés de l'attaque */
function frapper(a, propre){
  if(!seanceCourante()) return;
  const lui = {k:'adv', id:a.id, nom:a.nom, cote:'eux', x:a, pv:a.pv, pvMax:a.pvMax, cartes:a.cartes};
  if(!peutJouer(lui)){ msgTable(motPasSonTour(lui), false); return; }
  const l = attaquesDe(lui), atk = (propre ? l[1] : l[0]) || l[0];
  if(!atk){ msgTable(a.nom + ' n’a pas d’attaque.', false); return; }
  COMPO.frappeur = {k:'adv', id:a.id};
  preparerFrappe(a.nom, atk, null, 'eux', lui);
}
/* on le vise : son personnage prépare son attaque, et les dégâts iront à celui-là */
function viser(a){
  if(!seanceCourante()) return;
  if(!peutViser()){ msgTable(motPasSonTour(monCombattant()), false); return; }
  const moi = MOI.perso && perso(MOI.perso);
  if(moi && !(COMPO.qui.k === 'perso' && COMPO.qui.id === moi.id)) choisirQui({k:'perso', id:moi.id, nom:moi.nom});
  if(COMPO.qui.k === 'perso'){ COMPO.genre = 'fait'; if(!COMPO.quoi) COMPO.quoi = 'comp:Combat'; }
  COMPO.panneau = 'jet';
  COMPO.cible = a.id; COMPO.perte = null;
  if(moi){ COMPO.frappeur = {k:'perso', id:moi.id}; COMPO.portee = porteeJeton({k:'perso', id:moi.id, x:moi}); }
  dessinerCompositeur(true);
  dessinerCombat(true);
  msgTable(COMPO.qui.k === 'perso' ? nomDe(COMPO.qui) + ' vise ' + a.nom + ' : lance son attaque, puis ses dégâts.' : 'Les dégâts iront à ' + a.nom + '. Choisis d’abord qui attaque.', true);
  const box = $('seCompo'); if(box) box.scrollIntoView({block:'center', behavior:'smooth'});
}
function finirCombat(){
  const rs = rencontresEnCours(); if(!rs.length) return;
  const l = adversairesEnCombat();
  const bas = l.filter(aTerre).map(a => a.nom), debout = l.filter(a => !aTerre(a)).map(a => a.nom + ' (' + a.pv + '/' + a.pvMax + ' PV)');
  BTN.ouvert = null;
  const gens = pnjsAuCombat();
  ECHANGE = null;
  changer(() => {
    const e = seanceCourante();
    if(e && T.journal[e.id]) T.journal[e.id] = Object.assign({}, T.journal[e.id], {init:null, majInit:maintenant()});
    gens.forEach(p => { const x = T.pnj[p.id]; if(x) T.pnj[p.id] = Object.assign({}, x, {combat:Object.assign({}, x.combat, {dans:false}), majCombat:maintenant()}); });
    rs.forEach(r => { T.rencontres[r.id] = Object.assign({}, T.rencontres[r.id], {fini:true, maj:maintenant()}); });
    noterDansSeance('Fin du combat.' + (bas.length ? ' À terre : ' + bas.join(', ') + '.' : '') + (debout.length ? ' Encore debout : ' + debout.join(', ') + '.' : ''), 'note');
  });
}
function reprendreCombat(r){
  changer(() => { T.rencontres[r.id] = Object.assign({}, T.rencontres[r.id], {fini:false, maj:maintenant()}); });
}
/* d'autres arrivent pendant le combat : ils rejoignent la dernière rencontre, numérotés à la suite des leurs */
function ajouterAuCombat(r, adv){
  const base = r.id.replace(/^r-/, ''), t = maintenant();
  const sel = Math.random().toString(36).slice(2, 5);
  const noms = nommer(adv, enJeu(r.seance));
  const ordre = Object.keys(T.adversaires).map(k => T.adversaires[k]).filter(x => x && x.rencontre === r.id).reduce((m, x) => Math.max(m, x.ordre), -1) + 1;
  changer(() => {
    adv.forEach((a, i) => {
      const x = normAdversaire(Object.assign(champsAdv(a), {id:'a-' + base + '-' + sel + (i + 1), maj:t, rencontre:r.id, ordre:ordre + i, nom:noms[i]}));
      T.adversaires[x.id] = x;
    });
    noterDansSeance('Arrivent en face : ' + listeNoms(adv.map(a => a.n)) + '.', 'note');
  });
}
function retirerAdversaire(a){
  changer(() => { const x = T.adversaires[a.id]; if(x) T.adversaires[a.id] = Object.assign({}, x, {supprime:true, maj:maintenant()}); });
}

/* ---------- les priorités : une carte par combattant, à chaque round ----------
   Le livre : « En début de chaque round, une carte par PJ, PNJ et monstre, numérotées de 1 au nombre de
   combattants. On agit de la plus petite à la plus grande. » Un exceptionnel en reçoit deux et agit deux fois.
   Deux combattants qui n'ont pas encore agi peuvent échanger leurs cartes. */

/* debout : à zéro PV on tombe, et on ne reçoit plus de carte */
const DEBOUT = z => !(z.pvMax > 0 && z.pv <= 0);
const COTES = [{k:'nous', l:'À nos côtés'}, {k:'eux', l:'Contre nous'}];

/* les PNJ qu'on a fait entrer dans le combat de cette séance */
function pnjsAuCombat(){
  const e = seanceCourante(); if(!e) return [];
  return pnjs().filter(p => p.combat && p.combat.dans && p.combat.seance === e.id && p.statut !== 'mort');
}
/* tout le monde, des deux côtés : la compagnie, les PNJ qui se battent, ceux d'en face */
function ceuxQuiSeBattent(){
  const out = [];
  persos().forEach(c => out.push({k:'perso', id:c.id, nom:c.nom || 'Sans nom', cote:'nous', cartes:1,
    pv:c.pv, pvMax:c.pvMax, x:c}));
  pnjsAuCombat().forEach(p => out.push({k:'pnj', id:p.id, nom:p.nom || 'Sans nom', cote:p.combat.cote,
    cartes:Math.max(1, p.combat.cartes || 1), pv:p.pv == null ? p.pvMax : p.pv, pvMax:p.pvMax, x:p}));
  adversairesEnCombat().forEach(a => out.push({k:'adv', id:a.id, nom:a.nom, cote:'eux',
    cartes:Math.max(1, a.cartes || 1), pv:a.pv, pvMax:a.pvMax, x:a}));
  return out;
}
const unCombattant = (k, id) => ceuxQuiSeBattent().find(z => z.k === k && z.id === id) || null;
const priorites = () => { const e = seanceCourante(); return e && e.init ? e.init : null; };
let ECHANGE = null;          /* la première carte d'un échange, en attendant la seconde */
/* la carte de ce combattant qui n'a pas encore servi, s'il en a une */
function indexCarte(k, id){
  const p = priorites(); if(!p) return -1;
  return p.c.findIndex(x => x.k === k && x.id === id && !x.a);
}

function poserInit(init){
  const e = seanceCourante(); if(!e) return;
  changer(() => { const x = T.journal[e.id]; if(x) T.journal[e.id] = Object.assign({}, x, {init:init, majInit:maintenant()}); });
}
/* le tirage : une carte par combattant (deux pour un exceptionnel), numérotées de 1 au nombre de cartes */
function tirerPriorites(suivant){
  const e = seanceCourante(); if(!e){ msgTable('Ouvre une séance d’abord.', false); return; }
  const l = ceuxQuiSeBattent().filter(DEBOUT);
  if(!l.length){ msgTable('Personne debout à qui donner une carte.', false); return; }
  const c = [];
  l.forEach(z => { for(let i = 0; i < z.cartes; i++) c.push({k:z.k, id:z.id, n:0, a:false}); });
  const n = c.map((x, i) => i + 1);
  for(let i = n.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = n[i]; n[i] = n[j]; n[j] = t; }
  c.forEach((x, i) => { x.n = n[i]; });
  c.sort((a, b) => a.n - b.n);
  const av = priorites();
  ECHANGE = null;
  poserInit({r:suivant && av ? av.r + 1 : 1, c:c});
  /* les pas repartent de zéro : chacun retrouve toute sa vitesse */
  if(typeof remettreLesPas === 'function') remettreLesPas();
  /* et ce qui se comptait en rounds descend d'un cran */
  if(suivant && av && typeof tournerLesEtats === 'function') tournerLesEtats();
}
function fermerPriorites(){ ECHANGE = null; poserInit(null); }
/* à qui le tour : la plus petite carte qui n'a pas encore agi */
function aQuiLeTour(){
  const p = priorites(); if(!p) return -1;
  const i = p.c.findIndex(x => !x.a);
  return i;
}
function marquerJoue(i, joue){
  const p = priorites(); if(!p || !p.c[i]) return;
  poserInit({r:p.r, c:p.c.map((x, j) => j === i ? Object.assign({}, x, {a:!!joue}) : x)});
}
/* deux cartes qui n'ont pas encore servi s'échangent : un clic sur l'une, un clic sur l'autre */
function echangerCarte(i){
  const p = priorites(); if(!p || !p.c[i] || p.c[i].a) return;
  if(ECHANGE === i || ECHANGE == null || !p.c[ECHANGE] || p.c[ECHANGE].a){
    ECHANGE = ECHANGE === i ? null : i;
    dessinerCombat(true);
    return;
  }
  const j = ECHANGE; ECHANGE = null;
  const c = p.c.map(x => Object.assign({}, x));
  const t = c[i].n; c[i].n = c[j].n; c[j].n = t;
  c.sort((a, b) => a.n - b.n);
  poserInit({r:p.r, c:c});
}

/* ---------- le verrou du tour ----------
   Tant qu'aucune carte n'est tirée, personne n'est tenu : hors combat, chacun se déplace et frappe quand il veut.
   Dès que les cartes sont là, seul celui de la plus petite carte non jouée bouge son jeton et attaque. */
function actifCombattant(){
  const p = priorites(); if(!p) return null;
  const i = aQuiLeTour(); if(i < 0) return null;
  return unCombattant(p.c[i].k, p.c[i].id);
}
const estActif = z => { const a = actifCombattant(); return !!(a && z && a.k === z.k && a.id === z.id); };
/* a-t-il une carte dans ce round ? Celui qui arrive au milieu d'un round n'en a pas : il n'est pas tenu par
   le tour de table, et il reçoit sa carte au tirage suivant. */
function dansLeTirage(z){
  const p = priorites();
  return !!p && !!z && p.c.some(x => x.k === z.k && x.id === z.id);
}
/* son droit d'agir : aucune carte tirée, pas de carte à lui ce round, ou c'est son tour */
const peutJouer = z => !dansLeTirage(z) || estActif(z);
/* le personnage que suit le joueur : c'est lui qui vise */
function monCombattant(){
  const c = MOI.perso && perso(MOI.perso);
  return c ? unCombattant('perso', c.id) : null;
}
/* viser, c'est attaquer : le joueur ne vise que pendant le tour de son personnage. Qui n'en suit aucun,
   le MJ en général, vise quand il veut : il frappe pour ceux d'en face, chacun à son tour. */
const peutViser = () => { const z = monCombattant(); return !z || peutJouer(z); };
function motPasSonTour(z){
  const a = actifCombattant();
  return 'Ce n’est pas le tour de ' + (z && z.nom ? z.nom : 'ce combattant') + (a ? ' : c’est à ' + a.nom + '.' : '.');
}
/* ---------- le compositeur suit le tour, lui aussi ----------
   Un personnage ou un PNJ qui a sa fiche ne lance rien hors de son tour : ni son jet, ni ses dégâts, ni
   l'application. Une réaction, esquive ou parade, se lance quand l'ennemi frappe : elle n'est pas de son tour,
   et reste permise. Le MJ, qui parle pour ceux d'en face, n'est jamais bloqué. */
function blocageCompo(){
  const q = COMPO.qui;
  if(!q || (q.k !== 'perso' && q.k !== 'pnj')) return '';
  if(String(COMPO.quoi || '').indexOf('rea:') === 0) return '';
  const z = unCombattant(q.k, q.id);
  if(!z || peutJouer(z)) return '';
  return motPasSonTour(z);
}
/* passer au tour du suivant, et revenir en arrière quand on a passé trop vite */
function auSuivant(){
  const p = priorites(); if(!p){ msgTable('Tire d’abord les priorités.', false); return; }
  const i = aQuiLeTour();
  if(i < 0){ msgTable('Tout le monde a joué ce round : « Round suivant » tire de nouvelles cartes.', false); return; }
  marquerJoue(i, true);
  const z = actifCombattant();
  msgTable(z ? 'À ' + z.nom + '.' : 'Tout le monde a joué ce round : « Round suivant » tire de nouvelles cartes.', true);
}
function revenirAuTour(){
  const p = priorites(); if(!p) return;
  const i = aQuiLeTour(), j = i < 0 ? p.c.length - 1 : i - 1;
  if(j < 0){ msgTable('Personne n’a encore joué ce round.', false); return; }
  marquerJoue(j, false);
  const z = unCombattant(p.c[j].k, p.c[j].id);
  msgTable('On revient' + (z ? ' à ' + z.nom : ' en arrière') + '.', true);
}

/* ---------- un ennemi joue son tour tout seul ----------
   Il choisit son attaque, tire sa cible au hasard dans le camp d'en face et lance ses dégâts. Il s'arrête là :
   l'ennemi touche d'office, mais la cible lance encore sa réaction, puis applique les dégâts, ou met zéro. */
const auHasard = l => l.length ? l[Math.floor(Math.random() * l.length)] : null;
const aucunDegat = e => /^\s*aucun d[ée]g[âa]t/i.test(e || '');
/* le genre de dégâts d'une attaque de PNJ : son élément, sinon ce que disent son nom et son effet */
function sortePnjA(a){
  if(!a || a.t !== 'mag') return 'phy';
  const d = DOMAINES.find(x => x.k === a.el);
  if(d) return d.sorte;
  const m = MOTS_ELEMENT.find(x => x[0].test([a.n, a.e, a.p].join(' ')));
  return m ? m[1] : 'nrj';
}
const sortePnj = c => sortePnjA(c && c.a2);
/* une attaque de sa fiche, prête pour le compositeur */
const atqDeFiche = (a, deg, s) => ({n:a.n, f:aucunDegat(a.e) ? '' : (formuleDe(a.e) || deg), s:s,
  propre:true, e:a.e, p:porteeTexte(a.p), j:a.j || '', src:a});
/* ses attaques : celle de son rang, celle de son espèce, et la sienne. Une seule par round */
function attaquesDe(z){
  if(z.k === 'adv'){
    const a = z.x, l = [{n:'Attaque de rang', f:a.deg, s:'phy', propre:false}];
    if(a.a2) l.push(atqDeFiche(a.a2, a.deg, sorteAttaque(a, true)));
    return l;
  }
  if(z.k === 'pnj' && z.x.combat){
    const c = z.x.combat, l = [{n:'Attaque de rang', f:c.deg, s:'phy', propre:false}];
    if(c.a1) l.push(atqDeFiche(c.a1, c.deg, sortePnjA(c.a1)));
    if(c.a2) l.push(atqDeFiche(c.a2, c.deg, sortePnjA(c.a2)));
    return l;
  }
  return [];
}
/* la cible qu'on propose d'office quand le tour est joué tout seul : un des nôtres quand c'est l'ennemi
   qui frappe, un d'en face sinon. Ne pas confondre avec cibleParDefaut(l), qui choisit dans la liste des cibles. */
function cibleDOffice(cote){
  if(cote === 'eux'){
    if(MOI.perso && perso(MOI.perso)) return MOI.perso;
    const c = persos()[0]; return c ? c.id : SANS_CIBLE;
  }
  const z = ceuxQuiSeBattent().filter(y => y.cote === 'eux' && DEBOUT(y))[0];
  return z ? z.id : SANS_CIBLE;
}
/* le compositeur, prêt : qui frappe, avec quoi, sur qui, et les dés déjà lancés.
   Un PNJ qui a sa fiche parle en son nom, comme un personnage : ses caractéristiques sont dans le jet,
   et le paragraphe part sous son nom. Ceux d'en face, qui n'ont pas de fiche, restent au MJ. */
function preparerFrappe(nom, atk, cible, cote, z){
  /* celui qui a une fiche parle avec elle ; un adversaire du bestiaire parle sous son nom, sans fiche */
  const fiche = z && z.k === 'pnj' ? unPnj(z.id) : null;
  const sien = z && (fiche || z.k === 'adv') ? z : null;
  choisirQui(sien ? {k:'pnj', id:fiche ? fiche.id : '', nom:sien.nom} : {k:'mj', id:'', nom:''});
  COMPO.frappeur = z ? {k:z.k, id:z.id} : COMPO.frappeur;
  COMPO.portee = atk.propre && atk.p != null ? atk.p : (atk.propre ? null : 0);
  COMPO.genre = sien ? 'fait' : 'narration';
  COMPO.panneau = 'jet';
  COMPO.formule = atk.f;
  COMPO.sorte = atk.s;
  COMPO.degats = null; COMPO.perte = null;
  /* son attaque dit sous quoi elle se lance : la table propose cette caractéristique */
  COMPO.quoi = fiche && atk.j && valCarPnj(fiche, atk.j) != null ? 'carp:' + atk.j : '';
  COMPO.cible = cible ? cible.id : cibleDOffice(cote);
  const t = $('coTexte'), qui = cible ? cible.nom : '';
  if(t && !t.value.trim()) t.value = sien
    ? (atk.propre ? atk.n + (qui ? ' sur ' + qui : '') : 'attaque' + (qui ? ' ' + qui : '')) + '.'
    : nom + (atk.propre ? ' : ' + atk.n : ' attaque') + (qui ? ', sur ' + qui : '') + '.';
  dessinerCompositeur(true);
  if(atk.f) degatsCompo(atk.f);
  const box = $('seCompo'); if(box) box.scrollIntoView({block:'center', behavior:'smooth'});
}
/* il frappe, à la main, avec l'attaque qu'on a choisie pour lui : seulement pendant son tour */
function frapperPour(z, atk){
  if(!peutJouer(z)){ msgTable(motPasSonTour(z), false); return; }
  COMPO.frappeur = {k:z.k, id:z.id};
  preparerFrappe(z.nom, atk, null, z.cote, z);
}
function jouerSonTour(z, i){
  if(!seanceCourante()){ msgTable('Ouvre une séance d’abord.', false); return; }
  if(!peutJouer(z)){ msgTable(motPasSonTour(z), false); return; }
  COMPO.frappeur = {k:z.k, id:z.id};
  const atks = attaquesDe(z);
  if(!atks.length){ msgTable(z.nom + ' n’a pas d’attaque : écris-lui-en une dans sa fiche.', false); return; }
  const atk = auHasard(atks);
  const cible = auHasard(ceuxQuiSeBattent().filter(y => y.cote !== z.cote && DEBOUT(y)));
  preparerFrappe(z.nom, atk, cible, z.cote, z);
  if(i != null && i >= 0) marquerJoue(i, true);
  msgTable(z.nom + ' joue : ' + atk.n + (cible ? ', sur ' + cible.nom : ', personne en face : choisis une cible') + '.'
    + (atk.f ? ' Les dés sont lancés : à la cible de réagir.' : ' Pas de dégâts.'), true);
}

/* ---------- le tour de table, en haut du panneau ---------- */
function blocPriorites(){
  const p = priorites(), l = ceuxQuiSeBattent();
  const w = el('div','tour');
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'Le tour de table'));
  if(p) t.append(el('span','mini', 'round ' + p.r));
  t.append(el('span','espace'));
  if(p){
    const g = el('div','prbtns');
    const s = el('button','btn ghost xs','Round suivant'); s.type = 'button'; s.id = 'prSuivant';
    s.setAttribute('aria-label', 'Tirer les cartes du round suivant');
    s.onclick = () => tirerPriorites(true);
    const x = el('button','ax','×'); x.type = 'button'; x.id = 'prFermer';
    x.setAttribute('aria-label', 'Ranger les cartes');
    x.onclick = () => fermerPriorites();
    g.append(s, x);
    t.append(g);
  }
  /* rien de tiré : le pavé ne sert à rien, « Tirer les priorités » vit dans la barre du bas */
  if(!p) return null;
  w.append(t);
  const tour = aQuiLeTour();
  /* à qui le tour, et de quoi avancer ou revenir : rien ne bouge ni ne frappe hors de son tour */
  const z0 = actifCombattant();
  const lig = el('div','prtour');
  lig.append(el('p','prqui', tour < 0 ? 'Tout le monde a joué ce round.'
    : z0 ? 'À ' + z0.nom + (z0.cote === 'nous' ? ', de notre côté.' : ', en face.')
    : 'La carte ' + p.c[tour].n + ' est à quelqu’un qui a quitté le combat : passe au suivant.'));
  const su = el('button','btn sm','Au suivant'); su.type = 'button'; su.id = 'prAuSuivant';
  su.disabled = tour < 0;
  su.setAttribute('aria-label', 'Passer au tour du combattant suivant');
  su.onclick = () => auSuivant();
  const re = el('button','btn ghost xs','Revenir'); re.type = 'button'; re.id = 'prRevenir';
  re.disabled = !p.c.some(x => x.a);
  re.setAttribute('aria-label', 'Revenir au tour précédent');
  re.onclick = () => revenirAuTour();
  lig.append(su, re);
  w.append(lig);
  const u = el('ul','prliste');
  p.c.forEach((carte, i) => {
    const z = unCombattant(carte.k, carte.id);
    const li = el('li','prl' + (carte.a ? ' pra' : '') + (i === tour ? ' prmoi' : '') + (ECHANGE === i ? ' prech' : ''));
    li.append(el('span','prn', String(carte.n)));
    const n = el('span','prnom', z ? z.nom : '(parti)');
    if(z && !DEBOUT(z)) n.className = 'prnom prbas';
    li.append(n);
    li.append(el('span','prcote c' + (z ? z.cote : 'eux'), z && z.cote === 'nous' ? 'nous' : 'eux'));
    li.append(el('span','espace'));
    if(z && DEBOUT(z) && z.cote === 'eux' && !carte.a){
      const j = el('button','btn ghost xs','Son tour'); j.type = 'button';
      j.disabled = i !== tour;
      j.setAttribute('aria-label', i === tour ? 'Jouer le tour de ' + z.nom + ' : son attaque, sa cible et ses dégâts' : motPasSonTour(z));
      if(i !== tour) j.title = motPasSonTour(z);
      j.onclick = () => jouerSonTour(z, i);
      li.append(j);
    }
    if(!carte.a){
      const e2 = el('button','ax prx', ECHANGE === i ? 'avec ?' : '⇄'); e2.type = 'button';
      e2.setAttribute('aria-label', ECHANGE === i ? 'Choisis la carte à échanger avec celle-ci' : 'Échanger cette carte avec une autre');
      e2.onclick = () => echangerCarte(i);
      li.append(e2);
    }
    const a = el('button','ax prx', carte.a ? '↺' : '✓'); a.type = 'button';
    a.setAttribute('aria-label', carte.a ? 'Il n’a finalement pas joué' : (z ? z.nom + ' a joué' : 'A joué'));
    a.onclick = () => marquerJoue(i, !carte.a);
    li.append(a);
    u.append(li);
  });
  w.append(u);
  if(tour < 0) w.append(el('p','mini', 'Tout le monde a joué. « Round suivant » retire les cartes, en tire de nouvelles et rend à chacun tous ses pas.'));
  else if(ECHANGE != null) w.append(el('p','mini', 'Clique la seconde carte pour l’échanger, ou la même pour annuler.'));
  else w.append(el('p','mini', 'Hors de son tour, un jeton ne se déplace pas et personne ne frappe. « Au suivant » fait tourner, « Revenir » défait.'));
  return w;
}

/* ---------- qui se bat à nos côtés, ou contre nous, sans être du bestiaire ----------
   Une fiche de PNJ qui a une section « Au combat » : son rang donne ses PV, sa réduction, ses dés et ses cartes,
   et son attaque propre se tire dans une liste, puis se réécrit. */
const ATQ_PNJ = {
  nous: [
    {n:'Couvrir', ty:'Spécial', t:'phy', p:'contact', g:'soutien', e:'aucun dégât, il prend pour un allié la prochaine attaque qui le vise'},
    {n:'Panser', ty:'Spécial', t:'phy', p:'contact', g:'soutien', e:'aucun dégât, un allié récupère 1d6 PV'},
    {n:'Relever', ty:'Spécial', t:'phy', p:'contact', g:'soutien', e:'aucun dégât, un allié à terre revient à 1 PV'},
    {n:'Lame prêtée', ty:'Spécial', t:'phy', p:'contact', g:'soutien', e:'aucun dégât, un allié fait +1d4 aux dégâts ce round'},
    {n:'Tir d’appui', ty:'Distance', t:'phy', p:'20 pas', g:'archer', e:'le dé du rang, depuis l’arrière'},
    {n:'Flèche de dégagement', ty:'Distance', t:'phy', p:'20 pas', g:'archer', e:'le dé du rang sur qui est au contact d’un allié'},
    {n:'Tenir la porte', ty:'Corps à corps (Contondant)', t:'phy', p:'contact', g:'guerrier', e:'le dé du rang, et personne ne passe derrière lui ce round'},
    {n:'Coup d’estoc', ty:'Corps à corps (Perforant)', t:'phy', p:'contact', g:'guerrier', e:'le dé du rang, et la cible recule de 5 pas'},
    {n:'Crier l’ouverture', ty:'Spécial', t:'phy', p:'aucune', g:'meneur', e:'aucun dégât, un allié a +4 à son prochain jet'},
    {n:'Chant qui tient debout', ty:'Spécial', t:'phy', p:'aucune', g:'meneur', e:'aucun dégât, les alliés à 10 pas récupèrent 1 PV'},
    {n:'Pied à terre', ty:'Corps à corps (Contondant)', t:'phy', p:'contact', g:'brute', e:'le dé du rang, et la cible tombe'},
    {n:'Renverser', ty:'Corps à corps (Contondant)', t:'phy', p:'contact', g:'brute', e:'le dé du rang, et la cible recule de 10 pas'},
    {n:'Croc-en-jambe', ty:'Corps à corps (Contondant)', t:'phy', p:'contact', g:'roublard', e:'aucun dégât, la cible tombe'},
    {n:'Coup en traître', ty:'Corps à corps (Perforant)', t:'phy', p:'contact', g:'roublard', e:'le dé du rang, le double si un allié est au contact de la cible'},
    {n:'Vieille Pratique', ty:'Magique', t:'mag', p:'10 pas', g:'praticien', e:'le dé du rang', el:'seve'},
    {n:'Pratique de bord de route', ty:'Magique', t:'mag', p:'10 pas', g:'praticien', e:'le dé du rang, une fois tous les deux rounds', el:'seve'}
  ],
  eux: [
    {n:'Frapper au défaut', ty:'Corps à corps (Perforant)', t:'phy', p:'contact', g:'guerrier', e:'le dé du rang, et la réduction d’armure ne compte pas'},
    {n:'Tenir la ligne', ty:'Corps à corps (Tranchant)', t:'phy', p:'contact', g:'guerrier', e:'le dé du rang, et personne ne passe à côté de lui ce round'},
    {n:'Botte', ty:'Corps à corps (Perforant)', t:'phy', p:'contact', g:'guerrier', e:'le dé du rang, et il pare la prochaine attaque de la cible'},
    {n:'Charge', ty:'Corps à corps (Perforant)', t:'phy', p:'10 pas', g:'brute', e:'le dé du rang, et la cible tombe'},
    {n:'Écraser', ty:'Corps à corps (Contondant)', t:'phy', p:'contact', g:'brute', e:'le dé du rang, et la cible lâche ce qu’elle tient'},
    {n:'Flèche', ty:'Distance', t:'phy', p:'20 pas', g:'archer', e:'le dé du rang'},
    {n:'Carreau d’arbalète', ty:'Distance', t:'phy', p:'40 pas', g:'archer', e:'le dé du rang, et il recharge le round suivant'},
    {n:'Coup bas', ty:'Corps à corps (Tranchant)', t:'phy', p:'contact', g:'roublard', e:'le dé du rang, puis il recule de 10 pas'},
    {n:'Filet', ty:'Distance', t:'phy', p:'10 pas', g:'roublard', e:'aucun dégât, la cible est prise jusqu’à un jet de FOR'},
    {n:'Détrousser', ty:'Corps à corps (Tranchant)', t:'phy', p:'contact', g:'roublard', e:'aucun dégât, il emporte un objet et s’enfuit'},
    {n:'Sommation', ty:'Spécial', t:'phy', p:'10 pas', g:'meneur', e:'aucun dégât, il exige ce que vous portez ; il fuit sous la moitié de ses PV'},
    {n:'Donner l’alerte', ty:'Spécial', t:'phy', p:'aucune', g:'meneur', e:'aucun dégât, d’autres arrivent au round suivant'},
    {n:'Donner l’ordre', ty:'Spécial', t:'phy', p:'aucune', g:'meneur', e:'aucun dégât, ses alliés gagnent +2 aux dégâts ce round'},
    {n:'Panser les siens', ty:'Spécial', t:'phy', p:'contact', g:'soutien', e:'aucun dégât, un allié récupère 1d6 PV'},
    {n:'Faire rempart', ty:'Spécial', t:'phy', p:'contact', g:'soutien', e:'aucun dégât, il prend pour un allié la prochaine attaque qui le vise'},
    {n:'Pratique apprise de travers', ty:'Magique', t:'mag', p:'10 pas', g:'praticien', e:'le dé du rang ; s’il rate, elle le touche aussi', el:'feu'},
    {n:'Pratique volée', ty:'Magique', t:'mag', p:'10 pas', g:'praticien', e:'le dé du rang, et il recule d’un pas à chaque fois', el:'feu'}
  ]
};
/* ---------- une vraie Pratique de la liste de son peuple ----------
   En plus de l'attaque donnée d'office, un peuple qui ouvre une liste donne de quoi se battre pour de bon :
   Le dard pour la Sève, Encorner pour la Mue, La Braise Jetée pour le feu. On ne garde que celles qui
   frappent quelqu'un, ni soin ni bonus, et seulement celles que son rang porte. */
function pratiqueQuiFrappe(x){
  const d = String(x && x.d || '');
  const f = formuleDe(d);
  if(!f) return false;
  if(/alli[ée]|\brends? \d|tu r[ée]cup[èe]res|^\s*soin\b/i.test(d)) return false;
  if(/^\s*(?:si |sur un critique|quand |tant que)/i.test(d)) return false;   /* un supplément, pas une attaque */
  return !/\+\s*$/.test(d.slice(0, d.indexOf(f)));
}
const motPorteeDe = d => /au contact|^\s*contact/i.test(d) ? 'contact'
  : ((/(\d+)\s*(?:pas|m[èe]tres?)/i.exec(d) || [])[0] || 'à vue');
/* ce qu'elle fait, en court : ses dés, puis ce que le livre en dit */
function resumePratique(d){
  const t = String(d || '').replace(/\s+/g, ' ').trim();
  const court = t.length > 170 ? t.slice(0, 167).replace(/[,;:·  ]+\S*$/, '') + '…' : t;
  const f = formuleDe(t);
  return (f && court.indexOf(f) < 0 ? f + ', ' : '') + court;
}
/* les Pratiques de la liste d'un peuple, celles qui frappent : la liste entière, ou seulement celles de base */
function pratiquesDuPeuple(peuple, base){
  const dom = domaineDe({peuple:peuple || '', domaine:'', sub:{}});
  if(!dom) return null;
  const g = PRATIQUES[dom] || {}, l = [];
  Object.keys(g).forEach(br => (g[br] || []).forEach(x => { if(!!x.base === !!base) l.push(x); }));
  return {dom:dom, cle:domaineCle(dom), l:l};
}
/* une Pratique en attaque de fiche */
function atqDePratique(p, cle, base){
  const d = DOMAINES.find(y => y.k === cle);
  return {n:p.n, ty:'Magique', t:'mag', p:base ? 'à vue' : motPorteeDe(p.d), el:d ? d.k : '',
    e:base ? resumeBase(p.d) : resumePratique(p.d), j:CARS.indexOf(p.j) >= 0 ? p.j : ''};
}
function pratiqueDEspece(peuple, rang){
  const q = pratiquesDuPeuple(peuple, false);
  if(!q) return null;
  const porte = Math.max(1, rang || 2);
  const bonnes = q.l.filter(pratiqueQuiFrappe);
  const sien = bonnes.filter(x => x.pc == null || x.pc <= porte);
  const p = auHasard(sien.length ? sien : bonnes);
  return p ? atqDePratique(p, q.cle, false) : null;
}
/* son autre attaque : celle de son espèce, ou celle de son genre de combattant */
function tirerAttaquePnj(cote, rang, peuple, type){
  const t = TYPES_PNJ.some(x => x.k === type) ? type : (pratiquesDuPeuple(peuple, false) ? 'espece' : 'guerrier');
  if(t === 'espece'){
    const a = pratiqueDEspece(peuple, rang);
    if(a) return a;
  }
  const l = ATQ_PNJ[cote === 'eux' ? 'eux' : 'nous'];
  const par = l.filter(x => x.g === t);
  const a = Object.assign({}, auHasard(par.length ? par : l));
  /* une Pratique apprise prend l'élément de son peuple, quand son peuple en ouvre un */
  if(a.t === 'mag'){ const q = pratiquesDuPeuple(peuple, false); if(q && q.cle) a.el = q.cle; }
  return a;
}
/* ---------- l'attaque de base de son espèce ----------
   Chaque liste de Pratiques ouvre une attaque donnée d'office, celle que le livre marque « de base ».
   Un PNJ la reçoit de son peuple, en plus de la sienne : Ortie pour un Écorcien, Saumure ou Galet pour un
   Nyréen. Un peuple sans liste, les Humains, n'en a pas : son attaque de rang lui suffit. */
function resumeBase(d){
  const arm = /l[’']armure n[’']y change rien|traverse l[’']armure/i.test(d) ? 'l’armure n’y change rien'
    : /r[ée]duction s[’']applique/i.test(d) ? 'la réduction s’applique' : '';
  return [formuleDe(d) || '1d4', arm].filter(Boolean).join(', ');
}
function attaqueDeBase(peuple){
  const q = pratiquesDuPeuple(peuple, true);
  if(!q) return null;
  const b = auHasard(q.l);
  return b ? atqDePratique(b, q.cle, true) : null;
}
/* un combat tout neuf, aux valeurs du rang : ses PV, sa réduction, ses dés, ses cartes, ses caractéristiques,
   l'attaque de base de son espèce et une attaque à lui */
function combatNeuf(rang, cote, peuple, type){
  const r = RANG[rang] || RANG[2];
  const t = TYPES_PNJ.some(x => x.k === type) ? type : (pratiquesDuPeuple(peuple, false) ? 'espece' : 'guerrier');
  const a1 = attaqueDeBase(peuple), a2 = tirerAttaquePnj(cote, r.r, peuple, t);
  return {cote:cote === 'eux' ? 'eux' : 'nous', rang:r.r, red:r.red, deg:r.deg, cartes:r.cartes,
    car:carsPnjDeRang(r.r, t, jetDeFiche(a1, a2)), bonus:BONUS_PNJ[r.r] || 20, type:t,
    a1:a1, a1non:false, a2:a2, seance:'', dans:false};
}
/* faire entrer quelqu'un dans le combat, ou l'en sortir. Une fiche sans section « Au combat » en reçoit une ;
   celle qui en a déjà une garde la sienne, et reçoit l'attaque de son espèce si elle n'en avait pas encore. */
function mettreAuCombat(id, dedans){
  const e = seanceCourante(); if(!e) return;
  changer(() => {
    const p = T.pnj[id]; if(!p || p.supprime) return;
    const c = Object.assign({}, p.combat || combatNeuf(2, 'nous', p.peuple), {dans:!!dedans, seance:dedans ? e.id : (p.combat ? p.combat.seance : '')});
    if(dedans && !c.a1 && !c.a1non) c.a1 = attaqueDeBase(p.peuple);
    if(dedans && !c.a2) c.a2 = tirerAttaquePnj(c.cote, c.rang, p.peuple, c.type);
    const x = Object.assign({}, p, {combat:c, majCombat:maintenant()});
    if(dedans && x.pvMax == null){ x.pvMax = (RANG[c.rang] || RANG[2]).pv; baseVie(x, x.pvMax); }
    T.pnj[id] = x;
  });
}
/* une fiche minimale, écrite à la table : un nom, un côté, un rang, un peuple, et le reste suit */
function nouveauCombattant(nom, cote, rang, peuple, type){
  const e = seanceCourante(); if(!e){ msgTable('Ouvre une séance d’abord.', false); return null; }
  nom = String(nom || '').replace(/\s+/g, ' ').trim();
  if(!nom){ msgTable('Il lui faut un nom.', false); return null; }
  const deja = pnjParNom(nom);
  if(deja){ mettreAuCombat(deja.id, true); msgTable(deja.nom + ' a déjà une fiche : elle entre dans le combat.', true); return deja.id; }
  const c = combatNeuf(rang, cote, peuple, type);
  c.dans = true; c.seance = e.id;
  const r = RANG[c.rang] || RANG[2];
  let id = '';
  changer(() => {
    const x = normPnj({id:idLibre('n-' + slug(nom), T.pnj), nom:nom, seance:e.id, statut:'vivant', peuple:peuple || '',
      attitude:cote === 'eux' ? 'hostile' : 'amical', pvMax:r.pv, pv:r.pv, combat:c, auteur:MOI.joueur || ''});
    x.maj = maintenant(); x.majCombat = maintenant();
    baseVie(x, r.pv);
    id = x.id;
    T.pnj[id] = x;
    const atq = x.combat ? [x.combat.a1, x.combat.a2].filter(Boolean).map(a => a.n) : [];
    noterDansSeance((cote === 'eux' ? 'Contre nous : ' : 'À nos côtés : ') + nom + ' (rang ' + r.r + ', ' + r.pv + ' PV'
      + (atq.length ? ', ' + atq.join(' et ') : '') + ').', 'note');
  });
  return id;
}
function changerPvPnj(p, n){
  changer(() => { const x = T.pnj[p.id]; if(x && !x.supprime){ const y = Object.assign({}, x); coup(y, 'pv', n); T.pnj[p.id] = y; } });
}

/* la ligne d'un PNJ qui se bat : ses PV, ses attaques, et son tour joué tout seul quand il est en face */
/* un allié se tient comme un joueur dans la compagnie : son nom, ses PV, ses puces.
   Ce qu'il fait passe par « PNJ ? » et la fenêtre « Action », où ses attaques l'attendent. */
function ligneAllie(p, z, pv, bas){
  const r = el('div','cie' + (bas ? ' tombe' : '') + (estActif(z) ? ' tour' : '') + (COMPO.cible === p.id ? ' visee' : ''));
  r.setAttribute('data-pnjc', p.id);
  const h = el('div','cietete');
  h.append(el('b','cnom', p.nom || 'Sans nom'), el('span','arang', 'rang ' + p.combat.rang));
  r.append(h);
  const j = el('div','cj');
  j.append(el('span','cjt', 'PV ' + Math.max(0, pv) + '/' + p.pvMax), barrePv(pv, p.pvMax));
  [['−', -1], ['+', 1]].forEach(([sg, d]) => {
    const b = el('button', null, sg); b.type = 'button';
    b.setAttribute('aria-label', (d < 0 ? 'Retirer 1 PV à ' : 'Rendre 1 PV à ') + (p.nom || 'ce PNJ'));
    b.disabled = (d < 0 && pv <= 0) || (d > 0 && pv >= p.pvMax);
    b.onclick = () => changerPvPnj(p, d);
    j.append(b);
  });
  r.append(j);
  const v = el('button','btn ghost xs aviser', COMPO.cible === p.id ? 'Visé' : 'Viser'); v.type = 'button';
  v.disabled = !peutViser();
  v.setAttribute('aria-label', v.disabled ? motPasSonTour(monCombattant()) : 'Viser ' + p.nom);
  if(v.disabled) v.title = motPasSonTour(monCombattant());
  v.onclick = () => { COMPO.cible = p.id; COMPO.perte = null; dessinerCompositeur(true); dessinerCombat(true); };
  const x = el('button','ax','×'); x.type = 'button';
  x.setAttribute('aria-label', 'Sortir ' + p.nom + ' du combat');
  x.onclick = () => mettreAuCombat(p.id, false);
  h.append(v, x);
  const mo = blocMort(z); if(mo) r.append(mo);
  r.append(blocEtats(z));
  return r;
}
function lignePnjCombat(p){
  const c = p.combat, pv = p.pv == null ? p.pvMax : p.pv, bas = p.pvMax > 0 && pv <= 0;
  const z = {k:'pnj', id:p.id, nom:p.nom, cote:c.cote, x:p, pv:pv, pvMax:p.pvMax, cartes:c.cartes};
  if(c.cote === 'nous') return ligneAllie(p, z, pv, bas);
  const w = el('div','aligne' + (bas ? ' aterre' : '') + (COMPO.cible === p.id ? ' visee' : ''));
  w.setAttribute('data-pnjc', p.id);
  const t = el('div','atete');
  t.append(el('b','anom', p.nom || 'Sans nom'), el('span','arang', 'rang ' + c.rang));
  if(!bas){
    const v = el('button','btn ghost xs aviser', COMPO.cible === p.id ? 'Visé' : 'Viser'); v.type = 'button';
    v.disabled = !peutViser();
    const moi = monCombattant();
    v.setAttribute('aria-label', v.disabled ? motPasSonTour(moi) : 'Viser ' + p.nom + ' : les dégâts iront à lui');
    if(v.disabled) v.title = motPasSonTour(moi);
    v.onclick = () => { COMPO.cible = p.id; COMPO.perte = null; dessinerCompositeur(true); dessinerCombat(true); };
    t.append(v);
  }
  const x = el('button','ax','×'); x.type = 'button';
  x.setAttribute('aria-label', 'Sortir ' + p.nom + ' du combat');
  x.onclick = () => mettreAuCombat(p.id, false);
  t.append(x);
  w.append(t);
  w.append(el('p','mini ainfo', 'réduction ' + c.red + (c.cartes > 1 ? ' · ' + c.cartes + ' cartes' : '')
    + (p.peuple ? ' · ' + p.peuple : '') + (motType(c.type) ? ' · ' + motType(c.type) : '') + (p.role ? ' · ' + p.role : '')));
  /* ses caractéristiques : la table y lance pour lui, caractéristique fois deux plus son bonus */
  if(c.car) w.append(el('p','mini acars', CARS.map(x => ABBR[x] + ' ' + c.car[x]).join(' · ')
    + (c.bonus ? ' · +' + c.bonus + ' aux jets' : '')));
  const b = el('div','apv');
  b.append(barrePv(pv, p.pvMax));
  b.append(el('span','apvn', bas ? 'à terre' : pv + '/' + p.pvMax + ' PV'));
  const mk = (lab, n) => {
    const q = el('button', null, lab); q.type = 'button';
    q.setAttribute('aria-label', (n < 0 ? 'Retirer ' + (-n) : 'Rendre ' + n) + ' PV à ' + p.nom);
    q.disabled = (n < 0 && pv <= 0) || (n > 0 && pv >= p.pvMax);
    q.onclick = () => changerPvPnj(p, n);
    return q;
  };
  const cmd = el('div','acmd');
  cmd.append(mk('−5', -5), mk('−1', -1), mk('+1', 1));
  b.append(cmd);
  w.append(b);
  const at = el('div','aatq');
  const tour = peutJouer(z);
  attaquesDe(z).forEach(atk => {
    const l = el('div','aat');
    const txt = el('div','aattxt');
    if(atk.src){ const ty = typeAttaque(atk.src); txt.append(el('span','aty t' + ty.cls, ty.l)); }
    txt.append(el('b', null, atk.n), document.createTextNode(atk.src ? (atk.src.p || atk.src.e ? ' · ' + [atk.src.p, atk.src.e].filter(Boolean).join(' · ') : '') : (atk.f ? ' · ' + atk.f : '')));
    l.append(txt);
    const f = el('button','btn ghost xs','Frapper'); f.type = 'button';
    f.disabled = bas || !tour;
    f.setAttribute('aria-label', !tour && !bas ? motPasSonTour(z) : p.nom + ' frappe : ' + atk.n);
    if(!tour && !bas) f.title = motPasSonTour(z);
    f.onclick = () => frapperPour(z, atk);
    l.append(f);
    at.append(l);
  });
  w.append(at);
  const mo = blocMort(z); if(mo) w.append(mo);
  w.append(blocEtats(z));
  if(c.cote === 'eux' && !bas){
    const j = el('button','btn ghost xs','Son tour'); j.type = 'button'; j.style.marginTop = '6px';
    j.disabled = !tour;
    j.setAttribute('aria-label', tour ? 'Jouer le tour de ' + p.nom : motPasSonTour(z));
    if(!tour) j.title = motPasSonTour(z);
    j.onclick = () => jouerSonTour(z, indexCarte('pnj', p.id));
    w.append(j);
  }
  return w;
}
/* le pavé « À nos côtés » : ceux qui se battent avec nous, et de quoi en ajouter */
let CBT = {nom:'', cote:'nous', rang:2, peuple:'', type:'', ouvert:false};
function blocCombattants(){
  const w = el('div','cbloc');
  const l = pnjsAuCombat();
  const nous = l.filter(p => p.combat.cote === 'nous');
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'À nos côtés'));
  t.append(el('span','mini', nous.length ? nous.filter(p => DEBOUT({pv:p.pv == null ? p.pvMax : p.pv, pvMax:p.pvMax})).length + ' debout sur ' + nous.length : 'personne'));
  w.append(t);
  nous.forEach(p => w.append(lignePnjCombat(p)));
  const d = el('details','ajoutadv'); d.open = CBT.ouvert;
  d.ontoggle = () => { CBT.ouvert = d.open; };
  d.append(el('summary', null, 'Quelqu’un se bat'));
  const f = el('div','tirage');
  const g = el('div','tajout');
  const n = el('input'); n.type = 'text'; n.placeholder = 'Garde du pont'; n.id = 'cbtNom'; n.style.flex = '1 1 140px';
  n.setAttribute('aria-label', 'Son nom');
  n.value = CBT.nom;
  n.oninput = () => { CBT.nom = n.value; };
  g.append(n);
  const sc = el('select'); sc.id = 'cbtCote'; sc.setAttribute('aria-label', 'De quel côté');
  COTES.forEach(x => sc.add(new Option(x.l, x.k)));
  sc.value = CBT.cote;
  sc.onchange = () => { CBT.cote = sc.value; };
  g.append(sc);
  const sr = el('select'); sr.id = 'cbtRang'; sr.setAttribute('aria-label', 'Son rang');
  ADV.rangs.forEach(x => sr.add(new Option('Rang ' + x.r + ' · ' + x.nom, x.r)));
  sr.value = String(CBT.rang);
  sr.onchange = () => { CBT.rang = +sr.value || 2; };
  g.append(sr);
  const sp = el('select'); sp.id = 'cbtPeuple'; sp.setAttribute('aria-label', 'Son peuple');
  sp.add(new Option('peuple inconnu', ''));
  PEUPLES_LIVRE.forEach(x => sp.add(new Option(x, x)));
  sp.value = CBT.peuple;
  sp.onchange = () => { CBT.peuple = sp.value; dessinerCombat(true); };
  g.append(sp);
  const st = el('select'); st.id = 'cbtType'; st.setAttribute('aria-label', 'Le genre de combattant qu’il est');
  TYPES_PNJ.forEach(x => st.add(new Option(x.l, x.k)));
  st.value = CBT.type || (pratiquesDuPeuple(CBT.peuple, false) ? 'espece' : 'guerrier');
  st.onchange = () => { CBT.type = st.value; };
  g.append(st);
  const ok = el('button','btn sm','Ajouter'); ok.type = 'button'; ok.id = 'cbtOk';
  ok.onclick = () => { if(nouveauCombattant(CBT.nom, CBT.cote, CBT.rang, CBT.peuple, st.value)) CBT.nom = ''; };
  g.append(ok);
  f.append(g);
  f.append(el('p','mini', 'Une fiche minimale, dans le Registre des Visages : son rang lui donne ses PV, sa réduction, ses dés et ses sept caractéristiques. Son peuple lui donne l’attaque de base de son espèce, donnée d’office, et son genre lui en donne une seconde : une vraie Pratique de sa liste, ou une attaque de son métier. Tout se réécrit sur sa fiche.'));
  /* une fiche déjà écrite, qu'on fait entrer */
  const dispo = pnjs().filter(p => p.statut !== 'mort' && !(p.combat && p.combat.dans && p.combat.seance === (seanceCourante() || {}).id));
  if(dispo.length){
    const q = el('div','tajout');
    const s = el('select'); s.id = 'cbtFiche'; s.setAttribute('aria-label', 'Une fiche déjà écrite');
    s.add(new Option('une fiche déjà écrite…', ''));
    dispo.forEach(p => s.add(new Option(p.nom + (p.combat ? ' · rang ' + p.combat.rang : ''), p.id)));
    s.style.flex = '1 1 160px';
    q.append(s);
    const b = el('button','btn ghost sm','Le faire entrer'); b.type = 'button'; b.id = 'cbtEntrer';
    b.onclick = () => { if(s.value) mettreAuCombat(s.value, true); };
    q.append(b);
    f.append(q);
  }
  d.append(f);
  w.append(d);
  return w;
}

/* ---------- la carte de combat ----------
   Une carte vient du Registre des Plans : un étage de bâtiment, ou ce qu'on voit d'un village. Elle arrive
   comme une rencontre arrive du Registre des Rencontres, par ce navigateur, et se garde avec la séance.
   Dessus, un jeton par combattant. Un pas vaut un mètre, comme les plans. Chacun a sa vitesse, dix pas par
   défaut, et la carte compte ce qu'il a déjà parcouru dans le round. Elle prévient, elle n'empêche pas. */

const CT_CLE = 'faelorenn.envoi.carte';
const CT_MAX = 400000;            /* au-delà, la carte est trop lourde pour la sauvegarde partagée */
const CT_VIT = 10;                /* dix pas par round, faute de mieux : le livre ne donne pas de vitesse */
const CT_ENVOI = {attente:null};
/* la vue : le cadre regardé, en mètres. Dans ce navigateur seulement */
const CT = {x:0, y:0, k:1, prise:null, plein:false, sel:'', dessin:false, plan:'', poser:'', choix:'',
  /* le cadre caché qui va chercher une carte, et la fenêtre où la carte est sortie */
  cadre:null, attente:null, minuteur:0, fen:null, etage:0, veille:0};

/* ---------- ce qui arrive du Registre des Plans ---------- */
function normCarte(o){
  if(!o || typeof o !== 'object') return null;
  const n = v => isFinite(+v) ? +v : 0;
  const svg = typeof o.svg === 'string' ? o.svg : '';
  if(!svg || svg.length > CT_MAX || !/^\s*<svg[\s>]/i.test(svg)) return null;
  const x0 = n(o.x0), y0 = n(o.y0), x1 = n(o.x1), y1 = n(o.y1);
  if(!(x1 > x0) || !(y1 > y0)) return null;
  return {nom:txtOu(o.nom).slice(0, 120), ref:txtOu(o.ref).slice(0, 60), x0:x0, y0:y0, x1:x1, y1:y1, svg:svg};
}
function normJetons(o){
  if(!o || typeof o !== 'object') return {};
  const out = {};
  Object.keys(o).slice(0, 80).forEach(k => {
    const j = o[k];
    if(!j || typeof j !== 'object' || !isFinite(+j.x) || !isFinite(+j.y)) return;
    out[String(k).slice(0, 60)] = {x:+j.x, y:+j.y, d:Math.max(0, +j.d || 0)};
  });
  return out;
}
function lireEnvoiCarte(){
  let o = null;
  try{ o = JSON.parse(localStorage.getItem(CT_CLE) || 'null'); }catch(e){ o = null; }
  const c = normCarte(o);
  if(!c){ CT_ENVOI.attente = null; return; }
  const e = seanceCourante();
  if(!e){ CT_ENVOI.attente = c; dessinerCarte(true); return; }
  CT_ENVOI.attente = null;
  try{ localStorage.removeItem(CT_CLE); }catch(x){}
  poserCarte(c);
  msgTable('La carte « ' + c.nom + ' » est arrivée du Registre des Plans.', true);
}
function poserCarte(c){
  const e = seanceCourante(); if(!e) return;
  changer(() => {
    const x = T.journal[e.id]; if(!x) return;
    T.journal[e.id] = Object.assign({}, x, {carte:c, majCarte:maintenant(), jetons:{}, majJetons:maintenant()});
  });
  CT.k = 1; CT.x = 0; CT.y = 0; CT.sel = ''; CT.poser = '';
  dessinerCarte(true);
}
function retirerCarte(){
  const e = seanceCourante(); if(!e) return;
  changer(() => {
    const x = T.journal[e.id]; if(!x) return;
    T.journal[e.id] = Object.assign({}, x, {carte:null, majCarte:maintenant()});
  });
}
const laCarte = () => { const e = seanceCourante(); return e && e.carte ? e.carte : null; };
const lesJetons = () => { const e = seanceCourante(); return e && e.jetons ? e.jetons : {}; };
function poserJetons(j){
  const e = seanceCourante(); if(!e) return;
  changer(() => {
    const x = T.journal[e.id]; if(!x) return;
    T.journal[e.id] = Object.assign({}, x, {jetons:j, majJetons:maintenant()});
  });
}

/* ---------- la vitesse, et ce qu'on a déjà parcouru ---------- */
const cleJeton = z => z.k + ':' + z.id;
function vitesseDe(z){
  const v = z.k === 'perso' ? z.x.vitesse : z.k === 'pnj' ? (z.x.combat || {}).vit : z.x.vit;
  return v == null || v === '' || !isFinite(+v) ? CT_VIT : Math.max(0, Math.round(+v));
}
function changerVitesse(z, v){
  v = v === '' || v == null ? null : Math.max(0, Math.min(200, parseInt(v, 10) || 0));
  changer(() => {
    if(z.k === 'perso'){ const c = T.personnages[z.id]; if(c){ const y = Object.assign({}, c, {vitesse:v, maj:maintenant()}); T.personnages[z.id] = y; } }
    else if(z.k === 'pnj'){ const p = T.pnj[z.id]; if(p && p.combat) T.pnj[z.id] = Object.assign({}, p, {combat:Object.assign({}, p.combat, {vit:v}), majCombat:maintenant()}); }
    else { const a = T.adversaires[z.id]; if(a) T.adversaires[z.id] = Object.assign({}, a, {vit:v, maj:maintenant()}); }
  });
}
/* les pas repartent de zéro à chaque nouveau round */
function remettreLesPas(){
  const j = lesJetons(), out = {};
  Object.keys(j).forEach(k => { out[k] = {x:j[k].x, y:j[k].y, d:0}; });
  poserJetons(out);
}

/* ---------- les portées ----------
   Le livre ne donne de portée à aucune arme : celles-ci se lisent sur le nom, et chaque arme d'une fiche
   porte un champ pour en écrire une autre. Zéro veut dire au contact. */
const CT_PORTEES = [
  [/arbal/i, 40], [/arc\s+long/i, 40], [/arc\s+de\s+chasse/i, 30], [/arc\s+court|arc\b/i, 20],
  [/fronde|couteau de jet|\bjet\b|javelot|francisque/i, 10]
];
function porteeArme(a){
  if(a && a.portee != null && a.portee !== '' && isFinite(+a.portee)) return Math.max(0, Math.round(+a.portee));
  const t = (a && a.nom || '') + ' ' + (a && a.notes || '') + ' ' + (a && a.ex || '');
  let p = 0;
  for(const r of CT_PORTEES) if(r[0].test(t)){ p = r[1]; break; }
  if(p && /port[ée]e[^.]{0,14}doubl|doubl[^.]{0,14}port[ée]e/i.test(t)) p *= 2;
  return p;
}
/* la portée d'une attaque d'en face : « contact », « 10 pas », « à vue » */
function porteeTexte(t){
  t = String(t || '');
  if(!t.trim()) return null;
  if(/\bcontact\b/i.test(t)) return 0;
  if(/[àa]\s*vue|aucune/i.test(t)) return -1;      /* -1 : pas de limite utile */
  const m = /(\d+)\s*(pas|m\b|m[èe]tres?)/i.exec(t);
  return m ? +m[1] : null;
}
const texteDePortee = p => p === 0 ? 'au contact' : p < 0 ? 'à vue' : p + ' pas';
/* jusqu'où porte ce qu'il tente : une Pratique le dit dans son texte (« contact », « à vue », « 10 pas »),
   le Combat est au contact, le Tir porte à l'arme. Le reste ne dit rien, et la carte se tait. */
function porteeDeQuoi(c, quoi, prat){
  if(prat) return porteeTexte(prat.d);
  if(quoi === 'comp:Combat' || quoi === 'car:Force') return 0;
  if(quoi === 'comp:Tir') return c ? porteeJeton({k:'perso', id:c.id, x:c}) : null;
  return null;
}

/* ---------- la distance entre deux combattants ---------- */
function positionDe(z){ const j = lesJetons()[cleJeton(z)]; return j ? [j.x, j.y] : null; }
function distanceEntre(a, b){
  const p = positionDe(a), q = positionDe(b);
  if(!p || !q) return null;
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}
/* qui frappe, pour la ligne de portée du compositeur */
function frappeurCompo(){
  if(COMPO.frappeur){ const z = unCombattant(COMPO.frappeur.k, COMPO.frappeur.id); if(z) return z; }
  if(COMPO.qui.k === 'perso'){ const z = unCombattant('perso', COMPO.qui.id); if(z) return z; }
  return null;
}
function cibleCompo(){
  if(!COMPO.cible) return null;
  return unCombattant('perso', COMPO.cible) || unCombattant('adv', COMPO.cible) || unCombattant('pnj', COMPO.cible);
}
/* ce que la carte dit de la portée : rien si l'un des deux n'a pas de jeton */
function motPortee(){
  if(!laCarte()) return null;
  const a = frappeurCompo(), b = cibleCompo();
  if(!a || !b || a === b) return null;
  const d = distanceEntre(a, b);
  if(d == null) return null;
  const pas = Math.round(d);
  const p = COMPO.portee == null ? null : COMPO.portee;
  if(p == null || p < 0) return {ok:true, txt:pas + ' pas entre ' + a.nom + ' et ' + b.nom + '.'};
  const ok = d <= p + .01;
  return {ok:ok, txt:pas + ' pas entre ' + a.nom + ' et ' + b.nom + ', ' + (p === 0 ? 'et il frappe au contact' : 'et sa portée est de ' + p + ' pas')
    + (ok ? '.' : ' : hors de portée.')};
}

/* ---------- la carte dessinée ---------- */
const CT_COUL = {nous:'#2f6b46', eux:'#8a2f2f', moi:'#1F3D2B'};
function cadreCarte(){
  const c = laCarte();
  if(!c) return {x:0, y:0, w:10, h:10};
  const W = (c.x1 - c.x0) / CT.k, H = (c.y1 - c.y0) / CT.k;
  return {x:c.x0 + CT.x, y:c.y0 + CT.y, w:W, h:H};
}
function jetonsDuTour(){
  return ceuxQuiSeBattent().map(z => {
    const j = lesJetons()[cleJeton(z)];
    return {z:z, j:j || null};
  });
}
/* poser un jeton à l'endroit choisi : on place soi-même, un clic sur la carte. Poser ne coûte aucun pas. */
function poserUnJeton(z, x, y){
  const c = laCarte(); if(!c) return;
  const j = Object.assign({}, lesJetons());
  j[cleJeton(z)] = {x:Math.max(c.x0, Math.min(c.x1, x)), y:Math.max(c.y0, Math.min(c.y1, y)), d:0};
  poserJetons(j);
}
function reprendreJeton(z){
  const j = Object.assign({}, lesJetons());
  delete j[cleJeton(z)];
  poserJetons(j);
}
/* ceux qui attendent encore d'être posés */
const aPoser = () => { const j = lesJetons(); return ceuxQuiSeBattent().filter(z => !j[cleJeton(z)]); };
/* poser d'office tous ceux qui manquent : les nôtres en bas, les autres en haut. Un coup de main, pas la règle */
function placerCeuxQuiManquent(){
  const c = laCarte(); if(!c) return false;
  const j = Object.assign({}, lesJetons());
  const l = ceuxQuiSeBattent().filter(z => !j[cleJeton(z)]);
  if(!l.length) return false;
  const w = c.x1 - c.x0, h = c.y1 - c.y0;
  const par = {nous:l.filter(z => z.cote === 'nous'), eux:l.filter(z => z.cote === 'eux')};
  ['nous', 'eux'].forEach(cote => {
    const n = par[cote].length;
    par[cote].forEach((z, i) => {
      j[cleJeton(z)] = {x:c.x0 + w * (i + 1) / (n + 1), y:c.y0 + h * (cote === 'nous' ? .88 : .12), d:0};
    });
  });
  poserJetons(j);
  return true;
}
function bougerJeton(z, x, y){
  const c = laCarte(); if(!c) return;
  /* un jeton ne se déplace que pendant le tour du sien */
  if(!peutJouer(z)){ msgTable(motPasSonTour(z), false); dessinerCarte(true); return; }
  const j = Object.assign({}, lesJetons()), cle = cleJeton(z);
  const av = j[cle] || {x:x, y:y, d:0};
  const d = (av.d || 0) + Math.hypot(x - av.x, y - av.y);
  j[cle] = {x:Math.max(c.x0, Math.min(c.x1, x)), y:Math.max(c.y0, Math.min(c.y1, y)), d:d};
  poserJetons(j);
}
const svgEl = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k])); return e; };

function dessinerCarte(force){
  const ici = $('seCarte'); if(!ici) return;
  if(CT.dessin) return;                       /* poser les jetons qui manquent redessine : pas de dessin dans le dessin */
  const dehors = carteDehors();
  const box = dehors ? CT.fen.document.getElementById('seCarte') : ici;
  if(!force && !dehors && occupe(ici)){ apresSaisie(ici, () => dessinerCarte(true)); return; }
  CT.dessin = true;
  try{
    if(dehors) dessinerRenvoi(ici);
    dessinerCarteVrai(box, force, dehors);
  } finally { CT.dessin = false; }
}
/* dans la page, pendant que la carte est sur l'autre écran */
function dessinerRenvoi(box){
  box.hidden = false;
  box.innerHTML = '';
  box.classList.remove('plein');
  document.body.classList.remove('carteplein');
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'La carte'));
  t.append(el('span','mini', 'sur l’autre fenêtre'));
  t.append(el('span','espace'));
  const b = el('button','btn ghost xs','La ramener ici'); b.type = 'button'; b.id = 'ctRamener';
  b.onclick = () => ramenerCarte();
  t.append(b);
  box.append(t);
}
function dessinerCarteVrai(box, force, dehors){
  const c = laCarte(), e = seanceCourante();
  /* le pavé se montre dès qu'un combat est en cours : sans lui, rien ne dit d'où vient une carte */
  const combat = !!e && (!!combatEnCours() || pnjsAuCombat().length > 0);
  box.hidden = !c && !CT_ENVOI.attente && !combat;
  if(box.hidden){ document.body.classList.remove('carteplein'); return; }
  box.innerHTML = '';
  if(!dehors){
    box.classList.toggle('plein', CT.plein);
    document.body.classList.toggle('carteplein', CT.plein && !!c);
  }
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'La carte'));
  if(!c && CT_ENVOI.attente){
    t.append(el('span','espace'));
    box.append(t);
    box.append(el('p','mini', 'Une carte attend : « ' + CT_ENVOI.attente.nom + ' ». Elle entre dans la séance en cours.'));
    const b = el('button','btn sm', e ? 'La poser dans la séance' : 'Commencer une séance et la poser'); b.type = 'button'; b.id = 'ctAttente';
    b.onclick = () => { if(!seanceCourante()) nouvelleSeance(); lireEnvoiCarte(); };
    box.append(b);
    return;
  }
  if(!c){ box.append(t); box.append(blocPrendreCarte()); return; }
  t.append(el('span','mini', c.nom + ' · ' + Math.round(c.x1 - c.x0) + ' × ' + Math.round(c.y1 - c.y0) + ' pas'));
  t.append(el('span','espace'));
  const rz = el('button','btn ghost xs','Tout voir'); rz.type = 'button'; rz.id = 'ctFit';
  rz.onclick = () => { CT.k = 1; CT.x = 0; CT.y = 0; dessinerCarte(true); };
  t.append(rz);
  /* les jetons se posent à la main, un par un ; ce bouton range les manquants en deux rangs */
  if(aPoser().length){
    const of = el('button','btn ghost xs','Les poser d’office'); of.type = 'button'; of.id = 'ctOffice';
    of.setAttribute('aria-label', 'Poser tous les jetons qui manquent : les nôtres en bas, ceux d’en face en haut');
    of.onclick = () => { CT.poser = ''; placerCeuxQuiManquent(); };
    t.append(of);
  }
  if(dehors){
    const rm = el('button','btn ghost xs','Ramener dans la table'); rm.type = 'button'; rm.id = 'ctRamener2';
    rm.onclick = () => ramenerCarte();
    t.append(rm);
  } else {
    const pl = el('button','btn ghost xs', CT.plein ? 'Réduire' : 'En grand'); pl.type = 'button'; pl.id = 'ctPlein';
    pl.onclick = () => { CT.plein = !CT.plein; dessinerCarte(true); if(typeof dessinerHub === 'function') dessinerHub(); };
    const so = el('button','btn ghost xs','Autre fenêtre'); so.type = 'button'; so.id = 'ctSortir';
    so.setAttribute('aria-label', 'Sortir la carte dans une fenêtre à part, pour un second écran');
    so.onclick = () => sortirCarte();
    const x = el('button','ax','×'); x.type = 'button'; x.id = 'ctRetirer';
    x.setAttribute('aria-label', 'Retirer la carte de la séance');
    x.onclick = () => retirerCarte();
    t.append(pl, so, x);
  }
  box.append(t);

  const zone = el('div','ctzone');
  zone.innerHTML = c.svg;
  const svg = zone.querySelector('svg');
  if(!svg){ box.append(el('p','mini', 'Cette carte ne se lit pas. Renvoie-la depuis le Registre des Plans.')); return; }
  const v = cadreCarte();
  svg.setAttribute('viewBox', fxn(v.x) + ' ' + fxn(v.y) + ' ' + fxn(v.w) + ' ' + fxn(v.h));
  svg.setAttribute('class', 'ctsvg');
  svg.removeAttribute('width'); svg.removeAttribute('height');
  const g = svgEl('g', {'class':'ctjetons'});
  const r = Math.max(.35, Math.min(1.1, v.w / 44));
  /* le cercle de déplacement de celui qu'on a choisi, et sa portée. Les pas ne se montrent que pendant son tour */
  const sel = CT.sel ? jetonsDuTour().find(q => cleJeton(q.z) === CT.sel) : null;
  if(sel && sel.j){
    const reste = peutJouer(sel.z) ? Math.max(0, vitesseDe(sel.z) - sel.j.d) : 0;
    if(reste > 0) g.append(svgEl('circle', {cx:fxn(sel.j.x), cy:fxn(sel.j.y), r:fxn(reste), 'class':'ctpas'}));
    const p = porteeJeton(sel.z);
    if(p > 0) g.append(svgEl('circle', {cx:fxn(sel.j.x), cy:fxn(sel.j.y), r:fxn(p), 'class':'ctportee'}));
  }
  jetonsDuTour().forEach(q => {
    if(!q.j) return;
    const z = q.z, cle = cleJeton(z), bas = !DEBOUT(z);
    const gr = svgEl('g', {'class':'ctj' + (bas ? ' ctbas' : '') + (CT.sel === cle ? ' ctsel' : ''), 'data-jeton':cle});
    gr.append(svgEl('circle', {cx:fxn(q.j.x), cy:fxn(q.j.y), r:fxn(r), fill:CT_COUL[z.cote] || CT_COUL.eux, stroke:'#F4F2EA', 'stroke-width':fxn(r * .16)}));
    const tx = svgEl('text', {x:fxn(q.j.x), y:fxn(q.j.y + r * .34), 'font-size':fxn(r), 'text-anchor':'middle', fill:'#F4F2EA'});
    tx.textContent = initialesDe(z.nom);
    gr.append(tx);
    const nm = svgEl('text', {x:fxn(q.j.x), y:fxn(q.j.y - r * 1.25), 'font-size':fxn(r * .85), 'text-anchor':'middle', 'class':'ctnom'});
    nm.textContent = z.nom;
    gr.append(nm);
    g.append(gr);
  });
  svg.append(g);
  box.append(zone);
  brancherCarte(svg, zone);
  /* qui attend d'être posé, et où en est la pose en cours */
  const att = aPoser();
  if(CT.poser){
    const q = ceuxQuiSeBattent().find(y => cleJeton(y) === CT.poser);
    box.append(el('p','mini ctposer', q ? 'Clique la carte là où tu poses ' + q.nom + '.' : 'Clique la carte pour poser ce jeton.'));
  } else if(att.length){
    box.append(el('p','mini ctposer', att.length === 1
      ? att[0].nom + ' n’est pas encore posé : « Poser », sous la carte.'
      : att.length + ' jetons ne sont pas posés : « Poser » sous la carte, un par un, ou « Les poser d’office ».'));
  }
  box.append(listeJetons());
}
/* ---------- aller chercher une carte, quand il n'y en a pas ----------
   Elle ne se fabrique pas ici : on ouvre un plan dans le Registre des Plans et on clique « Vers la table ».
   Le pavé le dit, et mène droit au plan, sans quoi personne ne devine d'où vient une carte. */
function blocPrendreCarte(){
  const w = el('div');
  const pl = lesPlansConnus();
  w.append(el('p','mini', pl.rien
    ? 'Pas de carte pour ce combat, et aucun plan connu de ce navigateur pour l’instant. Ouvre le Registre des Plans une fois, ou relie le dépôt, et tes plans paraîtront ici.'
    : 'Pas de carte pour ce combat. Choisis un lieu : la carte du village, ou l’étage d’un de ses bâtiments.'));
  const g = el('div','tajout');
  const b = el('button','btn sm', CT.attente ? 'On va la chercher…' : pl.rien ? 'Ouvrir le Registre des Plans' : 'Choisir une carte');
  b.type = 'button'; b.id = 'ctChoisir'; b.disabled = !!CT.attente;
  b.onclick = () => { if(pl.rien) ouvrirLesPlans(''); else ouvrirChoixCarte(); };
  g.append(b);
  /* ouvrir le plan soi-même, pour cadrer une ruelle au doigt : sur la même ligne */
  if(!pl.rien){
    const a = el('button','btn ghost sm', 'Ouvrir le Registre des Plans'); a.type = 'button'; a.id = 'ctOuvrirPlans';
    a.onclick = () => ouvrirLesPlans(CT.plan);
    g.append(a);
  }
  w.append(g);
  return w;
}
function ouvrirLesPlans(ref){
  const q = ref ? 'plans.html#plan=' + encodeURIComponent(ref) : 'plans.html';
  if(typeof ouvrirPage === 'function') ouvrirPage(q, typeof ONGLET_PLANS === 'string' ? ONGLET_PLANS : 'faelorenn-plans');
  else window.open(q, '_blank');
}
/* ---------- choisir une carte : les lieux, puis ce qu'on prend dedans ----------
   Un village d'abord, puis sa carte entière ou l'étage d'une de ses bâtisses. Les bâtiments qu'aucun village
   ne porte sont rangés à part : une tour isolée, une ruine, un plan dessiné pour lui-même. */
function lesPlansConnus(){
  const pl = typeof lxPlans === 'function' ? lxPlans() : {b:{}, v:{}};
  const bat = pl.b || {}, vil = pl.v || {};
  const pris = {};
  const villages = Object.keys(vil).map(id => {
    const v = vil[id];
    const l = (v.bati || []).filter(x => bat[x.lien]).map(x => { pris[x.lien] = 1; return {id:x.lien, nom:x.nom || bat[x.lien].nom || 'Sans nom'}; });
    l.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return {id:id, nom:v.nom || 'Village sans nom', bati:l};
  });
  villages.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const seuls = Object.keys(bat).filter(id => !pris[id]).map(id => ({id:id, nom:bat[id].nom || 'Sans nom'}));
  seuls.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  return {villages:villages, seuls:seuls, bat:bat, rien:!villages.length && !seuls.length};
}
const etagesDe = (bat, id) => { const b = bat[id]; return b && b.etages && b.etages.length ? b.etages : ['Rez-de-chaussée']; };
function ouvrirChoixCarte(){ CT.choix = ''; dessinerChoixCarte(); }
function fermerChoixCarte(){
  const f = $('ctFen'); if(f) f.remove();
  document.removeEventListener('keydown', ctEchap, true);
  const b = $('ctChoisir'); if(b) b.focus();
}
function ctEchap(ev){ if(ev.key === 'Escape'){ ev.preventDefault(); fermerChoixCarte(); } }
/* une ligne de la fenêtre : un nom, ce que c'est, et ce qu'elle fait */
function ligneChoix(nom, quoi, faire, gras){
  const b = el('button','ctlig'); b.type = 'button';
  b.append(el('b', null, nom));
  if(quoi) b.append(el('span','mini', quoi));
  b.onclick = faire;
  if(gras) b.classList.add('ctliggras');
  return b;
}
/* un bâtiment dans la liste : sa ligne seule s'il n'a qu'un étage, son nom puis ses étages sinon */
function lignesBatiment(liste, bat, q){
  const et = etagesDe(bat, q.id);
  if(et.length === 1){ liste.append(ligneChoix(q.nom, '', () => prendreEtFermer('b:' + q.id + ':0'), true)); return; }
  liste.append(el('p','ctsous', q.nom));
  et.forEach((nom, i) => {
    const l = ligneChoix(nom, '', () => prendreEtFermer('b:' + q.id + ':' + i));
    l.classList.add('ctetg');
    liste.append(l);
  });
}
function dessinerChoixCarte(){
  const avant = $('ctFen'); if(avant) avant.remove();
  const pl = lesPlansConnus();
  const fen = el('div','ctfen'); fen.id = 'ctFen';
  fen.onclick = ev => { if(ev.target === fen) fermerChoixCarte(); };
  const box = el('div','ctfenin'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Choisir une carte de combat');
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'Choisir une carte'));
  t.append(el('span','espace'));
  const x = el('button','ax','×'); x.type = 'button'; x.id = 'ctFenFermer';
  x.setAttribute('aria-label', 'Fermer');
  x.onclick = () => fermerChoixCarte();
  t.append(x);
  box.append(t);
  const v = CT.choix ? pl.villages.find(q => q.id === CT.choix) : null;
  const liste = el('div','ctchoix');
  if(!v){
    box.append(el('p','mini', 'Un village, ou un bâtiment qui n’est dans aucun village.'));
    if(pl.villages.length) liste.append(el('p','ctgrp', 'Les villages'));
    pl.villages.forEach(q => liste.append(ligneChoix(q.nom,
      q.bati.length ? q.bati.length + (q.bati.length > 1 ? ' bâtiments' : ' bâtiment') : 'aucun bâtiment',
      () => { CT.choix = q.id; dessinerChoixCarte(); }, true)));
    if(pl.seuls.length) liste.append(el('p','ctgrp', 'Les bâtiments à part'));
    pl.seuls.forEach(q => lignesBatiment(liste, pl.bat, q));
  } else {
    const r = el('button','btn ghost xs','← Tous les lieux'); r.type = 'button'; r.id = 'ctFenRetour';
    r.onclick = () => { CT.choix = ''; dessinerChoixCarte(); };
    box.append(r);
    box.append(el('p','ctitre2', v.nom));
    liste.append(ligneChoix('La carte du village', 'ce que la carte montre, trois cents pas de côté au plus',
      () => prendreEtFermer('v:' + v.id), true));
    if(v.bati.length) liste.append(el('p','ctgrp', 'Les bâtiments de ce village'));
    v.bati.forEach(q => lignesBatiment(liste, pl.bat, q));
    if(!v.bati.length) liste.append(el('p','mini', 'Aucune bâtisse de ce village n’a son plan. Dans le Registre des Plans, une bâtisse reçoit le sien par « Plan lié ».'));
  }
  box.append(liste);
  const pied = el('div','acts'); pied.style.marginTop = '10px';
  const o = el('button','btn ghost xs','Ouvrir le Registre des Plans'); o.type = 'button'; o.id = 'ctFenPlans';
  o.onclick = () => { const r = v ? 'v:' + v.id : ''; fermerChoixCarte(); ouvrirLesPlans(r); };
  pied.append(o, el('span','mini', 'Pour cadrer une ruelle au doigt : ouvre le plan, zoome, puis « Vers la table ».'));
  box.append(pied);
  fen.append(box);
  document.body.append(fen);
  document.addEventListener('keydown', ctEchap, true);
  const prem = box.querySelector('.ctlig') || x;
  if(prem) prem.focus();
}
function prendreEtFermer(ref){
  CT.plan = ref.slice(0, ref.charAt(0) === 'b' ? ref.lastIndexOf(':') : ref.length);
  fermerChoixCarte();
  prendreCarte(ref);
}
/* ---------- aller chercher la carte soi-même ----------
   Le Registre des Plans est le seul à savoir dessiner un plan. La table l'ouvre donc dans un cadre caché,
   avec « #carte=b:ID:0 » : il dessine, pose la carte dans ce navigateur et répond. Personne ne quitte la table.
   Dans ce mode, le Registre des Plans ne garde rien et n'envoie rien au dépôt. */
function nettoyerCadre(){
  clearTimeout(CT.minuteur); CT.minuteur = 0;
  if(CT.cadre){ try{ CT.cadre.remove(); }catch(e){} CT.cadre = null; }
}
function prendreCarte(ref){
  if(!seanceCourante()){ msgTable('Ouvre une séance d’abord.', false); return; }
  nettoyerCadre();
  const f = document.createElement('iframe');
  f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.title = 'Registre des Plans';
  f.style.cssText = 'position:absolute;left:-20000px;top:0;width:1200px;height:800px;border:0;opacity:0;pointer-events:none';
  f.src = 'plans.html#carte=' + encodeURIComponent(ref);
  CT.cadre = f; CT.attente = ref;
  document.body.append(f);
  CT.minuteur = setTimeout(() => {
    if(!CT.attente) return;
    CT.attente = null; nettoyerCadre();
    msgTable('Le Registre des Plans n’a pas répondu. Ouvre-le toi-même, puis « Vers la table ».', false);
    dessinerCarte(true);
  }, 25000);
  dessinerCarte(true);
}
window.addEventListener('message', ev => {
  const d = ev.data;
  if(!d || d.faelorenn !== 'carte' || !CT.attente) return;
  if(!CT.cadre || ev.source !== CT.cadre.contentWindow) return;   /* seulement notre cadre */
  CT.attente = null; nettoyerCadre();
  if(d.ok) lireEnvoiCarte();
  else msgTable(d.err || 'Le Registre des Plans n’a pas pu faire cette carte.', false);
  dessinerCarte(true);
});

/* ---------- la carte sur l'autre écran ----------
   Une fenêtre à part, qu'on pose où l'on veut. Elle n'a pas de code à elle : la table y dessine, et les
   gestes faits dedans repassent par la table, donc par la sauvegarde partagée. */
const carteDehors = () => !!(CT.fen && !CT.fen.closed && CT.fen.document && CT.fen.document.getElementById('seCarte'));
function sortirCarte(){
  if(carteDehors()){ try{ CT.fen.focus(); }catch(e){} return; }
  let w = null;
  try{ w = window.open('', 'faelorenn-carte', 'width=1200,height=900'); }catch(e){ w = null; }
  if(!w){ msgTable('Le navigateur a refusé la fenêtre. Autorise les fenêtres pour ce site, puis réessaie.', false); return; }
  const styles = [].map.call(document.querySelectorAll('style'), s => s.textContent).join('\n');
  w.document.open();
  w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>La carte · Faelorenn</title><style>' + styles
    + '\nbody{margin:0;padding:10px;background:var(--paper)}#seCarte{margin:0;height:calc(100vh - 20px);display:flex;flex-direction:column}'
    + '\n#seCarte .ctzone{flex:1 1 auto;display:flex;align-items:center;justify-content:center}'
    + '\n#seCarte .ctsvg{max-height:100%;width:100%}'
    + '</style></head><body><div id="seCarte" class="carte"></div></body></html>');
  w.document.close();
  CT.fen = w;
  /* refermée d'un côté ou de l'autre, la carte revient dans la table. Le « beforeunload » d'une fenêtre
     fille n'arrive pas toujours : on la surveille aussi, une fois par seconde. */
  try{ w.addEventListener('beforeunload', () => { CT.fen = null; setTimeout(() => dessinerCarte(true), 60); }); }catch(e){}
  clearInterval(CT.veille);
  CT.veille = setInterval(() => {
    if(CT.fen && !CT.fen.closed) return;
    clearInterval(CT.veille); CT.veille = 0;
    if(CT.fen){ CT.fen = null; dessinerCarte(true); }
  }, 1000);
  setTimeout(() => dessinerCarte(true), 60);
  dessinerCarte(true);
}
function ramenerCarte(){
  clearInterval(CT.veille); CT.veille = 0;
  if(CT.fen && !CT.fen.closed){ try{ CT.fen.close(); }catch(e){} }
  CT.fen = null;
  dessinerCarte(true);
}
const fxn = n => Math.round(n * 1000) / 1000;
function initialesDe(n){
  const m = String(n || '').trim().split(/\s+/).filter(Boolean);
  if(!m.length) return '?';
  if(m.length === 1) return m[0].slice(0, 2);
  return (m[0][0] + m[1][0]).toUpperCase();
}
/* sa portée la plus longue, en pas : son arme pour un personnage, son attaque propre pour les autres.
   Ne pas confondre avec porteeDe(a2) du bestiaire, qui écrit la portée d'une attaque en toutes lettres. */
function porteeJeton(z){
  if(z.k === 'perso'){
    const l = (z.x.armes || []).map(porteeArme);
    return l.length ? Math.max.apply(null, l) : 0;
  }
  const o = z.k === 'pnj' ? (z.x.combat || {}) : z.x;
  const l = [o.a1, o.a2].filter(Boolean).map(a => porteeTexte(a.p)).filter(p => p != null);
  if(l.some(p => p < 0)) return -1;              /* à vue : pas de cercle à dessiner */
  return l.length ? Math.max.apply(null, l) : 0;
}

/* ---------- la souris, le doigt, la molette ---------- */
function brancherCarte(svg, zone){
  const enM = ev => {
    const m = svg.getScreenCTM();
    if(!m) return null;
    const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    const q = p.matrixTransform(m.inverse());
    return [q.x, q.y];
  };
  svg.addEventListener('pointerdown', ev => {
    const g = ev.target.closest ? ev.target.closest('[data-jeton]') : null;
    const m = enM(ev); if(!m) return;
    /* une pose en attente : ce clic la place, où qu'il tombe */
    if(CT.poser){
      const q = ceuxQuiSeBattent().find(y => cleJeton(y) === CT.poser);
      CT.poser = '';
      if(q){ CT.sel = cleJeton(q); poserUnJeton(q, m[0], m[1]); }
      else dessinerCarte(true);
      return;
    }
    if(g){
      CT.sel = g.getAttribute('data-jeton');
      const z = ceuxQuiSeBattent().find(y => cleJeton(y) === CT.sel);
      /* hors de son tour, on peut le choisir pour le voir, pas le déplacer */
      if(z && !peutJouer(z)){ msgTable(motPasSonTour(z), false); dessinerCarte(true); return; }
      CT.prise = {cle:CT.sel, m0:m};
      svg.setPointerCapture(ev.pointerId);
      dessinerCarte(true);
      return;
    }
    CT.sel = '';
    CT.prise = {vue:true, m0:m, x0:CT.x, y0:CT.y};
    svg.setPointerCapture(ev.pointerId);
    dessinerCarte(true);
  });
  svg.addEventListener('pointermove', ev => {
    if(!CT.prise) return;
    const m = enM(ev); if(!m) return;
    if(CT.prise.vue){
      CT.x = CT.prise.x0 - (m[0] - CT.prise.m0[0]);
      CT.y = CT.prise.y0 - (m[1] - CT.prise.m0[1]);
      const v = cadreCarte();
      svg.setAttribute('viewBox', fxn(v.x) + ' ' + fxn(v.y) + ' ' + fxn(v.w) + ' ' + fxn(v.h));
      return;
    }
    const q = svg.querySelector('[data-jeton="' + CT.prise.cle + '"]');
    if(q) q.setAttribute('transform', 'translate(' + fxn(m[0] - CT.prise.m0[0]) + ' ' + fxn(m[1] - CT.prise.m0[1]) + ')');
  });
  const fin = ev => {
    if(!CT.prise) return;
    const p = CT.prise; CT.prise = null;
    if(p.vue){ dessinerCarte(true); return; }
    const m = enM(ev);
    const z = ceuxQuiSeBattent().find(y => cleJeton(y) === p.cle);
    if(m && z && (Math.abs(m[0] - p.m0[0]) > .05 || Math.abs(m[1] - p.m0[1]) > .05)){
      const j = lesJetons()[p.cle];
      bougerJeton(z, (j ? j.x : m[0]) + (m[0] - p.m0[0]), (j ? j.y : m[1]) + (m[1] - p.m0[1]));
    } else dessinerCarte(true);
  };
  svg.addEventListener('pointerup', fin);
  svg.addEventListener('pointercancel', fin);
  zone.addEventListener('wheel', ev => {
    ev.preventDefault();
    const c = laCarte(); if(!c) return;
    const av = cadreCarte();
    CT.k = Math.max(.4, Math.min(12, CT.k * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
    const ap = cadreCarte();
    CT.x += (av.w - ap.w) / 2; CT.y += (av.h - ap.h) / 2;
    dessinerCarte(true);
  }, {passive:false});
}

/* ---------- sous la carte : qui est où, à quelle vitesse ---------- */
function listeJetons(){
  const u = el('div','ctliste');
  jetonsDuTour().forEach(q => {
    const z = q.z, cle = cleJeton(z), v = vitesseDe(z), son = peutJouer(z);
    const l = el('div','ctl' + (CT.sel === cle ? ' ctlsel' : '') + (DEBOUT(z) ? '' : ' ctlbas') + (son && priorites() ? ' ctlmoi' : ''));
    const pst = el('span','ctpuce'); pst.style.background = CT_COUL[z.cote] || CT_COUL.eux;
    l.append(pst);
    const n = el('button','ctlnom', z.nom); n.type = 'button';
    n.setAttribute('aria-label', 'Choisir ' + z.nom + ' sur la carte');
    n.onclick = () => { CT.sel = CT.sel === cle ? '' : cle; dessinerCarte(true); };
    l.append(n);
    if(!q.j){
      /* on le pose soi-même : un clic ici, un clic sur la carte */
      const b = el('button','btn ghost xs' + (CT.poser === cle ? ' on' : ''), CT.poser === cle ? 'clique la carte' : 'Poser'); b.type = 'button';
      b.setAttribute('aria-label', 'Poser le jeton de ' + z.nom + ' : clique ensuite la carte, à l’endroit voulu');
      b.onclick = () => { CT.poser = CT.poser === cle ? '' : cle; dessinerCarte(true); };
      l.append(b);
    } else {
      /* le compteur de pas ne se montre que pour celui dont c'est le tour */
      if(son) l.append(el('span','ctpasn' + (q.j.d > v + .01 ? ' trop' : ''), Math.round(q.j.d) + ' / ' + v + ' pas'));
      const x = el('button','ax','×'); x.type = 'button';
      x.setAttribute('aria-label', 'Reprendre le jeton de ' + z.nom + ' : il sera à reposer');
      x.onclick = () => { CT.poser = ''; reprendreJeton(z); };
      l.append(x);
    }
    const i = el('input'); i.type = 'number'; i.min = '0'; i.max = '200'; i.className = 'ctvit';
    i.value = String(v); i.setAttribute('aria-label', 'Vitesse de ' + z.nom + ', en pas par round');
    i.onchange = () => changerVitesse(z, i.value);
    l.append(i);
    u.append(l);
  });
  if(!u.children.length) u.append(el('p','mini', 'Personne à poser : la compagnie et ceux d’en face paraissent ici tout seuls.'));
  return u;
}
