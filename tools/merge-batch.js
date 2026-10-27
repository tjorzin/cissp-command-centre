// Merges a content batch into the data files. A batch may carry any of:
//   questions, scenarios -> data/questions.json
//   cards                -> data/cards.json
//   lessons (by objective) -> data/lessons.json
//   drills               -> data/drills.json
//   labs                 -> data/labs.json
// Usage: node tools/merge-batch.js <batch.json>
// Refuses duplicate ids or lessons. Run `npm run validate` afterwards.
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) { console.error('Usage: node tools/merge-batch.js <batch.json>'); process.exit(1); }
const batch = JSON.parse(readFileSync(path, 'utf8'));
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, obj) => writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`);
const fail = (msg) => { console.error(msg); process.exit(1); };

function mergeList(file, key, items) {
  if (!items?.length) return 0;
  const data = read(file);
  const have = new Set(data[key].map((x) => x.id));
  const dupes = items.filter((x) => have.has(x.id)).map((x) => x.id);
  if (dupes.length) fail(`${file}: ids already present: ${dupes.join(', ')}`);
  data[key].push(...items);
  data[key].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  write(file, data);
  return items.length;
}

function mergeLessons(lessons) {
  if (!lessons) return 0;
  const data = read('data/lessons.json');
  const dupes = Object.keys(lessons).filter((k) => data.lessons[k]);
  if (dupes.length) fail(`data/lessons.json: lessons already present: ${dupes.join(', ')}`);
  const all = { ...data.lessons, ...lessons };
  const key = (id) => id.split('.').map(Number);
  data.lessons = Object.fromEntries(Object.entries(all).sort(([a], [b]) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1]));
  write('data/lessons.json', data);
  return Object.keys(lessons).length;
}

const counts = {
  questions: mergeList('data/questions.json', 'questions', batch.questions),
  scenarios: mergeList('data/questions.json', 'scenarios', batch.scenarios),
  cards: mergeList('data/cards.json', 'cards', batch.cards),
  lessons: mergeLessons(batch.lessons),
  drills: mergeList('data/drills.json', 'drills', batch.drills),
  labs: mergeList('data/labs.json', 'labs', batch.labs)
};
console.log(`Merged from ${path}: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}.`);
