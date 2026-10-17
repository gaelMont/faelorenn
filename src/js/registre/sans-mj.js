/* ============ ce qu'il faut pour tenir la partie sans MJ ============
   Le repos, ce que chacun subit, celui qui est à terre, et le jour où l'on en est. Tout se garde avec la
   séance ou avec la campagne, comme le reste, et chaque chose a sa propre date. */

/* ---------- le jour de jeu ----------
   Le Livre I compte les années depuis la Réunion : « aujourd'hui, an 14 509 ». Chaque campagne a son jour,
   et deux campagnes peuvent se jouer à dix ans d'écart sans se gêner. */
const AN_DEFAUT = 14509;
const JOURS_AN = 360;                   /* le livre ne donne pas de mois : douze fois trente, pour compter */
function laCampagne(){ const c = T.campagnes[idCourante()]; return c && !c.supprime ? c : null; }
const anCourant = () => { const c = laCampagne(); return c ? c.an : AN_DEFAUT; };
function texteDuJour(c){
  if(!c) return '';
  return 'an ' + String(c.an).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ', jour ' + c.jour;
}
/* avancer, ou reculer, d'un nombre de jours */
function avancerJours(n){
  n = Math.round(+n || 0);
  const c = laCampagne(); if(!c || !n) return;
  let an = c.an, jour = c.jour + n;
  while(jour > JOURS_AN){ jour -= JOURS_AN; an++; }
  while(jour < 1){ jour += JOURS_AN; an--; }
  an = Math.max(0, an);
  changer(() => {
    const x = T.campagnes[c.id];
    if(x) T.campagnes[c.id] = Object.assign({}, x, {an:an, jour:jour, majDate:maintenant(), maj:maintenant()});
  });
  return {an:an, jour:jour};
}
function poserDate(an, jour){
  const c = laCampagne(); if(!c) return;
  changer(() => {
    const x = T.campagnes[c.id];
    if(x) T.campagnes[c.id] = Object.assign({}, x, {an:Math.max(0, Math.round(+an || 0)),
      jour:Math.max(1, Math.min(JOURS_AN, Math.round(+jour || 1))), majDate:maintenant(), maj:maintenant()});
  });
}
/* l'âge d'un PNJ, lu au jour de la campagne qu'on joue */
function ageDe(p){
  if(!p || p.ne == null) return null;
  return anCourant() - p.ne;
}
function texteAge(p){
  const a = ageDe(p);
  if(a == null) return '';
  if(a < 0) return 'pas encore né';
  if(a === 0) return 'moins d’un an';
  return a + ' ans';
}

/* ---------- ce que chacun subit ----------
   Une puce par état, posée sur un combattant : « À terre », « Pris », « −10 à ses jets ». Chacune dit combien
   de rounds elle tient ; un nouveau round les fait descendre, un repos long efface celles qui tiennent jusque-là.
   Tout vit sur la séance, à côté des jetons, avec sa propre date. */
const ET_MAX = 12;
function normEtats(o){
  if(!o || typeof o !== 'object') return {};
  const out = {};
  Object.keys(o).slice(0, 80).forEach(k => {
    const x = o[k];
    if(!x || typeof x !== 'object') return;
    const l = Array.isArray(x.l) ? x.l.slice(0, ET_MAX).map(e => e && typeof e === 'object' && txtOu(e.n) ? {
      n:txtOu(e.n).slice(0, 60),
      /* r : les rounds qui restent. -1 : jusqu'au repos. 0 : tant qu'on ne l'enlève pas */
      r:(e.r == null || isNaN(+e.r)) ? 0 : Math.max(-1, Math.min(99, Math.round(+e.r)))
    } : null).filter(Boolean) : [];
    const m = x.m && typeof x.m === 'object' ? {
      r:Math.max(0, Math.min(3, Math.round(+x.m.r) || 0)),
      e:Math.max(0, Math.min(3, Math.round(+x.m.e) || 0)),
      f:x.m.f === 'stable' ? 'stable' : x.m.f === 'mort' ? 'mort' : ''
    } : null;
    if(!l.length && !m) return;
    out[String(k).slice(0, 60)] = {l:l, m:m};
  });
  return out;
}
const lesEtats = () => { const e = seanceCourante(); return e && e.etats ? e.etats : {}; };
function poserEtats(x){
  const e = seanceCourante(); if(!e) return;
  changer(() => {
    const y = T.journal[e.id]; if(!y) return;
    T.journal[e.id] = Object.assign({}, y, {etats:normEtats(x), majEtats:maintenant()});
  });
}
const cleEtat = z => z.k + ':' + z.id;
const etatsDe = z => (lesEtats()[cleEtat(z)] || {}).l || [];
const mortDe = z => (lesEtats()[cleEtat(z)] || {}).m || null;
function majEtatDe(z, f){
  const tout = JSON.parse(JSON.stringify(lesEtats())), cle = cleEtat(z);
  const av = tout[cle] || {l:[], m:null};
  const ap = f(av) || av;
  if(!ap.l.length && !ap.m) delete tout[cle]; else tout[cle] = ap;
  poserEtats(tout);
}
/* les états qu'on pose le plus souvent, tirés des attaques du livre et du bestiaire */
const ETATS_COURANTS = [
  {n:'À terre', r:0}, {n:'Pris : un jet de FOR pour se dégager', r:0}, {n:'Collé', r:0},
  {n:'Ne se déplace plus', r:1}, {n:'Ne peut pas attaquer ce round', r:1},
  {n:'−10 à ses jets', r:-1}, {n:'−4 au d20', r:3}, {n:'+4 à son prochain jet', r:1},
  {n:'Pare la prochaine attaque', r:1}, {n:'Brûle : le dé du rang par round', r:3},
  {n:'Perd 1d4 PV par round', r:3}, {n:'Marqué par la Floraison', r:-1}
];
const DUREES = [{r:0, l:'tant qu’on ne l’enlève pas'}, {r:1, l:'ce round'}, {r:2, l:'2 rounds'},
  {r:3, l:'3 rounds'}, {r:5, l:'5 rounds'}, {r:-1, l:'jusqu’au repos'}];
const texteDuree = r => r === 0 ? '' : r === -1 ? 'jusqu’au repos' : r + (r > 1 ? ' rounds' : ' round');
function ajouterEtat(z, nom, r){
  nom = String(nom || '').replace(/\s+/g, ' ').trim();
  if(!nom){ msgTable('Écris ce qu’il subit.', false); return; }
  majEtatDe(z, av => {
    const l = av.l.filter(x => x.n !== nom).concat([{n:nom.slice(0, 60), r:r == null ? 0 : r}]).slice(-ET_MAX);
    return {l:l, m:av.m};
  });
}
function retirerEtat(z, i){
  majEtatDe(z, av => ({l:av.l.filter((x, j) => j !== i), m:av.m}));
}
/* un nouveau round : ce qui se comptait en rounds descend d'un cran, et ce qui arrive à zéro s'en va.
   Zéro veut dire « tant qu'on ne l'enlève pas », moins un « jusqu'au repos » : ni l'un ni l'autre ne bouge. */
function tournerLesEtats(){
  const av = lesEtats(), tout = {};
  let bouge = false;
  Object.keys(av).forEach(cle => {
    const x = av[cle], l = [];
    x.l.forEach(e => {
      if(e.r > 0){ if(e.r > 1) l.push({n:e.n, r:e.r - 1}); else bouge = true; }
      else l.push({n:e.n, r:e.r});
    });
    if(l.length !== x.l.length) bouge = true;
    if(l.length || x.m) tout[cle] = {l:l, m:x.m};
  });
  if(bouge) poserEtats(tout);
}
/* le repos efface ce qui tenait jusque-là */
function effacerEtatsDuRepos(){
  const tout = JSON.parse(JSON.stringify(lesEtats()));
  Object.keys(tout).forEach(cle => {
    tout[cle].l = tout[cle].l.filter(e => e.r !== -1);
    if(!tout[cle].l.length && !tout[cle].m) delete tout[cle];
  });
  poserEtats(tout);
}

/* ---------- à terre, et ce qui s'ensuit ----------
   Le livre : à 0 PV on tombe, un allié peut stabiliser, et sans personne on meurt avant la fin du combat.
   Ici, comme à D&D : un jet par round tant qu'on est à terre. Trois réussites, on est stabilisé ; trois échecs,
   on meurt. Le 1 naturel relève à 1 PV, le 20 naturel compte double, comme partout ailleurs dans le livre. */
const SEUIL_MORT = 11;
function seuilDeMort(z){
  const c = z.k === 'perso' ? z.x : null;
  const par = c ? d20v((c.car.Constitution || 0) * 2) : 0;
  return Math.max(SEUIL_MORT, par);
}
function jetDeMort(z, main){
  const m = mortDe(z) || {r:0, e:0, f:''};
  if(m.f){ msgTable(z.nom + ' n’a plus de jet à faire.', false); return; }
  const s = seuilDeMort(z);
  if(main != null && (isNaN(main) || main < 1 || main > 20)){ msgTable('Un dé entre 1 et 20.', false); return; }
  const d = main != null ? main : de(20);
  let r = m.r, e = m.e, fin = '', mot = '';
  if(d === 1){
    changer(() => { const w = quiVit(z.id); if(w) coup(w.x, 'pv', 1); });
    fin = 'stable'; r = 3;
    mot = z.nom + ' ouvre les yeux : 1 au d20, il revient à 1 PV.';
  } else if(d === 20){
    e = Math.min(3, e + 2);
    mot = z.nom + ' s’enfonce : 20 au d20, deux échecs.';
  } else if(d < s){
    r = Math.min(3, r + 1);
    mot = z.nom + ' tient : ' + d + ' sous ' + s + '.';
  } else {
    e = Math.min(3, e + 1);
    mot = z.nom + ' faiblit : ' + d + ', il fallait moins de ' + s + '.';
  }
  if(!fin && r >= 3) fin = 'stable';
  if(!fin && e >= 3) fin = 'mort';
  majEtatDe(z, av => ({l:av.l, m:{r:r, e:e, f:fin}}));
  const suite = fin === 'stable' ? ' Il est stabilisé : il ne meurt plus, il dort.'
    : fin === 'mort' ? ' Il meurt.' : ' ' + r + ' réussite' + (r > 1 ? 's' : '') + ', ' + e + ' échec' + (e > 1 ? 's' : '') + '.';
  msgTable(mot + suite, fin !== 'mort');
  changer(() => noterDansSeance('À terre : ' + mot + suite, 'note'));
}
function stabiliser(z){
  majEtatDe(z, av => ({l:av.l, m:{r:3, e:0, f:'stable'}}));
  msgTable(z.nom + ' est stabilisé.', true);
  changer(() => noterDansSeance(z.nom + ' est stabilisé : il ne meurt plus.', 'note'));
}
function relever(z){
  majEtatDe(z, av => ({l:av.l, m:null}));
}
/* le pavé d'un combattant à terre : où en sont ses jets, et de quoi les faire */
function blocMort(z){
  const bas = z.pvMax > 0 && z.pv <= 0;
  const m = mortDe(z);
  if(!bas){ if(m) relever(z); return null; }
  const w = el('div','mort' + (m && m.f === 'mort' ? ' mortfini' : ''));
  const r = m ? m.r : 0, e = m ? m.e : 0, f = m ? m.f : '';
  const t = el('div','ctete');
  t.append(el('b', null, f === 'mort' ? 'Mort' : f === 'stable' ? 'Stabilisé' : 'À terre'));
  t.append(el('span','mini', f ? '' : r + ' réussite' + (r > 1 ? 's' : '') + ' · ' + e + ' échec' + (e > 1 ? 's' : '')));
  t.append(el('span','espace'));
  w.append(t);
  if(!f){
    const g = el('div','tajout');
    const b = el('button','btn ghost xs','Jet de mort'); b.type = 'button'; b.className = 'btn ghost xs jmort';
    b.setAttribute('aria-label', 'Lancer le jet de mort de ' + z.nom);
    b.onclick = () => jetDeMort(z, null);
    const n = el('input'); n.type = 'number'; n.min = '1'; n.max = '20'; n.placeholder = 'd20'; n.style.width = '70px';
    n.setAttribute('aria-label', 'Ton d20, pour son jet de mort');
    n.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); jetDeMort(z, parseInt(n.value, 10)); } };
    const ok = el('button','btn ghost xs','Entrer'); ok.type = 'button';
    ok.onclick = () => jetDeMort(z, parseInt(n.value, 10));
    const st = el('button','btn ghost xs','Stabiliser'); st.type = 'button'; st.className = 'btn ghost xs jstab';
    st.setAttribute('aria-label', 'Stabiliser ' + z.nom + ' : un soin, une fiole, un jet de Médecine');
    st.onclick = () => stabiliser(z);
    g.append(b, n, ok, st);
    w.append(g);
    w.append(el('p','mini', 'Un jet par round, sous ' + seuilDeMort(z) + ' au d20. Trois réussites, il est stabilisé ; trois échecs, il meurt. Un 1 le relève à 1 PV, un 20 compte double. Un soin, une fiole ou un jet de Médecine le stabilisent sans jet.'));
  } else if(f === 'stable'){
    w.append(el('p','mini', 'Il ne meurt plus. Il reste inconscient jusqu’à ce qu’on le soigne ou qu’il se repose.'));
  } else {
    w.append(el('p','mini', 'Trois échecs. Le récit le dit.'));
  }
  return w;
}

/* ---------- les puces d'état, sous un combattant ---------- */
let ETA = {ouvert:'', nom:'', duree:0};
function blocEtats(z){
  const l = etatsDe(z);
  const w = el('div','etats');
  l.forEach((e, i) => {
    const p = el('span','etp', e.n);
    if(e.r) p.append(el('i', null, texteDuree(e.r)));
    const x = el('button', null, '×'); x.type = 'button';
    x.setAttribute('aria-label', 'Retirer « ' + e.n +' » de ' + z.nom);
    x.onclick = () => retirerEtat(z, i);
    p.append(x);
    w.append(p);
  });
  const cle = cleEtat(z);
  const plus = el('button','etplus', ETA.ouvert === cle ? '×' : '+ état'); plus.type = 'button';
  plus.setAttribute('aria-label', 'Poser un état sur ' + z.nom);
  plus.onclick = () => { ETA.ouvert = ETA.ouvert === cle ? '' : cle; ETA.nom = ''; dessinerCombat(true); dessinerEtatSeance(); };
  w.append(plus);
  if(ETA.ouvert === cle){
    const f = el('div','etform');
    const s = el('select'); s.setAttribute('aria-label', 'Un état courant');
    s.add(new Option('un état courant…', ''));
    ETATS_COURANTS.forEach(x => s.add(new Option(x.n + (x.r ? ' · ' + texteDuree(x.r) : ''), x.n + '|' + x.r)));
    s.onchange = () => {
      if(!s.value) return;
      const [n, r] = s.value.split('|');
      ajouterEtat(z, n, +r);
      ETA.ouvert = ''; dessinerCombat(true); dessinerEtatSeance();
    };
    f.append(s);
    const g = el('div','tajout');
    const n = el('input'); n.type = 'text'; n.placeholder = 'ou le tien : aveuglé'; n.style.flex = '1 1 120px';
    n.setAttribute('aria-label', 'Un état à écrire');
    n.value = ETA.nom;
    n.oninput = () => { ETA.nom = n.value; };
    const d = el('select'); d.setAttribute('aria-label', 'Combien de temps');
    DUREES.forEach(x => d.add(new Option(x.l, String(x.r))));
    d.value = String(ETA.duree);
    d.onchange = () => { ETA.duree = +d.value; };
    const ok = el('button','btn ghost xs','Poser'); ok.type = 'button';
    ok.onclick = () => { if(!n.value.trim()) return; ajouterEtat(z, n.value, +d.value); ETA.ouvert = ''; ETA.nom = ''; dessinerCombat(true); dessinerEtatSeance(); };
    n.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); ok.click(); } };
    g.append(n, d, ok);
    f.append(g);
    w.append(f);
  }
  return w;
}
/* le combattant d'un personnage, pour les états et les jets de mort */
const zPerso = c => ({k:'perso', id:c.id, nom:c.nom || 'Sans nom', cote:'nous', x:c, pv:c.pv, pvMax:c.pvMax, cartes:1});

/* ---------- le repos ----------
   Livre II, 6 : court, une heure, 1d6 PV et 1d4 PC ; long, une nuit complète, tout. Le repos ne rend rien
   d'autre : ce qu'une Floraison a fait ne part pas en dormant. */
function ceuxQuiSeReposent(){
  const l = persos().map(c => ({k:'perso', id:c.id, nom:c.nom || 'Sans nom', x:c, pc:true}));
  pnjsAuCombat().concat(pnjs().filter(p => p.pvMax != null && p.statut !== 'mort' && p.combat && p.combat.cote === 'nous'))
    .forEach(p => { if(p.combat && p.combat.cote === 'nous' && !l.some(y => y.id === p.id)) l.push({k:'pnj', id:p.id, nom:p.nom, x:p}); });
  return l;
}
function reposer(long){
  const e = seanceCourante();
  if(!e){ msgTable('Ouvre une séance d’abord.', false); return; }
  if(combatEnCours()){ msgTable('Le combat n’est pas fini : on ne se repose pas en plein dedans.', false); return; }
  const l = ceuxQuiSeReposent();
  if(!l.length){ msgTable('Personne à reposer.', false); return; }
  const mots = [];
  changer(() => {
    l.forEach(q => {
      const x = q.k === 'perso' ? perso(q.id) : unPnj(q.id);
      if(!x) return;
      if(long){
        baseVie(x, x.pvMax, q.pc ? x.pcMax : undefined);
        mots.push(q.nom + ' au plein');
      } else {
        const pv = x.pvMax == null ? 0 : Math.min(de(6), Math.max(0, x.pvMax - x.pv));
        const pc = q.pc && x.pcMax != null ? Math.min(de(4), Math.max(0, x.pcMax - x.pcc)) : 0;
        if(pv) coup(x, 'pv', pv);
        if(pc) coup(x, 'pc', pc);
        mots.push(q.nom + (pv || pc ? ' +' + pv + ' PV' + (q.pc ? ', +' + pc + ' PC' : '') : ' rien à rendre'));
      }
    });
  });
  if(long){
    effacerEtatsDuRepos();
    avancerJours(1);
  }
  const c = laCampagne();
  const titre = long ? 'Repos long, une nuit complète' : 'Repos court, une heure';
  changer(() => noterDansSeance(titre + (long && c ? ' (' + texteDuJour(c) + ')' : '') + ' : ' + mots.join(', ') + '.', 'note'));
  msgTable(titre + ' : ' + mots.join(', ') + '.', true);
  dessiner();
}
/* le pavé du repos et du jour, sous la compagnie */
function blocRepos(){
  const w = el('div','cbloc repos');
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'Le repos'));
  t.append(el('span','espace'));
  w.append(t);
  const g = el('div','tajout');
  const court = el('button','btn ghost sm','Repos court'); court.type = 'button'; court.id = 'repCourt';
  court.setAttribute('aria-label', 'Repos court, une heure : 1d6 PV et 1d4 PC à chacun');
  court.title = 'Une heure : 1d6 PV et 1d4 PC à chacun.';
  court.onclick = () => reposer(false);
  const long = el('button','btn ghost sm','Repos long'); long.type = 'button'; long.id = 'repLong';
  long.setAttribute('aria-label', 'Repos long, une nuit complète : tout, et le jour avance');
  long.title = 'Une nuit : tout revient, le jour avance, et ce qui tenait « jusqu’au repos » s’efface.';
  long.onclick = () => reposer(true);
  g.append(court, long);
  w.append(g);
  return w;
}
/* le jour de jeu, son propre widget : l'âge des PNJ se lit dessus */
function blocJour(){
  const w = el('div','cbloc lejour');
  const c = laCampagne();
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'Le jour'));
  t.append(el('span','espace'));
  if(c) t.append(el('span','jourj', texteDuJour(c)));
  w.append(t);
  if(!c) w.append(el('p','mini', 'Pas encore de campagne.'));
  if(c){
    const d = el('div','tajout');
    const un = el('button','btn ghost xs','+ 1 jour'); un.type = 'button'; un.id = 'repJour';
    un.title = 'Le lendemain.';
    un.onclick = () => { avancerJours(1); dessiner(); };
    const n = el('input'); n.type = 'number'; n.min = '1'; n.max = '3600'; n.placeholder = 'jours'; n.style.width = '58px';
    n.setAttribute('aria-label', 'Combien de jours passent');
    const ok = el('button','btn ghost xs','Passer'); ok.type = 'button'; ok.id = 'repPasser';
    ok.onclick = () => { const v = parseInt(n.value, 10); if(v > 0){ avancerJours(v); n.value = ''; dessiner(); } };
    n.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); ok.click(); } };
    d.append(un, n, ok);
    w.append(d);
    const e2 = el('details','ajoutadv');
    e2.append(el('summary', null, 'Régler le jour'));
    const g2 = el('div','tajout');
    const an = el('input'); an.type = 'number'; an.min = '0'; an.max = '999999'; an.value = String(c.an); an.style.width = '110px';
    an.setAttribute('aria-label', 'L’année de la Réunion');
    const jr = el('input'); jr.type = 'number'; jr.min = '1'; jr.max = String(JOURS_AN); jr.value = String(c.jour); jr.style.width = '80px';
    jr.setAttribute('aria-label', 'Le jour dans l’année');
    const ok2 = el('button','btn ghost xs','Poser'); ok2.type = 'button'; ok2.id = 'repPoser';
    ok2.onclick = () => { poserDate(an.value, jr.value); dessiner(); };
    g2.append(el('span','mini','an'), an, el('span','mini','jour'), jr, ok2);
    e2.append(g2);
    e2.append(el('p','mini', 'Le livre compte les années depuis la Réunion : aujourd’hui, an 14 509. Trois cent soixante jours par an, faute de mois. Chaque campagne a le sien : l’âge des PNJ se lit là-dessus.'));
    w.append(e2);
  }
  return w;
}
