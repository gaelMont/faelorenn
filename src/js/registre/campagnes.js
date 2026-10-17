/* ============ les campagnes ============
   Plusieurs parties dans le même monde, sans en arrêter une pour en lancer une autre. Chaque campagne a sa compagnie,
   ses séances (numérotées chez elle) et ses missions en cours. Le monde est commun : les PNJ et leurs liens, les
   visages, le tableau du Havre, le bestiaire. Une campagne qu'on arrête fait entrer sa compagnie dans le monde : ses
   personnages deviennent des PNJ, qu'une autre campagne peut croiser.
   Ce navigateur suit une campagne à la fois (MOI.campagne), celle que la liste de la table montre. */

/* le formulaire ouvert sous la liste : '' | 'nouvelle' | 'renommer' | 'importer' (une table .json, lue et pas encore ajoutée) */
const CAMP = {mode:'', nom:'', arme:'', fichier:'', fichierNom:'', apercu:null};

/* ---------- laquelle ---------- */
function campagnes(){
  return Object.keys(T.campagnes).map(k => T.campagnes[k]).filter(c => c && !c.supprime).sort(parCreation);
}
function uneCampagne(id){ const c = id && T.campagnes[id]; return c && !c.supprime ? c : null; }
const campagnesEnCours = () => campagnes().filter(c => c.etat !== 'finie');
const campagneParDefaut = () => campagneDefautDans(T);
/* celle que ce navigateur suit : la sienne, même close (on relit une campagne finie), sinon la première en cours */
function campagneCourante(){
  return uneCampagne(MOI.campagne) || campagnesEnCours()[0] || campagneParDefaut();
}
const idCourante = () => { const c = campagneCourante(); return c ? c.id : ''; };
/* la campagne d'un personnage ou d'une séance : la sienne, ou la première pour ce qui n'en a pas */
const idCampagneDe = x => campagneEffDans(T, x && x.campagne);
const dansCampagne = (x, cid) => idCampagneDe(x) === (cid === undefined ? idCourante() : cid);
const plusieursCampagnes = () => campagnes().length > 1;
const nomCampagne = id => { const c = uneCampagne(id); return c ? c.nom : ''; };
/* la campagne d'une mission : celle de la séance où elle a été lancée. Au tableau, elle n'est à personne */
function idCampagneMission(m){
  if(!m || m.etat === 'tableau') return '';
  return idCampagneDe((m.seance && T.journal[m.seance]) || null);
}

/* celui qui est déjà à une table, dans n'importe quelle campagne : un même nom ne se joue pas deux fois */
const memeNomPerso = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const persoALaTable = (nom, sauf) => Object.keys(T.personnages).map(k => T.personnages[k]).find(x => x && x.id !== sauf && !x.supprime && !x.monde && memeNomPerso(x.nom, nom)) || null;
const dejaALaTable = x => 'à la table' + (plusieursCampagnes() ? ' de « ' + nomCampagne(idCampagneDe(x)) + ' »' : '');

/* ceux qui sont à la table d'une campagne : pas ceux qui sont entrés dans le monde */
function persosDe(cid){
  const def = campagneParDefaut();
  return Object.keys(T.personnages).map(id => T.personnages[id])
    .filter(c => c && !c.supprime && !c.monde && campagneEffDans(T, c.campagne, def) === cid)
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
}
function toutesSeances(){ return Object.keys(T.journal).map(id => T.journal[id]).filter(e => e && !e.supprime); }
/* les séances d'une campagne, la plus récente en tête */
function seancesDe(cid){
  const def = campagneParDefaut();
  return toutesSeances().filter(e => campagneEffDans(T, e.campagne, def) === cid)
    .sort((a, b) => (parseFloat(b.seance) || 0) - (parseFloat(a.seance) || 0) || (a.id < b.id ? -1 : 1));
}
/* on rattache ce qui naît à la campagne qu'on suit, avec sa date */
function rattacher(x, cid){
  const id = cid === undefined ? idCourante() : cid;
  x.campagne = id; x.campagneT = id ? maintenant() : 0;
  return x;
}
/* le nom d'une séance : s-n dans la première campagne, s-<campagne>-n dans les autres. Le même numéro, au même endroit,
   donne le même nom : deux joueurs qui ouvrent la séance en même temps n'en ouvrent qu'une */
function idSeance(n, cid){
  cid = cid === undefined ? idCourante() : cid;
  const def = campagneParDefaut();
  let id = 's-' + (def && cid && cid !== def.id ? cid.replace(/^c-/, '') + '-' : '') + n;
  if(T.journal[id]) id += '-' + Math.random().toString(36).slice(2, 6);
  return id;
}
/* le dernier endroit connu d'une campagne : le lieu de sa séance la plus récente qui en a un, sinon celui de sa mission */
function lieuDeCampagne(cid){
  const e = seancesDe(cid).find(x => (x.lieu || '').trim());
  if(e) return e.lieu.trim();
  const ms = toutesMissions().filter(m => m.etat !== 'tableau' && m.seance && idCampagneMission(m) === cid && (m.ou || '').trim())
    .sort((a, b) => (b.lancee || 0) - (a.lancee || 0));
  return ms.length ? ms[0].ou.trim() : '';
}
/* ce qu'une campagne contient : sans personnage ni séance, on peut la retirer */
function campagneVide(id){
  const def = campagneParDefaut();
  const perso = Object.keys(T.personnages).some(k => { const c = T.personnages[k]; return c && !c.supprime && campagneEffDans(T, c.campagne, def) === id; });
  return !perso && !seancesDe(id).length;
}
function resumeCampagne(c){
  const k = persosDe(c.id).length, ss = seancesDe(c.id);
  return [k ? k + ' personnage' + (k > 1 ? 's' : '') : 'personne à la table', ss.length ? 'séance ' + (ss[0].seance || '?') : 'pas encore de séance',
    c.etat === 'finie' ? 'terminée' : ''].filter(Boolean).join(' · ');
}

/* ---------- un numéro de séance ne dit pas de quelle campagne il est ----------
   Avec plusieurs campagnes, là où le monde se lit (les visages, le tableau), on nomme la campagne */
function etiquetteSeance(e){
  if(!e) return '';
  const n = e.seance || '?';
  return plusieursCampagnes() ? n + ' (' + nomCampagne(idCampagneDe(e)) + ')' : n;
}
/* « 1, 2, 3 » ; avec plusieurs campagnes, « 1, 2, 3 (La Tournée) · 1 (Océane) » */
function listeNumerosSeances(es){
  if(!plusieursCampagnes()){
    const vus = [];
    es.forEach(e => { const n = e.seance || '?'; if(vus.indexOf(n) < 0) vus.push(n); });
    return vus.join(', ');
  }
  const par = {}, ordre = [];
  es.forEach(e => {
    const c = idCampagneDe(e), n = e.seance || '?';
    if(!par[c]){ par[c] = []; ordre.push(c); }
    if(par[c].indexOf(n) < 0) par[c].push(n);
  });
  return ordre.map(c => par[c].join(', ') + ' (' + nomCampagne(c) + ')').join(' · ');
}

/* ---------- passer d'une campagne à l'autre ---------- */
/* sans redessiner : ce qui s'écrivait ou se choisissait dans l'autre campagne ne suit pas */
function passerACampagne(cid){
  if(!uneCampagne(cid) || MOI.campagne === cid) return false;
  MOI.campagne = cid;
  /* « le mien » : mon personnage de cette campagne, s'il y en a un */
  const l = persos();
  if(!l.some(x => x.id === MOI.perso)){ const m = l.find(x => MOI.joueur && x.joueur === MOI.joueur); MOI.perso = m ? m.id : ''; }
  BED = null; BLOC_SUPPR = null; SEANCE_SUPPR = false; A_SUPPRIMER = null;
  if(PED && $('pEditeur')) fermerEditeurPerso();
  COMPO.pret = false; COMPO.qui = {k:'mj', id:'', nom:''}; COMPO.genre = 'narration'; COMPO.quoi = '';
  COMPO.jet = null; COMPO.degats = null; COMPO.vies = []; COMPO.perte = null; COMPO.cible = ''; COMPO.pvId = '';
  CAMP.mode = ''; CAMP.arme = ''; CAMP.fichier = ''; CAMP.fichierNom = ''; CAMP.apercu = null;
  return true;
}
function choisirCampagne(id){
  if(!passerACampagne(id)) return;
  sauverLocal();
  dessiner();
}

/* ---------- la première campagne : celle d'avant ----------
   La table d'avant n'en avait qu'une, sans le dire : ses personnages et ses séances n'ont pas de campagne, et vont à la
   première. Elle prend le nom que la table portait. Datée du tout début, et pareille sur chaque ordinateur : un
   navigateur qui la crée avant d'avoir lu le dépôt n'écrase rien, et un vrai nom l'emporte sur « Notre campagne » */
function migrerCampagnes(){
  if(campagnes().length) return false;
  const nom = String(T.nom || '').replace(/\s+/g, ' ').trim();
  changer(() => {
    if(campagnes().length) return;
    T.campagnes[ID_DEFAUT] = normCampagne({id:ID_DEFAUT, nom:nom || 'Notre campagne', majNom:nom ? 1 : 0, creee:0, maj:1});
  });
  return true;
}

/* ---------- ouvrir, nommer, clore, rouvrir, retirer ---------- */
const nomPropre = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);
const memeCampagne = (a, b) => nomPropre(a).toLowerCase() === nomPropre(b).toLowerCase();
function nouvelleCampagne(nom){
  nom = nomPropre(nom);
  if(!nom) return {ok:false, msg:'Donne un nom à la campagne.'};
  if(campagnes().some(c => memeCampagne(c.nom, nom))) return {ok:false, msg:'Une campagne s’appelle déjà « ' + nom + ' ».'};
  if(!campagnes().length) migrerCampagnes();
  let id = 'c-' + slug(nom);
  if(T.campagnes[id]) id += '-' + Math.random().toString(36).slice(2, 6);
  const t = maintenant();
  changer(() => { T.campagnes[id] = normCampagne({id:id, nom:nom, majNom:t, maj:t, creee:t, auteur:MOI.joueur || ''}); });
  passerACampagne(id);
  sauverLocal(); dessiner();
  return {ok:true, id:id, msg:'« ' + nom + ' » est ouverte : sa compagnie et ses séances sont à elle, le monde reste commun.'};
}
function renommerCampagne(id, nom){
  const c = uneCampagne(id); if(!c) return {ok:false, msg:'Cette campagne n’existe plus.'};
  nom = nomPropre(nom);
  if(!nom) return {ok:false, msg:'Donne un nom à la campagne.'};
  if(nom === c.nom) return {ok:true, msg:''};
  if(campagnes().some(x => x.id !== id && memeCampagne(x.nom, nom))) return {ok:false, msg:'Une campagne s’appelle déjà « ' + nom + ' ».'};
  const t = maintenant();
  changer(() => { T.campagnes[id] = Object.assign({}, T.campagnes[id], {nom:nom, majNom:t, maj:t}); });
  return {ok:true, msg:'La campagne s’appelle maintenant « ' + nom + ' ».'};
}
/* clore : toute sa compagnie entre dans le monde, à l'endroit où elle en était, et la campagne passe aux terminées */
function cloreCampagne(id){
  const c = uneCampagne(id); if(!c || c.etat === 'finie') return {ok:false, msg:'Cette campagne est déjà terminée.'};
  let k = 0;
  const reste = toutesMissions().filter(m => m.etat === 'cours' && idCampagneMission(m) === id).length;
  changer(() => {
    persosDe(id).forEach(x => { if(versLeMonde(x.id)) k++; });
    const t = maintenant();
    T.campagnes[id] = Object.assign({}, T.campagnes[id], {etat:'finie', majEtat:t, finie:t, maj:t});
  });
  if(PED && $('pEditeur')) fermerEditeurPerso();
  /* on suit une autre campagne en cours, s'il y en a une */
  const autre = campagnesEnCours().find(x => x.id !== id);
  if(MOI.campagne === id || !MOI.campagne){ if(autre) passerACampagne(autre.id); }
  sauverLocal(); dessiner();
  const lieuFin = lieuDeCampagne(id);
  return {ok:true, k:k, msg:'« ' + c.nom + ' » est terminée' + (k ? ' : ' + (k > 1 ? k + ' personnages sont entrés' : 'un personnage est entré') + ' dans le monde, ' + (lieuFin ? 'à ' + lieuFin : 'là où la campagne s’était arrêtée') + '.' : '.')
    + (reste ? ' ' + (reste > 1 ? reste + ' missions restent en cours : le Registre des Missions les boucle' : 'Une mission reste en cours : le Registre des Missions la boucle') + ' encore.' : '')};
}
function rouvrirCampagne(id){
  const c = uneCampagne(id); if(!c || c.etat !== 'finie') return {ok:false, msg:'Cette campagne n’est pas terminée.'};
  const t = maintenant();
  changer(() => { T.campagnes[id] = Object.assign({}, T.campagnes[id], {etat:'cours', majEtat:t, finie:0, maj:t}); });
  return {ok:true, msg:'« ' + c.nom + ' » reprend. Ses personnages restent dans le monde : on les reprend un par un, dans le Registre des Marchefleurs.'};
}
function supprimerCampagne(id){
  const c = uneCampagne(id); if(!c) return {ok:false, msg:'Cette campagne n’existe plus.'};
  if(campagnes().length < 2) return {ok:false, msg:'C’est la seule campagne : une table en garde toujours une.'};
  if(!campagneVide(id)) return {ok:false, msg:'« ' + c.nom + ' » a des personnages ou des séances : on la clôt, on ne la retire pas.'};
  const autre = campagnes().find(x => x.id !== id && x.etat !== 'finie') || campagnes().find(x => x.id !== id);
  changer(() => { T.campagnes[id] = Object.assign({}, T.campagnes[id], {supprime:true, maj:maintenant()}); });
  if(MOI.campagne === id && autre) passerACampagne(autre.id);
  sauverLocal(); dessiner();
  return {ok:true, msg:'« ' + c.nom + ' » est retirée.'};
}

/* ---------- une table jouée à part, qui devient une campagne ----------
   Le .json d'une autre table (un autre navigateur, un autre dépôt) a ses propres séances : sa « séance 1 » n'est pas celle
   d'ici, et les fondre telles quelles les mélangerait. On les renomme donc : sa compagnie, ses séances, ses missions jouées
   et ses jets forment une campagne de plus ; ses PNJ et leurs liens rejoignent le monde commun, où un nom reste une personne. */
const vivantsDe = m => Object.keys(m || {}).filter(k => m[k] && !m[k].supprime);
/* ce que les deux tables ont déjà en commun : un paragraphe, un lien ou un jet qui porte le même nom partout vient de la même table */
function enCommun(o){
  const ids = (a, b) => vivantsDe(a).filter(k => b && b[k]).length;
  const jets = {}; T.jets.forEach(j => { jets[j.id] = 1; });
  return ids(o.blocs, T.blocs) + ids(o.liens, T.liens) + ids(o.rencontres, T.rencontres) + ids(o.adversaires, T.adversaires) + (o.jets || []).filter(j => jets[j.id]).length;
}
/* une même séance (même nom) dans les deux tables, avec des paragraphes qui n'ont rien en commun : deux parties différentes */
function seancesHomonymes(o){
  return vivantsDe(o.journal).filter(id => {
    if(!T.journal[id] || T.journal[id].supprime) return false;
    const de = (blocs, sid) => vivantsDe(blocs).filter(k => blocs[k].seance === sid && blocs[k].type !== 'rencontre');
    const a = de(o.blocs, id), b = de(T.blocs, id);
    return a.length && b.length && !a.some(k => T.blocs[k]);
  });
}
function lireTable(txt){
  let o = null;
  try{ o = JSON.parse(txt); }catch(e){ return {ok:false, msg:'Ce fichier n’est pas lisible.'}; }
  if(!o || typeof o !== 'object') return {ok:false, msg:'Ce fichier n’est pas lisible.'};
  if(o.format === 'faelorenn-personnage') return {ok:false, msg:'C’est la fiche d’un personnage, pas une table : « Importer un .json », dans « Les personnages », la fait entrer.'};
  if(o.format !== 'faelorenn-table') return {ok:false, msg:'Ce fichier n’est pas une table Faelorenn.'};
  return {ok:true, o:normTable(o)};
}
/* ce que l'import ferait : ce qu'il y a dedans, et ce qui l'empêcherait */
function apercuTable(txt){
  const r = lireTable(txt); if(!r.ok) return r;
  const o = r.o, pj = vivantsDe(o.personnages).map(k => o.personnages[k]);
  const k = (n, un, plus) => n + ' ' + (n > 1 ? plus : un);
  const bouts = [k(pj.length, 'personnage', 'personnages') + (pj.length ? ' (' + pj.map(c => c.nom || 'Sans nom').join(', ') + ')' : ''),
    k(vivantsDe(o.journal).length, 'séance', 'séances'), k(vivantsDe(o.blocs).length, 'paragraphe', 'paragraphes'), k(vivantsDe(o.pnj).length, 'fiche de PNJ', 'fiches de PNJ')];
  const pris = pj.filter(c => !c.monde && persoALaTable(c.nom));
  const autres = Object.keys(o.campagnes).filter(i => !o.campagnes[i].supprime).length;
  let bloque = '';
  if(enCommun(o)) bloque = 'Ce fichier vient de cette table, ou en a déjà des paragraphes : « Importer un .json » le fusionne, il n’a rien à devenir comme campagne.';
  else if(pris.length) bloque = (pris.length > 1 ? pris.map(c => '« ' + c.nom + ' »').join(', ') + ' sont déjà à une table' : '« ' + pris[0].nom + ' » est déjà ' + dejaALaTable(persoALaTable(pris[0].nom))) + ' : renomme-' + (pris.length > 1 ? 'les' : 'le') + ' d’un côté ou de l’autre avant d’importer.';
  return {ok:true, o:o, nom:String(o.nom || '').trim(), msg:bouts.join(', ') + '.' + (autres > 1 ? ' Ce fichier a ' + autres + ' campagnes : elles n’en feront qu’une.' : ''), bloque:bloque};
}
/* la table du fichier, renumérotée pour devenir la campagne cid : rien n'est touché ici, on rend la table à fondre */
function renumeroterTable(o, cid, nom, t){
  const x = videTable();
  const rand = () => Math.random().toString(36).slice(2, 6);
  const mp = {}, ms = {}, mm = {};
  /* ses personnages : leur identifiant, s'il est déjà pris, est remplacé */
  vivantsDe(o.personnages).forEach(id => { mp[id] = T.personnages[id] || x.personnages[id] ? id + '-' + rand() : id; x.personnages[mp[id]] = null; });
  /* ses séances : le nom de la campagne, puis le numéro */
  const pris = {};
  vivantsDe(o.journal).sort((a, b) => (parseFloat(o.journal[a].seance) || 0) - (parseFloat(o.journal[b].seance) || 0) || (a < b ? -1 : 1)).forEach(id => {
    let n = 's-' + cid.replace(/^c-/, '') + '-' + slug(o.journal[id].seance);
    while(T.journal[n] || pris[n]) n += '-' + rand();
    pris[n] = 1; ms[id] = n;
  });
  /* ses missions : celles du tableau restent les mêmes ; celles qui ont été jouées gardent leur histoire sous un nom neuf, pour ne pas se heurter à la même, jouée ici */
  vivantsDe(o.missions).forEach(id => { const m = o.missions[id]; if(m.etat === 'tableau') mm[id] = id; else if(ms[m.seance]) mm[id] = nouvelId('m'); });
  let ecartees = 0;
  vivantsDe(o.missions).forEach(id => { if(!mm[id]){ ecartees++; return; } const m = o.missions[id]; x.missions[mm[id]] = Object.assign({}, m, {id:mm[id], seance:ms[m.seance] || '', fin:ms[m.fin] || ''}); });
  const pj = r => r && r.indexOf('pj:') === 0 && mp[r.slice(3)] ? 'pj:' + mp[r.slice(3)] : r;
  /* ceux de la table */
  vivantsDe(o.personnages).forEach(id => {
    const y = JSON.parse(JSON.stringify(o.personnages[id]));
    y.id = mp[id]; y.campagne = cid; y.campagneT = t;
    (y.prog.points || []).forEach(p => { if(p.mission && mm[p.mission]) p.mission = mm[p.mission]; });
    x.personnages[y.id] = y;
  });
  vivantsDe(o.journal).forEach(id => { x.journal[ms[id]] = Object.assign({}, o.journal[id], {id:ms[id], campagne:cid, campagneT:t}); });
  vivantsDe(o.blocs).forEach(id => {
    const b = o.blocs[id]; if(!ms[b.seance]) return;
    const nid = id.indexOf('b-ancien-') === 0 && ms[id.slice(9)] ? 'b-ancien-' + ms[id.slice(9)] : id;
    const q = Object.assign({}, b.qui); if(q.k === 'perso' && mp[q.id]) q.id = mp[q.id];
    x.blocs[nid] = Object.assign({}, b, {id:nid, seance:ms[b.seance], qui:q, vies:b.vies.map(v => mp[v.id] ? Object.assign({}, v, {id:mp[v.id]}) : v)});
  });
  vivantsDe(o.rencontres).forEach(id => { const r = o.rencontres[id]; if(ms[r.seance]) x.rencontres[id] = Object.assign({}, r, {seance:ms[r.seance]}); });
  vivantsDe(o.adversaires).forEach(id => { if(x.rencontres[o.adversaires[id].rencontre]) x.adversaires[id] = o.adversaires[id]; });
  /* le sac et la bourse, tombes comprises : l'objet jeté ou la ligne défaite empêchent le sac et la bourse d'avant, restés écrits sur la fiche, de repasser */
  Object.keys(o.objets || {}).forEach(id => {
    const ob = o.objets[id]; if(!ob || !mp[ob.perso]) return;
    const nid = mp[ob.perso] !== ob.perso && id.indexOf('o-' + ob.perso + '-') === 0 ? 'o-' + mp[ob.perso] + '-' + id.slice(('o-' + ob.perso + '-').length) : id;
    x.objets[nid] = Object.assign({}, ob, {id:nid, perso:mp[ob.perso]});
  });
  Object.keys(o.argent || {}).forEach(id => {
    const a = o.argent[id]; if(!a || !mp[a.perso]) return;
    const nm = a.mission ? (mm[a.mission] || a.mission) : '';
    let nid = id;
    if(a.mission && id === 'arg-' + a.mission + '-' + a.perso) nid = 'arg-' + nm + '-' + mp[a.perso];
    else if(mp[a.perso] !== a.perso && id.indexOf('arg-' + a.perso + '-') === 0) nid = 'arg-' + mp[a.perso] + '-' + id.slice(('arg-' + a.perso + '-').length);
    x.argent[nid] = Object.assign({}, a, {id:nid, perso:mp[a.perso], mission:nm, seance:ms[a.seance] || ''});
  });
  /* le monde : ses PNJ, et les liens entre ceux qui ont un visage ici */
  vivantsDe(o.pnj).forEach(id => { const p = o.pnj[id]; x.pnj[id] = Object.assign({}, p, {seance:ms[p.seance] || '', pj:mp[p.pj] || ''}); });
  vivantsDe(o.lieux || {}).forEach(id => { const l = o.lieux[id]; x.lieux[id] = Object.assign({}, l, {seance:ms[l.seance] || ''}); });
  const visage = r => !!r && (r.indexOf('pj:') === 0 ? !!x.personnages[mp[r.slice(3)]] : r.indexOf('pnj:') === 0 ? !!x.pnj[r.slice(4)] : false);
  vivantsDe(o.liens).forEach(id => {
    const l = o.liens[id]; if(!visage(l.de) || !visage(l.vers)) return;
    x.liens[id] = Object.assign({}, l, {de:pj(l.de), vers:pj(l.vers), depuis:ms[l.depuis] || '',
      hist:(l.hist || []).map(h => Object.assign({}, h, {de:pj(h.de), vers:pj(h.vers), depuis:ms[h.depuis] || '', jusqua:ms[h.jusqua] || ''}))});
  });
  Object.keys(o.positions || {}).forEach(r => { const p = o.positions[r]; if(p && !p.supprime && visage(r)) x.positions[pj(r)] = p; });
  x.jets = (o.jets || []).map(j => Object.assign({}, j, {campagne:cid}));
  x.campagnes[cid] = normCampagne({id:cid, nom:nom, majNom:t, maj:t, creee:t, auteur:MOI.joueur || ''});
  Object.keys(x.personnages).forEach(k => { if(!x.personnages[k]) delete x.personnages[k]; });
  return {x:x, ecartees:ecartees};
}
function importerCampagne(txt, nom){
  const a = apercuTable(txt); if(!a.ok) return a;
  nom = nomPropre(nom);
  if(!nom) return {ok:false, msg:'Donne un nom à la campagne.'};
  if(campagnes().some(c => memeCampagne(c.nom, nom))) return {ok:false, msg:'Une campagne s’appelle déjà « ' + nom + ' ».'};
  if(a.bloque) return {ok:false, msg:a.bloque};
  if(!campagnes().length) migrerCampagnes();   /* d'abord la première, pour que ce qui n'a pas de campagne lui reste */
  let id = 'c-' + slug(nom);
  if(T.campagnes[id]) id += '-' + Math.random().toString(36).slice(2, 6);
  const t = maintenant(), r = renumeroterTable(a.o, id, nom, t);
  const avant = {pnj:vivantsDe(T.pnj).length};
  changer(() => { T = fusionner(T, r.x); });
  passerACampagne(id);
  sauverLocal(); dessiner();
  const k = (n, un, plus) => n + ' ' + (n > 1 ? plus : un);
  const nPnj = vivantsDe(r.x.pnj).length, neufs = vivantsDe(T.pnj).length - avant.pnj;
  return {ok:true, id:id, msg:'« ' + nom + ' » est ajoutée : ' + [k(vivantsDe(r.x.personnages).length, 'personnage', 'personnages'), k(vivantsDe(r.x.journal).length, 'séance', 'séances'),
    k(nPnj, 'fiche de PNJ', 'fiches de PNJ') + (nPnj - neufs > 0 ? ' dont ' + (nPnj - neufs) + ' que le monde connaissait déjà' : '')].join(', ') + '.'
    + (r.ecartees ? ' ' + k(r.ecartees, 'mission', 'missions') + ' sans séance ' + (r.ecartees > 1 ? 'ont été laissées' : 'a été laissée') + ' de côté.' : '')};
}

/* ---------- les jets d'une campagne ---------- */
const jetsDe = cid => { const def = campagneParDefaut(); return T.jets.filter(j => campagneEffDans(T, j.campagne, def) === cid); };
/* un jet de plus, dans la campagne qu'on suit ; quatre cents par campagne */
function ajouterJet(j){
  j.campagne = idCourante();
  const def = campagneParDefaut(), compte = {};
  T.jets = T.jets.concat([j]).reverse().filter(x => { const c = campagneEffDans(T, x.campagne, def); compte[c] = (compte[c] || 0) + 1; return compte[c] <= MAX_JETS; }).reverse();
}
/* vider l'historique d'une campagne seulement */
function viderJets(){
  const c = campagneCourante(), t = maintenant();
  if(!c){ T.viderAvant = t; T.jets = []; return; }
  T.campagnes[c.id] = Object.assign({}, c, {jetsAvant:t, maj:t});
  const def = campagneParDefaut();
  T.jets = T.jets.filter(j => campagneEffDans(T, j.campagne, def) !== c.id);
}

/* ---------- la liste, et ce qu'on fait des campagnes ---------- */
function dessinerCampagnes(){
  const s = $('tbCampagne');
  /* dans les autres pages, la liste ne se montre que s'il y a de quoi choisir */
  const barre = $('cbarre'); if(barre) barre.hidden = !plusieursCampagnes();
  if(s){
    const l = campagnes(), cur = campagneCourante();
    /* la liste ne se refait que si elle a changé : une liste ouverte ne se ferme pas sous les doigts */
    const sig = JSON.stringify([l.map(c => [c.id, c.nom, c.etat]), cur ? cur.id : '']);
    if(s._sig !== sig){
      s._sig = sig;
      s.innerHTML = '';
      if(!l.length || !cur){ s.add(new Option('Pas encore de campagne', '')); s.disabled = true; }
      else {
        s.disabled = false;
        l.filter(c => c.etat !== 'finie').forEach(c => s.add(new Option(c.nom, c.id)));
        const fin = l.filter(c => c.etat === 'finie');
        if(fin.length){ const g = el('optgroup'); g.label = 'Terminées'; fin.forEach(c => g.append(new Option(c.nom, c.id))); s.append(g); }
        s.value = cur.id;
      }
    } else if(cur && s.value !== cur.id && document.activeElement !== s) s.value = cur.id;
  }
  dessinerGestionCampagnes(false);
}
/* un bouton à deux temps : le premier clic arme, le second agit. Cinq secondes, sans rien redessiner sous les doigts */
function deuxTempsCampagne(cle, txt, confirme, fn){
  const arme = CAMP.arme === cle;
  const b = el('button', 'btn ghost sm' + (arme ? ' danger' : ''), arme ? confirme : txt); b.type = 'button'; b.id = 'camp-' + cle;
  b.onclick = () => {
    if(CAMP.arme === cle){ CAMP.arme = ''; fn(); return; }
    CAMP.arme = cle; dessinerGestionCampagnes(true);
    const y = $('camp-' + cle); if(y) y.focus();
    setTimeout(() => {
      if(CAMP.arme !== cle) return;
      CAMP.arme = '';
      const x = $('camp-' + cle);
      if(x && x.textContent === confirme){ x.textContent = txt; x.classList.remove('danger'); }
    }, 5000);
  };
  return b;
}
function dessinerGestionCampagnes(force){
  const box = $('tbCampagnes'); if(!box) return;
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerGestionCampagnes(true)); return; }
  const focus = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : '';
  box.innerHTML = '';
  const c = campagneCourante();
  if(c) box.append(el('p','mini cresume', resumeCampagne(c)));
  const dit = r => { if(r.msg) msgTable(r.msg, r.ok); };
  if(CAMP.mode){
    const nouveau = CAMP.mode === 'nouvelle', importer = CAMP.mode === 'importer';
    const f = el('div','cform');
    if(importer){
      f.append(el('p','mini', 'Une table jouée à part, un autre navigateur, un autre dépôt : ses personnages, ses séances et ses missions deviennent une campagne de plus, avec leurs propres numéros. Ses PNJ et leurs liens rejoignent le monde commun, où un nom reste une personne.'));
      const l1 = el('label','lab','La table à ajouter, un fichier .json'); l1.htmlFor = 'campFichier';
      const fi = el('input'); fi.type = 'file'; fi.id = 'campFichier'; fi.accept = '.json,application/json';
      fi.onchange = () => {
        const fh = fi.files && fi.files[0]; if(!fh) return;
        const lec = new FileReader();
        lec.onload = () => {
          const txt = String(lec.result), a = apercuTable(txt);
          CAMP.fichier = a.ok ? txt : ''; CAMP.apercu = a; CAMP.fichierNom = fh.name;
          if(a.ok && !CAMP.nom) CAMP.nom = a.nom;
          dessinerGestionCampagnes(true);
          const y = $('campNom'); if(y) y.focus();
        };
        lec.readAsText(fh);
      };
      f.append(l1, fi);
      const ap = CAMP.apercu;
      if(ap){
        const p = el('p', 'note ' + (!ap.ok || ap.bloque ? 'err' : 'ok'), !ap.ok ? ap.msg : (CAMP.fichierNom ? '« ' + CAMP.fichierNom + ' » : ' : '') + ap.msg + (ap.bloque ? ' ' + ap.bloque : ''));
        p.id = 'campApercu';
        f.append(p);
      }
    }
    const lab = el('label','lab', nouveau ? 'Nom de la nouvelle campagne' : importer ? 'Nom de la campagne ajoutée' : 'Nouveau nom de « ' + (c ? c.nom : '') + ' »'); lab.htmlFor = 'campNom';
    const i = el('input'); i.type = 'text'; i.id = 'campNom'; i.value = CAMP.nom; i.maxLength = 80; i.style.width = '100%';
    i.placeholder = nouveau || importer ? 'La campagne d’Océane' : '';
    i.oninput = () => { CAMP.nom = i.value; };
    const ok = el('button','btn sm', nouveau ? 'Créer la campagne' : importer ? 'Ajouter la campagne' : 'Enregistrer'); ok.type = 'button'; ok.id = 'campOk';
    ok.disabled = importer && (!CAMP.fichier || !!(CAMP.apercu && CAMP.apercu.bloque));
    const non = el('button','btn ghost sm','Annuler'); non.type = 'button'; non.id = 'campAnnuler';
    const valider = () => {
      if(ok.disabled) return;
      const r = nouveau ? nouvelleCampagne(CAMP.nom) : importer ? importerCampagne(CAMP.fichier, CAMP.nom) : renommerCampagne(c.id, CAMP.nom);
      if(!r.ok){ msgTable(r.msg, false); const y = $('campNom'); if(y) y.focus(); return; }
      CAMP.mode = ''; CAMP.nom = ''; CAMP.fichier = ''; CAMP.fichierNom = ''; CAMP.apercu = null;
      dessinerGestionCampagnes(true);
      dit(r);
      const y = $('tbCampagne'); if(y) y.focus({preventScroll:true});
    };
    ok.onclick = valider;
    non.onclick = () => { CAMP.mode = ''; CAMP.nom = ''; CAMP.fichier = ''; CAMP.fichierNom = ''; CAMP.apercu = null; dessinerGestionCampagnes(true); const y = $(nouveau ? 'campNouvelle' : importer ? 'campImporter' : 'campRenommer'); if(y) y.focus(); };
    i.onkeydown = ev => {
      if(ev.key === 'Enter' && !ev.isComposing){ ev.preventDefault(); valider(); }
      if(ev.key === 'Escape'){ ev.preventDefault(); non.click(); }
    };
    const a = el('div','acts'); a.append(ok, non);
    f.append(lab, i, a);
    box.append(f);
    if(focus && $(focus)) $(focus).focus({preventScroll:true});
    return;
  }
  const a = el('div','acts');
  const nv = el('button','btn ghost sm','Nouvelle campagne'); nv.type = 'button'; nv.id = 'campNouvelle';
  nv.onclick = () => { CAMP.mode = 'nouvelle'; CAMP.nom = ''; CAMP.arme = ''; dessinerGestionCampagnes(true); const y = $('campNom'); if(y) y.focus(); };
  a.append(nv);
  const im = el('button','btn ghost sm','Ajouter une table comme campagne'); im.type = 'button'; im.id = 'campImporter';
  im.title = 'Le .json d’une table jouée à part devient une campagne de plus';
  im.onclick = () => { CAMP.mode = 'importer'; CAMP.nom = ''; CAMP.arme = ''; CAMP.fichier = ''; CAMP.fichierNom = ''; CAMP.apercu = null; dessinerGestionCampagnes(true); const y = $('campFichier'); if(y) y.focus(); };
  a.append(im);
  if(c){
    const rn = el('button','btn ghost sm','Renommer'); rn.type = 'button'; rn.id = 'campRenommer';
    rn.onclick = () => { CAMP.mode = 'renommer'; CAMP.nom = c.nom; CAMP.arme = ''; dessinerGestionCampagnes(true); const y = $('campNom'); if(y){ y.focus(); y.select(); } };
    a.append(rn);
    if(c.etat === 'finie'){
      const ro = el('button','btn ghost sm','Rouvrir la campagne'); ro.type = 'button'; ro.id = 'campRouvrir';
      ro.onclick = () => dit(rouvrirCampagne(c.id));
      a.append(ro);
    } else {
      const n = persosDe(c.id).length;
      a.append(deuxTempsCampagne('clore', 'Clore la campagne', n ? 'Confirmer : ' + (n > 1 ? 'les ' + n + ' personnages entrent' : 'le personnage entre') + ' dans le monde' : 'Confirmer : la campagne est terminée',
        () => dit(cloreCampagne(c.id))));
    }
    if(campagnes().length > 1 && campagneVide(c.id)) a.append(deuxTempsCampagne('supprimer', 'Retirer cette campagne', 'Confirmer : elle est retirée', () => dit(supprimerCampagne(c.id))));
  }
  box.append(a);
  if(focus && $(focus)) $(focus).focus({preventScroll:true});
}
