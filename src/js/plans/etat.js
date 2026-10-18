/* ====== état global ====== */
let P=null;             // les plans, tous genres confondus : le travail en cours
let hist=[],fut=[],histSize=0;
const ui={mode:'b',tool:'sel',sel:[],fl:0,snap:.5,ghost:true,dims:true,view:{x:40,y:40,k:1},grid:true,facade:false,
  furn:'lit',doorK:'porte',winK:'fenetre',roomK:'piece',roomShape:'rect',stairK:'monte',wallK:'mur',
  vk:{poly:'foret',bld:'maison',road:'route',tree:'feuillu',wall:'palissade',label:'lieu'},
  armed:null,space:false,edit:false,userView:false};
const mkB=(n)=>({id:uid(),name:n||'Nouveau bâtiment',notes:'',gw:34,gh:26,floors:[{name:'Rez-de-chaussée',items:[]}],facade:{style:'pierre',roof:'croupe',porch:true,tower:false,chim:2}});
const mkV=(n)=>({id:uid(),name:n||'Nouveau village',W:400,H:300,seed:ri(Math.random,1,99999),theme:'ete',items:[],notes:''});
/* garder : un instant après le dernier geste, ou tout de suite quand la page se ferme */
let saveT=0;
function saveNow(){clearTimeout(saveT);saveT=0;try{refreshLocs()}catch(e){}plansApres()}
function save(){clearTimeout(saveT);saveT=setTimeout(saveNow,150)}
/* annuler : les états d'avant, dans la limite de la mémoire (un monde pèse lourd) */
function histClear(){hist=[];fut=[];histSize=0;updUndo()}
function snap(){const s=JSON.stringify(P);hist.push(s);histSize+=s.length;while(hist.length>80||histSize>6e7)histSize-=hist.shift().length;fut=[];updUndo()}
function restore(s){P=JSON.parse(s);
  /* une page blanche déjà remplacée par un vrai plan ne revient pas avec l'annulation */
  for(const k of ['buildings','villages','worlds'])if(P[k])P[k]=P[k].filter(p=>!VGONE.has(p.id));
  ui.sel=[];fixCur();renderAll();save()}
function undo(){if(!hist.length)return;fut.push(JSON.stringify(P));const s=hist.pop();histSize-=s.length;restore(s);updUndo()}
function redo(){if(!fut.length)return;const c=JSON.stringify(P);hist.push(c);histSize+=c.length;restore(fut.pop());updUndo()}
function updUndo(){$('#bUndo').disabled=!hist.length;$('#bRedo').disabled=!fut.length}
/* chaque genre a toujours un plan sous les yeux : s'il n'y en a aucun, une page blanche « virtuelle » tient la place.
   Elle n'est ni gardée ni envoyée tant que personne n'y a touché : deux appareils vides ne se fabriquent pas de doublons. */
function fixCur(){
  if(!P.worlds)P.worlds=[];if(!P.buildings)P.buildings=[];if(!P.villages)P.villages=[];
  if(!P.worlds.length)P.worlds.push(plansVirtuel('w'));
  if(!P.buildings.length)P.buildings.push(plansVirtuel('b'));
  if(!P.villages.length)P.villages.push(plansVirtuel('v'));
  if(!P.worlds.find(w=>w.id===P.curW))P.curW=P.worlds[0].id;
  if(!P.buildings.find(b=>b.id===P.curB))P.curB=P.buildings[0].id;
  if(!P.villages.find(v=>v.id===P.curV))P.curV=P.villages[0].id;
  P.worlds.forEach(w=>{if(!VIRT.has(w.id)){weldRealms(w);fixOverlaps(w,null,true)}})}
const CB=()=>P.buildings.find(b=>b.id===P.curB);
const CV=()=>P.villages.find(v=>v.id===P.curV);
const CF=()=>{const b=CB();ui.fl=clamp(ui.fl,0,b.floors.length-1);return b.floors[ui.fl]};
const snapv=(v,s=ui.snap)=>Math.round(v/s)*s;
function dirty(){if(ui.mode==='b'){try{escSync()}catch(e){}}save();renderCanvas();renderSideLight()}
