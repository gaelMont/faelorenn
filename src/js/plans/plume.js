/* ====== pièces en forme libre : la plume ======
   Une pièce libre est une pièce comme les autres ({t:'room', x, y, w, h, kind, name...}) qui porte en plus shape:'poly'
   et ses points, en mètres. Un point est [x,y] (un angle vif) ou [x,y,ix,iy,ox,oy] : (ix,iy) et (ox,oy) sont ses deux
   poignées, mesurées depuis le point. Entre deux points sans poignée, un trait ; sinon une courbe (Bézier cubique).
   x, y, w, h restent toujours l'emprise (le plus petit rectangle qui contient la forme) : tout ce qui sait déplacer,
   copier, mesurer ou ranger une pièce continue de marcher. Les portes et fenêtres posées sur un côté oblique portent
   o:'a' et ang (l'angle du côté, en degrés). */
const libreOk=r=>!!r&&r.t==='room'&&r.shape==='poly'&&Array.isArray(r.pts)&&r.pts.length>=3;
const pIn=p=>p.length>=6?[p[2],p[3]]:[0,0];
const pOut=p=>p.length>=6?[p[4],p[5]]:[0,0];
const pRond=p=>p.length>=6&&!!(p[2]||p[3]||p[4]||p[5]);
const pDroit=(a,b)=>{const o=pOut(a),i=pIn(b);return !o[0]&&!o[1]&&!i[0]&&!i[1]};
/* un point neuf : sans ses poignées quand elles sont nulles, pour que les fichiers restent simples */
function pNeuf(x,y,ix,iy,ox,oy){
  const q=[fx(x),fx(y),fx(ix||0),fx(iy||0),fx(ox||0),fx(oy||0)];
  return(q[2]||q[3]||q[4]||q[5])?q:[q[0],q[1]]}
const pBouge=(p,dx,dy)=>p.length>=6?[fx(p[0]+dx),fx(p[1]+dy),p[2],p[3],p[4],p[5]]:[fx(p[0]+dx),fx(p[1]+dy)];
/* les quatre points de contrôle d'un côté, en absolu */
function pCote(a,b){
  const o=pOut(a),i=pIn(b);
  return[[a[0],a[1]],[a[0]+o[0],a[1]+o[1]],[b[0]+i[0],b[1]+i[1]],[b[0],b[1]]]}
const bez=(c,t)=>{const u=1-t;
  return[u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0],
         u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]]};

/* ---- la forme déroulée : tout ce qui mesure, touche ou accroche travaille sur cette ligne brisée ---- */
function libreApl(pts){
  const n=pts.length,out=[];
  for(let i=0;i<n;i++){
    const a=pts[i],b=pts[(i+1)%n];
    out.push([a[0],a[1]]);
    if(pDroit(a,b))continue;
    const c=pCote(a,b);
    const L=Math.hypot(c[1][0]-c[0][0],c[1][1]-c[0][1])+Math.hypot(c[2][0]-c[1][0],c[2][1]-c[1][1])+Math.hypot(c[3][0]-c[2][0],c[3][1]-c[2][1]);
    const nb=clamp(Math.ceil(L*2),6,28);
    for(let s=1;s<nb;s++)out.push(bez(c,s/nb))}
  return out}
const libreApli=r=>libreApl(r.pts);
/* le chemin SVG, fermé (k : pixels par mètre) */
function libreD(pts,k){
  k=k||BU;const n=pts.length;
  let d='M'+fx(pts[0][0]*k)+' '+fx(pts[0][1]*k);
  for(let i=0;i<n;i++){
    const a=pts[i],b=pts[(i+1)%n],dernier=i===n-1;
    if(pDroit(a,b)){if(!dernier)d+='L'+fx(b[0]*k)+' '+fx(b[1]*k)}
    else{const c=pCote(a,b);d+='C'+fx(c[1][0]*k)+' '+fx(c[1][1]*k)+','+fx(c[2][0]*k)+' '+fx(c[2][1]*k)+','+fx(c[3][0]*k)+' '+fx(c[3][1]*k)}}
  return d+'Z'}
/* le même, ouvert : le tracé en cours */
function libreDOuvert(pts,k){
  k=k||BU;
  let d='M'+fx(pts[0][0]*k)+' '+fx(pts[0][1]*k);
  for(let i=0;i+1<pts.length;i++){
    const a=pts[i],b=pts[i+1];
    if(pDroit(a,b))d+='L'+fx(b[0]*k)+' '+fx(b[1]*k);
    else{const c=pCote(a,b);d+='C'+fx(c[1][0]*k)+' '+fx(c[1][1]*k)+','+fx(c[2][0]*k)+' '+fx(c[2][1]*k)+','+fx(c[3][0]*k)+' '+fx(c[3][1]*k)}}
  return d}
const roomAire=r=>libreOk(r)?polyArea(libreApli(r)):r.shape==='ellipse'?Math.PI*r.w*r.h/4:r.w*r.h;
function librePerim(pts){
  const f=libreApl(pts);let L=0;
  for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length];L+=Math.hypot(b[0]-a[0],b[1]-a[1])}
  return L}
function libreBoite(it){
  const f=libreApli(it);
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const p of f){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1]}
  it.x=fx(x0);it.y=fx(y0);it.w=Math.max(.01,fx(x1-x0));it.h=Math.max(.01,fx(y1-y0))}
/* un rectangle ou un ovale devient une forme libre : ses points sont à toi. L'ovale garde sa courbe, sur quatre points. */
function libreDepuis(it){
  const x=it.x,y=it.y,w=it.w,h=it.h;
  if(it.shape==='ellipse'){
    const cx=x+w/2,cy=y+h/2,ax=w/2,by=h/2,K=.5523;
    it.pts=[pNeuf(cx,y,-ax*K,0,ax*K,0),pNeuf(x+w,cy,0,-by*K,0,by*K),pNeuf(cx,y+h,ax*K,0,-ax*K,0),pNeuf(x,cy,0,by*K,0,-by*K)]}
  else it.pts=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(p=>[fx(p[0]),fx(p[1])]);
  it.shape='poly';libreBoite(it)}
function libreVers(it,shape){
  if(shape==='poly'){if(it.shape!=='poly')libreDepuis(it);return}
  if(it.shape==='poly')delete it.pts;
  it.shape=shape;
  if(shape==='ring'&&!it.thick)it.thick=1}
/* arrondir tous les points, ou les rendre tous vifs */
function libreArrondir(it,rond){
  const p=it.pts,n=p.length;
  it.pts=p.map((q,i)=>{
    if(!rond)return[q[0],q[1]];
    const a=p[(i-1+n)%n],b=p[(i+1)%n];
    const dx=(b[0]-a[0])*.2,dy=(b[1]-a[1])*.2;
    return pNeuf(q[0],q[1],-dx,-dy,dx,dy)});
  libreBoite(it)}
/* un point d'une pièce déjà posée : du vif à l'arrondi, et retour (double-clic dessus) */
function libreTourner(it,i){
  const p=it.pts,n=p.length,q=p[i];
  if(!q)return;
  snap();
  if(pRond(q))p[i]=[q[0],q[1]];
  else{
    const a=p[(i-1+n)%n],b=p[(i+1)%n];
    let dx=(b[0]-a[0])*.2,dy=(b[1]-a[1])*.2;
    if(!dx&&!dy){dx=.5;dy=0}
    p[i]=pNeuf(q[0],q[1],-dx,-dy,dx,dy)}
  libreBoite(it);dirty();renderCanvas();renderOverlay();renderSide()}

/* les cases x, y, largeur, hauteur du panneau : la forme suit, toujours depuis l'état du début de la saisie */
let libreBase=null;
side.addEventListener('focusin',()=>{libreBase=null});
function libreRegler(it,f,v){
  if(!libreBase||libreBase.id!==it.id)libreBase={id:it.id,pts:it.pts.map(p=>p.slice()),x:it.x,y:it.y,w:it.w,h:it.h};
  const b=libreBase;
  if(f==='x'||f==='y'){
    const i=f==='x'?0:1,d=v-b[f];
    it.pts=b.pts.map(p=>{const q=p.slice();q[i]=fx(p[i]+d);return q})}
  else{
    const i=f==='w'?0:1,o=f==='w'?b.x:b.y,old=f==='w'?b.w:b.h;
    if(!(old>.005)||!(v>0))return;
    const s=v/old;
    it.pts=b.pts.map(p=>{
      const q=p.slice();q[i]=fx(o+(p[i]-o)*s);
      if(q.length>=6){q[2+i]=fx(p[2+i]*s);q[4+i]=fx(p[4+i]*s)}
      return q})}
  libreBoite(it)}

/* ---- où poser le nom, et de quelle largeur il dispose ---- */
function libreCentre(p){
  let A=0,cx=0,cy=0;
  for(let i=0,n=p.length;i<n;i++){const P=p[i],Q=p[(i+1)%n],f=P[0]*Q[1]-Q[0]*P[1];A+=f;cx+=(P[0]+Q[0])*f;cy+=(P[1]+Q[1])*f}
  return Math.abs(A)<1e-9?[p[0][0],p[0][1]]:[cx/(3*A),cy/(3*A)]}
/* la corde horizontale (ou verticale) qui passe par c, à l'intérieur du polygone */
function libreCoupe(p,c,verticale){
  const a=verticale?1:0,b=verticale?0:1,xs=[];
  for(let i=0,n=p.length;i<n;i++){
    const P=p[i],Q=p[(i+1)%n];
    if((P[b]>c[b])!==(Q[b]>c[b]))xs.push(P[a]+(c[b]-P[b])*(Q[a]-P[a])/(Q[b]-P[b]))}
  xs.sort((u,v)=>u-v);
  for(let i=0;i+1<xs.length;i+=2)if(c[a]>=xs[i]&&c[a]<=xs[i+1])return xs[i+1]-xs[i];
  return 0}
function libreLabel(r){
  const p=libreApli(r);let c=libreCentre(p);
  if(!inPoly(c[0],c[1],p)){
    /* une forme creuse (un L, un U) : le centre tombe dehors, on prend le point le plus éloigné des murs */
    let best=-1;const n=14;c=[r.x+r.w/2,r.y+r.h/2];
    for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){
      const x=r.x+r.w*(i+.5)/(n+1),y=r.y+r.h*(j+.5)/(n+1);
      if(!inPoly(x,y,p))continue;
      const d=dpoly(x,y,p,true).d;
      if(d>best){best=d;c=[x,y]}}}
  return{x:c[0],y:c[1],sh:libreCoupe(p,c,false),sv:libreCoupe(p,c,true),area:polyArea(p)}}

/* ---- le dessin ---- */
function libreSVG(r,ghost,fill,sw){
  const d=libreD(r.pts);
  if(ghost)return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
  if(r.kind==='cour')return `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
  return `<path d="${d}" fill="${fill}" stroke="${sw?INK:'none'}" stroke-width="${sw}" stroke-linejoin="round"/>`}
/* la sélection : le contour en pointillés et la longueur de chaque côté droit */
function libreSel(it,k,cotes){
  const p=it.pts,n=p.length;
  let s=`<path d="${libreD(p)}" fill="none" stroke="var(--accent)" stroke-width="${2*k}" stroke-dasharray="${6*k} ${4*k}" stroke-linejoin="round"/>`;
  if(!cotes)return s;
  const lab=`font-family="${FONT}" font-size="${11.5*k}" fill="var(--accent)" font-weight="700" stroke="${PAPER}" stroke-width="${3*k}" paint-order="stroke" text-anchor="middle"`;
  for(let i=0;i<n;i++){
    const a=p[i],b=p[(i+1)%n];
    if(!pDroit(a,b))continue;
    const L=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(L*BU*ui.view.k<46)continue;
    s+=`<text x="${fx((a[0]+b[0])/2*BU)}" y="${fx((a[1]+b[1])/2*BU-7*k)}" ${lab}>${fx(L)} m</text>`}
  return s}
const libreMid=(q,k)=>`<circle cx="${fx(q[0]*BU)}" cy="${fx(q[1]*BU)}" r="${4*k}" fill="#fff" fill-opacity=".9" stroke="var(--accent)" stroke-width="${1.3*k}"/><path d="M${fx(q[0]*BU-2*k)} ${fx(q[1]*BU)}h${4*k}M${fx(q[0]*BU)} ${fx(q[1]*BU-2*k)}v${4*k}" stroke="var(--accent)" stroke-width="${1.2*k}"/>`;
/* les poignées : un carré à chaque point, un rond plein au bout de chaque poignée de courbe,
   un petit rond au milieu de chaque côté pour y ajouter un point */
function libreHandles(it){
  const p=it.pts,n=p.length,H={};
  p.forEach((q,i)=>{
    if(!pRond(q))return;
    const a=pIn(q),b=pOut(q);
    if(a[0]||a[1])H['i'+i]=[q[0]+a[0],q[1]+a[1]];
    if(b[0]||b[1])H['o'+i]=[q[0]+b[0],q[1]+b[1]]});
  p.forEach((q,i)=>{H['v'+i]=[q[0],q[1]]});
  p.forEach((q,i)=>{const m=bez(pCote(q,p[(i+1)%n]),.5);H['m'+i]=[m[0],m[1]]});
  return H}
function libreHandleSVG(it,q,pos,k){
  if(q[0]==='m')return libreMid(pos,k);
  if(q[0]==='i'||q[0]==='o'){
    const a=it.pts[+q.slice(1)];
    return `<line x1="${fx(a[0]*BU)}" y1="${fx(a[1]*BU)}" x2="${fx(pos[0]*BU)}" y2="${fx(pos[1]*BU)}" stroke="var(--accent)" stroke-width="${1.2*k}" stroke-opacity=".75"/>`
      +`<circle cx="${fx(pos[0]*BU)}" cy="${fx(pos[1]*BU)}" r="${4.2*k}" fill="var(--accent)" stroke="#fff" stroke-width="${1.2*k}"/>`}
  return `<rect x="${pos[0]*BU-4.5*k}" y="${pos[1]*BU-4.5*k}" width="${9*k}" height="${9*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.6*k}"/>`}
function libreDown(it,h,e){
  const i=+h.slice(1),n=it.pts.length;
  if(h[0]==='m'){
    snap();
    const a=it.pts[i],b=it.pts[(i+1)%n];
    if(pDroit(a,b))it.pts=[...it.pts.slice(0,i+1),[fx((a[0]+b[0])/2),fx((a[1]+b[1])/2)],...it.pts.slice(i+1)];
    else{
      /* couper la courbe en deux sans changer la forme */
      const c=pCote(a,b),mi=(u,v)=>[(u[0]+v[0])/2,(u[1]+v[1])/2];
      const q1=mi(c[0],c[1]),q2=mi(c[1],c[2]),q3=mi(c[2],c[3]);
      const r1=mi(q1,q2),r2=mi(q2,q3),M=mi(r1,r2);
      const na=pNeuf(a[0],a[1],pIn(a)[0],pIn(a)[1],q1[0]-a[0],q1[1]-a[1]);
      const nm=pNeuf(M[0],M[1],r1[0]-M[0],r1[1]-M[1],r2[0]-M[0],r2[1]-M[1]);
      const nb=pNeuf(b[0],b[1],q3[0]-b[0],q3[1]-b[1],pOut(b)[0],pOut(b)[1]);
      it.pts=it.pts.map((q,j)=>j===i?na:j===(i+1)%n?nb:q);
      it.pts=[...it.pts.slice(0,i+1),nm,...it.pts.slice(i+1)]}
    libreBoite(it);
    g={t:'resize',it,h:'v'+(i+1),o:{...it}};
    dirty();renderSide();renderOverlay();return}
  if(h[0]==='i'||h[0]==='o'){g={t:'resize',it,h,o:{...it},alt:!!e.altKey,aSnap:true,dedans:grContenu(it,e.altKey),autres:(ui.tousEtages?grAutresEtages():null),toutLEtage:grToutLEtage([it])};return}
  if(e.altKey){
    if(n>3){snap();it.pts=it.pts.filter((_,j)=>j!==i);libreBoite(it);dirty();renderSide();renderOverlay()}
    else toast('Une pièce garde au moins trois points');
    return}
  g={t:'resize',it,h,o:{...it},aSnap:true,dedans:grContenu(it,e.altKey),autres:(ui.tousEtages?grAutresEtages():null),toutLEtage:grToutLEtage([it])}}
/* bouger un point, ou une poignée (libre, sans aimant ; l'autre poignée suit, sauf avec Alt) */
function libreVertex(gs,x,y,m){
  if(gs.aSnap){snap();gs.aSnap=false}
  const h=gs.h,i=+h.slice(1),pts=gs.o.pts.map(p=>p.slice());
  if(!(i>=0&&i<pts.length))return;
  if(h[0]==='v'){
    const p=pts[i];pts[i]=p.length>=6?[fx(x),fx(y),p[2],p[3],p[4],p[5]]:[fx(x),fx(y)];
    gs.it.pts=pts;libreBoite(gs.it);grSuivre(gs);return}
  const p=pts[i],dx=(m?m[0]:x)-p[0],dy=(m?m[1]:y)-p[1];
  let ix=pIn(p)[0],iy=pIn(p)[1],ox=pOut(p)[0],oy=pOut(p)[1];
  const court=Math.hypot(dx,dy)<.12;
  /* l'autre poignée ne suit que si le point est rond des deux côtés : un point peut porter une seule poignée,
     pour un côté droit suivi d'un côté arrondi. Ramenée sur son point, la poignée tirée s'en va, seule. */
  if(h[0]==='o'){
    if(court){ox=0;oy=0}
    else{ox=dx;oy=dy;if(!gs.alt&&(ix||iy)){ix=-ox;iy=-oy}}}
  else{
    if(court){ix=0;iy=0}
    else{ix=dx;iy=dy;if(!gs.alt&&(ox||oy)){ox=-ix;oy=-iy}}}
  pts[i]=pNeuf(p[0],p[1],ix,iy,ox,oy);
  gs.it.pts=pts;libreBoite(gs.it);grSuivre(gs)}
/* une porte ou une fenêtre posée sur un côté de la pièce suit la pièce quand on la déplace */
function libreSurBord(r,o){
  const p=libreApli(r),n=p.length;
  for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];if(dseg(o.x,o.y,a[0],a[1],b[0],b[1]).d<.05)return true}
  return false}
function libreInfo(it){
  const n=it.pts.length,rond=it.pts.some(pRond);
  return `<p class="hint">Surface : ${fx(roomAire(it))} m² · périmètre ${fx(librePerim(it.pts))} m · ${n} point${n>1?'s':''}. `
    +`Double-clic sur un point : arrondi ou angle vif. Glisse un carré pour déplacer un point, un rond plein pour régler une courbe (ramené sur son point, il s’en va ; Alt : sans bouger l’autre), un petit rond pour ajouter un point, Alt+clic sur un point pour le retirer.</p>`
    +`<div class="row"><button type="button" class="btn sm" data-act="bRond">${rond?'Tout en angles vifs':'Arrondir la forme'}</button></div>`}

/* ---- tracer une pièce libre, à la plume ---- */
function bdrawOk(){
  if(bdraw&&!(ui.edit&&ui.mode==='b'&&!ui.facade&&ui.tool==='room'&&ui.roomShape==='poly'&&bdraw.b===P.curB&&bdraw.fl===ui.fl))bdraw=null;
  return bdraw}
/* Maj : angles de 45 degrés depuis le point précédent */
function libreAimant(m,last,maj){
  let x=snapv(m[0]),y=snapv(m[1]);
  if(maj&&last){
    const dx=x-last[0],dy=y-last[1];
    if(Math.abs(dx)>=2*Math.abs(dy))y=last[1];
    else if(Math.abs(dy)>=2*Math.abs(dx))x=last[0];
    else{const d=snapv((Math.abs(dx)+Math.abs(dy))/2);x=last[0]+(dx<0?-d:d);y=last[1]+(dy<0?-d:d)}}
  return[fx(x),fx(y)]}
const libreTol=e=>tolM()*(e&&e.pointerType==='touch'?3.6:1.8);
/* on appuie : le point est posé tout de suite ; si on glisse avant de lâcher, il se courbe */
function libreBas(m,e){
  if(!bdrawOk()){bdraw={b:P.curB,fl:ui.fl,pts:[],sh:false};ui.sel=[];renderSide()}
  const pts=bdraw.pts,last=pts[pts.length-1],p=libreAimant(m,last,e&&e.shiftKey),f=pts[0];
  /* au doigt, le premier point se vise moins précisément : on pardonne davantage */
  const doigt=!!(e&&e.pointerType==='touch');
  if(pts.length>=3&&Math.hypot(f[0]-p[0],f[1]-p[1])<libreTol(e)){g={t:'pen',ferme:true,a:[f[0],f[1]],doigt};return}
  if(last&&last[0]===p[0]&&last[1]===p[1]){g={t:'pen',i:pts.length-1,a:[last[0],last[1]],doigt};return}
  pts.push([p[0],p[1]]);
  g={t:'pen',i:pts.length-1,a:[p[0],p[1]],doigt};
  renderSide();renderOverlay()}
/* on glisse en posant : les deux poignées du point suivent, l'une en face de l'autre */
function libreTirer(m){
  const bd=bdrawOk();if(!bd||!g||g.t!=='pen')return;
  const a=g.a,dx=m[0]-a[0],dy=m[1]-a[1];
  /* au doigt, la main tremble : il faut un vrai glissement pour courber */
  if(!g.tire&&Math.hypot(dx,dy)*BU*ui.view.k<(g.doigt?14:5))return;
  g.tire=true;
  if(g.ferme)bd.fin=[fx(-dx),fx(-dy)];
  else bd.pts[g.i]=pNeuf(a[0],a[1],-dx,-dy,dx,dy);
  renderOverlay()}
function libreHaut(pen){
  const bd=bdrawOk();
  const fermer=!!(pen&&pen.ferme);
  if(bd&&fermer){
    if(bd.fin&&bd.pts.length){const p=bd.pts[0];bd.pts[0]=pNeuf(p[0],p[1],bd.fin[0],bd.fin[1],pOut(p)[0],pOut(p)[1])}
    bFinish();return}
  renderSide();renderOverlay()}
function bFinish(){
  const bd=bdrawOk();if(!bd)return;
  const pts=bd.pts;bdraw=null;
  if(pts.length<3||polyArea(libreApl(pts))<.25){renderSide();renderOverlay();toast('Il faut au moins trois points qui entourent une surface');return}
  snap();
  const it=addItem({t:'room',x:0,y:0,w:1,h:1,kind:ui.roomK,shape:'poly',pts:pts.map(q=>q.slice()),name:defaultName(ui.roomK),note:''});
  libreBoite(it);
  ui.sel=[it.id];dirty();renderSide();renderOverlay()}
function bRetirer(){
  const bd=bdrawOk();if(!bd)return;
  bd.pts.pop();bd.fin=null;if(!bd.pts.length)bdraw=null;
  renderSide();renderOverlay()}
/* l'aperçu pendant le tracé */
function libreTrace(bd,k){
  const pts=bd.pts,last=pts[pts.length-1];
  if(!last)return '';
  const tire=!!(g&&g.t==='pen'&&g.tire);
  const h=!tire&&ui.hover?libreAimant(ui.hover,last,bd.sh):null;
  const pose=!!h&&(h[0]!==last[0]||h[1]!==last[1]);
  const tout=pose?[...pts,[h[0],h[1]]]:pts;
  let s=`<path d="${libreDOuvert(tout,BU)}" fill="var(--accent)" fill-opacity=".1" stroke="var(--accent)" stroke-width="${2.4*k}" stroke-linejoin="round"/>`;
  /* les poignées du point qu'on est en train de courber */
  const courbe=pts.filter(pRond);
  for(const q of courbe){
    const a=pIn(q),b=pOut(q);
    s+=`<line x1="${fx((q[0]+a[0])*BU)}" y1="${fx((q[1]+a[1])*BU)}" x2="${fx((q[0]+b[0])*BU)}" y2="${fx((q[1]+b[1])*BU)}" stroke="var(--accent)" stroke-width="${1.2*k}" stroke-opacity=".75"/>`
      +`<circle cx="${fx((q[0]+b[0])*BU)}" cy="${fx((q[1]+b[1])*BU)}" r="${3.6*k}" fill="var(--accent)" stroke="#fff" stroke-width="${1.1*k}"/>`
      +`<circle cx="${fx((q[0]+a[0])*BU)}" cy="${fx((q[1]+a[1])*BU)}" r="${3.6*k}" fill="var(--accent)" stroke="#fff" stroke-width="${1.1*k}"/>`}
  for(const q of pts)s+=`<circle cx="${fx(q[0]*BU)}" cy="${fx(q[1]*BU)}" r="${3.4*k}" fill="var(--accent)"/>`;
  if(pts.length>=3){
    const f=pts[0],pres=!!h&&Math.hypot(f[0]-h[0],f[1]-h[1])<tolM()*1.8;
    s+=`<circle cx="${fx(f[0]*BU)}" cy="${fx(f[1]*BU)}" r="${(pres?9:6.5)*k}" fill="${pres?'var(--accent)':'none'}" fill-opacity=".28" stroke="var(--accent)" stroke-width="${1.7*k}"/>`}
  if(pose&&pDroit(last,[h[0],h[1]])){
    const L=Math.hypot(h[0]-last[0],h[1]-last[1]);
    s+=`<text x="${fx((h[0]+last[0])/2*BU)}" y="${fx((h[1]+last[1])/2*BU-8*k)}" text-anchor="middle" font-size="${13*k}" fill="var(--accent)" font-family="${FONT}" font-weight="700" stroke="${PAPER}" stroke-width="${3*k}" paint-order="stroke">${fx(L)} m</text>`}
  return s}
/* ce que le panneau dit pendant le tracé */
function libreEtat(){
  const bd=bdrawOk();
  if(!bd||!bd.pts.length)return `<p class="hint">Aucun point posé pour l’instant. Clique pour poser un point, glisse en posant pour courber.</p>`;
  const n=bd.pts.length;
  return `<p class="hint">${n} point${n>1?'s':''}${n>=3?' · surface '+fx(polyArea(libreApl(bd.pts)))+' m²':''}</p>`
    +`<div class="row"><button type="button" class="btn sm primary" data-act="bFin"${n<3?' disabled':''}>Fermer la pièce</button><button type="button" class="btn sm" data-act="bBack">Retirer le dernier point</button><button type="button" class="btn sm" data-act="bAnn">Annuler</button></div>`}

/* ---- portes et fenêtres sur un côté oblique ---- */
function placeOblique(m,w,best){
  const s=best.s,L=Math.hypot(s[2]-s[0],s[3]-s[1]),ux=(s[2]-s[0])/L,uy=(s[3]-s[1])/L;
  const ds=L>w?clamp(snapv(best.t*L,.5),w/2,L-w/2):L/2;
  const x=s[0]+ux*ds,y=s[1]+uy*ds;
  let ang=deg(Math.atan2(uy,ux));
  if(ang>90)ang-=180;else if(ang<=-90)ang+=180;
  const a=rad(ang),ly=-(m[0]-x)*Math.sin(a)+(m[1]-y)*Math.cos(a);
  return{o:'a',ang:Math.round(ang*100)/100,x:fx(x),y:fx(y),fl:ly<0?-1:1,onWall:true}}
/* le dessin d'une porte ou d'une fenêtre à plat, tourné autour de son centre */
const libreRot=(d,s)=>`<g transform="rotate(${fx(d.ang||0)} ${fx(d.x*BU)} ${fx(d.y*BU)})">${s}</g>`;
function libreRedim(it,h,m){
  const a=rad(it.ang||0),ux=Math.cos(a),uy=Math.sin(a),hw=it.w/2;
  const s=Math.round(((m[0]-it.x)*ux+(m[1]-it.y)*uy)/.25)*.25;
  const lo=h==='a'?Math.min(s,hw-.25):-hw,hi=h==='b'?Math.max(s,-hw+.25):hw,mid=(lo+hi)/2;
  it.x=fx(it.x+ux*mid);it.y=fx(it.y+uy*mid);it.w=fx(Math.max(.25,hi-lo))}
