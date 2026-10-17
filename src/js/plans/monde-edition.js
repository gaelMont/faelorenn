/* ====== cartes du monde : édition ====== */
Object.assign(IC,{
 brush:'<path d="M18 4l2 2-9 9-3 1 1-3z"/><path d="M5 20c2 0 3-1 3-3"/>',
 realm:'<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>',
 city:'<rect x="5" y="10" width="14" height="10"/><path d="M5 10V7h3v3M16 10V7h3v3M10 20v-5h4v5"/>',
 zoom:'<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/>'});
const WTOOLS=[['sel','Choisir'],['pan','Main'],['brush','Relief'],['realm','Royaume'],['river','Rivière'],['road','Route'],['city','Lieu'],['label','Texte'],['zoom','Zoom'],['erase','Gomme'],['mesure','Mesurer']];
ui.wb={mode:'monte',r:7,s:.6};
ui.wk={city:'ville',label:'pays',road:'route',rc:0};
ui.wgen={type:'continent',land:'moyen',climate:'tempere',realms:5,places:'moyen',rivers:'moyen',seed:Math.floor(Math.random()*99999)+1};
let wg=null,wdraw=null;
const CW=()=>P.worlds.find(w=>w.id===P.curW);
const wsel=()=>{const w=CW();return ui.sel.map(id=>w.items.find(i=>i.id===id)).filter(Boolean)};
const wAdd=it=>{it.id=uid();CW().items.push(it);return it};
const wTol=()=>9/ui.view.k;
const canEnter=c=>!POIK.includes(c.k)&&c.k!=='portail';
const wKm=v=>{const k=CW().kmu*v;return k<1?fx(k):k<20?Math.round(k*10)/10:Math.round(k)};
const fmtKm=n=>Math.round(n).toLocaleString('fr-BE');
function wChain(w){const ch=[w];let c=w,t=0;while(c.parent&&t++<8){const p=P.worlds.find(x=>x.id===c.parent.id);if(!p)break;ch.unshift(p);c=p}return ch}
const wDepth=w=>wChain(w).length-1;
const wKids=w=>P.worlds.filter(x=>x.parent&&x.parent.id===w.id);
const wLabel=w=>'  '.repeat(wDepth(w))+w.name+' · '+scaleName(w.kmu);
function wCrumbs(){
  const w=CW(),ch=wChain(w),kids=wKids(w);
  let h=ch.map((x,i)=>i===ch.length-1?`<span class="chip" aria-pressed="true">${esc(x.name)}</span>`:`<button class="chip" data-wgo="${x.id}">${esc(x.name)}</button><span class="hint">›</span>`).join('');
  if(kids.length)h+=`<span class="hint" style="margin-left:8px">Détails :</span>`+kids.slice(0,6).map(k=>`<button class="chip" data-wgo="${k.id}" title="${esc(scaleName(k.kmu))}">▾ ${esc(k.name)}</button>`).join('');
  return h+`<span class="hint" style="margin-left:auto">${scaleName(w.kmu)} · ${fmtKm(MW*w.kmu)} × ${fmtKm(MH*w.kmu)} km</span>`}
function goWorld(id){const w=P.worlds.find(x=>x.id===id);if(!w)return;P.curW=id;ui.sel=[];wdraw=null;wg=null;save();renderAll();fit()}
$('#floorbar').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.wgo){goWorld(t.dataset.wgo);return}
  if(t.dataset.act==='backW'){const f=ui.fromW;if(!f)return;const w=P.worlds.find(x=>x.id===f.w);ui.fromW=null;if(!w)return;P.curW=w.id;setMode('w');ui.sel=[f.id];renderSide();renderOverlay()}});
/* ---- sélection ---- */
function wHandleAt(it,m){
  const t=wTol()*1.3;
  if(it.pts){for(let i=0;i<it.pts.length;i++)if(Math.hypot(it.pts[i][0]-m[0],it.pts[i][1]-m[1])<t)return 'v'+i;
    if(it.t==='realm'){const L=realmLab(it);if(Math.hypot(L[0]-m[0],L[1]-m[1])<t)return 'lab'}}
  return null}
function sharedVerts(w,pts,skip){ // sommets des autres royaumes confondus avec ceux de pts
  const out=[];for(const r of w.items){if(r.t!=='realm'||skip.includes(r))continue;r.pts.forEach((q,i)=>{if(pts.some(p=>Math.hypot(p[0]-q[0],p[1]-q[1])<.8))out.push({it:r,i,o:[q[0],q[1]]})})}return out}
function delVertex(w,it,i){
  const min=it.t==='realm'?3:2;if(it.pts.length<=min){toast('Il faut garder au moins '+min+' points');return false}
  const q=it.pts[i];snap();
  if(it.t==='realm'){const sh=sharedVerts(w,[q],[it]);const owners=new Set(sh.map(x=>x.it));
    if(owners.size>=2){ // jonction de 3 royaumes ou plus : tous les contours se rabattent sur le même sommet voisin
      const m0=it.pts.length,pv0=it.pts[(i-1+m0)%m0],nx0=it.pts[(i+1)%m0],T=Math.hypot(q[0]-pv0[0],q[1]-pv0[1])<=Math.hypot(q[0]-nx0[0],q[1]-nx0[1])?pv0:nx0,tg=[T[0],T[1]];
      it.pts[i]=tg.slice();sh.forEach(x=>{x.it.pts[x.i]=tg.slice()});
      [it,...owners].forEach(r=>{r.pts=r.pts.filter((pt,k,arr)=>!(arr.length>3&&Math.hypot(pt[0]-arr[(k+1)%arr.length][0],pt[1]-arr[(k+1)%arr.length][1])<.01))});
      return true}}
  if(it.t==='realm'){const by=new Map();sharedVerts(w,[q],[it]).forEach(s=>{if(!by.has(s.it))by.set(s.it,new Set());by.get(s.it).add(s.i)});
    by.forEach((set,r)=>{const rest=r.pts.filter((_,k)=>!set.has(k));if(rest.length>=3)r.pts=rest})}
  const m=it.pts.length,pv=it.pts[(i-1+m)%m],nx=it.pts[(i+1)%m];
  it.pts.splice(i,1);
  if(it.t==='realm'){const dx=nx[0]-pv[0],dy=nx[1]-pv[1],L2=dx*dx+dy*dy||1;
    for(const r of w.items){if(r.t!=='realm'||r===it)continue;r.pts=r.pts.map(p=>{const d1=dseg(p[0],p[1],pv[0],pv[1],q[0],q[1]).d,d2=dseg(p[0],p[1],q[0],q[1],nx[0],nx[1]).d;if(Math.min(d1,d2)>2.5)return p;const t=clamp(((p[0]-pv[0])*dx+(p[1]-pv[1])*dy)/L2,0,1);return[fx(pv[0]+dx*t),fx(pv[1]+dy*t)]})}}
  return true}
function insertShared(w,it,i,pt){
  if(it.t!=='realm')return;const n=it.pts.length,a=it.pts[i],b=it.pts[(i+1)%n],near=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1])<.8;
  for(const s of w.items){if(s.t!=='realm'||s===it)continue;const m=s.pts.length;for(let k=0;k<m;k++){const c=s.pts[k],d=s.pts[(k+1)%m];if((near(c,a)&&near(d,b))||(near(c,b)&&near(d,a))){s.pts.splice(k+1,0,[pt[0],pt[1]]);break}}}}
function weldRealms(w){
  const R=w.items.filter(r=>r.t==='realm');if(R.length<2)return 0;let n=0;const reg=[];
  for(const r of R)r.pts=r.pts.map(p=>{const q=reg.find(z=>Math.hypot(z[0]-p[0],z[1]-p[1])<3.5);if(q){if(q[0]!==p[0]||q[1]!==p[1])n++;return[q[0],q[1]]}reg.push(p);return p});
  for(const A of R){const out=[],m=A.pts.length;
    for(let k=0;k<m;k++){const a=A.pts[k],b=A.pts[(k+1)%m];out.push(a);const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1,ins=[];
      for(const B of R){if(B===A)continue;for(const v of B.pts){const t=((v[0]-a[0])*dx+(v[1]-a[1])*dy)/L2;if(t<=.02||t>=.98)continue;const px=a[0]+dx*t,py=a[1]+dy*t;if(Math.hypot(v[0]-px,v[1]-py)<1.2&&Math.hypot(v[0]-a[0],v[1]-a[1])>.8&&Math.hypot(v[0]-b[0],v[1]-b[1])>.8&&!ins.some(z=>Math.hypot(z[1][0]-v[0],z[1][1]-v[1])<.8))ins.push([t,[v[0],v[1]]])}}
      ins.sort((p,q)=>p[0]-q[0]).forEach(z=>{out.push(z[1]);n++})}
    A.pts=out}
  return n}
function villageKind(v){return v.W>=520?'ville':v.W>=360?'village':'hameau'}
function placeVillage(id,x,y){
  const w=CW(),v=P.villages.find(q=>q.id===id);if(!v)return;snap();
  let c=w.items.find(i=>i.t==='city'&&i.link===id);
  if(c){c.x=fx(x);c.y=fx(y);toast('« '+v.name+' » déplacé sur la carte')}
  else{c=wAdd({t:'city',k:villageKind(v),x:fx(x),y:fx(y),name:v.name,link:id});toast('« '+v.name+' » placé sur la carte')}
  ui.sel=[c.id];ui.wk.vil=null;ui.tool='sel';refreshLocs();save();renderAll()}
/* situation d'un village : royaumes (de la carte et des cartes parentes), distance au lieu le plus proche */
function refreshLocs(){
  const found={};
  for(const w of P.worlds)for(const c of w.items){if(c.t==='city'&&c.link&&(!found[c.link]||w.kmu<found[c.link].w.kmu))found[c.link]={w,c}}
  for(const v of P.villages){const f=found[v.link||v.id];if(!f){delete v.where;continue}
    const{w,c}=f;let x=c.x,y=c.y,cur=w;const names=[];let t=0;
    while(cur&&t++<8){const rs=cur.items.filter(i=>i.t==='realm'&&inPoly(x,y,i.pts)).sort((a,b)=>polyArea(a.pts)-polyArea(b.pts));if(rs[0]&&rs[0].name&&!names.includes(rs[0].name))names.unshift(rs[0].name);
      if(!cur.parent)break;const par=P.worlds.find(q=>q.id===cur.parent.id);if(!par)break;const b=cur.parent.box;x=b.x+x/MW*b.w;y=b.y+y/MH*b.h;cur=par}
    const near=w.items.filter(i=>i.t==='city'&&i!==c&&['capitale','ville','port'].includes(i.k)).map(i=>[i,Math.hypot(i.x-c.x,i.y-c.y)*w.kmu]).sort((a,b)=>a[1]-b[1])[0];
    const km=n=>{const k=w.kmu*n;return k<20?Math.round(k*10)/10:Math.round(k)};
    const parts=[names.length?names.join(' › '):'hors de tout royaume',`carte « ${w.name} » (${scaleName(w.kmu)})`];
    if(near)parts.push(`à ${near[1]<20?Math.round(near[1]*10)/10:Math.round(near[1])} km de ${near[0].name}`);
    parts.push(`position ${km(c.x)} ; ${km(c.y)} km depuis le coin nord-ouest`);
    v.where={map:w.id,city:c.id,realm:names.length?names[names.length-1]:'',text:parts.join(', ')}}}
function villageWhere(V){
  refreshLocs();
  return V.where?`<h3>Situation</h3><p class="hint" style="color:var(--ink)">${esc(V.where.text)}.</p><div class="row"><button class="btn sm" data-act="showOnMap">Voir sur la carte du monde ▸</button></div>`
   :`<h3>Situation</h3><p class="hint">Ce village n'est pas encore placé sur une carte du monde. Dans « Mondes », glisse-le depuis la liste « Mes villages ».</p>`}
function wHit(m){
  const w=CW(),t=wTol(),it=w.items;
  for(const c of it.filter(i=>i.t==='city').reverse())if(Math.hypot(c.x-m[0],c.y-m[1])<t*1.3)return c;
  for(const l of it.filter(i=>i.t==='label').reverse()){const wd=String(l.text).length*(l.size||12)*.3,hh=(l.size||12)*.6,a=rad(l.a||0),dx=m[0]-l.x,dy=m[1]-l.y;
    const rx=dx*Math.cos(-a)-dy*Math.sin(-a),ry=dx*Math.sin(-a)+dy*Math.cos(-a);if(Math.abs(rx)<wd+t*.4&&Math.abs(ry)<hh+t*.4)return l}
  for(const r of it.filter(i=>i.t==='river'||i.t==='road'))if(dpoly(m[0],m[1],r.pts,false).d<t)return r;
  const rs=it.filter(i=>i.t==='realm').filter(r=>{if(dpoly(m[0],m[1],r.pts,true).d<t*1.2)return true;if(!r.name||r.hideName)return false;const L=realmLab(r),fs=clamp(Math.sqrt(polyArea(r.pts))/9,11,34);return Math.abs(m[0]-L[0])<r.name.length*fs*.38&&Math.abs(m[1]-L[1])<fs});
  return rs.sort((a,b)=>polyArea(a.pts)-polyArea(b.pts))[0]||null}
const kidAt=m=>{const w=CW();return wKids(w).filter(c=>{const b=c.parent.box;return m[0]>=b.x&&m[0]<=b.x+b.w&&m[1]>=b.y&&m[1]<=b.y+b.h}).sort((a,b)=>a.parent.box.w-b.parent.box.w)[0]};
/* ---- pinceau de relief ---- */
function brushStamp(m){
  const w=CW(),g=grid(w),gw=w.gw,gh=w.gh,R=ui.wb.r,s=ui.wb.s,mode=ui.wb.mode,cx=m[0]/wcw(w),cy=m[1]/wch(w);
  const i0=Math.max(0,Math.floor(cx-R)),i1=Math.min(gw-1,Math.ceil(cx+R)),j0=Math.max(0,Math.floor(cy-R)),j1=Math.min(gh-1,Math.ceil(cy+R));
  const rnd=v=>clamp(Math.floor(v+Math.random()),0,255);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const d=Math.hypot(i-cx,j-cy);if(d>R)continue;const f=sm01(1-d/R),k=j*gw+i;let h=g.h[k],mm=g.m[k];
    if(mode==='monte')h+=11*s*f;
    else if(mode==='creuse')h-=11*s*f;
    else if(mode==='terre'){const T=SEA+9;if(h<T)h+=(T-h)*f*s*.9}
    else if(mode==='mer'){const T=SEA-28;if(h>T)h-=(h-T)*f*s*.9}
    else if(mode==='lisse'){let a=0,n=0;for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=i+di,y=j+dj;if(x>=0&&y>=0&&x<gw&&y<gh){a+=g.h[y*gw+x];n++}}h+=(a/n-h)*f*s*.7}
    else if(mode==='humide')mm+=11*s*f;
    else if(mode==='sec')mm-=11*s*f;
    g.h[k]=rnd(h);g.m[k]=rnd(mm)}
  w.tv=++TVC;g.tv=w.tv}
function brushAt(m){
  const w=CW(),R=ui.wb.r*wcw(w);
  if(wg.last){const dx=m[0]-wg.last[0],dy=m[1]-wg.last[1],d=Math.hypot(dx,dy),st=Math.max(R/3,1.5);if(d>=st){const n=Math.floor(d/st);for(let i=1;i<=n;i++)brushStamp([wg.last[0]+dx/d*st*i,wg.last[1]+dy/d*st*i]);wg.last=[wg.last[0]+dx/d*st*n,wg.last[1]+dy/d*st*n]}}
  else{brushStamp(m);wg.last=m}
  if(!wg.raf)wg.raf=requestAnimationFrame(()=>{if(wg){wg.raf=0;renderCanvas();renderOverlay()}})}
/* ---- création ---- */
function wFinish(close){
  const t=ui.tool;if(!wdraw)return;const pts=wdraw.pts;wdraw=null;
  if(pts.length<(t==='realm'?3:2)){renderOverlay();return}
  snap();let it;
  if(t==='realm')it=wAdd({t:'realm',pts,name:WNM.realm(Math.random),color:RCOL[(ui.wk.rc++)%RCOL.length]});
  else if(t==='river')it=wAdd({t:'river',pts,w:1.4});
  else it=wAdd({t:'road',pts,k:ui.wk.road});
  fixOverlaps(CW(),it.id);ui.sel=[it.id];setTool('sel');dirty();renderSide();renderOverlay()}
function zoomBox(w,x0,y0,m){
  const dx=m[0]-x0,dy=m[1]-y0;let bw=Math.max(Math.abs(dx),Math.abs(dy)*MW/MH);bw=Math.min(bw,MW);const bh=bw*MH/MW;
  let bx=dx>=0?x0:x0-bw,by=dy>=0?y0:y0-bh;bx=clamp(bx,0,MW-bw);by=clamp(by,0,MH-bh);return{x:bx,y:by,w:bw,h:bh}}
function askZoom(box){
  const w=CW();const cx=box.x+box.w/2,cy=box.y+box.h/2;
  const near=w.items.filter(i=>i.t==='city'&&i.x>=box.x&&i.x<=box.x+box.w&&i.y>=box.y&&i.y<=box.y+box.h).sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy))[0];
  const nk=w.kmu*box.w/MW;
  modal(`<h2>Zoom sur cette zone</h2><p class="hint">Zone de ${fmtKm(box.w*w.kmu)} × ${fmtKm(box.h*w.kmu)} km. Une carte « ${scaleName(nk)} » est créée : relief affiné, lieux, rivières, routes et royaumes de la zone repris, nouveaux hameaux ajoutés.</p><div class="row"><label>Nom</label><input type="text" id="zmName" value="${esc(near?near.name+' et environs':w.name+' (détail)')}"></div><div class="row"><button class="btn primary" id="zmGo">Créer et ouvrir</button><button class="btn" onclick="closeModal()">Annuler</button></div>`);
  $('#zmGo').onclick=()=>{snap();const c=zoomInto(w,box,$('#zmName').value.trim()||'Carte détaillée');P.curW=c.id;ui.sel=[];ui.tool='sel';closeModal();save();renderAll();fit()}}
/* ---- glisser-déposer d'un village sur la carte ---- */
side.addEventListener('dragstart',e=>{const d=e.target.closest&&e.target.closest('[data-wvil]');if(!d||ui.mode!=='w')return;e.dataTransfer.setData('text/plain','vil:'+d.dataset.wvil);e.dataTransfer.effectAllowed='copy'});
cv.addEventListener('dragover',e=>{if(ui.mode==='w'&&ui.edit){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
cv.addEventListener('drop',e=>{if(ui.mode!=='w'||!ui.edit)return;e.preventDefault();const t=e.dataTransfer.getData('text/plain')||'';if(!t.startsWith('vil:'))return;const m=toM(e);placeVillage(t.slice(4),clamp(m[0],0,MW),clamp(m[1],0,MH))});
/* ---- mode de souris ---- */
const WM={
 down(e){
  const m=toM(e),t=ui.tool,w=CW();
  if(t==='mesure'){wMesDebut(m);wg={t:'mesure'};renderOverlay();renderSide();return true}
  if(t==='sel'){
    const sel=wsel();
    if(sel.length===1){const hd=wHandleAt(sel[0],m);
      if(hd){const it=sel[0];
        if(hd[0]==='v'&&e.altKey){const i=+hd.slice(1);if(delVertex(w,it,i)){fixOverlaps(w,it.id);dirty();renderOverlay()}return true}
        snap();wg={t:hd==='lab'?'lab':'vtx',it,h:hd,links:hd[0]==='v'&&it.t==='realm'?sharedVerts(w,[it.pts[+hd.slice(1)]],[it]):[]};return true}}
    const hit=wHit(m);
    if(!hit){if(!e.shiftKey){ui.sel=[];renderSide();renderOverlay()}return false}
    if(e.shiftKey)ui.sel=ui.sel.includes(hit.id)?ui.sel.filter(i=>i!==hit.id):[...ui.sel,hit.id];else if(!ui.sel.includes(hit.id))ui.sel=[hit.id];
    const items=wsel();const rl=items.filter(i=>i.t==='realm');wg={t:'move',m0:m,items,orig:items.map(i=>JSON.parse(JSON.stringify(i))),moved:false,extra:rl.length?sharedVerts(w,rl.flatMap(r=>r.pts),rl):[]};renderSide();renderOverlay();return true}
  if(t==='brush'){snap();wg={t:'brush',last:null};ui.wPreview=true;brushAt(m);return true}
  if(['realm','river','road'].includes(t)){
    let p=[fx(m[0]),fx(m[1])];
    if(t==='realm'){let bd=wTol()*1.5,bq=null;w.items.forEach(r=>{if(r.t==='realm')r.pts.forEach(q=>{const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<bd){bd=d;bq=q}})});if(bq)p=[bq[0],bq[1]]}
    if(!wdraw)wdraw={pts:[p]};else{const f=wdraw.pts[0];if(t==='realm'&&wdraw.pts.length>=3&&Math.hypot(f[0]-p[0],f[1]-p[1])<wTol()*1.8){wFinish(true);return true}wdraw.pts.push(p)}
    renderOverlay();return true}
  if(t==='city'&&ui.wk.vil){placeVillage(ui.wk.vil,m[0],m[1]);return true}
  if(t==='city'){snap();const k=ui.wk.city,r=Math.random;const c=wAdd({t:'city',k,x:fx(m[0]),y:fx(m[1]),name:POIK.includes(k)||k==='portail'?WNM.poi(r,k):NM.village(r)});ui.sel=[c.id];setTool('sel');dirty();renderSide();return true}
  if(t==='label'){snap();const k=ui.wk.label,r=Math.random;const txt={pays:WNM.realm(r),region:'Région',mer:WNM.mer(r),montagne:WNM.monts(r),lieu:'Lieu'}[k];
    const l=wAdd({t:'label',k,x:fx(m[0]),y:fx(m[1]),text:txt,size:{pays:26,region:15,mer:18,montagne:13,lieu:11}[k],a:0});ui.sel=[l.id];setTool('sel');dirty();renderSide();return true}
  if(t==='zoom'){wg={t:'zoom',x0:m[0],y0:m[1],box:null};return true}
  if(t==='erase'){const h=wHit(m);if(h){snap();w.items=w.items.filter(i=>i!==h);ui.sel=ui.sel.filter(i=>i!==h.id);dirty();renderSide();renderOverlay()}return true}
  return false},
 move(e,dragging){
  const m=toM(e);ui.hover=m;const w=CW();
  if(!wg){renderOverlay();return}
  if(wg.t==='mesure'){wMesTirer(m);renderOverlay();renderSideLight();return}
  if(wg.t==='brush'){brushAt(m);renderOverlay();return}
  if(wg.t==='zoom'){wg.box=zoomBox(w,wg.x0,wg.y0,m);renderOverlay();return}
  if(wg.t==='move'){const dx=m[0]-wg.m0[0],dy=m[1]-wg.m0[1];if(!wg.moved&&Math.hypot(dx,dy)>1.5/ui.view.k){snap();wg.moved=true}
    if(!wg.moved)return;wg.items.forEach((it,i)=>{const o=wg.orig[i];if(it.pts)it.pts=o.pts.map(p=>[fx(p[0]+dx),fx(p[1]+dy)]);else{it.x=fx(o.x+dx);it.y=fx(o.y+dy)}if(o.lx!=null){it.lx=fx(o.lx+dx);it.ly=fx(o.ly+dy)}});(wg.extra||[]).forEach(q=>{q.it.pts[q.i]=[fx(q.o[0]+dx),fx(q.o[1]+dy)]});dirty();renderOverlay()}
  else if(wg.t==='vtx'){const i=+wg.h.slice(1),p=[fx(m[0]),fx(m[1])];wg.it.pts[i]=p;(wg.links||[]).forEach(q=>{q.it.pts[q.i]=[p[0],p[1]]});dirty();renderOverlay()}
  else if(wg.t==='lab'){wg.it.lx=fx(m[0]);wg.it.ly=fx(m[1]);dirty();renderOverlay()}},
 up(e){
  const w=CW();
  if(wg&&wg.t==='brush'){cancelAnimationFrame(wg.raf);ui.wPreview=false;commitGrid(w);save();wg=null;renderCanvas();renderOverlay();return}
  if(wg&&(wg.t==='vtx'||wg.t==='move')){const win=wg.t==='vtx'?wg.it.id:wg.items[0]&&wg.items[0].id;wg=null;if(fixOverlaps(w,win)){save();renderCanvas();renderOverlay();renderSide()}return}
  if(wg&&wg.t==='mesure'){wg=null;renderOverlay();renderSide();return}
  if(wg&&wg.t==='zoom'){const b=wg.box;wg=null;renderOverlay();if(b&&b.w>=MW*.04)askZoom(b);return}
  wg=null;renderOverlay();renderSideLight()},
 cancel(){if(wg&&wg.t==='brush'){cancelAnimationFrame(wg.raf);ui.wPreview=false;commitGrid(CW());save();renderCanvas()}wg=null;renderOverlay()},
 dbl(e){
  const m=toM(e),w=CW();
  if(wdraw){if(wdraw.pts.length>1)wdraw.pts.pop();wFinish(false);return}
  if(ui.tool!=='sel')return;
  const sel=wsel();
  if(sel.length===1&&sel[0].pts){const it=sel[0];const hv=wHandleAt(it,m);if(hv&&hv[0]==='v'){if(delVertex(w,it,+hv.slice(1))){fixOverlaps(w,it.id);dirty();renderOverlay();renderSide()}return}
    const r=dpoly(m[0],m[1],it.pts,it.t==='realm');if(r.d<wTol()*2){snap();const pt=[fx(r.x),fx(r.y)];insertShared(w,it,r.i,pt);it.pts.splice(r.i+1,0,pt);dirty();renderOverlay();return}}
  const h=wHit(m);
  if(h&&(h.t==='city'||h.t==='realm')){ui.sel=[h.id];W_act('enter');return}
  if(!h){const k=kidAt(m);if(k)goWorld(k.id)}},
 ctx(e){if(wdraw){wdraw.pts.pop();if(!wdraw.pts.length)wdraw=null;renderOverlay()}}
};
/* ---- surcouche ---- */
function wOverlay(){
  const w=CW(),k=1/ui.view.k;let s='';
  for(const c of wKids(w)){const b=c.parent.box;s+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="rgba(255,255,255,.04)" stroke="var(--accent)" stroke-width="${1.3*k}" stroke-dasharray="${5*k} ${4*k}" opacity=".75"/><text x="${b.x+4*k}" y="${b.y+12*k}" font-family="${FONT}" font-size="${11*k}" fill="var(--accent)" stroke="rgba(244,236,216,.9)" stroke-width="${3*k}" paint-order="stroke">▾ ${esc(c.name)}</text>`}
  const sel=wsel();
  for(const it of sel){
    if(it.t==='city')s+=`<circle cx="${it.x}" cy="${it.y}" r="${11*k}" fill="none" stroke="var(--accent)" stroke-width="${2*k}" stroke-dasharray="${5*k} ${3*k}"/>`;
    else if(it.t==='label'){const wd=String(it.text).length*(it.size||12)*.3+4,hh=(it.size||12)*.7;s+=`<rect x="${-wd}" y="${-hh}" width="${wd*2}" height="${hh*1.4}" transform="translate(${it.x} ${it.y}) rotate(${it.a||0})" fill="none" stroke="var(--accent)" stroke-width="${1.6*k}" stroke-dasharray="${5*k} ${3*k}"/>`}
    else if(it.pts){s+=`<path d="${pathD(smooth(it.pts,5,it.t==='realm'),it.t==='realm')}" fill="none" stroke="var(--accent)" stroke-width="${3*k}" opacity=".6"/>`;
      if(ui.edit&&sel.length===1){it.pts.forEach(p=>s+=`<rect x="${p[0]-4.5*k}" y="${p[1]-4.5*k}" width="${9*k}" height="${9*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.6*k}"/>`);
        if(it.t==='realm'){const L=realmLab(it);s+=`<circle cx="${L[0]}" cy="${L[1]}" r="${5.5*k}" fill="var(--accent)" stroke="#fff" stroke-width="${1.4*k}"/>`}}}}
  if(wdraw){const pts=wdraw.pts,all=ui.hover?[...pts,ui.hover]:pts;
    s+=`<path d="${pathD(all)}" fill="none" stroke="var(--accent)" stroke-width="${2.4*k}" stroke-dasharray="${5*k} ${3*k}"/>`+pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${(i===0?5.5:3.5)*k}" fill="${i===0?'var(--accent)':'#fff'}" stroke="var(--accent)" stroke-width="${1.4*k}"/>`).join('')}
  if(wg&&wg.t==='zoom'&&wg.box){const b=wg.box;s+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="rgba(255,255,255,.12)" stroke="var(--accent)" stroke-width="${2*k}" stroke-dasharray="${6*k} ${4*k}"/><text x="${b.x+6*k}" y="${b.y+16*k}" font-family="${FONT}" font-size="${13*k}" font-weight="700" fill="var(--accent)" stroke="rgba(244,236,216,.9)" stroke-width="${3*k}" paint-order="stroke">${fmtKm(b.w*w.kmu)} km de large</text>`}
  s+=wCerclesSVG(w,k)+wMesSVG(k);
  if(ui.hover&&!wg){
    if(ui.tool==='brush')s+=`<circle cx="${ui.hover[0]}" cy="${ui.hover[1]}" r="${ui.wb.r*wcw(w)}" fill="rgba(255,255,255,.1)" stroke="var(--accent)" stroke-width="${1.6*k}"/>`;
    else if(ui.tool==='city')s+=`<g opacity=".7">${cityGlyph(ui.wk.city,fx(ui.hover[0]),fx(ui.hover[1]))}</g>`}
  else if(ui.hover&&wg&&wg.t==='brush')s+=`<circle cx="${ui.hover[0]}" cy="${ui.hover[1]}" r="${ui.wb.r*wcw(w)}" fill="none" stroke="var(--accent)" stroke-width="${1.6*k}"/>`;
  overlay.innerHTML=s;updEnter()}
function wEnter(el){
  if(ui.mode!=='w'||ui.tool!=='sel'||wg){el.hidden=true;return}
  const sel=wsel();if(sel.length!==1||!['city','realm'].includes(sel[0].t)||(sel[0].t==='city'&&!canEnter(sel[0]))){el.hidden=true;return}
  const it=sel[0],k=ui.view.k;let x,y,txt;
  if(it.t==='city'){const v=P.villages.find(q=>q.id===it.link);x=it.x;y=it.y-14;txt=v?'Entrer ▸ '+v.name:'Créer la carte du village et entrer ▸'}
  else{const L=realmLab(it),c=P.worlds.find(q=>q.id===it.link);x=L[0];y=L[1]-22;txt=c?'Ouvrir ▸ '+c.name:'Zoom sur ce royaume ▸'}
  el.textContent=txt;el.style.left=(x*k+ui.view.x)+'px';el.style.top=(y*k+ui.view.y)+'px';el.hidden=false}
/* ---- panneau latéral ---- */
function W_side(){
  const w=CW(),sel=wsel();let h='';
  if(sel.length===1)h+=wItemPanel(sel[0]);
  else if(sel.length>1)h+=`<h3>${sel.length} éléments</h3><div class="row"><button class="btn sm" data-act="dup">Dupliquer</button><button class="btn sm danger" data-act="del">Supprimer</button></div>`;
  else h+=wToolPanel();
  h+=wNomsPanneau(w);
  h+=`<h3>Carte</h3><div class="row"><label>Nom</label><input type="text" data-w="name" value="${esc(w.name)}"></div>`;
  h+=`<div class="row"><label>Largeur (km)</label><input type="number" data-w="widthkm" min="1" max="100000" value="${Math.round(MW*w.kmu)}"></div><p class="hint">${scaleName(w.kmu)} · ${fmtKm(MW*w.kmu)} × ${fmtKm(MH*w.kmu)} km. Le zoom crée une carte dont l'échelle suit la zone choisie.</p>`;
  h+=`<div class="row"><label>Climat</label><select data-w="climate">${opt({froid:'Froid',tempere:'Tempéré',chaud:'Chaud'},w.climate||'tempere')}</select></div><div class="row"><label><input type="checkbox" data-w="glyph"${w.glyph!==false?' checked':''}> Dessiner montagnes et arbres</label></div>`;
  const kids=wKids(w),par=w.parent&&P.worlds.find(x=>x.id===w.parent.id);
  h+=`<h3>Hiérarchie</h3>`+(par?`<div class="row"><button class="btn sm" data-wopen="${par.id}">↑ ${esc(par.name)}</button><span class="hint">${scaleName(par.kmu)}</span></div>`:`<p class="hint">Carte de plus haut niveau.</p>`);
  h+=kids.length?`<p class="tag" style="margin:6px 0 4px">Cartes détaillées</p><div style="display:flex;flex-direction:column;gap:4px">`+kids.map(c=>`<button class="btn sm" style="text-align:left" data-wopen="${c.id}">▾ ${esc(c.name)} <span class="hint">${scaleName(c.kmu)}</span></button>`).join('')+`</div>`:`<p class="hint">Outil « Zoom » : trace une zone pour créer une carte plus précise. Un lieu mène à sa carte de village, puis à ses bâtiments.</p>`;
  const G=ui.wgen;
  h+=`<details><summary style="cursor:pointer;margin:14px 0 6px">Générateur de terrain</summary>`;
  h+=`<div class="row"><label>Forme</label><select data-wgen="type">${opt({continent:'Un continent',continents:'Plusieurs continents',pangee:'Pangée',archipel:'Archipel',iles:'Îles dispersées'},G.type)}</select></div>`;
  h+=`<div class="row"><label>Terres</label><select data-wgen="land">${opt({peu:'Peu de terres',moyen:'Moyen',beaucoup:'Beaucoup'},G.land)}</select></div>`;
  h+=`<div class="row"><label>Climat</label><select data-wgen="climate">${opt({froid:'Froid',tempere:'Tempéré',chaud:'Chaud'},G.climate)}</select></div>`;
  h+=`<div class="row"><label>Royaumes</label><input type="number" data-wgen="realms" min="0" max="9" value="${G.realms}"><label style="min-width:0">Lieux</label><select data-wgen="places">${opt({peu:'Rares',moyen:'Moyens',beaucoup:'Nombreux'},G.places)}</select></div>`;
  h+=`<div class="row"><label>Rivières</label><select data-wgen="rivers">${opt({peu:'Rares',moyen:'Moyennes',beaucoup:'Nombreuses'},G.rivers)}</select></div>`;
  h+=`<div class="row"><label>Graine</label><input type="number" data-wgen="seed" value="${G.seed}"><button class="btn sm" data-act="dice" title="Nouvelle graine">Au hasard</button></div>`;
  h+=`<div class="row"><button class="btn primary" data-act="genW">Générer la carte</button><button class="btn sm" data-act="popW" title="Ajoute des hameaux et villages">Peupler</button><button class="btn sm" data-act="nameW">Nom au hasard</button></div><p class="hint">La génération remplace le contenu de cette carte (annulable).</p></details>`;
  h+=`<h3>Mes villages (${P.villages.length})</h3><p class="hint">Glisse un village sur la carte, ou clique-le puis clique la carte. Sa situation (royaume, distance) est alors notée dans le village.</p><div style="display:flex;flex-direction:column;gap:4px">`+P.villages.map(v=>{const here=w.items.some(i=>i.t==='city'&&i.link===v.id);return `<div class="btn sm" draggable="true" data-wvil="${v.id}" style="text-align:left;cursor:grab;white-space:normal" title="Glisser sur la carte">⠿ ${esc(v.name)} <span class="hint">${here?'✓ placé ici':v.where?'placé ailleurs':'non placé'}</span></div>`}).join('')+`</div>`;
  const cs=wLieuxTries(w);
  h+=`<h3>Lieux (${cs.length})</h3>`+(cs.length?`<ul class="legend">`+cs.map(c=>wLigneLieu(c,false)).join('')+`</ul>`:`<p class="hint">Aucun lieu. L'outil « Lieu » en pose.</p>`);
  const rl=w.items.filter(i=>i.t==='realm');
  if(rl.length)h+=`<h3>Royaumes (${rl.length})</h3><ul class="legend">`+rl.map(r=>wLigneRoyaume(r,false)).join('')+`</ul>`;
  h+=`<h3>Notes</h3><textarea data-w="notes" rows="4" placeholder="Histoire, peuples, légendes…">${esc(w.notes||'')}</textarea>`;
  return h}
function wToolPanel(){
  const t=ui.tool,k=ui.wk,b=ui.wb;
  const T={sel:['Sélection','Clique un lieu, un nom de royaume (ou sa frontière), une rivière ou une route. Glisse pour déplacer. Double-clic sur un lieu : entrer dans sa carte. Sur une frontière ou une ligne sélectionnée : double-clic sur la ligne pour ajouter un point, double-clic sur un point (ou Alt+clic) pour le retirer, le voisin suit.'],pan:['Main','Glisse pour déplacer la vue.'],
   brush:['Relief','Peins directement le terrain : montagnes, mers, forêts et déserts (via l\'humidité). Touches [ et ] : taille du pinceau.'],
   realm:['Royaume','Clique les sommets, referme sur le premier point ou appuie sur Entrée. Seule la partie terrestre est colorée.'],river:['Rivière','Clique les points depuis la source, double-clic ou Entrée pour finir.'],road:['Route','Clique les points, double-clic ou Entrée pour finir.'],
   city:['Lieu','Choisis un type puis clique la carte. Chaque ville ou village peut ouvrir sa propre carte de village.'],label:['Texte','Choisis un style puis clique la carte.'],
   mesure:['Mesurer','Glisse d\u2019un point à un autre : la distance s\u2019écrit en kilomètres, et un cercle montre cette distance autour du point de départ. Le pointeur se cale sur un lieu quand il en passe près. Échap efface la mesure.'],
   zoom:['Zoom','Trace un rectangle sur la zone à détailler. Une carte plus précise est créée, avec relief, lieux, rivières, routes et royaumes repris.'],erase:['Gomme','Clique un élément pour le supprimer. Le relief se corrige avec l\'outil Relief.']}[t]||['',''];
  let h=`<h3>${T[0]}</h3><p class="hint">${T[1]}</p>`;
  if(t==='brush'){
    const M=[['monte','Monter','#9a8e7a'],['creuse','Creuser','#6d8fa6'],['terre','Terre','#a8c67c'],['mer','Mer','#88a9c4'],['lisse','Lisser','#cbb98f'],['humide','Humide','#6d9b6c'],['sec','Sec','#d4c27e']];
    h+=`<div class="pal">`+M.map(([a,n,c])=>`<button data-wbm="${a}" aria-pressed="${b.mode===a}"><i style="display:block;width:34px;height:20px;border-radius:4px;background:${c};border:1px solid var(--rule)"></i><span>${n}</span></button>`).join('')+`</div>`;
    h+=`<div class="row"><label>Taille</label><input type="range" data-wb="r" min="2" max="26" value="${b.r}" style="flex:1"></div><div class="row"><label>Force</label><input type="range" data-wb="s" min="0.1" max="1.5" step="0.1" value="${b.s}" style="flex:1"></div>`}
  if(t==='mesure')h+=(wmes?`<p class="hint" style="font-weight:700">${esc(wMesTexte())}</p>`:'')
    +`<div class="row"><button class="btn sm" data-act="mesOff">Effacer la mesure</button></div>`;
  if(t==='road')h+=`<div class="row"><label>Type</label><select data-wk="road">${opt({route:'Route',sentier:'Sentier'},k.road)}</select></div>`;
  if(t==='label')h+=`<div class="row"><label>Style</label><select data-wk="label">${opt({pays:'Pays (majuscules)',region:'Région',mer:'Mer, océan',montagne:'Montagnes',lieu:'Lieu'},k.label)}</select></div>`;
  if(t==='city'&&ui.wk.vil){const v=P.villages.find(q=>q.id===ui.wk.vil);h+=`<p class="hint" style="color:var(--ink)">Placement de « ${esc(v?v.name:'')} » : clique la carte.</p><div class="row"><button class="btn sm" data-act="cancelVil">Annuler</button></div>`}
  else if(t==='city')h+=`<div class="pal">`+Object.keys(CK).map(c=>`<button data-wkset="city|${c}" aria-pressed="${k.city===c}" title="${esc(CK[c])}"><svg viewBox="-12 -12 24 24">${cityGlyph(c,0,0)}</svg><span>${esc(CK[c])}</span></button>`).join('')+`</div>`;
  return h}
function wItemPanel(it){
  const del=`<div class="row"><button class="btn sm" data-act="dup">Dupliquer</button><button class="btn sm danger" data-act="del">Supprimer</button></div>`;let h='';const w=CW();
  if(it.t==='city'){const v=P.villages.find(q=>q.id===it.link);
    h+=`<h3>${esc(CK[it.k]||'Lieu')}</h3>`;
    if(canEnter(it))h+=`<div class="row"><button class="btn primary" data-act="enter" style="flex:1">${v?'Entrer dans le village ▸':'Créer la carte du village et entrer ▸'}</button></div>`;
    h+=fld('Nom','name',it.name||'')+`<div class="row"><label>Type</label><select data-f="k">${opt(CK,it.k)}</select></div><div class="row"><label><input type="checkbox" data-f="hideName"${it.hideName?' checked':''}> Masquer le nom sur la carte</label></div><div class="row"><label>Cercle de repère (km)</label><input type="number" data-f="cercle" min="0" step="1" value="${it.cercle||0}"></div><p class="hint">Zéro : aucun cercle. Sert à poser un lieu à telle distance de celui-ci ; il ne s\u2019imprime pas sur la carte.</p>`;
    h+=`<p class="hint">Position : ${wKm(it.x)} ; ${wKm(it.y)} km depuis le coin nord-ouest.${v?' Village : « '+esc(v.name)+' ».':''}</p><div class="row"><label>Notes</label></div><textarea data-f="note" rows="3" placeholder="Habitants, intrigues, rumeurs…">${esc(it.note||'')}</textarea>`+del}
  else if(it.t==='realm'){const c=P.worlds.find(q=>q.id===it.link);
    h+=`<h3>Royaume</h3><div class="row"><button class="btn primary" data-act="enter" style="flex:1">${c?'Ouvrir la carte détaillée ▸':'Zoom sur ce royaume ▸'}</button></div>`+fld('Nom','name',it.name||'')+`<div class="row"><button class="btn sm" data-act="weld" title="Fait coïncider les sommets voisins de tous les royaumes">Recoller les frontières</button></div><div class="row"><label>Couleur</label><input type="color" data-f="color" value="${esc(/^#[0-9a-f]{6}$/i.test(it.color||'')?it.color:'#c4784f')}"></div><div class="row"><label><input type="checkbox" data-f="hideName"${it.hideName?' checked':''}> Masquer le nom</label></div>`;
    const inside=w.items.filter(i=>i.t==='city'&&inPoly(i.x,i.y,it.pts));
    h+=`<p class="hint">${inside.length} lieux dans ses frontières. Faites glisser le point plein pour déplacer le nom.</p><div class="row"><label>Notes</label></div><textarea data-f="note" rows="3" placeholder="Gouvernement, peuple, tensions…">${esc(it.note||'')}</textarea>`+del}
  else if(it.t==='river')h+=`<h3>Rivière</h3>`+fld('Nom','name',it.name||'')+fld('Épaisseur','w',it.w||1.4,'number','step="0.2" min="0.4" max="6"')+del;
  else if(it.t==='road')h+=`<h3>Route</h3><div class="row"><label>Type</label><select data-f="k">${opt({route:'Route',sentier:'Sentier'},it.k||'route')}</select></div>`+del;
  else if(it.t==='label')h+=`<h3>Texte</h3>`+fld('Texte','text',it.text)+`<div class="row"><label>Style</label><select data-f="k">${opt({pays:'Pays',region:'Région',mer:'Mer, océan',montagne:'Montagnes',lieu:'Lieu'},it.k||'lieu')}</select></div>`+fld('Taille','size',it.size||12,'number','min="6" max="80"')+fld('Angle','a',it.a||0,'number','min="-180" max="180" step="5"')+del;
  return h}
function W_input(el,typing){
  const w=CW(),d=el.dataset;
  if(d.wgen){ui.wgen[d.wgen]=el.type==='number'?(parseInt(el.value)||0):el.value;return}
  if(d.wb){ui.wb[d.wb]=+el.value;renderOverlay();return}
  if(d.wk){ui.wk[d.wk]=el.value;renderSide();return}
  if(d.wnom||d.wnomk){once();const c=wNomsCfg(w);
    if(d.wnom==='t')c.t=clamp(parseFloat(el.value)||1,.5,2.5);
    else{if(el.checked)delete c.off[d.wnomk];else c.off[d.wnomk]=true}
    w.noms={t:c.t,off:c.off};save();renderCanvas();renderSide();return}
  if(d.w){if(typing&&el.tagName==='SELECT')return;once();let v=numOrStr(el);
    if(d.w==='widthkm'){v=+v;if(!(v>0))return;w.kmu=clamp(v,1,100000)/MW;save();renderCanvas();applyView();return}
    w[d.w]=v;save();if(d.w==='name'){fillItemSel();renderFloorbar()}renderCanvas();return}
  if(d.f){const sel=wsel();if(sel.length!==1)return;if(typing&&el.tagName==='SELECT')return;once();const it=sel[0];let v=numOrStr(el);
    if(['w','size','a'].includes(d.f)){if(isNaN(v))return;if(d.f!=='a'&&v<=0)return}
    it[d.f]=v;save();renderCanvas();renderOverlay();if(el.tagName==='SELECT'||el.type==='checkbox')renderSide()}}
function wMakeVillage(c,w){
  const size={capitale:'ville',ville:'bourg',port:'bourg',village:'village'}[c.k]||'hameau';
  const v=mkV(c.name||NM.village(Math.random));const hasRiv=w.items.some(i=>i.t==='river'&&i.pts.some(p=>Math.hypot(p[0]-c.x,p[1]-c.y)<14));
  genVillage(v,{size,river:hasRiv?'riviere':c.k==='port'?'lac':size==='hameau'?'ruisseau':'ruisseau',wall:size==='ville'?'rempart':'auto',forest:'moyen',field:'moyen',seed:Math.floor(Math.random()*99999)+1});
  v.theme=w.climate==='froid'?'hiver':'ete';P.villages.push(v);c.link=v.id;return v}
function W_act(a,btn){
  const w=CW(),sel=wsel();
  if(a==='mesOff'){wmes=null;renderOverlay();renderSide();return}
  if(a==='del'){snap();w.items=w.items.filter(i=>!ui.sel.includes(i.id));ui.sel=[];dirty();renderSide();renderOverlay();return}
  if(a==='dup'){snap();const out=[];for(const it of sel){const c=JSON.parse(JSON.stringify(it));c.id=uid();delete c.link;if(c.pts)c.pts=c.pts.map(p=>[p[0]+10,p[1]+10]);else{c.x+=10;c.y+=10}w.items.push(c);out.push(c.id)}ui.sel=out;dirty();renderSide();renderOverlay();return}
  if(a==='weld'){snap();const n=weldRealms(w);const r=fixOverlaps(w,ui.sel[0],true);save();renderAll();toast(r?'Frontières réparées : chevauchements supprimés':n?n+' sommets recollés':'Frontières déjà jointes');return}
  if(a==='cancelVil'){ui.wk.vil=null;renderSide();return}
  if(a==='dice'){ui.wgen.seed=Math.floor(Math.random()*99999)+1;renderSide();return}
  if(a==='nameW'){snap();w.name=WNM.realm(Math.random);fillItemSel();renderAll();return}
  if(a==='popW'){snap();const n=populate(w,w.kmu>=20?6:10);save();renderAll();toast(n+' lieux ajoutés');return}
  if(a==='genW'){if((w.items.length||w.th)&&!armed(btn,'Remplacer la carte ?'))return;snap();genWorld(w,{...ui.wgen,seed:ui.wgen.seed});ui.sel=[];save();renderAll();fit();return}
  if(a==='enter'){const it=sel[0];if(!it)return;
    if(it.t==='city'){if(!canEnter(it)){toast('Ce lieu n\'a pas de carte de village');return}snap();let v=P.villages.find(q=>q.id===it.link);if(!v)v=wMakeVillage(it,w);ui.fromW={w:w.id,id:it.id};ui.from=null;P.curV=v.id;save();setMode('v');return}
    if(it.t==='realm'){let c=P.worlds.find(q=>q.id===it.link);if(!c){snap();c=zoomInto(w,boxForRealm(it),it.name||'Royaume');it.link=c.id}goWorld(c.id)}}}
side.addEventListener('click',e=>{
  if(ui.mode!=='w')return;
  const a=e.target.closest('[data-wsel]');if(a){e.preventDefault();wChoisirListe(a);if(e.detail>=2)wDoubleClic(a);return}
  const go=e.target.closest('[data-wgo]');if(go){e.preventDefault();wAller(go.dataset.wgo);return}
  const o=e.target.closest('[data-wopen]');if(o){goWorld(o.dataset.wopen);return}
  const vl=e.target.closest('[data-wvil]');if(vl){ui.wk.vil=vl.dataset.wvil;ui.tool='city';renderTools();renderSide();toast('Clique la carte pour placer « '+P.villages.find(v=>v.id===ui.wk.vil).name+' »');return}
  const m=e.target.closest('[data-wbm]');if(m){ui.wb.mode=m.dataset.wbm;renderSide();return}
  const s=e.target.closest('[data-wkset]');if(s){const[kk,vv]=s.dataset.wkset.split('|');ui.wk[kk]=vv;renderSide();renderOverlay()}});
function W_key(e){
  const k=e.key,w=CW(),sel=wsel();
  if(wdraw){if(k==='Enter'){wFinish(false);return true}if(k==='Backspace'){wdraw.pts.pop();if(!wdraw.pts.length)wdraw=null;renderOverlay();return true}}
  if(ui.tool==='brush'&&(k==='['||k===']')){ui.wb.r=clamp(ui.wb.r+(k===']'?1:-1),2,26);renderSide();renderOverlay();return true}
  if(k==='Delete'||k==='Backspace'){if(sel.length){snap();w.items=w.items.filter(i=>!ui.sel.includes(i.id));ui.sel=[];dirty();renderSide();renderOverlay();return true}}
  if((k==='d'||k==='D')&&(e.ctrlKey||e.metaKey)){W_act('dup');return true}
  if(k.startsWith('Arrow')&&sel.length){e.preventDefault();const st=e.shiftKey?10:2;const dx=k==='ArrowLeft'?-st:k==='ArrowRight'?st:0,dy=k==='ArrowUp'?-st:k==='ArrowDown'?st:0;snap();sel.forEach(i=>{if(i.pts)i.pts=i.pts.map(p=>[p[0]+dx,p[1]+dy]);else{i.x+=dx;i.y+=dy}});dirty();renderOverlay();return true}
  return false}
function mdWorld(w){
  let s=`# ${w.name}\n\n${scaleName(w.kmu)} de ${fmtKm(MW*w.kmu)} × ${fmtKm(MH*w.kmu)} km.\n\n`;if(w.notes)s+=w.notes+'\n\n';
  const cs=w.items.filter(i=>i.t==='city'),rl=w.items.filter(i=>i.t==='realm');
  if(rl.length){s+='## Royaumes\n\n';rl.forEach(r=>{const ins=cs.filter(c=>inPoly(c.x,c.y,r.pts)),cap=ins.find(c=>c.k==='capitale');s+=`- **${r.name||'(sans nom)'}** : ${ins.length} lieux${cap?', capitale '+cap.name:''}${r.note?'\n  '+r.note.replace(/\n+/g,'\n  '):''}\n`});s+='\n'}
  if(cs.length){s+='## Lieux\n\n';cs.forEach(c=>{const v=P.villages.find(q=>q.id===c.link);const r=rl.find(q=>inPoly(c.x,c.y,q.pts));s+=`- **${c.name}** (${(CK[c.k]||'lieu').toLowerCase()})${r?', '+r.name:''}${v?' : carte du village « '+v.name+' »':''}${c.note?'\n  '+c.note.replace(/\n+/g,'\n  '):''}\n`});s+='\n'}
  const sea=w.items.filter(i=>i.t==='label'&&i.k==='mer'),mo=w.items.filter(i=>i.t==='label'&&i.k==='montagne');
  if(sea.length||mo.length||w.items.some(i=>i.t==='river')){s+='## Géographie\n\n';sea.forEach(l=>s+=`- ${l.text}\n`);mo.forEach(l=>s+=`- ${l.text}\n`);s+=`- ${w.items.filter(i=>i.t==='river').length} rivières, ${w.items.filter(i=>i.t==='road').length} routes\n\n`}
  const kids=wKids(w);if(kids.length){s+='## Cartes détaillées\n\n';kids.forEach(k=>s+=`- ${k.name} (${scaleName(k.kmu)})\n`)}
  return s}
function linkDemo(v){const w=CW();if(!w)return;const c=w.items.find(i=>i.t==='city'&&i.k==='village')||w.items.find(i=>i.t==='city'&&i.k==='ville');if(c){c.link=v.id;c.name=v.name}}
function newWorldModal(){
  modal(`<h2>Nouvelle carte du monde</h2><div class="row"><label>Nom</label><input type="text" id="nwName" placeholder="(automatique)"></div><div class="row"><label>Échelle</label><select id="nwScale">${SCALES.map(s=>`<option value="${s[2]}"${s[0]==='continent'?' selected':''}>${s[1]} (${fmtKm(MW*s[2])} km de large)</option>`).join('')}</select></div><div class="row"><label>Forme</label><select id="nwType">${opt({continent:'Un continent',continents:'Plusieurs continents',pangee:'Pangée',archipel:'Archipel',iles:'Îles dispersées',vide:'Mer vide (à peindre)'},ui.wgen.type)}</select></div><p class="hint">Le terrain est généré avec les réglages du panneau (terres, climat, royaumes, lieux). Il reste entièrement modifiable.</p><div class="row"><button class="btn primary" id="nwGo">Créer</button><button class="btn" onclick="closeModal()">Annuler</button></div>`);
  $('#nwGo').onclick=()=>{snap();const w=mkW($('#nwName').value.trim()||WNM.realm(Math.random),+$('#nwScale').value),ty=$('#nwType').value;
    if(ty==='vide')setGrid(w,new Uint8Array(w.gw*w.gh).fill(60),new Uint8Array(w.gw*w.gh).fill(128));else genWorld(w,{...ui.wgen,type:ty,seed:Math.floor(Math.random()*99999)+1});
    P.worlds.push(w);P.curW=w.id;ui.sel=[];closeModal();save();renderAll();fit()}}
