/* ====== la vue isométrique : les plans vus en relief ======
   Une seule projection pour les bâtiments et les villages : on range les volumes du plus loin au plus près,
   et on les dessine les uns par-dessus les autres, comme un peintre. On y regarde seulement : rien ne s'y modifie. */

const ISO_C = Math.cos(Math.PI / 6), ISO_S = Math.sin(Math.PI / 6);
const ISO_HE = 3.3;      /* la hauteur d'un étage, comme sur la façade */
const ISO_HM = 2.9;      /* la hauteur des murs d'une pièce */
const ISO_HB2 = 1.1;     /* un muret, un garde-corps de balcon */
const ISO_MB = 26;       /* pixels par mètre, dans un bâtiment */
const ISO_MV = 4.2;      /* pixels par mètre, dans un village */
ui.iso = {on:false, deux:false, rot:0, tous:false, toit:true, murs:'ouverts', piece:''};
const ISO_MURS = [['ouverts', 'Ouverts, on voit dedans'], ['entiers', 'Entiers, vu de dehors'], ['mi', 'À mi-hauteur'], ['aucun', 'Aucun']];
/* la hauteur des murs qu'on montre : entiers, coupés à mi-hauteur, ou pas de murs du tout */
const isoHautMur = () => ui.iso.murs === 'aucun' ? 0 : ui.iso.murs === 'mi' ? ISO_HM * .45 : ISO_HM;
/* quelles faces d'un mur on trace : celles de devant (vu de dehors), celles du fond (on voit dedans), ou les deux */
/* les genres de pièce que le plan dessine sans contour : elles n'ont pas de murs en relief non plus */
const ISO_SANS_MUR = {cour:1, ext:1, couloir:1};
const isoFaces = () => ui.iso.murs === 'entiers' ? 'pres' : ui.iso.murs === 'mi' ? 'toutes' : 'loin';
const isoOn = () => !!(ui.iso && ui.iso.on) && (ui.mode === 'b' || ui.mode === 'v');
/* « Les deux » : le plan à gauche, le relief à droite, qui suit chaque geste */
const isoDeux = () => !!(ui.iso && ui.iso.deux) && !ui.facade && !prOn() && (ui.mode === 'b' || ui.mode === 'v');
/* on quitte la pièce montrée seule dès qu'on change d'étage ou de plan */
function isoOublierPiece(){ if(ui.iso) ui.iso.piece = ''; }

/* ---------- la projection ---------- */
function isoTourne(x, y, r){
  switch(((r % 4) + 4) % 4){
    case 1: return [y, -x];
    case 2: return [-x, -y];
    case 3: return [-y, x];
    default: return [x, y];}}
function isoPt(C, x, y, z){
  const p = isoTourne(x - C.cx, y - C.cy, C.r);
  return [C.ox + (p[0] - p[1]) * ISO_C * C.m, C.oy + (p[0] + p[1]) * ISO_S * C.m - (z || 0) * C.m];}
/* ce qui est le plus près de l'œil a la plus grande profondeur */
function isoProf(C, x, y, z){
  const p = isoTourne(x - C.cx, y - C.cy, C.r);
  return p[0] + p[1] + (z || 0);}

/* ---------- les objets, pour l'ordre de dessin ----------
   Chaque morceau dessiné appartient à un objet : un meuble, un pan de mur, une marche, un toit.
   Deux objets qui se recouvrent à l'écran sont rangés par un plan qui les sépare : celui qui est du côté
   de l'œil passe devant. Ranger par une seule profondeur ne suffit pas : le haut d'un mur de 2,9 m est
   plus près de l'œil que le haut d'un tonneau posé devant lui, et le mur passait par-dessus. */
let ISO_OBJ = null;      /* l'objet ouvert : ce qu'on dessine s'y range */
let ISO_ET = 0;          /* l'étage en cours : un étage passe tout entier devant celui du dessous */
let ISO_TRACE = false;   /* pour les essais : chaque morceau garde ses sommets en 3D */
const isoObjet = (pts, z0, z1) => ({pts:pts, z0:z0, z1:z1});
/* tout ce qui est dessiné dans fn appartient au même objet (un objet déjà ouvert garde la main) */
function isoAvec(pts, z0, z1, fn){
  const avant = ISO_OBJ;
  if(!avant) ISO_OBJ = isoObjet(pts, z0, z1);
  try{ fn(); } finally { ISO_OBJ = avant; }}

/* ---------- les morceaux dessinés ---------- */
const isoPoly = (pts, f, t, o) => `<polygon points="${pts.map(p => fx(p[0]) + ',' + fx(p[1])).join(' ')}" fill="${f}"`
  + (t ? ` stroke="${t}" stroke-width="${o && o.trait || .8}" stroke-linejoin="round"` : '') + (o && o.op ? ` opacity="${o.op}"` : '') + '/>';
const isoCentre = pts => {let x = 0, y = 0; for(const p of pts){x += p[0]; y += p[1]} return [x / pts.length, y / pts.length]};
/* une surface posée à plat : le sol, une zone, une route. Avec « vol », elle se range parmi les volumes
   (l'eau d'un bassin, qui doit passer derrière sa margelle et devant le mur du fond) */
function isoPlat(L, C, pts, z, col, o){
  if(pts.length < 3) return;
  const c = isoCentre(pts);
  const trou = o && o.trou && o.trou.length > 2 ? o.trou : null;
  let s;
  if(trou){
    const d = q => 'M' + q.map(p => {const e = isoPt(C, p[0], p[1], z); return fx(e[0]) + ' ' + fx(e[1])}).join('L') + 'Z';
    s = `<path d="${d(pts) + d(trou)}" fill-rule="evenodd" fill="${col}"`
      + ((o && o.trait2) ? ` stroke="${o.trait2}" stroke-width="${o.trait || .8}" stroke-linejoin="round"` : '') + '/>';
  } else s = isoPoly(pts.map(p => isoPt(C, p[0], p[1], z)), col, (o && o.trait2) || null, o);
  const x = (o && o.vol) ? {c:1, d:isoProf(C, c[0], c[1], z), s:s, o:ISO_OBJ || isoObjet(pts, z, z), e:ISO_ET}
    : {c:0, d:isoProf(C, c[0], c[1], z), s:s, e:ISO_ET};
  if(ISO_TRACE){x.p3 = pts.map(p => [p[0], p[1], z]); x.t3 = trou ? trou.map(p => [p[0], p[1], z]) : null}
  L.push(x);}
/* une face de mur, avec les portes et fenêtres qui s'y trouvent */
/* ---------- les murs, en panneaux ----------
   Chaque pan est découpé en morceaux d'au plus 1,2 m : chacun porte sa propre profondeur, et le tri
   du peintre devient juste de proche en proche. Sans cela, un meuble posé au bout d'un long mur
   passait devant le mur entier. */
const ISO_PAN = 1.2;
/* la profondeur d'un morceau : son point le plus proche de l'œil */
function isoProfMax(C, pts3){
  let d = -1e9;
  for(const q of pts3) d = Math.max(d, isoProf(C, q[0], q[1], q[2]));
  return d;}
/* une face qui regarde ailleurs que l'œil : dans un volume convexe, elle se dessine avant les autres.
   La normale est prise sur les sommets, et tournée vers le dehors de l'objet. */
function isoDos(C, pts3, ob){
  let nx = 0, ny = 0, nz = 0, mx = 0, my = 0, mz = 0;
  for(let i = 0; i < pts3.length; i++){
    const a = pts3[i], b = pts3[(i + 1) % pts3.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
    mx += a[0]; my += a[1]; mz += a[2];}
  const n = pts3.length;
  mx /= n; my /= n; mz /= n;
  if(ob && ob.pts && ob.pts.length){
    const c = isoCentre(ob.pts), cz = (ob.z0 + ob.z1) / 2;
    if(nx * (mx - c[0]) + ny * (my - c[1]) + nz * (mz - cz) < 0){nx = -nx; ny = -ny; nz = -nz}}
  else if(nz < 0){nx = -nx; ny = -ny; nz = -nz}
  const r = isoTourne(nx, ny, C.r);
  return r[0] + r[1] + nz < -1e-9;}
function isoPousser(L, C, pts3, fill, trait, o){
  let ob = ISO_OBJ;
  if(!ob){
    let z0 = 1e9, z1 = -1e9;
    for(const q of pts3){z0 = Math.min(z0, q[2]); z1 = Math.max(z1, q[2])}
    ob = isoObjet(pts3.map(q => [q[0], q[1]]), z0, z1);}
  L.push({c:1, d:isoProfMax(C, pts3), s:isoPoly(pts3.map(q => isoPt(C, q[0], q[1], q[2])), fill, trait, o), o:ob, e:ISO_ET, dos:isoDos(C, pts3, ob),
    p3:ISO_TRACE ? pts3 : null});}
/* un pan de mur, percé pour de bon : le mur s'arrête de part et d'autre d'une ouverture,
   avec son allège sous une fenêtre et son linteau au-dessus. Une arche ne laisse que le trou. */
function isoFace(L, C, a, b, z0, z1, col, ouv, coupures){
  const e = isoTourne(b[0] - a[0], b[1] - a[1], C.r);
  const f = Math.abs(e[0]) > Math.abs(e[1]) ? .82 : .66;
  const mc = shade(col, f), mt = shade(col, f * .62);
  const Lg = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const pt = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  /* un panneau : rempli sans contour, puis ses arêtes vraies (haut, bas, et les bouts du pan),
     pour que la découpe en morceaux ne se voie pas comme une palissade */
  const quad = (t0, t1, za, zb, fill, trait, debut, fin) => {
    if(zb <= za + .005 || t1 <= t0 + .0005) return;
    const p0 = pt(t0), p1 = pt(t1);
    /* les panneaux se chevauchent d'un cheveu : sinon un trait clair se voit entre deux remplissages */
    const eps = Lg > .05 ? .012 / Lg : 0;
    const q0 = pt(debut ? t0 : t0 - eps), q1 = pt(fin ? t1 : t1 + eps);
    const c3 = [[p0[0], p0[1], zb], [p1[0], p1[1], zb], [p1[0], p1[1], za], [p0[0], p0[1], za]];
    const e4 = c3.map(q => isoPt(C, q[0], q[1], q[2]));
    const f4 = [[q0[0], q0[1], zb], [q1[0], q1[1], zb], [q1[0], q1[1], za], [q0[0], q0[1], za]].map(q => isoPt(C, q[0], q[1], q[2]));
    const X = i => fx(e4[i][0]) + ' ' + fx(e4[i][1]);
    let d = 'M' + X(0) + 'L' + X(1) + 'M' + X(3) + 'L' + X(2);
    if(debut) d += 'M' + X(0) + 'L' + X(3);
    if(fin) d += 'M' + X(1) + 'L' + X(2);
    /* dans un volume plein, le panneau en fait partie ; sinon (les murs d'une pièce) il est un objet à lui seul */
    L.push({c:1, d:isoProfMax(C, c3), o:ISO_OBJ || isoObjet([p0, p1], za, zb), e:ISO_ET, dos:!!ISO_OBJ && isoDos(C, c3, ISO_OBJ),
      p3:ISO_TRACE ? [[q0[0], q0[1], zb], [q1[0], q1[1], zb], [q1[0], q1[1], za], [q0[0], q0[1], za]] : null,
      s:isoPoly(f4, fill, null) + `<path d="${d}" fill="none" stroke="${trait}" stroke-width=".8" stroke-linecap="round"/>`});};
  /* un pan long se coupe en panneaux : chacun se range tout seul parmi les meubles qui l'entourent */
  /* un pan se coupe aussi là où un autre mur le croise : chaque morceau reste alors d'un seul côté de l'autre mur */
  const pans = (t0, t1, za, zb, fill, trait) => {
    const bornes = [t0];
    for(const c of (coupures || [])) if(c > t0 + 1e-4 && c < t1 - 1e-4) bornes.push(c);
    bornes.push(t1);
    bornes.sort((x, y) => x - y);
    const m = [];
    for(let k = 0; k + 1 < bornes.length; k++){
      const u0 = bornes[k], u1 = bornes[k + 1], n = Math.max(1, Math.ceil((u1 - u0) * Lg / ISO_PAN));
      for(let i = 0; i < n; i++) m.push([u0 + (u1 - u0) * i / n, u0 + (u1 - u0) * (i + 1) / n]);}
    m.forEach((q, i) => quad(q[0], q[1], za, zb, fill, trait, i === 0, i === m.length - 1));};
  const trous = (Lg < .2 ? [] : (ouv || []).slice().sort((x, y) => x.t0 - y.t0));
  if(!trous.length){ pans(0, 1, z0, z1, mc, mt); return; }
  let t = 0;
  for(const o of trous){
    const t0 = Math.max(t, Math.max(0, Math.min(1, o.t0))), t1 = Math.max(0, Math.min(1, o.t1));
    if(t1 <= t) continue;
    if(t0 > t) pans(t, t0, z0, z1, mc, mt);
    const h0 = z0 + o.h0, h1 = Math.min(z1, z0 + o.h1);
    pans(t0, t1, z0, h0, mc, mt);                      /* l'allège, sous une fenêtre */
    pans(t0, t1, h1, z1, mc, mt);                      /* le linteau */
    if(o.f){
      const p0 = pt(t0), p1 = pt(t1);
      const pts3 = [[p0[0], p0[1], h1], [p1[0], p1[1], h1], [p1[0], p1[1], h0], [p0[0], p0[1], h0]];
      const r = pts3.map(q => isoPt(C, q[0], q[1], q[2]));
      let s = isoPoly(r, o.f, o.e || INK, {trait:1});
      /* les traverses : une porte double se partage au milieu, une grille a ses barreaux */
      const P = (u, v) => {const q = pt(t0 + (t1 - t0) * u); return isoPt(C, q[0], q[1], h0 + (h1 - h0) * v)};
      const ligne = (u0, v0, u1, v1) => {const A = P(u0, v0), B = P(u1, v1); s += `<line x1="${fx(A[0])}" y1="${fx(A[1])}" x2="${fx(B[0])}" y2="${fx(B[1])}" stroke="${o.e || INK}" stroke-width=".9"/>`};
      if(o.trait === 'v' || o.trait === 'croix') ligne(.5, 0, .5, 1);
      if(o.trait === 'h' || o.trait === 'croix') ligne(0, .5, 1, .5);
      if(o.trait === 'barreaux') for(const u of [.25, .5, .75]) ligne(u, 0, u, 1);
      L.push({c:1, d:isoProfMax(C, pts3), s:s, o:ISO_OBJ || isoObjet([p0, p1], h0, h1), e:ISO_ET, dos:!!ISO_OBJ && isoDos(C, pts3, ISO_OBJ), p3:ISO_TRACE ? pts3 : null});}
    t = t1;}
  if(t < 1) pans(t, 1, z0, z1, mc, mt);}
/* un volume : un polygone monté, avec ses faces visibles et son dessus */
function isoPrisme(L, C, pts, z0, z1, col, o){
  o = o || {};
  if(!pts || pts.length < 3) return;
  /* un volume plein se range d'un bloc ; les murs d'une pièce, creux, se rangent panneau par panneau */
  if(o.creux){
    const avant = ISO_OBJ;
    ISO_OBJ = null;
    try{ isoPrismeFaces(L, C, pts, z0, z1, col, o); } finally { ISO_OBJ = avant; }
    return;}
  isoAvec(pts, z0, z1, () => isoPrismeFaces(L, C, pts, z0, z1, col, o));}
function isoPrismeFaces(L, C, pts, z0, z1, col, o){
  const c = isoCentre(pts), dc = isoProf(C, c[0], c[1], 0);
  const quelles = o.faces || 'pres';
  for(let i = 0; i < pts.length; i++){
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dm = isoProf(C, m[0], m[1], 0);
    const devant = dm > dc + 1e-9;
    /* « pres » : la maison vue de dehors. « loin » : les murs du fond seulement, on voit dans les pièces */
    if(quelles === 'pres' && !devant) continue;
    if(quelles === 'loin' && devant) continue;
    const ouv = (o.ouv || []).map(x => isoSurFace(a, b, x)).filter(Boolean);
    for(const k of (o.coupes || [])){const c = isoCoupe(a, b, k); if(c) ouv.push(c)}
    isoFace(L, C, a, b, z0, z1, col, ouv, isoCoupures(a, b, o.lignes));}
  if(o.dessus !== false)
    isoPousser(L, C, pts.map(q => [q[0], q[1], z1]), shade(col, o.clair || 1), shade(col, .6));}
/* un mur tracé à l'outil Mur, posé sur le bord d'une pièce, prend la place du mur de la pièce :
   un garde-corps sur le bord d'un balcon, une cloison épaisse sur un côté. La pièce n'y monte rien. */
function isoCoupe(a, b, s){
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  if(L2 < .01) return null;
  const L = Math.sqrt(L2);
  const loin = (x, y) => Math.abs((x - a[0]) * dy - (y - a[1]) * dx) / L;
  if(loin(s[0], s[1]) > .05 || loin(s[2], s[3]) > .05) return null;
  const t = (x, y) => ((x - a[0]) * dx + (y - a[1]) * dy) / L2;
  const u = t(s[0], s[1]), v = t(s[2], s[3]);
  const t0 = Math.max(0, Math.min(u, v)), t1 = Math.min(1, Math.max(u, v));
  if((t1 - t0) * L < .02) return null;
  return {t0:t0, t1:t1, h0:0, h1:1e6, f:null};}
/* là où d'autres murs croisent ce pan (0 et 1 exclus : un mur qui s'arrête au bout ne le coupe pas) */
function isoCoupures(a, b, lignes){
  const out = [];
  if(!lignes) return out;
  const rx = b[0] - a[0], ry = b[1] - a[1];
  for(const s of lignes){
    const sx = s[2] - s[0], sy = s[3] - s[1], den = rx * sy - ry * sx;
    if(Math.abs(den) < 1e-9) continue;
    const qx = s[0] - a[0], qy = s[1] - a[1];
    const t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
    if(t > .001 && t < .999 && u >= -.001 && u <= 1.001) out.push(t);}
  return out;}
/* une ouverture tombe-t-elle sur cette face ? */
function isoSurFace(a, b, o){
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  if(L2 < .04) return null;
  const t = ((o.x - a[0]) * dx + (o.y - a[1]) * dy) / L2;
  const px = a[0] + dx * t, py = a[1] + dy * t;
  if(Math.hypot(o.x - px, o.y - py) > .45) return null;
  const L = Math.sqrt(L2), demi = (o.w / 2) / L;
  if(t + demi < .02 || t - demi > .98) return null;
  /* la face doit aller dans le même sens que l'ouverture */
  const ang = Math.atan2(dy, dx), d = Math.abs(Math.sin(ang - o.a));
  if(d > .35) return null;
  return {t0:t - demi, t1:t + demi, h0:o.h0, h1:o.h1, f:o.f, e:o.e, trait:o.trait};}
/* un toit posé sur quatre coins : pignon, croupe, plat, conique */
function isoToit(L, C, q, z, h, type, col){
  if(type === 'aucun') return;
  /* un toit est un seul objet : ses pans se rangent entre eux, ceux qui tournent le dos d'abord */
  isoAvec(q, z, z + (type === 'plat' ? .25 : h), () => isoToitPans(L, C, q, z, h, type, col));}
function isoToitPans(L, C, q, z, h, type, col){
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const P = (p, zz) => isoPt(C, p[0], p[1], zz);
  const pousse = (pts, zs, f) => isoPousser(L, C, pts.map((p, i) => [p[0], p[1], zs[i]]), shade(col, f), shade(col, f * .6));
  const c = isoCentre(q);
  if(type === 'plat'){
    pousse(q, q.map(() => z + .25), 1);
    return;}
  if(type === 'conique'){
    for(let i = 0; i < 4; i++) pousse([q[i], q[(i + 1) % 4], c], [z, z, z + h], i % 2 ? .78 : .95);
    return;}
  const L01 = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
  const L12 = Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1]);
  /* le faîte suit le plus long côté */
  const long = L01 >= L12;
  const a = long ? mid(q[1], q[2]) : mid(q[0], q[1]);
  const b = long ? mid(q[3], q[0]) : mid(q[2], q[3]);
  const f1 = long ? [q[0], q[1], a, b] : [q[1], q[2], b, a];
  const f2 = long ? [q[2], q[3], b, a] : [q[3], q[0], a, b];
  const croupe = type === 'croupe';
  if(croupe){
    const vers = (p, q2, k) => [p[0] + (q2[0] - p[0]) * k, p[1] + (q2[1] - p[1]) * k];
    const a2 = vers(a, b, .22), b2 = vers(b, a, .22);
    pousse(long ? [q[0], q[1], a2, b2] : [q[1], q[2], b2, a2], [z, z, z + h, z + h], .95);
    pousse(long ? [q[2], q[3], b2, a2] : [q[3], q[0], a2, b2], [z, z, z + h, z + h], .72);
    pousse(long ? [q[1], q[2], a2] : [q[2], q[3], b2], [z, z, z + h], .84);
    pousse(long ? [q[3], q[0], b2] : [q[0], q[1], a2], [z, z, z + h], .84);
    return;}
  pousse(f1, [z, z, z + h, z + h], .95);
  pousse(f2, [z, z, z + h, z + h], .72);
  pousse(long ? [q[1], q[2], a] : [q[2], q[3], b], [z, z, z + h], .84);
  pousse(long ? [q[3], q[0], b] : [q[0], q[1], a], [z, z, z + h], .84);}
/* un ruban à plat : une route, une rivière */
function isoRuban(L, C, pts, larg, z, col, bord){
  for(let i = 0; i + 1 < pts.length; i++){
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    if(d < .01) continue;
    const nx = -dy / d * larg / 2, ny = dx / d * larg / 2;
    isoPlat(L, C, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], z, col, bord ? {trait2:bord, trait:.6} : null);}}
const isoQuad = (x, y, w, h, a) => {
  const r = (a || 0) * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(p => [x + p[0] * co - p[1] * si, y + p[0] * si + p[1] * co]);};

/* ---------- un bâtiment ---------- */
const ISO_HF = {lit:.55, litdbl:.55, litsup:1.7, table:.76, tabler:.76, chaise:.95, banc:.45, coffre:.55, etagere:1.9, armoire:2, bureau:.78,
  pupitre:1.15, cheminee:2.6, fourneau:1.3, tonneau:.9, cuve:1.1, baignoire:.6, latrines:.8, puits:1, fontaine:.8, autel:1.1, colonne:3.2,
  trone:1.4, estrade:.35, tapis:.03, plante:1.2, statue:2, etabli:.95, comptoir:1.1, sacs:.7, metier:1.6, foyer:.4, enclume:.75};
const ISO_CF = {cheminee:'#b7b0a0', colonne:'#cfc6b2', statue:'#cfc6b2', autel:'#cfc6b2', fontaine:'#bcd6e0', puits:'#b7b0a0', foyer:'#b7b0a0',
  enclume:'#8d8a86', baignoire:'#bcd6e0', cuve:'#bcd6e0', tapis:'#9a5a4a', estrade:'#c2a87e', latrines:'#cfc6b2', fourneau:'#b7b0a0'};
/* ce qui n'est pas un pavé : un tonneau, une cuve, une table ronde, un puits, une fontaine, une colonne */
const ISO_ROND = {tonneau:'tonneau', cuve:'cyl', tabler:'cyl', puits:'cyl', fontaine:'bassin', colonne:'cyl',
  foyer:'cyl', plante:'plante', statue:'cyl', trone:'', estrade:''};
const isoCercle = (cx, cy, rx, ry, n) => {
  const o = [];
  n = n || 14;
  for(let i = 0; i < n; i++){const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])}
  return o;};
/* une boule posée : un buisson, un feuillage */
function isoBulle(L, C, cx, cy, rx, ry, z0, h, col){
  isoPrisme(L, C, isoCercle(cx, cy, rx * .7, ry * .7, 10), z0, z0 + h * .32, shade(col, .92), {dessus:false});
  isoPrisme(L, C, isoCercle(cx, cy, rx, ry, 12), z0 + h * .32, z0 + h * .68, col, {dessus:false});
  isoPrisme(L, C, isoCercle(cx, cy, rx * .62, ry * .62, 10), z0 + h * .68, z0 + h, shade(col, 1.08));}
/* couper un contour par le demi-plan d'un mur : ce qui dépasse de l'autre côté est raboté */
function isoCouper(pts, nx, ny, c0){
  const out = [];
  for(let i = 0; i < pts.length; i++){
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const da = a[0] * nx + a[1] * ny - c0, db = b[0] * nx + b[1] * ny - c0;
    if(da <= 0) out.push(a);
    if((da <= 0) !== (db <= 0)){
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);}}
  return out.length > 2 ? out : null;}
/* un meuble qui chevauche un mur est raboté à ce mur : rien ne traverse à l'écran.
   Un segment peut porter une demi-épaisseur (un mur tracé à l'outil Mur est épais en relief) :
   le meuble est alors raboté à la face du mur, de son côté. */
function isoRaboter(pts, cx, cy, segs){
  if(!segs || !segs.length) return pts;
  let q = pts;
  for(const s of segs){
    const ux = s[2] - s[0], uy = s[3] - s[1], Lg = Math.hypot(ux, uy);
    if(Lg < .05) continue;
    const nx = -uy / Lg, ny = ux / Lg, demi = s[4] || 0;
    const dc = cx * nx + cy * ny - (s[0] * nx + s[1] * ny);
    if(Math.abs(dc) < demi + .015) continue;          /* le centre est dans le mur : un meuble encastré, on n'y touche pas */
    const sg = dc > 0 ? 1 : -1;
    const c0 = s[0] * nx + s[1] * ny + sg * demi;      /* la face du mur, du côté du meuble */
    /* le mur doit vraiment passer devant le meuble */
    let a = 1e9, b = -1e9, dedans = false;
    for(const p of q){
      const t = (p[0] - s[0]) * ux / Lg + (p[1] - s[1]) * uy / Lg;
      a = Math.min(a, t); b = Math.max(b, t);
      if((p[0] * nx + p[1] * ny - c0) * sg < 0) dedans = true;}
    if(!dedans || b < -.02 || a > Lg + .02) continue;
    const r = sg > 0 ? isoCouper(q, -nx, -ny, -c0) : isoCouper(q, nx, ny, c0);
    if(r) q = r;}
  return q;}
/* un meuble : un pavé, ou un volume rond quand c'en est un */
function isoMeuble(L, C, it, z0, segs){
  const d = FD[it.k] || {w:1, h:1};
  const h = ISO_HF[it.k] || .8, col = ISO_CF[it.k] || '#d9c9a3';
  const rond = ISO_ROND[it.k], cx = it.x, cy = it.y, rx = d.w / 2, ry = d.h / 2;
  const rab = p => isoRaboter(p, cx, cy, segs);
  if(rond === 'tonneau'){
    isoPrisme(L, C, rab(isoCercle(cx, cy, rx * .82, ry * .82, 12)), z0, z0 + h * .16, shade(col, .94), {dessus:false});
    isoPrisme(L, C, rab(isoCercle(cx, cy, rx, ry, 12)), z0 + h * .16, z0 + h * .84, col, {dessus:false});
    isoPrisme(L, C, rab(isoCercle(cx, cy, rx * .82, ry * .82, 12)), z0 + h * .84, z0 + h, shade(col, .94));
    return;}
  if(rond === 'bassin'){
    /* l'eau et sa margelle ne font qu'un : l'eau d'abord, la margelle de devant par-dessus */
    const bord = rab(isoCercle(cx, cy, rx, ry, 16));
    isoAvec(bord, z0, z0 + h, () => {
      isoPlat(L, C, isoCercle(cx, cy, rx * .78, ry * .78, 16), z0 + h - .06, '#a9c5d3', {trait2:'#5f8fa6', trait:.8, vol:true});
      isoPrisme(L, C, bord, z0, z0 + h, '#cfc6b2', {dessus:false});});
    isoPrisme(L, C, isoCercle(cx, cy, rx * .16, ry * .16, 8), z0 + h - .06, z0 + h + .55, '#cfc6b2');
    return;}
  if(rond === 'plante'){
    isoPrisme(L, C, isoCercle(cx, cy, rx * .42, ry * .42, 8), z0, z0 + h * .3, '#9a7a52', {dessus:false});
    isoBulle(L, C, cx, cy, rx, ry, z0 + h * .3, h * .7, '#8fae6e');
    return;}
  if(rond){ isoPrisme(L, C, rab(isoCercle(cx, cy, rx, ry, 14)), z0, z0 + h, col); return; }
  isoPrisme(L, C, rab(isoQuad(it.x, it.y, d.w, d.h, it.r || 0)), z0, z0 + h, col);}
/* une cour : ses allées en croix, sa fontaine, ses buissons et sa colonnade, comme sur le plan */
function isoCour(L, C, r, z0, ouv){
  const g = mkrng(hstr(r.id));
  const x = r.x, y = r.y, w = r.w, h = r.h, sol = z0 + .04;
  const bulle = (cx, cy, rr) => isoBulle(L, C, cx, cy, rr, rr, z0 + .04, rr * 2.1, '#8fae6e');
  if(w * BU > 110 && h * BU > 110){
    const b = 24 / BU;
    isoPlat(L, C, [[x, y + h / 2 - b / 2], [x + w, y + h / 2 - b / 2], [x + w, y + h / 2 + b / 2], [x, y + h / 2 + b / 2]], sol, '#e9dfc3', {trait2:'#b9aa88', trait:.6});
    isoPlat(L, C, [[x + w / 2 - b / 2, y], [x + w / 2 + b / 2, y], [x + w / 2 + b / 2, y + h], [x + w / 2 - b / 2, y + h]], sol, '#e9dfc3', {trait2:'#b9aa88', trait:.6});
    const fr = 22 / BU, cx = x + w / 2, cy = y + h / 2;
    const bord = isoCercle(cx, cy, fr, fr, 16);
    isoAvec(bord, z0 + .04, z0 + .55, () => {
      isoPlat(L, C, isoCercle(cx, cy, fr * .82, fr * .82, 16), z0 + .48, '#a9c5d3', {trait2:'#5f8fa6', trait:.8, vol:true});
      isoPrisme(L, C, bord, z0 + .04, z0 + .55, '#cfc6b2', {dessus:false});});
    isoPrisme(L, C, isoCercle(cx, cy, 8 / BU, 8 / BU, 10), z0 + .48, z0 + 1.05, '#e9dfc3');
    const n = Math.max(4, Math.min(16, Math.floor(w * BU * h * BU / 9000) * 2 + 4));
    for(let i = 0; i < n; i++){
      const qx = i % 2 ? x + w * .72 : x + w * .28, qy = (i >> 1) % 2 ? y + h * .72 : y + h * .28;
      bulle(qx + (g() - .5) * w * .18, qy + (g() - .5) * h * .18, (10 + g() * 9) / BU);
      if(i >= 7) break;}
  } else {
    const n = Math.max(1, Math.floor(w * BU * h * BU / 6000));
    for(let i = 0; i < n; i++) bulle(x + 16 / BU + g() * (w - 32 / BU), y + 16 / BU + g() * (h - 32 / BU), (8 + g() * 8) / BU);}
  /* la colonnade : un fût tous les deux mètres et demi, et non le pointillé serré du plan */
  if(r.arc !== false){
    const pas = 2.5, rc = .21;
    /* un fût ne se plante jamais devant une porte ou une fenêtre */
    const libre = (cx, cy) => !(ouv || []).some(o => Math.hypot(o.x - cx, o.y - cy) < o.w / 2 + .5);
    const bord = [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]];
    for(const [x1, y1, x2, y2] of bord){
      const L2 = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(L2 / pas));
      for(let i = 0; i < n; i++){
        const t = (i + .5) / n, cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
        if(!libre(cx, cy)) continue;
        isoPrisme(L, C, isoCercle(cx, cy, rc, rc, 8), z0 + .04, z0 + 2.7, '#dbd0b6');}}}}
/* un point est-il dans ce contour ? (pour ne montrer qu'une pièce) */
function isoDedans(pts, x, y){
  let d = false;
  for(let i = 0, j = pts.length - 1; i < pts.length; j = i++){
    const a = pts[i], b = pts[j];
    if(((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) d = !d;}
  return d;}
function isoContour(it){
  if(it.shape === 'poly' && Array.isArray(it.pts) && it.pts.length > 2){
    const p = libreApli(it);
    if(p && p.length > 2) return p.map(q => [q[0], q[1]]);}
  if(it.shape === 'ellipse'){
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2, out = [];
    for(let i = 0; i < 28; i++){const a = i / 28 * Math.PI * 2; out.push([cx + Math.cos(a) * it.w / 2, cy + Math.sin(a) * it.h / 2])}
    return out;}
  return [[it.x, it.y], [it.x + it.w, it.y], [it.x + it.w, it.y + it.h], [it.x, it.y + it.h]];}
/* le trou d'un anneau : la cour au milieu de la galerie */
function isoTrou(it){
  if(it.shape !== 'ring') return null;
  const t = Math.max(.1, Math.min((it.thick || 1), Math.min(it.w, it.h) / 2 - .1));
  const x = it.x + t, y = it.y + t, w = it.w - 2 * t, h = it.h - 2 * t;
  if(w <= .2 || h <= .2) return null;
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];}
/* les portes et fenêtres d'un étage, prêtes à se poser sur les murs */
function isoOuvertures(F){
  const out = [];
  for(const it of F.items){
    if(it.t !== 'door' && it.t !== 'win') continue;
    const porte = it.t === 'door';
    const a = typeof it.ang === 'number' ? it.ang * Math.PI / 180 : (it.o === 'h' ? 0 : Math.PI / 2);
    const k = it.k || (porte ? 'porte' : 'fenetre');
    const h0 = porte ? .02 : k === 'meurtriere' ? 1.1 : k === 'baie' ? .5 : .95;
    const h1 = porte ? (k === 'arche' ? 2.6 : 2.1) : k === 'meurtriere' ? 1.9 : k === 'baie' ? 2.4 : 2;
    /* une ouverture et une arche ne sont qu'un trou : rien n'y est dessiné */
    const f = porte ? (k === 'ouverte' || k === 'arche' ? null : k === 'grille' ? '#6a6a6a' : k === 'blindee' ? '#8d8a86' : '#8a6a42')
      : '#a9c5d3';
    const trait = porte ? (k === 'double' ? 'v' : k === 'grille' ? 'barreaux' : '')
      : (k === 'meurtriere' ? '' : k === 'baie' ? 'v' : 'croix');
    out.push({x:it.x, y:it.y, w:Math.max(.3, it.w || .9), a:a, h0:h0, h1:h1, f:f, e:INK, trait:trait});}
  return out;}
function isoEscalier(L, C, it, z0){
  const n = 9, d = it.dir || 'n', h = ISO_HE * .92;
  const col = '#c2a87e';
  if(d === 'spiral'){
    for(let i = 0; i < n; i++){
      const a = i / n * Math.PI * 1.6, r = Math.min(it.w, it.h) / 2 * .9;
      const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
      const q = [[cx, cy], [cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a + .6) * r, cy + Math.sin(a + .6) * r]];
      isoPrisme(L, C, q, z0 + h * i / n, z0 + h * (i + 1) / n, col);}
    return;}
  const vert = d === 'n' || d === 's';
  for(let i = 0; i < n; i++){
    const u0 = i / n, u1 = (i + 1) / n;
    const mont = (d === 'n' || d === 'w') ? n - i : i + 1;   /* la marche la plus haute est du côté où l'on monte */
    const q = vert ? [[it.x, it.y + it.h * u0], [it.x + it.w, it.y + it.h * u0], [it.x + it.w, it.y + it.h * u1], [it.x, it.y + it.h * u1]]
      : [[it.x + it.w * u0, it.y], [it.x + it.w * u1, it.y], [it.x + it.w * u1, it.y + it.h], [it.x + it.w * u0, it.y + it.h]];
    isoPrisme(L, C, q, z0, z0 + h * mont / n, col);}}
/* un mur tracé à l'outil Mur : épais, droit ou courbe comme sur le plan. Ses faces et ses bouts sont
   des panneaux qui se rangent chacun à sa place, son dessus est d'un seul tenant : un meuble posé contre
   lui, un autre mur qui le croise ne passent plus au travers. */
function isoMurTrace(L, C, it, z0, z1, col, ouv, lignes){
  const f = murApl(it);
  if(f.length < 2) return;
  const d2 = (it.k === 'bas' ? .14 : .22) / 2;
  const nrm = [];
  for(let i = 0; i + 1 < f.length; i++){
    const dx = f[i + 1][0] - f[i][0], dy = f[i + 1][1] - f[i][1], d = Math.hypot(dx, dy) || 1;
    nrm.push([-dy / d, dx / d]);}
  /* les deux bords, à une demi-épaisseur, avec des coins en onglet */
  const G = [], D = [];
  for(let i = 0; i < f.length; i++){
    const a = nrm[Math.max(0, i - 1)], b = nrm[Math.min(nrm.length - 1, i)];
    let nx = a[0] + b[0], ny = a[1] + b[1];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    const k = d2 / Math.max(.3, nx * b[0] + ny * b[1]);
    G.push([f[i][0] + nx * k, f[i][1] + ny * k]);
    D.push([f[i][0] - nx * k, f[i][1] - ny * k]);}
  /* une face se montre quand elle regarde l'œil */
  const vue = (x, y) => {const r = isoTourne(x, y, C.r); return r[0] + r[1] > 1e-9};
  const ses = (p, q) => (ouv || []).map(o => isoSurFace(p, q, o)).filter(Boolean);
  for(let i = 0; i + 1 < f.length; i++){
    const n = nrm[i];
    if(vue(n[0], n[1])) isoFace(L, C, G[i], G[i + 1], z0, z1, col, ses(G[i], G[i + 1]), isoCoupures(G[i], G[i + 1], lignes));
    if(vue(-n[0], -n[1])) isoFace(L, C, D[i + 1], D[i], z0, z1, col, ses(D[i + 1], D[i]), isoCoupures(D[i + 1], D[i], lignes));}
  const m = f.length - 1, n0 = nrm[0], n1 = nrm[nrm.length - 1];
  if(vue(-n0[1], n0[0])) isoFace(L, C, D[0], G[0], z0, z1, col, []);
  if(vue(n1[1], -n1[0])) isoFace(L, C, G[m], D[m], z0, z1, col, []);
  isoPousser(L, C, G.concat(D.slice().reverse()).map(p => [p[0], p[1], z1]), shade(col, 1), shade(col, .6));}
/* la pièce qu'on regarde seule, si on en a choisi une sur cet étage */
function isoPieceSeule(F){
  if(!ui.iso.piece || !F) return null;
  const r = F.items.find(i => i.t === 'room' && i.id === ui.iso.piece);
  return r || null;}
function isoEtage(L, C, b, fi, z0, dernier){
  const F = b.floors[fi];
  if(!F) return;
  ISO_ET = fi;
  const seule = isoPieceSeule(F);
  const dedans = it => {
    if(!seule) return true;
    const p = isoContour(seule), trou = isoTrou(seule);
    const ok = (x, y) => isoDedans(p, x, y) && !(trou && isoDedans(trou, x, y));
    /* un mur posé sur le bord de la pièce en fait partie : on le tâte d'un côté et de l'autre */
    if(it.t === 'wall'){
      const x = (it.x1 + it.x2) / 2, y = (it.y1 + it.y2) / 2, dx = it.x2 - it.x1, dy = it.y2 - it.y1, d = Math.hypot(dx, dy) || 1;
      return ok(x, y) || ok(x - dy / d * .06, y + dx / d * .06) || ok(x + dy / d * .06, y - dx / d * .06);}
    const c = it.t === 'room' || it.t === 'stair' ? [it.x + it.w / 2, it.y + it.h / 2] : [it.x, it.y];
    return ok(c[0], c[1]);};
  const ouv = isoOuvertures(F);
  const segsM = murSegs(F, true);     /* les murs, pour raboter ce qui les chevauche (à leur face, s'ils sont épais) */
  const hm = isoHautMur();
  const murs = [];
  for(const it of F.items){
    if(it.t !== 'room') continue;
    if(seule ? it.id !== seule.id : false) continue;
    const pts = isoContour(it), trou = isoTrou(it);
    const rk = RK[it.kind] || RK.piece;
    if(rk.f !== 'none') isoPlat(L, C, pts, z0 + .02, shade(rk.f, .98), {trait2:shade(rk.f, .7), trait:.7, trou:trou});
    if(it.kind === 'cour') isoCour(L, C, it, z0 + .02, ouv);
    if(!ISO_SANS_MUR[it.kind]){
      murs.push({pts:pts, h:hm});
      if(trou) murs.push({pts:trou, h:hm});}}
  const coupes = [], lignes = [];
  if(hm > 0) for(const it of F.items) if(it.t === 'wall' && dedans(it)) for(const k of wallSegs({items:[it]})){
    coupes.push(k);
    /* un mur tracé coupe les autres à ses deux faces et en son milieu */
    const d = Math.hypot(k[2] - k[0], k[3] - k[1]) || 1, e = (it.k === 'bas' ? .07 : .11), nx = -(k[3] - k[1]) / d * e, ny = (k[2] - k[0]) / d * e;
    lignes.push(k, [k[0] + nx, k[1] + ny, k[2] + nx, k[3] + ny], [k[0] - nx, k[1] - ny, k[2] - nx, k[3] - ny]);}
  for(const m of murs) for(let i = 0; i < m.pts.length; i++){const a = m.pts[i], b = m.pts[(i + 1) % m.pts.length]; lignes.push([a[0], a[1], b[0], b[1]])}
  if(hm > 0) for(const m of murs)
    isoPrisme(L, C, m.pts, z0 + .02, z0 + m.h, '#e2d6b8', {dessus:false, creux:true, faces:isoFaces(), ouv:ui.iso.murs === 'mi' ? [] : ouv, coupes:coupes, lignes:lignes});
  for(const it of F.items){
    if(!dedans(it)) continue;
    if(it.t === 'wall'){
      if(hm <= 0) continue;
      isoMurTrace(L, C, it, z0 + .02, z0 + Math.min(hm, it.k === 'bas' ? ISO_HB2 : ISO_HM), it.k === 'bas' ? '#d6c8a4' : '#ded1b0',
        ui.iso.murs === 'mi' || it.k === 'bas' ? [] : ouv, lignes);}
    else if(it.t === 'stair') isoEscalier(L, C, it, z0 + .02);
    else if(it.t === 'furn') isoMeuble(L, C, it, z0 + .03, segsM);}
  /* le toit, posé sur le dernier étage : il n'a rien où se poser quand les murs sont enlevés */
  if(dernier && ui.iso.toit && ui.iso.murs === 'entiers' && !seule){
    const e = floorExtent(F);
    if(e){
      const fc = b.facade || {}, st = FS[fc.style] || FS.pierre;
      const q = [[e.x0, e.y0], [e.x1, e.y0], [e.x1, e.y1], [e.x0, e.y1]];
      const hh = Math.min(4.2, Math.max(1.4, Math.min(e.x1 - e.x0, e.y1 - e.y0) * .35));
      isoToit(L, C, q, z0 + ISO_HM, hh, fc.roof === 'plat' ? 'plat' : fc.roof === 'pignon' ? 'pignon' : fc.roof === 'conique' ? 'conique' : 'croupe', st.roof);}}}

/* ---------- un village ---------- */
const ISO_HB = {maison:4.4, chaumiere:3.4, grande:6.4, boutique:4.4, taverne:6.2, forge:4.4, ferme:4.8, grange:6, etable:3.4, entrepot:5.6,
  moulin:5.6, moulinv:7.5, eglise:8, chapelle:5, tour:11, manoir:8, halle:5, puits:.9, porte:6.5, cabane:2.6, tente:2.4};
const ISO_TB = {tour:'conique', moulinv:'conique', tente:'conique', chapelle:'pignon', eglise:'pignon', puits:'aucun', porte:'plat',
  manoir:'croupe', grande:'croupe', halle:'pignon'};
function isoVillage(L, C, v){
  const th = TH[v.theme] || TH.ete, W = v.W, H = v.H;
  isoPlat(L, C, [[0, 0], [W, 0], [W, H], [0, H]], 0, th.ground, {trait2:shade(th.ground, .72), trait:1.4});
  const it = v.items;
  const couleur = {foret:th.forest, champ:th.field, place:th.place, jardin:th.jardin, cimetiere:th.cim, lac:th.water, marais:th.water, colline:shade(th.ground, .92)};
  for(const k of ['colline', 'marais', 'foret', 'champ', 'jardin', 'cimetiere', 'lac', 'place'])
    for(const p of it.filter(i => i.t === 'poly' && i.k === k)){
      const pts = p.pts.map(q => [q[0], q[1]]);
      if(k === 'colline') isoPrisme(L, C, pts, 0, 2.2, couleur[k], {clair:1.04});
      else isoPlat(L, C, pts, k === 'lac' || k === 'marais' ? .04 : .06, couleur[k] || th.place, {trait2:shade(couleur[k] || th.place, .78), trait:.7});}
  for(const r of it.filter(i => i.t === 'river')){
    const p = r.pts.map(q => [q[0], q[1]]), w = Math.max(1, r.w || 3);
    isoRuban(L, C, p, w + 1.4, .07, th.waterE);
    isoRuban(L, C, p, w, .08, th.water);}
  for(const r of it.filter(i => i.t === 'road')){
    const p = r.pts.map(q => [q[0], q[1]]), w = Math.max(1, roadW(r));
    isoRuban(L, C, p, w + 1.2, .11, th.roadE);
    isoRuban(L, C, p, w, .12, th.road);}
  for(const w of it.filter(i => i.t === 'wall')){
    const h = w.k === 'palissade' ? 2.6 : w.k === 'haie' ? 1.4 : 4.4;
    const ep = w.k === 'haie' ? 1.2 : w.k === 'palissade' ? .5 : 1;
    const col = w.k === 'haie' ? '#5d7a46' : w.k === 'palissade' ? '#9a7a52' : '#b3ada1';
    const pts = w.pts.map(q => [q[0], q[1]]);
    const n = w.closed ? pts.length : pts.length - 1;
    for(let i = 0; i < n; i++){
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d * ep / 2, ny = dx / d * ep / 2;
      isoPrisme(L, C, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], 0, h, col);}
    if(w.k !== 'haie' && w.towers !== false)
      for(const p of pts) isoPrisme(L, C, isoQuad(p[0], p[1], ep * 2.4, ep * 2.4, 0), 0, h * 1.35, shade(col, .95));}
  for(const b of it.filter(i => i.t === 'bld')){
    const d = VKD[b.k] || VKD.maison;
    const q = isoQuad(b.x, b.y, b.w || d.w, b.h || d.h, b.a || 0);
    const haut = ISO_HB[b.k] || 4.4;
    const mur = b.k === 'chaumiere' || b.k === 'cabane' || b.k === 'grange' || b.k === 'etable' || b.k === 'entrepot' ? '#c7ab80' : shade(th.place, 1);
    isoPrisme(L, C, q, 0, haut, mur, {dessus:false});
    const t = ISO_TB[b.k] || 'pignon';
    const hh = t === 'conique' ? Math.max(2, Math.min(b.w || d.w, b.h || d.h) * .8) : Math.max(1.2, Math.min(b.w || d.w, b.h || d.h) * .42);
    isoToit(L, C, q, haut, hh, t, roofColor(th, b.roof || d.roof, b.id || ''));}
  for(const t of it.filter(i => i.t === 'tree')){
    const r = Math.max(.6, (t.r || 4) / 2), c = th.tree[hs(t.id || '' + t.x + t.y) % th.tree.length];
    isoPrisme(L, C, isoQuad(t.x, t.y, .4, .4, 0), 0, t.k === 'buisson' ? .2 : 1.6, '#7c6039', {dessus:false});
    const base = t.k === 'buisson' ? .2 : 1.6;
    if(t.k === 'conifere'){
      const q = isoQuad(t.x, t.y, r * 1.6, r * 1.6, 0);
      isoToit(L, C, q, base, r * 2.6, 'conique', c);}
    else {
      const p = isoPt(C, t.x, t.y, base + r * .9);
      L.push({c:1, d:isoProf(C, t.x, t.y, base + r), o:isoObjet(isoQuad(t.x, t.y, r * 2, r * 2, 0), base, base + r * 1.8), e:ISO_ET, s:`<ellipse cx="${fx(p[0])}" cy="${fx(p[1])}" rx="${fx(r * C.m)}" ry="${fx(r * C.m * .8)}" fill="${c}" stroke="${th.treeE}" stroke-width="1"/>`
        + `<ellipse cx="${fx(p[0] - r * C.m * .3)}" cy="${fx(p[1] - r * C.m * .3)}" rx="${fx(r * C.m * .4)}" ry="${fx(r * C.m * .32)}" fill="${shade(c, 1.14)}"/>`});}}
  for(const m of it.filter(i => i.t === 'mark')){
    const p = isoPt(C, m.x, m.y, 2.4);
    L.push({c:2, d:isoProf(C, m.x, m.y, 2.4), s:`<circle cx="${fx(p[0])}" cy="${fx(p[1])}" r="9" fill="#8a2f2f" stroke="#fff7ee" stroke-width="1.6"/>`
      + `<text x="${fx(p[0])}" y="${fx(p[1] + 3.6)}" font-family="${FONT}" font-size="10.5" font-weight="700" fill="#fff7ee" text-anchor="middle">${esc(m.n)}</text>`});}
  for(const b of it.filter(i => i.t === 'bld' && i.name && i.show !== false)){
    const p = isoPt(C, b.x, b.y, (ISO_HB[b.k] || 4.4) + 3);
    L.push({c:2, d:0, s:`<text x="${fx(p[0])}" y="${fx(p[1])}" font-family="${FONT}" font-size="10" font-style="italic" text-anchor="middle" fill="${INK}" stroke="${th.ground}" stroke-width="2.6" paint-order="stroke">${esc(b.name)}</text>`});}}

/* ---------- la scène, mise en page ---------- */
function isoScene(){
  const bat = ui.mode === 'b';
  const C = {m:bat ? ISO_MB : ISO_MV, r:ui.iso.rot | 0, cx:0, cy:0, ox:0, oy:0};
  let e, zmax;
  if(bat){
    const b = CB();
    const seule = isoPieceSeule(b.floors[ui.fl]);
    const et = (ui.iso.tous && !seule) ? b.floors.length : 1;
    e = seule ? {x0:seule.x - .6, y0:seule.y - .6, x1:seule.x + seule.w + .6, y1:seule.y + seule.h + .6}
      : (bldExtent(b) || {x0:0, y0:0, x1:b.gw, y1:b.gh});
    zmax = (et > 1 ? (et - 1) * ISO_HE : 0) + ISO_HM + (ui.iso.toit && !seule ? 4.4 : 0);
  } else {
    const v = CV();
    e = {x0:0, y0:0, x1:v.W, y1:v.H};
    zmax = 14;}
  C.cx = (e.x0 + e.x1) / 2; C.cy = (e.y0 + e.y1) / 2;
  /* le cadre : les huit coins du volume, projetés */
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for(const x of [e.x0, e.x1]) for(const y of [e.y0, e.y1]) for(const z of [0, zmax]){
    const p = isoPt(C, x, y, z);
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);}
  const pad = 40;
  C.ox = pad - x0; C.oy = pad - y0;
  const L = [];
  ISO_ET = 0; ISO_OBJ = null;
  if(bat){
    const b = CB();
    if(ui.iso.tous && !isoPieceSeule(b.floors[ui.fl])) b.floors.forEach((F, i) => isoEtage(L, C, b, i, i * ISO_HE, i === b.floors.length - 1));
    else isoEtage(L, C, b, ui.fl, 0, ui.fl === b.floors.length - 1);
  } else isoVillage(L, C, CV());
  /* dans le volet, ce qu'on a choisi au plan s'éclaire */
  if(isoDeux() && ui.sel.length) for(const it of (ui.mode === 'b' ? selItems() : vsel())){
    const q = it.t === 'wall' ? [[it.x1, it.y1], [it.x2, it.y2]]
      : it.t === 'furn' ? isoQuad(it.x, it.y, (FD[it.k] || {w:1}).w, (FD[it.k] || {h:1}).h, it.r || 0)
      : it.t === 'room' ? isoContour(it)
      : (typeof it.w === 'number' && typeof it.h === 'number') ? [[it.x, it.y], [it.x + it.w, it.y], [it.x + it.w, it.y + it.h], [it.x, it.y + it.h]]
      : [[it.x - .4, it.y - .4], [it.x + .4, it.y - .4], [it.x + .4, it.y + .4], [it.x - .4, it.y + .4]];
    if(!q || q.length < 2) continue;
    const z = ui.mode === 'b' && ui.iso.tous ? ui.fl * ISO_HE : 0;
    const p = q.map(x => isoPt(C, x[0], x[1], z + .06));
    L.push({c:2, d:0, s:`<polyline points="${p.concat(q.length > 2 ? [p[0]] : []).map(x => fx(x[0]) + ',' + fx(x[1])).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round" opacity=".95"/>`});}
  const R = isoRanger(L, C);
  return {inner:R.map(x => x.s).join(''), w:Math.ceil(x1 - x0 + pad * 2), h:Math.ceil(y1 - y0 + pad * 2), n:R.length};}

/* ---------- l'ordre de dessin ----------
   Étage par étage, de bas en haut : les sols d'abord, dans l'ordre du plan (une route sur un champ,
   une pièce posée sur une autre), puis les volumes rangés objet par objet.
   Deux objets qui se recouvrent à l'écran sont ordonnés par un plan qui les sépare (le dessus de
   l'un, ou un plan vertical tiré d'un de leurs côtés) : celui qui est du côté de l'œil passe après.
   Ces paires forment un graphe qu'on parcourt du plus loin au plus près. Quand aucun plan ne les
   sépare (deux meubles qui s'emboîtent), c'est la profondeur de leur centre qui décide. */
function isoRanger(L, C){
  L.forEach((x, i) => {x.i = i});
  const parE = new Map();
  for(const x of L){
    if(x.c === 2) continue;
    const e = x.e || 0;
    if(!parE.has(e)) parE.set(e, {sols:[], vols:[]});
    (x.c === 0 ? parE.get(e).sols : parE.get(e).vols).push(x);}
  const R = [];
  for(const e of [...parE.keys()].sort((a, b) => a - b)){
    const g = parE.get(e);
    g.sols.sort((a, b) => a.i - b.i);
    R.push(...g.sols, ...isoTopo(g.vols, C));}
  R.push(...L.filter(x => x.c === 2).sort((a, b) => (a.d - b.d) || (a.i - b.i)));
  return R;}
/* les axes d'un contour, vu d'en haut : la normale de chaque côté (et, pour un simple trait, sa direction) */
function isoAxes(rp){
  const ax = [];
  const ajoute = (x, y) => {
    const l = Math.hypot(x, y);
    if(l < 1e-9) return;
    x /= l; y /= l;
    for(const a of ax) if(Math.abs(a[0] * y - a[1] * x) < 1e-6) return;
    ax.push([x, y]);};
  if(rp.length === 2){
    const dx = rp[1][0] - rp[0][0], dy = rp[1][1] - rp[0][1];
    ajoute(-dy, dx); ajoute(dx, dy);
    return ax;}
  for(let i = 0; i < rp.length; i++){
    const a = rp[i], b = rp[(i + 1) % rp.length];
    ajoute(a[1] - b[1], b[0] - a[0]);}
  return ax;}
/* -1 : a est derrière b ; 1 : b est derrière a ; 0 : on ne sait pas, ou ils ne se recouvrent pas */
function isoDerriere(a, b){
  const e = .004;
  if(a.z1 <= b.z0 + e) return -1;               /* a est dessous : b, au-dessus, est du côté de l'œil */
  if(b.z1 <= a.z0 + e) return 1;
  for(const axes of [a.ax, b.ax]) for(const n of axes){
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for(const p of a.rp){const t = p[0] * n[0] + p[1] * n[1]; if(t < a0) a0 = t; if(t > a1) a1 = t}
    for(const p of b.rp){const t = p[0] * n[0] + p[1] * n[1]; if(t < b0) b0 = t; if(t > b1) b1 = t}
    /* l'œil regarde depuis (1, 1, 1) : le côté de l'axe tourné vers lui est celui où n.x + n.y est positif */
    const s = n[0] + n[1];
    if(a1 <= b0 + e) return s > 1e-6 ? -1 : s < -1e-6 ? 1 : 0;
    if(b1 <= a0 + e) return s > 1e-6 ? 1 : s < -1e-6 ? -1 : 0;}
  return isoCroise(a, b);}
/* Deux objets qui se traversent (un pan de pièce dans l'épaisseur d'un mur tracé, deux murs qui se croisent,
   une tour sur une palissade) : aucun plan ne les sépare. On regarde alors, en quelques points de l'écran
   où ils se recouvrent, lequel l'œil touche en premier. Les coordonnées sont celles de l'écran, sans l'échelle :
   a = X − Y et b = (X + Y)·sin 30° − z, dans le repère tourné. */
function isoEcran(g){
  if(g.ec) return g.ec;
  const P = [];
  for(const p of g.rp) for(const z of [g.z0, g.z1]) P.push([p[0] - p[1], (p[0] + p[1]) * ISO_S - z]);
  return (g.ec = isoEnveloppe(P));}
function isoEnveloppe(P){
  P = P.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  if(P.length < 3) return P;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for(const p of P){while(lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p)}
  for(let i = P.length - 1; i >= 0; i--){const p = P[i]; while(hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p)}
  lo.pop(); hi.pop();
  return lo.concat(hi);}
/* ce qui reste d'un polygone convexe une fois coupé par un autre */
function isoInter(A, B){
  let out = A;
  for(let i = 0; i < B.length && out.length; i++){
    const p = B[i], q = B[(i + 1) % B.length];
    const cote = r => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const avant = out;
    out = [];
    for(let j = 0; j < avant.length; j++){
      const a = avant[j], b = avant[(j + 1) % avant.length], ca = cote(a), cb = cote(b);
      if(ca >= 0) out.push(a);
      if((ca >= 0) !== (cb >= 0)){const t = ca / (ca - cb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])}}}
  return out;}
/* la profondeur du premier point d'un objet touché par le rayon de l'œil qui passe par (a, b), ou null */
function isoFront(g, a, b){
  const rp = g.rp;
  let S0, S1;
  if(rp.length === 2){
    const p = rp[0], q = rp[1], dx = q[0] - p[0], dy = q[1] - p[1], den = dx - dy;
    if(Math.abs(den) < 1e-9) return null;
    const t = (a - (p[0] - p[1])) / den;
    if(t < -1e-6 || t > 1 + 1e-6) return null;
    S0 = S1 = (p[0] + p[1]) + t * (dx + dy);
  } else {
    let lo = 1e9, hi = -1e9;
    for(let i = 0; i < rp.length; i++){
      const p = rp[i], q = rp[(i + 1) % rp.length];
      const fp = (p[0] - p[1]) - a, fq = (q[0] - q[1]) - a;
      if(fp !== 0 && (fp > 0) === (fq > 0)) continue;
      const t = fp === fq ? 0 : fp / (fp - fq);
      const S = (p[0] + p[1]) + t * ((q[0] + q[1]) - (p[0] + p[1]));
      lo = Math.min(lo, S); hi = Math.max(hi, S);}
    if(lo > hi) return null;
    S0 = lo; S1 = hi;}
  const lo = Math.max(S0, (g.z0 + b) / ISO_S), hi = Math.min(S1, (g.z1 + b) / ISO_S);
  if(lo > hi + 1e-9) return null;
  return hi * (1 + ISO_S) - b;}
function isoCroise(a, b){
  const I = isoInter(isoEcran(a), isoEcran(b));
  if(I.length < 3) return 0;
  let ar = 0;
  for(let i = 0; i < I.length; i++){const p = I[i], q = I[(i + 1) % I.length]; ar += p[0] * q[1] - q[0] * p[1]}
  if(Math.abs(ar) < 2e-6) return 0;
  const c = isoCentre(I), pts = [c], k = Math.max(1, Math.floor(I.length / 4));
  for(let i = 0; i < I.length; i += k) pts.push([(c[0] + I[i][0]) / 2, (c[1] + I[i][1]) / 2]);
  let vote = 0;
  for(const p of pts){
    const da = isoFront(a, p[0], p[1]), db = isoFront(b, p[0], p[1]);
    if(da === null || db === null) continue;
    if(da < db - 1e-6) vote--; else if(da > db + 1e-6) vote++;}
  return vote < 0 ? -1 : vote > 0 ? 1 : 0;}
function isoTopo(E, C){
  /* les objets, et leurs morceaux dans l'ordre où ils ont été posés */
  const objs = [], parO = new Map();
  for(const x of E){
    const o = x.o || {pts:null, z0:0, z1:0};
    let g = parO.get(o);
    if(!g){g = {o:o, m:[], i:x.i, k:0, s:[]}; parO.set(o, g); objs.push(g)}
    g.m.push(x);}
  for(const g of objs){
    const o = g.o;
    if(!o.pts || !o.pts.length){g.bb = null; g.d = Math.max(...g.m.map(x => x.d)); continue}
    g.rp = o.pts.map(p => isoTourne(p[0] - C.cx, p[1] - C.cy, C.r));
    g.ax = isoAxes(g.rp);
    g.z0 = o.z0; g.z1 = o.z1;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, cx = 0, cy = 0;
    for(const p of g.rp){
      const u = (p[0] - p[1]) * ISO_C * C.m, v = (p[0] + p[1]) * ISO_S * C.m;
      x0 = Math.min(x0, u); x1 = Math.max(x1, u);
      y0 = Math.min(y0, v - o.z1 * C.m); y1 = Math.max(y1, v - o.z0 * C.m);
      cx += p[0]; cy += p[1];}
    g.bb = [x0, y0, x1, y1];
    g.d = (cx + cy) / g.rp.length + (o.z0 + o.z1) / 2;}
  /* les paires qui se recouvrent à l'écran : un balayage de gauche à droite */
  const A = objs.filter(g => g.bb).sort((a, b) => a.bb[0] - b.bb[0]);
  for(let i = 0; i < A.length; i++){
    const a = A[i];
    for(let j = i + 1; j < A.length; j++){
      const b = A[j];
      if(b.bb[0] >= a.bb[2] - .5) break;
      if(b.bb[1] >= a.bb[3] - .5 || a.bb[1] >= b.bb[3] - .5) continue;
      const r = isoDerriere(a, b);
      if(r < 0){a.s.push(b); b.k++}
      else if(r > 0){b.s.push(a); a.k++}}}
  /* le parcours : parmi ce qui est libre, le plus lointain d'abord. Un cycle (rare : des objets qui se
     traversent) se rompt par celui qui attend le moins d'objets, jamais par un grand toit qui les attend tous */
  const avant = (a, b) => (a.d - b.d) || (a.i - b.i);
  const tas = [];
  const monter = g => {
    tas.push(g);
    let i = tas.length - 1;
    while(i > 0){const p = (i - 1) >> 1; if(avant(tas[i], tas[p]) >= 0) break; [tas[i], tas[p]] = [tas[p], tas[i]]; i = p}};
  const sortir = () => {
    const h = tas[0], z = tas.pop();
    if(tas.length){
      tas[0] = z;
      let i = 0;
      for(;;){
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if(l < tas.length && avant(tas[l], tas[m]) < 0) m = l;
        if(r < tas.length && avant(tas[r], tas[m]) < 0) m = r;
        if(m === i) break;
        [tas[i], tas[m]] = [tas[m], tas[i]]; i = m;}}
    return h;};
  for(const g of objs) if(!g.k) monter(g);
  const fait = new Set(), out = [];
  while(fait.size < objs.length){
    let g = tas.length ? sortir() : null;
    if(!g){
      for(const h of objs) if(!fait.has(h) && (!g || h.k < g.k || (h.k === g.k && avant(h, g) < 0))) g = h;}
    if(fait.has(g)) continue;
    fait.add(g);
    /* dans un objet, les faces qui tournent le dos à l'œil d'abord */
    for(const x of g.m) if(x.dos) out.push(x);
    for(const x of g.m) if(!x.dos) out.push(x);
    for(const h of g.s) if(--h.k === 0 && !fait.has(h)) monter(h);}
  return out;}
/* la vue telle qu'on la montre et telle qu'on l'exporte */
function isoSVG(o){
  o = o || {};
  const s = isoScene();
  const nom = ui.mode === 'b' ? CB().name : CV().name;
  const titre = o.titre === false ? '' : `<text x="${20}" y="${30}" font-family="${FONT}" font-size="19" font-weight="700" fill="${INK}">${esc(nom)}</text>`
    + `<text x="${20}" y="${49}" font-family="${FONT}" font-size="11.5" font-style="italic" fill="${INK}">${esc(isoLegende())}</text>`;
  const haut = titre ? 58 : 0;
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h + haut}" viewBox="0 0 ${s.w} ${s.h + haut}">`
    + `<rect width="${s.w}" height="${s.h + haut}" fill="${PAPER}"/>${titre}<g transform="translate(0 ${haut})">${s.inner}</g></svg>`,
    w:s.w, h:s.h + haut, inner:`<rect width="${s.w}" height="${s.h}" fill="${PAPER}"/>` + s.inner, bw:s.w, bh:s.h};}
function isoLegende(){
  /* le nord est en haut du plan : au quart de tour 0, le coin le plus proche de l'œil est le sud-est */
  const q = ['sud-est', 'sud-ouest', 'nord-ouest', 'nord-est'][((ui.iso.rot | 0) % 4 + 4) % 4];
  if(ui.mode === 'b'){
    const b = CB();
    const seule = isoPieceSeule(b.floors[ui.fl]);
    if(seule) return 'Vue isométrique, depuis le ' + q + ' · ' + (seule.name || 'une pièce') + ', seule';
    return 'Vue isométrique, depuis le ' + q + ' · ' + (ui.iso.tous ? b.floors.length + ' étages' : b.floors[ui.fl] ? b.floors[ui.fl].name : '');}
  return 'Vue isométrique, depuis le ' + q + ' · ' + CV().W + ' × ' + CV().H + ' m';}
/* le cadre, pour que « Tout voir » tombe juste */
function isoBounds(){
  const s = isoSVG({titre:false});
  return {x0:0, y0:0, x1:s.w, y1:s.h};}
let ISO_VOLET_T = 0, ISO_VOLET_R = 0;
/* le volet de droite : refait à chaque geste, mais pas plus de dix fois par seconde */
function isoVolet(){
  const w = $('#cvwrap');
  let v = $('#isocv');
  if(!isoDeux()){
    w.classList.remove('deux');
    if(v) v.remove();
    return;}
  w.classList.add('deux');
  if(!v){
    v = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    v.id = 'isocv';
    v.setAttribute('aria-label', 'Le plan en relief');
    v.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    w.append(v);}
  const t = Date.now();
  clearTimeout(ISO_VOLET_R);
  if(t - ISO_VOLET_T < 110){ ISO_VOLET_R = setTimeout(isoVolet, 130); return; }
  ISO_VOLET_T = t;
  const o = isoSVG({titre:false});
  v.setAttribute('viewBox', '0 0 ' + o.bw + ' ' + o.bh);
  v.innerHTML = o.inner;}
function isoRender(){
  const s = isoSVG({titre:false});
  content.innerHTML = s.inner;}
function isoTourner(d){
  if(!isoOn()) return;
  ui.iso.rot = (((ui.iso.rot | 0) + d) % 4 + 4) % 4;
  renderAll(); fit();}
/* les boutons et les cases de la vue */
side.addEventListener('click', e => {
  const t = e.target.closest('[data-iso]');
  if(!t || t.tagName === 'INPUT') return;
  if(t.dataset.iso === 'g') isoTourner(-1);
  else if(t.dataset.iso === 'd') isoTourner(1);});
side.addEventListener('change', e => {
  const t = e.target.closest('input[data-iso]');
  if(!t || !isoOn()) return;
  const a = t.dataset.iso;
  if(a === 'tous' || a === 'toit'){ui.iso[a] = t.checked; renderAll(); fit()}});
side.addEventListener('change', e => {
  const t = e.target.closest('select[data-iso="murs"]');
  if(!t || !isoOn()) return;
  ui.iso.murs = ISO_MURS.some(m => m[0] === t.value) ? t.value : 'ouverts';
  renderAll(); fit();});
side.addEventListener('change', e => {
  const t = e.target.closest('select[data-iso="piece"]');
  if(!t || !isoOn()) return;
  ui.iso.piece = t.value || '';
  renderAll(); fit();});
/* les réglages, dans le panneau */
function isoPanneau(){
  if(!isoOn()) return '';
  let h = `<h3>Vue isométrique</h3><p class="hint">On regarde seulement : pour dessiner, reviens au plan.</p>`;
  h += `<div class="row"><button class="btn sm" data-iso="g">⟲ Tourner</button><button class="btn sm" data-iso="d">⟳ Tourner</button><span class="hint">ou R</span></div>`;
  if(ui.mode === 'b'){
    const b = CB();
    const F = b.floors[ui.fl], pieces = F ? F.items.filter(i => i.t === 'room') : [];
    if(pieces.length > 1){
      h += `<div class="row"><label>Montrer</label><select data-iso="piece"><option value="">Tout l’étage</option>`
        + pieces.map((r, i) => `<option value="${esc(r.id)}"${ui.iso.piece === r.id ? ' selected' : ''}>${esc(r.name || 'Pièce ' + (i + 1))} (${fx(r.w)} × ${fx(r.h)} m)</option>`).join('')
        + `</select></div>`;}
    if(b.floors.length > 1 && !isoPieceSeule(F)) h += `<div class="row"><label><input type="checkbox" data-iso="tous"${ui.iso.tous ? ' checked' : ''}> Tous les étages, empilés</label></div>`;
    h += `<div class="row"><label>Murs</label><select data-iso="murs">`
      + ISO_MURS.map(([v, n]) => `<option value="${v}"${ui.iso.murs === v ? ' selected' : ''}>${n}</option>`).join('') + `</select></div>`;
    if(ui.iso.murs === 'entiers') h += `<div class="row"><label><input type="checkbox" data-iso="toit"${ui.iso.toit ? ' checked' : ''}> Poser le toit</label></div>`;
    h += `<p class="hint">« Ouverts » ne trace que les murs du fond : on voit dans chaque pièce, comme dans une maison de poupée. « Entiers » ferme la maison et pose le toit.</p>`;}
  h += `<p class="hint">${esc(isoLegende())}</p>`;
  return h;}
