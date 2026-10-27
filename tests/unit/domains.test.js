import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { activeOutline, domainsFor, objectiveFor, formatWeight } from '../../js/domains.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));
const domainsData = read('data/domains.json');
const outlinesData = read('data/outlines.json');

test('eight domains with the outline objective counts (62 in total)', () => {
  const counts = domainsData.domains.map((d) => d.objectives.length);
  assert.deepEqual(counts, [12, 6, 10, 3, 6, 5, 15, 5]);
});

test('objective ids are contiguous and match their domain', () => {
  for (const d of domainsData.domains) {
    d.objectives.forEach((o, i) => assert.equal(o.id, `${d.n}.${i + 1}`));
  }
});

test('every topic has a valid outline tag and no objective repeats a topic', () => {
  for (const d of domainsData.domains) {
    for (const o of d.objectives) {
      assert.ok(o.label && o.label.length > 3, o.id);
      const names = o.topics.map((t) => t.name);
      assert.equal(new Set(names).size, names.length, `duplicate topic in ${o.id}`);
      for (const t of o.topics) assert.ok(['both', '2024', '2027'].includes(t.outline), `${o.id}: ${t.name}`);
    }
  }
});

test('outlines.json and domains.json describe the same eight domains', () => {
  for (const o of outlinesData.outlines) {
    assert.deepEqual(o.domains.map((d) => d.n), domainsData.domains.map((d) => d.n));
  }
});

test('the 2024 view hides 2027-only topics and the 2027 view hides 2024-only ones', () => {
  const find = (id) => domainsData.domains.flatMap((d) => d.objectives).find((o) => o.id === id);
  const crypto24 = objectiveFor(find('3.6'), '2024');
  const crypto27 = objectiveFor(find('3.6'), '2027');
  assert.ok(crypto24.topics.includes('Quantum key distribution'));
  assert.ok(!crypto24.topics.includes('Post-quantum cryptography'));
  assert.ok(crypto27.topics.includes('Post-quantum cryptography'));
  assert.ok(!crypto27.topics.includes('Quantum key distribution'));
  assert.ok(objectiveFor(find('8.2'), '2024').topics.some((t) => t.includes('IAST')));
  assert.ok(!objectiveFor(find('8.2'), '2027').topics.some((t) => t.includes('IAST')));
});

test('2027 relabels are applied only under the 2027 outline', () => {
  const o = domainsData.domains[4].objectives[5]; // 5.6
  assert.equal(objectiveFor(o, '2024').label, 'Authentication systems');
  assert.equal(objectiveFor(o, '2027').label, 'Authentication and authorisation systems');
});

test('domainsFor joins names and weights for the active outline', () => {
  const d24 = domainsFor(domainsData, outlinesData, '2024');
  const d27 = domainsFor(domainsData, outlinesData, '2027');
  assert.equal(d24[0].name, 'Security and Risk Management');
  assert.equal(d24[0].weight, 16);
  assert.equal(d27[0].name, 'Security Governance and Risk Management');
  assert.equal(d27[0].weight, 13.6);
  assert.equal(d24[0].alt.weight, 13.6);
  // Every domain has at least one topic change between the outlines.
  assert.ok(d24.every((d) => d.changeCount > 0), d24.map((d) => `${d.n}:${d.changeCount}`).join(' '));
});

test('active outline follows the target date', () => {
  assert.equal(activeOutline(outlinesData, '2027-03-31').id, '2024');
  assert.equal(activeOutline(outlinesData, '2027-04-15').id, '2027');
});

test('weights format without spurious decimals', () => {
  assert.equal(formatWeight(16), '16%');
  assert.equal(formatWeight(13.6), '13.6%');
});

test('every file in the service worker shell list exists', () => {
  const sw = readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
  const list = sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  for (const p of list.filter((p) => p !== './')) {
    assert.ok(existsSync(new URL(`../../${p}`, import.meta.url)), `missing ${p}`);
  }
});
