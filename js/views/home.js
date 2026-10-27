// Home: the Next Study Plan. Phase 1 shows the countdown and plan frame;
// the plan generator and baseline diagnostic arrive in phase 7.
import { h } from '../ui.js';
import { daysBetween, todayIn, outlineFor, formatDate } from '../outline.js';

export function renderHome({ store, data }) {
  const s = store.get().settings;
  const today = todayIn(s.timeZone);
  const days = daysBetween(today, s.targetDate);
  const weeks = Math.max(0, Math.floor(days / 7));
  const outline = data.outlines ? outlineFor(s.targetDate, data.outlines.outlines) : null;

  return h('section', {},
    h('h2', {}, 'Today'),
    h('div', { class: 'card' },
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', { id: 'weeks-left' }, days >= 0 ? weeks : 0), h('span', {}, 'weeks left')),
        h('div', { class: 'stat' }, h('b', {}, '0'), h('span', {}, 'due today')),
        h('div', { class: 'stat' }, h('b', {}, '0'), h('span', {}, 'day streak'))),
      h('p', { class: 'small muted' },
        `Target: ${formatDate(s.targetDate)} (${s.examBooked ? 'booked' : 'not booked'})`,
        outline ? ` · ${outline.id} outline` : '')),
    h('div', { class: 'card' },
      h('h3', {}, 'First step: baseline diagnostic'),
      h('p', {}, 'About 48 questions, 6 per domain, mixed difficulty. It sets your starting point so the plan targets your weakest domains first.'),
      h('p', { class: 'small muted' }, 'Arrives with the question bank and plan generator (phases 3 and 7).')),
    ...['Morning', 'Afternoon', 'Evening'].map((when, i) =>
      h('div', { class: 'card block' },
        h('div', { class: 'when' }, when, h('div', { class: 'small muted' }, s.reminders[i])),
        h('div', { class: 'muted' }, 'Plan block appears once the baseline is done.'))));
}
