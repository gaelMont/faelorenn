/* ============ export .json : la fiche, pour le suivi de campagne ============ */

function personneJson(){
  const p = PEUPLES[S.peuple], ix = pratIndex();
  const car = {}; CARS.forEach(c => car[c] = carVal(c));
  const comp = {}; ALLSKILLS.forEach(o => comp[o.s] = skTotal(o.s));
  const prats = pratNoms().map(n => {
    const it = ix[n] || {};
    return {n:n, j:it.j || 'aucun jet', pc:it.pc || 0, pct:it.pct || '', d:it.d || '', base:!!it.base};
  });
  if(S.banComp && ix[S.banComp]) prats.push({n:S.banComp, j:'aucun jet', pc:0, pct:'', d:ix[S.banComp].d || '', banniere:true});
  return {
    format:'faelorenn-personnage', version:1, exporte:new Date().toISOString(),
    nom:S.nom, peuple:S.peuple, voie:S.voie, sub:JSON.parse(JSON.stringify(S.sub || {})),
    car:car, comp:comp, compCar:regCarsCourants(), bonusPratique:pratBonus(), domaine:domaine() || '',
    pratiques:prats, pv:pv(), pc:pc(), red:p.red,
    armes:armesDuPaquetage(), sac:resteDuSac(), bourse:bourse(),
    traits:p.traits || '', contrainte:p.contrainte || '', armure:p.armure || '', peupleComp:p.comp || ''
  };
}

function exporterJson(){
  const btn = $('json');
  const dire = (t, ms) => { btn.textContent = t; setTimeout(() => { btn.textContent = 'Enregistrer en .json'; }, ms || 2200); };
  const nom = nomFichier() + '.json';
  const blob = new Blob([JSON.stringify(personneJson(), null, 2)], {type:'application/json'});
  dispoTelechargement().then(function(ns){
    if(ns){
      ns.save({filename:nom, data:blob}).then(
        function(){ dire('Fichier enregistré'); },
        function(err){ const c = err && err.code; dire(c === 'declined' ? 'Annulé' : 'Enregistrement refusé', 2800); }
      );
      return;
    }
    try{
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = nom; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); }, 4000);
      dire(estEncadre() ? 'Bloqué ici : voir ci-dessous' : 'Fichier envoyé', estEncadre() ? 3200 : 2200);
    }catch(e){ dire('Export impossible', 3000); }
  });
}
