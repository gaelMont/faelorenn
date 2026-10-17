/* ====== la promenade : marcher dedans, à hauteur d'homme ======
   Le même plan, vu d'un mètre septante du sol. On y marche, on ne dessine pas. Tout est tracé dans un canevas,
   en aplats de couleur : les murs viennent des pièces, les trous des portes, les étages des escaliers. */

const PR_OEIL = 1.7, PR_RAYON = .3, PR_PAS = 3.2, PR_COURSE = 6.4, PR_VUE = 190, PR_FOV = 72;
const PR_CIEL = '#cfe0e8', PR_SOL = '#b9c69a';
const PR = {on:false, x:0, y:0, yaw:0, pitch:0, fl:0, k:Object.create(null), cv:null, ctx:null,
  raf:0, t:0, F:[], murs:[], grille:null, esc:[], ent:[], froid:0, msg:'', msgT:0, pile:[], souris:null, pad:0};
const prOn = () => PR.on;

/* ---------- un peu de géométrie ---------- */
const prOmbre = (col, f) => shade(col, f);
function prFace(F, pts, col, sol){ F.push({p:pts, c:col, s:sol ? pts[0][2] : null}); }
/* un pan de mur droit, d'un bout à l'autre, entre deux hauteurs */
function prPan(F, a, b, z0, z1, col){
  if(z1 <= z0) return;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if(Math.abs(dx) + Math.abs(dy) < .01) return;
  const f = Math.abs(dx) > Math.abs(dy) ? .94 : .8;
  prFace(F, [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], prOmbre(col, f));}
function prBoule(F, cx, cy, rx, ry, z0, h, col){
  prBoite(F, isoCercle(cx, cy, rx * .7, ry * .7, 10), z0, z0 + h * .32, shade(col, .92), false);
  prBoite(F, isoCercle(cx, cy, rx, ry, 12), z0 + h * .32, z0 + h * .68, col, false);
  prBoite(F, isoCercle(cx, cy, rx * .62, ry * .62, 10), z0 + h * .68, z0 + h, shade(col, 1.08));}
function prBoite(F, q, z0, z1, col, dessus){
  for(let i = 0; i < q.length; i++) prPan(F, q[i], q[(i + 1) % q.length], z0, z1, col);
  if(dessus !== false) prFace(F, q.map(p => [p[0], p[1], z1]), prOmbre(col, 1.04));}
function prToit3(F, q, z, h, type, col){
  if(type === 'aucun') return;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const c = [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
  if(type === 'plat'){ prFace(F, q.map(p => [p[0], p[1], z + .25]), prOmbre(col, 1)); return; }
  if(type === 'conique'){
    for(let i = 0; i < 4; i++) prFace(F, [[q[i][0], q[i][1], z], [q[(i + 1) % 4][0], q[(i + 1) % 4][1], z], [c[0], c[1], z + h]], prOmbre(col, i % 2 ? .82 : .98));
    return;}
  const long = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) >= Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1]);
  const a = long ? mid(q[1], q[2]) : mid(q[0], q[1]);
  const b = long ? mid(q[3], q[0]) : mid(q[2], q[3]);
  const f1 = long ? [q[0], q[1], a, b] : [q[1], q[2], b, a];
  const f2 = long ? [q[2], q[3], b, a] : [q[3], q[0], a, b];
  prFace(F, [[f1[0][0], f1[0][1], z], [f1[1][0], f1[1][1], z], [f1[2][0], f1[2][1], z + h], [f1[3][0], f1[3][1], z + h]], prOmbre(col, .98));
  prFace(F, [[f2[0][0], f2[0][1], z], [f2[1][0], f2[1][1], z], [f2[2][0], f2[2][1], z + h], [f2[3][0], f2[3][1], z + h]], prOmbre(col, .78));
  const t1 = long ? [q[1], q[2], a] : [q[2], q[3], b], t2 = long ? [q[3], q[0], b] : [q[0], q[1], a];
  prFace(F, [[t1[0][0], t1[0][1], z], [t1[1][0], t1[1][1], z], [t1[2][0], t1[2][1], z + h]], prOmbre(col, .88));
  prFace(F, [[t2[0][0], t2[0][1], z], [t2[1][0], t2[1][1], z], [t2[2][0], t2[2][1], z + h]], prOmbre(col, .88));}
/* un mur percé : les pans de part et d'autre des ouvertures, le linteau au-dessus, l'allège en dessous */
function prMurPerce(F, M, a, b, haut, col, ouv, coupes){
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if(L < .02) return;
  const trous = [];
  for(const o of ouv){
    const x = isoSurFace(a, b, o);
    if(x) trous.push(x);}
  /* un mur tracé posé sur ce bord le remplace, comme en relief */
  for(const k of (coupes || [])){const c = isoCoupe(a, b, k); if(c) trous.push(c)}
  trous.sort((p, q) => p.t0 - q.t0);
  const pt = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  let t = 0;
  for(const o of trous){
    const t0 = Math.max(t, Math.max(0, Math.min(1, o.t0))), t1 = Math.max(0, Math.min(1, o.t1));
    if(t1 <= t){ continue; }
    if(t0 > t){ prPan(F, pt(t), pt(t0), 0, haut, col); M.push([pt(t), pt(t0)]); }
    if(o.h0 > .05) prPan(F, pt(t0), pt(t1), 0, Math.min(o.h0, haut), col);          /* l'allège d'une fenêtre */
    if(o.h1 < haut) prPan(F, pt(t0), pt(t1), Math.min(o.h1, haut), haut, col);      /* le linteau */
    if(o.h0 > .05) M.push([pt(t0), pt(t1)]);                                        /* une fenêtre arrête, une porte non */
    t = t1;}
  if(t < 1){ prPan(F, pt(t), pt(1), 0, haut, col); M.push([pt(t), pt(1)]); }}

/* ---------- le décor d'un étage ---------- */
function prDecorBatiment(b, fi){
  const F = [], M = [], esc = [];
  const Fl = b.floors[fi];
  if(!Fl) return {F:F, M:M, esc:esc};
  const ouv = isoOuvertures(Fl);
  const segsM = murSegs(Fl);          /* les murs qu'on voit, pour raboter les meubles qui les chevauchent */
  const coupes = [];
  for(const it of Fl.items) if(it.t === 'wall') for(const k of wallSegs({items:[it]})) coupes.push(k);
  const sol = [];
  for(const it of Fl.items){
    if(it.t !== 'room') continue;
    const pts = isoContour(it), trou = isoTrou(it);
    const rk = RK[it.kind] || RK.piece;
    sol.push(pts);
    const dedans = !ISO_SANS_MUR[it.kind];
    /* un anneau (une galerie autour d'une cour) : quatre bandes, et le trou laissé libre */
    const bandes = trou ? [[pts[0], [pts[1][0], pts[1][1]], [trou[1][0], trou[1][1]], [trou[0][0], trou[0][1]]],
        [[pts[1][0], pts[1][1]], [pts[2][0], pts[2][1]], [trou[2][0], trou[2][1]], [trou[1][0], trou[1][1]]],
        [[pts[2][0], pts[2][1]], [pts[3][0], pts[3][1]], [trou[3][0], trou[3][1]], [trou[2][0], trou[2][1]]],
        [[pts[3][0], pts[3][1]], [pts[0][0], pts[0][1]], [trou[0][0], trou[0][1]], [trou[3][0], trou[3][1]]]] : [pts];
    if(rk.f !== 'none') for(const q of bandes) prFace(F, q.map(p => [p[0], p[1], .01]), prOmbre(rk.f, .96), true);
    if(dedans) for(const q of bandes) prFace(F, q.map(p => [p[0], p[1], ISO_HM]), '#cdc3ab');   /* le plafond */
    if(dedans){
      for(let i = 0; i < pts.length; i++) prMurPerce(F, M, pts[i], pts[(i + 1) % pts.length], ISO_HM, '#e6dcc2', ouv, coupes);
      if(trou) for(let i = 0; i < trou.length; i++) prMurPerce(F, M, trou[i], trou[(i + 1) % trou.length], ISO_HM, '#e6dcc2', ouv, coupes);}
    if(it.kind === 'cour') prCour(F, M, it, ouv);}
  for(const it of Fl.items){
    if(it.t === 'wall'){
      /* droit ou courbe, comme sur le plan */
      const f = murApl(it);
      for(let i = 0; i + 1 < f.length; i++) prMurPerce(F, M, f[i], f[i + 1], it.k === 'bas' ? 1.1 : ISO_HM, '#ded1b0', ouv);}
    else if(it.t === 'furn'){
      const d = FD[it.k] || {w:1, h:1};
      const h = ISO_HF[it.k] || .8, col = ISO_CF[it.k] || '#d9c9a3';
      const rond = ISO_ROND[it.k], rx = d.w / 2, ry = d.h / 2;
      const rab = p2 => isoRaboter(p2, it.x, it.y, segsM);
      if(rond === 'plante'){
        prBoite(F, rab(isoCercle(it.x, it.y, rx * .42, ry * .42, 8)), .02, h * .3, '#9a7a52', false);
        prBoule(F, it.x, it.y, rx, ry, h * .3, h * .7, '#8fae6e');
      } else if(rond === 'bassin'){
        prBoite(F, rab(isoCercle(it.x, it.y, rx, ry, 14)), .02, h, '#cfc6b2', false);
        prFace(F, isoCercle(it.x, it.y, rx * .8, ry * .8, 14).map(p => [p[0], p[1], h - .06]), '#a9c5d3');
        prBoite(F, isoCercle(it.x, it.y, rx * .16, ry * .16, 8), h - .06, h + .55, '#cfc6b2');
      } else if(rond === 'tonneau'){
        prBoite(F, isoCercle(it.x, it.y, rx * .82, ry * .82, 12), .02, h * .16, shade(col, .94), false);
        prBoite(F, isoCercle(it.x, it.y, rx, ry, 12), h * .16, h * .84, col, false);
        prBoite(F, isoCercle(it.x, it.y, rx * .82, ry * .82, 12), h * .84, h, shade(col, .94));
      } else if(rond) prBoite(F, rab(isoCercle(it.x, it.y, rx, ry, 12)), .02, h, col);
      else prBoite(F, rab(isoQuad(it.x, it.y, d.w, d.h, it.r || 0)), .02, h, col);
      if(h > .4){
        const q = isoQuad(it.x, it.y, d.w, d.h, it.r || 0);
        for(let i = 0; i < 4; i++) M.push([q[i], q[(i + 1) % 4]]);}}
    else if(it.t === 'stair'){
      const n = 9, h = ISO_HE * .92, d = it.dir || 'n', vert = d === 'n' || d === 's';
      for(let i = 0; i < n; i++){
        const u0 = i / n, u1 = (i + 1) / n;
        const mont = (d === 'n' || d === 'w') ? n - i : i + 1;
        const q = vert ? [[it.x, it.y + it.h * u0], [it.x + it.w, it.y + it.h * u0], [it.x + it.w, it.y + it.h * u1], [it.x, it.y + it.h * u1]]
          : [[it.x + it.w * u0, it.y], [it.x + it.w * u1, it.y], [it.x + it.w * u1, it.y + it.h], [it.x + it.w * u0, it.y + it.h]];
        prBoite(F, q, .02, h * mont / n, '#c2a87e');}
      esc.push({x0:it.x, y0:it.y, x1:it.x + it.w, y1:it.y + it.h, dir:d});}}
  /* le dehors : un sol qui déborde, pour ne pas marcher dans le vide */
  const e = floorExtent(Fl) || {x0:0, y0:0, x1:10, y1:10};
  prFace(F, [[e.x0 - 60, e.y0 - 60, 0], [e.x1 + 60, e.y0 - 60, 0], [e.x1 + 60, e.y1 + 60, 0], [e.x0 - 60, e.y1 + 60, 0]], PR_SOL, true);
  return {F:F, M:M, esc:esc};}

/* une cour : ses allées, sa fontaine, ses buissons et sa colonnade, comme sur le plan */
function prCour(F, M, r, ouv){
  const g = mkrng(hstr(r.id));
  const x = r.x, y = r.y, w = r.w, h = r.h;
  const buisson = (cx, cy, rr) => { prBoule(F, cx, cy, rr, rr, .04, rr * 2.1, '#8fae6e');
    M.push([[cx - rr, cy - rr], [cx + rr, cy - rr]], [[cx + rr, cy - rr], [cx + rr, cy + rr]],
      [[cx + rr, cy + rr], [cx - rr, cy + rr]], [[cx - rr, cy + rr], [cx - rr, cy - rr]]);};
  if(w * BU > 110 && h * BU > 110){
    const b = 24 / BU;
    prFace(F, [[x, y + h / 2 - b / 2, .04], [x + w, y + h / 2 - b / 2, .04], [x + w, y + h / 2 + b / 2, .04], [x, y + h / 2 + b / 2, .04]], '#e9dfc3', true);
    prFace(F, [[x + w / 2 - b / 2, y, .04], [x + w / 2 + b / 2, y, .04], [x + w / 2 + b / 2, y + h, .04], [x + w / 2 - b / 2, y + h, .04]], '#e9dfc3', true);
    const fr = 22 / BU, cx = x + w / 2, cy = y + h / 2;
    prBoite(F, isoCercle(cx, cy, fr, fr, 14), .04, .55, '#cfc6b2', false);
    prFace(F, isoCercle(cx, cy, fr * .82, fr * .82, 14).map(p => [p[0], p[1], .48]), '#a9c5d3');
    prBoite(F, isoCercle(cx, cy, 8 / BU, 8 / BU, 8), .48, 1.05, '#e9dfc3');
    for(let i = 0; i < 4; i++) M.push([[cx - fr, cy - fr], [cx + fr, cy - fr]], [[cx + fr, cy - fr], [cx + fr, cy + fr]],
      [[cx + fr, cy + fr], [cx - fr, cy + fr]], [[cx - fr, cy + fr], [cx - fr, cy - fr]]);
    const n = Math.max(4, Math.min(16, Math.floor(w * BU * h * BU / 9000) * 2 + 4));
    for(let i = 0; i < n; i++){
      const qx = i % 2 ? x + w * .72 : x + w * .28, qy = (i >> 1) % 2 ? y + h * .72 : y + h * .28;
      buisson(qx + (g() - .5) * w * .18, qy + (g() - .5) * h * .18, (10 + g() * 9) / BU);
      if(i >= 7) break;}
  } else {
    const n = Math.max(1, Math.floor(w * BU * h * BU / 6000));
    for(let i = 0; i < n; i++) buisson(x + 16 / BU + g() * (w - 32 / BU), y + 16 / BU + g() * (h - 32 / BU), (8 + g() * 8) / BU);}
  if(r.arc !== false){
    const pas = 2.5, rc = .21;
    const libre = (cx, cy) => !(ouv || []).some(o => Math.hypot(o.x - cx, o.y - cy) < o.w / 2 + .5);
    const bord = [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]];
    for(const [x1, y1, x2, y2] of bord){
      const L2 = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(L2 / pas));
      for(let i = 0; i < n; i++){
        const t = (i + .5) / n, cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
        if(!libre(cx, cy)) continue;
        prBoite(F, isoCercle(cx, cy, rc, rc, 8), .04, 2.7, '#dbd0b6');
        M.push([[cx - rc, cy - rc], [cx + rc, cy - rc]], [[cx + rc, cy - rc], [cx + rc, cy + rc]],
          [[cx + rc, cy + rc], [cx - rc, cy + rc]], [[cx - rc, cy + rc], [cx - rc, cy - rc]]);}}}}

/* ---------- le décor d'un village ---------- */
function prDecorVillage(v){
  const F = [], M = [], ent = [];
  const th = TH[v.theme] || TH.ete, W = v.W, H = v.H;
  prFace(F, [[-80, -80, 0], [W + 80, -80, 0], [W + 80, H + 80, 0], [-80, H + 80, 0]], PR_SOL, true);
  prFace(F, [[0, 0, .01], [W, 0, .01], [W, H, .01], [0, H, .01]], th.ground, true);
  const couleur = {foret:th.forest, champ:th.field, place:th.place, jardin:th.jardin, cimetiere:th.cim, lac:th.water, marais:th.water, colline:shade(th.ground, .94)};
  for(const p of v.items.filter(i => i.t === 'poly'))
    prFace(F, p.pts.map(q => [q[0], q[1], .03]), couleur[p.k] || th.place, true);
  const ruban = (pts, larg, z, col) => {
    for(let i = 0; i + 1 < pts.length; i++){
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
      if(d < .01) continue;
      const nx = -dy / d * larg / 2, ny = dx / d * larg / 2;
      prFace(F, [[a[0] + nx, a[1] + ny, z], [b[0] + nx, b[1] + ny, z], [b[0] - nx, b[1] - ny, z], [a[0] - nx, a[1] - ny, z]], col, true);}};
  for(const r of v.items.filter(i => i.t === 'river')) ruban(r.pts, Math.max(1, r.w || 3), .05, th.water);
  for(const r of v.items.filter(i => i.t === 'road')) ruban(r.pts, Math.max(1, roadW(r)), .06, th.road);
  for(const w of v.items.filter(i => i.t === 'wall')){
    const h = w.k === 'palissade' ? 2.6 : w.k === 'haie' ? 1.4 : 4.4;
    const ep = w.k === 'haie' ? 1.2 : w.k === 'palissade' ? .5 : 1;
    const col = w.k === 'haie' ? '#5d7a46' : w.k === 'palissade' ? '#9a7a52' : '#b3ada1';
    const pts = w.pts, n = w.closed ? pts.length : pts.length - 1;
    for(let i = 0; i < n; i++){
      const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d * ep / 2, ny = dx / d * ep / 2;
      const q = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
      prBoite(F, q, 0, h, col);
      for(let j = 0; j < 4; j++) M.push([q[j], q[(j + 1) % 4]]);}}
  for(const b of v.items.filter(i => i.t === 'bld')){
    const d = VKD[b.k] || VKD.maison;
    const q = isoQuad(b.x, b.y, b.w || d.w, b.h || d.h, b.a || 0);
    const haut = ISO_HB[b.k] || 4.4;
    const mur = b.k === 'chaumiere' || b.k === 'cabane' || b.k === 'grange' || b.k === 'etable' || b.k === 'entrepot' ? '#c7ab80' : shade(th.place, 1);
    prBoite(F, q, 0, haut, mur, false);
    const t = ISO_TB[b.k] || 'pignon';
    const hh = t === 'conique' ? Math.max(2, Math.min(b.w || d.w, b.h || d.h) * .8) : Math.max(1.2, Math.min(b.w || d.w, b.h || d.h) * .42);
    prToit3(F, q, haut, hh, t, roofColor(th, b.roof || d.roof, b.id || ''));
    for(let j = 0; j < 4; j++) M.push([q[j], q[(j + 1) % 4]]);
    if(b.link && P.buildings.some(x => x.id === b.link)) ent.push({x:b.x, y:b.y, r:Math.max(b.w || d.w, b.h || d.h) / 2 + 2.5, plan:b.link, nom:b.name || (VKD[b.k] || {}).n || 'cette bâtisse'});}
  for(const t of v.items.filter(i => i.t === 'tree')){
    const r = Math.max(.6, (t.r || 4) / 2), c = th.tree[hs(t.id || '' + t.x + t.y) % th.tree.length];
    const tr = isoQuad(t.x, t.y, .4, .4, 0);
    prBoite(F, tr, 0, t.k === 'buisson' ? .2 : 1.6, '#7c6039', false);
    const base = t.k === 'buisson' ? .2 : 1.6, haut = t.k === 'conifere' ? r * 2.6 : r * 1.9;
    const q = isoQuad(t.x, t.y, r * 1.7, r * 1.7, 0);
    prToit3(F, q, base, haut, 'conique', c);
    if(t.k !== 'buisson') prToit3(F, q, base, -r * .8, 'conique', shade(c, .82));
    M.push([[t.x - .4, t.y - .4], [t.x + .4, t.y - .4]], [[t.x + .4, t.y - .4], [t.x + .4, t.y + .4]],
      [[t.x + .4, t.y + .4], [t.x - .4, t.y + .4]], [[t.x - .4, t.y + .4], [t.x - .4, t.y - .4]]);}
  return {F:F, M:M, ent:ent};}

/* ---------- la grille des murs : pour ne pas tout essayer à chaque pas ---------- */
function prGrille(M){
  const g = new Map(), T = 8;
  const cle = (i, j) => i + ':' + j;
  M.forEach((s, n) => {
    const i0 = Math.floor(Math.min(s[0][0], s[1][0]) / T), i1 = Math.floor(Math.max(s[0][0], s[1][0]) / T);
    const j0 = Math.floor(Math.min(s[0][1], s[1][1]) / T), j1 = Math.floor(Math.max(s[0][1], s[1][1]) / T);
    for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++){
      const k = cle(i, j);
      if(!g.has(k)) g.set(k, []);
      g.get(k).push(n);}});
  return {g:g, T:T, M:M,
    autour(x, y){
      const i = Math.floor(x / T), j = Math.floor(y / T), out = [];
      for(let a = i - 1; a <= i + 1; a++) for(let b = j - 1; b <= j + 1; b++){
        const l = g.get(a + ':' + b);
        if(l) for(const n of l) out.push(M[n]);}
      return out;}};}
/* le point d'un segment le plus proche, pour glisser le long des murs */
function prProche(p, s){
  const ax = s[0][0], ay = s[0][1], bx = s[1][0], by = s[1][1];
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  let t = L2 < 1e-9 ? 0 : ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  return [ax + dx * t, ay + dy * t];}
function prGlisser(x, y){
  if(!PR.grille) return [x, y];
  for(let n = 0; n < 3; n++){
    let touche = false;
    for(const s of PR.grille.autour(x, y)){
      const q = prProche([x, y], s);
      const dx = x - q[0], dy = y - q[1], d = Math.hypot(dx, dy);
      if(d < PR_RAYON){
        touche = true;
        if(d < 1e-6){ x += .01; y += .01; }
        else { x = q[0] + dx / d * PR_RAYON; y = q[1] + dy / d * PR_RAYON; }}}
    if(!touche) break;}
  return [x, y];}

/* ---------- entrer, sortir ---------- */
function prDecor(){
  if(ui.mode === 'v'){
    const d = prDecorVillage(CV());
    PR.F = d.F; PR.murs = d.M; PR.esc = []; PR.ent = d.ent;
  } else {
    const b = CB(), d = prDecorBatiment(b, PR.fl);
    PR.F = d.F; PR.murs = d.M; PR.esc = d.esc; PR.ent = [];}
  PR.grille = prGrille(PR.murs);}
/* un point où l'on tient debout : on s'écarte en spirale jusqu'à être au large */
function prDegager(x, y, large){
  large = large || 1.4;
  const loin = (px, py) => {
    let d = 1e9;
    for(const s of (PR.grille ? PR.grille.autour(px, py) : [])){
      const q = prProche([px, py], s);
      d = Math.min(d, Math.hypot(px - q[0], py - q[1]));}
    return d;};
  if(loin(x, y) >= large) return [x, y];
  for(let r = 2; r <= 26; r += 2) for(let a = 0; a < 12; a++){
    const px = x + Math.cos(a * Math.PI / 6) * r, py = y + Math.sin(a * Math.PI / 6) * r;
    if(loin(px, py) >= large) return [px, py];}
  return prGlisser(x, y);}
/* où l'on arrive : devant la porte d'entrée, ou au milieu de la plus grande pièce ; dans un village, sur la place */
function prDepart(){
  if(ui.mode === 'v'){
    const v = CV();
    const p = v.items.find(i => i.t === 'poly' && i.k === 'place');
    if(p && p.pts.length){
      const c = p.pts.reduce((a, q) => [a[0] + q[0] / p.pts.length, a[1] + q[1] / p.pts.length], [0, 0]);
      PR.x = c[0]; PR.y = c[1];
    } else { PR.x = v.W / 2; PR.y = v.H / 2; }
    PR.yaw = Math.PI / 2;
    const q = prDegager(PR.x, PR.y, 2.2); PR.x = q[0]; PR.y = q[1];
    return;}
  const b = CB(), F = b.floors[PR.fl];
  const d = F && F.items.find(i => i.t === 'door');
  if(d){
    const dedans = (x, y) => (F.items.some(i => i.t === 'room' && x > i.x && x < i.x + i.w && y > i.y && y < i.y + i.h));
    const dx = d.o === 'h' ? 0 : 1, dy = d.o === 'h' ? 1 : 0;
    for(const s of [1, -1]){
      const x = d.x + dx * s * 1.2, y = d.y + dy * s * 1.2;
      if(dedans(x, y)){ PR.x = x; PR.y = y; PR.yaw = Math.atan2(d.y - y, d.x - x) + Math.PI; return; }}
    PR.x = d.x; PR.y = d.y; PR.yaw = 0; return;}
  const r = F && F.items.filter(i => i.t === 'room').sort((a, c) => c.w * c.h - a.w * a.h)[0];
  if(r){ PR.x = r.x + r.w / 2; PR.y = r.y + r.h / 2; } else { PR.x = 5; PR.y = 5; }
  PR.yaw = 0;}
function prEntrer(){
  if(PR.on || (ui.mode !== 'b' && ui.mode !== 'v')) return;
  PR.on = true; PR.fl = ui.fl; PR.pitch = 0; PR.k = Object.create(null); PR.froid = 0;
  prDecor(); prDepart();
  prToile(true);
  PR.t = performance.now();
  PR.raf = requestAnimationFrame(prBoucle);
  prDire(ui.mode === 'v' ? 'Marche avec Z Q S D ou les flèches, glisse pour regarder. Échap pour sortir.'
    : 'Marche avec Z Q S D ou les flèches, glisse pour regarder. Les escaliers changent d’étage. Échap pour sortir.');
  renderAll();}
/* fermer sans rien remettre en place : quand on change d'établi */
function prFermer(){
  if(!PR.on) return;
  PR.on = false;
  cancelAnimationFrame(PR.raf);
  PR.raf = 0;
  PR.pile.length = 0;
  prToile(false);}
function prSortir(){
  if(!PR.on) return;
  const retour = PR.pile.length ? PR.pile[PR.pile.length - 1] : null;
  prFermer();
  if(retour && P.villages.some(v => v.id === retour.v)){ P.curV = retour.v; ui.mode = 'v'; ui.sel = []; }
  renderAll(); fit();}
function prDire(t){ PR.msg = t; PR.msgT = performance.now() + 5200; }

/* ---------- la toile ---------- */
function prToile(on){
  if(!PR.cv){
    PR.cv = document.createElement('canvas');
    PR.cv.id = 'prcv';
    PR.cv.setAttribute('aria-label', 'Promenade');
    PR.cv.tabIndex = 0;
    $('#cvwrap').append(PR.cv);
    PR.ctx = PR.cv.getContext('2d');
    prBrancher();}
  PR.cv.hidden = !on;
  $('#cv').style.visibility = on ? 'hidden' : '';
  $('#hud').style.display = on ? 'none' : '';
  const en = $('#enter'); if(en && on) en.hidden = true;
  if(on){ prTaille(); PR.cv.focus({preventScroll:true}); }}
function prTaille(){
  const r = $('#cvwrap').getBoundingClientRect();
  const d = Math.min(2, window.devicePixelRatio || 1);
  PR.cv.width = Math.max(1, Math.round(r.width * d));
  PR.cv.height = Math.max(1, Math.round(r.height * d));
  PR.cv.style.width = r.width + 'px';
  PR.cv.style.height = r.height + 'px';
  PR.dpr = d;}
window.addEventListener('resize', () => { if(PR.on) prTaille(); });

/* ---------- le clavier, la souris, le doigt ---------- */
const PR_AVANT = {'w':1, 'z':1, 'arrowup':1}, PR_ARRIERE = {'s':1, 'arrowdown':1};
const PR_GAUCHE = {'a':1, 'q':1}, PR_DROITE = {'d':1};
const PR_TOURNE_G = {'arrowleft':1}, PR_TOURNE_D = {'arrowright':1};
function prBrancher(){
  const cv2 = PR.cv;
  cv2.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if(k === 'escape'){ prSortir(); e.preventDefault(); return; }
    if(k === 'e' && PR.ent.length){ prPorte(); e.preventDefault(); return; }
    PR.k[k] = 1;
    if(PR_AVANT[k] || PR_ARRIERE[k] || PR_GAUCHE[k] || PR_DROITE[k] || PR_TOURNE_G[k] || PR_TOURNE_D[k] || k === 'shift') e.preventDefault();});
  cv2.addEventListener('keyup', e => { PR.k[e.key.toLowerCase()] = 0; });
  cv2.addEventListener('blur', () => { PR.k = Object.create(null); });
  cv2.addEventListener('pointerdown', e => {
    cv2.setPointerCapture(e.pointerId);
    cv2.focus({preventScroll:true});
    PR.souris = {x:e.clientX, y:e.clientY, id:e.pointerId, t:performance.now(), bouge:false};});
  cv2.addEventListener('pointermove', e => {
    if(!PR.souris || PR.souris.id !== e.pointerId) return;
    const dx = e.clientX - PR.souris.x, dy = e.clientY - PR.souris.y;
    if(Math.abs(dx) + Math.abs(dy) > 3) PR.souris.bouge = true;
    PR.yaw += dx * .005;
    PR.pitch = clamp(PR.pitch - dy * .004, -.9, .9);
    PR.souris.x = e.clientX; PR.souris.y = e.clientY;});
  const fin = e => {
    if(!PR.souris || PR.souris.id !== e.pointerId) return;
    /* une tape sans bouger : un pas en avant, pour le doigt */
    if(!PR.souris.bouge && performance.now() - PR.souris.t < 400 && e.pointerType !== 'mouse') PR.pad = performance.now() + 500;
    PR.souris = null;};
  cv2.addEventListener('pointerup', fin);
  cv2.addEventListener('pointercancel', fin);}
/* entrer dans une bâtisse du village, et en ressortir */
function prPorte(){
  const e = PR.ent.map(x => ({x:x, d:Math.hypot(x.x - PR.x, x.y - PR.y)})).sort((a, b) => a.d - b.d)[0];
  if(!e || e.d > e.x.r) return;
  PR.pile.push({v:CV().id});
  P.curB = e.x.plan; ui.mode = 'b'; ui.fl = 0; PR.fl = 0;
  prDecor(); prDepart();
  prDire('Te voilà dans ' + e.x.nom + '. Échap pour ressortir au village.');
  renderAll();}

/* ---------- marcher ---------- */
function prBouger(dt){
  let av = (PR.k['w'] || PR.k['z'] || PR.k['arrowup'] ? 1 : 0) - (PR.k['s'] || PR.k['arrowdown'] ? 1 : 0);
  const cote = (PR.k['d'] ? 1 : 0) - (PR.k['a'] || PR.k['q'] ? 1 : 0);
  const tour = (PR.k['arrowright'] ? 1 : 0) - (PR.k['arrowleft'] ? 1 : 0);
  if(PR.pad > performance.now()) av = 1;
  PR.yaw += tour * dt * 2.2;
  if(!av && !cote) return;
  const v = (PR.k['shift'] ? PR_COURSE : PR_PAS) * dt;
  const fx = Math.cos(PR.yaw), fy = Math.sin(PR.yaw);
  let nx = PR.x + (fx * av - fy * cote) * v, ny = PR.y + (fy * av + fx * cote) * v;
  const q = prGlisser(nx, ny);
  PR.x = q[0]; PR.y = q[1];
  prEscalier();}
/* un escalier sous les pieds : on change d'étage */
function prEscalier(){
  if(ui.mode !== 'b' || performance.now() < PR.froid) return;
  const b = CB();
  for(const e of PR.esc){
    if(PR.x < e.x0 || PR.x > e.x1 || PR.y < e.y0 || PR.y > e.y1) continue;
    /* le sens de la montée : la flèche de l'escalier */
    const m = e.dir === 'n' ? [0, -1] : e.dir === 's' ? [0, 1] : e.dir === 'e' ? [1, 0] : e.dir === 'w' ? [-1, 0] : [0, 0];
    const fx = Math.cos(PR.yaw), fy = Math.sin(PR.yaw);
    const monte = (fx * m[0] + fy * m[1]) >= 0;
    const vers = PR.fl + (monte ? 1 : -1);
    if(vers < 0 || vers >= b.floors.length){ prDire(monte ? 'Il n’y a pas d’étage au-dessus.' : 'Il n’y a rien en dessous.'); PR.froid = performance.now() + 1200; return; }
    PR.fl = vers; ui.fl = vers;
    PR.froid = performance.now() + 900;
    prDecor();
    /* on ressort de l'escalier, du côté où l'on allait */
    PR.x = clamp(PR.x + m[0] * (monte ? 1 : -1) * ((e.x1 - e.x0) / 2 + .8), e.x0 - 6, e.x1 + 6);
    PR.y = clamp(PR.y + m[1] * (monte ? 1 : -1) * ((e.y1 - e.y0) / 2 + .8), e.y0 - 6, e.y1 + 6);
    const q = prGlisser(PR.x, PR.y); PR.x = q[0]; PR.y = q[1];
    prDire((monte ? 'Tu montes à ' : 'Tu descends à ') + (b.floors[vers].name || 'l’étage ' + vers) + '.');
    renderFloorbar(); renderSide();
    return;}}

/* ---------- dessiner ---------- */
function prBoucle(ts){
  if(!PR.on) return;
  const dt = Math.min(.05, (ts - PR.t) / 1000 || 0);
  PR.t = ts;
  prBouger(dt);
  prDessiner();
  PR.raf = requestAnimationFrame(prBoucle);}
function prDessiner(){
  const c = PR.ctx, W = PR.cv.width, H = PR.cv.height;
  if(!c) return;
  const f = (W / 2) / Math.tan(PR_FOV * Math.PI / 360);
  const cx = W / 2, cy = H / 2;
  const cyaw = Math.cos(PR.yaw), syaw = Math.sin(PR.yaw);
  const cpit = Math.cos(PR.pitch), spit = Math.sin(PR.pitch);
  /* le ciel et le sol lointain */
  const hor = cy + f * Math.tan(PR.pitch);
  c.fillStyle = PR_CIEL; c.fillRect(0, 0, W, Math.max(0, Math.min(H, hor)));
  c.fillStyle = shade(PR_SOL, .9); c.fillRect(0, Math.max(0, Math.min(H, hor)), W, H);
  const oeil = [PR.x, PR.y, PR_OEIL];
  const sols = [], vues = [];
  for(const face of PR.F){
    const p = face.p;
    let mx = 0, my = 0, mz = 0;
    for(const q of p){ mx += q[0]; my += q[1]; mz += q[2]; }
    mx /= p.length; my /= p.length; mz /= p.length;
    const dx = mx - oeil[0], dy = my - oeil[1];
    const prof = dx * cyaw + dy * syaw;
    const d2 = dx * dx + dy * dy;
    if(face.s === null && d2 > PR_VUE * PR_VUE) continue;
    if(face.s === null && prof < -14 && d2 > 400) continue;   /* franchement derrière nous */
    if(face.s !== null) sols.push({f:face, d:face.s});
    else vues.push({f:face, d:d2 + (mz - oeil[2]) * (mz - oeil[2])});}
  sols.forEach((x, i) => {x.i = i});
  sols.sort((a, b) => (a.d - b.d) || (a.i - b.i));
  vues.sort((a, b) => b.d - a.d);
  const proj = q => {
    const dx = q[0] - oeil[0], dy = q[1] - oeil[1], dz = q[2] - oeil[2];
    const z0 = dx * cyaw + dy * syaw, X = -dx * syaw + dy * cyaw;
    const Z = z0 * cpit + dz * spit, Y = dz * cpit - z0 * spit;
    return [X, Y, Z];};
  const NEAR = .12;
  for(const v of sols.concat(vues)){
    const p = v.f.p.map(proj);
    /* on coupe ce qui passe derrière l'œil */
    const out = [];
    for(let i = 0; i < p.length; i++){
      const a = p[i], b = p[(i + 1) % p.length];
      const da = a[2] - NEAR, db = b[2] - NEAR;
      if(da >= 0) out.push(a);
      if((da >= 0) !== (db >= 0)){
        const t = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);}}
    if(out.length < 3) continue;
    c.beginPath();
    for(let i = 0; i < out.length; i++){
      const q = out[i], sx = cx + f * q[0] / q[2], sy = cy - f * q[1] / q[2];
      if(i) c.lineTo(sx, sy); else c.moveTo(sx, sy);}
    c.closePath();
    /* la brume : au loin, tout va vers le ciel */
    const br = v.f.s !== null ? 0 : Math.min(.72, Math.sqrt(v.d) / PR_VUE);
    c.fillStyle = v.f.c;
    c.fill();
    /* un trait sur chaque face : les angles se lisent, comme sur les plans */
    if(v.d < 1600){
      c.strokeStyle = shade(v.f.c, .74);
      c.lineWidth = Math.max(1, (PR.dpr || 1));
      c.stroke();}
    if(br > .02){ c.globalAlpha = br; c.fillStyle = PR_CIEL; c.fill(); c.globalAlpha = 1; }}
  prHud(c, W, H);}
function prHud(c, W, H){
  const d = PR.dpr || 1;
  c.save();
  c.scale(d, d);
  const w = W / d, h = H / d;
  c.font = '600 13px ' + FONT;
  c.textAlign = 'left';
  const lieu = ui.mode === 'v' ? CV().name : (CB().name + ' · ' + ((CB().floors[PR.fl] || {}).name || ''));
  c.fillStyle = 'rgba(28,26,22,.55)';
  c.fillRect(10, 10, Math.min(w - 20, c.measureText(lieu).width + 20), 26);
  c.fillStyle = '#fff7ee';
  c.fillText(lieu, 20, 27);
  /* ce qu'on peut faire ici */
  let bas = '';
  if(PR.msgT > performance.now()) bas = PR.msg;
  else if(ui.mode === 'v'){
    const e = PR.ent.map(x => ({x:x, d:Math.hypot(x.x - PR.x, x.y - PR.y)})).sort((a, b) => a.d - b.d)[0];
    if(e && e.d <= e.x.r) bas = 'E : entrer dans ' + e.x.nom;}
  if(bas){
    c.font = '500 13px ' + FONT;
    const lg = c.measureText(bas).width + 22;
    c.fillStyle = 'rgba(28,26,22,.6)';
    c.fillRect((w - lg) / 2, h - 44, lg, 28);
    c.fillStyle = '#fff7ee';
    c.textAlign = 'center';
    c.fillText(bas, w / 2, h - 25);}
  c.restore();}

/* ---------- le panneau ---------- */
function prPanneau(){
  if(!PR.on) return '';
  let h = `<h3>Promenade</h3><p class="hint">À hauteur d’homme, un mètre septante. On marche, on ne dessine pas.</p>`;
  h += `<table><tr><td><kbd>Z</kbd> <kbd>Q</kbd> <kbd>S</kbd> <kbd>D</kbd></td><td>Avancer, reculer, pas de côté</td></tr>`
    + `<tr><td>Flèches</td><td>Avancer, reculer, tourner</td></tr>`
    + `<tr><td>Glisser</td><td>Regarder autour</td></tr>`
    + `<tr><td><kbd>Maj</kbd></td><td>Courir</td></tr>`
    + (ui.mode === 'v' ? `<tr><td><kbd>E</kbd></td><td>Entrer dans une bâtisse</td></tr>` : `<tr><td>Escalier</td><td>Monte ou descend d’un étage</td></tr>`)
    + `<tr><td><kbd>Échap</kbd></td><td>Sortir</td></tr></table>`;
  h += `<div class="row"><button class="btn sm" data-pro="sortir">Sortir de la promenade</button></div>`;
  return h;}
side.addEventListener('click', e => {
  const t = e.target.closest('[data-pro]');
  if(t && t.dataset.pro === 'sortir') prSortir();});
