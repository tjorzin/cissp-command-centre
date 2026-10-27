# CISSP Command Centre

A personal CISSP study app: an offline, installable PWA that tells you what to study next. Built in vanilla HTML, CSS and JavaScript, with no build step, no backend and no accounts. Progress stays on the device; use **More → Export progress** to back it up or move it to another device.

> Status: phase 5 of 10 (spaced repetition and cards). See `VALIDATION.md`.

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
