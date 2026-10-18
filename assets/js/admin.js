// Fichier généré par outils/build.mjs depuis src/js/admin/ : ne pas le modifier, modifier les modules.

// ── admin/admin.js ──
/* ============ la page d'administration ============
   Les invitations, les demandes d'entrée et les comptes. Tout passe par Firestore : ce sont
   les règles (firestore.rules) qui réservent ces gestes aux admins, la page ne fait que les montrer. */

const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };
const maintenant = () => firebase.firestore.FieldValue.serverTimestamp();
const dateDe = t => t && t.toDate ? t.toDate() : null;
const jour = d => d ? d.toLocaleDateString('fr-FR', {day:'numeric', month:'long'}) + ' à ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
const COMPTES = {};      // uid → compte, pour dire qui a utilisé quoi

function bouton(txt, cls, fn){ const b = el('button', 'btn sm ' + (cls || ''), txt); b.type = 'button'; b.onclick = fn; return b; }
function dire(boite, txt, bon){ const p = el('p', 'note ' + (bon ? 'ok' : 'err'), txt); boite.replaceChildren(p); }

/* ---------- les invitations ---------- */
function nouveauCode(){
  const o = new Uint8Array(16); crypto.getRandomValues(o);
  return 'inv-' + Array.from(o, x => x.toString(16).padStart(2, '0')).join('');
}
function lienDe(code){ return new URL('index.html?invitation=' + code, location.href).href; }

function creerInvitation(ev){
  ev.preventDefault();
  const code = nouveauCode(), jours = Number($('invDuree').value) || 7;
  const inv = {
    role: $('invRole').value, creePar: COMPTE.uid, cree: maintenant(), utilisee: false,
    expire: firebase.firestore.Timestamp.fromMillis(Date.now() + jours * 86400000)
  };
  const mail = $('invEmail').value.trim(), note = $('invNote').value.trim();
  if(mail) inv.email = mail;
  if(note) inv.note = note;
  FB_DB.collection('invitations').doc(code).set(inv).then(() => {
    const b = $('invNeuve'); b.replaceChildren();
    const z = el('div', 'adlien');
    z.append(el('span', 'lab', 'Le lien à envoyer' + (note ? ' à ' + note : '')));
    const i = el('input'); i.type = 'text'; i.readOnly = true; i.value = lienDe(code); i.onfocus = () => i.select();
    const c = bouton('Copier', '', () => navigator.clipboard.writeText(i.value).then(() => { c.textContent = 'Copié'; }, () => i.select()));
    z.append(i, c);
    b.append(z);
    $('invForm').reset();
  }, e => dire($('invNeuve'), compteErreur(e)));
}

function dessinerInvitations(snap){
  const l = $('invListe'); l.replaceChildren();
  const docs = snap.docs.slice().sort((a, b) => (dateDe(b.data().cree) || 0) - (dateDe(a.data().cree) || 0));
  if(!docs.length){ l.append(el('p', 'note', 'Aucune invitation pour l’instant.')); return; }
  const t = el('table', 'adtable');
  const h = el('tr'); ['Pour', 'Rôle', 'État', ''].forEach(x => h.append(el('th', null, x))); t.append(h);
  docs.forEach(d => {
    const v = d.data(), tr = el('tr');
    const fin = dateDe(v.expire), perimee = fin && fin < new Date();
    const etat = v.utilisee ? 'Utilisée par ' + ((COMPTES[v.par] || {}).nom || 'un compte') + (v.le ? ', le ' + jour(dateDe(v.le)) : '')
      : perimee ? 'Expirée' : 'Valable jusqu’au ' + jour(fin);
    tr.append(el('td', null, v.note || v.email || '—'), el('td', null, v.role === 'admin' ? 'Admin' : 'Joueur'), el('td', v.utilisee || perimee ? 'pale' : null, etat));
    const a = el('td', 'adactions');
    if(!v.utilisee && !perimee) a.append(bouton('Copier le lien', 'ghost', ev => navigator.clipboard.writeText(lienDe(d.id)).then(() => { ev.target.textContent = 'Copié'; })));
    a.append(bouton(v.utilisee ? 'Effacer' : 'Révoquer', 'danger', () => d.ref.delete()));
    tr.append(a);
    t.append(tr);
  });
  l.append(t);
}

/* ---------- les demandes d'entrée ---------- */
function dessinerDemandes(snap){
  const l = $('demListe'); l.replaceChildren();
  if(snap.empty){ l.append(el('p', 'note', 'Aucune demande en attente.')); return; }
  const t = el('table', 'adtable');
  snap.docs.forEach(d => {
    const v = d.data(), tr = el('tr');
    tr.append(el('td', null, v.nom), el('td', 'pale', v.email || ''), el('td', 'pale', jour(dateDe(v.cree))));
    const a = el('td', 'adactions');
    a.append(bouton('Accepter', '', () => {
      const b = FB_DB.batch();
      b.set(FB_DB.collection('comptes').doc(d.id), {nom:v.nom, role:'joueur', actif:true, invitation:'demande', cree:maintenant()});
      b.delete(d.ref);
      b.commit().catch(e => alert(compteErreur(e)));
    }), bouton('Refuser', 'danger', () => d.ref.delete()));
    tr.append(a); t.append(tr);
  });
  l.append(t);
}

/* ---------- les comptes ---------- */
function dessinerComptes(snap){
  const l = $('cptListe'); l.replaceChildren();
  snap.docs.forEach(d => { COMPTES[d.id] = d.data(); });
  const t = el('table', 'adtable');
  const h = el('tr'); ['Joueur', 'Rôle', 'État', ''].forEach(x => h.append(el('th', null, x))); t.append(h);
  snap.docs.slice().sort((a, b) => String(a.data().nom).localeCompare(String(b.data().nom), 'fr')).forEach(d => {
    const v = d.data(), tr = el('tr'), moi = d.id === COMPTE.uid, intouchable = moi || v.fondateur;
    tr.append(el('td', null, v.nom + (moi ? ' (toi)' : '') + (v.fondateur ? ' · fondateur' : '')),
      el('td', null, v.role === 'admin' ? 'Admin' : 'Joueur'),
      el('td', v.actif === false ? 'pale' : null, v.actif === false ? 'En pause' : 'Actif'));
    const a = el('td', 'adactions');
    if(!intouchable){
      a.append(bouton(v.role === 'admin' ? 'Rendre joueur' : 'Nommer admin', 'ghost', () => d.ref.update({role: v.role === 'admin' ? 'joueur' : 'admin'}).catch(e => alert(compteErreur(e)))));
      a.append(bouton(v.actif === false ? 'Réactiver' : 'Mettre en pause', v.actif === false ? 'ghost' : 'danger', () => d.ref.update({actif: v.actif === false}).catch(e => alert(compteErreur(e)))));
    }
    tr.append(a); t.append(tr);
  });
  l.append(t);
}

/* ---------- le démarrage ---------- */
compteQuandPret(c => {
  if(c.role !== 'admin' || !FB_DB){ $('adRefus').hidden = false; return; }
  $('adCorps').hidden = false;
  $('invForm').onsubmit = creerInvitation;
  const panne = boite => e => dire($(boite), compteErreur(e));
  FB_DB.collection('comptes').onSnapshot(s => { dessinerComptes(s); }, panne('cptListe'));
  FB_DB.collection('invitations').onSnapshot(dessinerInvitations, panne('invListe'));
  FB_DB.collection('demandes').onSnapshot(dessinerDemandes, panne('demListe'));
});
