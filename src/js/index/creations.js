/* ============ tes créations privées : les proposer à la validation ============
   Ennemis, familles, tables de butin, plans et tables de tirage restent à leur créateur tant qu'un admin ne
   les a pas validés. Ici, chacun voit les siens et les propose (ou retire sa proposition). */
(function(){
  const COLS = [['creatures', 'Ennemi'], ['familles', 'Famille'], ['butins', 'Table de butin'], ['plans', 'Plan'], ['tables', 'Table de tirage']];
  const PIECES = {};
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };
  const nomDe = (d, x) => x.n || x.nom || x.titre || (x.plan && (x.plan.name || x.plan.nom)) || d.id;

  function dessiner(){
    const z = document.getElementById('creations-liste');
    if(!z) return;
    z.replaceChildren();
    const l = [];
    COLS.forEach(([col, genre]) => (PIECES[col] || []).forEach(d => {
      const v = d.data(), x = formeJson(v.f);
      if(x.supprime || v.statut === 'valide') return;
      l.push([genre, nomDe(d, x), v.statut, d]);
    }));
    if(!l.length){ z.append(el('p', 'note', 'Rien de privé : tout ce que tu as créé est validé, ou tu n’as encore rien créé.')); return; }
    const ul = el('ul', 'inv');
    l.sort((a, b) => a[0].localeCompare(b[0], 'fr') || String(a[1]).localeCompare(String(b[1]), 'fr')).forEach(([genre, nom, statut, d]) => {
      const li = el('li');
      li.append(el('span', 'quoi', genre + ' · ' + nom), el('span', 'ou', statut === 'propose' ? 'proposé, en attente d’un admin' : 'privé'));
      const b = el('button', 'btn-mini', statut === 'propose' ? 'Retirer la proposition' : 'Proposer');
      b.type = 'button';
      b.onclick = () => {
        b.disabled = true;
        d.ref.update({statut: statut === 'propose' ? 'prive' : 'propose', majS: firebase.firestore.FieldValue.serverTimestamp(), modifiePar: COMPTE.uid})
          .catch(e => { alert(compteErreur(e)); b.disabled = false; });
      };
      li.append(b);
      ul.append(li);
    });
    z.append(ul);
  }

  compteQuandPret(() => {
    if(!FB_DB) return;
    COLS.forEach(([col]) => FB_DB.collection(col).where('proprietaire', '==', COMPTE.uid).onSnapshot(s => { PIECES[col] = s.docs; dessiner(); }, () => {}));
  });
})();
