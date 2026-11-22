// A small caption at the bottom of the page: which market references this screen builds on.
// Source — docs/references.md (built by docs/build_refs.py from the block registry); the page passes block codes.
let REFS = null;
// a block with no rows in references.md takes its names from the "References" column of the registry (without links)
const load = () => REFS ||= Promise.all(['docs/references.md', 'docs/functional-blocks.md'].map(u => fetch(u).then(r => r.ok ? r.text() : '').catch(() => ''))).then(([t, reg]) => {
  const m = new Map();
  for (const line of t.split('\n')) { const r = line.match(/^\|\s*([A-G]\d+[a-z]?)\s[^|]*\|\s*\[([^\]]+)\]\(([^)]+)\)/); if (!r) continue;
    const [, id, name, url] = r; if (!m.has(id)) m.set(id, []); if (!m.get(id).some(x => x.name === name)) m.get(id).push({ name, url: /^https?:/.test(url) ? url : null }); }
  for (const line of reg.split('\n')) { const r = line.match(/^\|\s*([A-G]\d+[a-z]?)\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*([^|]+?)\s*\|\s*$/); if (!r || m.has(r[1]) || r[2] === '—') continue;
    m.set(r[1], r[2].split(/,\s*/).map(n => ({ name: n.replace(/\s*\(.*?\)\s*/g, '').trim(), url: null })).filter(x => x.name)); }
  return m; }).catch(() => new Map());
const css = document.createElement('style');
css.textContent = `.reffoot{font-size:11px;line-height:1.5;color:var(--ink3);font-family:var(--font-ui);padding:18px 0 6px;margin-top:18px;border-top:1px solid var(--line)}.reffoot a{color:var(--ink3);text-decoration:none;border-bottom:1px dotted var(--line-strong)}.reffoot a:hover{color:var(--accent);border-color:var(--accent)}
.reffoot.fixed{position:fixed;left:20px;bottom:0;border:0;margin:0;padding:0;line-height:14px;font-size:10.5px;z-index:4;max-width:calc(100% - 40px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.reffoot.inl{border:0;margin-top:8px;padding:8px 0 0;border-top:1px solid var(--line)}`;
document.head.appendChild(css);
// ids — block codes from the registry; el — where to add the caption (end of body by default); fixed — for 3D pages, over the scene
export function refFooter(ids, el = document.body, { fixed = false, inline = false } = {}) {
  const box = document.createElement('div'); box.className = 'reffoot' + (fixed ? ' fixed' : '') + (inline ? ' inl' : ''); el.appendChild(box);
  load().then(m => { const seen = new Set(), list = ids.flatMap(id => m.get(id) || []).filter(x => !seen.has(x.name) && seen.add(x.name)).slice(0, 10);
    box.innerHTML = list.length ? `This section builds on: ${list.map(x => x.url ? `<a href="${x.url}" target="_blank" rel="noopener">${x.name}</a>` : x.name).join(' · ')}` : ''; });
  return box;
}
