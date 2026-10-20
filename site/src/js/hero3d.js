// Entrance 3D toys. Abstract shapes float at the screen edges. Hover (or tap)
// swaps a shape for a low-poly prop from one of the games; poke it for a juicy
// hit (squash, spin, particles, hit-stop, small camera shake). With reduced
// motion the same toys respond flat: instant swaps, spin only.
import {
  BackSide, BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, DataTexture, DirectionalLight, Group, HemisphereLight, MathUtils, Mesh, MeshBasicMaterial, MeshToonMaterial, NearestFilter, OctahedronGeometry, PerspectiveCamera, Plane, Raycaster, RedFormat, Scene, SphereGeometry, TorusGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { burst } from './burst.js';
import { sendShock } from './dotgrid.js';
import { juicy, reducedMotion } from './motion.js';
import { sfx } from './sound.js';

const INK = 0x1d1b18;
const LIME = 0xcaff00;
const SURFACE = 0xfffdf8;

const MORPH_BACK_MS = 1500;
const HIT_STOP_MS = 60; // ~4 frames at 60 fps
const SHAKE_MS = 220;
const SHRINK_MS = 130; // swap: old shape squashes out
const GROW_MS = 480; // swap: new shape springs in
const POP_STAGGER_MS = 45; // entry: shapes pop in one after another

// Screen positions in -1..1 (x right, y up), kept away from the centre text
const SPOTS_WIDE = [
  [-0.74, 0.58], [0.76, 0.6], [-0.84, -0.06],
  [0.86, -0.02], [-0.58, -0.68], [0.6, -0.7],
];
const SPOTS_TALL = [[-0.62, 0.74], [0.64, 0.78], [-0.58, -0.62], [0.6, -0.6]];

/* ---------- materials and parts ---------- */

const gradientMap = (() => {
  const tex = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();
const outlineMat = new MeshBasicMaterial({ color: INK, side: BackSide });
const mats = new Map();
const toon = (color, flat = false) => {
  const key = `${color}-${flat}`;
  if (!mats.has(key)) mats.set(key, new MeshToonMaterial({ color, gradientMap, flatShading: flat }));
  return mats.get(key);
};

// One mesh with an ink outline (a slightly larger back-face copy)
function part(geo, color, { pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], flat = false, line = 1.07 } = {}) {
  const g = new Group();
  const outline = new Mesh(geo, outlineMat);
  outline.scale.setScalar(line);
  g.add(outline, new Mesh(geo, toon(color, flat)));
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

/* ---------- abstract shapes ---------- */

const ABSTRACT = [
  () => part(new BoxGeometry(0.72, 0.72, 0.72), LIME, { rot: [0.5, 0.6, 0] }),
  () => part(new SphereGeometry(0.44, 32, 16), SURFACE),
  () => part(new TorusGeometry(0.33, 0.13, 16, 40), LIME, { rot: [0.6, 0.3, 0] }),
  () => part(new ConeGeometry(0.42, 0.82, 32), SURFACE, { rot: [0.2, 0, 0.25] }),
  () => part(new CapsuleGeometry(0.24, 0.42, 8, 16), LIME, { rot: [0, 0, 0.7] }),
  () => part(new OctahedronGeometry(0.5), SURFACE, { flat: true }),
];

/* ---------- game props (low-poly, built from primitives) ---------- */

const sphere = (r) => new SphereGeometry(r, 24, 14);

// Leaping Frog
function frog() {
  const green = 0x7ed957;
  const eye = (x) =>
    group(
      part(sphere(0.13), SURFACE, { pos: [x, 0.28, 0.16] }),
      part(sphere(0.06), INK, { pos: [x, 0.3, 0.27], line: 1 }),
    );
  return group(
    part(sphere(0.42), green, { scale: [1, 0.72, 0.9] }),
    eye(-0.17),
    eye(0.17),
    part(sphere(0.1), green, { pos: [-0.26, -0.26, 0.2], scale: [1.4, 0.5, 1] }),
    part(sphere(0.1), green, { pos: [0.26, -0.26, 0.2], scale: [1.4, 0.5, 1] }),
  );
}

// A gold coin: the universal game pickup
function coin() {
  const face = [Math.PI / 2, 0, 0];
  return group(
    part(new CylinderGeometry(0.42, 0.42, 0.1, 40), 0xffc83d, { rot: face }),
    part(new CylinderGeometry(0.27, 0.27, 0.13, 40), 0xffe27a, { rot: face, line: 1.04 }),
  );
}

// Sweet Shot: a wrapped candy
function candy() {
  const wrapper = (side) =>
    part(new ConeGeometry(0.2, 0.3, 16), 0xffb3d4, {
      pos: [side * 0.42, 0, 0],
      rot: [0, 0, side * (Math.PI / 2)],
    });
  return group(part(sphere(0.3), 0xff7eb6), wrapper(1), wrapper(-1));
}

// Road Rush Puzzle: a toy car
function car() {
  const wheel = (x, z) =>
    part(new CylinderGeometry(0.13, 0.13, 0.1, 20), INK, { pos: [x, -0.2, z], rot: [Math.PI / 2, 0, 0], line: 1 });
  return group(
    part(new BoxGeometry(0.9, 0.28, 0.5), 0xff5a4e, { pos: [0, -0.04, 0] }),
    part(new BoxGeometry(0.48, 0.24, 0.44), SURFACE, { pos: [-0.06, 0.22, 0] }),
    wheel(0.28, 0.25), wheel(-0.28, 0.25), wheel(0.28, -0.25), wheel(-0.28, -0.25),
  );
}

// Magic Mineral: a cut gem
function gem() {
  const violet = 0x9a86ff;
  return group(
    part(new CylinderGeometry(0.28, 0.42, 0.18, 6), violet, { pos: [0, 0.12, 0], flat: true }),
    part(new ConeGeometry(0.42, 0.52, 6), violet, { pos: [0, -0.23, 0], rot: [Math.PI, 0, 0], flat: true }),
  );
}

// Zen Puzzle Saga: a stone cairn
function cairn() {
  return group(
    part(sphere(0.36), 0xb9c4b0, { pos: [0, -0.24, 0], scale: [1, 0.45, 0.85] }),
    part(sphere(0.27), 0xa7b49e, { pos: [0.02, 0.03, 0], scale: [1, 0.5, 0.85] }),
    part(sphere(0.18), 0xcad2c0, { pos: [-0.01, 0.25, 0], scale: [1, 0.6, 0.85] }),
  );
}

const PROPS = [frog, coin, candy, car, gem, cairn];
const PROP_SOUND = ['boing', 'ding', 'boing', 'boing', 'boing', 'boing'];

/* ---------- easing ---------- */

const easeIn = (t) => t * t * t;
const elasticOut = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

/* ---------- scene ---------- */

export function initHero(canvas, { onPoke } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  scene.add(new HemisphereLight(0xffffff, 0xd9d2c3, 2.2));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 5, 6);
  scene.add(sun);

  const hitGeo = new SphereGeometry(0.62, 12, 8);
  const hitMat = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

  const items = ABSTRACT.map((makeShape, i) => {
    const root = new Group(); // position + overall size + entry pop
    const squashG = new Group(); // squash and stretch (screen-aligned)
    const spinG = new Group(); // rotation
    const abstract = makeShape();
    const prop = PROPS[i]();
    prop.visible = false;
    spinG.add(abstract, prop);
    squashG.add(spinG);
    const hit = new Mesh(hitGeo, hitMat);
    root.add(squashG, hit);
    scene.add(root);

    const item = {
      root, squashG, spinG, abstract, prop, hit,
      home: new Vector2(),
      size: 1,
      offset: new Vector3(),
      vel: new Vector3(),
      ang: new Vector3(),
      idle: new Vector3((Math.random() - 0.5) * 0.5, 0.25 + Math.random() * 0.3, 0),
      squash: 0,
      squashV: 0,
      pop: 0,
      popV: 0,
      popTarget: 0,
      frozenUntil: 0,
      toProp: false,
      swapStart: -1e9,
      swapBurst: true,
      backTimer: 0,
      phase: Math.random() * Math.PI * 2,
      depth: 0.6 + Math.random() * 0.8, // parallax speed
    };
    item.sound = PROP_SOUND[i];
    hit.userData.item = item;
    return item;
  });

  /* layout */
  let halfW = 1;
  let halfH = 1;
  function layout() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const tall = w / h < 0.8;
    const dpr = Math.min(window.devicePixelRatio || 1, tall ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    halfH = camera.position.z * Math.tan(MathUtils.degToRad(camera.fov / 2));
    halfW = halfH * camera.aspect;
    const spots = tall ? SPOTS_TALL : SPOTS_WIDE;
    const size = MathUtils.clamp(Math.min(halfH * 0.3, halfW * 0.42), 0.5, 1.05);
    items.forEach((it, i) => {
      const spot = spots[i];
      it.root.visible = !!spot;
      if (!spot) return;
      it.home.set(spot[0] * halfW, spot[1] * halfH);
      it.size = size;
    });
  }

  /* picking */
  const ray = new Raycaster();
  const ndc = new Vector2();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const worldPoint = new Vector3();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    ray.ray.intersectPlane(plane, worldPoint);
    const live = items.filter((it) => it.root.visible && it.pop > 0.5).map((it) => it.hit);
    const hits = ray.intersectObjects(live, false);
    return hits.length ? hits[0].object.userData.item : null;
  }

  function setMorph(item, toProp) {
    if (item.toProp === toProp) return;
    item.toProp = toProp;
    item.swapStart = performance.now();
    item.swapBurst = !toProp; // burst only when a prop appears
    if (toProp) sfx[item.sound]();
    wake();
  }
  const scheduleBack = (item) => {
    clearTimeout(item.backTimer);
    item.backTimer = setTimeout(() => setMorph(item, false), MORPH_BACK_MS);
  };

  let shakeStart = -1e9;
  function poke(item, e) {
    onPoke?.();
    setMorph(item, true);
    clearTimeout(item.backTimer);
    if (e.pointerType !== 'mouse') scheduleBack(item);

    const dir = new Vector3(item.root.position.x - worldPoint.x, item.root.position.y - worldPoint.y, 0);
    if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
    dir.normalize();

    if (juicy()) {
      item.vel.addScaledVector(dir, 5.5);
      item.squash = 0.36;
      item.squashV = 0;
      item.ang.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 4);
      item.frozenUntil = performance.now() + HIT_STOP_MS;
      shakeStart = performance.now();
      burst(e.clientX, e.clientY, 12);
      sendShock(e.clientX, e.clientY, 0.9);
      sfx.hit();
    } else {
      item.ang.y += 4;
    }
    wake();
  }

  let hovered = null;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const item = pick(e.clientX, e.clientY);
      canvas.style.cursor = item ? 'pointer' : '';
      if (item === hovered) return;
      if (hovered) scheduleBack(hovered);
      hovered = item;
      if (item) {
        clearTimeout(item.backTimer);
        setMorph(item, true);
      }
    },
    { passive: true },
  );
  canvas.addEventListener('pointerdown', (e) => {
    const item = pick(e.clientX, e.clientY);
    if (item) poke(item, e);
  });

  /* swap animation */
  const projected = new Vector3();
  function updateSwap(item, now, j) {
    const [out, inn] = item.toProp ? [item.abstract, item.prop] : [item.prop, item.abstract];
    if (!j) {
      out.visible = false;
      inn.visible = true;
      inn.scale.setScalar(1);
      return;
    }
    const t = now - item.swapStart;
    if (t < SHRINK_MS) {
      out.visible = true;
      out.scale.setScalar(1 - easeIn(t / SHRINK_MS));
      inn.visible = false;
      return;
    }
    out.visible = false;
    inn.visible = true;
    inn.scale.setScalar(elasticOut((t - SHRINK_MS) / GROW_MS));
    if (!item.swapBurst) {
      item.swapBurst = true;
      projected.copy(item.root.position).project(camera);
      const r = canvas.getBoundingClientRect();
      const x = r.left + ((projected.x + 1) / 2) * r.width;
      const y = r.top + ((1 - projected.y) / 2) * r.height;
      burst(x, y, 6);
    }
  }

  /* scroll parallax: shapes drift up at their own speeds and shrink a little */
  let scrollP = 0;
  window.addEventListener('scroll:progress', (e) => {
    scrollP = e.detail;
    wake();
  });

  /* See-games anticipation: shapes dip, then fly up with the page */
  window.addEventListener('entrance:windup', () => {
    if (!juicy()) return;
    for (const it of items) it.vel.y -= 2.2;
    wake();
  });
  window.addEventListener('entrance:launch', () => {
    if (!juicy()) return;
    for (const it of items) {
      it.vel.y += 5 + it.depth * 3;
      it.squash = -0.25; // stretch on take-off
      it.squashV = 0;
    }
    wake();
  });

  /* loop */
  let raf = 0;
  let last = 0;
  let inView = true;

  function frame(t) {
    const dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    const j = juicy();
    const still = reducedMotion();
    const time = t / 1000;

    for (const it of items) {
      if (!it.root.visible) continue;

      if (j) {
        it.popV += ((it.popTarget - it.pop) * 220 - it.popV * 14) * dt;
        it.pop += it.popV * dt;
      } else {
        it.pop = it.popTarget;
        it.popV = 0;
      }

      if (t >= it.frozenUntil) {
        it.vel.addScaledVector(it.offset, -60 * dt).multiplyScalar(Math.exp(-8 * dt));
        it.offset.addScaledVector(it.vel, dt);

        if (j) {
          it.squashV += (-it.squash * 320 - it.squashV * 11) * dt;
          it.squash += it.squashV * dt;
        } else {
          it.squash = 0;
          it.squashV = 0;
        }

        it.ang.multiplyScalar(Math.exp(-2.2 * dt));
        const spin = still ? 0 : 1;
        it.spinG.rotation.x += (it.ang.x + it.idle.x * spin) * dt;
        it.spinG.rotation.y += (it.ang.y + it.idle.y * spin) * dt;
        it.spinG.rotation.z += it.ang.z * dt;
      }

      const bob = still ? 0 : Math.sin(time * 1.1 + it.phase) * 0.07 * it.size;
      const drift = scrollP * halfH * it.depth;
      it.root.position.set(it.home.x + it.offset.x, it.home.y + it.offset.y + bob + drift, it.offset.z);
      it.root.scale.setScalar(it.size * Math.max(it.pop, 0) * (1 - scrollP * 0.25));
      const s = MathUtils.clamp(it.squash, -0.4, 0.6);
      it.squashG.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);

      updateSwap(it, t, j);
    }

    const shakeT = (t - shakeStart) / SHAKE_MS;
    if (j && shakeT < 1) {
      const amp = 0.06 * (1 - shakeT);
      camera.position.x = Math.sin(t * 0.09) * amp;
      camera.position.y = Math.cos(t * 0.11) * amp;
    } else {
      camera.position.x = camera.position.y = 0;
    }

    renderer.render(scene, camera);
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

  return {
    enter() {
      items.forEach((it, i) => {
        setTimeout(() => {
          it.popTarget = 1;
          if (juicy()) it.popV = 6;
          wake();
        }, i * POP_STAGGER_MS);
      });
    },
  };
}
