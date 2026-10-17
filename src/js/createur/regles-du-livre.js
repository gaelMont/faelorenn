const SOCIAL = ['Persuasion','Tromperie','Intimidation','Représentation'];
const ALLSKILLS = [];
CARS.forEach(c => SKILLS[c].forEach(s => ALLSKILLS.push({s:s, car:c})));

const VOIES = {
  'Éclaireur':{b:{'Discrétion':20,'Perception':20,'Survie':20},paq:'Une dague (d4), une corde de dix pas, une lanterne sourde au volet grippé, de la craie, 10 argents.'},
  'Chercheur':{b:{'Nature':20,'Savoir':20,'Connaissance des Floraisons':20},paq:'Un bâton (d4), un registre épais, trois flacons vides pour prélever, une loupe de verre, 15 argents.'},
  'Chasseur':{b:{'Tir':20,'Athlétisme':20,'Survie':20},paq:'Un arc (d6) et douze flèches, un couteau (d4), des collets, une peau huilée, 8 argents.'},
  'Secouriste':{b:{'Médecine':40,'Empathie':20},paq:"Un couteau (d4), aiguilles, fil et linges, deux fioles de Havre, le carnet de relevé du groupe, 12 argents."},
  'Porte-parole':{b:{'Persuasion':20,'Représentation':20,'Tromperie':20},paq:'Une épée courte (d6), des habits propres, un sceau de recommandation de son Havre, 30 argents.'},
  'Marchand':{b:{'Tromperie':40,'Perception':20},paq:'Une dague (d4), une balance à main et ses poids, un registre de dettes, 40 argents.'},
  'Garde':{b:{'Combat':20,'Athlétisme':20,'Intimidation':20},paq:'Une lance (d6), un bouclier, un cuir matelassé, un sifflet, 8 argents.'},
  'Artisan':{b:{'Artisanat':40,'Savoir':20},paq:'Un marteau (d6), une caisse d’outils, de la corde et du fil de fer, de la colle de sève, 15 argents.'}
};

const ECOLES = {
  'Eshar · le feu':'du feu (Ilvès et Eshar)',
  'Zhern · l’onde':"de l'onde (Zhern)",
  'Velh · le vent':'du vent (Vaellen et Velh)',
  'Khaor · la pierre':'de la pierre (Cimérans et Khaor)',
  'Nïhr · l’ombre':"de l'ombre (Nïhr)",
  'Église d’Ysse · le sacré':"du sacré (Église d'Ysse)"
};

const PEUPLES = {
  'Humains':{car:{pick:2,val:1},traits:'Ambition (1 relance par séance)',contrainte:'Les dégâts magiques comptent une fois et demie',
    armure:'Toutes, jusqu’aux plates',red:0,pv:0,comp:'',
    paq:'L’insigne de sa Bannière, la baguette de son école s’il en a une, et 20 argents de plus',
    dom:null,sub:[{k:'ban',l:'Bannière',o:["L'Or",'Le Sang']},{k:'ecole',l:'École ou Église',o:Object.keys(ECOLES)}],
    note:'Un humain choisit trois Pratiques dans son école, plus une compétence de sa Bannière. Sans sa baguette, il ne pratique pas.'},
  'Élytris':{car:{'Dextérité':1,'Sagesse':1},traits:'Carapace (réduction 1) · Antennes (+20 Sentir l’Énergie) · Ailes (aucun dégât de chute)',
    contrainte:'Les dégâts physiques comptent une fois et demie',armure:'Jusqu’au cuir : les élytres doivent pouvoir s’ouvrir',
    red:1,pv:0,sk:{"Sentir l'Énergie":20},dom:'de la Sève (Écorciens et Élytris)',
    comp:'Élytres (1 PC) : quinze pas dans la direction que tu veux. · Héliotrope : trois rounds immobile en pleine lumière, tu récupères 1d4 PC, une fois par jour.',
    paq:'Une lame de chitine taillée dans sa propre mue : arme légère, d4. Personne d’autre ne peut s’en servir.'},
  'Nyréens':{car:{},traits:'Écailles (réduction 1) · Formation (+10 à une compétence)',
    contrainte:'La puissance de ses Pratiques suit l’eau disponible',armure:'Jusqu’au cuir clouté : il faut pouvoir nager, et ressortir de l’eau',
    red:1,pv:0,dom:"de l'eau (Nyréens)",choixSk:{label:'Formation, +10 à une compétence',list:null},
    sub:[{k:'branche',l:'Branche',o:['Les Larges, la mer','Les Vifs, la rivière','Les Dormants, le lac']}],
    comp:'Boire la Mémoire : contact avec de l’eau ayant séjourné là. · L’Arme d’eau : 10 rounds, le dé de l’eau disponible plus mod FOR.',
    paq:'Sa gourde de combat, et la fiole qu’il traite comme son âme.',
    note:'Un Nyréen prend ses trois Pratiques parmi les communes et celles de sa branche.'},
  "Ori'Ican":{car:{},traits:'Vision de ruine · Endurci (+10 Survie)',contrainte:'Soigné, il peut partir en fureur',
    armure:'Jusqu’à la maille : une armure ajustée ne l’est plus après la mue',red:0,pv:0,sk:{'Survie':10},
    dom:"de la Mue (Ori'Ican)",sub:[{k:'type',l:'Type',o:['Cornu','Ritualiste','Figé']}],comp:'',
    paq:'Un fragment de totem qui le stabilise.',
    paqSub:{Cornu:'Sa lance de première mue (d8).'}},
  'Cimérans':{car:{Force:1,Constitution:1},traits:'Carrure (+8 PV) · Ami de tous (+10 à une compétence sociale)',
    contrainte:'En morne, il agit un tour sur deux',armure:'Toutes, jusqu’aux plates',red:0,pv:8,
    choixSk:{label:'Ami de tous, +10 à une compétence sociale',list:SOCIAL},dom:'de la pierre (Cimérans et Khaor)',
    comp:'Darguer : contact, dégâts égaux à ta Charge, et elle retombe à zéro. · Dorner : tu portes la moitié des dégâts de tes alliés, automatiquement.',
    paq:'Le sel et le gobelet de corne de sa dargue, et un objet qu’on lui a confié et qu’il n’a jamais rendu.',
    note:'La Charge se suit sur une piste à part. Capacité : tes PV maximum.'},
  'Ilvès':{car:{Contenance:1,'Dextérité':1},traits:'Sentir la chaleur (+20 Perception pour repérer un corps vivant) · La Tournée (+20 Représentation)',
    contrainte:'Puiser à vide coûte des PV',armure:'Jusqu’au cuir clouté : le métal chauffe contre eux jusqu’à devenir une torture',
    red:0,pv:0,sk:{'Représentation':20},dom:'du feu (Ilvès et Eshar)',
    comp:'Attiser (1 PC) : contact, tu dépenses 1 PC, l’allié en gagne 2. · Danse pyrétique. · Jongleur ardent (1 PC).',
    paq:'Son matériel de tournée : trois boules, un foulard, un pot à braises.',
    note:'Le +20 de Perception ne vaut que pour repérer un corps vivant : il n’est pas compté dans le tableau.'},
  'Vaellen':{car:{'Dextérité':1,'Sagesse':1},traits:'Vol (aucun dégât de chute) · Lire le paysage (+20 Perception en hauteur)',
    contrainte:'Chargé, il ne vole pas',armure:'Cuir. Au-delà il peut, mais il ne vole plus',red:0,pv:0,
    dom:'du vent (Vaellen et Velh)',
    comp:'Porter : tu emportes en vol une créature de ta taille ou moins sur vingt pas. · Attaque en piqué : tu plonges depuis la hauteur, 2d6+2, et tu te poses.',
    paq:'Un tube à messages et un sac ridicule.',
    note:'Le +20 de Perception ne vaut qu’en hauteur : il n’est pas compté dans le tableau.'},
  'Écorciens':{car:{Constitution:2},traits:'Écorce (réduction 2) · Croissance (tu changes ta taille)',
    contrainte:'Le feu compte double',armure:'Aucune. Son écorce grandit avec lui, rien ne reste ajusté',red:2,pv:0,
    dom:'de la Sève (Écorciens et Élytris)',
    comp:'S’enraciner : 3 rounds, réduction 4, +1d6 PV par round, rien ne te déplace. · Croissance forcée (1x/jour) : 2d6+1 jusqu’à 10 pas.',
    paq:'Rien. Il n’a pas de poches. Ses graines, s’il en produit.'}
};

const TYPES = {Cornu:{Force:2},Ritualiste:{Contenance:1,Sagesse:1},'Figé':{'Dextérité':2}};
const BRANCHES = {'Les Larges, la mer':{Force:2},'Les Vifs, la rivière':{'Dextérité':2},'Les Dormants, le lac':{Contenance:1,Sagesse:1}};
