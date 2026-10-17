/* ====== bâtiments : édition ====== */
const IC={
 mesure:'<path d="M3 15.5L15.5 3l5.5 5.5L8.5 21z"/><path d="M7 11.5l2 2M10.5 8l2 2M14 4.5l2 2"/>',
 sel:'<path d="M6 3l12 9-5.5 1.2L9.5 19z"/>',pan:'<path d="M8 13V6.5a1.5 1.5 0 013 0V11m0-5.5a1.5 1.5 0 013 0V11m0-3.5a1.5 1.5 0 013 0V15c0 3.5-2 6-6 6-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 012.3-1.9L8 13"/>',
 room:'<rect x="4" y="5" width="16" height="14"/>',wall:'<path d="M4 19L20 5"/><circle cx="4" cy="19" r="1.3"/><circle cx="20" cy="5" r="1.3"/>',
 door:'<path d="M4 20h3M17 20h3M7 20V6M7 6a14 14 0 0110 14"/>',win:'<path d="M3 12h18"/><rect x="6" y="9" width="12" height="6"/><path d="M12 9v6"/>',
 furn:'<path d="M5 11h14v5H5zM7 16v3M17 16v3M7 11V6h10v5"/>',stair:'<path d="M4 20h4v-4h4v-4h4V8h4"/>',label:'<path d="M6 6h12M12 6v13"/>',erase:'<path d="M4 15l8-8 7 7-5 5H8zM10 9l7 7"/>',
 road:'<path d="M3 20C8 14 6 9 12 8s6-3 9-5"/><path d="M5 21C10 15 8 11 14 10"/>',river:'<path d="M3 8c3-3 5 3 9 0s6 3 9 0M3 16c3-3 5 3 9 0s6 3 9 0"/>',
 poly:'<path d="M5 8l6-4 8 5-2 9-9 2z"/>',bld:'<path d="M4 11l8-6 8 6M6 10v9h12v-9M10 19v-5h4v5"/>',tree:'<circle cx="12" cy="9" r="5.5"/><path d="M12 14.5V21"/>',mark:'<circle cx="12" cy="10" r="5.5"/><path d="M12 15.5V21"/><path d="M10.5 10h3"/>',
 gen:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>'};
const BTOOLS=[['sel','Choisir'],['pan','Main'],['room','Pièce'],['wall','Mur'],['door','Porte'],['win','Fenêtre'],['furn','Mobilier'],['stair','Escalier'],['label','Texte'],['erase','Gomme']];
const VTOOLS=[['sel','Choisir'],['pan','Main'],['road','Route'],['river','Rivière'],['wall','Enceinte'],['poly','Zone'],['bld','Bâtisse'],['tree','Arbres'],['label','Texte'],['mark','Repère'],['erase','Gomme']];
function renderTools(){
  const L=ui.mode==='b'?BTOOLS:ui.mode==='w'?WTOOLS:VTOOLS;
  $('#tools').innerHTML=L.map(([k,n],i)=>`<button class="tool" data-tool="${k}" aria-pressed="${ui.tool===k}" title="${n} (${(i+1)%10})"><svg viewBox="0 0 24 24">${IC[k]||''}</svg>${n}</button>`).join('');
}
$('#tools').addEventListener('click',e=>{const t=e.target.closest('.tool');if(!t)return;setTool(t.dataset.tool)});
function setTool(t){ui.tool=t;if(t!=='sel'&&t!=='pan')ui.sel=[];g=null;wdraw=null;wg=null;if(t!=='city'&&ui.wk)ui.wk.vil=null;renderTools();renderSide();renderOverlay();cv.style.cursor=t==='pan'?'grab':t==='sel'?'default':'crosshair'}
function selItems(){const F=CF();return ui.sel.map(id=>F.items.find(i=>i.id===id)).filter(Boolean)}
let g=null,clip=[],bdraw=null;
const tolM=()=>9/(BU*ui.view.k);
/* ---- tests de collision ---- */
function inRoom(r,x,y){
  if(libreOk(r))return inPoly(x,y,libreApli(r));
  if(r.shape==='ellipse'){const a=r.w/2,b=r.h/2;return((x-r.x-a)/a)**2+((y-r.y-b)/b)**2<=1}
  if(x<r.x||x>r.x+r.w||y<r.y||y>r.y+r.h)return false;
  if(r.shape==='ring'){const t=r.thick||1;return!(x>r.x+t&&x<r.x+r.w-t&&y>r.y+t&&y<r.y+r.h-t)}
  return true}
function hitAt(x,y,F,want){
  const tol=tolM();const its=F.items;
  const test=(it)=>{
    switch(it.t){
    case 'label':{const b=itemBounds(it);return x>=b[0]-tol&&x<=b[2]+tol&&y>=b[1]-tol&&y<=b[3]+tol}
    case 'furn':{const d=FD[it.k]||{w:1,h:1};const a=-rad(it.r||0),dx=x-it.x,dy=y-it.y;const lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);return Math.abs(lx)<=d.w/2+tol/2&&Math.abs(ly)<=d.h/2+tol/2}
    case 'stair':return x>=it.x&&x<=it.x+it.w&&y>=it.y&&y<=it.y+it.h;
    case 'door':case 'win':{const b=itemBounds(it);return x>=b[0]-tol&&x<=b[2]+tol&&y>=b[1]-tol&&y<=b[3]+tol}
    case 'wall':return dpoly(x,y,murApl(it),false).d<=Math.max(tol,.2);
    case 'room':return inRoom(it,x,y)}
    return false};
  for(const ty of ['label','furn','stair','door','win','wall']){for(let i=its.length-1;i>=0;i--){const it=its[i];if(it.t===ty&&test(it))return it}}
  let best=null,ba=1e18;for(const it of its){if(it.t==='room'&&test(it)){const a=roomAire(it);if(a<ba){ba=a;best=it}}}
  return best}
/* ---- placement des portes / fenêtres sur les murs ---- */
function wallSegs(F){const S=[];for(const it of F.items){
  if(libreOk(it)){const f=libreApli(it),n=f.length;for(let i=0;i<n;i++){const p=f[i],q=f[(i+1)%n];S.push([p[0],p[1],q[0],q[1]])}}
  else if(it.t==='room'&&it.shape!=='ellipse'){const{x,y,w,h}=it;S.push([x,y,x+w,y],[x,y+h,x+w,y+h],[x,y,x,y+h],[x+w,y,x+w,y+h]);if(it.shape==='ring'){const t=it.thick||1;S.push([x+t,y+t,x+w-t,y+t],[x+t,y+h-t,x+w-t,y+h-t],[x+t,y+t,x+t,y+h-t],[x+w-t,y+t,x+w-t,y+h-t])}}
  else if(it.t==='wall'){const f=murApl(it);for(let i=0;i+1<f.length;i++)S.push([f[i][0],f[i][1],f[i+1][0],f[i+1][1]])}}
  return S}
function place(m,w,F){
  let best=null;const lim=Math.max(.7,tolM()*2);
  for(const s of wallSegs(F)){const x0=Math.min(s[0],s[2]),x1=Math.max(s[0],s[2]),y0=Math.min(s[1],s[3]),y1=Math.max(s[1],s[3]);
    const r=dseg(m[0],m[1],s[0],s[1],s[2],s[3]);if(r.d<lim&&(!best||r.d<best.d))best={d:r.d,s,H:s[1]===s[3],A:s[0]!==s[2]&&s[1]!==s[3],t:r.t,x0,x1,y0,y1}}
  let o,x,y,fl=1;
  if(best&&best.A)return placeOblique(m,w,best);
  if(best){o=best.H?'h':'v';
    if(best.H){x=clamp(snapv(m[0],.5),best.x0+w/2,best.x1-w/2);y=best.s[1];fl=m[1]<y?-1:1}
    else{y=clamp(snapv(m[1],.5),best.y0+w/2,best.y1-w/2);x=best.s[0];fl=m[0]<x?-1:1}
  }else{const gx=Math.round(m[0]),gy=Math.round(m[1]);if(Math.abs(m[1]-gy)<Math.abs(m[0]-gx)){o='h';x=snapv(m[0],.5);y=gy;fl=m[1]<y?-1:1}else{o='v';y=snapv(m[1],.5);x=gx;fl=m[0]<x?-1:1}}
  return{o,x:fx(x),y:fx(y),fl,onWall:!!best}}
const DW={porte:1,double:1.8,ouverte:1.2,arche:2,secrete:1,blindee:1,grille:1.2},WW={fenetre:1,baie:2,meurtriere:.3};
/* ---- création ---- */
function addItem(it){it.id=uid();CF().items.push(it);return it}
function defaultName(k){return {piece:'Pièce',couloir:'Couloir',cour:'Cour',eau:'Bains',secure:'Archives',ext:'Terrasse',cave:'Cave',vide:''}[k]??'Pièce'}
/* ---- pointeur ---- */
const BM={
 down(e){
  const m=toM(e),F=CF(),t=ui.tool,sn=v=>snapv(v);
  if(ui.facade||isoOn())return false;
  if(t==='sel'){
    const sel=selItems();
    if(sel.length>1){const gh=grHandleAt(sel,m);if(gh){snap();g={t:'groupe',h:gh,items:sel,orig:sel.map(i=>JSON.parse(JSON.stringify(i))),b:grBoite(sel),m0:m,autres:grAutresEtages(),toutLEtage:grToutLEtage(sel)};return true}}
    if(sel.length===1){const h=handleAt(sel[0],m);if(h){if(libreOk(sel[0])){libreDown(sel[0],h,e);return true}snap();g={t:'resize',it:sel[0],h,o:{...sel[0]},dedans:grContenu(sel[0],e.altKey),autres:(sel[0].t==='room'?grAutresEtages():null),toutLEtage:grToutLEtage([sel[0]])};return true}}
    const hit=hitAt(m[0],m[1],F);
    if(!hit){if(!e.shiftKey){ui.sel=[];renderSide();renderOverlay()}return false}
    const gl=grpEtendre(hit,e.altKey);
    if(e.shiftKey){ui.sel=ui.sel.includes(hit.id)?ui.sel.filter(i=>gl.indexOf(i)<0):[...new Set([...ui.sel,...gl])]}
    else if(e.altKey||!ui.sel.includes(hit.id)||gl.some(i=>!ui.sel.includes(i)))ui.sel=gl;
    const items=selItems();const attach=new Set(grAttraper(items,e.altKey));
    g={t:'move',m0:m,items:[...items,...attach],orig:[...items,...attach].map(i=>JSON.parse(JSON.stringify(i))),moved:false,
      base:items,autres:grAutresEtages(),toutLEtage:grToutLEtage(items)};
    renderSide();renderOverlay();return true}
  if(t==='room'&&ui.roomShape==='poly'){libreBas(m,e);return true}
  if(t==='room'||t==='stair'){g={t:'draw',m0:[sn(m[0]),sn(m[1])],m:[sn(m[0]),sn(m[1])]};return true}
  if(t==='wall'){g={t:'wall',m0:[sn(m[0]),sn(m[1])],m:[sn(m[0]),sn(m[1])]};return true}
  if(t==='door'||t==='win'){const w=t==='door'?DW[ui.doorK]:WW[ui.winK];const p=place(m,w,F);snap();
    const it=addItem(t==='door'?{t:'door',k:ui.doorK,x:p.x,y:p.y,o:p.o,...(p.o==='a'?{ang:p.ang}:{}),w,fl:p.fl,hg:1}:{t:'win',k:ui.winK,x:p.x,y:p.y,o:p.o,...(p.o==='a'?{ang:p.ang}:{}),w});ui.sel=[it.id];dirty();renderSide();renderOverlay();return true}
  if(t==='furn'){snap();const it=addItem({t:'furn',k:ui.furn,x:snapv(m[0],grPasFin()),y:snapv(m[1],grPasFin()),r:ui.furnRot||0});if(!e.altKey)murRanger(it,murSegs(F),[m[0],m[1]]);ui.sel=[it.id];dirty();renderSide();return true}
  if(t==='label'){snap();const it=addItem({t:'label',x:snapv(m[0],grPasFin()),y:snapv(m[1],grPasFin()),text:'Texte',size:12});ui.sel=[it.id];setTool('sel');dirty();renderSide();return true}
  if(t==='erase'){const h=hitAt(m[0],m[1],F);if(h){snap();F.items=F.items.filter(i=>i!==h);ui.sel=ui.sel.filter(i=>i!==h.id);dirty();renderSide()}return true}
  return false},
 move(e,dragging){
  const m=toM(e),F=CF();ui.hover=m;if(bdraw)bdraw.sh=!!e.shiftKey;
  if(g&&g.t==='pen'){libreTirer(m);return}
  if(g&&g.t==='groupe'){grGeste(g,m,e);dirty();renderOverlay();return}
  if(g&&g.t==='resize'&&(g.h[0]==='i'||g.h[0]==='o'))g.alt=!!e.altKey;
  if(!g){renderOverlay();return}
  if(g.t==='move'){const dx=snapv(m[0]-g.m0[0]),dy=snapv(m[1]-g.m0[1]);if(!g.moved&&(dx||dy)){snap();g.moved=true}
    const sgm=(e.altKey||g.items.some(i=>i.t!=='furn'))?null:murSegs(F);
    g.items.forEach((it,i)=>{moveItem(it,g.orig[i],dx,dy);if(sgm&&it.t==='furn')murRanger(it,sgm,[g.orig[i].x,g.orig[i].y])});grBouger(g,dx,dy);dirty();renderOverlay()}
  else if(g.t==='resize'){resizeItem(g,m);dirty();renderOverlay()}
  else if(g.t==='draw'||g.t==='wall'){let x=snapv(m[0]),y=snapv(m[1]);if(g.t==='wall'&&!e.altKey){if(Math.abs(x-g.m0[0])>Math.abs(y-g.m0[1]))y=g.m0[1];else x=g.m0[0]}g.m=[x,y];renderOverlay()}},
 up(e){
  if(!g)return;const F=CF();
  if(g.t==='draw'){const x=Math.min(g.m0[0],g.m[0]),y=Math.min(g.m0[1],g.m[1]),w=Math.abs(g.m[0]-g.m0[0]),h=Math.abs(g.m[1]-g.m0[1]);
    if(w>=.5&&h>=.5){snap();let it;if(ui.tool==='room'){it=addItem({t:'room',x,y,w,h,kind:ui.roomK,shape:ui.roomShape,name:defaultName(ui.roomK),note:''});}
      else it=addItem({t:'stair',x,y,w,h,dir:ui.stairDir||(h>=w?'n':'e'),label:'monte',esc:uid(),suite:true});
      if(it.shape==='ring')it.thick=1;
      ui.sel=[it.id];dirty();renderSide()}}
  else if(g.t==='wall'){if(Math.hypot(g.m[0]-g.m0[0],g.m[1]-g.m0[1])>=.5){snap();const it=addItem({t:'wall',x1:g.m0[0],y1:g.m0[1],x2:g.m[0],y2:g.m[1],k:ui.wallK});ui.sel=[it.id];dirty();renderSide()}}
  if(g.t==='pen'){const pen=g;g=null;libreHaut(pen);renderOverlay();return}
  if(g.t==='groupe'){const gr=g;g=null;renderSide();renderOverlay();
    if(gr.h==='grot'&&gr.ang&&!grQuart(gr.ang)&&grNePasTourner(gr.items))toast('Les escaliers, les ovales et les anneaux ne tournent que par quarts de tour : le reste a suivi l’angle.');return}
  if(g.t==='resize'&&(libreOk(g.it)||g.it.t==='wall'))renderSide();
  g=null;renderOverlay();renderSideLight()},
 cancel(){g=null;renderOverlay()},
 ctx(e){if(bdrawOk())bRetirer()},
 dbl(e){if(bdrawOk()){if(bdraw.pts.length>=3)bFinish();else{bdraw=null;renderSide();renderOverlay()}return}const F=CF(),m=toM(e);
  const s1=selItems();if(s1.length===1&&libreOk(s1[0])){const hh=handleAt(s1[0],m);if(hh&&hh[0]==='v'){libreTourner(s1[0],+hh.slice(1));return}}const h=hitAt(m[0],m[1],F);if(h&&h.t==='room'){ui.sel=[h.id];renderSide();const i=$('#side [data-f="name"]');i&&(i.focus(),i.select())}}
};
function moveItem(it,o,dx,dy){
  if(it.t==='wall'){it.x1=o.x1+dx;it.x2=o.x2+dx;it.y1=o.y1+dy;it.y2=o.y2+dy}else{it.x=fx(o.x+dx);it.y=fx(o.y+dy);if(o.pts&&it.t==='room')it.pts=o.pts.map(p=>pBouge(p,dx,dy))}}
function handlesOf(it){
  if(libreOk(it))return libreHandles(it);
  if(it.t==='furn'){const d=FD[it.k]||{w:1,h:1};return{rot:[it.x,it.y-Math.max(d.w,d.h)/2-Math.max(.6,16/(BU*ui.view.k))]}}
  if(it.t==='room'||it.t==='stair'){const{x,y,w,h}=it;const H={nw:[x,y],n:[x+w/2,y],ne:[x+w,y],e:[x+w,y+h/2],se:[x+w,y+h],s:[x+w/2,y+h],sw:[x,y+h],w:[x,y+h/2]};return H}
  if(it.t==='wall')return murHandles(it);
  if(it.t==='door'||it.t==='win'){const h=it.w/2;if(it.o==='a'){const a=rad(it.ang||0),dx=Math.cos(a)*h,dy=Math.sin(a)*h;return{a:[it.x-dx,it.y-dy],b:[it.x+dx,it.y+dy]}}return it.o==='h'?{a:[it.x-h,it.y],b:[it.x+h,it.y]}:{a:[it.x,it.y-h],b:[it.x,it.y+h]}}
  return{}}
function handleAt(it,m){const H=handlesOf(it),tol=tolM()*1.3;for(const k in H)if(Math.hypot(H[k][0]-m[0],H[k][1]-m[1])<=tol)return k;return null}
function resizeItem(gs,m){
  const it=gs.it,o=gs.o,h=gs.h,x=snapv(m[0]),y=snapv(m[1]);
  if(libreOk(it))libreVertex(gs,x,y,m);
  else if(it.t==='room'||it.t==='stair'){let x0=o.x,y0=o.y,x1=o.x+o.w,y1=o.y+o.h;
    if(h.includes('w'))x0=Math.min(x,x1-.5);if(h.includes('e'))x1=Math.max(x,x0+.5);if(h.includes('n'))y0=Math.min(y,y1-.5);if(h.includes('s'))y1=Math.max(y,y0+.5);
    it.x=fx(x0);it.y=fx(y0);it.w=fx(x1-x0);it.h=fx(y1-y0);grSuivre(gs)}
  else if(it.t==='wall'){if(h==='ha'||h==='hb')murTirer(it,h,m);else if(h==='c')murRegler(it,m);else if(h==='a'){it.x1=x;it.y1=y}else{it.x2=x;it.y2=y}}
  else if(it.t==='furn'&&h==='rot'){let d=deg(Math.atan2(m[1]-it.y,m[0]-it.x))+90;if(!gs.alt)d=Math.round(d/15)*15;it.r=fx(((d%360)+360)%360)}
  else if((it.t==='door'||it.t==='win')&&it.o==='a')libreRedim(it,h,m);
  else if(it.t==='door'||it.t==='win'){const H=it.o==='h';const c=H?it.x:it.y;const p=snapv(H?m[0]:m[1],.25);const a=h==='a'?Math.min(p,c+it.w/2-.25):c-it.w/2,b=h==='b'?Math.max(p,c-it.w/2+.25):c+it.w/2;const nw=b-a;if(H)it.x=fx((a+b)/2);else it.y=fx((a+b)/2);it.w=fx(Math.max(.25,nw))}}
/* ---- surcouche ---- */
function renderOverlay(){
  if(isoOn()){overlay.innerHTML='';return}
  if(ui.mode==='v'){vOverlay();return}
  if(ui.mode==='w'){wOverlay();return}
  if(ui.facade){overlay.innerHTML='';return}
  const F=CF();let s='';const k=1/ui.view.k;
  for(const it of selItems()){const b=itemBounds(it);const pad=3*k;
    if(libreOk(it))s+=libreSel(it,k,selItems().length===1);else if(it.t==='wall')s+=`<path d="${murD(it)}" fill="none" stroke="var(--accent)" stroke-width="${5*k}" opacity=".45"/>`;
    else if(it.t==='furn'){const d=FD[it.k]||{w:1,h:1};s+=`<rect x="${-d.w*BU/2-pad}" y="${-d.h*BU/2-pad}" width="${d.w*BU+2*pad}" height="${d.h*BU+2*pad}" transform="translate(${it.x*BU} ${it.y*BU}) rotate(${it.r||0})" fill="none" stroke="var(--accent)" stroke-width="${2*k}" stroke-dasharray="${6*k} ${4*k}"/>`}
    else s+=`<rect x="${b[0]*BU-pad}" y="${b[1]*BU-pad}" width="${(b[2]-b[0])*BU+2*pad}" height="${(b[3]-b[1])*BU+2*pad}" fill="none" stroke="var(--accent)" stroke-width="${2*k}" stroke-dasharray="${6*k} ${4*k}"/>`;
    if((it.t==='room'||it.t==='stair')&&!libreOk(it)){const lab=`font-family="${FONT}" font-size="${12*k}" fill="var(--accent)" font-weight="700" stroke="${PAPER}" stroke-width="${3*k}" paint-order="stroke" text-anchor="middle"`;
      s+=`<text x="${(it.x+it.w/2)*BU}" y="${it.y*BU-9*k}" ${lab}>${fx(it.w)} m</text><text transform="translate(${it.x*BU-9*k} ${(it.y+it.h/2)*BU}) rotate(-90)" ${lab}>${fx(it.h)} m</text>`}
    if(it.t==='wall'){const L=murLong(it),ap=murApex(it);s+=`<text x="${ap[0]*BU}" y="${ap[1]*BU-8*k}" font-family="${FONT}" font-size="${12*k}" fill="var(--accent)" font-weight="700" stroke="${PAPER}" stroke-width="${3*k}" paint-order="stroke" text-anchor="middle">${fx(L)} m</text>`}
    if(ui.edit&&selItems().length===1){const H=handlesOf(it);for(const q in H)if(libreOk(it))s+=libreHandleSVG(it,q,H[q],k);
      else if(it.t==='wall')s+=murHandleSVG(it,q,H[q],k);
      else if(q==='rot')s+=grRotSVG(H[q],[it.x,it.y],k);
      else s+=`<rect x="${H[q][0]*BU-4.5*k}" y="${H[q][1]*BU-4.5*k}" width="${9*k}" height="${9*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.6*k}"/>`}}
  if(selItems().length>1)s+=grCadreSVG(selItems(),k);
  const m=ui.hover;
  if(bdrawOk())s+=libreTrace(bdraw,k);
  else if(g&&g.t==='draw'){const x=Math.min(g.m0[0],g.m[0]),y=Math.min(g.m0[1],g.m[1]),w=Math.abs(g.m[0]-g.m0[0]),h=Math.abs(g.m[1]-g.m0[1]);
    s+=`<rect x="${x*BU}" y="${y*BU}" width="${w*BU}" height="${h*BU}" fill="var(--accent)" fill-opacity=".12" stroke="var(--accent)" stroke-width="${2*k}"/><text x="${(x+w/2)*BU}" y="${(y+h/2)*BU}" text-anchor="middle" font-size="${13*k}" fill="var(--accent)" font-family="${FONT}">${fx(w)} × ${fx(h)} m</text>`}
  else if(g&&g.t==='wall'){s+=`<line x1="${g.m0[0]*BU}" y1="${g.m0[1]*BU}" x2="${g.m[0]*BU}" y2="${g.m[1]*BU}" stroke="var(--accent)" stroke-width="${3*k}"/><text x="${(g.m0[0]+g.m[0])/2*BU}" y="${((g.m0[1]+g.m[1])/2)*BU-8*k}" text-anchor="middle" font-size="${13*k}" fill="var(--accent)" font-family="${FONT}">${fx(Math.hypot(g.m[0]-g.m0[0],g.m[1]-g.m0[1]))} m</text>`}
  else if(!g&&m){
    if(ui.tool==='door'||ui.tool==='win'){const w=ui.tool==='door'?DW[ui.doorK]:WW[ui.winK];const p=place(m,w,F);const L=w*BU/2;
      s+=p.o==='a'?`<rect x="${p.x*BU-L}" y="${p.y*BU-5}" width="${2*L}" height="10" transform="rotate(${p.ang} ${p.x*BU} ${p.y*BU})" fill="var(--accent)" fill-opacity=".45"/>`:p.o==='h'?`<rect x="${p.x*BU-L}" y="${p.y*BU-5}" width="${2*L}" height="10" fill="var(--accent)" fill-opacity="${p.onWall?.45:.2}"/>`:`<rect x="${p.x*BU-5}" y="${p.y*BU-L}" width="10" height="${2*L}" fill="var(--accent)" fill-opacity="${p.onWall?.45:.2}"/>`}
    else if(ui.tool==='furn'){const d=FD[ui.furn];s+=`<g opacity=".55" transform="translate(${snapv(m[0],.25)*BU} ${snapv(m[1],.25)*BU}) rotate(${ui.furnRot||0}) translate(${-d.w*BU/2} ${-d.h*BU/2})">${furnSVG(d.k,d.w,d.h)}</g>`}
    else if(ui.tool==='room'||ui.tool==='stair'||ui.tool==='wall'){s+=`<circle cx="${snapv(m[0])*BU}" cy="${snapv(m[1])*BU}" r="${4*k}" fill="var(--accent)"/>`}}
  overlay.innerHTML=s}
/* ---- rendu canvas bâtiment ---- */
function B_render(){
  const b=CB();
  if(isoOn()){isoRender();return}
  if(ui.facade){const f=facadeSVG(b);content.innerHTML=f.svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');return}
  const W=b.gw*BU,H=b.gh*BU;
  let s=`<defs><pattern id="g1" width="${BU}" height="${BU}" patternUnits="userSpaceOnUse"><path d="M${BU} 0V${BU}H0" fill="none" stroke="#b9aa88" stroke-width=".5" opacity=".55"/></pattern><pattern id="g5" width="${BU*5}" height="${BU*5}" patternUnits="userSpaceOnUse"><path d="M${BU*5} 0V${BU*5}H0" fill="none" stroke="#a89a78" stroke-width="1" opacity=".5"/></pattern></defs>`;
  s+=`<rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER}" stroke="#a89a78" stroke-width="2"/>`;
  if(ui.grid)s+=`<rect width="${W}" height="${H}" fill="url(#g1)"/><rect width="${W}" height="${H}" fill="url(#g5)"/>`;
  s+=renderFloor(b,ui.fl,{ghost:ui.ghost,dims:ui.dims});
  content.innerHTML=s}
/* ---- barre d'étages ---- */
function renderFloorbar(){
  const bar=$('#floorbar');
  if(ui.mode==='w'){bar.innerHTML=wCrumbs();return}
  if(ui.mode!=='b'){bar.innerHTML=(ui.fromW&&P.worlds.find(x=>x.id===ui.fromW.w)?`<button class="btn sm primary" data-act="backW">← ${esc(P.worlds.find(x=>x.id===ui.fromW.w).name)}</button>`:'')+`<div class="seg"><button data-v="plan" aria-pressed="${!ui.iso.on&&!prOn()&&!isoDeux()}">Carte</button><button data-v="iso" aria-pressed="${ui.iso.on}">Isométrie</button><button data-v="deux" aria-pressed="${isoDeux()}">Les deux</button><button data-v="pro" aria-pressed="${prOn()}">Promenade</button></div><span class="hint">${esc(CV().name)} · ${CV().W}×${CV().H} m</span>`;return}
  const b=CB();
  bar.innerHTML=(ui.from&&P.villages.find(v=>v.id===ui.from.v)?`<button class="btn sm primary" data-act="backV">← Retour à la carte</button>`:'')+`<div class="seg"><button data-v="plan" aria-pressed="${!ui.facade&&!ui.iso.on&&!isoDeux()}">Plan</button><button data-v="iso" aria-pressed="${ui.iso.on}">Isométrie</button><button data-v="deux" aria-pressed="${isoDeux()}">Les deux</button><button data-v="pro" aria-pressed="${prOn()}">Promenade</button><button data-v="fac" aria-pressed="${ui.facade}">Façade</button></div>`+
   b.floors.map((f,i)=>`<button class="chip" data-fl="${i}" aria-pressed="${i===ui.fl&&!ui.facade}">${esc(f.name)}</button>`).join('')+
   `<button class="btn sm" data-act="addFloor" title="Nouvel étage vide">＋ Étage</button><button class="btn sm danger" data-act="delFloor" title="Retirer cet étage"${b.floors.length<2?' disabled':''}>− Étage</button><button class="btn sm" data-act="dupFloor" title="Copier cet étage dans un nouvel étage">⧉ Copier</button>`;
}
$('#floorbar').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(ui.mode==='v'&&t.dataset.v){if(t.dataset.v==='pro'){ui.iso.on=false;ui.iso.deux=false;prEntrer();return}prFermer();ui.iso.on=t.dataset.v==='iso';ui.iso.deux=t.dataset.v==='deux';ui.sel=[];renderAll();fit();return}
  if(ui.mode!=='b')return;const b=CB();
  if(!ui.edit&&(t.dataset.act==='addFloor'||t.dataset.act==='dupFloor'))return;
  if(t.dataset.v){if(t.dataset.v==='pro'){ui.facade=false;ui.iso.on=false;ui.iso.deux=false;prEntrer();return}prFermer();ui.facade=t.dataset.v==='fac';ui.iso.on=t.dataset.v==='iso';ui.iso.deux=t.dataset.v==='deux';ui.sel=[];renderAll();fit();return}
  if(t.dataset.fl!=null){ui.fl=+t.dataset.fl;ui.facade=false;ui.sel=[];isoOublierPiece();renderAll();fit();return}
  if(t.dataset.act==='backV'){const f=ui.from;ui.from=null;P.curV=f.v;setMode('v');ui.sel=[f.id];renderSide();renderOverlay();return}
  if(t.dataset.act==='delFloor'){if(b.floors.length<2)return;if(!armed(t,'Confirmer ?'))return;snap();b.floors.splice(ui.fl,1);ui.fl=Math.max(0,ui.fl-1);ui.sel=[];save();renderAll();return}
  if(t.dataset.act==='addFloor'){snap();b.floors.push({name:floorName(b.floors.length),items:[]});ui.fl=b.floors.length-1;ui.facade=false;ui.sel=[];save();renderAll()}
  if(t.dataset.act==='dupFloor'){snap();const f=JSON.parse(JSON.stringify(CF()));f.name=floorName(b.floors.length);f.items.forEach(i=>i.id=uid());b.floors.splice(ui.fl+1,0,f);ui.fl++;ui.sel=[];save();renderAll()}});
const floorName=i=>i===0?'Rez-de-chaussée':i===1?'1er étage':i+'e étage';
/* ---- panneau latéral bâtiment ---- */
const opt=(o,cur)=>Object.entries(o).map(([k,v])=>`<option value="${k}"${k===cur?' selected':''}>${esc(typeof v==='object'?v.n:v)}</option>`).join('');
function fld(label,f,v,type='text',extra=''){return `<div class="row"><label>${label}</label><input type="${type}" data-f="${f}" value="${esc(v)}" ${extra}></div>`}
function palette(items,cur,attr){return `<div class="pal">`+items.map(([k,n,w,h])=>{const d=w?`<svg viewBox="0 0 ${w*BU} ${h*BU}">${furnSVG(k,w,h)}</svg>`:'';return `<button data-${attr}="${k}" aria-pressed="${k===cur}" title="${esc(n)}">${d}<span>${esc(n)}</span></button>`}).join('')+`</div>`}
function B_side(){
  const b=CB(),F=CF(),sel=selItems();let h='';let selH='';
  // outil / sélection
  if(ui.tool==='furn')selH+=toolPanel()+(sel.length===1&&sel[0].t==='furn'?itemPanel(sel[0]):'');
  else if(sel.length===1)selH+=itemPanel(sel[0]);
  else if(sel.length>1)selH+=grPanneau(sel);
  else selH+=toolPanel();
  h+=selH+grPrecision()+grpListe();
  h+=`<h3>Bâtiment</h3>`;
  h+=`<div class="row"><label>Nom</label><input type="text" data-b="name" value="${esc(b.name)}"></div>`;
  h+=`<div class="row"><button class="btn sm primary" data-act="toMap">Placer sur la carte du village</button></div>`;
  h+=`<div class="row"><label>Zone (m)</label><input type="number" data-b="gw" value="${b.gw}" min="8" max="120"> × <input type="number" data-b="gh" value="${b.gh}" min="8" max="120"></div>`;
  h+=`<div class="row"><label><input type="checkbox" data-ui="grid"${ui.grid?' checked':''}> Grille</label><label><input type="checkbox" data-ui="ghost"${ui.ghost?' checked':''}> Étage du dessous</label><label><input type="checkbox" data-ui="dims"${ui.dims?' checked':''}> Dimensions</label></div>`;
  if(ui.facade){const f=b.facade;
    h+=`<h3>Façade</h3><p class="hint">Les portes et fenêtres posées sur le mur sud du plan sont reprises ici.</p>`;
    h+=`<div class="row"><label>Style</label><select data-fc="style">${opt({pierre:'Pierre gothique',colombage:'Colombage',brique:'Brique',bois:'Bois'},f.style)}</select></div>`;
    h+=`<div class="row"><label>Toit</label><select data-fc="roof">${opt({croupe:'À croupes',pignon:'À pignon',plat:'Plat crénelé'},f.roof)}</select></div>`;
    h+=`<div class="row"><label>Cheminées</label><input type="number" data-fc="chim" min="0" max="4" value="${f.chim}"></div>`;
    h+=`<div class="row"><label><input type="checkbox" data-fc="porch"${f.porch!==false?' checked':''}> Porche</label><label><input type="checkbox" data-fc="tower"${f.tower?' checked':''}> Tourelle</label></div>`;
    return h}
  h+=`<h3>Étage</h3>`;
  h+=`<div class="row"><label>Nom</label><input type="text" data-fn="name" value="${esc(F.name)}"></div>`;
  h+=`<div class="row"><button class="btn sm" data-act="ranger" title="Pousser les meubles qui chevauchent un mur">Ranger les meubles</button></div>`;
  h+=`<div class="row"><button class="btn sm danger" data-act="delFloor"${b.floors.length<2?' disabled':''}>Supprimer l'étage</button><button class="btn sm" data-act="clearFloor">Vider</button></div>`;
  // liste des pièces
  const rooms=b.floors.flatMap((f,i)=>f.items.filter(x=>x.t==='room'&&x.name&&x.kind!=='cour'&&x.kind!=='couloir').map(x=>({...x,fi:i})));
  h+=`<h3>Pièces (${rooms.length})</h3>`;
  if(rooms.length){let tot=0;h+=`<ul class="legend">`+rooms.map(r=>{const a=roomAire(r);tot+=a;return `<li><span class="pill">${r.fi===0?'RDC':'É'+r.fi}</span><a href="#" data-goto="${r.fi}:${r.id}" style="color:inherit">${esc(r.name)}</a> <span class="hint">${fx(a)} m²</span></li>`}).join('')+`</ul><p class="hint">Surface totale des pièces : ${fx(tot)} m²</p>`}
  else h+=`<p class="hint">Dessine des pièces avec l'outil « Pièce ».</p>`;
  if(b.gen)h+=`<h3>Générateur</h3><div class="row"><button class="btn sm" data-act="regen">Autre variante</button><span class="hint">Remplace le plan actuel</span></div>`;
  h+=`<h3>Notes</h3><textarea data-b="notes" rows="4" placeholder="Histoire, occupants, secrets…">${esc(b.notes)}</textarea>`;
  return h}
function furnCatalog(){
  return FCAT.map(([cat,ks])=>`<p class="tag" style="margin:10px 0 4px">${cat}</p><div class="pal big">`+ks.map(k=>{const d=FD[k];const w=Math.round(Math.min(78,Math.max(22,d.w*34)));return `<button data-furn="${k}" aria-pressed="${k===ui.furn}" title="${esc(d.n)}"><div class="th"><svg viewBox="0 0 ${d.w*BU} ${d.h*BU}" style="width:${w}px;height:auto">${furnSVG(k,d.w,d.h)}</svg></div><span>${esc(d.n)}</span><em>${d.w} × ${d.h} m</em></button>`}).join('')+`</div>`).join('')}
function toolPanel(){
  const t=ui.tool;let h='';
  const T={sel:['Sélection','Clique un élément pour le modifier. Double-clic sur une pièce pour la renommer. Glisse dans le vide pour déplacer la vue.'],pan:['Main','Glisse pour déplacer la vue, molette pour zoomer.'],
   room:['Nouvelle pièce',ui.roomShape==='poly'?'Clique pour poser un point, glisse en posant pour courber le côté. Pour fermer : reclique le premier point, ou double-clic, ou Entrée. Maj : angles de 45 degrés. Retour arrière : retire le dernier point.':'Glisse un rectangle sur la grille.'],wall:['Nouveau mur','Glisse un trait. Alt : angle libre. Une fois posé, choisis-le pour l’arrondir.'],door:['Nouvelle porte','Clique sur un mur : la porte s\'ouvre du côté du curseur.'],win:['Nouvelle fenêtre','Clique sur un mur extérieur.'],
   furn:['Mobilier','Choisis un objet puis clique pour le poser. R tourne.'],stair:['Nouvel escalier','Glisse un rectangle. Ensuite règle le sens.'],label:['Texte','Clique pour poser un texte libre.'],erase:['Gomme','Clique un élément pour le supprimer.']}[t];
  h+=`<h3>${T[0]}</h3><p class="hint">${T[1]}</p>`;
  if(t==='room'){h+=`<div class="row"><label>Type</label><select data-ui="roomK">${opt(RK,ui.roomK)}</select></div><div class="row"><label>Forme</label><select data-ui="roomShape">${opt({rect:'Rectangle',ring:'Anneau (galerie)',ellipse:'Ovale / tour',poly:'Forme libre (la plume)'},ui.roomShape)}</select></div>`}
  if(t==='room'&&ui.roomShape==='poly')h+=libreEtat();
  if(t==='door')h+=`<div class="row"><label>Type</label><select data-ui="doorK">${opt(DK,ui.doorK)}</select></div>`;
  if(t==='win')h+=`<div class="row"><label>Type</label><select data-ui="winK">${opt(WK,ui.winK)}</select></div>`;
  if(t==='wall')h+=`<div class="row"><label>Type</label><select data-ui="wallK">${opt({mur:'Mur épais',cloison:'Cloison fine',bas:'Muret, garde-corps'},ui.wallK)}</select></div>`;
  if(t==='stair')h+=`<div class="row"><label>Sens</label><select data-ui="stairDir">${opt({n:'Monte vers le haut',s:'Monte vers le bas',e:'Monte vers la droite',w:'Monte vers la gauche',spiral:'Colimaçon'},ui.stairDir||'n')}</select></div>`;
  if(t==='furn')h+=furnCatalog()+`<div class="row"><label>Rotation</label><select data-ui="furnRot">${[0,90,180,270].map(r=>`<option value="${r}"${(ui.furnRot||0)==r?' selected':''}>${r}°</option>`).join('')}</select></div>`;
  return h}
function itemPanel(it){
  let h='';const del=`<div class="row"><button class="btn sm" data-act="dup">Dupliquer</button><button class="btn sm danger" data-act="del">Supprimer</button></div>`;
  if(it.t==='room'){
    h+=`<h3>Pièce</h3>`+fld('Nom','name',it.name)+`<div class="row"><label>Type</label><select data-f="kind">${opt(RK,it.kind)}</select></div><div class="row"><label>Forme</label><select data-f="shape">${opt({rect:'Rectangle',ring:'Anneau',ellipse:'Ovale',poly:'Libre'},it.shape||'rect')}</select></div>`;
    h+=`<div class="row"><label>x · y (m)</label><input type="number" data-f="x" step="0.5" value="${it.x}"><input type="number" data-f="y" step="0.5" value="${it.y}"></div><div class="row"><label>Larg. × haut. (m)</label><input type="number" data-f="w" step="0.5" min="0.5" value="${it.w}"><input type="number" data-f="h" step="0.5" min="0.5" value="${it.h}"></div>`;
    h+=grEtagePanneau(false)+(libreOk(it)?libreInfo(it):`<p class="hint">Surface : ${fx(it.shape==='ellipse'?Math.PI*it.w*it.h/4:it.w*it.h)} m² · périmètre ${fx(2*(it.w+it.h))} m</p>`);
    if(it.shape==='ring')h+=fld('Épaisseur (m)','thick',it.thick||1,'number','step="0.25" min="0.5"');
    if(it.kind==='cour')h+=`<div class="row"><label><input type="checkbox" data-f="arc"${it.arc!==false?' checked':''}> Colonnade</label></div>`;
    h+=`<div class="row"><label>Notes</label></div><textarea data-f="note" rows="3" placeholder="Occupants, ambiance, secrets…">${esc(it.note||'')}</textarea><div class="row"><button class="btn sm" data-act="oracle">Contenu aléatoire</button></div>`+del}
  else if(it.t==='door')h+=`<h3>Porte</h3><div class="row"><label>Type</label><select data-f="k">${opt(DK,it.k)}</select></div>`+fld('Largeur (m)','w',it.w,'number','step="0.25" min="0.5"')+`<div class="row"><button class="btn sm" data-act="flip">↕ Ouvre de l'autre côté</button><button class="btn sm" data-act="hinge">↔ Charnière</button></div>`+del;
  else if(it.t==='win')h+=`<h3>Fenêtre</h3><div class="row"><label>Type</label><select data-f="k">${opt(WK,it.k)}</select></div>`+fld('Largeur (m)','w',it.w,'number','step="0.25" min="0.25"')+del;
  else if(it.t==='furn')h+=`<h3>${esc((FD[it.k]||{}).n||'Objet')}</h3><div class="row"><label>Objet</label><select data-f="k">${FURN.map(f=>`<option value="${f[0]}"${f[0]===it.k?' selected':''}>${f[1]}</option>`).join('')}</select></div><div class="row"><button class="btn sm" data-act="rotL">↺ 90°</button><button class="btn sm" data-act="rotR">↻ 90°</button></div>`+del;
  else if(it.t==='stair')h+=escPanneau(it)+`<h3>Escalier</h3><div class="row"><label>Sens</label><select data-f="dir">${opt({n:'Haut',s:'Bas',e:'Droite',w:'Gauche',spiral:'Colimaçon'},it.dir)}</select></div>`+fld('Étiquette','label',it.label||'')+`<div class="row"><label>Larg. × haut. (m)</label><input type="number" data-f="w" step="0.5" min="0.5" value="${it.w}"><input type="number" data-f="h" step="0.5" min="0.5" value="${it.h}"></div>`+del;
  else if(it.t==='label')h+=`<h3>Texte</h3><textarea data-f="text" rows="2">${esc(it.text)}</textarea>`+fld('Taille','size',it.size||12,'number','min="7" max="40"')+`<div class="row"><label><input type="checkbox" data-f="it"${it.it?' checked':''}> Italique</label></div>`+del;
  else if(it.t==='wall')h+=`<h3>Mur</h3><div class="row"><label>Type</label><select data-f="k">${opt({mur:'Mur épais',cloison:'Cloison fine',bas:'Muret, garde-corps'},it.k||'mur')}</select></div>`+`<div class="row"><label>Arrondi (m)</label><input type="number" step="0.25" data-f="arc" value="${murCreux(it)}"></div>`+`<p class="hint">Longueur : ${fx(murLong(it))} m. Glisse le rond du milieu pour arrondir le mur d’un coup, ou tape son creux ici (zéro le redresse). Une fois courbé, il a une poignée à chaque bout, comme à la plume : tire-les pour une courbe en S, ramène-en une sur son bout pour l’enlever.</p>`+del;
  return h}
/* ---- événements du panneau ---- */
const side=$('#side');let editSnap=false;
side.addEventListener('focusin',()=>editSnap=false);
function once(){if(!editSnap){snap();editSnap=true}}
function numOrStr(el){return el.type==='number'?(el.value===''?0:parseFloat(el.value)):el.type==='checkbox'?el.checked:el.value}
side.addEventListener('input',e=>{
  const el=e.target;if(ui.mode==='b')B_input(el,true);else if(ui.mode==='w')W_input(el,true);else V_input(el,true)});
side.addEventListener('change',e=>{const el=e.target;if(el.tagName==='SELECT'||el.type==='checkbox'){if(ui.mode==='b')B_input(el,false);else if(ui.mode==='w')W_input(el,false);else V_input(el,false)}});
function B_input(el,typing){
  const b=CB();const d=el.dataset;
  if(d.ui){if(el.type==='checkbox')ui[d.ui]=el.checked;else{const v=el.value;ui[d.ui]=isNaN(+v)||['roomK','roomShape','doorK','winK','wallK','stairDir'].includes(d.ui)?v:+v}if(d.ui==='snap'){ui.snap=grPasOk(ui.snap);plansVueBientot()}renderCanvas();renderOverlay();if(d.ui==='roomShape'||d.ui==='snap'||d.ui==='tousEtages'){bdraw=null;renderSide()}return}
  if(typing&&el.tagName==='SELECT')return;
  if(d.b){once();let v=numOrStr(el);if(d.b==='gw'||d.b==='gh')v=clamp(+v||30,8,120);b[d.b]=v;save();if(d.b==='name'){fillItemSel()}renderCanvas();return}
  if(d.fn){once();CF().name=el.value;save();renderFloorbar();return}
  if(d.fc){once();b.facade[d.fc]=el.type==='checkbox'?el.checked:el.type==='number'?+el.value:el.value;save();renderCanvas();return}
  if(d.f){const sel=selItems();if(sel.length!==1)return;once();const it=sel[0];let v=numOrStr(el);
    if(['x','y','w','h','size','thick'].includes(d.f)){if(isNaN(v))return;if((d.f==='w'||d.f==='h'||d.f==='thick')&&v<=0)return}
    if(['x','y','w','h'].includes(d.f)&&it.t==='room'){grSaisie(it,()=>{if(libreOk(it))libreRegler(it,d.f,v);else it[d.f]=v})}
    else if(d.f==='shape')libreVers(it,v);
    else if(d.f==='arc'&&it.t==='wall')murPoser(it,v);else it[d.f]=v;
    if(it.t==='stair'){if(d.f==='suite'&&!it.esc)it.esc=uid();try{escSync()}catch(e){}}
    save();renderCanvas();renderOverlay();
    if(el.tagName==='SELECT'||el.type==='checkbox'){renderSide()}}
}
side.addEventListener('click',e=>{
  const a=e.target.closest('[data-goto]');if(a){e.preventDefault();const[fi,id]=a.dataset.goto.split(':');ui.fl=+fi;ui.facade=false;ui.sel=[id];renderAll();return}
  const p=e.target.closest('[data-furn]');if(p&&ui.mode==='b'){ui.furn=p.dataset.furn;renderSide();renderOverlay();return}
  const act=e.target.closest('[data-act]');if(!act)return;
  if(!ui.edit){const q=act.dataset.act;if(q==='enter')roEnter();else if(RO_OK.has(q))V_act(q,act);return}
  if(ui.mode==='b')B_act(act.dataset.act,act);else if(ui.mode==='w')W_act(act.dataset.act,act);else V_act(act.dataset.act,act)});
function B_act(a,btn){
  const b=CB(),F=CF(),sel=selItems();
  if(a==='del'){snap();F.items=F.items.filter(i=>!ui.sel.includes(i.id));ui.sel=[];dirty();renderSide();return}
  if(a&&/^al[GDHB]$|^alC[xy]$/.test(a)){grAligner(selItems(),a.slice(2).toLowerCase());return}
  if(a==='espX'||a==='espY'){grEspacer(selItems(),a==='espX'?'x':'y');return}
  if(a==='ranger'){snap();const n=rangerMeubles(CF());if(!n){hist.pop();updUndo();toast('Aucun meuble ne chevauche un mur.');return}dirty();renderAll();toast(n+(n>1?' meubles rangés contre leur mur.':' meuble rangé contre son mur.'));return}
  if(a==='grouper'){grpFaire(selItems());return}
  if(a==='degrouper'){grpDefaire(selItems());return}
  if(a==='escDet'){const it=selItems()[0];if(it&&it.t==='stair'){snap();escCouper(it);delete it.auto;it.esc=uid();dirty();renderCanvas();renderOverlay();renderSide()}return}
  if(a==='dup'){dupSel();return}
  if(a==='bFin'){bFinish();return}if(a==='bBack'){bRetirer();return}if(a==='bAnn'){bdraw=null;renderSide();renderOverlay();return}
  if(a==='bRond'){const it=selItems()[0];if(libreOk(it)){snap();libreArrondir(it,!it.pts.some(pRond));dirty();renderCanvas();renderOverlay();renderSide()}return}
  if(a==='rotR'||a==='rotL'){snap();sel.forEach(i=>i.r=((i.r||0)+(a==='rotR'?90:270))%360);dirty();renderOverlay();return}
  if(a==='flip'){snap();sel.forEach(i=>i.fl=-(i.fl||1));dirty();return}
  if(a==='hinge'){snap();sel.forEach(i=>i.hg=-(i.hg||1));dirty();return}
  if(a==='delFloor'){if(b.floors.length<2)return;if(!armed(btn,'Confirmer ?'))return;snap();b.floors.splice(ui.fl,1);ui.fl=Math.max(0,ui.fl-1);ui.sel=[];save();renderAll();return}
  if(a==='clearFloor'){if(!armed(btn,'Confirmer ?'))return;snap();F.items=[];ui.sel=[];save();renderAll();return}
  if(a==='oracle'){const it=sel[0];if(!it)return;snap();const r=mkrng(Math.floor(Math.random()*1e9));const o=NM.piece(r);const txt=`Ambiance : ${o.ambiance}.\nÀ voir : ${o.objet}.\nPrésent : ${o.occupant}.\nCaché : ${o.secret}.`;it.note=(it.note?it.note+'\n\n':'')+txt;dirty();renderSide();return}
  if(a==='toMap'){ui.vk.plan=b.id;ui.from=null;setMode('v');setTool('bld');toast('Clique sur la carte pour poser « '+b.name+' »');return}
  if(a==='regen'){regenBuilding();return}
}
function armed(btn,txt){ // confirmation en deux temps, sans dialogue natif
  if(btn.classList.contains('armed'))return true;const o=btn.textContent;btn.classList.add('armed');btn.textContent=txt;setTimeout(()=>{btn.classList.remove('armed');btn.textContent=o},2500);return false}
function dupSel(){const F=CF(),sel=selItems();if(!sel.length)return;snap();const out=[];for(const it of sel){const c=JSON.parse(JSON.stringify(it));c.id=uid();if(c.t==='wall'){c.x1+=1;c.x2+=1;c.y1+=1;c.y2+=1}else{c.x+=1;c.y+=1;if(c.pts)c.pts=c.pts.map(p=>pBouge(p,1,1))}if(c.t==='stair'){c.esc=uid();delete c.auto}F.items.push(c);out.push(c.id)}ui.sel=out;dirty();renderSide();renderOverlay()}
function B_key(e){
  const F=CF(),sel=selItems();const k=e.key;
  if(bdrawOk()){if(k==='Enter'){bFinish();return true}if(k==='Backspace'||k==='Delete'){bRetirer();return true}}
  if(k==='Delete'||k==='Backspace'){if(sel.length){snap();F.items=F.items.filter(i=>!ui.sel.includes(i.id));ui.sel=[];dirty();renderSide();renderOverlay();return true}}
  if((k==='d'||k==='D')&&(e.ctrlKey||e.metaKey)){dupSel();return true}
  if((k==='c'||k==='C')&&(e.ctrlKey||e.metaKey)){clip=sel.map(i=>JSON.parse(JSON.stringify(i)));toast(clip.length+' élément(s) copié(s)');return true}
  if((k==='v'||k==='V')&&(e.ctrlKey||e.metaKey)){if(clip.length){snap();const out=[];for(const c0 of clip){const c=JSON.parse(JSON.stringify(c0));c.id=uid();if(c.t==='wall'){c.x1+=1;c.x2+=1;c.y1+=1;c.y2+=1}else{c.x+=1;c.y+=1;if(c.pts)c.pts=c.pts.map(p=>pBouge(p,1,1))}if(c.t==='stair'){c.esc=uid();delete c.auto}F.items.push(c);out.push(c.id)}ui.sel=out;dirty();renderSide();renderOverlay()}return true}
  if((k==='a'||k==='A')&&(e.ctrlKey||e.metaKey)){ui.sel=F.items.map(i=>i.id);renderSide();renderOverlay();return true}
  if((k==='r'||k==='R')&&sel.length>1){snap();const b=grBoite(sel),o=sel.map(i=>JSON.parse(JSON.stringify(i))),ang=e.shiftKey?-90:90;
    const au={autres:grAutresEtages()};
    sel.forEach((it,i)=>grTourner(it,o[i],b.cx,b.cy,rad(ang)));grTousEtages(au,(it,q)=>grTourner(it,q,b.cx,b.cy,rad(ang)));
    dirty();renderCanvas();renderOverlay();renderSide();return true}
  if(k==='r'||k==='R'){if(sel.length){snap();sel.forEach(i=>{if(i.t==='furn')i.r=((i.r||0)+90)%360;else if(i.t==='stair'){const o=['n','e','s','w'];i.dir=o[(o.indexOf(i.dir)+1)%4]||'n'}else if(i.t==='door'||i.t==='win'){}});dirty();renderOverlay();renderSide()}else if(ui.tool==='furn'){ui.furnRot=((ui.furnRot||0)+90)%360;renderOverlay();renderSide()}return true}
  if(k.startsWith('Arrow')&&sel.length){e.preventDefault();const st=e.shiftKey?1:ui.snap;const dx=k==='ArrowLeft'?-st:k==='ArrowRight'?st:0,dy=k==='ArrowUp'?-st:k==='ArrowDown'?st:0;snap();sel.forEach(i=>{if(i.t==='wall'){i.x1+=dx;i.x2+=dx;i.y1+=dy;i.y2+=dy}else{i.x=fx(i.x+dx);i.y=fx(i.y+dy);if(i.pts)i.pts=i.pts.map(p=>[fx(p[0]+dx),fx(p[1]+dy)])}});dirty();renderOverlay();return true}
  return false}
