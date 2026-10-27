// Session lifecycle on the stored state: start, answer, advance, finish.
// Pure functions over the state object, so the store can persist them and tests can drive them.
import { grade, present } from './bank.js';
import { mulberry32 } from './rng.js';
import { todayIn } from '../outline.js';
import { ledgerEntry } from './ledger.js';
import { review, topicKey, outcomeOf } from './srs.js';
import { createMock, nextQuestion, recordMock, mockDone, mockReport } from './mock.js';

export const MODES = {
  practice: { title: 'Practice set', feedback: true },
  scenario: { title: 'Scenario set', feedback: true },
  weakness: { title: 'Weakness drill', feedback: true },
  hard: { title: 'Hard mode', feedback: true },
  review: { title: 'Topic review', feedback: true },
  mini: { title: 'Mini exam', feedback: false },
  mock: { title: 'Adaptive mock (simulation)', feedback: false },
  diagnostic: { title: 'Baseline diagnostic', feedback: false }
};

const uid = (now) => `s${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export function startSession(state, { mode, title, items = [], limitSec = null, seed, weights, now = Date.now() }) {
  const s = {
    id: uid(now),
    mode,
    title: title || MODES[mode].title,
    feedback: MODES[mode].feedback,
    seed,
    startedAt: now,
    limitSec,
    items,
    index: 0,
    shownAt: now,
    responses: [],
    mock: mode === 'mock' ? createMock(weights) : null
  };
  state.activeSession = s;
  return s;
}

// For the mock, the next item is chosen only once the previous one is answered.
export function ensureCurrent(s, questions) {
  if (s.mode !== 'mock' || s.items[s.index]) return s.items[s.index] || null;
  const used = new Set(s.items.map((i) => i.id));
  if (mockDone(s.mock, questions.filter((q) => !used.has(q.id)).length)) return null;
  const rng = mulberry32((s.seed + s.items.length * 7919) >>> 0);
  const q = nextQuestion(s.mock, questions, rng);
  if (!q) return null;
  s.items.push(present(q, rng));
  return s.items[s.index];
}

export function timeLeft(s, now = Date.now()) {
  return s.limitSec == null ? null : Math.max(0, Math.round(s.limitSec - (now - s.startedAt) / 1000));
}

export function answerCurrent(state, q, selected, confidence, now = Date.now()) {
  const s = state.activeSession;
  const correct = grade(q, selected);
  const secs = Math.round((now - s.shownAt) / 1000);
  s.responses.push({ id: q.id, selected, correct, confidence, secs });
  if (s.mock) recordMock(s.mock, q, correct);
  const at = new Date(now).toISOString();
  state.answers.push({
    at, sessionId: s.id, mode: s.mode, qid: q.id,
    domain: q.domain, objective: q.objective, subtopic: q.subtopic, difficulty: q.difficulty,
    selected, correctAnswer: q.correct, correct, confidence, secs
  });
  const entry = ledgerEntry(q, { sessionId: s.id, mode: s.mode, selected, correct, confidence, at });
  if (entry) state.ledger.push(entry);
  review(state, topicKey(q.objective), outcomeOf(correct, confidence), todayIn(state.settings.timeZone, new Date(now)),
    { counts: s.mode === 'review' });
  return correct;
}

export function advance(s, now = Date.now()) {
  s.index++;
  s.shownAt = now;
}

export function isFinished(s, questions) {
  if (timeLeft(s) === 0) return true;
  if (s.mode === 'mock') return !ensureCurrent(s, questions);
  return s.index >= s.items.length;
}

export function finishSession(state, questions, now = Date.now()) {
  const s = state.activeSession;
  if (!s) return null;
  const byDomain = {};
  for (const r of s.responses) {
    const q = questions.find((x) => x.id === r.id);
    const d = (byDomain[q.domain] ||= { asked: 0, correct: 0 });
    d.asked++;
    if (r.correct) d.correct++;
  }
  const summary = {
    id: s.id,
    mode: s.mode,
    title: s.title,
    startedAt: new Date(s.startedAt).toISOString(),
    endedAt: new Date(now).toISOString(),
    presented: s.mode === 'mock' ? s.responses.length : s.items.length,
    answered: s.responses.length,
    correct: s.responses.filter((r) => r.correct).length,
    byDomain,
    items: s.items.slice(0, s.mode === 'mock' ? s.responses.length : s.items.length),
    responses: s.responses,
    mockReport: s.mock ? mockReport(s.mock) : null
  };
  state.sessions.push(summary);
  state.activeSession = null;
  const day = todayIn(state.settings.timeZone, new Date(now));
  if (summary.answered && !state.studyDays.includes(day)) state.studyDays.push(day);
  return summary;
}
