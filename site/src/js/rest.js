// Rest when you rest: the runaway idea only comes close when the visitor stops
// chasing. After REST_MS with no pointer, scroll or key input it turns up at a
// random free spot: anywhere in the empty strips beside the page, or (phones,
// narrow windows: no strip wide enough) peeking from a side edge at a row with
// the least page under it. It comes in a random way (tiptoes in, drops in,
// pops in, slides out), never the same spot area or entrance twice in a row,
// even across pages. Then it edges a few hops toward the cursor's height.
// Reach for it and it hops off by a hair (the visitor's line in the car's ink
// bubble: "So close!"); scroll, type or stay busy elsewhere and it tiptoes
// away. At most once per COOLDOWN_MS. Still for long: it nods off.
// The landing game has its own version (hero3d.js: the 3D runaway creeps up on
// the parked car), so this one waits while the landing fills the screen. On
// the home page with the 3D guide (html.has-guide) it stays off: the guide
// rests with the visitor instead.
// The bulb (js/bulb.js and its CSS) loads on the first rest, not before.
import { reducedMotion } from './motion.js';
import { sfx } from './sound.js';

export const REST_MS = 4000; // no input this long = the visitor has stopped
const COOLDOWN_MS = 30000; // reading looks like resting: not every pause
const SIZE = 64; // px, bulb width (52 on small screens)
const STEP_MS = 1000; // one hop closer every...
const STEP = 34; // ...this far at most
const HOPS = 4; // ...for this many hops at most
const GAP = 120; // stops this far from the cursor
const REACH = 70; // pointer this close to its middle = reaching for it
const TAP_REACH = 100; // touch: a tap this close
const LEAVE_MS = 5000; // visitor busy elsewhere this long: it tiptoes away
const SLEEP_MS = 12000; // arrived and still this long: it nods off
const SHOUT_MS = 1800;
const TOP = 72; // keep clear of the toast...
const BOTTOM = 96; // ...and the bottom corner buttons

/* ---------- input: when did the visitor last do anything? ---------- */
let lastInput = performance.now();
const pointer = { x: -1, y: -1 };
const poke = () => (lastInput = performance.now());
['pointerdown', 'wheel', 'scroll', 'keydown', 'touchstart'].forEach((t) => window.addEventListener(t, poke, { passive: true }));
window.addEventListener(
  'pointermove',
  (e) => {
    poke();
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  },
  { passive: true },
);

export const stillFor = () => performance.now() - lastInput;

// The shelves' own runaway (shelfbulb.js) is the one on screen: no second one
const shelfHolds = () => {
  const b = document.querySelector('.shelf-bulb');
  if (!b) return false;
  const r = b.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};

// The landing's runaway is on screen (any part of the landing showing): one
// runaway at a time
const landingRunaway = () => {
  const c = document.querySelector('.hero-3d[data-runaway]');
  if (!c) return false;
  const r = c.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};

// The landing game owns the rest while it fills most of the screen
export function landingHolds() {
  const c = document.querySelector('.entrance');
  return !!c && c.getBoundingClientRect().bottom > innerHeight * 0.35;
}

/* ---------- where it can go: empty strips beside the page ---------- */
// A point is empty when only page structure is under it (no text, picture,
// card or button); off-screen and click-through things do not count
const OPEN = /^(HTML|BODY|MAIN|SECTION|HEADER|FOOTER)$/;
const open = (x, y) => {
  const el = document.elementFromPoint(x, y);
  return !el || OPEN.test(el.tagName);
};
const CONTENT = 'p, h1, h2, h3, li, img, video, a, button, figure, article, label, .chip';
const road = () => (document.documentElement.classList.contains('has-scrollcar') ? 40 : 0);
const edgeX = (side) => (side < 0 ? 0 : innerWidth - road());

// Width of the empty strip at height y on one side (-1 left, 1 right), for a
// bulb h tall; measures no further than max
function band(side, y, h, max = 360) {
  const edge = edgeX(side);
  let w = 0;
  while (w < max) {
    const x = edge - side * (w + 2);
    if (![y - h * 0.45, y, y + h * 0.45].every((yy) => open(x, yy))) break;
    w += 4;
  }
  return w;
}

let kit = null;
const load = () => (kit ||= Promise.all([import('./bulb.js'), import('../styles/bulb.css')]).then(([m]) => m));

// How it comes in, by kind of spot; sneak needs the strip's outer edge
const ENTRANCES = { strip: ['sneak', 'drop-in', 'pop-in'], peek: ['slide', 'drop-in', 'pop-in'] };
const pick = (list) => list[Math.floor(Math.random() * list.length)];
// The last spot and entrance, for the whole visit (all pages): never twice in a row
const LAST = 'apf-rest-last';
const recall = () => {
  try {
    return JSON.parse(sessionStorage.getItem(LAST)) || {};
  } catch {
    return {};
  }
};
const remember = (v) => {
  try {
    sessionStorage.setItem(LAST, JSON.stringify(v));
  } catch {}
};

export function initRest() {
  const html = document.documentElement;
  let state = 'off'; // off, coming, near, gone
  let b = null; // the bulb on screen: { el, wrap, hop, x, y, w, h, in, peek }
  let readyAt = 0;
  let nextStep = 0;
  let busySince = 0;
  let arrivedAt = 0;
  let asleep = false;
  let play = null;

  const layer = document.createElement('div');
  layer.className = 'rest-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  const blocked = () =>
    document.hidden ||
    html.classList.contains('has-guide') ||
    html.classList.contains('pre-entry') ||
    html.classList.contains('wipe-in') ||
    !!document.querySelector('.lightbox:not([hidden])') ||
    html.classList.contains('runaway-shown') || // the landing's runaway is on the screen, out on the page (hero3d.js)
    shelfHolds() ||
    landingRunaway() ||
    landingHolds();

  const clampY = (y, h) => Math.min(Math.max(y, TOP + h / 2), innerHeight - BOTTOM - h / 2);
  const targetY = () => clampY(pointer.y >= 0 ? pointer.y : innerHeight * 0.6, b.h);
  // Bulb middle for the strip at its height: fully in the strip, or (peek)
  // poking 40% of itself out from the edge, leaning in (rest.css) so its
  // eyes clear the edge
  const xFor = (room) => edgeX(-b.in) + b.in * (b.peek ? b.w * 0.4 - b.w / 2 : room - 16 - b.w / 2);

  // Every free spot on screen now: rows down both sides where the empty strip
  // fits the bulb. None (phones, narrow windows): the rows at either edge with
  // the least page under the part a peek shows (gaps between blocks), measured
  // against the boxes of text, pictures and buttons (a point test misses
  // rounded corners).
  function spots(w, h) {
    const top = TOP + h / 2;
    const bottom = innerHeight - BOTTOM - h / 2;
    const strip = [];
    for (const side of [-1, 1]) {
      for (let y = top; y <= bottom; y += 24) if (band(side, y, h, w + 24) >= w + 24) strip.push({ side, y, peek: false });
    }
    if (strip.length) return strip;
    const boxes = [...document.querySelectorAll(CONTENT)]
      .filter((n) => !n.closest('.rest-layer'))
      .map((n) => n.getBoundingClientRect())
      .filter((q) => q.width && q.height && q.bottom > 0 && q.top < innerHeight);
    const shows = w * 0.4 + 12; // the part that pokes out, lean included
    let best = Infinity;
    let out = [];
    for (const side of [-1, 1]) {
      const l = side < 0 ? 0 : edgeX(1) - shows;
      const r = l + shows;
      for (let y = top; y <= bottom; y += 8) {
        let area = 0;
        for (const q of boxes) area += Math.max(0, Math.min(r, q.right) - Math.max(l, q.left)) * Math.max(0, Math.min(y + h / 2, q.bottom) - Math.max(y - h / 2, q.top));
        if (area < best) {
          best = area;
          out = [];
        }
        if (area === best) out.push({ side, y, peek: true });
      }
    }
    return out;
  }

  function place(x, y, slide = true) {
    b.x = x;
    b.y = y;
    b.wrap.style.transition = slide ? '' : 'none';
    b.wrap.style.translate = `${(x - b.w / 2).toFixed(1)}px ${(y - b.h / 2).toFixed(1)}px`;
    if (!slide) void b.wrap.offsetWidth;
  }

  async function come() {
    state = 'coming';
    const m = await load();
    play = m.play;
    if (stillFor() < REST_MS || blocked()) {
      state = 'off';
      return;
    }
    const w = innerWidth < 640 ? 52 : SIZE;
    const h = w * 1.1;
    // A random free spot: not on top of the cursor, and not the same side and
    // third of the screen as last time (unless nothing else is free)
    const found = spots(w, h);
    if (!found.length) {
      state = 'off';
      readyAt = performance.now() + COOLDOWN_MS;
      return;
    }
    const last = recall();
    const clear = found.filter((s) => pointer.x < 0 || Math.hypot(edgeX(s.side) - pointer.x, s.y - pointer.y) > GAP);
    const pool = clear.length ? clear : found;
    const fresh = pool.filter((s) => s.side !== last.side || Math.abs(s.y / innerHeight - last.f) > 0.33);
    const { side, y, peek } = pick(fresh.length ? fresh : pool);
    const entrance = pick(ENTRANCES[peek ? 'peek' : 'strip'].filter((e) => e !== last.e));
    remember({ side, f: y / innerHeight, e: entrance });

    const el = m.makeBulb({ size: w, eyes: true });
    const wrap = document.createElement('div');
    wrap.className = 'rest';
    const hop = document.createElement('div');
    hop.className = 'rest__hop';
    hop.append(el);
    wrap.append(hop);
    layer.append(wrap);
    b = { el, wrap, hop, x: 0, y, w, h, in: -side, peek, hops: 0 };
    wrap.classList.toggle('rest--peek', b.peek);
    wrap.style.setProperty('--in', b.in);
    // Peek: its edge spot. Strip: anywhere across it (sneak: from its outer
    // edge, where it walks in from off-screen)
    const outer = edgeX(side) + b.in * (8 + w / 2);
    const x = peek ? xFor(0) : entrance === 'sneak' ? outer : outer + (xFor(band(side, y, h)) - outer) * Math.random();
    arrivedAt = 0;
    asleep = false;
    busySince = 0;
    if (reducedMotion()) {
      place(x, y, false);
    } else if (entrance === 'sneak') {
      // Tiptoes in from off-screen (sneak travels 190% of its width)
      place(x - b.in * w * 1.9, y, false);
      await play(el, 'sneak', { dir: b.in });
      if (state !== 'coming') return;
      place(x, y, false);
      el.classList.remove('bulb--sneak');
    } else if (entrance === 'slide') {
      // Slides out from behind the edge and looks about
      place(edgeX(side) - b.in * w * 0.75, y, false);
      place(x, y);
      await play(el, 'curious', { dir: b.in });
    } else {
      // Drops in from above, or pops up on the spot
      place(x, y, false);
      await play(el, entrance, { dir: b.in });
    }
    if (state !== 'coming') return;
    el.style.setProperty('--look', b.in);
    state = 'near';
    nextStep = performance.now() + STEP_MS;
  }

  // One hop closer: toward the cursor's height, and in the strip as close to
  // the page as it allows. Stops after HOPS, GAP short of the cursor, or where
  // the strip gets too narrow. Peeking: it stays on its row.
  function edge(now) {
    nextStep = now + STEP_MS;
    if (b.peek || b.hops >= HOPS) {
      arrive(now);
      return;
    }
    const ty = targetY();
    const y = b.y + Math.min(Math.max(ty - b.y, -STEP), STEP);
    const room = band(-b.in, y, b.h);
    const goal = xFor(room);
    const x = b.in > 0 ? Math.min(goal, b.x + STEP) : Math.max(goal, b.x - STEP);
    const tooClose = pointer.x >= 0 && Math.hypot(x - pointer.x, y - pointer.y) < GAP;
    if (tooClose || room < b.w + 24 || (Math.abs(x - b.x) < 2 && Math.abs(y - b.y) < 2)) {
      arrive(now);
      return;
    }
    place(x, y);
    b.hops += 1;
    if (!reducedMotion()) {
      const lift = Math.min(16, 6 + Math.hypot(x - b.x, y - b.y) * 0.3);
      b.hop.animate(
        [
          { transform: 'none' },
          { transform: `translateY(${-lift}px) scale(0.94, 1.06)`, offset: 0.45 },
          { transform: 'scale(1.08, 0.92)', offset: 0.85 },
          { transform: 'none' },
        ],
        { duration: 420, easing: 'ease-in-out' },
      );
    }
  }

  function arrive(now) {
    if (arrivedAt) return;
    arrivedAt = now;
    const el = b.el;
    play(el, 'settle').then(() => el.style.setProperty('--look', b?.in ?? 0));
  }

  function remove(wrap) {
    wrap.remove();
    if (b?.wrap !== wrap) return;
    b = null;
    state = 'off';
    readyAt = performance.now() + COOLDOWN_MS;
  }

  // Reached for: hops off away from the hand, winking. Once it is gone, the
  // visitor's line at the pointer (where it is by then)
  function nearMiss(px, py) {
    state = 'gone';
    const { wrap } = b;
    play(b.el, 'hop-off', { dir: px > b.x ? -1 : 1 }).then(() => {
      remove(wrap);
      shout('So close!', pointer.x >= 0 ? pointer.x : px, pointer.y >= 0 ? pointer.y : py);
    });
    sfx.thump();
  }

  // Visitor moved on (scrolled, typed, busy elsewhere): tiptoes off, no line
  function leave() {
    const { wrap } = b;
    const fade = () => (wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = () => remove(wrap));
    if (state === 'coming') fade();
    else play(b.el, 'sneak', { dir: -b.in }).then(fade);
    state = 'gone';
  }

  function shout(text, x, y) {
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

  // Reaching: the pointer's path since the last move passes close to the bulb
  let px = -1;
  let py = -1;
  window.addEventListener(
    'pointermove',
    (e) => {
      const [ax, ay] = px < 0 ? [e.clientX, e.clientY] : [px, py];
      px = e.clientX;
      py = e.clientY;
      if (state !== 'near') return;
      const dx = px - ax;
      const dy = py - ay;
      const k = Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.y - ay) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(ax + dx * k - b.x, ay + dy * k - b.y) < REACH) nearMiss(px, py);
    },
    { passive: true },
  );
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }
    if (state === 'near' && Math.hypot(e.clientX - b.x, e.clientY - b.y) < (e.pointerType === 'mouse' ? REACH : TAP_REACH)) nearMiss(e.clientX, e.clientY);
  });
  const away = () => (state === 'near' || state === 'coming') && b && leave();
  ['scroll', 'wheel', 'keydown'].forEach((t) => window.addEventListener(t, away, { passive: true }));
  window.addEventListener('resize', () => b && state !== 'gone' && leave());

  setInterval(() => {
    const now = performance.now();
    if (state === 'off') {
      if (now >= readyAt && stillFor() >= REST_MS && !blocked()) come();
      return;
    }
    if (state !== 'near') return;
    // Busy (but not reaching for it): it wakes and holds still, then gives up
    // and goes. Rests again in time: it edges toward the cursor's new spot.
    if (stillFor() < 1000) {
      if (!busySince) {
        busySince = now;
        arrivedAt = 0;
        if (asleep) {
          asleep = false;
          play(b.el, 'curious', { dir: b.in });
        }
      }
      if (now - busySince > LEAVE_MS) leave();
      return;
    }
    busySince = 0;
    if (!arrivedAt && now >= nextStep) edge(now);
    if (arrivedAt && !asleep && now - arrivedAt > SLEEP_MS) {
      asleep = true;
      play(b.el, 'sleepy', { dir: -b.in }); // nods off leaning away from the page
    }
  }, 250);

  // Test hook: ?debug exposes the state (headless tests only)
  if (new URLSearchParams(location.search).has('debug')) {
    window.__rest = { state: () => state, bulb: () => b && { x: b.x, y: b.y, w: b.w, in: b.in, peek: b.peek, arrived: !!arrivedAt, asleep }, still: stillFor };
  }
}
