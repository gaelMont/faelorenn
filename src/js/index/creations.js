/* ============ tes créations : les proposer à la validation, et y travailler à plusieurs ============
   Ennemis, familles, tables de butin, plans et tables de tirage restent à leur créateur, et à ceux qu'il invite
   à y travailler (membres), tant qu'un admin ne les a pas validés. Ici, chacun voit les siennes et celles qu'on
   partage avec lui ; il les propose (ou retire sa proposition), et choisit avec qui il les fait. */
(function(){
  const COLS = [['creatures', 'Ennemi'], ['familles', 'Famille'], ['butins', 'Table de butin'], ['plans', 'Plan'], ['tables', 'Table de tirage']];
  const PIECES = {};            // collection → id → document (les miennes, et celles où l'on m'a invité)
  const COMPTES_VUS = {};       // uid → pseudo
  const OUVERT = {};            // id → le choix des membres est ouvert
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };
  const nomDe = (d, x) => x.n || x.nom || x.titre || (x.plan && (x.plan.name || x.plan.nom)) || x.name || d.id;
  const heure = () => firebase.firestore.FieldValue.serverTimestamp();
  const etatDe = v => v.statut === 'valide' ? (v.revoir ? 'validé · une retouche attend un admin' : 'validé') : v.statut === 'propose' ? 'proposé, en attente d’un admin' : 'privé';

  function ecrire(d, champs, b){
    if(b) b.disabled = true;
    return d.ref.update(Object.assign(champs, {majS:heure(), modifiePar:COMPTE.uid}))
      .catch(e => { alert(compteErreur(e)); if(b) b.disabled = false; });
  }
  // les membres d'une création : des cases, une par compte (pas soi-même)
  function choixMembres(d, v){
    const box = el('div', 'avec'), membres = Array.isArray(v.membres) ? v.membres : [];
    Object.keys(COMPTES_VUS).filter(uid => uid !== COMPTE.uid).sort((a, b) => COMPTES_VUS[a].localeCompare(COMPTES_VUS[b], 'fr')).forEach(uid => {
      const l = el('label'), c = el('input');
      c.type = 'checkbox'; c.checked = membres.indexOf(uid) >= 0;
      c.onchange = () => {
        const m = new Set(membres); if(c.checked) m.add(uid); else m.delete(uid);
        ecrire(d, {membres:Array.from(m)}).then(() => {}, () => { c.checked = !c.checked; });
      };
      l.append(c, document.createTextNode(' ' + COMPTES_VUS[uid]));
      box.append(l);
    });
    if(!box.children.length) box.append(el('span', 'note', 'Personne d’autre n’a encore de compte.'));
    return box;
  }

  function dessiner(){
    const z = document.getElementById('creations-liste');
    if(!z) return;
    z.replaceChildren();
    const l = [];
    COLS.forEach(([col, genre]) => Object.values(PIECES[col] || {}).forEach(d => {
      const v = d.data(), x = formeJson(v.f);
      if(x.supprime) return;
      l.push([genre, String(nomDe(d, x)), v, d]);
    }));
    if(!l.length){ z.append(el('p', 'note', 'Rien pour l’instant : ce que tu crées dans le bestiaire, les plans ou les tables de tirage apparaît ici.')); return; }
    const ul = el('ul', 'inv');
    l.sort((a, b) => a[0].localeCompare(b[0], 'fr') || a[1].localeCompare(b[1], 'fr')).forEach(([genre, nom, v, d]) => {
      const li = el('li'), mien = v.proprietaire === COMPTE.uid;
      const avec = (Array.isArray(v.membres) ? v.membres : []).filter(u => u !== COMPTE.uid).map(u => COMPTES_VUS[u] || '?');
      const qui = mien ? (avec.length ? ' · avec ' + avec.join(', ') : '') : ' · de ' + (v.proprietaireNom || '?') + ', avec toi';
      li.append(el('span', 'quoi', genre + ' · ' + nom), el('span', 'ou', etatDe(v) + qui));
      const acts = el('span', 'actes');
      if(v.statut !== 'valide'){
        const b = el('button', 'btn-mini', v.statut === 'propose' ? 'Retirer la proposition' : 'Proposer');
        b.type = 'button';
        b.onclick = () => ecrire(d, {statut:v.statut === 'propose' ? 'prive' : 'propose'}, b);
        acts.append(b);
      }
      if(mien){
        const m = el('button', 'btn-mini', OUVERT[d.id] ? 'Fermer' : 'Avec qui ?');
        m.type = 'button'; m.setAttribute('aria-expanded', OUVERT[d.id] ? 'true' : 'false');
        m.onclick = () => { OUVERT[d.id] = !OUVERT[d.id]; dessiner(); };
        acts.append(m);
      }
      li.append(acts);
      if(mien && OUVERT[d.id]) li.append(choixMembres(d, v));
      ul.append(li);
    });
    z.append(ul);
  }

  compteQuandPret(() => {
    if(!FB_DB) return;
    FB_DB.collection('comptes').onSnapshot(s => { s.docs.forEach(d => { COMPTES_VUS[d.id] = d.data().nom || '?'; }); dessiner(); }, () => {});
    COLS.forEach(([col]) => {
      const vues = {};
      const fondre = () => { PIECES[col] = Object.assign({}, vues.moi || {}, vues.avec || {}); dessiner(); };
      const garder = cle => s => { vues[cle] = {}; s.docs.forEach(d => { vues[cle][d.id] = d; }); fondre(); };
      FB_DB.collection(col).where('proprietaire', '==', COMPTE.uid).onSnapshot(garder('moi'), () => {});
      FB_DB.collection(col).where('membres', 'array-contains', COMPTE.uid).onSnapshot(garder('avec'), () => {});
    });
  });
})();
