// Shared module of the Insight Factories portal: the tools each action leads to and the health checks of objects.
// The portal only shows state. Every action leads to the tool that owns it: Semantic Layer, Dashboards, Data Catalog, Git, Knowledge Base.
// This is a demo: every tool link is '#'.
const ok = s => s >= 2;
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export const PRODUCTS = {
  kb: { name: 'Knowledge Base', url: '#' },       // domain knowledge: FAQ, glossary, text2sql examples, agent skills
  git: { name: 'Git', url: '#' },                 // code of data marts and Knowledge Base repositories
  semantic: { name: 'Semantic Layer', url: '#' }, // metrics
  dashboards: { name: 'Dashboards', url: '#' },   // the BI tool
  catalog: { name: 'Data Catalog', url: '#' },    // metadata of data marts
  registry: { name: 'Domain Registry', url: '#' },// domains, subdomains and governance roles
  dc: { name: 'Data Contracts', url: '#' },       // checkers and DQ incidents
  chat: { name: 'Chat', url: '#' },
  sql: { name: 'SQL Workbench', url: '#' },
  ai: { name: 'AI Assistant', url: '#' },
  wikiDocs: { name: 'Wiki', url: '#' },
};
// the domain's Knowledge Base repository; the demo has no real repositories
export const kbRepo = () => '#';
export const go = (p, url, what) => ({ p, url: url === undefined ? PRODUCTS[p].url : url, what });
// where to go to fix an object's check
export function fixLink(o, check) {
  if (o.t === 'dash') return go('dashboards', '#', 'edit dashboard');
  if (o.t === 'met') return ['Data', 'Live sources'].includes(check) ? go('git', '#', 'find the computation') : go('semantic', undefined, `find metric ${o.name}`);
  if (check === 'Business checker') return go('dc', undefined, 'add a checker');
  if (['Runs on the warehouse engine', 'Live sources'].includes(check)) return go('git', '#', 'edit data mart code');
  return go('catalog', '#', 'fill in metadata');
}
// object health checks: the set and thresholds follow the health score method, results are health score components on the snapshot date (data/ops.js)
// keys follow the order of characters in CHK[i][0]: '1' — passed, '0' — failed, '-' — not applicable
export const CHECKS = {
  // data mart — components of the health snapshot (source of the health status) and sources from the Data Catalog
  dm: [['engine', 'Runs on the warehouse engine', 'data mart migrated from the legacy warehouse'], ['owner', 'Active owner', 'the owner still works at the company'], ['desc', 'Description', 'the table has a description'],
    ['cols', 'Columns described', 'columns have descriptions'], ['chk', 'Column checkers', 'columns are covered by Data Contracts checkers'], ['chkok', 'Checkers passing', 'checkers have not failed in recent days'],
    ['cpu', 'CPU usage', 'p80 CPU over 30 days within threshold'], ['size', 'Storage size', 'table size within the norm'], ['ttl', 'Retention', 'data retention (TTL) is set'],
    ['bp', 'BI partner in domain', 'the data mart’s domain has a BI partner'], ['upstream', 'Live sources', 'no deprecated sources']],
  met: [['desc', 'Description', 'the metric is described in the Semantic Layer'], ['owner', 'Active owner', 'the owner still works at the company'], ['usage', 'Usage', 'viewed or used in an A/B test in 90 days'],
    ['upstream', 'Live sources', 'no deprecated sources'], ['data', 'Data', 'has data for the last 30 days']],
  dash: [['speed', 'Speed', 'loads in under 10 seconds'], ['errors', 'Errors', 'under 5% of queries fail'], ['owner', 'Active owner', 'the owner still works at the company'],
    ['dataset', 'On datasets', 'widgets use datasets, not raw queries'], ['dscert', 'Certified datasets', 'sources are certified'], ['docs', 'Description and README', 'both are filled in']],
};
const n1 = v => String(Math.round(v * 10) / 10);
// a hint with a number: what exactly is wrong and how far it is from the threshold
function tip(o, key, pass) { const x = o.chk?.[1] || [];
  if (o.t === 'dm' && key === 'cols' && x[0] != null) return `${x[0]}% of columns described`;
  if (o.t === 'dm' && key === 'chk' && !pass) return x[5] ? `${x[5]} business checkers, ${x[4]} in total` : x[4] ? `only platform NoRows and DuplicateKey (${x[4]})` : 'no checkers';
  if (o.t === 'dash' && key === 'speed' && x[0] != null) return pass ? `loads in ${n1(x[0])} s` : `loads in ${n1(x[0])} s, needs under 10`;
  if (o.t === 'dash' && key === 'errors' && x[1] != null) return pass ? `${n1(x[1])}% of queries fail` : `${n1(x[1])}% of queries fail, needs under 5%`;
  return null; }
// [name, explanation, passed: true / false / null — no data]
export function checks(o) { const list = CHECKS[o.t], h = hash(o.name), c = o.chk?.[0];
  if (c) return list.map(([k, n, ds], i) => { const v = c[i] === '1' ? true : c[i] === '0' ? false : null; return [n, tip(o, k, v) || ds, v]; });
  // the object is missing from the component export: show an example based on its status
  if (ok(o.s)) return list.map(([, n, ds]) => [n, ds, true]);
  const fails = new Set(); const nf = o.s === 1 ? 1 + (h % 2) : 2 + (h % 2); for (let i = 0; fails.size < nf; i++) fails.add((h >>> (i * 3)) % list.length);
  return list.map(([, n, ds], i) => [n, ds, !fails.has(i)]); }
export const checksReal = o => !!o.chk;
export const TOOL = { dm: o => [go('catalog', '#', 'data mart page'), go('git', '#', 'data mart code')],
  met: o => [go('semantic', undefined, `metric ${o.name}`)], dash: o => [go('dashboards', '#', 'dashboard')] };
