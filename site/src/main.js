// Entry point. Features are added step by step (see PLAYBOOK-redesign.md).
import './styles/tokens.css';
import './styles/base.css';
import './styles/button.css';
import './styles/card.css';
import './styles/entrance.css';

import { initDotGrid } from './js/dotgrid.js';
import { initJuicyButton } from './js/button.js';
import { initCard } from './js/card.js';
import { initEntrance } from './js/entrance.js';
import { initScrollTransition } from './js/scroll.js';
import { initSoundToggle } from './js/sound-toggle.js';

initDotGrid(document.querySelector('.dot-grid'));
document.querySelectorAll('.juicy-btn').forEach(initJuicyButton);
document.querySelectorAll('.card').forEach(initCard);
initEntrance(document.querySelector('.entrance'));
initSoundToggle(document.querySelector('.sound-toggle'));
initScrollTransition(document.querySelector('.entrance'), document.querySelector('.games'));
