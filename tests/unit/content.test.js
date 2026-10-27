import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lintBank, lintQuestion } from '../validate-content.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));
const bank = read('data/questions.json');
const domains = read('data/domains.json');

test('the question bank passes schema and give-away lint with no errors', () => {
  const r = lintBank(bank, domains);
  assert.deepEqual(r.errors, []);
});

test('bank shape: at least 20 questions, 25-30% multi-select, both TWO and THREE used', () => {
  const r = lintBank(bank, domains);
  assert.ok(r.stats.questions >= 20);
  const share = r.stats.multi / r.stats.questions;
  assert.ok(share >= 0.25 && share <= 0.30, `multi share ${share}`);
  assert.deepEqual(Object.keys(r.stats.multiByCount).sort(), ['2', '3']);
});

test('answer keys are spread: no position above 35% of single-answer questions', () => {
  const r = lintBank(bank, domains);
  for (const n of Object.values(r.stats.keyPositions)) assert.ok(n / r.stats.single <= 0.35);
});

test('at least 60% of questions are difficulty 4 to 6', () => {
  const qs = bank.questions;
  assert.ok(qs.filter((q) => q.difficulty >= 4).length / qs.length >= 0.6);
});

test('no question claims to be a real ISC2 item', () => {
  const text = JSON.stringify(bank.questions).toLowerCase();
  assert.ok(!/actual exam|real exam question|from the isc2 exam/.test(text));
});

// The linter must catch each tell it claims to catch.
const base = () => ({
  id: 'd1-900', domain: 1, objective: '1.9', subtopic: 'Test subtopic', difficulty: 4, type: 'single', scenario: null,
  stem: 'A manager at a regional bank must choose how to respond to a newly assessed risk to its payment platform.',
  options: ['Transfer it through an insurance policy', 'Avoid it by stopping the activity', 'Accept it with a dated review', 'Mitigate it with an extra control'],
  correct: [2],
  rationales: ['Wrong because transfer moves impact, not likelihood here.', 'Wrong because stopping the activity ends the business line.',
    'Correct. Acceptance by the owner with a review date fits the scenario.', 'Wrong because the control costs more than the expected loss.'],
  concept: 'Risk treatment options', trap: 'Choosing a control by default', managerLens: 'Owner decides, cost against risk',
  practicalNote: 'Record it in the risk register', gap: 'Treatment selection', followUpId: null, tags: []
});

test('lint catches a length tell', () => {
  const q = base();
  q.options[2] = 'Accept it with a dated review, documented sign-off by the owner and a compensating control in place';
  assert.match(lintQuestion(q).errors.join(), /longer than the others/);
});

test('lint catches stem echo on the correct option only', () => {
  const q = base();
  q.options[2] = 'Accept it for the payment platform with a review';
  assert.match(lintQuestion(q).errors.join(), /repeat stem words/);
});

test('lint catches absolutes in more than one option', () => {
  const q = base();
  q.options[0] = 'Always transfer it through an insurer';
  q.options[1] = 'Never continue the activity at all';
  assert.match(lintQuestion(q).errors.join(), /absolute words/);
});

test('lint catches banned options and wrong multi wording', () => {
  const q = base();
  q.options[3] = 'All of the above';
  assert.match(lintQuestion(q).errors.join(), /all\/none of the above/);
  const m = base();
  m.type = 'multi';
  m.correct = [1, 2];
  assert.match(lintQuestion(m).errors.join(), /Select TWO/);
});

test('lint catches schema faults', () => {
  const q = base();
  q.rationales.pop();
  q.correct = [7];
  const errs = lintQuestion(q).errors.join();
  assert.match(errs, /rationales.length/);
});

test('lint catches a skewed answer key across the bank', () => {
  const qs = Array.from({ length: 6 }, (_, i) => ({ ...base(), id: `d1-9${String(i).padStart(2, '0')}` }));
  const r = lintBank({ scenarios: [], questions: qs }, domains);
  assert.match(r.errors.join(), /answer key: position 2/);
});
