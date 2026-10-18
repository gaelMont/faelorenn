/* ============ « … écrit » : qui est en train d'écrire, à la table ============
   Pendant qu'on tape dans le compositeur, un petit document (frappe/<uid>) dit à la campagne qui écrit, et dans
   quelle séance ; le texte, lui, ne part qu'avec « Ajouter ». Les autres voient « Yvellis écrit… », les points
   qui défilent, jusqu'à ce que le paragraphe arrive. On réécrit au plus toutes les 2,5 s pendant la frappe, et
   l'on s'arrête dès que le texte est envoyé, effacé, ou qu'on ne tape plus depuis 5 s. */

const FRAPPE = {
  actif: false, envoye: 0, tape: 0,       // ce que j'ai dit de moi, quand, et ma dernière frappe
  campagne: '', ecoute: null,             // la campagne écoutée, et de quoi arrêter l'écoute
  autres: {},                             // uid → {nom, seance, actif, recu}
  premier: true
};
const FRAPPE_REDIRE = 2500, FRAPPE_SILENCE = 5000, FRAPPE_OUBLI = 8000;

function frappeEnLigne(){ return PAGE === 'table' && SYNC.etat === 'enligne' && EN_LIGNE.pret && typeof FB_DB !== 'undefined' && FB_DB; }
function frappeCampagne(){ return formeCampagneEff(T, idCourante()); }
// qui écrit, tel que les autres le liront : le personnage, ou le MJ et un PNJ avec le nom du joueur
function frappeNom(){
  const q = COMPO.qui;
  if(q.k === 'perso') return nomDe(q) || COMPTE.nom;
  return (q.k === 'pnj' ? nomDe(q) : 'Le MJ') + ' (' + COMPTE.nom + ')';
}
function frappeDire(actif){
  if(!frappeEnLigne()) return;
  const e = seanceCourante(), cid = frappeCampagne();
  if(!e || !membreDe(cid)) return;
  FRAPPE.actif = actif; FRAPPE.envoye = Date.now();
  FB_DB.collection('frappe').doc(COMPTE.uid).set({campagne:cid, seance:e.id, nom:frappeNom().slice(0, 80), actif:actif,
    t:firebase.firestore.FieldValue.serverTimestamp()}).catch(() => {});
}
// à chaque frappe : on le dit tout de suite la première fois, puis de temps en temps
function frappeTape(){
  FRAPPE.tape = Date.now();
  const t = $('coTexte');
  if(!t || !t.value.trim()){ if(FRAPPE.actif) frappeDire(false); return; }
  if(!FRAPPE.actif || Date.now() - FRAPPE.envoye > FRAPPE_REDIRE) frappeDire(true);
}

/* ---------- les autres ---------- */
function frappeSuivre(){
  const cid = frappeEnLigne() ? frappeCampagne() : '';
  const ok = cid && membreDe(cid);
  if((ok ? cid : '') === FRAPPE.campagne) return;
  if(FRAPPE.ecoute){ FRAPPE.ecoute(); FRAPPE.ecoute = null; }
  FRAPPE.campagne = ok ? cid : ''; FRAPPE.autres = {}; FRAPPE.premier = true;
  frappeDessiner();
  if(!ok) return;
  FRAPPE.ecoute = FB_DB.collection('frappe').where('campagne', '==', cid).onSnapshot(snap => {
    const maintenant = Date.now();
    snap.docChanges().forEach(ch => {
      if(ch.doc.id === COMPTE.uid) return;
      if(ch.type === 'removed'){ delete FRAPPE.autres[ch.doc.id]; return; }
      const v = ch.doc.data({serverTimestamps:'estimate'});
      // à l'ouverture, un vieux « écrit » (un onglet fermé en pleine frappe) ne compte pas
      if(FRAPPE.premier && (!v.t || maintenant - v.t.toMillis() > FRAPPE_OUBLI)) return;
      FRAPPE.autres[ch.doc.id] = {nom:v.nom || 'Quelqu’un', seance:v.seance, actif:!!v.actif, recu:maintenant};
    });
    FRAPPE.premier = false;
    frappeDessiner();
  }, () => {});
}
function frappeDessiner(){
  const box = $('seFrappe'); if(!box) return;
  const e = seanceCourante(), maintenant = Date.now();
  const noms = Object.values(FRAPPE.autres).filter(a => a.actif && e && a.seance === e.id && maintenant - a.recu < FRAPPE_OUBLI).map(a => a.nom);
  const texte = !noms.length ? '' : noms.length === 1 ? noms[0] + ' écrit' : noms.slice(0, -1).join(', ') + ' et ' + noms[noms.length - 1] + ' écrivent';
  if(box.dataset.texte === texte) return;
  box.dataset.texte = texte;
  box.hidden = !texte;
  box.replaceChildren();
  if(texte){ box.append(document.createTextNode(texte)); const p = el('span', 'points'); p.setAttribute('aria-hidden', 'true'); box.append(p); }
}

if(PAGE === 'table' && $('coTexte')){
  $('coTexte').addEventListener('input', frappeTape);
  setInterval(() => {
    frappeSuivre();
    // le texte est parti (ou effacé), ou l'on ne tape plus : on le dit
    const t = $('coTexte');
    if(FRAPPE.actif && (!t.value.trim() || Date.now() - FRAPPE.tape > FRAPPE_SILENCE)) frappeDire(false);
    frappeDessiner();
  }, 500);
  window.addEventListener('pagehide', () => { if(FRAPPE.actif) frappeDire(false); });
}
