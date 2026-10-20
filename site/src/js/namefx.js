// Clickable name on the landing. Each click sends a wave through the letters:
// the clicked letter squashes and hops, its neighbours follow one by one,
// lower the farther away they are. Quick clicks build a combo: higher hops.
// The 5th quick click makes the whole name jump (achievement).
import { burst } from './burst.js';
import { juicy } from './motion.js';
import { sendShock } from './dotgrid.js';
import { sfx } from './sound.js';
import { act } from './achievements.js';

const STEP_MS = 32; // delay per letter away from the click
const COMBO_MS = 600; // clicks closer than this build the combo
const HOP_EM = 0.32; // hop height of the clicked letter, in em

export function initNameFx(name) {
  if (!name) return;
  const text = name.textContent.trim();
  name.setAttribute('aria-label', text);
  name.innerHTML = text
    .split(' ')
    .map((w) => `<span class="name__word" aria-hidden="true">${[...w].map((c) => `<span class="name__l">${c}</span>`).join('')}</span>`)
    .join(' ');
  const letters = [...name.querySelectorAll('.name__l')];

  let combo = 0;
  let last = 0;

  name.addEventListener('click', (e) => {
    const now = performance.now();
    combo = now - last < COMBO_MS ? combo + 1 : 1;
    last = now;

    // Letter nearest the click
    let at = 0;
    let best = Infinity;
    letters.forEach((l, i) => {
      const r = l.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2)) + Math.abs(e.clientY - (r.top + r.height / 2)) * 0.5;
      if (d < best) {
        best = d;
        at = i;
      }
    });

    sfx.hit();
    if (!juicy()) return;
    const power = Math.min(combo, 4);
    burst(e.clientX, e.clientY, 6 + power * 3);
    sendShock(e.clientX, e.clientY, 0.6 + power * 0.3);

    letters.forEach((l, i) => {
      const dist = Math.abs(i - at);
      const h = (HOP_EM * (0.8 + power * 0.35)) / (1 + dist * 0.35);
      l.animate(
        dist === 0
          ? [
              { transform: 'none' },
              { transform: 'translateY(0.04em) scale(1.25, 0.7)', offset: 0.15 },
              { transform: `translateY(-${h}em) scale(0.9, 1.15)`, offset: 0.5 },
              { transform: 'translateY(0) scale(1.1, 0.9)', offset: 0.82 },
              { transform: 'none' },
            ]
          : [
              { transform: 'none' },
              { transform: `translateY(-${h}em)`, offset: 0.45 },
              { transform: 'translateY(0) scale(1.06, 0.94)', offset: 0.8 },
              { transform: 'none' },
            ],
        { duration: 520, delay: dist * STEP_MS, easing: 'ease-out' },
      );
    });

    if (combo >= 5) {
      combo = 0;
      sfx.enter();
      const r = name.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 24);
      name.animate(
        [
          { transform: 'none' },
          { transform: 'translateY(-18px) scale(1.04, 0.96)', offset: 0.3 },
          { transform: 'translateY(0) scale(0.97, 1.03)', offset: 0.6 },
          { transform: 'none' },
        ],
        { duration: 560, delay: 120, easing: 'ease-out' },
      );
      act('name');
    }
  });
}
