// Comparison drills: revise a set of easily confused terms, then pick the term that fits
// each scenario. Prompts are shuffled each run; the best and last scores are kept.
import { h } from '../ui.js';
import { mulberry32, newSeed, shuffle } from '../engine/rng.js';

function renderList(ctx) {
  const { store, data } = ctx;
  const results = store.get().drills;
  const byDomain = [...new Set(data.drills.drills.map((d) => d.domain))].sort();
  return h('section', {},
    h('a', { href: '#/study', class: 'back small' }, '‹ Study'),
    h('h2', {}, 'Comparison drills'),
    h('p', { class: 'small muted' }, 'Each drill revises a set of terms, then gives short scenarios: pick the term that fits. Aim for full marks twice in a row.'),
    ...byDomain.flatMap((n) => [
      h('h3', {}, `Domain ${n}`),
      ...data.drills.drills.filter((d) => d.domain === n).map((d) => {
        const r = results[d.id];
        return h('a', { class: 'card nav-card', href: `#/drills/${d.id}`, 'data-drill': d.id },
          h('div', { class: 'row' },
            h('div', { class: 'grow' }, h('h3', {}, d.title), h('p', { class: 'small muted' }, `${d.items.length} terms · ${d.prompts.length} scenarios · objective ${d.objective}`)),
            h('span', { class: 'weight' }, r ? `${r.best}/${d.prompts.length}` : 'New')));
      })
    ]));
}

function runDrill(ctx, drill) {
  const { store } = ctx;
  const root = h('section', { class: 'drill', 'data-drill-run': drill.id });
  const prompts = shuffle(drill.prompts, mulberry32(newSeed()));
  let i = 0;
  let score = 0;

  const revise = h('details', { class: 'card', open: true },
    h('summary', { class: 'strong' }, 'Revise the set'),
    h('dl', { class: 'meta small' }, ...drill.items.flatMap((it) => [h('dt', {}, it.name), h('dd', {}, it.meaning)])));

  const paint = () => {
    if (i >= prompts.length) {
      store.update((st) => {
        const prev = st.drills[drill.id];
        st.drills[drill.id] = { last: score, best: Math.max(score, prev?.best || 0), at: new Date().toISOString(), runs: (prev?.runs || 0) + 1 };
      });
      root.replaceChildren(
        h('a', { href: '#/drills', class: 'back small' }, '‹ All drills'),
        h('h2', {}, drill.title),
        h('div', { class: 'card' },
          h('p', { class: 'strong', id: 'drill-score' }, `${score} of ${prompts.length} right`),
          h('p', { class: 'small muted' }, score === prompts.length ? 'Full marks. Run it again another day to make it stick.' : 'Revise the set above and run it again; the scenarios come in a new order.')),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => root.replaceWith(runDrill(ctx, drill)) }, 'Run again'),
          h('a', { class: 'btn', href: '#/drills' }, 'All drills')));
      return;
    }
    const p = prompts[i];
    const feedback = h('div', { class: 'drill-feedback', 'aria-live': 'polite' });
    const next = h('button', { class: 'btn primary', type: 'button', id: 'drill-next', hidden: true, onclick: () => { i++; paint(); } },
      i + 1 < prompts.length ? 'Next scenario' : 'See score');
    const choices = drill.items.map((it) => h('button', {
      class: 'btn choice-btn', type: 'button', 'data-choice': it.name,
      onclick: () => {
        const right = it.name === p.answer;
        if (right) score++;
        choices.forEach((b) => {
          b.disabled = true;
          if (b.dataset.choice === p.answer) b.classList.add('right');
          else if (b === choices.find((x) => x.dataset.choice === it.name)) b.classList.add('wrong');
        });
        feedback.replaceChildren(h('p', { class: `verdict ${right ? 'ok' : 'bad'}` }, right ? 'Right' : `Not quite: ${p.answer}`), h('p', { class: 'small' }, p.why));
        next.hidden = false;
      }
    }, it.name));
    root.replaceChildren(
      h('a', { href: '#/drills', class: 'back small' }, '‹ All drills'),
      h('h2', {}, drill.title),
      revise,
      h('p', { class: 'small muted' }, `Scenario ${i + 1} of ${prompts.length}`),
      h('div', { class: 'card' }, h('p', { class: 'stem', id: 'drill-prompt' }, p.text)),
      h('div', { class: 'choice-grid' }, ...choices),
      feedback,
      h('div', { class: 'btn-row' }, next));
    revise.open = i === 0;
  };
  paint();
  return root;
}

export function renderDrills(ctx, params = []) {
  if (!ctx.data.drills) return h('section', {}, h('h2', {}, 'Comparison drills'), h('div', { class: 'card' }, 'Drills could not be loaded.'));
  const drill = ctx.data.drills.drills.find((d) => d.id === params[0]);
  return drill ? runDrill(ctx, drill) : renderList(ctx);
}
