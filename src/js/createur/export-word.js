/* ============ export Word (.docx) ============
   On ecrit l'OOXML a la main ; le zip et les parties fixes du paquet viennent de commun/docx.js.
   Aucune bibliotheque, aucun appel reseau. ============ */

/* ---------- briques OOXML ---------- */
const WC = {h1:'1F3D2B', h2:'2E5A3E', txt:'1A1A1A', lbl:'6B7469', fill:'F1F5F1', head:'E6EDE7', line:'C3D2C6'};
const WLARG = 10506;

function wr(txt, o){
  o = o || {};
  let pr = '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>';
  if(o.b) pr += '<w:b/>';
  if(o.i) pr += '<w:i/>';
  if(o.caps) pr += '<w:caps/>';
  pr += '<w:color w:val="' + (o.c || WC.txt) + '"/>';
  const sz = o.sz || 18;
  pr += '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/>';
  if(o.sp) pr += '<w:spacing w:val="' + o.sp + '"/>';
  return '<w:r><w:rPr>' + pr + '</w:rPr><w:t xml:space="preserve">' + echapperHtml(txt) + '</w:t></w:r>';
}
function wp(runs, o){
  o = o || {};
  let pr = '<w:spacing w:before="' + (o.before || 0) + '" w:after="' +
    (o.after === undefined ? 0 : o.after) + '" w:line="' + (o.line || 240) + '" w:lineRule="auto"/>';
  if(o.align) pr += '<w:jc w:val="' + o.align + '"/>';
  if(o.bord) pr += '<w:pBdr><w:bottom w:val="single" w:sz="' + o.bord.sz + '" w:space="' +
    o.bord.space + '" w:color="' + o.bord.c + '"/></w:pBdr>';
  return '<w:p><w:pPr>' + pr + '</w:pPr>' + (Array.isArray(runs) ? runs.join('') : runs) + '</w:p>';
}
function wlbl(txt){ return wp(wr(txt, {sz:13, caps:true, c:WC.lbl, sp:24}), {after:20}); }
function wvide(n, line){
  let s = '';
  for(let i = 0; i < (n || 1); i++) s += wp(wr('', {sz:18}), {line: line || 300});
  return s;
}
const BORD = 'w:val="single" w:sz="4" w:color="' + WC.line + '"';
function wtc(kids, larg, o){
  o = o || {};
  let pr = '<w:tcW w:w="' + larg + '" w:type="dxa"/>';
  if(o.span) pr += '<w:gridSpan w:val="' + o.span + '"/>';
  if(o.hautSeul) pr += '<w:tcBorders><w:top ' + BORD + '/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>';
  if(o.fill) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.fill + '"/>';
  pr += '<w:tcMar><w:top w:w="' + (o.mt === undefined ? 60 : o.mt) + '" w:type="dxa"/>' +
        '<w:left w:w="90" w:type="dxa"/><w:bottom w:w="' + (o.mb === undefined ? 60 : o.mb) + '" w:type="dxa"/>' +
        '<w:right w:w="90" w:type="dxa"/></w:tcMar>';
  return '<w:tc><w:tcPr>' + pr + '</w:tcPr>' + (Array.isArray(kids) ? kids.join('') : kids) + '</w:tc>';
}
function wtr(cells){ return '<w:tr>' + cells.join('') + '</w:tr>'; }
function wtbl(rows, larges){
  const total = larges.reduce((a, b) => a + b, 0);
  return '<w:tbl><w:tblPr><w:tblW w:w="' + total + '" w:type="dxa"/><w:tblLayout w:type="fixed"/>' +
    '<w:tblBorders><w:top ' + BORD + '/><w:left ' + BORD + '/><w:bottom ' + BORD + '/><w:right ' + BORD +
    '/><w:insideH ' + BORD + '/><w:insideV ' + BORD + '/></w:tblBorders>' +
    '<w:tblCellMar><w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
    '<w:tblGrid>' + larges.map(w => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' +
    rows.join('') + '</w:tbl>';
}
function wgap(h){ return '<w:p><w:pPr><w:spacing w:after="' + (h || 60) + '" w:line="20" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:sz w:val="4"/></w:rPr><w:t/></w:r></w:p>'; }
function wh2(txt){
  return wp(wr(txt, {sz:17, b:true, caps:true, c:WC.h1, sp:40}),
    {before:110, after:55, bord:{sz:6, space:3, c:WC.h1}});
}
function wnote(runs){ return wp(runs, {after:55}); }
function wtete(txt, larg, ctr){
  return wtc(wp(wr(txt, {sz:13, b:true, caps:true, c:WC.h1}), {align: ctr ? 'center' : undefined}),
    larg, {fill:WC.head, mt:30, mb:30});
}
/* une case remplie : intitule minuscule puis la valeur */
function wchamp(label, valeur, larg, o){
  o = o || {};
  const k = [];
  if(label) k.push(wlbl(label));
  const v = valeur == null || valeur === '' ? '–' : String(valeur);
  k.push(wp(wr(v, {sz:18}), {line:260}));
  return wtc(k, larg, {mb:40, fill:o.fill});
}

/* ---------- le document ---------- */
function docxCorps(){
  const p = PEUPLES[S.peuple], B = [];

  /* titre */
  B.push('<w:p><w:pPr><w:spacing w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>' +
    wr(S.nom ? 'Fiche de ' + S.nom : 'Fiche de personnage', {sz:40, b:true, c:WC.h1}).replace(/^<w:r>/,'<w:r>') + '</w:p>');
  B.push(wp(wr('Faelorenn · le jeu des Marchefleurs', {sz:17, i:true, c:WC.h2}),
    {after:140, bord:{sz:12, space:5, c:WC.h1}}));

  /* identite */
  B.push(wh2('Identité'));
  B.push(wtbl([wtr([
    wchamp('Nom', S.nom, 4206), wchamp('Peuple', S.peuple, 3150), wchamp('Voie', S.voie, 3150)
  ])], [4206, 3150, 3150]));
  B.push(wgap(60));
  B.push(wtbl([wtr([
    wchamp('Bannière · humains', S.peuple === 'Humains' ? S.sub.ban : null, 2626),
    wchamp('École ou Église · humains', S.peuple === 'Humains' ? S.sub.ecole : null, 2626),
    wchamp('Type · Ori’Ican', S.peuple === "Ori'Ican" ? S.sub.type : null, 2627),
    wchamp('Branche · Nyréens', S.peuple === 'Nyréens' ? S.sub.branche : null, 2627)
  ])], [2626, 2626, 2627, 2627]));

  /* ce que le peuple apporte */
  B.push(wh2('Ce que ton peuple apporte'));
  B.push(wtbl([wtr([
    wchamp('Caractéristique', bonusPeupleTxt(), 2626),
    wchamp('Traits chiffrés', p.traits, 3940),
    wchamp('Domaine et bonus', domCourt() ? domCourt() + (S.peuple === 'Humains' ? ' · +10 par son école' : ' · +20') : null, 1970),
    wchamp('Contrainte', p.contrainte, 1970)
  ])], [2626, 3940, 1970, 1970]));
  B.push(wgap(60));
  B.push(wtbl([wtr([
    wchamp('Compétence de peuple', p.comp || (S.peuple === 'Humains' && S.banComp ? S.banComp + ' (Bannière)' : null), 5253),
    wchamp('Armure que ton corps supporte', p.armure, 2626),
    wchamp('Ce que ton peuple ajoute au sac', paqPeuple(), 2627)
  ])], [5253, 2626, 2627]));

  /* caracteristiques */
  B.push(wh2('Caractéristiques'));
  B.push(wnote([
    wr('21 points à répartir. ', {sz:16, b:true, c:WC.h2}),
    wr('Elles démarrent à 8 et ne dépassent pas 15 à la création. Le bonus de peuple s’ajoute après. Plafond 18 en cours de jeu.', {sz:16, c:WC.lbl})
  ]));
  const cw = Math.floor(WLARG / 7), cws = [];
  for(let i = 0; i < 7; i++) cws.push(i === 6 ? WLARG - cw * 6 : cw);
  B.push(wtbl([
    wtr(CARS.map((c, i) => wtete(c, cws[i], true))),
    wtr(CARS.map((c, i) => wtc(wp(wr(String(carVal(c)), {sz:26, b:true, c:WC.h1}), {align:'center', line:300}), cws[i], {mt:46, mb:46}))),
    wtr(CARS.map((c, i) => {
      const v = carVal(c), m = near(v / 5);
      return wtc(wp(wr('×2 ' + (v * 2) + ' · mod ' + (m >= 0 ? '+' : '') + m, {sz:13, c:WC.lbl}), {align:'center', line:300}), cws[i], {mt:28, mb:36});
    }))
  ], cws));

  B.push(wgap(80));
  const dvw = [3502, 3502, 3502];
  const derive = (titre, sub, val, w) => wtc([
    wp(wr(titre, {sz:14, caps:true, b:true, c:WC.h1}), {align:'center', after:20}),
    wp(wr(sub, {sz:13, i:true, c:WC.lbl}), {align:'center', after:40}),
    wp(wr(String(val), {sz:24, b:true, c:WC.h1}), {align:'center', line:300})
  ], w, {fill:WC.fill});
  B.push(wtbl([wtr([
    derive('Points de vie', 'ta Constitution', pv(), dvw[0]),
    derive('Points de Contenance', 'la moitié de ta Contenance', pc(), dvw[1]),
    derive('Réduction d’armure', 'ta pièce, plus ton armure naturelle', p.red, dvw[2])
  ])], dvw));
  B.push(wp([
    wr('Ton mod, c’est ta caractéristique divisée par cinq. ', {sz:14, b:true, c:WC.h2}),
    wr('La même division que pour le d20, et un seul arrondi dans tout le jeu : vers le bas.', {sz:14, c:WC.lbl})
  ], {before:55}));

  /* competences */
  B.push(wh2(titreCompetences()));
  B.push(wnote([
    wr('100 points de bonus à répartir, aucune dépense au-dessus de +40 dans une compétence. Voie, peuple et trait s’ajoutent par-dessus. ', {sz:16, b:true, c:WC.h2}),
    wr('Total = caractéristique fois deux, plus le bonus. Le d20 est ce total divisé par cinq.', {sz:16, c:WC.lbl})
  ]));
  const SW = [3253, 700, 700, 600, 3253, 700, 700, 600];
  const plat = gs => { const o = []; gs.forEach(g => { o.push({head:g[0]}); g[1].forEach(s => o.push({skill:s})); }); return o; };
  const L = plat([['Force',SKILLS['Force']],['Dextérité',SKILLS['Dextérité']],['Intelligence',SKILLS['Intelligence']]]);
  const R = plat([['Sagesse',SKILLS['Sagesse']],['Charisme',SKILLS['Charisme']]]);
  R.push({note:'Constitution et Contenance n’ont aucune compétence.'});
  R.push({note:'La Contenance sert à lancer les Pratiques.'});

  const cote = (e, i0) => {
    if(!e) return [0,1,2,3].map(k => wtc(wp(wr('')), SW[i0 + k]));
    if(e.head) return [wtc(wp([
      wr(e.head, {sz:15, b:true, c:WC.h2}),
      wr('   base ×2 ' + (carVal(e.head) * 2), {sz:12, i:true, c:WC.lbl})
    ]), SW[i0], {span:4, fill:WC.fill, mt:28, mb:28})];
    if(e.note) return [wtc(wp(wr(e.note, {sz:13, i:true, c:WC.lbl})), SW[i0], {span:4, mt:32, mb:32})];
    const b = skBonus(e.skill), bo = (S.sk[e.skill]||0) + b.voie + b.trait, t = skTotal(e.skill);
    return [
      wtc(wp(wr(nomComp(e.skill), {sz:16})), SW[i0], {mt:32, mb:32}),
      wtc(wp(wr(bo ? '+' + bo : '', {sz:16}), {align:'center'}), SW[i0+1], {mt:32, mb:32}),
      wtc(wp(wr(String(t), {sz:16, b:true}), {align:'center'}), SW[i0+2], {mt:32, mb:32}),
      wtc(wp(wr(String(d20(t)), {sz:16}), {align:'center'}), SW[i0+3], {mt:32, mb:32})
    ];
  };
  const skRows = [wtr([
    wtete('Compétence', SW[0]), wtete('Bonus', SW[1], true), wtete('Total', SW[2], true), wtete('d20', SW[3], true),
    wtete('Compétence', SW[4]), wtete('Bonus', SW[5], true), wtete('Total', SW[6], true), wtete('d20', SW[7], true)
  ])];
  for(let i = 0; i < Math.max(L.length, R.length); i++) skRows.push(wtr(cote(L[i], 0).concat(cote(R[i], 4))));
  B.push(wtbl(skRows, SW));

  /* pratiques */
  B.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  B.push(wh2('Pratiques'));
  B.push(wnote([
    wr('L’attaque de base d’office, plus trois Pratiques choisies dans la liste de ton domaine. ', {sz:16, b:true, c:WC.h2}),
    wr('Une Pratique démarre à +20, ton peuple ajoute +20 sur son domaine, l’école d’un humain +10. Elle se lance sous sa caractéristique, celle qui est écrite à côté d’elle, fois deux, plus ce bonus, ou sous ta compétence de la même caractéristique si elle est plus haute. Ce qui n’a pas de cible hostile ne se lance pas, et une zone fait tester ceux qui sont dedans. Un échec consomme le PC, sauf l’attaque de base, qui ne coûte rien et se contente de rater.', {sz:16, c:WC.lbl})
  ]));
  B.push(wp([
    wr('La Sève, l’eau, la pierre, le vent et la Mue envoient de la matière : la réduction d’armure s’applique. ', {sz:14, c:WC.lbl}),
    wr('Le feu, l’onde, l’ombre et le sacré traversent les armures.', {sz:14, b:true, c:WC.h2})
  ], {before:10, after:90}));
  const pw = [2700, 1200, 700, 560, 5346];
  const ix = pratIndex();
  const noms = pratNoms();
  if(S.banComp) noms.push(S.banComp);
  const pRows = [wtr([
    wtete('Pratique', pw[0]), wtete('Se lance', pw[1], true), wtete('Valeur', pw[2], true),
    wtete('d20', pw[3], true), wtete('Ce qu’elle fait', pw[4])
  ])];
  noms.forEach(n => {
    const it = ix[n] || {}, v = pratValeur(it);
    const jet = v.val == null ? v.jet : ABR_JET[v.jet] + (v.par ? ' · ' + v.par : '');
    pRows.push(wtr([
      wtc(wp([wr(n, {sz:16, b:true}), wr(' (' + coutTxt(it) + ')', {sz:14, i:true, c:WC.lbl})]), pw[0], {mt:40, mb:40}),
      wtc(wp(wr(jet, {sz:14}), {align:'center'}), pw[1], {mt:40, mb:40}),
      wtc(wp(wr(v.val == null ? '–' : String(v.val), {sz:16, b:true}), {align:'center'}), pw[2], {mt:40, mb:40}),
      wtc(wp(wr(v.val == null ? '–' : String(d20(v.val)), {sz:16}), {align:'center'}), pw[3], {mt:40, mb:40}),
      wtc(wp(wr(it.d || '', {sz:14, c:WC.lbl}), {line:230}), pw[4], {mt:40, mb:40})
    ]));
  });
  for(let i = noms.length; i < 6; i++) pRows.push(wtr(pw.map(w => wtc(wp(wr('')), w, {mt:50, mb:50}))));
  B.push(wtbl(pRows, pw));

  /* armes */
  B.push(wh2('Armes'));
  B.push(wnote([wr('Dégâts = dé de l’arme + mod FOR, ou mod DEX pour une arme légère et l’arbalète, moins la réduction d’armure de la cible. Minimum 0. On retire la réduction, puis la contrainte du corps, et on arrondit vers le bas.', {sz:16, c:WC.lbl})]));
  const aw = [3400, 900, 6206];
  const armes = armesDuPaquetage();
  const aRows = [wtr([wtete('Arme', aw[0]), wtete('Dé', aw[1], true), wtete('Notes', aw[2])])];
  armes.forEach(a => aRows.push(wtr([
    wtc(wp(wr(a.nom, {sz:16})), aw[0], {mt:44, mb:44}),
    wtc(wp(wr(a.de, {sz:16, b:true}), {align:'center'}), aw[1], {mt:44, mb:44}),
    wtc(wp(wr(a.notes, {sz:14, c:WC.lbl})), aw[2], {mt:44, mb:44})
  ])));
  for(let i = armes.length; i < 5; i++) aRows.push(wtr(aw.map(w => wtc(wp(wr('')), w, {mt:48, mb:48}))));
  B.push(wtbl(aRows, aw));
  B.push(wp(wr('Légère d4 · à une main d6 · de guerre d8 · à deux mains d10 · arc court et arc de chasse d6 · arc long d8, et 12 en Force pour le bander · arbalète d8, une action pour recharger · lance ori’ican d8, d10 ou d12 selon les mues. On vise à la Dextérité, on blesse à la Force, sauf l’arme légère et l’arbalète qui blessent à la Dextérité.',
    {sz:14, i:true, c:WC.lbl}), {before:50}));

  /* armure */
  B.push(wh2('Armure et équipement'));
  B.push(wnote([
    wr('Chaque pièce a ses propres chiffres. ', {sz:16, b:true, c:WC.h2}),
    wr('Les réductions s’additionnent : ta pièce plus ton armure naturelle. Ton corps supporte ' +
      p.armure.charAt(0).toLowerCase() + p.armure.slice(1) + '.', {sz:16, c:WC.lbl})
  ]));
  const eq = [3400, 900, 6206];
  const eRows = [wtr([wtete('Pièce', eq[0]), wtete('Réduction', eq[1], true), wtete('Ce qu’elle coûte, ce qu’elle apporte', eq[2])])];
  let ne = 0;
  if(p.red){
    eRows.push(wtr([
      wtc(wp(wr('Ton armure naturelle', {sz:16})), eq[0], {mt:44, mb:44}),
      wtc(wp(wr(String(p.red), {sz:16, b:true}), {align:'center'}), eq[1], {mt:44, mb:44}),
      wtc(wp(wr(p.traits.split('·')[0].trim(), {sz:14, c:WC.lbl})), eq[2], {mt:44, mb:44})
    ]));
    ne = 1;
  }
  for(let i = ne; i < 5; i++) eRows.push(wtr(eq.map(w => wtc(wp(wr('')), w, {mt:48, mb:48}))));
  B.push(wtbl(eRows, eq));
  B.push(wp(wr('Cuir ou matelassé 1 · cuir clouté ou écailles 2, −10 Discrétion · maille 3, −10 Discrétion et Acrobatie · plates 4, −10 Discrétion et −20 Acrobatie · bouclier +1, occupe une main.',
    {sz:14, i:true, c:WC.lbl}), {before:50}));
  B.push(wgap(60));

  /* sac et bourse */
  const reste = resteDuSac();
  const sacK = [wlbl('Le reste du sac')];
  if(reste.length) reste.forEach(x => sacK.push(wp(wr('·  ' + x, {sz:18}), {line:260})));
  else sacK.push(wp(wr('–', {sz:18}), {line:260}));
  sacK.push(wvide(1, 260));
  B.push(wtbl([wtr([
    wtc(sacK, 7879, {mb:40}),
    wtc([wlbl('Bourse · ors et argents'), wp(wr(bourse(), {sz:24, b:true, c:WC.h1}), {align:'center', line:300})], 2627, {mb:40})
  ])], [7879, 2627]));

  /* page 3 */
  B.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');

  if(S.peuple === 'Cimérans'){
    B.push(wh2('La Charge'));
    B.push(wnote([
      wr('Une piste à part, à côté de tes PV. ', {sz:16, b:true, c:WC.h2}),
      wr('Capacité : tes PV maximum, soit ' + pv() + '. Tu portes automatiquement la moitié des dégâts d’un allié à dix pas, réduction déduite. Les soins n’y touchent pas. Au-delà de ta capacité tu passes en morne, et le surplus te rentre dedans en dégâts réels.', {sz:16, c:WC.lbl})
    ]));
    const chw = Math.floor(WLARG / 10), chws = [];
    for(let i = 0; i < 10; i++) chws.push(i === 9 ? WLARG - chw * 9 : chw);
    B.push(wtbl([wtr(chws.map(w => wtc(wp(wr('', {sz:20}), {align:'center'}), w, {mt:60, mb:60})))], chws));
    B.push(wp(wr('Se vider : Darguer, ou la dargue du festin, hors combat, trois convives au minimum. Un Ciméran seul ne se vide pas.',
      {sz:14, i:true, c:WC.lbl}), {before:50}));
  }

  /* notes */
  B.push(wh2('Notes'));
  B.push(wtbl([wtr([wtc(wvide(4, 300), WLARG, {mb:40})])], [WLARG]));

  /* aide-memoire */
  B.push(wh2('Aide-mémoire'));
  const AM = [
    ['La règle unique', [
      ['Tu lances sous une valeur.', {sz:16, b:true}],
      ['Ta valeur, c’est ta caractéristique fois deux, plus ton bonus.', {sz:15}],
      ['Hors combat d100, en combat d20 sous la même valeur divisée par cinq.', {sz:15}],
      ['01 à 05 réussite critique, 96 à 100 échec critique. Au d20 : 1 et 20 naturels.', {sz:14, i:true, c:WC.lbl}]]],
    ['Ce qui compte, c’est de combien tu rates', [
      ['Marge de 1 à 10, au d20 de 1 à 2 : ça ne marche pas, rien de mauvais.', {sz:15}],
      ['Marge de 11 à 30, au d20 de 3 à 6 : ça ne marche pas, et ça coûte.', {sz:15}],
      ['Marge de 31 et plus, au d20 de 7 et plus : la situation empire.', {sz:15}],
      ['Rater le jet ne veut pas dire échouer.', {sz:14, i:true, c:WC.lbl}]]],
    ['Quand l’ennemi attaque', [
      ['Il touche d’office. C’est toi qui lances, une seule réaction par round.', {sz:15}],
      ['d20 sous Acrobatie divisée par cinq pour esquiver, sous Combat pour parer.', {sz:15}],
      ['Réussite : aucun dégât. Échec de moins de 4 : aucun dégât, mais tu n’attaques pas au prochain round. Échec de 4 ou plus : tu prends les dégâts.', {sz:14, c:WC.lbl}]]],
    ['Tomber à zéro', [
      ['À 0 PV tu tombes, inconscient, tu ne joues plus.', {sz:15}],
      ['Un allié peut te stabiliser pendant le combat : un soin, une fiole, un jet de Médecine.', {sz:15}],
      ['En groupe, personne ne l’a fait avant la fin du combat : tu meurs. En solo, on tire ce qui t’est arrivé pendant que tu n’étais pas là.', {sz:14, c:WC.lbl}]]],
    ['Ce que rend le repos', [
      ['Court, une heure : 1d6 PV et 1d4 PC.', {sz:15}],
      ['Long, une nuit complète : tous tes PV et tous tes PC.', {sz:15}],
      ['Le repos ne rend rien d’autre : ce qu’une Floraison t’a fait ne part pas en dormant.', {sz:14, i:true, c:WC.lbl}]]],
    ['Progression', [
      ['Les points se gagnent en bouclant des missions. Le Havre annonce combien avant le départ.', {sz:15}],
      ['Une compétence jusqu’à +40 : 1 point par +1. De +41 à +60 : 2 points. Au-delà : 3 points.', {sz:15}],
      ['Une Pratique de plus : 10 points, et quelqu’un pour te l’enseigner. Une caractéristique de +1 : 20 points, une fois chacune, plafond 18. +5 PV : 20 points.', {sz:15}],
      ['Il n’y a pas de niveaux.', {sz:14, i:true, c:WC.lbl}]]]
  ];
  const amRows = [];
  for(let i = 0; i < AM.length; i += 2){
    amRows.push(wtr([AM[i], AM[i+1]].map(c => {
      if(!c) return wtc(wp(wr('')), 5253, {fill:WC.fill});
      const k = [wlbl(c[0])];
      c[1].forEach(l => k.push(wp(wr(l[0], l[1]), {line:262, before: l[1].i || l[1].c === WC.lbl ? 30 : 0})));
      return wtc(k, 5253, {fill:WC.fill, mb:60});
    })));
  }
  B.push(wtbl(amRows, [5253, 5253]));

  B.push('<w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="auto"/></w:pPr></w:p>');
  return B.join('');
}

function docxOctets(){
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + docxCorps() +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="700" w:right="700" w:bottom="600" w:left="700" w:header="0" w:footer="0" w:gutter="0"/>' +
    '</w:sectPr></w:body></w:document>';

  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr>' +
    '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/>' +
    '<w:color w:val="' + WC.txt + '"/><w:sz w:val="18"/><w:szCs w:val="18"/>' +
    '<w:lang w:val="fr-BE"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>' +
    '</w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '</w:styles>';

  const core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"' +
    ' xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    '<dc:title>' + echapperHtml(S.nom ? 'Fiche de ' + S.nom : 'Fiche de personnage') + '</dc:title>' +
    '<dc:creator>Faelorenn</dc:creator><cp:lastModifiedBy>Faelorenn</cp:lastModifiedBy>' +
    '</cp:coreProperties>';

  return docxPaquet(doc, styles, core);
}

/* la page hebergee tourne dans un cadre : le telechargement direct y est bloque,
   mais l'hote offre une capacite « downloads » qui, elle, marche. */
function estEncadre(){ try { return window.self !== window.top; } catch(e){ return true; } }

var DL;   /* undefined tant qu'on n'a pas demande, puis l'objet ou null */
function dispoTelechargement(){
  if(DL !== undefined) return Promise.resolve(DL);
  try {
    if(typeof claude === 'undefined' || !claude || typeof claude.use !== 'function'){
      DL = null; return Promise.resolve(null);
    }
    return claude.use('downloads').then(
      function(ns){ DL = ns || null; noteWord(); return DL; },
      function(){ DL = null; noteWord(); return null; }
    );
  } catch(e){ DL = null; return Promise.resolve(null); }
}

function nomFichier(){
  return (S.nom ? 'Fiche de ' + S.nom : 'Fiche de personnage').replace(/[\\/:*?"<>|]/g, ' ');
}

function noteWord(){
  const n = $('wordNote');
  if(!n) return;
  n.textContent = (DL === null && estEncadre())
    ? 'L\u2019export donne un vrai .docx, mis en page comme la fiche du livre. Le téléchargement est bloqué depuis cette page-ci : utilise « Copier pour Word », puis Coller dans un document vide. Depuis le fichier posé sur ton ordinateur, le bouton Word télécharge directement.'
    : 'L\u2019export donne un vrai .docx, mis en page comme la fiche du livre, modifiable dans Word. « Copier pour Word » sert à coller la fiche dans un document qui existe déjà.';
}

var minuterie;
function direWord(t, ms){
  const btn = $('word');
  btn.textContent = t;
  clearTimeout(minuterie);
  minuterie = setTimeout(function(){ btn.textContent = 'Exporter en Word'; }, ms || 2200);
}

function exporterWord(){
  const nom = nomFichier() + '.docx';
  let bytes;
  try { bytes = docxOctets(); }
  catch(e){ direWord('Export impossible', 3000); return; }
  const blob = new Blob([bytes], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  direWord('Préparation\u2026', 14000);

  dispoTelechargement().then(function(ns){
    if(ns){
      ns.save({filename: nom, data: blob}).then(
        function(){ direWord('Fichier enregistré'); },
        function(err){
          const c = err && err.code;
          direWord(c === 'declined' ? 'Annulé' : c === 'rate_limited' ? 'Réessaie dans un instant' : 'Enregistrement refusé', 2800);
        }
      );
      return;
    }
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nom; a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); }, 4000);
      const enc = estEncadre();
      direWord(enc ? 'Bloqué ici : voir ci-dessous' : 'Fichier envoyé', enc ? 3200 : 2200);
    } catch(e){ direWord('Export impossible', 3000); }
  });
}

/* repli : on met la fiche mise en forme dans le presse-papiers, a coller dans Word */
function copierPourWord(){
  const btn = $('wcopy');
  const dire = (t, ms) => { btn.textContent = t; setTimeout(() => { btn.textContent = 'Copier pour Word'; }, ms || 2000); };
  const css = texteDesFeuilles();
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' + echapperHtml(nomFichier()) + '</title>' +
    '<style>@page{size:A4;margin:11mm}body{font-family:Cambria,Georgia,serif}' + css + '</style></head>' +
    '<body>' + $('fiche').outerHTML + '</body></html>';
  try {
    navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], {type:'text/html'}),
      'text/plain': new Blob([$('fiche').innerText], {type:'text/plain'})
    })]).then(() => dire('Copié, colle dans Word'), () => dire('Copie refusée', 2600));
  } catch(e){
    dire('Copie refusée', 2600);
  }
}

if(typeof module !== 'undefined' && module.exports) module.exports = {docxOctets: () => docxOctets()};
