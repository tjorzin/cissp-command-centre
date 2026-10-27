// Flashcards: today's spaced-repetition queue, filters, and a flip-and-rate review.
import { h } from '../ui.js';
import { todayIn, formatDate } from '../outline.js';
import { todayQueue, review, cardKey, recentObjectives, INTERVALS } from '../engine/srs.js';

const RATINGS = [['wrong', 'Missed it'], ['guess', 'Guessed'], ['right', 'Knew it']];
const FILTERS = [['due', 'Due today'], ['newly', 'Newly covered'], ['errors', 'From my errors'], ['all', 'All']];

export function cardsQueue({ store, data }) {
  const st = store.get();
  const today = todayIn(st.settings.timeZone);
  return { today, queue: todayQueue(st, data.cards?.cards || [], today) };
}

function filterCards(st, cards, filter, domain, queue, today, objective = null) {
  let list = cards;
  if (filter === 'due') {
    list = queue.cards.map((id) => cards.find((c) => c.id === id)).filter(Boolean);
  } else if (filter === 'newly') {
    const recent = recentObjectives(st.answers, today);
    list = cards.filter((c) => recent.has(c.objective) && !st.srs[cardKey(c.id)]);
  } else if (filter === 'errors') {
    const missed = new Set(st.ledger.map((e) => e.objective));
    list = cards.filter((c) => missed.has(c.objective));
  }
  if (objective) list = list.filter((c) => c.objective === objective);
  return domain ? list.filter((c) => c.domain === domain) : list;
}

function runDeck(ctx, root, list, back) {
  const { store } = ctx;
  let i = 0;
  const tally = { wrong: 0, guess: 0, right: 0 };
  const paint = () => {
    if (i >= list.length) {
      root.replaceChildren(h('section', { class: 'deck-done' },
        h('h2', {}, 'Cards done'),
        h('div', { class: 'card' }, h('p', { id: 'deck-tally' }, `Knew ${tally.right} · Guessed ${tally.guess} · Missed ${tally.wrong}`),
          h('p', { class: 'small muted' }, 'Missed cards come back tomorrow. Guesses earn half a step; known cards space out to 3, 7, 14, 30 and 60 days.')),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', type: 'button', onclick: back }, 'Back to cards'))));
      return;
    }
    const c = list[i];
    const answer = h('div', { class: 'card-back', hidden: true },
      h('p', {}, c.meaning),
      h('p', { class: 'small' }, h('b', {}, 'Exam trap: '), c.trap),
      h('p', { class: 'small hook' }, h('b', {}, 'Hook: '), c.hook));
    const rate = h('div', { class: 'conf-row', hidden: true, role: 'group', 'aria-label': 'How well did you know it?' },
      ...RATINGS.map(([outcome, label]) => h('button', {
        type: 'button', class: `btn rate ${outcome}`, 'data-rate': outcome,
        onclick: () => {
          const today = todayIn(store.get().settings.timeZone);
          store.update((st) => review(st, cardKey(c.id), outcome, today, { isNew: !st.srs[cardKey(c.id)] }));
          tally[outcome]++;
          i++;
          paint();
        }
      }, label)));
    const show = h('button', {
      class: 'btn primary', type: 'button', id: 'flip',
      onclick: () => { answer.hidden = false; rate.hidden = false; show.hidden = true; }
    }, 'Show answer');
    root.replaceChildren(h('section', { class: 'deck' },
      h('p', { class: 'small muted' }, `Card ${i + 1} of ${list.length} · Domain ${c.domain} · ${c.objective}`),
      h('div', { class: 'card flash', 'data-card': c.id }, h('h2', { class: 'term' }, c.term), answer),
      h('div', { class: 'btn-row sticky-actions' }, show),
      rate));
  };
  paint();
}

export function renderCards(ctx, params = []) {
  const objective = params[0] || null; // #/cards/1.9 opens one objective's cards
  const { store, data } = ctx;
  const root = h('div', {});
  if (!data.cards) {
    root.append(h('h2', {}, 'Cards'), h('div', { class: 'card' }, 'Cards could not be loaded. Connect once to download them.'));
    return root;
  }
  const cards = data.cards.cards;

  const home = () => {
    const st = store.get();
    const { today, queue } = cardsQueue(ctx);
    let filter = objective ? 'all' : queue.cards.length ? 'due' : 'all';
    let domain = 0;
    const list = h('div', { id: 'card-list' });
    const studyBtn = h('button', { class: 'btn', type: 'button', id: 'study-filtered' }, 'Study these');

    const paintList = () => {
      const shown = filterCards(st, cards, filter, domain, queue, today, objective);
      studyBtn.disabled = !shown.length;
      studyBtn.textContent = `Study these (${shown.length})`;
      studyBtn.onclick = () => runDeck(ctx, root, shown, home);
      list.replaceChildren(...(shown.length ? shown.map((c) => {
        const s = st.srs[cardKey(c.id)];
        return h('details', { class: 'card', 'data-card-row': c.id },
          h('summary', {}, h('b', {}, c.term), h('span', { class: 'small muted' }, ` · ${c.objective}`,
            s ? ` · box ${s.box}, due ${s.due}` : ' · new')),
          h('p', { class: 'small' }, c.meaning),
          h('p', { class: 'small' }, h('b', {}, 'Exam trap: '), c.trap),
          h('p', { class: 'small hook' }, h('b', {}, 'Hook: '), c.hook));
      }) : [h('p', { class: 'small muted' }, 'No cards match.')]));
    };
    const chips = FILTERS.map(([v, label]) => h('button', {
      type: 'button', class: 'chip', 'data-filter': v, 'aria-pressed': String(v === filter),
      onclick: () => { filter = v; chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === v))); paintList(); }
    }, label));
    const domainSel = h('select', {
      'aria-label': 'Domain', id: 'card-domain',
      onchange: (e) => { domain = Number(e.target.value); paintList(); }
    }, h('option', { value: 0 }, 'All domains'), ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => h('option', { value: n }, `Domain ${n}`)));

    const nextDue = Object.entries(st.srs).filter(([k]) => k.startsWith('card:')).map(([, v]) => v.due).sort()[0];
    root.replaceChildren(h('section', {},
      h('a', { href: '#/study', class: 'back small' }, '‹ Study'),
      h('h2', {}, objective ? `Cards: objective ${objective}` : 'Cards'),
      objective ? h('p', { class: 'small' }, h('a', { href: '#/cards' }, 'Show all cards')) : null,
      h('div', { class: 'card' },
        h('div', { class: 'stat-row' },
          h('div', { class: 'stat' }, h('b', { id: 'cards-due' }, queue.cards.length), h('span', {}, 'due today')),
          h('div', { class: 'stat' }, h('b', { id: 'reviews-done' }, `${queue.done}/${queue.cap}`), h('span', {}, 'reviews today')),
          h('div', { class: 'stat' }, h('b', {}, cards.length), h('span', {}, 'in deck'))),
        queue.held ? h('p', { class: 'small muted', id: 'held' }, `${queue.held} more due items are held back by your daily cap of ${queue.cap}, so the backlog never becomes a wall. They stay first in line.`) : null,
        queue.cards.length
          ? h('div', { class: 'btn-row' }, h('button', {
            class: 'btn primary', type: 'button', id: 'review-due',
            onclick: () => runDeck(ctx, root, queue.cards.map((id) => cards.find((c) => c.id === id)), home)
          }, `Review ${queue.cards.length} card${queue.cards.length === 1 ? '' : 's'}`))
          : h('p', { class: 'small muted' }, queue.done >= queue.cap ? 'Daily cap reached. Well done.' : nextDue ? `Nothing due. Next card due ${formatDate(nextDue)}.` : 'Nothing due.'),
        h('p', { class: 'small muted' }, `Intervals: ${INTERVALS.slice(1).join(', ')} days. A miss resets to tomorrow; a guess earns half a step.`)),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter cards' }, ...chips),
      h('div', { class: 'filters' }, domainSel),
      h('div', { class: 'btn-row' }, studyBtn),
      list));
    paintList();
  };
  home();
  return root;
}
