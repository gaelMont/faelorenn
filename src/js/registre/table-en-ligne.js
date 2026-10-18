/* ============ la table en ligne : le monde partagé dans Firestore ============
   Chaque entrée de la table (personnage, séance, paragraphe, PNJ…) est un document (commun/formes-en-ligne.js).
   On écoute le neuf (commun/monde-en-ligne.js) : ce qui arrive est fondu dans T comme avant, par fusionner().
   On écrit ce que T a de plus que le serveur, entrée par entrée. Les règles décident de ce qui est permis :
   ce qu'un joueur n'a pas le droit de changer revient tel que le serveur l'a.
   Les séances, paragraphes, jets et rencontres d'une campagne ne se lisent que si l'on en est membre :
   on écoute une requête par campagne. */

const EN_LIGNE = {
  pret: false,             // la première lecture est faite : on peut écrire
  attendues: 0,            // écoutes qui n'ont pas encore donné leur première réponse
  minuteur: null, dessin: null,
  membres: {},             // id de campagne → [uid]
  suivies: {},             // id de campagne → écoutes ouvertes pour elle
  normes: {},              // clé → id → JSON des groupes, tel que ce navigateur normalise le document reçu
  jetsVus: {},             // id de jet → 1
  depart: null
};
const COLS_CAMPAGNE = ['journal', 'blocs', 'rencontres', 'adversaires'];

/* ---------- recevoir ---------- */
function tableRecevoir(k, docs){
  const partiel = {};
  partiel[k] = {};
  docs.forEach(({id, data}) => {
    mondeGarderOmbre(FORMES[k].col, id, data);
    if(k === 'campagnes') EN_LIGNE.membres[id] = Array.isArray(data.membres) ? data.membres : [];
    partiel[k][id] = Object.assign(depuisDoc(k, data), {id:id});
  });
  const norme = normTable(partiel);
  docs.forEach(({id}) => {
    const x = norme[k][id];
    if(x) (EN_LIGNE.normes[k] = EN_LIGNE.normes[k] || {})[id] = groupesDe(k, x);
  });
  T = fusionner(T, norme);
  if(k === 'campagnes') suivreMesCampagnes();
  apresReception();
}
function tableRecevoirJets(docs){
  const jets = docs.map(({id, data}) => { EN_LIGNE.jetsVus[id] = 1; return Object.assign(jetDepuisDoc(data), {id:id}); });
  T = fusionner(T, normTable({jets:jets, campagnes:T.campagnes}));
  apresReception();
}
function tableRecevoirMonde(data){
  mondeGarderOmbre('monde', 'table', data);
  const f = formeJson(data.f), e = formeJson(data.e);
  T = fusionner(T, normTable({nom:f.nom, viderAvant:f.viderAvant, oracle:e.oracle, maj:0}));
  apresReception();
}
function apresReception(){
  SYNC.dernier = Date.now(); SYNC.erreur = '';
  sauverLocal();
  // une salve de documents : un seul dessin, et une seule passe d'écriture (ce que T a de plus)
  clearTimeout(EN_LIGNE.dessin);
  EN_LIGNE.dessin = setTimeout(() => { dessiner(); }, 60);
  if(EN_LIGNE.pret) tablePlanifier();
}
// les groupes d'une entrée, en texte, pour comparer d'un coup
function groupesDe(k, x){ return JSON.stringify(versDoc(k, x, T)); }

/* ---------- les campagnes dont on est membre : leurs séances, paragraphes, rencontres et jets ---------- */
function suivreMesCampagnes(){
  const miennes = Object.keys(EN_LIGNE.membres).filter(cid => EN_LIGNE.membres[cid].indexOf(COMPTE.uid) >= 0 || estAdmin());
  miennes.forEach(cid => { if(!EN_LIGNE.suivies[cid]) suivreCampagne(cid); });
  Object.keys(EN_LIGNE.suivies).forEach(cid => {
    if(miennes.indexOf(cid) < 0){ EN_LIGNE.suivies[cid].forEach(mondeArreter); delete EN_LIGNE.suivies[cid]; }
  });
}
function suivreCampagne(cid){
  const cles = [];
  COLS_CAMPAGNE.forEach(k => {
    const cle = FORMES[k].col + '@' + cid;
    cles.push(cle);
    tableEcoute(cle, FB_DB.collection(FORMES[k].col).where('campagne', '==', cid), docs => tableRecevoir(k, docs));
  });
  // les jets : ceux des trente derniers jours suffisent à un appareil qui arrive
  const cj = 'jets@' + cid;
  cles.push(cj);
  tableEcoute(cj, FB_DB.collection('jets').where('campagne', '==', cid), tableRecevoirJets, Date.now() - 30 * 86400000);
  EN_LIGNE.suivies[cid] = cles;
}
// une écoute qui compte dans la première lecture
function tableEcoute(cle, requete, surDocs, depuisMin){
  let premiere = true;
  if(!EN_LIGNE.pret) EN_LIGNE.attendues++;
  const fin = () => { if(premiere){ premiere = false; if(!EN_LIGNE.pret && --EN_LIGNE.attendues <= 0) premiereLectureFaite(); } };
  mondeEcouter(cle, requete, surDocs, e => { SYNC.erreur = mondeRefus(e); dessinerTable(); fin(); }, depuisMin, fin);
  // hors ligne, le serveur ne répond pas : on avance quand même, ce qu'on écrit attendra la connexion
  setTimeout(fin, 15000);
}
function premiereLectureFaite(){
  if(EN_LIGNE.pret) return;
  EN_LIGNE.pret = true;
  SYNC.dernier = Date.now();
  dessiner();
  if(EN_LIGNE.depart){ EN_LIGNE.depart(); EN_LIGNE.depart = null; }
  tablePlanifier();
}

/* ---------- écrire ce que T a de plus que le serveur ---------- */
function tablePlanifier(){
  if(SYNC.etat !== 'enligne') return;
  clearTimeout(EN_LIGNE.minuteur);
  EN_LIGNE.minuteur = setTimeout(tableEcrire, 1200);
}
function membreDe(cid){ return estAdmin() || (EN_LIGNE.membres[cid] || []).indexOf(COMPTE.uid) >= 0; }
// ce que ce compte peut changer d'une entrée qui existe déjà (les règles le redisent de toute façon)
function groupesPermis(k, id, champs){
  const o = mondeOmbre(FORMES[k].col, id);
  if(!o || estAdmin() || o.proprietaire === COMPTE.uid) return null;            // tout
  const camp = o.campagne || '';
  if(k === 'personnages') return membreDe(camp) ? ['e'] : [];
  if(k === 'journal') return membreDe(camp) ? ['e', 'c'] : [];
  if(k === 'rencontres' || k === 'adversaires') return membreDe(camp) && membreDe(champs.campagne) ? null : [];
  if(k === 'pnj' || k === 'missions') return ['e'];
  if(k === 'campagnes') return (EN_LIGNE.membres[id] || []).indexOf(COMPTE.uid) >= 0 ? ['e'] : [];
  if(k === 'objets' || k === 'argent'){
    const p = mondeOmbre('personnages', champs.perso);
    return p && p.proprietaire === COMPTE.uid ? null : [];
  }
  return [];
}
function tableEcrire(){
  if(!EN_LIGNE.pret || SYNC.etat !== 'enligne') return;
  const refus = [];
  FORMES_CLES.forEach(k => {
    const col = FORMES[k].col, normes = EN_LIGNE.normes[k] || {};
    Object.keys(T[k] || {}).forEach(id => {
      const x = T[k][id];
      const champs = versDoc(k, x, T);
      const texte = JSON.stringify(champs);
      if(normes[id] === texte) return;
      const o = mondeOmbre(col, id);
      // une entrée nouvelle d'une campagne dont on n'est pas membre : elle ne partira pas
      if(!o && (FORMES[k].portee === 'campagne') && !membreDe(champs.campagne)) return;
      const permis = groupesPermis(k, id, champs);
      if(permis){
        const avant = o ? JSON.parse(normes[id] || '{}') : {};
        const touches = Object.keys(champs).filter(c => JSON.stringify(champs[c]) !== JSON.stringify(avant[c]));
        if(touches.some(c => permis.indexOf(c) < 0)){ refus.push([k, id]); return; }
      }
      if(k === 'campagnes' && !o) champs.membres = [COMPTE.uid];
      normes[id] = texte;
      EN_LIGNE.normes[k] = normes;
      mondeEcrire(col, id, champs).catch(e => {
        delete normes[id];
        if(e && e.code === 'permission-denied'){ revenir(k, id); remplacerDansLocal([[k, id]]); sauverLocal(); dessiner(); msgTable(mondeRefus(e), false); }
        else { SYNC.erreur = mondeRefus(e); dessinerTable(); }
      });
    });
  });
  // les jets : chacun part une fois
  (T.jets || []).forEach(j => {
    if(EN_LIGNE.jetsVus[j.id]) return;
    const d = jetVersDoc(j, T);
    if(!membreDe(d.campagne)) return;
    EN_LIGNE.jetsVus[j.id] = 1;
    mondeEcrire('jets', j.id, d).catch(() => { delete EN_LIGNE.jetsVus[j.id]; });
  });
  // la table elle-même : son nom et la purge (admins), les seuils de l'oracle (tous)
  const m = mondeOmbre('monde', 'table');
  const tm = {f:JSON.stringify({nom:T.nom || '', viderAvant:T.viderAvant || 0}), e:JSON.stringify({oracle:T.oracle || null})};
  if(m ? (m.e !== tm.e || (estAdmin() && m.f !== tm.f)) : estAdmin()){
    const champs = m && !estAdmin() ? {e:tm.e} : tm;
    mondeEcrire('monde', 'table', champs).catch(e => { SYNC.erreur = mondeRefus(e); });
  }
  tableEcrirePrefs();
  if(refus.length){
    refus.forEach(([k, id]) => revenir(k, id));
    msgTable('Ce n’est pas à toi de changer ça : la fiche est revenue telle que son joueur l’a laissée.', false);
    remplacerDansLocal(refus); sauverLocal(); dessiner();
  }
}
/* la copie du navigateur reprend aussi la version du serveur : sinon, plus récente, elle reviendrait à la fusion */
function remplacerDansLocal(liste){
  try{
    const r = JSON.parse(localStorage.getItem(CLE_TABLE) || 'null');
    if(!r) return;
    liste.forEach(([k, id]) => { r[k] = r[k] || {}; if(T[k] && T[k][id]) r[k][id] = T[k][id]; else delete r[k][id]; });
    localStorage.setItem(CLE_TABLE, JSON.stringify(r));
  }catch(e){}
}
// une entrée revient à ce que le serveur en a
function revenir(k, id){
  const o = mondeOmbre(FORMES[k].col, id);
  if(!o){ delete T[k][id]; return; }
  const p = {}; p[k] = {}; p[k][id] = Object.assign(depuisDoc(k, o), {id:id});
  const x = normTable(p)[k][id];
  if(x){ T[k][id] = x; (EN_LIGNE.normes[k] = EN_LIGNE.normes[k] || {})[id] = groupesDe(k, x); }
}

/* ---------- les réglages de chacun : la disposition de la table, et où il a posé les visages du réseau ---------- */
function tableEcrirePrefs(){
  const f = JSON.stringify({hub:T.hub || {}, positions:T.positions || {}});
  if(f === EN_LIGNE.prefs) return;
  EN_LIGNE.prefs = f;
  FB_DB.collection('comptes').doc(COMPTE.uid).collection('prefs').doc('table').set({f:f}).catch(() => { EN_LIGNE.prefs = ''; });
}
function tableLirePrefs(){
  return FB_DB.collection('comptes').doc(COMPTE.uid).collection('prefs').doc('table').get().then(s => {
    if(!s.exists) return;
    const p = formeJson(s.data().f);
    T = fusionner(T, normTable({hub:p.hub, positions:p.positions}));
    EN_LIGNE.prefs = JSON.stringify({hub:T.hub || {}, positions:T.positions || {}});
  }, () => {});
}

/* ---------- le démarrage ---------- */
/* Le cache de ce navigateur appartient à un compte : un autre compte (ou la première fois en ligne) repart de rien,
   pour qu'aucune campagne privée ne passe d'un compte à l'autre, et que la table d'avant (le fichier, GitHub) ne
   reparte pas dans le monde sous un autre nom : c'est l'import qui l'y a mise. */
function tableEnLigneDemarrer(){
  return new Promise(fini => {
    compteQuandPret(() => {
      if(!FB_DB){ fini(false); return; }
      let dernier = '';
      try{ dernier = localStorage.getItem('faelorenn.compte.dernier') || ''; }catch(e){}
      if(dernier !== COMPTE.uid){
        T = videTable();
        try{ localStorage.removeItem(CLE_TABLE); localStorage.setItem('faelorenn.compte.dernier', COMPTE.uid); }catch(e){}
        mondeOublierCurseurs();
      }
      if(SYNC.poignee){ SYNC.poignee = null; if(SYNC.boucle){ clearInterval(SYNC.boucle); SYNC.boucle = null; } }
      SYNC.etat = 'enligne'; SYNC.nom = 'le monde en ligne'; SYNC.erreur = '';
      EN_LIGNE.depart = () => fini(true);
      dessinerTable();
      tableLirePrefs().then(() => {
        FORMES_CLES.filter(k => FORMES[k].portee === 'monde').forEach(k => {
          tableEcoute(FORMES[k].col, FB_DB.collection(FORMES[k].col), docs => tableRecevoir(k, docs));
        });
        // les tables de tirage : celles validées, et les siennes ; un admin les voit toutes
        if(estAdmin()) tableEcoute('tables', FB_DB.collection('tables'), docs => tableRecevoir('tables', docs));
        else {
          tableEcoute('tables@valide', FB_DB.collection('tables').where('statut', '==', 'valide'), docs => tableRecevoir('tables', docs));
          tableEcoute('tables@moi', FB_DB.collection('tables').where('proprietaire', '==', COMPTE.uid), docs => tableRecevoir('tables', docs));
        }
        FB_DB.collection('monde').doc('table').onSnapshot(s => { if(s.exists) tableRecevoirMonde(s.data({serverTimestamps:'estimate'})); }, () => {});
      });
    });
  });
}
