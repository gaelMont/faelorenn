const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };

const S = {pj:2, inten:'ser', liste:[], pourquoi:'', fam:[], source:'tout'};
function save(){ try{ localStorage.setItem('faelorenn.rencontre', JSON.stringify(S)); }catch(e){} }
function load(){ try{ const r = localStorage.getItem('faelorenn.rencontre'); if(r) Object.assign(S, JSON.parse(r)); }catch(e){} }

/* ---------- rendu ---------- */
function stepper(get, set, min, max){
  const w = el('div','stepper');
  const m = el('button', null, '−'); m.type = 'button'; m.setAttribute('aria-label','moins');
  const v = el('span','v', String(get()));
  const p = el('button', null, '+'); p.type = 'button'; p.setAttribute('aria-label','plus');
  m.disabled = get() <= min; p.disabled = get() >= max;
  m.onclick = () => { set(get() - 1); draw(); };
  p.onclick = () => { set(get() + 1); draw(); };
  w.append(m, v, p); return w;
}

function drawSetup(){
  const box = $('pjStep'); box.innerHTML = '';
  box.append(stepper(() => S.pj, v => { S.pj = Math.max(1, Math.min(6, v)); }, 1, 6));

  const seg = $('intSeg'); seg.innerHTML = '';
  INTENSITES.forEach(i => {
    const b = el('button', null, i.l); b.type = 'button';
    b.setAttribute('aria-pressed', S.inten === i.k ? 'true' : 'false');
    b.onclick = () => { S.inten = i.k; draw(); };
    seg.append(b);
  });

  const B = budget(), dep = depense();
  const p = $('budget'); p.innerHTML = '';
  p.append(document.createTextNode('Budget : '));
  p.append(el('b', null, String(B)));
  p.append(document.createTextNode(' points, ' + intensite().d + '. Posé sur la table : ' + dep + '.'));
}

function drawFam(){
  const src = $('srcSeg'); src.innerHTML = '';
  SOURCES.forEach(s => {
    const b = el('button', null, s.l + (s.k === 'maison' ? ' (' + MAISON.length + ')' : '')); b.type = 'button';
    b.setAttribute('aria-pressed', S.source === s.k ? 'true' : 'false');
    b.disabled = s.k === 'maison' && !MAISON.length;
    b.onclick = () => { S.source = s.k; draw(); };
    src.append(b);
  });
  if(S.source === 'maison' && !MAISON.length) S.source = 'tout';

  /* une famille supprimee ailleurs ne reste pas cochee */
  if(BST.pret) S.fam = S.fam.filter(k => famille(k));

  /* une ligne par sorte de famille : la catégorie, la sous-catégorie, les tiennes */
  const box = $('famSeg'); box.innerHTML = '';
  const mk = (seg, k, l, fm) => {
    const b = el('button', fm ? 'fm' : null, l); b.type = 'button';
    if(k) b.id = 'famf-' + k;
    const on = k === null ? !S.fam.length : S.fam.indexOf(k) >= 0;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.onclick = () => {
      if(k === null) S.fam = [];
      else if(on) S.fam = S.fam.filter(x => x !== k);
      else S.fam = S.fam.concat([k]);
      draw();
    };
    seg.append(b);
  };
  /* ne s'affiche que ce qui va avec les choix des autres lignes : pas de Bête Soldat tant que personne ne l'est.
     Une famille cochée reste, pour qu'on puisse la décocher, marquée si plus personne n'y répond */
  const pioche = [1, 2, 3, 4, 5].reduce((a, r) => a.concat(catalogue(r)), []);
  const possible = (k, g) => {
    const autres = S.fam.filter(x => groupeFam(x) !== g);
    return pioche.some(c => membre(c, k) && passeFamilles(c, autres));
  };
  lignesFamilles().forEach((L, i) => {
    const row = el('div','famligne');
    row.append(el('span','famlab', L.l));
    const seg = el('div','seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', L.l);
    if(!i) mk(seg, null, 'Tout');
    let vus = 0;
    L.fams.forEach(f => {
      const ok = possible(f.k, L.g), coche = S.fam.indexOf(f.k) >= 0;
      if(!ok && !coche) return;
      mk(seg, f.k, f.l, L.g === 'maison');
      vus++;
      if(!ok){ const b = seg.lastChild; b.classList.add('famhors'); b.title = 'Personne ne va avec les autres choix : clique pour l’enlever'; }
    });
    if(!vus && L.g !== 'maison') seg.append(el('span','famvide', 'Aucune avec ce choix'));
    if(L.g === 'maison'){
      const plus = el('button', 'ajout', '+ Nouvelle famille'); plus.type = 'button'; plus.id = 'famPlus';
      plus.onclick = () => ouvrirFamille({}, true);
      seg.append(plus);
    }
    row.append(seg);
    box.append(row);
  });

  const n = $('famNote');
  /* deux lignes cochées : il faut les deux */
  const par = {};
  S.fam.forEach(k => { const f = famille(k); if(f){ const g = groupeFam(k); (par[g] = par[g] || []).push(f.l); } });
  const lignes = Object.keys(par);
  const lesDeux = lignes.length > 1 ? 'Il faut être à la fois ' + lignes.map(g => par[g].join(' ou ')).join(' et ') + '. ' : '';
  const manquants = [];
  let total = 0;
  for(let r = 1; r <= 5; r++){ const v = vivier(r); if(v.force || !v.liste.length) manquants.push(r); else total += v.liste.length; }
  if(!total){
    n.textContent = lesDeux + 'Personne ne répond à ce choix pour l’instant : le tirage reprend tout le catalogue.' +
      (S.fam.some(estMaisonFam) ? ' Mets des adversaires dans ta famille, plus bas dans ton bestiaire.' : '');
    return;
  }
  n.textContent = lesDeux + total + ' entrée' + (total > 1 ? 's' : '') + ' dans la pioche.' +
    (manquants.length ? ' Rien à ce choix au rang ' + manquants.join(', ') +
      ' : le tirage évite ces rangs, et si tu en poses un à la main il reprend tout le catalogue.' : '');
}

function drawMix(){
  const tb = $('mixBody'); tb.innerHTML = '';
  ADV.rangs.forEach(r => {
    const tr = el('tr');
    const td = el('td');
    td.append(el('span','dot d' + r.r), document.createTextNode(r.r + ' · ' + r.nom));
    tr.append(td);
    tr.append(el('td','n', String(COUT[r.r])));
    tr.append(el('td','n', String(r.pv)));
    tr.append(el('td','n', r.deg));
    tr.append(el('td','n', String(r.red)));
    tr.append(el('td','n', String(r.cartes)));
    const tdc = el('td','n');
    const w = el('div','stepper'); w.style.justifyContent = 'flex-end';
    const m = el('button', null, '−'); m.type = 'button'; m.setAttribute('aria-label','un ' + r.nom + ' de moins');
    const v = el('span','v', String(compte(r.r)));
    const p = el('button', null, '+'); p.type = 'button'; p.setAttribute('aria-label','un ' + r.nom + ' de plus');
    m.disabled = compte(r.r) === 0;
    p.disabled = S.liste.length >= 12;
    m.onclick = () => { retirer(r.r); draw(); };
    p.onclick = () => { ajouter(r.r); if(!S.pourquoi) S.pourquoi = pick(ADV.pourquoi); draw(); };
    w.append(m, v, p); tdc.append(w); tr.append(tdc);
    tb.append(tr);
  });

  const B = budget(), dep = depense(), warn = $('mixWarn');
  if(!S.liste.length || dep === B){ warn.hidden = true; warn.textContent = ''; }
  else {
    warn.hidden = false;
    warn.textContent = dep < B
      ? 'Il reste ' + (B - dep) + ' point' + (B - dep > 1 ? 's' : '') + ' à placer.'
      : 'Tu dépasses le budget de ' + (dep - B) + ' point' + (dep - B > 1 ? 's' : '') + '.';
  }
}

function motPluriel(n){
  const m = ['aucun','Un','Deux','Trois','Quatre','Cinq','Six','Sept','Huit','Neuf','Dix','Onze','Douze'];
  return m[n] || String(n);
}

/* une carte d'adversaire, commune a la rencontre et a l'apercu de l'editeur */
function carteAdv(c, opts){
  opts = opts || {};
  const st = statsDe(c), rg = RANG[c.r];
  const row = el('div','adv' + (opts.pv != null && opts.pv <= 0 ? ' ko' : ''));

  const rk = el('div','rk rk' + c.r);
  rk.append(el('div','rn', String(c.r)));
  rk.append(el('span','rl', rg.nom));
  row.append(rk);

  const b = el('div','body');
  const nm = el('div','nm', c.n || 'Sans nom');
  if(c.src === 'maison') nm.append(el('span','maison noprint', 'maison'));
  if(opts.fam){ const fs = famillesDe(c).map(f => f.l); if(fs.length) nm.append(el('span','fams', fs.join(' · '))); }
  b.append(nm);
  const info = el('div','st');
  info.append(document.createTextNode('Réduction '));
  info.append(el('b', null, String(st.red)));
  info.append(document.createTextNode(' · ' + st.cartes + ' carte' + (st.cartes > 1 ? 's' : '')));
  if(opts.pv == null) { info.append(document.createTextNode(' · ')); info.append(el('b', null, st.pv + ' PV')); }
  b.append(info);

  const atq = el('div','atq');
  const ligne = (ty, nom, portee, effet) => {
    const l = el('div','at');
    l.append(el('span','ty t' + ty.cls, ty.l));
    l.append(el('b', null, nom));
    l.append(el('span','po', portee));
    l.append(el('span','ef', effet));
    return l;
  };
  atq.append(ligne({cls:'phy', l:'physique'}, 'Attaque de rang', 'contact', st.deg));
  if(c.a2 && c.a2.n) atq.append(ligne(typeAttaque(c.a2), c.a2.n, porteeDe(c.a2), effetDe(c, st)));
  b.append(atq);

  if(c.p) b.append(el('div','pa', c.p));
  if(c.renf) b.append(el('div','rf', 'Renforts : ' + c.renf));
  row.append(b);
  return {row:row, body:b, stats:st};
}

function drawEnc(){
  const box = $('enc'); box.innerHTML = '';
  if(!S.liste.length){
    box.append(el('p','vide','Rien en face pour l’instant. Tire une rencontre, ou compose la tienne.'));
    return;
  }
  const dep = depense(), B = budget();
  const cartes = S.liste.reduce((a, x) => { const c = trouveId(x.cid); return a + (c ? statsDe(c).cartes : RANG[x.r].cartes); }, 0);
  box.append(el('div','eh', motPluriel(S.liste.length) + ' contre ' + (S.pj === 1 ? 'toi' : motPluriel(S.pj).toLowerCase() + ' personnages')));
  if(S.pourquoi) box.append(el('p','em', S.pourquoi));
  box.append(el('p','ec', dep + ' points sur les ' + B + ' du budget · ' + intensite().l.toLowerCase() +
    ' · ' + cartes + ' carte' + (cartes > 1 ? 's' : '') + ' à distribuer en face'));
  box.append(el('hr'));

  S.liste.forEach((a, i) => {
    const c = trouveId(a.cid) || {r:a.r, n:a.n, p:a.p, src:'livre'};
    const k = carteAdv(c, {pv:a.pv, fam:true});
    const st = k.stats;

    const pvb = el('div','pvbox');
    const mk = (lbl, n) => {
      const x = el('button', null, lbl); x.type = 'button';
      x.setAttribute('aria-label', lbl + ' PV à ' + c.n);
      x.disabled = (n < 0 && a.pv <= 0) || (n > 0 && a.pv >= st.pv);
      x.onclick = () => { a.pv = Math.max(0, Math.min(st.pv, a.pv + n)); draw(); };
      return x;
    };
    pvb.append(mk('−5', -5), mk('−1', -1));
    pvb.append(el('span','cur', String(a.pv)));
    pvb.append(el('span','max', '/ ' + st.pv));
    pvb.append(mk('+1', 1));

    /* choisir exactement qui c'est, dans le livre ou dans les tiennes */
    const sel = el('select','chg noprint');
    sel.setAttribute('aria-label', 'changer cet adversaire de rang ' + a.r);
    const gl = el('optgroup'); gl.label = 'Le livre';
    ADV.creatures[a.r].forEach(x => { const o = new Option(x.n, x.id); o.selected = x.id === a.cid; gl.append(o); });
    sel.append(gl);
    const miennes = MAISON.filter(x => x.r === a.r);
    if(miennes.length){
      const gm = el('optgroup'); gm.label = 'Les miennes';
      miennes.forEach(x => { const o = new Option(x.n, x.id); o.selected = x.id === a.cid; gm.append(o); });
      sel.append(gm);
    }
    sel.onchange = () => {
      const x = trouveId(sel.value);
      if(x) S.liste[i] = {r:a.r, n:x.n, p:x.p, pv:Math.min(a.pv, statsDe(x).pv), id:a.id, cid:x.id};
      draw();
    };
    k.body.append(sel);

    const re = el('button','re noprint','↻'); re.type = 'button';
    re.title = 'Retirer un autre adversaire de ce rang';
    re.setAttribute('aria-label','retirer un autre adversaire de rang ' + a.r);
    re.onclick = () => { S.liste[i] = creature(a.r); draw(); };
    pvb.append(re);
    k.row.append(pvb);

    box.append(k.row);
  });
}

function draw(){ drawSetup(); drawFam(); drawMix(); drawEnc(); drawBestiaire(); save(); }

/* ---------- actions ---------- */
$('roll').onclick = () => { tirerComposition(); draw(); };
$('tetes').onclick = () => {
  const neuf = [];
  S.liste.forEach(a => neuf.push(creature(a.r, neuf.filter(x => x.r === a.r).map(x => x.cid))));
  S.liste = neuf; draw();
};
$('motif').onclick = () => { S.pourquoi = pick(ADV.pourquoi); draw(); };
$('clear').onclick = () => { S.liste = []; S.pourquoi = ''; draw(); };
$('heal').onclick = () => { S.liste.forEach(a => { const c = trouveId(a.cid); a.pv = c ? statsDe(c).pv : RANG[a.r].pv; }); draw(); };
$('print').onclick = () => { document.body.classList.remove('imprime-bestiaire'); window.print(); };
$('copy').onclick = () => {
  const L = [];
  L.push(motPluriel(S.liste.length) + ' contre ' + S.pj + ' personnage' + (S.pj > 1 ? 's' : '') +
    ' · ' + depense() + '/' + budget() + ' points · ' + intensite().l.toLowerCase());
  if(S.pourquoi) L.push(S.pourquoi);
  L.push('');
  S.liste.forEach(a => {
    const c = trouveId(a.cid) || {r:a.r, n:a.n, p:a.p};
    const st = statsDe(c);
    const fs = famillesDe(c).map(f => f.l).join(', ');
    L.push('Rang ' + a.r + ' · ' + c.n + (fs ? ' (' + fs + ')' : '') + ' : ' + st.pv + ' PV, réduction ' + st.red + ', ' + st.cartes + ' carte' + (st.cartes > 1 ? 's' : ''));
    L.push('   physique · attaque de rang · contact · ' + st.deg);
    if(c.a2 && c.a2.n) L.push('   ' + typeAttaque(c.a2).l + ' · ' + c.a2.n + ' · ' + porteeDe(c.a2) + ' · ' + effetDe(c, st));
    if(c.p) L.push('   ' + c.p);
    if(c.renf) L.push('   Renforts : ' + c.renf);
  });
  navigator.clipboard.writeText(L.join('\n')).then(
    () => { $('copy').textContent = 'Copié'; setTimeout(() => { $('copy').textContent = 'Copier en texte'; }, 1400); },
    () => { $('copy').textContent = 'Copie refusée'; setTimeout(() => { $('copy').textContent = 'Copier en texte'; }, 1400); }
  );
};


/* ---------- la rencontre validée part dans la séance du Registre de la Table ----------
   Elle passe par ce navigateur : la table ouverte la prend tout de suite, sinon elle l'attend. */
const CLE_ENVOI = 'faelorenn.envoi.rencontre';
let ENVOI_ATTENTE = '';
function hacher(s){ let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
/* la même rencontre envoyée deux fois porte le même nom : la table ne la pose qu'une fois */
function paquetRencontre(){
  const sig = S.liste.map(a => a.id + ':' + a.cid).join(',') + '|' + S.pourquoi;
  return {id:'e' + hacher(sig), t:Date.now(), titre:'', pourquoi:S.pourquoi || '', adversaires:S.liste.map(adversaireEnvoye)};
}
function direEnvoi(t, ok, lien){
  const m = $('envoiMsg');
  m.innerHTML = '';
  m.append(document.createTextNode(t));
  if(lien){ m.append(document.createTextNode(' ')); const a = el('a', null, 'Ouvrir le Registre de la Table'); a.href = 'table.html'; m.append(a); }
  m.className = 'note noprint' + (ok ? ' ok' : '');
  m.hidden = false;
}
$('envoyer').onclick = () => {
  if(!S.liste.length){ direEnvoi('Rien en face pour l’instant : tire une rencontre, ou compose-la, d’abord.', false); return; }
  const o = paquetRencontre();
  try{ localStorage.setItem(CLE_ENVOI, JSON.stringify(o)); }
  catch(e){ direEnvoi('Ce navigateur refuse de la garder : recopie-la dans la table à la main, ou « Copier en texte ».', false); return; }
  ENVOI_ATTENTE = o.id;
  direEnvoi('Elle part dans la séance…', true);
  setTimeout(() => {
    let la = null;
    try{ la = localStorage.getItem(CLE_ENVOI); }catch(e){}
    if(ENVOI_ATTENTE === o.id && la) direEnvoi('Elle attend dans ce navigateur : ouvre le Registre de la Table, elle se posera dans la séance en cours.', true, true);
  }, 1500);
};
window.addEventListener('storage', e => {
  if(e.key === CLE_ENVOI && !e.newValue && ENVOI_ATTENTE){
    ENVOI_ATTENTE = '';
    direEnvoi('Elle est dans la séance : le combat se suit dans le Registre de la Table.', true, true);
  }
});
