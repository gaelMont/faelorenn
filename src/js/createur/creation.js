/* les compétences et les Pratiques, retouchées dans le Registre des Compétences, passent par-dessus le livre */
regAppliquer();

const S = {nom:'',peuple:'Humains',voie:'Éclaireur',car:{},sk:{},prat:[],sub:{},humCar:[],skChoice:'',banComp:'',id:''};
CARS.forEach(c => S.car[c] = 0);
ALLSKILLS.forEach(o => S.sk[o.s] = 0);

const GESTE = {'Force':'Combat', 'Dextérité':'Tir'};
const ABR_JET = {'Force':'FOR', 'Dextérité':'DEX', 'Intelligence':'INT', 'Sagesse':'SAG', 'Charisme':'CHA', 'Contenance':'CNT'};
const $ = id => document.getElementById(id);
const near = n => Math.floor(n);   /* tout arrondi se fait vers le bas */
const d20 = t => Math.floor(t / 5);

/* le personnage ouvert se garde ici ; s'il est enregistré dans tes personnages, son double suit (createur/mes-personnages.js) */
function save(){ if(typeof suivreMien === 'function') suivreMien(); try{ localStorage.setItem('faelorenn.perso', JSON.stringify(S)); }catch(e){} }
function load(){ try{ const r = localStorage.getItem('faelorenn.perso'); if(r) Object.assign(S, JSON.parse(r)); }catch(e){} }

function peupleBonus(){
  const p = PEUPLES[S.peuple], b = {};
  CARS.forEach(c => b[c] = 0);
  if(S.peuple === 'Humains'){ (S.humCar||[]).forEach(c => b[c] += 1); }
  else { Object.keys(p.car||{}).forEach(c => b[c] += p.car[c]); }
  if(S.peuple === "Ori'Ican" && TYPES[S.sub.type]) Object.keys(TYPES[S.sub.type]).forEach(c => b[c] += TYPES[S.sub.type][c]);
  if(S.peuple === 'Nyréens' && BRANCHES[S.sub.branche]) Object.keys(BRANCHES[S.sub.branche]).forEach(c => b[c] += BRANCHES[S.sub.branche][c]);
  return b;
}
const carVal = c => 8 + (S.car[c]||0) + peupleBonus()[c];
const carSpent = () => CARS.reduce((a,c) => a + (S.car[c]||0), 0);
const skSpent = () => ALLSKILLS.reduce((a,o) => a + (S.sk[o.s]||0), 0);

function skBonus(name){
  const p = PEUPLES[S.peuple];
  let v = (VOIES[S.voie] && VOIES[S.voie].b[name]) || 0;
  let t = (p.sk && p.sk[name]) || 0;
  if(p.choixSk && S.skChoice === name) t += (S.peuple === 'Cimérans' ? 10 : 10);
  return {voie:v, trait:t};
}
function skTotal(name){
  const o = ALLSKILLS.find(x => x.s === name), b = skBonus(name);
  return carVal(o.car) * 2 + (S.sk[name]||0) + b.voie + b.trait;
}
const pv = () => carVal('Constitution') + PEUPLES[S.peuple].pv;
const pc = () => Math.floor(carVal('Contenance') / 2);
const domaine = () => S.peuple === 'Humains' ? ECOLES[S.sub.ecole] : PEUPLES[S.peuple].dom;

/* ce qu'on peut choisir : sa branche ou son type seulement, et jamais l'attaque de base,
   qui est donnee d'office */
function pratList(){
  const d = domaine(); if(!d || !PRATIQUES[d]) return [];
  const g = PRATIQUES[d], out = [];
  Object.keys(g).forEach(k => {
    if(S.peuple === 'Nyréens' && k !== 'Commune au 3 variant de Nyréen' && S.sub.branche && k !== S.sub.branche) return;
    if(S.peuple === "Ori'Ican" && S.sub.type && k !== S.sub.type) return;
    const items = g[k].filter(it => !it.base);
    if(items.length) out.push({grp:k === '_' ? '' : k, items:items});
  });
  return out;
}
/* l'attaque de base de ta liste : celle de ta branche, de ton type ou de ton ecole */
function attaqueBase(){
  const d = domaine(); if(!d || !PRATIQUES[d]) return null;
  const g = PRATIQUES[d];
  const cles = Object.keys(g).filter(k => {
    if(S.peuple === 'Nyréens') return S.sub.branche === k;
    if(S.peuple === "Ori'Ican") return S.sub.type === k;
    return true;
  });
  for(let i = 0; i < cles.length; i++){
    const b = g[cles[i]].find(it => it.base);
    if(b) return b;
  }
  return null;
}
/* ce qui figure sur la fiche : l'attaque de base, puis les trois choisies */
function pratNoms(){
  const b = attaqueBase();
  return (b ? [b.n] : []).concat(S.prat);
}
/* le paquetage du peuple, avec ce que son type ou sa branche ajoute */
function paqPeuple(){
  const p = PEUPLES[S.peuple];
  let t = p.paq;
  if(p.paqSub) Object.keys(p.paqSub).forEach(k => {
    if(Object.keys(S.sub || {}).some(x => S.sub[x] === k)) t += ' ' + p.paqSub[k];
  });
  return t;
}

function el(tag, cls, txt){ const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }

function stepper(get, set, min, max, step){
  const w = el('div','stepper');
  const m = el('button', null, '−'); m.type = 'button'; m.setAttribute('aria-label','moins');
  const v = el('span','v', String(get()));
  const p = el('button', null, '+'); p.type = 'button'; p.setAttribute('aria-label','plus');
  m.disabled = get() <= min; p.disabled = get() >= max;
  m.onclick = () => { set(Math.max(min, get() - step)); draw(); };
  p.onclick = () => { set(Math.min(max, get() + step)); draw(); };
  w.append(m, v, p); return w;
}

function drawSelects(){
  const ps = $('peuple'), vs = $('voie');
  if(!ps.options.length){
    Object.keys(PEUPLES).forEach(k => ps.add(new Option(k, k)));
    Object.keys(VOIES).forEach(k => vs.add(new Option(k, k)));
    ps.onchange = () => { S.peuple = ps.value; S.prat = []; delete S.gardees; S.sub = {}; S.humCar = []; S.skChoice = ''; S.banComp = ''; draw(); };
    vs.onchange = () => { S.voie = vs.value; draw(); };
    $('nom').oninput = e => { S.nom = e.target.value; drawFiche(); save(); };
  }
  ps.value = S.peuple; vs.value = S.voie; $('nom').value = S.nom;

  const box = $('subChoices'); box.innerHTML = '';
  const p = PEUPLES[S.peuple];
  (p.sub || []).forEach(sub => {
    const d = el('div'); d.append(Object.assign(el('label','f', sub.l), {htmlFor:'sub_' + sub.k}));
    const s = el('select'); s.id = 'sub_' + sub.k;
    s.add(new Option('à choisir', ''));
    sub.o.forEach(o => s.add(new Option(o, o)));
    s.value = S.sub[sub.k] || '';
    s.onchange = () => { S.sub[sub.k] = s.value; if(sub.k === 'ecole' || sub.k === 'branche' || sub.k === 'type'){ S.prat = []; delete S.gardees; } draw(); };
    d.append(s); box.append(d);
  });

  const f = $('peupleFacts'); f.innerHTML = '';
  const add = (k, v) => { if(!v) return; f.append(el('dt', null, k), el('dd', null, v)); };
  add('Traits', p.traits); add('Contrainte', p.contrainte); add('Armure', p.armure);
  add('Compétence de peuple', p.comp); add('Domaine', domaine() ? 'Pratiques ' + domaine() : 'choisis ton école');
  if(p.note) add('À savoir', p.note);
}

function drawCars(){
  const tb = $('carTable').querySelector('tbody'); tb.innerHTML = '';
  const bon = peupleBonus();
  const hum = S.peuple === 'Humains';
  const pris = hum ? (S.humCar||[]).length : 0;

  const hint = $('carHint');
  if(hum){
    hint.hidden = false;
    hint.textContent = pris >= 2
      ? 'Humain : tes deux +1 sont placés. Clique sur un +1 pour le reprendre.'
      : 'Humain : clique dans la colonne Peuple pour placer tes deux +1. Il t’en reste ' + (2 - pris) + '.';
  } else {
    hint.hidden = true; hint.textContent = '';
  }

  CARS.forEach(c => {
    const tr = el('tr');
    tr.append(el('td', null, c + '  ' + ABBR[c]));
    const tdB = el('td','n');
    tdB.append(stepper(() => S.car[c], v => { S.car[c] = v; }, 0, 7, 1));
    tr.append(tdB);
    if(hum){
      const td = el('td','n');
      const on = (S.humCar||[]).indexOf(c) >= 0;
      const b = el('button','pick' + (on ? ' on' : ''), '+1');
      b.type = 'button';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', (on ? 'retirer le +1 en ' : 'placer un +1 en ') + c);
      b.disabled = !on && pris >= 2;
      b.onclick = () => {
        S.humCar = S.humCar || [];
        if(on) S.humCar = S.humCar.filter(x => x !== c);
        else if(S.humCar.length < 2) S.humCar.push(c);
        draw();
      };
      td.append(b); tr.append(td);
    } else {
      tr.append(el('td','n', bon[c] ? '+' + bon[c] : '–'));
    }
    const v = carVal(c);
    const tdV = el('td','n'); tdV.append(el('b', null, String(v))); tr.append(tdV);
    tr.append(el('td','n', String(v * 2)));
    tr.append(el('td','n', (near(v/5) >= 0 ? '+' : '') + near(v/5)));
    tb.append(tr);
  });
}

function drawSkills(){
  const tb = $('skillTable').querySelector('tbody'); tb.innerHTML = '';
  CARS.forEach(c => {
    if(!SKILLS[c].length) return;
    const g = el('tr','grp'); const td = el('td', null, c + ' · base ' + (carVal(c)*2)); td.colSpan = 6; g.append(td); tb.append(g);
    SKILLS[c].forEach(s => {
      const b = skBonus(s), tr = el('tr');
      tr.append(el('td', null, nomComp(s)));
      const tdP = el('td','n');
      tdP.append(stepper(() => S.sk[s], v => { S.sk[s] = v; }, 0, 40, 5));
      tr.append(tdP);
      tr.append(el('td','n', b.voie ? '+' + b.voie : '–'));
      tr.append(el('td','n', b.trait ? '+' + b.trait : '–'));
      const t = skTotal(s);
      const tdT = el('td','n'); tdT.append(el('b', null, String(t))); tr.append(tdT);
      tr.append(el('td','n', String(d20(t))));
      tb.append(tr);
    });
  });
  const box = $('traitChoice'); box.innerHTML = '';
  const p = PEUPLES[S.peuple];
  if(p.choixSk){
    const c = el('div','card'); c.style.marginTop = '10px';
    c.append(el('label','f', p.choixSk.label));
    const s = el('select'); s.id = 'skchoice';
    s.add(new Option('à choisir',''));
    const choix = p.choixSk.list || ALLSKILLS.map(o => o.s);
    choix.forEach(n => s.add(new Option(nomComp(n), n)));
    /* une compétence que le Registre a retirée ou ne connaît pas ici reste écrite dans la fiche, mais ne se montre pas comme choisie */
    s.value = choix.indexOf(S.skChoice) >= 0 ? S.skChoice : '';
    s.onchange = () => { S.skChoice = s.value; draw(); };
    c.append(s); box.append(c);
  }
}

function drawPrat(){
  const box = $('pratBox'); box.innerHTML = '';
  const groups = pratList();
  if(!groups.length){ box.append(el('p','note','Choisis d’abord ton école pour voir tes Pratiques.')); return; }
  const bonus = pratBonus();
  const base = attaqueBase();
  const gardees = gardeesNettoyees(S.gardees);
  if(gardees.length){
    const noms = gardees.map(x => '« ' + x.n + ' »').join(', ');
    box.append(el('p', 'note', gardees.length > 1
      ? (REG_NOMBRES[gardees.length] ? REG_NOMBRES[gardees.length].charAt(0).toUpperCase() + REG_NOMBRES[gardees.length].slice(1) : gardees.length) + ' Pratiques de cette fiche, ' + noms + ', ne sont pas dans le Registre des Compétences de ce navigateur. Elles restent gardées avec la fiche et reprennent leur place dès qu’il les connaît : recharge la page si le dépôt vient de changer.'
      : 'Une Pratique de cette fiche, ' + noms + ', n’est pas dans le Registre des Compétences de ce navigateur. Elle reste gardée avec la fiche et reprend sa place dès qu’il la connaît : recharge la page si le dépôt vient de changer.'));
  }
  if(base){
    box.append(Object.assign(el('h3', null, 'Ton attaque de base, donnée d’office'),
      {style:'font-family:Spectral,serif;font-style:italic;color:var(--sage);margin:0 0 2px;font-size:14px'}));
    const row = el('div','tick donne');
    row.append(Object.assign(el('span','recu','✓'), {title:'donnée avec ta liste'}));
    const lab = el('div'); lab.style.flex = '1';
    lab.append(el('span','nm', base.n));
    lab.append(el('span','pc', 'de base'));
    const vb = pratValeur(base);
    lab.append(el('span','jt', vb.val == null ? vb.jet : ABR_JET[vb.jet] + ' ' + vb.val + ' \u00b7 d20 ' + d20(vb.val) + (vb.par ? ' (' + vb.par + ')' : '')));
    lab.append(el('div','de', base.d));
    row.append(lab);
    box.append(row);
    box.append(Object.assign(el('h3', null, 'Tes trois Pratiques'),
      {style:'font-family:Spectral,serif;font-style:italic;color:var(--sage);margin:14px 0 2px;font-size:14px'}));
  }
  /* une liste dont les Pratiques ne se lancent pas toutes sous la même (une retouche du Registre) le dit ainsi */
  const jets = [];
  const noterJet = it => { if(it && REG_JETS_CAR.indexOf(it.j) >= 0 && jets.indexOf(it.j) < 0) jets.push(it.j); };
  noterJet(base);
  groups.forEach(g => g.items.forEach(it => noterJet(it)));
  $('pratHint').textContent = 'Trois à la création, plus l’attaque de base de ta liste, donnée et gratuite. Bonus +' + bonus +
    (S.peuple === 'Humains' ? ' (+20 de base, +10 par ton école).' : ' (+20 de base, +20 par ton domaine).') +
    (jets.length > 1
      ? ' Ici, chaque Pratique se lance sous la sienne, ou sous ta compétence de la même caractéristique si elle est plus haute.'
      : base && REG_JETS_CAR.indexOf(base.j) >= 0
      ? ' Ta liste se lance sous ' + regSousLa(base.j) + (GESTE[base.j] ? ', ou sous ta compétence ' + GESTE[base.j] + ' si elle est plus haute' : '') + '.'
      : jets.length === 1
      ? ' Ta liste se lance sous ' + regSousLa(jets[0]) + (GESTE[jets[0]] ? ', ou sous ta compétence ' + GESTE[jets[0]] + ' si elle est plus haute' : '') + '.'
      : ' Chaque liste se lance sous sa caractéristique.') +
    ' La valeur et le d20 sont écrits à côté.';
  groups.forEach(g => {
    if(g.grp) box.append(Object.assign(el('h3', null, g.grp), {style:'font-family:Spectral,serif;font-style:italic;color:var(--sage);margin:12px 0 2px;font-size:14px'}));
    g.items.forEach(it => {
      const row = el('div','tick');
      const cb = el('input'); cb.type = 'checkbox'; cb.id = 'pr_' + it.n.replace(/\W/g,'');
      cb.checked = S.prat.indexOf(it.n) >= 0;
      cb.disabled = !cb.checked && S.prat.length >= 3;
      cb.onchange = () => {
        if(cb.checked) S.prat.push(it.n);
        else S.prat = S.prat.filter(x => x !== it.n);
        draw();
      };
      const lab = el('label'); lab.htmlFor = cb.id; lab.style.flex = '1';
      const nm = el('span','nm', it.n);
      lab.append(nm);
      lab.append(el('span','pc', coutTxt(it)));
      const v = pratValeur(it);
      lab.append(el('span','jt', v.val == null ? v.jet : ABR_JET[v.jet] + ' ' + v.val + ' \u00b7 d20 ' + d20(v.val) + (v.par ? ' (' + v.par + ')' : '')));
      lab.append(el('div','de', it.d));
      row.append(cb, lab); box.append(row);
    });
  });
  if(S.peuple === 'Humains'){
    const b = S.sub.ban === "L'Or" ? "de la Bannière de l'Or" : S.sub.ban === 'Le Sang' ? 'de la Bannière du Sang' : null;
    if(b && PRATIQUES[b]){
      box.append(Object.assign(el('h3', null, 'Ta compétence de Bannière, une seule'), {style:'font-family:Spectral,serif;font-style:italic;color:var(--sage);margin:14px 0 2px;font-size:14px'}));
      PRATIQUES[b]._.forEach(it => {
        const row = el('div','tick');
        const rb = el('input'); rb.type = 'radio'; rb.name = 'bancomp'; rb.id = 'bc_' + it.n.replace(/\W/g,'');
        rb.checked = S.banComp === it.n;
        rb.onchange = () => { S.banComp = it.n; draw(); };
        const lab = el('label'); lab.htmlFor = rb.id; lab.style.flex = '1';
        lab.append(el('span','nm', it.n), el('div','de', it.d));
        row.append(rb, lab); box.append(row);
      });
    }
  }
}

function drawGear(){
  const box = $('gearBox'); box.innerHTML = '';
  const v = VOIES[S.voie], p = PEUPLES[S.peuple];
  const d = el('dl','facts'); d.style.marginTop = '0';
  d.append(el('dt', null, 'Ta Voie'), el('dd', null, v.paq));
  d.append(el('dt', null, 'Ton peuple'), el('dd', null, paqPeuple()));
  d.append(el('dt', null, 'Armure'), el('dd', null, p.armure));
  box.append(d);
}

function drawBar(){
  const cr = 21 - carSpent(), sr = 100 - skSpent();
  const a = $('pCar'), b = $('pSkill'), c = $('pPrat');
  a.querySelector('b').textContent = cr;
  a.className = 'pill' + (cr === 0 ? ' ok' : cr < 0 ? ' warn' : '');
  b.querySelector('b').textContent = sr;
  b.className = 'pill' + (sr === 0 ? ' ok' : sr < 0 ? ' warn' : '');
  c.querySelector('b').textContent = S.prat.length + '/3';
  c.className = 'pill' + (S.prat.length === 3 ? ' ok' : '');
  $('pPv').textContent = pv(); $('pPc').textContent = pc(); $('pRed').textContent = PEUPLES[S.peuple].red;
}

/* la fiche est construite dans createur/fiche-imprimable.js */

function drawWarn(){
  const cr = 21 - carSpent(), sr = 100 - skSpent();
  let msgs = [];
  if(cr > 0) msgs.push('Il te reste ' + cr + ' point' + (cr>1?'s':'') + ' de caractéristique.');
  if(cr < 0) msgs.push('Tu dépasses de ' + (-cr) + ' points de caractéristique.');
  if(sr > 0) msgs.push('Il te reste ' + sr + ' points de compétence.');
  if(sr < 0) msgs.push('Tu dépasses de ' + (-sr) + ' points de compétence.');
  if(S.prat.length < 3 && domaine()) msgs.push('Il te manque ' + (3 - S.prat.length) + ' Pratique' + (3-S.prat.length>1?'s':'') + '.');
  if(S.prat.length > 3) msgs.push('Tu as ' + S.prat.length + ' Pratiques, le livre en donne trois : décoches-en ' + (S.prat.length - 3 > 1 ? (S.prat.length - 3) : 'une') + '.');
  return msgs;
}

function draw(){
  drawSelects(); drawCars(); drawSkills(); drawPrat(); drawGear(); drawBar(); drawFiche(); noteWord(); save();
}

$('print').onclick = () => window.print();
$('word').onclick = exporterWord;
$('wcopy').onclick = copierPourWord;
$('json').onclick = exporterJson;
/* repartir de zéro : un personnage enregistré reste dans tes personnages (createur/mes-personnages.js) */
$('reset').onclick = nouveauMien;
$('copy').onclick = () => {
  const lines = [];
  lines.push((S.nom || 'Sans nom') + ' · ' + S.peuple + ', ' + S.voie);
  Object.keys(S.sub).forEach(k => { if(S.sub[k]) lines.push(k + ' : ' + S.sub[k]); });
  lines.push('');
  lines.push(CARS.map(c => ABBR[c] + ' ' + carVal(c)).join(' · '));
  lines.push('PV ' + pv() + ' · PC ' + pc() + ' · Réduction ' + PEUPLES[S.peuple].red);
  lines.push('');
  ALLSKILLS.forEach(o => { const t = skTotal(o.s); if(t > carVal(o.car)*2) lines.push(nomComp(o.s) + ' : ' + t + ' (d20 ' + d20(t) + ')'); });
  if(pratNoms().length){ lines.push(''); lines.push('Pratiques : ' + pratNoms().join(', ')); }
  if(S.banComp) lines.push('Bannière : ' + S.banComp);
  lines.push(''); lines.push('Paquetage : ' + VOIES[S.voie].paq + ' ' + paqPeuple());
  const txt = lines.join('\n');
  navigator.clipboard.writeText(txt).then(
    () => { $('copy').textContent = 'Copié'; setTimeout(() => { $('copy').textContent = 'Copier en texte'; }, 1400); },
    () => { $('copy').textContent = 'Copie refusée'; setTimeout(() => { $('copy').textContent = 'Copier en texte'; }, 1400); }
  );
};

/* Une Pratique que ce créateur ne connaît pas (le Registre des Compétences d'un autre appareil est plus récent, la Pratique
   a été retirée, ou elle n'est plus de ta branche) n'est plus cochée, mais rien ne s'efface : elle reste gardée avec la fiche
   (S.gardees), à sa place dans la liste, et revient dès qu'on la connaît de nouveau. Une fiche ouverte n'est jamais réécrite
   pour si peu : voir noterOuverte (createur/mes-personnages.js). */
function gardeesNettoyees(g){
  if(!g || typeof g !== 'object' || !Array.isArray(g.prat)) return [];
  const out = [];
  g.prat.forEach(x => {
    if(out.length < 8 && x && typeof x === 'object' && typeof x.n === 'string' && x.n && x.n.length <= 120)
      out.push({n:x.n, i:Math.max(0, Math.min(10, Math.round(+x.i) || 0))});
  });
  return out.sort((a, b) => a.i - b.i);
}
/* ce qui vient d'ailleurs (ce navigateur, une fiche enregistrée) se remet d'aplomb */
function remettreEnOrdre(){
  if(typeof S.id !== 'string') S.id = '';
  if(!S.peuple || !PEUPLES[S.peuple]) S.peuple = 'Humains';
  if(!Array.isArray(S.prat)) S.prat = [];
  if(!S.sub || typeof S.sub !== 'object' || Array.isArray(S.sub)) S.sub = {};
  /* les Pratiques : une renommée dans le Registre garde sa place (même d'une majuscule ou d'un accent près) ; les autres, inconnues ici, sont mises de côté */
  const connu = {};
  pratList().forEach(g => g.items.forEach(it => { connu[regNorm(it.n)] = it.n; }));
  if(Object.keys(connu).length){
    const dom = domaine();
    /* la liste entière, avec ce qui avait été mis de côté remis à sa place */
    const tout = S.prat.filter(n => typeof n === 'string');
    gardeesNettoyees(S.gardees).forEach(x => tout.splice(Math.min(x.i, tout.length), 0, x.n));
    const reste = [], garde = [], pris = {};
    tout.forEach(n => {
      const cur = connu[regNorm(regNomPratique(n, dom, false))];
      if(cur){ if(!pris[cur]){ pris[cur] = 1; reste.push(cur); } }
      else garde.push({n:n, i:reste.length + garde.length});
    });
    S.prat = reste;
    if(garde.length) S.gardees = {prat:garde}; else delete S.gardees;
  }
  if(S.banComp) S.banComp = regNomPratique(S.banComp, '', true);
  if(!S.voie || !VOIES[S.voie]) S.voie = 'Éclaireur';
  /* les compétences ont pu changer dans le Registre : chacune a sa place dans la fiche. Ce qui est écrit pour une compétence
     que le Registre a retirée ou ne connaît pas ici reste dans la fiche, et ne se perd pas */
  if(!S.sk || typeof S.sk !== 'object' || Array.isArray(S.sk)) S.sk = {};
  ALLSKILLS.forEach(o => { if(!isFinite(+S.sk[o.s])) S.sk[o.s] = 0; });
}
