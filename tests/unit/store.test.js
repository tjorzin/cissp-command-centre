import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY, SCHEMA_VERSION, validateImport } from '../../js/store.js';

function memoryBackend(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), raw: m };
}

test('first run writes a default state under one namespaced key', () => {
  const b = memoryBackend();
  const store = createStore(b);
  assert.equal(b.raw.size, 1);
  const saved = JSON.parse(b.raw.get(STORAGE_KEY));
  assert.equal(saved.schemaVersion, SCHEMA_VERSION);
  assert.equal(saved.settings.targetDate, '2027-03-31');
  assert.deepEqual(saved.settings.reminders, ['05:45', '13:00', '20:30']);
  assert.equal(store.isPersistent(), true);
});

test('updates persist and reload', () => {
  const b = memoryBackend();
  createStore(b).update((s) => { s.settings.targetDate = '2027-04-20'; });
  assert.equal(createStore(b).get().settings.targetDate, '2027-04-20');
});

test('missing settings fields are filled from defaults without losing data', () => {
  const b = memoryBackend({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, settings: { targetDate: '2027-02-01' }, answers: [{ id: 'x' }] }) });
  const s = createStore(b).get();
  assert.equal(s.settings.targetDate, '2027-02-01');
  assert.equal(s.settings.dailyReviewCap, 30);
  assert.equal(s.answers.length, 1);
});

test('a throwing backend falls back to memory and reports not persistent', () => {
  const boom = () => { throw new Error('QuotaExceededError'); };
  const store = createStore({ getItem: boom, setItem: boom });
  store.update((s) => { s.settings.dailyReviewCap = 40; });
  assert.equal(store.get().settings.dailyReviewCap, 40);
  assert.equal(store.isPersistent(), false);
});

test('a null backend (storage blocked) still works in memory', () => {
  const store = createStore(null);
  assert.equal(store.isPersistent(), false);
  assert.equal(store.get().settings.targetDate, '2027-03-31');
});

test('corrupt stored JSON does not crash the app', () => {
  const store = createStore(memoryBackend({ [STORAGE_KEY]: '{not json' }));
  assert.equal(store.get().schemaVersion, SCHEMA_VERSION);
});

test('export then import round-trips all progress', () => {
  const a = createStore(memoryBackend());
  a.update((s) => {
    s.settings.targetDate = '2027-03-10';
    s.answers.push({ id: 'd1-001', correct: false });
    s.ledger.push({ qid: 'd1-001', confidence: 'sure' });
  });
  const text = a.exportJSON();
  const b = createStore(memoryBackend());
  const result = b.importJSON(text);
  assert.equal(result.ok, true);
  assert.deepEqual(b.get(), a.get());
});

test('import rejects bad files and leaves state untouched', () => {
  const store = createStore(memoryBackend());
  store.update((s) => { s.answers.push({ id: 'keep' }); });
  for (const bad of ['nope', '[]', '{}', JSON.stringify({ app: 'other', state: {} }),
    JSON.stringify({ app: 'cissp-command-centre', state: { schemaVersion: SCHEMA_VERSION + 1 } }),
    JSON.stringify({ app: 'cissp-command-centre', state: { schemaVersion: 1, answers: 'x' } })]) {
    assert.equal(store.importJSON(bad).ok, false, bad);
  }
  assert.equal(store.get().answers[0].id, 'keep');
});

test('validateImport explains a newer schema', () => {
  const errs = validateImport({ app: 'cissp-command-centre', state: { schemaVersion: 99 } });
  assert.match(errs.join(' '), /newer app version/);
});
