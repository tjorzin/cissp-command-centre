# Validation log

Each phase adds a section. Commands are run from the repo root with Node 24.22.1 and Playwright 1.64.1 (Chromium), using a Pixel 7 profile at 360 × 780, time zone Africa/Harare.

## Phase 8, batch 4: Domain 4 content (28 October 2026)

Framework check: Domain 4 relies on stable standards (TLS 1.3, IPsec, 802.1X, WPA3, 5G SUCI); no change affecting tested facts (`data/SOURCES.md`).

**Content added:** 29 Domain 4 questions (31 in total, about 13% of a 240-question bank) and a fifth case study (network redesign at a regional ISP: SD-WAN, VoIP, NAC); lessons for all 3 objectives; 7 cards (every Domain 4 objective has one); 2 drills (OSI layers, firewall types); 2 labs (day 7: cleartext vs TLS in Wireshark on your own traffic; day 8: scan a test VM with Nmap and reduce exposure with a host firewall).

`npm run validate`: **no errors.** The give-away lint first rejected 4 questions for tells (absolutes in two options in d4-005, d4-009 and d4-029; a length tell in d4-022; the key alone echoing "laptop" in d4-024) plus thin rationales and a short sub-topic; all fixed, and six keys trimmed so the correct option is the single longest in 28 of 101 single-answer questions (28%).

**Bank after batch 4:** 138 questions; 37 multi-select (27%); single-answer keys 24/25/26/26.

`npm test`: **88 passed, 0 failed** (Domain 4 added to the coverage test). `npx playwright test`: **36 passed, 0 failed** (3 consecutive runs); the first-run test had hard-coded 2 Domain 4 baseline questions and now derives the count.

### Not validated
- The Wireshark and Nmap lab steps were not run in this session.

## Phase 8, batch 3: Domain 3 content (28 October 2026)

Crypto standards re-checked (recorded in `data/SOURCES.md`): FIPS 203/204/205 final and tested as current; FIPS 206 (FN-DSA), HQC and NIST IR 8547's 2030/2035 timeline are still drafts and appear only in practical notes, labelled as drafts.

**Content added:** 30 Domain 3 questions (32 in total, about 13% of a 240-question bank) and a fourth case study (cloud, plant OT and server room at a mining company); lessons for all 10 objectives; 10 cards (every Domain 3 objective has one); 3 drills (symmetric vs asymmetric vs hashing, security models, IaaS/PaaS/SaaS responsibility); 2 labs (day 5: two-tier test PKI with OpenSSL; day 6: hashes vs signatures).

`npm run validate`: **no errors.** The give-away lint first rejected 7 questions: absolutes in two options (d3-007, d3-008, d3-012), length tells among short term options (d3-009, d3-010, d3-025) and a stem echo on the key (d3-013); all rewritten, and six keys trimmed. Lab text now marks commands with backticks; the linter checks they are balanced.

**Bank after batch 3:** 109 questions; 30 multi-select (28%); single-answer keys 18/20/21/20; correct option the single longest in 21 of 79 (27%).

`npm test`: **87 passed, 0 failed** (Domain 3 added to the per-domain coverage test).

`npx playwright test`: **36 passed, 0 failed** (3 consecutive runs before the final helper change, 1 after).

**Found and fixed: the "no horizontal scroll" checks were blind.** They compared the page's scroll width with `window.innerWidth`, but body clips overflow, and in mobile emulation the layout viewport widens to fit oversized content, so the check could never fail. A screenshot showed a lab step stretched to about 2,000 px and clipped. Fixes: lab commands render as code blocks that scroll inside themselves, grid items may shrink, and a shared helper (`tests/e2e/helpers.js`) now compares every element's right edge with the emulated 360 px screen. A new test plants a 900 px element and confirms the helper fails; all 17 real-screen checks pass.

### Not validated
- The OpenSSL lab commands were not run in this session.
- No question has been checked against ISC2's real exam; difficulty is judged.

## Phase 8, batch 2: Domain 2 content (28 October 2026)

Framework check before writing (recorded in `data/SOURCES.md`): **NIST SP 800-88 Revision 2 (September 2025)** supersedes Rev. 1 and defers techniques to **IEEE 2883-2022** (Clear, Purge, Destruct). The existing sanitisation card and question d2-002 were updated so they no longer imply Rev. 1 is current.

**Content added:** 23 Domain 2 questions (25 in total, about 10% of a 240-question bank; every objective has at least 3) and a third case study (patient data at a clinic group); lessons for all 6 objectives; 8 cards (every Domain 2 objective now has a card); 3 drills (data states, data roles, clear/purge/destroy); 2 labs (day 3: classify and mark a test file share; day 4: show data remanence on test media with PhotoRec, then defeat it).

`npm run validate`: **no errors.** The give-away lint raised nothing on the new questions this time; it flagged a too-short sub-topic and two thin rationales, which were rewritten.

**Bank after batch 2:** 79 questions; 22 multi-select (28%); single-answer keys in positions 0/1/2/3: 13/15/15/14; correct option is the single longest in 15 of 57 (26%); difficulty 2: 2, 3: 18, 4: 31, 5: 23, 6: 5 (75% at 4 to 6).

`npm test`: **86 passed, 0 failed.** The per-domain test now checks every finished domain: each objective has a lesson, at least two questions and a card, the domain has at least 95% of its share of a 240-question bank, and it has a drill and a lab. Domains 1 and 2 pass.

`npx playwright test`: **34 passed, 0 failed** (3 consecutive runs). New: the Domain 2 page shows a lesson for all 6 objectives and the labs list runs in day order. The reteach test assumed Domain 2 had only two questions; it now practises objective 2.4 directly.

Manual review: the day 4 lab at 360 px, light theme.

### Not validated
- The day 4 lab names PhotoRec (open source, CGSecurity); its download was not checked in this session. The lab says to use the official site and test media only.
- No question has been checked against ISC2's real exam; difficulty is judged.

## Phase 8, batch 1: Domain 1 content (28 October 2026)

Framework versions re-checked before writing (recorded in `data/SOURCES.md`): NIST CSF 2.0, PCI DSS v4.0.1 and the ISC2 canons are current; ISC2 added a Code of Professional Conduct in February 2026; Zimbabwe's 2024 breach-reporting rule is from secondary sources only and is used in practical notes, not tested.

**Content added**
- 36 new Domain 1 questions (40 in total, about 16% of a 240-question bank) and a second case study (Mukuvisi Bank governance, 3 questions). Every Domain 1 objective has at least 2 questions.
- 12 lessons (`data/lessons.json`): five lines on what the exam wants, key terms and a worked scenario for each Domain 1 objective, shown on the domain page with links to that objective's questions and cards.
- 13 Domain 1 cards (38 in all), mostly comparisons; every Domain 1 objective now has at least one card.
- Comparison drills (`data/drills.json`, new screen): risk treatment; control types; qualitative vs quantitative; BCP vs DRP vs IR; RTO, RPO, MTD and WRT.
- Labs (`data/labs.json`, new screen): day 1, a risk register for a fictional bank; day 2, a mini BIA. Both marked LAB / TEST ENVIRONMENT.

`npm run validate`: **no errors.** On the first pass the give-away lint rejected 6 of the new questions: a length tell in two (d1-010, d1-036), the correct option alone repeating a stem word in two (d1-011, d1-014), absolutes in two options (d1-040), plus a too-short sub-topic. All rewritten. Six keys were then trimmed so the correct option is the single longest in 8 of 41 single-answer questions (20%).

**Bank after batch 1:** 56 questions; 15 multi-select (27%: 12 × TWO, 3 × THREE); single-answer keys in positions 0/1/2/3: 9/11/11/10; difficulty 2: 2, 3: 12, 4: 23, 5: 15, 6: 4 (75% at 4 to 6).

`npm test`: **85 passed, 0 failed** (3 new): lessons, drills and labs validate; all 12 Domain 1 objectives have lessons and at least two questions; the new linters catch malformed lessons, drills whose answers are not items or that leave an item untested, and labs without the test-environment marker or required sections.

`npx playwright test`: **33 passed, 0 failed** (3 new; 3 consecutive runs): a lesson's five lines and worked answer, "Practise" launching that objective's questions and "Cards" opening its four cards; a full drill run with one forced miss, score saved; lab steps persisting across reload and completion only once every step is ticked.

Five older tests assumed a 20-question bank (mini exam size and timer, diagnostic size, a single expandable section per objective) and were updated to derive sizes from the bank.

Manual review: lesson 1.7 and a drill at 360 px (dark). Drill feedback colours were dimmed by the disabled-button style; fixed.

### Not validated
- **No question has been checked against ISC2's real exam**; difficulty levels are judged, not measured.
- The labs have not been carried out end to end by a learner.

## Phase 7: Next Study Plan, baseline diagnostic and reminders (28 October 2026)

Also in this phase: the mock gate default changed to "band above in both of the last two mocks" (your decision, 27 October 2026); its tests were updated to match.

`npm test`: **82 passed, 0 failed** (11 new plan and reminder tests)
- Phases from the target date: Learn to 20 January 2027, Drill to 3 March, Simulate to the exam; go / move checkpoint 10 March; "after" once the date has passed.
- Block lengths stay within 20 to 45 minutes and rise as the exam nears. When the small bank leaves a block short, an optional "top up with flashcards" task fills it, so listed minutes always add up to the stated length.
- Domain priority: lowest recent accuracy (10+ answers) or baseline, multiplied by exam weight; with equal accuracy the heavier domain leads; an untested domain outranks a same-weight domain known to be at 50%.
- First run: "Do this next" is the baseline diagnostic. The diagnostic takes six per domain at four or more difficulty levels (48 from a full synthetic bank; all 20 from the seed bank) and is saved as the baseline, which then drives priorities.
- Today's picks hold while you work, are redone once if the baseline arrives that day, and are fresh the next day; a missed day leaves no backlog.
- Next-day plan after forced misses on Domain 7: reteach first, topic review due, Domain 7 as the focus; in the Drill phase the same history drives a weakness drill.
- Finished work ticks off tasks and blocks. "Due now" picks the latest open block whose time has passed.
- Reminder timing in Harare time (12:59:30 → 30 s to the 13:00 block); the calendar file has three daily alarms with a Harare time zone until 30 March 2027.

`npx playwright test`: **30 passed, 0 failed** (5 new; 3 consecutive runs)
- First run (clock fixed at 06:30 Harare): Today leads with the baseline diagnostic; it runs with no feedback until the end; the baseline is stored; Today then drops it and focuses on Domain 4, which scored 0 on the baseline.
- At 14:05 the "due now" banner names the afternoon block on other screens and links to Today; Today does not repeat it; at 05:00 there is no banner.
- Settings: the calendar file downloads with three VEVENTs; notification status is shown.
- With permission granted, the 13:00 reminder fires at the block time (fake clock), through the service worker, as "Afternoon block: about 20 min".
- **The brief's functional test:** three Domain 7 practice rounds with every answer wrong and "sure"; then the Ledger shows 9 entries, 9 misconceptions, 3 repeat topics and 3 reteaches due; the first entry has its domain, confidence and why-wrong reasons; the Weakness drill opens on a Domain 7 reteach; moving the clock to the next morning, Today leads with "Reteach 7.x", lists "Topic review: 3 due", and shows a streak of 1 (no penalty for not having studied yet that day).

Manual review: Today at 360 px (dark), first run and after a baseline. The blocks claimed 20 minutes while their tasks added up to 3 to 5; fixed with the top-up task above.

### Validated
- Plan generation from all four inputs the brief names, the phases and checkpoint, re-planning after missed days, the baseline diagnostic and the reminder fallbacks, in Chromium.

### Not validated
- **Notifications on a real phone.** Headless Chromium reports notification permission as denied whatever is granted, so the test reports "granted" itself; it proves the app's logic, not Android's behaviour.
- **Reminders while the app is closed.** A static web app cannot wake itself; the calendar file is the reliable alarm. Background push needs a server or the optional Android wrapper (phase 10).
- Phase lengths (10 and 4 weeks) and block lengths are reasoned defaults, not tuned to your pace.
- The baseline uses all 20 seed questions until the bank grows; a 48-question baseline needs the phase 8 content.

## Phase 6: performance screens and readiness gates (27 October 2026)

`npm test`: **71 passed, 0 failed** (9 new)
- Honest empty state: 19 answers in a domain report "not enough data"; 20 report a figure.
- Domain figures: accuracy, accuracy when sure, average seconds, last revised and a five-session trend computed from session summaries.
- Difficulty and calibration group every answer exactly once.
- Weeks run Monday to Sunday in Harare days; the streak counts back from today, or from yesterday if today is not done yet.
- Gates: a new user meets none, each with evidence. Mock gate: 75% combined over the last two mocks (met at 150/200, not at 140/200) or, as a setting, band "above" in both. Domain gate: needs 20 answers in every domain and uses the last 50 per domain. Concept gate: misses since the last reteach. Consistency gate: three Monday-to-Sunday weeks of five days, counting the current week once it qualifies.

`npx playwright test`: **25 passed, 0 failed** (3 new; 3 consecutive runs)
- New user: Today shows Readiness 0/4; Performance shows four unmet gates with evidence, "Not enough data (0/20)" for each domain and difficulty level, no trend lines, and no pass probability or score out of 1000.
- With seeded history: "50% of 40", 80 s per question, a four-point trend reading 60% → 80%, calibration 50% when sure with the overconfidence note, and the concept gate shown as met.
- Settings change the mock metric and domain threshold, and the gate titles follow.

**Finding on the brief's mock gate.** On 300 simulated mocks per skill level (synthetic bank), mean mock accuracy was 49% (skill 3), 51% (4), 53% (4.5), 55% (5), 58% (5.5) and 69% (6.5, above the hardest level). An adaptive test raises difficulty until you miss about half, so "75% across the last two mocks" is close to unreachable for any realistic candidate. The gate was built as specified (75% accuracy), with a "band above in both" option. **On 27 October 2026 the band rule became the default at your request;** the 75% accuracy rule stays available in Settings.

Manual review: Performance screen at 360 px in dark theme; a domain card and a gate card checked close up. The trend label wrapped beside the line and was fixed; evidence dates now read "Week of 26 October 2026".

### Validated
- Every figure in brief §8, the four gates with evidence, configurable thresholds and empty states, in Chromium.

### Not validated
- The 85% "sure" calibration threshold for the overconfidence note is a judgement, not a standard.
- The mock gate cannot be exercised by a real user until the bank holds 150 questions (phase 8).
- Charts carry native hover tooltips and a table view for calibration; there is no custom crosshair tooltip.

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
