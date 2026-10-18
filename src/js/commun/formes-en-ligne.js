/* ============ les formes en ligne : une entrée de la table ↔ un document Firestore ============
   Chaque entrée (un personnage, une séance, un paragraphe…) devient un document de même identifiant.
   Son contenu y est écrit en JSON, en groupes, parce que les règles de sécurité décident par groupe :
   - f : la fiche, à celui qui l'a créée ;
   - e : l'état de jeu (PV, coups, états, cartes du round, où en est une mission…), que d'autres
     joueurs peuvent changer : les membres de la campagne, ou tout le monde selon la collection ;
   - c : la carte de combat d'une séance, à part parce qu'elle est lourde.
   Le JSON garde tout tel quel (Firestore refuse les tableaux de tableaux, les clés vides, undefined).
   À côté : proprietaire, proprietaireNom, cree, majS (heure du serveur, pour ne relire que le neuf),
   modifiePar, et selon la collection campagne, perso, statut, membres.
   Ces fonctions sont pures : la table (registre) et l'import (admin) s'en servent pareil. */

const FORMES = {
  campagnes:   {col:'campagnes',   portee:'monde',    etat:['an', 'jour', 'majDate', 'jetsAvant']},
  personnages: {col:'personnages', portee:'monde',    etat:['pv', 'pcc', 'pv0', 'pc0', 'majPv', 'majPc', 'vie', 'prog', 'monde', 'mondeT']},
  journal:     {col:'seances',     portee:'campagne', etat:['init', 'majInit', 'jetons', 'majJetons', 'etats', 'majEtats', 'lieu', 'majLieu'], carte:['carte', 'majCarte']},
  blocs:       {col:'paragraphes', portee:'campagne'},
  rencontres:  {col:'rencontres',  portee:'campagne'},
  adversaires: {col:'adversaires', portee:'campagne'},
  pnj:         {col:'pnj',         portee:'monde',    etat:['pv', 'pv0', 'majPv', 'vie', 'majCombat']},
  lieux:       {col:'lieux',       portee:'monde'},
  liens:       {col:'liens',       portee:'monde'},
  missions:    {col:'missions',    portee:'monde',    etat:['etat', 'seance', 'lancee', 'fin', 'finie', 'bloc', 'gagnants', 'majEtat']},
  objets:      {col:'objets',      portee:'monde'},
  argent:      {col:'argent',      portee:'monde'},
  tables:      {col:'tables',      portee:'statut'}
};
const FORMES_CLES = Object.keys(FORMES);
const FORME_DE_COL = {};
FORMES_CLES.forEach(k => { FORME_DE_COL[FORMES[k].col] = k; });

/* la campagne d'un élément, comme la table la lit : la sienne si elle existe, sinon la première
   (celle d'avant les campagnes, ou la plus ancienne) */
function formeCampagneDefaut(t){
  const l = Object.keys((t && t.campagnes) || {}).map(k => t.campagnes[k]).filter(c => c && !c.supprime);
  const d = l.find(c => c.id === 'c-principale') || l.sort((a, b) => ((+a.creee || 0) - (+b.creee || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
  return d ? d.id : '';
}
function formeCampagneEff(t, id){
  const c = id && t.campagnes && t.campagnes[id];
  return c && !c.supprime ? id : formeCampagneDefaut(t);
}
function formeCampagneDe(t, k, x){
  if(k === 'journal' || k === 'personnages') return formeCampagneEff(t, x.campagne);
  if(k === 'blocs') return formeCampagneEff(t, ((t.journal || {})[x.seance] || {}).campagne);
  if(k === 'rencontres') return formeCampagneEff(t, ((t.journal || {})[x.seance] || {}).campagne);
  if(k === 'adversaires'){
    const r = (t.rencontres || {})[x.rencontre] || {};
    return formeCampagneEff(t, ((t.journal || {})[r.seance] || {}).campagne);
  }
  return '';
}

/* une entrée de la table → les champs du document (sans les champs de propriété ni les dates) */
function versDoc(k, x, t){
  const F = FORMES[k], f = Object.assign({}, x), d = {};
  if(F.etat){
    const e = {};
    F.etat.forEach(c => { if(c in f){ e[c] = f[c]; delete f[c]; } });
    // un PNJ qu'on fait entrer dans un combat : c'est de l'état de jeu, la fiche de combat reste au créateur
    if(k === 'pnj' && f.combat && typeof f.combat === 'object'){
      e.engage = {dans:!!f.combat.dans, seance:f.combat.seance || ''};
      f.combat = Object.assign({}, f.combat); delete f.combat.dans; delete f.combat.seance;
    }
    d.e = JSON.stringify(e);
  }
  if(F.carte){
    const c = {};
    F.carte.forEach(n => { if(n in f){ c[n] = f[n]; delete f[n]; } });
    d.c = JSON.stringify(c);
  }
  d.f = JSON.stringify(f);
  if(F.portee === 'campagne' || k === 'personnages') d.campagne = formeCampagneDe(t, k, x);
  if(k === 'objets' || k === 'argent') d.perso = String(x.perso || '');
  return d;
}
/* un document → l'entrée, telle que la table la normalise ensuite */
function depuisDoc(k, doc){
  const x = Object.assign({}, formeJson(doc.f), formeJson(doc.e), formeJson(doc.c));
  if(k === 'pnj'){
    const g = x.engage; delete x.engage;
    if(x.combat && typeof x.combat === 'object' && g && typeof g === 'object') x.combat = Object.assign({}, x.combat, {dans:!!g.dans, seance:g.seance || ''});
  }
  return x;
}

/* les jets : un document chacun, jamais retouché */
function jetVersDoc(j, t){ return {f:JSON.stringify(j), campagne:formeCampagneEff(t, j.campagne)}; }
function jetDepuisDoc(doc){ return formeJson(doc.f); }
