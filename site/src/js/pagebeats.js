// The runaway idea on About and the 404 page (step 8a), the SVG twin
// (js/bulb.js). Same character as everywhere: one hop ahead.
//   About: once per visit it pops up on the avatar's head, laughs (rays
//     flick) and hops off toward the next section. No words.
//   404: it sits in the middle, in its hiding spot: "You found my hiding
//     spot." Reach for it and it hops off by a hair: "So close!" (a near
//     miss, like resting).
// About's thesis section stays quiet: rest.js keeps away from [data-quiet].
// rest.js also stands down while one of these (.beatbulb) is on screen.
import { reducedMotion } from './motion.js';
import { sfx } from './sound.js';
import { act } from './achievements.js';

const START_MS = 900; // the page deals in first
const HEAD = 'apf-beat-head'; // sessionStorage: the head beat played this visit
const SAY_MS = 2600;
const SHOUT_MS = 1800;
const REACH = 60; // pointer path this close to its middle = reaching for it
const TAP_REACH = 80;

let kit = null;
const load = () => (kit ||= Promise.all([import('./bulb.js'), import('../styles/bulb.css')]).then(([m]) => m));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const inView = (el) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};

/* ---------- About: on the avatar's head, laughs, hops off ---------- */
export function initHeadBeat(avatar) {
  if (!avatar || reducedMotion()) return;
  try {
    if (sessionStorage.getItem(HEAD)) return;
  } catch {}
  let started = false;
  const go = async () => {
    if (started || !inView(avatar)) return;
    started = true;
    removeEventListener('scroll', go);
    try {
      sessionStorage.setItem(HEAD, '1');
    } catch {}
    const m = await load();
    const w = innerWidth < 640 ? 40 : 48;
    const el = m.makeBulb({ size: w, eyes: true });
    const box = document.createElement('span');
    box.className = 'beatbulb beatbulb--head';
    box.setAttribute('aria-hidden', 'true');
    box.append(el);
    // Sits on the head: its base dips into the top of the photo
    box.style.left = `${avatar.offsetLeft + avatar.offsetWidth / 2 - w / 2}px`;
    box.style.top = `${avatar.offsetTop - w * 1.1 * 0.82}px`;
    avatar.after(box);
    await m.play(el, 'pop-in');
    await wait(500);
    sfx.bubbles();
    await m.play(el, 'laugh');
    await m.play(el, 'hop-off', { dir: 1 });
    box.remove();
  };
  setTimeout(() => {
    go();
    if (!started) addEventListener('scroll', go, { passive: true });
  }, START_MS);
}

/* ---------- 404: the hiding spot ---------- */
export async function initHidingSpot(spot) {
  if (!spot) return;
  await wait(START_MS);
  const m = await load();
  const w = innerWidth < 640 ? 52 : 64;
  const el = m.makeBulb({ size: w, eyes: true });
  const box = document.createElement('span');
  box.className = 'beatbulb beatbulb--lost';
  box.append(el);
  const say = document.createElement('span');
  say.className = 'guide-say lost__say';
  say.append(document.createElement('span'));
  say.firstChild.textContent = 'You found my hiding spot.';
  spot.append(say, box);
  await m.play(el, 'drop-in');
  say.classList.add('is-on');
  setTimeout(() => say.classList.remove('is-on'), SAY_MS);

  let gone = false;
  const middle = () => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  // Reached for: hops off away from the hand, then the visitor's line at the
  // pointer in the car's ink bubble (rest.js has the same near miss)
  const miss = (x, y) => {
    if (gone) return;
    gone = true;
    say.classList.remove('is-on');
    sfx.thump();
    act('close');
    const [bx] = middle();
    m.play(el, 'hop-off', { dir: x > bx ? -1 : 1 }).then(() => {
      box.remove();
      shout('So close!', x, y);
    });
  };
  let px = -1;
  let py = -1;
  addEventListener(
    'pointermove',
    (e) => {
      const [ax, ay] = px < 0 ? [e.clientX, e.clientY] : [px, py];
      px = e.clientX;
      py = e.clientY;
      if (gone || e.pointerType !== 'mouse') return;
      const [bx, by] = middle();
      const dx = px - ax;
      const dy = py - ay;
      const k = Math.max(0, Math.min(1, ((bx - ax) * dx + (by - ay) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(ax + dx * k - bx, ay + dy * k - by) < REACH) miss(px, py);
    },
    { passive: true },
  );
  addEventListener('pointerdown', (e) => {
    if (gone) return;
    const [bx, by] = middle();
    if (Math.hypot(e.clientX - bx, e.clientY - by) < (e.pointerType === 'mouse' ? REACH : TAP_REACH)) miss(e.clientX, e.clientY);
  });
}

// "So close!" at the pointer, in rest.js's click-through layer
function shout(text, x, y) {
  const layer = document.querySelector('.rest-layer') || document.body;
  const s = document.createElement('span');
  s.className = 'car-bubble rest-shout';
  s.append(document.createElement('span'));
  s.firstChild.textContent = text;
  s.style.translate = `${Math.min(Math.max(x, 70), innerWidth - 70).toFixed(1)}px ${Math.max(y - 20, 44).toFixed(1)}px`;
  layer.append(s);
  void s.offsetWidth;
  s.classList.add('is-on');
  setTimeout(() => {
    s.classList.remove('is-on');
    setTimeout(() => s.remove(), 250);
  }, SHOUT_MS);
}
