/* ============ les feuilles de style de la page, pour les emporter ailleurs ============
   Les styles vivent dans des fichiers (<link>, assets/css/), plus dans des <style> de la page.
   - texteDesFeuilles() : leurs règles en texte, pour un HTML qui part seul (le presse-papiers vers Word).
     Seules les feuilles du site se laissent lire : celle des polices Google est sautée, comme avant
     quand on recopiait les <style> ; une page ouverte en file:// peut aussi refuser, on rend alors ''.
   - liensDesFeuilles() : des <link> vers ces mêmes fichiers, adresse complète, pour une fenêtre
     ouverte par la page (la carte sur l'autre écran) ; ça marche aussi en file://.
   Des déclarations « function » : ce module peut se trouver dans deux scripts d'une même page. */
function texteDesFeuilles(){
  const out = [];
  for(const f of Array.from(document.styleSheets)){
    let regles;
    try{ regles = f.cssRules; }catch(e){ continue; }
    if(regles) out.push(Array.from(regles, r => r.cssText).join('\n'));
  }
  return out.join('\n');
}
function liensDesFeuilles(){
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .filter(l => { try{ return new URL(l.href).origin === location.origin; }catch(e){ return false; } })
    .map(l => '<link rel="stylesheet" href="' + echapperHtml(l.href) + '">').join('');
}
