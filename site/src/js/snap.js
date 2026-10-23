// Section snap on the home page. Stops: the landing, the top of Featured,
// each further Featured banner (centred), and the top of All games. One
// scroll step moves to the next stop with a glide. Past All games (a long
// grid) the page scrolls freely again. A gap between two stops that is
// taller than ~1.15 screens (e.g. a banner on a small phone) is also free,
// so nothing can be skipped.
// Wheel and trackpad snap once a real scroll gesture adds up (WHEEL_MIN px):
// a resting finger on a trackpad or Magic Mouse sends tiny wheel events, and
// those must not move the page a whole screen. Touch, keys and the scroll car
// snap when the scroll comes to rest between two stops; a small drift with
// no input behind it (under DRIFT of a screen) settles back to its stop.
import { juicy } from './motion.js';

const SNAP_MS = 650;
const SETTLE_MS = 450; // wheel/trackpad momentum ignored this long after a snap
const MAX_GAP = 1.15; // screens
const WHEEL_MIN = 40; // px of wheel delta before a snap starts
const WHEEL_RESET_MS = 220; // a pause this long starts a new gesture
const DRIFT = 0.15; // screens
const LAUNCH_MS = 1150; // the See-games launch (entrance.js) drives the scroll itself
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function initSnap() {
  const featured = document.querySelector('#featured');
  const games = document.querySelector('#games');
  if (!featured || !games) return;
  const html = document.documentElement;

  // Layout position (ignores transforms, so banners mid slide-in measure right)
  const top = (el) => {
    let y = 0;
    for (let e = el; e; e = e.offsetParent) y += e.offsetTop;
    return y;
  };
  function stops() {
    const s = [0, top(featured)];
    [...featured.querySelectorAll('.banner')].slice(1).forEach((b) => {
      s.push(Math.max(s[s.length - 1], top(b) + b.offsetHeight / 2 - innerHeight / 2));
    });
    s.push(top(games));
    return s.map(Math.round);
  }
  const fits = (a, b) => b - a <= innerHeight * MAX_GAP;

  let snapping = false;
  let settleUntil = 0;
  let launchUntil = 0;
  window.addEventListener('entrance:windup', () => (launchUntil = performance.now() + LAUNCH_MS));
  // car-cam: the screen is scrolling along with the chasing car (hero3d.js)
  const busy = () => snapping || performance.now() < launchUntil || html.classList.contains('car-cam');

  function glide(y) {
    if (!juicy()) return window.scrollTo(0, y);
    snapping = true;
    const start = scrollY;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min((t - t0) / SNAP_MS, 1);
      window.scrollTo(0, start + (y - start) * easeInOut(k));
      if (k < 1) requestAnimationFrame(step);
      else {
        snapping = false;
        settleUntil = performance.now() + SETTLE_MS;
      }
    };
    requestAnimationFrame(step);
  }

  // Next stop in a direction, or null when that stretch scrolls freely
  function target(dir) {
    const s = stops();
    const y = scrollY;
    if (dir > 0) {
      const next = s.find((p) => p > y + 1);
      const from = [...s].reverse().find((p) => p <= y + 1);
      return next !== undefined && from !== undefined && fits(from, next) ? next : null;
    }
    const prev = [...s].reverse().find((p) => p < y - 1);
    const upTo = s.find((p) => p >= y - 1);
    return prev !== undefined && upTo !== undefined && fits(prev, upTo) ? prev : null;
  }

  let wheelSum = 0;
  let wheelAt = 0;
  window.addEventListener(
    'wheel',
    (e) => {
      if (!html.classList.contains('entered') || performance.now() < launchUntil || !e.deltaY) return;
      const inSnapZone = scrollY < top(games) + 2;
      if (snapping || performance.now() < settleUntil) {
        if (inSnapZone) e.preventDefault();
        return;
      }
      const y = target(Math.sign(e.deltaY));
      if (y === null) return;
      e.preventDefault();
      const now = performance.now();
      if (now - wheelAt > WHEEL_RESET_MS || Math.sign(e.deltaY) !== Math.sign(wheelSum)) wheelSum = 0;
      wheelAt = now;
      wheelSum += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (Math.abs(wheelSum) < WHEEL_MIN) return;
      wheelSum = 0;
      glide(y);
    },
    { passive: false },
  );

  // Touch, keys, scroll car: snap once the scroll rests between two stops
  let inputAt = -1e9;
  ['keydown', 'pointerdown', 'touchmove'].forEach((t) => window.addEventListener(t, () => (inputAt = performance.now()), { passive: true }));
  let lastY = scrollY;
  let dir = 1;
  let rest = 0;
  window.addEventListener(
    'scroll',
    () => {
      if (scrollY !== lastY) dir = scrollY > lastY ? 1 : -1;
      lastY = scrollY;
      if (busy()) return;
      clearTimeout(rest);
      rest = setTimeout(() => {
        if (busy() || !html.classList.contains('entered')) return;
        const s = stops();
        if (s.some((p) => Math.abs(p - scrollY) <= 1)) return; // already on a stop
        // Small drift nobody asked for (no key, touch or click just before):
        // back to the stop it left
        const near = s.reduce((a, p) => (Math.abs(p - scrollY) < Math.abs(a - scrollY) ? p : a), s[0]);
        const asked = performance.now() - inputAt < 800;
        if (!asked && Math.abs(near - scrollY) < innerHeight * DRIFT && scrollY < top(games) + 2) return glide(near);
        const y = target(dir);
        if (y !== null) glide(y);
      }, 140);
    },
    { passive: true },
  );
}
