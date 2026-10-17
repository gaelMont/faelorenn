/* ============ ce que dit le livre, et rien d'autre ============ */

const ALLSKILLS = [];
CARS.forEach(c => SKILLS[c].forEach(s => ALLSKILLS.push({s:s, car:c})));
const CAR_DE = {};
ALLSKILLS.forEach(o => CAR_DE[o.s] = o.car);

const GESTE = {'Force':'Combat', 'Dextérité':'Tir'};
const ABR_JET = {'Force':'FOR', 'Dextérité':'DEX', 'Intelligence':'INT', 'Sagesse':'SAG', 'Charisme':'CHA', 'Contenance':'CNT'};
const JETS_SANS = ['aucun jet', 'la cible teste', 'les cibles testent'];
/* Le 07/10, chaque liste de Pratiques a pris UNE caractéristique de lanceur (livre, « 5 · Les Pratiques »). Une fiche faite
   avant garde, sur ses Pratiques, le jet que le livre donnait alors : normPerso le remet au nouveau, mais seulement s'il vaut
   encore l'ancien. Un jet changé à la main n'est jamais touché, et rien d'autre que ces douze entrées. */
const JETS_REALIGNES = [
  {n:'Le dard', de:'Dextérité', vers:'Contenance'},
  {n:'Écorcer', de:'Force', vers:'Contenance'},
  {n:'Saumure', de:'Dextérité', vers:'Force'},
  {n:'Amarre', de:'Dextérité', vers:'Force'},
  {n:'Phalange', de:'Dextérité', vers:'Force'},
  {n:'Muer', de:'Contenance', vers:'Force'},
  {n:'La Braise Jetée', de:'Dextérité', vers:'Contenance'},
  {n:'Le Choc', de:'Contenance', vers:'Dextérité'},
  {n:'Onde de choc', de:'Contenance', vers:'Dextérité'},
  {n:'Éclat de roche', de:'Dextérité', vers:'Force'},
  {n:'L’Éclat', de:'Dextérité', vers:'Force'},
  /* Givrer perd son jet de lanceur : la liste commune des trois branches n'en a pas. Son texte suit, s'il est resté celui du livre */
  {n:'Givrer', de:'Contenance', vers:'la cible teste',
   txtDe:'à vue. Une flaque, une surface, une gourde gèle. Sur une créature mouillée, elle perd son déplacement au round suivant.',
   txtVers:'à vue. Une flaque, une surface, une gourde gèle. Une créature mouillée tente un jet de FOR. Échec, elle perd son déplacement au round suivant.'}
];
/* « Le dard » et « Dard », « L'Éclat » et « L’Éclat » : la même Pratique, écrite avant ou après le livre */
const clePratRealigne = n => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’]/g, "'").trim().replace(/^(le |la |les |l')\s*/, '');

/* les trois modificateurs du livre */
const MODS = [
  {k:'0',   l:'Rien de particulier', d20:0,  d100:0},
  {k:'+',   l:'Les circonstances t’aident', d20:4, d100:20},
  {k:'-',   l:'C’est difficile', d20:-4, d100:-20},
  {k:'--',  l:'C’est quasiment impossible', d20:-8, d100:-40}
];

const d20v = t => Math.floor(t / 5);
const near = n => Math.floor(n);

/* un dé, et une formule du genre 2d6+2 */
function de(faces){ return 1 + Math.floor(Math.random() * faces); }
function lancerFormule(f){
  const m = /^\s*(\d*)\s*d\s*(\d+)\s*(?:([+\-])\s*(\d+))?\s*$/i.exec(String(f || ''));
  if(!m) return null;
  const n = Math.min(20, Math.max(1, +(m[1] || 1))), faces = +m[2];
  if(faces < 2 || faces > 100) return null;
  const des = [];
  for(let i = 0; i < n; i++) des.push(de(faces));
  const bonus = m[3] ? (m[3] === '-' ? -1 : 1) * (+m[4]) : 0;
  return {des:des, bonus:bonus, total:des.reduce((a, b) => a + b, 0) + bonus,
    txt:n + 'd' + faces + (bonus ? (bonus > 0 ? '+' + bonus : bonus) : '')};
}

/* la résolution, telle que le Livre II l'écrit */
function resoudre(jet, seuil, mode){
  const cent = mode === 'd100';
  const critique = cent ? jet <= 5 : jet === 1;
  const echecCrit = cent ? jet >= 96 : jet === 20;
  const reussite = !echecCrit && (critique || jet < seuil);
  const marge = reussite ? 0 : Math.max(1, jet - seuil);
  let bande = '';
  if(!reussite){
    if(echecCrit) bande = 'Échec critique.';
    else if(cent) bande = marge <= 10 ? 'Ça ne marche pas, et rien de mauvais n’arrive.'
      : marge <= 30 ? 'Ça ne marche pas, et ça coûte : du temps, du matériel, une position.'
      : 'Ça ne marche pas, et la situation empire.';
    else bande = marge <= 2 ? 'Ça ne marche pas, et rien de mauvais n’arrive.'
      : marge <= 6 ? 'Ça ne marche pas, et ça coûte : du temps, du matériel, une position.'
      : 'Ça ne marche pas, et la situation empire.';
  } else if(critique) bande = cent ? 'Réussite critique.' : 'Réussite critique : dégâts doublés en combat.';
  return {reussite:reussite, critique:critique, echecCrit:echecCrit, marge:marge, bande:bande};
}

/* le coût d'une progression, Livre II */
function coutCompetence(de1, vers){
  let n = 0;
  for(let v = de1 + 1; v <= vers; v++) n += v <= 40 ? 1 : v <= 60 ? 2 : 3;
  return n;
}
const ACHATS = [
  {k:'comp', l:'Une compétence'},
  {k:'prat', l:'Apprendre une Pratique', cout:10},
  {k:'car',  l:'Une caractéristique de +1', cout:20},
  {k:'pv',   l:'+5 PV', cout:20}
];
/* la lance d'un Cornu : on ne la change pas, on la refait. À chaque mue elle remonte d'un cran,
   avec du métal d'une ruine, une forge, et dix points de progression */
const LANCES = [
  {de:'d8', nom:'Sa lance de première mue'},
  {de:'d10', nom:'Sa lance de tribu'},
  {de:'d12', nom:'Sa lance à contrepoids', notes:'deux mains, un Cornu qui a mué trois fois au moins'}
];
/* ce que paie une mission (Livre V) : la paie et les points de progression, annoncés par le Havre avant le départ */
const MISSIONS = [
  {k:'observer', l:'Observer et noter', n:1, paie:'2 ors'},
  {k:'escorter', l:'Escorter, récupérer, négocier', n:2, paie:'5 ors'},
  {k:'releve', l:'Un relevé complet', n:3, paie:'5 ors'},
  {k:'erosion', l:'Une Érosion', n:5, paie:'10 ors'},
  {k:'personne', l:'Ce que personne n’a voulu prendre', n:5, paie:'15 ors'}
];
/* le générateur de mission du Livre VIII : un d20 par colonne. Les deux premières donnent la commande,
   les trois suivantes donnent la partie */
const GEN_MISSION = {
  qui:['Ton Havre', 'Un autre Havre, par racine', 'La Bannière de l’Or', 'La Bannière du Sang', 'L’Église d’Ysse',
    'Une école de magie', 'Une Maison élytris', 'Un village sans Havre', 'Une Tournée ilvè', 'Un clan ciméran de passage',
    'Un Marchefleur disparu, par un mot laissé', 'Une famille, sur ses propres deniers', 'Un pilleur de ruines', 'Un enfant',
    'Personne : tu l’as vu toi-même', 'Un scribe qui a trouvé une incohérence', 'Un batelier qui tait qui paie',
    'Une Maison rivale de celle qui est visée', 'Un ancien de ton Havre, à titre privé', 'Quelqu’un qui n’a pas le droit de demander'],
  demande:['Éteindre une Floraison', 'Décider si elle mérite d’être éteinte', 'Trouver ce qui la nourrit', 'Escorter quelqu’un',
    'Escorter quelque chose, sans savoir quoi', 'Retrouver une personne', 'Retrouver un objet', 'Vérifier un relevé qui ne colle pas',
    'Évacuer un hameau', 'Négocier un passage', 'Réparer une racine coupée', 'Rapporter ou recharger un catalyseur',
    'Cartographier une zone sourde', 'Ramener un corps', 'Faire taire une rumeur', 'Prouver qu’une Floraison n’existe pas',
    'Empêcher quelqu’un d’en éteindre une', 'Récupérer un registre avant un autre Havre', 'Porter un message qui ne doit pas s’écrire',
    'Rester sur place et noter, trois semaines'],
  ou:['Une ville ouverte', 'Un hameau de la Plaine', 'Sous la canopée', 'Au pied d’un arbre-mère', 'Une bordure de région instable',
    'En plein dans une région instable', 'Une zone sourde', 'Une mine', 'Un gué, sur le grand fleuve', 'Un port', 'En mer, à bord',
    'Sur l’île céleste', 'Une ruine de l’Avant', 'Un col de montagne', 'Un Havre, à l’intérieur', 'Un marais',
    'Une route, entre deux villes', 'Un chantier de la Bannière de l’Or', 'Un camp ciméran', 'Un endroit que personne ne sait nommer'],
  complication:['Quelqu’un d’autre est déjà sur place', 'Le commanditaire ment sur l’essentiel', 'Le délai est deux fois trop court',
    'Une seconde Floraison apparaît en route', 'Le lieu commence à marquer quelqu’un de l’équipe', 'La zone passe en air mort',
    'Il y a des enfants', 'La Bannière du Sang ferme la route', 'Le péage a triplé', 'Un Ilvès veut brûler la zone',
    'La preuve a été détruite avant toi', 'Le seul témoin est un Ciméran en morne', 'La Floraison est utile à quelqu’un',
    'Ta baguette ou ton catalyseur casse', 'On te suit depuis le départ', 'Il faut choisir entre deux urgences',
    'Le lieu est interdit, officiellement', 'Trois jours d’immobilisation, la météo', 'Une dette ancienne resurgit',
    'Rien ne complique, et c’est ça qui inquiète'],
  cache:['Ce n’est pas une Floraison', 'Il y en a deux, et elles sont reliées', 'Le commanditaire l’a provoquée', 'Quelqu’un la nourrit exprès',
    'Elle protège l’endroit de pire qu’elle', 'Elle s’érode déjà, personne ne l’a vu', 'La disparition est volontaire',
    'Le disparu est mort avant la demande', 'Le registre a été falsifié, et bien', 'Deux Havres se disputent le dossier',
    'Une école veut le lieu, pas le problème', 'C’est un piège, mais pas pour toi', 'Le prix demandé n’est qu’un prétexte',
    'On veut que tu échoues là précisément', 'L’objet n’a jamais existé', 'La victime est le coupable',
    'Le lieu recouvre une ruine de l’Avant', 'Le commanditaire est mourant', 'C’est déjà arrivé ici, il y a longtemps',
    'Il n’y a rien de caché. Vraiment rien.']
};
/* ce qu'on demande, et le genre de mission qu'on devine derrière (le Livre V ne les relie pas : c'est une proposition) */
const GEN_GENRE = ['erosion','releve','releve','escorter','escorter','escorter','escorter','releve','escorter','escorter',
  'escorter','escorter','observer','escorter','escorter','releve','personne','escorter','escorter','observer'];

/* les domaines des Pratiques : la matière, l'armure l'arrête ; l'énergie la traverse */
const DOMAINES = [
  {k:'seve', l:'la Sève', sorte:'mat'}, {k:'eau', l:'l’eau', sorte:'mat'}, {k:'pierre', l:'la pierre', sorte:'mat'},
  {k:'vent', l:'le vent', sorte:'mat'}, {k:'mue', l:'la Mue', sorte:'mat'},
  {k:'feu', l:'le feu', sorte:'feu'}, {k:'onde', l:'l’onde', sorte:'nrj'}, {k:'ombre', l:'l’ombre', sorte:'nrj'}, {k:'sacre', l:'le sacré', sorte:'nrj'}
];
/* « de la Sève (Écorciens et Élytris) » donne seve */
function domaineCle(s){
  const mots = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z]+/);
  const d = DOMAINES.find(x => mots.indexOf(x.k) >= 0);
  return d ? d.k : '';
}

/* ---------- l'argent et le marché, Livre V ----------
   1 or = 10 argents. Tout se compte en argents et s'écrit en ors et argents. Les prix sont ceux du livre,
   recopiés tels quels ; la baguette d'école n'y est pas, elle ne se vend jamais. */
const ARGENTS_PAR_OR = 10;
function texteArgent(n){
  n = Math.round(+n || 0);
  const a = Math.abs(n), o = Math.floor(a / ARGENTS_PAR_OR), r = a % ARGENTS_PAR_OR;
  if(!a) return '0 argent';
  return (n < 0 ? '−' : '') + [o ? o + ' or' + (o > 1 ? 's' : '') : '', r ? r + ' argent' + (r > 1 ? 's' : '') : ''].filter(Boolean).join(' ');
}
/* « 12 argents », « 3 ors », « 1 or et 5 argents », « 1,5 or » ; null quand rien ne se lit, ou qu'on hésite
   (« 20 à 40 argents ») : rien ne se verse tout seul sur une somme qui n'est pas dite */
function argentsDe(t){
  const s = String(t || '').toLowerCase();
  if(/\d\s*(?:à|a|-|–|ou)\s*\d/.test(s)) return null;
  let n = 0, vu = false;
  s.replace(/(\d+(?:[.,]\d+)?)\s*ors?(?![\p{L}\p{N}])/gu, (m, x) => { n += parseFloat(x.replace(',', '.')) * ARGENTS_PAR_OR; vu = true; return m; });
  s.replace(/(\d+)\s*argents?(?![\p{L}\p{N}])/gu, (m, x) => { n += +x; vu = true; return m; });
  return vu ? Math.round(n) : null;
}
const MARCHE = {
  armes: [
    {nom:'Arme légère', ex:'dague, couteau de jet, bâton, gourdin, fronde', de:'d4', prix:5},
    {nom:'Arme à une main', ex:'épée courte, hache de bûcheron, lance, masse légère, gaffe de batelier', de:'d6', prix:20},
    {nom:'Arc court', ex:'tir monté, tir en mouvement', de:'d6', prix:20},
    {nom:'Arc de chasse', ex:'l’arc du paquetage', de:'d6', prix:30},
    {nom:'Arc long', ex:'12 en Force pour le bander', de:'d8', prix:60},
    {nom:'Arme de guerre', ex:'épée longue, masse d’armes, hache de guerre, fléau', de:'d8', prix:40},
    {nom:'Arbalète', ex:'arbalète de poing, arbalète de siège', de:'d8', notes:'dégâts au mod DEX', prix:80},
    {nom:'Arme à deux mains', ex:'grande hache, marteau de forge, épieu, faux de guerre', de:'d10', prix:50},
    {nom:'Lance ori’ican de première mue', ex:'', de:'d8', prix:40, lance:true},
    {nom:'Lance ori’ican de tribu', ex:'', de:'d10', prix:60, lance:true},
    {nom:'Lance ori’ican à contrepoids', ex:'deux mains', de:'d12', prix:120, lance:true}
  ],
  armures: [
    {nom:'Cuir, matelassé', sorte:'armure', red:1, prix:20, alias:['cuir matelassé', 'matelassé']},
    {nom:'Cuir clouté, écailles cousues', sorte:'armure', red:2, prix:50, alias:['cuir clouté', 'écailles cousues']},
    {nom:'Maille', sorte:'armure', red:3, prix:120, alias:['maille', 'cotte de mailles']},
    {nom:'Plates', sorte:'armure', red:4, prix:400, alias:['plates', 'armure de plates']},
    {nom:'Bouclier', sorte:'bouclier', red:1, prix:30, alias:['bouclier']}
  ],
  consommables: [
    {nom:'Fiole de Havre', effet:'Rends 1d6 PV', prix:8, soin:{q:'pv', f:'1d6'}},
    {nom:'Pot de braises', effet:'Allume n’importe quoi, catalyseur de secours pour un Eshar', prix:4},
    {nom:'Poudre d’écorce', effet:'Réduction 1 pendant un combat', prix:6},
    {nom:'Sel d’Ysse', effet:'Retire une altération d’état', prix:15},
    {nom:'Éclat de totem', effet:'Rend 1 PC, une seule fois, puis la pierre est morte', prix:60, soin:{q:'pc', f:'1'}},
    {nom:'Huile d’onction', effet:'Un allié ne tombe pas sous 1 PV au prochain combat', prix:150}
  ],
  depenses: [
    {nom:'Un repas', prix:1},
    {nom:'Un lit en commun', prix:2},
    {nom:'Une chambre', prix:5},
    {nom:'Un péage de l’Or', prix:1, note:'par personne, 5 argents par charrette'}
  ]
};

/* ---------- l'oracle : une question fermée, sa plausibilité, un d20 ----------
   Six réponses, du pire au meilleur, comme l'oracle de la SoloTaisie. Les seuils du site sont les nôtres (85, 70,
   50, 30 et 15 % de oui) : ceux de votre kit se règlent sur la page et vivent dans la table, dans votre dépôt privé.
   Chaque ligne donne le dernier nombre des cinq premières réponses ; « Oui, et en plus » va jusqu'à 20. */
const REPONSES_ORACLE = [
  {k:'nonEt', l:'Non, et en plus', oui:false},
  {k:'non', l:'Non', oui:false},
  {k:'nonMais', l:'Non, mais par contre', oui:false},
  {k:'ouiMais', l:'Oui, mais par contre', oui:true},
  {k:'oui', l:'Oui', oui:true},
  {k:'ouiEt', l:'Oui, et en plus', oui:true}
];
const PLAUSIBLES = [
  {k:'tres', l:'Très plausible'},
  {k:'plaus', l:'Plausible'},
  {k:'neutre', l:'Neutre'},
  {k:'peu', l:'Peu plausible'},
  {k:'trespeu', l:'Très peu plausible'}
];
const SEUILS_SITE = {tres:[1,2,3,5,16], plaus:[1,4,6,8,17], neutre:[2,8,10,12,18], peu:[3,12,14,16,19], trespeu:[4,15,17,18,19]};
/* cinq bornes, de 0 à 20, qui ne redescendent jamais ; sinon rien */
function bornesOk(b){
  if(!Array.isArray(b) || b.length !== 5) return null;
  const x = b.map(v => Math.round(+v));
  if(x.some(v => !isFinite(v) || v < 0 || v > 20)) return null;
  for(let i = 1; i < 5; i++) if(x[i] < x[i - 1]) return null;
  return x;
}
function reponseDe(bornes, d){
  const i = bornes.findIndex(x => d <= x);
  return REPONSES_ORACLE[i < 0 ? 5 : i];
}
