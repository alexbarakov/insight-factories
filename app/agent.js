// Fixer agent for problem lists (portal and the Links window): a modal with the steps of the review and a "ready for review" result.
// This is an example scenario: the agent acts on behalf of the BI partner and publishes or changes nothing without review.
// fixes per failed admission criterion (data/signals.js order, see ADM_CRIT in model.js)
const FIX = { owner: 'Suggesting an owner from the change history: the most active author over 90 days', description: 'Writing a description from the SQL, lineage and questions asked in the AI Assistant',
  domain: 'Tagging the domain from the schema and the owner team', 'BI partner': 'The domain needs a BI partner: assign one in the Domain Registry', Trino: 'Preparing to move the computation to Trino',
  'unique key': 'Finding a unique key from sample values and adding a uniqueness check', '30% of columns described': 'Describing columns from the computation code and sample values',
  'no deprecated sources': 'Switching to the current source data mart', schedule: 'Adding the metric to the daily recompute schedule', 'no temp schemas': 'Moving sources out of temp schemas',
  'no public schemas': 'Moving sources out of public schemas', 'no duplicates': 'Finding the duplicate metric and suggesting which one to keep', curator: 'The metric needs a curator: suggesting one from the domain team',
  'live sources': 'Switching to the current source data mart', README: 'Writing a README: who the dashboard is for and how to read it', 'built on datasets or metrics': 'Moving widgets from raw SQL to datasets and Semantic Layer metrics' };
const SLO_FIX = ['', 'Finding the failing step in the object over the last runs and preparing a fix', 'The breach comes from the source: notifying the source owner and marking the object as inherited', 'Platform incident: no edit to the object, waiting for the platform fix'];
// issues of an object by the three signals: [label, fix text, editable by the agent]
export function issues(o) {
  const out = (o.admFail || []).map(c => [`admission: ${c}`, FIX[c] || 'Preparing a fix', true]);
  if (o.tier < 3) {
    if (o.slo == null) out.push(['health: no SLO telemetry', 'Turning on the standard platform checks so the SLO can be counted', true]);
    else if (o.cause) out.push([`health: SLO ${o.slo} of 28 days, cause ${['', 'object', 'source', 'platform'][o.cause]}`, SLO_FIX[o.cause], o.cause === 1]);
    if (o.cert === 1 || o.cert === 3) out.push([o.cert === 1 ? 'certification: candidate' : 'certification: recertification', `Collecting the review packet for the BI partner: ${o.certDays} ${o.certDays === 1 ? 'day' : 'days'} left for the decision`, false]);
  }
  return out;
}
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
  const one = objs.length === 1, steps = [['Reading the objects', one ? `${KIND[objs[0].t]} ${objs[0].name}: lineage, SLO over 28 days, admission and certification` : `${objs.length} problems: lineage, SLO over 28 days, admission and certification`]];
  let fixes = 0;
  for (const o of objs) { const f = issues(o), ed = f.filter(x => x[2]); fixes += ed.length;
    if (one) f.forEach(([n, d]) => steps.push([`${n[0].toUpperCase()}${n.slice(1)}`, d]));
    else steps.push([`${o.name}`, f.length ? f.map(([n]) => n).join('; ') + ' — ' + f[0][1].toLowerCase() : 'all three signals pass: checking the downstream objects']); }
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
    m.querySelector('#agOut').innerHTML = `<div class="res"><b>Ready for review</b><br>Fixes prepared: ${fixes || 'a review with no automatic edits'} for ${objs.length} ${objs.length === 1 ? 'object' : 'objects'}. Expected: admission passes after the next daily check, health recovers as the 28-day SLO window rolls forward, certification is decided by the BI partner.</div>
      <div class="acts"><button class="pri">Open changes for review</button><button class="cl">Close</button></div>`;
    m.querySelector('.cl').onclick = close; m.querySelector('.pri').onclick = close; }, 900);
}
