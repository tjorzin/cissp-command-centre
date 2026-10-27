import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { schedule, review, todayQueue, dueKeys, outcomeOf, cardKey, topicKey, INTERVALS, NEW_PER_DAY, unseenCards } from '../../js/engine/srs.js';
import { addDays, daysBetween } from '../../js/outline.js';
import { defaultState } from '../../js/store.js';
import { startSession, answerCurrent } from '../../js/engine/session.js';
import { present } from '../../js/engine/bank.js';
import { mulberry32 } from '../../js/engine/rng.js';
import { lintCards } from '../validate-content.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));
const deck = read('data/cards.json').cards;
const T = '2026-11-01';

test('interval growth: 1, 3, 7, 14, 30, 60 days, then stays at 60', () => {
  let item = null;
  let day = T;
  const gaps = [];
  for (let i = 0; i < 8; i++) {
    item = schedule(item, 'right', day);
    gaps.push(daysBetween(day, item.due));
    day = item.due;
  }
  assert.deepEqual(gaps, [1, 3, 7, 14, 30, 60, 60, 60]);
});

test('a wrong answer resets the interval to one day and counts a lapse', () => {
  let item = null;
  for (let i = 0; i < 4; i++) item = schedule(item, 'right', T);
  assert.equal(item.box, 4);
  item = schedule(item, 'wrong', T);
  assert.equal(item.box, 0);
  assert.equal(item.due, addDays(T, 1));
  assert.equal(item.lapses, 1);
});

test('a correct guess is half credit: two guesses equal one confident answer', () => {
  const guessed = schedule(schedule(null, 'guess', T), 'guess', T);
  const known = schedule(null, 'right', T);
  assert.equal(guessed.box, known.box);
  const one = schedule(schedule(null, 'right', T), 'guess', T);
  assert.equal(one.box, 1.5);
  assert.equal(one.due, addDays(T, INTERVALS[1])); // half a step does not lengthen the interval yet
  assert.equal(outcomeOf(true, 'guess'), 'guess');
  assert.equal(outcomeOf(true, 'sure'), 'right');
  assert.equal(outcomeOf(false, 'sure'), 'wrong');
});

test('intervals never push an item past two days before the exam', () => {
  let item = null;
  for (let i = 0; i < 5; i++) item = schedule(item, 'right', '2027-03-01', '2027-03-31');
  assert.equal(item.due, '2027-03-29');
  // Once inside the buffer, normal intervals apply (nothing to protect any more).
  assert.equal(schedule(item, 'right', '2027-03-30', '2027-03-31').due > '2027-03-31', true);
});

test('the daily cap limits today\'s queue and holds the rest back, oldest first', () => {
  const st = defaultState();
  st.settings.dailyReviewCap = 30;
  for (let i = 0; i < 40; i++) st.srs[topicKey(`1.${i}`)] = { box: 2, due: addDays(T, -(i % 5)), reviews: 1, lapses: 0 };
  const q = todayQueue(st, deck, T);
  assert.equal(q.topics.length, 30);
  assert.equal(q.cards.length, 0);
  assert.equal(q.held, 10);
  const firstDue = st.srs[topicKey(q.topics[0])].due;
  assert.equal(firstDue, addDays(T, -4));

  // Reviews done today use up the cap.
  for (let i = 0; i < 25; i++) review(st, topicKey(q.topics[i]), 'right', T);
  assert.equal(todayQueue(st, deck, T).topics.length, 5);
  for (let i = 25; i < 30; i++) review(st, topicKey(q.topics[i]), 'right', T);
  const after = todayQueue(st, deck, T);
  assert.equal(after.topics.length + after.cards.length, 0);
  // Tomorrow the counter resets.
  assert.ok(todayQueue(st, deck, addDays(T, 1)).topics.length > 0);
});

test(`new cards: up to ${NEW_PER_DAY} a day, inside the cap, newly covered objectives first`, () => {
  const st = defaultState();
  let q = todayQueue(st, deck, T);
  assert.equal(q.cards.length, NEW_PER_DAY);
  st.answers.push({ at: `${T}T08:00:00.000Z`, objective: '8.4' });
  assert.equal(unseenCards(st, deck, T)[0].id, 'c8-002');
  for (const id of q.cards.slice(0, 4)) review(st, cardKey(id), 'right', T, { isNew: true });
  q = todayQueue(st, deck, T);
  assert.equal(q.newCards.length, NEW_PER_DAY - 4);
  st.settings.dailyReviewCap = 6;
  assert.equal(todayQueue(st, deck, T).cards.length, 2);
});

test('answering any question schedules its objective; only Topic review uses the cap', () => {
  const st = defaultState();
  const bank = read('data/questions.json').questions;
  const q = bank.find((x) => x.id === 'd3-002');
  startSession(st, { mode: 'practice', items: [present(q, mulberry32(1))], seed: 1 });
  answerCurrent(st, q, q.correct, 'sure');
  assert.equal(st.srs[topicKey('3.6')].box, 1);
  assert.equal(st.srsDay, null);
  startSession(st, { mode: 'review', items: [present(q, mulberry32(1))], seed: 1 });
  answerCurrent(st, q, [0], 'sure');
  assert.equal(st.srs[topicKey('3.6')].box, 0);
  assert.equal(st.srsDay.reviews, 1);
});

test('due items sort by due date, then lower box first', () => {
  const srs = { 'card:a': { due: '2026-10-30', box: 3 }, 'card:b': { due: '2026-10-30', box: 1 }, 'card:c': { due: '2026-10-29', box: 5 }, 'card:d': { due: '2026-11-05', box: 0 } };
  assert.deepEqual(dueKeys(srs, T), ['card:c', 'card:b', 'card:a']);
});

test('the card deck passes validation and covers all eight domains', () => {
  const r = lintCards({ cards: deck }, read('data/domains.json'));
  assert.deepEqual(r.errors, []);
  assert.equal(r.stats.domainsCovered, 8);
});
