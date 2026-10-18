/* ============ la fiche imprimable, calquee sur le Word ============
   Une seule mise en page pour le Registre du Havre (le personnage en création, createur/fiche-imprimable.js)
   et pour les Marchefleurs (le personnage tel qu'il est à la table, registre/marchefleurs.js). Chacun prépare
   une description de sa fiche, avec ses chiffres et ses textes à lui ; ficheDuWord la dessine, avec les textes
   fixes du livre qui valent pour les deux. Le style est dans src/css/commun/fiche-du-word.css.
   Les noms commencent par fw (ou FW_) : le module rejoint le paquet registre, qui a déjà beaucoup de noms.
   Il s'appuie sur el(), et sur SKILLS, nomComp et titreCompetences (commun/), que les deux paquets ont. */

/* ---- les briques ---- */
function fwSection(txt){ return el('h3','fh', txt); }
function fwNote(gras, reste){
  const p = el('p','fnote');
  if(gras) p.append(el('b', null, gras + ' '));
  if(reste) p.append(document.createTextNode(reste));
  return p;
}
function fwPetit(txt, gras){
  const p = el('p','fsm');
  p.append(document.createTextNode(txt));
  if(gras) p.append(el('b', null, ' ' + gras));
  return p;
}
function fwChamp(label, valeur, largeur){
  const td = el('td','fd');
  if(largeur) td.style.width = largeur;
  if(label) td.append(el('div','lb', label));
  const v = el('div','vl');
  String(valeur == null || valeur === '' ? '–' : valeur).split('\n').forEach((ligne, i) => {
    if(i) v.append(el('br'));
    v.append(document.createTextNode(ligne));
  });
  td.append(v); return td;
}
function fwColonnes(t, largeurs){
  const cg = el('colgroup');
  largeurs.forEach(w => { const c = el('col'); c.style.width = w; cg.append(c); });
  t.append(cg); return t;
}
function fwRangee(cellules){ const t = el('table','fx'), tr = el('tr'); cellules.forEach(c => tr.append(c)); t.append(tr); return t; }
/* des lignes vides, pour écrire à la main : un tableau en a toujours au moins `jusque` */
function fwLignesVides(t, depuis, jusque, nCol){
  for(let i = depuis; i < jusque; i++){
    const tr = el('tr'); for(let j = 0; j < nCol; j++) tr.append(el('td','vide')); t.append(tr);
  }
}
/* divisé par cinq, et un seul arrondi dans tout le jeu : vers le bas. Le mod d'une caractéristique, le d20 d'une valeur */
function fwSurCinq(v){ return Math.floor(v / 5); }

/* ---- les textes fixes, les mêmes sur les deux fiches ---- */
const FW_MOD = 'Ton mod, c’est ta caractéristique divisée par cinq. La même division que pour le d20, et un seul arrondi dans tout le jeu : vers le bas.';
const FW_MATIERE = ['La Sève, l’eau, la pierre, le vent et la Mue envoient de la matière : la réduction d’armure s’applique.', 'Le feu, l’onde, l’ombre et le sacré traversent les armures.'];
const FW_DEGATS = 'Dégâts = dé de l’arme + mod FOR, ou mod DEX pour une arme légère et l’arbalète, moins la réduction d’armure de la cible. Minimum 0. On retire la réduction, puis la contrainte du corps, et on arrondit vers le bas.';
const FW_ARMES = 'Légère d4 · à une main d6 · de guerre d8 · à deux mains d10 · arc court et arc de chasse d6 · arc long d8, et 12 en Force pour le bander · arbalète d8, une action pour recharger · lance ori’ican d8, d10 ou d12 selon les mues. On vise à la Dextérité, on blesse à la Force, sauf l’arme légère et l’arbalète qui blessent à la Dextérité.';
const FW_ARMURES = 'Cuir ou matelassé 1 · cuir clouté ou écailles 2, −10 Discrétion · maille 3, −10 Discrétion et Acrobatie · plates 4, −10 Discrétion et −20 Acrobatie · bouclier +1, occupe une main.';
/* l'aide-mémoire : ** pour une ligne en gras, // pour une ligne en italique */
const FW_AIDE_MEMOIRE = [
  ['La règle unique', ['**Tu lances sous une valeur.**','Ta valeur, c’est ta caractéristique fois deux, plus ton bonus.','Hors combat d100, en combat d20 sous la même valeur divisée par cinq.','//01 à 05 réussite critique, 96 à 100 échec critique. Au d20 : 1 et 20 naturels.']],
  ['Ce qui compte, c’est de combien tu rates', ['Marge de 1 à 10, au d20 de 1 à 2 : ça ne marche pas, rien de mauvais.','Marge de 11 à 30, au d20 de 3 à 6 : ça ne marche pas, et ça coûte.','Marge de 31 et plus, au d20 de 7 et plus : la situation empire.','//Rater le jet ne veut pas dire échouer.']],
  ['Quand l’ennemi attaque', ['Il touche d’office. C’est toi qui lances, une seule réaction par round.','d20 sous Acrobatie divisée par cinq pour esquiver, sous Combat pour parer.','//Réussite : aucun dégât. Échec de moins de 4 : aucun dégât, mais tu n’attaques pas au prochain round. Échec de 4 ou plus : tu prends les dégâts.']],
  ['Tomber à zéro', ['À 0 PV tu tombes, inconscient, tu ne joues plus.','Un allié peut te stabiliser pendant le combat : un soin, une fiole, un jet de Médecine.','//En groupe, personne ne l’a fait avant la fin du combat : tu meurs. En solo, on tire ce qui t’est arrivé pendant que tu n’étais pas là.']],
  ['Ce que rend le repos', ['Court, une heure : 1d6 PV et 1d4 PC.','Long, une nuit complète : tous tes PV et tous tes PC.','//Le repos ne rend rien d’autre : ce qu’une Floraison t’a fait ne part pas en dormant.']],
  ['Progression', ['Les points se gagnent en bouclant des missions. Le Havre annonce combien avant le départ.','Une compétence jusqu’à +40 : 1 point par +1. De +41 à +60 : 2 points. Au-delà : 3 points.','Une Pratique de plus : 10 points, et quelqu’un pour te l’enseigner. Une caractéristique de +1 : 20 points, une fois chacune, plafond 18. +5 PV : 20 points.','//Il n’y a pas de niveaux.']]
];

/* ---- la fiche ----
   box reçoit la fiche ; d la décrit :
     nom, joueur          le titre, et qui le joue ('' : personne)
     identite             {peuple, voie, banniere, ecole, type, branche} : null quand ça ne le concerne pas
     apport               les deux rangées de « Ce que ton peuple apporte » : [[libellé, valeur, largeur], …]
     car                  {Force:12, …} : les sept caractéristiques, bonus compris
     noteCar              [gras, suite] au-dessus des caractéristiques, ou null
     derivees             [[libellé, d'où ça vient, valeur], …] : PV, PC et réduction
     noteComp, comp       [gras, suite], et {nom de la compétence: {bonus:'+5', total:34}}
     notePrat, pratiques  [gras, suite], et [{nom, cout, lance, valeur, effet}] : valeur null pour ce qui ne se lance pas,
                          lance dit alors seulement ce qu'il en est
     armes                [{nom, de, notes}]
     noteArmure, pieces   la suite de « Chaque pièce a ses propres chiffres. », et [[nom, réduction, ce qu'elle apporte]]
     titreSac, sac, bourse  le libellé du sac, ses lignes, et le texte de la bourse
     charge               la capacité de la Charge (les PV maximum) pour un Ciméran, sinon null
     notes                le texte du cadre Notes ('' : vide, pour écrire à la main) */
function ficheDuWord(box, d){
  const ident = d.identite;

  /* ---------- titre ---------- */
  box.append(el('div','ft', d.nom ? 'Fiche de ' + d.nom : 'Fiche de personnage'));
  box.append(el('div','fsub', 'Faelorenn · le jeu des Marchefleurs' + (d.joueur ? ' · joué par ' + d.joueur : '')));

  /* ---------- identite ---------- */
  box.append(fwSection('Identité'));
  box.append(fwRangee([fwChamp('Nom', d.nom, '40%'), fwChamp('Peuple', ident.peuple, '30%'), fwChamp('Voie', ident.voie, '30%')]));
  box.append(fwRangee([
    fwChamp('Bannière · humains', ident.banniere, '25%'),
    fwChamp('École ou Église · humains', ident.ecole, '25%'),
    fwChamp('Type · Ori’Ican', ident.type, '25%'),
    fwChamp('Branche · Nyréens', ident.branche, '25%')
  ]));

  /* ---------- ce que le peuple apporte ---------- */
  box.append(fwSection('Ce que ton peuple apporte'));
  d.apport.forEach(r => box.append(fwRangee(r.map(x => fwChamp(x[0], x[1], x[2])))));

  /* ---------- caracteristiques ---------- */
  box.append(fwSection('Caractéristiques'));
  if(d.noteCar) box.append(fwNote(d.noteCar[0], d.noteCar[1]));
  const tc = el('table','fx car');
  const r1 = el('tr'), r2 = el('tr'), r3 = el('tr');
  CARS.forEach(c => {
    r1.append(el('th', null, c));
    const v = d.car[c], m = fwSurCinq(v);
    r2.append(el('td','big2', String(v)));
    r3.append(el('td','sub2', '×2 ' + (v * 2) + ' · mod ' + (m >= 0 ? '+' : '') + m));
  });
  tc.append(r1, r2, r3); box.append(tc);

  const td2 = el('table','fx der'), rd = el('tr');
  d.derivees.forEach(x => {
    const td = el('td','dv');
    td.append(el('div','lb', x[0]), el('div','dvs', x[1]), el('div','big2', String(x[2])));
    rd.append(td);
  });
  td2.append(rd); box.append(td2);
  box.append(fwPetit(FW_MOD));

  /* ---------- competences : deux colonnes, chaque caractéristique avec les siennes ---------- */
  box.append(fwSection(titreCompetences()));
  box.append(fwNote(d.noteComp[0], d.noteComp[1]));
  const groupe = cs => { const o = []; cs.forEach(c => { o.push({head:c}); SKILLS[c].forEach(s => o.push({skill:s})); }); return o; };
  const L = groupe(['Force','Dextérité','Intelligence']), R = groupe(['Sagesse','Charisme']);
  R.push({note:'Constitution et Contenance n’ont aucune compétence.'}, {note:'La Contenance sert à lancer les Pratiques.'});
  const ts = el('table','fx sk');
  fwColonnes(ts, ['23%','9%','9%','9%','23%','9%','9%','9%']);
  const hr = el('tr');
  ['Compétence','Bonus','Total','d20','Compétence','Bonus','Total','d20'].forEach((h, i) => hr.append(el('th', i % 4 ? 'c' : null, h)));
  ts.append(hr);
  const cote = (e, tr) => {
    if(!e){ for(let i = 0; i < 4; i++) tr.append(el('td')); return; }
    if(e.head){
      const td = el('td','grp'); td.colSpan = 4;
      td.append(el('b', null, e.head), el('i', null, '  base ×2 ' + (d.car[e.head] * 2)));
      tr.append(td); return;
    }
    if(e.note){ const td = el('td','nte', e.note); td.colSpan = 4; tr.append(td); return; }
    const k = d.comp[e.skill];
    tr.append(el('td', null, nomComp(e.skill)), el('td','c', k.bonus), el('td','c b', String(k.total)), el('td','c', String(fwSurCinq(k.total))));
  };
  for(let i = 0; i < Math.max(L.length, R.length); i++){
    const tr = el('tr'); cote(L[i], tr); cote(R[i], tr); ts.append(tr);
  }
  box.append(ts);

  /* ---------- pratiques ---------- */
  box.append(el('div','brk'));
  box.append(fwSection('Pratiques'));
  box.append(fwNote(d.notePrat[0], d.notePrat[1]));
  box.append(fwPetit(FW_MATIERE[0], FW_MATIERE[1]));
  const tp = el('table','fx prt'); fwColonnes(tp, ['21%','12%','8%','7%','52%']);
  const hp = el('tr');
  ['Pratique','Se lance','Valeur','d20','Ce qu’elle fait'].forEach((h, i) => hp.append(el('th', i > 0 && i < 4 ? 'c' : null, h)));
  tp.append(hp);
  d.pratiques.forEach(p => {
    const tr = el('tr'), td = el('td');
    td.append(el('b', null, p.nom), el('i', null, ' (' + p.cout + ')'));
    tr.append(td);
    if(p.valeur == null) tr.append(el('td','c', p.lance), el('td','c', '–'), el('td','c', '–'));
    else tr.append(el('td','c', p.lance), el('td','c b', String(p.valeur)), el('td','c', String(fwSurCinq(p.valeur))));
    tr.append(el('td','de', p.effet || ''));
    tp.append(tr);
  });
  fwLignesVides(tp, d.pratiques.length, 5, 5);
  box.append(tp);

  /* ---------- armes ---------- */
  box.append(fwSection('Armes'));
  box.append(fwNote('', FW_DEGATS));
  const ta = el('table','fx arm'); fwColonnes(ta, ['32%','8%','60%']);
  const ha = el('tr');
  ['Arme','Dé','Notes'].forEach((h, i) => ha.append(el('th', i === 1 ? 'c' : null, h)));
  ta.append(ha);
  d.armes.forEach(a => {
    const tr = el('tr');
    tr.append(el('td', null, a.nom), el('td','c b', a.de), el('td','de', a.notes));
    ta.append(tr);
  });
  fwLignesVides(ta, d.armes.length, 4, 3);
  box.append(ta);
  box.append(fwPetit(FW_ARMES));

  /* ---------- armure et equipement ---------- */
  box.append(fwSection('Armure et équipement'));
  box.append(fwNote('Chaque pièce a ses propres chiffres.', d.noteArmure));
  const tq = el('table','fx arm'); fwColonnes(tq, ['30%','14%','56%']);
  const hq = el('tr');
  ['Pièce','Réduction','Ce qu’elle coûte, ce qu’elle apporte'].forEach((h, i) => hq.append(el('th', i === 1 ? 'c' : null, h)));
  tq.append(hq);
  d.pieces.forEach(p => {
    const tr = el('tr');
    tr.append(el('td', null, p[0]), el('td','c b', p[1]), el('td','de', p[2] || ''));
    tq.append(tr);
  });
  fwLignesVides(tq, d.pieces.length, 4, 3);
  box.append(tq);
  box.append(fwPetit(FW_ARMURES));

  /* ---------- sac et bourse ---------- */
  const tsac = el('table','fx'), trs = el('tr');
  const tdS = el('td','fd'); tdS.style.width = '75%';
  tdS.append(el('div','lb', d.titreSac));
  if(d.sac.length){
    const ul = el('ul','sac');
    d.sac.forEach(x => ul.append(el('li', null, x)));
    tdS.append(ul);
  } else tdS.append(el('div','vl', '–'));
  const tdB = el('td','fd'); tdB.style.width = '25%';
  tdB.append(el('div','lb', 'Bourse · ors et argents'), el('div','big2', d.bourse));
  trs.append(tdS, tdB); tsac.append(trs); box.append(tsac);

  /* ---------- la charge, cimerans seulement ; sinon la page se tourne avant les notes ---------- */
  box.append(el('div','brk'));
  if(d.charge != null){
    box.append(fwSection('La Charge'));
    box.append(fwNote('Une piste à part, à côté de tes PV.', 'Capacité : tes PV maximum, soit ' + d.charge + '. Tu portes automatiquement la moitié des dégâts d’un allié à dix pas, réduction déduite. Les soins n’y touchent pas. Au-delà de ta capacité tu passes en morne, et le surplus te rentre dedans en dégâts réels.'));
    const tch = el('table','fx chg'), rch = el('tr');
    for(let i = 0; i < 10; i++) rch.append(el('td','vide'));
    tch.append(rch); box.append(tch);
    box.append(fwPetit('Se vider : Darguer, ou la dargue du festin, hors combat, trois convives au minimum. Un Ciméran seul ne se vide pas.'));
  }

  /* ---------- notes ---------- */
  box.append(fwSection('Notes'));
  const tn = el('table','fx'), rn = el('tr'), tdn = el('td','fd notes');
  if(d.notes) d.notes.split('\n').forEach((l, i) => { if(i) tdn.append(el('br')); tdn.append(document.createTextNode(l)); });
  rn.append(tdn); tn.append(rn); box.append(tn);

  /* ---------- aide-memoire ---------- */
  box.append(fwSection('Aide-mémoire'));
  const tam = el('table','fx am');
  for(let i = 0; i < FW_AIDE_MEMOIRE.length; i += 2){
    const tr = el('tr');
    [FW_AIDE_MEMOIRE[i], FW_AIDE_MEMOIRE[i + 1]].forEach(c => {
      const td = el('td','amc');
      if(!c){ tr.append(td); return; }
      td.append(el('div','lb', c[0]));
      c[1].forEach(ligne => {
        if(ligne.slice(0, 2) === '**') td.append(el('p','amb', ligne.replace(/\*\*/g, '')));
        else if(ligne.slice(0, 2) === '//') td.append(el('p','ami', ligne.slice(2)));
        else td.append(el('p', null, ligne));
      });
      tr.append(td);
    });
    tam.append(tr);
  }
  box.append(tam);
  return box;
}
