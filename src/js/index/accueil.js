(function(){
  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]);
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
        return '<li class="' + (f ? 'la' : '') + '"><span class="quoi">' + esc(l.quoi) + '</span><span class="fic">' + esc(l.fic) + '</span>' +
          '<span class="ou">' + (f ? 'Dans le dépôt, ' + taille(f.taille) + '.' : esc(l.pas)) + '</span></li>';
      }).join('');
      $('invNote').innerHTML = '<a href="https://github.com/' + esc(GHC.depot) + '" target="_blank" rel="noopener">Ouvrir le dépôt sur GitHub</a>, pour voir l’historique de chaque fichier.';
      box.hidden = false;
    }, () => { box.hidden = true; });
  }
  ghcCharger();
  const P = ghcPanneau($('ghcPlace'), {ouvert:true, encart:true, apresRelier: r => { inventaire(); return r; }, apresDetacher: inventaire});
  ghcSurveiller(() => { P.dessiner(); inventaire(); });
  inventaire();
})();
