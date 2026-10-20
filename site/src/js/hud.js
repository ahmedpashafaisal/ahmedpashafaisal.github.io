// Bottom bar (HUD). At the top of a page the buttons sit in their corners as
// before (sound bottom-left, email + theme + About bottom-right). Once you scroll, the
// bar slides up and those buttons move into it, so nothing floats over content:
//   left: sound · centre: achievements count · right: back to top, email, theme, About
// Short pages (nothing to scroll) show the bar at once.
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { LIST, unlocked } from './achievements.js';

const SHOW_AT = 80; // px scrolled before the bar comes up

const UP = `
<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 19V5" /><path d="M5.5 11.5 12 5l6.5 6.5" />
</svg>`;

export function initHud() {
  const html = document.documentElement;
  const bar = document.createElement('nav');
  bar.className = 'hud';
  bar.setAttribute('aria-label', 'Page controls');
  bar.innerHTML = `
    <div class="hud__side hud__left"></div>
    <a class="hud__score" href="/about.html#achievements" title="Achievements">★ <span></span></a>
    <div class="hud__side hud__right">
      <button class="hud__btn hud__top" type="button" aria-label="Back to top" title="Back to top">${UP}</button>
    </div>`;
  document.body.appendChild(bar);

  // The corner buttons move into the bar while it is up, and back out after
  const left = bar.querySelector('.hud__left');
  const right = bar.querySelector('.hud__right');
  const sound = document.querySelector('.sound-toggle');
  const mail = document.querySelector('.mail-btn');
  const theme = document.querySelector('.theme-toggle');
  const page = document.querySelector('.site-pill');
  let inBar = false;
  const dock = (on) => {
    if (on === inBar) return;
    inBar = on;
    const home = on ? null : document.body;
    if (sound) (home || left).appendChild(sound);
    for (const el of [mail, theme, page]) if (el) (home || right).appendChild(el);
  };

  bar.querySelector('.hud__top').addEventListener('click', () => {
    sfx.whoosh();
    window.scrollTo({ top: 0, behavior: juicy() ? 'smooth' : 'auto' });
  });

  const score = bar.querySelector('.hud__score span');
  const count = () => (score.textContent = `${Object.keys(unlocked()).length} / ${LIST.length}`);
  count();
  window.addEventListener('apf:unlock', () => {
    count();
    if (juicy()) score.parentElement.animate([{ transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
  });

  // Short pages (nothing to scroll) show the bar at once
  const update = () => {
    const on = scrollY > SHOW_AT || document.documentElement.scrollHeight <= innerHeight + SHOW_AT;
    html.classList.toggle('hud-on', on);
    dock(on);
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
