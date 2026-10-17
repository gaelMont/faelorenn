/* ============ le bestiaire maison ============ */

const PORTEES = ['contact', '5 pas', '10 pas', '20 pas', 'à vue', 'd’en haut', 'zone de 3 pas', 'aucune'];
const LORE = [
  {k:'desc',  l:'À quoi il ressemble', ph:'Ce qu’on voit en premier, ce qu’on entend, ce qui reste en mémoire.'},
  {k:'ou',    l:'Où on le croise',     ph:'Terrain, région, registre de Floraison, moment de la journée.'},
  {k:'veut',  l:'Ce qu’il veut',  ph:'Pourquoi il est là, comment il se bat, quand il s’arrête.'},
  {k:'fuit',  l:'Ce qui le fait fuir', ph:'Sa faiblesse, ce qui le fait céder, reculer ou changer de camp.'},
  {k:'butin', l:'Ce qu’il laisse', ph:'Une ligne par objet. Numérotées « 1-2 Une dent en or », la table y tire au dé quand on le fouille.'},
  {k:'notes', l:'Notes pour le MJ',    ph:'Idées de scène, variantes, pièges à éviter.'}
];
const BST = {mode:'local', db:null, pret:false, erreur:'', source:'', gh:null, ghErreur:'', recherche:'', inclureLivre:true, aSupprimer:null, famASupprimer:null,
  tableASupprimer:null, retoucheAOter:null, essaiTable:null, flashTable:null, anciennesAEffacer:false};
let ED = null;   /* la creature en cours d'edition : {c, nouveau} */
let FED = null;  /* la famille en cours d'edition : {f, nouveau, livre, miennes} */
let TED = null;  /* la table de butin en cours d'edition : {t, nouveau, qui} */
const CLE_OK = /^[A-Za-z0-9_.~:@+-]{1,120}$/;

/* ---------- forme d'une creature maison ---------- */
function nouvelId(){ return 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
function vide(){
  return {id:nouvelId(), src:'maison', n:'', r:2, t:[], tr:[], p:'',
    a2:{n:'', t:'phy', p:'contact', e:'', el:''}, mod:{pv:'', red:'', deg:'', cartes:''}, renf:'',
    desc:'', ou:'', veut:'', fuit:'', butin:'', notes:'', maj:0};
}
function normalise(o){
  const c = vide();
  if(!o || typeof o !== 'object') return c;
  const txt = v => (v == null ? '' : String(v));
  c.id = CLE_OK.test(o.id || '') ? o.id : nouvelId();
  c.n = txt(o.n).slice(0, 120);
  /* une entrée du livre retouchée garde le rang de l'entrée ; une retouche de l'ancien bestiaire, celui de son identifiant */
  const lv = livreParId(c.id), mr = ANCIEN_ID.test(c.id) ? +c.id.split('-')[1] : 0;
  c.r = lv ? lv.r : mr ? mr : [1,2,3,4,5].indexOf(+o.r) >= 0 ? +o.r : 2;
  /* on garde les etiquettes d'une famille pas encore chargee : l'affichage ignore celles qui n'existent pas */
  c.t = Array.isArray(o.t) ? o.t.filter((x, i, a) => typeof x === 'string' && CLE_OK.test(x) && a.indexOf(x) === i).slice(0, 40) : [];
  /* les traits : on garde ceux du catalogue, au rang où ils tiennent */
  c.tr = Array.isArray(o.tr) ? trierTraits(o.tr.filter(x => typeof x === 'string'), c.r) : [];
  c.p = txt(o.p);
  const a = o.a2 || {};
  c.a2 = {n:txt(a.n), t:a.t === 'mag' ? 'mag' : 'phy', p:txt(a.p) || 'contact', e:txt(a.e),
    el: ELEM[a.el] ? a.el : ''};
  if(c.a2.el) c.a2.t = 'mag';
  /* le type et l'élément tels que le bestiaire les écrit, tant qu'ils disent la même chose que le reste */
  const ty = a.ty ? TYPE_ATQ[a.ty] : null;
  if(ty && ty.t === c.a2.t) c.a2.ty = a.ty;
  if(!c.a2.el && c.a2.t === 'mag' && txt(a.elt).trim()) c.a2.elt = txt(a.elt).trim().slice(0, 60);
  const m = o.mod || {};
  c.mod = {pv:txt(m.pv), red:txt(m.red), deg:txt(m.deg), cartes:txt(m.cartes)};
  ['renf'].concat(LORE.map(x => x.k)).forEach(k => c[k] = txt(o[k]));
  c.maj = +o.maj || 0;
  return c;
}

/* ---------- forme d'une famille maison ---------- */
function nouvelleCle(){ return 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
function normaliseFam(o){
  const txt = v => (v == null ? '' : String(v));
  o = o && typeof o === 'object' ? o : {};
  const k = typeof o.k === 'string' ? o.k : '';
  return {
    k: CLE_OK.test(k) && !ADV.familles.some(x => x.k === k) ? k : nouvelleCle(),
    l: txt(o.l).trim().slice(0, 60),
    d: txt(o.d).trim().slice(0, 300),
    /* une entrée de l'ancien bestiaire reste notée, sans que personne n'y réponde */
    livre: Array.isArray(o.livre) ? o.livre.filter((id, i, a) => typeof id === 'string' && /^livre-[A-Za-z0-9-]{1,110}$/.test(id) && a.indexOf(id) === i) : [],
    maj: +o.maj || 0
  };
}

/* ---------- forme d'une table de butin maison ---------- */
function nouvelleCleTable(){ return 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
function normaliseTable(o){
  const txt = v => (v == null ? '' : String(v));
  o = o && typeof o === 'object' ? o : {};
  const k = typeof o.k === 'string' ? o.k : '';
  return {
    k: CLE_OK.test(k) ? k : nouvelleCleTable(),
    l: txt(o.l).trim().slice(0, 60),
    d: txt(o.d).trim().slice(0, 300),
    lignes: txt(o.lignes).slice(0, 6000),
    qui: Array.isArray(o.qui) ? o.qui.filter((id, i, a) => typeof id === 'string' && CLE_OK.test(id) && a.indexOf(id) === i).slice(0, 300) : [],
    maj: +o.maj || 0
  };
}
/* « Un d6 sur 3 lignes. » : ce que la table donnera, et ce qui cloche */
function resumeTable(texte){
  const t = lireTableButin(texte);
  if(!t.lignes.length) return 'Vide pour l’instant.';
  const n = t.lignes.length + ' ligne' + (t.lignes.length > 1 ? 's' : '');
  return (t.numerotee ? 'Un d' + t.de + ', sur ' + n + '.' : 'Une ligne au hasard, sur ' + n + '.') + (t.avis.length ? ' ' + t.avis.join(' ') : '');
}

/* ---------- stockage : avec la page quand c'est possible, sinon dans ce navigateur ----------
   Ce navigateur garde une copie, plus deux listes : ce qui n'est pas encore parti avec la page
   (attente) et ce qui a ete supprime ici sans que la page l'ait encore su (supprimes).
   Tout le reste vient de la page : ce qui a ete supprime ailleurs ne revient pas. */
/* les créatures portent aussi tes retouches des entrées du livre (livre-loup) : elles prennent la place de l'entrée.
   Celles de l'ancien bestiaire restent gardées à part, sans rien remplacer */
const MAGS = {
  creatures: {col:'creatures', cle:'faelorenn.bestiaire', champ:'id', norm:o => normalise(o),
    get:() => MAISON.concat(RETOUCHES, ANCIENNES),
    set:l => {
      MAISON = l.filter(c => !estRetouche(c) && !estAncienne(c));
      RETOUCHES = l.filter(estRetouche); ANCIENNES = l.filter(estAncienne);
      appliquerRetouches();
    },
    attente:[], supprimes:[], pret:false},
  familles:  {col:'familles', cle:'faelorenn.familles', champ:'k', norm:o => normaliseFam(o),
    get:() => FAM_MAISON, set:l => { FAM_MAISON = l; }, attente:[], supprimes:[], pret:false},
  butins:    {col:'butins', cle:'faelorenn.butins', champ:'k', norm:o => normaliseTable(o),
    get:() => TABLES_BUTIN, set:l => { TABLES_BUTIN = l; }, attente:[], supprimes:[], pret:false}
};
function lireMag(m){
  let o = null;
  try{ const t = localStorage.getItem(m.cle); o = t ? JSON.parse(t) : null; }catch(e){}
  const ids = a => Array.isArray(a) ? a.filter(x => typeof x === 'string') : [];
  /* l'ancien format, une simple liste : rien ne dit que tout est parti avec la page */
  const dates = x => { const d = {}; if(x && typeof x === 'object') Object.keys(x).forEach(k => { if(isFinite(+x[k])) d[k] = +x[k]; }); return d; };
  if(Array.isArray(o)){ const items = o.map(m.norm); return {items:items, attente:items.map(x => x[m.champ]), supprimes:[], dates:{}, source:''}; }
  if(o && typeof o === 'object' && Array.isArray(o.items)) return {items:o.items.map(m.norm), attente:ids(o.attente), supprimes:ids(o.supprimes), dates:dates(o.dates), source:typeof o.source === 'string' ? o.source : ''};
  return {items:[], attente:[], supprimes:[], dates:{}, source:''};
}
/* source : le stockage avec lequel ce navigateur s'est accordé la dernière fois (la page, ou tel dépôt) */
function ecrireMag(m){
  const dates = {};
  m.supprimes.forEach(id => { if(m.dates && m.dates[id]) dates[id] = m.dates[id]; });
  m.dates = dates;
  try{ localStorage.setItem(m.cle, JSON.stringify({format:2, items:m.get(), attente:m.attente, supprimes:m.supprimes, dates:dates, source:m.source || ''})); }catch(e){}
}
function corpsDb(m, x){ const o = JSON.parse(JSON.stringify(x)); delete o[m.champ]; return o; }
function echec(e, relancer, essai){
  const code = e && e.code || 'unavailable';
  if(code === 'unavailable' && !essai){ setTimeout(relancer, 400 + Math.random() * 800); return; }
  BST.erreur = code; drawEtat();
}
/* on envoie toujours la version du moment, jamais une copie restee en route */
function pousser(m, id, essai){
  if(!BST.db) return;
  const x = m.get().find(y => y[m.champ] === id);
  if(!x) return;
  const maj = x.maj || 0;
  BST.db.collection(m.col).doc(id).set(corpsDb(m, x)).then(() => {
    const ici = m.get().find(y => y[m.champ] === id);
    if(!ici || (ici.maj || 0) <= maj){ m.attente = m.attente.filter(y => y !== id); ecrireMag(m); }
  }, e => echec(e, () => pousser(m, id, true), essai));
}
/* la date de la suppression part avec elle : une retouche faite ailleurs, plus tard, l'emporte */
function effacer(m, id, essai){
  if(!BST.db) return;
  BST.db.collection(m.col).doc(id).delete(m.dates && m.dates[id]).then(() => {
    m.supprimes = m.supprimes.filter(y => y !== id); ecrireMag(m);
  }, e => echec(e, () => effacer(m, id, true), essai));
}
/* ce que montre la page, corrige de ce qui attend encore ici */
function fusion(m, docs){
  const loc = m.get(), garde = [], vus = {};
  docs.forEach(d => {
    const id = d[m.champ];
    vus[id] = true;
    if(m.supprimes.indexOf(id) >= 0) return;
    const l = m.attente.indexOf(id) >= 0 ? loc.find(y => y[m.champ] === id) : null;
    if(l && (l.maj || 0) > (d.maj || 0)) garde.push(l);
    else { garde.push(d); if(l) m.attente = m.attente.filter(y => y !== id); }
  });
  loc.forEach(l => { const id = l[m.champ]; if(!vus[id] && m.attente.indexOf(id) >= 0) garde.push(l); });
  /* une suppression ne s'oublie qu'une fois confirmée par le stockage (effacer) */
  return garde;
}

function demarrerStockage(){
  Object.keys(MAGS).forEach(n => { const m = MAGS[n], o = lireMag(m); m.set(o.items); m.attente = o.attente; m.supprimes = o.supprimes; m.dates = o.dates; m.source = o.source; });
  let attente = null;
  /* sur le site, la sauvegarde en ligne : le dépôt GitHub (enligne.js) ; dans la page hébergée par Claude, la page elle-même */
  ghcCharger();
  if(ghcPret()){ BST.source = 'github'; BST.ghErreur = ''; BST.gh = ghBestiaire(); attente = Promise.resolve(BST.gh.db); }
  else {
    BST.source = 'page';
    try{ if(typeof claude !== 'undefined' && claude && typeof claude.use === 'function') attente = claude.use('db'); }catch(e){}
  }
  if(!attente){ BST.mode = 'local'; BST.pret = true; return; }
  const local = () => { BST.mode = 'local'; BST.db = null; BST.pret = true; draw(); };
  const cleSource = BST.source === 'github' ? 'gh:' + GHC.api + '|' + GHC.depot + '|' + GHC.branche : 'page';
  Promise.resolve(attente).then(db => {
    if(!db) return local();
    BST.db = db; BST.mode = 'db';
    const noms = Object.keys(MAGS);
    /* un autre stockage que la dernière fois (un nouveau dépôt, par exemple) : tout ce qu'on a ici y part,
       rien ne s'efface parce qu'il n'y est pas encore */
    noms.forEach(n => {
      const m = MAGS[n];
      /* ce qui a été gardé avant qu'on note la source venait de la page */
      if(m.source === cleSource || (!m.source && cleSource === 'page')) return;
      m.attente = m.get().map(x => x[m.champ]);
      m.supprimes = [];
    });
    const charge = m => { if(m.pret) return; m.pret = true; if(noms.every(n => MAGS[n].pret)) BST.pret = true; };
    noms.forEach(n => {
      const m = MAGS[n];
      let premier = true;
      try{
        db.collection(m.col).onSnapshot(snap => {
          const docs = snap.docs.filter(d => d.exists).map(d => m.norm(Object.assign({}, d.data(), {[m.champ]: d.id})));
          m.set(fusion(m, docs));
          if(premier){
            premier = false;
            m.source = cleSource;
            /* ce qui attendait ici part maintenant, une fois */
            m.attente.slice().forEach(id => pousser(m, id));
            m.supprimes.slice().forEach(id => effacer(m, id));
            charge(m);
          }
          ecrireMag(m);
          draw();
        }, err => {
          BST.erreur = err && err.code || 'unavailable'; BST.mode = 'local'; BST.db = null;
          if(BST.gh){ BST.ghErreur = BST.gh.doc.erreur || ''; BST.gh.doc.arreter(true); }
          charge(m); draw();
        });
      }catch(e){ BST.erreur = 'unavailable'; charge(m); local(); }
    });
  }, local);
}

function enregistrerDans(m, x){
  x = m.norm(x); x.maj = Date.now();
  const id = x[m.champ];
  const l = m.get().slice(), i = l.findIndex(y => y[m.champ] === id);
  if(i >= 0) l[i] = x; else l.push(x);
  m.set(l);
  if(m.attente.indexOf(id) < 0) m.attente.push(id);
  m.supprimes = m.supprimes.filter(y => y !== id);
  ecrireMag(m);
  if(BST.mode === 'db') pousser(m, id);
  return x;
}
function supprimerDans(m, id){
  m.set(m.get().filter(y => y[m.champ] !== id));
  m.attente = m.attente.filter(y => y !== id);
  if(m.supprimes.indexOf(id) < 0) m.supprimes.push(id);
  m.dates = m.dates || {}; m.dates[id] = Date.now();
  if(m.supprimes.length > 500) m.supprimes = m.supprimes.slice(-500);
  ecrireMag(m);
  if(BST.mode === 'db') effacer(m, id);
}
function enregistrer(c){ return enregistrerDans(MAGS.creatures, c); }
function supprimer(id){ supprimerDans(MAGS.creatures, id); }
function enregistrerFam(f){ return enregistrerDans(MAGS.familles, f); }
function enregistrerTable(t){ return enregistrerDans(MAGS.butins, t); }

/* supprimer une famille : elle quitte aussi tes creatures, et les tirages */
function supprimerFamille(k){
  MAISON.slice().forEach(c => {
    if(c.t.indexOf(k) < 0) return;
    const d = normalise(c); d.t = d.t.filter(x => x !== k); enregistrer(d);
  });
  supprimerDans(MAGS.familles, k);
  S.fam = S.fam.filter(x => x !== k);
  if(FED && FED.f.k === k) fermerFamille();
  if(ED){ ED.c.t = ED.c.t.filter(x => x !== k); if(ED.redessinerFamilles) ED.redessinerFamilles(); }
}
function problemeNomFamille(nom, k){
  const n = (nom || '').trim().toLowerCase();
  if(!n) return 'Il lui faut un nom.';
  if(familles().some(f => f.k !== k && f.l.trim().toLowerCase() === n)) return 'Une famille porte déjà ce nom.';
  return '';
}
