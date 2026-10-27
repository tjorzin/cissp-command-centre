// Labs: hands-on exercises, day by day, in test environments only. Step ticks and
// completion are saved so a lab can be done across sittings.
import { h } from '../ui.js';

const WARNING = 'LAB / TEST ENVIRONMENT. Never run lab steps on production systems or with real company data.';

// Text with `commands` in backticks: commands render as code blocks that wrap safely.
const withCode = (text) => text.split('`').map((part, i) => (i % 2 ? h('code', { class: 'cmd' }, part) : part));

function renderList(ctx) {
  const { store, data } = ctx;
  const progress = store.get().labs;
  const labs = [...data.labs.labs].sort((a, b) => a.day - b.day);
  return h('section', {},
    h('a', { href: '#/study', class: 'back small' }, '‹ Study'),
    h('h2', {}, 'Labs'),
    h('p', { class: 'lab-warning', role: 'note' }, WARNING),
    ...labs.map((lab) => {
      const p = progress[lab.id];
      const status = p?.completedAt ? 'Done' : p?.steps?.length ? `${p.steps.length}/${lab.steps.length}` : 'Not started';
      return h('a', { class: 'card nav-card', href: `#/labs/${lab.id}`, 'data-lab': lab.id },
        h('div', { class: 'row' },
          h('div', { class: 'grow' }, h('h3', {}, `Day ${lab.day}: ${lab.title}`), h('p', { class: 'small muted' }, `Domain ${lab.domain} · objective ${lab.objective} · about ${lab.minutes} min`)),
          h('span', { class: 'weight small' }, status)));
    }));
}

function renderLab(ctx, lab) {
  const { store } = ctx;
  const get = () => store.get().labs[lab.id] || { steps: [] };
  const done = h('button', { class: 'btn primary', type: 'button', id: 'lab-complete' });
  const refresh = () => {
    const p = get();
    const all = p.steps.length === lab.steps.length;
    done.disabled = !all || Boolean(p.completedAt);
    done.textContent = p.completedAt ? `Completed ${p.completedAt.slice(0, 10)}` : all ? 'Mark lab complete' : `Tick all ${lab.steps.length} steps to finish`;
  };
  done.addEventListener('click', () => {
    store.update((st) => { st.labs[lab.id] = { ...get(), completedAt: new Date().toISOString() }; });
    refresh();
  });

  const steps = h('ol', { class: 'lab-steps' }, ...lab.steps.map((s, i) => {
    const box = h('input', {
      type: 'checkbox', id: `step-${i}`, checked: get().steps.includes(i),
      onchange: (e) => {
        store.update((st) => {
          const p = { ...get() };
          p.steps = e.target.checked ? [...new Set([...p.steps, i])].sort((a, b) => a - b) : p.steps.filter((x) => x !== i);
          st.labs[lab.id] = p;
        });
        refresh();
      }
    });
    return h('li', {}, h('label', { class: 'check lab-step', for: `step-${i}` }, box, h('span', {}, ...withCode(s))));
  }));
  refresh();

  const list = (title, items) => h('div', { class: 'card' }, h('h3', {}, title), h('ul', { class: 'small' }, ...items.map((x) => h('li', {}, ...withCode(x)))));
  return h('section', { class: 'lab', 'data-lab-page': lab.id },
    h('a', { href: '#/labs', class: 'back small' }, '‹ All labs'),
    h('h2', {}, `Day ${lab.day}: ${lab.title}`),
    h('p', { class: 'lab-warning', role: 'note' }, lab.environment),
    h('div', { class: 'card' }, h('h3', {}, 'Goal'), h('p', { class: 'small' }, lab.goal),
      h('p', { class: 'small muted' }, `Domain ${lab.domain} · objective ${lab.objective} · about ${lab.minutes} min`)),
    list('Before you start', lab.prerequisites),
    h('div', { class: 'card' }, h('h3', {}, 'Steps'), steps),
    list('Check your work', lab.validation),
    list('Rollback', lab.rollback),
    list('Evidence to keep', lab.evidence),
    h('div', { class: 'btn-row' }, done));
}

export function renderLabs(ctx, params = []) {
  if (!ctx.data.labs) return h('section', {}, h('h2', {}, 'Labs'), h('div', { class: 'card' }, 'Labs could not be loaded.'));
  const lab = ctx.data.labs.labs.find((l) => l.id === params[0]);
  return lab ? renderLab(ctx, lab) : renderList(ctx);
}
