/* ====== vers la table : une carte de combat ======
   Le Registre de la Table pose les jetons sur une carte. Elle part d'ici, par ce navigateur, comme une
   rencontre part du Registre des Rencontres : un étage de bâtiment en entier, ou ce qu'on voit d'un village.
   La carte est dessinée en mètres (un pas vaut un mètre), pour que la table n'ait qu'à poser ses jetons. */
const CT_CLE_ENVOI='faelorenn.envoi.carte';
/* « plans.html#carte=b:ID:0 » : la table ouvre cette page dans un cadre caché pour prendre une carte sans
   que personne ne quitte la table. Dans ce mode, on ne garde rien et on ne synchronise rien. */
const CT_MUET=(()=>{try{return /^carte=/.test(decodeURIComponent(location.hash.slice(1)))}catch(e){return /^#?carte=/.test(location.hash)}})();
const CT_POIDS=400000;      /* au-delà, la carte est trop lourde pour la sauvegarde partagée de la table */
const CT_MAXM=300;          /* au-delà de trois cents mètres de côté, on n'envoie que le milieu */

/* ce qu'on voit de la carte, en mètres */
function vueEnMetres(){
  const r=cv.getBoundingClientRect(),u=U()*ui.view.k;
  if(!(u>0))return null;
  return {x0:(0-ui.view.x)/u, y0:(0-ui.view.y)/u, x1:(r.width-ui.view.x)/u, y1:(r.height-ui.view.y)/u};
}
/* un village découpé : seulement ce qui touche le cadre, ramené à l'origine. Le fond, l'herbe et le
   découpage suivent, et la carte envoyée pèse ce que pèse le morceau, pas le village entier. */
function vDecouper(v,x0,y0,x1,y1){
  const dx=-x0,dy=-y0;
  const dedans=it=>{const b=vItemBounds(it);return b[2]>=x0-10&&b[0]<=x1+10&&b[3]>=y0-10&&b[1]<=y1+10};
  const items=v.items.filter(dedans).map(it=>{
    const q=JSON.parse(JSON.stringify(it));
    if(Array.isArray(q.pts))q.pts=q.pts.map(p=>[p[0]+dx,p[1]+dy]);
    if(typeof q.x==='number'){q.x+=dx;q.y+=dy}
    return q});
  return Object.assign({},v,{W:fx(x1-x0),H:fx(y1-y0),items:items});
}
/* la carte prête à partir : son nom, d'où elle vient, son cadre en mètres et son dessin */
function carteDeCombat(){
  if(ui.mode==='b'){
    const b=CB(),fi=ui.fl,F=b.floors[fi];
    const e=floorExtent(F);
    if(!e)return {err:'Cet étage est vide : il n’y a rien à poser sur une carte.'};
    const x0=Math.floor(e.x0-1),y0=Math.floor(e.y0-1),x1=Math.ceil(e.x1+1),y1=Math.ceil(e.y1+1);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${fx(x1-x0)} ${fx(y1-y0)}">`
      +`<rect x="${x0}" y="${y0}" width="${fx(x1-x0)}" height="${fx(y1-y0)}" fill="${PAPER}"/>`
      +`<g transform="scale(${1/BU})">${renderFloor(b,fi,{ghost:false,dims:false})}</g></svg>`;
    return {nom:b.name+' · '+F.name, ref:'b:'+b.id+':'+fi, x0:x0, y0:y0, x1:x1, y1:y1, svg:svg};
  }
  if(ui.mode==='v'){
    const v=CV(),r=CT_MUET?{x0:0,y0:0,x1:v.W,y1:v.H}:vueEnMetres();
    if(!r)return {err:'La carte n’est pas encore affichée.'};
    let x0=Math.max(0,Math.floor(r.x0)),y0=Math.max(0,Math.floor(r.y0));
    let x1=Math.min(v.W,Math.ceil(r.x1)),y1=Math.min(v.H,Math.ceil(r.y1));
    if(x1-x0<10||y1-y0<10)return {err:'Zoome un peu moins : il faut au moins dix mètres de côté.'};
    /* trop grand pour servir de carte de combat : on garde le milieu */
    if(x1-x0>CT_MAXM){const c=(x0+x1)/2;x0=Math.round(c-CT_MAXM/2);x1=x0+CT_MAXM}
    if(y1-y0>CT_MAXM){const c=(y0+y1)/2;y0=Math.round(c-CT_MAXM/2);y1=y0+CT_MAXM}
    const w=vDecouper(v,x0,y0,x1,y1);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.W} ${w.H}">`
      +`<g transform="scale(${1/VU})">${villageInner(w,{pid:'ct'})}</g></svg>`;
    return {nom:v.name+' · '+(x1-x0)+' × '+(y1-y0)+' m', ref:'v:'+v.id, x0:0, y0:0, x1:w.W, y1:w.H, svg:svg};
  }
  return {err:'Une carte du monde se compte en kilomètres : prends un village ou un bâtiment.'};
}
function envoyerCarte(){
  const c=carteDeCombat();
  if(c.err){toast(c.err);return}
  if(c.svg.length>CT_POIDS){toast('Cette carte est trop lourde ('+Math.round(c.svg.length/1024)+' ko). Zoome sur le coin où ça se passe, puis renvoie.');return}
  try{localStorage.setItem(CT_CLE_ENVOI,JSON.stringify(c))}catch(e){toast('Ce navigateur a refusé de garder la carte.');return}
  toast('« '+c.nom+' » est partie vers le Registre de la Table.');
}
$('#bTable').onclick=()=>envoyerCarte();
/* le bouton ne sert que pour un bâtiment ou un village */
function majBoutonTable(){const b=$('#bTable');if(b)b.disabled=ui.mode==='w'}

/* ---------- la table vient chercher une carte ----------
   On dessine, on pose dans ce navigateur, et on prévient le cadre parent. Rien n'est gardé ni envoyé au dépôt. */
function carteRepondre(ok,err,nom){
  try{if(window.parent&&window.parent!==window)window.parent.postMessage({faelorenn:'carte',ok:!!ok,err:err||'',nom:nom||''},location.origin==='null'?'*':location.origin)}catch(e){}
  if(err)toast(err);else if(nom)toast('« '+nom+' » est partie vers le Registre de la Table.');
}
function carteDepuisAncre(x){
  const k=x.slice(0,1),reste=x.slice(2),i=reste.lastIndexOf(':');
  const id=(k==='b'&&i>0)?reste.slice(0,i):reste;
  const fl=(k==='b'&&i>0)?(parseInt(reste.slice(i+1),10)||0):0;
  if(!plansOuvrir(k,id)){carteRepondre(false,'Ce plan n’est pas encore dans ce navigateur. Relie le dépôt, ou importe-le.');return}
  if(k==='b'){const b=CB();ui.fl=Math.max(0,Math.min(b.floors.length-1,fl));renderAll()}
  const c=carteDeCombat();
  if(c.err){carteRepondre(false,c.err);return}
  if(c.svg.length>CT_POIDS){carteRepondre(false,'Cette carte est trop lourde ('+Math.round(c.svg.length/1024)+' ko). Ouvre le plan et zoome sur le coin où ça se passe.');return}
  try{localStorage.setItem(CT_CLE_ENVOI,JSON.stringify(c))}catch(e){carteRepondre(false,'Ce navigateur a refusé de garder la carte.');return}
  carteRepondre(true,'',c.nom);
}
