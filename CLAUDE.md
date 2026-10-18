# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Browser tools ("registres") for the tabletop RPG *Faelorenn*, served as a static site. The UI, the identifiers, the comments and the file names are all in French (`CLE_*` = localStorage keys, `ONGLET_*` = window names, `ghc*` = GitHub sync). Keep that convention. The README (French) describes each tool's behaviour in detail: read the relevant part before changing a feature.

## Sources, build, generated files

**The root `*.html` pages and everything in `assets/` are generated. Never edit them by hand**: edit `src/`, then run the build.

```
node outils/build.mjs              # regenerates assets/ and the root pages (Node ≥ 20, no dependencies)
node outils/build.mjs --verifier   # writes nothing; fails if a generated file is stale (this is what CI runs)
```

- `src/js/<paquet>/modules.txt` lists that bundle's modules in order (paths relative to `src/js/`). The build concatenates them into `assets/js/<paquet>.js`. `src/css/` works the same way.
- `src/pages/<page>.html` are page templates and `src/morceaux/` holds the shared fragments. Directives: `<!--@ inclure nom k="v" -->`, `<!--@ js nom -->`, `<!--@ css nom -->`, `{{k}}`, `{{page}}`, `{{courant:<page>}}` (emits `aria-current`). The build adds a `?v=<content hash>` to every asset URL.
- The build refuses to write anything if it finds: a missing module or fragment, a module listed twice, a malformed directive (directives must fit on one line), an unset variable, a file in `src/` used by nothing, or a root `.html` without a template. To add a page, create `src/pages/<page>.html`. To add a module, create the file *and* list it in `modules.txt`.

## Architecture

- **Bundles stay classic scripts**, not ES modules. Concatenating the modules recreates one script with one shared global scope, and the pages work from `file://`. Modules see each other's top-level `function`/`const` declarations. Order in `modules.txt` matters for code that runs at load time: a function declaration is hoisted only within its own bundle, and a `const` is in TDZ until its module has run.
- **The `registre` bundle serves 5 pages**: table, missions, pnj, marchefleurs, tirages. They share one script and work out which page they are from the DOM (`const PAGE = $('ficheBox') ? 'fiche' : $('secSeance') ? 'table' : …` in `src/js/registre/demarrage.js`). `table` has its own CSS bundle, which reuses the `src/css/registre/` modules and swaps in a few variants from `src/css/table/`. The comments at the top of both `modules.txt` say which.
- **Shared code lives once, in `src/js/commun/`**: GitHub sync (`sync-github.js`), house rules (`reglesmaison.js`), Pratiques, the book's bestiary (`bestiaire.js`, `const ADV`, generated from Gaël's spreadsheet by an external `classeur/vers_site.py`), encounter draw (`tirage.js`), traits, loot (`butin.js`), characteristics, downloads, the HTML/XML escape (`echappement.js`: `echapperHtml`, used everywhere except `plans`, which keeps its own `esc` because it is strict), the `.docx` factory (`docx.js`: UTF-8, CRC, uncompressed zip and the fixed package parts; `rencontres/docx.js` and `createur/export-word.js` each still write their own document, styles and properties), the printable Word sheet (`fiche-du-word.js` draws it from a description that `createur/fiche-imprimable.js` and `registre/marchefleurs.js` each prepare; its CSS is `src/css/commun/fiche-du-word.css`, for `.fiche` and `.fimp`). It is listed in each bundle that uses it.
- **`plans` is `'use strict'`** (its first module). Never put a `commun/` module in it, or it would become strict. `plans` and `index` load `sync-github` as a separate `<script>`.
- **Similar code that is *not* shared on purpose**: some copies differ in behaviour (e.g. the creature normalisation in `rencontres/bestiaire-maison.js` vs `registre/rencontre-a-la-table.js`). Unifying them changes behaviour, so don't do it silently.
- **Stylesheets are files, not `<style>` tags**: code that needs the page's CSS (the clipboard copy for Word, the combat map's second window) goes through `commun/feuilles.js` (`texteDesFeuilles()`, `liensDesFeuilles()`), never `querySelectorAll('style')`.
- **Cross-page communication**: pages talk through `localStorage` (`faelorenn.*` keys) plus `storage` event listeners, through named windows (`ONGLET_*`), and through `postMessage` (plans → table combat map). Inline mentions in text: `/Nom` cites a person, `--Lieu` cites a place.
- **Claude artifact runtime**: the code checks for `claude.use` (`ghcBloque()`, the `downloads` capability). Inside a Claude artifact, GitHub sync is off and downloads go through the runtime. Keep both paths working.

## Accounts and the online world (Firebase)

All data lives in Firebase (Auth + Firestore, project `faelorenn`, free Spark plan); login is mandatory, by invitation.

- **Login gate**: every page starts veiled. The `compte` bundle (`src/js/compte/`: config, `compte.js`, `monde-en-ligne.js`, loaded after the vendored `firebase` compat SDK by `src/morceaux/compte.html`) shows the gate until the user is signed in (Google or e-mail) **and** has an account doc.
  - Accounts come from a one-time invitation link (`index.html?invitation=CODE`), or from an admin accepting an entry request.
  - Roles are `joueur` and `admin`; the founder (`fondateur: true`) can't be demoted.
  - `compteQuandPret(fn)` runs code once inside. `COMPTE = {etat, uid, nom, role}`. `FB_DB`/`FB_AUTH` are the Firebase handles. The nickname becomes `MOI.joueur`.
- **The table** (`registre` bundle): `registre/table-en-ligne.js` keeps the in-memory `T` and `fusionner()`, and only swaps the transport.
  - Each `CLES_FUSION` entry is one document, shaped by `commun/formes-en-ligne.js`: JSON groups `f` (sheet, owner only), `e` (game state, writable by campaign members, or by everyone for PNJ and missions) and `c` (the session's combat map), plus `proprietaire`, `campagne`, `majS` and so on.
  - Ownership is tracked in the sync layer (`mondeOmbre(col, id)`), **never in `T`**: the `norm*` functions rebuild objects field by field.
  - Reads are deltas on `majS` (server time) with cursors in localStorage. Campaign-private collections (séances, paragraphes, rencontres, adversaires, jets) are read with one query per campaign the user belongs to.
  - Writes send only the changed groups. A refused change reverts to the server version.
  - The local cache is per account (`faelorenn.compte.dernier`): another account, or the first online start, starts from an empty `T`.
- **The other registries** (Havre, bestiary, skills, plans) still call the old GitHub API in `commun/sync-github.js`, which is now a **façade**.
  - Once logged in, `ghcDoc`, `ghcPret`, `ghcLireUnFichier` and `ghcPanneau` go to `mondeDoc`, `mondeActif`, `mondeLireFichier` and an online panel (`compte/monde-en-ligne.js`, `MONDE_FICHIERS`). GitHub is never called.
  - `mondeDoc` splits each "file" into one doc per piece: `havre`, `creatures`, `familles`, `butins`, `plans` (ids `section:id`), plus the single doc `regles/maison`.
- **Validation**: creatures, familles, butins, plans and draw tables (`tables`) carry `statut` (`prive` → `propose` → `valide`). Players propose from the home page (`index/creations.js`); admins validate in `admin.html`. An owner editing a validated piece sends it back to `propose`.
- **Skills**: admins only. Players see them read-only and send `propositions` (`competences/propositions.js`).
- **`admin.html`**: invitations, entry requests, accounts, the validation queue, skill proposals, campaign members, and the **import** of the old private repo's JSON files (lossless, idempotent, name → account mapping).
- **`firestore.rules` is the real security**: the config in `src/js/compte/config.js` is public by design. Every rule change needs tests in `outils/tests-regles/` (30 today, allowed and refused cases) before deploying:

  ```
  cd outils/tests-regles && npm install && npm test   # Firebase emulator, needs Java 21; CI runs it too
  firebase deploy --only firestore                    # rules + indexes (firestore.indexes.json)
  ```

- `?emulateur` on localhost points the site at local emulators (`firebase emulators:start --only auth,firestore`). Snapshots inject a fake account (`window.FAE_ESSAI`) that skips Firebase.
- The plan and its decisions: `C:\Users\gmont\.claude\plans\en-attendant-tu-peux-declarative-map.md` (on Gaël's machine). Still to do: lore UI on PNJ sheets, campaign member management from the table, per-entry UI guards in the registers (the rules already refuse), and removal of the GitHub code (`ghc*`, FSA shared-file mode).

## Privacy constraint

This repo is public and contains only code and rulebook content. Player data lives in Firestore, protected by `firestore.rules`, and in each browser's cache. The old private repo (`faelorenn-table`) is only an import source. Never write player data, tokens or real exports into this repo (tests use fictional data), and keep the document shapes in `formes-en-ligne.js` / `MONDE_FICHIERS` stable, or migrate them.

## Checking a change

Besides the Firestore rules tests above, the behaviour check is a page snapshot (needs Chrome or Edge; set `CHROME=<path>` if it isn't found):

```
node outils/instantanes.mjs prendre instantanes/avant     # before the change
node outils/build.mjs
node outils/instantanes.mjs prendre instantanes/apres
node outils/instantanes.mjs comparer instantanes/avant instantanes/apres
```

It loads every root page in headless Chrome with randomness and the clock frozen, then compares JS errors, missing resources, the rendered DOM, and computed styles at desktop width, phone width and in print. It only exercises the initial load with empty storage; interactive features still need a manual check. `instantanes/` is git-ignored.
