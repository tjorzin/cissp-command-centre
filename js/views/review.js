// The review shown after an answer (feedback modes) and on results pages.
import { h } from '../ui.js';

export const LETTERS = 'ABCDEF';

export const MANAGER_CHECKS = [
  'Is this the first step or the best step?',
  'Does it protect life and safety first?',
  'Is it governance or technical?',
  'Is it cost-justified against the risk?'
];

export function managerChecklist() {
  return h('div', { class: 'checklist', 'aria-label': 'Think like a manager' },
    h('p', { class: 'small strong' }, 'Think like a manager'),
    h('ul', { class: 'small' }, ...MANAGER_CHECKS.map((c) => h('li', {}, c))));
}

export function renderReview(q, item, selected = []) {
  const correct = new Set(q.correct);
  const picked = new Set(selected);
  const right = selected.length === correct.size && selected.every((i) => correct.has(i));
  const answered = selected.length > 0;

  return h('div', { class: 'review' },
    h('p', { class: `verdict ${right ? 'ok' : 'bad'}`, role: 'status' },
      !answered ? 'Not answered' : right ? 'Correct' : q.type === 'multi' ? `Incorrect: all ${correct.size} correct options were needed` : 'Incorrect'),
    h('ol', { class: 'opts reviewed' }, ...item.order.map((orig, pos) => {
      const isKey = correct.has(orig);
      const isPick = picked.has(orig);
      return h('li', { class: `opt ${isKey ? 'key' : ''} ${isPick && !isKey ? 'wrong' : ''}`, 'data-key': isKey ? 'true' : 'false' },
        h('div', { class: 'opt-line' },
          h('span', { class: 'letter' }, LETTERS[pos]),
          h('span', { class: 'grow' }, q.options[orig])),
        h('div', { class: 'tags small' },
          isKey ? h('span', { class: 'tag ok' }, 'Correct answer') : null,
          isPick ? h('span', { class: 'tag' }, 'Your choice') : null),
        h('p', { class: 'small rationale' }, q.rationales[orig]));
    })),
    h('dl', { class: 'meta small' },
      h('dt', {}, 'Concept'), h('dd', {}, q.concept),
      h('dt', {}, 'The trap'), h('dd', {}, q.trap),
      h('dt', {}, 'Manager lens'), h('dd', {}, q.managerLens),
      h('dt', {}, 'In practice'), h('dd', {}, q.practicalNote),
      h('dt', {}, 'A miss here shows'), h('dd', {}, q.gap)),
    managerChecklist());
}
