/* ====== cartes du monde : générateur et zoom ====== */
function vnoise(seed){
  const h=(i,j)=>{let n=Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(seed,1442695041)|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295};
  return(x,y)=>{const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j,a=u*u*(3-2*u),b=v*v*(3-2*v);
    return(h(i,j)*(1-a)+h(i+1,j)*a)*(1-b)+(h(i,j+1)*(1-a)+h(i+1,j+1)*a)*b}}
function fbm(f,x,y,oct=4){let s=0,a=.5,n=0;for(let o=0;o<oct;o++){s+=f(x,y)*a;n+=a;a*=.5;x*=2.03;y*=2.03}return s/n}
const WNM={
  realm(r){const A=['Ael','Thal','Ior','Dar','Sil','Mer','Nor','Eld','Van','Cal','Bry','Os','Fen','Kael','Ys','Mor'],B=['orenn','andor','eth','wyn','aria','umbre','ovia','eland','heim','agne','ance','ois'];return pick(r,A)+pick(r,B)},
  mer(r){return pick(r,['Mer','Mer','Golfe','Océan'])+' '+pick(r,['de la Brume','d\'Ambre','des Tempêtes','Silencieuse','de Cendre','des Marchefleurs','de Verre','du Levant','des Brumes Pâles','des Mille Voiles'])},
  monts(r){return pick(r,['Monts','Crêtes','Pics','Massif'])+' '+pick(r,['du Corbeau','de Fer','Gris','de l\'Aube','des Géants','du Silence','Rouges','de Givre'])},
  poi(r,k){const n=cap(pick(r,['aldric','brume','corne','dun','eryn','fael','gris','hale','ith','vor']));
    return {fort:'Fort '+n,tour:'Tour '+(r()<.5?'de ':'d\'')+n,ruine:'Ruines de '+n,temple:'Temple '+(r()<.5?'de ':'d\'')+n,grotte:'Grotte '+(r()<.5?'de ':'d\'')+n,portail:'Portail '+(r()<.5?'de ':'d\'')+n}[k]||n}
};
const RCOL=['#c4784f','#6f9fb5','#8aa65a','#b58a2e','#9a6fb0','#c25b6a','#4f9a8a','#a08060','#7d86c4'];
function clipHP(pts,nx,ny,d){const out=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];const da=nx*a[0]+ny*a[1]-d,db=nx*b[0]+ny*b[1]-d;
  if(da<=0)out.push(a);if((da<0&&db>0)||(da>0&&db<0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}return out}
function clipRect(pts,x0,y0,x1,y1){let p=pts;p=clipHP(p,-1,0,-x0);if(p.length)p=clipHP(p,1,0,x1);if(p.length)p=clipHP(p,0,-1,-y0);if(p.length)p=clipHP(p,0,1,y1);return p}
const wcw=w=>MW/(w.gw-1),wch=w=>MH/(w.gh-1);
function distField(mask,gw,gh,want){ // distance (cellules) au plus proche pixel dont mask===want
  const D=new Float32Array(gw*gh),INF=1e6;for(let k=0;k<gw*gh;k++)D[k]=mask[k]===want?0:INF;
  for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){const k=j*gw+i;let d=D[k];if(i)d=Math.min(d,D[k-1]+1);if(j)d=Math.min(d,D[k-gw]+1);if(i&&j)d=Math.min(d,D[k-gw-1]+1.41);if(i<gw-1&&j)d=Math.min(d,D[k-gw+1]+1.41);D[k]=d}
  for(let j=gh-1;j>=0;j--)for(let i=gw-1;i>=0;i--){const k=j*gw+i;let d=D[k];if(i<gw-1)d=Math.min(d,D[k+1]+1);if(j<gh-1)d=Math.min(d,D[k+gw]+1);if(i<gw-1&&j<gh-1)d=Math.min(d,D[k+gw+1]+1.41);if(i&&j<gh-1)d=Math.min(d,D[k+gw-1]+1.41);D[k]=d}
  return D}
function genTerrain(w,o){
  const gw=w.gw,gh=w.gh,s=w.seed,n1=vnoise(s),n2=vnoise(s+101),n3=vnoise(s+202),nr=vnoise(s+303),nm=vnoise(s+404),rg=mkrng(s*7+1);
  const type=o.type||'continent';let B=[];
  if(type==='continent')B=[[.5+rr(rg,-.05,.05),.5+rr(rg,-.04,.04),.34,.38]];
  else if(type==='pangee')B=[[.5,.5,.44,.42],[.3,.5,.2,.3],[.7,.45,.22,.3]];
  else if(type==='continents'){const n=ri(rg,3,4);for(let i=0;i<n;i++)B.push([.14+.72*(i+rr(rg,.1,.9))/n,rr(rg,.28,.72),rr(rg,.13,.2),rr(rg,.2,.34)])}
  else if(type==='archipel'){for(let i=0;i<9;i++)B.push([rr(rg,.12,.88),rr(rg,.15,.85),rr(rg,.07,.15),rr(rg,.08,.18)])}
  else{for(let i=0;i<24;i++)B.push([rr(rg,.06,.94),rr(rg,.08,.92),rr(rg,.03,.07),rr(rg,.04,.09)])}
  const N=gw*gh,V=new Float32Array(N),R=new Float32Array(N);
  for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){const fxn=i/(gw-1),fyn=j/(gh-1),ux=i/gw*8,uy=j/gw*8;
    const wx=fxn+(n3(ux*.5,uy*.5)-.5)*.16,wy=fyn+(n2(ux*.5+9,uy*.5+9)-.5)*.16;let sh=-1;
    for(const b of B){sh=Math.max(sh,1-(((wx-b[0])/b[2])**2+((wy-b[1])/b[3])**2))}
    sh=Math.max(sh,-.6);let v=sh*(type==='iles'||type==='archipel'?.75:.95)+(fbm(n1,ux,uy,5)-.5)*(type==='iles'?1.3:.95);
    const e=Math.min(fxn,1-fxn,fyn,1-fyn);if(e<.04)v-=(.04-e)*22;V[j*gw+i]=v;{const qx=ux*.6+(n2(ux*.4+3,uy*.4+3)-.5)*2.2,qy=uy*.6+(n3(ux*.4+7,uy*.4+7)-.5)*2.2;R[j*gw+i]=1-Math.abs(2*fbm(nr,qx,qy,3)-1)}}
  const sorted=Float32Array.from(V).sort(),land={peu:.2,moyen:.33,beaucoup:.48}[o.land||'moyen'];
  const thr=sorted[Math.floor((1-land)*(N-1))],vmin=sorted[0],vmax=sorted[N-1];
  const h=new Uint8Array(N),m=new Uint8Array(N),mask=new Uint8Array(N);
  for(let k=0;k<N;k++){const v=V[k];if(v<thr){h[k]=Math.round(SEA*.18+(v-vmin)/(thr-vmin)*SEA*.8);mask[k]=0}else{const t=(v-thr)/(vmax-thr+1e-6);const e=Math.pow(t,1.25)*.5+Math.pow(R[k],2.2)*.5*clamp(t*2.4,0,1);h[k]=Math.round(clamp(SEA+2+e*(253-SEA),SEA+1,255));mask[k]=1}}
  const D=distField(mask,gw,gh,0),cl={froid:-.08,tempere:0,chaud:-.05}[o.climate||'tempere'];
  for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){const k=j*gw+i,lat=Math.abs(2*j/(gh-1)-1);
    const v=fbm(nm,i/gw*7+40,j/gw*7+40,4)*.62+Math.exp(-D[k]/14)*.3+(1-lat)*.12+cl+(o.climate==='chaud'?-.06:0);m[k]=Math.round(clamp(v,0,1)*255);if(!mask[k])m[k]=130}
  w.seed=s;w.climate=o.climate||'tempere';setGrid(w,h,m);return{mask}}
function wLandAt(w,x,y){const g=grid(w);return smp(g.h,w.gw,w.gh,x/wcw(w),y/wch(w))>SEA+1}
function genRivers(w,rg,count){
  const g=grid(w),gw=w.gw,gh=w.gh,hs=new Float32Array(gw*gh);
  for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){let s=0,n=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const a=i+di,b=j+dj;if(a>=0&&b>=0&&a<gw&&b<gh){s+=g.h[b*gw+a];n++}}hs[j*gw+i]=s/n+(rg()-.5)*.4}
  const cands=[];for(let j=2;j<gh-2;j++)for(let i=2;i<gw-2;i++){const h=g.h[j*gw+i],m=g.m[j*gw+i];if(h>SEA+38&&h<235&&m>90)cands.push([i,j,h+m*.5+rg()*40])}
  cands.sort((a,b)=>b[2]-a[2]);const taken=new Set(),out=[],srcs=[];const cw=wcw(w),ch=wch(w);
  for(const c of cands){if(out.length>=count)break;if(srcs.some(s=>Math.hypot(s[0]-c[0],s[1]-c[1])<16))continue;
    let i=c[0],j=c[1];const path=[[i,j]];const seen=new Set([j*gw+i]);let ended=false;
    for(let st=0;st<420;st++){let bi=-1,bj=-1,bh=hs[j*gw+i];
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=gw||b>=gh)continue;const hh=hs[b*gw+a];if(hh<bh&&!seen.has(b*gw+a)){bh=hh;bi=a;bj=b}}
      if(bi<0)break;i=bi;j=bj;seen.add(j*gw+i);path.push([i,j]);
      if(g.h[j*gw+i]<=SEA){ended=true;break}
      if(taken.has(j*gw+i)){ended=true;break}}
    if(!ended||path.length<12)continue;
    srcs.push(c);path.forEach(p=>taken.add(p[1]*gw+p[0]));
    const pts=path.filter((p,k)=>k%2===0||k===path.length-1).map(p=>[fx(p[0]*cw),fx(p[1]*ch)]);out.push({t:'river',id:uid(),pts,w:1.4})}
  return out}
const POIK=['fort','tour','ruine','temple','grotte'];
function placeCities(w,rg,count,opts={}){
  const g=grid(w),gw=w.gw,gh=w.gh,cw=wcw(w),ch=wch(w),N=gw*gh,mask=new Uint8Array(N);
  for(let k=0;k<N;k++)mask[k]=g.h[k]>SEA?1:0;const D=distField(mask,gw,gh,0);
  const riv=new Set();w.items.filter(i=>i.t==='river').forEach(r=>r.pts.forEach(p=>riv.add(Math.round(p[1]/ch)*gw+Math.round(p[0]/cw))));
  const nearRiv=(i,j)=>{for(let dj=-3;dj<=3;dj++)for(let di=-3;di<=3;di++)if(riv.has((j+dj)*gw+i+di))return true;return false};
  const ex=w.items.filter(i=>i.t==='city').map(c=>[c.x,c.y]);
  const cand=[];for(let j=3;j<gh-3;j+=2)for(let i=3;i<gw-3;i+=2){const k=j*gw+i,h=g.h[k];if(h<=SEA+3)continue;const e=(h-SEA)/(255-SEA);if(e>.5)continue;
    const m=g.m[k]/255;let sc=1+(D[k]<=2.5?.9:0)+(nearRiv(i,j)?1:0)+m*.6-e*1.4+rg()*.9;if(m<.18)sc-=.8;cand.push([i*cw,j*ch,sc,D[k]<=2.5])}
  cand.sort((a,b)=>b[2]-a[2]);const mind=opts.minD||Math.sqrt(MW*MH/Math.max(count,1))*.62,out=[];
  for(const c of cand){if(out.length>=count)break;if(ex.some(p=>Math.hypot(p[0]-c[0],p[1]-c[1])<mind)||out.some(p=>Math.hypot(p.x-c[0],p.y-c[1])<mind))continue;out.push({t:'city',id:uid(),x:fx(c[0]),y:fx(c[1]),k:'village',coast:c[3],name:''})}
  return out}
function kindCities(w,rg,cs){
  const big=w.kmu>=20;cs.sort((a,b)=>0);const n=cs.length;
  cs.forEach((c,i)=>{const r=i/n;let k;if(big)k=r<.6?'ville':'village';else k=r<.22?'ville':r<.6?'village':'hameau';
    if(c.coast&&(k==='ville'||k==='village')&&rg()<.55)k='port';c.k=k;c.name=NM.village(rg);delete c.coast});
  const used=new Set(w.items.filter(i=>i.t==='city').map(c=>c.name));cs.forEach(c=>{let t=0;while(used.has(c.name)&&t++<8)c.name=NM.village(rg);used.add(c.name)})}
function genRoads(w,rg){
  const cs=w.items.filter(i=>i.t==='city'&&!POIK.includes(i.k)&&i.k!=='portail'),out=[],pairs=new Set();const maxd=MW*(w.kmu>=20?.2:.24);
  const ok=(a,b)=>{const L=Math.hypot(b.x-a.x,b.y-a.y),n=Math.ceil(L/4),g=grid(w);for(let i=1;i<n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;const h=smp(g.h,w.gw,w.gh,x/wcw(w),y/wch(w));if(h<=SEA+1||h>200)return false}return true};
  for(const a of cs){const near=cs.filter(b=>b!==a).map(b=>[b,Math.hypot(a.x-b.x,a.y-b.y)]).filter(q=>q[1]<maxd).sort((p,q)=>p[1]-q[1]).slice(0,2);
    for(const[b,d]of near){const key=[a.id,b.id].sort().join('|');if(pairs.has(key))continue;if(!ok(a,b))continue;pairs.add(key);
      const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,nx=-(b.y-a.y)/d,ny=(b.x-a.x)/d,j=rr(rg,-d*.1,d*.1);
      out.push({t:'road',id:uid(),k:rg()<.7?'route':'sentier',pts:[[a.x,a.y],[fx(mx+nx*j),fx(my+ny*j)],[b.x,b.y]]})}}
  return out}
function genRealms(w,rg,n){
  const cs=w.items.filter(i=>i.t==='city'&&['ville','village','port'].includes(i.k));if(n<1||cs.length<n)n=Math.min(n,cs.length);if(n<1)return[];
  const seeds=[pick(rg,cs)];while(seeds.length<n){let best=null,bd=-1;for(const c of cs){const d=Math.min(...seeds.map(s=>Math.hypot(s.x-c.x,s.y-c.y)));if(d>bd){bd=d;best=c}}seeds.push(best)}
  const nw1=vnoise(w.seed+55),nw2=vnoise(w.seed+66),warp=p=>[p[0]+(nw1(p[0]/90,p[1]/90)-.5)*26,p[1]+(nw2(p[0]/90,p[1]/90)-.5)*26];
  const out=[];seeds.forEach((s,i)=>{s.k='capitale';let poly=[[-80,-80],[MW+80,-80],[MW+80,MH+80],[-80,MH+80]];
    for(const o of seeds){if(o===s)continue;const nx=o.x-s.x,ny=o.y-s.y,d=(nx*(o.x+s.x)/2+ny*(o.y+s.y)/2);poly=clipHP(poly,nx,ny,d);if(!poly.length)break}
    if(poly.length<3)return;const dense=[];for(let a=0;a<poly.length;a++){const p=poly[a],q=poly[(a+1)%poly.length],L=Math.hypot(q[0]-p[0],q[1]-p[1]),k=Math.max(1,Math.ceil(L/20));for(let t=0;t<k;t++)dense.push(warp([p[0]+(q[0]-p[0])*t/k,p[1]+(q[1]-p[1])*t/k]).map(fx))}
    out.push({t:'realm',id:uid(),name:WNM.realm(rg),color:RCOL[i%RCOL.length],pts:dense})});
  weldRealms({items:out});
  return out}
function seaLabels(w,rg,n){
  const g=grid(w),gw=w.gw,gh=w.gh,N=gw*gh,mask=new Uint8Array(N);for(let k=0;k<N;k++)mask[k]=g.h[k]>SEA?1:0;const D=distField(mask,gw,gh,1);
  const out=[],cs=[];for(let j=4;j<gh-4;j+=2)for(let i=6;i<gw-6;i+=2)if(!mask[j*gw+i])cs.push([i,j,D[j*gw+i]]);cs.sort((a,b)=>b[2]-a[2]);const ch=[];
  for(const c of cs){if(ch.length>=n||c[2]<7)break;if(ch.some(p=>Math.hypot(p[0]-c[0],p[1]-c[1])<45))continue;ch.push(c);const tx=WNM.mer(rg),sz=clamp(c[2]*1.6,14,28),hw=tx.length*sz*.36;out.push({t:'label',id:uid(),k:'mer',text:tx,x:fx(clamp(c[0]*wcw(w),hw+12,MW-hw-12)),y:fx(c[1]*wch(w)),size:sz,a:fx(rr(rg,-6,6))})}
  return out}
function genWorld(w,o={}){
  o={type:'continent',land:'moyen',climate:'tempere',realms:5,places:'moyen',rivers:'moyen',seed:w.seed,...o};
  w.seed=o.seed;const rg=mkrng(w.seed*31+7);genTerrain(w,o);w.items=[];
  const big=w.kmu>=20,mid=w.kmu>=3;
  const rc={peu:.5,moyen:1,beaucoup:1.8}[o.rivers]||1;w.items.push(...genRivers(w,rg,Math.round((big?6:mid?13:w.kmu>=.5?9:6)*rc)));
  const pc={peu:.6,moyen:1,beaucoup:1.6}[o.places]||1,cnt=Math.round((big?14:mid?24:w.kmu>=.5?16:10)*pc);
  const cs=placeCities(w,rg,cnt);kindCities(w,rg,cs);w.items.push(...cs);
  const R=genRealms(w,rg,o.realms|0);w.items.unshift(...R);
  w.items.push(...genRoads(w,rg));
  if(!big){const poi=placeCities(w,rg,ri(rg,3,6),{minD:30});poi.forEach(p=>{p.k=pick(rg,POIK);p.name=WNM.poi(rg,p.k);delete p.coast});w.items.push(...poi)}
  w.items.push(...seaLabels(w,rg,big?3:2));
  const g=grid(w);let bi=0,bh=0;for(let k=0;k<g.h.length;k++)if(g.h[k]>bh){bh=g.h[k];bi=k}
  if(bh>SEA+90)w.items.push({t:'label',id:uid(),k:'montagne',text:WNM.monts(rg),x:fx((bi%w.gw)*wcw(w)),y:fx(Math.floor(bi/w.gw)*wch(w)-12),size:big?16:12,a:-4});
  w.glyph=true;return w}
function populate(w,n){const rg=mkrng(Math.floor(Math.random()*1e9));const cs=placeCities(w,rg,n,{minD:22});
  cs.forEach((c,i)=>{c.k=i<2&&w.kmu<3?'village':rg()<.65?'hameau':'village';if(c.coast&&rg()<.4)c.k='port';c.name=NM.village(rg);delete c.coast});w.items.push(...cs);return cs.length}
/* ---- zoom : création d'une carte détaillée à partir d'une zone ---- */
function zoomInto(w,box,name){
  const c=mkW(name||'Carte détaillée',w.kmu*box.w/MW);c.climate=w.climate;c.glyph=w.glyph;c.parent={id:w.id,box:{x:fx(box.x),y:fx(box.y),w:fx(box.w),h:fx(box.h)}};
  const g=grid(w),gw=c.gw,gh=c.gh,N=gw*gh,h=new Uint8Array(N),m=new Uint8Array(N),zf=MW/box.w;
  const nz=vnoise(c.seed),nz2=vnoise(c.seed+9),nz3=vnoise(c.seed+19),amp=Math.min(70,12+Math.log2(Math.max(1,zf))*15);
  for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){const px=box.x+i/(gw-1)*box.w,py=box.y+j/(gh-1)*box.h,gx=px/MW*(w.gw-1),gy=py/MH*(w.gh-1);
    const hh=smp(g.h,w.gw,w.gh,gx,gy),mm=smp(g.m,w.gw,w.gh,gx,gy),k=Math.exp(-(((hh-SEA)/38)**2))*.65+.35;
    let v=hh+(fbm(nz,i*.17,j*.17,5)-.5)*2*amp*k;if(hh>SEA+60)v+=(1-Math.abs(2*nz3(i*.12,j*.12)-1)-.5)*amp*.9;
    h[j*gw+i]=clamp(Math.round(v),1,255);m[j*gw+i]=clamp(Math.round(mm+(fbm(nz2,i*.1,j*.1,3)-.5)*70),0,255)}
  setGrid(c,h,m);
  const tx=x=>fx((x-box.x)/box.w*MW),ty=y=>fx((y-box.y)/box.h*MH),inb=(x,y,mg=6)=>x>=box.x-mg&&x<=box.x+box.w+mg&&y>=box.y-mg&&y<=box.y+box.h+mg;
  const wf=Math.min(2.4,1+Math.log2(Math.max(1,zf))*.3);
  for(const it of w.items){
    if(it.t==='city'||it.t==='label'){if(inb(it.x,it.y,0))c.items.push({...JSON.parse(JSON.stringify(it)),id:uid(),x:tx(it.x),y:ty(it.y)})}
    else if(it.t==='river'||it.t==='road'){let run=[];const flush=()=>{if(run.length>1)c.items.push({...JSON.parse(JSON.stringify(it)),id:uid(),pts:run,w:it.w?fx(it.w*wf):it.w});run=[]};
      for(let i=0;i<it.pts.length-1;i++){const s=clipSeg(it.pts[i],it.pts[i+1],box);if(!s){flush();continue}const a=[tx(s[0][0]),ty(s[0][1])],b2=[tx(s[1][0]),ty(s[1][1])];if(!run.length)run.push(a);else if(Math.hypot(run[run.length-1][0]-a[0],run[run.length-1][1]-a[1])>.5){flush();run.push(a)}run.push(b2)}flush()}
    else if(it.t==='realm'){const q=clipRect(it.pts,box.x,box.y,box.x+box.w,box.y+box.h);if(q.length>=3&&polyArea(q)>40)c.items.push({...JSON.parse(JSON.stringify(it)),id:uid(),link:undefined,pts:q.map(p=>[tx(p[0]),ty(p[1])])})}}
  const have=c.items.filter(i=>i.t==='city').length;populate(c,Math.max(4,Math.round(14*Math.min(1,zf/3))-have));
  P.worlds.push(c);return c}
function clipSeg(p,q,b){let t0=0,t1=1;const dx=q[0]-p[0],dy=q[1]-p[1];for(const[pp,qq]of[[-dx,p[0]-b.x],[dx,b.x+b.w-p[0]],[-dy,p[1]-b.y],[dy,b.y+b.h-p[1]]]){if(pp===0){if(qq<0)return null}else{const r=qq/pp;if(pp<0){if(r>t1)return null;if(r>t0)t0=r}else{if(r<t0)return null;if(r<t1)t1=r}}}return[[p[0]+dx*t0,p[1]+dy*t0],[p[0]+dx*t1,p[1]+dy*t1]]}
function boxForRealm(r){const b=bbox(r.pts);let cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,w=Math.max(b.x1-b.x0,(b.y1-b.y0)*MW/MH)*1.12,h=w*MH/MW;w=Math.min(w,MW);h=w*MH/MW;cx=clamp(cx,w/2,MW-w/2);cy=clamp(cy,h/2,MH-h/2);return{x:cx-w/2,y:cy-h/2,w,h}}
