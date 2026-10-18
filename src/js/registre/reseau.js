/* ============ le réseau ============ */
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, txt) => {
  const e = document.createElementNS(SVGNS, tag);
  Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
  if(txt != null) e.textContent = txt;
  return e;
};
function hash(s){ let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function initiales(n){
  const m = String(n || '?').replace(/[’'\-]/g, ' ').split(/\s+/).filter(Boolean);
  const mots = m.length > 1 && m[0].length === 1 ? m.slice(1) : m;
  if(!mots.length) return '?';
  const s = mots.length === 1 ? mots[0].slice(0, 2) : mots[0][0] + mots[1][0];
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* qui on montre : tout le monde, ou le voisinage d'une personne */
function gensDuReseau(){
  const gens = tousLesGens();
  const ls = liensActifs();
  if(!RES.focus || !quiRef(RES.focus)) return {gens:gens, liens:ls};
  const garde = {}; garde[RES.focus] = 1;
  let front = [RES.focus];
  for(let d = 0; d < RES.prof; d++){
    const suivant = [];
    ls.forEach(l => {
      front.forEach(r => {
        if(l.de === r && !garde[l.vers]){ garde[l.vers] = 1; suivant.push(l.vers); }
        if(l.vers === r && !garde[l.de]){ garde[l.de] = 1; suivant.push(l.de); }
      });
    });
    front = suivant;
  }
  return {gens:gens.filter(g => garde[g.ref]), liens:ls.filter(l => garde[l.de] && garde[l.vers])};
}

/* Fruchterman et Reingold, avec les places épinglées qui ne bougent pas */
function disposer(noeuds, aretes, haut){
  const W = haut ? 620 : 1000, H = haut ? 900 : 680, n = noeuds.length;
  if(!n) return;
  const k = Math.min(170, Math.sqrt(W * H / Math.max(1, n)) * 0.62);
  noeuds.forEach(v => {
    const p = T.positions[v.ref];
    if(p && !p.supprime && isFinite(p.x) && isFinite(p.y)){ v.x = p.x; v.y = p.y; v.fixe = true; return; }
    const h = hash(v.ref), a = (h % 3600) / 3600 * Math.PI * 2, r = (0.2 + ((h >>> 12) % 1000) / 1000 * 0.6);
    v.x = W / 2 + r * W / 3 * Math.cos(a); v.y = H / 2 + r * H / 3 * Math.sin(a); v.fixe = false;
  });
  if(noeuds.every(v => v.fixe)) return;
  const idx = {}; noeuds.forEach((v, i) => idx[v.ref] = i);
  const ressorts = aretes.map(e => ({a:noeuds[idx[e.de]], b:noeuds[idx[e.vers]], w:1})).filter(e => e.a && e.b);
  /* ceux d'un même groupe se tiennent un peu */
  const parGroupe = {};
  noeuds.forEach(v => { if(v.groupe) (parGroupe[v.groupe] = parGroupe[v.groupe] || []).push(v); });
  Object.keys(parGroupe).forEach(g => { const l = parGroupe[g]; for(let i = 0; i < l.length; i++) for(let j = i + 1; j < l.length; j++) ressorts.push({a:l[i], b:l[j], w:0.18}); });
  let t = 90;
  for(let it = 0; it < 320; it++){
    noeuds.forEach(v => { v.dx = 0; v.dy = 0; });
    for(let i = 0; i < n; i++) for(let j = i + 1; j < n; j++){
      const a = noeuds[i], b = noeuds[j];
      let dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
      if(d < 0.01){ dx = (hash(a.ref + b.ref) % 7) - 3 || 1; dy = 1; d = Math.hypot(dx, dy); }
      const f = k * k / d;
      a.dx += dx / d * f; a.dy += dy / d * f; b.dx -= dx / d * f; b.dy -= dy / d * f;
    }
    ressorts.forEach(e => {
      const dx = e.a.x - e.b.x, dy = e.a.y - e.b.y, d = Math.hypot(dx, dy) || 0.01;
      const f = d * d / k * e.w;
      e.a.dx -= dx / d * f; e.a.dy -= dy / d * f; e.b.dx += dx / d * f; e.b.dy += dy / d * f;
    });
    /* on ramène vers le centre, plus fort pour ceux qui s'éloignent : pas d'île perdue au bout du cadre */
    noeuds.forEach(v => {
      const gx = W / 2 - v.x, gy = H / 2 - v.y, d = Math.hypot(gx, gy);
      const f = 0.9 + 0.004 * d;
      v.dx += gx * f * (haut ? 1.35 : 0.85); v.dy += gy * f * (haut ? 0.75 : 1.15);
    });
    noeuds.forEach(v => {
      if(v.fixe) return;
      const d = Math.hypot(v.dx, v.dy) || 0.01, m = Math.min(d, t);
      v.x += v.dx / d * m; v.y += v.dy / d * m;
    });
    t = Math.max(1, t * 0.975);
  }
}

/* ce que le réseau montre : un PV qui bouge dans la table ne le redessine pas */
function signatureReseau(){
  return JSON.stringify([tousLesGens().map(g => [g.ref, g.nom, g.pj ? '' : [g.o.attitude, g.o.statut, g.o.groupe, g.o.role, g.o.peuple]]),
    liensActifs().map(l => [l.id, l.type, l.texte, l.mutuel, l.de, l.vers]), T.positions, RES.sel, RES.focus, RES.prof, RES.etiquettes, RES.relier, RES.reorg]);
}
function dessinerReseau(force){
  const box = $('pnjReseau');
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerReseau(true)); return; }
  if(!force && RES.glisse){ RES.plusTard = true; return; }
  const sig = signatureReseau();
  if(!force && sig === RES.sig && box.firstChild) return;
  RES.sig = sig; RES.plusTard = false;
  box.innerHTML = '';
  const tous = tousLesGens();
  if(!tous.length){ box.append(el('p','vide','Personne à relier : les personnages et les PNJ apparaîtront ici.')); return; }
  if(RES.sel && !quiRef(RES.sel)) RES.sel = '';
  if(RES.focus && !quiRef(RES.focus)) RES.focus = '';

  /* la barre */
  const barre = el('div','acts rbarre');
  const fs = el('select'); fs.id = 'resFocus'; fs.setAttribute('aria-label', 'Qui montrer');
  fs.add(new Option('Tout le monde', ''));
  tous.forEach(g => fs.add(new Option('Autour de ' + g.nom, g.ref)));
  fs.value = RES.focus;
  fs.onchange = () => { RES.focus = fs.value; if(fs.value) RES.sel = fs.value; fs.blur(); dessinerReseau(true); };
  barre.append(fs);
  if(RES.focus){
    const p = el('div','seg');
    [1, 2].forEach(n => {
      const b = el('button', null, n === 1 ? 'Ses proches' : 'Et leurs proches'); b.type = 'button';
      b.setAttribute('aria-pressed', RES.prof === n ? 'true' : 'false');
      b.onclick = () => { RES.prof = n; dessinerReseau(true); };
      p.append(b);
    });
    barre.append(p);
  }
  const et = el('label','coche');
  const cb = el('input'); cb.type = 'checkbox'; cb.checked = RES.etiquettes; cb.id = 'resEtiq';
  cb.onchange = () => { RES.etiquettes = cb.checked; dessinerReseau(true); };
  et.append(cb, document.createTextNode(' Les mots des liens'));
  barre.append(et, el('span','espace'));
  const zb = (txt, lab, fn) => { const b = el('button','btn ghost sm zoom', txt); b.type = 'button'; b.title = lab; b.setAttribute('aria-label', lab); b.onclick = fn; barre.append(b); return b; };
  zb('−', 'dézoomer', () => zoomer(1 / 1.25));
  zb('+', 'zoomer', () => zoomer(1.25));
  zb('Recadrer', 'recadrer le réseau', () => { RES.vue = {s:1, tx:0, ty:0}; appliquerVue(); });
  const epingles = Object.keys(T.positions).some(r => T.positions[r] && !T.positions[r].supprime);
  if(epingles){
    const b = zb(RES.reorg ? 'Confirmer' : 'Réorganiser', 'laisser le réseau se replacer tout seul', () => {
      if(!RES.reorg){ RES.reorg = true; dessinerReseau(true); setTimeout(() => { if(RES.reorg){ RES.reorg = false; dessinerReseau(true); } }, 5000); return; }
      RES.reorg = false;
      changer(() => { const t = maintenant(); Object.keys(T.positions).forEach(r => { T.positions[r] = Object.assign({}, T.positions[r], {supprime:true, maj:t}); }); });
    });
    if(RES.reorg) b.classList.add('danger');
  }
  box.append(barre);

  const zone = el('div','rzone');
  const cadre = el('div','rcadre');
  const {gens, liens:ls} = gensDuReseau();
  const noeuds = gens.map(g => ({ref:g.ref, pj:g.pj, nom:g.nom, o:g.o, groupe:g.pj ? '' : g.o.groupe.trim()}));
  const large = box.clientWidth || (box.parentNode && box.parentNode.clientWidth) || 900;
  disposer(noeuds, ls, large < 620);
  RES.noeuds = noeuds;

  /* le cadre suit le réseau */
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  noeuds.forEach(v => { x0 = Math.min(x0, v.x); y0 = Math.min(y0, v.y); x1 = Math.max(x1, v.x); y1 = Math.max(y1, v.y); });
  const m = 70;
  if(!isFinite(x0)){ x0 = 0; y0 = 0; x1 = 400; y1 = 300; }
  const vb = [x0 - m, y0 - m, Math.max(300, x1 - x0 + 2 * m), Math.max(220, y1 - y0 + 2 * m)];
  RES.cadre = vb;
  const svg = sv('svg', {viewBox:vb.join(' '), class:'reseau', role:'group', 'aria-label':'Le réseau : ' + noeuds.length + ' personnes, ' + ls.length + ' liens', preserveAspectRatio:'xMidYMid meet'});
  svg.style.aspectRatio = vb[2] + ' / ' + vb[3];
  const defs = sv('defs');
  TYPES_LIEN.forEach(t => {
    const mk = sv('marker', {id:'fl-' + t.k, viewBox:'0 0 10 10', refX:'9', refY:'5', markerWidth:'7', markerHeight:'7', orient:'auto-start-reverse'});
    mk.append(sv('path', {d:'M0,0 L10,5 L0,10 z', class:'fl l-' + t.k}));
    defs.append(mk);
  });
  svg.append(defs);
  const fond = sv('rect', {x:vb[0] - 5000, y:vb[1] - 5000, width:vb[2] + 10000, height:vb[3] + 10000, class:'rfond'});
  svg.append(fond);
  const vue = sv('g', {class:'vue'});
  svg.append(vue);
  const gA = sv('g', {class:'aretes'}), gE = sv('g', {class:'etiq'}), gN = sv('g', {class:'noeuds'});
  vue.append(gA, gE, gN);

  const parRef = {}; noeuds.forEach(v => parRef[v.ref] = v);
  const rayon = v => v.pj ? 21 : 16;
  /* plusieurs liens entre deux mêmes personnes : on les écarte en arcs */
  const paires = {};
  ls.forEach(l => { const k = [l.de, l.vers].sort().join('|'); (paires[k] = paires[k] || []).push(l); });
  const aretes = [];
  Object.keys(paires).forEach(k => {
    const g = paires[k];
    g.forEach((l, i) => {
      const a = parRef[l.de], b = parRef[l.vers];
      if(!a || !b) return;
      const sens = l.de < l.vers ? 1 : -1;
      aretes.push({l:l, a:a, b:b, courbe:(i - (g.length - 1) / 2) * 34 * sens});
    });
  });
  RES.aretes = aretes;
  aretes.forEach(e => {
    e.path = sv('path', {class:'arete l-' + e.l.type + (e.l.mutuel ? '' : ' oriente'), fill:'none'});
    if(!e.l.mutuel) e.path.setAttribute('marker-end', 'url(#fl-' + e.l.type + ')');
    e.titre = sv('title', {}, phraseLien(e.l));
    e.path.append(e.titre);
    gA.append(e.path);
    if(RES.etiquettes){
      const lab = e.l.texte || typeLien(e.l.type).l;
      e.lab = sv('text', {class:'elab', 'text-anchor':'middle'}, lab.length > 30 ? lab.slice(0, 28).replace(/\s+\S*$/, '') + '…' : lab);
      gE.append(e.lab);
    }
  });
  const placerArete = e => {
    const a = e.a, b = e.b, ra = rayon(a) + 2, rb = rayon(b) + (e.l.mutuel ? 2 : 5);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    const cx = mx + nx * e.courbe * 2, cy = my + ny * e.courbe * 2;
    const ax = cx - a.x, ay = cy - a.y, da = Math.hypot(ax, ay) || 1;
    const bx = cx - b.x, by = cy - b.y, db = Math.hypot(bx, by) || 1;
    const sx = a.x + ax / da * ra, sy = a.y + ay / da * ra, ex = b.x + bx / db * rb, ey = b.y + by / db * rb;
    e.path.setAttribute('d', 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1));
    if(e.lab){
      e.lab.setAttribute('x', (0.25 * sx + 0.5 * cx + 0.25 * ex).toFixed(1));
      e.lab.setAttribute('y', (0.25 * sy + 0.5 * cy + 0.25 * ey - 4).toFixed(1));
    }
  };
  aretes.forEach(placerArete);

  const voisins = ref => { const s = {}; s[ref] = 1; aretes.forEach(e => { if(e.a.ref === ref) s[e.b.ref] = 1; if(e.b.ref === ref) s[e.a.ref] = 1; }); return s; };
  const eclairer = ref => {
    const s = ref ? voisins(ref) : null;
    noeuds.forEach(v => v.g.classList.toggle('pale', !!s && !s[v.ref]));
    aretes.forEach(e => {
      const on = !s || (e.a.ref === ref || e.b.ref === ref);
      e.path.classList.toggle('pale', !on);
      if(e.lab) e.lab.classList.toggle('pale', !on);
    });
  };

  noeuds.forEach(v => {
    const g = sv('g', {class:'noeud' + (v.pj ? ' pj' : ' pnj att-' + v.o.attitude + ' st-' + v.o.statut) + (RES.sel === v.ref ? ' sel' : '') + (RES.relier === v.ref ? ' relie' : ''),
      tabindex:'0', role:'button', 'aria-label':v.nom + (v.pj ? ', personnage' : ', PNJ ' + libelle(ATTITUDES, v.o.attitude).toLowerCase())});
    g.append(sv('circle', {r:rayon(v) + 5, class:'halo'}));
    g.append(sv('circle', {r:rayon(v), class:'disque'}));
    g.append(sv('text', {class:'init', 'text-anchor':'middle', dy:'0.35em'}, initiales(v.nom)));
    g.append(sv('text', {class:'nlab', 'text-anchor':'middle', y:String(rayon(v) + 15)}, v.nom + (!v.pj && v.o.statut === 'mort' ? ' †' : '')));
    g.append(sv('title', {}, v.nom + (v.pj ? '' : (v.o.role ? ', ' + v.o.role : ''))));
    g.setAttribute('transform', 'translate(' + v.x.toFixed(1) + ',' + v.y.toFixed(1) + ')');
    v.g = g;
    gN.append(g);
    g.addEventListener('pointerenter', () => { if(!RES.glisse) eclairer(v.ref); });
    g.addEventListener('pointerleave', () => { if(!RES.glisse) eclairer(RES.sel); });
    g.addEventListener('keydown', ev => { if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); choisirNoeud(v.ref); } });
    g.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      const p0 = versMonde(svg, ev);
      RES.glisse = {v:v, x:p0.x, y:p0.y, vx:v.x, vy:v.y, bouge:false, id:ev.pointerId};
      try{ g.setPointerCapture(ev.pointerId); }catch(e){}
    });
    g.addEventListener('pointermove', ev => {
      const s = RES.glisse;
      if(!s || s.v !== v) return;
      const p = versMonde(svg, ev);
      if(!s.bouge && Math.hypot(p.x - s.x, p.y - s.y) < 4 / RES.vue.s) return;
      s.bouge = true;
      v.x = s.vx + p.x - s.x; v.y = s.vy + p.y - s.y;
      g.setAttribute('transform', 'translate(' + v.x.toFixed(1) + ',' + v.y.toFixed(1) + ')');
      aretes.forEach(e => { if(e.a === v || e.b === v) placerArete(e); });
    });
    const lacher = ev => {
      const s = RES.glisse;
      if(!s || s.v !== v) return;
      RES.glisse = null;
      if(RES.plusTard) setTimeout(() => dessinerReseau(true), 0);
      try{ g.releasePointerCapture(ev.pointerId); }catch(e){}
      if(!s.bouge){ choisirNoeud(v.ref); return; }
      /* la première fois qu'on déplace quelqu'un, tout le monde est épinglé : rien d'autre ne bouge */
      const t = maintenant();
      changer(() => {
        noeuds.forEach(w => {
          const p = T.positions[w.ref];
          if(w === v || !p || p.supprime) T.positions[w.ref] = {x:Math.round(w.x), y:Math.round(w.y), maj:t, supprime:false};
        });
      });
    };
    g.addEventListener('pointerup', lacher);
    g.addEventListener('pointercancel', lacher);
  });

  /* glisser le fond déplace la vue, la molette zoome */
  let pan = null;
  svg.addEventListener('pointerdown', ev => {
    if(ev.button !== 0) return;
    pan = {x:ev.clientX, y:ev.clientY, tx:RES.vue.tx, ty:RES.vue.ty, bouge:false};
    try{ svg.setPointerCapture(ev.pointerId); }catch(e){}
  });
  svg.addEventListener('pointermove', ev => {
    if(!pan) return;
    const ctm = svg.getScreenCTM(); if(!ctm) return;
    const dx = (ev.clientX - pan.x) / ctm.a, dy = (ev.clientY - pan.y) / ctm.d;
    if(Math.hypot(dx, dy) > 2) pan.bouge = true;
    RES.vue.tx = pan.tx + dx; RES.vue.ty = pan.ty + dy;
    appliquerVue();
  });
  const finPan = () => {
    if(pan && !pan.bouge && !RES.relier){ RES.sel = ''; eclairer(''); dessinerPanneau(); noeuds.forEach(v => v.g.classList.remove('sel')); }
    pan = null;
  };
  svg.addEventListener('pointerup', finPan);
  svg.addEventListener('pointercancel', () => { pan = null; });
  /* Ctrl et la molette zooment ; la molette seule fait défiler la page */
  svg.addEventListener('wheel', ev => {
    if(!ev.ctrlKey && !ev.metaKey) return;
    ev.preventDefault();
    zoomer(ev.deltaY < 0 ? 1.12 : 1 / 1.12, versEcran(svg, ev));
  }, {passive:false});

  cadre.append(svg);
  zone.append(cadre);
  const panneau = el('div','rpanneau'); panneau.id = 'resPanneau';
  zone.append(panneau);
  box.append(zone);
  box.append(legende(noeuds, aretes));
  RES.svg = svg; RES.vueG = vue; RES.eclairer = eclairer;
  /* sur un petit écran, les noms gardent une taille lisible */
  const r = svg.getBoundingClientRect();
  if(r.width > 0 && r.height > 0){
    const k = Math.max(vb[2] / r.width, vb[3] / r.height);
    svg.style.setProperty('--k', Math.max(1, Math.min(2.6, k)).toFixed(2));
  }
  appliquerVue();
  eclairer(RES.sel);
  dessinerPanneau();
}

/* coordonnées : l'écran, le cadre du SVG, le monde sous le zoom */
function versEcran(svg, ev){
  const ctm = svg.getScreenCTM();
  if(!ctm) return {x:0, y:0};
  const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
  const q = p.matrixTransform(ctm.inverse());
  return {x:q.x, y:q.y};
}
function versMonde(svg, ev){
  const q = versEcran(svg, ev);
  return {x:(q.x - RES.vue.tx) / RES.vue.s, y:(q.y - RES.vue.ty) / RES.vue.s};
}
function appliquerVue(){
  if(!RES.vueG) return;
  const v = RES.vue;
  RES.vueG.setAttribute('transform', 'translate(' + v.tx.toFixed(2) + ',' + v.ty.toFixed(2) + ') scale(' + v.s.toFixed(4) + ')');
}
function zoomer(f, autour){
  const v = RES.vue, c = RES.cadre;
  const p = autour || (c ? {x:c[0] + c[2] / 2, y:c[1] + c[3] / 2} : {x:0, y:0});
  const s = Math.max(0.3, Math.min(4, v.s * f));
  const r = s / v.s;
  v.tx = p.x - (p.x - v.tx) * r; v.ty = p.y - (p.y - v.ty) * r; v.s = s;
  appliquerVue();
}

function choisirNoeud(ref){
  if(RES.relier && RES.relier !== ref){ RES.cible = ref; RES.sel = RES.relier; }
  else { RES.sel = RES.sel === ref && !RES.relier ? '' : ref; RES.cible = ''; }
  (RES.noeuds || []).forEach(v => { if(v.g){ v.g.classList.toggle('sel', v.ref === RES.sel); v.g.classList.toggle('relie', v.ref === RES.relier); } });
  if(RES.eclairer) RES.eclairer(RES.sel);
  dessinerPanneau();
}

function dessinerPanneau(){
  const box = $('resPanneau'); if(!box) return;
  box.innerHTML = '';
  const q = quiRef(RES.sel);
  if(!q){
    box.append(el('p','mini','Clique sur quelqu’un pour voir ses liens et en tisser. Fais-le glisser pour le déplacer : sa place est gardée pour toute la table. Ctrl et la molette zooment, glisser le fond déplace la vue.'));
    return;
  }
  const o = q.o;
  box.append(el('div','pnom', q.nom + (!q.pj && o.statut === 'mort' ? ' †' : '')));
  const sous = q.pj ? ['personnage', o.joueur ? 'joué par ' + o.joueur : '', o.peuple, o.voie] : [o.role, o.peuple, o.groupe];
  box.append(el('div','pqui', sous.filter(Boolean).join(' · ') || 'rien de noté'));
  if(!q.pj) box.append(el('div','mini', libelle(ATTITUDES, o.attitude) + ' envers le groupe' + (o.statut !== 'vivant' ? ' · ' + libelle(STATUTS, o.statut).toLowerCase() : '')));

  if(RES.relier === q.ref){
    box.append(el('h3', null, 'Relier ' + q.nom));
    box.append(el('p','mini', RES.cible ? 'Le lien avec ' + (quiRef(RES.cible) || {}).nom + ' :' : 'Clique sur la personne à relier, ou choisis-la ici.'));
    box.append(formLien(q.ref, RES.cible, () => { RES.relier = ''; RES.cible = ''; dessinerReseau(true); }));
    const an = el('button','btn ghost sm','Annuler'); an.type = 'button';
    an.onclick = () => { RES.relier = ''; RES.cible = ''; dessinerReseau(true); };
    box.append(an);
    return;
  }
  const ls = liensDe(q.ref);
  box.append(el('h3', null, ls.length ? 'Ses liens' : 'Aucun lien pour l’instant'));
  ls.forEach(l => box.append(ligneLien(l, dessinerPanneau, q.ref, 'reseau')));
  const act = el('div','acts'); act.style.marginTop = '10px';
  const b = (txt, fn) => { const x = el('button','btn ghost sm', txt); x.type = 'button'; x.onclick = fn; act.append(x); return x; };
  b('Relier à…', () => { RES.relier = q.ref; RES.cible = ''; choisirNoeud(q.ref); });
  if(RES.focus !== q.ref) b('Ses proches seulement', () => { RES.focus = q.ref; dessinerReseau(true); });
  else b('Tout le monde', () => { RES.focus = ''; dessinerReseau(true); });
  if(q.pj) b($('pListe') ? 'Voir sa fiche' : 'Voir ses liens', () => {
    if(!$('pListe')){ const v = document.querySelector('[data-pj="' + o.id + '"]'); if(v) v.scrollIntoView({block:'start', behavior:'smooth'}); return; }
    OUVERTS[o.id] = true; dessinerPersos(); const c = document.querySelector('[data-perso="' + o.id + '"]'); if(c) c.scrollIntoView({block:'start', behavior:'smooth'});
  });
  else {
    b('Voir la fiche', () => { MOI.vuePnj = 'fiches'; PNJ_OUVERTS[o.id] = true; PNJ_FILTRE.q = ''; $('pnjCherche').value = ''; sauverLocal(); dessinerPnj(true); const c = document.querySelector('[data-pnj="' + o.id + '"]'); if(c) c.scrollIntoView({block:'start', behavior:'smooth'}); });
    b('Faire parler', () => composerPourPnj(o));
  }
  const p = T.positions[q.ref];
  if(p && !p.supprime) b('Libérer sa place', () => changer(() => { T.positions[q.ref] = Object.assign({}, p, {supprime:true, maj:maintenant()}); }));
  box.append(act);
}

function legende(noeuds, aretes){
  const w = el('div','rlegende');
  const types = {};
  aretes.forEach(e => types[e.l.type] = 1);
  const ts = TYPES_LIEN.filter(t => types[t.k]);
  if(ts.length){
    const l = el('div','rleg');
    ts.forEach(t => {
      const s = el('span','rl');
      const svgT = sv('svg', {width:'26', height:'10', 'aria-hidden':'true'});
      svgT.append(sv('line', {x1:'1', y1:'5', x2:'25', y2:'5', class:'arete l-' + t.k}));
      s.append(svgT, document.createTextNode(t.l));
      l.append(s);
    });
    w.append(l);
  }
  const atts = {};
  noeuds.forEach(v => { if(!v.pj) atts[v.o.attitude] = 1; });
  const l2 = el('div','rleg');
  const pj = el('span','rl'); pj.append(el('i','rpt pj'), document.createTextNode('Personnage'));
  l2.append(pj);
  ATTITUDES.filter(a => atts[a.k]).forEach(a => {
    const s = el('span','rl'); s.append(el('i','rpt att-' + a.k), document.createTextNode(a.l)); l2.append(s);
  });
  w.append(l2);
  return w;
}

/* ---------- les personnages, dans le Registre des Visages : ce qui les lie ---------- */
function dessinerPjVisages(){
  const box = $('vPjListe'); if(!box) return;
  if(occupe(box)){ apresSaisie(box, dessinerPjVisages); return; }
  box.innerHTML = '';
  const l = persos();
  if(!l.length){ box.append(el('p','vide','Personne à la table pour l’instant. Les personnages entrent par le Registre de la Table.')); return; }
  l.forEach(c => {
    const ref = 'pj:' + c.id;
    const w = el('div','pcarte' + (MOI.perso === c.id ? ' moi' : ''));
    w.setAttribute('data-pj', c.id);
    w.append(el('div','pnom', c.nom || 'Sans nom'));
    w.append(el('div','pqui', [joueurDe(c) ? 'joué par ' + joueurDe(c) : '', c.peuple, c.voie].filter(Boolean).join(' · ') || 'personne ne le tient'));
    const ls = liensDe(ref);
    const zl = el('div','vliens');
    if(!ls.length) zl.append(el('p','mini','Aucun lien pour l’instant.'));
    ls.forEach(x => zl.append(ligneLien(x, dessinerPjVisages, ref, 'pj')));
    w.append(zl);
    /* ce que les comptes rendus disent de lui : replié, un personnage agit à chaque paragraphe */
    const n = textesDe(ref).length;
    if(n){
      const det = el('details','vtextes');
      det.open = !!PJ_TEXTES_OUVERTS[ref];
      det.ontoggle = () => { PJ_TEXTES_OUVERTS[ref] = det.open; if(det.open && !det.querySelector('.textes')) det.append(blocTextes(ref, dessinerPjVisages)); };
      det.append(el('summary', null, 'Dans les comptes rendus · ' + n + ' paragraphe' + (n > 1 ? 's' : '')));
      if(det.open) det.append(blocTextes(ref, dessinerPjVisages));
      w.append(det);
    }
    const act = el('div','pact');
    const ti = el('button','btn ghost sm','Tisser un lien'); ti.type = 'button';
    ti.setAttribute('aria-expanded', TISSE[ref] ? 'true' : 'false');
    ti.onclick = () => {
      TISSE[ref] = !TISSE[ref]; dessinerPjVisages();
      if(TISSE[ref]){ const s = document.querySelector('[data-pj="' + c.id + '"] .fl-avec'); if(s) s.focus(); }
    };
    const rs = el('button','btn ghost sm','Dans le réseau'); rs.type = 'button';
    rs.onclick = () => { MOI.vuePnj = 'reseau'; RES.sel = ref; RES.focus = ''; sauverLocal(); dessinerPnj(true); $('secPnj').scrollIntoView({block:'start', behavior:'smooth'}); };
    const gr = el('button','btn ghost sm','En grand'); gr.type = 'button';
    gr.setAttribute('aria-label', 'Ouvrir la fiche de ' + (c.nom || 'ce personnage') + ' en grand');
    gr.onclick = () => ouvrirGrand(ref);
    act.append(gr, ti, rs);
    w.append(act);
    if(TISSE[ref]) w.append(formLien(ref, '', () => { TISSE[ref] = false; dessinerPjVisages(); }));
    box.append(w);
  });
}
