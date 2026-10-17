/* ====== exports ====== */
async function exportSvg(o,name){await saveFile(name+'.svg',o.svg,'image/svg+xml')}
async function exportPng(o,name){try{const sc=Math.min(2,7000/Math.max(o.w,o.h));const b=await svgToPng(o.svg,o.w,o.h,sc);await saveFile(name+'.png',b,'image/png')}catch(e){toast('Export PNG impossible ici. Utilise le SVG.')}}
function mdBuilding(b){
  let s=`# ${b.name}\n\n`;if(b.notes)s+=b.notes+'\n\n';
  b.floors.forEach(F=>{s+=`## ${F.name}\n\n`;const rs=F.items.filter(i=>i.t==='room'&&i.name&&i.kind!=='cour');
    rs.forEach(r=>{const a=roomAire(r);s+=`- **${r.name}** : ${fx(r.w)} × ${fx(r.h)} m (${fx(a)} m²)${r.note?'\n  '+r.note.replace(/\n+/g,'\n  '):''}\n`});
    const fu=F.items.filter(i=>i.t==='furn').length,dr=F.items.filter(i=>i.t==='door').length,wn=F.items.filter(i=>i.t==='win').length;s+=`\n_${rs.length} pièces, ${dr} portes, ${wn} fenêtres, ${fu} meubles._\n\n`});
  return s}
function mdVillage(v){
  const _wh=v.where&&v.where.text?'Situation : '+v.where.text+'\n\n':'';
  const bl=v.items.filter(i=>i.t==='bld'),mk=v.items.filter(i=>i.t==='mark').sort((a,b)=>a.n-b.n);
  let s=`# ${v.name}\n\nCarte de ${v.W} × ${v.H} m, ${bl.length} bâtiments.\n\n`+_wh;if(v.notes)s+=v.notes+'\n\n';
  if(mk.length){s+='## Légende\n\n';mk.forEach(m=>s+=`${m.n}. ${m.text}\n`);s+='\n'}
  const ib=bl.filter(b=>linkedB(b));if(ib.length){s+='## Intérieurs construits\n\n';ib.forEach(b=>s+=`- ${b.name||linkedB(b).name}${b.name&&b.name!==linkedB(b).name?' (plan « '+linkedB(b).name+' »)':''}\n`);s+='\n'}
  const named=bl.filter(b=>b.name&&!mk.some(m=>m.text===b.name));if(named.length){s+='## Lieux\n\n';named.forEach(b=>{const l=P.buildings.find(x=>x.id===b.link);s+=`- **${b.name}** (${VKD[b.k].n})${l?' : plan « '+l.name+' »':''}\n`})}
  const cnt={};bl.forEach(b=>cnt[VKD[b.k].n]=(cnt[VKD[b.k].n]||0)+1);s+='\n## Bâtiments\n\n'+Object.entries(cnt).map(([k,n])=>`- ${k} : ${n}`).join('\n')+'\n';return s}
$('#bExp').onclick=function(){
  const E=[];
  if(ui.mode==='b'){const b=CB(),n=slug(b.name);
    E.push({t:'Étage actuel : image PNG',f:()=>exportPng(planSVG(b,ui.fl,{ghost:false,dims:ui.dims}),n+'-'+slug(CF().name))});
    E.push({t:'Étage actuel : SVG',f:()=>exportSvg(planSVG(b,ui.fl,{ghost:false,dims:ui.dims}),n+'-'+slug(CF().name))});
    E.push('-');
    E.push({t:'Tous les étages : planche PNG',f:()=>exportPng(sheetSVG(b,{dims:ui.dims}),n+'-etages')});
    E.push({t:'Tous les étages : planche SVG',f:()=>exportSvg(sheetSVG(b,{dims:ui.dims}),n+'-etages')});
    E.push('-');
    E.push({t:'Isométrie : PNG',f:()=>exportPng(isoSVG(),n+'-iso')});
    E.push({t:'Isométrie : SVG',f:()=>exportSvg(isoSVG(),n+'-iso')});
    E.push('-');
    E.push({t:'Façade : PNG',f:()=>exportPng(facadeSVG(b),n+'-facade')});
    E.push({t:'Façade : SVG',f:()=>exportSvg(facadeSVG(b),n+'-facade')});
    E.push('-');
    E.push({t:'Description : copier (Markdown)',f:()=>copyText(mdBuilding(b))});
    E.push({t:'Description : fichier .md',f:()=>saveFile(n+'.md',mdBuilding(b),'text/markdown')});
  }else if(ui.mode==='w'){const w=CW(),n=slug(w.name);
    E.push({t:'Carte : image PNG',f:()=>exportPng(worldSheet(w),n)});
    E.push({t:'Carte : SVG',f:()=>exportSvg(worldSheet(w),n)});
    E.push('-');
    E.push({t:'Description : copier (Markdown)',f:()=>copyText(mdWorld(w))});
    E.push({t:'Description : fichier .md',f:()=>saveFile(n+'.md',mdWorld(w),'text/markdown')});
  }else{const v=CV(),n=slug(v.name);
    E.push({t:'Carte : image PNG',f:()=>exportPng(villageSheet(v),n)});
    E.push({t:'Carte : SVG',f:()=>exportSvg(villageSheet(v),n)});
    E.push('-');
    E.push({t:'Description : copier (Markdown)',f:()=>copyText(mdVillage(v))});
    E.push({t:'Description : fichier .md',f:()=>saveFile(n+'.md',mdVillage(v),'text/markdown')});}
  plansMenuJson(E);popup(this,E)};
