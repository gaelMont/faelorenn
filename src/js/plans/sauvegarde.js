/* ============ garder les plans, plan par plan ============
   Chaque bâtiment, chaque village, chaque carte du monde est une pièce qui porte sa date (maj) : la plus récente l'emporte,
   et une suppression laisse une trace datée (supprime) pour ne pas revenir d'un autre appareil. Le même document sert au
   stockage de ce navigateur, au fichier plans.json du dépôt et aux sauvegardes .json.
   Ce qui est en train de se dessiner (P) reste séparé des dates (META) : annuler ne défait jamais une date. */

const PL_CLE='faelorenn.plans', PL_VUE='faelorenn.plans.vue', PL_FORMAT='faelorenn-plans', PL_VERSION=1, PL_MAX=300;
const PL_GENRES=[['b','batiments'],['v','villages'],['w','mondes']];
const PL_ID=/^[A-Za-z0-9_-]{1,40}$/;
const META={b:Object.create(null),v:Object.create(null),w:Object.create(null)};   /* id -> {maj} ou {maj, del:true} */
const SER={b:Object.create(null),v:Object.create(null),w:Object.create(null)};    /* id -> le plan, en JSON, tel qu'il est gardé */
const VIRT=new Set(), VSER=Object.create(null);                                  /* les pages blanches virtuelles, et leur état d'origine */
const VGONE=new Set();                                                           /* celles qu'un vrai plan a remplacées : annuler ne les ressuscite pas */
let PL_GARDE=true, PL_SALE=false, PL_DERNIER='';
const plansListe=k=>k==='b'?P.buildings:k==='v'?P.villages:P.worlds;
const plansIdOk=id=>typeof id==='string'&&PL_ID.test(id)&&id!=='__proto__';
const plansMajOk=v=>{v=+v;return isFinite(v)&&v>0?Math.min(Math.floor(v),Date.now()+864e5):0};
const plansMaintenant=(k,id)=>Math.max(Date.now(),(META[k][id]?META[k][id].maj:0)+1);
const pluriel=(n,un,plus)=>n+' '+(n>1?plus:un);

/* ---------- ce qu'on accepte de lire : un fichier du dépôt, une sauvegarde, le stockage ---------- */
function pnCopie(o){const q={};for(const k of Object.keys(o)){if(k!=='__proto__')q[k]=o[k]}return q}
const pnObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const pnNb=(v,def,a,b)=>typeof v==='number'&&isFinite(v)?clamp(v,a,b):def;
const pnFini=(q,f)=>typeof q[f]==='number'&&isFinite(q[f]);
const PN_CTRL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
function pnTxt(q,f,max){
  if(q[f]===undefined)return;
  if(typeof q[f]!=='string'){q[f]='';return}
  if(PN_CTRL.test(q[f]))q[f]=q[f].replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  if(q[f].length>max)q[f]=q[f].slice(0,max)}
function pnPts(v,min){
  if(!Array.isArray(v))return null;
  const out=[];
  for(const p of v.slice(0,6000))if(Array.isArray(p)&&p.length>=2&&typeof p[0]==='number'&&typeof p[1]==='number'&&isFinite(p[0])&&isFinite(p[1]))out.push(p);
  return out.length>=min?out:null}
/* un point de forme libre : [x,y] ou [x,y] et ses deux poignées, bornées pour qu'un fichier trafiqué ne parte pas à l'infini */
function pnPoint(a){
  if(!(a.length>=6&&[2,3,4,5].every(i=>typeof a[i]==='number'&&isFinite(a[i]))))return[fx(a[0]),fx(a[1])];
  return pNeuf(a[0],a[1],clamp(a[2],-500,500),clamp(a[3],-500,500),clamp(a[4],-500,500),clamp(a[5],-500,500))}
const pnLien=q=>{if(q.link!==undefined&&!(typeof q.link==='string'&&(q.link===''||PL_ID.test(q.link))))q.link=''};
const pnB64=s=>typeof s==='string'&&s.length<=2e6&&/^[A-Za-z0-9+/]*={0,2}$/.test(s)?s:'';
/* un objet dessiné : ce qu'il faut pour le tracer, ou rien. Un genre d'objet inconnu (une version plus récente) est gardé tel quel. */
function pnItem(genre,it){
  if(!pnObj(it))return null;
  const q=pnCopie(it);
  if(!plansIdOk(q.id))q.id=uid();
  if(typeof q.t!=='string')return null;
  /* le groupe d'un élément : un petit nom, ou rien */
  if(q.grp!==undefined&&!(typeof q.grp==='string'&&q.grp&&q.grp.length<=40))delete q.grp;
  const xy=()=>pnFini(q,'x')&&pnFini(q,'y');
  pnTxt(q,'name',200);pnTxt(q,'note',20000);pnTxt(q,'text',2000);pnTxt(q,'label',200);
  if(genre==='b'){
    switch(q.t){
      case 'room':if(!(xy()&&pnFini(q,'w')&&pnFini(q,'h')&&q.w>0&&q.h>0))return null;
        if(q.kind!==undefined&&!RK[q.kind])q.kind='piece';
        if(q.shape!==undefined&&!['rect','ring','ellipse','poly'].includes(q.shape))q.shape='rect';
        /* une pièce libre : ses points (entre 3 et 400) avec leurs poignées, et l'emprise qui en découle.
           Illisible, elle redevient le rectangle de son emprise. */
        if(q.shape==='poly'){
          const pts=pnPts(q.pts,3);
          const c=pts?pts.slice(0,400).map(pnPoint):null;
          if(!c||!(polyArea(libreApl(c))>1e-6)){q.shape='rect';delete q.pts}
          else{q.pts=c;libreBoite(q)}}
        else if(q.pts!==undefined)delete q.pts;
        return q;
      case 'wall':if(!(pnFini(q,'x1')&&pnFini(q,'y1')&&pnFini(q,'x2')&&pnFini(q,'y2')))return null;
        if(q.k!==undefined&&!['mur','cloison'].includes(q.k))q.k='mur';
        /* la courbe d'un mur : une poignée par bout, bornée ; l'ancien creux d'une version du 10/10 devient deux poignées */
        for(const cle of ['h1','h2']){
          const h=q[cle];if(h===undefined)continue;
          if(!(Array.isArray(h)&&h.length>=2&&typeof h[0]==='number'&&typeof h[1]==='number'&&isFinite(h[0])&&isFinite(h[1]))){delete q[cle];continue}
          const u=[fx(clamp(h[0],-200,200)),fx(clamp(h[1],-200,200))];
          if(!u[0]&&!u[1])delete q[cle];else q[cle]=u}
        if(q.arc!==undefined){if(pnFini(q,'arc')&&!q.h1&&!q.h2)murPoser(q,q.arc);delete q.arc}
        return q;
      case 'door':if(!(xy()&&pnFini(q,'w')&&q.w>0))return null;
        if(q.k!==undefined&&!DK[q.k])q.k='porte';pnOrient(q);return q;
      case 'win':if(!(xy()&&pnFini(q,'w')&&q.w>0))return null;
        if(q.k!==undefined&&!WK[q.k])q.k='fenetre';pnOrient(q);return q;
      case 'furn':if(!xy()||!FD[q.k])return null;if(q.r!==undefined&&!pnFini(q,'r'))q.r=0;return q;
      case 'stair':if(!(xy()&&pnFini(q,'w')&&pnFini(q,'h')&&q.w>0&&q.h>0))return null;
        if(q.dir!==undefined&&!['n','s','e','w','spiral'].includes(q.dir))q.dir='n';
        /* la suite d'un étage à l'autre : un lien, un jumeau automatique, et s'il continue */
        if(q.esc!==undefined&&!(typeof q.esc==='string'&&q.esc&&q.esc.length<=40))delete q.esc;
        if(q.auto!==undefined&&q.auto!==true)delete q.auto;
        if(q.suite!==undefined&&typeof q.suite!=='boolean')delete q.suite;
        if(q.auto&&!q.esc)delete q.auto;
        if(q.rl!==undefined&&q.rl!=='a'&&q.rl!=='m')delete q.rl;
        return q;
      case 'label':if(!xy())return null;if(q.text===undefined)q.text='';if(q.size!==undefined&&!pnFini(q,'size'))q.size=12;return q;
    }
    return q}
  if(genre==='v'){
    switch(q.t){
      case 'bld':if(!(xy()&&pnFini(q,'w')&&pnFini(q,'h')&&q.w>0&&q.h>0))return null;
        if(!VKD[q.k])q.k='maison';if(q.a!==undefined&&!pnFini(q,'a'))q.a=0;pnLien(q);return q;
      case 'tree':if(!xy())return null;if(!pnFini(q,'r')||q.r<=0)q.r=4;if(!['feuillu','conifere','buisson'].includes(q.k))q.k='feuillu';return q;
      case 'label':if(!xy())return null;if(q.text===undefined)q.text='';if(q.size!==undefined&&!pnFini(q,'size'))q.size=12;
        if(q.a!==undefined&&!pnFini(q,'a'))q.a=0;if(q.k!==undefined&&!['village','lieu','rue','eau'].includes(q.k))q.k='lieu';return q;
      case 'mark':if(!xy())return null;if(!pnFini(q,'n'))q.n=1;if(q.text===undefined)q.text='';return q;
      case 'road':q.pts=pnPts(q.pts,2);if(!q.pts)return null;if(q.k!==undefined&&!RDK[q.k])q.k='route';if(q.w!==undefined&&!pnFini(q,'w'))delete q.w;return q;
      case 'river':q.pts=pnPts(q.pts,2);if(!q.pts)return null;if(!pnFini(q,'w'))q.w=10;return q;
      case 'wall':q.pts=pnPts(q.pts,2);if(!q.pts)return null;if(q.k!==undefined&&!WLK[q.k])q.k='palissade';return q;
      case 'poly':q.pts=pnPts(q.pts,3);if(!q.pts)return null;if(q.k!==undefined&&!PK[q.k])q.k='foret';return q;
    }
    return q}
  switch(q.t){
    case 'city':if(!xy())return null;if(!CK[q.k])q.k='village';if(typeof q.name!=='string')q.name='';pnLien(q);
      /* le cercle de repère, en kilomètres : un nombre raisonnable, ou rien */
      if(q.cercle!==undefined){if(!pnFini(q,'cercle')||q.cercle<=0)delete q.cercle;else q.cercle=fx(clamp(q.cercle,0,1e6))}
      return q;
    case 'realm':q.pts=pnPts(q.pts,3);if(!q.pts)return null;if(typeof q.name!=='string')q.name='';pnLien(q);
      if(q.color!==undefined&&typeof q.color!=='string')q.color='';
      if((q.lx!==undefined||q.ly!==undefined)&&!(pnFini(q,'lx')&&pnFini(q,'ly'))){delete q.lx;delete q.ly}return q;
    case 'river':q.pts=pnPts(q.pts,2);if(!q.pts)return null;if(!pnFini(q,'w'))q.w=1.4;return q;
    case 'road':q.pts=pnPts(q.pts,2);if(!q.pts)return null;if(q.k!==undefined&&!['route','sentier'].includes(q.k))q.k='route';return q;
    case 'label':if(!xy())return null;if(q.text===undefined)q.text='';if(q.size!==undefined&&!pnFini(q,'size'))q.size=12;
      if(q.a!==undefined&&!pnFini(q,'a'))q.a=0;if(q.k!==undefined&&!['pays','region','mer','montagne','lieu'].includes(q.k))q.k='lieu';return q;
  }
  return q}
/* l'orientation d'une porte ou d'une fenêtre : horizontale, verticale, ou oblique avec son angle */
function pnOrient(q){
  if(q.o==='a'){if(pnFini(q,'ang'))q.ang=clamp(q.ang,-180,180);else q.o='h'}
  else{if(q.o!=='h'&&q.o!=='v')q.o='h';if(q.ang!==undefined)delete q.ang}}
const pnItems=(genre,v,max)=>(Array.isArray(v)?v.slice(0,max):[]).map(it=>pnItem(genre,it)).filter(Boolean);
/* un plan entier. Idempotent : ce que l'éditeur écrit lui-même ressort tel quel. */
function plansNettoyer(k,p,id){
  if(!pnObj(p))return null;
  const q=pnCopie(p);q.id=id;
  pnTxt(q,'name',120);if(typeof q.name!=='string'||!q.name.trim())q.name=k==='b'?'Bâtiment':k==='v'?'Village':'Carte';
  pnTxt(q,'notes',20000);if(typeof q.notes!=='string')q.notes='';
  if(k==='b'){
    q.gw=pnNb(q.gw,34,4,400);q.gh=pnNb(q.gh,26,4,400);
    const fl=(Array.isArray(q.floors)?q.floors.slice(0,12):[]).filter(pnObj).map(f=>{const e=pnCopie(f);pnTxt(e,'name',60);if(typeof e.name!=='string'||!e.name)e.name='Étage';e.items=pnItems('b',e.items,8000);return e});
    q.floors=fl.length?fl:[{name:'Rez-de-chaussée',items:[]}];
    const f=pnObj(q.facade)?pnCopie(q.facade):{};
    if(!['pierre','colombage','brique','bois'].includes(f.style))f.style='pierre';
    if(!['croupe','pignon','plat'].includes(f.roof))f.roof='croupe';
    f.chim=pnNb(f.chim,2,0,4);if(typeof f.porch!=='boolean')f.porch=true;if(typeof f.tower!=='boolean')f.tower=false;
    q.facade=f;
    if(q.gen!==undefined&&!(pnObj(q.gen)&&typeof q.gen.type==='string'&&pnFini(q.gen,'seed')))delete q.gen;
  }else if(k==='v'){
    q.W=pnNb(q.W,400,20,6000);q.H=pnNb(q.H,300,20,6000);
    if(!pnFini(q,'seed'))q.seed=1;
    if(!TH[q.theme])q.theme='ete';
    q.items=pnItems('v',q.items,30000);
    if(q.where!==undefined&&!(pnObj(q.where)&&typeof q.where.text==='string'))delete q.where;
  }else{
    q.kmu=pnNb(q.kmu,6,1e-6,100000);
    if(!pnFini(q,'seed'))q.seed=1;
    if(!['froid','tempere','chaud'].includes(q.climate))q.climate='tempere';
    if(q.glyph!==undefined&&typeof q.glyph!=='boolean')q.glyph=true;
    /* les réglages des noms de lieux : une taille, et les genres qu'on n'écrit pas */
    if(q.noms!==undefined){
      const o=pnObj(q.noms)?q.noms:null;
      if(!o)delete q.noms;
      else{const t=typeof o.t==='number'&&isFinite(o.t)?fx(clamp(o.t,.5,2.5)):1,off={};
        if(pnObj(o.off))for(const kk of Object.keys(o.off))if(CK[kk]&&o.off[kk]===true)off[kk]=true;
        if(Object.keys(off).length||t!==1)q.noms={t:t,off:off};else delete q.noms}}
    q.gw=Math.round(pnNb(q.gw,WGW,8,400));q.gh=Math.round(pnNb(q.gh,WGH,8,400));
    q.th=pnB64(q.th);q.tm=pnB64(q.tm);q.tv=pnNb(q.tv,0,0,1e15);
    if(q.parent!==null){
      const pr=q.parent;
      q.parent=pnObj(pr)&&plansIdOk(pr.id)&&pnObj(pr.box)&&['x','y','w','h'].every(f=>pnFini(pr.box,f))?pr:null}
    q.items=pnItems('w',q.items,8000);
    if(q.parent===undefined)q.parent=null;
  }
  return q}
function plansLireBrut(o){
  const out={b:Object.create(null),v:Object.create(null),w:Object.create(null)};
  if(!pnObj(o))return out;
  for(const[k,nom]of PL_GENRES){
    const src=o[nom];if(!pnObj(src))continue;
    let n=0;
    for(const id of Object.keys(src)){
      if(n>=PL_MAX||!plansIdOk(id))continue;
      const rec=src[id];if(!pnObj(rec))continue;
      const maj=plansMajOk(rec.maj);
      if(rec.supprime){out[k][id]={maj:maj,del:true};n++;continue}
      const plan=plansNettoyer(k,rec.plan,id);if(!plan)continue;
      out[k][id]={maj:maj,plan:plan};n++}}
  return out}

/* ---------- ce qu'on écrit ---------- */
function plansTexte(){
  const parts=[];
  for(const[k,nom]of PL_GENRES){
    const ent=Object.keys(META[k]).sort().map(id=>{
      const m=META[k][id];
      return JSON.stringify(id)+':'+(m.del?'{"maj":'+m.maj+',"supprime":true}':'{"maj":'+m.maj+',"plan":'+SER[k][id]+'}')});
    parts.push('"'+nom+'":{'+ent.join(',')+'}')}
  return '{"format":"'+PL_FORMAT+'","version":'+PL_VERSION+','+parts.join(',')+'}'}

/* ---------- qui a changé ? (comparé plan par plan, au moment de garder) ---------- */
function plansVirtuel(k){
  let p;
  if(k==='b')p=mkB();
  else if(k==='v')p=mkV();
  else{p=mkW('Nouvelle carte',6);setGrid(p,new Uint8Array(p.gw*p.gh).fill(60),new Uint8Array(p.gw*p.gh).fill(128))}
  VIRT.add(p.id);VSER[p.id]=JSON.stringify(p);return p}
/* en lecture, rien ne devient « modifié » : les réparations et déductions de l'éditeur (frontières recollées, situation d'un village) se rebasent sans date */
function plansSuivre(){
  const ro=!ui.edit;let ch=false;
  for(const[k]of PL_GENRES){
    const liste=plansListe(k),vus=new Set();
    for(const p of liste){
      const id=p.id;vus.add(id);
      const s=JSON.stringify(p);
      if(VIRT.has(id)){
        if(s===VSER[id])continue;
        if(ro){VSER[id]=s;continue}
        VIRT.delete(id);delete VSER[id];
        META[k][id]={maj:plansMaintenant(k,id)};SER[k][id]=s;ch=true;continue}
      const m=META[k][id];
      if(m&&!m.del){
        if(SER[k][id]===s)continue;
        if(ro){SER[k][id]=s;continue}}
      META[k][id]={maj:plansMaintenant(k,id)};SER[k][id]=s;ch=true}
    if(!ro)for(const id of Object.keys(META[k])){
      const m=META[k][id];
      if(m.del||vus.has(id))continue;
      META[k][id]={maj:plansMaintenant(k,id),del:true};delete SER[k][id];ch=true}}
  if(ch)PL_SALE=true;
  return ch}
/* une page blanche virtuelle devient inutile dès qu'un vrai plan du même genre existe.
   Retourne 0 (rien), 1 (la liste a changé) ou 2 (un plan affiché a changé de place). */
function plansPurger(){
  const avant=[P.curB,P.curV,P.curW].join();let ch=false;
  for(const[k]of PL_GENRES){
    const liste=plansListe(k);
    if(!liste.some(p=>!VIRT.has(p.id)))continue;
    for(let i=liste.length-1;i>=0;i--)if(VIRT.has(liste[i].id)){VGONE.add(liste[i].id);VIRT.delete(liste[i].id);delete VSER[liste[i].id];liste.splice(i,1);ch=true}}
  if(ch)fixCur();
  return !ch?0:avant!==[P.curB,P.curV,P.curW].join()?2:1}

/* ---------- ce navigateur ---------- */
function plansCharger(){
  let brut=null,o=null;
  try{brut=localStorage.getItem(PL_CLE)}catch(e){}
  if(brut){try{o=JSON.parse(brut)}catch(e){
    /* illisible : mis de côté plutôt que laissé à écraser */
    try{if(!localStorage.getItem(PL_CLE+'.illisible'))localStorage.setItem(PL_CLE+'.illisible',brut)}catch(x){}}}
  PL_DERNIER=brut||'';
  const r=plansLireBrut(o);
  P={v:1,buildings:[],villages:[],worlds:[]};
  for(const[k]of PL_GENRES)for(const id of Object.keys(r[k])){
    const rec=r[k][id];
    if(rec.del){META[k][id]={maj:rec.maj,del:true};continue}
    META[k][id]={maj:rec.maj};SER[k][id]=JSON.stringify(rec.plan);plansListe(k).push(rec.plan)}}
/* vrai si le navigateur a bien gardé les plans ; sinon (espace plein, stockage bloqué) la page le dit */
function plansGarder(){
  if(CT_MUET)return true;
  try{
    /* un autre onglet a écrit entre-temps : on prend d'abord ce qu'il a fait */
    const actuel=localStorage.getItem(PL_CLE);
    if(actuel&&actuel!==PL_DERNIER){
      PL_DERNIER=actuel;
      let o=null;try{o=JSON.parse(actuel)}catch(e){}
      if(o)plansRecevoir(o,{garder:false})}
    const t=plansTexte();
    localStorage.setItem(PL_CLE,t);PL_DERNIER=t;PL_GARDE=true;PL_SALE=false;
  }catch(e){PL_GARDE=false}
  return PL_GARDE}
let vueT=0;
function plansVueBientot(){clearTimeout(vueT);vueT=setTimeout(plansGarderVue,400)}
function plansGarderVue(){if(CT_MUET)return;try{localStorage.setItem(PL_VUE,JSON.stringify({mode:ui.mode,b:P.curB,v:P.curV,w:P.curW,snap:ui.snap,emporter:ui.emporter!==false}))}catch(e){}}
function plansLireVue(){try{const v=JSON.parse(localStorage.getItem(PL_VUE)||'null');return pnObj(v)?v:null}catch(e){return null}}

/* ---------- fondre ce qui vient d'ailleurs ---------- */
/* le plus récent l'emporte, une trace de suppression aussi ; à égalité, une règle fixe, pour que l'ordre n'y change rien */
function plansGagne(k,id,rec,loc){
  if(rec.maj!==loc.maj)return rec.maj>loc.maj;
  const a=rec.del?'':ghcCanon(rec.plan),b=loc.del?'':ghcCanon(JSON.parse(SER[k][id]));
  return a>b}
/* ce qu'on a ici et que l'autre n'a pas : un plan absent là-bas, ou plus récent ici */
function plansEnAvance(obj){
  try{
    plansSuivre();
    const r=plansLireBrut(obj);
    return PL_GENRES.some(([k])=>Object.keys(META[k]).some(id=>{const l=r[k][id];return !l||META[k][id].maj>l.maj}));
  }catch(e){console.error(e);return false}}
/* retourne le nombre de plans changés (nouveaux, remplacés, retirés) */
function plansRecevoir(obj,opt){
  opt=opt||{};
  let n=0;
  try{
    plansSuivre();                       /* ce qui attendait d'être gardé ici compte d'abord */
    const r=plansLireBrut(obj);
    const avant={b:P.curB,v:P.curV,w:P.curW};
    const touche={b:new Set(),v:new Set(),w:new Set()};
    for(const[k]of PL_GENRES){
      const lst=plansListe(k);
      for(const id of Object.keys(r[k])){
        const rec=r[k][id],loc=META[k][id];
        if(loc&&!plansGagne(k,id,rec,loc))continue;
        if(!loc&&rec.del){META[k][id]={maj:rec.maj,del:true};PL_SALE=true;continue}
        const i=lst.findIndex(x=>x.id===id);
        if(rec.del){
          if(i>=0){lst.splice(i,1);touche[k].add(id);n++}
          META[k][id]={maj:rec.maj,del:true};delete SER[k][id];PL_SALE=true;continue}
        if(i>=0)lst[i]=rec.plan;else lst.push(rec.plan);
        META[k][id]={maj:rec.maj};SER[k][id]=JSON.stringify(rec.plan);
        touche[k].add(id);n++;PL_SALE=true}}
    if(!n){if(PL_SALE&&opt.garder!==false)plansGarder();return 0}
    plansPurger();
    fixCur();
    /* on n'a pas le droit de laisser un geste en cours tenir un objet qui vient d'être remplacé */
    const courant=['b','v','w'].some(k=>touche[k].has(avant[k]));
    const bouge=avant.b!==P.curB||avant.v!==P.curV||avant.w!==P.curW;
    if(courant||bouge){g=null;vg=null;wg=null;vdraw=null;wdraw=null;bdraw=null;drag=null;pan=null;pinch=null;ptrs.clear();cv.classList.remove('pan')}
    const existe=new Set();for(const[k]of PL_GENRES){plansListe(k).forEach(p=>{existe.add(p.id);if(k==='b')p.floors.forEach(f=>f.items.forEach(i=>existe.add(i.id)));else p.items.forEach(i=>existe.add(i.id))})}
    ui.sel=ui.sel.filter(id=>existe.has(id));
    histClear();                         /* les états d'avant ne savent plus ce qui vient d'arriver */
    try{refreshLocs()}catch(e){}
    if(courant||bouge)renderAll();
    else{renderTop();renderFloorbar();renderCanvas();renderOverlay();if(!side.contains(document.activeElement))renderSide();majVide();applyView()}
    if(bouge)fit();
    plansSuivre();                       /* les déductions de l'éditeur (situations des villages...) se rebasent */
    if(opt.garder!==false)plansGarder();
  }catch(e){console.error(e)}
  return n}
/* après chaque geste, quand la minuterie est écoulée */
function plansApres(){
  if(CT_MUET)return;
  const ch=plansSuivre();
  const pu=plansPurger();
  if(PL_SALE)plansGarder();
  plansVueBientot();
  if(ch&&GH&&GH.actif)GH.planifier();
  if(pu===2){ui.sel=[];renderAll();fit()}
  else if(pu===1)renderTop();
  dessinerEtat()}
/* la page se ferme ou passe derrière : ce qui attendait part tout de suite */
function plansVider(){
  if(saveT)saveNow();
  if(GH&&GH.actif&&GH.prevu&&!GH.occupe)GH.ecrire()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)plansVider()});
window.addEventListener('pagehide',plansVider);
/* un autre onglet du même navigateur retouche les plans : celui-ci le suit */
window.addEventListener('storage',e=>{
  if(e.key!==PL_CLE||!e.newValue)return;
  let o=null;try{o=JSON.parse(e.newValue)}catch(x){}
  if(!o)return;
  PL_DERNIER=e.newValue;
  plansRecevoir(o,{garder:true})});
