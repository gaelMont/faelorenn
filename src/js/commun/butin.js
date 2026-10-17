/* ============ le butin, Livre VI ============
   Un d20 pour la rareté, puis un d20 dans la table qu'il désigne. L'endroit décale le premier dé.
   Les objets uniques ne se tirent pas : on les pose. Tables recopiées du livre (Faelorenn_11). */
const BUTIN = {
  rarete: [{de:-99, a:12, k:'courant', l:'Courant'}, {de:13, a:18, k:'rare', l:'Rare'}, {de:19, a:99, k:'precieux', l:'Précieux'}],
  endroits: [
    {k:'pauvre', l:'Sur un bandit, une bête, un pauvre', m:-5},
    {k:'officier', l:'Sur un officier, dans une réserve, dans un Havre', m:0},
    {k:'avant', l:'Dans une ruine de l’Avant, sur un corps de Marchefleur', m:5}
  ],
  tables: {
 "courant": [
  {
   "de": 1,
   "a": 2,
   "t": "Fiole de Havre entamée. Rends 1d6 PV, une seule dose."
  },
  {
   "de": 3,
   "a": 4,
   "t": "Cuir dépareillé. Réduction 1. Il ne va à personne : −5 Discrétion tant que tu le portes."
  },
  {
   "de": 5,
   "a": 6,
   "t": "Dague ébréchée. d4. Sur un 20 naturel, elle casse pour de bon."
  },
  {
   "de": 7,
   "a": 8,
   "t": "Flèches, 1d6. Récupérables après le combat, sauf celles d'un critique."
  },
  {
   "de": 9,
   "a": 9,
   "t": "Pot de braises presque vide. Une flambée, pas deux."
  },
  {
   "de": 10,
   "a": 10,
   "t": "Poudre d'écorce, une pincée. Réduction 1 pendant un combat."
  },
  {
   "de": 11,
   "a": 11,
   "t": "Corde de dix pas, usée. Elle porte un homme. Deux, elle casse."
  },
  {
   "de": 12,
   "a": 12,
   "t": "Sifflet de garde. S'entend à trois cents pas. Par tout le monde."
  },
  {
   "de": 13,
   "a": 13,
   "t": "Peau huilée. Ce qu'elle enveloppe reste sec, quoi qu'il arrive."
  },
  {
   "de": 14,
   "a": 14,
   "t": "Craie de mineur, un bâton. Marque ce que la pluie n'efface pas."
  },
  {
   "de": 15,
   "a": 15,
   "t": "Clé de service d'un Havre. Lequel, c'est une autre affaire."
  },
  {
   "de": 16,
   "a": 16,
   "t": "Registre de tournée, à moitié brûlé. Une information vraie sur la région, au choix de l'Oracle."
  },
  {
   "de": 17,
   "a": 17,
   "t": "Collets, une douzaine. Prennent du gibier. Prennent aussi une jambe."
  },
  {
   "de": 18,
   "a": 18,
   "t": "Loupe de verre, fêlée. Lit les traces fines. La fêlure dédouble ce qu'on regarde."
  },
  {
   "de": 19,
   "a": 19,
   "t": "Bourse de 1d10 argents. Elle porte un nom brodé."
  },
  {
   "de": 20,
   "a": 20,
   "t": "Rien, et des traces de quelqu'un qui est passé avant toi."
  }
 ],
 "rare": [
  {
   "de": 1,
   "a": 2,
   "t": "Maille de la Bannière du Sang. Réduction 3. Elle porte leurs couleurs : on te prend pour eux, en bien comme en mal."
  },
  {
   "de": 3,
   "a": 4,
   "t": "Bouclier de gué. +1 de réduction, et il flotte : il porte une personne sur l'eau."
  },
  {
   "de": 5,
   "a": 6,
   "t": "Éclat de totem. Rend 1 PC, une seule fois, puis la pierre est morte."
  },
  {
   "de": 7,
   "a": 8,
   "t": "Lanterne sourde de bonne facture. Catalyseur de poche pour un Nïhr, et son volet ne grince pas."
  },
  {
   "de": 9,
   "a": 10,
   "t": "Arc à double courbure. d6, mais sa portée est doublée."
  },
  {
   "de": 11,
   "a": 11,
   "t": "Lame de chitine trouvée. Arme légère, d4. Si l'Élytris dont elle vient la reconnaît, il la reprend."
  },
  {
   "de": 12,
   "a": 12,
   "t": "Gourde de combat nyréenne. Compte comme une source d'eau Ordinaire, même en plein désert."
  },
  {
   "de": 13,
   "a": 13,
   "t": "Fil ancien, une bobine entière. De quoi monter un rouet zhern, ou 8 ors à leur école."
  },
  {
   "de": 14,
   "a": 14,
   "t": "Onction d'Ysse en fiole scellée. Un allié ne tombe pas sous 1 PV pendant le prochain combat."
  },
  {
   "de": 15,
   "a": 15,
   "t": "Sceau de péage de l'Or. Tu passes gratuitement, et ceux qui te suivent aussi. Il est nominatif, et ce n'est pas ton nom."
  },
  {
   "de": 16,
   "a": 16,
   "t": "Arme de guerre bien tenue. d8, et les critiques ne l'ébrèchent jamais."
  },
  {
   "de": 17,
   "a": 17,
   "t": "Trousse de Secouriste complète. Annule le malus de soin sans matériel, pour tout le groupe."
  },
  {
   "de": 18,
   "a": 18,
   "t": "Encre ori'ican. Une marque tracée avec tient un mois, et ne part ni à l'eau ni au feu."
  },
  {
   "de": 19,
   "a": 19,
   "t": "Carte de racines. Le tracé entre trois Havres, dessiné par un Écorcien. Il n'y a pas de nord dessus."
  },
  {
   "de": 20,
   "a": 20,
   "t": "Cuir clouté taillé pour toi. Réduction 2, sans le malus de Discrétion."
  }
 ],
 "precieux": [
  {
   "de": 1,
   "a": 2,
   "t": "Lampe de l'Avant. Lumière froide qui ne s'éteint pas. Se vide en une saison, se remplit en une saison passée en région instable. Catalyseur installé pour un Zhern."
  },
  {
   "de": 3,
   "a": 4,
   "t": "Plates de la Bordure. Réduction 4, mais le trou n'a jamais été rebouché : réduction 3 tant que personne ne les répare."
  },
  {
   "de": 5,
   "a": 6,
   "t": "Lance lourde marquée. d12. Chaque encoche du manche est un mort. Il y en a onze."
  },
  {
   "de": 7,
   "a": 8,
   "t": "Bague de Scelleur. Tu poses un sceau par jour comme un Scelleur de l'Or, sans rien y connaître."
  },
  {
   "de": 9,
   "a": 10,
   "t": "Cœur de braise. Un Ilvès qui le porte puise au-delà de sa Contenance sans payer de PV, une fois par jour."
  },
  {
   "de": 11,
   "a": 12,
   "t": "Fiole des Eaux. La fiole-âme d'un Nyréen mort. Boire la Mémoire dessus rend sa dernière journée, entière."
  },
  {
   "de": 13,
   "a": 14,
   "t": "Graine écorcienne. Plantée, il en sort un Écorcien identique à celui qui l'a semée, avec ses souvenirs. Personne ne sait quoi en faire."
  },
  {
   "de": 15,
   "a": 16,
   "t": "Carnet d'un Marchefleur mort. Trois Floraisons dedans que personne n'a traitées, avec leur position."
  },
  {
   "de": 17,
   "a": 18,
   "t": "Deux lames appariées. Armes légères, d4 chacune. Qui porte les deux frappe deux fois par round, et ne peut porter aucun bouclier."
  },
  {
   "de": 19,
   "a": 19,
   "t": "Objet de l'Avant. Personne ne sait ce qu'il fait. L'Oracle non plus, tant qu'on ne l'a pas essayé."
  },
  {
   "de": 20,
   "a": 20,
   "t": "Quelque chose de vivant."
  }
 ]
}
};

/* ---------- une table de butin écrite à la main : une ligne par objet ----------
   « 1-2 Une dent en or », « 3. Une corde », « 4 : rien » sont numérotées, et le dé va jusqu'au plus grand numéro ;
   sans numéros, chaque ligne a la même chance. Un nombre seul devant un objet, « 5 Un couteau », est un numéro
   quand la table en a d'autres, ou quand les nombres montent depuis 1 ; sinon, « 2 crocs de loup », une quantité. */
const NUMERO_BUTIN = /^(\d{1,3})(?:\s*(?:-|à|\u2013)\s*(\d{1,3}))?\s*([.:)\-\u2013])?\s*/;
function lireTableButin(texte){
  const brutes = String(texte || '').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 200)
    .map(l => { const m = NUMERO_BUTIN.exec(l); return {l:l, m:m, net:!!(m && (m[2] || m[3]))}; });
  const nus = brutes.some(x => x.m && !x.net);
  const monte = brutes.length > 1 && brutes.every(x => x.m) && brutes.every((x, i) => i === 0 ? +x.m[1] === 1 : +x.m[1] > +(brutes[i - 1].m[2] || brutes[i - 1].m[1]));
  const nusNumeros = nus && (brutes.some(x => x.net) || monte);
  const lignes = brutes.map(x => {
    if(x.m && (x.net || nusNumeros)){ const de = +x.m[1], a = +(x.m[2] || x.m[1]); return {de:Math.min(de, a), a:Math.max(de, a), t:x.l.slice(x.m[0].length).trim()}; }
    return {de:null, a:null, t:x.l};
  });
  const numerotee = lignes.length > 0 && lignes.every(p => p.de != null);
  const de = numerotee ? Math.max.apply(null, lignes.map(p => p.a)) : lignes.length;
  const avis = [];
  if(numerotee && de <= 1000){
    const vides = [], doubles = [];
    for(let v = 1; v <= de; v++){
      const n = lignes.filter(p => v >= p.de && v <= p.a).length;
      if(!n) vides.push(v); else if(n > 1) doubles.push(v);
    }
    const plage = l => l.length > 6 ? l.slice(0, 6).join(', ') + '…' : l.join(', ');
    if(vides.length) avis.push(vides.length > 1 ? 'Rien aux ' + plage(vides) + ' : ces numéros ne donnent rien.' : 'Rien au ' + vides[0] + ' : ce numéro ne donne rien.');
    if(doubles.length) avis.push(doubles.length > 1 ? 'Les ' + plage(doubles) + ' tombent sur deux lignes : la première l’emporte.' : 'Le ' + doubles[0] + ' tombe sur deux lignes : la première l’emporte.');
  } else if(lignes.some(p => p.de != null)) avis.push('Certaines lignes sont numérotées, d’autres pas : on tire une ligne au hasard.');
  return {lignes:lignes, numerotee:numerotee, de:de, avis:avis};
}
/* tirer dans une table : le dé du site, ou celui qu'on a lancé sur la table (v) */
function tirerTableButin(texte, v){
  const t = lireTableButin(texte);
  if(!t.lignes.length) return null;
  const x = v != null ? v : 1 + Math.floor(Math.random() * t.de);
  const p = t.numerotee ? t.lignes.find(y => x >= y.de && x <= y.a) : t.lignes[x - 1];
  return {v:x, de:t.de, t:p ? p.t : '', numerotee:t.numerotee};
}
