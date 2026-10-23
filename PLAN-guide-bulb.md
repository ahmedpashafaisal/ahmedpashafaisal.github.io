# Plan: the guide bulb

Read first in a new session. Tracker: [CHECKLIST-runaway-idea.md](CHECKLIST-runaway-idea.md) (rows G0 to G6).
Bugs, corner cases, tests: [PLAN-guide-bulb-cases.md](PLAN-guide-bulb-cases.md).
Older decisions and story: [PLAYBOOK-runaway-idea.md](PLAYBOOK-runaway-idea.md).

## Where we are (23 Oct 2026, night)
| Step | State |
|---|---|
| S1 building-site slots | Done, commit `0e55b2b` |
| S2 car look | Done: car A, red |
| S3a red car + keys | Done, commit `4e422c7` |
| S3b chase into the page | Committed as work in progress (G0). Ahmed: "It's okay but need to fill a few gaps" |
| This plan | Replaces the rest of S3b and S3c |

## Ahmed's words (23 Oct, feedback on S3b)
- "let the car drive over the elements in the landing page / home section as well"
- "the bulb should just dodge like before instead of going back to the top"
- "the bulb should be near where the user is (can be near the car or the cursor based on what ever the user is doing). If it reaches back to the top it fails the purpose"
- "call the car to any empty space with mouse click as well, even on the texts, unless it is a clickable object like button or a game image"
- "I can not drive back to the top anymore, I have to scroll again."
- "sometimes there are two runaway bulbs" and "the car catches the bulb and the bulb is attached to it"
- "think of the bulb as the guide of the website"
- "if a player visits all the pages it should be able to catch the bulb or the bulb will come to the player. But that is a later discussion"
- "we need to have a consistent story and narrative first"

## Story (one line each)
- The car is the visitor.
- The bulb is the idea that got away.
- It is also the site's guide: always near the visitor, one hop ahead.
- There is only one bulb, on every part of every page.
- It never runs back to the top on its own.
- Get close and it hops ahead, toward the next thing worth seeing.
- Rest and it creeps closer ("So close!").
- The ending (catch it after visiting every page) is a later talk.

## Rules
| Rule | Means |
|---|---|
| One bulb | Never two on screen. One state for the whole site |
| Near the visitor | Near the car if the car moved lately; else near the cursor; on touch, on screen |
| One hop ahead | It hops ahead of the visitor's direction, staying on screen |
| No way back | Never returns to the top by itself |
| End of page | Nothing further ahead: dodges where it is |
| Car = visitor | Car drivable anywhere on the home page; screen follows while driving |
| Over, not around | Car drives over page elements, landing included |
| Nothing blocks | Car and bulb never block clicks |

## How it works (picture)
- One see-through game layer covers the screen on the home page, from the first visit on.
- The car and the bulb live in it, pinned to the page, so they scroll with it.
- Drive anywhere: keys, click, tap. The screen follows the car while you drive.
- Bulb spots (page order): landing spots, section headings, building-site slots, footer.
- The bulb waits at a spot near you. Chaser (car or cursor) comes close: it hops to the next spot ahead.
- Scroll away from it: once the scroll stops, it hops back in near you.
- On the shelves it does its S1 work: hops with the scroll in its building site, "Nope, not a game yet."

## Steps
| # | Step | Fixes | Size |
|---|---|---|---|
| G0 | Commit S3b as work in progress (Ahmed decides) | | 5 min |
| G1 | One game layer, car anywhere | B3 | ½ day |
| G2 | One guide bulb on the home page | B4, part of B1 | ½–1 day |
| G3 | Shelf beats moved onto the guide | B1, B2 | ½ day |
| G4 | Car comes to you and parks (old S3c) | | ½ day |
| G5 | Other pages: same bulb, car reference | | later |
| G6 | Red accents on the site | | 2–3 h |

Details per step: [PLAN-guide-bulb-cases.md](PLAN-guide-bulb-cases.md#steps-in-detail).

## Decisions (Ahmed, 23 Oct: "all picks, D5 keep")
| # | Question | Decided | Why | Before |
|---|---|---|---|---|
| D1 | Click on text: drive, or keep text selection? | Click drives, drag selects | Both work | G1 |
| D2 | Arrow keys before the visitor has driven? | Landing: arrows drive (as S3a). Below it: arrows scroll until the first drive. WASD always drives | Keyboard readers keep scrolling; approved landing beat kept | G1 |
| D3 | Bulb drawn in 3D or as the SVG twin on the home page? | 3D on the whole home page; SVG on other pages | One bulb by construction | G2 |
| D4 | Bulb spots | Landing spots, headings, building sites, footer line | Guides to real content. Watch: long gaps on phones (covers could be spots) | G2 |
| D5 | Lines when it hops ahead | Keep "Not again!", "Wait up!", "Hey! Come back!" as drafts | Ahmed rewrites later | G2 |

## Working rules (unchanged)
- One step at a time: say what it creates, wait for "go", build, test, report.
- Real input in headless Chrome (puppeteer-core in the scratchpad), 1440 + 390, light + dark, 0 errors.
- Ask before every commit. Never push to `main` without OK.
- Test scripts from the last session (s1, s3a, s3b) are in a scratchpad that will be gone: rebuild from the test list.
