// The ending (step 8b): the idea that got away is caught once, after the
// visitor has seen every page (home, About, every game page, over any number
// of visits). On the page that completes the set it drops into the middle of
// the screen and stays put: "Okay. You got me." Reach for it (or, on the home
// page, drive the car into it: hero3d.js) and it lights up, squashes flat and
// flips over into a blank card: "Got an idea? Email me". The 24th
// achievement ("Eureka") unlocks when the card closes.
// From then on it is calm: every bulb on every page lets itself be caught
// and flies into the email button at the bottom; the first catch of a visit
// opens the "Got an idea? Reach out!" card from there. The email button
// opens the same card.
// Modes: 'chase' (the set is not complete: the bulbs run, as before),
// 'ending' (complete, not caught yet), 'calm' (caught).
// A quiet page (Storm Alert) never plays the ending: it waits for the next.
import data from '../data/games.json';
import { act, readStats, unlocked } from './achievements.js';
import { burst } from './burst.js';
import { initJuicyButton } from './button.js';
import { sendShock } from './dotgrid.js';
import { EMAIL, copyText } from './mail.js';
import { juicy } from './motion.js';
import { sfx } from './sound.js';

export const QUIET = new Set(['storm-alert']); // game pages with no gag (pagebulb.js)
const GAMES = data.games.filter((g) => !g.hidden).map((g) => g.slug);
const PAGES = 2 + GAMES.length; // home, About and every game page
const CAUGHT = 'apf-idea'; // localStorage: caught (saved at once; the achievement waits for the card to close)
const CARD = 'apf-idea-card'; // sessionStorage: the card showed this visit
const START_MS = 900; // the page deals in first
const SAY_MS = 2600;
const REACH = 70; // pointer path this close to its middle = reaching for it
const TAP_REACH = 100;
const TOP = 72; // keep clear of the toast...
const BOTTOM = 96; // ...and the bottom corner buttons
export const ENDING_LINE = 'Okay. You got me.';

let kit = null;
const load = () => (kit ||= Promise.all([import('./bulb.js'), import('../styles/bulb.css')]).then(([m]) => m));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (store, k) => {
  try {
    return store.getItem(k);
  } catch {
    return null;
  }
};
const set = (store, k) => {
  try {
    store.setItem(k, '1');
  } catch {}
};

// Which of the 16 pages this is: 'home', 'about', a game's slug, or null
function thisPage() {
  const path = location.pathname;
  if (path === '/' || path.endsWith('/index.html')) return 'home';
  if (path.endsWith('/about.html')) return 'about';
  const slug = path.match(/\/games\/([^/]+)\.html$/)?.[1];
  return GAMES.includes(slug) ? slug : null;
}

let mode = null;
export function ideaMode() {
  if (mode) return mode;
  if (new URLSearchParams(location.search).has('reset-achievements')) {
    try {
      localStorage.removeItem(CAUGHT);
    } catch {}
  }
  if (get(localStorage, CAUGHT) || unlocked().caught) return (mode = 'calm');
  const s = readStats();
  const seen = (s.home ? 1 : 0) + (unlocked().about ? 1 : 0) + GAMES.filter((g) => s.games.includes(g)).length;
  mode = seen >= PAGES && !QUIET.has(thisPage()) ? 'ending' : 'chase';
  return mode;
}

// A fixed, click-through layer for the bulbs of the ending and the flight
let layerEl = null;
function layer() {
  if (!layerEl) {
    layerEl = document.createElement('div');
    layerEl.className = 'idea-layer';
    layerEl.setAttribute('aria-hidden', 'true');
    document.body.append(layerEl);
  }
  return layerEl;
}

function bulbBox(m, x, y, w) {
  const el = m.makeBulb({ size: w, eyes: true });
  const box = document.createElement('span');
  box.className = 'idea-bulb';
  box.style.translate = `${(x - w / 2).toFixed(1)}px ${(y - w * 0.55).toFixed(1)}px`;
  box.append(el);
  layer().append(box);
  return { box, el };
}

/* ---------- caught: the card (ending), or into the email button (calm) ---------- */

// Any bulb that lets itself be caught hands over here: its middle on the
// screen and its width. It is gone from its own page part by then.
export async function caughtIdea(x, y, w = 56) {
  const ending = ideaMode() === 'ending';
  mode = 'calm';
  const m = await load();
  if (ending) {
    set(localStorage, CAUGHT);
    const { box, el } = bulbBox(m, x, y, w);
    sfx.ding();
    if (juicy()) {
      // Lights up (rays and glow), sparks; squashes flat; flips into the card
      el.classList.add('idea-bulb--lit');
      burst(x, y, 24);
      sendShock(x, y, 1.6);
      await box.animate([{ scale: '1' }, { scale: '1.35' }, { scale: '1.2' }], { duration: 320, easing: 'ease-out' }).finished;
      await box.animate([{ scale: '1.2' }, { scale: '1.5 0.06' }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).finished;
    }
    box.remove();
    openCard('ending', { x, y });
    return;
  }
  const mail = document.querySelector('.mail-btn');
  const r = mail?.getBoundingClientRect();
  const [tx, ty] = r?.width ? [r.left + r.width / 2, r.top + r.height / 2] : [innerWidth - 40, innerHeight - 40];
  if (juicy()) {
    // An arc into the email button, shrinking and spinning; the button bumps
    const { box } = bulbBox(m, x, y, w);
    const cx = (x + tx) / 2;
    const cy = Math.min(y, ty) - 140;
    const frames = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tx;
      const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ty;
      frames.push({ transform: `translate(${(px - x).toFixed(1)}px, ${(py - y).toFixed(1)}px) scale(${(1 - 0.7 * t).toFixed(2)}) rotate(${(t * 360).toFixed(0)}deg)`, opacity: t > 0.9 ? 0 : 1 });
    }
    sfx.whoosh();
    await box.animate(frames, { duration: 700, easing: 'ease-in-out', fill: 'forwards' }).finished;
    box.remove();
    mail?.animate([{ scale: '1' }, { scale: '1.3' }, { scale: '0.95' }, { scale: '1' }], { duration: 380, easing: 'ease-out' });
    burst(tx, ty, 10);
    sfx.boing();
  }
  if (get(sessionStorage, CARD)) return;
  await wait(juicy() ? 200 : 0);
  openCard('reach', { x: tx, y: ty });
}

/* ---------- the card ---------- */

let dlg = null;
let pending = false; // the ending's achievement, unlocked once its card closes

// What fills the card's empty frame: a question mark (Ahmed's pick over an
// envelope, 25 Oct)
const MARK = '<span class="idea-mark">?</span>';

// mail.js imports this module too: EMAIL is read here, never at load
function makeCard() {
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}`;
  const outlook = `https://outlook.live.com/mail/0/deeplink/compose?to=${EMAIL}`;
  dlg = document.createElement('dialog');
  dlg.className = 'idea-card';
  dlg.setAttribute('aria-labelledby', 'idea-card-title');
  dlg.tabIndex = -1; // focus lands on the card itself (openCard), Tab goes to "Email me": no ring on a mouse open
  dlg.innerHTML = `
    <div class="idea-card__face">
      <div class="idea-card__blank" aria-hidden="true">${MARK}</div>
      <h2 class="idea-card__title" id="idea-card-title"></h2>
      <a class="juicy-btn idea-card__mail" href="mailto:${EMAIL}">Email me</a>
      <p class="idea-card__more">
        <a href="${gmail}" target="_blank" rel="noopener">Gmail</a>
        <a href="${outlook}" target="_blank" rel="noopener">Outlook</a>
        <button type="button" class="idea-card__copy">Copy address</button>
      </p>
      <p class="idea-card__addr">${EMAIL}</p>
      <button type="button" class="idea-card__close" aria-label="Close">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>`;
  document.body.append(dlg);
  initJuicyButton(dlg.querySelector('.idea-card__mail'));
  // mailto links count through achievements.js; the webmail ones here
  dlg.querySelectorAll('.idea-card__more a').forEach((a) => a.addEventListener('click', () => act('contact')));
  const copy = dlg.querySelector('.idea-card__copy');
  copy.addEventListener('click', async () => {
    sfx.press();
    if (!(await copyText(EMAIL))) return;
    act('contact');
    copy.textContent = 'Copied!';
    setTimeout(() => (copy.textContent = 'Copy address'), 1800);
  });
  dlg.querySelector('.idea-card__close').addEventListener('click', () => dlg.close());
  // A click on the dimmed page around the card closes it
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
  dlg.addEventListener('close', () => {
    if (!pending) return;
    pending = false;
    act('caught');
  });
}

// kind: 'ending' ("Got an idea?") or 'reach' ("Got an idea? Reach out!");
// from: the screen point it grows out of
export function openCard(kind, from) {
  if (!dlg) makeCard();
  if (dlg.open) return;
  set(sessionStorage, CARD);
  if (kind === 'ending') pending = true;
  dlg.querySelector('.idea-card__title').textContent = kind === 'ending' ? 'Got an idea?' : 'Got an idea? Reach out!';
  dlg.dataset.kind = kind;
  dlg.showModal();
  dlg.focus();
  sfx.riffle();
  if (!juicy()) return;
  const face = dlg.querySelector('.idea-card__face');
  const r = face.getBoundingClientRect();
  const dx = from ? from.x - (r.left + r.width / 2) : 0;
  const dy = from ? from.y - (r.top + r.height / 2) : 0;
  face.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotateY(${kind === 'ending' ? -90 : 0}deg)`, opacity: 0.6 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 560, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  );
}

/* ---------- the ending's bulb: drops in on the page that completes the set ---------- */

// A free place near the middle of the screen: off text, pictures, links and
// buttons, with room for its line above it. None: the middle anyway (it lets
// clicks through).
const CONTENT = 'p, h1, h2, h3, li, img, video, a, button, figure, article, label, .chip, .page__media';
function middleSpot(w, h) {
  const boxes = [...document.querySelectorAll(CONTENT)]
    .map((n) => n.getBoundingClientRect())
    .filter((q) => q.width && q.height && q.bottom > 0 && q.top < innerHeight);
  const mx = innerWidth / 2;
  const my = innerHeight / 2;
  const fits = (x, y) => boxes.every((q) => x + w / 2 + 8 < q.left || x - w / 2 - 8 > q.right || y + h / 2 + 8 < q.top || y - h / 2 - 44 > q.bottom);
  const list = [];
  for (let y = TOP + h / 2 + 40; y <= innerHeight - BOTTOM - h / 2; y += 24) {
    for (let x = w / 2 + 16; x <= innerWidth - w / 2 - 56; x += 24) list.push([x, y, Math.hypot(x - mx, (y - my) * 1.4)]);
  }
  list.sort((p, q) => p[2] - q[2]);
  return list.find(([x, y]) => fits(x, y)) || [mx, my];
}

export function initIdea() {
  const html = document.documentElement;
  const debug = new URLSearchParams(location.search).has('debug');
  let state = 'off'; // off, coming, near, caught
  let b = null;
  if (debug) window.__idea = { mode: ideaMode, state: () => state, bulb: () => b && { x: b.x, y: b.y, w: b.w } };
  if (!thisPage() || ideaMode() !== 'ending') return;
  const ready = () => !['wipe-in', 'grow-in', 'pre-entry'].some((c) => html.classList.contains(c)) && !document.hidden;

  async function dropIn() {
    if (html.classList.contains('has-guide')) return; // the home page's 3D runaway is the one (hero3d.js)
    if (!ready()) return void setTimeout(dropIn, 250);
    state = 'coming';
    const m = await load();
    const w = innerWidth < 640 ? 52 : 64;
    const [x, y] = middleSpot(w, w * 1.1);
    const { box, el } = bulbBox(m, x, y, w);
    box.classList.add('beatbulb'); // rest.js keeps its bulb away
    const say = document.createElement('span');
    say.className = 'guide-say idea-say';
    say.append(document.createElement('span'));
    say.firstChild.textContent = ENDING_LINE;
    say.style.translate = `${x.toFixed(1)}px ${(y - w * 0.55 - 6).toFixed(1)}px`;
    layer().append(say);
    b = { box, el, say, x, y, w };
    await m.play(el, 'drop-in');
    if (state !== 'coming') return;
    state = 'near';
    say.classList.add('is-on');
    setTimeout(() => say.classList.remove('is-on'), SAY_MS);
  }

  function caught() {
    state = 'caught';
    b.box.remove();
    b.say.remove();
    caughtIdea(b.x, b.y, b.w);
  }

  // Reaching: the pointer's path since the last move passes close to it (rest.js)
  let px = -1;
  let py = -1;
  addEventListener(
    'pointermove',
    (e) => {
      const [ax, ay] = px < 0 ? [e.clientX, e.clientY] : [px, py];
      px = e.clientX;
      py = e.clientY;
      if (state !== 'near' || e.pointerType !== 'mouse') return;
      const dx = px - ax;
      const dy = py - ay;
      const k = Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.y - ay) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(ax + dx * k - b.x, ay + dy * k - b.y) < REACH) caught();
    },
    { passive: true },
  );
  addEventListener('pointerdown', (e) => {
    if (state === 'near' && Math.hypot(e.clientX - b.x, e.clientY - b.y) < (e.pointerType === 'mouse' ? REACH : TAP_REACH)) caught();
  });

  setTimeout(dropIn, START_MS);
}
