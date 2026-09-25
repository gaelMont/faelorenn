# Faelorenn · les registres

Six outils pour jouer à Faelorenn, dans un navigateur :

- `missions.html` : le Registre des Missions. Le tableau du Havre : les missions, leur paie et leurs points, un clic pour lancer la mission dans la table, un éditeur pour écrire les siennes, le générateur de mission du livre.
- `table.html` : le Registre de la Table. La partie en cours : compte rendu des séances avec les jets et les dégâts, combat et butin suivis à côté du récit, personnages. À plusieurs.
- `pnj.html` : le Registre des Visages. Fiches de PNJ, leurs liens entre eux et avec les personnages, réseau, histoire des liens.
- `progression.html` : le Registre de la Progression. Les points des missions, et les achats au prix du livre.
- `createur.html` : le Registre du Havre. Création de personnage, liste de tes personnages, impression, export Word, export .json pour la Table.
- `rencontres.html` : le Registre des Rencontres. Tirage de rencontres, envoi dans la séance, bestiaire maison, familles, tables de butin, traits.

`index.html` est la page d'accueil qui mène aux six, et où l'on relie la sauvegarde en ligne.


## Tout garder en ligne

La table et ses PNJ, les personnages et le bestiaire se gardent dans un **autre** dépôt, **privé**, pour que vos séances ne soient pas publiques.

1. Crée un dépôt privé, `faelorenn-table` par exemple, en cochant « Add a README file ».
2. Crée un jeton : « Settings », « Developer settings », « Personal access tokens », « Fine-grained tokens », « Generate new token ». Accès : seulement ce dépôt. Permission : « Contents » en « Read and write ». Mets une date d'expiration.
3. Sur la page d'accueil du site, section « Tout garder en ligne », colle `ton-nom/faelorenn-table` et le jeton, puis « Relier ». Les registres de ce navigateur s'en servent aussitôt.
4. Donne le même dépôt et le même jeton aux autres joueurs, par un message privé. Un jeton à accès fin ne marche que pour les dépôts de son propriétaire.

Dans le dépôt privé, chaque registre a son fichier : `table-faelorenn.json`, `personnages.json`, `bestiaire.json`, plus un `LISEZMOI.md` qui les présente. Le jeton reste dans le navigateur où il est collé ; il n'est jamais écrit dans un dépôt. Chaque enregistrement devient une version dans l'historique du dépôt, qu'on peut toujours retrouver.

## Ce qui est public

Le code des registres, et donc ce qu'ils contiennent du livre : peuples, Pratiques, bestiaire. Les personnages, les séances et le bestiaire maison ne sont que dans vos navigateurs et dans le dépôt privé.
