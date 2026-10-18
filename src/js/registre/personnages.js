/* ============ les personnages ============ */

const OUVERTS = {};          /* les fiches dépliées, dans ce navigateur */
let PED = null;              /* la fiche en cours d'édition */
let A_SUPPRIMER = null;

const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };

/* un champ en cours de frappe ne se redessine pas sous les doigts : on attend qu'on le quitte */
function occupe(box){
  const a = document.activeElement;
  return !!(box && a && a !== document.body && box.contains(a) && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName));
}
function apresSaisie(box, fn){
  if(box._attend) return;
  box._attend = true;
  const f = () => setTimeout(() => {
    if(occupe(box)) return;
    box.removeEventListener('focusout', f);
    box._attend = false;
    fn();
  }, 150);
  box.addEventListener('focusout', f);
}
/* ceux qui sont à la table de la campagne qu'on suit : pas ceux qui sont entrés dans le monde, dont la fiche de PNJ a pris
   le relais, ni ceux d'une autre campagne */
function persos(){ return persosDe(idCourante()); }
function perso(id){ const c = T.personnages[id]; return c && !c.supprime && !c.monde && dansCampagne(c) ? c : null; }
/* un personnage à la table, de n'importe quelle campagne */
function persoActif(id){ const c = T.personnages[id]; return c && !c.supprime && !c.monde ? c : null; }

function jauge(c, quelle){
  const cour = quelle === 'pv' ? 'pv' : 'pcc', max = quelle === 'pv' ? 'pvMax' : 'pcMax';
  const w = el('div','jauge');
  w.append(el('div','t', quelle === 'pv' ? 'Points de vie' : 'Points de Contenance'));
  const v = el('div','v', String(c[cour]));
  v.append(el('small', null, ' / ' + c[max]));
  w.append(v);
  const b = el('div','barre');
  const part = c[max] ? Math.max(0, Math.min(1, c[cour] / c[max])) : 0;
  const i = el('i', part <= 0.34 ? 'bas' : null);
  i.style.width = (part * 100) + '%';
  b.append(i); w.append(b);
  const cmd = el('div','cmd');
  const bouton = (txt, n) => {
    const x = el('button', null, txt); x.type = 'button';
    x.setAttribute('aria-label', txt + ' ' + (quelle === 'pv' ? 'PV' : 'PC') + ' à ' + (c.nom || 'ce personnage'));
    x.disabled = (n < 0 && c[cour] <= 0) || (n > 0 && c[cour] >= c[max]);
    x.onclick = () => changer(() => { const y = perso(c.id); if(y) coup(y, quelle === 'pv' ? 'pv' : 'pc', n); });
    return x;
  };
  cmd.append(bouton('−5', -5), bouton('−1', -1), bouton('+1', 1));
  const plein = el('button', null, '↺'); plein.type = 'button'; plein.title = 'remettre au plein';
  /* remettre au plein ne touche que sa jauge : un coup reçu ailleurs sur l'autre n'est pas effacé */
  plein.onclick = () => changer(() => { const y = perso(c.id); if(!y) return; if(quelle === 'pv') baseVie(y, y.pvMax, undefined); else baseVie(y, undefined, y.pcMax); });
  cmd.append(plein);
  w.append(cmd);
  return w;
}

function tableauCarac(c){
  const t = el('table','tab');
  const h = el('tr');
  ['Caractéristique','Valeur','×2','d20'].forEach((x, i) => h.append(el('th', i ? 'n' : null, x)));
  t.append(h);
  CARS.forEach(x => {
    const tr = el('tr');
    tr.append(el('td', null, x + ' · ' + ABBR[x]));
    tr.append(el('td','n', String(c.car[x])));
    tr.append(el('td','n', String(c.car[x] * 2)));
    tr.append(el('td','n', String(carD20(c, x))));
    t.append(tr);
  });
  return t;
}
function tableauComp(c){
  const t = el('table','tab');
  const h = el('tr');
  ['Compétence','Total','d20','Compétence','Total','d20'].forEach((x, i) => h.append(el('th', i % 3 ? 'n' : null, x)));
  t.append(h);
  const liste = ALLSKILLS.slice();
  const moitie = Math.ceil(liste.length / 2);
  for(let i = 0; i < moitie; i++){
    const tr = el('tr');
    [liste[i], liste[i + moitie]].forEach(o => {
      if(!o){ tr.append(el('td'), el('td'), el('td')); return; }
      const tot = compTotal(c, o.s);
      tr.append(el('td', null, nomComp(o.s)), el('td','n', String(tot)), el('td','n', String(d20v(tot))));
    });
    t.append(tr);
  }
  return t;
}
function tableauPrat(c){
  const t = el('table','tab');
  const h = el('tr');
  ['Pratique','Se lance','Valeur','d20','Coût'].forEach((x, i) => h.append(el('th', i > 1 ? 'n' : null, x)));
  t.append(h);
  c.pratiques.forEach(p => {
    const v = pratValeur(c, p), tr = el('tr');
    const td = el('td');
    td.append(el('b', null, p.n));
    if(p.d) td.append(el('div','mini', p.d));
    tr.append(td);
    tr.append(el('td', null, ABR_JET[p.j] || p.j));
    tr.append(el('td','n', v.val == null ? '–' : String(v.val) + (v.par ? ' (' + v.par + ')' : '')));
    tr.append(el('td','n', v.val == null ? '–' : String(d20v(v.val))));
    tr.append(el('td','n', p.base ? 'de base' : p.banniere ? 'Bannière' : p.pct ? p.pct : p.pc ? p.pc + ' PC' : 'gratuit'));
    t.append(tr);
  });
  return t;
}

function detailPerso(c){
  const d = el('div','detail');
  const sc = (n, noeud) => { d.append(el('h3', null, n)); const s = el('div','scroll'); s.append(noeud); d.append(s); };
  sc('Caractéristiques', tableauCarac(c));
  sc('Compétences', tableauComp(c));
  if(c.pratiques.length) sc('Pratiques', tableauPrat(c));
  if(c.armes.length){
    const t = el('table','tab');
    const h = el('tr'); ['Arme','Dé','Notes'].forEach((x, i) => h.append(el('th', i === 1 ? 'n' : null, x))); t.append(h);
    c.armes.forEach(a => { const tr = el('tr'); const p = porteeArme(a);
      tr.append(el('td', null, a.nom), el('td','n', a.de), el('td','mini', [p ? p + ' pas' : 'au contact', a.notes].filter(Boolean).join(' · '))); t.append(tr); });
    sc('Armes', t);
  }
  /* ce qu'il porte : son sac et sa bourse vivent dans le Registre des Marchefleurs */
  const sac = [];
  const porte = ['armure','bouclier'].map(s => porteDe(c.id, s)).filter(Boolean);
  const objets = objetsDe(c.id).filter(o => !o.porte);
  if(porte.length) sac.push('Porte : ' + porte.map(o => o.nom).join(', '));
  if(objets.length) sac.push(objets.slice(0, 12).map(o => o.nom + (o.n > 1 ? ' ×' + o.n : '')).join(' · ') + (objets.length > 12 ? ' · et ' + (objets.length - 12) + ' de plus' : ''));
  sac.push('Bourse : ' + texteArgent(bourseDe(c.id)));
  sac.push('Réduction ' + redDe(c));
  d.append(el('h3', null, 'Ce qu’il porte'));
  d.append(el('p','mini', sac.join(' · ')));
  const vf = el('a','mini', 'Son sac, sa bourse et le marché, dans le Registre des Marchefleurs');
  vf.href = 'marchefleurs.html#pj=' + encodeURIComponent(c.id); vf.target = ONGLET_FICHE;
  d.append(vf);
  [['traits','Traits'],['contrainte','Contrainte'],['armure','Armure'],['peupleComp','Compétence de peuple']].forEach(([k, l]) => {
    if(c[k]){ const p = el('p','mini'); p.append(el('b', null, l + ' : '), document.createTextNode(c[k])); d.append(p); }
  });

  /* ses liens avec les autres : on les tisse dans le Registre des Visages */
  d.append(el('h3', null, 'Ses liens'));
  const ls = liensDe('pj:' + c.id);
  if(ls.length) d.append(liensEnBref('pj:' + c.id));
  const vers = el('a','mini', ls.length ? 'Les voir et en tisser d’autres, dans le Registre des Visages' : 'Aucun pour l’instant. En tisser, dans le Registre des Visages');
  vers.href = 'pnj.html#pj-' + encodeURIComponent(c.id); vers.target = ONGLET_VISAGES;
  d.append(vers);

  d.append(el('h3', null, 'Ce qu’il est'));
  const zone = el('textarea'); zone.rows = 5; zone.value = c.texte;
  /* sa fiche est à son joueur : les autres la lisent */
  if(!estAMoi('personnages', c.id)){ zone.readOnly = true; zone.title = joueurDe(c) ? 'Seul son joueur, ' + joueurDe(c) + ', l’écrit.' : 'Seul son joueur l’écrit.'; }
  zone.placeholder = 'Son histoire, sa voix, ce qu’il cherche. « / » puis un nom cite quelqu’un, « -- » puis un nom cite un lieu. Ce que tu écris ici part dans la table.';
  zone.onchange = () => surPerso(c.id, y => { y.texte = zone.value; });
  d.append(zone);
  brancherMentions(zone);
  return d;
}

function carte(c){
  const w = el('div','pcarte' + (MOI.perso === c.id ? ' moi' : ''));
  w.setAttribute('data-perso', c.id);
  const t = el('div');
  t.append(el('div','pnom', c.nom || 'Sans nom'));
  const qui = [joueurDe(c) ? 'joué par ' + joueurDe(c) : '', c.peuple, c.voie].filter(Boolean).join(' · ');
  t.append(el('div','pqui', qui || 'personne ne le tient'));
  w.append(t);

  const j = el('div','jauges');
  j.append(jauge(c, 'pv'), jauge(c, 'pc'));
  w.append(j);

  const act = el('div','pact');
  const ouvert = !!OUVERTS[c.id];
  const b1 = el('button','btn ghost sm', ouvert ? 'Replier' : 'Voir la fiche'); b1.type = 'button';
  b1.onclick = () => { OUVERTS[c.id] = !ouvert; dessinerPersos(); };
  const b2 = el('button','btn ghost sm','Lancer pour lui'); b2.type = 'button';
  b2.onclick = () => {
    if(!seanceCourante()){ msgTable('Commence d’abord une séance : les jets s’y écrivent.', false); $('secSeance').scrollIntoView({block:'start', behavior:'smooth'}); return; }
    composerPour(c);
  };
  const b3 = el('button','btn ghost sm','Modifier'); b3.type = 'button';
  b3.onclick = () => ouvrirEditeurPerso(c, false);
  const b4 = el('button','btn ghost sm' + (MOI.perso === c.id ? '' : ''), MOI.perso === c.id ? 'C’est le mien' : 'C’est le mien ?'); b4.type = 'button';
  b4.setAttribute('aria-pressed', MOI.perso === c.id ? 'true' : 'false');
  b4.onclick = () => { MOI.perso = MOI.perso === c.id ? '' : c.id; if(MOI.perso && MOI.joueur && !c.joueur) surPerso(c.id, y => { y.joueur = MOI.joueur; }); else { sauverLocal(); dessiner(); } };
  const arme = A_SUPPRIMER === c.id;
  const b5 = el('button','btn ghost sm' + (arme ? ' danger' : ''), arme ? 'Confirmer' : 'Retirer'); b5.type = 'button';
  b5.onclick = () => {
    if(arme){ A_SUPPRIMER = null; surPerso(c.id, y => { y.supprime = true; }); }
    else { A_SUPPRIMER = c.id; dessinerPersos(); setTimeout(() => { if(A_SUPPRIMER === c.id){ A_SUPPRIMER = null; dessinerPersos(); } }, 5000); }
  };
  const b6 = el('button','btn ghost sm','Sa fiche'); b6.type = 'button';
  b6.title = 'Sa fiche, son sac, sa bourse et sa progression, dans le Registre des Marchefleurs';
  b6.onclick = () => ouvrirPage('marchefleurs.html#pj=' + encodeURIComponent(c.id), ONGLET_FICHE);
  /* le personnage d'un autre joueur : on le voit, on suit ses PV à la table, mais sa fiche et ses jets sont à lui */
  if(estAMoi('personnages', c.id)) act.append(b1, b2, b3, b4, b6, b5);
  else act.append(b1, b6);
  w.append(act);
  if(ouvert) w.append(detailPerso(c));
  return w;
}

function dessinerPersos(){
  const box = $('pListe'); if(!box) return;
  if(occupe(box)){ apresSaisie(box, dessinerPersos); return; }
  box.innerHTML = '';
  const liste = persos();
  if(!liste.length){
    box.append(el('p','vide','Personne à la table. Importe une fiche du Registre du Havre, ou crée-la à la main.'));
    return;
  }
  liste.forEach(c => box.append(carte(c)));
}

/* ---------- l'éditeur ---------- */
function champ(parent, lab, noeud, aide){
  const w = el('div');
  const l = el('label','lab', lab);
  if(noeud.id) l.htmlFor = noeud.id;
  w.append(l);
  w.append(noeud);
  if(aide) w.append(el('p','mini', aide));
  parent.append(w);
  return noeud;
}
function nombre(val, min, max){
  const i = el('input'); i.type = 'number'; i.value = val; i.min = min; i.max = max; i.inputMode = 'numeric'; i.style.width = '90px';
  return i;
}

let PED0 = null;             /* la fiche telle qu'elle était à l'ouverture de l'éditeur */
function ouvrirEditeurPerso(c, nouveau){
  PED = normPerso(JSON.parse(JSON.stringify(c)));
  PED0 = JSON.parse(JSON.stringify(PED));
  if(nouveau){ PED.id = nouvelId('p'); PED.campagne = idCourante(); }
  const box = $('pEditeur'); box.innerHTML = ''; box.hidden = false;
  box.append(el('h3', null, nouveau ? 'Un personnage de plus' : 'Modifier ' + (PED.nom || 'la fiche')));

  const id = el('div','table');
  champ(id, 'Nom', Object.assign(el('input'), {type:'text', value:PED.nom, oninput:e => PED.nom = e.target.value, style:'width:100%'}));
  champ(id, 'Joué par', Object.assign(el('input'), {type:'text', value:PED.joueur || MOI.joueur, oninput:e => PED.joueur = e.target.value, style:'width:100%'}));
  champ(id, 'Peuple', Object.assign(el('input'), {type:'text', value:PED.peuple, oninput:e => PED.peuple = e.target.value, style:'width:100%'}));
  champ(id, 'Voie', Object.assign(el('input'), {type:'text', value:PED.voie, oninput:e => PED.voie = e.target.value, style:'width:100%'}));
  /* avec plusieurs campagnes, dans laquelle il joue : on peut le faire passer de l'une à l'autre */
  if(plusieursCampagnes()){
    const sc = el('select'); sc.id = 'ped-campagne';
    campagnes().forEach(x => sc.add(new Option(x.nom + (x.etat === 'finie' ? ' (terminée)' : ''), x.id)));
    sc.value = idCampagneDe(PED);
    sc.onchange = () => { PED.campagne = sc.value; };
    champ(id, 'Campagne', sc);
  }
  box.append(id);

  box.append(el('h3', null, 'Caractéristiques'));
  const gc = el('div','table');
  CARS.forEach(x => {
    const i = nombre(PED.car[x], 1, 30);
    i.oninput = () => {
      const avant = PED.car[x];
      PED.car[x] = Math.max(1, +i.value || 0);
      compsSuivies(PED).forEach(o => { if(o.car === x) PED.comp[o.s] += (PED.car[x] - avant) * 2; });
      if(x === 'Constitution'){ const dv = PED.car[x] - avant; PED.pvMax += dv; PED.pv = Math.max(0, Math.min(PED.pvMax, PED.pv + dv)); }
      if(x === 'Contenance'){ const av = PED.pcMax; PED.pcMax = Math.floor(PED.car[x] / 2); PED.pcc = Math.max(0, Math.min(PED.pcMax, PED.pcc + PED.pcMax - av)); }
      majApercuEditeur();
    };
    champ(gc, x + ' · ' + ABBR[x], i);
  });
  box.append(gc);

  box.append(el('h3', null, 'Compétences, total écrit sur la fiche'));
  const gs = el('div','table');
  ALLSKILLS.forEach(o => {
    const i = nombre(compTotal(PED, o.s), 0, 200);
    i.oninput = () => { PED.comp[o.s] = Math.max(0, +i.value || 0); majApercuEditeur(); };
    champ(gs, nomComp(o.s), i);
  });
  box.append(gs);

  box.append(el('h3', null, 'Vie, Contenance et armure'));
  const gv = el('div','table');
  champ(gv, 'PV maximum', Object.assign(nombre(PED.pvMax, 1, 200), {oninput:e => { PED.pvMax = Math.max(1, +e.target.value || 1); PED.pv = Math.min(PED.pv, PED.pvMax); majApercuEditeur(); }}));
  champ(gv, 'PC maximum', Object.assign(nombre(PED.pcMax, 0, 100), {oninput:e => { PED.pcMax = Math.max(0, +e.target.value || 0); PED.pcc = Math.min(PED.pcc, PED.pcMax); }}));
  champ(gv, 'Armure naturelle', Object.assign(nombre(PED.red, 0, 20), {oninput:e => PED.red = Math.max(0, +e.target.value || 0)}),
    'Ce que son corps arrête. L’armure et le bouclier qu’il porte s’y ajoutent, dans le Registre des Marchefleurs.');
  const sb = el('select');
  [[40, 'Non humain : +20 de base, +20 de domaine'], [30, 'Humain : +20 de base, +10 d’école']].forEach(([v, l]) => sb.add(new Option(l, String(v))));
  sb.value = String(PED.bonusPratique);
  sb.onchange = () => { PED.bonusPratique = +sb.value; majApercuEditeur(); };
  champ(gv, 'Bonus de Pratique', sb);
  box.append(gv);

  box.append(el('h3', null, 'Pratiques'));
  const pbox = el('div'); pbox.id = 'ed-prats';
  box.append(pbox);
  const plus = el('button','btn ghost sm','Ajouter une Pratique'); plus.type = 'button';
  plus.onclick = () => { PED.pratiques.push({n:'', j:'aucun jet', pc:0, pct:'', d:'', base:false, banniere:false}); dessinerPratsEditeur(); };
  box.append(plus);

  box.append(el('h3', null, 'Armes'));
  const abox = el('div'); abox.id = 'ed-armes';
  box.append(abox);
  const plusA = el('button','btn ghost sm','Ajouter une arme'); plusA.type = 'button';
  plusA.onclick = () => { PED.armes.push({nom:'', de:'d6', notes:'', portee:null}); dessinerArmesEditeur(); };
  box.append(plusA);

  if(!nouveau) box.append(el('p','mini', $('ficheBox') ? 'Le sac, la bourse et l’armure portée se tiennent dans l’onglet « Son équipement ».' : 'Le sac, la bourse et l’armure portée se tiennent dans le Registre des Marchefleurs.'));

  const zone = el('textarea'); zone.rows = 4; zone.value = PED.texte;
  zone.placeholder = 'Son histoire, sa voix, ce qu’il cherche. « / » puis un nom cite quelqu’un, « -- » puis un nom cite un lieu.';
  zone.oninput = () => PED.texte = zone.value;
  box.append(el('h3', null, 'Ce qu’il est'));
  box.append(zone);
  brancherMentions(zone);

  const act = el('div','acts'); act.style.marginTop = '12px';
  const ok = el('button','btn', nouveau ? 'Ajouter à la table' : 'Enregistrer'); ok.type = 'button'; ok.id = 'ped-ok';
  ok.onclick = () => {
    if(!PED.nom.trim()){ msgTable('Il lui faut un nom.', false); return; }
    /* entré dans le monde pendant qu'on le retouchait : sa fiche de PNJ a pris le relais, on ne le ramène pas en douce */
    const parti = !nouveau && T.personnages[PED.id];
    if(parti && !parti.supprime && parti.monde){ msgTable('« ' + (parti.nom || 'Sans nom') + ' » est entré dans le monde entre-temps. Reprends-le d’abord, dans le Registre des Marchefleurs.', false); return; }
    const cible = idCampagneDe(PED);
    /* un même nom ne se joue pas deux fois, d'une campagne à l'autre : les mentions, les liens et les fiches le prennent pour une seule personne */
    const autre = persoALaTable(PED.nom, PED.id);
    if(autre){ msgTable('« ' + autre.nom + ' » est déjà ' + dejaALaTable(autre) + '.', false); return; }
    let c2 = normPerso(PED);
    if(nouveau){ c2.id = idLibre('p-' + slug(c2.nom), T.personnages); rattacher(c2, cible); }
    /* la fiche telle qu'elle est aujourd'hui, de n'importe quelle campagne : on a pu en changer pendant que l'éditeur était ouvert */
    const cur = !nouveau && persoActif(c2.id);
    changer(() => {
      if(!cur){ baseVie(c2, c2.pvMax, c2.pcMax); majPerso(c2); return; }
      /* la fiche d'aujourd'hui, et seulement ce qu'on a changé dans l'éditeur : une progression, un combat
         ou une retouche ailleurs pendant qu'il était ouvert ne sont pas effacés */
      const x = normPerso(JSON.parse(JSON.stringify(cur)));
      const change = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
      ['nom','joueur','peuple','voie','red','bonusPratique','pratiques','armes','texte'].forEach(k => { if(change(c2[k], PED0[k])) x[k] = c2[k]; });
      /* passé dans une autre campagne : sa date à lui, pour que la fusion le suive */
      if(idCampagneDe(c2) !== idCampagneDe(PED0)) rattacher(x, idCampagneDe(c2));
      CARS.forEach(k => { if(c2.car[k] !== PED0.car[k]) x.car[k] = c2.car[k]; });
      ALLSKILLS.forEach(o => { if(c2.comp[o.s] !== PED0.comp[o.s]) x.comp[o.s] = c2.comp[o.s]; });
      const dPv = c2.pvMax - PED0.pvMax, dPc = c2.pcMax - PED0.pcMax;
      if(dPv){ x.pvMax = Math.max(1, x.pvMax + dPv); if(dPv > 0) coup(x, 'pv', dPv); }
      if(dPc){ x.pcMax = Math.max(0, x.pcMax + dPc); if(dPc > 0) coup(x, 'pc', dPc); }
      recalculerVie(x);
      const renomme = change(c2.nom, PED0.nom) && PED0.nom.trim();
      c2 = x;
      majPerso(x);
      /* un nom changé ici : les textes qui le citaient (« /Toum’Balin ») suivent, le sien compris */
      if(renomme) renommerMentions('pj:' + x.id, PED0.nom, x.nom.trim());
    });
    if(!MOI.perso && c2.joueur === MOI.joueur){ MOI.perso = c2.id; sauverLocal(); }
    fermerEditeurPerso();
  };
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button';
  non.onclick = fermerEditeurPerso;
  act.append(ok, non);
  box.append(act);
  box.append(el('p','mini apercu2'));

  dessinerPratsEditeur(); dessinerArmesEditeur(); majApercuEditeur();
  box.scrollIntoView({block:'start', behavior:'smooth'});
}
function dessinerPratsEditeur(){
  const box = $('ed-prats'); if(!box) return;
  box.innerHTML = '';
  PED.pratiques.forEach((p, i) => {
    const l = el('div','table'); l.style.marginBottom = '6px';
    champ(l, 'Nom', Object.assign(el('input'), {type:'text', value:p.n, oninput:e => { p.n = e.target.value; }, style:'width:100%'}));
    const s = el('select');
    REG_JETS_CAR.concat(JETS_SANS).forEach(j => s.add(new Option(j, j)));
    s.value = p.j; s.onchange = () => { p.j = s.value; majApercuEditeur(); };
    champ(l, 'Se lance sous', s);
    champ(l, 'PC', Object.assign(nombre(p.pc, 0, 9), {oninput:e => p.pc = Math.max(0, +e.target.value || 0), style:'width:70px'}));
    const d = el('input'); d.type = 'text'; d.value = p.d; d.style.width = '100%';
    d.oninput = () => p.d = d.value;
    champ(l, 'Ce qu’elle fait', d);
    const x = el('button','btn ghost sm','Retirer'); x.type = 'button';
    x.onclick = () => { PED.pratiques.splice(i, 1); dessinerPratsEditeur(); majApercuEditeur(); };
    const w = el('div'); w.append(el('label','lab', ' ')); w.append(x);
    l.append(w);
    box.append(l);
  });
}
function dessinerArmesEditeur(){
  const box = $('ed-armes'); if(!box) return;
  box.innerHTML = '';
  PED.armes.forEach((a, i) => {
    const l = el('div','table'); l.style.marginBottom = '6px';
    champ(l, 'Arme', Object.assign(el('input'), {type:'text', value:a.nom, oninput:e => a.nom = e.target.value, style:'width:100%'}));
    champ(l, 'Dé', Object.assign(el('input'), {type:'text', value:a.de, oninput:e => a.de = e.target.value, style:'width:80px'}));
    /* sa portée, en pas, pour la carte de combat : vide, elle se lit sur le nom de l'arme */
    champ(l, 'Portée', Object.assign(el('input'), {type:'number', min:'0', max:'500', value:a.portee == null ? '' : a.portee,
      placeholder:String(porteeArme(Object.assign({}, a, {portee:null})) || 0),
      oninput:e => a.portee = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0), style:'width:80px'}), 'En pas. Vide : celle de son nom.');
    champ(l, 'Notes', Object.assign(el('input'), {type:'text', value:a.notes, oninput:e => a.notes = e.target.value, style:'width:100%'}));
    const x = el('button','btn ghost sm','Retirer'); x.type = 'button';
    x.onclick = () => { PED.armes.splice(i, 1); dessinerArmesEditeur(); };
    const w = el('div'); w.append(el('label','lab', ' ')); w.append(x);
    l.append(w);
    box.append(l);
  });
}
function majApercuEditeur(){
  const p = document.querySelector('#pEditeur .apercu2');
  if(!p || !PED) return;
  const bouts = CARS.map(c => ABBR[c] + ' ' + PED.car[c]);
  p.textContent = bouts.join(' · ') + ' · PV ' + PED.pvMax + ' · PC ' + PED.pcMax +
    (PED.pratiques.length ? ' · ' + PED.pratiques.length + ' Pratique' + (PED.pratiques.length > 1 ? 's' : '') : '');
}
function fermerEditeurPerso(){
  PED = null; PED0 = null;
  const box = $('pEditeur'); box.hidden = true; box.innerHTML = '';
}
