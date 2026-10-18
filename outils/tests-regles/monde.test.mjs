// Les règles du monde : campagnes privées, fiche et état de jeu, lore, tables à valider. Lancer : npm test.
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

// un document du monde tel que le site l'écrit
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
    await s('comptes/eteint', { nom: 'Éteint', role: 'joueur', actif: false, cree: T0() });
    await s('campagnes/c1', pose('gael', 'Gaël', { e: '{}', membres: ['gael', 'oce'] }));
    await s('campagnes/c2', pose('luc', 'Luc', { e: '{}', membres: ['luc'] }));
    await s('personnages/p1', pose('gael', 'Gaël', { e: '{}', campagne: 'c1' }));
    await s('seances/s1', pose('gael', 'Gaël', { e: '{}', c: '{}', campagne: 'c1' }));
    await s('paragraphes/b1', pose('gael', 'Gaël', { campagne: 'c1' }));
    await s('adversaires/a1', pose('gael', 'Gaël', { e: '{}', campagne: 'c1' }));
    await s('pnj/n1', pose('gael', 'Gaël', { e: '{}' }));
    await s('pnj/n1/lore/l1', { texte: 'Ancien', proprietaire: 'gael', proprietaireNom: 'Gaël', t: T0() });
    await s('missions/m1', pose('gael', 'Gaël', { e: '{}' }));
    await s('lieux/l1', pose('gael', 'Gaël'));
    await s('objets/o1', pose('gael', 'Gaël', { perso: 'p1' }));
    await s('objets/o2', pose('oce', 'Océane', { perso: 'p1' }));
    await s('tables/t-oce', pose('oce', 'Océane', { statut: 'prive' }));
    await s('tables/t-valide', pose('oce', 'Océane', { statut: 'valide' }));
    await s('monde/table', pose('gael', 'Gaël', { e: '{}' }));
  });
});
const qui = uid => env.authenticatedContext(uid).firestore();

test('campagnes : son créateur gère, un membre ne touche qu’à l’état, un étranger à rien', async () => {
  await assertSucceeds(setDoc(doc(qui('oce'), 'campagnes/c3'), neuf('oce', 'Océane', { e: '{}', membres: ['oce'] })));
  await assertFails(setDoc(doc(qui('oce'), 'campagnes/c4'), neuf('gael', 'Gaël', { membres: ['gael'] })));      // au nom d'un autre
  await assertFails(setDoc(doc(qui('oce'), 'campagnes/c5'), neuf('oce', 'Océane', { membres: ['luc'] })));      // sans en être
  await assertSucceeds(updateDoc(doc(qui('oce'), 'campagnes/c1'), retouche('oce', { e: '{"jour":3}' })));
  await assertFails(updateDoc(doc(qui('oce'), 'campagnes/c1'), retouche('oce', { f: '{"nom":"volée"}' })));
  await assertFails(updateDoc(doc(qui('oce'), 'campagnes/c2'), retouche('oce', { membres: ['luc', 'oce'] })));  // s'inviter
  await assertFails(updateDoc(doc(qui('luc'), 'campagnes/c1'), retouche('luc', { e: '{}' })));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'campagnes/c1'), retouche('gael', { membres: ['gael', 'oce', 'luc'] })));
});

test('personnages : la fiche au joueur, l’état de jeu aux membres de la campagne', async () => {
  await assertSucceeds(updateDoc(doc(qui('oce'), 'personnages/p1'), retouche('oce', { e: '{"pv":3}' })));
  await assertFails(updateDoc(doc(qui('oce'), 'personnages/p1'), retouche('oce', { f: '{"car":{"Force":18}}' })));
  await assertFails(updateDoc(doc(qui('oce'), 'personnages/p1'), retouche('oce', { proprietaire: 'oce' })));
  await assertFails(updateDoc(doc(qui('luc'), 'personnages/p1'), retouche('luc', { e: '{"pv":0}' })));       // pas de sa campagne
  await assertSucceeds(getDoc(doc(qui('luc'), 'personnages/p1')));                                            // mais il le voit
  await assertFails(updateDoc(doc(qui('oce'), 'personnages/p1'), { e: '{}', majS: T0(), modifiePar: 'oce' }));  // fausse heure
  await assertFails(updateDoc(doc(qui('oce'), 'personnages/p1'), retouche('gael', { e: '{}' })));             // faux auteur
});

test('séances : lues par les seuls membres, l’état et la carte par tous les membres', async () => {
  await assertSucceeds(getDoc(doc(qui('oce'), 'seances/s1')));
  await assertFails(getDoc(doc(qui('luc'), 'seances/s1')));
  await assertSucceeds(getDocs(query(collection(qui('oce'), 'seances'), where('campagne', '==', 'c1'))));
  await assertFails(getDocs(query(collection(qui('luc'), 'seances'), where('campagne', '==', 'c1'))));
  await assertFails(getDocs(collection(qui('oce'), 'seances')));                                               // sans filtre
  await assertSucceeds(getDocs(collection(qui('gael'), 'seances')));                                           // un admin : tout
  await assertSucceeds(getDoc(doc(qui('gael'), 'seances/s1')));
  await assertSucceeds(updateDoc(doc(qui('oce'), 'seances/s1'), retouche('oce', { e: '{"init":1}', c: '{"carte":1}' })));
  await assertFails(updateDoc(doc(qui('oce'), 'seances/s1'), retouche('oce', { f: '{"titre":"x"}' })));
  await assertSucceeds(setDoc(doc(qui('oce'), 'seances/s2'), neuf('oce', 'Océane', { e: '{}', c: '{}', campagne: 'c1' })));
  await assertFails(setDoc(doc(qui('luc'), 'seances/s3'), neuf('luc', 'Luc', { campagne: 'c1' })));
});

test('paragraphes et jets : chacun les siens, dans ses campagnes', async () => {
  await assertSucceeds(setDoc(doc(qui('oce'), 'paragraphes/b2'), neuf('oce', 'Océane', { campagne: 'c1' })));
  await assertSucceeds(updateDoc(doc(qui('oce'), 'paragraphes/b2'), retouche('oce', { f: '{"texte":"y"}' })));
  await assertFails(updateDoc(doc(qui('oce'), 'paragraphes/b1'), retouche('oce', { f: '{"texte":"z"}' })));
  await assertFails(getDoc(doc(qui('luc'), 'paragraphes/b1')));
  await assertFails(setDoc(doc(qui('luc'), 'paragraphes/b3'), neuf('luc', 'Luc', { campagne: 'c1' })));
  await assertSucceeds(setDoc(doc(qui('oce'), 'jets/j1'), neuf('oce', 'Océane', { campagne: 'c1' })));
  await assertFails(updateDoc(doc(qui('oce'), 'jets/j1'), retouche('oce', { f: '{}' })));
  await assertFails(setDoc(doc(qui('oce'), 'jets/j2'), neuf('oce', 'Océane', { campagne: 'c2' })));
});

test('rencontres : tous les membres s’y battent', async () => {
  await assertSucceeds(updateDoc(doc(qui('oce'), 'adversaires/a1'), retouche('oce', { f: '{"pv":2}', e: '{}' })));
  await assertFails(updateDoc(doc(qui('luc'), 'adversaires/a1'), retouche('luc', { f: '{}' })));
  await assertFails(updateDoc(doc(qui('oce'), 'adversaires/a1'), retouche('oce', { campagne: 'c2' })));
});

test('PNJ : se battre oui, réécrire non, du lore toujours', async () => {
  await assertSucceeds(updateDoc(doc(qui('luc'), 'pnj/n1'), retouche('luc', { e: '{"pv":1}' })));
  await assertFails(updateDoc(doc(qui('luc'), 'pnj/n1'), retouche('luc', { f: '{"texte":"réécrit"}' })));
  await assertSucceeds(setDoc(doc(qui('luc'), 'pnj/n1/lore/l2'), { texte: 'Il ment.', proprietaire: 'luc', proprietaireNom: 'Luc', t: serverTimestamp() }));
  await assertFails(setDoc(doc(qui('luc'), 'pnj/n1/lore/l3'), { texte: 'Faux nom', proprietaire: 'luc', proprietaireNom: 'Gaël', t: serverTimestamp() }));
  await assertFails(setDoc(doc(qui('luc'), 'pnj/n1/lore/l4'), { texte: 'Au nom d’un autre', proprietaire: 'oce', proprietaireNom: 'Océane', t: serverTimestamp() }));
  await assertFails(updateDoc(doc(qui('luc'), 'pnj/n1/lore/l1'), { texte: 'Effacé' }));
  await assertFails(updateDoc(doc(qui('gael'), 'pnj/n1/lore/l1'), { texte: 'Même son auteur' }));
});

test('missions, lieux, liens, monde', async () => {
  await assertSucceeds(updateDoc(doc(qui('luc'), 'missions/m1'), retouche('luc', { e: '{"etat":"cours"}' })));
  await assertFails(updateDoc(doc(qui('luc'), 'missions/m1'), retouche('luc', { f: '{"titre":"x"}' })));
  await assertFails(updateDoc(doc(qui('luc'), 'lieux/l1'), retouche('luc', { f: '{}' })));
  await assertSucceeds(updateDoc(doc(qui('luc'), 'monde/table'), retouche('luc', { e: '{"oracle":1}' })));
  await assertFails(updateDoc(doc(qui('luc'), 'monde/table'), retouche('luc', { f: '{"viderAvant":9}' })));
});

test('le sac : on donne à un autre, seul l’auteur de la ligne ou le joueur la retouche', async () => {
  await assertSucceeds(setDoc(doc(qui('oce'), 'objets/o3'), neuf('oce', 'Océane', { perso: 'p1' })));
  await assertFails(updateDoc(doc(qui('oce'), 'objets/o1'), retouche('oce', { f: '{"n":9}' })));
  await assertSucceeds(updateDoc(doc(qui('oce'), 'objets/o2'), retouche('oce', { f: '{"n":2}' })));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'objets/o2'), retouche('gael', { f: '{"n":3}' })));
  await assertFails(updateDoc(doc(qui('oce'), 'objets/o2'), retouche('oce', { perso: 'autre' })));
});

test('tables de tirage : privées, puis validées par un admin', async () => {
  await assertSucceeds(setDoc(doc(qui('luc'), 'tables/t-luc'), neuf('luc', 'Luc', { statut: 'prive' })));
  await assertFails(setDoc(doc(qui('luc'), 'tables/t-luc2'), neuf('luc', 'Luc', { statut: 'valide' })));
  await assertFails(getDoc(doc(qui('luc'), 'tables/t-oce')));
  await assertSucceeds(getDoc(doc(qui('luc'), 'tables/t-valide')));
  await assertSucceeds(getDocs(query(collection(qui('luc'), 'tables'), where('statut', '==', 'valide'))));
  await assertSucceeds(getDocs(query(collection(qui('luc'), 'tables'), where('proprietaire', '==', 'luc'))));
  await assertFails(getDocs(collection(qui('luc'), 'tables')));
  await assertSucceeds(getDocs(collection(qui('gael'), 'tables')));
  await assertFails(updateDoc(doc(qui('oce'), 'tables/t-oce'), retouche('oce', { statut: 'valide' })));
  await assertSucceeds(updateDoc(doc(qui('oce'), 'tables/t-oce'), retouche('oce', { statut: 'propose' })));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'tables/t-oce'), retouche('gael', { statut: 'valide' })));
  await assertFails(updateDoc(doc(qui('oce'), 'tables/t-valide'), retouche('oce', { f: '{"x":2}' })));       // reste validée : non
  await assertFails(updateDoc(doc(qui('oce'), 'tables/t-valide'), retouche('oce', { f: '{"x":2}', statut: 'propose' })));
  await assertSucceeds(updateDoc(doc(qui('oce'), 'tables/t-valide'), retouche('oce', { f: '{"x":2}', revoir: true, fv: '{}' })));
});

test('« … écrit » : chacun le sien, lu par les membres de la campagne', async () => {
  const frappe = (c, plus) => Object.assign({ campagne: c, seance: 's1', nom: 'Yvellis', actif: true, t: serverTimestamp() }, plus || {});
  await assertSucceeds(setDoc(doc(qui('oce'), 'frappe/oce'), frappe('c1')));
  await assertFails(setDoc(doc(qui('oce'), 'frappe/gael'), frappe('c1')));                     // au nom d'un autre
  await assertFails(setDoc(doc(qui('oce'), 'frappe/oce'), frappe('c2')));                      // une campagne dont elle n'est pas
  await assertFails(setDoc(doc(qui('oce'), 'frappe/oce'), frappe('c1', { texte: 'secret' })));  // le texte ne part pas
  await assertSucceeds(getDocs(query(collection(qui('gael'), 'frappe'), where('campagne', '==', 'c1'))));
  await assertFails(getDocs(query(collection(qui('luc'), 'frappe'), where('campagne', '==', 'c1'))));
  await assertSucceeds(setDoc(doc(qui('oce'), 'frappe/oce'), frappe('c1', { actif: false })));
});

test('un admin corrige tout et importe au nom des autres', async () => {
  await assertSucceeds(updateDoc(doc(qui('gael'), 'lieux/l1'), retouche('gael', { f: '{"y":1}' })));
  await assertSucceeds(setDoc(doc(qui('gael'), 'personnages/p9'), neuf('gael', 'Gaël', { proprietaire: 'oce', proprietaireNom: 'Océane', e: '{}', campagne: 'c1' })));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'paragraphes/b1'), retouche('gael', { f: '{}' })));
});

test('un admin rend une campagne ou un personnage à son vrai créateur, et rien d’autre', async () => {
  const rend = (uid, nom, plus) => retouche('gael', Object.assign({ proprietaire: uid, proprietaireNom: nom }, plus || {}));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'campagnes/c1'), rend('oce', 'Océane')));
  await assertSucceeds(updateDoc(doc(qui('gael'), 'personnages/p1'), rend('oce', 'Océane')));
  await assertFails(updateDoc(doc(qui('gael'), 'personnages/p1'), rend('luc', 'Pas son nom')));           // sous un autre nom
  await assertFails(updateDoc(doc(qui('gael'), 'personnages/p1'), rend('fantome', 'Fantôme')));           // un compte qui n'existe pas
  await assertFails(updateDoc(doc(qui('gael'), 'campagnes/c2'), rend('oce', 'Océane')));                  // pas membre de la campagne
  await assertSucceeds(updateDoc(doc(qui('gael'), 'campagnes/c2'), rend('oce', 'Océane', { membres: ['luc', 'oce'] })));
  await assertFails(updateDoc(doc(qui('gael'), 'personnages/p1'), rend('gael', 'Gaël', { cree: T0() })));  // la date de création reste
  await assertFails(updateDoc(doc(qui('oce'), 'personnages/p1'), rend('oce', 'Océane')));                 // un joueur ne se l'attribue pas
  await assertFails(updateDoc(doc(qui('gael'), 'paragraphes/b1'), rend('oce', 'Océane')));                // seulement campagnes et personnages
});

test('sans invitation, ou en pause : rien', async () => {
  await assertFails(getDoc(doc(qui('inconnu'), 'pnj/n1')));
  await assertFails(getDoc(doc(qui('eteint'), 'pnj/n1')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'pnj/n1')));
  await assertFails(setDoc(doc(qui('oce'), 'lieux/l9'), neuf('oce', 'Océane', { intrus: 1 })));
});
