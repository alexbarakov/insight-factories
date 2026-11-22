// Vocabulary and game links of the Insight Factories portal. The portal.js engine reads everything user-facing from here.
// 3D modes are separate pages, not iframes.
const MAP = (q = '') => `world.html${q ? '?' + q : ''}`;   // Insight Factories world: city, domain industrial zones, roads and data trucks, awards
const FACTORY = d => `domain.html?d=${d.i}`;
const n = v => v.toLocaleString('en-US');

export const SKIN = {
  spec: 'doc.html?f=spec',
  brand: 'Insight Factories',
  logo: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 14.5V7l4 2.5V7l4 2.5V3.5h5v11z" fill="var(--on-accent)"/></svg>',
  roles: { st: 'Factory director', bp: 'Production manager', cur: 'Metrics warehouse keeper', ai: 'AI technician' },
  // tasks: [title, explanation]; points and tool are in model.js
  tasks: {
    bp: () => ['Appoint a production manager', 'the subdomain has no BI partner in the Domain Registry'],
    st: () => ['Appoint a factory director', 'the subdomain has no data owner in the Domain Registry'],
    roles: () => ['Confirm staff in the Domain Registry', 'the partner and data owner are not confirmed in the Domain Registry'],
    cur: d => ['Hire a metrics warehouse keeper', `${n(d.by.met.n)} metrics without a curator`],
    ai: () => ['Hire an AI technician', 'without an AI champion self-service AI is not set up'],
    skill: () => ['Publish a Knowledge Base skill', 'without a skill the AI analyst does not know the domain context'],
    met: c => ['Clear defects in the metrics warehouse', `${n(c)} metrics without a description, owner, fresh data or usage`],
    dm: c => ['Fix the data mart workshops', `${n(c)} data marts without business checks or column descriptions`],
    dash: c => ['Reissue defects at the docks', `${n(c)} dashboards on raw queries, without a README or an active owner`],
    t2s: d => ['Add text2sql examples', `${d.t2s} now, at least 10 needed`],
    mon: c => ['Install sensors in the workshops', `${n(c)} data marts without business checks in Data Contracts`],
    inc: c => ['Resolve line breakdowns', `${c} open DQ incidents in Data Contracts`],
    cold: c => ['Sort out unused objects', `${n(c)} objects without views: archive or hand over`],
  },
  lead: 'Data health by domain: health of metrics, data marts and dashboards, good output and readiness for self-service AI. Every subdomain has a BI partner cabinet and a 3D factory.',
  // catalog levels
  l1: { one: 'Domain', many: 'Domains', gen: 'domains', cab: 'Domain cabinet' },
  l2: { forms: ['subdomain', 'subdomains', 'subdomains'], one: 'Subdomain', many: 'Subdomains', search: 'subdomain', none: 'Objects are not labeled: the factory is not built' },
  searchPh: 'Domain, subdomain, data mart, metric, dashboard, person',
  // indicators
  health: { name: 'Health', sub: 'share of healthy objects', goal: 'goal' },
  kind: { met: 'Semantics', dm: 'Data marts', dash: 'Dashboards', ai: 'Self-service AI' },
  igs: { name: 'Good output', short: 'Output' },
  skillLabel: 'Knowledge Base skill',
  // people
  st: { one: 'director', none: 'no director' },
  bp: { one: 'production manager', none: 'no production manager', kpi: 'Without a BI partner', with: 'with a BI partner' },
  peopleTitle: 'Factory staff',
  opsTab: 'Reliability',
  tasksTitle: 'Tasks',
  roleList: 'director, production manager, warehouse keeper or AI technician',
  me: { nav: 'My factories', title: 'My factories', empty: 'The Domain Registry lists no subdomains where you have a role.' },
  aiPlace: 'block', aiFill: 'Where to add knowledge', ofL2: 'factory',
  // game
  game: {
    title: 'Insight factory performance',
    nav: 'Insight Factories world', home: MAP(), homeBtn: 'Open the Insight Factories world', ctaTitle: 'Insight Factories world in 3D',
    ctaText: 'The city is Harbor Market leadership, an industrial zone is a domain, a factory is a subdomain; roads and trucks show who reads whose data',
    ctaSec: 'Map',
    icon: '<svg width="54" height="40" viewBox="0 0 54 40"><path d="M4 30 27 18l23 12-23 10z" fill="var(--track)"/><path d="M10 27v-8l7-3v8z" fill="var(--ok-line)"/><path d="M19 23v-11l9-4v11z" fill="var(--warn-line)"/><path d="M30 20v-7l8-3v7z" fill="var(--bad-line)"/><path d="M38 25v-5l7-3v5z" fill="var(--ok-line)"/></svg>',
    l1: u => ({ label: 'On the map', url: MAP('u=' + encodeURIComponent(u.name)) }),
    l2: d => ({ label: 'Factory', url: FACTORY(d) }),
    l2Map: d => ({ label: 'On the map', url: MAP(`s=${d.i}`) }),
    l2Tab: d => ({ label: 'Open the factory', url: FACTORY(d) }),
    obj: (o, d) => ({ label: 'Show at the factory', url: FACTORY(d) }),
    redirect: { home: () => MAP(), l1: q => MAP('u=' + encodeURIComponent(q.u)), l2: d => FACTORY(d) },
  },
};
