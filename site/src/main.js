// Entry point. Features are added step by step (see PLAYBOOK-redesign.md).
import './styles/tokens.css';
import './styles/base.css';
import './styles/button.css';
import './styles/card.css';
import './styles/entrance.css';
import './styles/deck.css';
import './styles/featured.css';

import { initDotGrid } from './js/dotgrid.js';
import { initJuicyButton } from './js/button.js';
import { initDeck } from './js/deck.js';
import { initFeatured } from './js/featured.js';
import { initEntrance } from './js/entrance.js';
import { initScrollTransition } from './js/scroll.js';
import { initSoundToggle } from './js/sound-toggle.js';

initDotGrid(document.querySelector('.dot-grid'));
initFeatured(document.querySelector('.featured'));
initDeck(document.querySelector('.games'));
document.querySelectorAll('.juicy-btn').forEach(initJuicyButton);
initEntrance(document.querySelector('.entrance'));
initSoundToggle(document.querySelector('.sound-toggle'));
initScrollTransition(document.querySelector('.entrance'), document.querySelector('.featured'));
