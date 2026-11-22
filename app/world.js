import * as THREE from './vendor/three.module.js';
import { MapControls } from './vendor/MapControls.js';
import { buildOffice, officeSize } from './office.js?v=100';
import { econHtml } from './econ.js?v=100';
import { refFooter } from './reffoot.js?v=100';
import { SUBS, DOMS, DFLOW, NOMS, NOM_MONTH, LEADERS, TREND_DATES, SUBX, qAll, fmt, fmtK, pct, hash, LEVEL_NAMES } from './model.js?v=100';

// =====================================================================================
// Insight Factories world: the 3D game layer of the portal ("Insight factory performance").
// The city in the center is the company leadership. Around it are the domains' industrial zones, each with subdomain factories.
//
// Layout: a force simulation. Domains that read each other's data attract (force is the view volume),
// domains of one data owner stay together, zone rectangles never overlap and leave room for roads.
// Roads: the network runs midway between zones (a generalized Voronoi diagram over fence points), so roads
// never cross a zone and meet at junctions. Each "supplier → consumer" data flow takes the shortest path;
// a road segment's width is the sum of dashboard views of all flows along it.
// Dashboards for the business are flows from zones to the city. Trucks drive the routes of the largest flows.
// Above each factory is a status marker: color is health, it pulses when there are issues.
// =====================================================================================
const QS = new URLSearchParams(location.search), $ = id => document.getElementById(id);
// theme tokens (app/theme.css), read at runtime; the scene follows the light or dark theme
const ROOT = document.documentElement, css = (n, fb) => getComputedStyle(ROOT).getPropertyValue(n).trim() || fb;
const DARK = ROOT.dataset.theme === 'dark' || (ROOT.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!ROOT.dataset.theme) location.reload(); });
// land, roads and fences are dimmed in the dark theme; buildings keep their tones
const env = (c, k = 0.36) => DARK ? '#' + new THREE.Color(c).multiplyScalar(k).getHexString() : c;
const SCENE_BG = css('--scene-bg', DARK ? '#0F1A20' : '#DCE6EA');
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp, smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function perlin(seed) {
  const r = mulberry(seed), a = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const p = new Uint8Array(512); for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  const g = (h, x, y) => (h & 1 ? -x : x) + (h & 2 ? -y : y), f = t => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => { const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
    const u = f(x), v = f(y), A = p[X] + Y, B = p[X + 1] + Y;
    return lerp(lerp(g(p[A], x, y), g(p[B], x - 1, y), u), lerp(g(p[A + 1], x, y - 1), g(p[B + 1], x - 1, y - 1), u), v); };
}
const N1 = perlin(5), N2 = perlin(17);
const fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * N1(x * f, y * f); a *= 0.5; f *= 2.03; } return s; };
const ridge = (x, y) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += a * (1 - Math.abs(N2(x * f, y * f))); a *= 0.5; f *= 2.1; } return s; };
const ROLE_EN = { st: 'data owner', bp: 'BI partner' };
const healthCls = s => s == null ? 'grey' : s >= 0.5 ? 'ok' : s >= 0.25 ? 'warn' : 'bad';
const nw = (n, one, many) => n === 1 ? one : many;

// ---------- data: live subdomains and domain industrial zones ----------
const LIVE = SUBS.filter(d => d.all.n);
LIVE.forEach(d => { const s = 4 + Math.sqrt(d.all.n) * 0.9; d.fw = s * 1.35; d.fd = s; d.fh = 3 + Math.sqrt(d.all.n) * 0.32; d.lw = d.fw + 7; d.ld = d.fd + 9;
  d.views = d.t.dash.reduce((t, o) => t + (o.pop || 0), 0); });
function shelf(items, maxW, gap) { let x = 0, z = 0, rowD = 0, W = 0; items.forEach(it => { if (x > 0 && x + it.lw > maxW) { x = 0; z += rowD + gap; rowD = 0; } it.lx = x; it.lz = z; x += it.lw + gap; rowD = Math.max(rowD, it.ld); W = Math.max(W, x - gap); }); return { w: W, d: z + rowD }; }
const ZONES = DOMS.map(u => ({ u, subs: LIVE.filter(d => d.l1 === u.name).sort((a, b) => b.all.n - a.all.n) })).filter(z => z.subs.length);
const ZBY = new Map(ZONES.map(z => [z.u.name, z]));
// domain office: the data owner and the subdomains' BI partners (no repeats); it comes first in the zone's row
ZONES.forEach(z => { const st = new Map(); z.subs.forEach(d => { const p = d.people?.st; if (p?.n) st.set(p.n, (st.get(p.n) || 0) + d.all.n); });
  const stN = [...st].sort((a, b) => b[1] - a[1])[0]?.[0] || null, bp = [...new Set(z.subs.map(d => d.people?.bp?.n).filter(Boolean))];
  z.staff = [{ role: 'st', n: stN }, ...(bp.length ? bp : [null]).map(n => ({ role: 'bp', n }))]; const o = officeSize(z.staff.length); z.off = { w: o.w, d: o.d, lw: o.w + 4, ld: o.d + 6 }; });
ZONES.forEach((z, i) => { z.i = i; const items = [z.off, ...z.subs], area = items.reduce((s, d) => s + d.lw * d.ld, 0), r = shelf(items, Math.max(26, Math.sqrt(area) * 1.25), 4); z.w = r.w + 12; z.d = r.d + 14; z.r = Math.hypot(z.w, z.d) / 2;
  z.views = z.subs.reduce((t, d) => t + d.views, 0);
  // the domain's data owner is the analytics lead from the Domain Registry named most often across its subdomains (weighted by objects)
  const c = new Map(); z.subs.forEach(d => { const p = d.people?.st; if (!p?.n) return; const e = c.get(p.n) || { p, w: 0 }; e.w += d.all.n; c.set(p.n, e); });
  z.st = [...c.values()].sort((a, b) => b.w - a.w)[0]?.p || null; });
const GROUPS = [...ZONES.reduce((m, z) => { const k = z.st?.n || '—'; if (!m.has(k)) m.set(k, { st: z.st, zones: [] }); m.get(k).zones.push(z); return m; }, new Map()).values()];
GROUPS.forEach((G, k) => { G.k = k; G.n = G.zones.reduce((t, z) => t + z.u.all.n, 0); G.zones.forEach(z => { z.grp = G; }); });
// pairs of domains that exchange data (both directions together)
const PAIRS = [...DFLOW.reduce((m, f) => { const A = ZBY.get(f.a), B = ZBY.get(f.b); if (!A || !B) return m; const k = Math.min(A.i, B.i) + ':' + Math.max(A.i, B.i);
  const p = m.get(k) || { A, B, w: 0 }; p.w += f.w; m.set(k, p); return m; }, new Map()).values()];
const maxPW = Math.max(...PAIRS.map(p => p.w), 1), maxV = Math.max(...ZONES.map(z => z.views), 1);

// ---------- layout: force simulation ----------
const CITY_R = 64, GAP = 26;
{ // start: data owners' plots around a circle, large ones closer to the city
  const order = [...GROUPS].sort((a, b) => b.n - a.n).flatMap(G => [...G.zones].sort((a, b) => b.u.all.n - a.u.all.n)), tot = order.reduce((t, z) => t + z.w + GAP, 0); let acc = 0;
  order.forEach((z, k) => { const a = (acc + (z.w + GAP) / 2) / tot * Math.PI * 2; acc += z.w + GAP; const r = CITY_R + 60 + z.r + (k % 3) * 34; z.x = Math.cos(a) * r; z.z = Math.sin(a) * r; }); }
const overlap = (A, B) => { const dx = B.x - A.x, dz = B.z - A.z, ox = (A.w + B.w) / 2 + GAP - Math.abs(dx), oz = (A.d + B.d) / 2 + GAP - Math.abs(dz); return [dx, dz, ox, oz]; };
function separate(A, B, k = 0.5) { const [dx, dz, ox, oz] = overlap(A, B); if (ox <= 0 || oz <= 0) return;
  if (ox < oz) { const s = (dx >= 0 ? 1 : -1) * ox * k; A.x -= s; B.x += s; } else { const s = (dz >= 0 ? 1 : -1) * oz * k; A.z -= s; B.z += s; } }
function cityPush(z) { const nx = clamp(0, z.x - z.w / 2, z.x + z.w / 2), nz = clamp(0, z.z - z.d / 2, z.z + z.d / 2), d = Math.hypot(nx, nz), m = CITY_R + GAP + 4;
  if (d < m) { const L = Math.hypot(z.x, z.z) || 1; z.x += z.x / L * (m - d); z.z += z.z / L * (m - d); } }
for (let it = 0; it < 1400; it++) { const al = 1 - it / 1400;
  PAIRS.forEach(p => { const { A, B } = p, dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz) || 1, t = A.r + B.r + GAP * 0.6; if (d <= t) return;
    const f = 0.03 * Math.sqrt(p.w / maxPW) * (d - t) / d * al; A.x += dx * f; A.z += dz * f; B.x -= dx * f; B.z -= dz * f; });
  GROUPS.forEach(G => { if (G.zones.length < 2) return; const cx = G.zones.reduce((t, z) => t + z.x, 0) / G.zones.length, cz = G.zones.reduce((t, z) => t + z.z, 0) / G.zones.length;
    G.zones.forEach(z => { z.x += (cx - z.x) * 0.012 * al; z.z += (cz - z.z) * 0.012 * al; }); });
  ZONES.forEach(z => { const L = Math.hypot(z.x, z.z) || 1, t = CITY_R + GAP + z.r * 0.7, f = 0.008 * (0.4 + Math.sqrt(z.views / maxV)) * (L - t) / L * al; z.x -= z.x * f; z.z -= z.z * f; });
  for (let i = 0; i < ZONES.length; i++) { for (let j = i + 1; j < ZONES.length; j++) separate(ZONES[i], ZONES[j]); cityPush(ZONES[i]); } }
for (let it = 0; it < 200; it++) for (let i = 0; i < ZONES.length; i++) { for (let j = i + 1; j < ZONES.length; j++) separate(ZONES[i], ZONES[j], 0.6); cityPush(ZONES[i]); }
ZONES.forEach(z => { z.x = Math.round(z.x); z.z = Math.round(z.z); z.x0 = z.x - z.w / 2; z.z0 = z.z - z.d / 2;
  z.off.cx = z.x0 + 6 + z.off.lx + z.off.lw / 2; z.off.cz = z.z0 + 8 + z.off.lz + z.off.ld / 2;
  z.subs.forEach(d => { d.wz = z; d.x0 = z.x0 + 6 + d.lx; d.z0 = z.z0 + 8 + d.lz; d.cx = d.x0 + d.lw / 2; d.cz = d.z0 + d.ld / 2; d.doorX = -d.fw * 0.24; }); });
const WORLD_R = Math.max(...ZONES.map(z => Math.hypot(z.x, z.z) + z.r)) + 40;
const rectDist = (Z, x, z) => Math.hypot(Math.max(Z.x0 - x, 0, x - (Z.x0 + Z.w)), Math.max(Z.z0 - z, 0, z - (Z.z0 + Z.d)));
const rectNear = (Z, x, z) => [clamp(x, Z.x0, Z.x0 + Z.w), clamp(z, Z.z0, Z.z0 + Z.d)];

// ---------- road network: midway between zone fences and the city ----------
// points along fences (owner: a zone, the city or the world edge) → Delaunay → Voronoi edges between different owners
const SITES = []; { const R = mulberry(11), jit = () => (R() - 0.5) * 0.6;
  ZONES.forEach(Z => { const o = 1.5, x0 = Z.x0 - o, z0 = Z.z0 - o, w = Z.w + 2 * o, d = Z.d + 2 * o, step = 5;
    for (let t = 0; t < w; t += step) { SITES.push([x0 + t + jit(), z0 + jit(), Z.i], [x0 + w - t + jit(), z0 + d + jit(), Z.i]); }
    for (let t = 0; t < d; t += step) { SITES.push([x0 + w + jit(), z0 + t + jit(), Z.i], [x0 + jit(), z0 + d - t + jit(), Z.i]); } });
  for (let a = 0; a < Math.PI * 2; a += 5 / (CITY_R + 2)) SITES.push([Math.cos(a) * (CITY_R + 2) + jit(), Math.sin(a) * (CITY_R + 2) + jit(), -1]);
  for (let a = 0; a < Math.PI * 2; a += 14 / WORLD_R) SITES.push([Math.cos(a) * (WORLD_R + 10) + jit(), Math.sin(a) * (WORLD_R + 10) + jit(), -2]);
  for (let i = SITES.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [SITES[i], SITES[j]] = [SITES[j], SITES[i]]; } }
function delaunay(P) { // Bowyer–Watson
  const n = P.length, S = WORLD_R * 20, pts = [...P, [-S, -S], [S, -S], [0, S]], T = [];
  const mk = (a, b, c) => { const [ax, az] = pts[a], [bx, bz] = pts[b], [cx, cz] = pts[c], d = 2 * (ax * (bz - cz) + bx * (cz - az) + cx * (az - bz));
    const ux = ((ax * ax + az * az) * (bz - cz) + (bx * bx + bz * bz) * (cz - az) + (cx * cx + cz * cz) * (az - bz)) / d, uz = ((ax * ax + az * az) * (cx - bx) + (bx * bx + bz * bz) * (ax - cx) + (cx * cx + cz * cz) * (bx - ax)) / d;
    return { a, b, c, x: ux, z: uz, r2: (ax - ux) ** 2 + (az - uz) ** 2 }; };
  T.push(mk(n, n + 1, n + 2));
  for (let i = 0; i < n; i++) { const [px, pz] = pts[i], bad = [], keep = [];
    for (const t of T) ((px - t.x) ** 2 + (pz - t.z) ** 2 < t.r2 ? bad : keep).push(t);
    const E = new Map(); for (const t of bad) for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) { const k = u < v ? u * 1e5 + v : v * 1e5 + u; E.set(k, E.has(k) ? null : [u, v]); }
    T.length = 0; T.push(...keep); for (const e of E.values()) if (e) T.push(mk(e[0], e[1], i)); }
  return T.filter(t => t.a < n && t.b < n && t.c < n); }
const TRI = delaunay(SITES.map(s => [s[0], s[1]]));
const NODES = TRI.map(t => ({ x: t.x, z: t.z, adj: [], own: new Set([SITES[t.a][2], SITES[t.b][2], SITES[t.c][2]]) }));
const EDGES = []; { const E = new Map();
  TRI.forEach((t, ti) => { for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) { const k = u < v ? u * 1e5 + v : v * 1e5 + u; if (E.has(k)) E.get(k).push(ti); else E.set(k, [u, v, ti]); } });
  for (const [u, v, t1, t2] of E.values()) { if (t2 == null) continue; const ou = SITES[u][2], ov = SITES[v][2]; if (ou === ov || ou === -2 || ov === -2) continue;
    const A = NODES[t1], B = NODES[t2], len = Math.hypot(A.x - B.x, A.z - B.z); if (Math.hypot(A.x, A.z) > WORLD_R || Math.hypot(B.x, B.z) > WORLD_R) continue;
    const e = { a: t1, b: t2, len, t: 0, flows: [] }; EDGES.push(e); A.adj.push(e); B.adj.push(e); } }
// nodes next to an owner: access to a zone or to the city
const ADJ = new Map(); NODES.forEach((N, i) => { if (!N.adj.length) return; N.own.forEach(o => { if (o < -1) return; if (!ADJ.has(o)) ADJ.set(o, []); ADJ.get(o).push(i); }); });
const accessCost = (o, i) => { const N = NODES[i]; return o === -1 ? Math.max(0, Math.hypot(N.x, N.z) - CITY_R) : rectDist(ZONES[o], N.x, N.z); };
function route(oa, ob) { // Dijkstra from all of A's access nodes to any access node of B
  const dist = new Float64Array(NODES.length).fill(Infinity), prev = new Int32Array(NODES.length).fill(-1), via = new Array(NODES.length), goal = new Set(ADJ.get(ob) || []), H = [];
  const push = (d, i) => { H.push([d, i]); let k = H.length - 1; while (k) { const p = (k - 1) >> 1; if (H[p][0] <= H[k][0]) break; [H[p], H[k]] = [H[k], H[p]]; k = p; } };
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === k) break; [H[m], H[k]] = [H[k], H[m]]; k = m; } } return top; };
  (ADJ.get(oa) || []).forEach(i => { const d = accessCost(oa, i) * 1.5; if (d < dist[i]) { dist[i] = d; push(d, i); } });
  let best = -1, bestD = Infinity;
  while (H.length) { const [d, i] = pop(); if (d > dist[i]) continue; if (d >= bestD) break;
    if (goal.has(i)) { const t = d + accessCost(ob, i) * 1.5; if (t < bestD) { bestD = t; best = i; } }
    for (const e of NODES[i].adj) { const j = e.a === i ? e.b : e.a, nd = d + e.len; if (nd < dist[j]) { dist[j] = nd; prev[j] = i; via[j] = e; push(nd, j); } } }
  if (best < 0) return null; const nodes = [], edges = []; for (let i = best; i >= 0; i = prev[i]) { nodes.push(i); if (via[i] && prev[i] >= 0) edges.push(via[i]); }
  return { nodes: nodes.reverse(), edges }; }
// flows: between domains (DFLOW) and from a zone to the city (views of its own dashboards)
const FLOWS = [];
DFLOW.forEach(f => { const A = ZBY.get(f.a), B = ZBY.get(f.b); if (A && B) FLOWS.push({ A, B, w: f.w, n: f.n, f }); });
ZONES.forEach(Z => { if (Z.views) FLOWS.push({ A: Z, B: null, w: Z.views * 0.5, n: Z.subs.reduce((t, d) => t + d.t.dash.length, 0) }); });
const ACC = new Map();   // access roads: owner + node → traffic
FLOWS.forEach((F, k) => { F.k = k; const oa = F.A.i, ob = F.B ? F.B.i : -1, r = route(oa, ob); if (!r) return; F.route = r;
  r.edges.forEach(e => { e.t += F.w; e.flows.push(F); });
  [[oa, r.nodes[0]], [ob, r.nodes.at(-1)]].forEach(([o, i]) => { const key = o + ':' + i, a = ACC.get(key) || { o, i, t: 0, flows: [] }; a.t += F.w; a.flows.push(F); ACC.set(key, a); }); });
const USED = EDGES.filter(e => e.t > 0), maxT = Math.max(...USED.map(e => e.t), ...[...ACC.values()].map(a => a.t), 1);
const widthOf = t => 1.3 + 6.2 * Math.pow(t / maxT, 0.6);
// chains: runs of edges with equal traffic between forks
const deg = new Map(); USED.forEach(e => { deg.set(e.a, (deg.get(e.a) || 0) + 1); deg.set(e.b, (deg.get(e.b) || 0) + 1); });
const accNode = new Set([...ACC.values()].map(a => a.i));
const isBreak = i => deg.get(i) !== 2 || accNode.has(i) || (() => { const es = NODES[i].adj.filter(e => e.t > 0); return es.length === 2 && Math.abs(es[0].t - es[1].t) > 1e-6; })();
const CHAINS = []; { const seen = new Set();
  const walk = (start, e0) => { const ids = [start]; let cur = start, e = e0;
    for (;;) { seen.add(e); const nx = e.a === cur ? e.b : e.a; ids.push(nx); cur = nx; if (isBreak(cur)) break; const ne = NODES[cur].adj.find(x => x.t > 0 && x !== e && !seen.has(x)); if (!ne) break; e = ne; }
    CHAINS.push({ ids, t: e0.t, flows: e0.flows, w: widthOf(e0.t) }); };
  USED.forEach(e => { if (seen.has(e)) return; const s = isBreak(e.a) ? e.a : isBreak(e.b) ? e.b : e.a; walk(s, e); }); }
const chaikin = (P, n = 2) => { for (let k = 0; k < n; k++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1]; Q.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); } Q.push(P.at(-1)); P = Q; } return P; };
CHAINS.forEach(C => { C.pts = chaikin(C.ids.map(i => [NODES[i].x, NODES[i].z]), 3); });
// access road: from the fence (or the city edge) to a network node
const ACCESS = [...ACC.values()].map(a => { const N = NODES[a.i], p = a.o === -1 ? (() => { const L = Math.hypot(N.x, N.z) || 1; return [N.x / L * (CITY_R - 2), N.z / L * (CITY_R - 2)]; })() : rectNear(ZONES[a.o], N.x, N.z);
  return { ...a, pts: [p, [N.x, N.z]], w: widthOf(a.t) }; });
// truck route: gate → access road → chain of nodes → access road → gate
FLOWS.forEach(F => { if (!F.route) return; const r = F.route, s = NODES[r.nodes[0]], e = NODES[r.nodes.at(-1)];
  const pA = rectNear(F.A, s.x, s.z), pB = F.B ? rectNear(F.B, e.x, e.z) : (() => { const L = Math.hypot(e.x, e.z) || 1; return [e.x / L * (CITY_R - 4), e.z / L * (CITY_R - 4)]; })();
  F.path = chaikin([pA, ...r.nodes.map(i => [NODES[i].x, NODES[i].z]), pB], 3); });
// for terrain and forest: road points with half-width in a grid
const RG = new Map(), RC = 12, rgPut = (x, z, h) => { const k = Math.floor(x / RC) + ':' + Math.floor(z / RC); if (!RG.has(k)) RG.set(k, []); RG.get(k).push([x, z, h]); };
const sampleLine = (P, h) => { for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 2)); for (let k = 0; k <= n; k++) rgPut(ax + (bx - ax) * k / n, az + (bz - az) * k / n, h); } };
CHAINS.forEach(C => sampleLine(C.pts, C.w / 2)); ACCESS.forEach(A => sampleLine(A.pts, A.w / 2));
function roadDist(x, z) { const cx = Math.floor(x / RC), cz = Math.floor(z / RC); let best = 1e9;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const L = RG.get((cx + i) + ':' + (cz + j)); if (L) for (const [px, pz, h] of L) { const d = Math.hypot(px - x, pz - z) - h; if (d < best) best = d; } } return best; }

// ---------- terrain: soft hills between zones, mountains at the edge; flat under zones, the city and roads ----------
function flatMask(x, z) { let m = smooth(CITY_R + 16, CITY_R + 4, Math.hypot(x, z)); for (const Z of ZONES) m = Math.max(m, smooth(12, 2, rectDist(Z, x, z))); return m; }
function hRaw(x, z) { const r = Math.hypot(x, z), mount = smooth(WORLD_R * 0.98, WORLD_R * 1.5, r); return Math.max(0, fbm(x * 0.009, z * 0.009) * 8 + 2) + mount * (ridge(x * 0.004, z * 0.004) * 95 + 8); }
const nearZone = (x, z) => { let b = null, bd = 1e9; for (const Z of ZONES) { const d = rectDist(Z, x, z); if (d < bd) { bd = d; b = Z; } } return [b, bd]; };
const SIZE = WORLD_R * 3, SEG = 320;
const terrGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); terrGeo.rotateX(-Math.PI / 2);
const pos = terrGeo.attributes.position, cols = new Float32Array(pos.count * 3), HMAP = new Float32Array(pos.count);
const cGrass = new THREE.Color(env('#A7C48E')), cGrass2 = new THREE.Color(env('#90B67D')), cMeadow = new THREE.Color(env('#BCCB8E')), cRock = new THREE.Color(env('#A8A193', 0.26)), cSnow = new THREE.Color(env('#F4F6F4', 0.3)), cVerge = new THREE.Color(env('#B9C2A8')), cLot = [new THREE.Color(env('#B4CC97')), new THREE.Color(env('#9DC297'))], tmp = new THREE.Color();
for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), near = Math.hypot(x, z) < WORLD_R * 1.05;
  const rd = near ? roadDist(x, z) : 1e9, fm = near ? Math.max(flatMask(x, z), smooth(8, 1, rd)) : 0, h = lerp(hRaw(x, z), 0, fm);
  pos.setY(i, h); HMAP[i] = h;
  if (h > 34) tmp.copy(cSnow); else if (h > 12) tmp.copy(cRock).lerp(cSnow, smooth(24, 34, h));
  else { tmp.copy(cGrass).lerp(cGrass2, clamp(fbm(x * 0.018, z * 0.018) + 0.5, 0, 1)).lerp(cMeadow, clamp(fbm(x * 0.006 + 9, z * 0.006) * 2, 0, 0.45)); }
  if (near) { const [Z, d] = nearZone(x, z); if (Z && d < 20) tmp.lerp(cLot[Z.grp.k % 2], 0.5 * smooth(20, 4, d)); if (rd < 3) tmp.lerp(cVerge, 0.6 * smooth(3, 0, rd)); }
  cols.set([tmp.r, tmp.g, tmp.b], i * 3); }
terrGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); terrGeo.computeVertexNormals();
const hAt = (x, z) => { const s = SIZE / SEG, gx = clamp(Math.round((x + SIZE / 2) / s), 0, SEG), gz = clamp(Math.round((z + SIZE / 2) / s), 0, SEG); return HMAP[gz * (SEG + 1) + gx]; };

// ---------- scene, light, sky ----------
const canvas = $('scene'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = DARK ? 0.95 : 1.08;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
// sky: a vertical gradient around the --scene-bg token, slightly bluer at the top
{ const c = document.createElement('canvas'); c.width = 2; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256), bg = new THREE.Color(SCENE_BG);
  const top = '#' + bg.clone().lerp(new THREE.Color(css('--info', '#34689A')), DARK ? 0.18 : 0.22).getHexString(), low = '#' + bg.clone().lerp(new THREE.Color(css('--bg', '#EEF2F3')), 0.5).getHexString();
  gr.addColorStop(0, top); gr.addColorStop(0.55, SCENE_BG); gr.addColorStop(1, low); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; scene.background = tx; }
scene.fog = new THREE.Fog(SCENE_BG, WORLD_R * 1.8, WORLD_R * 4.6);
const camera = new THREE.PerspectiveCamera(36, 1, 2, WORLD_R * 12);
const controls = new MapControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = 1.2; controls.minDistance = 30; controls.maxDistance = WORLD_R * 3.4; controls.screenSpacePanning = false;
scene.add(new THREE.HemisphereLight('#f4f8ff', env('#9aa88f', 0.5), DARK ? 1.05 : 1.45));
const sun = new THREE.DirectionalLight('#fff1dc', DARK ? 2.0 : 2.4); sun.position.set(-WORLD_R * 0.7, WORLD_R * 0.85, WORLD_R * 0.45); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -WORLD_R, right: WORLD_R, top: WORLD_R, bottom: -WORLD_R, near: 1, far: WORLD_R * 4 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.6; scene.add(sun);
const terrain = new THREE.Mesh(terrGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 })); terrain.receiveShadow = true; scene.add(terrain);
const mats = {}, M = (c, o = {}) => mats[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
function box(w, h, d, c, x, y, z, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c) : c); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
const hitList = [];

// ---------- roads: shoulder, asphalt, markings; round pads at junctions ----------
const roadMat = (c, off) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off * 2 });
const mShoulder = roadMat(env('#CFCBBE'), -1), mAsphalt = roadMat(env('#62686B', 0.7), -2), mLine = roadMat(env('#F3F1E6', 0.45), -3), mHi = roadMat(css('--accent', '#0A7684'), -4);
function ribbon(pts, width, y, mat, dash = 0) { const v = [], idx = []; let acc = 0;
  const nrm = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [-dz / L * width / 2, dx / L * width / 2]; };
  for (let i = 0; i < pts.length; i++) { const p = pts[i], [nx, nz] = nrm(i); if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    v.push(p[0] + nx, y, p[1] + nz, p[0] - nx, y, p[1] - nz);
    if (i && (!dash || Math.floor(acc / dash) % 2 === 0)) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m; }
function disc(x, z, r, y, mat) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; }
const JUNC = new Map(); const junc = (p, w) => { const k = Math.round(p[0] * 2) + ':' + Math.round(p[1] * 2), j = JUNC.get(k); if (!j || j.w < w) JUNC.set(k, { p, w }); };
CHAINS.forEach(C => { ribbon(C.pts, C.w + 1.4, 0.06, mShoulder); C.mesh = ribbon(C.pts, C.w, 0.08, mAsphalt); C.mesh.userData.chain = C; hitList.push(C.mesh);
  if (C.w > 3.4) ribbon(C.pts, 0.22, 0.1, mLine, 2.2); junc(C.pts[0], C.w); junc(C.pts.at(-1), C.w); });
ACCESS.forEach(A => { ribbon(A.pts, A.w + 1.4, 0.06, mShoulder); ribbon(A.pts, A.w, 0.08, mAsphalt); junc(A.pts[1], A.w); });
JUNC.forEach(({ p, w }) => { disc(p[0], p[1], w / 2 + 0.7, 0.06, mShoulder); disc(p[0], p[1], w / 2, 0.08, mAsphalt); });

// ---------- city: company leadership; towers with windows ----------
const winTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = env('#DCE6EC', 0.45); g.fillRect(0, 0, 64, 64);
  for (let y = 4; y < 64; y += 16) for (let x = 4; x < 64; x += 16) { g.fillStyle = (x * 7 + y * 3) % 5 ? (DARK ? '#E8C766' : '#7F97AA') : (DARK ? '#3C4D57' : '#A9BFCE'); g.fillRect(x, y, 9, 10); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; })();
const towerSide = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.35, metalness: 0.25 }), towerTop = M(env('#C9D3D9', 0.5));
{ const R = mulberry(3);
  for (let i = 0; i < 260; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * (CITY_R - 8); if (r < 17) continue; const c = 1 - r / CITY_R, w = 4 + R() * 5, d = 4 + R() * 5, h = 4 + c * c * 70 + R() * 10;
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) { const f = Math.floor(k / 4), sx = f < 2 ? d : w; uv.setXY(k, uv.getX(k) * sx / 4, uv.getY(k) * h / 4); }
    const m = new THREE.Mesh(g, [towerSide, towerSide, towerTop, towerTop, towerSide, towerSide]); m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); m.castShadow = m.receiveShadow = true; scene.add(m); } }
disc(0, 0, CITY_R - 1, 0.04, M(env('#D6DBD6'))); disc(0, 0, 15, 0.12, M(env('#E8E2D4')));
ribbon(Array.from({ length: 97 }, (_, i) => [Math.cos(i / 96 * Math.PI * 2) * (CITY_R - 3), Math.sin(i / 96 * Math.PI * 2) * (CITY_R - 3)]), 4, 0.1, mAsphalt);

// ---------- subdomain factories ----------
// walls: health in soft status tones; roof: AI-Ready level L0–L4
const soft = (k, fb) => { const c = new THREE.Color(css(`--${k}-line`, fb)); return DARK ? c.lerp(new THREE.Color(css(`--${k}`, fb)), 0.45) : c; };
const TONE = { bad: soft('bad', '#EDC4BE'), mid: soft('warn', '#EED39C'), ok: soft('ok', '#B8DDC6') };
const LV = [0, 1, 2, 3, 4].map(k => css('--lv' + k, ['#B6C0C5', '#AD6E38', '#8796A0', '#BF9629', '#3C8C7A'][k]));
const chimneys = [], glass = M('#4F6272', { roughness: 0.25, metalness: 0.4 }), stripe = M(css('--bad', '#C4453A'));
function wallColor(d) { const s = d.share ?? 0; return s >= 0.5 ? TONE.mid.clone().lerp(TONE.ok, (s - 0.5) * 2) : TONE.bad.clone().lerp(TONE.mid, s * 2); }
LIVE.forEach(d => { const g = new THREE.Group(); g.position.set(d.cx, 0, d.cz); scene.add(g); d.grp = g;
  box(d.lw - 1, 0.2, d.ld - 1, env('#BDC2BA', 0.5), 0, 0.1, 0, g);
  const hall = box(d.fw, d.fh, d.fd, new THREE.MeshStandardMaterial({ color: wallColor(d), roughness: 0.8 }), 0, d.fh / 2 + 0.2, -1.5, g); hall.userData.d = d; hitList.push(hall); d.hall = hall;
  // ribbon glazing and plinth
  box(d.fw + 0.06, 0.9, d.fd * 0.8, glass, 0, d.fh * 0.62, -1.5, g); box(d.fw * 0.86, 0.9, d.fd + 0.06, glass, 0, d.fh * 0.62, -1.5, g);
  box(d.fw + 0.1, 0.5, d.fd + 0.1, M('#8F948E'), 0, 0.45, -1.5, g);
  // sawtooth roof in the AI-Ready level color
  const teeth = Math.max(2, Math.round(d.fw / 4)), tw = d.fw / teeth, roof = M(LV[d.level ?? 0]);
  for (let k = 0; k < teeth; k++) { const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(tw, 0); shape.lineTo(tw, 1.5); shape.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d.fd, bevelEnabled: false }); const m = new THREE.Mesh(geo, roof); m.position.set(-d.fw / 2 + k * tw, d.fh + 0.2, -1.5 - d.fd / 2); m.castShadow = true; g.add(m);
    box(0.12, 1.3, d.fd - 0.4, glass, -d.fw / 2 + (k + 1) * tw - 0.08, d.fh + 0.85, -1.5, g); }
  // metrics warehouse
  const sw = Math.min(d.fw * 0.5, 2 + Math.sqrt(d.t.met.length) * 0.6), sh = 2 + Math.sqrt(d.t.met.length) * 0.15;
  const store = box(sw, sh, d.fd * 0.7, '#D9DCD6', d.fw / 2 + sw / 2 + 0.6, sh / 2 + 0.2, -1.5, g); store.userData.d = d; hitList.push(store);
  // chimneys are data marts, with a red band at the top
  const nc = Math.max(1, Math.min(4, Math.round(Math.sqrt(d.t.dm.length) / 3)));
  for (let k = 0; k < nc; k++) { const h = d.fh + 4 + k * 1.3, x = -d.fw / 2 + 1.5 + k * 2, z = -1.5 - d.fd / 2 + 1.5, c = box(1, h, 1, '#9A9C97', x, h / 2 + 0.2, z, g); c.geometry = new THREE.CylinderGeometry(0.5, 0.7, h, 12);
    const s = box(1, 0.7, 1, stripe, x, h - 0.6, z, g); s.geometry = new THREE.CylinderGeometry(0.53, 0.55, 0.7, 12);
    chimneys.push({ x: d.cx + x, y: h + 0.4, z: d.cz + z, bad: (d.share ?? 0) < 0.25 }); }
  // loading ramp and gates
  box(d.fw * 0.42, 0.9, 2, '#9BA39C', d.fw * 0.22, 0.65, d.fd / 2 - 0.2, g);
  const dw = Math.min(4.2, d.fw * 0.3), dh = Math.min(d.fh * 0.5, 3.6); box(dw, dh, 0.2, '#3E4A55', d.doorX, dh / 2 + 0.2, -1.5 + d.fd / 2 + 0.06, g); });
// industrial zone: pad, fence with posts
ZONES.forEach(Z => { const pad = box(Z.w - 0.4, 0.1, Z.d - 0.4, env('#CED2CB', 0.42), Z.x, 0.05, Z.z); pad.userData.zone = Z; hitList.push(pad); pad.castShadow = false;
  const fm = M(env('#A3AAA3', 0.6)), post = M(env('#7E857F', 0.7));
  [[Z.x, Z.z0, Z.w, 0.12], [Z.x, Z.z0 + Z.d, Z.w, 0.12], [Z.x0, Z.z, 0.12, Z.d], [Z.x0 + Z.w, Z.z, 0.12, Z.d]].forEach(([x, z, w, d]) => { const f = box(w, 1.1, d, fm, x, 0.75, z); f.castShadow = false; });
  for (let t = 0; t <= Z.w; t += 4) { box(0.3, 1.4, 0.3, post, Z.x0 + t, 0.7, Z.z0); box(0.3, 1.4, 0.3, post, Z.x0 + t, 0.7, Z.z0 + Z.d); }
  for (let t = 4; t < Z.d; t += 4) { box(0.3, 1.4, 0.3, post, Z.x0, 0.7, Z.z0 + t); box(0.3, 1.4, 0.3, post, Z.x0 + Z.w, 0.7, Z.z0 + t); } });

// ---------- zone offices ----------
ZONES.forEach(Z => { const O = buildOffice(Z.staff); O.g.position.set(Z.off.cx, 0, Z.off.cz); scene.add(O.g); Z.office = O;
  O.g.traverse(m => { if (m.isMesh) { m.userData.zone = Z; hitList.push(m); } }); });

// ---------- status markers above factories ----------
const MK = { ok: new THREE.Color(css('--ok', '#2E8A57')), warn: new THREE.Color(css('--warn', '#C88A12')), bad: new THREE.Color(css('--bad', '#C4453A')), grey: new THREE.Color(css('--grey', '#A7B3B9')) };
const markers = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.1 }), LIVE.length);
LIVE.forEach((d, k) => { d.mk = { y: d.fh + 10, hot: d.all.hot > 0 }; markers.setColorAt(k, MK[healthCls(d.share)]); }); scene.add(markers);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), SC = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
function moveMarkers(T) { LIVE.forEach((d, k) => { const s = d.mk.hot ? 1 + 0.22 * Math.sin(T * 4 + k) : 0.85; Q.setFromAxisAngle(Y, T * 0.8 + k);
  markers.setMatrixAt(k, M4.compose(P.set(d.cx, d.mk.y + Math.sin(T * 1.6 + k) * 0.3, d.cz - 1.5), Q, SC.set(s, s * 1.3, s))); }); markers.instanceMatrix.needsUpdate = true; Q.identity(); }

// ---------- forest: groves in the gaps, conifers and broadleaf ----------
{ const R = mulberry(9), pts = [];
  for (let i = 0; i < 26000 && pts.length < 4200; i++) { const a = R() * Math.PI * 2, r = CITY_R + 6 + Math.sqrt(R()) * WORLD_R * 1.2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (fbm(x * 0.014, z * 0.014) < 0.02) continue; if (flatMask(x, z) > 0.02 || roadDist(x, z) < 4) continue; const h = hAt(x, z); if (h > 16) continue; pts.push([x, h, z, 0.7 + R() * 0.7, R() < 0.55]); }
  const pine = pts.filter(p => p[4]), oak = pts.filter(p => !p[4]), q = new THREE.Quaternion(), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(2, 6, 8), M(env('#5A8A57', 0.6)), pine.length), ball = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.3, 1), M(env('#79A35E', 0.6), { flatShading: true }), oak.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.38, 2.2, 6), M('#7B6047'), pts.length);
  pine.forEach(([x, y, z, s], k) => { crown.setMatrixAt(k, M4.compose(V3(x, y + 5 * s, z), q, V3(s, s, s))); crown.setColorAt(k, new THREE.Color(env('#5A8A57', 0.6)).offsetHSL(((k * 37) % 20 - 10) / 500, 0, ((k * 13) % 20 - 10) / 220)); });
  oak.forEach(([x, y, z, s], k) => { ball.setMatrixAt(k, M4.compose(V3(x, y + 3.6 * s, z), q, V3(s, s * 0.9, s))); ball.setColorAt(k, new THREE.Color(env('#7DA65F', 0.6)).offsetHSL(((k * 29) % 20 - 10) / 400, 0, ((k * 17) % 20 - 10) / 200)); });
  pts.forEach(([x, y, z, s], k) => trunk.setMatrixAt(k, M4.compose(V3(x, y + 1.1 * s, z), q, V3(s, s, s))));
  crown.castShadow = ball.castShadow = trunk.castShadow = true; scene.add(crown, ball, trunk); }

// ---------- chimney smoke ----------
const PUFF = 4, smoke = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#F2F2EE', transparent: true, opacity: 0.45, roughness: 1, depthWrite: false }), chimneys.length * PUFF); scene.add(smoke);
chimneys.forEach((c, i) => { for (let k = 0; k < PUFF; k++) smoke.setColorAt(i * PUFF + k, new THREE.Color(c.bad ? '#8E8A84' : DARK ? '#9AA6AC' : '#F4F4F0')); });
function moveSmoke(t) { chimneys.forEach((c, i) => { for (let k = 0; k < PUFF; k++) { const p = (t * 0.16 + k / PUFF + i * 0.17) % 1, s = 0.6 + p * 1.6;
  smoke.setMatrixAt(i * PUFF + k, M4.compose(P.set(c.x + p * 3, c.y + p * 8, c.z - p * 1.5), Q, SC.set(s, s, s))); } }); smoke.instanceMatrix.needsUpdate = true; }

// ---------- trucks: along the largest flows, in the right lane ----------
const pathLen = P => { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return L; };
const TRUCKS = [];
[...FLOWS].filter(F => F.path && F.B).sort((a, b) => b.w - a.w).slice(0, 20).forEach(F => TRUCKS.push({ F, P: F.path, L: pathLen(F.path), ph: (hash(F.A.u.name + F.B.u.name) % 1000) / 1000 }));
[...FLOWS].filter(F => F.path && !F.B).sort((a, b) => b.w - a.w).slice(0, 8).forEach(F => TRUCKS.push({ F, P: F.path, L: pathLen(F.path), ph: (hash(F.A.u.name) % 1000) / 1000 }));
const cab = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1.5, 1.6), M('#2F5D9C'), TRUCKS.length), cargo = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 1.8, 1.7), new THREE.MeshStandardMaterial({ roughness: 0.55 }), TRUCKS.length);
const wheel = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10).rotateX(Math.PI / 2), M('#2B2F31'), TRUCKS.length * 4);
cab.castShadow = cargo.castShadow = true; scene.add(cab, cargo, wheel);
TRUCKS.forEach((t, k) => cargo.setColorAt(k, MK[healthCls(t.F.A.u.share)].clone().lerp(new THREE.Color('#ffffff'), 0.3)));
const WOFF = [[-1.2, 0.85], [-1.2, -0.85], [1.25, 0.85], [1.25, -0.85]], O3 = new THREE.Vector3();
function at(t, s) { const L = t.L, Lt = L.at(-1); s = clamp(s, 0, Lt - 0.01); let i = 1; while (i < L.length - 1 && L[i] < s) i++; const f = (s - L[i - 1]) / (L[i] - L[i - 1] || 1), a = t.P[i - 1], b = t.P[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, b[0] - a[0], b[1] - a[1]]; }
function moveTrucks(T) {
  TRUCKS.forEach((t, k) => { const Lt = t.L.at(-1), sp = 7, cyc = 2 * Lt + 8, p0 = (T * sp + t.ph * cyc) % cyc, back = p0 > Lt + 4, s = p0 < Lt ? p0 : back ? 2 * Lt + 8 - p0 : Lt;
    let [x, z, dx, dz] = at(t, s); if (back) { dx = -dx; dz = -dz; } const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const ox = -dz * 1.15, oz = dx * 1.15, dim = focus?.Z && t.F.A !== focus.Z && t.F.B !== focus.Z ? 0.001 : 1; Q.setFromAxisAngle(Y, -Math.atan2(dz, dx));
    cargo.setMatrixAt(k, M4.compose(P.set(x + ox - dx * 0.6, 1.5, z + oz - dz * 0.6), Q, SC.set(dim, dim, dim))); cab.setMatrixAt(k, M4.compose(P.set(x + ox + dx * 1.9, 1.2, z + oz + dz * 1.9), Q, SC.set(dim, dim, dim)));
    WOFF.forEach(([a, b], j) => { O3.set(a, 0, b).applyQuaternion(Q); wheel.setMatrixAt(k * 4 + j, M4.compose(P.set(x + ox + O3.x, 0.45, z + oz + O3.z), Q, SC.set(dim, dim, dim))); }); });
  cab.instanceMatrix.needsUpdate = cargo.instanceMatrix.needsUpdate = wheel.instanceMatrix.needsUpdate = true; cab.computeBoundingSphere(); cargo.computeBoundingSphere(); wheel.computeBoundingSphere(); Q.identity(); }

// ---------- labels: domain names when zoomed out, factories when closer ----------
const labelBox = $('labels'), LABELS = [];
const lvChip = d => d.level != null ? `<i class="lv l${Math.min(d.level, 3)}">${LEVEL_NAMES[d.level]}</i>` : '';
ZONES.forEach(Z => { const el = document.createElement('div'); el.className = 'plate dom'; el.innerHTML = `<i class="hd ${healthCls(Z.u.share)}"></i><b>${Z.u.name}</b><span>${Z.subs.length}</span>`;
  el.onclick = () => toggleZone(Z); labelBox.appendChild(el); LABELS.push({ el, kind: 'z', Z, p: new THREE.Vector3(Z.x, 8, Z.z0 - 1) }); });
LIVE.forEach(d => { const el = document.createElement('div'); el.className = 'plate sub'; el.innerHTML = `<b>${d.l2}</b>${lvChip(d)}${d.all.hot ? `<span class="pr">${d.all.hot}</span>` : ''}`;
  el.onclick = () => focusSub(d); labelBox.appendChild(el); LABELS.push({ el, kind: 's', d, p: new THREE.Vector3(d.cx, d.fh + 2.5, d.cz - 1.5 + d.fd / 2) }); });
ZONES.forEach(Z => { const el = document.createElement('div'); el.className = 'plate off';
  el.innerHTML = `<small>Office ${Z.u.name}</small>${Z.staff.map(p => `<span class="${p.n ? '' : 'vac'}"><i class="r-${p.role}"></i>${p.n || 'not assigned'}<em>${ROLE_EN[p.role]}</em></span>`).join('')}`;
  labelBox.appendChild(el); LABELS.push({ el, kind: 'o', Z, p: new THREE.Vector3(Z.off.cx, 5.2, Z.off.cz) }); });
const cityEl = document.createElement('div'); cityEl.className = 'plate city'; cityEl.innerHTML = '<b>City · Leadership</b>'; labelBox.appendChild(cityEl); LABELS.push({ el: cityEl, kind: 'c', p: new THREE.Vector3(0, 30, 0) });
const V = new THREE.Vector3();
function placeLabels() {
  const dist = camera.position.distanceTo(controls.target), far = dist > WORLD_R * 0.9, placed = [];
  for (const L of ORDER) { V.copy(L.p).project(camera); let show = V.z < 1 && Math.abs(V.x) < 1.1 && Math.abs(V.y) < 1.1;
    if (L.kind === 's') show = show && (focus?.d === L.d || (!far && (focus?.Z ? L.d.wz === focus.Z : L.p.distanceTo(controls.target) < dist * 0.8)));
    if (L.kind === 'z') show = show && !(focus?.Z === L.Z && dist < 200) && !focus?.d;
    if (L.kind === 'o') show = show && focus?.Z === L.Z;
    if (show) { if (!L.w) { L.el.style.display = ''; L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
      const x = (V.x * 0.5 + 0.5) * innerWidth, y = (-V.y * 0.5 + 0.5) * innerHeight, r = [x - L.w / 2, y - L.h, x + L.w / 2, y];
      if (L !== focusLabel() && placed.some(p => r[0] < p[2] + 6 && r[2] + 6 > p[0] && r[1] < p[3] + 4 && r[3] + 4 > p[1])) show = false;
      else { placed.push(r); L.el.style.transform = `translate(${r[0]}px, ${r[1]}px)`; } }
    L.el.style.display = show ? '' : 'none'; }
}
const focusLabel = () => focus?.d ? LABELS.find(L => L.d === focus.d) : null;
const prio = L => L.kind === 'c' ? -1e13 : L.kind === 'o' ? -1e12 : L.kind === 'z' ? -1e9 - L.Z.u.all.n : -(L.d.all.n || 0);
const ORDER = [...LABELS].sort((a, b) => prio(a) - prio(b));

// ---------- camera and selection: the selected domain's routes are highlighted ----------
let fly = null, focus = null, hiMeshes = [];
function flyTo(x, z, dist, polar = 0.9, az = null) { const t1 = new THREE.Vector3(x, 0, z), cur = camera.position.clone().sub(controls.target), a = az ?? Math.atan2(cur.x, cur.z);
  const p1 = new THREE.Vector3(x + Math.sin(a) * Math.sin(polar) * dist, Math.cos(polar) * dist, z + Math.cos(a) * Math.sin(polar) * dist);
  fly = { t: 0, t0: controls.target.clone(), t1, p0: camera.position.clone(), p1 }; }
// selected domain: the ground under its zone is tinted with the accent; the most connected domains are outlined:
// suppliers of its data in the supplier color, consumers of its data in the consumer color; routes use the same colors
const REL = { me: css('--rel-self', '#0A7684'), sup: css('--rel-sup', '#4F79A6'), con: css('--rel-con', '#B04E8C') };
const relMat = {}; Object.entries(REL).forEach(([k, c]) => { relMat[k] = roadMat(c, -4); relMat[k + 'F'] = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: k === 'me' ? 0.22 : 0.12, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }); });
function rectLoop(Z, pad, r = 4) { const x0 = Z.x0 - pad, z0 = Z.z0 - pad, x1 = Z.x0 + Z.w + pad, z1 = Z.z0 + Z.d + pad, P = [];
  [[x1 - r, z0 + r, -Math.PI / 2], [x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI]].forEach(([cx, cz, a0]) => { for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2; P.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } });
  P.push(P[0]); return P; }
function groundFill(Z, pad, mat) { const sh = new THREE.Shape(); rectLoop(Z, pad).forEach(([x, z], i) => i ? sh.lineTo(x, -z) : sh.moveTo(x, -z));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.16; scene.add(m); return m; }
// connected domains: a flow under 10% of the largest in its direction is hidden; a reverse direction
// under a quarter of the main one is minor, and the domain is marked by its main direction only
function relOf(Z) { const sup = new Map(), con = new Map();
  DFLOW.forEach(f => { if (f.b === Z.u.name && ZBY.get(f.a)) sup.set(f.a, (sup.get(f.a) || 0) + f.w); if (f.a === Z.u.name && ZBY.get(f.b)) con.set(f.b, (con.get(f.b) || 0) + f.w); });
  const top = m => { const L = [...m].sort((a, b) => b[1] - a[1]), mx = L[0]?.[1] || 0; return new Map(L.filter(x => x[1] >= mx * 0.1).slice(0, 6)); }, S = top(sup), C = top(con), res = new Map();
  new Set([...S.keys(), ...C.keys()]).forEach(n => { const sw = S.get(n) || 0, cw = C.get(n) || 0, both = sw && cw && Math.min(sw, cw) >= Math.max(sw, cw) * 0.25;
    res.set(n, { k: both ? 'both' : sw >= cw ? 'sup' : 'con', w: Math.max(sw, cw), sw, cw }); });
  return res; }
function paintRoutes() { hiMeshes.forEach(m => { scene.remove(m); m.geometry.dispose(); }); hiMeshes = [];
  LABELS.forEach(L => { if (L.kind === 'z') { L.el.classList.remove('rel-me', 'rel-sup', 'rel-con', 'rel-both'); L.w = 0; } });
  const Z = focus?.Z; if (!Z) return;
  hiMeshes.push(groundFill(Z, 5, relMat.meF), ribbon(rectLoop(Z, 5), 1.2, 0.18, relMat.me));
  LABELS.find(L => L.Z === Z)?.el.classList.add('rel-me');
  const R = relOf(Z), mxw = Math.max(...[...R.values()].map(r => r.w), 1);
  R.forEach((r, name) => { const Y = ZBY.get(name), k = r.k === 'both' ? (r.sw >= r.cw ? 'sup' : 'con') : r.k, wd = 0.6 + 1.4 * Math.sqrt(r.w / mxw);
    hiMeshes.push(groundFill(Y, 4, relMat[k + 'F']), ribbon(rectLoop(Y, 4), wd, 0.18, relMat[k]));
    LABELS.find(L => L.Z === Y)?.el.classList.add('rel-' + r.k); });
  FLOWS.filter(F => F.path && F.B && (F.A === Z || F.B === Z)).sort((a, b) => b.w - a.w).slice(0, 12).forEach(F => hiMeshes.push(ribbon(F.path, 0.9, 0.13, F.A === Z ? relMat.con : relMat.sup))); }
function home() { focus = null; flyTo(0, 0, WORLD_R * 1.95, 0.8, 0.6); card(null); crumbs(); paintRoutes(); }
// a second click on the selected domain clears the selection
const toggleZone = Z => focus?.Z === Z && !focus.d ? home() : focusZone(Z);
// the camera frames the selected domain and its most connected neighbours
function focusZone(Z) { focus = { Z }; const all = [Z, ...[...relOf(Z).keys()].map(n => ZBY.get(n))];
  const x0 = Math.min(...all.map(z => z.x0)), x1 = Math.max(...all.map(z => z.x0 + z.w)), z0 = Math.min(...all.map(z => z.z0)), z1 = Math.max(...all.map(z => z.z0 + z.d));
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ext = Math.max(x1 - x0, z1 - z0, Z.r * 2.5);
  flyTo(cx * 0.75 + Z.x * 0.25, cz * 0.75 + Z.z * 0.25, Math.max(170, ext * 1.15), 0.8); card(zoneCard(Z)); crumbs(); paintRoutes(); }
function focusSub(d) { focus = { Z: d.wz, d }; flyTo(d.cx, d.cz, Math.max(85, d.lw * 4.2), 0.9, 0.35); card(subCard(d)); crumbs(); paintRoutes(); }
function crumbs() { const f = focus || {}; $('crumbs').hidden = !f.Z;
  $('crumbs').innerHTML = `<a data-c="w">Insight Factories world</a>${f.Z ? `<i>›</i><a data-c="z">${f.Z.u.name}</a>` : ''}${f.d ? `<i>›</i><b>${f.d.l2}</b>` : ''}`;
  const on = (k, fn) => { const a = $('crumbs').querySelector(`[data-c="${k}"]`); if (a) a.onclick = fn; };
  on('w', home); on('z', () => focusZone(f.Z)); }
// entering a factory: no fly-over, a short fade and navigation
function enterSub(d) { $('fade').style.transition = 'opacity .18s'; $('fade').style.opacity = 1; setTimeout(() => { location.href = `domain.html?d=${d.i}&from=world`; }, 180); }

// ---------- cards ----------
function card(html) { $('card').hidden = !html; if (html) $('card').innerHTML = `<button class="x" aria-label="Close">×</button>${html}`; const x = $('card').querySelector('.x'); if (x) x.onclick = home;
  $('card').querySelectorAll('[data-s]').forEach(a => a.onclick = () => focusSub(SUBS[+a.dataset.s]));
  $('card').querySelectorAll('[data-zn]').forEach(a => a.onclick = () => { const Z = ZBY.get(a.dataset.zn); if (Z) focusZone(Z); });
  $('card').querySelectorAll('[data-enter]').forEach(a => a.onclick = () => enterSub(SUBS[+a.dataset.enter])); }
// exchange bars: length is views relative to the largest flow in the list, color matches the outline on the map
const flowRows = (list, side) => { const mx = Math.max(...list.map(f => f.w), 1), col = side === 'b' ? 'var(--rel-con)' : 'var(--rel-sup)';
  return list.slice(0, 6).map(f => `<a class="fb" data-zn="${f[side]}"><span>${f[side]}</span><i><b style="width:${Math.max(2, f.w / mx * 100)}%;background:${col}"></b></i><em>${fmtK(f.w)}</em></a>`).join('') + (list.length > 6 ? `<span class="none">${list.length - 6} more</span>` : '') || '<span class="none">none</span>'; };
function zoneCard(Z) { const u = Z.u, out = DFLOW.filter(f => f.a === u.name), inn = DFLOW.filter(f => f.b === u.name);
  return `<div class="k">Domain industrial zone${Z.st ? ` · data owner ${Z.st.n}` : ''}</div><h2>${u.name}</h2>
    <div class="kv"><span>Object health</span><b><i class="hd ${healthCls(u.share)}"></i>${u.share == null ? '—' : pct(u.all.good, u.all.n) + '%'}</b><span>Objects · issues</span><b>${fmt(u.all.n)} · ${fmt(u.all.hot)}</b></div>
    <div class="sec"><i class="rd con"></i>Read its data · ${out.length}</div><div class="fbars">${flowRows(out, 'b')}</div><div class="sec"><i class="rd sup"></i>It reads data from · ${inn.length}</div><div class="fbars">${flowRows(inn, 'a')}</div>
    <small class="n">Up to 6 most connected domains are outlined in each direction; the number is dashboard views on another domain's data marts in 30 days</small>
    <div class="sec">Factories · ${Z.subs.length}</div><div class="rows">${Z.subs.map(d => `<a data-s="${d.i}"><span><i class="hd ${healthCls(d.share)}"></i>${d.l2} ${lvChip(d)}</span><em>${d.all.hot ? nw(d.all.hot, d.all.hot + ' issue', d.all.hot + ' issues') : ''}</em></a>`).join('')}</div>
    <div class="btns"><a class="btn" href="index.html#/d/${encodeURIComponent(u.name)}">Domain workspace ↗</a></div>
    ${econHtml('In the world: a rating on the domain building, contracts on the roads, cargo color and defects at the consumer gate, CPU bills as a separate layer.')}`; }
// short summary of factory analytics: AI-Ready score with an 8-week trend, health by object type, what pulls the score down
const DATES = TREND_DATES.map(t => new Date(t + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
function spark(arr, w = 300, h = 54) { const v = arr.map(x => x ?? null), ok = v.filter(x => x != null); if (ok.length < 2) return '';
  const lo = Math.min(...ok), hi = Math.max(...ok), pad = Math.max(2, (hi - lo) * 0.25), y0 = lo - pad, y1 = hi + pad, X = i => 4 + i / (v.length - 1) * (w - 8), Yv = x => h - 14 - (x - y0) / (y1 - y0 || 1) * (h - 22);
  const pts = v.map((x, i) => x == null ? null : [X(i), Yv(x)]).filter(Boolean), line = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' '), last = pts.at(-1);
  return `<svg class="spk" viewBox="0 0 ${w} ${h}" width="100%" height="${h}"><line x1="4" x2="${w - 4}" y1="${h - 14}" y2="${h - 14}" style="stroke:var(--line)"/>
    <polygon points="${pts[0][0]},${h - 14} ${line} ${last[0]},${h - 14}" style="fill:var(--accent)" opacity=".08"/><polyline points="${line}" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3.5" style="fill:var(--accent)"/><text x="4" y="${h - 2}" font-size="10" style="fill:var(--ink3)">${DATES[0]}</text><text x="${w - 4}" y="${h - 2}" font-size="10" style="fill:var(--ink3)" text-anchor="end">${DATES.at(-1)}</text></svg>`; }
const dpp = (a, k = 4) => { const n = a?.length || 0, x = a?.[n - 1 - k], y = a?.[n - 1]; return x == null || y == null ? null : (y - x) * 100; };
const dTxt = (v, u = ' pp') => v == null ? '<em class="dz">—</em>' : `<em class="${v > 0.05 ? 'up' : v < -0.05 ? 'down' : 'dz'}">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}${u}</em>`;
function subCard(d) { const A = d.ards, it = d.idxTrend, n = TREND_DATES.length, di = it ? it[n - 1] - it[0] : null, sh = a => a?.at(-1) == null ? '—' : Math.round(a.at(-1) * 100) + '%';
  const weak = A ? A.comp.filter(c => c.axis === 'R' && c.score != null).sort((a, b) => a.score - b.score).slice(0, 2) : [];
  const peers = d.wz.subs.filter(x => x.ards?.idx != null).sort((a, b) => b.ards.idx - a.ards.idx), place = peers.indexOf(d) + 1;
  return `<div class="k">Subdomain factory · ${d.l1}</div><h2>${d.l2}</h2>
    <div class="ix"><div><b>${A?.idx ?? '—'}</b><span>AI-Ready score · ${LEVEL_NAMES[d.level ?? 0]}</span></div><div>${dTxt(di, '')}<span>over 8 weeks</span></div>${place ? `<div><b class="s">${place}<small> of ${peers.length}</small></b><span>rank in domain</span></div>` : ''}</div>
    ${it ? `<div title="Trend is an estimate: trusted data marts, dashboards and semantics are recalculated from each week's share of healthy objects, other components as of now">${spark(it, 300, 40)}</div>` : ''}
    <div class="mt">${(() => { const by = d.by, keym = d.t.met.filter(o => o.key), fr = d.freshN - d.fresh[3], R5 = A?.comp.find(c => c.key === 'R5'), O1 = A?.comp.find(c => c.key === 'O1'), qi = qAll(SUBX.inn[d.i] || []), qo = qAll(SUBX.out[d.i] || []);
      const p = (a, b) => b ? Math.round(a / b * 100) + '%' : '—', t = (l, v, sub, dl = '', tip = '') => `<div title="${tip}"><span>${l}</span><b>${v}${dl}</b><small>${sub}</small></div>`;
      return [t('All objects', p(d.all.good, d.all.n), `healthy · ${fmt(d.all.good)}/${fmt(d.all.n)}`, dTxt(dpp(d.trend.all)), 'share of objects that pass the health score; change over 4 weeks'),
        t('Data marts', p(by.dm.good, by.dm.n), `healthy · ${by.dm.good}/${by.dm.n}`, dTxt(dpp(d.trend.dm)), 'healthy data marts; change over 4 weeks'),
        t('Metrics', p(by.met.good, by.met.n), `healthy · ${by.met.good}/${by.met.n}`, dTxt(dpp(d.trend.met)), 'healthy Semantic Layer metrics; change over 4 weeks'),
        t('Dashboards', p(by.dash.good, by.dash.n), `healthy · ${by.dash.good}/${by.dash.n}`, dTxt(dpp(d.trend.dash)), 'healthy dashboards; change over 4 weeks'),
        t('Issues', d.all.hot, 'popular and unhealthy', '', 'object more popular than 75% of its type that fails the health score'),
        t('DQ incidents', d.incOpen.length, 'open', '', 'Data Contracts incidents'),
        t('Marts on time', fr ? p(d.fresh[0], fr) : '—', `${d.fresh[1] + d.fresh[2]} late`, '', 'freshness against schedule'),
        t('Monitoring', `${d.mon.on}/${d.mon.n}`, 'data marts with business checks', '', 'Data Contracts checks'),
        t('Key metrics', keym.length ? `${keym.filter(o => o.s >= 2).length}/${keym.length}` : '—', 'healthy', '', 'metrics with the key badge in the Semantic Layer'),
        t('Domain knowledge', 'TBD', 'logic to be defined', '', '1.4 Domain knowledge: logic to be defined'),
        t('Evals', O1?.fact != null ? Math.round(O1.fact * 100) + '%' : '—', 'golden set · generated', '', '2.1: answer accuracy on the golden set, generated'),
        t('CPU · disk', d.cpu ? fmtK(d.cpu) + ' h' : '—', d.tb ? (d.tb >= 1 ? d.tb.toFixed(1) + ' TB' : Math.round(d.tb * 1000) + ' GB') + ' · 30 days' : '30 days', '', 'platform billing'),
        t('Exchange: in', qi == null ? '—' : Math.round(qi * 100) + '%', 'quality of consumed data', '', 'share of usage on suppliers\' healthy data marts'),
        t('Exchange: out', qo == null ? '—' : Math.round(qo * 100) + '%', 'quality of supplied data', '', 'share of consumers\' usage on our healthy data marts')].join(''); })()}</div>
    ${weak.length ? `<small class="n">Pulling the score down: ${weak.map(c => `${c.name.toLowerCase()}, ${Math.round(c.score)}% of target`).join('; ')}</small>` : ''}
    <div class="btns"><button class="btn pri" data-enter="${d.i}">Enter factory</button><div class="b2"><a class="btn" href="index.html#/s/${d.i}">Workspace ↗</a><a class="btn" href="graph.html?d=${d.i}">Links ↗</a></div></div>`; }

// ---------- domain leaderboard: collapsed to a button; AI-Ready ranking and monthly progress, a row expands into components ----------
const TROPHY = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5h6v3.2a3 3 0 0 1-6 0z"/><path d="M5 3.5H3v1a2 2 0 0 0 2 2M11 3.5h2v1a2 2 0 0 1-2 2M8 8.7v2.3M5.5 13.5h5l-.6-2.5H6.1z"/></svg>';
const NOM_SHORT = { prod: 'most productive', lift: 'leap of the month', sup: 'top supplier', clean: 'cleanest workshop', ai: 'closest to AI-Ready' };
const nomsOf = u => NOMS.filter(n => n.win === u);
let lbMode = 'ai', lbOpen = null;
const pp = v => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + ' pp';
const ppCls = v => v == null ? '' : v > 0.05 ? 'up' : v < -0.05 ? 'down' : '';
const ST_LABEL = { ok: '', proxy: 'proxy', partial: 'partial', wip: 'in progress', none: 'no data', mock: 'generated' };
function lbDetail(u) {
  const comp = ax => u.comp.filter(c => c.axis === ax).map(c => `<div class="cp"><span>${c.code} ${c.name}${ST_LABEL[c.status] ? `<em>${ST_LABEL[c.status]}</em>` : ''}</span><i><b style="width:${c.score == null ? 0 : clamp(c.score, 0, 100)}%"></b></i><strong>${c.score == null ? '—' : Math.round(c.score)}</strong></div>`).join('');
  const by = [['dm', 'Data marts'], ['met', 'Metrics'], ['dash', 'Dashboards']].map(([k, n]) => `<div class="cp"><span>${n}</span><strong class="${ppCls(u.liftBy[k])}">${pp(u.liftBy[k])}</strong></div>`).join('');
  const best = [...u.comp].filter(c => c.score != null).sort((a, b) => b.score - a.score), why = best.slice(0, 2).map(c => c.name.toLowerCase()).join(' and ');
  return `<div class="lbd"><p>${best.length ? `Strongest: ${why}. Weakest: ${best.at(-1).name.toLowerCase()}.` : 'Components are not calculated yet.'}</p>
    <div class="lbg"><div><small>Axis 1 · Readiness</small>${comp('R')}</div><div><small>Axis 2 · Result</small>${comp('O')}</div></div>
    <small>Share of healthy objects over 4 weeks</small>${by}
    <a class="btn" data-zn="${u.name}">Show on the map</a></div>`; }
function renderBoard() {
  const val = u => lbMode === 'ai' ? u.aiIdx : u.lift, list = [...LEADERS].filter(u => val(u) != null).sort((a, b) => val(b) - val(a)), mx = Math.max(...list.map(u => Math.abs(val(u))), 1);
  $('board').innerHTML = `<div class="bh"><b>${TROPHY}Domain leaderboard</b><button class="x" id="lbx" aria-label="Collapse">×</button></div>
    <div class="modes"><a data-m="ai" class="${lbMode === 'ai' ? 'on' : ''}">AI-Ready now</a><a data-m="lift" class="${lbMode === 'lift' ? 'on' : ''}">Progress this month</a></div>
    <small class="lbn">${lbMode === 'ai' ? 'AI-Ready score 0–100 for each domain. A row expands into components.' : 'Change in the share of healthy objects over 4 weeks. A row expands into data marts, metrics and dashboards.'}</small>
    <div class="lbr">${list.map((u, k) => { const v = val(u), noms = nomsOf(u);
      return `<div class="lbi${lbOpen === u.name ? ' open' : ''}"><a data-lb="${u.name}"><i>${k + 1}</i><span>${u.name}${noms.length ? `<em title="${noms.map(n => n.title).join(', ')}">${TROPHY}${noms.map(n => NOM_SHORT[n.key]).join(', ')}</em>` : ''}</span>
        <strong class="${lbMode === 'lift' ? ppCls(v) : ''}">${lbMode === 'ai' ? Math.round(v) : pp(v)}</strong><u class="${lbMode === 'lift' && v < 0 ? 'neg' : ''}" style="width:${Math.max(2, Math.abs(v) / mx * 100)}%"></u></a>${lbOpen === u.name ? lbDetail(u) : ''}</div>`; }).join('')}</div>
    <small class="lbn">Nominations, ${NOM_MONTH}: ${NOMS.map(n => `"${n.title}": ${n.win.name}`).join('; ')}.</small>`;
  $('board').querySelectorAll('[data-m]').forEach(a => a.onclick = () => { lbMode = a.dataset.m; renderBoard(); });
  $('board').querySelectorAll('[data-lb]').forEach(a => a.onclick = () => { lbOpen = lbOpen === a.dataset.lb ? null : a.dataset.lb; renderBoard(); });
  $('board').querySelectorAll('[data-zn]').forEach(a => a.onclick = () => { const Z = ZBY.get(a.dataset.zn); if (Z) focusZone(Z); });
  $('lbx').onclick = () => toggleBoard(false); }
function toggleBoard(on) { $('board').hidden = !on; $('lbBtn').hidden = on; document.body.classList.toggle('lb', on); if (on) renderBoard(); }
$('lbBtn').innerHTML = `${TROPHY}<span>Leaderboard</span>`; $('lbBtn').onclick = () => toggleBoard(true); toggleBoard(QS.get('lb') === '1');

// ---------- input ----------
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down = null, hovered = null;
function pick(e) { mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(mouse, camera); return ray.intersectObjects(hitList, false)[0]?.object.userData || null; }
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; fly = null; });
canvas.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const u = pick(e);
  if (u?.d) { if (focus?.d === u.d) enterSub(u.d); else focusSub(u.d); } else if (u?.zone) toggleZone(u.zone); else if (focus) home(); });
canvas.addEventListener('dblclick', e => { const u = pick(e); if (u?.d) enterSub(u.d); });
const chainTip = C => { const top = [...C.flows].sort((a, b) => b.w - a.w).slice(0, 4).map(F => `${F.A.u.name} → ${F.B ? F.B.u.name : 'city'}: ${fmtK(F.B ? F.w : F.w * 2)}`).join('<br>');
  return `<b>Road · ${C.flows.length} ${nw(C.flows.length, 'flow', 'flows')}</b><small>${top}${C.flows.length > 4 ? '<br>…' : ''}<br>dashboard views in 30 days</small>`; };
canvas.addEventListener('pointermove', e => { if (e.buttons) { $('tip').hidden = true; return; } const u = pick(e); canvas.style.cursor = u?.d || u?.zone ? "pointer" : '';
  const d = u?.d; if (d !== hovered) { hovered?.hall.material.emissive?.setHex(0); d?.hall.material.emissive?.setHex(0x222222); hovered = d; }
  if (!u) { $('tip').hidden = true; return; } const t = $('tip');
  t.innerHTML = d ? `<b>${d.l2}</b><small>${d.l1} · health ${pct(d.all.good, d.all.n)}% · ${d.all.hot} ${nw(d.all.hot, 'issue', 'issues')} · ${LEVEL_NAMES[d.level ?? 0]}${focus?.d === d ? ' · click to enter the factory' : ''}</small>`
    : u.zone ? `<b>${u.zone.u.name}</b><small>${u.zone.subs.length} ${nw(u.zone.subs.length, 'factory', 'factories')}${u.zone.st ? ' · ' + u.zone.st.n : ''}</small>` : chainTip(u.chain);
  t.hidden = false; t.style.left = Math.min(e.clientX + 14, innerWidth - 320) + 'px'; t.style.top = (e.clientY + 14) + 'px'; });
addEventListener('keydown', e => { if (e.key === 'Escape') { if (focus?.d) focusZone(focus.Z); else home(); } if (e.key === 'Enter' && focus?.d) enterSub(focus.d); });

// ---------- loop ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
camera.position.set(WORLD_R * 1.2, WORLD_R * 1.6, WORLD_R * 1.5); controls.target.set(0, 0, 0); controls.update();
const s0 = QS.has('s') ? SUBS[+QS.get('s')] : null, u0 = QS.get('u');
if (s0?.wz) focusSub(s0); else if (u0 && ZBY.get(u0)) focusZone(ZBY.get(u0)); else home();
addEventListener('pageshow', e => { if (e.persisted) $('fade').style.opacity = 0; });
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.05), T = clock.elapsedTime;
  if (fly) { fly.t = Math.min(1, fly.t + dt / 1.1); const e = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - (-2 * fly.t + 2) ** 3 / 2; controls.target.lerpVectors(fly.t0, fly.t1, e); camera.position.lerpVectors(fly.p0, fly.p1, e); if (fly.t >= 1) fly = null; }
  controls.update(); moveSmoke(T); moveTrucks(T); moveMarkers(T); renderer.render(scene, camera); placeLabels(); });
refFooter(['E8', 'E9', 'B2', 'E6'], document.getElementById('legend'), { inline: true });
window.__world = { camera, controls, ZONES, GROUPS, LIVE, CHAINS, FLOWS, PAIRS, NODES, focusSub, focusZone, enterSub, home };
