/* ====== noms et tables aléatoires ====== */
const NM={
 village(r){const A=['Val','Aube','Brume','Pierre','Roche','Chêne','Saule','Haut','Bas','Clair','Noir','Fer','Source','Lande','Mont','Bois','Combe','Bruyère','Épine','Tilleul','Ambre','Gris','Mousse','Corne'];
  const B=['fontaine','mont','val','gué','haie','bourg','mare','vent','lac','pré','roche','champ','bruyère','port','ombre','clairière'];
  const E1=['fae','lor','ael','wyn','thal','ior','dar','sil','mer','nor','eld','van','ith','cal'],E2=['renn','orenn','ys','wen','dal','mir','thas','lien','ael','dor'];
  const k=r();
  if(k<.4)return cap(pick(r,A).toLowerCase())+pick(r,B);
  if(k<.55)return 'Saint-'+pick(r,['Aubin','Cyr','Elme','Gilles','Hubert','Léger','Mathurin','Orens','Wandrille']);
  if(k<.7)return cap(pick(r,A).toLowerCase())+pick(r,B)+'-'+pick(r,['sur-Brume','les-Saules','la-Verte','en-Marche','du-Gué']);
  return cap(pick(r,E1)+pick(r,E2));},
 tavern(r){return pick(r,[['Le Sanglier','Rieur'],['L\'Ours','Ivre'],['Le Chaudron','Fendu'],['La Chope','d\'Or'],['Le Corbeau','Boiteux'],['Le Cerf','Blanc'],['La Lanterne','Bleue'],['L\'Étoile','Brisée'],['Le Renard','Malin'],['Le Cheval','Pâle'],['La Hache','Rouillée'],['Le Chat','Botté'],['Le Marchefleur','Fatigué'],['Le Dragon','Endormi'],['La Cloche','Fêlée']]).join(' ')},
 pnj(r){return pick(r,['Aldric','Brenna','Corwin','Elsbeth','Fenn','Garrik','Hilde','Isolde','Joran','Kestrel','Lysa','Maren','Nils','Orla','Perrin','Rhosyn','Soren','Tilda','Ulric','Vesna','Wystan','Yara','Thibault','Maëlle','Gaspard'])+' '+pick(r,['le Roux','Longuemain','Pierrefeu','de la Combe','Mille-Pas','Brasdefer','Verdelin','Aubépine','Corbeau','Troublefête'])},
 rue(r){return pick(r,['Rue','Chemin','Ruelle','Venelle'])+' '+pick(r,['des Tanneurs','du Moulin','de la Fontaine','des Saules','du Gué','de l\'Église','des Charrons','du Vieux Chêne','des Brumes','du Marché','de la Forge','aux Loups'])},
 piece(r){const A=['poussière et cire froide','odeur de pain tiède','humidité et vieux cuir','herbes séchées au plafond','silence épais, feu éteint','courant d\'air venu de nulle part','lumière dorée par les vitraux','suie, bougies, parchemins'];
  const O=['un coffre sans serrure','une carte annotée au charbon','une coupe ébréchée','un journal aux pages arrachées','une clé minuscule','un tapis trop propre','une cloche muette','un miroir voilé','des fleurs fraîches, sans vase'];
  const C=['personne','un garde endormi','un enfant qui se cache','un marchand pressé','un archiviste soupçonneux','un Marchefleur épuisé','un chat qui sait quelque chose','deux voix derrière la porte'];
  const S=['un panneau mobile derrière l\'étagère','une trappe sous le tapis','une inscription visible seulement à la bougie','une porte condamnée côté couloir','rien, et c\'est inquiétant','un passage vers la pièce voisine'];
  return {ambiance:pick(r,A),objet:pick(r,O),occupant:pick(r,C),secret:pick(r,S)}}
};
