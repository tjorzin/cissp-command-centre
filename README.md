# CISSP Command Centre

A personal CISSP study app: an offline, installable PWA that tells you what to study next. Built in vanilla HTML, CSS and JavaScript, with no build step, no backend and no accounts. Progress stays on the device; use **More → Export progress** to back it up or move it to another device.

> Status: phase 8 of 10, content batch 5 of 8 (Domains 1 to 5: 159 of the planned 240 questions, plus lessons, cards, drills and labs). See `VALIDATION.md`.

Content is added one domain at a time: write a batch file, merge it with `node tools/merge-batch.js <file>`, then `npm run validate` (schema, give-away lint, lessons, drills and labs) before committing.

## Today: the Next Study Plan

Today always leads with **Do this next**. On first run that is the baseline diagnostic (six questions per domain at mixed difficulty, up to 48; no feedback until the end), which becomes your starting point. After that the plan has three blocks at your reminder times, each 20 to 45 minutes:

| Block | What goes in it |
|---|---|
| Morning (recall) | Any reteach that is due, then due flashcards and due topics |
| Afternoon (focus) | Learn: practise the weakest domain. Drill and Simulate: a weakness drill on your misses |
| Evening (deep) | Learn: the next-weakest domain. Drill: hard mode. Simulate: a timed mini exam |

Weakest means lowest recent accuracy (or baseline, until a domain has 10 recent answers) multiplied by the domain's exam weight; a domain with no evidence yet is nudged up so all eight get covered. Phases run from the target date: **Learn** until 10 weeks out, **Drill** until 4 weeks out, then **Simulate**, with a weekly adaptive mock once the bank allows it and a **go / move checkpoint** 3 weeks before the exam. The plan is rebuilt from your current state every time: a missed day re-plans, nothing piles up, and the streak is shown but never held against you. Today's domain picks are fixed once made, so the plan does not reshuffle while you work.

## Reminders

At 05:45, 13:00 and 20:30 Africa/Harare by default (Settings). While the app is open or recently used, it shows a notification at each block time if you allow it, and every screen shows a **due now** banner when a block's time has passed and it is not done. A web app cannot wake itself when closed, so **Settings → Add reminders to my calendar** downloads a calendar file with the three daily alarms up to the day before the exam; your phone's calendar then rings reliably. Background push needs a server or the optional Android wrapper (phase 10).

## Readiness

Performance (from Today or More) shows each domain's accuracy, accuracy when sure, time per question, last revised and trend; accuracy by difficulty; and calibration (how often "sure" is really right). Below 20 answers a figure says "not enough data". Four readiness gates are shown as met or not met with their evidence, never as a single percentage or pass prediction. Thresholds are in Settings. Note: adaptive mocks keep accuracy near 50 to 60% by design, so the mock gate defaults to "band above in both of the last two mocks"; the brief's 75% accuracy rule is still available in Settings.

## Spaced repetition: why Leitner, not SM-2

The scheduler is a Leitner box system (`js/engine/srs.js`), applied to every flashcard and to every outline objective (sub-topic). Answering any question on an objective reschedules it; Topic review serves one question per due objective.

| Box | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| Next review in (days) | 1 | 1 | 3 | 7 | 14 | 30 | 60 |

- **Right** moves an item up one box; **wrong** sends it back to box 0 (tomorrow); a **correct guess** moves it up half a box, so two guesses equal one confident answer.
- **Daily cap** (default 30, in Settings) limits deliberate reviews per day; anything over it is held back, oldest first, so a backlog never becomes a wall. Up to 10 new cards a day join the queue, newly covered objectives first.
- **Exam guard:** no interval runs past two days before the target date, so everything comes back once more before the exam.

Why Leitner: the inputs here are coarse (wrong, guess, right), not SM-2's six-point quality grades, and SM-2's per-item ease factor needs many reviews to settle, which a 22-week plan with a growing bank will not give it. With fixed boxes, the brief's rules are exact rather than approximated: a miss resets the interval, a guess earns precisely half credit, and the next due date is predictable and testable. If the bank and history grow large, the box intervals can be tuned from real recall data without changing the model.

## Error Ledger

Every miss, and every right answer marked as a guess, is recorded with why your choice was wrong and the correct reasoning. The Patterns panel lists sure-but-wrong misconceptions first, ranks objectives missed more than once, and counts your one-tap error classes (first step vs best step, technical vs management, scope or terminology, pure recall). Three misses on one objective trigger a reteach: a short lesson and a written teach-back before study questions on it resume.

## Question modes

Practice set, Scenario set, Mini exam (25 × 90 s), Adaptive mock (100 to 150 questions, 3 hours; a staircase simulation, not ISC2's algorithm; unlocks at 150 questions), Weakness drill and Hard mode (levels 5 to 6). Confidence (guess / unsure / sure) is captured before every answer is revealed.

## Exam facts

Verified against ISC2's published outlines on 27 October 2026. See `data/SOURCES.md`. **ISC2 has published a new outline that takes effect on 15 April 2027.** The app uses the 2024 outline by default and switches to the 2027 weights if your target date falls on or after 15 April 2027. A warning shows on every screen when your date is within four weeks of the change or past it.

## Run locally

```bash
npm run serve
```

Then open http://127.0.0.1:4173. Node is needed only for the local server and the tests. The app itself is static files.

## Tests

```bash
npm install
```

```bash
npx playwright install chromium
```

```bash
npm run test:all
```

Check the question bank against the standard (schema and give-away lint):

```bash
npm run validate
```

Rerun the 300-paper randomness proof:

```bash
npm run simulate
```

## Dependencies

- **Runtime: none.** All code is in this repo.
- **Dev only:** `@playwright/test`, used for the browser tests the brief requires (offline load, export/import round trip, the functional run). Unit tests use Node's built-in `node:test`.

## Content rules

Questions follow `docs/QUESTION-STANDARD.md`: tough, realistic, original and free of give-aways (length, wording, absolutes, answer position), and written against current framework versions. None are real ISC2 items.

## Layout

```
index.html  manifest.webmanifest  sw.js  icons/   PWA shell
css/app.css                                     theme tokens, 360 px-first layout
js/app.js  js/store.js  js/outline.js  js/ui.js  js/views/
data/      outlines.json (dates, weights), domains.json (62 objectives, topics tagged by outline), SOURCES.md, schema/
docs/QUESTION-STANDARD.md
tests/unit  tests/e2e  tools/
```
