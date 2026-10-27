// Storage layer: one namespaced localStorage key holding all progress, with a
// schemaVersion and forward migrations. Every storage call is wrapped in try/catch;
// when storage is unavailable the app keeps working in memory and says so.

export const STORAGE_KEY = 'cissp-cc';
export const SCHEMA_VERSION = 1;

export function defaultState(now = new Date()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    settings: {
      targetDate: '2027-03-31',
      examBooked: false,
      reminders: ['05:45', '13:00', '20:30'],
      timeZone: 'Africa/Harare',
      notifications: false,
      dailyReviewCap: 30,
      theme: 'system'
    },
    answers: [],
    ledger: [],
    srs: {},
    sessions: [],
    studyDays: [],
    baseline: null,
    activeSession: null,
    reteach: {}
  };
}

// Each entry upgrades state from version (index + 1) to (index + 2).
const MIGRATIONS = [];

export function migrate(state) {
  let s = state;
  for (let v = s.schemaVersion || 1; v < SCHEMA_VERSION; v++) {
    s = MIGRATIONS[v - 1](s);
    s.schemaVersion = v + 1;
  }
  return s;
}

// Fills in any field missing from an older or partial state without overwriting data.
function withDefaults(state) {
  const d = defaultState();
  return { ...d, ...state, settings: { ...d.settings, ...(state.settings || {}) } };
}

export function validateImport(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ['File is not a progress object.'];
  if (obj.app !== 'cissp-command-centre') errors.push('File was not exported by CISSP Command Centre.');
  const st = obj.state;
  if (!st || typeof st !== 'object') errors.push('File has no state.');
  else {
    if (!Number.isInteger(st.schemaVersion)) errors.push('Missing schemaVersion.');
    else if (st.schemaVersion > SCHEMA_VERSION) errors.push(`File is from a newer app version (schema ${st.schemaVersion}). Update the app first.`);
    for (const k of ['answers', 'ledger', 'sessions', 'studyDays']) {
      if (k in st && !Array.isArray(st[k])) errors.push(`"${k}" must be a list.`);
    }
  }
  return errors;
}

export function createStore(backend = globalThis.localStorage) {
  let persistent = true;
  let state;
  const listeners = new Set();

  function read() {
    try {
      const raw = backend.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      persistent = false;
      return null;
    }
  }

  function write() {
    try {
      backend.setItem(STORAGE_KEY, JSON.stringify(state));
      persistent = true;
    } catch {
      persistent = false;
    }
  }

  const loaded = read();
  state = loaded ? withDefaults(migrate(loaded)) : defaultState();
  if (!loaded) write();

  return {
    get: () => state,
    isPersistent: () => persistent,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    update(mutator) {
      mutator(state);
      write();
      listeners.forEach((fn) => fn(state));
      return state;
    },

    exportJSON(now = new Date()) {
      return JSON.stringify({ app: 'cissp-command-centre', exportedAt: now.toISOString(), state }, null, 2);
    },

    importJSON(text) {
      let obj;
      try { obj = JSON.parse(text); } catch { return { ok: false, errors: ['File is not valid JSON.'] }; }
      const errors = validateImport(obj);
      if (errors.length) return { ok: false, errors };
      state = withDefaults(migrate(obj.state));
      write();
      listeners.forEach((fn) => fn(state));
      return { ok: true, errors: [] };
    },

    reset() {
      state = defaultState();
      write();
      listeners.forEach((fn) => fn(state));
    }
  };
}
