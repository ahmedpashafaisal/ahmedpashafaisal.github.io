// Fox test (dev only): each option stands next to forest trees at real size.
// Sizes follow forest.js: base tree height from the window, fox about half a tree.
import { FOXES } from './foxes.js';
import { SPRITES } from '../forest-test/sprites.js';

const OPTIONS = [
  ['1a', 'Bean', 'head and body in one shape'],
  ['1b', 'Upright', 'round head on a small body, stands on two feet'],
  ['1c', 'Sleek', 'long body, tall ears'],
  ['2a', 'Round head', 'four stubby legs'],
  ['2b', 'Round head, softer', 'four stubby legs, rounder'],
  ['2c', 'Sleek, tall ears', 'long body and tail'],
];
const POSES = ['stand', 'sit', 'hop'];
const PINES = Object.keys(SPRITES).filter((k) => k.startsWith('pine'));

const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
const atlas = await load('/forest-test/atlas.webp');
const imgs = {};
await Promise.all(Object.keys(FOXES).map(async (k) => { imgs[k] = await load(`/fox-test/${k}.webp`); }));

const real = document.querySelector('.fx-real');
const close = document.querySelector('.fx-close');

function card(id, name, note) {
  const fig = document.createElement('figure');
  fig.className = 'fx-card';
  fig.innerHTML = `<figcaption><b>${id}: ${name}</b>, ${note}</figcaption>`;
  return fig;
}

function drawReal() {
  real.replaceChildren();
  const base = Math.max(72, Math.min(150, Math.sqrt(innerWidth * innerHeight) * 0.105));
  const dpr = Math.min(2, devicePixelRatio || 1);
  for (const [id, name, note] of OPTIONS) {
    const fig = card(id, name, note);
    const c = document.createElement('canvas');
    fig.prepend(c);
    real.append(fig);
    const W = fig.clientWidth;
    const H = Math.round(base * 1.75);
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.height = `${H}px`;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    // Forest edge along the top, clearing below, like the landing
    g.fillStyle = '#223b2b';
    g.fillRect(0, 0, W, base * 0.62);
    g.fillStyle = '#a98a62';
    g.fillRect(0, base * 0.62, W, base * 0.08);
    g.fillStyle = '#3d2b1c';
    g.fillRect(0, base * 0.62, W, 2);
    let n = 0;
    for (let x = -base * 0.2; x < W + base * 0.3; x += base * 0.5, n++) {
      const [sx, sy, sw, sh, fx, fy] = SPRITES[PINES[(n * 5) % PINES.length]];
      const s = (base * (0.85 + ((n * 37) % 30) / 100)) / sh;
      g.drawImage(atlas, sx, sy, sw, sh, x - fx * s, base * 0.66 - fy * s, sw * s, sh * s);
    }
    // Three poses on the ground; one scale per option, standing = half a tree
    const scale = (base * 0.5) / FOXES[`${id}-stand`][1];
    POSES.forEach((p, i) => {
      const [w, h, fx, fy] = FOXES[`${id}-${p}`];
      const x = (W / 3) * (i + 0.5);
      g.drawImage(imgs[`${id}-${p}`], x - fx * scale, base * 1.5 - fy * scale, w * scale, h * scale);
    });
  }
}

for (const [id, name, note] of OPTIONS) {
  const fig = card(id, name, note);
  const row = document.createElement('div');
  row.className = 'fx-poses';
  // Same scale for all three poses, so sitting and hopping keep their real size
  const tallest = Math.max(...POSES.map((p) => FOXES[`${id}-${p}`][1]));
  row.innerHTML = POSES.map((p) => {
    const pct = (FOXES[`${id}-${p}`][1] / tallest) * 100;
    return `<img src="/fox-test/${id}-${p}.webp" alt="${name} fox, ${p}" style="height:${(170 * pct) / 100}px">`;
  }).join('');
  fig.prepend(row);
  close.append(fig);
}

drawReal();
let t = 0;
addEventListener('resize', () => { clearTimeout(t); t = setTimeout(drawReal, 150); });
