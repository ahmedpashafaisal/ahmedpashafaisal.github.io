// Islands wireframe: "All games" as one island per category, drawn as grey
// SVG shapes. Games come from games.json in the site order (order.js), so
// the car's route visits them in the same order as the deck and game pages.
import './wire.css';
import data from '../src/data/games.json';
import { byCategory, primaryCat } from '../src/js/order.js';

const NS = 'http://www.w3.org/2000/svg';
const STORE = { steam: 'Steam', appStore: 'App Store', googlePlay: 'Google Play', itch: 'itch.io', gdd: 'Design doc' };

const games = byCategory(data.games.filter((g) => !g.hidden));
const catLabel = Object.fromEntries(data.categories.map((c) => [c.id, c.label]));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Island: centre, radii, wobble seed, sign, road entry and exit, cabin slots
// (filled in route order), optional empty plot.
const LAYOUTS = {
  desk: {
    W: 1200,
    H: 1060,
    islands: [
      { cat: 'pc-steam', cx: 260, cy: 240, rx: 210, ry: 150, seed: 1, sign: [95, 150], entry: [240, 112], exit: [462, 250], slots: [[175, 225], [345, 265]] },
      { cat: 'gamification', cx: 910, cy: 210, rx: 160, ry: 125, seed: 4, sign: [800, 130], entry: [758, 215], exit: [880, 325], slots: [[920, 200]] },
      { cat: 'mobile', cx: 600, cy: 600, rx: 340, ry: 185, seed: 2, sign: [330, 520], entry: [800, 458], exit: [900, 640], slots: [[825, 545], [690, 545], [555, 545], [420, 545], [470, 665], [610, 665]], plot: [760, 665] },
      { cat: 'jams', cx: 1000, cy: 860, rx: 160, ry: 135, seed: 5, sign: [900, 800], entry: [990, 742], exit: [852, 880], slots: [[1075, 830], [1010, 930], [930, 900]] },
      { cat: 'web-games', cx: 210, cy: 890, rx: 130, ry: 100, seed: 3, sign: [115, 850], entry: [334, 880], exit: null, slots: [[215, 895]] },
    ],
    fordVia: [[610, 228], [835, 395], [950, 700], [600, 905]],
    sandbars: [{ cx: 600, cy: 905, rx: 46, ry: 18 }],
    fordLabel: [610, 212],
    waves: [[540, 80], [1080, 430], [50, 560], [1110, 640], [420, 1000], [760, 1010], [1110, 1010], [600, 330], [40, 330], [1130, 60]],
    selected: { slug: 'sweet-shot', car: [372, 552, 90], card: [24, 400, 250, 372] },
    callouts: [
      [1, 74, 128],
      [2, 720, 512],
      [3, 128, 190],
      [4, 274, 400],
      [5, 652, 207],
      [6, 792, 640],
      [7, 200, 100],
    ],
  },
  phone: {
    W: 390,
    H: 1650,
    islands: [
      { cat: 'pc-steam', cx: 195, cy: 175, rx: 170, ry: 125, seed: 1, sign: [60, 128], entry: [200, 66], exit: [225, 290], slots: [[120, 165], [275, 200]] },
      { cat: 'gamification', cx: 220, cy: 450, rx: 120, ry: 85, seed: 4, sign: [110, 420], entry: [215, 372], exit: [195, 530], slots: [[235, 458]] },
      { cat: 'mobile', cx: 195, cy: 830, rx: 180, ry: 260, seed: 2, sign: [70, 668], entry: [250, 590], exit: [150, 1075], slots: [[280, 720], [120, 720], [120, 830], [280, 830], [280, 940], [120, 940]], plot: [250, 1010] },
      { cat: 'jams', cx: 200, cy: 1260, rx: 160, ry: 120, seed: 5, sign: [70, 1210], entry: [255, 1155], exit: [150, 1368], slots: [[275, 1240], [205, 1320], [120, 1260]] },
      { cat: 'web-games', cx: 200, cy: 1530, rx: 120, ry: 85, seed: 3, sign: [100, 1500], entry: [180, 1450], exit: null, slots: [[215, 1530]] },
    ],
    fordVia: [null, null, null, null],
    sandbars: [],
    fordLabel: [262, 335],
    waves: [[30, 330], [320, 560], [30, 600], [340, 1110], [30, 1420], [330, 1450], [60, 1630], [330, 40]],
  },
};

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent?.append(n);
  return n;
}

// Smooth path through points (Catmull-Rom written as cubic Béziers)
function smooth(pts, closed) {
  const n = pts.length;
  const p = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return closed ? `${d}Z` : d;
}

// Points round an ellipse with a gentle wobble, so islands look hand drawn
function blobPts(cx, cy, rx, ry, seed, n = 16) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + 0.07 * Math.sin(3 * a + seed) + 0.04 * Math.sin(5 * a + seed * 2.3);
    return [+(cx + rx * r * Math.cos(a)).toFixed(1), +(cy + ry * r * Math.sin(a)).toFixed(1)];
  });
}

const label = (x, y, text, parent, cls = '') =>
  Object.assign(el('text', { class: `w-label ${cls}`, x, y, 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' }, parent), { textContent: text });

function cabin(x, y, parent) {
  el('path', { class: 'w-cabin', d: `M${x - 15},${y - 2}L${x},${y - 16}L${x + 15},${y - 2}V${y + 14}H${x - 15}Z` }, parent);
}

function landmark(x, y, parent) {
  el('path', { class: 'w-landmark', d: `M${x - 28},${y - 4}L${x},${y - 30}L${x + 28},${y - 4}V${y + 24}H${x - 28}Z` }, parent);
  const s = [...Array(10)].map((_, i) => {
    const r = i % 2 ? 4 : 9;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + 9 + r * Math.sin(a)).toFixed(1)}`;
  });
  el('polygon', { class: 'w-star', points: s.join(' ') }, parent);
}

function sign([x, y], text, parent) {
  el('line', { class: 'w-sign-post', x1: x, y1: y, x2: x, y2: y - 36 }, parent);
  const w = text.length * 7.6 + 18;
  el('rect', { class: 'w-sign', x, y: y - 38, width: w, height: 22, rx: 4 }, parent);
  Object.assign(el('text', { class: 'w-sign-text', x: x + 9, y: y - 22 }, parent), { textContent: text });
}

// Car seen from above, nose pointing at `deg` (0 = up)
function car(x, y, deg, parent, cls = 'w-car') {
  const g = el('g', { transform: `translate(${x} ${y}) rotate(${deg})` }, parent);
  el('rect', { class: cls, x: -10, y: -16, width: 20, height: 32, rx: 6 }, g);
  if (cls === 'w-car') el('rect', { class: 'w-car-glass', x: -6, y: -8, width: 12, height: 10, rx: 2 }, g);
  return g;
}

function card(g, [x, y, w, h], parent, sheet) {
  const fo = el('foreignObject', { x, y, width: w, height: h }, parent);
  const links = Object.entries(g.links)
    .filter(([k, v]) => v && STORE[k])
    .map(([k]) => `<span class="w-card__chip">${STORE[k]}</span>`)
    .join('');
  const meta = [g.year, g.platforms.join(', '), g.genre].filter(Boolean).map(esc).join(' · ');
  const div = document.createElement('div');
  div.className = `w-card${sheet ? ' w-card--sheet' : ''}`;
  div.innerHTML = `${sheet ? '<div class="w-card__grab"></div>' : ''}
    <div class="w-card__shot">Screenshot</div>
    <p class="w-card__meta">${meta}</p>
    <p class="w-card__title">${esc(g.title)}</p>
    <p class="w-card__hook">${esc(g.blurb)}</p>
    <p class="w-card__role"><b>My role</b> ${esc(g.role)}</p>
    <div class="w-card__row"><span class="w-card__btn">Open game →</span>${links}</div>`;
  fo.append(div);
}

function callout(n, x, y, parent) {
  const g = el('g', { class: 'w-callout' }, parent);
  el('circle', { cx: x, cy: y, r: 12 }, g);
  Object.assign(el('text', { x, y }, g), { textContent: n });
}

function renderMap(L, host, { crop, selected, sheet, callouts } = {}) {
  const [vx, vy, vw, vh] = crop || [0, 0, L.W, L.H];
  const svg = el('svg', { viewBox: `${vx} ${vy} ${vw} ${vh}`, role: 'img', 'aria-label': 'Wireframe of the games as islands' });
  host.append(svg);
  const water = el('g', {}, svg);
  const land = el('g', {}, svg);
  const roads = el('g', {}, svg);
  const things = el('g', {}, svg);
  const labels = el('g', {}, svg);
  const top = el('g', {}, svg);

  for (const [x, y] of L.waves) el('path', { class: 'w-water-line', d: `M${x},${y}q8,-6 16,0t16,0t16,0` }, water);
  for (const s of L.sandbars) el('path', { class: 'w-sandbar', d: smooth(blobPts(s.cx, s.cy, s.rx, s.ry, 2, 10), true) }, land);

  const spots = [];
  for (const isl of L.islands) {
    el('path', { class: 'w-island', d: smooth(blobPts(isl.cx, isl.cy, isl.rx, isl.ry, isl.seed), true) }, land);
    const list = games.filter((g) => primaryCat(g) === isl.cat);
    const mine = isl.slots.slice(0, list.length).map(([x, y], i) => ({ g: list[i], x, y }));
    spots.push(...mine);

    // Rings of small circles stand in for the forest; kept off the places
    const keep = [...mine.map((s) => [s.x, s.y]), isl.sign, isl.entry, isl.exit, isl.plot].filter(Boolean);
    for (const [k, n] of [[0.82, 22], [0.6, 14]]) {
      for (const [px, py] of blobPts(isl.cx, isl.cy, isl.rx * k, isl.ry * k, isl.seed, n)) {
        if (keep.some(([ax, ay]) => Math.hypot(ax - px, ay - py) < 56)) continue;
        el('circle', { class: 'w-trees', cx: px, cy: py, r: 7 }, land);
      }
    }

    const route = [isl.entry, ...mine.map((s) => [s.x, s.y]), isl.exit].filter(Boolean);
    el('path', { class: 'w-road', d: smooth(route, false) }, roads);
    sign(isl.sign, catLabel[isl.cat], things);

    if (isl.plot) {
      const [x, y] = isl.plot;
      el('rect', { class: 'w-plot', x: x - 17, y: y - 15, width: 34, height: 30, rx: 4 }, things);
      label(x, y + 34, 'Empty plot', labels, 'w-label--soft');
    }
    for (const s of mine) {
      if (s.g.featured) landmark(s.x, s.y, things);
      else cabin(s.x, s.y, things);
      label(s.x, s.y + (s.g.featured ? 46 : 34), s.g.title, labels, s.g.featured ? 'w-label--big' : '');
    }
  }

  // Fords: from each island's exit to the next island's entry
  L.islands.slice(0, -1).forEach((isl, i) => {
    const a = isl.exit;
    const b = L.islands[i + 1].entry;
    const via = L.fordVia[i];
    el('path', { class: 'w-ford', d: via ? smooth([a, via, b], false) : `M${a[0]},${a[1]}L${b[0]},${b[1]}` }, roads);
  });
  Object.assign(el('text', { class: 'w-ford-label', x: L.fordLabel[0], y: L.fordLabel[1], 'text-anchor': 'middle' }, labels), { textContent: 'ford' });

  // Start: the car waits at the first island's entry
  const [sx, sy] = L.islands[0].entry;
  if (selected) {
    car(sx, sy - 6, 180, top, 'w-start');
  } else {
    car(sx, sy - 6, 180, top);
  }
  label(sx + 44, sy - 2, 'Start', labels, 'w-label--soft');

  if (selected) {
    const s = spots.find((p) => p.g.slug === selected.slug);
    el('circle', { class: 'w-selected', cx: s.x, cy: s.y, r: 30 }, top);
    car(...selected.car, top);
    if (!sheet) {
      const [x, y, w] = selected.card;
      el('line', { class: 'w-pointer', x1: x + w, y1: y + 150, x2: s.x - 30, y2: s.y }, top);
    }
    card(s.g, selected.card, top, sheet);
  }
  for (const [n, x, y] of callouts || []) callout(n, x, y, top);
}

renderMap(LAYOUTS.desk, document.querySelector('[data-map="desk"]'), {
  selected: LAYOUTS.desk.selected,
  callouts: LAYOUTS.desk.callouts,
});
renderMap(LAYOUTS.phone, document.querySelector('[data-map="phone"]'));
renderMap(LAYOUTS.phone, document.querySelector('[data-map="screen"]'), {
  crop: [0, 600, 390, 844],
  selected: { slug: 'sweet-shot', car: [316, 838, 270], card: [0, 1094, 390, 350] },
  sheet: true,
});
