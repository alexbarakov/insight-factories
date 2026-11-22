import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { QS, D, $, COL, statusCol, LAYER, lay, nm, ch, nodes, byKey, edges, hiddenExt, deg, nbrs, bad, plural, reach, LENS, ZK, infKind, inLens, CERT, certRoots, certBad,
  isolated, ownN, st, fmt, KIND1, UNIT, S } from './links-model.js?v=100';

// ============================================================================
// The Graph view of the Links window: the whole subdomain graph in 2D and 3D. Mounted by the shell (graph.js) into the view card: createNet({ stage, toolbar, api }).
// Layers from left to right: DDS → data marts → Semantic Layer sources → metrics → dashboards; force layout.
// Objects are shown one by one, without grouping (the grouping mechanics stay in the code, turned off: depth = 3).
// Lens, finding and selected object are shared by the window (st in links-model.js).
// Links are bands of constant pixel width; the main object of a finding pulses with a glow; the legend slides aside on its own.
// ============================================================================
export function createNet({ stage, toolbar, api }) {
const tip = $('tip');
// edge and neighbor colors from the theme tokens (theme.css); fallbacks are the light theme values
const tok = (n, f) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f; } catch { return f; } };
const EC = { extBad: tok('--bad-line', '#EDC4BE'), hot1: tok('--bad-line', '#EDC4BE'), ms1: tok('--wip-line', '#CDC3EC'), ms2: tok('--wip', '#6A55B0'), e1: tok('--line-strong', '#C3CDD2'), e2: tok('--ink3', '#7F909A') };
// ---------- layout: force model with layers by type; in 2D z = 0 and layers are stiffer ----------
let mode = QS.get('m') === '2d' ? '2d' : '3d', lens = st.lens;   // 3D by default
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
nodes.forEach(n => { n.p = { '2d': [0, 0, 0], '3d': [0, 0, 0] }; });
const isolated = n => !deg(n);
function layout(m, iters) {
  const flat = m === '2d', act = nodes.filter(n => !isolated(n));
  act.forEach(n => { n.x = (flat ? 1.8 : 1) * LAYER[lay(n)] + (n.ext ? (n.t === 'dm' ? -60 : 60) : 0) + (rnd() - 0.5) * 50; n.y = (rnd() - 0.5) * 220 + (n.t === 'met' || n.t === 'src' ? 120 : 0); n.z = flat ? 0 : (rnd() - 0.5) * 200; n.vx = n.vy = n.vz = 0; });
  let alpha = 1; const cell = 24;
  for (let it = 0; it < iters; it++) {
    const grid = new Map(), key = (x, y, z) => x * 73856093 ^ y * 19349663 ^ z * 83492791;
    act.forEach(n => { const k = key(Math.floor(n.x / cell), Math.floor(n.y / cell), Math.floor(n.z / cell)); (grid.get(k) || grid.set(k, []).get(k)).push(n); });
    for (const n of act) { const cx = Math.floor(n.x / cell), cy = Math.floor(n.y / cell), cz = Math.floor(n.z / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = flat ? 0 : -1; dz <= (flat ? 0 : 1); dz++) { const g = grid.get(key(cx + dx, cy + dy, cz + dz)); if (!g) continue;
        for (const o of g) { if (o.i <= n.i) continue; let ex = n.x - o.x, ey = n.y - o.y, ez = n.z - o.z; const d2 = ex * ex + ey * ey + ez * ez + 0.01, rr = (n.r + o.r + 3) ** 2;
          const f = (d2 < rr ? 4 : 1) * 70 / d2 * alpha; ex *= f; ey *= f; ez *= f; n.vx += ex; n.vy += ey; n.vz += ez; o.vx -= ex; o.vy -= ey; o.vz -= ez; } } }
    for (const e of edges) { const a = e.a, b = e.b, L = e.kind === 'ms' ? 10 : 30; let ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z; const d = Math.sqrt(ex * ex + ey * ey + ez * ez) + 0.01, f = (d - L) / d * 0.035 * alpha;
      ex *= f; ey *= f; ez *= f; a.vx += ex; a.vy += ey; a.vz += ez; b.vx -= ex; b.vy -= ey; b.vz -= ez; }
    for (const n of act) { const tx = (LAYER[lay(n)] + (n.ext ? (n.t === 'dm' ? -60 : n.t === 'dash' ? 60 : 0) : 0)) * (flat ? 1.8 : 1);   // in 2D layers are wider: the screen is landscape
      n.vx += (tx - n.x) * (n.t === 'dash' ? (flat ? 0.16 : 0.06) : flat ? 0.05 : 0.014) * alpha;   // dashboards stay a separate cloud on the right n.vy += (-n.y * 0.003 + (n.t === 'met' || n.t === 'src' ? 0.45 : -0.15)) * alpha; n.vz += -n.z * 0.004 * alpha;
      n.x += n.vx; n.y += n.vy; n.z = flat ? 0 : n.z + n.vz; n.vx *= 0.6; n.vy *= 0.6; n.vz *= 0.6; }
    alpha = Math.max(0.03, alpha * 0.988); }
  // objects without links — a grid below the graph, expensive ones first
  const iso = nodes.filter(isolated).sort((a, b) => b.cpu - a.cpu), ymin = Math.min(...act.map(n => n.y), 0);
  iso.forEach((n, k) => { n.x = (k % 20 - 10) * 16 + LAYER.dm * 0.5; n.y = ymin - 50 - Math.floor(k / 20) * 16; n.z = 0; });
  nodes.forEach(n => { n.p[m] = [n.x, n.y, n.z]; });
}
layout('2d', 320); layout('3d', 320);

// ---------- groups: objects merged into one point that expands on click (collapsed groups, as in Linkurious) ----------
// Level 1 — type × own/neighbors × health; level 2 — subgroups: data marts and dashboards by name prefix, metrics by Semantic Layer source,
// neighbors by subdomain; level 3 — objects. The level switch expands the whole graph, a click on a group expands only it.
const STOPW = new Set(['mart', 'dds', 'dm', 'v2', 'v', 'new', 'and', 'the', 'of', 'by', 'in', 'for', 'on', 'with']);
const words = s => String(s).toLowerCase().replace(/^[a-z0-9_]+\./, '').split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1 && !/^\d+$/.test(w) && !STOPW.has(w));
const TYPE_LABEL = { dds: 'DDS', dm: 'Data marts', met: 'Metrics', dash: 'Dashboards', src: 'Semantic Layer sources' };
const l1Of = n => { const t = lay(n); if (n.ext) return [`x:${t}`, `Neighbor ${TYPE_LABEL[t].toLowerCase()}`]; if (t === 'src') return ['src', 'Semantic Layer sources'];
  return [`${t}:${bad(n) ? 'b' : 'o'}`, `${TYPE_LABEL[t]} · ${bad(n) ? 'unhealthy' : 'healthy'}`]; };
const l2Of = n => { if (n.ext) return n.sub.l2; if (n.t === 'src') return null;
  if (n.t === 'met') { const e = n.out.find(e => e.kind === 'ms'); return e ? 'source ' + e.b.name : 'no source'; }
  const w = words(nm(n)); return (n.t === 'dm' ? w.slice(0, 2) : w.slice(0, 1)).join(' ') || '—'; };
const groups = [], gByKey = new Map();
const mkG = (key, name, t, lvl, parent) => { let g = gByKey.get(key); if (!g) { g = { key: 'g:' + key, name, t, lvl, parent, members: [], grp: true, i: groups.length, d: [0, 0, 0] }; groups.push(g); gByKey.set(key, g); } return g; };
for (const n of nodes) { const [k1, n1] = l1Of(n), g1 = mkG(k1, n1, n.t, 1, null); g1.members.push(n); n.g1 = g1;
  const b = l2Of(n); if (b != null) { const g2 = mkG(k1 + '|' + b, b, n.t, 2, g1); g2.members.push(n); n.g2 = g2; } }
groups.forEach(g => { g.dead = g.members.length < 2; });   // a one-object group is pointless — the object shows directly
let depth = 3;   // groups are off: the graph always shows objects
const gOpen = new Set(), gShut = new Set();
const isOpenG = g => gShut.has(g.key) ? false : gOpen.has(g.key) || depth > g.lvl;
const unitOf = n => { if (!n.g1.dead && !isOpenG(n.g1)) return n.g1; if (n.g2 && !n.g2.dead && !isOpenG(n.g2)) return n.g2; return n; };
const expandTo = n => { for (const g of [n.g1, n.g2]) if (g && !g.dead) { gShut.delete(g.key); if (depth <= g.lvl) gOpen.add(g.key); } };
const isU = x => x.grp ? x.vis : x.shown;   // is it on the canvas: a group, or an object outside a collapsed group

// ---------- scene ----------
stage.innerHTML = '<canvas class="scene"></canvas><div class="labels"></div><div class="legend"></div>';
const canvas = stage.querySelector('canvas'), labelBox = stage.querySelector('.labels'), legendEl = stage.querySelector('.legend');
const W = () => stage.clientWidth || 800, H = () => stage.clientHeight || 600;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(COL.bg);
const persp = new THREE.PerspectiveCamera(45, 1, 1, 5000), ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
let camera = persp, controls = null;
// lights: white sky, ground tinted with the theme line color
scene.add(new THREE.HemisphereLight('#ffffff', COL.ext, 2.3)); const dl = new THREE.DirectionalLight('#ffffff', 1.3); dl.position.set(100, 200, 300); scene.add(dl);
const GEO = { dm: new THREE.BoxGeometry(1.6, 1.6, 1.6), met: new THREE.SphereGeometry(1, 16, 12), dash: new THREE.OctahedronGeometry(1.3), src: new THREE.TorusGeometry(1, 0.34, 10, 24) };
const meshes = {}, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), SC = new THREE.Vector3(), C = new THREE.Color(), BG = new THREE.Color(COL.bg);
for (const t of Object.keys(GEO)) { const list = nodes.filter(n => n.t === t); if (!list.length) continue;
  const m = new THREE.InstancedMesh(GEO[t], new THREE.MeshStandardMaterial({ roughness: 0.55 }), list.length); m.userData.list = list; list.forEach((n, j) => { n.mesh = m; n.j = j; }); scene.add(m); meshes[t] = m; }
const gMeshes = {};
for (const t of Object.keys(GEO)) { const list = groups.filter(g => g.t === t); if (!list.length) continue;
  const m = new THREE.InstancedMesh(GEO[t], new THREE.MeshStandardMaterial({ roughness: 0.4 }), list.length); m.userData.list = list; list.forEach((g, j) => { g.mesh = m; g.j = j; }); scene.add(m); gMeshes[t] = m; }
// a pulsing glow under the main objects of the current lens findings: radial gradient, color — finding kind
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const GLOW_MAX = 80, glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.6 });
const glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMat, GLOW_MAX); glow.renderOrder = -1; glow.frustumCulled = false; scene.add(glow);
let glowNodes = [];
function updateGlow(t) {
  const k = 0.5 + 0.5 * Math.sin(t * 0.0032), q = mode === '3d' ? camera.quaternion : Q;
  glowMat.opacity = 0.35 + 0.4 * k;
  for (let i = 0; i < GLOW_MAX; i++) { const n = glowNodes[i], p = n ? n.d : [0, 0, 0], r = n && isU(n) ? rad(n) : 0, s = r ? r * (4.2 + 1.6 * k) + 4 : 0.0001;
    glow.setMatrixAt(i, M4.compose(V3.set(p[0], p[1], p[2] - (mode === '2d' ? 2 : 0)), q, SC.set(s, s, s))); }
  glow.instanceMatrix.needsUpdate = true; }
// edges are bands of constant pixel width (custom shader: WebGL lines are always 1 px wide).
// Color goes lighter → darker from source to consumer, so direction reads without arrows.
const EV = edges.length * 4, ePos = new Float32Array(EV * 3), eNext = new Float32Array(EV * 3), eSide = new Float32Array(EV), eCol = new Float32Array(EV * 3), eW = new Float32Array(EV), eIdx = [];
for (let i = 0; i < edges.length; i++) { const v = i * 4; eSide.set([-1, 1, -1, 1], v); eIdx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
const eGeo = new THREE.BufferGeometry();
eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3)); eGeo.setAttribute('nextPos', new THREE.BufferAttribute(eNext, 3)); eGeo.setAttribute('side', new THREE.BufferAttribute(eSide, 1));
eGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3)); eGeo.setAttribute('w', new THREE.BufferAttribute(eW, 1)); eGeo.setIndex(eIdx);
const eMat = new THREE.ShaderMaterial({ uniforms: { res: { value: new THREE.Vector2(W(), H()) } }, vertexColors: true, side: THREE.DoubleSide,
  vertexShader: `attribute vec3 nextPos; attribute float side; attribute float w; uniform vec2 res; varying vec3 vC;
    void main() { vC = color; vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vec4 b = projectionMatrix * modelViewMatrix * vec4(nextPos, 1.0);
      vec2 d = (b.xy / b.w - a.xy / a.w) * res; if (length(d) < 1e-5) d = vec2(1.0, 0.0); d = normalize(d);
      a.xy += vec2(-d.y, d.x) * side * w / res * a.w; gl_Position = a; }`,
  fragmentShader: `varying vec3 vC;
void main() { gl_FragColor = vec4(vC, 1.0);
#include <colorspace_fragment>
}` });
const eMesh = new THREE.Mesh(eGeo, eMat); eMesh.frustumCulled = false; scene.add(eMesh);

// ---------- state ----------
const show = { dm: true, met: true, dash: true, src: true, ext: false, iso: false };   // by default all links of the own subdomain, neighbors via the filter
let zone = null, sel = null, hover = null, q = '', cert = st.cert, popOpen = false;
const Z = () => LENS[lens];
const focusSet = () => { const fh = !sel && hover ? hover : null; if (fh) return new Set(fh.grp ? fh.members.flatMap(m => [m, ...nbrs(m)]) : [fh, ...nbrs(fh)]);   // hover highlights neighbors, as in Gephi and Bloom
  if (sel) { const s = new Set([sel, ...nbrs(sel)]); if (sel.t === 'dm') reach(sel).all.forEach(x => s.add(x)); return s; } return zone ? zone.nodes : null; };
const visible = n => show[n.t] && (n.ext ? show.ext : true) && (!isolated(n) || show.iso || (lens === 'infra' && inLens.infra.has(n)) || (cert && CERT.has(n)))
  && (lens === 'all' || cert || inLens[lens].has(n) || n === sel || (sel && nbrs(sel).includes(n))) && (!q || nm(n).toLowerCase().includes(q));
// node color: by savings finding in the infrastructure lens, otherwise by health
function nodeCol(n) {
  if (lens === 'infra') { if (n.t === 'src') return COL.src; if (n.ext) return COL.ext; const k = infKind.get(n); if (k) return ZK[k][1]; return n.cpu > 0 ? COL.idle : COL.nocost; }
  return n.t === 'src' ? COL.src : n.ext ? (bad(n) ? EC.extBad : COL.ext) : statusCol(n.o); }
const rad = n => n.grp ? (lens === 'infra' ? 2.4 + Math.min(11, Math.sqrt(n.cpu) * 0.13) : 2.4 + Math.min(11, Math.sqrt(n.cnt) * 0.85)) : lens === 'infra' ? n.ri : n.rq;
let aggE = [];
function paint(panel = true) {
  const F = focusSet(), inFo = x => !F || (x.grp ? x.members.some(m => F.has(m)) : F.has(x)), inC = x => !cert || (x.grp ? x.members.some(m => CERT.has(m)) : CERT.has(x));
  for (const n of nodes) { n.vis = visible(n); n.u = n.vis ? unitOf(n) : null; n.shown = n.vis && n.u === n; }
  // a group left with one object after filtering does not collapse — show the object itself
  for (let pass = 0; pass < 2; pass++) for (const g of groups) { const v = g.members.filter(m => m.vis && m.u === g); if (v.length === 1) { const m = v[0]; m.u = g.lvl === 1 && m.g2 && !m.g2.dead && !isOpenG(m.g2) && m.g2.members.filter(x => x.vis).length > 1 ? m.g2 : m; } }
  for (const n of nodes) n.shown = n.vis && n.u === n;
  for (const g of groups) { const v = g.members.filter(m => m.vis && m.u === g); g.vis = v.length > 0; g.cnt = v.length; g.cpu = v.reduce((a, m) => a + m.cpu, 0); g.vm = v; }
  // positions: an object from the layout, a group at the center of its objects; then a light push apart so groups do not overlap
  const U = [...nodes.filter(n => n.shown), ...groups.filter(g => g.vis)];
  for (const x of U) { if (x.grp) { const c = [0, 0, 0]; x.vm.forEach(m => { const p = m.p[mode]; c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }); x.d = c.map(v => v / x.vm.length); } else x.d = [...x.p[mode]]; x.a = [...x.d]; }
  if (U.length <= 260 && U.some(x => x.grp)) for (let it = 0; it < 60; it++) { for (let a = 0; a < U.length; a++) for (let b = a + 1; b < U.length; b++) { const A = U[a], B = U[b], dx = B.d[0] - A.d[0], dy = B.d[1] - A.d[1], dz = B.d[2] - A.d[2], dd = Math.hypot(dx, dy, dz) || 0.01, mn = rad(A) + rad(B) + 10;
      if (dd < mn) { const f = (mn - dd) / dd * 0.5; A.d[0] -= dx * f; A.d[1] -= dy * f; A.d[2] -= dz * f; B.d[0] += dx * f; B.d[1] += dy * f; B.d[2] += dz * f; } }
    for (const x of U) for (let k = 0; k < 3; k++) x.d[k] += (x.a[k] - x.d[k]) * 0.04; }
  // colors
  for (const n of nodes) { C.set(nodeCol(n)); if (!inFo(n) || !inC(n)) C.lerp(BG, 0.85); n.mesh.setColorAt(n.j, C); }
  for (const g of groups) { if (!g.vis) continue; const cnt = new Map(); g.vm.forEach(m => { const c = nodeCol(m); cnt.set(c, (cnt.get(c) || 0) + (c === COL.idle || c === COL.nocost || c === COL.ok ? 1 : 1.6)); });
    C.set([...cnt].sort((a, b) => b[1] - a[1])[0][0]); if (!inFo(g) || !inC(g)) C.lerp(BG, 0.85); g.mesh.setColorAt(g.j, C); }
  [...Object.values(meshes), ...Object.values(gMeshes)].forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  // links between what is shown: links inside a collapsed group are hidden, links between groups are summed
  const A = new Map();
  for (const e of edges) { if (!e.a.vis || !e.b.vis) continue; const a = e.a.u, b = e.b.u; if (a === b) continue; const k = a.key + '>' + b.key;
    let x = A.get(k); if (!x) { x = { a, b, n: 0, hot: false, f: false, ms: e.kind === 'ms' || e.kind === 'ds', c: true }; A.set(k, x); }
    x.n++; x.hot = x.hot || (lens === 'dq' ? e.kind !== 'ms' && bad(e.a) : lens === 'infra' && infKind.has(e.a)); x.hk = x.hk || infKind.get(e.a); x.f = x.f || (F ? F.has(e.a) && F.has(e.b) : false); x.c = x.c && (!cert || (CERT.has(e.a) && CERT.has(e.b))); }
  aggE = [...A.values()].slice(0, edges.length);
  const c1 = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < edges.length; i++) { const v = i * 4, x = aggE[i]; if (!x) { eW.set([0, 0, 0, 0], v); continue; }
    c1.set(x.hot ? EC.hot1 : x.ms ? EC.ms1 : EC.e1); c2.set(x.hot ? (lens === 'infra' ? ZK[x.hk || 'cut'][1] : COL.bad) : x.ms ? EC.ms2 : EC.e2); if (!F && x.hot) c2.lerp(BG, 0.35);
    const dim = (F && !x.f) || !x.c; if (dim) { c1.lerp(BG, 0.8); c2.lerp(BG, 0.8); }
    const w = dim ? 0.7 : x.f ? 2.4 : Math.min(6, 1 + Math.log2(x.n) * 0.7);   // width of a link between groups follows the number of links inside
    eCol.set([c1.r, c1.g, c1.b, c1.r, c1.g, c1.b, c2.r, c2.g, c2.b, c2.r, c2.g, c2.b], v * 3); eW.set([w, w, w, w], v); }
  eGeo.attributes.color.needsUpdate = true; eGeo.attributes.w.needsUpdate = true;
  const zl = zone ? [zone] : cert && !Z().length ? [{ kind: 'root', roots: certBad.slice(0, 6) }] : Z();
  // glow: with no finding selected — three main objects per finding; for collapsed ones the group glows
  glowNodes = [...new Set(zl.flatMap(z => z.roots.slice(0, zone ? 14 : 3).filter(n => n.vis && inC(n) && inFo(n)).map(n => n.u)))].slice(0, GLOW_MAX);
  glowNodes.forEach((n, i) => { const z = zl.find(z => z.roots.some(r => r === n || r.u === n)) || zl[0]; glow.setColorAt(i, C.set(ZK[z.kind][1])); }); if (glow.instanceColor) glow.instanceColor.needsUpdate = true;
  place(); if (panel) renderTools(); renderLegend(); }
// legend on the canvas at the bottom right: shapes, colors of the current lens, size, links
// the legend slides aside after 5 seconds; hover shows it, a click on the tab pins it
let legPin = false, legHover = true;
setTimeout(() => { legHover = false; legendEl.classList.add('min'); }, 5000);
function renderLegend() {
  const sh = { dm: '<rect x="1" y="1" width="11" height="11" style="fill:var(--ink2)"/>', dash: '<path d="M6.5 0 13 6.5 6.5 13 0 6.5z" style="fill:var(--ink2)"/>', met: '<circle cx="6.5" cy="6.5" r="5.5" style="fill:var(--ink2)"/>', src: `<circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="${COL.src}" stroke-width="2.5"/>` };
  const it = (svg, t) => `<span><svg width="13" height="13">${svg}</svg>${t}</span>`, sw = (c, t) => `<span><i class="sw" style="background:${c}"></i>${t}</span>`;
  const cols = lens === 'infra' ? [sw(COL.bad, 'turn off'), sw(COL.warn, 'optimize'), sw(COL.brown, 'spend without trust'), sw(COL.blue, 'storage'), sw(COL.idle, 'normal spend'), sw(COL.nocost, 'not in billing')]
    : [sw(COL.ok, 'healthy'), sw(COL.warn, 'certified, unhealthy'), sw(COL.bad, 'unhealthy')];
  legendEl.innerHTML = `<b>Shapes</b><div>${it(sh.dm, 'data mart')}${it(sh.met, 'metric')}${it(sh.dash, 'dashboard')}${it(sh.src, 'Semantic Layer source')}</div>
    <b>Color — ${lens === 'infra' ? 'savings finding' : 'health'}</b><div>${cols.join('')}${sw(COL.ext, `neighboring ${S.l2?.forms?.[0] || 'subdomain'}`)}</div>
    <b>Size</b><p>${lens === 'infra' ? 'CPU hours over 30 days' : 'how many dashboards depend on the node'}</p>
    ${lens === 'all' ? '' : '<b>Glow</b><p><i class="glw"></i>main object of a finding: start here</p>'}
    <b>Links</b><p><svg width="44" height="8"><defs><linearGradient id="lg"><stop offset="0" stop-color="${EC.e1}"/><stop offset="1" stop-color="${EC.e2}"/></linearGradient></defs><rect width="44" height="3" y="2.5" fill="url(#lg)"/></svg> from source to consumer${lens === 'all' ? '' : '; red — from a problem object'}</p>
    <p class="mut">Hover shows neighbors, click opens the card, faded — out of focus</p>`;
  legendEl.classList.toggle('shift', !$('drawer').hidden); legendEl.insertAdjacentHTML('afterbegin', '<button class="lgt" id="lgt">Legend</button>');
  $('lgt').onclick = e => { e.stopPropagation(); legPin = !legPin; legendEl.classList.toggle('min', !legPin); };
  legendEl.classList.toggle('min', !legPin && !legHover);
}
function place() {
  for (const n of nodes) { const s = n.shown ? rad(n) : 0.0001, d = n.shown ? n.d : n.p[mode]; n.mesh.setMatrixAt(n.j, M4.compose(V3.set(d[0], d[1], d[2]), Q, SC.set(s, s, s))); }
  for (const g of groups) { const s = g.vis ? rad(g) : 0.0001; g.mesh.setMatrixAt(g.j, M4.compose(V3.set(g.d[0], g.d[1], g.d[2]), Q, SC.set(s, s, s))); }
  [...Object.values(meshes), ...Object.values(gMeshes)].forEach(m => { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); });
  for (let i = 0; i < edges.length; i++) { const x = aggE[i]; if (!x) continue; const a = x.a.d, b = x.b.d, v = i * 4, nb = [2 * b[0] - a[0], 2 * b[1] - a[1], 2 * b[2] - a[2]];
    ePos.set([...a, ...a, ...b, ...b], v * 3); eNext.set([...b, ...b, ...nb, ...nb], v * 3); }
  eGeo.attributes.position.needsUpdate = true; eGeo.attributes.nextPos.needsUpdate = true;
}

// ---------- camera: 2D — orthographic from above without rotation, 3D — perspective with rotation ----------
function setMode(m) {
  mode = m; controls?.dispose(); camera = m === '2d' ? ortho : persp; controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = true;
  if (m === '2d') { controls.enableRotate = false; controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }; }
  syncUrl(); paint(); fit(zone?.nodes);
  api.hint?.( m === '2d' ? 'Wheel to zoom, drag to pan. Click a node for its links and actions' : 'Wheel to zoom, left button to rotate, right button to pan. Click a node for its links and actions'); }
const syncUrl = () => { const u = new URL(location.href); u.searchParams.set('m', mode); u.searchParams.delete('lv'); history.replaceState(null, '', u); };
function fit(set) {
  const list = set ? [...new Set([...set].filter(n => n.vis).map(n => n.u))] : [...nodes.filter(n => n.shown), ...groups.filter(g => g.vis)]; if (!list.length) return;
  const xs = list.map(n => n.d[0]), ys = list.map(n => n.d[1]), zs = list.map(n => n.d[2]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const w = Math.max(...xs) - Math.min(...xs) + 40, h = Math.max(...ys) - Math.min(...ys) + 40, pad = 1.12;
  const left = 20, right = document.getElementById('drawer')?.hidden === false ? 390 : 40, useW = Math.max(300, W() - left - right), shift = (left - right) / 2;   // the object card may sit on the right
  const top = 16, bot = 16, useH = Math.max(240, H() - top - bot), shY = (top - bot) / 2;   // the navigation bar sits on top
  if (mode === '2d') { const a = W() / H(), half = Math.max(h / 2 * H() / useH, w / 2 * W() / useW / a) * pad, upx = half * 2 / H();
    ortho.left = -half * a; ortho.right = half * a; ortho.top = half; ortho.bottom = -half; ortho.zoom = 1; ortho.updateProjectionMatrix();
    ortho.position.set(cx - shift * upx, cy + shY * upx, 1000); controls.target.set(cx - shift * upx, cy + shY * upx, 0); }
  else { const r = Math.hypot(w, h) / 2 * W() / useW, dist = r / Math.tan(THREE.MathUtils.degToRad(persp.fov / 2)) * 0.9, upx = 2 * dist * Math.tan(THREE.MathUtils.degToRad(persp.fov / 2)) / H();
    persp.position.set(cx - shift * upx, cy + dist * 0.2, cz + dist); persp.far = dist * 6; persp.updateProjectionMatrix(); controls.target.set(cx - shift * upx, cy, cz); }
  controls.update(); }

// ---------- labels: main nodes of zones, the focused node and its neighbors, without overlaps ----------
const LBL = new Map();
function placeLabels() {
  const F = focusSet(), want = [];
  if (sel) { want.push(sel); nbrs(sel).sort((a, b) => b.r - a.r).slice(0, 30).forEach(n => want.push(n)); }
  else if (zone) { zone.roots.forEach(n => want.push(n)); [...(zone.dash || [])].sort((a, b) => (b.o?.pop || 0) - (a.o?.pop || 0)).slice(0, 10).forEach(n => want.push(n)); }
  else if (cert) [...certBad.slice(0, 6), ...certRoots.filter(n => n.vis).sort((a, b) => b.r - a.r).slice(0, 10)].forEach(n => want.push(n));
  else if (lens === 'all') nodes.filter(n => n.vis).sort((a, b) => b.r - a.r).slice(0, 14).forEach(n => want.push(n));
  else Z().slice(0, 8).forEach(z => z.roots.slice(0, 3).forEach(n => want.push(n)));
  groups.filter(g => g.vis).sort((a, b) => b.cnt - a.cnt).forEach(g => want.unshift(g));   // collapsed groups are always labeled
  if (hover && !want.includes(hover)) want.unshift(hover);
  const placed = [], keep = new Set();
  for (const n of want) { if (!isU(n) || keep.has(n)) continue; let el = LBL.get(n);
    if (!el) { el = document.createElement('div'); el.className = 'lbl'; el.onclick = () => n.grp ? openGroup(n) : api.openCard(n); labelBox.appendChild(el); LBL.set(n, el); }   // a label is clickable, like the node itself
    const txt = n.grp ? `<span class="gc">${n.cnt}</span>${n.name}${n.lvl === 2 ? ` <small>${TYPE_LABEL[n.t === 'dm' && n.key.startsWith('g:dds') ? 'dds' : n.t].toLowerCase()}</small>` : ''}${lens === 'infra' && n.cpu >= 1 ? ` <small>${ch(n.cpu)} h</small>` : ''}`
      : `${nm(n)}${n.ext ? ` <small>${n.sub.l2}</small>` : ''}${lens === 'infra' && n.cpu >= 1 ? ` <small>${ch(n.cpu)} h</small>` : ''}`;
    if (el._t !== txt) { el.innerHTML = txt; el._t = txt; el._w = 0; }
    const [x, y, z] = n.d; V3.set(x, y + rad(n) + 1.5, z).project(camera); if (V3.z > 1) continue;
    const sx = (V3.x * 0.5 + 0.5) * W(), sy = (-V3.y * 0.5 + 0.5) * H(); if (!el._w) { el.style.display = ''; el._w = el.offsetWidth; el._h = el.offsetHeight; }
    const r = [sx - el._w / 2, sy - el._h, sx + el._w / 2, sy], forced = n === sel || n === hover || (n.grp && n.lvl === 1);
    if (!forced && placed.some(p => r[0] < p[2] + 4 && r[2] + 4 > p[0] && r[1] < p[3] + 2 && r[3] + 2 > p[1])) continue;
    placed.push(r); keep.add(n); el.style.display = ''; el.style.transform = `translate(${r[0]}px, ${r[1]}px)`; el.classList.toggle('sel', n === sel); el.classList.toggle('grp', !!n.grp); const fo = n.grp ? !F || n.members.some(m => F.has(m)) : !F || F.has(n); el.style.opacity = !fo || (cert && !(n.grp ? n.members.some(m => CERT.has(m)) : CERT.has(n))) ? 0.5 : 1; }
  for (const [n, el] of LBL) if (!keep.has(n)) el.style.display = 'none';
}

// ---------- view toolbar: expand levels, 2D/3D, search, filters ----------
function renderTools() {
  const tg = (k, l) => `<label class="ck"><input type="checkbox" data-k="${k}"${show[k] ? ' checked' : ''}> ${l}</label>`;
  toolbar.innerHTML = `<div class="modes">${['2d', '3d'].map(m => `<a data-m="${m}" class="${mode === m ? 'on' : ''}">${m.toUpperCase()}</a>`).join('')}</div>
    <input class="tq" id="nq" placeholder="Find on the graph" value="${q}">
    <div class="flt"><button id="fb">Filters ▾</button><div class="pop" id="fp"${popOpen ? '' : ' hidden'}>${tg('dm', 'Data marts')}${tg('met', 'Metrics')}${tg('dash', 'Dashboards')}${tg('src', 'Semantic Layer sources')}${tg('ext', `Neighbors · ${nodes.filter(n => n.ext).length}`)}${tg('iso', `No links · ${nodes.filter(isolated).length}`)}
      <div class="st">${ownN('dm')} data marts, ${ownN('met')} metrics, ${ownN('dash')} dashboards, ${ownN('src')} Semantic Layer sources · ${fmt(edges.length)} links${hiddenExt > 0 ? ` · ${hiddenExt} more neighbors hidden` : ''}</div></div></div>`;
  toolbar.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { depth = +b.dataset.lv; gOpen.clear(); gShut.clear(); if (sel) expandTo(sel); syncUrl(); paint(); fit(sel ? new Set([sel, ...nbrs(sel)]) : null); });
  toolbar.querySelectorAll('[data-m]').forEach(b => b.onclick = () => setMode(b.dataset.m));
  toolbar.querySelectorAll('[data-k]').forEach(b => b.onchange = () => { show[b.dataset.k] = b.checked; paint(); });
  $('fb').onclick = e => { e.stopPropagation(); popOpen = !popOpen; $('fp').hidden = !popOpen; };
  $('fp').onclick = e => e.stopPropagation();
  const qi = $('nq'); qi.oninput = () => { q = qi.value.trim().toLowerCase(); clearTimeout(qi._t); qi._t = setTimeout(() => { paint(); const f = $('nq'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }, 250); };
}
addEventListener('click', () => { if (popOpen) { popOpen = false; const p = $('fp'); if (p) p.hidden = true; } });
// ---------- node card ----------
// a click on a group expands it one level; collapse with the button in the object card or with the level switch
function openGroup(g) { gShut.delete(g.key); gOpen.add(g.key); hover = null; tip.hidden = true; paint(); }
// selecting an object: expand its groups and highlight neighbors; the window shell draws the card
function select(n) { if (n) expandTo(n); sel = n; paint(false); }
// which group can be collapsed back from the object card
function collapseOf(n) { return null; const cg = n.g2 && !n.g2.dead && isOpenG(n.g2) ? n.g2 : n.g1 && !n.g1.dead && isOpenG(n.g1) ? n.g1 : null; if (!cg) return null;
  return { name: cg.name, count: cg.members.length, run: () => { gOpen.delete(cg.key); if (cg.lvl === 1) cg.members.forEach(m => m.g2 && gOpen.delete(m.g2.key)); gShut.add(cg.key); sel = null; paint(); } }; }

// ---------- input ----------
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down0 = null;
function pick(e) { const rc = canvas.getBoundingClientRect(); mouse.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(mouse, camera);
  const h = ray.intersectObjects([...Object.values(meshes), ...Object.values(gMeshes)], false).find(x => { const u = x.object.userData.list[x.instanceId]; return u && isU(u); }); return h ? h.object.userData.list[h.instanceId] : null; }
canvas.addEventListener('pointerdown', e => down0 = [e.clientX, e.clientY]);
canvas.addEventListener('pointerup', e => { if (!down0 || Math.hypot(e.clientX - down0[0], e.clientY - down0[1]) > 5) return; const n = pick(e); if (n?.grp) openGroup(n); else if (n) api.openCard(n); else if (sel) api.closeCard(); });
canvas.addEventListener('pointermove', e => { if (e.buttons) { tip.hidden = true; return; } const n = pick(e); canvas.style.cursor = n ? 'pointer' : ''; if (hover !== n) { hover = n; paint(false); }
  if (!n) { tip.hidden = true; return; }
  if (n.grp) { tip.innerHTML = `<b>${n.name}</b><small>group · ${n.cnt} ${plural(n.cnt, 'object', 'objects')}${n.cpu >= 1 ? ` · ${ch(n.cpu)} CPU h` : ''} · click to expand</small>`; tip.hidden = false; tip.style.left = Math.min(e.clientX + 14, innerWidth - 330) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; return; }
  tip.innerHTML = `<b>${nm(n)}</b><small>${n.o ? `${KIND1[n.o.t]}${n.ext ? ' · ' + n.sub.l2 : ''} · ${fmt(n.o.pop)} ${UNIT[n.o.t]}${n.cpu >= 0.1 ? ` · ${ch(n.cpu)} CPU h` : ''}${n.t === 'dm' ? ` · ${n.impact} dashboards downstream` : ''}` : `Semantic Layer source · ${n.inn.length} metrics · ${ch(n.cpu)} CPU h`}</small>`;
  tip.hidden = false; tip.style.left = Math.min(e.clientX + 14, innerWidth - 330) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; });

// ---------- loop ----------
function resize() { renderer.setSize(W(), H(), false); eMat.uniforms.res.value.set(W(), H()); persp.aspect = W() / H(); persp.updateProjectionMatrix(); fit(zone?.nodes); }
new ResizeObserver(() => { if (on) resize(); }).observe(stage);
renderer.setSize(W(), H(), false); persp.aspect = W() / H();
legendEl.addEventListener('mouseenter', () => { legHover = true; legendEl.classList.remove('min'); });
legendEl.addEventListener('mouseleave', () => { legHover = false; setTimeout(() => { if (!legHover && !legPin) legendEl.classList.add('min'); }, 1200); });
let on = false;
const loop = t => { controls.update(); updateGlow(t); renderer.render(scene, camera); placeLabels(); };
setMode(mode);
window.__graph = { nodes, edges, groups, select, openGroup, setMode };
return {
  // the shell changes the lens, finding or selection — the graph re-reads the shared state
  refresh({ fitTo } = {}) { lens = st.lens; cert = st.cert; zone = st.zone; sel = st.sel; if (sel) expandTo(sel); if (zone) zone.roots.slice(0, 6).forEach(expandTo); paint(); if (fitTo !== undefined) fit(fitTo); },
  select(n) { st.sel = n; select(n); if (n) fit(new Set([n, ...nbrs(n)])); },
  collapseOf,
  show() { on = true; resize(); renderer.setAnimationLoop(loop); renderTools(); },
  hide() { on = false; renderer.setAnimationLoop(null); tip.hidden = true; },
};
}
