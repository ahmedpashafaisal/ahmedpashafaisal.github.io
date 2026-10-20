// Full-screen entrance: one press brings the page to life.
// First visit: scrolling is locked until the visitor presses the button,
// scrolls, presses a key, or taps anywhere. Return visits skip straight in.
// Add ?reset to the URL to see the first-visit entrance again.
import { burst } from './burst.js';
import { sendShock } from './dotgrid.js';
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { act } from './achievements.js';

const KEY = 'apf-entered';
const ENTER_KEYS = new Set(['Enter', ' ', 'ArrowDown', 'PageDown', 'End']);

// See-games anticipation: crouch, hold, then launch the scroll
const WINDUP_MS = 220;
const HOLD_MS = 60;
const LAUNCH_MS = 820;
const easeOutCubic = (t) => 1 - (1 - t) ** 3; // fast take-off, soft landing

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

export function initEntrance(root) {
  const html = document.documentElement;
  const btn = root.querySelector('.entrance__btn');
  const label = btn.querySelector('.entrance__btn-label');
  const name = root.querySelector('.entrance__name');
  const canvas = root.querySelector('.hero-3d');
  const target = document.querySelector(btn.dataset.target);

  if (new URLSearchParams(location.search).has('reset')) {
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  let entered = false;
  try {
    entered = localStorage.getItem(KEY) === '1';
  } catch {}

  html.classList.add(entered ? 'entered' : 'pre-entry');
  if (entered) label.textContent = btn.dataset.after;

  // three.js loads after first paint so the text shows at once
  let hero = null;
  if (canvas && hasWebGL()) {
    import('./hero3d.js').then(({ initHero }) => {
      hero = initHero(canvas, {
        onCollect: () => act('idea'),
        onWave: () => act('storm'),
      });
      if (entered) hero.enter();
    });
  }

  function enter(x, y) {
    if (entered) return;
    entered = true;
    act('enter');
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    html.classList.remove('pre-entry');
    html.classList.add('entered');

    if (juicy()) {
      burst(x, y, 18);
      sendShock(x, y, 2.4, true);
      name.animate(
        [
          { transform: 'scale(1, 1)' },
          { transform: 'scale(1.06, 0.9)', offset: 0.25 },
          { transform: 'scale(0.97, 1.04)', offset: 0.6 },
          { transform: 'scale(1, 1)' },
        ],
        { duration: 520, easing: 'ease-out' },
      );
    }
    hero?.enter();
    sfx.enter();

    // Button label swaps after the burst
    setTimeout(() => {
      label.textContent = btn.dataset.after;
    }, 180);
  }

  const btnCentre = () => {
    const r = btn.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };

  btn.addEventListener('click', (e) => {
    if (!entered) {
      const [cx, cy] = btnCentre();
      enter(e.detail === 0 ? cx : e.clientX, e.detail === 0 ? cy : e.clientY);
    } else {
      launch();
    }
  });

  const center = root.querySelector('.entrance__center');
  let launching = false;
  function launch() {
    if (!target) return;
    if (!juicy()) {
      target.scrollIntoView();
      return;
    }
    if (launching) return;
    launching = true;
    window.dispatchEvent(new CustomEvent('entrance:windup'));

    // Crouch and hold
    center.animate(
      [
        { transform: 'translateY(0) scale(1, 1)' },
        { transform: 'translateY(14px) scale(1.03, 0.94)', offset: WINDUP_MS / (WINDUP_MS + HOLD_MS) },
        { transform: 'translateY(14px) scale(1.03, 0.94)' },
      ],
      { duration: WINDUP_MS + HOLD_MS, easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
    );
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('entrance:launch'));
      sfx.whoosh();
      // Spring back out of the crouch while the page takes off
      center.animate(
        [
          { transform: 'translateY(14px) scale(1.03, 0.94)' },
          { transform: 'translateY(-10px) scale(0.98, 1.05)', offset: 0.35 },
          { transform: 'translateY(0) scale(1, 1)' },
        ],
        { duration: 420, easing: 'ease-out' },
      );
      scrollTo(target.getBoundingClientRect().top + window.scrollY);
    }, WINDUP_MS + HOLD_MS);
  }

  // Scripted scroll; any wheel or touch cancels it
  function scrollTo(y) {
    const start = window.scrollY;
    const dist = y - start;
    const t0 = performance.now();
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    window.addEventListener('wheel', cancel, { once: true, passive: true });
    window.addEventListener('touchstart', cancel, { once: true, passive: true });
    const step = (t) => {
      const k = Math.min((t - t0) / LAUNCH_MS, 1);
      if (!cancelled) window.scrollTo(0, start + dist * easeOutCubic(k));
      if (k < 1 && !cancelled) {
        requestAnimationFrame(step);
      } else {
        launching = false;
        window.removeEventListener('wheel', cancel);
        window.removeEventListener('touchstart', cancel);
      }
    };
    requestAnimationFrame(step);
  }

  // Other ways in
  root.addEventListener('pointerdown', (e) => {
    if (!entered && !e.target.closest('button')) enter(e.clientX, e.clientY);
  });
  window.addEventListener('wheel', () => enter(...btnCentre()), { passive: true });
  window.addEventListener('touchmove', () => enter(...btnCentre()), { passive: true });
  window.addEventListener('keydown', (e) => {
    if (entered || e.target.closest('button')) return;
    if (ENTER_KEYS.has(e.key)) {
      e.preventDefault();
      enter(...btnCentre());
    }
  });
}
