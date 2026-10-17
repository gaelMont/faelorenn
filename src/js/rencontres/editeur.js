/* ---------- l'editeur ---------- */
function champ(parent, id, label, noeud, aide){
  const w = el('div','fld');
  const l = el('label', null, label); l.htmlFor = id;
  noeud.id = id;
  w.append(l, noeud);
  if(aide) w.append(el('p','aide', aide));
  const err = el('p','err'); err.id = id + '-err'; err.hidden = true;
  w.append(err);
  parent.append(w);
  return noeud;
}
function saisie(type, val, ph){ const i = el('input'); i.type = type; i.value = val == null ? '' : val; if(ph) i.placeholder = ph; return i; }
function zone(val, ph, lignes){ const t = el('textarea'); t.value = val || ''; if(ph) t.placeholder = ph; t.rows = lignes || 2; return t; }

function ouvrirEditeur(c, nouveau){
  ED = {c:normalise(c), nouveau:!!nouveau};
  if(nouveau && c && c.id && trouveId(c.id)) ED.c.id = nouvelId();
  const box = $('bestEditeur'); box.innerHTML = ''; box.hidden = false;
  const c0 = ED.c;
  /* une entrée du livre qu'on retouche : ta version prend sa place, son rang ne change pas */
  const livre = ED.livre = estRetouche(c0);
  /* les tables partagées qu'il porte : on les coche ici, elles s'enregistrent avec lui */
  ED.tables = TABLES_BUTIN.filter(t => t.qui.indexOf(c0.id) >= 0).map(t => t.k);

  const tete = el('div','edtete');
  tete.append(el('h3', null, livre ? 'Retoucher « ' + ((ORIGINAUX[c0.id] || {}).n || c0.n) + ' », entrée du livre'
    : nouveau ? 'Nouvelle créature' : 'Modifier ' + (c0.n || 'la créature')));
  if(livre) tete.append(el('p','aide', 'Ta version remplace celle du livre partout : dans les tirages, dans ce bestiaire et à la table. « Revenir au livre » la défait ; les tables partagées qu’elle porte restent cochées.'));
  box.append(tete);

  const grille = el('div','edgrille');
  const form = el('div','edform'), cote = el('div','edcote');
  grille.append(form, cote); box.append(grille);

  /* identite */
  const g1 = el('fieldset'); g1.append(el('legend', null, 'Ce qui le définit'));
  const nom = champ(g1, 'ed-nom', 'Nom', saisie('text', c0.n, 'Le Glaneur de verre'));
  nom.maxLength = 120;
  nom.oninput = () => { ED.c.n = nom.value; majApercu(); };

  const rw = el('div','fld'); rw.append(el('span','lab','Rang'));
  const rseg = el('div','rseg'); rseg.setAttribute('role','radiogroup'); rseg.setAttribute('aria-label','Rang');
  ADV.rangs.forEach(r => {
    const b = el('button', null); b.type = 'button'; b.id = 'ed-rang-' + r.r;
    b.setAttribute('role','radio');
    b.append(el('b', null, r.r + ' · ' + r.nom), el('span', null, r.pv + ' PV · ' + r.deg + ' · réd. ' + r.red + ' · ' + COUT[r.r] + ' pt' + (COUT[r.r] > 1 ? 's' : '')));
    b.onclick = () => changerRang(r.r);
    b.disabled = livre && r.r !== c0.r;
    rseg.append(b);
  });
  rw.append(rseg);
  if(livre) rw.append(el('p','aide','Une entrée du livre garde son rang. Pour un autre rang, fais-en une variante.'));
  g1.append(rw);

  const fw = el('div','fld'); fw.append(el('span','lab','Familles'));
  const fseg = el('div','famsel'); fseg.id = 'ed-familles';
  fw.append(fseg);
  /* creer une famille sans quitter la creature */
  const fnew = el('div','famnew'); fnew.hidden = true;
  const fnom = saisie('text', '', 'Les gens de la digue'); fnom.id = 'ed-famnom'; fnom.maxLength = 60;
  fnom.setAttribute('aria-label', 'Nom de la nouvelle famille');
  const fok = el('button','btn sm','Créer la famille'); fok.type = 'button'; fok.id = 'ed-famok';
  const fnon = el('button','btn ghost sm','Annuler'); fnon.type = 'button';
  const ferr = el('p','err'); ferr.id = 'ed-famnom-err'; ferr.hidden = true;
  fnew.append(fnom, fok, fnon);
  fw.append(fnew, ferr);
  const replier = () => { fnew.hidden = true; ferr.hidden = true; fnom.value = ''; fnom.removeAttribute('aria-invalid'); };
  const creer = () => {
    const pb = problemeNomFamille(fnom.value, null);
    if(pb){ ferr.textContent = pb; ferr.hidden = false; fnom.setAttribute('aria-invalid', 'true'); fnom.focus(); return; }
    const f = enregistrerFam({l:fnom.value});
    ED.c.t.push(f.k);
    replier();
    draw();
    const b = $('ed-fam-' + f.k); if(b) b.focus();
  };
  fok.onclick = creer;
  fnon.onclick = replier;
  fnom.onkeydown = e => {
    if(e.key === 'Enter'){ e.preventDefault(); creer(); }
    else if(e.key === 'Escape'){ e.preventDefault(); replier(); }
  };
  ED.redessinerFamilles = () => chipsFamilles(fseg, () => { fnew.hidden = false; fnom.focus(); });
  ED.redessinerFamilles();
  fw.append(el('p','aide','Elles décident dans quels tirages il peut sortir. Un adversaire peut en avoir plusieurs.'));
  g1.append(fw);

  form.append(g1);

  /* les traits : ils remplissent le reste */
  const gT = el('fieldset','traits'); gT.append(el('legend', null, 'Ses traits'));
  gT.append(el('p','aide','Choisis-les, et l’attaque propre, les chiffres, les renforts et une première phrase se remplissent tout seuls. Tu retouches ensuite ce que tu veux : les traits ne réécrivent pas ce que tu as écrit à la main.'));
  const tbox = el('div'); tbox.id = 'ed-traits';
  gT.append(tbox);
  form.append(gT);

  const gP = el('fieldset'); gP.append(el('legend', null, 'Ce qui fait la scène'));
  const part = champ(gP, 'ed-part', 'Ce qu’il a de particulier', zone(c0.p, 'Une phrase qui fait la scène, comme dans le livre.', 3),
    'C’est elle qui fait la scène. Le rang donne les chiffres.');
  part.oninput = () => { ED.c.p = part.value; majApercu(); };
  form.append(gP);

  /* attaque propre */
  const g2 = el('fieldset'); g2.append(el('legend', null, 'Son attaque propre'));
  g2.append(el('p','aide','L’attaque de rang lui est donnée d’office : contact, physique, au dé de son rang. Celle-ci est la seconde, et il n’en utilise qu’une par round.'));
  const l2 = el('div','ligne2');
  const anom = champ(l2, 'ed-anom', 'Nom de l’attaque', saisie('text', c0.a2.n, 'Éclat de lune'));
  anom.oninput = () => { ED.c.a2.n = anom.value; majApercu(); };
  const port = champ(l2, 'ed-aport', 'Portée', saisie('text', c0.a2.p, 'contact'));
  port.setAttribute('list', 'ed-portees');
  const dl = el('datalist'); dl.id = 'ed-portees';
  PORTEES.forEach(x => dl.append(new Option(x, x)));
  l2.append(dl);
  port.oninput = () => { ED.c.a2.p = port.value; majApercu(); };
  g2.append(l2);

  const tw = el('div','fld'); tw.append(el('span','lab','Type'));
  const tseg = el('div','seg');
  [['phy','Physique'],['mag','Magique']].forEach(([k, l]) => {
    const b = el('button', null, l); b.type = 'button'; b.id = 'ed-atype-' + k;
    b.setAttribute('aria-pressed', c0.a2.t === k ? 'true' : 'false');
    b.onclick = () => {
      /* un autre type : celui qu'écrivait le bestiaire ne tient plus */
      if(ED.c.a2.t !== k){ delete ED.c.a2.ty; delete ED.c.a2.elt; }
      ED.c.a2.t = k;
      if(k === 'phy') ED.c.a2.el = '';
      tseg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      majApercu();
    };
    tseg.append(b);
  });
  tw.append(tseg);
  tw.append(el('p','aide','La réduction arrête le physique. Elle n’arrête le magique que si l’élément envoie de la matière. Un humain compte le magique une fois et demie.'));
  g2.append(tw);

  const eff = champ(g2, 'ed-aeff', 'Ce qu’elle fait', zone(c0.a2.e, 'le dé du rang, et la cible recule de 5 pas', 2));
  eff.oninput = () => { ED.c.a2.e = eff.value; majApercu(); };
  const ins = el('button','lien','Insérer « le dé du rang »'); ins.type = 'button';
  ins.onclick = () => {
    const a = eff.selectionStart || eff.value.length, b = eff.selectionEnd || a;
    eff.value = eff.value.slice(0, a) + 'le dé du rang' + eff.value.slice(b);
    ED.c.a2.e = eff.value; eff.focus(); majApercu();
  };
  eff.parentNode.insertBefore(ins, eff.nextSibling);
  eff.parentNode.append(el('p','aide','« le dé du rang » devient tout seul d6, d8+2 ou ce que vaut son rang, même s’il change de rang.'));
  form.append(g2);

  /* ajustements */
  const g3 = el('details'); g3.id = 'ed-ajust';
  const aj = c0.mod;
  g3.open = !!(aj.pv || aj.red || aj.deg || aj.cartes || c0.renf);
  g3.append(el('summary', null, 'Ajustements et renforts'));
  g3.append(el('p','aide','Laisse vide pour garder ce que donne le rang. Le livre le fait aussi : « réduction 4 au lieu de 2 ».'));
  const l3 = el('div','ligne4');
  const ajuster = (k, id, lab, ph, type) => {
    const i = champ(l3, id, lab, saisie(type || 'number', aj[k], ph));
    if((type || 'number') === 'number'){ i.min = k === 'cartes' ? 1 : 0; i.max = k === 'cartes' ? 4 : 999; i.inputMode = 'numeric'; }
    i.oninput = () => { ED.c.mod[k] = i.value.trim(); majApercu(); };
    return i;
  };
  ajuster('pv', 'ed-pv', 'PV', '');
  ajuster('red', 'ed-red', 'Réduction', '');
  ajuster('deg', 'ed-deg', 'Dé de rang', '', 'text');
  ajuster('cartes', 'ed-cartes', 'Cartes', '');
  g3.append(l3);
  const renf = champ(g3, 'ed-renf', 'Renforts', zone(c0.renf, 'Il arrive avec quatre Ordinaires, et il les envoie devant.', 2),
    'Ils ne coûtent rien au budget : c’est déjà payé dans son rang.');
  renf.oninput = () => { ED.c.renf = renf.value; majApercu(); };
  form.append(g3);

  /* son butin : sa propre table, et les tables partagées qu'il porte */
  const gB = el('fieldset','butin'); gB.append(el('legend', null, 'Son butin'));
  gB.append(el('p','aide','Ce qu’on trouve sur lui quand on le fouille, à la table. Sa propre table, une ligne par objet ; et, si tu veux, des tables partagées avec d’autres.'));
  const zb = champ(gB, 'ed-butin', 'Sa propre table', zone(c0.butin, 'Une ligne par objet. « 1-2 Une dent en or », « 3 Une corde » : on lance un d3. Sans numéros, une ligne au hasard.', 4));
  const apb = el('p','aide butap'); apb.id = 'ed-butin-apercu';
  zb.parentNode.insertBefore(apb, zb.nextSibling);
  const majB = () => { apb.textContent = resumeTable(ED.c.butin); };
  zb.oninput = () => { ED.c.butin = zb.value; majB(); };
  majB();
  const tw2 = el('div','fld'); tw2.append(el('span','lab','Les tables partagées qu’il porte'));
  const tseg2 = el('div','seg'); tseg2.id = 'ed-tables';
  tw2.append(tseg2);
  const tnew = el('div','famnew'); tnew.hidden = true;
  const tnom = saisie('text', '', 'Les poches d’un bandit'); tnom.id = 'ed-tablenom'; tnom.maxLength = 60;
  tnom.setAttribute('aria-label', 'Nom de la nouvelle table');
  const tok = el('button','btn sm','Créer la table'); tok.type = 'button'; tok.id = 'ed-tableok';
  const tnon = el('button','btn ghost sm','Annuler'); tnon.type = 'button';
  const terr = el('p','err'); terr.id = 'ed-tablenom-err'; terr.hidden = true;
  tnew.append(tnom, tok, tnon);
  tw2.append(tnew, terr);
  const treplier = () => { tnew.hidden = true; terr.hidden = true; tnom.value = ''; tnom.removeAttribute('aria-invalid'); };
  const tcreer = () => {
    const pb = problemeNomTable(tnom.value, null);
    if(pb){ terr.textContent = pb; terr.hidden = false; tnom.setAttribute('aria-invalid', 'true'); tnom.focus(); return; }
    const t = enregistrerTable({l:tnom.value});
    ED.tables.push(t.k);
    treplier();
    draw();
    const b = $('ed-table-' + t.k); if(b) b.focus();
  };
  tok.onclick = tcreer;
  tnon.onclick = treplier;
  tnom.onkeydown = e => {
    if(e.key === 'Enter'){ e.preventDefault(); tcreer(); }
    else if(e.key === 'Escape'){ e.preventDefault(); treplier(); }
  };
  ED.redessinerTables = () => chipsTables(tseg2, () => { tnew.hidden = false; tnom.focus(); });
  ED.redessinerTables();
  tw2.append(el('p','aide','Une table partagée s’écrit une fois, dans « Tes tables de butin », plus bas.'));
  gB.append(tw2);
  form.append(gB);

  /* pour le bestiaire */
  const g4 = el('details'); g4.id = 'ed-lore';
  g4.open = LORE.some(x => x.k !== 'butin' && c0[x.k]);
  g4.append(el('summary', null, 'Pour le bestiaire'));
  g4.append(el('p','aide','Rien de tout ça n’est obligatoire. C’est ce qui sort dans l’export Word, pas dans la rencontre.'));
  LORE.filter(x => x.k !== 'butin').forEach(x => {
    const t = champ(g4, 'ed-' + x.k, x.l, zone(c0[x.k], x.ph, x.k === 'desc' || x.k === 'notes' || x.k === 'butin' ? 3 : 2));
    t.oninput = () => { ED.c[x.k] = t.value; };
  });
  form.append(g4);

  /* boutons */
  const act = el('div','acts edact');
  const ok = el('button','btn', livre ? 'Enregistrer la retouche' : nouveau ? 'Ajouter au bestiaire' : 'Enregistrer'); ok.type = 'button'; ok.id = 'ed-ok';
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button'; non.id = 'ed-non';
  ok.onclick = validerEditeur;
  non.onclick = fermerEditeur;
  const msg = el('p','err'); msg.id = 'ed-msg'; msg.hidden = true;
  act.append(ok, non);
  if(livre && RETOUCHES.some(x => x.id === c0.id)){
    const rv = el('button','btn ghost sm','Revenir au livre'); rv.type = 'button'; rv.id = 'ed-revenir';
    rv.onclick = () => {
      if(rv.classList.contains('danger')){ oterRetouche(c0.id); return; }
      rv.classList.add('danger'); rv.textContent = 'Confirmer : ta version disparaît' + (tablesDe(c0).length ? ', ses tables restent' : '');
      setTimeout(() => { if(rv.isConnected){ rv.classList.remove('danger'); rv.textContent = 'Revenir au livre'; } }, 5000);
    };
    act.append(rv);
  }
  form.append(act, msg);

  /* apercu */
  cote.append(el('p','lab','Comme il sortira en rencontre'));
  const ap = el('div','enc apercu'); ap.id = 'apercu';
  cote.append(ap);
  cote.append(el('p','lab','Comme il s’écrira dans le livre'));
  const li = el('pre','ligneLivre'); li.id = 'ligneLivre';
  cote.append(li);

  majRang(); dessinerTraits(); majApercu();
  box.scrollIntoView({block:'start', behavior:'smooth'});
  nom.focus({preventScroll:true});
}

/* ---------- les traits dans l'editeur ---------- */
function dessinerTraits(){
  const box = $('ed-traits');
  if(!box || !ED) return;
  box.innerHTML = '';
  const r = ED.c.r;
  GROUPES.forEach(G => {
    const w = el('div','tgr');
    w.append(el('span','lab', G.l));
    (G.sous || [{}]).forEach((sous, i) => {
      if(sous.l) w.append(el('p','tsous', sous.l));
      const seg = el('div','seg');
      if(G.vide && !i){
        const b = el('button', null, G.vide); b.type = 'button'; b.id = 'ed-tr-rien-' + G.g;
        const aucun = !ED.c.tr.some(k => TRAIT[k] && TRAIT[k].g === G.g);
        b.setAttribute('aria-pressed', aucun ? 'true' : 'false');
        b.onclick = () => {
          const cur = ED.c.tr.find(k => TRAIT[k] && TRAIT[k].g === G.g);
          if(cur) basculerTrait(cur);
        };
        seg.append(b);
      }
      TRAITS.filter(t => t.g === G.g && (!sous.k || t.sub === sous.k)).forEach(t => {
        const b = el('button', null, t.l); b.type = 'button'; b.id = 'ed-tr-' + t.k;
        b.setAttribute('aria-pressed', ED.c.tr.indexOf(t.k) >= 0 ? 'true' : 'false');
        if(!traitPossible(t, r)){ b.disabled = true; b.title = 'À partir du rang ' + t.min; }
        else b.title = 'D’après ' + t.modele;
        b.onclick = () => basculerTrait(t.k);
        seg.append(b);
      });
      w.append(seg);
    });
    if(G.aide) w.append(el('p','aide', G.aide));
    box.append(w);
  });
  const acts = el('div','acts tacts');
  const hasard = el('button','btn ghost sm','Tirer des traits au hasard'); hasard.type = 'button'; hasard.id = 'ed-trhasard';
  hasard.onclick = traitsAuHasard;
  const vider = el('button','btn ghost sm','Enlever les traits'); vider.type = 'button'; vider.id = 'ed-trvider';
  vider.disabled = !ED.c.tr.length;
  vider.onclick = () => {
    const avant = produitTraits(ED.c);
    ED.c.tr = [];
    ED.traitInfo = '';
    appliquerProduit(ED.c, avant, produitTraits(ED.c), {});
    dessinerTraits(); syncChamps(); majApercu();
  };
  acts.append(hasard, vider);
  box.append(acts);
  const info = el('p','aide tinfo', ED.traitInfo || '');
  info.id = 'ed-traitinfo';
  info.hidden = !ED.traitInfo;
  box.append(info);
}

function infoTrait(t){
  const r = ED.c.r, bouts = [];
  if(t.g === 'facon') bouts.push(t.n + ' · ' + t.p + ' · ' + t.e({r:r, deg:RANG[r].deg}));
  if(t.g === 'element') bouts.push(ELEM[t.k].matiere ? 'magique, et l’armure l’arrête' : 'magique, et ça traverse l’armure');
  if(t.red) bouts.push('réduction ' + t.red(r) + ' au lieu de ' + RANG[r].red);
  if(t.cran) bouts.push('dé du rang à ' + cran(RANG[r].deg, t.cran));
  if(t.phrase) bouts.push(t.phrase(r));
  if(t.renf) bouts.push(t.renf(r));
  return t.l + ', d’après ' + t.modele + ' : ' + bouts.join(' · ') + (t.valider ? '. À valider.' : '');
}

function basculerTrait(k){
  const t = TRAIT[k];
  if(!t || !ED) return;
  const avant = produitTraits(ED.c);
  let tr = ED.c.tr.slice();
  if(tr.indexOf(k) >= 0){
    tr = tr.filter(x => x !== k);
    ED.traitInfo = '';
  } else {
    if(t.g === 'facon' || t.g === 'element') tr = tr.filter(x => !TRAIT[x] || TRAIT[x].g !== t.g);
    if(t.excl) tr = tr.filter(x => t.excl.indexOf(x) < 0);
    tr.push(k);
    (t.requiert || []).forEach(q => { if(tr.indexOf(q) < 0) tr.push(q); });
    ED.traitInfo = infoTrait(t);
  }
  ED.c.tr = trierTraits(tr, ED.c.r);
  appliquerProduit(ED.c, avant, produitTraits(ED.c),
    {a2: t.g === 'facon' || t.g === 'element', red: !!t.red, deg: !!t.cran});
  dessinerTraits(); syncChamps(); majApercu();
}

function traitsAuHasard(){
  if(!ED) return;
  const r = ED.c.r, avant = produitTraits(ED.c);
  const ok = t => traitPossible(t, r);
  const tr = [pick(TRAITS.filter(t => t.g === 'facon' && ok(t))).k];
  if(Math.random() < 0.45) tr.push(pick(TRAITS.filter(t => t.g === 'element')).k);
  const combien = Math.random() < 0.5 ? 1 : 2;
  for(let i = 0; i < combien; i++){
    const libres = TRAITS.filter(t => (t.g === 'corps' || t.g === 'conduite') && ok(t) &&
      tr.indexOf(t.k) < 0 && !(t.excl && t.excl.some(x => tr.indexOf(x) >= 0)));
    if(libres.length) tr.push(pick(libres).k);
  }
  tr.slice().forEach(k => (TRAIT[k].requiert || []).forEach(q => { if(tr.indexOf(q) < 0) tr.push(q); }));
  ED.c.tr = trierTraits(tr, r);
  ED.traitInfo = '';
  appliquerProduit(ED.c, avant, produitTraits(ED.c), {a2:true, red:true, deg:true});
  dessinerTraits(); syncChamps(); majApercu();
}

function changerRang(r){
  if(!ED) return;
  const avant = produitTraits(ED.c);
  ED.c.r = r;
  ED.c.tr = trierTraits(ED.c.tr, r);
  appliquerProduit(ED.c, avant, produitTraits(ED.c), {});
  majRang(); dessinerTraits(); syncChamps(); majApercu();
}

/* les champs suivent ce que les traits ont posé */
function syncChamps(){
  if(!ED) return;
  const c = ED.c;
  const set = (id, v) => { const n = $(id); if(n && n.value !== v) n.value = v; };
  set('ed-anom', c.a2.n); set('ed-aport', c.a2.p); set('ed-aeff', c.a2.e);
  set('ed-red', c.mod.red); set('ed-deg', c.mod.deg);
  set('ed-renf', c.renf); set('ed-part', c.p);
  ['phy','mag'].forEach(k => { const b = $('ed-atype-' + k); if(b) b.setAttribute('aria-pressed', c.a2.t === k ? 'true' : 'false'); });
  if(c.mod.red || c.mod.deg || c.renf){ const aj = $('ed-ajust'); if(aj) aj.open = true; }
}

/* les familles qu'on coche pour la creature en cours : la catégorie, la sous-catégorie, puis les tiennes */
function chipsFamilles(fseg, ouvrirCreation){
  if(!ED) return;
  fseg.innerHTML = '';
  lignesFamilles().forEach(L => {
    const row = el('div','famligne');
    row.append(el('span','famlab', L.l));
    const seg = el('div','seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', L.l);
    L.fams.forEach(f => {
      const b = el('button', L.g === 'maison' ? 'fm' : null, f.l); b.type = 'button'; b.id = 'ed-fam-' + f.k;
      b.setAttribute('aria-pressed', ED.c.t.indexOf(f.k) >= 0 ? 'true' : 'false');
      b.onclick = () => {
        const i = ED.c.t.indexOf(f.k);
        if(i >= 0) ED.c.t.splice(i, 1); else ED.c.t.push(f.k);
        b.setAttribute('aria-pressed', ED.c.t.indexOf(f.k) >= 0 ? 'true' : 'false');
        majApercu();
      };
      seg.append(b);
    });
    if(L.g === 'maison'){
      const plus = el('button', 'ajout', '+ Nouvelle famille'); plus.type = 'button'; plus.id = 'ed-famplus';
      plus.onclick = ouvrirCreation;
      seg.append(plus);
    }
    row.append(seg);
    fseg.append(row);
  });
}

function majRang(){
  ADV.rangs.forEach(r => {
    const b = $('ed-rang-' + r.r);
    if(b){ b.setAttribute('aria-checked', ED.c.r === r.r ? 'true' : 'false'); b.className = ED.c.r === r.r ? 'on' : ''; }
  });
  const rg = RANG[ED.c.r];
  const ph = {pv:rg.pv, red:rg.red, deg:rg.deg, cartes:rg.cartes};
  Object.keys(ph).forEach(k => { const i = $('ed-' + k); if(i) i.placeholder = String(ph[k]); });
}

function ligneLivre(c, n){
  const st = statsDe(c), rg = RANG[c.r];
  const aj = [];
  if(st.pv !== rg.pv) aj.push(st.pv + ' PV au lieu de ' + rg.pv);
  if(st.red !== rg.red) aj.push('réduction ' + st.red + ' au lieu de ' + rg.red);
  if(st.deg !== rg.deg) aj.push('frappe à ' + st.deg + ', pas à ' + rg.deg);
  if(st.cartes !== rg.cartes) aj.push(st.cartes + ' carte' + (st.cartes > 1 ? 's' : ''));
  let part = (c.p || '').trim().replace(/\.$/, '');
  if(aj.length) part += (part ? '. ' : '') + aj.join(', ').replace(/^./, x => x.toUpperCase());
  if(c.renf) part += (part ? '. ' : '') + c.renf.trim().replace(/\.$/, '');
  const at = c.a2 && c.a2.n ? '**' + c.a2.n + '**, ' + typeAttaque(c.a2).l + ', ' + (porteeDe(c.a2) || 'contact') + ' : ' + effetDe(c, st) : '';
  return '| **' + (n || 'n°') + '** | ' + (c.n || '?') + ' | ' + part + ' | ' + at + ' |';
}

function majApercu(){
  if(!ED) return;
  const ap = $('apercu'); if(!ap) return;
  ap.innerHTML = '';
  ap.append(carteAdv(Object.assign({}, ED.c, {src:'maison'})).row);
  $('ligneLivre').textContent = ligneLivre(ED.c);
}

function problemes(c){
  const out = [];
  if(!c.n.trim()) out.push(['ed-nom', 'Il lui faut un nom.']);
  else if(MAISON.some(x => x.id !== c.id && x.n.trim().toLowerCase() === c.n.trim().toLowerCase()))
    out.push(['ed-nom', 'Tu as déjà une créature qui porte ce nom.']);
  if(!c.p.trim()) out.push(['ed-part', 'Écris ce qu’il a de particulier : c’est ce qui fait la scène.']);
  const a = c.a2;
  if(a.n.trim() && !a.e.trim()) out.push(['ed-aeff', 'Dis ce que fait son attaque propre.']);
  if(!a.n.trim() && a.e.trim()) out.push(['ed-anom', 'Donne un nom à son attaque propre.']);
  const m = c.mod, entier = (v, lo, hi) => v === '' || (/^\d+$/.test(v) && +v >= lo && +v <= hi);
  if(!entier(m.pv, 1, 999)) out.push(['ed-pv', 'Des PV entiers, au moins 1.']);
  if(!entier(m.red, 0, 20)) out.push(['ed-red', 'Une réduction entre 0 et 20.']);
  if(!entier(m.cartes, 1, 4)) out.push(['ed-cartes', 'Entre 1 et 4 cartes.']);
  if(m.deg && !/^\d*d\d+(\s*[+\-]\s*\d+)?$/i.test(m.deg.replace(/\s/g,''))) out.push(['ed-deg', 'Écris le dé comme dans le livre : d8, d6+2, 2d6.']);
  return out;
}

function validerEditeur(){
  document.querySelectorAll('#bestEditeur .err').forEach(e => { e.hidden = true; e.textContent = ''; });
  document.querySelectorAll('#bestEditeur [aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
  const pb = problemes(ED.c);
  if(pb.length){
    pb.forEach(([id, t]) => {
      const e = $(id + '-err'); if(e){ e.textContent = t; e.hidden = false; }
      const f = $(id); if(f) f.setAttribute('aria-invalid', 'true');
      if(['ed-pv','ed-red','ed-deg','ed-cartes'].indexOf(id) >= 0) $('ed-ajust').open = true;
    });
    const m = $('ed-msg'); m.textContent = pb.length === 1 ? 'Un point à corriger avant d’enregistrer.' : pb.length + ' points à corriger avant d’enregistrer.'; m.hidden = false;
    const f = $(pb[0][0]); if(f) f.focus();
    return;
  }
  /* une famille supprimee pendant qu'il etait ouvert ne reste pas collee a lui */
  if(BST.pret) ED.c.t = ED.c.t.filter(k => famille(k));
  const voulues = ED.tables.slice();
  const c = enregistrer(ED.c);
  /* les tables partagées qu'il porte : chacune garde la liste de ceux qui la portent */
  TABLES_BUTIN.slice().forEach(t => {
    const a = t.qui.indexOf(c.id) >= 0, veut = voulues.indexOf(t.k) >= 0;
    if(a !== veut) enregistrerTable(Object.assign({}, t, {qui:veut ? t.qui.concat([c.id]) : t.qui.filter(x => x !== c.id)}));
  });
  ED = null;
  $('bestEditeur').hidden = true; $('bestEditeur').innerHTML = '';
  BST.flash = c.id;
  draw();
  const k = document.querySelector('[data-cid="' + c.id + '"]');
  if(k) k.scrollIntoView({block:'center', behavior:'smooth'});
}
function fermerEditeur(){
  ED = null;
  $('bestEditeur').hidden = true; $('bestEditeur').innerHTML = '';
}
