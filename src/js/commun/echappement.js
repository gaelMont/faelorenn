/* ============ l'échappement : un texte posé dans du HTML ou du XML ============
   & < > et " deviennent des entités : un nom comme « Gorm <le Rouge> » s'affiche tel quel au lieu
   d'être lu comme une balise, et un texte venu d'un autre joueur ne peut rien glisser dans la page.
   Une valeur absente (null, undefined) donne une chaîne vide. L'apostrophe n'est pas touchée :
   les attributs s'écrivent entre guillemets doubles.
   Une déclaration « function » : ce module peut se trouver dans deux scripts d'une même page
   (index et plans chargent le paquet sync-github en plus du leur). */
function echapperHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]);
}
