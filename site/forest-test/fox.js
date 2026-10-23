// Fox (dev only, forest step 3b): fox 1b from the Kie design sheet
// (site/fox-test/1b-*.webp), redrawn as SVG parts and animated in code.
// Click the clearing: it runs there and skids to a stop.
// Each action writes a pose (body squash and tilt, head, ears, tail, feet, arm,
// eyes) for its own time; springs give the tail and ears their lag and swish.
// At rest the code sleeps: breathing is a CSS animation (no script work), and
// timers wake it briefly for blinks, ear twitches and tail flicks.
// Fox units: ground at y 0, ear tips at about y -104, facing right (flipped
// with scale(-1 1) to face left). Eyes reuse the runaway bulb's eye shapes.

const SHADOW = '#b85a24';
const ORANGE = '#e07b39';
const CREAM = '#f6e7cf';
const DARK = '#3d2b1c';
const INK = '#1d1b18';
const HEIGHT = 105; // ground to ear tip, in fox units

const HEAD = 'M-21 -64A25 22 0 0 1 25.6 -75Q33 -68 38.5 -61.5Q32 -54 25.6 -53A25 22 0 0 1 -21 -64Z';
const EAR_F = 'M-17 -78Q-15 -95 -11 -104Q-3 -95 2 -83Z';
const EAR_F_TIP = 'M-11 -104L-6.6 -97Q-10 -95.6 -13.6 -95.4Z';
const EAR_F_IN = 'M-12.8 -82Q-11.6 -90 -10 -94Q-6.5 -89 -3.4 -83.5Z';
const EAR_B = 'M7 -84Q13 -95 19 -101Q22 -90 23 -77Z';
const EAR_B_TIP = 'M19 -101L20.4 -92.6Q17.5 -94 14.8 -95Z';
const TAIL_A = 'M-6 -11C-18 -4 -40 -10 -45 -28C-47 -38 -40 -45 -32 -42C-26 -36 -18 -27 -9 -23Z';
const TAIL_B = 'M-45 -30C-51 -47 -47 -70 -33 -86C-31 -77 -27 -64 -25 -52C-24 -44 -27 -38 -32 -36Z';
const TAIL_PIVOT = [-9, -18];
const TAIL_JOINT = [-38, -36];

// The bulb's eye: open, squint (happy), sleep (closed), wide, sad, spiral
const EYE = `<ellipse class="fox__eye-open" rx="3" ry="4.2" />
  <path class="fox__eye-squint" d="M-3.6 1q3.6-4.4 7.2 0" />
  <path class="fox__eye-sleep" d="M-3.6 0q3.6 3.6 7.2 0" />
  <g class="fox__eye-wide"><ellipse rx="4" ry="5.2" /><circle r="1.4" /></g>
  <g class="fox__eye-sad"><ellipse cy="1.6" rx="2.8" ry="3" /><path d="M-4 -5.4L3.5 -3" /></g>
  <path class="fox__eye-spiral" d="M0 0a1 1 0 0 1 2 0a2 2 0 0 1-4 0a3 3 0 0 1 6 0a4 4 0 0 1-8 0" />`;

// The tail is drawn twice, outlines under fills, so its two segments read as one shape
const tail = (fill) => `<g class="fox__tail-a">
      <path d="${TAIL_A}" ${fill ? `fill="${ORANGE}"` : `fill="${INK}" stroke="${INK}" stroke-width="6.4" stroke-linejoin="round"`} />
      <g class="fox__tail-b">
        <path d="${TAIL_B}" ${fill ? `fill="${ORANGE}"` : `fill="${INK}" stroke="${INK}" stroke-width="6.4" stroke-linejoin="round"`} />
        ${fill ? `<path d="${TAIL_B}" fill="${CREAM}" clip-path="url(#fox-tip)" />` : ''}
      </g>
    </g>`;

const SVG = `<svg class="fox__svg" viewBox="-62 -116 124 124" focusable="false">
  <defs>
    <clipPath id="fox-body"><ellipse cx="0" cy="-28" rx="16" ry="21" /></clipPath>
    <clipPath id="fox-head"><path d="${HEAD}" /></clipPath>
    <clipPath id="fox-tip"><rect x="-60" y="-100" width="40" height="34" /></clipPath>
  </defs>
  <g class="fox__flip">
    <g class="fox__root">
      <g class="fox__tail">${tail(false)}${tail(true)}</g>
      <path class="fox__arm-b" d="M-17 -37q4-3 7 0l-1 13q-3 3-6 0Z" fill="${SHADOW}" stroke="${INK}" stroke-width="3" />
      <ellipse class="fox__foot-b" cx="-7" cy="-3.6" rx="7.5" ry="4.6" fill="${DARK}" stroke="${INK}" stroke-width="3" />
      <g class="fox__body">
        <ellipse cx="0" cy="-28" rx="16" ry="21" fill="${SHADOW}" />
        <ellipse cx="-2.6" cy="-30.5" rx="16" ry="21" fill="${ORANGE}" clip-path="url(#fox-body)" />
        <ellipse cx="6.5" cy="-24" rx="8.5" ry="12.5" fill="${CREAM}" clip-path="url(#fox-body)" />
        <ellipse cx="0" cy="-28" rx="16" ry="21" fill="none" stroke="${INK}" stroke-width="3.2" />
      </g>
      <ellipse class="fox__foot-f" cx="8" cy="-3.6" rx="7.5" ry="4.6" fill="${DARK}" stroke="${INK}" stroke-width="3" />
      <g class="fox__arm-f">
        <ellipse cx="13" cy="-29" rx="4.3" ry="8.4" fill="${ORANGE}" stroke="${INK}" stroke-width="3" transform="rotate(-10 13 -29)" />
        <ellipse cx="14.4" cy="-22" rx="4.1" ry="3.3" fill="${DARK}" stroke="${INK}" stroke-width="2.6" />
      </g>
      <g class="fox__head">
        <g class="fox__ear-b">
          <path d="${EAR_B}" fill="${SHADOW}" />
          <path d="${EAR_B_TIP}" fill="${DARK}" />
          <path d="${EAR_B}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" />
        </g>
        <path d="${HEAD}" fill="${SHADOW}" />
        <ellipse cx="1.5" cy="-67" rx="26" ry="22.5" fill="${ORANGE}" clip-path="url(#fox-head)" />
        <ellipse cx="12" cy="-49.5" rx="31" ry="10.5" fill="${CREAM}" clip-path="url(#fox-head)" />
        <path d="${HEAD}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" />
        <ellipse cx="37.4" cy="-61.6" rx="3.4" ry="2.8" fill="${INK}" />
        <g class="fox__eyes">
          <g class="fox__eye fox__eye--l" transform="translate(9 -66)">${EYE}</g>
          <g class="fox__eye fox__eye--r" transform="translate(22 -66)">${EYE}</g>
        </g>
        <g class="fox__ear-f">
          <path d="${EAR_F}" fill="${ORANGE}" />
          <path d="${EAR_F_IN}" fill="${CREAM}" />
          <path d="${EAR_F_TIP}" fill="${DARK}" />
          <path d="${EAR_F}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" />
        </g>
      </g>
    </g>
  </g>
</svg>`;

export const ACTIONS = ['run', 'crouch', 'pounce', 'happy', 'fall', 'sit'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - (1 - t) ** 3; // fast out, soft in
const wave = (t, hz) => Math.sin(t * hz * Math.PI * 2);

// A damped spring: pulls value toward target, overshoots a little
function spring(k, c) {
  return {
    v: 0, x: 0, to: 0,
    step(target, dt) { this.to = target; this.v += (k * (target - this.x) - c * this.v) * dt; this.x += this.v * dt; return this.x; },
    // 0.3 degrees is under a quarter pixel at fox size
    settled() { return Math.abs(this.v) < 0.3 && Math.abs(this.to - this.x) < 0.3; },
  };
}

export function makeFox(layer, { reducedMotion = false } = {}) {
  const el = document.createElement('div');
  el.className = 'fox';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="fox__breath">${SVG}</div>`;
  layer.append(el);
  const q = (s) => [...el.querySelectorAll(s)];
  const parts = {
    flip: q('.fox__flip'), root: q('.fox__root'), head: q('.fox__head'),
    earF: q('.fox__ear-f'), earB: q('.fox__ear-b'), tailA: q('.fox__tail-a'), tailB: q('.fox__tail-b'),
    footF: q('.fox__foot-f'), footB: q('.fox__foot-b'), armF: q('.fox__arm-f'), eyes: q('.fox__eyes'),
  };
  // Only parts that moved get rewritten (an ear twitch touches just the ear)
  const set = (list, value) => {
    if (list.last === value) return;
    list.last = value;
    list.forEach((n) => n.setAttribute('transform', value));
  };

  // World state (page px)
  const s = {
    x: 0, y: 0, dir: 1, px: 60, // px = fox height on screen
    action: 'idle', t: 0, target: null, speed: 0, travelled: 0,
    eyes: 'open', look: 0, timeScale: 1, onArrive: null,
  };
  const tailA = spring(90, 9);
  const tailB = spring(70, 6);
  const earF = spring(260, 16);
  const earB = spring(260, 16);
  let twitch = { ear: null, until: 0 };
  let flick = 0; // tail flick until this clock time
  let clock = 0;
  let raf = 0;
  let last = 0;

  function setEyes(e, look = s.look) {
    s.eyes = e;
    s.look = look;
    el.dataset.eyes = e;
  }
  setEyes('open', 0);

  function place() {
    const k = s.px / HEIGHT;
    el.style.width = `${124 * k}px`;
    el.style.height = `${124 * k}px`;
    el.style.transform = `translate(${s.x - 62 * k}px, ${s.y - 116 * k}px)`;
  }

  // Pose for this frame: every value is a change from the resting fox
  function pose(dt) {
    const P = { bob: 0, tilt: 0, sx: 1, sy: 1, hx: 0, hy: 0, ht: 0, ear: 0, tail: 0, tailBend: 0, fF: 0, fB: 0, lift: 0, arm: 0, dx: 0, dy: 0 };
    const t = s.t;
    switch (s.action) {
      case 'idle':
      case 'sit': {
        // Breathing is CSS (.fox__breath); here only the sit and the tail flick
        const sit = s.action === 'sit' ? ease(clamp(t / 0.35, 0, 1)) : 0;
        const fl = clock < flick ? 1 : 0;
        P.sy = 1 - 0.14 * sit;
        P.sx = 1 + 0.05 * sit;
        P.hy = 3 * sit;
        // Sitting: the tail lies along the ground behind, tip curling up
        P.tail = -52 * sit + 14 * fl;
        P.tailBend = 70 * sit + 22 * fl;
        P.fF = -2 * sit;
        P.arm = -6 * sit;
        break;
      }
      case 'run': {
        const ph = t / 0.3;
        const air = Math.abs(Math.sin(Math.PI * ph)); // 0 at contact, 1 at the top
        const start = ease(clamp(t / 0.15, 0, 1));
        P.bob = -10 * air * start;
        P.sy = 1 + (-0.1 + 0.16 * air) * start;
        P.sx = 1 + (0.08 - 0.12 * air) * start;
        P.tilt = 8 * start;
        P.fF = 7 * Math.cos(2 * Math.PI * ph);
        P.fB = -7 * Math.cos(2 * Math.PI * ph);
        P.lift = 3 * air;
        P.ear = -22;
        P.tail = -48;
        P.tailBend = -18 + 8 * Math.sin(2 * Math.PI * ph);
        P.hy = -2 * air;
        P.ht = -3;
        P.arm = 18 * Math.cos(2 * Math.PI * ph);
        break;
      }
      case 'skid': {
        const p = clamp(t / 0.42, 0, 1);
        const k = 1 - ease(p);
        P.tilt = -16 * k;
        P.sx = 1 + 0.14 * k;
        P.sy = 1 - 0.12 * k;
        P.fF = 8 * k;
        P.fB = 4 * k;
        P.ear = 14 * k;
        P.tail = -20 * k + 18 * Math.sin(p * Math.PI) ;
        P.hx = 2 * k;
        if (p >= 1) to('idle');
        break;
      }
      case 'crouch': {
        const down = ease(clamp(t / 0.25, 0, 1));
        const wig = t > 0.3 ? wave(t, 7) : 0;
        P.sy = 1 - 0.2 * down;
        P.sx = 1 + 0.08 * down + 0.03 * wig;
        P.tilt = 7 * down + 2.5 * wig;
        P.hy = 7 * down;
        P.hx = 3 * down;
        P.ear = 14 * down;
        P.tail = -10 * down + 12 * wig;
        P.tailBend = 10 * wig;
        if (t > 1.05) to('pounce');
        break;
      }
      case 'pounce': {
        const p = clamp(t / 0.6, 0, 1);
        const len = s.px * 1.3;
        P.dx = len * ease(p) * s.dir;
        P.dy = -s.px * 0.75 * 4 * p * (1 - p);
        // In the air: stretched along the leap; on landing: squashed
        P.sx = p < 0.85 ? 1.14 : 1.12;
        P.sy = p < 0.85 ? 0.9 : 0.86;
        P.tilt = p < 0.85 ? 14 - 22 * p : -6;
        P.ear = -24;
        P.tail = -40;
        P.tailBend = -25;
        P.fF = 9;
        P.fB = -9;
        P.arm = -40;
        if (p >= 1) {
          s.x += len * s.dir; // the leap becomes the new spot
          P.dx = 0;
          P.dy = 0;
          to('happy');
        }
        break;
      }
      case 'happy': {
        const hop = Math.abs(Math.sin((Math.PI * t) / 0.42));
        const on = t < 0.84 ? 1 : 0;
        P.bob = -9 * hop * on;
        P.sy = 1 + (0.08 * hop - 0.06) * on;
        P.sx = 1 - (0.05 * hop - 0.04) * on;
        P.tail = 26 * wave(t, 6);
        P.tailBend = 20 * wave(t - 0.05, 6);
        P.ear = -6;
        P.arm = -30 * hop;
        if (t > 1.2) to('idle');
        break;
      }
      case 'fall': {
        // Trips forward flat, lies dizzy, then pops back up
        const down = ease(clamp(t / 0.22, 0, 1));
        const up = ease(clamp((t - 1.35) / 0.35, 0, 1));
        const bounce = t > 0.22 && t < 0.5 ? Math.sin(((t - 0.22) / 0.28) * Math.PI) : 0;
        P.tilt = 82 * down * (1 - up) - 8 * Math.sin(up * Math.PI);
        P.bob = -5 * bounce;
        P.sx = 1 + 0.06 * bounce;
        P.ear = 30 * down * (1 - up);
        P.tail = 30 * down * (1 - up) + 12 * Math.sin(up * Math.PI * 3);
        P.fF = -6 * down * (1 - up);
        P.fB = -6 * down * (1 - up);
        if (t > 0.22 && s.eyes !== 'spiral' && up === 0) setEyes('spiral', 0);
        if (up > 0 && s.eyes === 'spiral') setEyes('open', 0);
        if (t > 1.9) to('idle');
        break;
      }
    }
    return P;
  }

  function to(action) {
    s.action = action;
    s.t = 0;
    const eyes = { run: ['open', 1], crouch: ['wide', 1], pounce: ['wide', 1], happy: ['squint', 0], skid: ['squint', 0] }[action];
    setEyes(...(eyes || ['open', 0]));
  }

  const r = (v) => Math.round(v * 100) / 100;
  function render(P) {
    set(parts.flip, `scale(${s.dir} 1)`);
    set(parts.root, `translate(0 ${P.bob}) rotate(${P.tilt}) scale(${P.sx} ${P.sy})`);
    set(parts.head, `translate(${P.hx} ${P.hy}) rotate(${P.ht} 2 -46)`);
    set(parts.earF, `rotate(${r(earF.x)} -8 -81)`);
    set(parts.earB, `rotate(${r(earB.x * 0.9)} 15 -80)`);
    set(parts.tailA, `rotate(${r(tailA.x)} ${TAIL_PIVOT[0]} ${TAIL_PIVOT[1]})`);
    set(parts.tailB, `rotate(${r(tailB.x)} ${TAIL_JOINT[0]} ${TAIL_JOINT[1]})`);
    set(parts.footF, `translate(${P.fF} ${-P.lift})`);
    set(parts.footB, `translate(${P.fB} ${-P.lift * 0.6})`);
    set(parts.armF, `rotate(${P.arm} 12 -36)`);
    set(parts.eyes, `translate(${s.look * 1.6} 0)`);
    const pos = `translate(${s.x + P.dx - (62 * s.px) / HEIGHT}px, ${s.y + P.dy - (116 * s.px) / HEIGHT}px)`;
    if (el.style.transform !== pos) el.style.transform = pos;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016) * s.timeScale;
    last = now;
    clock += dt;
    s.t += dt;

    // Running: speed up, cover the ground, then skid (long runs) or just stop
    if (s.action === 'run' && s.target) {
      const dx = s.target.x - s.x;
      const dy = s.target.y - s.y;
      const d = Math.hypot(dx, dy);
      const top = s.px * 4.5;
      s.speed = Math.min(top, s.speed + top * 7 * dt);
      const stepLen = Math.min(d, s.speed * dt);
      if (Math.abs(dx) > 2) s.dir = Math.sign(dx);
      if (d > 0.5) {
        s.x += (dx / d) * stepLen;
        s.y += (dy / d) * stepLen;
        s.travelled += stepLen;
      }
      if (d - stepLen < 0.5) {
        s.target = null;
        s.speed = 0;
        to(s.travelled > s.px * 1.2 ? 'skid' : 'idle');
        s.onArrive?.();
      }
    }

    const P = pose(dt);
    const tw = clock < twitch.until ? -16 : 0;
    earF.step(P.ear + (twitch.ear === 'f' ? tw : 0), dt);
    earB.step(P.ear + (twitch.ear === 'b' ? tw : 0), dt);
    tailA.step(P.tail, dt);
    tailB.step(P.tailBend, dt);
    render(P);
    // At rest and settled: stop drawing; CSS breathes until something wakes it
    const calm = s.action === 'idle' || (s.action === 'sit' && s.t > 0.4);
    if (calm && clock > twitch.until && clock > flick && [tailA, tailB, earF, earB].every((sp) => sp.settled())) {
      raf = 0;
      el.classList.add('is-resting');
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (raf || reducedMotion) return;
    el.classList.remove('is-resting');
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // While calm: blink every few seconds (eyes are CSS, no drawing needed),
  // and now and then twitch an ear or flick the tail (a short wake)
  const calm = () => s.action === 'idle' || s.action === 'sit';
  function blinkLater() {
    setTimeout(() => {
      if (calm() && s.eyes === 'open') {
        setEyes('sleep');
        setTimeout(() => s.eyes === 'sleep' && setEyes('open'), 120);
      }
      blinkLater();
    }, 2500 + Math.random() * 3000);
  }
  function fidgetLater() {
    setTimeout(() => {
      if (calm()) {
        if (Math.random() < 0.7) twitch = { ear: Math.random() < 0.5 ? 'f' : 'b', until: clock + 0.09 };
        else flick = clock + 0.18;
        wake();
      }
      fidgetLater();
    }, 5000 + Math.random() * 6000); // rare: each fidget costs a second of drawing
  }

  // Reduced motion: no animation; the fox appears where it is sent, resting
  function still(action) {
    const P = { bob: 0, tilt: 0, sx: 1, sy: action === 'sit' ? 0.86 : 1, hx: 0, hy: 0, ht: 0, fF: 0, fB: 0, lift: 0, arm: 0, dx: 0, dy: 0 };
    earF.x = earB.x = 0;
    tailA.x = action === 'sit' ? -52 : 0;
    tailB.x = action === 'sit' ? 70 : 0;
    render(P);
  }

  const api = {
    el,
    state: s,
    // Size and spot (page px); px = fox height on screen
    put(x, y, px) {
      s.x = x;
      s.y = y;
      s.px = px;
      place();
      if (reducedMotion) still(s.action);
    },
    resize(px) {
      s.px = px;
      place();
    },
    runTo(x, y, onArrive) {
      s.onArrive = onArrive || null;
      if (reducedMotion) {
        if (Math.abs(x - s.x) > 2) s.dir = Math.sign(x - s.x);
        s.x = x;
        s.y = y;
        s.action = 'idle';
        still('idle');
        onArrive?.();
        return;
      }
      if (s.action === 'fall' || s.action === 'pounce') return; // busy; ignore
      s.target = { x, y };
      s.travelled = 0;
      if (s.action !== 'run') to('run');
      wake();
    },
    play(action) {
      if (!ACTIONS.includes(action)) return;
      if (reducedMotion) {
        s.action = action === 'sit' ? 'sit' : 'idle';
        still(s.action);
        return;
      }
      s.target = null;
      s.speed = 0;
      to(action === 'pounce' ? 'crouch' : action); // a pounce always starts with the crouch
      wake();
    },
    face(dir) { s.dir = dir; wake(); },
    get awake() { return !!raf; },
    slow(on) { s.timeScale = on ? 0.25 : 1; },
  };
  place();
  if (reducedMotion) still('idle');
  else {
    wake();
    blinkLater();
    fidgetLater();
  }
  return api;
}
