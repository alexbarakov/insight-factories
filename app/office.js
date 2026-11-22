// An office in the industrial zone (Insight Factories world) and at the factory: the data owner and BI partners sit at the desks.
// The facade and roof are glass, so you can see from above and in front who sits inside; an empty chair with a red ring — the role is not assigned in the Domain Registry.
import * as THREE from './vendor/three.module.js';
const mats = {}, M = (c, o = {}) => mats[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
function bx(g, w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c) : c); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
// theme tokens (theme.css), read when the office is built; fallbacks are the light theme values
const tok = (n, f) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f; } catch { return f; } };
// suit colors by role: data owner — slate series color, BI partner — accent series color
export const SUIT = { get st() { return tok('--s8', '#6E808A'); }, get bp() { return tok('--s1', '#0A7684'); } };
export const ROLE_EN = { st: 'data owner', bp: 'BI partner' };
const MAX = 6;
export function officeSize(n) { const k = Math.max(1, Math.min(n, MAX)); return { w: 4 + k * 3, d: 8 }; }
const glass = new THREE.MeshStandardMaterial({ color: '#A9CCE0', transparent: true, opacity: 0.25, roughness: 0.08, metalness: 0.2, depthWrite: false });
const screen = new THREE.MeshStandardMaterial({ color: '#8DBBEA', emissive: '#5B93D6', emissiveIntensity: 0.6, roughness: 0.3 });
// people: [{ role: 'st' | 'bp', n: 'Name' | null }]
export function buildOffice(people) {
  const g = new THREE.Group(), list = people.slice(0, MAX), { w, d } = officeSize(list.length), H = 3.4, y0 = 0.5;
  const ACC = tok('--accent', '#0A7684'), EMPTY = tok('--bad', '#C4453A');
  bx(g, w + 1.2, 0.3, d + 1.2, '#D6D9D4', 0, 0.15, 0); bx(g, w, 0.2, d, '#EEEAE2', 0, 0.4, 0);
  bx(g, w, H, 0.25, '#F2F3F0', 0, y0 + H / 2, -d / 2 + 0.12); bx(g, 0.25, H, d, '#F2F3F0', -w / 2 + 0.12, y0 + H / 2, 0); bx(g, 0.25, H, d, '#F2F3F0', w / 2 - 0.12, y0 + H / 2, 0);
  const front = bx(g, w, H, 0.08, glass, 0, y0 + H / 2, d / 2 - 0.05); front.castShadow = false;
  const nm = Math.max(2, Math.round(w / 3)); for (let i = 0; i <= nm; i++) bx(g, 0.12, H, 0.14, '#4D5A63', -w / 2 + i * w / nm, y0 + H / 2, d / 2 - 0.05);
  // the roof is glass, you see from above who sits inside; an accent-colored cornice runs around the edge
  const roof = bx(g, w, 0.06, d, glass, 0, y0 + H, 0); roof.castShadow = false;
  [[0, -d / 2, w + 0.6, 0.5], [0, d / 2, w + 0.6, 0.5], [-w / 2, 0, 0.5, d], [w / 2, 0, 0.5, d]].forEach(([x, z, ww, dd]) => bx(g, ww, 0.3, dd, ACC, x, y0 + H + 0.1, z));
  for (let i = 1; i < nm; i++) bx(g, 0.1, 0.1, d, '#4D5A63', -w / 2 + i * w / nm, y0 + H + 0.05, 0);
  const seats = [];
  list.forEach((p, i) => { const x = -w / 2 + 3 + i * 3, z = 0.2, empty = !p.n;
    // desk with a monitor
    bx(g, 2.3, 0.12, 1.1, '#C8B597', x, 1.35, z - 1.1); [-1, 1].forEach(s => bx(g, 0.1, 0.85, 0.9, '#9A8C76', x + s * 1.05, 0.92, z - 1.1));
    bx(g, 1.1, 0.7, 0.08, '#2B3138', x, 1.85, z - 1.5); bx(g, 0.95, 0.55, 0.02, screen, x, 1.86, z - 1.45); bx(g, 0.14, 0.3, 0.14, '#2B3138', x, 1.5, z - 1.5);
    // chair
    const chair = empty ? EMPTY : '#3B4650'; bx(g, 0.85, 0.12, 0.85, chair, x, 1.0, z); bx(g, 0.85, 0.9, 0.1, chair, x, 1.5, z + 0.42); bx(g, 0.12, 0.5, 0.12, '#59636B', x, 0.7, z);
    if (empty) { const r = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 24), new THREE.MeshBasicMaterial({ color: EMPTY })); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.52, z); g.add(r); }
    else { // a seated person: torso, head, hair, arms to the keyboard, thighs
      const suit = SUIT[p.role] || tok('--ink2', '#4D5F69');
      bx(g, 0.62, 0.78, 0.36, suit, x, 1.48, z + 0.12); bx(g, 0.14, 0.4, 0.05, '#C6402F', x, 1.6, z - 0.07);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), M('#F1C9A5')); head.position.set(x, 2.1, z + 0.08); head.castShadow = true; g.add(head);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), M(p.role === 'st' ? '#3A2E26' : '#6B4A2E')); hair.position.set(x, 2.14, z + 0.1); g.add(hair);
      [-1, 1].forEach(s => { const a = bx(g, 0.17, 0.17, 0.62, suit, x + s * 0.36, 1.45, z - 0.28); a.rotation.x = 0.15; });
      bx(g, 0.58, 0.2, 0.7, '#2A2F36', x, 1.12, z - 0.2); [-1, 1].forEach(s => bx(g, 0.2, 0.6, 0.2, '#2A2F36', x + s * 0.15, 0.78, z - 0.5)); }
    seats.push({ x, y: 2.9, z, p }); });
  return { g, w, d, seats };
}
