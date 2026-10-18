/* ============ le Registre des Marchefleurs ============
   La fiche vivante de chaque personnage de la table, comme un écran de personnage : ses PV et ses PC, ce qu'il
   sait faire, ce qu'il porte, son sac, sa bourse, le marché du livre, sa progression, son histoire. Imprimer
   rend la fiche telle que le Word la dessine, avec ce qu'il a aujourd'hui. Et quand la campagne s'arrête, il
   entre dans le monde : il devient un PNJ du Registre des Visages, avec tous ses liens. */

const VUES_FICHE = [
  {k:'fiche', l:'Ce qu’il sait faire'},
  {k:'equipement', l:'Son équipement'},
  {k:'bourse', l:'Sa bourse'},
  {k:'marche', l:'Le marché'},
  {k:'progression', l:'Sa progression'},
  {k:'histoire', l:'Son histoire'}
];
const FICHE = {perso:'', attendu:'', vue:'fiche', arme:{}, ed:'', edd:null, don:'', ajout:null, argent:{sens:'plus', ors:'', argents:'', motif:''}, lances:false, qte:{}, nomArme:{}};
const CLE_FICHE = 'faelorenn.fiche';
function garderChoixFiche(){ try{ localStorage.setItem(CLE_FICHE, JSON.stringify({perso:FICHE.perso, vue:FICHE.vue})); }catch(e){} }
function lireChoixFiche(){
  try{
    const o = JSON.parse(localStorage.getItem(CLE_FICHE) || 'null');
    if(o && typeof o.perso === 'string') FICHE.perso = o.perso;
    if(o && VUES_FICHE.some(v => v.k === o.vue)) FICHE.vue = o.vue;
  }catch(e){}
}
/* un bouton à deux temps, propre à cette page : le premier clic arme, le second agit */
function deuxTemps(cle, txt, confirme, fn, cls){
  const arme = !!FICHE.arme[cle];
  const b = el('button', 'btn ' + (cls || 'ghost sm') + (arme ? ' danger' : ''), arme ? confirme : txt); b.type = 'button';
  b.onclick = () => {
    if(FICHE.arme[cle]){ FICHE.arme = {}; fn(); return; }
    FICHE.arme = {}; FICHE.arme[cle] = true; dessinerFiche(true);
    /* au bout de cinq secondes il se désarme, sans rien redessiner sous les doigts ni prendre la main : si l'on
       tape ailleurs, seul son texte revient, la page attendra qu'on ait fini */
    const id = b.id;
    setTimeout(() => {
      if(!FICHE.arme[cle]) return;
      FICHE.arme = {};
      const x = id && $(id);
      if(x && x.textContent === confirme){ x.textContent = txt; x.classList.remove('danger'); }
      dessinerFiche(false);
    }, 5000);
  };
  return b;
}

/* écrire sans redessiner la page : le texte qu'on vient de quitter est déjà à l'écran, et le bouton sur lequel on
   clique en le quittant ne doit pas disparaître entre l'appui et le relâché */
function ecrireSansDessin(fn){ fn(); T.maj = maintenant(); sauverLocal(); planifierEcriture(); dessinerTable(); }

/* ---------- de petits dessins, un par sorte d'objet ---------- */
const PICTOS = {
  objet:'M7 8a5 5 0 0 1 10 0M5 9h14l-1.5 11h-11z',
  conso:'M9.5 3h5M10.5 3v5.5l-5 8.5a2 2 0 0 0 1.7 3h9.6a2 2 0 0 0 1.7-3l-5-8.5V3M8 15h8',
  armure:'M8.5 4 4.5 7l2 4v9h11v-9l2-4-4-3-2 2h-3z',
  bouclier:'M12 3.5l7 2.8v5.2c0 4.6-3.2 7.6-7 9.5-3.8-1.9-7-4.9-7-9.5V6.3z',
  arme:'M5 19l3-3M6.5 13.5l4 4M8 16l9.5-9.5.5-2.5-2.5.5L6 14',
  corps:'M12 4a2.6 2.6 0 1 1 0 5.2A2.6 2.6 0 0 1 12 4M6 20v-2.5a6 6 0 0 1 12 0V20',
  bourse:'M9 5.5h6l-1.5 2.5a6.5 6.5 0 1 1-3 0z'
};
function picto(sorte){
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'picto');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', PICTOS[sorte] || PICTOS.objet);
  p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.6');
  p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  s.append(p);
  return s;
}
const SORTES_AJOUT = [{k:'objet', l:'Un objet'}, {k:'conso', l:'Un consommable'}, {k:'armure', l:'Une armure'}, {k:'bouclier', l:'Un bouclier'}, {k:'arme', l:'Une arme'}];
const dateCourte = t => { try{ return new Date(t).toLocaleDateString('fr-BE', {day:'numeric', month:'short'}); }catch(e){ return ''; } };

/* ---------- la page ---------- */
function dessinerFiche(force){
  const box = $('ficheBox'); if(!box) return;
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerFiche(true)); return; }
  const focus = document.activeElement && document.body.contains(document.activeElement) ? document.activeElement.id : '';
  box.innerHTML = '';
  const liste = persos();
  /* celui qu'un lien demandait, arrivé avec la table du dépôt */
  if(FICHE.attendu && perso(FICHE.attendu)){ FICHE.perso = FICHE.attendu; FICHE.attendu = ''; garderChoixFiche(); }
  if(!liste.some(c => c.id === FICHE.perso)) FICHE.perso = liste.length ? (MOI.perso && perso(MOI.perso) ? MOI.perso : liste[0].id) : '';
  dessinerQui(liste);
  if(!liste.length){
    const v = el('div','card fvide');
    v.append(el('p','vide', 'Personne à la table pour l’instant.'));
    const p = el('p','mini');
    const a1 = el('a', null, 'Crée un personnage dans le Registre du Havre'); a1.href = 'createur.html';
    const a2 = el('a', null, 'fais-le entrer dans le Registre de la Table'); a2.href = 'table.html'; a2.target = ONGLET_TABLE;
    p.append(a1, document.createTextNode(', puis '), a2, document.createTextNode(' : sa fiche vit ici.'));
    v.append(p);
    box.append(v);
    dessinerMonde();
    return;
  }
  const c = perso(FICHE.perso);
  box.append(heros(c));
  box.append(ongletsFiche(c));
  const pan = el('div','fpanneau card'); pan.id = 'fPanneau'; pan.setAttribute('role', 'tabpanel');
  pan.setAttribute('aria-labelledby', 'fv-' + FICHE.vue);
  const vue = {fiche:vueFiche, equipement:vueEquipement, bourse:vueBourse, marche:vueMarche, progression:vueProgression, histoire:vueHistoire}[FICHE.vue] || vueFiche;
  box.append(pan);
  vue(c, pan);
  /* la fiche d'un autre joueur : elle se lit, seul son joueur la change (les règles du monde en ligne le redisent) */
  if(!estAMoi('personnages', c.id)){
    pan.querySelectorAll('input, select, textarea, button').forEach(x => { x.disabled = true; });
    const nom = c.nom || 'ce personnage', de = /^[aeiouyàâäéèêëîïôöûüh]/i.test(nom) ? 'd’' : 'de ';
    pan.prepend(el('p','note', 'La fiche ' + de + nom + ' est à ' + (joueurDe(c) || 'un autre joueur') + ' : tu la lis, seul son joueur la change.'));
  }
  dessinerMonde();
  if(focus && $(focus)) $(focus).focus({preventScroll:true});
}
/* choisir un personnage : un portrait chacun */
function dessinerQui(liste){
  const q = $('fQui'); if(!q) return;
  q.innerHTML = '';
  q.hidden = liste.length < 2;
  liste.forEach(c => {
    const b = el('button','fportrait'); b.type = 'button'; b.id = 'fq-' + c.id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', c.id === FICHE.perso ? 'true' : 'false');
    const m = el('span','fmed petit', initiales(c.nom)); m.setAttribute('aria-hidden', 'true');
    const t = el('span','fpt');
    t.append(el('b', null, c.nom || 'Sans nom'), el('small', null, c.pv + '/' + c.pvMax + ' PV' + (MOI.perso === c.id ? ' · le tien' : '')));
    const barre = el('span','fpbar'); const i = el('i'); i.style.width = (c.pvMax ? Math.max(0, Math.min(1, c.pv / c.pvMax)) * 100 : 0) + '%'; barre.append(i);
    t.append(barre);
    b.append(m, t);
    b.onclick = () => { FICHE.perso = c.id; FICHE.attendu = ''; FICHE.ed = ''; FICHE.don = ''; FICHE.arme = {}; garderChoixFiche(); dessinerFiche(true); };
    q.append(b);
  });
}
function heros(c){
  const w = el('div','card fheros');
  const med = el('div','fmed', initiales(c.nom)); med.setAttribute('aria-hidden', 'true');
  const id = el('div','fid');
  id.append(el('h2','fnom', c.nom || 'Sans nom'));
  id.append(el('p','fqui', [c.peuple, c.voie, joueurDe(c) ? 'joué par ' + joueurDe(c) : ''].filter(Boolean).join(' · ') || 'personne ne le tient'));
  const tu = el('div','ftuiles');
  const tuile = (v, l, aide, cle) => {
    const d = el('button','ftuile'); d.type = 'button';
    d.append(el('b', null, v), el('span', null, l));
    if(aide) d.title = aide;
    d.onclick = () => { FICHE.vue = cle; garderChoixFiche(); dessinerFiche(true); };
    return d;
  };
  const a = porteDe(c.id, 'armure'), b = porteDe(c.id, 'bouclier');
  tu.append(tuile(String(redDe(c)), 'Réduction', 'Armure naturelle ' + (c.red || 0) + (a ? ', ' + a.nom + ' ' + a.red : '') + (b ? ', ' + b.nom + ' +' + b.red : ''), 'equipement'));
  tu.append(tuile(texteArgent(bourseDe(c.id)), 'Dans sa bourse', '', 'bourse'));
  tu.append(tuile(String(pointsRestants(c)), 'Points à dépenser', '', 'progression'));
  const j = el('div','jauges fjauges');
  j.append(jauge(c, 'pv'), jauge(c, 'pc'));
  const act = el('div','acts fact noprint');
  const imp = el('button','btn sm','Imprimer sa fiche'); imp.type = 'button'; imp.id = 'fImprimer';
  imp.onclick = () => imprimerFiche(c.id);
  const mod = el('button','btn ghost sm','Modifier la fiche'); mod.type = 'button'; mod.id = 'fModifier';
  mod.onclick = () => ouvrirEditeurPerso(c, false);
  const mien = el('button','btn ghost sm', MOI.perso === c.id ? 'C’est le mien' : 'C’est le mien ?'); mien.type = 'button';
  mien.setAttribute('aria-pressed', MOI.perso === c.id ? 'true' : 'false');
  mien.onclick = () => { MOI.perso = MOI.perso === c.id ? '' : c.id; sauverLocal(); dessinerFiche(true); };
  const table = el('a','btn ghost sm','À la table'); table.href = 'table.html'; table.target = ONGLET_TABLE;
  if(estAMoi('personnages', c.id)) act.append(imp, mod, mien, table);
  else act.append(imp, table);
  w.append(med, id, tu, j, act);
  return w;
}
function ongletsFiche(c){
  const nav = el('div','seg fonglets'); nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'La fiche de ' + (c.nom || 'ce personnage'));
  const n = objetsDe(c.id).filter(o => !o.porte).length;
  VUES_FICHE.forEach(v => {
    const b = el('button', null, v.l); b.type = 'button'; b.id = 'fv-' + v.k;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', FICHE.vue === v.k ? 'true' : 'false');
    b.setAttribute('aria-pressed', FICHE.vue === v.k ? 'true' : 'false');
    if(v.k === 'equipement' && n) b.append(el('span','fcompte', String(n)));
    if(v.k === 'progression' && pointsRestants(c) > 0) b.append(el('span','fcompte', String(pointsRestants(c))));
    b.onclick = () => { FICHE.vue = v.k; FICHE.ed = ''; FICHE.don = ''; FICHE.arme = {}; garderChoixFiche(); dessinerFiche(true); };
    nav.append(b);
  });
  return nav;
}

/* ---------- ce qu'il sait faire ---------- */
function vueFiche(c, box){
  const sc = (titre, noeud) => { box.append(el('h3', null, titre)); const s = el('div','scroll'); s.append(noeud); box.append(s); };
  sc('Caractéristiques', tableauCarac(c));
  sc('Compétences', tableauComp(c));
  if(c.pratiques.length) sc('Pratiques', tableauPrat(c));
  const plus = [['traits','Traits'],['contrainte','Contrainte'],['armure','Armure que son corps supporte'],['peupleComp','Compétence de peuple'],['domaine','Domaine']].filter(([k]) => c[k]);
  if(plus.length){
    box.append(el('h3', null, 'Ce que son peuple lui donne'));
    plus.forEach(([k, l]) => { const p = el('p','mini'); p.append(el('b', null, l + ' : '), document.createTextNode(c[k])); box.append(p); });
  }
}

/* ---------- son équipement ---------- */
function vueEquipement(c, box){
  /* ce qu'il porte : une armure, un bouclier, son armure naturelle */
  box.append(el('h3', null, 'Ce qu’il porte'));
  const slots = el('div','fslots');
  const slot = (titre, o, vide, sorte) => {
    const s = el('div','fslot' + (o ? ' plein' : ''));
    s.append(picto(sorte));
    const t = el('div');
    t.append(el('span','lab', titre));
    t.append(el('b', null, o ? o.nom : vide));
    if(o) t.append(el('small', null, sorte === 'bouclier' ? 'réduction +' + o.red + ', occupe une main' : 'réduction ' + o.red + (neVolePlus(c, o) ? ' · chargé ainsi, il ne vole plus' : '')));
    s.append(t);
    if(o){
      const ac = el('div','fslotact');
      const x = el('button','btn ghost xs','Ôter'); x.type = 'button'; x.id = 'fote-' + o.id; x.onclick = () => changer(() => porterObjet(o.id, false));
      const m = el('button','btn ghost xs','Modifier'); m.type = 'button'; m.id = 'fed-' + o.id;
      m.onclick = () => { FICHE.ed = FICHE.ed === o.id ? '' : o.id; FICHE.edd = null; FICHE.don = ''; dessinerFiche(true); };
      ac.append(x, m);
      s.append(ac);
    }
    return s;
  };
  const portes = [porteDe(c.id, 'armure'), porteDe(c.id, 'bouclier')];
  slots.append(slot('Armure', portes[0], 'Rien', 'armure'), slot('Bouclier', portes[1], 'Rien', 'bouclier'));
  const nat = el('div','fslot' + (c.red ? ' plein' : ''));
  nat.append(picto('corps'));
  const tn = el('div'); tn.append(el('span','lab', 'Armure naturelle'), el('b', null, c.red ? String(c.red) : 'Aucune'), el('small', null, c.red ? 'ce que son corps arrête' : 'son corps n’arrête rien'));
  nat.append(tn);
  slots.append(nat);
  box.append(slots);
  /* ce qu'il porte se retouche ici ; pour le donner ou le jeter, on l'ôte d'abord */
  const edite = portes.find(o => o && FICHE.ed === o.id);
  if(edite) box.append(formObjet(c, edite));
  box.append(el('p','mini fred', 'Réduction totale : ' + redDe(c) + '. Les réductions s’additionnent : sa pièce, son bouclier, son armure naturelle.' + (c.armure ? ' Son corps supporte : ' + c.armure.charAt(0).toLowerCase() + c.armure.slice(1).replace(/\.$/, '') + '.' : '')));

  /* ses armes : elles vivent sur sa fiche, le combat les y lit */
  box.append(el('h3', null, 'Ses armes'));
  if(!c.armes.length) box.append(el('p','mini', 'Aucune arme. Le marché en vend, ou ajoute la sienne plus bas.'));
  const ga = el('div','fgrille');
  c.armes.forEach((a, i) => {
    const k = cleArme(a, i);
    const t = el('div','fobjet arme');
    t.append(picto('arme'));
    const tx = el('div','fotxt');
    const f = formuleArme(c, a);
    tx.append(el('b', null, a.nom), el('span','fomin', [a.de, f && f !== a.de ? 'dégâts ' + f : '', a.notes].filter(Boolean).join(' · ')));
    t.append(tx);
    const ac = el('div','foact');
    if(persos().length > 1){
      const d = el('button','btn ghost xs','Donner'); d.type = 'button'; d.id = 'farme-don-' + i;
      d.onclick = () => { FICHE.don = FICHE.don === k ? '' : k; FICHE.ed = ''; dessinerFiche(true); };
      ac.append(d);
    }
    const x = deuxTemps(k, 'Retirer', 'Confirmer', () => surPerso(c.id, y => { const j = indexArme(y, a, i); if(j >= 0) y.armes.splice(j, 1); }), 'ghost xs');
    x.id = 'farme-x-' + i;
    ac.append(x);
    t.append(ac);
    if(FICHE.don === k) t.append(formDonArme(c, a, i));
    ga.append(t);
  });
  box.append(ga);

  /* son sac : tout ce qui n'est pas dans un emplacement (deux armures portées à la fois, après une fusion, s'y voient) */
  const objets = objetsDe(c.id).filter(o => portes.indexOf(o) < 0);
  box.append(el('h3', null, 'Son sac' + (objets.length ? ' · ' + objets.length + ' pile' + (objets.length > 1 ? 's' : '') : '')));
  const attend = aMigrer(), avant = attend.objets.concat(attend.argent).filter(x => x.c.id === c.id).length;
  if(avant) box.append(el('p','note', 'Son sac d’avant, ' + avant + ' ligne' + (avant > 1 ? 's' : '') + ', y passe dès que la table partagée a été lue.'));
  if(!objets.length) box.append(el('p','mini', 'Rien dans le sac. Le marché, la fouille d’un adversaire à la table, ou « Ajouter au sac », plus bas.'));
  const g = el('div','fgrille');
  objets.forEach(o => g.append(tuileObjet(c, o)));
  box.append(g);
  box.append(formAjout(c));
}
function tuileObjet(c, o){
  const t = el('div','fobjet ' + o.sorte + (o.porte ? ' porte' : ''));
  t.setAttribute('data-objet', o.id);
  t.append(picto(o.sorte));
  const tx = el('div','fotxt');
  const nom = el('b', null, o.nom);
  if(o.n > 1) nom.append(el('span','fqte', ' ×' + o.n));
  tx.append(nom);
  const lourd = !o.porte && horsDuCorps(c, o);
  const sous = [o.sorte === 'armure' ? 'réduction ' + o.red : o.sorte === 'bouclier' ? 'réduction +' + o.red : '', lourd ? 'son corps ne la supporte pas' : '', o.effet, o.note].filter(Boolean).join(' · ');
  if(sous) tx.append(el('span','fomin', sous));
  if(o.origine) tx.append(el('span','foorig', o.origine));
  t.append(tx);
  const ac = el('div','foact');
  const b = (txt, id, fn, cls) => { const x = el('button','btn ' + (cls || 'ghost') + ' xs', txt); x.type = 'button'; x.id = id; x.onclick = fn; ac.append(x); return x; };
  const moins = b('−', 'fmoins-' + o.id, () => changer(() => changerQte(o.id, -1)));
  moins.setAttribute('aria-label', 'Un ' + o.nom + ' de moins');
  const plus = b('+', 'fplus-' + o.id, () => changer(() => changerQte(o.id, 1)));
  plus.setAttribute('aria-label', 'Un ' + o.nom + ' de plus');
  if(o.sorte === 'conso') b('Utiliser', 'futil-' + o.id, () => utiliserDepuisFiche(o.id), 'ghost');
  if(o.sorte === 'armure' || o.sorte === 'bouclier'){
    const pt = b(o.porte ? 'Ôter' : 'Porter', 'fporte-' + o.id, () => changer(() => porterObjet(o.id, !o.porte)));
    if(lourd){ pt.disabled = true; pt.title = 'Son corps supporte : ' + c.armure.charAt(0).toLowerCase() + c.armure.slice(1).replace(/\.$/, ''); }
  }
  if(persos().length > 1) b('Donner', 'fdon-' + o.id, () => { FICHE.don = FICHE.don === o.id ? '' : o.id; FICHE.ed = ''; dessinerFiche(true); });
  b('Modifier', 'fed-' + o.id, () => { FICHE.ed = FICHE.ed === o.id ? '' : o.id; FICHE.edd = null; FICHE.don = ''; dessinerFiche(true); });
  const x = deuxTemps('objet-' + o.id, 'Jeter', 'Confirmer', () => changer(() => oterObjet(o.id)), 'ghost xs');
  x.id = 'fjeter-' + o.id;
  ac.append(x);
  t.append(ac);
  if(FICHE.don === o.id) t.append(formDon(c, o));
  if(FICHE.ed === o.id) t.append(formObjet(c, o));
  return t;
}
function formDon(c, o){
  const f = el('div','fform');
  const s = el('select'); s.id = 'fdon-qui'; s.setAttribute('aria-label', 'À qui');
  persos().filter(x => x.id !== c.id).forEach(x => s.add(new Option(x.nom || 'Sans nom', x.id)));
  const n = el('input'); n.type = 'number'; n.id = 'fdon-n'; n.min = '1'; n.max = String(o.n); n.value = '1'; n.style.width = '70px';
  n.setAttribute('aria-label', 'Combien');
  const ok = el('button','btn sm','Donner'); ok.type = 'button'; ok.id = 'fdon-ok';
  ok.onclick = () => {
    const cible = perso(s.value); if(!cible) return;
    const k = Math.max(1, Math.min(o.n, parseInt(n.value, 10) || 1));
    changer(() => {
      donnerObjet(o.id, cible.id, k);
      noterDansSeance((c.nom || 'Sans nom') + ' donne ' + (k > 1 ? k + ' × ' : '') + o.nom + ' à ' + (cible.nom || 'Sans nom') + '.', 'note');
    });
    FICHE.don = '';
    msgTable(o.nom + (k > 1 ? ' ×' + k : '') + ' passe dans le sac de ' + (cible.nom || 'Sans nom') + '.', true);
  };
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button';
  non.onclick = () => { FICHE.don = ''; dessinerFiche(true); };
  if(o.n > 1) f.append(el('span','mini', 'Combien'), n);
  f.append(el('span','mini', 'à'), s, ok, non);
  return f;
}
/* une arme se reconnaît à ce qu'elle est, pas seulement à sa place : une arme retirée ailleurs décale les autres,
   et le « Confirmer » d'un bouton armé ne doit pas tomber sur la voisine */
const cleArme = (a, i) => 'arme-' + hashCourt([a.nom, a.de, a.notes || ''].join('|')) + '-' + i;
function indexArme(y, a, i){
  const meme = x => !!x && x.nom === a.nom && x.de === a.de && (x.notes || '') === (a.notes || '');
  return meme(y.armes[i]) ? i : y.armes.findIndex(meme);
}
/* donner une arme : elle passe sur la fiche de l'autre, où le combat la lit */
function formDonArme(c, a, i){
  const f = el('div','fform');
  const s = el('select'); s.id = 'fdon-qui'; s.setAttribute('aria-label', 'À qui');
  /* une arme vit sur la fiche : elle ne se donne qu'à ses propres personnages (la fiche d'un autre est à lui) */
  persos().filter(x => x.id !== c.id && estAMoi('personnages', x.id)).forEach(x => s.add(new Option(x.nom || 'Sans nom', x.id)));
  if(!s.options.length){ f.append(el('p','mini', 'Une arme ne se donne qu’à un autre de tes personnages : la fiche des autres est à leur joueur.')); return f; }
  const ok = el('button','btn sm','Donner'); ok.type = 'button'; ok.id = 'fdon-ok';
  ok.onclick = () => {
    const cible = perso(s.value); if(!cible) return;
    let fait = false;
    changer(() => {
      const y = T.personnages[c.id], z = T.personnages[cible.id];
      const j = y ? indexArme(y, a, i) : -1;
      if(!z || j < 0) return;
      const arme = y.armes[j];
      y.armes = y.armes.filter((_, k) => k !== j);
      z.armes = z.armes.concat([arme]);
      majPerso(y); majPerso(z);
      noterDansSeance((c.nom || 'Sans nom') + ' donne ' + a.nom + ' à ' + (cible.nom || 'Sans nom') + '.', 'note');
      fait = true;
    });
    FICHE.don = '';
    if(fait) msgTable(a.nom + ' passe dans les armes de ' + (cible.nom || 'Sans nom') + '.', true);
    else dessinerFiche(true);
  };
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button';
  non.onclick = () => { FICHE.don = ''; dessinerFiche(true); };
  f.append(el('span','mini', 'à'), s, ok, non);
  return f;
}
/* modifier une pile : son nom, sa sorte, ce qu'elle fait */
function formObjet(c, o){
  const f = el('div','fform fcol');
  /* ce qu'on a tapé survit à un dessin venu d'ailleurs */
  const d = FICHE.edd && FICHE.edd.id === o.id ? FICHE.edd : (FICHE.edd = {id:o.id, nom:o.nom, n:o.n, sorte:o.sorte, red:o.red, effet:o.effet, note:o.note, de:'d6'});
  const ligne = el('div','table');
  const champ2 = (lab, noeud) => { const w = el('div'); const l = el('label','lab', lab); l.htmlFor = noeud.id; w.append(l, noeud); ligne.append(w); return noeud; };
  const nom = champ2('Nom', Object.assign(el('input'), {type:'text', id:'fo-nom', value:d.nom, maxLength:160, oninput:e => d.nom = e.target.value}));
  nom.style.width = '100%';
  champ2('Combien', Object.assign(el('input'), {type:'number', id:'fo-n', value:String(d.n), min:'1', max:'999', oninput:e => d.n = e.target.value, style:'width:80px'}));
  const s = el('select'); s.id = 'fo-sorte';
  SORTES_AJOUT.forEach(x => s.add(new Option(x.l.replace(/^(Un|Une) /, ''), x.k)));
  s.value = d.sorte;
  champ2('Sorte', s);
  f.append(ligne);
  const extra = el('div','table');
  const dessinerExtra = () => {
    extra.innerHTML = '';
    const ch = (lab, noeud) => { const w = el('div'); const l = el('label','lab', lab); l.htmlFor = noeud.id; w.append(l, noeud); extra.append(w); };
    if(d.sorte === 'armure' || d.sorte === 'bouclier') ch('Réduction', Object.assign(el('input'), {type:'number', id:'fo-red', value:String(d.red || (d.sorte === 'bouclier' ? 1 : 1)), min:'0', max:'10', oninput:e => d.red = e.target.value, style:'width:80px'}));
    if(d.sorte === 'conso') ch('Ce qu’il fait', Object.assign(el('input'), {type:'text', id:'fo-effet', value:d.effet, placeholder:'Rend 1d6 PV', oninput:e => d.effet = e.target.value, style:'width:100%'}));
    if(d.sorte === 'arme') ch('Dé', Object.assign(el('input'), {type:'text', id:'fo-de', value:d.de, placeholder:'d6', oninput:e => d.de = e.target.value, style:'width:80px'}));
    ch('Note', Object.assign(el('input'), {type:'text', id:'fo-note', value:d.note, oninput:e => d.note = e.target.value, style:'width:100%'}));
  };
  s.onchange = () => { d.sorte = s.value; if((d.sorte === 'armure' || d.sorte === 'bouclier') && !+d.red) d.red = 1; dessinerExtra(); };
  dessinerExtra();
  f.append(extra);
  const act = el('div','acts');
  const ok = el('button','btn sm','Enregistrer'); ok.type = 'button'; ok.id = 'fo-ok';
  ok.onclick = () => {
    if(!String(d.nom).trim()){ msgTable('Il lui faut un nom.', false); return; }
    changer(() => {
      if(d.sorte === 'arme'){
        /* une arme passe sur sa fiche, où le combat la lit : une seule, le reste de la pile reste dans le sac */
        const y = T.personnages[c.id];
        y.armes = y.armes.concat([{nom:String(d.nom).trim(), de:String(d.de || 'd6').trim(), notes:String(d.note || '').trim()}]);
        majPerso(y);
        changerQte(o.id, -1);
        return;
      }
      const x = majObjet(o.id, {nom:String(d.nom).trim(), n:d.n, sorte:d.sorte, red:d.red, effet:d.effet, note:d.note, porte:d.sorte === o.sorte ? o.porte : false});
      /* une armure devenue trop lourde pour son corps s'ôte */
      if(x && x.porte && horsDuCorps(T.personnages[c.id], x)) majObjet(o.id, {porte:false});
    });
    FICHE.ed = ''; FICHE.edd = null;
  };
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button';
  non.onclick = () => { FICHE.ed = ''; FICHE.edd = null; dessinerFiche(true); };
  act.append(ok, non);
  f.append(act);
  return f;
}
/* ajouter au sac, à la main : un objet, un consommable, une armure, un bouclier, ou une arme pour sa fiche */
function formAjout(c){
  const d = FICHE.ajout = FICHE.ajout && FICHE.ajout.perso === c.id ? FICHE.ajout : {perso:c.id, nom:'', n:'1', sorte:'objet', red:'1', effet:'', de:'d6', note:''};
  const det = el('details','fajout'); det.id = 'fAjout';
  det.open = !!d.ouvert;
  det.ontoggle = () => { d.ouvert = det.open; };
  det.append(el('summary', null, 'Ajouter au sac'));
  const seg = el('div','seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Quelle sorte');
  SORTES_AJOUT.forEach(x => {
    const b = el('button', null, x.l); b.type = 'button'; b.id = 'faj-sorte-' + x.k;
    b.setAttribute('aria-pressed', d.sorte === x.k ? 'true' : 'false');
    b.onclick = () => { d.sorte = x.k; dessinerFiche(true); const y = $('faj-sorte-' + x.k); if(y) y.focus(); };
    seg.append(b);
  });
  det.append(seg);
  const l = el('div','table'); l.style.marginTop = '8px';
  const ch = (lab, noeud) => { const w = el('div'); const lb = el('label','lab', lab); lb.htmlFor = noeud.id; w.append(lb, noeud); l.append(w); return noeud; };
  ch('Nom', Object.assign(el('input'), {type:'text', id:'faj-nom', value:d.nom, maxLength:160, placeholder:d.sorte === 'arme' ? 'Épée courte' : d.sorte === 'conso' ? 'Fiole de Havre' : 'Une corde de dix pas', oninput:e => d.nom = e.target.value, style:'width:100%'}));
  if(d.sorte !== 'arme') ch('Combien', Object.assign(el('input'), {type:'number', id:'faj-n', value:d.n, min:'1', max:'999', oninput:e => d.n = e.target.value, style:'width:80px'}));
  if(d.sorte === 'armure' || d.sorte === 'bouclier') ch('Réduction', Object.assign(el('input'), {type:'number', id:'faj-red', value:d.red, min:'0', max:'10', oninput:e => d.red = e.target.value, style:'width:80px'}));
  if(d.sorte === 'conso') ch('Ce qu’il fait', Object.assign(el('input'), {type:'text', id:'faj-effet', value:d.effet, placeholder:'Rend 1d6 PV', oninput:e => d.effet = e.target.value, style:'width:100%'}));
  if(d.sorte === 'arme') ch('Dé', Object.assign(el('input'), {type:'text', id:'faj-de', value:d.de, placeholder:'d6', oninput:e => d.de = e.target.value, style:'width:80px'}));
  ch('Note', Object.assign(el('input'), {type:'text', id:'faj-note', value:d.note, oninput:e => d.note = e.target.value, style:'width:100%'}));
  det.append(l);
  const ok = el('button','btn sm','Ajouter'); ok.type = 'button'; ok.id = 'faj-ok'; ok.style.marginTop = '8px';
  ok.onclick = () => {
    const nom = String(d.nom || '').trim();
    if(!nom){ msgTable('Il lui faut un nom.', false); $('faj-nom').focus(); return; }
    if(d.sorte !== 'arme' && objetsDe(c.id).length >= SAC_PLEIN){ msgTable('Le sac est plein : ' + SAC_PLEIN + ' piles. Jette ou donne quelque chose d’abord.', false); return; }
    changer(() => {
      if(d.sorte === 'arme'){
        const y = T.personnages[c.id];
        y.armes = y.armes.concat([{nom:nom, de:String(d.de || 'd6').trim() || 'd6', notes:String(d.note || '').trim()}]);
        majPerso(y);
      } else {
        /* un objet du livre qu'on nomme retrouve ce qu'il fait : « Fiole de Havre » */
        const lu = objetDepuisTexte(nom);
        const champs = {nom:nom, n:parseInt(d.n, 10) || 1, sorte:d.sorte, red:+d.red || 0, effet:String(d.effet || '').trim(), note:String(d.note || '').trim(), origine:'Ajouté à la main'};
        if(d.sorte === 'conso' && !champs.effet && lu.sorte === 'conso') champs.effet = lu.effet;
        const o = nouvelObjet(c.id, champs);
        if((o.sorte === 'armure' || o.sorte === 'bouclier') && !porteDe(c.id, o.sorte)) porterObjet(o.id, true);
      }
    });
    FICHE.ajout = {perso:c.id, nom:'', n:'1', sorte:d.sorte, red:'1', effet:'', de:'d6', note:'', ouvert:true};
    msgTable(nom + (d.sorte === 'arme' ? ' rejoint ses armes.' : ' rejoint son sac.'), true);
    dessinerFiche(true);
    const n = $('faj-nom'); if(n) n.focus();
  };
  det.append(ok);
  return det;
}
/* utiliser un consommable : ce qu'il rend se lance, la pile baisse, la séance le note */
function utiliserDepuisFiche(id){
  const o = unObjet(id); if(!o) return;
  const c = perso(o.perso); if(!c) return;
  const s = soinDe(o);
  let dit = '';
  changer(() => {
    const y = T.personnages[c.id];
    if(s){
      const r = /d/i.test(s.f) ? lancerFormule(s.f) : {total:Math.max(0, parseInt(s.f, 10) || 0), txt:s.f};
      const n = r ? r.total : 0;
      /* un coup, comme les boutons des jauges : un coup reçu ailleurs au même moment compte aussi */
      if(n) coup(y, s.q, n);
      dit = (c.nom || 'Sans nom') + ' utilise ' + o.nom + ' : ' + (r && /d/i.test(s.f) ? r.txt + ' = ' : '') + '+' + n + ' ' + (s.q === 'pc' ? 'PC' : 'PV') + '.';
    } else dit = (c.nom || 'Sans nom') + ' utilise ' + o.nom + (o.effet ? ' : ' + o.effet.replace(/[\s.]+$/, '') : '') + '.';
    changerQte(o.id, -1);
    noterDansSeance(dit, 'note');
  });
  msgTable(dit, true);
}

/* ---------- sa bourse ---------- */
function vueBourse(c, box){
  const total = bourseDe(c.id);
  const tete = el('div','fbourse');
  tete.append(picto('bourse'));
  const t = el('div');
  t.append(el('b','fsomme', total ? texteArgent(total) : 'Vide'), el('span','mini', total ? total + (Math.abs(total) > 1 ? ' argents' : ' argent') + ' en tout · 1 or = 10 argents' : '1 or = 10 argents'));
  tete.append(t);
  box.append(tete);
  const vieux = c.bourse && argentsDe(c.bourse) == null && c.bourse.trim() && c.bourse.trim() !== '–' ? c.bourse.trim() : '';
  if(vieux){
    const p = el('p','note', 'Sa bourse d’avant disait « ' + vieux + ' » : le site n’y lit pas de somme. Écris-la ci-dessous si elle compte.');
    box.append(p);
  }
  /* recevoir ou dépenser, à la main */
  const a = FICHE.argent;
  box.append(el('h3', null, 'Recevoir ou dépenser'));
  const seg = el('div','seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Dans quel sens');
  [['plus','Recevoir'],['moins','Dépenser']].forEach(([k, l]) => {
    const b = el('button', null, l); b.type = 'button'; b.id = 'fb-' + k;
    b.setAttribute('aria-pressed', a.sens === k ? 'true' : 'false');
    b.onclick = () => { a.sens = k; dessinerFiche(true); const y = $('fb-' + k); if(y) y.focus(); };
    seg.append(b);
  });
  box.append(seg);
  const l = el('div','table fbform'); l.style.marginTop = '8px';
  const ch = (lab, noeud) => { const w = el('div'); const lb = el('label','lab', lab); lb.htmlFor = noeud.id; w.append(lb, noeud); l.append(w); return noeud; };
  ch('Ors', Object.assign(el('input'), {type:'number', id:'fb-ors', value:a.ors, min:'0', inputMode:'numeric', oninput:e => a.ors = e.target.value, style:'width:90px'}));
  ch('Argents', Object.assign(el('input'), {type:'number', id:'fb-argents', value:a.argents, min:'0', inputMode:'numeric', oninput:e => a.argents = e.target.value, style:'width:90px'}));
  ch('Pourquoi', Object.assign(el('input'), {type:'text', id:'fb-motif', value:a.motif, maxLength:200, placeholder:a.sens === 'plus' ? 'Vendu la hache du bandit' : 'Une nuit à l’auberge du col', oninput:e => a.motif = e.target.value, style:'width:100%'}));
  box.append(l);
  const ok = el('button','btn sm', a.sens === 'plus' ? 'Dans sa bourse' : 'Hors de sa bourse'); ok.type = 'button'; ok.id = 'fb-ok'; ok.style.marginTop = '8px';
  ok.onclick = () => {
    const n = (Math.max(0, parseInt(a.ors, 10) || 0)) * ARGENTS_PAR_OR + Math.max(0, parseInt(a.argents, 10) || 0);
    if(!n){ msgTable('Écris combien, en ors, en argents, ou les deux.', false); $('fb-ors').focus(); return; }
    if(a.sens === 'moins' && n > bourseDe(c.id)){ msgTable('Il n’a que ' + texteArgent(bourseDe(c.id)) + ' dans sa bourse.', false); return; }
    const motif = String(a.motif || '').trim() || (a.sens === 'plus' ? 'Reçu' : 'Dépensé'), sens = a.sens;
    a.ors = ''; a.argents = ''; a.motif = '';
    changer(() => { const e = seanceCourante(); mouvement(c.id, sens === 'plus' ? n : -n, motif, {seance:e ? e.id : ''}); });
    msgTable((sens === 'plus' ? '+ ' : '− ') + texteArgent(n) + ' · ' + motif, true);
  };
  box.append(ok);
  /* son histoire, du plus récent au plus ancien */
  const ms = mouvementsDe(c.id);
  box.append(el('h3', null, 'Ce qui est entré et sorti'));
  if(!ms.length){ box.append(el('p','mini', 'Rien encore. La paie des missions bouclées y arrive toute seule.')); return; }
  const t2 = el('table','tab fhist');
  const h = el('tr'); ['Quand','Pourquoi','Combien',''].forEach((x, i) => h.append(el('th', i === 2 ? 'n' : null, x))); t2.append(h);
  ms.forEach(m => {
    const tr = el('tr');
    const e = m.seance && T.journal[m.seance] && !T.journal[m.seance].supprime ? T.journal[m.seance] : null;
    tr.append(el('td','mini', (e ? 'Séance ' + etiquetteSeance(e) + ' · ' : '') + (m.t > 1e11 ? dateCourte(m.t) : 'avant')));
    tr.append(el('td', null, m.motif));
    tr.append(el('td','n ' + (m.n < 0 ? 'fneg' : 'fpos'), (m.n > 0 ? '+' : '') + texteArgent(m.n)));
    const td = el('td','n');
    const x = deuxTemps('mvt-' + m.id, 'Défaire', 'Confirmer', () => changer(() => defaireMouvement(m.id)), 'ghost xs');
    x.id = 'fb-x-' + m.id;
    td.append(x);
    tr.append(td);
    t2.append(tr);
  });
  const s = el('div','scroll'); s.append(t2); box.append(s);
}

/* ---------- le marché du Livre V ---------- */
function prixMarche(e){ return e.lance && FICHE.lances ? e.prix * 2 : e.prix; }
function vueMarche(c, box){
  const bourse = bourseDe(c.id);
  box.append(el('p','fmarche-tete', 'Dans sa bourse : ' + (bourse ? texteArgent(bourse) : 'rien') + '. Les prix sont ceux du Livre V.'));
  const manque = p => p > bourse ? 'Il manque ' + texteArgent(p - bourse) : '';
  const bouton = (id, p, fn, txt) => {
    const b = el('button','btn sm', txt || 'Acheter'); b.type = 'button'; b.id = id;
    b.disabled = p > bourse;
    if(p > bourse) b.title = manque(p);
    b.onclick = fn;
    return b;
  };
  const acheter = (quoi, prix, fait) => {
    if(prix > bourseDe(c.id)){ msgTable(manque(prix) + ' pour ' + quoi + '.', false); return; }
    changer(() => {
      const e = seanceCourante();
      mouvement(c.id, -prix, 'Achat : ' + quoi, {seance:e ? e.id : ''});
      fait();
      noterDansSeance((c.nom || 'Sans nom') + ' achète ' + quoi + ' (' + texteArgent(prix) + ').', 'note');
    });
    msgTable(quoi + ' : ' + texteArgent(prix) + '.', true);
  };
  const tableau = (titre, entetes, lignes) => {
    box.append(el('h3', null, titre));
    const t = el('table','tab fmarche');
    const h = el('tr'); entetes.forEach((x, i) => h.append(el('th', x.n ? 'n' : null, x.l))); t.append(h);
    lignes.forEach(tr => t.append(tr));
    const s = el('div','scroll'); s.append(t); box.append(s);
  };

  /* les armes : elles vont sur sa fiche, sous le nom qu'on leur donne */
  const la = MARCHE.armes.map((e, i) => {
    const tr = el('tr');
    const td = el('td'); td.append(el('b', null, e.nom));
    if(e.ex || e.notes) td.append(el('div','mini', [e.ex, e.notes].filter(Boolean).join(' · ')));
    const p = prixMarche(e);
    const nom = el('input'); nom.type = 'text'; nom.id = 'fm-nom-' + i; nom.placeholder = 'Son nom'; nom.maxLength = 80; nom.style.width = '130px';
    nom.value = FICHE.nomArme[i] || ''; nom.oninput = () => { FICHE.nomArme[i] = nom.value; };
    nom.setAttribute('aria-label', 'Le nom de l’arme, ' + e.nom);
    const tdb = el('td','fmact'); tdb.append(nom, bouton('fm-arme-' + i, p, () => {
      const propre = String(FICHE.nomArme[i] || '').trim();
      FICHE.nomArme[i] = '';
      acheter(propre || e.nom, p, () => {
        const y = T.personnages[c.id];
        y.armes = y.armes.concat([{nom:propre || e.nom, de:e.de, notes:[propre ? e.nom : e.ex, e.notes].filter(Boolean).join(' · ')}]);
        majPerso(y);
      });
    }));
    tr.append(td, el('td','n', e.de), el('td','n', texteArgent(p)), tdb);
    return tr;
  });
  tableau('Les armes', [{l:'Arme'}, {l:'Dé', n:true}, {l:'Prix', n:true}, {l:''}], la);
  const lances = el('label','coche fcoche');
  const cb = el('input'); cb.type = 'checkbox'; cb.id = 'fm-lances'; cb.checked = FICHE.lances;
  cb.onchange = () => { FICHE.lances = cb.checked; dessinerFiche(true); const y = $('fm-lances'); if(y) y.focus(); };
  lances.append(cb, document.createTextNode(' Hors d’un camp ori’ican : les lances coûtent le double. Seuls les Ori’Ican les forgent, et la pique de totem ne se vend jamais.'));
  box.append(lances);

  const lr = MARCHE.armures.map((e, i) => {
    const tr = el('tr');
    tr.append(el('td', null, e.nom), el('td','n', (e.sorte === 'bouclier' ? '+' : '') + e.red), el('td','n', texteArgent(e.prix)));
    const tdb = el('td','fmact');
    tdb.append(bouton('fm-armure-' + i, e.prix, () => acheter(e.nom, e.prix, () => {
      const o = nouvelObjet(c.id, {nom:e.nom, sorte:e.sorte, red:e.red, prix:e.prix, origine:'Acheté au marché'});
      if(!porteDe(c.id, e.sorte)) porterObjet(o.id, true);
    })));
    tr.append(tdb);
    return tr;
  });
  tableau('Les armures', [{l:'Pièce'}, {l:'Réduction', n:true}, {l:'Prix', n:true}, {l:''}], lr);
  box.append(el('p','mini', 'Une armure achetée se porte tout de suite si rien d’autre n’est porté ; un bouclier occupe une main.' + (c.armure ? ' Son corps supporte : ' + c.armure.charAt(0).toLowerCase() + c.armure.slice(1).replace(/\.$/, '') + '.' : '')));

  const lc = MARCHE.consommables.map((e, i) => {
    const tr = el('tr');
    const td = el('td'); td.append(el('b', null, e.nom), el('div','mini', e.effet));
    const combien = () => Math.max(1, Math.min(20, parseInt(FICHE.qte[i], 10) || 1));
    const n = el('input'); n.type = 'number'; n.id = 'fm-qte-' + i; n.min = '1'; n.max = '20'; n.value = String(combien()); n.style.width = '64px';
    n.setAttribute('aria-label', 'Combien de ' + e.nom);
    const tdb = el('td','fmact');
    const bt = bouton('fm-conso-' + i, e.prix * combien(), () => {
      const q = combien();
      FICHE.qte[i] = '';
      acheter((q > 1 ? q + ' × ' : '') + e.nom, e.prix * q, () => {
        ajouterAuSac(c.id, {nom:e.nom, n:q, sorte:'conso', effet:e.effet, prix:e.prix, origine:'Acheté au marché'});
      });
    });
    /* le bouton suit la quantité, sans redessiner la page sous la souris */
    n.oninput = () => {
      FICHE.qte[i] = n.value;
      const p = e.prix * combien();
      bt.disabled = p > bourse;
      bt.title = p > bourse ? manque(p) : '';
    };
    tdb.append(n, bt);
    tr.append(td, el('td','n', texteArgent(e.prix)), tdb);
    return tr;
  });
  tableau('Les consommables', [{l:'Objet'}, {l:'Prix', n:true}, {l:''}], lc);
  box.append(el('p','mini', 'Un consommable fait toujours moins qu’une Pratique, ou coûte beaucoup plus cher.'));

  const ld = MARCHE.depenses.map((e, i) => {
    const tr = el('tr');
    const td = el('td'); td.append(document.createTextNode(e.nom)); if(e.note) td.append(el('span','mini', ' · ' + e.note));
    const tdb = el('td','fmact');
    tdb.append(bouton('fm-dep-' + i, e.prix, () => acheter(e.nom.charAt(0).toLowerCase() + e.nom.slice(1), e.prix, () => {}), 'Payer'));
    tr.append(td, el('td','n', texteArgent(e.prix)), tdb);
    return tr;
  });
  tableau('Le gîte et le péage', [{l:'Dépense'}, {l:'Prix', n:true}, {l:''}], ld);
  box.append(el('p','mini', 'La faim n’est pas une jauge : on mange dans la fiction, les vivres ne se comptent pas.'));
}

/* ---------- sa progression : le registre du livre, pour lui ---------- */
function vueProgression(c, box){
  PROG_PERSO = c.id;
  const p = el('div'); p.id = 'progBox';
  box.append(p);
  dessinerProgDans(p);
}

/* ---------- son histoire, ses liens, et le jour où il entre dans le monde ---------- */
function vueHistoire(c, box){
  box.append(el('h3', null, 'Ce qu’il est'));
  const zone = el('textarea'); zone.id = 'fh-texte'; zone.rows = 5; zone.value = c.texte;
  zone.placeholder = 'Son histoire, sa voix, ce qu’il cherche. « / » puis un nom cite quelqu’un, « -- » puis un nom cite un lieu.';
  zone.setAttribute('aria-label', 'Ce qu’il est');
  zone.onchange = () => ecrireSansDessin(() => { const y = T.personnages[c.id]; if(y && !y.supprime){ y.texte = zone.value; majPerso(y); } });
  box.append(zone);
  brancherMentions(zone);
  const ref = 'pj:' + c.id;
  box.append(el('h3', null, 'Ses liens'));
  const ls = liensDe(ref);
  if(ls.length) box.append(liensEnBref(ref));
  const vers = el('a','mini', ls.length ? 'Les voir et en tisser d’autres, dans le Registre des Visages' : 'Aucun pour l’instant. En tisser, dans le Registre des Visages');
  vers.href = 'pnj.html#pj-' + encodeURIComponent(c.id); vers.target = ONGLET_VISAGES;
  box.append(vers);
  box.append(el('h3', null, 'Dans les comptes rendus'));
  box.append(blocTextes(ref, () => dessinerFiche(true)));

  box.append(el('h3', null, 'Entrer dans le monde'));
  box.append(el('p','mini', 'Quand vous arrêtez de le jouer, il devient un PNJ du Registre des Visages : son nom, son histoire, ce qu’il sait faire, ses PV, et tous ses liens passent à sa fiche de PNJ. Ce que les comptes rendus disent de lui y reste attaché. Il quitte la table, et on peut le reprendre plus tard.'));
  const b = deuxTemps('monde-' + c.id, 'Le faire entrer dans le monde', 'Confirmer : ' + (c.nom || 'il') + ' quitte la table', () => {
    let p = null;
    changer(() => { p = versLeMonde(c.id); });
    if(PED && PED.id === c.id) fermerEditeurPerso();
    if(p) msgTable((c.nom || 'Il') + ' est entré dans le monde : sa fiche de PNJ l’attend dans le Registre des Visages.', true);
  }, 'ghost sm');
  b.id = 'fMonde-go';
  box.append(b);
}

/* ---------- ceux qui sont entrés dans le monde ---------- */
function dessinerMonde(){
  const box = $('fMonde'); if(!box) return;
  box.innerHTML = '';
  const l = entresDansLeMonde();
  if(!l.length) box.append(el('p','vide', 'Personne pour l’instant. Un personnage qu’on arrête de jouer y entre depuis « Son histoire ».'));
  l.forEach(c => {
    const w = el('div','fancien');
    const p = c.monde && T.pnj[c.monde] && !T.pnj[c.monde].supprime ? T.pnj[c.monde] : null;
    const t = el('div');
    t.append(el('b', null, c.nom || 'Sans nom'));
    t.append(el('span','mini', ' · ' + [c.peuple, c.voie].filter(Boolean).join(', ') + (c.mondeT ? ' · entré dans le monde le ' + dateCourte(c.mondeT) : '')
      + (plusieursCampagnes() ? ' · venu de « ' + nomCampagne(idCampagneDe(c)) + ' »' : '')));
    if(p){ const a = el('a','mini', 'Sa fiche de PNJ'); a.href = 'pnj.html#' + encodeURIComponent(p.id); a.target = ONGLET_VISAGES; t.append(el('br'), a); }
    else t.append(el('br'), el('span','mini', 'Sa fiche de PNJ a été retirée du Registre des Visages.'));
    w.append(t);
    const chez = plusieursCampagnes() ? ' de « ' + nomCampagne(idCourante()) + ' »' : '';
    const b = deuxTemps('reprendre-' + c.id, 'Le reprendre', 'Confirmer : il revient à la table' + chez, () => {
      FICHE.perso = c.id; garderChoixFiche();
      changer(() => { reprendrePersonnage(c.id); });
      msgTable((c.nom || 'Il') + ' revient à la table' + chez + ', avec ses liens. Sa fiche de PNJ s’efface.', true);
    }, 'ghost sm');
    b.id = 'fReprendre-' + c.id;
    if(estAMoi('personnages', c.id)) w.append(b);
    box.append(w);
  });
  const n = persos().length, camp = campagneCourante();
  /* clore la campagne : à celui qui l'a créée */
  if(n && (!camp || estAMoi('campagnes', camp.id))){
    const b = deuxTemps('clore', 'Clore la campagne', 'Confirmer : les ' + (n > 1 ? n + ' personnages' : 'le personnage') + ' de la table entrent dans le monde', () => {
      /* la campagne se termine, et sa compagnie entre dans le monde ; une campagne déjà terminée ne fait que renvoyer ses personnages */
      if(camp && camp.etat !== 'finie'){ const r = cloreCampagne(camp.id); msgTable(r.msg, r.ok); return; }
      let k = 0;
      changer(() => { persos().forEach(c => { if(versLeMonde(c.id)) k++; }); });
      if(PED) fermerEditeurPerso();
      msgTable(k + (k > 1 ? ' personnages sont entrés' : ' personnage est entré') + ' dans le monde.', true);
    }, 'ghost sm');
    b.id = 'fClore';
    const w = el('div','acts'); w.style.marginTop = '10px';
    w.append(b, el('span','mini', 'Toute la compagnie d’un coup, quand la campagne s’arrête.'));
    box.append(w);
  }
}

/* ---------- l'impression : la fiche du Word, avec ce qu'il a aujourd'hui ---------- */
/* la fiche du Word remplace la page, à l'impression seulement : Ctrl+P la donne aussi, pour le personnage affiché */
function preparerImpression(pid){
  const c = perso(pid), z = $('ficheImpr');
  if(!c || !z){ document.body.classList.remove('imprime-fiche'); return false; }
  z.innerHTML = '';
  z.append(ficheImprimee(c));
  document.body.classList.add('imprime-fiche');
  return true;
}
function imprimerFiche(pid){ if(preparerImpression(pid)) window.print(); }
if($('ficheBox')){
  window.addEventListener('beforeprint', () => { preparerImpression(FICHE.perso); });
  window.addEventListener('afterprint', () => { document.body.classList.remove('imprime-fiche'); });
}
/* la mise en page et les textes du livre sont dans commun/fiche-du-word.js, partagés avec le Registre du Havre ;
   ici, ce que la table sait de lui aujourd'hui : son joueur, ce qu'il porte, son sac, sa bourse, sa progression */
function ficheImprimee(c){
  const humain = /humain/i.test(c.peuple) || c.bonusPratique === 30;
  const s = c.sub || {};
  const bouclier = porteDe(c.id, 'bouclier');

  const comp = {};
  Object.keys(SKILLS).forEach(x => SKILLS[x].forEach(k => {
    const tot = compTotal(c, k), bonus = tot - c.car[CAR_DE[k]] * 2;
    comp[k] = {bonus: bonus ? (bonus > 0 ? '+' : '') + bonus : '', total: tot};
  }));

  const pratiques = c.pratiques.map(p => {
    const v = pratValeur(c, p);
    return {nom:p.n, cout: p.base ? 'de base' : p.banniere ? 'Bannière' : p.pct ? p.pct : p.pc ? p.pc + ' PC' : 'gratuit', effet:p.d,
      lance: v.val == null ? p.j : (ABR_JET[v.jet] || v.jet) + (v.par ? ' · ' + v.par : ''), valeur:v.val};
  });

  const pieces = [];
  if(c.red) pieces.push(['Ton armure naturelle', String(c.red), (c.traits || '').split('·')[0].trim()]);
  objetsDe(c.id).filter(o => o.porte).forEach(o => pieces.push([o.nom, (o.sorte === 'bouclier' ? '+' : '') + o.red, o.sorte === 'bouclier' ? 'Occupe une main' : o.note]));
  const sac = objetsDe(c.id).filter(o => !o.porte)
    .map(o => o.nom + (o.n > 1 ? ' ×' + o.n : '') + (o.sorte === 'conso' && o.effet ? ' (' + o.effet.replace(/[\s.]+$/, '') + ')' : ''));
  const b = bourseDe(c.id);
  const texte = sansMarques(c.texte || '', gensCitables()).trim();

  return ficheDuWord(el('div','fimp'), {
    nom: c.nom, joueur: c.joueur,
    identite: {peuple:c.peuple, voie:c.voie,
      banniere: humain ? s.ban : null, ecole: humain ? s.ecole : null,
      type: /ori.?ican/i.test(c.peuple) ? s.type : null, branche: /nyr/i.test(c.peuple) ? s.branche : null},
    apport: [
      [['Traits chiffrés', c.traits, '46%'],
       ['Domaine et bonus', c.domaine ? 'Pratiques ' + c.domaine.replace(/\s*\([^)]*\)\s*$/, '') + (humain ? ' · +10 par son école' : ' · +20') : null, '27%'],
       ['Contrainte', c.contrainte, '27%']],
      [['Compétence de peuple', c.peupleComp, '50%'], ['Armure que ton corps supporte', c.armure, '50%']]
    ],
    car: c.car, noteCar: null,
    derivees: [['Points de vie', 'au maximum', c.pvMax], ['Points de Contenance', 'au maximum', c.pcMax],
      ['Réduction d’armure', bouclier ? 'ta pièce, ton bouclier, ton armure naturelle' : 'ta pièce, plus ton armure naturelle', redDe(c)]],
    noteComp: ['Total = caractéristique fois deux, plus le bonus.', 'Le d20 est ce total divisé par cinq. Les chiffres sont ceux d’aujourd’hui, progression comprise.'],
    comp: comp,
    notePrat: ['Elles se lancent chacune sous sa caractéristique, celle qui est écrite à côté d’elle, fois deux, plus leur bonus, ou sous ta compétence de la même caractéristique si elle est plus haute.', 'Ce qui n’a pas de cible hostile ne se lance pas, et une zone fait tester ceux qui sont dedans. Un échec consomme le PC, sauf l’attaque de base.'],
    pratiques: pratiques,
    armes: c.armes,
    noteArmure: 'Les réductions s’additionnent : ta pièce' + (bouclier ? ', ton bouclier' : '') + ' plus ton armure naturelle.' + (c.armure ? ' Ton corps supporte ' + c.armure.charAt(0).toLowerCase() + c.armure.slice(1).replace(/\.$/, '') + '.' : ''),
    pieces: pieces,
    titreSac: 'Le sac', sac: sac, bourse: b ? texteArgent(b) : '–',
    charge: /cim[ée]ran/i.test(c.peuple) ? c.pvMax : null,
    notes: [texte, 'Progression : ' + pointsGagnes(c) + ' points gagnés, ' + pointsDepenses(c) + ' dépensés, ' + pointsRestants(c) + ' à dépenser.'].filter(Boolean).join('\n\n')
  });
}
