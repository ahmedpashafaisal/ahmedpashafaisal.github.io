// Landing mini-game in three.js: the ink toy car (seen from above, slightly
// tilted) sits on the landing with a "Drive me to an idea" bubble (until the
// first catch). Click anywhere on the landing and the car drives there and
// parks (turning, drifting, leaving tyre marks and a smoke trail); hold and
// move and it follows. It catches the ideas (lightbulbs) that pop up on fixed
// spots around the name. The name, the line and the button are walls: the
// car drives round them and bounces off if it clips one.
//
// The runaway idea: there is one round of 6. Catch them in any order; the
// last one left will not be caught. When the car comes close it opens its
// eyes and hops away (a little closer each visit, never close enough) while
// the car reacts ("What the…!", "Hold still!", "Seriously?!"). After 3
// dodges, or once the chase stops, it hops off down the page toward the games
// ("Hey! Come back!"). No new round: a few seconds later it hops back in
// ("There you are!") and the chase can start again. A visitor who scrolls
// without playing sees a random bulb wake up and hop off the same way.
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
import { readStats } from './achievements.js';
import { burst } from './burst.js';
import { sendShock } from './dotgrid.js';
import { juicy, reducedMotion } from './motion.js';
import { sfx } from './sound.js';

const INK = 0x1d1b18;
const LIME = 0xcaff00;
const SURFACE = 0xfffdf8;
const INK_SOFT = 0x5c5750;

/* ---------- tuning (pixels, seconds) ---------- */
const MAX_SPEED = 900;
const TURN = 9; // rad/s: how fast the car turns to face where it rolls
const GRIP = 4; // sideways slip decay: lower = more drift
const ROLL = 2.2; // rolling friction: speed decay per second (a throw rolls about speed / 2.2 px)
const FOLLOW = 3.2; // driving: speed toward the cursor per px of distance (slows on arrival)
const FOLLOW_GRIP = 6; // driving: how fast the engine reaches that speed
const TURN_SLOW = 0.12; // share of TURN kept when nearly still: no spinning on the spot
const SHARP = 0.7; // rad off the pointer: slow down so the turn stays tight
const STOP_R = 0.75; // car lengths: cursor this close = parked (no steering, no gas)
const BUBBLE_REST_MS = 1200; // car still this long: "Drive me to an idea" comes back
const WALL_PAD = 10;
const BOUNCE = 0.45;
const HIT_STOP_MS = 55;
const SHAKE_MS = 200;
const WAVE = 6;
const PICK_R = 46; // generous pickup radius
const MAGNET_R = 110; // ideas drift toward a car this close
const EDGE = 16; // play area inset from the canvas edges
const BOTTOM = 84; // keep clear of the bottom corner buttons
const RETURN_MS = 6000; // the runaway comes back this long after hopping off
const DODGE_LINES = ['What the…!', 'Hold still!', 'Seriously?!']; // the car, at dodge 1, 2, 3
const DODGE_R = 150; // runaway hops away when the car is this close (first visit)
const DODGE_STEP = 12; // ...and lets it this much closer each later visit
const DODGE_MIN_R = 95; // never closer than this (catching needs PICK_R + a bit)
const DODGE_MS = 600; // shortest time between two dodges: no jitter
const DODGES = 3; // dodges before it hops off for good
const IDLE_ESCAPE_MS = 8000; // chase stopped this long after a dodge: it leaves
const HOP_MS = 420; // one dodge hop
const ESCAPE_MS = 900; // the hop off the landing
const SHOUT_MS = 1800; // "Hey! Come back!" stays up this long
const MARK_LIFE = 1.6; // s, tyre marks fade out
const SMOKE_LIFE = 0.7; // s

/* ---------- materials and parts ---------- */

const gradientMap = (() => {
  const tex = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();
const outlineMat = new MeshBasicMaterial({ color: INK, side: BackSide });
const mats = new Map();
const toon = (color) => {
  if (!mats.has(color)) mats.set(color, new MeshToonMaterial({ color, gradientMap }));
  return mats.get(color);
};
// Car body follows the theme (ink in light mode, light ink in dark mode)
const carBodyMat = new MeshToonMaterial({ color: INK, gradientMap });

function part(geo, color, { pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], line = 1.07 } = {}) {
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

// Toy car: 0.9 long along +x (front), roof along +y
function carModel() {
  const wheel = (x, z) =>
    part(new CylinderGeometry(0.13, 0.13, 0.1, 20), INK_SOFT, { pos: [x, -0.2, z], rot: [Math.PI / 2, 0, 0], line: 1 });
  const light = (z) => part(new BoxGeometry(0.04, 0.08, 0.12), LIME, { pos: [0.46, 0.0, z], line: 1 });
  const body = part(new BoxGeometry(0.9, 0.28, 0.5), INK, { pos: [0, -0.04, 0] });
  body.children[1].material = carBodyMat;
  return group(
    body,
    part(new BoxGeometry(0.48, 0.24, 0.44), SURFACE, { pos: [-0.06, 0.22, 0] }),
    wheel(0.28, 0.25), wheel(-0.28, 0.25), wheel(0.28, -0.25), wheel(-0.28, -0.25),
    light(0.15), light(-0.15),
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
function bulbModel() {
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
  return group(
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
}

const elasticOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
const angleTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/* ---------- scene ---------- */

export function initHero(canvas, { onCollect, onWave } = {}) {
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
  canvas.before(fxCanvas);
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
  const car = { x: 0, y: 0, vx: 0, vy: 0, h: -Math.PI / 2, squash: 0, squashV: 0, roll: 0, pop: 0, popV: 0, popTarget: 0, restAt: 0, braking: false };
  // Pointer target: on = button or finger held (target follows it);
  // go = drive to the target until the car parks there (also after release)
  const grab = { x: 0, y: 0, on: false, id: -1, go: false, goUntil: 0 };
  let walls = []; // {l, t, r, b} in canvas px
  let area = { l: 0, t: 0, r: 1, b: 1 };
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
  let runawayDone = false; // escaped: later rounds are normal
  let shoutUntil = 0;
  let howTo = true; // "Drive me to an idea" until the first catch
  let caught = 0;
  let returnAt = 0; // when the runaway comes back after hopping off
  const visits = Math.max(1, readStats().visits || 1);
  const dodgeR = Math.max(DODGE_MIN_R, DODGE_R - (visits - 1) * DODGE_STEP);
  const carR = () => carLen * 0.42;
  const solid = () => walls.filter((w) => w.solid);

  function measure() {
    const cr = canvas.getBoundingClientRect();
    const rel = (el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - cr.left - WALL_PAD, t: r.top - cr.top - WALL_PAD, r: r.right - cr.left + WALL_PAD, b: r.bottom - cr.top + WALL_PAD };
    };
    const host = canvas.parentElement;
    walls = [
      ...host.querySelectorAll('.entrance__name, .entrance__line, .entrance__btn'),
      // Corner buttons, while they sit in their corners over the landing
      ...[...document.querySelectorAll('.sound-toggle, .mail-btn, .theme-toggle, .site-pill')].filter((el) => !el.closest('.hud')),
    ].map(rel);
    const roadW = document.querySelector('.scrollcar') ? 40 : 0;
    area = { l: EDGE, t: EDGE, r: W - EDGE - roadW, b: H - BOTTOM };
    // A wall with no car-sized gap on either side (the name on a phone) would cut
    // the play area in two: the car drives under it instead (canvas is behind the text)
    const fit = carR() * 2 + 8;
    for (const w of walls) w.solid = w.l - area.l >= fit || area.r - w.r >= fit;
  }

  function layout() {
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
    measure();
    if (!entered) {
      car.x = W * 0.5;
      car.y = area.b - 40;
    }
    // Window resized: bulbs move to the spots of the new layout (they are
    // placed round the name, which moved), so none is left off-screen
    if (ideas.length) {
      const list = spots().sort((p, q) => p[1] - q[1]);
      ideas.forEach((it, k) => {
        const sp = list[k];
        if (!sp) {
          it.gone = true;
          it.goneAt = performance.now();
          return;
        }
        [it.hx, it.hy, it.mirror] = sp;
        it.x = it.hx;
        it.y = it.hy;
        it.vx = it.vy = 0;
      });
    }
    // and the car stays inside the play area
    car.x = MathUtils.clamp(car.x, area.l + carR(), area.r - carR());
    car.y = MathUtils.clamp(car.y, area.t + carR(), area.b - carR());
  }

  /* ideas */
  const free = (x, y, gap) =>
    x > area.l + gap && x < area.r - gap && y > area.t + gap && y < area.b - gap &&
    walls.every((w) => x < w.l - gap || x > w.r + gap || y < w.t - gap || y > w.b + gap);

  // Ideas sit on fixed spots around the name, in 3 mirrored pairs, so every
  // wave looks the same and balanced: above the name, beside it, below the
  // button. Spots that do not fit (the sides on a phone) fall back to
  // spots further up or down. Pairs pop in top to bottom; both bulbs of a
  // pair bob and sway in step (sway mirrored).
  function spots() {
    const [n, , btn] = walls;
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
      if (free(mid - dx, y, 30) && free(mid + dx, y, 30)) out.push([mid - dx, y, 1], [mid + dx, y, -1]);
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
    // First round: no bulb is picked yet; the last one left becomes the runaway
    runaway = null;
    firstRound = !runawayDone && ideas.length === WAVE;
    waveBusy = false;
  }

  // The runaway looks like any other bulb until its first dodge
  function makeRunaway(it) {
    runaway = it;
    Object.assign(it, { waiting: false, eyes: null, wokeAt: 0, blinkAt: 0, winkUntil: 0, hop: null, nextDodge: 0, dodges: 0, lastDodge: 0 });
  }
  // ...when its eyes pop open (draw() springs them in)
  function openEyes(it, now) {
    if (it.eyes) return;
    it.eyes = addEyes(it.g);
    it.wokeAt = now;
    it.blinkAt = now + 2600;
  }

  // Runaway hops to the free spot farthest from the car, a short arc away.
  // Only while the car moves (a parked car never sets it off). Cornered (no
  // hop gains real distance, e.g. on a small phone landing): it leaves instead.
  function dodge(it, now, d) {
    const R = 170;
    let best = null;
    let bestD = -1;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = it.x + Math.cos(a) * R;
      const y = it.y + Math.sin(a) * R * 0.7;
      if (!free(x, y, 40)) continue;
      const d = Math.hypot(x - car.x, y - car.y);
      if (d > bestD) {
        bestD = d;
        best = [x, y];
      }
    }
    if (!best || bestD < d + 30) {
      escape(now);
      return;
    }
    openEyes(it, now);
    it.hop = { x0: it.x, y0: it.y, x1: best[0], y1: best[1], t0: now, ms: HOP_MS, lift: 46 };
    it.hx = best[0];
    it.hy = best[1];
    it.vx = it.vy = 0;
    it.nextDodge = now + DODGE_MS;
    it.lastDodge = now;
    it.dodges += 1;
    it.winkUntil = now + 700;
    shout(DODGE_LINES[Math.min(it.dodges, DODGE_LINES.length) - 1], now);
    sfx.thump();
  }

  // The car (the visitor) talks back: one line in its bubble for SHOUT_MS
  function shout(text, now) {
    if (!bubble) return;
    bubble.firstChild.textContent = text;
    bubble.classList.add('is-on');
    shoutUntil = now + SHOUT_MS;
  }

  // Done dodging, chase stopped, cornered, or the visitor scrolled: it hops
  // off the bottom of the landing (toward the games) and the car shouts after
  // it. No new round: after a while it comes back on its own (comeBack)
  function escape(now) {
    const it = runaway;
    if (!it || it.escaping) return;
    it.escaping = true;
    runawayDone = true;
    openEyes(it, now);
    it.hop = { x0: it.x, y0: it.y, x1: it.x + (it.x > W / 2 ? 60 : -60), y1: H + 140, t0: now, ms: ESCAPE_MS, lift: 120 };
    it.winkUntil = now + ESCAPE_MS;
    shout('Hey! Come back!', now);
    returnAt = now + ESCAPE_MS + RETURN_MS;
    setTimeout(() => {
      it.gone = true;
      it.goneAt = performance.now();
      it.pop = 0;
      if (runaway === it) runaway = null;
    }, ESCAPE_MS);
    wake();
  }

  // ...and back: it hops up from the bottom edge onto a free spot, eyes
  // open, and the chase can start again
  function comeBack(now) {
    returnAt = 0;
    const taken = ideas.filter((o) => !o.gone);
    const open = spots().filter(([x, y]) => free(x, y, 40) && taken.every((o) => Math.hypot(o.x - x, o.y - y) > 80) && Math.hypot(car.x - x, car.y - y) > dodgeR + 40);
    if (!open.length) {
      returnAt = now + 1500; // nowhere to land yet (car in the way): try again soon
      return;
    }
    const [x, y, mirror] = open[Math.floor(Math.random() * open.length)];
    const g = bulbModel();
    scene.add(g);
    const it = { g, x, y: H + 80, hx: x, hy: y, vx: 0, vy: 0, pop: 1, popV: 0, delay: now, phase: Math.random() * 6, mirror, gone: false, waiting: false };
    ideas.push(it);
    makeRunaway(it);
    openEyes(it, now);
    it.hop = { x0: x, y0: H + 80, x1: x, y1: y, t0: now, ms: ESCAPE_MS, lift: 120 };
    shout('There you are!', now);
    wake();
  }
  // Scrolled away without finishing the round: a random bulb wakes up and leaves
  window.addEventListener(
    'scroll',
    () => {
      if (!entered || !firstRound || runawayDone || window.scrollY <= 40) return;
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
    // First catch: the player knows how to drive, "Drive me to an idea" is done
    if (howTo) {
      howTo = false;
      if (!shoutUntil) bubble?.classList.remove('is-on');
    }
    // Every idea but one: that is the "Brainstorm" achievement now (no text,
    // no new round), and the one left becomes the runaway
    caught += 1;
    if (firstRound && caught === WAVE - 1) onWave?.();
    if (firstRound && !runaway) {
      const left = ideas.filter((o) => !o.gone);
      if (left.length === 1) makeRunaway(left[0]);
    }
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

  /* input: click the landing (not a link or button) and the car drives to
     that spot and parks, even after you let go. Hold and move and it
     follows. Touch works the same: tap, or tap and drag. */
  const GO_MS = 6000; // a target the car cannot reach is dropped after this
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const host = canvas.parentElement;
  host.addEventListener('pointerdown', (e) => {
    if (!entered || e.button > 0 || e.target.closest('a, button, input, .entrance__name')) return;
    const [x, y] = local(e);
    if (x < area.l || x > area.r || y < area.t || y > area.b) return;
    if (e.pointerType === 'mouse') e.preventDefault(); // no text selection while driving
    grab.x = x;
    grab.y = y;
    grab.on = true;
    grab.id = e.pointerId;
    grab.go = true;
    grab.goUntil = Infinity;
    // The player acted: a bulb that popped up under the parked car is fair game now
    ideas.forEach((it) => (it.waiting = false));
    pushed(performance.now());
  });
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!grab.on || e.pointerId !== grab.id) return;
      [grab.x, grab.y] = local(e);
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

  function pushed(now) {
    car.restAt = now;
    if (!shoutUntil) bubble?.classList.remove('is-on');
    wake();
  }

  /* routing while dragging: a wall between the car and the pointer? Take the
     shortest path over the wall corners (padded by the car size), recomputed
     every frame, and head for its first corner. Same geometry, same path: no
     dithering, and the car never stays pinned behind the name. */
  const hits = (ax, ay, bx, by, w, pad) => {
    // segment vs padded box (slab test)
    let t0 = 0;
    let t1 = 1;
    for (const [a, d, lo, hi] of [[ax, bx - ax, w.l - pad, w.r + pad], [ay, by - ay, w.t - pad, w.b + pad]]) {
      if (Math.abs(d) < 1e-6) {
        if (a < lo || a > hi) return false;
        continue;
      }
      let u = (lo - a) / d;
      let v = (hi - a) / d;
      if (u > v) [u, v] = [v, u];
      t0 = Math.max(t0, u);
      t1 = Math.min(t1, v);
      if (t0 > t1) return false;
    }
    return true;
  };
  function route(goal) {
    const pad = carR() * 0.9;
    const ws = solid();
    const start = { x: car.x, y: car.y };
    // From the car itself use half the pad: a car touching a wall sits inside the full pad
    const clear = (a, b) => ws.every((w) => !hits(a.x, a.y, b.x, b.y, w, a === start ? pad * 0.5 : pad));
    if (clear(start, goal)) return { x: goal.x, y: goal.y, len: Math.hypot(goal.x - car.x, goal.y - car.y) };
    const m = carR() + 14;
    const r = carR();
    const nodes = [start];
    for (const w of ws) {
      for (const [cx, cy] of [[w.l - m, w.t - m], [w.r + m, w.t - m], [w.l - m, w.b + m], [w.r + m, w.b + m]]) {
        // A corner past the play-area edge (narrow window) moves inside it,
        // so the gap between the name and the edge still counts as a way round
        const x = MathUtils.clamp(cx, area.l + r, area.r - r);
        const y = MathUtils.clamp(cy, area.t + r, area.b - r);
        if (ws.every((o) => x < o.l - pad || x > o.r + pad || y < o.t - pad || y > o.b + pad)) nodes.push({ x, y });
      }
    }
    nodes.push(goal);
    // Dijkstra over a tiny graph (under 30 nodes)
    const n = nodes.length;
    const dist = new Array(n).fill(Infinity);
    const prev = new Array(n).fill(-1);
    const done = new Array(n).fill(false);
    dist[0] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === n - 1) break;
      done[u] = true;
      for (let v = 1; v < n; v++) {
        if (done[v]) continue;
        const d = dist[u] + Math.hypot(nodes[v].x - nodes[u].x, nodes[v].y - nodes[u].y);
        if (d < dist[v] && clear(nodes[u], nodes[v])) {
          dist[v] = d;
          prev[v] = u;
        }
      }
    }
    if (dist[n - 1] === Infinity) return { x: goal.x, y: goal.y, len: Math.hypot(goal.x - car.x, goal.y - car.y) };
    let v = n - 1;
    while (prev[v] > 0) v = prev[v];
    return { x: nodes[v].x, y: nodes[v].y, len: dist[n - 1] };
  }

  // Pointer on a wall: aim for its nearest edge instead
  function dragGoal() {
    const r = carR();
    let x = MathUtils.clamp(grab.x, area.l + r, area.r - r);
    let y = MathUtils.clamp(grab.y, area.t + r, area.b - r);
    for (const w of solid()) {
      if (x > w.l && x < w.r && y > w.t && y < w.b) {
        const d = [x - w.l, w.r - x, y - w.t, w.b - y];
        const m = Math.min(...d);
        if (m === d[0]) x = w.l - r;
        else if (m === d[1]) x = w.r + r;
        else if (m === d[2]) y = w.t - r;
        else y = w.b + r;
      }
    }
    return { x, y };
  }

  /* physics step */
  function step(dt, now) {
    const j = juicy();
    const maxV = reducedMotion() ? MAX_SPEED * 0.5 : MAX_SPEED;

    // Dragging: the car chases the pointer with a stiff spring on its speed,
    // so it still turns, drifts and bumps like a car instead of sticking to it
    // Driving: steer toward the target (round the walls) and give gas along
    // the heading, so a target behind it makes it swing round and drive
    // forward, never back. Steering scales with speed: a nearly still car
    // cannot turn, so it never spins on the spot. Inside the park zone round
    // the target it neither steers nor drives, it brakes and parks.
    if (grab.go && !grab.on && now > grab.goUntil) grab.go = false;
    const driving = grab.on || grab.go;
    if (driving) {
      const wp = route(dragGoal());
      const dx = wp.x - car.x;
      const dy = wp.y - car.y;
      const near = Math.hypot(dx, dy);
      const park = carLen * STOP_R;
      const hx0 = Math.cos(car.h);
      const hy0 = Math.sin(car.h);
      const fwd0 = car.vx * hx0 + car.vy * hy0;
      let sp = 0;
      if (wp.len > park) {
        const turn = angleTo(car.h, Math.atan2(dy, dx));
        const rate = TURN * MathUtils.clamp(Math.abs(fwd0) / 160, TURN_SLOW, 1);
        car.h += MathUtils.clamp(turn, -rate * dt, rate * dt);
        sp = Math.min(maxV, (wp.len - park) * FOLLOW + 60); // whole path length: no braking at corners
        // Sharp turn: slow to a speed whose turning circle fits, so it
        // pivots onto the cursor instead of circling it
        if (Math.abs(turn) > SHARP) sp = Math.min(sp, Math.max(140, TURN * near * 0.45));
        // Facing away: keep rolling forward slowly while it turns round
        sp *= Math.max(0.35, Math.cos(Math.min(Math.abs(turn), Math.PI / 2)));
      }
      const hx = Math.cos(car.h);
      const hy = Math.sin(car.h);
      const fwd = car.vx * hx + car.vy * hy;
      // Gas or brake along the heading only; sideways slip is left to the grip (drift)
      const dv = (sp - fwd) * (1 - Math.exp(-(sp > fwd ? FOLLOW_GRIP : FOLLOW_GRIP * 1.6) * dt));
      car.vx += hx * dv;
      car.vy += hy * dv;
      car.restAt = now;
      // Parked on a released target: the trip is done
      if (!grab.on && wp.len <= park && Math.abs(fwd) < 15) grab.go = false;
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

    // "Drive me to an idea" (until the first catch) hides while the car rolls
    // and comes back once it has rested a moment; a shout stays up its full time
    if (vNow > 15) {
      car.restAt = now;
      if (!shoutUntil) bubble?.classList.remove('is-on');
    } else if (bubble && entered && howTo && !shoutUntil && now - car.restAt > BUBBLE_REST_MS) bubble.classList.add('is-on');

    // Collisions: walls (keep out) and the play area (keep in)
    const r = carR();
    for (const w of solid()) {
      const qx = MathUtils.clamp(car.x, w.l, w.r);
      const qy = MathUtils.clamp(car.y, w.t, w.b);
      let nx = car.x - qx;
      let ny = car.y - qy;
      const d = Math.hypot(nx, ny);
      if (d >= r) continue;
      if (d < 1e-3) {
        nx = 0;
        ny = car.y < (w.t + w.b) / 2 ? -1 : 1;
      } else {
        nx /= d;
        ny /= d;
      }
      car.x = qx + nx * r;
      car.y = qy + ny * r;
      const vn = car.vx * nx + car.vy * ny;
      if (vn < 0) {
        car.vx -= (1 + BOUNCE) * vn * nx;
        car.vy -= (1 + BOUNCE) * vn * ny;
        bounceNose(nx, ny);
        if (-vn > 90) bump(nx, ny, -vn, now);
      }
    }
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
      const vn = car.vx * nx + car.vy * ny;
      if (vn < 0) {
        car.vx -= (1 + BOUNCE) * vn * nx;
        car.vy -= (1 + BOUNCE) * vn * ny;
        bounceNose(nx, ny);
        if (-vn > 90) bump(nx, ny, -vn, now);
      }
    }

    // Ideas: drift toward a close car, caught inside the pickup radius
    for (const it of ideas) {
      if (it.gone || now < it.delay) continue;
      const dx = car.x - it.x;
      const dy = car.y - it.y;
      const d = Math.hypot(dx, dy);
      // The runaway never drifts in and is never caught: it hops away instead
      if (it === runaway) {
        if (it.hop) {
          const k = Math.min(1, (now - it.hop.t0) / it.hop.ms);
          it.x = MathUtils.lerp(it.hop.x0, it.hop.x1, k);
          it.y = MathUtils.lerp(it.hop.y0, it.hop.y1, k);
          if (k >= 1 && !it.escaping) it.hop = null;
        } else if (!it.escaping) {
          const chased = d < dodgeR && now >= it.nextDodge && Math.hypot(car.vx, car.vy) > 40;
          if (chased && it.dodges >= DODGES) escape(now);
          else if (chased) dodge(it, now, d);
          else if (it.lastDodge && now - it.lastDodge > IDLE_ESCAPE_MS) escape(now);
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
    // The runaway has been gone a while: it comes back (only runs while the
    // landing is on screen, so a visitor who scrolls back up sees it return)
    if (runawayDone && !runaway && returnAt && now > returnAt) comeBack(now);
  }

  /* 2D layer: marks, smoke, rings */
  function drawFx(now, dt) {
    fx.clearRect(0, 0, W, H);
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
  function drawRunaway(it, now, j, bob, bs) {
    let lift = 0;
    let sx = 1;
    let sy = 1;
    if (it.hop && j) {
      const k = Math.min(1, (now - it.hop.t0) / it.hop.ms);
      const s = Math.sin(k * Math.PI);
      const ground = k < 0.12 || k > 0.88;
      lift = s * it.hop.lift;
      sx = 1 - s * 0.12 + (ground ? 0.12 : 0);
      sy = 1 + s * 0.16 - (ground ? 0.14 : 0);
    }
    toWorld(it.x, it.y + bob - lift, wp);
    it.g.position.copy(wp);
    const base = bs * Math.max(it.pop, 0);
    it.g.scale.set(base * sx, base * sy, base);
    if (!it.eyes) return;
    const open = j ? elasticOut(Math.min(1, (now - it.wokeAt) / 450)) : 1;
    if (now > it.blinkAt + 130) it.blinkAt = now + 2600 + Math.random() * 2400;
    const blink = j && now > it.blinkAt ? 0.12 : 1;
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
      if (it === runaway) drawRunaway(it, now, j, bob, bs);
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
  const paintCar = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    carBodyMat.color.set(dark ? 0xf2ede2 : INK);
    rayMat.color.set(dark ? 0xf2ede2 : INK);
    readColours();
  };
  paintCar();
  window.addEventListener('themechange', () => {
    paintCar();
    wake();
  });

  /* loop: sleeps when nothing moves and nothing is animating */
  let raf = 0;
  let last = 0;
  let inView = true;
  let measuredAt = 0;
  function frame(t) {
    const dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    if (t - measuredAt > 250) {
      measure(); // walls move with the landing's parallax
      measuredAt = t;
    }
    if (t >= frozenUntil) step(dt, t);
    draw(t, dt);
    raf = inView && !document.hidden ? requestAnimationFrame(frame) : 0;
  }
  function wake() {
    if (raf || !inView || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    wake();
  }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('resize', () => {
    layout();
    wake();
  });

  layout();
  wake();

  // Test hook: ?debug exposes the game state (headless tests only)
  if (new URLSearchParams(location.search).has('debug')) {
    window.__landing = { car, ideas: () => ideas, walls: () => walls, area: () => area, canvas, fxCounts: () => [marks[0].length + marks[1].length, puffs.length, rings.length], goal: () => dragGoal(), runaway: () => runaway, firstRound: () => firstRound, dodgeR };
  }

  return {
    enter() {
      entered = true;
      measure();
      // Car drops in at the bottom centre, then the first wave pops in
      // Start on the centre line (the name's and the bulbs' mirror axis), at
      // the bottom of the play area
      car.x = W / 2;
      car.y = area.b - carR() - 10;
      car.h = -Math.PI / 2;
      if (juicy()) car.popV = 6;
      setTimeout(spawnWave, 350);
      // How to play: over the car whenever it rests (also carries the "Hey! Come back!" shout)
      if (!bubble) {
        bubble = document.createElement('span');
        bubble.className = 'car-bubble';
        bubble.setAttribute('aria-hidden', 'true');
        bubble.innerHTML = '<span>Drive me to an idea</span>';
        canvas.parentElement.append(bubble);
      }
      car.restAt = performance.now() - BUBBLE_REST_MS + 900; // bubble pops up just after the car lands
      wake();
    },
  };
}
