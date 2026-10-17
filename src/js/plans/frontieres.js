/* ====== frontières : un territoire n'appartient qu'à un seul royaume ====== */
function wFill(pts,sc,W,H,fn){
  const n=pts.length;let y0=1e9,y1=-1e9;for(const p of pts){if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1]}
  const ra=Math.max(0,Math.floor(y0*sc-.5)),rb=Math.min(H-1,Math.ceil(y1*sc-.5));
  for(let row=ra;row<=rb;row++){const y=(row+.5)/sc,xs=[];
    for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]))}
    xs.sort((p,q)=>p-q);
    for(let k=0;k+1<xs.length;k+=2){const c0=Math.max(0,Math.ceil(xs[k]*sc-.5)),c1=Math.min(W-1,Math.ceil(xs[k+1]*sc-.5)-1);for(let c=c0;c<=c1;c++)fn(row*W+c)}}}
function realmOverlap(w,sc){
  const R=w.items.filter(i=>i.t==='realm');if(R.length<2)return 0;const W=Math.ceil(MW*sc),H=Math.ceil(MH*sc),cnt=new Uint8Array(W*H);
  R.forEach(r=>wFill(r.pts,sc,W,H,k=>{if(cnt[k]<255)cnt[k]++}));let n=0;for(let k=0;k<cnt.length;k++)if(cnt[k]>1)n++;return n/(sc*sc)}
function dpSimplify(p,tol){
  if(p.length<3)return p.slice();const keep=new Uint8Array(p.length);keep[0]=keep[p.length-1]=1;const st=[[0,p.length-1]];
  while(st.length){const[a,b]=st.pop();let m=-1,md=tol;for(let i=a+1;i<b;i++){const d=dseg(p[i][0],p[i][1],p[a][0],p[a][1],p[b][0],p[b][1]).d;if(d>md){md=d;m=i}}if(m>0){keep[m]=1;st.push([a,m],[m,b])}}
  return p.filter((_,i)=>keep[i])}
function repairRealms(w,winnerId){
  const R=w.items.filter(i=>i.t==='realm');if(!R.length)return false;
  const W=MW,H=MH,lab=new Int16Array(W*H);
  const order=R.map((_,i)=>i).sort((a,b)=>((R[a].id===winnerId)-(R[b].id===winnerId))||polyArea(R[b].pts)-polyArea(R[a].pts));
  for(const i of order)wFill(R[i].pts,1,W,H,k=>{lab[k]=i+1});
  /* comble les fentes entre deux royaumes */
  let none=0;for(let k=0;k<lab.length;k++)if(!lab[k])none++;
  if(none<260000)for(let pass=0;pass<3;pass++){const nl=lab.slice();let ch=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x;if(lab[k])continue;let first=0,second=false,fd=99;
      for(let d=1;d<=6&&!second;d++){for(let dy=-d;dy<=d&&!second;dy++)for(let dx=-d;dx<=d;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==d)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const l=lab[yy*W+xx];if(!l)continue;if(!first){first=l;fd=d}else if(l!==first){second=true;break}}}
      if(second){nl[k]=first;ch++}}
    lab.set(nl);if(!ch)break}
  const NW=W+1,get=(x,y)=>x<0||y<0||x>=W||y>=H?-1:lab[y*W+x];
  const E=R.map(()=>({from:[],to:[],oth:[],out:new Map()}));
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=lab[y*W+x];if(a<=0)continue;const e=E[a-1];
    const add=(x0,y0,x1,y1,b)=>{const i=e.from.length;e.from.push(y0*NW+x0);e.to.push(y1*NW+x1);e.oth.push(b);const f=y0*NW+x0;if(!e.out.has(f))e.out.set(f,[]);e.out.get(f).push(i)};
    let b;
    if((b=get(x,y-1))!==a)add(x,y,x+1,y,b);
    if((b=get(x+1,y))!==a)add(x+1,y,x+1,y+1,b);
    if((b=get(x,y+1))!==a)add(x+1,y+1,x,y+1,b);
    if((b=get(x-1,y))!==a)add(x,y+1,x,y,b)}
  const cache=new Map(),nx=n=>n%NW,ny=n=>Math.floor(n/NW),res=R.map(()=>[]);
  R.forEach((r,ri)=>{const e=E[ri];if(!e.from.length)return;const used=new Uint8Array(e.from.length);
    for(let s=0;s<e.from.length;s++){if(used[s])continue;
      const loop=[];let cur=s;const start=e.from[s];let closed=false;
      for(;;){used[cur]=1;loop.push(cur);const to=e.to[cur];if(to===start){closed=true;break}
        const cand=(e.out.get(to)||[]).filter(i=>!used[i]);if(!cand.length)break;let pick=cand[0];
        if(cand.length>1){const dx=nx(to)-nx(e.from[cur]),dy=ny(to)-ny(e.from[cur]);const sc=i=>{const ox=nx(e.to[i])-nx(e.from[i]),oy=ny(e.to[i])-ny(e.from[i]);if(ox===-dy&&oy===dx)return 0;if(ox===dx&&oy===dy)return 1;return 2};pick=cand.slice().sort((p,q)=>sc(p)-sc(q))[0]}
        cur=pick}
      if(!closed||loop.length<4)continue;
      /* découpe en tronçons selon le voisin */
      const n=loop.length;let b0=-1;for(let i=0;i<n;i++)if(e.oth[loop[i]]!==e.oth[loop[(i+n-1)%n]]){b0=i;break}
      const runs=[];
      if(b0<0){runs.push({nodes:loop.map(i=>e.from[i]).concat([e.from[loop[0]]]),oth:e.oth[loop[0]],closed:true})}
      else{let i=0;while(i<n){const o=e.oth[loop[(b0+i)%n]];let j=i;const nodes=[e.from[loop[(b0+i)%n]]];while(j<n&&e.oth[loop[(b0+j)%n]]===o){nodes.push(e.to[loop[(b0+j)%n]]);j++}runs.push({nodes,oth:o});i=j}}
      let poly=[];
      for(const run of runs){let nodes=run.nodes,pts;
        if(run.closed){pts=dpSimplify(nodes.map(q=>[nx(q),ny(q)]),1.6)}
        else{const s0=nodes[0],t0=nodes[nodes.length-1],fw=s0<t0||(s0===t0&&true),key=(fw?s0:t0)+'|'+(fw?t0:s0)+'|'+nodes.length+'|'+Math.min(ri+1,run.oth)+'|'+Math.max(ri+1,run.oth);
          let c=cache.get(key);if(!c){const seq=(fw?nodes:nodes.slice().reverse()).map(q=>[nx(q),ny(q)]);c=dpSimplify(seq,1.6);cache.set(key,c)}
          pts=fw?c:c.slice().reverse()}
        pts=pts.slice(0,-1);poly.push(...pts)}
      if(poly.length>=3)res[ri].push(poly)}});
  let changed=false;
  R.forEach((r,ri)=>{const L=res[ri].sort((a,b)=>polyArea(b)-polyArea(a));if(!L.length||polyArea(L[0])<30)return;
    r.pts=L[0].map(p=>[fx(p[0]),fx(p[1])]);changed=true;
    for(let k=1;k<L.length;k++)if(polyArea(L[k])>200){const c=JSON.parse(JSON.stringify(r));c.id=uid();delete c.link;delete c.lx;delete c.ly;c.pts=L[k].map(p=>[fx(p[0]),fx(p[1])]);w.items.unshift(c)}});
  return changed}
function fixOverlaps(w,winnerId,quiet){
  if(realmOverlap(w,1/3)<=8)return false;
  const ok=repairRealms(w,winnerId);if(ok&&!quiet)toast('Frontières ajustées : un territoire ne peut appartenir qu\'à un seul royaume');return ok}
