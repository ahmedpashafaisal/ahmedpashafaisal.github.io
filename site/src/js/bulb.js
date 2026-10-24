// Runaway bulb: a flat SVG twin of the 3D idea bulb in hero3d.js, so the same
// character can turn up on pages without three.js. Same parts and sizes (the
// 3D units x100, y flipped): lime glass with an ink outline, ink filament
// loop, white shine, three thread bands, ink tip, five rays, and the lime
// glow drawn over everything at 20% like the 3D glow sphere (that is what
// tints the base olive). Rays follow the theme like in 3D; the rest does not.
// Drawn as the 3D camera sees a bulb straight ahead: its tilt lifts the parts
// in front of the glass (filament ~6, shine ~5, base rims ~3 units).
// The runaway one (eyes: true) also has eyes beside the filament, no mouth;
// they change on a timeline per motion (FACE). Caught bulbs stay plain.
// Motions are CSS (styles/bulb.css); play() runs one, resolves when it ends.
import { reducedMotion } from './motion.js';

// Comes and goes, moves, feelings, then the two that need an edge to hide behind
export const MOTIONS = [
  'pop-in', 'drop-in', 'hop-off', 'flee',
  'dodge', 'sneak', 'trip', 'blasted', 'show-off', 'laugh', 'beckon',
  'curious', 'settle', 'sleepy', 'sad', 'scared', 'dizzy', 'hide',
  'peek', 'side-peek',
];

// Eyes over each motion: [share of the motion's duration, eyes, look].
// Look -1..1 shifts both eyes, times --dir (1 = toward where it is going).
const FACE = {
  'pop-in': [[0, 'open']],
  'drop-in': [[0, 'wide'], [0.5, 'squint'], [0.72, 'open']],
  'hop-off': [[0, 'open', 1], [0.4, 'wink', 1]],
  flee: [[0, 'wide', 1]],
  dodge: [[0, 'open'], [0.4, 'wink'], [0.9, 'open']],
  sneak: [[0, 'open', 1], [0.36, 'wide', -1], [0.6, 'open', 1], [0.98, 'open']],
  trip: [[0, 'open', 1], [0.2, 'wide'], [0.72, 'squint'], [0.94, 'open']],
  blasted: [[0, 'wide'], [0.58, 'spiral']],
  'show-off': [[0, 'squint'], [0.86, 'open']],
  laugh: [[0, 'squint'], [0.96, 'open']],
  beckon: [[0, 'open', 1], [0.14, 'wink', 1], [0.86, 'open', 1]],
  curious: [[0, 'open', 1], [0.4, 'open', -0.6], [0.55, 'open', 1], [0.9, 'open']],
  settle: [[0, 'open'], [0.45, 'squint'], [0.86, 'open']],
  sleepy: [[0, 'open'], [0.3, 'sleep']],
  sad: [[0.1, 'sad']],
  scared: [[0, 'wide', 1], [0.94, 'open']],
  dizzy: [[0, 'spiral'], [0.78, 'open']],
  hide: [[0, 'open']],
  peek: [[0, 'open'], [0.36, 'open', -1], [0.5, 'open', 1], [0.66, 'wide']],
  'side-peek': [[0, 'open', 1], [0.66, 'wide', 1], [0.86, 'open']],
};

const RAYS = [-60, -30, 0, 30, 60]
  .map((deg) => {
    const a = (deg * Math.PI) / 180;
    const x = (Math.sin(a) * 43).toFixed(2);
    const y = (-12 - Math.cos(a) * 43).toFixed(2);
    return `<g transform="translate(${x} ${y}) rotate(${deg})"><rect class="bulb__ray" x="-2.25" y="-6" width="4.5" height="12" /></g>`;
  })
  .join('');

// One eye, drawn as the right eye round (0, 0); the left one is mirrored
const EYE = `<ellipse class="bulb__eye-open" rx="3" ry="4.2" />
      <path class="bulb__eye-squint" d="M-3.6 1q3.6-4.4 7.2 0" />
      <path class="bulb__eye-sleep" d="M-3.6 0q3.6 3.6 7.2 0" />
      <g class="bulb__eye-wide"><ellipse rx="4" ry="5.2" /><circle r="1.4" /></g>
      <g class="bulb__eye-sad"><ellipse cy="1.6" rx="2.8" ry="3" /><path d="M-4 -5.4L3.5 -3" /></g>
      <path class="bulb__eye-spiral" d="M0 0a1 1 0 0 1 2 0a2 2 0 0 1-4 0a3 3 0 0 1 6 0a4 4 0 0 1-8 0" />`;

const EYES = `<g class="bulb__eyes">
      <g class="bulb__eye bulb__eye--l" transform="translate(-16 -15) scale(-1 1)">${EYE}</g>
      <g class="bulb__eye bulb__eye--r" transform="translate(16 -15)">${EYE}</g>
    </g>`;

// Z's float up from the top right while asleep
const ZZZ = `<g class="bulb__zzz">${[
  [38, -58, 1],
  [46, -69, 0.8],
  [53, -80, 0.65],
]
  .map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="bulb__z" d="M-3 -3.5h6l-6 7h6" /></g>`)
  .join('')}</g>`;

let count = 0;

function svg(eyes) {
  const clip = `bulb-glass-${++count}`;
  return `<svg class="bulb__svg" viewBox="-50 -64 100 110" focusable="false">
  <g class="bulb__sway">
    <g class="bulb__body">
      <ellipse class="bulb__ink" cx="0" cy="-12" rx="28.9" ry="30.3" />
      <polygon class="bulb__ink" points="-19.76,1.16 19.76,1.16 12.48,15.84 -12.48,15.84" />
      <rect class="bulb__ink" x="-13.5" y="15" width="27" height="17.5" />
      <polygon class="bulb__lime" points="-19,1.5 19,1.5 12,15.5 -12,15.5" />
      <clipPath id="${clip}"><ellipse cx="0" cy="-12" rx="27" ry="28.35" /></clipPath>
      <ellipse class="bulb__shade" cx="0" cy="-12" rx="27" ry="28.35" />
      <ellipse class="bulb__lime" cx="3" cy="-15" rx="26" ry="27" clip-path="url(#${clip})" />
      <rect class="bulb__base" x="-12.5" y="15.25" width="25" height="16.5" />
      <path class="bulb__thread" d="M-12.5 20.75h25M-12.5 26.25h25" />
      <ellipse class="bulb__ink" cx="0" cy="31.75" rx="12.5" ry="2.2" />
      <polygon class="bulb__ink" points="-6.5,31.75 6.5,31.75 0,37.5" />
      <path class="bulb__filament" d="M-7.5 -6.8V-19.3a7.5 7.5 0 0 1 15 0V-6.8" />
      ${eyes ? EYES : ''}
      <ellipse class="bulb__shine" cx="-12" cy="-27" rx="4.5" ry="6.75" transform="rotate(-28.6 -12 -27)" />
    </g>
    <g class="bulb__rays">${RAYS}</g>
    ${eyes ? ZZZ : ''}
    <circle class="bulb__glow" cx="0" cy="-10" r="46" />
  </g>
</svg>`;
}

// size: width in px (default 84 px; landing bulbs are 84–89 px).
// phase 0..1 desyncs the idle bob, sway and blink when several bulbs share a page.
// eyes: true for the runaway bulb.
export function makeBulb({ size, phase = Math.random(), eyes = false } = {}) {
  const el = document.createElement('span');
  el.className = eyes ? 'bulb bulb--runaway' : 'bulb';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<span class="bulb__idle">${svg(eyes)}</span>`;
  if (size) el.style.setProperty('--bulb-size', `${size}px`);
  el.style.setProperty('--phase', phase);
  if (eyes) setFace(el, 'open', 0);
  return el;
}

const faceTimers = new WeakMap();

function setFace(el, eyes, look) {
  el.dataset.eyes = eyes;
  el.style.setProperty('--look', look);
}

// Eyes without a motion (a reaction between motions): open, wink, wide...
export const look = (el, eyes, dir = 0) => setFace(el, eyes, dir);

// Runs the motion's eye timeline. Instant: jump to its last eyes (reduced motion).
function face(el, motion, dir, instant) {
  if (!el.classList.contains('bulb--runaway')) return;
  (faceTimers.get(el) || []).forEach(clearTimeout);
  const steps = FACE[motion];
  if (instant) {
    const [, eyes, look = 0] = steps[steps.length - 1];
    setFace(el, eyes, look * dir);
    return;
  }
  const ms = parseFloat(getComputedStyle(el).animationDuration) * 1000;
  faceTimers.set(el, steps.map(([at, eyes, look = 0]) => setTimeout(() => setFace(el, eyes, look * dir), at * ms)));
}

// dir: 1 = moves right, -1 = left. The motion's last frame holds until the
// next play() (hop-off stays gone until pop-in). Reduced motion: nothing
// moves; the runaway bulb still shows the motion's final eyes.
export function play(el, motion, { dir = 1 } = {}) {
  if (!MOTIONS.includes(motion)) return Promise.resolve();
  if (reducedMotion()) {
    face(el, motion, dir, true);
    return Promise.resolve();
  }
  el.style.setProperty('--dir', dir);
  MOTIONS.forEach((m) => el.classList.remove(`bulb--${m}`));
  void el.offsetWidth; // restart when the same motion plays twice in a row
  el.classList.add(`bulb--${motion}`);
  face(el, motion, dir, false);
  return new Promise((resolve) => {
    const done = (e) => {
      if (e.target !== el) return;
      el.removeEventListener('animationend', done);
      resolve();
    };
    el.addEventListener('animationend', done);
  });
}
