/* ====== villages : rendu ====== */
const VU=4;
const TH={
 ete:{n:'Été',ground:'#cfdca8',tuft:'#b3c58a',water:'#9cc3d3',waterE:'#5f8fa6',road:'#e8dbb3',roadE:'#b9a77b',forest:'#aec783',field:'#e2d79f',fieldL:'#c8ba74',tree:['#6f9a56','#5f8a4a','#7aa65f'],treeE:'#3f6335',place:'#eadfc0',jardin:'#bdd48d',cim:'#c3cdaa',roofs:{tile:['#c4784f','#b86a4b','#cc8559'],slate:'#6f7580',thatch:'#cdb066',wood:'#a2815a'}},
 automne:{n:'Automne',ground:'#dccb92',tuft:'#c4b277',water:'#97bccb',waterE:'#5f8fa6',road:'#ecdcb0',roadE:'#bba577',forest:'#cfae6a',field:'#e6cf8a',fieldL:'#cdb166',tree:['#c4742f','#b0502a','#d79a3a'],treeE:'#7c3d1a',place:'#eadcbc',jardin:'#c9c37f',cim:'#cbc3a0',roofs:{tile:['#b9603f','#a8553a','#c46f49'],slate:'#6b6f78',thatch:'#c7a55d',wood:'#8f6f4a'}},
 hiver:{n:'Hiver',ground:'#edf1f3',tuft:'#d8e1e6',water:'#b4ccd9',waterE:'#7c9db0',road:'#d9dde0',roadE:'#aab2b8',forest:'#d2dde0',field:'#e6ecee',fieldL:'#cfd8dc',tree:['#bccdd0','#a9bdc1','#c9d7d9'],treeE:'#6d8286',place:'#e3e8ea',jardin:'#dfe7e9',cim:'#d4dbde',roofs:{tile:['#c9ced2','#bcc3c8','#d2d7da'],slate:'#a4abb4',thatch:'#d6d9d8',wood:'#b4b6b3'}}};
const VK=[
 ['maison','Maison',6,8,'tile'],['chaumiere','Chaumière',5,7,'thatch'],['grande','Grande maison',9,10,'tile'],['boutique','Boutique',7,9,'tile'],['taverne','Taverne / auberge',12,14,'tile'],['forge','Forge',8,9,'slate'],
 ['ferme','Ferme',10,12,'tile'],['grange','Grange',10,14,'wood'],['etable','Étable',6,10,'wood'],['entrepot','Entrepôt',10,16,'wood'],['moulin','Moulin à eau',8,9,'wood'],['moulinv','Moulin à vent',8,8,'wood'],
 ['eglise','Église',9,20,'slate'],['chapelle','Chapelle',6,10,'slate'],['tour','Tour',6,6,'slate'],['manoir','Manoir',14,18,'slate'],['halle','Halle / marché',16,12,'wood'],['puits','Puits',3,3,'wood'],['porte','Porte fortifiée',9,6,'slate'],['cabane','Cabane',4,5,'wood'],['tente','Tente',5,5,'thatch']];
const VKD=Object.fromEntries(VK.map(k=>[k[0],{k:k[0],n:k[1],w:k[2],h:k[3],roof:k[4]}]));
const PK={foret:'Forêt',champ:'Champs',place:'Place pavée',jardin:'Jardins / vergers',cimetiere:'Cimetière',lac:'Lac / étang',colline:'Colline',marais:'Marais'};
const RDK={route:{n:'Route',w:6},chemin:{n:'Chemin',w:4},ruelle:{n:'Ruelle',w:2.6}};
const WLK={rempart:'Rempart de pierre',palissade:'Palissade de bois',haie:'Haie / clôture'};
const hs=(s)=>hstr(s);
function roofColor(th,roof,id){const r=th.roofs[roof];return Array.isArray(r)?r[hs(id)%r.length]:r}
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;r=Math.round(r*f);g=Math.round(g*f);b=Math.round(b*f);return '#'+[r,g,b].map(v=>clamp(v,0,255).toString(16).padStart(2,'0')).join('')}
/* corps d'un bâtiment, centré sur (0,0), en pixels */
function bldBody(k,w,h,id,th,roofKey){
  const d=VKD[k]||VKD.maison,W=w*VU,H=h*VU,col=roofColor(th,roofKey||d.roof,id),dk=shade(col,.78),S=`stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"`;
  const rect=(x,y,a,b,f,x2='')=>`<rect x="${fx(x)}" y="${fx(y)}" width="${fx(a)}" height="${fx(b)}" fill="${f}" ${mergeAttr(' '+S,x2)}/>`;
  const circ=(r,f)=>`<circle r="${fx(r)}" fill="${f}" ${S}/>`;
  const ridge=(vert)=>vert?`<path d="M0 ${-H/2}V${H/2}" stroke="${shade(col,.62)}" stroke-width="1.2"/>`:`<path d="M${-W/2} 0H${W/2}" stroke="${shade(col,.62)}" stroke-width="1.2"/>`;
  const shadow=`<rect x="${-W/2+2.2}" y="${-H/2+2.6}" width="${W}" height="${H}" fill="rgba(40,30,10,.22)"/>`;
  switch(k){
  case 'puits':return `<circle r="${W/2}" fill="#9a9280" ${S}/><circle r="${W/2*.58}" fill="#5f8fa6" stroke="${INK}" stroke-width="1"/>`;
  case 'tour':return `<circle cx="2.2" cy="2.6" r="${W/2}" fill="rgba(40,30,10,.22)"/>`+circ(W/2,'#9a948a')+circ(W/2*.62,shade('#9a948a',.85));
  case 'moulinv':{const r=W/2;let bl='';for(let i=0;i<4;i++){bl+=`<g transform="rotate(${i*90+20})"><rect x="-1.4" y="${-r*2.1}" width="2.8" height="${r*2.05}" fill="#e9dfc3" ${S}/></g>`}return `<circle cx="2.2" cy="2.6" r="${r}" fill="rgba(40,30,10,.22)"/>`+circ(r*.78,col)+bl+`<circle r="2" fill="${INK}"/>`}
  case 'tente':return shadow+`<polygon points="0,${-H/2} ${W/2},${H/2} ${-W/2},${H/2}" fill="#d9c9a3" ${S}/><path d="M0 ${-H/2}V${H/2}" stroke="${INK}" stroke-width="1"/>`;
  case 'halle':{let s=shadow+rect(-W/2,-H/2,W,H,'#d8c9a2','stroke-dasharray="0"');const cols=['#b5564a','#4f7a9a','#c6a04a','#6c8e57'];for(let i=0;i<4;i++)s+=rect(-W/2+W*(.1+i*.22),-H/2+H*.2,W*.14,H*.22,cols[i],'stroke-width="1"')+rect(-W/2+W*(.1+i*.22),H/2-H*.42,W*.14,H*.22,cols[(i+2)%4],'stroke-width="1"');return s+[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>`<circle cx="${a*W/2}" cy="${b*H/2}" r="2" fill="${INK}"/>`).join('')}
  case 'eglise':{const nw=W,nh=H*.75;return shadow+rect(-nw/2,-H/2+H*.25,nw,nh,col)+rect(-W*.9,-H*.08,W*1.8,H*.2,col)+rect(-nw*.34,-H/2,nw*.68,H*.28,shade(col,.7))+`<path d="M0 ${-H/2+H*.3}V${H/2-4}" stroke="${shade(col,.6)}" stroke-width="1.2"/><path d="M0 ${-H*.42}v${-6}M-3 ${-H*.42-3.5}h6" stroke="${INK}" stroke-width="1.4"/>`}
  case 'manoir':{return shadow+rect(-W/2,-H/2,W,H,col)+rect(-W/2,-H/2,W*.3,H,shade(col,.88))+rect(W/2-W*.3,-H/2,W*.3,H,shade(col,.88))+ridge(H>=W)}
  case 'porte':return shadow+rect(-W/2,-H/2,W,H,'#9a948a')+rect(-W*.2,-H/2,W*.4,H,'#6f6a62','stroke-width="1"')+rect(-W/2-2,-H/2-2,6,6,'#8f8a80')+rect(W/2-4,-H/2-2,6,6,'#8f8a80');
  case 'moulin':return shadow+rect(-W/2,-H/2,W,H,col)+ridge(H>=W)+rect(W/2-1,-H*.28,W*.28,H*.56,'#8fb7c9','stroke-width="1"')+`<path d="M${W/2+W*.06} ${-H*.28}v${H*.56}M${W/2+W*.14} ${-H*.28}v${H*.56}M${W/2+W*.22} ${-H*.28}v${H*.56}" stroke="${INK}" stroke-width=".8"/>`;
  case 'taverne':return shadow+rect(-W/2,-H/2,W,H,col)+ridge(H>=W)+rect(-W/2-3,H/2-10,4,7,'#8a2f2f','stroke-width="1"');
  case 'forge':return shadow+rect(-W/2,-H/2,W,H,col)+ridge(H>=W)+rect(W/2-8,-H/2+3,6,6,'#555','stroke-width="1"')+`<circle cx="${W/2-5}" cy="${-H/2+6}" r="1.6" fill="#e9a24a"/>`;
  case 'ferme':case 'grande':case 'boutique':case 'maison':case 'chaumiere':case 'cabane':case 'grange':case 'etable':case 'entrepot':case 'chapelle':default:
    return shadow+rect(-W/2,-H/2,W,H,col)+`<rect x="${-W/2}" y="${-H/2}" width="${W/2}" height="${H}" fill="rgba(0,0,0,.09)" pointer-events="none"/>`+ridge(H>=W)+(k==='chapelle'?`<path d="M0 ${-H/2-0}v-0" /><path d="M0 ${-H/2+3}v5M-2 ${-H/2+5}h4" stroke="${INK}" stroke-width="1.1"/>`:'')}
}
const linkedB=b=>b.link?P.buildings.find(x=>x.id===b.link):null;
const isReal=b=>{const l=linkedB(b);return !!(l&&b.real!==false&&bldFootprint(l))};
function bldFootprint(b){
  const F=b.floors[0];const rs=F.items.filter(i=>i.t==='room'&&['piece','couloir','cour','secure','eau'].includes(i.kind));
  if(!rs.length)return null;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const r of rs){x0=Math.min(x0,r.x);y0=Math.min(y0,r.y);x1=Math.max(x1,r.x+r.w);y1=Math.max(y1,r.y+r.h)}
  const dd=F.items.filter(i=>i.t==='door'&&i.o==='h'&&Math.abs(i.y-y1)<.6).sort((a,c)=>c.w-a.w)[0];
  return{x0,y0,x1,y1,w:x1-x0,h:y1-y0,roofs:rs.filter(r=>r.kind!=='cour'),courts:rs.filter(r=>r.kind==='cour'),door:dd?dd.x-(x0+x1)/2:null}}
function syncLinks(v){for(const b of v.items){if(b.t!=='bld'||!b.link)continue;const l=linkedB(b);if(!l){b.link='';continue}if(b.real===false)continue;const fp=bldFootprint(l);if(fp){b.w=Math.round(fp.w*2)/2;b.h=Math.round(fp.h*2)/2}}}
function realBody(b,th){
  const l=linkedB(b),fp=bldFootprint(l),ox=(fp.x0+fp.x1)/2,oy=(fp.y0+fp.y1)/2,d=VKD[b.k]||VKD.maison;
  const col=roofColor(th,b.roof||d.roof,b.id),P_=v=>fx(v*VU);
  const shp=(r,extra)=>{const x=P_(r.x-ox),y=P_(r.y-oy),w=P_(r.w),h=P_(r.h);
    if(libreOk(r))return `<polygon points="${libreApli(r).map(p=>P_(p[0]-ox)+','+P_(p[1]-oy)).join(' ')}" ${extra}/>`;
    if(r.shape==='ring'){const t=(r.thick||1)*VU;return `<path d="M${x} ${y}h${w}v${h}h${-w}ZM${fx(+x+t)} ${fx(+y+t)}v${fx(h-2*t)}h${fx(w-2*t)}v${fx(-(h-2*t))}Z" fill-rule="evenodd" ${extra}/>`}
    if(r.shape==='ellipse')return `<ellipse cx="${fx(+x+w/2)}" cy="${fx(+y+h/2)}" rx="${fx(w/2)}" ry="${fx(h/2)}" ${extra}/>`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`};
  let s=`<g transform="translate(2.2 2.6)">`+fp.roofs.map(r=>shp(r,'fill="rgba(40,30,10,.22)"')).join('')+`</g>`;
  s+=fp.roofs.map(r=>shp(r,`fill="${INK}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`)).join('');
  s+=fp.roofs.map(r=>shp(r,`fill="${col}"`)).join('');
  s+=fp.roofs.filter(r=>r.shape!=='ring'&&r.shape!=='ellipse'&&r.shape!=='poly').map(r=>{const x=P_(r.x-ox),y=P_(r.y-oy),w=r.w*VU,h=r.h*VU;const lg=r.w>=r.h;return `<path d="${lg?`M${x} ${fx(+y+h/2)}h${fx(w)}`:`M${fx(+x+w/2)} ${y}v${fx(h)}`}" stroke="${shade(col,.62)}" stroke-width="1" fill="none"/><rect x="${x}" y="${y}" width="${fx(w)}" height="${fx(h)}" fill="rgba(0,0,0,.07)" clip-path="none" opacity=".0"/>`}).join('');
  s+=fp.courts.map(r=>shp(r,`fill="${th.jardin}" stroke="${INK}" stroke-width="1.4"`)).join('');
  if(fp.door!=null)s+=`<rect x="${fx(fp.door*VU-3)}" y="${fx(fp.h/2*VU-2)}" width="6" height="4.5" fill="#5a4128" stroke="${INK}" stroke-width=".8"/>`;
  return s}
function bldSVG(b,th){return `<g transform="translate(${fx(b.x*VU)} ${fx(b.y*VU)}) rotate(${b.a||0})">${isReal(b)?realBody(b,th):bldBody(b.k,b.w,b.h,b.id,th,b.roof)}</g>`}
function treeSVG(t,th){
  const r=t.r*VU/2*1.0,g=hs(t.id||''+t.x+t.y),c=th.tree[g%th.tree.length],px=t.x*VU,py=t.y*VU;
  if(t.k==='buisson')return `<circle cx="${fx(px)}" cy="${fx(py)}" r="${fx(r*.6)}" fill="${shade(c,1.08)}" stroke="${th.treeE}" stroke-width=".8"/>`;
  if(t.k==='conifere')return `<circle cx="${fx(px+1.4)}" cy="${fx(py+1.6)}" r="${fx(r*.9)}" fill="rgba(40,30,10,.2)"/><polygon points="${fx(px)},${fx(py-r)} ${fx(px+r*.85)},${fx(py+r*.7)} ${fx(px-r*.85)},${fx(py+r*.7)}" fill="${shade(c,.85)}" stroke="${th.treeE}" stroke-width="1"/><polygon points="${fx(px)},${fx(py-r*.6)} ${fx(px+r*.5)},${fx(py+r*.35)} ${fx(px-r*.5)},${fx(py+r*.35)}" fill="${shade(c,.95)}"/>`;
  return `<circle cx="${fx(px+1.6)}" cy="${fx(py+2)}" r="${fx(r)}" fill="rgba(40,30,10,.2)"/><circle cx="${fx(px)}" cy="${fx(py)}" r="${fx(r)}" fill="${c}" stroke="${th.treeE}" stroke-width="1"/><circle cx="${fx(px-r*.28)}" cy="${fx(py-r*.28)}" r="${fx(r*.45)}" fill="${shade(c,1.14)}"/>`}
function polySVG(p,th,id){
  const pts=p.pts.map(q=>[q[0]*VU,q[1]*VU]);const sm=smooth(pts,5,true);const d=pathD(sm,true);
  switch(p.k){
  case 'lac':return `<path d="${d}" fill="${th.waterE}" stroke="none" transform="translate(0 0)"/><path d="${d}" fill="${th.water}" stroke="${th.waterE}" stroke-width="2.5" stroke-linejoin="round"/>`;
  case 'foret':return `<path d="${d}" fill="${th.forest}" stroke="${shade(th.forest,.85)}" stroke-width="1.5" stroke-dasharray="6 4"/>`;
  case 'champ':return `<path d="${d}" fill="${th.field}" stroke="${th.fieldL}" stroke-width="1.5"/><path d="${d}" fill="url(#${id}fh)" stroke="none"/>`;
  case 'place':return `<path d="${d}" fill="${th.place}" stroke="${th.roadE}" stroke-width="1.5"/><path d="${d}" fill="url(#${id}pv)" stroke="none"/>`;
  case 'jardin':return `<path d="${d}" fill="${th.jardin}" stroke="${shade(th.jardin,.82)}" stroke-width="1.2"/><path d="${d}" fill="url(#${id}gd)" stroke="none"/>`;
  case 'cimetiere':return `<path d="${d}" fill="${th.cim}" stroke="${shade(th.cim,.7)}" stroke-width="1.5"/><path d="${d}" fill="url(#${id}cm)" stroke="none"/>`;
  case 'colline':return `<path d="${d}" fill="${shade(th.ground,.96)}" stroke="${shade(th.ground,.7)}" stroke-width="1.2"/><path d="${pathD(sm.map(q=>{const c=pts.reduce((a,b)=>[a[0]+b[0]/pts.length,a[1]+b[1]/pts.length],[0,0]);return[c[0]+(q[0]-c[0])*.66,c[1]+(q[1]-c[1])*.66]}),true)}" fill="none" stroke="${shade(th.ground,.7)}" stroke-width="1"/><path d="${pathD(sm.map(q=>{const c=pts.reduce((a,b)=>[a[0]+b[0]/pts.length,a[1]+b[1]/pts.length],[0,0]);return[c[0]+(q[0]-c[0])*.33,c[1]+(q[1]-c[1])*.33]}),true)}" fill="none" stroke="${shade(th.ground,.7)}" stroke-width="1"/>`;
  case 'marais':return `<path d="${d}" fill="${shade(th.water,1.02)}" fill-opacity=".55" stroke="${th.waterE}" stroke-width="1" stroke-dasharray="3 3"/><path d="${d}" fill="url(#${id}mr)" stroke="none"/>`}
  return ''}
const roadW=r=>r.w||RDK[r.k||'route'].w;
function crossings(roads,rivers){
  const out=[];for(const r of roads){const rp=smooth(r.pts.map(q=>[q[0]*VU,q[1]*VU]),4);for(const v of rivers){const vp=smooth(v.pts.map(q=>[q[0]*VU,q[1]*VU]),4);
    for(let i=0;i<rp.length-1;i++)for(let j=0;j<vp.length-1;j++){const x=segInt(rp[i],rp[i+1],vp[j],vp[j+1]);if(x&&!out.some(o=>Math.hypot(o.x-x.x,o.y-x.y)<v.w*VU*1.5))out.push({x:x.x,y:x.y,a:Math.atan2(rp[i+1][1]-rp[i][1],rp[i+1][0]-rp[i][0]),w:roadW(r)*VU,l:v.w*VU})}}}
  return out}
function villageInner(v,o={}){
  syncLinks(v);const th=TH[v.theme]||TH.ete,id='v'+(o.pid||'');const W=v.W*VU,H=v.H*VU;let s='';
  const rg=mkrng(v.seed||1);
  s+=`<defs><clipPath id="${id}clip"><rect width="${W}" height="${H}"/></clipPath>
<pattern id="${id}fh" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0H8" stroke="${th.fieldL}" stroke-width="1.6"/></pattern>
<pattern id="${id}pv" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 5h10M5 0v5M2.5 5v5M7.5 5v5" stroke="${th.roadE}" stroke-width=".6" fill="none" opacity=".7"/></pattern>
<pattern id="${id}gd" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="${shade(th.jardin,.7)}"/><circle cx="6.5" cy="6" r="1.3" fill="${shade(th.jardin,.7)}"/></pattern>
<pattern id="${id}cm" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M3 3v4M1.5 4.5h3M9 8v3M7.5 9.2h3" stroke="${shade(th.cim,.55)}" stroke-width="1"/></pattern>
<pattern id="${id}mr" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M2 3h4M8 7h4" stroke="${th.waterE}" stroke-width="1"/></pattern></defs>`;
  s+=`<g clip-path="url(#${id}clip)"><rect width="${W}" height="${H}" fill="${th.ground}"/>`;
  let tf='';const nt=Math.min(900,Math.floor(v.W*v.H/90));for(let i=0;i<nt;i++){const x=rg()*W,y=rg()*H;tf+=`M${fx(x)} ${fx(y)}l2 -3M${fx(x+3)} ${fx(y)}l0 -4M${fx(x+5)} ${fx(y)}l-2 -3`}
  s+=`<path d="${tf}" stroke="${th.tuft}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  const it=v.items;const pOrder=['colline','marais','foret','champ','jardin','cimetiere','lac','place'];
  for(const k of pOrder)for(const p of it.filter(i=>i.t==='poly'&&i.k===k))s+=polySVG(p,th,id);
  const rivers=it.filter(i=>i.t==='river'),roads=it.filter(i=>i.t==='road');
  for(const r of rivers){const d=pathD(smooth(r.pts.map(q=>[q[0]*VU,q[1]*VU]),6));s+=`<path d="${d}" fill="none" stroke="${th.waterE}" stroke-width="${r.w*VU+4}" stroke-linecap="round" stroke-linejoin="round"/>`}
  for(const r of rivers){const d=pathD(smooth(r.pts.map(q=>[q[0]*VU,q[1]*VU]),6));s+=`<path d="${d}" fill="none" stroke="${th.water}" stroke-width="${r.w*VU}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1" stroke-dasharray="10 18" transform="translate(0 -2)"/>`}
  const rd=roads.map(r=>({d:pathD(smooth(r.pts.map(q=>[q[0]*VU,q[1]*VU]),6)),w:roadW(r)*VU,k:r.k}));
  for(const r of rd)s+=`<path d="${r.d}" fill="none" stroke="${th.roadE}" stroke-width="${r.w+3}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for(const r of rd)s+=`<path d="${r.d}" fill="none" stroke="${th.road}" stroke-width="${r.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for(const c of crossings(roads,rivers)){s+=`<g transform="translate(${fx(c.x)} ${fx(c.y)}) rotate(${fx(deg(c.a))})"><rect x="${-c.l/2-5}" y="${-c.w/2-2}" width="${c.l+10}" height="${c.w+4}" fill="#b99c6b" stroke="${INK}" stroke-width="1.4"/><path d="M${-c.l/2-5} ${-c.w/2+1}H${c.l/2+5}M${-c.l/2-5} ${c.w/2-1}H${c.l/2+5}" stroke="${INK}" stroke-width="1.4"/><path d="${Array.from({length:Math.floor((c.l+10)/5)},(_,i)=>`M${-c.l/2-5+i*5+2.5} ${-c.w/2+1}V${c.w/2-1}`).join('')}" stroke="#8d7a55" stroke-width=".8"/></g>`}
  for(const w of it.filter(i=>i.t==='wall')){
    const pts=w.pts.map(q=>[q[0]*VU,q[1]*VU]);const d=pathD(pts,w.closed);
    if(w.k==='palissade'){s+=`<path d="${d}" fill="none" stroke="${INK}" stroke-width="5.4" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#9a7a52" stroke-width="3.6" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-dasharray="1 3.2" stroke-linejoin="round" opacity=".7"/>`}
    else if(w.k==='haie'){s+=`<path d="${d}" fill="none" stroke="#4d6b3c" stroke-width="4.5" stroke-dasharray="4 2" stroke-linecap="round" stroke-linejoin="round"/>`}
    else{s+=`<path d="${d}" fill="none" stroke="${INK}" stroke-width="10.5" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#a7a090" stroke-width="7.5" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#c5bfae" stroke-width="2" stroke-linejoin="round"/>`;
      if(w.towers!==false)for(const p of pts)s+=`<circle cx="${fx(p[0])}" cy="${fx(p[1])}" r="8" fill="#9a948a" stroke="${INK}" stroke-width="1.6"/><circle cx="${fx(p[0])}" cy="${fx(p[1])}" r="4.6" fill="#7d776c"/>`}}
  for(const b of it.filter(i=>i.t==='bld'))s+=bldSVG(b,th);
  for(const t of it.filter(i=>i.t==='tree').sort((a,b)=>a.y-b.y))s+=treeSVG(t,th);
  s+=`<g font-family="${FONT}" text-anchor="middle">`;
  const EV=vEch(v),EN=Math.sqrt(EV);
  for(const b of it.filter(i=>i.t==='bld'&&i.name&&i.show!==false))s+=`<text x="${fx(b.x*VU)}" y="${fx(b.y*VU+Math.max(b.w,b.h)*VU/2+9*EN)}" font-size="${fx(8.5*EN)}" fill="${INK}" stroke="${th.ground}" stroke-width="2.4" paint-order="stroke" font-style="italic">${esc(b.name)}</text>`;
  for(const l of it.filter(i=>i.t==='label')){
    const st={village:'font-size="'+(l.size||30)+'" font-weight="700" letter-spacing="3"',lieu:'font-size="'+(l.size||12)+'" font-weight="700"',rue:'font-size="'+(l.size||9)+'" font-style="italic"',eau:'font-size="'+(l.size||11)+'" font-style="italic" letter-spacing="2"'}[l.k||'lieu'];
    s+=`<text transform="translate(${fx(l.x*VU)} ${fx(l.y*VU)}) rotate(${l.a||0})" ${st} fill="${l.k==='eau'?th.waterE:INK}" stroke="${th.ground}" stroke-width="3" paint-order="stroke">${esc(l.text)}</text>`}
  for(const m of it.filter(i=>i.t==='mark'))s+=`<circle cx="${fx(m.x*VU)}" cy="${fx(m.y*VU)}" r="${fx(8.5*EV)}" fill="#8a2f2f" stroke="#fff7ee" stroke-width="${fx(1.6*EV)}"/><text x="${fx(m.x*VU)}" y="${fx(m.y*VU+3.4*EV)}" font-size="${fx(10*EV)}" font-weight="700" fill="#fff7ee">${esc(m.n)}</text>`;
  s+='</g></g>';
  s+=`<rect width="${W}" height="${H}" fill="none" stroke="${INK}" stroke-width="3"/>`;
  return s}
function V_bounds(){if(isoOn())return isoBounds();const v=CV();return{x0:-30,y0:-30,x1:v.W*VU+30,y1:v.H*VU+30}}
function V_render(){if(isoOn()){isoRender();return}const v=CV();content.innerHTML=`<rect x="-3000" y="-3000" width="${v.W*VU+6000}" height="${v.H*VU+6000}" fill="rgba(0,0,0,.0)"/>`+villageInner(v)}
function villageSheet(v){
  const E=vEch(v),W=v.W*VU,H=v.H*VU,pad=Math.round(40*E),hdr=Math.round(88*E),lh=18*E;
  const mk=v.items.filter(i=>i.t==='mark').sort((a,b)=>a.n-b.n);
  const ib=v.items.filter(i=>i.t==='bld'&&linkedB(i)).map(b=>b.name||linkedB(b).name).sort((x,y)=>x.localeCompare(y,'fr')),ibRows=Math.ceil(ib.length/3);
  const leg=Math.max(0,Math.ceil(mk.length/2))*lh+(mk.length?44*E:0)+(ib.length?ibRows*lh+40*E:0);
  const TW=W+pad*2,TH_=Math.round(H+hdr+pad+Math.max(70*E,leg+20*E));
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH_}" viewBox="0 0 ${TW} ${TH_}"><rect width="${TW}" height="${TH_}" fill="${PAPER}"/>`;
  s+=`<g font-family="${FONT}" fill="${INK}"><text x="${pad}" y="${fx(52*E)}" font-size="${fx(28*E)}" font-weight="700" letter-spacing="${fx(2*E)}">${esc(v.name.toUpperCase())}</text><text x="${pad}" y="${fx(74*E)}" font-size="${fx(13*E)}" font-style="italic">${v.W} × ${v.H} m · ${v.items.filter(i=>i.t==='bld').length} bâtiments</text></g>`;
  s+=`<g transform="translate(${pad} ${hdr})">${villageInner(v,{pid:'x'})}</g>`;
  const by=hdr+H+30*E;s+=scaleBar2(pad,by,100,E)+northArrow(TW-pad-6*E,12*E,E);
  const lx0=pad+100*VU+40*E;
  if(mk.length){s+=`<g font-family="${FONT}" fill="${INK}" font-size="${fx(13*E)}">`;mk.forEach((m,i)=>{const col=i%2,row=Math.floor(i/2);const x=lx0+col*Math.max(240*E,(TW-pad-lx0)/2),y=by-4*E+row*lh;s+=`<circle cx="${fx(x)}" cy="${fx(y)}" r="${fx(7.5*E)}" fill="#8a2f2f"/><text x="${fx(x)}" y="${fx(y+3.3*E)}" font-size="${fx(9.5*E)}" text-anchor="middle" fill="#fff7ee" font-weight="700">${esc(m.n)}</text><text x="${fx(x+14*E)}" y="${fx(y+4*E)}">${esc(m.text)}</text>`});s+='</g>'}
  if(ib.length){const y0=by+Math.max(34*E,Math.ceil(mk.length/2)*lh+14*E),cw=(TW-pad*2)/3;s+=`<g font-family="${FONT}" fill="${INK}"><text x="${pad}" y="${fx(y0)}" font-size="${fx(14*E)}" font-weight="700" letter-spacing="${fx(E)}">INTÉRIEURS CONSTRUITS (${ib.length})</text><path d="M${pad} ${fx(y0+6*E)}H${TW-pad}" stroke="${INK}" stroke-width="${fx(.8*E)}"/><g font-size="${fx(13*E)}">`;ib.forEach((n,i)=>{const col=Math.floor(i/ibRows),row=i%ibRows;s+=`<text x="${fx(pad+col*cw)}" y="${fx(y0+26*E+row*lh)}">▸ ${esc(n)}</text>`});s+='</g></g>'}
  s+='</svg>';return{svg:s,w:TW,h:TH_}}
function scaleBar2(x,y,m,e){e=e||1;const L=m*VU;return `<g stroke="${INK}" stroke-width="${fx(2*e)}" fill="none"><path d="M${x} ${fx(y)}h${L}M${x} ${fx(y-6*e)}v${fx(12*e)}M${x+L/2} ${fx(y-4*e)}v${fx(8*e)}M${x+L} ${fx(y-6*e)}v${fx(12*e)}"/></g><text x="${x}" y="${fx(y+20*e)}" font-family="${FONT}" font-size="${fx(11*e)}" fill="${INK}">0 · ${m/2} · ${m} m</text>`}
