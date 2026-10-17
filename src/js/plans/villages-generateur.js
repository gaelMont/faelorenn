/* ====== villages : générateur ====== */
function genVillage(V,o){
  const rg=mkrng((o.seed||1)*7919+13);
  const SZ={hameau:{W:260,H:200,n:14,R:55,fs:.6},village:{W:400,H:300,n:42,R:95,fs:1},bourg:{W:560,H:420,n:95,R:145,fs:1.4},ville:{W:800,H:600,n:190,R:225,fs:1.8}}[o.size]||{W:400,H:300,n:42,R:95,fs:1};
  const W=SZ.W,H=SZ.H,R=SZ.R;V.W=W;V.H=H;V.seed=o.seed;
  const cx=W/2+rr(rg,-W*.05,W*.05),cy=H/2+rr(rg,-H*.05,H*.05);
  const items=[],blds=[],roads=[],rsm=[],lakes=[];let riv=null,plaza=null;
  const add=it=>{it.id=uid();items.push(it);return it};
  const norm=a=>{let d=deg(a);while(d>90)d-=180;while(d<=-90)d+=180;return Math.round(d)};
  /* eau */
  if(o.river!=='aucune'){
    const side=rg()<.5?-1:1,x0=cx+side*rr(rg,R*.55,R*.8),N=14,ph=rg()*6,w=o.river==='ruisseau'?4:ri(rg,9,13);
    const pts=[];for(let i=0;i<=N;i++)pts.push([fx(x0+Math.sin(i*.7+ph)*14+Math.sin(i*1.9+ph)*5+(i-N/2)*rr(rg,-1,1)*2),fx(-10+(H+20)*i/N)]);
    riv=add({t:'river',pts,w});riv.sm=smooth(pts,4);
    if(o.river==='lake'||o.river==='lac'){const lx=x0-side*rr(rg,35,55),ly=H*rr(rg,.7,.85),lr=rr(rg,22,34);const lp=[];for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=lr*rr(rg,.75,1.15);lp.push([fx(lx+Math.cos(a)*r*1.3),fx(ly+Math.sin(a)*r)])}
      const lake=add({t:'poly',k:'lac',pts:lp});lakes.push(lake.pts)}}
  /* routes */
  const mkRoad=(pts,k)=>{const r=add({t:'road',pts,k,w:RDK[k].w});roads.push(r);rsm.push(smooth(pts,4));return r};
  const ys=cy+rr(rg,-18,18);
  const mainPts=[[-10,ys+rr(rg,-30,30)],[W*.25,ys+rr(rg,-18,18)],[cx,cy+rr(rg,-8,8)],[W*.75,cy+rr(rg,-20,20)],[W+10,cy+rr(rg,-35,35)]].map(p=>[fx(p[0]),fx(p[1])]);
  mkRoad(mainPts,'route');
  const nsec={hameau:2,village:4,bourg:8,ville:13}[o.size]||4;
  for(let n=0;n<nsec;n++){
    const pi=n<3?0:Math.floor(rg()*roads.length),par=rsm[pi],L=polyLen(par);const s=rr(rg,L*.18,L*.82);const p=polyAt(par,s);
    if(Math.hypot(p.x-cx,p.y-cy)>R*1.25)continue;
    let ang=p.a+(rg()<.5?1:-1)*Math.PI/2+rr(rg,-.35,.35);const len=rr(rg,35,R*1.1);const pts=[[p.x,p.y]];let x=p.x,y=p.y;
    for(let d=0;d<len;d+=16){ang+=rr(rg,-.22,.22);x+=Math.cos(ang)*16;y+=Math.sin(ang)*16;
      if(x<12||x>W-12||y<12||y>H-12)break;if(riv&&dpoly(x,y,riv.sm,false).d<riv.w/2+5)break;if(lakes.some(l=>inPoly(x,y,l)))break;pts.push([fx(x),fx(y)])}
    if(pts.length>=3)mkRoad(pts,pi===0?'chemin':'ruelle')}
  /* place */
  {const m=polyAt(rsm[0],(()=>{let best=0,bd=1e9;const L=polyLen(rsm[0]);for(let s=0;s<L;s+=5){const q=polyAt(rsm[0],s);const d=Math.hypot(q.x-cx,q.y-cy);if(d<bd){bd=d;best=s}}return best})());
    const pr=o.size==='hameau'?9:rr(rg,13,19),pp=[];for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=pr*rr(rg,.92,1.08);pp.push([fx(m.x+Math.cos(a)*r),fx(m.y+Math.sin(a)*r)])}
    plaza=add({t:'poly',k:'place',pts:pp});plaza.c=[m.x,m.y];plaza.r=pr}
  /* contrôle de placement */
  const ok=(b,margin=1.4,okPlaza=false)=>{
    const P=rectPts(b.x,b.y,b.w,b.h,b.a);
    if(P.some(p=>p[0]<8||p[0]>W-8||p[1]<8||p[1]>H-8))return false;
    const rb=Math.max(b.w,b.h);
    for(const q of blds)if(Math.hypot(q.x-b.x,q.y-b.y)<(Math.max(q.w,q.h)+rb)/2+margin+1&&satOverlap(P,rectPts(q.x,q.y,q.w,q.h,q.a),margin))return false;
    for(const q of [...P,[b.x,b.y]]){
      for(let i=0;i<roads.length;i++)if(dpoly(q[0],q[1],rsm[i],false).d<roads[i].w/2+1.3)return false;
      if(riv&&dpoly(q[0],q[1],riv.sm,false).d<riv.w/2+2.5)return false;
      if(lakes.some(l=>inPoly(q[0],q[1],l)))return false;
      if(!okPlaza&&plaza&&Math.hypot(q[0]-plaza.c[0],q[1]-plaza.c[1])<plaza.r+1)return false}
    return true};
  const angleAt=(x,y)=>{let best=0,bd=1e9;for(let i=0;i<roads.length;i++){const r=dpoly(x,y,rsm[i],false);if(r.d<bd){bd=r.d;const a=rsm[i][r.i],b=rsm[i][r.i+1];best=Math.atan2(b[1]-a[1],b[0]-a[0])}}return norm(best)};
  const vary=(k,w,h)=>({w:Math.max(2,Math.round(w*rr(rg,.88,1.15)*2)/2),h:Math.max(2,Math.round(h*rr(rg,.88,1.15)*2)/2)});
  const addB=(k,x,y,a,name,sz)=>{const d=VKD[k],v=sz||vary(k,d.w,d.h);const b={t:'bld',k,x:fx(x),y:fx(y),w:v.w,h:v.h,a,name:name||'',link:''};blds.push(add(b));return b};
  const trySpecial=(k,ax,ay,r0,r1,name,okP=false,fixedAngle)=>{
    const d=VKD[k];for(let t=0;t<90;t++){const a=rg()*Math.PI*2,r=rr(rg,r0,r1);const x=ax+Math.cos(a)*r,y=ay+Math.sin(a)*r;const ang=fixedAngle??angleAt(x,y);
      const b={x,y,w:d.w,h:d.h,a:ang};if(ok(b,2.5,okP))return addB(k,x,y,ang,name,{w:d.w,h:d.h})}return null};
  const marks=[];const mark=(b,txt)=>{if(b)marks.push([b,txt])};
  /* bâtiments spéciaux */
  addB('puits',plaza.c[0],plaza.c[1],0,'');blds[blds.length-1].show=false;
  const pcx=plaza.c[0],pcy=plaza.c[1];
  const church=trySpecial(o.size==='hameau'?'chapelle':'eglise',pcx,pcy,plaza.r+14,plaza.r+30,(o.size==='hameau'?'Chapelle ':'Église ')+pick(rg,['Saint-Aubin','Sainte-Odile','Saint-Léger','Saint-Cyr','de la Brume','des Marchefleurs']));mark(church,church&&church.name);
  if(church&&o.size!=='hameau'){
    const cp=[];const gx=church.x+Math.cos(rad(church.a+90))*(church.w/2+14),gy=church.y+Math.sin(rad(church.a+90))*(church.w/2+14);
    if(!blds.some(q=>Math.hypot(q.x-gx,q.y-gy)<12)&&ok({x:gx,y:gy,w:14,h:10,a:church.a},0.5)){for(let i=0;i<6;i++){const a=i/6*Math.PI*2;cp.push([fx(gx+Math.cos(a)*9),fx(gy+Math.sin(a)*6.5)])}add({t:'poly',k:'cimetiere',pts:cp})}}
  const tav=trySpecial('taverne',pcx,pcy,plaza.r+10,plaza.r+24,NM.tavern(rg));mark(tav,tav&&tav.name);
  if(o.size!=='hameau'){const hl=trySpecial('halle',pcx,pcy,plaza.r+12,plaza.r+28,'Halle du marché');mark(hl,hl&&hl.name)}
  /* maisons le long des routes */
  const wts=(d)=>{const t=d/R;return t<.35?[['maison',.3],['boutique',.22],['grande',.15],['chaumiere',.1],['maison',.23]]:t<.8?[['maison',.38],['chaumiere',.24],['grande',.1],['boutique',.08],['ferme',.1],['etable',.04],['grange',.06]]:[['chaumiere',.34],['ferme',.28],['maison',.2],['grange',.12],['etable',.06]]};
  const pickK=d=>{let r=rg(),a=0;for(const[k,w]of wts(d)){a+=w;if(r<=a)return k}return 'maison'};
  const passB=(maxN,dmin,dmax,prob,farmish)=>{
    let placed=0;const order=roads.map((_,i)=>i).sort((a,b)=>a-b);
    for(let guard=0;guard<4&&placed<maxN;guard++)for(const ri_ of order){
      const sm=rsm[ri_],L=polyLen(sm),rw=roads[ri_].w;
      for(let s=rr(rg,2,8);s<L-3&&placed<maxN;s+=rr(rg,7,11)){
        const p=polyAt(sm,s),d=Math.hypot(p.x-cx,p.y-cy);if(d<dmin||d>dmax)continue;
        const pr=farmish?prob:clamp(1.15-d/R,.15,1)*prob;
        for(const side of [-1,1]){if(rg()>pr||placed>=maxN)continue;
          let k=pickK(farmish?R*1.2:d);const dd=VKD[k];let w=dd.w,h=dd.h;if(rg()<.5)[w,h]=[h,w];const v=vary(k,w,h);
          const off=rw/2+2.4+v.h/2+rr(rg,0,2.5);const nx=-Math.sin(p.a)*side,ny=Math.cos(p.a)*side;
          const x=p.x+nx*off,y=p.y+ny*off,a=norm(p.a);
          if(ok({x,y,w:v.w,h:v.h,a},1.6)){addB(k,x,y,a,'',v);placed++}}}}
    return placed};
  passB(SZ.n,0,R*1.2,1,false);
  /* spécialistes */
  const boutiqueNames=['Apothicaire','Boulangerie','Tisserand','Cordonnier','Herboriste','Boucherie','Bureau de poste','Chandelier'];
  let bi=0;for(const b of blds)if(b.k==='boutique'&&bi<3&&o.size!=='hameau'){b.name=boutiqueNames[(bi+Math.floor(rg()*5))%boutiqueNames.length];bi++;mark(b,b.name)}
  if(o.size!=='hameau'){const fg=trySpecial('forge',cx,cy,R*.3,R*.7,'Forge de '+NM.pnj(rg).split(' ')[0]);mark(fg,fg&&fg.name)}
  if(riv&&o.size!=='hameau'){ // moulin au bord de l'eau
    for(let t=0;t<40;t++){const s=rr(rg,polyLen(riv.sm)*.3,polyLen(riv.sm)*.7),p=polyAt(riv.sm,s),side=rg()<.5?-1:1;const off=riv.w/2+7;const x=p.x-Math.sin(p.a)*side*off,y=p.y+Math.cos(p.a)*side*off,a=norm(p.a);
      if(Math.hypot(x-cx,y-cy)<R*1.3&&ok({x,y,w:8,h:9,a},2,false)){const m=addB('moulin',x,y,a,'Moulin de '+NM.pnj(rg).split(' ')[0],{w:8,h:9});mark(m,m.name);break}}}
  if(o.size==='bourg'||o.size==='ville'||(o.size==='village'&&rg()<.35)){const mn=trySpecial('manoir',cx,cy,R*.5,R*1.0,'Manoir de '+NM.pnj(rg).split(' ')[0]);mark(mn,mn&&mn.name)}
  /* enceinte */
  let wk=o.wall==='auto'?({hameau:'aucune',village:rg()<.4?'palissade':'aucune',bourg:'palissade',ville:'rempart'}[o.size]):o.wall;
  let hullPts=null;
  if(wk!=='aucune'){
    const pts=[];for(const b of blds)for(const q of rectPts(b.x,b.y,b.w,b.h,b.a))pts.push(q);
    let hl=hull(pts);const c=hl.reduce((a,p)=>[a[0]+p[0]/hl.length,a[1]+p[1]/hl.length],[0,0]);
    hl=hl.map(p=>{const dx=p[0]-c[0],dy=p[1]-c[1],l=Math.hypot(dx,dy)||1;return[fx(clamp(p[0]+dx/l*16,10,W-10)),fx(clamp(p[1]+dy/l*16,10,H-10))]});
    // simplifier : ne garder que les sommets espacés
    const simp=[];for(const p of hl){if(!simp.length||Math.hypot(p[0]-simp[simp.length-1][0],p[1]-simp[simp.length-1][1])>(wk==='rempart'?32:20))simp.push(p)}
    hullPts=simp.length>=3?simp:hl;
    const w=add({t:'wall',pts:hullPts,closed:true,k:wk,towers:true});
    for(let i=0;i<roads.length;i++){const sm=rsm[i];let n=0;for(let j=0;j<sm.length-1&&n<2;j++)for(let e=0;e<hullPts.length;e++){const x=segInt(sm[j],sm[j+1],hullPts[e],hullPts[(e+1)%hullPts.length]);if(x){const ea=Math.atan2(hullPts[(e+1)%hullPts.length][1]-hullPts[e][1],hullPts[(e+1)%hullPts.length][0]-hullPts[e][0]);
      if(!(riv&&dpoly(x.x,x.y,riv.sm,false).d<riv.w/2+8)){const g=addB('porte',x.x,x.y,norm(ea),'',{w:wk==='rempart'?10:8,h:wk==='rempart'?6:4});g.show=false;n++}break}}}}
  /* faubourg : fermes hors les murs */
  const insideHull=(x,y)=>hullPts&&inPoly(x,y,hullPts);
  const before=blds.length;
  {const keep=blds.length;let placed=0;const lim=Math.max(2,Math.round(SZ.n*.18));
    for(let guard=0;guard<3&&placed<lim;guard++)for(let i=0;i<roads.length&&placed<lim;i++){const sm=rsm[i],L=polyLen(sm);
      for(let s=3;s<L&&placed<lim;s+=rr(rg,22,40)){const p=polyAt(sm,s),d=Math.hypot(p.x-cx,p.y-cy);if(d<R*.85||insideHull(p.x,p.y)||rg()>.5)continue;
        const side=rg()<.5?-1:1,k=pick(rg,['ferme','ferme','chaumiere','grange']),dd=VKD[k],v=vary(k,dd.w,dd.h),off=roads[i].w/2+3+v.h/2;
        const x=p.x-Math.sin(p.a)*side*off,y=p.y+Math.cos(p.a)*side*off;if(insideHull(x,y))continue;if(ok({x,y,w:v.w,h:v.h,a:norm(p.a)},3)){addB(k,x,y,norm(p.a),'',v);placed++}}}}
  /* champs */
  const nF=Math.round({peu:2,moyen:5,beaucoup:9}[o.field||'moyen']*SZ.fs);const fields=[];
  for(let t=0,n=0;t<260&&n<nF;t++){
    const fw=rr(rg,40,72),fh=rr(rg,30,52),a=rg()*180;const x=rr(rg,20,W-20),y=rr(rg,20,H-20);
    if(Math.hypot(x-cx,y-cy)<R*.95||insideHull(x,y))continue;
    const P=rectPts(x,y,fw,fh,a);const near=blds.some(b=>Math.hypot(b.x-x,b.y-y)<90);if(!near&&rg()<.6)continue;
    if(P.some(p=>p[0]<6||p[0]>W-6||p[1]<6||p[1]>H-6))continue;
    if(blds.some(b=>satOverlap(P,rectPts(b.x,b.y,b.w,b.h,b.a),5)))continue;
    let bad=false;for(const q of [...P,[x,y]]){for(let i=0;i<roads.length;i++)if(dpoly(q[0],q[1],rsm[i],false).d<roads[i].w/2+4)bad=true;if(riv&&dpoly(q[0],q[1],riv.sm,false).d<riv.w/2+4)bad=true;if(lakes.some(l=>inPoly(q[0],q[1],l)))bad=true}
    if(bad)continue;if(fields.some(f=>satOverlap(P,f,3)))continue;
    fields.push(P);add({t:'poly',k:'champ',pts:P.map(p=>[fx(p[0]+rr(rg,-2,2)),fx(p[1]+rr(rg,-2,2))])});n++}
  /* forêts et arbres */
  const nFo=Math.round({peu:1,moyen:3,beaucoup:6}[o.forest||'moyen']*Math.max(.8,SZ.fs*.8));const woods=[];let trees=0;const maxTrees=900;
  const treeOk=(x,y,r)=>{if(x<4||x>W-4||y<4||y>H-4)return false;for(let i=0;i<roads.length;i++)if(dpoly(x,y,rsm[i],false).d<roads[i].w/2+r/2+1)return false;if(riv&&dpoly(x,y,riv.sm,false).d<riv.w/2+r/2+1)return false;if(lakes.some(l=>inPoly(x,y,l)))return false;
    for(const b of blds)if(Math.hypot(b.x-x,b.y-y)<Math.max(b.w,b.h)/2+r/2+2&&inPoly(x,y,rectPts(b.x,b.y,b.w+r+3,b.h+r+3,b.a)))return false;
    if(plaza&&Math.hypot(x-plaza.c[0],y-plaza.c[1])<plaza.r+3)return false;
    for(const f of fields)if(inPoly(x,y,f))return false;return true};
  for(let t=0,n=0;t<200&&n<nFo;t++){
    const x=rr(rg,10,W-10),y=rr(rg,10,H-10),rd=rr(rg,32,70);if(Math.hypot(x-cx,y-cy)<R*1.05+rd*.4)continue;
    if(woods.some(w=>Math.hypot(w.x-x,w.y-y)<w.r+rd*.8))continue;
    if(fields.some(f=>f.some(p=>Math.hypot(p[0]-x,p[1]-y)<rd*.8)))continue;
    if(blds.some(b=>Math.hypot(b.x-x,b.y-y)<rd+8))continue;
    const bp=[];const m=10;for(let i=0;i<m;i++){const a=i/m*Math.PI*2,r=rd*rr(rg,.7,1.15);bp.push([fx(clamp(x+Math.cos(a)*r*1.2,3,W-3)),fx(clamp(y+Math.sin(a)*r,3,H-3))])}
    woods.push({x,y,r:rd});add({t:'poly',k:'foret',pts:bp});
    for(let gx=x-rd*1.4;gx<x+rd*1.4&&trees<maxTrees;gx+=6.5)for(let gy=y-rd*1.2;gy<y+rd*1.2&&trees<maxTrees;gy+=6.5){const px=gx+rr(rg,-2.5,2.5),py=gy+rr(rg,-2.5,2.5);
      if(inPoly(px,py,bp)&&rg()<.8){const r=rr(rg,4.4,6.4);if(treeOk(px,py,r)){add({t:'tree',x:fx(px),y:fx(py),r:fx(r),k:rg()<.35?'conifere':'feuillu'});trees++}}}
    n++}
  for(let t=0;t<Math.floor(W*H/1500)&&trees<maxTrees;t++){const x=rg()*W,y=rg()*H;const r=rr(rg,3,5.2);if(Math.hypot(x-cx,y-cy)<R*.6&&rg()<.6)continue;if(treeOk(x,y,r)){add({t:'tree',x:fx(x),y:fx(y),r:fx(r),k:rg()<.2?'buisson':rg()<.3?'conifere':'feuillu'});trees++}}
  /* textes et repères */
  V.name=V.name&&V.name!=='Nouveau village'&&V.name!=='Mon premier village'?V.name:NM.village(rg);
  add({t:'label',x:fx(W/2),y:26,text:V.name,k:'village',size:30,a:0});
  {const L=polyLen(rsm[0]);const p=polyAt(rsm[0],L*.32);add({t:'label',x:fx(p.x),y:fx(p.y-roads[0].w-3),text:NM.rue(rg),k:'rue',size:9,a:norm(p.a)})}
  if(riv){const p=polyAt(riv.sm,polyLen(riv.sm)*.18);add({t:'label',x:fx(p.x+riv.w+6),y:fx(p.y),text:(o.river==='ruisseau'?'Le ruisseau ':'La rivière ')+pick(rg,['Claire','Brune','Mousse','Saule','Verte','Argent','Brume']),k:'eau',size:11,a:norm(p.a)})}
  marks.forEach(([b,txt],i)=>{if(!b)return;add({t:'mark',x:fx(b.x),y:fx(b.y-Math.max(b.w,b.h)/2-4),n:i+1,text:txt})});
  /* miroirs pour la variété */
  const fxm=rg()<.5,fym=rg()<.5;
  if(fxm||fym)for(const it of items){const mx=x=>fxm?W-x:x,my=y=>fym?H-y:y;
    if(it.pts)it.pts=it.pts.map(p=>[fx(mx(p[0])),fx(my(p[1]))]);if(it.x!=null){it.x=fx(mx(it.x));it.y=fx(my(it.y))}
    if((it.t==='bld'||it.t==='label')&&fxm!==fym)it.a=-(it.a||0)}
  items.forEach(it=>{if(it.t==='poly'){delete it.r;delete it.c}if(it.t==='river')delete it.sm});
  V.items=items;
}
