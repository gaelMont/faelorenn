/* ---------- ce qu'on exporte ---------- */
function pourExport(){
  const out = [];
  for(let r = 1; r <= 5; r++){
    const livre = BST.inclureLivre ? ADV.creatures[r] : [];
    const miennes = MAISON.filter(c => c.r === r).sort((a, b) => a.n.localeCompare(b.n, 'fr'));
    out.push({r:r, liste:livre.concat(miennes)});
  }
  return out;
}
function nomsFamilles(c){ return famillesDe(c).map(f => f.l).join(', '); }
/* chaque famille, avec ses membres rang par rang, parmi ce qu'on exporte */
function indexFamilles(){
  const groupes = pourExport();
  return familles().map(f => ({
    f: f, maison: estMaisonFam(f.k),
    rangs: groupes.map(g => ({r:g.r, noms:g.liste.filter(c => membre(c, f.k)).map(c => c.n)})).filter(g => g.noms.length)
  })).filter(x => x.rangs.length);
}

function exporterWord(bouton){
  const X = DX, C = X.C, B = [];
  const total = pourExport().reduce((a, g) => a + g.liste.length, 0);
  if(!total){ bouton.textContent = 'Rien à exporter'; setTimeout(() => { bouton.textContent = 'Exporter en Word'; }, 2000); return; }
  B.push(X.titre('Bestiaire'));
  B.push(X.p(X.r('Faelorenn · les adversaires' + (BST.inclureLivre ? '' : ' · créations maison'), {sz:20, i:true, c:C.h2}), {after:160, bord:{sz:12, space:5, c:C.h1}}));
  B.push(X.p([X.r('Un adversaire a deux attaques et n’en utilise qu’une par round. ', {b:true, c:C.h2}),
    X.r('L’attaque de rang est au contact, physique, au dé de son rang. L’attaque propre est celle que sa nature lui donne.')]));
  B.push(X.p([X.r('La réduction d’armure s’applique au physique. ', {b:true, c:C.h2}),
    X.r('Elle s’applique aussi au magique quand l’élément envoie de la matière : la Sève, l’eau, la pierre, le vent et la Mue. Un humain compte une fois et demie tout ce qui est magique.')]));
  B.push(X.p([X.r('Le budget : ', {b:true, c:C.h2}),
    X.r('quatre points par personnage pour un combat sérieux, deux pour une escarmouche, huit pour un combat qui peut tuer. Les renforts qu’un adversaire amène ne coûtent rien.')], {after:120}));

  let premier = true;
  pourExport().forEach(g => {
    if(!g.liste.length) return;
    const rg = RANG[g.r];
    if(!premier) B.push(X.saut());
    premier = false;
    B.push(X.h2('Rang ' + g.r + ' · ' + rg.nom));
    B.push(X.p(X.r(rg.pv + ' PV · attaque de rang ' + rg.deg + ' · réduction ' + rg.red + ' · ' + rg.cartes + ' carte' + (rg.cartes > 1 ? 's' : '') +
      ' · coûte ' + COUT[g.r] + ' point' + (COUT[g.r] > 1 ? 's' : '') + ' au budget', {c:C.lbl, sz:18}), {after:120}));
    g.liste.forEach(c => {
      const st = statsDe(c), K = [];
      const fam = nomsFamilles(c);
      K.push(X.p([X.r(c.n, {b:true, sz:24, c:C.h1}), fam ? X.r('   ' + fam, {sz:14, caps:true, c:C.lbl, sp:20}) : ''], {after:30, keep:true}));
      if(c.p) K.push(X.p(X.r(c.p, {i:true}), {after:50}));
      const tn = nomsTraits(c);
      if(tn) K.push(X.p([X.lbl('Traits'), X.r(tn)], {after:20}));
      K.push(X.p([X.lbl('Attaque de rang'), X.r('physique · contact · ' + st.deg)], {after:20}));
      if(c.a2 && c.a2.n) K.push(X.p([X.lbl('Attaque propre'),
        X.r(c.a2.n, {b:true}), X.r(' · ' + typeAttaque(c.a2).l + ' · ' + (porteeDe(c.a2) || 'contact') + ' · ' + effetDe(c, st), {})], {after:20}));
      const aj = [];
      if(st.pv !== rg.pv) aj.push(st.pv + ' PV au lieu de ' + rg.pv);
      if(st.red !== rg.red) aj.push('réduction ' + st.red + ' au lieu de ' + rg.red);
      if(st.deg !== rg.deg) aj.push('attaque de rang à ' + st.deg);
      if(st.cartes !== rg.cartes) aj.push(st.cartes + ' carte' + (st.cartes > 1 ? 's' : ''));
      if(aj.length) K.push(X.p([X.lbl('Ajustements'), X.r(aj.join(' · '))], {after:20}));
      if(c.renf) K.push(X.p([X.lbl('Renforts'), X.r(c.renf), X.r('  (gratuits)', {c:C.lbl, i:true})], {after:20}));
      LORE.forEach(x => { if(c[x.k]) K.push(X.p([X.lbl(x.l), X.r(c[x.k])], {before:40, after:20})); });
      const tb = tablesDe(c).map(t => t.l);
      if(tb.length) K.push(X.p([X.lbl('Tables de butin'), X.r(tb.join(', '))], {after:20}));
      B.push(X.bloc(K.join('')));
    });
  });

  /* l'index par famille, les tiennes comprises */
  const idx = indexFamilles();
  if(idx.length){
    B.push(X.saut());
    B.push(X.h2('Par famille'));
    B.push(X.p(X.r('Qui peut se présenter ensemble. Un adversaire peut appartenir à plusieurs familles.', {i:true, c:C.lbl, sz:18}), {after:140}));
    idx.forEach(x => {
      B.push(X.p([X.r(x.f.l, {b:true, sz:22, c:C.h1}), x.maison ? X.r('   maison', {sz:14, caps:true, c:C.lbl, sp:20}) : ''], {after:20, keep:true}));
      if(x.f.d) B.push(X.p(X.r(x.f.d, {i:true}), {after:30, keep:true}));
      x.rangs.forEach((g, j) => B.push(X.p([X.lbl('Rang ' + g.r), X.r(g.noms.join(', '))],
        {after:j === x.rangs.length - 1 ? 160 : 10, keep:j < x.rangs.length - 1})));
    });
  }
  /* les tables de butin, avec qui les porte */
  if(TABLES_BUTIN.length){
    B.push(X.saut());
    B.push(X.h2('Tables de butin'));
    B.push(X.p(X.r('Ce qu’on trouve en fouillant. On lance le dé de la table ; sans numéros, une ligne au hasard.', {i:true, c:C.lbl, sz:18}), {after:140}));
    TABLES_BUTIN.slice().sort((a, b) => a.l.localeCompare(b.l, 'fr')).forEach(t => {
      const lt = lireTableButin(t.lignes);
      const qui = t.qui.map(id => trouveId(id)).filter(Boolean).map(c => c.n);
      B.push(X.p([X.r(t.l, {b:true, sz:22, c:C.h1}), X.r('   ' + (lt.numerotee ? 'd' + lt.de : 'au hasard'), {sz:14, caps:true, c:C.lbl, sp:20})], {after:20, keep:true}));
      if(t.d) B.push(X.p(X.r(t.d, {i:true}), {after:30, keep:true}));
      if(qui.length) B.push(X.p([X.lbl('Qui la porte'), X.r(qui.join(', '))], {after:30, keep:true}));
      lt.lignes.forEach((l, j) => B.push(X.p([X.r((l.de != null ? (l.de === l.a ? String(l.de) : l.de + '-' + l.a) : '·') + '   ', {b:true, c:C.h2}), X.r(l.t)],
        {after:j === lt.lignes.length - 1 ? 160 : 10, keep:j < lt.lignes.length - 1})));
    });
  }
  const octets = X.paquet(B.join(''), 'Bestiaire Faelorenn');
  telecharger('Bestiaire Faelorenn.docx', new Blob([octets], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}), null, bouton);
}

function texteLivre(){
  const L = ['# Ajouts au bestiaire', '',
    'À coller dans le Livre VII, sous le rang correspondant. La numérotation reprend après les entrées du livre.', ''];
  let n = 0;
  for(let r = 1; r <= 5; r++){
    const du = MAISON.filter(c => c.r === r).sort((a, b) => a.n.localeCompare(b.n, 'fr'));
    if(!du.length) continue;
    L.push('## Rang ' + r + ' · ' + RANG[r].nom + ' · ajouts', '');
    L.push('| n° | Qui | Ce qu’il a de particulier | Son attaque propre |');
    du.forEach((c, i) => { L.push(ligneLivre(c, ADV.creatures[r].length + 1 + i)); n++; });
    L.push('');
    const lore = du.filter(c => LORE.some(x => c[x.k]));
    if(lore.length){
      L.push('### Pour le MJ', '');
      lore.forEach(c => {
        L.push('**' + c.n + '.**' + LORE.filter(x => c[x.k]).map(x => ' ' + x.l + ' : ' + c[x.k].trim().replace(/\s*\n+\s*/g, ' · ').replace(/\.$/, '') + '.').join(''));
        L.push('');
      });
    }
  }
  return {texte:L.join('\n'), n:n};
}

function sauvegardeJson(){
  return JSON.stringify({format:'faelorenn-bestiaire', version:3, exporte:new Date().toISOString(), familles:FAM_MAISON,
    creatures:MAISON.concat(RETOUCHES, ANCIENNES), butins:TABLES_BUTIN}, null, 2);
}
function importerJson(texte){
  let o;
  try{ o = JSON.parse(texte); }catch(e){ return {ok:false, msg:'Ce fichier n’est pas une sauvegarde lisible.'}; }
  /* le fichier du dépôt range ses pièces par identifiant, et garde la trace de ce qui est supprimé */
  const enListe = (m, champ) => Object.keys(m).filter(id => m[id] && typeof m[id] === 'object' && !m[id].supprime).map(id => Object.assign({}, m[id], {[champ]:id}));
  if(o && !Array.isArray(o) && o.creatures && typeof o.creatures === 'object' && !Array.isArray(o.creatures)){
    o = {creatures:enListe(o.creatures, 'id'), familles:o.familles && typeof o.familles === 'object' && !Array.isArray(o.familles) ? enListe(o.familles, 'k') : [],
      butins:o.butins && typeof o.butins === 'object' && !Array.isArray(o.butins) ? enListe(o.butins, 'k') : []};
  }
  const brut = Array.isArray(o) ? o : (o && Array.isArray(o.creatures) ? o.creatures : (o && Array.isArray(o.butins) ? [] : null));
  if(!brut) return {ok:false, msg:'Ce fichier ne contient pas de bestiaire Faelorenn.'};
  const brutF = !Array.isArray(o) && Array.isArray(o.familles) ? o.familles : [];
  const MF = MAGS.familles, MC = MAGS.creatures;

  /* les familles d'abord. Une famille qui porte le nom d'une des tiennes s'y fond,
     et les creatures du fichier suivent vers la bonne famille */
  const vers = {};
  let fNeuves = 0, fMaj = 0, fPareilles = 0;
  brutF.forEach(x => {
    if(!x || typeof x !== 'object') return;
    const k0 = typeof x.k === 'string' ? x.k : '';
    if(ADV.familles.some(b => b.k === k0)) return;
    const f = normaliseFam(x);
    if(!f.l) return;
    const pareil = y => y.l.trim().toLowerCase() === f.l.toLowerCase();
    const duLivre = ADV.familles.find(pareil);
    if(duLivre){ if(k0) vers[k0] = duLivre.k; fPareilles++; return; }
    const deja = FAM_MAISON.find(y => y.k === f.k);
    if(deja){
      if(JSON.stringify(corpsDb(MF, deja)) === JSON.stringify(corpsDb(MF, Object.assign({}, f, {maj:deja.maj})))) fPareilles++;
      else if((f.maj || 0) > (deja.maj || 0)){ enregistrerFam(f); fMaj++; }
      else fPareilles++;
      return;
    }
    const homonyme = FAM_MAISON.find(pareil);
    if(homonyme){
      if(k0) vers[k0] = homonyme.k;
      const plus = f.livre.filter(id => homonyme.livre.indexOf(id) < 0);
      if(plus.length){ enregistrerFam(Object.assign({}, homonyme, {livre:homonyme.livre.concat(plus)})); fMaj++; }
      else fPareilles++;
      return;
    }
    if(k0 && k0 !== f.k) vers[k0] = f.k;
    enregistrerFam(f); fNeuves++;
  });

  let neuves = 0, maj = 0, pareilles = 0, retouches = 0;
  brut.forEach(x => {
    const c = normalise(x);
    if(!c.n.trim()) return;
    c.t = c.t.map(k => vers[k] || k).filter((k, i, a) => a.indexOf(k) === i);
    /* une retouche d'une entrée du livre, ou de l'ancien bestiaire : la plus récente l'emporte, elle ne change jamais d'identifiant */
    if(estAncienne(c) && MAISON.some(m => m.id === idConvertie(c.id))){ pareilles++; return; }
    if(estRetouche(c) || estAncienne(c)){
      const r0 = RETOUCHES.concat(ANCIENNES).find(m => m.id === c.id);
      if(r0 && (r0.maj || 0) >= (c.maj || 0)) pareilles++;
      else { enregistrer(c); retouches++; }
      return;
    }
    const deja = MAISON.find(m => m.id === c.id);
    if(deja){
      if(JSON.stringify(corpsDb(MC, deja)) === JSON.stringify(corpsDb(MC, Object.assign({}, c, {maj:deja.maj})))){ pareilles++; return; }
      if((c.maj || 0) > (deja.maj || 0)){ enregistrer(c); maj++; return; }
      c.id = nouvelId(); c.n = c.n + ' (importée)';
    }
    enregistrer(c); neuves++;
  });
  /* les tables de butin : une table qui porte le nom d'une des tiennes s'y fond, ses porteurs avec */
  let tNeuves = 0, tMaj = 0;
  const brutT = !Array.isArray(o) && Array.isArray(o.butins) ? o.butins : [];
  brutT.forEach(x => {
    if(!x || typeof x !== 'object') return;
    const t = normaliseTable(x);
    if(!t.l) return;
    const deja = TABLES_BUTIN.find(y => y.k === t.k);
    if(deja){
      if((t.maj || 0) > (deja.maj || 0) && JSON.stringify(corpsDb(MAGS.butins, deja)) !== JSON.stringify(corpsDb(MAGS.butins, Object.assign({}, t, {maj:deja.maj})))){ enregistrerTable(t); tMaj++; }
      else pareilles++;
      return;
    }
    const homonyme = TABLES_BUTIN.find(y => y.l.trim().toLowerCase() === t.l.toLowerCase());
    if(homonyme){
      const plus = t.qui.filter(id => homonyme.qui.indexOf(id) < 0);
      if(plus.length){ enregistrerTable(Object.assign({}, homonyme, {qui:homonyme.qui.concat(plus)})); tMaj++; }
      else pareilles++;
      return;
    }
    enregistrerTable(t); tNeuves++;
  });
  const pl = (n, un, plusieurs) => n + ' ' + (n > 1 ? plusieurs : un);
  const bouts = [];
  if(neuves) bouts.push(pl(neuves, 'créature ajoutée', 'créatures ajoutées'));
  if(retouches) bouts.push(pl(retouches, 'entrée du livre retouchée', 'entrées du livre retouchées'));
  if(tNeuves) bouts.push(pl(tNeuves, 'table de butin ajoutée', 'tables de butin ajoutées'));
  if(tMaj) bouts.push(pl(tMaj, 'table de butin mise à jour', 'tables de butin mises à jour'));
  if(maj) bouts.push(pl(maj, 'créature mise à jour', 'créatures mises à jour'));
  if(fNeuves) bouts.push(pl(fNeuves, 'famille ajoutée', 'familles ajoutées'));
  if(fMaj) bouts.push(pl(fMaj, 'famille mise à jour', 'familles mises à jour'));
  if(pareilles + fPareilles) bouts.push((pareilles + fPareilles) + ' déjà là');
  return {ok:true, msg:bouts.length ? bouts.join(', ') + '.' : 'Rien de nouveau dans ce fichier.'};
}

/* ---------- impression du bestiaire ---------- */
function preparerImpression(){
  const box = $('bestPrint'); box.innerHTML = '';
  box.append(el('h2','bp-titre','Bestiaire'));
  box.append(el('p','bp-sous','Faelorenn · les adversaires' + (BST.inclureLivre ? '' : ' · créations maison')));
  pourExport().forEach(g => {
    if(!g.liste.length) return;
    const rg = RANG[g.r];
    const s = el('section','bp-rang');
    s.append(el('h3', null, 'Rang ' + g.r + ' · ' + rg.nom));
    s.append(el('p','bp-stats', rg.pv + ' PV · ' + rg.deg + ' · réduction ' + rg.red + ' · ' + rg.cartes + ' carte' + (rg.cartes > 1 ? 's' : '') + ' · ' + COUT[g.r] + ' point' + (COUT[g.r] > 1 ? 's' : '')));
    g.liste.forEach(c => {
      const k = el('div','bp-carte');
      k.append(carteAdv(c).row);
      const tn = nomsTraits(c);
      if(tn) k.append(el('p','bp-tr', 'Traits : ' + tn));
      const fams = nomsFamilles(c);
      if(fams) k.append(el('p','bp-fam', fams));
      const lore = LORE.filter(x => c[x.k]);
      const tb = tablesDe(c).map(t => t.l);
      if(lore.length || tb.length){
        const dl = el('dl','bp-lore');
        lore.forEach(x => dl.append(el('dt', null, x.l), el('dd', null, c[x.k])));
        if(tb.length) dl.append(el('dt', null, 'Tables de butin'), el('dd', null, tb.join(', ')));
        k.append(dl);
      }
      s.append(k);
    });
    box.append(s);
  });
  const idx = indexFamilles();
  if(idx.length){
    const s = el('section','bp-rang bp-index');
    s.append(el('h3', null, 'Par famille'));
    idx.forEach(x => {
      const d = el('div','bp-famille');
      d.append(el('p','bp-fnom', x.f.l));
      if(x.f.d) d.append(el('p','bp-fdesc', x.f.d));
      x.rangs.forEach(g => {
        const p = el('p','bp-fr');
        p.append(el('span','bp-fl', 'Rang ' + g.r), document.createTextNode(g.noms.join(', ')));
        d.append(p);
      });
      s.append(d);
    });
    box.append(s);
  }
  if(TABLES_BUTIN.length){
    const s = el('section','bp-rang bp-index');
    s.append(el('h3', null, 'Tables de butin'));
    TABLES_BUTIN.slice().sort((a, b) => a.l.localeCompare(b.l, 'fr')).forEach(t => {
      const lt = lireTableButin(t.lignes);
      const d = el('div','bp-famille');
      d.append(el('p','bp-fnom', t.l + ' · ' + (lt.numerotee ? 'd' + lt.de : 'au hasard')));
      if(t.d) d.append(el('p','bp-fdesc', t.d));
      const qui = t.qui.map(id => trouveId(id)).filter(Boolean).map(c => c.n);
      if(qui.length){ const q = el('p','bp-fr'); q.append(el('span','bp-fl', 'Qui la porte'), document.createTextNode(qui.join(', '))); d.append(q); }
      lt.lignes.forEach(l => {
        const q = el('p','bp-fr');
        q.append(el('span','bp-fl', l.de != null ? (l.de === l.a ? String(l.de) : l.de + '-' + l.a) : '·'), document.createTextNode(l.t));
        d.append(q);
      });
      s.append(d);
    });
    box.append(s);
  }
}

/* ---------- les boutons de la section ---------- */
function brancherBestiaire(){
  $('bestNouveau').onclick = () => ouvrirEditeur(vide(), true);
  $('bestDepuis').onchange = e => {
    const c = trouveId(e.target.value);
    e.target.value = '';
    if(!c) return;
    const d = normalise(Object.assign({}, c, {id:nouvelId(), src:'maison'}));
    d.n = c.n + ' (variante)';
    /* la variante garde toutes les familles de l'original, les tiennes comprises */
    d.t = famillesDe(c).map(f => f.k);
    ouvrirEditeur(d, true);
  };
  $('famNouvelle').onclick = () => ouvrirFamille({}, true);
  $('butNouvelle').onclick = () => ouvrirTable({}, true);
  $('bestRecherche').oninput = e => { BST.recherche = e.target.value; drawBestiaire(); };
  $('bestLivre').onchange = e => { BST.inclureLivre = e.target.checked; };
  const nLivre = [1, 2, 3, 4, 5].reduce((s, r) => s + ADV.creatures[r].length, 0);
  $('bestLivreN').textContent = 'Inclure les ' + nLivre + ' entrées du livre';
  $('bestWord').onclick = e => exporterWord(e.currentTarget);
  $('bestTexte').onclick = e => {
    const t = texteLivre();
    if(!t.n){ e.currentTarget.textContent = 'Aucune créature à toi'; setTimeout(() => { $('bestTexte').textContent = 'Texte pour le livre'; }, 2000); return; }
    telecharger('Ajouts au bestiaire.md', t.texte, 'text/markdown', e.currentTarget);
    try{ navigator.clipboard.writeText(t.texte); }catch(x){}
  };
  $('bestJson').onclick = e => telecharger('bestiaire-faelorenn.json', sauvegardeJson(), 'application/json', e.currentTarget);
  $('bestImport').onclick = () => $('bestFichier').click();
  $('bestFichier').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const r = importerJson(String(lecteur.result));
      const m = $('bestMsg'); m.textContent = r.msg; m.hidden = false; m.className = r.ok ? 'note ok' : 'note err';
      setTimeout(() => { m.hidden = true; }, 6000);
      e.target.value = '';
      draw();
    };
    lecteur.readAsText(f);
  };
  $('bestImprimer').onclick = () => {
    preparerImpression();
    document.body.classList.add('imprime-bestiaire');
    const fin = () => { document.body.classList.remove('imprime-bestiaire'); window.removeEventListener('afterprint', fin); };
    window.addEventListener('afterprint', fin);
    window.print();
    setTimeout(fin, 1500);
  };
}
