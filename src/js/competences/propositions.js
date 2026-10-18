/* ============ proposer un changement : les compétences sont aux admins ============
   Seuls les admins changent les Pratiques et les compétences (les règles le gardent). Un joueur les lit ici
   sans pouvoir les retoucher, et propose ce qu'il voudrait voir changer : un admin accepte ou refuse,
   avec un mot, depuis sa page. */

function dessinerMesPropositions(snap){
  const l = $('propListe');
  if(!l) return;
  l.innerHTML = '';
  const docs = snap.docs.slice().sort((a, b) => ((b.data().t || {}).seconds || 0) - ((a.data().t || {}).seconds || 0));
  if(!docs.length){ l.append(el('p', 'note', 'Aucune proposition pour l’instant.')); return; }
  docs.forEach(d => {
    const v = d.data(), p = el('div', 'propItem');
    const etat = v.statut === 'acceptee' ? 'Acceptée' : v.statut === 'refusee' ? 'Refusée' : 'En attente';
    p.append(el('div', 'propTete', (v.sujet ? v.sujet + ' · ' : '') + etat), el('p', 'propTexte', v.texte));
    if(v.reponse) p.append(el('p', 'note ' + (v.statut === 'acceptee' ? 'ok' : 'err'), 'Réponse : ' + v.reponse));
    l.append(p);
  });
}

compteQuandPret(c => {
  if(c.role === 'admin' || !FB_DB) return;
  document.body.classList.add('lecture-seule');
  const s = el('section'); s.id = 'secProposer'; s.className = 'noprint';
  const h = el('h2'); h.append(el('span', 'num', '!'), document.createTextNode(' Proposer un changement'));
  s.append(h, el('p', 'hint', 'Les Pratiques et les compétences sont les mêmes pour tout le monde : seuls les admins les changent. Tu les lis ici, et tu peux proposer ce que tu voudrais voir changer. Un admin te répondra.'));
  const card = el('div', 'card'), f = el('form', 'propForm');
  const sujet = el('select'); sujet.setAttribute('aria-label', 'Ce que ça touche');
  ['Une Pratique', 'Une compétence', 'Une compétence de Bannière', 'Autre chose'].forEach(x => sujet.append(new Option(x, x)));
  const texte = el('textarea'); texte.rows = 4; texte.maxLength = 4000; texte.placeholder = 'Ce que tu changerais, et pourquoi.';
  const ok = el('button', 'btn sm', 'Envoyer la proposition'); ok.type = 'submit';
  const msg = el('p', 'note'); msg.setAttribute('role', 'status');
  f.append(sujet, texte, ok, msg);
  f.onsubmit = ev => {
    ev.preventDefault();
    const t = texte.value.trim();
    if(!t){ msg.textContent = 'Écris d’abord ta proposition.'; msg.className = 'note err'; return; }
    ok.disabled = true;
    FB_DB.collection('propositions').add({texte:t, sujet:sujet.value, proprietaire:COMPTE.uid, proprietaireNom:COMPTE.nom,
      t:firebase.firestore.FieldValue.serverTimestamp(), statut:'ouverte'})
      .then(() => { texte.value = ''; msg.textContent = 'Envoyée. Un admin la verra.'; msg.className = 'note ok'; },
        e => { msg.textContent = compteErreur(e); msg.className = 'note err'; })
      .then(() => { ok.disabled = false; });
  };
  const liste = el('div'); liste.id = 'propListe';
  card.append(f, el('span', 'lab', 'Tes propositions'), liste);
  s.append(card);
  const avant = $('secPratiques');
  if(avant) avant.parentNode.insertBefore(s, avant);
  FB_DB.collection('propositions').where('proprietaire', '==', COMPTE.uid).onSnapshot(dessinerMesPropositions, () => {});
});
