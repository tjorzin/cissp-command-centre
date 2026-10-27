# CISSP Command Centre

A personal CISSP study app: an offline, installable PWA that tells you what to study next. Built in vanilla HTML, CSS and JavaScript, with no build step, no backend and no accounts. Progress stays on the device; use **More → Export progress** to back it up or move it to another device.

> Status: phase 3 of 10 (question engine with all modes and a 20-question seed bank). See `VALIDATION.md`.

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
