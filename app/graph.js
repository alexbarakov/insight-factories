import { QS, D, $, COL, statusCol, nm, ch, esc, trunc, sdot, kindCol, plink, meta, nodes, byKey, edges, nbrs, bad, fails, plural, reach, views, DQ, SAV, INF, ZK, infKind,
  LENS, LENS_LABEL, isCert, certRoots, CERT, certUp, certBad, upOf, downOf, rank, zMetric, st, SUBS, fmt, fmtK, KIND1, UNIT, isHot, TOOL, PRODUCTS, fixLink, monOf, useOf, MED_CPV, S } from './links-model.js?v=100';
import { runAgent } from './agent.js?v=100';
import { refFooter } from './reffoot.js?v=100';

// ============================================================================
// The Links window of a subdomain. One window, three views of the same data:
//   "Cost × value" — CPU over 30 days against usage: what to turn off and what to optimize;
//   "Graph" — the whole subdomain graph, 2D and 3D (net.js, loaded on first open);
//   "Flow" — Sankey: data mart groups → dashboard groups by views, Semantic Layer sources → metrics.
// Layout: header with the path; on the left — the lens (Savings, Problems, Certification, All links) and its findings;
// in the center — the view card: view tabs and the current view's tools on top, the view itself, a hint below;
// on the right — the selected object card, shared by all views. Lens, finding and selection survive a view switch.
// ============================================================================
const VIEWS = { cost: 'Cost × value', net: 'Graph', flow: 'Flow' };
let view = VIEWS[QS.get('v')] ? QS.get('v') : (QS.get('l') === 'infra' ? 'cost' : 'net'), showMet = false, net = null;
st.sel = byKey.get(QS.get('o')) || null;
const tip = $('tip');
const showTip = (e, html) => { tip.innerHTML = html; tip.hidden = false; tip.style.left = Math.min(e.clientX + 14, innerWidth - 340) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; };
const svgEl = (w, h, body) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const sync = () => { const u = new URL(location.href); u.searchParams.set('v', view); u.searchParams.set('l', st.lens); if (st.cert) u.searchParams.set('c', '1'); else u.searchParams.delete('c'); if (st.sel) u.searchParams.set('o', st.sel.key); else u.searchParams.delete('o'); history.replaceState(null, '', u); };


// ---------- view 1: cost × value ----------
// X — usage over 30 days (data mart queries plus MAU of dashboards on it; for a metric — uses), Y — CPU hours. Both scales are logarithmic.
// Diagonals are cost per use: the company median and five times the median; everything above the second is "expensive per use".
function costView(W, H) {
  const pts = nodes.filter(n => !n.ext && n.o?.cost?.[0] > 0 && (n.t === 'dm' || (showMet && n.t === 'met'))).map(n => ({ n, u: n.t === 'dm' ? useOf(n.o) : n.o.pop || 0, c: n.o.cost[0], g: n.o.cost[1] || 0 }));
  if (!pts.length) return `<div class="empty">No objects of ${S.ofL2 || 'this subdomain'} are in infrastructure billing — spend is not matched.</div>`;
  const L = 74, R = 24, T = 24, B = 56, lg = Math.log10;
  const xM = Math.max(2, Math.ceil(lg(Math.max(...pts.map(p => p.u)) + 1))), y0 = Math.floor(lg(Math.min(...pts.map(p => p.c)))), y1 = Math.max(y0 + 1, Math.ceil(lg(Math.max(...pts.map(p => p.c)))));
  const X = u => L + lg(u + 1) / xM * (W - L - R), Y = c => H - B - (lg(Math.max(c, 10 ** y0)) - y0) / (y1 - y0) * (H - T - B);
  const diag = k => { const a = []; for (let i = 0; i <= 60; i++) { const u = 10 ** (i / 60 * xM) - 1; a.push([X(u), Y(Math.max(k * MED_CPV * Math.max(u, 1), 10 ** y0))]); } return a; };
  const d5 = diag(5), d1 = diag(1), path = a => 'M' + a.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L');
  let s = `<defs><clipPath id="pc"><rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/></clipPath></defs>
    <g clip-path="url(#pc)"><path d="${path(d5)} L${W - R} ${T} L${L} ${T} Z" style="fill:var(--bad-soft)"/>
    <path d="${path(d1)}" style="stroke:var(--ink3)" stroke-dasharray="4 4" fill="none"/><path d="${path(d5)}" style="stroke:var(--bad)" stroke-width="1.2" fill="none"/></g>`;
  for (let i = 0; i <= xM; i++) s += `<line x1="${X(10 ** i - 1)}" x2="${X(10 ** i - 1)}" y1="${T}" y2="${H - B}" class="grid"/><text x="${X(10 ** i - 1)}" y="${H - B + 18}" class="ax" text-anchor="middle">${i ? fmtK(10 ** i) : '0'}</text>`;
  for (let i = y0; i <= y1; i++) s += `<line x1="${L}" x2="${W - R}" y1="${Y(10 ** i)}" y2="${Y(10 ** i)}" class="grid"/><text x="${L - 8}" y="${Y(10 ** i) + 4}" class="ax" text-anchor="end">${ch(10 ** i)} h</text>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 14}" class="axt" text-anchor="middle">Usage over 30 days: data mart queries plus MAU of dashboards on it →</text>
    <text x="${L + 6}" y="${T + 14}" class="axt">↑ CPU hours over 30 days</text>
    <text x="${L + 10}" y="${T + 32}" class="zone-t">expensive per use: 5+ times the median</text>`;
  const lab5 = d5.find(p => p[1] > T + 40 && p[0] > W * 0.55); if (lab5) s += `<text x="${lab5[0] + 6}" y="${lab5[1] - 6}" class="ax" style="fill:var(--bad-ink)">5 × median</text>`;
  const lab1 = d1.find(p => p[1] > T + 40 && p[0] > W * 0.7); if (lab1) s += `<text x="${lab1[0] + 6}" y="${lab1[1] + 14}" class="ax">company median, ${ch(MED_CPV)} h per use</text>`;
  // highlight: the selected finding, otherwise the lens (Problems — objects of problem zones), with the certification filter on top
  const z = st.zone; let hi = z?.items ? new Set(z.items.map(x => x.n)) : z ? z.nodes : st.lens === 'dq' ? new Set(DQ.flatMap(x => [...x.nodes])) : null;
  if (st.cert) hi = new Set([...(hi || CERT)].filter(n => CERT.has(n)));
  const colOf = n => st.lens === 'dq' ? statusCol(n.o) : kindCol(n);   // color by the selected finding or lens
  pts.sort((a, b) => b.g - a.g);
  for (const p of pts) { const r = 3.5 + Math.min(8, Math.sqrt(p.g) / 3), dim = hi && !hi.has(p.n);
    s += `<circle cx="${X(p.u).toFixed(1)}" cy="${Y(p.c).toFixed(1)}" r="${r.toFixed(1)}" fill="${colOf(p.n)}" style="stroke:var(--surface)" stroke-width="1" opacity="${dim ? 0.15 : 0.9}" data-n="${p.n.i}" class="pt${p.n.t === 'met' ? ' met' : ''}${p.n === st.sel ? ' sel' : ''}"/>`; }
  // labels: the most expensive of the highlighted, without overlaps
  const placed = [], cand = (hi ? pts.filter(p => hi.has(p.n)) : pts).sort((a, b) => b.c - a.c).slice(0, 14);
  for (const p of cand) { const x = X(p.u) + 9, y = Y(p.c) + 4, w = Math.min(34, p.n.o.name.length) * 6.4, bb = [x, y - 11, x + w, y + 3];
    if (bb[2] > W - R) continue; if (placed.some(o => bb[0] < o[2] && bb[2] > o[0] && bb[1] < o[3] && bb[3] > o[1])) continue; placed.push(bb);
    s += `<text x="${x}" y="${y}" class="plbl">${esc(trunc(p.n.o.name, 34))}</text>`; }
  return svgEl(W, H, s);
}


// ---------- view 3: flow (Sankey) ----------
// The view answers: what do the subdomain's dashboard views rest on — its own healthy data marts, unhealthy ones or neighbors' data marts.
// Left — data mart groups, right — dashboard groups; thickness — dashboard views over 30 days (a dashboard's views are split evenly across its data marts).
// A switch in the view header shows a second flow: Semantic Layer sources → metrics by uses. A click on a group or link selects it
// and lists its objects on the left; a click on empty space clears the selection.
let GROUPS = new Map(), FLINKS = new Map(), flowMode = 'dash', flowSel = null;
function sankey(W, x0, y0, H, L, Rn, links, unit) {
  const tot = links.reduce((s, l) => s + l.v, 0) || 1, NW = 14, gap = 8, k = (H - gap * (Math.max(L.length, Rn.length) - 1)) / tot;
  const place = (arr, x) => { let y = y0; arr.forEach(g => { g.v = links.filter(l => l.s === g || l.t === g).reduce((s, l) => s + l.v, 0); g.h = Math.max(3, g.v * k); g.x = x; g.y = y; y += g.h + gap; }); };
  place(L, x0); place(Rn, W - x0 - NW);
  links.sort((a, b) => L.indexOf(a.s) - L.indexOf(b.s) || Rn.indexOf(a.t) - Rn.indexOf(b.t));
  const on = l => !flowSel || flowSel === l.s.id || flowSel === l.t.id || flowSel === l.key, onG = g => !flowSel || flowSel === g.id || links.some(l => on(l) && (l.s === g || l.t === g));
  let s = ''; const so = new Map(), to = new Map();
  for (const l of links) { const h = Math.max(1, l.v * k), sy = l.s.y + (so.get(l.s) || 0) + h / 2, ty = l.t.y + (to.get(l.t) || 0) + h / 2; so.set(l.s, (so.get(l.s) || 0) + h); to.set(l.t, (to.get(l.t) || 0) + h);
    const x1 = x0 + NW, x2 = W - x0 - NW, m = (x1 + x2) / 2;
    s += `<path d="M${x1} ${sy} C${m} ${sy} ${m} ${ty} ${x2} ${ty}" stroke="${l.s.c}" stroke-width="${h.toFixed(1)}" class="sl${flowSel ? on(l) ? ' hi' : ' lo' : ''}" data-l="${esc(l.key)}" data-tip="${esc(l.s.name)} → ${esc(l.t.name)}: ${fmtK(l.v)} ${unit}, ${Math.round(l.v / tot * 100)}%"/>`; }
  for (const g of [...L, ...Rn]) { const left = g.x === x0, sel = flowSel === g.id;
    s += `<g class="sg${flowSel && !onG(g) ? ' lo' : ''}${sel ? ' sel' : ''}" data-g="${esc(g.id)}"><rect x="${g.x}" y="${g.y}" width="${NW}" height="${g.h}" fill="${g.c}" rx="3"/>
      <text x="${left ? g.x - 10 : g.x + NW + 10}" y="${g.y + g.h / 2 + 4}" text-anchor="${left ? 'end' : 'start'}" class="sn">${esc(trunc(g.name, Math.max(10, Math.floor((x0 - 70) / 7))))} <tspan class="sv">${Math.round(g.v / tot * 100)}% · ${fmtK(g.v)}</tspan></text></g>`; }
  return s;
}
// groups of the "data marts → dashboards" flow; carry — how many dashboard views each data mart carries
function flowDash() {
  const G = new Map(), grp = (id, name, c) => G.get(id) || G.set(id, { id, name, c, members: new Set() }).get(id);
  const side = (n, kind) => n.ext ? grp(`${kind}x:${n.sub.l2}`, n.sub.l2, kind === 'dm' ? COL.grey : COL.ext) : bad(n) ? grp(`${kind}b`, kind === 'dm' ? 'Own data marts · unhealthy' : 'Own dashboards · unhealthy', COL.bad) : grp(`${kind}o`, kind === 'dm' ? 'Own data marts · healthy' : 'Own dashboards · healthy', COL.ok);
  const acc = new Map(), carry = new Map(), pairs = new Map();
  for (const d of nodes.filter(n => n.t === 'dash')) { const src = d.inn.filter(e => e.kind === 'dd').map(e => e.a); if (!src.length || !d.o.pop) continue;
    for (const a of src) { if (a.ext && d.ext) continue; const v = d.o.pop / src.length, gs = side(a, 'dm'), gt = side(d, 'dash'); gs.members.add(a); gt.members.add(d);
      const key = gs.id + '|' + gt.id, x = acc.get(key) || acc.set(key, { key, s: gs, t: gt, v: 0, pairs: [] }).get(key); x.v += v; x.pairs.push([a, d, v]);
      carry.set(a, (carry.get(a) || 0) + v); carry.set(d, d.o.pop); } }
  // neighbors — at most five groups per side, the rest go to "other"
  for (const pref of ['dmx:', 'dashx:']) { const ext = [...G.values()].filter(g => g.id.startsWith(pref)), val = g => [...acc.values()].filter(l => l.s === g || l.t === g).reduce((s, l) => s + l.v, 0);
    ext.sort((a, b) => val(b) - val(a)).slice(5).forEach(g => { const o = grp(pref + '*', 'Other neighbors', COL.nocost); g.members.forEach(m => o.members.add(m));
      for (const [k, l] of [...acc]) if (l.s === g || l.t === g) { acc.delete(k); const s2 = l.s === g ? o : l.s, t2 = l.t === g ? o : l.t, k2 = s2.id + '|' + t2.id, x = acc.get(k2) || acc.set(k2, { key: k2, s: s2, t: t2, v: 0, pairs: [] }).get(k2); x.v += l.v; x.pairs.push(...l.pairs); }
      G.delete(g.id); }); }
  const ord = g => g.id.endsWith('o') && !g.id.includes(':') ? 0 : g.id.endsWith('b') && !g.id.includes(':') ? 1 : 2;
  const L = [...G.values()].filter(g => g.id.startsWith('dm')).sort((a, b) => ord(a) - ord(b)), R = [...G.values()].filter(g => g.id.startsWith('dash')).sort((a, b) => ord(a) - ord(b));
  return { G, L, R, links: [...acc.values()], carry, unit: 'views' };
}
function flowMet() {
  const G = new Map(), acc = new Map(), carry = new Map();
  const tg = b => G.get(b ? 'mb' : 'mo') || G.set(b ? 'mb' : 'mo', { id: b ? 'mb' : 'mo', name: b ? 'Metrics · unhealthy' : 'Metrics · healthy', c: b ? COL.bad : COL.ok, members: new Set() }).get(b ? 'mb' : 'mo');
  for (const m of nodes.filter(n => n.t === 'met' && !n.ext)) { const sE = m.out.find(e => e.kind === 'ms'); if (!sE) continue; const v = (m.o.pop || 0) + 1, id = 's:' + sE.b.i;
    const sg = G.get(id) || G.set(id, { id, name: sE.b.name, c: COL.src, members: new Set([sE.b]) }).get(id), t = tg(bad(m)); t.members.add(m); sg.members.add(m);
    const key = id + '|' + t.id, x = acc.get(key) || acc.set(key, { key, s: sg, t, v: 0, pairs: [] }).get(key); x.v += v; x.pairs.push([sE.b, m, v]); carry.set(m, v); carry.set(sE.b, (carry.get(sE.b) || 0) + v); }
  let L = [...G.values()].filter(g => g.id.startsWith('s:')).sort((a, b) => [...acc.values()].filter(l => l.s === b).reduce((s, l) => s + l.v, 0) - [...acc.values()].filter(l => l.s === a).reduce((s, l) => s + l.v, 0));
  if (L.length > 9) { const o = { id: 's:*', name: 'Other sources', c: COL.srcSoft, members: new Set() }; G.set(o.id, o);
    for (const g of L.slice(9)) { g.members.forEach(x => o.members.add(x)); for (const [k, l] of [...acc]) if (l.s === g) { acc.delete(k); const k2 = 's:*|' + l.t.id, x = acc.get(k2) || acc.set(k2, { key: k2, s: o, t: l.t, v: 0, pairs: [] }).get(k2); x.v += l.v; x.pairs.push(...l.pairs); } G.delete(g.id); }
    L = [...L.slice(0, 9), o]; }
  return { G, L, R: ['mo', 'mb'].map(id => G.get(id)).filter(Boolean), links: [...acc.values()], carry, unit: 'uses' };
}
let FD = null;
function flowView(W, H) {
  FD = flowMode === 'dash' ? flowDash() : flowMet(); GROUPS = FD.G; FLINKS = new Map(FD.links.map(l => [l.key, l]));
  const tot = FD.links.reduce((s, l) => s + l.v, 0) || 1, sh = f => Math.round(FD.links.filter(f).reduce((s, l) => s + l.v, 0) / tot * 100);
  const kp = flowMode === 'dash' ? [[`${sh(l => l.s.id === 'dmb')}%`, 'of views rest on own unhealthy data marts', 'dmb', COL.bad], [`${sh(l => l.s.id.startsWith('dmx'))}%`, 'on neighbors’ data marts', null, COL.ink3], [`${sh(l => l.s.id === 'dmo')}%`, 'on own healthy data marts', 'dmo', COL.ok]]
    : [[`${sh(l => l.t.id === 'mb')}%`, 'of metric uses fall on unhealthy metrics', 'mb', COL.bad], [`${FD.L.length}`, 'Semantic Layer sources behind the metrics', null, COL.src], [`${sh(l => l.t.id === 'mo')}%`, 'on healthy metrics', 'mo', COL.ok]];
  const head = `<div class="fhead">${kp.map(([v, t, g, c]) => `<div class="fk${g ? ' cl' : ''}${g && flowSel === g ? ' on' : ''}"${g ? ` data-g="${g}"` : ''}><b style="color:${c}">${v}</b><span>${t}</span></div>`).join('')}</div>`;
  if (!FD.links.length) return head + `<div class="empty">${flowMode === 'dash' ? 'No links between data marts and dashboards found.' : 'No metrics with sources.'}</div>`;
  const Hs = Math.max(300, H - 96);
  return head + svgEl(W, Hs + 20, sankey(W, Math.max(140, Math.min(300, W * 0.26)), 10, Hs, FD.L, FD.R, FD.links, FD.unit));
}
// left panel in Flow: what is selected and what it consists of; by default — unhealthy data marts that carry the most views
function flowSide() {
  const S2 = $('side'), carry = FD?.carry || new Map(), unit = FD?.unit || '';
  const rows = arr => `<div class="zl">${arr.map(([n, v, extra]) => `<a class="zi" data-n="${n.i}"><span><i class="dot ${n.o ? (n.ext ? 'grey' : sdot(n.o)) : 'grey'}"></i> ${esc(nm(n))}</span><em>${extra || fmtK(v) + ' ' + unit}</em></a>`).join('')}</div>`;
  let body = '';
  const g = flowSel && GROUPS.get(flowSel), l = flowSel && FLINKS.get(flowSel);
  if (g) { const ms = [...g.members].map(n => [n, carry.get(n) || 0]).sort((a, b) => b[1] - a[1]); const tot = ms.reduce((s, x) => s + x[1], 0);
    body = `<div class="card grp"><div class="k">${g.members.size} ${plural(g.members.size, 'object', 'objects')} · ${fmtK(tot)} ${unit}</div><h2>${esc(g.name)}</h2>${rows(ms.slice(0, 25))}${ms.length > 25 ? `<span class="more">and ${ms.length - 25} more</span>` : ''}</div>`; }
  else if (l) { const ps = [...l.pairs].sort((a, b) => b[2] - a[2]);
    body = `<div class="card grp"><div class="k">link · ${fmtK(l.v)} ${unit}</div><h2>${esc(l.s.name)} → ${esc(l.t.name)}</h2><div class="zl">${ps.slice(0, 25).map(([a, b, v]) => `<a class="zi pr" data-n="${a.i}"><span>${esc(nm(a))} <i class="ar">→</i> ${esc(nm(b))}</span><em>${fmtK(v)}</em></a>`).join('')}</div>${ps.length > 25 ? `<span class="more">and ${ps.length - 25} more</span>` : ''}</div>`; }
  else { const top = flowMode === 'dash' ? [...carry].filter(([n]) => n.t === 'dm' && !n.ext && bad(n)) : [...carry].filter(([n]) => n.t === 'met' && bad(n));
    top.sort((a, b) => b[1] - a[1]);
    body = `<div class="st">${flowMode === 'dash' ? 'Unhealthy data marts that carry the most dashboard views — fix them first:' : 'Unhealthy metrics with the most uses:'}</div>${rows(top.slice(0, 12))}`; }
  S2.innerHTML = `<div class="sh">Flow</div><div class="sub">${flowSel ? 'Click empty space to clear the selection' : 'Click a group or link to see what is inside'}</div><div class="scroll">${body}</div>`;
  S2.querySelectorAll('.zi[data-n]').forEach(a => a.onclick = () => openCard(nodes[+a.dataset.n]));
}

// ---------- header and left panel: the lens and its findings ----------
const portal = h => `index.html#/s/${D.i}${h || ''}`, g2 = S.game.l2(D);
$('head').innerHTML = `<div class="crumb"><a href="index.html#/">${S.brand}</a> / <a href="index.html#/d/${encodeURIComponent(D.l1)}">${D.l1}</a> / <a href="${portal()}">${D.l2}</a></div>
  <h1>Links · ${D.l2}</h1><div class="hl"><a href="${portal()}">Workspace</a><a href="${g2.url}">${g2.label}</a></div>`;
function findings() {
  const z = st.zone;
  if (st.lens === 'infra') { const by = k => INF.find(x => x.kind === k)?.sav || 0;
    return (SAV.cpu ? `<div class="sav"><div><span>CPU over 30 days</span><b>${ch(SAV.cpu)} h</b><small>data marts ${ch(SAV.cpuDm)}, metrics ${ch(SAV.cpuMet)}</small></div><div><span>Possible savings</span><b class="g">up to ${ch(SAV.total)} h</b><small>turn off ${ch(by('cut') + by('met0'))}, optimize ${ch(by('opt'))} (estimate)</small></div></div>` : '')
      + INF.map((x, i) => zoneCard(x, `i${i}`, x.items ? `<div class="zl">${x.items.slice(0, 8).map(it => `<a class="zi" data-n="${it.n.i}"><span>${esc(it.o.name)}</span><em>${x.kind === 'store' ? fmtK(it.gb) + ' GB' : ch(it.o.cost[0]) + ' h'}</em></a>`).join('')}${x.items.length > 8 ? `<span class="more">and ${x.items.length - 8} more</span>` : ''}</div>` : '')).join('')
      || '<div class="st">No spend without return found.</div>'; }
  if (st.lens === 'dq') return DQ.slice(0, 16).map((x, i) => zoneCard(x, `d${i}`, `<div class="zl">${x.roots.slice(0, 5).map(n => `<a class="zi" data-n="${n.i}"><span><i class="dot ${n.o ? sdot(n.o) : 'grey'}"></i> ${esc(nm(n))}</span><em>${n.ext ? n.sub.l2 : ''}</em></a>`).join('')}</div><button class="agb pri" data-agz="${i}">Run the agent on root causes</button>`)).join('') || '<div class="st">No problem zones found.</div>';

  const own = t => nodes.filter(n => n.t === t && !n.ext).length;
  return `<div class="st">All objects of ${S.ofL2 || 'this subdomain'} with no finding filter: ${own('dm')} data marts, ${own('met')} metrics, ${own('dash')} dashboards, ${own('src')} Semantic Layer sources, ${fmt(edges.length)} links. Objects of neighboring subdomains (${nodes.filter(n => n.ext).length}) are hidden on the graph — turn them on in Filters.</div>`;
}
// the Certification filter block: unhealthy sources of certified objects
function certBlock() {
  return `<div class="sh">Certification · filter</div><div class="st">${certRoots.length} certified objects, ${certUp.length} upstream of them. ${certBad.length} are unhealthy — the certificate resting on them is in question. On the right of each row — how many certified objects this source feeds directly.</div>`
    + certBad.slice(0, 20).map(n => { const cc = n.out.filter(e => CERT.has(e.b)).length;
      return `<a class="zi row" data-n="${n.i}" title="Unhealthy source: ${cc} ${plural(cc, 'certified object is', 'certified objects are')} built directly on it"><span><i class="dot bad"></i> ${esc(nm(n))}</span><em>${n.ext ? n.sub.l2 + ' · ' : ''}→ ${cc} cert.</em></a>`; }).join('');
}
function zoneCard(z, id, extra) { const on = st.zone === z;
  return `<div class="zone${on ? ' on' : ''}" data-z="${id}"><i style="background:${ZK[z.kind][1]}"></i><div><div class="zt"><small>${ZK[z.kind][0]}${z.items ? ` · ${z.items.length}` : ''}</small><em>${zMetric(z)}</em></div><b>${esc(z.title)}</b>
    ${on ? `<p>${z.what}</p>${extra}<p class="act"><span>What to do.</span> ${z.act}</p><div class="zb">${plink(z.go)}</div>` : ''}</div></div>`; }
// which lenses make sense in a view: Flow ignores lenses, the cost map has no "All links"
const LENS_IN = { cost: ['infra', 'dq'], net: ['infra', 'dq', 'all'], flow: [] };
function renderSide() {
  if (view === 'flow') return flowSide();
  const lensOk = LENS_IN[view];
  const n = LENS[st.lens].length;
  const lensOn = lensOk.includes(st.lens);
  $('side').innerHTML = `<div class="sh">Looking for</div><div class="modes wide">${Object.entries(LENS_LABEL).filter(([k]) => lensOk.includes(k)).map(([k, l]) => `<a data-l="${k}" class="${st.lens === k ? 'on' : ''}">${l}</a>`).join('')}</div>
    ${!lensOn ? '<div class="sub">Choose what to look for: findings light up on the map</div>' : st.lens === 'all' ? '<div class="sub">All objects with no finding filter</div>' : `<div class="sub">${n} ${plural(n, 'finding', 'findings')} · click a finding to highlight it in every view</div>`}<div class="scroll">${st.cert ? certBlock() : ''}${lensOn ? findings() : ''}</div>`;
  const P = $('side');
  P.querySelectorAll('[data-l]').forEach(a => a.onclick = () => { st.lens = a.dataset.l; st.zone = null; render(); net?.refresh({ fitTo: null }); });
  P.querySelectorAll('[data-z]').forEach(b => b.onclick = e => { if (e.target.closest('a')) return; const id = b.dataset.z, z = id[0] === 'i' ? INF[+id.slice(1)] : DQ[+id.slice(1)];
    st.zone = st.zone === z ? null : z; render(); net?.refresh({ fitTo: st.zone ? st.zone.nodes : null }); });
  P.querySelectorAll('.zi[data-n]').forEach(a => a.onclick = () => openCard(nodes[+a.dataset.n]));
  P.querySelectorAll('[data-agz]').forEach(b => b.onclick = e => { e.stopPropagation(); const z = DQ[+b.dataset.agz]; runAgent(z.roots.filter(n => n.o).map(n => n.o), { title: 'Agent on the affected zone' }); });
}

// ---------- object card: one for all views ----------
function openCard(n) {
  st.sel = n; const dr = $('drawer'); dr.hidden = false; sync();
  if (view === 'net') net?.select(n); else renderView();
  const o = n.o, up = n.inn.map(e => e.a), down = n.out.map(e => e.b), r = n.t === 'dm' ? reach(n) : null, f = o ? fails(o) : [], c = o?.cost, u = o?.t === 'dm' ? useOf(o) : null;
  const zs = [...INF, ...DQ].filter(z => z.items ? z.items.some(x => x.n === n) : z.roots.includes(n)), cg = view === 'net' ? net?.collapseOf(n) : null;
  const list = (arr, title) => arr.length ? `<div class="sec">${title} · ${arr.length}</div><div class="nb">${arr.slice(0, 40).map(x => `<a data-n="${x.i}"><i class="dot ${x.o ? (x.ext ? 'grey' : sdot(x.o)) : 'grey'}"></i><span title="${esc(nm(x))}">${esc(nm(x))}</span><em>${x.cpu >= 1 ? ch(x.cpu) + ' h · ' : ''}${x.o ? KIND1[x.o.t] : 'source'}${x.ext ? ' · ' + x.sub.l2 : ''}</em></a>`).join('')}</div>` : '';
  $('dh').innerHTML = `<div class="k">${o ? KIND1[o.t] : 'Semantic Layer source'}${n.ext ? ` · ${n.sub.l2}` : o ? ` · ${D.l2}` : ''}${isCert(n) ? ' · certified' : ''}</div><h2>${esc(nm(n))}</h2><button class="x" aria-label="Close">×</button>`;
  $('dh').querySelector('.x').onclick = closeCard;
  $('db').innerHTML = (o ? `<div class="kv"><span>Status</span><b><i class="dot ${sdot(o)}"></i> ${o.s >= 2 ? 'healthy' : o.s === 1 ? 'certified, unhealthy' : 'unhealthy'}${isHot(o) ? ', problem' : ''}</b><span>${UNIT[o.t][0].toUpperCase() + UNIT[o.t].slice(1)}</span><b>${fmt(o.pop)}</b>
      ${c ? `<span>CPU over 30 days</span><b>${ch(c[0])} h</b>${c[1] ? `<span>Storage</span><b>${fmtK(c[1])} GB</b>` : ''}` : o.t !== 'dash' ? '<span>CPU over 30 days</span><b>not in billing</b>' : ''}
      ${c && u != null ? `<span>Cost per use</span><b style="${c[0] / Math.max(1, u) >= 5 * MED_CPV ? 'color:var(--bad)' : ''}">${ch(c[0] / Math.max(1, u))} h, median ${ch(MED_CPV)}</b>` : ''}
      ${f.length ? `<span>Failed</span><b>${f.join(', ').toLowerCase()}</b>` : ''}${r ? `<span>Dashboards downstream</span><b>${r.dash.size}, ${fmt(views(r.dash))} views</b>` : ''}${o.t === 'dm' ? `<span>Business checkers</span><b>${monOf(o) ? 'yes' : 'no'}</b>` : ''}</div>`
      : `<div class="kv"><span>Metrics</span><b>${n.inn.length}, ${n.inn.filter(e => bad(e.a)).length} unhealthy</b><span>Metrics CPU</span><b>${ch(n.cpu)} h</b></div>`)
    + `<div class="acts">${view !== 'net' ? '<button class="btn" id="tonet">Show on the graph<small>neighbors and path</small></button>' : ''}${cg ? `<button class="btn" id="shut">Collapse into group<small>${esc(cg.name)} · ${cg.count}</small></button>` : ''}</div>`
    + zs.map(z => `<div class="zbox" style="border-color:${ZK[z.kind][1]}"><small>${ZK[z.kind][0]}</small><b>${esc(z.title)}</b><p><span>What to do.</span> ${z.act}</p></div>`).join('')
    + list(up, n.t === 'dash' ? 'Reads data marts' : n.t === 'src' ? 'Source metrics' : 'Sources') + list(down, n.t === 'dm' ? 'Consumers' : 'Leads to')
    + (o ? `<div class="btns"><a class="btn pri" href="index.html#/s/${o.sub}/${o.t}?q=${encodeURIComponent(o.name)}">Open in workspace<small>${SUBS[o.sub].l2}</small></a>${f.length ? plink(fixLink(o, f[0])) : ''}${TOOL[o.t](o).map(plink).join('')}</div>` : '');
  $('db').querySelectorAll('[data-n]').forEach(a => a.onclick = () => openCard(nodes[+a.dataset.n]));
  const tn = $('tonet'); if (tn) tn.onclick = () => setView('net');
  const sh = $('shut'); if (sh) sh.onclick = () => { cg.run(); closeCard(); };
}
function closeCard() { st.sel = null; $('drawer').hidden = true; sync(); if (view === 'net') net?.refresh(); else renderView(); }

// ---------- view card: tabs, tools, the view itself ----------
const HINT = { cost: 'A dot is a data mart: further right — more value, higher — more expensive. Size — storage, color — finding. Click for the object card',
  net: 'Wheel to zoom, drag to pan. Hover shows neighbors, click opens the object card', flow: 'Thickness — dashboard views (or metric uses) over 30 days; a dashboard’s views are split evenly across its data marts. Click a group or link to select it' };
function renderCert() {
  $('ftools').innerHTML = view === 'flow' ? '' : `<label class="ck tg${st.cert ? ' on' : ''}" title="Bright — certified objects (key metrics for metrics) and everything they are built from; the rest is faded"><input type="checkbox" id="certf"${st.cert ? ' checked' : ''}> Certified and their sources</label>`;
  const c = $('certf'); if (c) c.onchange = () => { st.cert = c.checked; sync(); renderSide(); renderCert(); if (view === 'net') net?.refresh({ fitTo: st.cert ? CERT : null }); else renderView(); };
}
function renderTabs() { renderCert();
  $('vtabs').innerHTML = Object.entries(VIEWS).map(([k, l]) => `<a data-v="${k}" class="${view === k ? 'on' : ''}">${l}</a>`).join('');
  $('vtabs').querySelectorAll('[data-v]').forEach(a => a.onclick = () => setView(a.dataset.v));
}
function renderView() {
  const V = $('svgv'), W = Math.max(view === 'flow' ? 420 : 600, V.clientWidth - 2), H = Math.max(420, V.clientHeight - 2);
  if (view === 'cost') { $('tools').innerHTML = `<label class="ck"><input type="checkbox" id="met"${showMet ? ' checked' : ''}> metrics</label>`; $('met').onchange = e => { showMet = e.target.checked; renderView(); }; V.innerHTML = costView(W, H); }
  else if (view === 'flow') { $('tools').innerHTML = `<div class="modes">${[['dash', 'Data marts → dashboards'], ['met', 'Semantic Layer sources → metrics']].map(([k, l]) => `<a data-fm="${k}" class="${flowMode === k ? 'on' : ''}">${l}</a>`).join('')}</div>`;
    $('tools').querySelectorAll('[data-fm]').forEach(a => a.onclick = () => { flowMode = a.dataset.fm; flowSel = null; renderView(); flowSide(); }); V.innerHTML = flowView(W, H); flowSide(); }
  $('hint').textContent = view === 'cost' && st.lens === 'dq' ? 'A dot is a data mart: further right — more value, higher — more expensive. Color — health, bright — objects in problem zones. Click for the object card' : HINT[view];
}
async function setView(v) {
  view = v; sync(); renderTabs(); renderSide(); tip.hidden = true;
  $('svgv').hidden = v === 'net'; $('netv').hidden = v !== 'net';
  if (v === 'net') { if (!net) { $('tools').innerHTML = '<span class="st">Building the graph…</span>'; const { createNet } = await import('./net.js?v=100');
      net = createNet({ stage: $('netv'), toolbar: $('tools'), api: { openCard, closeCard, hint: t => { $('hint').textContent = t; } } }); }
    net.show(); net.refresh({ fitTo: st.sel ? new Set([st.sel, ...nbrs(st.sel)]) : st.zone ? st.zone.nodes : st.cert ? CERT : null }); $('hint').textContent = HINT.net; }
  else { net?.hide(); renderView(); }
  if (st.sel) openCard(st.sel);
}
function render() { sync(); renderSide(); renderTabs(); if (view !== 'net') renderView(); }
const SV = $('svgv');
SV.addEventListener('click', e => { const t = e.target.closest('[data-n]'); if (t) return openCard(nodes[+t.dataset.n]);
  if (view !== 'flow') return; const g = e.target.closest('[data-g]'), l = e.target.closest('[data-l]');
  const id = g ? g.dataset.g : l ? l.dataset.l : null; flowSel = id && flowSel !== id ? id : null; renderView(); });
SV.addEventListener('mousemove', e => { const t = e.target.closest('[data-n]'), l = e.target.closest('[data-tip]');
  if (t) { const n = nodes[+t.dataset.n]; showTip(e, `<b>${esc(nm(n))}</b><small>${meta(n)}${infKind.has(n) ? ' · ' + ZK[infKind.get(n)][0] : ''}</small>`); }
  else if (l) showTip(e, `<b>${l.dataset.tip}</b>`); else tip.hidden = true; });
SV.addEventListener('mouseleave', () => { tip.hidden = true; });
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (st.sel) closeCard(); else if (st.zone) { st.zone = null; render(); net?.refresh(); } });
addEventListener('resize', () => { clearTimeout(window._rt); window._rt = setTimeout(() => { if (view !== 'net') renderView(); }, 150); });
document.title = `Links · ${D.l2} · ${S.brand}`;
render(); setView(view);
window.__links = { nodes, INF, DQ, openCard, setView, st };

// small caption at the bottom of the window: market references for Links
refFooter(['E7', 'G3', 'F3'], document.body, { fixed: true });
