/* ============ le tableau du Havre : les missions ============
   Le matin, au Havre, les missions se distribuent (Livre I). Chacune annonce avant le départ ce qu'elle paie et ce
   qu'elle rapporte en points de progression (Livre V) : c'est sur ça qu'on choisit. « Partir » la lance dans la
   table : une séance neuve avec l'annonce, ses visages dans le Registre des Visages, sa rencontre prête à tirer.
   Les missions vivent dans le fichier de la table. Cinq exemples, un par genre de mission, restent au tableau
   tant qu'on ne les a pas retirés ; retouché, un exemple devient une mission à soi. */

const EXEMPLES_MISSIONS = [
  {id:'m-ex-mine', genre:'observer', titre:'La mine qui se tait',
    qui:'Josse, un pilleur de ruines', demande:'Cartographier une zone sourde', ou:'Une mine, la vieille mine de Gaud',
    annonce:'/Josse est passé au Havre hier soir, les bottes encore grises de poussière. Au fond de la vieille mine de Gaud, il a trouvé une galerie où plus aucune Pratique ne répond : une zone sourde, qui n’était sur aucun relevé. Il veut un plan, galerie par galerie, avant que d’autres s’y risquent. Le Havre paie le plan et rien d’autre : on observe, on note, on rentre.',
    pnj:[{nom:'Josse', role:'pilleur de ruines', peuple:'Humain', attitude:'neutre', texte:'Il connaît la mine mieux qu’il ne le dit.'},
      {nom:'Ombeline', role:'garde le puits d’entrée', peuple:'Humain', attitude:'mefiant', texte:'Elle n’aime pas les pilleurs, et ne cache pas ce qu’elle pense de Josse.'}],
    rencontre:{inten:'esc', fam:'bete', note:'Des rats de ruine dans les galeries hautes.'},
    complication:'Il y a des enfants : ceux du hameau jouent dans les galeries du haut, et connaissent des passages que Josse ignore.',
    cache:'Le lieu recouvre une ruine de l’Avant : la zone sourde vient d’une salle murée sous la galerie.',
    notes:'Dans une zone sourde, aucune Pratique ne fonctionne (Livre I). Ce que Josse veut vraiment savoir, c’est si la salle vaut qu’on la pille.'},
  {id:'m-ex-col', genre:'escorter', titre:'Le péage du col',
    qui:'Dargal, pour un clan ciméran de passage', demande:'Négocier un passage', ou:'Un col de montagne, sur la route du Massif',
    annonce:'Un clan ciméran campe depuis six jours au pied du col, avec ses chariots et ses bêtes. Le poste de péage de l’Or a triplé son tarif la semaine dernière, sans un mot d’explication, et /Dargal, qui mène le clan, refuse de payer ce qu’il appelle un vol. Il demande au Havre quelqu’un qui parle aux deux côtés, avant que ses jeunes tentent de passer de force.',
    pnj:[{nom:'Dargal', role:'mène le clan', peuple:'Ciméran', attitude:'mefiant', texte:'Il ne paiera pas le triple. Le double, peut-être, s’il ne perd pas la face.'},
      {nom:'Estève', role:'tient le poste de péage de l’Or', peuple:'Humain', attitude:'neutre', texte:'Il applique un ordre qu’il n’a pas écrit, et il le sait.'},
      {nom:'Belda', role:'une jeune du clan', peuple:'Ciméran', attitude:'hostile', texte:'Elle veut passer de force cette nuit, avec trois autres.'}],
    rencontre:{inten:'ser', fam:'soldat', note:'Les gardes du péage, si ça tourne mal.'},
    complication:'Le péage a triplé.',
    cache:'Le prix demandé n’est qu’un prétexte : l’Or veut garder le col fermé tant que ses gens n’ont pas relevé une Floraison, plus haut.',
    notes:'Un péage de l’Or coûte d’ordinaire 1 argent par personne et 5 par charrette (Livre V).'},
  {id:'m-ex-verger', genre:'releve', titre:'Le verger qui fleurit en hiver',
    qui:'Maline, pour un village sans Havre', demande:'Trouver ce qui la nourrit', ou:'Un hameau de la Plaine',
    annonce:'Un messager vaellen a porté la lettre jusqu’au Havre. Au hameau, un verger fleurit et donne des fruits en plein hiver, depuis deux saisons. Le hameau vit de ces fruits ; mais trois anciens ne se réveillent plus qu’à midi, et les chiens refusent d’approcher des arbres. /Maline, qui a écrit la lettre, demande un relevé complet, les six réponses, avant que le hameau se déchire pour de bon.',
    pnj:[{nom:'Maline', role:'a écrit la lettre au Havre', peuple:'Humain', attitude:'amical', texte:'Son père est un des trois anciens.'},
      {nom:'Perrot', role:'possède le verger', peuple:'Humain', attitude:'mefiant', texte:'Le verger l’a enrichi en deux hivers.'},
      {nom:'Dorn', role:'un ancien qui ne se réveille plus qu’à midi', peuple:'Humain', attitude:'inconnu', texte:'Le père de Maline.'}],
    rencontre:{inten:'esc', fam:'floraison', note:'Des chiens de ferme altérés rôdent autour du verger, la nuit.'},
    complication:'La Floraison est utile à quelqu’un : Perrot vend les fruits d’hiver jusqu’à la ville.',
    cache:'Quelqu’un la nourrit exprès : chaque automne, Perrot enterre au pied du plus vieil arbre des pierres rapportées d’une région instable.',
    notes:'Le relevé, c’est six réponses (Livre II, La Tournée) : le registre, le cran, le centre, la description, le problème, l’avantage. Chaque réponse coûte un jour sur place, la description deux. L’avantage ne se lance pas : il se demande aux gens.'},
  {id:'m-ex-mousse', genre:'erosion', titre:'La mousse au pied de l’arbre-mère',
    qui:'Ton Havre, sur le relevé d’une autre équipe', demande:'Éteindre une Floraison', ou:'Au pied d’un arbre-mère, sous la canopée',
    annonce:'Le relevé est revenu complet, six réponses sur six, et le Havre a tranché : la mousse grise qui monte au pied de l’arbre-mère de la Maison Oswenthe doit s’éteindre avant la fructification. Elle gagne une main d’écorce par jour. /Thelysse, qui tient le registre de la Maison, attend l’équipe sous la canopée. La fructification est dans vingt jours, peut-être moins.',
    pnj:[{nom:'Thelysse', role:'tient le registre de la Maison Oswenthe', peuple:'Élytris', attitude:'amical', texte:'Elle a demandé l’Érosion, et elle a peur de ce qu’elle coûtera à l’arbre.'},
      {nom:'Braenn', role:'veille le pied de l’arbre, la nuit', peuple:'Élytris', attitude:'neutre', texte:'Il a vu la mousse avancer. Il a vu autre chose aussi, qu’il n’a pas mis au relevé.'},
      {nom:'Kerenthe', role:'une ancienne de la Maison', peuple:'Élytris', attitude:'mefiant', texte:'Elle ne veut pas qu’on touche au pied de l’arbre, relevé ou pas.'}],
    rencontre:{inten:'ser', fam:'floraison', note:'Ce que la mousse fait sortir de terre quand on coupe ce qui la nourrit.'},
    complication:'Le délai est deux fois trop court : la fructification avance.',
    cache:'Elle protège l’endroit de pire qu’elle : sous la mousse, une seconde condensation dort entre les racines. L’éteindre la réveille.',
    notes:'Une Érosion ne détruit rien : on coupe ce qui nourrit la Floraison, et on attend qu’elle s’éteigne (Livre I). Le premier Mot est tenu : la menace est prouvée par le relevé.'},
  {id:'m-ex-rouve', genre:'personne', titre:'Le mot de Sans-Havre',
    qui:'Rouve, qu’on appelait Sans-Havre, par un mot laissé', demande:'Ramener un corps', ou:'En plein dans une région instable',
    annonce:'Le mot est épinglé au tableau depuis trois semaines, et personne ne l’a pris. Il est de la main de /Rouve, qu’on appelait Sans-Havre, parti seul il y a deux saisons : une carte, le nom d’un rocher, et une phrase, « ramenez-moi, je ne peux plus marcher ». Le Havre paie quinze ors à qui ramènera le corps. Personne ne sait comment le mot est arrivé là.',
    pnj:[{nom:'Rouve', role:'Marchefleur parti seul, disparu depuis deux saisons', peuple:'Humain', attitude:'inconnu', texte:'On l’appelait Sans-Havre.'},
      {nom:'Lisenne', role:'faisait équipe avec Rouve', peuple:'Humain', attitude:'mefiant', texte:'Elle jure que Rouve ne partait jamais seul.'},
      {nom:'Naran', role:'le messager qui a porté le mot', peuple:'Vaellen', attitude:'neutre', texte:'Il dit l’avoir reçu d’un inconnu, à la bordure.'}],
    rencontre:{inten:'mor', fam:'floraison', note:'La région instable ne laisse pas repartir ceux qui y entrent.'},
    complication:'La zone passe en air mort : plus un souffle, et un Vaellen n’y vole plus.',
    cache:'Le disparu est mort avant la demande : le mot a été écrit après sa mort. Par qui, et pour attirer qui ?',
    notes:'Personne ne l’a prise, et la paie le dit. Cinquième Mot : jamais seul devant le seuil. Rouve est parti seul.'}
];

/* le tableau est à tout le monde ; les missions en cours et les finies sont celles de la campagne qu'on suit */
function missionsDeLaVue(){
  const cid = idCourante();
  return toutesMissions().filter(m => m.etat === 'tableau' || idCampagneMission(m) === cid);
}
/* vue : le tableau, les missions en cours, celles qui sont finies. Les boutons à deux temps : partir, retirer,
   boucler, tomber à l'eau, rouvrir */
const MIS = {vue:'tableau', lire:'', ed:null, edAvant:'', nouvelle:false, exemple:false, arme:{}, minuteur:null, mjOuvert:{}};

/* ---------- les missions : les tiennes, et les exemples qu'on n'a ni retouchés ni retirés ---------- */
function toutesMissions(){
  const m = {};
  EXEMPLES_MISSIONS.forEach(x => { m[x.id] = Object.assign(normMission(x), {id:x.id, exemple:true}); });
  Object.keys(T.missions).forEach(id => { m[id] = T.missions[id]; });
  return Object.keys(m).map(id => m[id]).filter(x => x && !x.supprime);
}
function uneMission(id){ return id ? toutesMissions().find(x => x.id === id) || null : null; }
const genreDe = m => MISSIONS.find(g => g.k === m.genre) || MISSIONS[1];
const PEUPLES_UN = ['Humain','Élytris','Nyréen',"Ori'Ican",'Ciméran','Ilvès','Vaellen','Écorcien'];
const ptsTxt = n => n + ' point' + (n > 1 ? 's' : '');
const paieTxt = m => [m.paie, ptsTxt(m.points)].filter(Boolean).join(' · ');
const numSeance = sid => { const e = sid && T.journal[sid]; return e && !e.supprime ? (e.seance || '?') : ''; };
/* la mission qui se joue à la table : celle de la séance qu'on regarde, sinon la dernière lancée, dans la campagne qu'on suit */
function missionEnCours(){
  const cid = idCourante();
  const l = toutesMissions().filter(m => m.etat === 'cours' && idCampagneMission(m) === cid).sort((a, b) => b.lancee - a.lancee);
  const e = seanceCourante();
  return (e && l.find(m => m.seance === e.id)) || l[0] || null;
}
/* la séance d'aujourd'hui : la plus récente, là où s'écrit la fin d'une mission */
const derniereSeance = () => seances()[0] || null;
function noterDans(e, texte, type){
  if(!e) return '';
  const b = normBloc({id:nouvelId('b'), maj:maintenant(), seance:e.id, ordre:maintenant(), type:type, texte:texte, auteur:MOI.joueur || ''});
  T.blocs[b.id] = b;
  return b.id;
}
function rencontreTxt(r){
  if(!r || (!r.inten && !r.fam)) return '';
  const i = INTENSITES.find(x => x.k === r.inten), f = r.fam ? famille(r.fam) : null;
  /* une famille maison que ce navigateur ne connaît pas encore, ou qu'on a retirée du bestiaire */
  return [i ? i.l : '', f ? f.l : (r.fam ? (TIR.complet ? 'une famille retirée du bestiaire' : 'une famille maison') : '')].filter(Boolean).join(', ');
}
/* un bouton à deux temps : le premier clic arme, le second agit ; cinq secondes pour se décider.
   Le bouton garde la main au clavier après le redessin */
function armer(cle, redessiner, id){
  clearTimeout(MIS.minuteur);
  MIS.arme = {}; MIS.arme[cle] = true; redessiner();
  const x = id && $(id); if(x) x.focus();
  MIS.minuteur = setTimeout(() => { if(MIS.arme[cle]){ delete MIS.arme[cle]; redessiner(); const y = id && $(id); if(y && document.activeElement === document.body) y.focus(); } }, 5000);
}

/* ---------- le tableau ---------- */
function dessinerMissions(force){
  const box = $('misBox'); if(!box) return;
  majOutilsMissions();
  dessinerLireMission(force);
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerMissions(true)); return; }
  box.innerHTML = '';
  const tous = missionsDeLaVue();
  const garde = {tableau: m => m.etat === 'tableau', cours: m => m.etat === 'cours', finies: m => m.etat === 'bouclee' || m.etat === 'ratee'};
  const l = tous.filter(garde[MIS.vue] || garde.tableau);
  const rang = m => MISSIONS.findIndex(g => g.k === m.genre);
  if(MIS.vue === 'cours') l.sort((a, b) => b.lancee - a.lancee);
  else if(MIS.vue === 'finies') l.sort((a, b) => b.finie - a.finie);
  else l.sort((a, b) => (rang(a) - rang(b)) || (a.titre || '').localeCompare(b.titre || '', 'fr'));
  if(!l.length){
    const chez = plusieursCampagnes() && MIS.vue !== 'tableau' ? ' dans « ' + nomCampagne(idCourante()) + ' »' : '';
    box.append(el('p','vide', MIS.vue === 'cours' ? 'Aucune mission en cours' + chez + '. « Partir » sur une mission du tableau la lance dans la table.'
      : MIS.vue === 'finies' ? 'Aucune mission finie' + chez + ' pour l’instant, ni bouclée, ni tombée à l’eau.'
      : 'Le tableau est vide. « Nouvelle mission » pour en écrire une, « Tirer une mission » pour le générateur du livre.'));
    return;
  }
  l.forEach(m => box.append(carteMission(m)));
}
function majOutilsMissions(){
  const tous = missionsDeLaVue();
  const n = {tableau: tous.filter(m => m.etat === 'tableau').length, cours: tous.filter(m => m.etat === 'cours').length,
    finies: tous.filter(m => m.etat === 'bouclee' || m.etat === 'ratee').length};
  [['misVueTableau','tableau','Au tableau'], ['misVueCours','cours','En cours'], ['misVueFinies','finies','Finies']].forEach(([id, v, lab]) => {
    const b = $(id); if(!b) return;
    b.textContent = lab + (n[v] ? ' · ' + n[v] : '');
    b.setAttribute('aria-pressed', MIS.vue === v ? 'true' : 'false');
  });
}
function carteMission(m){
  const g = genreDe(m);
  const w = el('article','mcarte g-' + g.k + (m.etat !== 'tableau' ? ' e-' + m.etat : ''));
  w.setAttribute('data-mission', m.id);
  const haut = el('div','mhaut');
  haut.append(el('span','mgenre', g.l), el('span','mpaie', paieTxt(m)));
  w.append(haut);
  const t = el('h3','mtitre', m.titre || 'Sans titre');
  if(m.exemple) t.append(el('span','mex', 'exemple'));
  w.append(t);
  w.append(commandeMission(m));
  if(m.annonce){ const p = el('p','mannonce'); p.append(texteRiche(extrait(m.annonce, 200))); w.append(p); }
  const bas = [];
  if(m.pnj.length) bas.push('Visages : ' + m.pnj.map(p => p.nom).join(', '));
  const r = rencontreTxt(m.rencontre);
  if(r) bas.push('Rencontre : ' + r);
  if(bas.length) w.append(el('p','mini mbas', bas.join(' · ')));
  const et = etatMissionTxt(m);
  if(et) w.append(el('p','metat', et));
  w.append(actionsMission(m, () => dessinerMissions(true)));
  return w;
}
function commandeMission(m){
  const dl = el('dl','mcmd');
  [['Qui demande', m.qui], ['Ce qu’on demande', m.demande], ['Où', m.ou]].forEach(([lab, v]) => {
    if(!v) return;
    const dd = el('dd'); dd.append(texteRiche(v));
    dl.append(el('dt', null, lab), dd);
  });
  return dl;
}
function etatMissionTxt(m){
  const s = numSeance(m.seance), f = numSeance(m.fin);
  if(m.etat === 'cours') return 'En cours' + (s ? ', depuis la séance ' + s : '');
  if(m.etat === 'bouclee') return 'Bouclée' + (f ? ' à la séance ' + f : '') + (m.points && m.gagnants ? ' · ' + ptsTxt(m.points) + (m.gagnants > 1 ? ' à chacun' : ' donnés') : '');
  if(m.etat === 'ratee') return 'Tombée à l’eau' + (f ? ' à la séance ' + f : '');
  return '';
}
/* les boutons d'une mission, selon où elle en est. pre : « mis- » sur le tableau, « misl- » dans la mission lue en entier */
function actionsMission(m, redessiner, pre){
  pre = pre || 'mis-';
  const act = el('div','pact');
  const cle = k => k + ':' + m.id;
  const b = (txt, fn, cls, id) => { const x = el('button','btn ' + (cls || 'ghost') + ' sm', txt); x.type = 'button'; if(id) x.id = id; x.onclick = fn; act.append(x); return x; };
  const deux = (k, txt, arme, fn, cls) => {
    const a = !!MIS.arme[cle(k)], id = pre + k + '-' + m.id;
    return b(a ? arme : txt, () => { if(a){ clearTimeout(MIS.minuteur); MIS.arme = {}; fn(); } else armer(cle(k), redessiner, id); }, a ? 'ghost danger' : cls, id);
  };
  let note = '';
  if(MIS.lire !== m.id) b('Lire', () => {
    MIS.lire = m.id; dessinerMissions(true);
    const l = $('misLire'); if(l){ l.scrollIntoView({block:'start', behavior:'smooth'}); const h = l.querySelector('.gnom'); if(h) h.focus({preventScroll:true}); }
  }, null, pre + 'lire-' + m.id);
  if(m.etat === 'tableau'){
    const d = seanceDeDepart(), chez = plusieursCampagnes() ? ' de « ' + nomCampagne(idCourante()) + ' »' : '';
    deux('partir', 'Partir', 'Confirmer : séance ' + d.e.seance + ' dans la table' + chez, () => lancerMission(m.id), 'plein');
    if(MIS.arme[cle('partir')]) note = (d.neuve ? 'Une séance neuve (' + d.e.seance + ') s’ouvre dans la table' + chez : 'La séance ' + d.e.seance + ', encore vide' + chez + ', reçoit la mission')
      + ' : le matin au Havre, l’annonce, la mission encadrée' + (m.pnj.length ? ' ; ses visages arrivent dans le Registre des Visages' : '')
      + (m.rencontre.inten || m.rencontre.fam ? ' ; sa rencontre est prête à tirer dans « En face »' : '') + '.';
    b('Modifier', () => ouvrirEditeurMission(m, false), null, pre + 'modif-' + m.id);
    deux('suppr', 'Retirer', 'Confirmer', () => retirerMission(m.id));
  } else if(m.etat === 'cours'){
    b('À la table', () => ouvrirPage('table.html#mission=' + encodeURIComponent(m.id), ONGLET_TABLE), null, pre + 'table-' + m.id);
    const cid = idCampagneMission(m), n = persosDe(cid).length, e = seancesDe(cid)[0] || null;
    const ou = e ? ' ; la séance ' + (e.seance || '?') + ', la plus récente, le note.' : '.';
    deux('boucler', 'La boucler', 'Confirmer : ' + (m.points && n ? ptsTxt(m.points) + (n > 1 ? ' à chacun' : '') : 'bouclée'), () => bouclerMission(m.id, true), 'plein');
    /* la paie va dans la bourse de chacun, comme les points (Livre V : un Marchefleur est payé à la mission) */
    const paie = argentsDe(m.paie);
    const gains = [m.points ? ptsTxt(m.points) + ' de progression' : '', paie ? texteArgent(paie) + ' dans sa bourse' : ''].filter(Boolean).join(' et ');
    if(MIS.arme[cle('boucler')]) note = (gains && n ? (n > 1 ? 'Chacun des ' + n + ' personnages de la table' : 'Le personnage de la table') + ' gagne ' + gains : 'Elle est bouclée') + ou;
    deux('ratee', 'Tombée à l’eau', 'Confirmer', () => bouclerMission(m.id, false));
    if(MIS.arme[cle('ratee')]) note = 'Elle est tombée à l’eau, sans points' + ou;
    b('Modifier', () => ouvrirEditeurMission(m, false), null, pre + 'modif-' + m.id);
    deux('tableau', 'Remettre au tableau', 'Confirmer', () => remettreMission(m.id));
    if(MIS.arme[cle('tableau')]) note = 'Elle revient au tableau ; la séance et ce qui s’y est écrit restent.';
  } else {
    deux('rouvrir', 'Rouvrir', 'Confirmer', () => rouvrirMission(m.id));
    const paye = paieDonnee(m), pts = m.etat === 'bouclee' && m.gagnants;
    if(MIS.arme[cle('rouvrir')]) note = 'Elle repasse en cours' + (pts && paye ? ' ; les points et la paie qu’elle a donnés sont repris, même s’ils ont été dépensés'
      : pts ? ' ; les points qu’elle a donnés sont repris, même s’ils ont été dépensés' : paye ? ' ; la paie qu’elle a donnée est reprise, même dépensée' : '') + ', et sa ligne dans la séance s’efface.';
    deux('suppr', 'Retirer', 'Confirmer', () => retirerMission(m.id));
  }
  if(!note) return act;
  const w = el('div');
  w.append(act, el('p','mini mnote', note));
  return w;
}

/* ---------- une mission, en entier ---------- */
function dessinerLireMission(force){
  const box = $('misLire'); if(!box) return;
  const m = MIS.lire ? uneMission(MIS.lire) : null;
  if(!m){ MIS.lire = ''; box.hidden = true; box.innerHTML = ''; return; }
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerLireMission(true)); return; }
  const g = genreDe(m);
  box.hidden = false; box.innerHTML = '';
  box.className = 'card mlire g-' + g.k;
  box.setAttribute('aria-label', 'La mission « ' + (m.titre || 'Sans titre') + ' »');
  const t = el('div','gtete');
  const h = el('h3','gnom', m.titre || 'Sans titre'); h.tabIndex = -1;
  t.append(h, el('span','espace'));
  const fer = el('button','btn ghost sm','Fermer'); fer.type = 'button'; fer.id = 'misLireFermer';
  fer.onclick = () => { MIS.lire = ''; dessinerMissions(true); };
  t.append(fer);
  box.append(t);
  box.append(el('p','mhaut mhaut-l', g.l + ' · ' + paieTxt(m)));
  const et = etatMissionTxt(m);
  if(et) box.append(el('p','metat', et));
  const corps = el('div','gcorps mcorps');
  const cote = el('div','gcote'), lire = el('div','glire');
  corps.append(lire, cote);
  box.append(corps);

  lire.append(el('h4','glab', 'La commande'));
  lire.append(commandeMission(m));
  lire.append(el('h4','glab', 'L’annonce'));
  if(m.annonce){ const a = el('p','mtexte'); a.append(texteRiche(m.annonce)); lire.append(a); }
  else lire.append(el('p','mini', 'Rien d’écrit. « Modifier » pour l’écrire : c’est ce qu’on lit à la table en partant.'));

  cote.append(el('h4','glab', 'Ses visages'));
  if(!m.pnj.length) cote.append(el('p','mini', 'Personne de prévu.'));
  m.pnj.forEach(p => {
    const w = el('div','mvisage');
    const n = el('p','mvnom');
    const deja = refParNom(p.nom);
    n.append(el('b', null, p.nom));
    const qui = [p.role, p.peuple].filter(Boolean).join(' · ');
    if(qui) n.append(document.createTextNode(' · ' + qui));
    w.append(n);
    const s = [libelle(ATTITUDES, p.attitude).toLowerCase(), p.texte].filter(Boolean).join(' · ');
    if(s) w.append(el('p','mini', s));
    if(deja) w.append(el('p','mini', 'Cette personne a déjà sa fiche : c’est elle qui servira, ses cases vides se rempliront.'));
    cote.append(w);
  });
  cote.append(el('h4','glab', 'La rencontre prévue'));
  const r = rencontreTxt(m.rencontre);
  cote.append(el('p','mini', r ? r + (m.rencontre.note ? ' · ' + m.rencontre.note : '') : (m.rencontre.note || 'Rien de prévu : on tire à la table, au besoin.')));

  const mj = el('details','mmj');
  mj.open = !!MIS.mjOuvert[m.id];
  mj.ontoggle = () => { MIS.mjOuvert[m.id] = mj.open; };
  mj.append(el('summary', null, 'Côté MJ'));
  [['La complication', m.complication], ['Ce qui est caché', m.cache], ['Notes', m.notes]].forEach(([lab, v]) => {
    if(!v) return;
    mj.append(el('p','mjlab', lab));
    const p = el('p','mtexte'); p.append(texteRiche(v)); mj.append(p);
  });
  if(!m.complication && !m.cache && !m.notes) mj.append(el('p','mini', 'Rien d’écrit.'));
  lire.append(mj);
  box.append(actionsMission(m, () => dessinerMissions(true), 'misl-'));
}

/* ---------- partir : la mission entre dans la table ---------- */
/* la séance qui la reçoit : la plus récente si elle est encore vide et sans titre, une neuve sinon */
function seanceDeDepart(){
  const l = seances(), d = l[0];
  if(d && !(d.titre || '').trim() && !blocsDe(d.id).length) return {e:d, neuve:false};
  const n = l.length ? Math.floor(Math.max.apply(null, l.map(e => parseFloat(e.seance) || 0))) + 1 : 1;
  return {e:rattacher({id:idSeance(n), maj:maintenant(), supprime:false, seance:String(n), date:aujourdhui(), titre:'', texte:'', auteur:MOI.joueur || ''}), neuve:true};
}
function encadreMission(m){
  return [m.titre || 'La mission', m.qui ? 'Qui demande : ' + m.qui : '', m.demande ? 'Ce qu’on demande : ' + m.demande : '',
    m.ou ? 'Où : ' + m.ou : '', 'Paie : ' + [m.paie, ptsTxt(m.points) + ' de progression'].filter(Boolean).join(', ')].filter(Boolean).join('\n');
}
function lancerMission(id){
  const m = uneMission(id); if(!m || m.etat !== 'tableau') return;
  const d = seanceDeDepart();
  let num = '';
  changer(() => {
    const e = Object.assign({}, d.e, {titre:m.titre || d.e.titre, date:aujourdhui(), maj:maintenant()});
    T.journal[e.id] = e; num = e.seance;
    MOI.seance = e.id; MOI.seanceFixee = false;
    /* ses visages : une fiche pour chacun, sauf pour qui en a déjà une */
    m.pnj.forEach(x => {
      const ref = refParNom(x.nom);
      if(!ref){
        const p = creerPnj(x.nom, e.id);
        Object.assign(p, {role:x.role, peuple:x.peuple, texte:x.texte, attitude:x.attitude, lieu:m.ou, maj:maintenant()});
        return;
      }
      /* une fiche qui existe déjà (un personnage, ou un PNJ cité plus tôt) : on ne remplit que ses cases vides */
      if(ref.indexOf('pnj:') !== 0) return;
      const p = T.pnj[ref.slice(4)], v = {};
      [['role', x.role], ['peuple', x.peuple], ['texte', x.texte], ['lieu', m.ou]].forEach(([k, val]) => { if(val && !String(p[k] || '').trim()) v[k] = val; });
      if(p.attitude === 'inconnu' && x.attitude !== 'inconnu') v.attitude = x.attitude;
      if(Object.keys(v).length) T.pnj[p.id] = Object.assign({}, p, v, {maj:maintenant()});
    });
    /* le récit s'ouvre : le matin au Havre, l'annonce, puis la mission telle qu'elle est affichée */
    let o = maintenant();
    const bloc = (type, texte) => {
      if(!String(texte || '').trim()) return;
      const b = normBloc({id:nouvelId('b'), maj:maintenant(), seance:e.id, ordre:o++, type:type, qui:{k:'mj', id:'', nom:''}, texte:texte, auteur:MOI.joueur || ''});
      T.blocs[b.id] = b;
    };
    bloc('scene', 'Le matin, au Havre.');
    bloc('narration', m.annonce);
    bloc('encadre', encadreMission(m));
    T.missions[m.id] = Object.assign(normMission(m), {id:m.id, etat:'cours', seance:e.id, lancee:maintenant(), fin:'', finie:0, bloc:'', gagnants:0, maj:maintenant(), majEtat:maintenant()});
  });
  preparerRencontre(m);
  MIS.lire = '';
  dessinerMissions(true);
  msgTable('« ' + (m.titre || 'La mission') + ' » est lancée : séance ' + num + ' dans la table' + (plusieursCampagnes() ? ' de « ' + nomCampagne(idCourante()) + ' »' : '') + '.', true);
  ouvrirPage('table.html#mission=' + encodeURIComponent(m.id), ONGLET_TABLE);
}
/* la rencontre prévue : le tirage de la table la prend, dans ce navigateur. Ce qui était déjà tiré reste */
function preparerRencontre(m){
  const r = m.rencontre || {};
  if(!r.inten && !r.fam) return false;
  lireTirage();
  if(r.inten) S.inten = r.inten;
  S.fam = r.fam ? [r.fam] : [];
  garderTirage();
  return true;
}

/* ---------- la fin : bouclée, tombée à l'eau, ou rouverte ---------- */
/* la fin s'écrit dans la séance la plus récente ; chaque personnage reçoit ses points une seule fois par mission */
function bouclerMission(id, ok){
  let m = uneMission(id);
  if(!m || m.etat !== 'cours'){ msgTable('Cette mission n’est plus en cours : rien n’a bougé.', false); dessinerMissions(true); return; }
  let n = 0, payes = 0;
  /* la compagnie et la séance de la campagne où la mission a été lancée, pas de celle qu'on regarde */
  const cid = idCampagneMission(m);
  changer(() => {
    m = uneMission(id);
    if(!m || m.etat !== 'cours') return;
    const e = seancesDe(cid)[0] || null, pjs = persosDe(cid), titre = m.titre || 'la mission';
    const x = Object.assign(normMission(m), {id:m.id, etat:ok ? 'bouclee' : 'ratee', fin:e ? e.id : '', finie:maintenant(), gagnants:0, maj:maintenant(), majEtat:maintenant()});
    if(ok){
      const qui = m.points ? pjs.filter(c => !c.prog.points.some(p => p.mission === m.id)) : [];
      const gain = qui.length ? (qui.length > 1 ? ' Toute la compagnie gagne ' : ' ' + (qui[0].nom || 'Sans nom') + ' gagne ') + ptsTxt(m.points) + ' de progression.' : '';
      const tous = pjs.length, paie = argentsDe(m.paie);
      x.bloc = noterDans(e, 'Mission bouclée : ' + titre + '.' + gain + (m.paie ? ' Le Havre paie ' + m.paie + (paie && tous > 1 ? ' à chacun' : '') + '.' : ''), 'achat');
      qui.forEach(c => { c.prog.points.push({id:nouvelId('g'), t:maintenant(), quoi:'Mission : ' + titre, n:m.points, bloc:x.bloc, mission:m.id}); majPerso(c); });
      /* la paie, dans la bourse de chacun ; une seule fois, même bouclée deux fois ailleurs */
      payes = payerMission(m, pjs, x.bloc, e ? e.id : '');
      x.gagnants = n = qui.length;
    } else x.bloc = noterDans(e, 'La mission est tombée à l’eau : ' + titre + '.', 'note');
    T.missions[m.id] = x;
  });
  const argent = argentsDe(m.paie);
  const dit = [n ? ptsTxt(m.points) : '', payes && argent ? texteArgent(argent) : ''].filter(Boolean).join(' et ');
  msgTable(ok ? 'Mission bouclée' + (dit ? ' : ' + dit + (Math.max(n, payes) > 1 ? ' à chacun' : '') + '.' : '.') : 'La mission est tombée à l’eau.', true);
}
/* rouvrir : les points de cette mission sont repris à chacun, et sa ligne s'efface */
function rouvrirMission(id){
  const m = uneMission(id); if(!m || (m.etat !== 'bouclee' && m.etat !== 'ratee')) return;
  const cid = idCampagneMission(m);
  changer(() => {
    persosDe(cid).forEach(c => {
      const avant = c.prog.points.length;
      c.prog.points = c.prog.points.filter(p => p.mission !== m.id && !(m.bloc && p.bloc === m.bloc));
      if(c.prog.points.length !== avant) majPerso(c);
    });
    reprendrePaie(m);
    if(m.bloc) oublierBloc(m.bloc);
    T.missions[m.id] = Object.assign(normMission(m), {id:m.id, etat:'cours', fin:'', finie:0, bloc:'', gagnants:0, maj:maintenant(), majEtat:maintenant()});
  });
  MIS.vue = 'cours';
  dessinerMissions(true);
}
function remettreMission(id){
  const m = uneMission(id); if(!m || m.etat !== 'cours') return;
  changer(() => { T.missions[m.id] = Object.assign(normMission(m), {id:m.id, etat:'tableau', seance:'', lancee:0, fin:'', finie:0, bloc:'', gagnants:0, maj:maintenant(), majEtat:maintenant()}); });
  MIS.vue = 'tableau';
  dessinerMissions(true);
}
function retirerMission(id){
  const m = uneMission(id); if(!m) return;
  if(MIS.lire === id) MIS.lire = '';
  if(MIS.ed && MIS.ed.id === id) fermerEditeurMission();
  changer(() => { T.missions[m.id] = Object.assign(normMission(m), {id:m.id, supprime:true, maj:maintenant()}); });
  msgTable('« ' + (m.titre || 'La mission') + ' » est retirée du tableau.', true);
}

/* ---------- écrire une mission ---------- */
function tirerAuD20(k){ return GEN_MISSION[k][Math.floor(Math.random() * 20)]; }
/* le générateur du livre : les cinq colonnes, et le genre qu'on devine derrière ce qu'on demande */
function tirerCinq(d){
  const i = Math.floor(Math.random() * 20);
  d.demande = GEN_MISSION.demande[i];
  ['qui','ou','complication','cache'].forEach(k => { d[k] = tirerAuD20(k); });
  /* la paie et les points suivent le genre deviné, tant qu'on ne les a pas changés à la main */
  const avant = MISSIONS.find(x => x.k === d.genre) || MISSIONS[1];
  const g = MISSIONS.find(x => x.k === GEN_GENRE[i]) || MISSIONS[1];
  if(d.paie === avant.paie) d.paie = g.paie;
  if(d.points === avant.n) d.points = g.n;
  d.genre = g.k;
  return d;
}
/* une mission en cours d'écriture, et modifiée : on ne l'écrase pas en en ouvrant une autre */
function editeurModifie(){
  if(!MIS.ed) return false;
  lireEditeurMission();
  return JSON.stringify(MIS.ed) !== MIS.edAvant;
}
function editeurOccupe(){
  if(!editeurModifie()) return false;
  msgTable('Une mission est en cours d’écriture : enregistre-la ou annule-la d’abord.', false);
  const box = $('misEditeur'); if(box) box.scrollIntoView({block:'start', behavior:'smooth'});
  return true;
}
function tirerMission(){
  if(editeurOccupe()) return;
  const d = tirerCinq(normMission({}));
  d.titre = d.demande + ' · ' + d.ou;
  ouvrirEditeurMission(d, true);
  msgTable('Tirée au d20 dans le générateur du livre. Garde ce qui te parle, réécris le reste.', true);
}
function ouvrirEditeurMission(m, nouvelle){
  /* la même mission, déjà ouverte : on y retourne, sans rien effacer */
  if(MIS.ed && m && !nouvelle && MIS.ed.id === m.id){ const box = $('misEditeur'); if(box) box.scrollIntoView({block:'start', behavior:'smooth'}); return; }
  if(editeurOccupe()) return;
  if(typeof poserBestiaire === 'function') poserBestiaire();   /* les familles maison, pour la rencontre prévue */
  MIS.ed = normMission(JSON.parse(JSON.stringify(m || {})));
  if(nouvelle || !m || !m.id){ MIS.ed.id = m && m.id && !nouvelle ? m.id : nouvelId('m'); MIS.ed.etat = 'tableau'; }
  MIS.nouvelle = !!nouvelle;
  MIS.exemple = !!(m && m.exemple);
  dessinerEditeurMission();
  lireEditeurMission();
  MIS.edAvant = JSON.stringify(MIS.ed);
  const box = $('misEditeur');
  box.scrollIntoView({block:'start', behavior:'smooth'});
  setTimeout(() => { const t = $('me-titre'); if(t) t.focus({preventScroll:true}); }, 300);
}
function fermerEditeurMission(){
  MIS.ed = null; MIS.edAvant = '';
  const box = $('misEditeur'); if(box){ box.hidden = true; box.innerHTML = ''; }
}
function dessinerEditeurMission(){
  const box = $('misEditeur'); if(!box || !MIS.ed) return;
  const d = MIS.ed;
  box.innerHTML = ''; box.hidden = false;
  const tete = el('div','gtete');
  tete.append(el('h3','gnom', MIS.nouvelle ? 'Une mission de plus' : 'Modifier « ' + (d.titre || 'la mission') + ' »'), el('span','espace'));
  const tir = el('button','btn ghost sm','Tirer les cinq au d20'); tir.type = 'button'; tir.id = 'me-tirer';
  tir.title = 'Le générateur de mission du Livre VIII : qui demande, ce qu’on demande, où, la complication, ce qui est caché';
  tir.onclick = () => { lireEditeurMission(); tirerCinq(d); dessinerEditeurMission(); };
  tete.append(tir);
  box.append(tete);
  if(MIS.exemple) box.append(el('p','mini', 'C’est un exemple : une fois enregistré, il devient ta mission.'));

  const LONG = {titre:120, paie:60, qui:240, demande:240, ou:240, complication:1500, cache:1500};
  const txt = (k, ph, liste) => {
    const i = el('input'); i.type = 'text'; i.id = 'me-' + k; i.value = d[k]; i.placeholder = ph || ''; i.style.width = '100%';
    if(LONG[k]) i.maxLength = LONG[k];
    if(liste) i.setAttribute('list', listeDonnees('dl-me-' + k, liste));
    i.oninput = () => { d[k] = i.value; };
    return i;
  };
  /* un champ du générateur : la case, et un d20 qui la tire dans sa colonne */
  const tire = (lab, k, ph, parent) => {
    const w = el('div','mchamp');
    const l = el('label','lab', lab); l.htmlFor = 'me-' + k;
    const ligne = el('div','mde');
    const i = txt(k, ph, GEN_MISSION[k]);
    const b = el('button','btn ghost xs','d20'); b.type = 'button'; b.id = 'me-d20-' + k;
    b.title = 'Tirer « ' + lab.toLowerCase() + ' » au d20, dans le générateur du livre';
    b.setAttribute('aria-label', b.title);
    b.onclick = () => { d[k] = tirerAuD20(k); i.value = d[k]; };
    ligne.append(i, b);
    w.append(l, ligne);
    parent.append(w);
  };

  const g1 = el('div','mchamp');
  const lt = el('label','lab', 'Le titre'); lt.htmlFor = 'me-titre';
  g1.append(lt, txt('titre', 'Le verger qui fleurit en hiver'));
  box.append(g1);

  /* ce que c'est : les cinq genres du livre, avec leur paie et leurs points ; on peut les changer */
  const gw = el('div'); gw.style.marginTop = '10px';
  gw.append(el('span','lab', 'Ce que c’est'));
  const seg = el('div','seg mgenres'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Le genre de mission');
  const paie = txt('paie', '5 ors');
  const pts = el('input'); pts.type = 'number'; pts.id = 'me-points'; pts.min = '0'; pts.max = '50'; pts.value = String(d.points); pts.style.width = '90px'; pts.inputMode = 'numeric';
  pts.oninput = () => { const v = parseInt(pts.value, 10); d.points = isNaN(v) ? 0 : Math.max(0, Math.min(50, v)); };
  MISSIONS.forEach(x => {
    const b = el('button', null, x.l); b.type = 'button'; b.id = 'me-genre-' + x.k;
    b.setAttribute('aria-pressed', d.genre === x.k ? 'true' : 'false');
    b.onclick = () => {
      const avant = MISSIONS.find(y => y.k === d.genre) || MISSIONS[1];
      /* la paie et les points suivent le genre, tant qu'on ne les a pas changés à la main */
      if(d.paie === avant.paie){ d.paie = x.paie; paie.value = x.paie; }
      if(d.points === avant.n){ d.points = x.n; pts.value = String(x.n); }
      d.genre = x.k;
      [].forEach.call(seg.children, y => y.setAttribute('aria-pressed', y === b ? 'true' : 'false'));
    };
    seg.append(b);
  });
  gw.append(seg);
  box.append(gw);
  const g2 = el('div','mpaiepts');
  champ(g2, 'Ce que le Havre paie', paie);
  champ(g2, 'Points de progression', pts);
  box.append(g2);
  box.append(el('p','mini', 'Annoncés avant le départ, comme le veut le Livre V. « La boucler » donne les points à chaque personnage de la table.'));

  box.append(el('h4','glab', 'La commande'));
  const g3 = el('div','mgrille3');
  tire('Qui demande', 'qui', 'Maline, pour un village sans Havre', g3);
  tire('Ce qu’on demande', 'demande', 'Trouver ce qui la nourrit', g3);
  tire('Où', 'ou', 'Un hameau de la Plaine', g3);
  box.append(g3);

  box.append(el('h4','glab', 'L’annonce'));
  const an = el('textarea'); an.id = 'me-annonce'; an.rows = 5; an.value = d.annonce; an.style.width = '100%'; an.maxLength = 4000;
  an.placeholder = 'Ce que le Havre lit le matin, ou la lettre qu’on a reçue. « / » puis un nom cite quelqu’un, « -- » puis un nom cite un lieu.';
  an.setAttribute('aria-label', 'L’annonce');
  an.oninput = () => { d.annonce = an.value; };
  box.append(an);
  brancherMentions(an, {sansFiche:true});
  box.append(el('p','mini', 'Elle ouvre la séance quand on part, juste après « Le matin, au Havre ». « /Maline » cite une de ses visages : sa fiche naît au départ.'));

  /* ses visages : ils reçoivent leur fiche quand on part */
  box.append(el('h4','glab', 'Ses visages'));
  const vis = el('div','mvisages');
  const lignes = () => {
    vis.innerHTML = '';
    d.pnj.forEach((p, i) => {
      const r = el('div','mvligne');
      const champTxt = (k, ph, lab, liste) => {
        const x = el('input'); x.type = 'text'; x.id = 'me-pnj-' + k + '-' + i; x.value = p[k]; x.placeholder = ph;
        x.maxLength = {nom:80, role:160, peuple:40, texte:1500}[k] || 200;
        x.setAttribute('aria-label', lab);
        if(liste) x.setAttribute('list', liste);
        x.oninput = () => { p[k] = x.value; };
        return x;
      };
      const at = el('select'); at.id = 'me-pnj-attitude-' + i; at.setAttribute('aria-label', 'Son attitude envers le groupe');
      ATTITUDES.forEach(a => at.add(new Option(a.l, a.k)));
      at.value = p.attitude;
      at.onchange = () => { p.attitude = at.value; };
      const ot = el('button','ax','×'); ot.type = 'button'; ot.title = 'Retirer ce visage'; ot.setAttribute('aria-label', 'Retirer ' + (p.nom || 'ce visage'));
      ot.onclick = () => { lireEditeurMission(); d.pnj.splice(i, 1); lignes(); };
      r.append(champTxt('nom', 'Nom', 'Son nom'), champTxt('role', 'Rôle, métier', 'Son rôle'),
        champTxt('peuple', 'Peuple', 'Son peuple', listeDonnees('dl-me-peuples', PEUPLES_UN)), at,
        champTxt('texte', 'Ce qu’on en sait', 'Ce qu’on en sait'), ot);
      vis.append(r);
    });
  };
  lignes();
  box.append(vis);
  const plus = el('button','btn ghost sm','+ Un visage'); plus.type = 'button'; plus.id = 'me-pnj-plus';
  plus.onclick = () => {
    lireEditeurMission();
    if(d.pnj.length >= 12) return;
    d.pnj.push({nom:'', role:'', peuple:'', texte:'', attitude:'inconnu'});
    lignes();
    const n = $('me-pnj-nom-' + (d.pnj.length - 1)); if(n) n.focus();
  };
  box.append(plus);
  box.append(el('p','mini', 'Un nom qui a déjà sa fiche la garde : rien n’est écrasé.'));

  /* la rencontre prévue : le tirage de la table la prendra */
  box.append(el('h4','glab', 'La rencontre prévue'));
  const rw = el('div','acts');
  const ri = el('div','seg'); ri.setAttribute('role', 'group'); ri.setAttribute('aria-label', 'L’intensité');
  [{k:'', l:'Aucune'}].concat(INTENSITES).forEach(x => {
    const b = el('button', null, x.l); b.type = 'button'; b.id = 'me-inten-' + (x.k || 'aucune');
    b.setAttribute('aria-pressed', d.rencontre.inten === x.k ? 'true' : 'false');
    b.onclick = () => { d.rencontre.inten = x.k; [].forEach.call(ri.children, y => y.setAttribute('aria-pressed', y === b ? 'true' : 'false')); };
    ri.append(b);
  });
  const fs = el('select'); fs.id = 'me-fam'; fs.setAttribute('aria-label', 'Qui peut se présenter');
  fs.add(new Option('Toutes les familles', ''));
  remplirFamilles(fs, false);
  if(d.rencontre.fam && !famille(d.rencontre.fam)) fs.add(new Option(TIR.complet ? 'Une famille retirée du bestiaire' : 'Une famille maison', d.rencontre.fam));
  fs.value = d.rencontre.fam;
  fs.onchange = () => { d.rencontre.fam = fs.value; };
  rw.append(ri, fs);
  box.append(rw);
  const rn = el('input'); rn.type = 'text'; rn.id = 'me-rnote'; rn.value = d.rencontre.note; rn.style.width = '100%'; rn.style.marginTop = '8px'; rn.maxLength = 400;
  rn.placeholder = 'Ce qu’on croise : des rats de ruine dans les galeries hautes'; rn.setAttribute('aria-label', 'Ce qu’on croise');
  rn.oninput = () => { d.rencontre.note = rn.value; };
  box.append(rn);

  /* le côté MJ : ce qui ne se lit pas à la table */
  const mj = el('details','mmj'); mj.open = !!(d.complication || d.cache || d.notes);
  mj.append(el('summary', null, 'Côté MJ'));
  const g4 = el('div','mgrille3 mgrille2');
  tire('La complication', 'complication', 'Il y a des enfants', g4);
  tire('Ce qui est caché', 'cache', 'Quelqu’un la nourrit exprès', g4);
  mj.append(g4);
  const no = el('textarea'); no.id = 'me-notes'; no.rows = 3; no.value = d.notes; no.style.width = '100%'; no.style.marginTop = '8px'; no.maxLength = 4000;
  no.placeholder = 'Tes notes : ce que sait chacun, ce qui arrive si on traîne.'; no.setAttribute('aria-label', 'Notes du MJ');
  no.oninput = () => { d.notes = no.value; };
  mj.append(no);
  box.append(mj);

  const act = el('div','acts'); act.style.marginTop = '14px';
  const ok = el('button','btn', MIS.nouvelle ? 'Mettre au tableau' : 'Enregistrer'); ok.type = 'button'; ok.id = 'me-ok';
  ok.onclick = validerMission;
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button'; non.id = 'me-non';
  non.onclick = fermerEditeurMission;
  act.append(ok, non);
  box.append(act);
}
/* ce qui est écrit dans les cases, avant de redessiner le formulaire */
function lireEditeurMission(){
  const d = MIS.ed; if(!d) return;
  ['titre','paie','qui','demande','ou','annonce','complication','cache','notes'].forEach(k => { const x = $('me-' + k); if(x) d[k] = x.value; });
  const n = $('me-rnote'); if(n) d.rencontre.note = n.value;
  d.pnj.forEach((p, i) => ['nom','role','peuple','texte'].forEach(k => { const x = $('me-pnj-' + k + '-' + i); if(x) p[k] = x.value; }));
}
function validerMission(){
  const d = MIS.ed; if(!d) return;
  lireEditeurMission();
  if(!d.titre.trim()){ msgTable('Il lui faut un titre.', false); const t = $('me-titre'); if(t) t.focus(); return; }
  const sansNom = d.pnj.findIndex(p => !p.nom.trim() && (p.role + p.peuple + p.texte).trim());
  if(sansNom >= 0){ msgTable('Un visage n’a pas de nom : donne-lui en un, ou retire-le.', false); const t = $('me-pnj-nom-' + sansNom); if(t) t.focus(); return; }
  /* retirée entre-temps, ici ou ailleurs : elle le reste */
  if(T.missions[d.id] && T.missions[d.id].supprime){ fermerEditeurMission(); dessinerMissions(true); msgTable('Cette mission a été retirée entre-temps : rien n’est enregistré.', false); return; }
  const x = normMission(Object.assign({}, d, {titre:d.titre.trim(), maj:maintenant(), auteur:d.auteur || MOI.joueur || ''}));
  x.id = d.id;
  /* où elle en est ne se change pas ici : on garde l'état d'aujourd'hui, pas celui de l'ouverture */
  const cur = T.missions[x.id] || uneMission(x.id);
  if(cur) CHAMPS_ETAT_MISSION.forEach(k => { x[k] = cur[k]; });
  changer(() => { T.missions[x.id] = x; });
  fermerEditeurMission();
  if(x.etat === 'tableau') MIS.vue = 'tableau';
  dessinerMissions(true);
  msgTable('« ' + x.titre + ' » est ' + (MIS.nouvelle ? 'au tableau.' : 'enregistrée.'), true);
}

/* ---------- à la table : la mission sous la main ---------- */
function dessinerMissionTable(){
  const box = $('seMission'); if(!box) return;
  const m = missionEnCours();
  box.innerHTML = '';
  box.hidden = !m;
  if(!m) return;
  const g = genreDe(m);
  box.className = 'cote mission g-' + g.k;
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'La mission'), el('span','espace'));
  const a = el('a', null, 'au tableau'); a.href = 'missions.html#m=' + encodeURIComponent(m.id); a.target = ONGLET_MISSIONS;
  a.title = 'La mission, dans le Registre des Missions';
  t.append(a);
  box.append(t);
  box.append(el('p','mnom', m.titre || 'Sans titre'));
  const s = numSeance(m.seance);
  box.append(el('p','mini', g.l + ' · ' + paieTxt(m) + (s ? ' · depuis la séance ' + s : '')));
  const dl = commandeMission(m); dl.classList.add('mcmd-cote');
  box.append(dl);
  const mj = el('details','mmj');
  mj.open = !!MIS.mjOuvert[m.id];
  mj.ontoggle = () => { MIS.mjOuvert[m.id] = mj.open; };
  mj.append(el('summary', null, 'Côté MJ'));
  [['La complication', m.complication], ['Ce qui est caché', m.cache], ['Notes', m.notes]].forEach(([lab, v]) => {
    if(!v) return;
    const p = el('p'); p.append(el('b', null, lab + ' : '), texteRiche(v)); mj.append(p);
  });
  const r = rencontreTxt(m.rencontre);
  if(r || m.rencontre.note){
    const p = el('p'); p.append(el('b', null, 'La rencontre prévue : '), document.createTextNode([r, m.rencontre.note].filter(Boolean).join(' · ')));
    mj.append(p);
    if(r){
      const b = el('button','btn ghost xs','Préparer le tirage'); b.type = 'button'; b.id = 'seMissionTirage';
      b.title = 'Le tirage de « En face » prend l’intensité et la famille de la mission';
      b.onclick = () => { preparerRencontre(m); dessinerCombat(true); msgTable('Le tirage de « En face » est réglé sur la mission : ' + r + '.', true); };
      mj.append(b);
    }
  }
  if(mj.children.length > 1) box.append(mj);
}
