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

function mondeOmbre(col, id){ return (MONDE_OMBRES[col] || {})[id] || null; }
function mondeGarderOmbre(col, id, d){ (MONDE_OMBRES[col] = MONDE_OMBRES[col] || {})[id] = d; }
function mondeProprio(col, id){ const o = mondeOmbre(col, id); return o ? {uid:o.proprietaire, nom:o.proprietaireNom} : null; }
function mondeTemps(t){ return t && typeof t.toMillis === 'function' ? t.toMillis() : 0; }

/* écouter une requête, seulement le neuf. surDocs reçoit [{id, data}] ; la clé distingue les écoutes.
   surServeur est appelé une fois, à la première réponse du serveur (pas du cache), même vide */
function mondeEcouter(cle, requete, surDocs, surErreur, depuisMin, surServeur){
  mondeArreter(cle);
  const depuis = Math.max(0, (mondeCurseurs()[cle] || 0) - MONDE_MARGE, depuisMin || 0);
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
    return ref.set(d).catch(e => { delete MONDE_OMBRES[col][id]; throw e; });
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
