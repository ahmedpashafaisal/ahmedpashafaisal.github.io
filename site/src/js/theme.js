// Light / dark toggle, left of the About button. Switching runs the dot
// transition in the new background colour: dots cover from the button,
// the theme flips underneath, dots open again.
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { act } from './achievements.js';
import { dotCover, dotReveal } from './wipe.js';

const KEY = 'apf-theme';
const BG = { light: '#faf6ee', dark: '#16140f' };

const ICON = `
<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path class="theme-toggle__moon" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" />
  <g class="theme-toggle__sun"><circle cx="12" cy="12" r="4" fill="currentColor" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></g>
</svg>`;

const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

function apply(t) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {}
  window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

export function initTheme() {
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.type = 'button';
  btn.innerHTML = ICON;
  const label = () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    btn.setAttribute('aria-label', `Switch to ${next} mode`);
    btn.title = `${next[0].toUpperCase()}${next.slice(1)} mode`;
  };
  label();
  document.body.appendChild(btn);

  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    const next = current() === 'dark' ? 'light' : 'dark';
    sfx.press();
    if (next === 'dark') act('dark');
    if (!juicy()) {
      apply(next);
      return label();
    }
    busy = true;
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const cover = await dotCover(x, y, BG[next]);
    await dotReveal(BG[next], x, y, () => {
      cover.remove();
      apply(next);
      label();
    });
    busy = false;
  });
}
