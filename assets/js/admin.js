// Fichier généré par outils/build.mjs depuis src/js/admin/ : ne pas le modifier, modifier les modules.

// ── commun/formes-en-ligne.js ──
/* ============ les formes en ligne : une entrée de la table ↔ un document Firestore ============
   Chaque entrée (un personnage, une séance, un paragraphe…) devient un document de même identifiant.
   Son contenu y est écrit en JSON, en groupes, parce que les règles de sécurité décident par groupe :
   - f : la fiche, à celui qui l'a créée ;
   - e : l'état de jeu (PV, coups, états, cartes du round, où en est une mission…), que d'autres
     joueurs peuvent changer : les membres de la campagne, ou tout le monde selon la collection ;
   - c : la carte de combat d'une séance, à part parce qu'elle est lourde.
   Le JSON garde tout tel quel (Firestore refuse les tableaux de tableaux, les clés vides, undefined).
   À côté : proprietaire, proprietaireNom, cree, majS (heure du serveur, pour ne relire que le neuf),
   modifiePar, et selon la collection campagne, perso, statut, membres.
   Ces fonctions sont pures : la table (registre) et l'import (admin) s'en servent pareil. */

const FORMES = {
  campagnes:   {col:'campagnes',   portee:'monde',    etat:['an', 'jour', 'majDate', 'jetsAvant']},
  personnages: {col:'personnages', portee:'monde',    etat:['pv', 'pcc', 'pv0', 'pc0', 'majPv', 'majPc', 'vie', 'prog', 'monde', 'mondeT']},
  journal:     {col:'seances',     portee:'campagne', etat:['init', 'majInit', 'jetons', 'majJetons', 'etats', 'majEtats', 'lieu', 'majLieu'], carte:['carte', 'majCarte']},
  blocs:       {col:'paragraphes', portee:'campagne'},
  rencontres:  {col:'rencontres',  portee:'campagne'},
  adversaires: {col:'adversaires', portee:'campagne'},
  pnj:         {col:'pnj',         portee:'monde',    etat:['pv', 'pv0', 'majPv', 'vie', 'majCombat']},
  lieux:       {col:'lieux',       portee:'monde'},
  liens:       {col:'liens',       portee:'monde'},
  missions:    {col:'missions',    portee:'monde',    etat:['etat', 'seance', 'lancee', 'fin', 'finie', 'bloc', 'gagnants', 'majEtat']},
  objets:      {col:'objets',      portee:'monde'},
  argent:      {col:'argent',      portee:'monde'},
  tables:      {col:'tables',      portee:'statut'}
};
const FORMES_CLES = Object.keys(FORMES);
const FORME_DE_COL = {};
FORMES_CLES.forEach(k => { FORME_DE_COL[FORMES[k].col] = k; });

/* la campagne d'un élément, comme la table la lit : la sienne si elle existe, sinon la première
   (celle d'avant les campagnes, ou la plus ancienne) */
function formeCampagneDefaut(t){
  const l = Object.keys((t && t.campagnes) || {}).map(k => t.campagnes[k]).filter(c => c && !c.supprime);
  const d = l.find(c => c.id === 'c-principale') || l.sort((a, b) => ((+a.creee || 0) - (+b.creee || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
  return d ? d.id : '';
}
function formeCampagneEff(t, id){
  const c = id && t.campagnes && t.campagnes[id];
  return c && !c.supprime ? id : formeCampagneDefaut(t);
}
function formeCampagneDe(t, k, x){
  if(k === 'journal' || k === 'personnages') return formeCampagneEff(t, x.campagne);
  if(k === 'blocs') return formeCampagneEff(t, ((t.journal || {})[x.seance] || {}).campagne);
  if(k === 'rencontres') return formeCampagneEff(t, ((t.journal || {})[x.seance] || {}).campagne);
  if(k === 'adversaires'){
    const r = (t.rencontres || {})[x.rencontre] || {};
    return formeCampagneEff(t, ((t.journal || {})[r.seance] || {}).campagne);
  }
  return '';
}

/* une entrée de la table → les champs du document (sans les champs de propriété ni les dates) */
function versDoc(k, x, t){
  const F = FORMES[k], f = Object.assign({}, x), d = {};
  if(F.etat){
    const e = {};
    F.etat.forEach(c => { if(c in f){ e[c] = f[c]; delete f[c]; } });
    // un PNJ qu'on fait entrer dans un combat : c'est de l'état de jeu, la fiche de combat reste au créateur
    if(k === 'pnj' && f.combat && typeof f.combat === 'object'){
      e.engage = {dans:!!f.combat.dans, seance:f.combat.seance || ''};
      f.combat = Object.assign({}, f.combat); delete f.combat.dans; delete f.combat.seance;
    }
    d.e = JSON.stringify(e);
  }
  if(F.carte){
    const c = {};
    F.carte.forEach(n => { if(n in f){ c[n] = f[n]; delete f[n]; } });
    d.c = JSON.stringify(c);
  }
  d.f = JSON.stringify(f);
  if(F.portee === 'campagne' || k === 'personnages') d.campagne = formeCampagneDe(t, k, x);
  if(k === 'objets' || k === 'argent') d.perso = String(x.perso || '');
  return d;
}
/* un document → l'entrée, telle que la table la normalise ensuite */
function depuisDoc(k, doc){
  const x = Object.assign({}, formeJson(doc.f), formeJson(doc.e), formeJson(doc.c));
  if(k === 'pnj'){
    const g = x.engage; delete x.engage;
    if(x.combat && typeof x.combat === 'object' && g && typeof g === 'object') x.combat = Object.assign({}, x.combat, {dans:!!g.dans, seance:g.seance || ''});
  }
  return x;
}

/* les jets : un document chacun, jamais retouché */
function jetVersDoc(j, t){ return {f:JSON.stringify(j), campagne:formeCampagneEff(t, j.campagne)}; }
function jetDepuisDoc(doc){ return formeJson(doc.f); }

// ── admin/admin.js ──
/* ============ la page d'administration ============
   Les invitations, les demandes d'entrée et les comptes. Tout passe par Firestore : ce sont
   les règles (firestore.rules) qui réservent ces gestes aux admins, la page ne fait que les montrer. */

const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };
const maintenant = () => firebase.firestore.FieldValue.serverTimestamp();
const dateDe = t => t && t.toDate ? t.toDate() : null;
const jour = d => d ? d.toLocaleDateString('fr-FR', {day:'numeric', month:'long'}) + ' à ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
const COMPTES = {};      // uid → compte, pour dire qui a utilisé quoi

function bouton(txt, cls, fn){ const b = el('button', 'btn sm ' + (cls || ''), txt); b.type = 'button'; b.onclick = fn; return b; }
function dire(boite, txt, bon){ const p = el('p', 'note ' + (bon ? 'ok' : 'err'), txt); boite.replaceChildren(p); }

/* ---------- les invitations ---------- */
function nouveauCode(){
  const o = new Uint8Array(16); crypto.getRandomValues(o);
  return 'inv-' + Array.from(o, x => x.toString(16).padStart(2, '0')).join('');
}
function lienDe(code){ return new URL('index.html?invitation=' + code, location.href).href; }

function creerInvitation(ev){
  ev.preventDefault();
  const code = nouveauCode(), jours = Number($('invDuree').value) || 7;
  const inv = {
    role: $('invRole').value, creePar: COMPTE.uid, cree: maintenant(), utilisee: false,
    expire: firebase.firestore.Timestamp.fromMillis(Date.now() + jours * 86400000)
  };
  const mail = $('invEmail').value.trim(), note = $('invNote').value.trim();
  if(mail) inv.email = mail;
  if(note) inv.note = note;
  FB_DB.collection('invitations').doc(code).set(inv).then(() => {
    const b = $('invNeuve'); b.replaceChildren();
    const z = el('div', 'adlien');
    z.append(el('span', 'lab', 'Le lien à envoyer' + (note ? ' à ' + note : '')));
    const i = el('input'); i.type = 'text'; i.readOnly = true; i.value = lienDe(code); i.onfocus = () => i.select();
    const c = bouton('Copier', '', () => navigator.clipboard.writeText(i.value).then(() => { c.textContent = 'Copié'; }, () => i.select()));
    z.append(i, c);
    b.append(z);
    $('invForm').reset();
  }, e => dire($('invNeuve'), compteErreur(e)));
}

function dessinerInvitations(snap){
  const l = $('invListe'); l.replaceChildren();
  const docs = snap.docs.slice().sort((a, b) => (dateDe(b.data().cree) || 0) - (dateDe(a.data().cree) || 0));
  if(!docs.length){ l.append(el('p', 'note', 'Aucune invitation pour l’instant.')); return; }
  const t = el('table', 'adtable');
  const h = el('tr'); ['Pour', 'Rôle', 'État', ''].forEach(x => h.append(el('th', null, x))); t.append(h);
  docs.forEach(d => {
    const v = d.data(), tr = el('tr');
    const fin = dateDe(v.expire), perimee = fin && fin < new Date();
    const etat = v.utilisee ? 'Utilisée par ' + ((COMPTES[v.par] || {}).nom || 'un compte') + (v.le ? ', le ' + jour(dateDe(v.le)) : '')
      : perimee ? 'Expirée' : 'Valable jusqu’au ' + jour(fin);
    tr.append(el('td', null, v.note || v.email || '—'), el('td', null, v.role === 'admin' ? 'Admin' : 'Joueur'), el('td', v.utilisee || perimee ? 'pale' : null, etat));
    const a = el('td', 'adactions');
    if(!v.utilisee && !perimee) a.append(bouton('Copier le lien', 'ghost', ev => navigator.clipboard.writeText(lienDe(d.id)).then(() => { ev.target.textContent = 'Copié'; })));
    a.append(bouton(v.utilisee ? 'Effacer' : 'Révoquer', 'danger', () => d.ref.delete()));
    tr.append(a);
    t.append(tr);
  });
  l.append(t);
}

/* ---------- les demandes d'entrée ---------- */
function dessinerDemandes(snap){
  const l = $('demListe'); l.replaceChildren();
  if(snap.empty){ l.append(el('p', 'note', 'Aucune demande en attente.')); return; }
  const t = el('table', 'adtable');
  snap.docs.forEach(d => {
    const v = d.data(), tr = el('tr');
    tr.append(el('td', null, v.nom), el('td', 'pale', v.email || ''), el('td', 'pale', jour(dateDe(v.cree))));
    const a = el('td', 'adactions');
    a.append(bouton('Accepter', '', () => {
      const b = FB_DB.batch();
      b.set(FB_DB.collection('comptes').doc(d.id), {nom:v.nom, role:'joueur', actif:true, invitation:'demande', cree:maintenant()});
      b.delete(d.ref);
      b.commit().catch(e => alert(compteErreur(e)));
    }), bouton('Refuser', 'danger', () => d.ref.delete()));
    tr.append(a); t.append(tr);
  });
  l.append(t);
}

/* ---------- les comptes ---------- */
function dessinerComptes(snap){
  const l = $('cptListe'); l.replaceChildren();
  snap.docs.forEach(d => { COMPTES[d.id] = d.data(); });
  const t = el('table', 'adtable');
  const h = el('tr'); ['Joueur', 'Rôle', 'État', ''].forEach(x => h.append(el('th', null, x))); t.append(h);
  snap.docs.slice().sort((a, b) => String(a.data().nom).localeCompare(String(b.data().nom), 'fr')).forEach(d => {
    const v = d.data(), tr = el('tr'), moi = d.id === COMPTE.uid, intouchable = moi || v.fondateur;
    tr.append(el('td', null, v.nom + (moi ? ' (toi)' : '') + (v.fondateur ? ' · fondateur' : '')),
      el('td', null, v.role === 'admin' ? 'Admin' : 'Joueur'),
      el('td', v.actif === false ? 'pale' : null, v.actif === false ? 'En pause' : 'Actif'));
    const a = el('td', 'adactions');
    if(!intouchable){
      a.append(bouton(v.role === 'admin' ? 'Rendre joueur' : 'Nommer admin', 'ghost', () => d.ref.update({role: v.role === 'admin' ? 'joueur' : 'admin'}).catch(e => alert(compteErreur(e)))));
      a.append(bouton(v.actif === false ? 'Réactiver' : 'Mettre en pause', v.actif === false ? 'ghost' : 'danger', () => d.ref.update({actif: v.actif === false}).catch(e => alert(compteErreur(e)))));
    }
    tr.append(a); t.append(tr);
  });
  l.append(t);
}

/* ---------- le démarrage ---------- */
compteQuandPret(c => {
  if(c.role !== 'admin' || !FB_DB){ $('adRefus').hidden = false; return; }
  $('adCorps').hidden = false;
  $('invForm').onsubmit = creerInvitation;
  const panne = boite => e => dire($(boite), compteErreur(e));
  FB_DB.collection('comptes').onSnapshot(s => {
    dessinerComptes(s);
    // les cases des campagnes et l'import ont besoin des comptes : ils se redessinent avec eux
    if(typeof CAMP_SNAP !== 'undefined' && CAMP_SNAP) dessinerCampagnes(CAMP_SNAP);
    if(typeof IMP !== 'undefined' && Object.keys(IMP.f).length) dessinerImport();
  }, panne('cptListe'));
  FB_DB.collection('invitations').onSnapshot(dessinerInvitations, panne('invListe'));
  FB_DB.collection('demandes').onSnapshot(dessinerDemandes, panne('demListe'));
});

// ── admin/campagnes.js ──
/* ============ les campagnes et leurs membres ============
   Les séances, paragraphes, jets et rencontres d'une campagne ne se lisent que par ses membres.
   Son créateur les choisit depuis la table ; un admin peut les changer ici, pour toutes. */

let CAMP_SNAP = null;
function dessinerCampagnes(snap){
  CAMP_SNAP = snap;
  const l = $('campListe'); l.replaceChildren();
  if(snap.empty){ l.append(el('p', 'note', 'Aucune campagne en ligne pour l’instant : importe l’ancien monde, ou crée-en une depuis la table.')); return; }
  const comptes = Object.keys(COMPTES).sort((a, b) => String(COMPTES[a].nom).localeCompare(String(COMPTES[b].nom), 'fr'));
  snap.docs.forEach(d => {
    const v = d.data(), f = formeJson(v.f), membres = Array.isArray(v.membres) ? v.membres : [];
    if(f.supprime) return;
    const bloc = el('div', 'adcamp');
    bloc.append(el('div', 'adcamp-nom', (f.nom || d.id) + (f.etat === 'finie' ? ' (terminée)' : '')),
      el('div', 'pale', 'créée par ' + (v.proprietaireNom || '?')));
    const cases = el('div', 'adcases');
    comptes.forEach(uid => {
      const l2 = el('label', 'adcase'), c = el('input');
      c.type = 'checkbox'; c.checked = membres.indexOf(uid) >= 0;
      c.disabled = uid === v.proprietaire;     // son créateur en est toujours
      c.onchange = () => {
        const m = new Set(membres); if(c.checked) m.add(uid); else m.delete(uid);
        d.ref.update({membres:Array.from(m), majS:firebase.firestore.FieldValue.serverTimestamp(), modifiePar:COMPTE.uid})
          .catch(e => { c.checked = !c.checked; alert(compteErreur(e)); });
      };
      l2.append(c, document.createTextNode(' ' + COMPTES[uid].nom));
      cases.append(l2);
    });
    bloc.append(cases);
    l.append(bloc);
  });
}
compteQuandPret(c => {
  if(c.role !== 'admin' || !FB_DB) return;
  FB_DB.collection('campagnes').onSnapshot(dessinerCampagnes, e => { $('campListe').replaceChildren(el('p', 'note err', compteErreur(e))); });
});

// ── admin/validations.js ──
/* ============ ce qui attend un admin : les créations proposées, et les propositions de compétences ============
   Un ennemi, une famille, une table de butin, un plan ou une table de tirage restent privés à leur créateur ;
   il les propose (depuis l'accueil), un admin les valide (tout le monde les voit et s'en sert) ou les renvoie.
   Les propositions de compétences s'acceptent ou se refusent avec un mot ; accepter ne change rien tout seul :
   l'admin fait la retouche dans le Registre des Compétences. */

const VALID_COLS = [['creatures', 'Ennemi'], ['familles', 'Famille'], ['butins', 'Table de butin'], ['plans', 'Plan'], ['tables', 'Table de tirage']];
const VALID = {};      // collection → [documents proposés]
const nomDePiece = (d, x) => x.n || x.nom || x.titre || (x.plan && (x.plan.name || x.plan.nom)) || d.id;
const heure = () => firebase.firestore.FieldValue.serverTimestamp();

function dessinerValidations(){
  const l = $('valListe'); l.replaceChildren();
  const tous = [];
  VALID_COLS.forEach(([col, genre]) => (VALID[col] || []).forEach(d => tous.push([col, genre, d])));
  if(!tous.length){ l.append(el('p', 'note', 'Rien n’attend de validation.')); return; }
  const t = el('table', 'adtable');
  tous.forEach(([col, genre, d]) => {
    const v = d.data(), x = formeJson(v.f), tr = el('tr');
    tr.append(el('td', null, genre), el('td', null, nomDePiece(d, x)), el('td', 'pale', 'de ' + (v.proprietaireNom || '?')));
    const a = el('td', 'adactions');
    const statut = s => () => d.ref.update({statut:s, majS:heure(), modifiePar:COMPTE.uid}).catch(e => alert(compteErreur(e)));
    a.append(bouton('Valider', '', statut('valide')), bouton('Renvoyer', 'ghost', statut('prive')));
    tr.append(a); t.append(tr);
  });
  l.append(t);
}

function dessinerPropositions(snap){
  const l = $('propAdmin'); l.replaceChildren();
  const ouvertes = snap.docs.filter(d => d.data().statut === 'ouverte');
  if(!ouvertes.length){ l.append(el('p', 'note', 'Aucune proposition en attente.')); return; }
  ouvertes.forEach(d => {
    const v = d.data(), b = el('div', 'adcamp');
    b.append(el('div', 'adcamp-nom', (v.sujet || 'Proposition') + ' · de ' + (v.proprietaireNom || '?')), el('p', 'propTexte', v.texte));
    const rep = el('input'); rep.type = 'text'; rep.placeholder = 'Ta réponse (facultatif)'; rep.className = 'adreponse';
    const decider = s => () => d.ref.update({statut:s, reponse:rep.value.trim(), decidePar:COMPTE.uid, decideLe:heure()}).catch(e => alert(compteErreur(e)));
    const acts = el('div', 'adactions');
    acts.append(rep, bouton('Accepter', '', decider('acceptee')), bouton('Refuser', 'danger', decider('refusee')));
    b.append(acts);
    l.append(b);
  });
}

compteQuandPret(c => {
  if(c.role !== 'admin' || !FB_DB) return;
  VALID_COLS.forEach(([col]) => FB_DB.collection(col).where('statut', '==', 'propose').onSnapshot(s => { VALID[col] = s.docs; dessinerValidations(); },
    e => { $('valListe').replaceChildren(el('p', 'note err', compteErreur(e))); }));
  FB_DB.collection('propositions').onSnapshot(dessinerPropositions, e => { $('propAdmin').replaceChildren(el('p', 'note err', compteErreur(e))); });
});

// ── admin/import.js ──
/* ============ importer l'ancien monde : les fichiers du dépôt privé, dans Firestore ============
   On choisit les .json de l'ancien dépôt (table-faelorenn.json, personnages.json, plans.json, bestiaire.json,
   competences.json) : ils sont lus ici, dans le navigateur, et ne vont nulle part ailleurs que dans Firestore.
   Chaque nom de joueur trouvé (« Gaël », « Oce »…) est attribué à un compte : ce compte devient le propriétaire
   de tout ce qui porte ce nom. Chaque campagne a pour membres son créateur, les joueurs de ses personnages et
   les auteurs de ses paragraphes. Le bestiaire et les plans d'avant étaient déjà partagés : ils arrivent validés.
   Ce qui est déjà en ligne n'est pas réécrit : l'import peut se relancer sans rien doubler. */

const IMP = {f:{}, lus:[], noms:{}, choix:{}, defaut:''};
const cleNomImp = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const IMP_FORMATS = {
  'faelorenn-table': 'la table',
  'faelorenn-personnages': 'les personnages du Havre',
  'faelorenn-plans': 'les plans',
  'faelorenn-bestiaire': 'le bestiaire',
  'faelorenn-competences': 'les compétences'
};

/* les noms de joueurs, et combien de fois chacun revient */
function nomsImp(){
  const n = {}, t = IMP.f['faelorenn-table'], h = IMP.f['faelorenn-personnages'];
  const note = s => { s = String(s || '').trim(); if(s) n[s] = (n[s] || 0) + 1; };
  if(t){
    FORMES_CLES.forEach(k => Object.keys(t[k] || {}).forEach(id => {
      const x = t[k][id] || {};
      if(k === 'personnages') note(x.joueur);
      note(x.auteur);
    }));
    (t.jets || []).forEach(j => note(j.auteur));
  }
  if(h) Object.keys(h.personnages || {}).forEach(id => note((h.personnages[id] || {}).auteur));
  return n;
}
// le propriétaire d'une pièce : son joueur (un personnage de la table) ou son auteur ; sinon celui choisi par défaut
function proprioImp(k, x){
  const nom = String((k === 'personnages' && x.joueur) || x.auteur || '').trim();
  const uid = (nom && IMP.choix[nom]) || IMP.defaut;
  return {uid:uid, nom:(COMPTES[uid] || {}).nom || nom || '?'};
}

function lireFichiers(ev){
  const fs = Array.from(ev.target.files || []);
  IMP.f = {}; IMP.lus = [];
  Promise.all(fs.map(f => f.text().then(t => ({nom:f.name, o:JSON.parse(t)}), e => ({nom:f.name, erreur:e.message}))))
    .then(l => {
      l.forEach(x => {
        if(x.erreur){ IMP.lus.push(x.nom + ' : illisible (' + x.erreur + ')'); return; }
        const fmt = x.o && x.o.format;
        if(IMP_FORMATS[fmt]){ IMP.f[fmt] = x.o; IMP.lus.push(x.nom + ' : ' + IMP_FORMATS[fmt]); }
        else IMP.lus.push(x.nom + ' : pas un fichier des registres, laissé de côté');
      });
      IMP.noms = nomsImp();
      // une première idée : un nom qui ressemble au pseudo d'un compte
      Object.keys(IMP.noms).forEach(n => {
        const c = Object.keys(COMPTES).find(uid => cleNomImp(COMPTES[uid].nom) === cleNomImp(n));
        IMP.choix[n] = IMP.choix[n] || c || '';
      });
      IMP.defaut = IMP.defaut || COMPTE.uid;
      dessinerImport();
    });
}

// les membres de chaque campagne : son créateur, les joueurs de ses personnages, les auteurs de ses séances et paragraphes
function membresImp(t){
  const m = {};
  Object.keys(t.campagnes || {}).forEach(cid => { m[cid] = new Set([proprioImp('campagnes', t.campagnes[cid]).uid]); });
  const ajoute = (cid, uid) => { if(cid && m[cid] && uid) m[cid].add(uid); };
  Object.keys(t.personnages || {}).forEach(id => { const x = t.personnages[id]; ajoute(formeCampagneEff(t, x.campagne), proprioImp('personnages', x).uid); });
  ['blocs', 'journal'].forEach(k => Object.keys(t[k] || {}).forEach(id => { const x = t[k][id]; ajoute(formeCampagneDe(t, k, x), proprioImp(k, x).uid); }));
  const out = {};
  Object.keys(m).forEach(cid => { out[cid] = Array.from(m[cid]); });
  return out;
}

function dessinerImport(){
  const b = $('impCorps'); b.replaceChildren();
  if(IMP.lus.length){ const u = el('ul', 'adfichiers'); IMP.lus.forEach(f => u.append(el('li', null, f))); b.append(u); }
  if(!Object.keys(IMP.f).length) return;
  const t = IMP.f['faelorenn-table'];
  if(t) b.append(el('p', 'note', 'La table : ' + FORMES_CLES.map(k => [k, Object.keys(t[k] || {}).length]).filter(x => x[1])
    .concat([['jets', (t.jets || []).length]]).map(([k, n]) => n + ' ' + k).join(', ') + '.'));
  // les noms → les comptes
  if(Object.keys(IMP.noms).length){
    b.append(el('span', 'lab', 'À qui est quoi'));
    const tab = el('table', 'adtable');
    const options = sel => {
      const s = el('select');
      s.append(new Option('— le propriétaire par défaut —', ''));
      Object.keys(COMPTES).sort((x, y) => String(COMPTES[x].nom).localeCompare(String(COMPTES[y].nom), 'fr'))
        .forEach(uid => s.append(new Option(COMPTES[uid].nom, uid, false, uid === sel)));
      return s;
    };
    Object.keys(IMP.noms).sort((x, y) => IMP.noms[y] - IMP.noms[x]).forEach(n => {
      const tr = el('tr'), s = options(IMP.choix[n]);
      s.onchange = () => { IMP.choix[n] = s.value; dessinerImport(); };
      tr.append(el('td', null, '« ' + n + ' »'), el('td', 'pale', IMP.noms[n] + ' fois'));
      const td = el('td'); td.append(s); tr.append(td); tab.append(tr);
    });
    const trd = el('tr'), sd = options(IMP.defaut);
    sd.options[0].text = '—';
    sd.onchange = () => { IMP.defaut = sd.value || COMPTE.uid; dessinerImport(); };
    trd.append(el('td', null, 'Sans nom (plans, bestiaire…), ou nom non attribué'), el('td', 'pale', ''));
    const tdd = el('td'); tdd.append(sd); trd.append(tdd); tab.append(trd);
    b.append(tab);
  }
  if(t){
    const mb = membresImp(t);
    b.append(el('span', 'lab', 'Les campagnes et leurs membres'));
    const ul = el('ul', 'adfichiers');
    Object.keys(t.campagnes || {}).forEach(cid => {
      const c = t.campagnes[cid];
      ul.append(el('li', null, (c.nom || cid) + ' : ' + (mb[cid] || []).map(uid => (COMPTES[uid] || {}).nom || uid).join(', ')));
    });
    b.append(ul);
  }
  b.append(el('p', 'note', 'Les membres se changent ensuite dans la section « Les campagnes ». Le bestiaire et les plans d’avant arrivent validés : ils étaient déjà partagés. Les réglages personnels (disposition de la table, positions du réseau) ne sont pas importés : chacun refera les siens.'));
  const go = bouton('Importer dans le monde en ligne', '', () => importer(go));
  b.append(go);
  const r = el('div'); r.id = 'impRapport';
  b.append(r);
}

/* ---------- l'écriture ---------- */
function importer(btn){
  const heure = firebase.firestore.FieldValue.serverTimestamp();
  const rapport = $('impRapport');
  btn.disabled = true;
  const dire = (txt, bon) => { rapport.replaceChildren(el('p', 'note ' + (bon === false ? 'err' : bon ? 'ok' : ''), txt)); };
  dire('Ce qui est déjà en ligne…');
  const cols = FORMES_CLES.map(k => FORMES[k].col).concat(['jets', 'havre', 'creatures', 'familles', 'butins', 'plans']);
  Promise.all(cols.map(col => FB_DB.collection(col).get().then(s => [col, new Set(s.docs.map(d => d.id))])))
    .then(l => Promise.all([FB_DB.collection('monde').doc('table').get(), FB_DB.collection('regles').doc('maison').get()]).then(([m, r]) => {
      const existe = {}, ecritures = [], deja = {};
      l.forEach(([col, ids]) => { existe[col] = ids; });
      existe.monde = new Set(m.exists ? ['table'] : []);
      existe.regles = new Set(r.exists ? ['maison'] : []);
      const doc = (col, id, champs, p) => {
        if(existe[col].has(id)){ deja[col] = (deja[col] || 0) + 1; return; }
        ecritures.push([col, id, Object.assign({}, champs, {proprietaire:p.uid, proprietaireNom:p.nom, cree:heure, majS:heure, modifiePar:COMPTE.uid})]);
      };
      const moi = {uid:COMPTE.uid, nom:COMPTE.nom};
      // la table : les campagnes d'abord, avant ce qui leur appartient
      const t = IMP.f['faelorenn-table'];
      if(t){
        const membres = membresImp(t);
        Object.keys(t.campagnes || {}).forEach(id => {
          const x = Object.assign({}, t.campagnes[id], {id:id});
          doc('campagnes', id, Object.assign(versDoc('campagnes', x, t), {membres:membres[id] || [COMPTE.uid]}), proprioImp('campagnes', x));
        });
        FORMES_CLES.filter(k => k !== 'campagnes').forEach(k => Object.keys(t[k] || {}).forEach(id => {
          const x = Object.assign({}, t[k][id], {id:id});
          const champs = versDoc(k, x, t);
          if(k === 'tables') champs.statut = 'valide';
          doc(FORMES[k].col, id, champs, proprioImp(k, x));
        }));
        (t.jets || []).forEach(j => { if(j && j.id) doc('jets', String(j.id), jetVersDoc(j, t), proprioImp('jets', j)); });
        doc('monde', 'table', {f:JSON.stringify({nom:t.nom || '', viderAvant:t.viderAvant || 0}), e:JSON.stringify({oracle:t.oracle || null})}, moi);
      }
      // les personnages du Havre : chacun à son auteur
      const h = IMP.f['faelorenn-personnages'];
      if(h) Object.keys(h.personnages || {}).forEach(id => { const x = h.personnages[id]; doc('havre', id, {f:JSON.stringify(x)}, proprioImp('havre', x || {})); });
      // le bestiaire et les plans d'avant : déjà partagés, ils arrivent validés
      const be = IMP.f['faelorenn-bestiaire'];
      if(be) ['creatures', 'familles', 'butins'].forEach(s => Object.keys(be[s] || {}).forEach(id => {
        doc(s, id, {f:JSON.stringify(be[s][id]), statut:'valide'}, proprioImp(s, be[s][id] || {}));
      }));
      const pl = IMP.f['faelorenn-plans'];
      if(pl) ['batiments', 'villages', 'mondes'].forEach(s => Object.keys(pl[s] || {}).forEach(id => {
        doc('plans', s + ':' + id, {f:JSON.stringify(pl[s][id]), section:s, statut:'valide'}, moi);
      }));
      // les compétences : un seul document, à l'admin qui importe
      const co = IMP.f['faelorenn-competences'];
      if(co) doc('regles', 'maison', {f:JSON.stringify(co)}, moi);
      return ecrireParLots(ecritures, n => dire('Écriture… ' + n + ' / ' + ecritures.length)).then(() => [ecritures.length, deja]);
    }))
    .then(([n, deja]) => {
      const d = Object.keys(deja).map(c => deja[c] + ' ' + c).join(', ');
      dire('Import terminé : ' + n + ' document' + (n > 1 ? 's' : '') + ' écrit' + (n > 1 ? 's' : '') + '.' + (d ? ' Déjà en ligne, laissés tels quels : ' + d + '.' : ''), true);
      btn.disabled = false;
    }, e => { dire('L’import s’est arrêté : ' + compteErreur(e) + ' Ce qui est écrit le reste ; relance pour finir.', false); btn.disabled = false; });
}
// par lots de 400 au plus, et sous 6 Mo : un gros plan pèse, et Firestore refuse un lot de plus de 10 Mo
function ecrireParLots(ecritures, avance){
  let i = 0;
  const suivant = () => {
    if(i >= ecritures.length) return Promise.resolve();
    const b = FB_DB.batch();
    let n = 0, poids = 0;
    while(i < ecritures.length && n < 400 && poids < 6e6){
      const [col, id, d] = ecritures[i];
      b.set(FB_DB.collection(col).doc(id), d);
      poids += (d.f || '').length + (d.e || '').length + (d.c || '').length;
      i++; n++;
    }
    return b.commit().then(() => { avance(i); return suivant(); });
  };
  return suivant();
}

compteQuandPret(c => { if(c.role === 'admin' && $('impFichiers')) $('impFichiers').onchange = lireFichiers; });
