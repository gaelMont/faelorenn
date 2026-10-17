/* ====== carte du monde : mesurer, cercles de repère, noms lisibles ======
   Tout est en unités de carte ; w.kmu dit combien de kilomètres fait une unité. */

/* ---- mesurer entre deux points ---- */
let wmes=null;                       /* {a:[x,y], b:[x,y]} tant qu'on regarde une mesure */
const wDist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1])*CW().kmu;
/* le point visé se cale sur un lieu quand on en passe près : une mesure de ville à ville est juste */
function wViser(m){
  const w=CW(),t=12/ui.view.k;
  let best=null,bd=t;
  for(const c of w.items)if(c.t==='city'){const d=Math.hypot(c.x-m[0],c.y-m[1]);if(d<bd){bd=d;best=c}}
  return best?[best.x,best.y,best.name||CK[best.k]||'ce lieu']:[fx(m[0]),fx(m[1]),null]}
function wMesDebut(m){const p=wViser(m);wmes={a:[p[0],p[1]],b:[p[0],p[1]],na:p[2],nb:p[2]}}
function wMesTirer(m){if(!wmes)return;const p=wViser(m);wmes.b=[p[0],p[1]];wmes.nb=p[2]}
function wMesTexte(){
  if(!wmes)return '';
  const d=wDist(wmes.a,wmes.b);
  const de=wmes.na&&wmes.nb&&wmes.na!==wmes.nb?wmes.na+' → '+wmes.nb+' : ':'';
  return de+fmtKm(d)+' km';}
function wMesSVG(k){
  if(!wmes)return '';
  const a=wmes.a,b=wmes.b,d=Math.hypot(b[0]-a[0],b[1]-a[1]);
  let s=`<circle cx="${fx(a[0])}" cy="${fx(a[1])}" r="${fx(d)}" fill="none" stroke="var(--accent)" stroke-width="${1.2*k}" stroke-dasharray="${4*k} ${4*k}" opacity=".55"/>`;
  s+=`<line x1="${fx(a[0])}" y1="${fx(a[1])}" x2="${fx(b[0])}" y2="${fx(b[1])}" stroke="var(--accent)" stroke-width="${2.2*k}"/>`;
  for(const p of[a,b])s+=`<circle cx="${fx(p[0])}" cy="${fx(p[1])}" r="${4*k}" fill="#fff" stroke="var(--accent)" stroke-width="${1.8*k}"/>`;
  const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
  s+=`<text x="${fx(mx)}" y="${fx(my-8*k)}" text-anchor="middle" font-family="${FONT}" font-size="${13*k}" font-weight="700" fill="var(--accent)" stroke="${PAPER}" stroke-width="${3.5*k}" paint-order="stroke">${esc(fmtKm(wDist(a,b)))} km</text>`;
  return s}

/* ---- un cercle de repère gardé sur un lieu : « une ville à tant de kilomètres d'ici » ---- */
function wCerclesSVG(w,k){
  let s='';
  for(const c of w.items){
    if(c.t!=='city'||!(typeof c.cercle==='number'&&isFinite(c.cercle)&&c.cercle>0))continue;
    const r=c.cercle/w.kmu;
    s+=`<circle cx="${fx(c.x)}" cy="${fx(c.y)}" r="${fx(r)}" fill="none" stroke="var(--accent)" stroke-width="${1.4*k}" stroke-dasharray="${6*k} ${4*k}" opacity=".7"/>`
      +`<text x="${fx(c.x)}" y="${fx(c.y-r-4*k)}" text-anchor="middle" font-family="${FONT}" font-size="${11*k}" font-weight="700" fill="var(--accent)" stroke="${PAPER}" stroke-width="${3*k}" paint-order="stroke">${esc(fmtKm(c.cercle))} km</text>`}
  return s}

/* ---- les noms des lieux : taille, ce qu'on affiche, et jamais l'un sur l'autre ---- */
const WN_TAILLES=[['0.8','Petits'],['1','Normaux'],['1.3','Grands'],['1.7','Très grands']];
const WN_FS={capitale:13,ville:11,village:9.5,hameau:8.5,port:10};
const WN_OFF={capitale:15,ville:12,village:10,hameau:8.5};
const WN_RANG={capitale:0,ville:1,port:1,fort:2,temple:2,tour:3,portail:3,village:4,hameau:5,ruine:6,grotte:6};
const WN_RAYON={capitale:7,ville:5.5,port:5.5,fort:6,temple:5,tour:5,village:4.5,hameau:4,ruine:4.5,grotte:4.5,portail:5};
function wNomsCfg(w){
  const o=w&&typeof w.noms==='object'&&w.noms?w.noms:{};
  const t=typeof o.t==='number'&&isFinite(o.t)?clamp(o.t,.5,2.5):1;
  const off=o.off&&typeof o.off==='object'&&!Array.isArray(o.off)?o.off:{};
  return{t:t,off:off}}
const wNomVisible=(cfg,k)=>!cfg.off[k];
let W_NOMS_CACHES=0;
const wChevauche=(a,b)=>a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3];
/* les noms des lieux, posés là où ils tiennent : sous le point, dessus, à droite, à gauche, puis en biais */
function wNomsSVG(w,halo){
  const cfg=wNomsCfg(w),cs=w.items.filter(i=>i.t==='city');
  const pris=[];
  /* ce qui est déjà sur la carte : les points eux-mêmes, les noms de royaume, les textes libres */
  for(const c of cs){const r=(WN_RAYON[c.k]||4.5);pris.push([c.x-r,c.y-r,c.x+r,c.y+r])}
  for(const r of w.items)if(r.t==='realm'&&r.name&&!r.hideName){
    const fs=clamp(Math.sqrt(polyArea(r.pts))/9,11,34),L=realmLab(r,w),lg=String(r.name).length*fs*.62;
    pris.push([L[0]-lg/2,L[1]-fs*.8,L[0]+lg/2,L[1]+fs*.4])}
  for(const l of w.items)if(l.t==='label'&&l.text){
    const fs=l.size||14,lg=String(l.text).length*fs*.5;
    pris.push([l.x-lg/2,l.y-fs*.8,l.x+lg/2,l.y+fs*.4])}
  const ordre=cs.filter(c=>c.name&&c.hideName!==true&&wNomVisible(cfg,c.k))
    .map((c,i)=>({c:c,i:i}))
    .sort((a,b)=>(WN_RANG[a.c.k]??4)-(WN_RANG[b.c.k]??4)||String(a.c.name).localeCompare(String(b.c.name),'fr')||a.i-b.i);
  let s='',caches=0;
  for(const{c}of ordre){
    const fs=(WN_FS[c.k]||9)*cfg.t,off=(WN_OFF[c.k]||11)*Math.max(1,cfg.t*.9),r=WN_RAYON[c.k]||4.5;
    const lg=String(c.name).length*fs*.52,ht=fs*1.06,marge=fs*.12;
    const essais=[
      [0,off,'middle'],[0,-(off*.72),'middle'],
      [r+fs*.3,fs*.34,'start'],[-(r+fs*.3),fs*.34,'end'],
      [r*.8,off*.9,'start'],[-(r*.8),off*.9,'end'],
      [r*.8,-(off*.6),'start'],[-(r*.8),-(off*.6),'end'],
      [0,off*1.9,'middle'],[0,-(off*1.5),'middle']];
    let mis=null;
    for(const[dx,dy,an]of essais){
      const cx=c.x+dx+(an==='start'?lg/2:an==='end'?-lg/2:0);
      const b=[cx-lg/2-marge,c.y+dy-ht*.82-marge,cx+lg/2+marge,c.y+dy+ht*.24+marge];
      if(pris.some(q=>wChevauche(b,q)))continue;
      mis=[dx,dy,an,b];break}
    if(!mis){caches++;continue}
    pris.push(mis[3]);
    s+=`<text class="nl" x="${fx(c.x+mis[0])}" y="${fx(c.y+mis[1])}" font-size="${fx(fs)}" text-anchor="${mis[2]}" ${['capitale','ville','port'].includes(c.k)?'font-weight="700"':'font-style="italic"'} ${halo}>${esc(c.name)}</text>`}
  W_NOMS_CACHES=caches;
  return s}

/* ---- les réglages, dans le panneau de la carte ---- */
function wNomsPanneau(w){
  const cfg=wNomsCfg(w),cs=w.items.filter(i=>i.t==='city');
  const genres=Object.keys(CK).filter(k=>cs.some(c=>c.k===k));
  if(!genres.length)return '';
  let h=`<h3>Noms des lieux</h3><div class="row"><label>Taille</label><select data-wnom="t">`
    +WN_TAILLES.map(([v,n])=>`<option value="${v}"${Math.abs(cfg.t-(+v))<.001?' selected':''}>${n}</option>`).join('')+`</select></div>`;
  h+=`<p class="hint" style="margin:6px 0 2px">À afficher :</p><div class="row" style="flex-wrap:wrap;gap:4px 12px">`
    +genres.map(k=>`<label style="min-width:0"><input type="checkbox" data-wnomk="${k}"${wNomVisible(cfg,k)?' checked':''}> ${esc(CK[k])} (${cs.filter(c=>c.k===k).length})</label>`).join('')+`</div>`;
  h+=`<p class="hint">Un nom qui ne tient nulle part sans en recouvrir un autre n'est pas écrit`
    +(W_NOMS_CACHES?` : ${W_NOMS_CACHES} nom${W_NOMS_CACHES>1?'s':''} de côté en ce moment. Réduis la taille, masque un type de lieu, ou écarte-les.`:'.')+`</p>`;
  return h}
