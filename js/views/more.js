// More: settings, export/import progress and reset.
import { h, toast } from '../ui.js';
import { todayIn } from '../outline.js';
import { DEFAULT_GATES } from '../engine/perf.js';
import { notificationState, enableNotifications, reminderCalendar } from '../reminders.js';

const notifyText = (state) => ({
  granted: 'Notifications are on.',
  denied: 'Notifications are blocked in this browser\'s site settings. The in-app "due now" banner still works.',
  default: 'Notifications are off. The in-app "due now" banner shows when a block is due.',
  unsupported: 'This browser does not support notifications. The in-app "due now" banner still works.'
}[state]);

function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
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

  const g = { ...DEFAULT_GATES, ...(s.gates || {}) };
  const setGate = (key, value) => set((x) => { x.gates = { ...(x.gates || {}), [key]: value }; });
  const gateNum = (key, label, min, max) => h('label', { class: 'field' }, h('span', {}, label),
    h('input', {
      type: 'number', id: `gate-${key}`, min, max, value: g[key], inputmode: 'numeric',
      onchange: (e) => {
        const n = Math.min(max, Math.max(min, Number(e.target.value) || DEFAULT_GATES[key]));
        e.target.value = n;
        setGate(key, n);
      }
    }));
  const metric = h('select', { id: 'gate-mockMetric', onchange: (e) => setGate('mockMetric', e.target.value) },
    h('option', { value: 'accuracy', selected: g.mockMetric === 'accuracy' }, 'Accuracy across the last two mocks'),
    h('option', { value: 'band', selected: g.mockMetric === 'band' }, 'Band "above" in both of the last two mocks'));

  return h('section', {},
    h('a', { class: 'card nav-card', href: '#/performance' },
      h('h3', {}, 'Performance and readiness'),
      h('p', { class: 'small muted' }, 'Accuracy by domain, difficulty and confidence, and the four readiness gates.')),
    h('h2', {}, 'Settings'),
    h('div', { class: 'card' },
      h('label', { class: 'field' }, h('span', {}, 'Target exam date'), target),
      h('label', { class: 'check' }, booked, 'Exam is booked'),
      h('p', { class: 'small muted' }, 'Sittings on or after 15 April 2027 follow the new ISC2 outline. A warning appears at the top of every screen when your date is affected.')),
    h('div', { class: 'card' },
      h('h3', {}, 'Reminders (Africa/Harare)'),
      h('div', { class: 'times' }, ...times),
      h('p', { class: 'small', id: 'notify-state' }, notifyText(notificationState())),
      h('div', { class: 'btn-row' },
        notificationState() === 'default' ? h('button', {
          class: 'btn', type: 'button', id: 'notify-btn',
          onclick: async (e) => {
            const r = await enableNotifications();
            document.getElementById('notify-state').textContent = notifyText(r);
            if (r !== 'default') e.target.remove();
          }
        }, 'Turn on notifications') : null,
        h('button', {
          class: 'btn', type: 'button', id: 'calendar-btn',
          onclick: () => download('cissp-reminders.ics', reminderCalendar(store.get().settings, todayIn(s.timeZone)), 'text/calendar')
        }, 'Add reminders to my calendar')),
      h('p', { class: 'small muted' }, 'Notifications ring only while the app is open or recently used: a web app cannot wake itself. For a reliable daily alarm, add the calendar file; your phone\'s calendar then rings at each block time until the exam. If you change the times, add it again.')),
    h('div', { class: 'card' },
      h('label', { class: 'field' }, h('span', {}, 'Daily review cap'), cap),
      h('label', { class: 'field' }, h('span', {}, 'Theme'), theme)),
    h('div', { class: 'card', id: 'gate-settings' },
      h('h3', {}, 'Readiness gates'),
      h('label', { class: 'field' }, h('span', {}, 'Mock gate measures'), metric),
      h('p', { class: 'small muted' }, 'Adaptive mocks hold accuracy near 50 to 60% by design, so the accuracy gate is hard to meet. The band option measures where the difficulty settled instead.'),
      gateNum('mockAccuracy', 'Mock accuracy needed (%)', 50, 100),
      gateNum('domainMin', 'Lowest domain accuracy allowed (%)', 50, 100),
      gateNum('conceptMaxMisses', 'Most misses allowed per concept', 0, 10),
      gateNum('weeks', 'Consecutive weeks needed', 1, 8),
      gateNum('daysPerWeek', 'Study days per week', 1, 7)),
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
