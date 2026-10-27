// Session runner: one question at a time. Confidence is required before the answer is
// revealed. There is no going back in any mode.
import { h } from '../ui.js';
import { LETTERS, renderReview } from './review.js';
import { bankFor } from './questions.js';
import { ensureCurrent, answerCurrent, advance, isFinished, finishSession, timeLeft } from '../engine/session.js';
import { entryId, reteachDue } from '../engine/ledger.js';
import { errorClassPicker, renderReteachCard } from './ledger.js';

const CONFIDENCE = [['guess', 'Guess'], ['unsure', 'Unsure'], ['sure', 'Sure']];
const COUNT_WORDS = { 2: 'two', 3: 'three', 4: 'four' };

const fmt = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

// replaceChildren would print "null"; drop empty parts first.
const fill = (root, ...parts) => root.replaceChildren(...parts.filter((p) => p != null && p !== ''));

export function renderSession(ctx) {
  const { store, data } = ctx;
  const root = h('section', { class: 'session' });
  if (!data.questions) return root;
  const { questions, scenarios } = bankFor(ctx);
  const all = data.questions.questions;
  const byId = (id) => all.find((q) => q.id === id);
  let timer = null;

  function finish() {
    clearInterval(timer);
    let summary;
    store.update((st) => { summary = finishSession(st, all); });
    location.hash = summary ? `#/results/${summary.id}` : '#/questions';
  }

  function paint() {
    clearInterval(timer);
    const s = store.get().activeSession;
    if (!s) {
      root.replaceChildren(h('h2', {}, 'No session running'), h('a', { class: 'btn primary', href: '#/questions' }, 'Choose a mode'));
      return;
    }
    let item;
    store.update((st) => { item = ensureCurrent(st.activeSession, questions); });
    const answeredCurrent = s.responses.length > s.index;
    if (!answeredCurrent && isFinished(s, questions)) { finish(); return; }

    const q = byId(item.id);
    const total = s.mode === 'mock' ? `${s.index + 1}` : `${s.index + 1} of ${s.items.length}`;
    const timeEl = h('span', { class: 'pill timer', id: 'timer' });
    const tick = () => {
      const left = timeLeft(s);
      if (left == null) return;
      timeEl.textContent = fmt(left);
      if (left === 0) finish();
    };
    tick();
    if (s.limitSec != null) timer = setInterval(() => { if (!root.isConnected) clearInterval(timer); else tick(); }, 1000);

    const scenario = q.scenario ? scenarios.find((x) => x.id === q.scenario) : null;
    const head = h('div', { class: 'session-head' },
      h('span', { class: 'small muted' }, `${s.title} · Question ${total}`),
      s.limitSec != null ? timeEl : null);
    const scenarioBox = scenario
      ? h('details', { class: 'card scenario', open: true }, h('summary', { class: 'strong' }, `Case study: ${scenario.title}`), h('p', { class: 'small' }, scenario.text))
      : null;
    const stem = h('p', { class: 'stem', id: 'stem' }, q.stem);

    if (answeredCurrent) {
      const r = s.responses[s.index];
      const last = s.mode === 'mock' ? false : s.index + 1 >= s.items.length;
      fill(root, head, scenarioBox, stem,
        renderReview(q, item, r.selected),
        errorClassPicker(store, entryId(s.id, q.id)),
        h('div', { class: 'btn-row sticky-actions' },
          h('button', {
            class: 'btn primary', type: 'button', id: 'next-btn',
            onclick: () => { store.update((st) => advance(st.activeSession)); paint(); }
          }, last ? 'See results' : 'Next question')));
      return;
    }

    // Study modes pause on an objective that is due a reteach; exam modes keep exam conditions.
    const st = store.get();
    if (s.feedback && reteachDue(st.ledger, st.reteach).some((r) => r.objective === q.objective)) {
      fill(root, head, renderReteachCard(ctx, q.objective, () => { paint(); scrollTo(0, 0); }));
      return;
    }

    const need = q.correct.length;
    const selected = new Set();
    let confidence = null;
    const submit = h('button', { class: 'btn primary', type: 'button', id: 'submit-btn', disabled: true }, 'Submit answer');
    const refresh = () => { submit.disabled = !(selected.size === need && confidence); };

    const opts = h('ol', { class: 'opts' }, ...item.order.map((orig, pos) => {
      const input = h('input', {
        type: q.type === 'multi' ? 'checkbox' : 'radio', name: 'opt', value: orig, id: `opt-${pos}`,
        onchange: (e) => {
          if (q.type === 'single') selected.clear();
          if (e.target.checked) selected.add(orig); else selected.delete(orig);
          refresh();
        }
      });
      return h('li', {}, h('label', { class: 'opt choice', for: `opt-${pos}` }, input,
        h('span', { class: 'letter' }, LETTERS[pos]), h('span', { class: 'grow' }, q.options[orig])));
    }));

    const confButtons = CONFIDENCE.map(([v, label]) => h('button', {
      type: 'button', class: 'btn conf', 'aria-pressed': 'false', 'data-confidence': v,
      onclick: (e) => {
        confidence = v;
        confButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
        refresh();
      }
    }, label));

    submit.addEventListener('click', () => {
      store.update((st) => {
        answerCurrent(st, q, [...selected], confidence);
        if (!st.activeSession.feedback) advance(st.activeSession);
      });
      paint();
      scrollTo(0, 0);
    });

    fill(root, head, scenarioBox, stem,
      q.type === 'multi' ? h('p', { class: 'small strong' }, `Choose ${COUNT_WORDS[need] || need} options.`) : null,
      opts,
      h('div', { class: 'confidence' },
        h('p', { class: 'small strong', id: 'conf-label' }, 'How sure are you?'),
        h('div', { class: 'conf-row', role: 'group', 'aria-labelledby': 'conf-label' }, ...confButtons)),
      h('div', { class: 'btn-row sticky-actions' }, submit,
        s.mode === 'mock' || s.mode === 'mini' ? h('button', {
          class: 'btn', type: 'button', id: 'end-btn',
          onclick: () => { if (confirm('End now? Unanswered questions count as not answered.')) finish(); }
        }, 'End exam') : null));
  }

  paint();
  return root;
}
