/* ====== interface générale ====== */
const MODE=()=>ui.edit?(ui.mode==='b'?BM:ui.mode==='w'?WM:VM):RO[ui.mode];
function renderCanvas(){isoVolet();ui.mode==='b'?B_render():ui.mode==='w'?W_render():V_render()}
function renderSide(){panneauEcrire((prOn()?prPanneau():isoOn()?isoPanneau():'')+(isoDeux()?isoPanneau():'')+(ui.edit?(ui.mode==='b'?B_side():ui.mode==='w'?W_side():V_side()):roPanneau()))}
function renderSideLight(){
  const sel=ui.mode==='b'?selItems():ui.mode==='w'?wsel():vsel();if(sel.length!==1)return;
  $$('#side [data-f]').forEach(el=>{if(document.activeElement===el||el.type==='checkbox')return;const v=sel[0][el.dataset.f];if(v!=null&&el.tagName!=='SELECT')el.value=v});
}
function mondesEnArbre(){
  const out=[],vus=new Set();
  const ajout=(w,d)=>{if(vus.has(w.id)||d>8)return;vus.add(w.id);out.push([w,d]);P.worlds.filter(x=>x.parent&&x.parent.id===w.id).forEach(c=>ajout(c,d+1))};
  P.worlds.filter(w=>!(w.parent&&P.worlds.some(x=>x.id===w.parent.id))).forEach(w=>ajout(w,0));
  P.worlds.forEach(w=>ajout(w,0));
  return out}
function fillItemSel(){
  const m=ui.mode,cur=m==='b'?P.curB:m==='w'?P.curW:P.curV;
  const L=m==='w'?mondesEnArbre().map(([w,d])=>[w,'  '.repeat(d)+w.name+' · '+scaleName(w.kmu)]):(m==='b'?P.buildings:P.villages).map(x=>[x,x.name]);
  $('#itemSel').innerHTML=L.map(([x,t])=>`<option value="${esc(x.id)}"${x.id===cur?' selected':''}>${esc(VIRT.has(x.id)?'(aucun pour l’instant)':t)}</option>`).join('')}
function renderTop(){
  $('#m-b').setAttribute('aria-pressed',ui.mode==='b');$('#m-v').setAttribute('aria-pressed',ui.mode==='v');$('#m-w').setAttribute('aria-pressed',ui.mode==='w');fillItemSel();updUndo();majBoutonTable()}
function renderAll(){renderTop();renderTools();renderFloorbar();renderCanvas();renderSide();renderOverlay();applyView();majVide()}
function setMode(m){prFermer();isoOublierPiece();ui.mode=m;ui.tool='sel';ui.sel=[];ui.facade=false;ui.iso.on=false;vdraw=null;g=null;vg=null;wdraw=null;wg=null;renderAll();fit();plansVueBientot()}
$('#m-b').onclick=()=>{ui.fromW=null;setMode('b')};$('#m-v').onclick=()=>{ui.fromW=null;setMode('v')};$('#m-w').onclick=()=>{ui.fromW=null;setMode('w')};
$('#itemSel').onchange=e=>{ui.fromW=null;isoOublierPiece();if(ui.mode==='b')P.curB=e.target.value;else if(ui.mode==='w')P.curW=e.target.value;else P.curV=e.target.value;ui.sel=[];ui.fl=0;ui.facade=false;save();renderAll();fit()};
/* nouveau / dupliquer / supprimer */
$('#bNew').onclick=()=>{
  if(ui.mode==='b'){
    modal(`<h2>Nouveau bâtiment</h2><div class="row"><label>Modèle</label><select id="nbType">${opt(GT,'vide')}</select></div><div class="row"><label>Nom</label><input type="text" id="nbName" placeholder="(automatique)"></div><div class="row"><label>Graine</label><input type="number" id="nbSeed" value="${Math.floor(Math.random()*99999)+1}"></div><p class="hint">Les modèles posent murs, portes, fenêtres, escaliers et mobilier. Tout reste modifiable ensuite.</p><div class="row"><button class="btn primary" id="nbGo">Créer</button><button class="btn" onclick="closeModal()">Annuler</button></div>`);
    $('#nbGo').onclick=()=>{snap();const b=genBuilding($('#nbType').value,+$('#nbSeed').value||1);if($('#nbName').value.trim())b.name=$('#nbName').value.trim();P.buildings.push(b);P.curB=b.id;ui.fl=0;ui.sel=[];closeModal();save();renderAll();fit()}}
  else if(ui.mode==='w')newWorldModal();
  else{
    modal(`<h2>Nouvelle carte</h2><div class="row"><label>Nom</label><input type="text" id="nvName" placeholder="(automatique)"></div><div class="row"><label><input type="checkbox" id="nvGen" checked> Générer avec les réglages du panneau (taille ${ui.gen.size}, graine ${ui.gen.seed})</label></div><div class="row"><button class="btn primary" id="nvGo">Créer</button><button class="btn" onclick="closeModal()">Annuler</button></div>`);
    $('#nvGo').onclick=()=>{snap();const v=mkV($('#nvName').value.trim()||'Nouveau village');if($('#nvGen').checked){genVillage(v,ui.gen);if(!$('#nvName').value.trim()){}}P.villages.push(v);P.curV=v.id;ui.sel=[];closeModal();save();renderAll();fit()}}};
$('#bDup').onclick=()=>{snap();const L=ui.mode==='b'?P.buildings:ui.mode==='w'?P.worlds:P.villages,cur=ui.mode==='b'?CB():ui.mode==='w'?CW():CV();const c=JSON.parse(JSON.stringify(cur));c.id=uid();c.name+=' (copie)';
  const rid=it=>{it.id=uid()};if(ui.mode==='b')c.floors.forEach(f=>f.items.forEach(rid));else{c.items.forEach(rid);if(ui.mode==='w'){c.parent=null;c.items.forEach(i=>{if(i.t==='realm')delete i.link})}}
  L.splice(L.indexOf(cur)+1,0,c);if(ui.mode==='b')P.curB=c.id;else if(ui.mode==='w')P.curW=c.id;else P.curV=c.id;save();renderAll()};
$('#bDel').onclick=function(){
  if(!armed(this,'Supprimer ce plan ?'))return;snap();const L=ui.mode==='b'?P.buildings:ui.mode==='w'?P.worlds:P.villages,cur=ui.mode==='b'?P.curB:ui.mode==='w'?P.curW:P.curV;
  if(ui.mode==='w')P.worlds.forEach(x=>{if(x.parent&&x.parent.id===cur)x.parent=null});
  const i=L.findIndex(x=>x.id===cur);L.splice(i,1);fixCur();ui.sel=[];ui.fl=0;save();renderAll();fit()};
$('#bUndo').onclick=undo;$('#bRedo').onclick=redo;
