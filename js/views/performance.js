// Performance: readiness gates first (met / not met, with the evidence), then domains,
// difficulty and calibration. Below MIN_SAMPLE answers a figure says "not enough data".
import { h } from '../ui.js';
import { todayIn, formatDate } from '../outline.js';
import { activeOutline } from '../domains.js';
import { domainStats, difficultyStats, calibration, gates, daysSince, MIN_SAMPLE, TREND_SESSIONS } from '../engine/perf.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
};

const notEnough = (n) => h('span', { class: 'muted small not-enough' }, `Not enough data (${n}/${MIN_SAMPLE})`);

// Accuracy bar: single series, value printed beside the mark, native tooltip on hover.
function barRow(label, r, id) {
  return h('div', { class: 'bar-row perf-bar', 'data-row': id, title: r.n ? `${label}: ${r.correct}/${r.n} correct` : `${label}: no answers` },
    h('span', { class: 'bar-label' }, label),
    r.enough
      ? h('span', { class: 'bar' }, h('span', { class: 'fill', style: `width:${r.accuracy}%` }))
      : h('span', {}),
    r.enough ? h('span', { class: 'bar-n' }, `${r.accuracy}%`) : notEnough(r.n));
}

// Trend over the last sessions: a 2px line with 8px markers, first and last values labelled.
function sparkline(trend) {
  if (trend.length < 2) return h('span', { class: 'small muted' }, trend.length ? `${trend[0].accuracy}% (1 session)` : 'No sessions yet');
  const w = 110, hgt = 40, pad = 6;
  const x = (i) => pad + (i * (w - 2 * pad)) / (trend.length - 1);
  const y = (v) => hgt - pad - (v / 100) * (hgt - 2 * pad);
  const pts = trend.map((t, i) => `${x(i)},${y(t.accuracy)}`).join(' ');
  return h('span', { class: 'spark-wrap' },
    svg('svg', { viewBox: `0 0 ${w} ${hgt}`, width: w, height: hgt, class: 'spark', role: 'img',
      'aria-label': `Accuracy over the last ${trend.length} sessions: ${trend.map((t) => `${t.accuracy}%`).join(', ')}` },
    svg('line', { x1: pad, x2: w - pad, y1: y(0), y2: y(0), class: 'spark-base' }),
    svg('polyline', { points: pts, class: 'spark-line' }),
    ...trend.map((t, i) => svg('circle', { cx: x(i), cy: y(t.accuracy), r: 4, class: 'spark-dot' },
      svg('title', {}, `${t.at.slice(0, 10)}: ${t.accuracy}% of ${t.asked}`)))),
    h('span', { class: 'small muted spark-label' }, `${trend[0].accuracy}% → ${trend[trend.length - 1].accuracy}%`));
}

function gateCard(g) {
  return h('div', { class: `card gate ${g.met ? 'met' : 'unmet'}`, 'data-gate': g.id },
    h('div', { class: 'row' },
      h('span', { class: 'gate-icon', 'aria-hidden': 'true' }, g.met ? '✓' : '✗'),
      h('div', { class: 'grow' },
        h('h3', {}, g.title),
        h('p', { class: 'small strong gate-state' }, g.met ? 'Met' : 'Not met'))),
    h('ul', { class: 'small evidence' }, ...g.evidence.map((e) => h('li', {}, e))),
    g.note ? h('p', { class: 'small muted' }, g.note) : null);
}

export function renderPerformance(ctx) {
  const { store, data } = ctx;
  const st = store.get();
  const today = todayIn(st.settings.timeZone);
  const outline = data.outlines ? activeOutline(data.outlines, st.settings.targetDate) : null;
  const names = Object.fromEntries((outline?.domains || []).map((d) => [d.n, d.name]));
  const gs = gates(st, today);
  const met = gs.filter((g) => g.met).length;
  const cal = calibration(st);
  const sureCal = cal.find((c) => c.confidence === 'sure');

  return h('section', { class: 'performance' },
    h('h2', {}, 'Performance'),

    h('h3', {}, 'Readiness gates'),
    h('p', { class: 'small muted', id: 'gates-summary' }, `${met} of ${gs.length} gates met. Each gate is shown with its evidence; there is no overall pass prediction. Thresholds are in Settings.`),
    ...gs.map(gateCard),

    h('h3', {}, 'By domain'),
    h('p', { class: 'small muted' }, `Figures appear once a domain has ${MIN_SAMPLE} answers. Trend covers the last ${TREND_SESSIONS} sessions that included the domain.`),
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
      const d = domainStats(st, n);
      const since = daysSince(d.lastRevised, today);
      return h('div', { class: 'card domain-perf', 'data-domain-perf': n },
        h('h3', {}, `${n}. ${names[n] || ''}`),
        h('dl', { class: 'perf-grid small' },
          h('dt', {}, 'Accuracy'), h('dd', { class: 'acc' }, d.enough ? `${d.accuracy}% of ${d.n}` : notEnough(d.n)),
          h('dt', {}, 'When sure'), h('dd', {}, d.sure.enough ? `${d.sure.accuracy}% of ${d.sure.n}` : notEnough(d.sure.n)),
          h('dt', {}, 'Avg time'), h('dd', {}, d.avgSecs == null ? '–' : `${d.avgSecs} s per question`),
          h('dt', {}, 'Last revised'), h('dd', {}, d.lastRevised ? `${formatDate(d.lastRevised.slice(0, 10))}${since ? ` (${since} day${since === 1 ? '' : 's'} ago)` : ' (today)'}` : 'Never'),
          h('dt', {}, 'Trend'), h('dd', {}, sparkline(d.trend))));
    }),

    h('h3', {}, 'By difficulty'),
    h('div', { class: 'card bars small', id: 'by-difficulty' },
      ...difficultyStats(st).map((r) => barRow(`Level ${r.level}`, r, `level-${r.level}`))),

    h('h3', {}, 'Calibration'),
    h('div', { class: 'card', id: 'calibration' },
      h('p', { class: 'small' }, 'How often you are right at each confidence. Well calibrated looks like: "guess" well below "unsure", and "sure" right nearly every time.'),
      h('div', { class: 'bars small' }, ...cal.map((c) => barRow(c.confidence[0].toUpperCase() + c.confidence.slice(1), c, `cal-${c.confidence}`))),
      sureCal.enough && sureCal.accuracy < 85
        ? h('p', { class: 'small strong', id: 'overconfident' }, `When you say "sure" you are right ${sureCal.accuracy}% of the time. Treat those misses as misconceptions: they are in the Ledger first.`)
        : null,
      h('details', { class: 'small' },
        h('summary', {}, 'Table view'),
        h('table', { class: 'domain-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Confidence'), h('th', {}, 'Answers'), h('th', {}, 'Correct'), h('th', {}, '%'))),
          h('tbody', {}, ...cal.map((c) => h('tr', {}, h('td', {}, c.confidence), h('td', {}, c.n), h('td', {}, c.correct), h('td', {}, c.accuracy == null ? '–' : `${c.accuracy}%`))))))));
}
