/* ============ les règles de la maison ============
   Le livre donne les compétences, les Pratiques et les compétences de Bannière. Le Registre des Compétences les
   retouche, et ce module pose ces retouches par-dessus le livre, dans le créateur comme à la table.
   Une retouche est une pièce avec sa date : la plus récente l'emporte, et une suppression laisse une trace,
   pour ne pas revenir d'un autre appareil. Le livre ne bouge pas : il reste dans le code, et « revenir au livre »
   est toujours possible.
   Une compétence garde toujours sa clé, le nom que le livre lui donne : rien de ce qui est gardé (une fiche, une
   sauvegarde) ne la désigne autrement. Renommer change ce qu'on lit, jamais cette clé.
   Une Pratique retouchée garde la liste de ses versions d'avant : une fiche qui porte encore l'une d'elles, sans
   que personne y ait touché, prend la nouvelle. Une fiche retouchée à la main, elle, n'est jamais changée. */

const REG_CLE = 'faelorenn.competences';
const REG_FORMAT = 'faelorenn-competences';
const REG_VERSION = 1;
/* ce qu'un fichier peut porter de pièces : bien au-delà de ce que le livre et la maison en auront jamais, mais pas sans fin */
const REG_MAX_PRAT = 4000, REG_MAX_COMP = 400;
/* les cinq caractéristiques qui portent des compétences : Constitution et Contenance n'en ont pas, et les fiches n'ont pas de place pour en ajouter */
const REG_CARS = ['Force', 'Dextérité', 'Intelligence', 'Sagesse', 'Charisme'];
/* ce que les règles nomment par son nom : Combat pare, Tir tire, Acrobatie esquive. Leur nom ne change pas, elles ne se retirent pas ;
   Combat et Tir restent aussi sous leur caractéristique, celle de leur geste */
const REG_FIXES = {'Combat':{car:true}, 'Tir':{car:true}, 'Acrobatie':{car:false}};
/* sous quelles caractéristiques une Pratique peut se lancer : dans l'ordre de la fiche, Contenance en dernier. Constitution n'en est pas */
const REG_JETS_CAR = ['Force', 'Dextérité', 'Intelligence', 'Sagesse', 'Charisme', 'Contenance'];
/* « sous la Force », « sous l’Intelligence », « sous le Charisme » */
const regSousLa = c => (c === 'Intelligence' ? 'l’Intelligence' : c === 'Charisme' ? 'le Charisme' : 'la ' + c);
const REG_JETS_SANS = ['aucun jet', 'la cible teste', 'les cibles testent'];
const REG = {competences:Object.create(null), pratiques:Object.create(null)};
const COMP_LIB = {};
let REG_LIVRE = null, REG_APPLIQUE = '', REG_CHAINE = {}, REG_NOMS = {};
/* le dernier enregistrement dans ce navigateur a-t-il réussi ? et l'avis de rechargement, écarté pour quel état du registre ? */
let REG_GARDE = true, REG_ECARTE = '';

const REG_NOMBRES = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze',
  'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt', 'vingt et une', 'vingt-deux', 'vingt-trois', 'vingt-quatre', 'vingt-cinq', 'vingt-six',
  'vingt-sept', 'vingt-huit', 'vingt-neuf', 'trente'];
/* « Les vingt compétences » : le titre suit leur nombre, si la maison en a retiré ou ajouté */
function titreCompetences(){
  const n = typeof ALLSKILLS !== 'undefined' ? ALLSKILLS.length : 20;
  return n === 1 ? 'La compétence' : 'Les ' + (REG_NOMBRES[n] || String(n)) + ' compétences';
}
/* le nom d'une compétence, tel qu'on le lit : la clé, ou le nom que la maison lui a donné */
function nomComp(cle){ return Object.prototype.hasOwnProperty.call(COMP_LIB, cle) ? COMP_LIB[cle] : cle; }

const regNorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();
const regTxt = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
const regIdOk = id => typeof id === 'string' && id.length > 0 && id.length <= 260 && id !== '__proto__';
const regVide = () => ({competences:Object.create(null), pratiques:Object.create(null)});
const regDe = (m, id) => (m && Object.prototype.hasOwnProperty.call(m, id)) ? m[id] : undefined;
function regCanon(x){
  if(x === null || x === undefined || typeof x !== 'object') return JSON.stringify(x === undefined ? null : x);
  if(Array.isArray(x)) return '[' + x.map(regCanon).join(',') + ']';
  return '{' + Object.keys(x).filter(k => x[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + regCanon(x[k])).join(',') + '}';
}
const regEstBanniere = dom => /^de la Bannière/.test(dom || '');
const regIdPrat = (dom, grp, n) => dom + '|' + grp + '|' + n;

/* ---------- ce qu'on lit : le stockage de ce navigateur, un fichier du dépôt, une sauvegarde ---------- */
/* une version d'une Pratique : ce qui fait que deux fiches parlent de la même */
function regSnap(o){
  if(!o || typeof o !== 'object') return null;
  const n = regTxt(o.n, 80).trim();
  if(!n) return null;
  const j = REG_JETS_CAR.concat(REG_JETS_SANS).indexOf(o.j) >= 0 ? o.j : 'aucun jet';
  return {n:n, d:regTxt(o.d, 1200).replace(/\s*\n\s*/g, ' ').trim(), j:j, pc:Math.max(0, Math.min(20, Math.round(+o.pc || 0))),
    pct:regTxt(o.pct, 80).trim(), base:!!o.base};
}
const regCle = s => [regNorm(s.n), regNorm(s.d), s.j, s.pc, regNorm(s.pct), s.base ? 1 : 0].join('␟');
/* la date d'une pièce : un nombre fini, jamais plus d'un jour dans le futur (une horloge déréglée, un fichier retouché à la main) */
const regMajOk = v => { v = +v; return isFinite(v) && v > 0 ? Math.min(Math.floor(v), Date.now() + 864e5) : 0; };
function regRecPrat(o){
  if(!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const maj = regMajOk(o.maj);
  if(o.supprime) return {supprime:true, maj:maj};
  const s = regSnap(o);
  if(!s) return null;
  s.dom = regTxt(o.dom, 200); s.grp = regTxt(o.grp, 200); s.ordre = isFinite(+o.ordre) ? +o.ordre : 0; s.maj = maj;
  s.precedent = Array.isArray(o.precedent) ? o.precedent.slice(-10).map(regSnap).filter(Boolean) : [];
  return s;
}
function regRecComp(o){
  if(!o || typeof o !== 'object' || Array.isArray(o)) return null;
  return {nom:regTxt(o.nom, 60).trim(), car:REG_CARS.indexOf(o.car) >= 0 ? o.car : '', retire:!!o.retire, ajout:!!o.ajout,
    ordre:isFinite(+o.ordre) ? +o.ordre : 0, maj:regMajOk(o.maj)};
}
function regLireBrut(o){
  const out = regVide();
  if(!o || typeof o !== 'object') return out;
  const sec = (src, dst, norm, max) => {
    if(!src || typeof src !== 'object' || Array.isArray(src)) return;
    let n = 0;
    Object.keys(src).forEach(id => { if(n >= max || !regIdOk(id)) return; const r = norm(src[id]); if(r){ dst[id] = r; n++; } });
  };
  sec(o.competences, out.competences, regRecComp, REG_MAX_COMP);
  sec(o.pratiques, out.pratiques, regRecPrat, REG_MAX_PRAT);
  return out;
}
function regContenu(){ return {format:REG_FORMAT, version:REG_VERSION, competences:REG.competences, pratiques:REG.pratiques}; }
function regCharger(){
  let o = null, brut = null;
  try{ brut = localStorage.getItem(REG_CLE); }catch(e){}
  if(brut){
    try{ o = JSON.parse(brut); }catch(e){
      /* illisible : on le met de côté plutôt que de le laisser écraser au prochain enregistrement */
      try{ if(!localStorage.getItem(REG_CLE + '.illisible')) localStorage.setItem(REG_CLE + '.illisible', brut); }catch(x){}
    }
  }
  const r = regLireBrut(o);
  REG.competences = r.competences; REG.pratiques = r.pratiques;
}
/* vrai si le navigateur a bien gardé le registre ; sinon (espace plein, stockage bloqué) la page le dit */
function regGarder(){
  try{ localStorage.setItem(REG_CLE, JSON.stringify(regContenu())); REG_GARDE = true; }catch(e){ REG_GARDE = false; }
  return REG_GARDE;
}
/* le plus récent l'emporte, une trace de suppression aussi ; à égalité, une règle fixe, pour que l'ordre n'y change rien */
function regFondre(a, b){
  const out = regVide();
  ['competences', 'pratiques'].forEach(c => {
    [a[c], b[c]].forEach(m => Object.keys(m).forEach(id => {
      const x = m[id], y = out[c][id];
      if(!y || x.maj > y.maj || (x.maj === y.maj && regCanon(x) > regCanon(y))) out[c][id] = x;
    }));
  });
  return out;
}
/* ce qu'on a ici et que l'autre n'a pas : une pièce absente là-bas, ou plus récente ici */
function regEnAvance(ici, labas){
  return ['competences', 'pratiques'].some(c => Object.keys(ici[c]).some(id => {
    const y = labas[c][id];
    return !y || ici[c][id].maj > y.maj;
  }));
}
function regEgal(a, b){ return regCanon(regContenu2(a)) === regCanon(regContenu2(b)); }
function regContenu2(x){ return {competences:x.competences, pratiques:x.pratiques}; }

/* ---------- ce que le livre donne ---------- */
function regLivre(){
  if(REG_LIVRE) return REG_LIVRE;
  REG_LIVRE = {
    pratiques: typeof PRATIQUES !== 'undefined' ? JSON.parse(JSON.stringify(PRATIQUES)) : {},
    skills: typeof SKILLS !== 'undefined' ? JSON.parse(JSON.stringify(SKILLS)) : {}
  };
  return REG_LIVRE;
}

/* ---------- les compétences, telles qu'elles sont maintenant ---------- */
function regCompetence(cle, carLivre, ajout){
  const rec = regDe(REG.competences, cle), fixe = REG_FIXES[cle];
  let car = carLivre, nom = cle, retire = false;
  if(rec){
    if(rec.car && !(fixe && fixe.car)) car = rec.car;
    if(rec.nom && !fixe) nom = rec.nom;
    if(rec.retire && !fixe) retire = true;
  }
  if(!car) return null;
  return {cle:cle, nom:nom, car:car, carLivre:carLivre, ajout:!!ajout, retire:retire, fixe:!!fixe, fixeCar:!!(fixe && fixe.car),
    retouche:!!rec && (nom !== cle || car !== carLivre || retire)};
}
/* toutes, retirées comprises : celles du livre dans l'ordre du livre, puis celles de la maison dans l'ordre où elles sont venues */
function regVueCompetences(){
  const L = regLivre(), out = [], vues = Object.create(null);
  Object.keys(L.skills).forEach(car => L.skills[car].forEach(cle => {
    vues[cle] = 1;
    const c = regCompetence(cle, car, false);
    if(c) out.push(c);
  }));
  Object.keys(REG.competences).filter(k => REG.competences[k].ajout && !vues[k]).sort((a, b) => {
    const d = REG.competences[a].ordre - REG.competences[b].ordre;
    return d || (a < b ? -1 : a > b ? 1 : 0);
  }).forEach(cle => {
    const c = regCompetence(cle, '', true);
    if(c) out.push(c);
  });
  return out;
}

/* sous quelle caractéristique se lit aujourd'hui chaque compétence que le Registre a déplacée : une fiche qui porte des totaux
   l'emporte avec eux, pour que le déplacement ne se fasse qu'une fois */
function regCarsCourants(){
  const out = {};
  regVueCompetences().forEach(c => { if(c.car !== c.carLivre) out[c.cle] = c.car; });
  return out;
}

/* ---------- les Pratiques, telles qu'elles sont maintenant ---------- */
/* la caractéristique de lanceur d'une liste : celle que portent ses entrées qui se lancent, la plus fréquente si elles divergent */
function regCaster(entrees){
  const n = {};
  entrees.forEach(e => { if(REG_JETS_CAR.indexOf(e.j) >= 0) n[e.j] = (n[e.j] || 0) + 1; });
  const b = entrees.find(e => e.base && REG_JETS_CAR.indexOf(e.j) >= 0);
  let best = '', max = 0;
  /* à égalité, celle de l'attaque de base ; sinon la première dans l'ordre de REG_JETS_CAR */
  REG_JETS_CAR.forEach(c => {
    const v = n[c] || 0;
    if(v > max || (v === max && v > 0 && b && b.j === c)){ best = c; max = v; }
  });
  return best;
}
function regEntreeBanniere(s){ return {n:s.n, d:s.d, j:'aucun jet', pc:0, pct:'', base:false}; }
/* toutes les listes, avec leurs entrées, et celles du livre qu'on a retirées */
function regVuePratiques(){
  const L = regLivre(), out = [], index = {};
  Object.keys(L.pratiques).forEach(dom => Object.keys(L.pratiques[dom]).forEach(grp => {
    const liste = {dom:dom, grp:grp, banniere:regEstBanniere(dom), entrees:[], retirees:[], caster:'', melange:false};
    out.push(liste); index[dom + '|' + grp] = liste;
    L.pratiques[dom][grp].forEach(e => {
      const livre = regSnap(e), id = regIdPrat(dom, grp, e.n), rec = regDe(REG.pratiques, id);
      if(rec && rec.supprime){ liste.retirees.push(Object.assign({id:id, livre:true, du:livre}, livre)); return; }
      const eff = rec ? regSnap(rec) : livre;
      /* retouchée : la moindre différence avec le livre compte, une majuscule ou un accent aussi */
      liste.entrees.push(Object.assign({id:id, livre:true, du:livre, retouche:!!rec && regCanon(eff) !== regCanon(livre), maj:rec ? rec.maj : -1}, eff));
    });
  }));
  Object.keys(REG.pratiques).filter(id => id.indexOf('|') < 0).sort((a, b) => {
    const d = REG.pratiques[a].ordre - REG.pratiques[b].ordre;
    return d || (a < b ? -1 : a > b ? 1 : 0);
  }).forEach(id => {
    const rec = REG.pratiques[id];
    if(rec.supprime || !index[rec.dom + '|' + rec.grp]) return;
    const eff = regSnap(rec);
    index[rec.dom + '|' + rec.grp].entrees.push(Object.assign({id:id, livre:false, du:null, retouche:false, maj:rec.maj}, eff));
  });
  out.forEach(l => {
    if(l.banniere){
      l.entrees.forEach(e => Object.assign(e, regEntreeBanniere(e)));
      return;
    }
    /* une seule attaque de base par liste : si deux appareils en ont posé chacun une, la plus récente reste, l'autre n'en est plus une */
    const bases = l.entrees.filter(e => e.base);
    if(bases.length > 1){
      const gagnante = bases.reduce((a, b) => (b.maj > a.maj || (b.maj === a.maj && b.id < a.id)) ? b : a);
      bases.forEach(e => {
        if(e === gagnante) return;
        e.base = false;
        if(e.livre) e.retouche = regCanon(regSnap(e)) !== regCanon(e.du);
      });
    }
    /* la caractéristique de la liste : celle du livre, ou celle que porte la plupart de ses Pratiques. Chacune garde
       pourtant la sienne, et une retouche peut les mêler : la liste le dit alors, et chaque Pratique se lance sous la sienne */
    l.caster = regCaster(l.entrees);
    l.melange = l.entrees.some(e => REG_JETS_CAR.indexOf(e.j) >= 0 && e.j !== l.caster);
  });
  return out;
}

/* ---------- poser tout cela par-dessus le livre ---------- */
/* memoire : on garde ce qu'on a en mémoire au lieu de relire le stockage (la page des compétences, qui vient d'y écrire) */
function regAppliquer(memoire){
  if(!memoire) regCharger();
  regLivre();
  /* les compétences : les listes se refont sur place, ceux qui les tiennent gardent leur référence */
  const comps = regVueCompetences();
  if(typeof SKILLS !== 'undefined'){
    Object.keys(SKILLS).forEach(c => { SKILLS[c].length = 0; });
    comps.forEach(c => { if(!c.retire){ if(!SKILLS[c.car]) SKILLS[c.car] = []; SKILLS[c.car].push(c.cle); } });
    if(typeof ALLSKILLS !== 'undefined'){
      ALLSKILLS.length = 0;
      Object.keys(SKILLS).forEach(c => SKILLS[c].forEach(s => ALLSKILLS.push({s:s, car:c})));
    }
    if(typeof CAR_DE !== 'undefined'){
      Object.keys(CAR_DE).forEach(k => delete CAR_DE[k]);
      Object.keys(SKILLS).forEach(c => SKILLS[c].forEach(s => { CAR_DE[s] = c; }));
    }
    /* une compétence sociale, c'est une compétence de Charisme */
    if(typeof SOCIAL !== 'undefined'){ SOCIAL.length = 0; (SKILLS.Charisme || []).forEach(s => SOCIAL.push(s)); }
  }
  Object.keys(COMP_LIB).forEach(k => delete COMP_LIB[k]);
  comps.forEach(c => { if(c.nom !== c.cle) COMP_LIB[c.cle] = c.nom; });
  /* les Pratiques, sur place aussi */
  const vue = regVuePratiques();
  REG_CHAINE = {}; REG_NOMS = {};
  if(typeof PRATIQUES !== 'undefined'){
    vue.forEach(l => {
      if(!PRATIQUES[l.dom]) PRATIQUES[l.dom] = {};
      const tab = PRATIQUES[l.dom][l.grp] || (PRATIQUES[l.dom][l.grp] = []);
      tab.length = 0;
      l.entrees.forEach(e => {
        const x = {n:e.n, d:e.d, j:e.j, pc:e.pc};
        if(e.pct) x.pct = e.pct;
        if(e.base) x.base = true;
        tab.push(x);
      });
    });
  }
  /* de quoi remettre à jour les fiches qui portent une ancienne version */
  const noms = {};
  vue.forEach(l => l.entrees.forEach(e => { noms[regNorm(l.banniere ? 'banniere' : l.dom) + '␟' + regNorm(e.n)] = 1; }));
  Object.keys(REG.pratiques).forEach(id => {
    const rec = REG.pratiques[id];
    if(rec.supprime || !rec.precedent || !rec.precedent.length) return;
    let l = null, e = null;
    vue.some(x => { const t = x.entrees.find(y => y.id === id); if(t){ l = x; e = t; return true; } return false; });
    if(!e) return;
    const dom = regNorm(l.banniere ? 'banniere' : l.dom), courant = {n:e.n, d:e.d, j:e.j, pc:e.pc, pct:e.pct, base:e.base};
    rec.precedent.forEach(s => {
      const k = dom + '␟' + regCle(s);
      /* une version d'avant qui ne diffère de celle d'aujourd'hui que par une majuscule ou un accent se met à jour aussi */
      if(regCanon(regSnap(s)) !== regCanon(regSnap(courant)) && !REG_CHAINE[k]) REG_CHAINE[k] = courant;
      const nk = dom + '␟' + regNorm(s.n);
      if(regNorm(s.n) !== regNorm(e.n) && !noms[nk] && !REG_NOMS[nk]) REG_NOMS[nk] = e.n;
    });
  });
  REG_APPLIQUE = regCanon(regContenu2(REG));
  return {competences:comps, pratiques:vue};
}
/* ce qui est posé est-il ce que ce navigateur garde maintenant ? */
const regAJour = () => regCanon(regContenu2(REG)) === REG_APPLIQUE;

/* le domaine d'une Pratique, tel que le livre l'écrit (« de la Sève (Écorciens et Élytris) ») : une Pratique apprise à la table
   porte seulement son nom court (« seve »), que la table sait lire (domaineCle) */
function regDomLong(dom){
  if(!dom || typeof PRATIQUES === 'undefined') return dom || '';
  if(Object.prototype.hasOwnProperty.call(PRATIQUES, dom)) return dom;
  if(typeof domaineCle === 'function'){
    const k = Object.keys(PRATIQUES).find(x => !regEstBanniere(x) && domaineCle(x) === dom);
    if(k) return k;
  }
  return dom;
}
/* la version d'aujourd'hui d'une Pratique portée par une fiche : seulement si la fiche en est restée à une version d'avant */
function regMajCopie(p, domPerso){
  if(!p) return null;
  const dom = p.banniere ? 'banniere' : regDomLong(p.dom || domPerso || '');
  const s = regSnap(p);
  if(!s) return null;
  return REG_CHAINE[regNorm(dom) + '␟' + regCle(s)] || null;
}
/* le nom d'aujourd'hui d'une Pratique qui a changé de nom : une sauvegarde du créateur garde les noms */
function regNomPratique(n, dom, banniere){
  return REG_NOMS[regNorm(banniere ? 'banniere' : dom) + '␟' + regNorm(n)] || n;
}

/* ---------- le dépôt : relire de temps en temps, sans rien écrire ---------- */
/* le fichier du dépôt rejoint ce qu'on garde ici ; vrai si ce qui est posé n'est plus ce qu'on garde */
function regLireEnLigne(){
  if(typeof ghcPret !== 'function' || !ghcPret() || !GHC_FICHIERS.competences) return Promise.resolve(false);
  return ghcLireUnFichier(GHC_FICHIERS.competences).then(o => {
    if(!o || typeof o !== 'object' || o.format !== REG_FORMAT) return false;
    const fond = regFondre(REG, regLireBrut(o));
    if(!regEgal(fond, REG)){ REG.competences = fond.competences; REG.pratiques = fond.pratiques; regGarder(); }
    return !regAJour();
  }, () => false);
}
function regAvis(){
  if(typeof document === 'undefined' || !document.body || document.getElementById('regAvis')) return;
  /* « Plus tard » vaut jusqu'à ce que le registre change de nouveau : l'avis ne revient pas toutes les deux minutes */
  if(REG_ECARTE && REG_ECARTE === regCanon(regContenu2(REG))) return;
  const s = document.createElement('style');
  s.textContent = '@media print{#regAvis{display:none!important}}';
  const d = document.createElement('div');
  d.id = 'regAvis'; d.setAttribute('role', 'status');
  d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9999;'
    + 'max-width:min(560px,calc(100vw - 32px));background:var(--surface,#fff);color:var(--ink,#1B1C18);border:1px solid var(--forest,#1F3D2B);'
    + 'border-radius:3px;box-shadow:0 2px 12px rgba(0,0,0,.28);padding:10px 14px;font:14px/1.4 "IBM Plex Sans",system-ui,sans-serif;'
    + 'display:flex;gap:10px 14px;align-items:center;flex-wrap:wrap';
  const t = document.createElement('span');
  t.textContent = 'Les compétences ou les Pratiques ont changé dans le Registre des Compétences. Recharge la page pour les prendre.';
  const bt = (txt, plein) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = txt;
    b.style.cssText = 'font:inherit;font-size:13px;padding:5px 11px;border:1px solid var(--forest,#1F3D2B);border-radius:2px;cursor:pointer;'
      + (plein ? 'background:var(--forest,#1F3D2B);color:var(--paper,#F4F2EA)' : 'background:transparent;color:var(--forest,#1F3D2B)');
    return b;
  };
  const r = bt('Recharger', true), p = bt('Plus tard', false);
  r.id = 'regRecharger'; p.id = 'regPlusTard';
  r.onclick = () => location.reload();
  p.onclick = () => { REG_ECARTE = regCanon(regContenu2(REG)); d.remove(); };
  d.append(t, r, p);
  document.head.appendChild(s);
  document.body.appendChild(d);
}
/* créateur et table : relire le dépôt à l'ouverture et toutes les deux minutes, et suivre l'autre onglet */
function regSurveiller(){
  if(typeof window === 'undefined') return;
  const verifier = () => regLireEnLigne().then(neuf => { if(neuf) regAvis(); }, () => {});
  window.addEventListener('storage', e => {
    if(e.key !== REG_CLE && e.key !== null) return;
    regCharger();
    if(!regAJour()) regAvis();
  });
  setTimeout(verifier, 2500);
  setInterval(() => { if(!document.hidden) verifier(); }, 120000);
}
