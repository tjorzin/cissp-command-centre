import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trackSeconds, resumeAt, scriptsText, sortVoices, words } from '../../js/engine/car.js';
import { lintTracks } from '../validate-content.js';

const data = JSON.parse(readFileSync(new URL('../../data/tracks.json', import.meta.url)));

test('the real tracks pass the track lint: 4-6 min each, 45-60 in all, one per domain plus a recap', () => {
  const r = lintTracks(data);
  assert.deepEqual(r.errors, []);
  assert.equal(r.stats.tracks, 9);
  for (const t of data.tracks) {
    const min = trackSeconds(t, data.defaultPause) / 60;
    assert.ok(min >= 4 && min <= 6, `${t.id}: ${min}`);
  }
});

test('track lint catches length, missing domains and questions without a pause', () => {
  const short = { defaultPause: 900, tracks: [{ id: 'x', domain: 1, title: 'X', lines: [{ t: 'Which layer is ARP?' }] }] };
  const errs = lintTracks(short).errors.join('\n');
  assert.match(errs, /x: runs 0\.0 min/);
  assert.match(errs, /without a thinking pause/);
  assert.match(errs, /no track for domain 2/);
  assert.match(errs, /no mixed recap/);
  assert.match(errs, /45 to 60/);
});

test('duration counts words at 150 a minute plus every pause', () => {
  const t = { lines: [{ t: Array(150).fill('word').join(' ') }, { t: 'one two', p: 3000 }] };
  assert.equal(Math.round(trackSeconds(t, 1000)), 60 + 1 + 1 + 3);
  assert.equal(words('  a  b c '), 3);
});

test('resume position falls back to the start when the saved one is stale', () => {
  const tracks = data.tracks;
  assert.deepEqual(resumeAt(tracks, { track: 'car-d3', line: 5 }), { index: 2, line: 5 });
  assert.deepEqual(resumeAt(tracks, { track: 'car-d3', line: 999 }), { index: 2, line: 0 });
  assert.deepEqual(resumeAt(tracks, { track: 'gone', line: 4 }), { index: 0, line: 0 });
  assert.deepEqual(resumeAt(tracks, null), { index: 0, line: 0 });
});

test('the script download holds every line and marks the answer pauses', () => {
  const text = scriptsText(data);
  for (const t of data.tracks) {
    assert.ok(text.includes(t.title));
    for (const l of t.lines) assert.ok(text.includes(l.t), l.t);
  }
  const questions = data.tracks.flatMap((t) => t.lines).filter((l) => (l.p ?? data.defaultPause) >= 3000).length;
  assert.equal(text.split('[Pause and answer]').length - 1, questions);
  assert.match(text, /Not ISC2 content/);
});

test('British English voices come first', () => {
  const v = sortVoices([{ name: 'B', lang: 'fr-FR' }, { name: 'C', lang: 'en-US' }, { name: 'A', lang: 'en-GB' }]);
  assert.deepEqual(v.map((x) => x.lang), ['en-GB', 'en-US', 'fr-FR']);
});
