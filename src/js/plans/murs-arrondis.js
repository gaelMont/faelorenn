/* ====== murs arrondis ======
   Un mur garde ses deux bouts (x1, y1, x2, y2) et peut porter une poignée à chaque bout, h1 et h2 ([dx,dy] en mètres,
   comptés depuis le bout) : la courbe est alors une Bézier cubique, comme à la plume, courbes en S comprises.
   Sans poignée, le mur est droit. Le rond du milieu pose d'un coup une courbe simple, symétrique, et fait apparaître
   les deux poignées. (L'ancien champ arc, d'une version du 10/10, est relu et converti en poignées.) */
function murH(w,k){
  const h=w[k];
  return Array.isArray(h)&&h.length>=2&&typeof h[0]==='number'&&typeof h[1]==='number'&&isFinite(h[0])&&isFinite(h[1])&&(h[0]||h[1])?[h[0],h[1]]:null}
const murCourbe=w=>!!(murH(w,'h1')||murH(w,'h2'));
/* les quatre points de conduite, en absolu */
function murPts(w){
  const a=murH(w,'h1')||[0,0],b=murH(w,'h2')||[0,0];
  return[[w.x1,w.y1],[w.x1+a[0],w.y1+a[1]],[w.x2+b[0],w.y2+b[1]],[w.x2,w.y2]]}
/* le mur déroulé : ce qui mesure, touche et accroche travaille là-dessus */
function murApl(w){
  if(!murCourbe(w))return[[w.x1,w.y1],[w.x2,w.y2]];
  const c=murPts(w),out=[],n=18;
  for(let i=0;i<=n;i++)out.push(bez(c,i/n));
  return out}
function murApex(w){
  const p=murCourbe(w)?bez(murPts(w),.5):[(w.x1+w.x2)/2,(w.y1+w.y2)/2];
  return[fx(p[0]),fx(p[1])]}
function murD(w,k){
  k=k||BU;
  if(!murCourbe(w))return `M${fx(w.x1*k)} ${fx(w.y1*k)}L${fx(w.x2*k)} ${fx(w.y2*k)}`;
  const c=murPts(w);
  return `M${fx(c[0][0]*k)} ${fx(c[0][1]*k)}C${fx(c[1][0]*k)} ${fx(c[1][1]*k)},${fx(c[2][0]*k)} ${fx(c[2][1]*k)},${fx(c[3][0]*k)} ${fx(c[3][1]*k)}`}
function murLong(w){
  const f=murApl(w);let L=0;
  for(let i=0;i+1<f.length;i++)L+=Math.hypot(f[i+1][0]-f[i][0],f[i+1][1]-f[i][1]);
  return L}
/* le creux : du milieu de la courbe à la corde, compté perpendiculairement */
function murCreux(w){
  const dx=w.x2-w.x1,dy=w.y2-w.y1,L=Math.hypot(dx,dy)||1;
  const ap=murApex(w),mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2;
  return fx((-(ap[0]-mx)*dy+(ap[1]-my)*dx)/L)}
/* poser une courbe simple : les deux poignées tirées pareil, de part et d'autre */
function murPoser(w,v){
  const a=typeof v==='number'&&isFinite(v)?clamp(v,-200,200):0;
  delete w.arc;
  if(Math.abs(a)<.13){delete w.h1;delete w.h2;return}
  const dx=w.x2-w.x1,dy=w.y2-w.y1,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
  w.h1=[fx(dx/3+nx*4*a/3),fx(dy/3+ny*4*a/3)];
  w.h2=[fx(-dx/3+nx*4*a/3),fx(-dy/3+ny*4*a/3)]}
/* glisser le rond du milieu */
function murRegler(w,m){
  const dx=w.x2-w.x1,dy=w.y2-w.y1,L=Math.hypot(dx,dy)||1;
  const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2;
  murPoser(w,snapv((-(m[0]-mx)*dy+(m[1]-my)*dx)/L,.25))}
/* glisser la poignée d'un bout : libre, comme à la plume ; ramenée sur son bout, elle s'en va */
function murTirer(w,cle,m){
  const bout=cle==='ha'?'h1':'h2';
  const x=cle==='ha'?w.x1:w.x2,y=cle==='ha'?w.y1:w.y2;
  const dx=m[0]-x,dy=m[1]-y;
  delete w.arc;
  if(Math.hypot(dx,dy)<.15)delete w[bout];
  else w[bout]=[fx(dx),fx(dy)]}
/* les poignées d'un mur : ses deux bouts, le rond du milieu, et les poignées de courbe quand il en a */
function murHandles(w){
  const H={},a=murH(w,'h1'),b=murH(w,'h2');
  if(a)H.ha=[w.x1+a[0],w.y1+a[1]];
  if(b)H.hb=[w.x2+b[0],w.y2+b[1]];
  H.a=[w.x1,w.y1];H.b=[w.x2,w.y2];H.c=murApex(w);
  return H}
function murHandleSVG(w,q,pos,k){
  if(q==='ha'||q==='hb'){
    const x=q==='ha'?w.x1:w.x2,y=q==='ha'?w.y1:w.y2;
    return `<line x1="${fx(x*BU)}" y1="${fx(y*BU)}" x2="${fx(pos[0]*BU)}" y2="${fx(pos[1]*BU)}" stroke="var(--accent)" stroke-width="${1.2*k}" stroke-opacity=".75"/>`
      +`<circle cx="${fx(pos[0]*BU)}" cy="${fx(pos[1]*BU)}" r="${4.2*k}" fill="var(--accent)" stroke="#fff" stroke-width="${1.2*k}"/>`}
  if(q==='c')return `<circle cx="${fx(pos[0]*BU)}" cy="${fx(pos[1]*BU)}" r="${5*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.6*k}"/>`;
  return `<rect x="${pos[0]*BU-4.5*k}" y="${pos[1]*BU-4.5*k}" width="${9*k}" height="${9*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.6*k}"/>`}
