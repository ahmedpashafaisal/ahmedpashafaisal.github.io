# Guide bulb: bugs, steps in detail, corner cases, tests

Plan: [PLAN-guide-bulb.md](PLAN-guide-bulb.md).

## Bugs from Ahmed's S3b test
| # | Bug | Cause (diagnosis) | Fix |
|---|---|---|---|
| B1 | Two runaway bulbs | 3D runaway, shelf bulb (`shelfbulb.js`) and resting bulb (`rest.js`) are three separate characters. Hidden only while the 3D one is on screen | One guide bulb (G2, G3) |
| B2 | Car "catches" a bulb, bulb stuck to it | Screenshot shows the SVG twin (glow ring, rays): the shelf bulb. It ignores the car. Car layer (z 15) parks over it (z 3); both scroll with the page, so they look glued | Guide reacts to the car everywhere (G3) |
| B3 | Cannot drive back to the top | Back on the landing, chase mode ends: canvas returns into the landing, screen stops following, bottom edge closes | One game layer, screen always follows while driving (G1) |
| B4 | Bulb runs back to the top | `homeRun()` after the footer stop | Dodge where it is at the end of the page; never auto-return (G2) |

## Steps in detail

### G0: commit S3b as work in progress
- Ask Ahmed. Commit message says it is replaced by G1 and G2.
- Reuse from S3b: `shiftAll`, `chaseFrame` scroll follow, screen follow, `driveTo`, `empty`, key zone, headlights, idle sleep, `runaway-shown`, `car-cam` in `snap.js`.

### G1: one game layer, car anywhere
- Canvases fixed over the screen on the home page from `enter()` on (today: only after the escape, class `car-out`).
- No landing or chase modes: drop `goOut`, `goHome`, `out`.
- Physics in screen px, page scroll followed each frame (`shiftAll(0, lastScroll - scrollY)`).
- Play area: page width; from page top to page bottom.
- No walls for the car (Ahmed: drive over the elements). Keep the wall rects only to place bulbs off the text.
- Route-round-walls code (`route`, corner waypoints) becomes unused: remove it.
- Screen follows whenever the visitor drives (keys, click, tap), anywhere.
- Click or tap drives anywhere except `a, button, input, select, textarea, label, summary, [role="button"]`, game covers and banner pictures (D1: drag on text selects).
- Keys: WASD always; arrows after the first drive (D2). Only while the car is on screen.
- Canvas `pointer-events: none` always; one document listener for clicks.
- Landing round (catch 5, runaway dodges) works as today on top of this.
- Done when: drive top to bottom and back with keys, screen follows both ways; landing round unchanged; clicks on buttons and covers still work.

### G2: one guide bulb on the home page
- One runaway object for the whole page; drawn in 3D (D3).
- Spots in page order: landing spots, section headings (text box, beside or above), building-site slots, footer line.
- Chaser: the car if it moved in the last 5 s; else the mouse cursor; touch: none (taps reach for it).
- Chaser within dodge radius: hop to the next spot ahead in the chaser's direction, on screen if possible.
- No spot ahead (page end): dodge to a free spot near, like the landing (`dodge()`).
- Visitor scrolls away: after the scroll rests (about 400 ms), it hops back in to the nearest spot on screen, from the edge it left.
- Rest: creeps toward the chaser; "So close!" (as `creep()` and rest.js today).
- Remove: chase stops list (`stopEls`), `homeRun`, `comeBack` return to the landing; skimmer hop-off now hops to the next spot below.
- Done when: chase from landing to footer and back up, bulb always on screen or one hop off it; never returns to the top unasked.

### G3: shelf beats moved onto the guide
- Building site: bulb works in its slot (hop per 120 px of scroll, dust, lines).
- Reach (cursor or car): "Nope, not a game yet.", laugh, hop to the next spot ahead.
- Perch on a cover, slide hop: as S1, but the 3D bulb at the DOM anchor.
- `shelfbulb.js` retired on the home page. `rest.js` off on the home page (the guide rests instead); kept for other pages.
- Done when: never two bulbs; the car driving into it makes it hop.

### G4: car comes to you and parks (old S3c)
- Visitor scrolls without driving, car off screen: car drives in from the nearest edge and parks near the bulb or the section heading.
- Click the car: honk, bounce, short shout.
- Never pulls the screen (auto drives do not move the camera: `grab.auto`).

### G5: other pages (later)
- Same bulb story on About, game pages, 404 (SVG twin, no three.js).
- Car reference: pre-rendered picture or SVG (weight).
- The ending: catch after all pages, or it comes to you. Talk first.

### G6: red accents
- Small red touches on the site so the car belongs (Ahmed: yes). Picture first.

## Corner cases
| Case | Expected |
|---|---|
| Window resize or rotate mid-chase | Spots re-measured; bulb keeps its spot index |
| Phone address bar (height-only resize) | Nothing moves |
| Reduced motion | No hops (pose changes), screen jumps instead of gliding, slower car |
| Theme switch mid-chase | Headlights and colours switch, no reset |
| `snap.js` | Waits while the car drives (`car-cam`); guide hop-ins never fight a snap |
| Cover grows into a game page (`grow.js`) | Game layer hidden during the grow |
| Lightbox or achievements panel open | Game layer paused |
| Back button (page from cache) | Bulb and car where they were, or a clean start; no double layer |
| Tab hidden | Loop paused |
| Keys and mouse at once | Keys win |
| Text fields, Ctrl, Cmd, Alt | Keys ignored |
| Car over a button or cover | Click goes to the button or cover |
| Bulb at a slot slid out of view (Mobile shelf) | Treated as off screen: hops to a spot in view |
| Return visit | Bulb starts closer (as today) |
| Very fast scroll to the bottom | Bulb hops in near the footer when the scroll rests |
| Idle with nothing on screen | Loop sleeps; scroll or input wakes it |
| Weight | Guide logic within 15 KB gzip; no new libraries |

## Tests (rebuild in the scratchpad)
| Suite | Covers |
|---|---|
| Landing round | 5 caught with keys only; runaway dodges; clicks drive; arrows scroll away from the car |
| Whole-page drive | Keys top to bottom and back; screen follows; car stays on screen |
| Click to drive | Empty space and text drive; drag on text selects; buttons and covers do not drive |
| Guide | Chase landing to footer and back; one hop ahead; dodge at the end; hop back in after a scroll; never two bulbs |
| Shelves (S1 regression) | Building sites, work hops, lines, reach, perch, slide; car makes it hop |
| Phone | Taps drive; no sideways scroll; one bulb |
| Dark | Headlights, colours |

### Test lessons (from S1 to S3b)
- Scroll the page only (`window.scrollBy`), never `scrollIntoView`: it slides the Mobile shelf too.
- `snap.js` moves the page after a scroll: re-check the target is on screen before acting.
- Clip screenshots with `captureBeyondViewport: false` and page coordinates.
- Random start state (bulb slot): run every suite 3 times.
- `?debug` exposes `window.__landing` (car, runaway, ideas, area, out, stopPos, dodgeR): extend it for the guide.
