/* ============ la progression, telle que le livre l'écrit ============
   Une compétence : 1 point par +1 jusqu'à +40, 2 de +41 à +60, 3 au-delà.
   Une Pratique : 10 points, et quelqu'un pour te l'enseigner ; elle démarre à +20. On la prend dans la liste
   de son domaine, celui de son peuple ou de son école, comme à la création.
   Une caractéristique : 20 points, une seule fois par caractéristique, plafond 18.
   +5 PV : 20 points. */

let PROG_PERSO = '';
const ACHAT = {type:'comp', cible:'Combat', n:1, nom:'', maitre:'', dom:''};
const GAIN = {mission:'', quoi:'', n:1, tous:true};

function bonusComp(c, s){
  const k = CAR_DE[s];
  /* une compétence que le Registre des Compétences a retirée n'a plus de caractéristique : rien à acheter dessus */
  if(!k) return 0;
  return compTotal(c, s) - c.car[k] * 2;
}
/* « +12 », « −8 » : un bonus négatif s'écrit avec son signe, sans « + » devant (une compétence déplacée sous une caractéristique plus haute en a un) */
const plusMoins = n => (n < 0 ? '−' : '+') + Math.abs(n);
/* un Cornu et sa lance : l'arme dont le nom dit « lance », et le cran où elle en est */
function estCornu(c){ return /ori.?ican/i.test(c.peuple) && (/cornu/i.test((c.sub && c.sub.type) || '') || c.armes.some(a => /lance/i.test(a.nom))); }
function lanceDe(c){
  const i = c.armes.findIndex(a => /lance/i.test(a.nom) && LANCES.some(l => (a.de || '').replace(/\s+/g, '').toLowerCase() === l.de));
  if(i < 0) return null;
  const cran = LANCES.findIndex(l => (c.armes[i].de || '').replace(/\s+/g, '').toLowerCase() === l.de);
  return {i:i, arme:c.armes[i], cran:cran, suivant:LANCES[cran + 1] || null};
}
/* une caractéristique ne monte qu'une fois par la progression */
function dejaMontee(c, car){ return (c.prog.achats || []).some(a => a.type === 'car' && a.cible === car); }
/* le domaine de ses Pratiques : celui que sa fiche porte, celui de son école, ou celui que son peuple ouvre */
const sansAccents = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function domainesPratiques(){ return Object.keys(PRATIQUES).filter(k => domaineCle(k)); }
function domaineDe(c){
  const cles = domainesPratiques();
  if(cles.indexOf(c.domaine) >= 0) return c.domaine;
  const k = domaineCle(c.domaine) || domaineCle(c.sub && c.sub.ecole);
  if(k) return cles.find(x => domaineCle(x) === k) || '';
  const mots = x => sansAccents(x).replace(/[^a-z]+/g, ' ').trim().split(' ').filter(m => m.length > 2).map(m => m.replace(/s$/, ''));
  const miens = mots(c.peuple);
  if(!miens.length) return '';
  return cles.find(x => { const par = /\(([^)]*)\)/.exec(x); return !!par && mots(par[1]).some(m => miens.indexOf(m) >= 0); }) || '';
}
/* le domaine retenu pour l'achat : le sien, ou celui qu'on choisit quand sa fiche ne le dit pas */
function domaineAchat(c){ return domaineDe(c) || (domainesPratiques().indexOf(ACHAT.dom) >= 0 ? ACHAT.dom : ''); }
/* ce qu'il peut apprendre : la liste de son domaine, sa branche ou son type seulement, sans l'attaque de base
   (donnée d'office) ni ce qu'il connaît déjà */
function pratiquesApprenables(c, dom){
  const g = PRATIQUES[dom]; if(!g) return [];
  const sub = c.sub || {}, k = domaineCle(dom), cles = Object.keys(g);
  const branche = k === 'eau' && cles.indexOf(sub.branche) >= 0 ? sub.branche : '';
  const type = k === 'mue' && cles.indexOf(sub.type) >= 0 ? sub.type : '';
  const connues = c.pratiques.map(p => clePratique(p.n));
  return cles.filter(x => (!branche || /^commune/i.test(x) || x === branche) && (!type || x === type))
    .map(x => ({grp:x === '_' ? '' : /^commune/i.test(x) ? 'Communes aux trois branches' : x,
      items:g[x].filter(it => !it.base && connues.indexOf(clePratique(it.n)) < 0)}))
    .filter(x => x.items.length);
}
/* « Le dard » et « Dard » sont la même Pratique, écrite avant ou après le livre */
const clePratique = n => cleNom(n).replace(/^(le |la |les |l['’]\s*)/, '');
function pratiqueDuLivre(dom, nom){
  const g = PRATIQUES[dom]; if(!g || !nom) return null;
  for(const x of Object.keys(g)){ const it = g[x].find(p => p.n === nom); if(it) return it; }
  return null;
}
const jetDePratique = j => JETS_SANS.indexOf(j) >= 0 ? (j === 'aucun jet' ? 'ne se lance pas' : j) : 'se lance sous ' + regSousLa(j);
function coutAchat(c){
  if(ACHAT.type === 'comp') return coutCompetence(bonusComp(c, ACHAT.cible), bonusComp(c, ACHAT.cible) + Math.max(1, ACHAT.n));
  if(ACHAT.type === 'prat') return 10;
  if(ACHAT.type === 'car') return 20;
  if(ACHAT.type === 'pv') return 20;
  if(ACHAT.type === 'lance') return 10;
  return 0;
}
/* le détail du prix d'une compétence : combien de +1 à chaque tarif */
function detailCoutComp(de1, vers){
  const t = [0, 0, 0];
  for(let v = de1 + 1; v <= vers; v++) t[v <= 40 ? 0 : v <= 60 ? 1 : 2]++;
  return [[t[0], 1], [t[1], 2], [t[2], 3]].filter(x => x[0]).map(x => x[0] + ' à ' + x[1] + ' point' + (x[1] > 1 ? 's' : '')).join(', ');
}
function detailAchat(c){
  if(ACHAT.type === 'comp') return nomComp(ACHAT.cible) + ' +' + Math.max(1, ACHAT.n) + ' (de ' + plusMoins(bonusComp(c, ACHAT.cible)) + ' à ' + plusMoins(bonusComp(c, ACHAT.cible) + Math.max(1, ACHAT.n)) + ')';
  if(ACHAT.type === 'prat') return (ACHAT.nom || 'une Pratique de son domaine') + ', à +' + (c.bonusPratique || 40) + (ACHAT.maitre.trim() ? ', ' + aupresDe(ACHAT.maitre) : '');
  if(ACHAT.type === 'car') return ACHAT.cible + ' +1 (de ' + c.car[ACHAT.cible] + ' à ' + (c.car[ACHAT.cible] + 1) + ')';
  if(ACHAT.type === 'lance'){ const l = lanceDe(c); return l && l.suivant ? 'sa lance, de ' + l.arme.de + ' à ' + l.suivant.de : 'sa lance, d’un cran'; }
  return '+5 PV';
}
/* « auprès d’un Cornu », « auprès du maître », « auprès de Nahya » */
function aupresDe(n){
  const x = String(n || '').trim();
  if(/^le\s/i.test(x)) return 'auprès du ' + x.slice(3);
  if(/^les\s/i.test(x)) return 'auprès des ' + x.slice(4);
  return /^[aeiouyàâéèêëîïôöûüœ]/i.test(x) ? 'auprès d’' + x : 'auprès de ' + x;
}
/* ce que la séance en cours garde d'un achat */
function phraseAchat(c, a){
  const nom = c.nom || 'Sans nom', p = a.cout + ' point' + (a.cout > 1 ? 's' : '');
  if(a.type === 'prat') return nom + ' apprend une Pratique, ' + a.cible + (a.maitre ? ', ' + aupresDe(a.maitre) : '') +
    (a.jet && JETS_SANS.indexOf(a.jet) < 0 ? ', sous ' + regSousLa(a.jet) : '') + ' (' + p + ').';
  return nom + ' dépense ' + p + ' : ' + a.detail + '.';
}
/* les PV suivent la Constitution, les PC la moitié de la Contenance : un gain arrive aussi dans l'actuel,
   par un coup que l'achat garde (ev) ; défaire l'achat défait ce coup, sans en inventer un autre */
function appliquerAchat(c, a, sens){
  const s = sens || 1;
  const vie = (q, d) => {
    if(s > 0){ const e = coup(c, q, d); if(e) a.ev = (a.ev || []).concat([e]); }
    else if(a.ev && a.ev.length) annulerCoups(c, a.ev);
    else coup(c, q, d);
  };
  if(a.type === 'comp') c.comp[a.cible] = (c.comp[a.cible] || 0) + s * a.n;
  else if(a.type === 'car'){
    const pcAvant = c.pcMax;
    c.car[a.cible] = (c.car[a.cible] || 8) + s;
    compsSuivies(c).forEach(o => { if(o.car === a.cible) c.comp[o.s] += s * 2; });
    if(a.cible === 'Constitution'){ c.pvMax += s; vie('pv', s); }
    if(a.cible === 'Contenance'){ c.pcMax = Math.floor(c.car.Contenance / 2); if(c.pcMax !== pcAvant) vie('pc', c.pcMax - pcAvant); }
  }
  else if(a.type === 'pv'){ c.pvMax += s * 5; vie('pv', s * 5); }
  else if(a.type === 'lance'){
    if(s > 0){
      const l = lanceDe(c);
      if(l && l.suivant){
        a.avant = {nom:l.arme.nom, de:l.arme.de, notes:l.arme.notes};
        c.armes[l.i] = {nom:l.suivant.nom, de:l.suivant.de, notes:l.suivant.notes || l.arme.notes || ''};
      }
    } else if(a.avant){
      /* défaire : la lance revient à ce qu'elle était */
      const i = c.armes.findIndex(x => /lance/i.test(x.nom));
      if(i >= 0) c.armes[i] = {nom:a.avant.nom, de:a.avant.de, notes:a.avant.notes || ''};
    }
  }
  else if(a.type === 'prat'){
    if(s > 0) c.pratiques.push({n:a.cible, j:a.jet || 'aucun jet', pc:a.pc || 0, pct:a.pct || '', d:a.texte || '', base:false, banniere:false,
      b:a.b == null ? null : a.b, maitre:a.maitre || '', dom:a.dom || ''});
    else {
      const i = c.pratiques.map(p => p.n).lastIndexOf(a.cible);
      if(i >= 0) c.pratiques.splice(i, 1);
    }
  }
  recalculerVie(c);
}

function dessinerProg(force){
  const box = $('progBox'); if(!box) return;
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerProg(true)); return; }
  const focus = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : '';
  box.innerHTML = '';
  dessinerProgDans(box);
  if(focus && $(focus)) $(focus).focus();
}
function tableauProgression(){
  const t = el('table','tab regle');
  const h = el('tr'); h.append(el('th', null, 'Ce que tu améliores'), el('th', null, 'Coût')); t.append(h);
  [['Une compétence jusqu’à +40', '1 point par +1'],
   ['De +41 à +60', '2 points par +1'],
   ['Au-delà de +60', '3 points par +1'],
   ['Apprendre une Pratique (démarre à +20)', '10 points, et quelqu’un pour te l’enseigner'],
   ['Monter une caractéristique de +1', '20 points, une seule fois par caractéristique, plafond 18'],
   ['+5 PV', '20 points']].forEach(([a, b]) => { const tr = el('tr'); tr.append(el('td', null, a), el('td', null, b)); t.append(tr); });
  return t;
}
function dessinerProgDans(box){
  const liste = persos();
  if(!liste.length){ box.append(el('p','vide','Aucun personnage à faire progresser.')); return; }
  if(!liste.some(c => c.id === PROG_PERSO)) PROG_PERSO = MOI.perso && liste.some(c => c.id === MOI.perso) ? MOI.perso : liste[0].id;
  const c = perso(PROG_PERSO);
  /* où s'écrivent les gains et les achats : la séance que la table montre */
  const e = seanceCourante();
  box.append(el('p','mini progou', e ? 'Les gains et les achats s’écrivent dans la séance ' + (e.seance || '?') + (e.titre ? ' · ' + e.titre : '') + ' du Registre de la Table.'
    : 'Aucune séance pour l’instant : les gains et les achats vont sur la fiche, sans s’écrire dans une séance.'));

  /* dans le Registre des Marchefleurs, le personnage se choisit par son portrait, en haut de la page */
  if(!$('ficheBox')){
    const sel = el('select'); sel.id = 'prog-perso'; sel.setAttribute('aria-label', 'Quel personnage');
    liste.forEach(x => sel.add(new Option(x.nom || 'Sans nom', x.id)));
    sel.value = PROG_PERSO;
    sel.onchange = () => { PROG_PERSO = sel.value; dessinerProg(true); };
    const tete = el('div','acts'); tete.style.marginBottom = '12px';
    tete.append(sel);
    box.append(tete);
  }

  const g = el('div','progrid');
  [['Gagnés', pointsGagnes(c)], ['Dépensés', pointsDepenses(c)], ['Il reste', pointsRestants(c)]].forEach(([l, v]) => {
    const d = el('div','pt');
    d.append(el('div','v', String(v)), el('div','t', l));
    g.append(d);
  });
  box.append(g);

  /* gagner des points : ce que paie une mission, annoncé par le Havre avant le départ */
  box.append(el('h3', null, 'Ce que la mission a rapporté'));
  const lg = el('div','acts');
  const ms = el('select'); ms.id = 'prog-mission'; ms.setAttribute('aria-label', 'Quelle mission');
  ms.add(new Option('Quelle mission…', ''));
  MISSIONS.forEach((m, i) => ms.add(new Option(m.l + ' · ' + m.n + ' point' + (m.n > 1 ? 's' : ''), String(i))));
  ms.add(new Option('Autre chose', 'autre'));
  ms.value = GAIN.mission;
  const quoi = el('input'); quoi.type = 'text'; quoi.id = 'prog-quoi'; quoi.placeholder = 'Ce qu’on a bouclé'; quoi.style.width = '220px'; quoi.value = GAIN.quoi;
  quoi.setAttribute('aria-label', 'Ce qu’on a bouclé');
  quoi.oninput = () => { GAIN.quoi = quoi.value; };
  const n = el('input'); n.type = 'number'; n.id = 'prog-n'; n.value = String(GAIN.n); n.min = '1'; n.style.width = '80px'; n.inputMode = 'numeric';
  n.setAttribute('aria-label', 'Combien de points');
  n.oninput = () => { GAIN.n = Math.max(1, parseInt(n.value, 10) || 1); };
  ms.onchange = () => {
    GAIN.mission = ms.value;
    const m = MISSIONS[+ms.value];
    if(ms.value !== '' && ms.value !== 'autre' && m){ GAIN.n = m.n; GAIN.quoi = m.l; quoi.value = m.l; n.value = String(m.n); }
  };
  lg.append(ms, quoi, n);
  let tous = null;
  if(liste.length > 1){
    const lab = el('label','coche');
    tous = el('input'); tous.type = 'checkbox'; tous.id = 'prog-tous'; tous.checked = GAIN.tous;
    tous.onchange = () => { GAIN.tous = tous.checked; };
    lab.append(tous, document.createTextNode(' Pour toute la compagnie'));
    lg.append(lab);
  }
  const ajout = el('button','btn sm','Ajouter les points'); ajout.type = 'button'; ajout.id = 'prog-gagner';
  ajout.onclick = () => {
    const v = Math.max(1, parseInt(n.value, 10) || 0), q = quoi.value.trim() || 'une mission';
    /* les fiches d'aujourd'hui, pas celles du dessin */
    const qui = tous && tous.checked ? persos() : [perso(PROG_PERSO)].filter(Boolean);
    if(!qui.length) return;
    GAIN.quoi = ''; GAIN.mission = '';
    changer(() => {
      const bloc = noterDansSeance((qui.length > 1 ? 'Toute la compagnie gagne ' : (qui[0].nom || 'Sans nom') + ' gagne ') + v + ' point' + (v > 1 ? 's' : '') + ' de progression : ' + q + '.', 'achat');
      qui.forEach(x => { x.prog.points.push({id:nouvelId('g'), t:maintenant(), quoi:q, n:v, bloc:bloc}); majPerso(x); });
    });
    msgTable((qui.length > 1 ? 'Chacun' : qui[0].nom || 'Sans nom') + ' gagne ' + v + ' point' + (v > 1 ? 's' : '') + '.', true);
  };
  lg.append(ajout);
  box.append(lg);

  /* dépenser */
  box.append(el('h3', null, 'Ce qu’on achète'));
  const zone = el('div','progzone');
  const form = el('div');
  const la = el('div','table');
  const st = el('select'); st.id = 'prog-type';
  ACHATS.forEach(a => st.add(new Option(a.l, a.k)));
  if(estCornu(c)) st.add(new Option('Refaire sa lance, d’un cran (Cornu)', 'lance'));
  if(ACHAT.type === 'lance' && !estCornu(c)) ACHAT.type = 'comp';
  st.value = ACHAT.type;
  st.onchange = () => {
    ACHAT.type = st.value;
    if(ACHAT.type === 'car') ACHAT.cible = CARS.find(x => !dejaMontee(c, x) && c.car[x] < 18) || 'Force';
    if(ACHAT.type === 'comp') ACHAT.cible = 'Combat';
    dessinerProg(true);
  };
  champ(la, 'Quoi', st);

  if(ACHAT.type === 'comp'){
    const sc = el('select'); sc.id = 'prog-cible';
    ALLSKILLS.forEach(o => sc.add(new Option(nomComp(o.s) + ' (' + plusMoins(bonusComp(c, o.s)) + ')', o.s)));
    sc.value = ACHAT.cible;
    sc.onchange = () => { ACHAT.cible = sc.value; dessinerProg(true); };
    champ(la, 'Laquelle', sc);
    const sn = nombre(ACHAT.n, 1, 40); sn.id = 'prog-n2';
    sn.oninput = () => { ACHAT.n = Math.max(1, +sn.value || 1); majCoutAchat(c); };
    champ(la, 'De combien', sn);
  } else if(ACHAT.type === 'car'){
    const sc = el('select'); sc.id = 'prog-cible';
    CARS.forEach(x => {
      const o = new Option(x + ' (' + c.car[x] + ')' + (dejaMontee(c, x) ? ', déjà montée' : c.car[x] >= 18 ? ', au plafond' : ''), x);
      o.disabled = dejaMontee(c, x) || c.car[x] >= 18;
      sc.add(o);
    });
    sc.value = CARS.indexOf(ACHAT.cible) >= 0 ? ACHAT.cible : 'Force';
    sc.onchange = () => { ACHAT.cible = sc.value; dessinerProg(true); };
    champ(la, 'Laquelle', sc, 'Une seule fois par caractéristique, jamais au-delà de 18.');
  } else if(ACHAT.type === 'lance'){
    const l = lanceDe(c);
    const p = el('p','mini');
    p.textContent = !l ? 'Pas de lance ori’ican sur sa fiche : ajoute-la dans ses armes (d8, d10 ou d12).'
      : !l.suivant ? l.arme.nom + ' est déjà au plus haut cran que la progression donne (' + l.arme.de + ').'
      : l.arme.nom + ' (' + l.arme.de + ') devient ' + l.suivant.nom.toLowerCase() + ' (' + l.suivant.de + ')' + (l.suivant.notes ? ', ' + l.suivant.notes : '') +
        '. À une mue, avec du métal rapporté d’une ruine et une forge.';
    const w = el('div'); w.style.flex = '1 1 100%'; w.append(el('span','lab', 'Sa lance'), p);
    la.append(w);
  } else if(ACHAT.type === 'prat'){
    const sien = domaineDe(c), dom = domaineAchat(c);
    if(!sien){
      /* une fiche faite à la main ne dit ni son peuple ni son école : on choisit son domaine une fois */
      const sd = el('select'); sd.id = 'prog-dom';
      sd.add(new Option('Son domaine…', ''));
      domainesPratiques().forEach(k => sd.add(new Option(majuscule(k), k)));
      sd.value = dom;
      sd.onchange = () => { ACHAT.dom = sd.value; ACHAT.nom = ''; dessinerProg(true); };
      champ(la, 'Son domaine', sd, 'Sa fiche ne dit ni son peuple ni son école.');
    }
    if(dom){
      const gs = pratiquesApprenables(c, dom);
      const sp = el('select'); sp.id = 'prog-prat';
      sp.add(new Option(gs.length ? 'Laquelle…' : 'Il connaît déjà toute sa liste', ''));
      gs.forEach(g => {
        const par = g.grp ? el('optgroup') : sp;
        if(g.grp){ par.label = g.grp; sp.append(par); }
        g.items.forEach(it => par.append(new Option(it.n + (it.pc ? ' · ' + it.pc + ' PC' : ''), it.n)));
      });
      if(!gs.some(g => g.items.some(it => it.n === ACHAT.nom))) ACHAT.nom = '';
      sp.value = ACHAT.nom;
      sp.onchange = () => { ACHAT.nom = sp.value; dessinerProg(true); };
      champ(la, 'Laquelle', sp, sien ? 'Dans la liste de son domaine, ' + sien.replace(/\s*\(.*\)$/, '') + '.' : '');
    }
    const ma = el('input'); ma.type = 'text'; ma.id = 'prog-maitre'; ma.value = ACHAT.maitre; ma.placeholder = 'Nahya, un maître d’école…'; ma.style.width = '100%';
    ma.setAttribute('list', listeDonnees('dl-maitres', tousLesGens().filter(x => x.ref !== 'pj:' + c.id).map(x => x.nom)));
    ma.oninput = () => { ACHAT.maitre = ma.value; majCoutAchat(c); };
    champ(la, 'Qui te l’enseigne', ma);
    const it = dom ? pratiqueDuLivre(dom, ACHAT.nom) : null;
    if(it){
      const w = el('div','pratlue'); w.style.flex = '1 1 100%';
      w.append(el('span','lab', 'Ce qu’elle fait'));
      w.append(el('p','mini', majuscule(jetDePratique(it.j)) + ' · ' + (it.pct || (it.pc ? it.pc + ' PC' : 'sans PC')) + ' · ' + it.d));
      la.append(w);
    }
  }
  form.append(la);

  const acts = el('div','acts'); acts.style.marginTop = '10px';
  const cout = el('span','mini'); cout.id = 'prog-cout';
  const ok = el('button','btn sm','Acheter'); ok.type = 'button'; ok.id = 'prog-acheter';
  ok.onclick = () => {
    const c = perso(PROG_PERSO); if(!c) return;
    const prix = coutAchat(c);
    const dom = ACHAT.type === 'prat' ? domaineAchat(c) : '';
    const it = ACHAT.type === 'prat' ? pratiqueDuLivre(dom, ACHAT.nom) : null;
    if(ACHAT.type === 'prat' && !dom){ msgTable('Choisis d’abord son domaine : sa fiche ne dit ni son peuple ni son école.', false); return; }
    if(ACHAT.type === 'prat' && !it){ msgTable('Choisis la Pratique dans la liste de son domaine.', false); return; }
    if(ACHAT.type === 'prat' && !ACHAT.maitre.trim()){ msgTable('Le livre le demande : quelqu’un pour te l’enseigner. Écris qui.', false); return; }
    if(ACHAT.type === 'prat' && c.pratiques.some(p => clePratique(p.n) === clePratique(ACHAT.nom))){ msgTable((c.nom || 'Il') + ' connaît déjà « ' + ACHAT.nom.trim() + ' ».', false); return; }
    if(ACHAT.type === 'car' && dejaMontee(c, ACHAT.cible)){ msgTable(ACHAT.cible + ' est déjà montée une fois : le livre n’en permet qu’une.', false); return; }
    if(ACHAT.type === 'car' && c.car[ACHAT.cible] >= 18){ msgTable('Le livre plafonne une caractéristique à 18.', false); return; }
    if(ACHAT.type === 'lance'){ const l = lanceDe(c); if(!l || !l.suivant){ msgTable(!l ? 'Pas de lance ori’ican sur sa fiche.' : 'Sa lance est déjà au plus haut cran.', false); return; } }
    if(prix > pointsRestants(c)){ msgTable('Il manque ' + (prix - pointsRestants(c)) + ' point' + (prix - pointsRestants(c) > 1 ? 's' : '') + '.', false); return; }
    /* une Pratique de son domaine : elle prend son bonus de peuple ou d'école, comme les autres */
    const a = {id:nouvelId('a'), t:maintenant(), type:ACHAT.type,
      cible: it ? it.n : ACHAT.cible,
      n: ACHAT.type === 'comp' ? Math.max(1, ACHAT.n) : 1,
      jet: it ? it.j : '', pc: it ? +it.pc || 0 : 0, pct: it ? it.pct || '' : '', texte: it ? it.d : '',
      maitre: it ? ACHAT.maitre.trim() : '', dom: it ? domaineCle(dom) : '', b:null,
      detail:detailAchat(c), cout:prix};
    if(it){ ACHAT.nom = ''; ACHAT.maitre = ''; }
    changer(() => {
      appliquerAchat(c, a, 1);
      a.bloc = noterDansSeance(phraseAchat(c, a), 'achat');
      c.prog.achats.push(a);
      majPerso(c);
    });
    msgTable('Acheté : ' + a.detail + (a.bloc ? '. C’est noté dans la séance.' : '.'), true);
  };
  acts.append(ok, cout);
  form.append(acts);
  zone.append(form);
  const regle = el('div','progregle');
  regle.append(el('p','lab', 'Ce que dit le livre'), tableauProgression());
  if(estCornu(c)) regle.append(el('p','mini', 'Un Cornu, à chaque mue : sa lance remonte d’un cran, avec du métal rapporté d’une ruine, une forge, et dix points de progression.'));
  zone.append(regle);
  box.append(zone);
  majCoutAchat(c);

  /* l'historique */
  box.append(el('h3', null, 'Ce qui a été fait'));
  const h = el('div');
  const tout = c.prog.points.map(x => ({t:x.t, txt:'+' + x.n + ' point' + (x.n > 1 ? 's' : '') + ' · ' + x.quoi, gain:true, id:x.id}))
    .concat(c.prog.achats.map(x => ({t:x.t, txt:'−' + x.cout + ' point' + (x.cout > 1 ? 's' : '') + ' · ' + (x.detail || x.type), gain:false, id:x.id, a:x})))
    .sort((a, b) => b.t - a.t);
  if(!tout.length) h.append(el('p','vide','Rien encore.'));
  tout.forEach(x => {
    const l = el('div','ligne');
    l.append(el('span','h', new Date(x.t).toLocaleDateString('fr-BE')));
    l.append(el('span','q', x.txt));
    const b = el('button','btn ghost sm','Défaire'); b.type = 'button';
    b.onclick = () => changer(() => {
      const c = perso(PROG_PERSO); if(!c) return;
      if(x.gain){
        const g = c.prog.points.find(p => p.id === x.id);
        /* un gain de toute la compagnie : sa ligne dans la séance reste tant qu'un autre le garde */
        const partage = g && g.bloc && persos().some(o => o.id !== c.id && o.prog.points.some(p => p.bloc === g.bloc));
        if(g && !partage) oublierBloc(g.bloc);
        c.prog.points = c.prog.points.filter(p => p.id !== x.id);
      }
      else { appliquerAchat(c, x.a, -1); oublierBloc(x.a.bloc); c.prog.achats = c.prog.achats.filter(p => p.id !== x.id); }
      majPerso(c);
    });
    l.append(b);
    h.append(l);
  });
  box.append(h);
}
function majCoutAchat(c){
  const n = $('prog-cout');
  if(!n) return;
  const prix = coutAchat(c), reste = pointsRestants(c);
  let t = prix + ' point' + (prix > 1 ? 's' : '') + ' · ' + detailAchat(c);
  if(ACHAT.type === 'comp'){ const b = bonusComp(c, ACHAT.cible); t += ' · ' + detailCoutComp(b, b + Math.max(1, ACHAT.n)); }
  if(prix > reste) t += ' · il en manque ' + (prix - reste);
  n.textContent = t;
}
