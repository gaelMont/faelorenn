/* ============ les tables à tirer ============
   Le Livre VIII en donne quatre : un inconnu qui arrive, les noms par peuple, la réaction sur le vif et la
   table d'inspiration. Elles sont ici telles que le livre les écrit, et tout se réécrit : une ligne, une
   colonne, une table entière. On en ajoute d'autres, et chaque ligne peut porter une rareté.

   La rareté marche en cascade, comme dans un jeu : on demande d'abord « est-ce que c'est très rare ? »,
   puis « rare ? », et faute de mieux on tire dans le courant. Chaque palier a sa chance à lui : en ajouter
   un ne change pas les autres. Sans palier, la table se tire à plat, comme le livre la donne. */

const TABLES_LIVRE = [{"id":"t-inconnu","nom":"Un inconnu arrive","mode":"chaque","aide":"Un d20 par colonne. Le nom se tire à part, dans la table des noms, une fois le peuple connu.","cols":[{"n":"Métier","l":[{"t":"Marchefleur en Tournée","p":"c"},{"t":"Gardien de Havre","p":"c"},{"t":"Batelier de l'Or","p":"c"},{"t":"Sergent du Sang","p":"c"},{"t":"Scelleur de contrats","p":"c"},{"t":"Apprenti d'une école","p":"c"},{"t":"Releveur de racines","p":"c"},{"t":"Pilleur de ruines","p":"c"},{"t":"Herboriste","p":"c"},{"t":"Tavernier","p":"c"},{"t":"Verrier","p":"c"},{"t":"Contrebandier de catalyseurs","p":"c"},{"t":"Cartographe","p":"c"},{"t":"Prêcheur d'Ysse","p":"c"},{"t":"Mineur de la Bordure","p":"c"},{"t":"Colporteur","p":"c"},{"t":"Convoyeur de bêtes","p":"c"},{"t":"Scribe de Havre","p":"c"},{"t":"Forgeron","p":"c"},{"t":"Sans métier, et ça se voit","p":"c"}]},{"n":"Peuple","l":[{"t":"Humain","p":"c"},{"t":"Humain","p":"c"},{"t":"Humain","p":"c"},{"t":"Humain","p":"c"},{"t":"Humain","p":"c"},{"t":"Humain","p":"c"},{"t":"Élytris","p":"c"},{"t":"Élytris","p":"c"},{"t":"Nyréen","p":"c"},{"t":"Nyréen","p":"c"},{"t":"Ori'Ican","p":"c"},{"t":"Ori'Ican","p":"c"},{"t":"Ori'Ican","p":"c"},{"t":"Ciméran","p":"c"},{"t":"Ciméran","p":"c"},{"t":"Ilvès","p":"c"},{"t":"Ilvès","p":"c"},{"t":"Vaellen","p":"c"},{"t":"Vaellen","p":"c"},{"t":"Écorcien","p":"c"}]},{"n":"Âge","l":[{"t":"Sort de l'enfance","p":"c"},{"t":"Très jeune, et ça se voit","p":"c"},{"t":"Jeune, et il le cache","p":"c"},{"t":"Premier tiers de sa vie","p":"c"},{"t":"Jeune adulte, sûr de lui","p":"c"},{"t":"Jeune adulte, mal à l'aise","p":"c"},{"t":"Adulte, début","p":"c"},{"t":"Adulte, sans plus","p":"c"},{"t":"Pleine force","p":"c"},{"t":"Pleine force, et fatigué","p":"c"},{"t":"Milieu de vie","p":"c"},{"t":"Milieu de vie, deuxième métier","p":"c"},{"t":"Commence à vieillir","p":"c"},{"t":"Vieillissant, encore solide","p":"c"},{"t":"Dernier tiers","p":"c"},{"t":"Vieux pour son peuple","p":"c"},{"t":"Très vieux, et lucide","p":"c"},{"t":"Très vieux, absent par moments","p":"c"},{"t":"Au bout, et il le sait","p":"c"},{"t":"Impossible à situer","p":"c"}]},{"n":"Attitude envers toi","l":[{"t":"Il t'attendait, sans dire pourquoi","p":"c"},{"t":"Il te prend pour un autre","p":"c"},{"t":"Il veut ce que tu portes","p":"c"},{"t":"Il te doit, et espère que tu as oublié","p":"c"},{"t":"Tu lui dois, selon lui","p":"c"},{"t":"Content de te voir, sincèrement","p":"c"},{"t":"Poli, pressé, il regarde ailleurs","p":"c"},{"t":"Méfiant sans raison visible","p":"c"},{"t":"Il a peur, mais pas de toi","p":"c"},{"t":"Il veut t'acheter un service","p":"c"},{"t":"Il vend ce qui n'est pas à lui","p":"c"},{"t":"Il te teste, sans le cacher","p":"c"},{"t":"Il sait ton nom, tu ignores le sien","p":"c"},{"t":"Hostile, et il a une bonne raison","p":"c"},{"t":"Il cherche quelqu'un, tu ressembles","p":"c"},{"t":"Il veut partir avec toi","p":"c"},{"t":"Indifférent, rien ne le changera","p":"c"},{"t":"Reconnaissant, sans que tu saches de quoi","p":"c"},{"t":"Il ment dès la première phrase","p":"c"},{"t":"Il vient te prévenir","p":"c"}]}],"paliers":[{"k":"c","n":"Courant","p":100}]},{"id":"t-noms","nom":"Les noms","mode":"une","aide":"Tire le peuple d’abord, puis le nom dans sa colonne. Chaque peuple déforme les sons à sa façon.","cols":[{"n":"Humain","l":[{"t":"Kervan","p":"c"},{"t":"Merienne","p":"c"},{"t":"Gaud","p":"c"},{"t":"Ambrise","p":"c"},{"t":"Oswine","p":"c"},{"t":"Sarrande","p":"c"},{"t":"Halvenn","p":"c"},{"t":"Dorn","p":"c"},{"t":"Perrot","p":"c"},{"t":"Maline","p":"c"},{"t":"Ferran","p":"c"},{"t":"Josse","p":"c"},{"t":"Ombeline","p":"c"},{"t":"Vasse","p":"c"},{"t":"Tannier","p":"c"},{"t":"Rouve","p":"c"},{"t":"Lisenne","p":"c"},{"t":"Berthold","p":"c"},{"t":"Marguet","p":"c"},{"t":"Estève","p":"c"}]},{"n":"Élytris","l":[{"t":"Vaurys","p":"c"},{"t":"Kaelenn","p":"c"},{"t":"Skaryss","p":"c"},{"t":"Oswenne","p":"c"},{"t":"Thelysse","p":"c"},{"t":"Maerenn","p":"c"},{"t":"Sylenthe","p":"c"},{"t":"Ilvyss","p":"c"},{"t":"Naerenne","p":"c"},{"t":"Cassyl","p":"c"},{"t":"Orenthe","p":"c"},{"t":"Yvellis","p":"c"},{"t":"Braenn","p":"c"},{"t":"Lysenne","p":"c"},{"t":"Aerys","p":"c"},{"t":"Thanelle","p":"c"},{"t":"Novyss","p":"c"},{"t":"Kerenthe","p":"c"},{"t":"Myrenne","p":"c"},{"t":"Solyss","p":"c"}]},{"n":"Nyréen","l":[{"t":"Nérian","p":"c"},{"t":"Oryse","p":"c"},{"t":"Talmar","p":"c"},{"t":"Vahl","p":"c"},{"t":"Ondrine","p":"c"},{"t":"Maren","p":"c"},{"t":"Isvel","p":"c"},{"t":"Corane","p":"c"},{"t":"Delvan","p":"c"},{"t":"Sirane","p":"c"},{"t":"Marec","p":"c"},{"t":"Ylvane","p":"c"},{"t":"Aonn","p":"c"},{"t":"Brisel","p":"c"},{"t":"Nael","p":"c"},{"t":"Sorane","p":"c"},{"t":"Tessan","p":"c"},{"t":"Vareth","p":"c"},{"t":"Lir","p":"c"},{"t":"Moryn","p":"c"}]},{"n":"Ori'Ican","l":[{"t":"Ar'Kenn","p":"c"},{"t":"Tes'Var","p":"c"},{"t":"Ko'Rann","p":"c"},{"t":"Ith'Sar","p":"c"},{"t":"Ba'Tuun","p":"c"},{"t":"Ren'Ka","p":"c"},{"t":"Ol'Mesh","p":"c"},{"t":"Sa'Vrek","p":"c"},{"t":"Ka'Then","p":"c"},{"t":"Ur'Nal","p":"c"},{"t":"Ze'Korr","p":"c"},{"t":"Mi'Thas","p":"c"},{"t":"Do'Ranne","p":"c"},{"t":"Fa'Lek","p":"c"},{"t":"Nu'Sarr","p":"c"},{"t":"Te'Vann","p":"c"},{"t":"Ga'Ruth","p":"c"},{"t":"Pe'Solk","p":"c"},{"t":"Ri'Zann","p":"c"},{"t":"Vo'Kesh","p":"c"}]},{"n":"Ciméran","l":[{"t":"Borund","p":"c"},{"t":"Dargal","p":"c"},{"t":"Morvek","p":"c"},{"t":"Tulder","p":"c"},{"t":"Harn","p":"c"},{"t":"Gorrim","p":"c"},{"t":"Belda","p":"c"},{"t":"Kunder","p":"c"},{"t":"Ormek","p":"c"},{"t":"Falda","p":"c"},{"t":"Strund","p":"c"},{"t":"Verold","p":"c"},{"t":"Hulde","p":"c"},{"t":"Marnek","p":"c"},{"t":"Dovren","p":"c"},{"t":"Ganna","p":"c"},{"t":"Torbek","p":"c"},{"t":"Selda","p":"c"},{"t":"Urnak","p":"c"},{"t":"Rovald","p":"c"}]},{"n":"Ilvès","l":[{"t":"Sahn","p":"c"},{"t":"Ezria","p":"c"},{"t":"Falvès","p":"c"},{"t":"Marzia","p":"c"},{"t":"Ohan","p":"c"},{"t":"Nessia","p":"c"},{"t":"Karym","p":"c"},{"t":"Solvès","p":"c"},{"t":"Tazrin","p":"c"},{"t":"Emia","p":"c"},{"t":"Rhazn","p":"c"},{"t":"Isvès","p":"c"},{"t":"Damia","p":"c"},{"t":"Orzan","p":"c"},{"t":"Lyria","p":"c"},{"t":"Kesh","p":"c"},{"t":"Varzia","p":"c"},{"t":"Selim","p":"c"},{"t":"Nahya","p":"c"},{"t":"Torès","p":"c"}]},{"n":"Vaellen","l":[{"t":"Aelwyn","p":"c"},{"t":"Sarien","p":"c"},{"t":"Ivael","p":"c"},{"t":"Naelis","p":"c"},{"t":"Ferwyn","p":"c"},{"t":"Olaan","p":"c"},{"t":"Seryn","p":"c"},{"t":"Taalis","p":"c"},{"t":"Miren","p":"c"},{"t":"Ewaal","p":"c"},{"t":"Lysien","p":"c"},{"t":"Naran","p":"c"},{"t":"Ovyn","p":"c"},{"t":"Iselaan","p":"c"},{"t":"Kaelwyn","p":"c"},{"t":"Sorien","p":"c"},{"t":"Vaal","p":"c"},{"t":"Ythien","p":"c"},{"t":"Amryn","p":"c"},{"t":"Elaan","p":"c"}]},{"n":"Écorcien","l":[{"t":"Hurmoth","p":"c"},{"t":"Sevoth","p":"c"},{"t":"Braneld","p":"c"},{"t":"Gallum","p":"c"},{"t":"Ormeth","p":"c"},{"t":"Duncrun","p":"c"},{"t":"Teldun","p":"c"},{"t":"Vasmeth","p":"c"},{"t":"Belhum","p":"c"},{"t":"Crenoth","p":"c"},{"t":"Solvum","p":"c"},{"t":"Marneld","p":"c"},{"t":"Ourmeth","p":"c"},{"t":"Fendun","p":"c"},{"t":"Talmoth","p":"c"},{"t":"Rhuneld","p":"c"},{"t":"Le Penché","p":"c"},{"t":"Troisième-Racine","p":"c"},{"t":"Celui-qui-attend","p":"c"},{"t":"Lent","p":"c"}]}],"paliers":[{"k":"c","n":"Courant","p":100}]},{"id":"t-reaction","nom":"Réaction sur le vif","mode":"chaque","aide":"Un d20, quand tu viens de dire ou de faire quelque chose. C’est la table la plus utile en solo.","cols":[{"n":"Il réagit","l":[{"t":"Il coupe la parole","p":"c"},{"t":"Il recule d'un pas et regarde derrière toi","p":"c"},{"t":"Il rit, et ce n'est pas drôle","p":"c"},{"t":"Il baisse la voix","p":"c"},{"t":"Il répond à une autre question que la tienne","p":"c"},{"t":"Il te prend le bras, trop longtemps","p":"c"},{"t":"Il appelle quelqu'un","p":"c"},{"t":"Il pose la main sur une arme sans la sortir","p":"c"},{"t":"Il accepte trop vite","p":"c"},{"t":"Il exige une preuve d'abord","p":"c"},{"t":"Il change de sujet et n'y revient plus","p":"c"},{"t":"Il répète ta dernière phrase, mot pour mot","p":"c"},{"t":"Il sort quelque chose et le pose entre vous","p":"c"},{"t":"Il se tait et attend que tu remplisses le silence","p":"c"},{"t":"Il dit oui et fait autre chose","p":"c"},{"t":"Il s'en va sans prévenir","p":"c"},{"t":"Il te donne un nom, celui de quelqu'un d'autre","p":"c"},{"t":"Il s'énerve pour un détail","p":"c"},{"t":"Il devient soudain très précis, chiffres compris","p":"c"},{"t":"Il propose un marché que tu n'as pas demandé","p":"c"}]}],"paliers":[{"k":"c","n":"Courant","p":100}]},{"id":"t-inspiration","nom":"Table d’inspiration","mode":"chaque","aide":"Un d20 par colonne, et tu interprètes. Le tirage ne dit pas ce qui arrive, il dit quoi regarder.","cols":[{"n":"Verbe","l":[{"t":"Brûler","p":"c"},{"t":"Attendre","p":"c"},{"t":"Porter","p":"c"},{"t":"Couper","p":"c"},{"t":"Rendre","p":"c"},{"t":"Ouvrir","p":"c"},{"t":"Cacher","p":"c"},{"t":"Suivre","p":"c"},{"t":"Vendre","p":"c"},{"t":"Enterrer","p":"c"},{"t":"Compter","p":"c"},{"t":"Réparer","p":"c"},{"t":"Fuir","p":"c"},{"t":"Nommer","p":"c"},{"t":"Promettre","p":"c"},{"t":"Écouter","p":"c"},{"t":"Remplacer","p":"c"},{"t":"Mesurer","p":"c"},{"t":"Partager","p":"c"},{"t":"Oublier","p":"c"}]},{"n":"Sujet","l":[{"t":"un arbre-mère","p":"c"},{"t":"une dette","p":"c"},{"t":"une cicatrice","p":"c"},{"t":"une racine","p":"c"},{"t":"un registre","p":"c"},{"t":"une fiole","p":"c"},{"t":"un totem","p":"c"},{"t":"une lanterne","p":"c"},{"t":"un sceau","p":"c"},{"t":"une graine","p":"c"},{"t":"un nom","p":"c"},{"t":"un enfant","p":"c"},{"t":"une route","p":"c"},{"t":"un corps","p":"c"},{"t":"une carte","p":"c"},{"t":"une braise","p":"c"},{"t":"un contrat","p":"c"},{"t":"une Maison","p":"c"},{"t":"une frontière","p":"c"},{"t":"un souvenir","p":"c"}]},{"n":"Mot commun","l":[{"t":"le sel","p":"c"},{"t":"la rouille","p":"c"},{"t":"le seuil","p":"c"},{"t":"la corde","p":"c"},{"t":"le lait","p":"c"},{"t":"l'aiguille","p":"c"},{"t":"la cendre","p":"c"},{"t":"le fil","p":"c"},{"t":"la clé","p":"c"},{"t":"le pain","p":"c"},{"t":"le miroir","p":"c"},{"t":"la dent","p":"c"},{"t":"la cloche","p":"c"},{"t":"le nœud","p":"c"},{"t":"la plume","p":"c"},{"t":"le verre","p":"c"},{"t":"l'ombre","p":"c"},{"t":"la pierre","p":"c"},{"t":"le sang","p":"c"},{"t":"le vide","p":"c"}]}],"paliers":[{"k":"c","n":"Courant","p":100}]}];
const PALIER_FOND = {k:'c', n:'Courant', p:100};
const TB_MAX_L = 400;          /* au plus quatre cents lignes par colonne */
const TB_MAX_C = 12;           /* au plus douze colonnes */

function normPalierTb(x, i){
  const k = txtOu(x && x.k).slice(0, 12) || ('p' + i);
  return {k:k, n:txtOu(x && x.n).slice(0, 40) || 'Palier', p:Math.max(0, Math.min(100, Math.round(+(x && x.p)) || 0))};
}
function normTableTirage(o){
  o = o && typeof o === 'object' ? o : {};
  const paliers = (Array.isArray(o.paliers) ? o.paliers : []).slice(0, 8).map(normPalierTb);
  if(!paliers.length || paliers[paliers.length - 1].p < 100) paliers.push(Object.assign({}, PALIER_FOND));
  const cles = {}; paliers.forEach(p => { cles[p.k] = 1; });
  const cols = (Array.isArray(o.cols) ? o.cols : []).slice(0, TB_MAX_C).map(c => ({
    n:txtOu(c && c.n).slice(0, 60),
    l:(Array.isArray(c && c.l) ? c.l : []).slice(0, TB_MAX_L).map(x => {
      const t = typeof x === 'string' ? x : txtOu(x && x.t);
      if(!String(t).trim()) return null;
      const p = typeof x === 'string' ? '' : txtOu(x && x.p);
      return {t:String(t).slice(0, 300), p:cles[p] ? p : paliers[paliers.length - 1].k};
    }).filter(Boolean)
  }));
  return {id:txtOu(o.id) || nouvelId('tb'), maj:+o.maj || 0, supprime:!!o.supprime,
    nom:txtOu(o.nom).slice(0, 80), aide:txtOu(o.aide).slice(0, 400),
    mode:o.mode === 'une' ? 'une' : 'chaque', paliers:paliers, cols:cols,
    auteur:txtOu(o.auteur).slice(0, 80)};
}
/* celles du livre, celles d'ici par-dessus, et les tiennes */
function tablesToutes(){
  const out = [];
  TABLES_LIVRE.forEach(x => {
    const r = T.tables[x.id];
    /* une table du livre ne se supprime pas : la marque de suppression veut dire « revenue au livre » */
    const mien = r && !r.supprime && r.nom ? r : null;
    const t = normTableTirage(mien || x);
    t.id = x.id; t.src = 'livre'; t.retouche = !!mien;
    out.push(t);
  });
  Object.keys(T.tables).forEach(id => {
    if(TABLES_LIVRE.some(x => x.id === id)) return;
    const r = T.tables[id];
    if(!r || r.supprime || !r.nom) return;
    const t = normTableTirage(r); t.id = id; t.src = 'maison';
    out.push(t);
  });
  return out;
}
const uneTable = id => tablesToutes().find(t => t.id === id) || null;
const tableLivre = id => TABLES_LIVRE.find(t => t.id === id) || null;
function poserTable(t){
  const x = normTableTirage(t); x.id = t.id; x.maj = maintenant();
  if(!x.auteur) x.auteur = MOI.joueur || '';
  changer(() => { T.tables[x.id] = x; });
}
function retirerTable(id){
  changer(() => {
    const x = T.tables[id];
    T.tables[id] = normTableTirage(Object.assign({}, x || {id:id}, {id:id, supprime:true, maj:maintenant()}));
    T.tables[id].supprime = true; T.tables[id].maj = maintenant();
  });
}
function remettreAuLivre(id){
  const l = tableLivre(id); if(!l) return;
  retirerTable(id);
  msgTable('« ' + l.nom + ' » est revenue à ce que dit le livre.', true);
}

/* ---------- tirer ----------
   La cascade : chaque palier a sa chance, du plus rare au plus courant. Le dernier sert de repêchage. */
function tirerPalierDe(t){
  const des = [];
  for(let i = 0; i < t.paliers.length; i++){
    const p = t.paliers[i];
    if(i === t.paliers.length - 1 || p.p >= 100){ des.push({n:p.n, d:0, p:p.p, pris:true}); return {k:p.k, n:p.n, des:des}; }
    const d = de(100);
    des.push({n:p.n, d:d, p:p.p, pris:d <= p.p});
    if(d <= p.p) return {k:p.k, n:p.n, des:des};
  }
  const f = t.paliers[t.paliers.length - 1];
  return {k:f.k, n:f.n, des:des};
}
/* une ligne dans une colonne : on prend dans le palier tiré, et à défaut dans le repêchage */
function tirerLigne(t, col){
  if(!col || !col.l.length) return null;
  const pal = tirerPalierDe(t);
  let l = col.l.filter(x => x.p === pal.k);
  if(!l.length){ const f = t.paliers[t.paliers.length - 1]; l = col.l.filter(x => x.p === f.k); }
  if(!l.length) l = col.l;
  const i = Math.floor(Math.random() * l.length);
  const ligne = l[i];
  return {t:ligne.t, palier:pal, n:col.l.indexOf(ligne) + 1, col:col.n};
}
/* le tirage d'une table : une ligne par colonne, ou une ligne dans la colonne demandée */
function tirerTable(t, colonne){
  if(!t) return null;
  if(t.mode === 'une'){
    const c = t.cols.find(x => cleNom(x.n) === cleNom(colonne || '')) || t.cols[0];
    const r = tirerLigne(t, c);
    return r ? {table:t.nom, mode:'une', r:[r]} : null;
  }
  const r = t.cols.map(c => tirerLigne(t, c)).filter(Boolean);
  return r.length ? {table:t.nom, mode:'chaque', r:r} : null;
}
function texteTirage(x){
  if(!x) return '';
  return x.r.map(q => (x.mode === 'une' || x.r.length === 1 ? '' : q.col + ' : ') + q.t).join(' · ');
}
const texteDes = q => q.palier.des.filter(d => d.d).map(d => d.n + ' ' + d.d + '/' + d.p).join(', ');

/* ---------- la page ---------- */
let TAB = {ouverte:'', tirage:null, nouvelle:false};
function dessinerTables(force){
  const box = $('tabBox'); if(!box) return;
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerTables(true)); return; }
  box.innerHTML = '';
  const l = tablesToutes();
  const t = TAB.ouverte ? l.find(x => x.id === TAB.ouverte) : null;
  if(t){ box.append(blocTableOuverte(t)); return; }
  const g = el('div','tbgrille');
  l.forEach(x => g.append(carteTable(x)));
  box.append(g);
  const a = el('div','acts'); a.style.marginTop = '12px';
  const n = el('button','btn sm','Une table à toi'); n.type = 'button'; n.id = 'tbNouvelle';
  n.onclick = () => nouvelleTable();
  a.append(n, el('span','mini', 'Trois colonnes au plus pour s’y retrouver, autant de lignes que tu veux.'));
  box.append(a);
}
function carteTable(t){
  const w = el('div','tbcarte');
  const h = el('div','ctete');
  h.append(el('b','tbnom', t.nom || 'Sans nom'));
  h.append(el('span','mini', t.src === 'livre' ? (t.retouche ? 'du livre, retouchée' : 'du livre') : 'à toi'));
  w.append(h);
  if(t.aide) w.append(el('p','mini', t.aide));
  w.append(el('p','mini tbcols', t.cols.map(c => c.n + ' (' + c.l.length + ')').join(' · ') || 'aucune colonne'));
  const a = el('div','acts');
  const o = el('button','btn ghost sm','Ouvrir'); o.type = 'button';
  o.setAttribute('aria-label', 'Ouvrir ' + t.nom);
  o.onclick = () => { TAB.ouverte = t.id; TAB.tirage = null; dessinerTables(true); };
  const d = el('button','btn ghost sm','Tirer'); d.type = 'button';
  d.setAttribute('aria-label', 'Tirer dans ' + t.nom);
  d.onclick = () => { TAB.ouverte = t.id; TAB.tirage = tirerTable(t, t.cols[0] && t.cols[0].n); dessinerTables(true); };
  a.append(o, d);
  w.append(a);
  return w;
}
function nouvelleTable(){
  const t = normTableTirage({id:nouvelId('tb'), nom:'Ma table', aide:'', mode:'chaque',
    cols:[{n:'Ce qui arrive', l:[]}], auteur:MOI.joueur || ''});
  poserTable(t);
  TAB.ouverte = t.id; TAB.tirage = null;
  dessinerTables(true);
}
/* la table ouverte : son en-tête, ses paliers, ses colonnes */
function blocTableOuverte(t){
  const w = el('div');
  const h = el('div','ctete');
  const r = el('button','btn ghost xs','← Toutes les tables'); r.type = 'button'; r.id = 'tbRetour';
  r.onclick = () => { TAB.ouverte = ''; TAB.tirage = null; dessinerTables(true); };
  h.append(r);
  h.append(el('span','espace'));
  if(t.src === 'livre' && t.retouche){
    const rl = el('button','btn ghost xs','Revenir au livre'); rl.type = 'button'; rl.id = 'tbAuLivre';
    rl.onclick = () => { remettreAuLivre(t.id); dessinerTables(true); };
    h.append(rl);
  }
  if(t.src === 'maison'){
    const x = el('button','ax','×'); x.type = 'button'; x.id = 'tbSuppr';
    x.setAttribute('aria-label', 'Supprimer cette table');
    x.onclick = () => { if(TAB.suppr === t.id){ retirerTable(t.id); TAB.ouverte = ''; TAB.suppr = ''; dessinerTables(true); return; }
      TAB.suppr = t.id; msgTable('Encore un clic sur le × pour supprimer « ' + t.nom +' ».', false); };
    h.append(x);
  }
  w.append(h);
  const g = el('div','table');
  const nom = el('input'); nom.type = 'text'; nom.id = 'tbNom'; nom.value = t.nom; nom.style.width = '100%';
  nom.onchange = () => { poserTable(Object.assign({}, t, {nom:nom.value})); dessinerTables(true); };
  champ(g, 'Le nom de la table', nom);
  const md = el('select'); md.id = 'tbMode';
  [['chaque','Une ligne par colonne'], ['une','Une ligne, dans la colonne qu’on choisit']].forEach(([k, l]) => md.add(new Option(l, k)));
  md.value = t.mode;
  md.onchange = () => { poserTable(Object.assign({}, t, {mode:md.value})); dessinerTables(true); };
  champ(g, 'Comment elle se tire', md);
  w.append(g);
  const aide = el('input'); aide.type = 'text'; aide.id = 'tbAide'; aide.value = t.aide; aide.style.width = '100%';
  aide.placeholder = 'Ce qu’elle sert, en une phrase';
  aide.onchange = () => { poserTable(Object.assign({}, t, {aide:aide.value})); dessinerTables(true); };
  const ga = el('div'); ga.style.marginTop = '8px';
  champ(ga, 'Ce qu’elle sert', aide);
  w.append(ga);
  w.append(blocPaliers(t));
  w.append(blocTirageTable(t));
  const cg = el('div','tbcolonnes');
  t.cols.forEach((c, i) => cg.append(blocColonne(t, c, i)));
  w.append(cg);
  const a = el('div','acts'); a.style.marginTop = '10px';
  const pc = el('button','btn ghost sm','Une colonne de plus'); pc.type = 'button'; pc.id = 'tbPlusCol';
  pc.disabled = t.cols.length >= TB_MAX_C;
  pc.onclick = () => {
    const cols = t.cols.concat([{n:'Colonne ' + (t.cols.length + 1), l:[]}]);
    poserTable(Object.assign({}, t, {cols:cols})); dessinerTables(true);
  };
  a.append(pc);
  w.append(a);
  return w;
}
/* les paliers de rareté, en cascade */
function blocPaliers(t){
  const w = el('div','cbloc');
  const h = el('div','ctete');
  h.append(el('p','ctitre', 'La rareté, en cascade'));
  h.append(el('span','espace'));
  const p = el('button','btn ghost xs','Un palier de plus'); p.type = 'button'; p.id = 'tbPlusPalier';
  p.disabled = t.paliers.length >= 8;
  p.onclick = () => {
    const pal = t.paliers.slice();
    pal.splice(pal.length - 1, 0, {k:'p' + Date.now().toString(36).slice(-4), n:'Rare', p:10});
    poserTable(Object.assign({}, t, {paliers:pal})); dessinerTables(true);
  };
  h.append(p);
  w.append(h);
  const u = el('div','tbpaliers');
  t.paliers.forEach((pal, i) => {
    const fond = i === t.paliers.length - 1;
    const l = el('div','tbpal');
    const n = el('input'); n.type = 'text'; n.value = pal.n; n.style.width = '140px';
    n.setAttribute('aria-label', 'Le nom du palier');
    n.onchange = () => { const q = t.paliers.map((x, j) => j === i ? Object.assign({}, x, {n:n.value}) : x); poserTable(Object.assign({}, t, {paliers:q})); dessinerTables(true); };
    l.append(n);
    if(fond){
      l.append(el('span','mini', 'le repêchage : ce qui reste quand rien d’autre n’est sorti'));
    } else {
      const v = el('input'); v.type = 'number'; v.min = '0'; v.max = '100'; v.value = String(pal.p); v.style.width = '72px';
      v.setAttribute('aria-label', 'Sa chance, en pour cent');
      v.onchange = () => { const q = t.paliers.map((x, j) => j === i ? Object.assign({}, x, {p:Math.max(0, Math.min(100, parseInt(v.value, 10) || 0))}) : x); poserTable(Object.assign({}, t, {paliers:q})); dessinerTables(true); };
      l.append(v, el('span','mini', '% au d100'));
      const x = el('button','ax','×'); x.type = 'button';
      x.setAttribute('aria-label', 'Retirer ce palier');
      x.onclick = () => {
        const q = t.paliers.filter((y, j) => j !== i);
        const cols = t.cols.map(c => ({n:c.n, l:c.l.map(y => y.p === pal.k ? Object.assign({}, y, {p:q[q.length - 1].k}) : y)}));
        poserTable(Object.assign({}, t, {paliers:q, cols:cols})); dessinerTables(true);
      };
      l.append(x);
    }
    u.append(l);
  });
  w.append(u);
  w.append(el('p','mini', 'On demande chaque palier dans l’ordre, du plus rare au plus courant : « très rare, deux pour cent ? » puis « rare, quinze ? ». Le premier qui sort gagne, et le dernier ramasse le reste. Un seul palier, et la table se tire à plat comme dans le livre.'));
  return w;
}
/* tirer, et voir ce qui sort */
function blocTirageTable(t){
  const w = el('div','cbloc');
  const g = el('div','tajout');
  const b = el('button','btn sm','Tirer'); b.type = 'button'; b.id = 'tbTirer';
  let col = TAB.col || (t.cols[0] && t.cols[0].n) || '';
  if(t.mode === 'une'){
    const s = el('select'); s.id = 'tbCol'; s.setAttribute('aria-label', 'Dans quelle colonne');
    t.cols.forEach(c => s.add(new Option(c.n, c.n)));
    if(t.cols.some(c => c.n === col)) s.value = col; else { col = s.value; TAB.col = col; }
    s.onchange = () => { TAB.col = s.value; };
    g.append(s);
    b.onclick = () => { TAB.tirage = tirerTable(t, s.value); dessinerTables(true); };
  } else {
    b.onclick = () => { TAB.tirage = tirerTable(t, null); dessinerTables(true); };
  }
  g.append(b);
  w.append(g);
  if(TAB.tirage && TAB.tirage.table === t.nom){
    const x = TAB.tirage;
    const r = el('div','tbsort');
    r.append(el('p','tbsortt', texteTirage(x)));
    const det = x.r.map(q => (x.r.length > 1 ? q.col + ' ' : '') + q.n + (q.palier.n && t.paliers.length > 1 ? ' · ' + q.palier.n : '') + (texteDes(q) ? ' (' + texteDes(q) + ')' : '')).join(' · ');
    r.append(el('p','mini', det));
    w.append(r);
  }
  return w;
}
/* une colonne, et ses lignes */
function blocColonne(t, c, i){
  const w = el('div','tbcol');
  const h = el('div','ctete');
  const n = el('input'); n.type = 'text'; n.value = c.n; n.className = 'tbcoln';
  n.setAttribute('aria-label', 'Le nom de la colonne');
  n.onchange = () => { const cols = t.cols.map((x, j) => j === i ? {n:n.value, l:x.l} : x); poserTable(Object.assign({}, t, {cols:cols})); dessinerTables(true); };
  h.append(n);
  h.append(el('span','mini', c.l.length + ' lignes'));
  h.append(el('span','espace'));
  if(t.cols.length > 1){
    const x = el('button','ax','×'); x.type = 'button';
    x.setAttribute('aria-label', 'Retirer la colonne ' + c.n);
    x.onclick = () => {
      if(TAB.supprCol !== t.id + ':' + i){ TAB.supprCol = t.id + ':' + i; msgTable('Encore un clic pour retirer la colonne « ' + c.n + ' » et ses ' + c.l.length + ' lignes.', false); return; }
      TAB.supprCol = '';
      poserTable(Object.assign({}, t, {cols:t.cols.filter((y, j) => j !== i)})); dessinerTables(true);
    };
    h.append(x);
  }
  w.append(h);
  const u = el('div','tblignes');
  c.l.forEach((ligne, j) => {
    const l = el('div','tbl');
    l.append(el('span','tbn', String(j + 1)));
    const v = el('input'); v.type = 'text'; v.value = ligne.t; v.className = 'tbt';
    v.setAttribute('aria-label', 'La ligne ' + (j + 1) + ' de ' + c.n);
    v.onchange = () => {
      const cols = t.cols.map((x, k) => k === i ? {n:x.n, l:x.l.map((y, m) => m === j ? {t:v.value, p:y.p} : y).filter(y => y.t.trim())} : x);
      poserTable(Object.assign({}, t, {cols:cols})); dessinerTables(true);
    };
    l.append(v);
    if(t.paliers.length > 1){
      const s = el('select'); s.className = 'tbp';
      s.setAttribute('aria-label', 'La rareté de cette ligne');
      t.paliers.forEach(p => s.add(new Option(p.n, p.k)));
      s.value = ligne.p;
      s.onchange = () => {
        const cols = t.cols.map((x, k) => k === i ? {n:x.n, l:x.l.map((y, m) => m === j ? {t:y.t, p:s.value} : y)} : x);
        poserTable(Object.assign({}, t, {cols:cols})); dessinerTables(true);
      };
      l.append(s);
    }
    const x = el('button','ax','×'); x.type = 'button';
    x.setAttribute('aria-label', 'Retirer cette ligne');
    x.onclick = () => {
      const cols = t.cols.map((y, k) => k === i ? {n:y.n, l:y.l.filter((z, m) => m !== j)} : y);
      poserTable(Object.assign({}, t, {cols:cols})); dessinerTables(true);
    };
    l.append(x);
    u.append(l);
  });
  w.append(u);
  const g = el('div','tajout');
  const nv = el('input'); nv.type = 'text'; nv.placeholder = 'une ligne de plus'; nv.style.flex = '1 1 120px';
  nv.setAttribute('aria-label', 'Ajouter une ligne à ' + c.n);
  const ok = el('button','btn ghost xs','Ajouter'); ok.type = 'button';
  const poser = () => {
    const v = nv.value.trim(); if(!v) return;
    const fond = t.paliers[t.paliers.length - 1].k;
    const cols = t.cols.map((x, k) => k === i ? {n:x.n, l:x.l.concat([{t:v, p:fond}])} : x);
    poserTable(Object.assign({}, t, {cols:cols}));
    nv.value = '';
    dessinerTables(true);
  };
  ok.onclick = poser;
  nv.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); poser(); } };
  g.append(nv, ok);
  w.append(g);
  return w;
}
