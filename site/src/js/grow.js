// Open juice: a game cover grows to fill the screen, the game page opens, and
// there the picture shrinks from full screen into the screenshot frame while
// it fades into the real screenshot. Browser back (page kept in memory): the
// picture shrinks home into its cover.
// The game page's <head> (game-template.html) reads the same sessionStorage
// key before anything paints, so the new page starts on the full-screen picture.
import { sfx } from './sound.js';

const KEY = 'apf-grow';
const GROW_MS = 460;
const SHRINK_MS = 560;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

const box = (r) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
const screen = () => ({ left: '0px', top: '0px', width: `${innerWidth}px`, height: `${innerHeight}px`, borderRadius: '0px' });

function picture(src) {
  const el = document.createElement('div');
  el.className = 'grow';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<img src="${src}" alt="" />`;
  document.body.append(el);
  return el;
}

let left = null; // { el, cover } while this page is covered by a grown picture

// Index: grow the cover (showing whatever it shows now, a peeked screenshot
// included), then go
export function growOut(cover, href) {
  const shown = [...cover.querySelectorAll('img')].reverse().find((i) => i.classList.contains('is-on')) || cover.querySelector('img');
  if (!shown) {
    location.href = href;
    return;
  }
  const src = shown.currentSrc || shown.src;
  const el = picture(src);
  const r = cover.getBoundingClientRect();
  left = { el, cover };
  sfx.whoosh();
  try {
    sessionStorage.setItem(KEY, src);
  } catch {}
  el.animate([{ ...box(r), borderRadius: '14px' }, screen()], { duration: GROW_MS, easing: EASE, fill: 'forwards' }).finished.then(() => {
    location.href = href;
  });
}

// Back from the game page with this page kept in memory: shrink home
addEventListener('pageshow', (e) => {
  if (!e.persisted || !left) return;
  const { el, cover } = left;
  left = null;
  const r = cover.getBoundingClientRect();
  el.animate([screen(), { ...box(r), borderRadius: '14px' }], { duration: SHRINK_MS, easing: EASE, fill: 'forwards' }).finished.then(() => el.remove());
});

// Game page: start on the full-screen picture, shrink it into the screenshot
// frame, fade to the page underneath
export function growIn() {
  const html = document.documentElement;
  if (!html.classList.contains('grow-in')) return;
  const src = getComputedStyle(html).getPropertyValue('--grow-src').trim().replace(/^url\(["']?|["']?\)$/g, '');
  const el = picture(src);
  Object.assign(el.style, screen());
  html.classList.remove('grow-in');
  html.style.removeProperty('--grow-src');
  const target = document.querySelector('.page__screen, .page__media');
  if (!target) {
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(() => el.remove());
    return;
  }
  requestAnimationFrame(() => {
    const r = target.getBoundingClientRect();
    el.animate(
      [
        { ...screen(), opacity: 1 },
        { ...box(r), borderRadius: '18px', opacity: 1, offset: 0.75 },
        { ...box(r), borderRadius: '18px', opacity: 0 },
      ],
      { duration: SHRINK_MS + 200, easing: EASE, fill: 'forwards' },
    ).finished.then(() => el.remove());
  });
}
