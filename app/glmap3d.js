// 3D concept map of a domain: all terms of the domain's subdomains and the relations between them.
// Left button rotates, wheel zooms, right button pans. Click a term to select it (click again to clear); several can be selected.
// Links of selected terms are labeled with the relation: "broader / narrower", "related · N shared objects", "synonym"; the side panel explains the selection.
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';

let live = null;
export function disposeTermMap() { if (!live) return; live.stop(); live = null; }

const relTxt = e => e.type === 'broader' ? 'broader than' : e.type === 'verb' ? e.verb : e.type === 'part' ? 'includes' : e.type === 'synonym' ? 'synonym of' : 'related to';
// nodes: [{ id, name, status, key, n (objects), subs: [names], mine }]
// edges: [{ a, b, type: 'broader' | 'related' | 'synonym', shared }] — for broader, a is broader than b
export function mountTermMap(host, { nodes, edges, onOpen, onEdit }) {
  disposeTermMap();
  const W = () => host.clientWidth, H = () => host.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W(), H());
  host.appendChild(renderer.domElement); renderer.domElement.style.display = 'block';
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, W() / H(), 1, 5000);
  // colors come from the theme tokens (theme.css); fallbacks are the light theme values
  const tok = (n, f) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f; } catch { return f; } };
  // lights: white key light, hemisphere ground tinted with the theme line color
  scene.add(new THREE.HemisphereLight('#ffffff', tok('--line-strong', '#C3CDD2'), 2.2)); const dl = new THREE.DirectionalLight('#ffffff', 1.4); dl.position.set(200, 300, 400); scene.add(dl);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
  // layout: 3D force layout, size — number of linked objects
  const byId = new Map(nodes.map(n => [n.id, n])), mx = Math.max(...nodes.map(n => n.n), 1);
  nodes.forEach((n, i) => { const t = i / nodes.length, phi = Math.acos(1 - 2 * (i + 0.5) / nodes.length), th = Math.PI * (1 + Math.sqrt(5)) * i; const R = 160;
    n.p = new THREE.Vector3(Math.cos(th) * Math.sin(phi) * R, Math.cos(phi) * R * 0.8, Math.sin(th) * Math.sin(phi) * R); n.r = 4 + 14 * Math.sqrt(n.n / mx); });
  const E = edges.map(e => ({ ...e, A: byId.get(e.a), B: byId.get(e.b) })).filter(e => e.A && e.B), tmp = new THREE.Vector3();
  for (let it = 0; it < 500; it++) { const k = 1 - it / 500;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const A = nodes[i], B = nodes[j]; tmp.subVectors(B.p, A.p); const d = tmp.length() || 1, m = (A.r + B.r) * 2.2 + 26;
      if (d < m) { tmp.multiplyScalar((m - d) / d * 0.5); A.p.sub(tmp); B.p.add(tmp); } else { tmp.multiplyScalar(-600 / (d * d * d) * k); A.p.sub(tmp); B.p.add(tmp); } }
    E.forEach(e => { tmp.subVectors(e.B.p, e.A.p); const d = tmp.length() || 1, L = e.type === 'broader' ? 50 : 80 + (e.A.r + e.B.r); tmp.multiplyScalar((d - L) / d * 0.04 * k); e.A.p.add(tmp); e.B.p.sub(tmp); });
    nodes.forEach(n => n.p.multiplyScalar(0.998)); }
  const ctr = nodes.reduce((c, n) => c.add(n.p), new THREE.Vector3()).multiplyScalar(1 / nodes.length); nodes.forEach(n => n.p.sub(ctr));
  const rad = Math.max(...nodes.map(n => n.p.length() + n.r), 100); camera.position.set(0, rad * 0.4, rad * 2.4); controls.target.set(0, 0, 0);
  // nodes and links: term status colors (approved — accent, candidate — grey, stale — warn, conflict — bad) and relation colors
  const ACC = tok('--accent', '#0A7684'), REL_HI = tok('--rel-sup', '#4F79A6'), NONE = tok('--grey', '#A7B3B9');
  const COL = { ok: ACC, cand: NONE, stale: tok('--warn', '#C88A12'), conflict: tok('--bad', '#C4453A') },
    ECOL = { broader: tok('--ink2', '#4D5F69'), verb: ACC, part: tok('--wip', '#6A55B0'), related: tok('--accent-line', '#A9D3D8'), synonym: tok('--ok', '#2E8A57') };
  const geo = new THREE.SphereGeometry(1, 28, 20), pick = [];
  nodes.forEach(n => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: COL[n.status] || NONE, roughness: 0.45, metalness: 0.05, transparent: true, opacity: n.mine ? 1 : 0.55 }));
    m.scale.setScalar(n.r); m.position.copy(n.p); m.userData.n = n; scene.add(m); n.mesh = m; pick.push(m); });
  E.forEach(e => { const g = new THREE.BufferGeometry().setFromPoints([e.A.p, e.B.p]); e.line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: ECOL[e.type], transparent: true, opacity: e.type === 'broader' ? 0.8 : 0.35 })); scene.add(e.line); });
  // labels: term names and the relation on selected links
  const lab = document.createElement('div'); lab.className = 'tm-lab'; host.appendChild(lab);
  nodes.forEach(n => { const el = document.createElement('div'); el.className = 'tm-n' + (n.mine ? '' : ' other'); el.textContent = n.name + (n.key ? ' ★' : ''); lab.appendChild(el); n.el = el; });
  E.forEach(e => { const el = document.createElement('div'); el.className = 'tm-e ' + e.type; el.textContent = relTxt(e); el.hidden = true; lab.appendChild(el); e.el = el; });
  const side = document.createElement('div'); side.className = 'tm-side'; host.appendChild(side);
  const sel = new Set();
  function paintSel() { const on = sel.size > 0, nb = new Set();
    E.forEach(e => { const hit = sel.has(e.A) || sel.has(e.B); if (hit) { nb.add(e.A); nb.add(e.B); }
      e.line.material.opacity = !on ? (e.type === 'broader' ? 0.8 : 0.35) : hit ? 0.95 : 0.06; e.line.material.color.set(hit && on ? (ECOL[e.type] === ECOL.related ? REL_HI : ECOL[e.type]) : ECOL[e.type]); e.el.hidden = true; });
    sel.forEach(n => E.filter(e => e.A === n || e.B === n).sort((a, b) => (b.type !== 'related') - (a.type !== 'related') || (b.shared || 0) - (a.shared || 0)).slice(0, 6).forEach(e => { e.el.hidden = false; }));
    E.forEach(e => { if (sel.has(e.A) && sel.has(e.B)) e.el.hidden = false; });
    nodes.forEach(n => { const s = sel.has(n); n.mesh.material.opacity = !on ? (n.mine ? 1 : 0.55) : s || nb.has(n) ? 1 : 0.15; n.mesh.material.emissive.set(s ? ACC : 0x000000); n.mesh.material.emissiveIntensity = s ? 0.35 : 0; n.el.classList.toggle('sel', s); n.el.classList.toggle('dim', on && !s && !nb.has(n)); });
    const S = [...sel], between = E.filter(e => sel.has(e.A) && sel.has(e.B));
    side.innerHTML = !S.length ? `<b>Concept map</b><p>${nodes.length} terms, ${E.length} relations. Click a term to see its relations; select several to compare. Click again to clear.</p>
        <div class="tm-lg"><span><i style="background:${ECOL.broader}"></i>broader / narrower — concept hierarchy</span><span><i style="background:${ECOL.part}"></i>includes — one term's objects sit almost entirely inside another's</span><span><i style="background:${ECOL.verb}"></i>action — "creates", "has", "pays for"</span><span><i style="background:${ECOL.related}"></i>related to — shared metrics and data marts, nature not defined</span><span><i style="background:${ECOL.synonym}"></i>synonym</span></div><p class="mut">Sphere size — number of linked metrics and data marts; color — term status; faded — terms of other subdomains in the domain.</p>`
      : `<b>Selected: ${S.length}</b><button class="tm-clr">clear</button>${S.map(n => `<div class="tm-it"><a data-open="${n.id}">${n.name}${n.key ? ' ★' : ''}</a><button class="tm-ed" data-edit="${n.id}">Edit</button><small>${n.n} objects · ${n.subs.join(', ')}</small></div>`).join('')}
        ${S.length > 1 ? `<div class="tm-h">Relations between selected · ${between.length}</div>${between.map(e => `<div class="tm-rel" title="${e.shared ?? 0} shared metrics and data marts">${e.A.name} <em>${relTxt(e)}</em> ${e.type === 'verb' ? e.obj : e.B.name}</div>`).join('') || '<p class="mut">no direct relations</p>'}` : ''}
        <div class="tm-h">All relations of selected · ${E.filter(e => sel.has(e.A) || sel.has(e.B)).length}</div>${E.filter(e => sel.has(e.A) || sel.has(e.B)).sort((a, b) => (b.type === 'broader') - (a.type === 'broader') || (b.shared || 0) - (a.shared || 0)).slice(0, 14).map(e => `<div class="tm-rel" title="${e.shared ?? 0} shared metrics and data marts">${e.A.name} <em>${relTxt(e)}</em> ${e.type === 'verb' ? e.obj : e.B.name}</div>`).join('')}`;
    side.querySelector('.tm-clr')?.addEventListener('click', () => { sel.clear(); paintSel(); });
    side.querySelectorAll('[data-open]').forEach(a => a.onclick = () => onOpen?.(a.dataset.open));
    side.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => onEdit?.(b.dataset.edit)); }
  paintSel();
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down = null;
  const hit = e => { const r = renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, camera); return ray.intersectObjects(pick, false)[0]?.object.userData.n || null; };
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; controls.autoRotate = false; });
  renderer.domElement.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const n = hit(e); if (!n) return; sel.has(n) ? sel.delete(n) : sel.add(n); paintSel(); });
  renderer.domElement.addEventListener('dblclick', e => { const n = hit(e); if (n) onOpen?.(n.id); });
  renderer.domElement.addEventListener('pointermove', e => { renderer.domElement.style.cursor = hit(e) ? 'pointer' : ''; });
  const V = new THREE.Vector3(), M = new THREE.Vector3();
  function place() { const w = W(), h = H(), placed = [];
    [...nodes].sort((a, b) => (sel.has(b) - sel.has(a)) || b.r - a.r).forEach(n => { V.copy(n.p).project(camera); const x = (V.x * 0.5 + 0.5) * w, y = (-V.y * 0.5 + 0.5) * h; const sc = Math.max(0.2, n.r * h / (camera.position.distanceTo(n.p) * Math.tan(Math.PI * 40 / 360) * 2));
      const tw = n.el.offsetWidth || n.name.length * 6.5, r = [x - tw / 2, y + sc, x + tw / 2, y + sc + 14], show = V.z < 1 && (sel.has(n) || !placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]));
      n.el.style.display = show ? '' : 'none'; if (show) { placed.push(r); n.el.style.transform = `translate(${r[0]}px, ${r[1]}px)`; } });
    E.filter(e => !e.el.hidden).sort((a, b) => (sel.has(b.A) && sel.has(b.B)) - (sel.has(a.A) && sel.has(a.B)) || (b.type !== 'related') - (a.type !== 'related') || (b.shared || 0) - (a.shared || 0)).forEach(e => { M.addVectors(e.A.p, e.B.p).multiplyScalar(0.5).project(camera); const x = (M.x * 0.5 + 0.5) * w, y = (-M.y * 0.5 + 0.5) * h, tw = e.el.offsetWidth || 60, r = [x - tw / 2, y - 8, x + tw / 2, y + 8];
      const ok = M.z < 1 && !placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]); e.el.style.display = ok ? '' : 'none'; if (ok) { placed.push(r); e.el.style.transform = `translate(${r[0]}px, ${r[1]}px)`; } }); }
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); }); ro.observe(host);
  let alive = true; renderer.setAnimationLoop(() => { if (!alive) return; if (!host.isConnected) { stop(); return; } controls.update(); renderer.render(scene, camera); place(); });
  function stop() { alive = false; renderer.setAnimationLoop(null); ro.disconnect(); controls.dispose(); renderer.dispose(); }
  live = { stop, select: ids => { sel.clear(); ids.forEach(id => byId.get(id) && sel.add(byId.get(id))); controls.autoRotate = false; paintSel(); } }; window.__tm = live;
}
