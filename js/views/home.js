// Today: the Next Study Plan. It always says what to do next, rebuilt from your current
// state each time, so a missed day re-plans instead of piling up.
import { h } from '../ui.js';
import { todayIn, formatDate } from '../outline.js';
import { activeOutline } from '../domains.js';
import { cardsQueue, } from './cards.js';
import { bankFor, launch } from './questions.js';
import { dueTodayCount } from '../engine/srs.js';
import { gates, streak } from '../engine/perf.js';
import { buildPlan } from '../engine/plan.js';
import { mulberry32, newSeed } from '../engine/rng.js';
import { buildPractice, buildWeakness, buildHard, buildMini, buildDiagnostic, buildTopicReview, MINI_SECONDS_EACH } from '../engine/bank.js';

const PHASES = [['learn', 'Learn'], ['drill', 'Drill'], ['simulate', 'Simulate']];

export function currentPlan(ctx) {
  const { store, data } = ctx;
  if (!data.outlines || !data.questions || !data.cards) return null;
  const st = store.get();
  const { outline, questions } = bankFor(ctx);
  return buildPlan(st, { weights: outline.domains, cards: data.cards.cards, questions }, todayIn(st.settings.timeZone));
}

export function startTask(ctx, task) {
  const { store } = ctx;
  if (task.action.type === 'route') { location.hash = task.action.to; return; }
  const { outline, questions } = bankFor(ctx);
  const st = store.get();
  const seed = newSeed();
  const rng = mulberry32(seed);
  const a = task.action;
  const base = { mode: a.mode, seed };
  if (a.mode === 'practice') launch(store, { ...base, items: buildPractice(questions, { domain: a.domain, minDifficulty: a.minDifficulty }, a.size, rng) });
  else if (a.mode === 'review') launch(store, { ...base, items: buildTopicReview(questions, cardsQueue(ctx).queue.topics, st.answers, rng) });
  else if (a.mode === 'weakness') launch(store, { ...base, items: buildWeakness(questions, st.answers, rng) });
  else if (a.mode === 'hard') launch(store, { ...base, items: buildHard(questions, 0, rng) });
  else if (a.mode === 'mini') {
    const items = buildMini(questions, outline.domains, rng);
    launch(store, { ...base, items, limitSec: items.length * MINI_SECONDS_EACH });
  } else if (a.mode === 'diagnostic') launch(store, { ...base, items: buildDiagnostic(questions, outline.domains, rng) });
}

function taskRow(ctx, t) {
  return h('li', { class: `task ${t.done ? 'done' : ''}`, 'data-task': t.id },
    h('span', { class: 'tick', 'aria-hidden': 'true' }, t.done ? '✓' : '○'),
    h('div', { class: 'grow' },
      h('p', { class: 'task-title' }, t.title, t.optional ? h('span', { class: 'small muted' }, ' (optional)') : null,
        h('span', { class: 'sr-only' }, t.done ? ' (done)' : '')),
      h('p', { class: 'small muted' }, `${t.detail} About ${t.minutes} min.`)),
    t.done ? null : h('button', { class: 'btn small-btn', type: 'button', onclick: () => startTask(ctx, t) }, 'Start'));
}

export function renderHome(ctx) {
  const { store, data } = ctx;
  const st = store.get();
  const s = st.settings;
  const today = todayIn(s.timeZone);
  const plan = currentPlan(ctx);
  if (!plan) return h('section', {}, h('h2', {}, 'Today'), h('div', { class: 'card' }, 'Study data could not be loaded. Connect once to download it.'));
  if (plan.fresh) store.update((x) => { x.plan = { date: today, picks: plan.picks, withBaseline: Boolean(x.baseline) }; });

  const { info } = plan;
  const outline = activeOutline(data.outlines, s.targetDate);
  const { queue } = cardsQueue(ctx);
  const gs = gates(st, today);
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: s.timeZone }).format(new Date());

  return h('section', { class: 'today' },
    h('h2', {}, 'Today'),
    h('p', { class: 'small muted', id: 'today-line' },
      `${weekday} · ${info.phase === 'after' ? 'Target date passed' : `${PHASES.find((p) => p[0] === info.phase)[1]} phase`} · ${info.daysLeft >= 0 ? `${info.weeksLeft} weeks to ${formatDate(s.targetDate)}` : `target was ${formatDate(s.targetDate)}`} (${s.examBooked ? 'booked' : 'not booked'}, ${outline.id} outline)`),

    plan.next
      ? h('div', { class: 'card next', id: 'do-next' },
        h('p', { class: 'small strong next-label' }, 'Do this next'),
        h('h3', {}, plan.next.title),
        h('p', { class: 'small' }, `${plan.next.detail} About ${plan.next.minutes} min.`),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn primary', type: 'button', id: 'do-next-btn', onclick: () => startTask(ctx, plan.next) }, 'Start now'),
          plan.next.link ? h('a', { class: 'btn', href: plan.next.link }, 'Read the domain first') : null))
      : h('div', { class: 'card next', id: 'do-next' },
        h('h3', {}, 'All three blocks done'),
        h('p', { class: 'small' }, 'That is today covered. Rest, or browse the flashcards if you want more.')),

    h('div', { class: 'card' },
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', { id: 'weeks-left' }, info.weeksLeft), h('span', {}, 'weeks left')),
        h('div', { class: 'stat' }, h('b', { id: 'due-today' }, dueTodayCount(queue)), h('span', {}, 'due today')),
        h('div', { class: 'stat' }, h('b', { id: 'streak' }, streak(st.studyDays, today)), h('span', {}, 'day streak')))),

    ...plan.blocks.map((b) => h('div', { class: `card block-card ${b.done ? 'done' : ''}`, 'data-block': b.id },
      h('div', { class: 'block-head' },
        h('h3', {}, b.label),
        h('span', { class: 'small muted' }, `${b.time} · about ${b.minutes} min`),
        b.done ? h('span', { class: 'tag ok' }, 'Done') : null),
      h('ul', { class: 'tasks' }, ...b.tasks.map((t) => taskRow(ctx, t))))),

    plan.mock ? h('div', { class: 'card', id: 'mock-slot' },
      h('h3', {}, plan.mock.due ? 'Book a 3-hour slot for an adaptive mock this week' : 'Adaptive mock done this week'),
      h('p', { class: 'small muted' }, 'Mocks sit outside the daily blocks. A weekend morning works best.')) : null,

    info.atCheckpoint ? h('div', { class: 'card checkpoint', id: 'checkpoint' },
      h('h3', {}, 'Go / move checkpoint'),
      h('p', { class: 'small' }, `${gs.filter((g) => g.met).length} of 4 readiness gates met. If you are short, moving the exam is a sound decision, not a failure.`),
      h('p', { class: 'small muted' }, 'Moving past 14 April 2027 puts you on the new outline, so weigh a short move against learning the 2027 changes.'),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: '#/performance' }, 'See the gates'), h('a', { class: 'btn', href: '#/more' }, 'Change the date')))
      : null,

    h('div', { class: 'card', id: 'phases' },
      h('h3', {}, 'The road to the exam'),
      h('ol', { class: 'phase-line' },
        h('li', { class: info.phase === 'learn' ? 'current' : '' }, h('b', {}, 'Learn'), h('span', { class: 'small muted' }, ` until ${formatDate(info.learnEnd)}: all eight domains, weakest first`)),
        h('li', { class: info.phase === 'drill' ? 'current' : '' }, h('b', {}, 'Drill'), h('span', { class: 'small muted' }, ` until ${formatDate(info.drillEnd)}: weakness and hard mode, comparison cards`)),
        h('li', { class: info.phase === 'simulate' ? 'current' : '' }, h('b', {}, 'Simulate'), h('span', { class: 'small muted' }, ` to the exam: mini exams, weekly adaptive mock, review`))),
      h('p', { class: 'small muted' }, `Go / move checkpoint: ${formatDate(info.checkpoint)}. Weakest domain now: ${plan.priorities[0].n}. ${plan.priorities[0].name}${plan.priorities[0].accuracy == null ? ' (no data yet)' : ` (${plan.priorities[0].accuracy}%)`}.`)),

    h('a', { class: 'card nav-card', href: '#/performance', id: 'readiness-link' },
      h('div', { class: 'row' },
        h('div', { class: 'grow' }, h('h3', {}, 'Readiness'), h('p', { class: 'small muted' }, 'Four gates, each with its evidence.')),
        h('span', { class: 'weight' }, `${gs.filter((g) => g.met).length}/4`))),

    h('p', { class: 'small muted' }, 'Missed a day? Nothing carries over. The plan is rebuilt from where you are now.'));
}
