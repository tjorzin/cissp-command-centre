// App entry: loads data, wires the store, theme, router and service worker.
import { createStore } from './store.js';
import { outlineNotices } from './outline.js';
import { banner } from './ui.js';
import { renderHome } from './views/home.js';
import { renderMore } from './views/more.js';
import { renderStudy } from './views/study.js';
import { renderQuestions } from './views/questions.js';
import { renderSession } from './views/session.js';
import { renderResults } from './views/results.js';
import { renderLedger, renderReteach } from './views/ledger.js';

// A null backend makes every storage call throw, which the store catches: it then
// runs in memory and isPersistent() reports false so the app can warn.
let storage = null;
try { storage = window.localStorage; } catch { /* blocked by browser settings */ }
const store = createStore(storage);

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

const ctx = { store, data: {} };

const routes = {
  home: renderHome,
  study: renderStudy,
  questions: renderQuestions,
  session: renderSession,
  results: renderResults,
  ledger: renderLedger,
  reteach: renderReteach,
  more: renderMore
};

function applyTheme() {
  const t = store.get().settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

function renderBanners() {
  const host = document.getElementById('banners');
  host.replaceChildren();
  if (!store.isPersistent()) {
    host.append(banner('Progress is not being saved',
      'This browser is blocking storage (private window or cleared site data). Export your progress from More before closing.'));
  }
  if (ctx.data.outlines) {
    for (const n of outlineNotices(store.get().settings.targetDate, ctx.data.outlines.outlines)) {
      const el = banner(n.title, n.body);
      el.dataset.notice = n.kind;
      host.append(el);
    }
  }
}

function route() {
  const [first, ...params] = location.hash.replace(/^#\/?/, '').split('/');
  const name = routes[first] ? first : 'home';
  const view = routes[name];
  const tab = { session: 'questions', results: 'questions', reteach: 'ledger' }[name] || name;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const main = document.getElementById('main');
  main.replaceChildren(view(ctx, params));
  renderBanners();
  scrollTo(0, 0);
}

function watchOnline() {
  const pill = document.getElementById('offline-pill');
  const set = () => { pill.hidden = navigator.onLine; };
  addEventListener('online', set);
  addEventListener('offline', set);
  set();
}

async function start() {
  applyTheme();
  watchOnline();
  const files = { outlines: 'data/outlines.json', domains: 'data/domains.json', questions: 'data/questions.json' };
  const loaded = await Promise.allSettled(Object.values(files).map(loadJSON));
  Object.keys(files).forEach((k, i) => {
    if (loaded[i].status === 'fulfilled') ctx.data[k] = loaded[i].value;
    else console.error(loaded[i].reason);
  });
  store.subscribe(() => { applyTheme(); renderBanners(); });
  addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker not registered', err));
  }
}

start();
