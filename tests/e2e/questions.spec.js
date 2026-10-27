import { test, expect } from '@playwright/test';
import { noOverflow } from './helpers.js';
import { readFileSync } from 'node:fs';

const bank = JSON.parse(readFileSync(new URL('../../data/questions.json', import.meta.url)));
const byStem = (stem) => bank.questions.find((q) => q.stem === stem);

// Answers the question on screen, right or wrong, with the given confidence.
async function answer(page, { right, confidence = 'sure' }) {
  const q = byStem(await page.locator('#stem').textContent());
  const picks = right ? q.correct : q.options.map((_, i) => i).filter((i) => !q.correct.includes(i)).slice(0, q.correct.length);
  for (const i of picks) await page.locator('label.choice', { hasText: q.options[i] }).click();
  await page.locator(`[data-confidence="${confidence}"]`).click();
  await page.locator('#submit-btn').click();
  return q;
}


test('practice: confidence is required, feedback explains every option, results and weakness update', async ({ page }) => {
  await page.goto('/#/questions');
  await page.locator('#practice-size').selectOption('10');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page).toHaveURL(/#\/session/);

  // Submit stays disabled until an answer and a confidence rating are both given.
  const first = byStem(await page.locator('#stem').textContent());
  const wrong = first.options.findIndex((_, i) => !first.correct.includes(i));
  await page.locator('label.choice', { hasText: first.options[wrong] }).click();
  if (first.type === 'single') await expect(page.locator('#submit-btn')).toBeDisabled();
  await page.locator('[data-confidence="sure"]').click();
  if (first.type === 'multi') {
    await expect(page.locator('#submit-btn')).toBeDisabled();
    const second = first.options.findIndex((_, i) => i !== wrong && !first.correct.includes(i));
    for (const i of [second, ...first.correct.slice(2)]) await page.locator('label.choice', { hasText: first.options[i] }).click();
  }
  await page.locator('#submit-btn').click();

  await expect(page.locator('.verdict')).toContainText('Incorrect');
  await expect(page.locator('.reviewed .rationale')).toHaveCount(first.options.length);
  await expect(page.locator('.reviewed [data-key="true"]')).toHaveCount(first.correct.length);
  await expect(page.locator('.checklist')).toContainText('Is this the first step or the best step?');
  await noOverflow(page);
  await page.locator('#next-btn').click();

  for (let i = 1; i < 10; i++) {
    await answer(page, { right: true });
    await page.locator('#next-btn').click();
  }
  await expect(page).toHaveURL(/#\/results\//);
  await expect(page.locator('#score')).toHaveText('9/10');
  await expect(page.locator('.review-item')).toHaveCount(10);
  await noOverflow(page);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cissp-cc')));
  expect(stored.answers).toHaveLength(10);
  expect(stored.answers[0]).toMatchObject({ qid: first.id, correct: false, confidence: 'sure', mode: 'practice' });
  expect(stored.sessions).toHaveLength(1);
  expect(stored.studyDays).toHaveLength(1);

  // Weakness drill now starts with the missed question.
  await page.goto('/#/questions');
  await page.locator('#mode-weakness button').click();
  await expect(page.locator('#stem')).toHaveText(first.stem);
});

test('scenario set shows the case study and keeps question order', async ({ page }) => {
  const sc = bank.scenarios[0];
  await page.goto('/#/questions');
  await page.locator(`[data-scenario="${sc.id}"]`).click();
  await expect(page.locator('.scenario')).toContainText('Mutapa Telecom');
  await expect(page.locator('.session')).not.toContainText(/\bnull\b|\bundefined\b/);
  for (const id of sc.questionIds) {
    await expect(page.locator('#stem')).toHaveText(bank.questions.find((q) => q.id === id).stem);
    await answer(page, { right: true, confidence: 'unsure' });
    await page.locator('#next-btn').click();
  }
  await expect(page.locator('#score')).toHaveText(`${sc.questionIds.length}/${sc.questionIds.length}`);
});

test('mini exam is timed, gives no feedback until the end, and can be ended early', async ({ page }) => {
  await page.goto('/#/questions');
  await page.locator('#mode-mini button').click();
  const size = Math.min(25, bank.questions.length);
  const mins = Math.floor((size * 90) / 60);
  await expect(page.locator('#timer')).toHaveText(new RegExp(`^(${mins - 1}|${mins}):\\d\\d$`)); // size x 90 s
  const before = await page.locator('#stem').textContent();
  await answer(page, { right: false, confidence: 'guess' });
  await expect(page.locator('.verdict')).toHaveCount(0);
  await expect(page.locator('#stem')).not.toHaveText(before);

  page.once('dialog', (d) => d.accept());
  await page.locator('#end-btn').click();
  await expect(page).toHaveURL(/#\/results\//);
  await expect(page.locator('#score')).toHaveText(`0/${size}`);
  await expect(page.locator('.domain-table tbody tr')).toHaveCount(1);
});

test('an unfinished session survives a reload and can be resumed', async ({ page }) => {
  await page.goto('/#/questions');
  await page.locator('#mode-hard button').click();
  await answer(page, { right: true });
  await page.reload();
  await expect(page.locator('.verdict')).toContainText('Correct'); // the answered question's review is restored
  await page.goto('/#/questions');
  await expect(page.locator('.resume')).toContainText('Hard mode');
  await page.getByRole('link', { name: 'Resume' }).click();
  await expect(page.locator('#next-btn')).toBeVisible();
});

test('adaptive mock is locked until the bank is large enough, and says why', async ({ page }) => {
  await page.goto('/#/questions');
  await expect(page.locator('#mode-mock .locked')).toContainText('150');
  await expect(page.locator('#mode-mock button')).toHaveCount(0);
  await noOverflow(page);
});
