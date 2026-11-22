// Synthetic data generator for the Insight Factories open demo (fictional company "Harbor Market").
// Writes every module the app imports from app/data/: data.js, names.js, trend.js, ops.js, infra.js, cost.js, graph.js, keymet.js, o3.js.
// Node 20+, ESM, no dependencies. Deterministic: the same seed gives byte-identical output.
// Run from anywhere:  node pipeline/generate.mjs [seed]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'app', 'data');
const SEED = Number(process.argv[2] ?? 4) >>> 0;

// ---------- seeded PRNG and helpers ----------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);
const U = (a, b) => a + (b - a) * rnd();
const ri = (a, b) => Math.floor(U(a, b + 1));
const chance = p => rnd() < p;
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const lognorm = (mu, sigma) => Math.exp(mu + sigma * gauss());
const wpick = (items, w) => { const W = items.reduce((t, x, i) => t + w(x, i), 0); let r = rnd() * W; for (let i = 0; i < items.length; i++) { r -= w(items[i], i); if (r <= 0) return items[i]; } return items[items.length - 1]; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const r1 = v => Math.round(v * 10) / 10;
const cap = s => s[0].toUpperCase() + s.slice(1);
const slugOf = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// ---------- dates ----------
const SNAPSHOT = '2026-10-12';
const INC_DATE = '2026-10-15';
const DAY = 864e5;
const iso = t => new Date(t).toISOString().slice(0, 10);
const TREND_DATES = Array.from({ length: 9 }, (_, k) => iso(Date.parse(SNAPSHOT) - (8 - k) * 7 * DAY));
const O3_WEEKS = [iso(Date.parse(SNAPSHOT) - 28 * DAY), iso(Date.parse(SNAPSHOT) - 7 * DAY)];
const PERIOD = 'Sep 13 – Oct 12, 2026';

// ---------- company structure ----------
// h — base health share; drift — change of health share over the 8 trend weeks; vol — object volume;
// mix — type multipliers [dash, met, dm]; ai — share of non-analysts using AI analytics; mon — share of data marts with business checkers;
// cpu — infra intensity; pop — popularity multiplier; supply — weight as a cross-domain data supplier; gov — governance pattern
const D = [
  { l1: 'Goods', slug: 'goods', h: 0.44, drift: 0.02, vol: 1.6, mix: [1, 1, 1.1], ai: 0.24, mon: 0.42, cpu: 1.3, pop: 1.4, supply: 1.6, mat: 0.7,
    ent: ['listing', 'item', 'seller', 'buyer', 'order', 'cart', 'category', 'price', 'stock', 'search', 'contact', 'view', 'favorite', 'shipment'],
    subs: [['Marketplace', 'marketplace', ['order', 'cart', 'checkout_step']], ['Classifieds', 'classifieds', ['listing', 'contact', 'view']], ['Logistics', 'logistics', ['shipment', 'warehouse', 'stock']],
      ['Catalog Quality', 'catalog', ['category', 'attribute', 'duplicate']], ['Seller Tools', 'seller_tools', ['seller', 'bulk_upload', 'feed']], ['Pricing Insights', 'pricing', ['price', 'discount', 'benchmark']]] },
  { l1: 'Auto', slug: 'auto', h: 0.40, drift: 0.08, vol: 1.0, mix: [1, 0.9, 1], ai: 0.2, mon: 0.38, cpu: 1.0, pop: 1.0, supply: 0.4, mat: 0.6,
    ent: ['car', 'vehicle', 'dealer', 'listing', 'lead', 'inspection', 'valuation', 'contact', 'view', 'model', 'brand'],
    subs: [['Cars', 'cars', ['car', 'listing', 'brand']], ['Auto Parts', 'auto_parts', ['part', 'compatibility', 'order']], ['Dealers', 'dealers', ['dealer', 'lead', 'tariff']],
      ['Vehicle History', 'vehicle_history', ['vin', 'report', 'mileage']], ['Commercial Vehicles', 'trucks', ['truck', 'machinery', 'lead']]] },
  { l1: 'Real Estate', slug: 're', h: 0.39, drift: 0.0, vol: 1.0, mix: [1.1, 0.8, 1], ai: 0.18, mon: 0.3, cpu: 0.9, pop: 1.0, supply: 0.3, mat: 0.5,
    ent: ['property', 'listing', 'lead', 'agency', 'viewing', 'contract', 'price', 'district', 'contact', 'view'],
    subs: [['Rentals', 'rentals', ['rental', 'tenant', 'landlord']], ['Sales', 'property_sales', ['deal', 'apartment', 'house']], ['Short-Term Stays', 'stays', ['booking', 'host', 'guest', 'night']],
      ['Agencies', 'agencies', ['agency', 'agent', 'tariff']], ['New Builds', 'new_builds', ['developer', 'project', 'lead']], ['Mortgages', 'mortgages', ['mortgage', 'application']]] },
  { l1: 'Jobs', slug: 'jobs', h: 0.38, drift: 0.04, vol: 0.75, mix: [1, 0.9, 1], ai: 0.15, mon: 0.28, cpu: 0.8, pop: 0.9, supply: 0.3, mat: 0.45,
    ent: ['vacancy', 'resume', 'applicant', 'employer', 'response', 'interview', 'hire', 'view', 'contact'],
    subs: [['Job Seekers', 'job_seekers', ['resume', 'applicant', 'response']], ['Employers', 'employers', ['employer', 'vacancy', 'tariff']], ['Gig Work', 'gigs', ['gig', 'shift', 'worker', 'payout']],
      ['Recruiting Tools', 'recruiting', ['ats', 'pipeline_stage']]] },
  { l1: 'Services', slug: 'services', h: 0.26, drift: 0.15, vol: 0.6, mix: [1.1, 0.8, 0.9], ai: 0.12, mon: 0.22, cpu: 0.6, pop: 0.8, supply: 0.2, mat: 0.35,
    ent: ['provider', 'booking', 'request', 'quote', 'review', 'specialist', 'appointment', 'order', 'contact'],
    subs: [['Home Services', 'home_services', ['request', 'quote', 'specialist']], ['Beauty', 'beauty', ['appointment', 'salon', 'master']], ['Repairs', 'repairs', ['request', 'quote', 'repair']],
      ['Business Services', 'b2b_services', ['company', 'contract', 'quote']]] },
  { l1: 'Payments', slug: 'payments', h: 0.62, drift: 0.12, vol: 1.1, mix: [1, 1.1, 1.1], ai: 0.46, mon: 0.62, cpu: 1.2, pop: 1.2, supply: 1.0, mat: 0.85,
    ent: ['payment', 'transaction', 'wallet', 'refund', 'payout', 'dispute', 'chargeback', 'fee', 'card', 'balance'],
    subs: [['Checkout', 'checkout', ['checkout', 'payment', 'order']], ['Wallet', 'wallet', ['wallet', 'balance', 'topup']], ['Buyer Protection', 'buyer_protection', ['dispute', 'claim', 'refund']],
      ['Payouts', 'payouts', ['payout', 'seller', 'settlement']], ['Installments', 'installments', ['installment', 'loan', 'approval']]] },
  { l1: 'Delivery', slug: 'delivery', h: 0.2, drift: -0.10, vol: 0.75, mix: [1, 0.8, 1.2], ai: 0.08, mon: 0.18, cpu: 1.1, pop: 0.9, supply: 0.4, mat: 0.3,
    ent: ['parcel', 'courier', 'delivery', 'pickup', 'return', 'route', 'shipment', 'sla', 'order'],
    subs: [['Last Mile', 'last_mile', ['courier', 'route', 'slot']], ['Pickup Points', 'pickup_points', ['pickup_point', 'parcel', 'storage']], ['Returns', 'returns', ['return', 'reason', 'refund']],
      ['Courier Network', 'courier_network', ['courier', 'partner', 'capacity']]] },
  { l1: 'Trust & Safety', slug: 'trust', h: 0.50, drift: 0.10, vol: 0.85, mix: [0.9, 1, 1.1], ai: 0.32, mon: 0.55, cpu: 1.0, pop: 0.9, supply: 0.6, mat: 0.7,
    ent: ['moderation', 'review', 'rating', 'fraud', 'account', 'report', 'ban', 'verification', 'risk', 'complaint'],
    subs: [['Moderation', 'moderation', ['moderation', 'queue', 'decision']], ['Fraud', 'fraud', ['fraud', 'risk_score', 'blocked_payment']], ['Ratings and Reviews', 'reviews', ['review', 'rating', 'reply']],
      ['Identity', 'identity', ['verification', 'document', 'account']], ['Account Security', 'account_security', ['login', 'takeover', 'session']]] },
  { l1: 'Ads', slug: 'ads', h: 0.35, drift: -0.05, vol: 0.9, mix: [1, 1.1, 0.9], ai: 0.15, mon: 0.3, cpu: 1.1, pop: 1.0, supply: 0.4, mat: 0.5,
    ent: ['campaign', 'impression', 'click', 'promotion', 'auction', 'bid', 'budget', 'advertiser', 'placement', 'revenue'],
    subs: [['Seller Promotion', 'promotion', ['promotion', 'boost', 'package']], ['Display Ads', 'display_ads', ['banner', 'impression', 'advertiser']], ['Ad Pricing', 'ad_pricing', ['bid', 'auction', 'price']],
      ['Ad Measurement', 'ad_measurement', ['attribution', 'lift']]] },
  { l1: 'Messaging', slug: 'messaging', h: 0.13, drift: -0.02, vol: 0.5, mix: [1, 0.6, 1], ai: 0.06, mon: 0.12, cpu: 0.7, pop: 0.8, supply: 0.3, mat: 0.2,
    ent: ['chat', 'message', 'call', 'notification', 'push', 'email', 'thread', 'reply', 'conversation'],
    subs: [['Chat', 'chat', ['chat', 'message', 'reply']], ['Calls', 'calls', ['call', 'missed_call', 'duration']], ['Notifications', 'notifications', ['push', 'email', 'delivery_rate']]] },
  { l1: 'Growth', slug: 'growth', h: 0.34, drift: -0.08, vol: 1.0, mix: [1.2, 1, 0.9], ai: 0.2, mon: 0.25, cpu: 0.9, pop: 1.1, supply: 0.5, mat: 0.5,
    ent: ['install', 'session', 'user', 'cohort', 'retention', 'campaign', 'channel', 'segment', 'attribution', 'visit'],
    subs: [['Acquisition', 'acquisition', ['install', 'channel', 'attribution']], ['Retention', 'retention', ['cohort', 'retention', 'churn']], ['CRM', 'crm', ['campaign', 'segment', 'send']],
      ['Brand Marketing', 'brand', ['awareness', 'survey', 'media']], ['Referral', 'referral', ['referral', 'invite', 'reward']]] },
  { l1: 'Data Platform', slug: 'platform', h: 0.7, drift: 0.05, vol: 0.85, mix: [1.1, 0.4, 1.8], ai: 0.55, mon: 0.6, cpu: 1.6, pop: 1.0, supply: 2.6, mat: 0.9,
    ent: ['pipeline', 'job', 'table', 'experiment', 'assignment', 'dataset', 'query', 'freshness', 'checker', 'event'],
    subs: [['Pipelines', 'pipelines', ['pipeline', 'job', 'run']], ['Data Apps', 'data_apps', ['app', 'query', 'user']], ['Experimentation', 'experiments', ['experiment', 'assignment', 'exposure']],
      ['Data Quality', 'data_quality', ['checker', 'incident', 'contract']], ['ML Features', 'ml_features', ['feature', 'model']]] },
  { l1: 'Core', slug: 'core', h: 0.8, drift: 0.03, vol: 1.2, mix: [0.9, 2.4, 0.9], ai: 0.55, mon: 0.7, cpu: 1.3, pop: 1.8, supply: 3.0, mat: 0.95,
    ent: ['gmv', 'revenue', 'buyer', 'seller', 'listing', 'user', 'order', 'deal', 'kpi', 'target', 'audience'],
    subs: [['Core Metrics', 'core_metrics', ['user', 'buyer', 'seller', 'deal']], ['Executive Reporting', 'exec', ['kpi', 'target', 'plan']], ['Finance Reporting', 'finance', ['revenue', 'cost', 'margin']],
      ['Company Planning', 'planning', ['plan', 'forecast']]] },
];
// subdomains without objects (empty states) and governance gaps (L0 cases)
const EMPTY = new Set(['Real Estate|Mortgages', 'Jobs|Recruiting Tools', 'Ads|Ad Measurement', 'Data Platform|ML Features', 'Core|Company Planning']);
const NO_BP_DOMAIN = new Set(['Messaging']);                         // no BI partner anywhere
const NO_ST = new Set(['Delivery|Returns', 'Delivery|Courier Network', 'Services|Repairs']);   // no data owner
const NO_BP = new Set(['Growth|Brand Marketing', 'Real Estate|Agencies']);

const SUBS = [];
D.forEach((d, di) => d.subs.forEach(([l2, slug, kw]) => SUBS.push({ i: SUBS.length, d, di, l1: d.l1, l2, slug, kw, key: d.l1 + '|' + l2, empty: EMPTY.has(d.l1 + '|' + l2) })));

// ---------- people ----------
const FIRST = ['Amara', 'Lucas', 'Priya', 'Mateo', 'Hana', 'Jonas', 'Leila', 'Tomas', 'Ines', 'Kofi', 'Mei', 'Daniel', 'Sofia', 'Arjun', 'Freya', 'Omar', 'Yuki', 'Elena', 'Rafael', 'Noor',
  'Felix', 'Camila', 'Kwame', 'Astrid', 'Diego', 'Aisha', 'Henrik', 'Lina', 'Marco', 'Zara', 'Emeka', 'Clara', 'Ravi', 'Maya', 'Pablo', 'Sanna', 'Tariq', 'Ingrid', 'Luca', 'Ayumi',
  'Nadia', 'Samuel', 'Elif', 'Bruno', 'Keiko', 'Aaron', 'Fatima', 'Oskar', 'Lucia', 'Dev', 'Greta', 'Hugo', 'Imani', 'Joao', 'Linnea', 'Malik', 'Nina', 'Paulo', 'Rosa', 'Theo'];
const LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Haddad', 'Fischer', 'Alvarez', 'Nakamura', 'Mensah', 'Kowalczyk', 'Brennan', 'Sato', 'Varga', 'Costa', 'Iyer', 'Novak', 'Ferreira', 'Holm',
  'Adeyemi', 'Rossi', 'Kaur', 'Dubois', 'Jensen', 'Mwangi', 'Ortega', 'Park', 'Weber', 'Santos', 'Bakker', 'Aziz', 'Laine', 'Quinn', 'Reyes', 'Schmidt', 'Takahashi', 'Vos', 'Wright', 'Yilmaz',
  'Zhou', 'Abara', 'Berg', 'Castillo', 'Dahl', 'Eriksen', 'Gallo', 'Hoffman', 'Ito', 'Kariuki', 'Lund', 'Meyer', 'Nilsen', 'Osei', 'Petrov', 'Romero', 'Sandoval', 'Torres', 'Ueda', 'Valdez'];
const TITLES = {
  st: ['Head of Analytics', 'Director of Analytics', 'Analytics Lead', 'VP of Data', 'Head of Product Analytics', 'Director of Business Intelligence'],
  bp: ['Senior BI Developer', 'BI Developer', 'Lead BI Developer', 'Analytics Team Lead', 'Senior Data Analyst', 'BI Engineer'],
  cur: ['Product Analyst', 'Senior Product Analyst', 'Data Analyst', 'Metrics Analyst', 'Senior Analyst'],
  ai: ['Analytics Engineer', 'Senior Data Scientist', 'ML Engineer', 'Product Analyst', 'AI Analytics Lead', 'Data Scientist'],
};
const PEOPLE = []; const usedNames = new Set(), usedLogins = new Set();
function person(role) {
  let n; do { n = pick(FIRST) + ' ' + pick(LAST); } while (usedNames.has(n)); usedNames.add(n);
  const [f, l] = n.split(' '); let login = (f[0] + l).toLowerCase(), k = 2; while (usedLogins.has(login)) login = (f.slice(0, k++) + l).toLowerCase(); usedLogins.add(login);
  const p = { id: 'p' + (PEOPLE.length + 1), l: login, n, p: pick(TITLES[role]) }; PEOPLE.push(p); return p;
}

// roles per subdomain: one data owner per domain (two in big domains), BI partners cover 1–3 subdomains, curators and AI champions with vacancies
D.forEach(d => {
  const subs = SUBS.filter(s => s.d === d);
  const owners = [person('st')]; if (subs.length >= 5 && chance(0.5)) owners.push(person('st'));
  const bps = []; const nbp = Math.max(1, Math.round(subs.length / U(1.4, 2.2))); for (let k = 0; k < nbp; k++) bps.push(person('bp'));
  const curs = [person('cur'), ...(subs.length >= 4 ? [person('cur')] : [])];
  subs.forEach((s, k) => {
    s.people = {};
    if (!NO_ST.has(s.key)) s.people.st = owners[k % owners.length];
    if (!NO_BP_DOMAIN.has(d.l1) && !NO_BP.has(s.key)) s.people.bp = bps[k % bps.length];
    if (chance(0.25 + 0.6 * d.mat)) s.people.cur = curs[k % curs.length];
    if (chance(0.15 + 0.6 * d.mat)) s.people.ai = person('ai');
  });
});
// one AI champion is assigned in the snapshot but missing from the registry: the UI shows "assigned, name not found"
const ghost = SUBS.find(s => s.l1 === 'Jobs' && !s.people.ai); if (ghost) ghost.ghostAi = 'p' + (900 + ghost.i);

// ---------- object volumes ----------
const TOTAL = [2500, 6000, 2500];   // dash, met, dm
const live = SUBS.filter(s => !s.empty);
live.forEach(s => { const base = s.d.vol * lognorm(0, 0.55); s.w = s.d.mix.map(m => base * m * lognorm(0, 0.3)); if (chance(0.08)) s.w[1] = 0; });
// a couple of subdomains with a single kind of object
live.find(s => s.key === 'Growth|Brand Marketing').w = [live.find(s => s.key === 'Growth|Brand Marketing').w[0], 0, 0];
live.find(s => s.key === 'Delivery|Pickup Points').w[1] = 0;
[0, 1, 2].forEach(t => { const W = live.reduce((a, s) => a + s.w[t], 0); live.forEach(s => { s.n = s.n || [0, 0, 0]; s.n[t] = Math.round(TOTAL[t] * s.w[t] / W); }); });
live.forEach(s => { s.h = clamp(s.d.h + gauss() * 0.06, 0.04, 0.88); s.drift = s.d.drift + gauss() * 0.03; s.skill = chance(0.15 + 0.75 * s.d.mat) ? 1 : 0; });

// ---------- names ----------
const PL = { category: 'categories', property: 'properties', delivery: 'deliveries', inquiry: 'inquiries', search: 'searches', status: 'statuses', analysis: 'analyses', gmv: 'gmv', sla: 'sla', kpi: 'kpis' };
const plural = w => PL[w] || (/(s|x|ch|sh)$/.test(w) ? w + 'es' : w.endsWith('y') && !/[aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's');
const used = { dm: new Set(), met: new Set(), dash: new Set() };
const uniq = (set, make) => { for (let k = 0; k < 40; k++) { const n = make(); if (!set.has(n)) { set.add(n); return n; } } let n = make(), v = 2; while (set.has(n + '_v' + v)) v++; set.add(n + '_v' + v); return n + '_v' + v; };
const entsOf = s => [...s.kw, ...s.kw, ...s.d.ent];
const QUAL = ['events', 'facts', 'agg', 'funnel', 'cohort', 'snapshot', 'stats', 'by_category', 'by_region', 'by_channel', 'enriched', 'history', 'sessions', 'attribution', 'quality', 'costs', 'segments'];
const GRAIN = ['daily', 'daily', 'daily', 'weekly', 'monthly', 'hourly', ''];
function dmName(s) { return uniq(used.dm, () => {
  const schema = wpick(['dm', 'dds', 'cdm', 'mart'], x => ({ dm: 6, dds: 2, cdm: 1, mart: 1 })[x]);
  const prefix = chance(0.55) ? s.slug : s.d.slug, e = pick(entsOf(s)), q = chance(0.6) ? pick(QUAL) : '', g = pick(GRAIN);
  return schema + '.' + [prefix, e, q, g].filter(Boolean).join('_'); }); }
const ADJ = ['active', 'new', 'returning', 'paying', 'unique', 'churned', 'engaged', 'first_time'];
const ACTORS = new Set(['buyer', 'seller', 'user', 'dealer', 'applicant', 'employer', 'courier', 'advertiser', 'host', 'guest', 'provider', 'specialist', 'worker', 'tenant', 'landlord',
  'agent', 'agency', 'company', 'account', 'master', 'salon', 'developer', 'partner', 'audience']);
const WIN = ['1d', '7d', '28d', '30d', '90d', 'mtd', 'ytd'];
const MEAS = ['count', 'conversion', 'ctr', 'share', 'rate', 'avg_price', 'gmv', 'gmv_net', 'revenue', 'revenue_net', 'avg_check', 'median_time', 'p90_time', 'cancel_rate', 'refund_rate',
  'per_user', 'per_session', 'depth', 'nps', 'ltv', 'cac', 'margin', 'sla_hit_rate', 'response_rate', 'reach', 'frequency', 'cost', 'roi', 'fill_rate', 'approval_rate'];
const SEG = ['mobile', 'web', 'b2b', 'b2c', 'new_users', 'top_categories', 'paid', 'organic', 'pro', 'private'];
function metName(s) { return uniq(used.met, () => {
  const ents = entsOf(s), actors = ents.filter(x => ACTORS.has(x)), r = rnd();
  if (r < 0.25 && actors.length) return [pick(ADJ), plural(pick(actors)), pick(WIN)].join('_');
  const e = pick(ents.filter(x => !s.slug.includes(x)).length ? ents.filter(x => !s.slug.includes(x)) : ents);
  if (r < 0.55) return [e, pick(MEAS)].join('_') + (chance(0.3) ? '_' + pick(WIN) : '');
  if (r < 0.8) return [s.slug, e, pick(MEAS)].join('_');
  return [e, pick(MEAS), pick(SEG)].join('_'); }); }
const VIEW = ['funnel', 'overview', 'health', 'dynamics', 'breakdown', 'monitor', 'report', 'cohort analysis', 'KPI tree', 'scorecard', 'deep dive', 'by region', 'by category',
  'unit economics', 'quality', 'SLA', 'forecast', 'anomalies', 'pulse', 'conversion', 'trends', 'targets vs actuals', 'retention', 'segments'];
const CAD = ['daily', 'weekly', 'weekly', 'monthly', '', '', '', 'YoY'];
function dashName(s) { return uniq(used.dash, () => {
  const topic = chance(0.35) ? s.l2.toLowerCase() : plural(pick(entsOf(s))).replace(/_/g, ' '), v = pick(VIEW), c = pick(CAD);
  if (chance(0.15)) return cap(`${c || 'weekly'} ${topic} review`);
  return cap([topic, v, /^by /.test(v) ? '' : c].filter(Boolean).join(' ')); }); }

// ---------- objects ----------
// OBJECTS row: [type 0 dash | 1 met | 2 dm, subdomain index, status 0..3, popularity, name, id]
const OBJECTS = [], META = [];
const idPool = (from, n) => shuffle(Array.from({ length: n }, (_, k) => from + k));
const IDS = [idPool(1000, 9000), idPool(10000, 30000), idPool(200000, 20000)];
const POP = [[3.6, 1.5, 0.18], [3.2, 1.5, 0.10], [4.4, 1.5, 0.07]];   // lognormal mu, sigma, zero share
const T_ADJ = [0.8, 0.88, 0.95];
for (const t of [0, 1, 2]) for (const s of live) {
  const n = s.n[t]; if (!n) continue;
  const pops = Array.from({ length: n }, () => chance(POP[t][2]) ? 0 : Math.max(1, Math.round(lognorm(POP[t][0], POP[t][1]) * s.d.pop)));
  const rank = pops.map((p, k) => [p, k]).sort((a, b) => a[0] - b[0]); const q = []; rank.forEach(([, k], r) => { q[k] = n > 1 ? r / (n - 1) : 0.5; });
  for (let k = 0; k < n; k++) {
    let pop = pops[k];
    let healthy = chance(clamp(s.h * T_ADJ[t] * (0.78 + 0.44 * q[k]), 0.01, 0.97));
    if (t === 2 && !s.people.bp) healthy = false;                 // the "BI partner in the domain" check is part of data mart health
    if (t === 1 && healthy && pop < 5) pop = ri(5, 60);           // healthy metric passes the usage check
    if (t === 0 && healthy && pop === 0) pop = ri(1, 30);
    let cert;
    if (t === 1) cert = healthy ? chance(0.04 + 0.22 * q[k] * q[k] * (s.l1 === 'Core' ? 2 : 1)) : chance(0.004);
    else cert = healthy ? chance(clamp((t === 2 ? 0.32 : 0.25) + 0.3 * q[k] + 0.25 * (s.d.mat - 0.5), 0.05, 0.95)) : chance(0.05);
    const status = (healthy ? 2 : 0) + (cert ? 1 : 0);
    const name = t === 0 ? dashName(s) : t === 1 ? metName(s) : dmName(s);
    OBJECTS.push([t, s.i, status, pop, name, IDS[t].pop()]);
    META.push({ q: q[k] });
  }
}
const KEY_MET = [], I0_MET = [];
OBJECTS.forEach((o, k) => { if (o[0] === 1 && (o[2] & 1)) KEY_MET.push(k); });
OBJECTS.forEach((o, k) => { if (o[0] === 1 && o[2] >= 2 && META[k].q > 0.97 && chance(SUBS[o[1]].l1 === 'Core' ? 0.8 : 0.25)) I0_MET.push(k); });

// ---------- ops: health components, freshness, monitoring ----------
const failSome = (len, need, weights, fixed = {}) => { const c = Array.from({ length: len }, (_, i) => fixed[i] ?? '1'); const n = need;
  let guard = 0; while (c.filter(x => x === '0').length < n && guard++ < 50) { const i = wpick([...c.keys()], j => fixed[j] != null ? 0 : weights[j]); c[i] = '0'; } return c; };
const CHK = OBJECTS.map((o, k) => {
  const s = SUBS[o[1]], healthy = o[2] >= 2, q = META[k].q;
  if (chance(0.035)) return null;                                     // object not found in the components export
  if (o[0] === 2) {
    const fresh = healthy ? wpick([0, 1, 2, 3], x => [0.9, 0.05, 0.02, 0.03][x]) : wpick([0, 1, 2, 3], x => [0.62, 0.12, 0.1, 0.16][x]);
    const crit = chance(0.08 + 0.25 * q) ? 1 : 0, sla = crit || chance(0.3) ? pick([6, 8, 9, 10, 12]) : null;
    const custom = healthy ? ri(1, 3 + Math.round(6 * q)) : chance(s.d.mon * 0.6) ? ri(1, 4) : 0;
    const checkers = custom + (chance(0.9) ? ri(1, 3) : 0);
    let cols = healthy ? ri(35, 100) : chance(0.5) ? ri(0, 29) : ri(30, 100);
    if (chance(0.03)) cols = null;
    // order: engine, owner, desc, cols, chk, chkok, cpu, size, ttl, bp, upstream
    const fixed = { 3: cols == null ? '-' : cols >= 30 ? '1' : '0', 4: custom ? '1' : '0', 9: s.people.bp ? '1' : '0' };
    let c;
    if (healthy) { c = Array.from({ length: 11 }, (_, i) => fixed[i] ?? '1'); if (chance(0.1)) c[8] = '-'; if (chance(0.05)) c[7] = '-'; }
    else { const need = Math.max(0, ri(1, 3) - ['3', '4', '9'].filter(i => fixed[i] === '0').length); c = failSome(11, need + ['3', '4', '9'].filter(i => fixed[i] === '0').length, [0.5, 1, 1.2, 0, 0, 1, 1, 0.7, 1.4, 0, 0.8], fixed); }
    if (fresh === 2 && c[5] === '1' && !healthy) c[5] = '0';
    const users = o[3] ? Math.max(1, Math.round(Math.sqrt(o[3]) * U(0.8, 2.5))) : chance(0.5) ? 0 : null;
    return [c.join(''), [cols, fresh, sla, crit, checkers, custom, users, Math.round(100 * clamp(q * U(0.7, 1.1), 0, 1))]];
  }
  if (o[0] === 1) {
    if (healthy) return ['11111', []];
    const fixed = o[3] < 5 ? { 2: '0' } : {};
    return [failSome(5, Math.max(fixed[2] ? 1 : 1, ri(1, 2)), [1.4, 1, 0.3, 0.6, 1], fixed).join(''), []];
  }
  // dashboard: speed, errors, owner, dataset, dscert, docs
  const docsNa = chance(0.05);
  if (healthy) return [docsNa ? '11111-' : '111111', [r1(U(0.4, 8)), r1(U(0, 3.5))]];
  const c = failSome(6, ri(1, 3), [1, 0.7, 0.8, 1.5, 1.6, 1.3]); if (docsNa) c[5] = '-';
  const sec = c[0] === '0' ? r1(U(10.5, 75)) : r1(U(0.5, 9.5)), err = c[1] === '0' ? r1(U(5.2, 45)) : r1(U(0, 4.5));
  return [c.join(''), [chance(0.03) ? null : sec, chance(0.03) ? null : err]];
});

// ---------- incidents (60 days before INC_DATE, plus open ones) ----------
const INC = [];
const dmK = OBJECTS.map((o, k) => k).filter(k => OBJECTS[k][0] === 2);
const incBase = { Delivery: 2.2, Growth: 1.6, Messaging: 1.5, Ads: 1.3, Goods: 1.1, Payments: 0.9, Core: 0.7 };
const withChk = dmK.filter(k => CHK[k] && CHK[k][1][4] > 0);
const T0 = Date.parse(INC_DATE + 'T12:00:00Z');
const stamp = t => new Date(t).toISOString().slice(0, 16);
for (let n = 0; n < 340; n++) {
  const k = wpick(withChk, j => (incBase[SUBS[OBJECTS[j][1]].l1] || 1) * (1 + 2 * CHK[j][1][3]) * (OBJECTS[j][2] >= 2 ? 0.5 : 1.3) * (1 + META[j].q));
  const imp = wpick([0, 1, 2, 3], x => [0.4, 0.35, 0.18, 0.07][x]);
  const st = wpick(['o', 'p', 'd'], x => ({ o: 0.13, p: 0.09, d: 0.78 })[x]);
  const start = T0 - U(0.2, 60) * DAY;
  const end = st === 'd' ? Math.min(T0 - 0.1 * DAY, start + lognorm(2.3, 1.2) * 3600e3) : null;
  INC.push([k, imp, st, stamp(start), end && end > start ? stamp(end) : st === 'd' ? stamp(start + 3600e3) : null, null]);
}
INC.sort((a, b) => a[0] - b[0] || (a[3] < b[3] ? -1 : 1));

// ---------- graph: data mart → dashboard, data mart → data mart, metric → semantic source ----------
const bySubType = SUBS.map(() => [[], [], []]); OBJECTS.forEach((o, k) => bySubType[o[1]][o[0]].push(k));
const domDm = new Map(); D.forEach(d => domDm.set(d.l1, SUBS.filter(s => s.d === d).flatMap(s => bySubType[s.i][2])));
const suppliers = D.filter(d => domDm.get(d.l1).length);
const pickDm = list => wpick(list, k => Math.sqrt(OBJECTS[k][3] + 1));
function sourceDm(s, ownW, domW) {
  const own = bySubType[s.i][2], dom = domDm.get(s.l1).filter(k => OBJECTS[k][1] !== s.i), r = rnd();
  if (r < ownW && own.length) return pickDm(own);
  if (r < ownW + domW && dom.length) return pickDm(dom);
  const sd = wpick(suppliers.filter(d => d.l1 !== s.l1), d => d.supply * (d.l1 === 'Core' || d.l1 === 'Data Platform' ? 1 : 0.4));
  return pickDm(domDm.get(sd.l1));
}
const G_DD = [], seenDD = new Set();
OBJECTS.forEach((o, k) => { if (o[0] !== 0 || chance(0.14)) return; const s = SUBS[o[1]]; const m = 1 + Math.floor(-Math.log(1 - rnd()) * 1.1);
  for (let j = 0; j < m; j++) { const a = sourceDm(s, 0.62, 0.14); const key = a * 1e6 + k; if (seenDD.has(key)) continue; seenDD.add(key); G_DD.push(a, k); } });
const G_DM = [], seenDM = new Set();
OBJECTS.forEach((o, k) => { if (o[0] !== 2) return; const s = SUBS[o[1]]; const m = chance(0.35) ? 0 : ri(1, 3);
  for (let j = 0; j < m; j++) { const a = sourceDm(s, 0.55, 0.15); if (a === k) continue; const key = a * 1e6 + k; if (seenDM.has(key) || seenDM.has(k * 1e6 + a)) continue; seenDM.add(key);
    G_DM.push(a, k, wpick([1, 2, 3], x => [0.75, 0.18, 0.07][x - 1])); } });
const G_SRC = [], G_MS = [], srcBySub = SUBS.map(() => []);
live.forEach(s => { if (!s.n[1]) return; const own = bySubType[s.i][2]; const n = ri(2, 6);
  for (let j = 0; j < n; j++) { let name;
    if (own.length && chance(0.4)) name = OBJECTS[pick(own)][4].split('.').pop();
    else name = uniq(new Set(G_SRC), () => [s.slug, pick(entsOf(s)), pick(['stream', 'events', 'facts', 'log', 'snapshot'])].join('_'));
    if (!G_SRC.includes(name)) G_SRC.push(name); srcBySub[s.i].push(G_SRC.indexOf(name)); } });
const coreSrc = SUBS.filter(s => s.l1 === 'Core').flatMap(s => srcBySub[s.i]);
OBJECTS.forEach((o, k) => { if (o[0] !== 1 || chance(0.1)) return; const own = srcBySub[o[1]]; const list = chance(0.12) && coreSrc.length ? coreSrc : own; if (!list.length) return; G_MS.push(k, pick(list)); });

// ---------- downstream consumers per data mart ----------
const ddBy = new Map(); for (let i = 0; i < G_DD.length; i += 2) (ddBy.get(G_DD[i]) || ddBy.set(G_DD[i], []).get(G_DD[i])).push(G_DD[i + 1]);
const dmOut = new Map(); for (let i = 0; i < G_DM.length; i += 3) dmOut.set(G_DM[i], (dmOut.get(G_DM[i]) || 0) + 1);
const DOWN = {};
dmK.forEach(k => { const dash = ddBy.get(k) || [], dwh = (dmOut.get(k) || 0) + (chance(0.25) ? ri(1, 12) : 0);
  const queries = dash.length ? dash.length * ri(1, 3) + ri(0, 4) : chance(0.2) ? ri(1, 6) : 0;
  if (!dash.length && !dwh && !queries) return;
  const top = [...dash].sort((a, b) => OBJECTS[b][3] - OBJECTS[a][3]).slice(0, 5);
  DOWN[k] = [dwh, dash.length, queries, Math.round(dash.reduce((t, j) => t + OBJECTS[j][3], 0) * U(0.08, 0.2)), top.map(j => OBJECTS[j][4])]; });

// ---------- cost per object and infra per subdomain ----------
const COST = {};
OBJECTS.forEach((o, k) => { if (o[0] === 0) return; const s = SUBS[o[1]];
  if (o[0] === 2) { if (!chance(0.86)) return; const h = lognorm(2.0, 1.5) * s.d.cpu, gb = chance(0.85) ? lognorm(1.8, 2.0) : 0; COST[k] = [h >= 10 ? Math.round(h) : r1(h), gb >= 0.1 ? r1(gb) : 0]; }
  else { if (!chance(0.62)) return; const h = lognorm(-0.3, 1.3) * s.d.cpu; COST[k] = [h >= 10 ? Math.round(h) : r1(h), 0]; } });
const INFRA = [];
D.forEach(d => { let cpuSum = 0, tbSum = 0;
  SUBS.filter(s => s.d === d).forEach(s => { if (s.empty) { if (chance(0.5)) INFRA.push([d.l1, s.l2, ri(200, 2500), r1(U(0, 3))]); return; }
    let cpu = 0, gb = 0; OBJECTS.forEach((o, k) => { if (o[1] === s.i && COST[k]) { cpu += COST[k][0]; gb += COST[k][1]; } });
    cpu = Math.round(cpu / U(0.55, 0.8) + ri(300, 3000)); const tb = r1(gb / 1000 / U(0.5, 0.85) + U(0.2, 4));
    s.cpu = cpu; cpuSum += cpu; tbSum += tb; INFRA.push([d.l1, s.l2, cpu, tb]); });
  INFRA.push([d.l1, '', Math.round(cpuSum * U(0.5, 1.0)), r1(tbSum * U(0.05, 0.3))]); });
INFRA.sort((a, b) => b[2] - a[2]);

// ---------- weekly health trend: [sub][dash, met, dm][week] = [healthy, total] ----------
const TREND = SUBS.map(s => [0, 1, 2].map(t => { const ks = bySubType[s.i][t], n = ks.length, g = ks.filter(k => OBJECTS[k][2] >= 2).length;
  if (!n) return TREND_DATES.map(() => [0, 0]);
  const inc = Array.from({ length: 8 }, () => -Math.log(1 - rnd()) * (chance(0.15) ? 4 : 1)), W = inc.reduce((a, b) => a + b, 0);
  const delta = (s.drift ?? 0) * (t === 1 ? 0.7 : 1) * n; let rem = 1;
  return TREND_DATES.map((_, w) => { if (w === 8) return [g, n]; rem = inc.slice(w).reduce((a, b) => a + b, 0) / W;
    return [clamp(Math.round(g - delta * rem + gauss() * n * 0.012), 0, n), n]; }); }));

// ---------- O3: AI analytics adoption among non-analysts, 4 full weeks ----------
const O3 = {};
live.forEach(s => { if (chance(0.1)) return; const n = Math.max(4, Math.round(lognorm(4.2, 0.8)));
  const a = clamp(s.d.ai * (s.d.mat >= 0.85 ? 1 : 0.8) * (s.skill ? 1.35 : 0.75) * lognorm(0, 0.35), 0.01, 0.75), tr = U(-0.04, 0.1);
  O3[s.key] = [n, [0, 1, 2, 3].map(w => clamp(Math.round(n * a * (1 + tr * (w - 1.5)) * U(0.9, 1.1)), 0, n))]; });

// ---------- DOMAINS rows ----------
// [l1, l2, bp, cur, ai, st, zone, roles, skill, dash, met, hm, hv, ha, kbn, air, faq, obj, gl, lin, t2s]
const NAMES = [];
const DOMAINS = SUBS.map(s => {
  const P = s.people || {}, objs = OBJECTS.filter(o => o[1] === s.i), by = t => objs.filter(o => o[0] === t);
  const good = objs.filter(o => o[2] >= 2).length, share = objs.length ? good / objs.length : null;
  const dash = by(0), met = by(1), dm = by(2), views = dash.reduce((t, o) => t + o[3], 0);
  const hm = met.length ? r1(100 * met.filter(o => o[2] >= 2).length / met.length) : 0;
  const hv = views ? r1(100 * dash.filter(o => o[2] >= 2).reduce((t, o) => t + o[3], 0) / views) : 0;
  const ha = dm.length ? r1(100 * dm.filter(o => o[2] >= 2).length / dm.length) : 0;
  const skill = s.skill || 0, mat = s.d.mat;
  const air = s.empty ? ri(0, 3) : clamp(Math.round(14 * (0.25 * mat + 0.45 * (share ?? 0) + 0.2 * skill) + gauss() * 1.5), 0, 14);
  const kb = skill ? U(0.5, 1.3) * (0.5 + mat) : 0.15;
  const faq = Math.round(kb * U(60, 260)), obj = Math.round(kb * U(15, 280)), gl = Math.round(kb * U(40, 220)), lin = Math.round(kb * U(5, 140));
  const t2s = skill ? (chance(0.2) ? ri(0, 9) : ri(10, 70)) : ri(0, 3);
  const zone = !objs.length ? 'gray' : share >= 0.5 && air >= 10 ? 'green' : share >= 0.25 ? 'yellow' : 'red';
  const roles = P.bp && P.st && chance(0.88) ? 1 : 0;
  const names = {}; ['bp', 'st', 'cur', 'ai'].forEach(r => { if (P[r]) names[r] = { l: P[r].l, n: P[r].n, p: P[r].p }; });
  NAMES.push(names);
  return [s.l1, s.l2, P.bp?.id || 0, P.cur?.id || 0, P.ai?.id || s.ghostAi || 0, P.st?.id || 0, zone, roles, skill,
    dash.length, met.length, hm, hv, ha, skill ? ri(3, 40) : 0, air, faq, obj, gl, lin, t2s];
});

// ---------- write ----------
fs.mkdirSync(OUT, { recursive: true });
const HEAD = `// Synthetic data for the Insight Factories open demo (fictional company Harbor Market). Generated by pipeline/generate.mjs, seed ${SEED}. Do not edit by hand.\n`;
const J = v => JSON.stringify(v);
const files = {
  'data.js': HEAD + `// DOMAINS row: [l1, l2, bp, cur, ai, st, zone, roles, skill, dash, met, hm, hv, ha, kbn, air, faq, obj, gl, lin, t2s]; people are ids p<N>, 0 = nobody.
// OBJECTS row: [type 0 dashboard | 1 metric | 2 data mart, subdomain index, status 0 unhealthy | 1 certified only | 2 healthy | 3 healthy and certified, popularity, name, id]
export const SNAPSHOT=${J(SNAPSHOT)};
export const DOMAINS=${J(DOMAINS)};
export const OBJECTS=${J(OBJECTS)};
`,
  'names.js': HEAD + `// NAMES[i] (aligned with DOMAINS) = { bp, st, cur, ai }: { l: login, n: name, p: job title }. Fictional people.
export const NAMES=${J(NAMES)};
`,
  'trend.js': HEAD + `// Health trend, ${TREND_DATES[0]}..${TREND_DATES[8]}, weekly points; [subdomain][type dash, met, dm][week] = [healthy, total]
export const TREND_DATES=${J(TREND_DATES)};
export const TREND=${J(TREND)};
`,
  'ops.js': HEAD + `// Object operations on the snapshot date. CHK[i] aligned with OBJECTS: [check results '1'|'0'|'-', extra fields]
//   data mart: [% described columns, freshness 0..3, SLA hour, critical, checkers, business checkers, users, importance]
//   dashboard: [seconds to load, % failed queries]
// INC: [i, importance 0..3, status o|p|d, start, resolved, chat post id]
// DOWN[i]: [dependent warehouse objects, dashboards, queries and datasets, MAU of those dashboards, most viewed dashboards]
export const OPS_DATE=${J(SNAPSHOT)};
export const INC_DATE=${J(INC_DATE)};
export const CHK=${J(CHK)};
export const INC=${J(INC)};
export const DOWN=${J(DOWN)};
`,
  'infra.js': HEAD + `// Infrastructure by domain: CPU hours over 30 days and average storage, TB. Empty domain_l2 — consumption not attributed to a subdomain.
export const INFRA_PERIOD=${J(PERIOD)};
export const INFRA=${J(INFRA)};
`,
  'cost.js': HEAD + `// Infrastructure cost per object over 30 days: COST[object index] = [CPU hours, GB stored]; dashboards are not billed.
export const COST_PERIOD=${J(PERIOD)};
export const COST=${J(COST)};
`,
  'graph.js': HEAD + `// G_DD — [data mart, dashboard] pairs: the dashboard reads the data mart
// G_DM — [source data mart, consumer data mart, level] triples
// G_MS — [metric, index of its semantic layer source in G_SRC] pairs
export const G_DD=${J(G_DD)};
export const G_DM=${J(G_DM)};
export const G_SRC=${J(G_SRC)};
export const G_MS=${J(G_MS)};
`,
  'keymet.js': HEAD + `// Key (certified) metrics and top-importance metrics — object indexes in OBJECTS.
export const KEY_MET=${J(KEY_MET)};
export const I0_MET=${J(I0_MET)};
`,
  'o3.js': HEAD + `// O3: { "domain|subdomain": [non-analysts in the audience, [active with AI scenarios per week]] }; O3_WEEKS — Mondays of the first and last week.
export const O3=${J(O3)};
export const O3_WEEKS=${J(O3_WEEKS)};
`,
};
let total = 0;
for (const [f, txt] of Object.entries(files)) { fs.writeFileSync(path.join(OUT, f), txt); total += txt.length; console.log(f.padEnd(10), (txt.length / 1024).toFixed(0).padStart(5), 'KB'); }
const cnt = t => OBJECTS.filter(o => o[0] === t).length;
console.log(`total ${(total / 1024).toFixed(0)} KB | domains ${D.length}, subdomains ${SUBS.length} (${SUBS.length - live.length} empty) | dash ${cnt(0)}, met ${cnt(1)}, dm ${cnt(2)} | healthy ${(100 * OBJECTS.filter(o => o[2] >= 2).length / OBJECTS.length).toFixed(1)}%`);
console.log(`edges dm→dash ${G_DD.length / 2}, dm→dm ${G_DM.length / 3}, met→src ${G_MS.length / 2} (${G_SRC.length} sources) | incidents ${INC.length} | key metrics ${KEY_MET.length}, i0 ${I0_MET.length} | people ${PEOPLE.length}`);
