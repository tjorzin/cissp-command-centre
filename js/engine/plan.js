// Next Study Plan: today's three blocks, generated from the current state every time.
// Inputs: due reviews, reteach and ledger patterns, the weakest domains weighted by exam
// weight, and the weeks left to the target date. A missed day simply re-plans: nothing is
// carried over as debt, and the streak is shown but never used against you.
import { addDays, daysBetween, todayIn } from '../outline.js';
import { todayQueue, dayCounter } from './srs.js';
import { reteachDue } from './ledger.js';
import { weakObjectives, filterBank } from './bank.js';
import { MOCK, mockReadiness } from './mock.js';

export const LEARN_UNTIL_WEEKS = 10; // Learn until 10 weeks out, Drill until 4, then Simulate
export const DRILL_UNTIL_WEEKS = 4;
export const CHECKPOINT_DAYS = 21;
export const BLOCK_MIN = 20;
export const BLOCK_MAX = 45;
export const SECS_PER_QUESTION = 90;
const MIN_PER_Q = SECS_PER_QUESTION / 60;
const MIN_PER_CARD = 0.5;

export function phaseInfo(today, target) {
  const daysLeft = daysBetween(today, target);
  const learnEnd = addDays(target, -7 * LEARN_UNTIL_WEEKS);
  const drillEnd = addDays(target, -7 * DRILL_UNTIL_WEEKS);
  const checkpoint = addDays(target, -CHECKPOINT_DAYS);
  const phase = daysLeft < 0 ? 'after' : today < learnEnd ? 'learn' : today < drillEnd ? 'drill' : 'simulate';
  return { daysLeft, weeksLeft: Math.max(0, Math.floor(daysLeft / 7)), learnEnd, drillEnd, checkpoint, phase, atCheckpoint: today >= checkpoint && daysLeft >= 0 };
}

// Pace: blocks lengthen as the exam approaches, always within 20 to 45 minutes.
export function blockMinutes(weeksLeft) {
  if (weeksLeft >= LEARN_UNTIL_WEEKS) return [20, 25, 30];
  if (weeksLeft >= DRILL_UNTIL_WEEKS) return [25, 30, 40];
  return [30, 35, 45];
}

// Weakest first, weighted by exam weight. Recent accuracy (10+ answers) beats the baseline;
// a domain with no evidence is assumed 50% and nudged up so every domain gets covered.
export function domainPriorities(state, weights) {
  return weights.map((w) => {
    const all = state.answers.filter((a) => a.domain === w.n);
    const recent = all.slice(-30);
    let accuracy = null;
    let source = 'none';
    if (recent.length >= 10) {
      accuracy = recent.filter((a) => a.correct).length / recent.length;
      source = 'recent';
    } else if (state.baseline?.byDomain?.[w.n]?.asked) {
      const b = state.baseline.byDomain[w.n];
      accuracy = b.correct / b.asked;
      source = 'baseline';
    }
    const score = w.weight * (1 - (accuracy ?? 0.5)) * (source === 'none' ? 1.2 : 1);
    return { n: w.n, name: w.name, weight: w.weight, accuracy: accuracy == null ? null : Math.round(accuracy * 100), source, answered: all.length, score };
  }).sort((a, b) => b.score - a.score || b.weight - a.weight || a.n - b.n);
}

const sessionsOn = (state, today) => state.sessions.filter((s) => todayIn(state.settings.timeZone, new Date(s.endedAt)) === today);

// Picks are fixed for the day once made, so the plan does not reshuffle as you work.
// The one exception: picks made before the baseline existed are redone once it does,
// because the baseline is the first real evidence.
export function dailyPicks(state, weights, today) {
  const p = state.plan;
  if (p?.date === today && (p.withBaseline || !state.baseline)) return { picks: p.picks, fresh: false };
  const ranked = domainPriorities(state, weights);
  return { picks: { focus: ranked[0].n, deep: ranked[1].n }, fresh: true };
}

function practiceTask(id, domain, name, minutes, questions, state, today, extra = {}) {
  const pool = filterBank(questions, { domain, minDifficulty: extra.minDifficulty || 1 });
  const size = Math.max(1, Math.min(pool.length, Math.floor(minutes / MIN_PER_Q)));
  const done = sessionsOn(state, today).some((s) => ['practice', 'hard', 'weakness'].includes(s.mode) && (s.byDomain[domain]?.asked || 0) >= Math.min(size, 5));
  return {
    id, kind: 'practice', title: `${extra.label || 'Practise'} Domain ${domain}: ${name}`,
    detail: `${size} question${size === 1 ? '' : 's'}${extra.minDifficulty ? ` at level ${extra.minDifficulty}+` : ''}. Skim the domain page first if it is new to you.`,
    minutes: Math.round(size * MIN_PER_Q), done,
    action: { type: 'session', mode: 'practice', domain, size, minDifficulty: extra.minDifficulty || 1 },
    link: `#/study/${domain}`
  };
}

export function buildPlan(state, data, today) {
  const { weights, cards, questions } = data;
  const s = state.settings;
  const info = phaseInfo(today, s.targetDate);
  const [mMorning, mAfternoon, mEvening] = blockMinutes(info.weeksLeft);
  const { picks, fresh } = dailyPicks(state, weights, today);
  const name = (n) => weights.find((w) => w.n === n)?.name || `Domain ${n}`;
  const todays = sessionsOn(state, today);
  const ran = (mode) => todays.some((x) => x.mode === mode);

  // Morning: recall. Reteach first (it blocks questions), then spaced reviews.
  const morning = [];
  const due = reteachDue(state.ledger, state.reteach);
  if (due.length) {
    morning.push({ id: 'reteach', kind: 'reteach', title: `Reteach ${due[0].objective}`, detail: `Missed ${due[0].misses} times. A short lesson and a teach-back.`, minutes: 10, done: false, action: { type: 'route', to: `#/reteach/${due[0].objective}` } });
  }
  const queue = todayQueue(state, cards, today);
  const doneToday = dayCounter(state, today).reviews;
  const cardsLeft = queue.cards.length;
  const topicsLeft = queue.topics.length;
  if (cardsLeft || doneToday) {
    morning.push({
      id: 'cards', kind: 'cards', title: cardsLeft ? `Flashcards: ${cardsLeft} due` : 'Flashcards',
      detail: cardsLeft ? 'Flip, then rate honestly. Guesses earn half credit.' : 'Today\'s cards are done.',
      minutes: Math.max(5, Math.ceil(cardsLeft * MIN_PER_CARD)), done: cardsLeft === 0, action: { type: 'route', to: '#/cards' }
    });
  }
  if (topicsLeft || ran('review')) {
    morning.push({
      id: 'topics', kind: 'topics', title: topicsLeft ? `Topic review: ${topicsLeft} due` : 'Topic review',
      detail: 'One question per objective that is due.', minutes: Math.max(5, Math.ceil(topicsLeft * MIN_PER_Q)),
      done: topicsLeft === 0, action: { type: 'session', mode: 'review' }
    });
  }
  if (!morning.length) {
    morning.push({ id: 'cards', kind: 'cards', title: 'Flashcards: browse the deck', detail: 'Nothing due. Pick a filter such as "From my errors".', minutes: 10, done: doneToday > 0, action: { type: 'route', to: '#/cards' } });
  }

  // Afternoon: focus on the weakest domain (Learn), or drill errors (Drill, Simulate).
  const afternoon = [];
  const weakCount = weakObjectives(state.answers).size;
  if (info.phase === 'learn' || !weakCount) {
    afternoon.push(practiceTask('focus', picks.focus, name(picks.focus), mAfternoon, questions, state, today,
      info.phase === 'learn' ? {} : { label: 'Drill', minDifficulty: 4 }));
  } else {
    afternoon.push({
      id: 'weakness', kind: 'weakness', title: `Weakness drill: ${weakCount} objective${weakCount === 1 ? '' : 's'}`,
      detail: 'Your misses and guesses, plus the other questions on the same ideas.',
      minutes: mAfternoon, done: ran('weakness'), action: { type: 'session', mode: 'weakness' }
    });
  }

  // Evening: baseline first; then the next-weakest domain, hard mode, or a timed mini exam.
  const evening = [];
  if (!state.baseline) {
    const size = Math.min(questions.length, 48);
    evening.push({ id: 'baseline', kind: 'baseline', title: 'Baseline diagnostic', detail: `${size} questions across all eight domains. It sets your starting point; no feedback until the end.`, minutes: Math.round(size * MIN_PER_Q), done: false, action: { type: 'session', mode: 'diagnostic' } });
  } else if (info.phase === 'learn') {
    evening.push(practiceTask('deep', picks.deep, name(picks.deep), mEvening, questions, state, today));
  } else if (info.phase === 'drill') {
    const hard = filterBank(questions, { minDifficulty: 5 }).length;
    evening.push({ id: 'hard', kind: 'hard', title: 'Hard mode', detail: `Levels 5 and 6: several plausible answers (${hard} in the bank).`, minutes: mEvening, done: ran('hard'), action: { type: 'session', mode: 'hard' } });
    evening.push({ id: 'compare', kind: 'cards', title: 'Comparison cards', detail: 'The pairs CISSP likes to blur. Use the deck filters.', minutes: 10, done: false, optional: true, action: { type: 'route', to: '#/cards' } });
  } else {
    evening.push({ id: 'mini', kind: 'mini', title: 'Mini exam', detail: '25 questions at 90 seconds each, by exam weighting.', minutes: 38, done: ran('mini'), action: { type: 'session', mode: 'mini' } });
  }

  const blocks = [
    { id: 'morning', label: 'Morning', time: s.reminders[0], target: mMorning, tasks: morning },
    { id: 'afternoon', label: 'Afternoon', time: s.reminders[1], target: mAfternoon, tasks: afternoon },
    { id: 'evening', label: 'Evening', time: s.reminders[2], target: mEvening, tasks: evening }
  ].map((b) => {
    const required = b.tasks.filter((t) => !t.optional);
    const sum = required.reduce((a, t) => a + t.minutes, 0);
    const tasks = [...b.tasks];
    // While the bank is small, a block can fall short of 20 minutes: say so and fill it
    // with flashcards, rather than claiming a length the listed tasks do not add up to.
    if (sum < BLOCK_MIN) {
      tasks.push({
        id: `topup-${b.id}`, kind: 'cards', title: 'Top up with flashcards', optional: true, done: false,
        detail: 'The question bank is still small, so round the block off with cards.',
        minutes: BLOCK_MIN - sum, action: { type: 'route', to: '#/cards' }
      });
    }
    return { ...b, tasks, minutes: Math.min(BLOCK_MAX, Math.max(BLOCK_MIN, sum)), done: required.every((t) => t.done) };
  });

  // In Simulate, a weekly 3-hour adaptive mock outside the blocks, once the bank allows it.
  const mock = info.phase === 'simulate' && mockReadiness(questions, weights).ready
    ? { due: !state.sessions.some((x) => x.mode === 'mock' && daysBetween(x.endedAt.slice(0, 10), today) < 7), minutes: MOCK.minutes }
    : null;

  // On first run the baseline comes before anything else; after that, the earliest open task.
  const open = blocks.flatMap((b) => b.tasks.filter((t) => !t.done && !t.optional).map((t) => ({ ...t, block: b.id })));
  const next = open.find((t) => t.kind === 'baseline') || open[0] || null;
  return { today, info, blocks, next, picks, fresh, mock, priorities: domainPriorities(state, weights) };
}

// The block that is due now: the latest whose time has passed today and is not done.
export function dueNowBlock(plan, hhmm) {
  return [...plan.blocks].reverse().find((b) => b.time <= hhmm && !b.done) || null;
}
