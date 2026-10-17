// Instantanés des pages, pour vérifier qu'un changement ne casse rien.
//
//   node outils/instantanes.mjs prendre <dossier>        photographie toutes les pages du site
//   node outils/instantanes.mjs comparer <avant> <après>  dit ce qui a changé entre deux instantanés
//
// Chaque page est ouverte dans Chrome sans fenêtre, servie en http depuis la racine du dépôt,
// avec le hasard et l'horloge figés : deux instantanés du même code sont identiques.
// On garde, page par page : les erreurs JavaScript et les ressources introuvables, le DOM une fois
// les scripts passés, et les styles calculés de chaque élément sur écran large, sur téléphone
// et à l'impression. Le stockage du navigateur part vide et se remplit de page en page, dans l'ordre.
//
// Chrome est cherché aux endroits habituels ; sinon, donner son chemin dans la variable CHROME.
// Usage type : prendre un instantané avant, modifier, relancer le build, en prendre un après, comparer.

import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const [action, a, b] = process.argv.slice(2);

async function existe(p) { try { await stat(p); return true; } catch { return false; } }

async function trouverChrome() {
  const candidats = [process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  for (const c of candidats) if (c && await existe(c)) return c;
  throw new Error('Chrome introuvable : donner son chemin dans la variable CHROME.');
}

// Avant tout script de la page : un hasard et une horloge qui ne bougent pas.
const FIGER = `(() => {
  let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const T = Date.UTC(2026, 9, 17, 12, 0, 0), D = Date;
  class DateFigee extends D { constructor(...x) { super(...(x.length ? x : [T])); } static now() { return T; } }
  window.Date = DateFigee;
  let k = 0; try { crypto.randomUUID = () => '00000000-0000-4000-8000-' + String(++k).padStart(12, '0'); } catch (e) {}
})()`;

// Lus dans la page : le DOM sans scripts ni styles, et les styles calculés de chaque élément.
function domDeLaPage() {
  const c = document.documentElement.cloneNode(true);
  c.querySelectorAll('script,style,link').forEach(e => e.remove());
  return c.outerHTML.replace(/>\s+</g, '><');
}
function stylesDeLaPage() {
  const P = ['display', 'position', 'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'width', 'height',
    'margin-top', 'margin-left', 'padding-top', 'padding-left', 'border-top-width', 'border-top-color', 'grid-template-columns',
    'flex-direction', 'gap', 'visibility', 'opacity', 'z-index', 'top', 'left', 'text-align', 'line-height'];
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    if (/^(STYLE|LINK|SCRIPT)$/.test(el.tagName)) return;
    const s = getComputedStyle(el);
    out.push(el.tagName + (el.id ? '#' + el.id : '') + ' ' + P.map(p => s.getPropertyValue(p)).join('|'));
  });
  return out.join('\n');
}
const MODES = [['écran large', 1400, 1000, 'screen', false], ['téléphone', 420, 900, 'screen', true], ['impression', 1000, 1000, 'print', false]];

async function prendre(sortie) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const serveur = createServer(async (q, r) => {
    const p = decodeURIComponent(new URL(q.url, 'http://x').pathname).replace(/^\/+/, '');
    try {
      const corps = await readFile(join(RACINE, p || 'index.html'));
      r.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(corps);
    } catch { r.writeHead(404); r.end(); }
  });
  await new Promise(ok => serveur.listen(0, '127.0.0.1', ok));
  const port = serveur.address().port;
  const profil = join(tmpdir(), `faelorenn-instantanes-${process.pid}`);
  const portDebug = 9300 + (process.pid % 500);
  const chrome = spawn(await trouverChrome(), ['--headless=new', `--remote-debugging-port=${portDebug}`, `--user-data-dir=${profil}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  let version;
  for (let i = 0; i < 100 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${portDebug}/json/version`)).json(); }
    catch { await new Promise(ok => setTimeout(ok, 150)); }
  }
  if (!version) throw new Error('Chrome ne répond pas.');
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise(ok => ws.onopen = ok);
  let n = 0; const attente = new Map(), ecoutes = new Set();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && attente.has(m.id)) { const { ok, ko } = attente.get(m.id); attente.delete(m.id); m.error ? ko(new Error(JSON.stringify(m.error))) : ok(m.result); }
    else ecoutes.forEach(f => f(m));
  };
  const cdp = (method, params = {}, sessionId) => new Promise((ok, ko) => { const id = ++n; attente.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params, sessionId })); });

  await mkdir(sortie, { recursive: true });
  const pages = (await readdir(RACINE)).filter(f => f.endsWith('.html')).sort();
  const resume = {};
  try {
    for (const page of pages) {
      const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
      const erreurs = [], manquants = [];
      const ecoute = m => {
        if (m.sessionId !== sessionId) return;
        if (m.method === 'Runtime.exceptionThrown') erreurs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]);
        if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning'))
          erreurs.push(`console.${m.params.type} : ` + m.params.args.map(x => x.value ?? x.description).join(' ').slice(0, 200));
        if (m.method === 'Network.responseReceived' && m.params.response.status >= 400 && !/favicon|fonts\.g/.test(m.params.response.url))
          manquants.push(`${m.params.response.status} ${m.params.response.url.replace(/^http:\/\/127\.0\.0\.1:\d+\//, '')}`);
      };
      ecoutes.add(ecoute);
      for (const d of ['Runtime.enable', 'Network.enable', 'Page.enable']) await cdp(d, {}, sessionId);
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: FIGER }, sessionId);
      await cdp('Page.navigate', { url: `http://127.0.0.1:${port}/${page}` }, sessionId);
      await new Promise(ok => setTimeout(ok, 3500));
      const lire = async fn => {
        const r = await cdp('Runtime.evaluate', { expression: `(${fn})()`, returnByValue: true }, sessionId);
        if (r.exceptionDetails) erreurs.push('instantané : ' + r.exceptionDetails.text);
        return r.result.value ?? '';
      };
      const dom = await lire(domDeLaPage);
      let styles = '';
      for (const [nom, largeur, hauteur, media, mobile] of MODES) {
        await cdp('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: 1, mobile }, sessionId);
        await cdp('Emulation.setEmulatedMedia', { media }, sessionId);
        await new Promise(ok => setTimeout(ok, 300));
        styles += `### ${nom}\n${await lire(stylesDeLaPage)}\n`;
      }
      const stockage = JSON.parse(await lire(() => JSON.stringify(Object.keys(localStorage).sort())) || '[]');
      await writeFile(join(sortie, page + '.dom.html'), dom);
      await writeFile(join(sortie, page + '.styles.txt'), styles);
      const h = t => createHash('md5').update(t).digest('hex').slice(0, 12);
      resume[page] = { erreurs, manquants, dom: h(dom), styles: h(styles), stockage };
      console.log(`${erreurs.length || manquants.length ? '✗' : '✓'} ${page}${erreurs.length ? ' — ' + erreurs.join(' ; ') : ''}${manquants.length ? ' — manquants : ' + manquants.join(', ') : ''}`);
      ecoutes.delete(ecoute);
      await cdp('Target.closeTarget', { targetId });
    }
  } finally {
    ws.close();
    // Sous Windows, tuer le lanceur ne suffit pas : on arrête tous les processus de ce profil.
    if (process.platform === 'win32') spawnSync('powershell', ['-NoProfile', '-Command',
      `Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*faelorenn-instantanes-${process.pid}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`]);
    else chrome.kill();
    serveur.close();
    await rm(profil, { recursive: true, force: true }).catch(() => {});
  }
  await writeFile(join(sortie, 'resume.json'), JSON.stringify(resume, null, 1));
  console.log(`Instantané écrit dans ${sortie}`);
}

async function comparer(avant, apres) {
  const A = JSON.parse(await readFile(join(avant, 'resume.json'), 'utf8'));
  const B = JSON.parse(await readFile(join(apres, 'resume.json'), 'utf8'));
  let pareil = true;
  for (const page of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const x = A[page], y = B[page];
    if (!x || !y) { pareil = false; console.log(`✗ ${page} : ${x ? 'disparue' : 'nouvelle'}`); continue; }
    const ecarts = ['erreurs', 'manquants', 'dom', 'styles', 'stockage'].filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
    if (!ecarts.length) { console.log(`✓ ${page}`); continue; }
    pareil = false;
    console.log(`✗ ${page} : ${ecarts.join(', ')} diffèrent`);
    if (ecarts.includes('erreurs')) console.log(`    erreurs après : ${y.erreurs.join(' ; ') || '(aucune)'}`);
    if (ecarts.includes('manquants')) console.log(`    manquants après : ${y.manquants.join(', ') || '(aucun)'}`);
    for (const [k, suffixe] of [['dom', '.dom.html'], ['styles', '.styles.txt']]) {
      if (!ecarts.includes(k)) continue;
      const la = (await readFile(join(avant, page + suffixe), 'utf8')).replace(/></g, '>\n<').split('\n');
      const lb = (await readFile(join(apres, page + suffixe), 'utf8')).replace(/></g, '>\n<').split('\n');
      let i = 0; while (i < la.length && la[i] === lb[i]) i++;
      console.log(`    ${k}, premier écart ligne ${i + 1} :\n      avant : ${(la[i] ?? '(fin)').slice(0, 200)}\n      après : ${(lb[i] ?? '(fin)').slice(0, 200)}`);
    }
  }
  console.log(pareil ? '\nAucune différence.' : '\nDes différences : à examiner.');
  return pareil;
}

if (action === 'comparer' && a && b) process.exit(await comparer(a, b) ? 0 : 1);
if (action !== 'prendre' || !a) {
  console.error('usage : node outils/instantanes.mjs prendre <dossier>\n        node outils/instantanes.mjs comparer <avant> <après>');
  process.exit(2);
}
await prendre(a);
process.exit(0);
