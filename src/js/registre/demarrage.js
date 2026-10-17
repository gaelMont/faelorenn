/* ============ la barre de table, les pages, et le démarrage ============
   Le Registre de la Table, celui des Visages, celui des Marchefleurs et celui des Missions partagent ce code et
   le même fichier : la page ouverte se reconnaît à ce qu'elle contient. */

const PAGE = $('ficheBox') ? 'fiche' : $('secSeance') ? 'table' : $('progBox') ? 'progression' : $('misBox') ? 'missions' : $('tabBox') ? 'tirages' : 'visages';
let PANNEAU = null;   /* le panneau de la sauvegarde en ligne */
/* l'onglet se nomme : « Faire parler » ou une fiche ouverte depuis l'autre page viennent ici, sans ouvrir d'onglet de plus */
try{ window.name = PAGE === 'table' ? ONGLET_TABLE : PAGE === 'fiche' ? ONGLET_FICHE : PAGE === 'progression' ? ONGLET_PROGRESSION : PAGE === 'missions' ? ONGLET_MISSIONS : ONGLET_VISAGES; }catch(e){}

function msgTable(txt, ok){
  const m = $('tbMsg'); if(!m) return;
  m.textContent = txt;
  m.className = 'note toast ' + (ok ? 'ok' : 'err');
  m.hidden = false;
  clearTimeout(msgTable.t);
  msgTable.t = setTimeout(() => { m.hidden = true; }, ok ? 6000 : 9000);
}
function ilYA(t){
  if(!t) return 'jamais';
  const s = Math.round((maintenant() - t) / 1000);
  if(s < 5) return 'à l’instant';
  if(s < 60) return 'il y a ' + s + ' secondes';
  const m = Math.round(s / 60);
  return m < 60 ? 'il y a ' + m + ' minute' + (m > 1 ? 's' : '') : 'il y a plus d’une heure';
}
function dessinerTable(){
  const j = $('tbJoueur'); if(j && document.activeElement !== j) j.value = MOI.joueur;
  dessinerCampagnes();

  const p = $('tbPastille'), e = $('tbEtat');
  const attache = !!SYNC.poignee && SYNC.etat === 'fichier';
  const gh = SYNC.etat === 'github';
  if(p) p.className = 'pastille' + ((attache || gh) && !SYNC.erreur ? ' on' : SYNC.etat === 'attente' || SYNC.erreur ? ' off' : '');
  if(e){
    if(gh) e.textContent = 'GitHub · ' + SYNC.nom + ' · dernier échange ' + ilYA(SYNC.dernier);
    else if(attache) e.textContent = 'Fichier « ' + SYNC.nom + ' » · dernier échange ' + ilYA(SYNC.dernier);
    else if(SYNC.etat === 'attente') e.textContent = 'Le fichier « ' + SYNC.nom + ' » attend ton feu vert.';
    else e.textContent = 'Enregistré dans ce navigateur seulement.';
    if(SYNC.erreur) e.textContent += ' ' + SYNC.erreur;
  }

  /* avec GitHub, le fichier partagé n'a plus de raison d'être ; le Registre des Visages ne sait que le reconnecter */
  const o = $('tbOuvrir');
  if(o){
    o.hidden = gh || (PAGE !== 'table' && SYNC.etat !== 'attente');
    o.textContent = SYNC.etat === 'attente' ? 'Reconnecter le fichier' : 'Ouvrir le fichier de table';
  }
  if($('tbCreer')) $('tbCreer').hidden = gh;
  if($('tbDetacher')) $('tbDetacher').hidden = !SYNC.poignee || gh;

  const aide = $('tbAide');
  if(aide){
    if(gh) aide.textContent = 'La table passe par la sauvegarde en ligne : chaque changement part dans le dépôt, et ceux qui y sont reliés le reçoivent en quelques secondes.';
    else if(!FSA()) aide.textContent = 'Ce navigateur ne sait pas ouvrir un fichier partagé : passe par la sauvegarde en ligne, ou échangez le .json. Depuis la page en ligne, le fichier partagé est bloqué de toute façon.';
    else aide.textContent = 'Pose le fichier de table dans un dossier synchronisé, Drive, OneDrive ou Dropbox, et que chacun l’ouvre ici. Les changements passent d’un joueur à l’autre en quelques secondes. Sinon, échangez le .json à la main.';
  }
  if(PANNEAU) PANNEAU.dessiner();
}

function dessiner(){
  dessinerTable();
  /* le sac et la bourse d'avant passent dans le sac en piles, sur toutes les pages : la table en a besoin aussi */
  planifierMigration();
  if(PAGE === 'fiche'){
    dessinerFiche(false);
  } else if(PAGE === 'table'){
    dessinerSeance(false);
    dessinerHub();
    dessinerCarte(false);
    dessinerPersos();
    if(HAVRE.ouvert) dessinerHavre();
    dessinerJets();
  } else if(PAGE === 'progression'){
    dessinerProg();
  } else if(PAGE === 'missions'){
    dessinerMissions(false);
  } else if(PAGE === 'tirages'){
    dessinerTables(false);
  } else {
    dessinerPnj(false);
    dessinerPjVisages();
    dessinerGrand(false);
  }
}

/* ---------- les boutons ---------- */
const sur = (id, fn) => { const x = $(id); if(x) x.onclick = fn; };
if($('tbJoueur')) $('tbJoueur').oninput = e => { MOI.joueur = e.target.value; sauverLocal(); };
if($('tbCampagne')) $('tbCampagne').onchange = e => { choisirCampagne(e.target.value); e.target.blur(); };
sur('tbOuvrir', () => {
  if(SYNC.etat === 'attente'){ redemander(); return; }
  if(!FSA()){ msgTable('Ce navigateur ne propose pas le fichier partagé.', false); return; }
  window.showOpenFilePicker({types:[{description:'Table Faelorenn', accept:{'application/json':['.json']}}]})
    .then(h => attacher(h[0]).then(() => msgTable('Table reliée au fichier.', true)))
    .catch(err => { if(err && err.name !== 'AbortError') msgTable('Le fichier n’a pas pu être ouvert.', false); });
});
sur('tbCreer', () => {
  if(!FSA()){ msgTable('Ce navigateur ne propose pas le fichier partagé.', false); return; }
  window.showSaveFilePicker({suggestedName:'table-faelorenn.json', types:[{description:'Table Faelorenn', accept:{'application/json':['.json']}}]})
    .then(h => attacher(h).then(() => msgTable('Fichier de table créé. Donne-le à ta table, ou pose-le dans le dossier partagé.', true)))
    .catch(err => { if(err && err.name !== 'AbortError') msgTable('Le fichier n’a pas pu être créé.', false); });
});
sur('tbDetacher', detacher);
sur('tbJson', e => telecharger('table-faelorenn.json', tableJson(), 'application/json', e.currentTarget));
sur('tbImport', () => $('tbFichier').click());
if($('tbFichier')) $('tbFichier').onchange = e => {
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const l = new FileReader();
  l.onload = () => { const r = importerTable(String(l.result)); msgTable(r.msg, r.ok); e.target.value = ''; };
  l.readAsText(f);
};
sur('tbMsg', () => { $('tbMsg').hidden = true; });

if(PAGE === 'table'){
  sur('pImporter', () => $('pFichier').click());
  $('pFichier').onchange = e => {
    const fs = e.target.files ? [].slice.call(e.target.files) : [];
    fs.forEach(f => {
      const l = new FileReader();
      l.onload = () => { const r = importerTable(String(l.result)); msgTable(r.msg, r.ok); };
      l.readAsText(f);
    });
    e.target.value = '';
  };
  sur('pNouveau', () => ouvrirEditeurPerso(videPerso(), true));
  brancherHavre();

  /* la séance ; le paragraphe en cours de frappe est gardé dans ce navigateur, un rechargement ne le perd pas */
  const CLE_BROUILLON = 'faelorenn.table.brouillon';
  try{ const b = localStorage.getItem(CLE_BROUILLON); if(b) $('coTexte').value = b; }catch(e){}
  let brouillonT = null;
  const garderBrouillon = () => { clearTimeout(brouillonT); brouillonT = setTimeout(() => { try{ localStorage.setItem(CLE_BROUILLON, $('coTexte').value); }catch(e){} }, 300); };
  $('coTexte').oninput = () => { majApercuCompo(); garderBrouillon(); };
  $('coTexte').addEventListener('change', garderBrouillon);
  window.addEventListener('pagehide', () => { try{ localStorage.setItem(CLE_BROUILLON, $('coTexte').value); }catch(e){} });
  brancherMentions($('coTexte'));
  $('coTexte').onkeydown = ev => {
    if(ev.key !== 'Enter' || ev.isComposing || mentionOuverte($('coTexte'))) return;
    if(ev.ctrlKey || ev.metaKey){ ev.preventDefault(); ajouterDepuisCompo(); return; }
    if(!ev.shiftKey && COMPO.genre !== 'encadre'){ ev.preventDefault(); ajouterDepuisCompo(); }
  };

  sur('coAjouter', ajouterDepuisCompo);

  /* l'historique des jets */
  let VIDER_ARME = false;
  $('jFiltre').onchange = dessinerJets;
  $('jVider').onclick = e => {
    const b = e.currentTarget;
    if(!VIDER_ARME){
      VIDER_ARME = true; b.textContent = 'Confirmer : ' + (plusieursCampagnes() ? 'l’historique de « ' + nomCampagne(idCourante()) + ' » part' : 'tout l’historique part'); b.classList.add('danger');
      setTimeout(() => { VIDER_ARME = false; b.textContent = 'Vider l’historique'; b.classList.remove('danger'); }, 5000);
      return;
    }
    VIDER_ARME = false; b.textContent = 'Vider l’historique'; b.classList.remove('danger');
    changer(() => viderJets());
  };
} else if(PAGE === 'visages'){
  /* les PNJ */
  sur('pnjVueFiches', () => { MOI.vuePnj = 'fiches'; sauverLocal(); dessinerPnj(true); });
  sur('pnjVueReseau', () => { MOI.vuePnj = 'reseau'; sauverLocal(); dessinerPnj(true); });
  sur('pnjVueHistoire', () => { MOI.vuePnj = 'histoire'; sauverLocal(); dessinerPnj(true); });
  sur('pnjVueLieux', () => { MOI.vuePnj = 'lieux'; sauverLocal(); dessinerPnj(true); });
  sur('pnjNouveau', () => { if(vuePnj() === 'lieux'){ nouveauLieu(); return; } ouvrirEditeurPnj(null, true); });
  $('pnjCherche').oninput = e => {
    PNJ_FILTRE.q = e.target.value;
    if(MOI.vuePnj === 'reseau'){ MOI.vuePnj = 'fiches'; sauverLocal(); dessinerPnj(true); }
    else if(MOI.vuePnj === 'lieux') dessinerLieux(true);
    else if(MOI.vuePnj === 'histoire') dessinerHistoire(true);
    else dessinerListePnj(true);
  };
  $('pnjGroupe').onchange = e => { PNJ_FILTRE.groupe = e.target.value; dessinerListePnj(true); };
} else if(PAGE === 'missions'){
  /* le tableau du Havre */
  const vue = v => () => { MIS.vue = v; MIS.arme = {}; dessinerMissions(true); };
  sur('misVueTableau', vue('tableau'));
  sur('misVueCours', vue('cours'));
  sur('misVueFinies', vue('finies'));
  sur('misNouvelle', () => ouvrirEditeurMission(null, true));
  sur('misTirer', tirerMission);
  /* les familles maison, pour la rencontre prévue : ce navigateur, puis le dépôt */
  poserBestiaire();
  window.addEventListener('storage', e => {
    if(e.key === 'faelorenn.bestiaire' || e.key === 'faelorenn.familles'){ poserBestiaire(); dessinerMissions(true); }
  });
}

/* la sauvegarde en ligne */
sur('tbEnLigne', () => {
  const b = $('tbEnLigne');
  if(!ghcPret() || SYNC.etat !== 'github'){
    msgTable('Relie d’abord ton dépôt GitHub, une seule fois : c’est le panneau « Sauvegarde en ligne », juste en dessous. Ensuite, chaque changement part tout seul.', false);
    ghcOuvrirPanneau();
    return;
  }
  if(!GH.actif){
    msgTable((GH.erreur || 'La sauvegarde en ligne est à l’arrêt.') + ' Relie de nouveau ton dépôt, juste en dessous.', false);
    ghcOuvrirPanneau();
    return;
  }
  b.disabled = true; b.textContent = 'Sauvegarde…';
  GH.maintenant().then(r => {
    b.disabled = false; b.textContent = 'Sauvegarder en ligne';
    msgTable(ghcPhraseSauvegarde(r, PAGE === 'table' ? 'La table' : PAGE === 'fiche' ? 'Les fiches, les sacs et les bourses' : PAGE === 'progression' ? 'La progression' : PAGE === 'missions' ? 'Les missions' : 'Les fiches et les liens'), r.ok);
    dessinerTable();
  });
});
function etatGithub(){
  if(!GH.actif && !GH.erreur) return null;
  return {nom:PAGE === 'table' ? 'La table' : PAGE === 'fiche' ? 'La table et ses fiches' : PAGE === 'progression' ? 'La table et la progression' : PAGE === 'missions' ? 'La table et ses missions' : 'La table et ses PNJ', texte: GH.actif ? 'dernier échange ' + ilYA(GH.dernier) : 'à l’arrêt', erreur:GH.erreur};
}
PANNEAU = ghcPanneau($('ghPlace'), {
  table:true,
  etat: etatGithub,
  apresRelier: r => ghTableRelier(r),
  apresDetacher: () => { ghTableArreter(); dessiner(); }
});
ghcSurveiller(() => {
  if(ghcPret()) ghTableDemarrer();
  else if(SYNC.etat === 'github') ghTableArreter();
  dessiner();
});

/* un autre onglet de ce navigateur a gardé la table : la table, ou le Registre des Visages. Ce qu'il n'a pas eu
   le temps d'envoyer part d'ici : l'écriture ne part que s'il y a du neuf pour le dépôt */
window.addEventListener('storage', e => {
  if(e.key === CLE_MOI && e.newValue){
    /* ce que le navigateur garde maintenant, pas l'instantané de l'événement : il peut arriver après notre propre écriture */
    try{ adopterMoi(JSON.parse(localStorage.getItem(CLE_MOI) || 'null')); MOI_VU = copie(MOI); }catch(x){}
    dessiner();
    return;
  }
  if(e.key !== CLE_TABLE || !e.newValue) return;
  let o = null;
  try{ o = JSON.parse(e.newValue); }catch(x){ return; }
  const avant = JSON.stringify(T);
  T = fusionner(T, normTable(o));
  if(JSON.stringify(T) === avant) return;
  dessiner();
  planifierEcriture();
});

/* ce qu'on vient chercher depuis l'autre page : faire parler un PNJ, retrouver un paragraphe, une fiche */
function suivreAncre(){
  let h = '';
  try{ h = decodeURIComponent(location.hash.slice(1)); }catch(e){ h = location.hash.slice(1); }
  if(!h) return;
  let fait = false;
  if(PAGE === 'table'){
    if(h.indexOf('parler=') === 0){
      const p = unPnj(h.slice(7));
      if(p){ composerPourPnj(p); fait = true; }
    } else if(h.indexOf('bloc=') === 0){
      const x = h.slice(5).split('~');
      if(T.journal[x[0]]){ allerAuBloc(x[0], x[1] || ''); fait = true; }
    } else if(h.indexOf('mission=') === 0){
      /* une mission lancée depuis le tableau du Havre : sa séance, et son récit */
      const m = uneMission(h.slice(8)), e = seanceCourante(), a = document.activeElement;
      const occupee = !!BED || !!(a && $('secSeance').contains(a) && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName));
      if(m && m.seance && T.journal[m.seance] && !T.journal[m.seance].supprime && (!e || e.id !== m.seance) && !occupee){ choisirSeance(m.seance); dessinerSeance(true); }   /* une autre campagne : choisirSeance la suit et redessine tout */
      $('secSeance').scrollIntoView({block:'start'});
      fait = true;
    }
  } else if(PAGE === 'fiche'){
    /* « Sa fiche », depuis la carte d'un personnage : pj=ID, et parfois l'onglet (vue=progression) */
    if(h === 'monde'){ $('secMonde').scrollIntoView({block:'start'}); fait = true; }
    else {
      const q = {};
      h.split('&').forEach(x => { const i = x.indexOf('='); if(i > 0) q[x.slice(0, i)] = x.slice(i + 1); });
      if(q.vue && VUES_FICHE.some(v => v.k === q.vue)){ FICHE.vue = q.vue; fait = true; }
      if(q.pj){
        /* pas encore là : la table du dépôt n'est peut-être pas encore lue, il sera choisi à son arrivée */
        const x = persoActif(q.pj);
        /* à la table d'une autre campagne : on la suit */
        if(x && !dansCampagne(x)){ passerACampagne(idCampagneDe(x)); sauverLocal(); dessiner(); }
        if(perso(q.pj)) FICHE.perso = q.pj; else FICHE.attendu = q.pj;
        fait = true;
      }
      if(fait){ FICHE.ed = ''; FICHE.don = ''; FICHE.arme = {}; garderChoixFiche(); dessinerFiche(true); $('secFiche').scrollIntoView({block:'start'}); }
    }
  } else if(PAGE === 'progression'){
    /* « Sa progression », depuis la carte d'un personnage */
    if(h.indexOf('pj=') === 0 && perso(h.slice(3))){ PROG_PERSO = h.slice(3); dessinerProg(true); fait = true; }
  } else if(PAGE === 'missions'){
    /* « au tableau », depuis la mission sous la main à la table */
    if(h.indexOf('m=') === 0 && uneMission(h.slice(2))){
      const m = uneMission(h.slice(2));
      MIS.lire = m.id; MIS.vue = m.etat === 'tableau' ? 'tableau' : m.etat === 'cours' ? 'cours' : 'finies';
      dessinerMissions(true);
      $('misLire').scrollIntoView({block:'start'});
      fait = true;
    }
  } else {
    if(h === 'nouveau'){ ouvrirEditeurPnj(null, true); fait = true; }
    /* un nom cité, ailleurs : sa fiche en grand */
    else if(h.indexOf('grand=') === 0){ if(quiRef(h.slice(6))){ ouvrirGrand(h.slice(6)); fait = true; } }
    else if(h.indexOf('lieu=') === 0){ if(unLieu(h.slice(5))){ ouvrirFicheLieu(h.slice(5)); fait = true; } }
    else if(h.indexOf('pj-') === 0){
      const c = document.querySelector('[data-pj="' + h.slice(3) + '"]');
      if(c){ c.scrollIntoView({block:'start'}); c.classList.add('eclaire'); setTimeout(() => c.classList.remove('eclaire'), 2400); fait = true; }
    } else if(unPnj(h)){
      MOI.vuePnj = 'fiches'; PNJ_OUVERTS[h] = true; PNJ_FILTRE.q = ''; PNJ_FILTRE.groupe = '';
      if($('pnjCherche')) $('pnjCherche').value = '';
      dessinerPnj(true);
      const c = document.querySelector('[data-pnj="' + h + '"]');
      if(c){ c.scrollIntoView({block:'start'}); c.classList.add('eclaire'); setTimeout(() => c.classList.remove('eclaire'), 2400); }
      fait = true;
    }
  }
  if(fait) try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
}
window.addEventListener('hashchange', suivreAncre);

/* ---------- démarrage ---------- */
chargerLocal();
if(PAGE === 'table'){ batirHub(); brancherBarre(); }
if(PAGE === 'fiche') lireChoixFiche();   /* le personnage et l'onglet de la dernière fois, dans ce navigateur */
const parGithub = ghReprendre();
dessiner();
/* le sac et la bourse d'avant attendent la première lecture de la table partagée (inventaire.js) */
if(!parGithub){ const fait = () => { DEPART_FAIT = true; planifierMigration(); }; reprendreFichier().then(fait, fait); }
else DEPART_FAIT = true;
/* une rencontre qui attend : on la pose après la première lecture du dépôt, dans la séance la plus récente */
if(PAGE === 'missions') chargerBestiaire();   /* les familles maison du dépôt, pour la rencontre prévue */
if(PAGE === 'table'){
  demarrerTirage();   /* le tirage des rencontres, avec ton bestiaire */
  const entrees = () => { lireEnvoi(); if($('seCarte')) lireEnvoiCarte(); };
  if(parGithub){ let fait = false; const go = () => { if(!fait){ fait = true; entrees(); } }; parGithub.then(go, go); setTimeout(go, 6000); }
  else entrees();
}
setTimeout(suivreAncre, 60);
setInterval(() => { if(SYNC.poignee || SYNC.etat === 'github') dessinerTable(); }, 10000);
document.addEventListener('visibilitychange', () => {
  if(!document.hidden && SYNC.poignee && SYNC.etat === 'fichier') lireFichier(false);
});
/* ce que le Registre des Compétences retouche : relu dans le dépôt, avec un avis s'il y a du neuf */
regSurveiller();
