# Plan: the guide bulb

Read first in a new session. Tracker: [CHECKLIST-runaway-idea.md](CHECKLIST-runaway-idea.md) (rows G0 to G6).
Bugs, corner cases, tests: [PLAN-guide-bulb-cases.md](PLAN-guide-bulb-cases.md).
Older decisions and story: [PLAYBOOK-runaway-idea.md](PLAYBOOK-runaway-idea.md).

## Where we are (24 Oct 2026)
| Step | State |
|---|---|
| S1 to S3b | Done (S3b replaced by this plan) |
| G1 game layer | ✅ Done, `3404b0c` |
| G2 guide bulb | ✅ Done, `8dd6a94` |
| G3 shelf beats | ✅ Done, `b330cf7` |
| G4 car comes to you | ✅ Done, `44fc6cd` (pushed) |
| G6 red accents | ✅ Done, `c3e6b5d` (not pushed) |
| Characters | Car = Ahmed's working side, one line; bulb = his curious side. [Playbook](PLAYBOOK-runaway-idea.md#cast-and-voices) |
| G5 + 7 game pages | ✅ Done 24 Oct, `7bc3340` |
| 8a About, 404, "So Close" | ✅ Done 24 Oct, `a19276a` |
| 8b the ending | ✅ Done 25 Oct ("it looks good"), `8907382` (not pushed) |
| 6c Featured beats | ✅ Done 25 Oct ("yeah looks good"), not committed |
| 9 final check | ✅ Done 25 Oct; site LIVE 25 Oct (`604c73c`) |
| Next | Ahmed decides |

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

## Ahmed's words (23 Oct, feedback on G3)
- "before it used to dodge and go away from the screen and sneak in after a while, now it just keeps dodging"
- "it goes back up sometimes, a guide wouldn't go back, would it?"
- Then "go" on: forward only, out of sight, back in after 6 s, follows from below when the visitor goes back up.
- "At the very bottom, the bulb is not running away anymore" (then "go" on the side exit).
- "So everytime it just appears on the linkedin link? Before it used to do all kinds of other stuff in random places, now it is predictable" and "if I put the car there, it still goes there" (then "Go" on fresh places).

## Story (one line each)
- The car is the visitor.
- The bulb is the idea that got away.
- It is also the site's guide: always near the visitor, one hop ahead.
- There is only one bulb, on every part of every page.
- It never runs back to the top on its own.
- Get close and it hops ahead, toward the next thing worth seeing: always down the page, out of sight.
- Stay put and it sneaks back in after a while ("There you are!").
- Go back up the page and it follows you from below; it never leads you back.
- Rest and it creeps closer ("So close!").
- The ending (catch it after visiting every page) is a later talk.

## Rules
| Rule | Means |
|---|---|
| One bulb | Never two on screen. One state for the whole site |
| Near the visitor | Near the car if the car moved lately; else near the cursor; on touch, on screen |
| Forward only | Every dodge goes down the page, whichever way the car or mouse moves |
| Out of sight | A dodge lands on the first spot below the screen (or under the bottom bar) |
| Sneaks back | Visitor stays put: back in after 6 s |
| Follows back up | Visitor goes up the page: once the scroll rests it sneaks back in |
| Fresh each time | Comes back to a random free place (off text, links, pictures, cards), from a random edge, never the last place or edge |
| Car always counts | Parked or moving: never lands by the car, never hops across it |
| End of the page | Nothing below: off the side of the screen, away from the chaser |
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
| G4 | Car comes to you and parks (old S3c) | ✅ Done 24 Oct | ½ day |
| G5 | Other pages: same bulb, car reference | Game pages built 24 Oct (with step 7) | ½ day |
| G6 | Red accents on the site | ✅ Done 24 Oct (set B) | 2–3 h |

Details per step: [PLAN-guide-bulb-cases.md](PLAN-guide-bulb-cases.md#steps-in-detail).

## Decisions (Ahmed, 23 Oct: "all picks, D5 keep")
| # | Question | Decided | Why | Before |
|---|---|---|---|---|
| D1 | Click on text: drive, or keep text selection? | Click drives, drag selects | Both work | G1 |
| D2 | Arrow keys before the visitor has driven? | Changed 24 Oct (Ahmed: "make the car move only through WASD and Mouse. Keep arrow for scrolling only"): arrows only scroll, everywhere. Car: WASD, mouse, taps | Keyboard readers keep scrolling | G1, G4 |
| D3 | Bulb drawn in 3D or as the SVG twin on the home page? | 3D on the whole home page; SVG on other pages | One bulb by construction | G2 |
| D4 | Bulb spots | Landing spots, headings, building sites, footer line | Guides to real content. Watch: long gaps on phones (covers could be spots) | G2 |
| D5 | Lines when it hops ahead | Keep "Not again!", "Wait up!", "Hey! Come back!" as drafts | Ahmed rewrites later | G2 |

## Working rules (unchanged)
- One step at a time: say what it creates, wait for "go", build, test, report.
- Real input in headless Chrome (puppeteer-core in the scratchpad), 1440 + 390, light + dark, 0 errors.
- Ask before every commit. Never push to `main` without OK.
- Test scripts from the last session (s1, s3a, s3b) are in a scratchpad that will be gone: rebuild from the test list.
