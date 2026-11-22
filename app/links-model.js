// Shared model of the Links window: subdomain nodes and edges, problem analysis, infrastructure savings, certification, shared helpers.
// Imported by the Graph view (net.js) and by the shell with the Cost × value and Flow views (graph.js) — finding objects are shared.
import { SUBS, OBJ_BY_K, ok, fmt, fmtK, KIND1, UNIT, isHot, checks, TOOL, PRODUCTS, fixLink, monOf, savings, useOf, MED_CPV, COST_PERIOD } from './model.js?v=100';
import { G_DD, G_DM, G_SRC, G_MS } from './data/graph.js?v=100';
import { SKIN as S } from './skin.js?v=100';

const QS = new URLSearchParams(location.search), D = SUBS[+QS.get('d')] || SUBS[44];
const $ = id => document.getElementById(id);
// colors come from the theme tokens (theme.css); the fallbacks are the light theme values
const tok = (n, f) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f; } catch { return f; } };
const COL = {};
const readCol = () => Object.assign(COL, { ok: tok('--ok', '#2E8A57'), warn: tok('--warn', '#C88A12'), bad: tok('--bad', '#C4453A'), ext: tok('--line-strong', '#C3CDD2'), src: tok('--s3', '#8C5BA8'),
  bg: tok('--bg2', '#F4F7F8'), idle: tok('--ok-line', '#B8DDC6'), nocost: tok('--line', '#DCE3E6'), badInk: tok('--bad-ink', '#9C3027'), brown: tok('--s7', '#8B8737'), blue: tok('--s6', '#4F79A6'),
  grey: tok('--grey', '#A7B3B9'), ink3: tok('--ink3', '#7F909A'), srcSoft: tok('--wip-line', '#CDC3EC') });
readCol();
const statusCol = o => o.s >= 2 ? COL.ok : o.s === 1 ? COL.warn : COL.bad;
const LAYER = { dds: -230, dm: -150, src: -10, met: 60, dash: 290 };   // flow from left to right: DDS → data marts → semantics → dashboards; dashboards form a separate cloud on the right
const lay = n => n.t === 'dm' && /^dds\./i.test(n.o.name) ? 'dds' : n.t;
const nm = n => n.o ? n.o.name : `source ${n.name}`;
const ch = n => n >= 10 ? fmtK(n) : String(Math.round(n * 10) / 10);   // CPU hours

// ---------- nodes and edges ----------
const nodes = [], byKey = new Map(), edges = [];
const node = (key, data) => { if (byKey.has(key)) return byKey.get(key); const n = { key, i: nodes.length, ...data, out: [], inn: [] }; nodes.push(n); byKey.set(key, n); return n; };
const objNode = (o, ext) => node('o' + o.k, { o, t: o.t, ext, sub: SUBS[o.sub] });
const ownObjs = [...D.t.dm, ...D.t.met, ...D.t.dash], own = new Set(ownObjs.map(o => o.k));
ownObjs.forEach(o => objNode(o, false));
const link = (a, b, kind) => { if (a === b) return; const e = { a, b, kind }; edges.push(e); a.out.push(e); b.inn.push(e); };
const extDeg = new Map(), pend = [];
for (let i = 0; i < G_DD.length; i += 2) { const a = G_DD[i], b = G_DD[i + 1], ia = own.has(a), ib = own.has(b); if (!ia && !ib) continue; pend.push([a, b, 'dd']);
  if (!ia) extDeg.set(a, (extDeg.get(a) || 0) + (OBJ_BY_K[a].s >= 2 ? 1 : 3)); if (!ib) extDeg.set(b, (extDeg.get(b) || 0) + 1); }
for (let i = 0; i < G_DM.length; i += 3) { if (G_DM[i + 2] > 1) continue; const a = G_DM[i], b = G_DM[i + 1], ia = own.has(a), ib = own.has(b); if (!ia && !ib) continue; pend.push([a, b, 'dm']);
  if (!ia) extDeg.set(a, (extDeg.get(a) || 0) + (OBJ_BY_K[a].s >= 2 ? 2 : 4)); if (!ib) extDeg.set(b, (extDeg.get(b) || 0) + 2); }
// neighbors from other subdomains: the most connected first, unhealthy sources take priority
const EXT_MAX = 150, extKeep = new Set([...extDeg].sort((x, y) => y[1] - x[1]).slice(0, EXT_MAX).map(x => x[0]));
for (const [a, b, kind] of pend) if ((own.has(a) || extKeep.has(a)) && (own.has(b) || extKeep.has(b))) link(objNode(OBJ_BY_K[a], !own.has(a)), objNode(OBJ_BY_K[b], !own.has(b)), kind);
for (let i = 0; i < G_MS.length; i += 2) { if (!own.has(G_MS[i])) continue; link(byKey.get('o' + G_MS[i]), node('s' + G_MS[i + 1], { t: 'src', name: G_SRC[G_MS[i + 1]] }), 'ms'); }
// Semantic Layer source → data mart: source tables live in Semantic Layer configs, not in the warehouse, so the link is by name match
// (source buyer_stream → data mart mart.buyer_stream or mart.buyer_stream_v2); this finds roughly one source in six
const DM_BY_TAIL = new Map(); OBJ_BY_K.forEach(o => { if (o.t !== 'dm') return; const t = String(o.name).toLowerCase().split('.').pop().replace(/_v2$/, ''); (DM_BY_TAIL.get(t) || DM_BY_TAIL.set(t, []).get(t)).push(o); });
for (const n of [...nodes]) if (n.t === 'src') for (const o of DM_BY_TAIL.get(String(n.name).toLowerCase()) || []) link(objNode(o, !own.has(o.k)), n, 'ds');
const hiddenExt = extDeg.size - extKeep.size;
const deg = n => n.out.length + n.inn.length, nbrs = n => [...n.inn.map(e => e.a), ...n.out.map(e => e.b)];
const nodeOf = o => byKey.get('o' + o.k);
const cpuOf = n => n.o?.cost?.[0] ?? (n.t === 'src' ? n.inn.reduce((s, e) => s + (e.a.o.cost?.[0] || 0), 0) : 0);

// ---------- problem analysis (the Problems lens) ----------
const bad = n => n.o && !ok(n.o.s);
const fails = o => checks(o).filter(c => c[2] === false).map(c => c[0]);
// English plural: plural(n, one, other) — the third argument is optional and wins over the second when given
const plural = (n, a, b, c) => n === 1 ? a : (c ?? b);
const otch = n => `${fmt(n)} ${n === 1 ? 'dashboard' : 'dashboards'}`;
// dashboards a broken data mart reaches (up to three steps along data mart → data mart → dashboard)
function reach(n) { const seen = new Set([n]), q = [[n, 0]], dash = new Set();
  while (q.length) { const [x, d] = q.shift(); if (d >= 3) continue; for (const e of x.out) { if (e.kind === 'ms' || seen.has(e.b)) continue; seen.add(e.b); if (e.b.t === 'dash') dash.add(e.b); else q.push([e.b, d + 1]); } }
  return { all: seen, dash }; }
const views = set => [...set].reduce((s, n) => s + (n.o?.pop || 0), 0);
const DQ = [];
// 1. root causes: unhealthy data marts with no unhealthy data marts upstream and with dashboards downstream; neighbors' data marts separately
const roots = nodes.filter(n => n.t === 'dm' && bad(n) && !n.inn.some(e => e.kind === 'dm' && bad(e.a))).map(n => ({ n, r: reach(n) })).filter(x => x.r.dash.size);
// roots that share affected dashboards form one zone
const parent = roots.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
const byDash = new Map(); roots.forEach((x, i) => x.r.dash.forEach(d => { if (byDash.has(d)) parent[find(i)] = find(byDash.get(d)); else byDash.set(d, i); }));
const ufGroups = new Map(); roots.forEach((x, i) => { const g = find(i); (ufGroups.get(g) || ufGroups.set(g, []).get(g)).push(x); });
for (const g of ufGroups.values()) {
  g.sort((a, b) => views(b.r.dash) - views(a.r.dash)); const rootN = g.map(x => x.n), dash = new Set(g.flatMap(x => [...x.r.dash])), all = new Set(g.flatMap(x => [...x.r.all]));
  const ext = rootN.every(n => n.ext), top = rootN[0], f = fails(top.o), fx = f.length ? fixLink(top.o, f[0]) : null, ownDash = [...dash].filter(n => !n.ext).length;
  DQ.push({ kind: ext ? 'ext' : 'root', sev: views(dash) + ownDash * 50, nodes: all, roots: rootN, dash,
    title: ext ? `${top.o.name} · ${top.sub.l2}` : rootN.length > 1 ? `${rootN.length} unhealthy data marts feed shared dashboards` : top.o.name,
    what: `${otch(dash.size)} downstream${ownDash !== dash.size ? `, ${ownDash} of them own` : ''}, ${fmt(views(dash))} views.${f.length ? ` Failed: ${f.join(', ').toLowerCase()}.` : ' Visible checks pass — other health score components fall short.'}`,
    act: ext ? `Message the BI partner of ${top.sub.l2}: your dashboards depend on their data mart. While it is being fixed, mark the dashboards as outdated in Dashboards.`
      : `Fix ${top.o.name} first: it is the top of the breakage${rootN.length > 1 ? `, then ${rootN.slice(1, 3).map(n => n.o.name).join(', ')}` : ''}. After the health score recompute the dashboards downstream recover.`,
    go: ext ? null : fx || TOOL[top.o.t](top.o)[0] }); }
// 2. dashboards broken on their own: an unhealthy dashboard whose source data marts are all healthy
const selfBad = nodes.filter(n => n.t === 'dash' && !n.ext && bad(n) && n.inn.length && n.inn.every(e => !bad(e.a))).sort((a, b) => b.o.pop - a.o.pop);
if (selfBad.length) { const f = fails(selfBad[0].o);
  DQ.push({ kind: 'self', sev: views(selfBad) * 0.6, nodes: new Set(selfBad.flatMap(n => [n, ...n.inn.map(e => e.a)])), roots: selfBad.slice(0, 6), dash: new Set(selfBad),
    title: `${otch(selfBad.length)} broken on their own`,
    what: `The sources are healthy, the problem is in the dashboard itself. The most viewed is ${selfBad[0].o.name} (${fmt(selfBad[0].o.pop)} views)${f.length ? `: ${f.join(', ').toLowerCase()}` : ''}.`,
    act: 'Edit in Dashboards: move widgets to datasets, fill in the description and README, check query speed and errors. The data marts need no changes.',
    go: TOOL.dash(selfBad[0].o)[0] }); }
// 3. single points of failure: a healthy data mart with no business checkers that many dashboards depend on
const spof = nodes.filter(n => n.t === 'dm' && !n.ext && !bad(n) && monOf(n.o) === false).map(n => ({ n, r: reach(n) })).filter(x => x.r.dash.size >= 5).sort((a, b) => views(b.r.dash) - views(a.r.dash)).slice(0, 5);
if (spof.length) DQ.push({ kind: 'spof', sev: views(new Set(spof.flatMap(x => [...x.r.dash]))) * 0.35, nodes: new Set(spof.flatMap(x => [...x.r.all])), roots: spof.map(x => x.n), dash: new Set(spof.flatMap(x => [...x.r.dash])),
  title: 'Single points of failure without business checkers',
  what: `Healthy now, but dashboards rest on them and there are no business checkers: ${spof.slice(0, 3).map(x => `${x.n.o.name} (${otch(x.r.dash.size)})`).join(', ')}.`,
  act: 'Add a custom completeness and anomaly checker in Data Contracts — then a breakage is caught before people notice it in dashboards.', go: { p: 'dc', url: PRODUCTS.dc.url, what: 'add a checker' } });
// 4. unhealthy Semantic Layer sources: more than half of the source's metrics fail the health score
const srcBad = nodes.filter(n => n.t === 'src').map(n => { const m = n.inn.map(e => e.a), b = m.filter(bad); return { n, m, b }; }).filter(x => x.m.length >= 5 && x.b.length / x.m.length >= 0.5).sort((a, b) => b.b.length - a.b.length).slice(0, 4);
if (srcBad.length) DQ.push({ kind: 'sem', sev: srcBad.reduce((s, x) => s + views(x.b), 0) * 2, nodes: new Set(srcBad.flatMap(x => [x.n, ...x.m])), roots: srcBad.map(x => x.n), dash: new Set(),
  title: 'Semantic Layer sources where more than half of the metrics are unhealthy',
  what: srcBad.map(x => `${x.n.name} — ${x.b.length} of ${x.m.length}`).join('; ') + '.',
  act: 'Review the source as a whole: metrics of one source usually share the cause — description, owner or a stale upstream. Edit in the Semantic Layer.', go: { p: 'semantic', url: PRODUCTS.semantic.url, what: 'sources and metrics' } });
DQ.sort((a, b) => b.sev - a.sev);

// ---------- infrastructure savings (the default lens) ----------
const SAV = savings(D), INF = [];
for (const g of SAV.groups) { const its = g.items.map(x => ({ ...x, n: nodeOf(x.o) })).filter(x => x.n); if (!its.length) continue;
  const set = new Set(its.flatMap(x => [x.n, ...nbrs(x.n).filter(m => m.t !== 'src')]));
  INF.push({ ...g, items: its, nodes: set, roots: its.slice(0, 14).map(x => x.n), sev: g.sav ? 1e9 + g.sav : (g.cpu || 0) + (g.gb || 0) * 0.01 }); }   // CPU savings come first
INF.sort((a, b) => b.sev - a.sev);
const ZK = {};
const readZk = () => Object.assign(ZK, { root: ['root cause', COL.bad], ext: ['cause at neighbors', COL.brown], self: ['problem in dashboards', COL.warn], spof: ['risk', COL.blue], sem: ['semantics', COL.src],
  cut: ['turn off', COL.bad], met0: ['turn off', COL.badInk], opt: ['optimize', COL.warn], trust: ['spend without trust', COL.brown], store: ['storage', COL.blue] });
readZk();
// re-read the tokens when the system theme changes; views pick the new colors up on their next render
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readCol(); readZk(); }); } catch { /* no matchMedia */ }
const infKind = new Map(); INF.forEach(z => z.items.forEach(x => { if (!infKind.has(x.n)) infKind.set(x.n, z.kind); }));
const LENS = { infra: INF, dq: DQ, cert: [], all: [] };   // Certification: all links, only certified objects and their sources are bright
// the "Certified and their sources" filter: own certified objects and everything they are built from (upstream links
// to the end of the chain, for metrics — the Semantic Layer source); the rest is faded
const isCert = n => n.o && (n.o.s === 1 || n.o.s === 3);
const certRoots = nodes.filter(n => isCert(n) && !n.ext), CERT = new Set(certRoots);
for (const st = [...certRoots]; st.length;) { const x = st.pop(); for (const y of [...x.inn.filter(e => e.kind !== 'ms').map(e => e.a), ...x.out.filter(e => e.kind === 'ms').map(e => e.b)]) if (!CERT.has(y)) { CERT.add(y); st.push(y); } }
const certUp = [...CERT].filter(n => !certRoots.includes(n)), certBad = certUp.filter(bad).sort((a, b) => b.out.length - a.out.length);
const inLens = { infra: new Set(INF.flatMap(z => [...z.nodes])), dq: new Set(DQ.flatMap(z => [...z.nodes])) };

// ---------- size: by CPU in the infrastructure lens, otherwise by impact (like PageRank sizing in Bloom) ----------
nodes.forEach(n => { n.impact = n.t === 'dm' ? reach(n).dash.size : n.t === 'src' ? n.inn.length : deg(n); n.cpu = cpuOf(n);
  const k = n.ext ? 0.75 : 1;
  n.rq = n.t === 'src' ? 2 + Math.min(4, Math.sqrt(n.inn.length) * 0.5) : (1.2 + Math.min(4.5, Math.sqrt(n.impact) * 0.7 + Math.log10(1 + (n.o?.pop || 0)) * 0.35)) * k;
  n.ri = n.t === 'dash' ? 1.4 * k : n.t === 'src' ? 2 + Math.min(6, Math.sqrt(n.cpu) * 0.12) : (1.4 + Math.min(9, Math.sqrt(n.cpu) * 0.26)) * k; n.r = Math.max(n.rq, n.ri); });

const isolated = n => !deg(n);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const sdot = o => o.s >= 2 ? 'ok' : o.s === 1 ? 'warn' : 'bad';
const kindCol = n => { const k = infKind.get(n); return k ? ZK[k][1] : COL.idle; };
// tool links: '#' is a demo link that goes nowhere
const plink = g => g?.url === '#' ? `<a class="btn" href="#" data-demo="1" onclick="return false" title="Demo link">${PRODUCTS[g.p].name}<small>${g.what || '↗'}</small></a>` : g?.url ? `<a class="btn" href="${g.url}" target="_blank" rel="noopener">${PRODUCTS[g.p].name}<small>${g.what || '↗'}</small></a>` : g ? `<span class="btn off">${PRODUCTS[g.p].name}<small>no address set</small></span>` : '';
const meta = n => n.o ? `${KIND1[n.o.t]}${n.ext ? ' · ' + n.sub.l2 : ''} · ${fmtK(n.o.pop)} ${UNIT[n.o.t]}${n.cpu >= 1 ? ' · ' + ch(n.cpu) + ' CPU h' : ''}` : `Semantic Layer source · ${n.inn.length} metrics`;
const upOf = n => n.t === 'dash' ? n.inn.map(e => e.a) : n.t === 'dm' ? n.inn.filter(e => e.kind === 'dm').map(e => e.a) : n.t === 'met' ? n.out.filter(e => e.kind === 'ms').map(e => e.b) : [];
const downOf = n => n.t === 'dm' ? n.out.map(e => e.b) : n.t === 'src' ? n.inn.map(e => e.a) : [];
const rank = (a, b) => (bad(b) - bad(a)) || ((b.o?.pop || 0) - (a.o?.pop || 0));
const ownN = t => nodes.filter(n => n.t === t && !n.ext).length;
const zMetric = z => z.sav ? `−${ch(z.sav)} h` : z.cpu ? `${ch(z.cpu)} h` : z.gb ? `${fmtK(z.gb)} GB` : z.dash?.size ? otch(z.dash.size) : '';
const LENS_LABEL = { infra: 'Savings', dq: 'Problems', all: 'All links' };
// shared window state: lens, selected finding, selected object; the shell changes it, every view reads it
// certification is not a lens but a filter over any lens: only certified objects and their sources are bright
const st = { lens: ['infra', 'dq', 'all'].includes(QS.get('l')) ? QS.get('l') : 'all', cert: QS.get('c') === '1' || QS.get('l') === 'cert', zone: null, sel: null };
export { QS, D, $, COL, statusCol, LAYER, lay, nm, ch, esc, trunc, sdot, kindCol, plink, meta, nodes, byKey, edges, hiddenExt, deg, nbrs, nodeOf, cpuOf, bad, fails, plural, otch,
  reach, views, DQ, SAV, INF, ZK, infKind, LENS, LENS_LABEL, isCert, certRoots, CERT, certUp, certBad, inLens, isolated, upOf, downOf, rank, ownN, zMetric, st,
  SUBS, fmt, fmtK, KIND1, UNIT, isHot, checks, TOOL, PRODUCTS, fixLink, monOf, useOf, MED_CPV, COST_PERIOD, S };
