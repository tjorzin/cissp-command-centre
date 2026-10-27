# Validation log

Each phase adds a section. Commands are run from the repo root with Node 24.22.1 and Playwright 1.64.1 (Chromium), using a Pixel 7 profile at 360 × 780, time zone Africa/Harare.

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
