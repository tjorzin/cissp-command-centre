import { test, expect } from '@playwright/test';

const noOverflow = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test('a new user sees honest empty states and four unmet gates with evidence', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#readiness-link')).toContainText('0/4');
  await page.locator('#readiness-link').click();
  await expect(page.getByRole('heading', { level: 2, name: 'Performance' })).toBeVisible();
  await expect(page.locator('#gates-summary')).toContainText('0 of 4 gates met');
  await expect(page.locator('.gate.unmet')).toHaveCount(4);
  await expect(page.locator('[data-gate="mocks"]')).toContainText('No adaptive mocks taken yet.');
  await expect(page.locator('[data-domain-perf="1"] .acc')).toContainText('Not enough data (0/20)');
  await expect(page.locator('#by-difficulty .not-enough')).toHaveCount(6);
  await expect(page.locator('.spark')).toHaveCount(0);
  await expect(page.getByText(/pass (probability|chance)|score out of 1000/i)).toHaveCount(0);
  await noOverflow(page);
});

test('with history: figures, trend line, calibration warning and a met gate', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#do-next')).toBeVisible(); // let the app finish its first write before seeding
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cissp-cc'));
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Harare' }).format(new Date());
    s.answers = Array.from({ length: 40 }, (_, i) => ({
      at: `${today}T06:00:00.000Z`, domain: 1, objective: '1.9', difficulty: 4, qid: 'd1-001',
      correct: i % 2 === 0, confidence: 'sure', secs: 80
    }));
    s.sessions = [60, 70, 50, 80].map((pctRight, i) => ({
      id: `s${i}`, mode: 'practice', title: 'Practice set', endedAt: `2027-01-0${i + 1}T10:00:00.000Z`,
      byDomain: { 1: { asked: 10, correct: pctRight / 10 } }, items: [], responses: [], correct: 0, presented: 10, answered: 10
    }));
    s.ledger = [];
    localStorage.setItem('cissp-cc', JSON.stringify(s));
  });
  await page.goto('/#/performance');
  await page.reload();

  const d1 = page.locator('[data-domain-perf="1"]');
  await expect(d1.locator('.acc')).toHaveText('50% of 40');
  await expect(d1).toContainText('80 s per question');
  await expect(d1.locator('.spark circle')).toHaveCount(4);
  await expect(d1).toContainText('60% → 80%');
  await expect(page.locator('[data-row="level-4"] .bar-n')).toHaveText('50%');
  await expect(page.locator('[data-row="cal-sure"] .bar-n')).toHaveText('50%');
  await expect(page.locator('#overconfident')).toContainText('right 50% of the time');
  await expect(page.locator('[data-gate="concepts"]')).toHaveClass(/met/);
  await expect(page.locator('[data-gate="concepts"] .gate-state')).toHaveText('Met');
  await noOverflow(page);
});

test('gate thresholds are configurable in Settings', async ({ page }) => {
  await page.goto('/#/more');
  await expect(page.locator('#gate-mockMetric')).toHaveValue('band'); // default
  await page.locator('#gate-mockMetric').selectOption('accuracy');
  await page.locator('#gate-domainMin').fill('80');
  await page.locator('#gate-domainMin').dispatchEvent('change');
  await page.goto('/#/performance');
  await expect(page.locator('[data-gate="mocks"] h3')).toHaveText('75% or more across the last two adaptive mocks');
  await expect(page.locator('[data-gate="domains"] h3')).toHaveText('No domain below 80%');
});
