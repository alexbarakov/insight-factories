// A small Markdown renderer for doc.html: headings, paragraphs, nested lists, tables, code, links, bold.
// The original hosting blocked external libraries by CSP, hence a custom one.
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const slug = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
// links to the docs that doc.html renders open there; any other .md opens as the raw file next to the docs (doc.html has no key for it)
const DOC_KEY = { 'glossary-kg-design': 'glossary', references: 'refs', 'functional-blocks': 'spec' };
const mdHref = u => { const [file, hash] = u.split('#'), name = file.split('/').pop().replace(/\.md$/, '');
  if (DOC_KEY[name]) return 'doc.html?f=' + DOC_KEY[name] + (hash ? '#' + hash : '');
  const rel = file.replace(/^\.\//, ''); return (/^(docs\/|\.\.\/|\/)/.test(rel) ? rel : 'docs/' + rel) + (hash ? '#' + hash : ''); };
const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${/^https?:/.test(u) ? u : /\.md(#|$)/.test(u) ? mdHref(u) : u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);
export function md(src) {
  const L = src.replace(/\r/g, '').split('\n'), out = [], toc = []; let i = 0;
  const list = (start) => { const ind = L[start].search(/\S/), ord = /^\s*\d+\./.test(L[start]); let h = `<${ord ? 'ol' : 'ul'}>`, j = start;
    while (j < L.length && /^\s*([-*]|\d+\.)\s/.test(L[j]) && L[j].search(/\S/) === ind) {
      let item = inline(L[j].replace(/^\s*([-*]|\d+\.)\s+/, '')); j++;
      if (j < L.length && /^\s*([-*]|\d+\.)\s/.test(L[j]) && L[j].search(/\S/) > ind) { const [sub, nj] = list(j); item += sub; j = nj; }
      h += `<li>${item}</li>`; }
    return [h + `</${ord ? 'ol' : 'ul'}>`, j]; };
  while (i < L.length) { const l = L[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('```')) { let j = i + 1, b = []; while (j < L.length && !L[j].startsWith('```')) b.push(L[j++]); out.push(`<pre><code>${esc(b.join('\n'))}</code></pre>`); i = j + 1; continue; }
    const h = /^(#{1,4})\s+(.+)/.exec(l);
    if (h) { const n = h[1].length, t = inline(h[2]), id = slug(h[2]); if (n === 2) toc.push([id, h[2]]); out.push(`<h${n} id="${id}">${t}</h${n}>`); i++; continue; }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) { const [html, j] = list(i); out.push(html); i = j; continue; }
    if (l.startsWith('|') && L[i + 1]?.match(/^\|[\s|:-]+\|$/)) { const row = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      let h = `<div class="tw"><table><thead><tr>${row(l).map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`; i += 2;
      while (i < L.length && L[i].startsWith('|')) { const c = row(L[i]); const grp = c.slice(1).every(x => !x);
        h += grp ? `<tr class="grp"><td colspan="${c.length}">${inline(c[0])}</td></tr>` : `<tr>${c.map(x => `<td>${inline(x)}</td>`).join('')}</tr>`; i++; }
      out.push(h + '</tbody></table></div>'); continue; }
    if (/^---+$/.test(l)) { out.push('<hr>'); i++; continue; }
    let p = [l]; i++; while (i < L.length && L[i].trim() && !/^(#|\||```|\s*([-*]|\d+\.)\s)/.test(L[i])) p.push(L[i++]);
    out.push(`<p>${inline(p.join(' '))}</p>`); }
  return { html: out.join('\n'), toc };
}
