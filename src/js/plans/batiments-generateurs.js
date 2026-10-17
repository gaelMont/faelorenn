/* ====== bâtiments : générateurs ====== */
const GT={havre:'Havre des Marchefleurs (cour carrée, 3 étages)',manoir:'Manoir / grande demeure',auberge:'Auberge',maison:'Maison',boutique:'Boutique avec logis',forge:'Forge',entrepot:'Entrepôt / grange',chapelle:'Chapelle',tour:'Tour (de mage, de guet)',vide:'Page blanche'};
const add=(F,it)=>{it.id=uid();F.items.push(it);return it};
function Gen(name,n,ox,oy){this.b=mkB(name);this.b.floors=[];for(let i=0;i<n;i++)this.b.floors.push({name:floorName(i),items:[]});this.ox=ox;this.oy=oy}
Gen.prototype={
 rm(f,x,y,w,h,name,kind='piece',ex={}){return add(this.b.floors[f],{t:'room',x:x+this.ox,y:y+this.oy,w,h,kind,shape:'rect',name,note:'',...ex})},
 dr(f,x,y,o,k='porte',fl=1,w){return add(this.b.floors[f],{t:'door',k,x:x+this.ox,y:y+this.oy,o,w:w||DW[k]||1,fl,hg:1})},
 wn(f,x,y,o,k='fenetre',w){return add(this.b.floors[f],{t:'win',k,x:x+this.ox,y:y+this.oy,o,w:w||WW[k]||1})},
 fu(f,k,x,y,r=0){return add(this.b.floors[f],{t:'furn',k,x:fx(Math.round((x+this.ox)*4)/4),y:fx(Math.round((y+this.oy)*4)/4),r})},
 st(f,x,y,w,h,dir,label){return add(this.b.floors[f],{t:'stair',x:x+this.ox,y:y+this.oy,w,h,dir,label})},
 lb(f,x,y,text,size=10,it=true){return add(this.b.floors[f],{t:'label',x:x+this.ox,y:y+this.oy,text,size,it})},
 autoWin(f,x0,y0,x1,y1,step=3){const F=this.b.floors[f],ox=this.ox,oy=this.oy;
  const near=(o,fixed,pos)=>F.items.some(d=>d.t==='door'&&d.o===o&&Math.abs((o==='h'?d.y:d.x)-fixed)<.3&&Math.abs((o==='h'?d.x:d.y)-pos)<1.4);
  const side=(o,fixed,a,b)=>{for(let p=a+1.5;p<=b-1;p+=step){if(!near(o,fixed+(o==='h'?oy:ox),p+(o==='h'?ox:oy)))this.wn(f,o==='h'?p:fixed,o==='h'?fixed:p,o)}};
  side('h',y0,x0,x1);side('h',y1,x0,x1);side('v',x0,y0,y1);side('v',x1,y0,y1)},
 get(){return this.b}};
/* mobilier automatique selon le nom de la pièce */
function furnish(G,f,r,rg){
  const n=(r.name||'').toLowerCase(),{x,y,w,h}=r;const cx=x+w/2,cy=y+h/2;const F=G.b.floors[f];
  const put=(k,px,py,rot=0)=>{const d=FD[k];const q=(rot/90)%2?[d.h,d.w]:[d.w,d.h];if(px-q[0]/2<x+.2||px+q[0]/2>x+w-.2||py-q[1]/2<y+.2||py+q[1]/2>y+h-.2)return;add(F,{t:'furn',k,x:fx(Math.round(px*4)/4),y:fx(Math.round(py*4)/4),r:rot})};
  const row=(k,y0,rot=0,gap=1.4,x0=x+.9,x1=x+w-.9)=>{for(let px=x0+.5;px<=x1;px+=gap)put(k,px,y0,rot)};
  const gx=(a,b)=>{};
  if(/dortoir/.test(n)){row('lit',y+1.15,0,1.1)}
  else if(/infirmerie/.test(n)){for(let py=y+1.1;py<y+h-.8;py+=1.05)put('lit',x+1.15,py,90);put('armoire',x+w-.5,cy,90)}
  else if(/chambre|cellule/.test(n)){put(w>=3?'litdbl':'lit',x+(w>=3?1:.7),y+1.15);put('coffre',x+w-.7,y+.4);if(w>=3&&h>=3)put('bureau',x+w-.6,y+h-.8,90);put('tapis',cx,cy+.4)}
  else if(/cuisine/.test(n)){put('fourneau',cx,y+.6);put('table',cx,cy+.4);put('tonneau',x+.6,y+h-.6);put('sacs',x+w-.8,y+h-.6)}
  else if(/commune|boutique|manger|r[ée]ception|lecture|[ée]tude|d[ée]tente|jeux|pi[èe]ce principale|salon|taverne/.test(n)){
    const nx=Math.max(1,Math.floor((w-1.5)/2.6)),ny=Math.max(1,Math.floor((h-2)/2.4));for(let i=0;i<Math.min(nx,4);i++)for(let j=0;j<Math.min(ny,2);j++)put(w*h>60&&rg()<.4?'tabler':'table',x+(w/(Math.min(nx,4)))*(i+.5),y+h*(.35+.35*j)/(Math.min(ny,2)>1?1:1.2));
    if(/commune|taverne|pi[èe]ce principale/.test(n))put('cheminee',x+w-.5,cy,90)}
  else if(/biblioth|archives|cartoth|scriptorium|ouvrages/.test(n)){row('etagere',y+.4,0,1.7);put('bureau',cx,cy+.3);for(let py=y+1.2;py<y+h-1;py+=1.7)put('etagere',x+.4,py,90)}
  else if(/bureau|cabinet/.test(n)){put('bureau',cx,cy);put('chaise',cx,cy+.9);put('etagere',cx,y+.4)}
  else if(/bain/.test(n)){put('baignoire',cx,y+.6);put('baignoire',cx,y+h-.6)}
  else if(/toilettes|latrines/.test(n)){put('latrines',cx,cy)}
  else if(/r[ée]serve|cellier|cave|entrep|grange|stock/.test(n)){row('tonneau',y+.6,0,1.1);row('sacs',y+h-.6,0,1.5);put('etagere',cx,cy)}
  else if(/forge/.test(n)){put('foyer',x+1,y+1);put('enclume',cx,cy);put('etabli',x+w-1,y+.5)}
  else if(/atelier|logis/.test(n)){put('etabli',cx,y+.6);put('table',cx,cy+.6)}
  else if(/nef/.test(n)){}
}
function furnishAll(G,rg){G.b.floors.forEach((F,f)=>{for(const r of F.items.filter(i=>i.t==='room'&&i.shape==='rect'))furnish(G,f,r,rg)})}
/* ---- Havre ---- */
function genHavre(rg){
  const G=new Gen('Le Havre des Marchefleurs',3,2,2);
  const ring=(f,name)=>{G.rm(f,3,3,8,8,name||'Galerie','couloir',{shape:'ring',thick:1});G.rm(f,4,4,6,6,'Cour-jardin','cour')};
  for(let f=0;f<3;f++)ring(f,'Galerie');
  // RDC
  G.rm(0,0,0,4,3,'Dortoir du personnel');G.rm(0,4,0,2,3,'Toilettes');G.rm(0,6,0,2,3,'Réserve');G.rm(0,8,0,6,3,'Salle à manger');
  G.rm(0,0,3,3,4,'Infirmerie');G.rm(0,0,7,3,4,'Bureaux');G.rm(0,11,3,3,4,'Cuisine');G.rm(0,11,7,3,4,'Cellier');
  G.rm(0,0,11,11,3,'Salle commune');G.rm(0,5.5,12,3,2,'Vestibule');
  G.rm(0,11,11,3,3,'Escalier de service');G.st(0,11,11,3,3,'n','');
  [[3.5,'porte'],[5,'porte'],[7,'porte'],[9.5,'double']].forEach(([x,k])=>G.dr(0,x,3,'h',k,-1));
  G.dr(0,12.5,3,'h','porte',1);G.dr(0,3,5,'v','porte',-1);G.dr(0,3,9,'v','porte',-1);G.dr(0,11,5,'v','porte',1);G.dr(0,11,9,'v','porte',1);
  G.dr(0,6,11,'h','arche',-1,4);G.dr(0,7,14,'h','double',-1,1.6);G.dr(0,7,12,'h','double',-1,1.6);
  G.st(0,0.6,11.2,2.2,1.3,'n','monte');G.lb(0,1.4,13.4,'Tableau des missions',8,false);G.fu(0,'etagere',1.6,13.65,0);
  G.fu(0,'cheminee',10.6,12.5,90);G.fu(0,'table',3.9,13.2);G.fu(0,'table',9.4,13.2,0);
  G.lb(0,7,14.9,'▲ ENTRÉE',11,false);
  // 1er étage
  G.rm(1,0,0,4,3,'Bureau d\'Ounelle');G.rm(1,4,0,5,3,'Archives sécurisées','secure');G.rm(1,9,0,5,3,'Salle d\'étude');
  G.rm(1,0,3,3,8,'Bibliothèque');G.rm(1,0,11,3,3,'Cartothèque');G.rm(1,3,11,8,3,'Salle de lecture');
  G.rm(1,11,3,3,4,'Scriptorium');G.rm(1,11,7,3,2,'Réserve des ouvrages');G.rm(1,11,9,3,2,'Toilettes');G.rm(1,11,11,3,3,'Escalier de service');G.st(1,11,11,3,3,'n','');
  G.dr(1,3.5,3,'h','porte',-1);G.dr(1,4,1.5,'v','blindee',1);G.dr(1,10,3,'h','porte',-1);G.dr(1,3,5,'v','arche',-1,2);G.dr(1,3,9,'v','arche',-1,2);
  G.dr(1,7,11,'h','double',-1,1.6);G.dr(1,3,12.5,'v','porte',1);G.dr(1,11,5,'v','porte',1);G.dr(1,11,8,'v','porte',1);G.dr(1,11,9.5,'v','porte',1,.8);
  G.st(1,4,11.2,2.2,1.3,'n','monte · descend');
  // 2e étage : chambres
  const ch=[['Chambre de Jasmée',0,4,3.5],['Chambre d\'Ur',4,3,5.5],['Chambre de Dovva',7,3,8.5],['Chambre de Teldun',10,4,10.5]];
  ch.forEach(([n,x,w,dx])=>{G.rm(2,x,0,w,3,n);G.dr(2,dx,3,'h','porte',-1)});
  G.rm(2,0,3,3,3,'Chambre d\'Ounelle');G.rm(2,0,6,3,3,'Chambre libre');G.rm(2,0,9,3,2,'Chambre libre');
  G.rm(2,11,3,3,3,'Chambre libre');G.rm(2,11,6,3,3,'Chambre libre');G.rm(2,11,9,3,2,'Chambre libre');
  [[5],[8],[9.5]].forEach(([y],i)=>{G.dr(2,3,i===0?5:i===1?7.5:9.5,'v','porte',-1);G.dr(2,11,i===0?5:i===1?7.5:9.5,'v','porte',1)});
  G.rm(2,0,11,3,2,'Salle de bain','eau');G.rm(2,0,13,3,1,'Toilettes');G.rm(2,3,11,8,3,'Espace de détente');G.rm(2,11,11,3,3,'Escalier de service');G.st(2,11,11,3,3,'n','');
  G.dr(2,3,12,'v','porte',-1);G.dr(2,3,13.5,'v','porte',-1,.8);G.dr(2,7,11,'h','arche',-1,4);G.st(2,4,11.2,2.2,1.3,'n','descend');
  for(let f=0;f<3;f++){G.b.floors[f].items=G.b.floors[f].items.filter(i=>!(i.t==='room'&&!i.name&&i.kind==='piece'));G.autoWin(f,0,0,14,14,3.2)}
  G.b.floors[1].items.filter(i=>i.t==='win'&&i.y===2&&i.x>=6&&i.x<=11).forEach(w=>w.dead=1);
  G.b.floors[1].items=G.b.floors[1].items.filter(i=>!i.dead);
  furnishAll(G,rg);G.b.facade={style:'pierre',roof:'croupe',porch:true,tower:false,chim:2};G.b.gw=20;G.b.gh=20;
  G.b.notes='Bâtiment carré autour d\'une cour-jardin à colonnade.\nRDC : salle commune et vestibule au sud, infirmerie et bureaux à l\'ouest, cuisine et cellier à l\'est, salle à manger et dortoir du personnel au nord.\n1er : bibliothèque, bureau d\'Ounelle, archives sécurisées (porte blindée), salle d\'étude, scriptorium.\n2e : chambres des Marchefleurs, salle de bain, espace de détente.';
  return G.b}
/* ---- découpage BSP ---- */
function bsp(rg,x,y,w,h,maxA,minS,depth=0,acc={leaves:[],splits:[]}){
  const can=(w>=minS*2)||(h>=minS*2);
  if(!can||(w*h<=maxA&&(depth>0&&rg()<.6||w*h<maxA*.7))||depth>5){acc.leaves.push({x,y,w,h});return acc}
  const vert=w>=h*1.15?true:h>=w*1.15?false:rg()<.5;
  if(vert&&w<minS*2||(!vert&&h<minS*2)){return bsp(rg,x,y,w,h,1e9,minS,depth,acc)}
  if(vert){const s=Math.round(rr(rg,minS,w-minS)*2)/2;acc.splits.push({o:'v',x:x+s,a:y,b:y+h});bsp(rg,x,y,s,h,maxA,minS,depth+1,acc);bsp(rg,x+s,y,w-s,h,maxA,minS,depth+1,acc)}
  else{const s=Math.round(rr(rg,minS,h-minS)*2)/2;acc.splits.push({o:'h',y:y+s,a:x,b:x+w});bsp(rg,x,y,w,s,maxA,minS,depth+1,acc);bsp(rg,x,y+s,w,h-s,maxA,minS,depth+1,acc)}
  return acc}
function genBSP(type,rg,seedName){
  const S={maison:{w:[8,10],h:[6,8],fl:[1,2],area:22,min:2.5},boutique:{w:[8,10],h:[8,10],fl:[2,2],area:24,min:2.5},forge:{w:[10,12],h:[7,8],fl:[1,1],area:30,min:3},entrepot:{w:[12,14],h:[14,18],fl:[1,1],area:70,min:4}}[type];
  const W=ri(rg,...S.w),H=ri(rg,...S.h),nf=ri(rg,...S.fl);
  const nm={maison:'Maison de ',boutique:'Boutique de ',forge:'Forge de ',entrepot:'Entrepôt de '}[type]+pick(rg,['Maître ','Dame ','Vieux ','Tante '])+pick(rg,['Aldric','Brenna','Corwin','Hilde','Joran','Maren','Perrin','Tilda','Ulric']);
  const G=new Gen(nm,nf,2,2);
  const NAMES={maison:[['Pièce principale','Cuisine','Cellier','Chambre','Atelier'],['Chambre','Chambre','Cabinet','Grenier']],boutique:[['Boutique','Arrière-boutique','Réserve','Atelier'],['Chambre','Salon','Chambre','Cabinet']],forge:[['Forge','Atelier','Réserve de fer','Logis'],[]],entrepot:[['Entrepôt','Réserve','Bureau du régisseur','Entrepôt'],[]]}[type];
  for(let f=0;f<nf;f++){
    let acc;for(let t=0;t<12;t++){acc=bsp(rg,0,0,W,H,S.area*(f?1.2:1),S.min);if(acc.leaves.length>=2&&acc.leaves.length<=(type==='entrepot'?4:6))break}
    const L=acc.leaves.slice().sort((a,b)=>b.w*b.h-a.w*a.h);const names=NAMES[f]||NAMES[0];
    L.forEach((l,i)=>{l.name=i<names.length?names[i]:names[i%names.length];l.r=G.rm(f,l.x,l.y,l.w,l.h,l.name,'piece')});
    if(f===0&&L.length&&type!=='forge'&&type!=='entrepot'&&nf>1){}
    // portes entre cellules
    for(const s of acc.splits){const c=[];const lim=.8;
      if(s.o==='v'){for(let p=s.a+lim;p<=s.b-lim;p+=.5){if(!acc.leaves.some(l=>(Math.abs(l.y-p)<lim||Math.abs(l.y+l.h-p)<lim)&&(Math.abs(l.x-s.x)<.01||Math.abs(l.x+l.w-s.x)<.01)))c.push(p)}}
      else{for(let p=s.a+lim;p<=s.b-lim;p+=.5){if(!acc.leaves.some(l=>(Math.abs(l.x-p)<lim||Math.abs(l.x+l.w-p)<lim)&&(Math.abs(l.y-s.y)<.01||Math.abs(l.y+l.h-s.y)<.01)))c.push(p)}}
      if(c.length){const p=pick(rg,c);if(s.o==='v')G.dr(f,s.x,p,'v','porte',rg()<.5?1:-1);else G.dr(f,p,s.y,'h','porte',rg()<.5?1:-1)}}
    if(f===0){ // entrée au sud, dans la pièce la plus grande touchant le sud
      const south=L.filter(l=>Math.abs(l.y+l.h-H)<.01).sort((a,b)=>b.w-a.w)[0]||L[0];const ex=Math.round((south.x+south.w/2)*2)/2;
      G.dr(0,ex,H,'h','double',-1,type==='entrepot'?3:1.6);
      const north=L.filter(l=>l.y<.01&&l!==south)[0];if(north&&type!=='entrepot')G.dr(0,Math.round((north.x+north.w/2)*2)/2,0,'h','porte',1)}
    if(nf>1){G.st(f,W-1.4,0.2,1.2,2.6,'s',f===0?'monte':'descend')}
    G.autoWin(f,0,0,W,H,3);
  }
  G.b.floors.forEach((F,f)=>{F.items=F.items.filter(i=>!(i.t==='win'&&nf>1&&i.o==='v'&&i.x===W+2&&i.y<5.5&&false))});
  furnishAll(G,rg);
  G.b.facade={style:pick(rg,['colombage','pierre','brique','bois']),roof:'pignon',porch:false,tower:false,chim:1};G.b.gw=W+8;G.b.gh=H+8;
  if(type==='forge')for(const F of G.b.floors)F.items.filter(i=>i.t==='win'&&rg()<.4).forEach(w=>w.k='baie');
  return G.b}
/* ---- grande demeure : rez en BSP, étages à couloir central ---- */
function genGrand(type,rg){
  const auberge=type==='auberge';
  const W=auberge?ri(rg,15,18):ri(rg,16,20),H=auberge?ri(rg,10,12):ri(rg,12,14),nf=auberge?ri(rg,2,3):ri(rg,2,3);
  const nm=auberge?'Auberge '+NM.tavern(rg):'Manoir de '+cap(NM.village(rg));
  const G=new Gen(nm,nf,2,2);
  // rez
  const left=Math.round(W*.58*2)/2;
  const names0=auberge?{a:'Salle commune',b:'Cuisine',c:'Cellier',d:'Réserve',e:'Chambre du patron'}:{a:'Grande salle',b:'Salle à manger',c:'Cuisine',d:'Cellier',e:'Bureau'};
  G.rm(0,0,0,left,H,names0.a);
  const rh=Math.round(H/3*2)/2;
  G.rm(0,left,0,W-left,rh,names0.b);G.rm(0,left,rh,W-left,Math.round((H-rh)/2*2)/2,names0.c);
  const h2=Math.round((H-rh)/2*2)/2;G.rm(0,left,rh+h2,W-left,H-rh-h2,names0.e);
  const cx=Math.round(left/2*2)/2;
  G.dr(0,cx,H,'h','double',-1,auberge?1.8:2);
  G.dr(0,left,Math.min(H-1.5,rh/2),'v','porte',1);G.dr(0,left,rh+h2/2,'v','porte',1);G.dr(0,left,rh+h2+(H-rh-h2)/2,'v','porte',1);
  G.dr(0,W-0,rh/2,'v','porte',1);G.st(0,left-1.7,0.2,1.5,2.6,'s','monte');
  G.autoWin(0,0,0,W,H,3);
  furnish(G,0,G.b.floors[0].items.filter(i=>i.t==='room')[0],rg);
  for(const r of G.b.floors[0].items.filter(i=>i.t==='room').slice(1))furnish(G,0,r,rg);
  // étages
  for(let f=1;f<nf;f++){
    const cy=Math.round(H/2*2)/2,ch=1.5;
    G.rm(f,0,cy-ch/2,W,ch,'Galerie','couloir');
    const top=cy-ch/2,bot=H-(cy+ch/2);let k=0;
    const ns=Math.max(2,Math.floor(W/3.5));
    for(let i=0;i<ns;i++){const x0=Math.round(W*i/ns*2)/2,x1=Math.round(W*(i+1)/ns*2)/2;
      const nameN=auberge?'Chambre '+(++k+(f-1)*20):(i===0&&f===nf-1?'Chambre du seigneur':'Chambre '+(++k));
      G.rm(f,x0,0,x1-x0,top,nameN);G.dr(f,(x0+x1)/2,top,'h','porte',-1);
      const nameS=auberge?'Chambre '+(++k+(f-1)*20):(i===1&&f===1?'Bibliothèque':i===ns-1?'Cabinet':'Chambre '+(++k));
      G.rm(f,x0,cy+ch/2,x1-x0,bot,nameS);G.dr(f,(x0+x1)/2,cy+ch/2,'h','porte',1)}
    G.st(f,left-1.7,cy-.75,1.5,1.5,'e',f===nf-1?'descend':'monte · descend');
    G.autoWin(f,0,0,W,H,3.4)}
  furnishAll(G,rg);
  G.b.floors.forEach((F,f)=>{if(f>0){const seen=new Set();F.items=F.items.filter(i=>{if(i.t!=='furn')return true;return true})}});
  G.b.facade={style:auberge?'colombage':'pierre',roof:auberge?'pignon':'croupe',porch:!auberge,tower:!auberge&&rg()<.5,chim:3};G.b.gw=W+8;G.b.gh=H+8;
  return G.b}
/* ---- chapelle ---- */
function genChapelle(rg){
  const G=new Gen('Chapelle de '+cap(NM.village(rg)),1,2,2);
  G.rm(0,0,3,7,10,'Nef');G.rm(0,1.5,0,4,3,'Chœur','secure');G.rm(0,7,0,3,4,'Sacristie');G.rm(0,2.5,13,2,2,'Porche','ext');
  G.dr(0,3.5,15,'h','double',-1,1.6);G.dr(0,3.5,13,'h','double',-1,1.6);G.dr(0,3.5,3,'h','arche',-1,3);G.dr(0,7,1.5,'v','porte',1);G.dr(0,8.5,4,'h','porte',1);
  G.fu(0,'autel',3.5,.9);G.fu(0,'statue',2.2,.7);G.fu(0,'statue',4.8,.7);
  for(let i=0;i<5;i++){G.fu(0,'banc',1.9,5+i*1.6);G.fu(0,'banc',5.1,5+i*1.6)}
  G.fu(0,'colonne',.5,5);G.fu(0,'colonne',6.5,5);G.fu(0,'colonne',.5,10);G.fu(0,'colonne',6.5,10);G.fu(0,'tapis',3.5,8,90);
  G.fu(0,'bureau',8.5,2);G.fu(0,'coffre',9.4,.7);G.fu(0,'armoire',7.8,.4);
  for(const y of [5,8,11]){G.wn(0,0,y,'v','baie');G.wn(0,7,y,'v','baie')}G.wn(0,3.5,0,'h','baie');
  G.b.facade={style:'pierre',roof:'pignon',porch:true,tower:false,chim:0};G.b.gw=18;G.b.gh=22;return G.b}
/* ---- tour ---- */
function genTour(rg){
  const D=ri(rg,8,10),nf=ri(rg,3,5);const G=new Gen('Tour '+pick(rg,['de guet','du mage ','des vents','grise'])+(rg()<.5?cap(NM.village(rg)):''),nf,2,2);
  const names=[['Salle des gardes','Armurerie'],['Cuisine','Salle d\'étude'],['Chambre','Cabinet de curiosités'],['Bibliothèque','Laboratoire'],['Observatoire','Sommet']];
  for(let f=0;f<nf;f++){const nm=f===0?'Salle de garde':f===nf-1?'Observatoire':pick(rg,names[Math.min(f,3)]);
    G.rm(f,0,0,D,D,nm,'piece',{shape:'ellipse'});
    G.st(f,D/2-1,1.3,2,2,'spiral','');
    for(const[x,y,o]of[[D/2,0,'h'],[D/2,D,'h'],[0,D/2,'v'],[D,D/2,'v']])if(!(f===0&&y===D&&o==='h'))G.wn(f,x,y,o,'meurtriere');
    const F=G.b.floors[f];const r=F.items.find(i=>i.t==='room');
    const put=(k,px,py,rot)=>add(F,{t:'furn',k,x:fx(px+2),y:fx(py+2),r:rot||0});
    if(/chambre/i.test(nm)){put('lit',2,D/2+1.2);put('coffre',D-2,D/2+2.2)}
    else if(/biblioth/i.test(nm)){put('etagere',D/2,1.2);put('etagere',1.4,D/2+1,90);put('bureau',D-2.2,D/2+1.8)}
    else if(/labo/i.test(nm)){put('table',D/2-1.8,D/2+2);put('cuve',D-2,D/2+1.8);put('etagere',D/2,D-1)}
    else if(/observ|sommet/i.test(nm)){put('tabler',D/2+2,D/2+2);put('pupitre',2,D/2)}
    else if(/garde/i.test(nm)){put('table',D/2+2,D/2+2);put('banc',D/2+2,D/2+3.2);put('foyer',2,D/2)}
    else {put('table',D/2+2,D/2+2);put('etagere',D/2,D-1.1)}
  }
  G.dr(0,D/2,D,'h','double',-1,1.4);G.b.floors.forEach((F,i)=>{F.items.filter(x=>x.t==='stair').forEach(s=>s.label=i===0?'monte':i===nf-1?'descend':'monte · descend')});
  G.b.facade={style:'pierre',roof:'plat',porch:false,tower:false,chim:0};G.b.gw=D+8;G.b.gh=D+8;return G.b}
function genBuilding(type,seed){
  const rg=mkrng(seed);let b;
  if(type==='havre')b=genHavre(rg);
  else if(type==='auberge'||type==='manoir')b=genGrand(type,rg);
  else if(type==='chapelle')b=genChapelle(rg);
  else if(type==='tour')b=genTour(rg);
  else if(type==='vide'){b=mkB('Nouveau bâtiment')}
  else b=genBSP(type,rg);
  b.gen=type==='vide'?undefined:{type,seed};return b}
function regenBuilding(){const b=CB();if(!b.gen)return;snap();const nb=genBuilding(b.gen.type,Math.floor(Math.random()*1e9));nb.id=b.id;nb.name=b.name===nb.name?b.name:nb.name;const i=P.buildings.indexOf(b);P.buildings[i]=nb;ui.sel=[];ui.fl=0;save();renderAll();fit()}
