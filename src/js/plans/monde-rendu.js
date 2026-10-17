/* ====== cartes du monde : terrain et rendu ====== */
const MW=1200,MH=700,WGW=240,WGH=140,SEA=102;
const SCALES=[['monde','Planisphère',32],['continent','Continent',6],['pays','Pays',1],['region','Région',0.2],['canton','Canton',0.05]];
const scaleName=k=>k>=20?'Planisphère':k>=3?'Continent':k>=.5?'Pays':k>=.1?'Région':'Canton';
let TVC=Date.now();
const mkW=(name,kmu=6)=>({id:uid(),name:name||'Nouvelle carte',kmu,seed:ri(Math.random,1,99999),climate:'tempere',glyph:true,items:[],notes:'',tv:0,gw:WGW,gh:WGH,th:'',tm:'',parent:null});
function b64e(u){let s='';const n=0x8000;for(let i=0;i<u.length;i+=n)s+=String.fromCharCode.apply(null,u.subarray(i,i+n));return btoa(s)}
function b64d(s,len){const t=atob(s||''),u=new Uint8Array(len);for(let i=0;i<t.length&&i<len;i++)u[i]=t.charCodeAt(i);return u}
const TG={};
function grid(w){let g=TG[w.id];if(!g||g.tv!==w.tv){const n=w.gw*w.gh;g=TG[w.id]={tv:w.tv,h:b64d(w.th,n),m:b64d(w.tm,n)}}return g}
function commitGrid(w){const g=TG[w.id];w.th=b64e(g.h);w.tm=b64e(g.m);w.tv=++TVC;g.tv=w.tv}
function setGrid(w,h,m){w.th=b64e(h);w.tm=b64e(m);w.tv=++TVC;TG[w.id]={tv:w.tv,h,m}}
function smp(a,gw,gh,x,y){x=clamp(x,0,gw-1.001);y=clamp(y,0,gh-1.001);const i=x|0,j=y|0,u=x-i,v=y-j,k=j*gw+i;return(a[k]*(1-u)+a[k+1]*u)*(1-v)+(a[k+gw]*(1-u)+a[k+gw+1]*u)*v}
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const sm01=x=>{x=x<0?0:x>1?1:x;return x*x*(3-2*x)};
const PAL={shallow:[150,198,210],deep:[88,136,166],coast:[196,226,228],grass:[168,198,124],steppe:[204,202,136],desert:[228,205,148],forest:[122,162,100],jungle:[92,142,84],tundra:[210,218,204],snow:[242,245,244],hills:[170,162,122],rock:[150,144,134],sand:[234,223,182],line:[104,88,64]};
const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function latFactor(w){return w.kmu>=20?1:w.kmu>=3?.5:w.kmu>=.5?.2:.08}
function paintBase(w,sc){
  const g=grid(w),gw=w.gw,gh=w.gh,W=Math.round(MW*sc),H=Math.round(MH*sc);
  const cv=mkCanvas(W,H),ctx=cv.getContext('2d'),img=ctx.createImageData(W,H),d=img.data;
  const mk=mkCanvas(W,H),mctx=mk.getContext('2d'),mimg=mctx.createImageData(W,H),md=mimg.data;
  const sea=SEA/255,ts={froid:-.24,tempere:0,chaud:.2}[w.climate||'tempere'],la=latFactor(w);
  const sx=(gw-1)/(W-1),sy=(gh-1)/(H-1),st=.9;
  for(let y=0;y<H;y++){const lat=Math.abs(2*y/(H-1)-1);for(let x=0;x<W;x++){
    const gx=x*sx,gy=y*sy,hh=smp(g.h,gw,gh,gx,gy)/255,i=(y*W+x)*4;let c;
    if(hh<sea){const dd=clamp((sea-hh)/sea*1.7,0,1);c=mixc(PAL.shallow,PAL.deep,sm01(dd));if(hh>sea-.035)c=mixc(c,PAL.coast,(hh-(sea-.035))/.035*.75)}
    else{
      const mm=smp(g.m,gw,gh,gx,gy)/255,e=(hh-sea)/(1-sea);
      const t=clamp(.72+ts-la*lat*.75-e*.35,0,1);
      c=PAL.grass;
      c=mixc(c,PAL.steppe,sm01((.44-mm)/.18));
      c=mixc(c,PAL.desert,sm01((.3-mm)/.15)*sm01((t-.42)/.2));
      c=mixc(c,PAL.forest,sm01((mm-.52)/.16));
      c=mixc(c,PAL.jungle,sm01((mm-.7)/.14)*sm01((t-.68)/.15));
      c=mixc(c,PAL.tundra,sm01((.4-t)/.15));
      c=mixc(c,PAL.snow,sm01((.24-t)/.12));
      c=mixc(c,PAL.hills,sm01((e-.32)/.2));
      c=mixc(c,PAL.rock,sm01((e-.58)/.16));
      c=mixc(c,PAL.snow,sm01((e-.8)/.1));
      if(e<.03)c=mixc(c,PAL.sand,(1-e/.03)*.8);
      const dx=(smp(g.h,gw,gh,gx+st,gy)-smp(g.h,gw,gh,gx-st,gy))/255,dy=(smp(g.h,gw,gh,gx,gy+st)-smp(g.h,gw,gh,gx,gy-st))/255;
      const sh=clamp(1-(dx+dy)*5.5,.72,1.28);c=[c[0]*sh,c[1]*sh,c[2]*sh];
      if(e<.01)c=mixc(c,PAL.line,.55);
      md[i]=255;md[i+1]=255;md[i+2]=255;md[i+3]=255}
    const n=(((x*73856093)^(y*19349663))>>>0)%7-3;
    d[i]=c[0]+n;d[i+1]=c[1]+n;d[i+2]=c[2]+n;d[i+3]=255}}
  ctx.putImageData(img,0,0);mctx.putImageData(mimg,0,0);return{cv,mk,W,H,sc}}
const WB={};
function getBase(w,sc){const key=w.tv+'|'+(w.climate||'')+'|'+sc;let b=WB[w.id];if(!b||b.key!==key){b=WB[w.id]=paintBase(w,sc);b.key=key}return b}
function realmFill(w,ctx,sc,sel){
  const realms=w.items.filter(i=>i.t==='realm');if(!realms.length)return;
  const W=Math.round(MW*sc),H=Math.round(MH*sc);const tmp=mkCanvas(W,H),t=tmp.getContext('2d');
  for(const r of realms){const p=r.pts;t.beginPath();p.forEach((q,i)=>i?t.lineTo(q[0]*sc,q[1]*sc):t.moveTo(q[0]*sc,q[1]*sc));t.closePath();t.globalAlpha=.2;t.fillStyle=r.color||'#c4784f';t.fill()}
  t.globalAlpha=1;t.lineJoin='round';t.setLineDash([6*sc,3.5*sc]);
  for(const r of realms){const p=r.pts;t.beginPath();p.forEach((q,i)=>i?t.lineTo(q[0]*sc,q[1]*sc):t.moveTo(q[0]*sc,q[1]*sc));t.closePath();t.strokeStyle=shade(r.color&&/^#/.test(r.color)?r.color:'#c4784f',.55);t.lineWidth=1.6*sc;t.stroke()}
  return tmp}
function compose(w,sc){
  sc=sc||1;const b=getBase(w,sc>=1?1:.5),out=mkCanvas(b.W,b.H),o=out.getContext('2d');o.drawImage(b.cv,0,0);
  const rl=realmFill(w,o,b.sc);
  if(rl){const t=rl.getContext('2d');t.globalCompositeOperation='destination-in';t.drawImage(b.mk,0,0);o.drawImage(rl,0,0)}
  return out}
function paintEditor(w,preview){
  const c=$('#tcv'),out=compose(w,preview?.5:1);c.width=out.width;c.height=out.height;c.getContext('2d').drawImage(out,0,0);
  c.style.width=MW+'px';c.style.height=MH+'px'}
/* glyphes : montagnes et arbres, déterministes */
const GC={};
function glyphPaths(w){
  const key=w.tv+'|'+w.climate;if(GC[w.id]&&GC[w.id].key===key)return GC[w.id].s;
  const g=grid(w),gw=w.gw,gh=w.gh,rg=mkrng(hstr(w.id)),sea=SEA;let mt='',sh='',tr='',n=0;
  const cw=MW/(gw-1),ch=MH/(gh-1),ts={froid:-.24,tempere:0,chaud:.2}[w.climate||'tempere'],la=latFactor(w);
  for(let j=1;j<gh-1&&n<2600;j+=2)for(let i=1;i<gw-1&&n<2600;i+=2){
    const h=g.h[j*gw+i],m=g.m[j*gw+i];if(h<=sea+4)continue;
    const e=(h-sea)/(255-sea),x=(i+rr(rg,-.8,.8))*cw,y=(j+rr(rg,-.8,.8))*ch;const lat=Math.abs(2*y/MH-1),t=.72+ts-la*lat*.75-e*.35;
    if(e>.42&&rg()<.55+e*.4){const s=3.2+e*5;mt+=`M${fx(x-s)} ${fx(y+s*.55)}L${fx(x)} ${fx(y-s)}L${fx(x+s)} ${fx(y+s*.55)}`;sh+=`M${fx(x)} ${fx(y-s)}L${fx(x+s*.45)} ${fx(y+s*.55)}L${fx(x+s*.1)} ${fx(y+s*.55)}Z`;n++}
    else if(m>152&&e<.4&&t>.25&&rg()<.5){const s=1.5+rg()*.7;tr+=`M${fx(x-s)} ${fx(y)}a${fx(s)} ${fx(s)} 0 1 0 ${fx(s*2)} 0a${fx(s)} ${fx(s)} 0 1 0 ${fx(-s*2)} 0M${fx(x)} ${fx(y+s)}v${fx(s*.9)}`;n++}}
  const s=`<path d="${mt}" fill="none" stroke="#5b5247" stroke-width="1" stroke-linejoin="round" opacity=".8"/><path d="${sh}" fill="#5b5247" opacity=".35"/><path d="${tr}" fill="#7a9b62" stroke="#3f6335" stroke-width=".6" opacity=".85"/>`;
  GC[w.id]={key,s};return s}
/* lieux */
const CK={capitale:'Capitale',ville:'Ville',village:'Village',hameau:'Hameau',port:'Port',fort:'Forteresse',tour:'Tour',ruine:'Ruines',temple:'Temple',grotte:'Grotte',portail:'Portail'};
function cityGlyph(k,x,y){
  const S='stroke="#2b2623" stroke-width="1.3"',P_='#f4ecd8';
  switch(k){
  case 'hameau':return `<circle cx="${x}" cy="${y}" r="2.3" fill="${P_}" ${S}/>`;
  case 'village':return `<circle cx="${x}" cy="${y}" r="3.4" fill="${P_}" ${S}/><circle cx="${x}" cy="${y}" r="1" fill="#2b2623"/>`;
  case 'ville':return `<rect x="${x-4}" y="${y-4}" width="8" height="8" fill="${P_}" ${S}/><rect x="${x-1.6}" y="${y-1.6}" width="3.2" height="3.2" fill="#2b2623"/>`;
  case 'capitale':{let p='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?3.4:8;p+=(i?'L':'M')+fx(x+Math.cos(a)*r)+' '+fx(y+Math.sin(a)*r)}return `<path d="${p}Z" fill="#e2c26a" ${S} stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="1.6" fill="#8a2f2f"/>`}
  case 'port':return `<circle cx="${x}" cy="${y-3}" r="1.6" fill="none" ${S}/><path d="M${x} ${y-1.4}V${y+5}M${x-3.4} ${y+1.6}Q${x} ${y+6.4} ${x+3.4} ${y+1.6}M${x-2} ${y}H${x+2}" fill="none" ${S}/>`;
  case 'fort':return `<path d="M${x-5} ${y+4}V${y-2}h2V${y-4}h2V${y-2}h2V${y-4}h2V${y-2}h2V${y+4}Z" fill="${P_}" ${S} stroke-linejoin="round"/>`;
  case 'tour':return `<path d="M${x-2.4} ${y+5}V${y-3}h-1.4V${y-5.4}h1.4V${y-4}h1V${y-5.4}h1V${y-4}h1V${y-5.4}h1.4V${y-3}H${x+2.4}V${y+5}Z" fill="${P_}" ${S} stroke-linejoin="round"/>`;
  case 'ruine':return `<path d="M${x-5} ${y+4}V${y-1}l2-3l2 2v2M${x+1} ${y+4}V${y-3}l2-2l2 3V${y+4}M${x-5} ${y+4}H${x+5}" fill="none" ${S}/>`;
  case 'temple':return `<path d="M${x-5} ${y-1}L${x} ${y-5}L${x+5} ${y-1}Z M${x-4} ${y-1}V${y+4}M${x-1.3} ${y-1}V${y+4}M${x+1.3} ${y-1}V${y+4}M${x+4} ${y-1}V${y+4}M${x-5} ${y+4}H${x+5}" fill="${P_}" ${S} stroke-linejoin="round"/>`;
  case 'grotte':return `<path d="M${x-5} ${y+3}Q${x-5} ${y-5} ${x} ${y-5}Q${x+5} ${y-5} ${x+5} ${y+3}Z" fill="#6d6354" ${S}/><path d="M${x-2} ${y+3}Q${x-2} ${y-1} ${x} ${y-1}Q${x+2} ${y-1} ${x+2} ${y+3}Z" fill="#2b2623"/>`;
  case 'portail':return `<circle cx="${x}" cy="${y}" r="5" fill="none" ${S}/><circle cx="${x}" cy="${y}" r="2.4" fill="#8a6bb5" ${S}/>`}
  return `<circle cx="${x}" cy="${y}" r="3" fill="${P_}" ${S}/>`}
const halo='stroke="rgba(244,236,216,.92)" stroke-width="3" paint-order="stroke" stroke-linejoin="round"';
const RLC={};
function realmLab(r,w){
  if(r.lx!=null)return[r.lx,r.ly];w=w||CW();const key=w.tv+'|'+r.pts.length+'|'+r.pts[0]+'|'+r.pts[r.pts.length-1]+'|'+(r.pts[1]||''),c=RLC[r.id];if(c&&c.key===key)return c.v;
  const g=grid(w),cw=MW/(w.gw-1),ch=MH/(w.gh-1);let sx=0,sy=0,n=0;const b=bbox(r.pts);
  for(let j=Math.max(0,Math.floor(b.y0/ch));j<=Math.min(w.gh-1,Math.ceil(b.y1/ch));j+=2)for(let i=Math.max(0,Math.floor(b.x0/cw));i<=Math.min(w.gw-1,Math.ceil(b.x1/cw));i+=2){if(g.h[j*w.gw+i]<=SEA)continue;const x=i*cw,y=j*ch;if(inPoly(x,y,r.pts)){sx+=x;sy+=y;n++}}
  let v;if(n>3)v=[sx/n,sy/n];else{const q=clipRect(r.pts,0,0,MW,MH),p=q.length?q:r.pts;v=[p.reduce((a,t)=>a+t[0],0)/p.length,p.reduce((a,t)=>a+t[1],0)/p.length]}
  const fs=clamp(Math.sqrt(polyArea(r.pts))/9,11,34),hw=(r.name||'').length*fs*.45;v=[clamp(v[0],hw+8,MW-hw-8),clamp(v[1],fs,MH-fs)];RLC[r.id]={key,v};return v}
function worldVector(w,o={}){
  let s=`<defs><clipPath id="wclip"><rect x="0" y="0" width="${MW}" height="${MH}"/></clipPath></defs><g clip-path="url(#wclip)">`;const it=w.items;
  if(w.glyph!==false)s+=glyphPaths(w);
  for(const r of it.filter(i=>i.t==='river'))s+=`<path d="${pathD(smooth(r.pts,5))}" fill="none" stroke="#5f8fa6" stroke-width="${r.w||1.4}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for(const r of it.filter(i=>i.t==='road'))s+=`<path d="${pathD(smooth(r.pts,5))}" fill="none" stroke="#7a5a3a" stroke-width="${r.k==='sentier'?.9:1.4}" stroke-dasharray="${r.k==='sentier'?'1.5 3':'5 2.5'}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
  s+=`<g font-family="${FONT}" text-anchor="middle" fill="#2b2623">`;
  for(const r of it.filter(i=>i.t==='realm')){if(!r.name||r.hideName)continue;const a=polyArea(r.pts);const fs=clamp(Math.sqrt(a)/9,11,34);const[lx,ly]=realmLab(r,w);
    s+=`<text x="${fx(lx)}" y="${fx(ly)}" font-size="${fx(fs)}" font-weight="700" letter-spacing="${fx(fs*.22)}" fill="${shade(/^#/.test(r.color||'')?r.color:'#c4784f',.45)}" opacity=".85" ${halo}>${esc(r.name.toUpperCase())}</text>`}
  for(const l of it.filter(i=>i.t==='label')){const st={pays:`font-size="${l.size||24}" font-weight="700" letter-spacing="${(l.size||24)*.25}"`,region:`font-size="${l.size||14}" font-weight="700" letter-spacing="${(l.size||14)*.2}"`,mer:`font-size="${l.size||18}" font-style="italic" letter-spacing="${(l.size||18)*.3}" fill="#3f6f8a"`,montagne:`font-size="${l.size||12}" font-style="italic" fill="#5b5247"`,lieu:`font-size="${l.size||11}" font-weight="700"`}[l.k||'lieu'];
    s+=`<text transform="translate(${fx(l.x)} ${fx(l.y)}) rotate(${l.a||0})" ${st} ${halo}>${esc((l.k==='pays'||l.k==='region')?String(l.text).toUpperCase():l.text)}</text>`}
  for(const c of it.filter(i=>i.t==='city'))s+=cityGlyph(c.k,fx(c.x),fx(c.y));
  s+=wNomsSVG(w,halo);
  s+='</g></g>';return s}
function W_bounds(){return{x0:-30,y0:-30,x1:MW+30,y1:MH+30}}
function W_render(){const w=CW();paintEditor(w,!!ui.wPreview);content.innerHTML=worldVector(w)+`<rect x="0" y="0" width="${MW}" height="${MH}" fill="none" stroke="${INK}" stroke-width="2.5"/>`}
function kmBar(kmu,x,y){const L=[1,2,5,10,20,50,100,200,500,1000,2000,5000,10000];let best=L[L.length-1];for(const l of L)if(l/kmu>=90){best=l;break}const px=best/kmu;
  return `<g stroke="${INK}" stroke-width="2" fill="none"><path d="M${x} ${y}h${px}M${x} ${y-6}v12M${x+px/2} ${y-4}v8M${x+px} ${y-6}v12"/></g><text x="${x}" y="${y+20}" font-family="${FONT}" font-size="11" fill="${INK}">0 · ${best/2} · ${best} km</text>`}
function worldSheet(w){
  const pad=40,hdr=86,ftr=70,TW=MW+pad*2,TH_=MH+hdr+ftr;
  const url=compose(w,1).toDataURL('image/png');
  const s=`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH_}" viewBox="0 0 ${TW} ${TH_}"><rect width="${TW}" height="${TH_}" fill="${PAPER}"/>
<g font-family="${FONT}" fill="${INK}"><text x="${pad}" y="50" font-size="28" font-weight="700" letter-spacing="2">${esc(w.name.toUpperCase())}</text><text x="${pad}" y="72" font-size="13" font-style="italic">${scaleName(w.kmu)} · ${Math.round(MW*w.kmu).toLocaleString('fr-BE')} × ${Math.round(MH*w.kmu).toLocaleString('fr-BE')} km</text></g>
<g transform="translate(${pad} ${hdr})"><image href="${url}" x="0" y="0" width="${MW}" height="${MH}"/>${worldVector(w)}<rect width="${MW}" height="${MH}" fill="none" stroke="${INK}" stroke-width="3"/></g>${kmBar(w.kmu,pad,hdr+MH+32)}${northArrow(TW-pad-6,hdr+MH+8).replace(/y="(\d+)"/,'y="$1"')}</svg>`;
  return{svg:s,w:TW,h:TH_}}
