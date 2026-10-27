import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('home loads at 360 px with no horizontal scroll and the outline warning', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.locator('[data-notice="near"]')).toContainText('14 April 2027');
  await expect(page.locator('#offline-pill')).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('no element spills outside its card at 360 px on Settings', async ({ page }) => {
  await page.goto('/#/more');
  const spills = await page.evaluate(() => [...document.querySelectorAll('.card')].flatMap((card) => {
    const c = card.getBoundingClientRect();
    return [...card.querySelectorAll('input, select, button')]
      .filter((el) => !el.hidden && el.getBoundingClientRect().right > c.right + 0.5)
      .map((el) => el.id || el.getAttribute('aria-label') || el.tagName);
  }));
  expect(spills).toEqual([]);
});

test('bottom navigation reaches every tab', async ({ page }) => {
  await page.goto('/');
  for (const [tab, heading] of [['Study', 'Study'], ['Questions', 'Questions'], ['Ledger', 'Error Ledger'], ['More', 'Settings'], ['Today', 'Today']]) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: tab }).click();
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
});

test('moving the target past 14 April 2027 switches the warning and persists', async ({ page }) => {
  await page.goto('/#/more');
  await page.locator('#target-date').fill('2027-04-20');
  await page.locator('#target-date').dispatchEvent('change');
  await expect(page.locator('[data-notice="switched"]')).toContainText('2027 outline');
  await page.reload();
  await expect(page.locator('#target-date')).toHaveValue('2027-04-20');
  await expect(page.locator('[data-notice="switched"]')).toBeVisible();
});

test('export then import round-trips progress', async ({ page }, testInfo) => {
  await page.goto('/#/more');
  await page.locator('#review-cap').fill('45');
  await page.locator('#review-cap').dispatchEvent('change');

  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-btn').click()]);
  const file = testInfo.outputPath('progress.json');
  await download.saveAs(file);
  const exported = JSON.parse(readFileSync(file, 'utf8'));
  expect(exported.app).toBe('cissp-command-centre');
  expect(exported.state.settings.dailyReviewCap).toBe(45);

  // Wipe, confirm the value is gone, then import the file back.
  // Both actions reload the page themselves, so wait for that reload before reading.
  page.once('dialog', (d) => d.accept());
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Erase all progress' }).click()]);
  await expect(page.locator('#review-cap')).toHaveValue('30');

  await Promise.all([page.waitForEvent('load'), page.locator('#import-file').setInputFiles(file)]);
  await expect(page.locator('#review-cap')).toHaveValue('45');
});

test('app loads offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // let the service worker take control of the page
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.locator('#offline-pill')).toBeVisible();
  await expect(page.locator('[data-notice="near"]')).toBeVisible(); // data/outlines.json served from cache
  await context.setOffline(false);
});

test('storage blocked: app still runs and warns', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByText('Progress is not being saved')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await context.close();
});
