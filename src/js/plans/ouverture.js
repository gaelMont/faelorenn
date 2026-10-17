/* ====== un plan sous les yeux, à chaque ouverture ====== */
/* ---------- un lieu cité ailleurs sur le site : « plans.html#plan=v:ID », « #lieu=CARTE:ID », « #neuf=v:Nom » ---------- */
function plansOuvrir(k,id){
  if(!['b','v','w'].includes(k)||!plansListe(k).some(p=>p.id===id))return false;
  if(k==='b')P.curB=id;else if(k==='v')P.curV=id;else P.curW=id;
  ui.fromW=null;ui.from=null;setMode(k);
  return true}
function plansAncre(){
  let h='';
  try{h=decodeURIComponent(location.hash.slice(1))}catch(e){h=location.hash.slice(1)}
  if(!h)return;
  if(h.indexOf('carte=')===0){carteDepuisAncre(h.slice(6));return}
  if(h.indexOf('plan=')===0){
    const x=h.slice(5);
    if(!plansOuvrir(x.slice(0,1),x.slice(2)))toast('Ce plan n’est pas encore dans ce navigateur. Relie le dépôt, ou importe-le.');
    return}
  if(h.indexOf('lieu=')===0){
    const x=h.slice(5),i=x.indexOf(':');
    if(i<0)return;
    if(!plansOuvrir('w',x.slice(0,i))){toast('Cette carte du monde n’est pas encore dans ce navigateur.');return}
    const id=x.slice(i+1);
    if(!CW().items.some(q=>q.id===id))return;
    ui.sel=[id];renderSide();renderOverlay();
    requestAnimationFrame(()=>{wMontrer(id);renderOverlay()});
    return}
  if(h.indexOf('neuf=')===0){
    const x=h.slice(5),k=x.slice(0,1),nom=x.slice(2).trim();
    if(!['b','v','w'].includes(k)||!nom)return;
    const deja=plansListe(k).find(p=>!VIRT.has(p.id)&&String(p.name||'').trim().toLowerCase()===nom.toLowerCase());
    if(deja){plansOuvrir(k,deja.id);return}
    setMode(k);setEdition(true);
    $('#bNew').click();
    const n=$('#nbName');if(n){n.value=nom;n.focus()}
    toast('Choisis son modèle puis « Créer » : le plan s’appellera « '+nom+' ».')}}
window.addEventListener('hashchange',plansAncre);

function demarrer(){
  plansCharger();
  const v=plansLireVue();
  fixCur();
  if(v){
    for(const[k,champ,cle]of [['b','curB','b'],['v','curV','v'],['w','curW','w']])
      if(typeof v[cle]==='string'&&plansListe(k).some(p=>p.id===v[cle]))P[champ]=v[cle];
    if(['b','v','w'].includes(v.mode))ui.mode=v.mode;
    if(v.snap!==undefined)ui.snap=grPasOk(v.snap);
    if(v.emporter!==undefined)ui.emporter=v.emporter!==false}
  histClear();
  ui.edit=false;
  setEdition(false);              /* trace tout et pose la lecture */
  requestAnimationFrame(()=>fit());
  /* tant que personne n'a bougé la vue, elle suit la taille de la fenêtre */
  if(typeof ResizeObserver==='function'){
    let raf=0,avant=null;
    new ResizeObserver(es=>{
      const r=es[0]&&es[0].contentRect,w=r?r.width:0,h=r?r.height:0,prec=avant;
      avant={w:w,h:h};
      if(ui.userView){
        /* plein écran : une vue que quelqu'un a placée garde son centre quand la fenêtre change de taille */
        if(prec&&Date.now()<pleinJusqua&&(w!==prec.w||h!==prec.h)){ui.view.x+=(w-prec.w)/2;ui.view.y+=(h-prec.h)/2;applyView()}
        return}
      cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{if(!ui.userView)fit()})}).observe($('#cvwrap'))}
  window.addEventListener('error',e=>{
    const m=String(e&&e.message||'');
    if(/ResizeObserver/i.test(m))return;
    console.error(e&&e.error||m);
    toast('Quelque chose a coincé. Si ça se répète, recharge la page : tes plans sont gardés.')});
  ghcCharger();
  brancherEnLigne();
  relancerEnLigne();
  setTimeout(plansAncre,60)}

/* ---------- démarrage, en dernier : tout ce qui précède est défini ---------- */
demarrer();
