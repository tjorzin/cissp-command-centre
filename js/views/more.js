// More: settings, export/import progress and reset.
import { h, toast } from '../ui.js';
import { todayIn } from '../outline.js';

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function renderMore({ store }) {
  const s = store.get().settings;
  const set = (fn) => store.update((st) => fn(st.settings));

  const target = h('input', {
    type: 'date', id: 'target-date', value: s.targetDate, required: true,
    onchange: (e) => { if (e.target.value) set((x) => { x.targetDate = e.target.value; }); }
  });

  const booked = h('input', {
    type: 'checkbox', id: 'exam-booked', checked: s.examBooked,
    onchange: (e) => set((x) => { x.examBooked = e.target.checked; })
  });

  const times = s.reminders.map((t, i) => h('input', {
    type: 'time', value: t, 'aria-label': ['Morning', 'Afternoon', 'Evening'][i] + ' reminder',
    onchange: (e) => { if (e.target.value) set((x) => { x.reminders[i] = e.target.value; }); }
  }));

  const cap = h('input', {
    type: 'number', id: 'review-cap', min: 5, max: 200, step: 5, value: s.dailyReviewCap, inputmode: 'numeric',
    onchange: (e) => {
      const n = Math.min(200, Math.max(5, Number(e.target.value) || 30));
      e.target.value = n;
      set((x) => { x.dailyReviewCap = n; });
    }
  });

  const theme = h('select', {
    id: 'theme',
    onchange: (e) => set((x) => { x.theme = e.target.value; })
  }, ...[['system', 'Match phone'], ['light', 'Light'], ['dark', 'Dark']]
    .map(([v, label]) => h('option', { value: v, selected: s.theme === v }, label)));

  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', id: 'import-file', hidden: true,
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const result = store.importJSON(await file.text());
      e.target.value = '';
      if (result.ok) {
        toast('Progress imported.');
        location.reload();
      } else {
        toast(`Import failed: ${result.errors.join(' ')}`, 5000);
      }
    }
  });

  return h('section', {},
    h('h2', {}, 'Settings'),
    h('div', { class: 'card' },
      h('label', { class: 'field' }, h('span', {}, 'Target exam date'), target),
      h('label', { class: 'check' }, booked, 'Exam is booked'),
      h('p', { class: 'small muted' }, 'Sittings on or after 15 April 2027 follow the new ISC2 outline. A warning appears at the top of every screen when your date is affected.')),
    h('div', { class: 'card' },
      h('h3', {}, 'Reminders (Africa/Harare)'),
      h('div', { class: 'times' }, ...times),
      h('p', { class: 'small muted' }, 'Phone notifications are set up in phase 7. Until then, the app shows what is due when you open it.')),
    h('div', { class: 'card' },
      h('label', { class: 'field' }, h('span', {}, 'Daily review cap'), cap),
      h('label', { class: 'field' }, h('span', {}, 'Theme'), theme)),
    h('div', { class: 'card' },
      h('h3', {}, 'Your progress'),
      h('p', { class: 'small muted' }, 'Everything stays on this device. Export a file to move to another phone or to recover after clearing browser data.'),
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn primary', id: 'export-btn', type: 'button',
          onclick: () => download(`cissp-progress-${todayIn(s.timeZone)}.json`, store.exportJSON())
        }, 'Export progress'),
        h('button', { class: 'btn', id: 'import-btn', type: 'button', onclick: () => fileInput.click() }, 'Import progress'),
        fileInput),
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn danger', type: 'button',
          onclick: () => {
            if (confirm('Erase all progress on this device? Export first if you want a copy.')) {
              store.reset();
              location.reload();
            }
          }
        }, 'Erase all progress'))));
}
