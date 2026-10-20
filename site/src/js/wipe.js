// Dot transition, built on the background dot grid. Leaving: the dots swell
// into big dots, starting at the click point and spreading out, until they
// cover the screen. Arriving: the big dots shrink back to the grid, from the
// centre out. Drawn on a canvas (crisp, no blur), aligned with js/dotgrid.js.
// The <head> of each page sets html.wipe-in early (inline script) so the new
// page never flashes before the dots open.
// dotCover / dotReveal are also used by the theme toggle.
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { GAP } from './dotgrid.js';

const KEY = 'apf-wipe';
const SPREAD_MS = 300; // delay from the first dot to the farthest one
const GROW_MS = 200; // each dot's own grow/shrink time
const FULL_R = GAP * 0.75; // overlapping dots: no gaps left

const easeOut = (t) => 1 - (1 - t) ** 3;

function layer(color) {
  const c = document.createElement('canvas');
  c.className = 'wipe';
  c.setAttribute('aria-hidden', 'true');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = color;
  // Same grid as the background dots
  const offX = (innerWidth % GAP) / 2;
  const offY = (innerHeight % GAP) / 2;
  const dots = [];
  for (let y = offY - GAP; y <= innerHeight + GAP; y += GAP) {
    for (let x = offX - GAP; x <= innerWidth + GAP; x += GAP) dots.push([x, y]);
  }
  return { c, ctx, dots };
}

// Animate every dot's radius; t0 delay grows with distance from (ox, oy)
function run({ c, ctx, dots }, ox, oy, grow) {
  const far = Math.max(...dots.map(([x, y]) => Math.hypot(x - ox, y - oy)));
  const start = performance.now();
  return new Promise((done) => {
    const frame = (now) => {
      const t = now - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.beginPath();
      let busy = false;
      for (const [x, y] of dots) {
        const delay = (Math.hypot(x - ox, y - oy) / far) * SPREAD_MS;
        const k = Math.min(1, Math.max(0, (t - delay) / GROW_MS));
        if (k < 1) busy = true;
        const r = FULL_R * (grow ? easeOut(k) : 1 - easeOut(k));
        if (r > 0.2) {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      if (busy) requestAnimationFrame(frame);
      else done(c);
    };
    requestAnimationFrame(frame);
  });
}

export const dotCover = (x, y, color) => run(layer(color), x, y, true);

export async function dotReveal(color, x = innerWidth / 2, y = innerHeight / 2, under = null) {
  const l = layer(color);
  // Start fully covered so nothing shows before the dots shrink
  l.ctx.fillRect(0, 0, innerWidth, innerHeight);
  under?.();
  const c = await run(l, x, y, false);
  c.remove();
}

const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#caff00';

export function initWipe() {
  const html = document.documentElement;

  // Arriving: dots shrink from the centre
  if (html.classList.contains('wipe-in')) {
    dotReveal(accent(), innerWidth / 2, innerHeight / 2, () => html.classList.remove('wipe-in'));
  }
  // Back/forward cache: never come back to a covered page
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) document.querySelectorAll('.wipe').forEach((w) => w.remove());
  });

  // Leaving: dots swell from the click point, then go
  document.addEventListener('click', (e) => {
    if (!juicy() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // same page (anchors)
    e.preventDefault();
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {}
    sfx.whoosh();
    dotCover(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2, accent()).then(() => (location.href = url.href));
  });
}
