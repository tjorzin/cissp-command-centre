// Content validator: schema rules plus the give-away lint from docs/QUESTION-STANDARD.md.
// Usage: node tests/validate-content.js   (exit code 1 on any error)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REQUIRED = ['id', 'domain', 'objective', 'subtopic', 'difficulty', 'type', 'scenario', 'stem', 'options',
  'correct', 'rationales', 'concept', 'trap', 'managerLens', 'practicalNote', 'gap', 'followUpId', 'tags'];

export const LIMITS = {
  lengthRatio: 1.35,         // option length vs mean of the others
  longestCorrectShare: 0.35, // error above this share of single-answer items
  longestCorrectWarn: 0.30,
  keyPositionShare: 0.35,
  minRationale: 40
};

const ABSOLUTES = /\b(always|never|only|all|none|guarantee[sd]?|completely|entirely|every)\b/i;
const BANNED = /\b(all of the above|none of the above|both [a-f] and [a-f])\b/i;
const STOP = new Set(('about above after again against because before being below between could doing during ' +
  'each from further have having into itself just more most other ought ours over same should some such than that ' +
  'their them then there these they this those through under until very what when where which while whom why with ' +
  'would your yours first best next least primary most following question select three security manager company ' +
  'organisation organization team staff system systems already about since without within').split(' '));
const COUNT_WORDS = { 2: 'TWO', 3: 'THREE', 4: 'FOUR' };

// Crude stemmer: enough to match "rostered"/"roster", "devices"/"device".
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');
function distinctive(text) {
  return new Set((text.toLowerCase().match(/[a-z][a-z-]{4,}/g) || [])
    .filter((w) => !STOP.has(w)).map(stem));
}

export function lintQuestion(q, ctx = {}) {
  const errors = [];
  const warnings = [];
  const e = (m) => errors.push(`${q.id || '?'}: ${m}`);
  const w = (m) => warnings.push(`${q.id || '?'}: ${m}`);

  // Schema
  for (const k of REQUIRED) if (!(k in q)) e(`missing field "${k}"`);
  const extra = Object.keys(q).filter((k) => !REQUIRED.includes(k));
  if (extra.length) e(`unknown field(s) ${extra.join(', ')}`);
  if (!/^d[1-8]-\d{3}$/.test(q.id || '')) e('id must look like d1-001');
  if (!Number.isInteger(q.domain) || q.domain < 1 || q.domain > 8) e('domain must be 1 to 8');
  if (q.id && Number(q.id[1]) !== q.domain) e('id prefix does not match domain');
  if (!/^[1-8]\.\d{1,2}$/.test(q.objective || '') || Number(q.objective[0]) !== q.domain) e('objective must match domain, e.g. 1.9');
  if (ctx.objectives && !ctx.objectives.has(q.objective)) e(`objective ${q.objective} does not exist`);
  if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 6) e('difficulty must be 1 to 6');
  if (!['single', 'multi'].includes(q.type)) e('type must be single or multi');
  if (!Array.isArray(q.options) || q.options.length < 4 || q.options.length > 6) e('needs 4 to 6 options');
  if (!Array.isArray(q.rationales) || q.rationales.length !== q.options?.length) e('rationales.length must equal options.length');
  if (!Array.isArray(q.correct) || !q.correct.length) e('correct must be a non-empty list');
  else {
    if (new Set(q.correct).size !== q.correct.length) e('correct has duplicates');
    if (q.correct.some((i) => !Number.isInteger(i) || i < 0 || i >= (q.options?.length || 0))) e('correct index out of range');
    if (q.type === 'single' && q.correct.length !== 1) e('single must have exactly one correct answer');
    if (q.type === 'multi' && q.correct.length < 2) e('multi must have at least two correct answers');
  }
  if (q.scenario !== null && ctx.scenarios && !ctx.scenarios.has(q.scenario)) e(`scenario ${q.scenario} does not exist`);
  if (q.followUpId !== null && ctx.ids && !ctx.ids.has(q.followUpId)) e(`followUpId ${q.followUpId} does not exist`);
  if (q.followUpId === q.id) e('followUpId points to itself');
  if (!Array.isArray(q.tags)) e('tags must be a list');
  for (const k of ['stem', 'subtopic', 'concept', 'trap', 'managerLens', 'practicalNote', 'gap']) {
    if (typeof q[k] !== 'string' || q[k].trim().length < 10) e(`"${k}" is missing or too short`);
  }
  if (errors.length) return { errors, warnings };

  // Give-away lint
  const opts = q.options;
  opts.forEach((o, i) => {
    const others = opts.filter((_, j) => j !== i);
    const mean = others.reduce((a, x) => a + x.length, 0) / others.length;
    if (o.length > mean * LIMITS.lengthRatio) e(`option ${i} is ${Math.round((o.length / mean - 1) * 100)}% longer than the others (length tell)`);
  });

  const stemWords = distinctive(q.stem);
  const echoes = opts.map((o) => [...distinctive(o)].filter((x) => stemWords.has(x)));
  const correctEcho = q.correct.every((i) => echoes[i].length > 0);
  const distractorEcho = opts.some((_, i) => !q.correct.includes(i) && echoes[i].length > 0);
  if (correctEcho && !distractorEcho) {
    e(`only the correct option(s) repeat stem words (${q.correct.map((i) => echoes[i].join('/')).join('; ')})`);
  }

  const absoluteOpts = opts.map((o, i) => (ABSOLUTES.test(o) ? i : -1)).filter((i) => i >= 0);
  if (absoluteOpts.length > 1) e(`absolute words appear in ${absoluteOpts.length} options (${absoluteOpts.join(', ')})`);

  if (opts.some((o) => BANNED.test(o))) e('uses "all/none of the above" or "both A and B"');

  if (q.type === 'multi') {
    const word = COUNT_WORDS[q.correct.length];
    if (!word || !q.stem.includes(`Select ${word}`)) e(`multi stem must say "Select ${word || q.correct.length}"`);
  } else if (/\bSelect (TWO|THREE|FOUR)\b/.test(q.stem)) e('single-answer stem says "Select TWO/THREE"');

  q.rationales.forEach((r, i) => {
    if (r.trim().length < LIMITS.minRationale) e(`rationale ${i} is too thin to explain why`);
  });
  if (q.rationales.some((r, i) => !q.correct.includes(i) && /^correct\b/i.test(r.trim()))) e('a wrong option has a rationale starting "Correct"');
  if (q.correct.some((i) => !/^correct\b/i.test(q.rationales[i].trim()))) w('correct option rationale should start with "Correct."');

  const words = q.stem.split(/\s+/).length;
  if (q.difficulty >= 4 && !q.scenario && words < 40) w(`difficulty ${q.difficulty} stem has only ${words} words`);

  return { errors, warnings, absoluteOpts };
}

export function lintBank(bank, domainsData) {
  const errors = [];
  const warnings = [];
  const qs = bank.questions || [];
  const ids = new Set(qs.map((q) => q.id));
  const scenarios = new Set((bank.scenarios || []).map((s) => s.id));
  const objectives = domainsData ? new Set(domainsData.domains.flatMap((d) => d.objectives.map((o) => o.id))) : null;

  if (ids.size !== qs.length) errors.push('duplicate question ids');

  for (const s of bank.scenarios || []) {
    for (const qid of s.questionIds) {
      const q = qs.find((x) => x.id === qid);
      if (!q) errors.push(`${s.id}: lists missing question ${qid}`);
      else if (q.scenario !== s.id) errors.push(`${s.id}: question ${qid} does not point back to it`);
    }
  }

  let absoluteTotal = 0;
  let absoluteWrong = 0;
  for (const q of qs) {
    const r = lintQuestion(q, { ids, scenarios, objectives });
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    for (const i of r.absoluteOpts || []) {
      absoluteTotal++;
      if (!q.correct.includes(i)) absoluteWrong++;
    }
  }
  if (errors.length) return { errors, warnings, stats: null };

  // Bank-level checks
  const singles = qs.filter((q) => q.type === 'single');
  const multis = qs.filter((q) => q.type === 'multi');
  const positions = {};
  let longestCorrect = 0;
  for (const q of singles) {
    const k = q.correct[0];
    positions[k] = (positions[k] || 0) + 1;
    const lens = q.options.map((o) => o.length);
    const max = Math.max(...lens);
    if (lens[k] === max && lens.filter((l) => l === max).length === 1) longestCorrect++;
  }
  for (const [pos, n] of Object.entries(positions)) {
    if (n / singles.length > LIMITS.keyPositionShare) errors.push(`answer key: position ${pos} holds ${n}/${singles.length} single-answer keys (> ${LIMITS.keyPositionShare * 100}%)`);
  }
  const lcShare = singles.length ? longestCorrect / singles.length : 0;
  if (lcShare > LIMITS.longestCorrectShare) errors.push(`correct option is the single longest in ${longestCorrect}/${singles.length} questions`);
  else if (lcShare > LIMITS.longestCorrectWarn) warnings.push(`correct option is the single longest in ${longestCorrect}/${singles.length} questions`);

  const multiCounts = new Set(multis.map((q) => q.correct.length));
  if (multis.length >= 4 && multiCounts.size < 2) errors.push('all multi-select questions need the same number of answers (a tell)');
  const multiShare = qs.length ? multis.length / qs.length : 0;
  if (multiShare < 0.25 || multiShare > 0.30) warnings.push(`multi-select share is ${Math.round(multiShare * 100)}% (target 25 to 30%)`);
  if (absoluteTotal >= 5 && absoluteWrong / absoluteTotal > 0.8) warnings.push(`options with absolute words are wrong ${absoluteWrong}/${absoluteTotal} times (a tell)`);

  const byDifficulty = {};
  for (const q of qs) byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
  const low = (byDifficulty[1] || 0) + (byDifficulty[2] || 0);
  const high = (byDifficulty[4] || 0) + (byDifficulty[5] || 0) + (byDifficulty[6] || 0);
  if (low / qs.length > 0.15) warnings.push(`difficulty 1-2 is ${Math.round(low / qs.length * 100)}% (max 15%)`);
  if (high / qs.length < 0.6) warnings.push(`difficulty 4-6 is ${Math.round(high / qs.length * 100)}% (min 60%)`);

  const byDomain = {};
  for (const q of qs) byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;

  return {
    errors,
    warnings,
    stats: {
      questions: qs.length,
      scenarios: (bank.scenarios || []).length,
      single: singles.length,
      multi: multis.length,
      multiByCount: Object.fromEntries([...multiCounts].map((c) => [c, multis.filter((q) => q.correct.length === c).length])),
      keyPositions: positions,
      longestCorrect: `${longestCorrect}/${singles.length}`,
      byDomain,
      byDifficulty
    }
  };
}

// Cards are cram material: every field present, short enough to read on a phone in one glance.
export const CARD_LIMITS = { term: 70, meaning: 320, trap: 200, hook: 90 };

export function lintCards(deck, domainsData) {
  const errors = [];
  const cards = deck.cards || [];
  const objectives = new Set(domainsData.domains.flatMap((d) => d.objectives.map((o) => o.id)));
  const ids = new Set();
  for (const c of cards) {
    const e = (m) => errors.push(`${c.id || '?'}: ${m}`);
    if (!/^c[1-8]-\d{3}$/.test(c.id || '')) e('id must look like c1-001');
    if (ids.has(c.id)) e('duplicate id');
    ids.add(c.id);
    if (Number(c.id?.[1]) !== c.domain) e('id prefix does not match domain');
    if (!objectives.has(c.objective) || Number(c.objective[0]) !== c.domain) e(`objective ${c.objective} invalid for domain ${c.domain}`);
    for (const [k, max] of Object.entries(CARD_LIMITS)) {
      if (typeof c[k] !== 'string' || c[k].trim().length < 5) e(`"${k}" missing`);
      else if (c[k].length > max) e(`"${k}" is ${c[k].length} characters (max ${max} for a cram card)`);
    }
    if (!Array.isArray(c.tags)) e('tags must be a list');
  }
  const domains = new Set(cards.map((c) => c.domain));
  return { errors, stats: { cards: cards.length, domainsCovered: domains.size } };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
  const result = lintBank(read('data/questions.json'), read('data/domains.json'));
  const cards = lintCards(read('data/cards.json'), read('data/domains.json'));
  result.errors.push(...cards.errors);
  console.log(`Cards: ${cards.stats.cards} across ${cards.stats.domainsCovered} domains`);
  for (const m of result.errors) console.log(`ERROR   ${m}`);
  for (const m of result.warnings) console.log(`warning ${m}`);
  if (result.stats) console.log(JSON.stringify(result.stats, null, 2));
  console.log(result.errors.length ? `\n${result.errors.length} error(s)` : '\nNo errors.');
  process.exit(result.errors.length ? 1 : 0);
}
