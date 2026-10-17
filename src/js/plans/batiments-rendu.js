/* ====== bâtiments : rendu ====== */
const BU=32;
const RK={piece:{n:'Pièce',f:'#f7f0dd'},couloir:{n:'Couloir / galerie',f:'#f1e8cf'},cour:{n:'Cour / jardin',f:'#cfdcae'},eau:{n:'Eau / bains',f:'#bcd6e0'},secure:{n:'Pièce sécurisée',f:'#e6d9b6'},ext:{n:'Terrasse / extérieur',f:'#ddd0b0'},cave:{n:'Cave / sous-sol',f:'#d8cdb4'},vide:{n:'Contour seul',f:'none'}};
const DK={porte:'Porte simple',double:'Double porte',ouverte:'Ouverture',arche:'Arche large',secrete:'Porte secrète',blindee:'Porte blindée / verrouillée',grille:'Grille'};
const WK={fenetre:'Fenêtre',baie:'Grande baie',meurtriere:'Meurtrière'};
const FURN=[
 ['lit','Lit',.8,1.8],['litdbl','Lit double',1.3,1.9],['litsup','Lits superposés',.8,1.8],['table','Table',1.8,.9],['tabler','Table ronde',1.2,1.2],['chaise','Chaise',.5,.5],['banc','Banc',1.6,.45],
 ['coffre','Coffre',.9,.5],['etagere','Étagère',1.6,.4],['armoire','Armoire',1,.55],['bureau','Bureau',1.4,.8],['pupitre','Pupitre',.6,.6],['cheminee','Cheminée',1.4,.6],['fourneau','Fourneau',1.6,.8],
 ['tonneau','Tonneau',.8,.8],['cuve','Cuve',1.2,1.2],['baignoire','Baignoire',1.7,.8],['latrines','Latrines',.6,.8],['puits','Puits',1.2,1.2],['fontaine','Fontaine',1.6,1.6],
 ['autel','Autel',1.6,.8],['colonne','Colonne',.6,.6],['trone','Trône',.9,.9],['estrade','Estrade',3,1.5],['tapis','Tapis',2.4,1.6],['plante','Plante / arbre',.8,.8],['statue','Statue',.8,.8],
 ['etabli','Établi',1.6,.7],['comptoir','Comptoir',2.4,.7],['sacs','Sacs / caisses',1,.8],['metier','Métier à tisser',1.2,1],['foyer','Foyer',1,1],['enclume','Enclume',.6,.4]];
const FCAT=[['Couchage',['lit','litdbl','litsup']],['Tables et sièges',['table','tabler','chaise','banc','comptoir','estrade']],['Rangement',['coffre','etagere','armoire','sacs','tonneau']],['Travail et études',['bureau','pupitre','etabli','metier','enclume']],['Cuisine, feu et eau',['cheminee','fourneau','foyer','cuve','baignoire','latrines','puits','fontaine']],['Culte et prestige',['autel','trone','statue','colonne']],['Décor',['tapis','plante']]];
const FD=Object.fromEntries(FURN.map(f=>[f[0],{k:f[0],n:f[1],w:f[2],h:f[3]}]));
const WOOD='#d9c9a3',WOOD2='#bfa97c';
function mergeAttr(base,extra){if(!extra)return base;for(const m of extra.matchAll(/([\w-]+)="/g))base=base.replace(new RegExp('\\s'+m[1]+'="[^"]*"'),'');return base+' '+extra}
function furnSVG(k,w,h){
  const W=w*BU,H=h*BU,S='stroke="'+INK+'" stroke-width="1.4"';
  const R=(x,y,a,b,f,x2='')=>`<rect x="${fx(x)}" y="${fx(y)}" width="${fx(a)}" height="${fx(b)}" fill="${f}" ${mergeAttr(' '+S,x2)}/>`;
  const C=(x,y,r,f,x2='')=>`<circle cx="${fx(x)}" cy="${fx(y)}" r="${fx(r)}" fill="${f}" ${mergeAttr(' '+S,x2)}/>`;
  const E=(f)=>`<ellipse cx="${fx(W/2)}" cy="${fx(H/2)}" rx="${fx(W/2)}" ry="${fx(H/2)}" fill="${f}" ${S}/>`;
  const L=(d,x2='')=>`<path d="${d}" fill="none" ${mergeAttr(' '+S,x2)}/>`;
  switch(k){
  case 'lit':return R(0,0,W,H,WOOD)+R(W*.12,H*.06,W*.76,H*.2,'#f4ecd8','stroke-width="1"');
  case 'litdbl':return R(0,0,W,H,WOOD)+R(W*.07,H*.06,W*.38,H*.2,'#f4ecd8','stroke-width="1"')+R(W*.55,H*.06,W*.38,H*.2,'#f4ecd8','stroke-width="1"');
  case 'litsup':return R(0,0,W,H,WOOD)+R(W*.12,H*.06,W*.76,H*.2,'#f4ecd8','stroke-width="1"')+L(`M0 ${H*.5}H${W}`,'stroke-width="1"')+C(W*.12,H*.5,2,INK);
  case 'table':return R(0,0,W,H,WOOD);
  case 'tabler':return E(WOOD);
  case 'chaise':return R(0,0,W,H,WOOD2,'rx="3"');
  case 'banc':return R(0,0,W,H,WOOD2);
  case 'coffre':return R(0,0,W,H,WOOD2)+L(`M0 ${H*.4}H${W}`,'stroke-width="1"')+C(W/2,H*.4,2,INK);
  case 'etagere':{let d='';const n=Math.max(2,Math.round(W/BU/.4));for(let i=1;i<n;i++)d+=`M${fx(W*i/n)} 0V${H}`;return R(0,0,W,H,WOOD)+L(d,'stroke-width="1"')}
  case 'armoire':return R(0,0,W,H,WOOD2)+L(`M${W/2} 0V${H}`,'stroke-width="1"');
  case 'bureau':return R(0,0,W,H,WOOD)+R(W*.12,H*.22,W*.28,H*.5,'#f4ecd8','stroke-width="1"');
  case 'pupitre':return R(0,0,W,H,WOOD)+L(`M0 ${H*.35}H${W}`,'stroke-width="1"');
  case 'cheminee':return R(0,0,W,H,'#bfa97c')+R(W*.15,H*.35,W*.7,H*.65,'#6b5a45','stroke-width="1"');
  case 'fourneau':return R(0,0,W,H,'#9f9585')+C(W*.2,H/2,H*.22,'#4a443c')+C(W*.5,H/2,H*.22,'#4a443c')+C(W*.8,H/2,H*.22,'#4a443c');
  case 'tonneau':return E(WOOD2)+`<ellipse cx="${W/2}" cy="${H/2}" rx="${W*.32}" ry="${H*.32}" fill="none" stroke="${INK}" stroke-width="1"/>`;
  case 'cuve':return E('#cdb98b')+`<ellipse cx="${W/2}" cy="${H/2}" rx="${W*.35}" ry="${H*.35}" fill="#8a6b3e" stroke="${INK}" stroke-width="1"/>`;
  case 'baignoire':return R(0,0,W,H,'#cfe3ea',`rx="${H/2.2}"`)+C(W*.18,H/2,2.2,INK);
  case 'latrines':return R(0,0,W,H,WOOD)+`<ellipse cx="${W/2}" cy="${H/2}" rx="${W*.25}" ry="${H*.22}" fill="#4a443c"/>`;
  case 'puits':return C(W/2,H/2,Math.min(W,H)/2,'#a9c5d3')+C(W/2,H/2,Math.min(W,H)*.3,'#5b8aa3','stroke-width="1"');
  case 'fontaine':return C(W/2,H/2,Math.min(W,H)/2,'#a9c5d3')+C(W/2,H/2,Math.min(W,H)*.14,'#e9dfc3');
  case 'autel':return R(0,0,W,H,'#cdbf9f')+L(`M${W/2} ${H*.2}V${H*.8}M${W*.4} ${H*.4}H${W*.6}`,'stroke-width="1.2"');
  case 'colonne':return C(W/2,H/2,Math.min(W,H)/2,'#cdbf9f')+C(W/2,H/2,Math.min(W,H)*.28,'none','stroke-width="1"');
  case 'trone':return R(0,0,W,H,'#bfa97c')+R(0,0,W,H*.22,'#8a2f2f');
  case 'estrade':return R(0,0,W,H,'#d8caa4','stroke-dasharray="4 3"');
  case 'tapis':return R(0,0,W,H,'#c98c7e','stroke-width="1" fill-opacity=".22"')+R(W*.07,H*.1,W*.86,H*.8,'none','stroke-width="1" stroke-dasharray="3 3"');
  case 'plante':return C(W/2,H/2,Math.min(W,H)/2,'#8fae6e','stroke="#4d6b3c"')+C(W*.4,H*.4,Math.min(W,H)*.2,'#a6c585','stroke="none"');
  case 'statue':return C(W/2,H/2,Math.min(W,H)/2,'#b9b5ab')+C(W/2,H/2,Math.min(W,H)*.2,'#8f8b82','stroke-width="1"');
  case 'etabli':return R(0,0,W,H,WOOD2)+R(W*.8,H*.1,W*.14,H*.3,'#8f8b82','stroke-width="1"');
  case 'comptoir':return R(0,0,W,H,WOOD2);
  case 'sacs':return C(W*.28,H*.35,H*.28,'#cdb98b')+C(W*.68,H*.38,H*.3,'#cdb98b')+C(W*.45,H*.74,H*.24,'#cdb98b');
  case 'metier':return R(0,0,W,H,WOOD)+L(`M${W*.2} 0V${H}M${W*.4} 0V${H}M${W*.6} 0V${H}M${W*.8} 0V${H}`,'stroke-width="1"');
  case 'foyer':return C(W/2,H/2,Math.min(W,H)/2,'#e9a24a','stroke="#7a4b17"')+C(W/2,H/2,Math.min(W,H)*.22,'#f4d27a','stroke="none"');
  case 'enclume':return `<path d="M0 ${H*.3}H${W}L${W*.8} ${H*.6}V${H}H${W*.2}V${H*.6}Z" fill="#8f8b82" ${S}/>`;
  }
  return R(0,0,W,H,WOOD);
}
function wrapName(name,aw,fs){const mc=Math.max(3,Math.floor(aw/(fs*.52)));const words=String(name).split(/\s+/);const lines=[];let cur='';for(const w of words){if(!cur)cur=w;else if((cur+' '+w).length<=mc)cur+=' '+w;else{lines.push(cur);cur=w}}if(cur)lines.push(cur);return lines}
function textBlock(lines,cx,cy,fs,extra=''){const lh=fs*1.12,y0=cy-(lines.length-1)*lh/2+fs*.34;return lines.map((l,i)=>`<text x="${fx(cx)}" y="${fx(y0+i*lh)}" font-size="${fx(fs)}" ${extra}>${esc(l)}</text>`).join('')}
function roomLabel(r,opts){
  if(!r.name)return'';
  const LB=libreOk(r)?libreLabel(r):null;
  const wpx=r.w*BU,hpx=LB?LB.sv*BU:r.h*BU;let aw=LB?Math.max(20,LB.sh*BU-8):wpx-8,cx=(LB?LB.x:r.x+r.w/2)*BU,cy=(LB?LB.y:r.y+r.h/2)*BU;
  if(r.shape==='ring'){const t=(r.thick||1)*BU;aw=wpx-20;cy=r.y*BU+t/2;}
  let fs=clamp(Math.min(13,aw/(Math.max(...r.name.split(/\s+/).map(s=>s.length),6)*.52)),7,13.5);
  let lines=wrapName(r.name,aw,fs);
  const maxLines=Math.max(1,Math.floor(((r.shape==='ring'?(r.thick||1)*BU:hpx)-6)/(fs*1.12)));
  while(lines.length>maxLines&&fs>6.5){fs-=.5;lines=wrapName(r.name,aw,fs)}
  let out=textBlock(lines,cx,cy-(opts.dims&&r.shape!=='ring'?5:0),fs,`font-weight="${r.kind==='piece'&&r.w*r.h>40?600:400}"`);
  if(opts.dims&&r.shape!=='ring')out+=`<text x="${fx(cx)}" y="${fx(cy+fs*.9+lines.length*fs*.56)}" font-size="8.5" fill="#6d6354">${LB?fx(LB.area)+' m²':fx(r.w)+'×'+fx(r.h)+' m'}</text>`;
  return out}
function roomShape(r,ghost){
  const x=r.x*BU,y=r.y*BU,w=r.w*BU,h=r.h*BU,k=RK[r.kind]||RK.piece;
  const sw=r.kind==='secure'?6:r.kind==='couloir'?0:3;let fill=k.f;
  if(libreOk(r))return libreSVG(r,ghost,fill,sw);
  if(ghost)return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
  if(r.shape==='ring'){const t=(r.thick||1)*BU;return `<path d="M${x} ${y}h${w}v${h}h${-w}Z M${x+t} ${y+t}v${h-2*t}h${w-2*t}v${-(h-2*t)}Z" fill="${fill}" fill-rule="evenodd" stroke="${sw?INK:'none'}" stroke-width="${sw}"/>`}
  if(r.shape==='ellipse')return `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="${fill}" stroke="${INK}" stroke-width="${sw||3}"/>`;
  if(r.kind==='cour'){
    const g=mkrng(hstr(r.id));let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${INK}" stroke-width="1.5"/>`;
    if(w>110&&h>110){s+=`<g fill="#e9dfc3" stroke="#b9aa88"><rect x="${x}" y="${y+h/2-12}" width="${w}" height="24"/><rect x="${x+w/2-12}" y="${y}" width="24" height="${h}"/></g>`;
      s+=`<circle cx="${x+w/2}" cy="${y+h/2}" r="22" fill="#a9c5d3" stroke="${INK}" stroke-width="2"/><circle cx="${x+w/2}" cy="${y+h/2}" r="8" fill="#e9dfc3" stroke="${INK}" stroke-width="1.5"/>`;
      const n=Math.max(4,Math.min(16,Math.floor(w*h/9000)*2+4));s+='<g fill="#8fae6e" stroke="#4d6b3c" stroke-width="1.5">';
      for(let i=0;i<n;i++){const qx=i%2?x+w*.72:x+w*.28,qy=(i>>1)%2?y+h*.72:y+h*.28;s+=`<circle cx="${fx(qx+(g()-.5)*w*.18)}" cy="${fx(qy+(g()-.5)*h*.18)}" r="${fx(10+g()*9)}"/>`;if(i>=7)break}s+='</g>'}
    else{s+='<g fill="#8fae6e" stroke="#4d6b3c" stroke-width="1.5">';const n=Math.max(1,Math.floor(w*h/6000));for(let i=0;i<n;i++)s+=`<circle cx="${fx(x+16+g()*(w-32))}" cy="${fx(y+16+g()*(h-32))}" r="${fx(8+g()*8)}"/>`;s+='</g>'}
    if(r.arc!==false)s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-dasharray="0.1 30"/>`;
    return s}
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${sw?INK:'none'}" stroke-width="${sw}" stroke-linejoin="round"/>`}
function doorSVG(d){
  if(d.o==='a')return libreRot(d,doorSVG({...d,o:'h'}));
  const px=d.x*BU,py=d.y*BU,w=d.w*BU,hf=w/2,H=d.o==='h';const hg=d.hg||1,fl=d.fl||1;
  const gap=H?`<line x1="${px-hf}" y1="${py}" x2="${px+hf}" y2="${py}" stroke="${PAPER}" stroke-width="8"/>`:`<line x1="${px}" y1="${py-hf}" x2="${px}" y2="${py+hf}" stroke="${PAPER}" stroke-width="8"/>`;
  const jamb=H?`<path d="M${px-hf} ${py-4}v8M${px+hf} ${py-4}v8" stroke="${INK}" stroke-width="2"/>`:`<path d="M${px-4} ${py-hf}h8M${px-4} ${py+hf}h8" stroke="${INK}" stroke-width="2"/>`;
  const leaf=(len,hinge,sgnHinge)=>{ // hinge: coordonnée du pivot le long du mur; sgnHinge: +1 si l'autre montant est dans le sens positif
    let x0,y0,x1,y1,ex,ey,sweep;
    if(H){x0=hinge;y0=py;x1=hinge+sgnHinge*len;y1=py;ex=x0;ey=py+fl*len;sweep=(sgnHinge*fl>0)?1:0}
    else{x0=px;y0=hinge;x1=px;y1=hinge+sgnHinge*len;ex=px+fl*len;ey=y0;sweep=(-sgnHinge*fl>0)?1:0}
    return `<path d="M${fx(x0)} ${fx(y0)}L${fx(ex)} ${fx(ey)}" stroke="${INK}" stroke-width="2" fill="none"/><path d="M${fx(x1)} ${fx(y1)}A${fx(len)} ${fx(len)} 0 0 ${sweep} ${fx(ex)} ${fx(ey)}" stroke="${INK}" stroke-width="1" fill="none" opacity=".5"/>`};
  let s=gap;
  if(d.k==='porte'||d.k==='blindee'||d.k==='secrete'||d.k==='grille'){const hinge=(H?px:py)+(hg>0?-hf:hf);s+=leaf(w,hinge,hg>0?1:-1)}
  if(d.k==='double'){s+=leaf(hf,(H?px:py)-hf,1)+leaf(hf,(H?px:py)+hf,-1)}
  if(d.k==='arche'){s+=jamb;s+=H?`<path d="M${px-hf} ${py}h${w}" stroke="${INK}" stroke-width="1" stroke-dasharray="2 3"/>`:`<path d="M${px} ${py-hf}v${w}" stroke="${INK}" stroke-width="1" stroke-dasharray="2 3"/>`}
  if(d.k==='ouverte')s+=jamb;
  if(d.k==='grille')s+=H?`<path d="M${px-hf} ${py}h${w}" stroke="#6d6354" stroke-width="3" stroke-dasharray="2 3"/>`:`<path d="M${px} ${py-hf}v${w}" stroke="#6d6354" stroke-width="3" stroke-dasharray="2 3"/>`;
  if(d.k==='blindee')s+=`<rect x="${px-4}" y="${py-6}" width="8" height="12" fill="#8a2f2f" stroke="${INK}" stroke-width="1"/>`;
  if(d.k==='secrete')s+=`<text x="${px}" y="${py+3}" font-size="9" text-anchor="middle" fill="${INK}" font-style="italic" stroke="${PAPER}" stroke-width="3" paint-order="stroke">S</text>`;
  return s}
function winSVG(w){
  if(w.o==='a')return libreRot(w,winSVG({...w,o:'h'}));
  const px=w.x*BU,py=w.y*BU,l=w.w*BU,H=w.o==='h';
  if(w.k==='meurtriere'){return H?`<rect x="${px-2}" y="${py-4}" width="4" height="8" fill="#a9c5d3" stroke="${INK}" stroke-width="1.2"/>`:`<rect x="${px-4}" y="${py-2}" width="8" height="4" fill="#a9c5d3" stroke="${INK}" stroke-width="1.2"/>`}
  const t=w.k==='baie'?9:7;
  return H?`<rect x="${px-l/2}" y="${py-t/2}" width="${l}" height="${t}" fill="#a9c5d3" stroke="${INK}" stroke-width="1.5"/><path d="M${px-l/2} ${py}h${l}" stroke="${INK}" stroke-width=".8"/>`:`<rect x="${px-t/2}" y="${py-l/2}" width="${t}" height="${l}" fill="#a9c5d3" stroke="${INK}" stroke-width="1.5"/><path d="M${px} ${py-l/2}v${l}" stroke="${INK}" stroke-width=".8"/>`}
function stairSVG(s){
  const x=s.x*BU,y=s.y*BU,w=s.w*BU,h=s.h*BU,dir=s.dir||'n';
  if(dir==='spiral'){const r=Math.min(w,h)/2,cx=x+w/2,cy=y+h/2;let d='';for(let i=0;i<12;i++){const a=i*Math.PI/6;d+=`M${fx(cx)} ${fx(cy)}L${fx(cx+Math.cos(a)*r)} ${fx(cy+Math.sin(a)*r)}`}
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#e6d9b6" stroke="${INK}" stroke-width="1.5"/><path d="${d}" stroke="${INK}" stroke-width="1" fill="none"/><circle cx="${cx}" cy="${cy}" r="${r*.18}" fill="${INK}"/>`}
  let steps='',n=Math.max(3,Math.round((dir==='n'||dir==='s'?h:w)/BU/.3));
  for(let i=1;i<n;i++){const t=i/n;steps+=(dir==='n'||dir==='s')?`M${x} ${fx(y+h*t)}H${x+w}`:`M${fx(x+w*t)} ${y}V${y+h}`}
  let arrow;const cx=x+w/2,cy=y+h/2;
  if(dir==='n')arrow=`M${cx} ${y+h-4}V${y+5}M${cx-5} ${y+11}L${cx} ${y+5}L${cx+5} ${y+11}`;
  else if(dir==='s')arrow=`M${cx} ${y+4}V${y+h-5}M${cx-5} ${y+h-11}L${cx} ${y+h-5}L${cx+5} ${y+h-11}`;
  else if(dir==='e')arrow=`M${x+4} ${cy}H${x+w-5}M${x+w-11} ${cy-5}L${x+w-5} ${cy}L${x+w-11} ${cy+5}`;
  else arrow=`M${x+w-4} ${cy}H${x+5}M${x+11} ${cy-5}L${x+5} ${cy}L${x+11} ${cy+5}`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e6d9b6" stroke="${INK}" stroke-width="1.5"/><path d="${steps}" stroke="${INK}" stroke-width="1" fill="none"/><path d="${arrow}" stroke="${INK}" stroke-width="1.4" fill="none" opacity=".75"/>`}
function renderFloor(b,fi,o={}){
  const F=b.floors[fi];let s='';
  if(o.ghost&&fi>0){s+='<g opacity=".28">';for(const it of b.floors[fi-1].items){if(it.t==='room'&&it.kind!=='cour')s+=roomShape(it,true);if(it.t==='wall')s+=`<path d="${murD(it)}" fill="none" stroke="${INK}" stroke-width="1.2"/>`}s+='</g>'}
  const rooms=F.items.filter(i=>i.t==='room');
  const order=r=>({cour:0,ext:0,couloir:1,vide:1}[r.kind]??2);
  const rs=rooms.slice().sort((a,b)=>order(a)-order(b));
  for(const r of rs)s+=roomShape(r);
  for(const w of F.items.filter(i=>i.t==='wall'))s+=`<path d="${murD(w)}" fill="none" stroke="${INK}" stroke-width="${w.k==='cloison'?1.8:w.k==='bas'?2.4:3.5}"${w.k==='bas'?' stroke-dasharray="5 2.5"':''} stroke-linecap="round"/>`;
  for(const d of F.items.filter(i=>i.t==='door'))s+=doorSVG(d);
  for(const w of F.items.filter(i=>i.t==='win'))s+=winSVG(w);
  for(const f of F.items.filter(i=>i.t==='furn')){const d=FD[f.k];if(!d)continue;const w=d.w,h=d.h,cx=f.x*BU,cy=f.y*BU;s+=`<g transform="translate(${fx(cx)} ${fx(cy)}) rotate(${f.r||0}) translate(${fx(-w*BU/2)} ${fx(-h*BU/2)})">${furnSVG(f.k,w,h)}</g>`}
  for(const t of F.items.filter(i=>i.t==='stair'))s+=stairSVG(t)+(t.label?`<text x="${(t.x+t.w/2)*BU}" y="${(t.y+t.h)*BU+11}" font-size="8.5" text-anchor="middle">${esc(t.label)}</text>`:'');
  s+=`<g font-family="${FONT}" fill="${INK}" text-anchor="middle">`;
  for(const r of rooms)s+=roomLabel(r,o);
  for(const l of F.items.filter(i=>i.t==='label'))s+=textBlock(String(l.text).split('\n'),l.x*BU,l.y*BU,l.size||12,l.it?'font-style="italic"':'font-weight="700"');
  s+='</g>';
  return s}
function itemBounds(it){
  switch(it.t){
  case 'room':case 'stair':return[it.x,it.y,it.x+it.w,it.y+it.h];
  case 'wall':{const f=murApl(it),xs=f.map(q=>q[0]),ys=f.map(q=>q[1]);return[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]}
  case 'door':case 'win':{const h=it.w/2;if(it.o==='a'){const a=rad(it.ang||0),dx=Math.cos(a)*h,dy=Math.sin(a)*h;return[Math.min(it.x-dx,it.x+dx)-.3,Math.min(it.y-dy,it.y+dy)-.3,Math.max(it.x-dx,it.x+dx)+.3,Math.max(it.y-dy,it.y+dy)+.3]}return it.o==='h'?[it.x-h,it.y-.3,it.x+h,it.y+.3]:[it.x-.3,it.y-h,it.x+.3,it.y+h]}
  case 'furn':{const d=FD[it.k]||{w:1,h:1};const q=((it.r||0)/90)%2?[d.h,d.w]:[d.w,d.h];return[it.x-q[0]/2,it.y-q[1]/2,it.x+q[0]/2,it.y+q[1]/2]}
  case 'label':{const lines=String(it.text).split('\n');const w=Math.max(...lines.map(l=>l.length))*(it.size||12)*.55/BU;const h=lines.length*(it.size||12)*1.1/BU;return[it.x-w/2,it.y-h/2,it.x+w/2,it.y+h/2]}}
  return[0,0,0,0]}
function floorExtent(F){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const it of F.items){const b=itemBounds(it);x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3])}return x1<x0?null:{x0,y0,x1,y1}}
function bldExtent(b){let e=null;for(const F of b.floors){const f=floorExtent(F);if(!f)continue;e=e?{x0:Math.min(e.x0,f.x0),y0:Math.min(e.y0,f.y0),x1:Math.max(e.x1,f.x1),y1:Math.max(e.y1,f.y1)}:f}return e}
function B_bounds(){if(isoOn())return isoBounds();const b=CB();const e=bldExtent(b);if(!e)return{x0:0,y0:0,x1:b.gw*BU,y1:b.gh*BU};return{x0:e.x0*BU-40,y0:e.y0*BU-40,x1:e.x1*BU+40,y1:e.y1*BU+40}}
const scaleBar=(x,y,m=5)=>{const L=m*BU;return `<g stroke="${INK}" stroke-width="2" fill="none"><path d="M${x} ${y}h${L}M${x} ${y-6}v12M${x+L/2} ${y-4}v8M${x+L} ${y-6}v12"/></g><text x="${x}" y="${y+20}" font-family="${FONT}" font-size="11" fill="${INK}">0 · ${m/2} · ${m} m</text>`};
const northArrow=(x,y,e)=>{e=e||1;return `<g font-family="${FONT}" fill="${INK}" text-anchor="middle"><path d="M${x} ${fx(y+36*e)}V${y}M${fx(x-8*e)} ${fx(y+12*e)}L${x} ${y}L${fx(x+8*e)} ${fx(y+12*e)}" stroke="${INK}" stroke-width="${fx(2*e)}" fill="none"/><text x="${x}" y="${fx(y+54*e)}" font-size="${fx(13*e)}" font-weight="700">N</text></g>`};
/* plan complet d'un étage, prêt à exporter */
function planSVG(b,fi,o={}){
  const e=bldExtent(b)||{x0:0,y0:0,x1:10,y1:8};const pad=o.pad??1.5;
  const x0=Math.floor(e.x0-pad),y0=Math.floor(e.y0-pad),x1=Math.ceil(e.x1+pad),y1=Math.ceil(e.y1+pad);
  const pw=(x1-x0)*BU,ph=(y1-y0)*BU,hdr=84,ftr=64,W=Math.max(pw+80,420),H=ph+hdr+ftr,ox=(W-pw)/2,oy=hdr;
  const body=`<g transform="translate(${fx(ox-x0*BU)} ${fx(oy-y0*BU)})">${renderFloor(b,fi,{ghost:o.ghost,dims:o.dims})}</g>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>
<g font-family="${FONT}" fill="${INK}"><text x="40" y="44" font-size="22" font-weight="700" letter-spacing="1.5">${esc(b.floors[fi].name.toUpperCase())}</text><text x="40" y="66" font-size="13" font-style="italic">${esc(b.name)}</text></g>
${body}${scaleBar(40,H-34)}${northArrow(W-50,22)}</svg>`;
  return{svg,w:W,h:H}}
function sheetSVG(b,o={}){ // tous les étages côte à côte
  const parts=b.floors.map((_,i)=>planSVG(b,i,o));const gap=24;let W=gap,H=0;parts.forEach(p=>{W+=p.w+gap;H=Math.max(H,p.h)});
  let x=gap,inner='';parts.forEach(p=>{inner+=`<g transform="translate(${x} 0)">${p.svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`;x+=p.w+gap});
  return{svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>${inner}</svg>`,w:W,h:H}}
