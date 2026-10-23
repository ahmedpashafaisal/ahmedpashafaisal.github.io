// Fox on the forest test page (dev only, forest step 3b): starts sitting by
// the campfire, runs where the visitor clicks in the clearing, and plays its
// motions from the bottom toolbar. Clicks on the text, buttons or toolbars
// do not move it; clicks in the trees send it to the nearest clearing edge.
import { makeFox } from './fox.js';

const layer = document.querySelector('.fox-layer');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let fox = null;
let scene = null;

// The point on the line from the clearing's centre toward (x, y) that is still
// well inside the light ground
function inside(x, y, limit = 0.86) {
  const { blob } = scene;
  if (blob.rel(x, y) <= limit) return [x, y];
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const m = (lo + hi) / 2;
    if (blob.rel(blob.cx + (x - blob.cx) * m, blob.cy + (y - blob.cy) * m) <= limit) lo = m;
    else hi = m;
  }
  return [blob.cx + (x - blob.cx) * lo, blob.cy + (y - blob.cy) * lo];
}

const off = new URLSearchParams(location.search).has('nofox'); // test: page cost without the fox

addEventListener('forest:layout', (e) => {
  if (off) return;
  scene = e.detail;
  const px = scene.base * 0.5; // half a tree
  if (!fox) {
    fox = makeFox(layer, { reducedMotion: reduced });
    fox.put(scene.fire.x - scene.base * 0.9, scene.fire.y - 2, px);
    fox.play('sit');
    return;
  }
  // New size or new forest: stay put if still on the light ground, else back to the fire
  const { x, y } = fox.state;
  if (scene.blob.rel(x, y) <= 0.9) fox.resize(px);
  else {
    fox.put(scene.fire.x - scene.base * 0.9, scene.fire.y - 2, px);
    fox.play('sit');
  }
});

addEventListener('click', (e) => {
  if (!fox || e.target.closest('button, a, .ft-bar, .ft-clearing > *')) return;
  const [x, y] = inside(e.clientX, e.clientY);
  fox.runTo(x, y);
});

// Test toolbar
document.querySelector('.ft-bar--fox').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !fox) return;
  const what = b.dataset.fox;
  if (what === 'slow') {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    fox.slow(on);
    return;
  }
  if (what === 'run') {
    // A random spot on the light ground, at least two fox lengths away
    const { blob } = scene;
    for (let i = 0; i < 50; i++) {
      const x = blob.cx + (Math.random() * 2 - 1) * blob.rx;
      const y = blob.cy + (Math.random() * 2 - 1) * blob.ry;
      if (blob.rel(x, y) < 0.8 && Math.hypot(x - fox.state.x, y - fox.state.y) > fox.state.px * 2) {
        fox.runTo(x, y);
        break;
      }
    }
    return;
  }
  if (what === 'pounce') {
    // Leap toward the open side so it lands on the clearing
    const land = fox.state.x + fox.state.px * 1.3 * fox.state.dir;
    if (scene.blob.rel(land, fox.state.y) > 0.86) fox.face(-fox.state.dir);
  }
  fox.play(what);
});

// Test hooks (dev page only): state, and the fox itself for close-up shots
window.__foxApi = () => fox;
window.__fox = () => {
  const s = fox.state;
  return { x: Math.round(s.x), y: Math.round(s.y), dir: s.dir, action: s.action, eyes: s.eyes, awake: fox.awake, px: Math.round(s.px), rel: Math.round(scene.blob.rel(s.x, s.y) * 100) / 100 };
};
