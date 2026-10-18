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
- **Shared code lives once, in `src/js/commun/`**: GitHub sync (`sync-github.js`), house rules (`reglesmaison.js`), Pratiques, the book's bestiary (`bestiaire.js`, `const ADV`, generated from Gaël's spreadsheet by an external `classeur/vers_site.py`), encounter draw (`tirage.js`), traits, loot (`butin.js`), characteristics, downloads, the `.docx` factory (`docx.js`: UTF-8, CRC, uncompressed zip, XML escape and the fixed package parts; `rencontres/docx.js` and `createur/export-word.js` each still write their own document, styles and properties), the printable Word sheet (`fiche-du-word.js` draws it from a description that `createur/fiche-imprimable.js` and `registre/marchefleurs.js` each prepare; its CSS is `src/css/commun/fiche-du-word.css`, for `.fiche` and `.fimp`). It is listed in each bundle that uses it.
- **`plans` is `'use strict'`** (its first module). Never put a `commun/` module in it, or it would become strict. `plans` and `index` load `sync-github` as a separate `<script>`.
- **Similar code that is *not* shared on purpose**: some copies differ in behaviour (e.g. the creature normalisation in `rencontres/bestiaire-maison.js` vs `registre/rencontre-a-la-table.js`, the HTML-escape helpers `esc`/`ech`/`xe`, the colour tokens in each CSS `:root`). Unifying them changes behaviour, so don't do it silently.
- **Cross-page communication**: pages talk through `localStorage` (`faelorenn.*` keys) plus `storage` event listeners, through named windows (`ONGLET_*`), and through `postMessage` (plans → table combat map). Inline mentions in text: `/Nom` cites a person, `--Lieu` cites a place.
- **Claude artifact runtime**: the code checks for `claude.use` (`ghcBloque()`, the `downloads` capability). Inside a Claude artifact, GitHub sync is off and downloads go through the runtime. Keep both paths working.

## Privacy constraint

This repo is public and contains only code and rulebook content. Player data (characters, sessions, home-made bestiary, plans) lives in browser localStorage and in the user's private sync repo (`faelorenn-table`, one JSON file per registry). Never write player data or tokens into this repo, and don't change those JSON formats without a migration.

## Checking a change

There is no test suite. The behaviour check is a page snapshot (needs Chrome or Edge; set `CHROME=<path>` if it isn't found):

```
node outils/instantanes.mjs prendre instantanes/avant     # before the change
node outils/build.mjs
node outils/instantanes.mjs prendre instantanes/apres
node outils/instantanes.mjs comparer instantanes/avant instantanes/apres
```

It loads every root page in headless Chrome with randomness and the clock frozen, then compares JS errors, missing resources, the rendered DOM, and computed styles at desktop width, phone width and in print. It only exercises the initial load with empty storage; interactive features still need a manual check. `instantanes/` is git-ignored.
