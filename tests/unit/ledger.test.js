import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ledgerEntry, patterns, reteachDue, completeReteach, tagEntry, reteachLesson, RETEACH_AFTER, ERROR_CLASSES } from '../../js/engine/ledger.js';
import { startSession, answerCurrent, advance } from '../../js/engine/session.js';
import { defaultState } from '../../js/store.js';
import { present } from '../../js/engine/bank.js';
import { mulberry32 } from '../../js/engine/rng.js';

const bank = JSON.parse(readFileSync(new URL('../../data/questions.json', import.meta.url)));
const Q = (id) => bank.questions.find((q) => q.id === id);
const wrongPick = (q) => [q.options.findIndex((_, i) => !q.correct.includes(i))];

let clock = Date.parse('2027-01-10T06:00:00Z');
function answer(st, q, selected, confidence, mode = 'practice') {
  startSession(st, { mode, items: [present(q, mulberry32(1))], seed: 1, now: clock });
  clock += 60000;
  answerCurrent(st, q, selected, confidence, clock);
  advance(st.activeSession);
  st.activeSession = null;
}

test('only wrong answers and correct guesses create ledger entries', () => {
  const st = defaultState();
  const q = Q('d1-001');
  answer(st, q, q.correct, 'sure');
  answer(st, q, q.correct, 'unsure');
  assert.equal(st.ledger.length, 0);
  answer(st, q, q.correct, 'guess');
  answer(st, q, wrongPick(q), 'unsure');
  assert.deepEqual(st.ledger.map((e) => e.kind), ['guess', 'wrong']);
  assert.equal(st.answers.length, 4);
});

test('an entry carries every field the brief lists', () => {
  const q = Q('d7-002');
  const sel = [0, 1, 3]; // one right, two wrong, misses two keys
  const e = ledgerEntry(q, { sessionId: 's1', mode: 'scenario', selected: sel, correct: false, confidence: 'sure', at: '2027-01-01T00:00:00.000Z' });
  for (const k of ['at', 'mode', 'domain', 'subtopic', 'difficulty', 'qid', 'selected', 'correctAnswer', 'confidence', 'whyWrong', 'mentalModel', 'concept', 'trap', 'gap', 'followUpId']) {
    assert.ok(k in e, k);
  }
  assert.deepEqual(e.whyWrong.map((w) => w.why), [q.rationales[1], q.rationales[3]]);
  assert.equal(e.missed.length, 2);
  assert.ok(!e.mentalModel.startsWith('Correct.'));
  assert.deepEqual(e.yourAnswer, sel.map((i) => q.options[i]));
});

test('patterns: misconceptions first, repeat topics ranked, classes counted', () => {
  const st = defaultState();
  answer(st, Q('d2-001'), wrongPick(Q('d2-001')), 'unsure');
  answer(st, Q('d2-002'), wrongPick(Q('d2-002')), 'sure');
  answer(st, Q('d5-001'), wrongPick(Q('d5-001')), 'sure');
  answer(st, Q('d5-001'), wrongPick(Q('d5-001')), 'guess');
  answer(st, Q('d5-002'), wrongPick(Q('d5-002')), 'unsure');
  answer(st, Q('d2-001'), wrongPick(Q('d2-001')), 'unsure');
  const p = patterns(st.ledger);
  assert.deepEqual(p.misconceptions.map((e) => e.qid), ['d5-001', 'd2-002']); // newest first
  assert.deepEqual(p.topics.map((t) => [t.objective, t.misses]), [['2.4', 3], ['5.4', 2]]);
  assert.equal(p.topics[0].sure, 1);
  assert.equal(p.untagged, 6);

  tagEntry(st, st.ledger[0].id, 'scope-terms');
  tagEntry(st, st.ledger[1].id, 'first-vs-best');
  tagEntry(st, st.ledger[1].id, 'first-vs-best'); // second tap clears
  const p2 = patterns(st.ledger);
  assert.equal(p2.classes['scope-terms'], 1);
  assert.equal(p2.classes['first-vs-best'], 0);
  assert.equal(p2.untagged, 5);
  assert.equal(ERROR_CLASSES.length, 4);
});

test(`reteach is due after ${RETEACH_AFTER} misses on an objective, and again after ${RETEACH_AFTER} more`, () => {
  const st = defaultState();
  const a = Q('d2-001');
  const b = Q('d2-002');
  answer(st, a, wrongPick(a), 'sure');
  answer(st, b, wrongPick(b), 'unsure');
  answer(st, a, a.correct, 'guess'); // a guess is logged but is not a miss
  assert.deepEqual(reteachDue(st.ledger, st.reteach), []);
  answer(st, b, wrongPick(b), 'sure');
  assert.deepEqual(reteachDue(st.ledger, st.reteach), [{ objective: '2.4', misses: 3 }]);

  const lesson = reteachLesson(st.ledger, '2.4');
  assert.deepEqual(lesson.map((p) => p.concept), [a.concept, b.concept]);

  completeReteach(st, '2.4', 'x'.repeat(90), new Date(clock + 1000));
  clock += 2000;
  assert.deepEqual(reteachDue(st.ledger, st.reteach), []);
  answer(st, a, wrongPick(a), 'sure');
  answer(st, a, wrongPick(a), 'sure');
  assert.deepEqual(reteachDue(st.ledger, st.reteach), []);
  answer(st, b, wrongPick(b), 'sure');
  assert.deepEqual(reteachDue(st.ledger, st.reteach), [{ objective: '2.4', misses: 3 }]);
  completeReteach(st, '2.4', 'y'.repeat(90), new Date(clock + 1000));
  assert.equal(st.reteach['2.4'].history.length, 2);
});
