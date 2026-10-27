// Randomness and domain-mix proof over many simulated papers.
// Usage: node tests/sim-papers.js [papers]   (prints a summary for VALIDATION.md)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { mulberry32 } from '../js/engine/rng.js';
import { buildMini, allocate } from '../js/engine/bank.js';
import { createMock, nextQuestion, recordMock, mockDone, MOCK } from '../js/engine/mock.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));

// A synthetic bank large enough to exercise the mock: 80 questions per domain, levels 1 to 6.
export function syntheticBank(perDomain = 80) {
  const qs = [];
  for (let d = 1; d <= 8; d++) {
    for (let i = 0; i < perDomain; i++) {
      qs.push({ id: `d${d}-${String(i + 1).padStart(3, '0')}`, domain: d, objective: `${d}.1`, difficulty: (i % 6) + 1,
        type: 'single', options: ['a', 'b', 'c', 'd'], correct: [i % 4], tags: [] });
    }
  }
  return qs;
}

export function simulateMinis(questions, weights, papers, size) {
  const signatures = new Set();
  const orders = new Map(); // question id -> set of option orders seen
  const domainTotals = Object.fromEntries(weights.map((w) => [w.n, 0]));
  let n = 0;
  for (let p = 0; p < papers; p++) {
    const paper = buildMini(questions, weights, mulberry32(1000 + p), size);
    n = paper.length;
    signatures.add(paper.map((i) => `${i.id}:${i.order.join('')}`).join('|'));
    for (const item of paper) {
      if (!orders.has(item.id)) orders.set(item.id, new Set());
      orders.get(item.id).add(item.order.join(''));
      domainTotals[questions.find((q) => q.id === item.id).domain]++;
    }
  }
  const expected = allocate(weights, n);
  const domainMean = Object.fromEntries(Object.entries(domainTotals).map(([d, t]) => [d, t / papers]));
  const orderCounts = [...orders.values()].map((s) => s.size);
  return {
    papers, size: n,
    distinctPapers: signatures.size,
    questionsSeen: orders.size,
    minOrdersPerQuestion: Math.min(...orderCounts),
    meanOrdersPerQuestion: Math.round(orderCounts.reduce((a, b) => a + b, 0) / orderCounts.length * 10) / 10,
    expectedPerDomain: expected,
    meanPerDomain: domainMean
  };
}

// Mock runs with a simulated candidate whose chance of being right falls with difficulty.
export function simulateMocks(questions, weights, runs, skill) {
  const lengths = [];
  let worstDeviation = 0;
  const bands = { above: 0, borderline: 0, below: 0 };
  for (let r = 0; r < runs; r++) {
    const rng = mulberry32(5000 + r);
    const state = createMock(weights);
    while (!mockDone(state, questions.length - state.items.length)) {
      const q = nextQuestion(state, questions, rng);
      if (!q) break;
      const pCorrect = Math.max(0.05, Math.min(0.95, 0.5 + (skill - q.difficulty) * 0.18));
      recordMock(state, q, rng() < pCorrect);
      const k = state.items.length;
      for (const w of weights) worstDeviation = Math.max(worstDeviation, Math.abs(state.counts[w.n] - (w.weight / 100) * k));
    }
    lengths.push(state.items.length);
    const recent = state.items.slice(-MOCK.window);
    const lvl = recent.reduce((a, i) => a + i.difficulty, 0) / recent.length;
    bands[lvl >= MOCK.high ? 'above' : lvl <= MOCK.low ? 'below' : 'borderline']++;
  }
  return { runs, skill, minLength: Math.min(...lengths), maxLength: Math.max(...lengths), worstDomainDeviation: Math.round(worstDeviation * 100) / 100, bands };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const papers = Number(process.argv[2] || 300);
  const outlines = read('data/outlines.json').outlines;
  const w2024 = outlines.find((o) => o.id === '2024').domains;
  const seed = read('data/questions.json').questions;
  const synth = syntheticBank();
  console.log('Mini exams, seed bank:', JSON.stringify(simulateMinis(seed, w2024, papers, 25), null, 1));
  console.log('Mini exams, synthetic 640-question bank:', JSON.stringify(simulateMinis(synth, w2024, papers, 25), null, 1));
  for (const skill of [2.5, 4, 5.5]) console.log(`Mocks, skill ${skill}:`, JSON.stringify(simulateMocks(synth, w2024, papers, skill)));
}
