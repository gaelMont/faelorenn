/* ============ les retouches : ce que le Registre des Compétences écrit ============
   Chaque retouche est une pièce datée, rangée par identifiant. Une Pratique du livre se reconnaît à son identifiant
   (sa liste et son nom dans le livre) : le retoucher, c'est poser une pièce à cet identifiant ; la retirer, c'est y poser
   une trace de suppression ; « revenir au livre », c'est y reposer ce que le livre dit. Une Pratique de la maison a un
   identifiant à elle, qui commence par « + ». */

let REG_T = 0;
/* la date d'une retouche : jamais avant la précédente de la même pièce, même si l'horloge d'un appareil avance ou retarde.
   Qui retouche ce qu'il a sous les yeux l'emporte donc sur cette version-là, quelle que soit sa date */
const regMaintenant = prev => { REG_T = Math.max(Date.now(), REG_T + 1, (prev && isFinite(+prev.maj) ? +prev.maj : 0) + 1); return REG_T; };
const regSortie = () => { regGarder(); regAppliquer(true); };

function regTrouverPrat(id){
  const v = regVuePratiques();
  for(let i = 0; i < v.length; i++){
    const e = v[i].entrees.find(x => x.id === id) || v[i].retirees.find(x => x.id === id);
    if(e) return {liste:v[i], e:e};
  }
  return null;
}
/* poser des champs sur une Pratique : ce qu'elle était entre dans la liste de ses versions d'avant.
   t = {liste, e} : la Pratique telle qu'on la voyait juste avant (une liste qui change d'un coup se lit une seule fois) */
function regEcrirePratique(t, champs){
  if(!t) return false;
  const id = t.e.id;
  const avant = regSnap(t.e);
  const apres = regSnap(Object.assign({}, avant, champs));
  if(!apres) return false;
  const rec = regDe(REG.pratiques, id);
  const actif = !!rec && !rec.supprime;
  /* rien n'a changé, pas même une majuscule ou un accent : rien ne s'écrit, et aucune date ne se pose sur une pièce intacte */
  if(regCanon(avant) === regCanon(apres)) return false;
  let prec = actif && rec.precedent ? rec.precedent.slice() : [];
  prec = prec.filter(s => regCanon(s) !== regCanon(avant));
  prec.push(avant);
  /* au-delà de dix versions, on garde la première (celle du livre) et les neuf dernières */
  if(prec.length > 10) prec = [prec[0]].concat(prec.slice(-9));
  REG.pratiques[id] = Object.assign({}, apres, {dom:t.liste.dom, grp:t.liste.grp, ordre:actif ? rec.ordre : 0,
    precedent:prec, maj:regMaintenant(rec)});
  return true;
}
function regPoserPratique(id, champs){
  const fait = regEcrirePratique(regTrouverPrat(id), champs);
  if(fait) regSortie();
  return fait;
}
function regRetirerPratique(id){
  if(!regTrouverPrat(id)) return false;
  REG.pratiques[id] = {supprime:true, maj:regMaintenant(regDe(REG.pratiques, id))};
  regSortie();
  return true;
}
/* le nom que le livre donne à une Pratique est-il déjà celui d'une autre, dans la même école ? (la remettre en ferait deux) */
function regNomLivrePris(id){
  const t = regTrouverPrat(id);
  return !!(t && t.e.du && regNomPratPris(t.liste.dom, t.e.du.n, id));
}
/* une Pratique du livre retirée revient telle que le livre la donne */
function regRemettrePratique(id){
  const t = regTrouverPrat(id);
  if(!t || !t.e.du || regNomLivrePris(id)) return false;
  REG.pratiques[id] = Object.assign({}, t.e.du, {dom:t.liste.dom, grp:t.liste.grp, ordre:0, precedent:[], maj:regMaintenant(regDe(REG.pratiques, id))});
  regSortie();
  return true;
}
function regRevenirAuLivre(id){
  const t = regTrouverPrat(id);
  if(!t || !t.e.du || regNomLivrePris(id)) return false;
  return regPoserPratique(id, t.e.du);
}
function regNouvellePratique(dom, grp, champs){
  const maj = regMaintenant();
  const id = '+' + maj.toString(36) + Math.random().toString(36).slice(2, 6);
  const s = regSnap(champs);
  if(!s) return '';
  REG.pratiques[id] = Object.assign({}, s, {dom:dom, grp:grp, ordre:maj, precedent:[], maj:maj});
  regSortie();
  return id;
}
/* la caractéristique de la liste change : tout ce qui s'y lance la suit, d'un seul coup */
function regChangerCaster(dom, grp, car){
  if(REG_JETS_CAR.indexOf(car) < 0) return false;
  const l = regVuePratiques().find(x => x.dom === dom && x.grp === grp);
  if(!l) return false;
  let fait = false;
  l.entrees.forEach(e => { if(REG_JETS_CAR.indexOf(e.j) >= 0 && e.j !== car) fait = regEcrirePratique({liste:l, e:e}, {j:car}) || fait; });
  if(fait) regSortie();
  return fait;
}
/* une seule attaque de base par liste */
function regPoserBase(dom, grp, id){
  const l = regVuePratiques().find(x => x.dom === dom && x.grp === grp);
  if(!l) return false;
  let fait = false;
  l.entrees.forEach(e => {
    if(e.id === id) fait = regEcrirePratique({liste:l, e:e}, {base:true}) || fait;
    else if(e.base) fait = regEcrirePratique({liste:l, e:e}, {base:false}) || fait;
  });
  if(fait) regSortie();
  return fait;
}

/* ---------- les compétences ---------- */
function regPoserCompetence(cle, champs){
  const c = regVueCompetences().find(x => x.cle === cle);
  if(!c) return false;
  const rec = regDe(REG.competences, cle) || {nom:'', car:'', retire:false, ajout:c.ajout, ordre:0, maj:0};
  const n = Object.assign({}, rec);
  if(champs.nom != null && !c.fixe){ const nom = regTxt(champs.nom, 60).trim(); n.nom = nom === cle ? '' : nom; }
  if(champs.car != null && !c.fixeCar && REG_CARS.indexOf(champs.car) >= 0) n.car = champs.car === c.carLivre ? '' : champs.car;
  if(champs.retire != null && !c.fixe) n.retire = !!champs.retire;
  if(c.ajout){ n.ajout = true; if(!n.ordre) n.ordre = regMaintenant(); }
  if(regCanon(n) === regCanon(rec)) return false;
  n.maj = regMaintenant(rec);
  REG.competences[cle] = n;
  regSortie();
  return true;
}
/* une compétence du livre retouchée revient telle que le livre la donne */
function regRevenirCompetence(cle){
  const k = regDe(REG.competences, cle), c = regVueCompetences().find(x => x.cle === cle);
  if(!k || !c || c.ajout) return false;
  REG.competences[cle] = Object.assign({}, k, {nom:'', car:'', retire:false, maj:regMaintenant(k)});
  regSortie();
  return true;
}
function regNouvelleCompetence(nom, car){
  const cle = regTxt(nom, 60).trim();
  if(!cle || REG_CARS.indexOf(car) < 0) return '';
  const maj = regMaintenant(regDe(REG.competences, cle));
  REG.competences[cle] = {nom:'', car:car, retire:false, ajout:true, ordre:maj, maj:maj};
  regSortie();
  return cle;
}
/* un nom est-il déjà pris, par une compétence ou par une clé ? */
function regNomComptePris(nom, sauf){
  const k = regNorm(nom);
  return regVueCompetences().some(c => c.cle !== sauf && (regNorm(c.nom) === k || regNorm(c.cle) === k));
}
function regNomPratPris(dom, nom, sauf){
  const k = regNorm(nom);
  return regVuePratiques().some(l => l.dom === dom && l.entrees.concat(l.retirees).some(e => e.id !== sauf && regNorm(e.n) === k));
}

const COMP_USAGES = {"Discrétion":["la Voie Éclaireur (+20)"],"Perception":["la Voie Éclaireur (+20)","la Voie Marchand (+20)"],"Survie":["la Voie Éclaireur (+20)","la Voie Chasseur (+20)","le peuple Ori'Ican (+10)"],"Nature":["la Voie Chercheur (+20)"],"Savoir":["la Voie Chercheur (+20)","la Voie Artisan (+20)"],"Connaissance des Floraisons":["la Voie Chercheur (+20)"],"Tir":["la Voie Chasseur (+20)"],"Athlétisme":["la Voie Chasseur (+20)","la Voie Garde (+20)"],"Médecine":["la Voie Secouriste (+40)"],"Empathie":["la Voie Secouriste (+20)"],"Persuasion":["la Voie Porte-parole (+20)","le choix des Cimérans (+10)"],"Représentation":["la Voie Porte-parole (+20)","le choix des Cimérans (+10)","le peuple Ilvès (+20)"],"Tromperie":["la Voie Porte-parole (+20)","la Voie Marchand (+40)","le choix des Cimérans (+10)"],"Combat":["la Voie Garde (+20)"],"Intimidation":["la Voie Garde (+20)","le choix des Cimérans (+10)"],"Artisanat":["la Voie Artisan (+40)"],"Sentir l'Énergie":["le peuple Élytris (+20)"]};
