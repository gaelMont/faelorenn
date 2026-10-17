/* ============ le Registre des Compétences ============
   Trois choses, une seule page : les Pratiques (par liste, avec la caractéristique de la liste), les compétences,
   et les compétences de Bannière. Tout ce qu'on retouche se range dans ce navigateur (commun/reglesmaison.js)
   et, si le dépôt est relié, dans competences.json. Le créateur et la table s'en servent au chargement suivant. */

const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };

const UI = {dom:'', ouvert:null, neuve:false, flash:'', retirees:{}, aRedessiner:false};
let VUE = {competences:[], pratiques:[]};

const slug = s => regNorm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pluriel = (n, un, plus) => n + ' ' + (n > 1 ? plus : un);
const apos = s => String(s).replace(/'/g, '’');

/* « de la Sève (Écorciens et Élytris) » : le nom court, et les peuples */
function domCourt(dom){
  const m = /^(?:de la |du |de l['’]|de )(.+?)(?: \((.+)\))?$/.exec(dom);
  const n = apos(m ? m[1] : dom);
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function domPeuples(dom){ const m = /\((.+)\)$/.exec(dom); return m ? m[1] : ''; }
const grpTitre = l => l.grp === '_' ? domCourt(l.dom) : apos(l.grp);
const idListe = l => 'l-' + slug(l.dom + ' ' + l.grp);

function jetTexte(e){
  if(REG_JETS_CAR.indexOf(e.j) >= 0) return 'se lance sous ' + regSousLa(e.j);
  return e.j;
}
const coutTexte = e => e.pct ? e.pct : e.pc ? e.pc + ' PC' : 'gratuite';

/* ---------- petits morceaux d'interface ---------- */
function champ(parent, id, label, noeud, aide){
  const w = el('div','fld');
  const l = el('label', null, label); l.htmlFor = id;
  noeud.id = id;
  w.append(l, noeud);
  if(aide) w.append(el('p','aide', aide));
  parent.append(w);
  return noeud;
}
function saisie(type, val, ph){ const i = el('input'); i.type = type; i.value = val == null ? '' : val; if(ph) i.placeholder = ph; return i; }
function zone(val, lignes){ const t = el('textarea'); t.value = val || ''; t.rows = lignes || 3; return t; }
function bouton(texte, cls, action, id){
  const b = el('button', 'btn ' + cls, texte); b.type = 'button';
  if(id) b.id = id;
  b.onclick = action;
  return b;
}
/* un geste qui défait quelque chose se fait en deux temps : « Retirer », puis « Sûr ? ».
   Un double clic n'est pas une confirmation : le second clic, trop près du premier, est ignoré */
function boutonDanger(texte, action, id, sur){
  const b = el('button', 'btn danger xs', texte); b.type = 'button';
  if(id) b.id = id;
  let t = 0, arme = 0;
  b.onclick = () => {
    if(b.classList.contains('sur')){
      if(Date.now() - arme < 600) return;
      clearTimeout(t); action(); return;
    }
    arme = Date.now();
    b.classList.add('sur'); b.textContent = sur || 'Sûr ?';
    t = setTimeout(() => { b.classList.remove('sur'); b.textContent = texte; }, 4000);
  };
  return b;
}
const badge = (t, cls) => el('span', 'badge' + (cls ? ' ' + cls : ''), t);
const erreur = (w, t) => { const p = w.querySelector('.err.edit'); if(!p) return; p.textContent = t || ''; p.hidden = !t; };
/* un refus dans une ligne qui n'a pas d'éditeur : le message se pose sous son texte */
function refuser(noeud, t){
  let p = noeud.querySelector('.err.edit');
  if(!p){ p = el('p', 'err edit'); p.setAttribute('role', 'alert'); noeud.append(p); }
  p.textContent = t || ''; p.hidden = !t;
}

/* ce qui vient d'être retouché se signale un instant */
function apres(id){
  UI.ouvert = null;
  UI.flash = id || '';
  dessiner();
  sauverBientot();
  if(UI.flash){
    const r = Array.from(document.querySelectorAll('[data-id]')).find(x => x.dataset.id === UI.flash);
    if(r){ r.classList.add('flash'); try{ r.scrollIntoView({block:'nearest'}); }catch(e){} }
    UI.flash = '';
  }
}

/* ---------- les Pratiques ---------- */
function domaines(){
  const v = [];
  VUE.pratiques.forEach(l => { if(!l.banniere && v.indexOf(l.dom) < 0) v.push(l.dom); });
  return v;
}
function dessinerDomaines(){
  const ds = domaines();
  if(ds.indexOf(UI.dom) < 0) UI.dom = ds[0] || '';
  const seg = $('domSeg'); seg.innerHTML = '';
  ds.forEach(d => {
    const n = VUE.pratiques.filter(l => l.dom === d).reduce((s, l) => s + l.entrees.length, 0);
    const b = el('button', null, domCourt(d)); b.type = 'button'; b.dataset.dom = d;
    b.title = domPeuples(d);
    b.append(el('span', 'nb', String(n)));
    b.setAttribute('aria-pressed', d === UI.dom ? 'true' : 'false');
    b.onclick = () => { UI.dom = d; UI.ouvert = null; dessiner(); };
    seg.append(b);
  });
}
function selectCaster(l){
  const w = el('div', 'plcaster');
  if(l.banniere) return w;
  if(!l.caster){ w.append(el('span', 'aucun', 'Aucune ne se lance : ceux qu’elles touchent testent.')); return w; }
  const id = 'car-' + idListe(l);
  /* mêlées : ce choix les remet toutes sous la même, et chaque Pratique garde sinon la sienne */
  const lab = el('label', null, l.melange ? 'Tout mettre sous' : 'Se lance sous'); lab.htmlFor = id;
  const s = el('select'); s.id = id; s.dataset.dom = l.dom; s.dataset.grp = l.grp;
  if(l.melange) s.add(new Option('choisir…', ''));
  REG_JETS_CAR.forEach(c => s.add(new Option(regSousLa(c), c)));
  s.value = l.melange ? '' : l.caster;
  s.onchange = () => { if(s.value && regChangerCaster(l.dom, l.grp, s.value)){ UI.ouvert = null; dessiner(); sauverBientot(); } };
  w.append(lab, s);
  if(l.melange) w.append(el('span', 'aucun', 'Chaque Pratique se lance sous la sienne, écrite sur sa ligne.'));
  return w;
}
function ligneEntree(l, e){
  const r = el('div', 'prrow' + (e.retouche ? ' retouche' : ''));
  r.dataset.id = e.id; r.dataset.nom = e.n;
  const tx = el('div', 'prtxt');
  const nm = el('div', 'prnm', e.n);
  if(e.base) nm.append(badge('attaque de base', 'or'));
  if(!e.livre) nm.append(badge('à toi', 'or'));
  else if(e.retouche) nm.append(badge('retouchée', 'or'));
  tx.append(nm);
  if(!l.banniere) tx.append(el('div', 'prmeta', coutTexte(e) + ' · ' + jetTexte(e)));
  if(e.d) tx.append(el('div', 'prd', e.d));
  r.append(tx);
  const ac = el('div', 'bact');
  ac.append(bouton('Modifier', 'ghost xs', () => { UI.ouvert = {type:'prat', id:e.id}; dessiner(); }));
  /* retirer une Pratique du livre se défait (« Remettre ») ; supprimer une des tiennes, non */
  ac.append(e.livre
    ? boutonDanger('Retirer', () => { regRetirerPratique(e.id); apres(''); })
    : boutonDanger('Supprimer', () => { regRetirerPratique(e.id); apres(''); }, null, 'Sûr ? Elle ne revient pas'));
  r.append(ac);
  return r;
}
/* l'éditeur d'une Pratique ou d'une compétence de Bannière, en place de sa ligne */
function editeurEntree(l, e, nouveau){
  const ban = l.banniere;
  const w = el('div', 'editeur');
  w.dataset.editeur = nouveau ? 'nouvelle' : e.id;
  const tete = el('div', 'edtete');
  tete.append(el('h3', null, nouveau ? (ban ? 'Une compétence de Bannière de plus' : 'Une Pratique de plus') : 'Modifier « ' + e.n + ' »'));
  w.append(tete);
  const init = nouveau ? {n:'', d:'', j:l.caster || 'aucun jet', pc:1, pct:'', base:false} : e;
  const n = saisie('text', init.n); n.maxLength = 80;
  champ(w, 'ed-n', 'Nom', n);
  let pc = null, pct = null, j = null, base = null;
  if(!ban){
    const l2 = el('div', 'ligne2');
    pc = saisie('number', init.pc); pc.min = 0; pc.max = 20; pc.step = 1;
    champ(l2, 'ed-pc', 'Coût en PC', pc);
    pct = saisie('text', init.pct, '1 PC au contact, 2 PC à vue'); pct.maxLength = 80;
    champ(l2, 'ed-pct', 'Coût particulier, facultatif', pct, 'S’il est écrit, il remplace le chiffre sur les fiches.');
    w.append(l2);
    j = el('select');
    /* chaque Pratique se lance sous la caractéristique qu'on lui donne ; le choix en tête de la liste les met toutes sous la même */
    REG_JETS_CAR.forEach(c => j.add(new Option('Se lance sous ' + regSousLa(c), c)));
    REG_JETS_SANS.forEach(c => j.add(new Option(c.charAt(0).toUpperCase() + c.slice(1), c)));
    j.value = init.j;
    champ(w, 'ed-j', 'Comment elle se lance', j, l.caster
      ? 'Le reste de la liste se lance sous ' + regSousLa(l.caster) + '. En donner une autre à celle-ci est permis : le choix en tête de la liste les remet toutes sous la même.'
      : 'Aucune Pratique de cette liste ne se lançait. Si celle-ci se lance, la liste prend sa caractéristique.');
  }
  const d = zone(init.d, 4); d.maxLength = 1200;
  champ(w, 'ed-d', ban ? 'Ce qu’elle permet' : 'Ce qu’elle fait', d);
  if(!ban){
    const lb = el('label', 'coche'); lb.htmlFor = 'ed-base';
    base = el('input'); base.type = 'checkbox'; base.id = 'ed-base'; base.checked = !!init.base;
    lb.append(base, el('span', null, 'L’attaque de base de la liste : tous ceux qui l’ont l’ont d’office. Une seule par liste, et elle se lance.'));
    w.append(lb);
  }
  const err = el('p', 'err edit'); err.hidden = true; err.setAttribute('role', 'alert');
  w.append(err);
  const ac = el('div', 'acts edact');
  const ok = bouton('Enregistrer', 'sm', () => {
    const nom = n.value.replace(/\s+/g, ' ').trim();
    if(!nom){ erreur(w, 'Il lui faut un nom.'); n.setAttribute('aria-invalid', 'true'); n.focus(); return; }
    if(regNomPratPris(l.dom, nom, nouveau ? '' : e.id)){ erreur(w, 'Une Pratique de cette école porte déjà ce nom.'); n.setAttribute('aria-invalid', 'true'); n.focus(); return; }
    const champs = {n:nom, d:d.value};
    let veutBase = false;
    if(!ban){
      const cout = Math.round(+pc.value);
      if(!(cout >= 0 && cout <= 20)){ erreur(w, 'Le coût va de 0 à 20 PC.'); pc.setAttribute('aria-invalid', 'true'); pc.focus(); return; }
      champs.pc = cout; champs.pct = pct.value; champs.j = j.value;
      veutBase = base.checked;
      if(veutBase && REG_JETS_CAR.indexOf(champs.j) < 0){ erreur(w, 'L’attaque de base se lance : choisis « Se lance sous… » plutôt qu’un jet de la cible.'); j.focus(); return; }
    }
    let id = nouveau ? '' : e.id;
    if(nouveau) id = regNouvellePratique(l.dom, l.grp, champs);
    else {
      /* seulement ce que ce formulaire a changé : ce qu'un autre appareil a retouché pendant qu'il était ouvert ne revient pas en arrière */
      const change = {};
      Object.keys(champs).forEach(k => { if(String(champs[k]) !== String(init[k] == null ? '' : init[k])) change[k] = champs[k]; });
      if(Object.keys(change).length) regPoserPratique(id, change);
    }
    if(!ban && id && (nouveau ? veutBase : veutBase !== !!e.base)){
      if(veutBase) regPoserBase(l.dom, l.grp, id);
      else regPoserPratique(id, {base:false});
    }
    apres(id);
  }, 'ed-ok');
  ac.append(ok, bouton('Annuler', 'ghost sm', () => { UI.ouvert = null; dessiner(); }, 'ed-non'));
  if(!nouveau && e.livre && e.retouche) ac.append(bouton('Revenir au livre', 'ghost sm', () => {
    if(regNomLivrePris(e.id)){ erreur(w, 'Le livre l’appelle « ' + e.du.n + ' », et une autre Pratique de cette école porte déjà ce nom : renomme-la d’abord.'); return; }
    regRevenirAuLivre(e.id); apres(e.id);
  }, 'ed-livre'));
  w.append(ac);
  setTimeout(() => { try{ n.focus({preventScroll:true}); }catch(x){} }, 0);
  return w;
}
function blocListe(l){
  const w = el('div', 'pliste');
  w.id = idListe(l); w.dataset.dom = l.dom; w.dataset.grp = l.grp;
  const t = el('div', 'pltete');
  const h = el('h3', null, grpTitre(l));
  const pe = l.grp === '_' ? domPeuples(l.dom) : '';
  if(pe) h.append(el('small', null, pe));
  t.append(h, selectCaster(l));
  w.append(t);
  const o = UI.ouvert;
  l.entrees.forEach(e => w.append(o && o.type === 'prat' && o.id === e.id ? editeurEntree(l, e, false) : ligneEntree(l, e)));
  if(!l.entrees.length) w.append(el('p', 'vide', l.banniere ? 'Aucune compétence dans cette Bannière.' : 'Aucune Pratique dans cette liste.'));
  if(o && o.type === 'nouvelle' && o.dom === l.dom && o.grp === l.grp) w.append(editeurEntree(l, null, true));
  else {
    const ac = el('div', 'acts'); ac.style.marginTop = '8px';
    ac.append(bouton(l.banniere ? 'Nouvelle compétence' : 'Nouvelle Pratique', 'ghost xs', () => { UI.ouvert = {type:'nouvelle', dom:l.dom, grp:l.grp}; dessiner(); }));
    w.append(ac);
  }
  if(l.retirees.length){
    const dt = el('details', 'retirees');
    dt.open = !!UI.retirees && !!UI.retirees[idListe(l)];
    dt.ontoggle = () => { UI.retirees = UI.retirees || {}; UI.retirees[idListe(l)] = dt.open; };
    dt.append(el('summary', null, pluriel(l.retirees.length, 'retirée du livre', 'retirées du livre')));
    l.retirees.forEach(e => {
      const r = el('div', 'prrow'); r.dataset.id = e.id; r.dataset.nom = e.n;
      const tx = el('div', 'prtxt');
      tx.append(el('div', 'prnm', e.n));
      if(e.d) tx.append(el('div', 'prd', e.d));
      r.append(tx);
      const ac = el('div', 'bact');
      ac.append(bouton('Remettre', 'ghost xs', () => {
        if(regNomLivrePris(e.id)){ refuser(tx, 'Une autre Pratique de cette école s’appelle déjà « ' + e.n + ' » : renomme-la d’abord.'); return; }
        regRemettrePratique(e.id); apres(e.id);
      }));
      r.append(ac);
      dt.append(r);
    });
    w.append(dt);
  }
  return w;
}
function dessinerPratiques(){
  const box = $('prListes'); box.innerHTML = '';
  VUE.pratiques.filter(l => l.dom === UI.dom && !l.banniere).forEach(l => box.append(blocListe(l)));
}

/* ---------- les compétences de Bannière ---------- */
function dessinerBanniere(){
  const box = $('banListes'); box.innerHTML = '';
  VUE.pratiques.filter(l => l.banniere).forEach(l => box.append(blocListe(l)));
}

/* ---------- les compétences ---------- */
function usagesTexte(cle){
  const u = (typeof COMP_USAGES !== 'undefined' && COMP_USAGES[cle]) || [];
  return u.length ? u.join(', ') : '';
}
function ligneComp(c){
  const r = el('div', 'cprow'); r.dataset.id = c.cle; r.dataset.cle = c.cle;
  const tx = el('div', 'cptxt');
  const nm = el('div', 'cpnm', c.nom);
  if(c.nom !== c.cle) nm.append(el('span', 'cpcle', '(' + c.cle + ' dans le livre)'));
  if(c.fixe) nm.append(badge('nommée par les règles'));
  if(c.ajout) nm.append(badge('à toi', 'or'));
  else if(c.retouche) nm.append(badge('retouchée', 'or'));
  tx.append(nm);
  const u = usagesTexte(c.cle);
  if(u) tx.append(el('div', 'cpusage', 'Bonus donné par : ' + u));
  r.append(tx);
  const ac = el('div', 'bact');
  ac.append(bouton('Modifier', 'ghost xs', () => { UI.ouvert = {type:'comp', id:c.cle}; dessiner(); }));
  r.append(ac);
  return r;
}
function editeurComp(c, nouveau){
  const w = el('div', 'editeur');
  w.dataset.editeur = nouveau ? 'nouvelle-comp' : c.cle;
  const tete = el('div', 'edtete');
  tete.append(el('h3', null, nouveau ? 'Une compétence de plus' : 'Modifier « ' + c.nom + ' »'));
  w.append(tete);
  const n = saisie('text', nouveau ? '' : c.nom); n.maxLength = 60;
  n.disabled = !nouveau && c.fixe;
  champ(w, 'ec-n', 'Nom', n, !nouveau && c.fixe ? 'Les règles la nomment : son nom ne change pas.'
    : nouveau ? 'Elle gardera ce nom comme clé, même si tu le changes plus tard : aucune fiche n’en est changée.'
    : 'Seul ce qu’on lit change : la clé du livre, « ' + c.cle + ' », reste dessous.');
  const s = el('select');
  REG_CARS.forEach(x => s.add(new Option(x, x)));
  s.value = nouveau ? 'Intelligence' : c.car;
  s.disabled = !nouveau && c.fixeCar;
  champ(w, 'ec-car', 'Sous quelle caractéristique', s, !nouveau && c.fixeCar ? 'Son geste est celui de cette caractéristique : elle n’en change pas.'
    : 'Une fiche qui existe déjà garde le total qui y est écrit ; les nouvelles partent de la caractéristique choisie ici.');
  if(!nouveau){
    const u = usagesTexte(c.cle);
    if(u){ const p = el('p', 'usage-liste', 'Bonus donné par : ' + u + '. La retirer enlève ces bonus.'); w.append(p); }
  }
  const err = el('p', 'err edit'); err.hidden = true; err.setAttribute('role', 'alert');
  w.append(err);
  const ac = el('div', 'acts edact');
  ac.append(bouton('Enregistrer', 'sm', () => {
    const nom = n.value.replace(/\s+/g, ' ').trim();
    if(!nom){ erreur(w, 'Il lui faut un nom.'); n.focus(); return; }
    if(regNomComptePris(nom, nouveau ? '' : c.cle)){ erreur(w, 'Une compétence porte déjà ce nom.'); n.setAttribute('aria-invalid', 'true'); n.focus(); return; }
    if(nouveau){
      const cle = regNouvelleCompetence(nom, s.value);
      UI.neuve = false;
      apres(cle);
    } else {
      /* seulement ce que ce formulaire a changé, comme pour les Pratiques */
      const change = {};
      if(nom !== c.nom) change.nom = nom;
      if(s.value !== c.car) change.car = s.value;
      if(Object.keys(change).length) regPoserCompetence(c.cle, change);
      apres(c.cle);
    }
  }, 'ec-ok'));
  ac.append(bouton('Annuler', 'ghost sm', () => { UI.ouvert = null; UI.neuve = false; dessiner(); }, 'ec-non'));
  if(!nouveau && !c.fixe) ac.append(boutonDanger('Retirer', () => { regPoserCompetence(c.cle, {retire:true}); apres(''); }, 'ec-retirer'));
  if(!nouveau && c.retouche && !c.ajout) ac.append(bouton('Revenir au livre', 'ghost sm', () => { regRevenirCompetence(c.cle); apres(c.cle); }, 'ec-livre'));
  w.append(ac);
  setTimeout(() => { try{ (n.disabled ? s : n).focus({preventScroll:true}); }catch(x){} }, 0);
  return w;
}
function dessinerCompetences(){
  const box = $('cpListe'); box.innerHTML = '';
  const actives = VUE.competences.filter(c => !c.retire);
  const o = UI.ouvert;
  REG_CARS.forEach(car => {
    const liste = actives.filter(c => c.car === car);
    const g = el('div', 'cpgrp'); g.dataset.car = car;
    const h = el('h3', null, car); h.append(el('small', null, pluriel(liste.length, 'compétence', 'compétences')));
    g.append(h);
    liste.forEach(c => g.append(o && o.type === 'comp' && o.id === c.cle ? editeurComp(c, false) : ligneComp(c)));
    if(!liste.length) g.append(el('p', 'vide', 'Aucune compétence sous cette caractéristique.'));
    box.append(g);
  });
  const neuve = $('cpNeuve'); neuve.innerHTML = '';
  if(UI.neuve) neuve.append(editeurComp(null, true));
  $('cpNouvelle').hidden = !!UI.neuve;
  const ret = VUE.competences.filter(c => c.retire);
  $('cpRetireesBloc').hidden = !ret.length;
  $('cpRetireesTitre').textContent = pluriel(ret.length, 'compétence retirée', 'compétences retirées');
  const rb = $('cpRetirees'); rb.innerHTML = '';
  ret.forEach(c => {
    const r = el('div', 'cprow'); r.dataset.id = c.cle; r.dataset.cle = c.cle;
    const tx = el('div', 'cptxt');
    tx.append(el('div', 'cpnm', c.nom));
    tx.append(el('div', 'cpmeta', 'sous ' + c.car));
    r.append(tx);
    const ac = el('div', 'bact');
    ac.append(bouton('Remettre', 'ghost xs', () => { regPoserCompetence(c.cle, {retire:false}); apres(c.cle); }));
    r.append(ac);
    rb.append(r);
  });
}

/* ---------- ce qui se compte, et l'état ---------- */
function dessinerCompte(){
  const ps = VUE.pratiques.filter(l => !l.banniere);
  const tout = ps.reduce((s, l) => s + l.entrees.length, 0);
  const ret = ps.reduce((s, l) => s + l.entrees.filter(e => e.retouche).length, 0);
  const moi = ps.reduce((s, l) => s + l.entrees.filter(e => !e.livre).length, 0);
  const out = ps.reduce((s, l) => s + l.retirees.length, 0);
  const bits = [];
  if(ret) bits.push(pluriel(ret, 'retouchée', 'retouchées'));
  if(moi) bits.push(pluriel(moi, 'à toi', 'à toi'));
  if(out) bits.push(pluriel(out, 'retirée du livre', 'retirées du livre'));
  $('prCompte').textContent = pluriel(tout, 'Pratique', 'Pratiques') + (bits.length ? ', dont ' + bits.join(', ') : '');
  const cs = VUE.competences.filter(c => !c.retire);
  const cr = cs.filter(c => c.retouche && !c.ajout).length, cm = cs.filter(c => c.ajout).length;
  const cb = [];
  if(cr) cb.push(pluriel(cr, 'retouchée', 'retouchées'));
  if(cm) cb.push(pluriel(cm, 'à toi', 'à toi'));
  $('cpCompte').textContent = pluriel(cs.length, 'compétence', 'compétences') + (cb.length ? ', dont ' + cb.join(', ') : '');
  const bs = VUE.pratiques.filter(l => l.banniere);
  $('banCompte').textContent = pluriel(bs.reduce((s, l) => s + l.entrees.length, 0), 'compétence de Bannière', 'compétences de Bannière');
}

function dessiner(){
  UI.aRedessiner = false;
  VUE = regAppliquer(true);
  dessinerCompte();
  dessinerDomaines();
  dessinerPratiques();
  dessinerCompetences();
  dessinerBanniere();
  dessinerEtat();
}
$('cpNouvelle').onclick = () => { UI.neuve = true; UI.ouvert = null; dessiner(); };
