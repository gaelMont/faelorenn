/* ============ démarrage, en dernier : tout ce qui précède est défini ============ */
load();
/* ce que ce navigateur avait gardé, avant qu'on y remette de l'ordre : c'est avec lui que se voit si la fiche ouverte la dernière fois a changé */
const BRUT = ghcCanon(copieS());
remettreEnOrdre();
brancherMiens();
/* toujours une fiche vierge à l'ouverture : tes personnages sont dans la liste, en haut */
const RANGE = ouvrirVierge(BRUT);
draw();
dessinerMiens();
if(RANGE) direMien('« ' + RANGE + ' », resté ouvert la dernière fois, est rangé dans tes personnages.', true);
dispoTelechargement();
/* ce que le Registre des Compétences retouche : relu dans le dépôt, avec un avis s'il y a du neuf */
regSurveiller();
