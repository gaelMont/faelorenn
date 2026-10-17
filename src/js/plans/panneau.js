/* ====== le panneau de droite, les lieux, l'import et le plein écran ====== */

/* ---- les tiroirs (<details>) restent comme tu les as laissés ----
   Le panneau se réécrit à chaque clic sur le plan : sans mémoire, tout tiroir se refermait. L'état se garde par genre de plan
   et par titre, dans ce navigateur. */
const TIROIRS=Object.create(null);
try{
  const o=JSON.parse(localStorage.getItem('faelorenn.plans.tiroirs')||'null');
  if(o&&typeof o==='object'&&!Array.isArray(o))for(const k of Object.keys(o))if(typeof o[k]==='boolean'&&/^[bvw]:.{1,80}$/.test(k))TIROIRS[k]=o[k]
}catch(e){}
let tiroirsT=0;
const tiroirCle=d=>{const s=d.querySelector(':scope>summary');return ui.mode+':'+(s?s.textContent.trim():'')};
function tiroirsGarder(){clearTimeout(tiroirsT);tiroirsT=setTimeout(()=>{try{localStorage.setItem('faelorenn.plans.tiroirs',JSON.stringify(TIROIRS))}catch(e){}},250)}
/* « toggle » ne remonte pas : on l'écoute en capture. Il porte toujours l'état du moment, donc le répéter ne gêne pas. */
side.addEventListener('toggle',e=>{
  const d=e.target;
  if(!d||d.tagName!=='DETAILS'||!side.contains(d))return;
  const k=tiroirCle(d);
  if(TIROIRS[k]===d.open)return;
  TIROIRS[k]=d.open;tiroirsGarder()},true);
/* écrire le panneau : les tiroirs retrouvent leur état et le défilement ne bouge pas */
function panneauEcrire(html){
  const y=side.scrollTop;
  side.innerHTML=html;
  side.querySelectorAll('details').forEach(d=>{const k=tiroirCle(d);if(k in TIROIRS)d.open=TIROIRS[k]});
  side.scrollTop=y}

/* la liste des groupes : choisir un groupe, ou le défaire */
side.addEventListener('click',e=>{
  const a=e.target.closest('[data-grp]');
  if(a){e.preventDefault();const L=grpMembres(a.dataset.grp);if(L.length){ui.sel=L.map(i=>i.id);renderSide();renderOverlay()}return}
  const o=e.target.closest('[data-grpoff]');
  if(o){e.preventDefault();grpDefaire(grpMembres(o.dataset.grpoff));return}});

/* la molette au-dessus d'une liste qui a le focus en changeait la valeur (la forme d'une pièce, l'étage) sans qu'on le veuille */
addEventListener('wheel',()=>{const a=document.activeElement;if(a&&a.tagName==='SELECT')a.blur()},{passive:true,capture:true});

/* ---- les lieux de la carte du monde : se choisir, se montrer, s'ouvrir ---- */
const wNom=c=>c.name||'('+((CK[c.k]||'lieu').toLowerCase())+' sans nom)';
/* les lieux nommés d'abord, dans l'ordre alphabétique ; ceux qui n'ont pas de nom ensuite, par genre puis par position */
function wLieuxTries(w){
  return w.items.filter(i=>i.t==='city').sort((a,b)=>{
    const na=a.name?0:1,nb=b.name?0:1;
    if(na!==nb)return na-nb;
    if(na===0)return String(a.name).localeCompare(String(b.name),'fr');
    return String(a.k).localeCompare(String(b.k))||a.y-b.y||a.x-b.x})}
/* un lieu a un village à ouvrir ? (en lecture : seulement s'il existe déjà) */
function wOuvrable(c,lecture){
  if(c.t==='city'){
    if(!canEnter(c))return null;
    const v=P.villages.find(q=>q.id===c.link&&!VIRT.has(q.id));
    if(v)return{txt:'Ouvrir ▸',titre:'Ouvrir le village « '+v.name+' »'};
    return lecture?null:{txt:'Ouvrir ▸',titre:'Créer la carte du village et l’ouvrir'}}
  if(c.t==='realm'){
    const m=P.worlds.find(q=>q.id===c.link&&!VIRT.has(q.id));
    if(m)return{txt:'Ouvrir ▸',titre:'Ouvrir la carte détaillée « '+m.name+' »'};
    return lecture?null:{txt:'Zoom ▸',titre:'Créer la carte détaillée de ce royaume et l’ouvrir'}}
  return null}
function wLigneLieu(c,lecture){
  const sel=ui.sel.includes(c.id),o=wOuvrable(c,lecture);
  const pos=c.name?'':'<small>'+esc(wKm(c.x)+' ; '+wKm(c.y)+' km')+'</small>';
  return `<li class="lieu${sel?' on':''}"${sel?' aria-current="true"':''}><span class="pill" title="${esc(CK[c.k]||'')}">${esc((CK[c.k]||'').slice(0,4))}</span><span class="nm"><a href="#" data-wsel="${c.id}">${esc(wNom(c))}</a>${pos}</span>`
    +(o?`<button type="button" class="btn sm go" data-wgo="${c.id}" title="${esc(o.titre)}">${o.txt}</button>`:'')+`</li>`}
function wLigneRoyaume(r,lecture){
  const sel=ui.sel.includes(r.id),o=wOuvrable(r,lecture);
  const col=/^#[0-9a-f]{6}$/i.test(r.color||'')?r.color:'#c4784f';
  return `<li class="lieu${sel?' on':''}"${sel?' aria-current="true"':''}><b style="background:${esc(col)}">&nbsp;</b><span class="nm"><a href="#" data-wsel="${r.id}">${esc(r.name||'(sans nom)')}</a></span>`
    +(o?`<button type="button" class="btn sm go" data-wgo="${r.id}" title="${esc(o.titre)}">${o.txt}</button>`:'')+`</li>`}
/* ramener dans la fenêtre le lieu qu'on vient de choisir dans la liste (sans changer le zoom) */
function wMontrer(id){
  if(ui.mode!=='w')return;
  const it=CW().items.find(i=>i.id===id);if(!it)return;
  let x=it.x,y=it.y;
  if(it.t==='realm'){const L=realmLab(it);x=L[0];y=L[1]}
  if(typeof x!=='number'||typeof y!=='number')return;
  const r=cv.getBoundingClientRect();if(!r.width)return;
  const k=ui.view.k,sx=x*k+ui.view.x,sy=y*k+ui.view.y,mx=Math.min(60,r.width*.12),my=Math.min(60,r.height*.12);
  if(sx>=mx&&sx<=r.width-mx&&sy>=my&&sy<=r.height-my)return;
  ui.userView=true;ui.view.x=r.width/2-x*k;ui.view.y=r.height/2-y*k;applyView()}
/* choisir dans la liste : la ligne reste sous le doigt (le panneau du haut change de hauteur), le lieu apparaît sur la carte */
function wChoisirListe(a){
  const id=a.dataset.wsel,haut=a.getBoundingClientRect().top;
  ui.sel=[id];renderSide();
  const b=side.querySelector('[data-wsel="'+id+'"]');
  if(b)side.scrollTop+=b.getBoundingClientRect().top-haut;
  wMontrer(id);renderOverlay()}
/* double-clic sur un nom de la liste : comme sur la carte, ça ouvre (seulement ce que le bouton « Ouvrir ▸ » de la ligne ouvrirait) */
function wDoubleClic(a){
  const it=CW().items.find(i=>i.id===a.dataset.wsel);
  if(it&&wOuvrable(it,!ui.edit))wAller(it.id)}
/* ouvrir : le village d'un lieu, la carte détaillée d'un royaume */
function wAller(id){
  const it=CW().items.find(i=>i.id===id);if(!it)return;
  ui.sel=[id];
  if(ui.edit)W_act('enter');else roEnter()}

/* ---- Importer, à côté d'Exporter ---- */
$('#bImp').onclick=function(){
  const ouvrir=genre=>{plGenreImport=genre;$('#plFichier').click()};
  popup(this,[
    {t:'Un fichier .json : tout ce qu’il porte',f:()=>ouvrir(null)},
    '-',
    {t:'Seulement les bâtiments du fichier',f:()=>ouvrir('b')},
    {t:'Seulement les villages du fichier',f:()=>ouvrir('v')},
    {t:'Seulement les cartes du monde du fichier',f:()=>ouvrir('w')}])};

/* ---- plein écran ----
   La page entière passe en plein écran (la fenêtre du navigateur s'efface) et l'établi prend toute la place. Quand le navigateur
   ne sait pas (iPhone), l'établi couvre quand même toute la fenêtre. Les fenêtres et le menu restent au-dessus. */
const IC_PLEIN='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';
const IC_QUITTER='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4"/></svg>';
const pleinOn=()=>document.body.classList.contains('plein');
let pleinJusqua=0;
function pleinMaj(){
  const on=pleinOn(),b=$('#bFull');
  b.setAttribute('aria-pressed',String(on));
  b.title=on?'Quitter le plein écran (Maj+F, ou Échap)':'Plein écran (Maj+F)';
  b.setAttribute('aria-label',on?'Quitter le plein écran':'Plein écran');
  b.innerHTML=on?IC_QUITTER:IC_PLEIN}
function pleinBasculer(vouloir){
  const on=vouloir===undefined?!pleinOn():!!vouloir;
  if(on===pleinOn())return;
  pleinJusqua=Date.now()+1200;       /* le temps que la fenêtre change de taille : la vue garde son centre */
  closePop();
  document.body.classList.toggle('plein',on);
  /* le reste de la page n'est plus atteignable au clavier tant que l'établi la couvre */
  document.querySelectorAll('.fae-site,.wrap>:not(#app)').forEach(el=>{el.inert=on});
  if(on){
    const el=document.documentElement;
    if(el.requestFullscreen){try{const p=el.requestFullscreen({navigationUI:'hide'});if(p&&p.catch)p.catch(()=>{})}catch(e){}}}
  else if(document.fullscreenElement&&document.exitFullscreen){
    try{const p=document.exitFullscreen();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
  pleinMaj();
  if(!ui.userView)requestAnimationFrame(()=>fit())}
/* Échap du navigateur : il sort du plein écran tout seul, l'établi suit */
document.addEventListener('fullscreenchange',()=>{
  if(!document.fullscreenElement&&pleinOn())pleinBasculer(false);
  else if(document.fullscreenElement&&!pleinOn()&&document.exitFullscreen){try{const p=document.exitFullscreen();if(p&&p.catch)p.catch(()=>{})}catch(e){}}});
$('#bFull').onclick=()=>pleinBasculer();
pleinMaj();
