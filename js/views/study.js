// Study: the eight domains for the outline your target date falls under, then
// each domain's objectives and topics, with what the 2027 outline changes.
import { h } from '../ui.js';
import { activeOutline, domainsFor, formatWeight } from '../domains.js';

function changeList(title, items, sign) {
  if (!items.length) return null;
  return h('div', {}, h('p', { class: 'small change-head' }, title),
    h('ul', { class: 'topics small' }, ...items.map((t) => h('li', { class: `chg ${sign === '+' ? 'add' : 'drop'}` }, h('span', { 'aria-hidden': 'true' }, sign), ' ', t))));
}

function renderList(domains, outline) {
  return h('section', {},
    h('h2', {}, 'Study'),
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

function renderDomain(d, outline) {
  const altNote = d.alt
    ? `${d.alt.outlineId} outline: ${formatWeight(d.alt.weight)}${d.alt.name !== d.name ? `, renamed "${d.alt.name}"` : ''}`
    : null;
  const addedHead = outline.id === '2024' ? 'Added in the 2027 outline' : 'New in this outline';
  const droppedHead = outline.id === '2024' ? 'Not in the 2027 outline' : 'Was in the 2024 outline';

  return h('section', {},
    h('a', { href: '#/study', class: 'back small' }, '‹ All domains'),
    h('h2', {}, `Domain ${d.n}: ${d.name}`),
    h('p', { class: 'small muted' }, `${formatWeight(d.weight)} of the exam (${outline.id} outline)`, altNote ? ` · ${altNote}` : ''),
    h('div', { class: 'card muted small' }, 'Lessons, key terms and worked scenarios for each objective arrive with the content batches (phase 8).'),
    ...d.objectives.map((o) => h('div', { class: 'card objective', 'data-objective': o.id },
      h('h3', {}, h('span', { class: 'oid' }, o.id), ' ', o.label),
      o.topics.length
        ? h('ul', { class: 'topics' }, ...o.topics.map((t) => h('li', {}, t)))
        : h('p', { class: 'small muted' }, 'No sub-topics listed: the objective title is the scope.'),
      o.changeCount
        ? h('details', { class: 'changes' },
          h('summary', { class: 'small' }, `Outline changes (${o.changeCount})`),
          o.changes.relabelled ? h('p', { class: 'small' }, 'Objective wording changes in the 2027 outline.') : null,
          changeList(addedHead, o.changes.added2027, '+'),
          changeList(droppedHead, o.changes.dropped2027, '−'))
        : null)));
}

export function renderStudy({ store, data }, params = []) {
  if (!data.outlines || !data.domains) {
    return h('section', {}, h('h2', {}, 'Study'), h('div', { class: 'card' }, 'Domain data could not be loaded. Connect once to download it.'));
  }
  const outline = activeOutline(data.outlines, store.get().settings.targetDate);
  const domains = domainsFor(data.domains, data.outlines, outline.id);
  const n = Number(params[0]);
  const d = domains.find((x) => x.n === n);
  return d ? renderDomain(d, outline) : renderList(domains, outline);
}
