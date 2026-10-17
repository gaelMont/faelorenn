/* ====== villages : édition ====== */
let vg=null,vdraw=null;
ui.gen={size:'village',river:'riviere',wall:'auto',forest:'moyen',field:'moyen',seed:Math.floor(Math.random()*99999)+1};
const vsel=()=>{const v=CV();return ui.sel.map(id=>v.items.find(i=>i.id===id)).filter(Boolean)};
const vtol=()=>9/(VU*ui.view.k);
const bldPts=b=>rectPts(b.x,b.y,b.w,b.h,b.a||0);
function vAdd(it){it.id=uid();CV().items.push(it);return it}
function polyArea2(p){return polyArea(p.pts)}
function vItemBounds(it){
  switch(it.t){case 'bld':{const p=bldPts(it);const b=bbox(p);return[b.x0,b.y0,b.x1,b.y1]}
  case 'tree':return[it.x-it.r/2,it.y-it.r/2,it.x+it.r/2,it.y+it.r/2];
  case 'label':{const w=String(it.text).length*(it.size||12)*.55/VU,h=(it.size||12)/VU;return[it.x-w/2,it.y-h,it.x+w/2,it.y+h*.3]}
  case 'mark':return[it.x-2.2,it.y-2.2,it.x+2.2,it.y+2.2];
  default:{const b=bbox(it.pts);return[b.x0,b.y0,b.x1,b.y1]}}}
function vHit(m){
  const V=CV(),tol=vtol(),its=V.items;const x=m[0],y=m[1];
  for(let i=its.length-1;i>=0;i--){const it=its[i];if(it.t==='mark'&&Math.hypot(it.x-x,it.y-y)<2.4+tol/2)return it}
  for(let i=its.length-1;i>=0;i--){const it=its[i];if(it.t==='label'){const b=vItemBounds(it);if(x>=b[0]-tol&&x<=b[2]+tol&&y>=b[1]-tol&&y<=b[3]+tol)return it}}
  for(let i=its.length-1;i>=0;i--){const it=its[i];if(it.t==='bld'&&inPoly(x,y,bldPts(it)))return it}
  for(let i=its.length-1;i>=0;i--){const it=its[i];if(it.t==='tree'&&Math.hypot(it.x-x,it.y-y)<=Math.max(it.r/2,tol/2))return it}
  let best=null,bd=1e9;
  for(const it of its){if(it.t==='road'||it.t==='river'){const d=dpoly(x,y,smooth(it.pts,4),false).d-(roadW(it)/2);if(d<tol&&d<bd){bd=d;best=it}}else if(it.t==='wall'){const d=dpoly(x,y,it.pts,!!it.closed).d-1.5;if(d<tol&&d<bd){bd=d;best=it}}}
  if(best)return best;
  let ba=1e18;for(const it of its){if(it.t==='poly'&&inPoly(x,y,it.pts)){const a=polyArea2(it);if(a<ba){ba=a;best=it}}}
  return best}
function vHandles(it){
  if(it.t==='bld'){const p=bldPts(it);const top=[(p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2];const a=rad((it.a||0)-90);const rot=[top[0]+Math.cos(a)*3.5,top[1]+Math.sin(a)*3.5];return isReal(it)?{rot,_a:p[0],_b:p[1]}:{c0:p[0],c1:p[1],c2:p[2],c3:p[3],rot}}
  if(it.pts){const H={};it.pts.forEach((p,i)=>H['v'+i]=p);return H}
  return{}}
function vHandleAt(it,m){const H=vHandles(it),tol=vtol()*1.4;for(const k in H)if(k[0]!=='_'&&Math.hypot(H[k][0]-m[0],H[k][1]-m[1])<=tol)return k;return null}
function kindOfPlan(b){return({havre:'manoir',manoir:'manoir',auberge:'taverne',maison:'maison',boutique:'boutique',forge:'forge',entrepot:'grange',chapelle:'chapelle',tour:'tour'})[b.gen&&b.gen.type]||'grande'}
function faceRoad(it){let best=null,bd=1e9;for(const r of CV().items){if(r.t!=='road')continue;const q=dpoly(it.x,it.y,smooth(r.pts,4),false);if(q.d<bd){bd=q.d;best=q}}
  if(!best)return;let a=deg(Math.atan2(best.y-it.y,best.x-it.x))-90;while(a>180)a-=360;while(a<=-180)a+=360;it.a=Math.round(a)}
function nearRoadAngle(m){let best=null,bd=30;for(const it of CV().items){if(it.t!=='road')continue;const sp=smooth(it.pts,4);const r=dpoly(m[0],m[1],sp,false);if(r.d<bd){bd=r.d;const a=sp[r.i],b=sp[r.i+1];best=Math.atan2(b[1]-a[1],b[0]-a[0])}}
  if(best==null)return 0;let d=deg(best);while(d>90)d-=180;while(d<=-90)d+=180;return Math.round(d)}
const rnd1=v=>Math.round(v*2)/2;
const VM={
 down(e){
  const m=toM(e),t=ui.tool,V=CV();
  if(isoOn())return false;
  if(t==='sel'){
    const sel=vsel();
    if(sel.length===1){const h=vHandleAt(sel[0],m);
      if(h){const it=sel[0];
        if(h.startsWith('v')&&e.altKey){const i=+h.slice(1);const min=it.t==='poly'?3:2;if(it.pts.length>min){snap();it.pts.splice(i,1);dirty();renderOverlay()}return true}
        snap();vg={t:h==='rot'?'rot':h.startsWith('c')?'rs':'vtx',it,h,o:JSON.parse(JSON.stringify(it))};return true}}
    const hit=vHit(m);
    if(!hit){if(!e.shiftKey){ui.sel=[];renderSide();renderOverlay()}return false}
    if(e.shiftKey)ui.sel=ui.sel.includes(hit.id)?ui.sel.filter(i=>i!==hit.id):[...ui.sel,hit.id];else if(!ui.sel.includes(hit.id))ui.sel=[hit.id];
    const items=vsel();vg={t:'move',m0:m,items,orig:items.map(i=>JSON.parse(JSON.stringify(i))),moved:false};renderSide();renderOverlay();return true}
  if(['road','river','wall','poly'].includes(t)){
    const p=[rnd1(m[0]),rnd1(m[1])];
    if(!vdraw)vdraw={pts:[p]};else{
      const f=vdraw.pts[0];if((t==='poly'||t==='wall')&&vdraw.pts.length>=3&&Math.hypot(f[0]-p[0],f[1]-p[1])<vtol()*1.8){finishDraw(true);return true}
      vdraw.pts.push(p)}
    renderOverlay();return true}
  if(t==='bld'&&ui.vk.plan){const pb=P.buildings.find(x=>x.id===ui.vk.plan),f=pb&&bldFootprint(pb);
    if(!f){toast('Ce plan n\'a encore aucune pièce au rez-de-chaussée');return true}
    snap();const it=vAdd({t:'bld',k:kindOfPlan(pb),x:rnd1(m[0]),y:rnd1(m[1]),w:Math.round(f.w*2)/2,h:Math.round(f.h*2)/2,a:0,name:pb.name,link:pb.id});faceRoad(it);ui.sel=[it.id];dirty();renderSide();return true}
  if(t==='bld'){snap();const d=VKD[ui.vk.bld];const it=vAdd({t:'bld',k:d.k,x:rnd1(m[0]),y:rnd1(m[1]),w:d.w,h:d.h,a:nearRoadAngle(m),name:'',link:''});ui.sel=[it.id];setTool('sel');dirty();renderSide();return true}
  if(t==='tree'){snap();vg={t:'paint',last:null};paintTree(m);return true}
  if(t==='label'){snap();const k=ui.vk.label;const it=vAdd({t:'label',x:rnd1(m[0]),y:rnd1(m[1]),text:k==='village'?V.name:k==='rue'?NM.rue(Math.random):'Texte',k,size:k==='village'?30:k==='rue'?9:12,a:0});ui.sel=[it.id];setTool('sel');dirty();renderSide();return true}
  if(t==='mark'){snap();const n=Math.max(0,...V.items.filter(i=>i.t==='mark').map(i=>+i.n||0))+1;const it=vAdd({t:'mark',x:rnd1(m[0]),y:rnd1(m[1]),n,text:'Lieu'});ui.sel=[it.id];setTool('sel');dirty();renderSide();return true}
  if(t==='erase'){const h=vHit(m);if(h){snap();V.items=V.items.filter(i=>i!==h);ui.sel=ui.sel.filter(i=>i!==h.id);dirty();renderSide()}return true}
  return false},
 move(e,dragging){
  const m=toM(e);ui.hover=m;
  if(!vg){renderOverlay();return}
  if(vg.t==='paint'){paintTree(m);return}
  if(vg.t==='move'){const dx=m[0]-vg.m0[0],dy=m[1]-vg.m0[1];if(!vg.moved&&Math.hypot(dx,dy)>.4){snap();vg.moved=true}
    if(!vg.moved)return;vg.items.forEach((it,i)=>{const o=vg.orig[i];if(it.pts)it.pts=o.pts.map(p=>[rnd1(p[0]+dx),rnd1(p[1]+dy)]);else{it.x=rnd1(o.x+dx);it.y=rnd1(o.y+dy)}});dirty();renderOverlay()}
  else if(vg.t==='vtx'){const i=+vg.h.slice(1);vg.it.pts[i]=[rnd1(m[0]),rnd1(m[1])];dirty();renderOverlay()}
  else if(vg.t==='rot'){const it=vg.it;let a=deg(Math.atan2(m[1]-it.y,m[0]-it.x))+90;if(!e.altKey)a=Math.round(a/5)*5;it.a=((Math.round(a)%360)+360)%360;if(it.a>180)it.a-=360;dirty();renderOverlay()}
  else if(vg.t==='rs'){const it=vg.it,o=vg.o,a=rad(o.a||0);const dx=m[0]-o.x,dy=m[1]-o.y;const lx=dx*Math.cos(-a)-dy*Math.sin(-a),ly=dx*Math.sin(-a)+dy*Math.cos(-a);
    const idx=+vg.h.slice(1);const sx=[-1,1,1,-1][idx],sy=[-1,-1,1,1][idx];const nw=Math.max(1,Math.abs(lx)*2),nh=Math.max(1,Math.abs(ly)*2);
    it.w=Math.max(1,Math.round(nw)); it.h=Math.max(1,Math.round(nh));dirty();renderOverlay()}},
 up(e){if(vg&&vg.t==='paint'){}vg=null;renderOverlay();renderSideLight()},
 cancel(){vg=null;renderOverlay()},
 dbl(e){const m=toM(e);
  if(!vdraw){const h=vHit(m);if(h&&h.t==='bld'&&linkedB(h)){ui.from={v:CV().id,id:h.id};P.curB=h.link;setMode('b');return}}
  if(vdraw){if(vdraw.pts.length>1){vdraw.pts.pop()}finishDraw(false);return}
  const sel=vsel();if(sel.length===1&&sel[0].pts){const it=sel[0];const r=dpoly(m[0],m[1],it.pts,it.t==='poly'||!!it.closed);if(r.d<vtol()*2){snap();it.pts.splice(r.i+1,0,[rnd1(r.x),rnd1(r.y)]);dirty();renderOverlay()}}},
 ctx(e){if(vdraw){vdraw.pts.pop();if(!vdraw.pts.length)vdraw=null;renderOverlay()}}
};
function paintTree(m){
  const V=CV(),k=ui.vk.tree,sp=k==='buisson'?2.4:4;
  if(vg.last&&Math.hypot(vg.last[0]-m[0],vg.last[1]-m[1])<sp)return;vg.last=m;
  const n=vg.n=(vg.n||0)+1;const g=mkrng(Math.floor(Math.random()*1e9));
  const cnt=n===1?1:2;for(let i=0;i<cnt;i++){const jx=(g()-.5)*sp*1.6*(i?1:0),jy=(g()-.5)*sp*1.6*(i?1:0);vAdd({t:'tree',x:fx(m[0]+jx),y:fx(m[1]+jy),r:fx(k==='buisson'?2+g()*1.2:4.2+g()*2.4),k})}
  dirty()}
function finishDraw(close){
  const t=ui.tool,V=CV();if(!vdraw)return;const pts=vdraw.pts;vdraw=null;
  const need=t==='poly'?3:2;if(pts.length<need){renderOverlay();return}
  snap();let it;
  if(t==='road')it=vAdd({t:'road',pts,k:ui.vk.road,w:RDK[ui.vk.road].w});
  else if(t==='river')it=vAdd({t:'river',pts,w:10});
  else if(t==='wall')it=vAdd({t:'wall',pts,closed:!!close,k:ui.vk.wall,towers:true});
  else it=vAdd({t:'poly',pts,k:ui.vk.poly});
  ui.sel=[it.id];dirty();renderSide();renderOverlay()}
function vOverlay(){
  let s='';const k=1/ui.view.k;const V=CV();
  for(const it of vsel()){
    if(it.t==='bld'){const p=bldPts(it).map(q=>[q[0]*VU,q[1]*VU]);s+=`<path d="${pathD(p,true)}" fill="none" stroke="var(--accent)" stroke-width="${2*k}" stroke-dasharray="${6*k} ${4*k}"/>`}
    else if(it.pts){const pts=it.pts.map(q=>[q[0]*VU,q[1]*VU]);s+=`<path d="${pathD(smooth(pts,6,it.t==='poly'),it.t==='poly'||!!it.closed)}" fill="none" stroke="var(--accent)" stroke-width="${3*k}" opacity=".6"/>`}
    else{const b=vItemBounds(it);s+=`<rect x="${b[0]*VU-3*k}" y="${b[1]*VU-3*k}" width="${(b[2]-b[0])*VU+6*k}" height="${(b[3]-b[1])*VU+6*k}" fill="none" stroke="var(--accent)" stroke-width="${2*k}" stroke-dasharray="${6*k} ${4*k}"/>`}
    if(ui.edit&&vsel().length===1){const H=vHandles(it);for(const q in H){const p=H[q];if(q[0]==='_')continue;if(q==='rot'){const c0=H.c0||H._a,c1=H.c1||H._b;s+=`<line x1="${(c0[0]+c1[0])/2*VU}" y1="${(c0[1]+c1[1])/2*VU}" x2="${p[0]*VU}" y2="${p[1]*VU}" stroke="var(--accent)" stroke-width="${1.4*k}"/><circle cx="${p[0]*VU}" cy="${p[1]*VU}" r="${5.5*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.6*k}"/>`}
      else s+=`<rect x="${p[0]*VU-4.5*k}" y="${p[1]*VU-4.5*k}" width="${9*k}" height="${9*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.6*k}"/>`}}}
  if(vdraw){const pts=vdraw.pts.map(q=>[q[0]*VU,q[1]*VU]);const all=ui.hover?[...pts,[ui.hover[0]*VU,ui.hover[1]*VU]]:pts;
    s+=`<path d="${pathD(all)}" fill="none" stroke="var(--accent)" stroke-width="${2.4*k}" stroke-dasharray="${5*k} ${3*k}"/>`+pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${(i===0?5.5:3.5)*k}" fill="${i===0?'var(--accent)':'#fff'}" stroke="var(--accent)" stroke-width="${1.4*k}"/>`).join('')}
  else if(ui.hover&&ui.tool==='bld'&&ui.vk.plan&&P.buildings.find(x=>x.id===ui.vk.plan)&&bldFootprint(P.buildings.find(x=>x.id===ui.vk.plan))){const pb=P.buildings.find(x=>x.id===ui.vk.plan);const tmp={x:ui.hover[0],y:ui.hover[1],a:0,link:pb.id,k:kindOfPlan(pb),id:'g'};faceRoad(tmp);s+=`<g opacity=".65" transform="translate(${ui.hover[0]*VU} ${ui.hover[1]*VU}) rotate(${tmp.a})">${realBody(tmp,TH[CV().theme]||TH.ete)}</g>`}
  else if(ui.hover&&ui.tool==='bld'){const d=VKD[ui.vk.bld];const a=nearRoadAngle(ui.hover);s+=`<g opacity=".6" transform="translate(${ui.hover[0]*VU} ${ui.hover[1]*VU}) rotate(${a})">${bldBody(d.k,d.w,d.h,'x',TH[CV().theme]||TH.ete)}</g>`}
  else if(ui.hover&&ui.tool==='tree')s+=`<circle cx="${ui.hover[0]*VU}" cy="${ui.hover[1]*VU}" r="${10*k}" fill="none" stroke="var(--accent)" stroke-width="${1.4*k}" stroke-dasharray="${3*k} ${3*k}"/>`;
  overlay.innerHTML=s;updEnter()}
/* ---- panneau latéral village ---- */
function V_side(){
  const V=CV(),sel=vsel();let h='';
  if(sel.length===1)h+=vItemPanel(sel[0]);
  else if(sel.length>1)h+=`<h3>${sel.length} éléments</h3><div class="row"><button class="btn sm" data-act="dup">Dupliquer</button><button class="btn sm danger" data-act="del">Supprimer</button></div>`;
  else h+=vToolPanel();
  h+=villageWhere(V);
  h+=`<h3>Carte</h3><div class="row"><label>Nom</label><input type="text" data-v="name" value="${esc(V.name)}"></div>`;
  h+=`<div class="row"><label>Taille (m)</label><input type="number" data-v="W" min="100" max="1500" step="20" value="${V.W}"> × <input type="number" data-v="H" min="100" max="1200" step="20" value="${V.H}"></div>`;
  h+=`<div class="row"><label>Saison</label><select data-v="theme">${opt(Object.fromEntries(Object.entries(TH).map(([k,v])=>[k,v.n])),V.theme)}</select></div>`;
  h+=`<details><summary style="cursor:pointer;margin:14px 0 6px">Générateur de carte</summary>`;
  const G=ui.gen;
  h+=`<div class="row"><label>Taille</label><select data-gen="size">${opt({hameau:'Hameau (~15 bâtiments)',village:'Village (~45)',bourg:'Bourg (~100)',ville:'Ville (~200)'},G.size)}</select></div>`;
  h+=`<div class="row"><label>Eau</label><select data-gen="river">${opt({aucune:'Aucune',ruisseau:'Ruisseau',riviere:'Rivière',lac:'Rivière et lac'},G.river)}</select></div>`;
  h+=`<div class="row"><label>Enceinte</label><select data-gen="wall">${opt({auto:'Selon la taille',aucune:'Aucune',palissade:'Palissade',rempart:'Rempart'},G.wall)}</select></div>`;
  h+=`<div class="row"><label>Forêts</label><select data-gen="forest">${opt({peu:'Rares',moyen:'Moyennes',beaucoup:'Denses'},G.forest)}</select><label style="min-width:0">Champs</label><select data-gen="field">${opt({peu:'Rares',moyen:'Moyens',beaucoup:'Nombreux'},G.field)}</select></div>`;
  h+=`<div class="row"><label>Graine</label><input type="number" data-gen="seed" value="${G.seed}"><button class="btn sm" data-act="dice" title="Nouvelle graine">Au hasard</button></div>`;
  h+=`<div class="row"><button class="btn primary" data-act="genV">Générer la carte</button><button class="btn sm" data-act="nameV">Nom au hasard</button></div><p class="hint">La génération remplace le contenu actuel (annulable).</p></details>`;
  const mk=V.items.filter(i=>i.t==='mark').sort((a,b)=>a.n-b.n);
  h+=`<h3>Repères (${mk.length})</h3>`+(mk.length?`<ul class="legend">`+mk.map(m=>`<li><b>${esc(m.n)}</b><a href="#" data-vsel="${m.id}" style="color:inherit">${esc(m.text)}</a></li>`).join('')+`</ul>`:`<p class="hint">L'outil « Repère » pose des numéros qui forment la légende de l'export.</p>`);
  const ib=V.items.filter(i=>i.t==='bld'&&linkedB(i)).sort((x,y)=>(x.name||linkedB(x).name).localeCompare(y.name||linkedB(y).name,'fr'));
  h+=`<h3>Intérieurs construits (${ib.length})</h3>`+(ib.length?`<ul class="legend">`+ib.map(b=>`<li><a href="#" data-vsel="${b.id}" style="color:inherit;flex:1">${esc(b.name||linkedB(b).name)}</a><a href="#" data-vopen="${b.id}" title="Entrer dans le bâtiment" style="color:inherit;text-decoration:none">▸</a></li>`).join('')+`</ul>`:`<p class="hint">Les bâtiments liés à un plan d'intérieur apparaissent ici.</p>`);
  const bl=V.items.filter(i=>i.t==='bld'),pop=bl.filter(b=>!['puits','tour','porte','tente','halle','moulinv','etable','grange','entrepot','cabane','chapelle','eglise'].includes(b.k)).length;
  h+=`<h3>Statistiques</h3><p class="hint">${bl.length} bâtiments · environ ${Math.round(pop*4.6)} habitants · ${V.items.filter(i=>i.t==='tree').length} arbres · ${V.items.filter(i=>i.t==='road').length} routes</p>`;
  h+=`<h3>Notes</h3><textarea data-v="notes" rows="4" placeholder="Histoire, factions, rumeurs…">${esc(V.notes||'')}</textarea>`;
  return h}
function vToolPanel(){
  const t=ui.tool,k=ui.vk;
  const T={sel:['Sélection','Clique un élément. Glisse pour le déplacer. Double-clic sur une ligne pour ajouter un point, Alt+clic sur un point pour le retirer.'],pan:['Main','Glisse pour déplacer la vue.'],road:['Route','Clique les points, double-clic pour terminer.'],river:['Rivière','Clique les points, double-clic pour terminer.'],wall:['Enceinte','Clique les points. Clique le premier point pour fermer, double-clic pour laisser ouvert.'],poly:['Zone','Clique les sommets, puis reviens au premier point pour fermer.'],bld:['Bâtisse','Clique pour poser. Orientée automatiquement le long de la route la plus proche.'],tree:['Arbres','Clique ou glisse pour planter.'],label:['Texte','Clique pour poser un nom.'],mark:['Repère','Clique pour poser un numéro de légende.'],erase:['Gomme','Clique un élément pour le supprimer.']}[t];
  let h=`<h3>${T[0]}</h3><p class="hint">${T[1]}</p>`;
  if(t==='road')h+=`<div class="row"><label>Type</label><select data-vk="road">${opt(Object.fromEntries(Object.entries(RDK).map(([a,b])=>[a,b.n])),k.road)}</select></div>`;
  if(t==='wall')h+=`<div class="row"><label>Type</label><select data-vk="wall">${opt(WLK,k.wall)}</select></div>`;
  if(t==='poly')h+=`<div class="row"><label>Zone</label><select data-vk="poly">${opt(PK,k.poly)}</select></div>`;
  if(t==='tree')h+=`<div class="row"><label>Type</label><select data-vk="tree">${opt({feuillu:'Feuillu',conifere:'Conifère',buisson:'Buisson'},k.tree)}</select></div>`;
  if(t==='label')h+=`<div class="row"><label>Style</label><select data-vk="label">${opt({village:'Titre',lieu:'Lieu',rue:'Rue (italique)',eau:'Eau'},k.label)}</select></div>`;
  if(t==='bld'){const th=TH[CV().theme]||TH.ete;
    h+=`<p class="tag" style="margin:8px 0 4px">Mes plans (réutilisables)</p><div style="display:flex;flex-direction:column;gap:4px">`+P.buildings.map(b=>{const f=bldFootprint(b);return `<button class="btn sm" style="text-align:left" data-vplan="${b.id}" aria-pressed="${ui.vk.plan===b.id}">${esc(b.name)} <span class="hint">${f?fx(f.w)+' × '+fx(f.h)+' m':'vide'}</span></button>`}).join('')+`</div><p class="hint">Clique un plan puis la carte pour le poser avec sa vraie forme. Un même plan se pose autant de fois que voulu, et le modifier met à jour toutes ses copies. Pour une variante, duplique d'abord le plan (bouton Dupliquer en haut).</p><p class="tag" style="margin:8px 0 4px">Types génériques</p>`;
    h+=`<div class="pal">`+VK.map(([kk,n,w,hh])=>`<button data-vbld="${kk}" aria-pressed="${kk===k.bld&&!k.plan}" title="${esc(n)}"><svg viewBox="${-Math.max(w,hh)*VU/2-4} ${-Math.max(w,hh)*VU/2-4} ${Math.max(w,hh)*VU+8} ${Math.max(w,hh)*VU+8}">${bldBody(kk,w,hh,'p',th)}</svg><span>${esc(n)}</span></button>`).join('')+`</div>`}
  return h}
function vItemPanel(it){
  const del=`<div class="row"><button class="btn sm" data-act="dup">Dupliquer</button><button class="btn sm danger" data-act="del">Supprimer</button></div>`;let h='';
  if(it.t==='bld'){h+=`<h3>Bâtiment</h3><div class="row">`+(linkedB(it)?`<button class="btn primary" data-act="openB" style="flex:1">Entrer dans le bâtiment ▸</button>`:`<button class="btn primary" data-act="mkB" style="flex:1">Créer son plan et entrer ▸</button>`)+`</div><div class="row"><label>Type</label><select data-f="k">${VK.map(x=>`<option value="${x[0]}"${x[0]===it.k?' selected':''}>${esc(x[1])}</option>`).join('')}</select></div>`+fld('Nom','name',it.name||'');
    h+=`<div class="row"><label>Larg. · Prof.</label><input type="number" data-f="w" min="1" step="0.5" value="${it.w}"><input type="number" data-f="h" min="1" step="0.5" value="${it.h}"></div><div class="row"><label>Angle</label><input type="number" data-f="a" step="5" value="${it.a||0}"><button class="btn sm" data-act="rot15">↻ 15°</button></div>`;
    h+=`<div class="row"><label>Toit</label><select data-f="roof">${opt({'':'Selon le type',tile:'Tuiles',slate:'Ardoise',thatch:'Chaume',wood:'Bois'},it.roof||'')}</select></div>`;
    h+=`<div class="row"><label>Plan lié</label><select data-f="link"><option value="">Aucun</option>${P.buildings.map(b=>`<option value="${b.id}"${b.id===it.link?' selected':''}>${esc(b.name)}</option>`).join('')}</select></div>`;
    h+=`<div class="row">`+(it.link&&P.buildings.find(b=>b.id===it.link)?`<button class="btn sm primary" data-act="openB">Modifier le plan</button><button class="btn sm" data-act="face">Entrée vers la route</button>`:`<button class="btn sm" data-act="mkB">Créer un plan de ce bâtiment</button>`)+`<button class="btn sm" data-act="mkMark">Numéroter</button></div>`+(linkedB(it)?`<div class="row"><label><input type="checkbox" data-f="realOn"${it.real!==false?' checked':''}> Afficher la forme et la taille réelles du plan</label></div><p class="hint">Emprise du plan : ${(()=>{const f=bldFootprint(linkedB(it));return f?fx(f.w)+' × '+fx(f.h)+' m':'aucune pièce au rez-de-chaussée'})()}</p>`:'')+del}
  else if(it.t==='road')h+=`<h3>Route</h3><div class="row"><label>Type</label><select data-f="k">${opt(Object.fromEntries(Object.entries(RDK).map(([a,b])=>[a,b.n])),it.k||'route')}</select></div>`+fld('Largeur (m)','w',roadW(it),'number','step="0.5" min="1"')+`<p class="hint">${it.pts.length} points · ${Math.round(polyLen(it.pts))} m</p>`+del;
  else if(it.t==='river')h+=`<h3>Rivière</h3>`+fld('Largeur (m)','w',it.w,'number','step="1" min="2"')+`<p class="hint">${it.pts.length} points</p>`+del;
  else if(it.t==='wall')h+=`<h3>Enceinte</h3><div class="row"><label>Type</label><select data-f="k">${opt(WLK,it.k)}</select></div><div class="row"><label><input type="checkbox" data-f="closed"${it.closed?' checked':''}> Fermée</label><label><input type="checkbox" data-f="towers"${it.towers!==false?' checked':''}> Tours</label></div>`+del;
  else if(it.t==='poly')h+=`<h3>Zone</h3><div class="row"><label>Type</label><select data-f="k">${opt(PK,it.k)}</select></div><p class="hint">≈ ${fx(polyArea(it.pts)/10000)} ha</p>`+del;
  else if(it.t==='tree')h+=`<h3>Arbre</h3><div class="row"><label>Type</label><select data-f="k">${opt({feuillu:'Feuillu',conifere:'Conifère',buisson:'Buisson'},it.k||'feuillu')}</select></div>`+fld('Taille (m)','r',it.r,'number','step="0.5" min="1"')+del;
  else if(it.t==='label')h+=`<h3>Texte</h3>`+fld('Texte','text',it.text)+`<div class="row"><label>Style</label><select data-f="k">${opt({village:'Titre',lieu:'Lieu',rue:'Rue',eau:'Eau'},it.k||'lieu')}</select></div>`+fld('Taille','size',it.size||12,'number','min="6" max="80"')+fld('Angle','a',it.a||0,'number','step="5"')+del;
  else if(it.t==='mark')h+=`<h3>Repère</h3>`+fld('Numéro','n',it.n,'number','min="1"')+fld('Texte','text',it.text)+del;
  return h}
function V_input(el,typing){
  const V=CV(),d=el.dataset;
  if(d.gen){const val=el.type==='number'?parseInt(el.value)||1:el.value;ui.gen[d.gen]=val;return}
  if(d.vk){ui.vk[d.vk]=el.value;renderSide();return}
  if(d.v){once();let v=numOrStr(el);if(d.v==='W'||d.v==='H'){v=clamp(+v||300,100,1500)}V[d.v]=v;save();if(d.v==='name')fillItemSel();renderCanvas();return}
  if(d.f){const sel=vsel();if(sel.length!==1)return;if(typing&&el.tagName==='SELECT')return;once();const it=sel[0];let v=numOrStr(el);
    if(['w','h','r','size','a','n'].includes(d.f)){if(isNaN(v))return;if(d.f!=='a'&&v<=0)return}
    if(d.f==='realOn'){it.real=el.checked?undefined:false;save();renderCanvas();renderOverlay();renderSide();return}
    if(d.f==='roof'&&v==='')v=undefined;
    it[d.f]=v;if(d.f==='k'&&it.t==='bld'&&VKD[v]&&el.tagName==='SELECT'){it.w=VKD[v].w;it.h=VKD[v].h}
    if(d.f==='k'&&it.t==='road'){it.w=RDK[v].w}
    save();renderCanvas();renderOverlay();if(el.tagName==='SELECT'||el.type==='checkbox')renderSide()}}
function V_act(a,btn){
  const V=CV(),sel=vsel();
  if(a==='showOnMap'){const wh=V.where;const w=wh&&P.worlds.find(x=>x.id===wh.map);if(w){P.curW=w.id;ui.fromW=null;setMode('w');ui.sel=[wh.city];renderSide();renderOverlay()}return}
  if(a==='del'){snap();V.items=V.items.filter(i=>!ui.sel.includes(i.id));ui.sel=[];dirty();renderSide();renderOverlay();return}
  if(a==='dup'){snap();const out=[];for(const it of sel){const c=JSON.parse(JSON.stringify(it));c.id=uid();if(c.pts)c.pts=c.pts.map(p=>[p[0]+6,p[1]+6]);else{c.x+=6;c.y+=6}V.items.push(c);out.push(c.id)}ui.sel=out;dirty();renderSide();renderOverlay();return}
  if(a==='rot15'){snap();sel.forEach(i=>{i.a=(((i.a||0)+15+180)%360)-180});dirty();renderOverlay();return}
  if(a==='dice'){ui.gen.seed=Math.floor(Math.random()*99999)+1;renderSide();return}
  if(a==='nameV'){snap();V.name=NM.village(Math.random);fillItemSel();renderAll();return}
  if(a==='genV'){if(V.items.length&&!armed(btn,'Remplacer la carte ?'))return;snap();genVillage(V,ui.gen);ui.sel=[];save();renderAll();fit();return}
  if(a==='openB'){const it=sel[0];if(it&&it.link){ui.from={v:V.id,id:it.id};P.curB=it.link;setMode('b')}return}
  if(a==='face'){const it=sel[0];if(it){snap();faceRoad(it);dirty();renderOverlay();renderSide()}return}
  if(a==='mkB'){const it=sel[0];if(!it)return;snap();const map={maison:'maison',chaumiere:'maison',grande:'maison',ferme:'maison',boutique:'boutique',taverne:'auberge',forge:'forge',grange:'entrepot',etable:'entrepot',entrepot:'entrepot',eglise:'chapelle',chapelle:'chapelle',tour:'tour',manoir:'manoir',halle:'entrepot',moulin:'maison',moulinv:'tour',porte:'tour',cabane:'maison',tente:'maison',puits:'maison'};
    const b=genBuilding(map[it.k]||'maison',Math.floor(Math.random()*1e9));if(it.name)b.name=it.name;P.buildings.push(b);it.link=b.id;syncLinks(V);faceRoad(it);save();toast('Plan créé : '+b.name+'. La bâtisse prend sa forme réelle.');renderAll();return}
  if(a==='mkMark'){const it=sel[0];if(!it)return;snap();const n=Math.max(0,...V.items.filter(i=>i.t==='mark').map(i=>+i.n||0))+1;vAdd({t:'mark',x:it.x,y:it.y-Math.max(it.w,it.h)/2-3,n,text:it.name||VKD[it.k].n});dirty();renderSide();return}
}
side.addEventListener('click',e=>{
  const vo=e.target.closest('[data-vopen]');if(vo&&ui.mode==='v'){e.preventDefault();const it=CV().items.find(i=>i.id===vo.dataset.vopen);if(it&&it.link){ui.from={v:CV().id,id:it.id};P.curB=it.link;setMode('b')}return}
  const a=e.target.closest('[data-vsel]');if(a&&ui.mode==='v'){e.preventDefault();ui.sel=[a.dataset.vsel];renderSide();renderOverlay();return}
  const pl=e.target.closest('[data-vplan]');if(pl&&ui.mode==='v'){ui.vk.plan=ui.vk.plan===pl.dataset.vplan?null:pl.dataset.vplan;renderSide();renderOverlay();return}
  const p=e.target.closest('[data-vbld]');if(p&&ui.mode==='v'){ui.vk.bld=p.dataset.vbld;ui.vk.plan=null;renderSide();renderOverlay()}});
function V_key(e){
  const k=e.key,V=CV(),sel=vsel();
  if(vdraw){if(k==='Enter'){finishDraw(false);return true}if(k==='Escape'){vdraw=null;renderOverlay();return true}if(k==='Backspace'){vdraw.pts.pop();if(!vdraw.pts.length)vdraw=null;renderOverlay();return true}}
  if(k==='Delete'||k==='Backspace'){if(sel.length){snap();V.items=V.items.filter(i=>!ui.sel.includes(i.id));ui.sel=[];dirty();renderSide();renderOverlay();return true}}
  if((k==='d'||k==='D')&&(e.ctrlKey||e.metaKey)){V_act('dup');return true}
  if(k==='r'||k==='R'){if(sel.length){snap();sel.forEach(i=>{if(i.t==='bld'||i.t==='label')i.a=(((i.a||0)+(e.shiftKey?-15:15)+180+360)%360)-180});dirty();renderOverlay();renderSide();return true}}
  if(k.startsWith('Arrow')&&sel.length){e.preventDefault();const st=e.shiftKey?5:1;const dx=k==='ArrowLeft'?-st:k==='ArrowRight'?st:0,dy=k==='ArrowUp'?-st:k==='ArrowDown'?st:0;snap();sel.forEach(i=>{if(i.pts)i.pts=i.pts.map(p=>[p[0]+dx,p[1]+dy]);else{i.x+=dx;i.y+=dy}});dirty();renderOverlay();return true}
  return false}

/* bouton flottant « Entrer » au-dessus du bâtiment sélectionné */
function updEnter(){
  const el=$('#enter');if(!el)return;
  if(ui.mode==='w'){wEnter(el);return}
  if(ui.mode!=='v'||ui.tool!=='sel'){el.hidden=true;return}
  const sel=vsel();if(sel.length!==1||sel[0].t!=='bld'){el.hidden=true;return}
  const it=sel[0],b=vItemBounds(it),k=ui.view.k;
  el.textContent=linkedB(it)?'Entrer ▸ '+(linkedB(it).name):'Créer le plan et entrer ▸';
  el.style.left=((b[0]+b[2])/2*VU*k+ui.view.x)+'px';el.style.top=(b[1]*VU*k+ui.view.y-10)+'px';el.hidden=false}
$('#enter').onclick=()=>{if(ui.mode==='w'){W_act('enter');return}const it=vsel()[0];if(!it)return;if(!linkedB(it)){V_act('mkB')}V_act('openB')};
