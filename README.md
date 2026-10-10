# Faelorenn · les registres

Huit outils pour jouer à Faelorenn, dans un navigateur :

- `missions.html` : le Registre des Missions. Le tableau du Havre : les missions, leur paie et leurs points, un clic pour lancer la mission dans la table, un éditeur pour écrire les siennes, le générateur de mission du livre.
- `table.html` : le Registre de la Table. La partie en cours : compte rendu des séances avec les jets et les dégâts, l'oracle (oui ou non, un visage connu), combat et butin suivis à côté du récit, personnages. À plusieurs, et en plusieurs campagnes à la fois dans le même monde : une liste déroulante choisit celle qu'on joue, une table jouée à part s'y ajoute comme une campagne de plus.
- `pnj.html` : le Registre des Visages. Fiches de PNJ, leurs liens entre eux et avec les personnages, réseau, histoire des liens.
- `marchefleurs.html` : le Registre des Marchefleurs. La fiche de chaque personnage : ce qu'il porte, son sac, sa bourse, le marché du livre, sa progression, son histoire. L'impression au format du Word. Un personnage qu'on arrête de jouer y entre dans le monde comme PNJ.
- `createur.html` : le Registre du Havre. Création de personnage, liste de tes personnages, impression, export Word, export .json pour la Table.
- `rencontres.html` : le Registre des Rencontres. Tirage de rencontres, envoi dans la séance, bestiaire maison, familles, tables de butin, traits.
- `competences.html` : le Registre des Compétences. Retoucher les Pratiques de chaque liste et la caractéristique qui les lance, les compétences et leur caractéristique, les compétences de Bannière. Le créateur et la table s'en servent ; le fichier du dépôt se partage avec les autres joueurs.
- `plans.html` : le Registre des Plans. Les plans des bâtiments (étage par étage, façade), des villages et des cartes du monde. En mode Consulter, on lit, on zoome et on entre d’une carte dans un village puis dans un bâtiment sans rien risquer de bouger ; en mode Modifier, on dessine, avec des pièces rectangulaires, rondes ou en forme libre, tracées à la plume : un clic pose un point, un clic glissé courbe le côté. Les murs s'arrondissent aussi, et les portes et fenêtres se posent sur les courbes. Chaque plan est gardé dans le navigateur, et dans le dépôt une fois relié. Un plan, un plan avec ceux qui en dépendent, ou tous les plans d’un genre (bâtiments, villages, cartes du monde) s’exportent avec « Exporter » et se reprennent avec « Importer », en .json, côte à côte dans la barre d’outils. Un bouton plein écran (Maj+F) donne toute la fenêtre à l’établi.

`index.html` est la page d'accueil qui mène aux huit, et où l'on relie la sauvegarde en ligne. `progression.html` ne fait plus que mener à la progression, dans le Registre des Marchefleurs : les anciens liens marchent encore.


## Tout garder en ligne

La table et ses PNJ, les personnages, le bestiaire, les retouches de compétences et les plans se gardent dans un **autre** dépôt, **privé**, pour que vos séances ne soient pas publiques.

1. Crée un dépôt privé, `faelorenn-table` par exemple, en cochant « Add a README file ».
2. Crée un jeton : « Settings », « Developer settings », « Personal access tokens », « Fine-grained tokens », « Generate new token ». Accès : seulement ce dépôt. Permission : « Contents » en « Read and write ». Mets une date d'expiration.
3. Sur la page d'accueil du site, section « Tout garder en ligne », colle `ton-nom/faelorenn-table` et le jeton, puis « Relier ». Les registres de ce navigateur s'en servent aussitôt.
4. Donne le même dépôt et le même jeton aux autres joueurs, par un message privé. Un jeton à accès fin ne marche que pour les dépôts de son propriétaire.

Dans le dépôt privé, chaque registre a son fichier : `table-faelorenn.json`, `personnages.json`, `bestiaire.json`, `competences.json`, `plans.json`, plus un `LISEZMOI.md` qui les présente. Le jeton reste dans le navigateur où il est collé ; il n'est jamais écrit dans un dépôt. Chaque enregistrement devient une version dans l'historique du dépôt, qu'on peut toujours retrouver.

## Ce qui est public

Le code des registres, et donc ce qu'ils contiennent du livre : peuples, Pratiques, bestiaire. Les personnages, les séances et le bestiaire maison ne sont que dans vos navigateurs et dans le dépôt privé.
