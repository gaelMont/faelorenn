/* ============ le sac et la bourse ============
   Ce que chacun porte vit à côté de sa fiche, une ligne par pile d'objets (T.objets) et une ligne par pièce qui
   entre ou qui sort (T.argent) : deux joueurs qui touchent au même sac en même temps ne s'écrasent pas, et la
   bourse garde son histoire. Les armes restent sur la fiche (c.armes) : le combat et la progression les y lisent.
   Le sac et la bourse d'avant, du texte sur la fiche, passent une fois dans ces lignes sous un nom fixe :
   deux ordinateurs qui le font en même temps font exactement la même chose. */

const SAC_PLEIN = 120;   /* piles au plus dans un sac */

function unObjet(id){ const o = id && T.objets[id]; return o && !o.supprime ? o : null; }
function objetsDe(pid){
  return Object.keys(T.objets).map(k => T.objets[k]).filter(o => o && !o.supprime && o.perso === pid)
    .sort((a, b) => (a.t - b.t) || (a.id < b.id ? -1 : 1));
}
function mouvementsDe(pid){
  return Object.keys(T.argent).map(k => T.argent[k]).filter(m => m && !m.supprime && m.perso === pid)
    .sort((a, b) => (b.t - a.t) || (a.id < b.id ? 1 : -1));
}
function bourseDe(pid){ return mouvementsDe(pid).reduce((a, m) => a + m.n, 0); }
function porteDe(pid, sorte){ return objetsDe(pid).find(o => o.sorte === sorte && o.porte) || null; }
/* la réduction : son armure naturelle, plus la pièce qu'il porte, plus son bouclier */
function redDe(c){
  if(!c) return 0;
  const a = porteDe(c.id, 'armure'), b = porteDe(c.id, 'bouclier');
  return (c.red || 0) + (a ? a.red : 0) + (b ? b.red : 0);
}

/* ---------- ce qu'un texte dit d'un objet ----------
   « Deux fioles de Havre », « Flèches, 4. Récupérables après le combat », « Un cuir matelassé » */
const NOMBRES_OBJET = {un:1, une:1, deux:2, trois:3, quatre:4, cinq:5, six:6, sept:7, huit:8, neuf:9, dix:10, onze:11, douze:12, quinze:15, vingt:20};
const cleObjet = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`´]/g, '\'')
  .replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean).map(w => w.length > 3 ? w.replace(/[sx]$/, '') : w).join(' ');
/* l'entrée du marché dont il s'agit : le même nom, ou ce nom suivi d'un détail (« Fiole de Havre, à moitié vide ») */
function duMarche(nom){
  const k = cleObjet(nom);
  const va = noms => noms.some(a => { const c = cleObjet(a); return c && (k === c || k.indexOf(c + ' ') === 0); });
  let e = MARCHE.consommables.find(x => va([x.nom]));
  if(e) return {e:e, sorte:'conso', effet:e.effet, prix:e.prix, exact:cleObjet(e.nom) === k};
  e = MARCHE.armures.find(x => va([x.nom].concat(x.alias || [])));
  /* une armure garde le nom qu'on lui donne : « Cuir matelassé » */
  if(e) return {e:e, sorte:e.sorte, red:e.red, prix:e.prix, exact:false};
  return null;
}
function objetDepuisTexte(t){
  const brut = String(t || '').replace(/\s+/g, ' ').trim();
  let s = brut.replace(/[.\s]+$/, ''), n = 1, note = '';
  let m = /^([^,]+?),\s*(\d+)\s*(?:\.\s*(.*))?$/.exec(s);
  if(m){ s = m[1].trim(); n = +m[2]; note = (m[3] || '').trim(); }
  else if((m = /^(\d+)\s+(.+)$/.exec(s))){ n = +m[1]; s = m[2]; }
  else {
    m = /^(\S+)\s+(.+)$/.exec(s);
    if(m && NOMBRES_OBJET[m[1].toLowerCase()]){ n = NOMBRES_OBJET[m[1].toLowerCase()]; s = m[2]; }
    else s = s.replace(/^(?:des|du|de la|le|la|les)\s+|^(?:de l|l)['’]\s*/i, '');
  }
  s = s.charAt(0).toUpperCase() + s.slice(1);
  const x = {nom:s || 'Un objet', n:Math.max(1, Math.min(999, n)), sorte:'objet', note:note, effet:'', red:0, prix:null};
  const d = duMarche(x.nom);
  if(d){
    x.sorte = d.sorte; x.prix = d.prix;
    if(d.effet) x.effet = d.effet;
    if(d.red) x.red = d.red;
    /* « Fioles de Havre » devient la Fiole de Havre du livre ; un détail en plus garde son nom */
    if(d.exact) x.nom = d.e.nom;
  } else {
    const r = /r[ée]duction\s*(\d+)/i.exec(brut);
    if(r){ x.sorte = 'armure'; x.red = +r[1]; }
  }
  return x;
}

/* de l'argent en tête d'un texte va dans la bourse : « 7 argents, dans une bourse qui porte un nom », et la bourse
   du Livre VI, « Bourse de 7 argents. Elle porte un nom brodé. », une fois ses dés lancés. Le prix d'un objet,
   plus loin dans le texte (« ou 8 ors à leur école »), n'en est pas */
function argentEnTete(t){
  const tete = String(t || '').split(/\.\s/)[0];
  const m = /^\s*(?:(?:une|la|sa)\s+)?(?:bourse\s+(?:de\s+|d['’]\s*|avec\s+))?(\d+)\s*(ors?|argents?)(?![\p{L}\p{N}])/iu.exec(tete);
  return m ? (+m[1]) * (/^or/i.test(m[2]) ? ARGENTS_PAR_OR : 1) : 0;
}

/* ---------- le sac et la bourse d'avant ---------- */
function hashCourt(s){ let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
/* le nom fixe d'une ligne du sac d'avant : son texte, et combien de fois le même texte vient plus haut. Une ligne
   retirée ailleurs ne change pas le nom des autres */
function cleLigne(pid, sac, i){
  const s = String(sac[i]);
  let k = 0;
  for(let j = 0; j < i; j++) if(String(sac[j]) === s) k++;
  return pid + '-' + hashCourt(s) + (k ? '-' + (k + 1) : '');
}
function aMigrer(){
  const out = {objets:[], argent:[]};
  Object.keys(T.personnages).forEach(pid => {
    const c = T.personnages[pid];
    if(!c || c.supprime) return;
    (c.sac || []).forEach((s, i) => {
      s = String(s);
      const h = cleLigne(pid, c.sac, i), n = argentEnTete(s);
      if(n){ if(!T.argent['arg-' + h]) out.argent.push({id:'arg-' + h, c:c, n:n, i:i, motif:'Son sac d’avant : ' + s}); }
      else if(!T.objets['o-' + h]) out.objets.push({id:'o-' + h, c:c, s:s, i:i});
    });
    const n = argentsDe(c.bourse), id = 'arg-' + pid + '-bourse';
    if(n && !T.argent[id]) out.argent.push({id:id, c:c, n:n});
  });
  return out;
}
function migrerInventaires(){
  const a = aMigrer();
  if(!a.objets.length && !a.argent.length) return 0;
  /* datées du tout début, et pareilles sur chaque ordinateur : un navigateur resté en arrière qui refait le
     passage avant d'avoir lu le dépôt n'écrase rien. Ce qu'un joueur en a fait depuis, jeté, donné, porté, l'emporte */
  changer(() => {
    const b = aMigrer();
    b.objets.forEach(x => {
      const o = objetDepuisTexte(x.s);
      /* l'armure du paquetage se porte, si rien d'autre n'est déjà porté et si son corps la supporte */
      const porte = (o.sorte === 'armure' || o.sorte === 'bouclier') && !porteDe(x.c.id, o.sorte) && !horsDuCorps(x.c, o);
      T.objets[x.id] = normObjet(Object.assign(o, {id:x.id, perso:x.c.id, porte:porte, origine:'Son sac d’avant', t:1 + x.i, maj:1}));
    });
    b.argent.forEach(x => { T.argent[x.id] = normArgent({id:x.id, perso:x.c.id, n:x.n, motif:x.motif || 'Sa bourse d’avant', t:1 + (x.i || 0), maj:1}); });
  });
  return a.objets.length + a.argent.length;
}
/* la migration part après chaque lecture : ce qui arrive d'un autre ordinateur passe aussi. Jamais avant la
   première lecture de la table partagée : ce navigateur a peut-être un sac d'avant qui n'est plus à jour */
let MIGRATION_T = null, DEPART_FAIT = false;
function pretAMigrer(){
  if(!DEPART_FAIT) return false;
  if(SYNC.etat === 'github') return !!GH.lu;
  if(SYNC.etat === 'attente') return false;
  if(SYNC.etat === 'fichier') return !!SYNC.dernier;
  return true;
}
function planifierMigration(){
  if(MIGRATION_T) return;
  MIGRATION_T = setTimeout(() => {
    MIGRATION_T = null;
    const pret = pretAMigrer();
    /* la première campagne ne risque rien, elle est pareille sur chaque ordinateur : elle attend la lecture du dépôt,
       ou son échec (hors ligne, on joue quand même) */
    if(pret || (DEPART_FAIT && SYNC.etat === 'github' && GH.erreur)) migrerCampagnes();
    if(pret) migrerInventaires();
    else { const a = aMigrer(); if(a.objets.length || a.argent.length || !campagnes().length) planifierMigration(); }
  }, 400);
}

/* ---------- ce qu'on fait du sac, à appeler dans un changer() ---------- */
function majObjet(id, champs){
  const o = T.objets[id];
  if(!o) return null;
  T.objets[id] = normObjet(Object.assign({}, o, champs, {id:id, maj:maintenant()}));
  return T.objets[id];
}
function oterObjet(id){ const o = T.objets[id]; if(o && !o.supprime) T.objets[id] = Object.assign({}, o, {supprime:true, maj:maintenant()}); }
function nouvelObjet(pid, champs){
  const t = maintenant();
  const o = normObjet(Object.assign({}, champs, {id:nouvelId('o'), perso:pid, t:t, maj:t}));
  T.objets[o.id] = o;
  return o;
}
/* un achat rejoint la pile du même objet, s'il en a déjà une sans rien de particulier */
function ajouterAuSac(pid, champs){
  const sorte = champs.sorte || 'objet';
  if(sorte === 'conso' || sorte === 'objet'){
    const k = cleObjet(champs.nom);
    const pile = objetsDe(pid).find(o => o.sorte === sorte && cleObjet(o.nom) === k && (o.effet || '') === (champs.effet || '') && !o.note && !champs.note);
    if(pile) return majObjet(pile.id, {n:pile.n + (champs.n || 1)});
  }
  return nouvelObjet(pid, champs);
}
function changerQte(id, d){
  const o = unObjet(id); if(!o) return;
  if(o.n + d <= 0) oterObjet(id); else majObjet(id, {n:o.n + d});
}
/* ce que son corps supporte, écrit dans le chapitre de son peuple : la réduction la plus haute d'une armure
   qu'il peut porter. null : pas de limite écrite, ou il peut aller au-delà (le Vaellen, qui ne vole plus) */
function armureMax(c){
  const t = String((c && c.armure) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if(!t.trim()) return null;
  if(/^\s*aucune/.test(t)) return 0;
  if(/au-?dela il peut/.test(t)) return null;
  if(/toutes|plates/.test(t)) return 4;
  if(/maille/.test(t)) return 3;
  if(/cuir cloute|ecailles/.test(t)) return 2;
  if(/cuir|matelasse/.test(t)) return 1;
  return null;
}
/* une armure que son corps ne supporte pas ; un bouclier n'en est pas une */
function horsDuCorps(c, o){ const m = armureMax(c); return !!o && o.sorte === 'armure' && m != null && o.red > m; }
/* le Vaellen peut porter plus que le cuir, mais il ne vole plus */
function neVolePlus(c, o){ return !!o && o.sorte === 'armure' && o.red > 1 && /au-?dela il peut/i.test(String((c && c.armure) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')); }
/* une seule armure portée, un seul bouclier, et seulement ce que son corps supporte */
function porterObjet(id, oui){
  const o = unObjet(id); if(!o || (o.sorte !== 'armure' && o.sorte !== 'bouclier')) return;
  if(oui && horsDuCorps(T.personnages[o.perso], o)) return;
  if(oui) objetsDe(o.perso).forEach(x => { if(x.id !== id && x.sorte === o.sorte && x.porte) majObjet(x.id, {porte:false}); });
  majObjet(id, {porte:!!oui});
}
/* donner : toute la pile change de sac, ou seulement combien on en donne */
function donnerObjet(id, cible, combien){
  const o = unObjet(id); if(!o || !perso(cible) || cible === o.perso) return null;
  combien = Math.max(1, Math.min(o.n, Math.round(+combien || o.n)));
  if(combien >= o.n) return majObjet(id, {perso:cible, porte:false, t:maintenant()});
  majObjet(id, {n:o.n - combien});
  return nouvelObjet(cible, Object.assign({}, o, {n:combien, porte:false, origine:'Donné par ' + (nomPj(o.perso) || 'quelqu’un')}));
}
const nomPj = id => { const c = T.personnages[id]; return c ? c.nom || 'Sans nom' : ''; };

/* ce que rend un consommable : le soin du livre, ou celui que son effet écrit (« Rend 2 PV », « Rends 1d6 PV ») */
function soinDe(o){
  const e = MARCHE.consommables.find(x => x.soin && cleObjet(x.nom) === cleObjet(o.nom));
  if(e) return e.soin;
  const m = /\brends?\s+(\d*d\d+(?:\s*[+\-]\s*\d+)?|\d+)\s*(PV|PC)\b/i.exec(o.effet || '');
  return m ? {q:m[2].toLowerCase(), f:m[1].replace(/\s+/g, '')} : null;
}

/* ---------- la bourse, à appeler dans un changer() ---------- */
function mouvement(pid, n, motif, extra){
  const t = maintenant();
  const m = normArgent(Object.assign({id:nouvelId('arg'), perso:pid, n:n, motif:motif, t:t, maj:t}, extra || {}));
  T.argent[m.id] = m;
  return m;
}
function defaireMouvement(id){ const m = T.argent[id]; if(m && !m.supprime) T.argent[id] = Object.assign({}, m, {supprime:true, maj:maintenant()}); }
/* la paie d'une mission : à chaque personnage de la table, une fois. Rouvrir la mission la reprend */
function payerMission(m, qui, bloc, seance){
  const n = argentsDe(m.paie);
  if(!n) return 0;
  let payes = 0;
  qui.forEach(c => {
    const id = 'arg-' + m.id + '-' + c.id, deja = T.argent[id];
    if(deja && !deja.supprime) return;
    const t = maintenant();
    T.argent[id] = normArgent({id:id, perso:c.id, n:n, motif:'Paie : ' + (m.titre || 'la mission'), mission:m.id, bloc:bloc || '', seance:seance || '', t:t, maj:t});
    payes++;
  });
  return payes;
}
const paieDonnee = m => Object.keys(T.argent).some(id => { const x = T.argent[id]; return !!x && !x.supprime && x.mission === m.id; });
function reprendrePaie(m){
  Object.keys(T.argent).forEach(id => { const x = T.argent[id]; if(x && !x.supprime && x.mission === m.id) defaireMouvement(id); });
}

/* ---------- entrer dans le monde ----------
   Le personnage devient un PNJ du Registre des Visages : son nom, son histoire, ce qu'il sait faire, ses PV, et
   tous ses liens, qui passent à sa fiche de PNJ. Il quitte la table sans rien perdre ; on peut le reprendre. */
function versLeMonde(pid){
  const c = persoActif(pid); if(!c) return null;
  const t = maintenant(), lieu = lieuDeCampagne(idCampagneDe(c));
  const id = idLibre('n-' + slug(c.nom || 'ancien'), T.pnj);
  const vals = ALLSKILLS.map(o => ({n:nomComp(o.s), v:compTotal(c, o.s)})).sort((a, b) => b.v - a.v).slice(0, 8);
  c.pratiques.forEach(p => { const v = pratValeur(c, p); if(v.val != null && vals.length < 20) vals.push({n:p.n, v:v.val}); });
  const armes = c.armes.map(a => a.nom + (a.de ? ' (' + a.de + ')' : '')).join(', ');
  const qui = 'Ancien personnage' + (c.joueur ? ', joué par ' + c.joueur : '') + '. ' + [c.peuple, c.voie].filter(Boolean).join(', ');
  const texte = [c.texte.trim(), (qui.replace(/[.\s,]+$/, '') + '.') + (armes ? ' Ses armes : ' + armes + '.' : '')].filter(Boolean).join('\n\n');
  const p = normPnj({id:id, maj:t, nom:c.nom, peuple:c.peuple, role:c.voie ? c.voie + ', ancien Marchefleur' : 'Ancien Marchefleur',
    groupe:'Anciens personnages', attitude:'inconnu', statut:'vivant', texte:texte, auteur:MOI.joueur || '', lieu:lieu,
    valeurs:vals, pvMax:c.pvMax, pv:c.pv, pv0:c.pv, pj:c.id});
  baseVie(p, c.pv);   /* une fiche neuve : rien des coups d'une ancienne fiche supprimée du même nom */
  T.pnj[id] = p;
  refaireLiens('pj:' + c.id, 'pnj:' + id, t);
  if(T.positions['pj:' + c.id]) T.positions['pnj:' + id] = Object.assign({}, T.positions['pj:' + c.id], {maj:t});
  c.monde = id; c.mondeT = t;
  majPerso(c);
  if(MOI.perso === c.id) MOI.perso = '';
  return p;
}
function refaireLiens(de, vers, t){
  const r = x => x === de ? vers : x;
  Object.keys(T.liens).forEach(k => {
    const l = T.liens[k];
    if(!l || l.supprime) return;
    const touche = l.de === de || l.vers === de || (l.hist || []).some(h => h.de === de || h.vers === de);
    if(!touche) return;
    T.liens[k] = Object.assign({}, l, {de:r(l.de), vers:r(l.vers), hist:(l.hist || []).map(h => Object.assign({}, h, {de:r(h.de), vers:r(h.vers)})), maj:t});
  });
}
/* le reprendre : ses liens reviennent au personnage, sa fiche de PNJ s'efface */
function reprendrePersonnage(pid){
  const c = T.personnages[pid];
  if(!c || c.supprime || !c.monde) return null;
  const t = maintenant(), nid = c.monde, p = T.pnj[nid];
  refaireLiens('pnj:' + nid, 'pj:' + pid, t);
  if(p && !p.supprime) T.pnj[nid] = Object.assign({}, p, {supprime:true, maj:t});
  /* la date du retour : une fusion avec une fiche d'avant ne le renvoie pas dans le monde */
  c.monde = ''; c.mondeT = t;
  /* il revient à la table qu'on suit : c'est là qu'on le reprend, quelle que soit la campagne qu'il a quittée */
  rattacher(c);
  majPerso(c);
  return c;
}
function entresDansLeMonde(){
  return Object.keys(T.personnages).map(k => T.personnages[k]).filter(c => c && !c.supprime && c.monde)
    .sort((a, b) => (b.mondeT - a.mondeT) || (a.nom || '').localeCompare(b.nom || '', 'fr'));
}
