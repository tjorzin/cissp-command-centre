// Home: the Next Study Plan. Phase 5 adds the live "due today" count;
// the plan generator and baseline diagnostic arrive in phase 7.
import { h } from '../ui.js';
import { daysBetween, todayIn, outlineFor, formatDate } from '../outline.js';
import { cardsQueue } from './cards.js';
import { dueTodayCount } from '../engine/srs.js';

export function renderHome(ctx) {
  const { store, data } = ctx;
  const s = store.get().settings;
  const today = todayIn(s.timeZone);
  const days = daysBetween(today, s.targetDate);
  const weeks = Math.max(0, Math.floor(days / 7));
  const outline = data.outlines ? outlineFor(s.targetDate, data.outlines.outlines) : null;
  const { queue } = cardsQueue(ctx);
  const due = dueTodayCount(queue);

  return h('section', {},
    h('h2', {}, 'Today'),
    h('div', { class: 'card' },
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', { id: 'weeks-left' }, days >= 0 ? weeks : 0), h('span', {}, 'weeks left')),
        h('div', { class: 'stat' }, h('b', { id: 'due-today' }, due), h('span', {}, 'due today')),
        h('div', { class: 'stat' }, h('b', {}, '0'), h('span', {}, 'day streak'))),
      h('p', { class: 'small muted' },
        `Target: ${formatDate(s.targetDate)} (${s.examBooked ? 'booked' : 'not booked'})`,
        outline ? ` · ${outline.id} outline` : '')),
    due ? h('div', { class: 'card' },
      h('h3', {}, 'Reviews due'),
      h('p', { class: 'small' }, `${queue.cards.length} card${queue.cards.length === 1 ? '' : 's'} and ${queue.topics.length} topic${queue.topics.length === 1 ? '' : 's'}, within your daily cap of ${queue.cap}.`),
      h('div', { class: 'btn-row' },
        queue.cards.length ? h('a', { class: 'btn primary', href: '#/cards' }, 'Review cards') : null,
        queue.topics.length ? h('a', { class: 'btn', href: '#/questions' }, 'Review topics') : null)) : null,
    h('div', { class: 'card' },
      h('h3', {}, 'First step: baseline diagnostic'),
      h('p', {}, 'About 48 questions, 6 per domain, mixed difficulty. It sets your starting point so the plan targets your weakest domains first.'),
      h('p', { class: 'small muted' }, 'Arrives with the plan generator (phase 7).')),
    ...['Morning', 'Afternoon', 'Evening'].map((when, i) =>
      h('div', { class: 'card block' },
        h('div', { class: 'when' }, when, h('div', { class: 'small muted' }, s.reminders[i])),
        h('div', { class: 'muted' }, 'Plan block appears once the baseline is done.'))));
}
