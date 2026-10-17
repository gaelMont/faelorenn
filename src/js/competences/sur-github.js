/* ============ le registre sur GitHub ============
   competences.json, dans le dépôt de la sauvegarde en ligne, avec les mêmes règles que les autres fichiers :
   on relit toutes les dix secondes (GitHub répond 304 tant que rien n'a bougé), on écrit en regroupant les
   changements, jamais deux fois en moins de quinze secondes. Chaque pièce y porte sa date, et la plus récente l'emporte. */

let GH = null;          /* le fichier du dépôt, tant que le dépôt est relié */
let PANNEAU = null;

function ghCompetences(){
  const doc = ghcDoc({
    nom:'Compétences', quoi:'un registre de compétences Faelorenn', format:REG_FORMAT, chemin:GHC_FICHIERS.competences,
    recevoir: o => {
      const fond = regFondre(REG, regLireBrut(o));
      if(regEgal(fond, REG)) return;
      REG.competences = fond.competences; REG.pratiques = fond.pratiques;
      regGarder();
      /* on ne referme pas ce que quelqu'un est en train d'écrire */
      if(UI.ouvert || UI.neuve) UI.aRedessiner = true; else dessiner();
    },
    enAvance: o => regEnAvance(REG, regLireBrut(o)),
    contenu: () => regContenu(),
    etat: () => { dessinerEtat(); if(PANNEAU) PANNEAU.dessiner(); }
  });
  doc.demarrer();
  return doc;
}
/* relier, détacher : le registre repart du bon pied, sans recharger la page */
function relancerEnLigne(){
  if(GH){ GH.arreter(); GH = null; }
  ghcCharger();
  if(ghcPret()) GH = ghCompetences();
  dessinerEtat();
}
function sauverBientot(){
  if(GH && GH.actif) GH.planifier();
  dessinerEtat();
}
function dessinerEtat(){
  const p = $('etat');
  if(!p) return;
  let cls = 'pt', t = 'Gardé dans ce navigateur seulement';
  /* une erreur qui a arrêté la sauvegarde en ligne se lit aussi : c'est elle qui explique pourquoi rien ne part */
  if(GH && ghcPret() && (GH.actif || GH.erreur)){
    if(GH.erreur){ cls = 'pt off'; t = 'En ligne : à vérifier. ' + GH.erreur; }
    else { cls = 'pt on'; t = GH.enAttente() ? 'En ligne : un changement part dans un instant' : 'En ligne : dernier échange ' + ghcIlYA(GH.dernier); }
  }
  /* le navigateur refuse d'écrire (espace plein, stockage bloqué) : mieux vaut le savoir avant de tout perdre */
  if(!REG_GARDE){ cls = 'pt off'; t = 'Pas gardé dans ce navigateur : il refuse d’écrire (espace plein ou stockage bloqué). Télécharge une sauvegarde .json pour ne rien perdre.'; }
  /* la ligne est annoncée aux lecteurs d'écran : on ne la réécrit que si elle a changé */
  const marque = cls + '|' + t;
  if(dessinerEtat.marque === marque && p.firstChild) return;
  dessinerEtat.marque = marque;
  p.innerHTML = '';
  const pt = el('span', cls);
  p.append(pt, document.createTextNode(t));
}
/* « Sauvegarder en ligne » : tout part tout de suite dans le dépôt */
function sauverEnLigne(){
  const b = $('cmpEnLigne');
  const dire = (t, ok) => {
    const m = $('cmpMsg');
    m.textContent = t; m.hidden = false; m.className = ok ? 'note ok' : 'note err';
    clearTimeout(dire.t); dire.t = setTimeout(() => { m.hidden = true; }, 12000);
  };
  if(!ghcPret()){
    dire('Relie d’abord ton dépôt GitHub, une seule fois : c’est le panneau « Sauvegarde en ligne », juste en dessous. Ensuite, chaque changement part tout seul.', false);
    ghcOuvrirPanneau();
    return;
  }
  /* le dépôt n'avait pas répondu à l'ouverture : on refrappe à la porte */
  if(!GH || !GH.actif){
    relancerEnLigne();
    dire('Nouvel essai avec le dépôt : ce qui attend ici y part dès qu’il répond. L’état s’affiche en haut de la page.', true);
    return;
  }
  b.disabled = true; b.textContent = 'Sauvegarde…';
  GH.maintenant().then(r => {
    b.disabled = false; b.textContent = 'Sauvegarder en ligne';
    dire(ghcPhraseSauvegarde(r, 'Le registre'), r.ok);
    dessinerEtat();
  });
}
