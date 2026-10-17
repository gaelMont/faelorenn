/* ---------- une sauvegarde .json ---------- */
const sauvegardeJson = () => JSON.stringify(regContenu(), null, 1);
/* une sauvegarde se fond dans ce qu'on a : la plus récente de chaque pièce l'emporte, rien ne s'efface */
function importerJson(texte){
  let o = null;
  try{ o = JSON.parse(texte); }catch(e){ return {ok:false, msg:'Ce fichier n’est pas lisible.'}; }
  if(!o || typeof o !== 'object' || o.format !== REG_FORMAT) return {ok:false, msg:'Ce n’est pas une sauvegarde du Registre des Compétences.'};
  if(+o.version > REG_VERSION) return {ok:false, msg:'Cette sauvegarde vient d’une version plus récente du Registre : mets d’abord le site à jour.'};
  const r = regLireBrut(o), fond = regFondre(REG, r);
  let n = 0;
  ['competences', 'pratiques'].forEach(c => Object.keys(fond[c]).forEach(id => { if(!REG[c][id] || regCanon(REG[c][id]) !== regCanon(fond[c][id])) n++; }));
  if(!n) return {ok:true, msg:'Rien de neuf dans ce fichier : tout y est déjà, ou en plus récent ici.'};
  REG.competences = fond.competences; REG.pratiques = fond.pratiques;
  regSortie();
  UI.ouvert = null; UI.neuve = false;
  return {ok:true, msg:'Repris : ' + pluriel(n, 'pièce nouvelle ou plus récente', 'pièces nouvelles ou plus récentes') + '.'};
}
function brancherEnLigne(){
  $('cmpEnLigne').onclick = sauverEnLigne;
  $('cmpJson').onclick = e => telecharger('competences-faelorenn.json', sauvegardeJson(), 'application/json', e.currentTarget);
  $('cmpImport').onclick = () => $('cmpFichier').click();
  $('cmpFichier').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const r = importerJson(String(lecteur.result));
      const m = $('cmpMsg'); m.textContent = r.msg; m.hidden = false; m.className = r.ok ? 'note ok' : 'note err';
      clearTimeout(brancherEnLigne.t); brancherEnLigne.t = setTimeout(() => { m.hidden = true; }, 8000);
      e.target.value = '';
      dessiner();
      sauverBientot();
    };
    lecteur.readAsText(f);
  };
  PANNEAU = ghcPanneau($('ghcPlace'), {
    etat: () => GH ? {nom:'Les compétences', texte:GH.actif ? 'dernier échange ' + ghcIlYA(GH.dernier) : 'à l’arrêt', erreur:GH.erreur} : null,
    apresRelier: r => { relancerEnLigne(); return r; },
    apresDetacher: () => relancerEnLigne()
  });
  ghcSurveiller(() => { relancerEnLigne(); PANNEAU.dessiner(); });
  /* un autre onglet du même navigateur retouche le registre : celui-ci le suit */
  window.addEventListener('storage', e => {
    if(e.key !== REG_CLE && e.key !== null) return;
    const fond = regFondre(REG, regLireBrut((() => { try{ return JSON.parse(e.newValue || 'null'); }catch(x){ return null; } })()));
    if(regEgal(fond, REG)) return;
    REG.competences = fond.competences; REG.pratiques = fond.pratiques;
    if(UI.ouvert || UI.neuve) UI.aRedessiner = true; else dessiner();
  });
  setInterval(dessinerEtat, 5000);
}
