/* ====== lisibilité d'un grand village ======
   Tout ce qui se lit (les points de repère, les noms, la légende sous la carte) était en pixels fixes : sur un village de
   800 mètres, la feuille fait plus de trois mille pixels de large et tout cela devenait minuscule. Ces tailles suivent
   maintenant la taille de la carte. */
const vEch=v=>clamp(Math.max(v.W||0,v.H||0)*VU/800,1,3.4);
