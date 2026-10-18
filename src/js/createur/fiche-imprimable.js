/* ============ la fiche imprimable, calquee sur le Word ============
   La mise en page et les textes du livre sont dans commun/fiche-du-word.js, partagés avec les Marchefleurs ;
   ici, ce que la création met dessus. */

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

/* la fiche du personnage en création : ce que la création donne, et les règles de la création à côté */
function drawFiche(){
  const box = $('fiche'); box.innerHTML = '';
  const p = PEUPLES[S.peuple];
  const humain = S.peuple === 'Humains';

  const comp = {};
  Object.keys(SKILLS).forEach(c => SKILLS[c].forEach(s => {
    const b = skBonus(s), tot = (S.sk[s]||0) + b.voie + b.trait;
    comp[s] = {bonus: tot ? '+' + tot : '', total: skTotal(s)};
  }));

  const ix = pratIndex();
  const lignes = pratNoms();
  if(S.banComp) lignes.push(S.banComp);
  const pratiques = lignes.map(n => {
    const it = ix[n] || {}, v = pratValeur(it);
    return {nom:n, cout:coutTxt(it), effet:it.d,
      lance: v.val == null ? v.jet : ABR_JET[v.jet] + (v.par ? ' · ' + v.par : ''), valeur:v.val};
  });

  const car = {};
  CARS.forEach(c => car[c] = carVal(c));

  ficheDuWord(box, {
    nom: S.nom, joueur: '',
    identite: {peuple:S.peuple, voie:S.voie,
      banniere: humain ? S.sub.ban : null, ecole: humain ? S.sub.ecole : null,
      type: S.peuple === "Ori'Ican" ? S.sub.type : null, branche: S.peuple === 'Nyréens' ? S.sub.branche : null},
    apport: [
      [['Caractéristique', bonusPeupleTxt(), '25%'],
       ['Traits chiffrés', p.traits, '37%'],
       ['Domaine et bonus', domCourt() ? domCourt() + (humain ? ' · +10 par son école' : ' · +20') : null, '19%'],
       ['Contrainte', p.contrainte, '19%']],
      [['Compétence de peuple', p.comp || (humain && S.banComp ? S.banComp + ' (Bannière)' : null), '50%'],
       ['Armure que ton corps supporte', p.armure, '25%'],
       ['Ce que ton peuple ajoute au sac', paqPeuple(), '25%']]
    ],
    car: car,
    noteCar: ['21 points à répartir.', 'Elles démarrent à 8 et ne dépassent pas 15 à la création. Le bonus de peuple s’ajoute après. Plafond 18 en cours de jeu.'],
    derivees: [['Points de vie','ta Constitution', pv()],
      ['Points de Contenance','la moitié de ta Contenance', pc()],
      ['Réduction d’armure','ta pièce, plus ton armure naturelle', p.red]],
    noteComp: ['100 points de bonus à répartir, aucune dépense au-dessus de +40 dans une compétence. Voie, peuple et trait s’ajoutent par-dessus.', 'Total = caractéristique fois deux, plus le bonus. Le d20 est ce total divisé par cinq.'],
    comp: comp,
    notePrat: ['L’attaque de base d’office, plus trois Pratiques choisies dans la liste de ton domaine.',
      'Une Pratique démarre à +20, ton peuple ajoute +20 sur son domaine, l’école d’un humain +10. Elle se lance sous sa caractéristique, celle qui est écrite à côté d’elle, fois deux, plus ce bonus, ou sous ta compétence de la même caractéristique si elle est plus haute. Ce qui n’a pas de cible hostile ne se lance pas, et une zone fait tester ceux qui sont dedans. Un échec consomme le PC, sauf l’attaque de base, qui ne coûte rien et se contente de rater.'],
    pratiques: pratiques,
    armes: armesDuPaquetage(),
    noteArmure: 'Les réductions s’additionnent : ta pièce plus ton armure naturelle. Ton corps supporte ' + p.armure.charAt(0).toLowerCase() + p.armure.slice(1) + '.',
    pieces: p.red ? [['Ton armure naturelle', String(p.red), p.traits.split('·')[0].trim()]] : [],
    titreSac: 'Le reste du sac', sac: resteDuSac(), bourse: bourse(),
    charge: S.peuple === 'Cimérans' ? pv() : null,
    notes: ''
  });
}
