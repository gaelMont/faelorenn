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
