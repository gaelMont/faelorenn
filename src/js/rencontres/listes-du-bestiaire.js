/* ---------- la liste ---------- */
function drawEtat(){
  const e = $('bestEtat'); if(!e) return;
  const gh = BST.source === 'github';
  let t;
  if(!BST.pret) t = gh ? 'Lecture du bestiaire dans le dépôt GitHub…' : 'Chargement du bestiaire…';
  else if(BST.mode === 'db' && gh){
    const d = BST.gh && BST.gh.doc;
    t = 'Enregistré dans le dépôt ' + GHC.depot + ' : tu retrouves tes créatures, tes familles et tes tables de butin sur tout appareil relié au dépôt.';
    if(d && d.erreur) t += ' ' + d.erreur;
  }
  else if(BST.mode === 'db') t = 'Enregistré avec la page : tu retrouves tes créatures, tes familles et tes tables de butin sur n’importe quel appareil, et quiconque peut modifier la page les voit aussi.';
  else if(gh && BST.erreur) t = 'Le dépôt GitHub n’a pas répondu à l’ouverture' + (BST.ghErreur ? ' (' + BST.ghErreur.replace(/\.$/, '') + ')' : '') + ' : tes créatures restent dans ce navigateur, et partiront dans le dépôt à la prochaine ouverture de la page.';
  else {
    t = 'Enregistré dans ce navigateur seulement. Fais une sauvegarde .json de temps en temps, c’est elle qui te permet de tout récupérer ailleurs.';
    if(!ghcBloque()) t += ' Ou relie la sauvegarde en ligne, plus bas : tout part alors dans ton dépôt GitHub.';
  }
  if(BST.erreur && !gh) t += ' Un enregistrement n’a pas pu partir avec la page : il reste dans ce navigateur, et la page le renverra à la prochaine ouverture.';
  e.textContent = t;
}

function drawBestiaire(){
  drawEtat();
  drawFamilles();
  drawTables();
  drawAnciennes();
  drawLivre();
  if(ED && ED.redessinerFamilles) ED.redessinerFamilles();
  if(ED && ED.redessinerTables) ED.redessinerTables();
  const liste = $('bestListe'); if(!liste) return;
  liste.innerHTML = '';
  $('bestCompte').textContent = MAISON.length ? MAISON.length + ' créature' + (MAISON.length > 1 ? 's' : '') + ' à toi' : 'Aucune créature à toi pour l’instant';

  /* le choix d'une entree du livre a copier */
  const sel = $('bestDepuis');
  if(sel && !sel.options.length){
    sel.add(new Option('Partir d’une entrée du livre…', ''));
    for(let r = 1; r <= 5; r++){
      const g = el('optgroup'); g.label = 'Rang ' + r + ' · ' + RANG[r].nom;
      ADV.creatures[r].forEach(c => g.append(new Option(c.n, c.id)));
      sel.append(g);
    }
  }

  const q = BST.recherche.trim().toLowerCase();
  const vis = MAISON.filter(c => !q || [c.n, c.p, c.a2.n, c.desc, c.ou, nomsFamilles(c), nomsTraits(c)].join(' ').toLowerCase().indexOf(q) >= 0);
  if(!MAISON.length){
    liste.append(el('p','vide','Crée ta première créature, ou pars d’une entrée du livre pour en faire une variante. Elles entrent tout de suite dans les tirages.'));
    return;
  }
  if(!vis.length){ liste.append(el('p','vide','Rien ne correspond à « ' + BST.recherche + ' ».')); return; }

  for(let r = 1; r <= 5; r++){
    const du = vis.filter(c => c.r === r).sort((a, b) => a.n.localeCompare(b.n, 'fr'));
    if(!du.length) continue;
    liste.append(el('h3','grang', 'Rang ' + r + ' · ' + RANG[r].nom));
    du.forEach(c => {
      const w = el('div','bcarte' + (BST.flash === c.id ? ' flash' : ''));
      w.setAttribute('data-cid', c.id);
      w.append(carteAdv(c).row);
      const tn = nomsTraits(c);
      if(tn) w.append(el('div','btr', 'Traits : ' + tn));
      const fams = famillesDe(c);
      if(fams.length){
        const fam = el('div','bfam');
        fams.forEach(f => fam.append(el('span', estMaisonFam(f.k) ? 'fm' : null, f.l)));
        w.append(fam);
      }
      const act = el('div','bact');
      const b1 = el('button','btn ghost sm','Modifier'); b1.type = 'button';
      b1.onclick = () => ouvrirEditeur(c, false);
      const b2 = el('button','btn ghost sm','Dupliquer'); b2.type = 'button';
      b2.onclick = () => { const d = normalise(c); d.id = nouvelId(); d.n = c.n + ' (copie)'; ouvrirEditeur(d, true); };
      const b3 = el('button','btn ghost sm','Mettre dans la rencontre'); b3.type = 'button';
      b3.onclick = () => {
        if(S.liste.length >= 12) return;
        S.liste.push(entree(c, c.r)); S.liste.sort((a, b) => b.r - a.r);
        if(!S.pourquoi) S.pourquoi = pick(ADV.pourquoi);
        draw(); $('enc').scrollIntoView({block:'start', behavior:'smooth'});
      };
      const armee = BST.aSupprimer === c.id;
      const b4 = el('button','btn ghost sm' + (armee ? ' danger' : ''), armee ? 'Confirmer la suppression' : 'Supprimer'); b4.type = 'button';
      b4.onclick = () => {
        if(BST.aSupprimer === c.id){ BST.aSupprimer = null; supprimer(c.id); draw(); }
        else { BST.aSupprimer = c.id; drawBestiaire(); setTimeout(() => { if(BST.aSupprimer === c.id){ BST.aSupprimer = null; drawBestiaire(); } }, 5000); }
      };
      act.append(b1, b2, b3, b4);
      w.append(act);
      liste.append(w);
    });
  }
  BST.flash = null;
}

/* ---------- tes familles ---------- */
function compteMembres(f){
  const nl = f.livre.filter(id => trouveId(id)).length;
  const nm = MAISON.filter(c => c.t.indexOf(f.k) >= 0).length;
  if(!nl && !nm) return {n:0, t:'Personne pour l’instant'};
  const b = [];
  if(nl) b.push(nl + ' du livre');
  if(nm) b.push(nm + ' à toi');
  return {n:nl + nm, t:b.join(' · ')};
}
function drawFamilles(){
  const box = $('famListe'); if(!box) return;
  box.innerHTML = '';
  $('famCompte').textContent = FAM_MAISON.length ? ' · ' + FAM_MAISON.length : '';
  if(!FAM_MAISON.length){
    box.append(el('p','vide','Aucune famille à toi pour l’instant. Un clan, les bêtes d’une vallée, ce qui sort d’une même Floraison : ce qui se présente ensemble.'));
    return;
  }
  FAM_MAISON.slice().sort((a, b) => a.l.localeCompare(b.l, 'fr')).forEach(f => {
    const w = el('div','famrow' + (BST.flashFam === f.k ? ' flash' : ''));
    w.setAttribute('data-fam', f.k);
    const cm = compteMembres(f);
    const t = el('div','famtxt');
    t.append(el('div','famnm fm', f.l));
    t.append(el('div','famct', cm.t));
    if(f.d) t.append(el('div','famd', f.d));
    w.append(t);

    const act = el('div','bact famact');
    const b1 = el('button','btn ghost sm','Modifier'); b1.type = 'button';
    b1.onclick = () => ouvrirFamille(f, false);
    const b2 = el('button','btn ghost sm','Tirer avec elle'); b2.type = 'button';
    b2.disabled = !cm.n;
    b2.title = cm.n ? 'Tirer une rencontre avec cette famille seule' : 'Mets d’abord des adversaires dans cette famille';
    b2.onclick = () => {
      S.fam = [f.k]; S.source = 'tout';
      tirerComposition(); draw();
      $('enc').scrollIntoView({block:'start', behavior:'smooth'});
    };
    const armee = BST.famASupprimer === f.k;
    const b3 = el('button','btn ghost sm' + (armee ? ' danger' : ''), armee ? 'Confirmer la suppression' : 'Supprimer'); b3.type = 'button';
    b3.onclick = () => {
      if(BST.famASupprimer === f.k){ BST.famASupprimer = null; supprimerFamille(f.k); draw(); }
      else { BST.famASupprimer = f.k; drawFamilles(); setTimeout(() => { if(BST.famASupprimer === f.k){ BST.famASupprimer = null; drawFamilles(); } }, 5000); }
    };
    act.append(b1, b2, b3);
    w.append(act);
    if(armee && MAISON.some(c => c.t.indexOf(f.k) >= 0))
      w.append(el('p','note famavert','Tes créatures restent dans ton bestiaire : elles perdent seulement cette famille.'));
    box.append(w);
  });
  BST.flashFam = null;
}

function ouvrirFamille(f, nouveau){
  FED = {f:normaliseFam(f), nouveau:!!nouveau};
  FED.livre = FED.f.livre.slice();
  FED.miennes = MAISON.filter(c => c.t.indexOf(FED.f.k) >= 0).map(c => c.id);
  const box = $('famEditeur'); box.innerHTML = ''; box.hidden = false;
  box.append(el('h3', null, nouveau ? 'Nouvelle famille' : 'Modifier ' + FED.f.l));

  const l2 = el('div','ligne2');
  const nom = champ(l2, 'fam-nom', 'Nom', saisie('text', FED.f.l, 'Les gens de la digue'));
  nom.maxLength = 60;
  nom.oninput = () => { FED.f.l = nom.value; };
  const desc = champ(l2, 'fam-desc', 'Ce qui les lie', saisie('text', FED.f.d, 'Un clan qui vit de la digue et la défend'));
  desc.maxLength = 300;
  desc.oninput = () => { FED.f.d = desc.value; };
  box.append(l2);

  const mw = el('div','famm');
  const ml = el('p','lab');
  mw.append(ml);
  mw.append(el('p','aide famaide','Coche ceux qui se présentent avec elle, du livre ou à toi. Le point doré marque ce qui est à toi.'));
  /* une entrée de l'ancien bestiaire notée dans la famille ne compte plus */
  const total = () => FED.livre.filter(id => trouveId(id)).length + FED.miennes.length;
  const majCompte = () => {
    ml.textContent = 'Qui en fait partie · ' + (total() ? total() + ' choisi' + (total() > 1 ? 's' : '') : 'personne encore');
    for(let r = 1; r <= 5; r++){
      const s = $('fam-rang-' + r + '-n');
      if(!s) continue;
      const n = ADV.creatures[r].filter(c => FED.livre.indexOf(c.id) >= 0).length + MAISON.filter(c => c.r === r && FED.miennes.indexOf(c.id) >= 0).length;
      s.textContent = n ? ' · ' + n : '';
    }
  };
  const coche = (c, liste) => {
    const lab = el('label','coche');
    const i = el('input'); i.type = 'checkbox'; i.id = 'fam-m-' + c.id;
    i.checked = FED[liste].indexOf(c.id) >= 0;
    i.onchange = () => {
      const a = FED[liste], k = a.indexOf(c.id);
      if(i.checked && k < 0) a.push(c.id);
      else if(!i.checked && k >= 0) a.splice(k, 1);
      majCompte();
    };
    lab.append(i, el('span', liste === 'miennes' ? 'fm' : null, c.n));
    return lab;
  };
  for(let r = 1; r <= 5; r++){
    const det = el('details','famrang'); det.open = true;
    const sum = el('summary', null, 'Rang ' + r + ' · ' + RANG[r].nom);
    const sn = el('span','famrn'); sn.id = 'fam-rang-' + r + '-n';
    sum.append(sn);
    det.append(sum);
    const grille = el('div','famgrille');
    ADV.creatures[r].forEach(c => grille.append(coche(c, 'livre')));
    MAISON.filter(c => c.r === r).sort((a, b) => a.n.localeCompare(b.n, 'fr')).forEach(c => grille.append(coche(c, 'miennes')));
    det.append(grille);
    mw.append(det);
  }
  box.append(mw);

  const act = el('div','acts edact');
  const ok = el('button','btn', nouveau ? 'Créer la famille' : 'Enregistrer'); ok.type = 'button'; ok.id = 'fam-ok';
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button'; non.id = 'fam-non';
  ok.onclick = validerFamille;
  non.onclick = fermerFamille;
  act.append(ok, non);
  box.append(act);

  majCompte();
  box.scrollIntoView({block:'start', behavior:'smooth'});
  nom.focus({preventScroll:true});
}

function validerFamille(){
  const e = $('fam-nom-err'), champNom = $('fam-nom');
  e.hidden = true; e.textContent = ''; champNom.removeAttribute('aria-invalid');
  const pb = problemeNomFamille(FED.f.l, FED.f.k);
  if(pb){ e.textContent = pb; e.hidden = false; champNom.setAttribute('aria-invalid', 'true'); champNom.focus(); return; }
  const f = enregistrerFam(Object.assign({}, FED.f, {livre:FED.livre.slice()}));
  const k = f.k;
  /* tes creatures portent elles-memes leurs familles */
  MAISON.slice().forEach(c => {
    const veut = FED.miennes.indexOf(c.id) >= 0, a = c.t.indexOf(k) >= 0;
    if(veut === a) return;
    const d = normalise(c);
    d.t = veut ? d.t.concat([k]) : d.t.filter(x => x !== k);
    enregistrer(d);
    /* la creature ouverte dans l'editeur suit le meme changement */
    if(ED && ED.c.id === c.id){
      if(veut && ED.c.t.indexOf(k) < 0) ED.c.t.push(k);
      if(!veut) ED.c.t = ED.c.t.filter(x => x !== k);
    }
  });
  FED = null;
  $('famEditeur').hidden = true; $('famEditeur').innerHTML = '';
  BST.flashFam = f.k;
  draw();
  const row = document.querySelector('[data-fam="' + f.k + '"]');
  if(row) row.scrollIntoView({block:'center', behavior:'smooth'});
}
function fermerFamille(){
  FED = null;
  $('famEditeur').hidden = true; $('famEditeur').innerHTML = '';
}

/* ---------- les tables partagées, dans l'éditeur d'une créature ---------- */
function chipsTables(seg, creer){
  if(!ED) return;
  seg.innerHTML = '';
  TABLES_BUTIN.slice().sort((a, b) => a.l.localeCompare(b.l, 'fr')).forEach(t => {
    const b = el('button', null, t.l || 'Sans nom'); b.type = 'button'; b.id = 'ed-table-' + t.k;
    b.setAttribute('aria-pressed', ED.tables.indexOf(t.k) >= 0 ? 'true' : 'false');
    b.onclick = () => {
      const i = ED.tables.indexOf(t.k);
      if(i >= 0) ED.tables.splice(i, 1); else ED.tables.push(t.k);
      b.setAttribute('aria-pressed', ED.tables.indexOf(t.k) >= 0 ? 'true' : 'false');
    };
    seg.append(b);
  });
  const plus = el('button','ajout','+ Nouvelle table'); plus.type = 'button'; plus.id = 'ed-tableplus';
  plus.onclick = creer;
  seg.append(plus);
}
function problemeNomTable(nom, k){
  const n = (nom || '').trim().toLowerCase();
  if(!n) return 'Il lui faut un nom.';
  if(TABLES_BUTIN.some(t => t.k !== k && t.l.trim().toLowerCase() === n)) return 'Une table porte déjà ce nom.';
  return '';
}

/* ---------- les entrées du livre : les retoucher, revenir au livre ---------- */
function oterRetouche(id){
  supprimerDans(MAGS.creatures, id);
  if(ED && ED.c.id === id) fermerEditeur();
  BST.retoucheAOter = null;
  draw();
}
function retoucher(c){
  const d = normalise(Object.assign({}, c));
  ouvrirEditeur(d, false);
}
function drawLivre(){
  const box = $('livreListe'); if(!box) return;
  box.innerHTML = '';
  const n = RETOUCHES.length;
  $('livreCompte').textContent = n ? ' · ' + n + ' retouchée' + (n > 1 ? 's' : '') : '';
  for(let r = 1; r <= 5; r++){
    box.append(el('p','grang', 'Rang ' + r + ' · ' + RANG[r].nom));
    const g = el('div','livgrille');
    ADV.creatures[r].forEach(c => {
      const w = el('div','livrow' + (c.retouche ? ' retouche' : ''));
      w.setAttribute('data-cid', c.id);
      const t = el('div','livtxt');
      t.append(el('span','livnm', c.n));
      const plus = [];
      if(c.retouche) plus.push('retouchée');
      if(lireTableButin(c.butin).lignes.length || tablesDe(c).length) plus.push('butin');
      if(plus.length) t.append(el('span','livbadge', plus.join(' · ')));
      const fs = famillesDe(c).map(f => f.l);
      if(fs.length) t.append(el('span','livfam', fs.join(' · ')));
      w.append(t);
      const a = el('div','livact');
      const b = el('button','btn ghost xs','Retoucher'); b.type = 'button';
      b.setAttribute('aria-label', 'Retoucher ' + c.n + ', entrée du livre');
      b.onclick = () => retoucher(c);
      a.append(b);
      if(c.retouche){
        const arme = BST.retoucheAOter === c.id;
        const x = el('button','btn ghost xs' + (arme ? ' danger' : ''), arme ? 'Confirmer' : 'Revenir au livre'); x.type = 'button';
        x.setAttribute('aria-label', (arme ? 'Confirmer : ' : '') + 'revenir à l’entrée du livre pour ' + c.n);
        if(arme && tablesDe(c).length) x.title = 'Ta version disparaît. Les tables partagées qu’elle porte restent cochées.';
        x.onclick = () => {
          if(arme){ oterRetouche(c.id); return; }
          BST.retoucheAOter = c.id; drawLivre();
          setTimeout(() => { if(BST.retoucheAOter === c.id){ BST.retoucheAOter = null; drawLivre(); } }, 5000);
        };
        a.append(x);
      }
      w.append(a);
      g.append(w);
    });
    box.append(g);
  }
}

/* ---------- les retouches de l'ancien bestiaire ----------
   Leur entrée n'existe plus : elles ne sortent nulle part. On en fait des créatures à toi (avec leurs familles
   et leurs tables de butin), ou on les efface. Rien ne se fait sans qu'on le demande. */
function drawAnciennes(){
  const box = $('bestAnciennes'); if(!box) return;
  box.innerHTML = '';
  /* tant que le dépôt n'est pas lu, un autre appareil l'a peut-être déjà fait */
  box.hidden = !ANCIENNES.length || !BST.pret;
  if(box.hidden){ BST.anciennesAEffacer = false; return; }
  const n = ANCIENNES.length;
  box.append(el('p', null, (n > 1 ? n + ' retouches' : 'Une retouche') + ' de l’ancien bestiaire : ' +
    ANCIENNES.map(c => c.n || 'Sans nom').sort((a, b) => a.localeCompare(b, 'fr')).join(', ') +
    '. ' + (n > 1 ? 'Leurs entrées n’existent plus : elles ne sortent' : 'Son entrée n’existe plus : elle ne sort') +
    ' dans aucun tirage.'));
  const a = el('div','acts');
  const garder = el('button','btn sm', n > 1 ? 'En faire des créatures à toi' : 'En faire une créature à toi'); garder.type = 'button'; garder.id = 'anc-garder';
  garder.onclick = convertirAnciennes;
  const arme = BST.anciennesAEffacer;
  const effacer = el('button','btn ghost sm' + (arme ? ' danger' : ''), arme ? 'Confirmer : elles disparaissent' : (n > 1 ? 'Les effacer' : 'L’effacer'));
  effacer.type = 'button'; effacer.id = 'anc-effacer';
  effacer.onclick = () => {
    if(BST.anciennesAEffacer){ BST.anciennesAEffacer = false; effacerAnciennes(); return; }
    BST.anciennesAEffacer = true; drawAnciennes();
    setTimeout(() => { if(BST.anciennesAEffacer){ BST.anciennesAEffacer = false; drawAnciennes(); } }, 5000);
  };
  a.append(garder, effacer);
  box.append(a);
}
/* l'identifiant de la créature qu'elle devient : toujours le même (m-livre-2-2), pour qu'un autre appareil,
   ou une vieille sauvegarde réimportée, ne la fasse pas en double */
const idConvertie = id => 'm-' + id;
function convertirAnciennes(){
  if(!BST.pret) return;
  const unique = (id, i, l) => l.indexOf(id) === i;
  ANCIENNES.slice().forEach(x => {
    const nid = idConvertie(x.id);
    if(!MAISON.some(c => c.id === nid)){
      const d = normalise(Object.assign({}, x, {id:nid, r:x.r}));
      /* les familles qui la comptaient la gardent, par ses étiquettes */
      FAM_MAISON.forEach(f => { if(f.livre.indexOf(x.id) >= 0 && d.t.indexOf(f.k) < 0) d.t.push(f.k); });
      enregistrer(d);
    }
    /* ses tables de butin la suivent */
    TABLES_BUTIN.slice().forEach(tb => {
      if(tb.qui.indexOf(x.id) >= 0) enregistrerTable(Object.assign({}, tb, {qui:tb.qui.map(id => id === x.id ? nid : id).filter(unique)}));
    });
    /* un éditeur de table ou de famille ouvert la suit aussi : l'enregistrer ne la défait pas */
    if(TED) TED.qui = TED.qui.map(id => id === x.id ? nid : id).filter(unique);
    if(FED && FED.livre.indexOf(x.id) >= 0 && FED.miennes.indexOf(nid) < 0) FED.miennes.push(nid);
    supprimerDans(MAGS.creatures, x.id);
  });
  BST.anciennesAEffacer = false;
  draw();
}
function effacerAnciennes(){
  ANCIENNES.slice().forEach(x => supprimerDans(MAGS.creatures, x.id));
  draw();
}

/* ---------- tes tables de butin ---------- */
function drawTables(){
  const box = $('butListe'); if(!box) return;
  box.innerHTML = '';
  $('butCompte').textContent = TABLES_BUTIN.length ? ' · ' + TABLES_BUTIN.length : '';
  if(!TABLES_BUTIN.length){
    box.append(el('p','vide','Aucune table pour l’instant. Les poches d’un bandit, ce qu’on arrache à une bête de Floraison : écris-la une fois, et coche qui la porte.'));
    return;
  }
  TABLES_BUTIN.slice().sort((a, b) => a.l.localeCompare(b.l, 'fr')).forEach(t => {
    const lt = lireTableButin(t.lignes);
    const qui = t.qui.map(id => trouveId(id)).filter(Boolean);
    const w = el('div','famrow' + (BST.flashTable === t.k ? ' flash' : ''));
    w.setAttribute('data-table', t.k);
    const x = el('div','famtxt');
    x.append(el('div','famnm', t.l || 'Sans nom'));
    const forme = lt.lignes.length ? (lt.numerotee ? 'd' + lt.de : 'au hasard') + ' · ' + lt.lignes.length + ' ligne' + (lt.lignes.length > 1 ? 's' : '') : 'vide';
    x.append(el('div','famct', forme + ' · ' + (qui.length ? 'portée par ' + qui.slice(0, 4).map(c => c.n).join(', ') + (qui.length > 4 ? ' et ' + (qui.length - 4) + ' de plus' : '') : 'personne ne la porte encore')));
    if(t.d) x.append(el('div','famd', t.d));
    if(BST.essaiTable && BST.essaiTable.k === t.k) x.append(el('div','butessai', BST.essaiTable.txt));
    w.append(x);
    const act = el('div','bact famact');
    const b1 = el('button','btn ghost sm','Modifier'); b1.type = 'button';
    b1.onclick = () => ouvrirTable(t, false);
    const b2 = el('button','btn ghost sm','Tirer pour voir'); b2.type = 'button';
    b2.disabled = !lt.lignes.length;
    b2.onclick = () => {
      const r = tirerTableButin(t.lignes);
      BST.essaiTable = {k:t.k, txt:r ? 'd' + r.de + ' : ' + r.v + ' · ' + (r.t || 'rien à ce numéro') : ''};
      drawTables();
    };
    const armee = BST.tableASupprimer === t.k;
    const b3 = el('button','btn ghost sm' + (armee ? ' danger' : ''), armee ? 'Confirmer la suppression' : 'Supprimer'); b3.type = 'button';
    b3.onclick = () => {
      if(armee){ BST.tableASupprimer = null; supprimerTable(t.k); draw(); return; }
      BST.tableASupprimer = t.k; drawTables();
      setTimeout(() => { if(BST.tableASupprimer === t.k){ BST.tableASupprimer = null; drawTables(); } }, 5000);
    };
    act.append(b1, b2, b3);
    w.append(act);
    box.append(w);
  });
  BST.flashTable = null;
}
function supprimerTable(k){
  supprimerDans(MAGS.butins, k);
  if(TED && TED.t.k === k) fermerTable();
  if(ED){ ED.tables = ED.tables.filter(x => x !== k); if(ED.redessinerTables) ED.redessinerTables(); }
}
function ouvrirTable(t, nouveau){
  TED = {t:normaliseTable(t), nouveau:!!nouveau};
  TED.qui = TED.t.qui.slice();
  const box = $('butEditeur'); box.innerHTML = ''; box.hidden = false;
  box.append(el('h3', null, nouveau ? 'Nouvelle table de butin' : 'Modifier ' + (TED.t.l || 'la table')));
  const l2 = el('div','ligne2');
  const nom = champ(l2, 'but-nom', 'Nom', saisie('text', TED.t.l, 'Les poches d’un bandit'));
  nom.maxLength = 60;
  nom.oninput = () => { TED.t.l = nom.value; };
  const desc = champ(l2, 'but-desc', 'Quand s’en servir', saisie('text', TED.t.d, 'Sur les hors-la-loi des routes du sud'));
  desc.maxLength = 300;
  desc.oninput = () => { TED.t.d = desc.value; };
  box.append(l2);
  const z = champ(box, 'but-lignes', 'Ce qu’on trouve', zone(TED.t.lignes, '1-2 Une dent en or\n3-4 Un bout de corde\n5 Rien du tout\n6 Une lettre qu’on n’aurait pas dû lire', 7),
    'Une ligne par objet. Des numéros comme dans le livre, « 1-2 », « 3 » : le dé va jusqu’au plus grand. Sans numéros, chaque ligne a la même chance. Un objet n’a pas besoin d’exister ailleurs : sa ligne suffit.');
  const ap = el('p','aide butap'); ap.id = 'but-apercu';
  z.parentNode.insertBefore(ap, z.nextSibling);
  const maj = () => { ap.textContent = resumeTable(TED.t.lignes); };
  z.oninput = () => { TED.t.lignes = z.value; maj(); };
  maj();

  const mw = el('div','famm');
  const ml = el('p','lab');
  mw.append(ml);
  mw.append(el('p','aide famaide','Coche ceux qui la portent, du livre ou à toi. À la table, « Fouiller » propose de tirer dedans.'));
  const majCompte = () => {
    /* une entrée de l'ancien bestiaire notée dans la table ne compte plus */
    const n = TED.qui.filter(id => trouveId(id)).length;
    ml.textContent = 'Qui la porte · ' + (n ? n + ' choisi' + (n > 1 ? 's' : '') : 'personne encore');
    for(let r = 1; r <= 5; r++){
      const sp = $('but-rang-' + r + '-n');
      if(!sp) continue;
      const n = ADV.creatures[r].concat(MAISON.filter(c => c.r === r)).filter(c => TED.qui.indexOf(c.id) >= 0).length;
      sp.textContent = n ? ' · ' + n : '';
    }
  };
  const coche = c => {
    const lab = el('label','coche');
    const i = el('input'); i.type = 'checkbox'; i.id = 'but-m-' + c.id;
    i.checked = TED.qui.indexOf(c.id) >= 0;
    i.onchange = () => {
      const k = TED.qui.indexOf(c.id);
      if(i.checked && k < 0) TED.qui.push(c.id);
      else if(!i.checked && k >= 0) TED.qui.splice(k, 1);
      majCompte();
    };
    lab.append(i, el('span', c.src === 'maison' ? 'fm' : null, c.n));
    return lab;
  };
  for(let r = 1; r <= 5; r++){
    const det = el('details','famrang');
    const dedans = ADV.creatures[r].concat(MAISON.filter(c => c.r === r)).some(c => TED.qui.indexOf(c.id) >= 0);
    det.open = dedans || nouveau;
    const sum = el('summary', null, 'Rang ' + r + ' · ' + RANG[r].nom);
    const sn = el('span','famrn'); sn.id = 'but-rang-' + r + '-n';
    sum.append(sn);
    det.append(sum);
    const grille = el('div','famgrille');
    ADV.creatures[r].forEach(c => grille.append(coche(c)));
    MAISON.filter(c => c.r === r).sort((a, b) => a.n.localeCompare(b.n, 'fr')).forEach(c => grille.append(coche(c)));
    det.append(grille);
    mw.append(det);
  }
  box.append(mw);

  const act = el('div','acts edact');
  const ok = el('button','btn', nouveau ? 'Créer la table' : 'Enregistrer'); ok.type = 'button'; ok.id = 'but-ok';
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button'; non.id = 'but-non';
  ok.onclick = validerTable;
  non.onclick = fermerTable;
  act.append(ok, non);
  box.append(act);
  majCompte();
  box.scrollIntoView({block:'start', behavior:'smooth'});
  nom.focus({preventScroll:true});
}
function validerTable(){
  const e = $('but-nom-err'), champNom = $('but-nom');
  e.hidden = true; e.textContent = ''; champNom.removeAttribute('aria-invalid');
  const pb = problemeNomTable(TED.t.l, TED.t.k);
  if(pb){ e.textContent = pb; e.hidden = false; champNom.setAttribute('aria-invalid', 'true'); champNom.focus(); return; }
  const t = enregistrerTable(Object.assign({}, TED.t, {l:TED.t.l.trim(), qui:TED.qui.slice()}));
  /* la créature ouverte dans l'éditeur suit le même changement */
  if(ED){
    const veut = t.qui.indexOf(ED.c.id) >= 0, a = ED.tables.indexOf(t.k) >= 0;
    if(veut && !a) ED.tables.push(t.k);
    if(!veut && a) ED.tables = ED.tables.filter(x => x !== t.k);
  }
  TED = null;
  $('butEditeur').hidden = true; $('butEditeur').innerHTML = '';
  BST.flashTable = t.k;
  draw();
  const row = document.querySelector('[data-table="' + t.k + '"]');
  if(row) row.scrollIntoView({block:'center', behavior:'smooth'});
}
function fermerTable(){
  TED = null;
  $('butEditeur').hidden = true; $('butEditeur').innerHTML = '';
}
