import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mulberry32, shuffle } from '../../js/engine/rng.js';
import { grade, allocate, buildMini, buildWeakness, buildScenario, buildHard, eligible, present } from '../../js/engine/bank.js';
import { MOCK, mockReadiness } from '../../js/engine/mock.js';
import { startSession, answerCurrent, advance, finishSession, isFinished, ensureCurrent } from '../../js/engine/session.js';
import { defaultState } from '../../js/store.js';
import { syntheticBank, simulateMinis, simulateMocks } from '../sim-papers.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));
const bank = read('data/questions.json');
const outlines = read('data/outlines.json').outlines;
const w2024 = outlines.find((o) => o.id === '2024').domains;
const w2027 = outlines.find((o) => o.id === '2027').domains;

test('seeded shuffle is reproducible and is a permutation', () => {
  const a = shuffle([1, 2, 3, 4, 5], mulberry32(42));
  assert.deepEqual(a, shuffle([1, 2, 3, 4, 5], mulberry32(42)));
  assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5]);
});

test('grading is all-or-nothing and order-independent', () => {
  const multi = { correct: [0, 2, 4] };
  assert.equal(grade(multi, [4, 0, 2]), true);
  assert.equal(grade(multi, [0, 2]), false);
  assert.equal(grade(multi, [0, 2, 4, 1]), false);
  assert.equal(grade({ correct: [1] }, [1]), true);
});

test('presented order maps back to the original options', () => {
  const q = bank.questions[0];
  const item = present(q, mulberry32(7));
  assert.deepEqual([...item.order].sort(), q.options.map((_, i) => i));
});

test('largest-remainder allocation sums to n and tracks the weights', () => {
  for (const w of [w2024, w2027]) {
    for (const n of [25, 100, 125, 150]) {
      const a = allocate(w, n);
      assert.equal(Object.values(a).reduce((x, y) => x + y, 0), n);
      for (const d of w) assert.ok(Math.abs(a[d.n] - (d.weight / 100) * n) < 1, `${n}: domain ${d.n}`);
    }
  }
  assert.deepEqual(allocate(w2024, 100), { 1: 16, 2: 10, 3: 13, 4: 13, 5: 13, 6: 12, 7: 13, 8: 10 });
});

test('weakness mode serves the missed question first, then others on the same objective', () => {
  const qs = [
    { id: 'd1-001', objective: '1.9', options: ['a', 'b', 'c', 'd'] },
    { id: 'd1-002', objective: '1.9', options: ['a', 'b', 'c', 'd'] },
    { id: 'd1-003', objective: '1.1', options: ['a', 'b', 'c', 'd'] },
    { id: 'd1-004', objective: '1.4', options: ['a', 'b', 'c', 'd'] }
  ];
  const answers = [
    { qid: 'd1-001', objective: '1.9', correct: false, confidence: 'sure' },
    { qid: 'd1-003', objective: '1.1', correct: true, confidence: 'sure' },
    { qid: 'd1-004', objective: '1.4', correct: true, confidence: 'guess' }
  ];
  const ids = buildWeakness(qs, answers, mulberry32(1)).map((i) => i.id);
  assert.deepEqual(ids.slice(0, 2).sort(), ['d1-001', 'd1-004']);
  assert.ok(ids.includes('d1-002'));
  assert.ok(!ids.includes('d1-003'));
});

test('scenario sets keep the case-study order; hard mode is levels 5-6 only', () => {
  const sc = bank.scenarios[0];
  assert.deepEqual(buildScenario(bank.questions, sc, mulberry32(3)).map((i) => i.id), sc.questionIds);
  const hard = buildHard(bank.questions, 0, mulberry32(3)).map((i) => bank.questions.find((q) => q.id === i.id));
  assert.ok(hard.length > 0 && hard.every((q) => q.difficulty >= 5));
});

test('outline filter drops questions tagged for the other outline', () => {
  const qs = [{ id: 'a', tags: ['outline2027'] }, { id: 'b', tags: [] }, { id: 'c', tags: ['outline2024only'] }];
  assert.deepEqual(eligible(qs, '2024').map((q) => q.id), ['b', 'c']);
  assert.deepEqual(eligible(qs, '2027').map((q) => q.id), ['a', 'b']);
});

test('mock readiness: locked for a small bank, unlocked for the full real bank', () => {
  assert.equal(mockReadiness(bank.questions.slice(0, 20), w2024).ready, false);
  assert.equal(mockReadiness(bank.questions, w2024).ready, true);
  assert.equal(mockReadiness(syntheticBank(), w2024).ready, true);
});

test('300 simulated mocks on the real bank: 100-150 items, domain mix within one item at every step', () => {
  for (const skill of [3, 4.5, 6]) {
    const r = simulateMocks(bank.questions, w2024, 300, skill);
    assert.ok(r.minLength >= MOCK.min && r.maxLength <= MOCK.max, JSON.stringify(r));
    assert.ok(r.worstDomainDeviation < 1, JSON.stringify(r));
  }
});

test('300 simulated mini papers: all different, option order varies, domain mix tracks weights', () => {
  const r = simulateMinis(syntheticBank(), w2024, 300, 25);
  assert.equal(r.distinctPapers, 300);
  assert.ok(r.minOrdersPerQuestion >= 2, `min orders ${r.minOrdersPerQuestion}`);
  for (const d of w2024) assert.equal(r.meanPerDomain[d.n], r.expectedPerDomain[d.n], `domain ${d.n}`);
});

test('300 simulated mini papers from the real bank vary and use up to 25 questions', () => {
  const r = simulateMinis(bank.questions, w2024, 300, 25);
  assert.equal(r.size, Math.min(25, bank.questions.length));
  assert.equal(r.distinctPapers, 300);
  assert.ok(r.minOrdersPerQuestion >= 10, `min orders ${r.minOrdersPerQuestion}`);
});

test('300 simulated mocks per skill level: 100-150 items, domain mix within one item at every step', () => {
  for (const skill of [2.5, 4, 5.5]) {
    const r = simulateMocks(syntheticBank(), w2024, 300, skill);
    assert.ok(r.minLength >= MOCK.min && r.maxLength <= MOCK.max, JSON.stringify(r));
    assert.ok(r.worstDomainDeviation < 1, JSON.stringify(r));
  }
  assert.ok(simulateMocks(syntheticBank(), w2024, 300, 5.5).bands.above > simulateMocks(syntheticBank(), w2024, 300, 2.5).bands.above);
});

test('session lifecycle records answers, results and a Harare study day', () => {
  const st = defaultState();
  const qs = bank.questions.slice(0, 3);
  const items = qs.map((q) => present(q, mulberry32(9)));
  const t0 = Date.parse('2026-12-31T21:30:00Z'); // 23:30 in Harare
  startSession(st, { mode: 'practice', items, seed: 9, now: t0 });
  answerCurrent(st, qs[0], qs[0].correct, 'sure', t0 + 30000);
  advance(st.activeSession);
  answerCurrent(st, qs[1], [], 'guess', t0 + 60000);
  advance(st.activeSession);
  assert.equal(isFinished(st.activeSession, bank.questions), false);
  answerCurrent(st, qs[2], qs[2].correct, 'unsure', t0 + 90000);
  advance(st.activeSession);
  assert.equal(isFinished(st.activeSession, bank.questions), true);
  const s = finishSession(st, bank.questions, t0 + 2.6 * 3600000); // 02:06 next day in Harare
  assert.equal(st.answers.length, 3);
  assert.equal(st.answers[0].secs, 30);
  assert.equal(s.correct, 2);
  assert.equal(st.activeSession, null);
  assert.deepEqual(st.studyDays, ['2027-01-01']);
});

test('a mock session draws its next question only after each answer', () => {
  const st = defaultState();
  const qs = syntheticBank();
  startSession(st, { mode: 'mock', seed: 11, weights: w2024 });
  const first = ensureCurrent(st.activeSession, qs);
  assert.equal(st.activeSession.items.length, 1);
  assert.equal(ensureCurrent(st.activeSession, qs), first);
  const q = qs.find((x) => x.id === first.id);
  assert.equal(q.difficulty, MOCK.startLevel);
  answerCurrent(st, q, q.correct, 'sure');
  advance(st.activeSession);
  const second = qs.find((x) => x.id === ensureCurrent(st.activeSession, qs).id);
  assert.equal(second.difficulty, MOCK.startLevel + 1);
});
