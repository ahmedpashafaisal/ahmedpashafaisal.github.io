// Home page mini-game in three.js: the red toy car (seen from above, slightly
// tilted) sits on the landing with a "Drive me to an idea" bubble (until the
// first catch, or until the runaway first shows itself). Click or tap
// anywhere on the page (not a link, button, game cover or picture) and the
// car drives there and parks (turning, drifting, leaving tyre marks and a
// smoke trail); on empty space, hold and move and it follows (on text a
// click drives, a drag still selects). WASD drive it the way they point; the
// arrows too on the landing, and below it once the visitor has driven.
// It catches the ideas (lightbulbs) that pop up on fixed spots around the
// name. The car drives over everything on the page, the landing included.
//
// One game layer: the canvases cover the screen from the first visit on, and
// belong to the page (they scroll with it, so the car stays put on the page
// even mid-scroll, and move back over the screen every frame). The car can go
// anywhere from the top of the page to the bottom; the screen scrolls along
// while the visitor drives it.
//
// The runaway idea: there is one round of 6 (4 or 2 when the screen is too
// short for the rest). Catch them in any order; the
// last one left will not be caught. When the car comes close it opens its
// eyes and hops away (a little closer each visit, never close enough) while
// the car reacts ("What the…!", "Hold still!", "Seriously?!"). After 3
// dodges, once the chase stops, or when the visitor leaves the landing, it
// hops off down the page to the Featured heading ("Hey! Come back!"). A
// visitor who leaves before it is picked sees a random bulb wake up and go.
// From then on it is the guide: one bulb for the whole page, near the
// visitor, one hop ahead. It waits on spots in page order (the landing's,
// beside the headings, in the building sites, beside the footer line). The
// car (if it moved lately) or else the mouse pointer coming close sends it
// on ahead ("Not again!", "Wait up!"): always down the page (a guide never
// leads back), to the first spot below the screen, so it is gone from view;
// with nothing below (the end of the page) it hops off the side of the
// screen, away from the chaser. Stay put and it sneaks back in after BACK_MS
// ("There you are!"); go back up the page and it follows once the scroll
// rests; scroll down past it and it catches up from the top edge. Each time
// it comes back to a fresh free place on the screen (off text, links,
// pictures and cards, away from the car), from a random edge. It never goes
// back by itself.
// On the shelves it does the beats of S1 (it is the only bulb on the home
// page: shelfbulb.js and rest.js stand down, html.has-guide). In a building
// site it works: a small hop per WORK_PX of scroll, dust, now and then a line
// in its own bubble. Reach for it there: "Nope, not a game yet.", a laugh,
// and the mouse pointer sends it onto a cover on the next shelf ahead (the
// car: the next spot ahead). Point at that cover: the car shouts "Hold
// still!" and it hops one cover along, after the last game into the
// building site. Slide the shelf it stands on: once the slide stops, it hops
// to the far cover in view.
// Rest when you rest: the visitor stops (no input for REST_MS) and the
// runaway sneaks up on the parked car (or the pointer), closer than a chase
// ever gets it; reaching for it sets it off only at the last moment ("So
// close!").
//
// Physics runs in canvas pixels (simple car: engine along the heading,
// sideways grip so it drifts in fast turns; it can only turn while moving, so
// it never spins on the spot); three.js only draws it. Tyre marks, smoke and
// pickup rings are drawn on a flat 2D canvas under the car.
// Touch works the same: tap, or tap and drag.
// Reduced motion: slower car, no shake, squash, marks or particles.
import {
  BackSide, BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DataTexture, DirectionalLight, Group, HemisphereLight, MathUtils, Mesh, MeshBasicMaterial, MeshToonMaterial, NearestFilter, PerspectiveCamera, Plane, Raycaster, RedFormat, Scene, SphereGeometry, TorusGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { readStats } from './achievements.js';
import { burst } from './burst.js';
import { sendShock } from './dotgrid.js';
import { juicy, reducedMotion } from './motion.js';
import { REST_MS, stillFor } from './rest.js';
import { sfx } from './sound.js';

const INK = 0x1d1b18;
const LIME = 0xcaff00;
const SURFACE = 0xfffdf8;
const INK_SOFT = 0x5c5750;
const RED = 0xe8473c; // the car's body
const GLASS = 0x2b333d;
const TYRE = 0x2a2723;

/* ---------- tuning (pixels, seconds) ---------- */
const MAX_SPEED = 900;
const TURN = 9; // rad/s: how fast the car turns to face where it rolls
const GRIP = 4; // sideways slip decay: lower = more drift
const ROLL = 2.2; // rolling friction: speed decay per second (a throw rolls about speed / 2.2 px)
const FOLLOW = 3.2; // driving: speed toward the cursor per px of distance (slows on arrival)
const FOLLOW_GRIP = 6; // driving: how fast the engine reaches that speed
const KEY_GAS = 0.7; // keys: top speed, share of MAX_SPEED
// Keys: the way each one points on screen (WASD by position, so ZQSD on AZERTY)
const KEY_DIRS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
const TURN_SLOW = 0.12; // share of TURN kept when nearly still: no spinning on the spot
const SHARP = 0.7; // rad off the pointer: slow down so the turn stays tight
const STOP_R = 0.75; // car lengths: cursor this close = parked (no steering, no gas)
const BUBBLE_REST_MS = 1200; // car still this long: "Drive me to an idea" comes back
const WALL_PAD = 10; // px round the landing's text and buttons: bulbs keep off it
const BOUNCE = 0.45;
const SOFT_HIT = 260; // px/s into the edge: slower slides along it, faster bounces off (with the thump)
const BRAKE = 1800; // px/s²: braking it plans for before the edge
const CORNER_V = 240; // px/s it may still have when it reaches the edge
const GOAL_GAP = 12; // px: a spot next to the edge parks this far off it
const HIT_STOP_MS = 55;
const SHAKE_MS = 200;
const WAVE = 6;
const PICK_R = 46; // generous pickup radius
const MAGNET_R = 110; // ideas drift toward a car this close
const EDGE = 16; // play area inset from the canvas edges
const BOTTOM = 84; // keep clear of the bottom corner buttons
const DODGE_LINES = ['What the…!', 'Hold still!', 'Seriously?!']; // the car, at dodge 1, 2, 3
const CHASE_LINES = ['Not again!', 'Wait up!', 'Hey! Come back!']; // the car, as the guide hops on ahead
const CAM_LO = 0.3; // driving: the screen scrolls to keep the car
const CAM_HI = 0.68; // ...between these shares of its height
const STOP_GAP = 70; // px from a heading's text to the guide waiting beside it
const CHASER_MS = 5000; // the guide runs from the car if it moved this recently, else from the mouse pointer
const POINTER_R = 90; // ...hopping on when the moving pointer comes this close
const SETTLE_MS = 400; // the visitor scrolled away from it: it hops back in once the scroll rests this long
const BACK_MS = 6000; // dodged off the screen and the visitor stays put: it sneaks back in after this long
const RAYS_UP = 52; // px from the bulb's middle to the tip of its rays
const PEEK = 24; // px from the screen's side edge to the middle of a bulb peeking in
// The guide on the shelves (the beats of S1). Placeholder words: Ahmed rewrites
const WORK_PX = 120; // page scroll per working hop in a building site
const WORK_MS = 380;
const WORK_KEYS = [[0, 0, 1, 1], [0.42, 16, 0.92, 1.1], [0.72, 0, 1.16, 0.84], [1, 0, 1, 1]]; // share of the hop, lift px, width, height
const WORK_LINE = 6; // working hops per line, the first on the 3rd hop
const WORK_LINES = ['Almost done.', "Don't look yet!", 'Five more minutes.', 'It worked yesterday.', 'Nearly there.'];
const LAUGH_MS = 900; // reached for in its building site: "Nope, not a game yet." and a laugh, then it hops
const SAY_MS = 1600; // the bulb's own line stays up this long
const SLIDE_START = 40; // px a shelf slides under it before it hops ahead...
const SLIDE_SETTLE_MS = 160; // ...once the slide has stopped this long
const FEET = 34; // px from the bulb's middle to its feet (it squashes from there)
const SITE_SIZE = 0.7; // phones: its size in a building site (the picture is small there)
const HEADLIGHT = 'rgba(236, 255, 190, 0.2)'; // dark mode: light on the ground, at the headlights
const HEADLIGHT_LEN = 2.2; // ...reaching this many car lengths ahead
const DODGE_R = 150; // runaway hops away when the car is this close (first visit)
const DODGE_STEP = 12; // ...and lets it this much closer each later visit
const DODGE_MIN_R = 95; // never closer than this (catching needs PICK_R + a bit)
const DODGE_MS = 600; // shortest time between two dodges: no jitter
const DODGES = 3; // dodges before it hops off for good
const IDLE_ESCAPE_MS = 8000; // chase stopped this long after a dodge: it leaves
const HOP_MS = 420; // one dodge hop
const SHOUT_MS = 1800; // "Hey! Come back!" stays up this long
const CREEP_GAP = 110; // resting: the runaway sneaks up to this far from the parked car...
const CREEP_STEP = 30; // ...in hops this long...
const CREEP_MS = 800; // ...this far apart
const NEAR_R = 85; // crept up: hops off only when the moving car comes this close
const MARK_LIFE = 1.6; // s, tyre marks fade out
const SMOKE_LIFE = 0.7; // s

/* ---------- materials and parts ---------- */

export const gradientMap = (() => {
  const tex = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();
const outlineMat = new MeshBasicMaterial({ color: INK, side: BackSide });
const mats = new Map();
export const toon = (color) => {
  if (!mats.has(color)) mats.set(color, new MeshToonMaterial({ color, gradientMap }));
  return mats.get(color);
};
export function part(geo, color, { pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], line = 1.07 } = {}) {
  const g = new Group();
  const outline = new Mesh(geo, outlineMat);
  outline.scale.setScalar(line);
  g.add(outline, new Mesh(geo, toon(color)));
  g.position.set(...pos);
  g.scale.set(...scale);
  g.rotation.set(...rot);
  return g;
}
const group = (...children) => {
  const g = new Group();
  g.add(...children);
  return g;
};

// Toy car (step S2, "A" in red): 0.9 long along +x (front), roof along +y.
// Rounded red body, dark glass, red roof; cream twin stripes on the bonnet,
// roof and boot (what the camera sees from above); chunky tyres with cream
// hubs, grey bumpers, lime headlights, red tail lights. Red in both themes.
const flat = (geo, color, pos, rot = [0, 0, 0]) => {
  const m = new Mesh(geo, toon(color));
  m.position.set(...pos);
  m.rotation.set(...rot);
  return m;
};
export function carModel() {
  const rounded = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
  const stripes = (len, x, y) => [-1, 1].map((s) => flat(new BoxGeometry(len, 0.012, 0.06), SURFACE, [x, y, s * 0.065]));
  const wheel = (x, z) => [
    part(new CylinderGeometry(0.14, 0.14, 0.12, 24), TYRE, { pos: [x, -0.17, z], rot: [Math.PI / 2, 0, 0], line: 1.06 }),
    flat(new CylinderGeometry(0.07, 0.07, 0.125, 16), SURFACE, [x, -0.17, z], [Math.PI / 2, 0, 0]),
  ];
  const bumper = (x) => part(rounded(0.07, 0.08, 0.5, 0.03), 0x8a847a, { pos: [x, -0.13, 0], line: 1.06 });
  return group(
    part(rounded(0.92, 0.24, 0.52, 0.09), RED, { pos: [0, -0.05, 0], line: 1.06 }),
    part(rounded(0.5, 0.2, 0.44, 0.08), GLASS, { pos: [-0.06, 0.15, 0], line: 1.06 }),
    part(rounded(0.4, 0.07, 0.42, 0.035), RED, { pos: [-0.08, 0.26, 0], line: 1.06 }),
    ...stripes(0.3, 0.3, 0.072), ...stripes(0.36, -0.08, 0.297), ...stripes(0.12, -0.39, 0.072),
    ...wheel(0.29, 0.24), ...wheel(-0.29, 0.24), ...wheel(0.29, -0.24), ...wheel(-0.29, -0.24),
    bumper(0.47), bumper(-0.47),
    ...[-1, 1].map((s) => part(new CylinderGeometry(0.05, 0.05, 0.03, 16), LIME, { pos: [0.465, -0.02, s * 0.16], rot: [0, 0, Math.PI / 2], line: 1.06 })),
    ...[-1, 1].map((s) => flat(new BoxGeometry(0.02, 0.05, 0.1), 0xff5a4e, [-0.465, -0.02, s * 0.16])),
  );
}

// Idea: a cartoon lightbulb, drawn to read as a bulb at a glance: pear-shaped
// lime glass, an ink filament loop on the front, a white shine, a threaded
// ink screw base, and five "idea" rays above. About 0.95 tall with the rays.
// Geometry is shared by every bulb, so new waves allocate nothing new
const glowMat = new MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.2, depthWrite: false });
const inkFlat = new MeshBasicMaterial({ color: INK });
const shineMat = new MeshBasicMaterial({ color: 0xffffff });
// Rays follow the theme like the car body: ink in light mode, cream in dark mode
const rayMat = new MeshBasicMaterial({ color: INK });
const BULB = {
  glow: new SphereGeometry(0.46, 20, 12),
  glass: new SphereGeometry(0.27, 28, 16),
  neck: new CylinderGeometry(0.19, 0.12, 0.17, 24),
  band: new CylinderGeometry(0.125, 0.125, 0.055, 20),
  tip: new ConeGeometry(0.07, 0.07, 16),
  loop: new TorusGeometry(0.075, 0.02, 8, 20, Math.PI),
  stem: new BoxGeometry(0.035, 0.13, 0.035),
  shine: new SphereGeometry(0.055, 12, 8),
  ray: new BoxGeometry(0.045, 0.12, 0.045),
  eye: new SphereGeometry(1, 12, 8),
};
// Runaway's eyes: two ink dots either side of the filament, on the glass
// front (same spots as the SVG twin, js/bulb.js). Returned so draw() can
// blink and wink them by squashing their height.
function addEyes(g) {
  const eyes = [-1, 1].map((sx) => {
    const m = new Mesh(BULB.eye, inkFlat);
    m.position.set(sx * 0.16, 0.15, 0.235);
    m.scale.set(0.03, 0.042, 0.012);
    return m;
  });
  g.add(...eyes);
  return eyes;
}
export function bulbModel() {
  const glow = new Mesh(BULB.glow, glowMat);
  glow.position.y = 0.1;
  // Filament: an arch with two legs, just in front of the glass
  const loop = new Mesh(BULB.loop, inkFlat);
  loop.position.set(0, 0.13, 0.27);
  const legs = [-1, 1].map((sx) => {
    const m = new Mesh(BULB.stem, inkFlat);
    m.position.set(sx * 0.075, 0.07, 0.26);
    return m;
  });
  const shine = new Mesh(BULB.shine, shineMat);
  shine.scale.set(1, 1.5, 0.4);
  shine.position.set(-0.12, 0.22, 0.22);
  shine.rotation.z = 0.5;
  // Rays: five short dashes fanned over the top
  const rays = [-60, -30, 0, 30, 60].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const r = new Mesh(BULB.ray, rayMat);
    r.position.set(Math.sin(a) * 0.43, 0.12 + Math.cos(a) * 0.43, 0);
    r.rotation.z = -a;
    return r;
  });
  const g = group(
    glow,
    part(BULB.glass, LIME, { pos: [0, 0.12, 0], scale: [1, 1.05, 1] }),
    part(BULB.neck, LIME, { pos: [0, -0.1, 0], line: 1.04 }),
    part(BULB.band, INK_SOFT, { pos: [0, -0.21, 0], line: 1.08 }),
    part(BULB.band, INK_SOFT, { pos: [0, -0.265, 0], line: 1.08 }),
    part(BULB.band, INK_SOFT, { pos: [0, -0.32, 0], line: 1.08 }),
    part(BULB.tip, INK, { pos: [0, -0.37, 0], rot: [Math.PI, 0, 0], line: 1 }),
    loop,
    ...legs,
    shine,
    ...rays,
  );
  g.userData.rays = rays; // the guide's laugh flicks them
  return g;
}

const elasticOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
const angleTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/* ---------- scene ---------- */

export function initHero(canvas, { onCollect, onWave } = {}) {
  const html = document.documentElement;
  const host = canvas.parentElement; // the landing
  // The game layer: over the page, under the corner buttons, clicks pass
  // through. Its canvases are moved into it (below), out of the landing.
  const layer = document.createElement('div');
  layer.className = 'game-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  const foot = document.querySelector('.site-foot');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  // Slight tilt so the car shows its sides: top-down, not flat
  camera.position.set(0, -2.4, 10);
  camera.lookAt(0, 0, 0);
  const camBase = camera.position.clone();
  scene.add(new HemisphereLight(0xffffff, 0xd9d2c3, 2.2));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 5, 6);
  scene.add(sun);

  // Car: carG (position, heading, squash) > rollG (body roll/pitch) > model
  const carG = new Group();
  const rollG = new Group();
  const model = carModel();
  model.rotation.x = Math.PI / 2; // roof faces the camera
  rollG.add(model);
  const shadow = new Mesh(new CircleGeometry(0.42, 24), new MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.14, depthWrite: false }));
  shadow.scale.set(1.25, 0.8, 1);
  shadow.position.z = -0.25;
  carG.add(shadow, rollG);
  scene.add(carG);

  // Flat 2D layer under the 3D canvas: tyre marks, smoke, pickup rings.
  // Same pixel space as the physics, so nothing needs projecting.
  const fxCanvas = document.createElement('canvas');
  fxCanvas.className = 'hero-fx';
  fxCanvas.setAttribute('aria-hidden', 'true');
  layer.append(fxCanvas, canvas);
  const fx = fxCanvas.getContext('2d');
  const marks = [[], []]; // per rear wheel: {x, y, t, a, gap}
  const puffs = []; // {x, y, vx, vy, t, life, r}
  const rings = []; // {x, y, t, life, r, rays}
  let ink = '#1d1b18';
  let paper = '#fffdf8';
  const readColours = () => {
    const cs = getComputedStyle(document.documentElement);
    ink = cs.getPropertyValue('--ink').trim() || ink;
    paper = cs.getPropertyValue('--surface').trim() || paper;
  };

  /* pixel <-> world */
  const ray = new Raycaster();
  const ndc = new Vector2();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const tmp = new Vector3();
  let W = 1;
  let H = 1;
  function toWorld(x, y, out) {
    ndc.set((x / W) * 2 - 1, -((y / H) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    ray.ray.intersectPlane(plane, out);
    return out;
  }
  let unit = 0.01; // world units per pixel near the centre
  let carLen = 72; // px

  /* state */
  const car = { x: 0, y: 0, vx: 0, vy: 0, h: -Math.PI / 2, squash: 0, squashV: 0, roll: 0, pop: 0, popV: 0, popTarget: 0, restAt: 0, movedAt: -1e9, braking: false };
  // Pointer target: on = button or finger held (target follows it);
  // go = drive to the target until the car parks there (also after release)
  const grab = { x: 0, y: 0, on: false, id: -1, go: false, goUntil: 0, auto: false };
  let walls = []; // the landing's text and buttons, {l, t, r, b} in canvas px: bulbs keep off them
  let homeWalls = []; // the same at rest (scrolled to the top, no parallax): where bulbs go
  let area = { l: 0, t: 0, r: 1, b: 1 }; // where the car can go: the whole page
  let land = { l: 0, t: 0, r: 1, b: 1 }; // the landing's play area: where its bulbs go
  let hostR = host.getBoundingClientRect(); // the landing on the screen
  let ideas = [];
  let waveBusy = false;
  let chain = 0;
  let chainAt = 0;
  let frozenUntil = 0;
  let shakeStart = -1e9;
  let lastBump = 0;
  let shakeAmp = 0.06;
  let entered = false;
  let bubble = null; // over the car: "Drive me to an idea", or the "Hey! Come back!" shout
  let runaway = null; // the bulb that will not be caught (an entry of ideas)
  let firstRound = false; // the round with a runaway in it
  let runawayDone = false; // left the landing (the guide now): later rounds are normal
  let shoutUntil = 0;
  let howTo = true; // "Drive me to an idea" until the first catch or the runaway's first move
  let caught = 0;
  // The layer sits off px down the page (the scroll, or less at the very
  // bottom); canvas px = screen px give or take that difference
  let off = 0;
  let camAt = 0; // the screen last scrolled along with the car
  let dark = false;
  let played = false; // the visitor has driven the car: a skimmer gets no chase
  const visits = Math.max(1, readStats().visits || 1);
  const dodgeR = Math.max(DODGE_MIN_R, DODGE_R - (visits - 1) * DODGE_STEP);
  const carR = () => carLen * 0.42;
  const pageH = () => (foot ? foot.getBoundingClientRect().bottom + scrollY : html.scrollHeight);

  // Back over the screen: the layer moves down the page with the scroll (never
  // past the page's end, so it never makes the page longer) and everything on
  // it moves up by as much, so it all keeps its place on the page
  function place() {
    const to = Math.max(0, Math.min(scrollY, pageH() - H));
    if (to === off) return;
    shiftAll(0, off - to);
    off = to;
    layer.style.transform = `translateY(${off}px)`;
  }

  function measure() {
    const cr = canvas.getBoundingClientRect();
    hostR = host.getBoundingClientRect();
    const rel = (el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - cr.left - WALL_PAD, t: r.top - cr.top - WALL_PAD, r: r.right - cr.left + WALL_PAD, b: r.bottom - cr.top + WALL_PAD };
    };
    // Where a wall sits at rest: minus its parallax shift (CSS translate,
    // js/scroll.js) and, for the fixed corner buttons, minus the scroll
    const home = (el, w) => {
      const fixed = getComputedStyle(el).position === 'fixed';
      const [tx = 0, ty = 0] = (getComputedStyle(el).translate || '').split(' ').map((v) => parseFloat(v) || 0);
      const dx = fixed ? 0 : tx;
      const dy = fixed ? window.scrollY : ty; // a fixed button sits scrollY lower against the scrolled landing
      return { l: w.l - dx, t: w.t - dy, r: w.r - dx, b: w.b - dy };
    };
    const els = [
      ...host.querySelectorAll('.entrance__name, .entrance__line, .entrance__btn'),
      // Corner buttons, where they sit over the landing at rest
      ...[...document.querySelectorAll('.sound-toggle, .mail-btn, .theme-toggle, .site-pill')].filter((el) => !el.closest('.hud')),
    ];
    walls = els.map(rel);
    homeWalls = els.map((el, i) => home(el, walls[i]));
    const roadW = document.querySelector('.scrollcar') ? 40 : 0;
    // The car: from the top of the page to the bottom. Its bulbs: the landing.
    // Both clear of the bottom corner buttons.
    const top = hostR.top - cr.top;
    area = { l: EDGE, t: top + EDGE, r: W - EDGE - roadW, b: pageH() - scrollY - cr.top - BOTTOM };
    land = { l: EDGE, t: top + EDGE, r: W - EDGE - roadW, b: hostR.bottom - cr.top - BOTTOM };
  }

  function layout() {
    const wasW = W;
    // As tall as the screen (a phone's address bar showing or hiding resizes it)
    layer.style.height = `${innerHeight}px`;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fxCanvas.width = Math.round(W * dpr);
    fxCanvas.height = Math.round(H * dpr);
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const a = toWorld(W / 2 - 50, H / 2, new Vector3());
    const b = toWorld(W / 2 + 50, H / 2, new Vector3());
    unit = a.distanceTo(b) / 100;
    carLen = W < 600 ? 58 : 76;
    place();
    measure();
    if (!entered) {
      car.x = W * 0.5;
      car.y = land.b - 40;
    }
    // Window got wider or narrower: the name re-flowed, so bulbs move to the
    // spots of the new layout, top to bottom. A height-only change (a phone's
    // address bar hiding while scrolling) keeps them where they are. No bulb is
    // ever dropped: with fewer spots than bulbs, the rest stay put inside the
    // landing. A hopping bulb finishes its hop first; the guide keeps its spot.
    if (ideas.length && Math.abs(W - wasW) > 1) {
      const list = spots().sort((p, q) => p[1] - q[1]);
      const live = ideas.filter((it) => !it.gone && !it.hop && !it.guide).sort((p, q) => p.hy - q.hy);
      live.forEach((it, k) => {
        const sp = list[k];
        if (sp) [it.hx, it.hy, it.mirror] = sp;
        else {
          it.hx = MathUtils.clamp(it.hx, land.l + 40, land.r - 40);
          it.hy = MathUtils.clamp(it.hy, land.t + 40, land.b - 40);
        }
        it.x = it.hx;
        it.y = it.hy;
        it.vx = it.vy = 0;
      });
    }
    // and the car stays on the page
    car.x = MathUtils.clamp(car.x, area.l + carR(), area.r - carR());
    car.y = MathUtils.clamp(car.y, area.t + carR(), area.b - carR());
  }

  /* ideas */
  // A free spot for a bulb: on the landing, off its text and buttons
  const free = (x, y, gap, ws = walls) =>
    x > land.l + gap && x < land.r - gap && y > land.t + gap && y < land.b - gap &&
    ws.every((w) => x < w.l - gap || x > w.r + gap || y < w.t - gap || y > w.b + gap);

  // Ideas sit on fixed spots around the name, in 3 mirrored pairs, so every
  // wave looks the same and balanced: above the name, beside it, below the
  // button. Spots that do not fit (the sides on a phone) fall back to
  // spots further up or down. Pairs pop in top to bottom; both bulbs of a
  // pair bob and sway in step (sway mirrored).
  // Spots come from the walls at rest, so a scrolled or shifted landing (a
  // phone's address bar resizing it mid-scroll) gives the same spots
  function spots() {
    const [n, , btn] = homeWalls;
    if (!n) return [];
    const mid = W / 2;
    const half = (n.r - n.l) / 2;
    const below = (btn || n).b;
    const cands = [
      [half * 0.56, n.t - 55], // above
      [half + 60, (n.t + n.b) / 2], // beside
      [half * 0.56, below + 60], // below the button
      [half * 0.76, n.t - 150], // phone fallbacks
      [half * 0.76, below + 150],
      [half * 0.3, below + 230],
    ];
    const out = [];
    for (const [dx, y] of cands) {
      if (out.length === WAVE) break;
      if (free(mid - dx, y, 30, homeWalls) && free(mid + dx, y, 30, homeWalls)) out.push([mid - dx, y, 1], [mid + dx, y, -1]);
    }
    return out;
  }
  function spawnWave() {
    ideas.forEach((it) => scene.remove(it.g));
    ideas = [];
    const now = performance.now();
    const list = spots().sort((a, b) => a[1] - b[1]);
    list.forEach(([x, y, mirror], k) => {
      const i = k >> 1; // pair index
      const g = bulbModel();
      scene.add(g);
      const waiting = Math.hypot(x - car.x, y - car.y) < PICK_R + carLen * 0.2 + 20;
      ideas.push({ g, x, y, hx: x, hy: y, vx: 0, vy: 0, pop: 0, popV: 0, delay: now + i * 140, phase: i * 0.9, mirror, gone: false, waiting });
    });
    // First round: no bulb is picked yet; the last one left becomes the
    // runaway. Short screens fit fewer (4 or 2): the joke works the same.
    runaway = null;
    firstRound = !runawayDone && ideas.length >= 2;
    waveBusy = false;
  }

  // The runaway looks like any other bulb until its first dodge
  function makeRunaway(it) {
    if (runaway && runaway !== it && !runaway.gone) return;
    runaway = it;
    Object.assign(it, { waiting: false, eyes: null, wokeAt: 0, blinkAt: 0, winkUntil: 0, hop: null, nextDodge: 0, dodges: 0, lastDodge: 0, guide: false, spot: null, inAt: 0, flees: 0, why: '', side: 1, leftAt: 0, backAt: 0, rail: null, work: null, works: 0, line: '', laugh: 0, reach: null, drawY: 0, size: 1 });
  }
  // ...when its eyes pop open (draw() springs them in)
  function openEyes(it, now) {
    howTo = false; // the joke has started: no "Drive me to an idea" after this
    if (it.eyes) return;
    it.eyes = addEyes(it.g);
    it.wokeAt = now;
    it.blinkAt = now + 2600;
  }

  // On the landing, before it leaves: it hops to the free spot farthest from
  // the car, a short arc away. Only while the car moves (a parked car never
  // sets it off). Cornered (no hop gains real distance, e.g. on a small phone
  // landing): it leaves instead.
  function dodge(it, now, d) {
    const best = farSpot(it, car.x, car.y, (x, y) => free(x, y, 40));
    if (!best || best[2] < d + 30) {
      escape(now);
      return;
    }
    openEyes(it, now);
    hopTo(it, null, best[0], best[1], now, HOP_MS, 46);
    it.nextDodge = now + DODGE_MS;
    it.lastDodge = now;
    // A near miss after resting is not one of the 3 dodges before it leaves
    if (it.crept) {
      it.crept = false;
      shout('So close!', now);
    } else {
      it.dodges += 1;
      shout(DODGE_LINES[Math.min(it.dodges, DODGE_LINES.length) - 1], now);
    }
    sfx.thump();
  }

  // The point a short hop from the bulb that is farthest from (cx, cy), among
  // those ok(x, y) allows: [x, y, distance], or null
  function farSpot(it, cx, cy, ok) {
    let best = null;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = it.x + Math.cos(a) * 170;
      const y = it.y + Math.sin(a) * 170 * 0.7;
      if (!ok(x, y)) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (!best || d > best[2]) best = [x, y, d];
    }
    return best;
  }

  // One hop, onto a spot (followed as the page moves under it) or a free
  // point (spot null)
  function hopTo(it, spot, x, y, now, ms, lift) {
    it.hop = { x0: it.x, y0: it.y, x1: x, y1: y, t0: now, ms, lift };
    Object.assign(it, { spot, hx: x, hy: y, vx: 0, vy: 0, winkUntil: now + 700, inAt: now, work: null });
    // On a sliding shelf (a cover or its building site): where the slide
    // stood when it arrived
    const row = spot?.el?.closest('.shelf--rail .shelf__row');
    it.rail = row ? { row, x0: row.scrollLeft } : null;
    wake();
  }
  const farHop = (dy) => MathUtils.clamp(500 + Math.abs(dy) * 0.45, 700, 1400);

  // Rest when you rest: the visitor has stopped, so the runaway sneaks up on
  // the car (on the screen) or else the mouse pointer, in small hops, and
  // stops just short (CREEP_GAP). On the landing it keeps off the text.
  function creep(it, now) {
    if (stillFor() < REST_MS || Math.hypot(car.vx, car.vy) > 5) return;
    const t = restTarget();
    if (!t) return;
    it.calmAt = now; // no idle escape while the visitor rests
    const d = Math.hypot(t[0] - it.x, t[1] - it.y);
    if (d <= CREEP_GAP + 4 || now < (it.nextCreep || 0)) return;
    // Straight at it, or at an angle while that still gets it closer;
    // boxed in: it waits where it is
    const step = Math.min(CREEP_STEP, d - CREEP_GAP);
    const a0 = Math.atan2(t[1] - it.y, t[0] - it.x);
    let x = 0;
    let y = 0;
    const ok = [0, 0.6, -0.6, 1.1, -1.1].some((da) => {
      x = it.x + Math.cos(a0 + da) * step;
      y = it.y + Math.sin(a0 + da) * step;
      return (y < land.b + 20 ? free(x, y, 30) : onScreen(x, y)) && Math.hypot(t[0] - x, t[1] - y) < d - 4;
    });
    if (!ok) return;
    openEyes(it, now);
    hopTo(it, null, x, y, now, 320, 14);
    it.why = 'creep';
    it.crept = true;
    it.nextCreep = now + CREEP_MS;
  }
  const restTarget = () => {
    if (carOnScreen()) return [car.x, car.y];
    if (!pointer.t) return null;
    const p = local(pointer.cx, pointer.cy);
    return onScreen(...p) ? p : null;
  };
  // Out of sight below: under the bottom button bar (over the game layer)
  // or past the screen's bottom edge
  let hud = null;
  const hidden = (y) => {
    hud ||= document.querySelector('.hud');
    const t = hud ? Math.min(hud.getBoundingClientRect().top, innerHeight) : innerHeight;
    return y - RAYS_UP > t - canvas.getBoundingClientRect().top;
  };
  // Inside the screen, clear of the edges and the bottom corner buttons
  const onScreen = (x, y) => x > area.l + 40 && x < area.r - 40 && y > 60 && y < Math.min(H - BOTTOM, area.b);

  // The car (the visitor) talks back: one line in its bubble for SHOUT_MS
  function shout(text, now) {
    if (!bubble) return;
    bubble.firstChild.textContent = text;
    bubble.classList.add('is-on');
    shoutUntil = now + SHOUT_MS;
  }

  // Done dodging, chase stopped, cornered, or the visitor left the landing:
  // it hops off down the page to the first spot below the landing (the
  // Featured heading) and the car shouts after it. From then on it is the
  // guide.
  function escape(now) {
    const it = runaway;
    if (!it || it.guide) return;
    runawayDone = true;
    it.guide = true;
    openEyes(it, now);
    shout('Hey! Come back!', now);
    const next = guideSpots(it).find((s) => s.spot.el);
    if (next) hopTo(it, next.spot, next.x, next.y, now, farHop(next.y - it.y), 150);
    it.why = 'escape';
    it.nextDodge = now + DODGE_MS * 2;
    sfx.thump();
  }

  /* the guide: one bulb for the whole home page, near the visitor, one hop ahead */

  // Where it waits, in page order: the landing's spots, beside (or above)
  // each heading, in each building site in view, beside the footer line
  const HEADS = '#featured-title, .banner__title, #games-title, .shelf__name, .site-foot__note';
  const range = document.createRange();
  // What a bulb keeps off in a part of the page: its text, links, buttons
  // and pictures (any size), and its cards and covers (a box with a
  // background, a border or a shadow, not the part's own backdrop), as
  // canvas-px boxes
  const BUSY = 'a, button, input, textarea, select, img, picture, video, svg, iframe, [role="button"]';
  function busyIn(scope, cr) {
    const out = [];
    const sr = scope.getBoundingClientRect();
    const add = (r) => r.width && r.height && out.push({ l: r.left - cr.left, t: r.top - cr.top, r: r.right - cr.left, b: r.bottom - cr.top });
    const texts = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let n = texts.nextNode(); n; n = texts.nextNode()) {
      if (!n.textContent.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) add(r);
    }
    for (const el of scope.querySelectorAll('*:not(svg *)')) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      if (el.matches(BUSY)) add(r);
      else if (r.width * r.height < sr.width * sr.height * 0.6) {
        const cs = getComputedStyle(el);
        if (!/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none') add(r);
      }
    }
    return out;
  }
  // The bulb's box (rays to feet) at x, y clear of every busy box
  const boxFree = (x, y, rects, pad = 8) => rects.every((r) => x + 34 + pad < r.l || x - 34 - pad > r.r || y + FEET + pad < r.t || y - RAYS_UP - pad > r.b);
  // Beside a text (dx further on), or above it, in canvas px
  function textSpot(el, cr, side, dx = 0) {
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    if (!r.width) return null;
    if (side === 'above') return [Math.min(r.left + r.width / 2 + 40, cr.right - 60) - cr.left, r.top - 46 - cr.top];
    return [r.right + STOP_GAP + dx - cr.left, r.top + r.height / 2 - cr.top];
  }
  // A heading's spot, off everything near it: beside it (a little further
  // on when something is in the way), else above it; or null
  function headSpot(el, cr, rects) {
    for (const dx of [0, 40, 80, 120]) {
      const p = textSpot(el, cr, 'beside', dx);
      if (!p || p[0] + 40 > area.r) break;
      if (boxFree(p[0], p[1], rects)) return { el, side: 'beside', dx, x: p[0], y: p[1] };
    }
    const p = textSpot(el, cr, 'above');
    return p && boxFree(p[0], p[1], rects) ? { el, side: 'above', dx: 0, x: p[0], y: p[1] } : null;
  }
  // Standing in a building site's picture (S1: its feet 60% down), while its
  // shelf shows it (a sliding shelf can move it out of view)
  function slotSpot(el, cr) {
    const r = (el.querySelector('.shelf__cover') || el).getBoundingClientRect();
    const row = (el.closest('.shelf__row') || el.parentElement).getBoundingClientRect();
    const x = r.left + r.width / 2;
    if (!r.width || x < row.left + 30 || x > row.right - 30) return null;
    return [x - cr.left, r.top + r.height * 0.6 - 26 - cr.top];
  }
  // Perched on a game's cover (S1): standing on its top edge near the right
  // corner, while its shelf shows it. Never one of the spots it hops between:
  // only the shelf beats send it here.
  function perchSpot(el, cr) {
    const r = (el.querySelector('.shelf__cover') || el).getBoundingClientRect();
    const row = el.parentElement.getBoundingClientRect();
    const x = r.right - 42;
    if (!r.width || x < row.left + 20 || x > row.right - 20) return null;
    return [x - cr.left, r.top + 6 - FEET - cr.top];
  }
  // Every spot now, as {spot, x, y} in canvas px, top of the page first
  // (landing spots taken by a bulb of the round are left out)
  function guideSpots(it) {
    const cr = canvas.getBoundingClientRect();
    const out = [];
    const live = ideas.filter((o) => !o.gone && o !== it);
    spots()
      .sort((p, q) => p[1] - q[1])
      .forEach(([x, y], k) => live.every((o) => Math.hypot(o.hx - x, o.hy - y) > 70) && out.push({ spot: { k }, x, y }));
    const busy = new Map(); // per part of the page, measured once per call
    for (const el of document.querySelectorAll(HEADS)) {
      const scope = el.closest('.banner, .shelf, section, footer') || document.body;
      if (!busy.has(scope)) busy.set(scope, busyIn(scope, cr));
      const h = headSpot(el, cr, busy.get(scope));
      if (h) out.push({ spot: { el, side: h.side, dx: h.dx }, x: h.x, y: h.y });
    }
    for (const el of document.querySelectorAll('.shelf__slot')) {
      const p = slotSpot(el, cr);
      if (p) out.push({ spot: { el, slot: true }, x: p[0], y: p[1] });
    }
    return out.sort((p, q) => p.y - q.y);
  }
  // Where a spot is now (the page moves under it), or null when it is gone
  function spotPos(s) {
    if (!s.el) return spots().sort((p, q) => p[1] - q[1])[s.k] || null;
    const cr = canvas.getBoundingClientRect();
    return s.slot ? slotSpot(s.el, cr) : s.perch ? perchSpot(s.el, cr) : textSpot(s.el, cr, s.side, s.dx);
  }

  // Who it runs from: the car if it moved in the last CHASER_MS and is on the
  // screen, else the mouse pointer; nobody on touch (taps send the car)
  const pointer = { cx: 0, cy: 0, vy: 0, t: 0 };
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      const fresh = now - pointer.t < 200;
      pointer.vy = fresh ? MathUtils.lerp(pointer.vy, ((e.clientY - pointer.cy) * 1000) / Math.max(4, now - pointer.t), 0.5) : 0;
      Object.assign(pointer, { cx: e.clientX, cy: e.clientY, t: now });
      if (runaway?.guide) wake();
    },
    { passive: true },
  );
  function chaser(now) {
    if (now - car.movedAt < CHASER_MS && carOnScreen()) return { x: car.x, y: car.y, vy: car.vy, moving: Math.hypot(car.vx, car.vy) > 40, r: dodgeR, car: true };
    if (!pointer.t || now - pointer.t > CHASER_MS) return null;
    const [x, y] = local(pointer.cx, pointer.cy);
    return { x, y, vy: pointer.vy, moving: now - pointer.t < 200, r: POINTER_R, car: false };
  }

  // The visitor's way down or up the page: where their last scroll went, from
  // where it started (a small nudge at its end, e.g. the browser keeping the
  // content in place, does not count)
  let scrollDir = 1;
  let scrollAt = 0;
  let lastY = scrollY;
  let fromY = scrollY;
  let settleT = 0;
  let worked = 0; // page scrolled since the last working hop
  let backT = 0; // wakes the loop (asleep while nothing shows) for the sneak back in
  window.addEventListener(
    'scroll',
    () => {
      const now = performance.now();
      if (now - scrollAt > SETTLE_MS) fromY = lastY;
      if (Math.abs(scrollY - fromY) > 4) scrollDir = scrollY > fromY ? 1 : -1;
      worked += Math.abs(scrollY - lastY);
      lastY = scrollY;
      scrollAt = now;
      clearTimeout(settleT);
      settleT = setTimeout(wake, SETTLE_MS + 50); // the guide checks once the scroll rests
    },
    { passive: true },
  );

  // Chased: one hop on ahead, always down the page (a guide never leads
  // back), never next to the chaser: to the first spot below the screen, so
  // it is gone from view (near the end of the page: the last spot below it
  // on the screen). Nothing below (the end of the page): it hops off the side
  // of the screen, away from the chaser, at the same height.
  function ahead(it, now, c, line) {
    const list = guideSpots(it).filter((s) => s.y - it.y > 40 && Math.hypot(s.x - c.x, s.y - c.y) > c.r + 40 && Math.hypot(s.x - car.x, s.y - car.y) > dodgeR + 40);
    const next = list.find((s) => hidden(s.y)) || list.at(-1);
    if (next) {
      hopTo(it, next.spot, next.x, next.y, now, farHop(next.y - it.y), 150);
      it.why = 'ahead';
    } else {
      it.side = c.x < it.x ? 1 : -1;
      const x = it.side > 0 ? W + 70 : -70;
      hopTo(it, null, x, it.y, now, MathUtils.clamp(400 + Math.abs(x - it.x) * 0.6, 600, 1100), 60);
      it.why = 'side';
    }
    openEyes(it, now);
    it.crept = false;
    it.nextDodge = now + DODGE_MS * 2;
    if (c.car) shout(line || CHASE_LINES[it.flees++ % CHASE_LINES.length], now);
    sfx.thump();
  }

  // Where it comes back to (fresh each time, never predictable): a random
  // free place in the part of the page filling most of the screen (the
  // landing, a banner, a shelf, the footer), off everything there, on the
  // screen, away from the car (parked or not), the pointer and the other
  // ideas, and not where it came back last time. None there: anywhere free
  // on the screen. None at all (phones: no room beside the page): a spot on
  // the screen, or a peek in from a side edge at a row with the least of the
  // page under the part that shows (rest.js's phone peek), at random.
  const PARTS = '.entrance, .banner, .shelf, .site-foot';
  let lastBack = null; // page px
  let lastEdge = -1;
  const any = (list) => list[Math.floor(Math.random() * list.length)];
  function backPlace(it, now) {
    const cr = canvas.getBoundingClientRect();
    const barT = (hud ? Math.min(hud.getBoundingClientRect().top, innerHeight) : innerHeight) - cr.top;
    const parts = [...document.querySelectorAll(PARTS)]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { el, r, h: Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) };
      })
      .filter((p) => p.h > 60)
      .sort((p, q) => q.h - p.h);
    const ptr = pointer.t && now - pointer.t < CHASER_MS ? local(pointer.cx, pointer.cy) : null;
    const live = ideas.filter((o) => !o.gone && o !== it);
    const ok = (x, y) =>
      Math.hypot(x - car.x, y - car.y) > dodgeR + carR() + 30 && (!ptr || Math.hypot(x - ptr[0], y - ptr[1]) > POINTER_R + 60) &&
      live.every((o) => Math.hypot(o.hx - x, o.hy - y) > 90) && (!lastBack || Math.hypot(x - lastBack.x, y + off - lastBack.py) > 220) &&
      (y > land.b + 20 || free(x, y, 40));
    const grid = (ps, extra = []) => {
      const rects = [...ps.flatMap((p) => busyIn(p.el, cr)), ...extra];
      const top = Math.max(60 + RAYS_UP, Math.min(...ps.map((p) => p.r.top)) - cr.top + RAYS_UP);
      const bot = Math.min(barT - FEET - 10, Math.max(...ps.map((p) => p.r.bottom)) - cr.top - FEET);
      const out = [];
      for (let y = top; y <= bot; y += 40) for (let x = area.l + 40; x <= area.r - 40; x += 40) if (boxFree(x, y, rects) && ok(x, y)) out.push({ spot: null, x, y });
      return out;
    };
    let list = parts.length ? grid(parts.slice(0, 1)) : [];
    if (!list.length && parts.length) {
      // the whole screen: every part on it, and the headings between them
      const heads = [...document.querySelectorAll(HEADS)].map((el) => {
        const r = el.getBoundingClientRect();
        return { l: r.left - cr.left, t: r.top - cr.top, r: r.right - cr.left, b: r.bottom - cr.top };
      });
      list = grid(parts, heads);
    }
    if (!list.length) {
      const rects = parts.flatMap((p) => busyIn(p.el, cr));
      const peeks = [];
      for (const side of [-1, 1]) {
        const x = side < 0 ? PEEK : W - PEEK;
        const [vl, vr] = side < 0 ? [0, PEEK + 34] : [W - PEEK - 34, W]; // the part that shows
        for (let y = 60 + RAYS_UP; y <= barT - FEET - 10; y += 40) {
          if (!ok(x, y)) continue;
          const under = rects.reduce((a, r) => a + Math.max(0, Math.min(vr, r.r) - Math.max(vl, r.l)) * Math.max(0, Math.min(y + FEET, r.b) - Math.max(y - RAYS_UP, r.t)), 0);
          peeks.push({ spot: null, x, y, under });
        }
      }
      const least = Math.min(...peeks.map((q) => q.under));
      list = [...guideSpots(it).filter((q) => onScreen(q.x, q.y) && ok(q.x, q.y)), ...peeks.filter((q) => q.under <= least + 400)];
    }
    return list.length ? any(list) : null;
  }
  // Distance from point p to the segment a-b (the hop's path)
  const segDist = (px, py, [ax, ay], [bx, by]) => {
    const dx = bx - ax;
    const dy = by - ay;
    const k = MathUtils.clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(px - ax - dx * k, py - ay - dy * k);
  };

  // Back on the screen, at a fresh place (backPlace). From the top edge (the
  // visitor scrolled down past it): it catches up. Else it sneaks in, slow
  // and low, from the left, the right or the bottom edge, never the way it
  // came last time, never across the car. Nowhere to go: it tries again a
  // little later.
  function hopIn(it, now, fromTop) {
    const to = backPlace(it, now);
    if (!to) {
      it.backAt = now + 2000;
      return;
    }
    it.inAt = now;
    let from = [to.x, -60];
    if (!fromTop) {
      const edges = [[-70, to.y], [W + 70, to.y], [to.x, H + 60]]
        .map((p, k) => ({ p, k, r: Math.random() }))
        .filter((e) => e.k !== lastEdge)
        .sort((p, q) => p.r - q.r);
      const e = edges.find((q) => segDist(car.x, car.y, q.p, [to.x, to.y]) > carR() + 50) || edges[0];
      from = e.p;
      lastEdge = e.k;
    }
    [it.x, it.y] = from;
    hopTo(it, to.spot, to.x, to.y, now, fromTop ? 900 : 1300, fromTop ? 120 : 50);
    it.why = fromTop ? 'in-top' : ['in-left', 'in-right', 'in-bottom'][lastEdge];
    lastBack = { x: to.x, py: to.y + off };
    it.nextDodge = now + DODGE_MS * 2;
    if (carOnScreen()) shout('There you are!', now);
    sfx.thump();
  }

  /* the guide on the shelves (the beats of S1): it works in a building site,
     laughs when reached for there, perches on covers, rides a slide */

  // A cover or building site wholly in view on its shelf (a sliding shelf may be slid along)
  const inRow = (el) => {
    const row = el.parentElement.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return r.left >= row.left - 2 && r.right <= row.right + 2;
  };
  // The mouse pointer on the cover it perches on, or on its building site
  const pointerOn = (s) => {
    if (!s?.el || !(s.slot || s.perch)) return false;
    const r = s.el.getBoundingClientRect();
    return pointer.cx > r.left && pointer.cx < r.right && pointer.cy > r.top && pointer.cy < r.bottom;
  };

  // Reached for: the shelf beats, else one hop ahead
  function reached(it, now, c) {
    if (it.spot?.slot) return reachSite(it, now, c);
    if (it.spot?.perch && !c.car) return alongShelf(it, now, c);
    ahead(it, now, c);
  }

  // One hop onto a cover or into a building site; false when it is out of view
  function hopOnto(it, el, now) {
    const slot = el.classList.contains('shelf__slot');
    const p = (slot ? slotSpot : perchSpot)(el, canvas.getBoundingClientRect());
    if (!p) return false;
    openEyes(it, now);
    hopTo(it, slot ? { el, slot } : { el, perch: true }, p[0], p[1], now, farHop(p[1] - it.y), 110);
    it.why = 'shelf';
    it.crept = false;
    it.nextDodge = now + DODGE_MS * 2;
    sfx.boing();
    return true;
  }

  // Working: stretch up, squash on landing with dust (drawRunaway), and now
  // and then a line
  function work(it, now) {
    it.work = { t0: now, dust: false };
    if (++it.works % WORK_LINE !== 3) return;
    const list = WORK_LINES.filter((l) => l !== it.line);
    it.line = list[Math.floor(Math.random() * list.length)];
    bulbSay(it.line, now);
  }

  // In its building site: "Nope, not a game yet." and a laugh, then off it goes
  function reachSite(it, now, c) {
    openEyes(it, now);
    it.laugh = now;
    it.work = null;
    it.reach = { c, shelf: it.spot.el.closest('.shelf') };
    bulbSay('Nope, not a game yet.', now);
  }
  // ...the mouse pointer sends it onto the first cover in view on the next
  // shelf down; the car (or no shelf below): one hop ahead
  function offSite(it, now) {
    it.laugh = 0;
    const c = chaser(now) || it.reach.c;
    if (!c.car) {
      const shelves = [...document.querySelectorAll('.shelf')];
      const next = shelves[shelves.indexOf(it.reach.shelf) + 1];
      const items = next ? [...next.querySelectorAll('.shelf__item')] : [];
      const cover = items.find(inRow) || items[0];
      if (cover && hopOnto(it, cover, now)) return;
    }
    ahead(it, now, c);
  }

  // Perched: the pointer on its cover makes the car shout "Hold still!" at
  // the pointer, and it hops one cover along (after the shelf's last game:
  // into its building site; nowhere along: one hop ahead)
  function alongShelf(it, now, c) {
    pointerShout('Hold still!');
    const next = it.spot.el.nextElementSibling;
    if (!next || !hopOnto(it, next, now)) ahead(it, now, c);
  }

  // Slid the shelf it stands on (a cover or its building site): once the
  // slide stops, it hops to the far cover in view, ahead of the slide (at the
  // end of the shelf: its building site)
  for (const shelf of document.querySelectorAll('.shelf--rail')) {
    const row = shelf.querySelector('.shelf__row');
    let t = 0;
    const look = () => {
      const it = runaway;
      if (!it?.guide || it.rail?.row !== row) return;
      if (it.hop || it.laugh) return void (t = setTimeout(look, SLIDE_SETTLE_MS)); // mid-hop: look again after
      const d = row.scrollLeft - it.rail.x0;
      if (Math.abs(d) < SLIDE_START) return;
      const seen = [...row.children].filter(inRow);
      const next = d > 0 ? seen.at(-1) : seen[0];
      if (next && next !== it.spot?.el) hopOnto(it, next, performance.now());
    };
    shelf.addEventListener('shelf:slide', () => {
      clearTimeout(t);
      t = setTimeout(look, SLIDE_SETTLE_MS);
    });
  }

  // The car's line at the mouse pointer (the visitor reaching for a cover)
  function pointerShout(text) {
    const s = document.createElement('span');
    s.className = 'car-bubble shelf-shout';
    s.append(Object.assign(document.createElement('span'), { textContent: text }));
    s.style.left = `${MathUtils.clamp(pointer.cx, 70, innerWidth - 70)}px`;
    s.style.top = `${Math.max(pointer.cy - 18, 44)}px`;
    document.body.append(s);
    void s.offsetWidth;
    s.classList.add('is-on');
    setTimeout(() => {
      s.classList.remove('is-on');
      setTimeout(() => s.remove(), 250);
    }, 1400);
  }

  // The guide's own lines, in an ink bubble over it (draw() keeps it there)
  const sayEl = document.createElement('span');
  sayEl.className = 'guide-say';
  sayEl.append(document.createElement('span'));
  layer.append(sayEl);
  let sayUntil = 0;
  function bulbSay(text, now) {
    sayEl.firstChild.textContent = text;
    sayEl.classList.add('is-on');
    sayUntil = now + SAY_MS;
  }

  // Per frame: waits on its spot, hops ahead when chased, back in after a
  // scroll away, creeps closer while the visitor rests
  function guideStep(it, now) {
    if (it.spot) {
      const p = spotPos(it.spot);
      if (p) [it.hx, it.hy] = p;
      else it.spot = null; // its cover or building site slid away: it stays where it is, until the slide stops
    }
    if (it.hop) {
      it.hop.x1 = it.hx;
      it.hop.y1 = it.hy;
      const k = Math.min(1, (now - it.hop.t0) / it.hop.ms);
      it.x = MathUtils.lerp(it.hop.x0, it.hop.x1, k);
      it.y = MathUtils.lerp(it.hop.y0, it.hop.y1, k);
      if (k >= 1) it.hop = null;
      return;
    }
    it.x = it.hx;
    it.y = it.hy;
    if (it.laugh) {
      if (now - it.laugh >= LAUGH_MS) offSite(it, now);
      return;
    }
    // Working in its building site: a small hop per WORK_PX of page scroll,
    // up or down, while it is on the screen
    if (!it.spot?.slot) worked = 0;
    else if (worked >= WORK_PX) {
      worked = 0;
      if (!it.work && juicy() && it.y > 0 && it.y < H) work(it, now);
    }
    const c = chaser(now);
    const d = c ? Math.hypot(c.x - it.x, c.y - it.y) : Infinity;
    if (it.crept) {
      // Crept up while the visitor rested: only reaching for it sets it off
      if (c?.moving && d < NEAR_R) return ahead(it, now, c, 'So close!');
      if (c?.moving && d > CREEP_GAP + 60) it.crept = false;
    } else if (c?.moving && now >= it.nextDodge && (d < c.r || (!c.car && pointerOn(it.spot)))) return reached(it, now, c);
    const above = it.y < -40;
    const below = hidden(it.y);
    const aside = it.x < -40 || it.x > W + 40; // off the side, at the end of the page
    if (!below && !aside) it.leftAt = 0;
    else if (!it.leftAt) it.leftAt = now;
    const rested = now - scrollAt > SETTLE_MS && it.inAt < scrollAt;
    // The visitor scrolled down past it: it catches up from the top edge
    if (above && scrollDir > 0 && rested && now >= it.backAt) return hopIn(it, now, true);
    // The visitor went back up: it follows from the bottom edge
    if (below && scrollDir < 0 && rested && now >= it.backAt) return hopIn(it, now, false);
    // It went on ahead, out of sight, and the visitor stays put: after
    // BACK_MS it sneaks back in
    if (below || aside) {
      const at = Math.max(Math.max(it.leftAt, scrollAt) + BACK_MS, it.backAt);
      if (now >= at) return hopIn(it, now, false);
      clearTimeout(backT);
      backT = setTimeout(wake, at - now + 60);
    }
    if (!above && !below && !aside) creep(it, now);
  }

  // Everything in canvas px moves together: the layer moving back over the
  // screen (place)
  function shiftAll(dx, dy) {
    car.x += dx;
    car.y += dy;
    grab.x += dx;
    grab.y += dy;
    for (const it of ideas) {
      it.x += dx;
      it.y += dy;
      it.hx += dx;
      it.hy += dy;
      if (it.hop) {
        it.hop.x0 += dx;
        it.hop.y0 += dy;
        it.hop.x1 += dx;
        it.hop.y1 += dy;
      }
    }
    for (const list of marks) for (const p of list) (p.x += dx), (p.y += dy);
    for (const p of [...puffs, ...rings]) (p.x += dx), (p.y += dy);
  }

  // Per frame: the layer back over the screen, re-measure (the landing moves
  // on the screen), and the car back to a visitor who returned to the landing
  // without it
  function pageFrame(now) {
    place();
    measure();
    if (camAt && now - camAt > 400) {
      camAt = 0;
      html.classList.remove('car-cam');
    }
    // Left parked down the page: it drives back in from the bottom edge of
    // the screen to the bottom of the landing
    if (onLanding() && car.y > H + carR() && !held.size && !grab.on && !grab.go) {
      Object.assign(car, { x: W / 2, y: H + carR() + 10, vx: 0, vy: 0, h: -Math.PI / 2 });
      driveTo(W / 2, Math.min(H, land.b + BOTTOM) - BOTTOM - carR() - carLen * STOP_R - 20, false, -1, true);
    }
    const it = runaway;
    // Tells shelfbulb.js and rest.js the runaway is on the screen, so theirs
    // keep away: one runaway on the screen at a time. Once on, it stays on
    // until the runaway is well off the screen (no flicker at the edge).
    const m = html.classList.contains('runaway-shown') ? 160 : 60;
    html.classList.toggle('runaway-shown', !!it && !it.gone && it.pop > 0.02 && it.y > -m && it.y < H + m);
  }

  // The visitor leaves the landing before the runaway has: it goes on ahead
  // of them (a skimmer who never caught one: a random bulb wakes up and goes)
  window.addEventListener(
    'scroll',
    () => {
      if (!entered || !firstRound || runaway?.guide || window.scrollY <= 40) return;
      const now = performance.now();
      if (!runaway) {
        const left = ideas.filter((o) => !o.gone && now >= o.delay);
        if (!left.length) return;
        makeRunaway(left[Math.floor(Math.random() * left.length)]);
      }
      escape(now);
    },
    { passive: true },
  );

  function project(x, y) {
    const r = canvas.getBoundingClientRect();
    return [r.left + x, r.top + y];
  }

  function popText(x, y, text, cls) {
    const [sx, sy] = project(x, y);
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    document.body.appendChild(el);
    const dur = cls === 'idea-wave' ? 1300 : 700;
    el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
        { transform: 'translate(-50%, -90%) scale(1.15)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -160%) scale(1)', opacity: 0 },
      ],
      { duration: dur, easing: 'ease-out' },
    ).onfinish = () => el.remove();
  }

  function collect(it, now) {
    it.gone = true;
    it.goneAt = now;
    caught += 1;
    // First catch: the player knows how to drive, "Drive me to an idea" is done
    if (howTo) {
      howTo = false;
      if (!shoutUntil) bubble?.classList.remove('is-on');
    }
    // Every idea but one (however many fit the screen): that is the
    // "Brainstorm" achievement now (no text, no new round), and the one left
    // becomes the runaway
    if (firstRound && !runaway) {
      const left = ideas.filter((o) => !o.gone);
      if (left.length === 1) {
        onWave?.();
        makeRunaway(left[0]);
      }
    } else if (firstRound && !ideas.some((o) => !o.gone && o !== runaway)) onWave?.(); // the rest, after one went ahead as the guide
    chain = now - chainAt < 1400 ? chain + 1 : 0;
    chainAt = now;
    sfx.collect(chain);
    onCollect?.();
    if (juicy()) {
      // Pickup: tiny freeze, camera kick, lime ring with sparkle rays, a hop.
      // A chain makes each of them a notch bigger.
      const c = Math.min(chain, 4);
      const [sx, sy] = project(it.x, it.y);
      burst(sx, sy, 16 + c * 3);
      sendShock(sx, sy, 0.8 + c * 0.15);
      popText(it.x, it.y - 20, chain ? `+1 ×${chain + 1}` : '+1', 'idea-plus');
      rings.push({ x: it.x, y: it.y, t: now, life: 0.45 + c * 0.04, r: 46 + c * 8, rays: 8, spin: Math.random() * Math.PI });
      frozenUntil = Math.max(frozenUntil, now + 28);
      shakeStart = now;
      shakeAmp = 0.025 + c * 0.006;
      car.squash = 0.3;
      car.popV += 4 + c;
    }
  }

  function bump(nx, ny, hard, now) {
    if (now - lastBump < 180) return;
    lastBump = now;
    sfx.thump();
    if (!juicy()) return;
    frozenUntil = now + HIT_STOP_MS;
    shakeStart = now;
    shakeAmp = 0.06;
    car.squash = -0.3 * Math.min(1, hard / 400);
    const hx = car.x - nx * carR();
    const hy = car.y - ny * carR();
    const [sx, sy] = project(hx, hy);
    burst(sx, sy, 6);
    for (let i = 0; i < 4; i++) puff(hx, hy, nx * 60 + (Math.random() - 0.5) * 80, ny * 60 + (Math.random() - 0.5) * 80, 9);
  }

  // Tyre marks from both rear wheels: faint while driving, dark when the car
  // slides or brakes hard. Smoke puffs from the wheels while it slides.
  let lastPuff = 0;
  function trail(now, speed, side) {
    const fx = Math.cos(car.h);
    const fy = Math.sin(car.h);
    const back = carLen * 0.31;
    const lat = carLen * 0.25;
    const slip = MathUtils.clamp((Math.abs(side) - 40) / 160, 0, 1);
    const moving = Math.abs(speed) > 50 || Math.abs(side) > 50;
    const a = moving ? Math.max(0.12, slip, car.braking ? 0.6 : 0) : 0;
    [-1, 1].forEach((s, k) => {
      const x = car.x - fx * back - fy * lat * s;
      const y = car.y - fy * back + fx * lat * s;
      const list = marks[k];
      const prev = list[list.length - 1];
      if (!a) {
        if (prev) prev.gap = true; // break the strip
        return;
      }
      if (prev && !prev.gap && Math.hypot(prev.x - x, prev.y - y) < 4) return;
      list.push({ x, y, t: now, a, gap: false });
      if (list.length > 400) list.shift();
    });
    // Running: a trail of smoke rings from the tail, closer together the faster it goes
    const v = Math.hypot(speed, side);
    if (v > 140 && now - lastPuff > MathUtils.clamp(9000 / v, 22, 70)) {
      lastPuff = now;
      const bx = -car.vx / v; // behind = opposite the way it moves
      const by = -car.vy / v;
      puff(car.x + bx * carLen * 0.5, car.y + by * carLen * 0.5, -car.vx * 0.1 + (Math.random() - 0.5) * 20, -car.vy * 0.1 + (Math.random() - 0.5) * 20, 4 + Math.min(v, 700) * 0.008);
    } else if (slip > 0.45 && now - lastPuff > 45) {
      lastPuff = now;
      const s = Math.random() < 0.5 ? -1 : 1;
      puff(car.x - fx * back - fy * lat * s, car.y - fy * back + fx * lat * s, -car.vx * 0.15 + (Math.random() - 0.5) * 40, -car.vy * 0.15 + (Math.random() - 0.5) * 40);
    }
  }

  // Touching the edge of the page (normal nx, ny pointing away from it): a slow
  // touch slides along it (no flip, no thump), a hard hit bounces off nose first
  function hit(nx, ny, now) {
    const vn = car.vx * nx + car.vy * ny;
    if (vn >= 0) return;
    if (-vn < SOFT_HIT) {
      car.vx -= vn * nx;
      car.vy -= vn * ny;
      return;
    }
    car.vx -= (1 + BOUNCE) * vn * nx;
    car.vy -= (1 + BOUNCE) * vn * ny;
    bounceNose(nx, ny);
    bump(nx, ny, -vn, now);
  }

  // A bounce mirrors the heading off the wall too, so the car comes off it
  // nose first instead of rolling backward
  function bounceNose(nx, ny) {
    const fx = Math.cos(car.h);
    const fy = Math.sin(car.h);
    if (car.vx * fx + car.vy * fy >= 0) return;
    const d = fx * nx + fy * ny;
    car.h = Math.atan2(fy - 2 * d * ny, fx - 2 * d * nx);
    // still backward (hit nose-on, square to the wall): turn to the motion
    if (car.vx * Math.cos(car.h) + car.vy * Math.sin(car.h) < 0) car.h = Math.atan2(car.vy, car.vx);
  }

  function puff(x, y, vx, vy, r = 7) {
    if (puffs.length > 140) return;
    puffs.push({ x, y, vx, vy, t: performance.now(), life: SMOKE_LIFE * (0.8 + Math.random() * 0.4), r });
  }

  /* input: click or tap anywhere on the page (not a link, button, game cover
     or picture) and the car drives to that spot and parks, even after you
     let go. Mouse on empty space: hold and move and it follows. On text a
     click drives and a drag still selects. Touch: a tap (not the start of a
     scroll) sends it there. */
  const GO_MS = 6000; // a target the car cannot reach is dropped after this
  const local = (x, y) => {
    const r = canvas.getBoundingClientRect();
    return [x - r.left, y - r.top];
  };
  const blocked = (t) => !!t.closest?.('a, button, input, textarea, select, label, summary, [role="button"], [contenteditable], img, picture, video, iframe, .banner__media, .hud, .scrollcar, .lightbox, dialog');
  const texty = (t) => [...(t.childNodes || [])].some((n) => n.nodeType === 3 && n.textContent.trim());
  let downType = '';
  // auto: the car drives itself (back to the landing): the screen does not follow
  const driveTo = (x, y, hold, id, auto = false) => {
    Object.assign(grab, { x, y, on: hold, id, go: true, goUntil: hold ? Infinity : performance.now() + GO_MS, auto });
    // The player acted: a bulb that popped up under the parked car is fair game now
    if (!auto) ideas.forEach((it) => (it.waiting = false));
    pushed(performance.now(), auto);
  };
  document.addEventListener('pointerdown', (e) => {
    downType = e.pointerType;
    if (!entered || e.pointerType !== 'mouse' || e.button > 0 || blocked(e.target) || texty(e.target)) return;
    e.preventDefault(); // no text selection while driving
    driveTo(...local(e.clientX, e.clientY), true, e.pointerId);
  });
  document.addEventListener('click', (e) => {
    if (!entered || !e.detail || blocked(e.target)) return;
    // Mouse: empty space drove on press; on text only a click, not a drag that selected it
    if (downType === 'mouse' && (!texty(e.target) || !getSelection().isCollapsed)) return;
    driveTo(...local(e.clientX, e.clientY), false, -1);
  });
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!grab.on || e.pointerId !== grab.id) return;
      [grab.x, grab.y] = local(e.clientX, e.clientY);
    },
    { passive: true },
  );
  const release = (e) => {
    if (!grab.on || (e && e.pointerId !== grab.id)) return;
    grab.on = false; // the target stays: the car still drives there and parks
    grab.goUntil = performance.now() + GO_MS;
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', () => release());

  /* input: keys. WASD drive the car the way they point on the screen (up = up
     the page; two keys = a diagonal) while the car is on the screen. The
     arrows too on the landing, and below it once the visitor has driven; they
     then drive instead of scrolling (before that, keyboard readers scroll). */
  const held = new Set();
  const onLanding = () => {
    const r = host.getBoundingClientRect();
    return r.top < innerHeight / 2 && r.bottom > innerHeight / 2;
  };
  const carOnScreen = () => car.x > 0 && car.x < W && car.y > 0 && car.y < H;
  window.addEventListener('keydown', (e) => {
    if (!entered || !KEY_DIRS[e.code] || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (!held.size && !(carOnScreen() && (e.code.startsWith('Key') || played || onLanding()))) return;
    e.preventDefault();
    if (!held.size) ideas.forEach((it) => (it.waiting = false));
    held.add(e.code);
    grab.on = false;
    grab.go = false;
    pushed(performance.now());
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  // Heading the held keys ask for, or null (none, or opposite keys)
  const keyAim = () => {
    let x = 0;
    let y = 0;
    held.forEach((code) => {
      x += KEY_DIRS[code][0];
      y += KEY_DIRS[code][1];
    });
    return x || y ? Math.atan2(y, x) : null;
  };

  function pushed(now, auto = false) {
    if (!auto) played = true;
    car.restAt = now;
    if (!shoutUntil) bubble?.classList.remove('is-on');
    wake();
  }

  // Free run (px) from the car along a direction before it would touch the
  // edge of the page
  function runTo(dx, dy) {
    const r = carR();
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (area.r - r - car.x) / dx);
    if (dx < 0) t = Math.min(t, (area.l + r - car.x) / dx);
    if (dy > 0) t = Math.min(t, (area.b - r - car.y) / dy);
    if (dy < 0) t = Math.min(t, (area.t + r - car.y) / dy);
    return Math.max(0, t);
  }

  // Gas or brake toward speed sp along the heading only (sideways slip is
  // left to the grip: drift), never faster than it can slow to a soft touch
  // before the edge it is moving toward (a target flipped behind it, a
  // drift). Returns the forward speed before the change.
  function gas(sp, dt) {
    const hx = Math.cos(car.h);
    const hy = Math.sin(car.h);
    const v0 = Math.hypot(car.vx, car.vy);
    const run = v0 > 1 ? runTo(car.vx / v0, car.vy / v0) : runTo(hx, hy);
    const v = Math.min(sp, Math.sqrt(CORNER_V * CORNER_V + 2 * BRAKE * run));
    const fwd = car.vx * hx + car.vy * hy;
    const dv = (v - fwd) * (1 - Math.exp(-(v > fwd ? FOLLOW_GRIP : FOLLOW_GRIP * 1.6) * dt));
    car.vx += hx * dv;
    car.vy += hy * dv;
    return fwd;
  }

  // Target past the edge of the page: aim just inside it instead
  function dragGoal() {
    const r = carR() + GOAL_GAP;
    return { x: MathUtils.clamp(grab.x, area.l + r, area.r - r), y: MathUtils.clamp(grab.y, area.t + r, area.b - r) };
  }

  /* physics step */
  function step(dt, now) {
    const j = juicy();
    const maxV = reducedMotion() ? MAX_SPEED * 0.5 : MAX_SPEED;

    // Dragging: the car chases the pointer with a stiff spring on its speed,
    // so it still turns, drifts and bumps like a car instead of sticking to it
    // Driving: steer toward the target (straight over the page) and give gas along
    // the heading, so a target behind it makes it swing round and drive
    // forward, never back. Steering scales with speed: a nearly still car
    // cannot turn, so it never spins on the spot. Inside the park zone round
    // the target it neither steers nor drives, it brakes and parks.
    if (grab.go && !grab.on && now > grab.goUntil) grab.go = false;
    const aim = keyAim();
    const driving = grab.on || grab.go || aim !== null;
    if (aim !== null) {
      // Keys: turn toward where they point and give gas; facing away, it
      // rolls on slowly while it swings round (it cannot turn standing still)
      const turn = angleTo(car.h, aim);
      const fwd0 = car.vx * Math.cos(car.h) + car.vy * Math.sin(car.h);
      const rate = TURN * MathUtils.clamp(Math.abs(fwd0) / 160, TURN_SLOW, 1);
      car.h += MathUtils.clamp(turn, -rate * dt, rate * dt);
      gas(maxV * KEY_GAS * Math.max(0.35, Math.cos(Math.min(Math.abs(turn), Math.PI / 2))), dt);
      car.restAt = now;
    } else if (driving) {
      const goal = dragGoal();
      const dx = goal.x - car.x;
      const dy = goal.y - car.y;
      const near = Math.hypot(dx, dy);
      const park = carLen * STOP_R;
      const fwd0 = car.vx * Math.cos(car.h) + car.vy * Math.sin(car.h);
      let sp = 0;
      if (near > park) {
        const turn = angleTo(car.h, Math.atan2(dy, dx));
        const rate = TURN * MathUtils.clamp(Math.abs(fwd0) / 160, TURN_SLOW, 1);
        car.h += MathUtils.clamp(turn, -rate * dt, rate * dt);
        sp = Math.min(maxV, (near - park) * FOLLOW + 60);
        // Sharp turn: slow to a speed whose turning circle fits, so it
        // pivots onto the cursor instead of circling it
        if (Math.abs(turn) > SHARP) sp = Math.min(sp, Math.max(140, TURN * near * 0.45));
        // Facing away: keep rolling forward slowly while it turns round
        sp *= Math.max(0.35, Math.cos(Math.min(Math.abs(turn), Math.PI / 2)));
      }
      const fwd = gas(sp, dt);
      car.restAt = now;
      // Parked on a released target: the trip is done
      if (!grab.on && near <= park && Math.abs(fwd) < 15) grab.go = false;
    }

    const fx = Math.cos(car.h);
    const fy = Math.sin(car.h);
    let speed = car.vx * fx + car.vy * fy;
    let side = -car.vx * fy + car.vy * fx;
    // Not driving: the car never turns by itself. It keeps its heading,
    // rolls straight on and stops; leftover drift dies out through the grip.
    speed *= Math.exp(-ROLL * dt);
    if (!driving && Math.abs(speed) < 6) speed = 0; // rolled to a stop (never while the engine pulls)
    side *= Math.exp(-(j ? (driving ? GRIP : GRIP * 2.5) : GRIP * 3) * dt); // released: tyres grip, drift ends fast
    const vNow = Math.hypot(speed, side);
    if (vNow > maxV) {
      speed *= maxV / vNow;
      side *= maxV / vNow;
    }
    car.braking = false;
    const nfx = Math.cos(car.h);
    const nfy = Math.sin(car.h);
    car.vx = nfx * speed - nfy * side;
    car.vy = nfy * speed + nfx * side;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    car.roll = MathUtils.lerp(car.roll, MathUtils.clamp(side / 260, -1, 1) * 0.35, 1 - Math.exp(-10 * dt));
    if (j) trail(now, speed, side);

    // The screen scrolls along while the visitor drives the car on the screen
    // (never for a parked car, a trip the car drives by itself, or a car
    // coming in from off the screen), keeping it between CAM_LO and CAM_HI of
    // the height as it moves up or down. Over the landing the car first has
    // the whole landing, so the round there never moves the page. The car then
    // moves up the canvas with the page (place).
    if (driving && !(grab.go && grab.auto && !held.size) && carOnScreen()) {
      const h = innerHeight;
      const y = car.y + off - scrollY; // on the screen
      const hi = Math.max(h * CAM_HI, hostR.bottom - BOTTOM);
      const over = y > hi && car.vy > 0 ? y - hi : y < h * CAM_LO && car.vy < 0 ? y - h * CAM_LO : 0;
      const to = MathUtils.clamp(Math.round(scrollY + over * Math.min(1, 9 * dt)), 0, html.scrollHeight - innerHeight);
      if (over && to !== Math.round(scrollY)) {
        html.classList.add('car-cam'); // tells snap.js to leave the page where the car takes it
        camAt = now;
        window.scrollTo({ top: to, behavior: 'instant' });
      }
    }

    // "Drive me to an idea" (until the first catch) hides while the car rolls
    // and comes back once it has rested a moment; a shout stays up its full time
    if (vNow > 20) car.movedAt = now;
    if (vNow > 15) {
      car.restAt = now;
      if (!shoutUntil) bubble?.classList.remove('is-on');
    } else if (bubble && entered && howTo && !shoutUntil && now - car.restAt > BUBBLE_REST_MS) bubble.classList.add('is-on');

    // Collisions: the edges of the page (keep in)
    const r = carR();
    const edges = [
      [car.x - r - area.l, 1, 0],
      [area.r - (car.x + r), -1, 0],
      [car.y - r - area.t, 0, 1],
      [area.b - (car.y + r), 0, -1],
    ];
    for (const [gap, nx, ny] of edges) {
      if (gap >= 0) continue;
      car.x -= nx * gap;
      car.y -= ny * gap;
      hit(nx, ny, now);
    }

    // Ideas: drift toward a close car, caught inside the pickup radius
    for (const it of ideas) {
      if (it.gone || now < it.delay) continue;
      const dx = car.x - it.x;
      const dy = car.y - it.y;
      const d = Math.hypot(dx, dy);
      // The guide (the runaway once it has left the landing) is never caught
      if (it === runaway && it.guide) {
        guideStep(it, now);
        continue;
      }
      // The runaway on the landing never drifts in and is never caught: it hops away instead
      if (it === runaway) {
        if (it.hop) {
          const k = Math.min(1, (now - it.hop.t0) / it.hop.ms);
          it.x = MathUtils.lerp(it.hop.x0, it.hop.x1, k);
          it.y = MathUtils.lerp(it.hop.y0, it.hop.y1, k);
          if (k >= 1) it.hop = null;
        } else {
          const moving = Math.hypot(car.vx, car.vy) > 40;
          if (it.crept) {
            // Crept up while the visitor rested: only a car reaching for it
            // sets it off, at the last moment; a car driving off ends it
            if (moving && d < NEAR_R) dodge(it, now, d);
            else if (moving && d > CREEP_GAP + 60 && car.vx * dx + car.vy * dy > 0) it.crept = false;
          } else {
            const chased = d < dodgeR && now >= it.nextDodge && moving;
            if (chased && it.dodges >= DODGES) escape(now);
            else if (chased) dodge(it, now, d);
            else if (it.lastDodge && now - Math.max(it.lastDodge, it.calmAt || 0) > IDLE_ESCAPE_MS) escape(now);
          }
          if (!it.hop && !it.guide) creep(it, now);
        }
        continue;
      }
      const reach = PICK_R + carLen * 0.2;
      // A bulb that pops up under the parked car waits for the player's next
      // click (see pointerdown) or for the car to leave it, so it is never a
      // free catch, but the first click picks it up
      if (it.waiting) {
        if (d > reach + 20) it.waiting = false;
        else continue;
      }
      if (d < reach) collect(it, now);
      else if (d < MAGNET_R) {
        const pull = (1 - d / MAGNET_R) * 380;
        it.vx += (dx / d) * pull * dt;
        it.vy += (dy / d) * pull * dt;
      }
      // spring back to its spot, so the layout stays the same
      it.vx += (it.hx - it.x) * 6 * dt;
      it.vy += (it.hy - it.y) * 6 * dt;
      it.vx *= Math.exp(-4 * dt);
      it.vy *= Math.exp(-4 * dt);
      it.x += it.vx * dt;
      it.y += it.vy * dt;
    }
  }

  /* 2D layer: headlights, marks, smoke, rings */
  function drawFx(now, dt) {
    fx.clearRect(0, 0, W, H);
    // Dark mode: the headlights cast a soft wedge of light on the ground ahead
    if (dark && car.pop > 0.05) {
      const hx = Math.cos(car.h);
      const hy = Math.sin(car.h);
      const x0 = car.x + hx * carLen * 0.42;
      const y0 = car.y + hy * carLen * 0.42;
      const len = carLen * HEADLIGHT_LEN;
      const w0 = carLen * 0.22; // between the headlights
      const w1 = carLen * 0.95; // at the far end
      const glow = fx.createRadialGradient(x0, y0, carLen * 0.1, x0, y0, len);
      glow.addColorStop(0, HEADLIGHT);
      glow.addColorStop(1, 'rgba(236, 255, 190, 0)');
      fx.fillStyle = glow;
      fx.globalAlpha = Math.min(1, car.pop);
      fx.beginPath();
      fx.moveTo(x0 - hy * w0, y0 + hx * w0);
      fx.lineTo(x0 + hx * len - hy * w1, y0 + hy * len + hx * w1);
      fx.lineTo(x0 + hx * len + hy * w1, y0 + hy * len - hx * w1);
      fx.lineTo(x0 + hy * w0, y0 - hx * w0);
      fx.closePath();
      fx.fill();
      fx.globalAlpha = 1;
    }
    fx.lineCap = 'butt'; // round caps would overlap and bead the marks
    fx.lineJoin = 'round';
    // Tyre marks: one stroke per segment, so each can fade on its own
    fx.strokeStyle = ink;
    fx.lineWidth = carLen * 0.09;
    for (const list of marks) {
      while (list.length && (now - list[0].t) / 1000 > MARK_LIFE) list.shift();
      for (let i = 1; i < list.length; i++) {
        const p = list[i - 1];
        if (p.gap) continue;
        const q = list[i];
        fx.globalAlpha = q.a * 0.32 * (1 - (now - q.t) / 1000 / MARK_LIFE);
        fx.beginPath();
        fx.moveTo(p.x, p.y);
        fx.lineTo(q.x, q.y);
        fx.stroke();
      }
    }
    // Smoke: paper-white puffs with a thin ink edge, growing as they fade
    fx.lineCap = 'round';
    fx.lineWidth = 1.5;
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      const k = (now - p.t) / 1000 / p.life;
      if (k >= 1) {
        puffs.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-3 * dt);
      p.vy *= Math.exp(-3 * dt);
      const r = p.r * (1 + k * 1.6);
      fx.beginPath();
      fx.arc(p.x, p.y, r, 0, Math.PI * 2);
      fx.globalAlpha = 0.85 * (1 - k);
      fx.fillStyle = paper;
      fx.fill();
      fx.globalAlpha = 0.45 * (1 - k);
      fx.strokeStyle = ink;
      fx.stroke();
    }
    // Pickup rings: lime ring with an ink edge, plus sparkle rays
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i];
      const k = (now - g.t) / 1000 / g.life;
      if (k >= 1) {
        rings.splice(i, 1);
        continue;
      }
      const e = 1 - (1 - k) ** 3;
      const r = g.r * (0.3 + e * 0.9);
      fx.globalAlpha = 1 - k;
      fx.beginPath();
      fx.arc(g.x, g.y, r, 0, Math.PI * 2);
      fx.strokeStyle = ink;
      fx.lineWidth = 7 * (1 - k) + 2;
      fx.stroke();
      fx.strokeStyle = '#caff00';
      fx.lineWidth = 7 * (1 - k);
      fx.stroke();
      for (let n = 0; n < g.rays; n++) {
        const ang = g.spin + (n / g.rays) * Math.PI * 2;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        const r0 = r * 1.1;
        const r1 = r * (1.1 + 0.45 * (1 - k));
        fx.beginPath();
        fx.moveTo(g.x + c * r0, g.y + s * r0);
        fx.lineTo(g.x + c * r1, g.y + s * r1);
        fx.strokeStyle = ink;
        fx.lineWidth = 3;
        fx.stroke();
      }
    }
    fx.globalAlpha = 1;
  }

  /* draw */
  const wp = new Vector3();

  // Runaway: hop arc (stretched in the air, squashed at take-off and
  // landing); once awake, eyes that spring open, blink every few seconds and
  // wink after each dodge
  function drawRunaway(it, now, j, bob, bs, dt) {
    // Phones: smaller while it stands in a building site
    const size = it.spot?.slot && W < 600 ? SITE_SIZE : 1;
    it.size = j ? MathUtils.lerp(it.size, size, 1 - Math.exp(-8 * dt)) : size;
    let lift = 0;
    let sx = 1;
    let sy = 1;
    let foot = 0; // working and laughing, it squashes from its feet
    let flick = 1;
    if (it.hop && j) {
      const k = Math.min(1, (now - it.hop.t0) / it.hop.ms);
      const s = Math.sin(k * Math.PI);
      const ground = k < 0.12 || k > 0.88;
      lift = s * it.hop.lift;
      sx = 1 - s * 0.12 + (ground ? 0.12 : 0);
      sy = 1 + s * 0.16 - (ground ? 0.14 : 0);
    } else if (it.work && j && now - it.work.t0 < WORK_MS) {
      // Working hop: up stretched, down onto a squash (dust), back to shape
      const k = (now - it.work.t0) / WORK_MS;
      const i = k < WORK_KEYS[1][0] ? 0 : k < WORK_KEYS[2][0] ? 1 : 2;
      const [k0, l0, x0, y0] = WORK_KEYS[i];
      const [k1, l1, x1, y1] = WORK_KEYS[i + 1];
      const t = (k - k0) / (k1 - k0);
      const e = i === 1 ? t * t : 1 - (1 - t) * (1 - t);
      lift = MathUtils.lerp(l0, l1, e);
      sx = MathUtils.lerp(x0, x1, e);
      sy = MathUtils.lerp(y0, y1, e);
      foot = FEET * it.size * (1 - sy);
      if (i === 2 && !it.work.dust) {
        it.work.dust = true;
        [-1, 1].forEach((s) => puff(it.x + s * 8, it.y + FEET * it.size - 4, s * 70, -12, 4));
      }
    } else if (it.work) it.work = null;
    if (it.laugh && j) {
      // Laugh: three giggles, rays flicking, a little shake
      const k = Math.min(1, (now - it.laugh) / LAUGH_MS);
      const g = Math.sin(k * Math.PI * 6.6) * (1 - k * 0.4);
      lift = Math.max(0, g) * 5;
      sx = 1 - g * 0.05;
      sy = 1 + g * 0.05;
      foot = FEET * it.size * (1 - sy);
      flick = 1 + Math.max(0, g) * 0.55;
      it.g.rotation.z += Math.sin(k * Math.PI * 10) * 0.08 * (1 - k);
    }
    for (const r of it.g.userData.rays) r.scale.y = flick;
    it.drawY = it.y + bob - lift + foot;
    toWorld(it.x, it.drawY, wp);
    it.g.position.copy(wp);
    const base = bs * it.size * Math.max(it.pop, 0);
    it.g.scale.set(base * sx, base * sy, base);
    if (!it.eyes) return;
    const open = j ? elasticOut(Math.min(1, (now - it.wokeAt) / 450)) : 1;
    if (now > it.blinkAt + 130) it.blinkAt = now + 2600 + Math.random() * 2400;
    const blink = it.laugh ? 0.3 : j && now > it.blinkAt ? 0.12 : 1; // laughing: eyes squeezed
    it.eyes[0].scale.set(0.03 * open, 0.042 * open * blink, 0.012);
    it.eyes[1].scale.set(0.03 * open, 0.042 * open * (now < it.winkUntil ? 0.15 : blink), 0.012);
  }
  function draw(now, dt) {
    const j = juicy();
    const time = now / 1000;
    // squash spring + pop-in spring
    if (j) {
      car.squashV += (-car.squash * 320 - car.squashV * 12) * dt;
      car.squash += car.squashV * dt;
      car.popV += ((car.popTarget - car.pop) * 220 - car.popV * 14) * dt;
      car.pop += car.popV * dt;
    } else {
      car.squash = 0;
      car.pop = car.popTarget;
    }
    car.popTarget = entered ? 1 : 0;
    toWorld(car.x, car.y, wp);
    carG.position.copy(wp);
    if (bubble) bubble.style.transform = `translate(${car.x.toFixed(1)}px, ${(car.y - carLen * 0.62).toFixed(1)}px)`;
    carG.rotation.z = -car.h;
    const s = (carLen * unit) / 0.9;
    const sq = MathUtils.clamp(car.squash, -0.4, 0.5);
    carG.scale.set(s * (1 + sq * 0.5) * Math.max(car.pop, 0), s * (1 - sq * 0.3) * Math.max(car.pop, 0), s * Math.max(car.pop, 0));
    rollG.rotation.x = j ? car.roll : 0;
    const accelPitch = MathUtils.clamp((Math.hypot(car.vx, car.vy) - MAX_SPEED * 0.5) / MAX_SPEED, -0.2, 0.2);
    rollG.rotation.y = j ? accelPitch * 0.25 : 0;

    const bs = 60 * unit / 0.7; // ideas ~60 px tall
    for (const it of ideas) {
      const started = now >= it.delay;
      if (j) {
        const goal = it.gone ? 0 : started ? 1 : 0;
        it.popV += ((goal - it.pop) * (it.gone ? 420 : 200) - it.popV * (it.gone ? 22 : 12)) * dt;
        it.pop += it.popV * dt;
      } else it.pop = it.gone ? 0 : started ? 1 : 0;
      const grow = it.gone ? 1 + (1 - Math.max(it.pop, 0)) * 0.6 : 1;
      it.g.visible = it.pop > 0.02;
      const bob = j ? Math.sin(time * 2 + it.phase) * 6 : 0;
      toWorld(it.x, it.y + bob, wp);
      it.g.position.copy(wp);
      it.g.scale.setScalar(bs * Math.max(it.pop, 0) * grow);
      it.g.rotation.z = j ? Math.sin(time * 1.3 + it.phase) * 0.15 * it.mirror : 0;
      if (it === runaway) drawRunaway(it, now, j, bob, bs, dt);
    }
    // The guide's line rides over it (under it at the top of the screen),
    // kept on the screen
    if (sayUntil && (now > sayUntil || !runaway || runaway.gone)) {
      sayEl.classList.remove('is-on');
      sayUntil = 0;
    }
    if (sayUntil) {
      const span = sayEl.firstChild;
      const w = span.offsetWidth / 2 + 8;
      const up = 58 * runaway.size; // over its rays
      const below = runaway.drawY - up - span.offsetHeight < 8;
      sayEl.classList.toggle('is-below', below);
      sayEl.style.transform = `translate(${MathUtils.clamp(runaway.x, w, W - w).toFixed(1)}px, ${(below ? runaway.drawY + FEET * runaway.size + 12 : runaway.drawY - up).toFixed(1)}px)`;
    }
    // Shout over (before the first catch: back to the how-to-play line)
    if (shoutUntil && now > shoutUntil) {
      bubble.classList.remove('is-on');
      if (howTo) bubble.firstChild.textContent = 'Drive me to an idea';
      car.restAt = now;
      shoutUntil = 0;
    }
    ideas = ideas.filter((it) => {
      if (it.gone && it.pop < 0.02 && now - it.goneAt > 400) {
        scene.remove(it.g);
        return false;
      }
      return true;
    });
    // keep the wave list honest for the "all gone" check (no new rounds once
    // the runaway has been: it comes back on its own instead)
    if (entered && !ideas.length && !waveBusy && !runawayDone) {
      waveBusy = true;
      setTimeout(spawnWave, 400);
    }

    drawFx(now, dt);
    // Tells rest.js the runaway is on the screen, so it keeps its own away
    canvas.toggleAttribute('data-runaway', !!runaway && !runaway.gone && html.classList.contains('runaway-shown'));

    const shakeT = (now - shakeStart) / SHAKE_MS;
    camera.position.copy(camBase);
    if (j && shakeT < 1) {
      const amp = shakeAmp * (1 - shakeT);
      camera.position.x += Math.sin(now * 0.09) * amp;
      camera.position.y += Math.cos(now * 0.11) * amp;
    }
    renderer.render(scene, camera);
  }

  /* hooks from the landing */
  window.addEventListener('entrance:launch', () => {
    const fx = Math.cos(car.h);
    const fy = Math.sin(car.h);
    car.vx += fx * 500;
    car.vy += fy * 500;
    if (juicy()) for (let i = 0; i < 6; i++) puff(car.x - fx * carLen * 0.4, car.y - fy * carLen * 0.4, -fx * 120 + (Math.random() - 0.5) * 90, -fy * 120 + (Math.random() - 0.5) * 90, 9);
    wake();
  });
  const paint = () => {
    dark = html.dataset.theme === 'dark';
    rayMat.color.set(dark ? 0xf2ede2 : INK);
    readColours();
  };
  paint();
  window.addEventListener('themechange', () => {
    paint();
    wake();
  });

  /* loop: sleeps when nothing moves and nothing is animating */
  let raf = 0;
  let last = 0;
  function frame(t) {
    const dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    pageFrame(t);
    if (t >= frozenUntil) step(dt, t);
    draw(t, dt);
    // Sleeps while nothing of the game moves on the screen: the landing out
    // of view, no runaway on the screen, no smoke or tyre marks, the car
    // still and done bouncing. The layer scrolls with the page meanwhile, so
    // everything on it stays put on the page; a scroll or any input wakes it.
    const settled = Math.abs(car.pop - car.popTarget) < 0.002 && Math.abs(car.popV) < 0.01 && Math.abs(car.squash) < 0.002 && Math.abs(car.squashV) < 0.01 && Math.abs(car.roll) < 0.002;
    const idle =
      !(hostR.bottom > 0 && hostR.top < innerHeight) && !(runaway && (runaway.hop || (runaway.y > -80 && runaway.y < H + 80 && runaway.x > -80 && runaway.x < W + 80))) &&
      !puffs.length && !rings.length && !marks[0].length && !marks[1].length && !held.size && !grab.go && !camAt && !shoutUntil && !sayUntil &&
      Math.hypot(car.vx, car.vy) < 1 && settled;
    raf = !document.hidden && !idle ? requestAnimationFrame(frame) : 0;
  }
  window.addEventListener('scroll', () => wake(), { passive: true });
  function wake() {
    if (raf || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('resize', () => {
    layout();
    wake();
  });

  layout();
  wake();

  // Test hook: ?debug exposes the game state (headless tests only)
  if (new URLSearchParams(location.search).has('debug')) {
    window.__landing = { car, ideas: () => ideas, walls: () => walls, area: () => area, canvas, fxCounts: () => [marks[0].length + marks[1].length, puffs.length, rings.length], goal: () => dragGoal(), runaway: () => runaway, firstRound: () => firstRound, howTo: () => howTo, caught: () => caught, off: () => off, land: () => land, layer, grab, played: () => played, asleep: () => !raf, spots: () => guideSpots(runaway), said: () => (sayUntil ? sayEl.textContent : ''), guideTo: (el) => runaway?.guide && hopOnto(runaway, el, performance.now()) && (runaway.why = 'test'), backPlace: () => backPlace(runaway, performance.now()), scrollRest: () => ({ scrollAt, scrollDir, raf }), dodgeR };
  }

  return {
    enter() {
      entered = true;
      measure();
      // Car drops in at the bottom centre, then the first wave pops in
      // Start on the centre line (the name's and the bulbs' mirror axis), at
      // the bottom of the play area
      car.x = W / 2;
      car.y = land.b - carR() - 10;
      car.h = -Math.PI / 2;
      if (juicy()) car.popV = 6;
      setTimeout(spawnWave, 350);
      // How to play: over the car whenever it rests (also carries the "Hey! Come back!" shout)
      if (!bubble) {
        bubble = document.createElement('span');
        bubble.className = 'car-bubble';
        bubble.setAttribute('aria-hidden', 'true');
        bubble.innerHTML = '<span>Drive me to an idea</span>';
        layer.append(bubble);
      }
      car.restAt = performance.now() - BUBBLE_REST_MS + 900; // bubble pops up just after the car lands
      wake();
    },
  };
}
