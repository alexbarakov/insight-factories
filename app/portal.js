import { SUBS, DOMS, ALL, BY, ALL_TREND, TREND_DATES, SNAPSHOT, INFRA_PERIOD, AIR_MAX, CPU_ALL, RANKED_N, fmtK, fmtStore, ROLES, has, who, ok, fmt, pct, cls, igsCls, hash, KIND1, UNIT, isHot, objsOf, tasks, checks, TOOL, PRODUCTS, fixLink, kbRepo,
  OPS, OPS_DATE, INC_DATE, LEVEL_NAMES, CAMPAIGN, ARDS_URL, WIP, MOCK_O, AI_KPI, AI_RANKED, ARDS, CODE, COMPANY_ARDS, DOMV, PTS_NOTE, TBD, NOMS, NOM_MONTH, FRESH, freshOf, monOf, isOpen, IMP_LABEL, savings, useOf, SUBX, qOf, DFLOW, idxGain } from './model.js?v=100';
import { CHECKS, checksReal } from './products.js?v=100';
import { runAgent } from './agent.js?v=100';
import { ECON } from './econ.js?v=100';
import { refFooter } from './reffoot.js?v=100';
import { SKIN as S } from './skin.js?v=100';

// ============================================================================
// Domain observability portal for Insight Factories.
// Vocabulary and game links live in skin.js, data and scoring in model.js, links to tools in products.js.
// Catalog: L1 (domain) → L2 (subdomain) → objects; the portal keeps the domain and role registry (loaded once from the Domain Registry).
// The portal only shows state; actions lead to the relevant tools, 3D views are separate game pages.
// ============================================================================
const $ = id => document.getElementById(id), main = $('main');
const enc = encodeURIComponent, dec = decodeURIComponent;
const ME = 'iberg';
const MOCK = '<span class="mock">example</span>';
const PROB = '<svg class="pi" width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.2 11.1 10.4H.9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 4.7v2.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="8.7" r=".8" fill="currentColor"/></svg>';
const GOAL = 0.6;
const domOf = name => DOMS.find(u => u.name === name);
const st = o => o.s === 3 ? 'healthy, certified' : o.s === 2 ? 'healthy' : o.s === 1 ? 'certified, unhealthy' : 'unhealthy';
const sdot = o => o.s >= 2 ? 'ok' : o.s === 1 ? 'warn' : 'bad';
const hb = a => a.n ? `<span class="hb"><i><b class="${cls(a.good / a.n)}" style="width:${pct(a.good, a.n)}%"></b></i><span class="pc">${pct(a.good, a.n)}%</span></span>` : '<span style="color:var(--ink3)">—</span>';
const bar = (label, a) => a.n ? `<div class="bar2"><span>${label}</span><div class="track"><i style="width:${pct(a.good, a.n)}%;background:var(--ok)"></i><i style="width:${100 - pct(a.good, a.n)}%;background:var(--bad-track)"></i></div><em>${pct(a.good, a.n)}% of ${fmt(a.n)}</em></div>`
  : `<div class="bar2"><span>${label}</span><div class="track"></div><em>none</em></div>`;
// English plural: a = one, b = many (c kept for older call sites, same as b)
const plural = (n, a, b, c = b) => n === 1 ? a : b;
const l2W = n => `${n} ${plural(n, ...S.l2.forms)}`;
const prob = n => n ? `<span class="bn" title="issues: popular unhealthy objects">${PROB}${n}</span>` : '';
// AI metrics: the warehouse has no attribution by subdomain yet, values are an example
const aiMock = d => { const h = hash(d.l2), base = 40 + Math.sqrt(d.all.n || 1) * 30;
  return { assistant: Math.round(base * (1 + h % 7 / 4)), portal: Math.round(base * 0.6 * (1 + (h >> 3) % 5 / 4)), mcp: Math.round(base * 6 * (1 + (h >> 6) % 9 / 5)),
    gold: d.skill ? 48 + (h >> 9) % 40 : null, goldN: d.skill ? 20 + (h >> 12) % 30 : 0, cover: d.by.met.n ? Math.round(pct(d.by.met.good, d.by.met.n) * (0.35 + ((h >> 15) % 40) / 100)) : 0 }; };
// link to a tool; if the tool has no address, an inactive button
const ext = u => u === '#' ? ' data-demo' : ' target="_blank" rel="noopener"';
const plink = (g, c = 'btn') => g.url ? `<a class="${c}" href="${g.url}"${ext(g.url)}>${PRODUCTS[g.p].name}${g.what ? `<small>${g.what}</small>` : '<small>↗</small>'}</a>`
  : `<span class="${c} off" title="${PRODUCTS[g.p].name} address not set">${PRODUCTS[g.p].name}<small>address not set</small></span>`;
const tlink = g => g ? (g.url ? `<a class="tl" href="${g.url}"${ext(g.url)}>${PRODUCTS[g.p].name} ↗</a>` : `<span class="tl off">${PRODUCTS[g.p].name}</span>`) : '';
// links to the 3D world and factory are always game links: game color and icon, like the world and awards
const game = (g, c = 'btn', small = '') => g ? `<a class="btn game${c.includes('sm') ? ' sm' : ''}" href="${g.url}">${IC.game}${g.label}</a>` : '';
// trend: change in healthy share over 4 weeks (pp) and an 8-week sparkline
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WK = 4, dd = s => MON[+s.slice(5, 7) - 1] + ' ' + +s.slice(8, 10);
const dyn = (arr, big) => { const n = arr?.length || 0, a = arr?.[n - 1 - WK], b = arr?.[n - 1]; if (a == null || b == null) return '';
  const p = Math.round((b - a) * 1000) / 10, c = p > 0.05 ? 'up' : p < -0.05 ? 'down' : 'flat', v = Math.abs(p).toFixed(1);
  return `<span class="dyn ${c}${big ? ' big' : ''}" title="Healthy share: ${Math.round(a * 100)}% on ${dd(TREND_DATES[n - 1 - WK])} → ${Math.round(b * 100)}% on ${dd(TREND_DATES[n - 1])}">${c === 'up' ? '↑' : c === 'down' ? '↓' : '→'}${c === 'flat' ? '0' : v} pp</span>`; };
const spark = (arr, w = 72, h = 22) => { const v = (arr || []).filter(x => x != null); if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 0.01, pts = arr.map((x, k) => x == null ? null : `${(k / (arr.length - 1) * (w - 4) + 2).toFixed(1)},${(h - 3 - (x - lo) / r * (h - 6)).toFixed(1)}`).filter(Boolean);
  const [lx, ly] = pts[pts.length - 1].split(',');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${lx}" cy="${ly}" r="2.2" fill="currentColor"/></svg>`; };
const kpiObj = (label, a, tr, unit) => `<div class="kpi"><span><i class="dot ${cls(a.n ? a.good / a.n : null)}"></i>${label}</span><b>${a.n ? pct(a.good, a.n) + '%' : '—'}</b><small class="dl">${dyn(tr) || '&nbsp;'}</small><small>${fmt(a.n)} ${unit}</small></div>`;
const DYN_NOTE = () => `<div class="dnote">Arrows show the change in healthy share over 4 weeks, ${dd(TREND_DATES[TREND_DATES.length - 1 - WK])} to ${dd(TREND_DATES[TREND_DATES.length - 1])}; the line covers 8 weeks. Object set is the current snapshot</div>`;
// headline metric: share of healthy objects, with a bar to the goal
const heroKpi = (a, tr) => { const v = a.n ? a.good / a.n : null, p = v == null ? 0 : Math.round(v * 100);
  return `<div class="kpi hero"><span>${S.health.name}<em>${S.health.sub}</em></span><div class="hv"><b>${v == null ? '—' : p + '%'}${dyn(tr, true)}</b><i class="sp ${cls(v)}t" title="8 weeks">${spark(tr)}</i></div>
    <div class="goal"><i class="${cls(v)}" style="width:${Math.min(100, p / GOAL)}%"></i></div><small>${v == null ? 'no objects' : p >= GOAL * 100 ? `${S.health.goal} of 60% reached` : `${fmt(Math.ceil(a.n * GOAL) - a.good)} objects to the 60% goal`}</small></div>`; };
// headline metric: domain AI readiness from the AI-Ready Domains Score, the 2027 KPI and the median of min(axis 1, axis 2)
const MOCKC = `<span class="mock" title="${MOCK_O}">generated</span>`;
const aiHero = () => { const v = AI_KPI.v, p = v == null ? 0 : Math.round(v * 100), idx = SUBS.filter(d => d.ards?.idx != null).map(d => d.ards.idx).sort((a, b) => a - b), med = idx.length ? idx[idx.length >> 1] : null;
  return `<div class="kpi hero ai"><span>Domain AI readiness</span><div class="hv"><b>${v == null ? '—' : p + '%'}</b><small class="hk">subdomains with a BI partner at L3 or higher · ${AI_KPI.l3} of ${AI_KPI.n}</small></div>
    <div class="goal"><i style="width:${Math.min(100, p / CAMPAIGN.goal)}%;background:var(--ink)"></i></div><small>${CAMPAIGN.year} goal ${Math.round(CAMPAIGN.goal * 100)}% · median score ${med ?? '—'} · result ${MOCKC}</small></div>`; };
// AI-Ready score: for a domain and the company it is computed on pooled objects and counters (scoreArds in model.js), not an average of subdomains
const ardsHero = (A, n) => `<div class="kpi hero sc"><span>AI-Ready score</span><div class="hv"><b>${A?.idx ?? '—'}<span> / 100</span></b><small class="hk">axis 1 readiness ${A?.R.v ?? '—'} · axis 2 result ${A?.O.v ?? '—'}*</small></div>
    <div class="goal"><i style="width:${A?.idx || 0}%;background:var(--ink)"></i></div><small title="score min(axis 1, axis 2) over all objects of ${n} ${plural(n, 'subdomain', 'subdomains')} at once: shares use pooled objects, counters are summed">min(axis 1, axis 2), computed on ${n} pooled ${plural(n, 'subdomain', 'subdomains')} · * ${MOCKC}</small></div>`;
// context and evals are two pillars of AI readiness: 1.4 Domain knowledge and 2.1 Answer quality (golden set)
const compOf = (d, k) => d.ards?.comp.find(c => c.key === k);
const ctxAgg = subs => { let w = 0, v = 0, kn = 0; subs.forEach(d => { const c = compOf(d, 'R5'); const used = [...d.t.dm, ...d.t.met, ...d.t.dash].filter(o => o.pop > 0 && o.chk).length; kn += d.faq + d.gl + d.t2s; if (c?.fact != null) { w += used; v += used * c.fact; } }); return { v: w ? v / w : null, kn }; };
// evals for a domain and the company: share of correct answers across all golden set cases at once, not an average of subdomains
const evAgg = subs => { const xs = subs.filter(d => d.ards), ok = xs.filter(d => d.ards.gs >= 30), gs = ok.reduce((t, d) => t + d.ards.gs, 0); return { v: gs ? ok.reduce((t, d) => t + compOf(d, 'O1').fact * d.ards.gs, 0) / gs : null, ok: ok.length, n: xs.length }; };
const ctxKpi = subs => { const a = ctxAgg(subs); return `<div class="kpi"><span>Context</span><b class="tbdv">${TBD}</b><small>1.4 Domain knowledge · ${fmtK(a.kn)} Knowledge Base entries</small></div>`; };
const evKpi = subs => { const a = evAgg(subs); return `<div class="kpi"><span>Evals</span><b>${p0(a.v)}<span>*</span></b><small>golden set accuracy · ${a.ok} of ${a.n} have one · * generated</small></div>`; };
// metric definitions: shown on hover over the name (data-def)
const ARDS_DEF = Object.fromEntries(ARDS.map(([k, , w, name, target, how, src]) => [k, `${CODE[k]} ${name}: ${how}. Target: ${target == null ? 'subdomain median, lower is better; attainment = min(100%, plan / actual)' : Math.round(target * 100) + '%, attainment = min(100%, actual / target)'}. An axis is the unweighted mean attainment of its components. Source: ${src}.`]));
const DEFS = [
  ['AI-Ready score', 'AI-Ready Domains Score 2027: min(axis 1, axis 2) from 0 to 100. Axis 1 is data and role readiness (1.1–1.4), axis 2 is the result of the AI assistant (2.1–2.4). Domains and the company are scored on pooled objects. 2.1 and 2.2 are generated in this demo.'],
  ['Domain AI readiness', '2027 KPI from the AI-Ready Domains Score: share of subdomains with a BI partner at level L3 or higher (readiness ≥ 70, answer quality 2.1 ≥ 70%, 2.3 self-service analytics with AI ≥ 30%). Goal: 75%.'],
  ['Score min(axis 1, axis 2)', 'Final AI-Ready score of a subdomain: the lower of axis 1 Readiness and axis 2 Result. High readiness without results (or the reverse) does not raise the score.'],
  ['Axis 1 · Readiness', 'AI-Ready axis 1: unweighted mean attainment of 1.1–1.4: trusted data marts, traffic through trusted semantics, trusted dashboards, domain knowledge (logic to be defined). The BI partner and data owner roles are a condition for leaving L0 and are not part of the axis.'],
  ['Axis 2 · Result', 'AI-Ready axis 2: unweighted mean attainment of 2.1–2.4: answer quality on the golden set, question coverage, self-service analytics with AI by non-analysts, infracost per healthy object. 2.1 and 2.2 are generated in this demo, 2.3 comes from the BI Maturity score.'],
  ['AI-Ready points', 'Each day a subdomain earns its AI-Ready score (0–100) / 100 × user-days of that day; a domain gets the sum of its subdomains. Domains are compared on the 30-day total.'],
  ['Context', 'Context for AI is component 1.4 Domain knowledge: logic to be defined, not part of the score yet.'],
  ['Evals', 'Evals are component 2.1 Answer quality: share of correct answers by the AI assistant on the subdomain golden set (30 or more questions from real threads); correctness is set by a judge model plus human spot checks. Values are generated for the demo.'],
  [S.health.name, 'Share of objects (metrics, data marts and dashboards) that pass every health score check.'],
  [S.kind.met, 'Semantic Layer metrics: healthy share by health score (description, owner, usage, live sources, data).'],
  [S.kind.dm, 'Data marts: healthy share by health score (builds in the warehouse, owner, table and column descriptions, business checks, live sources).'],
  [S.kind.dash, 'Dashboards: healthy share by health score (speed, errors, owner, built on datasets, certified datasets, description and README).'],
  ['Issues', 'Popular objects that fail the health score: they are opened most often, so fix them first.'],
  ['CPU', 'CPU hours over 30 days from platform billing: building data marts and metrics.'],
  [S.bp.kpi, 'Subdomains without an assigned BI partner in the Domain Registry.'],
  ['Data marts on time', 'Share of scheduled data marts refreshed on time (freshness_score in the Data Catalog).'],
  ['DQ incidents', 'Open data quality incidents in Data Contracts; severity comes from the incident importance field.'],
  [S.igs.name, 'Good output (insight index) 0–100: 50% share of views on healthy dashboards, 25% share of dashboards that get viewed, 25% health of data marts and metrics. Shows whether healthy data reaches the business.'],
  [S.igs.short, 'Good output (insight index) 0–100: 50% share of views on healthy dashboards, 25% share of dashboards that get viewed, 25% health of data marts and metrics.'],
  ['AI Ready', 'Legacy AI Ready points 0–14 from the BI partner analysis. Not used in the AI-Ready Domains Score, kept for comparison.'],
  ['Infra savings', 'CPU over 30 days that can be saved: switch off data marts without consumers and unused metrics, optimize data marts that are expensive per use.'],
  ['Blast radius', 'How many dashboards read the unhealthy data marts of the subdomain.'],
  ['Trend', 'Change in the share of healthy objects over 8 weeks, from health score snapshots.'],
];
const KEY_OF = Object.fromEntries(Object.entries(CODE).map(([k, c]) => [c, k]));
const defOf = t => { t = t.trim(); const m = /^(\d\.\d)(?!\d)/.exec(t); if (m && KEY_OF[m[1]]) return ARDS_DEF[KEY_OF[m[1]]]; const d = DEFS.find(([k]) => k && t.startsWith(k)); return d ? d[1] : null; };
function applyDefs(root) {
  root.querySelectorAll('.kpi > span, .blk h3, .cn, .rv > span, .dr > span, .tbl.ards td.nm, .sec h2').forEach(el => { const t = el.childNodes[0]?.textContent || el.textContent, d = defOf(el.textContent.startsWith(t) ? el.textContent : t); if (d) el.dataset.def = d; });
}
const defTip = document.createElement('div'); defTip.className = 'deftip'; defTip.hidden = true; document.body.appendChild(defTip);
document.addEventListener('mouseover', e => { const t = e.target.closest('[data-def]'); if (!t) { defTip.hidden = true; return; } defTip.textContent = t.dataset.def; defTip.hidden = false;
  const r = t.getBoundingClientRect(); defTip.style.left = Math.min(r.left, innerWidth - 340) + 'px'; defTip.style.top = (r.bottom + 6 + 120 > innerHeight ? r.top - defTip.offsetHeight - 6 : r.bottom + 6) + 'px'; });
const MINE = SUBS.filter(d => Object.values(d.people).some(p => p.l === ME));
const MOOD = { happy: 'happy', flat: 'thoughtful', sad: 'upset' };
const initials = n => n ? n.split(' ').map(w => w[0]).slice(0, 2).join('') : '';
const staffHtml = d => `<div class="card staff">${ROLES.map(([k, title, sub]) => { const p = d.people[k], on = has(d, k);
  // factory profession as a tag on the right; under the name, registry role and job title
  return `<div class="pp${on ? '' : ' empty'}"><i class="av">${on ? initials(p?.n) || '•' : ''}</i><div><b>${on ? (p?.n || 'Name not found') : 'Vacant'}</b><small>${sub}${k === 'st' && on && d.mood ? `, ${MOOD[d.mood]}` : ''}${p?.p ? ` · ${p.p}` : ''}</small></div><span class="ptag">${title}</span></div>`; }).join('')}</div>`;

// ---------- operations: freshness, monitoring, incidents, levels ----------
const lvl = d => d.level == null ? '' : `<span class="lv l${d.level}" title="maturity level">${LEVEL_NAMES[d.level]}</span>`;
const FRESH_CLS = ['ok', 'warn', 'bad', 'grey'];
const freshChip = o => { const f = freshOf(o); return f == null ? '' : `<span class="st"><i class="dot ${FRESH_CLS[f]}"></i>${FRESH[f]}</span>`; };
const monChip = o => { const m = monOf(o); return m == null ? '' : m ? `<span class="st" title="${o.chk[1][4]} checks in total"><i class="dot ok"></i>${o.chk[1][5]} business</span>` : `<span class="st" title="${o.chk[1][4] ? 'platform NoRows and DuplicateKey only' : 'no checks'}"><i class="dot grey"></i>not monitored</span>`; };
const IMP_CLS = ['', '', 'warn', 'bad'];
const impChip = i => `<span class="chip imp i${i}">${IMP_LABEL[i]}</span>`;
const ST_LABEL = { o: 'open', p: 'in progress', d: 'closed' };
// chat thread links are not part of the demo data
const chatUrl = x => null;
const END = Date.parse(INC_DATE + 'T12:00');
const dur = h => h == null ? '—' : h < 1 ? '< 1 h' : h < 48 ? Math.round(h) + ' h' : Math.round(h / 24) + ' d';
const ageH = x => ((x[4] && x[2] === 'd' ? Date.parse(x[4]) : END) - Date.parse(x[3])) / 36e5;
const freshPct = a => { const n = a.freshN - a.fresh[3]; return n > 0 ? a.fresh[0] / n : null; };
// the first failed check is the reason shown in an issue row
const reason = o => { const f = checks(o).find(c => c[2] === false); if (f) return f[0];
  if ([1, 2].includes(freshOf(o))) return 'late'; if (o.inc.some(isOpen)) return 'open incident';
  return o.chk ? 'other components' : null; };
// downstream consumers: dashboards weigh most, then dependent warehouse objects
const downN = o => o.down ? o.down[1] * 10 + o.down[0] + o.down[2] / 10 : 0;
const downTxt = o => o.down ? [o.down[1] && `${fmt(o.down[1])} dash.`, o.down[0] && `${fmt(o.down[0])} DWH`].filter(Boolean).join(' · ') || '—' : '—';
// change in healthy share over 4 weeks, pp
const delta = tr => { const n = tr?.length || 0, a = tr?.[n - 1 - 4], b = tr?.[n - 1]; return a == null || b == null ? null : (b - a) * 100; };

// ---------- navigation ----------
// navigation header comes from skin.js
$('logo').innerHTML = `<i>${S.logo}</i><div>${S.brand}<small>domain observability</small></div>`;
// line icons for navigation
const ico = d => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = { home: ico('<path d="M2.5 7 8 2.5 13.5 7v6.5h-11z"/><path d="M6.5 13.5v-3.5h3v3.5"/>'), world: ico('<circle cx="8" cy="8" r="5.8"/><path d="M2.2 8h11.6M8 2.2c1.8 1.6 2.6 3.6 2.6 5.8S9.8 12.2 8 13.8C6.2 12.2 5.4 10.2 5.4 8S6.2 3.8 8 2.2"/>'),
  alert: ico('<path d="M8 2.2 14 13H2z"/><path d="M8 6.5v3M8 11.3v.1"/>'), me: ico('<circle cx="8" cy="5.5" r="2.7"/><path d="M2.8 13.6c.7-2.4 2.7-3.7 5.2-3.7s4.5 1.3 5.2 3.7"/>'), mail: ico('<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.5 4.5 5.5 4 5.5-4"/>'),
  onb: ico('<path d="M3 13.5V4.5l5-2.5 5 2.5v9"/><path d="M6 13.5v-4h4v4M3 13.5h10"/>'),
  game: ico('<path d="M4.6 4.5h6.8a3 3 0 0 1 2.9 2.3l.8 3.6a1.6 1.6 0 0 1-2.8 1.3L10.7 10H5.3l-1.6 1.7A1.6 1.6 0 0 1 .9 10.4l.8-3.6a3 3 0 0 1 2.9-2.3z"/><path d="M5 6.4v2M4 7.4h2"/><circle cx="10.6" cy="6.9" r=".5"/><circle cx="11.8" cy="8.1" r=".5"/>') };
// game layer: monthly awards; game color and icon shared with links to the 3D world
const nomsBoard = () => `<div class="sec game"><h2>${IC.game}${S.game.title}</h2><span>awards · ${NOM_MONTH} · <a href="${S.game.home}">${S.game.nav} →</a></span></div>
    <div class="noms">${NOMS.map(n => `<a class="nom" href="#/d/${enc(n.win.name)}"><span>${NOM_IC[n.key] || ''}${n.title}</span><b>${n.win.name}</b><small>${n.why}</small>${n.next ? `<em>runner-up: ${n.next.name}</em>` : ''}</a>`).join('')}
      <a class="nom map" href="${S.game.home}">${S.game.icon}<b>${S.game.ctaTitle}</b><small>${S.game.ctaText}</small></a></div>`;
const NOM_IC = { prod: ico('<path d="M5 2.5h6v3.2a3 3 0 0 1-6 0z"/><path d="M5 3.5H3v1a2 2 0 0 0 2 2M11 3.5h2v1a2 2 0 0 1-2 2M8 8.7v2.3M5.5 13.5h5l-.6-2.5H6.1z"/>'), lift: ico('<path d="M2.5 11.5 6.5 7.5l2.5 2.5 4.5-5"/><path d="M10 5h3.5v3.5"/>'),
  sup: ico('<rect x="1.8" y="5" width="7.5" height="5.5" rx="1"/><path d="M9.3 7h2.6l2.3 2.2v1.3H9.3"/><circle cx="4.5" cy="11.8" r="1.2"/><circle cx="11.6" cy="11.8" r="1.2"/>'), clean: ico('<path d="M8 1.8 13 4v3.6c0 3-2.2 5.3-5 6.6-2.8-1.3-5-3.6-5-6.6V4z"/><path d="m5.7 8 1.6 1.6 3-3.2"/>'), ai: ico('<path d="M8 2v2.2M8 11.8V14M2 8h2.2M11.8 8H14"/><circle cx="8" cy="8" r="3.3"/><path d="M8 6.4v1.8l1.1.8"/>') };
// mockup of the data exchange economy: how the three mechanics could look. Exchange quality and CPU come from demo data,
// reliability, agreements, claims and points are an example until Data Contracts SLAs and a daily snapshot exist
function econOverview() {
  const D = new Map(), get = n => D.get(n) || (D.set(n, { name: n, out: [], cpu: 0, inCpu: 0, cons: new Set() }), D.get(n));
  SUBS.forEach((d, i) => SUBX.out[i].forEach(e => { if (e.sub.l1 === d.l1) return; const A = get(d.l1); A.out.push(...e.list); A.cons.add(e.sub.l1);
    e.list.forEach(x => { const c = (x.o.cost?.[0] || 0) * Math.min(1, x.w / Math.max(1, useOf(x.o))); A.cpu += c; get(e.sub.l1).inCpu += c; }); }));
  const rows = [...D.values()].filter(r => r.out.length).map(r => ({ ...r, q: qOf(r.out), rel: 0.55 + (hash(r.name) % 40) / 100 })).map(r => ({ ...r, rate: Math.round(r.q * r.rel * 100) }));
  const top = [...rows].sort((a, b) => b.rate - a.rate).slice(0, 6), pay = [...rows].sort((a, b) => b.cpu - a.cpu).slice(0, 6), mxc = Math.max(...pay.map(r => r.cpu), 1);
  const deals = DFLOW.slice(0, 6).map(f => { const h = hash(f.a + f.b), sla = 90 + h % 10, brak = 100 - Math.round((rows.find(r => r.name === f.a)?.q ?? 0.5) * 100), claim = brak > 60 ? 'claim open' : brak > 40 ? 'in review' : '—';
    return { ...f, sla, brak, claim, ptsA: Math.round(f.w / 100 * (1 - brak / 100)), ptsB: brak > 40 && claim === '—' ? -Math.round(f.w / 400) : 0 }; });
  const MK = '<span class="mkb">mockup</span>';
  return `<div class="sec game"><h2>${IC.game}Data exchange economy</h2><span>how it could look · order: rating → agreements → transfer price</span></div>
    <div class="econov">
      <div class="card eo"><div class="eoh"><b>1. Supplier rating</b>${MK}</div><small>quality of supplied data × reliability (freshness against SLA, incidents)</small>
        <table class="tbl"><thead><tr><th>Supplier domain</th><th class="num">Quality</th><th class="num">Reliability</th><th class="num">Rating</th></tr></thead><tbody>
        ${top.map((r, k) => `<tr data-d="${enc(r.name)}"><td class="nm">${k + 1}. ${r.name}<small>${r.cons.size} consumer ${plural(r.cons.size, 'domain', 'domains')}</small></td><td class="num">${Math.round(r.q * 100)}%</td><td class="num mkv">${Math.round(r.rel * 100)}%</td><td class="num"><b>${r.rate}</b></td></tr>`).join('')}</tbody></table>
        <p class="eon">Quality comes from portal data; reliability is an example. ${ECON[0].need[1]}.</p></div>
      <div class="card eo"><div class="eoh"><b>2. Supply agreements</b>${MK}</div><small>exchange SLA, defects at the consumer, claims and points for the month</small>
        <table class="tbl"><thead><tr><th>Supplier → consumer</th><th class="num">SLA</th><th class="num">Defects</th><th>Claim</th><th class="num">Points</th></tr></thead><tbody>
        ${deals.map(x => `<tr><td class="nm">${x.a} → ${x.b}<small>${fmtK(x.w)} views</small></td><td class="num mkv">${x.sla}%</td><td class="num ${x.brak > 60 ? 'badt' : x.brak > 40 ? 'warnt' : ''}">${x.brak}%</td><td class="mkv">${x.claim}</td><td class="num mkv">+${fmtK(x.ptsA)}${x.ptsB ? ` / ${fmtK(x.ptsB)}` : ''}</td></tr>`).join('')}</tbody></table>
        <p class="eon">Defects: share of usage on the supplier's unhealthy data marts; SLA, claims and points are an example. Needs: ${ECON[1].need[0]}.</p></div>
      <div class="card eo"><div class="eoh"><b>3. Transfer price</b>${MK}</div><small>supplier CPU spent on other domains' usage, 30 days</small>
        <div class="eobars">${pay.map(r => `<div><span>${r.name}</span><i><b style="width:${r.cpu / mxc * 100}%"></b></i><em>${fmtK(r.cpu)} h</em></div>`).join('')}</div>
        <p class="eon">Estimate: data mart CPU × share of its usage by other domains. A separate infrastructure economy layer, not part of quality points. Needs: ${ECON[2].need[0]}.</p></div>
    </div>`; }
function navHtml(r) {
  const cur = k => (r.page === k ? 'aria-current="page"' : '');
  $('nav').innerHTML = `<a href="#/" ${cur('home')}>${IC.home}Overview</a><a class="gm" href="${S.game.home}">${IC.game}${S.game.nav}<em>3D</em></a><a href="#/hot" ${cur('hot')}>${IC.alert}Issues<em>${fmt(ALL.hot)}</em></a><a href="#/me" ${cur('me')}>${IC.me}${S.me.nav}<em>${MINE.length}</em></a>${MINE.length ? `<a href="#/digest" ${cur('digest')}>${IC.mail}Digest<em>week</em></a>` : ''}<a href="#/onboarding" ${cur('onb')}>${IC.onb}Onboarding</a>`;
  $('navh').innerHTML = `${S.l1.many}<a class="newd" href="#/new" title="Create a domain">+ Create</a>`;
  $('navd').innerHTML = DOMS.filter(u => u.all.n).map(u => `<a href="#/d/${enc(u.name)}" ${(r.dom === u || r.sub?.l1 === u.name) ? 'aria-current="page"' : ''}><span class="dot ${cls(u.share)}"></span>${u.name}<em>${u.subs.length}</em></a>`).join('');
  $('foot').innerHTML = `Health score snapshot ${dd(SNAPSHOT)}, ${SNAPSHOT.slice(0, 4)}${S.spec ? `<br><a href="${S.spec}" target="_blank" rel="noopener">Spec and blocks ↗</a><br><a href="doc.html?f=refs" target="_blank" rel="noopener">Market references ↗</a>` : ''}`;
}
function topHtml(crumbs, modes = '') {
  return `<div class="top"><div class="crumb">${crumbs}</div>${modes}<div class="search"><input id="q" placeholder="${S.searchPh}" autocomplete="off"><div class="res" id="res" hidden></div></div></div>`;
}
function bindSearch() {
  const q = $('q'), res = $('res');
  q.oninput = () => { const s = q.value.trim().toLowerCase(); if (s.length < 2) { res.hidden = true; return; }
    const subs = SUBS.filter(d => (d.l2 + ' ' + d.l1 + ' ' + Object.values(d.people).map(p => p.n).join(' ')).toLowerCase().includes(s)).slice(0, 6);
    const objs = []; for (const d of SUBS) { for (const o of objsOf(d)) { if (o.name.toLowerCase().includes(s)) { objs.push(o); if (objs.length >= 8) break; } } if (objs.length >= 8) break; }
    res.innerHTML = subs.map(d => `<a href="#/s/${d.i}"><span class="dot ${cls(d.share)}"></span><span>${d.l2} <small>${d.l1}</small></span><small>${S.l2.search}</small></a>`).join('') +
      objs.map(o => `<a data-o="${o.sub}:${o.t}:${o.name}"><span class="dot ${sdot(o)}"></span><span>${o.name} <small>${SUBS[o.sub].l2}</small></span><small>${KIND1[o.t]}</small></a>`).join('') || '<a><span></span><small>nothing found</small></a>';
    res.hidden = false;
    res.querySelectorAll('[data-o]').forEach(a => a.onclick = () => { const [i, t, ...n] = a.dataset.o.split(':'); openObj(SUBS[+i].t[t].find(o => o.name === n.join(':'))); res.hidden = true; }); };
  q.onblur = () => setTimeout(() => res.hidden = true, 200);
}

// mix issues by type, otherwise metrics with a low P75 crowd out dashboards
const mixHot = (list, n) => { const by = ['met', 'dm', 'dash'].map(t => list.filter(o => o.t === t)), out = []; for (let i = 0; out.length < n && by.some(a => a[i]); i++) by.forEach(a => a[i] && out.length < n && out.push(a[i])); return out; };
const CPG_P75 = (() => { const a = DOMS.map(u => u.cpg).filter(v => v != null).sort((x, y) => x - y); return a[Math.floor(a.length * 0.75)]; })();

// ---------- company overview ----------
function pageHome() {
  const noBp = SUBS.filter(d => !has(d, 'bp')).length;
  const hot = mixHot(SUBS.flatMap(d => d.hotList).sort((a, b) => b.pop - a.pop), 8);
  return topHtml('<b>Overview</b>') + `<div class="page">
    <div class="hrow"><div class="grow"><h1>${S.brand}</h1><p class="sub">${S.lead}</p></div>
      <a class="btn game" href="${S.game.home}">${IC.game}${S.game.homeBtn}</a></div>
    <div class="kpis">
      ${ardsHero(COMPANY_ARDS, SUBS.filter(d => d.ards?.idx != null).length)}${ctxKpi(SUBS)}${evKpi(SUBS)}
      ${kpiObj(S.kind.met, BY.met, ALL_TREND.met, 'metrics')}${kpiObj(S.kind.dm, BY.dm, ALL_TREND.dm, 'data marts')}${kpiObj(S.kind.dash, BY.dash, ALL_TREND.dash, 'dashboards')}
      <div class="kpi"><span>Issues</span><b>${fmt(ALL.hot)}</b><small>popular, unhealthy</small></div>
      <div class="kpi"><span>CPU, 30 days</span><b>${fmtK(CPU_ALL)} h</b><small>${INFRA_PERIOD}</small></div>
      <div class="kpi"><span>${S.bp.kpi}</span><b>${noBp}</b><small>of ${l2W(SUBS.length)}</small></div>
      <div class="kpi"><span><i class="dot ${cls(freshPct(OPS))}"></i>Data marts on time</span><b>${p0(freshPct(OPS))}</b><small>${fmt(OPS.fresh[1] + OPS.fresh[2])} late, as of ${dd(OPS_DATE)}</small></div>
      <div class="kpi"><span>DQ incidents</span><b>${fmt(OPS.open.length)}</b><small>open, ${OPS.high} high severity; ${p0(OPS.n ? OPS.mon / OPS.n : null)} of data marts monitored</small></div>

    </div>${DYN_NOTE()}
    <div class="grid2b">
      <div><div class="sec"><h2>AI-Ready Domains Score</h2><span><a href="${ARDS_URL}"${ext(ARDS_URL)}>method ↗</a></span></div>${levelDist(SUBS)}</div>
      <div><div class="sec"><h2>Largest declines</h2><span>over 4 weeks</span></div>${worst(SUBS, 6)}</div>
    </div>
    <div class="sec"><h2>Axis 1 · Readiness and axis 2 · Result</h2><span>${S.l2.many.toLowerCase()} · size is data usage over 30 days · result ${MOCK_O}</span></div>
    ${roChart(SUBS)}
    <div class="sec"><h2>${S.l1.many}</h2><span>${DOMS.length} ${S.l1.gen}, ${l2W(SUBS.length)}</span></div>
    <div class="card tw"><table class="tbl"><thead><tr><th>${S.l1.one}</th><th>${S.health.name}</th><th>${S.kind.met}</th><th>${S.kind.dm}</th><th>${S.kind.dash}</th><th class="num">Objects</th><th class="num" title="CPU hours over 30 days; below, per healthy object">CPU, h</th><th class="num">AI-Ready</th></tr></thead><tbody>
      ${DOMS.map(u => `<tr data-d="${enc(u.name)}"><td class="nm">${u.name}<small>${l2W(u.subs.length)}</small></td><td>${hb(u.all)}${dyn(u.trend.all)}</td><td>${hb(u.by.met)}</td><td>${hb(u.by.dm)}</td><td>${hb(u.by.dash)}</td><td class="num">${fmt(u.all.n)}${u.all.hot ? `<small class="s bnt" title="issues">${PROB}${u.all.hot}</small>` : ''}</td><td class="num">${u.cpu ? fmtK(u.cpu) : '—'}${u.cpg != null ? `<small class="s" style="${u.cpg > CPG_P75 ? 'color:var(--bad)' : ''}">${fmtK(u.cpg)} per healthy</small>` : ''}</td><td class="num">${u.aiIdx == null ? '—' : Math.round(u.aiIdx)}<small class="s">score</small></td></tr>`).join('')}
    </tbody></table></div>
    <div class="sec"><h2>Top issues</h2><a href="#/hot" style="font-size:12.5px;color:var(--ink2)">all ${fmt(ALL.hot)}</a></div>
    <div class="card list">${hot.map(o => objItem(o, true)).join('')}</div>
    <div class="gap">An issue is an object more popular than 75% of objects of its type that fails the health score. Fixing these pays off most.</div>
    ${nomsBoard()}
    ${econOverview()}</div>`;
}
// bubble chart R vs O: score = min(axis 1, axis 2), so below the diagonal the result limits it, above it readiness does
// focus is the subdomain being compared: highlighted and labeled, its domain's subdomains brighter, others dimmed
function roChart(list, focus = null) { const pts = list.filter(d => d.ards?.R.v != null && d.ards?.O.v != null && d.all.n);
  if (!pts.length) return ''; const W = 1000, H = 400, L = 46, Rt = 20, T = 14, B = 40, X = v => L + v / 100 * (W - L - Rt), Y = v => H - B - v / 100 * (H - T - B);
  const mx = Math.max(...pts.map(d => d.ud30 || 0), 1), rad = d => 4 + 26 * Math.sqrt((d.ud30 || 0) / mx), col = ['var(--lv0)', 'var(--lv1)', 'var(--lv2)', 'var(--lv3)', 'var(--lv4)'];
  const ticks = [0, 20, 40, 60, 80, 100], placed = [];
  const fo = focus && pts.includes(focus) ? focus : null, op = d => !fo || d === fo ? '' : d.l1 === fo.l1 ? ' style="fill-opacity:.55"' : ' style="fill-opacity:.16"';
  if (fo) { const x = X(fo.ards.R.v), y = Y(fo.ards.O.v) - rad(fo) - 4, w = fo.l2.length * 6.4; placed.push([x - w / 2, y - 12, x + w / 2, y]); }
  const labels = [...pts].sort((a, b) => (b.ud30 || 0) - (a.ud30 || 0)).filter(d => !fo || d.l1 === fo.l1 && d !== fo).slice(0, 14).map(d => { const x = X(d.ards.R.v), y = Y(d.ards.O.v) - rad(d) - 4, w = d.l2.length * 6.4, r = [x - w / 2, y - 12, x + w / 2, y];
    if (placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) return ''; placed.push(r); return `<text x="${x}" y="${y}" class="bl">${d.l2}</text>`; }).join('');
  return `<div class="card rochart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Axis 1 readiness against axis 2 result by subdomain">
    ${ticks.map(t => `<line x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${H - B}" class="g"/><line x1="${L}" x2="${W - Rt}" y1="${Y(t)}" y2="${Y(t)}" class="g"/><text x="${X(t)}" y="${H - B + 16}" class="tk" text-anchor="middle">${t}</text><text x="${L - 8}" y="${Y(t) + 4}" class="tk" text-anchor="end">${t}</text>`).join('')}
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(100)}" y2="${Y(100)}" class="dg"/>
    <text x="${X(96)}" y="${Y(10)}" class="zn" text-anchor="end">axis 2 lags axis 1</text><text x="${X(4)}" y="${Y(92)}" class="zn">axis 1 lags axis 2</text>
    <text x="${(L + W - Rt) / 2}" y="${H - 6}" class="ax" text-anchor="middle">Axis 1 · Readiness →</text><text x="12" y="${(T + H - B) / 2}" class="ax" text-anchor="middle" transform="rotate(-90 12 ${(T + H - B) / 2})">Axis 2 · Result →</text>
    ${[...pts].sort((a, b) => (b.ud30 || 0) - (a.ud30 || 0)).map(d => { const c = `<circle cx="${X(d.ards.R.v)}" cy="${Y(d.ards.O.v)}" r="${rad(d)}" fill="${col[d.level ?? 0]}" class="bb${d === fo ? ' fo' : ''}${fo ? ' nt' : ''}"${op(d)}`;
      // in compare mode a bubble does not open the cabinet, it shows a tooltip
      return fo ? `${c} data-tip="${enc(JSON.stringify([d.l2, d.l1, d.ards.R.v, d.ards.O.v, d.ards.idx, LEVEL_NAMES[d.level ?? 0], fmtK(d.ud30 || 0), d.aiRank || null]))}"/>`
        : `<a href="#/s/${d.i}">${c}><title>${d.l2} (${d.l1}) · axis 1 readiness ${d.ards.R.v}, axis 2 result ${d.ards.O.v}, score ${d.ards.idx} · ${LEVEL_NAMES[d.level ?? 0]} · usage ${fmtK(d.ud30 || 0)}</title></circle></a>`; }).join('')}
    ${labels}${fo ? `<text x="${X(fo.ards.R.v)}" y="${Y(fo.ards.O.v) - rad(fo) - 4}" class="bl fo">${fo.l2} · ${fo.ards.idx}</text>` : ''}</svg>
    ${fo ? '<div class="rotip" hidden></div>' : ''}<div class="rolg">${LEVEL_NAMES.map((n, i) => `<span><i style="background:${col[i]}"></i>${n}</span>`).join('')}<span class="mut">${fo ? `${fo.l2} highlighted, ${fo.l1} subdomains brighter; ` : ''}diagonal: axis 1 = axis 2; the score equals the lower axis</span></div></div>`; }
const p0 = v => v == null ? '—' : Math.round(v * 100) + '%';
// distribution of AI-Ready levels; L2–L4 depend on the result axis, generated for the demo
function levelDist(list) { const live = list.filter(d => d.level != null), c = LEVEL_NAMES.map((_, i) => live.filter(d => d.level === i).length);
  const Rs = live.map(d => d.ards.R.v).filter(v => v != null).sort((a, b) => a - b), med = Rs.length ? Rs[Rs.length >> 1] : null;
  return `<div class="card ldist">${LEVEL_NAMES.map((n, i) => `<div><span class="lv l${Math.min(i, 3)}">${n}</span><div class="track"><i style="width:${pct(c[i], live.length)}%;background:var(--lv${Math.min(i, 3)})"></i></div><b>${c[i]}</b></div>`).join('')}
    <small>Median readiness: ${med ?? '—'}; 1.2 Traffic through trusted semantics is computed from metric usage for now. Levels L2–L4 depend on the result, which is ${MOCK_O}.</small></div>`; }
function worst(list, n) { const r = list.filter(d => d.all.n >= 10).map(d => ({ d, v: delta(d.trend.all) })).filter(x => x.v != null && x.v < -0.05).sort((a, b) => a.v - b.v).slice(0, n);
  return `<div class="card list">${r.map(({ d, v }) => `<a class="it" href="#/s/${d.i}"><span class="dot ${cls(d.share)}"></span><span>${d.l2}<small>${d.l1}</small></span><em style="color:var(--bad)">↓${Math.abs(v).toFixed(1)} pp · ${p0(d.share)}</em></a>`).join('') || '<div class="it"><span></span><span style="color:var(--ink3)">no declines</span></div>'}</div>`; }
const objItem = (o, withSub, agent) => `<div class="it${agent ? ' wag' : ''}" data-o="${o.sub}:${o.t}:${o.name}"><span class="dot ${sdot(o)}"></span><span title="${o.name}">${o.name}<small>${KIND1[o.t]}${withSub ? ', ' + SUBS[o.sub].l2 : ''}</small></span><em>${fmt(o.pop)}</em>${agent ? `<button class="agb" data-agent="${o.sub}:${o.t}:${o.name}">Run agent</button>` : ''}</div>`;

// ---------- all issues ----------
function pageHot(r) {
  const t = r.q.t || 'all', dom = r.q.d || '', mine = r.q.m === '1';
  // issue weight: downstream consumers if lineage is known, otherwise views normalized by type
  const w = o => downN(o) * 1000 + o.pop / (o.t === 'dash' ? 4 : 1);
  const list = SUBS.filter(d => (!dom || d.l1 === dom) && (!mine || MINE.includes(d))).flatMap(d => d.hotList).filter(o => t === 'all' || o.t === t).sort((a, b) => w(b) - w(a));
  return topHtml('<a href="#/">Overview</a> / <b>Issues</b>') + `<div class="page"><div class="hrow"><div class="grow"><h1>Issues</h1><p class="sub">Popular objects that fail the health score. Sorted by downstream consumers first, then by views.</p></div></div>
    <div class="filters">${[['all', 'All'], ['met', 'Metrics'], ['dm', 'Data marts'], ['dash', 'Dashboards']].map(([k, l]) => `<button data-hot="${k}" aria-pressed="${t === k}">${l}</button>`).join('')}
      <button data-mine="${mine ? '' : '1'}" aria-pressed="${mine}">${S.me.nav}</button>
      <select id="hd"><option value="">All ${S.l1.gen}</option>${DOMS.filter(u => u.all.hot).map(u => `<option ${u.name === dom ? 'selected' : ''}>${u.name}</option>`).join('')}</select>
      <span class="cnt">${fmt(list.length)}</span></div>
    <div class="card tw"><table class="tbl fixed"><colgroup><col style="width:34px"><col><col style="width:16%"><col style="width:190px"><col style="width:160px"><col style="width:96px"><col style="width:120px"><col style="width:150px"></colgroup>
      <thead><tr><th></th><th>Object</th><th>${S.l2.one}</th><th>What is wrong</th><th class="num">Affected downstream</th><th class="num">Views</th><th></th><th></th></tr></thead><tbody>
      ${list.slice(0, 200).map(o => { const rs = reason(o), g = rs ? fixLink(o, rs) : TOOL[o.t](o)[0];
        return `<tr data-o="${o.sub}:${o.t}:${o.name}"><td><span class="dot ${sdot(o)}"></span></td><td class="nm" title="${o.name}">${o.name}<small>${KIND1[o.t]}</small></td><td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${SUBS[o.sub].l2}<small class="s">${SUBS[o.sub].l1}</small></td>
        <td class="rs">${rs === 'other components' ? '<span class="st" title="visible checks pass; performance, usage or cost fall short in the health score">other components</span>' : rs ? `<span class="chip no">${rs.toLowerCase()}</span>` : '<span class="st">no data</span>'}</td><td class="num">${o.t === 'dm' ? downTxt(o) : '—'}</td><td class="num">${fmt(o.pop)}</td><td>${tlink(g)}</td><td><button class="agb" data-agent="${o.sub}:${o.t}:${o.name}" title="The fixer agent reviews the object and prepares fixes for review">Run agent</button></td></tr>`; }).join('') || '<tr><td colspan="8" style="color:var(--ink3)">no issues</td></tr>'}
    </tbody></table></div>${list.length > 200 ? `<div class="gap">Showing the first 200 of ${fmt(list.length)}</div>` : ''}
    <div class="gap">Affected downstream for data marts: dashboards that read the data mart through queries and datasets, and dependent warehouse objects. Consumers of metrics and dashboards are not counted yet.</div></div>`;
}
// governance icons: crown is certification, check mark is health, arrows are data mart freshness
const GI = { crown: '<path d="M2.5 5.5 5 8l3-4.5L11 8l2.5-2.5-1 6.5h-9z"/>', ok: '<circle cx="8" cy="8" r="5.5"/><path d="m5.6 8.1 1.7 1.7 3.2-3.4"/>', warn: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.4M8 10.8v.1"/>', sync: '<path d="M12.8 6.5A5 5 0 0 0 3.6 5.2M3.2 9.5a5 5 0 0 0 9.2 1.3"/><path d="M3.4 2.8v2.6H6M12.6 13.2v-2.6H10"/>' };
const gIco = (k, sz = 14) => `<svg width="${sz}" height="${sz}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${GI[k]}</svg>`;
// object certification (crown): in the demo it toggles in page memory; in production it would be a request written to the Data Catalog
// short headers for check columns by check key; the full name is in the tooltip
const CC_SHORT = { dscert: 'Cert. datasets', docs: 'README', engine: 'Engine', owner: 'Owner', cols: 'Columns', upstream: 'Sources', dataset: 'Datasets', usage: 'Usage', chk: 'Column checks', chkok: 'No failures', cpu: 'CPU', size: 'Size', ttl: 'TTL', bp: 'BI partner' };
const isCertO = o => o.s === 1 || o.s === 3, CERT_LOG = [];
const certBtn = (o, short = false) => { const on = isCertO(o); return `<button class="crownb${on ? ' on' : ''}" data-cert="${o.sub}:${o.t}:${o.name}" title="${on ? 'remove certification' : 'certify'}">${gIco('crown', 14)}${short ? '' : `<span>${on ? 'Certified' : 'Certify'}</span>`}</button>`; };
// compare bubble chart tooltip: positioned at the cursor inside the card
document.addEventListener('mousemove', e => { const c = e.target.closest?.('.rochart [data-tip]'), card = e.target.closest?.('.rochart'), tip = card?.querySelector('.rotip');
  document.querySelectorAll('.rotip').forEach(t => { if (t !== tip || !c) t.hidden = true; });
  if (!c || !tip) return; const [l2, l1, r, o, idx, lv, use, rk] = JSON.parse(decodeURIComponent(c.dataset.tip)), b = card.getBoundingClientRect();
  tip.innerHTML = `<b>${l2}</b><small>${l1} · ${lv}${rk ? ` · rank ${rk} of ${AI_RANKED}` : ''}</small><div><span>Score</span><em>${idx}</em><span>Axis 1 · Readiness</span><em>${r}</em><span>Axis 2 · Result</span><em>${o}</em><span>Usage, 30 days</span><em>${use}</em></div>`;
  tip.hidden = false; const x = e.clientX - b.left + 14, y = e.clientY - b.top + 14; tip.style.left = Math.min(x, b.width - tip.offsetWidth - 8) + 'px'; tip.style.top = Math.min(y, b.height - tip.offsetHeight - 8) + 'px'; });
// demo links to tools that do not exist in the open version: stay on the page
document.addEventListener('click', e => { if (e.target.closest('a[data-demo]')) e.preventDefault(); }, true);
// in-page jump without changing the route: href="#id" would break the hash router
document.addEventListener('click', e => { const j = e.target.closest('[data-jump]'); if (!j) return; e.preventDefault(); document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, true);
document.addEventListener('click', e => { const b = e.target.closest('[data-cert]'); if (!b) return; e.stopPropagation(); e.preventDefault();
  const [i, t, ...n] = b.dataset.cert.split(':'), o = SUBS[+i].t[t].find(x => x.name === n.join(':')); if (!o) return;
  o.s ^= 1; CERT_LOG.unshift({ o, on: isCertO(o), at: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
  const reopen = drawer.classList.contains('open') && $('dh').querySelector('h2')?.textContent === o.name; route(); if (reopen) openObj(o); }, true);
const gov = o => { const cert = o.s & 1, ok = o.s >= 2, f = freshOf(o);
  return `<span style="display:inline-flex;gap:6px;align-items:center" title="${st(o)}"><button class="gv gvb${cert ? ' key' : ''}" data-cert="${o.sub}:${o.t}:${o.name}" title="${cert ? 'certified, click to remove' : 'not certified, click to certify'}">${gIco('crown')}</button><i class="gv ${ok ? 'ok' : 'warn'}" title="${ok ? 'healthy' : 'unhealthy'}">${gIco(ok ? 'ok' : 'warn')}</i>${f == null || f === 3 ? '' : `<span class="gvt ${f ? (f === 1 ? 'warn' : 'bad') : ''}">${gIco('sync', 12)}${FRESH[f]}</span>`}</span>`; };
function objTable(list, withSub) {
  return `<div class="card tw"><table class="tbl fixed"><colgroup><col style="width:34px"><col>${withSub ? '<col style="width:22%">' : ''}<col style="width:190px"><col style="width:110px"></colgroup><thead><tr><th></th><th>Object</th>${withSub ? `<th>${S.l2.one}</th>` : ''}<th>Governance</th><th class="num">Views</th></tr></thead><tbody>
    ${list.map(o => `<tr data-o="${o.sub}:${o.t}:${o.name}"><td><span class="dot ${sdot(o)}"></span></td><td class="nm" title="${o.name}">${o.name}<small>${KIND1[o.t]}${isHot(o) ? ', issue' : ''}</small></td>${withSub ? `<td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${SUBS[o.sub].l2}<small class="s">${SUBS[o.sub].l1}</small></td>` : ''}<td>${gov(o)}</td><td class="num">${fmt(o.pop)}</td></tr>`).join('') || '<tr><td colspan="5" style="color:var(--ink3)">no objects</td></tr>'}
  </tbody></table></div>`;
}

// ---------- my objects ----------
function pageMe() {
  const role = d => ROLES.filter(([k]) => d.people[k]?.l === ME).map(([, t]) => t.toLowerCase()).join(', ');
  return topHtml(`<a href="#/">Overview</a> / <b>${S.me.title}</b>`) + `<div class="page"><div class="hrow"><div class="grow"><h1>${S.me.title}</h1><p class="sub">${S.l2.many} where the Domain Registry lists you as ${S.roleList}.</p></div>${MINE.length ? '<a class="btn" href="#/digest">Weekly digest<small>preview</small></a>' : ''}</div>
    ${MINE.length ? `<div class="card tw" style="margin-bottom:16px"><table class="tbl"><thead><tr><th>${S.l2.one}</th><th>Role</th><th>${S.health.name}</th><th>Level</th><th class="num">Issues</th><th class="num">Late</th><th class="num">Incidents</th><th>Top action</th></tr></thead><tbody>
      ${MINE.map(d => `<tr onclick="location.hash='#/s/${d.i}'"><td class="nm">${d.l2}<small>${d.l1}</small></td><td>${role(d)}</td><td>${hb(d.all)}${dyn(d.trend.all)}</td><td>${lvl(d)}</td><td class="num">${d.all.hot}</td><td class="num">${d.fresh[1] + d.fresh[2]}</td><td class="num">${d.incOpen.length}</td><td>${mainAction(d)?.[0] || '—'}</td></tr>`).join('')}</tbody></table></div>
    <div class="gcards">${MINE.map(d => subCard(d, role(d))).join('')}</div>` : `<div class="gap">${S.me.empty}</div>`}</div>`;
}
// top action of the week: open high-severity incidents → next-level rule → issues
function actions(d) {
  const A = [], hi = d.incOpen.filter(r => r.x[1] >= 2), T = tasks(d);
  if (hi.length) A.push([`Assign triage of ${hi.length} high-severity ${plural(hi.length, 'incident', 'incidents')}`, `${hi[0].o.name}${hi.length > 1 ? ' and others' : ''}`, 0]);
  d.next.filter(r => !r.wip).forEach(r => A.push([`For ${LEVEL_NAMES[d.level + 1]}: ${r.name[0].toLowerCase() + r.name.slice(1)}`, `now ${r.now}`, 0]));
  T.filter(t => !/incident/i.test(t[0])).forEach(t => A.push([t[0], t[1], t[2]]));
  return A; }
const mainAction = d => actions(d)[0];
function pageDigest() {
  const list = MINE.length ? MINE : [];
  return topHtml(`<a href="#/">Overview</a> / <a href="#/me">${S.me.title}</a> / <b>Digest</b>`) + `<div class="page"><div class="hrow"><div class="grow"><h1>Weekly digest</h1><p class="sub">How the Monday message in Chat will look. This is a preview: the portal sends nothing. Rule: no more than three actions, only status changes and the week's results.</p></div></div>
    <div class="card mmsg"><div class="mmh"><i>${S.logo}</i><div><b>${S.brand}</b> <span>Monday, 10:00 AM</span><div>Your ${S.l2.many.toLowerCase()} for the week to ${dd(OPS_DATE)}</div></div></div>
      <table class="tbl"><thead><tr><th>${S.l2.one}</th><th>${S.health.name}</th><th>Level</th><th>Top action</th></tr></thead><tbody>
      ${list.map(d => `<tr><td class="nm">${d.l2}<small>${d.l1}</small></td><td>${p0(d.share)} ${dyn(d.trend.all)}</td><td>${lvl(d)}</td><td>${mainAction(d)?.[0] || 'all good'}</td></tr>`).join('') || '<tr><td colspan="4">no subdomains</td></tr>'}</tbody></table>
      <div class="mmt"><b>What to do this week</b><ol>${list.flatMap(d => actions(d).slice(0, 2).map(a => ({ d, a }))).sort((x, y) => y.a[2] - x.a[2]).slice(0, 3).map(({ d, a }) => `<li>${d.l2}: ${a[0]}<small>${a[1]}${a[2] ? `, AI-Ready score +${a[2]}` : ''}</small></li>`).join('')}</ol></div>
      <div class="acts2" style="grid-template-columns:repeat(2,max-content)"><a class="btn primary" href="#/me">Open ${S.me.title.toLowerCase()}</a><span class="btn off">Set up notifications<small>after chat digests launch</small></span></div></div></div>`;
}

// ---------- L1 cabinet ----------
// domain cabinet: same tabs and overview as a subdomain; data treats the domain as one unit (DOMV in model.js), all subdomain objects together
const DTABS = [['', 'Overview'], ['ards', 'AI-Ready Score'], ['ai', S.kind.ai], ['met', S.kind.met], ['gl', 'Glossary'], ['dm', S.kind.dm], ['dash', S.kind.dash], ['ops', S.opsTab || 'Reliability'], ['infra', 'Infracost']];
// subdomains by maturity: level, then AI-Ready score
const byMaturity = (a, b) => (b.level ?? -1) - (a.level ?? -1) || (b.ards?.idx ?? -1) - (a.ards?.idx ?? -1);
function pageDom(u, tab = '', r = {}) {
  const D = u.view, g = S.game.l1(u), base = `#/d/${enc(u.name)}`;
  const counts = { met: D.by.met.n, dm: D.by.dm.n, dash: D.by.dash.n, ops: D.incOpen.length || null }, cntTxt = { infra: u.cpu ? fmtK(u.cpu) + ' h' : null };
  const head = `<div class="hrow"><div class="grow"><h1>${u.name}</h1>
      <div class="chips"><span class="chip">${l2W(u.subs.length)}</span><span class="chip">${S.health.name.toLowerCase()} ${D.share == null ? '—' : pct(D.all.good, D.all.n) + '%'}${D.share == null ? '' : dyn(D.trend.all)}</span><span class="chip">CPU ${u.cpu ? fmtK(u.cpu) + ' h / 30 days' : 'no data'}</span><span class="chip${u.subs.some(d => !has(d, 'bp')) ? ' no' : ''}">${u.subs.filter(d => has(d, 'bp')).length} of ${u.subs.length} ${S.bp.with}</span></div></div></div>
    <div class="tabs">${DTABS.map(([k, l]) => `<a href="${base}${k ? '/' + k : ''}" ${tab === k ? 'aria-current="page"' : ''}>${l}${cntTxt[k] ? `<em>${cntTxt[k]}</em>` : counts[k] != null ? `<em>${fmt(counts[k])}</em>` : ''}</a>`).join('')}</div>`;
  let body;
  if (!tab) body = subOverview(D, `<div class="ovsec"><h2>${S.l2.many}</h2><span>by maturity: level, then AI-Ready score</span></div><div class="gcards">${[...u.subs].sort(byMaturity).map(d => subCard(d)).join('')}</div>`);
  else if (tab === 'ards') body = subArds(D);
  else if (tab === 'ai') body = subAI(D);
  else if (tab === 'ops') body = subOps(D);
  else if (tab === 'infra') body = domInfra(u);
  else if (tab === 'gl') body = subGloss(D, r);
  else body = subObjects(D, tab, r);
  const crumbs = `<a href="#/">Overview</a> / ${tab ? `<a href="${base}">${u.name}</a> / <b>${(DTABS.find(([k]) => k === tab) || [, tab])[1]}</b>` : `<b>${u.name}</b>`}`;
  // subdomain renderers link to #/s/<i>/…; for a domain they point to #/d/<name>/…
  return (topHtml(crumbs, `<div class="mode"><a aria-pressed="true">Cabinet</a>${g ? `<a href="${g.url}" aria-pressed="false">${g.label}</a>` : ''}</div>`) + `<div class="page">${head}${body}</div>`).replace(new RegExp(`#/s/${D.i}(?=[/"?])`, 'g'), base);
}
// subdomain card: AI-Ready score, level and both axes; data owner and BI partner
const axBar = (name, v) => `<div class="axb"><span>${name}</span><i><b style="width:${v ?? 0}%"></b></i><em>${v ?? '—'}</em></div>`;
const subCard = (d, note) => `<div class="card subc"><h3><span class="dot ${cls(d.share)}"></span>${d.l2}${lvl(d)}${d.all.hot ? `<span style="margin-left:auto">${prob(d.all.hot)}</span>` : ''}</h3>
  ${note ? `<div style="font-size:12px;color:var(--ink2);margin-top:-6px">${d.l1}, you are ${note}</div>` : ''}
  ${d.all.n ? `<div class="scx"><div class="sci"><b>${d.ards?.idx ?? '—'}</b><span>AI-Ready</span>${d.aiRank ? `<small>rank ${d.aiRank} of ${AI_RANKED}</small>` : ''}</div><div class="axs">${axBar('Axis 1 · Readiness', d.ards?.R.v)}${axBar('Axis 2 · Result', d.ards?.O.v)}</div></div>` : `<div style="font-size:12.5px;color:var(--ink2)">${S.l2.none}</div>`}
  <div class="dir"><i class="av">${initials(d.people.st?.n)}</i><span>${who(d, 'st') || `<span style="color:var(--bad)">${S.st.none}</span>`}<small>${S.st.one}${d.mood && has(d, 'st') ? ', ' + MOOD[d.mood] : ''}</small></span></div>
  <div class="dir"><i class="av av2">${initials(d.people.bp?.n)}</i><span>${has(d, 'bp') ? (d.people.bp?.n || 'name not found') : `<span style="color:var(--bad)">${S.bp.none}</span>`}<small>${S.bp.one}</small></span></div>
  <div class="acts"><a class="btn primary" href="#/s/${d.i}">Cabinet</a>${d.all.n ? game(S.game.l2(d)) : ''}</div></div>`;

// ---------- L2 cabinet ----------
const TABS = [['', 'Overview'], ['ards', 'AI-Ready Score'], ['ai', S.kind.ai], ['met', S.kind.met], ['gl', 'Glossary'], ['dm', S.kind.dm], ['dash', S.kind.dash], ['ops', S.opsTab || 'Reliability'], ['infra', 'Infracost']];
function pageSub(d, tab, r) {
  const g2 = S.game.l2(d), gm = S.game.l2Map?.(d), gt = S.game.l2Tab(d, tab);
  const modes = `<div class="mode"><a href="#/s/${d.i}" aria-pressed="true">Cabinet</a>${d.all.n ? `<a class="gm" href="${g2.url}" aria-pressed="false">${g2.label}</a>` : ''}${gm ? `<a class="gm" href="${gm.url}" aria-pressed="false">${gm.label}</a>` : ''}${d.all.n ? `<a href="graph.html?d=${d.i}" aria-pressed="false">Links</a>` : ''}</div>`;
  const crumbs = `<a href="#/">Overview</a> / <a href="#/d/${enc(d.l1)}">${d.l1}</a> / <b>${d.l2}</b>`;
  const counts = { met: d.by.met.n, dm: d.by.dm.n, dash: d.by.dash.n, ops: d.incOpen.length || null }, cntTxt = { infra: d.cpu ? fmtK(d.cpu) + ' h' : null, gl: (() => { const G = glossOf(d); return G.terms.length ? `${G.ok}${G.queue ? ' +' + G.queue : ''}` : null; })() };
  const A = d.ards, aiN = A?.idx;
  const head = `<div class="hrow"><div class="grow"><h1>${d.l2}</h1>
      <div class="chips"><span class="chip">${S.health.name.toLowerCase()} ${d.share == null ? '—' : pct(d.all.good, d.all.n) + '%'}${d.share == null ? '' : dyn(d.trend.all)}</span><span class="chip">CPU ${d.cpu ? fmtK(d.cpu) + ' h / 30 days' : 'no data'}</span>${d.store ? `<span class="chip">storage ${fmtStore(d.store)}</span>` : ''}${has(d, 'bp') ? `<span class="chip">${S.bp.one} ${d.people.bp?.n || 'assigned'}</span>` : `<span class="chip no">${S.bp.none}</span>`}</div></div>
      ${d.all.n || d.faq + d.gl + d.t2s ? game(gt, 'btn primary', 'game') : ''}</div>
    <div class="tabs">${TABS.map(([k, l]) => `<a href="#/s/${d.i}${k ? '/' + k : ''}" ${tab === k ? 'aria-current="page"' : ''}>${l}${cntTxt[k] ? `<em>${cntTxt[k]}</em>` : counts[k] != null ? `<em>${fmt(counts[k])}</em>` : ''}</a>`).join('')}</div>`;
  let body = '';
  if (!tab) body = subOverview(d);
  else if (tab === 'ards') body = subArds(d);
  else if (tab === 'ai') body = subAI(d);
  else if (tab === 'ops') body = subOps(d);
  else if (tab === 'infra') body = subInfra(d);
  else if (tab === 'gl') body = subGloss(d, r);
  else body = subObjects(d, tab, r);
  return { html: topHtml(crumbs, modes) + `<div class="page">${head}${body}</div>` };
}
// subdomain Infracost tab: CPU and disk over 30 days, the most expensive objects, where to save
function subInfra(d) { const u = DOMS.find(x => x.name === d.l1), v = savings(d), h = n => n >= 10 ? fmtK(n) : String(Math.round(n * 10) / 10);
  const top = t => d.t[t].filter(o => o.cost).sort((a, b) => b.cost[0] - a.cost[0]).slice(0, 12), gb = d.t.dm.filter(o => o.cost).reduce((t, o) => t + (o.cost[1] || 0), 0);
  const tbl = (t, title) => { const L = top(t); return L.length ? `<div><div class="sec"><h2>${title}</h2><span>CPU over 30 days</span></div><div class="card tw"><table class="tbl"><thead><tr><th>Object</th><th class="num">CPU</th><th class="num">Disk</th><th class="num">Usage</th><th class="num">CPU per view</th></tr></thead><tbody>
    ${L.map(o => `<tr data-o="${o.sub}:${o.t}:${o.name}"><td class="nm"><span class="dot ${sdot(o)}"></span> ${o.name}</td><td class="num">${h(o.cost[0])} h</td><td class="num">${o.cost[1] >= 1 ? fmt(o.cost[1]) + ' GB' : '—'}</td><td class="num">${fmt(useOf(o))}</td><td class="num">${h(o.cost[0] / Math.max(1, useOf(o)))}</td></tr>`).join('')}</tbody></table></div></div>` : ''; };
  return `<div class="kpis">
      <div class="kpi hero"><span>CPU, 30 days</span><b>${d.cpu ? fmtK(d.cpu) + ' h' : '—'}</b><small>${u?.cpu ? Math.round(d.cpu / u.cpu * 100) + '% of ' + d.l1 + ' domain CPU' : ''} · ${INFRA_PERIOD}</small></div>
      <div class="kpi"><span>Disk</span><b>${fmtStore(d.tb)}</b><small>data marts ${gb >= 1 ? fmt(gb) + ' GB' : '—'}</small></div>
      <div class="kpi"><span>CPU per healthy object</span><b>${d.all.good && d.cpu ? fmtK(d.cpu / d.all.good) + ' h' : '—'}</b><small>${d.all.good} healthy of ${d.all.n}</small></div>
      <div class="kpi"><span>Possible savings</span><b class="okt">${v.total ? 'up to ' + h(v.total) + ' h' : '—'}</b><small>${d.cpu && v.total ? Math.round(v.total / d.cpu * 100) + '% of CPU, estimate' : 'no findings'}</small></div>
      <div class="kpi"><span>Data marts · metrics</span><b>${h(v.cpuDm)} · ${h(v.cpuMet)}</b><small>CPU hours by type</small></div>
    </div>
    ${savCard(d)}
    ${tbl('dm', 'Most expensive data marts')}${tbl('met', 'Most expensive metrics')}
    <div class="gap">Source: platform billing, ${INFRA_PERIOD}. Cost versus value for each data mart is in the <a href="graph.html?d=${d.i}&l=infra">Links view</a>.</div>`; }
// ---------- Glossary as a knowledge graph (D10, MVP on example data) ----------
// terms → relations between them (broader / related) → metrics and data marts with columns → Wiki pages; design in docs/glossary-kg-design.md
// terms are an example: derived from frequent words in subdomain object names; statuses, definitions, quotes and columns are generated
const GL_STOP = new Set('legacy prod test view table datamart mart dds core the and for with from data stats stat daily report reports dashboard metric metrics count share total cnt sum avg new old all last first day week month hist mrt ap ab'.split(' '));
const GL_ST = { ok: ['confirmed', '●'], cand: ['candidate from Wiki', '◌'], conflict: ['conflicting definitions', '!'], stale: ['stale: source changed', '⟳'] };
const glCache = new Map();
// display names for terms: word from object names → business term; words without an entry are shown as is
const GL_LABEL = Object.fromEntries('auto:Auto|seller:Seller|buyer:Buyer|deal:Deal|item:Item|user:User|contact:Contact|paid:Paid contact|dealer:Dealer|journal:Journal|media:Media|revenue:Revenue|payment:Payment|order:Order|delivery:Delivery|listing:Listing|search:Search|view:View|click:Click|lead:Lead|call:Call|chat:Chat|messenger:Messenger|message:Message|vacancy:Vacancy|resume:Resume|price:Price|category:Category|region:Region|location:Location|city:City|segment:Segment|subscription:Subscription|tariff:Plan|promo:Promotion|promotion:Promotion|conversion:Conversion|retention:Retention|active:Activity|confirmed:Confirmation|answered:Reply|review:Review|rating:Rating|fraud:Fraud|moderation:Moderation|profile:Profile|account:Account|balance:Balance|wallet:Wallet|bonus:Bonus|discount:Discount|trigger:Trigger|traffic:Traffic|stream:Event stream|event:Event|session:Session|visit:Visit|vistis:Visit|impression:Impression|installment:Installment|credit:Credit|insurance:Insurance|realty:Real estate|rent:Rent|apartment:Apartment|service:Service|good:Product|goods:Goods|car:Car|cars:Cars|truck:Truck|machinery:Machinery|part:Part|market:Market|auction:Auction|appraisal:Vehicle appraisal|dictionary:Reference list|marketplace:Marketplace|logistic:Logistics|logistics:Logistics|warehouse:Warehouse|courier:Courier|refund:Refund|cart:Cart|checkout:Checkout|safe:Safe deal|booking:Booking|travel:Travel|hotel:Hotel|support:Support|ticket:Ticket|agent:Agent|efficiency:Efficiency|quality:Quality|used:Used|vin:VIN|crm:CRM|feature:Feature|model:Model|forecast:Forecast|budget:Budget|cost:Cost|spend:Spend|income:Income|margin:Margin|commission:Commission|fee:Fee|reputation:Reputation|identification:Identification|verification:Verification|passport:ID document|phone:Phone|email:Email|notification:Notification|push:Push|banner:Banner|advert:Advertising|adv:Advertising|campaign:Campaign|experiment:Experiment|test:Test|audience:Audience|cohort:Cohort|funnel:Funnel|transaction:Transaction|purchase:Purchase|sale:Sale|offer:Offer|response:Response|applicant:Applicant|employer:Employer|company:Company|shop:Shop|store:Store|stock:Stock|catalog:Catalog|brand:Brand|parameter:Parameter|params:Parameters|attribute:Attribute|value:Value|trx:Transaction revenue|private:Private sellers|business:Business|pro:Professionals|lot:Lot|bid:Bid|bids:Bids|report:Report|daily:Daily|status:Status|moderator:Moderator|complaint:Complaint|block:Block|ban:Ban|spam:Spam|bot:Bot|clickstream:Clickstream|microcategory:Microcategory|microcategories:Microcategories|vertical:Vertical|platform:Platform|metric:Metric|send:Send|target:Target|unique:Unique users|select:Sample|loan:Loan|rental:Rental|inspection:Inspection|amount:Amount|form:Form|buyout:Buyout|answer:Answer|answers:Answers|application:Application|request:Request|owner:Owner|garage:Garage|mileage:Mileage|generation:Generation|body:Body type|engine:Engine|query:Query|queries:Queries|goal:Goal|share:Share'.split('|').map(x => x.split(':')));
const glSing = w => GL_LABEL[w] ? w : w.endsWith('ies') && GL_LABEL[w.slice(0, -3) + 'y'] ? w.slice(0, -3) + 'y' : w.endsWith('es') && GL_LABEL[w.slice(0, -2)] ? w.slice(0, -2) : w.endsWith('s') && GL_LABEL[w.slice(0, -1)] ? w.slice(0, -1) : w;
function glossOf(d) { if (glCache.has(d)) return glCache.get(d);
  const objs = [...d.t.met, ...d.t.dm], tok = o => [...new Set(o.name.toLowerCase().replace(/^[a-z]+\./, '').split(/[^a-z0-9]+/).filter(w => (w.length >= 4 || GL_LABEL[w]) && !GL_STOP.has(w) && !/^\d+$/.test(w)).map(glSing))];
  const freq = new Map(); objs.forEach(o => tok(o).forEach(w => freq.set(w, (freq.get(w) || 0) + 1)));
  // first words with a dictionary entry, then the rest, up to 18 terms
  const cand = [...freq].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]), words = (() => { const known = cand.filter(([w]) => GL_LABEL[w]).slice(0, 16); return [...known, ...cand.filter(([w]) => !GL_LABEL[w]).slice(0, known.length >= 10 ? 1 : 3)].slice(0, 18); })().map(([w]) => w);
  const terms = words.map((w, k) => { const h = hash(d.l2 + w), r = h % 100, status = k < 3 ? 'ok' : r < 58 ? 'ok' : r < 82 ? 'cand' : r < 90 ? 'stale' : 'conflict';
    const met = d.t.met.filter(o => tok(o).includes(w)).sort((a, b) => b.pop - a.pop), dm = d.t.dm.filter(o => tok(o).includes(w)).sort((a, b) => b.pop - a.pop);
    const name = GL_LABEL[w] || w[0].toUpperCase() + w.slice(1), use = [...met, ...dm].reduce((t, o) => t + (o.pop || 0), 0);
    return { id: w, name, status, key: k < 4, conf: status === 'cand' ? (0.55 + (h % 40) / 100) : null, met, dm, use,
      syn: GL_LABEL[w] && GL_LABEL[w].toLowerCase() !== w ? [`in data: ${w}`] : [],
      def: `${name} is a ${d.l2} concept used in ${met.length} ${met.length === 1 ? 'metric' : 'metrics'} and ${dm.length} ${dm.length === 1 ? 'data mart' : 'data marts'}. The definition and an example will be extracted from the Wiki and confirmed by the BI partner.`,
      docs: [{ t: `${d.l2} dictionary`, sec: 'section ' + (1 + h % 4), date: `${MON[h % 9]} ${1 + h % 28}, 2026` }, ...(h % 2 ? [{ t: `Method: ${name}`, sec: 'definitions', date: `${MON[(h >>> 4) % 9]} ${1 + (h >>> 3) % 28}, 2025` }] : [])],
      cols: dm.slice(0, 3).map(o => `${o.name}.${w}_id`) }; });
  // term relations: broader if one word contains the other, related if the words often appear in the same names
  terms.forEach(T => { T.rel = []; T.broader = null; });
  terms.forEach(A => terms.forEach(B => { if (A === B) return; if (B.id.includes(A.id) && B.id !== A.id) B.broader = A;
    const co = objs.filter(o => { const t = tok(o); return t.includes(A.id) && t.includes(B.id); }).length; if (co >= 2 && !A.rel.includes(B)) A.rel.push(B); }));
  terms.forEach(T => T.rel = T.rel.sort((a, b) => b.use - a.use).slice(0, 4));
  const used = new Set(terms.filter(t => t.status === 'ok').flatMap(t => [...t.met, ...t.dm])), usedObjs = objs.filter(o => o.pop > 0);
  const cov = usedObjs.length ? usedObjs.filter(o => used.has(o)).reduce((t, o) => t + o.pop, 0) / usedObjs.reduce((t, o) => t + o.pop, 0) : null;
  const G = { terms, ok: terms.filter(t => t.status === 'ok').length, queue: terms.filter(t => t.status !== 'ok').length, cov };
  glCache.set(d, G); return G; }
function glGraph(d, T) { const W = 640, H = 460, nodes = [], edges = [], at = (x, y) => [x, y];
  const C = at(330, H / 2); nodes.push({ k: 'term', T, x: C[0], y: C[1], main: true });
  const ring = (list, cx, y0, y1) => list.map((v, i) => [cx, list.length < 2 ? (y0 + y1) / 2 : y0 + (y1 - y0) * i / (list.length - 1)]);
  const docs = T.docs, rel = [...new Set([...(T.broader ? [T.broader] : []), ...T.rel])].slice(0, 4), met = T.met.slice(0, 6), dm = T.dm.slice(0, 4);
  ring(docs, 80, 170, 290).forEach(([x, y], i) => { nodes.push({ k: 'doc', v: docs[i], x, y }); edges.push([x, y, C[0], C[1], 'doc']); });
  rel.forEach((R, i) => { const x = 330 + (i % 2 ? 40 : -40), y = i < 2 ? 60 + i * 48 : H - 60 - (i - 2) * 48; nodes.push({ k: 'term', T: R, x, y, br: R === T.broader }); edges.push([x, y, C[0], C[1], R === T.broader ? 'broader' : 'rel']); });
  ring(met, 470, 70, 250).forEach(([x, y], i) => { nodes.push({ k: 'met', o: met[i], x, y }); edges.push([C[0], C[1], x, y, 'obj']); });
  ring(dm, 470, 310, 420).forEach(([x, y], i) => { nodes.push({ k: 'dm', o: dm[i], x, y }); edges.push([C[0], C[1], x, y, 'obj']);
    if (i < 2) { const cx = x + 110, cy = y; nodes.push({ k: 'col', v: `${T.id}_id`, x: cx, y: cy }); edges.push([x + 8, y, cx - 6, cy, 'col']); } });
  const hc = o => o.s >= 2 ? 'var(--ok)' : o.s === 1 ? 'var(--warn)' : 'var(--bad)', short = (t, n = 22) => t.length > n ? t.slice(0, n - 1) + '…' : t;
  const tcol = st => ({ ok: 'var(--accent)', cand: 'var(--grey)', stale: 'var(--warn)', conflict: 'var(--bad)' })[st];
  return `<svg class="glg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Term graph: ${T.name}">
    ${edges.map(([x1, y1, x2, y2, k]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ge ${k}"/>`).join('')}
    ${nodes.map(n => n.k === 'term' ? `<a href="#/s/${d.i}/gl?t=${n.T.id}"><g class="gn t ${n.T.status}${n.main ? ' main' : ''}"><rect x="${n.x - (n.main ? 70 : 52)}" y="${n.y - (n.main ? 17 : 13)}" width="${n.main ? 140 : 104}" height="${n.main ? 34 : 26}" rx="${n.main ? 17 : 13}" stroke="${tcol(n.T.status)}"/><text x="${n.x}" y="${n.y + 4}">${short(n.T.name, n.main ? 18 : 14)}</text>${n.br ? `<text x="${n.x}" y="${n.y - 18}" class="gl2">broader</text>` : ''}</g></a>`
      : n.k === 'doc' ? `<g class="gn doc"><rect x="${n.x - 56}" y="${n.y - 15}" width="112" height="30" rx="4"/><text x="${n.x}" y="${n.y - 1}">${short(n.v.t, 17)}</text><text x="${n.x}" y="${n.y + 10}" class="gl2">Wiki · ${n.v.date}</text></g>`
      : n.k === 'met' ? `<g class="gn ob" data-o="${n.o.sub}:${n.o.t}:${n.o.name}"><circle cx="${n.x}" cy="${n.y}" r="7" fill="${hc(n.o)}"/><text x="${n.x + 13}" y="${n.y + 4}" class="gs">${short(n.o.name, 26)}</text></g>`
      : n.k === 'dm' ? `<g class="gn ob" data-o="${n.o.sub}:${n.o.t}:${n.o.name}"><rect x="${n.x - 7}" y="${n.y - 7}" width="14" height="14" rx="2" fill="${hc(n.o)}"/><text x="${n.x + 13}" y="${n.y - 9}" class="gs">${short(n.o.name, 26)}</text></g>`
      : `<g class="gn col"><rect x="${n.x - 5}" y="${n.y - 5}" width="10" height="10" rx="1"/><text x="${n.x + 9}" y="${n.y + 4}" class="gs">${short(n.v, 16)}</text></g>`).join('')}
    <text x="80" y="${H - 8}" class="gh">documents</text><text x="330" y="${H - 8}" class="gh">terms</text><text x="520" y="${H - 8}" class="gh">metrics · data marts · columns</text></svg>`; }
// domain concept map: all terms of the domain's subdomains and their relations; node size is the number of linked objects (metrics and data marts)
function glDomain(l1) { const M = new Map();
  SUBS.filter(x => x.l1 === l1 && x.all.n).forEach(x => glossOf(x).terms.forEach(t => { const e = M.get(t.id) || { id: t.id, name: t.name, status: t.status, key: false, objs: new Set(), subs: new Set(), rel: new Set(), br: new Set() };
    [...t.met, ...t.dm].forEach(o => e.objs.add(o)); e.subs.add(x); e.key ||= t.key; if (t.status === 'ok') e.status = 'ok'; t.rel.forEach(R => e.rel.add(R.id)); if (t.broader) e.br.add(t.broader.id); M.set(t.id, e); }));
  return [...M.values()]; }
// 3D concept map of a domain (glmap3d.js): nodes are terms, size is linked objects; typed relations: broader, related (shared objects), synonym
// relation in words: term category → verb for the pair ("Buyer places order", "Listing has installment").
// For now, rules by category; in production an agent extracts the verb from the Wiki together with a quote
const GL_CAT = {}; [['actor', 'User|Buyer|Seller|Dealer|Agent|Applicant|Employer|Company|Courier|Moderator|Owner|Private sellers|Business|Professionals|Audience|Shop|Store'],
  ['object', 'Item|Listing|Order|Product|Goods|Car|Cars|Truck|Machinery|Part|Lot|Vacancy|Resume|Apartment|Real estate|Service|Catalog|Offer|Cart|Report|Profile|Account|Brand|Model|Microcategory|Microcategories|Category|Application|Garage|Mileage|Body type|Engine|Generation'],
  ['money', 'Payment|Revenue|Balance|Wallet|Installment|Credit|Loan|Bonus|Discount|Commission|Fee|Price|Plan|Subscription|Paid contact|Transaction revenue|Income|Margin|Spend|Cost|Budget|Bid|Bids|Purchase|Sale|Transaction|Refund|Amount|Buyout|Insurance|Safe deal|Deal|Rent|Rental'],
  ['event', 'View|Click|Call|Chat|Message|Messenger|Contact|Response|Visit|Session|Event|Event stream|Impression|Search|Reply|Answer|Answers|Confirmation|Send|Notification|Push|Query|Queries|Request|Booking|Inspection|Checkout'],
  ['control', 'Block|Ban|Moderation|Complaint|Fraud|Spam|Bot|Status|Verification|Identification|Reputation|Review|Rating'],
  ['logistics', 'Delivery|Warehouse|Logistics|Stock'],
  ['analytic', 'Conversion|Retention|Funnel|Cohort|Segment|Activity|Efficiency|Quality|Forecast|Experiment|Test|Goal|Target|Share|Unique users|Sample|Feature']].forEach(([c, names]) => names.split('|').forEach(n => { GL_CAT[n] = c; }));
const GL_VERB = { 'actor>object': 'creates', 'actor>event': 'makes', 'actor>money': 'pays', 'actor>logistics': 'receives', 'actor>actor': 'chooses', 'actor>control': 'passes', 'actor>analytic': 'shapes', 'object>analytic': 'shapes', 'event>analytic': 'shapes', 'money>analytic': 'shapes',
  'object>money': 'has', 'object>event': 'gets', 'object>logistics': 'requires', 'object>object': 'contains', 'object>control': 'passes',
  'event>money': 'brings', 'event>event': 'triggers', 'event>logistics': 'triggers', 'money>money': 'includes', 'money>logistics': 'covers',
  'control>actor': 'restricts', 'control>object': 'restricts', 'control>event': 'checks', 'control>money': 'protects',
  'analytic>actor': 'measures', 'analytic>object': 'measures', 'analytic>event': 'measures', 'analytic>money': 'measures', 'logistics>money': 'shapes' };
// for sellers money comes in, not out
const GL_SELLERS = new Set(['Seller', 'Dealer', 'Employer', 'Company', 'Shop', 'Store', 'Business', 'Professionals', 'Owner']);
// second term in lower case for the phrase ("pays deal", "chooses seller"); acronyms stay as is
function glAcc(name) { return /^[A-Z]{2,}/.test(name) ? name : name[0].toLowerCase() + name.slice(1); }
const CAT_ORDER = ['actor', 'control', 'analytic', 'object', 'event', 'money', 'logistics'];
function glVerb(A, B) { const ca = GL_CAT[A.name], cb = GL_CAT[B.name]; if (!ca || !cb) return null;
  const [X, Y] = CAT_ORDER.indexOf(ca) <= CAT_ORDER.indexOf(cb) ? [A, B] : [B, A]; let v = GL_VERB[`${GL_CAT[X.name]}>${GL_CAT[Y.name]}`]; if (!v) return null;
  if (v === 'pays' && GL_SELLERS.has(X.name)) v = 'receives';
  if (v === 'creates' && !GL_SELLERS.has(X.name)) v = 'chooses';
  if (v === 'makes' && /Reply|Answer|Confirmation/.test(Y.name)) v = 'gives'; return { from: X, to: Y, verb: v, obj: glAcc(Y.name) }; }
let TM_DATA = null;
function glMap(d) { const T = glDomain(d.l1), byId = new Map(T.map(t => [t.id, t])), mine = new Set(glossOf(d).terms.map(t => t.id)), E = [], seen = new Set();
  const add = (a, b, type, shared, verb, obj) => { const k = [a.id, b.id].sort().join('|'); if (seen.has(k)) return; seen.add(k); E.push({ a: a.id, b: b.id, type, shared, verb, obj }); };
  T.forEach(A => { A.br.forEach(id => { const B = byId.get(id); if (B) add(B, A, 'broader'); });
    A.rel.forEach(id => { const B = byId.get(id); if (!B || A.br.has(id) || B.br.has(A.id)) return; let n = 0; A.objs.forEach(o => { if (B.objs.has(o)) n++; });
      // if almost all objects of the smaller term belong to the larger one, it is 'part of'; otherwise 'related' with the number of shared objects
      const [S, Lg] = A.objs.size <= B.objs.size ? [A, B] : [B, A], V = glVerb(A, B); if (V) add(V.from, V.to, 'verb', n, V.verb, V.obj); else if (S.objs.size >= 3 && n >= 0.8 * S.objs.size) add(Lg, S, 'part', n); else add(A, B, 'related', n); }); });
  T.forEach((A, i) => T.slice(i + 1).forEach(B => { if (A.name === B.name) add(A, B, 'synonym'); }));
  TM_DATA = { d, nodes: T.map(t => ({ id: t.id, name: t.name, status: t.status, key: t.key, n: t.objs.size, subs: [...t.subs].map(x => x.l2), mine: mine.has(t.id), sub: (mine.has(t.id) ? d : [...t.subs][0]).i })), edges: E };
  return `<div class="card glmap"><div id="tm3d" class="tm3d"><div class="tm-load">Building the 3D concept map…</div></div>
    <div class="glleg"><span>All ${d.l1} terms: ${T.length}, relations: ${E.length}</span><span>left button rotates, wheel zooms, click selects (several allowed), double click opens a term</span></div></div>`; }
// term and relation generation agent: rerun over Wiki sources; an example scenario, publishes nothing without review
function glAgent(d) { const G = glossOf(d), pages = new Set(G.terms.flatMap(t => t.docs.map(x => x.t))).size, h = hash(d.l2 + 'gl');
  const steps = [['Reading sources', `${pages + 3} Wiki pages of ${d.l2} and related spaces`], ['Extracting candidates', 'terms, definitions, synonyms and relations by a strict schema, with quotes'], ['Checking quotes', 'candidates without a verbatim quote from the page are dropped'],
    ['Merging duplicates', `comparing with ${G.terms.length} glossary terms by name and meaning; contradictions become conflict tasks`], ['Linking to semantics and data', `proposing links to ${d.t.met.length} metrics and columns of ${d.t.dm.length} data marts`], ['Queueing for review', 'the BI partner and metrics curator confirm; until then agents do not see candidates']];
  document.querySelector('.agm')?.remove(); const m = document.createElement('div'); m.className = 'agm';
  m.innerHTML = `<div class="agbox"><button class="x" aria-label="Close">×</button><div class="k">Glossary agent · ${d.l2}</div><h3>Generating terms and relations</h3><div class="note">Example scenario: the agent prepares candidates for review and publishes nothing itself. <span class="mk">example</span></div><ol>${steps.map(([t, s]) => `<li><i></i><div>${t}<small>${s}</small></div></li>`).join('')}</ol><div class="res" hidden></div><div class="acts"><a class="pri" href="#/s/${d.i}/gl?st=queue" style="display:none">Open review queue</a></div></div>`;
  document.body.appendChild(m); const close = () => { clearInterval(tm); m.remove(); }; m.querySelector('.x').onclick = close; m.onclick = e => { if (e.target === m) close(); };
  const li = [...m.querySelectorAll('li')]; let k = 0; li[0].className = 'on';
  const tm = setInterval(() => { li[k].className = 'done'; k++; if (k < li.length) { li[k].className = 'on'; return; } clearInterval(tm);
    const res = m.querySelector('.res'); res.hidden = false; res.innerHTML = `<b>Ready for review:</b> ${4 + h % 9} new candidates, ${2 + h % 4} changed definitions, ${6 + h % 12} proposed links to metrics and columns, ${h % 3} ${plural(h % 3, 'conflict', 'conflicts')}.`;
    const a = m.querySelector('.acts a'); a.style.display = ''; a.onclick = close; }, 900); }
// term editing: name, definition, synonyms, example, relations; in the demo a draft in page memory, sent to review on Save
function glEditForm(d, T) { const G = glossOf(d), others = G.terms.filter(x => x !== T);
  return `<form class="card glr gedit" id="gedit" data-sub="${d.i}" data-t="${T.id}"><div class="k">Edit term · draft</div>
    <label>Name<input id="ge-name" value="${T.name}"></label>
    <label>Definition<textarea id="ge-def" rows="5">${T.def}</textarea></label>
    <label>Usage example<textarea id="ge-ex" rows="2" placeholder="A buyer is a user who…">${T.example || ''}</textarea></label>
    <label>Synonyms and abbreviations<input id="ge-syn" value="${T.syn.join(', ')}" placeholder="comma separated"></label>
    <label>Broader (general concept)<select id="ge-br"><option value="">none</option>${others.map(x => `<option value="${x.id}"${T.broader === x ? ' selected' : ''}>${x.name}</option>`).join('')}</select></label>
    <label>Related terms<select id="ge-rel" multiple size="5">${others.map(x => `<option value="${x.id}"${T.rel.includes(x) ? ' selected' : ''}>${x.name}</option>`).join('')}</select></label>
    <label class="gck"><input type="checkbox" id="ge-key"${T.key ? ' checked' : ''}> Key domain term</label>
    <div class="gsec">Links to metrics and data marts</div><small>${T.met.length} metrics and ${T.dm.length} data marts; editing object links will come with the matching agent (placeholder)</small>
    <div class="acts"><button class="btn primary" type="submit">Save and send to review</button><a class="btn" href="#/s/${d.i}/gl?t=${T.id}">Cancel</a></div>
    <small>Who confirms: BI partner ${has(d, 'bp') ? who(d, 'bp') : '(not assigned)'}; metric links: metrics curator.</small></form>`; }
document.addEventListener('submit', e => { if (e.target.id !== 'gedit') return; e.preventDefault(); const f = e.target, d = SUBS[+f.dataset.sub], G = glossOf(d), T = G.terms.find(x => x.id === f.dataset.t); if (!T) return;
  const v = id => document.getElementById(id).value.trim(), byId = id => G.terms.find(x => x.id === id);
  T.name = v('ge-name') || T.name; T.def = v('ge-def') || T.def; T.example = v('ge-ex'); T.syn = v('ge-syn').split(',').map(x => x.trim()).filter(Boolean);
  T.broader = byId(v('ge-br')) || null; T.rel = [...document.getElementById('ge-rel').selectedOptions].map(o => byId(o.value)).filter(Boolean); T.key = document.getElementById('ge-key').checked;
  T.edited = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); if (T.status === 'ok') T.status = 'cand';
  location.hash = `#/s/${d.i}/gl?t=${T.id}`; });
function subGloss(d, r) { const G = glossOf(d), q = r?.q || {}, f = q.st || 'all';
  if (!G.terms.length) return `<div class="card glempty"><b>The subdomain glossary has no terms yet</b><p>Agents answer questions about ${d.l2} without a domain dictionary, and 1.4 Domain knowledge does not count the glossary.</p><ol><li>Point to the Wiki pages that describe the subdomain's concepts</li><li>Run extraction: candidates will appear in the review queue</li><li>Confirm key terms, starting with the most used metrics</li></ol><div class="acts"><button class="btn primary" data-glagent="${d.i}">Run generation agent</button><button class="btn stubbtn" disabled>Choose sources · placeholder</button><button class="btn stubbtn" disabled>Create term · placeholder</button></div></div>`;
  const list = G.terms.filter(t => f === 'all' || (f === 'queue' ? t.status !== 'ok' : t.status === f)), T = G.terms.find(t => t.id === q.t) || list[0] || G.terms[0];
  const view = q.v === 'map' ? 'map' : 'focus', bar = `<div class="glbar"><div class="mode"><a href="#/s/${d.i}/gl${T ? '?t=' + T.id : ''}" aria-pressed="${view === 'focus'}">Term and relations</a><a href="#/s/${d.i}/gl?v=map" aria-pressed="${view === 'map'}">All domain terms</a></div><button class="btn" data-glagent="${d.i}">↻ Rerun term and relation generation agent</button></div>`;
  // first choice: the object agents and text2sql take first for this term; set by the BI partner
  T.first ||= new Set(); const fcKey = o => `${o.sub}:${o.t}:${o.name}`, fcSort = L => [...L].sort((a, b) => T.first.has(fcKey(b)) - T.first.has(fcKey(a)) || b.pop - a.pop);
  const objRow = o => { const k = fcKey(o), on = T.first.has(k); return `<div class="gor${on ? ' fc' : ''}" data-o="${k}"><span class="dot ${sdot(o)}"></span><span>${on ? '<b class="fcb">first choice</b>' : ''}${o.name}</span><em>${fmt(o.pop)}</em>${certBtn(o, true)}<button class="fcbtn${on ? ' on' : ''}" data-fc="${d.i}|${T.id}|${k}" title="${on ? 'remove first choice' : 'set as first choice: agents take this object first for the term'}">${on ? '★' : '☆'}</button></div>`; };
  return `<div class="glk"><div class="kpi"><span>Terms</span><b>${G.terms.length}</b><small>${G.ok} confirmed · ${G.queue} in review</small></div><div class="kpi"><span>Coverage</span><b>${G.cov == null ? '—' : Math.round(G.cov * 100) + '%'}</b><small title="share of metric and data mart usage explained by confirmed terms">of usage explained</small></div>
      <div class="kpi"><span>Sources</span><b>${new Set(G.terms.flatMap(t => t.docs.map(x => x.t))).size}</b><small>Wiki pages</small></div><div class="gnote"><span class="mkb">example</span> Terms are derived from object names; definitions, statuses, quotes and columns are generated. Design and architecture: <a href="doc.html?f=glossary" target="_blank" rel="noopener">docs/glossary-kg-design.md</a>.</div></div>
    ${bar}${view === 'map' ? glMap(d) : `<div class="gl3"><div class="card gll"><div class="filters">${[['all', 'All'], ['ok', 'Confirmed'], ['queue', `In review ${G.queue}`]].map(([k, l]) => `<button data-glf="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>
        ${list.map(t => `<a class="gli${t === T ? ' on' : ''}" href="#/s/${d.i}/gl?t=${t.id}${f !== 'all' ? '&st=' + f : ''}"><i class="gs-${t.status}">${GL_ST[t.status][1]}</i><span>${t.name}${t.key ? ' <b class="gkey">★</b>' : ''}<small>${t.met.length} metrics · ${t.dm.length} data marts${t.conf ? ` · confidence ${t.conf.toFixed(2)}` : ''}</small></span></a>`).join('')}
        <div class="acts"><button class="btn stubbtn" disabled>+ Term · placeholder</button></div></div>
      <div class="card glc">${glGraph(d, T)}<div class="glleg"><span><i class="lt"></i>term</span><span><i class="lm"></i>metric</span><span><i class="ld"></i>data mart</span><span><i class="lc"></i>column</span><span><i class="lp"></i>Wiki page</span><span>object color is health, term outline is status; click a term to focus on it</span></div></div>
      ${q.edit ? glEditForm(d, T) : `<div class="card glr"><div class="k">${GL_ST[T.status][0]}${T.conf ? ` · confidence ${T.conf.toFixed(2)}` : ''}</div><h3>${T.name}${T.key ? ' <b class="gkey">★</b>' : ''}</h3>
        ${T.syn.length ? `<small>Synonyms: ${T.syn.join(', ')}</small>` : ''}<small>Owner: ${has(d, 'bp') ? who(d, 'bp') + ', BI partner' : 'no BI partner assigned'}</small>
        <div class="gsec">Definition</div><p>${T.def}</p>
        ${T.status === 'conflict' ? `<div class="gwarn">Two sources define the term differently: pick one, write a shared definition or split it into two terms.</div>` : ''}${T.status === 'stale' ? `<div class="gwarn">The source page changed after confirmation; check the definition.</div>` : ''}
        <div class="gsec">Sources · ${T.docs.length}</div>${T.docs.map(x => `<div class="gdoc">"…${T.name} is …" <small>${x.t}, ${x.sec}, edited ${x.date}</small></div>`).join('')}
        ${T.broader || T.rel.length ? `<div class="gsec">Related concepts</div><div class="chips">${T.broader ? `<a class="chip" href="#/s/${d.i}/gl?t=${T.broader.id}">broader: ${T.broader.name}</a>` : ''}${T.rel.map(R => `<a class="chip" href="#/s/${d.i}/gl?t=${R.id}">${R.name}</a>`).join('')}</div>` : ''}
        <div class="gsec">Metrics · ${T.met.length} <span class="fch">☆ sets first choice</span></div>${fcSort(T.met).slice(0, 6).map(objRow).join('') || '<small>none</small>'}
        <div class="gsec">Data marts and columns · ${T.dm.length}</div>${fcSort(T.dm).slice(0, 4).map(objRow).join('') || '<small>none</small>'}${T.cols.length ? `<small>columns: ${T.cols.slice(0, 2).map(c => c.split('.').slice(-1)[0]).join(', ')} · example</small>` : ''}
        <div class="acts"><a class="btn" href="#/s/${d.i}/gl?t=${T.id}&edit=1">Edit</a>${T.status === 'ok' ? '' : '<button class="btn stubbtn" disabled>Accept · placeholder</button><button class="btn stubbtn" disabled>Reject · placeholder</button>'}</div>${T.edited ? `<small class="gedited">Changed in this session at ${T.edited}: a draft awaiting review, not saved in the demo</small>` : ''}</div>`}</div>`}`; }
function blk(k, title, big, bigSub, meter, kv) {
  return `<div class="card blk" data-tab="${k}"><h3>${title}<em>→</em></h3><div class="big"><b>${big}</b><span>${bigSub}</span></div>${meter}<div class="kv">${kv}</div></div>`;
}
const meter = a => a.n ? `<div class="meter"><i style="width:${pct(a.good, a.n)}%;background:var(--ok)"></i><i style="width:${pct(a.cert - Math.min(a.cert, a.good), a.n)}%;background:var(--warn)"></i><i style="flex:1;background:var(--bad-track)"></i></div>` : '<div class="meter"></div>';
const n1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.0', '');
// maturity levels: ladder, next-level rules, campaign
// AI-Ready Domains Score card on the overview: level, two axes, components; details in the AI-Ready Score tab
const stChip = c => c.status === 'tbd' ? `<span class="wip tbd">${TBD}</span>` : c.status === 'mock' ? MOCKC : c.status === 'none' ? '<span class="prx">no objects, not counted</span>' : c.status === 'wip' ? `<span class="wip">${WIP}</span>` : c.status === 'proxy' ? '<span class="prx" title="computed from related data">proxy</span>' : c.status === 'partial' ? '<span class="prx">partial</span>' : '';
// why a component is not counted: no objects of its type or no data, then it is left out of the axis mean
const NONE_TXT = { R1: 'no data marts', R2: 'no metrics', R3: 'no dashboards', O3: 'not in the BI Maturity audience', O4: 'no cost data' };
const noneTxt = c => `${c.key === 'O4' && c.note ? c.note : NONE_TXT[c.key] || 'no data'}, not counted`;
// component row as a table: name, actual, plan, attained (bar up to 100%); ≈ proxy, * generated
const compRow = c => { const tg = c.target, v = x => x == null ? '—' : c.unit ? fmtK(x) + ' ' + c.unit : Math.round(x * 100) + '%';
  const mk = c.status === 'proxy' || c.status === 'partial' ? '<i class="px" title="computed from related data">≈</i>' : c.status === 'mock' ? '<i class="px" title="generated for the demo">*</i>' : '';
  const done = c.score == null ? `<span class="cdw${c.status === 'none' ? ' nx' : ''}" title="${c.status === 'none' ? 'the component is left out of the axis mean' : ''}">${c.status === 'none' ? noneTxt(c) : c.status === 'tbd' ? TBD : WIP}</span>`
    : `<span class="cdb"><i style="width:${Math.min(100, c.score)}%;background:${c.score >= 100 ? 'var(--ok)' : c.score >= 60 ? 'var(--warn)' : 'var(--bad)'}"></i></span><em>${Math.round(c.score)}%</em>`;
  return `<div class="cr${c.score == null ? ' w' : ''}"><span class="cn">${c.code} ${c.name}${mk}</span><b>${c.fact == null ? '—' : v(c.fact)}</b><span class="cp">${v(tg)}</span><span class="cdn">${done}</span></div>`; };
const compHead = '<div class="cr ch"><span>component</span><span>actual</span><span>plan</span><span>attained</span></div>';
// AI-Ready Domains Score card on the overview: readiness R by component, level and what the next level needs
function levelCard(d, cmp = false) {
  if (d.level == null) return '';
  const A = d.ards, L = d.level, nextRules = L < d.rules.length ? d.rules[L] : null, gap = nextRules?.find(r => /Readiness at least (\d+)/.test(r.name));
  const need = gap && !gap.ok ? +gap.name.match(/(\d+)/)[1] - (A.R.v || 0) : 0;
  const pills = LEVEL_NAMES.map((n, i) => `<span class="lp${i < L ? ' done' : i === L ? ' cur' : ''}${i >= 2 ? ' w' : ''}">${n}</span>`).join('');
  // top: summary with score, level and what the next level needs; below, axis R and axis O side by side
  return `<div class="card ards3">
    <div class="ah"><b>Level</b><div class="lps">${pills}</div><a href="${ARDS_URL}"${ext(ARDS_URL)}>method ↗</a>${cmp ? `<a href="#rocmp" data-jump="rocmp">compare with domains ↓</a>` : `<a href="#/s/${d.i}/ards">all components →</a>`}</div>
    <div class="atot"><div class="ai1 sc"><span>AI-Ready score</span><b>${A.idx ?? '—'}</b><small>min(Readiness, Result)</small></div><div class="ai1 pl"><span>Rank</span>${d.aiRank ? `<a class="rk" href="${cmp ? '#rocmp' : `#/s/${d.i}/ards`}"${cmp ? ' data-jump="rocmp"' : ''} title="rank by score among ${d.rankN ?? AI_RANKED} ${d.subs ? 'domains' : 'subdomains'} with an AI-Ready level"><b>${d.aiRank}</b><small>of ${d.rankN ?? AI_RANKED}</small></a>` : '<b>—</b>'}</div>
      ${nextRules ? `<div class="anext"><span class="lt">For ${LEVEL_NAMES[L + 1]}${need > 0 ? ` ${need} readiness ${plural(need, 'point', 'points')} short` : ''}</span><div class="ck">${nextRules.map(r => `<div class="${r.wip ? 'w' : r.ok ? 'y' : 'n'}"><i>${r.wip ? '…' : r.ok ? '✓' : '×'}</i><span>${r.name}${r.mock ? '*' : ''}${r.wip ? ` <em>${WIP}</em>` : r.ok ? '' : ` <em>now ${r.now}</em>`}</span></div>`).join('')}</div></div>` : '<div class="anext"><span class="lt">Top level</span></div>'}</div>
    <div class="ahalf">
      <div><div class="axh"><span>Axis 1 · Readiness</span><b>${A.R.v ?? '—'}</b><small>${A.R.wip.length ? `${A.R.wip.join(', ')}: ${WIP}, up to ${A.R.max} possible now` : 'mean attainment of 1.1–1.4'}</small></div>
        <div class="crs">${compHead}${A.comp.filter(c => c.axis === 'R').map(compRow).join('')}</div></div>
      <div><div class="axh"><span>Axis 2 · Result</span><b>${A.O.v ?? '—'}</b>${MOCKC}<small>mean attainment of 2.1–2.4</small></div>
        <div class="crs">${compHead}${A.comp.filter(c => c.axis === 'O').map(compRow).join('')}</div></div>
    </div>
    <small class="mut">Attained = min(100%, actual / plan); for 2.4 lower is better: min(100%, plan / actual). ≈ computed from related data; * ${MOCK_O}. Differences from the method are listed in the AI-Ready Score tab</small></div>`;
}
// AI-Ready Score tab: every component with actual, target, score, method and source; gaps listed separately
function subArds(d) {
  const A = d.ards, pc = v => v == null ? '—' : Math.round(v * 100) + '%';
  const row = c => `<tr class="${c.status === 'wip' ? 'w' : ''}"><td class="nm">${c.code} · ${c.name}<small>${c.how}</small></td><td class="num">${c.unit ? (c.fact == null ? '—' : fmtK(c.fact) + ' ' + c.unit) : pc(c.fact)}</td><td class="num">${c.unit ? (c.target == null ? '—' : fmtK(c.target) + ' ' + c.unit) : pc(c.target)}</td>
    <td class="num">${c.score == null ? '—' : Math.round(c.score) + '%'}</td><td>${stChip(c) || '<span class="okc">counted</span>'}${c.note ? `<small>${c.note}</small>` : ''}</td><td><small>${c.src}</small></td></tr>`;
  const gaps = A.comp.filter(c => c.status !== 'ok' && c.status !== 'none');   // generated O1–O3 are listed too: they have no source
  return `${levelCard(d, true)}
    <div class="sec"><h2>Components</h2><span>attainment = min(100%, actual / target), 30-day window; an axis is the unweighted mean attainment</span></div>
    <div class="card tw"><table class="tbl ards"><thead><tr><th>Component</th><th class="num">Actual</th><th class="num">Target</th><th class="num">Attainment</th><th>Status</th><th>Source</th></tr></thead><tbody>
      <tr class="ax"><td colspan="6">Axis 1 · Readiness = ${A.R.v ?? '—'} of ${A.R.max} possible · mean attainment of 1.1–1.4</td></tr>${A.comp.filter(c => c.axis === 'R').map(row).join('')}
      <tr class="ax"><td colspan="6">Axis 2 · Result = ${A.O.v ?? '—'} · mean attainment of 2.1–2.4 · 2.1 and 2.2 ${MOCK_O} · score min(axis 1, axis 2) = ${A.idx ?? '—'}</td></tr>${A.comp.filter(c => c.axis === 'O').map(row).join('')}</tbody></table></div>
    <div class="sec"><h2>What is missing</h2><span>${gaps.length} of ${A.comp.length} components are not fully computed</span></div>
    <div class="card gaps">${gaps.map(c => `<div class="gp"><b>${c.code} · ${c.name}</b>${stChip(c)}<p>${c.need}</p></div>`).join('')}</div>
    <div class="sec" id="rocmp"><h2>Comparison with other domains</h2><span>${(() => { return d.aiRank ? `score ${d.ards.idx}, rank ${d.aiRank} of ${d.rankN ?? AI_RANKED}; ` : ''; })()}axis 1 readiness against axis 2 result, size is data usage over 30 days</span></div>
    ${roChart(d.subs ? DOMV : SUBS, d)}`;
}
// overview modules: reliability (freshness and incidents), blast radius, trend
function opsCard(d) {
  const hi = d.incOpen.filter(r => r.x[1] >= 2).length;
  return `<div class="card blk" data-tab="ops"><h3>${S.opsTab || 'Reliability'}<em>→</em></h3><div class="big"><b>${p0(freshPct(d))}</b><span>of data marts on time as of ${dd(OPS_DATE)}</span></div>
    <div class="meter"><i style="width:${pct(d.fresh[0], Math.max(1, d.freshN - d.fresh[3]))}%;background:var(--ok)"></i><i style="flex:1;background:var(--bad-track)"></i></div>
    <div class="kv"><span>Late</span><b>${d.fresh[1] + d.fresh[2]}</b><span>No schedule</span><b>${d.fresh[3]}</b><span>Monitored</span><b>${p0(d.mon.n ? d.mon.on / d.mon.n : null)}</b>
      <span>Open DQ incidents</span><b style="${hi ? 'color:var(--bad)' : ''}">${d.incOpen.length}${hi ? `, ${hi} high` : ''}</b><span>Time to fix</span><b>${dur(d.mttr)}</b></div></div>`; }
function radiusCard(d) {
  const top = d.t.dm.filter(o => o.down && (!ok(o.s) || [1, 2].includes(freshOf(o)) || o.inc.some(isOpen))).sort((a, b) => downN(b) - downN(a)).slice(0, 4);
  const dash = d.t.dm.filter(o => o.down && !ok(o.s)).reduce((s, o) => s + o.down[1], 0);
  return `<div class="card blk nolink"><h3>Blast radius<a href="#/s/${d.i}/dm?s=pop" class="hl">data marts →</a></h3><div class="big"><b>${fmt(dash)}</b><span>dashboards read unhealthy data marts</span></div>
    <div class="list rl">${top.map(o => `<div class="it" data-o="${o.sub}:${o.t}:${o.name}"><span class="dot ${sdot(o)}"></span><span title="${o.name}">${o.name}<small>${reason(o) || st(o)}</small></span><em>${downTxt(o)}</em></div>`).join('') || '<div class="it"><span></span><span style="color:var(--ink3)">no unhealthy data marts with consumers</span></div>'}</div></div>`; }
// infra savings: CPU over 30 days without return; details and highlighting in the links graph
function savCard(d) {
  const v = savings(d), h = n => n >= 10 ? fmtK(n) : String(Math.round(n * 10) / 10);
  if (!v.cpu) return `<div class="card blk nolink"><h3>Infra savings</h3><div class="big"><b>—</b><span>no ${S.ofL2} objects in platform billing</span></div></div>`;
  return `<div class="card blk nolink"><h3>Infra savings<a href="graph.html?d=${d.i}&l=infra" class="hl">in graph →</a></h3><div class="big"><b style="white-space:nowrap">${h(v.total)} h</b><span>CPU over 30 days can be saved, ${pct(v.total, v.cpu)}% of spend</span></div>
    <div class="kv">${v.groups.map(g => `<span>${g.short}</span><b>${g.sav ? '−' + h(g.sav) + ' h' : g.cpu ? h(g.cpu) + ' h' : fmtK(g.gb) + ' GB'}</b>`).join('') || '<span>No spend without return found</span><b></b>'}</div></div>`; }
// full-width filled line; color follows the 4-week direction, not the level
const sparkW = (arr, h = 30) => { const v = (arr || []).filter(x => x != null); if (v.length < 2) return ''; const w = 200;
  const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 0.01, P = arr.map((x, k) => x == null ? null : [k / (arr.length - 1) * (w - 6) + 3, h - 4 - (x - lo) / r * (h - 8)]).filter(Boolean), [lx, ly] = P[P.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="M${P[0][0]},${h} L${P.map(q => q.join(',')).join(' L')} L${lx},${h}Z" fill="currentColor" opacity=".09"/><polyline points="${P.map(q => q.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="${lx}" cy="${ly}" r="2.4" fill="currentColor"/></svg>`; };
function dynCard(d) {
  const it = (l, val, tr, dv, unit, tip = '') => { const c = dv == null ? '' : dv > 0.05 ? 'up' : dv < -0.05 ? 'down' : '';
    return `<div class="dr ${c}"${tip ? ` title="${tip}"` : ''}><div class="dh"><span>${l}</span><b>${val}</b><em>${dv == null ? '' : (dv > 0.05 ? '↑' : dv < -0.05 ? '↓' : '→') + Math.abs(dv).toFixed(unit ? 1 : 0)}</em></div><i class="sw">${sparkW(tr) || '<span class="nd">no data</span>'}</i></div>`; };
  const row = (l, tr, a) => a.n ? it(l, p0(a.good / a.n), tr, delta(tr), ' pp') : '';
  const ix = d.idxTrend;
  return `<div class="card blk dynb" title="change over 4 weeks: score in points, objects as healthy share in pp"><h3>Trend over 8 weeks<em>4-week change</em></h3><div class="drs">
    ${it('AI-Ready', d.ards?.idx ?? '—', ix && ix.map(v => v / 100), ix ? ix.at(-1) - ix.at(-5) : null, '', 'weekly estimate: trusted data marts, dashboards and semantics recomputed from healthy share')}
    ${row(S.health.name, d.trend.all, d.all)}${row(S.kind.dm, d.trend.dm, d.by.dm)}${row(S.kind.met, d.trend.met, d.by.met)}${row(S.kind.dash, d.trend.dash, d.by.dash)}</div></div>`; }
function subOverview(d, top = '') {
  const ai = aiMock(d), T = tasks(d);
  const objBlk = (k, title) => { const a = d.by[k]; return blk(k, title, a.n ? pct(a.good, a.n) + '%' + dyn(d.trend[k]) : '—', a.n ? `healthy, ${fmt(a.good)} of ${fmt(a.n)}` : 'no objects', meter(a),
    k === 'dm' ? `<span>On time</span><b>${p0(freshPct(d))}</b><span>Monitored</span><b>${p0(d.mon.n ? d.mon.on / d.mon.n : null)}</b><span>Open incidents</span><b>${d.incOpen.length}</b><span>Issues</span><b>${a.hot}</b>`
    : `<span>Certified</span><b>${a.n ? pct(a.cert, a.n) + '%' : '—'}</b><span>${UNIT[k][0].toUpperCase() + UNIT[k].slice(1)}</span><b>${fmt(a.use)}</b><span>Issues</span><b>${a.hot}</b>`); };
  const tipsTop = d.igsTips.filter(x => x.text).sort((a, b) => b.gain - a.gain);
  // layout: AI-Ready → objects row (three types and context) → operations and trend row → issues, staff and tasks; cards in a row share a height
  const ctxBlk = (() => { const r5 = compOf(d, 'R5'), o1 = compOf(d, 'O1'), o2 = compOf(d, 'O2'); return blk('ards', 'Context and evals', r5?.status === 'tbd' ? 'TBD' : r5?.fact == null ? '—' : Math.round(r5.fact * 100) + '%', `1.4 Domain knowledge · ${TBD}`, `<div class="meter"><i style="width:${Math.round((r5?.fact || 0) * 100)}%;background:var(--ink)"></i></div>`,
        `<span>${S.skillLabel}</span><b>${d.skill ? 'published' : 'none'}</b><span>FAQ, glossary, text2sql</span><b>${fmt(d.faq)} · ${fmt(d.gl)} · ${fmt(d.t2s)}</b><span>Golden set cases ${MOCKC}</span><b>${d.ards.gs}</b><span>Answer accuracy 2.1 ${MOCKC}</span><b>${o1?.fact == null ? '—' : Math.round(o1.fact * 100) + '%'}</b><span>Question coverage 2.2 ${MOCKC}</span><b>${o2?.fact == null ? '—' : Math.round(o2.fact * 100) + '%'}</b>`); })();
  return `${levelCard(d)}
    ${d.subs ? top : `<div class="ovsec"><h2>${S.peopleTitle}</h2><span>${ROLES.filter(([k]) => has(d, k)).length} of ${ROLES.length} · a BI partner and a data owner are needed to leave L0</span></div>
    ${staffHtml(d).replace('class="card staff"', 'class="card staff srow"')}`}
    <div class="ovsec"><h2>Objects and context</h2><span>health of data marts, metrics and dashboards, context for agents</span></div>
    <div class="ovrow">
      ${objBlk('dm', S.kind.dm)}
      ${blk('met', S.kind.met, d.by.met.n ? pct(d.by.met.good, d.by.met.n) + '%' + dyn(d.trend.met) : '—', d.by.met.n ? `healthy, ${fmt(d.by.met.good)} of ${fmt(d.by.met.n)}` : 'no metrics', meter(d.by.met),
        `<span>Questions covered by healthy metrics ${MOCK}</span><b>${d.by.met.n ? ai.cover + '%' : '—'}</b><span>Uses</span><b>${fmt(d.by.met.use)}</b><span>Issues</span><b>${d.by.met.hot}</b>`)}
      ${objBlk('dash', S.kind.dash)}
      ${ctxBlk}
    </div>
    <div class="ovsec"><h2>Operations and trend</h2><span>freshness, blast radius, spend, 8-week trend</span></div>
    <div class="ovrow">${opsCard(d)}${radiusCard(d)}${savCard(d)}${dynCard(d)}</div>
    <div class="grid2" style="margin-top:6px">
      <div><div class="sec"><h2>Issues</h2><span>${d.hotList.length}</span></div>
        <div class="card list">${mixHot(d.hotList, 10).map(o => objItem(o, false, true)).join('') || '<div class="it"><span></span><span style="color:var(--ink3)">none</span></div>'}</div></div>
      <div><div class="sec"><h2>${S.tasksTitle}</h2><span>${(() => { const g = idxGain(d, { R1: 1, R2: 1, R3: 1 }); return g ? `together these raise the AI-Ready score by up to +${g}` : 'the score is currently limited by axis 2 · Result'; })()}</span></div>
        <div class="card">${T.map(([a, b, pt, g]) => `<div class="task"><i></i><div>${a}<small>${b}</small></div><div class="tr"><em class="${pt ? '' : 'z'}" title="how much the AI-Ready score min(axis 1, axis 2) rises">${typeof pt === 'string' ? pt : pt ? `score +${pt}` : 'no effect on score'}</em>${tlink(g)}</div></div>`).join('') || '<div class="task"><i></i><div>All good</div></div>'}</div>
        <div class="gap">The portal only shows the state of the ${S.ofL2}. Work happens in the tools: metrics in the Semantic Layer, dashboards in Dashboards, data marts in the Data Catalog and Git, knowledge in the Knowledge Base, roles in the portal's Domain Registry.</div></div>
    </div>`;
}
function subAI(d) {
  const ai = aiMock(d), repo = kbRepo(d);
  const qs = ['How many paid contacts this week', 'Why did response conversion drop', 'Revenue trend by segment', 'Share of active users', 'Compare with last year', 'Top growing categories']
    .map((q, k) => ({ q, n: 5 + (hash(d.l2 + k) % 60), okm: (hash(d.l2 + 'm' + k) % 100) < ai.cover + 20 }));
  return `<div class="kpis">
      <div class="kpi"><span>AI-Ready</span><b>${d.ards?.idx ?? '—'}<span> / 100</span></b><small>score min(axis 1, axis 2) · ${d.level != null ? 'L' + d.level : '—'}</small></div>
      <div class="kpi"><span>${S.skillLabel}</span><b>${d.skill ? 'yes' : 'no'}</b><small>domain context</small></div>
      <div class="kpi"><span>FAQ, glossary, text2sql</span><b>${d.faq} / ${d.gl} / ${d.t2s}</b><small>Knowledge Base entries</small></div>
      <div class="kpi"><span>Objects, lineage</span><b>${d.obj} / ${d.lin}</b><small>described for agents</small></div>
      <div class="kpi"><span>Golden set ${MOCK}</span><b>${(() => { const o1 = d.ards?.comp.find(c => c.key === 'O1'); return o1?.fact != null ? Math.round(o1.fact * 100) + '%' : '—'; })()}</b><small>${d.ards?.gs ? d.ards.gs + ' cases · answer accuracy 2.1' : 'not collected'}</small></div>
    </div>
    <div class="grid2">
      <div><div class="sec"><h2>Frequent questions ${MOCK}</h2><span>how they were answered</span></div>
        <div class="card list">${qs.map(x => `<div class="it" style="cursor:default"><span class="dot ${x.okm ? 'ok' : 'bad'}"></span><span>${x.q}<small>${x.okm ? 'answered through a healthy metric' : 'answered with raw SQL, the metric is missing or unhealthy'}</small></span><em>${x.n}</em></div>`).join('')}</div>
        <div class="gap">Question coverage by healthy metrics is the main indicator of this ${S.aiPlace}: the share of AI questions answered on trusted semantics. No tool tracks this metric yet.</div></div>
      <div><div class="sec"><h2>Channels, 30 days ${MOCK}</h2></div>
        <div class="card" style="padding:14px 16px"><div class="kv" style="font-size:13px;gap:8px 12px"><span>AI Assistant chats</span><b>${fmt(ai.assistant)}</b><span>AI portal chats</span><b>${fmt(ai.portal)}</b><span>MCP and SQL Workbench calls</span><b>${fmt(ai.mcp)}</b></div></div>
        <div class="sec"><h2>${S.aiFill}</h2></div>
        <div class="acts2">${plink({ p: 'kb', url: PRODUCTS.kb.url, what: 'FAQ, glossary, text2sql' })}${plink({ p: 'git', url: repo || PRODUCTS.git.url, what: repo ? 'domain Knowledge Base library' : 'Knowledge Base library not found' })}</div>
        <div class="gap">[Gap] AI portal chats are not logged in the warehouse. AI Assistant questions are attributed to the asker's team, not the question's domain, so attribution by subdomain needs topic labeling.</div></div>
    </div>`;
}
const FILTERS = { all: ['All', () => true], bad: ['Unhealthy', o => !ok(o.s)], hot: ['Issues', isHot], ok: ['Healthy', o => ok(o.s)], cert: ['Certified', o => o.s === 1 || o.s === 3],
  late: ['Late', o => [1, 2].includes(freshOf(o))], nomon: ['Not monitored', o => monOf(o) === false], inc: ['With incidents', o => o.inc.some(isOpen)] };
function subObjects(d, t, r) {
  const f = FILTERS[r.q.f] ? r.q.f : 'all', q = (r.q.q || '').toLowerCase(), a = d.by[t], sk = r.q.s || 'pop';
  const cols = CHECKS[t], cval = (o, i) => o.chk ? o.chk[0][i] : null;
  let list = d.t[t].filter(o => FILTERS[f][1](o) && (!q || o.name.toLowerCase().includes(q)));
  const key = { pop: o => -o.pop, name: o => o.name, st: o => o.s, fresh: o => freshOf(o) ?? 9, mon: o => o.chk ? o.chk[1][4] || 0 : -1 };
  cols.forEach(([k], i) => { key['c' + i] = o => cval(o, i) === '0' ? 0 : cval(o, i) === '1' ? 2 : 1; });
  list = [...list].sort((x, y) => { const kx = key[sk]?.(x), ky = key[sk]?.(y); return kx < ky ? -1 : kx > ky ? 1 : y.pop - x.pop; });
  const th = (k, l, c = '') => `<th class="sortable ${c}${sk === k ? ' on' : ''}" data-s="${k}" title="sort">${l}</th>`;
  const fk = t === 'dm' ? ['all', 'bad', 'hot', 'late', 'nomon', 'inc', 'cert'] : ['all', 'bad', 'hot', 'ok', 'cert'];
  const cd = v => `<i class="cd ${v === '1' ? 'ok' : v === '0' ? 'bad' : 'gry'}" title="${v === '1' ? 'passed' : v === '0' ? 'failed' : 'no data'}"></i>`;
  const covered = d.t[t].filter(o => o.chk).length;
  return `<div class="kpis">
      <div class="kpi"><span>Healthy</span><b>${a.n ? pct(a.good, a.n) + '%' : '—'}</b><small class="dl">${dyn(d.trend[t]) || '&nbsp;'}</small><small>${fmt(a.good)} of ${fmt(a.n)}</small></div>
      ${t === 'dm' ? `<div class="kpi"><span>Monitored</span><b>${p0(d.mon.n ? d.mon.on / d.mon.n : null)}</b><small>${fmt(d.mon.on)} with business checks</small></div>
      <div class="kpi"><span>On time</span><b>${p0(freshPct(d))}</b><small>${fmt(d.fresh[1] + d.fresh[2])} late, ${fmt(d.fresh[3])} without schedule</small></div>`
      : `<div class="kpi"><span>Certified</span><b>${a.n ? pct(a.cert, a.n) + '%' : '—'}</b><small>${fmt(a.cert)}</small></div>`}
      <div class="kpi"><span>${UNIT[t][0].toUpperCase() + UNIT[t].slice(1)}</span><b>${fmt(a.use)}</b><small>over the health score period</small></div>
      <div class="kpi"><span>Issues</span><b>${a.hot}</b><small>popular, unhealthy</small></div>
    </div>
    <div class="filters">${fk.map(k => `<button data-f="${k}" aria-pressed="${f === k}">${FILTERS[k][0]}</button>`).join('')}
      <input id="fq" placeholder="Filter by name" value="${r.q.q || ''}">
      ${{ met: plink({ p: 'semantic', url: PRODUCTS.semantic.url, what: 'edit metrics' }, 'btn sm'), dm: plink({ p: 'catalog', url: PRODUCTS.catalog.url, what: 'data mart metadata' }, 'btn sm'), dash: plink({ p: 'dashboards', url: PRODUCTS.dashboards.url, what: 'edit dashboards' }, 'btn sm') }[t]}</div>
    <div class="card tw"><table class="tbl fixed chk" style="min-width:${t === 'dm' ? 1320 : 980}px"><colgroup><col style="width:34px"><col>${cols.map(() => '<col style="width:56px">').join('')}${t === 'dm' ? '<col style="width:140px"><col style="width:110px">' : ''}<col style="width:100px"></colgroup>
      <thead><tr><th></th>${th('name', 'Object')}${cols.map(([k, n], i) => th('c' + i, `<span title="${n}">${CC_SHORT[k] || n}</span>`, 'cc')).join('')}${t === 'dm' ? th('fresh', 'Freshness') + th('mon', 'Checks') : ''}${th('pop', 'Views', 'num')}</tr></thead><tbody>
      ${list.slice(0, 300).map(o => `<tr data-o="${o.sub}:${o.t}:${o.name}"><td><span class="dot ${sdot(o)}"></span></td><td class="nm" title="${o.name}"><span class="nmc">${certBtn(o, true)}<span>${o.name}</span></span><small>${st(o)}${isHot(o) ? ', issue' : ''}${o.inc.some(isOpen) ? ', open incident' : ''}</small></td>${cols.map((_, i) => `<td class="cc">${cd(cval(o, i))}</td>`).join('')}${t === 'dm' ? `<td>${freshChip(o)}</td><td>${monChip(o)}</td>` : ''}<td class="num">${fmt(o.pop)}</td></tr>`).join('') || `<tr><td colspan="${cols.length + 5}" style="color:var(--ink3)">no objects</td></tr>`}
    </tbody></table></div>${list.length > 300 ? `<div class="gap">Showing the first 300 of ${fmt(list.length)}</div>` : ''}
    <div class="gap">Columns are health score checks as of ${dd(OPS_DATE)}: green passed, red failed, grey no data. Components found for ${fmt(covered)} of ${fmt(a.n)} objects.${t === 'dm' ? ' Checks come from Data Contracts: not monitored means there are no business checks, only the platform NoRows and DuplicateKey.' : ''}</div>`;
}
// Reliability tab: data mart freshness and DQ incidents
function subOps(d) {
  const late = d.t.dm.filter(o => [1, 2].includes(freshOf(o))).sort((a, b) => (b.chk[1][3] - a.chk[1][3]) || downN(b) - downN(a) || b.pop - a.pop);
  const inc = [...d.incOpen, ...d.incAll.filter(r => !isOpen(r.x))].slice(0, 40);
  return `<div class="kpis">
      <div class="kpi"><span><i class="dot ${cls(freshPct(d))}"></i>Data marts on time</span><b>${p0(freshPct(d))}</b><small>of ${fmt(d.freshN - d.fresh[3])} with a schedule</small></div>
      <div class="kpi"><span>Late</span><b>${fmt(d.fresh[1] + d.fresh[2])}</b><small>${fmt(d.fresh[2])} not updating</small></div>
      <div class="kpi"><span>No schedule</span><b>${fmt(d.fresh[3])}</b><small>freshness not tracked</small></div>
      <div class="kpi"><span>Monitored</span><b>${p0(d.mon.n ? d.mon.on / d.mon.n : null)}</b><small>${fmt(d.mon.n - d.mon.on)} with platform checks only</small></div>
      <div class="kpi"><span>Open incidents</span><b>${d.incOpen.length}</b><small>${d.incOpen.filter(r => r.x[1] >= 2).length} high severity</small></div>
      <div class="kpi"><span>Time to fix</span><b>${dur(d.mttr)}</b><small>median, 60 days</small></div>
    </div>
    <div class="sec"><h2>DQ incidents</h2><span>Data Contracts · open and last 60 days, as of ${dd(INC_DATE)}</span></div>
    <div class="card tw"><table class="tbl fixed"><colgroup><col style="width:120px"><col><col style="width:110px"><col style="width:120px"><col style="width:100px"><col style="width:120px"></colgroup>
      <thead><tr><th>Severity</th><th>Data mart</th><th>Status</th><th>Started</th><th class="num">Duration</th><th></th></tr></thead><tbody>
      ${inc.map(({ o, x }) => `<tr data-o="${o.sub}:${o.t}:${o.name}"><td>${impChip(x[1])}</td><td class="nm" title="${o.name}">${o.name}<small>${o.down ? 'downstream: ' + downTxt(o) : fmt(o.pop) + ' views'}</small></td><td><span class="st"><i class="dot ${x[2] === 'd' ? 'ok' : x[2] === 'p' ? 'warn' : 'bad'}"></i>${ST_LABEL[x[2]]}</span></td><td>${dd(x[3])}, ${x[3].slice(11, 16)}</td><td class="num">${dur(ageH(x))}</td><td>${chatUrl(x) ? `<a class="tl" href="${chatUrl(x)}" target="_blank" rel="noopener">thread ↗</a>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" style="color:var(--ink3)">no incidents</td></tr>'}
    </tbody></table></div>
    <div class="sec"><h2>Late</h2><span>critical first, by Data Contracts tags</span></div>
    <div class="card tw"><table class="tbl fixed"><colgroup><col style="width:34px"><col><col style="width:150px"><col style="width:120px"><col style="width:140px"><col style="width:100px"></colgroup>
      <thead><tr><th></th><th>Data mart</th><th>Freshness</th><th>SLA</th><th class="num">Affected downstream</th><th class="num">Views</th></tr></thead><tbody>
      ${late.slice(0, 100).map(o => `<tr data-o="${o.sub}:${o.t}:${o.name}"><td><span class="dot ${sdot(o)}"></span></td><td class="nm" title="${o.name}">${o.name}<small>${o.chk[1][3] ? 'critical' : KIND1[o.t]}</small></td><td>${freshChip(o)}</td><td>${o.chk[1][2] != null ? `by ${o.chk[1][2]}:00` : '—'}</td><td class="num">${downTxt(o)}</td><td class="num">${fmt(o.pop)}</td></tr>`).join('') || '<tr><td colspan="6" style="color:var(--ink3)">all data marts updated on time</td></tr>'}
    </tbody></table></div>
    <div class="gap">Freshness is a data mart health score component as of ${dd(OPS_DATE)}, incidents as of ${dd(INC_DATE)}. SLA and criticality are contract tags in Data Contracts (sla-N is the hour by which the data mart must be ready). Incidents are tracked in Data Contracts and discussed in a Chat thread.</div>`;
}

// ---------- object panel ----------
// The portal only shows state: every failed check links to the tool where it is fixed.
const drawer = $('drawer'), scrim = $('scrim');
function closeDrawer() { drawer.classList.remove('open'); scrim.hidden = true; }
scrim.onclick = closeDrawer;
function openObj(o) {
  if (!o) return; const d = SUBS[o.sub], ch = checks(o), real = checksReal(o), fails = ch.filter(c => c[2] === false), known = ch.filter(c => c[2] != null), g = S.game.obj(o, d, S.kind[o.t]);
  drawer.classList.add('open'); scrim.hidden = false;
  $('dh').innerHTML = `<div class="k">${KIND1[o.t]}, ${d.l2}</div><h2>${o.name}</h2><button class="x" aria-label="Close">×</button>`;
  $('dh').querySelector('.x').onclick = closeDrawer;
  { const on = isCertO(o), log = CERT_LOG.find(x => x.o === o);
    $('dh').insertAdjacentHTML('beforeend', `<div class="certrow"><i class="gv${on ? ' key' : ''}">${gIco('crown')}</i><span><b>${on ? 'Certified' : 'Not certified'}</b><small>${log ? `changed at ${log.at}: a draft, not saved in the demo` : on ? 'recommended as a source of truth' : o.s >= 2 ? 'healthy, can be certified' : 'must pass health score checks first'}</small></span>${certBtn(o).replace('<span>Certified</span>', '<span>Remove certification</span>')}</div>`); }
  const x = o.chk?.[1] || [], open = o.inc.filter(isOpen), last = [...o.inc].sort((a, b) => b[3] < a[3] ? -1 : 1).slice(0, 5);
  const ops = o.t === 'dm' && o.chk ? `<div class="dsec"><span>Operations as of ${dd(OPS_DATE)}</span></div>
    <div class="kvv"><span>Freshness</span><b>${freshChip(o)}</b><span>SLA</span><b>${x[2] != null ? `by ${x[2]}:00${x[3] ? ', critical' : ''}` : x[3] ? 'critical' : 'not set'}</b><span>Checks</span><b>${monChip(o)}</b><span>Users</span><b>${x[6] != null ? fmt(x[6]) : '—'}</b></div>` : '';
  const inc = o.t === 'dm' && o.inc.length ? `<div class="dsec"><span>DQ incidents</span><span>${open.length ? `${open.length} open` : 'none open'}</span></div>
    ${last.map(i => `<div class="check"><i class="${isOpen(i) ? 'n' : 'y'}">${isOpen(i) ? '!' : '✓'}</i><div>${impChip(i[1])} ${ST_LABEL[i[2]]}<small>since ${dd(i[3])}, ${isOpen(i) ? 'open for' : 'lasted'} ${dur(ageH(i))}</small></div>${chatUrl(i) ? `<a class="tl" href="${chatUrl(i)}" target="_blank" rel="noopener">thread ↗</a>` : ''}</div>`).join('')}` : '';
  const down = o.down ? `<div class="dsec"><span>Affected downstream</span><span>Dashboards and warehouse</span></div>
    <div class="kvv"><span>Dashboards</span><b>${fmt(o.down[1])}</b><span>MAU of these dashboards</span><b>${fmt(o.down[3])}</b><span>Queries and datasets</span><b>${fmt(o.down[2])}</b><span>Warehouse objects</span><b>${fmt(o.down[0])}</b></div>
    ${o.down[4]?.length ? `<div class="dlist">${o.down[4].map(n => `<span title="${n}">${n}</span>`).join('')}</div>` : ''}` : '';
  $('db').innerHTML = `<div class="stat"><div><b>${fmt(o.pop)}</b><span>${UNIT[o.t]}</span></div><div><b><span class="dot ${sdot(o)}"></span> ${known.length - fails.length}/${known.length}</b><span>${st(o)}</span></div><div><b>${isHot(o) ? 'yes' : 'no'}</b><span>issue</span></div></div>
    <div class="dsec"><span>Health checks ${real ? `<span class="srcl">health score ${dd(OPS_DATE)}</span>` : MOCK}</span><span>${fails.length ? `${fails.length} failed` : 'all passed'}</span></div>
    ${ch.map(([n, ds, y]) => `<div class="check"><i class="${y === true ? 'y' : y === false ? 'n' : 'u'}">${y === true ? '✓' : y === false ? '×' : '–'}</i><div>${n}<small>${y == null ? 'no data' : ds}</small></div>${y === false ? tlink(fixLink(o, n)) : ''}</div>`).join('')}
    ${ops}${inc}${down}
    <div class="dsec"><span>Open in tool</span></div>
    <div class="acts2">${TOOL[o.t](o).map(x => plink(x)).join('')}${game(g, 'btn', 'game')}</div>`;
}

// ---------- Infracost: domain CPU and disk over 30 days ----------
function domInfra(u) {
  const subs = [...u.subs].filter(d => d.cpu || d.tb).sort((a, b) => (b.cpu || 0) - (a.cpu || 0)), sv = u.subs.map(d => ({ d, v: savings(d) }));
  const savAll = sv.reduce((t, x) => t + x.v.total, 0), dms = u.subs.flatMap(d => d.t.dm.filter(o => o.cost)).sort((a, b) => b.cost[0] - a.cost[0]).slice(0, 15);
  const kinds = {}; sv.forEach(({ v }) => v.groups.forEach(g => { const k = kinds[g.kind] ||= { short: g.short, n: 0, sav: 0, cpu: 0, gb: 0 }; k.n += g.items.length; k.sav += g.sav; k.cpu += g.cpu || 0; k.gb += g.gb || 0; }));
  const share = CPU_ALL ? u.cpu / CPU_ALL : 0, h = n => n >= 10 ? fmtK(n) : String(Math.round(n * 10) / 10);
  return `<div class="kpis">
      <div class="kpi hero"><span>CPU, 30 days</span><b>${u.cpu ? fmtK(u.cpu) + ' h' : '—'}</b><small>${(share * 100).toFixed(1)}% of all Harbor Market CPU · ${INFRA_PERIOD}</small></div>
      <div class="kpi"><span>Disk</span><b>${fmtStore(u.tb)}</b><small>average storage</small></div>
      <div class="kpi"><span>CPU per healthy object</span><b>${u.cpg == null ? '—' : fmtK(u.cpg) + ' h'}</b><small style="${u.cpg > CPG_P75 ? 'color:var(--bad)' : ''}">${u.cpg > CPG_P75 ? 'more than 75% of domains' : 'within normal range'}</small></div>
      <div class="kpi"><span>Possible savings</span><b class="okt">${savAll ? 'up to ' + fmtK(savAll) + ' h' : '—'}</b><small>${u.cpu ? Math.round(savAll / u.cpu * 100) + '% of domain CPU, estimate' : ''}</small></div>
      <div class="kpi"><span>No subdomain</span><b>${u.cpu ? pct(u.cpuNoSub, u.cpu) + '%' : '—'}</b><small>CPU not attributed to a subdomain</small></div>
    </div>
    <div class="sec"><h2>By subdomain</h2><span>CPU hours and disk over 30 days · savings estimated from Links findings</span></div>
    <div class="card tw"><table class="tbl"><thead><tr><th>${S.l2.one}</th><th>CPU</th><th class="num">Disk</th><th class="num">CPU per healthy</th><th class="num">Possible savings</th><th></th></tr></thead><tbody>
      ${subs.map(d => { const v = sv.find(x => x.d === d).v, mx = subs[0].cpu || 1; return `<tr data-s="${d.i}"><td class="nm">${d.l2}<small>${pct(d.all.good, d.all.n)}% healthy · ${fmt(d.all.n)} objects</small></td>
        <td><span class="pb"><i style="width:${(d.cpu || 0) / mx * 100}%"></i></span><b>${d.cpu ? fmtK(d.cpu) + ' h' : '—'}</b></td><td class="num">${fmtStore(d.tb)}</td><td class="num">${d.all.good && d.cpu ? fmtK(d.cpu / d.all.good) + ' h' : '—'}</td>
        <td class="num okt">${v.total ? 'up to ' + h(v.total) + ' h' : '—'}</td><td class="num"><a class="tl" href="graph.html?d=${d.i}&l=infra" onclick="event.stopPropagation()">Cost × value ↗</a></td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="grid2"><div><div class="sec"><h2>Most expensive data marts</h2><span>CPU over 30 days</span></div>
      <div class="card tw"><table class="tbl"><thead><tr><th>Data mart</th><th class="num">CPU</th><th class="num">Disk</th><th class="num">Usage</th><th class="num">CPU per view</th></tr></thead><tbody>
        ${dms.map(o => `<tr data-o="${o.sub}:${o.t}:${o.name}"><td class="nm"><span class="dot ${sdot(o)}"></span> ${o.name}<small>${SUBS[o.sub].l2}</small></td><td class="num">${h(o.cost[0])} h</td><td class="num">${o.cost[1] >= 1 ? fmt(o.cost[1]) + ' GB' : '—'}</td><td class="num">${fmt(useOf(o))}</td><td class="num">${h(o.cost[0] / Math.max(1, useOf(o)))}</td></tr>`).join('')}
      </tbody></table></div></div>
      <div><div class="sec"><h2>Where to save</h2><span>across all subdomains</span></div>
      <div class="card list">${Object.values(kinds).map(k => `<div class="it"><span class="dot ${k.sav ? 'ok' : 'warn'}"></span><span>${k.short}<small>${k.n} objects${k.cpu ? ` · ${fmtK(k.cpu)} h CPU` : ''}${k.gb ? ` · ${fmt(k.gb)} GB` : ''}</small></span><em>${k.sav ? '−' + h(k.sav) + ' h' : ''}</em></div>`).join('') || '<div class="it"><span></span><span>no findings</span><em></em></div>'}</div>
      <div class="gap">Source: platform billing, ${INFRA_PERIOD}: direct, shared and platform. Savings are estimated by the same rules as the Cost × value view in Links.</div></div></div>`;
}
// ---------- domain creation: a form prototype that writes nothing ----------
function pageNew() {
  const bps = [...new Map(SUBS.filter(d => d.people.bp?.n).map(d => [d.people.bp.n, d.people.bp])).values()].sort((a, b) => a.n.localeCompare(b.n));
  const sts = [...new Map(SUBS.filter(d => d.people.st?.n).map(d => [d.people.st.n, d.people.st])).values()].sort((a, b) => a.n.localeCompare(b.n));
  const opt = list => list.map(p => `<option>${p.n}</option>`).join('');
  return topHtml(`<a href="#/">Overview</a> / <b>New domain</b>`) + `<div class="page"><div class="hrow"><div class="grow"><h1>Create a domain</h1><p class="sub">The domain appears in the portal, the Insight Factories world and the ranking after approval and the first snapshot build.</p></div></div>
    <div class="grid2"><form class="card nf" id="nf">
      <label>Domain name<input id="nf-name" required placeholder="for example, Rentals"></label>
      <label>Business unit<input id="nf-bu" placeholder="for example, Auto vertical"></label>
      <label>Data owner, head of analytics<select id="nf-st"><option value="">choose</option>${opt(sts)}</select></label>
      <label>${S.roles.bp} (BI partner)<select id="nf-bp"><option value="">choose</option>${opt(bps)}</select></label>
      <label>Subdomains<textarea id="nf-subs" rows="3" placeholder="one per line"></textarea></label>
      <label>How to find domain objects<textarea id="nf-rules" rows="3" placeholder="data mart schemas and prefixes, dashboard tags, Semantic Layer namespaces"></textarea></label>
      <label>Control Plane workspace<input id="nf-ws" placeholder="organization → workspace"></label>
      <div class="acts"><button class="btn primary" type="submit">Send for approval</button><a class="btn" href="#/">Cancel</a></div>
      <div id="nf-out" class="gap" hidden></div></form>
      <div><div class="card nfp"><b>What gets created</b><ul><li>domain, subdomain and role records in the portal registry</li><li>domain and subdomain cabinets</li><li>an industrial zone in the world with offices for the data owner and BI partners</li><li>a row in the ranking and awards from next month</li><li>a digest for the BI partner in Chat</li></ul></div>
      <div class="card nfp stubc"><b>Placeholder: what it takes to work</b><ul><li>a domain and role registry in the portal itself, with storage and a write API; the portal becomes the source of domains, subdomains and roles</li><li>a one-time import of current domains and roles from the old Domain Registry, which is retired afterwards</li><li>consumers read the portal registry: the health score snapshot build, the Semantic Layer, the digest bot, Control Plane workspaces</li><li>rules that attribute objects to a domain are set here and feed the snapshot build</li><li>approval in the portal: the data owner and the Head of BI confirm the request, change history is kept in the registry</li></ul></div></div></div></div>`;
}
document.addEventListener('submit', e => { if (e.target.id !== 'nf') return; e.preventDefault(); const v = id => document.getElementById(id).value.trim(), out = document.getElementById('nf-out');
  const subs = v('nf-subs').split('\n').map(x => x.trim()).filter(Boolean);
  out.hidden = false; out.innerHTML = `<b>Request prepared. This is a prototype, nothing was sent.</b><br>Domain ${v('nf-name') || '(untitled)'}, data owner ${v('nf-st') || 'not chosen'}, ${S.roles.bp.toLowerCase()} ${v('nf-bp') || 'not chosen'}, ${subs.length} ${plural(subs.length, 'subdomain', 'subdomains')}.`; });
// ---------- onboarding for the production manager (BI partner) ----------
function onbSteps(d) {
  const dm = d.t.dm, n = dm.length, okc = (o, name) => checks(o).find(c => c[0] === name)?.[2], sh = (a, f) => a.length ? a.filter(f).length / a.length : null;
  const OWNER_CHECK = CHECKS.dm.find(c => c[0] === 'owner')?.[1], owner = sh(dm, o => okc(o, OWNER_CHECK) !== false), mon = d.mon.n ? d.mon.on / d.mon.n : null, keym = d.t.met.filter(o => o.key), keyOk = sh(keym, o => ok(o.s)), dashOk = sh(d.t.dash, o => ok(o.s));
  const st = v => v == null ? 'none' : v >= 0.8 ? 'done' : v > 0 ? 'prog' : 'todo', p = v => v == null ? '—' : Math.round(v * 100) + '%';
  return [
    ['BI partner role in the portal registry', has(d, 'bp') ? 'done' : 'todo', has(d, 'bp') ? who(d, 'bp') : 'not assigned', 'The assignment in the portal Domain Registry drives the cabinet, the digest and the factory office.', null],
    ['Staff: data owner, metrics curator, AI champion', ['st', 'cur', 'ai'].every(k => has(d, k)) ? 'done' : ['st', 'cur', 'ai'].some(k => has(d, k)) ? 'prog' : 'todo', ['st', 'cur', 'ai'].filter(k => has(d, k)).length + ' of 3', 'Agree on the roles and record them in the portal Domain Registry.', null],
    ['Data mart owners', st(owner), p(owner), 'Every data mart has an active owner in the Data Catalog.', null],
    ['Business checks on data marts', st(mon), `${d.mon.on} of ${d.mon.n}`, 'A minimal contract in Data Contracts: keys, nulls, freshness against SLA.', null],
    ['Key metrics are healthy', st(keyOk), keym.length ? `${keym.filter(o => ok(o.s)).length} of ${keym.length}` : 'no key metrics', 'Metrics with the key badge in the Semantic Layer pass the health score.', null],
    ['Dashboards on healthy data', st(dashOk), p(dashOk), 'Dashboards built on datasets, datasets described and certified.', null],
    ['Knowledge Base skill published', d.skill ? 'done' : 'todo', d.skill ? 'yes' : 'no', 'A skill with the domain business logic for AI agents, the basis of level L2.', null],
    ['Golden set of at least 30 cases', (d.ards?.gs || 0) >= 30 ? 'done' : (d.ards?.gs || 0) > 0 ? 'prog' : 'todo', `${d.ards?.gs ?? 0} cases · ${MOCK_O}`, 'Business questions with reference answers for evals.', null],
    ['Weekly digest subscription', 'na', 'preview', 'Three top actions for the subdomain once a week in Chat.', '#/digest'],
  ];
}
function pageOnb(d0) {
  const mine = MINE.filter(d => d.people.bp?.l === ME), d = d0 || mine[0] || SUBS.filter(x => x.all.n).sort((a, b) => b.all.n - a.all.n)[0], steps = onbSteps(d), done = steps.filter(s => s[1] === 'done').length, tot = steps.filter(s => s[1] !== 'na' && s[1] !== 'none').length;
  const IC2 = { done: '✓', prog: '◐', todo: '○', na: '·', none: '·' }, STEP_LABEL = { done: 'done', prog: 'in progress', todo: 'not started', na: 'optional', none: 'no objects' };
  return topHtml(`<a href="#/">Overview</a> / <b>Onboarding</b>`) + `<div class="page"><div class="hrow"><div class="grow"><h1>Onboarding: ${S.roles.bp.toLowerCase()} (BI partner)</h1><p class="sub">What to do in the first weeks so the subdomain is under control and grows on AI-Ready. Statuses come from portal data.</p></div>
      <label class="onbsel">${S.l2.one}<select id="onbsub">${SUBS.filter(x => x.all.n).sort((a, b) => a.l2.localeCompare(b.l2)).map(x => `<option value="${x.i}"${x === d ? ' selected' : ''}>${x.l2} · ${x.l1}</option>`).join('')}</select></label></div>
    <div class="card onbh"><div><b>${done} of ${tot}</b><span>steps done · ${d.l2}, ${d.l1}</span></div><div class="goal"><i style="width:${tot ? done / tot * 100 : 0}%;background:var(--accent)"></i></div>
      <a class="btn" href="#/s/${d.i}">Subdomain cabinet</a><a class="btn" href="#" data-demo>BI onboarding checklist</a></div>
    <div class="sec"><h2>Explore the factory</h2><span>videos and tours, 20–30 minutes</span></div>
    <div class="card learn">${[
      ['▶', 'Video: portal tour', 'Cabinet, AI-Ready, links and 3D on the Cars example · not recorded for the demo', null],
      ['⌖', 'Factory tour', `14 guided stops at the ${d.l2} factory: raw materials, workshops, defects, metric warehouses, shipping, office, suppliers and consumers`, `domain.html?d=${d.i}&tour=1`],
      ['◎', 'Insight Factories world', 'Find your industrial zone, data suppliers and consumers, open the domain ranking', `world.html?s=${d.i}`],
      ['☰', 'Subdomain cabinet', 'Overview, AI-Ready Score, Infracost and Reliability tabs: what to check every week', `#/s/${d.i}`],
      ['⇄', 'Links', 'Three views of the same data: cost × value, graph, view flow', `graph.html?d=${d.i}`],
      ['▶', 'Videos by section', 'Short clips about each tab and the fixer agent, to be recorded', null],
    ].map(([ic, t, why, url, ext]) => `<${url ? `a href="${url}"${ext ? ' target="_blank" rel="noopener"' : ''}` : 'div'} class="lr2${url ? '' : ' off'}"><i>${ic}</i><span><b>${t}</b><small>${why}</small></span><em>${url ? (ext ? 'watch ↗' : 'open →') : 'placeholder'}</em></${url ? 'a' : 'div'}>`).join('')}</div>
    <div class="sec"><h2>Onboarding steps</h2><span>statuses from portal data</span></div>
    <div class="card onb">${steps.map(([t, s, now, why, url], k) => `<div class="os ${s}"><i>${IC2[s]}</i><div><b>${k + 1}. ${t}</b><small>${why}</small></div><span><em>${STEP_LABEL[s]}</em>${now}</span>${url ? `<a class="tl" href="${url}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>open ${url.startsWith('http') ? '↗' : '→'}</a>` : '<span></span>'}</div>`).join('')}</div>
    <div class="gap">Golden set is ${MOCK_O}. The digest subscription and marking a step done by hand are placeholders: they need onboarding state storage and a Chat bot.</div></div>`;
}
document.addEventListener('change', e => { if (e.target.id === 'onbsub') location.hash = `#/onboarding/${e.target.value}`; });

function parse() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?'), p = path.split('/').filter(Boolean), q = Object.fromEntries(new URLSearchParams(qs || ''));
  // old addresses of embedded 3D modes (#/valley, #/map, #/s/<i>/3d, #/s/<i>/factory) redirect to game pages
  if (p[0] === 'valley' || p[0] === 'map') return { page: 'go', url: q.u ? S.game.redirect.l1(q) : S.game.redirect.home() };
  if (p[0] === 'hot') return { page: 'hot', q };
  if (p[0] === 'me') return { page: 'me', q };
  if (p[0] === 'digest') return { page: 'digest', q };
  if (p[0] === 'd' && domOf(dec(p[1] || ''))) return { page: 'dom', dom: domOf(dec(p[1])), tab: p[2] || '', q };
  if (p[0] === 'new') return { page: 'new', q };
  if (p[0] === 'onboarding') return { page: 'onb', sub: SUBS[+p[1]] || null, q };
  if (p[0] === 's' && SUBS[+p[1]] && ['3d', 'factory'].includes(p[2])) return { page: 'go', url: S.game.redirect.l2(SUBS[+p[1]], q) };
  if (p[0] === 's' && SUBS[+p[1]]) return { page: 'sub', sub: SUBS[+p[1]], tab: p[2] || '', q };
  return { page: 'home', q };
}
function setQ(patch) { const r = parse(), [path] = location.hash.slice(1).split('?'); const q = new URLSearchParams({ ...r.q, ...patch }); [...q].forEach(([k, v]) => { if (!v || v === 'all') q.delete(k); }); location.hash = path + (q.toString() ? '?' + q : ''); }
let lastPath = null;
function route() {
  const r = parse(), path = location.hash.split('?')[0];
  if (r.page === 'go') { location.replace(r.url); return; }
  navHtml(r); closeDrawer();
  let out = { html: '' };
  if (r.page === 'hot') out.html = pageHot(r);
  else if (r.page === 'me') out.html = pageMe();
  else if (r.page === 'digest') out.html = pageDigest();
  else if (r.page === 'dom') out.html = pageDom(r.dom, r.tab, r);
  else if (r.page === 'new') out.html = pageNew();
  else if (r.page === 'onb') out.html = pageOnb(r.sub);
  else if (r.page === 'sub') out = pageSub(r.sub, r.tab, r);
  else out.html = pageHome();
  const keepFocus = document.activeElement?.id === 'fq' && path === lastPath;
  main.className = 'main'; main.innerHTML = out.html; applyDefs(main);
  // small footer: market references the screen was built on
  { const SUBREF = { '': ['D1', 'D6', 'G4'], ards: ['G4'], ai: ['D2'], met: ['D3'], gl: ['D10'], dm: ['D4', 'G1'], dash: ['D5'], ops: ['G1', 'G2', 'G3'], infra: ['F3'] };
    const ids = r.page === 'home' ? ['B1', 'B2', 'B3', 'G4'] : r.page === 'hot' ? ['B3'] : r.page === 'me' ? ['B4'] : r.page === 'digest' ? ['G5'] : r.page === 'onb' ? ['D7', 'D8'] : r.page === 'new' ? ['A1', 'C1']
      : r.page === 'dom' ? (r.tab === 'infra' ? ['F3', 'C1'] : r.tab ? (SUBREF[r.tab] || ['C1']) : ['C1', 'C2', 'G4']) : r.page === 'sub' ? (SUBREF[r.tab] || ['D1']) : ['A1'];
    const pg = main.querySelector('.page'); if (pg) refFooter(ids, pg); }
  // agent: on one object or on the first ten issues of a list
  const objBy = v => { const [i, t, ...n] = v.split(':'); return SUBS[+i].t[t].find(o => o.name === n.join(':')); };
  const rev = d => d && has(d, 'bp') ? `BI partner ${who(d, 'bp')}` : 'BI partner';
  main.querySelectorAll('[data-agent]').forEach(b => b.onclick = e => { e.stopPropagation(); const o = objBy(b.dataset.agent); runAgent([o], { reviewer: rev(SUBS[o.sub]) }); });
  main.querySelectorAll('[data-agent-list]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.agentList;
    if (k === 'hot') runAgent([...main.querySelectorAll('tr[data-o]')].slice(0, 10).map(tr => objBy(tr.dataset.o)), { title: 'Agent on the issue list' });
    else { const d = SUBS[+k.split(':')[1]]; runAgent(mixHot(d.hotList, 10), { title: `Agent on ${d.l2} issues`, reviewer: rev(d) }); } }); if (path !== lastPath) main.scrollTop = 0; lastPath = path;
  bindSearch();
  main.querySelectorAll('tr[data-d]').forEach(tr => tr.onclick = () => location.hash = `#/d/${tr.dataset.d}`);
  main.querySelectorAll('[data-o]').forEach(el => el.onclick = () => { const [i, t, ...n] = el.dataset.o.split(':'); openObj(SUBS[+i].t[t].find(o => o.name === n.join(':'))); });
  main.querySelectorAll('[data-tab]').forEach(el => el.onclick = () => location.hash = `#/s/${r.sub.i}${el.dataset.tab ? '/' + el.dataset.tab : ''}`);
  main.querySelectorAll('[data-f]').forEach(b => b.onclick = () => setQ({ f: b.dataset.f }));
  main.querySelectorAll('[data-hot]').forEach(b => b.onclick = () => setQ({ t: b.dataset.hot }));
  main.querySelectorAll('[data-mine]').forEach(b => b.onclick = () => setQ({ m: b.dataset.mine }));
  main.querySelectorAll('th[data-s]').forEach(h => h.onclick = () => setQ({ s: h.dataset.s }));
  main.querySelectorAll('tr[data-s]').forEach(t => t.onclick = () => { location.hash = `#/s/${t.dataset.s}`; });
  main.querySelectorAll('[data-glf]').forEach(b => b.onclick = () => setQ({ st: b.dataset.glf, t: '' }));
  main.querySelectorAll('[data-glagent]').forEach(b => b.onclick = () => glAgent(SUBS[+b.dataset.glagent]));
  main.querySelectorAll('[data-fc]').forEach(b => b.onclick = e => { e.stopPropagation(); const [i, tid, k] = b.dataset.fc.split('|'), T = glossOf(SUBS[+i]).terms.find(x => x.id === tid); if (!T) return; T.first ||= new Set(); T.first.has(k) ? T.first.delete(k) : T.first.add(k); route(); });
  const tmEl = main.querySelector('#tm3d'); if (tmEl && TM_DATA) { const D = TM_DATA; import('./glmap3d.js?v=100').then(m => { tmEl.innerHTML = ''; m.mountTermMap(tmEl, { ...D, onOpen: id => { const n = D.nodes.find(x => x.id === id); location.hash = `#/s/${n?.sub ?? D.d.i}/gl?t=${id}`; }, onEdit: id => { const n = D.nodes.find(x => x.id === id); location.hash = `#/s/${n?.sub ?? D.d.i}/gl?t=${id}&edit=1`; } }); }); }
  const hd = $('hd'); if (hd) hd.onchange = () => setQ({ d: hd.value });
  const fq = $('fq'); if (fq) { fq.oninput = () => { clearTimeout(fq._t); fq._t = setTimeout(() => setQ({ q: fq.value }), 250); }; if (keepFocus) { fq.focus(); fq.setSelectionRange(fq.value.length, fq.value.length); } }
  document.title = r.page === 'sub' ? `${r.sub.l2} · ${S.brand}` : r.page === 'dom' ? `${r.dom.name} · ${S.brand}` : S.brand;
}
addEventListener('hashchange', route);
addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('q')?.focus(); } });
route();
