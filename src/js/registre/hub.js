/* ============ le hub : chaque outil de la table est un widget, et chacun range le sien ============
   Les panneaux gardent leurs identifiants d'avant (seEtat, seCombat, seOracle…) : le hub ne fait que
   les poser dans un rail, les éteindre, ou les prêter à une fenêtre. Le réglage voyage dans le fichier
   de la table, sous le nom du joueur : changer d'ordinateur ne le perd pas. */

const HUB_LISTE = [
  {k:'repos', id:'seRepos',  n:'Le repos',      ou:'g', on:true},
  {k:'jour',  id:'seJour',   n:'Le jour',       ou:'g', on:true},
  {k:'carte', id:'seCarte',  n:'La carte',      ou:'g', on:true},
  {k:'cie',   id:'seEtat',   n:'La compagnie',  ou:'d', on:true},
  {k:'tour',  id:'seTour',   n:'Le tour',       ou:'d', on:true},
  {k:'eux',   id:'seCombat', n:'Les ennemis',   ou:'d', on:true}
];
/* ce qui n'est pas un widget mais qu'une fenêtre emprunte le temps de s'en servir */
const HUB_PRETS = {oracle:'seOracle', visage:'seVisage', jets:'secJets', tirage:'seTirage', butin:'seButin'};
const idPanneau = k => (HUB_CLES[k] ? HUB_CLES[k].id : HUB_PRETS[k]) || '';
const HUB_CLES = {};
HUB_LISTE.forEach(w => { HUB_CLES[w.k] = w; });
const HUB_RAILS = [{k:'gd', l:'Un à gauche, un à droite'}, {k:'dd', l:'Les deux à droite'}, {k:'gg', l:'Les deux à gauche'}];
/* les quatre places : au-dessus du récit, le rail 1, le rail 2, et les éteints */
const HUB_PLACES = ['h', 'g', 'd', 'off'];
const HUB_LARG = {min:210, max:520, def:300};
/* ce que la fenêtre a emprunté, et ce qu'on est en train de glisser dans les options */
const HUB = {fen:'', prete:'', glisse:null, cherche:'', tir:'', sorti:null};

const cleHub = () => cleNom(MOI.joueur) || 'moi';
const largeurHub = v => Math.max(HUB_LARG.min, Math.min(HUB_LARG.max, parseInt(v, 10) || HUB_LARG.def));

/* le réglage, complété : tout widget inconnu du fichier retombe à sa place d'origine */
function reglageHub(){
  const sien = (T.hub || {})[cleHub()];
  const r = sien && !sien.supprime ? sien : {};
  const out = {
    rails: HUB_RAILS.some(x => x.k === r.rails) ? r.rails : 'gd',
    plein: !!r.plein,
    larg: {g: largeurHub((r.larg || {}).g), d: largeurHub((r.larg || {}).d)},
    h: [], g: [], d: [], off: []
  };
  const vus = {};
  HUB_PLACES.forEach(c => (Array.isArray(r[c]) ? r[c] : []).forEach(k => {
    if(HUB_CLES[k] && !vus[k]){ vus[k] = 1; out[c].push(k); }
  }));
  HUB_LISTE.forEach(w => { if(!vus[w.k]) out[w.on ? w.ou : 'off'].push(w.k); });
  return out;
}
function poserReglageHub(r){
  changer(() => {
    if(!T.hub) T.hub = {};
    T.hub[cleHub()] = {maj:maintenant(), rails:r.rails, plein:!!r.plein, larg:{g:r.larg.g, d:r.larg.d},
      h:r.h.slice(), g:r.g.slice(), d:r.d.slice(), off:r.off.slice()};
  });
}
/* remettre comme au départ : on écrit un oubli daté, parce qu'effacer la ligne la ferait revenir
   à la première fusion avec la copie gardée à côté (même piège que « Revenir au livre ») */
function oublierReglageHub(){
  changer(() => {
    if(!T.hub) T.hub = {};
    T.hub[cleHub()] = {maj:maintenant(), supprime:true, rails:'gd', plein:false, larg:{g:HUB_LARG.def, d:HUB_LARG.def}, h:[], g:[], d:[], off:[]};
  });
}
const hubAllume = k => reglageHub().off.indexOf(k) < 0;
/* allumer un outil sans passer par les options : au bout d'un combat, la fouille s'invite */
function allumerWidget(k, ou){
  const r = reglageHub();
  if(!HUB_CLES[k] || r.off.indexOf(k) < 0) return false;
  r.off = r.off.filter(x => x !== k);
  (HUB_PLACES.indexOf(ou) >= 0 && ou !== 'off' ? r[ou] : r.d).push(k);
  poserReglageHub(r);
  return true;
}
/* le petit mot qui propose d'allumer un outil éteint, là où il manque */
function proposerWidget(k, mot){
  if(hubAllume(k)) return null;
  const w = el('p','mini');
  const b = el('button','btn ghost xs', mot); b.type = 'button'; b.id = 'hbAllumer-' + k;
  b.onclick = () => allumerWidget(k);
  w.append(b);
  return w;
}

/* ---------- poser les widgets ---------- */

/* une fois pour toutes : chaque panneau reçoit sa boîte, qui est sa place dans le rail */
function batirHub(){
  if(!$('hbG') || !$('hbReserve')) return;
  HUB_LISTE.forEach(w => {
    const e = $(w.id);
    if(!e || $('hbW-' + w.k)) return;
    const box = el('div','hbw');
    box.id = 'hbW-' + w.k;
    box.setAttribute('data-hbw', w.k);
    e.parentNode.insertBefore(box, e);
    box.append(e);
  });
  dessinerHub();
}
/* ranger un rail sans rien bouger quand c'est déjà bon : déplacer un nœud ferait perdre le curseur */
function rangerRail(rail, cles){
  const veut = cles.map(k => $('hbW-' + k)).filter(Boolean);
  const avant = [].slice.call(rail.children);
  if(avant.length === veut.length && avant.every((e, i) => e === veut[i])) return;
  veut.forEach(e => rail.append(e));
  avant.forEach(e => { if(veut.indexOf(e) < 0) $('hbReserve').append(e); });
}
function dessinerHub(){
  const jeu = $('seJeu'), g = $('hbG'), d = $('hbD'), cg = $('hbCoteG'), cd = $('hbCoteD');
  if(!jeu || !g || !d) return;
  const r = reglageHub();
  /* les deux rails du même côté : le rail de gauche déménage dans le côté droit, ou l'inverse */
  const dans = r.rails === 'dd' ? cd : cg;
  if(g.parentNode !== dans) dans.append(g);
  const dans2 = r.rails === 'gg' ? cg : cd;
  if(d.parentNode !== dans2) dans2.append(d);
  if(r.rails === 'dd' && g.nextSibling !== d && d.parentNode === cd) cd.insertBefore(g, d);
  if(r.rails === 'gg' && g.nextSibling !== d && d.parentNode === cg) cg.append(d);
  /* la carte « en grand » quitte son rail et prend toute la largeur, sous le récit */
  const grand = document.body.classList.contains('carteplein');
  rangerRail(g, grand ? r.g.filter(k => k !== 'carte') : r.g);
  if(grand && $('hbH')) rangerRail($('hbH'), r.h.filter(k => k !== 'carte'));
  rangerRail(d, grand ? r.d.filter(k => k !== 'carte') : r.d);
  const haut = $('hbH');
  if(haut){ rangerRail(haut, r.h); haut.hidden = !haut.children.length; }
  const bc = $('hbW-carte'), main = document.querySelector('.jeu-main');
  if(grand && bc && main && bc.parentNode !== main) main.insertBefore(bc, main.firstChild);
  r.off.forEach(k => { const b = $('hbW-' + k); if(b && b.parentNode !== $('hbReserve')) $('hbReserve').append(b); });
  jeu.style.setProperty('--lg', r.larg.g + 'px');
  jeu.style.setProperty('--ld', r.larg.d + 'px');
  jeu.setAttribute('data-rails', r.rails);
  const avant = document.body.classList.contains('hubplein');
  document.body.classList.toggle('hubplein', !!r.plein);
  document.documentElement.classList.toggle('hubplein', !!r.plein);
  if(r.plein && !avant) window.scrollTo(0, 0);
  g.hidden = !g.children.length;
  d.hidden = !d.children.length;
  const plein = c => [].slice.call(c.children).some(x => x.children.length);
  cg.hidden = !plein(cg);
  cd.hidden = !plein(cd);
}
/* le réglage relu du fichier : on ne garde que des noms d'outils qu'on connaît */
function normHub(o){
  if(!o || typeof o !== 'object') return null;
  const li = c => (Array.isArray(o[c]) ? o[c] : []).filter(k => HUB_CLES[k]).map(String);
  return {maj:+o.maj || 0, supprime:!!o.supprime, plein:!!o.plein,
    rails: HUB_RAILS.some(x => x.k === o.rails) ? o.rails : 'gd',
    larg: {g:largeurHub((o.larg || {}).g), d:largeurHub((o.larg || {}).d)},
    h:li('h'), g:li('g'), d:li('d'), off:li('off')};
}

/* ---------- les fenêtres ---------- */

function fermerFen(){
  /* le panneau du jet retourne sous le texte, et le compositeur oublie qu'il était ouvert */
  if(HUB.fen === 'action'){
    HUB.fen = '';
    COMPO.panneau = '';
    rendreLePanneau();
    dessinerCompositeur(true);
  }
  rendreLePrete();
  const f = $('hbFen');
  if(f) f.remove();
  HUB.fen = '';
  if(HUB.sorti && document.contains(HUB.sorti)){ try{ HUB.sorti.focus(); }catch(e){} }
  HUB.sorti = null;
}
/* un panneau prêté à la fenêtre retourne dans sa boîte, allumée ou non */
function rendreLePrete(){
  if(!HUB.prete) return;
  const e = $(idPanneau(HUB.prete)), box = $('hbW-' + HUB.prete) || $('hbReserve');
  if(e && box) box.append(e);
  HUB.prete = '';
}
function ouvrirFen(cle, titre, remplir){
  const sorti = HUB.sorti || (document.activeElement && document.activeElement.id && !$('hbFen') ? document.activeElement : null);
  fermerFen();
  HUB.sorti = sorti;
  HUB.fen = cle;
  const f = el('div','hbfen'); f.id = 'hbFen';
  f.onclick = ev => { if(ev.target === f) fermerFen(); };
  const b = el('div','hbfenin' + (cle === 'options' ? ' hblarge' : ''));
  b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true'); b.setAttribute('aria-label', titre);
  const t = el('div','ctete');
  t.append(el('p','ctitre', titre), el('span','espace'));
  const x = el('button','ax','×'); x.type = 'button'; x.id = 'hbFenFermer';
  x.setAttribute('aria-label', 'Fermer');
  x.onclick = () => fermerFen();
  t.append(x);
  b.append(t);
  const corps = el('div','hbcorps'); corps.id = 'hbCorps';
  b.append(corps);
  f.append(b);
  document.body.append(f);
  remplir(corps);
  const prem = b.querySelector('input,select,textarea,button:not(#hbFenFermer)');
  if(prem && !/^hbW-/.test(prem.id)) { try{ prem.focus(); }catch(e){} }
}
/* prêter un panneau du hub à la fenêtre ouverte */
function preter(k, corps){
  const e = $(idPanneau(k));
  if(!e) return false;
  rendreLePrete();
  HUB.prete = k;
  e.hidden = false;
  corps.append(e);
  return true;
}
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape' || $('ctFen')) return;
  if($('hbFen')){ e.preventDefault(); fermerFen(); return; }
  if(document.body.classList.contains('hubplein')){
    e.preventDefault();
    const r = reglageHub(); r.plein = false; poserReglageHub(r);
  }
});

/* ---------- Action : le jet, les dégâts, les PV, pour qui est choisi ---------- */

function ouvrirAction(quoi){
  ouvrirFen('action', 'Ce qu’il fait', corps => {
    COMPO.panneau = quoi === 'pv' ? 'pv' : 'jet';
    const seg = el('div','seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Jet ou PV');
    [['jet','Jet et dégâts','hbActJet'], ['pv','PV et PC','hbActPv']].forEach(([k, l, id]) => {
      const b = el('button', null, l); b.type = 'button'; b.id = id;
      b.setAttribute('aria-pressed', COMPO.panneau === k ? 'true' : 'false');
      b.onclick = () => { COMPO.panneau = k; dessinerCompositeur(true); ouvrirAction(k); };
      seg.append(b);
    });
    corps.append(el('p','mini', 'Pour ' + nomCompo() + '. Le paragraphe se joint au récit comme avant.'));
    const fr = blocFrappes(); if(fr) corps.append(fr);
    corps.append(seg);
    const pn = $('coPanneau');
    if(pn) corps.append(pn);
    dessinerCompositeur(true);
  });
}
const nomCompo = () => COMPO.qui.k === 'mj' ? 'le MJ' : (nomDe(COMPO.qui) || 'personne');
/* le panneau vit dans la fenêtre : il y retourne quand on le rouvre, et revient sous le texte à la fermeture */
function rendreLePanneau(){
  const pn = $('coPanneau'), c = $('seCompo');
  if(pn && c && pn.parentNode !== c) c.append(pn);
}

/* ---------- Un visage connu ?, l'oracle, les tirages ---------- */

function ouvrirVisage(){
  ouvrirFen('visage', 'Un visage connu ?', corps => {
    if(!preter('visage', corps)) corps.append(el('p','mini', 'L’oracle n’est pas là.'));
    dessinerOracle(true);
  });
}
function ouvrirOracle(){
  ouvrirFen('oracle', 'L’oracle', corps => {
    if(!preter('oracle', corps)) corps.append(el('p','mini', 'L’oracle n’est pas là.'));
    dessinerOracle(true);
    corps.append(blocTirerUneTable());
  });
}
/* les tables du Registre des Tirages, tirées d'ici, et écrites dans le récit si on veut */
function blocTirerUneTable(){
  const w = el('div','cbloc hbtir');
  const l = typeof tablesToutes === 'function' ? tablesToutes() : [];
  w.append(el('p','lab', 'Tirer dans une table'));
  if(!l.length){ w.append(el('p','mini', 'Aucune table : le Registre des Tirages en garde.')); return w; }
  const g = el('div','tajout');
  const s = el('select'); s.id = 'hbTabQuoi'; s.setAttribute('aria-label', 'Quelle table');
  l.forEach(t => s.add(new Option(t.nom, t.id)));
  if(l.some(t => t.id === HUB.tir)) s.value = HUB.tir; else HUB.tir = s.value;
  const t0 = () => uneTable(s.value);
  const col = el('select'); col.id = 'hbTabCol'; col.setAttribute('aria-label', 'Dans quelle colonne');
  const majCol = () => {
    const t = t0();
    col.innerHTML = '';
    col.hidden = !t || t.mode !== 'une';
    if(t && t.mode === 'une') t.cols.forEach(c => col.add(new Option(c.n, c.n)));
  };
  s.onchange = () => { HUB.tir = s.value; HUB.sort = null; majCol(); ouvrirOracle(); };
  majCol();
  const b = el('button','btn sm','Tirer'); b.type = 'button'; b.id = 'hbTabTirer';
  b.onclick = () => {
    const t = t0(); if(!t) return;
    HUB.sort = tirerTable(t, t.mode === 'une' ? col.value : null);
    ouvrirOracle();
  };
  g.append(s, col, b);
  w.append(g);
  if(HUB.sort){
    const r = el('div','tbsort');
    r.append(el('p','tbsortt', texteTirage(HUB.sort)));
    r.append(el('p','mini', HUB.sort.r.map(q => (HUB.sort.r.length > 1 ? q.col + ' ' : '') + q.n).join(' · ')));
    const a = el('div','acts');
    const ec = el('button','btn ghost xs','Écrire dans le récit'); ec.type = 'button'; ec.id = 'hbTabEcrire';
    ec.disabled = !seanceCourante();
    ec.onclick = () => {
      changer(() => noterDansSeance(HUB.sort.table + ' : ' + texteTirage(HUB.sort), 'note'));
      msgTable('Le tirage est dans le récit.', true);
      fermerFen();
    };
    a.append(ec);
    r.append(a);
    w.append(r);
  }
  return w;
}

/* l'historique des jets, et le tirage d'une rencontre : des fenêtres, plus des pavés */
function ouvrirJets(){
  ouvrirFen('jets', 'Les jets', corps => {
    if(!preter('jets', corps)){ corps.append(el('p','mini', 'Rien à montrer.')); return; }
    dessinerJets();
  });
}
function ouvrirTirage(){
  ouvrirFen('tirage', 'Tirer une rencontre', corps => {
    if(!preter('tirage', corps)){ corps.append(el('p','mini', 'Rien à tirer.')); return; }
    dessinerCombat(true);
  });
}

/* ---------- les ennemis en boutons ---------- */

function blocEnnemis(l, pnjs){
  const w = el('div','hbeux');
  l.forEach(a => w.append(boutonEnnemi({k:'adv', id:a.id, nom:a.nom, pv:a.pv, pvMax:a.pvMax, bas:aTerre(a), rang:a.rang})));
  (pnjs || []).forEach(p => {
    const pv = p.pv == null ? p.pvMax : p.pv;
    w.append(boutonEnnemi({k:'pnj', id:p.id, nom:p.nom || 'Sans nom', pv:pv, pvMax:p.pvMax, bas:p.pvMax > 0 && pv <= 0, rang:p.combat.rang}));
  });
  return w;
}
function boutonEnnemi(e){
  const z = unCombattant(e.k, e.id);
  const actif = z && estActif(z);
  const b = el('button','hbe' + (e.bas ? ' bas' : '') + (actif ? ' tour' : '') + (COMPO.cible === e.id ? ' visee' : ''));
  b.type = 'button';
  b.setAttribute('data-eux', e.id);
  b.setAttribute('aria-label', e.nom + (actif ? ', à lui de jouer' : '') + (e.bas ? ', à terre' : ', ' + e.pv + ' PV sur ' + e.pvMax));
  b.append(el('span','hben', e.nom));
  b.append(el('span','hbev', e.bas ? 'à terre' : e.pv + '/' + e.pvMax));
  if(e.pvMax > 0 && !e.bas) b.append(barrePv(e.pv, e.pvMax));
  b.onclick = () => ouvrirEnnemi(e.k, e.id);
  return b;
}
function ouvrirEnnemi(k, id){
  const a0 = k === 'adv' ? unAdversaire(id) : unPnj(id);
  /* tombé : on l'ouvre sur sa fouille */
  if(a0 && k === 'adv' && aTerre(a0) && !a0.fouille) FOU.id = id;
  ouvrirFen('eux:' + id, (a0 || {}).nom || 'En face', corps => remplirEnnemi(corps, k, id));
}
function remplirEnnemi(corps, k, id){
  const a = k === 'adv' ? unAdversaire(id) : unPnj(id);
  if(!a){ corps.append(el('p','mini', 'Il n’est plus là.')); return; }
  corps.append(k === 'adv' ? ligneAdversaire(a) : lignePnjCombat(a));
  if(k === 'adv' && aTerre(a)){
    const bt = blocButin();
    if(bt) corps.append(bt);
  }
}
/* la fenêtre d'un ennemi suit ce qui change : les PV, les états, le tour */
function majFenEnnemi(){
  if(HUB.fen.indexOf('eux:') !== 0) return;
  const id = HUB.fen.slice(4), corps = $('hbCorps');
  if(!corps) return;
  const a = unAdversaire(id), p = a ? null : unPnj(id);
  if(!a && !p){ fermerFen(); return; }
  if(occupe(corps)) return;
  corps.innerHTML = '';
  remplirEnnemi(corps, a ? 'adv' : 'pnj', id);
}

/* ---------- qui parle : chercher un PNJ plutôt que taper son nom ---------- */

function ouvrirChoixPnj(){
  ouvrirFen('pnj', 'Qui parle, qui agit', corps => {
    const q = el('input'); q.type = 'search'; q.id = 'hbPnjQ'; q.value = HUB.cherche;
    q.placeholder = 'Chercher un visage'; q.setAttribute('aria-label', 'Chercher un visage');
    q.oninput = () => { HUB.cherche = q.value; majListePnj(); };
    corps.append(q);
    const l = el('div','hbliste'); l.id = 'hbPnjListe';
    corps.append(l);
    majListePnj();
  });
}
/* ceux de la séance d'abord, puis tous les autres visages */
function visagesAPortee(){
  const e = seanceCourante();
  const vus = {}, out = [];
  const pousser = (p, ici) => { if(!p || vus[p.id]) return; vus[p.id] = 1; out.push({p:p, ici:ici}); };
  pnjsAuCombat().forEach(p => pousser(p, true));
  if(e) gensDeLaSeance(e.id).forEach(p => pousser(p, true));
  pnjs().filter(p => p.statut !== 'mort').forEach(p => pousser(p, false));
  return out;
}
function majListePnj(){
  const l = $('hbPnjListe'); if(!l) return;
  l.innerHTML = '';
  const q = cleNom(HUB.cherche);
  const tout = visagesAPortee().filter(x => !q || cleNom(x.p.nom).indexOf(q) >= 0 || cleNom(x.p.role || '').indexOf(q) >= 0);
  const brut = (HUB.cherche || '').trim();
  if(brut && !tout.some(x => cleNom(x.p.nom) === cleNom(brut))){
    const nb = el('button','hbpnj'); nb.type = 'button'; nb.id = 'hbPnjInconnu';
    nb.append(el('b', null, 'Parler au nom de « ' + brut + ' »'));
    nb.append(el('span','mini', 'un inconnu, sans fiche'));
    nb.onclick = () => { choisirQui({k:'pnj', id:'', nom:brut}); fermerFen(); const t = $('coTexte'); if(t) t.focus(); };
    l.append(nb);
  }
  if(!tout.length){
    if(!brut) l.append(el('p','mini', 'Personne pour l’instant : écris un nom pour un inconnu.'));
    return;
  }
  let titre = '';
  tout.slice(0, 60).forEach(x => {
    const t = x.ici ? 'Dans la séance' : 'Les autres visages';
    if(t !== titre){ titre = t; l.append(el('p','lab', t)); }
    const b = el('button','hbpnj'); b.type = 'button'; b.setAttribute('data-pnjchoix', x.p.id);
    b.append(el('b', null, x.p.nom || 'Sans nom'));
    const s = [x.p.role, x.p.lieu].filter(Boolean).join(', ');
    if(s) b.append(el('span','mini', s));
    b.onclick = () => {
      choisirQui({k:'pnj', id:x.p.id, nom:x.p.nom});
      fermerFen();
      const t2 = $('coTexte'); if(t2) t2.focus();
    };
    l.append(b);
  });
}

/* ---------- les options : allumer, éteindre, ranger ---------- */

function ouvrirOptions(){
  ouvrirFen('options', 'Ton hub', corps => dessinerOptions(corps));
}
function dessinerOptions(corps){
  const box = corps || $('hbCorps'); if(!box) return;
  const r = reglageHub();
  box.innerHTML = '';
  box.append(el('p','mini', 'Glisse un outil d’une colonne à l’autre, ou sers-toi des flèches du clavier. Le réglage est à toi : il suit ton nom de joueur dans la sauvegarde, d’un ordinateur à l’autre.'));
  /* les rails */
  const seg = el('div','seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Où sont les rails');
  HUB_RAILS.forEach(x => {
    const b = el('button', null, x.l); b.type = 'button'; b.id = 'hbRail-' + x.k;
    b.setAttribute('aria-pressed', r.rails === x.k ? 'true' : 'false');
    b.onclick = () => { r.rails = x.k; poserReglageHub(r); dessinerOptions(); };
    seg.append(b);
  });
  const pl = el('button','btn ghost sm' + (r.plein ? ' on' : ''), r.plein ? 'Quitter le plein écran' : 'Le hub en plein écran');
  pl.type = 'button'; pl.id = 'hbPlein';
  pl.setAttribute('aria-pressed', r.plein ? 'true' : 'false');
  pl.title = 'La page s’efface : il ne reste que le récit, la zone d’écriture et tes rails. Échap pour en sortir.';
  pl.onclick = () => { r.plein = !r.plein; poserReglageHub(r); dessinerOptions(); };
  seg.append(pl);
  box.append(seg);
  /* les largeurs */
  const lg = el('div','hblarg');
  [['g','Rail 1'], ['d','Rail 2']].forEach(([c, nom]) => {
    const d = el('label','hblargl');
    d.append(el('span','mini', nom + ' : ' + r.larg[c] + ' px'));
    const i = el('input'); i.type = 'range'; i.id = 'hbLarg-' + c;
    i.min = String(HUB_LARG.min); i.max = String(HUB_LARG.max); i.step = '10'; i.value = String(r.larg[c]);
    i.setAttribute('aria-label', 'Largeur du ' + nom.toLowerCase());
    i.oninput = () => { r.larg[c] = largeurHub(i.value); const j = $('seJeu'); if(j) j.style.setProperty(c === 'g' ? '--lg' : '--ld', r.larg[c] + 'px'); };
    i.onchange = () => { poserReglageHub(r); dessinerOptions(); };
    d.append(i);
    lg.append(d);
  });
  box.append(lg);
  /* les trois colonnes */
  const gr = el('div','hbgrille');
  [['h', 'Au-dessus du récit'], ['g', r.rails === 'gd' ? 'À gauche' : 'Rail 1'],
   ['d', r.rails === 'gd' ? 'À droite' : 'Rail 2'], ['off', 'Éteints']].forEach(([c, nom]) => {
    const col = el('div','hbcol'); col.setAttribute('data-col', c); col.id = 'hbCol-' + c;
    col.append(el('p','lab', nom));
    const liste = el('div','hbchips'); liste.setAttribute('data-col', c);
    r[c].forEach(k => liste.append(puceHub(k, c, r)));
    if(!r[c].length) liste.append(el('p','mini vide', 'rien ici'));
    col.append(liste);
    gr.append(col);
  });
  box.append(gr);
  const a = el('div','acts');
  const z = el('button','btn ghost sm','Remettre comme au départ'); z.type = 'button'; z.id = 'hbRaz';
  z.onclick = () => { oublierReglageHub(); dessinerOptions(); };
  a.append(z);
  box.append(a);
}
function puceHub(k, col, r){
  const w = HUB_CLES[k];
  const b = el('button','hbchip'); b.type = 'button';
  b.setAttribute('data-chip', k); b.setAttribute('data-col', col);
  b.append(el('span','hbgrip','⠿'), el('span', null, w ? w.n : k));
  const ouNom = {h:'au-dessus du récit', g:'dans le rail 1', d:'dans le rail 2', off:'éteint'};
  b.setAttribute('aria-label', (w ? w.n : k) + ', ' + ouNom[col] + '. Les flèches le déplacent.');
  b.onkeydown = ev => {
    const ordre = HUB_PLACES;
    const i = r[col].indexOf(k);
    if(ev.key === 'ArrowUp' || ev.key === 'ArrowDown'){
      ev.preventDefault();
      const j = i + (ev.key === 'ArrowUp' ? -1 : 1);
      if(j < 0 || j >= r[col].length) return;
      r[col].splice(i, 1); r[col].splice(j, 0, k);
      poserReglageHub(r); dessinerOptions(); viserPuce(k);
    }
    if(ev.key === 'ArrowLeft' || ev.key === 'ArrowRight'){
      ev.preventDefault();
      const j = ordre.indexOf(col) + (ev.key === 'ArrowLeft' ? -1 : 1);
      if(j < 0 || j >= ordre.length) return;
      r[col].splice(i, 1); r[ordre[j]].push(k);
      poserReglageHub(r); dessinerOptions(); viserPuce(k);
    }
  };
  b.onpointerdown = ev => prendreLaPuce(ev, b, k, col, r);
  return b;
}
function viserPuce(k){
  const b = document.querySelector('[data-chip="' + k + '"]');
  if(b) try{ b.focus(); }catch(e){}
}
/* le glissé-déposé, au doigt comme à la souris */
function prendreLaPuce(ev, b, k, col, r){
  if(ev.button != null && ev.button !== 0) return;
  ev.preventDefault();
  const depart = {x:ev.clientX, y:ev.clientY};
  let parti = false, fantome = null;
  const trou = el('div','hbtrou');
  const bouger = e2 => {
    if(!parti){
      if(Math.abs(e2.clientX - depart.x) + Math.abs(e2.clientY - depart.y) < 8) return;
      parti = true;
      HUB.glisse = k;
      fantome = b.cloneNode(true);
      fantome.className = 'hbchip hbvole';
      document.body.append(fantome);
      b.classList.add('hbpris');
    }
    fantome.style.left = (e2.clientX - 40) + 'px';
    fantome.style.top = (e2.clientY - 14) + 'px';
    const sous = document.elementFromPoint(e2.clientX, e2.clientY);
    const liste = sous && sous.closest ? sous.closest('.hbchips') : null;
    if(!liste){ if(trou.parentNode) trou.remove(); return; }
    const voisin = sous.closest('.hbchip');
    if(voisin && voisin !== b){
      const re = voisin.getBoundingClientRect();
      liste.insertBefore(trou, e2.clientY < re.top + re.height / 2 ? voisin : voisin.nextSibling);
    } else if(!trou.parentNode || trou.parentNode !== liste) liste.append(trou);
  };
  const lacher = e2 => {
    document.removeEventListener('pointermove', bouger);
    document.removeEventListener('pointerup', lacher);
    document.removeEventListener('pointercancel', lacher);
    if(fantome) fantome.remove();
    b.classList.remove('hbpris');
    HUB.glisse = null;
    if(!parti || !trou.parentNode){ trou.remove(); return; }
    const vers = trou.parentNode.getAttribute('data-col');
    const place = [].slice.call(trou.parentNode.children).filter(x => x.classList.contains('hbchip') || x === trou).indexOf(trou);
    trou.remove();
    const i = r[col].indexOf(k);
    if(i >= 0) r[col].splice(i, 1);
    const n = Math.max(0, Math.min(r[vers].length, place));
    r[vers].splice(n, 0, k);
    poserReglageHub(r);
    dessinerOptions();
    viserPuce(k);
  };
  document.addEventListener('pointermove', bouger);
  document.addEventListener('pointerup', lacher);
  document.addEventListener('pointercancel', lacher);
}

/* ---------- la barre du bas ---------- */

function brancherBarre(){
  const b = (id, fn) => { const e = $(id); if(e) e.onclick = fn; };
  b('hbAction', () => ouvrirAction(COMPO.panneau || 'jet'));
  b('hbVisage', () => ouvrirVisage());
  b('hbOracle', () => ouvrirOracle());
  b('hbOptions', () => ouvrirOptions());
  b('prTirer', () => tirerPriorites(false));
  b('hbJets', () => ouvrirJets());
  /* le lien « Les jets » du haut de page ouvre la fenêtre */
  const aj = document.querySelector('a[href="#secJets"]');
  if(aj) aj.onclick = ev => { ev.preventDefault(); ouvrirJets(); };
}
function dessinerBarre(){
  const a = $('hbAction');
  if(a) a.textContent = COMPO.qui.k === 'mj' ? 'Action' : 'Action de ' + (nomDe(COMPO.qui) || '').split(' ')[0];
  const v = $('hbVisage');
  if(v) v.disabled = !seanceCourante();
  /* les cartes du round se tirent d'ici tant qu'aucune n'est posée */
  const t = $('prTirer');
  if(t){
    const debout = ceuxQuiSeBattent().filter(DEBOUT).length;
    t.hidden = !!priorites() || !debout || !seanceCourante();
  }
}
/* ses attaques, dans la fenêtre « Action » : un PNJ se joue comme un personnage */
function blocFrappes(){
  const q = COMPO.qui;
  if(!q || (q.k !== 'pnj' && q.k !== 'adv')) return null;
  const z = unCombattant(q.k, q.id);
  if(!z) return null;
  const l = attaquesDe(z);
  if(!l.length) return null;
  const w = el('div','hbfrappes');
  w.append(el('p','lab', 'Ce qu’il sait faire'));
  const g = el('div','pact');
  l.forEach(atk => {
    const b = el('button','btn ghost xs', atk.n); b.type = 'button';
    b.disabled = !peutJouer(z);
    b.setAttribute('aria-label', b.disabled ? motPasSonTour(z) : (z.nom + ' frappe : ' + atk.n));
    if(b.disabled) b.title = motPasSonTour(z);
    b.onclick = () => { frapperPour(z, atk); ouvrirAction('jet'); };
    g.append(b);
  });
  w.append(g);
  return w;
}

/* ---------- le panneau « En face », à côté du récit ---------- */
function barrePv(cour, max){
  const b = el('div','abarre');
  const i = el('i', max && cour / max <= 0.34 ? 'bas' : null);
  i.style.width = (max ? Math.max(0, Math.min(1, cour / max)) * 100 : 0) + '%';
  b.append(i);
  return b;
}
function ligneAdversaire(a){
  const z = {k:'adv', id:a.id, nom:a.nom, cote:'eux', x:a, pv:a.pv, pvMax:a.pvMax, cartes:a.cartes};
  const tour = peutJouer(z);
  const w = el('div','aligne' + (aTerre(a) ? ' aterre' : '') + (COMPO.cible === a.id ? ' visee' : ''));
  w.setAttribute('data-adv', a.id);
  const t = el('div','atete');
  t.append(el('b','anom', a.nom), el('span','arang', 'rang ' + a.rang));
  if(!aTerre(a)){
    const v = el('button','btn ghost xs aviser', COMPO.cible === a.id ? 'Visé' : 'Viser'); v.type = 'button';
    v.disabled = !peutViser();
    v.setAttribute('aria-label', v.disabled ? motPasSonTour(monCombattant()) : 'Viser ' + a.nom + ' : les dégâts iront à lui');
    if(v.disabled) v.title = motPasSonTour(monCombattant());
    v.onclick = () => viser(a);
    t.append(v);
  } else if(!a.fouille){
    const f = el('button','btn ghost xs afouiller' + (FOU.id === a.id ? ' on' : ''), 'Fouiller'); f.type = 'button';
    f.setAttribute('aria-label', 'Fouiller ' + a.nom);
    f.onclick = () => ouvrirFouille(a);
    t.append(f);
  }
  const arme = ADV_SUPPR === a.id;
  const x = el('button','ax' + (arme ? ' danger' : ''), arme ? 'Retirer ?' : '×'); x.type = 'button';
  x.setAttribute('aria-label', arme ? 'Confirmer : retirer ' + a.nom : 'Retirer ' + a.nom + ' du combat');
  x.onclick = () => {
    if(arme){ ADV_SUPPR = ''; retirerAdversaire(a); return; }
    ADV_SUPPR = a.id; dessinerCombat(true);
    setTimeout(() => { if(ADV_SUPPR === a.id){ ADV_SUPPR = ''; dessinerCombat(true); } }, 4000);
  };
  t.append(x);
  w.append(t);
  w.append(el('p','mini ainfo', 'réduction ' + a.red + (a.cartes ? ' · ' + a.cartes + ' carte' + (a.cartes > 1 ? 's' : '') : '')));
  const pv = el('div','apv');
  pv.append(barrePv(a.pv, a.pvMax));
  pv.append(el('span','apvn', aTerre(a) ? 'à terre' : a.pv + '/' + a.pvMax + ' PV'));
  const mk = (lab, n) => {
    const b = el('button', null, lab); b.type = 'button';
    b.setAttribute('aria-label', (n < 0 ? 'Retirer ' + (-n) : 'Rendre ' + n) + ' PV à ' + a.nom);
    b.disabled = (n < 0 && a.pv <= 0) || (n > 0 && a.pv >= a.pvMax);
    b.onclick = () => changerPvAdversaire(a, n);
    return b;
  };
  const cmd = el('div','acmd');
  cmd.append(mk('−5', -5), mk('−1', -1), mk('+1', 1));
  pv.append(cmd);
  w.append(pv);
  const at = el('div','aatq');
  /* le type de l'attaque propre : celui du bestiaire (distance, spécial…), ou « magique » ; rien pour l'attaque de rang */
  const attaque = (ty, nom, detail, propre) => {
    const l = el('div','aat');
    const txt = el('div','aattxt');
    if(ty) txt.append(el('span','aty t' + ty.cls, ty.l));
    txt.append(el('b', null, nom), document.createTextNode(detail ? ' · ' + detail : ''));
    l.append(txt);
    const f = el('button','btn ghost xs','Frapper'); f.type = 'button';
    f.disabled = aTerre(a) || !tour;
    f.setAttribute('aria-label', !tour && !aTerre(a) ? motPasSonTour(z) : a.nom + ' frappe : ' + nom);
    if(!tour && !aTerre(a)) f.title = motPasSonTour(z);
    f.onclick = () => frapper(a, propre);
    l.append(f);
    at.append(l);
  };
  attaque(null, 'Attaque de rang', a.deg, false);
  if(a.a2) attaque(a.a2.ty || a.a2.t === 'mag' ? typeAttaque(a.a2) : null, a.a2.n, [a.a2.p, a.a2.e].filter(Boolean).join(' · '), true);
  w.append(at);
  /* son tour joué tout seul : son attaque, sa cible au hasard, ses dégâts lancés */
  if(!aTerre(a)){
    const j = el('button','btn ghost xs atour','Son tour'); j.type = 'button';
    j.disabled = !tour;
    j.setAttribute('aria-label', tour ? 'Jouer le tour de ' + a.nom + ' : son attaque, sa cible au hasard et ses dégâts' : motPasSonTour(z));
    if(!tour) j.title = motPasSonTour(z);
    j.onclick = () => jouerSonTour(z, indexCarte('adv', a.id));
    w.append(j);
  }
  if(a.traits || a.p) w.append(el('p','mini apart', [a.traits, a.p].filter(Boolean).join(' · ')));
  const mo = blocMort(z); if(mo) w.append(mo);
  w.append(blocEtats(z));
  if(aTerre(a)) fouilleSurLigne(a, w);
  return w;
}
function dessinerCombat(force){
  const box = $('seCombat'); if(!box) return;
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerCombat(true)); return; }
  box.innerHTML = '';
  const e = seanceCourante(), r = combatEnCours();
  ['seTour','seTirage','seButin'].forEach(id => { const b = $(id); if(b){ b.innerHTML = ''; b.hidden = true; } });
  box.hidden = !e && !ENVOI.attente;
  if(box.hidden){ majFenEnnemi(); return; }
  if(e && (r || priorites() || pnjsAuCombat().length)) poserAutour('seTour', blocPriorites(), box);
  if(!r){
    if(ENVOI.attente){
      box.append(el('p','ctitre', 'Une rencontre attend'));
      box.append(el('p','mini', listeNoms(ENVOI.attente.adversaires.map(a => a.n)) + '. Elle entre dans la séance en cours.'));
      const b = el('button','btn sm', e ? 'La poser dans la séance' : 'Commencer une séance et la poser'); b.type = 'button'; b.id = 'advAttente';
      b.onclick = () => { if(!seanceCourante()) nouvelleSeance(); lireEnvoi(); };
      box.append(b);
      return;
    }
    const eux0 = pnjsAuCombat().filter(p => p.combat.cote === 'eux');
    const t = el('div','ctete');
    t.append(el('p','ctitre', 'En face'), el('span','mini', eux0.length ? eux0.length + (eux0.length > 1 ? ' en face' : ' en face') : 'personne'));
    box.append(t);
    if(eux0.length) box.append(blocEnnemis([], eux0));
    poserAutour('seTirage', blocTirage(false), box);
    box.append(boutonTirage('Tirer une rencontre'));
    box.append(el('p','mini', 'Une rencontre validée dans le Registre des Rencontres arrive aussi ici toute seule.'));
    majFenEnnemi();
    return;
  }
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'En face'));
  const l = adversairesEnCombat();
  t.append(el('span','mini', l.filter(a => !aTerre(a)).length + ' debout sur ' + l.length));
  t.append(el('span','espace'));
  const arme = FIN_ARMEE === r.id;
  const fin = el('button','btn ghost sm' + (arme ? ' danger' : ''), arme ? 'Confirmer la fin' : 'Fin du combat'); fin.type = 'button'; fin.id = 'advFin';
  fin.onclick = () => {
    if(arme){ FIN_ARMEE = ''; finirCombat(); return; }
    FIN_ARMEE = r.id; dessinerCombat(true);
    setTimeout(() => { if(FIN_ARMEE === r.id){ FIN_ARMEE = ''; dessinerCombat(true); } }, 5000);
  };
  t.append(fin);
  box.append(t);
  rencontresEnCours().forEach(x => { if(x.pourquoi) box.append(el('p','mini cpourquoi', x.pourquoi)); });
  box.append(blocEnnemis(l, pnjsAuCombat().filter(p => p.combat.cote === 'eux')));
  poserAutour('seTirage', blocTirage(true), box);
  box.append(boutonTirage('Des renforts : en tirer'));
  poserAutour('seButin', blocButin(), box);
  majFenEnnemi();
}
/* tirer une rencontre : un bouton sous les ennemis, la table se tire dans sa fenêtre */
function boutonTirage(mot){
  const b = el('button','btn ghost xs','' + mot); b.type = 'button'; b.id = 'hbTirage';
  b.onclick = () => ouvrirTirage();
  return b;
}
/* un morceau du combat dans son widget, ou sous les ennemis quand le widget n'existe pas */
function poserAutour(id, bloc, repli){
  const b = $(id);
  if(b){ b.innerHTML = ''; b.hidden = !bloc; if(bloc) b.append(bloc); return; }
  if(bloc && repli) repli.append(bloc);
}

/* ---------- dans le récit et dans le Doc ---------- */
function corpsRencontre(b){
  const d = el('div','rencontre');
  const r = T.rencontres[b.rencontre];
  const l = r ? adversairesDe(r.id) : [];
  const tete = el('p','rt');
  tete.append(el('b', null, 'Rencontre'), document.createTextNode(r && !r.fini ? ' · combat en cours' : r ? ' · combat terminé' : ''));
  d.append(tete);
  if(l.length){
    const u = el('ul');
    l.forEach(a => {
      const li = el('li', aTerre(a) ? 'aterre' : null);
      li.append(el('b', null, a.nom), document.createTextNode(' · rang ' + a.rang + ' · ' + (aTerre(a) ? 'à terre' : a.pv + '/' + a.pvMax + ' PV')));
      u.append(li);
    });
    d.append(u);
  } else d.append(el('p', null, b.texte.split('\n')[0]));
  if(r && r.pourquoi) d.append(el('p','rp', r.pourquoi));
  if(r && r.fini && r.seance === (seanceCourante() || {}).id){
    const x = el('button','btn ghost sm noprint','Reprendre le combat'); x.type = 'button';
    x.onclick = () => reprendreCombat(r);
    d.append(x);
  }
  return d;
}
function lignesRencontre(b){
  const r = T.rencontres[b.rencontre];
  const l = r ? adversairesDe(r.id) : [];
  if(!l.length) return b.texte.split('\n');
  return ['Rencontre'].concat(l.map(a => a.nom + ' : rang ' + a.rang + ', ' + (aTerre(a) ? 'à terre' : a.pv + '/' + a.pvMax + ' PV') + ', réduction ' + a.red))
    .concat(r.pourquoi ? [r.pourquoi] : []);
}

window.addEventListener('storage', e => { if(e.key === CLE_ENVOI && e.newValue && $('seCombat')) lireEnvoi(); });
window.addEventListener('storage', e => { if(e.key === CT_CLE && e.newValue && $('seCarte')) lireEnvoiCarte(); });
