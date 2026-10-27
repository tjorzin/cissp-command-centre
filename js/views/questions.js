// Questions hub: pick a mode. Every mode starts a session and opens #/session.
import { h, toast } from '../ui.js';
import { activeOutline } from '../domains.js';
import { mulberry32, newSeed } from '../engine/rng.js';
import {
  eligible, filterBank, buildPractice, buildHard, buildMini, buildScenario, buildWeakness,
  weakObjectives, present, MINI_SIZE, MINI_SECONDS_EACH
} from '../engine/bank.js';
import { cardsQueue } from './cards.js';
import { MOCK, mockReadiness } from '../engine/mock.js';
import { startSession } from '../engine/session.js';

export function bankFor({ store, data }) {
  const outline = activeOutline(data.outlines, store.get().settings.targetDate);
  return { outline, questions: eligible(data.questions.questions, outline.id), scenarios: data.questions.scenarios };
}

export function launch(store, opts) {
  const active = store.get().activeSession;
  if (active && !confirm(`You have an unfinished ${active.title}. Abandon it and start a new one?`)) return;
  if (opts.mode !== 'mock' && !opts.items.length) {
    toast('No questions match those filters yet.');
    return;
  }
  store.update((st) => startSession(st, opts));
  location.hash = '#/session';
}

const modeCard = (id, title, desc, ...body) =>
  h('div', { class: 'card mode', id: `mode-${id}` }, h('h3', {}, title), h('p', { class: 'small muted' }, desc), ...body);

export function renderQuestions(ctx) {
  const { store, data } = ctx;
  if (!data.questions || !data.outlines) {
    return h('section', {}, h('h2', {}, 'Questions'), h('div', { class: 'card' }, 'The question bank could not be loaded. Connect once to download it.'));
  }
  const { outline, questions, scenarios } = bankFor(ctx);
  const weights = outline.domains;
  const st = store.get();
  const seed = newSeed();
  const rng = mulberry32(seed);

  // Practice filters
  const domainSel = h('select', { id: 'practice-domain', 'aria-label': 'Domain' },
    h('option', { value: '' }, 'All domains'),
    ...weights.map((d) => h('option', { value: d.n }, `${d.n}. ${d.name}`)));
  const diffSel = h('select', { id: 'practice-difficulty', 'aria-label': 'Difficulty' },
    h('option', { value: '1-6' }, 'Any difficulty'),
    h('option', { value: '1-3' }, 'Levels 1 to 3: terms to application'),
    h('option', { value: '4-6' }, 'Levels 4 to 6: analysis to hard scenarios'));
  const sizeSel = h('select', { id: 'practice-size', 'aria-label': 'Number of questions' },
    ...[10, 20, 0].map((n) => h('option', { value: n }, n ? `${n} questions` : 'All matching')));

  const startPractice = () => {
    const [minDifficulty, maxDifficulty] = diffSel.value.split('-').map(Number);
    const filters = { domain: Number(domainSel.value) || null, minDifficulty, maxDifficulty };
    launch(store, { mode: 'practice', seed, items: buildPractice(questions, filters, Number(sizeSel.value), rng) });
  };

  // Due topics: one question per objective, the one answered least recently.
  const { queue } = cardsQueue(ctx);
  const lastAnswered = new Map(st.answers.map((a) => [a.qid, a.at]));
  const topicItems = queue.topics.map((obj) => questions
    .filter((q) => q.objective === obj)
    .sort((a, b) => (lastAnswered.get(a.id) || '').localeCompare(lastAnswered.get(b.id) || ''))[0])
    .filter(Boolean).map((q) => present(q, rng));

  const miniSize = Math.min(MINI_SIZE, questions.length);
  const readiness = mockReadiness(questions, weights);
  const weakCount = weakObjectives(st.answers).size;
  const hardCount = filterBank(questions, { minDifficulty: 5 }).length;

  return h('section', {},
    h('h2', {}, 'Questions'),
    h('p', { class: 'small muted' }, `${questions.length} questions in the bank for the ${outline.id} outline. All are original practice items, not real ISC2 questions.`),

    st.activeSession ? h('div', { class: 'card resume' },
      h('h3', {}, `Unfinished: ${st.activeSession.title}`),
      h('p', { class: 'small muted' }, `${st.activeSession.responses.length} answered so far.`),
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn primary', href: '#/session' }, 'Resume'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => { if (confirm('Abandon this session? Answers already given stay in your history.')) store.update((s) => { s.activeSession = null; }); location.reload(); }
        }, 'Abandon'))) : null,

    modeCard('review', 'Topic review', 'Spaced repetition by outline objective: one question for each objective due today.',
      topicItems.length
        ? h('div', { class: 'btn-row' }, h('button', {
          class: 'btn primary', type: 'button',
          onclick: () => launch(store, { mode: 'review', seed, items: topicItems })
        }, `Review ${topicItems.length} due topic${topicItems.length === 1 ? '' : 's'}`))
        : h('p', { class: 'small muted' }, 'No topics due today. Every question you answer schedules its objective for review.')),

    modeCard('practice', 'Practice set', 'Immediate feedback after each answer, with the reasoning for every option.',
      h('div', { class: 'filters' }, domainSel, diffSel, sizeSel),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', type: 'button', onclick: startPractice }, 'Start practice'))),

    modeCard('scenario', 'Scenario sets', 'Several questions on one case study, answered in order.',
      ...scenarios.map((sc) => h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn', type: 'button', 'data-scenario': sc.id,
          onclick: () => launch(store, { mode: 'scenario', title: sc.title, seed, items: buildScenario(questions, sc, rng) })
        }, `${sc.title} (${sc.questionIds.length})`)))),

    modeCard('mini', 'Mini exam', `${miniSize} questions, ${MINI_SECONDS_EACH} seconds each, mixed by exam weighting. Results at the end.`,
      miniSize < MINI_SIZE ? h('p', { class: 'small muted' }, `The bank has ${questions.length} questions, so this uses ${miniSize} until it reaches ${MINI_SIZE}.`) : null,
      h('div', { class: 'btn-row' }, h('button', {
        class: 'btn primary', type: 'button',
        onclick: () => {
          const items = buildMini(questions, weights, rng);
          launch(store, { mode: 'mini', seed, items, limitSec: items.length * MINI_SECONDS_EACH });
        }
      }, 'Start mini exam'))),

    modeCard('mock', 'Adaptive mock', `${MOCK.min} to ${MOCK.max} questions, 3 hours, difficulty adapting to your answers, no going back. A simulation, not ISC2's algorithm.`,
      readiness.ready
        ? h('div', { class: 'btn-row' }, h('button', {
          class: 'btn primary', type: 'button',
          onclick: () => launch(store, { mode: 'mock', seed, weights, limitSec: MOCK.minutes * 60 })
        }, 'Start adaptive mock'))
        : h('p', { class: 'small locked' }, `Unlocks when the bank holds ${readiness.needed} questions with enough in every domain (now ${readiness.total}). The full bank arrives in phase 8.`)),

    modeCard('weakness', 'Weakness drill', 'Every question you missed or guessed, plus the others on the same objectives, so you drill the idea and not the wording.',
      weakCount
        ? h('div', { class: 'btn-row' }, h('button', {
          class: 'btn primary', type: 'button',
          onclick: () => launch(store, { mode: 'weakness', seed, items: buildWeakness(questions, store.get().answers, rng) })
        }, `Drill ${weakCount} weak objective${weakCount === 1 ? '' : 's'}`))
        : h('p', { class: 'small muted' }, 'Nothing to drill yet. Misses and lucky guesses appear here.')),

    modeCard('hard', 'Hard mode', 'Levels 5 and 6 only: complex scenarios with several plausible answers.',
      h('div', { class: 'btn-row' }, h('button', {
        class: 'btn primary', type: 'button', disabled: hardCount === 0,
        onclick: () => launch(store, { mode: 'hard', seed, items: buildHard(questions, 0, rng) })
      }, `Start (${hardCount} questions)`))));
}
