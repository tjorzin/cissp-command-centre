// Merges a content batch into data/questions.json (and cards.json if the batch has cards).
// Usage: node tools/merge-batch.js content/batches/d1.json
// Refuses duplicate ids. Run `npm run validate` afterwards.
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) { console.error('Usage: node tools/merge-batch.js <batch.json>'); process.exit(1); }
const batch = JSON.parse(readFileSync(path, 'utf8'));
const write = (file, obj) => writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`);

function merge(file, key, items) {
  if (!items?.length) return 0;
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const have = new Set(data[key].map((x) => x.id));
  const dupes = items.filter((x) => have.has(x.id)).map((x) => x.id);
  if (dupes.length) { console.error(`${file}: ids already present: ${dupes.join(', ')}`); process.exit(1); }
  data[key].push(...items);
  data[key].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  write(file, data);
  return items.length;
}

const q = merge('data/questions.json', 'questions', batch.questions);
const s = merge('data/questions.json', 'scenarios', batch.scenarios);
const c = merge('data/cards.json', 'cards', batch.cards);
console.log(`Merged ${q} questions, ${s} scenarios, ${c} cards from ${path}.`);
