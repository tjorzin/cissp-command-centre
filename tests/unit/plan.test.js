import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { phaseInfo, blockMinutes, domainPriorities, buildPlan, dailyPicks, dueNowBlock, BLOCK_MIN, BLOCK_MAX } from '../../js/engine/plan.js';
import { buildDiagnostic, present } from '../../js/engine/bank.js';
import { startSession, answerCurrent, advance, finishSession } from '../../js/engine/session.js';
import { reminderCalendar, msUntil, nowHHMM } from '../../js/reminders.js';
import { defaultState } from '../../js/store.js';
import { mulberry32 } from '../../js/engine/rng.js';
import { syntheticBank } from '../sim-papers.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));
const weights = read('data/outlines.json').outlines[0].domains;
const cards = read('data/cards.json').cards;
const questions = read('data/questions.json').questions;
const data = { weights, cards, questions };
const T = '2026-10-28'; // a Wednesday, 22 weeks before 31 March 2027

test('phases: Learn until 10 weeks out, Drill until 4, Simulate to the exam; checkpoint 3 weeks before', () => {
  const p = phaseInfo(T, '2027-03-31');
  assert.equal(p.phase, 'learn');
  assert.equal(p.weeksLeft, 22);
  assert.equal(p.learnEnd, '2027-01-20');
  assert.equal(p.drillEnd, '2027-03-03');
  assert.equal(p.checkpoint, '2027-03-10');
  assert.equal(phaseInfo('2027-02-01', '2027-03-31').phase, 'drill');
  assert.equal(phaseInfo('2027-03-12', '2027-03-31').phase, 'simulate');
  assert.equal(phaseInfo('2027-03-12', '2027-03-31').atCheckpoint, true);
  assert.equal(phaseInfo('2027-04-01', '2027-03-31').phase, 'after');
});

test('block lengths stay within 20 to 45 minutes and rise as the exam nears', () => {
  for (const w of [30, 12, 10, 9, 4, 3, 0]) {
    const m = blockMinutes(w);
    assert.ok(m.every((x) => x >= BLOCK_MIN && x <= BLOCK_MAX), `${w}: ${m}`);
  }
  assert.ok(blockMinutes(2)[2] > blockMinutes(20)[2]);
});

test('domain priority: weakest first, weighted by exam weight, untested domains nudged up', () => {
  const st = defaultState();
  const ans = (domain, right, n) => Array.from({ length: n }, (_, i) => ({ domain, correct: i < right }));
  for (let d = 1; d <= 8; d++) st.answers.push(...ans(d, 8, 10)); // all 80%
  st.answers.push(...ans(2, 0, 10)); // domain 2 recent: 8/20 of last 20 → 40%
  let p = domainPriorities(st, weights);
  assert.equal(p[0].n, 2);
  assert.equal(p[0].source, 'recent');
  // Equal accuracy: the heavier domain (1, 16%) outranks the lighter ones.
  const flat = defaultState();
  for (let d = 1; d <= 8; d++) flat.answers.push(...ans(d, 5, 10));
  assert.equal(domainPriorities(flat, weights)[0].n, 1);
  // A domain with no evidence outranks one of the same weight known to be at 50%
  // (Domains 2 and 8 are both 10%); weight still dominates, so Domain 1 stays first.
  flat.answers = flat.answers.filter((a) => a.domain !== 8);
  const order = domainPriorities(flat, weights).map((d) => d.n);
  assert.ok(order.indexOf(8) < order.indexOf(2), order.join());
  assert.equal(order[0], 1);
});

test('first run: the baseline diagnostic is what to do next; new cards fill the morning', () => {
  const plan = buildPlan(defaultState(), data, T);
  assert.equal(plan.next.kind, 'baseline');
  assert.equal(plan.blocks.length, 3);
  assert.deepEqual(plan.blocks.map((b) => b.time), ['05:45', '13:00', '20:30']);
  assert.equal(plan.blocks[0].tasks[0].title, 'Flashcards: 10 due');
  assert.ok(plan.blocks.every((b) => b.minutes >= BLOCK_MIN && b.minutes <= BLOCK_MAX));
  // Listed minutes always add up to the block length: short blocks get an optional top-up.
  for (const b of plan.blocks) {
    const listed = b.tasks.reduce((a, t) => a + t.minutes, 0);
    assert.ok(listed >= BLOCK_MIN, `${b.id}: ${listed}`);
  }
  assert.ok(plan.blocks[0].tasks.some((t) => t.id === 'topup-morning' && t.optional));
});

test('the baseline diagnostic takes six per domain at mixed difficulty and is saved as the baseline', () => {
  const big = syntheticBank();
  const items = buildDiagnostic(big, weights, mulberry32(4));
  assert.equal(items.length, 48);
  for (let d = 1; d <= 8; d++) {
    const qs = items.map((i) => big.find((q) => q.id === i.id)).filter((q) => q.domain === d);
    assert.equal(qs.length, 6);
    assert.ok(new Set(qs.map((q) => q.difficulty)).size >= 4, `domain ${d} difficulties`);
  }
  // Real bank: six per domain where available, every question where a domain has fewer.
  const expected = weights.reduce((a, w) => a + Math.min(6, questions.filter((q) => q.domain === w.n).length), 0);
  assert.equal(buildDiagnostic(questions, weights, mulberry32(4)).length, expected);

  const st = defaultState();
  const seedItems = buildDiagnostic(questions, weights, mulberry32(5));
  startSession(st, { mode: 'diagnostic', items: seedItems, seed: 5 });
  for (const it of seedItems) {
    const q = questions.find((x) => x.id === it.id);
    answerCurrent(st, q, q.domain === 2 ? [9] : q.correct, 'unsure');
    advance(st.activeSession);
  }
  finishSession(st, questions);
  assert.equal(st.baseline.presented, seedItems.length);
  assert.equal(st.baseline.byDomain[2].correct, 0);
  assert.equal(domainPriorities(st, weights)[0].n, 2); // baseline drives priorities until 10 recent answers exist
  assert.notEqual(buildPlan(st, data, T).next.kind, 'baseline');
});

test('picks hold for the day and re-plan the next day; a missed day carries nothing over', () => {
  const st = defaultState();
  st.baseline = { byDomain: { 5: { asked: 3, correct: 0 } } };
  const first = dailyPicks(st, weights, T);
  assert.equal(first.fresh, true);
  assert.equal(first.picks.focus, 5);
  st.plan = { date: T, picks: first.picks, withBaseline: true };
  // Practising other domains today does not reshuffle today's plan.
  st.baseline.byDomain[5] = { asked: 3, correct: 3 };
  assert.deepEqual(dailyPicks(st, weights, T), { picks: first.picks, fresh: false });
  // Picks made before a baseline existed are redone once it is saved the same day.
  const noBase = defaultState();
  noBase.plan = { date: T, picks: { focus: 1, deep: 3 }, withBaseline: false };
  assert.equal(dailyPicks(noBase, weights, T).fresh, false);
  noBase.baseline = { byDomain: { 6: { asked: 3, correct: 0 } } };
  assert.deepEqual(dailyPicks(noBase, weights, T), { picks: { focus: 6, deep: 1 }, fresh: true });
  // Three days later: fresh picks from the current state, no backlog of missed tasks.
  const later = buildPlan(st, data, '2026-10-31');
  assert.equal(later.fresh, true);
  assert.notEqual(later.picks.focus, 5);
  assert.equal(later.blocks.flatMap((b) => b.tasks).length <= 6, true);
});

test('next-day plan reflects forced misses: topics due, weakest domain moves to the focus block', () => {
  const st = defaultState();
  st.baseline = { byDomain: {} };
  const d7 = questions.filter((q) => q.domain === 7);
  for (let round = 0; round < 4; round++) {
    startSession(st, { mode: 'practice', items: d7.map((q) => present(q, mulberry32(round))), seed: round, now: Date.parse(`${T}T08:00:00Z`) });
    for (const q of d7) {
      answerCurrent(st, q, [q.options.findIndex((_, i) => !q.correct.includes(i))], 'sure', Date.parse(`${T}T08:05:00Z`));
      advance(st.activeSession);
    }
    finishSession(st, questions, Date.parse(`${T}T08:10:00Z`));
  }
  const tomorrow = buildPlan(st, data, '2026-10-29');
  assert.equal(tomorrow.picks.focus, 7);
  const morning = tomorrow.blocks[0].tasks.map((t) => t.id);
  assert.ok(morning.includes('reteach'), morning.join());
  assert.ok(tomorrow.blocks[0].tasks.some((t) => t.id === 'topics' && /due/.test(t.title)));
  // In the Drill phase the same history drives a weakness drill.
  st.settings.targetDate = '2027-01-20';
  const drill = buildPlan(st, data, '2026-12-01');
  assert.equal(drill.info.phase, 'drill');
  assert.equal(drill.blocks[1].tasks[0].kind, 'weakness');
});

test('done tasks tick off and the block is marked done', () => {
  const st = defaultState();
  st.baseline = { byDomain: {} };
  const plan = buildPlan(st, data, T);
  const focus = plan.blocks[1].tasks[0];
  st.sessions.push({ mode: 'practice', endedAt: `${T}T11:00:00.000Z`, byDomain: { [focus.action.domain]: { asked: focus.action.size, correct: 1 } } });
  const after = buildPlan({ ...st, plan: { date: T, picks: plan.picks } }, data, T);
  assert.equal(after.blocks[1].tasks[0].done, true);
  assert.equal(after.blocks[1].done, true);
});

test('Simulate phase: mini exam in the evening; due-now picks the latest open block', () => {
  const st = defaultState();
  st.baseline = { byDomain: {} };
  st.settings.targetDate = '2026-11-15';
  const plan = buildPlan(st, data, T);
  assert.equal(plan.info.phase, 'simulate');
  assert.equal(plan.blocks[2].tasks[0].kind, 'mini');
  assert.equal(dueNowBlock(plan, '05:00'), null);
  assert.equal(dueNowBlock(plan, '14:00').id, 'afternoon');
  assert.equal(dueNowBlock(plan, '23:00').id, 'evening');
});

test('reminder timing is computed in Harare time', () => {
  const now = new Date('2026-10-28T10:59:30Z'); // 12:59:30 in Harare
  assert.equal(nowHHMM('Africa/Harare', now), '12:59');
  assert.equal(msUntil('13:00', 'Africa/Harare', now), 30000);
  assert.equal(msUntil('20:30', 'Africa/Harare', now), (7 * 60 + 31) * 60000 - 30000);
  assert.equal(msUntil('05:45', 'Africa/Harare', now), null); // already passed today
});

test('calendar file: three daily reminders in Harare time until the day before the exam', () => {
  const ics = reminderCalendar(defaultState().settings, T);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.match(ics, /DTSTART;TZID=Africa\/Harare:20261028T054500/);
  assert.match(ics, /DTSTART;TZID=Africa\/Harare:20261028T203000/);
  assert.equal((ics.match(/RRULE:FREQ=DAILY;UNTIL=20270330T235959Z/g) || []).length, 3);
  assert.match(ics, /TZOFFSETTO:\+0200/);
  assert.ok(ics.includes('\r\n'));
});
