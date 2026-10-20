// Reactive dot grid. Dots are pushed by the pointer, dragged by fast moves
// (wake), lit up near the cursor, popped by clicks like bubble wrap, and pushed
// by shockwaves. Everything springs home; the loop sleeps once all is settled.
//
// Other modules can send a shockwave:
//   window.dispatchEvent(new CustomEvent('dotgrid:shock', { detail: { x, y, power } }))
import { juicy } from './motion.js';
import { sfx } from './sound.js';

export const GAP = 26; // px between dots (the page transition uses the same grid)
const DOT_R = 1.3; // resting radius
const PUSH_R = 180; // pointer influence radius
const PUSH = 16; // max pointer displacement
const GLOW_R = 140; // radius where dots light up
const WAKE = 0.05; // how much pointer speed drags dots along
const WAKE_MAX = 22;
const RIPPLE_SPEED = 950; // px per second
const RIPPLE_LIFE = 0.75; // seconds
const RIPPLE_BAND = 64; // ring thickness
const RIPPLE_PUSH = 20;
const POP_R = 70; // bubble-wrap pop radius around a click
const POP_TIME = 0.5; // seconds for a popped dot to refill
const STIFFNESS = 170; // spring: settles in ~600 ms
const DAMPING = 14;
const HEAT_UP = 14; // glow rise speed
const HEAT_DOWN = 2.6; // glow fade speed

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Spring-like refill curve for popped dots: 0 → overshoot → 1
const refill = (t) => {
  if (t >= 1) return 1;
  const c = 1.9;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

export function initDotGrid(canvas) {
  const ctx = canvas.getContext('2d');
  let base = [0, 0, 0];
  let hot = [0, 0, 0];
  // Colours come from the theme tokens; re-read when light/dark switches
  const readColours = () => {
    const css = getComputedStyle(document.documentElement);
    base = hexToRgb(css.getPropertyValue('--dot').trim());
    hot = hexToRgb(css.getPropertyValue('--accent-deep').trim());
  };
  readColours();
  window.addEventListener('themechange', () => {
    readColours();
    draw();
  });

  let width = 0;
  let height = 0;
  let dots = [];
  let ripples = [];
  const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };
  let raf = 0;
  let last = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dots = [];
    const offX = (width % GAP) / 2;
    const offY = (height % GAP) / 2;
    for (let y = offY; y <= height; y += GAP) {
      for (let x = offX; x <= width; x += GAP) {
        dots.push({ x, y, ox: 0, oy: 0, vx: 0, vy: 0, heat: 0, pop: -1 });
      }
    }
    draw();
  }

  function draw() {
    const now = performance.now() / 1000;
    ctx.clearRect(0, 0, width, height);
    for (const d of dots) {
      const shift = Math.min(Math.hypot(d.ox, d.oy) / PUSH, 1);
      const scale = d.pop < 0 || now < d.pop ? 1 : refill((now - d.pop) / POP_TIME);
      const r = (DOT_R + shift * 0.8 + d.heat * 2.2) * Math.max(scale, 0);
      if (r <= 0.05) continue;
      const h = d.heat;
      const cr = Math.round(base[0] + (hot[0] - base[0]) * h);
      const cg = Math.round(base[1] + (hot[1] - base[1]) * h);
      const cb = Math.round(base[2] + (hot[2] - base[2]) * h);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.65 + Math.max(shift, h) * 0.35})`;
      ctx.beginPath();
      ctx.arc(d.x + d.ox, d.y + d.oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function step(dt) {
    const now = performance.now() / 1000;
    ripples = ripples.filter((rp) => now - rp.t0 < RIPPLE_LIFE);
    let moving = ripples.length > 0;

    // Pointer speed decays when the mouse stops
    const decay = Math.exp(-dt * 10);
    pointer.vx *= decay;
    pointer.vy *= decay;
    const wx = Math.max(-WAKE_MAX, Math.min(WAKE_MAX, pointer.vx * WAKE));
    const wy = Math.max(-WAKE_MAX, Math.min(WAKE_MAX, pointer.vy * WAKE));

    for (const d of dots) {
      let tx = 0;
      let ty = 0;
      let heatTarget = 0;

      const px = d.x - pointer.x;
      const py = d.y - pointer.y;
      const pd = Math.hypot(px, py);
      if (pd < PUSH_R && pd > 0.01) {
        const k = 1 - pd / PUSH_R;
        const f = k * k * PUSH;
        tx += (px / pd) * f + wx * k;
        ty += (py / pd) * f + wy * k;
      }
      if (pd < GLOW_R) {
        heatTarget = (1 - pd / GLOW_R) ** 1.5;
      }

      for (const rp of ripples) {
        const age = now - rp.t0;
        const ring = age * RIPPLE_SPEED;
        const rx = d.x - rp.x;
        const ry = d.y - rp.y;
        const rd = Math.hypot(rx, ry);
        const band = Math.abs(rd - ring);
        if (band < RIPPLE_BAND && rd > 0.01) {
          const life = 1 - age / RIPPLE_LIFE;
          const f = (1 - band / RIPPLE_BAND) * life * RIPPLE_PUSH * rp.power;
          tx += (rx / rd) * f;
          ty += (ry / rd) * f;
          heatTarget = Math.max(heatTarget, (1 - band / RIPPLE_BAND) * life * 0.8);
        }
      }

      const ax = (tx - d.ox) * STIFFNESS - d.vx * DAMPING;
      const ay = (ty - d.oy) * STIFFNESS - d.vy * DAMPING;
      d.vx += ax * dt;
      d.vy += ay * dt;
      d.ox += d.vx * dt;
      d.oy += d.vy * dt;

      const rate = heatTarget > d.heat ? HEAT_UP : HEAT_DOWN;
      d.heat += (heatTarget - d.heat) * Math.min(rate * dt, 1);
      if (d.heat < 0.005) d.heat = 0;

      if (d.pop >= 0 && now - d.pop > POP_TIME) d.pop = -1;

      if (
        d.pop >= 0 ||
        Math.abs(d.heat - heatTarget) > 0.01 ||
        Math.abs(d.vx) + Math.abs(d.vy) > 0.5 ||
        Math.abs(d.ox - tx) + Math.abs(d.oy - ty) > 0.05
      ) {
        moving = true;
      }
    }
    return moving;
  }

  function frame(t) {
    const dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    const moving = step(dt);
    draw();
    raf = moving ? requestAnimationFrame(frame) : 0;
  }

  function wake() {
    if (!juicy() || raf || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function shock(x, y, power = 1, pop = false) {
    const now = performance.now() / 1000;
    ripples.push({ x, y, t0: now, power });
    if (pop) {
      for (const d of dots) {
        const dist = Math.hypot(d.x - x, d.y - y);
        // Pop from the centre outwards, a few ms apart
        if (dist < POP_R) d.pop = now + (dist / POP_R) * 0.08;
      }
    }
    wake();
  }

  window.addEventListener('resize', resize);
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const t = performance.now();
      const dt = Math.max(t - pointer.t, 1) / 1000;
      if (pointer.x > -1e3) {
        // Smoothed pointer velocity in px/s
        pointer.vx += ((e.clientX - pointer.x) / dt - pointer.vx) * 0.3;
        pointer.vy += ((e.clientY - pointer.y) / dt - pointer.vy) * 0.3;
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.t = t;
      wake();
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    pointer.x = pointer.y = -1e4;
    pointer.vx = pointer.vy = 0;
    wake();
  });
  window.addEventListener(
    'pointerdown',
    (e) => {
      shock(e.clientX, e.clientY, 1, true);
      if (juicy() && !e.target.closest('button, a, .card')) sfx.bubbles();
    },
    { passive: true },
  );
  window.addEventListener('dotgrid:shock', (e) => {
    const { x, y, power = 1, pop = false } = e.detail;
    shock(x, y, power, pop);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });

  resize();
}

export const sendShock = (x, y, power = 1, pop = false) =>
  window.dispatchEvent(new CustomEvent('dotgrid:shock', { detail: { x, y, power, pop } }));
