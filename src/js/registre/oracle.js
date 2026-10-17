/* ============ l'oracle, à la table ============
   Une question fermée, sa plausibilité, un d20 : de « Non, et en plus » à « Oui, et en plus ». Le site lance, ou
   l'on écrit son propre dé. La réponse s'écrit dans la séance, comme un paragraphe.
   « Un visage connu ? » : l'oracle dit si quelqu'un du Registre des Visages arrive, plus volontiers quand on est là
   où on le trouve d'habitude, puis le tire au sort, en donnant plus de chances à ceux d'ici. */

const ORA = {q:'', p:'neutre', d:'', vd:'', lieu:null, res:null, visage:null, reglage:null, ouvert:false, armeSite:false, presse:false, apres:false};

function seuilsOracle(){ return (T.oracle && T.oracle.lignes) || SEUILS_SITE; }
const seuilsDuSite = () => PLAUSIBLES.every(x => seuilsOracle()[x.k].join() === SEUILS_SITE[x.k].join());
const plausibilite = k => PLAUSIBLES.find(x => x.k === k) || PLAUSIBLES[2];
const reponseOracle = k => REPONSES_ORACLE.find(x => x.k === k) || null;
/* combien de oui sur vingt, pour une ligne */
const ouiSur20 = b => 20 - b[2];

/* ---------- où l'on est ---------- */
/* le lieu écrit pour cette séance, sinon celui de la mission en cours (elle peut durer plusieurs séances) */
function lieuActuel(){
  const e = seanceCourante(); if(!e) return '';
  if(e.lieu && e.lieu.trim()) return e.lieu.trim();
  const m = missionEnCours();
  return m && m.ou ? m.ou.trim() : '';
}
/* le lieu se garde sans redessiner la carte : le bouton sur lequel on clique en quittant le champ ne doit pas
   disparaître sous la souris. Il a sa propre date : un titre changé ailleurs au même moment ne l'efface pas */
function garderLieu(val){
  const e = seanceCourante(), x = e && T.journal[e.id];
  if(!x) return false;
  val = String(val || '').replace(/\s+/g, ' ').trim();
  if(val === (x.lieu || '').trim()) return false;
  T.journal[e.id] = Object.assign({}, x, {lieu:val, majLieu:maintenant()});
  T.maj = maintenant(); sauverLocal(); planifierEcriture();
  return true;
}
/* deux noms de lieu qui parlent du même endroit : l'un contient l'autre, ou ils partagent un nom propre.
   « Hameau de Ronceval » et « Ronceval » oui ; « Havre de Vaurenne » et « Havre de Sans-Havre » non */
const MOTS_DE_LIEU = new Set(['havre','hameau','village','ville','cite','bourg','route','chemin','foret','bois','riviere','fleuve',
  'pont','mine','camp','ruine','ruines','grotte','tour','porte','place','marche','auberge','taverne','plaine','montagne','vallee',
  'port','quartier','temple','chateau','champ','champs','ferme','moulin','sous','dans','pres','entre','vers','avec']);
const motsDuLieu = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/[^a-z0-9 -]+/g, ' ').replace(/\s+/g, ' ').trim();
function memeLieu(a, b){
  const x = motsDuLieu(a), y = motsDuLieu(b);
  if(!x || !y) return false;
  if(x === y) return true;
  const court = x.length < y.length ? x : y, long = court === x ? y : x;
  if(court.length >= 4 && (' ' + long + ' ').indexOf(' ' + court + ' ') >= 0) return true;
  const propres = s => s.split(/[\s-]+/).filter(w => w.length >= 4 && !MOTS_DE_LIEU.has(w));
  const ey = new Set(propres(y));
  return propres(x).some(w => ey.has(w));
}
function lieuxConnus(){
  const vus = {}, out = [];
  pnjs().map(p => p.lieu).concat(Object.keys(T.missions).map(k => T.missions[k]).filter(m => m && !m.supprime).map(m => m.ou))
    .forEach(l => { const s = String(l || '').trim(); if(s && !vus[s.toLowerCase()]){ vus[s.toLowerCase()] = 1; out.push(s); } });
  return out.sort((a, b) => a.localeCompare(b, 'fr'));
}

/* ---------- qui peut venir ---------- */
/* les vivants et les disparus du Registre des Visages, sauf ceux qui sont déjà dans la séance */
function visagesPossibles(){
  const e = seanceCourante(), ici = lieuActuel();
  const la = new Set(e ? gensDeLaSeance(e.id).map(p => p.id) : []);
  return pnjs().filter(p => p.statut !== 'mort' && !la.has(p.id) && (p.nom || '').trim() && !nomAnonyme(p.nom))
    .map(p => ({p:p, ici:!!ici && memeLieu(p.lieu, ici)}));
}
/* ceux d'ici comptent quatre fois, ceux croisés ces dernières séances deux fois, un disparu moitié moins */
function poidsVisages(l){
  const recentes = new Set(seances().slice(0, 4).map(e => e.id));
  return l.map(x => {
    let w = 1;
    const pourquoi = [];
    if(x.ici){ w *= 4; pourquoi.push('on le trouve ici'); }
    else if(textesDe('pnj:' + x.p.id).some(t => recentes.has(t.e.id) && (t.agit || t.b.type !== 'oracle'))){ w *= 2; pourquoi.push('croisé ces dernières séances'); }
    if(x.p.statut === 'disparu'){ w *= 0.5; pourquoi.push('disparu'); }
    return Object.assign({}, x, {w:w, pourquoi:pourquoi});
  });
}
function tirerVisage(l){
  const tot = l.reduce((a, x) => a + x.w, 0);
  let r = Math.random() * tot;
  for(const x of l){ r -= x.w; if(r < 0) return x; }
  return l[l.length - 1] || null;
}
/* quelqu'un d'ici : plausible. Personne d'ici : peu plausible */
const plausibiliteVisage = l => l.some(x => x.ici) ? 'plaus' : 'peu';

/* ---------- demander ---------- */
function ecrireOracle(texte, o, qui){
  const e = seanceCourante(); if(!e) return '';
  const b = normBloc({id:nouvelId('b'), maj:maintenant(), seance:e.id, ordre:maintenant(), type:'oracle', texte:texte,
    auteur:MOI.joueur || '', qui:qui || {k:'mj'}, oracle:o});
  T.blocs[b.id] = b;
  return b.id;
}
function demanderOracle(d, site){
  const p = ORA.p, q = String(ORA.q || '').replace(/\s+/g, ' ').trim();
  const r = reponseDe(seuilsOracle()[p] || SEUILS_SITE.neutre, d);
  ORA.res = {q:q, p:p, d:d, r:r.k, site:site};
  ORA.q = ''; ORA.d = '';
  /* la réponse se dit une fois, là où les lecteurs d'écran l'entendent */
  const dit = r.l + ' · ' + plausibilite(p).l.toLowerCase() + ', d20 : ' + d;
  if(seanceCourante()){ changer(() => { ecrireOracle(q, {p:p, r:r.k, d:d, site:site}); }); msgTable(dit, true); }
  else msgTable(dit + '. Commence une séance : les réponses de l’oracle s’y écriront.', true);
  dessinerOracle(true);
  const x = $('oraQ'); if(x) x.focus({preventScroll:true});
}
function visageConnu(d, site){
  /* le lieu qu'on vient d'écrire compte, même s'il n'a pas encore été gardé */
  if(ORA.lieu != null){ garderLieu(ORA.lieu); ORA.lieu = null; }
  const l = poidsVisages(visagesPossibles());
  if(!l.length){ msgTable('Personne à faire venir : le Registre des Visages est vide, ou tous sont déjà dans la séance.', false); return; }
  const ici = lieuActuel(), p = plausibiliteVisage(l);
  const r = reponseDe(seuilsOracle()[p] || SEUILS_SITE.neutre, d);
  const x = r.oui ? tirerVisage(l) : null;
  ORA.visage = {p:p, d:d, r:r.k, site:site, id:x ? x.p.id : '', pourquoi:x ? x.pourquoi : []};
  ORA.vd = '';
  const q = 'Un visage connu apparaît ?';
  const dit = r.l + (x ? ' : ' + x.p.nom : '') + ' · ' + plausibilite(p).l.toLowerCase() + ', d20 : ' + d;
  if(seanceCourante()){ changer(() => { ecrireOracle(q, {p:p, r:r.k, d:d, site:site, lieu:ici}, x ? {k:'pnj', id:x.p.id, nom:x.p.nom} : null); }); msgTable(dit, true); }
  else msgTable(dit + '. Commence une séance : les réponses de l’oracle s’y écriront.', true);
  dessinerOracle(true);
}
const d20Ecrit = v => { const n = parseInt(v, 10); return n >= 1 && n <= 20 ? n : 0; };

/* ---------- dans le récit, et dans les copies ---------- */
function corpsOracle(b){
  const o = b.oracle || {}, r = reponseOracle(o.r);
  const d = el('div','boracle ' + (r && r.oui ? 'ooui' : 'onon'));
  d.append(el('p','olab', 'Oracle · ' + plausibilite(o.p).l.toLowerCase() + (o.d ? ' · d20 : ' + o.d + (o.site ? '' : ', dé de la table') : '') + (o.lieu ? ' · ' + o.lieu : '')));
  const p = el('p');
  const q = b.texte.trim();
  if(q){ const s = el('span','oq'); s.append(texteRiche(q)); p.append(s, document.createTextNode(' ')); }
  p.append(el('b','orep', r ? r.l : 'Réponse perdue'));
  if(b.qui.k === 'pnj'){
    const nom = nomDe(b.qui);
    const x = el('button','mention', nom); x.type = 'button'; x.title = 'La fiche de ' + nom;
    x.onclick = ev => { ev.stopPropagation(); ouvrirFiche('pnj:' + b.qui.id); };
    p.append(document.createTextNode(' : '), x, document.createTextNode('.'));
  } else p.append(document.createTextNode('.'));
  d.append(p);
  return d;
}
function phraseOracle(b){
  const o = b.oracle || {}, r = reponseOracle(o.r), q = b.texte.trim();
  return 'Oracle, ' + plausibilite(o.p).l.toLowerCase() + (o.d ? ', d20 : ' + o.d : '') + (o.lieu ? ', lieu : ' + o.lieu : '') + ' · ' + (q ? q + ' ' : '') +
    (r ? r.l : '?') + (b.qui.k === 'pnj' ? ' : ' + nomDe(b.qui) : '') + '.';
}

/* ce que la carte dit de « Un visage connu ? » : la plausibilité, et pourquoi */
function aideVisage(){
  const l = visagesPossibles(), ici = l.filter(x => x.ici).map(x => x.p.nom), pv = plausibiliteVisage(l);
  if(!l.length) return 'Personne à faire venir : le Registre des Visages est vide, ou tous sont déjà dans la séance.';
  if(ici.length) return plausibilite(pv).l + ' : ' + (ici.length > 3 ? ici.slice(0, 3).join(', ') + ' et ' + (ici.length - 3) + ' autre' + (ici.length > 4 ? 's' : '') : ici.join(', ').replace(/, ([^,]*)$/, ' et $1')) + ', qu’on trouve ici.';
  return plausibilite(pv).l + ' : ' + (lieuActuel() ? 'personne du Registre des Visages n’est d’ici.' : 'dis où vous êtes, ceux qu’on y trouve viendront plus volontiers.');
}
/* un appui de souris ou de doigt sur la carte : rien ne se redessine avant qu'il soit relâché */
let ORA_ECOUTE = false;
function ecouterAppuis(box){
  box.addEventListener('pointerdown', () => { ORA.presse = true; }, true);
  if(ORA_ECOUTE) return;
  ORA_ECOUTE = true;
  const fin = () => { if(!ORA.presse) return; ORA.presse = false; if(ORA.apres){ ORA.apres = false; setTimeout(() => dessinerOracle(true), 0); } };
  document.addEventListener('pointerup', fin, true);
  document.addEventListener('pointercancel', fin, true);
}

/* ---------- la carte, sous la main ---------- */
function dessinerOracle(force){
  const box = $('seOracle'); if(!box) return;
  if(!box._appuis){ box._appuis = true; ecouterAppuis(box); }
  if(ORA.presse){ ORA.apres = true; return; }
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerOracle(true)); return; }
  const focus = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : '';
  box.innerHTML = '';
  box.hidden = false;
  const e = seanceCourante();
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'L’oracle'), el('span','mini', 'oui ou non, au d20'));
  box.append(t);

  /* la question */
  const q = el('input'); q.type = 'text'; q.id = 'oraQ'; q.value = ORA.q; q.maxLength = 300;
  q.placeholder = 'La question, si tu veux l’écrire';
  q.setAttribute('aria-label', 'La question posée à l’oracle');
  q.oninput = () => { ORA.q = q.value; };
  q.onkeydown = ev => { if(ev.key === 'Enter' && !ev.isComposing){ ev.preventDefault(); demanderOracle(de(20), true); } };
  brancherMentions(q);
  box.append(q);
  const seg = el('div','seg oplaus'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Est-ce plausible ?');
  PLAUSIBLES.forEach(x => {
    const b = el('button', null, x.l); b.type = 'button'; b.id = 'oraP-' + x.k;
    b.setAttribute('aria-pressed', ORA.p === x.k ? 'true' : 'false');
    b.title = ouiSur20(seuilsOracle()[x.k]) * 5 + ' % de oui';
    b.onclick = () => { ORA.p = x.k; dessinerOracle(true); const y = $('oraP-' + x.k); if(y) y.focus(); };
    seg.append(b);
  });
  box.append(seg);
  const a = el('div','acts oacts');
  const go = el('button','btn sm','Demander'); go.type = 'button'; go.id = 'oraDemander';
  go.onclick = () => demanderOracle(de(20), true);
  const d = el('input'); d.type = 'number'; d.id = 'oraD'; d.min = '1'; d.max = '20'; d.inputMode = 'numeric'; d.value = ORA.d;
  d.setAttribute('aria-label', 'Ton d20');
  d.oninput = () => { ORA.d = d.value; };
  const entrer = () => { const n = d20Ecrit(ORA.d); if(!n){ msgTable('Écris ton d20 : un nombre de 1 à 20.', false); d.focus(); return; } demanderOracle(n, false); };
  d.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); entrer(); } };
  const ok = el('button','btn ghost sm','Entrer'); ok.type = 'button'; ok.id = 'oraEntrer'; ok.onclick = entrer;
  ok.setAttribute('aria-label', 'Entrer ton d20 pour la question');
  const sien = el('span','amain'); sien.append(el('span','mini ou', 'ou ton d20 :'), d, ok);
  a.append(go, sien);
  box.append(a);
  if(ORA.res){
    const r = reponseOracle(ORA.res.r);
    const w = el('div','ores ' + (r.oui ? 'ooui' : 'onon'));
    w.append(el('b', null, r.l));
    w.append(el('span','mini', [ORA.res.q ? '« ' + sansMarques(ORA.res.q, gensCitables()) + ' »' : '', plausibilite(ORA.res.p).l.toLowerCase(), 'd20 : ' + ORA.res.d + (ORA.res.site ? '' : ', dé de la table')].filter(Boolean).join(' · ')));
    box.append(w);
  }
  if(!e) box.append(el('p','mini', 'Pas encore de séance : l’oracle répond ici, sans rien écrire.'));

  /* les seuils */
  box.append(reglagesOracle());
  if(focus && $(focus)) $(focus).focus({preventScroll:true});
  dessinerVisageConnu();
}
/* « Un visage connu ? » : son propre widget, et son bouton dans la barre du bas */
function dessinerVisageConnu(){
  const sien = $('seVisage'), box = sien || $('seOracle');
  if(!box) return;
  if(sien){ sien.innerHTML = ''; sien.hidden = false; }
  const e = seanceCourante();
  const v = el('div','tbloc ovisage');
  v.append(el('p','lab', 'Un visage connu ?'));
  const lieu = el('input'); lieu.type = 'text'; lieu.id = 'oraLieu'; lieu.value = ORA.lieu != null ? ORA.lieu : lieuActuel(); lieu.maxLength = 160;
  lieu.placeholder = e ? 'Où êtes-vous ? Ronceval, Vaurenne…' : 'Commence une séance d’abord';
  lieu.disabled = !e;
  lieu.setAttribute('aria-label', 'Où êtes-vous');
  lieu.setAttribute('list', listeDonnees('dl-lieux', lieuxConnus()));
  const aide = el('p','mini oaide');
  lieu.oninput = () => { ORA.lieu = lieu.value; };
  lieu.onchange = () => { garderLieu(lieu.value); ORA.lieu = null; aide.textContent = aideVisage(); };
  v.append(lieu);
  const l = visagesPossibles();
  aide.textContent = aideVisage();
  v.append(aide);
  const av = el('div','acts oacts');
  const gv = el('button','btn ghost sm','Un visage connu ?'); gv.type = 'button'; gv.id = 'oraVisage'; gv.disabled = !l.length;
  gv.onclick = () => visageConnu(de(20), true);
  const vd = el('input'); vd.type = 'number'; vd.id = 'oraVD'; vd.min = '1'; vd.max = '20'; vd.inputMode = 'numeric'; vd.value = ORA.vd;
  vd.setAttribute('aria-label', 'Ton d20, pour un visage connu');
  vd.oninput = () => { ORA.vd = vd.value; };
  const entrerV = () => { const n = d20Ecrit(ORA.vd); if(!n){ msgTable('Écris ton d20 : un nombre de 1 à 20.', false); vd.focus(); return; } visageConnu(n, false); };
  vd.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); entrerV(); } };
  const okv = el('button','btn ghost sm','Entrer'); okv.type = 'button'; okv.id = 'oraVEntrer'; okv.onclick = entrerV; okv.disabled = !l.length;
  okv.setAttribute('aria-label', 'Entrer ton d20 pour un visage connu');
  const sienv = el('span','amain'); sienv.append(el('span','mini ou', 'ou ton d20 :'), vd, okv);
  av.append(gv, sienv);
  v.append(av);
  if(ORA.visage){
    const r = reponseOracle(ORA.visage.r), p = ORA.visage.id ? unPnj(ORA.visage.id) : null;
    const w = el('div','ores ' + (r.oui ? 'ooui' : 'onon'));
    w.append(el('b', null, r.l + (p ? ' : ' + p.nom : '')));
    w.append(el('span','mini', [plausibilite(ORA.visage.p).l.toLowerCase(), 'd20 : ' + ORA.visage.d + (ORA.visage.site ? '' : ', dé de la table'),
      p ? [p.role, p.lieu].filter(Boolean).join(', ') : '', ORA.visage.pourquoi.join(', ')].filter(Boolean).join(' · ')));
    if(p){
      const acts = el('div','acts');
      const fp = el('button','btn ghost xs','Faire parler'); fp.type = 'button'; fp.id = 'oraParler'; fp.onclick = () => composerPourPnj(p);
      const fi = el('a','mini', 'sa fiche'); fi.href = 'pnj.html#grand=' + encodeURIComponent('pnj:' + p.id); fi.target = ONGLET_VISAGES;
      acts.append(fp, fi);
      w.append(acts);
    }
    v.append(w);
  }
  box.append(v);
}

/* ---------- les seuils de la table ----------
   Pour chaque ligne, le dernier nombre de « Non, et en plus », « Non », « Non, mais », « Oui, mais » et « Oui ».
   Ils partent avec la table, dans votre dépôt privé : jamais sur le site public */
const texteBornes = b => b.join(' ');
/* n'importe quoi d'autre qu'un chiffre sépare : « 1 2 3 5 16 », « 1,2,3,5,16 », « 1-2-3-5-16 » */
const lireBornes = s => bornesOk(String(s || '').split(/[^0-9]+/).filter(Boolean));
function barreOracle(b){
  const w = el('div','obar'); w.setAttribute('aria-hidden', 'true');
  let avant = 0;
  REPONSES_ORACLE.forEach((r, i) => {
    const fin = i < 5 ? b[i] : 20, n = fin - avant;
    if(n > 0){ const s = el('span','o-' + r.k); s.style.flexGrow = String(n); s.title = r.l + ' : ' + (n > 1 ? (avant + 1) + ' à ' + fin : String(fin)); w.append(s); }
    avant = fin;
  });
  return w;
}
function detailBornes(b){
  let avant = 0;
  return REPONSES_ORACLE.map((r, i) => {
    const fin = i < 5 ? b[i] : 20, n = fin - avant, de = avant + 1;
    avant = fin;
    return n <= 0 ? '' : r.l.replace(/, (et en plus|mais par contre)$/, (m, x) => x === 'et en plus' ? ' et' : ' mais') + ' ' + (n > 1 ? de + '-' + fin : fin);
  }).filter(Boolean).join(' · ');
}
function reglagesOracle(){
  const det = el('details','oseuils');
  det.open = ORA.ouvert;
  det.ontoggle = () => { ORA.ouvert = det.open; };
  const sm = el('summary', null, seuilsDuSite() ? 'Les seuils · ceux du site' : 'Les seuils · les vôtres'); sm.id = 'oraSeuils';
  det.append(sm);
  det.append(el('p','mini', 'Pour chaque ligne, le dernier nombre de « Non, et en plus », « Non », « Non, mais par contre », « Oui, mais par contre » et « Oui » ; « Oui, et en plus » va jusqu’à 20. Les vôtres vivent dans la table, comme le reste : jamais sur le site public.'));
  const brouillon = ORA.reglage || PLAUSIBLES.reduce((o, x) => { o[x.k] = texteBornes(seuilsOracle()[x.k]); return o; }, {});
  PLAUSIBLES.forEach(x => {
    const w = el('div','oligne');
    const lab = el('label','lab', x.l); lab.htmlFor = 'oraS-' + x.k;
    const i = el('input'); i.type = 'text'; i.id = 'oraS-' + x.k; i.value = brouillon[x.k]; i.inputMode = 'decimal'; i.spellcheck = false;
    const b0 = lireBornes(brouillon[x.k]);
    if(!b0) i.classList.add('faux');
    const bar = b0 ? barreOracle(b0) : el('div','obar vide');
    const txt = el('p','mini odetail', b0 ? ouiSur20(b0) * 5 + ' % de oui · ' + detailBornes(b0) : 'Cinq nombres de 0 à 20, qui ne redescendent pas.');
    i.oninput = () => {
      ORA.reglage = ORA.reglage || Object.assign({}, brouillon);
      ORA.reglage[x.k] = i.value;
      const b = lireBornes(i.value);
      const nb = b ? barreOracle(b) : el('div','obar vide');
      w.replaceChild(nb, w.querySelector('.obar'));
      w.querySelector('.odetail').textContent = b ? ouiSur20(b) * 5 + ' % de oui · ' + detailBornes(b) : 'Cinq nombres de 0 à 20, qui ne redescendent pas.';
      i.classList.toggle('faux', !b);
    };
    w.append(lab, i, bar, txt);
    det.append(w);
  });
  const acts = el('div','acts'); acts.style.marginTop = '8px';
  const ok = el('button','btn sm','Enregistrer'); ok.type = 'button'; ok.id = 'oraSOk';
  ok.onclick = () => {
    const src = ORA.reglage || brouillon, lignes = {};
    for(const x of PLAUSIBLES){
      const b = lireBornes(src[x.k]);
      if(!b){ msgTable(x.l + ' : écris cinq nombres de 0 à 20, qui ne redescendent pas.', false); const y = $('oraS-' + x.k); if(y) y.focus(); return; }
      lignes[x.k] = b;
    }
    ORA.reglage = null;
    changer(() => { T.oracle = {lignes:lignes, maj:maintenant()}; });
    msgTable('Seuils enregistrés : ils partent avec la table.', true);
  };
  /* en deux temps : les seuils sont ceux de toute la table */
  const site = el('button','btn ghost sm' + (ORA.armeSite ? ' danger' : ''), ORA.armeSite ? 'Confirmer : ceux du site pour toute la table' : 'Revenir à ceux du site'); site.type = 'button'; site.id = 'oraSSite';
  site.onclick = () => {
    if(!ORA.armeSite){
      ORA.armeSite = true; dessinerOracle(true);
      setTimeout(() => { if(ORA.armeSite){ ORA.armeSite = false; dessinerOracle(false); } }, 5000);
      return;
    }
    ORA.armeSite = false; ORA.reglage = null;
    changer(() => { T.oracle = {lignes:JSON.parse(JSON.stringify(SEUILS_SITE)), maj:maintenant()}; });
    msgTable('L’oracle reprend les seuils du site.', true);
  };
  acts.append(ok, site);
  det.append(acts);
  return det;
}
