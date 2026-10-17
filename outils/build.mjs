// Assemble le site à partir de src/ : les scripts, les styles et les pages.
//
//   node outils/build.mjs              écrit assets/ et les pages *.html de la racine
//   node outils/build.mjs --verifier   n'écrit rien ; échoue si un fichier généré n'est pas à jour
//
// src/js/<paquet>/modules.txt   la liste ordonnée des modules du paquet → assets/js/<paquet>.js
// src/css/<paquet>/modules.txt  pareil pour les styles                  → assets/css/<paquet>.css
// src/pages/<page>.html         le gabarit d'une page                    → <page>.html
// src/morceaux/<nom>.html       les morceaux de page partagés
//
// Dans modules.txt : un chemin par ligne, relatif à src/js/ (ou src/css/) ; « # » commente.
// Un module peut servir à plusieurs paquets : les modules communs vivent dans src/js/commun/.
// Les modules sont mis bout à bout dans l'ordre, comme s'ils n'avaient jamais été séparés :
// un paquet reste un seul script classique (pas de module ES), donc il marche aussi en file://.
//
// Directives des gabarits et des morceaux :
//   <!--@ inclure nom clé="valeur" … -->  insère src/morceaux/nom.html ; {{clé}} y est remplacé
//   <!--@ js nom -->                       <script src="assets/js/nom.js?v=…"></script>
//   <!--@ css nom -->                      <link rel="stylesheet" href="assets/css/nom.css?v=…">
//   {{page}}                               le nom de la page générée (table, pnj…)
//   {{courant:table}}                      « aria-current="page" » (précédé d'une espace) sur la page table, rien ailleurs
// Le « ?v=… » est une empreinte du contenu : un navigateur ne garde jamais un vieux script.
//
// Le build refuse d'écrire quoi que ce soit s'il trouve une erreur : module ou morceau introuvable,
// directive mal formée, variable sans valeur, page de la racine sans gabarit, fichier de src/ qui
// ne sert à rien (on le modifierait sans effet).

import { readFile, writeFile, readdir, mkdir, rm, stat } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(RACINE, 'src');
const VERIFIER = process.argv.includes('--verifier');
const AVERT_JS = '// Fichier généré par outils/build.mjs depuis src/js/{p}/ : ne pas le modifier, modifier les modules.\n';
const AVERT_CSS = '/* Fichier généré par outils/build.mjs depuis src/css/{p}/ : ne pas le modifier, modifier les modules. */\n';
const AVERT_PAGE = 'Page générée par outils/build.mjs';
const NOM = '[\\p{L}\\p{N}_-]+';                     // un nom de variable, de morceau ou de paquet (accents permis)

const sorties = new Map();           // chemin relatif à RACINE → contenu
const servis = new Set();            // fichiers de src/ réellement utilisés
const erreurs = [];

async function existe(p) { try { await stat(p); return true; } catch { return false; } }
// Sans BOM, en fins de ligne LF : un BOM collé au premier sélecteur CSS annulerait la règle.
async function lire(p) { servis.add(p); return (await readFile(p, 'utf8')).replace(/^﻿/, '').replace(/\r\n?/g, '\n'); }
const empreinte = txt => createHash('sha256').update(txt).digest('hex').slice(0, 10);
// Un module finit par un seul saut de ligne ; dans le paquet, une ligne vide le sépare du précédent.
const nettoyer = txt => txt.replace(/^\n+/, '').replace(/\s*$/, '\n');
const aSoi = (o, k) => Object.hasOwn(o, k);

async function listeModules(dossier) {
  const f = join(dossier, 'modules.txt');
  return (await lire(f)).split('\n').map(l => l.replace(/#.*/, '').trim()).filter(Boolean);
}

// Un paquet : ses modules bout à bout, chacun annoncé par une ligne de commentaire.
async function paquets(genre) {
  const base = join(SRC, genre);
  const marque = genre === 'js' ? m => `// ── ${m} ──\n` : m => `/* ── ${m} ── */\n`;
  const avert = genre === 'js' ? AVERT_JS : AVERT_CSS;
  for (const nom of (await readdir(base)).sort()) {
    if (!await existe(join(base, nom, 'modules.txt'))) continue;
    let txt = avert.replace('{p}', nom);
    const vus = new Set();
    for (const m of await listeModules(join(base, nom))) {
      const chemin = join(base, m);
      if (vus.has(m)) erreurs.push(`src/${genre}/${nom}/modules.txt : « ${m} » listé deux fois`);
      vus.add(m);
      if (!await existe(chemin)) { erreurs.push(`src/${genre}/${nom}/modules.txt : module introuvable « ${m} »`); continue; }
      txt += '\n' + marque(m) + nettoyer(await lire(chemin));
    }
    sorties.set(`assets/${genre}/${nom}.${genre}`, txt);
  }
}

// clé="valeur" … ; tout autre texte après le nom du morceau est une erreur.
function attributs(s, page) {
  const o = Object.create(null);
  if (!new RegExp(`^(\\s+${NOM}="[^"]*")*\\s*$`, 'u').test(s)) erreurs.push(`${page} : attributs mal formés « ${s.trim()} »`);
  for (const m of s.matchAll(new RegExp(`(${NOM})="([^"]*)"`, 'gu'))) o[m[1]] = m[2];
  return o;
}

async function gabarit(txt, page, vars, profondeur = 0) {
  if (profondeur > 10) throw new Error('inclusions trop profondes (boucle ?)');
  // Les variables d'abord, pour qu'une directive puisse en contenir une : <!--@ css {{feuille}} -->
  txt = txt.replace(new RegExp(`\\{\\{(${NOM})\\}\\}`, 'gu'), (tout, k) => aSoi(vars, k) ? vars[k] : tout);
  const morceaux = [];
  let pos = 0;
  // Une directive tient sur une ligne : une directive non fermée n'avalera pas la suite de la page.
  for (const m of txt.matchAll(/<!--@[ \t]*(\p{L}+)([^\n<>]*?)-->/gu)) {
    morceaux.push(txt.slice(pos, m.index)); pos = m.index + m[0].length;
    const verbe = m[1], reste = m[2];
    if (verbe === 'inclure') {
      const nom = reste.trim().split(/\s+/)[0];
      const f = join(SRC, 'morceaux', nom + '.html');
      if (!nom || !await existe(f)) { erreurs.push(`${page} : morceau introuvable « ${nom} »`); continue; }
      let inc = await lire(f);
      // Le saut de ligne qui suit la directive (ou celui du texte qui l'inclut) suffit.
      if (inc.endsWith('\n') && (txt[pos] === '\n' || pos === txt.length)) inc = inc.slice(0, -1);
      const v = Object.assign(Object.create(null), vars, attributs(reste.trim().slice(nom.length), page));
      morceaux.push(await gabarit(inc, page, v, profondeur + 1));
    } else if (verbe === 'js' || verbe === 'css') {
      const chemin = `assets/${verbe}/${reste.trim()}.${verbe}`;
      if (!sorties.has(chemin)) { erreurs.push(`${page} : paquet ${verbe} inconnu « ${reste.trim()} »`); continue; }
      const url = `${chemin}?v=${empreinte(sorties.get(chemin))}`;
      morceaux.push(verbe === 'js' ? `<script src="${url}"></script>` : `<link rel="stylesheet" href="${url}">`);
    } else erreurs.push(`${page} : directive inconnue « ${verbe} »`);
  }
  morceaux.push(txt.slice(pos));
  let res = morceaux.join('');
  if (profondeur === 0) {
    res = res
      .replace(new RegExp(`\\{\\{courant:(${NOM})\\}\\}`, 'gu'), (_, p) => p === page ? ' aria-current="page"' : '')
      .replace(/\{\{page\}\}/g, page)
      .replace(new RegExp(`\\{\\{(${NOM})\\}\\}`, 'gu'), tout => (erreurs.push(`${page} : variable sans valeur ${tout}`), tout));
    if (res.includes('<!--@')) erreurs.push(`${page} : directive mal formée (« <!--@ » sans « --> » sur la même ligne ?)`);
  }
  return res;
}

async function pages() {
  const base = join(SRC, 'pages');
  for (const f of (await readdir(base)).filter(f => f.endsWith('.html')).sort()) {
    const page = f.slice(0, -5);
    let html = await gabarit(await lire(join(base, f)), page, Object.create(null));
    // L'avertissement après le doctype : avant, il ferait passer la page en mode quirks.
    if (!/^<!doctype html>\n/i.test(html)) { erreurs.push(`${f} : la page doit commencer par « <!doctype html> » sur sa propre ligne`); continue; }
    html = html.replace(/^(<!doctype html>\n)/i, `$1<!-- ${AVERT_PAGE} depuis src/pages/${f} : ne pas la modifier. -->\n`);
    sorties.set(f, html);
  }
}

// Tous les fichiers d'un dossier de src/, sous-dossiers compris.
async function fichiers(d) {
  if (!await existe(d)) return [];
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...await fichiers(p));
    else if (!e.name.startsWith('.')) out.push(p);
  }
  return out;
}

await paquets('js');
await paquets('css');
await pages();

// Un fichier de src/ que rien n'utilise : on le modifierait sans effet.
for (const d of ['js', 'css', 'morceaux']) {
  for (const p of await fichiers(join(SRC, d))) {
    if (!servis.has(p)) erreurs.push(`src/${relative(SRC, p).split(sep).join('/')} ne sert à aucun paquet ni aucune page`);
  }
}

// Ce qui traîne dans assets/ ou à la racine sans venir de src/ : un reste d'un ancien paquet ou d'un
// ancien gabarit, reconnu à son avertissement « généré ». Le reste n'est jamais touché.
const enTrop = [];
for (const genre of ['js', 'css']) {
  const d = join(RACINE, 'assets', genre);
  if (!await existe(d)) continue;
  for (const e of await readdir(d, { withFileTypes: true })) {
    const r = `assets/${genre}/${e.name}`;
    if (!e.isFile() || sorties.has(r)) continue;
    if ((await readFile(join(d, e.name), 'utf8')).startsWith((genre === 'js' ? AVERT_JS : AVERT_CSS).slice(0, 30))) enTrop.push(r);
  }
}
for (const e of await readdir(RACINE, { withFileTypes: true })) {
  if (!e.isFile() || !e.name.endsWith('.html') || sorties.has(e.name)) continue;
  if ((await readFile(join(RACINE, e.name), 'utf8')).includes(AVERT_PAGE)) enTrop.push(e.name);
  else erreurs.push(`${e.name} : page de la racine sans gabarit dans src/pages/ (l'y déplacer)`);
}

if (erreurs.length) { console.error(erreurs.map(e => '✗ ' + e).join('\n') + '\n\nRien n\'a été écrit.'); process.exit(1); }

let differences = 0;
for (const [r, txt] of sorties) {
  const p = join(RACINE, r);
  const avant = await existe(p) ? (await readFile(p, 'utf8')).replace(/\r\n?/g, '\n') : null;
  if (avant === txt) continue;
  differences++;
  if (VERIFIER) { console.error(`✗ pas à jour : ${r}`); continue; }
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, txt, 'utf8');
  console.log(`  écrit ${r}`);
}
for (const r of enTrop) {
  differences++;
  if (VERIFIER) { console.error(`✗ en trop : ${r}`); continue; }
  await rm(join(RACINE, r));
  console.log(`  retiré ${r}`);
}

if (VERIFIER) {
  if (differences) { console.error(`\n${differences} fichier(s) à régénérer : lancer « node outils/build.mjs ».`); process.exit(1); }
  console.log(`✓ ${sorties.size} fichiers générés, tous à jour.`);
} else console.log(differences ? `✓ ${differences} fichier(s) mis à jour.` : `✓ rien à changer (${sorties.size} fichiers).`);
