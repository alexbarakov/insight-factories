import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { DOMAINS, OBJECTS, SNAPSHOT } from './data/data.js?v=100';
import { NAMES } from './data/names.js?v=100';
import { SUBS, fmtK, SUBX, qAll } from './model.js?v=100';
import { checks as checksOf } from './products.js?v=100';
import { econHtml } from './econ.js?v=100';
import { buildOffice } from './office.js?v=100';
import { refFooter } from './reffoot.js?v=100';
const PROB = '<svg class="pi" width="11" height="11" viewBox="0 0 12 12" aria-label="issues"><path d="M6 1.2 11.1 10.4H.9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 4.7v2.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="8.8" r=".85" fill="currentColor"/></svg>';

// ============================================================================
// Subdomain factory. Raw materials → workshops (data marts) → warehouses (Semantic Layer metrics) →
// shipping docks (dashboards and AI channels). Products ride the conveyors: green is healthy,
// red is defects. Click to inspect a workshop or object and to run the fixer agent.
// ============================================================================
// theme tokens (app/theme.css), read at runtime; the 3D scene follows the light or dark theme
const ROOT = document.documentElement, css = (n, fb) => getComputedStyle(ROOT).getPropertyValue(n).trim() || fb;
const DARK = ROOT.dataset.theme === 'dark' || (ROOT.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!ROOT.dataset.theme) location.reload(); });
const hex6 = c => '#' + new THREE.Color(c).getHexString();   // canvas paint appends alpha to #RRGGBB
// surfaces of the yard (ground, pads, roads) are dimmed in the dark theme; buildings keep their tones
const env = (c, k = 0.34) => DARK ? '#' + new THREE.Color(c).multiplyScalar(k).getHexString() : c;
const ok = s => s >= 2, fmt = n => Math.round(n).toLocaleString('en-US'), pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const cls = s => s >= 0.5 ? 'ok' : s >= 0.25 ? 'warn' : 'bad';
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fmtDate = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
// default factory: the first Goods subdomain that has objects
const DEF_D = Math.max(0, DOMAINS.findIndex((r, i) => r[0] === 'Goods' && OBJECTS.some(o => o[1] === i)));
const QS = new URLSearchParams(location.search), DI = Math.max(0, Math.min(DOMAINS.length - 1, parseInt(QS.get('d') ?? String(DEF_D), 10) || 0));
const EMBED = QS.get('embed') === '1';
if (EMBED) document.documentElement.classList.add('embed');
// Jobs subdomains get a hand-made workshop map (by keywords in object names); other subdomains are clustered automatically
const DR = DOMAINS[DI], DOM = { l1: DR[0], l2: DR[1], air: DR[15] || 0, bp: !!DR[2] }, JOBS_D = DR[0] === 'Jobs';
const TT = ['dash', 'met', 'dm'], OBJ = { dm: [], met: [], dash: [] };
OBJECTS.forEach(r => { if (r[1] === DI) OBJ[TT[r[0]]].push({ t: TT[r[0]], name: r[4], s: r[2], pop: r[3], id: r[5] }); });
Object.values(OBJ).forEach(a => a.sort((x, y) => y.pop - x.pop));
// workshop layout for subdomains without a hand-made map: frequent words in object names
const STOP = new Set(('legacy prod test view table datamart mart data stats stat daily weekly monthly hourly yearly report reports dashboard metric metrics count share total '
  + 'review overview trends trend health forecast breakdown dynamics pulse funnel targets actuals segments quality cohort analysis retention monitor scorecard summary enriched snapshot facts history '
  + 'rate time median avg per net new users user top').split(' ').concat(`${DR[0]} ${DR[1]}`.toLowerCase().split(/[^a-z0-9]+/)));
const tokens = o => [...new Set(o.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP.has(w) && !/^\d+d?$/.test(w)))];
function clusterBy(objs, k) {
  if (!objs.length) return [{ word: null, objs: [] }];
  const tk = new Map(objs.map(o => [o, tokens(o)])), min = Math.max(3, Math.ceil(objs.length * 0.06)), out = []; let left = [...objs];
  while (out.length < k - 1 && left.length > min) {
    const df = new Map(); left.forEach(o => tk.get(o).forEach(w => df.set(w, (df.get(w) || 0) + 1)));
    const best = [...df].filter(([, c]) => c >= min && c < left.length * 0.9).sort((a, b) => b[1] - a[1])[0]; if (!best) break;
    const take = new Set(left.filter(o => tk.get(o).includes(best[0]))); out.push({ word: best[0], objs: [...take] }); left = left.filter(o => !take.has(o)); }
  if (left.length) out.push({ word: out.length ? 'other' : null, objs: left });
  return out;
}

// ---------- workshops, warehouses, docks ----------
// certified data marts get their own workshop in a separate zone
const isCert = o => o.s === 1 || o.s === 3, CERT_DM = OBJ.dm.filter(isCert), RAW_DM = OBJ.dm.filter(o => !isCert(o));
const GROUPS = JOBS_D ? [
  { id: 'w1', kind: 'hall', name: 'Workshop "Vacancies"', re: /vacanc|job_post|posting|listing|title/i },
  { id: 'w2', kind: 'hall', name: 'Workshop "Applications and contacts"', re: /applic|contact|respons|interview|call|chat|messag|match|hire/i },
  { id: 'w3', kind: 'hall', name: 'Workshop "Resumes"', re: /resume|\bcv|seeker|candid/i },
  { id: 'w4', kind: 'hall', name: 'Workshop "Revenue and sales"', re: /revenue|segment|billing|pay|tariff|sales|lead|bonus|price/i },
  { id: 'w5', kind: 'hall', name: 'Workshop "Users"', re: null },
  { id: 'm1', kind: 'store', name: 'Warehouse "Paid contacts"', re: /paid|amount|revenue|arpu|cost|price|gmv|margin/i },
  { id: 'm2', kind: 'store', name: 'Warehouse "Messaging"', re: /msg|chat|messag|call|repl|response/i },
  { id: 'm3', kind: 'store', name: 'Warehouse "Search and listings"', re: /serp|search|ctr|rec|widget|listing/i },
  { id: 'm4', kind: 'store', name: 'Warehouse "Vacancies and activity"', re: null },
] : [
  ...clusterBy(RAW_DM, RAW_DM.length < 12 ? 1 : 5).map((c, i) => ({ id: 'w' + (i + 1), kind: 'hall', name: c.word ? `Workshop "${c.word}"` : 'Workshop "data marts"', objs: c.objs, auto: true })),
  ...clusterBy(OBJ.met, OBJ.met.length < 12 ? 1 : 4).map((c, i) => ({ id: 'm' + (i + 1), kind: 'store', name: c.word ? `Warehouse "${c.word}"` : 'Warehouse "metrics"', objs: c.objs, auto: true })),
];
if (JOBS_D) GROUPS.forEach(g => g.objs = []);
const halls = GROUPS.filter(g => g.kind === 'hall'), stores = GROUPS.filter(g => g.kind === 'store');
if (JOBS_D) RAW_DM.forEach(o => (halls.find(g => g.re && g.re.test(o.name)) || halls[4]).objs.push(o));
if (JOBS_D) OBJ.met.forEach(o => (stores.find(g => g.re && g.re.test(o.name)) || stores[3]).objs.push(o));
const CERT_HALL = { id: 'wc', kind: 'hall', name: 'Workshop "certified data marts"', objs: CERT_DM, certHall: true };
GROUPS.push(CERT_HALL); halls.push(CERT_HALL);
const DOCKS = [
  { id: 'd1', kind: 'dock', name: 'Dock "Dashboards"', objs: OBJ.dash, big: true },
  { id: 'd2', kind: 'dock', name: 'Dock "AI Assistant"', ai: 'conversations in 30 days: 610', share: 0.31 },
  { id: 'd3', kind: 'dock', name: 'Dock "AI in Chat"', ai: 'conversations in 30 days: 380', share: 0.27 },
  { id: 'd4', kind: 'dock', name: 'Dock "MCP and SQL Workbench"', ai: 'calls per week: 3,812', share: 0.42 },
];
const SOURCES = [{ id: 's1', kind: 'tank', name: 'Clickstream' }, { id: 's2', kind: 'tank', name: 'Core DWH' }, { id: 's3', kind: 'tank', name: 'Billing' }, ...(JOBS_D ? [{ id: 's4', kind: 'tank', name: 'Partner job feeds' }] : [])];
const ALL = [...SOURCES, ...GROUPS, ...DOCKS];
ALL.forEach(b => { if (b.objs) { b.n = b.objs.length; b.good = b.objs.filter(o => ok(o.s)).length; b.share = b.n ? b.good / b.n : 0; b.use = b.objs.reduce((s, o) => s + o.pop, 0);
  b.cert = b.n ? b.objs.filter(o => o.s === 1 || o.s === 3).length / b.n : 0; } });
// issue: an object more popular than 75% of objects of its type that is unhealthy
const P75 = {}; ['dm', 'met', 'dash'].forEach(t => { const a = OBJ[t].map(o => o.pop).sort((x, y) => x - y); P75[t] = a[Math.floor(a.length * 0.75)] || 0; });
ALL.forEach(b => { if (b.objs) b.hot = b.objs.filter(o => !ok(o.s) && o.pop > P75[o.t]).length; });

// ---------- layout ----------
const BUS1 = -13, BUS2 = 22;
function stack(list, x, depthOf, gap) { const tot = list.reduce((s, b) => s + depthOf(b), 0) + gap * (list.length - 1); let z = -tot / 2; list.forEach(b => { b.d = depthOf(b); b.x = x; b.z = z + b.d / 2; z += b.d + gap; }); }
// building footprint is the number of objects, height is total usage
const maxUseH = Math.max(1, ...halls.map(b => b.use)), maxUseS = Math.max(1, ...stores.map(b => b.use));
halls.forEach(b => { const s = 5 + Math.sqrt(b.n) * 1.9; b.w = s * 1.15; b.dd = s * 0.85; b.h = 2.6 + Math.sqrt(b.use / maxUseH) * 12; });
{ const reg = halls.filter(b => !b.certHall); stack(reg, -31, b => b.dd, 5); const bot = Math.max(...reg.map(b => b.z + b.d / 2));
  const GAP = 22; reg.forEach(b => b.z -= (CERT_HALL.dd + GAP) / 2); CERT_HALL.d = CERT_HALL.dd; CERT_HALL.x = -31; CERT_HALL.z = bot - (CERT_HALL.dd + GAP) / 2 + GAP + CERT_HALL.dd / 2; }
stores.forEach(b => { const s = 4.5 + Math.sqrt(b.n) * 1.2; b.w = s; b.dd = s * 0.95; b.h = 4 + Math.sqrt(b.use / maxUseS) * 14; }); stack(stores, 4, b => b.dd, 6);
DOCKS.forEach(b => { b.w = 11; b.h = 5; }); stack(DOCKS, 39, b => b.big ? 20 : 9, 5);
SOURCES.forEach(b => { b.w = 7; b.h = 11; }); stack(SOURCES, -60, () => 7, 7);
const ZB = Math.max(...[...halls, ...stores, ...DOCKS].map(b => b.z + b.d / 2)) + 7;   // bypass belt

// ---------- scene ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = DARK ? 0.9 : 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const SCENE_BG = css('--scene-bg', DARK ? '#0F1A20' : '#DCE6EA');
const scene = new THREE.Scene(); scene.background = new THREE.Color(SCENE_BG);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 1000);
camera.position.set(70, 78, 92); camera.zoom = 1;
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = true;
controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.15; controls.minZoom = 0.5; controls.maxZoom = 7;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
// wide view: with neighbours on the left and right the camera pulls back so they are visible next to the panel
const HOME = (SUBX.inn[DI]?.length || SUBX.out[DI]?.length) ? [16, 12, 0.52] : [-4, 10, 0.8];
controls.target.set(HOME[0], 0, HOME[1]); camera.position.set(HOME[0] + 20, 112, HOME[1] + 100); camera.zoom = HOME[2];
// entering from the Insight Factories world: the screen briefly fades in from the scene color
const FROM_WORLD = QS.get('from') === 'world';
if (FROM_WORLD) { const f = document.createElement('div'); f.style.cssText = 'position:fixed;inset:0;background:var(--scene-bg);z-index:30;pointer-events:none;transition:opacity .25s ease'; document.body.appendChild(f);
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = 0; setTimeout(() => f.remove(), 300); })); }
scene.add(new THREE.HemisphereLight('#ffffff', env('#cfd3cc', 0.5), DARK ? 1.1 : 1.6));
const sun = new THREE.DirectionalLight('#fff6e8', DARK ? 1.9 : 2.4); sun.position.set(-60, 110, 70); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 90, bottom: -90, near: 10, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4;
scene.add(sun);

const mats = {};
const M = (c, o = {}) => mats[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
function mesh(geo, mat, x, y, z, parent = scene) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
const box = (w, h, d, c, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), M(c), x, y + h / 2, z, p);

// factory yard
{ const g = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), M(DARK ? hex6(SCENE_BG) : '#E3E7DF')); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  box(150, 0.3, ZB * 2 + 40, env('#F0F1EE', 0.16), -10, 0, 2);
  // lane markings
  [[BUS1 - 4, 0], [BUS2 + 4, 0]].forEach(([x]) => box(0.25, 0.05, ZB * 2 + 10, env('#D5D9D3', 0.5), x, 0.3, 0));
  // trees along the perimeter
  const tg = new THREE.ConeGeometry(2.2, 6, 7); tg.translate(0, 3, 0); const tr = new THREE.InstancedMesh(tg, M(env('#9DB58A', 0.55)), 70); tr.castShadow = true;
  const mm = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < 70; i++) { const side = i % 4, t = (i / 70) * 4 % 1; const x = side < 2 ? -85 + t * 150 : side === 2 ? -88 : 68, z = side === 0 ? -ZB - 18 : side === 1 ? ZB + 27 : -ZB - 10 + t * (ZB * 2 + 20); const s = 0.7 + (hash('t' + i) % 50) / 100;
    mm.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); tr.setMatrixAt(k++, mm); }
  scene.add(tr); }

// ---------- buildings ----------
const STATUS = { ok: css('--ok', '#2E8A57'), warn: css('--warn', '#C88A12'), bad: css('--bad', '#C4453A'), grey: css('--grey', '#A7B3B9') };
// certified: the key / certified token; "none" is a neutral line color
const CERT_C = css('--key', '#7A4E9C'), NONE_C = css('--line-strong', '#C3CDD2');
const pickable = [], lamps = [], chimneys = [];
function lamp(b, x, y, z) { const c = b.share == null ? STATUS.grey : STATUS[cls(b.share)];
  const l = mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 }), x, y, z, b.grp); l.castShadow = false;
  box(0.15, 1.2, 0.15, '#9AA29D', x, y - 1.6, z, b.grp); lamps.push({ m: l, bad: b.share != null && b.share < 0.25 }); }
// band on the south facade: share for the selected layer
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
function band(b) { const g = b.grp, y = 0.9, z = b.d / 2 + 0.08;
  b.bandA = mesh(UNIT_BOX, new THREE.MeshStandardMaterial({ color: STATUS.ok, roughness: 0.6 }), 0, y + 0.55, z, g); b.bandB = mesh(UNIT_BOX, new THREE.MeshStandardMaterial({ color: STATUS.bad, roughness: 0.6 }), 0, y + 0.55, z, g);
  [b.bandA, b.bandB].forEach(m => { m.scale.set(1, 1.1, 0.12); m.castShadow = false; }); setBand(b, b.share, STATUS.ok, STATUS.bad); }
function setBand(b, f, ca, cb) { if (!b.bandA) return; const w = b.w - 1.2, wa = Math.max(0.001, w * f), wb = Math.max(0.001, w - wa);
  b.bandA.scale.x = wa; b.bandA.position.x = -w / 2 + wa / 2; b.bandB.scale.x = wb; b.bandB.position.x = -w / 2 + wa + wb / 2;
  b.bandA.material.color.set(ca); b.bandB.material.color.set(cb); }
function buildHall(b) {
  const g = b.grp, { w, d, h } = b;
  box(w, 0.6, d, '#E2E5E1', 0, 0, 0, g);
  box(w, h, d, '#F6F6F3', 0, 0.6, 0, g);
  // sawtooth roof with glazing
  const teeth = Math.max(3, Math.round(w / 3.4)), tw = w / teeth, sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(tw, 0); sh.lineTo(0, 2.4); sh.closePath();
  const tg = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); tg.translate(0, 0, -d / 2);
  for (let i = 0; i < teeth; i++) { const m = mesh(tg, M('#E9ECE8'), -w / 2 + i * tw, h + 0.6, 0, g); mesh(new THREE.BoxGeometry(0.12, 2.4, d - 0.4), M('#B7CEDA', { roughness: 0.2 }), -w / 2 + i * tw + 0.06, h + 0.6 + 1.2, 0, g); }
  // gates: raw materials enter on the left, products leave on the right
  box(0.2, 3.4, 3.6, '#5E6B64', w / 2 + 0.05, 0.6, 0, g); box(0.2, 2.6, 2.6, '#5E6B64', -w / 2 - 0.05, 0.6, 0, g);
  for (let i = 0; i < 3; i++) box(0.12, 1.2, 2.2, '#B7CEDA', w / 2 + 0.03, 3.4, -d / 2 + 2 + i * (d - 4) / 2, g);
  const cx = -w / 2 + 2, cz = -d / 2 + 2; mesh(new THREE.CylinderGeometry(0.8, 1, 9, 12), M('#D9DCD8'), cx, 0.6 + h + 4.5, cz, g);
  chimneys.push({ b, x: b.x + cx, y: 0.6 + h + 9, z: b.z + cz });
  band(b);
  lamp(b, w / 2 - 1.5, h + 4.6, -d / 2 + 1.5);
}
function buildStore(b) {
  const g = b.grp, { w, d, h } = b;
  box(w, 0.6, d, '#E2E5E1', 0, 0, 0, g); box(w, h, d, '#EEF0EC', 0, 0.6, 0, g); box(w + 0.6, 0.5, d + 0.6, '#DCE0DB', 0, h + 0.6, 0, g);
  for (let i = 0; i <= Math.floor(d / 1.6); i++) { box(w + 0.1, h, 0.12, '#E0E3DF', 0, 0.6, -d / 2 + i * 1.6, g); }
  for (const s of [-1, 1]) box(0.2, 3, 3, '#5E6B64', s * (w / 2 + 0.05), 0.6, 0, g);
  // racks visible through the side opening
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(0.1, 0.5, 0.5, ['#C9A86A', '#B88F52', '#D7B97E'][(i + j) % 3], w / 2 + 0.15, 1.2 + j * 1.0, -1 + i * 0.6, g);
  lamp(b, w / 2 - 1.2, h + 2.6, -d / 2 + 1.2);
  band(b);
}
const trucks = [];
function buildDock(b) {
  const g = b.grp, { w, d } = b;
  box(w, 1.4, d, '#DADDD8', 0, 0, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.3, 4.6, 0.3, '#9AA29D', sx * (w / 2 - 0.6), 1.4, sz * (d / 2 - 0.6), g);
  box(w + 1.5, 0.35, d + 1, '#F6F6F3', 0, 6, 0, g);
  const bays = b.big ? 3 : 1;
  for (let i = 0; i < bays; i++) { const z = -d / 2 + (i + 0.5) * d / bays;
    const t = new THREE.Group(); t.position.set(w / 2 + 5.5, 0, z); g.add(t);
    box(7, 3.4, 2.6, '#FFFFFF', 0, 0.9, 0, t); box(2.2, 2.6, 2.5, b.big ? '#2F5D7C' : '#4E7A68', 4.7, 0.9, 0, t);
    for (const wx of [-2.4, 2.4, 4.7]) for (const wz of [-1.3, 1.3]) { const wh = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), M('#2A2F2C'), wx, 0.55, wz, t); wh.rotation.x = Math.PI / 2; }
    trucks.push({ t, x0: w / 2 + 5.5, phase: i * 2.7 + (hash(b.id) % 7) }); }
  lamp(b, -w / 2 + 1.2, 7.6, -d / 2 + 1.2);
}
function buildTank(b) {
  const g = b.grp;
  mesh(new THREE.CylinderGeometry(3.2, 3.2, 10, 24), M('#F2F3F0'), 0, 5, 0, g);
  mesh(new THREE.SphereGeometry(3.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#E6E9E5'), 0, 10, 0, g);
  mesh(new THREE.CylinderGeometry(3.25, 3.25, 0.8, 24), M('#B9C0BB'), 0, 6, 0, g);
  box(0.3, 10, 0.6, '#B9C0BB', 3.2, 0, 0, g);
}
ALL.forEach(b => { b.grp = new THREE.Group(); b.grp.position.set(b.x, 0.3, b.z); scene.add(b.grp);
  ({ hall: buildHall, store: buildStore, dock: buildDock, tank: buildTank })[b.kind](b);
  b.grp.traverse(o => { if (o.isMesh) { o.userData.b = b; pickable.push(o); } });
  if (b.kind === 'hall' || b.kind === 'store' || (b.kind === 'dock' && b.objs)) { const wallM = new THREE.MeshStandardMaterial({ roughness: 0.85 }), roofM = new THREE.MeshStandardMaterial({ roughness: 0.85 }), ribM = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const WALL = [M('#F6F6F3'), M('#EEF0EC'), M('#DADDD8')], ROOF = [M('#E9ECE8'), M('#DCE0DB')], RIB = [M('#E0E3DF')];
    b.grp.traverse(o => { if (!o.isMesh) return; if (WALL.includes(o.material)) o.material = wallM; else if (ROOF.includes(o.material)) o.material = roofM; else if (RIB.includes(o.material)) o.material = ribM; });
    b.tint = { wallM, roofM, ribM }; } });
// ---------- factory staff: names from the Domain Registry (data/names.js) ----------
const PEOPLE = NAMES[DI] || {}, hasRole = k => !!(PEOPLE[k] || DR[{ st: 5, bp: 2, cur: 3, ai: 4 }[k]]);
const allObjs = [...OBJ.dm, ...OBJ.met, ...OBJ.dash], plantShare = allObjs.length ? allObjs.filter(o => ok(o.s)).length / allObjs.length : 0;
const MOOD = plantShare >= 0.5 ? 'happy' : plantShare >= 0.25 ? 'flat' : 'sad', MOOD_LABEL = { happy: 'happy', flat: 'thinking', sad: 'upset' };
function person(x, z, { suit = '#2E3A45', mood = 'happy', s = 1.6, ry = 0 } = {}) {
  const p = new THREE.Group(); p.position.set(x, 0.3, z); p.scale.setScalar(s); p.rotation.y = ry; scene.add(p);
  mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), M('#2A2F36'), 0, 0.45, 0, p); const body = mesh(new THREE.BoxGeometry(0.62, 0.8, 0.36), M(suit), 0, 1.3, 0, p);
  mesh(new THREE.BoxGeometry(0.14, 0.42, 0.05), M('#C6402F'), 0, 1.42, 0.19, p);
  const head = mesh(new THREE.SphereGeometry(0.27, 14, 10), M('#F1C9A5'), 0, 1.98, 0, p);
  mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), M('#3A2E26'), 0, 2.02, -0.02, p);
  const arm = sx => { const a = new THREE.Group(); a.position.set(sx * 0.4, 1.66, 0); p.add(a); mesh(new THREE.BoxGeometry(0.18, 0.72, 0.2), M(suit), 0, -0.34, 0, a); return a; };
  const aL = arm(-1), aR = arm(1);
  if (mood === 'happy') aR.rotation.z = 2.5; else if (mood === 'sad') { head.position.set(0, 1.9, 0.1); body.rotation.x = 0.22; } else { aR.rotation.x = -1.6; aR.rotation.z = 0.5; head.rotation.z = 0.25; }
  return p; }
function vacancy(x, z) { const c = new THREE.Group(); c.position.set(x, 0.3, z); scene.add(c); box(1.1, 0.14, 1.1, '#9AA29D', 0, 0.7, 0, c); box(1.1, 1.1, 0.14, '#9AA29D', 0, 0.84, -0.5, c);
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.45, 0.45]) box(0.1, 0.7, 0.1, '#7E8782', sx, 0, sz, c);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 28), new THREE.MeshBasicMaterial({ color: STATUS.bad })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.36, z); scene.add(ring); }
const STAFF = [];
// factory office: the subdomain's data owner and BI partner sit at the desks; it stands in front of the docks, past the bypass belt
let OFFICE = [], OFFICE_POS = [36, ZB + 8];
{ const staff = OFFICE = [{ role: 'st', n: hasRole('st') ? (PEOPLE.st?.n || 'assigned') : null }, { role: 'bp', n: hasRole('bp') ? (PEOPLE.bp?.n || 'assigned') : null }];
  const O = buildOffice(staff); O.g.scale.setScalar(1.3); O.g.position.set(36, 0.3, ZB + O.d * 0.65 + 3); scene.add(O.g); OFFICE_POS = [36, O.g.position.z];
  const el = document.createElement('div'); el.className = 'lbl staff office';
  el.innerHTML = `<span>Office</span>${O.seats.map(s => `<b class="${s.p.n ? '' : 'vac'}">${s.p.n || 'vacancy'} <em>${s.p.role === 'st' ? 'data owner' + (s.p.n ? ', ' + MOOD_LABEL[MOOD] : '') : 'BI partner'}</em></b>`).join('')}`;
  document.getElementById('labels').appendChild(el); STAFF.push({ el, always: true, p: new THREE.Vector3(36, 6.2, O.g.position.z) }); }
{ const d1 = DOCKS[0], st0 = stores[0], h0 = halls[0], ai = DOCKS[2];
  const spots = [
    ['cur', 'Warehouse keeper (metrics curator)', st0.x - st0.w / 2 - 2.5, st0.z + st0.d / 2 + 2, { suit: css('--key', '#7A4E9C') }],
    ['ai', 'AI technician', ai.x - ai.w / 2 - 3, ai.z, { suit: css('--accent', '#0A7684') }],
  ];
  spots.forEach(([k, title, x, z, o]) => { const on = hasRole(k); if (on) person(x, z, { ...o, ry: -0.6 }); else vacancy(x, z);
    const el = document.createElement('div'); el.className = 'lbl staff' + (on ? '' : ' vac');
    el.innerHTML = on ? `<span>${title}</span><b>${PEOPLE[k]?.n || 'assigned'}</b>${k === 'st' ? `<em>${MOOD_LABEL[MOOD]}</em>` : ''}` : `<span>${title}</span><b>vacancy</b>`;
    document.getElementById('labels').appendChild(el); STAFF.push({ el, p: new THREE.Vector3(x, 5.2, z) }); }); }
// building color: health on a continuous scale in soft tones (status -line tokens)
const soft = (k, fb) => { const c = new THREE.Color(css(`--${k}-line`, fb)); return DARK ? c.lerp(new THREE.Color(css(`--${k}`, fb)), 0.45) : c; };
const TONE = { bad: soft('bad', '#EDC4BE'), warn: soft('warn', '#EED39C'), ok: soft('ok', '#B8DDC6'), cert: soft('key', '#DCC6E6'), none: new THREE.Color(css('--line', '#DCE3E6')) };
function tone(f, lo = TONE.bad, mid = TONE.warn, hi = TONE.ok) { return f < 0.5 ? lo.clone().lerp(mid, f / 0.5) : mid.clone().lerp(hi, (f - 0.5) / 0.5); }
function tintBuilding(b, col) { if (!b.tint) return; b.tint.wallM.color.copy(col); b.tint.roofM.color.copy(col).lerp(new THREE.Color('#ffffff'), 0.45); b.tint.ribM.color.copy(col).multiplyScalar(0.92); }

// ---------- defects pile in the yard: one crate per unhealthy object ----------
{ const piles = []; [...GROUPS].forEach(b => { const bad = Math.min(48, b.n - b.good); for (let k = 0; k < bad; k++) { const layer = Math.floor(k / 12), r = k % 12, row = Math.floor(r / 6), col = r % 6;
    piles.push([b.x - b.w / 2 + 1.2 + col * 1.05 + layer * 0.5, 0.3 + layer * 0.78 + 0.4, b.z + b.d / 2 + 1.4 + row * 1.05 + layer * 0.25]); } });
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.75, 0.95), M(STATUS.bad), piles.length); pm.castShadow = true;
  piles.forEach((p, k) => pm.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (k * 0.37) % 0.5, 0)), new THREE.Vector3(1, 1, 1)))); scene.add(pm); }

// ---------- pipes from raw materials to workshops ----------
const SRC_LINKS = JOBS_D ? { s1: ['w1', 'w2', 'w3', 'w5'], s2: ['w1', 'w4', 'w5'], s3: ['w4'], s4: ['w2', 'w3'] }
  : { s1: halls.map(h => h.id), s2: halls.filter((h, i) => i % 2 === 0).map(h => h.id), s3: [halls[halls.length - 1].id] };
if (JOBS_D) SRC_LINKS.s2.push('wc');
function pipe(a, b2) { const len = Math.hypot(b2.x - a.x, b2.z - a.z); if (len < 0.01) return; const m = mesh(new THREE.CylinderGeometry(0.42, 0.42, len, 10), M('#C7CDC9'), (a.x + b2.x) / 2, a.y, (a.z + b2.z) / 2);
  m.rotation.z = Math.abs(b2.x - a.x) > 0.01 ? Math.PI / 2 : 0; m.rotation.x = Math.abs(b2.z - a.z) > 0.01 ? Math.PI / 2 : 0; }
{ const PX = -46; let k = 0;
  SOURCES.forEach(s => SRC_LINKS[s.id].forEach(hid => { const h = halls.find(x => x.id === hid), y = 1.2 + (k++ % 3) * 0.95, px = PX + (k % 4) * 1.1;
    const pts = [{ x: s.x + 3.2, y, z: s.z }, { x: px, y, z: s.z }, { x: px, y, z: h.z + ((k % 3) - 1) * 1.2 }, { x: h.x - h.w / 2, y, z: h.z + ((k % 3) - 1) * 1.2 }];
    for (let i = 1; i < pts.length; i++) pipe(pts[i - 1], pts[i]); })); }

// ---------- conveyors ----------
const HALL_TO = JOBS_D ? { w1: ['m4', 'm3'], w2: ['m1', 'm2'], w3: ['m3'], w4: ['m1'], w5: ['m2', 'm4'] }
  : Object.fromEntries(halls.map((h, i) => [h.id, [...new Set([stores[i % stores.length].id, ...(i % 2 && stores.length > 1 ? [stores[(i + 1) % stores.length].id] : [])])]]));
const STORE_TO = JOBS_D ? { m1: ['d1', 'd2', 'd3'], m2: ['d1', 'd2'], m3: ['d1', 'd4'], m4: ['d1', 'd3', 'd4'] }
  : Object.fromEntries(stores.map((m, j) => [m.id, ['d1', 'd' + (2 + j % 3)]]));
const DIRECT = JOBS_D ? { w1: ['d1', 'd4'], w2: ['d1'], w3: ['d4'], w4: ['d1'], w5: ['d1', 'd4'] }
  : Object.fromEntries(halls.map((h, i) => [h.id, i % 2 ? ['d1'] : ['d1', 'd4']]));
if (JOBS_D) { HALL_TO.wc = ['m1', 'm4']; DIRECT.wc = ['d1']; }
const byId = id => ALL.find(b => b.id === id);
const PATHS = [];
const exitE = b => b.x + b.w / 2, entryW = b => b.x - b.w / 2;
Object.entries(HALL_TO).forEach(([h, to]) => to.forEach(s => { const A = byId(h), B = byId(s); PATHS.push({ from: A, to: B, pts: [[exitE(A), A.z], [BUS1, A.z], [BUS1, B.z], [entryW(B), B.z]] }); }));
Object.entries(STORE_TO).forEach(([s, to]) => to.forEach(dk => { const A = byId(s), B = byId(dk); PATHS.push({ from: A, to: B, pts: [[exitE(A), A.z], [BUS2, A.z], [BUS2, B.z], [entryW(B), B.z]] }); }));
Object.entries(DIRECT).forEach(([h, to]) => to.forEach(dk => { const A = byId(h), B = byId(dk); PATHS.push({ from: A, to: B, direct: true, pts: [[exitE(A), A.z], [BUS1, A.z], [BUS1, ZB], [BUS2, ZB], [BUS2, B.z], [entryW(B), B.z]] }); }));
const BELT_Y = 2.4, spans = { bus1: [1e9, -1e9], bus2: [1e9, -1e9], lane: [BUS1, BUS2] }, spurs = new Map();
PATHS.forEach(p => { for (let i = 1; i < p.pts.length; i++) { const [x1, z1] = p.pts[i - 1], [x2, z2] = p.pts[i];
  if (x1 === x2 && (x1 === BUS1 || x1 === BUS2)) { const s = spans[x1 === BUS1 ? 'bus1' : 'bus2']; s[0] = Math.min(s[0], z1, z2); s[1] = Math.max(s[1], z1, z2); }
  else if (z1 === z2 && z1 === ZB) {} else spurs.set(`${x1.toFixed(1)}|${z1.toFixed(1)}|${x2.toFixed(1)}|${z2.toFixed(1)}`, [x1, z1, x2, z2]); } });
const beltMat = M(env('#4C5651', 0.8)), railMat = M('#8A948E'), postMat = M('#A6AEA9');
function belt(x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1), along = Math.abs(x2 - x1) > Math.abs(z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  const w = 1.7, L = len + w;
  const b = mesh(new THREE.BoxGeometry(along ? L : w, 0.32, along ? w : L), beltMat, cx, BELT_Y, cz);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(along ? L : 0.14, 0.4, along ? 0.14 : L), railMat, cx + (along ? 0 : s * w / 2), BELT_Y + 0.2, cz + (along ? s * w / 2 : 0));
  const n = Math.max(1, Math.floor(len / 5)); for (let i = 0; i <= n; i++) { const t = i / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t; mesh(new THREE.BoxGeometry(0.3, BELT_Y, 0.3), postMat, x, BELT_Y / 2, z); }
  return b;
}
spurs.forEach(([x1, z1, x2, z2]) => belt(x1, z1, x2, z2));
belt(BUS1, spans.bus1[0], BUS1, Math.max(spans.bus1[1], ZB)); belt(BUS2, Math.min(spans.bus2[0], ZB), BUS2, Math.max(spans.bus2[1], ZB)); belt(BUS1, ZB, BUS2, ZB);

// ---------- ground paint: zones and subdomain indicators ----------
// paint on the asphalt: a canvas texture on a plane lying on the yard; it rotates with the scene
const PPU = 22, PAINT = [];
function groundPaint(x0, z0, x1, z1, draw) {
  const W = x1 - x0, D = z1 - z0, cw = Math.min(4096, Math.round(W * PPU)), ch = Math.min(4096, Math.round(D * PPU));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.95, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.32, (z0 + z1) / 2); m.receiveShadow = true; m.renderOrder = 1; scene.add(m);
  const job = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, cw, ch); draw(g, cw, ch, cw / W); tex.needsUpdate = true; };
  PAINT.push(job); job(); return m;
}
const FONT = css('--font-ui', '"Source Sans 3", "Segoe UI", system-ui, sans-serif');
const INK = css('--ink', '#13212A'), INK2 = css('--ink2', '#4D5F69'), INK3 = css('--ink3', '#7F909A');
function zone(list, { pad = 3.5, front = 6, label, sub, color, align = 'left', wrap = true }) {
  const xs = list.flatMap(b => [b.x - (b.w || 7) / 2, b.x + (b.w || 7) / 2]), zs = list.flatMap(b => [b.z - (b.d || 7) / 2, b.z + (b.d || 7) / 2]);
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, z0 = Math.min(...zs) - pad, z1 = Math.max(...zs) + pad + front;
  return groundPaint(x0, z0, x1, z1, (g, w, h, u) => {
    g.fillStyle = color + '1F'; g.strokeStyle = color + 'CC'; g.lineWidth = 0.28 * u; g.setLineDash([1.4 * u, 0.9 * u]);
    const r = 1.6 * u, i = 0.3 * u; g.beginPath(); g.roundRect(i, i, w - 2 * i, h - 2 * i, r); g.fill(); g.stroke(); g.setLineDash([]);
    g.fillStyle = color; g.font = `750 ${2.6 * u}px ${FONT}`; g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = `${0.12 * u}px`;
    const L = label.toUpperCase(), maxW = w - 2.8 * u; let lines = [L];
    if (wrap && g.measureText(L).width > maxW && L.includes(' ')) { const ws = L.split(' '); lines = [ws.slice(0, Math.ceil(ws.length / 2)).join(' '), ws.slice(Math.ceil(ws.length / 2)).join(' ')]; }
    while (Math.max(...lines.map(t => g.measureText(t).width)) > maxW) { const fs = parseFloat(g.font.split(' ')[1]) * 0.9; g.font = `750 ${fs}px ${FONT}`; }
    const lh = parseFloat(g.font.split(' ')[1]) * 1.05, base = h - (sub ? 2.9 : 1.4) * u;
    const tx = align === 'right' ? w - 1.4 * u : 1.4 * u; g.textAlign = align;
    lines.forEach((t, k) => g.fillText(t, tx, base - (lines.length - 1 - k) * lh));
    if (sub) { g.font = `500 ${1.25 * u}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = '0px'; g.fillStyle = color + 'CC'; g.fillText(sub, tx, h - 1.1 * u); } g.textAlign = 'left'; });
}
const regHalls = halls.filter(b => !b.certHall), pctOf = a => a.length ? Math.round(100 * a.filter(o => ok(o.s)).length / a.length) : null;
// zone colors: categorical chart series and the key token for certified data marts
const ZC = { src: hex6(css('--s8', '#6E808A')), dm: hex6(css('--s2', '#D08A1E')), cert: hex6(CERT_C), met: hex6(css('--s3', '#8C5BA8')), ship: hex6(css('--s4', '#4E9A68')), nb: hex6(INK3) };
zone(SOURCES, { label: 'Raw materials · DWH', sub: 'sources: Clickstream, Core DWH, Billing (no health score)', color: ZC.src, front: 5 });
zone(regHalls, { label: 'Data marts', sub: `${plural(RAW_DM.length, 'data mart', 'data marts')} without certificate · ${pctOf(RAW_DM) ?? '—'}% healthy`, color: ZC.dm, front: 7 });
zone([CERT_HALL], { label: 'Certified data marts', sub: `${plural(CERT_DM.length, 'data mart', 'data marts')} · ${pctOf(CERT_DM) ?? '—'}% healthy`, color: ZC.cert, front: 7, pad: 4 });
zone(stores, { label: 'Semantic Layer metrics', sub: `${plural(OBJ.met.length, 'metric', 'metrics')} · ${pctOf(OBJ.met) ?? '—'}% healthy`, color: ZC.met, front: 9, align: 'right', wrap: false });
zone(DOCKS, { label: 'Shipping', sub: `${plural(OBJ.dash.length, 'dashboard', 'dashboards')} · AI channels`, color: ZC.ship, front: 5, pad: 4 });

// subdomain indicators, painted large on the ground in front of the factory
{ const SD = SUBS[DI], all = [...OBJ.dm, ...OBJ.met, ...OBJ.dash], hot = all.filter(o => !ok(o.s) && o.pop > P75[o.t]).length;
  const col = v => v == null ? STATUS.grey : v >= 50 ? STATUS.ok : v >= 25 ? STATUS.warn : STATUS.bad;
  const K = [
    ['Health', pctOf(all), '%'], ['Metrics', pctOf(OBJ.met), '%'], ['Data marts', pctOf(OBJ.dm), '%'], ['Certified marts', OBJ.dm.length ? Math.round(100 * CERT_DM.length / OBJ.dm.length) : null, '% share'],
    ['Dashboards', pctOf(OBJ.dash), '%'], ['Output', SD.igs, ' / 100'], ['CPU, 30 days', SD.cpu, ' h'], ['AI Ready', DOM.air, ' / 15'], ['Issues', hot, ''],
  ];
  const x0 = -66, x1 = 40, z0 = ZB + 3.5, z1 = ZB + 25;
  groundPaint(x0, z0, x1, z1, (g, w, h, u) => {
    g.fillStyle = INK; g.font = `700 ${3.6 * u}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = `${0.1 * u}px`;
    const nm = DOM.l2.toUpperCase(); g.fillText(nm, 0.6 * u, 3.8 * u); const nw = g.measureText(nm).width;
    g.font = `500 ${1.5 * u}px ${FONT}`; g.fillStyle = INK2; if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillText(`${DOM.l1} · subdomain indicators · health score ${fmtDate(SNAPSHOT)}`, 0.6 * u + nw + 1.6 * u, 3.6 * u);
    const per = Math.ceil(K.length / 2), cw = (w - 1.2 * u) / per; g.strokeStyle = hex6(INK) + '33'; g.lineWidth = 0.12 * u;
    g.beginPath(); g.moveTo(0.6 * u, 5.2 * u); g.lineTo(w - 0.6 * u, 5.2 * u); g.stroke();
    K.forEach(([l, v, unit], k) => { const row = Math.floor(k / per), x = 0.6 * u + (k % per) * cw, y = 9.4 * u + row * 8.6 * u;
      const isPct = unit.startsWith('%'), shown = v == null ? '—' : l === 'CPU, 30 days' ? fmtK(v) : String(Math.round(v * 10) / 10);
      g.fillStyle = l === 'CPU, 30 days' || l === 'AI Ready' ? INK : l === 'Issues' ? (v ? STATUS.bad : STATUS.ok) : l === 'Certified marts' ? col((v ?? 0) * 2) : col(v);
      g.font = `750 ${3.4 * u}px ${FONT}`; g.fillText(shown, x, y);
      const vw = g.measureText(shown).width; g.font = `600 ${1.4 * u}px ${FONT}`; g.fillStyle = INK2; g.fillText(v == null ? '' : unit.trim(), x + vw + 0.4 * u, y);
      g.font = `500 ${1.4 * u}px ${FONT}`;
      if (l === 'Issues') { const t = 1.5 * u, ty = y + 2.2 * u - t * 0.9; g.strokeStyle = STATUS.bad; g.lineWidth = 0.18 * u; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(x + t / 2, ty); g.lineTo(x + t, ty + t * 0.9); g.lineTo(x, ty + t * 0.9); g.closePath(); g.stroke();
        g.fillStyle = STATUS.bad; g.fillRect(x + t / 2 - 0.09 * u, ty + t * 0.3, 0.18 * u, t * 0.32); g.fillRect(x + t / 2 - 0.09 * u, ty + t * 0.68, 0.18 * u, 0.16 * u);
        g.fillStyle = INK2; g.fillText(l, x + t + 0.5 * u, y + 2.2 * u); } else g.fillText(l, x, y + 2.2 * u); });
  });
  document.fonts?.ready.then(() => PAINT.forEach(f => f())); }

// crates: healthy products and defects
const BOXES = [];
PATHS.forEach((p, pi) => {
  const seg = []; let L = 0; for (let i = 1; i < p.pts.length; i++) { const [x1, z1] = p.pts[i - 1], [x2, z2] = p.pts[i], l = Math.hypot(x2 - x1, z2 - z1); seg.push([x1, z1, x2, z2, L, l]); L += l; }
  p.seg = seg; p.L = L;
  const maxFlow = Math.max(1, ...[...halls, ...stores].map(b => b.use)), dens = 0.3 + 1.7 * Math.sqrt(p.from.use / maxFlow), n = Math.max(3, Math.round(L / 4.2 * dens));
  p.dens = dens;
  for (let k = 0; k < n; k++) BOXES.push({ p, t: (k / n) * L + (hash(pi + ':' + k) % 100) / 100, u: (hash('b' + pi + k) % 1000) / 1000 });
});
const boxMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.75, 0.95), new THREE.MeshStandardMaterial({ roughness: 0.6 }), BOXES.length);
boxMesh.castShadow = true; scene.add(boxMesh);
const C = new THREE.Color(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
let layer = 'health';
// popularity ramp: accent-soft → accent → a deeper accent
const HEAT = (() => { const a = new THREE.Color(css('--accent-soft', '#DDEFF1')), b = new THREE.Color(css('--accent', '#0A7684')), c = b.clone().multiplyScalar(DARK ? 1.5 : 0.55);
  return [0, 0.33, 0.66, 1, 1.5].map(t => '#' + (t <= 1 ? a.clone().lerp(b, t) : b.clone().lerp(c, t - 1)).getHexString()); })();
const USES = () => { const u = [...halls, ...stores, DOCKS[0]].map(x => x.use || 0).filter(v => v > 0); return u.length ? u : [1]; };
const heatOf = b => { const u = USES(), lo = Math.log(Math.min(...u)), hi = Math.log(Math.max(...u)); const f = b.use > 0 ? (Math.log(b.use) - lo) / Math.max(1e-6, hi - lo) : 0; return HEAT[Math.min(4, Math.floor(f * 4.999))]; };
function paintLayer() {
  BOXES.forEach((b, k) => { const f = b.p.from; boxMesh.setColorAt(k, C.set(layer === 'health' ? (b.u > f.share ? STATUS.bad : STATUS.ok) : layer === 'cert' ? (b.u < f.cert ? CERT_C : NONE_C) : heatOf(f))); });
  boxMesh.instanceColor.needsUpdate = true;
  const maxU = Math.max(...[...halls, ...stores, DOCKS[0]].map(x => x.use || 0));
  [...GROUPS, DOCKS[0]].forEach(b => tintBuilding(b, !b.n ? TONE.none.clone() : layer === 'health' ? tone(b.share) : layer === 'cert' ? TONE.none.clone().lerp(TONE.cert, Math.min(1, b.cert * 2.2)) : new THREE.Color(heatOf(b)).lerp(new THREE.Color(DARK ? '#000000' : '#ffffff'), 0.15)));
  [...GROUPS, DOCKS[0]].forEach(b => layer === 'health' ? setBand(b, b.share, STATUS.ok, STATUS.bad) : layer === 'cert' ? setBand(b, b.cert, CERT_C, NONE_C) : setBand(b, 1, heatOf(b), heatOf(b)));
  LABELS.forEach(L => { L.el.innerHTML = labelHtml(L.b); L.w = 0; });
  document.querySelectorAll('#layers button').forEach(x => x.setAttribute('aria-pressed', x.dataset.l === layer));
  document.getElementById('legend').innerHTML = LEGEND[layer];
}
function moveBoxes(dt) {
  BOXES.forEach((b, k) => { b.t = (b.t + dt * 4.2) % b.p.L; let s = b.p.seg[0]; for (const x of b.p.seg) if (b.t >= x[4] && b.t <= x[4] + x[5]) { s = x; break; }
    const f = (b.t - s[4]) / s[5]; P.set(s[0] + (s[2] - s[0]) * f, BELT_Y + 0.55, s[1] + (s[3] - s[1]) * f); boxMesh.setMatrixAt(k, M4.compose(P, Q, S)); });
  boxMesh.instanceMatrix.needsUpdate = true; boxMesh.computeBoundingSphere();
}
// smoke from workshop chimneys
const smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: DARK ? '#8A979E' : '#ffffff', transparent: true, opacity: DARK ? 0.4 : 0.55, roughness: 1, depthWrite: false }), chimneys.length * 5);
scene.add(smoke);
function moveSmoke(t) { chimneys.forEach((c, i) => { for (let k = 0; k < 5; k++) { const p = (t * 0.22 + k / 5 + i * 0.17) % 1; smoke.setMatrixAt(i * 5 + k, M4.compose(P.set(c.x + p * 3, c.y + p * 7, c.z + p * 1.5), Q, S.clone().setScalar(0.5 + p * 1.6))); } }); smoke.instanceMatrix.needsUpdate = true; }

// ---------- labels ----------
const labelBox = document.getElementById('labels'), LABELS = [];
const short = b => b.name.replace(/^(Workshop|Warehouse|Dock) /, '').replace(/"/g, '');
function labelHtml(b) {
  if (!b.n) return `<span class="dot grey"></span>${short(b)}<em>${b.ai ? b.ai.split(': ')[1] : b.certHall ? 'no certified marts' : b.objs ? 'not tagged' : ''}</em>`;
  const v = layer === 'health' ? `${pct(b.good, b.n)}%` : layer === 'cert' ? `${Math.round(b.cert * 100)}% cert.` : `${fmt(b.use)}`;
  const dot = layer === 'health' ? cls(b.share) : layer === 'cert' ? (b.cert >= 0.3 ? 'ok' : 'warn') : 'ok';
  return `<span class="dot ${dot}"></span>${short(b)}<em>${v} · ${b.n}</em>${b.hot && layer === 'health' ? `<b class="bn" title="issues">${PROB}${b.hot}</b>` : ''}`;
}
ALL.forEach(b => { const el = document.createElement('div'); const st = b.share == null ? 'grey' : cls(b.share);
  el.className = 'lbl' + (st === 'bad' && b.n ? ' hot' : ''); el.innerHTML = labelHtml(b);
  labelBox.appendChild(el); LABELS.push({ el, b, p: new THREE.Vector3(b.x, (b.h || 6) + (b.kind === 'hall' ? 4 : 2.5), b.z) }); });
// ---------- neighbour factories: suppliers of this factory's data on the left, consumers on the right ----------
// a neighbour is a schematic building; its color is the quality of the exchanged data (share of weight on the supplier's healthy data marts),
// a dashed line runs from suppliers to the raw material sources and from the docks to consumers; click lists the exchanged objects
const NB = { inn: SUBX.inn[DI] || [], out: SUBX.out[DI] || [] }, NBQ = { inn: qAll(NB.inn), out: qAll(NB.out) }, NLABELS = [], NBS = [];
const NCOL = { inn: css('--rel-sup', '#4F79A6'), out: css('--rel-con', '#B04E8C') };
const NALL = {};
function dashLine(a, b, col) { const pts = [], n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)); for (let i = 0; i < n; i += 2) { const t0 = i / n, t1 = Math.min(1, (i + 1) / n);
    const g = new THREE.PlaneGeometry(Math.hypot(b[0] - a[0], b[1] - a[1]) / n, 0.5); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(b[1] - a[1], b[0] - a[0]); m.position.set(a[0] + (b[0] - a[0]) * (t0 + t1) / 2, 0.36, a[1] + (b[1] - a[1]) * (t0 + t1) / 2); scene.add(m); } }
['inn', 'out'].forEach(dir => { const list = NB[dir].slice(0, 5); if (!list.length) return;
  // building size is the exchange volume (views and queries); the column sits well beyond the yard
  const mx = Math.max(...list.map(e => e.w), 1), x = dir === 'inn' ? -138 : 112, sz = list.map(e => { const k = Math.sqrt(e.w / mx); return { w: 5 + 9 * k, d: 4 + 6 * k, h: 2 + 9 * k }; });
  const tot = sz.reduce((t, v) => t + v.d, 0) + (list.length - 1) * 7; let zc = 10 - tot / 2;
  const from = dir === 'inn' ? SOURCES.map(s => [s.x - s.w / 2, s.z]) : DOCKS.map(s => [s.x + s.w / 2 + 2, s.z]), ALL = { nb: dir, all: true, name: dir === 'inn' ? 'Data suppliers' : 'Data consumers', x, z: 10 }; NALL[dir] = ALL;
  list.forEach((e, k) => { const { w, d, h } = sz[k], z = zc + d / 2, q = e.q ?? 0; zc += d + 7;
    const g = new THREE.Group(); scene.add(g); const b = { nb: dir, e, x, z, w, d, h, id: 'nb' + dir + k, name: e.sub.l2, grp: g };
    mesh(new THREE.BoxGeometry(w, h, d), M(env('#E4E6E2', 0.6)), x, h / 2 + 0.3, z, g); mesh(new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3), M(env('#CDD1CB', 0.6)), x, h + 0.42, z, g);
    g.traverse(o => { if (o.isMesh) { o.userData.b = b; pickable.push(o); } }); NBS.push(b);
    const el = document.createElement('div'); el.className = 'lbl nb'; el.innerHTML = `<span class="dot ${cls(q)}"></span>${e.sub.l2}<em>${Math.round(q * 100)}%</em>`;
    el.title = `${e.sub.l1} · ${dir === 'inn' ? `we read ${plural(e.list.length, 'of its data marts', 'of its data marts')}` : `reads ${plural(e.list.length, 'of our data marts', 'of our data marts')}`} · ${fmt(e.w)} views and queries · ${Math.round(q * 100)}% on healthy data marts`;
    el.onclick = () => go({ b }); labelBox.appendChild(el); NLABELS.push({ el, b, p: new THREE.Vector3(x, h + 1, z) }); });
  // one line per column: from suppliers to the raw material sources, from the docks to consumers
  const end = from.reduce((t, p) => t + p[1], 0) / from.length, ex = dir === 'inn' ? Math.min(...from.map(p => p[0])) : Math.max(...from.map(p => p[0])), wx = Math.max(...sz.map(v => v.w)) / 2 + 9;
  dashLine(dir === 'inn' ? [x + wx, 10] : [ex, end], dir === 'inn' ? [ex, end] : [x - wx, 10], NCOL[dir]);
  // on the ground: column name and exchange summary; click the pad to list all suppliers or consumers
  const more = NB[dir].length - list.length, n = NB[dir].length, objs = NB[dir].reduce((t, e) => t + e.list.length, 0);
  const pad = zone(NBS.filter(b => b.nb === dir), { label: dir === 'inn' ? 'Suppliers' : 'Consumers', color: hex6(NCOL[dir]), front: 9, pad: 5,
    sub: `${dir === 'inn' ? 'quality of consumed data' : 'quality of supplied data'} ${Math.round((NBQ[dir] ?? 0) * 100)}% · ${plural(n, dir === 'inn' ? 'supplier' : 'consumer', dir === 'inn' ? 'suppliers' : 'consumers')} · ${fmt(objs)} data marts${more > 0 ? ` · ${more} more not on the map` : ''}` });
  if (pad) { pad.userData.b = ALL; pickable.push(pad); } });
function renderNeighbor(b) { const dir = b.nb, inn = dir === 'inn';
  if (b.all) { head(inn ? 'Who supplies data to this factory' : 'Who consumes this factory\'s data', b.name);
    db.innerHTML = `<div class="stat"><div><b>${Math.round((NBQ[dir] ?? 0) * 100)}%</b><span>${inn ? 'quality of consumed data' : 'quality of supplied data'}</span></div><div><b>${NB[dir].length}</b><span>${inn ? 'suppliers' : 'consumers'}</span></div><div><b>${fmt(NB[dir].reduce((t, e) => t + e.list.length, 0))}</b><span>data marts exchanged</span></div></div>
      <p style="font-size:12.5px;color:var(--ink2)">Quality is the share of ${inn ? 'views and queries of our objects that rely on the suppliers\' healthy data marts' : 'consumers\' views and queries that rely on our healthy data marts'}.</p>
      ${NB[dir].map((e, k) => `<div class="row" data-nb="${k}"><span class="dot ${cls(e.q ?? 0)}"></span><span>${e.sub.l2}<small style="display:block;color:var(--ink3);font-weight:400">${e.sub.l1}</small></span><em>${Math.round((e.q ?? 0) * 100)}% · ${e.list.length}</em></div>`).join('')}`;
    db.insertAdjacentHTML('beforeend', econHtml(inn ? 'The factory\'s balance as a consumer: supplier ratings, contracts, paying for others\' CPU.' : 'The factory\'s balance as a supplier: rating, contracts with consumers, how our CPU is split.'));
    db.querySelectorAll('[data-nb]').forEach(r => r.onclick = () => { const e = NB[dir][+r.dataset.nb], nb = NBS.find(x => x.e === e); go({ b: nb || { nb: dir, e, name: e.sub.l2, x: b.x, z: b.z } }); }); return; }
  const e = b.e, bad = e.list.filter(x => !ok(x.o.s)), wBad = bad.reduce((t, x) => t + x.w, 0), wAll = e.list.reduce((t, x) => t + x.w, 0);
  head(inn ? `Data supplier · ${e.sub.l1}` : `Data consumer · ${e.sub.l1}`, e.sub.l2);
  db.innerHTML = `<div class="stat"><div><b>${Math.round((e.q ?? 0) * 100)}%</b><span>${inn ? 'quality of consumed data' : 'quality of supplied data'}</span></div><div><b>${e.list.length}</b><span>${inn ? 'of its data marts we read' : 'of our data marts it reads'}</span></div><div><b>${fmt(wAll)}</b><span>views and queries</span></div></div>
    ${bad.length ? `<p style="font-size:12.5px;color:var(--ink2)">${Math.round(wBad / (wAll || 1) * 100)}% ${inn ? 'of our usage relies on the supplier\'s unhealthy data marts' : 'of the consumer\'s usage relies on our unhealthy data marts'}: ${bad.length} of ${e.list.length}.</p>` : ''}
    <div class="sec"><span>${inn ? 'Its data marts we read' : 'Our data marts it reads'}</span><span>usage</span></div>
    ${e.list.slice(0, 40).map(x => { const fails = checksOf(x.o).filter(c => c[2] === false).map(c => c[0].toLowerCase()); return `<div class="row nbo"><span class="dot ${x.o.s >= 2 ? 'ok' : x.o.s === 1 ? 'warn' : 'bad'}"></span><span title="${x.o.name}">${x.o.name}<small>${x.o.s >= 2 ? 'healthy' : 'unhealthy'}${fails.length ? ': ' + fails.slice(0, 2).join(', ') : ''} · ${plural(x.by.size, inn ? 'of our objects' : 'of its objects', inn ? 'of our objects' : 'of its objects')} · ${fmt(x.o.pop)} queries</small></span><em>${fmt(x.w)}</em></div>`; }).join('')}
    <div class="acts">${inn ? `<button class="btn stubbtn" disabled title="Placeholder: arrives together with supply contracts">File a claim with the supplier<small>placeholder</small></button>` : ''}<a class="btn" href="domain.html?d=${e.sub.i}&from=world">Open factory ${e.sub.l2}<small>↗</small></a><a class="btn" href="graph.html?d=${DI}">Factory links<small>↗</small></a></div>
    ${econHtml(inn ? `For ${e.sub.l2}: supplier rating, SLA contract and claims, the share of its CPU our usage pays for.` : `For ${e.sub.l2}: our rating as a supplier, SLA contract, the share of our CPU spent on its usage.`)}`; }

const V = new THREE.Vector3();
function placeStaff() {
  const show = camera.zoom >= 1.5, taken = [...LABELS, ...NLABELS].filter(L => L.el.style.display !== 'none').map(L => L.el.getBoundingClientRect()).filter(r => r.width);
  STAFF.forEach(L => { if (!show && !(L.always && camera.zoom >= 0.95)) { L.el.style.display = 'none'; return; } L.el.style.display = '';
    V.copy(L.p).project(camera); const x = (V.x * 0.5 + 0.5) * innerWidth, y = (-V.y * 0.5 + 0.5) * innerHeight, w = L.el.offsetWidth, h = L.el.offsetHeight;
    const r = { left: x - w / 2, right: x + w / 2, top: y - h, bottom: y };
    const hit = taken.some(q => r.left < q.right + 4 && r.right + 4 > q.left && r.top < q.bottom + 3 && r.bottom + 3 > q.top);
    L.el.style.display = hit ? 'none' : ''; L.el.style.transform = `translate(${r.left}px, ${r.top}px)`; if (!hit) taken.push(r); }); }
// labels without overlaps: selection → workshops and warehouses with issues → other workshops and warehouses → dashboards → sources →
// AI docks and neighbour factories (only when zoomed in); a label that does not fit is hidden, the panel on the right keeps the full list
const prioOf = L => { const b = L.b; if (!b) return 9; if (b.nb) return 6; if (b.kind === 'tank') return 4; if (b.kind === 'dock') return b.big ? 3 : 5; return b.hot ? 1 : 2; };
const ORDERL = () => [...LABELS, ...NLABELS].sort((a, b) => prioOf(a) - prioOf(b) || (b.b?.hot || 0) - (a.b?.hot || 0) || (b.b?.n || 0) - (a.b?.n || 0));
let LORDER = null;
function placeLabels() { LORDER ||= ORDERL(); const z = camera.zoom, placed = [];
  const sel = L => L.b && state.b === L.b;
  for (const L of LORDER) { const pr = prioOf(L); let show = sel(L) || (pr === 6 ? z >= 0.85 : pr === 5 ? z >= 1.1 : pr === 9 ? z >= 0.85 : true);
    if (show) { if (L.el.style.display === 'none') L.el.style.display = ''; V.copy(L.p).project(camera); const x = (V.x * 0.5 + 0.5) * innerWidth, y = (-V.y * 0.5 + 0.5) * innerHeight;
      if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; } const r = [x - L.w / 2, y - L.h, x + L.w / 2, y];
      if (!sel(L) && placed.some(q => r[0] < q[2] + 4 && r[2] + 4 > q[0] && r[1] < q[3] + 3 && r[3] + 3 > q[1])) show = false;
      else { placed.push(r); L.el.style.transform = `translate(${r[0]}px, ${r[1]}px)`; L.el.style.opacity = state.b && L.b && state.b !== L.b ? 0.45 : 1; } }
    L.el.style.display = show ? '' : 'none'; } }

// ---------- health checks and the agent ----------
const CHECKS = {
  dm: [['Runs on the warehouse engine', 'data mart migrated from the legacy warehouse'], ['Active owner', 'the owner still works at the company'], ['Description', 'the table has a description'], ['Columns described', 'columns have descriptions'], ['Column checkers', 'columns are covered by checks'], ['Checkers passing', 'checks did not fail'], ['CPU usage', 'p80 CPU over 30 days is under the threshold'], ['Storage size', 'volume within the norm'], ['Retention', 'TTL is set'], ['BI partner in domain', 'the domain has a BI partner'], ['Live sources', 'no deprecated sources']],
  met: [['Description', 'metric is described in the Semantic Layer'], ['Active owner', 'the owner still works at the company'], ['Usage', 'viewed or used in A/B tests in 90 days'], ['Upstream', 'no deprecated sources'], ['Data', 'has data for the last 30 days']],
  dash: [['Speed', 'loads in under 10 seconds'], ['Errors', 'under 5% of queries fail'], ['On datasets', 'widgets are not on raw queries'], ['Certified datasets', 'sources are certified'], ['Description and README', 'filled in'], ['Active owner', 'the owner still works at the company']],
};
function checks(o) { const list = CHECKS[o.t], h = hash(o.name);
  if (ok(o.s)) return list.map(c => [...c, true]);
  const fails = new Set(); const nf = o.s === 1 ? 1 + (h % 2) : 2 + (h % 2); for (let i = 0; fails.size < nf; i++) fails.add((h >> (i * 3)) % list.length);
  if (o.t === 'met' && o.pop === 0) fails.add(2);
  if (o.t === 'dm' && /_v2$/.test(o.name)) { fails.delete(0); if (!fails.size) fails.add(4); }
  return list.map((c, i) => [...c, !fails.has(i)]); }
const FIX = { 'Active owner': 'Suggesting an owner from change history: the most active author in 90 days', 'Description': 'Writing a description from SQL, lineage and questions asked in the AI Assistant', 'Columns described': 'Describing columns from the calculation code and sample values', 'Column checkers': 'Suggesting column checks: share of NULL in keys, value ranges', 'Checkers passing': 'Investigating check failures: cause and fix', 'CPU usage': 'Suggesting incremental recalculation and partitions', 'Storage size': 'Suggesting a shorter history depth', 'Retention': 'Setting a TTL for old partitions', 'BI partner in domain': 'The domain needs a BI partner: assign one in the Domain Registry', 'Contracts': 'Putting columns under a contract by types and ranges', 'Checkers green': 'Investigating failures: 3 of 9 days are an upstream schedule shift', 'Runs on the warehouse engine': 'Preparing to move the calculation to the warehouse engine', 'Usage': 'No demand: suggesting to archive or replace with a similar metric', 'Upstream': 'Switching to a current source data mart', 'Data': 'Finding out why there is no data for 30 days', 'Speed': 'Finding heavy widgets and suggesting aggregates', 'Errors': 'Fixing failing queries', 'On datasets': 'Moving widgets from raw queries to datasets', 'Certified datasets': 'Replacing sources with certified datasets', 'Description and README': 'Writing a README: who the dashboard is for and how to read it' };
// demo: links to the tools are placeholders
const TOOL = { dm: o => [['Open in Data Catalog', '#'], ['Open in SQL Workbench', '#']], met: () => [['Open in Semantic Layer', '#']], dash: o => [['Open in Dashboards', '#']] };
const KIND = { dm: 'Data mart', met: 'Metric', dash: 'Dashboard' }, UNIT = { dm: 'queries', met: 'uses', dash: 'views' };

// ---------- navigation and panel ----------
const drawer = document.getElementById('drawer'), dh = document.getElementById('dh'), db = document.getElementById('db'), crumb = document.getElementById('crumb');
const state = { b: null, o: null, agent: false, filter: 'all' };
let fly = null;
function flyTo(x, z, zoom) { fly = { t: 0, t0: controls.target.clone(), t1: new THREE.Vector3(x, 0, z), z0: camera.zoom, z1: zoom, p0: camera.position.clone() }; }
function go(next) {
  Object.assign(state, { b: null, o: null, agent: false, filter: 'all' }, next);
  if (state.b?.nb) flyTo(state.b.x * 0.85, state.b.z + 8, 1.05); else if (state.b && !state.o) flyTo(state.b.x + 13, state.b.z - 2, 2.4);
  if (!state.b && !state.o) flyTo(HOME[0], HOME[1], HOME[2]);
  render();
}
function render() {
  const { b, o, agent } = state;
  crumb.innerHTML = `<a href="index.html#/s/${DI}">Workspace</a> · <a href="graph.html?d=${DI}">Links</a> · <a href="world.html?s=${DI}&from=plant">Go to world</a> / <a data-c="root">Factory</a>${b ? ` / <a data-c="b">${b.name}</a>` : ''}${o ? ` / <b>${o.name}</b>` : ''}${agent ? ' / agent' : ''}`;
  crumb.querySelector('[data-c=root]').onclick = () => go({}); crumb.querySelector('[data-c=b]')?.addEventListener('click', () => go({ b }));
  if (agent) return renderAgent(o, b);
  if (o) return renderObj(o, b);
  if (b?.nb) return renderNeighbor(b);
  if (b) return renderBuilding(b);
  renderRoot();
}
function head(k, title) { dh.innerHTML = `<div class="k">${k}</div><h2>${title}</h2>`; }
const row = (o) => `<div class="row" data-o="${o.t}:${o.name}"><span class="dot ${o.s >= 2 ? 'ok' : o.s === 1 ? 'warn' : 'bad'}"></span><span title="${o.name}">${o.name}</span><em>${fmt(o.pop)}</em></div>`;
function bindRows(b) { db.querySelectorAll('[data-o]').forEach(r => r.onclick = () => { const [t, ...n] = r.dataset.o.split(':'); const o = OBJ[t].find(x => x.name === n.join(':')); go({ b: b || findGroup(o), o }); }); }
const findGroup = o => [...GROUPS, ...DOCKS].find(g => g.objs && g.objs.includes(o));
function renderRoot() {
  const all = [...OBJ.dm, ...OBJ.met, ...OBJ.dash], good = all.filter(x => ok(x.s)).length;
  const hot = all.filter(x => !ok(x.s)).sort((a, b) => b.pop / (b.t === 'dash' ? 4 : 1) - a.pop / (a.t === 'dash' ? 4 : 1)).slice(0, 8);
  head('Subdomain factory', `${DOM.l2}: raw materials, workshops, warehouses, shipping`);
  db.innerHTML = `<div class="stat"><div><b>${pct(good, all.length)}%</b><span>healthy products</span></div><div><b>${fmt(all.length - good)}</b><span>defects</span></div><div><b>${GROUPS.filter(g => g.share < 0.25).length}</b><span>workshops in the red zone</span></div></div>
    <div class="sec"><span>Issues: popular and unhealthy</span></div>${hot.map(row).join('')}
    <div class="sec"><span>Workshops and warehouses${GROUPS.some(g => g.auto) ? ' <span class="mock">grouped by words in names</span>' : ''}</span><span>healthy</span></div>
    ${[...GROUPS, DOCKS[0]].map(g => `<div class="row" data-b="${g.id}"><span class="dot ${cls(g.share)}"></span><span>${g.name}</span><em>${pct(g.good, g.n)}% of ${g.n}</em></div>`).join('')}
    <div class="sec"><span>AI shipping <span class="mock">example</span></span></div>
    ${DOCKS.slice(1).map(g => `<div class="row" data-b="${g.id}"><span class="dot ${cls(g.share)}"></span><span>${g.name.replace('Dock ', '')}</span><em>${g.ai}</em></div>`).join('')}
    <div class="sec"><span>Data exchange with other factories</span><span>quality</span></div>
    ${['inn', 'out'].filter(k => NB[k].length).map(k => `<div class="row" data-nball="${k}"><span class="dot ${cls(NBQ[k] ?? 0)}"></span><span>${k === 'inn' ? 'Suppliers' : 'Consumers'} · ${NB[k].length}</span><em>${Math.round((NBQ[k] ?? 0) * 100)}% ${k === 'inn' ? 'consumed' : 'supplied'}</em></div>`).join('') || '<div class="row"><span></span><span style="color:var(--ink3)">no exchange</span><em></em></div>'}
    <div class="sec"><span>Office</span></div>
    ${OFFICE.map(p => `<div class="row"><span class="dot ${p.n ? 'ok' : 'bad'}"></span><span>${p.n || 'vacancy'}</span><em>${p.role === 'st' ? 'data owner' : 'BI partner'}</em></div>`).join('')}`;
  db.querySelectorAll('[data-nball]').forEach(r => r.onclick = () => go({ b: NALL[r.dataset.nball] }));
  bindRows(); db.querySelectorAll('[data-b]').forEach(r => r.onclick = () => go({ b: byId(r.dataset.b) }));
}
function renderBuilding(b) {
  const kind = { hall: 'Data mart workshop', store: 'Metrics warehouse', dock: 'Shipping dock', tank: 'Raw material source' }[b.kind];
  head(kind, b.name);
  if (!b.objs) { db.innerHTML = b.kind === 'tank' ? `<p style="color:var(--ink2)">The source is not covered by the health score: its problems show only as failures of the workshops it feeds.</p><div class="sec"><span>Feeds</span></div>${SRC_LINKS[b.id].map(id => `<div class="row" data-b="${id}"><span class="dot ${cls(byId(id).share)}"></span><span>${byId(id).name}</span><em></em></div>`).join('')}<div class="acts"><a class="btn" href="#" data-demo>Find the source in Data Catalog<small>↗</small></a></div>`
      : `<div class="stat"><div><b>${pct(b.share * 100, 100)}%</b><span>answers through healthy metrics</span></div><div><b>${b.ai.split(': ')[1]}</b><span>${b.ai.split(':')[0]}</span></div><div><b>64%</b><span>accuracy on the golden set</span></div></div><p style="color:var(--ink2)">The AI channel ships answers assembled from warehouse and workshop products. <span class="mock">example</span></p><div class="acts"><button class="btn primary" id="agentAll">Review wrong answers with the agent<small>12 conversations</small></button></div>`;
    db.querySelectorAll('[data-b]').forEach(r => r.onclick = () => go({ b: byId(r.dataset.b) })); return; }
  const f = state.filter, list = b.objs.filter(o => f === 'all' || (f === 'bad' ? !ok(o.s) : ok(o.s))).sort((a, c) => c.pop - a.pop);
  db.innerHTML = `<div class="stat"><div><b>${pct(b.good, b.n)}%</b><span>healthy, ${b.good} of ${b.n}</span></div><div><b>${fmt(b.use)}</b><span>${UNIT[b.objs[0]?.t || 'dm']}</span></div><div><b>${b.n - b.good}</b><span>defects</span></div></div>
    <div class="filters"><button data-f="all" aria-pressed="${f === 'all'}">All</button><button data-f="bad" aria-pressed="${f === 'bad'}">Defects</button><button data-f="ok" aria-pressed="${f === 'ok'}">Healthy</button></div>
    ${list.slice(0, 60).map(row).join('')}${list.length > 60 ? `<div class="sec"><span>${list.length - 60} more</span></div>` : ''}
    <div class="acts"><button class="btn primary" id="agentAll">Run the agent on all workshop defects<small>${plural(b.n - b.good, 'object', 'objects')}</small></button></div>`;
  db.querySelectorAll('[data-f]').forEach(x => x.onclick = () => { state.filter = x.dataset.f; renderBuilding(b); });
  bindRows(b);
  document.getElementById('agentAll').onclick = () => { const worst = b.objs.filter(o => !ok(o.s)).sort((a, c) => c.pop - a.pop)[0]; if (worst) go({ b, o: worst, agent: true }); };
}
function renderObj(o, b) {
  const ch = checks(o), fails = ch.filter(c => !c[2]).length, st = o.s === 3 ? 'healthy and certified' : o.s === 2 ? 'healthy' : o.s === 1 ? 'certified but unhealthy' : 'unhealthy';
  head(`${KIND[o.t]}, ${short(b)}`, o.name);
  const up = 2 + hash(o.name) % 5, down = o.t === 'dash' ? 0 : 3 + hash(o.name + 'd') % 14;
  db.innerHTML = `<div class="stat"><div><b>${fmt(o.pop)}</b><span>${UNIT[o.t]}</span></div><div><b><span class="dot ${o.s >= 2 ? 'ok' : o.s === 1 ? 'warn' : 'bad'}"></span> ${ch.length - fails}/${ch.length}</b><span>${st}</span></div><div><b>${o.s === 1 || o.s === 3 ? 'yes' : 'no'}</b><span>certificate</span></div></div>
    <div class="sec"><span>Health checks <span class="mock">example</span></span><span>${fails ? `${fails} failed` : 'all passed'}</span></div>
    ${ch.map(([n, d, y]) => `<div class="check"><i class="${y ? 'y' : 'n'}">${y ? '✓' : '×'}</i><div>${n}<small>${d}</small></div></div>`).join('')}
    <div class="sec"><span>Flow <span class="mock">example</span></span></div>
    <div class="flow"><div><b>${up}</b><span>sources upstream</span></div><span class="mid">→</span><div><b>${down}</b><span>${o.t === 'dm' ? 'metrics and dashboards downstream' : o.t === 'met' ? 'dashboards and AI answers' : 'consumers'}</span></div></div>
    <div class="acts">${fails ? `<button class="btn primary" id="agent">Run the fixer agent<small>${plural(fails, 'check', 'checks')}</small></button>` : ''}
      ${TOOL[o.t](o).map(([l, u]) => `<a class="btn" href="${u}" data-demo>${l}<small>↗</small></a>`).join('')}
      <a class="btn" href="#" data-demo>Ask the AI Assistant about this object<small>↗</small></a></div>`;
  document.getElementById('agent')?.addEventListener('click', () => go({ b, o, agent: true }));
}
let agentTimer = null;
function renderAgent(o, b) {
  clearInterval(agentTimer);
  const fails = checks(o).filter(c => !c[2]);
  const bpName = PEOPLE.bp?.n || 'of the domain';
  const steps = [['Reading the object', `${KIND[o.t].toLowerCase()} ${o.name}, lineage and query history`], ...fails.map(([n]) => [`Fixing: ${n.toLowerCase()}`, FIX[n] || 'Preparing a fix']), ['Collecting changes', o.t === 'dm' ? 'a PR to the data mart repository and edits to the Data Catalog card' : o.t === 'met' ? 'edits to the metric card in the Semantic Layer' : 'a new dashboard version in the sandbox'], ['Sending for review', `BI partner ${bpName} gets a notification in Chat`]];
  head('Fixer agent', o.name);
  db.innerHTML = `<div style="font-size:12.5px;color:var(--ink2)">The agent acts on behalf of the BI partner and publishes nothing without review. <span class="mock">example</span></div>
    <ol class="steps">${steps.map(([a, d]) => `<li><i></i><div>${a}<small>${d}</small></div></li>`).join('')}</ol>
    <div id="agentOut"></div>`;
  const lis = [...db.querySelectorAll('.steps li')]; let k = 0; lis[0].classList.add('on');
  agentTimer = setInterval(() => { if (!lis[k].isConnected) { clearInterval(agentTimer); return; } lis[k].classList.remove('on'); lis[k].classList.add('done'); k++;
    if (k < lis.length) lis[k].classList.add('on');
    else { clearInterval(agentTimer); document.getElementById('agentOut').innerHTML = `<div class="diff"><b>Ready for review</b><br>${fails.map(([n]) => `${n}: fix prepared`).join('<br>')}<br>Expected: the object passes ${checks(o).length} of ${checks(o).length} checks after the nightly health score run.</div>
      <div class="acts"><a class="btn primary" href="#" onclick="return false">Open changes for review<small>PR</small></a><button class="btn" id="backObj">Back to the object<small>←</small></button></div>`;
      document.getElementById('backObj').onclick = () => go({ b, o }); } }, 1100);
}

document.querySelector('.dom').innerHTML = `<a href="index.html#/" title="Insight Factories" style="display:contents;color:inherit;text-decoration:none"><i>IF</i></a><a href="index.html#/s/${DI}" style="color:inherit;text-decoration:none">${DOM.l2}</a> <span>/ ${DOM.l1}</span>`; document.title = `Factory ${DOM.l2}`;
// ---------- KPI ----------
{ const sh = a => pct(a.filter(x => ok(x.s)).length, a.length);
  // header in the same order as the workspace: AI-Ready score → health of all objects → data marts, metrics, dashboards → issues
  const SD = SUBS[DI], all = [...OBJ.dm, ...OBJ.met, ...OBJ.dash], hot = all.filter(o => !ok(o.s) && o.pop > P75[o.t]).length, allP = sh(all);
  const hk = (l, v, n, tip) => `<div title="${tip}"><i class="${cls(v / 100)}" style="background:var(--${cls(v / 100)})"></i>${l}<b>${n ? v + '%' : '—'}<small> healthy</small></b></div>`;
  document.getElementById('kpi').innerHTML = `<div title="AI-Ready score: min(axis 1, axis 2)">AI-Ready<b>${SD?.ards?.idx ?? '—'}<small> · ${SD?.level != null ? 'L' + SD.level : ''}</small></b></div>`
    + hk('All objects', allP, all.length, 'share of objects that pass the health score') + hk('Data marts', sh(OBJ.dm), OBJ.dm.length, 'share of healthy data marts') + hk('Metrics', sh(OBJ.met), OBJ.met.length, 'share of healthy metrics') + hk('Dashboards', sh(OBJ.dash), OBJ.dash.length, 'share of healthy dashboards')
    + `<div title="popular and unhealthy objects">Issues<b>${hot}</b></div>`; }

// ---------- input ----------
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let hoverB = null, down = null;
function pick(e) { mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(mouse, camera); return ray.intersectObjects(pickable, false)[0]?.object.userData.b || null; }
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const b = pick(e); if (b) go({ b }); });
const tip = document.getElementById('tip');
canvas.addEventListener('pointermove', e => { if (e.buttons) { tip.hidden = true; return; } const b = pick(e); canvas.style.cursor = b ? "pointer" : ''; if (b !== hoverB) { setGlow(hoverB, false); setGlow(b, true); hoverB = b; }
  if (!b) { tip.hidden = true; return; }
  const trend = b.n ? ((hash(b.id + 'tr') % 9) - 3) : 0;
  tip.innerHTML = b.n ? `<b>${b.name}</b><div class="tg"><span>Objects</span><em>${b.n}</em><span>Healthy</span><em>${pct(b.good, b.n)}%</em><span>Certified</span><em>${Math.round(b.cert * 100)}%</em><span>Queries</span><em>${fmt(b.use)}</em><span>Issues</span><em>${b.hot}</em><span>Last month <i class="mock">example</i></span><em class="${trend >= 0 ? 'up' : 'dn'}">${trend >= 0 ? '+' : ''}${trend} pp</em></div><small>Footprint is the number of objects, height is queries. Click to inspect.</small>`
    : `<b>${b.name}</b><small>${b.ai ? b.ai + ' (example)' : b.objs ? 'No objects of this type are tagged in the domain: the workshop is empty.' : 'Source without a health score: its state shows only through the workshops it feeds.'}</small>`;
  tip.hidden = false; tip.style.left = Math.min(e.clientX + 16, innerWidth - 300) + 'px'; tip.style.top = (e.clientY + 16) + 'px'; });
canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
const LEGEND = {
  health: '<span><span class="sq" style="background:var(--ok)"></span>healthy products</span><span><span class="sq" style="background:var(--bad)"></span>defects</span><span>pile at a workshop: unhealthy objects</span><span>footprint: objects, height: queries</span>',
  cert: '<span><span class="sq" style="background:var(--key)"></span>certified</span><span><span class="sq" style="background:var(--line-strong)"></span>not certified</span><span>footprint: objects, height: queries</span>',
  pop: `<span>queries</span>${HEAT.map(c => `<span class="sq" style="background:${c}"></span>`).join('')}<span>denser flow means more queries</span>`,
};
document.querySelectorAll('#layers button').forEach(x => x.onclick = () => { layer = x.dataset.l; paintLayer(); });
function setGlow(b, on) { if (!b) return; b.grp.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !lamps.some(l => l.m === o)) { if (on) { o.userData.mat = o.material; o.material = o.material.clone(); o.material.emissive = new THREE.Color(css('--accent', '#0A7684')); o.material.emissiveIntensity = 0.18; } else if (o.userData.mat) { o.material = o.userData.mat; } } }); }
addEventListener('keydown', e => { if (e.key === 'Escape') { if (state.agent) go({ b: state.b, o: state.o }); else if (state.o) go({ b: state.b }); else go({}); } });

// ---------- loop ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); const a = innerWidth / innerHeight, f = 62; camera.left = -f * a; camera.right = f * a; camera.top = f; camera.bottom = -f; camera.updateProjectionMatrix(); }
// ---------- factory tour (?tour=1): stops with a camera close-up and an explanation; onboarding for a BI partner ----------
const centerOf = list => [list.reduce((t, b) => t + b.x, 0) / list.length, list.reduce((t, b) => t + b.z, 0) / list.length];
const hotHall = [...halls].sort((a, b) => (b.hot || 0) - (a.hot || 0))[0];
const TOUR = [
  { t: 'This is a subdomain factory', x: HOME[0], z: HOME[1], zoom: HOME[2], text: `Factory ${DOM.l2} is one subdomain of the ${DOM.l1} domain. Left to right: raw materials → data mart workshops → metric warehouses → shipping of dashboards and AI channels. Building color is the share of healthy objects, height is queries.` },
  { t: 'Raw materials: sources', at: centerOf(SOURCES), zoom: 1.7, text: 'Clickstream, Core DWH and Billing are the raw materials for data marts. The health score does not cover them: a source\'s problems show only as failures of the workshops it feeds.' },
  { t: 'Data mart workshops', at: centerOf(regHalls), zoom: 1.2, text: 'A workshop is a group of data marts by words in their names. Footprint is the number of data marts, height is queries to them. Click a workshop to open its data marts with a "Defects" filter.' },
  { t: 'Defects and issues', b: hotHall, zoom: 2.2, text: `Red crates in front of a workshop are unhealthy data marts. The triangle with a number counts issues: objects more popular than 75% of their type that fail the health score. This one has ${plural(hotHall?.hot || 0, 'issue', 'issues')}: start there.` },
  { t: 'Certified data marts', b: CERT_HALL, zoom: 2, text: 'A separate workshop for certified data marts: key dashboards and metrics should rely on them. The share of healthy ones here is the main signal of trust in the subdomain\'s data.' },
  { t: 'Metric warehouses', at: centerOf(stores), zoom: 1.6, text: 'A warehouse is a group of Semantic Layer metrics. Metrics take data from data marts via conveyors. A metric nobody uses is a candidate to stop computing (Infracost tab).' },
  { t: 'Shipping', at: centerOf(DOCKS), zoom: 1.6, text: 'The "Dashboards" dock is what the business sees. The other docks are AI channels: AI Assistant, AI in Chat, MCP and SQL Workbench. Trucks carry products to consumers.' },
  { t: 'Conveyors', at: [BUS1, ZB], zoom: 1.6, text: 'Products ride the belts: green crates are healthy objects, red ones are defects. Defects that reach shipping show up in the business\'s dashboards.' },
  { t: 'Office', at: OFFICE_POS, zoom: 2.4, text: `At the desks: ${OFFICE.map(p => (p.n || 'vacancy') + ', ' + (p.role === 'st' ? 'data owner' : 'BI partner')).join('; ')}. An empty red chair means the role is not assigned in the Domain Registry.` },
  { t: 'Indicators on the ground', at: [-13, ZB + 14], zoom: 1.5, text: 'The subdomain\'s indicators are painted in front of the factory: health by type, share of certified data marts, output, CPU, AI Ready and the number of issues.' },
  ...(NALL.inn ? [{ t: 'Data suppliers', b: NALL.inn, zoom: 1.05, text: `Left of the yard are factories whose data marts this subdomain reads. On the ground: quality of consumed data, ${Math.round((NBQ.inn ?? 0) * 100)}%. Click a neighbour factory to list its data marts you read.` }] : []),
  ...(NALL.out ? [{ t: 'Data consumers', b: NALL.out, zoom: 1.05, text: `On the right are factories that read your data marts. Quality of supplied data: ${Math.round((NBQ.out ?? 0) * 100)}%. The lower it is, the more you let your neighbours down.` }] : []),
  { t: 'Panel on the right', x: HOME[0], z: HOME[1], zoom: HOME[2], text: 'The right panel shows the same as a list: issues, workshops and warehouses, data exchange, office. Click a row to zoom to the object; a data mart shows health checks and the fixer agent button.' },
  { t: 'What next', x: HOME[0], z: HOME[1], zoom: HOME[2], text: `Open the <a href="index.html#/s/${DI}">subdomain workspace</a>, the <a href="graph.html?d=${DI}">Links</a> window and the <a href="world.html?s=${DI}&from=plant">Insight Factories world</a>. Back to the onboarding steps: <a href="index.html#/onboarding/${DI}">onboarding</a>.` },
];
let tourK = -1;
const tourEl = document.createElement('div'); tourEl.id = 'tour'; tourEl.hidden = true; document.body.appendChild(tourEl);
function tourGo(k) { tourK = Math.max(0, Math.min(TOUR.length - 1, k)); const S1 = TOUR[tourK];
  if (S1.b) { go({ b: S1.b }); flyTo(S1.b.x * (S1.b.nb ? 0.85 : 1), S1.b.z + (S1.b.nb ? 8 : 0), S1.zoom); } else { go({}); const [x, z] = S1.at || [S1.x, S1.z]; flyTo(x, z, S1.zoom); }
  tourEl.hidden = false; tourEl.innerHTML = `<div class="th"><span>Tour · ${tourK + 1} of ${TOUR.length}</span><button id="tx" aria-label="End tour">×</button></div><b>${S1.t}</b><p>${S1.text}</p>
    <div class="td">${TOUR.map((_, i) => `<i class="${i === tourK ? 'on' : i < tourK ? 'done' : ''}"></i>`).join('')}</div>
    <div class="tb"><button id="tp" ${tourK ? '' : 'disabled'}>Back</button><button id="tn" class="pri">${tourK === TOUR.length - 1 ? 'Finish' : 'Next'}</button></div>`;
  document.getElementById('tp').onclick = () => tourGo(tourK - 1); document.getElementById('tn').onclick = () => tourK === TOUR.length - 1 ? tourEnd() : tourGo(tourK + 1); document.getElementById('tx').onclick = tourEnd; }
function tourEnd() { tourK = -1; tourEl.hidden = true; go({}); }
addEventListener('keydown', e => { if (tourK < 0) return; if (e.key === 'ArrowRight') tourGo(tourK + 1); if (e.key === 'ArrowLeft') tourGo(tourK - 1); if (e.key === 'Escape') tourEnd(); });
addEventListener('resize', resize); resize(); render(); paintLayer();
if (QS.get('tour') === '1') setTimeout(() => tourGo(0), 400);
if (FROM_WORLD) history.replaceState(null, '', location.pathname + `?d=${DI}`);
let last = performance.now(), T = 0;
renderer.setAnimationLoop(now => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  if (fly) { fly.t = Math.min(1, fly.t + dt / 0.9); const k = 1 - (1 - fly.t) ** 3; const d = fly.p0.clone().sub(fly.t0); controls.target.lerpVectors(fly.t0, fly.t1, k); camera.position.copy(controls.target).add(d); camera.zoom = fly.z0 + (fly.z1 - fly.z0) * k; camera.updateProjectionMatrix(); if (fly.t >= 1) fly = null; }
  controls.update();
  moveBoxes(dt); moveSmoke(T);
  lamps.forEach(l => { l.m.material.emissiveIntensity = l.bad ? 0.4 + 0.8 * (0.5 + 0.5 * Math.sin(T * 5)) : 0.6; });
  trucks.forEach(tk => { const p = ((T * 0.12 + tk.phase / 10) % 1); tk.t.position.x = tk.x0 + (p < 0.15 ? 0 : p < 0.55 ? (p - 0.15) * 90 : p < 0.6 ? 36 : (1 - (p - 0.6) / 0.4) * 36); });
  renderer.render(scene, camera);
  placeLabels(); placeStaff();
});
refFooter(['E3', 'E4', 'E5', 'E6', 'D7'], document.getElementById('drawer'), { inline: true }).style.cssText = 'padding:8px 20px 10px;margin:0';
window.__plant = { go, GROUPS, OBJ, byId };
