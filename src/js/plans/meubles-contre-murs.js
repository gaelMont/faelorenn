/* ====== les meubles contre les murs ======
   Un meuble posé à cheval sur un mur ne se voit pas à plat (le mur n'est qu'un trait) mais traverse
   en relief. On le repousse du côté où il se trouve déjà, sans jamais le faire sauter ailleurs. */
/* la demi-épaisseur d'un meuble dans une direction donnée */
/* les plans se mesurent au centimètre : en dessous de deux, un chevauchement ne se voit pas */
const MUR_JEU = .02;
function murDemi(d, r, ux, uy){
  const c = Math.cos(r), s = Math.sin(r);
  return Math.abs(d.w / 2 * (ux * c + uy * s)) + Math.abs(d.h / 2 * (-ux * s + uy * c));}
/* de combien ce mur mord-il sur ce meuble ? rend null quand il n'y touche pas */
function murMord(it, s, ref){
  const d = FD[it.k] || {w:1, h:1}, r = (it.r || 0) * Math.PI / 180;
  const ux = s[2] - s[0], uy = s[3] - s[1], L = Math.hypot(ux, uy);
  if(L < .05) return null;
  const nx = -uy / L, ny = ux / L;
  const dx = it.x - s[0], dy = it.y - s[1];
  const dn = dx * nx + dy * ny, t = (dx * ux + dy * uy) / L;
  const hw = murDemi(d, r, nx, ny), hl = murDemi(d, r, ux / L, uy / L);
  if(Math.abs(dn) >= hw - MUR_JEU) return null;         /* il ne le touche pas, ou d'un cheveu */
  if(t + hl < 0 || t - hl > L) return null;             /* le mur s'arrête avant */
  /* de quel côté : celui où le meuble se trouve, ou celui d'où il vient quand il est pile dessus */
  let sg = dn > 1e-6 ? 1 : dn < -1e-6 ? -1 : 0;
  if(!sg && ref){const q = (ref[0] - s[0]) * nx + (ref[1] - s[1]) * ny; sg = q >= 0 ? 1 : -1}
  if(!sg) sg = 1;
  return {nx:nx, ny:ny, de:(hw - Math.abs(dn)) * sg};}
/* ranger un meuble : on le pousse hors des murs qu'il chevauche */
function murRanger(it, segs, ref){
  if(!it || it.t !== 'furn') return false;
  const x0 = it.x, y0 = it.y;
  for(let n = 0; n < 4; n++){
    let pire = null;
    for(const s of segs){
      const m = murMord(it, s, ref || [x0, y0]);
      if(m && (!pire || Math.abs(m.de) > Math.abs(pire.de))) pire = m;}
    if(!pire) break;
    const pas = pire.de + (pire.de > 0 ? MUR_JEU / 2 : -MUR_JEU / 2);  /* un cheveu de plus, l'arrondi au centimètre ne le ramène pas dedans */
    it.x = fx(it.x + pire.nx * pas);
    it.y = fx(it.y + pire.ny * pas);}
  return it.x !== x0 || it.y !== y0;}
/* les murs qui comptent pour un meuble : ceux que le relief monte. Un couloir, une cour, une terrasse
   n'en ont pas ; une pièce ronde en a, suivie au plus près. Avec « epais », un mur tracé à l'outil Mur
   porte sa demi-épaisseur du relief, pour que le rabot s'arrête à sa face. */
function murSegs(F, epais){
  const S = [];
  if(!F || !F.items) return S;
  for(const it of F.items){
    if(it.t === 'room'){
      if(ISO_SANS_MUR[it.kind]) continue;
      if(it.shape === 'ellipse'){
        const p = isoContour(it);
        for(let i = 0; i < p.length; i++){const a = p[i], b = p[(i + 1) % p.length]; S.push([a[0], a[1], b[0], b[1], 0])}
        continue;}
      for(const s of wallSegs({items:[it]})) S.push([s[0], s[1], s[2], s[3], 0]);}
    else if(it.t === 'wall'){
      const demi = epais ? (it.k === 'bas' ? .07 : .11) : 0;
      for(const s of wallSegs({items:[it]})) S.push([s[0], s[1], s[2], s[3], demi]);}}
  return S;}
/* tout l'étage d'un coup : « Ranger les meubles » */
function rangerMeubles(F){
  if(!F) return 0;
  const segs = murSegs(F);
  let n = 0;
  for(const it of F.items) if(it.t === 'furn' && murRanger(it, segs)) n++;
  return n;}
