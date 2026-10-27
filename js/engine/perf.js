// Performance figures and readiness gates. Every figure says how many answers it rests on;
// below MIN_SAMPLE it reports "not enough data" instead of a number.
import { addDays, daysBetween, formatDate } from '../outline.js';
import { missesSinceReteach } from './ledger.js';

export const MIN_SAMPLE = 20;
export const TREND_SESSIONS = 5;
export const CONFIDENCES = ['guess', 'unsure', 'sure'];

export const DEFAULT_GATES = {
  // 'band' (both last two mocks "above"; chosen 27 Oct 2026 because adaptive mocks hold
  // accuracy near 50-60%) or 'accuracy' (the brief's original 75% rule).
  mockMetric: 'band',
  mockAccuracy: 75,
  domainMin: 70,
  domainWindow: 50,       // most recent answers per domain that count
  conceptMaxMisses: 2,
  weeks: 3,
  daysPerWeek: 5
};

const pct = (c, n) => (n ? Math.round((c / n) * 100) : null);
const rate = (list) => ({ n: list.length, correct: list.filter((a) => a.correct).length, accuracy: pct(list.filter((a) => a.correct).length, list.length), enough: list.length >= MIN_SAMPLE });

export function domainStats(state, n) {
  const answers = state.answers.filter((a) => a.domain === n);
  const sure = answers.filter((a) => a.confidence === 'sure');
  const timed = answers.filter((a) => Number.isFinite(a.secs));
  const trend = state.sessions
    .map((s) => ({ at: s.endedAt, d: s.byDomain[n] }))
    .filter((x) => x.d && x.d.asked)
    .slice(-TREND_SESSIONS)
    .map((x) => ({ at: x.at, accuracy: pct(x.d.correct, x.d.asked), asked: x.d.asked }));
  return {
    n,
    ...rate(answers),
    sure: rate(sure),
    avgSecs: timed.length ? Math.round(timed.reduce((a, x) => a + x.secs, 0) / timed.length) : null,
    lastRevised: answers.length ? answers.map((a) => a.at).sort().pop() : null,
    trend
  };
}

export function difficultyStats(state) {
  return [1, 2, 3, 4, 5, 6].map((level) => ({ level, ...rate(state.answers.filter((a) => a.difficulty === level)) }));
}

// Calibration: when you say "sure", how often are you right?
export function calibration(state) {
  return CONFIDENCES.map((c) => ({ confidence: c, ...rate(state.answers.filter((a) => a.confidence === c)) }));
}

// Monday-based weeks in Harare calendar days.
export function weekStart(iso) {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dow + 6) % 7));
}

export function studyWeeks(studyDays, today, count) {
  const thisWeek = weekStart(today);
  const days = new Set(studyDays);
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(thisWeek, -7 * (count - 1 - i));
    const n = Array.from({ length: 7 }, (_, d) => addDays(start, d)).filter((d) => days.has(d)).length;
    return { start, days: n, current: start === thisWeek };
  });
}

// Current streak: consecutive study days ending today, or yesterday if today is not done yet.
export function streak(studyDays, today) {
  const days = new Set(studyDays);
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function gates(state, today) {
  const g = { ...DEFAULT_GATES, ...(state.settings.gates || {}) };
  const out = [];

  // 1. Last two adaptive mocks
  const mocks = state.sessions.filter((s) => s.mode === 'mock').slice(-2);
  const mockEvidence = mocks.map((s) => `${formatDate(s.endedAt.slice(0, 10))}: ${s.correct}/${s.presented} (${pct(s.correct, s.presented)}%), band ${s.mockReport?.band}`);
  if (g.mockMetric === 'band') {
    out.push({
      id: 'mocks', title: 'Last two adaptive mocks both in the "above" band',
      met: mocks.length === 2 && mocks.every((s) => s.mockReport?.band === 'above'),
      evidence: mocks.length ? mockEvidence : ['No adaptive mocks taken yet.']
    });
  } else {
    const correct = mocks.reduce((a, s) => a + s.correct, 0);
    const total = mocks.reduce((a, s) => a + s.presented, 0);
    out.push({
      id: 'mocks', title: `${g.mockAccuracy}% or more across the last two adaptive mocks`,
      met: mocks.length === 2 && pct(correct, total) >= g.mockAccuracy,
      evidence: mocks.length ? [...mockEvidence, `Combined: ${pct(correct, total)}%.`] : ['No adaptive mocks taken yet.'],
      note: 'An adaptive test raises difficulty until you miss about half, so mock accuracy usually sits between 50% and 60% even for strong candidates. The "band" option in Settings measures readiness instead of raw accuracy.'
    });
  }

  // 2. No domain below the minimum (recent answers, enough data in every domain)
  const domainEvidence = [];
  let allDomains = true;
  for (let n = 1; n <= 8; n++) {
    const recent = state.answers.filter((a) => a.domain === n).slice(-g.domainWindow);
    const r = rate(recent);
    if (!r.enough) { allDomains = false; domainEvidence.push(`Domain ${n}: not enough data (${r.n}/${MIN_SAMPLE} answers).`); }
    else if (r.accuracy < g.domainMin) { allDomains = false; domainEvidence.push(`Domain ${n}: ${r.accuracy}% over the last ${r.n}.`); }
  }
  out.push({
    id: 'domains', title: `No domain below ${g.domainMin}%`,
    met: allDomains,
    evidence: allDomains ? [`All eight domains at ${g.domainMin}% or more over their last ${g.domainWindow} answers.`] : domainEvidence
  });

  // 3. No concept (objective) missed more than N times since its last reteach
  const objectives = [...new Set(state.ledger.filter((e) => e.kind === 'wrong').map((e) => e.objective))];
  const offenders = objectives
    .map((o) => ({ o, misses: missesSinceReteach(state.ledger, state.reteach, o) }))
    .filter((x) => x.misses > g.conceptMaxMisses)
    .sort((a, b) => b.misses - a.misses);
  out.push({
    id: 'concepts', title: `No concept missed more than ${g.conceptMaxMisses === 2 ? 'twice' : `${g.conceptMaxMisses} times`}`,
    met: state.answers.length > 0 && offenders.length === 0,
    evidence: !state.answers.length ? ['No questions answered yet.']
      : offenders.length ? offenders.map((x) => `${x.o}: ${x.misses} misses since its last reteach.`)
        : ['No objective has more than the allowed misses since its last reteach.']
  });

  // 4. Consecutive weeks with enough study days (the current week counts once it qualifies)
  const weeks = studyWeeks(state.studyDays, today, g.weeks + 1);
  const qualifying = (w) => w.days >= g.daysPerWeek;
  const lastFull = weeks.slice(0, -1);
  const current = weeks[weeks.length - 1];
  const window = qualifying(current) ? weeks.slice(-g.weeks) : lastFull.slice(-g.weeks);
  out.push({
    id: 'consistency', title: `${g.weeks} consecutive weeks of at least ${g.daysPerWeek} study days`,
    met: window.length === g.weeks && window.every(qualifying),
    evidence: weeks.map((w) => `Week of ${formatDate(w.start)}${w.current ? ' (this week)' : ''}: ${w.days} day${w.days === 1 ? '' : 's'}.`)
  });

  return out;
}

export function daysSince(iso, today) {
  return iso ? daysBetween(iso.slice(0, 10), today) : null;
}
