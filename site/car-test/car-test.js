// Car look test (step S2, dev only). One card per car option, each with
// three views drawn by one renderer (scissor panes):
//   landing: the landing's camera and the car at its real size there (76 px
//     long on desktop, 58 on phones), circling a bulb at its real size;
//   parked: a three-quarter view, the car parked in a section (step S3 idea);
//   close-up: the same view, close, turning slowly.
// Switches: body colour (code car), light (today's or deeper shading),
// desktop or phone size, light or dark page.
import { CircleGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { bulbModel } from '../src/js/hero3d.js';
import { codeToy, kenney, today } from './cars.js';

const INK = 0x1d1b18;
const BULB_PX = 84; // landing bulb width at 1440
const CAR_PX = { desktop: 76, phone: 58 };
const PARK_PX = 130; // parked car length in its pane
const PANE_H = 300;

const OPTIONS = [
  { id: 'today', name: 'Today', note: 'The landing car now: two boxes and four cylinders, ink body, cream cabin. For comparison.', weight: 'No change', make: async () => today() },
  { id: 'toy', name: 'A. Toy car in code', note: 'Same size and colours as today, rebuilt rounder: dark glass, roof and twin stripes on top (what you see from above), chunky tyres with cream hubs, bumpers, lime headlights. Body colour switch above.', weight: 'About +2 KB of script', make: async () => codeToy() },
  { id: 'hatch', name: 'B. Hatchback (Kenney Car Kit, CC0)', note: 'Ready-made toy model, restyled with the site shading and ink outline. Colours are its own (changeable later in its colour map).', weight: 'About +56 KB: loader script 14, model 29, colour map 12 (three.js is already loaded)', make: () => kenney('/car-test/models/car-kit/hatchback-sports.glb') },
  { id: 'sedan', name: 'C. Sports sedan (Kenney Car Kit, CC0)', note: 'Ready-made, with a spoiler. Same restyle as B.', weight: 'About +55 KB: loader script 14, model 28, colour map 12', make: () => kenney('/car-test/models/car-kit/sedan-sports.glb') },
  { id: 'speedster', name: 'D. Speedster (Kenney Toy Car Kit, CC0)', note: 'Open-top toy racer, the most "toy" of the set. Same restyle as B.', weight: 'About +47 KB: loader script 14, model 24, colour map 9', make: () => kenney('/car-test/models/toy-car-kit/vehicle-speedster.glb', { front: -1 }) },
];

const query = new URLSearchParams(location.search);
const opts = {
  colour: query.get('colour') || 'ink',
  light: query.get('light') || 'today',
  size: query.get('size') || (innerWidth < 700 ? 'phone' : 'desktop'),
  theme: query.get('theme') || 'light',
};
const dark = () => opts.theme === 'dark';

/* ---------- switches ---------- */

function syncBar() {
  document.querySelectorAll('.ct-bar button').forEach((b) => b.setAttribute('aria-pressed', String(opts[b.dataset.k] === b.dataset.v)));
  document.documentElement.dataset.theme = opts.theme;
}

document.querySelector('.ct-bar').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  opts[b.dataset.k] = b.dataset.v;
  const q = new URLSearchParams(opts);
  history.replaceState(null, '', `?${q}`);
  syncBar();
  cards.forEach((c) => c.restyle());
});
syncBar();

/* ---------- scenes ---------- */

function lights(scene) {
  const hemi = new HemisphereLight(0xffffff, 0xd9d2c3, 2.2);
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 5, 6);
  scene.add(hemi, sun);
  return () => {
    // Today: the landing's lights. Deeper: weaker fill, stronger key from the
    // front left, so the sides fall into the darker toon steps
    const deep = opts.light === 'deeper';
    hemi.intensity = deep ? 1.1 : 2.2;
    hemi.groundColor.set(deep ? 0xa89e8c : 0xd9d2c3);
    sun.intensity = deep ? 3.2 : 2.2;
    sun.position.set(...(deep ? [-4, -3, 7] : [3, 5, 6]));
  };
}

const shadowGeo = new CircleGeometry(0.42, 24);
const shadowMat = new MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.14, depthWrite: false });

// Car on a group in the landing's frame: roof toward +z (the camera), front +x
function carOnFloor(model) {
  const g = new Group();
  const roll = new Group();
  const m = model.clone(true);
  m.rotation.x = Math.PI / 2;
  roll.add(m);
  const shadow = new Mesh(shadowGeo, shadowMat);
  shadow.scale.set(1.25, 0.8, 1);
  shadow.position.z = -0.25;
  g.add(shadow, roll);
  return { g, roll };
}

// World units per pixel at the floor (z = 0) for a camera and pane height
function unitsPerPx(camera, h) {
  const d = camera.position.length();
  return (2 * d * Math.tan((camera.fov * Math.PI) / 360)) / h;
}

async function makeCard(opt, list) {
  const el = document.createElement('section');
  el.className = 'ct-card';
  el.innerHTML = `<header><h2>${opt.name}</h2><p>${opt.note}</p><p class="ct-weight">Weight for the site: ${opt.weight}</p></header>
    <div class="ct-panes"><canvas></canvas>
      <span class="ct-label" style="--i: 0">Landing, real size</span>
      <span class="ct-label" style="--i: 1">Parked in a section (S3 idea)</span>
      <span class="ct-label" style="--i: 2">Close-up</span></div>`;
  list.append(el);
  const canvas = el.querySelector('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setScissorTest(true);

  const car = await opt.make();
  const sceneDrive = new Scene();
  const scenePark = new Scene();
  const sceneClose = new Scene();
  const relight = [lights(sceneDrive), lights(scenePark), lights(sceneClose)];

  // Landing: the landing's camera, the car circling a bulb
  const camDrive = new PerspectiveCamera(35, 1, 0.1, 100);
  camDrive.position.set(0, -2.4, 10);
  camDrive.lookAt(0, 0, 0);
  const drive = carOnFloor(car.model);
  const bulb = bulbModel();
  bulb.rotation.x = Math.PI / 2;
  const bulbG = new Group();
  bulbG.add(bulb);
  sceneDrive.add(drive.g, bulbG);

  // Parked and close-up: three-quarter view from the front right
  const camPark = new PerspectiveCamera(30, 1, 0.1, 100);
  camPark.position.set(3.4, -5.2, 2.5);
  camPark.lookAt(0, 0, 0.1);
  const park = carOnFloor(car.model);
  park.g.rotation.z = -0.5;
  scenePark.add(park.g);
  const camClose = camPark.clone();
  const close = carOnFloor(car.model);
  sceneClose.add(close.g);

  let W = 0;
  let H = 0;
  let stacked = false;
  const panes = [];
  const resize = () => {
    W = el.querySelector('.ct-panes').clientWidth;
    stacked = W < 640;
    const ph = PANE_H;
    H = stacked ? ph * 3 : ph;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    canvas.style.height = `${H}px`;
    el.querySelector('.ct-panes').dataset.stacked = String(stacked);
    panes.length = 0;
    for (let i = 0; i < 3; i++) {
      // three.js viewports count from the bottom
      panes.push(stacked ? { x: 0, y: H - (i + 1) * ph, w: W, h: ph } : { x: (i * W) / 3, y: 0, w: W / 3, h: ph });
    }
    const [pd, pp, pc] = panes;
    camDrive.aspect = pd.w / pd.h;
    camDrive.updateProjectionMatrix();
    camPark.aspect = pp.w / pp.h;
    camPark.updateProjectionMatrix();
    camClose.aspect = pc.w / pc.h;
    camClose.updateProjectionMatrix();
    restyle();
  };

  let ring = { x: 1, y: 1 };
  const restyle = () => {
    car.setBody(opts.colour, dark());
    relight.forEach((f) => f());
    if (!panes.length) return;
    // Real sizes in the landing pane
    const u = unitsPerPx(camDrive, panes[0].h);
    drive.g.scale.setScalar((CAR_PX[opts.size] * u) / 0.9);
    bulbG.scale.setScalar((BULB_PX * u) / 0.6);
    // Loop clear of the bulb's glow (about 70 px round it) and the pane edge
    ring = { x: (panes[0].w / 2 - CAR_PX[opts.size] / 2 - 6) * u, y: (panes[0].h / 2 - CAR_PX[opts.size] / 2 - 6) * u };
    const up = unitsPerPx(camPark, panes[1].h);
    park.g.scale.setScalar((PARK_PX * up) / 0.9);
    const closePx = Math.min(panes[2].w, panes[2].h) * 0.64;
    close.g.scale.setScalar((closePx * unitsPerPx(camClose, panes[2].h)) / 0.9);
  };

  const draw = (t) => {
    // Landing: a loop round the bulb, nose along the path, leaning out
    const a = t * 0.7;
    drive.g.position.set(Math.cos(a) * ring.x, Math.sin(a) * ring.y, 0);
    drive.g.rotation.z = a + Math.PI / 2;
    drive.roll.rotation.x = -0.08;
    bulbG.position.z = 0.05 + Math.sin(t * 2.2) * 0.04;
    // Parked: idles with a little engine shake every few seconds
    const k = (t % 3.2) / 3.2;
    park.roll.position.z = k < 0.12 ? Math.sin(k * 52) * 0.012 : 0;
    // Close-up: turntable
    close.g.rotation.z = t * 0.45;
    const scenes = [[sceneDrive, camDrive], [scenePark, camPark], [sceneClose, camClose]];
    panes.forEach((p, i) => {
      renderer.setViewport(p.x, p.y, p.w, p.h);
      renderer.setScissor(p.x, p.y, p.w, p.h);
      renderer.render(...scenes[i]);
    });
  };

  new ResizeObserver(resize).observe(el.querySelector('.ct-panes'));
  resize();
  return { draw, restyle };
}

const list = document.querySelector('.ct-list');
const cards = [];
for (const opt of OPTIONS) cards.push(await makeCard(opt, list));
document.documentElement.dataset.ready = 'true';

const loop = (now) => {
  const t = now / 1000;
  cards.forEach((c) => c.draw(t));
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// Colour swatches show their colour
document.querySelectorAll('.ct-bar [data-k="colour"]').forEach((b) => b.style.setProperty('--sw', `#${new Color(b.dataset.c).getHexString()}`));
