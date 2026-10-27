import { h } from '../ui.js';

export function renderPlaceholder(_ctx, title, note) {
  return h('section', {},
    h('h2', {}, title),
    h('div', { class: 'card' }, h('p', { class: 'muted' }, note)));
}
