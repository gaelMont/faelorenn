/* ============ les jets : ce qu'une fiche permet de tenter, et l'historique ============ */

function optionsJet(c){
  const out = [];
  CARS.forEach(x => out.push({k:'car:' + x, l:x + ' (caractéristique)', val:c.car[x] * 2}));
  ALLSKILLS.forEach(o => out.push({k:'comp:' + o.s, l:nomComp(o.s), val:compTotal(c, o.s)}));
  c.pratiques.forEach(p => {
    const v = pratValeur(c, p);
    out.push({k:'prat:' + p.n, l:p.n + ' (Pratique)', val:v.val, jet:p.j, par:v.par});
  });
  return out;
}

function heure(t){
  const d = new Date(t || 0);
  const n = x => (x < 10 ? '0' : '') + x;
  return n(d.getHours()) + ':' + n(d.getMinutes());
}
function dessinerJets(){
  const f = $('jFiltre'), avant = f.value;
  f.innerHTML = '';
  f.add(new Option('Tout le monde', ''));
  const noms = {}, jets = jetsDe(idCourante());   /* l'historique de la campagne qu'on suit */
  jets.forEach(j => { if(j.perso) noms[j.perso] = 1; });
  persos().forEach(c => { if(c.nom) noms[c.nom] = 1; });
  Object.keys(noms).sort((a, b) => a.localeCompare(b, 'fr')).forEach(n => f.add(new Option(n, n)));
  f.value = avant && [].slice.call(f.options).some(o => o.value === avant) ? avant : '';

  const box = $('jHisto'); box.innerHTML = '';
  const liste = jets.filter(j => !f.value || j.perso === f.value).slice().reverse();
  if(!liste.length){ box.append(el('p','vide','Rien de lancé pour l’instant. Les jets se font dans la séance, et atterrissent ici.')); return; }
  let jour = '';
  liste.slice(0, 150).forEach(j => {
    const d = new Date(j.t || 0).toLocaleDateString('fr-BE', {weekday:'long', day:'numeric', month:'long'});
    if(d !== jour){ jour = d; box.append(el('div','jour', d)); }
    const l = el('div','ligne');
    l.append(el('span','h', heure(j.t)));
    const q = el('span','q');
    q.append(el('b', null, j.perso || j.auteur || '·'));
    q.append(document.createTextNode(' · ' + j.quoi));
    if(j.mode !== 'des' && j.seuil != null) q.append(el('span','mini', ' (sous ' + j.seuil + ' au ' + j.mode + ')'));
    if(j.main) q.append(el('span','mini', ' · dé de la table'));
    if(j.auteur && j.auteur !== j.perso) q.append(el('span','mini', ' · ' + j.auteur));
    l.append(q);
    l.append(el('span','r' + (j.mode === 'des' ? '' : j.reussite ? ' ok' : ' ko'), String(j.jet)));
    box.append(l);
  });
}
