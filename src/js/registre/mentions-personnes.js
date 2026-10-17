/* ============ « /Nahya » : parler de quelqu'un dans un texte ============
   Dans le récit, un paragraphe qu'on retouche, ce qu'on sait d'un PNJ ou ce qu'est un personnage :
   « / » puis un nom ouvre la liste des personnages et des PNJ. Le nom reste écrit « /Nahya » dans le texte,
   s'affiche comme un lien vers sa fiche, et la fiche regroupe tout ce qu'on a écrit sur lui.
   Un nom qui n'existe pas encore peut recevoir sa fiche depuis la liste. */

/* les noms qu'on peut citer, du plus long au plus court : « Garde du pont » passe avant « Garde ».
   avant : {ref, nom}, pour lire les textes comme avant un changement de nom */
function gensCitables(avant){
  let l = tousLesGens().filter(x => x);
  if(avant){
    if(l.some(x => x.ref === avant.ref)) l = l.map(x => x.ref === avant.ref ? Object.assign({}, x, {nom:avant.nom}) : x);
    else l.push({ref:avant.ref, nom:avant.nom, pj:/^pj:/.test(avant.ref)});
  }
  return l.filter(x => x.nom && x.nom.trim()).map(x => ({ref:x.ref, nom:x.nom.trim(), pj:x.pj}))
    .sort((a, b) => b.nom.length - a.nom.length);
}
const normeNom = s => String(s || '').toLowerCase().replace(/[’`´ʼ]/g, '\'');
const lettreOuChiffre = ch => !!ch && /[\p{L}\p{N}]/u.test(ch);
/* une barre qui ouvre une citation : en début de texte ou après autre chose qu'une lettre, un chiffre, « : » ou « / » */
const barreOuvrante = (t, i) => i === 0 || !/[\p{L}\p{N}:\/]/u.test(t[i - 1]);

/* les « /Nom » d'un texte qui désignent quelqu'un : position de la barre, longueur (barre comprise), qui */
function trouverMentions(txt, gens){
  const out = [], t = String(txt || '');
  if(t.indexOf('/') < 0) return out;
  gens = gens || gensCitables();
  let i = t.indexOf('/');
  while(i >= 0){
    let pas = 1;
    if(barreOuvrante(t, i)){
      const suite = t.slice(i + 1, i + 1 + 90);
      const g = gens.find(x => normeNom(suite.slice(0, x.nom.length)) === normeNom(x.nom) && !lettreOuChiffre(suite.charAt(x.nom.length)));
      if(g){ out.push({i:i, n:g.nom.length + 1, ref:g.ref, nom:g.nom, pj:g.pj}); pas = g.nom.length + 1; }
    }
    i = t.indexOf('/', i + pas);
  }
  return out;
}
/* les barres qui marquent quelqu'un : devant un nom qui a sa fiche, ou devant un nom propre qui n'en a pas
   (encore). « et /ou », « 1/2 » ou un chemin gardent la leur */
function barresDeMarque(t, gens){
  const pos = new Set();
  if(t.indexOf('/') < 0) return pos;
  trouverMentions(t, gens).forEach(m => pos.add(m.i));
  for(let i = t.indexOf('/'); i >= 0; i = t.indexOf('/', i + 1))
    if(!pos.has(i) && barreOuvrante(t, i) && /\p{Lu}/u.test(t.charAt(i + 1))) pos.add(i);
  return pos;
}
/* le texte tel qu'on le lit ou qu'on le copie : sans la barre devant les noms */
function sansMarques(txt, gens){
  const t = String(txt == null ? '' : txt);
  const pos = barresDeMarque(t, gens);
  if(!pos.size) return t;
  let out = '';
  for(let i = 0; i < t.length; i++) if(!pos.has(i)) out += t[i];
  return out;
}

/* un nom cité, dans un texte affiché : un lien vers sa fiche. lui : c'est la fiche qu'on regarde */
function boutonMention(t, m, lui){
  const b = el('button','mention' + (lui ? ' lui' : ''), t.substr(m.i + 1, m.n - 1)); b.type = 'button';
  b.title = 'La fiche de ' + m.nom;
  b.onclick = ev => { ev.stopPropagation(); ouvrirFiche(m.ref); };
  return b;
}
/* le texte affiché : chaque nom cité devient un lien vers sa fiche */
function texteRiche(txt, gens){
  const f = document.createDocumentFragment(), t = String(txt == null ? '' : txt);
  gens = gens || gensCitables();
  const pos = barresDeMarque(t, gens);
  const morceau = (a, b) => { let s = ''; for(let i = a; i < b; i++) if(!pos.has(i)) s += t[i]; return s; };
  let k = 0;
  trouverMentions(t, gens).forEach(m => {
    if(m.i > k) f.append(document.createTextNode(morceau(k, m.i)));
    f.append(boutonMention(t, m));
    k = m.i + m.n;
  });
  if(k < t.length) f.append(document.createTextNode(morceau(k, t.length)));
  return f;
}
/* sur la fiche en grand : ses citations en gras, son nom écrit sans barre surligné */
function texteSurligne(txt, ref, gens){
  const f = document.createDocumentFragment(), t = String(txt == null ? '' : txt);
  gens = gens || gensCitables();
  const pos = barresDeMarque(t, gens);
  const ms = trouverMentions(t, gens);
  const bouts = ms.map(m => ({a:m.i, b:m.i + m.n, m:m}));
  const ch = chercheNom(ref, gens);
  if(ch.re){
    const s = ch.nettoye(t, ms, true);
    ch.re.lastIndex = 0;
    let x;
    while((x = ch.re.exec(s)) !== null){
      const a = x.index + x[1].length, b = x.index + x[0].length;
      if(b > a) bouts.push({a:a, b:b});
      if(!x[0].length) ch.re.lastIndex++;
    }
  }
  bouts.sort((x, y) => x.a - y.a);
  const morceau = (a, b) => { let s = ''; for(let i = a; i < b; i++) if(!pos.has(i)) s += t[i]; return s; };
  let k = 0;
  bouts.forEach(x => {
    if(x.a < k) return;
    if(x.a > k) f.append(document.createTextNode(morceau(k, x.a)));
    f.append(x.m ? boutonMention(t, x.m, x.m.ref === ref) : el('mark','nomici', t.slice(x.a, x.b)));
    k = x.b;
  });
  if(k < t.length) f.append(document.createTextNode(morceau(k, t.length)));
  return f;
}
/* la fiche de quelqu'un, en grand : dans le Registre des Visages, avec tout ce qu'on a écrit sur lui */
function ouvrirFiche(ref){
  if(!quiRef(ref)) return;
  if(!$('pnjGrand')){ ouvrirPage('pnj.html#grand=' + encodeURIComponent(ref), ONGLET_VISAGES); return; }
  ouvrirGrand(ref);
}

/* ---------- la liste qui s'ouvre sous le texte ---------- */
/* nav : on a bougé dans la liste avec les flèches ; taire : le texte change parce qu'on vient de citer */
const MENT = {z:null, debut:-1, q:'', liste:[], i:0, boite:null, nav:false, taire:false};
/* sansFiche : on n'y cite que ceux qui ont déjà une fiche (l'annonce d'une mission : ses visages naissent au départ) */
function brancherMentions(z, opts){
  if(!z || z._mentions) return;
  z._mentions = true;
  z._sansFiche = !!(opts && opts.sansFiche);
  z.addEventListener('input', () => { if(!MENT.taire) majMentions(z); });
  z.addEventListener('click', () => majMentions(z));
  z.addEventListener('keydown', ev => clavierMentions(z, ev), true);
  z.addEventListener('blur', () => setTimeout(() => { if(MENT.z === z && document.activeElement !== z) fermerMentions(); }, 150));
}
const mentionOuverte = z => !!(MENT.z && MENT.z === z && MENT.liste.length && MENT.boite && MENT.boite.isConnected);
/* ce qu'on est en train de taper après une barre, tant que ce n'est pas déjà un nom complet suivi d'autre chose */
function requeteMention(z, gens){
  const pos = z.selectionStart;
  if(pos == null || pos !== z.selectionEnd) return null;
  const avant = z.value.slice(0, pos), i = avant.lastIndexOf('/');
  if(i < 0 || !barreOuvrante(avant, i)) return null;
  const q = avant.slice(i + 1);
  if(q.length > 32 || /[\n,.;:!?«»()"\/]/.test(q) || q.split(' ').length > 4 || /^\s/.test(q)) return null;
  /* « /Ohan dit » : le nom est écrit, la phrase continue. « /Garde d » peut encore devenir « /Garde du pont » */
  const qn = normeNom(q);
  const fini = gens.some(g => q.length > g.nom.length && normeNom(q.slice(0, g.nom.length)) === normeNom(g.nom) && !lettreOuChiffre(q.charAt(g.nom.length)))
    && !gens.some(g => g.nom.length > q.length && normeNom(g.nom).indexOf(qn) === 0);
  return fini ? null : {debut:i, q:q};
}
function majMentionsGens(z){
  const gens = gensCitables();
  const r = requeteMention(z, gens);
  if(!r){ if(MENT.z === z) fermerMentions(); return; }
  const qn = normeNom(r.q).trim();
  const note = g => {
    const n = normeNom(g.nom);
    if(!qn) return g.pj ? 0 : 1;
    if(n === qn) return -1;
    if(n.indexOf(qn) === 0) return 0;
    if(n.split(/[\s'’-]+/).some(m => m.indexOf(qn) === 0)) return 1;
    if(n.indexOf(qn) >= 0) return 2;
    /* « ohen » pour Ohan : une lettre sur quatre au plus */
    return qn.length >= 3 && distanceNoms(cleSimple(qn), cleSimple(n)) <= Math.max(1, Math.floor(qn.length / 4)) ? 3 : 9;
  };
  const l = gens.map(g => ({g:g, n:note(g)})).filter(x => x.n < 9)
    .sort((a, b) => (a.n - b.n) || a.g.nom.localeCompare(b.g.nom, 'fr')).slice(0, 7).map(x => ({g:x.g}));
  const exact = gens.some(g => normeNom(g.nom) === qn);
  if(r.q.trim().length >= 2 && !exact && !z._sansFiche) l.push({nouveau:r.q.trim()});
  if(!l.length){ fermerMentions(); return; }
  if(MENT.z !== z || MENT.q !== r.q){ MENT.i = 0; MENT.nav = false; }
  MENT.z = z; MENT.debut = r.debut; MENT.q = r.q; MENT.liste = l;
  MENT.i = Math.min(MENT.i, l.length - 1);
  dessinerMentions();
}
function dessinerMentions(){
  const z = MENT.z; if(!z) return;
  let b = MENT.boite;
  if(!b){ b = el('div','mentions'); b.setAttribute('role', 'listbox'); b.setAttribute('aria-label', 'Qui citer'); MENT.boite = b; }
  if(b.previousElementSibling !== z) z.insertAdjacentElement('afterend', b);
  b.innerHTML = '';
  b.id = (z.id || 'texte') + '-mentions';
  z.setAttribute('aria-controls', b.id);
  MENT.liste.forEach((x, i) => {
    const o = el('button', i === MENT.i ? 'actif' : null); o.type = 'button';
    o.setAttribute('role', 'option'); o.setAttribute('aria-selected', i === MENT.i ? 'true' : 'false');
    if(x.nouveau){ o.append(el('span','mn', 'Nouvelle fiche « ' + x.nouveau + ' »')); o.classList.add('neuve'); }
    else o.append(el('span','mn', x.g.nom), el('span','mq', x.g.pj ? 'personnage' : 'PNJ'));
    o.onmousedown = ev => { ev.preventDefault(); choisirMention(i); };
    b.append(o);
  });
  const x = MENT.liste[MENT.i];
  const aide = el('p','maide', x && x.nouveau && !MENT.nav ? 'Flèche puis Entrée : créer sa fiche · Échap : fermer'
    : 'Entrée ou Tab : citer · Échap : fermer');
  b.append(aide);
}
function fermerMentions(){
  if(MENT.boite) MENT.boite.remove();
  if(MENT.z) MENT.z.removeAttribute('aria-controls');
  MENT.z = null; MENT.liste = []; MENT.i = 0; MENT.debut = -1; MENT.q = ''; MENT.nav = false;
}
/* le nom déjà écrit en entier : Entrée ne cite pas une deuxième fois, elle fait ce qu'elle fait d'habitude
   (envoyer le paragraphe, aller à la ligne). Une nouvelle fiche ne se crée qu'en la choisissant exprès */
function clavierMentions(z, ev){
  if(!mentionOuverte(z)) return;
  const k = ev.key;
  if(k === 'ArrowDown' || k === 'ArrowUp'){
    MENT.i = (MENT.i + (k === 'ArrowDown' ? 1 : -1) + MENT.liste.length) % MENT.liste.length;
    MENT.nav = true;
    dessinerMentions();
  } else if(k === 'Enter' || k === 'Tab'){
    const x = MENT.liste[MENT.i];
    if(x && x.nouveau && !MENT.nav){ fermerMentions(); return; }
    if(k === 'Enter' && x && x.g && !MENT.nav && normeNom(x.g.nom) === normeNom(MENT.q).trim()){
      const q = MENT.q.replace(/\s+$/, ''), d = MENT.debut;
      if(q !== x.g.nom && z.value.substr(d + 1, q.length) === q){
        const c = z.selectionStart - q.length + x.g.nom.length;
        z.value = z.value.slice(0, d + 1) + x.g.nom + z.value.slice(d + 1 + q.length);
        z.setSelectionRange(c, c);
        fermerMentions();
        MENT.taire = true;
        try{ z.dispatchEvent(new Event('input', {bubbles:true})); } finally { MENT.taire = false; }
        return;
      }
      fermerMentions();
      return;
    }
    choisirMention(MENT.i);
  } else if(k === 'Escape'){
    fermerMentions();
  } else return;
  ev.preventDefault(); ev.stopImmediatePropagation();
}
/* on cite : le texte reçoit « /Nom », suivi d'une espace si rien ne le suit */
function choisirMention(i){
  const z = MENT.z, x = MENT.liste[i];
  if(!z || !x) return;
  const debut = MENT.debut, pos = z.selectionStart;
  let nom = '';
  if(x.nouveau){
    const p = creerFicheMention(x.nouveau);
    if(!p) return;
    nom = p.nom;
  } else nom = x.g.nom;
  const apres = z.value.slice(pos);
  const espace = /^[\s.,;:!?»)]/.test(apres) ? '' : ' ';
  z.value = z.value.slice(0, debut) + '/' + nom + espace + apres;
  const c = debut + 1 + nom.length + espace.length;
  fermerMentions();
  z.focus();
  z.setSelectionRange(c, c);
  /* le brouillon et l'aperçu suivent ; la liste, elle, ne se rouvre pas sur le nom qu'on vient d'écrire */
  MENT.taire = true;
  try{ z.dispatchEvent(new Event('input', {bubbles:true})); } finally { MENT.taire = false; }
}
function creerFicheMention(nom){
  const deja = pnjParNom(nom) || (refParNom(nom) ? quiRef(refParNom(nom)).o : null);
  if(deja) return deja;
  let p = null;
  changer(() => { p = creerPnj(nom, (seanceCourante() || {}).id || ''); });
  if(p) msgTable('Fiche de ' + p.nom + ' créée, dans le Registre des Visages. Complète-la quand tu veux.', true);
  return p;
}

/* ---------- un nom qui change : les textes qui le citaient suivent ----------
   On lit chaque texte comme avant le changement : seules les citations qui le désignaient, lui, changent.
   « /Garde du pont » reste à l'autre quand on renomme « Garde ». */
function renommerMentions(ref, ancien, nouveau){
  const a = String(ancien || '').trim(), n = String(nouveau || '').trim();
  if(!ref || !a || !n || a === n) return;
  const gens = gensCitables({ref:ref, nom:a});
  const r = t => {
    let s = String(t || '');
    const ms = trouverMentions(s, gens).filter(m => m.ref === ref);
    if(!ms.length) return null;
    for(let j = ms.length - 1; j >= 0; j--) s = s.slice(0, ms[j].i) + '/' + n + s.slice(ms[j].i + ms[j].n);
    return s;
  };
  Object.keys(T.blocs).forEach(k => { const b = T.blocs[k]; const t = b && !b.supprime ? r(b.texte) : null; if(t !== null) T.blocs[k] = Object.assign({}, b, {texte:t, maj:maintenant()}); });
  Object.keys(T.pnj).forEach(k => { const p = T.pnj[k]; const t = p && !p.supprime ? r(p.texte) : null; if(t !== null) T.pnj[k] = Object.assign({}, p, {texte:t, maj:maintenant()}); });
  Object.keys(T.personnages).forEach(k => { const c = T.personnages[k]; const t = c && !c.supprime ? r(c.texte) : null; if(t !== null){ c.texte = t; c.maj = maintenant(); } });
}
