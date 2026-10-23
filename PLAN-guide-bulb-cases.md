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
- Keys: WASD always; arrows on the landing as today, below it only after the first drive (D2). Only while the car is on screen.
- Canvas `pointer-events: none` always; one document listener for clicks.
- Landing round (catch 5, runaway dodges) works as today on top of this.
- Done when: drive top to bottom and back with keys, screen follows both ways; landing round unchanged; clicks on buttons and covers still work.

#### G1 as built (23 Oct)
| Part | What |
|---|---|
| Layer | `.game-layer` in `body`: fx canvas, 3D canvas, bubble. z 15, clicks pass through |
| Pinned to the page | Layer is part of the page, moved back over the screen each frame (`place()`) |
| Why not fixed | A fixed layer lags a frame behind the scroll: car would wobble on the page |
| Page length | Layer never reaches past the footer, so the page never grows |
| Car area | Whole page, clear of the bottom button bar. No walls |
| Bulb area | Landing only (`land`), as before |
| Screen follows | Keys, held mouse, clicks, taps. Only while the car is on screen and moving up or down |
| Landing exception | The screen waits until the car leaves the landing: the round never moves the page |
| Held mouse | Target stays on the page (a target tied to the screen made the page scroll on and on) |
| Clicks | Blocked: links, buttons, form parts, pictures, banner media, HUD, scroll car |
| Text | Click drives; drag selects |
| Keys | WASD while the car is on screen. Arrows: landing, or after the first drive |
| Car left down the page | Drives back in to the landing when you return there (S3b, until G4) |
| Runaway | As S3b: stops at Featured, All games, footer, then home (G2 replaces) |
| Sleep | Loop sleeps when nothing moves on screen; scroll or input wakes it |
| `rest.js` | `landingHolds()` reads `.entrance`, not the canvas |
| Removed | Chase mode (`out`, `goOut`, `goHome`, `car-out`), route round walls |

#### G1 tests
| Suite | Result |
|---|---|
| `g1.mjs` (new): layer, landing round, page drive, clicks, keys, phone, skimmer, sleep, dark, first visit | 45/45, 3 runs |
| `s3a-g1.mjs` (S3a, 2 checks moved to the page frame) | 14/14 |
| `s1.mjs` (shelves) | 33/33 |
| Console errors | 0 |
| Weight, 3D chunk gzip | 143.2 → 142.2 KB |

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

#### G2 as built (23 Oct)
| Part | What |
|---|---|
| The guide | The runaway, once it leaves the landing (`it.guide`) |
| It leaves | 3 dodges, chase stopped 8 s, cornered, or the visitor leaves the landing (played or not) |
| First hop | To the Featured heading, "Hey! Come back!" |
| Spots | Landing spots (not ones a round bulb sits on), headings, building sites in view, footer line |
| Headings | Featured, each banner title, All games, each shelf name |
| Spot rules | Beside the text, else above. Never on a picture or button. Never lower than the car can get below |
| Chaser | Car, if it moved in the last 5 s and is on screen. Else the mouse pointer (90 px). Touch: car only |
| Hop ahead | Next spot in the chaser's up or down direction (flat: last scroll). Nearest on screen first. Never next to the chaser |
| End of page | Nothing ahead: short dodge where it is |
| Scroll away | Scroll rests 0.4 s, it is off screen behind you: hops in from that edge onto the nearest spot |
| Scroll direction | From where the scroll started to where it ended (a small nudge at the end does not count) |
| Rest | Creeps to the car, else the pointer. Reach for it: "So close!", hops on |
| Lines | Car only, while on screen |
| Brainstorm | Also given when the rest are caught after one went ahead |
| Removed | Stops list, home run, come back, skimmer hop-off |
| Cost | Same as the landing before G2 while the guide shows; loop sleeps when it is off screen |
| Building sites | Stands in the site's picture (on phones the slot row also holds the words) |
| One bulb on screen | Shelf and rest bulbs hide while the guide shows; hide at once, fade back in |
| Screen edge | Counts as showing until well off screen, so the shelf bulb never flickers |

#### G2 tests
| Suite | Result |
|---|---|
| `g2.mjs` (new): round to guide, chase to footer and back, scroll away, mouse, rest, phone, resize, dark | 25/25, last 2 runs; chase part 12/12 × 3 after the last fix |
| `g1.mjs` (3 checks rewritten for the guide) | 45/45 |
| `s3a-g1.mjs` | 14/14 (2 one-off misses in 4 runs: edge speed, click park 92 px) |
| `s1.mjs` | 30/33: phone work-in-site beat steps aside for the guide (G3) |
| Console errors | 0 |
| Weight, 3D chunk gzip | 142.2 → 143.0 KB |

### G3: shelf beats moved onto the guide
- Building site: bulb works in its slot (hop per 120 px of scroll, dust, lines).
- Reach (cursor or car): "Nope, not a game yet.", laugh, hop to the next spot ahead.
- Perch on a cover, slide hop: as S1, but the 3D bulb at the DOM anchor.
- `shelfbulb.js` retired on the home page. `rest.js` off on the home page (the guide rests instead); kept for other pages.
- Done when: never two bulbs; the car driving into it makes it hop.
- Ahmed picked reading A (23 Oct, "Go A"): S1 chain kept on the shelves; covers are not guide spots (D4 unchanged).

#### G3 as built (23 Oct)
| Part | What |
|---|---|
| One bulb | `html.has-guide` (set in `entrance.js` when WebGL works): `shelfbulb.js` never loads, `rest.js` stays off |
| No WebGL | Old shelf bulb and resting bulb as before |
| Work | In a building site, on screen: small hop per 120 px of scroll, up or down; stretch, squash, 2 dust puffs |
| Work lines | 3rd hop, then every 6th: "Almost done." and the rest (drafts) |
| Own bubble | Ink bubble over the bulb (`.guide-say`); hangs under it at the top of the screen |
| Reach in a site | Car or pointer close, or pointer on the site: "Nope, not a game yet.", laugh (3 giggles, eyes squeezed, rays flick) |
| Then (mouse) | Perches on the first cover in view on the next shelf ahead |
| Then (car, touch) | Next spot ahead, as G2 |
| Ahead after the laugh | The way the visitor was heading when they reached (fix: the car swung round during the laugh, so it hopped back and the chase looped) |
| Perch | Top edge of the cover, near the right corner |
| Point at its cover | Car shouts "Hold still!" at the pointer; one cover along; after the last game into the site |
| Nowhere along | One-game shelf, or next cover out of view: next spot ahead |
| Car at a perch | Next spot ahead (the car does not walk it along) |
| Slide | Shelf it stands on slides 40 px or more: once the slide stops, it hops to the far cover in view (the end: its site) |
| Phones | In a site it shrinks to 0.7 (the picture is small), as S1 |

#### G3 tests
| Suite | Result |
|---|---|
| `g3.mjs` (new): one bulb, work, lines, dust, reach, laugh, perch, "Hold still!", along a shelf into its site, slide on, slide to the end, slide back, car chase, phone tap, reduced motion, dark, no WebGL | 38/38, 3 runs |
| `g2.mjs` (idle check now allows a creep toward the car) | 25, 25, 24 of 25 |
| `g1.mjs` | 45/45 |
| `s3a-g1.mjs` | 14/14 |
| `s1.mjs` without WebGL (old shelf bulb) | 33/33 |
| Console errors | 0 |
| Weight, gzip | 3D chunk 142.98 → 144.51 KB; CSS +0.1 KB; shelf bulb chunk (1.9 KB) no longer loads on the home page |

#### G3 round 2 (23 Oct, Ahmed's feedback: "now it just keeps dodging"; "a guide wouldn't go back")
| Part | What |
|---|---|
| Forward only | `ahead()`: next spots below only; the chaser's direction no longer counts. After the laugh: the next shelf down |
| Out of sight | First spot below the screen or under the bottom bar (`.hud`, z 30, over the game layer); near the end, the last spot below it |
| End of the page | Nothing below: hops off the side of the screen, away from the chaser, at the same height; after 6 s sneaks back in from that side onto the lowest spot on the screen (the footer line). Ahmed: "At the very bottom, the bulb is not running away anymore" (the never-up dodge had no room), then "go" on the side exit |
| On screen (fix) | `onScreen()` counted the bottom bar twice (`Math.min(H, area.b) - BOTTOM`, and `area.b` already leaves it out): now `Math.min(H - BOTTOM, area.b)` |
| Sneaks back | Out of sight below, visitor stays put 6 s (`BACK_MS`): slow, low hop in from the bottom edge onto the spot just below the car or pointer; "There you are!" |
| Catches up | Visitor scrolled down past it: in from the top edge, as G2 |
| Follows back up | Visitor scrolled up, it is below: once the scroll rests, sneaks in from the bottom edge |
| Fixes the g2 miss | A guide under the bottom bar now counts as out of sight, so it sneaks back in |
| Side effect | From PC / Steam's site the mouse sends it down to Storm Alert (one game, no site); the Mobile shelf's covers are reached from its own site (slide to the end) |

#### G3 round 2 tests (frozen build in the scratchpad, `BASE=http://127.0.0.1:4173`)
| Suite | Result |
|---|---|
| `g3.mjs`: + forward part (reached from below still goes down, out of sight, back after about 6 s, follows back up), never-up check per part (hops recorded in the page) | 50/50, 3 runs |
| `g2.mjs`: "chased up" replaced by "drive back up: never hops up ahead of the car; back at the top it has followed onto the screen" | 25/25, 3 runs |
| `g1.mjs` | 45/45, 2 runs |
| `s3a-g1.mjs` | 14, 13, 14 of 14 (known flake: click park 81 px) |
| `s1.mjs` without WebGL | 33/33, 2 runs |
| Weight, 3D chunk gzip | 142.98 → 144.67 KB |

#### G3 round 3 (23 Oct, Ahmed: "So everytime it just appears on the linkedin link? ... now it is predictable"; "if I put the car there, it still goes there")
| Part | What |
|---|---|
| Fresh place | `backPlace()`: random free place in the part filling most of the screen (landing, banner, shelf, footer); else anywhere free on the screen; else a spot on the screen |
| Free | `busyIn()`: text, links, buttons, pictures (any size), and cards or covers (background, border, shadow), kept off by 8 px |
| Not again | Never within 220 px of the last place it came back to |
| Way in | Left, right or bottom edge at random (top: catching up after a scroll down), never the last edge, never across the car |
| Car always counts | Return places keep `dodgeR` + the car's size + 30 px from the car, parked or not; dodge targets too |
| Heading spots | Same free test: beside, a little further on when something is in the way, else above, else none (the footer line no longer lands on LinkedIn) |
| `low()` | Removed: it kept spots above the car so the guide could be chased back up; forward only makes that unneeded |
| Phones | Often no free place (lists fill the width): then a spot on the screen, or a peek in from a side edge (24 px in) at a row with the least page under it, picked at random (rest.js's phone peek) |
| Test hooks | `__landing.guideTo(el)` puts the guide on a site or cover; `__landing.backPlace()` (`?debug` only) |
| Known | A tap far down the page: the car drives 6 s and can stop short (G4); tests tap again, as a visitor would |

#### G3 known (not fixed)
- Perched on the last cover of the sliding shelf, the bulb's glow overlaps the shelf's arrow buttons (as S1); clicks still reach them.
- Phone: a tap far down the page sends the car only 6 s, so it can stop above the screen (G4: car comes to you).

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
