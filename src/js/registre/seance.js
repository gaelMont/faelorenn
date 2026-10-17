/* ============ la séance : le compte rendu, paragraphe par paragraphe ============
   On écrit comme dans le Doc : le MJ raconte, les joueurs font et disent.
   Un jet, des dégâts ou des PV se joignent au paragraphe et s'écrivent entre
   parenthèses, comme « (jet de tir raté) » dans les comptes rendus d'avant. */

/* « personne » : une attaque qu'on lance sans cible. Aucun identifiant ne prend cette forme. */
const SANS_CIBLE = '-aucune-';
const COMPO = {pret:false, qui:{k:'mj', id:'', nom:''}, genre:'narration', panneau:'',
  jet:null, degats:null, vies:[], quoi:'', quoiPar:{}, mod:'0', libreQuoi:'', libreVal:'',
  pvId:'', pvQuoi:'pv', pvN:1, formule:'', cible:'', sorte:'phy', perte:null,
  /* qui frappe et de quelle portée : la carte de combat s'en sert pour dire la distance */
  frappeur:null, portee:null};
let BED = null;              /* {id, texte} : le paragraphe qu'on retouche */
let BLOC_SUPPR = null;
let SEANCE_SUPPR = false;

const GENRES_MJ = [{k:'narration', l:'Narration'}, {k:'scene', l:'Lieu et moment'}, {k:'encadre', l:'Encadré'}];
const GENRES_PERSO = [{k:'fait', l:'Fait'}, {k:'dit', l:'Dit'}];
const SEPARATEUR = '--------------------';

/* ---------- les séances ---------- */
/* celles de la campagne qu'on suit */
function seances(){ return seancesDe(idCourante()); }
/* on suit la dernière séance, sauf si on en a choisi une plus ancienne */
function seanceCourante(){
  const l = seances();
  if(MOI.seanceFixee){ const e = l.find(x => x.id === MOI.seance); if(e) return e; }
  return l[0] || null;
}
/* une séance d'une autre campagne fait passer à cette campagne : le lien d'un PNJ ou d'une mission mène où il faut */
function choisirSeance(id){
  const x = id && T.journal[id];
  const change = !!(x && !x.supprime && !dansCampagne(x) && passerACampagne(idCampagneDe(x)));
  const l = seances();
  MOI.seance = id;
  MOI.seanceFixee = !!(l.length && l[0].id !== id);
  sauverLocal();
  if(change) dessiner();
}
function blocsDe(sid){
  return Object.keys(T.blocs).map(id => T.blocs[id]).filter(b => b && !b.supprime && b.seance === sid)
    .sort((a, b) => (a.ordre - b.ordre) || (a.id < b.id ? -1 : 1));
}
function aujourdhui(){
  const d = new Date(), n = x => (x < 10 ? '0' : '') + x;
  return d.getFullYear() + '-' + n(d.getMonth() + 1) + '-' + n(d.getDate());
}
/* la séance n d'une campagne porte le nom s-n (s-oceane-n dans une autre) : deux joueurs qui l'ouvrent en même temps ouvrent la même */
function nouvelleSeance(){
  const faire = () => {
    const l = seances();
    const n = l.length ? Math.floor(Math.max.apply(null, l.map(e => parseFloat(e.seance) || 0))) + 1 : 1;
    const id = idSeance(n);
    const e = rattacher({id:id, maj:maintenant(), supprime:false, seance:String(n), date:aujourdhui(), titre:'', texte:'', auteur:MOI.joueur || ''});
    MOI.seance = id; MOI.seanceFixee = false;
    BED = null; SEANCE_SUPPR = false;
    changer(() => { T.journal[id] = e; });
    dessinerSeance(true);
    const t = $('coTexte'); if(t) t.focus();
  };
  if(SYNC.poignee && SYNC.etat === 'fichier') lireFichier(true).then(faire, faire);
  else faire();
}
/* s'appelle depuis un changer() : la progression laisse sa trace dans la séance en cours */
function noterDansSeance(texte, type){
  const e = seanceCourante();
  if(!e) return '';
  const b = normBloc({id:nouvelId('b'), maj:maintenant(), seance:e.id, ordre:maintenant(), type:type || 'note',
    texte:texte, auteur:MOI.joueur || ''});
  T.blocs[b.id] = b;
  return b.id;
}
function oublierBloc(id){
  const b = id && T.blocs[id];
  if(b && !b.supprime) T.blocs[id] = Object.assign({}, b, {supprime:true, maj:maintenant()});
}

/* ---------- les mots ---------- */
function nomDe(q){
  if(!q) return '';
  if(q.k === 'perso'){ const c = T.personnages[q.id]; return c && c.nom ? c.nom : (q.nom || 'Quelqu’un'); }
  if(q.k === 'pnj'){ const p = q.id && T.pnj[q.id]; return p && !p.supprime && p.nom ? p.nom : (q.nom || 'Quelqu’un'); }
  return '';
}
function pnjCompo(){ return COMPO.qui.k === 'pnj' ? (unPnj(COMPO.qui.id) || pnjParNom(COMPO.qui.nom)) : null; }
function debutMinuscule(t){
  const s = t.trim(), c = s.charAt(0);
  if(/^(?:(?:il|elle|ils|elles|on|iel|je|nous|vous|tu)(?:\s|$)|j[’'])/i.test(s)) return false;
  return !!c && c === c.toLowerCase() && c !== c.toUpperCase();
}
function sansNomDevant(t, nom){
  if(!nom) return t;
  const m = new RegExp('^\\s*' + nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*', 'i').exec(t);
  return m ? t.slice(m[0].length) : t;
}
function citer(t){
  const s = t.trim();
  if(/^[«“"‹]/.test(s)) return s;
  return '« ' + s + ' »';
}
const majuscule = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const deOu = q => (/^[aeiouyàâäéèêëîïôöûü]/i.test(q) ? 'd’' : 'de ');

/* un « fait » qui commence par un verbe reçoit le nom devant ; sinon il reste tel quel */
function phrase(b){
  if(b.type === 'oracle') return phraseOracle(b);
  const nom = nomDe(b.qui), t = b.type === 'dit' ? sansNomDevant(b.texte.trim(), nom) : b.texte.trim();
  if(b.type === 'dit') return t ? (nom ? nom + ' : ' : '') + citer(t) : nom;
  if(b.type === 'fait') return !t ? nom : (nom && debutMinuscule(t) ? nom + ' ' + t : majuscule(t));
  return b.texte.replace(/\s+$/, '');
}
function texteJet(j){
  if(!j) return '';
  if(j.sans) return j.quoi + (j.note === 'la cible teste' || j.note === 'les cibles testent' ? ', ' + j.note : ', sans jet');
  const chiffres = j.jet + (j.seuil != null ? ', cible ' + j.seuil + (j.mod ? ' (' + (j.mod > 0 ? '+' : '−') + Math.abs(j.mod) + ')' : '') : '');
  if(j.rea){
    const r = j.rea === 'esquive' ? 'esquive' : 'parade';
    if(j.reussite) return r + ' réussie : ' + chiffres;
    if(j.echecCrit) return r + ', échec critique : ' + chiffres + ', les dégâts passent et l’ennemi obtient quelque chose en plus';
    if(j.marge < 4) return r + ' ratée de peu : ' + chiffres + ', pas de dégât mais pas d’attaque au prochain round';
    return r + ' ratée : ' + chiffres + ', les dégâts passent';
  }
  const q = j.quoi ? 'jet ' + deOu(j.quoi) + j.quoi : 'jet';
  if(j.critique && j.reussite) return q + ', réussite critique : ' + chiffres;
  if(j.echecCrit) return q + ', échec critique : ' + chiffres;
  return q + (j.reussite ? ' réussi : ' : ' raté : ') + chiffres;
}
function texteDegats(d){ return d ? d.total + ' dégâts' + (d.txt ? ' au ' + d.txt : '') + (d.double ? ', doublés par le 1' : '') : ''; }
function texteVie(v){
  if(!v) return '';
  return (v.nom || 'Quelqu’un') + (v.delta < 0 ? ' perd ' : ' récupère ') + Math.abs(v.delta) + ' ' + (v.quoi === 'pc' ? 'PC' : 'PV') +
    (v.reste != null ? ', reste ' + v.reste + (v.max != null ? '/' + v.max : '') : '');
}
function joints(b){ return [texteJet(b.jet), texteDegats(b.degats)].concat((b.vies || []).map(texteVie)).filter(Boolean); }
function lignePlate(b){
  const p = sansMarques(phrase(b)), j = joints(b).join(' · ');
  if(!p) return majuscule(j);
  return j ? p + ' (' + j + ')' : p;
}
function couleurJet(b){ return b.jet && !b.jet.sans ? (b.jet.reussite ? ' ok' : ' ko') : ''; }

/* ---------- le récit ---------- */
function corpsEncadre(b){
  const d = el('div','encadre');
  d.append(el('p','sep', SEPARATEUR));
  const gens = gensCitables();
  b.texte.split('\n').forEach((l, i) => {
    const p = el('p');
    const m = i ? /^([^:]{2,40}?) :\s*(.*)$/.exec(l) : null;
    if(!i){ const t = el('b'); t.append(texteRiche(l, gens)); p.append(t); }
    else if(m){ const t = el('b'); t.append(texteRiche(m[1], gens)); p.append(t, document.createTextNode(' : '), texteRiche(m[2], gens)); }
    else p.append(texteRiche(l, gens));
    d.append(p);
  });
  const j = joints(b);
  if(j.length) d.append(el('p','joints' + couleurJet(b), '(' + j.join(' · ') + ')'));
  d.append(el('p','sep', SEPARATEUR));
  return d;
}
function rendreBloc(b){
  const w = el('div','bloc b-' + b.type);
  w.setAttribute('data-bloc', b.id);
  const signe = [b.auteur ? 'écrit par ' + b.auteur : '', b.maj ? 'à ' + heure(b.maj) : ''].filter(Boolean).join(' ');
  if(signe) w.title = signe;
  if(BED && BED.id === b.id && b.type !== 'rencontre') return retoucheBloc(b, w);
  if(b.type === 'encadre') w.append(corpsEncadre(b));
  else if(b.type === 'rencontre') w.append(corpsRencontre(b));
  else if(b.type === 'oracle') w.append(corpsOracle(b));
  else {
    const p = el('p');
    const ph = phrase(b), j = joints(b);
    if(ph) p.append(texteRiche(ph));
    if(j.length){
      if(ph) p.append(document.createTextNode(' '));
      p.append(el('span','joints' + couleurJet(b), ph ? '(' + j.join(' · ') + ')' : majuscule(j.join(' · '))));
    }
    w.append(p);
  }
  w.append(actionsBloc(b));
  return w;
}
function actionsBloc(b){
  const act = el('div','bacts noprint');
  const mk = (txt, lab, fn, cls) => {
    const x = el('button', cls || null, txt); x.type = 'button';
    x.title = lab; x.setAttribute('aria-label', lab);
    x.onclick = fn;
    return x;
  };
  act.append(mk('↑', 'remonter ce paragraphe', () => deplacerBloc(b, -1)));
  act.append(mk('↓', 'descendre ce paragraphe', () => deplacerBloc(b, 1)));
  if(b.type !== 'rencontre') act.append(mk('Modifier', 'modifier ce paragraphe', () => {
    BED = {id:b.id, texte:b.texte};
    dessinerRecit(true);
    const z = $('bedTexte');
    if(z){ z.focus(); z.setSelectionRange(z.value.length, z.value.length); }
  }));
  const arme = BLOC_SUPPR === b.id;
  act.append(mk(arme ? 'Confirmer' : 'Supprimer', arme ? 'confirmer la suppression' : 'supprimer ce paragraphe', () => {
    if(arme){ BLOC_SUPPR = null; changer(() => oublierBloc(b.id)); return; }
    BLOC_SUPPR = b.id; dessinerRecit(true);
    setTimeout(() => { if(BLOC_SUPPR === b.id){ BLOC_SUPPR = null; dessinerRecit(true); } }, 5000);
  }, arme ? 'danger' : null));
  return act;
}
function retoucheBloc(b, w){
  w.classList.add('retouche');
  const z = el('textarea'); z.id = 'bedTexte';
  z.rows = Math.min(10, Math.max(2, BED.texte.split('\n').length + 1));
  z.value = BED.texte;
  z.setAttribute('aria-label', 'Le texte du paragraphe');
  z.oninput = () => { if(BED) BED.texte = z.value; };
  w.append(z);
  brancherMentions(z);
  const j = joints(b);
  if(j.length) w.append(el('p','mini', 'Reste joint : ' + j.join(' · ')));
  const a = el('div','acts'); a.style.marginTop = '6px';
  const ok = el('button','btn sm','Enregistrer'); ok.type = 'button';
  const non = el('button','btn ghost sm','Annuler'); non.type = 'button';
  ok.onclick = () => {
    const v = BED ? BED.texte : b.texte;
    BED = null;
    changer(() => { const x = T.blocs[b.id]; if(x) T.blocs[b.id] = Object.assign({}, x, {texte:v, maj:maintenant()}); });
  };
  non.onclick = () => { BED = null; dessinerRecit(true); };
  z.onkeydown = ev => {
    if(ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)){ ev.preventDefault(); ok.click(); }
    if(ev.key === 'Escape'){ ev.preventDefault(); non.click(); }
  };
  a.append(ok, non, el('span','mini','Ctrl+Entrée enregistre, Échap annule'));
  w.append(a);
  return w;
}
function deplacerBloc(b, sens){
  const l = blocsDe(b.seance), i = l.findIndex(x => x.id === b.id), j = i + sens;
  if(i < 0 || j < 0 || j >= l.length) return;
  const autre = l[j], t = maintenant();
  let oa = l[i].ordre, ob = autre.ordre;
  if(oa === ob) ob = oa + sens;
  changer(() => {
    T.blocs[b.id] = Object.assign({}, l[i], {ordre:ob, maj:t});
    T.blocs[autre.id] = Object.assign({}, autre, {ordre:oa, maj:t});
  });
}

function dateLongue(d){
  if(!d) return '';
  const x = new Date(d + 'T12:00:00');
  return isNaN(x) ? d : x.toLocaleDateString('fr-BE', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
}
function dessinerRecit(force){
  const box = $('seRecit'); if(!box) return;
  if(!force && BED && occupe(box)){ apresSaisie(box, () => dessinerRecit(true)); return; }
  const enBas = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  const haut = box.scrollTop;
  box.innerHTML = '';
  const e = seanceCourante();
  if(!e){ box.append(el('p','vide','Aucune séance pour l’instant. Commence la première : le compte rendu s’écrit ici, paragraphe par paragraphe.')); return; }
  const t = el('div','stitre');
  t.append(el('h3', null, 'Séance ' + (e.seance || '?') + (e.titre ? ' · ' + e.titre : '')));
  if(e.date) t.append(el('p','sdate', dateLongue(e.date)));
  box.append(t);
  const l = blocsDe(e.id);
  if(!l.length) box.append(el('p','vide','La page est blanche. Le MJ ouvre la scène juste en dessous : un lieu, un moment, ce qu’on voit.'));
  l.forEach(b => box.append(rendreBloc(b)));
  box.scrollTop = enBas ? box.scrollHeight : haut;
}

/* ---------- la tête de séance ---------- */
function dessinerTeteSeance(force){
  const box = $('seTete'); if(!box) return;
  if(!force && occupe(box)){ apresSaisie(box, () => dessinerTeteSeance(true)); return; }
  box.innerHTML = '';
  const l = seances(), e = seanceCourante();
  const ligne = el('div','acts');
  if(l.length){
    const s = el('select'); s.id = 'seChoix'; s.setAttribute('aria-label', 'Quelle séance');
    l.forEach(x => s.add(new Option('Séance ' + (x.seance || '?') + (x.titre ? ' · ' + x.titre : ''), x.id)));
    s.value = e ? e.id : '';
    s.onchange = () => { choisirSeance(s.value); BED = null; SEANCE_SUPPR = false; s.blur(); dessinerSeance(true); };
    ligne.append(s);
  }
  const nv = el('button', l.length ? 'btn ghost sm' : 'btn', l.length ? 'Nouvelle séance' : 'Commencer la séance 1');
  nv.type = 'button'; nv.id = 'seNouvelle';
  nv.onclick = nouvelleSeance;
  ligne.append(nv);
  if(e){
    const cp = el('button','btn ghost sm','Copier pour Google Docs'); cp.type = 'button'; cp.id = 'seCopier';
    cp.onclick = () => copierSeance(e, cp);
    const pr = el('button','btn ghost sm','Imprimer'); pr.type = 'button'; pr.id = 'seImprimer';
    pr.onclick = () => {
      document.body.classList.add('imprime-seance');
      window.print();
      setTimeout(() => document.body.classList.remove('imprime-seance'), 1500);
    };
    const sp = el('button','btn ghost sm' + (SEANCE_SUPPR ? ' danger' : ''), SEANCE_SUPPR ? 'Confirmer : la séance disparaît' : 'Supprimer la séance');
    sp.type = 'button'; sp.id = 'seSupprimer';
    sp.onclick = () => {
      if(SEANCE_SUPPR){
        SEANCE_SUPPR = false; BED = null;
        changer(() => { T.journal[e.id] = Object.assign({}, e, {supprime:true, maj:maintenant()}); });
        MOI.seanceFixee = false; sauverLocal();
        dessinerSeance(true);
        return;
      }
      SEANCE_SUPPR = true; dessinerTeteSeance(true);
      setTimeout(() => { if(SEANCE_SUPPR){ SEANCE_SUPPR = false; dessinerTeteSeance(true); } }, 5000);
    };
    ligne.append(cp, pr, el('span','espace'), sp);
  }
  box.append(ligne);
  if(!e) return;
  const id = el('div','ligne4'); id.style.marginTop = '10px';
  const garde = (champ, v) => changer(() => { const x = T.journal[e.id]; if(x) T.journal[e.id] = Object.assign({}, x, {[champ]:v, maj:maintenant()}); });
  const num = el('input'); num.type = 'text'; num.id = 'seNum'; num.value = e.seance; num.inputMode = 'decimal';
  num.onchange = () => garde('seance', num.value.trim());
  const dt = el('input'); dt.type = 'date'; dt.id = 'seDate'; dt.value = e.date;
  dt.onchange = () => garde('date', dt.value);
  const ti = el('input'); ti.type = 'text'; ti.id = 'seTitre'; ti.value = e.titre; ti.placeholder = 'Ronceval, par exemple';
  ti.onchange = () => garde('titre', ti.value);
  [['Séance', num], ['Date', dt], ['Titre', ti]].forEach(([lab, n]) => {
    const w = el('div'); const lb = el('label','lab', lab); lb.htmlFor = n.id; w.append(lb, n); id.append(w);
  });
  box.append(id);
}
/* la compagnie : les PV et les PC de chacun, sous la main pendant la partie */
function dessinerEtatSeance(){
  const box = $('seEtat'); if(!box) return;
  box.innerHTML = '';
  const l = persos();
  box.hidden = !l.length && !seanceCourante();
  poserReposJour(box.hidden ? null : box);
  if(box.hidden) return;
  if(l.length) box.append(el('p','ctitre', 'La compagnie'));
  l.forEach(c => {
    const z0 = zPerso(c);
    const r = el('div','cie' + (MOI.perso === c.id ? ' moi' : '') + (c.pvMax && c.pv <= 0 ? ' tombe' : '') + (estActif(z0) ? ' tour' : ''));
    r.setAttribute('data-cie', c.id);
    r.append(el('b','cnom', c.nom || 'Sans nom'));
    [['pv','PV','pvMax'], ['pcc','PC','pcMax']].forEach(([k, lab, max]) => {
      const j = el('div','cj');
      j.append(el('span','cjt', lab + ' ' + c[k] + '/' + c[max]), barrePv(c[k], c[max]));
      [['−', -1], ['+', 1]].forEach(([sgn, n]) => {
        const b = el('button', null, sgn); b.type = 'button';
        b.setAttribute('aria-label', (n < 0 ? 'Retirer 1 ' : 'Rendre 1 ') + lab + ' à ' + (c.nom || 'ce personnage'));
        b.disabled = (n < 0 && c[k] <= 0) || (n > 0 && c[k] >= c[max]);
        b.onclick = () => changer(() => { const y = perso(c.id); if(y) coup(y, k === 'pcc' ? 'pc' : 'pv', n); });
        j.append(b);
      });
      r.append(j);
    });
    /* ce qu'il subit, et ses jets de mort quand il est tombé */
    const m = blocMort(z0); if(m) r.append(m);
    r.append(blocEtats(z0));
    box.append(r);
  });
  /* ceux qui se battent à nos côtés suivent la compagnie, pas les ennemis */
  if(seanceCourante()) box.append(blocCombattants());
}
/* le repos et le jour ont chacun leur widget ; sans hub, ils retombent sous la compagnie */
function poserReposJour(repli){
  const r = $('seRepos'), j = $('seJour');
  if(r){ r.innerHTML = ''; r.append(blocRepos()); r.hidden = false; }
  else if(repli) repli.append(blocRepos());
  if(j){ j.innerHTML = ''; j.append(blocJour()); j.hidden = false; }
  else if(repli) repli.append(blocJour());
}

/* ---------- la zone d'écriture ---------- */
function persoCompo(){ return COMPO.qui.k === 'perso' ? perso(COMPO.qui.id) : null; }
function genresDe(q){ return q.k === 'mj' ? GENRES_MJ : GENRES_PERSO; }
/* les PV et les PC bougent tout de suite ; le paragraphe garde la trace. Retirer la puce, c'est défaire.
   Chaque changement est un coup daté : deux joueurs qui frappent en même temps, les deux comptent */
function quiVit(id){
  const c = perso(id); if(c) return {x:c, pc:true};
  const a = unAdversaire(id); if(a) return {x:a};
  const p = unPnj(id); if(p && p.pvMax != null) return {x:p};
  return null;
}
function appliquerVie(v){
  const w = quiVit(v.id);
  if(!w || (v.quoi === 'pc' && !w.pc)) return false;
  const e = coup(w.x, v.quoi, v.delta);
  if(e) v.ev = (v.ev || []).concat([e]);
  v.reste = v.quoi === 'pc' ? w.x.pcc : w.x.pv;
  v.max = v.quoi === 'pc' ? w.x.pcMax : w.x.pvMax;
  v.nom = w.x.nom || v.nom;
  return true;
}
function annulerVie(v){
  if(!v.ev || !v.ev.length) return;
  const w = quiVit(v.id);
  if(w) annulerCoups(w.x, v.ev);
  v.ev = [];
}
function retirerVie(v){
  changer(() => annulerVie(v));
  COMPO.vies = COMPO.vies.filter(x => x !== v);
}
function sansAuto(){
  const auto = COMPO.vies.filter(v => v.auto);
  if(!auto.length) return;
  changer(() => auto.forEach(annulerVie));
  COMPO.vies = COMPO.vies.filter(v => !v.auto);
}
function choisirQui(q){
  const avant = persoCompo();
  if(avant) COMPO.quoiPar[avant.id] = COMPO.quoi;
  COMPO.qui = q;
  if(!genresDe(q).some(g => g.k === COMPO.genre)) COMPO.genre = genresDe(q)[0].k;
  const c = persoCompo();
  COMPO.quoi = c ? (COMPO.quoiPar[c.id] || '') : '';
  if(c) COMPO.pvId = c.id;
  COMPO.jet = null; COMPO.perte = null;
  /* qui frappe suit qui agit : sans cela, la carte mesurait encore la distance depuis le précédent */
  const f = (q.k === 'perso' || q.k === 'pnj') ? unCombattant(q.k, q.id) : null;
  COMPO.frappeur = f ? {k:q.k, id:q.id} : null;
  COMPO.portee = null;
  /* des dégâts lancés attendent peut-être une réaction : ils gardent leur cible et leur genre */
  if(!COMPO.degats) COMPO.sorte = 'phy';
  sansAuto();
  dessinerCompositeur(true);
}
function composerPour(c){
  choisirQui({k:'perso', id:c.id, nom:c.nom});
  COMPO.genre = 'fait'; COMPO.panneau = 'jet';
  dessinerCompositeur(true);
  const box = $('seCompo');
  if(box && !box.hidden) box.scrollIntoView({block:'center', behavior:'smooth'});
}

const nettoieOption = l => l.replace(/ \((caractéristique|Pratique)\)$/, '');
function pratiqueDe(c, k){ return c && k.indexOf('prat:') === 0 ? c.pratiques.find(p => 'prat:' + p.n === k) || null : null; }
function seuilCompo(){
  const m = MODS.find(x => x.k === COMPO.mod) || MODS[0];
  const c = persoCompo();
  let val, quoi, rea = '', prat = null, mode = MOI.mode === 'd20' ? 'd20' : 'd100';
  if(c){
    if(COMPO.quoi.indexOf('rea:') === 0){
      rea = COMPO.quoi.slice(4) === 'parade' ? 'parade' : 'esquive';
      quoi = rea === 'parade' ? 'Combat' : 'Acrobatie';
      val = compTotal(c, quoi);
      mode = 'd20';
    } else {
      const o = optionsJet(c).find(x => x.k === COMPO.quoi);
      if(!o) return null;
      prat = pratiqueDe(c, COMPO.quoi);
      if(o.val == null) return {sans:true, quoi:nettoieOption(o.l), prat:prat};
      val = o.val; quoi = nettoieOption(o.l);
    }
  } else if(COMPO.quoi.indexOf('carp:') === 0 && pnjCompo()){
    /* un PNJ qui se bat a ses sept caractéristiques : la table lance pour lui comme pour un personnage */
    const x = COMPO.quoi.slice(5), v = valCarPnj(pnjCompo(), x);
    if(v == null) return null;
    val = v; quoi = x;
  } else if(COMPO.quoi.indexOf('val:') === 0 && pnjCompo()){
    const v = pnjCompo().valeurs.find(x => 'val:' + x.n === COMPO.quoi);
    if(!v) return null;
    val = v.v; quoi = v.n;
  } else {
    val = parseInt(COMPO.libreVal, 10);
    if(isNaN(val) || val < 1) return null;
    quoi = COMPO.libreQuoi.trim();
  }
  const cent = mode === 'd100', mod = cent ? m.d100 : m.d20;
  return {val:val, seuil:Math.max(1, (cent ? val : d20v(val)) + mod), quoi:quoi, mode:mode, mod:mod, rea:rea, prat:prat};
}
function noteReaction(r){
  if(r.reussite) return 'Aucun dégât. Tu agis normalement au prochain round.';
  if(r.echecCrit) return 'Tu prends les dégâts, et l’ennemi obtient quelque chose en plus.';
  if(r.marge < 4) return 'Aucun dégât, mais tu as tout donné : tu ne peux pas attaquer au prochain round.';
  return 'Tu prends les dégâts.';
}
/* un échec consomme le PC : la Pratique se paie dès qu'elle part, et ça se voit tout de suite sur la fiche */
function payerPratique(c, p){
  sansAuto();
  if(!(c && p && p.pc > 0)) return;
  const v = {id:c.id, nom:c.nom || 'Sans nom', delta:-p.pc, quoi:'pc', auto:true};
  changer(() => appliquerVie(v));
  COMPO.vies.push(v);
}
function jeterCompo(main){
  const bl = blocageCompo();
  if(bl){ msgTable(bl, false); return; }
  const s = seuilCompo();
  const c = persoCompo();
  if(!s){ msgTable(c ? 'Choisis ce qu’il tente.' : 'Écris la valeur à battre, sur 100.', false); return; }
  if(s.sans){
    COMPO.jet = normJetBloc({id:nouvelId('j'), quoi:s.quoi, sans:true, reussite:true, note:s.prat ? s.prat.j : ''});
    payerPratique(c, s.prat);
    dessinerCompositeur(true);
    return;
  }
  const max = s.mode === 'd100' ? 100 : 20;
  if(main === 0 && max === 100) main = 100;   /* les deux d10 qui montrent 00 */
  if(main != null && (isNaN(main) || main < 1 || main > max)){ msgTable('Un dé entre 1 et ' + max + (max === 100 ? ', ou 00 pour cent' : '') + '.', false); return; }
  const jet = main != null ? main : de(max);
  const r = resoudre(jet, s.seuil, s.mode);
  COMPO.jet = normJetBloc({id:nouvelId('j'), quoi:s.quoi, mode:s.mode, jet:jet, seuil:s.seuil,
    reussite:r.reussite, critique:r.critique, echecCrit:r.echecCrit, marge:r.marge,
    note:s.rea ? noteReaction(r) : r.bande, main:main != null, val:s.val, mod:s.mod, rea:s.rea});
  payerPratique(c, s.prat);
  const j = COMPO.jet, qui = nomDe(COMPO.qui) || MOI.joueur || 'MJ';
  changer(() => {
    ajouterJet({id:j.id, t:maintenant(), auteur:MOI.joueur || 'quelqu’un', perso:qui,
      quoi:(j.rea ? (j.rea === 'esquive' ? 'esquive, ' : 'parade, ') : '') + (j.quoi || 'jet'), formule:'', jet:j.jet, seuil:j.seuil,
      mode:j.mode, reussite:j.reussite, note:j.note, main:j.main});
  });
  dessinerCompositeur(true);
}
/* le dé de l'arme, plus le mod : Force, sauf l'arme légère et l'arbalète qui passent par la Dextérité */
function formuleArme(c, a){
  const m = /(\d*)\s*d\s*(\d+)\s*(?:([+\-])\s*(\d+))?/i.exec(a.de || '');
  if(!m) return null;
  const leger = +m[2] === 4 || /arbal/i.test(a.nom + ' ' + (a.notes || ''));
  const car = leger ? 'Dextérité' : 'Force';
  const bonus = (m[3] ? (m[3] === '-' ? -1 : 1) * (+m[4]) : 0) + Math.floor((c.car[car] || 0) / 5);
  return (m[1] || '1') + 'd' + m[2] + (bonus ? (bonus > 0 ? '+' + bonus : String(bonus)) : '');
}
/* les dégâts : lancés ici, ou le total des dés lancés sur la table */
function degatsCompo(f, main){
  const bl = blocageCompo();
  if(bl){ msgTable(bl, false); return; }
  const double = !!(COMPO.jet && COMPO.jet.critique && COMPO.jet.mode === 'd20' && !COMPO.jet.rea);
  let r;
  if(main != null){
    if(isNaN(main) || main < 0){ msgTable('Écris le total des dés de dégâts.', false); return; }
    const m = /^\s*(\d*)\s*d\s*(\d+)\s*(?:([+\-])\s*(\d+))?\s*$/i.exec(String(f || ''));
    r = {txt:m ? (m[1] || '1') + 'd' + m[2] + (m[3] ? m[3] + m[4] : '') : '', total:main, des:'dés de la table', bonus:0};
  } else {
    r = lancerFormule(f);
    if(!r){ msgTable('Écris les dés comme dans le livre : d8, 2d6, d6+2.', false); return; }
    r.des = r.des.join(' + ') + (r.bonus ? (r.bonus > 0 ? ' + ' + r.bonus : ' − ' + (-r.bonus)) : '');
  }
  const des = r.des;
  COMPO.degats = {txt:r.txt, total:r.total * (double ? 2 : 1), des:des, double:double, main:main != null};
  COMPO.formule = f; COMPO.pvN = COMPO.degats.total; COMPO.perte = null;
  const qui = nomDe(COMPO.qui) || MOI.joueur || 'MJ';
  changer(() => {
    ajouterJet({id:nouvelId('j'), t:maintenant(), auteur:MOI.joueur || 'quelqu’un', perso:qui,
      quoi:'dégâts' + (r.txt ? ' ' + r.txt : '') + (double ? ', doublés' : ''), formule:r.txt, jet:COMPO.degats.total, seuil:null,
      mode:'des', reussite:false, note:des, main:main != null});
  });
  dessinerCompositeur(true);
}
function ciblePv(id){
  const c = perso(id); if(c) return c;
  const a = unAdversaire(id); if(a) return a;
  const p = unPnj(id); return p && p.pvMax != null ? p : null;
}
function poserVie(sens){
  const c = ciblePv(COMPO.pvId); if(!c) return;
  if(!perso(c.id) && COMPO.pvQuoi === 'pc'){ msgTable('Seuls les personnages ont des PC suivis ici.', false); return; }
  const n = Math.max(1, parseInt(COMPO.pvN, 10) || 1) * sens;
  const v = {id:c.id, nom:c.nom || 'Sans nom', delta:n, quoi:COMPO.pvQuoi};
  changer(() => appliquerVie(v));
  const x = COMPO.vies.find(y => y.id === c.id && y.quoi === COMPO.pvQuoi && !y.auto && !y.deg);
  if(x){ x.delta += v.delta; x.ev = (x.ev || []).concat(v.ev || []); x.reste = v.reste; x.max = v.max; if(!x.delta) COMPO.vies = COMPO.vies.filter(y => y !== x); }
  else COMPO.vies.push(v);
  dessinerCompositeur(true);
}

/* ---------- des dégâts à une cible : réduction d'abord, contrainte du corps ensuite, arrondi vers le bas ---------- */
const SORTES = [
  {k:'phy', l:'Physique : arme, coup, attaque de rang', red:true, mag:false},
  {k:'mat', l:'Magique qui envoie de la matière : Sève, eau, pierre, vent, Mue', red:true, mag:true},
  {k:'nrj', l:'Magique qui traverse l’armure : onde, ombre, sacré', red:false, mag:true},
  {k:'feu', l:'Le feu, qui traverse l’armure', red:false, mag:true}
];
function ciblesDegats(){
  const out = [];
  adversairesEnCombat().filter(a => !aTerre(a)).forEach(a => out.push({id:a.id, nom:a.nom, red:a.red, pv:a.pv, pvMax:a.pvMax, grp:'En face', a:a}));
  /* sa réduction : son armure naturelle, plus ce qu'il porte (Registre des Marchefleurs) */
  persos().forEach(c => out.push({id:c.id, nom:c.nom || 'Sans nom', red:redDe(c), pv:c.pv, pvMax:c.pvMax, grp:'Les personnages', c:c}));
  pnjs().filter(p => p.pvMax != null && p.statut !== 'mort').forEach(p => out.push({id:p.id, nom:p.nom,
    red:p.combat ? p.combat.red : 0, pv:p.pv == null ? p.pvMax : p.pv, pvMax:p.pvMax, grp:'Les PNJ qui se battent'}));
  return out;
}
/* la contrainte du corps : celle du peuple pour un personnage, « craint le feu » pour un adversaire */
function multiplicateur(x, sorte){
  const s = SORTES.find(y => y.k === sorte) || SORTES[0];
  if(x && x.a){
    const feu = x.a.tr.indexOf('craintfeu') >= 0 || /craint le feu|feu compte double/i.test(x.a.traits + ' ' + x.a.p);
    return sorte === 'feu' && feu ? {k:2, pourquoi:'le feu compte double contre lui'} : {k:1, pourquoi:''};
  }
  const c = x && x.c;
  if(!c) return {k:1, pourquoi:''};
  const t = String(c.contrainte || '').toLowerCase();
  if(sorte === 'feu' && /feu compte double/.test(t)) return {k:2, pourquoi:'le feu compte double'};
  if(s.mag && /(magiques|d.une pratique)[^.]*une fois et demie/.test(t)) return {k:1.5, pourquoi:'dégâts magiques'};
  if(!s.mag && /physiques[^.]*une fois et demie/.test(t)) return {k:1.5, pourquoi:'dégâts physiques'};
  return {k:1, pourquoi:''};
}
/* le genre de dégâts d'une Pratique : celui de son domaine */
function sortePratique(c, p){
  const d = DOMAINES.find(x => x.k === (domaineCle(p && p.dom) || domaineCle(c && c.domaine)));
  return d ? d.sorte : 'mat';
}
/* qui prend les dégâts, si personne n'est choisi : celui d'en face quand un personnage frappe,
   le personnage lui-même quand sa réaction a raté, un personnage quand c'est le MJ qui frappe */
function cibleParDefaut(l){
  const j = COMPO.jet, moi = COMPO.qui.k === 'perso' ? COMPO.qui.id : '';
  if(moi && j && j.rea && l.some(x => x.id === moi)) return moi;
  if(COMPO.qui.k !== 'mj'){ const f = l.find(x => x.grp === 'En face'); if(f) return f.id; }
  const pj = l.find(x => x.id === MOI.perso) || l.find(x => x.grp === 'Les personnages');
  return (pj || l[0]).id;
}
/* la cible retenue : celle qu'on a choisie, « personne » quand on l'a dit, sinon celle qu'on propose */
function cibleActuelle(l){
  if(COMPO.cible === SANS_CIBLE) return SANS_CIBLE;
  if(!l.length) return SANS_CIBLE;
  return l.some(x => x.id === COMPO.cible) ? COMPO.cible : cibleParDefaut(l);
}
function calculPerte(){
  const d = COMPO.degats; if(!d) return null;
  const l = ciblesDegats(), id = cibleActuelle(l);
  const cible = l.find(x => x.id === id);
  if(!cible) return null;
  const s = SORTES.find(x => x.k === COMPO.sorte) || SORTES[0];
  const red = s.red ? cible.red : 0;
  const m = multiplicateur(cible, s.k);
  const perte = Math.floor(Math.max(0, d.total - red) * m.k);
  const bouts = [d.total + ' dégâts'];
  if(red) bouts.push('moins ' + red + ' de réduction');
  if(m.k !== 1) bouts.push('fois ' + (m.k === 1.5 ? 'une fois et demie' : m.k) + ' (' + m.pourquoi + ')');
  return {cible:cible, perte:perte, calcul:bouts.join(', ') + ' : ' + perte + ' PV'};
}
function appliquerDegats(n){
  const bl = blocageCompo();
  if(bl){ msgTable(bl, false); return; }
  const k = calculPerte();
  if(!k){ msgTable(COMPO.degats ? 'Choisis une cible : sans elle, les dégâts ne vont nulle part.' : 'Lance d’abord les dégâts.', false); return; }
  const perte = Math.max(0, parseInt(n, 10));
  if(isNaN(perte)){ msgTable('Écris combien de PV il perd.', false); return; }
  COMPO.perte = null;
  if(!perte){ msgTable(k.cible.nom + ' ne perd rien : ' + k.calcul + '.', true); dessinerCompositeur(true); return; }
  const v = {id:k.cible.id, nom:k.cible.nom, delta:-perte, quoi:'pv', deg:true};
  changer(() => appliquerVie(v));
  COMPO.vies.push(v);
  if(v.reste === 0) msgTable(v.nom + (k.cible.c ? ' tombe, inconscient.' : ' est à terre.'), true);
  dessinerCompositeur(true);
}

function ajouterDepuisCompo(){
  const e = seanceCourante();
  if(!e){ msgTable('Commence d’abord une séance.', false); return; }
  const z = $('coTexte'), texte = z.value.replace(/\s+$/, '');
  if(!texte.trim() && !COMPO.jet && !COMPO.degats && !COMPO.vies.length){ msgTable('Écris quelque chose, ou joins un jet.', false); return; }
  const q = Object.assign({}, COMPO.qui, {nom:nomDe(COMPO.qui)});
  const b = normBloc({id:nouvelId('b'), maj:maintenant(), seance:e.id, ordre:maintenant(), type:COMPO.genre,
    qui:q, texte:texte, auteur:MOI.joueur || '', jet:COMPO.jet, degats:COMPO.degats,
    vies:COMPO.vies.map(v => ({id:v.id, nom:v.nom, delta:v.delta, quoi:v.quoi, reste:v.reste, max:v.max}))});
  let creee = null;
  changer(() => {
    /* un PNJ qui parle ou agit a sa fiche : on la crée s'il n'en a pas */
    if(b.qui.k === 'pnj'){
      let f = unPnj(b.qui.id) || pnjParNom(b.qui.nom);
      if(!f && !nomAnonyme(b.qui.nom)){ f = creerPnj(b.qui.nom, e.id); creee = f; }
      if(f){ b.qui.id = f.id; b.qui.nom = f.nom; }
    }
    /* les PV et les PC ont déjà bougé au moment du jet ou des dégâts : le paragraphe en garde la trace */
    T.blocs[b.id] = b;
  });
  if(creee){ COMPO.qui = {k:'pnj', id:creee.id, nom:creee.nom}; msgTable('Fiche de ' + creee.nom + ' créée, dans le Registre des Visages.', true); }
  z.value = '';
  try{ localStorage.removeItem('faelorenn.table.brouillon'); }catch(e){}
  COMPO.jet = null; COMPO.degats = null; COMPO.vies = []; COMPO.perte = null; COMPO.cible = '';
  dessinerCompositeur(true);
  z.focus();
  const r = $('seRecit'); if(r) r.scrollTop = r.scrollHeight;
}

const PLACEHOLDERS = {
  narration:'Ce que raconte le MJ. « / » puis un nom cite quelqu’un, « -- » puis un nom cite un lieu. Entrée ajoute le paragraphe, Maj+Entrée va à la ligne.',
  scene:'Havre de Vaurenne, début de matinée.',
  encadre:'Première ligne : le titre. Puis une ligne par information, « Paie : 5 ors ». Ctrl+Entrée ajoute.',
  fait:'Ce qu’il fait. Commence par un verbe, « attrape sa lance et la jette sur le chien », et son nom se met devant.',
  dit:'Ce qu’il dit. Les guillemets se mettent tout seuls.'
};
function dessinerCompositeur(force){
  const box = $('seCompo'); if(!box) return;
  const e = seanceCourante();
  box.hidden = !e;
  if(!e) return;
  if(!COMPO.pret){
    COMPO.pret = true;
    const c = MOI.perso ? perso(MOI.perso) : null;
    if(c){ COMPO.qui = {k:'perso', id:c.id, nom:c.nom}; COMPO.genre = 'fait'; COMPO.pvId = c.id; }
  }
  if(COMPO.qui.k === 'perso' && !persoCompo()){
    COMPO.qui = {k:'mj', id:'', nom:''}; COMPO.genre = 'narration'; COMPO.quoi = ''; COMPO.jet = null; sansAuto();
  }
  const focus = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : '';

  /* qui */
  const lq = $('coQui');
  if(force || !occupe(lq)){
    lq.innerHTML = '';
    const chip = (lab, q, actif) => {
      const b = el('button', null, lab); b.type = 'button';
      b.setAttribute('aria-pressed', actif ? 'true' : 'false');
      b.onclick = () => choisirQui(q);
      return b;
    };
    lq.append(chip('MJ', {k:'mj', id:'', nom:''}, COMPO.qui.k === 'mj'));
    persos().forEach(c => lq.append(chip(c.nom || 'Sans nom', {k:'perso', id:c.id, nom:c.nom}, COMPO.qui.k === 'perso' && COMPO.qui.id === c.id)));
    /* ceux qui se battent à nos côtés se choisissent comme les personnages */
    const allies = pnjsAuCombat().filter(p => p.combat.cote === 'nous');
    allies.forEach(p => lq.append(chip(p.nom || 'Sans nom', {k:'pnj', id:p.id, nom:p.nom}, COMPO.qui.k === 'pnj' && COMPO.qui.id === p.id)));
    const ailleurs = COMPO.qui.k === 'pnj' && !allies.some(p => p.id === COMPO.qui.id);
    const ch = el('button', ailleurs ? 'actif' : null, ailleurs ? nomDe(COMPO.qui) : 'Un PNJ ?'); ch.type = 'button'; ch.id = 'coPnjCherche';
    ch.setAttribute('aria-pressed', ailleurs ? 'true' : 'false');
    ch.setAttribute('aria-label', 'Choisir un visage qui parle ou qui agit');
    ch.onclick = () => ouvrirChoixPnj();
    lq.append(ch);
  }

  /* comment */
  const lg = $('coGenre');
  lg.innerHTML = '';
  genresDe(COMPO.qui).forEach(g => {
    const b = el('button', null, g.l); b.type = 'button';
    b.setAttribute('aria-pressed', COMPO.genre === g.k ? 'true' : 'false');
    b.onclick = () => { COMPO.genre = g.k; dessinerCompositeur(true); $('coTexte').focus(); };
    lg.append(b);
  });

  $('coTexte').placeholder = PLACEHOLDERS[COMPO.genre] || '';

  /* le panneau vit dans la fenêtre « Action » : s'il doit s'ouvrir, c'est elle qui s'ouvre */
  if(typeof ouvrirAction === 'function' && $('hbBarre')){
    if(COMPO.panneau && HUB.fen !== 'action'){ ouvrirAction(COMPO.panneau); return; }
    if(!COMPO.panneau && HUB.fen === 'action') fermerFen();
  }
  dessinerBarre();
  /* le panneau ouvert */
  const pn = $('coPanneau');
  if(force || !occupe(pn)){
    pn.innerHTML = '';
    if(COMPO.panneau === 'jet') pn.append(panneauJet());
    if(COMPO.panneau === 'pv') pn.append(panneauPv());
    majSeuilCompo();
  }
  majApercuCompo();
  if(force && focus && $(focus) && document.activeElement !== $(focus)) $(focus).focus();
}

/* les dés : le site les lance, ou l'on écrit ceux qu'on a lancés sur la table. Les deux sont toujours là */
function panneauJet(){
  const p = el('div','panneau');
  const g = el('div','jetform');
  const c = persoCompo();
  if(c){
    const s = el('select'); s.id = 'coQuoi';
    s.add(new Option('Ce qu’il tente…', ''));
    const grp = (lab, liste) => {
      if(!liste.length) return;
      const og = el('optgroup'); og.label = lab;
      liste.forEach(o => og.append(new Option(o.l, o.k)));
      s.append(og);
    };
    const opts = optionsJet(c);
    grp('Compétences', opts.filter(o => o.k.indexOf('comp:') === 0).map(o => ({k:o.k, l:o.l + ' · ' + o.val})));
    grp('Pratiques', opts.filter(o => o.k.indexOf('prat:') === 0).map(o => {
      const pr = pratiqueDe(c, o.k);
      const cout = pr ? (pr.base ? ' · de base' : pr.pc ? ' · ' + pr.pc + ' PC' : pr.pct ? ' · ' + pr.pct : '') : '';
      return {k:o.k, l:nettoieOption(o.l) + (o.val == null ? ' · ne se lance pas' : ' · ' + o.val) + cout};
    }));
    grp('Réactions, en combat', [
      {k:'rea:esquive', l:'Esquiver, sous Acrobatie · ' + compTotal(c, 'Acrobatie')},
      {k:'rea:parade', l:'Parer, sous Combat · ' + compTotal(c, 'Combat')}
    ]);
    grp('Caractéristiques, fois deux', opts.filter(o => o.k.indexOf('car:') === 0).map(o => ({k:o.k, l:nettoieOption(o.l) + ' · ' + o.val})));
    s.value = COMPO.quoi;
    if(s.value !== COMPO.quoi){ COMPO.quoi = ''; s.value = ''; }
    s.onchange = () => {
      COMPO.quoi = s.value; COMPO.jet = null; COMPO.perte = null; sansAuto();
      const pr = pratiqueDe(c, s.value);
      if(!COMPO.degats && s.value.indexOf('rea:') !== 0){
        const m = pr && /(\d*d\d+(?:\s*[+\-]\s*\d+)?)/i.exec(pr.d);
        if(m) COMPO.formule = m[1].replace(/\s+/g, '');
        COMPO.sorte = pr ? sortePratique(c, pr) : 'phy';
      }
      /* ce qu'il tente dit aussi jusqu'où ça porte : la carte prévient quand la cible est trop loin */
      if(s.value.indexOf('rea:') !== 0){
        COMPO.frappeur = {k:'perso', id:c.id};
        COMPO.portee = porteeDeQuoi(c, s.value, pr);
      }
      dessinerCompositeur(true);
    };
    champ(g, 'Ce qu’il tente', s);
  } else {
    const fp = pnjCompo();
    const sesCars = !!(fp && fp.combat && fp.combat.car);
    if(fp && (fp.valeurs.length || sesCars)){
      const s = el('select'); s.id = 'coQuoi';
      s.add(new Option('Une valeur à donner…', ''));
      if(sesCars){
        const og = el('optgroup');
        og.label = 'Ses caractéristiques, fois deux' + (fp.combat.bonus ? ' plus ' + fp.combat.bonus : '');
        CARS.forEach(x => og.append(new Option(ABBR[x] + ' ' + fp.combat.car[x] + ' · ' + valCarPnj(fp, x), 'carp:' + x)));
        s.append(og);
      }
      if(fp.valeurs.length){
        const og = el('optgroup'); og.label = 'Ce que sa fiche écrit';
        fp.valeurs.forEach(v => og.append(new Option(v.n + ' · ' + v.v, 'val:' + v.n)));
        s.append(og);
      }
      s.value = COMPO.quoi;
      if(s.value !== COMPO.quoi){ COMPO.quoi = ''; s.value = ''; }
      s.onchange = () => { COMPO.quoi = s.value; COMPO.jet = null; dessinerCompositeur(true); };
      champ(g, 'Ce qu’il tente, d’après sa fiche', s);
    }
    if(!(fp && /^(?:val|carp):/.test(COMPO.quoi))){
      const q = el('input'); q.type = 'text'; q.id = 'coLibreQuoi'; q.value = COMPO.libreQuoi; q.placeholder = 'Perception du chien';
      q.oninput = () => { COMPO.libreQuoi = q.value; };
      champ(g, 'Ce qu’on tente', q);
      const v = el('input'); v.type = 'number'; v.id = 'coLibreVal'; v.value = COMPO.libreVal; v.placeholder = '30'; v.min = '1'; v.inputMode = 'numeric';
      v.oninput = () => { COMPO.libreVal = v.value; majSeuilCompo(); };
      champ(g, 'Valeur, sur 100', v);
    }
  }
  const s0 = seuilCompo();
  const m = el('select'); m.id = 'coMode';
  [['d100','Hors combat, d100'], ['d20','En combat, d20']].forEach(([k, l]) => m.add(new Option(l, k)));
  m.value = s0 && s0.rea ? 'd20' : (MOI.mode === 'd20' ? 'd20' : 'd100');
  m.disabled = !!(s0 && s0.rea);
  m.onchange = () => { MOI.mode = m.value; sauverLocal(); COMPO.jet = null; sansAuto(); dessinerCompositeur(true); };
  champ(g, 'Où', m);
  const md = el('select'); md.id = 'coMod';
  MODS.forEach(x => md.add(new Option(x.l, x.k)));
  md.value = COMPO.mod;
  md.onchange = () => { COMPO.mod = md.value; COMPO.jet = null; sansAuto(); dessinerCompositeur(true); };
  champ(g, 'Modificateur', md);
  p.append(g);

  /* le jet : le site le lance, ou on écrit le dé lancé sur la table. Hors de son tour, rien ne part */
  const a = el('div','acts jetdes'); a.style.marginTop = '10px';
  const bloc = typeof blocageCompo === 'function' ? blocageCompo() : '';
  const sans = !!(s0 && s0.sans);
  const faces = s0 && !sans ? (s0.mode === 'd100' ? 100 : 20) : (MOI.mode === 'd20' ? 20 : 100);
  if(sans){
    const u = el('button','btn sm','Utiliser'); u.type = 'button'; u.id = 'coLancer';
    u.disabled = !!bloc;
    u.onclick = () => jeterCompo(null);
    a.append(u);
  } else {
    const lancer = el('button','btn sm','Lancer le d' + faces); lancer.type = 'button'; lancer.id = 'coLancer';
    lancer.disabled = !!bloc;
    lancer.onclick = () => jeterCompo(null);
    const main = el('input'); main.type = 'number'; main.id = 'coMain'; main.min = faces === 100 ? '0' : '1'; main.max = String(faces);
    main.placeholder = '1 à ' + faces; main.inputMode = 'numeric'; main.style.width = '96px';
    if(faces === 100) main.title = '00 compte pour 100';
    main.setAttribute('aria-label', 'Ton d' + faces + ', lancé sur la table');
    const entrer = el('button','btn ghost sm','Entrer'); entrer.type = 'button'; entrer.id = 'coEntrer';
    entrer.setAttribute('aria-label', 'Entrer ton d' + faces);
    entrer.disabled = !!bloc; main.disabled = !!bloc;
    const go = () => jeterCompo(parseInt(main.value, 10));
    entrer.onclick = go;
    main.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); go(); } };
    /* sa case et son bouton restent ensemble quand la ligne passe à la suivante */
    const grp = el('span','amain'); grp.append(el('span','mini ou', 'ou ton d' + faces + ' :'), main, entrer);
    a.append(lancer, grp);
  }
  const indice = el('span','mini'); indice.id = 'coSeuil';
  a.append(indice);
  p.append(a);
  if(bloc) p.append(el('p','mini cobloc', bloc + ' Il ne lance rien avant que ce soit à lui : « Au suivant », dans le tour de table. Sa parade et son esquive, elles, se lancent quand l’ennemi frappe.'));
  if(COMPO.jet && !COMPO.jet.sans){
    const j = COMPO.jet;
    const r = el('div','verdict' + (j.reussite ? ' ok' : ' ko'));
    r.append(el('b', null, j.jet + ' sur ' + (j.mode === 'd100' ? '100' : '20')),
      document.createTextNode(' · ' + (j.reussite ? (j.critique ? 'réussite critique' : 'réussi') : (j.echecCrit ? 'échec critique' : 'raté')) + (j.note ? ' · ' + j.note : '')));
    p.append(r);
  }

  /* les dégâts : lancés ici, ou le total des dés de la table */
  const d = el('div','acts degats'); d.style.marginTop = '10px';
  d.append(el('span','lab', 'Dégâts'));
  const f = el('input'); f.type = 'text'; f.id = 'coDegats'; f.placeholder = 'd8+3, 2d6'; f.style.width = '130px'; f.value = COMPO.formule;
  f.setAttribute('aria-label', 'Les dés de dégâts');
  f.oninput = () => { COMPO.formule = f.value; };
  d.append(f);
  if(c && c.armes.length){
    const arme = el('select'); arme.id = 'coArme'; arme.setAttribute('aria-label', 'Prendre les dés d’une arme');
    arme.add(new Option('ou une arme…', ''));
    c.armes.forEach((x, i) => { const fx = formuleArme(c, x); if(fx) arme.add(new Option(x.nom + ' · ' + fx, String(i))); });
    arme.onchange = () => { const x = c.armes[+arme.value]; const fx = x && formuleArme(c, x); if(fx){ f.value = fx; COMPO.formule = fx; COMPO.sorte = 'phy'; COMPO.perte = null;
      COMPO.frappeur = {k:'perso', id:c.id}; COMPO.portee = porteeArme(x); dessinerCompositeur(true); } };
    d.append(arme);
  }
  const bd = el('button','btn ghost sm','Lancer les dégâts'); bd.type = 'button'; bd.id = 'coLancerDegats';
  bd.disabled = !!bloc;
  bd.onclick = () => degatsCompo(f.value);
  f.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); degatsCompo(f.value); } };
  const t = el('input'); t.type = 'number'; t.id = 'coDegatsMain'; t.min = '0'; t.placeholder = 'total'; t.style.width = '80px'; t.inputMode = 'numeric';
  t.setAttribute('aria-label', 'Le total de tes dés de dégâts, lancés sur la table');
  const bt = el('button','btn ghost sm','Entrer'); bt.type = 'button'; bt.id = 'coEntrerDegats';
  bt.setAttribute('aria-label', 'Entrer le total de tes dégâts');
  bt.disabled = !!bloc; t.disabled = !!bloc;
  const go = () => degatsCompo(f.value, parseInt(t.value, 10));
  bt.onclick = go;
  t.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); go(); } };
  const grp = el('span','amain'); grp.append(el('span','mini ou', 'ou ton total :'), t, bt);
  d.append(bd, grp);
  p.append(d);
  if(COMPO.degats) p.append(panneauAppliquer());
  return p;
}
/* les dégâts trouvent leur cible : la réduction, la contrainte, et les PV bougent tout de suite */
function panneauAppliquer(){
  const z = el('div','appli');
  const l = ciblesDegats();
  if(!l.length){ z.append(el('p','mini','Personne à qui appliquer ces dégâts : les personnages, ceux d’en face et les PNJ qui se battent apparaissent ici.')); return z; }
  const actuelle = cibleActuelle(l);
  const g = el('div','jetform');
  const sc = el('select'); sc.id = 'coCible';
  /* une attaque peut partir sans cible : une Pratique de zone, un coup dans le vide, un ordre crié */
  sc.add(new Option('personne (pas de cible)', SANS_CIBLE));
  const grps = {};
  l.forEach(x => {
    let og = grps[x.grp];
    if(!og){ og = grps[x.grp] = el('optgroup'); og.label = x.grp; sc.append(og); }
    og.append(new Option(x.nom + ' · ' + x.pv + '/' + x.pvMax + ' PV' + (x.red ? ' · réduction ' + x.red : ''), x.id));
  });
  sc.value = actuelle;
  sc.onchange = () => { COMPO.cible = sc.value; COMPO.perte = null; dessinerCompositeur(true); dessinerCombat(true); };
  champ(g, 'À qui', sc);
  const so = el('select'); so.id = 'coSorte';
  SORTES.forEach(x => so.add(new Option(x.l, x.k)));
  so.value = COMPO.sorte;
  so.onchange = () => { COMPO.sorte = so.value; COMPO.perte = null; dessinerCompositeur(true); };
  champ(g, 'Quels dégâts', so);
  const k = calculPerte(), j0 = COMPO.jet;
  const rien = !!(j0 && ((j0.rea && k && k.cible.id === COMPO.qui.id && (j0.reussite || (!j0.echecCrit && j0.marge < 4))) || (!j0.rea && !j0.sans && !j0.reussite)));
  const n = el('input'); n.type = 'number'; n.id = 'coPerte'; n.min = '0'; n.inputMode = 'numeric';
  n.value = String(COMPO.perte != null ? COMPO.perte : k && !rien ? k.perte : 0);
  n.oninput = () => { COMPO.perte = n.value === '' ? null : Math.max(0, parseInt(n.value, 10) || 0); };
  champ(g, 'PV perdus', n);
  z.append(g);
  const a = el('div','acts'); a.style.marginTop = '8px';
  const ap = el('button','btn sm','Appliquer'); ap.type = 'button'; ap.id = 'coAppliquer';
  const blA = typeof blocageCompo === 'function' ? blocageCompo() : '';
  ap.disabled = !k || !!blA;
  if(blA) ap.title = blA;
  else if(!k) ap.title = 'Choisis une cible d’abord.';
  ap.onclick = () => { if(maintenant() - (COMPO.appliqueA || 0) < 900) return; COMPO.appliqueA = maintenant(); appliquerDegats(n.value); };
  n.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); ap.click(); } };
  a.append(ap);
  const mots = [k ? k.calcul + '.' : 'Pas de cible : les dégâts ne vont nulle part. Choisis à qui, au-dessus.'];
  const j = COMPO.jet;
  if(j && j.rea && k && k.cible.id === COMPO.qui.id && (j.reussite || (!j.echecCrit && j.marge < 4))) mots.push('Sa réaction l’a protégé : aucun dégât.');
  else if(j && !j.rea && !j.sans && !j.reussite) mots.push('Le jet a raté : d’habitude, rien ne passe.');
  else if(k && k.cible.c && !(j && j.rea)) mots.push('Il peut d’abord tenter une réaction : esquive ou parade.');
  a.append(el('span','mini', mots.filter(Boolean).join(' ')));
  z.append(a);
  /* la carte de combat : la distance entre les deux jetons, et si c'est à portée */
  const mp = typeof motPortee === 'function' ? motPortee() : null;
  if(mp) z.append(el('p','mini ctdist' + (mp.ok ? '' : ' trop'), mp.txt));
  return z;
}
function majSeuilCompo(){
  const n = $('coSeuil'); if(!n) return;
  const s = seuilCompo();
  if(!s){ n.textContent = persoCompo() ? '' : 'le MJ donne la valeur'; return; }
  if(s.sans){ n.textContent = 'Ne se lance pas : tu paies, et elle arrive.' + (s.prat && s.prat.pc ? ' ' + s.prat.pc + ' PC, retirés tout de suite.' : ''); return; }
  n.textContent = 'réussite sous ' + s.seuil + ' au ' + s.mode + (s.rea ? ', en réaction' : '') + (s.prat && s.prat.pc ? ' · ' + s.prat.pc + ' PC, retirés dès le jet, même raté' : '');
}

function panneauPv(){
  const p = el('div','panneau');
  const liste = persos(), combattants = pnjs().filter(x => x.pvMax != null && x.statut !== 'mort'), face = adversairesEnCombat();
  if(!liste.length && !combattants.length && !face.length){ p.append(el('p','mini','Personne à la table.')); return p; }
  if(!ciblePv(COMPO.pvId)) COMPO.pvId = (liste[0] || face[0] || combattants[0]).id;
  const g = el('div','jetform');
  const s = el('select'); s.id = 'coPvQui';
  if(liste.length){ const og = el('optgroup'); og.label = 'Les personnages'; liste.forEach(c => og.append(new Option(c.nom || 'Sans nom', c.id))); s.append(og); }
  if(face.length){ const og = el('optgroup'); og.label = 'En face'; face.forEach(a => og.append(new Option(a.nom + (aTerre(a) ? ' (à terre)' : ''), a.id))); s.append(og); }
  if(combattants.length){ const og = el('optgroup'); og.label = 'Les PNJ qui se battent'; combattants.forEach(x => og.append(new Option(x.nom, x.id))); s.append(og); }
  s.value = COMPO.pvId;
  s.onchange = () => { COMPO.pvId = s.value; dessinerCompositeur(true); };
  champ(g, 'Qui', s);
  const q = el('select'); q.id = 'coPvQuoi';
  [['pv','PV'], ['pc','PC']].forEach(([k, l]) => q.add(new Option(l, k)));
  q.value = COMPO.pvQuoi;
  q.onchange = () => { COMPO.pvQuoi = q.value; };
  champ(g, 'Quoi', q);
  const n = el('input'); n.type = 'number'; n.id = 'coPvN'; n.min = '1'; n.value = COMPO.pvN; n.inputMode = 'numeric';
  n.oninput = () => { COMPO.pvN = Math.max(1, parseInt(n.value, 10) || 1); };
  champ(g, 'Combien', n);
  p.append(g);
  const a = el('div','acts'); a.style.marginTop = '10px';
  const moins = el('button','btn ghost sm','En retirer'); moins.type = 'button'; moins.id = 'coPvMoins';
  moins.onclick = () => poserVie(-1);
  const plus = el('button','btn ghost sm','En rendre'); plus.type = 'button'; plus.id = 'coPvPlus';
  plus.onclick = () => poserVie(1);
  const c = perso(COMPO.pvId), ad = !c ? unAdversaire(COMPO.pvId) : null, f = !c && !ad ? unPnj(COMPO.pvId) : null;
  a.append(moins, plus, el('span','mini', c ? (c.nom || 'Sans nom') + ' a ' + c.pv + '/' + c.pvMax + ' PV et ' + c.pcc + '/' + c.pcMax + ' PC. Ça change tout de suite.'
    : ad ? ad.nom + ' a ' + ad.pv + '/' + ad.pvMax + ' PV. Ça change tout de suite.'
    : f ? f.nom + ' a ' + (f.pv == null ? f.pvMax : f.pv) + '/' + f.pvMax + ' PV. Ça change tout de suite.' : ''));
  p.append(a);
  return p;
}

function majApercuCompo(){
  const j = $('coJoint'); if(!j) return;
  j.innerHTML = '';
  const attache = (txt, cls, enlever) => {
    const s = el('span','puce' + (cls ? ' ' + cls : ''), txt);
    const x = el('button', null, '×'); x.type = 'button'; x.setAttribute('aria-label', 'retirer ' + txt);
    x.onclick = enlever;
    s.append(x);
    j.append(s);
  };
  if(COMPO.jet) attache(texteJet(COMPO.jet), COMPO.jet.sans ? '' : COMPO.jet.reussite ? 'ok' : 'ko',
    () => { COMPO.jet = null; sansAuto(); dessinerCompositeur(true); });
  if(COMPO.degats) attache(texteDegats(COMPO.degats), '', () => { COMPO.degats = null; majApercuCompo(); });
  COMPO.vies.forEach(v => attache(texteVie(v), 'vie', () => { retirerVie(v); dessinerCompositeur(true); }));
  const t = $('coTexte').value.trim();
  if((COMPO.genre === 'fait' || COMPO.genre === 'dit') && (t || COMPO.jet || COMPO.degats || COMPO.vies.length)){
    const l = lignePlate({type:COMPO.genre, qui:COMPO.qui, texte:t, jet:COMPO.jet, degats:COMPO.degats, vies:COMPO.vies});
    j.append(el('span','onlira', 'On lira : ' + (l.length > 150 ? l.slice(0, 150) + '…' : l)));
  }
  j.hidden = !j.childNodes.length;
}

function dessinerSeance(force){
  dessinerTeteSeance(force);
  dessinerEtatSeance();
  dessinerMissionTable();
  dessinerGensSeance();
  dessinerRecit(force);
  dessinerCombat();
  dessinerCompositeur(force);
  dessinerOracle(force);
}
/* les PNJ croisés dans cette séance : ceux qui y parlent ou agissent, ceux que le récit nomme */
function gensDeLaSeance(sid){
  const blocs = blocsDe(sid);
  return pnjs().filter(p => {
    if(p.seance === sid) return true;
    const nom = cleNom(p.nom);
    let re = null;
    try{ re = nom.length >= 3 ? new RegExp('(^|[^\\p{L}])' + nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'iu') : null; }catch(e){ re = null; }
    /* une question posée à l'oracle qui le nomme ne le fait pas venir : seule sa réponse, quand elle l'amène */
    return blocs.some(b => (b.qui.k === 'pnj' && (b.qui.id === p.id || (!b.qui.id && cleNom(b.qui.nom) === nom))) || (b.type !== 'oracle' && !!(re && re.test(b.texte))));
  });
}
function dessinerGensSeance(){
  const box = $('seGens'); if(!box) return;
  const e = seanceCourante();
  box.innerHTML = '';
  box.hidden = !e;
  if(!e) return;
  const t = el('div','ctete');
  t.append(el('p','ctitre', 'Les visages de la séance'), el('span','espace'));
  const nv = el('a', null, 'Nouvelle fiche'); nv.href = 'pnj.html#nouveau'; nv.target = ONGLET_VISAGES;
  nv.title = 'Créer une fiche dans le Registre des Visages';
  t.append(nv);
  box.append(t);
  const l = gensDeLaSeance(e.id);
  if(!l.length){ box.append(el('p','mini','Personne encore. Un PNJ qui parle ou agit dans le récit reçoit sa fiche tout seul.')); return; }
  const u = el('ul','gens');
  l.forEach(p => {
    const li = el('li', p.statut === 'mort' ? 'mort' : null);
    const b = el('button','nomlien', p.nom + (p.statut === 'mort' ? ' †' : '')); b.type = 'button';
    b.title = 'Faire parler ' + p.nom; b.setAttribute('aria-label', 'Faire parler ' + p.nom);
    b.onclick = () => composerPourPnj(p);
    li.append(b);
    const q = [libelle(ATTITUDES, p.attitude).toLowerCase(), p.pvMax != null ? (p.pv == null ? p.pvMax : p.pv) + '/' + p.pvMax + ' PV' : ''].filter(Boolean).join(' · ');
    if(q) li.append(el('span','mini', q));
    const a = el('a','fiche', 'fiche'); a.href = 'pnj.html#grand=' + encodeURIComponent('pnj:' + p.id); a.target = ONGLET_VISAGES;
    a.title = 'La fiche de ' + p.nom + ' en grand, dans le Registre des Visages';
    li.append(a);
    u.append(li);
  });
  box.append(u);
}

/* ---------- vers Google Docs ---------- */
const ech = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function blocHtml(b){
  const gris = t => '<span style="color:#6B7469">' + ech(t) + '</span>';
  const br = t => ech(t).replace(/\n/g, '<br>');
  const j = joints(b), ph = sansMarques(phrase(b));
  const suite = !j.length ? '' : ph ? ' ' + gris('(' + j.join(' · ') + ')') : gris(majuscule(j.join(' · ')));
  if(b.type === 'encadre'){
    const sep = '<p style="text-align:center">' + SEPARATEUR + '</p>';
    const corps = sansMarques(b.texte).split('\n').map((x, i) => {
      if(!i) return '<b>' + ech(x) + '</b>';
      const m = /^([^:]{2,40}?) :\s*(.*)$/.exec(x);
      return m ? '<b>' + ech(m[1]) + '</b> : ' + ech(m[2]) : ech(x);
    }).join('<br>');
    return sep + '<p>' + corps + (j.length ? '<br>' + gris('(' + j.join(' · ') + ')') : '') + '</p>' + sep;
  }
  if(b.type === 'rencontre'){
    const sep = '<p style="text-align:center">' + SEPARATEUR + '</p>';
    const l = lignesRencontre(b);
    return sep + '<p><b>' + ech(l[0]) + '</b>' + (l.length > 1 ? '<br>' + l.slice(1).map(ech).join('<br>') : '') + '</p>' + sep;
  }
  if(b.type === 'scene') return '<p><b>' + br(ph) + '</b>' + suite + '</p>';
  if(b.type === 'achat' || b.type === 'note') return '<p><i>' + gris(ph) + '</i></p>';
  return '<p>' + br(ph) + suite + '</p>';
}
function seanceHtml(e){
  const tete = '<h2>Séance ' + ech(e.seance) + (e.titre ? ' · ' + ech(e.titre) : '') + '</h2>' +
    (e.date ? '<p><i>' + ech(dateLongue(e.date)) + '</i></p>' : '');
  return '<div style="font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;color:#000">' + tete + blocsDe(e.id).map(blocHtml).join('') + '</div>';
}
function seanceTexte(e){
  const L = ['Séance ' + e.seance + (e.titre ? ' · ' + e.titre : ''), e.date ? dateLongue(e.date) : '', ''];
  blocsDe(e.id).forEach(b => {
    if(b.type === 'encadre'){
      const j = joints(b);
      L.push(SEPARATEUR, sansMarques(b.texte) + (j.length ? '\n(' + j.join(' · ') + ')' : ''), SEPARATEUR);
    } else if(b.type === 'rencontre') L.push(SEPARATEUR, lignesRencontre(b).join('\n'), SEPARATEUR);
    else L.push(lignePlate(b));
    L.push('');
  });
  return L.join('\n');
}
function copierSeance(e, bouton){
  const t = bouton.textContent;
  const dire = x => { bouton.textContent = x; setTimeout(() => { bouton.textContent = t; }, 2600); };
  const html = seanceHtml(e), texte = seanceTexte(e);
  const parSelection = () => {
    const d = document.createElement('div');
    d.innerHTML = html;
    d.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;color:#000';
    document.body.appendChild(d);
    const s = window.getSelection(), r = document.createRange();
    r.selectNodeContents(d); s.removeAllRanges(); s.addRange(r);
    let ok = false;
    try{ ok = document.execCommand('copy'); }catch(x){}
    s.removeAllRanges(); d.remove();
    return ok;
  };
  const repli = () => dire(parSelection() ? 'Copié, colle dans ton Doc' : 'Copie bloquée ici : sélectionne le compte rendu à la souris');
  try{
    if(navigator.clipboard && typeof ClipboardItem === 'function'){
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], {type:'text/html'}),
        'text/plain': new Blob([texte], {type:'text/plain'})
      })]).then(() => dire('Copié, colle dans ton Doc'), repli);
      return;
    }
  }catch(x){}
  repli();
}
