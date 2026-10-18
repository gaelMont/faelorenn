// Les règles du Havre, du bestiaire, des plans, des compétences et des propositions. Lancer : npm test.
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-faelorenn',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { await env.cleanup(); });

const T0 = () => Timestamp.fromMillis(Date.now() - 60000);
const pose = (proprio, nom, plus) => Object.assign({ f: '{}', proprietaire: proprio, proprietaireNom: nom, cree: T0(), majS: T0(), modifiePar: proprio }, plus || {});
const neuf = (uid, nom, plus) => Object.assign({ f: '{"x":1}', proprietaire: uid, proprietaireNom: nom, cree: serverTimestamp(), majS: serverTimestamp(), modifiePar: uid }, plus || {});
const retouche = (uid, champs) => Object.assign({ majS: serverTimestamp(), modifiePar: uid }, champs);

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore(), s = (p, d) => setDoc(doc(db, p), d);
    await s('comptes/gael', { nom: 'Gaël', role: 'admin', actif: true, fondateur: true, cree: T0() });
    await s('comptes/oce', { nom: 'Océane', role: 'joueur', actif: true, cree: T0() });
    await s('comptes/luc', { nom: 'Luc', role: 'joueur', actif: true, cree: T0() });
    await s('havre/h1', pose('oce', 'Océane'));
    await s('creatures/cr-oce', pose('oce', 'Océane', { statut: 'prive' }));
    await s('creatures/cr-valide', pose('oce', 'Océane', { statut: 'valide' }));
    await s('plans/batiments:b1', pose('oce', 'Océane', { statut: 'valide', section: 'batiments' }));
    await s('regles/maison', pose('gael', 'Gaël'));
    await s('propositions/p1', { texte: 'Ajouter Pêche', sujet: 'Compétence', proprietaire: 'oce', proprietaireNom: 'Océane', t: T0(), statut: 'ouverte' });
  });
});
const qui = uid => env.authenticatedContext(uid).firestore();

test('Havre : ses personnages à lui, vus de tous', async () => {
  await assertSucceeds(getDoc(doc(qui('luc'), 'havre/h1')));
  await assertSucceeds(setDoc(doc(qui('luc'), 'havre/h2'), neuf('luc', 'Luc')));
  await assertFails(updateDoc(doc(qui('luc'), 'havre/h1'), retouche('luc', { f: '{"nom":"volé"}' })));
  await assertSucceeds(updateDoc(doc(qui('oce'), 'havre/h1'), retouche('oce', { f: '{"nom":"le mien"}' })));
});

test('bestiaire : privé, puis validé par un admin', async () => {
  await assertFails(getDoc(doc(qui('luc'), 'creatures/cr-oce')));
  await assertSucceeds(getDoc(doc(qui('luc'), 'creatures/cr-valide')));
  await assertSucceeds(getDocs(query(collection(qui('luc'), 'creatures'), where('statut', '==', 'valide'))));
  await assertFails(getDocs(collection(qui('luc'), 'creatures')));
  await assertSucceeds(setDoc(doc(qui('luc'), 'creatures/cr-luc'), neuf('luc', 'Luc', { statut: 'prive' })));
  await assertFails(setDoc(doc(qui('luc'), 'creatures/cr-luc2'), neuf('luc', 'Luc', { statut: 'valide' })));
  await assertSucceeds(updateDoc(doc(qui('oce'), 'creatures/cr-oce'), retouche('oce', { statut: 'propose' })));
  await assertFails(updateDoc(doc(qui('oce'), 'creatures/cr-oce'), retouche('oce', { statut: 'valide' })));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'creatures/cr-oce'), retouche('gael', { statut: 'valide' })));
  await assertFails(updateDoc(doc(qui('luc'), 'creatures/cr-valide'), retouche('luc', { f: '{}', statut: 'propose' })));
  await assertSucceeds(setDoc(doc(qui('luc'), 'familles/k-luc'), neuf('luc', 'Luc', { statut: 'prive' })));
  await assertSucceeds(setDoc(doc(qui('luc'), 'butins/b-luc'), neuf('luc', 'Luc', { statut: 'propose' })));
});

test('plans : leur section ne change pas', async () => {
  await assertSucceeds(setDoc(doc(qui('luc'), 'plans/villages:v1'), neuf('luc', 'Luc', { statut: 'prive', section: 'villages' })));
  await assertFails(setDoc(doc(qui('luc'), 'plans/ailleurs:x'), neuf('luc', 'Luc', { statut: 'prive', section: 'ailleurs' })));
  await assertSucceeds(updateDoc(doc(qui('oce'), 'plans/batiments:b1'), retouche('oce', { f: '{"y":1}', statut: 'propose' })));
  await assertFails(updateDoc(doc(qui('oce'), 'plans/batiments:b1'), retouche('oce', { section: 'mondes', statut: 'propose' })));
  await assertFails(updateDoc(doc(qui('luc'), 'plans/batiments:b1'), retouche('luc', { f: '{}', statut: 'propose' })));
});

test('compétences : admins seulement ; un joueur propose', async () => {
  await assertSucceeds(getDoc(doc(qui('luc'), 'regles/maison')));
  await assertFails(updateDoc(doc(qui('luc'), 'regles/maison'), retouche('luc', { f: '{"x":2}' })));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'regles/maison'), retouche('gael', { f: '{"x":2}' })));
  await assertSucceeds(setDoc(doc(qui('luc'), 'propositions/p2'), { texte: 'Tir à 2 mains', sujet: 'Pratique', proprietaire: 'luc', proprietaireNom: 'Luc', t: serverTimestamp(), statut: 'ouverte' }));
  await assertFails(setDoc(doc(qui('luc'), 'propositions/p3'), { texte: 'déjà acceptée', sujet: '', proprietaire: 'luc', proprietaireNom: 'Luc', t: serverTimestamp(), statut: 'acceptee' }));
  await assertFails(getDoc(doc(qui('luc'), 'propositions/p1')));            // celle d'un autre
  await assertSucceeds(getDoc(doc(qui('oce'), 'propositions/p1')));
  await assertFails(updateDoc(doc(qui('oce'), 'propositions/p1'), { statut: 'acceptee', decidePar: 'oce', decideLe: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'propositions/p1'), { statut: 'acceptee', reponse: 'Ajoutée.', decidePar: 'gael', decideLe: serverTimestamp() }));
});
