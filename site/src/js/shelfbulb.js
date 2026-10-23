// The runaway idea on the shelves: one bulb, always one hop ahead.
//   slot: it sits in a shelf's empty slot. Reach for it: "Nope, not a game
//     yet.", a laugh, and it hops off onto a cover on another shelf (touch
//     screens: into another slot, since a tap on a cover opens the game).
//   perch: it sits on a cover. Point at that cover: the car shouts "Hold
//     still!" and it hops one cover along; after a shelf's last game it goes
//     into that shelf's empty slot.
//   road: slide the shelf it is on and it drops onto the road ahead of the
//     car, runs ahead of it, and jumps into the empty slot at the end.
// Loaded by shelves.js when the shelves come near; rest.js keeps its own
// runaway away while this one is on screen.
import { makeBulb, play } from './bulb.js';
import '../styles/bulb.css';
import { sfx } from './sound.js';

const SIZE = 52; // px
const AHEAD = 70; // px in front of the car on the road
const SLIDE_START = 40; // px of sliding before it jumps down to the road

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

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

export function initShelfBulb(root) {
  const shelves = [...root.querySelectorAll('.shelf')];
  const slots = [...root.querySelectorAll('.shelf__slot')];
  if (!slots.length) return;

  const holder = document.createElement('span');
  const b = makeBulb({ size: SIZE, eyes: true });
  holder.append(b);
  let where = null; // { kind: 'slot' | 'perch' | 'road', el, shelf }
  let busy = false;

  const put = (kind, el) => {
    holder.className = `shelf-bulb shelf-bulb--${kind}`;
    holder.style.left = '';
    (kind === 'slot' ? el.querySelector('.shelf__cover') : el).append(holder);
    const shelf = el.closest('.shelf');
    // Where the shelf's slide stood when the bulb arrived
    where = { kind, el, shelf, scroll: shelf.querySelector('.shelf__row').scrollLeft };
  };

  // Hop off, move, land
  async function move(kind, el, { dir = 1, land = 'drop-in' } = {}) {
    await play(b, 'hop-off', { dir });
    put(kind, el);
    sfx.boing();
    await play(b, land, { dir });
  }

  put('slot', pick(slots));
  play(b, 'pop-in');

  // Reach for the bulb in its slot
  const reachSlot = async (slot) => {
    if (busy || where.kind !== 'slot' || where.el !== slot) return;
    busy = true;
    say(holder, 'Nope, not a game yet.');
    await play(b, 'laugh');
    if (fine()) {
      const others = shelves.filter((s) => s !== where.shelf);
      const covers = pick(others).querySelectorAll('.shelf__item');
      await move('perch', covers[0]);
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
      if (busy || e.pointerType !== 'mouse' || where.kind !== 'perch' || where.el !== item) return;
      busy = true;
      shout('Hold still!', e.clientX, e.clientY);
      const shelf = where.shelf;
      const items = [...shelf.querySelectorAll('.shelf__item')];
      const next = items[items.indexOf(item) + 1];
      const slot = shelf.querySelector('.shelf__slot');
      if (next) await move('perch', next);
      else if (slot) await move('slot', slot);
      else await move('perch', shelves[(shelves.indexOf(shelf) + 1) % shelves.length].querySelector('.shelf__item'));
      busy = false;
    }),
  );

  // Sliding the shelf it is on: down to the road, run ahead, into the slot
  root.querySelectorAll('.shelf--rail').forEach((shelf) => {
    const road = shelf.querySelector('.shelf__road');
    const row = shelf.querySelector('.shelf__row');
    shelf.addEventListener('shelf:slide', async ({ detail: { x, p } }) => {
      const ahead = `${Math.min(x + AHEAD, road.clientWidth - SIZE)}px`;
      if (where.kind === 'road' && where.shelf === shelf && !busy) holder.style.left = ahead;
      if (busy || where.shelf !== shelf) return;
      const atEnd = () => row.scrollLeft >= row.scrollWidth - row.clientWidth - 2;
      if (where.kind !== 'road' && Math.abs(row.scrollLeft - where.scroll) > SLIDE_START && p < 0.95) {
        // Drops straight down onto the road, so it keeps up with the slide
        busy = true;
        put('road', road);
        holder.style.left = ahead;
        sfx.boing();
        await play(b, 'drop-in');
        busy = false;
      }
      if (!busy && where.kind === 'road' && where.shelf === shelf && (p > 0.99 || atEnd())) {
        busy = true;
        await move('slot', shelf.querySelector('.shelf__slot'));
        busy = false;
      }
    });
  });
}
