// Les règles du socle : comptes, invitations, demandes, réglages. Lancer : npm test (dans outils/tests-regles).
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';

let env;
const CODE = 'invitation-joueur-0123456789';
const CODE_ADMIN = 'invitation-admin-0123456789';
const CODE_MAIL = 'invitation-mail-0123456789ab';
const CODE_EXPIREE = 'invitation-expiree-0123456789';
const CODE_UTILISEE = 'invitation-utilisee-012345678';
const demain = () => Timestamp.fromMillis(Date.now() + 86400000);
const hier = () => Timestamp.fromMillis(Date.now() - 86400000);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-faelorenn',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'comptes/gael'), { nom: 'Gaël', role: 'admin', actif: true, fondateur: true, cree: Timestamp.now() });
    await setDoc(doc(db, 'comptes/admin2'), { nom: 'Second', role: 'admin', actif: true, cree: Timestamp.now() });
    await setDoc(doc(db, 'comptes/oce'), { nom: 'Océane', role: 'joueur', actif: true, cree: Timestamp.now() });
    await setDoc(doc(db, 'comptes/eteint'), { nom: 'Éteint', role: 'joueur', actif: false, cree: Timestamp.now() });
    const inv = (role, expire, plus) => Object.assign({ role, creePar: 'gael', cree: Timestamp.now(), expire, utilisee: false }, plus || {});
    await setDoc(doc(db, 'invitations', CODE), inv('joueur', demain()));
    await setDoc(doc(db, 'invitations', CODE_ADMIN), inv('admin', demain()));
    await setDoc(doc(db, 'invitations', CODE_MAIL), inv('joueur', demain(), { email: 'ami@exemple.fr' }));
    await setDoc(doc(db, 'invitations', CODE_EXPIREE), inv('joueur', hier()));
    await setDoc(doc(db, 'invitations', CODE_UTILISEE), inv('joueur', demain(), { utilisee: true, par: 'quelquun', le: Timestamp.now() }));
    await setDoc(doc(db, 'comptes/oce/prefs/hub'), { a: 1 });
    await setDoc(doc(db, 'personnages/p-x'), { nom: 'X' });
  });
});

const qui = (uid, jeton) => env.authenticatedContext(uid, jeton || {}).firestore();
const personne = () => env.unauthenticatedContext().firestore();

// la création d'un compte avec une invitation : les deux écritures dans un même lot
function entrer(db, uid, code, champs) {
  const b = writeBatch(db);
  b.set(doc(db, 'comptes', uid), Object.assign({ nom: 'Nouveau', role: 'joueur', actif: true, invitation: code, cree: serverTimestamp() }, champs || {}));
  b.update(doc(db, 'invitations', code), { utilisee: true, par: uid, le: serverTimestamp() });
  return b.commit();
}

test('sans connexion, on ne lit rien', async () => {
  await assertFails(getDoc(doc(personne(), 'comptes/oce')));
  await assertFails(getDoc(doc(personne(), 'invitations', CODE)));
});

test('connecté sans invitation : seulement son propre compte, rien du monde', async () => {
  const db = qui('inconnu');
  await assertSucceeds(getDoc(doc(db, 'comptes/inconnu')));
  await assertFails(getDoc(doc(db, 'comptes/oce')));
  await assertFails(getDocs(collection(db, 'comptes')));
  await assertFails(getDoc(doc(db, 'personnages/p-x')));
});

test('une invitation valable fait entrer, dans un même lot', async () => {
  const db = qui('nouveau');
  await assertSucceeds(entrer(db, 'nouveau', CODE));
  await assertSucceeds(getDoc(doc(db, 'comptes/oce')));          // désormais invité
});

test('sans invitation, ou sans la consommer, pas de compte', async () => {
  const db = qui('nouveau');
  await assertFails(setDoc(doc(db, 'comptes/nouveau'), { nom: 'Nouveau', role: 'joueur', actif: true, invitation: 'nimporte-quoi-0123456789', cree: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'comptes/nouveau'), { nom: 'Nouveau', role: 'joueur', actif: true, invitation: CODE, cree: serverTimestamp() }));
});

test('une invitation ne sert qu\'une fois, et pas après son expiration', async () => {
  await assertSucceeds(entrer(qui('premier'), 'premier', CODE));
  await assertFails(entrer(qui('second'), 'second', CODE));
  await assertFails(entrer(qui('nouveau'), 'nouveau', CODE_UTILISEE));
  await assertFails(entrer(qui('nouveau'), 'nouveau', CODE_EXPIREE));
});

test('le rôle est celui de l\'invitation, pas celui qu\'on demande', async () => {
  await assertFails(entrer(qui('malin'), 'malin', CODE, { role: 'admin' }));
  await assertSucceeds(entrer(qui('promu'), 'promu', CODE_ADMIN, { role: 'admin' }));
});

test('on ne crée pas le compte d\'un autre, ni un compte inactif ou avec des champs en trop', async () => {
  await assertFails(entrer(qui('nouveau'), 'autre', CODE));
  await assertFails(entrer(qui('nouveau'), 'nouveau', CODE, { actif: false }));
  await assertFails(entrer(qui('nouveau'), 'nouveau', CODE, { fondateur: true }));
  await assertFails(entrer(qui('nouveau'), 'nouveau', CODE, { nom: '<b>x</b>' }));
  await assertFails(entrer(qui('nouveau'), 'nouveau', CODE, { nom: 'x' }));
});

test('une invitation liée à un e-mail : seulement pour cet e-mail, vérifié', async () => {
  await assertFails(entrer(qui('a', { email: 'autre@exemple.fr', email_verified: true }), 'a', CODE_MAIL));
  await assertFails(entrer(qui('b', { email: 'ami@exemple.fr', email_verified: false }), 'b', CODE_MAIL));
  await assertSucceeds(entrer(qui('c', { email: 'ami@exemple.fr', email_verified: true }), 'c', CODE_MAIL));
});

test('chacun change son pseudo, pas son rôle', async () => {
  const db = qui('oce');
  await assertSucceeds(updateDoc(doc(db, 'comptes/oce'), { nom: 'Océane la Grande' }));
  await assertFails(updateDoc(doc(db, 'comptes/oce'), { role: 'admin' }));
  await assertFails(updateDoc(doc(db, 'comptes/oce'), { actif: false }));
  await assertFails(updateDoc(doc(db, 'comptes/gael'), { nom: 'Volé' }));
  await assertFails(deleteDoc(doc(db, 'comptes/oce')));
});

test('un admin gère les rôles, mais ne touche ni au fondateur ni à son propre rôle', async () => {
  const db = qui('admin2');
  await assertSucceeds(updateDoc(doc(db, 'comptes/oce'), { role: 'admin' }));
  await assertSucceeds(updateDoc(doc(db, 'comptes/oce'), { actif: false }));
  await assertFails(updateDoc(doc(db, 'comptes/gael'), { role: 'joueur' }));
  await assertFails(updateDoc(doc(db, 'comptes/gael'), { actif: false }));
  await assertFails(updateDoc(doc(db, 'comptes/admin2'), { role: 'joueur' }));
  await assertFails(updateDoc(doc(db, 'comptes/oce'), { fondateur: true }));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'comptes/admin2'), { role: 'joueur' }));
});

test('un compte désactivé ne voit plus rien', async () => {
  const db = qui('eteint');
  await assertSucceeds(getDoc(doc(db, 'comptes/eteint')));
  await assertFails(getDoc(doc(db, 'comptes/oce')));
});

test('les réglages sont à soi seul', async () => {
  await assertSucceeds(getDoc(doc(qui('oce'), 'comptes/oce/prefs/hub')));
  await assertSucceeds(setDoc(doc(qui('oce'), 'comptes/oce/prefs/moi'), { campagne: 'c' }));
  await assertFails(getDoc(doc(qui('gael'), 'comptes/oce/prefs/hub')));
  await assertFails(setDoc(doc(qui('gael'), 'comptes/oce/prefs/hub'), { a: 2 }));
  await assertFails(setDoc(doc(qui('eteint'), 'comptes/eteint/prefs/hub'), { a: 2 }));
});

test('les invitations : le code se lit, la liste et la création sont aux admins', async () => {
  await assertSucceeds(getDoc(doc(qui('inconnu'), 'invitations', CODE)));
  await assertFails(getDocs(collection(qui('oce'), 'invitations')));
  await assertSucceeds(getDocs(collection(qui('gael'), 'invitations')));
  const neuve = { role: 'joueur', creePar: 'gael', cree: serverTimestamp(), expire: demain(), utilisee: false };
  await assertSucceeds(setDoc(doc(qui('gael'), 'invitations/code-tout-neuf-0123456789'), neuve));
  await assertFails(setDoc(doc(qui('gael'), 'invitations/court'), neuve));
  await assertFails(setDoc(doc(qui('oce'), 'invitations/code-de-oce-0123456789'), Object.assign({}, neuve, { creePar: 'oce' })));
  await assertFails(updateDoc(doc(qui('oce'), 'invitations', CODE), { expire: demain() }));
  await assertSucceeds(deleteDoc(doc(qui('gael'), 'invitations', CODE)));
});

test('les demandes d\'entrée', async () => {
  const db = qui('inconnu', { email: 'inconnu@exemple.fr' });
  await assertSucceeds(setDoc(doc(db, 'demandes/inconnu'), { nom: 'Inconnu', email: 'inconnu@exemple.fr', cree: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'demandes/autre'), { nom: 'Autre', email: 'inconnu@exemple.fr', cree: serverTimestamp() }));
  await assertFails(setDoc(doc(qui('oce'), 'demandes/oce'), { nom: 'Océane', email: '', cree: serverTimestamp() }));  // déjà invitée
  await assertFails(getDocs(collection(qui('oce'), 'demandes')));
  await assertSucceeds(getDocs(collection(qui('gael'), 'demandes')));
  await assertSucceeds(setDoc(doc(qui('gael'), 'comptes/inconnu'), { nom: 'Inconnu', role: 'joueur', actif: true, invitation: 'demande', cree: serverTimestamp() }));
});

test('tout le reste est fermé, même aux admins', async () => {
  await assertFails(getDoc(doc(qui('gael'), 'personnages/p-x')));
  await assertFails(setDoc(doc(qui('gael'), 'campagnes/c'), { nom: 'c' }));
});
