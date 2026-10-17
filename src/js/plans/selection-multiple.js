/* ====== agir sur plusieurs éléments : tourner, redimensionner, aligner, espacer ======
   Tout passe par les mêmes règles : une porte ou une fenêtre garde sa largeur et reste sur son mur, un escalier et un
   anneau ne tournent que par quarts de tour (ils n'ont pas d'angle dans le format), une pièce rectangulaire qui tourne
   d'un angle libre devient une pièce en forme libre. */
const GR_MIN=.05;
function grBoite(items){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const it of items){const b=itemBounds(it);x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3])}
  if(x1<x0)return null;
  return{x0:x0,y0:y0,x1:x1,y1:y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2}}
/* la boîte d'une liste d'objets (les copies d'avant le geste, par exemple) */
const grBoiteDe=L=>grBoite(L);
/* l'emprise d'un étage se lit sur ses murs : une porte ou une fenêtre déborde de trente centimètres pour le dessin seulement */
function grBoiteMurs(L){
  const q=L.filter(i=>i.t!=='door'&&i.t!=='win');
  return grBoite(q.length?q:L)}

/* ---- ce qu'une pièce emporte quand on la retaille : ses meubles, ses ouvertures, ce qui est dedans ---- */
function grSurBord(r,o){
  if(libreOk(r))return libreSurBord(r,o);
  return(Math.abs(o.y-r.y)<.01||Math.abs(o.y-r.y-r.h)<.01)&&o.x>=r.x-.01&&o.x<=r.x+r.w+.01
    ||(Math.abs(o.x-r.x)<.01||Math.abs(o.x-r.x-r.w)<.01)&&o.y>=r.y-.01&&o.y<=r.y+r.h+.01}
const grEmporte=alt=>(ui.emporter!==false)!==!!alt;   /* la case, qu'Alt retourne le temps d'un geste */
function grContenu(r,alt,hors){
  if(!grEmporte(alt)||!r||r.t!=='room')return null;
  const F=CF(),out=[],bord=[];
  for(const it of F.items){
    if(it===r||(hors&&hors.indexOf(it)>=0))continue;
    if(it.t==='door'||it.t==='win'){
      if(grSurBord(r,it)){out.push(it);bord.push(true)}
      else if(inRoom(r,it.x,it.y)){out.push(it);bord.push(false)}
      continue}
    if(it.t==='wall'){if(inRoom(r,it.x1,it.y1)&&inRoom(r,it.x2,it.y2)){out.push(it);bord.push(false)}continue}
    if(it.t==='furn'||it.t==='label'||it.t==='stair'||it.t==='room'){
      const b=itemBounds(it);
      if(inRoom(r,(b[0]+b[2])/2,(b[1]+b[3])/2)){out.push(it);bord.push(false)}}}
  return out.length?{items:out,orig:out.map(x=>JSON.parse(JSON.stringify(x))),bord:bord}:null}
/* une ouverture portée par une pièce se recolle sur son mur, même quand la forme a changé */
function grRecoller(r,o){
  const f=libreOk(r)?libreApli(r):[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.h],[r.x,r.y+r.h]];
  const q=dpoly(o.x,o.y,f,true);
  if(!(q.d<=1.2))return;
  o.x=fx(q.x);o.y=fx(q.y);
  const a=f[q.i],b=f[(q.i+1)%f.length],ang=grAngOuv(deg(Math.atan2(b[1]-a[1],b[0]-a[0])));
  if(Math.abs(ang)<.02){o.o='h';delete o.ang}
  else if(Math.abs(Math.abs(ang)-90)<.02){o.o='v';delete o.ang}
  else{o.o='a';o.ang=fx(ang)}}
/* ce qu'une pièce emporte quand on la déplace : les mêmes que lorsqu'on la retaille */
function grAttraper(items,alt){
  if(!grEmporte(alt))return [];
  const out=[];
  for(const r of items.filter(i=>i.t==='room')){
    const d=grContenu(r,alt,items);
    if(d)for(const q of d.items)if(out.indexOf(q)<0)out.push(q)}
  return out}
/* la pièce a changé de boîte : ce qu'elle porte suit, sans changer de taille pour les portes, meubles et textes */
function grSuivre(gs){
  const d=gs.dedans,o=gs.o,it=gs.it;
  if(!d&&!gs.autres)return;
  const ow=Math.max(.01,o.w),oh=Math.max(.01,o.h);
  const sx=it.w/ow,sy=it.h/oh,dx=it.x-o.x,dy=it.y-o.y;
  if(d)d.items.forEach((q,i)=>{
    grEchelle(q,d.orig[i],o.x,o.y,sx,sy,dx,dy);
    if((q.t==='door'||q.t==='win')&&d.bord&&d.bord[i])grRecoller(it,q)});
  /* cette pièce est tout l'étage : les autres prennent la même boîte, calée sur le coin choisi */
  if(gs.toutLEtage&&grEtagesBoite({autres:gs.autres,toutLEtage:true},grBoiteMurs([it])))return;
  grTousEtages(gs,(q,orig)=>grEchelle(q,orig,o.x,o.y,sx,sy,dx,dy))}

/* les poignées d'un groupe : les quatre coins pour la taille, le bouton au-dessus pour tourner */
function grHandles(items){
  const b=grBoite(items);if(!b)return{};
  return{gnw:[b.x0,b.y0],gne:[b.x1,b.y0],gse:[b.x1,b.y1],gsw:[b.x0,b.y1],grot:[b.cx,b.y0-Math.max(1,18/(BU*ui.view.k))]}}
function grHandleAt(items,m){
  const H=grHandles(items),tol=tolM()*1.4;
  for(const k in H)if(Math.hypot(H[k][0]-m[0],H[k][1]-m[1])<=tol)return k;
  return null}
/* le dessin : le cadre en pointillés, les coins, le bouton pour tourner */
function grCadreSVG(items,k){
  const b=grBoite(items);if(!b)return '';
  const H=grHandles(items);
  let s=`<rect x="${fx(b.x0*BU)}" y="${fx(b.y0*BU)}" width="${fx(b.w*BU)}" height="${fx(b.h*BU)}" fill="none" stroke="var(--accent)" stroke-width="${1.4*k}" stroke-dasharray="${7*k} ${5*k}" opacity=".9"/>`;
  for(const q of['gnw','gne','gse','gsw'])s+=`<rect x="${fx(H[q][0]*BU-5*k)}" y="${fx(H[q][1]*BU-5*k)}" width="${10*k}" height="${10*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.8*k}"/>`;
  s+=grRotSVG(H.grot,[b.cx,b.y0],k);
  return s}
function grRotSVG(p,ancre,k){
  return `<line x1="${fx(ancre[0]*BU)}" y1="${fx(ancre[1]*BU)}" x2="${fx(p[0]*BU)}" y2="${fx(p[1]*BU)}" stroke="var(--accent)" stroke-width="${1.2*k}" stroke-opacity=".8"/>`
    +`<circle cx="${fx(p[0]*BU)}" cy="${fx(p[1]*BU)}" r="${6*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.8*k}"/>`
    +`<path d="M${fx(p[0]*BU-3*k)} ${fx(p[1]*BU)}a${3*k} ${3*k} 0 1 1 ${2*k} ${2.2*k}" fill="none" stroke="var(--accent)" stroke-width="${1.4*k}" stroke-linecap="round"/>`}

/* ---- tourner ---- */
const grRotV=(v,a)=>[fx(v[0]*Math.cos(a)-v[1]*Math.sin(a)),fx(v[0]*Math.sin(a)+v[1]*Math.cos(a))];
const grQuart=d=>Math.abs(((d%90)+90)%90)<.01||Math.abs(((d%90)+90)%90-90)<.01;
/* ramener un angle de porte dans (-90, 90] */
function grAngOuv(ang){
  let a=((ang+90)%180+180)%180-90;
  if(a<=-90)a+=180;
  return a}
function grTourner(it,o,cx,cy,a){
  const co=Math.cos(a),si=Math.sin(a),d=deg(a);
  const R=(x,y)=>[fx(cx+(x-cx)*co-(y-cy)*si),fx(cy+(x-cx)*si+(y-cy)*co)];
  const quarts=Math.round(d/90),droit=grQuart(d);
  if(it.t==='wall'){
    const a1=R(o.x1,o.y1),a2=R(o.x2,o.y2);
    it.x1=a1[0];it.y1=a1[1];it.x2=a2[0];it.y2=a2[1];
    if(o.h1)it.h1=grRotV(o.h1,a);if(o.h2)it.h2=grRotV(o.h2,a);
    return}
  if(it.t==='door'||it.t==='win'){
    const p=R(o.x,o.y);it.x=p[0];it.y=p[1];
    const ang=grAngOuv((o.o==='a'?(o.ang||0):o.o==='v'?90:0)+d);
    if(Math.abs(ang)<.02){it.o='h';delete it.ang}
    else if(Math.abs(Math.abs(ang)-90)<.02){it.o='v';delete it.ang}
    else{it.o='a';it.ang=fx(ang)}
    return}
  if(it.t==='furn'){const p=R(o.x,o.y);it.x=p[0];it.y=p[1];it.r=fx(((o.r||0)+d)%360);return}
  if(it.t==='label'){const p=R(o.x,o.y);it.x=p[0];it.y=p[1];return}
  if(it.t==='room'&&o.shape==='poly'){
    it.pts=o.pts.map(q=>{
      const p=R(q[0],q[1]);
      if(q.length<6)return p;
      const e=grRotV([q[2],q[3]],a),f=grRotV([q[4],q[5]],a);
      return[p[0],p[1],e[0],e[1],f[0],f[1]]});
    libreBoite(it);return}
  if(it.t==='room'&&(o.shape==='rect'||o.shape===undefined)&&!droit){
    /* un angle libre : le rectangle devient une forme libre, qui, elle, sait tourner */
    const c=[[o.x,o.y],[o.x+o.w,o.y],[o.x+o.w,o.y+o.h],[o.x,o.y+o.h]];
    it.shape='poly';it.pts=c.map(q=>R(q[0],q[1]));libreBoite(it);return}
  /* pièce rectangulaire, ovale, anneau, escalier : quart de tour le plus proche */
  const cq=rad(quarts*90),cc=Math.cos(cq),ss=Math.sin(cq);
  const ctr=[cx+(o.x+o.w/2-cx)*cc-(o.y+o.h/2-cy)*ss,cy+(o.x+o.w/2-cx)*ss+(o.y+o.h/2-cy)*cc];
  const w=quarts%2?o.h:o.w,h=quarts%2?o.w:o.h;
  it.w=fx(w);it.h=fx(h);it.x=fx(ctr[0]-w/2);it.y=fx(ctr[1]-h/2);
  if(it.t==='stair'&&quarts%4){
    const ordre=['n','e','s','w'],i=ordre.indexOf(o.dir);
    if(i>=0)it.dir=ordre[(i+((quarts%4)+4))%4]}}
/* vrai si quelque chose n'a pu tourner que par quarts */
const grNePasTourner=items=>items.some(i=>i.t==='stair'||(i.t==='room'&&(i.shape==='ring'||i.shape==='ellipse')));

/* ---- redimensionner ---- */
function grEchelle(it,o,ax,ay,sx,sy,dx,dy){
  const ex=dx||0,ey=dy||0;
  const px=v=>fx(ax+(v-ax)*sx+ex),py=v=>fx(ay+(v-ay)*sy+ey);
  if(it.t==='wall'){
    it.x1=px(o.x1);it.y1=py(o.y1);it.x2=px(o.x2);it.y2=py(o.y2);
    if(o.h1)it.h1=[fx(o.h1[0]*sx),fx(o.h1[1]*sy)];
    if(o.h2)it.h2=[fx(o.h2[0]*sx),fx(o.h2[1]*sy)];
    return}
  it.x=px(o.x);it.y=py(o.y);
  if(it.t==='door'||it.t==='win'||it.t==='furn'||it.t==='label')return;   /* ils gardent leur taille */
  if(it.t==='room'&&o.shape==='poly'){
    it.pts=o.pts.map(q=>{
      const p=[px(q[0]),py(q[1])];
      if(q.length<6)return p;
      return[p[0],p[1],fx(q[2]*sx),fx(q[3]*sy),fx(q[4]*sx),fx(q[5]*sy)]});
    libreBoite(it);return}
  if(it.t==='room'||it.t==='stair'){
    it.w=fx(Math.max(.5,o.w*sx));it.h=fx(Math.max(.5,o.h*sy));
    if(o.thick)it.thick=fx(Math.max(.2,o.thick*Math.min(sx,sy)))}}

/* ---- les autres étages, quand on veut qu'ils suivent ---- */
function grAutresEtages(){
  if(!ui.tousEtages)return null;
  const b=CB();if(!b||b.floors.length<2)return null;
  const out=[];
  b.floors.forEach((F,i)=>{if(i===ui.fl)return;out.push({items:F.items,orig:F.items.map(x=>JSON.parse(JSON.stringify(x)))})});
  return out.length?out:null}
const grTousEtages=(gs,fn)=>{if(gs&&gs.autres)for(const e of gs.autres)e.items.forEach((it,i)=>fn(it,e.orig[i]))};
const GR_COINS=[['nw','Haut gauche'],['ne','Haut droit'],['sw','Bas gauche'],['se','Bas droit']];
/* « tout l'étage » : tout est choisi, ou ce qui est choisi tient déjà toute l'emprise de l'étage
   (la grande pièce d'une tour, par exemple, avec ses meubles dedans) */
function grToutLEtage(sel){
  const F=CF();
  if(!F||!F.items.length||!sel||!sel.length)return false;
  if(F.items.length===sel.length)return true;
  const a=grBoiteMurs(sel),b=grBoiteMurs(F.items);
  if(!a||!b)return false;
  const e=.06;
  return Math.abs(a.x0-b.x0)<e&&Math.abs(a.y0-b.y0)<e&&Math.abs(a.x1-b.x1)<e&&Math.abs(a.y1-b.y1)<e}
const grCoin=()=>GR_COINS.some(([k])=>k===ui.coinEtages)?ui.coinEtages:'nw';
/* tout l'étage était pris : chaque autre étage prend la même boîte, calé sur le coin choisi */
function grEtagesBoite(gs,nb){
  if(!gs.autres||!gs.toutLEtage||!nb)return false;
  const c=grCoin(),est=c==='ne'||c==='se',sud=c==='sw'||c==='se';
  for(const e of gs.autres){
    const ob=grBoiteMurs(e.orig);
    if(!ob)continue;
    const sx=ob.w>.01?nb.w/ob.w:1,sy=ob.h>.01?nb.h/ob.h:1;
    const ax=est?ob.x1:ob.x0,ay=sud?ob.y1:ob.y0;
    const dx=(est?nb.x1:nb.x0)-ax,dy=(sud?nb.y1:nb.y0)-ay;
    e.items.forEach((it,i)=>grEchelle(it,e.orig[i],ax,ay,sx,sy,dx,dy))}
  return true}

/* ---- le geste, pendant qu'on tire ---- */
function grGeste(gs,m,e){
  const b=gs.b,items=gs.items,orig=gs.orig;
  if(gs.h==='grot'){
    const a0=Math.atan2(gs.m0[1]-b.cy,gs.m0[0]-b.cx),a1=Math.atan2(m[1]-b.cy,m[0]-b.cx);
    let d=deg(a1-a0);
    if(!(e&&e.altKey))d=Math.round(d/15)*15;else d=Math.round(d);
    gs.ang=d;
    items.forEach((it,i)=>grTourner(it,orig[i],b.cx,b.cy,rad(d)));
    grTousEtages(gs,(it,o)=>grTourner(it,o,b.cx,b.cy,rad(d)));
    return}
  const est=gs.h.includes('e'),sud=gs.h.includes('s');
  const ax=est?b.x0:b.x1,ay=sud?b.y0:b.y1;
  const lx=(est?b.x1:b.x0)-ax,ly=(sud?b.y1:b.y0)-ay;
  let sx=Math.abs(lx)>.01?(m[0]-ax)/lx:1,sy=Math.abs(ly)>.01?(m[1]-ay)/ly:1;
  sx=Math.max(GR_MIN,sx);sy=Math.max(GR_MIN,sy);
  if(!(e&&e.altKey)){const s=Math.abs(lx)>Math.abs(ly)?sx:sy;sx=s;sy=s}
  gs.ech=[sx,sy];
  items.forEach((it,i)=>grEchelle(it,orig[i],ax,ay,sx,sy));
  if(!grEtagesBoite(gs,grBoiteMurs(items)))grTousEtages(gs,(it,o)=>grEchelle(it,o,ax,ay,sx,sy))}

/* ---- déplacer : les autres étages suivent ---- */
function grBouger(gs,dx,dy){
  if(!gs.autres)return;
  if(gs.toutLEtage){
    const nb=grBoiteMurs(gs.items.filter(i=>gs.base.indexOf(i)>=0));
    if(nb){
      const c=grCoin(),est=c==='ne'||c==='se',sud=c==='sw'||c==='se';
      for(const e of gs.autres){
        const ob=grBoiteMurs(e.orig);if(!ob)continue;
        const ex=(est?nb.x1:nb.x0)-(est?ob.x1:ob.x0),ey=(sud?nb.y1:nb.y0)-(sud?ob.y1:ob.y0);
        e.items.forEach((it,i)=>moveItem(it,e.orig[i],fx(ex),fx(ey)))}
      return}}
  grTousEtages(gs,(it,o)=>moveItem(it,o,dx,dy))}

/* ---- aligner et espacer ---- */
function grDeplacer(it,dx,dy){
  if(!dx&&!dy)return;
  moveItem(it,JSON.parse(JSON.stringify(it)),dx,dy)}
function grAligner(items,quoi){
  const b=grBoite(items);if(!b)return;
  snap();
  for(const it of items){
    const q=itemBounds(it),w=q[2]-q[0],h=q[3]-q[1];
    let dx=0,dy=0;
    if(quoi==='g')dx=b.x0-q[0];
    else if(quoi==='d')dx=b.x1-q[2];
    else if(quoi==='cx')dx=b.cx-(q[0]+w/2);
    else if(quoi==='h')dy=b.y0-q[1];
    else if(quoi==='b')dy=b.y1-q[3];
    else if(quoi==='cy')dy=b.cy-(q[1]+h/2);
    grDeplacer(it,fx(dx),fx(dy))}
  dirty();renderCanvas();renderOverlay();renderSide()}
/* des espaces égaux entre les éléments, le premier et le dernier ne bougent pas */
function grEspacer(items,axe){
  if(items.length<3)return;
  const L=items.map(it=>({it:it,b:itemBounds(it)})).sort((a,b)=>(axe==='x'?a.b[0]-b.b[0]:a.b[1]-b.b[1]));
  const i0=axe==='x'?0:1,i1=axe==='x'?2:3;
  const debut=L[0].b[i0],fin=L[L.length-1].b[i1];
  let pris=0;for(const q of L)pris+=q.b[i1]-q.b[i0];
  const trou=(fin-debut-pris)/(L.length-1);
  snap();
  let pos=debut;
  L.forEach((q,i)=>{
    const taille=q.b[i1]-q.b[i0];
    if(i>0&&i<L.length-1){
      const d=fx(pos-q.b[i0]);
      grDeplacer(q.it,axe==='x'?d:0,axe==='x'?0:d)}
    pos+=taille+trou});
  dirty();renderCanvas();renderOverlay();renderSide()}

/* ---- changer x, y, largeur ou hauteur depuis le panneau : la pièce emporte la même chose qu'à la poignée ---- */
function grSaisie(it,fn){
  if(!it||it.t!=='room'){fn();return}
  const d=grContenu(it,false),au=ui.tousEtages?grAutresEtages():null,tout=grToutLEtage([it]);
  const o={x:it.x,y:it.y,w:it.w,h:it.h};
  fn();
  if(d||au)grSuivre({it:it,o:o,dedans:d,autres:au,toutLEtage:tout})}

/* ---- le bloc « tous les étages », partagé par le groupe et la pièce seule ---- */
function grEtagePanneau(tout){
  const b=CB();
  if(!b||b.floors.length<2)return '';
  return `<div class="row"><label><input type="checkbox" data-ui="tousEtages"${ui.tousEtages?' checked':''}> Changer aussi les autres étages</label></div>`
    +(ui.tousEtages?`<div class="row"><label>Aligner sur</label><select data-ui="coinEtages">`
      +GR_COINS.map(([k,n])=>`<option value="${k}"${grCoin()===k?' selected':''}>${n}</option>`).join('')+`</select></div>`:'')
    +`<p class="hint">Coché, la taille et la rotation s'appliquent de la même façon à tous les étages du bâtiment. `
    +`Quand ce qui est pris tient toute l'emprise de l'étage (Ctrl+A, ou la grande pièce qui contient le reste), les autres étages prennent en plus la même boîte que celui-ci, calée sur le coin choisi : tous les bords tombent ensemble.</p>`}

/* ---- le panneau de plusieurs éléments ---- */
function grPanneau(sel){
  const n=sel.length;
  const bt=(a,t,l)=>`<button type="button" class="btn sm" data-act="${a}" title="${t}">${l}</button>`;
  return `<h3>${n} éléments</h3>`
    +`<div class="row"><button class="btn sm" data-act="dup">Dupliquer</button><button class="btn sm danger" data-act="del">Supprimer</button></div>`
    +`<div class="row"><button class="btn sm primary" data-act="grouper">Grouper</button>`
    +(sel.some(grpDe)?`<button class="btn sm" data-act="degrouper">Dégrouper</button>`:'')+`</div>`
    +`<p class="hint">Groupés, ils se prennent tous d’un seul clic (Alt+clic pour n’en attraper qu’un). Ils restent ensemble pour déplacer, tourner et changer la taille.</p>`
    +`<p class="hint">Glisse pour déplacer le groupe, un coin du cadre pour changer sa taille (Alt : sans garder les proportions), le bouton au-dessus pour le tourner (Alt : au degré). Les portes et fenêtres gardent leur largeur et restent sur leur mur. Maj+clic ajoute ou retire.</p>`
    +`<p class="tag" style="margin:10px 0 4px">Aligner</p><div class="row">`
    +bt('alG','Bords gauches','⇤ Gauche')+bt('alCx','Centres, de gauche à droite','↔ Centre')+bt('alD','Bords droits','Droite ⇥')+`</div><div class="row">`
    +bt('alH','Bords du haut','⇡ Haut')+bt('alCy','Centres, de haut en bas','↕ Milieu')+bt('alB','Bords du bas','Bas ⇣')+`</div>`
    +`<p class="tag" style="margin:10px 0 4px">Espacer également</p><div class="row">`
    +bt('espX','Mêmes espaces, de gauche à droite','↔ Horizontalement')+bt('espY','Mêmes espaces, de haut en bas','↕ Verticalement')+`</div>`
    +(n<3?`<p class="hint">Espacer demande au moins trois éléments.</p>`:'')
    +grEtagePanneau(true)}

/* ---- grouper des objets, comme des calques ---- */
const grpDe=it=>it&&typeof it.grp==='string'&&it.grp?it.grp:null;
function grpMembres(id){const F=CF();return F?F.items.filter(i=>grpDe(i)===id):[]}
/* cliquer un élément groupé prend tout son groupe ; Alt n'en prend qu'un */
function grpEtendre(hit,seul){
  const id=grpDe(hit);
  if(!id||seul)return [hit.id];
  const L=grpMembres(id).map(i=>i.id);
  return L.length?L:[hit.id]}
function grpFaire(sel){
  if(!sel||sel.length<2)return;
  snap();
  const id=uid();
  for(const it of sel)it.grp=id;
  dirty();renderSide();renderOverlay();
  toast(sel.length+' éléments groupés : un clic les prend tous, Alt+clic n’en prend qu’un.')}
function grpDefaire(sel){
  const L=(sel||[]).filter(grpDe);
  if(!L.length)return;
  snap();
  const ids=new Set(L.map(grpDe));
  for(const it of CF().items)if(ids.has(grpDe(it)))delete it.grp;
  dirty();renderSide();renderOverlay();
  toast(ids.size>1?'Groupes défaits':'Groupe défait')}
/* la liste des groupes de l'étage, comme des calques */
function grpListe(){
  const F=CF();if(!F)return '';
  const vus=[];
  for(const it of F.items){const id=grpDe(it);if(id&&vus.indexOf(id)<0)vus.push(id)}
  if(!vus.length)return '';
  const nom=it=>it.name||(it.t==='room'?'Pièce':it.t==='furn'?((FD[it.k]||{}).n||'Objet'):it.t==='stair'?'Escalier':it.t==='label'?String(it.text||'Texte').slice(0,14):it.t==='wall'?'Mur':it.t==='door'?'Porte':it.t==='win'?'Fenêtre':'Élément');
  let h=`<h3>Groupes (${vus.length})</h3><ul class="legend">`;
  vus.forEach((id,i)=>{
    const L=grpMembres(id),pris=ui.sel.length&&L.every(q=>ui.sel.includes(q.id));
    h+=`<li class="lieu${pris?' on':''}"><span class="pill">G${i+1}</span><span class="nm"><a href="#" data-grp="${id}">${esc(nom(L[0]||{}))}${L.length>1?' et '+(L.length-1)+' autre'+(L.length>2?'s':''):''}</a><small>${L.length} éléments</small></span>`
      +`<button type="button" class="btn sm go" data-grpoff="${id}">Dégrouper</button></li>`});
  return h+`</ul>`}

/* ---- la précision des placements ---- */
const GR_PAS=[['1','1 m'],['0.5','50 cm'],['0.25','25 cm'],['0.1','10 cm'],['0.01','libre']];
function grPrecision(){
  const v=String(ui.snap);
  return `<div class="row"><label><input type="checkbox" data-ui="emporter"${ui.emporter!==false?' checked':''}> Une pièce emporte ce qu’elle contient</label></div>`
    +`<div class="row"><label>Précision</label><select data-ui="snap">`
    +GR_PAS.map(([k,n])=>`<option value="${k}"${v===k?' selected':''}>${n}</option>`).join('')
    +`</select></div>`}
function grPasOk(v){
  const n=parseFloat(v);
  return GR_PAS.some(([k])=>+k===n)?n:.5}
/* le pas fin sert aussi aux objets et aux textes, qui se posaient toujours au quart de mètre */
const grPasFin=()=>Math.min(.25,ui.snap);
