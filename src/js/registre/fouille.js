/* ============ fouiller ceux qui sont tombés ============
   Sa propre table et les tables partagées qu'il porte, écrites dans le Registre des Rencontres ; et le butin
   du Livre VI : un d20 pour la rareté, décalé par l'endroit, puis un d20 dans la table qu'il désigne
   (commun/butin.js). Le site lance les dés, ou l'on écrit ceux lancés sur la table.
   Ce qu'on trouve va dans le sac d'un personnage, ou reste là ; la séance le note. Tout se défait. */

const FOU = {id:'', endroit:'officier', lu:'', texte:'', qui:'', d1:'', d2:'', site:true, des:{}};
const BTN = {ouvert:null};   /* le bloc « Le butin » : ouvert tant qu'il reste quelqu'un à fouiller, sauf si on l'a replié */

/* l'endroit, deviné : un soldat ou un praticien vaut un officier, un Marchefleur ou une relique de l'Avant vaut le +5 */
function endroitPar(a){
  const nom = [a.base, a.nom].join(' ');
  if(/marchefleur|l.avant\b/i.test(nom) || (a.fam || []).indexOf('relique') >= 0) return 'avant';
  if((a.fam || []).some(k => k === 'soldat' || k === 'pratique' || k === 'golem')) return 'officier';
  return 'pauvre';
}
const rareteDe = v => BUTIN.rarete.find(x => v >= x.de && v <= x.a) || BUTIN.rarete[0];
const objetDe = (k, v) => (BUTIN.tables[k] || []).find(x => v >= x.de && v <= x.a) || null;
/* « Flèches, 1d6. » devient « Flèches, 4. » : seul le nombre d'objets se lance, pas les dés de ce qu'ils font */
function lancerQuantite(t){
  const i = t.indexOf('. ');
  const tete = i >= 0 ? t.slice(0, i) : t, reste = i >= 0 ? t.slice(i) : '';
  return tete.replace(/\b(\d*)d(\d+)\b/g, (m, n, f) => {
    let s = 0;
    for(let k = 0; k < (+n || 1); k++) s += 1 + Math.floor(Math.random() * +f);
    return String(s);
  }) + reste;
}
/* ses tables : la sienne, puis les partagées. Celles du bestiaire d'aujourd'hui quand on l'a lu et qu'il y est
   encore : une table qu'on lui a ôtée ne revient pas. Sinon celles qu'il portait en entrant en scène */
function tablesPourFouille(a){
  const c = a.cid ? trouveId(a.cid) : null;
  const sur = !!c && TIR.complet && !TIR.rate;
  const out = [];
  const propre = sur ? (c.butin || '') : (a.butin || (c && c.butin) || '');
  if(lireTableButin(propre).lignes.length) out.push({k:'propre', l:'Sa table', lignes:propre});
  (sur ? tablesDe(c) : (a.tables && a.tables.length ? a.tables : c ? tablesDe(c) : []))
    .forEach(t => { if(lireTableButin(t.lignes).lignes.length) out.push({k:t.k, l:'Table « ' + t.l + ' »', lignes:t.lignes}); });
  return out;
}
function ouvrirFouille(a){
  if(FOU.id === a.id){ FOU.id = ''; dessinerCombat(true); return; }
  const moi = MOI.perso && perso(MOI.perso) ? MOI.perso : '';
  Object.assign(FOU, {id:a.id, endroit:endroitPar(a), lu:'', texte:'', qui:moi || ((persos()[0] || {}).id || ''), d1:'', d2:'', site:true, des:{}});
  dessinerCombat(true);
  setTimeout(() => { const f = document.querySelector('#seCombat .fouille'); if(f) f.scrollIntoView({block:'nearest', behavior:'smooth'}); }, 30);
}
/* le butin du livre ; les dés du site lancent aussi la quantité, ceux de la table la laissent à lancer */
function lireButin(d1, d2, site){
  const e = BUTIN.endroits.find(x => x.k === FOU.endroit) || BUTIN.endroits[1];
  const v = d1 + e.m, r = rareteDe(v), o = objetDe(r.k, d2);
  FOU.d1 = String(d1); FOU.d2 = String(d2); FOU.site = !!site;
  FOU.lu = 'Rareté : ' + d1 + (e.m ? (e.m > 0 ? ' + ' : ' − ') + Math.abs(e.m) + ' = ' + v : '') + ', ' + r.l.toLowerCase() + ' · objet : ' + d2 + '.';
  FOU.texte = o ? (site ? lancerQuantite(o.t) : o.t) : '';
}
/* une de ses tables : le dé du site, ou celui de la table */
function lireTableFouille(x, v){
  const r = tirerTableButin(x.lignes, v);
  if(!r) return;
  FOU.texte = r.t;
  FOU.lu = x.l + ', d' + r.de + ' : ' + r.v + (r.t ? '.' : ', rien à ce numéro.');
}
function finirFouille(a, etat, txt, qui){
  const x = unAdversaire(a.id); if(!x) return;
  const texte = String(txt || '').replace(/\s*\n+\s*/g, ' ').trim();
  const c = etat === 'fait' ? perso(qui) : null;
  if(etat === 'fait' && !c){ msgTable('Choisis qui le prend.', false); return; }
  if(etat === 'fait' && !texte){ msgTable('Rien à donner : tire le butin, ou écris ce qu’on trouve.', false); return; }
  const argent = c ? argentEnTete(texte) : 0;
  if(c && !argent && objetsDe(c.id).length >= SAC_PLEIN){ msgTable('Le sac de ' + (c.nom || 'ce personnage') + ' est plein : ' + SAC_PLEIN + ' objets. Vide-le un peu dans le Registre des Marchefleurs.', false); return; }
  if(FOU.id === a.id) FOU.id = '';
  changer(() => {
    let bloc = '', objet = '', mvt = '';
    if(c){
      bloc = noterDansSeance((c.nom || 'Sans nom') + ' prend sur ' + x.nom + ' : ' + texte.replace(/[\s.]+$/, '') + '.', 'note');
      /* de l'argent va dans sa bourse, le reste dans son sac, avec d'où il vient. Un nom tiré de l'adversaire :
         deux joueurs qui le fouillent au même moment ne font qu'une ligne */
      const t = maintenant();
      if(argent){
        mvt = 'arg-f-' + x.id;
        T.argent[mvt] = normArgent({id:mvt, perso:c.id, n:argent, motif:'Sur ' + x.nom + ' : ' + texte.replace(/[\s.]+$/, ''), bloc:bloc, t:t, maj:t});
      } else {
        objet = 'o-f-' + x.id;
        T.objets[objet] = normObjet(Object.assign(objetDepuisTexte(texte), {id:objet, perso:c.id, origine:'Sur ' + x.nom, t:t, maj:t}));
      }
    } else if(texte) bloc = noterDansSeance('Sur ' + x.nom + ' : ' + texte.replace(/[\s.]+$/, '') + '. On le laisse là.', 'note');
    T.adversaires[x.id] = Object.assign({}, T.adversaires[x.id], {fouille:{etat:etat, texte:texte, qui:c ? c.id : '', bloc:bloc, t:maintenant(), objet:objet, argent:mvt}, maj:maintenant()});
  });
  msgTable(c ? (argent ? 'Dans la bourse de ' : 'Dans le sac de ') + (c.nom || 'Sans nom') + ' : ' + texte : texte ? 'Laissé là, et noté dans la séance.' : x.nom + ' : laissé sans le fouiller.', true);
}
/* défaire : l'objet sort du sac (l'argent de la bourse), la ligne de la séance s'en va, on peut fouiller de nouveau */
function defaireFouille(a){
  const x = unAdversaire(a.id); if(!x || !x.fouille) return;
  const f = x.fouille;
  changer(() => {
    const y = f.qui && T.personnages[f.qui];
    if(f.etat === 'fait' && f.objet) oterObjet(f.objet);
    else if(f.etat === 'fait' && f.argent) defaireMouvement(f.argent);
    else if(f.etat === 'fait' && y && !y.supprime){
      /* une fouille d'avant le sac en piles : l'objet est une ligne de texte sur la fiche, passée dans le sac
         sous un nom fixe. On retire cette pile (ou on la marque, si elle n'est pas encore passée), sans toucher
         au texte, dont l'ordre donne les noms des autres */
      const i = y.sac.lastIndexOf(f.texte);
      if(i >= 0){
        const h = cleLigne(y.id, y.sac, i);
        if(argentEnTete(f.texte)){ if(T.argent['arg-' + h]) defaireMouvement('arg-' + h); else T.argent['arg-' + h] = normArgent({id:'arg-' + h, perso:y.id, supprime:true, maj:maintenant()}); }
        else if(T.objets['o-' + h]) oterObjet('o-' + h);
        else T.objets['o-' + h] = normObjet({id:'o-' + h, perso:y.id, nom:f.texte, supprime:true, maj:maintenant()});
      }
    }
    oublierBloc(f.bloc);
    T.adversaires[x.id] = Object.assign({}, T.adversaires[x.id], {fouille:null, maj:maintenant()});
  });
}
function phraseFouille(f){
  if(f.etat === 'fait'){ const c = perso(f.qui); return (c ? c.nom || 'Sans nom' : 'Quelqu’un') + ' a pris : ' + f.texte; }
  return f.texte ? 'Laissé là : ' + f.texte : 'Laissé sans le fouiller.';
}

/* ---------- le panneau : ses tables, le livre, et à qui ça va ---------- */
/* un dé qu'on écrit soi-même, à côté du bouton qui le lance */
function deAEcrire(id, faces, val, garder, lire){
  const i = el('input'); i.type = 'number'; i.id = id; i.min = '1'; i.max = String(faces); i.inputMode = 'numeric'; i.value = val || '';
  i.placeholder = 'd' + faces; i.setAttribute('aria-label', 'Ton d' + faces + ', lancé sur la table');
  i.oninput = () => garder(i.value);
  i.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); lire(); } };
  return i;
}
function panneauFouille(a){
  const w = el('div','fouille');
  w.append(el('p','ftitre', 'Fouiller ' + a.nom));
  tablesPourFouille(a).forEach((x, n) => {
    const lt = lireTableButin(x.lignes);
    const s = el('div','fsienne');
    s.append(el('span','lab', x.l + ' · ' + (lt.numerotee ? 'd' + lt.de : 'une ligne au hasard')));
    if(lt.lignes.length <= 12){
      const u = el('ul','mini');
      lt.lignes.forEach(l => u.append(el('li', null, (l.de != null ? (l.de === l.a ? l.de : l.de + '-' + l.a) + ' ' : '') + l.t)));
      s.append(u);
    }
    const g = el('div','acts fdes');
    const b = el('button','btn ghost xs','Tirer'); b.type = 'button'; b.id = 'fouTirer-' + n;
    b.setAttribute('aria-label', 'Tirer dans ' + x.l);
    b.onclick = () => { lireTableFouille(x); dessinerCombat(true); };
    const ok = el('button','btn ghost xs','Lire'); ok.type = 'button'; ok.id = 'fouLireT-' + n;
    const i = deAEcrire('fouDe-' + n, lt.de, FOU.des[x.k], v => { FOU.des[x.k] = v; }, () => ok.click());
    ok.onclick = () => {
      const v = parseInt(i.value, 10);
      if(!(v >= 1 && v <= lt.de)){ msgTable('Un d' + lt.de + ' : de 1 à ' + lt.de + '.', false); return; }
      lireTableFouille(x, v); dessinerCombat(true);
    };
    g.append(b, el('span','mini', 'ou ton d' + lt.de + ' :'), i, ok);
    s.append(g);
    w.append(s);
  });
  const lv = el('div','flivre');
  lv.append(el('span','lab', tablesPourFouille(a).length ? 'Ou le butin du livre' : 'Le butin du livre'));
  const so = el('select'); so.id = 'fouEndroit'; so.setAttribute('aria-label', 'Où on fouille');
  BUTIN.endroits.forEach(x => so.add(new Option((x.m ? (x.m > 0 ? '+' : '−') + Math.abs(x.m) : 'normal') + ' · ' + x.l.charAt(0).toLowerCase() + x.l.slice(1), x.k)));
  so.value = FOU.endroit;
  so.onchange = () => {
    FOU.endroit = so.value;
    if(FOU.d1 !== '' && FOU.d2 !== '' && /^Rareté/.test(FOU.lu)) lireButin(+FOU.d1, +FOU.d2, FOU.site);
    dessinerCombat(true);
  };
  lv.append(so);
  const g = el('div','acts fdes');
  const b = el('button','btn sm','Lancer les deux d20'); b.type = 'button'; b.id = 'fouLancer';
  b.onclick = () => { lireButin(1 + Math.floor(Math.random() * 20), 1 + Math.floor(Math.random() * 20), true); dessinerCombat(true); };
  const ok = el('button','btn ghost xs','Lire'); ok.type = 'button'; ok.id = 'fouLire';
  const i1 = deAEcrire('fouD1', 20, FOU.site ? '' : FOU.d1, v => { FOU.d1 = v; FOU.site = false; }, () => ok.click());
  const i2 = deAEcrire('fouD2', 20, FOU.site ? '' : FOU.d2, v => { FOU.d2 = v; FOU.site = false; }, () => ok.click());
  i1.setAttribute('aria-label', 'Ton d20 de rareté'); i1.placeholder = 'rareté';
  i2.setAttribute('aria-label', 'Ton d20 d’objet'); i2.placeholder = 'objet';
  ok.onclick = () => {
    const v1 = parseInt(i1.value, 10), v2 = parseInt(i2.value, 10);
    if(!(v1 >= 1 && v1 <= 20 && v2 >= 1 && v2 <= 20)){ msgTable('Deux d20 : un pour la rareté, un pour l’objet, de 1 à 20.', false); return; }
    lireButin(v1, v2, false); dessinerCombat(true);
  };
  g.append(b, el('span','mini', 'ou tes d20 :'), i1, i2, ok);
  lv.append(g);
  w.append(lv);
  if(FOU.lu) w.append(el('p','mini fverdict', FOU.lu));

  const tx = el('textarea'); tx.id = 'fouTexte'; tx.rows = Math.min(7, Math.max(2, Math.ceil(FOU.texte.length / 32) + 1)); tx.value = FOU.texte;
  tx.placeholder = 'Ce qu’on trouve. Un objet unique ne se tire pas : écris-le ici.';
  tx.setAttribute('aria-label', 'Ce qu’on trouve');
  tx.oninput = () => { FOU.texte = tx.value; };
  w.append(tx);

  const act = el('div','acts');
  const gens = persos();
  if(gens.length){
    const sq = el('select'); sq.id = 'fouQui'; sq.setAttribute('aria-label', 'Qui le prend');
    gens.forEach(c => sq.add(new Option(c.nom || 'Sans nom', c.id)));
    if(!gens.some(c => c.id === FOU.qui)) FOU.qui = gens[0].id;
    sq.value = FOU.qui;
    const don = el('button','btn sm','Donner'); don.type = 'button'; don.id = 'fouDonner';
    sq.onchange = () => { FOU.qui = sq.value; };
    don.onclick = () => finirFouille(a, 'fait', FOU.texte, FOU.qui);
    act.append(sq, don);
  }
  const la = el('button','btn ghost sm','Le laisser là'); la.type = 'button'; la.id = 'fouLaisser';
  la.onclick = () => finirFouille(a, 'laisse', FOU.texte, '');
  const fe = el('button','btn ghost xs','Fermer'); fe.type = 'button'; fe.id = 'fouFermer';
  fe.onclick = () => { FOU.id = ''; dessinerCombat(true); };
  act.append(la, fe);
  w.append(act);
  return w;
}
/* sur la ligne de quelqu'un à terre : fouiller, ou ce qu'on y a trouvé */
function fouilleSurLigne(a, w){
  if(a.fouille){
    const p = el('p','mini afouille');
    p.append(document.createTextNode(phraseFouille(a.fouille) + ' '));
    const d = el('button','btn ghost xs','Défaire'); d.type = 'button';
    d.setAttribute('aria-label', 'Défaire la fouille de ' + a.nom);
    d.onclick = () => defaireFouille(a);
    p.append(d);
    w.append(p);
    return;
  }
  if(FOU.id === a.id) w.append(panneauFouille(a));
}

/* ---------- après le combat : ceux qui sont restés à terre ---------- */
function tombesDeLaSeance(){
  const e = seanceCourante(); if(!e) return [];
  return rencontresDe(e.id).filter(r => r.fini).reduce((acc, r) => acc.concat(adversairesDe(r.id).filter(aTerre)), []);
}
function blocButin(){
  const l = tombesDeLaSeance();
  if(!l.length) return null;
  const reste = l.filter(a => !a.fouille).length;
  const d = el('details','cote-butin');
  const auto = reste > 0 || !!(FOU.id && l.some(a => a.id === FOU.id));
  d.open = BTN.ouvert == null ? auto : BTN.ouvert;
  /* seul un geste contraire à ce qui s'ouvre tout seul se retient */
  d.ontoggle = () => { BTN.ouvert = d.open === auto ? null : d.open; };
  d.append(el('summary', null, 'Le butin · ' + (reste ? reste + ' à fouiller' : 'tout est fouillé')));
  l.forEach(a => {
    const w = el('div','fligne');
    w.setAttribute('data-adv', a.id);
    const t = el('div','atete');
    t.append(el('b','anom', a.nom), el('span','arang', 'rang ' + a.rang));
    if(!a.fouille){
      const f = el('button','btn ghost xs' + (FOU.id === a.id ? ' on' : ''), 'Fouiller'); f.type = 'button';
      f.setAttribute('aria-label', 'Fouiller ' + a.nom);
      f.onclick = () => ouvrirFouille(a);
      const x = el('button','btn ghost xs','Laisser'); x.type = 'button';
      x.setAttribute('aria-label', 'Laisser ' + a.nom + ' sans le fouiller');
      x.onclick = () => finirFouille(a, 'laisse', '', '');
      t.append(f, x);
    }
    w.append(t);
    fouilleSurLigne(a, w);
    d.append(w);
  });
  return d;
}
