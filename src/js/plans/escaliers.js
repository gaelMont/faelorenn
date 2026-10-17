/* ====== un escalier continue d'étage en étage ======
   Un escalier porte un lien (esc) partagé avec ses jumeaux des étages du dessus. Le plus bas des escaliers du lien
   commande : les jumeaux marqués « auto » suivent sa place, sa taille et son sens. Décocher « Continue à l'étage du
   dessus » arrête la suite et retire les jumeaux automatiques au-dessus. « Détacher » rend un jumeau indépendant. */
const escAuto=it=>it.t==='stair'&&it.auto===true;
const ESC_INV={n:'s',s:'n',e:'w',w:'e',spiral:'spiral'};
/* la deuxième place du cage d'escalier : juste à côté de la première, dans le sens de la largeur */
function escCote(src){
  const d=src.dir||'n';
  return(d==='n'||d==='s')?[fx(src.x+src.w),fx(src.y)]:[fx(src.x),fx(src.y+src.h)]}
/* poser (ou remettre d'aplomb) un jumeau d'un étage : « a » l'arrivée qui descend, « m » le départ qui monte */
function escPoser(F,id,role,src,x,y,dir,label){
  let q=F.items.find(i=>i.t==='stair'&&i.esc===id&&escAuto(i)&&(i.rl||'a')===role);
  if(!q){
    q={t:'stair',id:uid(),esc:id,auto:true,rl:role,suite:true,x:x,y:y,w:src.w,h:src.h,dir:dir,label:label};
    F.items.push(q);return q}
  q.x=x;q.y=y;q.w=src.w;q.h=src.h;q.dir=dir;q.rl=role;
  if(q.label!=='monte'&&q.label!=='descend'&&q.label)return q;
  q.label=label;return q}
function escSync(b){
  b=b||CB();
  if(!b||!Array.isArray(b.floors)||b.floors.length<2)return;
  const liens=new Map();
  b.floors.forEach((F,i)=>{for(const it of F.items)if(it.t==='stair'&&typeof it.esc==='string'&&it.esc){
    const g=liens.get(it.esc)||{src:null,i:-1,auto:[]};
    if(!escAuto(it)&&(g.i<0||i<g.i)){g.src=it;g.i=i}
    if(escAuto(it))g.auto.push({F:F,it:it,i:i});
    liens.set(it.esc,g)}});
  for(const[id,g]of liens){
    if(!g.src){                           /* l'escalier d'origine n'est plus là : ses jumeaux s'en vont */
      for(const a of g.auto){const j=a.F.items.indexOf(a.it);if(j>=0)a.F.items.splice(j,1)}
      continue}
    const src=g.src,spirale=(src.dir||'n')==='spiral';
    const place=[[src.x,src.y],escCote(src)];
    let prev=src,slot=0;
    for(let i=g.i+1;i<b.floors.length;i++){
      const F=b.floors[i];
      if(prev.suite===false){
        /* la suite s'arrête : tous les jumeaux automatiques du dessus s'en vont */
        for(let j=i;j<b.floors.length;j++){
          const Fj=b.floors[j];
          for(let k=Fj.items.length-1;k>=0;k--){const t=Fj.items[k];if(t.t==='stair'&&t.esc===id&&escAuto(t))Fj.items.splice(k,1)}}
        break}
      /* l'arrivée : elle descend, sa flèche montre le chemin du retour */
      const arr=escPoser(F,id,'a',src,place[slot][0],place[slot][1],spirale?'spiral':ESC_INV[src.dir||'n'],'descend');
      if(!spirale&&i+1<b.floors.length){
        /* il reste un étage au-dessus : le départ qui monte, collé à côté */
        const s2=1-slot;
        const dep=escPoser(F,id,'m',src,place[s2][0],place[s2][1],src.dir||'n','monte');
        prev=dep;slot=s2}
      else{
        const vieux=F.items.find(i2=>i2.t==='stair'&&i2.esc===id&&escAuto(i2)&&i2.rl==='m');
        if(vieux)F.items.splice(F.items.indexOf(vieux),1);
        prev=arr}}}}
/* l'étage où se trouve l'escalier qui commande ce lien */
function escSource(it){
  const b=CB();if(!b||!it||!it.esc)return null;
  for(let i=0;i<b.floors.length;i++)for(const x of b.floors[i].items)
    if(x.t==='stair'&&x.esc===it.esc&&!escAuto(x))return{i:i,it:x};
  return null}
/* détacher un jumeau : la chaîne s'arrête juste en dessous de lui */
function escCouper(it){
  const b=CB();if(!b||!it||!it.esc)return;
  let fi=-1;b.floors.forEach((F,i)=>{if(F.items.indexOf(it)>=0)fi=i});
  for(let i=fi-1;i>=0;i--){
    const t=b.floors[i].items.find(x=>x.t==='stair'&&x.esc===it.esc);
    if(t){t.suite=false;return}}}
function escPanneau(it){
  const b=CB(),n=b?b.floors.length:1;
  let h=`<div class="row"><label><input type="checkbox" data-f="suite"${it.suite!==false?' checked':''}> Continue à l’étage du dessus</label></div>`;
  if(escAuto(it)){
    const s=escSource(it);
    h+=`<p class="hint">Cet escalier suit celui de ${s?'l’étage « '+esc(b.floors[s.i].name)+' »':'l’étage du dessous'} : il garde sa place et sa taille. `
      +`<button type="button" class="btn sm" data-act="escDet">Détacher celui-ci</button></p>`}
  else if(n>1)h+=`<p class="hint">Coché, le même escalier est posé aux étages du dessus, à la même place. Décoche pour l’arrêter ici.</p>`;
  return h}
