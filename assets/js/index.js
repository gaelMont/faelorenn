// Fichier généré par outils/build.mjs depuis src/js/index/ : ne pas le modifier, modifier les modules.

// ── commun/echappement.js ──
/* ============ l'échappement : un texte posé dans du HTML ou du XML ============
   & < > et " deviennent des entités : un nom comme « Gorm <le Rouge> » s'affiche tel quel au lieu
   d'être lu comme une balise, et un texte venu d'un autre joueur ne peut rien glisser dans la page.
   Une valeur absente (null, undefined) donne une chaîne vide. L'apostrophe n'est pas touchée :
   les attributs s'écrivent entre guillemets doubles.
   Une déclaration « function » : ce module peut se trouver dans deux scripts d'une même page
   (index et plans chargent le paquet sync-github en plus du leur). */
function echapperHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]);
}

// ── index/accueil.js ──
(function(){
  const $ = id => document.getElementById(id);
  const taille = n => n < 1024 ? n + ' octets' : Math.round(n / 1024) + ' Ko';
  function inventaire(){
    const box = $('inventaire');
    if(!ghcPret()){ box.hidden = true; return; }
    const lignes = [
      {quoi:'La table et ses PNJ', fic:GHC.table || GHC_FICHIERS.table, pas:'Pas encore : ouvre le Registre de la Table une fois.'},
      {quoi:'Tes personnages', fic:GHC_FICHIERS.personnages, pas:'Pas encore : ouvre le Registre du Havre une fois.'},
      {quoi:'Le bestiaire', fic:GHC_FICHIERS.bestiaire, pas:'Pas encore : ouvre le Registre des Rencontres une fois.'},
      {quoi:'Les compétences et les Pratiques retouchées', fic:GHC_FICHIERS.competences, pas:'Pas encore : retouche quelque chose dans le Registre des Compétences.'},
      {quoi:'Les plans', fic:GHC_FICHIERS.plans, pas:'Pas encore : touche à un plan dans le Registre des Plans.'}
    ];
    ghcInventaire().then(liste => {
      const noms = {};
      (liste || []).forEach(f => { noms[f.nom] = f; });
      $('invListe').innerHTML = lignes.map(l => {
        const f = noms[l.fic];
        return '<li class="' + (f ? 'la' : '') + '"><span class="quoi">' + echapperHtml(l.quoi) + '</span><span class="fic">' + echapperHtml(l.fic) + '</span>' +
          '<span class="ou">' + (f ? 'Dans le dépôt, ' + taille(f.taille) + '.' : echapperHtml(l.pas)) + '</span></li>';
      }).join('');
      $('invNote').innerHTML = '<a href="https://github.com/' + echapperHtml(GHC.depot) + '" target="_blank" rel="noopener">Ouvrir le dépôt sur GitHub</a>, pour voir l’historique de chaque fichier.';
      box.hidden = false;
    }, () => { box.hidden = true; });
  }
  ghcCharger();
  const P = ghcPanneau($('ghcPlace'), {ouvert:true, encart:true, apresRelier: r => { inventaire(); return r; }, apresDetacher: inventaire});
  ghcSurveiller(() => { P.dessiner(); inventaire(); });
  inventaire();
})();

// ── index/creations.js ──
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
