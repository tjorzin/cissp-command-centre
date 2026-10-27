// Error Ledger screen: Patterns panel first (misconceptions, reteach due, repeat topics,
// error classes), then every entry with its reasoning and one-tap error tagging.
import { h } from '../ui.js';
import { activeOutline, objectiveFor } from '../domains.js';
import { ERROR_CLASSES, RETEACH_AFTER, patterns, reteachDue, reteachLesson, tagEntry, completeReteach, isMisconception, missesSinceReteach } from '../engine/ledger.js';
import { bankFor, launch } from './questions.js';
import { mulberry32, newSeed } from '../engine/rng.js';
import { buildWeakness, present } from '../engine/bank.js';

export const TEACH_BACK_MIN = 80;

function objectiveInfo(data, outlineId, id) {
  const raw = data.domains?.domains.flatMap((d) => d.objectives).find((o) => o.id === id);
  return raw ? objectiveFor(raw, outlineId) : { id, label: id, topics: [] };
}

export function errorClassPicker(store, entryIdValue) {
  const entry = () => store.get().ledger.find((e) => e.id === entryIdValue);
  if (!entry()) return null;
  const buttons = ERROR_CLASSES.map((c) => h('button', {
    type: 'button', class: 'chip', 'data-class': c.id, 'aria-pressed': String(entry().errorClass === c.id),
    onclick: () => {
      store.update((st) => tagEntry(st, entryIdValue, c.id));
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(entry().errorClass === b.dataset.class)));
    }
  }, c.label));
  return h('div', { class: 'class-picker' },
    h('p', { class: 'small strong' }, 'Why did you miss it? (one tap)'),
    h('div', { class: 'chips' }, ...buttons));
}

export function renderReteachCard(ctx, objective, onDone) {
  const { store, data } = ctx;
  const st = store.get();
  const outline = activeOutline(data.outlines, st.settings.targetDate);
  const info = objectiveInfo(data, outline.id, objective);
  const misses = missesSinceReteach(st.ledger, st.reteach, objective);
  const points = reteachLesson(st.ledger, objective);

  const counter = h('span', { class: 'small muted' }, `0/${TEACH_BACK_MIN} characters`);
  const done = h('button', { class: 'btn primary', type: 'button', id: 'reteach-done', disabled: true }, 'I have explained it: continue');
  const box = h('textarea', {
    id: 'teach-back', rows: 6, 'aria-label': 'Teach-back',
    placeholder: 'Brief a new analyst on this idea. What comes first, and why?',
    oninput: (e) => {
      const n = e.target.value.trim().length;
      counter.textContent = `${n}/${TEACH_BACK_MIN} characters`;
      done.disabled = n < TEACH_BACK_MIN;
    }
  });
  done.addEventListener('click', () => {
    store.update((s) => completeReteach(s, objective, box.value.trim()));
    onDone();
  });

  return h('section', { class: 'reteach', 'data-reteach': objective },
    h('h2', {}, `Reteach: ${objective} ${info.label}`),
    h('p', { class: 'small muted' }, `Missed ${misses} times${st.reteach[objective] ? ' since your last reteach' : ''}. Questions on this objective pause until you finish this short lesson and explain it back.`),
    info.topics.length ? h('div', { class: 'card' }, h('h3', {}, 'What the outline covers'), h('ul', { class: 'topics small' }, ...info.topics.map((t) => h('li', {}, t)))) : null,
    ...points.map((p) => h('div', { class: 'card lesson' },
      h('h3', {}, p.concept),
      h('p', { class: 'small' }, h('b', {}, 'Why the right answer is right: '), p.model),
      h('p', { class: 'small' }, h('b', {}, 'The trap: '), p.trap),
      h('p', { class: 'small' }, h('b', {}, 'Manager lens: '), p.managerLens))),
    h('div', { class: 'card' },
      h('h3', {}, 'Teach it back'),
      h('ul', { class: 'small muted' },
        h('li', {}, 'State the rule in one sentence.'),
        h('li', {}, 'Say what you would do first, and what comes after.'),
        h('li', {}, 'Name the trap you fell into and how you will spot it.')),
      box, counter,
      h('div', { class: 'btn-row' }, done)));
}

export function renderReteach(ctx, params = []) {
  return renderReteachCard(ctx, params[0], () => { location.hash = '#/ledger'; });
}

const FILTERS = [['all', 'All'], ['misconception', 'Sure but wrong'], ['untagged', 'Untagged'], ['guess', 'Lucky guesses']];

function entryCard(ctx, e, label) {
  const { store, data } = ctx;
  const followUp = e.followUpId && data.questions.questions.find((q) => q.id === e.followUpId);
  return h('details', { class: `card entry ${isMisconception(e) ? 'misconception' : ''}`, 'data-entry': e.id },
    h('summary', {},
      isMisconception(e) ? h('span', { class: 'tag bad' }, 'Misconception') : e.kind === 'guess' ? h('span', { class: 'tag' }, 'Lucky guess') : h('span', { class: 'tag' }, 'Missed'),
      ` ${e.objective} ${label} · ${e.subtopic}`,
      h('span', { class: 'small muted' }, ` · ${e.at.slice(0, 10)} · ${e.confidence}`)),
    h('p', { class: 'stem small' }, e.stem),
    h('dl', { class: 'meta small' },
      h('dt', {}, 'Your answer'), ...e.yourAnswer.map((a) => h('dd', {}, a)),
      h('dt', {}, 'Correct answer'), ...e.rightAnswer.map((a) => h('dd', {}, a)),
      e.whyWrong.length ? h('dt', {}, 'Why your choice was wrong') : null,
      ...e.whyWrong.map((w) => h('dd', {}, w.why)),
      e.kind === 'guess' ? h('dt', {}, 'Right, but by guessing') : null,
      e.kind === 'guess' ? h('dd', {}, 'Counted here so the idea gets reviewed until you know it.') : null,
      h('dt', {}, 'The correct mental model'), h('dd', {}, e.mentalModel),
      h('dt', {}, 'Concept'), h('dd', {}, e.concept),
      h('dt', {}, 'The trap'), h('dd', {}, e.trap),
      h('dt', {}, 'A miss here shows'), h('dd', {}, e.gap)),
    errorClassPicker(store, e.id),
    followUp ? h('div', { class: 'btn-row' }, h('button', {
      class: 'btn', type: 'button',
      onclick: () => launch(store, { mode: 'practice', title: 'Follow-up question', seed: 1, items: [present(followUp, mulberry32(newSeed()))] })
    }, 'Try the follow-up question')) : null);
}

export function renderLedger(ctx) {
  const { store, data } = ctx;
  const st = store.get();
  if (!data.questions || !data.outlines) return h('section', {}, h('h2', {}, 'Error Ledger'));
  const outline = activeOutline(data.outlines, st.settings.targetDate);
  const label = (id) => objectiveInfo(data, outline.id, id).label;
  const p = patterns(st.ledger);
  const due = reteachDue(st.ledger, st.reteach);

  if (!st.ledger.length) {
    return h('section', {}, h('h2', {}, 'Error Ledger'),
      h('div', { class: 'card' }, h('p', {}, 'Nothing recorded yet. Every wrong answer, and every right answer you marked as a guess, lands here with the reasoning, so you can see your patterns.')));
  }

  let filter = 'all';
  const list = h('div', { id: 'entries' });
  const paintList = () => {
    const shown = [...st.ledger].sort((a, b) => b.at.localeCompare(a.at)).filter((e) =>
      filter === 'all' || (filter === 'misconception' && isMisconception(e)) || (filter === 'untagged' && !e.errorClass) || (filter === 'guess' && e.kind === 'guess'));
    list.replaceChildren(...(shown.length ? shown.map((e) => entryCard(ctx, e, label(e.objective))) : [h('p', { class: 'small muted' }, 'No entries match.')]));
  };
  const filterChips = FILTERS.map(([v, text]) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(v === filter), 'data-filter': v,
    onclick: () => { filter = v; filterChips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === v))); paintList(); }
  }, text));
  paintList();

  const maxClass = Math.max(1, ...Object.values(p.classes));
  const { questions } = bankFor(ctx);

  return h('section', { class: 'ledger' },
    h('h2', {}, 'Error Ledger'),
    h('div', { class: 'card' }, h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('b', { id: 'ledger-total' }, p.total), h('span', {}, 'entries')),
      h('div', { class: 'stat' }, h('b', { id: 'ledger-misconceptions' }, p.misconceptions.length), h('span', {}, 'sure but wrong')),
      h('div', { class: 'stat' }, h('b', {}, p.untagged), h('span', {}, 'untagged')))),

    ...due.map((r) => h('div', { class: 'card due', 'data-due': r.objective },
      h('h3', {}, `Reteach due: ${r.objective} ${label(r.objective)}`),
      h('p', { class: 'small muted' }, `Missed ${r.misses} times (rule: ${RETEACH_AFTER}). Study questions on it are paused until you complete the reteach.`),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn primary', href: `#/reteach/${r.objective}` }, 'Start reteach')))),

    h('div', { class: 'card patterns', id: 'patterns' },
      h('h3', {}, 'Patterns'),
      h('h4', {}, 'Misconceptions: sure but wrong'),
      p.misconceptions.length
        ? h('ol', { class: 'small', id: 'misconceptions' }, ...p.misconceptions.slice(0, 5).map((e) => h('li', {}, `${e.objective} ${e.subtopic}: `, h('span', { class: 'muted' }, e.trap))))
        : h('p', { class: 'small muted' }, 'None. These are the misses that recur, so they are listed first when they appear.'),
      h('h4', {}, 'Topics missed more than once'),
      p.topics.length
        ? h('ol', { class: 'small', id: 'repeat-topics' }, ...p.topics.map((t) => h('li', {}, `${t.objective} ${label(t.objective)}: ${t.misses} misses`, t.sure ? h('span', { class: 'muted' }, ` (${t.sure} sure)`) : null)))
        : h('p', { class: 'small muted' }, 'None yet.'),
      h('h4', {}, 'Error classes'),
      h('div', { class: 'bars small' }, ...ERROR_CLASSES.map((c) => h('div', { class: 'bar-row', 'data-class-count': c.id },
        h('span', { class: 'bar-label' }, c.label),
        h('span', { class: 'bar' }, h('span', { class: 'fill', style: `width:${(p.classes[c.id] / maxClass) * 100}%` })),
        h('span', { class: 'bar-n' }, p.classes[c.id])))),
      p.untagged ? h('p', { class: 'small muted' }, `${p.untagged} untagged. Tag them below: the class tells you what to fix.`) : null,
      h('div', { class: 'btn-row' }, h('button', {
        class: 'btn primary', type: 'button', id: 'drill-weak',
        onclick: () => { const seed = newSeed(); launch(store, { mode: 'weakness', seed, items: buildWeakness(questions, store.get().answers, mulberry32(seed)) }); }
      }, 'Drill these in Weakness mode'))),

    h('h3', {}, 'Entries'),
    h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter entries' }, ...filterChips),
    list);
}
