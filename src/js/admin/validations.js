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
