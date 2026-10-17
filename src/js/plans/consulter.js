/* ====== consulter : lire, zoomer, entrer, sans rien pouvoir déplacer ====== */
const RO_OK=new Set(['openB','showOnMap']);
const dl=rows=>{const l=rows.filter(r=>r&&r[1]!==''&&r[1]!=null&&r[1]!==false);return l.length?`<dl class="dl">`+l.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')+`</dl>`:''};
const texte=t=>t&&String(t).trim()?`<p class="texte">${esc(t)}</p>`:'';
const ouiNon=v=>v?'oui':'non';
function roChoisir(hit){ui.sel=hit?[hit.id]:[];renderSide();renderOverlay()}
const RO={
 b:{down(e){if(ui.facade)return false;const m=toM(e);roChoisir(hitAt(m[0],m[1],CF()));return false},
    move(e){},up(e){},cancel(){},dbl(e){}},
 v:{down(e){roChoisir(vHit(toM(e)));return false},
    move(e){},up(e){},cancel(){},
    dbl(e){const h=vHit(toM(e));if(h&&h.t==='bld'&&linkedB(h)){ui.sel=[h.id];roEnter()}}},
 w:{down(e){roChoisir(wHit(toM(e)));return false},
    move(e){},up(e){},cancel(){},
    dbl(e){const m=toM(e),h=wHit(m);if(h&&(h.t==='city'||h.t==='realm')){ui.sel=[h.id];roEnter();return}if(!h){const k=kidAt(m);if(k)goWorld(k.id)}}}
};
/* entrer : jamais de création en lecture, seulement ce qui existe */
function roEnter(){
  if(ui.mode==='v'){const it=vsel()[0];if(it&&it.t==='bld'&&linkedB(it)){ui.from={v:CV().id,id:it.id};P.curB=it.link;setMode('b')}return}
  if(ui.mode==='w'){const it=wsel()[0];if(!it)return;
    if(it.t==='city'){const v=P.villages.find(q=>q.id===it.link);if(v&&!VIRT.has(v.id)){ui.fromW={w:CW().id,id:it.id};ui.from=null;P.curV=v.id;save();setMode('v')}return}
    if(it.t==='realm'){const c=P.worlds.find(q=>q.id===it.link);if(c&&!VIRT.has(c.id))goWorld(c.id)}}}

/* ---- bâtiments ---- */
function roItemB(it){
  const F=CF();
  if(it.t==='room'){const a=roomAire(it);
    return `<h3>${esc(it.name||'Pièce sans nom')}</h3><p class="tag">${esc((RK[it.kind]||RK.piece).n)}</p>`+dl([[libreOk(it)?'Emprise':'Dimensions',fx(it.w)+' × '+fx(it.h)+' m'],['Surface',fx(a)+' m²'],['Étage',F.name]])+texte(it.note)}
  if(it.t==='door')return `<h3>Porte</h3>`+dl([['Type',DK[it.k]||DK.porte],['Largeur',fx(it.w)+' m']]);
  if(it.t==='win')return `<h3>Fenêtre</h3>`+dl([['Type',WK[it.k]||WK.fenetre],['Largeur',fx(it.w)+' m']]);
  if(it.t==='furn'){const d=FD[it.k]||{n:'Objet',w:1,h:1};return `<h3>${esc(d.n)}</h3>`+dl([['Taille',d.w+' × '+d.h+' m']])}
  if(it.t==='stair')return `<h3>Escalier</h3>`+dl([['Sens',({n:'Monte vers le haut',s:'Monte vers le bas',e:'Monte vers la droite',w:'Monte vers la gauche',spiral:'Colimaçon'})[it.dir]||''],['Étiquette',it.label]]);
  if(it.t==='label')return `<h3>Texte</h3>`+texte(it.text);
  if(it.t==='wall')return `<h3>Mur</h3>`+dl([['Type',it.k==='cloison'?'Cloison fine':'Mur épais'],['Longueur',fx(Math.hypot(it.x2-it.x1,it.y2-it.y1))+' m']]);
  return ''}
function roDansVillage(b){
  const L=[];for(const v of P.villages){if(VIRT.has(v.id))continue;for(const i of v.items)if(i.t==='bld'&&i.link===b.id)L.push({v,i})}
  if(!L.length)return '';
  return `<h3>Où il se trouve</h3><ul class="legend">`+L.slice(0,12).map(({v,i})=>`<li><a href="#" data-rov="${v.id}:${i.id}">${esc(v.name)}</a>${i.name?` <span class="hint">${esc(i.name)}</span>`:''}</li>`).join('')+`</ul>`}
function B_consult(){
  const b=CB(),F=CF(),sel=selItems();let h='';
  if(ui.facade){
    const f=b.facade||{};
    h+=`<h3>Façade</h3>`+dl([['Style',({pierre:'Pierre gothique',colombage:'Colombage',brique:'Brique',bois:'Bois'})[f.style]],['Toit',({croupe:'À croupes',pignon:'À pignon',plat:'Plat crénelé'})[f.roof]],['Cheminées',f.chim],['Porche',ouiNon(f.porch!==false)],['Tourelle',ouiNon(!!f.tower)]])+`<p class="hint">Les portes et fenêtres posées sur le mur sud du plan y sont reprises.</p>`}
  else if(sel.length===1)h+=roItemB(sel[0]);
  else h+=`<p class="hint">Clique une pièce ou un objet pour le lire. Glisse dans le vide pour déplacer la vue, molette ou deux doigts pour zoomer.</p>`;
  h+=`<h3>${esc(b.name)}</h3>`+dl([['Emprise',b.gw+' × '+b.gh+' m'],['Étages',b.floors.length],['Étage affiché',F.name]]);
  /* ce qui s'affiche ne change pas le plan : c'est permis en lecture */
  h+=`<div class="row"><label><input type="checkbox" data-ui="grid"${ui.grid?' checked':''}> Grille</label><label><input type="checkbox" data-ui="ghost"${ui.ghost?' checked':''}> Étage du dessous</label><label><input type="checkbox" data-ui="dims"${ui.dims?' checked':''}> Dimensions</label></div>`;
  const rooms=b.floors.flatMap((f,i)=>f.items.filter(x=>x.t==='room'&&x.name&&x.kind!=='cour'&&x.kind!=='couloir').map(x=>({...x,fi:i})));
  h+=`<h3>Pièces (${rooms.length})</h3>`;
  if(rooms.length){let tot=0;h+=`<ul class="legend">`+rooms.map(r=>{const a=roomAire(r);tot+=a;return `<li><span class="pill">${r.fi===0?'RDC':'É'+r.fi}</span><a href="#" data-goto="${r.fi}:${r.id}">${esc(r.name)}</a> <span class="hint">${fx(a)} m²</span></li>`}).join('')+`</ul><p class="hint">Surface totale des pièces : ${fx(tot)} m²</p>`}
  else h+=`<p class="hint">Ce plan n’a encore aucune pièce nommée.</p>`;
  h+=roDansVillage(b);
  if(b.notes&&b.notes.trim())h+=`<h3>Notes</h3>`+texte(b.notes);
  return h}

/* ---- villages ---- */
function roItemV(it){
  if(it.t==='bld'){const l=linkedB(it),d=VKD[it.k]||VKD.maison;
    return `<h3>${esc(it.name||d.n)}</h3><p class="tag">${esc(d.n)}</p>`+(l?`<div class="row"><button type="button" class="btn primary" data-act="openB" style="flex:1">Entrer dans le bâtiment ▸</button></div>`:'')+dl([['Dimensions',fx(it.w)+' × '+fx(it.h)+' m'],['Plan',l?l.name:'']])}
  if(it.t==='road')return `<h3>${esc((RDK[it.k||'route']||RDK.route).n)}</h3>`+dl([['Largeur',fx(roadW(it))+' m'],['Longueur',Math.round(polyLen(it.pts))+' m']]);
  if(it.t==='river')return `<h3>Rivière</h3>`+dl([['Largeur',fx(it.w)+' m']]);
  if(it.t==='wall')return `<h3>Enceinte</h3>`+dl([['Type',WLK[it.k]],['Fermée',ouiNon(!!it.closed)],['Tours',ouiNon(it.towers!==false)]]);
  if(it.t==='poly')return `<h3>${esc(PK[it.k]||'Zone')}</h3>`+dl([['Surface','≈ '+fx(polyArea(it.pts)/10000)+' ha']]);
  if(it.t==='tree')return `<h3>Arbre</h3>`+dl([['Type',({feuillu:'Feuillu',conifere:'Conifère',buisson:'Buisson'})[it.k||'feuillu']],['Taille',fx(it.r)+' m']]);
  if(it.t==='label')return `<h3>Texte</h3>`+texte(it.text);
  if(it.t==='mark')return `<h3>Repère ${esc(it.n)}</h3>`+texte(it.text);
  return ''}
function V_consult(){
  const V=CV(),sel=vsel();let h='';
  if(sel.length===1)h+=roItemV(sel[0]);
  else h+=`<p class="hint">Clique un bâtiment, une route, une zone ou un repère pour le lire. Un bâtiment qui a son plan s’ouvre : double-clic, ou le bouton « Entrer ».</p>`;
  try{refreshLocs()}catch(e){}
  h+=`<h3>${esc(V.name)}</h3>`+dl([['Taille',V.W+' × '+V.H+' m'],['Saison',(TH[V.theme]||TH.ete).n]]);
  if(V.where&&V.where.text)h+=`<h3>Situation</h3><p class="texte">${esc(V.where.text)}.</p><div class="row"><button type="button" class="btn sm" data-act="showOnMap">Voir sur la carte du monde ▸</button></div>`;
  const mk=V.items.filter(i=>i.t==='mark').sort((a,b)=>a.n-b.n);
  if(mk.length)h+=`<h3>Repères (${mk.length})</h3><ul class="legend">`+mk.map(m=>`<li><b>${esc(m.n)}</b><a href="#" data-vsel="${m.id}">${esc(m.text)}</a></li>`).join('')+`</ul>`;
  const ib=V.items.filter(i=>i.t==='bld'&&linkedB(i)).sort((x,y)=>(x.name||linkedB(x).name).localeCompare(y.name||linkedB(y).name,'fr'));
  if(ib.length)h+=`<h3>Intérieurs (${ib.length})</h3><ul class="legend">`+ib.map(b=>`<li><a href="#" data-vsel="${b.id}" style="flex:1">${esc(b.name||linkedB(b).name)}</a><a href="#" data-vopen="${b.id}" title="Entrer dans le bâtiment" aria-label="Entrer dans ${esc(b.name||linkedB(b).name)}">▸</a></li>`).join('')+`</ul>`;
  const bl=V.items.filter(i=>i.t==='bld'),pop=bl.filter(b=>!['puits','tour','porte','tente','halle','moulinv','etable','grange','entrepot','cabane','chapelle','eglise'].includes(b.k)).length;
  h+=`<h3>Chiffres</h3><p class="hint">${bl.length} bâtiments · environ ${Math.round(pop*4.6)} habitants · ${V.items.filter(i=>i.t==='tree').length} arbres · ${V.items.filter(i=>i.t==='road').length} routes</p>`;
  if(V.notes&&V.notes.trim())h+=`<h3>Notes</h3>`+texte(V.notes);
  return h}

/* ---- mondes ---- */
function roItemW(it){
  const w=CW();
  if(it.t==='city'){const v=P.villages.find(q=>q.id===it.link&&!VIRT.has(q.id));
    return `<h3>${esc(it.name||CK[it.k]||'Lieu')}</h3><p class="tag">${esc(CK[it.k]||'Lieu')}</p>`+(v&&canEnter(it)?`<div class="row"><button type="button" class="btn primary" data-act="enter" style="flex:1">Entrer dans le village ▸</button></div>`:'')+dl([['Position',wKm(it.x)+' ; '+wKm(it.y)+' km depuis le coin nord-ouest'],['Village',v?v.name:'']])+texte(it.note)}
  if(it.t==='realm'){const c=P.worlds.find(q=>q.id===it.link&&!VIRT.has(q.id)),inside=w.items.filter(i=>i.t==='city'&&inPoly(i.x,i.y,it.pts));
    return `<h3>${esc(it.name||'Royaume sans nom')}</h3><p class="tag">Royaume</p>`+(c?`<div class="row"><button type="button" class="btn primary" data-act="enter" style="flex:1">Ouvrir la carte détaillée ▸</button></div>`:'')+dl([['Lieux',inside.length+' dans ses frontières']])+texte(it.note)}
  if(it.t==='river')return `<h3>${esc(it.name||'Rivière')}</h3><p class="tag">Rivière</p>`;
  if(it.t==='road')return `<h3>${it.k==='sentier'?'Sentier':'Route'}</h3>`;
  if(it.t==='label')return `<h3>Texte</h3>`+texte(it.text);
  return ''}
function W_consult(){
  const w=CW(),sel=wsel();let h='';
  if(sel.length===1)h+=roItemW(sel[0]);
  else h+=`<p class="hint">Clique un lieu, un royaume ou une rivière pour le lire. Double-clic sur un lieu pour entrer dans sa carte, sur une zone encadrée en pointillés pour ouvrir la carte plus précise.</p>`;
  h+=`<h3>${esc(w.name)}</h3>`+dl([['Échelle',scaleName(w.kmu)],['Étendue',fmtKm(MW*w.kmu)+' × '+fmtKm(MH*w.kmu)+' km'],['Climat',({froid:'Froid',tempere:'Tempéré',chaud:'Chaud'})[w.climate||'tempere']]]);
  const kids=wKids(w).filter(c=>!VIRT.has(c.id)),par=w.parent&&P.worlds.find(x=>x.id===w.parent.id&&!VIRT.has(x.id));
  if(par||kids.length){h+=`<h3>Hiérarchie</h3>`;
    if(par)h+=`<div class="row"><button type="button" class="btn sm" data-wopen="${par.id}">↑ ${esc(par.name)}</button><span class="hint">${scaleName(par.kmu)}</span></div>`;
    if(kids.length)h+=`<p class="tag" style="margin:6px 0 4px">Cartes détaillées</p><div style="display:flex;flex-direction:column;gap:4px">`+kids.map(c=>`<button type="button" class="btn sm" style="text-align:left" data-wopen="${c.id}">▾ ${esc(c.name)} <span class="hint">${scaleName(c.kmu)}</span></button>`).join('')+`</div>`}
  const cs=wLieuxTries(w);
  if(cs.length)h+=`<h3>Lieux (${cs.length})</h3><ul class="legend">`+cs.map(c=>wLigneLieu(c,true)).join('')+`</ul>`;
  const rl=w.items.filter(i=>i.t==='realm');
  if(rl.length)h+=`<h3>Royaumes (${rl.length})</h3><ul class="legend">`+rl.map(r=>wLigneRoyaume(r,true)).join('')+`</ul>`;
  if(w.notes&&w.notes.trim())h+=`<h3>Notes</h3>`+texte(w.notes);
  return h}
/* le panneau de droite en lecture : la fiche du plan, ou rien quand le plan n'existe pas encore */
function roPanneau(){
  const cur=ui.mode==='b'?CB():ui.mode==='w'?CW():CV();
  if(cur&&VIRT.has(cur.id))return `<p class="hint">Rien à lire ici pour l’instant.</p>`;
  return ui.mode==='b'?B_consult():ui.mode==='w'?W_consult():V_consult()}
/* d'un bâtiment, remonter au village qui le porte */
side.addEventListener('click',e=>{
  const a=e.target.closest('[data-rov]');if(!a||ui.edit)return;e.preventDefault();
  const[vid,iid]=a.dataset.rov.split(':');if(!P.villages.find(v=>v.id===vid))return;
  P.curV=vid;ui.fromW=null;ui.from=null;setMode('v');ui.sel=[iid];renderSide();renderOverlay()});

/* le bouton flottant « Entrer » : en lecture, seulement là où l'intérieur existe déjà (jamais « Créer ») */
const _updEnter=updEnter;
updEnter=function(){
  _updEnter();
  if(ui.edit)return;
  const el=$('#enter');if(!el||el.hidden)return;
  let txt='';
  if(ui.mode==='v'){const s=vsel()[0],l=s&&s.t==='bld'&&linkedB(s);if(l)txt='Entrer ▸ '+l.name}
  else if(ui.mode==='w'){const s=wsel()[0];
    if(s&&s.t==='city'){const v=P.villages.find(q=>q.id===s.link&&!VIRT.has(q.id));if(v&&canEnter(s))txt='Entrer ▸ '+v.name}
    else if(s&&s.t==='realm'){const c=P.worlds.find(q=>q.id===s.link&&!VIRT.has(q.id));if(c)txt='Ouvrir ▸ '+c.name}}
  if(txt)el.textContent=txt;else el.hidden=true};
const _enterClic=$('#enter').onclick;
$('#enter').onclick=function(e){if(ui.edit)return _enterClic.call(this,e);roEnter()};

/* ---- passer de l'un à l'autre ---- */
function setEdition(on){
  on=!!on;
  if(!on){
    plansVider();                       /* ce qui attendait d'être gardé l'est avant de passer en lecture */
    g=null;vg=null;wg=null;vdraw=null;wdraw=null;bdraw=null;ui.tool='sel';ui.wPreview=false;if(ui.wk)ui.wk.vil=null;
    cv.style.cursor='default';
  }
  ui.edit=on;
  $('#app').classList.toggle('ro',!on);
  $('#e-c').setAttribute('aria-pressed',String(!on));$('#e-m').setAttribute('aria-pressed',String(on));
  closePop();
  renderAll();
  plansVueBientot()}
$('#e-c').onclick=()=>setEdition(false);
$('#e-m').onclick=()=>setEdition(true);
$('#videMod').onclick=()=>setEdition(true);
/* la page blanche virtuelle, vue en lecture : une invitation plutôt qu'un cadre vide */
function majVide(){
  const el=$('#vide');if(!el||!P)return;
  const cur=ui.mode==='b'?CB():ui.mode==='w'?CW():CV();
  const vide=!ui.edit&&!!cur&&VIRT.has(cur.id);
  el.hidden=!vide;
  if(!vide)return;
  $('#videT').textContent=ui.mode==='b'?'Aucun bâtiment pour l’instant':ui.mode==='v'?'Aucun village pour l’instant':'Aucune carte du monde pour l’instant';
  $('#videP').textContent=ui.mode==='b'?'Les bâtiments se dessinent en mode Modifier. Si tu avais des plans dans l’ancien Atelier, importe son fichier .json avec « Importer », en haut.'
    :ui.mode==='v'?'Les villages se génèrent ou se dessinent en mode Modifier. Un lieu de la carte du monde peut aussi en créer un.'
    :'Les cartes du monde se génèrent ou se peignent en mode Modifier. Si tu avais des plans dans l’ancien Atelier, importe son fichier .json avec « Importer », en haut.'}
