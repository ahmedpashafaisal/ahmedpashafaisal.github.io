// The runaway idea on the shelves: one bulb, always one hop ahead.
//   slot: it works on the next game in a shelf's building site. Each bit of
//     page scroll, up or down, is a hop with dust where it lands, and now and
//     then a line. Reach for it: "Nope, not a game yet.", a laugh, and it hops
//     off onto a cover on another shelf (touch screens: into another slot,
//     since a tap on a cover opens the game).
//   perch: it sits on a cover. Point at that cover: the car shouts "Hold
//     still!" and it hops one cover along; after a shelf's last game it goes
//     into that shelf's empty slot. Slide the shelf it sits on and, once the
//     slide stops, it hops to the far cover in view, ahead of the slide.
// Loaded by shelves.js when the shelves come near; rest.js keeps its own
// runaway away while this one is on screen.
import { makeBulb, play } from './bulb.js';
import '../styles/bulb.css';
import { sfx } from './sound.js';
import { juicy } from './motion.js';

const SIZE = 52; // px
const SLIDE_START = 40; // px of sliding before it hops ahead
const SETTLE_MS = 160; // no slide this long = the slide has stopped
const HOP_PX = 120; // page scroll per working hop
const HOP_MS = 380;
const LINE_EVERY = 6; // working hops per line, the first on the 3rd hop
// Placeholder words: Ahmed rewrites
const LINES = ['Almost done.', "Don't look yet!", 'Five more minutes.', 'It worked yesterday.', 'Nearly there.'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
// The landing's runaway is on the screen, out on the page (hero3d.js chase
// mode): this one hides and waits
const away = () => document.documentElement.classList.contains('runaway-shown');

// Ink bubble over the bulb (its own line)
function say(holder, text) {
  const s = Object.assign(document.createElement('span'), { className: 'shelf-say', textContent: text });
  holder.append(s);
  setTimeout(() => s.remove(), 1600);
}

// The car's line at the pointer, in the car's bubble
function shout(text, x, y) {
  const s = document.createElement('span');
  s.className = 'car-bubble shelf-shout';
  s.append(Object.assign(document.createElement('span'), { textContent: text }));
  s.style.left = `${Math.min(Math.max(x, 70), innerWidth - 70)}px`;
  s.style.top = `${Math.max(y - 18, 44)}px`;
  document.body.append(s);
  void s.offsetWidth;
  s.classList.add('is-on');
  setTimeout(() => {
    s.classList.remove('is-on');
    setTimeout(() => s.remove(), 250);
  }, 1400);
}

// A cover or slot wholly in view in its row (a sliding shelf may be slid along)
function inRow(el) {
  const row = el.parentElement.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return r.left >= row.left - 2 && r.right <= row.right + 2;
}

function firstCover(shelf) {
  const covers = [...shelf.querySelectorAll('.shelf__item')];
  return covers.find(inRow) ?? covers[0];
}

// Two puffs out sideways from the bulb's feet
function dust(holder) {
  const host = holder.parentElement;
  const h = holder.getBoundingClientRect();
  const c = host.getBoundingClientRect();
  const x = h.left + h.width / 2 - c.left;
  const y = h.bottom - c.top - h.height * 0.1;
  [-1, 1].forEach((d) => {
    const p = Object.assign(document.createElement('span'), { className: 'shelf-dust' });
    p.style.left = `${x - 5}px`;
    p.style.top = `${y - 5}px`;
    host.append(p);
    p.animate(
      [
        { transform: 'scale(0.5)', opacity: 0.55 },
        { transform: `translate(${d * 24}px, -9px) scale(1.7)`, opacity: 0 },
      ],
      { duration: 480, easing: 'ease-out' },
    ).finished.then(() => p.remove());
  });
}

export function initShelfBulb(root) {
  const shelves = [...root.querySelectorAll('.shelf')];
  const slots = [...root.querySelectorAll('.shelf__slot')];
  if (!slots.length) return;

  const holder = document.createElement('span');
  const b = makeBulb({ size: SIZE, eyes: true });
  holder.append(b);
  let where = null; // { kind: 'slot' | 'perch', el, shelf, scroll }
  let busy = false;

  const put = (kind, el) => {
    holder.className = `shelf-bulb shelf-bulb--${kind}`;
    (kind === 'slot' ? el.querySelector('.shelf__cover') : el).append(holder);
    const shelf = el.closest('.shelf');
    // Where the shelf's slide stood when the bulb arrived
    where = { kind, el, shelf, scroll: shelf.querySelector('.shelf__row').scrollLeft };
  };

  // Hop off, move, land
  async function move(kind, el, { dir = 1, land = 'drop-in' } = {}) {
    holder.getAnimations().forEach((a) => a.cancel());
    await play(b, 'hop-off', { dir });
    put(kind, el);
    sfx.boing();
    await play(b, land, { dir });
  }

  put('slot', pick(slots));
  play(b, 'pop-in');

  // Working in its slot: a small hop (stretch up, squash on landing, dust),
  // one per HOP_PX of page scroll while the slot is in view
  let lastY = scrollY;
  let scrolled = 0;
  let hops = 0;
  let hopping = false;
  let line = '';
  const work = () => {
    hopping = true;
    holder
      .animate(
        [
          { transform: 'none', easing: 'ease-out' },
          { transform: 'translateY(-16px) scale(0.92, 1.1)', offset: 0.42, easing: 'ease-in' },
          { transform: 'scale(1.16, 0.84)', offset: 0.72, easing: 'ease-out' },
          { transform: 'none' },
        ],
        { duration: HOP_MS },
      )
      .finished.then(() => (hopping = false), () => (hopping = false));
    setTimeout(() => where.kind === 'slot' && dust(holder), HOP_MS * 0.72);
    if (++hops % LINE_EVERY === 3) {
      line = pick(LINES.filter((l) => l !== line));
      say(holder, line);
    }
  };
  addEventListener(
    'scroll',
    () => {
      scrolled += Math.abs(scrollY - lastY);
      lastY = scrollY;
      if (scrolled < HOP_PX) return;
      scrolled = 0;
      if (busy || hopping || away() || where.kind !== 'slot' || !juicy()) return;
      const r = holder.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight && inRow(where.el)) work();
    },
    { passive: true },
  );

  // Reach for the bulb in its slot
  const reachSlot = async (slot) => {
    if (busy || away() || where.kind !== 'slot' || where.el !== slot) return;
    busy = true;
    say(holder, 'Nope, not a game yet.');
    await play(b, 'laugh');
    if (fine()) {
      await move('perch', firstCover(pick(shelves.filter((s) => s !== where.shelf))));
    } else {
      await move('slot', pick(slots.filter((s) => s !== slot)));
    }
    busy = false;
  };
  slots.forEach((s) => {
    s.addEventListener('pointerenter', () => reachSlot(s));
    s.addEventListener('click', () => reachSlot(s));
  });

  // Point at the cover it sits on: one hop along
  root.querySelectorAll('.shelf__item').forEach((item) =>
    item.addEventListener('pointerenter', async (e) => {
      if (busy || away() || e.pointerType !== 'mouse' || where.kind !== 'perch' || where.el !== item) return;
      busy = true;
      shout('Hold still!', e.clientX, e.clientY);
      const shelf = where.shelf;
      const items = [...shelf.querySelectorAll('.shelf__item')];
      const next = items[items.indexOf(item) + 1];
      const slot = shelf.querySelector('.shelf__slot');
      if (next) await move('perch', next);
      else if (slot) await move('slot', slot);
      else await move('perch', firstCover(shelves[(shelves.indexOf(shelf) + 1) % shelves.length]));
      busy = false;
    }),
  );

  // Sliding the shelf it sits on: once the slide stops, it hops to the far
  // cover in view, ahead of the slide (at the end of the shelf: the slot)
  root.querySelectorAll('.shelf--rail').forEach((shelf) => {
    const row = shelf.querySelector('.shelf__row');
    let settle = 0;
    const ahead = async () => {
      if (where.shelf !== shelf || where.kind !== 'perch') return;
      if (busy) return void (settle = setTimeout(ahead, SETTLE_MS)); // mid-hop: look again after
      const d = row.scrollLeft - where.scroll;
      if (Math.abs(d) < SLIDE_START) return;
      const seen = [...row.children].filter(inRow);
      const next = d > 0 ? seen.at(-1) : seen[0];
      if (!next || next === where.el) return;
      busy = true;
      await move(next.classList.contains('shelf__slot') ? 'slot' : 'perch', next, { dir: Math.sign(d) });
      busy = false;
    };
    shelf.addEventListener('shelf:slide', () => {
      clearTimeout(settle);
      settle = setTimeout(ahead, SETTLE_MS);
    });
  });
}
