/* ============ les traits : ils remplissent la creature a ta place ============
   Chaque trait vient d'une entree du livre, citee dans « modele ». Ce qui va plus loin
   que le livre porte valider:true et se retrouve dans le brouillon des traits. */

const ELEMENTS = [
  {k:'seve',   l:'Sève',   de:'de sève',   matiere:true,  modele:'la Mante de sève'},
  {k:'eau',    l:'Eau',    de:"d'eau",     matiere:true,  modele:'la règle de l’armure'},
  {k:'pierre', l:'Pierre', de:'de pierre', matiere:true,  modele:'la règle de l’armure'},
  {k:'vent',   l:'Vent',   de:'de vent',   matiere:true,  modele:'la règle de l’armure'},
  {k:'mue',    l:'Mue',    de:'de Mue',    matiere:true,  modele:'la règle de l’armure'},
  {k:'feu',    l:'Feu',    de:'de feu',    matiere:false, modele:'l’Ilvès renégat'},
  {k:'onde',   l:'Onde',   de:"d'onde",    matiere:false, modele:'le Praticien de Zhern'},
  {k:'ombre',  l:'Ombre',  de:"d'ombre",   matiere:false, modele:'le Sanglier d’ombre'},
  {k:'sacre',  l:'Sacré',  adj:{m:'sacré', f:'sacrée'}, matiere:false, modele:'la règle de l’armure'}
];
const ELEM = {};
ELEMENTS.forEach(e => ELEM[e.k] = e);

const DES = [4, 6, 8, 10, 12];
/* le cran de dé au-dessus : d4 devient d6, d6+2 devient d8+2 */
function cran(de, n){
  const m = /^(\d*)d(\d+)(.*)$/i.exec(String(de || '').trim());
  if(!m) return String(de || '');
  const i = DES.indexOf(+m[2]);
  const face = i < 0 ? +m[2] : DES[Math.min(DES.length - 1, i + (n || 1))];
  return (m[1] || '') + 'd' + face + (m[3] || '');
}
function rangNom(r, pluriel){
  const n = RANG[r] ? RANG[r].nom : '';
  return pluriel && n && !/x$/.test(n) ? n + 's' : n;
}

const TRAITS = [
  /* ---------- sa façon d'attaquer : celles qui blessent ---------- */
  {k:'coup', g:'facon', sub:'blesse', l:'Frapper fort', n:'Coup puissant', ne:['Frappe','f'], p:'contact', t:'phy',
   e:x => cran(x.deg) + ", mais il ne se déplace pas du round", modele:'le Golem de chantier', valider:true},
  {k:'balayer', g:'facon', sub:'blesse', l:'Balayer', n:'Balayage', ne:['Vague','f'], p:'contact', t:'phy',
   e:() => 'le dé du rang, sur deux cibles côte à côte', modele:'le Gamin armé d’une faux'},
  {k:'charge', g:'facon', sub:'blesse', l:'Charger', n:'Charge', ne:['Charge','f'], p:'10 pas', t:'phy',
   e:() => 'le dé du rang, et il traverse tout ce qui est sur le chemin', modele:'le Cerf-roi altéré'},
  {k:'tir', g:'facon', sub:'blesse', l:'Tirer', n:'Tir', ne:['Trait','m'], p:'10 pas', t:'phy',
   e:() => 'le dé du rang', modele:'le Rôdeur de bordure'},
  {k:'souffle', g:'facon', sub:'blesse', l:'Souffler', n:'Volée', ne:['Souffle','m'], p:'5 pas', t:'phy',
   e:() => 'le dé du rang, sur tous ceux qui sont devant lui, une fois tous les trois rounds', modele:'l’Ilvès renégat', valider:true},
  {k:'pique', g:'facon', sub:'blesse', l:'Fondre d’en haut', n:'Piqué', ne:null, p:"d'en haut", t:'phy',
   e:() => 'le dé du rang, puis il reprend de la hauteur', modele:'le Corbeau de Floraison'},
  {k:'surgir', g:'facon', sub:'blesse', l:'Surgir', n:'Surgir', ne:null, p:'contact', t:'phy',
   e:() => "le dé du rang, et personne ne l'a vu venir", modele:'l’Ours de brume'},
  {k:'pieger', g:'facon', sub:'blesse', l:'Piéger', n:'Déclencher un piège', ne:['Piège','m'], p:'à vue', t:'phy',
   e:() => 'le dé du rang, sur qui marche là où il a posé', modele:'le Braconnier de Floraison'},
  {k:'repousser', g:'facon', sub:'blesse', l:'Repousser', n:'Encorner', ne:['Poussée','f'], p:'contact', t:'phy',
   e:() => 'le dé du rang, et la cible recule de 10 pas', modele:'l’Aurochs de mythril'},

  /* ---------- sa façon d'attaquer : celles qui changent la scène ---------- */
  {k:'saisir', g:'facon', sub:'scene', l:'Saisir', n:'Serrer', ne:['Étreinte','f'], p:'contact', t:'phy',
   e:() => "aucun dégât, la cible ne se dégage qu'à un jet de FOR", modele:'le Chien de ferme altéré'},
  {k:'tomber', g:'facon', sub:'scene', l:'Faire tomber', n:'Croc-en-jambe', ne:null, p:'contact', t:'phy',
   e:() => 'aucun dégât, la cible tombe', modele:'le Bandit de route'},
  {k:'desarmer', g:'facon', sub:'scene', l:'Désarmer', n:'Désarmer', ne:null, p:'contact', t:'phy',
   e:() => "aucun dégât, la cible lâche son arme", modele:'le Chien de guerre du Sang'},
  {k:'derober', g:'facon', sub:'scene', l:'Dérober', n:'Détrousser', ne:null, p:'contact', t:'phy',
   e:() => 'aucun dégât, il emporte un objet et fuit', modele:'le Rat de ruine'},
  {k:'appeler', g:'facon', sub:'scene', l:'Appeler', n:'Appeler', ne:null, p:'aucune', t:'phy',
   e:() => 'aucun dégât, 1d4 Nuisances arrivent', modele:'la Bête-mère', valider:true},
  {k:'envoyer', g:'facon', sub:'scene', l:'Envoyer devant', n:'Envoyer devant', ne:null, p:'aucune', t:'phy',
   e:() => "aucun dégât, ceux qui l'accompagnent attaquent à sa place", modele:'le Capitaine du Sang', min:3, requiert:['escorte'], valider:true},
  {k:'eteindre', g:'facon', sub:'scene', l:'Éteindre', n:'Éteindre', ne:null, p:'à vue', t:'mag',
   e:() => 'aucun dégât, toutes les lumières meurent pour 3 rounds', modele:'Ce qui vit dans les cales'},
  {k:'refaire', g:'facon', sub:'scene', l:'Se refaire', n:'Se refaire', ne:null, p:'aucune', t:'mag',
   e:() => 'aucun dégât, il récupère 1d4 PV', modele:'la Bête de Floraison végétale'},
  {k:'sceller', g:'facon', sub:'scene', l:'Sceller', n:'Poser un sceau', ne:null, p:'à vue', t:'mag',
   e:() => 'aucun dégât, une porte se ferme ou une arme reste au fourreau', modele:'le Scelleur véreux'},
  {k:'otage', g:'facon', sub:'scene', l:'Prendre en otage', n:'Prendre en otage', ne:null, p:'contact', t:'phy',
   e:() => "aucun dégât, il tient quelqu'un devant lui", modele:'le Chef de bande'},

  /* ---------- son corps ---------- */
  {k:'blinde', g:'corps', l:'Blindé', red:r => r + 1, excl:['carapace'], modele:'le Golem de chantier et l’Aurochs de mythril'},
  {k:'carapace', g:'corps', l:'Carapace', excl:['blinde'], phrase:r => 'Réduction ' + (r + 1) + ' de face, 0 de dos', modele:'la Mante de sève'},
  {k:'lourde', g:'corps', l:'Frappe lourde', cran:1, modele:'le Gamin armé d’une faux'},
  {k:'volant', g:'corps', l:'Volant', phrase:() => "Il vole : entre deux attaques il reprend de la hauteur, et une chute ne lui fait rien",
   modele:'le Corbeau de Floraison et la règle des chutes', valider:true},
  {k:'cache', g:'corps', l:'Caché', phrase:() => "On ne le voit pas tant qu'il n'attaque pas", modele:'le Sanglier d’ombre'},
  {k:'nuee', g:'corps', l:'Nuée', phrase:() => "Les armes ne lui font rien. Le feu, le vent et l'eau le dispersent d'un coup",
   modele:'la Nuée de mouches de sève'},
  {k:'repousse', g:'corps', l:'Il repousse', phrase:() => 'Il récupère 1d4 PV par round tant que la Floraison brûle encore',
   modele:'la Bête de Floraison végétale'},
  {k:'lumiere', g:'corps', l:'Craint la lumière', phrase:() => 'Une lumière vive le fige un round', modele:'le Sanglier d’ombre'},
  {k:'craintfeu', g:'corps', l:'Craint le feu', phrase:() => 'Le feu compte double contre lui', modele:'l’Écorcien qui a brûlé'},

  /* ---------- sa conduite ---------- */
  {k:'meute', g:'conduite', l:'En meute', phrase:() => "Il n'attaque jamais seul, et jamais de face", modele:'le Loup de bordure'},
  {k:'lache', g:'conduite', l:'Lâche', phrase:() => "Il se rend dès qu'il tombe sous la moitié de ses PV", modele:'le Pilleur isolé'},
  {k:'gardien', g:'conduite', l:'Gardien', phrase:() => "Il ne poursuit personne au-delà de ce qu'il garde", modele:'le Golem de chantier'},
  {k:'meneur', g:'conduite', l:'Meneur', min:2,
   phrase:r => 'Les ' + rangNom(r - 1, true) + " autour de lui gagnent +2 aux dégâts tant qu'il tient debout",
   modele:'le Sergent du Sang', valider:true},
  {k:'escorte', g:'conduite', l:'Escorte', min:3, renf:r => 'Il arrive avec quatre ' + rangNom(r - 2, true),
   modele:'le Capitaine du Sang', valider:true},
  {k:'furieux', g:'conduite', l:'Furieux',
   phrase:() => "Il ne peut plus s'arrêter. Il frappe l'allié le plus proche si aucun ennemi n'est à portée", modele:'l’Ori’Ican en fureur'},
  {k:'cupide', g:'conduite', l:'Cupide', phrase:() => 'Il attaque toujours celui qui porte le sac le plus lourd', modele:'le Bandit de route'},
  {k:'monnayable', g:'conduite', l:'Monnayable', phrase:() => "Il change de camp si on lui offre ce qu'il veut",
   modele:'le Rôdeur de bordure et le Déserteur', valider:true},
  {k:'instable', g:'conduite', l:'Instable', phrase:() => "S'il tombe, ce qu'il porte éclate : 1d6 sur tout ce qui l'entoure",
   modele:'le Contrebandier', valider:true}
].concat(ELEMENTS.map(e => ({k:e.k, g:'element', l:e.l, modele:e.modele})));

const TRAIT = {};
TRAITS.forEach(t => TRAIT[t.k] = t);
/* quand il n'y a qu'un élément et aucune façon : une frappe de cet élément, au contact */
const FRAPPE_ELEM = {n:'Frappe', ne:['Frappe','f'], p:'contact', t:'mag', e:() => 'le dé du rang'};

const GROUPES = [
  {g:'facon', l:'Sa façon d’attaquer', sous:[{k:'blesse', l:'qui blessent'}, {k:'scene', l:'qui changent la scène'}], seul:true},
  {g:'element', l:'Ce qui l’anime', seul:true, vide:'Rien de magique',
   aide:'Sève, eau, pierre, vent et Mue : l’armure les arrête. Feu, onde, ombre et sacré : ils la traversent.'},
  {g:'corps', l:'Son corps'},
  {g:'conduite', l:'Sa conduite'}
];

function traitsDe(c){ return (c.tr || []).map(k => TRAIT[k]).filter(Boolean); }
function nomsTraits(c){ return traitsDe(c).map(t => t.l).join(' · '); }
function traitPossible(t, r){ return !t.min || r >= t.min; }

/* le nom d'une attaque, avec ou sans élément */
function nomAttaque(f, el){
  if(!el || !f.ne) return f.n;
  const base = f.ne[0], genre = f.ne[1];
  return base + ' ' + (el.de || el.adj[genre]);
}
/* la portée telle qu'on la lit, avec l'élément (quand le nom de l'attaque ne le dit pas déjà) et ce que l'armure
   en fait. Un élément que le bestiaire laisse ouvert (au choix, celui de la Floraison) : l'armure selon l'élément */
function porteeDe(a2){
  if(!a2) return '';
  const p = a2.p || '';
  const e = a2.el && ELEM[a2.el];
  const nomEl = e ? (e.k === 'seve' || e.k === 'mue' ? e.l : e.l.toLowerCase()) : String(a2.elt || '').trim();
  /* l'armure ne dit rien d'une attaque qui ne blesse pas */
  if(!nomEl || /aucun dégât/i.test(a2.e || '')) return p;
  const sans = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const dit = !!e && sans(a2.n).indexOf(sans(nomEl)) >= 0;
  const armure = e ? (e.matiere ? 'l’armure l’arrête' : 'traverse l’armure') : 'l’armure selon l’élément';
  return p + (p ? ' · ' : '') + (dit ? '' : nomEl + ', ') + armure;
}
/* le type d'une attaque tel qu'on l'écrit : celui du bestiaire (corps à corps · perforant, distance, spécial),
   sinon physique ou magique. cls donne la couleur : phy, mag, ou spe pour ce qui ne blesse pas */
const TYPE_ATQ = Object.create(null);
(ADV.types || []).forEach(x => { TYPE_ATQ[x.k] = x; });
function typeAttaque(a2){
  const x = a2 && a2.ty ? TYPE_ATQ[a2.ty] : null;
  if(x) return {cls:x.l === 'spécial' ? 'spe' : x.t, l:x.l};
  return a2 && a2.t === 'mag' ? {cls:'mag', l:'magique'} : {cls:'phy', l:'physique'};
}

/* ---------- ce que les traits donnent, pour cette créature ---------- */
function produitTraits(c){
  const tr = traitsDe(c), rg = RANG[c.r] || RANG[2];
  const out = {a2:null, red:'', deg:'', phrases:{}, renfs:{}};
  tr.forEach(t => {
    if(t.red) out.red = String(t.red(c.r));
    if(t.cran) out.deg = cran(rg.deg, t.cran);
  });
  tr.forEach(t => {
    if(t.phrase) out.phrases[t.k] = t.phrase(c.r);
    if(t.renf) out.renfs[t.k] = t.renf(c.r);
  });
  const fa = tr.find(t => t.g === 'facon'), el = tr.find(t => t.g === 'element');
  if(fa || el){
    const f = fa || FRAPPE_ELEM;
    const e = el ? ELEM[el.k] : null;
    out.a2 = {n:nomAttaque(f, e), p:f.p, t:e ? 'mag' : f.t, e:f.e({r:c.r, deg:out.deg || rg.deg}), el:e ? e.k : ''};
  }
  return out;
}

/* ---------- appliquer un changement sans écraser ce que tu as écrit ---------- */
function memeA2(a, b){
  if(!a || !b) return false;
  return a.n === b.n && a.p === b.p && a.t === b.t && a.e === b.e && (a.el || '') === (b.el || '');
}
function a2Vide(a){ return !a || (!String(a.n || '').trim() && !String(a.e || '').trim()); }
function oterPhrase(txt, ph){
  let t = txt || '';
  if(!ph || t.indexOf(ph) < 0) return t;
  let out = t.replace('. ' + ph, '');
  if(out === t) out = t.replace(ph + '. ', '');
  if(out === t) out = t.replace(ph, '');
  return out.replace(/\s{2,}/g, ' ').replace(/^[\s.]+/, '').trim();
}
function ajouterPhrase(txt, ph){
  const base = String(txt || '').replace(/[\s.]+$/, '').trim();
  return base ? base + '. ' + ph : ph;
}
function retoucherTexte(txt, avant, apres){
  let t = String(txt || '');
  Object.keys(avant).forEach(k => {
    if(!(k in apres)) t = oterPhrase(t, avant[k]);
    else if(apres[k] !== avant[k] && t.indexOf(avant[k]) >= 0) t = t.split(avant[k]).join(apres[k]);
  });
  Object.keys(apres).forEach(k => { if(!(k in avant) && t.indexOf(apres[k]) < 0) t = ajouterPhrase(t, apres[k]); });
  return t;
}
function appliquerProduit(c, avant, apres, force){
  force = force || {};
  if(force.a2 || a2Vide(c.a2) || memeA2(c.a2, avant.a2))
    c.a2 = apres.a2 ? Object.assign({}, apres.a2) : {n:'', t:'phy', p:'contact', e:'', el:''};
  ['red', 'deg'].forEach(k => {
    if(force[k] || c.mod[k] === '' || c.mod[k] === avant[k]) c.mod[k] = apres[k];
  });
  c.p = retoucherTexte(c.p, avant.phrases, apres.phrases);
  c.renf = retoucherTexte(c.renf, avant.renfs, apres.renfs);
}

/* la liste des traits une fois nettoyée : un seul par groupe unique, rien d'impossible à ce rang */
function trierTraits(tr, r){
  const out = [];
  tr.forEach(k => {
    const t = TRAIT[k];
    if(!t || !traitPossible(t, r) || out.indexOf(k) >= 0) return;
    out.push(k);
  });
  /* ce qui exige un autre trait tombe si celui-ci n'est plus là */
  return out.filter(k => {
    const t = TRAIT[k];
    return !t.requiert || t.requiert.every(q => out.indexOf(q) >= 0);
  });
}
