// Service worker: app shell is cache-first (versioned); /data JSON is network-first
// so new content arrives when online, with the cached copy used offline.
const VERSION = 'v1.0.0';
const SHELL_CACHE = `cc-shell-${VERSION}`;
const DATA_CACHE = 'cc-data';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/store.js',
  'js/outline.js',
  'js/ui.js',
  'js/domains.js',
  'js/views/home.js',
  'js/views/more.js',
  'js/views/study.js',
  'js/views/questions.js',
  'js/views/session.js',
  'js/views/results.js',
  'js/views/review.js',
  'js/views/ledger.js',
  'js/engine/ledger.js',
  'js/engine/srs.js',
  'js/engine/perf.js',
  'js/engine/plan.js',
  'js/reminders.js',
  'js/views/drills.js',
  'js/views/labs.js',
  'js/views/car.js',
  'js/engine/car.js',
  'data/lessons.json',
  'data/drills.json',
  'data/labs.json',
  'data/tracks.json',
  'js/views/performance.js',
  'js/views/cards.js',
  'data/cards.json',
  'js/engine/rng.js',
  'js/engine/bank.js',
  'js/engine/mock.js',
  'js/engine/session.js',
  'data/outlines.json',
  'data/domains.json',
  'data/questions.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('cc-shell-') && k !== SHELL_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Tapping a reminder opens (or focuses) the app on today's plan.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.includes(self.registration.scope));
    if (open) return open.focus().then((c) => c.navigate ? c.navigate('./#/home') : c);
    return self.clients.openWindow('./#/home');
  }));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (new URL(req.url).pathname.includes('/data/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(DATA_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
