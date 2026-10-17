/* ============ les lieux : « --Ferpré » dans un texte ============
   Un lieu, c'est au choix : un plan du Registre des Plans (un bâtiment, un village, une carte du monde),
   un lieu nommé sur une carte du monde, ou une fiche écrite ici pour ce qui n'a pas encore de plan.
   Les trois se citent de la même façon, deux tirets devant le nom, comme « /Nahya » cite quelqu'un. */

const ONGLET_PLANS = 'faelorenn-plans';
const LX_CLE = 'faelorenn.plans';
const LX_GENRES = [['b', 'batiments', 'bâtiment'], ['v', 'villages', 'village'], ['w', 'mondes', 'carte du monde']];
const LX_ID = /^[A-Za-z0-9_-]{1,40}$/;
const LX_MAX = 300;
let LX_BRUT = null, LX_LOCAUX = null;            /* le texte lu dans ce navigateur, et ce qu'on en a tiré */
let LX_DEPOT = null, LX_DEPOT_T = 0, LX_DEPOT_LIT = false;
let LIEU_OUVERT = '', LIEU_EDIT = '';

const lxVidePlans = () => ({b:{}, v:{}, w:{}});
const lxGenre = k => { const g = LX_GENRES.find(x => x[0] === k); return g ? g[2] : 'plan'; };

/* un fichier de plans (le stockage de ce navigateur, ou plans.json du dépôt) : on n'en garde que les noms */
function lxLirePlans(o){
  const out = lxVidePlans();
  if(!o || typeof o !== 'object') return out;
  LX_GENRES.forEach(([k, nom]) => {
    const src = o[nom];
    if(!src || typeof src !== 'object') return;
    let n = 0;
    Object.keys(src).forEach(id => {
      if(n >= LX_MAX || id === '__proto__' || !LX_ID.test(id)) return;
      const rec = src[id];
      if(!rec || typeof rec !== 'object') return;
      n++;
      const maj = +rec.maj || 0;
      if(rec.supprime || !rec.plan || typeof rec.plan !== 'object'){ out[k][id] = {maj:maj, del:true, nom:'', villes:[], bati:[], etages:[]}; return; }
      const p = rec.plan, villes = [], bati = [], etages = [];
      if(k === 'w' && Array.isArray(p.items)) p.items.forEach(it => {
        if(!it || it.t !== 'city' || typeof it.name !== 'string' || !it.name.trim()) return;
        if(!LX_ID.test(String(it.id || ''))) return;
        villes.push({id:String(it.id), nom:it.name.trim().slice(0, 90), lien:typeof it.link === 'string' ? it.link : ''});
      });
      /* les bâtisses d'un village qui ont leur plan : la table s'en sert pour choisir une carte de combat */
      if(k === 'v' && Array.isArray(p.items)) p.items.forEach(it => {
        if(!it || it.t !== 'bld' || !it.link || !LX_ID.test(String(it.link))) return;
        if(bati.length >= 200 || bati.some(x => x.lien === String(it.link))) return;
        bati.push({lien:String(it.link), nom:(typeof it.name === 'string' ? it.name.trim() : '').slice(0, 90)});
      });
      /* les étages d'un bâtiment : un seul part à la fois vers la table */
      if(k === 'b' && Array.isArray(p.floors)) p.floors.slice(0, 20).forEach((f, i) => {
        etages.push(String((f && f.name) || ('Étage ' + i)).trim().slice(0, 60));
      });
      out[k][id] = {maj:maj, nom:String(p.name || '').trim().slice(0, 120), villes:villes, bati:bati, etages:etages};
    });
  });
  return out;
}
/* ce navigateur : relu seulement quand le texte gardé a changé */
function lxPlansLocaux(){
  let brut = null;
  try{ brut = localStorage.getItem(LX_CLE); }catch(e){ brut = null; }
  if(LX_LOCAUX && brut === LX_BRUT) return LX_LOCAUX;
  LX_BRUT = brut;
  let o = null;
  try{ o = brut ? JSON.parse(brut) : null; }catch(e){ o = null; }
  LX_LOCAUX = lxLirePlans(o);
  return LX_LOCAUX;
}
/* le dépôt : plans.json, pour les plans dessinés sur un autre appareil. Au plus une lecture toutes les deux minutes */
function lxPlansDepot(){
  try{
    if(typeof ghcPret === 'function' && ghcPret() && !LX_DEPOT_LIT && Date.now() - LX_DEPOT_T > 120000){
      LX_DEPOT_LIT = true; LX_DEPOT_T = Date.now();
      ghcLireUnFichier(GHC_FICHIERS.plans).then(o => {
        LX_DEPOT_LIT = false;
        LX_DEPOT = lxLirePlans(o);
        if(MENT.z && MENT.lieu) majMentions(MENT.z);
        else if(vuePnj() === 'lieux' && $('pnjLieux')) dessinerLieux(true);
      }, () => { LX_DEPOT_LIT = false; });
    }
  }catch(e){}
  return LX_DEPOT;
}
/* les deux ensemble : pour chaque plan, le plus récent l'emporte, comme partout ailleurs */
function lxPlans(){
  const a = lxPlansLocaux(), b = lxPlansDepot(), out = lxVidePlans();
  LX_GENRES.forEach(([k]) => {
    const ids = {};
    Object.keys(a[k]).forEach(i => { ids[i] = 1; });
    if(b) Object.keys(b[k]).forEach(i => { ids[i] = 1; });
    Object.keys(ids).forEach(i => {
      const x = a[k][i], y = b ? b[k][i] : null;
      const g = !x ? y : !y ? x : (y.maj > x.maj ? y : x);
      if(g && !g.del && g.nom) out[k][i] = g;
    });
  });
  return out;
}

/* ---------- les fiches de lieu, dans la table ---------- */
function normLieu(o){
  o = o && typeof o === 'object' ? o : {};
  return {id:txtOu(o.id) || nouvelId('l'), maj:+o.maj || 0, supprime:!!o.supprime,
    nom:txtOu(o.nom).slice(0, 120), ou:txtOu(o.ou).slice(0, 160), texte:txtOu(o.texte),
    plan:txtOu(o.plan).slice(0, 90), seance:txtOu(o.seance), auteur:txtOu(o.auteur)};
}
function lieuxFiches(){
  return Object.keys(T.lieux).map(id => T.lieux[id])
    .filter(l => l && !l.supprime && String(l.nom || '').trim())
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}
function unLieu(id){ const l = T.lieux[id]; return l && !l.supprime ? l : null; }
function ficheLieuParNom(nom){ const n = cleNom(nom); return n ? lieuxFiches().find(l => cleNom(l.nom) === n) || null : null; }
function creerFicheLieu(nom){
  const deja = ficheLieuParNom(nom);
  if(deja) return deja;
  let l = null;
  changer(() => {
    l = normLieu({id:idLibre('l-' + slug(nom), T.lieux), maj:maintenant(), nom:String(nom).trim(),
      seance:(seanceCourante() || {}).id || '', auteur:MOI.joueur || ''});
    T.lieux[l.id] = l;
  });
  if(l) msgTable('Fiche du lieu ' + l.nom + ' créée : elle est dans le Registre des Visages, onglet « Les lieux ».', true);
  return l;
}

/* ---------- ce qu'un « --Nom » désigne ---------- */
function lieuRef(ref){
  ref = String(ref || '');
  if(ref.indexOf('lieu:') === 0){
    const l = unLieu(ref.slice(5));
    return l ? {ref:ref, nom:l.nom, quoi:'fiche', sorte:'fiche de lieu', o:l} : null;
  }
  if(ref.indexOf('plan:') === 0){
    const x = ref.slice(5), k = x.slice(0, 1), id = x.slice(2);
    const pl = lxPlans();
    return pl[k] && pl[k][id] ? {ref:ref, nom:pl[k][id].nom, quoi:'plan', sorte:lxGenre(k), k:k, id:id} : null;
  }
  if(ref.indexOf('ville:') === 0){
    const x = ref.slice(6), i = x.indexOf(':');
    if(i < 0) return null;
    const w = x.slice(0, i), c = x.slice(i + 1), pl = lxPlans();
    const m = pl.w[w], v = m ? m.villes.find(y => y.id === c) : null;
    return v ? {ref:ref, nom:v.nom, quoi:'ville', sorte:'sur ' + (m.nom || 'la carte'), carte:w, ville:c, lien:v.lien} : null;
  }
  return null;
}
/* tous les noms qu'on peut citer, le plus long d'abord : une fiche d'abord, puis les plans, puis les cartes */
function lieuxCitables(avant){
  const out = [], vus = {};
  const pousser = x => {
    const n = normeNom(x.nom || '').trim();
    if(!n || vus[n]) return;
    vus[n] = 1; out.push(x);
  };
  if(avant && avant.nom) pousser({ref:avant.ref, nom:String(avant.nom).trim(), sorte:'fiche de lieu'});
  lieuxFiches().forEach(l => { if(!avant || avant.ref !== 'lieu:' + l.id) pousser({ref:'lieu:' + l.id, nom:l.nom, sorte:'fiche de lieu'}); });
  const pl = lxPlans();
  LX_GENRES.forEach(([k, , mot]) => Object.keys(pl[k]).forEach(id => pousser({ref:'plan:' + k + ':' + id, nom:pl[k][id].nom, sorte:mot})));
  Object.keys(pl.w).forEach(w => pl.w[w].villes.forEach(v => pousser({ref:'ville:' + w + ':' + v.id, nom:v.nom, sorte:'sur ' + (pl.w[w].nom || 'la carte')})));
  return out.sort((a, b) => b.nom.length - a.nom.length);
}

/* ---------- les deux tirets dans un texte ---------- */
/* ils ouvrent un lieu au début du texte, ou après autre chose qu'une lettre, un chiffre, un tiret ou une barre */
const lxOuvrant = (t, i) => t.charAt(i) === '-' && t.charAt(i + 1) === '-' && t.charAt(i + 2) !== '-'
  && (i === 0 || !/[\p{L}\p{N}\-\/]/u.test(t.charAt(i - 1)));
function trouverLieux(txt, lx){
  const out = [], t = String(txt == null ? '' : txt);
  if(t.indexOf('--') < 0) return out;
  lx = lx || lieuxCitables();
  let i = t.indexOf('--');
  while(i >= 0){
    let pas = 2;
    if(lxOuvrant(t, i)){
      const suite = t.slice(i + 2, i + 2 + 130);
      const g = lx.find(x => normeNom(suite.slice(0, x.nom.length)) === normeNom(x.nom) && !lettreOuChiffre(suite.charAt(x.nom.length)));
      if(g){ out.push({i:i, n:g.nom.length + 2, ref:g.ref, nom:g.nom, lieu:true}); pas = g.nom.length + 2; }
    }
    i = t.indexOf('--', i + pas);
  }
  return out;
}
/* les tirets qu'on n'écrit pas : devant un lieu connu, ou devant un nom propre qui n'a pas encore sa fiche */
function tiretsDeMarque(t, pos, lx){
  if(String(t).indexOf('--') < 0) return;
  const pris = {};
  trouverLieux(t, lx).forEach(m => { pos.add(m.i); pos.add(m.i + 1); pris[m.i] = 1; });
  for(let i = t.indexOf('--'); i >= 0; i = t.indexOf('--', i + 1))
    if(!pris[i] && lxOuvrant(t, i) && /\p{Lu}/u.test(t.charAt(i + 2))){ pos.add(i); pos.add(i + 1); }
}

/* ---------- les textes affichés : « /Nahya » et « --Ferpré » y deviennent des liens ---------- */
function barresDeMarque(t, gens){
  const pos = new Set();
  t = String(t == null ? '' : t);
  if(t.indexOf('/') >= 0){
    trouverMentions(t, gens).forEach(m => pos.add(m.i));
    for(let i = t.indexOf('/'); i >= 0; i = t.indexOf('/', i + 1))
      if(!pos.has(i) && barreOuvrante(t, i) && /\p{Lu}/u.test(t.charAt(i + 1))) pos.add(i);
  }
  tiretsDeMarque(t, pos);
  return pos;
}
const marquesDuTexte = (t, gens) => trouverMentions(t, gens).concat(trouverLieux(t)).sort((a, b) => a.i - b.i);
function boutonLieu(t, m){
  const b = el('button', 'mention lieuref', t.substr(m.i + 2, m.n - 2)); b.type = 'button';
  const q = lieuRef(m.ref);
  b.title = !q ? m.nom : q.quoi === 'plan' ? 'Le plan : ' + q.nom + ' (' + q.sorte + ')'
    : q.quoi === 'ville' ? q.nom + ', ' + q.sorte : 'La fiche du lieu ' + q.nom;
  b.onclick = ev => { ev.stopPropagation(); ouvrirLieuRef(m.ref); };
  return b;
}
function texteRiche(txt, gens){
  const f = document.createDocumentFragment(), t = String(txt == null ? '' : txt);
  gens = gens || gensCitables();
  const pos = barresDeMarque(t, gens);
  const morceau = (a, b) => { let s = ''; for(let i = a; i < b; i++) if(!pos.has(i)) s += t[i]; return s; };
  let k = 0;
  marquesDuTexte(t, gens).forEach(m => {
    if(m.i < k) return;
    if(m.i > k) f.append(document.createTextNode(morceau(k, m.i)));
    f.append(m.lieu ? boutonLieu(t, m) : boutonMention(t, m));
    k = m.i + m.n;
  });
  if(k < t.length) f.append(document.createTextNode(morceau(k, t.length)));
  return f;
}
function texteSurligne(txt, ref, gens){
  const f = document.createDocumentFragment(), t = String(txt == null ? '' : txt);
  gens = gens || gensCitables();
  const pos = barresDeMarque(t, gens);
  const ms = trouverMentions(t, gens);
  const bouts = ms.map(m => ({a:m.i, b:m.i + m.n, m:m}))
    .concat(trouverLieux(t).map(m => ({a:m.i, b:m.i + m.n, m:m})));
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
    f.append(x.m ? (x.m.lieu ? boutonLieu(t, x.m) : boutonMention(t, x.m, x.m.ref === ref)) : el('mark','nomici', t.slice(x.a, x.b)));
    k = x.b;
  });
  if(k < t.length) f.append(document.createTextNode(morceau(k, t.length)));
  return f;
}

/* ---------- ouvrir ce qu'on a cité ---------- */
function ouvrirLieuRef(ref){
  const q = lieuRef(ref);
  if(!q) return;
  if(q.quoi === 'plan'){ ouvrirPage('plans.html#plan=' + encodeURIComponent(q.k + ':' + q.id), ONGLET_PLANS); return; }
  if(q.quoi === 'ville'){ ouvrirPage('plans.html#lieu=' + encodeURIComponent(q.carte + ':' + q.ville), ONGLET_PLANS); return; }
  ouvrirFicheLieu(q.o.id);
}
function ouvrirFicheLieu(id){
  if(!unLieu(id)) return;
  if(!$('pnjLieux')){ ouvrirPage('pnj.html#lieu=' + encodeURIComponent(id), ONGLET_VISAGES); return; }
  MOI.vuePnj = 'lieux'; sauverLocal();
  LIEU_OUVERT = id;
  dessinerPnj(true);
  const c = document.querySelector('[data-lieu="' + id + '"]');
  if(c) c.scrollIntoView({block:'start', behavior:'smooth'});
}
/* le plan d'un lieu : celui que sa fiche désigne, sinon celui qui porte le même nom */
function planDuLieu(l){
  const pl = lxPlans();
  const lu = r => {
    if(!r) return null;
    if(r.indexOf('ville:') === 0) return lieuRef(r);
    const k = r.slice(0, 1), id = r.slice(2);
    return pl[k] && pl[k][id] ? lieuRef('plan:' + k + ':' + id) : null;
  };
  const q = lu(l.plan);
  if(q) return q;
  const n = cleNom(l.nom);
  for(const [k] of LX_GENRES){
    const id = Object.keys(pl[k]).find(i => cleNom(pl[k][i].nom) === n);
    if(id) return lieuRef('plan:' + k + ':' + id);
  }
  for(const w of Object.keys(pl.w)){
    const v = pl.w[w].villes.find(y => cleNom(y.nom) === n);
    if(v) return lieuRef('ville:' + w + ':' + v.id);
  }
  return null;
}

/* ---------- un nom de lieu qui change : les textes qui le citaient suivent ---------- */
function renommerLieux(ref, ancien, nouveau){
  const a = String(ancien || '').trim(), n = String(nouveau || '').trim();
  if(!ref || !a || !n || a === n) return;
  const lx = lieuxCitables({ref:ref, nom:a});
  const r = t => {
    let s = String(t || '');
    const ms = trouverLieux(s, lx).filter(m => m.ref === ref);
    if(!ms.length) return null;
    for(let j = ms.length - 1; j >= 0; j--) s = s.slice(0, ms[j].i) + '--' + n + s.slice(ms[j].i + ms[j].n);
    return s;
  };
  Object.keys(T.blocs).forEach(k => { const b = T.blocs[k]; const t = b && !b.supprime ? r(b.texte) : null; if(t !== null) T.blocs[k] = Object.assign({}, b, {texte:t, maj:maintenant()}); });
  Object.keys(T.pnj).forEach(k => { const p = T.pnj[k]; const t = p && !p.supprime ? r(p.texte) : null; if(t !== null) T.pnj[k] = Object.assign({}, p, {texte:t, maj:maintenant()}); });
  Object.keys(T.lieux).forEach(k => { const x = T.lieux[k]; const t = x && !x.supprime ? r(x.texte) : null; if(t !== null) T.lieux[k] = Object.assign({}, x, {texte:t, maj:maintenant()}); });
  Object.keys(T.personnages).forEach(k => { const c = T.personnages[k]; const t = c && !c.supprime ? r(c.texte) : null; if(t !== null){ c.texte = t; c.maj = maintenant(); } });
}

/* ---------- ce qui s'y est passé ---------- */
function textesDuLieu(ref){
  const lx = lieuxCitables(), out = [];
  const q = lieuRef(ref), nom = q ? cleNom(q.nom) : '';
  Object.keys(T.blocs).forEach(id => {
    const b = T.blocs[id];
    if(!b || b.supprime || b.type === 'rencontre') return;
    const e = T.journal[b.seance];
    if(!e || e.supprime) return;
    if(trouverLieux(b.texte, lx).some(m => m.ref === ref)) out.push({b:b, e:e});
  });
  const num = e => parseFloat(e.seance) || 0;
  const ordre = {}; campagnes().forEach((c, i) => { ordre[c.id] = i; });
  const camp = e => ordre[idCampagneDe(e)] || 0;
  out.sort((x, y) => (camp(x.e) - camp(y.e)) || (num(x.e) - num(y.e)) || (x.b.ordre - y.b.ordre) || (x.b.id < y.b.id ? -1 : 1));
  /* les séances qui se passent là : « Où êtes-vous ? », sur la séance même */
  const seances = nom ? Object.keys(T.journal).map(k => T.journal[k]).filter(e => e && !e.supprime && cleNom(e.lieu || '') === nom) : [];
  return {blocs:out, seances:seances};
}

/* ---------- la liste des lieux, dans le Registre des Visages ---------- */
function majOutilsPnj(){
  [['pnjVueFiches','fiches'], ['pnjVueReseau','reseau'], ['pnjVueHistoire','histoire'], ['pnjVueLieux','lieux']].forEach(([id, v]) => {
    if($(id)) $(id).setAttribute('aria-pressed', vuePnj() === v ? 'true' : 'false');
  });
  const s = $('pnjGroupe');
  if(document.activeElement !== s){
    const gs = groupes();
    s.innerHTML = '';
    s.add(new Option('Tous les groupes', ''));
    gs.forEach(g => s.add(new Option(g, g)));
    if(PNJ_FILTRE.groupe && gs.indexOf(PNJ_FILTRE.groupe) < 0) PNJ_FILTRE.groupe = '';
    s.value = PNJ_FILTRE.groupe;
  }
  const v = vuePnj();
  const n = v === 'lieux' ? lieuxFiches().length : pnjs().length;
  $('pnjCompte').textContent = !n ? '' : v === 'lieux' ? n + ' fiche' + (n > 1 ? 's' : '') + ' de lieu' : n + ' fiche' + (n > 1 ? 's' : '');
  $('pnjOutilsListe').hidden = v === 'reseau';
  $('pnjGroupe').hidden = v === 'histoire' || v === 'lieux';
  if($('pnjNouveau')) $('pnjNouveau').textContent = v === 'lieux' ? '+ Nouveau lieu' : '+ Nouvelle fiche';
}
function dessinerPnj(force){
  if(!$('pnjListe')) return;
  majOutilsPnj();
  const v = vuePnj();
  $('pnjListe').hidden = v !== 'fiches';
  $('pnjReseau').hidden = v !== 'reseau';
  if($('pnjHistoire')) $('pnjHistoire').hidden = v !== 'histoire';
  if($('pnjLieux')) $('pnjLieux').hidden = v !== 'lieux';
  if(v === 'fiches') dessinerListePnj(force);
  else if(v === 'reseau') dessinerReseau(force);
  else if(v === 'lieux') dessinerLieux(force);
  else dessinerHistoire(force);
}
function nouveauLieu(){
  let l = null;
  changer(() => {
    l = normLieu({id:idLibre('l-lieu', T.lieux), maj:maintenant(), nom:'Nouveau lieu',
      seance:(seanceCourante() || {}).id || '', auteur:MOI.joueur || ''});
    T.lieux[l.id] = l;
  });
  if(!l) return;
  MOI.vuePnj = 'lieux'; PNJ_FILTRE.q = '';
  if($('pnjCherche')) $('pnjCherche').value = '';
  sauverLocal();
  LIEU_EDIT = l.id; LIEU_OUVERT = l.id;
  dessinerPnj(true);
  const c = document.querySelector('[data-lieu="' + l.id + '"]');
  if(c) c.scrollIntoView({block:'start', behavior:'smooth'});
}
function dessinerLieux(force){
  const box = $('pnjLieux');
  if(!box) return;
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerLieux(true)); return; }
  box.innerHTML = '';
  box.append(el('p','mini','Dans un compte rendu, sur une fiche, écris deux tirets devant un nom de lieu (« --Ferpré ») : la liste s’ouvre, et le nom devient un lien. Un lieu qui a son plan ouvre le Registre des Plans ; les autres ont leur fiche ici.'));
  const tous = lieuxFiches();
  const q = normeNom(String(PNJ_FILTRE.q || '').trim());
  const l = q ? tous.filter(x => normeNom(x.nom).indexOf(q) >= 0 || normeNom(x.ou).indexOf(q) >= 0) : tous;
  if(!tous.length) box.append(el('p','vide','Aucune fiche de lieu pour l’instant. Cite un lieu dans une séance, ou crée-la ici.'));
  else if(!l.length) box.append(el('p','vide','Aucun lieu ne répond à cette recherche.'));
  else l.forEach(x => box.append(carteLieu(x)));
  box.append(blocPlansConnus());
}
function carteLieu(l){
  const w = el('div','pcarte ncarte');
  w.setAttribute('data-lieu', l.id);
  const t = el('div','ntete');
  t.append(el('div','pnom', l.nom || 'Sans nom'));
  const p = planDuLieu(l);
  if(p) t.append(el('span','att att-inconnu', p.sorte));
  w.append(t);
  w.append(el('div','pqui', l.ou || 'on ne sait pas encore où c’est'));
  if(LIEU_EDIT === l.id){ w.append(editeurLieu(l)); return w; }
  if(l.texte && l.texte.trim()){ const x = el('div','gsait'); x.append(texteRiche(l.texte)); w.append(x); }
  const ce = textesDuLieu('lieu:' + l.id);
  const n = ce.blocs.length, ns = ce.seances.length;
  const dit = [];
  if(n) dit.push(n + ' paragraphe' + (n > 1 ? 's' : ''));
  if(ns) dit.push(ns + ' séance' + (ns > 1 ? 's' : '') + ' s’y passe' + (ns > 1 ? 'nt' : ''));
  if(dit.length) w.append(el('div','mini', dit.join(' · ')));
  if(n){
    const liste = el('div','textes');
    ce.blocs.slice(-5).forEach(x => {
      const li = el('div','mini');
      const b = el('button','btn ghost xs', '↗'); b.type = 'button';
      b.title = 'Retrouver ce paragraphe dans la séance';
      b.onclick = () => ouvrirPage('table.html#bloc=' + encodeURIComponent(x.e.id) + '~' + encodeURIComponent(x.b.id), ONGLET_TABLE);
      li.append(document.createTextNode(etiquetteSeance(x.e) + ' : ' + extrait(sansMarques(x.b.texte), 150) + ' '), b);
      liste.append(li);
    });
    w.append(liste);
  }
  const a = el('div','acts');
  const bt = (txt, fn, cls) => { const b = el('button', cls || 'btn ghost xs', txt); b.type = 'button'; b.onclick = fn; a.append(b); return b; };
  if(p) bt(p.quoi === 'ville' ? 'Le montrer sur la carte' : 'Ouvrir son plan', () => ouvrirLieuRef(p.ref));
  else bt('Lui faire un plan', () => ouvrirPage('plans.html#neuf=' + encodeURIComponent('v:' + l.nom), ONGLET_PLANS));
  bt('Modifier', () => { LIEU_EDIT = l.id; dessinerLieux(true); });
  const sup = bt('Supprimer', () => {
    if(sup.dataset.arme !== '1'){ sup.dataset.arme = '1'; sup.textContent = 'Sûr ?'; sup.classList.add('danger'); setTimeout(() => { if(sup.isConnected){ sup.dataset.arme = ''; sup.textContent = 'Supprimer'; sup.classList.remove('danger'); } }, 4000); return; }
    changer(() => { T.lieux[l.id] = Object.assign({}, l, {supprime:true, maj:maintenant()}); });
    dessinerLieux(true);
  });
  w.append(a);
  return w;
}
function editeurLieu(l){
  const f = el('div','lxedit');
  const ligne = (lab, val, max, aire) => {
    const r = el('div','row');
    r.append(el('label', null, lab));
    const i = aire ? el('textarea') : el('input');
    if(!aire) i.type = 'text';
    i.value = val || '';
    i.maxLength = max;
    if(aire){ i.rows = 3; brancherMentions(i); }
    r.append(i);
    f.append(r);
    return i;
  };
  const nom = ligne('Son nom', l.nom, 120, false);
  const ou = ligne('Où c’est', l.ou, 160, false);
  const txt = ligne('Ce qu’on en sait', l.texte, 4000, true);
  const a = el('div','acts');
  const ok = el('button','btn primary xs','Garder'); ok.type = 'button';
  ok.onclick = () => {
    const n = nom.value.trim();
    if(!n){ msgTable('Un lieu a besoin d’un nom.'); return; }
    const avant = l.nom;
    changer(() => {
      T.lieux[l.id] = Object.assign({}, l, {nom:n, ou:ou.value.trim(), texte:txt.value, maj:maintenant()});
      if(avant && avant !== n) renommerLieux('lieu:' + l.id, avant, n);
    });
    LIEU_EDIT = '';
    dessinerLieux(true);
  };
  const non = el('button','btn ghost xs','Laisser'); non.type = 'button';
  non.onclick = () => { LIEU_EDIT = ''; dessinerLieux(true); };
  a.append(ok, non);
  f.append(a);
  return f;
}
/* ce que le Registre des Plans porte : de quoi savoir ce qu'on peut citer */
function blocPlansConnus(){
  const pl = lxPlans(), w = el('div','lxplans');
  w.append(el('h3', null, 'Dans le Registre des Plans'));
  let vide = true;
  LX_GENRES.forEach(([k, , mot]) => {
    const ids = Object.keys(pl[k]).sort((a, b) => pl[k][a].nom.localeCompare(pl[k][b].nom, 'fr'));
    if(!ids.length) return;
    vide = false;
    const d = el('div','mini');
    d.append(el('b', null, mot.charAt(0).toUpperCase() + mot.slice(1) + 's : '));
    ids.forEach((id, i) => {
      if(i) d.append(document.createTextNode(', '));
      const b = el('button','mention lieuref', pl[k][id].nom); b.type = 'button';
      b.onclick = () => ouvrirLieuRef('plan:' + k + ':' + id);
      d.append(b);
    });
    w.append(d);
  });
  const villes = [];
  Object.keys(pl.w).forEach(x => pl.w[x].villes.forEach(v => villes.push({w:x, v:v})));
  if(villes.length){
    vide = false;
    w.append(el('p','mini', villes.length + ' lieu' + (villes.length > 1 ? 'x' : '') + ' nommé' + (villes.length > 1 ? 's' : '') + ' sur les cartes du monde se cite' + (villes.length > 1 ? 'nt' : '') + ' aussi.'));
  }
  if(vide) w.append(el('p','mini','Aucun plan dans ce navigateur. Ouvre le Registre des Plans une fois, ou relie le dépôt, et les plans se citeront ici.'));
  return w;
}

/* ---------- la liste qui s'ouvre sous le texte, pour les lieux ---------- */
/* ce qu'on tape après deux tirets, tant que ce n'est pas déjà un nom complet suivi d'autre chose */
function requeteLieu(z, lx){
  const pos = z.selectionStart;
  if(pos == null || pos !== z.selectionEnd) return null;
  const avant = z.value.slice(0, pos);
  let i = -1;
  for(let j = avant.lastIndexOf('--'); j >= 0; j = avant.lastIndexOf('--', j - 1)) if(lxOuvrant(avant, j)){ i = j; break; }
  if(i < 0) return null;
  if(avant.lastIndexOf('/') > i) return null;         /* « /Nahya » est plus proche : c'est quelqu'un qu'on cite */
  const q = avant.slice(i + 2);
  if(q.length > 40 || /[\n,.;:!?«»()"\/]/.test(q) || q.split(' ').length > 5 || /^\s/.test(q)) return null;
  const qn = normeNom(q);
  const fini = lx.some(g => q.length > g.nom.length && normeNom(q.slice(0, g.nom.length)) === normeNom(g.nom) && !lettreOuChiffre(q.charAt(g.nom.length)))
    && !lx.some(g => g.nom.length > q.length && normeNom(g.nom).indexOf(qn) === 0);
  return fini ? null : {debut:i, q:q};
}
function majMentions(z){
  const lx = lieuxCitables();
  const r = requeteLieu(z, lx);
  if(!r){ majMentionsGens(z); return; }
  const qn = normeNom(r.q).trim();
  const note = g => {
    const n = normeNom(g.nom);
    if(!qn) return 0;
    if(n === qn) return -1;
    if(n.indexOf(qn) === 0) return 0;
    if(n.split(/[\s'’-]+/).some(m => m.indexOf(qn) === 0)) return 1;
    if(n.indexOf(qn) >= 0) return 2;
    return qn.length >= 3 && distanceNoms(cleSimple(qn), cleSimple(n)) <= Math.max(1, Math.floor(qn.length / 4)) ? 3 : 9;
  };
  const l = lx.map(g => ({g:g, n:note(g)})).filter(x => x.n < 9)
    .sort((a, b) => (a.n - b.n) || a.g.nom.localeCompare(b.g.nom, 'fr')).slice(0, 7).map(x => ({lieu:true, l:x.g}));
  const exact = lx.some(g => normeNom(g.nom) === qn);
  if(r.q.trim().length >= 2 && !exact && !z._sansFiche) l.push({lieu:true, nouveau:r.q.trim()});
  if(!l.length){ fermerMentions(); return; }
  if(MENT.z !== z || MENT.q !== r.q || !MENT.lieu){ MENT.i = 0; MENT.nav = false; }
  MENT.z = z; MENT.debut = r.debut; MENT.q = r.q; MENT.liste = l; MENT.lieu = true;
  MENT.i = Math.min(MENT.i, l.length - 1);
  dessinerMentions();
  lxPlansDepot();                         /* les plans dessinés ailleurs, s'il y en a de nouveaux */
}
function dessinerMentions(){
  const z = MENT.z; if(!z) return;
  let b = MENT.boite;
  if(!b){ b = el('div','mentions'); b.setAttribute('role', 'listbox'); MENT.boite = b; }
  b.setAttribute('aria-label', MENT.lieu ? 'Quel lieu' : 'Qui citer');
  if(b.previousElementSibling !== z) z.insertAdjacentElement('afterend', b);
  b.innerHTML = '';
  b.id = (z.id || 'texte') + '-mentions';
  z.setAttribute('aria-controls', b.id);
  MENT.liste.forEach((x, i) => {
    const o = el('button', i === MENT.i ? 'actif' : null); o.type = 'button';
    o.setAttribute('role', 'option'); o.setAttribute('aria-selected', i === MENT.i ? 'true' : 'false');
    if(x.nouveau){ o.append(el('span','mn', (x.lieu ? 'Nouvelle fiche de lieu « ' : 'Nouvelle fiche « ') + x.nouveau + ' »')); o.classList.add('neuve'); }
    else if(x.lieu) o.append(el('span','mn', x.l.nom), el('span','mq', x.l.sorte));
    else o.append(el('span','mn', x.g.nom), el('span','mq', x.g.pj ? 'personnage' : 'PNJ'));
    o.onmousedown = ev => { ev.preventDefault(); choisirMention(i); };
    b.append(o);
  });
  const x = MENT.liste[MENT.i];
  b.append(el('p','maide', x && x.nouveau && !MENT.nav ? 'Flèche puis Entrée : créer sa fiche · Échap : fermer'
    : 'Entrée ou Tab : citer · Échap : fermer'));
}
function choisirMention(i){
  const z = MENT.z, x = MENT.liste[i];
  if(!z || !x) return;
  const debut = MENT.debut, pos = z.selectionStart, lieu = !!x.lieu;
  let nom = '';
  if(x.nouveau){
    const p = lieu ? creerFicheLieu(x.nouveau) : creerFicheMention(x.nouveau);
    if(!p) return;
    nom = p.nom;
  } else nom = lieu ? x.l.nom : x.g.nom;
  const marque = lieu ? '--' : '/';
  const apres = z.value.slice(pos);
  const espace = /^[\s.,;:!?»)]/.test(apres) ? '' : ' ';
  z.value = z.value.slice(0, debut) + marque + nom + espace + apres;
  const c = debut + marque.length + nom.length + espace.length;
  fermerMentions();
  z.focus();
  z.setSelectionRange(c, c);
  MENT.taire = true;
  try{ z.dispatchEvent(new Event('input', {bubbles:true})); } finally { MENT.taire = false; }
}

/* ---------- un peu de style, posé par la page ---------- */
(function(){
  const s = document.createElement('style');
  s.textContent = 'button.mention.lieuref{color:var(--rust);text-decoration-style:dotted}'
    + 'button.mention.lieuref:hover,button.mention.lieuref:focus-visible{text-decoration-color:var(--rust)}'
    + '.lxplans{margin-top:14px;border-top:1px solid var(--rule);padding-top:10px}'
    + '.lxplans h3{margin:0 0 6px}.lxplans .mini{margin:2px 0}'
    + '.lxedit .row{display:flex;gap:8px;align-items:flex-start;margin:6px 0}'
    + '.lxedit .row label{min-width:110px;padding-top:6px}'
    + '.lxedit .row input,.lxedit .row textarea{flex:1;min-width:0}';
  document.head.append(s);
})();

/* ---------- ce qu'on a écrit sur quelqu'un ---------- */
/* les paragraphes où il agit ou parle, où on le cite (« /Nahya ») ou le nomme */
const echapper = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’`´ʼ]/g, '[\'’`´ʼ]');
const motifNom = n => new RegExp('(^|[^\\p{L}\\p{N}])' + echapper(n) + '(?=$|[^\\p{L}\\p{N}])', 'giu');
/* son nom écrit sans barre, dans un texte : trois lettres au moins, jamais dans le nom plus long d'un autre */
function chercheNom(ref, gens){
  const q = quiRef(ref);
  const nom = q ? cleNom(q.nom) : '';
  let re = null;
  try{ re = nom.length >= 3 ? motifNom(nom) : null; }catch(e){ re = null; }
  /* « Garde » ne se lit pas dans « le Garde du pont » quand quelqu'un d'autre porte ce nom-là */
  const plusLongs = [];
  if(re) gens.forEach(g => {
    if(g.ref === ref || g.nom.length <= nom.length) return;
    re.lastIndex = 0;
    if(re.test(g.nom)){ try{ plusLongs.push(motifNom(g.nom)); }catch(e){} }
  });
  if(re) re.lastIndex = 0;
  /* le texte où l'on cherche : les citations des autres (et les siennes, si on les montre à part) et les noms
     plus longs effacés, sans rien décaler */
  const blanc = (m, p) => p + ' '.repeat(m.length - p.length);
  const nettoye = (t, ms, aussiLui) => {
    let s = String(t || '');
    for(let j = ms.length - 1; j >= 0; j--) if(aussiLui || ms[j].ref !== ref) s = s.slice(0, ms[j].i) + ' '.repeat(ms[j].n) + s.slice(ms[j].i + ms[j].n);
    plusLongs.forEach(x => { x.lastIndex = 0; s = s.replace(x, blanc); });
    return s;
  };
  return {nom:nom, re:re, nettoye:nettoye};
}
function textesDe(ref){
  const q = quiRef(ref); if(!q) return [];
  const gens = gensCitables();
  const nom = cleNom(q.nom);
  const ch = chercheNom(ref, gens);
  const out = [];
  Object.keys(T.blocs).forEach(id => {
    const b = T.blocs[id];
    if(!b || b.supprime || b.type === 'rencontre') return;
    const e = T.journal[b.seance];
    if(!e || e.supprime) return;
    /* un ancien personnage : ce qu'il a fait quand il était à la table compte aussi */
    const agit = q.pj ? b.qui.k === 'perso' && b.qui.id === q.o.id
      : (b.qui.k === 'pnj' && (b.qui.id === q.o.id || (!b.qui.id && cleNom(b.qui.nom) === nom))) || (!!q.o.pj && b.qui.k === 'perso' && b.qui.id === q.o.pj);
    const ms = trouverMentions(b.texte, gens);
    let cite = ms.some(m => m.ref === ref);
    if(!cite && ch.re){ ch.re.lastIndex = 0; cite = ch.re.test(ch.nettoye(b.texte, ms)); }
    if(agit || cite) out.push({b:b, e:e, agit:agit});
  });
  const num = e => parseFloat(e.seance) || 0;
  /* une campagne après l'autre : le numéro d'une séance ne vaut que chez elle */
  const ordre = {}; campagnes().forEach((c, i) => { ordre[c.id] = i; });
  const camp = e => ordre[idCampagneDe(e)] || 0;
  return out.sort((x, y) => (camp(x.e) - camp(y.e)) || (num(x.e) - num(y.e)) || (x.b.ordre - y.b.ordre) || (x.b.id < y.b.id ? -1 : 1));
}
/* les autres fiches qui le citent dans ce qu'on sait d'elles */
function fichesQuiCitent(ref){
  const gens = gensCitables();
  return tousLesGens().filter(x => x.ref !== ref && x.o && trouverMentions(x.o.texte, gens).some(m => m.ref === ref));
}
const TEXTES_TOUT = {};
const extrait = (t, n) => { const s = String(t || '').replace(/\s+/g, ' ').trim(); if(s.length <= n) return s; const c = s.slice(0, n); return c.slice(0, Math.max(c.lastIndexOf(' '), n - 20)) + '…'; };
/* sur la fiche : séance par séance, ce que les comptes rendus disent de lui, avec de quoi y retourner */
function blocTextes(ref, redessiner){
  const q = quiRef(ref);
  const w = el('div','textes');
  const l = textesDe(ref), f = fichesQuiCitent(ref);
  if(!l.length && !f.length){
    w.append(el('p','mini', 'Rien dans les comptes rendus pour l’instant. Écris « /' + (q ? q.nom : '') + ' » dans un paragraphe pour l’y relier.'));
    return w;
  }
  const gens = gensCitables();
  const tout = !!TEXTES_TOUT[ref];
  const vus = tout ? l : l.slice(-8);
  if(l.length > vus.length){
    const b = el('button','btn ghost xs', 'Tout voir, ' + l.length + ' paragraphes'); b.type = 'button';
    b.onclick = () => { TEXTES_TOUT[ref] = true; redessiner(); };
    w.append(b);
  }
  let cle = null;
  vus.forEach(x => {
    if(x.e.id !== cle){
      cle = x.e.id;
      w.append(el('p','tseance', 'Séance ' + etiquetteSeance(x.e) + (x.e.titre ? ' · ' + x.e.titre : '')));
    }
    const p = el('div','textrait' + (x.agit ? ' agit' : ''));
    const t = el('p');
    t.append(texteRiche(extrait(phrase(x.b), 320), gens));
    p.append(t);
    const aller = el('button','ax', '↗'); aller.type = 'button';
    aller.title = 'Le retrouver dans la séance'; aller.setAttribute('aria-label', 'Retrouver ce paragraphe dans la séance ' + etiquetteSeance(x.e));
    aller.onclick = () => allerAuBloc(x.e.id, x.b.id);
    p.append(aller);
    w.append(p);
  });
  if(tout && l.length > 8){
    const b = el('button','btn ghost xs', 'Seulement les derniers'); b.type = 'button';
    b.onclick = () => { TEXTES_TOUT[ref] = false; redessiner(); };
    w.append(b);
  }
  if(f.length){
    w.append(el('p','tseance', 'Dans d’autres fiches'));
    f.forEach(x => {
      const p = el('div','textrait');
      const t = el('p');
      const n = el('button','mention', x.nom); n.type = 'button'; n.onclick = () => ouvrirFiche(x.ref);
      t.append(n, document.createTextNode(' : '), texteRiche(extrait(x.o.texte, 260), gens));
      p.append(t);
      w.append(p);
    });
  }
  return w;
}
