// Study: the eight domains for the outline your target date falls under, then each
// domain's objectives with their lesson, topics, links to questions and cards, and what
// the 2027 outline changes. Also the entry points to cards, comparison drills and labs.
import { h } from '../ui.js';
import { activeOutline, domainsFor, formatWeight } from '../domains.js';
import { cardsQueue } from './cards.js';
import { bankFor, launch } from './questions.js';
import { buildPractice } from '../engine/bank.js';
import { mulberry32, newSeed } from '../engine/rng.js';

function changeList(title, items, sign) {
  if (!items.length) return null;
  return h('div', {}, h('p', { class: 'small change-head' }, title),
    h('ul', { class: 'topics small' }, ...items.map((t) => h('li', { class: `chg ${sign === '+' ? 'add' : 'drop'}` }, h('span', { 'aria-hidden': 'true' }, sign), ' ', t))));
}

const navCard = (id, href, title, text, badge) => h('a', { class: 'card nav-card', href, id },
  h('div', { class: 'row' },
    h('div', { class: 'grow' }, h('h3', {}, title), h('p', { class: 'small muted' }, text)),
    badge != null ? h('span', { class: 'weight' }, badge) : null));

function renderList(ctx, domains, outline) {
  const { data } = ctx;
  return h('section', {},
    h('h2', {}, 'Study'),
    navCard('cards-link', '#/cards', 'Flashcards', 'Key terms, exam traps and memory hooks, spaced for recall.', `${cardsQueue(ctx).queue.cards.length} due`),
    navCard('drills-link', '#/drills', 'Comparison drills', 'The pairs and sets CISSP likes to blur. Pick the term that fits each scenario.', data.drills ? `${data.drills.drills.length}` : null),
    navCard('labs-link', '#/labs', 'Labs', 'Hands-on exercises, day by day. Test environments only.', data.labs ? `${data.labs.labs.length}` : null),
    h('p', { class: 'small muted' }, `Showing the ${outline.id} outline, which applies to your target date. Weights are ISC2's average exam weights.`),
    ...domains.map((d) => h('a', { class: 'card domain-link', href: `#/study/${d.n}`, 'data-domain': d.n },
      h('div', { class: 'row' },
        h('span', { class: 'dnum' }, d.n),
        h('div', { class: 'grow' },
          h('h3', {}, d.name),
          h('p', { class: 'small muted' },
            `${d.objectives.length} objectives`,
            d.changeCount ? ` · ${d.changeCount} outline change${d.changeCount === 1 ? '' : 's'}` : '')),
        h('span', { class: 'weight' }, formatWeight(d.weight))))));
}

function lessonBlock(lesson) {
  if (!lesson) return h('p', { class: 'small muted' }, 'Lesson not written yet: it arrives with this domain\'s content batch.');
  return h('details', { class: 'lesson-block' },
    h('summary', { class: 'strong' }, 'Lesson'),
    h('h4', {}, 'What the exam wants'),
    h('ol', { class: 'small' }, ...lesson.summary.map((s) => h('li', {}, s))),
    h('h4', {}, 'Key terms'),
    h('dl', { class: 'meta small' }, ...lesson.keyTerms.flatMap((k) => [h('dt', {}, k.term), h('dd', {}, k.meaning)])),
    h('h4', {}, 'Worked scenario'),
    h('p', { class: 'small' }, lesson.scenario.situation),
    h('p', { class: 'small strong' }, lesson.scenario.ask),
    h('details', { class: 'small' }, h('summary', {}, 'Show the answer'), h('p', {}, lesson.scenario.answer)));
}

function renderDomain(ctx, d, outline) {
  const { store, data } = ctx;
  const { questions } = bankFor(ctx);
  const cards = data.cards?.cards || [];
  const lessons = data.lessons?.lessons || {};
  const altNote = d.alt
    ? `${d.alt.outlineId} outline: ${formatWeight(d.alt.weight)}${d.alt.name !== d.name ? `, renamed "${d.alt.name}"` : ''}`
    : null;
  const addedHead = outline.id === '2024' ? 'Added in the 2027 outline' : 'New in this outline';
  const droppedHead = outline.id === '2024' ? 'Not in the 2027 outline' : 'Was in the 2024 outline';

  return h('section', {},
    h('a', { href: '#/study', class: 'back small' }, '‹ All domains'),
    h('h2', {}, `Domain ${d.n}: ${d.name}`),
    h('p', { class: 'small muted' }, `${formatWeight(d.weight)} of the exam (${outline.id} outline)`, altNote ? ` · ${altNote}` : ''),
    ...d.objectives.map((o) => {
      const qCount = questions.filter((q) => q.objective === o.id).length;
      const cCount = cards.filter((c) => c.objective === o.id).length;
      return h('div', { class: 'card objective', 'data-objective': o.id },
        h('h3', {}, h('span', { class: 'oid' }, o.id), ' ', o.label),
        lessonBlock(lessons[o.id]),
        o.topics.length
          ? h('details', { class: 'small topics-block' }, h('summary', {}, `Outline topics (${o.topics.length})`), h('ul', { class: 'topics' }, ...o.topics.map((t) => h('li', {}, t))))
          : h('p', { class: 'small muted' }, 'No sub-topics listed: the objective title is the scope.'),
        h('div', { class: 'btn-row' },
          h('button', {
            class: 'btn small-btn', type: 'button', disabled: !qCount, 'data-practise': o.id,
            onclick: () => { const seed = newSeed(); launch(store, { mode: 'practice', title: `Practice: ${o.id} ${o.label}`, seed, items: buildPractice(questions, { objective: o.id }, 0, mulberry32(seed)) }); }
          }, `Practise (${qCount})`),
          h('a', { class: `btn small-btn ${cCount ? '' : 'disabled'}`, href: cCount ? `#/cards/${o.id}` : '#', 'aria-disabled': cCount ? null : 'true' }, `Cards (${cCount})`)),
        o.changeCount
          ? h('details', { class: 'changes' },
            h('summary', { class: 'small' }, `Outline changes (${o.changeCount})`),
            o.changes.relabelled ? h('p', { class: 'small' }, 'Objective wording changes in the 2027 outline.') : null,
            changeList(addedHead, o.changes.added2027, '+'),
            changeList(droppedHead, o.changes.dropped2027, '−'))
          : null);
    }));
}

export function renderStudy(ctx, params = []) {
  const { store, data } = ctx;
  if (!data.outlines || !data.domains) {
    return h('section', {}, h('h2', {}, 'Study'), h('div', { class: 'card' }, 'Domain data could not be loaded. Connect once to download it.'));
  }
  const outline = activeOutline(data.outlines, store.get().settings.targetDate);
  const domains = domainsFor(data.domains, data.outlines, outline.id);
  const d = domains.find((x) => x.n === Number(params[0]));
  return d ? renderDomain(ctx, d, outline) : renderList(ctx, domains, outline);
}
