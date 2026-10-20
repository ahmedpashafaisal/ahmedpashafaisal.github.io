// Juicy button: press state, a short hold on release (hit-stop), burst, combo counter.
import { burst } from './burst.js';
import { juicy } from './motion.js';
import { sendShock } from './dotgrid.js';
import { sfx } from './sound.js';

const HIT_STOP_MS = 60; // ~4 frames at 60 fps
const COMBO_WINDOW_MS = 450; // presses closer than this build a combo

export function initJuicyButton(btn) {
  let combo = 0;
  let lastPress = 0;
  let releaseTimer = 0;

  const press = () => {
    clearTimeout(releaseTimer);
    btn.classList.add('is-pressed');
  };

  const release = () => {
    const hold = juicy() ? HIT_STOP_MS : 0;
    releaseTimer = setTimeout(() => btn.classList.remove('is-pressed'), hold);
  };

  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointerleave', () => btn.classList.remove('is-pressed'));
  btn.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) press();
  });
  btn.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') release();
  });

  btn.addEventListener('click', (e) => {
    const r = btn.getBoundingClientRect();
    const fromKeyboard = e.detail === 0;
    const x = fromKeyboard ? r.left + r.width / 2 : e.clientX;
    const y = fromKeyboard ? r.top + r.height / 2 : e.clientY;
    burst(x, y);
    sfx.press();
    if (juicy()) sendShock(x, y, 1.6); // the button sends the biggest wave

    const now = performance.now();
    combo = now - lastPress < COMBO_WINDOW_MS ? combo + 1 : 1;
    lastPress = now;
    if (combo >= 3) showCombo(btn, combo);
  });
}

function showCombo(btn, n) {
  if (!juicy()) return;
  const tag = document.createElement('span');
  tag.className = 'combo';
  tag.textContent = `×${n}`;
  btn.appendChild(tag);
  const tilt = (Math.random() - 0.5) * 16;
  tag.animate(
    [
      { transform: `translate(-50%, 6px) rotate(${tilt}deg) scale(0.6)`, opacity: 0 },
      { transform: `translate(-50%, -4px) rotate(${tilt}deg) scale(${1 + Math.min(n, 10) * 0.06})`, opacity: 1, offset: 0.25 },
      { transform: `translate(-50%, -22px) rotate(${tilt}deg) scale(1)`, opacity: 0 },
    ],
    { duration: 620, easing: 'ease-out' },
  ).onfinish = () => tag.remove();
}
