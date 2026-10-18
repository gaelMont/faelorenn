/* ============ les campagnes, leurs membres, et à qui elles sont ============
   Les séances, paragraphes, jets et rencontres d'une campagne ne se lisent que par ses membres.
   Son créateur les choisit depuis la table ; un admin peut les changer ici, pour toutes.
   L'ancien monde ne disait pas toujours qui avait créé une campagne, ni qui jouait un personnage :
   un admin les rend ici à leur vrai créateur (les règles ne lui permettent que ça : « transfert »). */

let CAMP_SNAP = null, PERSOS_SNAP = null, PERSOS_SIGNE = '';
const heureCamp = () => firebase.firestore.FieldValue.serverTimestamp();
const comptesTries = () => Object.keys(COMPTES).sort((a, b) => String(COMPTES[a].nom).localeCompare(String(COMPTES[b].nom), 'fr'));

// un menu des comptes ; changer d'avis écrit tout de suite
function choixProprio(d, actuel, etiquette, plus){
  const s = el('select', 'adproprio');
  s.setAttribute('aria-label', etiquette);
  comptesTries().forEach(uid => s.add(new Option(COMPTES[uid].nom, uid)));
  if(actuel && !COMPTES[actuel]) s.add(new Option('(compte inconnu)', actuel));
  s.value = actuel || '';
  s.onchange = () => {
    const uid = s.value, champs = {proprietaire:uid, proprietaireNom:COMPTES[uid].nom, majS:heureCamp(), modifiePar:COMPTE.uid};
    s.disabled = true;
    d.ref.update(Object.assign(champs, plus ? plus(uid) : {}))
      .catch(e => { s.value = actuel; alert(compteErreur(e)); })
      .then(() => { s.disabled = false; });
  };
  return s;
}

function dessinerCampagnes(snap){
  if(snap) CAMP_SNAP = snap;
  snap = CAMP_SNAP;
  if(!snap) return;
  const l = $('campListe'); l.replaceChildren();
  if(snap.empty){ l.append(el('p', 'note', 'Aucune campagne en ligne pour l’instant : importe l’ancien monde, ou crée-en une depuis la table.')); return; }
  // les personnages, rangés par campagne
  const persos = {};
  (PERSOS_SNAP ? PERSOS_SNAP.docs : []).forEach(d => {
    const v = d.data(), f = formeJson(v.f);
    if(f.supprime) return;
    (persos[v.campagne || ''] = persos[v.campagne || ''] || []).push([d, v, f]);
  });
  snap.docs.forEach(d => {
    const v = d.data(), f = formeJson(v.f), membres = Array.isArray(v.membres) ? v.membres : [];
    if(f.supprime) return;
    const bloc = el('div', 'adcamp');
    bloc.append(el('div', 'adcamp-nom', (f.nom || d.id) + (f.etat === 'finie' ? ' (terminée)' : '')));
    // son créateur : il en devient membre s'il ne l'était pas
    const cree = el('label', 'adligne');
    cree.append(document.createTextNode('créée par '), choixProprio(d, v.proprietaire, 'Créée par',
      uid => (membres.indexOf(uid) >= 0 ? {} : {membres:membres.concat([uid])})));
    bloc.append(cree);
    const cases = el('div', 'adcases');
    comptesTries().forEach(uid => {
      const l2 = el('label', 'adcase'), c = el('input');
      c.type = 'checkbox'; c.checked = membres.indexOf(uid) >= 0;
      c.disabled = uid === v.proprietaire;     // son créateur en est toujours
      c.onchange = () => {
        const m = new Set(membres); if(c.checked) m.add(uid); else m.delete(uid);
        d.ref.update({membres:Array.from(m), majS:heureCamp(), modifiePar:COMPTE.uid})
          .catch(e => { c.checked = !c.checked; alert(compteErreur(e)); });
      };
      l2.append(c, document.createTextNode(' ' + COMPTES[uid].nom));
      cases.append(l2);
    });
    bloc.append(el('span', 'lab', 'Membres'), cases);
    // ses personnages, et qui les joue
    const ps = (persos[d.id] || []).sort((a, b) => String(a[2].nom || '').localeCompare(String(b[2].nom || ''), 'fr'));
    if(ps.length){
      bloc.append(el('span', 'lab', 'Ses personnages'));
      const ul = el('ul', 'adpersos');
      ps.forEach(([pd, pv, pf]) => {
        const li = el('li', 'adligne');
        li.append(el('span', null, (pf.nom || 'Sans nom') + ' · joué par '), choixProprio(pd, pv.proprietaire, 'Joué par, pour ' + (pf.nom || 'ce personnage')));
        ul.append(li);
      });
      bloc.append(ul);
    }
    l.append(bloc);
  });
  // les personnages d'aucune campagne connue : on peut encore les rendre à leur joueur
  const connues = {};
  snap.docs.forEach(d => { connues[d.id] = 1; });
  const orphelins = [].concat(...Object.keys(persos).filter(cid => !connues[cid]).map(cid => persos[cid]));
  if(orphelins.length){
    const bloc = el('div', 'adcamp'), ul = el('ul', 'adpersos');
    bloc.append(el('div', 'adcamp-nom', 'Sans campagne'));
    orphelins.forEach(([pd, pv, pf]) => {
      const li = el('li', 'adligne');
      li.append(el('span', null, (pf.nom || 'Sans nom') + ' · joué par '), choixProprio(pd, pv.proprietaire, 'Joué par, pour ' + (pf.nom || 'ce personnage')));
      ul.append(li);
    });
    bloc.append(ul);
    l.append(bloc);
  }
}
compteQuandPret(c => {
  if(c.role !== 'admin' || !FB_DB) return;
  FB_DB.collection('campagnes').onSnapshot(dessinerCampagnes, e => { $('campListe').replaceChildren(el('p', 'note err', compteErreur(e))); });
  // les PV changent sans cesse pendant une partie : on ne redessine que si un nom, un joueur ou une campagne change
  FB_DB.collection('personnages').onSnapshot(s => {
    PERSOS_SNAP = s;
    const signe = JSON.stringify(s.docs.map(d => { const v = d.data(), f = formeJson(v.f); return [d.id, v.proprietaire, v.campagne, f.nom, !!f.supprime]; }));
    if(signe === PERSOS_SIGNE) return;
    PERSOS_SIGNE = signe;
    dessinerCampagnes();
  }, () => {});
});
