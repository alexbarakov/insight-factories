// The "Market references" button at the top right of every page: portal, graph, 3D modes, documents.
// It opens doc.html?f=refs — the table of references per functional block (docs/references.md).
// Usage: <script src="refs.js?v=100" data-page="portal|graph|map|factory|valley|doc"></script>
(() => {
  const page = document.currentScript?.dataset.page || '';
  const SHIFT = {   // what already sits in the top right corner of the page — move it so the button does not cover it
    portal: '',   // the room for the button is measured below
    graph: '.drawer{top:56px!important}',
    map: '.hint{top:58px!important}',
    factory: '',
    valley: '.refs-btn{top:calc(env(safe-area-inset-top,0px) + var(--gutter,16px) + 52px)!important;right:var(--gutter,16px)!important}.inspector{top:calc(env(safe-area-inset-top,0px) + var(--gutter,16px) + 104px)!important}',
    doc: '' };
  const st = document.createElement('style');
  st.textContent = `.refs-btn{position:fixed;z-index:60;top:10px;right:16px;display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-pill);
    padding:6px 13px 6px 11px;font:500 12.5px/1.25 var(--font-ui);color:var(--ink);text-decoration:none;box-shadow:var(--sh-1)}
    .refs-btn:hover{border-color:var(--line-strong)}.refs-btn small{color:var(--ink3);font-weight:400}.refs-btn svg{flex:none}
    @media (max-width:1100px){.refs-btn small{display:none}}` + (SHIFT[page] || '');
  document.head.appendChild(st);
  const a = document.createElement('a'); a.className = 'refs-btn'; a.href = 'doc.html?f=refs'; if (page !== 'doc') a.target = '_blank';
  a.title = 'Which products and games each block takes as a model';
  a.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="2" width="5" height="10" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="8" y="2" width="5" height="10" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>Market references<small>what the design builds on ↗</small>';
  document.body.appendChild(a);
  // the button width goes into a variable: the portal header keeps room for it, so the search never slides under the button
  const setW = () => document.documentElement.style.setProperty('--refs-w', (a.offsetWidth + 32) + 'px'); setW(); addEventListener('resize', setW); document.fonts?.ready.then(setW);
  // On the portal the top bar keeps room for the button: as wide as the button really is, whatever the
  // window and the font, so the search never slides under it (the bar is re-rendered on every page change).
  if (page === 'portal') {
    let queued = false;
    const fit = () => { queued = false; const top = document.querySelector('.top'); if (top) top.style.paddingRight = (a.offsetWidth + 40) + 'px'; };
    const later = () => { if (!queued) { queued = true; requestAnimationFrame(fit); } };
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
    addEventListener('resize', later); later();
  }
})();
