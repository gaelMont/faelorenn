/* ---------- télécharger un fichier : par l'hôte si possible, sinon par le navigateur ---------- */
let DLNS;
function espaceTelechargement(){
  if(DLNS !== undefined) return Promise.resolve(DLNS);
  try{
    if(typeof claude === 'undefined' || !claude || typeof claude.use !== 'function'){ DLNS = null; return Promise.resolve(null); }
    return claude.use('downloads').then(ns => (DLNS = ns || null), () => (DLNS = null));
  }catch(e){ DLNS = null; return Promise.resolve(null); }
}
function telecharger(nom, contenu, type, bouton){
  const libelle = bouton ? bouton.textContent : '';
  const dire = t => { if(!bouton) return; bouton.textContent = t; setTimeout(() => { bouton.textContent = libelle; }, 2200); };
  const blob = contenu instanceof Blob ? contenu : new Blob([contenu], {type:type});
  return espaceTelechargement().then(ns => {
    if(ns) return ns.save({filename:nom, data:blob}).then(() => dire('Enregistré'),
      e => dire(e && e.code === 'declined' ? 'Annulé' : 'Refusé'));
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nom; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
    dire('Fichier envoyé');
  });
}
