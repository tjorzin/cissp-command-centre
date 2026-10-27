import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domainStats, difficultyStats, calibration, gates, weekStart, studyWeeks, streak, MIN_SAMPLE } from '../../js/engine/perf.js';
import { addDays } from '../../js/outline.js';
import { defaultState } from '../../js/store.js';

const TODAY = '2027-02-17'; // a Wednesday

// n answers in a domain, the first `right` of them correct.
function answers(domain, n, right, extra = {}) {
  return Array.from({ length: n }, (_, i) => ({
    at: `2027-02-${String(1 + (i % 15)).padStart(2, '0')}T08:00:00.000Z`, domain, objective: `${domain}.1`,
    difficulty: (i % 6) + 1, correct: i < right, confidence: i % 3 === 0 ? 'sure' : i % 3 === 1 ? 'unsure' : 'guess', secs: 60 + i, ...extra
  }));
}

test(`honest empty state: under ${MIN_SAMPLE} answers a domain reports not enough data`, () => {
  const st = defaultState();
  st.answers = answers(1, 19, 19);
  const d = domainStats(st, 1);
  assert.equal(d.enough, false);
  assert.equal(d.n, 19);
  st.answers = answers(1, 20, 15);
  assert.equal(domainStats(st, 1).enough, true);
  assert.equal(domainStats(st, 1).accuracy, 75);
});

test('domain figures: accuracy when sure, average time, last revised, five-session trend', () => {
  const st = defaultState();
  st.answers = answers(2, 30, 21);
  st.sessions = Array.from({ length: 7 }, (_, i) => ({ endedAt: `2027-02-${10 + i}T10:00:00.000Z`, byDomain: { 2: { asked: 4, correct: i % 5 }, 3: { asked: 1, correct: 1 } } }));
  const d = domainStats(st, 2);
  assert.equal(d.sure.n, 10);
  assert.equal(d.sure.correct, 7);
  assert.equal(d.avgSecs, Math.round((60 + 89) / 2));
  assert.equal(d.lastRevised, '2027-02-15T08:00:00.000Z');
  assert.deepEqual(d.trend.map((t) => t.accuracy), [50, 75, 100, 0, 25]);
  assert.equal(domainStats(st, 5).trend.length, 0);
});

test('difficulty and calibration group answers correctly', () => {
  const st = defaultState();
  st.answers = [...answers(1, 60, 30)];
  const diff = difficultyStats(st);
  assert.equal(diff.length, 6);
  assert.equal(diff.reduce((a, d) => a + d.n, 0), 60);
  const cal = calibration(st);
  assert.deepEqual(cal.map((c) => c.confidence), ['guess', 'unsure', 'sure']);
  assert.equal(cal.reduce((a, c) => a + c.n, 0), 60);
});

test('weeks start on Monday; streak counts back from today or yesterday', () => {
  assert.equal(weekStart('2027-02-17'), '2027-02-15');
  assert.equal(weekStart('2027-02-15'), '2027-02-15');
  assert.equal(weekStart('2027-02-21'), '2027-02-15'); // Sunday belongs to the week before Monday the 22nd
  assert.equal(streak(['2027-02-15', '2027-02-16', '2027-02-17'], TODAY), 3);
  assert.equal(streak(['2027-02-15', '2027-02-16'], TODAY), 2); // today not done yet: still counts
  assert.equal(streak(['2027-02-14', '2027-02-16'], TODAY), 1);
  assert.equal(streak([], TODAY), 0);
  const w = studyWeeks(['2027-02-15', '2027-02-09'], TODAY, 2);
  assert.deepEqual(w.map((x) => [x.start, x.days, x.current]), [['2027-02-08', 1, false], ['2027-02-15', 1, true]]);
});

test('a new user meets no gate, and every gate explains why', () => {
  const g = gates(defaultState(), TODAY);
  assert.deepEqual(g.map((x) => x.id), ['mocks', 'domains', 'concepts', 'consistency']);
  assert.ok(g.every((x) => !x.met && x.evidence.length > 0));
  assert.match(g[1].evidence.join(), /not enough data \(0\/20/);
});

test('mock gate: accuracy (default) and band options', () => {
  const st = defaultState();
  const mock = (correct, band) => ({ mode: 'mock', endedAt: '2027-02-10T10:00:00.000Z', correct, presented: 100, mockReport: { band } });
  st.sessions = [mock(90, 'below'), mock(70, 'above'), mock(80, 'above')];
  let g = gates(st, TODAY).find((x) => x.id === 'mocks');
  assert.equal(g.met, true); // last two: 150/200 = 75%
  st.sessions.push(mock(60, 'above'));
  g = gates(st, TODAY).find((x) => x.id === 'mocks');
  assert.equal(g.met, false); // 140/200 = 70%
  assert.ok(g.note);
  st.settings.gates = { mockMetric: 'band' };
  assert.equal(gates(st, TODAY).find((x) => x.id === 'mocks').met, true);
  st.sessions.push(mock(99, 'borderline'));
  assert.equal(gates(st, TODAY).find((x) => x.id === 'mocks').met, false);
});

test('domain gate needs enough data everywhere and uses recent answers', () => {
  const st = defaultState();
  for (let d = 1; d <= 8; d++) st.answers.push(...answers(d, 20, 15));
  assert.equal(gates(st, TODAY).find((x) => x.id === 'domains').met, true);
  st.answers.push(...answers(4, 50, 30)); // last 50 in domain 4 are 60%
  const g = gates(st, TODAY).find((x) => x.id === 'domains');
  assert.equal(g.met, false);
  assert.deepEqual(g.evidence, ['Domain 4: 60% over the last 50.']);
});

test('concept gate counts misses since the last reteach', () => {
  const st = defaultState();
  st.answers = answers(2, 3, 0);
  const miss = (i) => ({ kind: 'wrong', objective: '2.4', at: `2027-02-0${i}T00:00:00.000Z` });
  st.ledger = [miss(1), miss(2), miss(3)];
  let g = gates(st, TODAY).find((x) => x.id === 'concepts');
  assert.equal(g.met, false);
  assert.match(g.evidence[0], /2\.4: 3 misses/);
  st.reteach['2.4'] = { at: '2027-02-04T00:00:00.000Z' };
  assert.equal(gates(st, TODAY).find((x) => x.id === 'concepts').met, true);
});

test('consistency gate: three Monday-to-Sunday weeks of five study days', () => {
  const st = defaultState();
  const week = (monday, n) => Array.from({ length: n }, (_, i) => addDays(monday, i));
  st.studyDays = [...week('2027-01-25', 5), ...week('2027-02-01', 6), ...week('2027-02-08', 5)];
  assert.equal(gates(st, TODAY).find((x) => x.id === 'consistency').met, true);
  st.studyDays = [...week('2027-01-25', 5), ...week('2027-02-01', 4), ...week('2027-02-08', 7)];
  assert.equal(gates(st, TODAY).find((x) => x.id === 'consistency').met, false);
  // The current week counts once it already qualifies.
  st.studyDays = [...week('2027-02-01', 5), ...week('2027-02-08', 5), ...week('2027-02-15', 5)];
  assert.equal(gates(st, '2027-02-19').find((x) => x.id === 'consistency').met, true);
});
