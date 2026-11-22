import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { SUBS, DOMS, fmt, pct, cls, hash, fmtK, fmtTb, INFRA_PERIOD, has, who } from './model.js?v=100';
const PROB = '<svg class="pi" width="11" height="11" viewBox="0 0 12 12" aria-label="issues"><path d="M6 1.2 11.1 10.4H.9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 4.7v2.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="8.8" r=".85" fill="currentColor"/></svg>';

// ============================================================================
// Factory map. A plot is a domain, a building is a subdomain.
// Wall color is the subdomain's health, footprint and height are the number of objects,
// the roof is split into data marts / metrics / dashboards and colored by their health.
// ============================================================================
const QS = new URLSearchParams(location.search), EMBED = window.parent !== window;
// theme tokens (app/theme.css), read at runtime; the scene follows the light or dark theme
const ROOT = document.documentElement, css = (n, fb) => getComputedStyle(ROOT).getPropertyValue(n).trim() || fb;
const DARK = ROOT.dataset.theme === 'dark' || (ROOT.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!ROOT.dataset.theme) location.reload(); });
const env = (c, k = 0.34) => DARK ? '#' + new THREE.Color(c).multiplyScalar(k).getHexString() : c;
const STATUS = { ok: css('--ok', '#2E8A57'), warn: css('--warn', '#C88A12'), bad: css('--bad', '#C4453A'), grey: css('--grey', '#A7B3B9') };
const SCENE_BG = css('--scene-bg', DARK ? '#0F1A20' : '#DCE6EA');
// the map is a separate portal page (hosting forbids iframes); navigation is plain links
const nav = hash => { location.href = 'index.html' + hash; };
const openFactory = d => { if (d.all.n) location.href = `domain.html?d=${d.i}`; }, openCabinet = d => nav(`#/s/${d.i}`);

// ---------- layout ----------
function shelf(items, maxW, gap) { let x = 0, z = 0, rowD = 0, W = 0; items.forEach(it => { if (x > 0 && x + it.w > maxW) { x = 0; z += rowD + gap; rowD = 0; } it.lx = x; it.lz = z; x += it.w + gap; rowD = Math.max(rowD, it.d); W = Math.max(W, x - gap); }); return { w: W, d: z + rowD }; }
SUBS.forEach(d => { const n = d.all.n;
  if (n) { const s = 3.2 + Math.sqrt(n) * 0.78; d.bw = s * 1.3; d.bd = s * 0.95; d.bh = 2.4 + Math.sqrt(n) * 0.3; } else { d.bw = 7; d.bd = 6; d.bh = 0; }
  d.w = d.bw + 3; d.d = d.bd + 4; });
DOMS.forEach(u => { const area = u.subs.reduce((s, d) => s + d.w * d.d, 0); const r = shelf([...u.subs].sort((a, b) => b.all.n - a.all.n), Math.max(30, Math.sqrt(area) * 1.4), 2); u.w = r.w + 8; u.d = r.d + 11; });
const PARK = shelf(DOMS, Math.sqrt(DOMS.reduce((s, u) => s + u.w * u.d, 0)) * 1.55, 9);
DOMS.forEach(u => { u.x0 = u.lx - PARK.w / 2; u.z0 = u.lz - PARK.d / 2; u.cx = u.x0 + u.w / 2; u.cz = u.z0 + u.d / 2;
  u.subs.forEach(d => { d.x0 = u.x0 + 4 + d.lx; d.z0 = u.z0 + 7 + d.lz; d.cx = d.x0 + d.w / 2; d.cz = d.z0 + d.d / 2; }); });

// ---------- scene ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = DARK ? 0.9 : 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(SCENE_BG);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -800, 1600);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = true;
controls.minPolarAngle = 0.5; controls.maxPolarAngle = 1.15; controls.minZoom = 0.35; controls.maxZoom = 9;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
const VIEW = new THREE.Vector3(70, 78, 92);
camera.position.copy(VIEW);
scene.add(new THREE.HemisphereLight('#ffffff', env('#cfd3cc', 0.5), DARK ? 1.1 : 1.6));
const sun = new THREE.DirectionalLight('#fff6e8', DARK ? 1.9 : 2.3); sun.position.set(-90, 160, 100); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
const R = Math.max(PARK.w, PARK.d) * 0.72; Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 10, far: 600 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4;
scene.add(sun);
const mats = {};
const M = (c, o = {}) => mats[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
function mesh(geo, mat, x, y, z, parent = scene) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
const box = (w, h, d, c, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c) : c, x, y + h / 2, z, p);

const pickable = [], PLOT = env('#F0F1EE', 0.16);
{ const g = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), M(DARK ? '#' + new THREE.Color(SCENE_BG).getHexString() : '#E3E7DF')); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  box(PARK.w + 30, 0.12, PARK.d + 30, env('#DADED8', 0.4), 0, 0, 0);
  DOMS.forEach(u => { u.plotM = new THREE.MeshStandardMaterial({ color: PLOT, roughness: 0.9 }); const p = box(u.w, 0.35, u.d, u.plotM, u.cx, 0, u.cz); p.userData.u = u; pickable.push(p);
    box(u.w - 1, 0.04, 0.12, env('#D2D7D1', 0.5), u.cx, 0.35, u.z0 + 5.2); });
  const tg = new THREE.ConeGeometry(1.8, 5, 7); tg.translate(0, 2.5, 0); const N = 120, tr = new THREE.InstancedMesh(tg, M(env('#9DB58A', 0.55)), N); tr.castShadow = true;
  const mm = new THREE.Matrix4(), W = PARK.w / 2 + 22, Dz = PARK.d / 2 + 22;
  for (let i = 0; i < N; i++) { const side = i % 4; if (side === 1) { tr.setMatrixAt(i, mm.makeScale(0, 0, 0)); continue; } { const t = ((i >> 2) / (N / 4)) + (hash('t' + i) % 10) / 400; const x = side < 2 ? -W + t * 2 * W : side === 2 ? -W : W, z = side === 0 ? -Dz : side === 1 ? Dz : -Dz + t * 2 * Dz;
    const s = 0.7 + (hash('s' + i) % 50) / 100; mm.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); tr.setMatrixAt(i, mm); } }
  scene.add(tr); }

// ---------- subdomain buildings ----------
// health in soft status tones (status -line tokens)
const soft = (k, fb) => { const c = new THREE.Color(css(`--${k}-line`, fb)); return DARK ? c.lerp(new THREE.Color(css(`--${k}`, fb)), 0.45) : c; };
const TONE = { bad: soft('bad', '#EDC4BE'), warn: soft('warn', '#EED39C'), ok: soft('ok', '#B8DDC6'), cert: soft('key', '#DCC6E6'), none: new THREE.Color(css('--line', '#DCE3E6')) };
const tone = f => f < 0.5 ? TONE.bad.clone().lerp(TONE.warn, f / 0.5) : TONE.warn.clone().lerp(TONE.ok, (f - 0.5) / 0.5);
const chimneys = [], lamps = [];
function build(d) {
  const g = new THREE.Group(); g.position.set(d.x0, 0.47, d.z0); scene.add(g); d.grp = g;
  const x = 1.5 + d.bw / 2, z = 1.5 + d.bd / 2;
  if (!d.all.n) { // construction site
    const f = M('#C9CFCB'); for (const [w, dd, xx, zz] of [[d.bw, 0.1, 0, -d.bd / 2], [d.bw, 0.1, 0, d.bd / 2], [0.1, d.bd, -d.bw / 2, 0], [0.1, d.bd, d.bw / 2, 0]]) box(w, 0.9, dd, f, x + xx, 0, z + zz, g);
    box(0.4, 8, 0.4, css("--wip", "#6A55B0"), x - 1.6, 0, z, g); box(6, 0.35, 0.35, css("--wip", "#6A55B0"), x + 0.6, 8, z, g); box(0.06, 3, 0.06, '#5E6B64', x + 2.8, 5.2, z, g);
  } else {
    d.wall = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    box(d.bw + 0.6, 0.4, d.bd + 0.6, '#E2E5E1', x, 0, z, g);
    box(d.bw, d.bh, d.bd, d.wall, x, 0.4, z, g);
    // ribbon windows and gates
    box(d.bw + 0.04, 0.5, d.bd * 0.6, M('#C9D9E2', { roughness: 0.3 }), x, 0.4 + d.bh * 0.62, z, g);
    box(0.12, Math.min(2.2, d.bh * 0.6), 2, '#5E6B64', x + d.bw / 2 + 0.02, 0.4, z + d.bd * 0.18, g);
    // roof: teeth are split between data marts, metrics and dashboards in proportion to the number of objects
    const teeth = Math.max(3, Math.round(d.bw / 2.2)), tw = d.bw / teeth, sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(tw, 0); sh.lineTo(0, 1.4); sh.closePath();
    const tg = new THREE.ExtrudeGeometry(sh, { depth: d.bd, bevelEnabled: false }); tg.translate(0, 0, -d.bd / 2);
    const types = ['dm', 'met', 'dash'].filter(t => d.by[t].n); let alloc = types.map(t => Math.max(1, Math.round(teeth * d.by[t].n / d.all.n)));
    while (alloc.reduce((a, b) => a + b, 0) > teeth) { const k = alloc.indexOf(Math.max(...alloc)); alloc[k]--; }
    while (alloc.reduce((a, b) => a + b, 0) < teeth) { const k = alloc.indexOf(Math.max(...alloc)); alloc[k]++; }
    d.roofM = {}; let k = 0;
    types.forEach((t, ti) => { d.roofM[t] = new THREE.MeshStandardMaterial({ roughness: 0.75 });
      for (let j = 0; j < alloc[ti]; j++, k++) { mesh(tg, d.roofM[t], x - d.bw / 2 + k * tw, 0.4 + d.bh, z, g); mesh(new THREE.BoxGeometry(0.1, 1.4, d.bd - 0.3), M('#B7CEDA', { roughness: 0.2 }), x - d.bw / 2 + k * tw + 0.05, 0.4 + d.bh + 0.7, z, g); } });
    const cx = x - d.bw / 2 + 0.9, cz = z - d.bd / 2 + 0.9, chH = 3 + Math.sqrt(d.all.n) * 0.12;
    mesh(new THREE.CylinderGeometry(0.42, 0.58, chH, 10), M('#D9DCD8'), cx, 0.4 + d.bh + chH / 2, cz, g);
    chimneys.push({ x: d.x0 + cx, y: 0.87 + d.bh + chH, z: d.z0 + cz, hot: d.all.hot });
    const c = STATUS[cls(d.share)];
    const l = mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 }), x + d.bw / 2 - 0.8, 0.4 + d.bh + 2.2, z - d.bd / 2 + 0.8, g); l.castShadow = false;
    box(0.1, 2, 0.1, '#9AA29D', x + d.bw / 2 - 0.8, 0.4 + d.bh, z - d.bd / 2 + 0.8, g);
    lamps.push({ m: l, bad: d.share < 0.25 });
  }
  g.traverse(o => { if (o.isMesh) { o.userData.d = d; pickable.push(o); } });
}
SUBS.forEach(build);
const smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ color: DARK ? '#8A979E' : '#ffffff', transparent: true, opacity: DARK ? 0.4 : 0.55, roughness: 1, depthWrite: false }), chimneys.length * 4);
scene.add(smoke);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
function moveSmoke(t) { chimneys.forEach((c, i) => { for (let k = 0; k < 4; k++) { const p = (t * 0.2 + k / 4 + i * 0.13) % 1; smoke.setMatrixAt(i * 4 + k, M4.compose(P.set(c.x + p * 2, c.y + p * 5, c.z + p), Q, S.setScalar(0.5 + p * 1.5))); } }); smoke.instanceMatrix.needsUpdate = true; }
// ---------- directors next to buildings ----------
// the director is the subdomain's data owner; the pose follows health: happy, thinking, upset. No director means an empty chair.
const SKIN = ['#F1C9A5', '#E3B48C', '#C98E62', '#F5D6B8', '#B97C55'];
function person(g, x, z, { suit = '#2E3A45', skin = SKIN[0], mood = 'happy', s = 1.35 } = {}) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p);
  const legs = mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), M('#2A2F36'), 0, 0.45, 0, p);
  const body = mesh(new THREE.BoxGeometry(0.62, 0.8, 0.36), M(suit), 0, 1.3, 0, p);
  mesh(new THREE.BoxGeometry(0.14, 0.42, 0.05), M('#C6402F'), 0, 1.42, 0.19, p);   // tie
  const head = mesh(new THREE.SphereGeometry(0.27, 14, 10), M(skin), 0, 1.98, 0, p);
  mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), M('#3A2E26'), 0, 2.02, -0.02, p);
  const arm = sx => { const a = new THREE.Group(); a.position.set(sx * 0.4, 1.66, 0); p.add(a); mesh(new THREE.BoxGeometry(0.18, 0.72, 0.2), M(suit), 0, -0.34, 0, a); return a; };
  const aL = arm(-1), aR = arm(1);
  if (mood === 'happy') { aR.rotation.z = 2.5; aL.rotation.z = -0.25; }
  else if (mood === 'sad') { head.position.z = 0.1; head.position.y = 1.9; body.rotation.x = 0.22; aL.rotation.z = 0.08; aR.rotation.z = -0.08; }
  else { aR.rotation.x = -1.6; aR.rotation.z = 0.5; head.rotation.z = 0.25; }   // thinking: hand at the chin
  return { p, head, aR, mood };
}
const DIRECTORS = [];
SUBS.forEach(d => { if (!d.all.n) return; const g = d.grp, x = 1.5 + d.bw + 0.9, z = 1.5 + d.bd + 1.4;
  if (has(d, 'st')) { const pp = person(g, x, z, { skin: SKIN[d.i % 5], mood: d.mood, s: 2.1 });
    const mc = { happy: STATUS.ok, flat: STATUS.warn, sad: STATUS.bad }[d.mood] || STATUS.grey; const badge = mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: mc, emissive: mc, emissiveIntensity: 0.5 }), 0, 2.62, 0, pp.p); badge.castShadow = false; pp.p.rotation.y = -0.5; DIRECTORS.push({ ...pp, ph: d.i }); pp.p.traverse(o => { if (o.isMesh) { o.userData.d = d; pickable.push(o); } }); }
  else { const c = new THREE.Group(); c.position.set(x, 0, z); g.add(c); box(0.9, 0.12, 0.9, '#9AA29D', 0, 0.6, 0, c); box(0.9, 0.9, 0.12, '#9AA29D', 0, 0.72, -0.4, c);
    for (const sx of [-0.38, 0.38]) for (const sz of [-0.38, 0.38]) box(0.08, 0.6, 0.08, '#7E8782', sx, 0, sz, c);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 28), new THREE.MeshBasicMaterial({ color: STATUS.bad })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.05, z); g.add(ring); } });

// ---------- the business city and shipping ----------
// trucks carry a subdomain's dashboards to the city: their number follows views, cargo color is the share of views on healthy dashboards
const CITY = { z0: PARK.d / 2 + 36, d: 44, w: Math.min(PARK.w * 0.7, 220) };
{ const R2 = mulberry(7), cg = new THREE.Group(); scene.add(cg);
  const glass = new THREE.MeshStandardMaterial({ color: DARK ? '#5F6F78' : '#FFFFFF', transparent: true, opacity: 0.55, roughness: 0.4 }), edge = new THREE.LineBasicMaterial({ color: css('--line-strong', '#C3CDD2') });
  box(CITY.w + 20, 0.14, CITY.d + 16, env('#E7EAE5', 0.4), 0, 0, CITY.z0 + CITY.d / 2);
  for (let i = 0; i < 140; i++) { const x = (R2() - 0.5) * CITY.w, z = CITY.z0 + 4 + R2() * (CITY.d - 4); if (Math.hypot(x / CITY.w * 2, (z - CITY.z0 - CITY.d / 2) / CITY.d * 2) < 0.28) continue;
    const c = 1 - Math.min(1, Math.hypot(x / CITY.w * 2, (z - CITY.z0 - CITY.d / 2) / CITY.d * 2)), w = 3 + R2() * 5, dd = 3 + R2() * 5, h = 3 + c * c * 34 + R2() * 6;
    const geo = new THREE.BoxGeometry(w, h, dd), m = new THREE.Mesh(geo, glass); m.position.set(x, h / 2, z); cg.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge); e.position.copy(m.position); cg.add(e); }
  const fountain = mesh(new THREE.CylinderGeometry(4, 4.4, 0.8, 28), M('#DCE3E6'), 0, 0.4, CITY.z0 + CITY.d / 2, cg); }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rowBottom = {}; DOMS.forEach(u => { rowBottom[u.lz] = Math.max(rowBottom[u.lz] ?? -1e9, u.z0 + u.d); });
const EDGE_X = PARK.w / 2 + 8, CITY_Z = CITY.z0 + CITY.d / 2;
const TRUCKS = [];
SUBS.forEach(d => { if (!d.views) return; const u = DOMS.find(x => x.name === d.l1);
  const x0 = d.x0 + 1.5 + d.bw / 2, z0 = d.z0 + 1.5 + d.bd + 0.9, zr = rowBottom[u.lz] + 4.5, side = x0 < 0 ? -1 : 1;
  const pts = [[x0, z0], [x0, zr], [side * EDGE_X, zr], [side * EDGE_X, CITY.z0 - 6], [side * 8, CITY.z0 - 6], [side * 6, CITY_Z - 5]];
  const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([...pts[i - 1], ...pts[i], L, l]); L += l; }
  const n = Math.max(1, Math.min(3, Math.round(Math.log10(1 + d.views) - 1.5)));
  for (let k = 0; k < n; k++) TRUCKS.push({ d, seg, L, ph: (hash(d.l2 + k) % 1000) / 1000, sp: 9 + (hash('v' + d.i + k) % 5) });
});
const cab = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.3, 1.25), M('#2F5D7C'), TRUCKS.length), cargo = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 1.6, 1.3), new THREE.MeshStandardMaterial({ roughness: 0.6 }), TRUCKS.length);
cab.castShadow = cargo.castShadow = true; scene.add(cab, cargo);
const goodC = new THREE.Color(STATUS.ok), midC = new THREE.Color(STATUS.warn), badC = new THREE.Color(STATUS.bad);
TRUCKS.forEach((t, k) => { const h = t.d.out.hv; cargo.setColorAt(k, h >= 0.5 ? goodC.clone().lerp(midC, (1 - h) * 0.6) : h >= 0.25 ? midC : badC); });
let delivered = 0; const cityLbl = document.createElement('div'); cityLbl.className = 'plate city'; document.getElementById('labels').appendChild(cityLbl);
const Y = new THREE.Vector3(0, 1, 0);

function moveTrucks(T) {
  TRUCKS.forEach((t, k) => { const cyc = 2 * t.L + 6, p0 = (T * t.sp + t.ph * cyc) % cyc;
    if (t.last != null && t.last < t.L && p0 >= t.L) delivered++; t.last = p0;
    const back = p0 >= t.L + 6, p = p0 < t.L ? p0 : back ? 2 * t.L + 6 - p0 : t.L - 0.001;
    let sg = t.seg[t.seg.length - 1]; for (const x of t.seg) if (p >= x[4] && p < x[4] + x[5]) { sg = x; break; }
    const f = Math.min(1, (p - sg[4]) / sg[5]), x = sg[0] + (sg[2] - sg[0]) * f, z = sg[1] + (sg[3] - sg[1]) * f;
    let dx = sg[2] - sg[0], dz = sg[3] - sg[1]; if (back) { dx = -dx; dz = -dz; } const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    Q.setFromAxisAngle(Y, -Math.atan2(dz, dx)); const ox = -dz * 0.9, oz = dx * 0.9;   // right-hand traffic
    cargo.setMatrixAt(k, M4.compose(P.set(x + ox, 1.15, z + oz), Q, S.set(1, 1, 1)));
    cab.setMatrixAt(k, M4.compose(P.set(x + ox + dx * 1.9, 1.0, z + oz + dz * 1.9), Q, S.set(1, 1, 1))); });
  cab.instanceMatrix.needsUpdate = cargo.instanceMatrix.needsUpdate = true; cab.computeBoundingSphere(); cargo.computeBoundingSphere();
}
function placeCity() { V.set(0, 0, CITY.z0 + CITY.d + 8).project(camera); cityLbl.innerHTML = `<b>City · Leadership</b><span class="m"><span>trucks delivered: ${Number(delivered).toLocaleString('en-US')}</span></span>`;
  cityLbl.style.transform = `translate(${(V.x * 0.5 + 0.5) * innerWidth - cityLbl.offsetWidth / 2}px, ${(-V.y * 0.5 + 0.5) * innerHeight}px)`; }

// ---------- color: health ----------
const colOf = a => !a.n ? TONE.none.clone() : tone(a.good / a.n);
function paint() {
  SUBS.forEach(d => { if (!d.wall) return; d.wall.color.copy(colOf(d.all)).lerp(new THREE.Color(DARK ? '#000000' : '#ffffff'), 0.12);
    Object.entries(d.roofM).forEach(([t, m]) => m.color.copy(colOf(d.by[t])).multiplyScalar(0.94)); });
  DOMS.forEach(u => u.plotM.color.copy(new THREE.Color(PLOT)).lerp(colOf(u.all), 0.12));
  LABELS.forEach(L => L.el.innerHTML = L.html());
  document.getElementById('legend').innerHTML = `<span>Object health:</span><span><span class="sq" style="background:var(--bad-line)"></span>up to 25%</span><span><span class="sq" style="background:var(--warn-line)"></span>about 50%</span><span><span class="sq" style="background:var(--ok-line)"></span>almost 100%</span><span>walls: the whole subdomain, roof: data marts · metrics · dashboards</span><span>size: number of objects</span><span>CPU: hours in 30 days (${INFRA_PERIOD})</span>`;
}

// ---------- labels: domain plates always, subdomain labels when zoomed in, without overlaps ----------
const labelBox = document.getElementById('labels'), LABELS = [];
DOMS.forEach(u => { const el = document.createElement('div'); el.className = 'plate'; labelBox.appendChild(el);
  LABELS.push({ el, u, pri: 1e6 + u.all.n, p: new THREE.Vector3(u.x0 + 2.5, 0.4, u.z0 + 3.4), alt: [new THREE.Vector3(u.cx, 0.4, u.cz), new THREE.Vector3(u.x0 + 2.5, 0.4, u.z0 + u.d - 1), new THREE.Vector3(u.x0 + u.w - 2, 0.4, u.z0 + 3.4), new THREE.Vector3(u.x0 + u.w - 2, 0.4, u.z0 + u.d - 1), new THREE.Vector3(u.cx, 0.4, u.z0 + 2), new THREE.Vector3(u.cx, 0.4, u.z0 + u.d - 2)], left: true, html: () => `<b>${u.name}</b><span class="m">${u.all.n ? `<span><i class="dot ${cls(u.share)}"></i>${pct(u.all.good, u.all.n)}%</span>` : '<span>no objects</span>'}<span>CPU ${fmtK(u.cpu)} h</span><span>AI ${u.air.toFixed(u.air % 1 ? 1 : 0)}/15</span></span>` }); });
SUBS.forEach(d => { const el = document.createElement('div'); el.className = 'lbl'; labelBox.appendChild(el);
  LABELS.push({ el, d, pri: d.all.n, p: new THREE.Vector3(d.x0 + 1.5 + d.bw / 2, d.bh + 3.2, d.z0 + 1.5 + d.bd / 2), html: () => d.all.n
    ? `<span class="dot ${cls(d.share)}"></span>${d.l2}<em>${pct(d.all.good, d.all.n)}%</em>${d.all.hot ? `<b class="bn" title="issues">${PROB}${d.all.hot}</b>` : ''}`
    : `<span class="dot grey"></span>${d.l2}<em>construction</em>` }); });
const ORDER = [...LABELS].sort((a, b) => b.pri - a.pri);
const V = new THREE.Vector3();
let focusU = null, hoverD = null, pinD = null, hoverU = null;
function placeLabels() {
  const showSub = camera.zoom >= 1.4, placed = [], W = innerWidth, H = innerHeight;
  ORDER.forEach(L => {
    const want = L.u ? true : (L.d === hoverD || L.d === pinD || (showSub && focusU && L.d.l1 === focusU.name));
    if (!want) { L.el.style.display = 'none'; return; }
    if (L.w == null) { L.el.style.display = ''; L.el.classList.remove('mini'); L.w = L.el.offsetWidth; L.h = L.el.offsetHeight;
      if (L.u) { L.el.classList.add('mini'); L.mw = L.el.offsetWidth; L.mh = L.el.offsetHeight; L.el.classList.remove('mini'); } }
    const forced = L.d ? (L.d === hoverD || L.d === pinD) : L.u === hoverU;
    let r = null, mini = false;
    for (const m of L.u ? [false, true] : [false]) { const w = m ? L.mw : L.w, h = m ? L.mh : L.h;
      for (const pt of [L.p, ...(L.alt || [])]) { V.copy(pt).project(camera); const x = (V.x * 0.5 + 0.5) * W, y = (-V.y * 0.5 + 0.5) * H;
        const c = L.left ? (pt === L.p ? [x, y - h, x + w, y] : [x - w / 2, y - h / 2, x + w / 2, y + h / 2]) : [x - w / 2, y - h, x + w / 2, y];
        const off = c[0] < 2 || c[2] > W - 2 || c[1] < 2 || c[3] > H - 2;
        const hit = !forced && placed.some(q => c[0] < q[2] + 3 && c[2] + 3 > q[0] && c[1] < q[3] + 2 && c[3] + 2 > q[1]);
        if (!off && !hit) { r = c; mini = m; break; } }
      if (r) break; }
    if (L.u) L.el.classList.toggle('mini', mini);
    if (!r) { L.el.style.display = 'none'; return; }
    placed.push(r); L.el.style.display = ''; L.el.style.transform = `translate(${r[0]}px, ${r[1]}px)`;
    L.el.style.opacity = focusU && L.u && L.u !== focusU ? 0.45 : 1;
    if (L.d) L.el.classList.toggle('sel', forced); });
}

// ---------- camera ----------
let fly = null, rootZoom = 1;
function flyTo(x, z, zoom) { fly = { t: 0, t0: controls.target.clone(), t1: new THREE.Vector3(x, 0, z), z0: camera.zoom, z1: zoom, p0: camera.position.clone() }; }
function focusUnit(u) { focusU = u; document.getElementById('home').hidden = !u; const dl = document.getElementById('domlink'); dl.hidden = !u; if (u) { dl.href = `index.html#/d/${encodeURIComponent(u.name)}`; dl.textContent = `${u.name} workspace`; } if (u) flyTo(u.cx, u.cz, Math.min(2.2, 115 / Math.max(u.w, u.d))); else flyTo(0, 22, rootZoom); }
document.getElementById('home').onclick = () => focusUnit(null);

// ---------- hover card ----------
const tip = document.getElementById('tip'); let hideT = null, tipOver = false;
tip.addEventListener('pointerenter', () => { tipOver = true; clearTimeout(hideT); });
tip.addEventListener('pointerleave', () => { tipOver = false; scheduleHide(); });
function scheduleHide() { clearTimeout(hideT); hideT = setTimeout(() => { if (!tipOver) { tip.hidden = true; setGlow(hoverD, false); hoverD = null; } }, 280); }
function showTip(d, e) {
  clearTimeout(hideT);
  const r = (t, l) => d.by[t].n ? `<span><i class="dot ${cls(d.by[t].good / d.by[t].n)}"></i>${l}</span><em>${pct(d.by[t].good, d.by[t].n)}% of ${fmt(d.by[t].n)}</em>` : '';
  const MOODS = { happy: 'happy', flat: 'thinking', sad: 'upset' };
  tip.innerHTML = d.all.n ? `<h4>${d.l2}</h4><div class="k">${d.l1}</div><div class="ppl"><span>Factory director</span><b>${who(d, 'st') ? who(d, 'st') + (d.mood ? ` · ${MOODS[d.mood]}` : '') : '<i class="no">vacancy</i>'}</b><span>Production manager</span><b>${who(d, 'bp') || '<i class="no">vacancy</i>'}</b></div>
    <div class="tg"><span>Healthy</span><em>${pct(d.all.good, d.all.n)}%</em><span>Good output</span><em>${d.igs ?? '—'} / 100</em>${r('dm', 'Data marts')}${r('met', 'Metrics')}${r('dash', 'Dashboards')}
      <span>Issues</span><em>${d.all.hot}</em><span>AI Ready</span><em>${d.air} / 15</em><span>CPU, 30 days</span><em>${d.cpu != null ? fmtK(d.cpu) + ' h' : 'not linked'}</em><span>Storage</span><em>${d.tb != null ? fmtTb(d.tb) : '—'}</em></div>
    <div class="acts"><a class="primary" data-a="f">Open factory</a><a data-a="c">Workspace</a></div>`
    : `<h4>${d.l2}</h4><div class="k">${d.l1} · construction site: objects not tagged</div><div class="acts"><a data-a="c">Workspace</a></div>`;
  tip.querySelector('[data-a=f]')?.addEventListener('click', () => openFactory(d)); tip.querySelector('[data-a=c]').addEventListener('click', () => openCabinet(d));
  tip.hidden = false; tip.style.left = Math.min(e.clientX + 14, innerWidth - 306) + 'px'; tip.style.top = Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 10) + 'px';
}
function setGlow(d, on) { if (!d) return; d.grp.traverse(o => { if (o.isMesh && o.material?.emissive && !lamps.some(l => l.m === o)) { if (on) { o.userData.mat = o.material; o.material = o.material.clone(); o.material.emissive = new THREE.Color(css('--accent', '#0A7684')); o.material.emissiveIntensity = 0.2; } else if (o.userData.mat) { o.material = o.userData.mat; delete o.userData.mat; } } }); }

// ---------- input ----------
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down = null;
function pick(e) { mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(mouse, camera); const h = ray.intersectObjects(pickable, false)[0]; return h ? h.object.userData : {}; }
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const p = pick(e);
  if (p.d) { if (p.d.all.n) openFactory(p.d); else openCabinet(p.d); } else if (p.u) focusUnit(p.u); });
canvas.addEventListener('pointermove', e => { if (e.buttons) { tip.hidden = true; return; } const p = pick(e), d = p.d || null; hoverU = p.u || (d && DOMS.find(x => x.name === d.l1)) || null; canvas.style.cursor = d || p.u ? "pointer" : '';
  if (!d) { scheduleHide(); return; }
  if (d !== hoverD) { setGlow(hoverD, false); setGlow(d, true); hoverD = d; showTip(d, e); } });
addEventListener('keydown', e => { if (e.key === 'Escape') focusUnit(null); });

// ---------- loop ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); const a = innerWidth / innerHeight, f = 62; camera.left = -f * a; camera.right = f * a; camera.top = f; camera.bottom = -f; camera.updateProjectionMatrix();
  rootZoom = Math.min(1.4, Math.max(0.35, Math.min(f * a / ((PARK.w * 0.8 + (PARK.d + 70) * 0.62) / 2), f / ((PARK.w * 0.45 + (PARK.d + 70) * 0.6) / 2)) * 0.82)); }
addEventListener('resize', resize); resize();
camera.zoom = rootZoom; camera.updateProjectionMatrix();
paint();
{ const u = DOMS.find(x => x.name === QS.get('u')), s = SUBS[+QS.get('s')];
  if (s && QS.get('s') != null) { pinD = s; const uu = DOMS.find(x => x.name === s.l1); focusU = uu; document.getElementById('home').hidden = false; controls.target.set(s.cx, 0, s.cz); camera.zoom = Math.min(3, 80 / Math.max(uu.w, 30)); }
  else if (u) { focusU = u; document.getElementById('home').hidden = false; controls.target.set(u.cx, 0, u.cz); camera.zoom = Math.min(2.2, 115 / Math.max(u.w, u.d)); }
  else controls.target.set(0, 0, 22);
  camera.position.copy(controls.target).add(VIEW); camera.updateProjectionMatrix(); }
if (focusU) { const dl = document.getElementById('domlink'); dl.hidden = false; dl.href = `index.html#/d/${encodeURIComponent(focusU.name)}`; dl.textContent = `${focusU.name} workspace`; }
let last = performance.now(), T = 0;
renderer.setAnimationLoop(now => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  if (fly) { fly.t = Math.min(1, fly.t + dt / 0.9); const k = 1 - (1 - fly.t) ** 3; const off = fly.p0.clone().sub(fly.t0); controls.target.lerpVectors(fly.t0, fly.t1, k); camera.position.copy(controls.target).add(off); camera.zoom = fly.z0 + (fly.z1 - fly.z0) * k; camera.updateProjectionMatrix(); if (fly.t >= 1) fly = null; }
  controls.update(); moveSmoke(T); moveTrucks(T);
  lamps.forEach(l => { l.m.material.emissiveIntensity = l.bad ? 0.4 + 0.8 * (0.5 + 0.5 * Math.sin(T * 5)) : 0.6; });
  renderer.render(scene, camera); placeLabels(); placeCity();
});
window.__map = { focusUnit, SUBS, DOMS, land: () => { if (fly) fly.t = 0.999; } };
