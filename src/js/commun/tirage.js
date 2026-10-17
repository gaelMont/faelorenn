/* ============ le tirage d'une rencontre : commun au Registre des Rencontres et au Registre de la Table ============
   Le budget vient du nombre de personnages et du genre de combat ; les adversaires viennent du livre et du
   bestiaire maison, filtrés par les familles retenues. L'état du tirage (S) et le bestiaire maison (MAISON,
   FAM_MAISON) appartiennent à la page qui s'en sert. */
const pick = a => a[Math.floor(Math.random() * a.length)];

const COUT = [0, 1, 2, 4, 8, 16];
const INTENSITES = [
  {k:'esc', l:'Escarmouche', pts:2, d:'deux points par personnage'},
  {k:'ser', l:'Sérieux',     pts:4, d:'quatre points par personnage'},
  {k:'mor', l:'Mortel',      pts:8, d:'huit points par personnage, quelqu’un peut y rester'}
];
const SOURCES = [
  {k:'tout',   l:'Le livre et les miennes'},
  {k:'livre',  l:'Le livre seul'},
  {k:'maison', l:'Les miennes seules'}
];
const RANG = {};
ADV.rangs.forEach(r => RANG[r.r] = r);

/* les entrées du livre portent leur identifiant, écrit dans le bestiaire (livre-loup) : il ne bouge pas quand
   l'ordre des entrées change. Ceux de l'ancien bestiaire (livre-2-2) ne mènent plus nulle part */
const LIVRE = Object.create(null);
for(let r = 1; r <= 5; r++) ADV.creatures[r].forEach(c => { c.src = 'livre'; c.r = r; LIVRE[c.id] = c; });
const ANCIEN_ID = /^livre-[1-5]-\d{1,2}$/;

/* les creatures, les familles et les tables de butin maison, remplies par la page */
let MAISON = [];
let FAM_MAISON = [];
let TABLES_BUTIN = [];

/* ---------- les entrées du livre que tu as retouchées ----------
   Une retouche porte l'identifiant de l'entrée (livre-loup) et prend sa place partout : tirages, bestiaire,
   table. L'entrée telle que le livre l'écrit reste gardée ici, pour « Revenir au livre ».
   Une retouche dont l'entrée n'existe plus (l'ancien bestiaire) ne s'applique nulle part : elle attend
   qu'on en fasse une créature à soi, ou qu'on l'efface. */
const ORIGINAUX = Object.create(null);
for(let r = 1; r <= 5; r++) ADV.creatures[r].forEach(c => { ORIGINAUX[c.id] = JSON.parse(JSON.stringify(c)); });
let RETOUCHES = [];
let ANCIENNES = [];
function livreParId(id){ return LIVRE[id || ''] || null; }
const estRetouche = c => !!c && !!livreParId(c.id);
const estAncienne = c => !!c && /^livre-/.test(c.id || '') && !livreParId(c.id);
const CHAMPS_RETOUCHE = ['n','t','tr','p','a2','mod','renf','desc','ou','veut','fuit','butin','notes'];
function appliquerRetouches(){
  for(let r = 1; r <= 5; r++) ADV.creatures[r].forEach(c => {
    const o = ORIGINAUX[c.id];
    Object.keys(c).forEach(k => { if(!(k in o)) delete c[k]; });
    Object.assign(c, JSON.parse(JSON.stringify(o)));
  });
  RETOUCHES.forEach(x => {
    const c = livreParId(x.id);
    if(!c) return;
    CHAMPS_RETOUCHE.forEach(k => { if(x[k] !== undefined) c[k] = JSON.parse(JSON.stringify(x[k])); });
    c.retouche = true; c.maj = x.maj || 0;
  });
}
/* les tables de butin qu'une créature porte, du livre ou à toi */
function tablesDe(c){ const id = c && c.id; return id ? TABLES_BUTIN.filter(t => (t.qui || []).indexOf(id) >= 0) : []; }

/* ---------- les familles : celles du livre, en deux lignes (la catégorie, la sous-catégorie), puis les tiennes ---------- */
function familles(){ return ADV.familles.concat(FAM_MAISON); }
function famille(k){ return ADV.familles.find(f => f.k === k) || FAM_MAISON.find(f => f.k === k) || null; }
function estMaisonFam(k){ return FAM_MAISON.some(f => f.k === k); }
/* la ligne d'une famille : cat, sous, ou maison pour les tiennes (et celles qu'on n'a pas encore lues) */
function groupeFam(k){ const f = ADV.familles.find(x => x.k === k); return f ? f.g : 'maison'; }
function lignesFamilles(){
  return ADV.groupes.map(g => ({g:g.g, l:g.l, fams:ADV.familles.filter(f => f.g === g.g)}))
    .concat([{g:'maison', l:'Tes familles', fams:FAM_MAISON.slice()}]);
}
/* un menu des familles, rangé comme les lignes */
function remplirFamilles(sel, marque){
  lignesFamilles().forEach(L => {
    if(!L.fams.length) return;
    const og = document.createElement('optgroup'); og.label = L.l;
    L.fams.forEach(f => og.append(new Option(f.l + (marque && L.g === 'maison' ? ' (à toi)' : ''), f.k)));
    sel.append(og);
  });
}
/* tes creatures entrent dans une famille par leurs etiquettes,
   celles du livre entrent dans une famille maison par la liste de la famille */
function membre(c, k){
  if((c.t || []).indexOf(k) >= 0) return true;
  if(c.src !== 'livre') return false;
  const f = FAM_MAISON.find(x => x.k === k);
  return !!(f && f.livre.indexOf(c.id) >= 0);
}
function famillesDe(c){ return familles().filter(f => membre(c, f.k)); }

/* ---------- etat de la rencontre ---------- */

const intensite = () => INTENSITES.find(i => i.k === S.inten) || INTENSITES[1];
const budget = () => S.pj * intensite().pts;
const depense = () => S.liste.reduce((a, x) => a + COUT[x.r], 0);
const compte = r => S.liste.filter(x => x.r === r).length;

/* ---------- le catalogue : le livre et les creatures maison ---------- */
function toutRang(r){ return ADV.creatures[r].concat(MAISON.filter(c => c.r === r)); }
function catalogue(r){
  if(S.source === 'livre') return ADV.creatures[r].slice();
  if(S.source === 'maison') return MAISON.filter(c => c.r === r);
  return toutRang(r);
}
function trouveId(id){
  for(let r = 1; r <= 5; r++){ const c = ADV.creatures[r].find(x => x.id === id); if(c) return c; }
  return MAISON.find(x => x.id === id) || null;
}
/* ce que vaut une creature une fois ses ajustements appliques */
function statsDe(c){
  const base = RANG[c.r], m = c.mod || {};
  const num = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : +v;
  return {
    pv:     num(m.pv)     != null ? num(m.pv)     : base.pv,
    red:    num(m.red)    != null ? num(m.red)    : base.red,
    cartes: num(m.cartes) != null ? num(m.cartes) : base.cartes,
    deg:    (m.deg && String(m.deg).trim()) ? String(m.deg).trim() : base.deg
  };
}
function effetDe(c, st){ return c.a2 && c.a2.e ? c.a2.e.replace(/le dé du rang/g, st.deg) : ''; }

/* ---------- tirage ---------- */
/* les familles retenues : d'une ligne à l'autre il faut les deux (un Humanoïde Hors-la-loi),
   dans une même ligne l'un ou l'autre suffit (une Bête ou une Chimère) */
function passeFamilles(c, choix){
  choix = choix || S.fam || [];
  if(!choix.length) return true;
  const par = {};
  choix.forEach(k => { const g = groupeFam(k); (par[g] = par[g] || []).push(k); });
  return Object.keys(par).every(g => par[g].some(k => membre(c, k)));
}
/* et tout le catalogue du rang si le filtre ne laisse personne */
function vivier(r){
  const tout = catalogue(r);
  if(!S.fam || !S.fam.length) return {liste:tout, force:false};
  const f = tout.filter(c => passeFamilles(c));
  return f.length ? {liste:f, force:false} : {liste:tout, force:true};
}
function rangsDisponibles(){
  const out = [];
  for(let r = 1; r <= 5; r++){ const v = vivier(r); if(!v.force && v.liste.length) out.push(r); }
  return out;
}
function entree(c, r){
  return {r:r, n:c.n, p:c.p, pv:statsDe(c).pv, id:Math.random().toString(36).slice(2, 8), cid:c.id};
}
/* on evite de tirer deux fois la meme creature dans un meme rang */
function creature(r, evite){
  let pool = vivier(r).liste;
  if(!pool.length) pool = toutRang(r);
  if(!pool.length) pool = ADV.creatures[r];
  const pris = evite || S.liste.filter(x => x.r === r).map(x => x.cid);
  const libres = pool.filter(c => pris.indexOf(c.id) < 0);
  return entree(pick(libres.length ? libres : pool), r);
}
function ajouter(r){ S.liste.push(creature(r)); }
function retirer(r){
  for(let i = S.liste.length - 1; i >= 0; i--){ if(S.liste[i].r === r){ S.liste.splice(i, 1); return; } }
}
const plusGros = b => { for(let i = 5; i >= 1; i--) if(COUT[i] <= b) return i; return 0; };
function plusGrosDispo(b){
  const ok = rangsDisponibles();
  for(let i = 5; i >= 1; i--) if(COUT[i] <= b && ok.indexOf(i) >= 0) return i;
  return plusGros(b);
}

function grandir(reste, rangsOk){
  let garde = 0;
  while(reste > 0 && garde++ < 60){
    const ordre = S.liste.map((a, i) => i).sort((x, y) => S.liste[x].r - S.liste[y].r);
    let fait = false;
    for(const i of ordre){
      const r0 = S.liste[i].r;
      for(let r = 5; r > r0; r--){
        const diff = COUT[r] - COUT[r0];
        if(diff <= reste && rangsOk.indexOf(r) >= 0){ S.liste[i] = creature(r); reste -= diff; fait = true; break; }
      }
      if(fait) break;
    }
    if(!fait) break;
  }
  return reste;
}

function tirerComposition(){
  const B = budget();
  S.liste = [];
  if(B < 1) return;
  let reste = B;
  const ok = rangsDisponibles();
  const add = (r, n) => { for(let i = 0; i < n; i++){
    if(r >= 1 && COUT[r] <= reste && S.liste.length < 12 && ok.indexOf(r) >= 0){ ajouter(r); reste -= COUT[r]; }
  } };
  /* dernier recours : on termine le budget meme hors des familles retenues */
  const addForce = r => { if(r >= 1 && COUT[r] <= reste && S.liste.length < 12){ ajouter(r); reste -= COUT[r]; } };
  const forme = pick(['solo','duo','chef','bande','melange','melange']);

  if(forme === 'solo'){
    add(plusGrosDispo(reste), 1);
  } else if(forme === 'duo'){
    const r = plusGrosDispo(Math.floor(reste / 2));
    add(r || 1, 2);
  } else if(forme === 'chef'){
    const r = plusGrosDispo(reste);
    add(r, 1);
    const s = Math.max(1, r - 2);
    add(s, Math.min(6, Math.floor(reste / COUT[s])));
  } else if(forme === 'bande'){
    const r = Math.max(1, plusGrosDispo(reste) - 2);
    add(r, Math.min(8, Math.floor(reste / COUT[r])));
  } else {
    let garde = 0;
    while(reste > 0 && S.liste.length < 8 && garde++ < 40){
      const hi = plusGrosDispo(reste);
      add(1 + Math.floor(Math.random() * hi), 1);
    }
  }
  let garde = 0;
  while(reste > 0 && S.liste.length < 12 && garde++ < 40) addForce(plusGrosDispo(reste));
  /* douze au plus : quand la place manque, on fait grandir les plus petits,
     dans les familles retenues d'abord, hors d'elles en dernier recours */
  reste = grandir(reste, ok);
  if(reste > 0) reste = grandir(reste, [1, 2, 3, 4, 5]);

  S.liste.sort((a, b) => b.r - a.r);
  S.pourquoi = pick(ADV.pourquoi);
}

/* ---------- ce qu'un adversaire tiré emporte à la table ----------
   Ses valeurs, son attaque propre, ses familles (l'endroit du butin s'en devine) et ce qu'il laisse,
   quand c'est une des tiennes. Porté par l'envoi du Registre des Rencontres comme par le tirage de la table. */
function adversaireEnvoye(a){
  const c = trouveId(a.cid) || {r:a.r, n:a.n, p:a.p};
  const st = statsDe(c);
  const pv = a.pv == null || isNaN(+a.pv) ? st.pv : Math.max(0, Math.min(+a.pv, st.pv));
  return {n:c.n || a.n, r:a.r, pvMax:st.pv, pv:pv, red:st.red, deg:st.deg, cartes:st.cartes,
    a2: c.a2 && c.a2.n ? {n:c.a2.n, t:c.a2.el ? 'mag' : (c.a2.t || 'phy'), p:porteeDe(c.a2), e:effetDe(c, st), el:c.a2.el || '', ty:c.a2.ty || ''} : null,
    tr:(c.tr || []).slice(), traits:nomsTraits(c), p:c.p || '', renf:c.renf || '',
    cid:c.id || a.cid || '', fam:(c.t || []).slice(), butin:c.butin || '',
    tables:tablesDe(c).map(t => ({k:t.k, l:t.l, lignes:t.lignes}))};
}
