/* ============ la fiche en grand ============
   Tout ce qui concerne quelqu'un, sur toute la largeur : ce qu'on sait de lui, ses liens, les fiches qui le
   citent, et chaque paragraphe des comptes rendus où il parle, agit, où on le cite ou le nomme, en entier.
   avant : les fiches d'où l'on vient, en suivant un nom cité */
const GRAND = {ref:'', filtre:'tout', avant:[], tisse:false};
function ouvrirGrand(ref, retour){
  const box = $('pnjGrand');
  if(!box || !quiRef(ref)) return;
  if(GRAND.ref && GRAND.ref !== ref && !retour){ GRAND.avant.push(GRAND.ref); if(GRAND.avant.length > 12) GRAND.avant.shift(); }
  if(GRAND.ref !== ref){ GRAND.filtre = 'tout'; GRAND.tisse = false; }
  GRAND.ref = ref;
  dessinerGrand(true);
  box.scrollIntoView({block:'start', behavior:'smooth'});
  const h = box.querySelector('.gnom'); if(h) h.focus({preventScroll:true});
}
function fermerGrand(){
  GRAND.ref = ''; GRAND.avant = []; GRAND.tisse = false;
  const box = $('pnjGrand'); if(box){ box.hidden = true; box.innerHTML = ''; }
}
function dessinerGrand(force){
  const box = $('pnjGrand'); if(!box) return;
  const q = GRAND.ref ? quiRef(GRAND.ref) : null;
  /* retiré entre-temps : la fiche en grand se ferme */
  if(!q){ if(GRAND.ref) fermerGrand(); else box.hidden = true; return; }
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerGrand(true)); return; }
  const ref = q.ref, o = q.o;
  box.hidden = false; box.innerHTML = '';
  box.setAttribute('aria-label', 'La fiche de ' + q.nom + ', en grand');
  const gens = gensCitables();
  const l = textesDe(ref);

  /* en tête : qui c'est, et de quoi agir */
  const t = el('div','gtete');
  const r0 = GRAND.avant.length ? GRAND.avant[GRAND.avant.length - 1] : '', q0 = r0 ? quiRef(r0) : null;
  if(q0){
    const rv = el('button','btn ghost xs', '← ' + q0.nom); rv.type = 'button';
    rv.title = 'Revenir à la fiche de ' + q0.nom;
    rv.onclick = () => { GRAND.avant.pop(); ouvrirGrand(r0, true); };
    t.append(rv);
  }
  const nm = el('h3','gnom', q.nom + (!q.pj && o.statut === 'mort' ? ' †' : '')); nm.tabIndex = -1;
  t.append(nm);
  if(!q.pj) t.append(el('span','att att-' + o.attitude, libelle(ATTITUDES, o.attitude)));
  t.append(el('span','espace'));
  const fer = el('button','btn ghost sm','Fermer'); fer.type = 'button'; fer.id = 'grandFermer';
  fer.setAttribute('aria-label', 'Fermer la fiche en grand');
  fer.onclick = fermerGrand;
  t.append(fer);
  box.append(t);
  const qui = q.pj ? [o.joueur ? 'joué par ' + o.joueur : '', o.peuple, o.voie] : [o.role, o.peuple, texteAge(o), o.groupe];
  box.append(el('p','pqui gsous', qui.filter(Boolean).join(' · ') || 'rien de noté pour l’instant'));
  const vu = listeNumerosSeances(l.map(x => x.e));
  const nl = liensDe(ref).length;
  const meta = [q.pj ? '' : o.lieu, vu ? 'vu en séance ' + vu : '', nl ? nl + ' lien' + (nl > 1 ? 's' : '') : '',
    !q.pj && o.statut === 'disparu' ? 'disparu' : '', !q.pj && o.pvMax ? o.pv + '/' + o.pvMax + ' PV' : ''].filter(Boolean);
  if(meta.length) box.append(el('p','mini gmeta', meta.join(' · ')));
  const act = el('div','pact');
  const b = (txt, fn) => { const x = el('button','btn ghost sm', txt); x.type = 'button'; x.onclick = fn; act.append(x); return x; };
  if(!q.pj){
    b('Modifier', () => ouvrirEditeurPnj(o, false));
    b('Faire parler', () => composerPourPnj(o));
  }
  const ti = b('Tisser un lien', () => {
    GRAND.tisse = !GRAND.tisse; dessinerGrand(true);
    if(GRAND.tisse){ const s = box.querySelector('.fl-avec'); if(s) s.focus(); }
  });
  ti.setAttribute('aria-expanded', GRAND.tisse ? 'true' : 'false');
  b('Dans le réseau', () => { MOI.vuePnj = 'reseau'; RES.sel = ref; RES.focus = ''; sauverLocal(); dessinerPnj(true); $('pnjReseau').scrollIntoView({block:'start', behavior:'smooth'}); });
  if(q.pj) b('Sa fiche', () => ouvrirPage('marchefleurs.html#pj=' + encodeURIComponent(o.id), ONGLET_FICHE));
  box.append(act);
  if(GRAND.tisse) box.append(formLien(ref, '', () => { GRAND.tisse = false; dessinerGrand(true); }));

  const corps = el('div','gcorps');
  const cote = el('div','gcote'), lire = el('div','glire');
  corps.append(cote, lire);
  box.append(corps);

  /* à gauche : ce qu'on sait, ses liens, les autres fiches qui le citent */
  cote.append(el('h4','glab', q.pj ? 'Ce qu’il est' : 'Ce qu’on sait'));
  if(o.texte && o.texte.trim()){ const x = el('div','gsait'); x.append(texteRiche(o.texte, gens)); cote.append(x); }
  else cote.append(el('p','mini', q.pj ? 'Rien d’écrit : sa fiche se complète dans le Registre de la Table.' : 'Rien d’écrit. « Modifier » pour le compléter.'));
  if(!q.pj && o.valeurs && o.valeurs.length){
    cote.append(el('h4','glab', 'Ses valeurs'));
    cote.append(el('p','mini', o.valeurs.map(v => v.n + ' ' + v.v + ' (d20 ' + d20v(v.v) + ')').join(' · ')));
  }
  cote.append(el('h4','glab', 'Ses liens'));
  const ls = liensDe(ref);
  if(!ls.length) cote.append(el('p','mini', 'Aucun lien pour l’instant.'));
  ls.forEach(x => cote.append(ligneLien(x, () => dessinerGrand(true), ref, 'grand')));
  const f = fichesQuiCitent(ref);
  if(f.length){
    cote.append(el('h4','glab', 'Dans d’autres fiches'));
    f.forEach(x => {
      const p = el('div','gautre'), tx = el('p');
      const n = el('button','mention', x.nom); n.type = 'button'; n.title = 'La fiche de ' + x.nom;
      n.onclick = () => ouvrirGrand(x.ref);
      tx.append(n, document.createTextNode(' : '), texteSurligne(x.o.texte, ref, gens));
      p.append(tx);
      cote.append(p);
    });
  }

  /* à droite : les comptes rendus, en entier */
  lire.append(grandTextes(q, l, gens));
}
function grandTextes(q, l, gens){
  const ref = q.ref;
  const w = el('div','gtextes');
  const tete = el('div','gtitre');
  tete.append(el('h4','glab', 'Dans les comptes rendus'));
  if(l.length) tete.append(el('span','mini', l.length + ' paragraphe' + (l.length > 1 ? 's' : '')));
  w.append(tete);
  if(!l.length){
    w.append(el('p','vide', 'Rien pour l’instant. Écris « /' + q.nom + ' » dans un paragraphe de la séance pour l’y relier.'));
    return w;
  }
  const nAgit = l.filter(x => x.agit).length, nNomme = l.length - nAgit;
  if((GRAND.filtre === 'agit' && !nAgit) || (GRAND.filtre === 'nomme' && !nNomme) || ['tout', 'agit', 'nomme'].indexOf(GRAND.filtre) < 0) GRAND.filtre = 'tout';
  const barre = el('div','gfiltres');
  const seg = el('div','seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Quels paragraphes');
  [['tout', 'Tout', l.length], ['agit', 'Il parle ou agit', nAgit], ['nomme', 'On le nomme', nNomme]].forEach(([k, lab, n]) => {
    const x = el('button', null, lab + ' · ' + n); x.type = 'button'; x.id = 'grandFiltre-' + k;
    x.disabled = !n;
    x.setAttribute('aria-pressed', GRAND.filtre === k ? 'true' : 'false');
    x.onclick = () => { GRAND.filtre = k; dessinerGrand(true); const g = $('pnjGrand').querySelector('.gtextes'); if(g) g.scrollIntoView({block:'start', behavior:'smooth'}); };
    seg.append(x);
  });
  barre.append(seg);
  const vus = l.filter(x => GRAND.filtre === 'tout' || (GRAND.filtre === 'agit') === x.agit);
  const groupes = [];
  vus.forEach(x => { let g = groupes[groupes.length - 1]; if(!g || g.e.id !== x.e.id){ g = {e:x.e, l:[]}; groupes.push(g); } g.l.push(x); });
  if(groupes.length > 1){
    const saut = el('div','gsauts'); saut.setAttribute('role', 'group'); saut.setAttribute('aria-label', 'Aller à une séance');
    groupes.forEach(g => {
      const x = el('button', null, 'Séance ' + etiquetteSeance(g.e)); x.type = 'button';
      x.title = g.l.length + ' paragraphe' + (g.l.length > 1 ? 's' : '') + (g.e.titre ? ', ' + g.e.titre : '');
      x.onclick = () => { const c = w.querySelector('[data-gseance="' + g.e.id + '"]'); if(c) c.scrollIntoView({block:'start', behavior:'smooth'}); };
      saut.append(x);
    });
    w.append(barre, saut);
  } else w.append(barre);
  groupes.forEach(g => {
    const s = el('section','ggroupe'); s.setAttribute('data-gseance', g.e.id);
    const h = el('h5','gseance', 'Séance ' + etiquetteSeance(g.e) + (g.e.titre ? ' · ' + g.e.titre : ''));
    h.append(el('span','gnb', ' · ' + g.l.length + ' paragraphe' + (g.l.length > 1 ? 's' : '')));
    s.append(h);
    g.l.forEach(x => {
      const p = el('div','gpara ' + (x.agit ? 'agit' : 'nomme'));
      p.setAttribute('data-bloc', x.b.id);
      const tx = el('div','gtexte');
      const para = el('p');
      para.append(x.agit ? texteRiche(phrase(x.b), gens) : texteSurligne(phrase(x.b), ref, gens));
      tx.append(para);
      const j = joints(x.b);
      if(j.length) tx.append(el('p','joints', j.join(' · ')));
      p.append(tx);
      const aller = el('button','ax', '↗'); aller.type = 'button';
      aller.title = 'Le retrouver dans la séance';
      aller.setAttribute('aria-label', 'Retrouver ce paragraphe dans la séance ' + etiquetteSeance(g.e));
      aller.onclick = () => allerAuBloc(g.e.id, x.b.id);
      p.append(aller);
      s.append(p);
    });
    w.append(s);
  });
  return w;
}

/* une ligne de lien : le modifier (une erreur, ou ce qui a changé en jeu), ou le défaire en deux temps.
   ref : la personne dont on regarde les liens */
function ligneLien(l, redessiner, ref, lieu){
  /* le formulaire ne s'ouvre qu'à l'endroit où l'on a cliqué, même si le lien se voit ailleurs aussi */
  const ici = (lieu || '') + '|' + (ref || '');
  const ouvert = !!(LIEN_ED && LIEN_ED.id === l.id && LIEN_ED.lieu === ici);
  const w = el('div','lien' + (ouvert ? ' edite' : ''));
  w.setAttribute('data-lien', l.id);
  w.append(el('span','ltrait l-' + l.type));
  w.append(el('span','q', phraseLien(l)));
  if(l.notes) w.append(el('span','mini', ' · ' + l.notes));
  const m = el('button','btn ghost sm lmodif', ouvert ? 'Fermer' : 'Modifier'); m.type = 'button';
  m.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  m.setAttribute('aria-label', (ouvert ? 'fermer : ' : 'modifier le lien ') + phraseLien(l));
  m.onclick = () => { LIEN_ED = ouvert ? null : Object.assign(edLien(l, ref), {lieu:ici}); redessiner(); };
  w.append(m);
  const arme = LIEN_SUPPR === l.id;
  const x = el('button','btn ghost sm' + (arme ? ' danger' : ''), arme ? 'Confirmer' : 'Défaire'); x.type = 'button';
  x.setAttribute('aria-label', (arme ? 'confirmer : défaire le lien ' : 'défaire le lien ') + phraseLien(l));
  x.onclick = () => {
    if(arme){ LIEN_SUPPR = null; changer(() => { T.liens[l.id] = Object.assign({}, l, {supprime:true, maj:maintenant()}); }); redessiner(); return; }
    LIEN_SUPPR = l.id; redessiner();
    setTimeout(() => { if(LIEN_SUPPR === l.id){ LIEN_SUPPR = null; redessiner(); } }, 5000);
  };
  w.append(x);
  if(l.hist && l.hist.length) w.append(histoireLien(l));
  if(ouvert) w.append(formModifLien(l, () => { LIEN_ED = null; redessiner(); }, redessiner));
  return w;
}
/* ce qu'on modifie se garde hors de la page : une mise à jour venue d'ailleurs ne l'efface pas */
function edLien(l, ref){
  const moi = ref === l.vers ? l.vers : l.de, autre = moi === l.de ? l.vers : l.de;
  return {id:l.id, ref:moi, mode:'corr', type:l.type, texte:l.texte, sens:l.mutuel ? 'mutuel' : moi === l.de ? 'aller' : 'retour', avec:autre, raison:''};
}
function formModifLien(l, fini, redessiner){
  const E = LIEN_ED;
  const f = el('div','flien');
  const n = ++N_FORM;
  const moi = quiRef(E.ref);
  const seg = el('div','seg lmode'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Ce qui se passe');
  [['corr', 'Je me suis trompé', 'Le lien est corrigé, sans laisser de trace.'],
   ['evol', 'Ça a changé en jeu', 'Le lien change, ce qu’il était reste dans son histoire et la séance le note.']].forEach(([k, lab, aide]) => {
    const b = el('button', null, lab); b.type = 'button'; b.id = 'fm-' + k + '-' + n; b.title = aide;
    b.setAttribute('aria-pressed', E.mode === k ? 'true' : 'false');
    b.onclick = () => { E.mode = k; redessiner(); };
    seg.append(b);
  });
  f.append(seg);
  f.append(el('p','mini', E.mode === 'corr' ? 'Le lien est corrigé, sans laisser de trace.' : 'Une amitié qui tourne à la brouille : le lien change, ce qu’il était reste écrit dessous, et la séance en cours le note.'));
  const g = el('div','jetform');
  if(E.mode === 'corr'){
    const av = el('select'); av.id = 'fm-avec-' + n;
    const og1 = el('optgroup'); og1.label = 'Les personnages';
    const og2 = el('optgroup'); og2.label = 'Les PNJ';
    tousLesGens().filter(x => x.ref !== E.ref).forEach(x => (x.pj ? og1 : og2).append(new Option(x.nom, x.ref)));
    if(og1.children.length) av.append(og1);
    if(og2.children.length) av.append(og2);
    av.value = E.avec;
    av.onchange = () => { E.avec = av.value; redessiner(); };
    champ(g, 'Avec qui', av);
  }
  const ty = el('select'); ty.id = 'fm-type-' + n;
  TYPES_LIEN.forEach(t => ty.add(new Option(t.l, t.k)));
  ty.value = E.type;
  ty.onchange = () => { E.type = ty.value; tx.placeholder = typeLien(E.type).ex; };
  champ(g, 'Quel lien', ty);
  const tx = el('input'); tx.type = 'text'; tx.id = 'fm-texte-' + n; tx.value = E.texte; tx.placeholder = typeLien(E.type).ex;
  tx.oninput = () => { E.texte = tx.value; };
  champ(g, 'En quelques mots', tx);
  const se = el('select'); se.id = 'fm-sens-' + n;
  const a = moi ? moi.nom : '?', b = (quiRef(E.avec) || {}).nom || 'l’autre';
  se.add(new Option('Réciproque', 'mutuel'));
  se.add(new Option(a + ' → ' + b, 'aller'));
  se.add(new Option(b + ' → ' + a, 'retour'));
  se.value = E.sens;
  se.onchange = () => { E.sens = se.value; };
  champ(g, 'Dans quel sens', se);
  if(E.mode === 'evol'){
    const r = el('input'); r.type = 'text'; r.id = 'fm-raison-' + n; r.value = E.raison; r.placeholder = 'la dispute au pont de Ronceval';
    r.oninput = () => { E.raison = r.value; };
    champ(g, 'Ce qui s’est passé', r);
  }
  f.append(g);
  const act = el('div','acts'); act.style.marginTop = '8px';
  const ok = el('button','btn sm fm-ok', E.mode === 'corr' ? 'Corriger le lien' : 'Le lien change'); ok.type = 'button'; ok.id = 'fm-ok-' + n;
  ok.onclick = () => {
    const x = T.liens[l.id];
    if(!x || x.supprime){ fini(); return; }
    if(!quiRef(E.avec) || E.avec === E.ref){ msgTable('Choisis avec qui.', false); return; }
    const aller = E.sens !== 'retour';
    const nv = Object.assign({}, x, {type:E.type, texte:E.texte.trim(), mutuel:E.sens === 'mutuel',
      de:aller ? E.ref : E.avec, vers:aller ? E.avec : E.ref, maj:maintenant()});
    const evol = E.mode === 'evol';
    const pareil = nv.type === x.type && nv.texte === x.texte && nv.mutuel === x.mutuel && nv.de === x.de && nv.vers === x.vers;
    if(pareil && evol){ msgTable('Rien n’a changé : choisis ce que le lien est devenu.', false); return; }
    if(pareil){ fini(); return; }
    const avant = [x.de, x.vers].find(r => r !== E.ref);
    const raison = E.raison.trim();
    if(evol){
      const sid = (seanceCourante() || {}).id || '';
      nv.hist = (x.hist || []).concat([{type:x.type, texte:x.texte, mutuel:x.mutuel, de:x.de, vers:x.vers, depuis:x.depuis, raison:x.raison, jusqua:sid, t:maintenant()}]);
      nv.depuis = sid; nv.raison = raison;
    }
    LIEN_ED = null;
    changer(() => {
      T.liens[l.id] = normLien(nv);
      if(evol) noterDansSeance(phraseLien(nv, true) + ' (avant : ' + typeLien(x.type).l.toLowerCase() + ')' + (raison ? ' : ' + raison : '') + '.', 'note');
    });
    /* une fiche créée par erreur, que plus rien ne relie : on le dit, sans la retirer à ta place */
    const q = !evol && avant !== E.avec && avant && avant.indexOf('pnj:') === 0 ? unPnj(avant.slice(4)) : null;
    if(q && !liensDe(avant).length && !q.role && !q.texte.trim() && !q.groupe && !q.lieu && !q.peuple && !apparitions(q).length)
      msgTable('La fiche « ' + q.nom + ' » n’a plus aucun lien. Si c’était une faute de frappe, retire-la : « Retirer » sur sa carte.', true);
    else msgTable(evol ? 'Le lien a changé, et la séance le note.' : 'Lien corrigé.', true);
    fini();
  };
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button';
  non.onclick = fini;
  act.append(ok, non);
  f.append(act);
  return f;
}

/* tisser un lien : avec qui, quel genre, dans quel sens */
let N_FORM = 0;
function formLien(ref, cible, apres){
  const f = el('div','flien');
  const n = ++N_FORM;
  const moi = quiRef(ref);
  const g = el('div','jetform');
  const avec = el('select'); avec.className = 'fl-avec'; avec.id = 'fl-avec-' + n;
  avec.add(new Option('Avec qui…', ''));
  const og1 = el('optgroup'); og1.label = 'Les personnages';
  const og2 = el('optgroup'); og2.label = 'Les PNJ';
  tousLesGens().filter(x => x.ref !== ref).forEach(x => (x.pj ? og1 : og2).append(new Option(x.nom, x.ref)));
  if(og1.children.length) avec.append(og1);
  if(og2.children.length) avec.append(og2);
  avec.value = cible || '';
  champ(g, 'Avec qui', avec);
  const ty = el('select'); ty.className = 'fl-type'; ty.id = 'fl-type-' + n;
  TYPES_LIEN.forEach(t => ty.add(new Option(t.l, t.k)));
  champ(g, 'Quel lien', ty);
  const tx = el('input'); tx.type = 'text'; tx.className = 'fl-texte'; tx.id = 'fl-texte-' + n; tx.placeholder = typeLien(ty.value).ex;
  champ(g, 'En quelques mots', tx);
  const sens = el('select'); sens.className = 'fl-sens'; sens.id = 'fl-sens-' + n;
  const majSens = () => {
    const b = quiRef(avec.value), a = moi ? moi.nom : '?', bn = b ? b.nom : 'l’autre';
    const v = sens.value;
    sens.innerHTML = '';
    sens.add(new Option('Réciproque', 'mutuel'));
    sens.add(new Option(a + ' → ' + bn, 'aller'));
    sens.add(new Option(bn + ' → ' + a, 'retour'));
    sens.value = v || (typeLien(ty.value).mutuel ? 'mutuel' : 'aller');
  };
  majSens();
  avec.onchange = majSens;
  ty.onchange = () => { tx.placeholder = typeLien(ty.value).ex; sens.value = typeLien(ty.value).mutuel ? 'mutuel' : (sens.value === 'mutuel' ? 'aller' : sens.value); };
  champ(g, 'Dans quel sens', sens);
  f.append(g);
  const a = el('div','acts'); a.style.marginTop = '8px';
  const ok = el('button','btn sm','Tisser le lien'); ok.type = 'button'; ok.className = 'btn sm fl-ok';
  ok.onclick = () => {
    if(!avec.value){ msgTable('Choisis avec qui.', false); return; }
    const aller = sens.value !== 'retour';
    const l = normLien({id:nouvelId('l'), maj:maintenant(), cree:maintenant(), depuis:(seanceCourante() || {}).id || '', type:ty.value, texte:tx.value.trim(),
      mutuel:sens.value === 'mutuel', de:aller ? ref : avec.value, vers:aller ? avec.value : ref});
    changer(() => { T.liens[l.id] = l; });
    if(apres) apres(l);
  };
  a.append(ok);
  f.append(a);
  return f;
}

/* ---------- l'éditeur ---------- */
function listeDonnees(id, valeurs){
  let d = $(id);
  if(!d){ d = el('datalist'); d.id = id; document.body.append(d); }
  d.innerHTML = '';
  valeurs.forEach(v => d.append(new Option(v, v)));
  return id;
}
function ouvrirEditeurPnj(p, nouveau){
  PNJ_ED = normPnj(JSON.parse(JSON.stringify(p || {})));
  PNJ_LIENS = nouveau ? [{avec:'', type:'famille', texte:'', sens:''}] : [];
  if(nouveau){ PNJ_ED.id = nouvelId('n'); if(!PNJ_ED.seance) PNJ_ED.seance = (seanceCourante() || {}).id || ''; }
  const avantNom = nouveau ? '' : (p.nom || '');
  const box = $('pnjEditeur'); box.innerHTML = ''; box.hidden = false;
  box.append(el('h3', null, nouveau ? 'Une fiche de plus' : 'Modifier ' + (PNJ_ED.nom || 'la fiche')));
  const txt = (lab, k, ph, liste) => {
    const i = el('input'); i.type = 'text'; i.value = PNJ_ED[k]; i.placeholder = ph || ''; i.style.width = '100%';
    i.id = 'ped-' + k;
    if(liste) i.setAttribute('list', liste);
    i.oninput = () => { PNJ_ED[k] = i.value; if(k === 'nom' && PNJ_ED._liens) PNJ_ED._liens(); };
    return i;
  };
  const id = el('div','table');
  champ(id, 'Nom', txt('Nom', 'nom', 'Nahya'));
  champ(id, 'Rôle ou métier', txt('Rôle', 'role', 'vieille Ilvès, grand-mère d’Ohan'));
  champ(id, 'Peuple', txt('Peuple', 'peuple', 'Ilvès', listeDonnees('dl-peuples', PEUPLES_LIVRE)));
  champ(id, 'Groupe ou faction', txt('Groupe', 'groupe', 'La bande de Vaurys', listeDonnees('dl-groupes', groupes())));
  champ(id, 'Où on le trouve', txt('Lieu', 'lieu', 'Ronceval'));
  const ss = el('select'); ss.id = 'ped-seance';
  ss.add(new Option('pas encore rencontré', ''));
  seances().slice().reverse().forEach(e => ss.add(new Option('Séance ' + (e.seance || '?') + (e.titre ? ' · ' + e.titre : ''), e.id)));
  /* rencontré dans une autre campagne : sa séance reste choisie, avec le nom de sa campagne */
  const ex = PNJ_ED.seance && T.journal[PNJ_ED.seance] && !T.journal[PNJ_ED.seance].supprime ? T.journal[PNJ_ED.seance] : null;
  if(ex && !dansCampagne(ex)) ss.add(new Option('Séance ' + etiquetteSeance(ex) + (ex.titre ? ' · ' + ex.titre : ''), ex.id));
  ss.value = PNJ_ED.seance && T.journal[PNJ_ED.seance] ? PNJ_ED.seance : '';
  ss.onchange = () => { PNJ_ED.seance = ss.value; };
  champ(id, 'Première rencontre', ss);
  box.append(id);

  const seg = (lab, liste, k) => {
    const w = el('div'); w.style.marginTop = '10px';
    w.append(el('span','lab', lab));
    const s = el('div','seg');
    liste.forEach(x => {
      const b = el('button', null, x.l); b.type = 'button';
      b.setAttribute('aria-pressed', PNJ_ED[k] === x.k ? 'true' : 'false');
      b.onclick = () => { PNJ_ED[k] = x.k; [].forEach.call(s.children, y => y.setAttribute('aria-pressed', y === b ? 'true' : 'false')); };
      s.append(b);
    });
    w.append(s);
    box.append(w);
  };
  seg('Envers le groupe', ATTITUDES, 'attitude');
  seg('Aujourd’hui', STATUTS, 'statut');

  /* son arbre : avec un personnage, une fiche, ou un nom tout neuf qui reçoit la sienne */
  box.append(el('h3', null, 'Ses liens'));
  box.append(el('p','mini','Avec un personnage, une autre fiche, ou un nom qu’on n’a pas encore : sa fiche se crée en même temps.'));
  const lb = el('div'); lb.id = 'ped-liens';
  box.append(lb);
  const gens = listeDonnees('dl-gens', tousLesGens().filter(x => x.ref !== 'pnj:' + PNJ_ED.id).map(x => x.nom));
  const dessinerLiensEd = () => {
    lb.innerHTML = '';
    if(!nouveau) liensDe('pnj:' + PNJ_ED.id).forEach(l => lb.append(ligneLien(l, dessinerLiensEd, 'pnj:' + PNJ_ED.id, 'editeur')));
    PNJ_LIENS.forEach((x, i) => {
      const g = el('div','jetform elien');
      const av = el('input'); av.type = 'text'; av.id = 'ped-lien-avec-' + i; av.value = x.avec; av.placeholder = 'Ohan, Toum’Balin';
      av.setAttribute('list', gens);
      champ(g, 'Avec qui', av);
      const ty = el('select'); ty.id = 'ped-lien-type-' + i;
      TYPES_LIEN.forEach(t => ty.add(new Option(t.l, t.k)));
      ty.value = x.type;
      champ(g, 'Quel lien', ty);
      const tx = el('input'); tx.type = 'text'; tx.id = 'ped-lien-texte-' + i; tx.value = x.texte; tx.placeholder = typeLien(x.type).ex;
      tx.oninput = () => { x.texte = tx.value; };
      champ(g, 'En quelques mots', tx);
      const se = el('select'); se.id = 'ped-lien-sens-' + i;
      const majSens = () => {
        const a = (PNJ_ED.nom || '').trim() || 'Lui', b = x.avec.trim() || 'l’autre';
        se.innerHTML = '';
        se.add(new Option('Réciproque', 'mutuel'));
        se.add(new Option(a + ' → ' + b, 'aller'));
        se.add(new Option(b + ' → ' + a, 'retour'));
        se.value = x.sens || (typeLien(x.type).mutuel ? 'mutuel' : 'aller');
      };
      majSens();
      /* un nom qu'on n'a pas encore : sa fiche se crée ; un nom qui ressemble beaucoup à quelqu'un : on demande */
      const ind = el('p','mini lindice'); ind.id = 'ped-lien-indice-' + i;
      const majIndice = () => {
        ind.innerHTML = '';
        const nom = x.avec.trim(), q = nom ? nomProche(nom, 'pnj:' + PNJ_ED.id) : null;
        ind.hidden = !nom || !!refParNom(nom);
        if(ind.hidden) return;
        if(q && x.voulu !== cleNom(nom)){
          ind.classList.add('doute');
          ind.append(document.createTextNode('Personne ne s’appelle « ' + nom + ' ». Tu voulais dire ' + q.nom + ' ? '));
          const oui = el('button','btn ghost xs','Oui, ' + q.nom); oui.type = 'button'; oui.id = 'ped-lien-oui-' + i;
          oui.onclick = () => { x.avec = q.nom; av.value = q.nom; const v = se.value; majSens(); se.value = v; majIndice(); };
          const non = el('button','btn ghost xs','Non, une nouvelle fiche'); non.type = 'button'; non.id = 'ped-lien-non-' + i;
          non.onclick = () => { x.voulu = cleNom(x.avec); majIndice(); };
          ind.append(oui, document.createTextNode(' '), non);
        } else {
          ind.classList.remove('doute');
          ind.textContent = 'Pas encore de fiche « ' + nom + ' » : elle se crée en même temps.';
        }
      };
      av.oninput = () => { x.avec = av.value; const v = se.value; majSens(); se.value = v; majIndice(); };
      ty.onchange = () => { x.type = ty.value; tx.placeholder = typeLien(x.type).ex; if(!x.sens){ majSens(); } };
      se.onchange = () => { x.sens = se.value; };
      champ(g, 'Dans quel sens', se);
      const r = el('button','btn ghost sm','Retirer'); r.type = 'button';
      r.setAttribute('aria-label', 'Retirer ce lien');
      r.onclick = () => { PNJ_LIENS.splice(i, 1); dessinerLiensEd(); };
      const w = el('div','eret'); w.append(el('span','lab', ' '), r);
      g.append(w);
      g.append(ind);
      majIndice();
      lb.append(g);
    });
  };
  PNJ_ED._liens = dessinerLiensEd;
  dessinerLiensEd();
  const plusL = el('button','btn ghost sm','Ajouter un lien'); plusL.type = 'button'; plusL.id = 'ped-lien-plus';
  plusL.onclick = () => { PNJ_LIENS.push({avec:'', type:'ami', texte:'', sens:''}); dessinerLiensEd(); const i = $('ped-lien-avec-' + (PNJ_LIENS.length - 1)); if(i) i.focus(); };
  box.append(plusL);

  box.append(el('h3', null, 'Ce qu’on sait'));
  const z = el('textarea'); z.rows = 4; z.id = 'ped-texte'; z.value = PNJ_ED.texte;
  z.placeholder = 'Ce qu’il a dit, ce qu’il cache, ce qu’il veut. « / » puis un nom cite quelqu’un, « -- » puis un nom cite un lieu. Tout le monde le lit.';
  z.oninput = () => { PNJ_ED.texte = z.value; };
  box.append(z);
  brancherMentions(z);

  box.append(el('h3', null, 'Ses valeurs'));
  box.append(el('p','mini','Une valeur sur 100, comme sur une fiche. Elles apparaissent dans les jets quand ce PNJ agit dans la séance.'));
  const vb = el('div'); vb.id = 'ped-valeurs';
  box.append(vb);
  const noms = listeDonnees('dl-valeurs', ALLSKILLS.map(o => nomComp(o.s)).concat(CARS));
  const dessinerValeurs = () => {
    vb.innerHTML = '';
    PNJ_ED.valeurs.forEach((v, i) => {
      const l = el('div','acts'); l.style.marginBottom = '6px';
      const n = el('input'); n.type = 'text'; n.value = v.n; n.placeholder = 'Perception'; n.setAttribute('list', noms); n.style.width = '200px';
      n.setAttribute('aria-label', 'Nom de la valeur');
      n.oninput = () => { v.n = n.value; };
      const x = nombre(v.v, 0, 200); x.setAttribute('aria-label', 'Sa valeur');
      x.oninput = () => { v.v = Math.max(0, parseInt(x.value, 10) || 0); };
      const r = el('button','btn ghost sm','Retirer'); r.type = 'button';
      r.onclick = () => { PNJ_ED.valeurs.splice(i, 1); dessinerValeurs(); };
      l.append(n, x, r);
      vb.append(l);
    });
  };
  dessinerValeurs();
  const plus = el('button','btn ghost sm','Ajouter une valeur'); plus.type = 'button';
  plus.onclick = () => { PNJ_ED.valeurs.push({n:'', v:40}); dessinerValeurs(); const i = vb.querySelector('.acts:last-child input'); if(i) i.focus(); };
  box.append(plus);

  const gv = el('div','table'); gv.style.marginTop = '12px';
  const pv = nombre(PNJ_ED.pvMax == null ? '' : PNJ_ED.pvMax, 0, 500); pv.id = 'ped-pv'; pv.placeholder = 'aucun';
  pv.oninput = () => { PNJ_ED.pvMax = pv.value === '' ? null : Math.max(0, parseInt(pv.value, 10) || 0); };
  champ(gv, 'PV en combat', pv, 'Laisse vide pour un PNJ qui ne se bat pas.');
  /* son âge se garde par son année de naissance : il vieillit tout seul, et deux campagnes jouées à dix ans
     d'écart ne lui donnent pas le même âge */
  const ne = nombre(PNJ_ED.ne == null ? '' : PNJ_ED.ne, -99999, 999999); ne.id = 'ped-ne'; ne.placeholder = 'inconnue'; ne.style.width = '110px';
  ne.oninput = () => { PNJ_ED.ne = ne.value === '' ? null : Math.round(+ne.value || 0); };
  const aide = el('span','mini'); aide.id = 'ped-age';
  const majAge = () => { aide.textContent = PNJ_ED.ne == null ? 'Au jour de la campagne : an ' + anCourant() + '.'
    : texteAge(PNJ_ED) + ' au jour de la campagne (an ' + anCourant() + ').'; };
  ne.addEventListener('input', majAge);
  champ(gv, 'Né en l’an', ne);
  majAge();
  const agb = el('div'); agb.append(aide);
  const quel = el('button','btn ghost xs','Il a tel âge…'); quel.type = 'button'; quel.id = 'ped-ageQ';
  quel.setAttribute('aria-label', 'Donner son âge plutôt que son année de naissance');
  quel.onclick = () => {
    const v = prompt('Quel âge a-t-il, au jour de la campagne (an ' + anCourant() + ') ?', '30');
    if(v == null) return;
    const n = Math.round(+v);
    if(isNaN(n)){ msgTable('Écris un nombre d’années.', false); return; }
    PNJ_ED.ne = anCourant() - n;
    ne.value = String(PNJ_ED.ne);
    majAge();
  };
  agb.append(quel);
  gv.append(agb);
  box.append(gv);

  /* ---- au combat : son rang, ses dés, son attaque. La table peut alors jouer son tour ---- */
  const cb = el('div'); cb.style.marginTop = '12px';
  const dessinerSonCombat = () => {
    cb.innerHTML = '';
    cb.append(el('h3', null, 'Au combat'));
    const lab = el('label','mini');
    const ch = el('input'); ch.type = 'checkbox'; ch.id = 'ped-secombat'; ch.checked = !!PNJ_ED.combat;
    ch.onchange = () => {
      PNJ_ED.combat = ch.checked ? (PNJ_ED.combat || combatNeuf(2, 'nous', PNJ_ED.peuple)) : null;
      if(ch.checked && PNJ_ED.pvMax == null){
        PNJ_ED.pvMax = (RANG[PNJ_ED.combat.rang] || RANG[2]).pv;
        const z = $('ped-pv'); if(z) z.value = PNJ_ED.pvMax;
      }
      dessinerSonCombat();
    };
    lab.append(ch, document.createTextNode(' Il se bat'));
    cb.append(lab);
    if(!PNJ_ED.combat){
      cb.append(el('p','mini','Coche pour lui donner un rang, une réduction, des dés, ses sept caractéristiques, l’attaque de base de son espèce et une autre attaque. Il entre alors dans le tour de table, et la table sait jouer son tour toute seule.'));
      return;
    }
    const c = PNJ_ED.combat;
    const g = el('div','table'); g.style.marginTop = '8px';
    const sc = el('select'); sc.id = 'ped-cote';
    COTES.forEach(x => sc.add(new Option(x.l, x.k)));
    sc.value = c.cote;
    sc.onchange = () => { c.cote = sc.value; };
    champ(g, 'De quel côté', sc);
    const sr = el('select'); sr.id = 'ped-rang';
    ADV.rangs.forEach(x => sr.add(new Option('Rang ' + x.r + ' · ' + x.nom + ' · ' + x.pv + ' PV, ' + x.deg, x.r)));
    sr.value = String(c.rang);
    sr.onchange = () => {
      const av = RANG[c.rang] || RANG[2], ap = RANG[+sr.value] || RANG[2];
      /* ce qu'on n'a pas réécrit soi-même suit le rang */
      if(c.red === av.red) c.red = ap.red;
      if(c.deg === av.deg) c.deg = ap.deg;
      if(c.cartes === av.cartes) c.cartes = ap.cartes;
      const jet = jetDeFiche(c.a1, c.a2), avc = carsPnjDeRang(av.r, c.type, jet);
      if(c.car && CARS.every(x => c.car[x] === avc[x])) c.car = carsPnjDeRang(ap.r, c.type, jet);
      if(c.bonus === (BONUS_PNJ[av.r] || 20)) c.bonus = BONUS_PNJ[ap.r] || 20;
      if(PNJ_ED.pvMax == null || PNJ_ED.pvMax === av.pv){
        PNJ_ED.pvMax = ap.pv;
        const z = $('ped-pv'); if(z) z.value = PNJ_ED.pvMax;
      }
      c.rang = ap.r;
      dessinerSonCombat();
    };
    champ(g, 'Son rang', sr);
    const rd = nombre(c.red, 0, 10); rd.id = 'ped-red';
    rd.oninput = () => { c.red = Math.max(0, Math.min(10, parseInt(rd.value, 10) || 0)); };
    champ(g, 'Réduction', rd);
    const dg = el('input'); dg.type = 'text'; dg.id = 'ped-deg'; dg.value = c.deg; dg.placeholder = 'd6'; dg.style.width = '90px';
    dg.oninput = () => { c.deg = dg.value; };
    champ(g, 'Dés de l’attaque de rang', dg);
    const ca = nombre(c.cartes, 1, 3); ca.id = 'ped-cartes';
    ca.oninput = () => { c.cartes = Math.max(1, Math.min(3, parseInt(ca.value, 10) || 1)); };
    champ(g, 'Cartes par round', ca);
    const st = el('select'); st.id = 'ped-type';
    TYPES_PNJ.forEach(x => st.add(new Option(x.l, x.k)));
    st.value = c.type || 'espece';
    /* son métier décide aussi de ses caractéristiques : elles suivent, tant qu'on ne les a pas réécrites */
    st.onchange = () => {
      const jet = jetDeFiche(c.a1, c.a2), avc = carsPnjDeRang(c.rang, c.type, jet);
      c.type = st.value;
      if(c.car && CARS.every(x => c.car[x] === avc[x])) c.car = carsPnjDeRang(c.rang, c.type, jet);
      dessinerSonCombat();
    };
    champ(g, 'Le genre qu’il est', st);
    cb.append(g);
    cb.append(el('p','mini', 'Deux cartes pour un exceptionnel : il agit deux fois dans le round.'));
    /* ses sept caractéristiques : la table y lance pour lui, comme pour un personnage */
    if(!c.car) c.car = carsPnjDeRang(c.rang, c.type, jetDeFiche(c.a1, c.a2));
    const lv = el('p','mini');
    const majVals = () => { lv.textContent = 'Sur cent : ' + CARS.map(x => ABBR[x] + ' ' + (c.car[x] * 2 + (c.bonus || 0))).join(' · ')
      + '. La table lance là-dessus quand il agit dans la séance.'; };
    const gc = el('div','table'); gc.style.marginTop = '8px';
    CARS.forEach(x => {
      const i = nombre(c.car[x], 1, 40); i.id = 'ped-car-' + ABBR[x]; i.style.width = '70px';
      i.oninput = () => { c.car[x] = Math.max(1, Math.min(40, parseInt(i.value, 10) || 1)); majVals(); };
      champ(gc, ABBR[x], i);
    });
    const bn = nombre(c.bonus, 0, 100); bn.id = 'ped-bonus'; bn.style.width = '70px';
    bn.oninput = () => { c.bonus = Math.max(0, Math.min(100, parseInt(bn.value, 10) || 0)); majVals(); };
    champ(gc, 'Bonus', bn);
    cb.append(gc);
    majVals();
    cb.append(lv);
    /* l'attaque de base de son espèce, celle que son peuple donne d'office */
    const g1 = el('div','table'); g1.style.marginTop = '8px';
    if(c.a1){
      const a1 = c.a1;
      const n1 = el('input'); n1.type = 'text'; n1.id = 'ped-a1n'; n1.value = a1.n; n1.style.width = '100%';
      n1.oninput = () => { a1.n = n1.value; };
      champ(g1, 'L’attaque de son espèce', n1);
      const p1 = el('input'); p1.type = 'text'; p1.id = 'ped-a1p'; p1.value = a1.p; p1.placeholder = 'à vue'; p1.style.width = '100%';
      p1.oninput = () => { a1.p = p1.value; };
      champ(g1, 'Portée', p1);
      const e1 = el('input'); e1.type = 'text'; e1.id = 'ped-a1e'; e1.value = a1.e; e1.placeholder = '1d4'; e1.style.width = '100%';
      e1.oninput = () => { a1.e = e1.value; };
      champ(g1, 'Ce qu’elle fait', e1);
      const j1 = el('select'); j1.id = 'ped-a1j';
      j1.add(new Option('aucune', ''));
      CARS.forEach(x => j1.add(new Option(x, x)));
      j1.value = a1.j || '';
      j1.onchange = () => { a1.j = j1.value; };
      champ(g1, 'Elle se lance sous', j1);
      cb.append(g1);
      const x1 = el('button','btn ghost sm','Il n’a pas d’attaque d’espèce'); x1.type = 'button'; x1.id = 'ped-a1non';
      x1.onclick = () => { c.a1 = null; c.a1non = true; dessinerSonCombat(); };
      cb.append(x1);
    } else {
      cb.append(el('p','mini', 'Pas d’attaque d’espèce. Chaque liste de Pratiques en ouvre une, donnée d’office : Ortie pour la Sève, Escarbille pour le feu. Les Humains n’en ont pas.'));
      const b1 = el('button','btn ghost sm','Celle de son peuple'); b1.type = 'button'; b1.id = 'ped-a1';
      b1.onclick = () => {
        const a = attaqueDeBase(PNJ_ED.peuple);
        if(!a){ msgTable('Son peuple n’ouvre pas de liste de Pratiques : écris « Ilvès », « Écorciens », « Nyréens », et reclique.', false); return; }
        c.a1 = a; c.a1non = false;
        dessinerSonCombat();
      };
      cb.append(b1);
    }
    if(!c.a2) c.a2 = tirerAttaquePnj(c.cote, c.rang, PNJ_ED.peuple, c.type);
    const a2 = c.a2;
    const g2 = el('div','table'); g2.style.marginTop = '8px';
    const an = el('input'); an.type = 'text'; an.id = 'ped-a2n'; an.value = a2.n; an.style.width = '100%';
    an.oninput = () => { a2.n = an.value; };
    champ(g2, 'Son autre attaque', an);
    const at = el('select'); at.id = 'ped-a2ty';
    ADV.types.forEach(x => at.add(new Option(x.l, x.k)));
    at.value = a2.ty || 'Corps à corps (Tranchant)';
    at.onchange = () => { a2.ty = at.value; a2.t = (TYPE_ATQ[at.value] || {}).t === 'mag' ? 'mag' : 'phy'; };
    champ(g2, 'Genre', at);
    const ap2 = el('input'); ap2.type = 'text'; ap2.id = 'ped-a2p'; ap2.value = a2.p; ap2.placeholder = 'contact'; ap2.style.width = '100%';
    ap2.oninput = () => { a2.p = ap2.value; };
    champ(g2, 'Portée', ap2);
    cb.append(g2);
    const g3 = el('div'); g3.style.marginTop = '8px';
    const ae = el('input'); ae.type = 'text'; ae.id = 'ped-a2e'; ae.value = a2.e; ae.placeholder = 'le dé du rang'; ae.style.width = '100%';
    ae.oninput = () => { a2.e = ae.value; };
    champ(g3, 'Ce qu’elle fait', ae, 'Les dés s’écrivent comme dans le livre : 2d6, d8+2. « le dé du rang » reprend ses dés, « aucun dégât » n’en lance aucun.');
    cb.append(g3);
    const tb = el('button','btn ghost sm','Tirer une autre attaque'); tb.type = 'button'; tb.id = 'ped-tirer';
    tb.onclick = () => { c.a2 = tirerAttaquePnj(c.cote, c.rang, PNJ_ED.peuple, c.type); dessinerSonCombat(); };
    cb.append(tb);
    cb.append(el('p','mini', 'Elle suit son genre : « de son espèce » prend une vraie Pratique de la liste de son peuple, que son rang porte. Les Humains n’ouvrent aucune liste : leur autre attaque vient de leur genre.'));
  };
  dessinerSonCombat();
  box.append(cb);

  const act = el('div','acts'); act.style.marginTop = '12px';
  const ok = el('button','btn', nouveau ? 'Ajouter la fiche' : 'Enregistrer'); ok.type = 'button'; ok.id = 'ped-ok';
  ok.onclick = () => {
    const nom = PNJ_ED.nom.trim();
    if(!nom){ msgTable('Il lui faut un nom.', false); return; }
    const autre = pnjParNom(nom);
    if(autre && autre.id !== PNJ_ED.id){ msgTable('Il y a déjà une fiche « ' + autre.nom + ' ». Ajoute un détail au nom : « Garde du pont ».', false); return; }
    const x = normPnj(Object.assign({}, PNJ_ED, {nom:nom, valeurs:PNJ_ED.valeurs.filter(v => v.n.trim())}));
    if(nouveau) x.id = idLibre('n-' + slug(nom), T.pnj);
    const ancien = T.pnj[x.id] && !T.pnj[x.id].supprime ? T.pnj[x.id] : null;
    const neufs = PNJ_LIENS.filter(y => y.avec.trim());
    /* « ohen » pour Ohan : on ne crée pas une fiche de trop sans l'avoir demandé */
    const douteux = neufs.find(y => nomProche(y.avec.trim(), 'pnj:' + PNJ_ED.id) && y.voulu !== cleNom(y.avec));
    if(douteux){
      const q = nomProche(douteux.avec.trim(), 'pnj:' + PNJ_ED.id);
      msgTable('« ' + douteux.avec.trim() + ' » ressemble à ' + q.nom + ' : réponds sous le lien, ' + q.nom + ' ou une nouvelle fiche.', false);
      const z = document.querySelector('#ped-liens .lindice.doute'); if(z) z.scrollIntoView({block:'center', behavior:'smooth'});
      return;
    }
    /* ses PV : ceux d'aujourd'hui, pas ceux de l'ouverture de l'éditeur */
    if(x.pvMax == null){ baseVie(x, null); }
    else if(!ancien || ancien.pvMax == null){ baseVie(x, x.pvMax); }
    else {
      Object.assign(x, {pv0:ancien.pv0, majPv:ancien.majPv, vie:ancien.vie});
      recalculerVie(x);
      if(x.pvMax > ancien.pvMax) coup(x, 'pv', x.pvMax - ancien.pvMax);
    }
    x.maj = maintenant();
    x.majCombat = maintenant();
    if(!x.auteur) x.auteur = MOI.joueur || '';
    const nees = [];
    changer(() => {
      T.pnj[x.id] = x;
      /* un nom changé : les paragraphes qui le citaient par son ancien nom suivent la fiche */
      if(avantNom && avantNom.trim() !== nom) renommerMentions('pnj:' + x.id, avantNom, nom);
      if(avantNom && cleNom(avantNom) !== cleNom(nom)){
        Object.keys(T.blocs).forEach(k => {
          const b = T.blocs[k];
          if(b && b.qui && b.qui.k === 'pnj' && !b.qui.id && cleNom(b.qui.nom) === cleNom(avantNom))
            T.blocs[k] = Object.assign({}, b, {qui:{k:'pnj', id:x.id, nom:nom}, maj:maintenant()});
        });
      }
      /* ses liens : un nom inconnu reçoit une fiche minimale, qu'on complète quand on veut */
      neufs.forEach(y => {
        let ref = refParNom(y.avec);
        if(!ref){ const f = creerPnj(y.avec.trim(), ''); ref = 'pnj:' + f.id; nees.push(f.nom); }
        if(ref === 'pnj:' + x.id) return;
        const sens = y.sens || (typeLien(y.type).mutuel ? 'mutuel' : 'aller'), aller = sens !== 'retour';
        const l = normLien({id:nouvelId('l'), maj:maintenant(), cree:maintenant(), depuis:(seanceCourante() || {}).id || '', type:y.type, texte:y.texte.trim(), mutuel:sens === 'mutuel',
          de:aller ? 'pnj:' + x.id : ref, vers:aller ? ref : 'pnj:' + x.id});
        T.liens[l.id] = l;
      });
    });
    if(nees.length) msgTable('Fiche' + (nees.length > 1 ? 's' : '') + ' créée' + (nees.length > 1 ? 's' : '') + ' en même temps : ' + nees.join(', ') + '. Complète-' + (nees.length > 1 ? 'les' : 'la') + ' quand tu veux.', true);
    fermerEditeurPnj();
    PNJ_OUVERTS[x.id] = true;
    dessinerPnj(true);
  };
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button';
  non.onclick = fermerEditeurPnj;
  act.append(ok, non);
  box.append(act);
  box.scrollIntoView({block:'start', behavior:'smooth'});
  setTimeout(() => { const n = $('ped-nom'); if(n) n.focus({preventScroll:true}); }, 300);
}
function fermerEditeurPnj(){
  PNJ_ED = null; PNJ_LIENS = [];
  const box = $('pnjEditeur'); box.hidden = true; box.innerHTML = '';
}
