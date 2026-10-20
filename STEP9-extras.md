# Step 9: Extras (detail)
Status: built, **not approved yet**. Next session: car improvements.
Linked from `CHECKLIST-redesign.md`.

## Next session: start here
1. `npm run dev` → http://localhost:5173
2. Ask Ahmed for his car improvement list (he has one).
3. Tune in `site/src/js/hero3d.js` (tuning constants at the top).
4. Test with `?debug` (exposes `window.__landing`).

## Car game (landing): what exists
| Part | Where / how |
|---|---|
| Scene | `site/src/js/hero3d.js` (replaced the 6 toys) |
| Car | 3D ink toy car, top-down, camera tilted; starts on centre line |
| Control | Click: drives there + parks. Hold + move: follows. Nose first; turns only while moving |
| Park | Within 0.75 car length of target: parks. Never turns by itself. "Point to any idea" bubble after 1.2 s rest |
| Walls | Name, line, button, corners; drag routes round them |
| Phone | Full-width walls become passable (car under text) |
| Touch | Same as mouse: tap, or tap and drag |
| Ideas | Cartoon bulb (filament, shine, threads, rays); 6 fixed spots round name |
| Catch | Hit-stop, kick, lime ring + rays, burst, hop, "+1 ×n" |
| Wave clear | "Brainstorm!" + ripple; next wave after 3 s |
| Trail | Tyre marks, smoke-ring trail when running (2D canvas `.hero-fx`) |
| Dark mode | Car body turns light |

## Car: known gaps (candidates)
| Gap | Note |
|---|---|
| Ideas counter on landing | Planned "💡 n", not built |
| Real phone test | Only headless tested |
| Wheels do not steer | Visual only |
| Tuning | Max 900, follow 3.2, gas 6, turn 9 (12% when still), grip 4: untested by feel |
| `?debug` hook | Harmless; maybe remove before go-live |

## Other extras built this step
| Extra | File |
|---|---|
| Achievements (22) + toast + lime XP bar | `js/achievements.js` |
| Achievement list on About | `about.html#achievements` |
| Charged Press button | `js/charge.js` |
| Game cursor (Kenney hand, CC0) + click ring | `achievements.css`, `js/clickfx.js` |
| Easter eggs: cheat code, "juice" | `js/eggs.js` |
| Name click wave | `js/namefx.js` |
| Scroll bar car (ink) + road | `js/scrollcar.js` |
| Tab title tricks | `js/tabtitle.js` |
| Level progress card (footer) | `js/levelup.js` |
| Dot page transition | `js/wipe.js` |
| Dark mode toggle | `js/theme.js`, `styles/theme.css` |
| Bottom bar on scroll | `js/hud.js` |
| Section snap (home) | `js/snap.js` |
| Game Over 404 page | `site/404.html` |

## Achievements kept (22)
Press Start, Bright Idea, Brainstorm, Card Shark, Window Shopper, Rock Bottom, Speedrunner, Curious, Explorer, Completionist, Popcorn, Who's This?, Say Hi, Welcome Back, Turn It Up, Lights Out, Road Trip, Name Dropper, Night Owl, Fully Charged, AFK, 100%.

## Deck changes (21 Oct)
| Change | Where |
|---|---|
| Category tints (muted) | `tokens.css` `--cat-*`, cards, tab dots, next/prev |
| One order: featured, Legendary, category, newest | `js/order.js` (deck All + next/prev) |
| One category per game | Magic Mineral → PC/Steam; After the End, The Return → Jams |
| Shuffle button removed | `index.html`, `deck.js`, `deck.css` |
| Web tint clay → blush | `tokens.css`, `theme.css` |
| Bulb rays follow theme (cream in dark) | `hero3d.js` `rayMat` |
| Favicon: lime bulb on ink tile (svg, ico, apple-touch) | `public/`; old dice icon in git `2f180a4` |
| Twist the News out of games | About `#thesis` section; entry kept as `thesis` in games.json |
| Eat the Rich added | Jams, 2023; CTA "View on itch.io" (`linkLabels`) |

## Copy still open
Landing line: decided 21 Oct. "Game Producer · Game Designer · Narrative Designer" (phone: one per line, no dots).

Featured subtitle: removed. Ahmed to decide if any.

## Bugs fixed this step
| Bug | Fix |
|---|---|
| Cards invisible on phones / back from About | Deal-in triggers on deck top, not 12% |
| Toast blocked clicks | Toast is click-through |
| Name took no clicks | Name has pointer events |
| 404: bar never showed | Short pages show bar at once |
| Car trapped on phone | Full-width walls passable |
| Page scrolled by itself | Snap needs 40 px wheel; small drift settles back |
