// Forest test (dev only): Kie sprites placed by code on one canvas.
// The clearing is sized to the window, trees fill the rest, the campfire sits
// under the button. Trees sway when the pointer brushes past; the canvas only
// redraws while something moves, so it sleeps when the page is still.
import { SPRITES } from './sprites.js';

const canvas = document.querySelector('.forest');
const ctx = canvas.getContext('2d');
const nightLayer = document.querySelector('.forest-night');
const textBlock = document.querySelector('.ft-clearing');
const nameEl = document.querySelector('.ft-name');
const button = document.querySelector('.ft-btn');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Colours sampled from the chosen Kie picture (refs/forest-style/raw/b-day-2.png)
const C = {
  floor: '#223b2b',
  floorLight: '#2f5234',
  rim: '#a98a62',
  clearing: '#c8a979',
  edge: '#3d2b1c',
  night: '#5a7898',
};
const PINES = Object.keys(SPRITES).filter((k) => k.startsWith('pine'));
const SHADES = [0.86, 1, 1.1];

const atlas = new Image();
atlas.src = '/forest-test/atlas.webp';

// Seeded random: the same seed gives the same forest, so a resize keeps its character
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const params = new URLSearchParams(location.search);
let seed = Number(params.get('seed')) || (Math.random() * 2 ** 31) | 0;
let night = params.get('time') === 'night';
let kit = ['lime', 'amber', 'wood', 'parchment'].includes(params.get('kit')) ? params.get('kit') : 'amber';

let W = 0;
let H = 0;
let dpr = 1;
let scene = null;
let variants = null;

// Each pine in three shades, made once, so a frame never runs a canvas filter
function makeVariants() {
  variants = {};
  for (const name of PINES) {
    const [sx, sy, sw, sh] = SPRITES[name];
    variants[name] = SHADES.map((b) => {
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      const g = c.getContext('2d');
      g.filter = `brightness(${b})`;
      g.drawImage(atlas, sx, sy, sw, sh, 0, 0, sw, sh);
      return c;
    });
  }
}

// The clearing: a rounded rectangle-ish oval (superellipse, like Ahmed's drawn
// outline) whose radius wobbles with a few sine waves (bays and points)
const ROUND = 2.6; // 2 = plain oval; higher = fuller corners, more room for text
function makeBlob(rand, cx, cy, rx, ry) {
  const waves = [2, 3, 4, 5].map((k, i) => ({
    k,
    a: [0.05, 0.035, 0.025, 0.015][i] * (0.6 + rand() * 0.8),
    p: rand() * Math.PI * 2,
  }));
  const shape = (t) => (Math.abs(Math.cos(t)) ** ROUND + Math.abs(Math.sin(t)) ** ROUND) ** (-1 / ROUND);
  const r = (t) => shape(t) * (1 + waves.reduce((s, w) => s + w.a * Math.sin(w.k * t + w.p), 0));
  // Distance relative to the edge: below 1 inside the clearing, above 1 outside
  const rel = (x, y) => {
    const u = (x - cx) / rx;
    const v = (y - cy) / ry;
    return Math.hypot(u, v) / r(Math.atan2(v, u));
  };
  const at = (t, k) => [cx + Math.cos(t) * rx * r(t) * k, cy + Math.sin(t) * ry * r(t) * k];
  const path = (k) => {
    const p = new Path2D();
    for (let i = 0; i <= 180; i++) {
      const [x, y] = at((i / 180) * Math.PI * 2, k);
      if (i) p.lineTo(x, y);
      else p.moveTo(x, y);
    }
    p.closePath();
    return p;
  };
  return { cx, cy, rx, ry, rel, at, ring: path(1.09), rim: path(1), inner: path(0.95) };
}

// Furthest corner of the text (name, roles, button), relative to the clearing's
// edge: 1 is on the edge, below 0.95 is on the light inner ground
// A wrapped heading's box spans the full width, so text is measured line by line
const range = document.createRange();
function textReach(blob) {
  let worst = 0;
  for (const el of textBlock.children) {
    let rects = [el.getBoundingClientRect()];
    if (el.tagName !== 'BUTTON') {
      range.selectNodeContents(el);
      rects = [...range.getClientRects()].filter((r) => r.width > 0);
    }
    for (const r of rects) {
      for (const [x, y] of [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]]) {
        worst = Math.max(worst, blob.rel(x, y));
      }
    }
  }
  return worst;
}

// Start from the CSS size (it follows the window), then shrink the name until
// all the text sits inside the light part of this clearing
function fitName(blob) {
  nameEl.style.removeProperty('--name-size');
  let size = parseFloat(getComputedStyle(nameEl).fontSize);
  const min = W < 640 ? 34 : 38; // never smaller than this, even on a tight clearing
  for (let i = 0; i < 20 && textReach(blob) > 0.9 && size * 0.93 >= min; i++) {
    size *= 0.93;
    nameEl.style.setProperty('--name-size', `${size}px`);
  }
}

function layout() {
  const rand = rng(seed);
  const phone = W < 640;
  const base = Math.max(72, Math.min(150, Math.sqrt(W * H) * 0.105));
  // Desktop: Ahmed's outline, about 72% x 86% of the window. Phone: nearly full
  // width with forest bands above and below (0.43 leaves room for the wobble)
  const blob = makeBlob(rand, W / 2, H / 2, W * (phone ? 0.43 : 0.36), H * (phone ? 0.36 : 0.43));
  fitName(blob);
  const items = [];
  const clear = []; // spots kept free of trees so props stay visible

  const add = (name, x, y, size, extra = {}) => {
    const s = SPRITES[name];
    const scale = size / (extra.tree ? s[3] : s[2]);
    const it = { name, x, y, scale, h: s[3] * scale, a: 0, v: 0, ...extra };
    items.push(it);
    return it;
  };

  // Text area, so props on the clearing never sit under the words
  const tr = [...textBlock.children].map((el) => el.getBoundingClientRect());
  const text = {
    l: Math.min(...tr.map((r) => r.left)) - base * 0.3,
    r: Math.max(...tr.map((r) => r.right)) + base * 0.3,
    t: Math.min(...tr.map((r) => r.top)) - base * 0.3,
    b: Math.max(...tr.map((r) => r.bottom)) + base * 0.3,
  };
  const onText = (x, y) => x > text.l && x < text.r && y > text.t && y < text.b;

  // Campfire: centred under the button, foot kept inside the clearing; on short
  // screens it shrinks to the room left (at most to half size)
  const fs = SPRITES.campfire;
  const b = button.getBoundingClientRect();
  const gap = Math.max(16, H * 0.035);
  const floor = blob.cy + blob.ry * 0.86;
  const fullW = base * (phone ? 0.95 : 0.85);
  const room = floor - b.bottom - gap;
  const fireW = Math.max(fullW * 0.5, Math.min(fullW, (room / fs[3]) * fs[2]));
  const fireH = (fireW / fs[2]) * fs[3];
  const fireY = Math.min(b.bottom + gap + fireH, floor);
  const fire = add('campfire', W / 2, fireY, fireW, { fire: true });
  text.b = Math.max(text.b, fireY);

  // Forest props in small gaps among the trees
  const forestSpot = () => {
    for (let i = 0; i < 40; i++) {
      const x = rand() * W;
      const y = rand() * H;
      if (blob.rel(x, y) > 1.15) return [x, y];
    }
    return null;
  };
  const scatter = (name, n, size, gap) => {
    for (let i = 0; i < n; i++) {
      const p = forestSpot();
      if (!p) continue;
      const it = add(name, p[0], p[1], size * (0.85 + rand() * 0.3));
      clear.push([it.x, it.y - it.h * 0.4, size * gap]);
    }
  };
  const area = (W * H) / (1440 * 900);
  scatter('boulder', Math.round(3 * area) || 1, base * 0.55, 0.75);
  scatter('log', Math.round(2 * area) || 1, base * 0.6, 0.7);
  scatter('stones', Math.round(3 * area), base * 0.38, 0.6);
  scatter('mushrooms', Math.round(5 * area) || 2, base * 0.24, 0.45);
  scatter('fern', Math.round(6 * area) || 2, base * 0.3, 0.5);

  // Props on the clearing, near its rim, away from the text
  const rimSpot = (lo, hi) => {
    for (let i = 0; i < 60; i++) {
      const [x, y] = blob.at(rand() * Math.PI * 2, lo + rand() * (hi - lo));
      if (!onText(x, y)) return [x, y];
    }
    return null;
  };
  const rim = (name, n, size, lo, hi) => {
    for (let i = 0; i < n; i++) {
      const p = rimSpot(lo, hi);
      if (p) add(name, p[0], p[1], size * (0.8 + rand() * 0.4));
    }
  };
  rim('stones', 3, base * 0.34, 0.8, 0.92);
  rim('stone', 2, base * 0.17, 0.84, 0.93);
  rim('grass', 6, base * 0.24, 0.9, 1.02);
  rim('mushrooms', 1, base * 0.2, 0.95, 1.05);

  // Trees: a jittered grid over the whole window, skipping the clearing and the props
  const trees = [];
  const dx = base * 0.5;
  const dy = base * 0.34;
  for (let row = 0, y = -base * 0.2; y < H + base * 1.1; row++, y += dy) {
    for (let x = -base * 0.5 + (row % 2) * dx * 0.5; x < W + base * 0.5; x += dx) {
      const px = x + (rand() - 0.5) * dx * 0.7;
      const py = y + (rand() - 0.5) * dy * 0.7;
      const h = base * (0.75 + rand() * 0.45);
      const pick = PINES[(rand() * PINES.length) | 0];
      const shade = (rand() * SHADES.length) | 0;
      if (rand() < 0.04) continue; // a few gaps let the floor show
      if (blob.rel(px, py) < 1.03 || blob.rel(px, py - h * 0.5) < 1 || blob.rel(px, py - h * 0.85) < 0.95) continue;
      if (clear.some(([cx, cy, r]) => Math.hypot(px - cx, py - h * 0.4 - cy) < r)) continue;
      trees.push(add(pick, px, py, h, { tree: true, shade }));
    }
  }

  items.sort((a, z) => a.y - z.y);
  scene = { base, blob, items, trees, fire, fireH };
  placeNight();
  // The fox (fox-stage.js) needs the clearing's shape, the tree size and the campfire
  dispatchEvent(new CustomEvent('forest:layout', { detail: scene }));
}

function drawItem(it) {
  const [sx, sy, sw, sh, fx, fy] = SPRITES[it.name];
  const s = it.scale * dpr;
  const cos = Math.cos(it.a) * s;
  const sin = Math.sin(it.a) * s;
  // Rotate about the foot: trees bend from the trunk
  ctx.setTransform(cos, sin, -sin, cos, it.x * dpr, it.y * dpr);
  if (it.tree) ctx.drawImage(variants[it.name][it.shade], -fx, -fy);
  else ctx.drawImage(atlas, sx, sy, sw, sh, -fx, -fy, sw, sh);
}

let lastDrawMs = 0;
function draw() {
  const t0 = performance.now();
  const { blob, items, fire } = scene;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.floorLight;
  ctx.fill(blob.ring);
  ctx.fillStyle = C.rim;
  ctx.fill(blob.rim);
  ctx.lineWidth = Math.max(2, scene.base * 0.022);
  ctx.strokeStyle = C.edge;
  ctx.stroke(blob.rim);
  ctx.fillStyle = C.clearing;
  ctx.fill(blob.inner);
  for (const it of items) drawItem(it);
  if (night) {
    // Moonlight: tint everything blue, then draw the campfire again untinted
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = C.night;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    drawItem(fire);
  }
  lastDrawMs = performance.now() - t0;
}

// Night extras: a flickering glow on the campfire and fireflies among the trees
function placeNight() {
  nightLayer.replaceChildren();
  nightLayer.hidden = !night;
  if (!night) return;
  const { fire, fireH, base, blob } = scene;
  const glow = document.createElement('div');
  glow.className = 'campfire-glow';
  glow.style.cssText = `left:${fire.x}px;top:${fire.y - fireH * 0.55}px;--r:${base * 3.2}px`;
  nightLayer.append(glow);
  const rand = rng(seed ^ 0x5eed);
  const n = W < 640 ? 7 : 14;
  for (let i = 0, tries = 0; i < n && tries < 200; tries++) {
    const x = rand() * W;
    const y = rand() * H;
    if (blob.rel(x, y) < 1.08) continue;
    const f = document.createElement('span');
    f.className = 'firefly';
    f.style.cssText = `left:${x}px;top:${y}px;--d:${7 + rand() * 6}s;--b:${2 + rand() * 3}s;--dx:${(rand() - 0.5) * 60}px;--dy:${(rand() - 0.5) * 40}px;animation-delay:${-rand() * 6}s`;
    nightLayer.append(f);
    i++;
  }
}

// Sway: a pointer brushing past pushes trees the way it moves; a spring brings them back
const active = new Set();
let raf = 0;
let last = 0;
let pointer = null;
let peakBend = 0; // largest bend so far, for the test hook

function tick(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  for (const it of active) {
    it.v += (-140 * it.a - 9 * it.v) * dt;
    it.a = Math.max(-0.25, Math.min(0.25, it.a + it.v * dt));
    peakBend = Math.max(peakBend, Math.abs(it.a));
    if (Math.abs(it.a) < 0.0005 && Math.abs(it.v) < 0.005) {
      it.a = 0;
      it.v = 0;
      active.delete(it);
    }
  }
  draw();
  raf = active.size ? requestAnimationFrame(tick) : 0;
}

function wake() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

addEventListener(
  'pointermove',
  (e) => {
    if (reduceMotion || !scene) return;
    const p = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    if (pointer && p.t - pointer.t < 100) {
      const vx = (p.x - pointer.x) / Math.max(8, p.t - pointer.t); // px per ms
      for (const it of scene.trees) {
        const reach = scene.base * 0.35 + it.h * 0.35;
        const d = Math.hypot(p.x - it.x, p.y - (it.y - it.h * 0.55));
        if (d > reach) continue;
        // 0.3: a slow pass bends a tree about 4 degrees, a flick about 8
        it.v += vx * (1 - d / reach) * 0.3;
        active.add(it);
      }
      if (active.size) wake();
    }
    pointer = p;
  },
  { passive: true },
);

function resize() {
  W = innerWidth;
  H = innerHeight;
  dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  active.clear();
  layout();
  draw();
}

function setNight(on) {
  night = on;
  document.documentElement.dataset.theme = night ? 'dark' : 'light';
  document.querySelectorAll('[data-k="time"]').forEach((b) => {
    b.setAttribute('aria-pressed', String((b.dataset.v === 'night') === night));
  });
  params.set('time', night ? 'night' : 'day');
  params.set('seed', seed);
  history.replaceState(null, '', `?${params}`);
}

function setKit(v) {
  kit = v;
  document.documentElement.dataset.kit = kit;
  document.querySelectorAll('[data-k="kit"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === kit)));
  params.set('kit', kit);
  history.replaceState(null, '', `?${params}`);
}

document.querySelector('.ft-bar').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.k === 'kit') return setKit(b.dataset.v);
  if (b.dataset.k === 'time') setNight(b.dataset.v === 'night');
  if (b.dataset.k === 'reroll') {
    seed = (Math.random() * 2 ** 31) | 0;
    setNight(night);
    layout();
  }
  placeNight();
  draw();
});

let resizeTimer = 0;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 150);
});

// Test hook (dev page only)
window.__forest = () => ({
  seed,
  trees: scene.trees.length,
  items: scene.items.length,
  awake: !!raf,
  swaying: active.size,
  drawMs: Math.round(lastDrawMs * 10) / 10,
  peakBendDeg: Math.round(peakBend * 573) / 10,
  textReach: Math.round(textReach(scene.blob) * 100) / 100,
  nameSize: Math.round(parseFloat(getComputedStyle(nameEl).fontSize)),
  fire: { x: scene.fire.x, y: scene.fire.y, top: scene.fire.y - scene.fireH },
});

Promise.all([atlas.decode(), document.fonts.ready]).then(() => {
  makeVariants();
  setKit(kit);
  setNight(night);
  resize();
});
