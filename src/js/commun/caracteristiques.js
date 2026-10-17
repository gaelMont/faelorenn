/* ============ ce que dit le livre : les sept caractéristiques et leurs compétences ============
   Une seule liste pour le créateur, la table et le Registre des Compétences. */
const CARS = ['Force','Dextérité','Constitution','Intelligence','Sagesse','Charisme','Contenance'];
const ABBR = {Force:'FOR','Dextérité':'DEX',Constitution:'CON',Intelligence:'INT',Sagesse:'SAG',Charisme:'CHA',Contenance:'CNT'};
const SKILLS = {
  Force:['Athlétisme','Combat'],
  'Dextérité':['Acrobatie','Discrétion','Artisanat','Tir'],
  Constitution:[],
  Intelligence:['Savoir','Investigation','Nature','Récits','Connaissance des Floraisons'],
  Sagesse:['Perception','Empathie','Médecine','Survie',"Sentir l'Énergie"],
  Charisme:['Persuasion','Tromperie','Intimidation','Représentation'],
  Contenance:[]
};
