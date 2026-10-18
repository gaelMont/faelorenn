/* ============ importer l'ancien monde : les fichiers du dépôt privé, dans Firestore ============
   On choisit les .json de l'ancien dépôt (table-faelorenn.json…) : ils sont lus ici, dans le navigateur,
   et ne vont nulle part ailleurs que dans Firestore. Chaque nom de joueur trouvé (« Gaël », « Oce »…) est
   attribué à un compte : ce compte devient le propriétaire de tout ce qui porte ce nom. Chaque campagne a pour
   membres son créateur, les joueurs de ses personnages et les auteurs de ses paragraphes.
   Ce qui est déjà en ligne n'est pas réécrit : l'import peut se relancer sans rien doubler. */

const IMP = {table:null, fichiers:[], noms:{}, choix:{}, defaut:''};
const cleNomImp = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/* les noms de joueurs d'une table, et combien de fois chacun revient */
function nomsDeTable(t){
  const n = {};
  const note = s => { s = String(s || '').trim(); if(s) n[s] = (n[s] || 0) + 1; };
  FORMES_CLES.forEach(k => Object.keys(t[k] || {}).forEach(id => {
    const x = t[k][id] || {};
    if(k === 'personnages') note(x.joueur);
    note(x.auteur);
  }));
  (t.jets || []).forEach(j => note(j.auteur));
  return n;
}
// le propriétaire d'une entrée : son joueur (un personnage) ou son auteur ; sinon celui choisi par défaut
function proprioImp(k, x){
  const nom = String((k === 'personnages' && x.joueur) || x.auteur || '').trim();
  const uid = (nom && IMP.choix[nom]) || IMP.defaut;
  return {uid:uid, nom:(COMPTES[uid] || {}).nom || nom || '?'};
}

function lireFichiers(ev){
  const fs = Array.from(ev.target.files || []);
  IMP.table = null; IMP.fichiers = [];
  Promise.all(fs.map(f => f.text().then(t => ({nom:f.name, o:JSON.parse(t)}), e => ({nom:f.name, erreur:e.message}))))
    .then(l => {
      l.forEach(x => {
        if(x.erreur){ IMP.fichiers.push(x.nom + ' : illisible (' + x.erreur + ')'); return; }
        const fmt = x.o && x.o.format;
        if(fmt === 'faelorenn-table'){ IMP.table = x.o; IMP.fichiers.push(x.nom + ' : la table, prête à importer'); }
        else IMP.fichiers.push(x.nom + ' : ' + (fmt || 'format inconnu') + ' — son tour viendra à l’étape suivante');
      });
      if(IMP.table){
        IMP.noms = nomsDeTable(IMP.table);
        // une première idée : un nom qui ressemble au pseudo d'un compte
        Object.keys(IMP.noms).forEach(n => {
          const c = Object.keys(COMPTES).find(uid => cleNomImp(COMPTES[uid].nom) === cleNomImp(n));
          IMP.choix[n] = IMP.choix[n] || c || '';
        });
        IMP.defaut = IMP.defaut || COMPTE.uid;
      }
      dessinerImport();
    });
}

function compter(t){
  return FORMES_CLES.map(k => [k, Object.keys(t[k] || {}).length]).filter(x => x[1]).concat([['jets', (t.jets || []).length]]);
}
// les membres de chaque campagne : son créateur, les joueurs de ses personnages, les auteurs de ses paragraphes
function membresImp(t){
  const m = {};
  Object.keys(t.campagnes || {}).forEach(cid => { m[cid] = new Set([proprioImp('campagnes', t.campagnes[cid]).uid]); });
  const ajoute = (cid, uid) => { if(cid && m[cid] && uid) m[cid].add(uid); };
  Object.keys(t.personnages || {}).forEach(id => { const x = t.personnages[id]; ajoute(formeCampagneEff(t, x.campagne), proprioImp('personnages', x).uid); });
  Object.keys(t.blocs || {}).forEach(id => { const x = t.blocs[id]; ajoute(formeCampagneDe(t, 'blocs', x), proprioImp('blocs', x).uid); });
  Object.keys(t.journal || {}).forEach(id => { const x = t.journal[id]; ajoute(formeCampagneDe(t, 'journal', x), proprioImp('journal', x).uid); });
  const out = {};
  Object.keys(m).forEach(cid => { out[cid] = Array.from(m[cid]); });
  return out;
}

function dessinerImport(){
  const b = $('impCorps'); b.replaceChildren();
  if(IMP.fichiers.length){ const u = el('ul', 'adfichiers'); IMP.fichiers.forEach(f => u.append(el('li', null, f))); b.append(u); }
  if(!IMP.table) return;
  const t = IMP.table;
  b.append(el('p', 'note', 'Contenu : ' + compter(t).map(([k, n]) => n + ' ' + k).join(', ') + '.'));
  // les noms → les comptes
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
  trd.append(el('td', null, 'Sans nom, ou nom non attribué'), el('td', 'pale', ''));
  const tdd = el('td'); tdd.append(sd); trd.append(tdd); tab.append(trd);
  b.append(tab);
  // les campagnes et leurs membres
  const mb = membresImp(t);
  b.append(el('span', 'lab', 'Les campagnes et leurs membres'));
  const ul = el('ul', 'adfichiers');
  Object.keys(t.campagnes || {}).forEach(cid => {
    const c = t.campagnes[cid];
    ul.append(el('li', null, (c.nom || cid) + ' : ' + (mb[cid] || []).map(uid => (COMPTES[uid] || {}).nom || uid).join(', ')));
  });
  b.append(ul);
  b.append(el('p', 'note', 'Les membres se changent ensuite dans la section « Les campagnes ». Les réglages personnels (disposition de la table, positions du réseau) ne sont pas importés : chacun refera les siens.'));
  const go = bouton('Importer dans le monde en ligne', '', () => importer(go));
  b.append(go);
  const r = el('div'); r.id = 'impRapport';
  b.append(r);
}

/* ---------- l'écriture ---------- */
function importer(btn){
  const t = IMP.table, heure = firebase.firestore.FieldValue.serverTimestamp();
  const rapport = $('impRapport');
  btn.disabled = true;
  const dire = (txt, bon) => { rapport.replaceChildren(el('p', 'note ' + (bon === false ? 'err' : bon ? 'ok' : ''), txt)); };
  dire('Ce qui est déjà en ligne…');
  const membres = membresImp(t);
  const cols = FORMES_CLES.map(k => FORMES[k].col).concat(['jets']);
  // ce qui existe déjà, collection par collection : on n'y touche pas
  Promise.all(cols.map(col => FB_DB.collection(col).get().then(s => [col, new Set(s.docs.map(d => d.id))])))
    .then(l => {
      const existe = {};
      l.forEach(([col, ids]) => { existe[col] = ids; });
      const ecritures = [], deja = {};
      const doc = (col, id, champs, p) => {
        if(existe[col].has(id)){ deja[col] = (deja[col] || 0) + 1; return; }
        ecritures.push([col, id, Object.assign({}, champs, {proprietaire:p.uid, proprietaireNom:p.nom, cree:heure, majS:heure, modifiePar:COMPTE.uid})]);
      };
      // les campagnes d'abord : les règles demandent qu'elles existent avant ce qui leur appartient
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
      if(!existe.monde) existe.monde = new Set();
      return FB_DB.collection('monde').doc('table').get().then(s => {
        if(!s.exists) ecritures.push(['monde', 'table', {f:JSON.stringify({nom:t.nom || '', viderAvant:t.viderAvant || 0}),
          e:JSON.stringify({oracle:t.oracle || null}), proprietaire:COMPTE.uid, proprietaireNom:COMPTE.nom, cree:heure, majS:heure, modifiePar:COMPTE.uid}]);
        return ecrireParLots(ecritures, n => dire('Écriture… ' + n + ' / ' + ecritures.length)).then(() => [ecritures.length, deja]);
      });
    })
    .then(([n, deja]) => {
      const d = Object.keys(deja).map(c => deja[c] + ' ' + c).join(', ');
      dire('Import terminé : ' + n + ' document' + (n > 1 ? 's' : '') + ' écrit' + (n > 1 ? 's' : '') + '.' + (d ? ' Déjà en ligne, laissés tels quels : ' + d + '.' : ''), true);
      btn.disabled = false;
    }, e => { dire('L’import s’est arrêté : ' + compteErreur(e) + ' Ce qui est écrit le reste ; relance pour finir.', false); btn.disabled = false; });
}
// par lots de 400 : les campagnes passent dans les premiers, avant ce qui leur appartient
function ecrireParLots(ecritures, avance){
  let i = 0;
  const suivant = () => {
    if(i >= ecritures.length) return Promise.resolve();
    const b = FB_DB.batch();
    ecritures.slice(i, i + 400).forEach(([col, id, d]) => b.set(FB_DB.collection(col).doc(id), d));
    i += 400;
    return b.commit().then(() => { avance(Math.min(i, ecritures.length)); return suivant(); });
  };
  return suivant();
}

compteQuandPret(c => { if(c.role === 'admin' && $('impFichiers')) $('impFichiers').onchange = lireFichiers; });
