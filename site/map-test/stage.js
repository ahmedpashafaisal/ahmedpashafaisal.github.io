// Map look test (step 6a, dev only): what the 2D and 3D versions share.
// The map pins while you scroll through its section; the scroll position
// drives the car along the road, stop by stop (it parks at each stop, then
// drives on). Clicking a place scrolls the page there, so the car drives the
// same road either way. The stop the car is at lights up (spotlight, pop, or
// dim the rest) and the card shows that game. Renderers only draw: they get
// the world and each frame's state, and say where a world point is on screen.
import { buildWorld } from './world.js';

const STOP_VH = 0.3; // scroll per stop, share of the screen height
const LIT_R = 80; // car this close (road distance) to a stop: it lights up
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const STORE = { steam: 'Steam', appStore: 'App Store', googlePlay: 'Google Play', itch: 'itch.io', gdd: 'Design doc' };

const query = new URLSearchParams(location.search);
const opts = {
  view: query.get('v') || '2d', // 2d | 3d
  light: query.get('l') || 'spot', // spot | pop | dim
  camera: query.get('c') || 'whole', // whole | follow
};

const section = document.querySelector('.map');
const view = section.querySelector('.map__view');
const labels = section.querySelector('.map__labels');
const card = section.querySelector('.map__card');

let world = null;
let renderer = null;
let carD = 0;
let carA = 0;
let lastD = 0;
let back = false;
let cam = null;
let current = -1;
let tween = null;
let places = [];
let titles = [];
let regionTags = [];

/* ---------- scroll ↔ car ---------- */
const span = () => section.offsetHeight - innerHeight;
const progress = () => clamp((scrollY - section.offsetTop) / Math.max(1, span()), 0, 1);
// Progress 0..1 → road distance: parked at a stop for the first and last
// part of each stretch, driving in between
function roadAt(t) {
  const n = world.stops.length;
  const u = t * (n - 1);
  const i = Math.min(n - 2, Math.floor(u));
  const g = smooth(clamp((u - i - 0.2) / 0.6, 0, 1));
  return world.stops[i].d + (world.stops[i + 1].d - world.stops[i].d) * g;
}
const scrollFor = (i) => section.offsetTop + (i / (world.stops.length - 1)) * span();

// Click a place: the page scrolls there (so the car drives the road), the
// longer the trip the longer it takes. Wheel or touch takes over at once.
function goTo(i) {
  const from = scrollY;
  const to = scrollFor(i);
  const ms = clamp(380 + Math.abs(i - progress() * (world.stops.length - 1)) * 260, 450, 2600);
  const t0 = performance.now();
  tween = { stop: false };
  const me = tween;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const step = (now) => {
    if (me.stop) return;
    const k = Math.min(1, (now - t0) / ms);
    scrollTo(0, from + (to - from) * ease(k));
    if (k < 1) requestAnimationFrame(step);
    else tween = null;
  };
  requestAnimationFrame(step);
}
['wheel', 'touchstart', 'keydown'].forEach((t) => addEventListener(t, () => tween && (tween.stop = true), { passive: true }));

/* ---------- camera: whole board, or following the car ---------- */
function camera(w, h) {
  const fit = Math.min(w / world.W, h / world.H) * 0.96;
  if (opts.camera === 'whole') return { cx: world.W / 2, cy: world.H / 2, scale: fit };
  const scale = Math.max(fit * 2, Math.min(1.1, fit * 3));
  const car = world.at(carD);
  // Keep the board filling the view where it can
  const hw = w / scale / 2;
  const hh = h / scale / 2;
  const cx = hw * 2 >= world.W ? world.W / 2 : clamp(car.x, hw, world.W - hw);
  const cy = hh * 2 >= world.H ? world.H / 2 : clamp(car.y - 40, hh, world.H - hh);
  return { cx, cy, scale };
}

/* ---------- places, names, region labels (HTML over either renderer) ---------- */
function buildLabels() {
  labels.innerHTML = '';
  places = world.stops.map((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'map-place';
    b.setAttribute('aria-label', `${s.g.title}: drive here`);
    b.addEventListener('click', () => goTo(s.i));
    labels.append(b);
    return b;
  });
  titles = world.stops.map((s) => {
    const t = document.createElement('span');
    t.className = `map-title${s.legendary ? ' is-legendary' : ''}`;
    t.textContent = s.g.title;
    t.setAttribute('aria-hidden', 'true');
    t.addEventListener('click', () => goTo(s.i));
    labels.append(t);
    return t;
  });
  regionTags = world.patches
    .filter((p) => p.first)
    .map((p) => {
      const c = world.categories.find((k) => k.id === p.cat);
      const t = document.createElement('span');
      t.className = 'map-region';
      t.style.setProperty('--cat', `var(--cat-${p.cat})`);
      t.textContent = c.label;
      labels.append(t);
      return { el: t, p };
    });
}

function placeLabels(scale) {
  const pr = renderer.project;
  world.stops.forEach((s, i) => {
    const [l, t] = pr(s.x - s.w / 2 - 4, s.y - 30, 26 + s.h + 4);
    const [r, b] = pr(s.x + s.w / 2 + 4, s.y - 30, 0);
    Object.assign(places[i].style, { left: `${l}px`, top: `${t}px`, width: `${r - l}px`, height: `${b - t}px` });
    // Name plate on the billboard's posts, so it can't be read as the next row's
    const [tx, ty] = pr(s.x, s.y - 30, 16);
    titles[i].style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) translate(-50%, -50%)`;
    // Zoomed far out (phone, whole board): only the lit stop keeps its name
    titles[i].classList.toggle('is-hidden', scale < 0.5 && i !== current);
  });
  for (const { el, p } of regionTags) {
    const [x, y] = pr(p.l + 6, p.t + 4, 0);
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}

/* ---------- focus card ---------- */
function showCard(i) {
  const g = world.stops[i].g;
  const store = Object.entries(g.links || {}).find(([k]) => STORE[k]);
  card.innerHTML = `
    <img class="map-card__img" src="${esc(g.media.card)}" alt="" />
    <p class="map-card__kicker">${esc([g.year, g.platforms.join(', '), g.genre].join(' · '))}</p>
    <h3 class="map-card__title">${esc(g.title)}</h3>
    <p class="map-card__blurb">${esc(g.blurb)}</p>
    <p class="map-card__role"><b>My role</b> ${esc(g.role)}</p>
    <div class="map-card__links">
      <a class="map-card__open" href="/games/${esc(g.slug)}.html">Open game →</a>
      ${store ? `<a class="map-card__store" href="${esc(store[1])}" target="_blank" rel="noopener">${STORE[store[0]]}</a>` : ''}
    </div>`;
  card.animate([{ transform: 'translateY(8px) scale(0.98)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
}

/* ---------- loop ---------- */
const lit = new Float32Array(32);
function frame(now) {
  if (!world || !renderer) return requestAnimationFrame(frame);
  carD = roadAt(progress());
  if (Math.abs(carD - lastD) > 0.5) back = carD < lastD;
  lastD = carD;
  const p = world.at(carD);
  const want = p.a + (back ? Math.PI : 0);
  carA += Math.atan2(Math.sin(want - carA), Math.cos(want - carA)) * 0.25;
  let best = -1;
  let bestK = 0;
  world.stops.forEach((s, i) => {
    const k = smooth(clamp(1 - Math.abs(carD - s.d) / LIT_R, 0, 1));
    lit[i] = k;
    if (k > bestK) {
      bestK = k;
      best = i;
    }
  });
  if (best >= 0 && bestK > 0.5 && best !== current) {
    current = best;
    showCard(best);
  }
  const w = view.clientWidth;
  const h = view.clientHeight;
  const target = camera(w, h);
  // Ease the camera so a follow cut never jumps
  cam = cam ? { cx: cam.cx + (target.cx - cam.cx) * 0.12, cy: cam.cy + (target.cy - cam.cy) * 0.12, scale: cam.scale + (target.scale - cam.scale) * 0.12 } : target;
  renderer.frame({ now, car: { x: p.x, y: p.y, a: carA }, lit, max: bestK, current, light: opts.light, cam, w, h });
  placeLabels(cam.scale);
  requestAnimationFrame(frame);
}

/* ---------- switching versions ---------- */
async function load() {
  renderer?.destroy();
  renderer = null;
  view.querySelector('.map-render')?.remove();
  const aspect = view.clientWidth / Math.max(1, view.clientHeight);
  world = buildWorld(aspect);
  section.style.setProperty('--stops', world.stops.length);
  const make = opts.view === '3d' ? (await import('./map3d.js')).make3d : (await import('./map2d.js')).make2d;
  const r = await make(world);
  r.el.classList.add('map-render');
  view.prepend(r.el);
  renderer = r;
  cam = null;
  buildLabels();
  current = -1;
}

function bar() {
  document.querySelectorAll('.mt-bar [data-k]').forEach((b) => {
    b.setAttribute('aria-pressed', String(opts[b.dataset.k] === b.dataset.v));
    b.onclick = () => {
      opts[b.dataset.k] = b.dataset.v;
      const q = new URLSearchParams({ v: opts.view, l: opts.light, c: opts.camera });
      history.replaceState(null, '', `?${q}`);
      bar();
      if (b.dataset.k === 'view') load();
    };
  });
}

let resizeT = 0;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(load, 200);
});

bar();
await load();
requestAnimationFrame(frame);
window.__map = { opts, world: () => world, current: () => current, carD: () => carD, goTo };
