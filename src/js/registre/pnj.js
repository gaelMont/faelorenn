/* ============ les PNJ, et le réseau de ceux qu'on croise ============ */

let PNJ_ED = null;              /* la fiche en cours d'édition */
let PNJ_LIENS = [];             /* les liens qu'elle tisse en même temps, créés quand on l'enregistre */
const PNJ_OUVERTS = {};
const TISSE = {};               /* les « Tisser un lien » ouverts, par personne */
const PJ_TEXTES_OUVERTS = {};   /* dans le Registre des Visages, les comptes rendus dépliés d'un personnage */
let PNJ_SUPPR = null;
let LIEN_SUPPR = null;
let LIEN_ED = null;             /* le lien qu'on modifie : {id, mode, type, texte, sens, avec, raison} */
const PNJ_FILTRE = {q:'', groupe:''};
const RES = {sel:'', relier:'', cible:'', focus:'', prof:1, etiquettes:true, reorg:false,
  vue:{s:1, tx:0, ty:0}, noeuds:[], aretes:[], cadre:null};

/* ---------- qui est qui ---------- */
function pnjs(){
  return Object.keys(T.pnj).map(id => T.pnj[id]).filter(p => p && !p.supprime)
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
}
function unPnj(id){ const p = id && T.pnj[id]; return p && !p.supprime ? p : null; }
function cleNom(n){ return String(n || '').trim().toLowerCase(); }
function pnjParNom(nom){ const n = cleNom(nom); return n ? pnjs().find(p => cleNom(p.nom) === n) || null : null; }
function quiRef(r){
  if(!r) return null;
  if(r.indexOf('pj:') === 0){ const c = perso(r.slice(3)); return c ? {ref:r, pj:true, nom:c.nom || 'Sans nom', o:c} : null; }
  if(r.indexOf('pnj:') === 0){ const p = unPnj(r.slice(4)); return p ? {ref:r, pj:false, nom:p.nom || 'Sans nom', o:p} : null; }
  return null;
}
function tousLesGens(){ return persos().map(c => quiRef('pj:' + c.id)).concat(pnjs().map(p => quiRef('pnj:' + p.id))); }
function refParNom(nom){
  const n = cleNom(nom); if(!n) return '';
  const p = pnjs().find(x => cleNom(x.nom) === n); if(p) return 'pnj:' + p.id;
  const c = persos().find(x => cleNom(x.nom) === n); if(c) return 'pj:' + c.id;
  return '';
}
function liensActifs(){
  return Object.keys(T.liens).map(id => T.liens[id]).filter(l => l && !l.supprime && quiRef(l.de) && quiRef(l.vers) && l.de !== l.vers);
}
function liensDe(ref){ return liensActifs().filter(l => l.de === ref || l.vers === ref); }
function groupes(){
  const g = {};
  pnjs().forEach(p => { const x = p.groupe.trim(); if(x) g[x] = 1; });
  return Object.keys(g).sort((a, b) => a.localeCompare(b, 'fr'));
}
const libelle = (liste, k) => { const x = liste.find(y => y.k === k); return x ? x.l : ''; };
const typeLien = k => TYPES_LIEN.find(t => t.k === k) || TYPES_LIEN[TYPES_LIEN.length - 1];

/* une phrase pour un lien. Réciproque : « Yvellis et Vaurys · Rivalité ». Dans un sens, les mots qui relient
   les deux noms se lisent entre eux, « Nahya · grand-mère de · Ohan » ; une vraie phrase suit la flèche,
   « Nahya → Toum’Balin · Dette, promesse : il l’a sauvée, elle en a peur » */
const FIN_RELIANTE = /(^|\s)(de|d[’']|du|des|à|au|aux|pour|avec|chez|contre|envers|sur|sous|par|vers|que)$/i;
/* marque : les noms s'écrivent « /Nahya », pour que la séance les cite et que la fiche les retrouve */
function phraseLien(l, marque){
  const a = quiRef(l.de), b = quiRef(l.vers);
  if(!a || !b) return '';
  const na = (marque ? '/' : '') + a.nom, nb = (marque ? '/' : '') + b.nom;
  const t = typeLien(l.type), x = String(l.texte || '').trim();
  if(l.mutuel) return na + ' et ' + nb + ' · ' + t.l + (x ? ', ' + x : '');
  if(!x) return na + ' → ' + nb + ' · ' + t.l;
  if(FIN_RELIANTE.test(x) || x.split(/\s+/).length <= 2) return na + ' · ' + x + ' · ' + nb;
  return na + ' → ' + nb + ' · ' + t.l + ' : ' + x;
}
/* ---------- l'histoire d'un lien : ce qu'il a été, de quelle séance à quelle séance, et pourquoi ---------- */
function numeroSeance(sid){ const e = sid && T.journal[sid] && !T.journal[sid].supprime ? T.journal[sid] : null; return e ? (e.seance || '?') : ''; }
/* la même, pour la lire : avec plusieurs campagnes, son numéro dit aussi de laquelle elle est */
function etiqSeance(sid){ const e = sid && T.journal[sid] && !T.journal[sid].supprime ? T.journal[sid] : null; return e ? etiquetteSeance(e) : ''; }
/* les états d'un lien, du plus ancien à celui d'aujourd'hui */
function etatsDuLien(l){
  const h = l.hist || [];
  return h.map(x => ({s:x, debut:x.depuis, fin:x.jusqua, raison:x.raison, t:x.t}))
    .concat([{s:l, debut:l.depuis || (h.length ? h[h.length - 1].jusqua : ''), fin:'', raison:l.raison, t:0, actuel:true}]);
}
const etatEnLien = (l, s) => Object.assign({}, l, {type:s.type, texte:s.texte, mutuel:s.mutuel, de:s.de || l.de, vers:s.vers || l.vers});
function quandEtat(e){
  const a = etiqSeance(e.debut), b = etiqSeance(e.fin);
  if(e.actuel) return a ? 'depuis la séance ' + a : 'aujourd’hui';
  if(a && b) return a === b ? 'à la séance ' + a : 'séances ' + a + ' à ' + b;
  return b ? 'jusqu’à la séance ' + b : a ? 'depuis la séance ' + a : 'avant';
}
/* sous le lien, quand il a changé en jeu : chaque état, sa période, et ce qui l'a fait naître */
function histoireLien(l){
  const w = el('div','lhist');
  w.append(el('span','lab', 'Son histoire'));
  const u = el('ul');
  etatsDuLien(l).forEach(e => {
    const li = el('li', e.actuel ? 'actuel' : null);
    li.append(el('span','ltrait l-' + e.s.type));
    li.append(document.createTextNode(majuscule(quandEtat(e)) + ' : ' + typeLien(e.s.type).l + (e.s.texte ? ', ' + e.s.texte : '') + (e.raison ? ' · ' + e.raison : '')));
    u.append(li);
  });
  w.append(u);
  return w;
}

/* ---------- un nom tapé à la main : Ohan plutôt qu'« ohen » ---------- */
const cleSimple = n => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function distanceNoms(a, b){
  if(Math.abs(a.length - b.length) > 3) return 99;
  let prev = [];
  for(let j = 0; j <= b.length; j++) prev.push(j);
  for(let i = 1; i <= a.length; i++){
    const cur = [i];
    for(let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
/* quelqu'un qui existe déjà et dont le nom ressemble beaucoup : une lettre sur quatre au plus */
function nomProche(nom, sauf){
  if(refParNom(nom)) return null;
  const n = cleSimple(nom);
  if(n.length < 3) return null;
  let mieux = null, dm = 99;
  tousLesGens().forEach(x => {
    if(x.ref === sauf) return;
    const m = cleSimple(x.nom);
    if(!m) return;
    const d = distanceNoms(n, m);
    if(d <= Math.max(1, Math.floor(Math.min(n.length, m.length) / 4)) && d < dm){ mieux = x; dm = d; }
  });
  return mieux;
}

/* créée depuis le compte rendu : une fiche minimale, qu'on complète quand on veut */
function creerPnj(nom, seanceId){
  const p = normPnj({id:idLibre('n-' + slug(nom), T.pnj), maj:maintenant(), nom:String(nom).trim(), seance:seanceId || '', auteur:MOI.joueur || ''});
  baseVie(p, null);   /* une fiche neuve : rien d'une ancienne fiche supprimée du même nom */
  T.pnj[p.id] = p;
  return p;
}
const nomAnonyme = n => /^[?\s.]*$/.test(String(n || ''));

/* ---------- où on l'a vu : les séances où il agit, parle, où on le cite ou le nomme ---------- */
function apparitions(p){
  const par = {};
  textesDe('pnj:' + p.id).forEach(x => {
    const y = par[x.e.id] || (par[x.e.id] = {e:x.e, n:0, premier:x.b});
    y.n++;
    if(x.b.ordre < y.premier.ordre) y.premier = x.b;
  });
  return Object.keys(par).map(k => par[k]).sort((a, b) => (parseFloat(a.e.seance) || 0) - (parseFloat(b.e.seance) || 0));
}
function allerAuBloc(sid, bid){
  if(!$('seRecit')){ ouvrirPage('table.html#bloc=' + encodeURIComponent(sid + '~' + bid), ONGLET_TABLE); return; }
  choisirSeance(sid); BED = null;
  dessinerSeance(true);
  $('secSeance').scrollIntoView({block:'start', behavior:'smooth'});
  const w = document.querySelector('#seRecit [data-bloc="' + bid + '"]');
  if(!w) return;
  $('seRecit').scrollTop = Math.max(0, w.offsetTop - 16);
  w.classList.add('eclaire');
  setTimeout(() => w.classList.remove('eclaire'), 2400);
}
function composerPourPnj(p){
  if(!$('seCompo')){ ouvrirPage('table.html#parler=' + encodeURIComponent(p.id), ONGLET_TABLE); return; }
  if(!seanceCourante()){ msgTable('Commence d’abord une séance : le PNJ y parlera.', false); $('secSeance').scrollIntoView({block:'start', behavior:'smooth'}); return; }
  choisirQui({k:'pnj', id:p.id, nom:p.nom});
  COMPO.genre = 'dit';
  dessinerCompositeur(true);
  $('seCompo').scrollIntoView({block:'center', behavior:'smooth'});
  setTimeout(() => $('coTexte').focus({preventScroll:true}), 350);
}

/* ---------- la section ---------- */
const vuePnj = () => MOI.vuePnj === 'reseau' || MOI.vuePnj === 'histoire' || MOI.vuePnj === 'lieux' ? MOI.vuePnj : 'fiches';
function dessinerPnj(force){
  if(!$('pnjListe')) return;
  majOutilsPnj();
  const v = vuePnj();
  $('pnjListe').hidden = v !== 'fiches';
  $('pnjReseau').hidden = v !== 'reseau';
  if($('pnjHistoire')) $('pnjHistoire').hidden = v !== 'histoire';
  if(v === 'fiches') dessinerListePnj(force);
  else if(v === 'reseau') dessinerReseau(force);
  else dessinerHistoire(force);
}
function majOutilsPnj(){
  [['pnjVueFiches','fiches'], ['pnjVueReseau','reseau'], ['pnjVueHistoire','histoire']].forEach(([id, v]) => {
    if($(id)) $(id).setAttribute('aria-pressed', vuePnj() === v ? 'true' : 'false');
  });
  const s = $('pnjGroupe');
  if(document.activeElement !== s){
    const gs = groupes();
    s.innerHTML = '';
    s.add(new Option('Tous les groupes', ''));
    gs.forEach(g => s.add(new Option(g, g)));
    if(PNJ_FILTRE.groupe && gs.indexOf(PNJ_FILTRE.groupe) < 0) PNJ_FILTRE.groupe = '';
    s.value = PNJ_FILTRE.groupe;
  }
  const n = pnjs().length;
  $('pnjCompte').textContent = n ? n + ' fiche' + (n > 1 ? 's' : '') : '';
  $('pnjOutilsListe').hidden = vuePnj() === 'reseau';
  $('pnjGroupe').hidden = vuePnj() === 'histoire';
}

/* ---------- l'histoire des liens : ce qui s'est noué, et ce qui a changé, séance par séance ---------- */
function evenementsLiens(){
  const ev = [];
  liensActifs().forEach(l => {
    const etats = etatsDuLien(l);
    etats.forEach((e, i) => {
      const avant = i ? etats[i - 1] : null;
      ev.push({l:l, etat:e, avant:avant, seance:e.debut || (avant ? avant.fin : ''), t:i ? (avant.t || 0) : (l.cree || 0)});
    });
  });
  const rang = sid => { const n = parseFloat(numeroSeance(sid)); return isNaN(n) ? -1 : n; };
  /* une campagne après l'autre, puis ses séances dans l'ordre ; sans séance, en tête */
  const ordre = {}; campagnes().forEach((c, i) => { ordre[c.id] = i; });
  const camp = sid => { const e = sid && T.journal[sid]; return e && !e.supprime ? ordre[idCampagneDe(e)] || 0 : -1; };
  return ev.sort((a, b) => (camp(a.seance) - camp(b.seance)) || (rang(a.seance) - rang(b.seance)) || (a.t - b.t));
}
function dessinerHistoire(force){
  const box = $('pnjHistoire'); if(!box) return;
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerHistoire(true)); return; }
  box.innerHTML = '';
  const q = cleNom(PNJ_FILTRE.q);
  const ev = evenementsLiens().filter(x => {
    if(!q) return true;
    return [quiRef(x.l.de), quiRef(x.l.vers)].some(p => p && cleNom(p.nom).indexOf(q) >= 0);
  });
  if(!ev.length){
    box.append(el('p','vide', q ? 'Aucun lien pour ce nom.' : 'Aucun lien pour l’instant. Chaque lien noué, et chaque lien qui change en jeu (« Modifier », puis « Ça a changé en jeu »), s’écrit ici, séance par séance.'));
    return;
  }
  box.append(el('p','mini', 'Chaque lien noué, et chaque lien qui a changé en jeu, à la séance où c’est arrivé. Les liens tissés avant qu’on note la séance sont en tête.'));
  let cle = null, u = null;
  ev.forEach(x => {
    const k = x.seance && numeroSeance(x.seance) ? x.seance : '';
    if(k !== cle || !u){
      cle = k;
      const e = k ? T.journal[k] : null;
      box.append(el('h3','hseance', e ? 'Séance ' + (e.seance || '?') + (e.titre ? ' · ' + e.titre : '') + (plusieursCampagnes() ? ' · ' + nomCampagne(idCampagneDe(e)) : '') : 'Sans séance notée'));
      u = el('ul','hliens');
      box.append(u);
    }
    const li = el('li', x.avant ? 'change' : 'noue');
    li.append(el('span','ltrait l-' + x.etat.s.type));
    const t = el('span','q');
    t.append(document.createTextNode(phraseLien(etatEnLien(x.l, x.etat.s))));
    if(x.avant) t.append(el('span','mini', ' · avant : ' + typeLien(x.avant.s.type).l.toLowerCase() + (x.avant.s.texte ? ', ' + x.avant.s.texte : '')));
    else t.append(el('span','mini', ' · noué'));
    if(x.etat.raison) t.append(el('span','hraison', ' · ' + x.etat.raison));
    li.append(t);
    u.append(li);
  });
}
function pnjFiltres(){
  const q = cleNom(PNJ_FILTRE.q);
  return pnjs().filter(p => {
    if(PNJ_FILTRE.groupe && p.groupe.trim() !== PNJ_FILTRE.groupe) return false;
    if(!q) return true;
    return [p.nom, p.role, p.groupe, p.lieu, p.peuple, p.texte].some(x => cleNom(x).indexOf(q) >= 0);
  });
}
function dessinerListePnj(force){
  const box = $('pnjListe');
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerListePnj(true)); return; }
  box.innerHTML = '';
  const tous = pnjs(), l = pnjFiltres();
  if(!tous.length){
    box.append(el('p','vide','Aucune fiche pour l’instant. Chaque PNJ qui parle ou agit dans une séance reçoit la sienne, ou crée-la ici.'));
    return;
  }
  if(!l.length){ box.append(el('p','vide','Personne ne répond à cette recherche.')); return; }
  l.forEach(p => box.append(cartePnj(p)));
}
function cartePnj(p){
  const w = el('div','pcarte ncarte' + (p.statut !== 'vivant' ? ' ' + p.statut : ''));
  w.setAttribute('data-pnj', p.id);
  const t = el('div','ntete');
  const nm = el('div','pnom', (p.nom || 'Sans nom') + (p.statut === 'mort' ? ' †' : ''));
  t.append(nm, el('span','att att-' + p.attitude, libelle(ATTITUDES, p.attitude)));
  w.append(t);
  const qui = [p.role, p.peuple, texteAge(p), p.groupe].filter(Boolean).join(' · ');
  w.append(el('div','pqui', qui || 'rien de noté pour l’instant'));
  const ap = apparitions(p), nl = liensDe('pnj:' + p.id).length;
  const premiere = p.seance && T.journal[p.seance] && !T.journal[p.seance].supprime ? etiquetteSeance(T.journal[p.seance]) : '';
  const meta = [p.lieu,
    ap.length ? 'vu en séance ' + listeNumerosSeances(ap.map(a => a.e)) : premiere ? 'rencontré en séance ' + premiere : '',
    nl ? nl + ' lien' + (nl > 1 ? 's' : '') : '',
    p.statut === 'disparu' ? 'disparu' : '',
    p.pvMax ? p.pv + '/' + p.pvMax + ' PV' : ''].filter(Boolean);
  if(meta.length) w.append(el('div','mini nmeta', meta.join(' · ')));
  /* un ancien personnage : sa fiche de personnage l'attend dans le Registre des Marchefleurs */
  if(p.pj && T.personnages[p.pj] && T.personnages[p.pj].monde === p.id){
    const n = el('p','mini nancien');
    n.append(document.createTextNode('Ancien personnage. '));
    const a = el('a', null, 'Sa fiche de personnage'); a.href = 'marchefleurs.html#monde'; a.target = ONGLET_FICHE;
    n.append(a, document.createTextNode(' se reprend dans le Registre des Marchefleurs.'));
    w.append(n);
  }
  w.append(liensEnBref('pnj:' + p.id));

  const act = el('div','pact');
  const ouvert = !!PNJ_OUVERTS[p.id];
  const b = (txt, fn, cls) => { const x = el('button','btn ghost sm' + (cls ? ' ' + cls : ''), txt); x.type = 'button'; x.onclick = fn; act.append(x); return x; };
  b(ouvert ? 'Replier' : 'Voir la fiche', () => { PNJ_OUVERTS[p.id] = !ouvert; dessinerListePnj(true); });
  b('En grand', () => ouvrirGrand('pnj:' + p.id)).setAttribute('aria-label', 'Ouvrir la fiche de ' + (p.nom || 'ce PNJ') + ' en grand');
  b('Modifier', () => ouvrirEditeurPnj(p, false));
  const ti = b('Tisser un lien', () => { TISSE['pnj:' + p.id] = !TISSE['pnj:' + p.id]; dessinerListePnj(true); if(TISSE['pnj:' + p.id]){ const s = document.querySelector('[data-pnj="' + p.id + '"] .fl-avec'); if(s) s.focus(); } });
  ti.setAttribute('aria-expanded', TISSE['pnj:' + p.id] ? 'true' : 'false');
  b('Faire parler', () => composerPourPnj(p));
  b('Dans le réseau', () => { MOI.vuePnj = 'reseau'; RES.sel = 'pnj:' + p.id; RES.focus = ''; sauverLocal(); dessinerPnj(true); $('secPnj').scrollIntoView({block:'start', behavior:'smooth'}); });
  const arme = PNJ_SUPPR === p.id;
  b(arme ? 'Confirmer' : 'Retirer', () => {
    if(arme){ PNJ_SUPPR = null; changer(() => { T.pnj[p.id] = Object.assign({}, p, {supprime:true, maj:maintenant()}); }); return; }
    PNJ_SUPPR = p.id; dessinerListePnj(true);
    setTimeout(() => { if(PNJ_SUPPR === p.id){ PNJ_SUPPR = null; dessinerListePnj(true); } }, 5000);
  }, arme ? 'danger' : '');
  w.append(act);
  if(TISSE['pnj:' + p.id]) w.append(formLien('pnj:' + p.id, '', () => { TISSE['pnj:' + p.id] = false; dessinerListePnj(true); }));
  if(ouvert) w.append(detailPnj(p));
  return w;
}
/* les liens d'une personne, en quelques lignes, sur sa carte */
function liensEnBref(ref){
  const ls = liensDe(ref);
  const u = el('ul','nliens');
  if(!ls.length){ u.hidden = true; return u; }
  ls.slice(0, 5).forEach(l => {
    const li = el('li');
    li.append(el('span','ltrait l-' + l.type), document.createTextNode(phraseLien(l)));
    u.append(li);
  });
  if(ls.length > 5) u.append(el('li','mini', 'et ' + (ls.length - 5) + ' de plus, dans la fiche'));
  return u;
}

function detailPnj(p){
  const d = el('div','detail');
  if(p.texte){ d.append(el('h3', null, 'Ce qu’on sait')); const t = el('div','texte'); t.append(texteRiche(p.texte)); d.append(t); }
  if(p.valeurs.length){
    d.append(el('h3', null, 'Ses valeurs'));
    d.append(el('p','mini', p.valeurs.map(v => v.n + ' ' + v.v + ' (d20 ' + d20v(v.v) + ')').join(' · ')));
  }
  const ref = 'pnj:' + p.id;
  d.append(el('h3', null, 'Ses liens'));
  const ls = liensDe(ref);
  if(!ls.length) d.append(el('p','mini','Aucun lien pour l’instant.'));
  ls.forEach(l => d.append(ligneLien(l, () => dessinerListePnj(true), ref, 'carte')));

  /* tout ce qu'on a écrit sur lui, séance par séance */
  d.append(el('h3', null, 'Dans les comptes rendus'));
  d.append(blocTextes(ref, () => dessinerListePnj(true)));
  return d;
}
