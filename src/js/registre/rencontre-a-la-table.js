/* ============ tirer une rencontre depuis la table ============
   Le tirage du Registre des Rencontres (commun/tirage.js), à côté du récit : le budget par personnage,
   l'intensité, une famille, le livre et ton bestiaire. Le bestiaire vient de ce navigateur, où le Registre
   des Rencontres le garde, et de bestiaire.json quand la sauvegarde en ligne est reliée. Ce qu'on tire reste
   un brouillon de ce navigateur jusqu'à « Mettre en face ». */

const S = {pj:1, inten:'ser', liste:[], pourquoi:'', fam:[], source:'tout'};
const CLE_TIRAGE = 'faelorenn.table.tirage';
const TIR = {pjMain:false, ouvert:true, renforts:false, qui:'r2', n:1, lu:0, lecture:false, complet:false, rate:false, depotC:null, depotF:null, depotB:null};
const ID_OK = /^[A-Za-z0-9_.~:@+-]{1,120}$/;

/* ---------- le brouillon, gardé dans ce navigateur ---------- */
function garderTirage(){
  try{ localStorage.setItem(CLE_TIRAGE, JSON.stringify({pj:S.pj, pjMain:TIR.pjMain, inten:S.inten, source:S.source, fam:S.fam, pourquoi:S.pourquoi, liste:S.liste})); }catch(e){}
}
function lireTirage(){
  let o = null;
  try{ o = JSON.parse(localStorage.getItem(CLE_TIRAGE) || 'null'); }catch(e){ o = null; }
  if(!o || typeof o !== 'object') return;
  if(INTENSITES.some(i => i.k === o.inten)) S.inten = o.inten;
  if(SOURCES.some(s => s.k === o.source)) S.source = o.source;
  S.fam = Array.isArray(o.fam) ? o.fam.filter(k => typeof k === 'string').slice(0, 1) : [];
  if(o.pjMain && +o.pj >= 1 && +o.pj <= 6){ S.pj = +o.pj; TIR.pjMain = true; }
  S.pourquoi = typeof o.pourquoi === 'string' ? o.pourquoi : '';
  S.liste = Array.isArray(o.liste) ? o.liste.filter(a => a && [1, 2, 3, 4, 5].indexOf(+a.r) >= 0 && typeof a.n === 'string').slice(0, 12).map(a => ({
    r:+a.r, n:a.n, p:typeof a.p === 'string' ? a.p : '', pv:a.pv == null || isNaN(+a.pv) ? null : +a.pv,
    id:typeof a.id === 'string' ? a.id : Math.random().toString(36).slice(2, 8), cid:typeof a.cid === 'string' ? a.cid : ''})) : [];
  /* un brouillon tiré dans l'ancien bestiaire : ses entrées n'existent plus, on en tire d'autres au même rang */
  if(S.liste.some(a => ANCIEN_ID.test(a.cid))){
    /* ton bestiaire d'abord : tes créatures, tes familles et tes retouches comptent dans ce tirage */
    poserBestiaire();
    S.liste = S.liste.map(a => ANCIEN_ID.test(a.cid) ? Object.assign(creature(a.r), {id:a.id}) : a);
    garderTirage();
  }
}
/* le budget suit la compagnie, tant qu'on n'a pas choisi un autre nombre */
function majPjTirage(){ if(!TIR.pjMain) S.pj = Math.max(1, Math.min(6, persos().length || 1)); }

/* ---------- ton bestiaire : ce navigateur, puis le dépôt ---------- */
function normMaison(o, id){
  const txt = v => (v == null ? '' : String(v));
  /* une entrée du livre retouchée garde le rang de l'entrée ; une retouche de l'ancien bestiaire, celui de son identifiant */
  const lv = livreParId(id);
  const r = lv ? lv.r : ANCIEN_ID.test(id) ? +id.split('-')[1] : [1, 2, 3, 4, 5].indexOf(+o.r) >= 0 ? +o.r : 2;
  const a = o.a2 && typeof o.a2 === 'object' ? o.a2 : {};
  const elm = ELEM[a.el] ? a.el : '';
  const m = o.mod && typeof o.mod === 'object' ? o.mod : {};
  const a2 = {n:txt(a.n), t:elm || a.t === 'mag' ? 'mag' : 'phy', p:txt(a.p) || 'contact', e:txt(a.e), el:elm};
  /* le type et l'élément tels que le bestiaire les écrit, tant qu'ils disent la même chose que le reste */
  const ty = a.ty ? TYPE_ATQ[a.ty] : null;
  if(ty && ty.t === a2.t) a2.ty = a.ty;
  if(!elm && a2.t === 'mag' && txt(a.elt).trim()) a2.elt = txt(a.elt).trim().slice(0, 60);
  return {id:id, src:'maison', n:txt(o.n).trim().slice(0, 120), r:r, maj:+o.maj || 0,
    t: Array.isArray(o.t) ? o.t.filter(x => typeof x === 'string').slice(0, 40) : [],
    tr: Array.isArray(o.tr) ? trierTraits(o.tr.filter(x => typeof x === 'string'), r) : [],
    p:txt(o.p), a2:a2,
    mod:{pv:txt(m.pv), red:txt(m.red), deg:txt(m.deg), cartes:txt(m.cartes)}, renf:txt(o.renf), butin:txt(o.butin)};
}
function normTableMaison(o, k){
  const txt = v => (v == null ? '' : String(v));
  return {k:k, l:txt(o.l).trim().slice(0, 60) || 'Sans nom', d:txt(o.d).trim().slice(0, 300), lignes:txt(o.lignes).slice(0, 6000), maj:+o.maj || 0,
    qui: Array.isArray(o.qui) ? o.qui.filter(id => typeof id === 'string' && ID_OK.test(id)).slice(0, 300) : []};
}
function normFamMaison(o, k){
  const txt = v => (v == null ? '' : String(v));
  return {k:k, l:txt(o.l).trim().slice(0, 60) || 'Sans nom', d:txt(o.d).trim().slice(0, 300), maj:+o.maj || 0,
    livre: Array.isArray(o.livre) ? o.livre.filter(id => typeof id === 'string' && /^livre-[A-Za-z0-9-]{1,110}$/.test(id)) : []};
}
/* ce que le Registre des Rencontres garde ici : {items, supprimes}, ou une simple liste avant */
function bestiaireIci(cle, champ){
  let o = null;
  try{ o = JSON.parse(localStorage.getItem(cle) || 'null'); }catch(e){ o = null; }
  const items = Array.isArray(o) ? o : o && Array.isArray(o.items) ? o.items : [];
  const out = {items:{}, supprimes:{}};
  items.forEach(x => { if(x && typeof x === 'object' && ID_OK.test(x[champ] || '')) out.items[x[champ]] = x; });
  if(o && Array.isArray(o.supprimes)) o.supprimes.forEach(id => { if(typeof id === 'string') out.supprimes[id] = 1; });
  return out;
}
/* le fichier range par identifiant ; une sauvegarde déposée en listes se lit aussi */
function parIdentifiant(m, champ){
  if(Array.isArray(m)){ const t = {}; m.forEach(x => { if(x && typeof x === 'object' && typeof x[champ] === 'string') t[x[champ]] = x; }); return t; }
  return m && typeof m === 'object' ? m : {};
}
/* le plus récent l'emporte, une trace de suppression aussi ; ce qu'on vient de supprimer ici ne revient pas du dépôt */
function fondreBestiaire(ici, depot, norm){
  const m = {};
  Object.keys(ici.items).forEach(id => m[id] = ici.items[id]);
  Object.keys(depot || {}).forEach(id => {
    const x = depot[id];
    if(!x || typeof x !== 'object' || !ID_OK.test(id)) return;
    if(!m[id] || (+x.maj || 0) > (+m[id].maj || 0)) m[id] = x;
  });
  return Object.keys(m).filter(id => !m[id].supprime && !ici.supprimes[id]).map(id => norm(m[id], id));
}
function poserBestiaire(){
  /* tes créatures, et tes retouches des entrées du livre, qui prennent leur place. Celles de l'ancien bestiaire
     ne remplacent plus rien : le Registre des Rencontres propose d'en faire des créatures à toi */
  const tout = fondreBestiaire(bestiaireIci('faelorenn.bestiaire', 'id'), TIR.depotC, normMaison).filter(c => c.n);
  MAISON = tout.filter(c => !estRetouche(c) && !estAncienne(c));
  RETOUCHES = tout.filter(estRetouche);
  appliquerRetouches();
  TABLES_BUTIN = fondreBestiaire(bestiaireIci('faelorenn.butins', 'k'), TIR.depotB, normTableMaison);
  FAM_MAISON = fondreBestiaire(bestiaireIci('faelorenn.familles', 'k'), TIR.depotF, normFamMaison).filter(f => !ADV.familles.some(x => x.k === f.k));
  /* tant que le dépôt n'est pas lu, une famille ou des créatures à toi peuvent encore arriver */
  if(!TIR.complet) return;
  if(S.fam.length && !famille(S.fam[0])) S.fam = [];
  if(S.source === 'maison' && !MAISON.length) S.source = 'tout';
}
function chargerBestiaire(){
  const gh = ghcPret();
  if(!gh){ TIR.complet = true; TIR.rate = false; }
  poserBestiaire();
  dessinerCombat();
  if(!gh || TIR.lecture) return;
  TIR.lecture = true;
  /* rate : le dépôt n'a pas pu se lire, ce navigateur ne sait peut-être pas tout */
  const fin = rate => {
    TIR.lecture = false; TIR.lu = maintenant(); TIR.complet = true; TIR.rate = !!rate; poserBestiaire(); dessinerCombat();
    if(PAGE === 'missions') dessinerMissions(false);
  };
  ghcLireUnFichier(GHC_FICHIERS.bestiaire).then(o => {
    if(o && typeof o === 'object'){ TIR.depotC = parIdentifiant(o.creatures, 'id'); TIR.depotF = parIdentifiant(o.familles, 'k'); TIR.depotB = parIdentifiant(o.butins, 'k'); }
    fin(false);
  }, () => fin(true));
}
/* un bestiaire lu il y a plus de deux minutes se relit, pour le tirage suivant */
function rafraichirBestiaire(){ if(ghcPret() && !TIR.lecture && maintenant() - TIR.lu > 120000) chargerBestiaire(); }
/* le Registre des Rencontres, ouvert dans un autre onglet, vient de changer le bestiaire */
window.addEventListener('storage', e => {
  if((e.key === 'faelorenn.bestiaire' || e.key === 'faelorenn.familles' || e.key === 'faelorenn.butins') && $('seCombat')){ poserBestiaire(); dessinerCombat(); }
  /* une mission lancée depuis le tableau du Havre règle le tirage : cet onglet le reprend */
  if(e.key === CLE_TIRAGE && $('seCombat')){ lireTirage(); dessinerCombat(); }
});

/* ---------- le formulaire, dans « En face » ---------- */
const PTS = n => n + ' point' + (n > 1 ? 's' : '');
function formTirage(enCours){
  majPjTirage();
  const w = el('div','tirage');

  /* combien ils sont en face : le budget du livre */
  const l1 = el('div','tl');
  l1.append(el('span','lab', 'Contre'));
  const st = el('div','pas');
  const moins = el('button', null, '−'); moins.type = 'button'; moins.id = 'tirMoins'; moins.setAttribute('aria-label', 'Un personnage de moins');
  const plus = el('button', null, '+'); plus.type = 'button'; plus.id = 'tirPlus'; plus.setAttribute('aria-label', 'Un personnage de plus');
  moins.disabled = S.pj <= 1; plus.disabled = S.pj >= 6;
  const regle = v => { S.pj = Math.max(1, Math.min(6, v)); TIR.pjMain = S.pj !== Math.max(1, Math.min(6, persos().length || 1)); garderTirage(); dessinerCombat(true); };
  moins.onclick = () => regle(S.pj - 1);
  plus.onclick = () => regle(S.pj + 1);
  st.append(moins, el('b', null, String(S.pj)), plus);
  l1.append(st, el('span','mini', S.pj > 1 ? 'personnages' : 'personnage'));
  l1.title = TIR.pjMain ? 'Choisi à la main' : 'Autant que de personnages à la table';
  w.append(l1);

  const seg = el('div','seg tint'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Le genre de combat');
  INTENSITES.forEach(i => {
    const b = el('button', null, i.l); b.type = 'button'; b.id = 'tirInt-' + i.k;
    b.setAttribute('aria-pressed', S.inten === i.k ? 'true' : 'false');
    b.title = i.d;
    b.onclick = () => { S.inten = i.k; garderTirage(); dessinerCombat(true); };
    seg.append(b);
  });
  w.append(seg);

  /* d'où ils viennent : une famille, le livre, ton bestiaire */
  const l2 = el('div','tsel');
  const sf = el('select'); sf.id = 'tirFam'; sf.setAttribute('aria-label', 'Quelle famille');
  sf.add(new Option('Toutes les familles', ''));
  remplirFamilles(sf, true);
  if(S.fam[0] && !famille(S.fam[0])) sf.add(new Option('Une famille à toi, en lecture…', S.fam[0]));
  sf.value = S.fam[0] || '';
  sf.onchange = () => { S.fam = sf.value ? [sf.value] : []; garderTirage(); dessinerCombat(true); };
  const ss = el('select'); ss.id = 'tirSrc'; ss.setAttribute('aria-label', 'Le livre, ton bestiaire');
  SOURCES.forEach(s => {
    const o = new Option(s.k === 'maison' ? 'Ton bestiaire seul (' + MAISON.length + ')' : s.k === 'tout' ? 'Le livre et ton bestiaire' : 'Le livre seul', s.k);
    o.disabled = s.k === 'maison' && !MAISON.length;
    ss.add(o);
  });
  ss.value = S.source;
  ss.onchange = () => { S.source = ss.value; garderTirage(); dessinerCombat(true); };
  l2.append(sf, ss);
  w.append(l2);
  if(S.fam.length && !rangsDisponibles().length) w.append(el('p','mini', 'Personne dans cette famille pour l’instant : le tirage reprend tout le catalogue.'));

  const a1 = el('div','acts');
  const tirer = el('button','btn sm', S.liste.length ? 'Tirer de nouveau' : 'Tirer'); tirer.type = 'button'; tirer.id = 'tirTirer';
  tirer.onclick = () => { tirerComposition(); garderTirage(); dessinerCombat(true); rafraichirBestiaire(); };
  a1.append(tirer);
  if(S.liste.length){
    const vider = el('button','btn ghost xs','Vider'); vider.type = 'button'; vider.id = 'tirVider';
    vider.onclick = () => { S.liste = []; S.pourquoi = ''; garderTirage(); dessinerCombat(true); };
    a1.append(vider);
  }
  w.append(a1);
  w.append(el('p','mini tbudget', 'Budget : ' + PTS(budget()) + ', ' + intensite().d + '.' + (S.liste.length ? ' Posé : ' + depense() + '.' : '')));

  /* ce qui est tiré : on retire une tête, on en change une, on en ajoute */
  if(S.liste.length){
    if(S.pourquoi){
      const p = el('p','mini cpourquoi tmotif');
      p.append(document.createTextNode(S.pourquoi + ' '));
      const re = el('button','ax', '↻'); re.type = 'button'; re.id = 'tirMotif'; re.title = 'Une autre raison';
      re.setAttribute('aria-label', 'Tirer une autre raison');
      re.onclick = () => { S.pourquoi = pick(ADV.pourquoi); garderTirage(); dessinerCombat(true); };
      p.append(re);
      w.append(p);
    }
    const u = el('ul','tliste');
    S.liste.forEach((a, i) => {
      const c = trouveId(a.cid);
      const stc = c ? statsDe(c) : RANG[a.r];
      const li = el('li');
      li.append(el('span','rdot r' + a.r, String(a.r)));
      const t = el('span','tn');
      t.append(el('b', null, c ? c.n : a.n));
      if(c && c.src === 'maison') t.append(el('span','mini', ' à toi'));
      t.append(el('span','mini', ' · ' + stc.pv + ' PV, ' + stc.deg));
      li.append(t);
      const re = el('button','ax', '↻'); re.type = 'button'; re.title = 'Un autre de ce rang';
      re.setAttribute('aria-label', 'Un autre de rang ' + a.r + ' à la place de ' + (c ? c.n : a.n));
      re.onclick = () => { S.liste[i] = creature(a.r); garderTirage(); dessinerCombat(true); };
      const x = el('button','ax', '×'); x.type = 'button';
      x.setAttribute('aria-label', 'Retirer ' + (c ? c.n : a.n) + ' du tirage');
      x.onclick = () => { S.liste.splice(i, 1); if(!S.liste.length) S.pourquoi = ''; garderTirage(); dessinerCombat(true); };
      li.append(re, x);
      u.append(li);
    });
    w.append(u);
  }

  /* quelqu'un de précis, ou au hasard d'un rang */
  const l3 = el('div','tajout');
  const sq = el('select'); sq.id = 'tirQui'; sq.setAttribute('aria-label', 'Qui ajouter');
  const og0 = el('optgroup'); og0.label = 'Au hasard, dans le tirage choisi';
  for(let r = 1; r <= 5; r++) og0.append(new Option('Un de rang ' + r + ' · ' + RANG[r].nom, 'r' + r));
  sq.append(og0);
  for(let r = 1; r <= 5; r++){
    const og = el('optgroup'); og.label = 'Rang ' + r + ' · ' + RANG[r].nom;
    toutRang(r).forEach(c => og.append(new Option(c.n + (c.src === 'maison' ? ' (à toi)' : ''), c.id)));
    sq.append(og);
  }
  if(![].some.call(sq.options, o => o.value === TIR.qui)) TIR.qui = 'r2';
  sq.value = TIR.qui;
  sq.onchange = () => { TIR.qui = sq.value; };
  const nb = el('input'); nb.type = 'number'; nb.id = 'tirNb'; nb.min = '1'; nb.max = '12'; nb.inputMode = 'numeric'; nb.value = String(TIR.n);
  nb.setAttribute('aria-label', 'Combien');
  nb.oninput = () => { TIR.n = Math.max(1, Math.min(12, parseInt(nb.value, 10) || 1)); };
  const aj = el('button','btn ghost sm','Ajouter'); aj.type = 'button'; aj.id = 'tirAjouter';
  aj.onclick = () => {
    const place = 12 - S.liste.length;
    if(place <= 0){ msgTable('Douze en face au plus, comme dans le Registre des Rencontres.', false); return; }
    const n = Math.min(place, Math.max(1, TIR.n));
    for(let i = 0; i < n; i++){
      if(/^r[1-5]$/.test(TIR.qui)) S.liste.push(creature(+TIR.qui[1]));
      else { const c = trouveId(TIR.qui); if(c) S.liste.push(entree(c, c.r)); }
    }
    if(!S.pourquoi && !enCours) S.pourquoi = pick(ADV.pourquoi);
    TIR.n = 1; garderTirage(); dessinerCombat(true);
  };
  l3.append(sq, nb, aj);
  w.append(l3);

  const a2 = el('div','acts tposer');
  /* une créature à toi que le dépôt n'a pas encore rendue partirait avec les valeurs du rang : on attend */
  const attend = TIR.lecture && S.liste.some(a => !trouveId(a.cid));
  const poser = el('button','btn sm', attend ? 'Lecture de ton bestiaire…' : enCours ? 'Les faire entrer dans le combat' : 'Mettre en face'); poser.type = 'button'; poser.id = 'tirPoser';
  poser.disabled = !S.liste.length || attend;
  poser.onclick = mettreEnFace;
  a2.append(poser);
  w.append(a2);
  w.append(el('p','mini', 'Le même tirage que le Registre des Rencontres' + (MAISON.length ? ', avec ' + MAISON.length + ' créature' + (MAISON.length > 1 ? 's' : '') + ' de ton bestiaire' : '') +
    (TIR.lecture ? ' (lecture du dépôt…)' : '') + '. L’ennemi touche d’office.'));
  return w;
}
function blocTirage(enCours){
  if(!enCours){
    const w = el('div','tbloc');
    w.append(el('p','lab', 'Tirer une rencontre'));
    w.append(formTirage(false));
    return w;
  }
  const d = el('details','ajoutadv');
  d.open = TIR.renforts;
  d.ontoggle = () => { TIR.renforts = d.open; };
  d.append(el('summary', null, 'D’autres arrivent en face'));
  d.append(formTirage(true));
  return d;
}

/* ---------- ce qui est tiré entre dans la séance ---------- */
function mettreEnFace(){
  if(!S.liste.length) return;
  const e = seanceCourante();
  if(!e){ msgTable('Commence d’abord une séance.', false); return; }
  const adv = S.liste.map(adversaireEnvoye), pourquoi = S.pourquoi || '';
  const r = combatEnCours();
  S.liste = []; S.pourquoi = ''; TIR.renforts = false; garderTirage();
  if(r) ajouterAuCombat(r, adv);
  else poserRencontre({id:nouvelId('t'), titre:'', pourquoi:pourquoi, adversaires:adv}, e);
  dessinerCombat(true);
  msgTable((r ? 'Arrivent en face : ' : 'En face : ') + listeNoms(adv.map(a => a.n)) + '.', true);
}
function demarrerTirage(){
  lireTirage();
  chargerBestiaire();
}
