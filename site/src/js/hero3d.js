// Landing mini-game in three.js: the red toy car (seen from above, slightly
// tilted) sits on the landing with a "Drive me to an idea" bubble (until the
// first catch, or until the runaway first shows itself). Click anywhere on the landing and the car drives there and
// parks (turning, drifting, leaving tyre marks and a smoke trail); hold and
// move and it follows. WASD or the arrow keys drive it the way they point.
// It catches the ideas (lightbulbs) that pop up on fixed spots around the
// name. The name, the line and the button are walls: the car drives round
// them and bounces off if it clips one.
//
// The runaway idea: there is one round of 6 (4 or 2 when the screen is too
// short for the rest). Catch them in any order; the
// last one left will not be caught. When the car comes close it opens its
// eyes and hops away (a little closer each visit, never close enough) while
// the car reacts ("What the…!", "Hold still!", "Seriously?!"). After 3
// dodges, or once the chase stops, it hops off down the page to the Featured
// heading ("Hey! Come back!"). A visitor who scrolls without playing sees a
// random bulb wake up and hop off the same way.
// Chase mode: from then on the canvases cover the screen (fixed, clicks pass
// through) and the landing's bottom edge is open, so the car can follow it
// down the page; the screen scrolls along while the car is driven. Come close
// and it hops on to the next stop (All games heading, the footer, then back
// to the landing); stop chasing whenever you like. Seen from the landing
// while it waits off screen, it comes back by itself ("There you are!").
// Once it and the car are both back on the landing, chase mode ends.
// Rest when you rest: the visitor stops (no input for REST_MS) and the
// runaway sneaks up on the parked car, closer than a chase ever gets it; the
// car reaching for it sets it off only at the last moment ("So close!").
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
import { REST_MS, landingHolds, stillFor } from './rest.js';
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
const WALL_PAD = 10;
const BOUNCE = 0.45;
const SOFT_HIT = 260; // px/s into a wall: slower slides along it, faster bounces off (with the thump)
// Driving round the walls (autopilot to a clicked spot)
const ROUTE_PAD = 1.15; // car radii: a path keeps this far from walls (contact is at 1)
const CORNER_GAP = 26; // px past the car's radius: where corner waypoints sit
const BRAKE = 1800; // px/s²: braking it plans for before a corner
const CORNER_V = 240; // px/s through a right-angle corner (straight on: full speed)
const LOOK = 0.9; // car lengths before a corner: starts turning toward the next waypoint
const GOAL_GAP = 12; // px: a spot next to a wall or the edge parks this far off it
const HIT_STOP_MS = 55;
const SHAKE_MS = 200;
const WAVE = 6;
const PICK_R = 46; // generous pickup radius
const MAGNET_R = 110; // ideas drift toward a car this close
const EDGE = 16; // play area inset from the canvas edges
const BOTTOM = 84; // keep clear of the bottom corner buttons
const RETURN_MS = 6000; // the runaway comes back this long after hopping off
const DODGE_LINES = ['What the…!', 'Hold still!', 'Seriously?!']; // the car, at dodge 1, 2, 3
const CHASE_LINES = ['Not again!', 'Wait up!', 'Hey! Come back!']; // the car, as the runaway flees on down the page
const CAM_LO = 0.3; // chasing on the page: the screen scrolls to keep the car
const CAM_HI = 0.68; // ...between these shares of its height
const STOP_GAP = 70; // px from a heading's text to the runaway waiting beside it
const HEADLIGHT = 'rgba(236, 255, 190, 0.2)'; // dark mode: light on the ground, at the headlights
const HEADLIGHT_LEN = 2.2; // ...reaching this many car lengths ahead
const DODGE_R = 150; // runaway hops away when the car is this close (first visit)
const DODGE_STEP = 12; // ...and lets it this much closer each later visit
const DODGE_MIN_R = 95; // never closer than this (catching needs PICK_R + a bit)
const DODGE_MS = 600; // shortest time between two dodges: no jitter
const DODGES = 3; // dodges before it hops off for good
const IDLE_ESCAPE_MS = 8000; // chase stopped this long after a dodge: it leaves
const HOP_MS = 420; // one dodge hop
const ESCAPE_MS = 900; // the hop off the landing
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
  const grab = { x: 0, y: 0, on: false, id: -1, go: false, goUntil: 0, auto: false };
  let walls = []; // {l, t, r, b} in canvas px
  let homeWalls = []; // the same at rest (scrolled to the top, no parallax): where bulbs go
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
  let howTo = true; // "Drive me to an idea" until the first catch or the runaway's first move
  let caught = 0;
  let returnAt = 0; // when the runaway comes back after hopping off
  // Chase mode: canvases fixed over the screen, canvas px = screen px, and
  // everything on the page moves up as the page scrolls down (lastScroll)
  let out = false;
  let lastScroll = 0;
  let camAt = 0; // the screen last scrolled along with the car
  let dark = false;
  let played = false; // the visitor has driven the car: a skimmer gets no chase
  const html = document.documentElement;
  const host = canvas.parentElement; // the landing
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
      // Corner buttons, while they sit in their corners over the landing
      // (in chase mode they stay put on the screen while the page moves: not walls)
      ...(out ? [] : [...document.querySelectorAll('.sound-toggle, .mail-btn, .theme-toggle, .site-pill')].filter((el) => !el.closest('.hud'))),
    ];
    walls = els.map(rel);
    homeWalls = els.map((el, i) => home(el, walls[i]));
    const roadW = document.querySelector('.scrollcar') ? 40 : 0;
    // Chase mode: from the landing's top to the bottom of the page
    const hr = host.getBoundingClientRect();
    area = out
      ? { l: EDGE, t: hr.top + EDGE, r: W - EDGE - roadW, b: html.scrollHeight - scrollY - EDGE }
      : { l: EDGE, t: EDGE, r: W - EDGE - roadW, b: H - BOTTOM };
    // A wall without a comfortable gap on either side (the name on a phone or
    // a mid-size window) would cut the play area in two, or leave a slot the
    // car only scrapes through: the car drives under it instead (canvas is
    // behind the text)
    const fit = carR() * 2 + 48;
    for (const w of walls) w.solid = w.l - area.l >= fit || area.r - w.r >= fit;
  }

  // keep: a switch in or out of chase mode (same page, new canvas size): the
  // bulbs stay where they are
  function layout(keep = false) {
    const wasW = W;
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
    // Window got wider or narrower: the name re-flowed, so bulbs move to the
    // spots of the new layout, top to bottom. A height-only change (a phone's
    // address bar hiding while scrolling) keeps them where they are. No bulb is
    // ever dropped: with fewer spots than bulbs, the rest stay put inside the
    // play area. A hopping or escaping runaway finishes its hop first.
    if (ideas.length && Math.abs(W - wasW) > 1 && !keep) {
      const list = spots().sort((p, q) => p[1] - q[1]);
      const live = ideas.filter((it) => !it.gone && !it.hop && !it.escaping && it.stop === undefined).sort((p, q) => p.hy - q.hy);
      live.forEach((it, k) => {
        const sp = list[k];
        if (sp) [it.hx, it.hy, it.mirror] = sp;
        else {
          it.hx = MathUtils.clamp(it.hx, area.l + 40, area.r - 40);
          it.hy = MathUtils.clamp(it.hy, area.t + 40, area.b - 40);
        }
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
  const free = (x, y, gap, ws = walls) =>
    x > area.l + gap && x < area.r - gap && y > area.t + gap && y < area.b - gap &&
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
    Object.assign(it, { waiting: false, eyes: null, wokeAt: 0, blinkAt: 0, winkUntil: 0, hop: null, nextDodge: 0, dodges: 0, lastDodge: 0 });
  }
  // ...when its eyes pop open (draw() springs them in)
  function openEyes(it, now) {
    howTo = false; // the joke has started: no "Drive me to an idea" after this
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
    it.winkUntil = now + 700;
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

  // Rest when you rest: the visitor has stopped and the car is parked, so the
  // runaway sneaks up on it in small hops and stops just short (CREEP_GAP)
  function creep(it, now, d) {
    if (stillFor() < REST_MS || !landingHolds() || Math.hypot(car.vx, car.vy) > 5) return;
    it.calmAt = now; // no idle escape while the visitor rests
    if (d <= CREEP_GAP + 4 || now < (it.nextCreep || 0)) return;
    // Straight at the car, or round a wall at an angle while that still gets
    // it closer; boxed in: it waits where it is
    const step = Math.min(CREEP_STEP, d - CREEP_GAP);
    const a0 = Math.atan2(car.y - it.y, car.x - it.x);
    let x = 0;
    let y = 0;
    const ok = [0, 0.6, -0.6, 1.1, -1.1].some((da) => {
      x = it.x + Math.cos(a0 + da) * step;
      y = it.y + Math.sin(a0 + da) * step;
      return free(x, y, 30) && Math.hypot(car.x - x, car.y - y) < d - 4;
    });
    if (!ok) return;
    openEyes(it, now);
    it.crept = true;
    it.nextCreep = now + CREEP_MS;
    it.hop = { x0: it.x, y0: it.y, x1: x, y1: y, t0: now, ms: 320, lift: 14 };
    it.hx = x;
    it.hy = y;
  }

  // The car (the visitor) talks back: one line in its bubble for SHOUT_MS
  function shout(text, now) {
    if (!bubble) return;
    bubble.firstChild.textContent = text;
    bubble.classList.add('is-on');
    shoutUntil = now + SHOUT_MS;
  }

  // Done dodging, chase stopped, cornered, or the visitor scrolled: it hops
  // off the landing down to the Featured heading (chase mode: the car may
  // follow) and the car shouts after it. A skimmer who never drove, or a page
  // without chase stops: off the bottom edge, and after a while it comes back
  // on its own (comeBack)
  function escape(now) {
    const it = runaway;
    if (!it || it.escaping || it.stop !== undefined) return;
    if (stopEls.length && played) {
      runawayDone = true;
      openEyes(it, now);
      shout('Hey! Come back!', now);
      goOut();
      flee(it, now, 0);
      return;
    }
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

  /* chase mode */

  // Stops down the home page: beside the Featured and All games headings'
  // text, then the footer line (above the text when there is no room beside)
  const stopEls = ['#featured-title', '#games-title', '.site-foot__note'].map((s) => document.querySelector(s)).filter(Boolean);
  const range = document.createRange();
  function stopPos(k) {
    range.selectNodeContents(stopEls[k]);
    const r = range.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    if (r.right + STOP_GAP + 40 <= cr.right - EDGE) return [r.right + STOP_GAP - cr.left, r.top + r.height / 2 - cr.top];
    return [Math.min(r.left + r.width / 2 + 40, cr.right - 60) - cr.left, r.top - 46 - cr.top];
  }

  // Everything in canvas px moves together: switching the canvas between the
  // landing and the screen, or the page scrolling under a fixed canvas
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
  function goOut() {
    if (out) return;
    const r = host.getBoundingClientRect();
    out = true;
    html.classList.add('car-out');
    if (bubble) document.body.append(bubble);
    lastScroll = scrollY;
    shiftAll(r.left, r.top);
    layout(true);
    wake();
  }
  function goHome() {
    if (!out) return;
    const r = host.getBoundingClientRect();
    out = false;
    html.classList.remove('car-out', 'runaway-shown');
    if (bubble) host.append(bubble);
    shiftAll(-r.left, -r.top);
    layout(true);
  }

  // The runaway hops to stop k and waits there (the hop ends on the stop
  // even as the page scrolls); past the last stop it heads back to the landing
  function flee(it, now, k) {
    if (k >= stopEls.length) return homeRun(it, now);
    const [x, y] = stopPos(k);
    Object.assign(it, { stop: k, stopAt: now, hx: x, hy: y, vx: 0, vy: 0, winkUntil: now + 700, nextDodge: now + DODGE_MS * 2, crept: false });
    it.hop = { x0: it.x, y0: it.y, x1: x, y1: y, t0: now, ms: MathUtils.clamp(500 + Math.abs(y - it.y) * 0.45, 700, 1400), lift: 150 };
    sfx.thump();
    wake();
  }

  // ...and back onto a free spot on the landing ("There you are!"), where the
  // chase starts over: dodges, then off down the page again
  function homeRun(it, now) {
    const taken = ideas.filter((o) => !o.gone && o !== it);
    const open = spots().filter(([x, y]) => free(x, y, 40) && taken.every((o) => Math.hypot(o.x - x, o.y - y) > 80) && Math.hypot(car.x - x, car.y - y) > dodgeR + 40);
    if (!open.length) {
      it.stopAt = now; // car in the way: try again in a while
      return;
    }
    const [x, y, mirror] = open[Math.floor(Math.random() * open.length)];
    Object.assign(it, { stop: undefined, hx: x, hy: y, mirror, dodges: 0, lastDodge: 0, calmAt: now, nextDodge: now + DODGE_MS, winkUntil: now + 700 });
    it.hop = { x0: it.x, y0: it.y, x1: x, y1: y, t0: now, ms: 1100, lift: 160 };
    shout('There you are!', now);
    wake();
  }

  // Chase mode, per frame: follow the page's scroll, re-measure (the walls
  // move on the screen), bring the car back to a visitor who returned to the
  // landing without it, and end chase mode once the runaway and the car are
  // both back on the landing
  function chaseFrame(now) {
    if (scrollY !== lastScroll) {
      shiftAll(0, lastScroll - scrollY);
      lastScroll = scrollY;
    }
    measure();
    if (camAt && now - camAt > 400) {
      camAt = 0;
      html.classList.remove('car-cam');
    }
    // Left parked down the page: it drives back in from the bottom edge of
    // the screen to the bottom of the landing
    if (onLanding() && !carOnScreen() && !held.size && !grab.on && !grab.go) {
      const r = host.getBoundingClientRect();
      Object.assign(car, { x: W / 2, y: H + carR() + 10, vx: 0, vy: 0, h: -Math.PI / 2 });
      driveTo(W / 2, Math.min(H, r.bottom) - BOTTOM - carR() - carLen * STOP_R - 20, false, -1, true);
    }
    const it = runaway;
    // Tells shelfbulb.js and rest.js the runaway is on the screen out on the
    // page, so theirs keep away: one runaway on the screen at a time
    html.classList.toggle('runaway-shown', !!it && it.y > -60 && it.y < H + 60);
    if (it && it.stop === undefined && !it.hop) {
      const r = host.getBoundingClientRect();
      if (car.y > r.top + EDGE && car.y < r.bottom - BOTTOM) goHome(); // the landing then nudges it fully inside
    }
  }

  // ...and back: it hops up from the bottom edge onto a free spot, eyes
  // open, and the chase can start again
  function comeBack(now) {
    // rest.js's runaway is on screen (visitor resting beside the page): wait
    if (document.querySelector('.rest-layer .bulb')) {
      returnAt = now + 1500;
      return;
    }
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
  // A skimmer (scrolled away without catching anything): a random bulb wakes
  // up and leaves. Someone who has played keeps the round as it is.
  window.addEventListener(
    'scroll',
    () => {
      if (!entered || !firstRound || runawayDone || caught || window.scrollY <= 40) return;
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

  // Touching a wall or the edge (normal nx, ny pointing away from it): a slow
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

  /* input: click the landing (not a link or button) and the car drives to
     that spot and parks, even after you let go. Hold and move and it
     follows. Touch works the same: tap, or tap and drag. */
  const GO_MS = 6000; // a target the car cannot reach is dropped after this
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
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
    grab.auto = false;
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

  // Chase mode: click an empty bit of the page (not a link, button, picture,
  // text or game) and the car drives there; hold and move and it follows.
  // Touch: a tap (not the start of a scroll) sends it there.
  const empty = (t) => !t.closest?.('a, button, input, textarea, select, label, summary, [role="button"], img, video, iframe, h1, h2, h3, p, li, figure, .banner, .shelf__item, .shelf__slot, .entrance, .hud, .scrollcar');
  let downType = '';
  // auto: the car drives itself (back to the landing): the screen does not follow
  const driveTo = (x, y, hold, id, auto = false) => {
    Object.assign(grab, { x, y, on: hold, id, go: true, goUntil: hold ? Infinity : performance.now() + GO_MS, auto });
    pushed(performance.now());
  };
  document.addEventListener('pointerdown', (e) => {
    downType = e.pointerType;
    if (!out || e.pointerType !== 'mouse' || e.button > 0 || !empty(e.target)) return;
    e.preventDefault();
    driveTo(e.clientX, e.clientY, true, e.pointerId);
  });
  document.addEventListener('click', (e) => {
    if (out && downType !== 'mouse' && empty(e.target)) driveTo(e.clientX, e.clientY, false, -1);
  });

  /* input: keys. WASD or the arrows drive the car the way they point on the
     screen (up = up the page; two keys = a diagonal) while the landing fills
     the middle of the screen (chase mode: while the car is on the screen).
     The arrows then drive instead of scrolling. */
  const held = new Set();
  const onLanding = () => {
    const r = host.getBoundingClientRect();
    return r.top < innerHeight / 2 && r.bottom > innerHeight / 2;
  };
  const carOnScreen = () => car.x > 0 && car.x < W && car.y > 0 && car.y < H;
  window.addEventListener('keydown', (e) => {
    if (!entered || !KEY_DIRS[e.code] || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || (!held.size && !(out ? carOnScreen() : onLanding()))) return;
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

  function pushed(now) {
    played = true;
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
    const pad = carR() * ROUTE_PAD;
    const ws = solid();
    const start = { x: car.x, y: car.y };
    // From the car itself use half the pad: a car touching a wall sits inside the full pad
    const clear = (a, b) => ws.every((w) => !hits(a.x, a.y, b.x, b.y, w, a === start ? pad * 0.5 : pad));
    if (clear(start, goal)) return { x: goal.x, y: goal.y, len: Math.hypot(goal.x - car.x, goal.y - car.y), next: null };
    const m = carR() + CORNER_GAP;
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
    // No way to the goal (boxed in, or a gap too narrow on this screen): head
    // for the reachable corner nearest to it instead of ramming the wall
    let end = n - 1;
    if (dist[end] === Infinity) {
      end = -1;
      for (let i = 1; i < n - 1; i++) {
        if (dist[i] === Infinity) continue;
        if (end < 0 || Math.hypot(nodes[i].x - goal.x, nodes[i].y - goal.y) < Math.hypot(nodes[end].x - goal.x, nodes[end].y - goal.y)) end = i;
      }
      if (end < 0) return { x: car.x, y: car.y, len: 0, next: null };
    }
    const path = [];
    for (let v = end; v > 0; v = prev[v]) path.unshift(nodes[v]);
    return { x: path[0].x, y: path[0].y, len: dist[end], next: path[1] || null };
  }

  // Free run (px) from the car along a direction before it would touch a
  // solid wall or the play-area edge
  function runTo(dx, dy) {
    const r = carR();
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (area.r - r - car.x) / dx);
    if (dx < 0) t = Math.min(t, (area.l + r - car.x) / dx);
    if (dy > 0) t = Math.min(t, (area.b - r - car.y) / dy);
    if (dy < 0) t = Math.min(t, (area.t + r - car.y) / dy);
    for (const w of solid()) {
      let t0 = 0;
      let t1 = Infinity;
      for (const [a, d, lo, hi] of [[car.x, dx, w.l - r, w.r + r], [car.y, dy, w.t - r, w.b + r]]) {
        if (Math.abs(d) < 1e-6) {
          if (a < lo || a > hi) t0 = Infinity;
          continue;
        }
        let u = (lo - a) / d;
        let v = (hi - a) / d;
        if (u > v) [u, v] = [v, u];
        t0 = Math.max(t0, u);
        t1 = Math.min(t1, v);
      }
      if (t0 <= t1 && t0 < t) t = t0;
    }
    return Math.max(0, t);
  }

  // Gas or brake toward speed sp along the heading only (sideways slip is
  // left to the grip: drift), never faster than it can slow to a soft touch
  // before the wall or edge it is moving toward (a target flipped behind it,
  // a drift, a corner cut). Returns the forward speed before the change.
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

  // Pointer on a wall: aim for its nearest edge instead
  function dragGoal() {
    const r = carR() + GOAL_GAP;
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
    const aim = keyAim();
    const driving = grab.on || grab.go || aim !== null;
    let rounding = false; // on a path round a wall: less drift
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
      const wp = route(dragGoal());
      rounding = !!wp.next;
      // Aim: the waypoint, easing toward the next one as the corner nears,
      // so the turn starts before the corner instead of at it
      let ax = wp.x;
      let ay = wp.y;
      const toWp = Math.hypot(wp.x - car.x, wp.y - car.y);
      if (wp.next) {
        const sx = wp.next.x - wp.x;
        const sy = wp.next.y - wp.y;
        const sl = Math.hypot(sx, sy) || 1;
        const k = MathUtils.clamp(1 - toWp / (carLen * LOOK), 0, 1) * Math.min(carLen * 0.6, sl);
        ax += (sx / sl) * k;
        ay += (sy / sl) * k;
      }
      const dx = ax - car.x;
      const dy = ay - car.y;
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
        // Corner ahead: brake in time to take it at a speed that fits the bend
        if (wp.next) {
          const bend = Math.abs(angleTo(Math.atan2(wp.y - car.y, wp.x - car.x), Math.atan2(wp.next.y - wp.y, wp.next.x - wp.x)));
          const vc = MathUtils.lerp(maxV, CORNER_V, Math.min(1, bend / (Math.PI / 2)));
          sp = Math.min(sp, Math.sqrt(vc * vc + 2 * BRAKE * Math.max(0, toWp - carLen * 0.3)));
        }
      }
      const fwd = gas(sp, dt);
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
    side *= Math.exp(-(j ? (driving ? (rounding ? GRIP * 2 : GRIP) : GRIP * 2.5) : GRIP * 3) * dt); // released: tyres grip, drift ends fast
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

    // Chase mode: the screen scrolls along while the car is driven (never for
    // a parked car), keeping it between CAM_LO and CAM_HI of the height. The
    // car then moves up the canvas with the page (chaseFrame).
    if (out && driving && !(grab.go && grab.auto && !held.size)) {
      const over = car.y > H * CAM_HI ? car.y - H * CAM_HI : car.y < H * CAM_LO ? car.y - H * CAM_LO : 0;
      const to = MathUtils.clamp(Math.round(scrollY + over * Math.min(1, 9 * dt)), 0, html.scrollHeight - innerHeight);
      if (to !== Math.round(scrollY)) {
        html.classList.add('car-cam'); // tells snap.js to leave the page where the car takes it
        camAt = now;
        window.scrollTo({ top: to, behavior: 'instant' });
      }
    }

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
      hit(nx, ny, now);
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
      hit(nx, ny, now);
    }

    // Ideas: drift toward a close car, caught inside the pickup radius
    for (const it of ideas) {
      if (it.gone || now < it.delay) continue;
      const dx = car.x - it.x;
      const dy = car.y - it.y;
      const d = Math.hypot(dx, dy);
      // Chase mode, the runaway at a stop on the page: the car coming close
      // sends it on to the next one; seen from the landing while it waits off
      // screen, it comes back by itself after a while
      if (it === runaway && it.stop !== undefined) {
        [it.hx, it.hy] = stopPos(it.stop);
        if (it.hop) {
          it.hop.x1 = it.hx;
          it.hop.y1 = it.hy;
          const k = Math.min(1, (now - it.hop.t0) / it.hop.ms);
          it.x = MathUtils.lerp(it.hop.x0, it.hop.x1, k);
          it.y = MathUtils.lerp(it.hop.y0, it.hop.y1, k);
          if (k >= 1) it.hop = null;
        } else {
          it.x = it.hx;
          it.y = it.hy;
          if (d < dodgeR && now >= it.nextDodge && Math.hypot(car.vx, car.vy) > 40) {
            it.flees = (it.flees || 0) + 1;
            shout(CHASE_LINES[(it.flees - 1) % CHASE_LINES.length], now);
            flee(it, now, it.stop + 1);
          } else if (onLanding() && (it.y < -60 || it.y > H + 60) && now - it.stopAt > RETURN_MS) homeRun(it, now);
        }
        continue;
      }
      // The runaway never drifts in and is never caught: it hops away instead
      if (it === runaway) {
        if (it.hop) {
          const k = Math.min(1, (now - it.hop.t0) / it.hop.ms);
          it.x = MathUtils.lerp(it.hop.x0, it.hop.x1, k);
          it.y = MathUtils.lerp(it.hop.y0, it.hop.y1, k);
          if (k >= 1 && !it.escaping) it.hop = null;
        } else if (!it.escaping) {
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
          if (!it.hop && !it.escaping) creep(it, now, d);
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
    // Tells rest.js a runaway is on the landing, so it keeps its own away
    // (chase mode: the canvas covers the screen, so only while it is on it)
    canvas.toggleAttribute('data-runaway', !!runaway && !runaway.gone && (!out || html.classList.contains('runaway-shown')));

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
  let inView = true;
  let measuredAt = 0;
  function frame(t) {
    const dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    if (out) chaseFrame(t);
    else if (t - measuredAt > 250) {
      measure(); // walls move with the landing's parallax
      measuredAt = t;
    }
    if (t >= frozenUntil) step(dt, t);
    draw(t, dt);
    // Chase mode: the canvas always covers the screen, so instead the loop
    // sleeps while nothing of the game is on it (car, runaway, smoke), the car
    // is still and the landing is out of view; a scroll or any input wakes it
    const idle =
      out && !carOnScreen() && !(runaway && (runaway.hop || (runaway.y > -80 && runaway.y < H + 80))) && !onLanding() &&
      !puffs.length && !rings.length && !held.size && !grab.go && Math.hypot(car.vx, car.vy) < 1;
    raf = inView && !document.hidden && !idle ? requestAnimationFrame(frame) : 0;
  }
  window.addEventListener('scroll', () => out && wake(), { passive: true });
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
    window.__landing = { car, ideas: () => ideas, walls: () => walls, area: () => area, canvas, fxCounts: () => [marks[0].length + marks[1].length, puffs.length, rings.length], goal: () => dragGoal(), runaway: () => runaway, firstRound: () => firstRound, howTo: () => howTo, caught: () => caught, returnAt: () => returnAt, out: () => out, stopPos: (k) => stopPos(k), dodgeR };
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
