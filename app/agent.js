// Fixer agent for problem lists (portal and the Links window): a modal with the steps of the review and a "ready for review" result.
// This is an example scenario: the agent acts on behalf of the BI partner and publishes or changes nothing without review.
import { checks } from './products.js?v=100';
const FIX = { 'Active owner': 'Suggesting an owner from the change history: the most active author over 90 days', 'Description': 'Writing a description from the SQL, lineage and questions asked in the AI Assistant', 'Columns described': 'Describing columns from the computation code and sample values', 'Column checkers': 'Suggesting column checkers: share of NULL in keys, value ranges', 'Checkers passing': 'Reviewing checker failures: cause and fix', 'CPU usage': 'Suggesting incremental recompute and partitions', 'Storage size': 'Suggesting a shorter history depth', 'Retention': 'Setting TTL for old partitions', 'BI partner in domain': 'The domain needs a BI partner — assign one in the Domain Registry', 'Contracts': 'Putting columns under a contract by type and range', 'Checkers green': 'Reviewing failures: 3 days out of 9 — the upstream schedule shifted', 'Runs on the warehouse engine': 'Preparing to move the computation to the warehouse engine', 'Usage': 'No demand: suggesting to archive or replace with a close metric', 'Upstream': 'Switching to the current source data mart', 'Live sources': 'Switching to the current source data mart', 'Data': 'Finding why there is no data for 30 days', 'Speed': 'Finding heavy widgets and suggesting aggregates', 'Errors': 'Fixing failing queries', 'On datasets': 'Moving widgets from raw queries to datasets', 'Certified datasets': 'Replacing sources with certified datasets', 'Description and README': 'Writing a README: who the dashboard is for and how to read it' };
const KIND = { dm: 'data mart', met: 'metric', dash: 'dashboard' };
const OUT = { dm: 'a pull request to the data mart repository and edits to its Data Catalog page', met: 'edits to the metric page in the Semantic Layer', dash: 'a new dashboard version in the Dashboards sandbox' };
const css = document.createElement('style');
css.textContent = `.agm{position:fixed;inset:0;z-index:80;background:var(--scrim);display:flex;align-items:center;justify-content:center}
.agbox{width:min(560px,calc(100% - 32px));max-height:calc(100% - 64px);overflow:auto;background:var(--surface);border-radius:var(--r-xl);box-shadow:var(--sh-3);padding:18px 20px;font:400 13px/1.5 var(--font-ui);color:var(--ink)}
.agbox h3{margin:0;font-size:16px}.agbox .k{font-size:12px;color:var(--ink3)}.agbox .x{float:right;border:0;background:none;font-size:20px;color:var(--ink3);cursor:pointer}
.agbox .note{font-size:12px;color:var(--ink2);margin:6px 0 4px}.agbox .mk{font-size:10.5px;color:var(--info);background:var(--info-soft);border:1px dashed var(--info-line);border-radius:var(--r-pill);padding:0 7px}
.agbox ol{list-style:none;margin:8px 0 0;padding:0}.agbox li{display:grid;grid-template-columns:20px 1fr;gap:10px;padding:8px 0;border-top:1px solid var(--line);opacity:.35;transition:opacity .3s}
.agbox li.on,.agbox li.done{opacity:1}.agbox li i{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--ink3);margin-top:2px;display:block}
.agbox li.on i{border-color:var(--accent);border-top-color:transparent;animation:agspin .8s linear infinite}.agbox li.done i{background:var(--ok);border-color:var(--ok)}
.agbox li small{display:block;color:var(--ink2);font-size:12px}@keyframes agspin{to{transform:rotate(360deg)}}
.agbox .res{position:static;border:0;box-shadow:none;max-height:none;font-size:12.5px;background:var(--bg2);border-radius:var(--r-md);padding:10px 12px;margin-top:10px;color:var(--ink2)}.agbox .res b{color:var(--ink)}
.agbox .acts{display:flex;gap:8px;margin-top:12px}.agbox .acts button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r-md);padding:7px 12px;font:inherit;cursor:pointer}.agbox .acts .pri{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.agb{border:1px solid var(--line);background:var(--surface);border-radius:var(--r-sm);padding:2px 10px;font:500 11.5px/1.4 var(--font-ui);color:var(--ink);cursor:pointer;white-space:nowrap;margin-left:6px}.agb:hover{border-color:var(--accent);color:var(--accent)}
.agb.pri{background:var(--accent);color:var(--on-accent);border-color:var(--accent);padding:5px 12px;font-size:12.5px}.agb.pri:hover{background:var(--accent-hover);border-color:var(--accent-hover);color:var(--on-accent)}`;
document.head.appendChild(css);
let timer = null;
// objs — portal model objects (o.t, o.name, o.chk); reviewer — who receives the changes for review
export function runAgent(objs, { title = 'Fixer agent', reviewer = 'BI partner' } = {}) {
  objs = objs.filter(Boolean).slice(0, 10); if (!objs.length) return;
  clearInterval(timer); document.querySelector('.agm')?.remove();
  const one = objs.length === 1, steps = [['Reading the objects', one ? `${KIND[objs[0].t]} ${objs[0].name}: lineage, query history, health score checks` : `${objs.length} problems: lineage, query history, health score checks`]];
  let fixes = 0;
  for (const o of objs) { const f = checks(o).filter(c => c[2] === false); fixes += f.length;
    if (one) f.forEach(([n]) => steps.push([`Fixing: ${n.toLowerCase()}`, FIX[n] || 'Preparing a fix']));
    else steps.push([`${o.name}`, f.length ? f.map(([n]) => n.toLowerCase()).join(', ') + ' — ' + (FIX[f[0][0]] || 'preparing a fix').toLowerCase() : 'visible checks pass — reviewing the other health score components']); }
  steps.push(['Collecting the changes', one ? OUT[objs[0].t] : 'pull requests to data mart repositories, edits to Data Catalog and Semantic Layer pages, new dashboard versions in the sandbox']);
  steps.push(['Sending for review', `the ${reviewer} gets a Chat notification with links to the changes`]);
  const m = document.createElement('div'); m.className = 'agm';
  m.innerHTML = `<div class="agbox"><button class="x" aria-label="Close">×</button><div class="k">${one ? KIND[objs[0].t] : 'problem list'}</div><h3>${title}${one ? ': ' + objs[0].name : ''}</h3>
    <div class="note">The agent acts on behalf of the BI partner and publishes nothing without review. <span class="mk">example scenario</span></div>
    <ol>${steps.map(([a, d]) => `<li><i></i><div>${a}<small>${d}</small></div></li>`).join('')}</ol><div id="agOut"></div></div>`;
  document.body.appendChild(m);
  const close = () => { clearInterval(timer); m.remove(); };
  m.querySelector('.x').onclick = close; m.onclick = e => { if (e.target === m) close(); };
  const lis = [...m.querySelectorAll('li')]; let k = 0; lis[0].classList.add('on');
  timer = setInterval(() => { lis[k].classList.remove('on'); lis[k].classList.add('done'); k++;
    if (k < lis.length) { lis[k].classList.add('on'); return; }
    clearInterval(timer);
    m.querySelector('#agOut').innerHTML = `<div class="res"><b>Ready for review</b><br>Fixes prepared: ${fixes || 'a review with no automatic edits'} for ${objs.length} ${objs.length === 1 ? 'object' : 'objects'}. Expected: after the nightly health score recompute the objects pass the fixed checks.</div>
      <div class="acts"><button class="pri">Open changes for review</button><button class="cl">Close</button></div>`;
    m.querySelector('.cl').onclick = close; m.querySelector('.pri').onclick = close; }, 900);
}
