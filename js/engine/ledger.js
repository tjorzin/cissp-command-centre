// Error Ledger: every miss, and every correct answer given as a guess, with the reasoning
// snapshotted so the entry still reads correctly if the question is later edited.

export const ERROR_CLASSES = [
  { id: 'first-vs-best', label: 'First step vs best step' },
  { id: 'tech-vs-mgmt', label: 'Technical answer, management wanted' },
  { id: 'scope-terms', label: 'Scope or terminology confusion' },
  { id: 'recall', label: 'Pure recall' }
];

// A concept (objective) missed this many times since its last reteach must be retaught
// before more questions on it are served in study modes.
export const RETEACH_AFTER = 3;

export const entryId = (sessionId, qid) => `${sessionId}:${qid}`;

export function ledgerEntry(q, { sessionId, mode, selected, correct, confidence, at }) {
  if (correct && confidence !== 'guess') return null;
  return {
    id: entryId(sessionId, q.id),
    at,
    sessionId,
    mode,
    kind: correct ? 'guess' : 'wrong',
    qid: q.id,
    domain: q.domain,
    objective: q.objective,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    stem: q.stem,
    selected,
    correctAnswer: q.correct,
    yourAnswer: selected.map((i) => q.options[i]),
    rightAnswer: q.correct.map((i) => q.options[i]),
    confidence,
    whyWrong: selected.filter((i) => !q.correct.includes(i)).map((i) => ({ option: q.options[i], why: q.rationales[i] })),
    missed: q.correct.filter((i) => !selected.includes(i)).map((i) => ({ option: q.options[i], why: q.rationales[i] })),
    mentalModel: q.correct.map((i) => q.rationales[i].replace(/^Correct\.\s*/, '')).join(' '),
    concept: q.concept,
    trap: q.trap,
    managerLens: q.managerLens,
    gap: q.gap,
    followUpId: q.followUpId,
    errorClass: null
  };
}

export function tagEntry(state, id, errorClass) {
  const e = state.ledger.find((x) => x.id === id);
  if (e) e.errorClass = e.errorClass === errorClass ? null : errorClass; // a second tap clears it
  return e;
}

export const isMisconception = (e) => e.kind === 'wrong' && e.confidence === 'sure';

export function patterns(ledger) {
  const newestFirst = [...ledger].sort((a, b) => b.at.localeCompare(a.at));
  const misconceptions = newestFirst.filter(isMisconception);

  const byObjective = new Map();
  for (const e of newestFirst.filter((x) => x.kind === 'wrong')) {
    const t = byObjective.get(e.objective) || { objective: e.objective, domain: e.domain, misses: 0, sure: 0, last: e.at, subtopics: new Set() };
    t.misses++;
    if (e.confidence === 'sure') t.sure++;
    t.subtopics.add(e.subtopic);
    byObjective.set(e.objective, t);
  }
  const topics = [...byObjective.values()]
    .filter((t) => t.misses > 1)
    .sort((a, b) => b.misses - a.misses || b.sure - a.sure || b.last.localeCompare(a.last))
    .map((t) => ({ ...t, subtopics: [...t.subtopics] }));

  const classes = Object.fromEntries(ERROR_CLASSES.map((c) => [c.id, 0]));
  let untagged = 0;
  for (const e of ledger) {
    if (e.errorClass) classes[e.errorClass]++;
    else untagged++;
  }
  return { misconceptions, topics, classes, untagged, total: ledger.length, guesses: ledger.filter((e) => e.kind === 'guess').length };
}

export function missesSinceReteach(ledger, reteach, objective) {
  const since = reteach[objective]?.at || '';
  return ledger.filter((e) => e.kind === 'wrong' && e.objective === objective && e.at > since).length;
}

export function reteachDue(ledger, reteach = {}) {
  const objectives = [...new Set(ledger.filter((e) => e.kind === 'wrong').map((e) => e.objective))];
  return objectives
    .map((objective) => ({ objective, misses: missesSinceReteach(ledger, reteach, objective) }))
    .filter((r) => r.misses >= RETEACH_AFTER)
    .sort((a, b) => b.misses - a.misses);
}

// The short lesson: the outline's topics for the objective plus the distinct
// concepts, correct reasoning and traps from the questions missed on it.
export function reteachLesson(ledger, objective) {
  const seen = new Set();
  const points = [];
  for (const e of ledger.filter((x) => x.objective === objective && x.kind === 'wrong')) {
    if (seen.has(e.concept)) continue;
    seen.add(e.concept);
    points.push({ concept: e.concept, model: e.mentalModel, trap: e.trap, managerLens: e.managerLens });
  }
  return points;
}

export function completeReteach(state, objective, teachBack, now = new Date()) {
  const prev = state.reteach[objective];
  state.reteach[objective] = {
    at: now.toISOString(),
    teachBack,
    history: [...(prev?.history || []), { at: now.toISOString(), teachBack }]
  };
}
