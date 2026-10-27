// App entry: loads data, wires the store, theme, router and service worker.
import { createStore } from './store.js';
import { outlineNotices } from './outline.js';
import { banner } from './ui.js';
import { renderHome } from './views/home.js';
import { renderPlaceholder } from './views/placeholder.js';
import { renderMore } from './views/more.js';

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
  study: (c) => renderPlaceholder(c, 'Study', 'Domain pages, comparison drills and labs arrive in phases 2 and 8. Cards arrive in phase 5.'),
  questions: (c) => renderPlaceholder(c, 'Questions', 'Practice sets, scenario sets, mini exams, adaptive mocks, weakness mode and hard mode arrive in phase 3.'),
  ledger: (c) => renderPlaceholder(c, 'Error Ledger', 'Every miss and every lucky guess is recorded here from phase 4, with the Patterns panel.'),
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
  const name = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'home';
  const view = routes[name] || routes.home;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const main = document.getElementById('main');
  main.replaceChildren(view(ctx));
  renderBanners();
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
  try {
    ctx.data.outlines = await loadJSON('data/outlines.json');
  } catch (err) {
    console.error(err);
  }
  store.subscribe(() => { applyTheme(); renderBanners(); });
  addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker not registered', err));
  }
}

start();
