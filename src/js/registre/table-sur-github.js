/* ============ la table sur GitHub : son fichier dans le dépôt de la sauvegarde en ligne ============
   Le dépôt se relie une fois pour les trois registres (voir commun/sync-github.js). Ici, la table y lit et
   y écrit son fichier : chaque personnage, paragraphe, PNJ ou lien porte sa date, le plus récent
   gagne, et les jets s'ajoutent sans jamais s'écraser. */

const GH = ghcDoc({
  nom:'Table', quoi:'une table Faelorenn', format:'faelorenn-table',
  chemin: () => GHC.table || GHC_FICHIERS.table,
  recevoir: o => {
    const avant = JSON.stringify(T);
    T = fusionner(T, normTable(o));
    sauverLocal();
    if(JSON.stringify(T) !== avant) dessiner(); else dessinerTable();
  },
  enAvance: o => tableEnAvance(normTable(o)),
  contenu: () => T,
  message: () => 'Table · ' + (MOI.joueur || 'quelqu’un') + ' · ' + new Date().toLocaleString('fr-BE'),
  etat: d => {
    if(SYNC.etat === 'github'){ SYNC.erreur = d.erreur; SYNC.dernier = d.dernier; }
    dessinerTable();
  }
});
/* ce que la table d'ici a de plus que celle du dépôt */
function tableEnAvance(r){
  if((T.maj || 0) > (r.maj || 0) || (T.viderAvant || 0) > (r.viderAvant || 0)) return true;
  if(CLES_FUSION.some(k => ghcEnAvance(T[k], r[k]))) return true;
  /* les seuils de l'oracle, et le lieu d'une séance, qui ont leur propre date */
  if(((T.oracle || {}).maj || 0) > ((r.oracle || {}).maj || 0)) return true;
  if(Object.keys(T.journal || {}).some(id => (T.journal[id].majLieu || 0) > (((r.journal || {})[id] || {}).majLieu || 0))) return true;
  /* un coup ici que le dépôt n'a pas encore, ou qu'on a défait ici */
  const coups = k => Object.keys(T[k] || {}).some(id => {
    const a = T[k][id], b = (r[k] || {})[id];
    return !!a && Object.keys(a.vie || {}).some(e => !b || !b.vie || !b.vie[e] || (a.vie[e].x && !b.vie[e].x));
  });
  if(['personnages','pnj','adversaires'].some(coups)) return true;
  const vus = {};
  (r.jets || []).forEach(j => { vus[j.id] = 1; });
  return (T.jets || []).some(j => !vus[j.id]);
}

const ghBloque = ghcBloque;
function ghLire(force){ return GH.lire(force); }
function ghEcrire(){ return GH.ecrire(); }
function ghPlanifier(){ if(SYNC.etat === 'github') GH.planifier(); }

/* la table passe par GitHub : le fichier partagé, s'il y en avait un, est lâché */
function ghTableDemarrer(){
  if(SYNC.poignee){
    SYNC.poignee = null; SYNC.vu = 0;
    if(SYNC.boucle){ clearInterval(SYNC.boucle); SYNC.boucle = null; }
    oublierPoignee();
  }
  SYNC.etat = 'github'; SYNC.nom = GHC.depot; SYNC.erreur = '';
  return GH.demarrer();
}
function ghTableArreter(){
  GH.arreter();
  if(SYNC.etat === 'github'){ SYNC.etat = 'local'; SYNC.nom = ''; SYNC.erreur = ''; }
}
/* après « Relier » : on lit la table du dépôt, et on y écrit tout de suite si elle y manque ou si on a du neuf */
function ghTableRelier(r){
  return ghTableDemarrer().then(() => {
    if(!GH.actif || GH.erreur) return {ok:false, msg:GH.erreur || 'La table du dépôt n’a pas pu être lue.'};
    const suite = GH.prevu ? GH.ecrire() : Promise.resolve(true);
    return suite.then(ok => {
      if(!ok && GH.erreur) return {ok:false, msg:GH.erreur};
      dessiner();
      return {ok:true, prive:r.prive, msg:r.prive === false ? r.msg : 'Relié à ' + GHC.depot + '. La table y part toute seule, les personnages et le bestiaire aussi.'};
    });
  });
}
function ghDetacher(silence){
  ghcDetacher();
  ghTableArreter();
  if(PANNEAU) PANNEAU.dessiner();
  if(!silence) dessiner();
}
function ghOublier(){
  ghcOublier();
  ghTableArreter();
  if(PANNEAU) PANNEAU.dessiner();
  dessiner();
}
/* au démarrage : la sauvegarde en ligne reliée dans ce navigateur, sur n'importe quelle page du site */
function ghReprendre(){
  ghcCharger();
  if(!ghcPret()) return false;
  return ghTableDemarrer().then(() => true, () => true);
}
