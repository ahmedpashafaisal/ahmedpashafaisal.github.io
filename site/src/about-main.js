// Entry point for the About page. Same look and juice as the game pages.
import './styles/tokens.css';
import './styles/base.css';
import './styles/button.css';
import './styles/card.css';
import './styles/entrance.css';
import './styles/deck.css';
import './styles/featured.css';
import './styles/detail.css';
import './styles/site.css';
import './styles/achievements.css';
import './styles/scrollcar.css';
import './styles/extras.css';
import './styles/theme.css';
import './styles/rest.css';
import './styles/idea.css';
import './styles/pagebulb.css';

import { initDotGrid } from './js/dotgrid.js';
import { initJuicyButton } from './js/button.js';
import { initSoundToggle } from './js/sound-toggle.js';
import { letters, pageFx } from './js/detail.js';
import { burst } from './js/burst.js';
import { sfx } from './js/sound.js';
import { act, initAchievements, renderAchievementList } from './js/achievements.js';
import { initEggs } from './js/eggs.js';
import { initClickFx } from './js/clickfx.js';
import { initScrollCar } from './js/scrollcar.js';
import { initWipe } from './js/wipe.js';
import { initTheme } from './js/theme.js';
import { initMail, copyText } from './js/mail.js';
import { initHud } from './js/hud.js';
import { initRest } from './js/rest.js';
import { initIdea } from './js/idea.js';
import { initTabTitle } from './js/tabtitle.js';
import { initLevelUp } from './js/levelup.js';
import { initHeadBeat } from './js/pagebeats.js';

const root = document.querySelector('.about');
const title = root.querySelector('[data-letters]');
title.setAttribute('aria-label', title.textContent);
title.innerHTML = letters(title.textContent);

// Copy buttons: say "Copied!", pop, then go back
root.querySelectorAll('.about__copy').forEach((btn) => {
  btn.addEventListener('click', async () => {
    btn.textContent = (await copyText(btn.dataset.copy)) ? 'Copied!' : 'Copy failed';
    const r = btn.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 8);
    sfx.ding();
    act('contact');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => (btn.textContent = 'Copy'), 1600);
  });
});

initDotGrid(document.querySelector('.dot-grid'));
initAchievements();
initEggs();
initClickFx();
initScrollCar();
initWipe();
initMail();
initTheme();
initTabTitle();
initLevelUp(document.querySelector('.site-foot'));
renderAchievementList(document.querySelector('#achievements'));
pageFx(root);
document.querySelectorAll('.juicy-btn').forEach(initJuicyButton);
initSoundToggle(document.querySelector('.sound-toggle'));
initHud();
initRest();
initIdea();
initHeadBeat(root.querySelector('.about__avatar'));
