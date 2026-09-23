# Faelorenn · les registres

Quatre outils pour jouer à Faelorenn, dans un navigateur :

- `table.html` : le Registre de la Table. La partie en cours : compte rendu des séances avec les jets et les dégâts, combat suivi à côté du récit, personnages, progression. À plusieurs.
- `pnj.html` : le Registre des Visages. Fiches de PNJ, leurs liens entre eux et avec les personnages, réseau.
- `createur.html` : le Registre du Havre. Création de personnage, liste de tes personnages, impression, export Word, export .json pour la Table.
- `rencontres.html` : le Registre des Rencontres. Tirage de rencontres, envoi dans la séance, bestiaire maison, familles, traits.

`index.html` est la page d'accueil qui mène aux quatre, et où l'on relie la sauvegarde en ligne.

## Mettre le site en ligne

1. Sur GitHub, crée un dépôt **public**, `faelorenn` par exemple. Avec un compte gratuit, GitHub Pages ne publie que les dépôts publics.
2. Dans le dépôt, « Add file », puis « Upload files ». Glisse les six fichiers : `index.html`, `table.html`, `pnj.html`, `createur.html`, `rencontres.html`, `README.md`. Valide avec « Commit changes ».
3. Dans « Settings », rubrique « Code and automation », ouvre « Pages ». Sous « Build and deployment », choisis « Deploy from a branch », puis la branche `main` et le dossier `/ (root)`. « Save ».
4. Attends quelques minutes (jusqu'à dix, selon GitHub). L'adresse apparaît en haut de la page « Pages », avec « Visit site » : `https://ton-nom.github.io/faelorenn/`.

Pour mettre un registre à jour, refais l'étape 2 avec le nouveau fichier : il remplace l'ancien.

## Tout garder en ligne

La table et ses PNJ, les personnages et le bestiaire se gardent dans un **autre** dépôt, **privé**, pour que vos séances ne soient pas publiques.

1. Crée un dépôt privé, `faelorenn-table` par exemple, en cochant « Add a README file ».
2. Crée un jeton : « Settings », « Developer settings », « Personal access tokens », « Fine-grained tokens », « Generate new token ». Accès : seulement ce dépôt. Permission : « Contents » en « Read and write ». Mets une date d'expiration.
3. Sur la page d'accueil du site, section « Tout garder en ligne », colle `ton-nom/faelorenn-table` et le jeton, puis « Relier ». Les registres de ce navigateur s'en servent aussitôt.
4. Donne le même dépôt et le même jeton aux autres joueurs, par un message privé. Un jeton à accès fin ne marche que pour les dépôts de son propriétaire.

Dans le dépôt privé, chaque registre a son fichier : `table-faelorenn.json`, `personnages.json`, `bestiaire.json`, plus un `LISEZMOI.md` qui les présente. Le jeton reste dans le navigateur où il est collé ; il n'est jamais écrit dans un dépôt. Chaque enregistrement devient une version dans l'historique du dépôt, qu'on peut toujours retrouver.

## Ce qui est public

Le code des registres, et donc ce qu'ils contiennent du livre : peuples, Pratiques, bestiaire. Les personnages, les séances et le bestiaire maison ne sont que dans vos navigateurs et dans le dépôt privé.
