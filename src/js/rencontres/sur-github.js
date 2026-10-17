/* ============ le bestiaire sur GitHub ============
   Le bestiaire sait déjà parler à un stockage partagé : des collections, des documents qu'on pose
   ou qu'on retire. Ici, le même langage, avec bestiaire.json au bout, dans le dépôt de la sauvegarde
   en ligne. Chaque créature et chaque famille y porte sa date ; celle qu'on supprime y laisse une
   trace, pour ne pas revenir d'un autre appareil. Une pose n'est tenue pour faite qu'une fois
   écrite dans le dépôt : jusque-là, ce navigateur la garde en attente. */

let PANNEAU_BST = null;

function ghBestiaire(){
  const COLS = ['creatures','familles','butins'];
  const CHAMP = {creatures:'id', familles:'k', butins:'k'};
  const miroir = {creatures:{}, familles:{}, butins:{}};      /* le fichier, avec nos poses pas encore parties */
  let confirme = {creatures:{}, familles:{}, butins:{}};      /* ce que le dépôt a vraiment, lu ou écrit */
  let ecritEnCours = null;
  const ecoutes = {creatures:[], familles:[], butins:[]};
  let enVol = [], partis = [];
  const copie = x => JSON.parse(JSON.stringify(x));
  /* le fichier range ses pièces par identifiant ; une sauvegarde .json déposée là, en listes, se lit aussi */
  const lire = o => {
    const out = {creatures:{}, familles:{}, butins:{}};
    COLS.forEach(c => {
      let m = o && o[c] && typeof o[c] === 'object' ? o[c] : {};
      if(Array.isArray(m)){ const t = {}; m.forEach(x => { if(x && typeof x === 'object' && typeof x[CHAMP[c]] === 'string') t[x[CHAMP[c]]] = x; }); m = t; }
      Object.keys(m).forEach(id => {
        const x = m[id];
        if(!CLE_OK.test(id) || !x || typeof x !== 'object') return;
        const y = Object.assign({}, x, {maj:+x.maj || 0});
        delete y[CHAMP[c]];
        out[c][id] = y;
      });
    });
    return out;
  };
  /* le bestiaire ne voit que ce que le dépôt a vraiment : une pose pas encore écrite n'y figure pas,
     et reste donc en attente dans ce navigateur */
  const servir = c => {
    const docs = Object.keys(confirme[c]).filter(id => !confirme[c][id].supprime).map(id => {
      const x = confirme[c][id];
      return {id:id, exists:true, data:() => copie(x)};
    });
    ecoutes[c].forEach(l => { try{ l.ok({docs:docs}); }catch(e){} });
  };
  const doc = ghcDoc({
    nom:'Bestiaire', quoi:'un bestiaire Faelorenn', format:'faelorenn-bestiaire',
    chemin: GHC_FICHIERS.bestiaire,
    recevoir: o => {
      const r = lire(o);
      confirme = copie(r);
      COLS.forEach(c => Object.keys(r[c]).forEach(id => {
        const x = r[c][id], y = miroir[c][id];
        if(!y || x.maj > (+y.maj || 0)) miroir[c][id] = x;
      }));
      doc.servi = true;
      COLS.forEach(servir);
    },
    /* pas de fichier (premier usage, ou fichier disparu) : tout ce qu'on a ici y part,
       rien ne s'efface ici parce qu'il n'y est pas */
    absent: () => {
      confirme = {creatures:{}, familles:{}, butins:{}};
      Object.keys(MAGS).forEach(n => { const m = MAGS[n]; m.attente = m.get().map(x => x[m.champ]); ecrireMag(m); });
      doc.servi = true;
      COLS.forEach(servir);
    },
    enAvance: o => { const r = lire(o); return COLS.some(c => ghcEnAvance(miroir[c], r[c])); },
    contenu: () => {
      partis = partis.concat(enVol); enVol = [];
      ecritEnCours = copie({creatures:miroir.creatures, familles:miroir.familles, butins:miroir.butins});
      return {format:'faelorenn-bestiaire', version:3, creatures:miroir.creatures, familles:miroir.familles, butins:miroir.butins};
    },
    ecrit: (ok, rien) => {
      if(ok){
        if(!rien && ecritEnCours) confirme = ecritEnCours;
        ecritEnCours = null;
        const l = rien ? partis.concat(enVol) : partis;
        partis = []; if(rien) enVol = [];
        l.forEach(f => f());
      }
      else { ecritEnCours = null; enVol = partis.concat(enVol); partis = []; }
    },
    /* le dépôt ne répond pas à l'ouverture : le bestiaire reste dans ce navigateur pour cette fois */
    rate: d => {
      if(doc.servi) return;
      d.arreter(true);
      COLS.forEach(c => ecoutes[c].forEach(l => { try{ l.ko({code:'unavailable'}); }catch(e){} }));
    },
    etat: () => { drawEtat(); if(PANNEAU_BST) PANNEAU_BST.dessiner(); }
  });
  const attendre = () => new Promise(ok => { enVol.push(ok); doc.planifier(); });
  const db = {collection: c => ({
    onSnapshot: (ok, ko) => {
      ecoutes[c].push({ok:ok, ko:ko || function(){}});
      if(doc.servi) setTimeout(() => servir(c), 0);
      return function(){};
    },
    doc: id => ({
      set: data => {
        const y = miroir[c][id], maj = +data.maj || Date.now();
        /* le dépôt a plus récent (une retouche ou une suppression faite ailleurs, après) : il l'emporte */
        if(y && (+y.maj || 0) > maj){ setTimeout(() => servir(c), 0); return Promise.resolve(); }
        miroir[c][id] = Object.assign(JSON.parse(JSON.stringify(data)), {maj:maj});
        return attendre();
      },
      delete: t => {
        const y = miroir[c][id], z = confirme[c][id], maj = +t || Date.now();
        /* déjà supprimée dans le dépôt, ou jamais arrivée jusque-là */
        if((z && z.supprime && (+z.maj || 0) >= maj) || (!z && !y)) return Promise.resolve();
        /* retouchée ailleurs après la suppression : la retouche l'emporte */
        if(y && !y.supprime && (+y.maj || 0) > maj){ setTimeout(() => servir(c), 0); return Promise.resolve(); }
        /* sa suppression attend déjà la prochaine écriture : on l'attend avec elle */
        if(!(y && y.supprime && (+y.maj || 0) >= maj)) miroir[c][id] = {supprime:true, maj:maj};
        return attendre();
      }
    })
  })};
  doc.demarrer();
  return {db:db, doc:doc};
}

/* relier, détacher : le bestiaire repart du bon pied, sans recharger la page */
function relancerStockage(){
  if(BST.gh){ BST.gh.doc.arreter(); BST.gh = null; }
  BST.db = null; BST.mode = 'local'; BST.pret = false; BST.erreur = ''; BST.ghErreur = ''; BST.source = '';
  Object.keys(MAGS).forEach(n => { MAGS[n].pret = false; });
  demarrerStockage();
  draw();
}
/* « Sauvegarder en ligne » : le bestiaire part tout de suite dans le dépôt */
function sauverBestiaireEnLigne(){
  const b = $('bestEnLigne'), m = $('bestMsg');
  const dire = (t, ok) => {
    m.textContent = t; m.hidden = false; m.className = ok ? 'note ok' : 'note err';
    clearTimeout(sauverBestiaireEnLigne.t); sauverBestiaireEnLigne.t = setTimeout(() => { m.hidden = true; }, 12000);
  };
  if(!ghcPret()){
    dire('Relie d’abord ton dépôt GitHub, une seule fois : c’est le panneau « Sauvegarde en ligne », juste en dessous. Ensuite, chaque changement part tout seul.', false);
    ghcOuvrirPanneau();
    return;
  }
  const d = BST.source === 'github' && BST.gh ? BST.gh.doc : null;
  /* le dépôt n'avait pas répondu à l'ouverture : on refrappe à la porte, ce qui attend ici part avec */
  if(!d || !d.actif){
    relancerStockage();
    dire('Nouvel essai avec le dépôt : ce qui attend ici y part dès qu’il répond. L’état s’affiche en haut du bestiaire.', true);
    return;
  }
  b.disabled = true; b.textContent = 'Sauvegarde…';
  d.maintenant().then(r => {
    b.disabled = false; b.textContent = 'Sauvegarder en ligne';
    dire(ghcPhraseSauvegarde(r, 'Le bestiaire'), r.ok);
    drawEtat();
  });
}
function brancherEnLigne(){
  $('bestEnLigne').onclick = sauverBestiaireEnLigne;
  PANNEAU_BST = ghcPanneau($('ghcPlace'), {
    etat: () => {
      const d = BST.source === 'github' && BST.gh ? BST.gh.doc : null;
      if(!d) return BST.source === 'github' && BST.ghErreur ? {nom:'Le bestiaire', erreur:BST.ghErreur} : null;
      return {nom:'Le bestiaire', texte: d.actif ? 'dernier échange ' + ghcIlYA(d.dernier) : 'à l’arrêt', erreur:d.erreur};
    },
    apresRelier: r => { relancerStockage(); return r; },
    apresDetacher: () => relancerStockage()
  });
  ghcSurveiller(() => {
    if(ghcPret() || BST.source === 'github') relancerStockage();
    PANNEAU_BST.dessiner();
  });
}
