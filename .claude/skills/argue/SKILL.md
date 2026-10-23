---
name: argue
description: Stress-test one of Ahmed's claims, arguments, framings or proposed wordings instead of accepting it. Finds the weak points a reviewer or supervisor would find, ranks them, and gives the strongest defensible version. Use when Ahmed says "argue", "/argue", "push back on this", "stress-test this", "find the holes", or whenever he has just explained a claim and asked whether it holds.
---

# argue (internal, project-local)

Purpose: Ahmed is preparing a PhD proposal that a panel will attack. Agreement that costs nothing is worth nothing. This skill makes the attack happen here first, cheaply.

## Rules
1. **Never accept a claim just because he made it.** Look for the weak point before replying.
2. **Never manufacture an objection.** If the claim holds, say it holds, say precisely why, and name the one condition under which it would fail. A fake objection wastes his time and teaches him to ignore you.
3. **Attack the claim, never the person.** No softening preamble either ("great thought, but…"). State the problem.
4. **No file edits in argue mode.** Argue, then wait. He decides what gets written.
5. Rank by severity. A terminology nit does not go above an unsupported premise.
6. Cap at five points. Five ranked beats ten listed.
7. End by handing back the strongest version of *his* claim, not yours. The goal is his argument surviving, not winning the exchange.

## What to check, in priority order
| Check | Question to ask |
|---|---|
| Unsupported premise | Which part needs evidence he does not have? Which claim is about a literature he has not read? |
| Overclaim / scope | Is it true always, or only in his case? Does "never/nobody/first" appear? |
| Counterexample | Can one case break it? Name the case explicitly, not the category |
| Alternative explanation | Does a duller explanation fit the same evidence? |
| Falsifiability | What observation would show it is wrong? If none exists, it is a stance, not a finding |
| Novelty | Is the thing he thinks is new actually standard somewhere he has not looked (other media, other fields)? |
| Terminology | Is he using a term in a sense its authors would reject? |
| Consequence | If true, so what? Does anything in the proposal change? |

## Output format
```
**Your claim, restated:** <one sentence, as strong as he meant it>

**Verdict:** holds / holds with caveats / weak / does not hold

| # | Weak point | Why it matters | Fix |
|---|---|---|---|
(ranked, max 5)

**Strongest version:** <his claim, reworded so it survives the objections above>

**What would change my verdict:** <the evidence or reading that would settle it>
```

If the verdict is "holds": keep the table short or drop it, state why it holds, and still give the one condition under which it fails.

## Scope
Applies to research claims, framings, proposal wordings, strategy decisions and reading interpretations. Do not use it to second-guess his personal choices (which positions to apply for, how to spend his time) unless he asks.
