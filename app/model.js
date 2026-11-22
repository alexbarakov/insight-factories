import { DOMAINS, OBJECTS, SNAPSHOT } from './data/data.js?v=100';
import { INFRA, INFRA_PERIOD } from './data/infra.js?v=100';
import { NAMES } from './data/names.js?v=100';
import { TREND, TREND_DATES } from './data/trend.js?v=100';
import { OPS_DATE, INC_DATE, CHK, INC, DOWN } from './data/ops.js?v=100';
import { COST, COST_PERIOD } from './data/cost.js?v=100';
import { KEY_MET } from './data/keymet.js?v=100';
import { O3, O3_WEEKS } from './data/o3.js?v=100';
import { PRODUCTS, go, kbRepo, fixLink, checks, TOOL } from './products.js?v=100';
import { SKIN } from './skin.js?v=100';
import { G_DD, G_DM } from './data/graph.js?v=100';

// Shared model of the Insight Factories portal.
// Catalog: L1 (domain from the Domain Registry) → L2 (subdomain) → objects. Role and task wording lives in skin.js.
// Sources (synthetic in this demo): role assignments, AI-Ready inputs and domain knowledge, plus the health score of data marts,
// metrics and dashboards; names come from the Domain Registry; CPU and storage from infrastructure billing.
export { SNAPSHOT, INFRA_PERIOD, COST_PERIOD, TREND_DATES, OPS_DATE, INC_DATE, PRODUCTS, kbRepo, fixLink, checks, TOOL };
export const AIR_MAX = 14;                       // maximum legacy AI Ready points per subdomain
export const ok = s => s >= 2;
export const fmt = n => Math.round(n).toLocaleString('en-US');
export const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
export const cls = s => s == null ? 'grey' : s >= 0.5 ? 'ok' : s >= 0.25 ? 'warn' : 'bad';
export const igsCls = v => v == null ? 'grey' : v >= 50 ? 'ok' : v >= 25 ? 'warn' : 'bad';
export const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const TT = ['dash', 'met', 'dm'];
export const KIND = { dm: 'Data marts', met: 'Metrics', dash: 'Dashboards' };
export const KIND1 = { dm: 'Data mart', met: 'Metric', dash: 'Dashboard' };
export const UNIT = { dm: 'queries', met: 'uses', dash: 'views' };

export const SUBS = DOMAINS.map((r, i) => ({ i, l1: r[0], l2: r[1], bp: !!r[2], cur: !!r[3], ai: !!r[4], st: !!r[5], zone: r[6],
  roles: !!r[7], skill: !!r[8], air: r[15] || 0, faq: r[16] || 0, obj: r[17] || 0, gl: r[18] || 0, lin: r[19] || 0, t2s: r[20] || 0,
  t: { dm: [], met: [], dash: [] } }));
// k — object index in OBJECTS; chk — health score components and operations from data/ops.js (CHK is aligned with OBJECTS);
// cost — [CPU hours, GB] over 30 days from data/cost.js (data marts and metrics only)
export const OBJ_BY_K = [];
// a certified metric is a key metric (registry badge 'key'); the health score itself has no certification flag for metrics
const KEYS = new Set(KEY_MET);
OBJECTS.forEach((r, k) => { const o = { t: TT[r[0]], s: r[0] === 1 ? (r[2] >= 2 ? 2 : 0) + (KEYS.has(k) ? 1 : 0) : r[2], key: r[0] === 1 && KEYS.has(k), pop: r[3], name: r[4], id: r[5], sub: r[1], k, chk: CHK[k] || null, inc: [], down: DOWN[k] || null, cost: COST[k] || null };
  OBJ_BY_K[k] = o; SUBS[r[1]].t[o.t].push(o); });
// DQ incidents from Data Contracts: [k, severity 0..3, status o|p|d, opened, closed, chat post id]
export const IMP = ['minor', 'normal', 'major', 'critical'], IMP_LABEL = ['low', 'medium', 'high', 'critical'];
INC.forEach(x => { const o = OBJ_BY_K[x[0]]; if (o) o.inc.push(x); });
// data mart operations: freshness 0 — on time, 1 — late, 2 — not updating, 3 — no schedule; monitoring — has checkers in Data Contracts
export const FRESH = ['on time', 'late', 'not updating', 'no schedule'];
export const freshOf = o => o.t === 'dm' && o.chk ? o.chk[1][1] : null;
// monitored — has a business checker (custom or column-level); platform NoRows and DuplicateKey checks sit on almost every data mart and tell nothing apart
export const monOf = o => o.t === 'dm' && o.chk ? (o.chk[1][5] || 0) > 0 : null;
export const isOpen = x => x[2] === 'o' || x[2] === 'p';
export const P75 = {};
TT.forEach(t => { const a = OBJECTS.filter(r => TT[r[0]] === t).map(r => r[3]).sort((x, y) => x - y); P75[t] = a[Math.floor(a.length * 0.75)] || 0; });
// a problem is an object more popular than 75% of its type that fails the health score
export const isHot = o => !ok(o.s) && o.pop > P75[o.t];
export const agg = objs => ({ n: objs.length, good: objs.filter(o => ok(o.s)).length, cert: objs.filter(o => o.s === 1 || o.s === 3).length,
  use: objs.reduce((s, o) => s + o.pop, 0), hot: objs.filter(isHot).length });
export const objsOf = d => [...d.t.dm, ...d.t.met, ...d.t.dash];
// derived fields of a unit — a subdomain or a whole domain (d.subs): health, problems, freshness, incidents, output
function derive(d) { d.by = {}; TT.forEach(t => { d.t[t].sort((a, b) => b.pop - a.pop); d.by[t] = agg(d.t[t]); }); d.all = agg(objsOf(d));
  d.share = d.all.n ? d.all.good / d.all.n : null;
  d.hotList = objsOf(d).filter(isHot).sort((a, b) => b.pop / P75[b.t] - a.pop / P75[a.t]);
  if (!d.subs) d.people = NAMES[d.i] || {};                   // names from the Domain Registry
  // data mart freshness, monitoring and incidents
  const dms = d.t.dm.filter(o => o.chk); d.fresh = [0, 0, 0, 0]; dms.forEach(o => d.fresh[freshOf(o)]++); d.freshN = dms.length;
  d.mon = { on: dms.filter(monOf).length, n: dms.length };
  d.incAll = d.t.dm.flatMap(o => o.inc.map(x => ({ o, x }))).sort((a, b) => b.x[3] < a.x[3] ? -1 : 1);
  d.incOpen = d.incAll.filter(r => isOpen(r.x));
  const fixed = d.incAll.filter(r => r.x[4] && r.x[2] === 'd').map(r => (Date.parse(r.x[4]) - Date.parse(r.x[3])) / 36e5).sort((a, b) => a - b);
  d.mttr = fixed.length ? fixed[Math.floor(fixed.length / 2)] : null;
  // Insight Generation Score: 50% — share of views on healthy dashboards, 25% — share of dashboards that get views, 25% — health of data marts and metrics
  const dash = d.t.dash, raw = [...d.t.dm, ...d.t.met], v = dash.reduce((s, o) => s + o.pop, 0), hv = dash.filter(o => ok(o.s)).reduce((s, o) => s + o.pop, 0);
  d.views = v; d.out = { hv: v ? hv / v : 0, act: dash.length ? dash.filter(o => o.pop > 0).length / dash.length : 0, rh: raw.length ? raw.filter(o => ok(o.s)).length / raw.length : 0 };
  d.igs = dash.length || raw.length ? Math.round(100 * (0.5 * d.out.hv + 0.25 * d.out.act + 0.25 * d.out.rh)) : null;
  // tips: what lifts output the most and by how many points
  const badDash = dash.filter(o => !ok(o.s)).sort((a, b) => b.pop - a.pop).slice(0, 3), cold = dash.filter(o => o.pop === 0).length, badRaw = raw.filter(isHot).length;
  d.igsTips = [
    { c: 'hv', gain: v ? 50 * badDash.reduce((s, o) => s + o.pop, 0) / v : 0, text: badDash.length ? `fix the ${badDash.length} most viewed unhealthy dashboards` : null, objs: badDash },
    { c: 'act', gain: 25 * (1 - d.out.act), text: cold ? `archive ${cold} dashboards with no views` : null },
    { c: 'rh', gain: raw.length ? 25 * badRaw / raw.length : 0, text: badRaw ? `resolve ${badRaw} data mart and metric problems` : null },
  ];
  // data owner mood follows health
  d.mood = d.share == null ? null : d.share >= 0.5 ? 'happy' : d.share >= 0.25 ? 'flat' : 'sad'; }
SUBS.forEach(derive);
// health rank among subdomains that have objects
SUBS.filter(d => d.all.n).sort((a, b) => b.share - a.share).forEach((d, k) => { d.rank = k + 1; });
export const RANKED_N = SUBS.filter(d => d.all.n).length;
export const ROLES = ['st', 'bp', 'cur', 'ai'].map(k => [k, SKIN.roles[k], { st: 'data owner', bp: 'BI partner', cur: 'metrics curator', ai: 'AI champion' }[k]]);
export const has = (d, k) => !!(d.people[k] || d[k]);
export const who = (d, k) => d.people[k]?.n || (d[k] ? 'assigned, name not found' : null);
// AI-Ready Domains Score: two axes 0–100 — Readiness (R) and Result (O), level L0–L4.
// Component score = min(100, fact / target × 100), window — 30 days. A component without data is work in progress (wip):
// it is not computed and adds 0 to the axis score, so the axis shows a ceiling "of possible". A proxy component is computed
// from nearby prototype data; how it differs from the definition is described in note.
export const ARDS_URL = '#';
const sh = a => a.n ? a.good / a.n : null, p0 = v => v == null ? '—' : Math.round(v * 100) + '%';
const wsh = (objs, good, w = o => o.pop || 0) => { const W = objs.reduce((t, o) => t + w(o), 0); return W ? objs.filter(good).reduce((t, o) => t + w(o), 0) / W : null; };
const bit = (o, i) => o.chk?.[0]?.[i] === '1';
const DESC = { dm: 2, met: 0, dash: 5 }, OWNER = { dm: 1, met: 1, dash: 2 };
const trusted = o => o.s === 3 && freshOf(o) === 0 && !o.inc.some(x => isOpen(x) && x[1] >= 2);
// [key, axis, weight (unused: axes are unweighted means since the current method; kept so positional readers such as portal.js stay aligned), name, target,
//  how it is computed, source, what the full version needs, compute(d) → { fact, status, note }]
// display code: axis 1 — Readiness, axis 2 — Result; internal keys R1…O4 stay for the calculations
export const CODE = { R1: '1.1', R2: '1.2', R3: '1.3', R5: '1.4', O1: '2.1', O2: '2.2', O3: '2.3', O4: '2.4' };
export const ARDS = [
  ['R1', 'R', 0.25, 'Trusted data marts', 0.6, 'share of queries that go to trusted data marts', 'health score, freshness, Data Contracts incidents',
    'a minimal contract (unique key, no gaps, freshness within SLA), 30 days without critical checker failures, BI partner approval; query hits instead of access counts',
    d => ({ fact: wsh(d.t.dm, trusted), status: 'proxy', note: 'trusted = certified and healthy, on time, no open high-severity incidents' })],
  // R2 merges the earlier "entry through semantics" and "semantics": what share of data traffic goes through healthy Semantic Layer metrics.
  // Until the Semantic Layer logs data mart access, the proxy is the share of uses of healthy metrics among all metric uses of the subdomain
  ['R2', 'R', 0.25, 'Traffic through trusted semantics', 0.7, 'share of traffic to domain data that goes through healthy Semantic Layer metrics', 'metric health score; Semantic Layer logs — work in progress',
    'the Semantic Layer must proxy queries to data marts so direct data mart access enters the denominator — owned by the Semantic Layer team',
    d => ({ fact: wsh(d.t.met, o => o.s >= 2), status: d.t.met.length ? 'proxy' : 'none', note: 'for now — share of uses of healthy metrics; direct data mart queries are not counted' })],
  ['R3', 'R', 0.10, 'Trusted dashboards', 0.45, 'share of views on healthy certified dashboards', 'dashboard health score',
    'exclude owner views (dashboard event log), account for key dashboards', d => ({ fact: wsh(d.t.dash, o => o.s === 3), status: 'proxy', note: 'owner views are not excluded' })],
  ['R5', 'R', 0.20, 'Domain knowledge', 0.6, 'share of used objects that have a description', 'health score: object description',
    'the owner confirms the description and links its source (Knowledge Base maturity); auto-generated text without review does not count',
    // component logic is not defined yet: it is not computed and does not enter axis R
    () => ({ fact: null, status: 'tbd', note: TBD })],
  ['O1', 'O', 0.5, 'Answer quality', 0.85, 'share of correct answers on a golden set of at least 30 questions', 'eval template, text-to-semantics benchmark',
    'subdomain golden set and eval runs — owner not decided (BI partner, AI champion or Knowledge Base team)', d => ({ fact: mockO(d).o1, status: 'mock', note: `golden set of ${mockO(d).gs} cases` })],
  ['O2', 'O', 0.2, 'Question coverage', 0.5, 'share of questions about domain data over 90 days closed by the agent or the golden set', 'Chat channels, AI Assistant',
    'AI Assistant dialog logs in the warehouse and attribution of each question to a domain — AI Assistant team', d => ({ fact: mockO(d).o2, status: 'mock' })],
  // O3 is computed on the self-service audience from BI Maturity: a non-analyst is anyone outside analytics, BI, data engineering and data science roles;
  // an AI scenario is any tool flagged as AI (AI Assistant, AI in the SQL Workbench, Dashboards and Semantic Layer AI features)
  ['O3', 'O', 0.3, 'Self-service analytics with AI', 0.8, "share of the subdomain's non-analysts who used AI analytics scenarios in a week, averaged over 4 full weeks", 'self-service audience table, tool activity log (BI Maturity)',
    'the audience is the self-service BI Maturity snapshot, not every non-analyst in the domain; AI Assistant and Dashboards AI usage may include non-analytical scenarios',
    d => { const v = o3Raw(d); return v ? { fact: o3Of(d), status: 'ok', note: `of ${v[0]} non-analysts, active by week: ${v[1].join(', ')}; weeks ${dd2(O3_WEEKS[0])} to ${dd2(O3_WEEKS[1], 6)}` } : { fact: null, status: 'none', note: d.subs ? 'no subdomain is in the BI Maturity audience' : 'the subdomain is not in the BI Maturity audience' }; }],
  // lower is better: attainment = min(100%, target / fact)
  ['O4', 'O', 0, 'Infracost per healthy object', null, 'subdomain CPU hours over 30 days per healthy object', 'infrastructure billing by org structure (data/infra.js), health score',
    'money instead of CPU hours (platform rates), storage in TB; agree on a target instead of the median',
    d => { const f = cpgOf(d); return f == null ? { fact: null, status: 'none', note: d.cpu ? 'no healthy objects' : 'no usage data' } : { fact: f, unit: 'h', target: CPG_PLAN, score: Math.min(100, CPG_PLAN / f * 100), status: 'ok', note: `${Math.round(d.cpu).toLocaleString('en-US')} CPU h over ${d.all.good} healthy objects; target is the subdomain median` }; }],
];
// axis O has no sources yet — values are generated for the prototype, deterministic per subdomain and based on its knowledge:
// a subdomain with a Knowledge Base skill and text2sql examples gets a larger golden set and better answers. Marked "generated" in the UI.
export const MOCK_O = 'generated for the prototype';
const mockCache = new Map();
function mockO(d) { if (mockCache.has(d)) return mockCache.get(d);
  if (d.subs) { const ms = d.subs.map(x => [mockO(x), x.ud30 || x.all.n || 0]), gs = ms.reduce((t, [m]) => t + m.gs, 0), W = ms.reduce((t, [, w]) => t + w, 0), real = o3Of(d);
    const r = { gs, o1: gs ? ms.reduce((t, [m]) => t + m.o1 * m.gs, 0) / gs : 0, o2: W ? ms.reduce((t, [m, w]) => t + m.o2 * w, 0) / W : 0, o3: real ?? (W ? ms.reduce((t, [m, w]) => t + m.o3 * w, 0) / W : 0), o3real: real != null };
    mockCache.set(d, r); return r; }
  const h = k => (hash(d.l1 + '|' + d.l2 + '|' + k) % 1000) / 1000, kn = Math.min(1, (d.faq + d.gl + d.t2s) / 400);
  // mature knowledge: a published skill, at least 30 text2sql examples and a well-filled FAQ and glossary (kn ≥ 0.5).
  // Such subdomains get a bonus on 2.1–2.3, otherwise almost every subdomain stops at L2 and the L3–L4 rules never fire.
  // With the bonus the synthetic data spreads over L0–L4 (a handful at L3, one or two at L4).
  const mature = d.skill && d.t2s >= 30 && kn >= 0.5;
  const gs = d.skill ? 30 + Math.round(h('gs') * 90) : Math.round(h('gs') * 28);
  const o1 = gs ? Math.min(0.97, 0.45 + 0.3 * h('o1') + 0.15 * kn + (d.t2s >= 10 ? 0.05 : 0) + (mature ? 0.1 : 0)) : 0;
  const o2 = Math.min(0.9, 0.08 + 0.45 * h('o2') * (0.4 + 0.6 * d.air / AIR_MAX) + 0.1 * kn + (mature ? 0.3 : 0));
  const o3 = Math.min(0.9, (d.skill ? 0.15 : 0.03) + 0.5 * h('o3') * (0.3 + 0.7 * kn) + (mature ? 0.15 : 0));
  const real = o3Of(d), r = { gs, o1, o2, o3: real ?? o3, o3real: real != null }; mockCache.set(d, r); return r; }
// O3 — mean of weekly shares: active users summed over 4 weeks / 4 / audience
// a pooled unit (domain, company) adds up audiences and weekly actives: a person in two subdomains is counted twice
const o3Raw = d => { if (!d.subs) return O3[d.l1 + '|' + d.l2] || null;
  const xs = d.subs.map(x => O3[x.l1 + '|' + x.l2]).filter(Boolean); return xs.length ? [xs.reduce((t, v) => t + v[0], 0), [0, 1, 2, 3].map(k => xs.reduce((t, v) => t + v[1][k], 0))] : null; };
const o3Of = d => { const v = o3Raw(d); return v && v[0] ? v[1].reduce((a, b) => a + b, 0) / v[1].length / v[0] : null; };
const dd2 = (iso, plus = 0) => { const t = new Date(iso + 'T00:00:00'); t.setDate(t.getDate() + plus); return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
export const LEVEL_NAMES = ['L0', 'L1', 'L2', 'L3', 'L4'];
export const CAMPAIGN = { level: 3, title: 'share of subdomains with a BI partner at L3 or above', goal: 0.75, year: 2027 };
export const WIP = 'work in progress';
export const TBD = 'logic to be defined';
const key = s => s.toLowerCase().trim();
SUBS.forEach(d => { const r = INFRA.find(x => key(x[0]) === key(d.l1) && x[1] && key(x[1]) === key(d.l2)); d.cpu = r ? r[2] : null; d.tb = r ? r[3] : null; });
// 2.4 Infracost per healthy object: subdomain CPU hours over 30 days per healthy object; the target is the median across subdomains
const cpgOf = d => d.cpu && d.all.good ? d.cpu / d.all.good : null;
export const CPG_PLAN = (() => { const a = SUBS.map(cpgOf).filter(v => v != null).sort((x, y) => x - y); return a.length ? a[a.length >> 1] : null; })();
// AI-Ready components and axes for any unit: a subdomain or a pooled domain or company unit (fields subs, t, cpu, all)
export function scoreArds(d) {
  const comp = ARDS.map(([key, axis, w, name, target, how, src, need, f]) => { const r = f(d), score = r.fact == null ? null : r.score ?? Math.min(100, r.fact / target * 100);
    return { key, code: CODE[key], axis, w, name, target, how, src, need, ...r, target: r.target ?? target, status: r.fact == null && r.status !== 'wip' && r.status !== 'tbd' ? 'none' : r.status, score }; });
  // no weights: an axis is the mean target attainment of its components (as in the BI Maturity score).
  // a component with no objects is skipped; one without data (wip) counts as 0%, hence the ceiling "of possible"
  const axis = a => { const cs = comp.filter(c => c.axis === a && c.status !== 'none' && c.status !== 'tbd'), live = cs.filter(c => c.score != null);
    cs.forEach(c => { c.wn = 1 / (cs.length || 1); });
    return { v: live.length ? Math.round(live.reduce((t, c) => t + c.wn * c.score, 0)) : null, max: Math.round(live.reduce((t, c) => t + c.wn * 100, 0)), wip: cs.filter(c => c.score == null).map(c => c.key) }; };
  const R = axis('R'), O = axis('O');
  return { comp, R, O, idx: O.v == null || R.v == null ? null : Math.min(R.v, O.v) }; }
// levels L0–L4 and promotion rules; also works for a domain as a unit
function levelUp(d) {
  const { comp, R, O } = scoreArds(d);
  const roles = has(d, 'bp') && has(d, 'st');
  // levels: L1 is computed today; L2–L4 need a golden set and axis O — generated for the prototype for now
  const rule = (name, ok, now, wip, mock) => ({ name, ok: !!ok, now, wip: !!wip, mock: !!mock });
  const m = mockO(d), pc = v => Math.round(v * 100) + '%';
  d.rules = [
    [rule('BI partner and data owner assigned', roles, [has(d, 'bp') ? 'BI partner' : 'no BI partner', has(d, 'st') ? 'data owner' : 'no data owner'].join(', ')),
     rule('Readiness at least 40', R.v >= 40, `${R.v ?? '—'} of ${R.max} possible`)],
    [rule('Readiness at least 60', R.v >= 60, `${R.v ?? '—'}`), rule('Knowledge Base skill published', d.skill, d.skill ? 'yes' : 'no'), rule('Golden set of at least 30 cases', m.gs >= 30, `${m.gs}`, false, true)],
    [rule('Readiness at least 70', R.v >= 70, `${R.v ?? '—'}`), rule('2.1 Answer quality at least 70%', m.o1 >= 0.7, pc(m.o1), false, true), rule('2.3 Self-service analytics with AI at least 30%', m.o3 >= 0.3, pc(m.o3), false, !m.o3real)],
    [rule('Readiness at least 80', R.v >= 80, `${R.v ?? '—'}`), rule('2.1 at least 85%, 2.2 at least 50%, 2.3 at least 60%', m.o1 >= 0.85 && m.o2 >= 0.5 && m.o3 >= 0.6, `${pc(m.o1)}, ${pc(m.o2)}, ${pc(m.o3)}`, false, true)]];
  let L = 0; for (const rs of d.rules) { if (rs.every(r => r.ok)) L++; else break; }
  d.ards = { comp, R, O, roles, gs: m.gs, idx: O.v == null || R.v == null ? null : Math.min(R.v, O.v) };
  d.level = d.all.n ? L : null;
  d.next = d.level != null && d.level < d.rules.length ? d.rules[d.level].filter(r => !r.ok) : [];
}
SUBS.forEach(levelUp);
// rank by AI-Ready score and the 2027 KPI: share of subdomains with a BI partner at L3 or above
SUBS.filter(d => d.level != null && d.ards.idx != null).sort((a, b) => b.ards.idx - a.ards.idx).forEach((d, k) => { d.aiRank = k + 1; });
export const AI_RANKED = SUBS.filter(d => d.aiRank).length;
const withBp = SUBS.filter(d => d.level != null && has(d, 'bp'));
export const AI_KPI = { n: withBp.length, l3: withBp.filter(d => d.level >= 3).length, get v() { return this.n ? this.l3 / this.n : null; } };
// AI-readiness points: each day a subdomain earns AI-Ready score (0–100) / 100 × that day's user-days; domains compare by the sum.
// User-days are a proxy: data mart queries, dashboard views and metric uses over 30 days, spread across days
// with a weekly rhythm (less on weekends). The daily split is generated for the prototype.
export const PTS_DAYS = 30, PTS_NOTE = 'user-days are a proxy from queries and views; the daily split is generated';
export const PTS_DATES = Array.from({ length: PTS_DAYS }, (_, i) => new Date(Date.parse(SNAPSHOT) - (PTS_DAYS - 1 - i) * 864e5).toISOString().slice(0, 10));
SUBS.forEach(d => { const ev = objsOf(d).reduce((t, o) => t + (o.pop || 0), 0), idx = d.ards?.idx ?? 0;
  const w = PTS_DATES.map((dt, i) => { const wd = new Date(dt).getUTCDay(), r = (hash(d.l2 + dt) % 1000) / 1000; return (wd === 0 || wd === 6 ? 0.45 : 1) * (0.85 + 0.3 * r); }), W = w.reduce((t, x) => t + x, 0) || 1;
  d.ud = w.map(x => ev * x / W); d.pts = d.ud.map(u => Math.round(u * idx / 100)); d.pts30 = d.pts.reduce((t, x) => t + x, 0); d.ptsToday = d.pts[PTS_DAYS - 1]; d.ud30 = Math.round(ev); });
export const DOMS = [...new Set(SUBS.map(d => d.l1))].map(name => { const subs = SUBS.filter(d => d.l1 === name), all = agg(subs.flatMap(objsOf));
  return { name, subs, all, share: all.n ? all.good / all.n : null, by: Object.fromEntries(TT.map(t => [t, agg(subs.flatMap(d => d.t[t]))])),
    air: subs.length ? subs.reduce((s, d) => s + d.air, 0) / subs.length : 0,
    igs: (() => { const live = subs.filter(d => d.igs != null), w = live.reduce((s, d) => s + d.all.n, 0); return w ? Math.round(live.reduce((s, d) => s + d.igs * d.all.n, 0) / w) : null; })() }; })
  .sort((a, b) => b.all.n - a.all.n);
// infrastructure: CPU hours over 30 days and storage TB by domain and subdomain; a domain gets the sum, including usage with no subdomain
export const fmtK = n => n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : fmt(n);
export const fmtTb = n => n == null ? '—' : n >= 10 ? fmt(n) + ' TB' : n >= 0.1 ? n.toFixed(1) + ' TB' : n > 0 ? '<0.1 TB' : '0 TB';
DOMS.forEach(u => { const rows = INFRA.filter(x => key(x[0]) === key(u.name)); u.cpu = rows.reduce((s, x) => s + x[2], 0); u.tb = rows.reduce((s, x) => s + x[3], 0);
  u.cpuNoSub = rows.filter(x => !x[1]).reduce((s, x) => s + x[2], 0);
  u.cpg = u.all.good ? u.cpu / u.all.good : null;          // CPU hours per healthy object
  u.cpuNote = u.cpu ? `${pct(u.cpuNoSub, u.cpu)}% with no subdomain, ${fmtTb(u.tb)}` : null; });
DOMS.forEach(u => { u.pts = PTS_DATES.map((_, i) => u.subs.reduce((t, d) => t + d.pts[i], 0)); u.pts30 = u.pts.reduce((t, x) => t + x, 0); u.ptsToday = u.pts[PTS_DAYS - 1]; u.ud30 = u.subs.reduce((t, d) => t + d.ud30, 0); });
[...DOMS].sort((a, b) => b.pts30 - a.pts30).forEach((u, k) => { u.ptsRank = k + 1; });
[...SUBS].filter(d => d.pts30 > 0).sort((a, b) => b.pts30 - a.pts30).forEach((d, k) => { d.ptsRank = k + 1; });
export const CPU_ALL = DOMS.reduce((s, u) => s + u.cpu, 0);
// shared portal interface: storage
export const fmtStore = fmtTb;
SUBS.forEach(d => { d.store = d.tb; });
DOMS.forEach(u => { u.store = u.tb; });
// weekly share of healthy objects (data/trend.js: [subdomain][dash, met, dm][week] = [healthy, total]); the object set is the current snapshot
const TI = { dash: 0, met: 1, dm: 2 }, W = TREND_DATES.length;
const share = rows => Array.from({ length: W }, (_, k) => { const g = rows.reduce((s, r) => s + r[k][0], 0), n = rows.reduce((s, r) => s + r[k][1], 0); return n ? g / n : null; });
const trendOf = idx => ({ ...Object.fromEntries(TT.map(t => [t, share(idx.map(i => TREND[i][TI[t]]))])), all: share(idx.flatMap(i => TREND[i])) });
SUBS.forEach(d => { d.trend = trendOf([d.i]); });
DOMS.forEach(u => { u.trend = trendOf(u.subs.map(d => d.i)); });
export const ALL_TREND = trendOf(SUBS.map(d => d.i));
// weekly AI-Ready score trend — an estimate: components that depend on object health
// (R1 trusted data marts, R3 trusted dashboards, R2 traffic through semantics) scale with the healthy share of their type; the rest stay as now
export const IDX_BY = { R1: 'dm', R2: 'met', R3: 'dash' };
SUBS.forEach(d => { const A = d.ards; if (!A || A.idx == null) { d.idxTrend = null; return; } const n = TREND_DATES.length;
  d.idxTrend = Array.from({ length: n }, (_, w) => { const Rs = A.comp.filter(c => c.axis === 'R' && c.score != null);
    const r = Rs.reduce((t, c) => { const tt = IDX_BY[c.key], now = d.trend[tt]?.[n - 1], then = d.trend[tt]?.[w]; const k = tt && now > 0 && then != null ? then / now : 1;
      return t + c.wn * Math.min(100, c.score * k); }, 0);
    return Math.round(Math.min(Math.round(r), A.O.v)); });
  d.idxTrend[n - 1] = A.idx; });
export const ALL = agg(SUBS.flatMap(objsOf));
export const COMPANY_ARDS = scoreArds(pool(SUBS.filter(d => d.ards), CPU_ALL, ALL));
export const BY = Object.fromEntries(TT.map(t => [t, agg(SUBS.flatMap(d => d.t[t]))]));
// platform-wide operations
export const OPS = (() => { const f = [0, 0, 0, 0]; let n = 0, mon = 0; SUBS.forEach(d => { d.fresh.forEach((v, i) => f[i] += v); n += d.freshN; mon += d.mon.on; });
  const open = SUBS.flatMap(d => d.incOpen); return { fresh: f, n, freshN: n, mon, open, high: open.filter(r => r.x[1] >= 2).length }; })();
DOMS.forEach(u => { u.incOpen = u.subs.flatMap(d => d.incOpen); u.fresh = [0, 1, 2, 3].map(i => u.subs.reduce((s, d) => s + d.fresh[i], 0)); u.freshN = u.subs.reduce((s, d) => s + d.freshN, 0);
  u.mon = { on: u.subs.reduce((s, d) => s + d.mon.on, 0), n: u.subs.reduce((s, d) => s + d.mon.n, 0) }; });

// tasks with points; each has the product where it is done. Wording lives in skin.js
// how much the AI-Ready score rises if a component takes a new fact: axis R is the unweighted mean attainment, the score is min(Result, Readiness)
export function idxGain(d, patch) { const A = d.ards; if (!A || A.idx == null) return 0;
  const cs = A.comp.filter(c => c.axis === 'R' && c.status !== 'none' && c.status !== 'tbd'); if (!cs.length) return 0;
  const R = cs.reduce((t, c) => { const f = c.key in patch ? patch[c.key] : c.fact; return t + (f == null ? 0 : Math.min(100, f / c.target * 100)); }, 0) / cs.length;
  return Math.max(0, Math.min(Math.round(R), A.O.v ?? 0) - A.idx); }
const factOf = (d, k) => d.ards?.comp.find(c => c.key === k)?.fact ?? 0;
// a task lifts its component: metrics — R2, data marts and monitoring — R1, dashboards — R3; the rest does not move the score
const lift = (d, k, f) => idxGain(d, { [k]: Math.min(1, f(factOf(d, k))) });
export function tasks(d) {
  const T = [], X = SKIN.tasks, bad = t => d.t[t].filter(o => !ok(o.s)).length, cold = objsOf(d).filter(o => o.pop === 0).length;
  if (!has(d, 'bp')) T.push([...X.bp(d), 'needed to leave L0', go('registry')]);
  if (!has(d, 'st') && X.st) T.push([...X.st(d), 'needed to leave L0', go('registry')]);
  if (!d.roles) T.push([...X.roles(d), 0, go('registry')]);
  if (!has(d, 'cur') && d.by.met.n) T.push([...X.cur(d), 0, go('semantic')]);
  if (!has(d, 'ai')) T.push([...X.ai(d), 0, go('registry')]);
  if (!d.skill) T.push([...X.skill(d), 0, go('git', kbRepo(d) || PRODUCTS.git.url)]);
  if (bad('met')) T.push([...X.met(bad('met')), lift(d, 'R2', () => 1), go('semantic')]);
  if (bad('dm')) T.push([...X.dm(bad('dm')), lift(d, 'R1', v => v + (1 - v) * 0.5), go('catalog')]);
  if (bad('dash')) T.push([...X.dash(bad('dash')), lift(d, 'R3', v => v + (1 - v) * 0.5), go('dashboards')]);
  if (d.skill && d.t2s < 10) T.push([...X.t2s(d), 0, go('kb')]);
  const noMon = d.mon.n - d.mon.on, open = d.incOpen.length;
  if (noMon && d.mon.n) T.push([...(X.mon ? X.mon(noMon) : ['Add business checkers', `${noMon.toLocaleString('en-US')} data marts with platform checkers only`]), lift(d, 'R1', v => v + (1 - v) * 0.2), go('dc')]);
  if (open) T.push([...(X.inc ? X.inc(open) : ['Triage DQ incidents', `${open} open in Data Contracts`]), lift(d, 'R1', v => v + 0.05), go('chat')]);
  if (cold > 5) T.push([...X.cold(cold), 0, null]);
  return T.sort((a, b) => b[2] - a[2]);
}

// infrastructure savings: where CPU is spent with no return. Data mart usage = queries to it plus MAU of dashboards built on it.
// Cost per use is compared with the median across all company data marts that have spend in billing.
export const useOf = o => (o.pop || 0) + (o.down?.[3] || 0);
const cpvAll = OBJ_BY_K.filter(o => o.t === 'dm' && o.cost?.[0] > 0).map(o => o.cost[0] / Math.max(1, useOf(o))).sort((a, b) => a - b);
export const MED_CPV = cpvAll[cpvAll.length >> 1] || 1;
const sumC = a => a.reduce((s, x) => s + x.sav, 0);
export function savings(d) {
  const dm = d.t.dm.filter(o => o.cost), met = d.t.met.filter(o => o.cost), cpuDm = dm.reduce((s, o) => s + o.cost[0], 0), cpuMet = met.reduce((s, o) => s + o.cost[0], 0);
  const cut = dm.filter(o => !o.down && o.pop <= 10 && o.cost[0] >= 1).map(o => ({ o, sav: o.cost[0] })).sort((a, b) => b.sav - a.sav);
  const cutK = new Set(cut.map(x => x.o));
  const met0 = met.filter(o => o.chk && o.chk[0][2] === '0' && o.cost[0] > 0).map(o => ({ o, sav: o.cost[0] })).sort((a, b) => b.sav - a.sav);
  // expensive per use: five or more times the median; the goal is three times the median, at most 70% of spend
  const opt = dm.filter(o => !cutK.has(o) && o.cost[0] >= 50 && o.cost[0] / Math.max(1, useOf(o)) >= 5 * MED_CPV)
    .map(o => ({ o, sav: Math.min(o.cost[0] * 0.7, o.cost[0] - 3 * MED_CPV * useOf(o)), cpv: o.cost[0] / Math.max(1, useOf(o)) })).sort((a, b) => b.sav - a.sav);
  const optK = new Set(opt.map(x => x.o));
  const trust = dm.filter(o => !ok(o.s) && !cutK.has(o) && !optK.has(o) && o.cost[0] >= 100).map(o => ({ o, sav: 0, cpu: o.cost[0] })).sort((a, b) => b.cpu - a.cpu);
  const store = dm.filter(o => o.cost[1] >= 50 && useOf(o) <= 50).map(o => ({ o, sav: 0, gb: o.cost[1] })).sort((a, b) => b.gb - a.gb);
  const G = [];
  if (cut.length) G.push({ kind: 'cut', short: 'Turn off: nobody reads',  items: cut, sav: sumC(cut), title: 'Turn off data marts nobody reads',
    what: 'Over 30 days these data marts have no dashboards, queries or datasets and no dependent warehouse objects, and 10 or fewer queries.',
    act: 'Agree with the owner and take them off the schedule. Before turning off, check dependencies outside Dashboards and the warehouse, then deprecate in the Data Catalog.', go: go('catalog', undefined, 'deprecate') });
  if (met0.length) G.push({ kind: 'met0', short: 'Turn off: unused metrics',  items: met0, sav: sumC(met0), title: 'Stop computing unused metrics',
    what: 'The metrics are computed every day, but fail the "used" check in the health score.',
    act: 'Review with the metrics curator: remove from the Semantic Layer or switch to on-demand computation. Start with the most expensive.', go: go('semantic', undefined, 'metrics') });
  if (opt.length) G.push({ kind: 'opt', short: 'Optimize: expensive per use',  items: opt, sav: sumC(opt), title: 'Optimize data marts that are expensive per use',
    what: `Cost per use is 5 or more times the company median (${Math.round(MED_CPV * 10) / 10} CPU h). Savings estimate: bring it down to three medians, at most 70% of spend.`,
    act: 'Switch to incremental recompute, lower the frequency to real demand, check partitioning and date filters. If there are few users, merge with a neighboring data mart.', go: go('git', undefined, 'data mart code') });
  if (trust.length) G.push({ kind: 'trust', short: 'Spend on unhealthy',  items: trust, sav: 0, cpu: trust.reduce((s, x) => s + x.cpu, 0), title: 'Spend on unhealthy data marts',
    what: 'There is spend, but the data cannot be trusted: the health score fails. This is not a saving but spend with no return.',
    act: 'Fix the health score checks so the spend pays off. If the data mart will not be fixed, turn it off together with its dashboards.', go: go('catalog') });
  if (store.length) G.push({ kind: 'store', short: 'Storage without usage',  items: store, sav: 0, gb: store.reduce((s, x) => s + x.gb, 0), title: 'Large storage with little usage',
    what: '50 GB or more with 50 or fewer queries and views over 30 days.', act: 'Set retention (TTL) for old partitions or shorten the history depth.', go: go('catalog') });
  return { cpu: cpuDm + cpuMet, cpuDm, cpuMet, groups: G, total: G.reduce((s, g) => s + g.sav, 0) };
}

// ---------- data exchange between domains: who reads whose data marts ----------
// data mart of domain A → dashboard of domain B (weight — dashboard views) and data mart A → data mart B (dependencies of critical data marts, weight 1)
export const DFLOW = (() => { const F = new Map(), dom = k => SUBS[OBJECTS[k][1]]?.l1;
  const add = (a, b, w) => { const A = dom(a), B = dom(b); if (!A || !B || A === B) return; const k = A + '\u0001' + B, e = F.get(k) || { a: A, b: B, w: 0, n: 0 }; e.w += w; e.n++; F.set(k, e); };
  for (let i = 0; i < G_DD.length; i += 2) add(G_DD[i], G_DD[i + 1], OBJECTS[G_DD[i + 1]][3] || 0);
  for (let i = 0; i < G_DM.length; i += 3) add(G_DM[i], G_DM[i + 1], 1);
  return [...F.values()].sort((x, y) => y.w - x.w); })();
DOMS.forEach(u => { const out = DFLOW.filter(f => f.a === u.name); u.supW = out.reduce((t, f) => t + f.w, 0); u.supN = out.length; });

// ---------- awards of the month: the game side of "productivity" ----------
// decided once a month; the current month comes from the snapshot, the prototype has no earlier snapshots
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const NOM_MONTH = `${MONTHS[+SNAPSHOT.slice(5, 7) - 1]} ${SNAPSHOT.slice(0, 4)}`;
// ---------- domain ranking: AI-Ready split by component and monthly progress split by object type ----------
// progress — change in the healthy share over 4 weeks, pp
const dlt = a => { const n = a?.length || 0, x = a?.[n - 5], y = a?.[n - 1]; return x == null || y == null ? null : (y - x) * 100; };
// a domain and the company are scored on their own, not as a mean of subdomains: objects of all subdomains go into one pool,
// shares are computed on it (trusted queries / all queries), counters are summed (CPU / healthy objects, active / audience)
function pool(subs, cpu, all) { return { subs, t: { dm: subs.flatMap(d => d.t.dm), met: subs.flatMap(d => d.t.met), dash: subs.flatMap(d => d.t.dash) }, cpu, all }; }
DOMS.forEach(u => { const subs = u.subs.filter(d => d.ards);
  u.ards = scoreArds(pool(subs, u.cpu, u.all)); u.aiIdx = u.ards.idx; u.comp = u.ards.comp;
  u.lift = dlt(u.trend.all); u.liftBy = { dm: dlt(u.trend.dm), met: dlt(u.trend.met), dash: dlt(u.trend.dash) }; });
// a domain as a unit for the domain workspace: the same fields as a subdomain, objects of all subdomains in one pool.
// A role counts as present if it is assigned in at least one subdomain; people — summary across subdomains (how many assigned, names)
const roleSum = (subs, k) => { const on = subs.filter(d => has(d, k)), names = [...new Set(on.map(d => d.people[k]?.n).filter(Boolean))];
  return on.length ? { n: names.length === 1 ? names[0] : names.length ? `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''}` : null, p: `${on.length} of ${subs.length} subdomains`, on: on.length } : null; };
export const DOMV = DOMS.map((u, k) => { const subs = u.subs, sum = f => subs.reduce((t, d) => t + (d[f] || 0), 0);
  const D = { i: 'dom' + k, l1: u.name, l2: u.name, dom: u, subs, zone: subs[0]?.zone,
    bp: subs.some(d => has(d, 'bp')), st: subs.some(d => has(d, 'st')), cur: subs.some(d => has(d, 'cur')), ai: subs.some(d => has(d, 'ai')),
    roles: subs.every(d => d.roles), skill: subs.some(d => d.skill), air: Math.max(0, ...subs.map(d => d.air || 0)),
    faq: sum('faq'), obj: sum('obj'), gl: sum('gl'), lin: sum('lin'), t2s: sum('t2s'),
    t: { dm: subs.flatMap(d => d.t.dm), met: subs.flatMap(d => d.t.met), dash: subs.flatMap(d => d.t.dash) },
    people: Object.fromEntries(['st', 'bp', 'cur', 'ai'].map(r => [r, roleSum(subs, r)]).filter(([, v]) => v)) };
  Object.assign(D, { cpu: u.cpu, tb: u.tb, store: u.store, trend: u.trend, ud: u.ud, ud30: u.ud30, pts: u.pts, pts30: u.pts30, ptsToday: u.ptsToday });
  derive(D); levelUp(D); D.mood = null;
  u.view = D; u.ards = D.ards; u.aiIdx = D.ards.idx; u.comp = D.ards.comp; u.level = D.level; return D; });
// domain rank by score among domains that have a level
DOMV.filter(D => D.level != null && D.ards.idx != null).sort((a, b) => b.ards.idx - a.ards.idx).forEach((D, k) => { D.aiRank = k + 1; });
export const DOM_RANKED = DOMV.filter(D => D.aiRank).length;
DOMV.forEach(D => { D.rankN = DOM_RANKED; });
export const LEADERS = DOMS.filter(u => u.all.n >= 30 && u.aiIdx != null);
export const NOMS = (() => { const live = DOMS.filter(u => u.all.n >= 30), best = (list, f) => [...list].filter(u => f(u) != null).sort((a, b) => f(b) - f(a));
  const aiIdx = u => u.aiIdx;
  const lift = u => { const a = u.trend.all, n = a.length, x = a[n - 5], y = a[n - 1]; return x == null || y == null ? null : (y - x) * 100; };
  const health = u => u.all.n >= 100 ? u.all.good / u.all.n : null;
  const R = [
    ['prod', 'Most productive', best(live, u => u.pts30), u => 'AI-Ready × data usage over the month'],
    ['lift', 'Leap of the month', best(live, lift), u => `healthy objects +${lift(u).toFixed(1)} pp over 4 weeks`],
    ['sup', 'Top supplier', best(live, u => u.supW || null), u => `its data marts are read by ${u.supN} ${u.supN === 1 ? 'domain' : 'domains'}`],
    ['clean', 'Cleanest workshop', best(live, health), u => `${Math.round(health(u) * 100)}% of objects healthy`],
    ['ai', 'Closest to AI-Ready', best(live, aiIdx), u => `score ${Math.round(aiIdx(u))} of 100`],
  ];
  return R.filter(r => r[2].length).map(([key, title, list, why]) => ({ key, title, win: list[0], why: why(list[0]), next: list[1] || null })); })();

// ---------- object-level data exchange between subdomains ----------
// supplier → consumer: a supplier data mart is read by a consumer dashboard (weight — dashboard views)
// or by a consumer data mart (weight — its queries). For a factory: who supplies it, whom it ships to and how good that data is.
export const SUBX = (() => { const inn = SUBS.map(() => new Map()), out = SUBS.map(() => new Map());
  const put = (m, key, o, by, w) => { const e = m.get(key) || { sub: SUBS[key], objs: new Map(), w: 0 }; e.w += w; const x = e.objs.get(o) || { o, w: 0, by: new Set() }; x.w += w; x.by.add(by); e.objs.set(o, x); m.set(key, e); };
  const add = (a, b, w) => { const A = OBJ_BY_K[a], B = OBJ_BY_K[b]; if (!A || !B || A.sub === B.sub) return; put(inn[B.sub], A.sub, A, B, w); put(out[A.sub], B.sub, A, B, w); };
  for (let i = 0; i < G_DD.length; i += 2) add(G_DD[i], G_DD[i + 1], Math.max(1, OBJ_BY_K[G_DD[i + 1]]?.pop || 0));
  for (let i = 0; i < G_DM.length; i += 3) add(G_DM[i], G_DM[i + 1], Math.max(1, OBJ_BY_K[G_DM[i + 1]]?.pop || 0));
  const fin = m => [...m.values()].map(e => ({ ...e, list: [...e.objs.values()].sort((a, b) => b.w - a.w), q: qOf([...e.objs.values()]) })).sort((a, b) => b.w - a.w);
  return { inn: inn.map(fin), out: out.map(fin) }; })();
// data quality in the exchange: share of the weight that falls on the supplier's healthy objects
export function qOf(xs) { let g = 0, n = 0; xs.forEach(x => { n += x.w; if (ok(x.o.s)) g += x.w; }); return n ? g / n : null; }
export const qAll = list => qOf(list.flatMap(e => e.list));
