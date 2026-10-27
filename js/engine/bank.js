// Question bank: filtering, paper building for each mode, option shuffling and grading.
import { shuffle } from './rng.js';

export const MINI_SIZE = 25;
export const MINI_SECONDS_EACH = 90;

// Questions tagged for one outline only are left out when the other outline applies.
export function eligible(questions, outlineId) {
  return questions.filter((q) => !(outlineId === '2024' && q.tags.includes('outline2027'))
    && !(outlineId === '2027' && q.tags.includes('outline2024only')));
}

export function filterBank(questions, { domain, objective, minDifficulty = 1, maxDifficulty = 6 } = {}) {
  return questions.filter((q) => (!domain || q.domain === domain)
    && (!objective || q.objective === objective)
    && q.difficulty >= minDifficulty && q.difficulty <= maxDifficulty);
}

// One question as presented: options in a random order, remembered so review matches.
export const present = (q, rng) => ({ id: q.id, order: shuffle(q.options.map((_, i) => i), rng) });

export function grade(q, selected) {
  const want = new Set(q.correct);
  return selected.length === want.size && selected.every((i) => want.has(i));
}

// Largest-remainder allocation of n items across domains by weight (weights sum to 100).
export function allocate(weights, n) {
  const raw = weights.map((w) => ({ n: w.n, exact: (w.weight / 100) * n }));
  const counts = raw.map((r) => ({ n: r.n, count: Math.floor(r.exact), rem: r.exact - Math.floor(r.exact) }));
  let left = n - counts.reduce((a, c) => a + c.count, 0);
  [...counts].sort((a, b) => b.rem - a.rem || a.n - b.n).forEach((c) => { if (left > 0) { c.count++; left--; } });
  return Object.fromEntries(counts.map((c) => [c.n, c.count]));
}

export function buildPractice(questions, filters, size, rng) {
  return shuffle(filterBank(questions, filters), rng).slice(0, size || undefined).map((q) => present(q, rng));
}

export function buildHard(questions, size, rng) {
  return buildPractice(questions, { minDifficulty: 5 }, size, rng);
}

// Mini exam: domain mix by weight; a domain short of questions is topped up from the rest.
export function buildMini(questions, weights, rng, size = MINI_SIZE) {
  const n = Math.min(size, questions.length);
  const quota = allocate(weights, n);
  const chosen = [];
  const spare = [];
  for (const w of weights) {
    const pool = shuffle(questions.filter((q) => q.domain === w.n), rng);
    chosen.push(...pool.slice(0, quota[w.n]));
    spare.push(...pool.slice(quota[w.n]));
  }
  chosen.push(...shuffle(spare, rng).slice(0, n - chosen.length));
  return shuffle(chosen, rng).map((q) => present(q, rng));
}

// Topic review: one question per due objective, the one answered least recently.
export function buildTopicReview(questions, objectives, answers, rng) {
  const lastAnswered = new Map(answers.map((a) => [a.qid, a.at]));
  return objectives
    .map((obj) => questions.filter((q) => q.objective === obj)
      .sort((a, b) => (lastAnswered.get(a.id) || '').localeCompare(lastAnswered.get(b.id) || ''))[0])
    .filter(Boolean)
    .map((q) => present(q, rng));
}

// Baseline diagnostic: up to six per domain, spread across difficulty levels.
export const DIAGNOSTIC_PER_DOMAIN = 6;

export function buildDiagnostic(questions, weights, rng, perDomain = DIAGNOSTIC_PER_DOMAIN) {
  const chosen = [];
  for (const w of weights) {
    const pool = shuffle(questions.filter((q) => q.domain === w.n), rng).sort((a, b) => a.difficulty - b.difficulty);
    if (pool.length <= perDomain) { chosen.push(...pool); continue; }
    // Evenly spaced picks through the difficulty-sorted pool give a mixed set.
    for (let i = 0; i < perDomain; i++) chosen.push(pool[Math.floor((i * pool.length) / perDomain)]);
  }
  return shuffle(chosen, rng).map((q) => present(q, rng));
}

export function buildScenario(questions, scenario, rng) {
  return scenario.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean)
    .map((q) => present(q, rng));
}

// Weakness mode drills the idea, not the wording: every missed (or guessed) question,
// then every other question on the same objectives.
export function weakObjectives(answers) {
  const weak = new Map();
  for (const a of answers) {
    if (!a.correct || a.confidence === 'guess') weak.set(a.objective, (weak.get(a.objective) || 0) + 1);
  }
  return weak;
}

export function buildWeakness(questions, answers, rng, size = 20) {
  const missedIds = [...new Set(answers.filter((a) => !a.correct || a.confidence === 'guess').map((a) => a.qid).reverse())];
  const weak = weakObjectives(answers);
  const missed = missedIds.map((id) => questions.find((q) => q.id === id)).filter(Boolean);
  const related = shuffle(questions.filter((q) => weak.has(q.objective) && !missedIds.includes(q.id)), rng);
  return [...missed, ...related].slice(0, size).map((q) => present(q, rng));
}
