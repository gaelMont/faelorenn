/* ============ la fiche imprimable, calquee sur le Word ============ */

function fh(txt){ return el('h3','fh', txt); }
function fnote(bold, rest){
  const p = el('p','fnote');
  if(bold) p.append(el('b', null, bold + ' '));
  if(rest) p.append(document.createTextNode(rest));
  return p;
}
function fsm(txt, strong){
  const p = el('p','fsm');
  p.append(document.createTextNode(txt));
  if(strong) p.append(el('b', null, ' ' + strong));
  return p;
}
function fld(label, value, w){
  const td = el('td','fd');
  if(w) td.style.width = w;
  if(label) td.append(el('div','lb', label));
  const v = el('div','vl');
  (String(value == null || value === '' ? '\u2013' : value)).split('\n').forEach((line, i) => {
    if(i) v.append(el('br'));
    v.append(document.createTextNode(line));
  });
  td.append(v); return td;
}
function cols(t, widths){
  const cg = el('colgroup');
  widths.forEach(w => { const c = el('col'); c.style.width = w; cg.append(c); });
  t.append(cg); return t;
}
function frow(cells){ const t = el('table','fx'), tr = el('tr'); cells.forEach(c => tr.append(c)); t.append(tr); return t; }

/* ---- petits calculs de la fiche ---- */
function domCourt(){
  const d = domaine(); if(!d) return '';
  return 'Pratiques ' + d.replace(/\s*\([^)]*\)\s*$/, '');
}
function bonusPeupleTxt(){
  const b = peupleBonus(), out = [];
  CARS.forEach(c => { if(b[c]) out.push('+' + b[c] + ' ' + ABBR[c]); });
  return out.join(' · ');
}
function pratBonus(){ return 20 + (S.peuple === 'Humains' ? 10 : 20); }
function pratTotal(){ return carVal('Contenance') * 2 + pratBonus(); }
/* ce que lance une Pratique, et sous quelle valeur : le meilleur de la Pratique et de la competence du meme geste */
function pratValeur(it){
  const j = (it && it.j) || '';
  if(REG_JETS_CAR.indexOf(j) >= 0){
    const propre = carVal(j) * 2 + pratBonus();
    const comp = GESTE[j] ? skTotal(GESTE[j]) : 0;
    return {jet:j, val:Math.max(propre, comp), par: comp > propre ? GESTE[j] : ''};
  }
  return {jet: j || 'aucun jet', val:null, par:''};
}
function coutTxt(it){ return it.base ? 'de base' : (it.pct ? it.pct : (it.pc ? it.pc + ' PC' : 'gratuit')); }
function pratIndex(){
  const ix = {};
  pratList().forEach(g => g.items.forEach(it => ix[it.n] = it));
  const base = attaqueBase();
  if(base) ix[base.n] = base;
  const b = S.sub.ban === "L'Or" ? "de la Bannière de l'Or" : S.sub.ban === 'Le Sang' ? 'de la Bannière du Sang' : null;
  if(b && PRATIQUES[b]) PRATIQUES[b]._.forEach(it => ix[it.n] = it);
  return ix;
}
/* extrait les armes des paquetages : « un arc (d6) et douze fleches » */
function armesDuPaquetage(){
  const src = [VOIES[S.voie].paq, paqPeuple()].join(' ');
  const out = [];
  src.split(/(?:\.\s|,\s|\s:\s)/).forEach(frag => {
    const m = frag.match(/\(?\bd(\d+)\)?/);
    if(!m) return;
    if(/^Un Cornu/.test(frag.trim()) && S.sub.type !== 'Cornu') return;
    let nom = frag.slice(0, m.index).replace(/[\s(]+$/,'').trim();
    let notes = frag.slice(m.index + m[0].length).replace(/^[\s)]+/,'').replace(/^et\s+/,'').replace(/^[.\s]+|[.\s]+$/g,'').trim();
    if(!nom){ nom = notes; notes = ''; }
    nom = nom.replace(/^Un Cornu ajoute sa\s+/i, 'Sa ').replace(/^[.\s]+/,'');
    out.push({ nom: nom.charAt(0).toUpperCase() + nom.slice(1), de: 'd' + m[1], notes: notes });
  });
  return out;
}
function bourse(){
  let n = 0;
  [VOIES[S.voie].paq, paqPeuple()].forEach(s => {
    const m = s.match(/(\d+)\s+argents/g);
    if(m) m.forEach(x => n += parseInt(x, 10));
  });
  return n ? n + ' argents' : '\u2013';
}
/* ce qui reste du paquetage une fois les armes et la monnaie sortis */
function resteDuSac(){
  const armes = armesDuPaquetage().map(a => a.nom.toLowerCase());
  const out = [];
  [VOIES[S.voie].paq, paqPeuple()].forEach(s => {
    s.split(/(?:\.\s|,\s)/).forEach(frag => {
      const f = frag.replace(/\.$/,'').trim();
      if(!f) return;
      if(/\d+\s+argents/.test(f)) return;
      if(/\(?\bd\d+\)?/.test(f)) return;
      if(armes.indexOf(f.toLowerCase()) >= 0) return;
      out.push(f.charAt(0).toUpperCase() + f.slice(1));
    });
  });
  return out;
}

function drawFiche(){
  const box = $('fiche'); box.innerHTML = '';
  const p = PEUPLES[S.peuple], v = VOIES[S.voie];

  /* ---------- titre ---------- */
  box.append(el('div','ft', S.nom ? 'Fiche de ' + S.nom : 'Fiche de personnage'));
  box.append(el('div','fsub', 'Faelorenn · le jeu des Marchefleurs'));

  /* ---------- identite ---------- */
  box.append(fh('Identité'));
  box.append(frow([fld('Nom', S.nom, '40%'), fld('Peuple', S.peuple, '30%'), fld('Voie', S.voie, '30%')]));
  box.append(frow([
    fld('Bannière · humains', S.peuple === 'Humains' ? S.sub.ban : null, '25%'),
    fld('École ou Église · humains', S.peuple === 'Humains' ? S.sub.ecole : null, '25%'),
    fld('Type · Ori\u2019Ican', S.peuple === "Ori'Ican" ? S.sub.type : null, '25%'),
    fld('Branche · Nyréens', S.peuple === 'Nyréens' ? S.sub.branche : null, '25%')
  ]));

  /* ---------- ce que le peuple apporte ---------- */
  box.append(fh('Ce que ton peuple apporte'));
  box.append(frow([
    fld('Caractéristique', bonusPeupleTxt(), '25%'),
    fld('Traits chiffrés', p.traits, '37%'),
    fld('Domaine et bonus', domCourt() ? domCourt() + (S.peuple === 'Humains' ? ' · +10 par son école' : ' · +20') : null, '19%'),
    fld('Contrainte', p.contrainte, '19%')
  ]));
  box.append(frow([
    fld('Compétence de peuple', p.comp || (S.peuple === 'Humains' && S.banComp ? S.banComp + ' (Bannière)' : null), '50%'),
    fld('Armure que ton corps supporte', p.armure, '25%'),
    fld('Ce que ton peuple ajoute au sac', paqPeuple(), '25%')
  ]));

  /* ---------- caracteristiques ---------- */
  box.append(fh('Caractéristiques'));
  box.append(fnote('21 points à répartir.', 'Elles démarrent à 8 et ne dépassent pas 15 à la création. Le bonus de peuple s\u2019ajoute après. Plafond 18 en cours de jeu.'));
  const tc = el('table','fx car');
  const r1 = el('tr'), r2 = el('tr'), r3 = el('tr');
  CARS.forEach(c => {
    r1.append(el('th', null, c));
    const val = carVal(c);
    r2.append(el('td','big2', String(val)));
    r3.append(el('td','sub2', '×2 ' + (val * 2) + ' · mod ' + (near(val/5) >= 0 ? '+' : '') + near(val/5)));
  });
  tc.append(r1, r2, r3); box.append(tc);

  const td2 = el('table','fx der');
  const rd = el('tr');
  [['Points de vie','ta Constitution', pv()],
   ['Points de Contenance','la moitié de ta Contenance', pc()],
   ['Réduction d\u2019armure','ta pièce, plus ton armure naturelle', p.red]].forEach(x => {
    const td = el('td','dv');
    td.append(el('div','lb', x[0]), el('div','dvs', x[1]), el('div','big2', String(x[2])));
    rd.append(td);
  });
  td2.append(rd); box.append(td2);
  box.append(fsm('Ton mod, c\u2019est ta caractéristique divisée par cinq. La même division que pour le d20, et un seul arrondi dans tout le jeu : vers le bas.'));

  /* ---------- competences ---------- */
  box.append(fh(titreCompetences()));
  box.append(fnote('100 points de bonus à répartir, aucune dépense au-dessus de +40 dans une compétence. Voie, peuple et trait s’ajoutent par-dessus.', 'Total = caractéristique fois deux, plus le bonus. Le d20 est ce total divisé par cinq.'));

  const GA = [['Force',SKILLS['Force']],['Dextérité',SKILLS['Dextérité']],['Intelligence',SKILLS['Intelligence']]];
  const DR = [['Sagesse',SKILLS['Sagesse']],['Charisme',SKILLS['Charisme']]];
  const flat = gs => { const o = []; gs.forEach(g => { o.push({head:g[0]}); g[1].forEach(s => o.push({skill:s})); }); return o; };
  const L = flat(GA), R = flat(DR);
  R.push({note:'Constitution et Contenance n\u2019ont aucune compétence.'});
  R.push({note:'La Contenance sert à lancer les Pratiques.'});

  const ts = el('table','fx sk');
  cols(ts, ['23%','9%','9%','9%','23%','9%','9%','9%']);
  const hr = el('tr');
  ['Compétence','Bonus','Total','d20','Compétence','Bonus','Total','d20'].forEach((h, i) => {
    const th = el('th', i % 4 ? 'c' : null, h); hr.append(th);
  });
  ts.append(hr);
  const side = (e, tr) => {
    if(!e){ for(let i=0;i<4;i++) tr.append(el('td')); return; }
    if(e.head){
      const td = el('td','grp'); td.colSpan = 4;
      td.append(el('b', null, e.head), el('i', null, '  base ×2 ' + (carVal(e.head) * 2)));
      tr.append(td); return;
    }
    if(e.note){ const td = el('td','nte', e.note); td.colSpan = 4; tr.append(td); return; }
    const b = skBonus(e.skill), tot = (S.sk[e.skill]||0) + b.voie + b.trait, t = skTotal(e.skill);
    tr.append(el('td', null, nomComp(e.skill)));
    tr.append(el('td','c', tot ? '+' + tot : ''));
    tr.append(el('td','c b', String(t)));
    tr.append(el('td','c', String(d20(t))));
  };
  for(let i = 0; i < Math.max(L.length, R.length); i++){
    const tr = el('tr'); side(L[i], tr); side(R[i], tr); ts.append(tr);
  }
  box.append(ts);

  /* ---------- pratiques ---------- */
  box.append(el('div','brk'));
  box.append(fh('Pratiques'));
  box.append(fnote('L\u2019attaque de base d\u2019office, plus trois Pratiques choisies dans la liste de ton domaine.',
    'Une Pratique démarre à +20, ton peuple ajoute +20 sur son domaine, l\u2019école d\u2019un humain +10. Elle se lance sous sa caractéristique, celle qui est écrite à côté d’elle, fois deux, plus ce bonus, ou sous ta compétence de la même caractéristique si elle est plus haute. Ce qui n\u2019a pas de cible hostile ne se lance pas, et une zone fait tester ceux qui sont dedans. Un échec consomme le PC, sauf l\u2019attaque de base, qui ne coûte rien et se contente de rater.'));
  box.append(fsm('La Sève, l\u2019eau, la pierre, le vent et la Mue envoient de la matière : la réduction d\u2019armure s\u2019applique.', 'Le feu, l\u2019onde, l\u2019ombre et le sacré traversent les armures.'));
  const tp = el('table','fx prt'); cols(tp, ['21%','12%','8%','7%','52%']);
  const hp = el('tr');
  ['Pratique','Se lance','Valeur','d20','Ce qu\u2019elle fait'].forEach((h, i) => hp.append(el('th', i > 0 && i < 4 ? 'c' : null, h)));
  tp.append(hp);
  const ix = pratIndex();
  const lignes = pratNoms();
  if(S.banComp) lignes.push(S.banComp);
  lignes.forEach(n => {
    const it = ix[n] || {}, tr = el('tr'), v = pratValeur(it);
    const td = el('td');
    td.append(el('b', null, n));
    td.append(el('i', null, ' (' + coutTxt(it) + ')'));
    tr.append(td);
    if(v.val == null){
      tr.append(el('td','c', v.jet), el('td','c', '\u2013'), el('td','c', '\u2013'));
    } else {
      tr.append(el('td','c', ABR_JET[v.jet] + (v.par ? ' \u00b7 ' + v.par : '')), el('td','c b', String(v.val)), el('td','c', String(d20(v.val))));
    }
    tr.append(el('td','de', it.d || ''));
    tp.append(tr);
  });
  for(let i = lignes.length; i < 5; i++){
    const tr = el('tr'); for(let j = 0; j < 5; j++) tr.append(el('td','vide')); tp.append(tr);
  }
  box.append(tp);

  /* ---------- armes ---------- */
  box.append(fh('Armes'));
  box.append(fnote('', 'Dégâts = dé de l\u2019arme + mod FOR, ou mod DEX pour une arme légère et l\u2019arbalète, moins la réduction d\u2019armure de la cible. Minimum 0. On retire la réduction, puis la contrainte du corps, et on arrondit vers le bas.'));
  const ta = el('table','fx arm'); cols(ta, ['32%','8%','60%']);
  const ha = el('tr');
  ['Arme','Dé','Notes'].forEach((h, i) => ha.append(el('th', i === 1 ? 'c' : null, h)));
  ta.append(ha);
  const armes = armesDuPaquetage();
  armes.forEach(a => {
    const tr = el('tr');
    tr.append(el('td', null, a.nom), el('td','c b', a.de), el('td','de', a.notes));
    ta.append(tr);
  });
  for(let i = armes.length; i < 4; i++){
    const tr = el('tr'); for(let j = 0; j < 3; j++) tr.append(el('td','vide')); ta.append(tr);
  }
  box.append(ta);
  box.append(fsm('Légère d4 · à une main d6 · de guerre d8 · à deux mains d10 · arc court et arc de chasse d6 · arc long d8, et 12 en Force pour le bander · arbalète d8, une action pour recharger · lance ori’ican d8, d10 ou d12 selon les mues. On vise à la Dextérité, on blesse à la Force, sauf l’arme légère et l’arbalète qui blessent à la Dextérité.'));

  /* ---------- armure et equipement ---------- */
  box.append(fh('Armure et équipement'));
  box.append(fnote('Chaque pièce a ses propres chiffres.', 'Les réductions s\u2019additionnent : ta pièce plus ton armure naturelle. Ton corps supporte ' + p.armure.charAt(0).toLowerCase() + p.armure.slice(1) + '.'));
  const tq = el('table','fx arm'); cols(tq, ['30%','14%','56%']);
  const hq = el('tr');
  ['Pièce','Réduction','Ce qu\u2019elle coûte, ce qu\u2019elle apporte'].forEach((h, i) => hq.append(el('th', i === 1 ? 'c' : null, h)));
  tq.append(hq);
  let nq = 0;
  if(p.red){
    const tr = el('tr');
    tr.append(el('td', null, 'Ton armure naturelle'), el('td','c b', String(p.red)), el('td','de', p.traits.split('·')[0].trim()));
    tq.append(tr); nq++;
  }
  for(let i = nq; i < 4; i++){
    const tr = el('tr'); for(let j = 0; j < 3; j++) tr.append(el('td','vide')); tq.append(tr);
  }
  box.append(tq);
  box.append(fsm('Cuir ou matelassé 1 · cuir clouté ou écailles 2, \u221210 Discrétion · maille 3, \u221210 Discrétion et Acrobatie · plates 4, \u221210 Discrétion et \u221220 Acrobatie · bouclier +1, occupe une main.'));

  /* ---------- sac et bourse ---------- */
  const reste = resteDuSac();
  const ul = el('ul','sac');
  reste.forEach(x => ul.append(el('li', null, x)));
  const tsac = el('table','fx'), trs = el('tr');
  const tdS = el('td','fd'); tdS.style.width = '75%';
  tdS.append(el('div','lb','Le reste du sac'));
  if(reste.length) tdS.append(ul); else tdS.append(el('div','vl','\u2013'));
  const tdB = el('td','fd'); tdB.style.width = '25%';
  tdB.append(el('div','lb','Bourse · ors et argents'), el('div','big2', bourse()));
  trs.append(tdS, tdB); tsac.append(trs); box.append(tsac);

  /* ---------- charge, cimerans seulement ---------- */
  if(S.peuple === 'Cimérans'){
    box.append(el('div','brk'));
    box.append(fh('La Charge'));
    box.append(fnote('Une piste à part, à côté de tes PV.', 'Capacité : tes PV maximum, soit ' + pv() + '. Tu portes automatiquement la moitié des dégâts d\u2019un allié à dix pas, réduction déduite. Les soins n\u2019y touchent pas. Au-delà de ta capacité tu passes en morne, et le surplus te rentre dedans en dégâts réels.'));
    const tch = el('table','fx chg'), rch = el('tr');
    for(let i = 0; i < 10; i++) rch.append(el('td','vide'));
    tch.append(rch); box.append(tch);
    box.append(fsm('Se vider : Darguer, ou la dargue du festin, hors combat, trois convives au minimum. Un Ciméran seul ne se vide pas.'));
  }

  /* ---------- notes ---------- */
  if(S.peuple !== 'Cimérans') box.append(el('div','brk'));
  box.append(fh('Notes'));
  const tn = el('table','fx'), rn = el('tr'), tdn = el('td','fd notes');
  rn.append(tdn); tn.append(rn); box.append(tn);

  /* ---------- aide-memoire ---------- */
  box.append(fh('Aide-mémoire'));
  const AM = [
    ['La règle unique', ['**Tu lances sous une valeur.**','Ta valeur, c\u2019est ta caractéristique fois deux, plus ton bonus.','Hors combat d100, en combat d20 sous la même valeur divisée par cinq.','//01 à 05 réussite critique, 96 à 100 échec critique. Au d20 : 1 et 20 naturels.']],
    ['Ce qui compte, c\u2019est de combien tu rates', ['Marge de 1 à 10, au d20 de 1 à 2 : ça ne marche pas, rien de mauvais.','Marge de 11 à 30, au d20 de 3 à 6 : ça ne marche pas, et ça coûte.','Marge de 31 et plus, au d20 de 7 et plus : la situation empire.','//Rater le jet ne veut pas dire échouer.']],
    ['Quand l\u2019ennemi attaque', ['Il touche d\u2019office. C\u2019est toi qui lances, une seule réaction par round.','d20 sous Acrobatie divisée par cinq pour esquiver, sous Combat pour parer.','//Réussite : aucun dégât. Échec de moins de 4 : aucun dégât, mais tu n\u2019attaques pas au prochain round. Échec de 4 ou plus : tu prends les dégâts.']],
    ['Tomber à zéro', ['À 0 PV tu tombes, inconscient, tu ne joues plus.','Un allié peut te stabiliser pendant le combat : un soin, une fiole, un jet de Médecine.','//En groupe, personne ne l\u2019a fait avant la fin du combat : tu meurs. En solo, on tire ce qui t\u2019est arrivé pendant que tu n\u2019étais pas là.']],
    ['Ce que rend le repos', ['Court, une heure : 1d6 PV et 1d4 PC.','Long, une nuit complète : tous tes PV et tous tes PC.','//Le repos ne rend rien d\u2019autre : ce qu\u2019une Floraison t\u2019a fait ne part pas en dormant.']],
    ['Progression', ['Les points se gagnent en bouclant des missions. Le Havre annonce combien avant le départ.','Une compétence jusqu\u2019à +40 : 1 point par +1. De +41 à +60 : 2 points. Au-delà : 3 points.','Une Pratique de plus : 10 points, et quelqu\u2019un pour te l\u2019enseigner. Une caractéristique de +1 : 20 points, une fois chacune, plafond 18. +5 PV : 20 points.','//Il n\u2019y a pas de niveaux.']]
  ];
  const tam = el('table','fx am');
  for(let i = 0; i < AM.length; i += 2){
    const tr = el('tr');
    [AM[i], AM[i+1]].forEach(c => {
      const td = el('td','amc');
      if(!c){ tr.append(td); return; }
      td.append(el('div','lb', c[0]));
      c[1].forEach(line => {
        if(line.slice(0,2) === '**') td.append(el('p','amb', line.replace(/\*\*/g,'')));
        else if(line.slice(0,2) === '//') td.append(el('p','ami', line.slice(2)));
        else td.append(el('p', null, line));
      });
      tr.append(td);
    });
    tam.append(tr);
  }
  box.append(tam);
}
