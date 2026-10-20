// Entry point for the 404 page: "Game Over · Continue?" with an arcade
// countdown. Both answers go home; "No" just takes a moment to accept it.
import './styles/tokens.css';
import './styles/base.css';
import './styles/button.css';
import './styles/entrance.css';
import './styles/detail.css';
import './styles/site.css';
import './styles/achievements.css';
import './styles/extras.css';
import './styles/theme.css';

import { initDotGrid } from './js/dotgrid.js';
import { initJuicyButton } from './js/button.js';
import { initSoundToggle } from './js/sound-toggle.js';
import { initAchievements } from './js/achievements.js';
import { initClickFx } from './js/clickfx.js';
import { initWipe } from './js/wipe.js';
import { initTheme } from './js/theme.js';
import { initMail } from './js/mail.js';
import { initHud } from './js/hud.js';
import { initTabTitle } from './js/tabtitle.js';
import { letters } from './js/detail.js';
import { juicy } from './js/motion.js';
import { sfx } from './js/sound.js';

initDotGrid(document.querySelector('.dot-grid'));
initAchievements();
initClickFx();
initWipe();
initMail();
initTheme();
initTabTitle();
document.querySelectorAll('.juicy-btn').forEach(initJuicyButton);
initSoundToggle(document.querySelector('.sound-toggle'));
initHud();

const title = document.querySelector('[data-letters]');
title.setAttribute('aria-label', title.textContent);
title.innerHTML = letters(title.textContent);
if (juicy()) {
  title.querySelectorAll('.banner__letter').forEach((l, k) =>
    l.animate(
      [
        { transform: 'translateY(-1.2em)', opacity: 0 },
        { transform: 'translateY(0.08em) scale(1.1, 0.9)', opacity: 1, offset: 0.7 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 520, delay: k * 60, easing: 'ease-in', fill: 'backwards' },
    ),
  );
}

// Arcade countdown 9 → 0; at 0 the Yes button pulses
const count = document.querySelector('.gameover__count');
const yes = document.querySelector('.gameover__actions .juicy-btn');
let n = 9;
const timer = setInterval(() => {
  n -= 1;
  count.textContent = String(n);
  sfx.tick();
  if (juicy()) count.animate([{ transform: 'scale(1.5)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
  if (n <= 0) {
    clearInterval(timer);
    if (juicy()) yes.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 700, iterations: Infinity });
  }
}, 1000);

// "No" accepts it with a shrug, then goes home anyway
const no = document.querySelector('[data-no]');
no.addEventListener('click', (e) => {
  if (no.dataset.done) return;
  e.preventDefault();
  e.stopPropagation();
  no.dataset.done = '1';
  no.textContent = 'Home anyway';
  setTimeout(() => no.click(), 700);
});
