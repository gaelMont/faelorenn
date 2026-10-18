/* Le Livre de Faelorenn, à lire en ligne.
   La donnée du livre (const LIVRE) est posée juste au-dessus par la construction :
   une suite de blocs, {h:niveau, t:titre} pour un titre, {p:texte}, {li:texte},
   {tb:[[cellules]]} pour un tableau. Le gras et l'italique du Word sont écrits ** et *.
   Rien ne se sauve ici : la page ne fait que lire. */

const $ = id => document.getElementById(id);

/* ---------- le texte ---------- */

/* les quatre étoiles viennent d'un gras coupé en deux dans le Word : « **d****20** » */
const net = s => String(s == null ? '' : s).replace(/\*\*\*\*/g, '');

/* le gras, l'italique, et les deux repères de surlignage posés par la recherche */
const enrichir = s => echapperHtml(s)
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/\*([^*]+)\*/g, '<i>$1</i>')
  .replace(/\u0001/g, '<mark>')
  .replace(/\u0002/g, '</mark>');

/* la forme sous laquelle on cherche : sans accent, sans majuscule, apostrophe droite.
   On garde pour chaque caractère de la forme cherchable sa place dans le texte d'origine,
   pour pouvoir surligner au bon endroit. */
function aplatir(s) {
  let out = '';
  const pos = [];
  for (let i = 0; i < s.length; i++) {
    let c = s[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (c === '’' || c === '‘') c = "'";
    else if (c === 'œ') c = 'oe';
    else if (c === 'æ') c = 'ae';
    for (let k = 0; k < c.length; k++) pos.push(i);
    out += c;
  }
  pos.push(s.length);
  return { c: out, p: pos };
}
const cherchable = s => aplatir(s).c;

/* ---------- les blocs et le plan ---------- */

const BL = [];      /* les blocs nettoyés, dans l'ordre du livre */
const PLAN = [];    /* les livres : {id, t, i, ch:[{id, t, i, sous:[...]}]} */
const CHERCHE = { q: '', n: 0, par: {}, ch: '', ici: -1 };

function unId(t, vus) {
  let s = cherchable(net(t)).replace(/\*/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) s = 'section';
  if (vus[s] == null) { vus[s] = 1; return s; }
  vus[s]++;
  return s + '-' + vus[s];
}

function preparer() {
  const vus = {};
  LIVRE.forEach(b => {
    const x = {};
    if (b.h) { x.k = 'h'; x.n = b.h; x.t = net(b.t); x.id = unId(b.t, vus); }
    else if (b.tb) { x.k = 'tb'; x.tb = b.tb.map(r => r.map(net)); }
    else if (b.li != null) { x.k = 'li'; x.t = net(b.li); }
    else { x.k = 'p'; x.t = net(b.p); }
    x.plat = x.k === 'tb' ? x.tb.map(r => r.join(' ')).join(' ') : x.t;
    x.cle = cherchable(x.plat);
    BL.push(x);
  });
  /* le plan : un livre par titre de niveau 1 ; dans un livre, le plus petit niveau
     présent fait office de chapitre (le Livre VIII n'a que des titres de niveau 3) */
  let lv = null;
  BL.forEach((b, i) => {
    if (b.k !== 'h') return;
    if (b.n === 1) { lv = { id: b.id, t: b.t, i: i, h: [] }; PLAN.push(lv); return; }
    if (!lv) { lv = { id: '', t: 'Avant le premier livre', i: 0, h: [] }; PLAN.push(lv); }
    lv.h.push({ id: b.id, t: b.t, i: i, n: b.n });
  });
  PLAN.forEach(l => {
    const base = l.h.length ? Math.min.apply(null, l.h.map(x => x.n)) : 0;
    l.ch = [];
    l.h.forEach(x => {
      if (x.n === base) l.ch.push({ id: x.id, t: x.t, i: x.i, sous: [] });
      else if (l.ch.length) l.ch[l.ch.length - 1].sous.push({ id: x.id, t: x.t, i: x.i });
    });
  });
}

/* ---------- dessiner ---------- */

/* un morceau de texte, surligné là où la recherche tombe.
   Compte les trouvailles, et les range sous le chapitre en cours. */
function unTexte(s, q) {
  if (!q) return enrichir(s);
  const n = aplatir(s);
  const trous = [];
  let d = 0, i;
  while ((i = n.c.indexOf(q, d)) >= 0) { trous.push([n.p[i], n.p[i + q.length]]); d = i + q.length; }
  if (!trous.length) return enrichir(s);
  CHERCHE.n += trous.length;
  CHERCHE.par[CHERCHE.ch] = (CHERCHE.par[CHERCHE.ch] || 0) + trous.length;
  let out = s;
  for (let k = trous.length - 1; k >= 0; k--) {
    out = out.slice(0, trous[k][0]) + '\u0001' + out.slice(trous[k][0], trous[k][1]) + '\u0002' + out.slice(trous[k][1]);
  }
  return enrichir(out);
}

function uneTable(b, q) {
  const t = b.tb;
  if (!t.length) return '';
  const des = /^d\s*\d+$/.test(cherchable(t[0][0] || '')) || /^(rang|niveau|palier)$/.test(cherchable(t[0][0] || ''));
  const h = ['<div class="tbw"><table>'];
  h.push('<thead><tr>');
  t[0].forEach(c => h.push('<th>' + unTexte(c, q) + '</th>'));
  h.push('</tr></thead><tbody>');
  for (let i = 1; i < t.length; i++) {
    h.push('<tr>');
    t[i].forEach((c, j) => h.push('<td' + (j === 0 && des ? ' class="de"' : '') + '>' + unTexte(c, q) + '</td>'));
    h.push('</tr>');
  }
  h.push('</tbody></table></div>');
  return h.join('');
}

/* quel chapitre porte ce bloc : pour compter les trouvailles par chapitre */
const CHAP = [];
function rangerLesChapitres() {
  let cour = '';
  const parI = {};
  PLAN.forEach(l => { parI[l.i] = l.id; l.ch.forEach(c => { parI[c.i] = c.id; }); });
  BL.forEach((b, i) => { if (parI[i] != null) cour = parI[i]; CHAP[i] = cour; });
}

function dessinerTexte() {
  const q = CHERCHE.q;
  CHERCHE.n = 0; CHERCHE.par = {};
  const h = [];
  let ul = false;
  /* ce qui vient avant le premier titre est la page de garde du livre */
  let garde = BL.length > 0 && BL[0].k !== 'h';
  if (garde) h.push('<div class="lvgarde">');
  BL.forEach((b, i) => {
    CHERCHE.ch = CHAP[i] || '';
    if (b.k !== 'li' && ul) { h.push('</ul>'); ul = false; }
    if (garde && b.k === 'h') { h.push('</div>'); garde = false; }
    if (b.k === 'h') {
      const n = Math.min(b.n, 4);
      h.push('<h' + (n + 1) + ' id="' + b.id + '" class="t' + n + '">'
        + '<a class="anc" href="#' + b.id + '" title="Le lien de cette section">#</a>'
        + unTexte(b.t, q) + '</h' + (n + 1) + '>');
    } else if (b.k === 'p') {
      h.push('<p>' + unTexte(b.t, q) + '</p>');
    } else if (b.k === 'li') {
      if (!ul) { h.push('<ul>'); ul = true; }
      h.push('<li>' + unTexte(b.t, q) + '</li>');
    } else {
      h.push(uneTable(b, q));
    }
  });
  if (ul) h.push('</ul>');
  if (garde) h.push('</div>');
  $('lvTexte').innerHTML = h.join('\n');
  CHERCHE.ici = -1;
  majCompte();
  dessinerSommaire();
  mesurer();
}

function majCompte() {
  const n = CHERCHE.n, q = CHERCHE.q;
  const z = $('lvCompte');
  if (!q) { z.textContent = ''; $('lvPrec').disabled = true; $('lvSuiv').disabled = true; $('lvVider').hidden = true; return; }
  z.textContent = !n ? 'rien de tel dans le livre' : n === 1 ? 'un passage' : n + ' passages';
  z.className = 'note' + (n ? '' : ' err');
  $('lvPrec').disabled = n < 2; $('lvSuiv').disabled = !n; $('lvVider').hidden = false;
}

function dessinerSommaire() {
  const q = CHERCHE.q, cour = $('lvSom').dataset.ici || '';
  const h = [];
  PLAN.forEach(l => {
    const dedans = [l.id].concat(l.ch.map(c => c.id));
    const nl = dedans.reduce((a, id) => a + (CHERCHE.par[id] || 0), 0);
    const mort = q && !nl;
    h.push('<div class="slv' + (mort ? ' mort' : '') + '">');
    h.push('<a class="sl1' + (cour === l.id ? ' ici' : '') + '" href="#' + l.id + '">' + echapperHtml(l.t) + bulle(q, nl) + '</a>');
    l.ch.forEach(c => {
      const nc = (CHERCHE.par[c.id] || 0);
      const ouvert = cour === c.id || (q && nc);
      h.push('<a class="sl2' + (cour === c.id ? ' ici' : '') + (q && !nc ? ' mort' : '') + '" href="#' + c.id + '">' + echapperHtml(c.t) + bulle(q, nc) + '</a>');
      if (ouvert && c.sous.length) {
        h.push('<div class="sl3w">');
        c.sous.forEach(s => h.push('<a class="sl3" href="#' + s.id + '">' + echapperHtml(s.t) + '</a>'));
        h.push('</div>');
      }
    });
    h.push('</div>');
  });
  $('lvSom').innerHTML = h.join('');
}
const bulle = (q, n) => q && n ? '<span class="sbul">' + n + '</span>' : '';

/* ---------- où on en est dans la lecture ---------- */

let REPERES = [];
function mesurer() {
  REPERES = [];
  const haut = e => e.getBoundingClientRect().top + window.scrollY;
  PLAN.forEach(l => {
    const e = document.getElementById(l.id);
    if (e) REPERES.push({ id: l.id, y: haut(e) });
    l.ch.forEach(c => { const x = document.getElementById(c.id); if (x) REPERES.push({ id: c.id, y: haut(x) }); });
  });
  REPERES.sort((a, b) => a.y - b.y);
  suivreLaLecture();
}

function suivreLaLecture() {
  if (!REPERES.length) return;
  /* au bas de la page, c'est la dernière section qu'on lit : elle ne peut plus monter plus haut */
  if(window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4){
    const der = REPERES[REPERES.length - 1].id;
    const som0 = $('lvSom');
    if(som0.dataset.ici !== der){ som0.dataset.ici = der; dessinerSommaire(); }
    return;
  }
  const y = window.scrollY + 100;
  let id = REPERES[0].id;
  for (let i = 0; i < REPERES.length; i++) { if (REPERES[i].y <= y) id = REPERES[i].id; else break; }
  const som = $('lvSom');
  if (som.dataset.ici === id) return;
  som.dataset.ici = id;
  dessinerSommaire();
  const e = som.querySelector('.ici');
  if (e && som.scrollHeight > som.clientHeight + 4) {
    const h = e.offsetTop - som.offsetTop;
    if (h < som.scrollTop || h > som.scrollTop + som.clientHeight - 40) som.scrollTop = h - som.clientHeight / 2;
  }
}

/* ---------- sauter d'une trouvaille à l'autre ---------- */

function allerA(d) {
  const m = $('lvTexte').querySelectorAll('mark');
  if (!m.length) return;
  const av = CHERCHE.ici;
  if (av >= 0 && m[av]) m[av].classList.remove('ici');
  CHERCHE.ici = av < 0 ? (d > 0 ? 0 : m.length - 1) : (av + d + m.length) % m.length;
  const e = m[CHERCHE.ici];
  e.classList.add('ici');
  e.scrollIntoView({ block: 'center', behavior: 'smooth' });
  $('lvOu').textContent = (CHERCHE.ici + 1) + ' sur ' + m.length;
}

let minuteur = 0;
function chercherPlusTard() {
  clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    const v = cherchable(($('lvQ').value || '').replace(/\*/g, '').trim());
    if (v === CHERCHE.q) return;
    CHERCHE.q = v.length < 2 ? '' : v;
    $('lvOu').textContent = '';
    dessinerTexte();
    if (CHERCHE.q && CHERCHE.n) allerA(1);
  }, 150);
}

/* ---------- l'ouverture ---------- */

function auDepart() {
  const h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if (h.indexOf('q=') === 0) { $('lvQ').value = h.slice(2); chercherPlusTard(); return; }
  if (h && document.getElementById(h)) document.getElementById(h).scrollIntoView();
}

function brancher() {
  /* sur un écran large le sommaire est ouvert à côté du texte ; sur un téléphone, replié */
  const d = $('lvTiroir');
  if (d) d.open = window.innerWidth >= 900;
  $('lvQ').oninput = chercherPlusTard;
  $('lvQ').onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); allerA(e.shiftKey ? -1 : 1); }
    if (e.key === 'Escape') { $('lvQ').value = ''; chercherPlusTard(); }
  };
  $('lvSuiv').onclick = () => allerA(1);
  $('lvPrec').onclick = () => allerA(-1);
  $('lvVider').onclick = () => { $('lvQ').value = ''; $('lvQ').focus(); chercherPlusTard(); };
  $('lvSom').onclick = e => {
    const a = e.target.closest('a');
    if (!a) return;
    const id = decodeURIComponent((a.getAttribute('href') || '').replace(/^#/, ''));
    const z = document.getElementById(id);
    if (!z) return;
    e.preventDefault();
    z.scrollIntoView({ behavior: 'smooth' });
    history.replaceState(null, '', '#' + id);
    if (d && window.innerWidth < 900) d.open = false;
  };
  $('lvHaut').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  let t = 0;
  window.addEventListener('scroll', () => {
    $('lvHaut').hidden = window.scrollY < 500;
    if (t) return;
    t = setTimeout(() => { t = 0; suivreLaLecture(); }, 120);
  }, { passive: true });
  $('lvHaut').hidden = window.scrollY < 500;
  window.addEventListener('resize', () => { clearTimeout(minuteur); minuteur = setTimeout(mesurer, 200); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== $('lvQ')) { e.preventDefault(); $('lvQ').focus(); $('lvQ').select(); }
  });
}

preparer();
rangerLesChapitres();
dessinerTexte();
brancher();
auDepart();
