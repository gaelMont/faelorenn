# Faelorenn · les registres

Trois outils pour jouer à Faelorenn, dans un navigateur :

- `table.html` : le Registre de la Table. Compte rendu des séances avec les jets, personnages, fiches de PNJ et réseau de leurs liens, progression. À plusieurs.
- `createur.html` : le Registre du Havre. Création de personnage, impression, export Word, export .json pour la Table.
- `rencontres.html` : le Registre des Rencontres. Tirage de rencontres, bestiaire maison, familles, traits.

`index.html` est la page d'accueil qui mène aux trois.

## Mettre le site en ligne

1. Sur GitHub, crée un dépôt **public**, `faelorenn` par exemple. Avec un compte gratuit, GitHub Pages ne publie que les dépôts publics.
2. Dans le dépôt, « Add file », puis « Upload files ». Glisse les cinq fichiers : `index.html`, `table.html`, `createur.html`, `rencontres.html`, `README.md`. Valide avec « Commit changes ».
3. Dans « Settings », rubrique « Code and automation », ouvre « Pages ». Sous « Build and deployment », choisis « Deploy from a branch », puis la branche `main` et le dossier `/ (root)`. « Save ».
4. Attends quelques minutes (jusqu'à dix, selon GitHub). L'adresse apparaît en haut de la page « Pages », avec « Visit site » : `https://ton-nom.github.io/faelorenn/`.

Pour mettre un registre à jour, refais l'étape 2 avec le nouveau fichier : il remplace l'ancien.

## Jouer à plusieurs avec GitHub

La table se garde dans un **autre** dépôt, **privé**, pour que vos séances ne soient pas publiques.

1. Crée un dépôt privé, `faelorenn-table` par exemple, en cochant « Add a README file ».
2. Crée un jeton : « Settings », « Developer settings », « Personal access tokens », « Fine-grained tokens », « Generate new token ». Accès : seulement `faelorenn-table`. Permission : « Contents » en « Read and write ». Mets une date d'expiration.
3. Dans le Registre de la Table, section « La table », ouvre « Synchroniser par GitHub », colle `ton-nom/faelorenn-table` et le jeton, puis « Relier à GitHub ».
4. Donne le même dépôt et le même jeton aux autres joueurs, par un message privé. Un jeton à accès fin ne marche que pour les dépôts de son propriétaire.

Le jeton reste dans le navigateur où il est collé ; il n'est jamais écrit dans un dépôt. Chaque changement de la table devient une version dans l'historique de `faelorenn-table`, qu'on peut toujours retrouver.

## Ce qui est public

Le code des registres, et donc ce qu'ils contiennent du livre : peuples, Pratiques, bestiaire. Les personnages et les séances ne sont que dans vos navigateurs et dans le dépôt privé.
