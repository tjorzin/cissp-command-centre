import { test, expect } from '@playwright/test';
import { noOverflow } from './helpers.js';
import { readFileSync } from 'node:fs';

const bank = JSON.parse(readFileSync(new URL('../../data/questions.json', import.meta.url)));
const byStem = (stem) => bank.questions.find((q) => q.stem === stem);
const harare = (iso) => new Date(`${iso}+02:00`);
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('cissp-cc')));

async function answerShown(page, right, confidence = 'sure') {
  const q = byStem(await page.locator('#stem').textContent());
  const wrong = q.options.map((_, i) => i).filter((i) => !q.correct.includes(i)).slice(0, q.correct.length);
  for (const i of right(q) ? q.correct : wrong) await page.locator('label.choice', { hasText: q.options[i] }).click();
  await page.locator(`[data-confidence="${confidence}"]`).click();
  await page.locator('#submit-btn').click();
  return q;
}

test('first run: Today leads with the baseline diagnostic, which then becomes the baseline', async ({ page }) => {
  await page.clock.setFixedTime(harare('2026-10-28T06:30:00'));
  await page.goto('/');
  await expect(page.locator('#do-next h3')).toHaveText('Baseline diagnostic');
  await expect(page.locator('[data-block]')).toHaveCount(3);
  await expect(page.locator('#today-line')).toContainText('Learn phase · 22 weeks to 31 March 2027');
  await noOverflow(page);

  await page.locator('#do-next-btn').click();
  await expect(page).toHaveURL(/#\/session/);
  // Six per domain where the bank has them: answer until the results page appears.
  const size = [1, 2, 3, 4, 5, 6, 7, 8].reduce((a, d) => a + Math.min(6, bank.questions.filter((q) => q.domain === d).length), 0);
  for (let i = 0; i < size; i++) {
    await answerShown(page, (q) => q.domain !== 4, 'unsure');
    if (i < size - 1) await expect(page.locator('.session .verdict')).toHaveCount(0); // no feedback until the end
  }
  await expect(page).toHaveURL(/#\/results\//);

  const st = await stored(page);
  expect(st.baseline.presented).toBe(size);
  expect(st.baseline.byDomain['4']).toEqual({ asked: Math.min(6, bank.questions.filter((q) => q.domain === 4).length), correct: 0 });

  await page.goto('/#/home');
  await expect(page.locator('[data-task="baseline"]')).toHaveCount(0);
  await expect(page.locator('#do-next h3')).not.toHaveText('Baseline diagnostic');
  // Domain 4 scored 0 on the baseline and is the heaviest weak domain: it is today's focus.
  await expect(page.locator('[data-block="afternoon"] [data-task="focus"] .task-title')).toContainText('Domain 4');
});

test('the "due now" banner appears on other screens once a block time has passed', async ({ page }) => {
  await page.clock.setFixedTime(harare('2026-10-28T14:05:00'));
  await page.goto('/#/study');
  await expect(page.locator('[data-notice="due-now"]')).toContainText('Afternoon block due now (13:00)');
  await page.locator('[data-notice="due-now"] a').click();
  await expect(page.getByRole('heading', { level: 2, name: 'Today' })).toBeVisible();
  await expect(page.locator('[data-notice="due-now"]')).toHaveCount(0); // Today already leads with it

  await page.clock.setFixedTime(harare('2026-10-28T05:00:00'));
  await page.goto('/#/study');
  await page.reload();
  await expect(page.locator('[data-notice="due-now"]')).toHaveCount(0); // before the first block
});

test('reminder settings: calendar file with three daily alarms, and notification status', async ({ page }) => {
  await page.goto('/#/more');
  await expect(page.locator('#notify-state')).toContainText(/Notifications are (off|blocked)/); // headless starts blocked
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#calendar-btn').click()]);
  expect(download.suggestedFilename()).toBe('cissp-reminders.ics');
  const text = readFileSync(await download.path(), 'utf8');
  expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  expect(text).toContain('RRULE:FREQ=DAILY;UNTIL=20270330T235959Z');
});

test('notifications: granted permission shows a reminder at the block time', async ({ page }) => {
  await page.clock.install({ time: harare('2026-10-28T12:59:30') });
  await page.addInitScript(() => {
    // Headless Chromium reports notifications as denied whatever is granted, so report
    // "granted" here; this tests the app's logic, not the browser's permission prompt.
    // Notifications are recorded instead of shown. The app shows them through the
    // service worker registration, as an installed PWA should.
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
    window.__shown = [];
    ServiceWorkerRegistration.prototype.showNotification = function (title) {
      window.__shown.push(title);
      return Promise.resolve();
    };
  });
  await page.goto('/');
  await expect(page.locator('#do-next')).toBeVisible();
  await page.clock.runFor(60000);
  // Block length depends on how many questions the bank has for today's focus domain.
  await expect.poll(() => page.evaluate(() => window.__shown)).toEqual([expect.stringMatching(/^Afternoon block: about \d+ min$/)]);
});

// The brief's functional test: practice with forced wrong answers, then check the ledger
// entry, the Patterns panel, the Weakness-mode set and the next day's plan.
test('functional run: forced misses update ledger, patterns, weakness set and the next-day plan', async ({ page }) => {
  await page.clock.setFixedTime(harare('2026-10-28T09:00:00'));
  await page.goto('/');
  await expect(page.locator('#do-next')).toBeVisible(); // let the app finish its first write before seeding
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cissp-cc'));
    s.baseline = { at: '2026-10-28T06:00:00.000Z', presented: 24, correct: 18, byDomain: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((d) => [d, { asked: 3, correct: 2 }])) };
    localStorage.setItem('cissp-cc', JSON.stringify(s));
  });
  await page.reload();

  // Three practice rounds on Domain 7, every answer wrong and marked "sure".
  for (let round = 0; round < 3; round++) {
    await page.goto('/#/questions');
    await page.locator('#practice-domain').selectOption('7');
    await page.getByRole('button', { name: 'Start practice' }).click();
    for (let i = 0; i < 3; i++) {
      await answerShown(page, () => false, 'sure');
      await page.locator('#next-btn').click();
    }
    await expect(page).toHaveURL(/#\/results\//);
  }

  // Ledger entry and Patterns panel
  await page.goto('/#/ledger');
  await expect(page.locator('#ledger-total')).toHaveText('9');
  await expect(page.locator('#ledger-misconceptions')).toHaveText('9');
  await expect(page.locator('#repeat-topics li')).toHaveCount(3);
  await expect(page.locator('[data-due]')).toHaveCount(3);
  const st = await stored(page);
  expect(st.ledger[0]).toMatchObject({ domain: 7, confidence: 'sure', kind: 'wrong' });
  expect(st.ledger[0].whyWrong.length).toBeGreaterThan(0);

  // Weakness set: drills Domain 7 objectives (it opens on a reteach card first: 3 misses each).
  await page.locator('#drill-weak').click();
  await expect(page.locator('[data-reteach^="7."]')).toBeVisible();

  // Next day: the plan re-plans from the misses.
  await page.goto('/#/questions');
  await page.getByRole('button', { name: 'Abandon' }).click({ trial: false }).catch(() => {});
  await page.clock.setFixedTime(harare('2026-10-29T06:00:00'));
  await page.goto('/#/home');
  await page.reload();
  const morning = page.locator('[data-block="morning"]');
  await expect(morning.locator('[data-task="reteach"]')).toContainText('Reteach 7.');
  await expect(morning.locator('[data-task="topics"]')).toContainText('Topic review: 3 due');
  await expect(page.locator('#do-next h3')).toContainText('Reteach 7.');
  await expect(page.locator('#streak')).toHaveText('1'); // studied yesterday, today not yet: no penalty
  await noOverflow(page);
});
