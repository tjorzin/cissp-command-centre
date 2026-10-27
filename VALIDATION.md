# Validation log

Each phase adds a section. Commands are run from the repo root with Node 24.22.1 and Playwright 1.64.1 (Chromium), using a Pixel 7 profile at 360 × 780, time zone Africa/Harare.

## Phase 5: spaced repetition and cards (27 October 2026)

`npm run validate`: questions **no errors**; cards **25 across 8 domains, no errors** (every field present; term ≤ 70, meaning ≤ 320, trap ≤ 200, hook ≤ 90 characters).

`npm test`: **62 passed, 0 failed** (9 new scheduler tests)
- **Interval growth:** consecutive right answers give gaps of 1, 3, 7, 14, 30, 60, 60, 60 days.
- **Reset on miss:** an item in box 4 goes to box 0, due tomorrow, with a lapse counted.
- **Half credit on guess:** two guesses reach the same box as one right answer; a half step does not lengthen the interval until it completes.
- **Daily cap:** with 40 topics due and a cap of 30, 30 are queued oldest first and 10 held back; reviews done today reduce the queue; the counter resets the next day. New cards: 10 a day, inside the cap, newly covered objectives first.
- **Exam guard:** intervals stop two days before the target date.
- Practice answers reschedule their objective without using the cap; Topic review answers use it.

`npx playwright test`: **22 passed, 0 failed** (3 new; 3 consecutive runs)
- New user: Today shows 10 due; reviewing all 10 (answer hidden until flipped) stores 10 scheduled cards with the expected boxes (two at 0, two at 0.5, six at 1), and the due counts on Cards and Today drop to 0 with 10/30 reviews used.
- Filters: after missing a Domain 3 crypto question, "From my errors" shows the two 3.6 cards and "Newly covered" the three unreviewed 3.2 and 3.6 cards; the domain filter narrows them.
- A due objective appears as Topic review, serves a question on that objective, promotes it and uses one review from the cap.

Manual review: Cards home and a flipped card at 360 px, light theme.

### Validated
- Scheduler rules exactly as specified in the brief, at card and objective level; due counts on Today, Study and Cards.

### Not validated
- **Interval lengths are a reasoned default, not fitted to your recall data.** There is not enough history yet to tune them.
- The deck is a 25-card seed; comparison drills and the full deck arrive with the content batches (phase 8).
- "Due today" in a notification arrives with reminders (phase 7).

## Phase 4: Error Ledger and Patterns panel (27 October 2026)

`npm test`: **53 passed, 0 failed** (4 new)
- Only wrong answers and correct answers marked "guess" create entries; sure or unsure correct answers do not.
- Each entry holds every field the brief lists: date, mode, domain, sub-topic, difficulty, question id, answer given, correct answer, confidence, why each chosen option was wrong, the correct mental model, concept, trap, gap and follow-up id. For a partly right multi-select it also lists the keys you missed. The text is snapshotted so entries survive later question edits.
- Patterns: sure-but-wrong entries come first (newest first); objectives missed more than once are ranked by misses, then sure misses, then recency; error-class counts and untagged count are correct; tapping the same class twice clears it.
- Reteach rule: due after 3 misses on an objective (guesses do not count as misses), cleared by completing a reteach, due again after 3 further misses; teach-back history kept.

`npx playwright test`: **19 passed, 0 failed** (3 new; 3 consecutive runs)
- Domain 5 practice with a sure miss, a lucky guess and an unsure miss: Ledger shows 3 entries, 1 misconception listed first, the one-tap class from the review screen counted; an expanded entry shows "Why your choice was wrong" and the concept; the Lucky guesses and Untagged filters return 1 and 2; a class tagged in the Ledger survives reload; "Drill these in Weakness mode" opens on a missed Domain 5 question.
- Three misses on objective 2.4 across two sessions: the next 2.4 question is replaced by the reteach card; "continue" stays disabled until the teach-back reaches 80 characters; after it, the question is served and the teach-back is stored; the Ledger no longer shows reteach due.
- A reteach-due entry links to its reteach page. A mini exam is not interrupted by a reteach (exam conditions).

Manual review: Ledger and reteach screenshots at 360 px, dark theme.

### Validated
- Ledger capture across all modes (it is recorded in the shared answer path), the Patterns panel, tagging and the reteach gate in Chromium.

### Not validated
- **Reteach lessons are assembled from the missed questions' own reasoning and the outline topics**, not from written lessons; the per-objective lessons arrive in phase 8.
- The teach-back is checked for length only. Nothing judges whether the explanation is right.
- Reteach gating applies to study modes (practice, scenario, weakness, hard). Mini exams and mocks keep exam conditions and do not pause; this is a design choice.
- "Concept" for counting repeat misses is the outline objective, because free-text concepts differ per question.

## Phase 3: question engine, all modes, seed bank (27 October 2026)

`node tests/validate-content.js`: **no errors**, 1 warning (d3-001 stem is 38 words at difficulty 4).
- **Schema check:** every question has all 18 fields, `rationales.length === options.length`, valid `correct` indices, ids, objectives and scenario links resolve.
- **Give-away lint:** checks option length parity (≤ 35% longer than the others), correct-only stem echo, absolutes in more than one option, "all/none of the above", "Select TWO/THREE" wording, and rationale depth. On its first run it caught 4 real tells in the seed bank (absolutes in several options in 3 questions; correct answers in d8-001 were the only ones echoing the stem). All were rewritten.
- **Answer-key spread (15 single-answer items):** positions 0/1/2/3 hold 3/4/5/3 (max 33%). Correct option is the single longest in 4/15 (27%).
- **Bank shape:** 20 questions, 1 case study (3 questions), 5 multi-select (25%; 3 × TWO, 2 × THREE), difficulty 3: 2, 4: 10, 5: 6, 6: 2 (90% at 4 to 6). Domains 4/2/2/2/3/2/3/2.

`npm test`: **49 passed, 0 failed** (24 new)
- Lint self-tests: crafted bad questions are caught for length tells, stem echo, absolutes, banned options, multi wording, schema faults and a skewed answer key.
- Engine: seeded shuffle reproducible; grading all-or-nothing; largest-remainder allocation sums to n and is within one of weight × n for both outlines at 25/100/125/150 (100 → 16/10/13/13/13/12/13/10); weakness mode puts misses and guesses first, then the same objectives; scenario order kept; hard mode is levels 5 to 6 only; outline-tagged questions filtered; session lifecycle records answers, time per question, results and the **Harare** study day.

**Randomness proof** (`node tests/sim-papers.js 300`):

| Run | Result |
|---|---|
| 300 mini papers, synthetic 640-question bank | 300/300 distinct papers; every question seen in ≥ 3 option orders (mean 9.2); per-domain count equals the weighted allocation 4/3/3/3/3/3/3/3 on every paper |
| 300 mini papers, 20-question seed bank | 300/300 distinct; every question seen in all 24 option orders; domain mix is the bank's own mix (it uses all 20), not the weights |
| 300 mocks each at simulated skill 2.5 / 4 / 5.5 | length 100 to 150 every run; domain counts within 0.84 of weight × items at every step; bands 0/0/300, 135/147/18, 300/0/0 (above/borderline/below) |

`npx playwright test`: **16 passed, 0 failed** (5 new; 3 consecutive runs)
- Practice: submit stays disabled until both an answer and a confidence rating are given; a forced wrong answer shows "Incorrect", a rationale for every option, the keys, and the "Think like a manager" checklist; 10-question set ends on results showing 9/10; storage holds 10 answers with qid, correctness, confidence and mode; Weakness drill then opens on the missed question.
- Scenario set shows the case study and keeps question order. Mini exam shows a 30-minute timer, gives no feedback until the end, and can be ended early. An unfinished session survives reload and resumes. The adaptive mock shows why it is locked. No horizontal scroll at 360 px.

Manual review: screenshots of a question, its review and the hub (360 px, dark). Found and fixed a stray "null" under single-answer stems; a test now guards it.

### Validated
- Engine logic, randomness and domain mix by simulation; full user flow in Chromium.

### Not validated
- **Difficulty levels are judged, not measured.** No item statistics exist yet.
- **No question has been checked against ISC2's real exam**, and none is a real item.
- **The adaptive mock is a staircase simulation**, not ISC2's CAT, and its bands (thresholds 4.5 and 3.0) are assumptions. It is locked in the app until the bank holds 150 questions with enough in every domain; it has been exercised only on a synthetic bank.
- The seed bank is 20 questions: mini exams currently use all 20 and follow the bank's domain mix, not the weights.
- The give-away lint is heuristic: it cannot catch grammatical tells or category odd-one-out; those remain review checks.

## Phase 2: domain data model for both outlines (27 October 2026)

`npm test`: **25 passed, 0 failed** (10 new)
- `domains.json` has 8 domains with 12/6/10/3/6/5/15/5 objectives (62), contiguous ids matching their domain, a valid outline tag on every topic, and no duplicate topics within an objective.
- `outlines.json` and `domains.json` describe the same eight domains.
- The 2024 view hides 2027-only topics, and the 2027 view hides 2024-only ones (spot checks: 3.6 quantum key distribution vs post-quantum cryptography; 8.2 IAST).
- 2027 objective wording (for example 5.6 "authentication and authorisation systems") applies only under the 2027 outline.
- Names and weights join correctly for each outline (D1: 16% "Security and Risk Management" vs 13.6% "Security Governance and Risk Management"). Every domain has at least one topic change.
- Every file listed in the service worker's offline cache exists.

`npx playwright test`: **11 passed, 0 failed** (4 new)
- Study lists eight domains with 2024 weights by default.
- Domain 3 shows 10 objectives; 3.6 lists its 2024 topics and, when expanded, shows post-quantum cryptography as added and quantum cryptography and QKD as dropped. No horizontal scroll at 360 px.
- With a target date of 1 May 2027, Study switches to 2027 names, weights and topics.
- An unknown domain number falls back to the list.

Manual review: screenshots of the Study list and Domain 3 at 360 px in the dark theme.

### Validated
- The comparison was made from text extracted from both ISC2 PDFs (`pdftotext`) and checked objective by objective.

### Not validated
- Topic names are paraphrases. A wrong tag (for example an item marked "2027" that ISC2 merely reworded) is possible; the extraction was read by eye, not diffed by a second person.
- Lessons, key terms and worked scenarios per objective are not written yet (phase 8).

## Phase 1: shell, storage, theme, navigation (27 October 2026)

`npm test`: **15 passed, 0 failed**
- Store: first run writes one namespaced key (`cissp-cc`) with `schemaVersion` 1 and the brief's defaults; updates persist across reloads; missing fields are filled without losing data; a backend that throws or is blocked falls back to memory and reports "not persistent"; corrupt JSON does not crash; export → import round-trips the full state; bad import files are rejected and leave state untouched; a file from a newer schema is refused with a clear message.
- Outline: weights in both outlines sum to 100; 14 April 2027 → 2024 outline, 15 April 2027 → 2027 outline; the default target (31 March 2027) shows a "15 days before the outline changes" warning; any date from 15 April 2027 shows the "2027 outline" warning; dates use the Harare calendar day (checked at 23:30 UTC on 31 December).

`npx playwright test`: **7 passed, 0 failed** (3 consecutive runs, no flakes)
- Home renders at 360 px with no horizontal scroll and shows the outline warning; the Offline pill is hidden while online.
- No input or button spills outside its card on Settings at 360 px (added after a screenshot review found the reminder time boxes overflowing).
- Bottom navigation reaches all five tabs.
- Moving the target to 20 April 2027 switches the warning to "2027 outline" and persists after reload.
- Export downloads a JSON file; erasing resets it; importing the file restores it.
- After one visit, the app reloads **offline** from the service worker, including `data/outlines.json`.
- With `localStorage` blocked, the app still runs and shows "Progress is not being saved".

Manual review: phone-width screenshots of Today and Settings in dark and light themes.

### Validated
- Storage, migration hook, export/import, offline shell, the outline boundary logic and the layout at 360 px in Chromium.

### Not validated
- Not tested on a real Android phone or in Firefox or Safari; the "Add to home screen" install prompt was not exercised.
- The migration list is empty (schema 1), so the migration path is a hook only, not yet tested with a real version change.
- Notifications are not built yet (phase 7).
- No content exists yet; the question standard's give-away lint arrives with the content validator (phase 3).
