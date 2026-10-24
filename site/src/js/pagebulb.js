// The runaway idea on a game page (step G5 + 7): the SVG twin (js/bulb.js),
// always one hop ahead of the visitor.
//   Frame: once the screenshot frame is in view, it rises from behind the
//     frame's top edge, looks the screenshot over, widens its eyes at the
//     next one, then ducks.
//   Next: behind the "Next" card's top edge, peeking, waiting for you. Reach
//     for it and it ducks, then peeks out at the other end with a wink. It
//     is never caught.
//   Quiet pages (Storm Alert): it sits still on the frame with a soft glow,
//     no gag, no reactions, no Next.
// Clicks pass through it; a clip at the edge hides whatever is behind it.
// Reduced motion: no frame beat; it waits behind Next, still.
// rest.js stands down while this bulb is on screen (one bulb at a time).
import { reducedMotion } from './motion.js';
import { sfx } from './sound.js';

const QUIET = new Set(['storm-alert']);
const SIZE = 56; // px, bulb width (40 on small screens)
const UP = 0.2; // risen: this share of its height stays behind the edge
const NEXT_UP = 0.3; // behind Next: a little lower, eyes just clear of the edge
const START_MS = 900; // the page deals in and the frame slams first
const LOOK_MS = 4200; // no next screenshot by then: it ducks anyway
const REACH = 60; // pointer path this close to its middle = reaching for it
const TAP_REACH = 80;
const AGAIN_MS = 650; // ducked: comes up at the other end after this

let kit = null;
const load = () => (kit ||= Promise.all([import('./bulb.js'), import('../styles/bulb.css')]).then(([m]) => m));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const visible = (el, share) => {
  const r = el.getBoundingClientRect();
  return r.height && Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) >= r.height * share;
};

// A clipped spot on top of an element's top edge, holding one bulb
function spot(host, cls, m) {
  const w = innerWidth < 640 ? 40 : SIZE;
  const el = m.makeBulb({ size: w, eyes: true });
  const box = document.createElement('div');
  box.className = `pagebulb ${cls}`;
  box.setAttribute('aria-hidden', 'true');
  box.style.setProperty('--w', `${w}px`);
  const lift = document.createElement('div');
  lift.className = 'pagebulb__lift';
  lift.append(el);
  box.append(lift);
  host.append(box);
  return { box, lift, el, h: w * 1.1 };
}

// Up to a share hidden, or all the way down (1)
function move(b, hidden, ms, easing) {
  const to = `translateY(${(hidden * 100).toFixed(1)}%)`;
  if (reducedMotion() || !ms) {
    b.lift.style.transform = to;
    return Promise.resolve();
  }
  const a = b.lift.animate([{ transform: getComputedStyle(b.lift).transform }, { transform: to }], { duration: ms, easing, fill: 'forwards' });
  return a.finished.then(() => {
    b.lift.style.transform = to;
    a.cancel();
  });
}

export function initPageBulb(root) {
  const html = document.documentElement;
  const slug = root?.dataset.slug;
  const media = root?.querySelector('.page__media');
  const next = root?.querySelector('.page__nav--next');
  if (!slug || (!media && !next)) return;
  const quiet = QUIET.has(slug);
  const ready = () => !html.classList.contains('grow-in') && !html.classList.contains('wipe-in');
  let state = 'waiting'; // waiting, frame, next, quiet
  let frame = null;
  let behind = null;
  const t0 = performance.now();

  /* ---------- quiet: sits on the frame, still, soft glow ---------- */
  async function sit() {
    state = 'quiet';
    const m = await load();
    frame = spot(media, 'pagebulb--frame pagebulb--quiet', m);
    move(frame, 1, 0);
    void frame.lift.offsetWidth;
    move(frame, UP, 900, 'cubic-bezier(0.22, 1, 0.36, 1)');
  }

  /* ---------- frame: peeks at the screenshots, then ducks ---------- */
  async function peek() {
    state = 'frame';
    const m = await load();
    const f = (frame = spot(media, 'pagebulb--frame', m));
    move(f, 1, 0);
    void f.lift.offsetWidth;
    await move(f, UP, 460, 'cubic-bezier(0.34, 1.56, 0.64, 1)');
    if (frame !== f) return; // scrolled away mid-rise: it already ducked
    m.play(f.el, 'curious', { dir: -1 });
    // The next screenshot (auto or a thumbnail): eyes go wide, a little hop
    const shots = [...media.querySelectorAll('.page__screen .banner__shot')];
    const seen = await Promise.race([
      wait(LOOK_MS),
      new Promise((res) => {
        if (shots.length < 2) return;
        const mo = new MutationObserver(() => {
          mo.disconnect();
          res(true);
        });
        shots.forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ['class'] }));
      }),
    ]);
    if (frame !== f) return;
    if (seen) {
      await wait(500); // the punch of the new screenshot lands first
      if (frame !== f) return;
      m.look(f.el, 'wide');
      f.lift.animate([{ translate: '0 0' }, { translate: '0 -14%' }, { translate: '0 0' }], { duration: 320, easing: 'ease-out' });
      await wait(900);
    }
    if (frame === f) await duck();
  }

  async function duck() {
    if (!frame) return;
    const f = frame;
    frame = null;
    await move(f, 1, 260, 'cubic-bezier(0.5, 0, 0.75, 0)');
    f.box.remove();
    state = 'next';
    check();
  }

  /* ---------- next: peeks from behind the Next card ---------- */
  let side = 1; // 1 = right end of the card's top edge, -1 = left end
  let busy = false;
  async function wait4you() {
    if (!next) return;
    state = 'behind';
    const m = await load();
    behind = spot(next, 'pagebulb--next', m);
    behind.box.dataset.side = side;
    move(behind, 1, 0);
    void behind.lift.offsetWidth;
    await move(behind, NEXT_UP, 420, 'cubic-bezier(0.34, 1.56, 0.64, 1)');
    m.look(behind.el, 'open', -side * 0.6); // eyes toward the card's middle
  }

  // Reached for: ducks, then comes up at the other end of the edge, winking
  async function dodge() {
    if (busy || !behind) return;
    busy = true;
    const m = await load();
    sfx.thump();
    await move(behind, 1, 220, 'cubic-bezier(0.5, 0, 0.75, 0)');
    await wait(AGAIN_MS);
    side = -side;
    behind.box.dataset.side = side;
    await move(behind, NEXT_UP, 380, 'cubic-bezier(0.34, 1.56, 0.64, 1)');
    m.look(behind.el, 'wink', -side * 0.6);
    await wait(700);
    m.look(behind.el, 'open', -side * 0.6);
    busy = false;
  }

  const middle = () => {
    const r = behind.el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  let px = -1;
  let py = -1;
  addEventListener(
    'pointermove',
    (e) => {
      const [ax, ay] = px < 0 ? [e.clientX, e.clientY] : [px, py];
      px = e.clientX;
      py = e.clientY;
      if (!behind || busy || reducedMotion() || e.pointerType !== 'mouse') return;
      const [bx, by] = middle();
      const dx = px - ax;
      const dy = py - ay;
      const k = Math.max(0, Math.min(1, ((bx - ax) * dx + (by - ay) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(ax + dx * k - bx, ay + dy * k - by) < REACH) dodge();
    },
    { passive: true },
  );
  addEventListener('pointerdown', (e) => {
    if (!behind || busy || reducedMotion()) return;
    const [bx, by] = middle();
    if (Math.hypot(e.clientX - bx, e.clientY - by) < (e.pointerType === 'mouse' ? REACH : TAP_REACH)) dodge();
  });

  /* ---------- what plays when ---------- */
  function check() {
    if (!ready() || performance.now() - t0 < START_MS) return;
    if (state === 'waiting') {
      if (quiet) {
        if (media && visible(media, 0.5)) sit();
        return;
      }
      // The frame beat plays only while the frame is in view; scrolled past
      // it (or reduced motion): straight to the Next card
      if (media && !reducedMotion() && visible(media, 0.6)) peek();
      else if (!media || reducedMotion() || media.getBoundingClientRect().bottom < 0) state = 'next';
    }
    if (state === 'frame' && frame && !visible(media, 0.2)) duck();
    if (state === 'next' && next && visible(next, 0.9)) wait4you();
  }
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check, { passive: true });
  const timer = setInterval(() => {
    check();
    if (state === 'behind' || state === 'quiet') clearInterval(timer);
  }, 250);

  // Test hook: ?debug exposes the state (headless tests only)
  if (new URLSearchParams(location.search).has('debug')) {
    window.__pagebulb = { state: () => state, side: () => side, busy: () => busy };
  }
}
