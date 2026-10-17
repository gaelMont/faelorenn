/* ============ le registre sur GitHub ============
   plans.json, dans le dépôt de la sauvegarde en ligne, avec les mêmes règles que les autres fichiers :
   on relit toutes les dix secondes (GitHub répond 304 tant que rien n'a bougé), on écrit en regroupant les
   changements, jamais deux fois en moins de quinze secondes. Chaque plan y porte sa date, et le plus récent l'emporte. */
let GH=null;            /* le fichier du dépôt, tant que le dépôt est relié */
let PANNEAU=null;
function ghPlans(){
  const doc=ghcDoc({
    nom:'Plans', quoi:'un registre de plans Faelorenn', format:PL_FORMAT, chemin:GHC_FICHIERS.plans,
    recevoir:o=>{plansRecevoir(o,{garder:true})},
    enAvance:o=>plansEnAvance(o),
    contenu:()=>{plansSuivre();return JSON.parse(plansTexte())},
    texte:()=>{plansSuivre();return plansTexte()},
    etat:()=>{dessinerEtat();if(PANNEAU)PANNEAU.dessiner()}
  });
  doc.demarrer();
  return doc}
/* relier, détacher : le registre repart du bon pied, sans recharger la page */
function relancerEnLigne(){
  if(GH){GH.arreter();GH=null}
  ghcCharger();
  if(ghcPret())GH=ghPlans();
  dessinerEtat()}
function dessinerEtat(){
  const p=$('#etat');
  if(!p)return;
  let cls='pt',t='Gardé dans ce navigateur seulement';
  /* une erreur qui a arrêté la sauvegarde en ligne se lit aussi : c'est elle qui explique pourquoi rien ne part */
  if(GH&&ghcPret()&&(GH.actif||GH.erreur)){
    if(GH.erreur){cls='pt off';t='En ligne : à vérifier. '+GH.erreur}
    else{cls='pt on';t=GH.enAttente()?'En ligne : un changement part dans un instant':'En ligne : dernier échange '+ghcIlYA(GH.dernier)}}
  /* le navigateur refuse d'écrire (espace plein, stockage bloqué) : mieux vaut le savoir avant de tout perdre */
  if(!PL_GARDE){cls='pt off';t='Pas gardé dans ce navigateur : il refuse d’écrire (espace plein ou stockage bloqué). Télécharge une sauvegarde .json pour ne rien perdre.'}
  /* la ligne est annoncée aux lecteurs d'écran : on ne la réécrit que si elle a changé */
  const marque=cls+'|'+t;
  if(dessinerEtat.marque===marque&&p.firstChild)return;
  dessinerEtat.marque=marque;
  p.innerHTML='';
  const pt=document.createElement('span');pt.className=cls;
  p.append(pt,document.createTextNode(t))}
function plDire(t,ok){
  const m=$('#plMsg');
  m.textContent=t;m.hidden=false;m.className=ok?'note ok':'note err';
  clearTimeout(plDire.t);plDire.t=setTimeout(()=>{m.hidden=true},12000);
  /* « Importer » est en haut de l'établi : la réponse s'y lit aussi, pas seulement dans la section du bas */
  toast(t)}
/* « Sauvegarder en ligne » : tout part tout de suite dans le dépôt */
function sauverEnLigne(){
  const b=$('#plEnLigne');
  if(!ghcPret()){
    plDire('Relie d’abord ton dépôt GitHub, une seule fois : c’est le panneau « Sauvegarde en ligne », juste en dessous. Ensuite, chaque changement part tout seul.',false);
    ghcOuvrirPanneau();
    return}
  /* le dépôt n'avait pas répondu à l'ouverture : on refrappe à la porte */
  if(!GH||!GH.actif){
    relancerEnLigne();
    plDire('Nouvel essai avec le dépôt : ce qui attend ici y part dès qu’il répond. L’état s’affiche en haut de la page.',true);
    return}
  plansVider();
  b.disabled=true;b.textContent='Sauvegarde…';
  GH.maintenant().then(r=>{
    b.disabled=false;b.textContent='Sauvegarder en ligne';
    plDire(ghcPhraseSauvegarde(r,'Les plans'),r.ok);
    dessinerEtat()})}

/* ---------- une sauvegarde .json ---------- */
function telecharger(nom,contenu,type,bouton){
  const libelle=bouton?bouton.textContent:'';
  const dire=t=>{if(!bouton)return;bouton.textContent=t;setTimeout(()=>{bouton.textContent=libelle},2200)};
  const blob=contenu instanceof Blob?contenu:new Blob([contenu],{type:type});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=nom;a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},4000);
  dire('Fichier envoyé')}
const sauvegardeJson=()=>{plansVider();plansSuivre();return plansTexte()};
const PL_NOM={b:'bâtiment',v:'village',w:'carte du monde'};
const PL_AUCUN={b:'aucun bâtiment',v:'aucun village',w:'aucune carte du monde'};
/* ce qui entre, comparé à ce qu'on a ici : des plans propres, sans date (la date sera celle de la reprise) */
function plansEntrants(lots,rejetes){
  const entrants={b:[],v:[],w:[]},neufs=[],differents=[];let identiques=0;
  for(const[k,liste]of lots){
    for(const q of liste){
      const loc=META[k][q.id];
      if(loc&&!loc.del&&SER[k][q.id]===JSON.stringify(q)){identiques++;continue}
      entrants[k].push(q);
      (loc&&!loc.del?differents:neufs).push({nom:q.name,k:k})}}
  const cur={};
  for(const[k]of PL_GENRES)if(entrants[k].length)cur[k]=entrants[k][0].id;
  /* un village dont un bâtiment lié n'est ni ici ni dans le fichier : le lien tombera à la première ouverture du village */
  const la=new Set();
  plansListe('b').forEach(p=>la.add(p.id));entrants.b.forEach(p=>la.add(p.id));
  let sansPlan=0;
  for(const q of entrants.v)if(q.items.some(it=>it.t==='bld'&&it.link&&!la.has(it.link)))sansPlan++;
  return {entrants:entrants,neufs:neufs,differents:differents,identiques:identiques,rejetes:rejetes,sansPlan:sansPlan,cur:cur}}
/* un projet de l'ancien Atelier : trois listes de plans, sans date. On montre ce qui entre avant de le faire. */
function plansLireAtelier(o,genre){
  plansSuivre();
  const lots=[];let rejetes=0;
  for(const[k,arr]of [['b',o.buildings],['v',o.villages],['w',o.worlds]]){
    if(genre&&genre!==k)continue;
    const liste=[];let n=0;
    for(const p of (Array.isArray(arr)?arr:[])){
      if(n++>=PL_MAX){rejetes++;continue}
      const id=pnObj(p)?p.id:null;
      if(!plansIdOk(id)){rejetes++;continue}
      const q=plansNettoyer(k,p,id);if(!q){rejetes++;continue}
      liste.push(q)}
    lots.push([k,liste])}
  const r=plansEntrants(lots,rejetes);
  if(!genre){
    const cur={b:o.curB,v:o.curV,w:o.curW};
    for(const[k]of PL_GENRES)if(cur[k]===undefined&&r.cur[k]!==undefined)cur[k]=r.cur[k];
    r.cur=cur}
  return r}
/* un fichier du Registre qui n'est pas une sauvegarde complète : un plan, un plan et ses plans liés, un genre */
function plansLireRegistre(o,genre){
  plansSuivre();
  const brut=plansLireBrut(o),lots=[];
  for(const[k]of PL_GENRES){
    if(genre&&genre!==k)continue;
    lots.push([k,Object.keys(brut[k]).filter(id=>brut[k][id].plan).map(id=>brut[k][id].plan)])}
  return plansEntrants(lots,0)}
function plansAppliquerAtelier(r){
  plansSuivre();
  for(const[k]of PL_GENRES)for(const q of r.entrants[k]){
    const lst=plansListe(k),i=lst.findIndex(x=>x.id===q.id);
    if(i>=0)lst[i]=q;else lst.push(q);
    META[k][q.id]={maj:plansMaintenant(k,q.id)};SER[k][q.id]=JSON.stringify(q);PL_SALE=true}
  plansPurger();
  if(plansListe('b').some(x=>x.id===r.cur.b))P.curB=r.cur.b;
  if(plansListe('v').some(x=>x.id===r.cur.v))P.curV=r.cur.v;
  if(plansListe('w').some(x=>x.id===r.cur.w))P.curW=r.cur.w;
  fixCur();
  g=null;vg=null;wg=null;vdraw=null;wdraw=null;bdraw=null;
  histClear();ui.sel=[];ui.fl=0;ui.facade=false;ui.from=null;ui.fromW=null;
  try{refreshLocs()}catch(e){}
  plansSuivre();
  plansGarder();
  if(GH&&GH.actif)GH.planifier();
  renderAll();fit();dessinerEtat()}
/* où l'on regarde après une reprise : le genre des plans qui viennent d'arriver, si l'on n'y était pas */
function plansAller(r){
  const ks=PL_GENRES.map(g=>g[0]).filter(k=>r.entrants[k].length);
  if(ks.length&&!ks.includes(ui.mode)){ui.fromW=null;ui.from=null;setMode(ks[0])}}
function plansFenetre(r){
  const tout=r.neufs.length+r.differents.length;
  const liste=(t,L)=>L.length?'<p>'+esc(t)+'</p><ul>'+L.slice(0,12).map(n=>'<li>'+esc(n.nom)+' <span class="hint">('+PL_NOM[n.k]+')</span></li>').join('')+(L.length>12?'<li>et '+(L.length-12)+' autres</li>':'')+'</ul>':'';
  modal('<h2>Reprendre ces plans ?</h2>'
    +(r.neufs.length?'<p><b>'+pluriel(r.neufs.length,'plan nouveau va','plans nouveaux vont')+'</b> s’ajouter.</p>'+liste('Les voici :',r.neufs):'')
    +(r.differents.length?'<p><b>'+pluriel(r.differents.length,'plan existe déjà ici avec un autre contenu','plans existent déjà ici avec un autre contenu')+'</b> : le fichier prend '+(r.differents.length>1?'leur place':'sa place')+'.</p>'+liste('Remplacés :',r.differents):'')
    +(r.identiques?'<p class="hint">'+pluriel(r.identiques,'plan est','plans sont')+' déjà ici, tel quel.</p>':'')
    +(r.sansPlan?'<p class="hint">'+pluriel(r.sansPlan,'village renvoie','villages renvoient')+' à des bâtiments qui ne sont pas ici : ces liens seront perdus. Reprends d’abord les bâtiments, ou exporte le village avec « et ses plans liés ».</p>':'')
    +(r.rejetes?'<p class="hint">'+pluriel(r.rejetes,'plan illisible a été écarté','plans illisibles ont été écartés')+'.</p>':'')
    +'<div class="row"><button type="button" class="btn primary" id="plOk">Importer</button><button type="button" class="btn" id="plNon">Annuler</button></div>');
  $('#plOk').onclick=()=>{closeModal();plansAppliquerAtelier(r);plansAller(r);plDire('Repris : '+pluriel(tout,'plan','plans')+'.',true)};
  $('#plNon').onclick=closeModal}
/* genre : ne reprendre que les bâtiments, ou que les villages, ou que les cartes du monde (null : tout ce que le fichier porte) */
function plansOuvrirFichier(texte,genre){
  let o=null;
  try{o=JSON.parse(texte)}catch(e){plDire('Ce fichier n’est pas lisible.',false);return}
  const registre=pnObj(o)&&o.format===PL_FORMAT;
  const atelier=!registre&&pnObj(o)&&Array.isArray(o.buildings)&&Array.isArray(o.villages);
  if(!registre&&!atelier){plDire('Ce n’est pas une sauvegarde de plans : ni du Registre, ni de l’ancien Atelier des plans.',false);return}
  if(registre&&+o.version>PL_VERSION){plDire('Cette sauvegarde vient d’une version plus récente du Registre : mets d’abord le site à jour.',false);return}
  /* la sauvegarde complète du Registre se fond par les dates, comme le fichier du dépôt : le plus récent l'emporte */
  if(registre&&!genre&&o.portee!=='partiel'){
    const n=plansRecevoir(o,{garder:true});
    if(n&&GH&&GH.actif)GH.planifier();
    plDire(n?'Repris : '+pluriel(n,'plan nouveau ou plus récent','plans nouveaux ou plus récents')+'.':'Rien de neuf dans ce fichier : tout y est déjà, ou en plus récent ici.',true);
    return}
  /* tout le reste (un plan, un genre, un projet de l'Atelier) : on dit ce qui entre, et le fichier prend la place de ce qui existe */
  const r=registre?plansLireRegistre(o,genre):plansLireAtelier(o,genre);
  const tout=r.neufs.length+r.differents.length;
  if(!tout){
    if(r.identiques)plDire('Rien de neuf dans ce fichier : '+(r.identiques>1?'ses '+r.identiques+' plans sont déjà ici, tels quels.':'son plan est déjà ici, tel quel.'),true);
    else plDire(genre?'Ce fichier ne contient '+PL_AUCUN[genre]+'.':'Ce fichier ne contient aucun plan lisible.',false);
    return}
  plansFenetre(r)}

/* ---------- exporter à part : un plan, un plan et ceux qui en dépendent, un genre ---------- */
const plansCourant=k=>k==='b'?CB():k==='v'?CV():CW();
/* une carte du monde mène à ses villages et à ses cartes plus précises, un village à ses bâtiments */
function plansDepend(k,p){
  const out={b:new Set(),v:new Set(),w:new Set()};
  const va=(kk,q)=>{
    if(!q||VIRT.has(q.id)||out[kk].has(q.id))return;
    out[kk].add(q.id);
    if(kk==='w'){
      for(const it of q.items){
        if(it.t==='city'&&it.link)va('v',P.villages.find(x=>x.id===it.link));
        else if(it.t==='realm'&&it.link)va('w',P.worlds.find(x=>x.id===it.link))}
      for(const c of P.worlds)if(c.parent&&c.parent.id===q.id)va('w',c)}
    else if(kk==='v'){for(const it of q.items)if(it.t==='bld'&&it.link)va('b',P.buildings.find(x=>x.id===it.link))}};
  va(k,p);
  return out}
/* le texte d'un fichier qui ne porte que les plans choisis, chacun avec sa date : il se reprend plan par plan */
function plansTexteChoix(sel){
  plansVider();plansSuivre();
  const parts=[];let n=0;
  for(const[k,nom]of PL_GENRES){
    const ent=Object.keys(META[k]).sort().filter(id=>sel[k].has(id)&&!META[k][id].del&&!VIRT.has(id)&&SER[k][id]!==undefined)
      .map(id=>{n++;return JSON.stringify(id)+':{"maj":'+META[k][id].maj+',"plan":'+SER[k][id]+'}'});
    parts.push('"'+nom+'":{'+ent.join(',')+'}')}
  return {texte:'{"format":"'+PL_FORMAT+'","version":'+PL_VERSION+',"portee":"partiel",'+parts.join(',')+'}',n:n}}
const plansVide=()=>({b:new Set(),v:new Set(),w:new Set()});
function exporterPlan(k,avecLies){
  const p=plansCourant(k);
  if(!p||VIRT.has(p.id)){toast('Rien à exporter : cette page est encore blanche');return}
  const sel=plansVide();
  if(avecLies){const d=plansDepend(k,p);for(const[kk]of PL_GENRES)d[kk].forEach(id=>sel[kk].add(id))}
  else sel[k].add(p.id);
  const r=plansTexteChoix(sel);
  const nom=({b:'batiment',v:'village',w:'monde'})[k]+'-'+slug(p.name)+(avecLies?'-et-liens':'')+'.json';
  telecharger(nom,r.texte,'application/json',null);
  toast('Fichier téléchargé : '+nom+(r.n>1?' ('+r.n+' plans)':''))}
function exporterGenre(k){
  const ids=plansListe(k).filter(p=>!VIRT.has(p.id)).map(p=>p.id);
  if(!ids.length){toast('Rien à exporter : il n’y a encore '+PL_AUCUN[k]+'.');return}
  const sel=plansVide();ids.forEach(id=>sel[k].add(id));
  const r=plansTexteChoix(sel);
  const nom=({b:'batiments',v:'villages',w:'mondes'})[k]+'-faelorenn.json';
  telecharger(nom,r.texte,'application/json',null);
  toast('Fichier téléchargé : '+nom+' ('+pluriel(r.n,'plan','plans')+')')}
/* le menu « Exporter » de chaque établi y ajoute ses fichiers .json */
function plansMenuJson(E){
  const k=ui.mode,p=plansCourant(k),vide=!p||VIRT.has(p.id);
  E.push('-');
  E.push({t:'Ce plan : fichier .json',f:()=>exporterPlan(k,false)});
  if(!vide){
    const d=plansDepend(k,p),nb=d.b.size+d.v.size+d.w.size;
    if(nb>1)E.push({t:'Ce plan et '+(nb>2?'ses '+(nb-1)+' plans liés':'son plan lié')+' : fichier .json',f:()=>exporterPlan(k,true)})}
  E.push({t:({b:'Tous les bâtiments',v:'Tous les villages',w:'Tous les mondes'})[k]+' : fichier .json',f:()=>exporterGenre(k)});
  E.push({t:'Tous les plans : sauvegarde .json',f:()=>{telecharger('plans-faelorenn.json',sauvegardeJson(),'application/json',null);toast('Fichier téléchargé : plans-faelorenn.json')}})}
let plGenreImport=null;   /* le genre que « Importer » vient de demander (null : tout ce que le fichier porte) */

function brancherEnLigne(){
  $('#plEnLigne').onclick=sauverEnLigne;
  $('#plJson').onclick=e=>telecharger('plans-faelorenn.json',sauvegardeJson(),'application/json',e.currentTarget);
  $('#plFichier').onchange=e=>{
    const f=e.target.files&&e.target.files[0];
    if(!f)return;
    const genre=plGenreImport;plGenreImport=null;
    const lecteur=new FileReader();
    lecteur.onload=()=>{plansOuvrirFichier(String(lecteur.result),genre);e.target.value=''};
    lecteur.readAsText(f)};
  PANNEAU=ghcPanneau($('#ghcPlace'),{
    etat:()=>GH?{nom:'Les plans',texte:GH.actif?'dernier échange '+ghcIlYA(GH.dernier):'à l’arrêt',erreur:GH.erreur}:null,
    apresRelier:r=>{relancerEnLigne();return r},
    apresDetacher:()=>relancerEnLigne()
  });
  ghcSurveiller(()=>{relancerEnLigne();PANNEAU.dessiner()});
  setInterval(dessinerEtat,5000)}
