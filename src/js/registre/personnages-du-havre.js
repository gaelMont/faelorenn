/* ============ les personnages du Registre du Havre, à faire entrer dans la table ============
   Le Havre les garde dans ce navigateur, et dans personnages.json du dépôt quand la sauvegarde
   en ligne est reliée. Ici, on les lit sans les changer : une fois entré, le personnage vit sa vie
   à la table (PV, PC, progression), et le Havre garde sa fiche de création. */

const CLE_HAVRE = 'faelorenn.personnages';
const HAVRE = {ouvert:false, liste:[], lecture:false, depot:false, erreur:'', msgT:null};

function normHavre(o){
  const m = {};
  const src = o && o.personnages && typeof o.personnages === 'object' ? o.personnages : {};
  Object.keys(src).forEach(id => {
    const x = src[id];
    if(!x || typeof x !== 'object') return;
    m[id] = {id:id, maj:+x.maj || 0, supprime:!!x.supprime, nom:txtOu(x.nom), peuple:txtOu(x.peuple), voie:txtOu(x.voie),
      auteur:txtOu(x.auteur), fiche:x.fiche && typeof x.fiche === 'object' ? x.fiche : null};
  });
  return m;
}
/* le plus récent l'emporte ; un personnage supprimé dans le Havre n'est pas proposé */
function fondreHavre(a, b){
  const m = Object.assign({}, a);
  Object.keys(b).forEach(id => { if(!m[id] || (b[id].maj || 0) > (m[id].maj || 0)) m[id] = b[id]; });
  return m;
}
const vivantsHavre = m => Object.keys(m).map(k => m[k]).filter(r => !r.supprime).sort((x, y) => (y.maj || 0) - (x.maj || 0));
function havreIci(){ try{ return normHavre(JSON.parse(localStorage.getItem(CLE_HAVRE) || 'null')); }catch(e){ return {}; } }

function chargerHavre(){
  let m = havreIci();
  HAVRE.liste = vivantsHavre(m); HAVRE.depot = false; HAVRE.erreur = '';
  HAVRE.lecture = ghcPret();
  dessinerHavre();
  if(!HAVRE.lecture) return;
  ghcLireUnFichier(GHC_FICHIERS.personnages).then(o => {
    if(o && o.format === 'faelorenn-personnages') m = fondreHavre(m, normHavre(o));
    HAVRE.liste = vivantsHavre(m); HAVRE.depot = true; HAVRE.lecture = false;
    dessinerHavre();
  }, e => {
    HAVRE.lecture = false; HAVRE.erreur = e && e.gh ? e.gh : 'Le dépôt ne répond pas.';
    dessinerHavre();
  });
}
function direHavre(t, ok){
  const m = $('pHavreMsg');
  m.textContent = t; m.className = 'note ' + (ok ? 'ok' : 'err'); m.hidden = false;
  clearTimeout(HAVRE.msgT); HAVRE.msgT = setTimeout(() => { m.hidden = true; }, 8000);
}
function entrerHavre(r){
  if(!r.fiche){ direHavre('La fiche de « ' + (r.nom || 'Sans nom') + ' » est incomplète : ouvre-le une fois dans le Registre du Havre, puis réessaie.', false); return; }
  const c = depuisFiche(r.fiche);
  const deja = persoALaTable(c.nom);
  if(deja){ direHavre('« ' + (c.nom || 'Sans nom') + ' » est déjà ' + dejaALaTable(deja) + '.', false); return; }
  /* le personnage est à celui qui l'a créé, pas forcément à celui qui le fait entrer */
  c.joueur = r.auteur || MOI.joueur;
  c.id = idLibre('p-' + slug(c.nom), T.personnages);
  rattacher(c);
  changer(() => majPerso(c));
  direHavre('« ' + (c.nom || 'Sans nom') + ' » est entré dans la table' + (plusieursCampagnes() ? ' de « ' + nomCampagne(idCourante()) + ' »' : '') + '.', true);
}
function dessinerHavre(){
  const b = $('pHavreOuvrir');
  b.setAttribute('aria-expanded', HAVRE.ouvert ? 'true' : 'false');
  $('pHavre').hidden = !HAVRE.ouvert;
  if(!HAVRE.ouvert) return;
  $('pHavreSource').textContent = HAVRE.lecture ? 'lecture du dépôt…'
    : HAVRE.depot ? 'dans ce navigateur et dans le dépôt ' + GHC.depot
    : 'dans ce navigateur' + (HAVRE.erreur ? ' (' + HAVRE.erreur.replace(/\.$/, '') + ')' : '');
  const liste = $('pHavreListe');
  liste.innerHTML = '';
  if(!HAVRE.liste.length){
    liste.append(el('p', 'note', HAVRE.lecture ? 'Un instant…'
      : 'Aucun personnage enregistré dans le Registre du Havre' + (HAVRE.depot ? '.' : ' sur ce navigateur. Relie la sauvegarde en ligne pour voir aussi ceux des autres appareils.')));
    return;
  }
  HAVRE.liste.forEach(r => {
    const row = el('div', 'hrow');
    const t = el('div', 'htxt');
    t.append(el('span', 'hnom', r.nom || 'Sans nom'));
    let quand = '';
    try{ quand = r.maj ? 'le ' + new Date(r.maj).toLocaleDateString('fr-BE', {day:'numeric', month:'long'}) : ''; }catch(e){}
    t.append(el('span', 'hmeta', [[r.peuple, r.voie].filter(Boolean).join(', '), r.auteur ? 'par ' + r.auteur : '', quand].filter(Boolean).join(' · ')));
    const ici = persoALaTable(r.nom), la = !!ici;
    const bt = el('button', la ? 'btn ghost sm' : 'btn sm', la ? 'Déjà ' + dejaALaTable(ici) : 'Faire entrer à la table');
    bt.type = 'button'; bt.disabled = la;
    bt.setAttribute('aria-label', la ? (r.nom || 'Sans nom') + ' est déjà ' + dejaALaTable(ici) : 'Faire entrer ' + (r.nom || 'ce personnage') + ' à la table');
    bt.onclick = () => entrerHavre(r);
    row.append(t, bt);
    liste.append(row);
  });
}
function brancherHavre(){
  $('pHavreOuvrir').onclick = () => {
    HAVRE.ouvert = !HAVRE.ouvert;
    if(HAVRE.ouvert) chargerHavre(); else dessinerHavre();
  };
}
