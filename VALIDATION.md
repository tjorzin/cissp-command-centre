# Validation log

Each phase adds a section. Commands are run from the repo root with Node 24.22.1 and Playwright 1.64.1 (Chromium), using a Pixel 7 profile at 360 × 780, time zone Africa/Harare.

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
