/* ====== vue : zoom / déplacement ====== */
const cv=$('#cv'),world=$('#world'),content=$('#content'),overlay=$('#overlay');
const U=()=>ui.mode==='b'?BU:ui.mode==='w'?1:VU;     // pixels par mètre
function applyView(){const v=ui.view;world.setAttribute('transform',`translate(${fx(v.x)} ${fx(v.y)}) scale(${v.k})`);const tc=$('#tcv');if(tc){tc.style.display=ui.mode==='w'?'block':'none';tc.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.k})`}$('#zLbl').textContent=Math.round(v.k*100)+'%'}
function evPx(e){const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
function toWorld(e){const[x,y]=evPx(e);const v=ui.view;return[(x-v.x)/v.k,(y-v.y)/v.k]}   // px monde
function toM(e){const[x,y]=toWorld(e);return[x/U(),y/U()]}                                  // mètres
function zoomAt(px,py,f){ui.userView=true;const v=ui.view;const k=clamp(v.k*f,.08,ui.mode==='w'?3.5:8);const wx=(px-v.x)/v.k,wy=(py-v.y)/v.k;v.k=k;v.x=px-wx*k;v.y=py-wy*k;applyView()}
function fit(){if(prOn())return;ui.userView=false;const b=ui.mode==='b'?B_bounds():ui.mode==='w'?W_bounds():V_bounds();const r=cv.getBoundingClientRect();if(!b||!r.width)return;const pad=50;const k=clamp(Math.min((r.width-pad*2)/Math.max(1,b.x1-b.x0),(r.height-pad*2)/Math.max(1,b.y1-b.y0)),.1,3);ui.view={k,x:(r.width-(b.x1-b.x0)*k)/2-b.x0*k,y:(r.height-(b.y1-b.y0)*k)/2-b.y0*k};applyView()}
cv.addEventListener('wheel',e=>{e.preventDefault();const[x,y]=evPx(e);if(e.ctrlKey||!e.shiftKey&&Math.abs(e.deltaY)>=1)zoomAt(x,y,Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)));},{passive:false});
const ptrs=new Map();let pan=null,pinch=null,drag=null,lastDown=null,dblNext=false;
cv.addEventListener('pointerdown',e=>{
  cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),cx:(a[0]+b[0])/2,cy:(a[1]+b[1])/2};drag&&MODE().cancel&&MODE().cancel();drag=null;pan=null;return}
  if(e.button===1||ui.space||ui.tool==='pan'){startPan(e);return}
  if(e.button!==0)return;
  {const now=performance.now();dblNext=!!(lastDown&&now-lastDown.t<420&&Math.hypot(e.clientX-lastDown.x,e.clientY-lastDown.y)<9);lastDown=dblNext?null:{t:now,x:e.clientX,y:e.clientY}}
  const m=MODE();drag=m.down(e)?{}:null;if(!drag)startPan(e);});
function startPan(e){pan={x:e.clientX,y:e.clientY,vx:ui.view.x,vy:ui.view.y};cv.classList.add('pan')}
cv.addEventListener('pointermove',e=>{
  if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(pinch&&ptrs.size>=2){const[a,b]=[...ptrs.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);const r=cv.getBoundingClientRect();zoomAt((a[0]+b[0])/2-r.left,(a[1]+b[1])/2-r.top,d/pinch.d);ui.view.x+=(a[0]+b[0])/2-pinch.cx;ui.view.y+=(a[1]+b[1])/2-pinch.cy;pinch.d=d;pinch.cx=(a[0]+b[0])/2;pinch.cy=(a[1]+b[1])/2;applyView();return}
  if(pan){ui.userView=true;ui.view.x=pan.vx+e.clientX-pan.x;ui.view.y=pan.vy+e.clientY-pan.y;applyView();return}
  const m=toM(e);$('#coord').textContent=ui.mode==='w'?wKm(m[0])+' ; '+wKm(m[1])+' km':fx(m[0])+' ; '+fx(m[1])+' m';
  MODE().move(e,!!drag);});
const endP=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;const dn=dblNext;dblNext=false;
  if(pan){const still=Math.hypot(e.clientX-pan.x,e.clientY-pan.y)<4;pan=null;cv.classList.remove('pan');if(dn&&still&&MODE().dbl)MODE().dbl(e);return}
  if(drag){drag=null;MODE().up(e);if(dn&&MODE().dbl)MODE().dbl(e)}};
cv.addEventListener('pointerup',endP);cv.addEventListener('pointercancel',endP);
cv.addEventListener('contextmenu',e=>{e.preventDefault();MODE().ctx&&MODE().ctx(e)});
$('#zIn').onclick=()=>{const r=cv.getBoundingClientRect();zoomAt(r.width/2,r.height/2,1.25)};
$('#zOut').onclick=()=>{const r=cv.getBoundingClientRect();zoomAt(r.width/2,r.height/2,.8)};
$('#zFit').onclick=fit;
