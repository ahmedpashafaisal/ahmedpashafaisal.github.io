// "Level progress" card in the footer: shows once per page view when the
// visitor scrolls down to the footer. Stats: time on site this visit,
// games peeked at (all time), achievements unlocked.
import { burst } from './burst.js';
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { LIST, unlocked, readStats } from './achievements.js';

const T0_KEY = 'apf-t0';

function startTime() {
  try {
    let t = +sessionStorage.getItem(T0_KEY);
    if (!t) {
      t = Date.now();
      sessionStorage.setItem(T0_KEY, String(t));
    }
    return t;
  } catch {
    return Date.now();
  }
}

const clock = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function initLevelUp(foot) {
  if (!foot) return;
  const t0 = startTime();
  const card = document.createElement('div');
  card.className = 'levelup';
  card.hidden = true;
  card.setAttribute('role', 'status');
  card.innerHTML = `
    <p class="levelup__title">Level progress</p>
    <ul class="levelup__stats">
      <li><span>Time</span><b data-k="time"></b></li>
      <li><span>Games peeked</span><b data-k="peeks"></b></li>
      <li><span>Achievements</span><b data-k="ach"></b></li>
    </ul>`;
  foot.prepend(card);

  let shown = false;
  new IntersectionObserver(([e]) => {
    if (shown || !e.isIntersecting || scrollY < 200) return;
    shown = true;
    card.querySelector('[data-k="time"]').textContent = clock(Date.now() - t0);
    card.querySelector('[data-k="peeks"]').textContent = String(readStats().peeks.length);
    card.querySelector('[data-k="ach"]').textContent = `${Object.keys(unlocked()).length} / ${LIST.length}`;
    card.hidden = false;
    sfx.enter();
    if (!juicy()) return;
    card.animate(
      [
        { transform: 'translateY(24px) scale(0.9)', opacity: 0 },
        { transform: 'translateY(-4px) scale(1.03)', opacity: 1, offset: 0.65 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 520, easing: 'ease-out' },
    );
    card.querySelectorAll('li').forEach((li, i) =>
      li.animate([{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
        duration: 320,
        delay: 260 + i * 120,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'backwards',
      }),
    );
    setTimeout(() => {
      const r = card.querySelector('.levelup__title').getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 16);
    }, 300);
  }, { threshold: 0.6 }).observe(foot);
}
