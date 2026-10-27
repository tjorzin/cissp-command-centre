// Adaptive mock exam: a simple staircase SIMULATION, not ISC2's CAT algorithm.
// - Difficulty steps up one level after a correct answer and down one after a miss (1 to 6).
// - Domain of each next item: the one furthest below its weighted share so far, so the
//   per-domain counts stay within one item of weight x length at every point.
// - Stops between MIN and MAX items once the recent level is clearly high or low, or at MAX.
// - Reports a band (above / borderline / below), never a score out of 1000.
import { pick } from './rng.js';

export const MOCK = { min: 100, max: 150, minutes: 180, startLevel: 3, window: 30, high: 4.5, low: 3.0 };

export function createMock(weights) {
  return { weights, level: MOCK.startLevel, items: [], counts: Object.fromEntries(weights.map((w) => [w.n, 0])) };
}

function nextDomain(state, available) {
  const k = state.items.length + 1;
  let best = null;
  for (const w of state.weights) {
    if (!available.has(w.n)) continue;
    const deficit = (w.weight / 100) * k - state.counts[w.n];
    if (!best || deficit > best.deficit + 1e-9) best = { n: w.n, deficit };
  }
  return best && best.n;
}

export function nextQuestion(state, questions, rng) {
  const used = new Set(state.items.map((i) => i.id));
  const unseen = questions.filter((q) => !used.has(q.id));
  const domain = nextDomain(state, new Set(unseen.map((q) => q.domain)));
  if (domain == null) return null;
  const pool = unseen.filter((q) => q.domain === domain);
  const gap = Math.min(...pool.map((q) => Math.abs(q.difficulty - state.level)));
  return pick(pool.filter((q) => Math.abs(q.difficulty - state.level) === gap), rng);
}

export function recordMock(state, q, correct) {
  state.items.push({ id: q.id, domain: q.domain, difficulty: q.difficulty, correct });
  state.counts[q.domain]++;
  state.level = Math.max(1, Math.min(6, state.level + (correct ? 1 : -1)));
}

function recentLevel(state) {
  const recent = state.items.slice(-MOCK.window);
  return recent.reduce((a, i) => a + i.difficulty, 0) / (recent.length || 1);
}

export function mockDone(state, questionsLeft = Infinity) {
  const n = state.items.length;
  if (n >= MOCK.max || questionsLeft === 0) return true;
  if (n < MOCK.min) return false;
  const lvl = recentLevel(state);
  return lvl >= MOCK.high || lvl <= MOCK.low;
}

export function mockReport(state) {
  const lvl = recentLevel(state);
  const band = lvl >= MOCK.high ? 'above' : lvl <= MOCK.low ? 'below' : 'borderline';
  const byDomain = {};
  for (const w of state.weights) {
    const items = state.items.filter((i) => i.domain === w.n);
    byDomain[w.n] = { asked: items.length, correct: items.filter((i) => i.correct).length };
  }
  return { band, recentLevel: Math.round(lvl * 10) / 10, asked: state.items.length, byDomain };
}

// The mock needs enough questions in every domain and at every level to adapt.
export function mockReadiness(questions, weights) {
  const perDomainNeeded = Object.fromEntries(weights.map((w) => [w.n, Math.ceil((w.weight / 100) * MOCK.max) + 1]));
  const short = weights.filter((w) => questions.filter((q) => q.domain === w.n).length < perDomainNeeded[w.n]).map((w) => w.n);
  return { ready: questions.length >= MOCK.max && short.length === 0, total: questions.length, needed: MOCK.max, shortDomains: short };
}
