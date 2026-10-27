import { test, expect } from '@playwright/test';
import { noOverflow } from './helpers.js';


test('Domain 1 page: lesson, worked scenario, practise and cards for an objective', async ({ page }) => {
  await page.goto('/#/study/1');
  const risk = page.locator('[data-objective="1.9"]');
  await risk.locator('.lesson-block > summary').click();
  await expect(risk.locator('.lesson-block ol li')).toHaveCount(5);
  await expect(risk.locator('.lesson-block')).toContainText('Residual risk');
  await risk.locator('.lesson-block details summary').click();
  await expect(risk.locator('.lesson-block details p')).toContainText('not justified');
  await noOverflow(page);

  await risk.locator('[data-practise="1.9"]').click();
  await expect(page).toHaveURL(/#\/session/);
  await expect(page.locator('.session-head')).toContainText('Practice: 1.9');

  await page.goto('/#/study/1');
  await page.locator('[data-objective="1.9"] a', { hasText: 'Cards' }).click();
  await expect(page).toHaveURL(/#\/cards\/1\.9/);
  await expect(page.locator('[data-card-row]')).toHaveCount(4);
});

test('comparison drill: revise, answer every scenario, score is saved', async ({ page }) => {
  await page.goto('/#/study');
  await page.locator('#drills-link').click();
  await page.locator('[data-drill="dr-recovery-metrics"]').click();
  const drills = await (await fetch('http://127.0.0.1:4173/data/drills.json')).json();
  const drill = drills.drills.find((d) => d.id === 'dr-recovery-metrics');
  for (let i = 0; i < drill.prompts.length; i++) {
    const text = await page.locator('#drill-prompt').textContent();
    const p = drill.prompts.find((x) => x.text === text);
    await page.locator(`[data-choice="${i === 0 ? drill.items.find((it) => it.name !== p.answer).name : p.answer}"]`).click();
    await expect(page.locator('.drill-feedback .verdict')).toHaveText(i === 0 ? `Not quite: ${p.answer}` : 'Right');
    await noOverflow(page);
    await page.locator('#drill-next').click();
  }
  await expect(page.locator('#drill-score')).toHaveText(`${drill.prompts.length - 1} of ${drill.prompts.length} right`);
  await page.goto('/#/drills');
  await expect(page.locator('[data-drill="dr-recovery-metrics"] .weight')).toHaveText(`${drill.prompts.length - 1}/${drill.prompts.length}`);
});

test('lab: test-environment warning, steps persist, completion needs every step', async ({ page }) => {
  await page.goto('/#/labs');
  await expect(page.locator('.lab-warning')).toContainText('LAB / TEST ENVIRONMENT');
  await page.locator('[data-lab="lab-d1-risk-register"]').click();
  await expect(page.locator('.lab-warning')).toContainText('fictional data only');
  await expect(page.locator('#lab-complete')).toBeDisabled();
  const steps = page.locator('.lab-steps input');
  const n = await steps.count();
  for (let i = 0; i < n - 1; i++) await steps.nth(i).check();
  await page.reload();
  await expect(page.locator('.lab-steps input:checked')).toHaveCount(n - 1);
  await expect(page.locator('#lab-complete')).toBeDisabled();
  await page.locator('.lab-steps input').nth(n - 1).check();
  await page.locator('#lab-complete').click();
  await expect(page.locator('#lab-complete')).toContainText('Completed');
  await page.goto('/#/labs');
  await expect(page.locator('[data-lab="lab-d1-risk-register"] .weight')).toHaveText('Done');
  await noOverflow(page);
});

test('Domain 2 page has a lesson for every objective; labs list in day order', async ({ page }) => {
  await page.goto('/#/study/2');
  await expect(page.locator('.objective')).toHaveCount(6);
  await expect(page.locator('.objective .lesson-block')).toHaveCount(6);
  await page.goto('/#/labs');
  const titles = await page.locator('[data-lab] h3').allTextContents();
  const days = titles.map((t) => Number(t.match(/^Day (\d+)/)[1]));
  expect(days).toEqual([...days].sort((x, y) => x - y));
  expect(days.length).toBeGreaterThanOrEqual(6);
  await noOverflow(page);
});

test('lab commands render as code and scroll inside their block, not the page', async ({ page }) => {
  await page.goto('/#/labs/lab-d3-test-pki');
  await expect(page.locator('.lab-steps code.cmd').first()).toContainText('openssl req -x509');
  await noOverflow(page);
});

test('the overflow check catches content clipped by the page', async ({ page }) => {
  await page.goto('/#/study');
  await page.locator('.domain-link').first().waitFor();
  await page.evaluate(() => {
    const wide = document.createElement('div');
    wide.style.width = '900px';
    wide.textContent = 'too wide';
    document.querySelector('main').append(wide);
  });
  await expect(noOverflow(page)).rejects.toThrow(/elements wider than the viewport/);
});
