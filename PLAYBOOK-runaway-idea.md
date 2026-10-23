# Playbook: runaway idea

## Goal
A livelier, more custom, fun site built from Ahmed's own idea, with no heavier load.

## Decisions (interview, 22 Oct 2026)
| Area | Decision |
|---|---|
| Heavy = | Load weight; amount of motion is fine |
| Budget | First screen ≤ 500 KB; new effect ≤ 15 KB gzip JS; no new libraries; art as SVG/WebP |
| Flat spots | Landing, featured + deck, game pages, About |
| Replace | Layouts only (fonts, buttons and black shadows kept, 22 Oct) |
| Keep | Cream + dot grid; 3D car |
| Reference | bruno-simon.com = quality bar ("his own"), no cues copied |
| Theme | Idea hunt |
| Story form | Running joke alongside the sections; no story up front |
| Replaces | 20 Oct rule "No narrative frame, nothing fancy" |
| Story | "The one that got away" (locked 22 Oct, see below) |
| Tone | Funny leads; subtext never said aloud |
| End | No end: "rest when you rest" near-miss, anywhere |
| Game pages | One shared beat; featured 3 keep their own banner beats |
| Serious pages | Quiet beat (Storm Alert page, About thesis section) |
| Return visits | Bulb remembers you: starts closer each visit, never caught |
| Skimmers | No car game played: the runaway hops off ahead of them when they start scrolling |
| Car game rounds | One round of 6 (4 or 2 when the screen is too short; the joke works the same), no new rounds, no "Brainstorm!" text; the runaway comes back 6 s after leaving ("There you are!") |
| Landing hint | Car says "Drive me to an idea" until the first catch, then never again; "Catch me." dropped 22 Oct |
| Bulb | Existing 3D bulb (`hero3d.js`); the 5 caught bulbs stay plain |
| Runaway bulb | Eyes beside the filament, no mouth; eyes change with each motion (22 Oct) |
| Bulb elsewhere | SVG twin of the 3D bulb (~3 KB); poses via CSS |
| Handwriting | Parked; lines in speech bubbles (car-bubble style) |
| Car after the landing | 23 Oct: ink car on the shelves removed; scrollbar car stays. One 3D car follows you section to section, drives to a spot and parks; some reference on every page; phones when light enough |
| Car look | 23 Oct: "too flat"; game or toy look. Picked S2 option A in red (toy car in code, about 2 KB): "Red A car looks interesting"; red maybe as subtle accents (open) |
| Car keys | 23 Oct: drivable with WASD and the arrow keys (S3a: screen directions, landing only for now) |
| Chase into the page | 23 Oct: after 5 catches, chasing the 6th down the page auto-scrolls and the car stays visible (S3b) |
| Car control in sections | My plain pick, not yet confirmed: no steering; click = honk, bounce, shout |
| Empty slots | 23 Oct: under construction (broken or growing), universal signs, yellow-black; bulb hops with page scroll "as if it is working on it", with lines; reach = runs away as before |
| Scope | Re-skin in waves, live after each |
| Look of buttons, labels, frames | Kept as before: lime pills, hard black shadows. "Glass" built 22 Oct, then reverted: weaker in light mode |
| Fonts | Keep Bricolage Grotesque (headings) and Figtree (body) |
| Featured | Kept as is: clean enough (Ahmed, 22 Oct); only its 3 bulb beats are added |
| Deck | Locked 23 Oct: H Adaptive shelves (`site/layouts-test.html?opt=H`). One shelf per category, covers uncropped 16:9, one click to the game page (no flip, no "See more"). Shelf slides only when its games do not fit; 2–3 games fill the width; 1 game shows its story beside the cover. Phone: short list per shelf. Featured 3 included. Map, islands and forest look dropped |
| Map look | Dropped 23 Oct (2D/3D map "ugly"; islands "not convinced") |
| Deck bulb beat | Decide in step D3 (shelves juice + bulb). Parked ideas: empty slot "Nope, not a game yet."; graveyard of unfinished ideas |

## Story: "The one that got away" (locked 22 Oct)
Core (never said on the site):
- One idea will not be caught.
- The visitor chases it through the whole site.
- It always stays one hop ahead.
- It only comes close when you stop chasing.

### Cast and voices
| Who | Speaks how |
|---|---|
| Car = visitor | Short shouts ("Hey! Come back!", "So close!", "There you are!") plus the how-to-play line "Drive me to an idea" |
| Runaway bulb | Mostly acts; a few cheeky lines |

### How the bulb shows feeling
| Channel | Means |
|---|---|
| Distance from car/cursor | Near = maybe, far = not yet |
| Glow | Bright = showing off; dim = hiding |
| Rays | Quick flick = laughing; spread = surprised |
| Body | Hop, dodge, lean, squash, settle |
| Eyes (runaway only) | Open, wink, squint, closed, wide, sad, spirals; look toward things; blink at rest |
| Symbols | Z's when asleep |

### Beats (1–2 s each, never block; bulb exits toward the next section)
| Page | Beat |
|---|---|
| Landing | Catch the bulbs in any order; the last one left opens its eyes and dodges (car: "What the…!", "Hold still!", "Seriously?!"), then hops off toward the games ("Hey! Come back!"); 6 s later it hops back in ("There you are!") |
| Featured: Wildlings | Bulb blasted across the banner by recoil |
| Featured: Magic Mineral | Bulb dims to hide in the dark cave shot; its glow gives it away |
| Featured: Storm Alert | Quiet: sits by the lit window, soft glow, no gag |
| Deck (shelves) | Step D3 decides. Was: one card wiggles; flip it: bulb pops out, "Nope, not a game yet.", hops into another card |
| Game pages (shared) | Bulb peeks at the screenshots, then ducks behind "Next" |
| Storm Alert page | Quiet: bulb sits still, soft glow |
| About | Bulb hovers over the avatar's head. Car: "There you are!" Rays flick, it hops off |
| About: thesis section | Quiet: no gag |
| 404 | Bulb sits in the middle: "You found my hiding spot." |

### Rest when you rest (the end that isn't one)
- Visitor still for ~4 s, any page: bulb stops, settles, slowly edges closer.
- Visitor reaches for it: it hops away by a hair. Car: "So close!"
- Works wherever anyone leaves.

### Return visits
- Each visit the bulb starts a little closer on the landing, then bolts.
- The gap shrinks per visit, never reaches zero.

## Changed after step 1 (22 Oct)
| Was | Now | Why |
|---|---|---|
| Bulb from Ahmed's sketch + AI cleanup | Existing 3D bulb | Drawing would take too long |
| AI spend rule | Dropped | Nothing to generate |
| Steps: sketch, cleanup, landing test, 5 poses | One step: SVG twin + match check | Same bulb everywhere |
| Ending: "Finally caught; becomes a blank card: Got an idea? Email me" | No catch; near-miss "So close!" anywhere | "Maybe possible"; visitors leave anywhere |
| Return visits: caught bulb becomes a quiet sidekick | Bulb starts closer each visit | No catch |
| Game pages: "this one was mine" | Shared peek beat | Bulb is never a shipped game |
| Landing hint "Drive me to an idea" | "Catch me." | Car = visitor |
| "Catch me." + fixed bottom-right runaway with eyes from the start | "Drive me to an idea" back; runaway = last bulb left; eyes open at its first dodge | Ahmed: no curiosity, no fixed order |
| New normal rounds with "Brainstorm!" after the escape; "Drive me to an idea" at every stop | No new rounds, runaway comes back; hint only until first catch; car reacts at each dodge | Ahmed: rounds felt like before; hint at every stop unwanted |
| "Brainstorm" achievement: "Caught a whole wave of ideas." | "Caught every idea but one." (unlocks at the 5th catch) | A full round can no longer be caught |
| Fonts flagged as template | Fonts kept; only shapes change | Ahmed, after the font comparison |
| Lime pills with hard black shadow | Kept ("Glass" built, then reverted) | Ahmed: old look better in light mode |
| Bulb: no face, acts through motion only | Runaway bulb gets eyes (beside the filament); 5 caught stay plain | Feelings looked alike; eyes mark the one that got away |
| Skimmer hop-off on any scroll mid-round | Only before the first catch | Ahmed: bulbs went away on scrolling back up (23 Oct) |
| "Drive me to an idea" until the first catch | Until the first catch or the runaway first shows | Ahmed: the line came back after missing the last bulb (23 Oct) |
| Car scrapes and bounces round the walls | Brakes for corners, keeps clear, slides on soft touches; drives under a wall with no comfortable gap | Ahmed: "bumps to the obstacles uncontrollably" (23 Oct) |
| Fake Skip top-right on every page (the gag) | Dropped; step 5c is resting only | Ahmed: nothing blocks, so no Skip needed |
| Deck: grid of trading cards, filter tabs, flip for the story | Shelves per category, H Adaptive shelves (23 Oct; map tried in 6a, islands in D1, both dropped) | Ahmed: deck is the least fun part and not clean; the grid looks most like a template; "See more" was the only way to a game page |

## Defaults I picked (not asked)
| Default | Why |
|---|---|
| Kit (fonts, buttons, shadows) site-wide in wave 1 | One look at all times |
| Beat plays on scroll into view, once per visit | Never blocks; works without hover |
| Bulb never covers text/buttons/cards; click-through | Rule: nothing blocks clicks |
| Car shouts in the existing ink bubble; bulb lines in a small lime bubble | Two voices told apart at a glance |
| New achievement "So close" (23rd) on first near-miss | Visible payoff, existing system |
| Rest trigger: ~4 s with no scroll, pointer or key input | Long enough to mean "stopped" |
| Rest, landing: 3D runaway creeps up on the parked car to ~110 px; reaching for it: dodge + "So close!" (not one of the 3 dodges) | Car is right there; closer than a chase ever gets |
| Rest, other pages: SVG bulb at a random free spot in the empty strips beside the page, random entrance (tiptoe, drop, pop); edges up to 4 hops toward the cursor's height; nods off if still 12 s | Fresh every time (Ahmed, 22 Oct); never on text |
| Rest, no strip (phones, narrow windows): peeks from a side edge at a random row among those with the least page under it; entrance slide, drop or pop | Text stays readable |
| Rest: never the same spot area or entrance twice in a row, for the whole visit | Fresh every time |
| Rest leaves quietly on scroll, typing, or 5 s busy elsewhere; at most once per 30 s | Reading looks like resting |
| Rest bulb loads on the first rest (lazy) | No first-load weight |
| "So close!" on other pages: car's ink bubble at the pointer | Car = visitor, same voice |
| Reduced motion: still poses, no hops | Accessibility |
| Copy: Claude drafts, Ahmed rewrites; sentence case, UK spelling, no em dashes | Existing copy rules |
| SVG twin inline, ≤ 5 KB; colours from CSS tokens (dark mode follows) | Budget, one source of colour |
| Each step: headless test 1440/640/390 px, real input, 0 errors, KB measured | Same as redesign |
| Work on branch `lively`; push to `main` (= deploy) only on Ahmed's OK | Outward-facing |

## Steps
| # | Step | Creates / changes / spends | Time |
|---|---|---|---|
| 1 | Save docs | 2 md files; 1 pointer line in `CHECKLIST-redesign.md`; branch `lively` | 5 min |
| 2 | Lock story | Story section in this playbook | done |
| 3 | Bulb twin + match check | SVG copy of the 3D bulb; motions: idle, dodge, hop off, hide (dim), show off, settle, laugh (ray flick), blasted, peek; shown next to 3D bulb; Ahmed approves match | 2–3 h |
| 3b | More motions + eyes | 11 more: sad, flee, drop in, sleepy, scared, curious, dizzy, sneak, beckon, side peek, trip; eyes per motion; Z's; 4 look-alike pairs split; test page rows | 4¾ h |
| 4 | Kit test | 2–3 button/font/card-frame sets from the bulb's look on one page; Ahmed picks | 2–3 h |
| 5a | Wave 1a: Glass look everywhere (reverted) | Buttons, labels, game cards, picture frames, speech bubbles on all pages; dark mode outlines cream | 2–3 h |
| 5b | Wave 1b: Landing joke | Last bulb left wakes up (3D eyes), dodges, hops off toward the games (or on scroll: a random one); "Hey! Come back!"; visit memory | 2–3 h |
| 5c | Wave 1c: Resting | Rest when you rest + "So close!" (Skip dropped 22 Oct) | 3 h |
| 6a | Map look test | Dev-only page: 2D and 3D map side by side to switch, desktop + phone, ways to light up a stop, weight measured | 4–5 h |
| 6b | Deck map | 13 stops in regions; map pinned while scrolling; scroll or click drives the car; focus card with "Open game"; phone layout; keyboard access | 1.5–2 days |
| 6c | Featured beats | The 3 banner beats (Wildlings blast, Magic Mineral hide, Storm Alert quiet) | ½ day |
| 7 | Wave 3: Game pages | Template layout; shared peek beat; quiet beat on Storm Alert | 2–3 h |
| 8 | Wave 4: About, footer, 404 | Head beat + "There you are!"; quiet thesis section; 404 beat; "So close" achievement | 2–3 h |
| 9 | Final check | Weight + Lighthouse (Perf ≥ 85, A11y ≥ 95); docs updated | 1 h |

Total: ~3 days of build.
