// Hold-to-charge for the big Press button. A tap works as before; holding
// fills the button, shakes it harder and raises a blip, and the release
// hits harder (bigger burst + wave). A full charge also shakes the screen.
import { burst } from './burst.js';
import { juicy } from './motion.js';
import { sendShock } from './dotgrid.js';
import { sfx } from './sound.js';
import { act } from './achievements.js';

const FULL_MS = 1200;
const BLIP_MS = 110;

export function initCharge(btn) {
  let t0 = 0;
  let raf = 0;
  let lastBlip = 0;
  let k = 0;

  const level = (now) => Math.min(1, Math.max(0, (now - t0 - 150) / FULL_MS)); // 150 ms grace = a tap

  const tick = (now) => {
    k = level(now);
    btn.style.setProperty('--charge', k.toFixed(3));
    btn.classList.toggle('is-charging', k > 0);
    // Synced shake: amplitude grows with charge, no random jitter
    btn.style.translate = k > 0 ? `${(Math.sin(now * 0.09) * 3.5 * k).toFixed(2)}px ${(Math.cos(now * 0.11) * 1.5 * k).toFixed(2)}px` : '';
    if (k > 0 && now - lastBlip > BLIP_MS * (1.2 - k * 0.6)) {
      sfx.charge(k);
      lastBlip = now;
    }
    raf = requestAnimationFrame(tick);
  };

  const start = (e) => {
    if (!juicy() || (e.button !== undefined && e.button !== 0)) return;
    t0 = performance.now();
    lastBlip = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };

  const stop = (fire) => (e) => {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
    btn.classList.remove('is-charging');
    btn.style.translate = '';
    btn.style.setProperty('--charge', '0');
    if (!fire || k < 0.15) return (k = 0);
    const r = btn.getBoundingClientRect();
    const x = e.clientX ?? r.left + r.width / 2;
    const y = e.clientY ?? r.top + r.height / 2;
    burst(x, y, Math.round(10 + 30 * k));
    sendShock(x, y, 1 + 2.5 * k, k > 0.6);
    sfx.thump();
    if (k >= 1) {
      act('charged');
      document.body.animate(
        [
          { transform: 'translate(0, 0)' },
          { transform: 'translate(-6px, 3px)' },
          { transform: 'translate(5px, -4px)' },
          { transform: 'translate(-3px, 2px)' },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 240, easing: 'ease-out' },
      );
    }
    k = 0;
  };

  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', stop(true));
  btn.addEventListener('pointerleave', stop(false));
  btn.addEventListener('pointercancel', stop(false));
}
