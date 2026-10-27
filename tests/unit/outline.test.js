import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { outlineFor, outlineNotices, daysBetween, todayIn, addDays } from '../../js/outline.js';

const { outlines } = JSON.parse(readFileSync(new URL('../../data/outlines.json', import.meta.url)));

test('weights in each outline sum to 100', () => {
  for (const o of outlines) {
    const sum = o.domains.reduce((a, d) => a + d.weight, 0);
    assert.ok(Math.abs(sum - 100) < 1e-9, `${o.id} sums to ${sum}`);
  }
});

test('boundary: 14 April 2027 is 2024 outline, 15 April 2027 is 2027 outline', () => {
  assert.equal(outlineFor('2027-04-14', outlines).id, '2024');
  assert.equal(outlineFor('2027-04-15', outlines).id, '2027');
  assert.equal(outlineFor('2027-03-31', outlines).id, '2024');
});

test('default target (31 March 2027) gets a "near" warning but not "switched"', () => {
  const n = outlineNotices('2027-03-31', outlines);
  assert.deepEqual(n.map((x) => x.kind), ['near']);
  assert.match(n[0].title, /^15 days/);
  assert.match(n[0].body, /14 April 2027/);
});

test('a date past 14 April 2027 gets the "switched" warning', () => {
  const n = outlineNotices('2027-04-15', outlines);
  assert.deepEqual(n.map((x) => x.kind), ['switched']);
  assert.match(n[0].title, /2027 outline/);
});

test('a date well before the change has no warning', () => {
  assert.deepEqual(outlineNotices('2027-01-15', outlines), []);
});

test('date helpers are time-zone safe', () => {
  assert.equal(daysBetween('2027-03-31', '2027-04-15'), 15);
  assert.equal(addDays('2027-04-15', -1), '2027-04-14');
  // 23:30 UTC on 31 Dec is already 1 Jan in Harare (UTC+2).
  assert.equal(todayIn('Africa/Harare', new Date('2026-12-31T23:30:00Z')), '2027-01-01');
});
