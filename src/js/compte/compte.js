/* ============ le compte : on n'entre dans les registres qu'invité ============
   Chaque page commence voilée (classe fae-verrou sur <html>). Ce module ouvre la porte :
   - dehors : se connecter, avec Google ou un e-mail et un mot de passe ;
   - pas invité : coller le lien d'invitation reçu, ou demander l'entrée à un admin ;
   - invité : le voile tombe, le pseudo du compte devient « Tu es » dans tous les registres,
     et la pastille du compte prend place dans la barre des registres.
   Ce sont les règles Firestore (firestore.rules) qui protègent les données ; la porte n'en est
   que l'accueil. COMPTE et compteQuandPret(fn) servent aux registres. */

const COMPTE = {etat:'attente', uid:'', nom:'', role:'', email:''};
const COMPTE_ATTENTE = [];
const CLE_INVITATION = 'faelorenn.invitation';
let FB_AUTH = null, FB_DB = null;

function compteQuandPret(fn){
  if(COMPTE.etat === 'dedans') fn(COMPTE);
  else COMPTE_ATTENTE.push(fn);
}
function estAdmin(){ return COMPTE.etat === 'dedans' && COMPTE.role === 'admin'; }

document.documentElement.classList.add('fae-verrou');

/* ---------- l'accueil, devant la page ---------- */
function porteNoeud(tag, cls, txt){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(txt != null) e.textContent = txt;
  return e;
}
function porte(){
  let p = document.getElementById('faePorte');
  if(!p){
    p = porteNoeud('div', 'fae-porte'); p.id = 'faePorte';
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-labelledby', 'faePorteTitre');
    (document.body || document.documentElement).append(p);
  }
  return p;
}
// une carte de l'accueil : un titre, un texte, puis ce qu'on y ajoute
function porteCarte(titre, texte){
  const p = porte(); p.innerHTML = '';
  const c = porteNoeud('div', 'fae-porte-carte');
  c.append(porteNoeud('div', 'fae-porte-marque', 'Faelorenn'));
  const h = porteNoeud('h1', null, titre); h.id = 'faePorteTitre'; c.append(h);
  if(texte) c.append(porteNoeud('p', 'fae-porte-texte', texte));
  p.append(c);
  return c;
}
function porteMessage(c){
  const m = porteNoeud('p', 'fae-porte-msg'); m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite');
  c.append(m);
  return (txt, bon) => { m.textContent = txt || ''; m.classList.toggle('bon', !!bon); };
}
function porteBouton(txt, cls, fn){
  const b = porteNoeud('button', 'fae-porte-btn' + (cls ? ' ' + cls : ''), txt); b.type = 'button';
  b.onclick = fn;
  return b;
}
function porteChamp(label, type, auto){
  const l = porteNoeud('label', 'fae-porte-champ');
  l.append(porteNoeud('span', null, label));
  const i = porteNoeud('input'); i.type = type || 'text';
  if(auto) i.autocomplete = auto;
  l.append(i);
  return [l, i];
}

/* les erreurs de Firebase, dites simplement */
function compteErreur(e){
  const code = (e && e.code) || '';
  const dit = {
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cet e-mail.',
    'auth/invalid-email': 'Cette adresse e-mail n’est pas valable.',
    'auth/missing-password': 'Il manque le mot de passe.',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail : connecte-toi.',
    'auth/weak-password': 'Mot de passe trop court : 6 caractères au moins.',
    'auth/popup-closed-by-user': 'Fenêtre fermée avant la fin de la connexion.',
    'auth/cancelled-popup-request': 'Fenêtre fermée avant la fin de la connexion.',
    'auth/popup-blocked': 'Le navigateur a bloqué la fenêtre de connexion : autorise les fenêtres pour ce site.',
    'auth/too-many-requests': 'Trop d’essais : attends un peu avant de recommencer.',
    'auth/network-request-failed': 'Pas de connexion au serveur. Vérifie ta connexion internet.',
    'auth/unauthorized-domain': 'Ce site n’est pas autorisé dans la configuration Firebase.',
    'permission-denied': 'Refusé : cette invitation n’est pas (ou plus) valable pour ce compte.',
    'unavailable': 'Le serveur ne répond pas. Vérifie ta connexion internet.'
  }[code];
  return dit || ('Erreur : ' + ((e && e.message) || e));
}

/* ---------- les écrans de la porte ---------- */
function ecranDehors(){
  COMPTE.etat = 'dehors';
  const c = porteCarte('Les registres de Faelorenn', 'Réservés aux joueurs invités. Connecte-toi pour entrer dans le monde.');
  const dire = porteMessage(c);
  c.insertBefore(porteBouton('Se connecter avec Google', 'principal', () => {
    dire('');
    FB_AUTH.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => dire(compteErreur(e)));
  }), c.lastChild);
  c.insertBefore(porteNoeud('div', 'fae-porte-ou', 'ou avec un e-mail'), c.lastChild);
  const f = porteNoeud('form', 'fae-porte-form');
  const [lm, mail] = porteChamp('E-mail', 'email', 'email');
  const [lp, mdp] = porteChamp('Mot de passe', 'password', 'current-password');
  const actions = porteNoeud('div', 'fae-porte-actions');
  const entrer = porteBouton('Se connecter', null, null); entrer.type = 'submit';
  const creer = porteBouton('Créer un compte', 'discret', () => {
    dire('');
    FB_AUTH.createUserWithEmailAndPassword(mail.value.trim(), mdp.value).catch(e => dire(compteErreur(e)));
  });
  const oubli = porteBouton('Mot de passe oublié ?', 'lien', () => {
    if(!mail.value.trim()){ dire('Écris d’abord ton e-mail, puis clique ici.'); mail.focus(); return; }
    FB_AUTH.sendPasswordResetEmail(mail.value.trim())
      .then(() => dire('Un e-mail pour choisir un nouveau mot de passe vient de partir.', true), e => dire(compteErreur(e)));
  });
  actions.append(entrer, creer);
  f.append(lm, lp, actions, oubli);
  f.onsubmit = ev => {
    ev.preventDefault(); dire('');
    FB_AUTH.signInWithEmailAndPassword(mail.value.trim(), mdp.value).catch(e => dire(compteErreur(e)));
  };
  c.insertBefore(f, c.lastChild);
  if(lireInvitation()) c.insertBefore(porteNoeud('p', 'fae-porte-note', 'Tu as un lien d’invitation : connecte-toi (ou crée ton compte), il sera utilisé ensuite.'), c.lastChild);
}

// le code d'invitation : dans l'adresse (?invitation=…), gardé le temps de la connexion
function lireInvitation(){
  try{
    const u = new URLSearchParams(location.search).get('invitation');
    if(u) sessionStorage.setItem(CLE_INVITATION, u);
    return sessionStorage.getItem(CLE_INVITATION) || '';
  }catch(e){ return ''; }
}
function oublierInvitation(){
  try{ sessionStorage.removeItem(CLE_INVITATION); }catch(e){}
  try{
    const u = new URL(location.href);
    if(u.searchParams.has('invitation')){ u.searchParams.delete('invitation'); history.replaceState(null, '', u.href); }
  }catch(e){}
}
// un lien collé en entier ou le seul code
function codeDe(txt){
  const t = String(txt || '').trim();
  try{ const c = new URL(t).searchParams.get('invitation'); if(c) return c; }catch(e){}
  return t.replace(/^.*invitation=/, '').replace(/[&#].*$/, '');
}

function ecranPasInvite(user){
  COMPTE.etat = 'pas-invite';
  const c = porteCarte('Presque…', 'Tu es connecté, mais ce compte n’a pas encore été invité dans le monde.');
  c.append(porteNoeud('p', 'fae-porte-qui', user.email || user.displayName || ''));
  const dire = porteMessage(c);
  const f = porteNoeud('form', 'fae-porte-form');
  const [li, code] = porteChamp('Ton lien ou ton code d’invitation', 'text', 'off');
  const ok = porteBouton('Utiliser l’invitation', 'principal', null); ok.type = 'submit';
  f.append(li, ok);
  f.onsubmit = ev => {
    ev.preventDefault();
    const k = codeDe(code.value);
    if(!k){ dire('Colle le lien reçu.'); return; }
    try{ sessionStorage.setItem(CLE_INVITATION, k); }catch(e){}
    ecranPseudo(user, k);
  };
  c.insertBefore(f, c.lastChild);
  // sans lien : on demande l'entrée, un admin la voit dans sa page
  const d = porteNoeud('form', 'fae-porte-form');
  d.append(porteNoeud('p', 'fae-porte-note', 'Pas de lien ? Demande l’entrée : un admin la verra.'));
  const [ln, nom] = porteChamp('Ton nom de joueur', 'text', 'nickname');
  nom.value = (user.displayName || '').slice(0, 30);
  const dem = porteBouton('Demander l’entrée', null, null); dem.type = 'submit';
  d.append(ln, dem);
  d.onsubmit = ev => {
    ev.preventDefault();
    const n = nom.value.trim();
    if(n.length < 2 || n.length > 30 || /[<>]/.test(n)){ dire('Un nom de 2 à 30 caractères, sans < ni >.'); return; }
    FB_DB.collection('demandes').doc(user.uid).set({nom:n, email:user.email || '', cree:firebase.firestore.FieldValue.serverTimestamp()})
      .then(() => dire('Demande envoyée. Reviens quand un admin t’aura fait entrer.', true), e => dire(compteErreur(e)));
  };
  c.insertBefore(d, c.lastChild);
  c.insertBefore(porteNoeud('p', 'fae-porte-id', 'Ton identifiant : ' + user.uid), c.lastChild);
  c.insertBefore(porteBouton('Se déconnecter', 'lien', () => FB_AUTH.signOut()), c.lastChild);
}

function ecranPseudo(user, code){
  COMPTE.etat = 'pseudo';
  const c = porteCarte('Bienvenue', 'Choisis ton nom de joueur : c’est lui que les autres verront (« créé par… », « joué par… »). Ton e-mail reste privé.');
  const dire = porteMessage(c);
  const f = porteNoeud('form', 'fae-porte-form');
  const [ln, nom] = porteChamp('Ton nom de joueur', 'text', 'nickname');
  nom.value = (user.displayName || '').slice(0, 30);
  const ok = porteBouton('Entrer dans le monde', 'principal', null); ok.type = 'submit';
  f.append(ln, ok);
  f.onsubmit = ev => {
    ev.preventDefault();
    const n = nom.value.trim();
    if(n.length < 2 || n.length > 30 || /[<>]/.test(n)){ dire('Un nom de 2 à 30 caractères, sans < ni >.'); return; }
    ok.disabled = true; dire('');
    const ref = FB_DB.collection('invitations').doc(code);
    ref.get().then(s => {
      if(!s.exists) throw {code:'permission-denied'};
      const inv = s.data();
      const b = FB_DB.batch(), maint = firebase.firestore.FieldValue.serverTimestamp();
      b.set(FB_DB.collection('comptes').doc(user.uid), {nom:n, role:inv.role, actif:true, invitation:code, cree:maint});
      b.update(ref, {utilisee:true, par:user.uid, le:maint});
      return b.commit();
    }).then(() => { oublierInvitation(); verifierCompte(user); }, e => { ok.disabled = false; dire(compteErreur(e)); });
  };
  c.insertBefore(f, c.lastChild);
  c.insertBefore(porteBouton('Ce n’est pas mon invitation', 'lien', () => { oublierInvitation(); ecranPasInvite(user); }), c.lastChild);
}

function ecranInactif(){
  COMPTE.etat = 'inactif';
  const c = porteCarte('Compte désactivé', 'Un admin a mis ce compte en pause. Demande-lui de le réactiver.');
  c.append(porteBouton('Se déconnecter', 'lien', () => FB_AUTH.signOut()));
}
function ecranPanne(e){
  const c = porteCarte('Le monde est injoignable', compteErreur(e));
  c.append(porteBouton('Réessayer', 'principal', () => location.reload()));
}

/* ---------- dedans ---------- */
function entrerDedans(user, d){
  Object.assign(COMPTE, {etat:'dedans', uid:user.uid, nom:d.nom, role:d.role, email:user.email || ''});
  // le pseudo du compte devient « Tu es » partout, même dans les registres qui lisent encore la clé locale
  try{
    const m = JSON.parse(localStorage.getItem('faelorenn.table.moi') || '{}');
    if(m.joueur !== d.nom){ m.joueur = d.nom; localStorage.setItem('faelorenn.table.moi', JSON.stringify(m)); }
  }catch(e){}
  const p = document.getElementById('faePorte'); if(p) p.remove();
  document.documentElement.classList.remove('fae-verrou');
  // la barre des registres vient après ce script dans la page : la pastille attend qu'elle soit là
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pastilleCompte);
  else pastilleCompte();
  COMPTE_ATTENTE.splice(0).forEach(fn => { try{ fn(COMPTE); }catch(e){ console.error(e); } });
  window.dispatchEvent(new CustomEvent('fae-compte', {detail:COMPTE}));
}

function verifierCompte(user){
  FB_DB.collection('comptes').doc(user.uid).get().then(s => {
    if(s.exists){
      const d = s.data();
      if(d.actif === false){ ecranInactif(); return; }
      oublierInvitation();
      entrerDedans(user, d);
      return;
    }
    const code = lireInvitation();
    if(code) ecranPseudo(user, code); else ecranPasInvite(user);
  }, ecranPanne);
}

/* ---------- la pastille du compte, dans la barre des registres ---------- */
function pastilleCompte(){
  if(document.getElementById('faeCompte')) return;
  const z = porteNoeud('div', 'fae-compte'); z.id = 'faeCompte';
  const b = porteNoeud('button', 'fae-compte-nom', COMPTE.nom); b.type = 'button';
  b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
  const menu = porteNoeud('div', 'fae-compte-menu'); menu.hidden = true;
  const item = (txt, fn) => { const x = porteNoeud('button', null, txt); x.type = 'button'; x.onclick = () => { fermer(); fn(); }; menu.append(x); };
  const fermer = () => { menu.hidden = true; b.setAttribute('aria-expanded', 'false'); };
  b.onclick = () => { menu.hidden = !menu.hidden; b.setAttribute('aria-expanded', String(!menu.hidden)); };
  document.addEventListener('click', e => { if(!z.contains(e.target)) fermer(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') fermer(); });
  item('Changer de nom', changerDeNom);
  if(COMPTE.role === 'admin') item('Administration', () => { location.href = 'admin.html'; });
  item('Se déconnecter', () => { if(window.FAE_ESSAI) return; FB_AUTH.signOut().then(() => location.reload()); });
  z.append(b, menu);
  const nav = document.querySelector('nav.fae-site');
  if(nav) nav.append(z); else { z.classList.add('flottante'); document.body.append(z); }
}
function changerDeNom(){
  const n = (prompt('Ton nom de joueur (2 à 30 caractères) :', COMPTE.nom) || '').trim();
  if(!n || n === COMPTE.nom) return;
  if(n.length < 2 || n.length > 30 || /[<>]/.test(n)){ alert('Un nom de 2 à 30 caractères, sans < ni >.'); return; }
  const fini = () => {
    COMPTE.nom = n;
    const b = document.querySelector('#faeCompte .fae-compte-nom'); if(b) b.textContent = n;
    try{ const m = JSON.parse(localStorage.getItem('faelorenn.table.moi') || '{}'); m.joueur = n; localStorage.setItem('faelorenn.table.moi', JSON.stringify(m)); }catch(e){}
    window.dispatchEvent(new CustomEvent('fae-compte', {detail:COMPTE}));
  };
  if(window.FAE_ESSAI){ fini(); return; }
  FB_DB.collection('comptes').doc(COMPTE.uid).update({nom:n}).then(fini, e => alert(compteErreur(e)));
}

/* ---------- le démarrage ---------- */
function demarrerCompte(){
  // les instantanés (outils/instantanes.mjs) entrent avec un faux compte, sans serveur
  if(window.FAE_ESSAI){
    if(typeof FAE_ESSAI.resemer === 'function') FAE_ESSAI.resemer();
    entrerDedans({uid:FAE_ESSAI.uid, email:''}, FAE_ESSAI);
    return;
  }
  if(typeof firebase === 'undefined'){ ecranPanne({message:'le code de Firebase n’a pas pu être chargé.'}); return; }
  firebase.initializeApp(FIREBASE_CONFIG);
  FB_AUTH = firebase.auth(); FB_DB = firebase.firestore();
  FB_AUTH.languageCode = 'fr';
  if(FIREBASE_EMULATEUR){
    FB_AUTH.useEmulator('http://127.0.0.1:9099', {disableWarnings:true});
    FB_DB.useEmulator('127.0.0.1', 8080);
  }
  // hors ligne, ce qu'on écrit attend dans le navigateur et part au retour de la connexion, même après fermeture.
  // Plusieurs onglets ouverts partagent ce cache ; un navigateur qui ne le permet pas travaille sans.
  FB_DB.enablePersistence({synchronizeTabs:true}).catch(() => {});
  porteCarte('Les registres de Faelorenn', 'Un instant…');
  FB_AUTH.onAuthStateChanged(user => {
    if(!user){ if(COMPTE.etat === 'dedans') location.reload(); else ecranDehors(); return; }
    verifierCompte(user);
  });
}
// le script est au début de <body> : la porte s'affiche tout de suite, la page se construit derrière
if(document.body) demarrerCompte();
else document.addEventListener('DOMContentLoaded', demarrerCompte);
