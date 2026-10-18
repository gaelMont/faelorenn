/* ============ tes personnages : une liste gardée ici, et dans le dépôt quand la sauvegarde en ligne est reliée ============
   Un personnage enregistré suit tes changements tout seul. Chacun porte sa date : le plus récent gagne,
   et celui qu'on supprime laisse une trace dans le fichier, pour ne pas revenir d'un autre appareil. */

const CLE_MIENS = 'faelorenn.personnages';
let MIENS = {};
const MIENS_UI = {aSupprimer:null, t:null, msg:null, base:null};
let PANNEAU_MIENS = null;

function normMien(x, id){
  if(!x || typeof x !== 'object') return null;
  const r = {id:id, maj:+x.maj || 0};
  if(x.supprime){ r.supprime = true; return r; }
  r.nom = String(x.nom == null ? '' : x.nom);
  r.peuple = String(x.peuple == null ? '' : x.peuple);
  r.voie = String(x.voie == null ? '' : x.voie);
  r.auteur = String(x.auteur == null ? '' : x.auteur);
  r.s = x.s && typeof x.s === 'object' && !Array.isArray(x.s) ? x.s : {};
  if(x.fiche && typeof x.fiche === 'object') r.fiche = x.fiche;
  return r;
}
function normMiens(o){
  const m = {};
  const src = o && o.personnages && typeof o.personnages === 'object' ? o.personnages : {};
  Object.keys(src).forEach(id => {
    if(!/^[\w.-]{1,80}$/.test(id)) return;
    const r = normMien(src[id], id);
    if(r) m[id] = r;
  });
  return m;
}
const miensFichier = () => ({format:'faelorenn-personnages', version:1, personnages:MIENS});
function chargerMiens(){
  try{ MIENS = normMiens(JSON.parse(localStorage.getItem(CLE_MIENS) || 'null')); }catch(e){ MIENS = {}; }
}
/* un autre onglet a pu garder sa liste entre-temps : on la fond avant d'écrire la nôtre */
function garderMiens(){
  try{
    const r = localStorage.getItem(CLE_MIENS);
    if(r) fondreMiens(normMiens(JSON.parse(r)));
    localStorage.setItem(CLE_MIENS, JSON.stringify(miensFichier()));
  }catch(e){}
}
/* le plus récent l'emporte, pièce par pièce ; renvoie vrai si quelque chose a bougé ici */
function fondreMiens(autres){
  let change = false;
  Object.keys(autres).forEach(id => {
    const x = autres[id], y = MIENS[id];
    if(!y || (x.maj || 0) > (y.maj || 0)){ MIENS[id] = x; change = true; }
  });
  return change;
}
/* en ligne, « tes personnages » sont les tiens : ceux des autres joueurs ne se retouchent pas ici
   (ils vont à la table par le Registre de la Table). Un personnage pas encore parti n'a pas de trace en ligne : il est à toi */
const estMien = r => {
  if(typeof mondeActif !== 'function' || !mondeActif()) return true;
  const o = mondeOmbre('havre', r.id);
  return !o || o.proprietaire === COMPTE.uid;
};
const miensVivants = () => Object.keys(MIENS).map(k => MIENS[k]).filter(r => !r.supprime && estMien(r)).sort((a, b) => (b.maj || 0) - (a.maj || 0));

function slugMien(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'perso'; }
function copieS(){
  const c = JSON.parse(JSON.stringify(S)); delete c.id;
  if(!gardeesNettoyees(c.gardees).length) delete c.gardees;
  return c;
}
/* ce qu'était la fiche ouverte quand on l'a ouverte, ou la dernière fois qu'on l'a écrite : seul un vrai changement la réécrit.
   Un créateur dont le Registre des Compétences est plus ancien ou plus récent que celui qui a écrit la fiche la remet en ordre à
   l'ouverture ; ce n'est pas un changement, et la date de la fiche ne bouge pas pour si peu */
function noterOuverte(){ MIENS_UI.base = ghcCanon(copieS()); }
function ficheMien(){ try{ const f = personneJson(); delete f.exporte; return f; }catch(e){ return null; } }
function aDuContenu(){ return !!(S.nom || '').trim() || carSpent() > 0 || skSpent() > 0 || (S.prat || []).length > 0; }

/* le personnage ouvert passe dans sa fiche enregistrée */
function ecrireMien(id){
  const avant = MIENS[id];
  const r = {id:id, maj:Date.now(), nom:S.nom || '', peuple:S.peuple, voie:S.voie,
    auteur:(avant && !avant.supprime && avant.auteur) || ghcJoueur(), s:copieS()};
  const f = ficheMien(); if(f) r.fiche = f;
  MIENS[id] = r;
  garderMiens();
  noterOuverte();
  DOC_MIENS.planifier();
}
/* appelé à chaque enregistrement de la fiche : si elle est suivie, son double suit */
function suivreMien(){
  if(!S.id) return;
  /* tant que le dépôt n'a pas été lu, on ne date rien : une version plus récente y attend peut-être */
  if(DOC_MIENS.actif && !DOC_MIENS.lu){ MIENS_UI.differe = true; return; }
  const r = MIENS[S.id];
  if(r && r.supprime){ viderPourNeuf(); setTimeout(() => { draw(); dessinerMiens(); }, 0); return; }
  if(!r){ S.id = ''; dessinerMiensBientot(); return; }
  if(ghcCanon(copieS()) === (MIENS_UI.base != null ? MIENS_UI.base : ghcCanon(r.s))) return;
  ecrireMien(S.id);
  dessinerMiensBientot();
}
function dessinerMiensBientot(){ clearTimeout(dessinerMiensBientot.t); dessinerMiensBientot.t = setTimeout(dessinerMiens, 60); }

function viderS(){
  S.nom = ''; S.prat = []; S.sub = {}; S.humCar = []; S.skChoice = ''; S.banComp = '';
  delete S.gardees;
  S.sk = {};
  CARS.forEach(c => S.car[c] = 0); ALLSKILLS.forEach(o => S.sk[o.s] = 0);
}
/* une fiche vierge, peuple et Voie compris */
function viderPourNeuf(){ S.id = ''; viderS(); S.peuple = 'Humains'; S.voie = 'Éclaireur'; }
const nouvelIdMien = nom => 'c-' + slugMien(nom) + '-' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
/* l'ancien personnage d'exemple (Toum'Balin), jamais retouché : rien à garder */
function exempleIntact(){
  if(String(S.nom || '').replace(/[’‘]/g, "'") !== "Toum'Balin" || S.peuple !== "Ori'Ican" || S.voie !== 'Chasseur') return false;
  const car = {Force:7, 'Dextérité':7, Constitution:7}, sk = {Combat:40, Tir:40, Intimidation:20};
  return CARS.every(c => (+S.car[c] || 0) === (car[c] || 0)) && ALLSKILLS.every(o => (+S.sk[o.s] || 0) === (sk[o.s] || 0));
}
/* à l'ouverture, toujours une fiche vierge. Ce qui était ouvert la dernière fois est dans tes personnages :
   s'il n'y était pas encore, il y entre ; l'ancien exemple jamais retouché, et un personnage supprimé, s'en vont */
function ouvrirVierge(brut){
  let range = '';
  const r = S.id ? MIENS[S.id] : null;
  if(r && r.supprime){ /* supprimé : il ne revient pas */ }
  /* brut : la fiche telle que ce navigateur l'avait gardée, avant qu'on la remette en ordre. Remise en ordre, elle peut différer de
     l'enregistrée sans que personne y ait touché (le Registre des Compétences a changé) : cela ne la réécrit pas */
  else if(r){ if((brut != null ? brut : ghcCanon(copieS())) !== ghcCanon(r.s)) ecrireMien(S.id); }
  else if(aDuContenu() && !exempleIntact()){
    if(!S.id) S.id = nouvelIdMien(S.nom);
    ecrireMien(S.id);
    range = S.nom || 'Sans nom';
  }
  viderPourNeuf();
  save();
  return range;
}
function chargerDansS(r){
  const s = JSON.parse(JSON.stringify(r.s || {}));
  viderS();
  S.peuple = 'Humains'; S.voie = 'Éclaireur';
  ['nom','peuple','voie','skChoice','banComp'].forEach(k => { if(typeof s[k] === 'string') S[k] = s[k]; });
  if(s.car && typeof s.car === 'object') CARS.forEach(c => { if(isFinite(+s.car[c])) S.car[c] = +s.car[c]; });
  /* les points d'une compétence que le Registre des Compétences a retirée restent gardés avec la fiche : elle les retrouve si la compétence revient */
  if(s.sk && typeof s.sk === 'object' && !Array.isArray(s.sk)) Object.keys(s.sk).slice(0, 80).forEach(k => { if(k !== '__proto__' && k.length < 80 && isFinite(+s.sk[k])) S.sk[k] = +s.sk[k]; });
  if(Array.isArray(s.prat)) S.prat = s.prat.filter(x => typeof x === 'string');
  /* les Pratiques que le créateur qui a écrit la fiche connaissait et que celui-ci ne connaît pas, mises de côté avec elle */
  const gd = gardeesNettoyees(s.gardees);
  if(gd.length) S.gardees = {prat:gd};
  if(Array.isArray(s.humCar)) S.humCar = s.humCar.filter(x => typeof x === 'string');
  if(s.sub && typeof s.sub === 'object' && !Array.isArray(s.sub)) S.sub = s.sub;
  S.id = r.id;
  remettreEnOrdre();
  noterOuverte();
}

function direMien(t, ok){
  const m = $('mienMsg');
  m.textContent = t; m.className = 'note mmsg' + (ok ? ' ok' : ' err'); m.hidden = false;
  clearTimeout(MIENS_UI.msg); MIENS_UI.msg = setTimeout(() => { m.hidden = true; }, 6000);
}
function garderCeMien(){
  if(!(S.nom || '').trim()){ direMien('Donne-lui un nom d’abord, en haut de « Qui tu es ».', false); $('nom').focus(); return; }
  const id = nouvelIdMien(S.nom);
  S.id = id;
  ecrireMien(id);
  save();
  dessinerMiens();
  direMien('« ' + S.nom + ' » est dans tes personnages. Chaque changement s’y reporte tout seul.', true);
}
function nouveauMien(){
  if(!S.id && aDuContenu() && !confirm('Ce personnage n’est pas enregistré : il sera perdu. Repartir de zéro ?')) return;
  S.id = '';
  viderS();
  draw();
  dessinerMiens();
  window.scrollTo({top:$('secMiens').offsetTop, behavior:'smooth'});
}
function ouvrirMien(id){
  const r = MIENS[id];
  if(!r || r.supprime) return;
  if(!S.id && aDuContenu() && !confirm('Le personnage ouvert n’est pas enregistré : il sera perdu. Ouvrir « ' + (r.nom || 'Sans nom') + ' » quand même ?')) return;
  chargerDansS(r);
  draw();
  dessinerMiens();
}
function supprimerMien(id){
  const r = MIENS[id];
  if(!r || r.supprime) return;
  MIENS[id] = {id:id, maj:Date.now(), supprime:true};
  garderMiens();
  DOC_MIENS.planifier();
  if(S.id === id){ S.id = ''; viderS(); draw(); }
  dessinerMiens();
  direMien('« ' + (r.nom || 'Sans nom') + ' » ne fait plus partie de tes personnages.', true);
}

function quandMien(t){
  if(!t) return '';
  const d = new Date(t), auj = new Date();
  const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  if(d.toDateString() === auj.toDateString()) return 'aujourd’hui à ' + hh;
  try{ return 'le ' + d.toLocaleDateString('fr-BE', {day:'numeric', month:'long'}) + (d.getFullYear() !== auj.getFullYear() ? ' ' + d.getFullYear() : ''); }
  catch(e){ return 'le ' + d.toLocaleDateString(); }
}
function dessinerMiens(){
  const liste = $('miensListe'); if(!liste) return;
  const v = miensVivants();
  liste.innerHTML = '';
  if(!v.length) liste.append(el('p', 'note mvide', 'Aucun personnage enregistré pour l’instant.'));
  v.forEach(r => {
    const ouvert = r.id === S.id;
    const row = el('div', 'mien' + (ouvert ? ' ouvert' : ''));
    const txt = el('div', 'mtxt');
    txt.append(el('span', 'mnom', r.nom || 'Sans nom'));
    const meta = [[r.peuple, r.voie].filter(Boolean).join(', '), quandMien(r.maj), r.auteur ? 'par ' + r.auteur : ''].filter(Boolean).join(' · ');
    txt.append(el('span', 'mmeta', meta));
    const acts = el('div', 'macts');
    if(ouvert) acts.append(el('span', 'mouvert', 'Ouvert ci-dessous'));
    else {
      const b = el('button', 'btn ghost sm', 'Ouvrir'); b.type = 'button';
      b.setAttribute('aria-label', 'Ouvrir ' + (r.nom || 'ce personnage'));
      b.onclick = () => ouvrirMien(r.id);
      acts.append(b);
    }
    const arme = MIENS_UI.aSupprimer === r.id;
    const d = el('button', 'btn ghost sm' + (arme ? ' danger' : ''), arme ? 'Confirmer : il disparaît' : 'Supprimer'); d.type = 'button';
    d.setAttribute('aria-label', arme ? 'Confirmer la suppression de ' + (r.nom || 'ce personnage') : 'Supprimer ' + (r.nom || 'ce personnage'));
    d.onclick = () => {
      if(MIENS_UI.aSupprimer === r.id){ MIENS_UI.aSupprimer = null; supprimerMien(r.id); return; }
      MIENS_UI.aSupprimer = r.id; dessinerMiens();
      clearTimeout(MIENS_UI.t); MIENS_UI.t = setTimeout(() => { MIENS_UI.aSupprimer = null; dessinerMiens(); }, 5000);
    };
    acts.append(d);
    row.append(txt, acts);
    liste.append(row);
  });
  const suivi = !!(S.id && MIENS[S.id] && !MIENS[S.id].supprime);
  const e = $('mienEtat');
  e.textContent = suivi
    ? '« ' + (S.nom || 'Sans nom') + ' » est enregistré : chaque changement s’y reporte' + (DOC_MIENS.actif ? ', et part dans le dépôt.' : ', dans ce navigateur.')
    : 'Le personnage ouvert n’est gardé que dans ce navigateur, et un seul à la fois.';
  e.className = 'mien-etat' + (suivi ? ' ok' : '');
  $('mienGarder').hidden = suivi;
  if(PANNEAU_MIENS) PANNEAU_MIENS.dessiner();
}

/* ---------- le fichier personnages.json du dépôt ---------- */
function recevoirMiens(o){
  if(!fondreMiens(normMiens(o))) return;
  garderMiens();
  if(S.id){
    const ici = MIENS[S.id];
    /* supprimé ailleurs, après tes derniers changements : il disparaît d'ici aussi */
    if(!ici || ici.supprime){
      const nom = S.nom;
      viderPourNeuf(); draw();
      direMien('« ' + (nom || 'Sans nom') + ' » a été supprimé depuis un autre appareil.', true);
    }
    /* changé ailleurs : on prend la version la plus récente */
    else if(ghcCanon(ici.s) !== ghcCanon(copieS())){ chargerDansS(ici); draw(); }
  }
  dessinerMiens();
}
const DOC_MIENS = ghcDoc({
  nom:'Personnages', quoi:'une liste de personnages Faelorenn', format:'faelorenn-personnages',
  chemin: GHC_FICHIERS.personnages,
  recevoir: recevoirMiens,
  enAvance: o => ghcEnAvance(MIENS, normMiens(o)),
  contenu: miensFichier,
  message: () => 'Personnages · ' + (ghcJoueur() || 'quelqu’un') + ' · ' + new Date().toLocaleString('fr-BE'),
  etat: () => {
    if(MIENS_UI.differe && (DOC_MIENS.lu || !DOC_MIENS.actif)){ MIENS_UI.differe = false; save(); }
    if(PANNEAU_MIENS) PANNEAU_MIENS.dessiner();
  }
});
/* « Sauvegarder en ligne », dans la fiche : il entre dans tes personnages, et part tout de suite dans le dépôt */
function sauverEnLigne(){
  const b = $('enLigne');
  const dire = (t, ok) => {
    const m = $('enLigneMsg');
    m.textContent = t; m.className = 'note mmsg ' + (ok ? 'ok' : 'err'); m.hidden = false;
    clearTimeout(MIENS_UI.msg2); MIENS_UI.msg2 = setTimeout(() => { m.hidden = true; }, 12000);
  };
  if(!(S.nom || '').trim()){ dire('Donne-lui un nom d’abord, en haut de « Qui tu es ».', false); $('nom').focus(); return; }
  if(!S.id || !MIENS[S.id] || MIENS[S.id].supprime) garderCeMien();
  if(!ghcPret()){
    dire('« ' + S.nom + ' » est gardé dans tes personnages, sur ce navigateur. Pour qu’il parte en ligne, relie une fois ton dépôt GitHub : c’est le panneau « Sauvegarde en ligne », ouvert en haut.', false);
    ghcOuvrirPanneau();
    return;
  }
  if(!DOC_MIENS.actif){
    dire((DOC_MIENS.erreur || 'La sauvegarde en ligne est à l’arrêt.') + ' Relie de nouveau ton dépôt dans le panneau « Sauvegarde en ligne », ouvert en haut.', false);
    ghcOuvrirPanneau();
    return;
  }
  b.disabled = true; b.textContent = 'Sauvegarde…';
  DOC_MIENS.maintenant().then(r => {
    b.disabled = false; b.textContent = 'Sauvegarder en ligne';
    dire(ghcPhraseSauvegarde(r, '« ' + (S.nom || 'Sans nom') + ' »'), r.ok);
    dessinerMiens();
  });
}
function brancherMiens(){
  chargerMiens();
  $('enLigne').onclick = sauverEnLigne;
  $('mienGarder').onclick = garderCeMien;
  $('mienNouveau').onclick = nouveauMien;
  PANNEAU_MIENS = ghcPanneau($('ghcPlace'), {
    etat: () => DOC_MIENS.actif || DOC_MIENS.erreur
      ? {nom:'Tes personnages', texte: DOC_MIENS.actif ? 'dernier échange ' + ghcIlYA(DOC_MIENS.dernier) : 'à l’arrêt', erreur:DOC_MIENS.erreur}
      : null,
    apresRelier: r => DOC_MIENS.demarrer().then(() => {
      if(!DOC_MIENS.actif || DOC_MIENS.erreur) return {ok:false, msg:DOC_MIENS.erreur || 'Le fichier des personnages n’a pas pu être lu.'};
      dessinerMiens();
      return r;
    }),
    apresDetacher: () => { DOC_MIENS.arreter(); dessinerMiens(); }
  });
  ghcSurveiller(() => {
    if(ghcPret()) DOC_MIENS.demarrer(); else DOC_MIENS.arreter();
    dessinerMiens();
  });
  /* un autre onglet du Registre a enregistré : on reprend sa liste */
  window.addEventListener('storage', e => {
    if(e.key !== CLE_MIENS || !e.newValue) return;
    try{ recevoirMiens(JSON.parse(e.newValue)); }catch(x){}
  });
  ghcCharger();
  if(ghcPret()) DOC_MIENS.demarrer();
}
