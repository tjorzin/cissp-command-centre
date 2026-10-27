import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const bank = JSON.parse(readFileSync(new URL('../../data/questions.json', import.meta.url)));
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('cissp-cc')));
const noOverflow = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test('a new user gets 10 new cards due; reviewing them schedules each and updates the counts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#due-today')).toHaveText('10');
  await page.getByRole('link', { name: 'Review cards' }).click();
  await expect(page.locator('#cards-due')).toHaveText('10');
  await page.locator('#review-due').click();

  // Answer stays hidden until flipped.
  await expect(page.locator('.card-back')).toBeHidden();
  await expect(page.locator('[data-rate]').first()).toBeHidden();
  await noOverflow(page);
  const ratings = ['right', 'guess', 'wrong', 'right', 'right', 'right', 'guess', 'right', 'wrong', 'right'];
  for (const r of ratings) {
    await page.locator('#flip').click();
    await expect(page.locator('.card-back')).toBeVisible();
    await page.locator(`[data-rate="${r}"]`).click();
  }
  await expect(page.locator('#deck-tally')).toHaveText('Knew 6 · Guessed 2 · Missed 2');

  const st = await stored(page);
  const cards = Object.entries(st.srs).filter(([k]) => k.startsWith('card:'));
  expect(cards).toHaveLength(10);
  expect(cards.map(([, v]) => v.box).sort()).toEqual([0, 0, 0.5, 0.5, 1, 1, 1, 1, 1, 1]);
  expect(st.srsDay).toMatchObject({ reviews: 10, newCards: 10 });

  await page.getByRole('button', { name: 'Back to cards' }).click();
  await expect(page.locator('#cards-due')).toHaveText('0');
  await expect(page.locator('#reviews-done')).toHaveText('10/30');
  await page.goto('/#/home');
  await expect(page.locator('#due-today')).toHaveText('0');
});

test('filters: from my errors and newly covered follow what you have answered', async ({ page }) => {
  // Miss one Domain 3 crypto question in practice.
  const q = bank.questions.find((x) => x.id === 'd3-002');
  await page.goto('/#/questions');
  await page.locator('#practice-domain').selectOption('3');
  await page.getByRole('button', { name: 'Start practice' }).click();
  for (let i = 0; i < 2; i++) {
    const stem = await page.locator('#stem').textContent();
    const shown = bank.questions.find((x) => x.stem === stem);
    const pick = shown.id === q.id ? shown.options.findIndex((_, j) => !shown.correct.includes(j)) : shown.correct[0];
    await page.locator('label.choice', { hasText: shown.options[pick] }).click();
    await page.locator('[data-confidence="sure"]').click();
    await page.locator('#submit-btn').click();
    await page.locator('#next-btn').click();
  }

  await page.goto('/#/cards');
  await page.locator('[data-filter="errors"]').click();
  await expect(page.locator('[data-card-row]')).toHaveCount(2); // the two 3.6 cards
  await expect(page.locator('[data-card-row="c3-002"]')).toBeVisible();
  await page.locator('[data-filter="newly"]').click();
  await expect(page.locator('[data-card-row]')).toHaveCount(3); // 3.2 and 3.6 cards, none reviewed yet
  await page.locator('#card-domain').selectOption('8');
  await expect(page.locator('[data-card-row]')).toHaveCount(0);
  await noOverflow(page);
});

test('topics answered in practice come back as Topic review the next day', async ({ page }) => {
  await page.goto('/#/questions');
  await expect(page.locator('#mode-review')).toContainText('No topics due today');

  // Seed a topic that fell due yesterday, as if answered earlier in the week.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cissp-cc'));
    s.srs['topic:7.6'] = { box: 1, due: '2000-01-01', last: '1999-12-31', reviews: 1, lapses: 0 };
    localStorage.setItem('cissp-cc', JSON.stringify(s));
  });
  await page.reload();
  await page.locator('#mode-review button').click();
  const stem = await page.locator('#stem').textContent();
  const shown = bank.questions.find((x) => x.stem === stem);
  expect(shown.objective).toBe('7.6');
  await page.locator('label.choice', { hasText: shown.options[shown.correct[0]] }).click();
  await page.locator('[data-confidence="sure"]').click();
  await page.locator('#submit-btn').click();

  const st = await stored(page);
  expect(st.srs['topic:7.6'].box).toBe(2);
  expect(st.srsDay.reviews).toBe(1);
});
