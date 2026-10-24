// Achievements + XP bar. Saved in localStorage (no backend).
// Other modules report what the visitor did with act('name'); page visits,
// scrolling (end, speed), coming back, idling and night visits are watched here.
// One small toast at a time, top-right corner; XP bar is a 2 px line on top.
import data from '../data/games.json';
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { burst } from './burst.js';

const GAMES = data.games.filter((g) => !g.hidden).length;
const SHELVES = new Set(data.games.filter((g) => !g.hidden).map((g) => g.categories[0])).size;

// Browsing the work (games, stories, videos, me) plus a few playful ones.
export const LIST = [
  { id: 'enter', title: 'Press Start', text: 'Pressed the big button.' },
  { id: 'idea10', title: 'Bright Idea', text: 'Caught 10 ideas with the car.' },
  { id: 'storm', title: 'Brainstorm', text: 'Caught every idea but one.' },
  { id: 'peek', title: 'Sneak Peek', text: 'Peeked at 5 games.' },
  { id: 'tabs', title: 'Window Shopper', text: 'Browsed every shelf.' },
  { id: 'bottom', title: 'Rock Bottom', text: 'Scrolled to the very end.' },
  { id: 'speed', title: 'Speedrunner', text: 'Scrolled really, really fast.' },
  { id: 'game1', title: 'Curious', text: 'Opened a game page.' },
  { id: 'game5', title: 'Explorer', text: 'Opened 5 game pages.' },
  { id: 'gameAll', title: 'Completionist', text: 'Opened every game page.' },
  { id: 'video', title: 'Popcorn', text: 'Played a video.' },
  { id: 'about', title: "Who's This?", text: 'Visited the About page.' },
  { id: 'contact', title: 'Say Hi', text: 'Copied or clicked a way to reach me.' },
  { id: 'back', title: 'Welcome Back', text: 'Came back for another visit.' },
  { id: 'sound', title: 'Turn It Up', text: 'Switched the sound on.' },
  { id: 'dark', title: 'Lights Out', text: 'Switched to dark mode.' },
  { id: 'drive', title: 'Road Trip', text: 'Dragged the car down the road.' },
  { id: 'name', title: 'Name Dropper', text: 'Clicked my name 5 times in a row.' },
  { id: 'night', title: 'Night Owl', text: 'Dropped by between midnight and 5 am.' },
  { id: 'charged', title: 'Fully Charged', text: 'Held the big button until it filled up.' },
  { id: 'idle', title: 'AFK', text: 'Left the page alone for a whole minute.' },
  { id: 'close', title: 'So Close', text: 'Reached for the idea. Missed.' },
  { id: 'caught', title: 'Eureka', text: 'Saw every page and caught the idea.' },
  { id: 'all', title: '100%', text: 'Unlocked everything else.' },
];
const IDS = new Set(LIST.map((a) => a.id));

const KEY = 'apf-ach';
const STATS = 'apf-stats';
const load = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

// Unlocks from older versions of the list are dropped
let got = Object.fromEntries(Object.entries(load(KEY, {})).filter(([id]) => IDS.has(id)));
const stats = { visits: 0, ideas: 0, flip: 0, tabs: [], games: [], peeks: [], shelves: [], home: false, ...load(STATS, {}) };
// The home page was not counted before the ending (8b): anything only the
// home page gives means it was seen
stats.home ||= !!(got.enter || got.storm || got.idea10 || got.peek || got.tabs || stats.peeks.length || stats.shelves.length);

// Only achievements that still exist (Card Shark left with the card deck, 23 Oct)
export const unlocked = () => Object.fromEntries(Object.entries(got).filter(([id]) => IDS.has(id)));
export const readStats = () => ({ ...stats });
export const act = (name) => window.dispatchEvent(new CustomEvent('apf:act', { detail: name }));

/* ---------- XP bar + toast ---------- */

let bar = null;
let toastEl = null;
const queue = [];
let showing = false;

function renderBar() {
  if (!bar) return;
  const n = Object.keys(unlocked()).length;
  bar.style.setProperty('--xp', String(n / LIST.length));
  bar.setAttribute('aria-valuenow', String(n));
}

function nextToast() {
  if (showing || !queue.length || !toastEl) return;
  showing = true;
  const a = queue.shift();
  toastEl.querySelector('.ach-toast__title').textContent = a.title;
  toastEl.querySelector('.ach-toast__text').textContent = a.text;
  toastEl.hidden = false;
  const r = toastEl.getBoundingClientRect();
  if (juicy()) {
    toastEl.animate(
      [
        { transform: 'translateX(120%) rotate(4deg)' },
        { transform: 'translateX(-6%) rotate(-1deg)', offset: 0.7 },
        { transform: 'none' },
      ],
      { duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
    setTimeout(() => burst(r.left + 28, r.top + r.height / 2, 10), 260);
  }
  sfx.ding();
  setTimeout(() => {
    const out = juicy()
      ? toastEl.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-130%)', opacity: 0 }], { duration: 300, easing: 'ease-in' })
      : { finished: Promise.resolve() };
    out.finished.then(() => {
      toastEl.hidden = true;
      showing = false;
      setTimeout(nextToast, 250);
    });
  }, 3200);
}

function unlock(id) {
  if (got[id]) return;
  const a = LIST.find((x) => x.id === id);
  if (!a) return;
  got[id] = Date.now();
  save(KEY, got);
  queue.push(a);
  renderBar();
  nextToast();
  window.dispatchEvent(new CustomEvent('apf:unlock', { detail: id }));
  if (id !== 'all' && LIST.every((x) => x.id === 'all' || got[x.id])) unlock('all');
}

/* ---------- what counts ---------- */

// Distinct things (games peeked at, shelves seen)
function collect(key, item, goal, id) {
  if (!stats[key].includes(item)) stats[key].push(item);
  save(STATS, stats);
  if (stats[key].length >= goal) unlock(id);
}

function count(key, goal, id) {
  stats[key] += 1;
  save(STATS, stats);
  if (stats[key] >= goal) unlock(id);
}

// One-off actions unlock the achievement with the same id
const ONE_OFF = new Set(['enter', 'video', 'contact', 'sound', 'dark', 'drive', 'name', 'charged', 'storm', 'close', 'caught']);

function onAct(name) {
  if (ONE_OFF.has(name)) unlock(name);
  else if (name === 'idea') count('ideas', 10, 'idea10');
  else if (name.startsWith('peek:')) collect('peeks', name.slice(5), 5, 'peek');
  else if (name.startsWith('shelf:')) collect('shelves', name.slice(6), SHELVES, 'tabs');
}

function watchPage() {
  // Visits: one per browser session
  let fresh = false;
  try {
    fresh = !sessionStorage.getItem('apf-session');
    sessionStorage.setItem('apf-session', '1');
  } catch {}
  if (fresh) {
    stats.visits += 1;
    save(STATS, stats);
  }
  if (stats.visits >= 2) unlock('back');

  if (new Date().getHours() < 5) unlock('night');

  // Which page is this? (home, About and every game page: js/idea.js counts them)
  const path = location.pathname;
  if ((path === '/' || path.endsWith('/index.html')) && !stats.home) {
    stats.home = true;
    save(STATS, stats);
  }
  if (path.endsWith('/about.html')) unlock('about');
  const game = path.match(/\/games\/([^/]+)\.html$/)?.[1];
  if (game) {
    if (!stats.games.includes(game)) stats.games.push(game);
    save(STATS, stats);
    unlock('game1');
    if (stats.games.length >= 5) unlock('game5');
    if (stats.games.length >= GAMES) unlock('gameAll');
  }

  // Scrolling: reach the very end; or fling the page fast
  let lastY = scrollY;
  let lastT = performance.now();
  let fast = 0;
  window.addEventListener(
    'scroll',
    () => {
      const now = performance.now();
      const v = Math.abs(scrollY - lastY) / Math.max(1, now - lastT); // px per ms
      fast = v > 7 ? fast + 1 : 0;
      if (fast >= 4) unlock('speed');
      lastY = scrollY;
      lastT = now;
      const end = document.documentElement.scrollHeight;
      if (end > innerHeight * 1.8 && scrollY + innerHeight >= end - 4) unlock('bottom');
    },
    { passive: true },
  );

  // A whole minute with no input while the page is visible
  let idle = 0;
  const reset = () => clearTimeout(idle) || (idle = setTimeout(() => !document.hidden && unlock('idle'), 60000));
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((e) =>
    window.addEventListener(e, reset, { passive: true }),
  );
  reset();

  // Any way to reach me: email, phone, LinkedIn, Discord, Telegram
  document.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="mailto:"], a[href^="tel:"], a[href*="linkedin.com"], a[href*="discord.com"], a[href*="telegram.me"]'))
      unlock('contact');
  });
}

export function initAchievements() {
  if (new URLSearchParams(location.search).has('reset-achievements')) {
    got = {};
    Object.assign(stats, { visits: 0, ideas: 0, flip: 0, tabs: [], games: [], peeks: [], shelves: [], home: false });
    save(KEY, got);
    save(STATS, stats);
  }

  bar = document.createElement('div');
  bar.className = 'xp-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Achievements unlocked');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(LIST.length));
  document.body.appendChild(bar);

  // Display only: clicks pass through, so it never blocks what's under it
  toastEl = document.createElement('div');
  toastEl.className = 'ach-toast';
  toastEl.hidden = true;
  toastEl.setAttribute('role', 'status');
  toastEl.innerHTML = `
    <span class="ach-toast__badge" aria-hidden="true">★</span>
    <span class="ach-toast__body">
      <span class="ach-toast__kicker">Achievement unlocked</span>
      <span class="ach-toast__title"></span>
      <span class="ach-toast__text"></span>
    </span>`;
  document.body.appendChild(toastEl);

  renderBar();
  window.addEventListener('apf:act', (e) => onAct(e.detail));
  watchPage();
}

// About page: grid of all achievements, locked ones as "???"
export function renderAchievementList(root) {
  if (!root) return;
  const draw = () => {
    const n = Object.keys(unlocked()).length;
    root.querySelector('.ach-count').textContent = `${n} / ${LIST.length}`;
    root.querySelector('.ach-grid').innerHTML = LIST.map((a) =>
      got[a.id]
        ? `<li class="ach is-got"><span class="ach__badge" aria-hidden="true">★</span><span><b>${a.title}</b><small>${a.text}</small></span></li>`
        : `<li class="ach"><span class="ach__badge" aria-hidden="true">?</span><span><b>???</b><small>${a.text}</small></span></li>`,
    ).join('');
  };
  draw();
  window.addEventListener('apf:unlock', draw);
}
