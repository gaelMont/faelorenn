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
// une campagne sans auteur (l'ancienne table ne le notait pas toujours) : à celui qui y joue, s'il est seul à y jouer
function proprioCampagneImp(t, cid){
  const c = t.campagnes[cid];
  if(String(c.auteur || '').trim()) return proprioImp('campagnes', c);
  const joueurs = new Set();
  Object.keys(t.personnages || {}).forEach(id => {
    const x = t.personnages[id];
    if(x && !x.supprime && formeCampagneEff(t, x.campagne) === cid && String(x.joueur || '').trim()) joueurs.add(proprioImp('personnages', x).uid);
  });
  if(joueurs.size !== 1) return proprioImp('campagnes', c);
  const uid = Array.from(joueurs)[0];
  return {uid:uid, nom:(COMPTES[uid] || {}).nom || '?'};
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
  Object.keys(t.campagnes || {}).forEach(cid => { m[cid] = new Set([proprioCampagneImp(t, cid).uid]); });
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
      ul.append(el('li', null, (c.nom || cid) + ' · créée par ' + proprioCampagneImp(t, cid).nom + ' · membres : ' + (mb[cid] || []).map(uid => (COMPTES[uid] || {}).nom || uid).join(', ')));
    });
    b.append(ul);
    b.append(el('span', 'lab', 'Les personnages et leurs joueurs'));
    const up = el('ul', 'adfichiers');
    Object.keys(t.personnages || {}).forEach(id => {
      const x = t.personnages[id];
      if(x && !x.supprime) up.append(el('li', null, (x.nom || id) + ' · joué par ' + proprioImp('personnages', x).nom + (x.joueur ? '' : ' (aucun joueur noté)')));
    });
    b.append(up);
  }
  b.append(el('p', 'note', 'Les membres, le créateur d’une campagne et le joueur d’un personnage se changent ensuite dans la section « Les campagnes ». Le bestiaire et les plans d’avant arrivent validés : ils étaient déjà partagés. Les réglages personnels (disposition de la table, positions du réseau) ne sont pas importés : chacun refera les siens.'));
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
          doc('campagnes', id, Object.assign(versDoc('campagnes', x, t), {membres:membres[id] || [COMPTE.uid]}), proprioCampagneImp(t, id));
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
