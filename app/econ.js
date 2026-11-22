// Economics of data exchange between domains — stubs. Rollout order: supplier reputation → supply contracts → transfer price.
// Each stub describes what the mechanic will show and what has to appear in the data and tools for it to work.
export const ECON = [
  { key: 'rep', title: 'Supplier rating', step: 1,
    what: 'A rating for every supplier: quality of the data it ships × reliability (freshness within SLA, incidents, checker failures). Shown on the neighbor’s building, on the domain card and in the "Reliable supplier" award.',
    need: ['a daily snapshot of exchange quality per "supplier → consumer" pair (today there is one health score snapshot)', 'freshness and SLA of data marts from the Data Catalog and Data Contracts incidents for every data mart in the exchange', 'a reliability formula agreed with BI partners'] },
  { key: 'deal', title: 'Supply contract', step: 2,
    what: 'A "supplier → consumer" pair becomes a contract: the supplier earns points for healthy data that is actually read; the consumer loses points for depending on defects unless it files a claim. Defects pile up at the consumer’s gate, and the truck carries cargo in the color of its quality.',
    need: ['an exchange SLA in Data Contracts: which data marts the contract covers and which checkers are required', 'a "File a claim" button — a request to the supplier in the issue tracker or Chat with the objects and failures', 'a domain relationship model from the Control Plane instead of deriving pairs from lineage'] },
  { key: 'price', title: 'Transfer price', step: 3,
    what: 'CPU and storage of the supplier’s data marts are allocated to consumers in proportion to their usage: you see who subsidizes whom and what a dependency on someone else costs. A separate "infrastructure economics" layer, not mixed into quality points.',
    need: ['daily infrastructure billing per data mart, not a 30-day total', 'an allocation rule: the consumer’s share of queries and views in the data mart’s usage', 'a decision by finance and platform leadership on whether to show internal chargeback'] },
];
export const econHtml = (ctx = '') => `<div class="econ"><div class="econh"><b>Economics of data exchange</b><span class="stub">stub</span></div>${ctx ? `<p>${ctx}</p>` : ''}
  ${ECON.map(e => `<details><summary><i>${e.step}</i>${e.title}<span class="stub">not built</span></summary><p>${e.what}</p><small>What it needs to work:</small><ul>${e.need.map(n => `<li>${n}</li>`).join('')}</ul></details>`).join('')}</div>`;
export const ECON_CSS = `.econ{border:1px dashed var(--wip-line);border-radius:var(--r-md);padding:8px 10px;display:grid;gap:4px;background:var(--wip-soft2);margin-top:8px}
.econh{display:flex;justify-content:space-between;align-items:center}.econh b{font-size:12.5px}.econ p{margin:2px 0;font-size:12px;color:var(--ink2);line-height:1.45}
.econ .stub{font-size:10.5px;font-weight:600;color:var(--wip);background:var(--wip-soft);border-radius:var(--r-sm);padding:0 6px;white-space:nowrap}
.econ details{border-top:1px solid var(--wip-line);padding-top:4px}.econ summary{cursor:pointer;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px;list-style:none}.econ summary::-webkit-details-marker{display:none}
.econ summary i{font-style:normal;width:16px;height:16px;border-radius:50%;background:var(--wip);color:var(--on-accent);font-size:10px;display:grid;place-items:center}.econ summary .stub{margin-left:auto;background:var(--surface);border:1px dashed var(--wip-line)}
.econ small{font-size:11px;color:var(--ink3)}.econ ul{margin:2px 0 4px 16px;padding:0;font-size:11.5px;color:var(--ink2);display:grid;gap:2px}
.btn.stubbtn{opacity:.6;cursor:not-allowed;border-style:dashed}`;
const st = document.createElement('style'); st.textContent = ECON_CSS; document.head.appendChild(st);
