/* ============ le monde en ligne : écouter et écrire les documents Firestore ============
   La mécanique commune aux registres qui vivent dans Firestore (FB_DB et COMPTE viennent du paquet compte).
   - On ne relit que le neuf : chaque écoute demande les documents dont majS (l'heure du serveur) est
     plus récente que le dernier vu, gardé dans ce navigateur avec le cache local. Un nouvel appareil
     lit tout une fois, puis seulement ce qui change : c'est ce qui tient le forfait gratuit.
   - On n'écrit que ce qui a changé : chaque document est comparé à son « ombre », la dernière version
     reçue du serveur, groupe par groupe (f, e, c) ; seuls les groupes différents partent.
   - Ce que le serveur refuse (ce n'est pas à toi) revient à l'ombre, et on le dit.
   Les règles de firestore.rules ont le dernier mot ; ce module ne fait que les suivre. */

const MONDE_MARGE = 120000;          // on relit deux minutes avant le dernier vu : rien ne passe entre deux écritures
const MONDE_OMBRES = {};             // collection → id → le document tel que le serveur l'a
const MONDE_ECOUTES = {};            // clé d'écoute → fonction pour l'arrêter

function mondeCleCurseurs(){ return 'faelorenn.curseurs.' + COMPTE.uid; }
function mondeCurseurs(){
  try{ return JSON.parse(localStorage.getItem(mondeCleCurseurs()) || '{}') || {}; }catch(e){ return {}; }
}
function mondeGarderCurseur(cle, t){
  const c = mondeCurseurs();
  if((c[cle] || 0) >= t) return;
  c[cle] = t;
  try{ localStorage.setItem(mondeCleCurseurs(), JSON.stringify(c)); }catch(e){}
}
/* le cache local a été vidé (autre compte, navigateur nettoyé) : on relit tout */
function mondeOublierCurseurs(){ try{ localStorage.removeItem(mondeCleCurseurs()); }catch(e){} }

/* un groupe JSON d'un document (f, e, c) : l'objet, ou {} s'il manque ou ne se lit pas */
function formeJson(s){
  if(typeof s !== 'string' || !s) return {};
  try{ const o = JSON.parse(s); return o && typeof o === 'object' ? o : {}; }catch(e){ return {}; }
}
function mondeOmbre(col, id){ return (MONDE_OMBRES[col] || {})[id] || null; }
function mondeGarderOmbre(col, id, d){ (MONDE_OMBRES[col] = MONDE_OMBRES[col] || {})[id] = d; }
function mondeProprio(col, id){ const o = mondeOmbre(col, id); return o ? {uid:o.proprietaire, nom:o.proprietaireNom} : null; }
function mondeTemps(t){ return t && typeof t.toMillis === 'function' ? t.toMillis() : 0; }

/* écouter une requête, seulement le neuf. surDocs reçoit [{id, data}] ; la clé distingue les écoutes.
   surServeur est appelé une fois, à la première réponse du serveur (pas du cache), même vide.
   Ce que ce navigateur a déjà lu (jusqu'au curseur) n'est plus redemandé au serveur : on le reprend d'abord
   dans le cache de Firestore, gratuitement, pour que chaque document retrouve son ombre (son propriétaire,
   sa dernière version) après un rechargement. Rien en cache (cache vidé, navigateur sans cache) : on relit tout. */
function mondeEcouter(cle, requete, surDocs, surErreur, depuisMin, surServeur){
  mondeArreter(cle);
  const curseur = mondeCurseurs()[cle] || 0, min = depuisMin || 0;
  const avecMin = q => min ? q.where('majS', '>', firebase.firestore.Timestamp.fromMillis(min)) : q;
  const ecouter = depuis => {
    const q = requete.where('majS', '>', firebase.firestore.Timestamp.fromMillis(depuis));
    let servi = false;
    MONDE_ECOUTES[cle] = q.onSnapshot({includeMetadataChanges:true}, snap => {
      if(!servi && !snap.metadata.fromCache){ servi = true; setTimeout(() => { if(surServeur) surServeur(); }, 0); }
      const docs = [];
      let max = 0;
      snap.docChanges().forEach(ch => {
        if(ch.type === 'removed') return;
        const data = ch.doc.data({serverTimestamps:'estimate'});
        docs.push({id:ch.doc.id, data:data});
        if(!ch.doc.metadata.hasPendingWrites) max = Math.max(max, mondeTemps(data.majS));
      });
      if(docs.length) surDocs(docs);
      // le curseur n'avance que sur ce que le serveur a confirmé
      if(max && !snap.metadata.fromCache) mondeGarderCurseur(cle, max);
    }, e => { if(surErreur) surErreur(e); });
  };
  if(!curseur){ ecouter(min); return; }
  let arrete = false;
  MONDE_ECOUTES[cle] = () => { arrete = true; };
  avecMin(requete).get({source:'cache'}).then(snap => {
    if(arrete) return;
    if(snap.empty){ ecouter(min); return; }
    surDocs(snap.docs.map(d => ({id:d.id, data:d.data({serverTimestamps:'estimate'})})));
    if(!arrete) ecouter(Math.max(0, curseur - MONDE_MARGE, min));
  }, () => { if(!arrete) ecouter(min); });
}
function mondeArreter(cle){ if(MONDE_ECOUTES[cle]){ MONDE_ECOUTES[cle](); delete MONDE_ECOUTES[cle]; } }
function mondeToutArreter(){ Object.keys(MONDE_ECOUTES).forEach(mondeArreter); }

/* écrire un document : création s'il n'a pas d'ombre, sinon seulement les champs qui diffèrent.
   champs : {f, e?, c?, campagne?, perso?, statut?, membres?}. Rend une promesse ; refuse : {code} */
function mondeEcrire(col, id, champs){
  const ref = FB_DB.collection(col).doc(id), ombre = mondeOmbre(col, id);
  const heure = firebase.firestore.FieldValue.serverTimestamp();
  if(!ombre){
    const d = Object.assign({}, champs, {proprietaire:COMPTE.uid, proprietaireNom:COMPTE.nom, cree:heure, majS:heure, modifiePar:COMPTE.uid});
    mondeGarderOmbre(col, id, Object.assign({}, d, {cree:null, majS:null}));
    return ref.set(d).catch(e => {
      delete MONDE_OMBRES[col][id];
      if(!e || e.code !== 'permission-denied') throw e;
      // refusé à la création : le plus souvent, le document existe déjà et ce navigateur ne l'avait pas lu.
      // On le reprend tel que le serveur l'a ; l'appelant le fond dans ce qu'il garde (code « deja-la »)
      return ref.get().then(x => {
        if(!x.exists) throw e;
        const data = x.data({serverTimestamps:'estimate'});
        mondeGarderOmbre(col, id, data);
        throw Object.assign(new Error('Déjà en ligne'), {code:'deja-la', data:data});
      }, () => { throw e; });
    });
  }
  const maj = {};
  Object.keys(champs).forEach(k => { if(JSON.stringify(champs[k]) !== JSON.stringify(ombre[k])) maj[k] = champs[k]; });
  if(!Object.keys(maj).length) return Promise.resolve(false);
  const avant = Object.assign({}, ombre);
  mondeGarderOmbre(col, id, Object.assign({}, ombre, maj));
  return ref.update(Object.assign(maj, {majS:heure, modifiePar:COMPTE.uid})).catch(e => { mondeGarderOmbre(col, id, avant); throw e; });
}

/* ce que le serveur refuse, dit simplement */
function mondeRefus(e){
  if(e && e.code === 'permission-denied') return 'Ce n’est pas à toi de changer ça.';
  if(e && e.code === 'resource-exhausted') return 'Le forfait du jour est atteint : tout reste gardé ici, et repartira demain matin.';
  if(e && (e.code === 'unavailable' || e.code === 'deadline-exceeded')) return 'Hors ligne : tout reste gardé ici, et repartira au retour de la connexion.';
  return 'Erreur en ligne : ' + ((e && (e.message || e.code)) || e);
}

/* ============ les fichiers d'avant, en ligne ============
   Le Havre, le bestiaire, les compétences et les plans parlaient à un fichier du dépôt GitHub (ghcDoc,
   commun/sync-github.js). Une fois le compte entré, ces mêmes registres parlent au monde en ligne, sans
   changer leur façon de faire : mondeDoc a les mêmes gestes que ghcDoc, et range le « fichier » en documents,
   un par pièce (un personnage, une créature, un plan), pour que chacun ait son propriétaire.
   - sections : la partie du fichier → la collection ; statut : privé tant qu'un admin n'a pas validé
   - doc : tout le fichier dans un seul document (les compétences, que seuls les admins écrivent) */
const MONDE_FICHIERS = {
  'personnages.json': {sections:{personnages:'havre'}, format:'faelorenn-personnages', version:1},
  'bestiaire.json':   {sections:{creatures:'creatures', familles:'familles', butins:'butins'}, statut:true, format:'faelorenn-bestiaire', version:3},
  'plans.json':       {sections:{batiments:'plans', villages:'plans', mondes:'plans'}, statut:true, prefixe:true, format:'faelorenn-plans', version:1},
  'competences.json': {doc:['regles', 'maison']}
};
function mondeActif(){ return typeof COMPTE !== 'undefined' && COMPTE.etat === 'dedans' && !!FB_DB; }
// l'identifiant du document d'une pièce : les plans des trois genres partagent une collection
const mondeIdDe = (cfg, section, id) => cfg.prefixe ? section + ':' + id : id;
// la section et l'identifiant d'une pièce, d'après son document
function mondePieceDe(cfg, col, id, data){
  if(cfg.prefixe){ const s = data.section || id.split(':')[0]; return [s, id.slice(s.length + 1)]; }
  return [Object.keys(cfg.sections).find(s => cfg.sections[s] === col), id];
}

/* les écoutes d'une collection : tout pour un admin ; sinon, avec un statut, ce qui est validé et ce qui est à soi */
function mondeRequetes(col, statut){
  const c = FB_DB.collection(col);
  if(!statut || estAdmin()) return [[col, c]];
  return [[col + '@valide', c.where('statut', '==', 'valide')], [col + '@moi', c.where('proprietaire', '==', COMPTE.uid)]];
}

function mondeDoc(o, cfg){
  const d = {nom:o.nom || '', actif:false, erreur:'', dernier:0, lu:false, prevu:false, occupe:false, encore:false, resultat:'', minuteur:null};
  const recu = {};            // section → id → la pièce telle que le serveur l'a ; doc → tout le fichier
  const cles = [];
  let version = cfg.version || 1;
  const signaler = () => { try{ if(o.etat) o.etat(d); }catch(e){} };
  d.chemin = () => o.chemin;
  d.enAttente = () => d.actif && (d.prevu || d.occupe);

  // le « fichier » tel que le monde en ligne l'a
  const fichier = () => {
    if(cfg.doc) return recu.doc || null;
    const f = {format:o.format, version:version};
    Object.keys(cfg.sections).forEach(s => { f[s] = Object.assign({}, recu[s] || {}); });
    return f;
  };
  const vide = () => cfg.doc ? !recu.doc : Object.keys(cfg.sections).every(s => !Object.keys(recu[s] || {}).length);
  const servir = () => {
    d.dernier = Date.now();
    if(vide()){ if(o.absent) o.absent(); }
    else o.recevoir(fichier());
    if(vide() || (o.enAvance && o.enAvance(fichier()))) d.planifier();
    signaler();
  };

  d.lire = function(){ return Promise.resolve(vide() ? {absent:true} : {obj:fichier()}); };
  d.demarrer = function(){
    if(d.actif) return Promise.resolve(null);
    if(!mondeActif()) return Promise.resolve(false);
    d.actif = true; d.lu = false; d.erreur = '';
    signaler();
    return new Promise(fini => {
      let attendues = 0;
      const premiere = () => { if(--attendues <= 0 && !d.lu){ d.lu = true; servir(); fini({obj:fichier()}); } };
      const erreur = e => { d.erreur = mondeRefus(e); signaler(); premiere(); };
      if(cfg.doc){
        attendues = 1;
        let une = true;
        const cle = 'doc:' + cfg.doc.join('/');
        mondeArreter(cle);
        MONDE_ECOUTES[cle] = FB_DB.collection(cfg.doc[0]).doc(cfg.doc[1]).onSnapshot({includeMetadataChanges:true}, s => {
          if(s.exists){ const data = s.data({serverTimestamps:'estimate'}); mondeGarderOmbre(cfg.doc[0], cfg.doc[1], data); recu.doc = formeJson(data.f); }
          if(s.metadata.fromCache) return;
          if(une){ une = false; premiere(); } else if(d.lu) servir();
        }, erreur);
        cles.push(cle);
        return;
      }
      const cols = {};
      Object.keys(cfg.sections).forEach(s => { cols[cfg.sections[s]] = 1; });
      Object.keys(cols).forEach(col => mondeRequetes(col, cfg.statut).forEach(([cle, q]) => {
        attendues++;
        cles.push(cle);
        mondeEcouter(cle, q, docs => {
          docs.forEach(({id, data}) => {
            mondeGarderOmbre(col, id, data);
            const [s, pid] = mondePieceDe(cfg, col, id, data);
            if(s) (recu[s] = recu[s] || {})[pid] = formeJson(data.f);
          });
          if(d.lu) servir();
        }, erreur, 0, premiere);
      }));
    });
  };

  // ce qui est à écrire : chaque pièce qui diffère de ce que le serveur a, et qu'on a le droit de changer
  d.ecrire = function(){
    if(!d.actif) return Promise.resolve(false);
    if(d.occupe){ d.encore = true; return Promise.resolve(false); }
    clearTimeout(d.minuteur);
    d.prevu = false; d.occupe = true;
    const c = o.contenu();
    if(c && c.version) version = c.version;
    const travaux = [], refus = [];
    let repris = false;          // des pièces déjà en ligne, reprises du serveur : le registre les reçoit
    if(cfg.doc){
      const f = JSON.stringify(c);
      if(JSON.stringify(recu.doc) !== f){
        if(!estAdmin()) refus.push('doc');
        else travaux.push(mondeEcrire(cfg.doc[0], cfg.doc[1], {f:f}).then(() => { recu.doc = JSON.parse(f); }));
      }
    } else Object.keys(cfg.sections).forEach(s => {
      const col = cfg.sections[s];
      Object.keys((c && c[s]) || {}).forEach(id => {
        const x = c[s][id], f = JSON.stringify(x);
        if(JSON.stringify((recu[s] || {})[id]) === f) return;
        const did = mondeIdDe(cfg, s, id), ombre = mondeOmbre(col, did);
        if(ombre && ombre.proprietaire !== COMPTE.uid && !estAdmin()){ refus.push(id); return; }
        const champs = {f:f};
        if(cfg.prefixe) champs.section = s;
        // une pièce nouvelle reste privée ; une pièce validée que son créateur retouche repasse en proposition
        if(cfg.statut) champs.statut = !ombre ? 'prive' : (ombre.statut === 'valide' && !estAdmin() ? 'propose' : (ombre.statut || 'prive'));
        travaux.push(mondeEcrire(col, did, champs).then(() => { (recu[s] = recu[s] || {})[id] = JSON.parse(f); }, e => {
          // déjà en ligne : on reprend la version du serveur, qui sera servie au registre
          if(e && e.code === 'deja-la'){ (recu[s] = recu[s] || {})[id] = formeJson(e.data.f); repris = true; return; }
          throw e;
        }));
      });
    });
    return Promise.all(travaux).then(() => {
      d.resultat = travaux.length ? 'ecrit' : 'rien';
      d.erreur = !refus.length ? '' : cfg.doc ? 'Seuls les admins changent les compétences : propose ton changement à la place.'
        : refus.length + ' pièce' + (refus.length > 1 ? 's' : '') + ' d’un autre joueur : elle' + (refus.length > 1 ? 's ne sont' : ' n’est') + ' pas à toi, rien ne part.';
      if(o.ecrit) o.ecrit(true, !travaux.length);
      return true;
    }, e => {
      d.erreur = mondeRefus(e);
      if(o.ecrit) o.ecrit(false, false);
      return false;
    }).then(v => {
      d.occupe = false;
      if(repris && d.lu) servir();
      if(d.encore){ d.encore = false; d.planifier(0); }
      d.dernier = Date.now();
      signaler();
      return v;
    });
  };
  d.maintenant = function(){
    if(!d.actif) return Promise.resolve({ok:false, msg:d.erreur || 'Le monde en ligne n’est pas encore lu.'});
    return d.ecrire().then(ok => ok && !d.erreur ? {ok:true, rien:d.resultat === 'rien'} : {ok:false, msg:d.erreur || 'L’écriture n’a pas pu partir.'});
  };
  d.planifier = function(delai){
    if(!d.actif) return;
    clearTimeout(d.minuteur);
    d.prevu = true;
    d.minuteur = setTimeout(d.ecrire, delai == null ? 1500 : delai);
  };
  d.arreter = function(){
    d.actif = false; d.prevu = false;
    clearTimeout(d.minuteur);
    cles.splice(0).forEach(mondeArreter);
    signaler();
  };
  return d;
}

/* lire un « fichier » une fois, sans le suivre (le registre de la table lit le Havre, le bestiaire, les plans) */
function mondeLireFichier(chemin){
  const cfg = MONDE_FICHIERS[chemin];
  if(!cfg || !mondeActif()) return Promise.resolve(null);
  if(cfg.doc) return FB_DB.collection(cfg.doc[0]).doc(cfg.doc[1]).get().then(s => s.exists ? formeJson(s.data().f) : null);
  const f = {format:cfg.format, version:cfg.version};
  Object.keys(cfg.sections).forEach(s => { f[s] = {}; });
  const cols = {};
  Object.keys(cfg.sections).forEach(s => { cols[cfg.sections[s]] = 1; });
  return Promise.all(Object.keys(cols).map(col => Promise.all(mondeRequetes(col, cfg.statut).map(([, q]) => q.get())).then(snaps => {
    snaps.forEach(snap => snap.docs.forEach(doc => {
      const [s, pid] = mondePieceDe(cfg, col, doc.id, doc.data());
      if(s) f[s][pid] = formeJson(doc.data().f);
    }));
  }))).then(() => f);
}
