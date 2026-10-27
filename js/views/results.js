// Results for a finished session: score, domain breakdown, mock band, and full review.
import { h } from '../ui.js';
import { renderReview } from './review.js';
import { MOCK } from '../engine/mock.js';
import { activeOutline } from '../domains.js';
import { entryId } from '../engine/ledger.js';
import { errorClassPicker } from './ledger.js';

const BAND_TEXT = {
  above: 'Above the band: you sustained the hardest levels in the final stretch.',
  borderline: 'Borderline: your recent difficulty sat in the middle. More drilling needed.',
  below: 'Below the band: you settled at the easier levels. Return to weakness drills.'
};

const pct = (c, n) => (n ? `${Math.round((c / n) * 100)}%` : '–');

export function renderResults({ store, data }, params = []) {
  const st = store.get();
  const s = st.sessions.find((x) => x.id === params[0]) || st.sessions[st.sessions.length - 1];
  if (!s || !data.questions) {
    return h('section', {}, h('h2', {}, 'Results'), h('div', { class: 'card' }, 'No finished sessions yet.'));
  }
  const all = data.questions.questions;
  const outline = data.outlines ? activeOutline(data.outlines, st.settings.targetDate) : null;
  const names = Object.fromEntries((outline?.domains || []).map((d) => [d.n, d.name]));
  const unanswered = s.presented - s.answered;

  return h('section', { class: 'results' },
    h('h2', {}, `${s.title}: results`),
    h('div', { class: 'card' },
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', { id: 'score' }, `${s.correct}/${s.presented}`), h('span', {}, 'correct')),
        h('div', { class: 'stat' }, h('b', {}, pct(s.correct, s.presented)), h('span', {}, 'accuracy')),
        h('div', { class: 'stat' }, h('b', {}, unanswered), h('span', {}, 'unanswered'))),
      s.presented < 20 ? h('p', { class: 'small muted' }, 'Small sample: treat the percentage as a signal, not a measure.') : null),

    s.mockReport ? h('div', { class: 'card', id: 'mock-band' },
      h('h3', {}, `Band: ${s.mockReport.band}`),
      h('p', {}, BAND_TEXT[s.mockReport.band]),
      h('p', { class: 'small muted' },
        `Average difficulty of your last ${MOCK.window} questions: ${s.mockReport.recentLevel} (above ≥ ${MOCK.high}, below ≤ ${MOCK.low}). ` +
        'This is a staircase simulation, not ISC2\'s adaptive algorithm, and it gives no score out of 1000 or pass probability.')) : null,

    h('div', { class: 'card' },
      h('h3', {}, 'By domain'),
      h('table', { class: 'small domain-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Domain'), h('th', {}, 'Correct'), h('th', {}, '%'))),
        h('tbody', {}, ...Object.entries(s.byDomain).sort((a, b) => a[0] - b[0]).map(([n, d]) =>
          h('tr', {}, h('td', {}, `${n}. ${names[n] || ''}`), h('td', {}, `${d.correct}/${d.asked}`), h('td', {}, pct(d.correct, d.asked))))))),

    h('h3', {}, 'Review'),
    ...s.items.map((item, i) => {
      const q = all.find((x) => x.id === item.id);
      const r = s.responses.find((x) => x.id === item.id);
      const mark = !r ? '–' : r.correct ? '✓' : '✗';
      return h('details', { class: 'card review-item' },
        h('summary', {}, h('span', { class: `mark ${r?.correct ? 'ok' : 'bad'}` }, mark), ` Q${i + 1} · ${q.subtopic}`,
          r ? h('span', { class: 'small muted' }, ` · ${r.confidence}`) : null),
        h('p', { class: 'stem' }, q.stem),
        renderReview(q, item, r ? r.selected : []),
        r ? errorClassPicker(store, entryId(s.id, q.id)) : null);
    }),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn primary', href: '#/questions' }, 'Back to questions')));
}
