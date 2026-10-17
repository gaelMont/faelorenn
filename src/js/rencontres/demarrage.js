/* ---------- demarrage, en dernier : tout ce qui precede est defini ---------- */
load();
/* les rencontres gardees par l'ancienne version n'avaient pas d'identifiant de creature */
S.liste = (S.liste || []).map(a => {
  if(a.cid) return a;
  const c = ADV.creatures[a.r] && ADV.creatures[a.r].find(x => x.n === a.n);
  return Object.assign({}, a, {cid: c ? c.id : ''});
});
if(['tout', 'livre', 'maison'].indexOf(S.source) < 0) S.source = 'tout';
demarrerStockage();
/* une rencontre composée avec l'ancien bestiaire : ses entrées n'existent plus, on en tire d'autres au même rang */
if(S.liste.some(a => ANCIEN_ID.test(a.cid || '')))
  S.liste = S.liste.map(a => ANCIEN_ID.test(a.cid || '') ? Object.assign(creature(a.r), {id:a.id}) : a);
brancherBestiaire();
brancherEnLigne();
if(!S.liste.length) tirerComposition();
draw();
