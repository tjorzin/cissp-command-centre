import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const bank = JSON.parse(readFileSync(new URL('../../data/questions.json', import.meta.url)));
const byStem = (stem) => bank.questions.find((q) => q.stem === stem);

async function answer(page, { right, confidence }) {
  const q = byStem(await page.locator('#stem').textContent());
  const wrong = q.options.map((_, i) => i).filter((i) => !q.correct.includes(i)).slice(0, q.correct.length);
  for (const i of right ? q.correct : wrong) await page.locator('label.choice', { hasText: q.options[i] }).click();
  await page.locator(`[data-confidence="${confidence}"]`).click();
  await page.locator('#submit-btn').click();
  return q;
}

async function practiseDomain(page, domain) {
  await page.goto('/#/questions');
  await page.locator('#practice-domain').selectOption(String(domain));
  await page.getByRole('button', { name: 'Start practice' }).click();
}

const noOverflow = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test('forced misses fill the ledger; misconceptions lead the Patterns panel; one-tap tagging persists', async ({ page }) => {
  await page.goto('/#/ledger');
  await expect(page.getByText('Nothing recorded yet')).toBeVisible();

  await practiseDomain(page, 5); // three questions
  const q1 = await answer(page, { right: false, confidence: 'sure' });
  await page.locator('.class-picker [data-class="tech-vs-mgmt"]').click();
  await expect(page.locator('.class-picker [data-class="tech-vs-mgmt"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#next-btn').click();
  await answer(page, { right: true, confidence: 'guess' });
  await page.locator('#next-btn').click();
  await answer(page, { right: false, confidence: 'unsure' });
  await page.locator('#next-btn').click();
  await expect(page).toHaveURL(/#\/results\//);

  await page.getByRole('link', { name: 'Ledger' }).click();
  await expect(page.locator('#ledger-total')).toHaveText('3');
  await expect(page.locator('#ledger-misconceptions')).toHaveText('1');
  await expect(page.locator('#misconceptions li').first()).toContainText(q1.subtopic);
  await expect(page.locator('[data-class-count="tech-vs-mgmt"] .bar-n')).toHaveText('1');

  // The entry shows why the choice was wrong and the correct mental model.
  const entry = page.locator('.entry.misconception');
  await entry.locator('summary').click();
  await expect(entry).toContainText('Why your choice was wrong');
  await expect(entry).toContainText(q1.concept);
  await noOverflow(page);

  // Filters
  await page.locator('[data-filter="guess"]').click();
  await expect(page.locator('.entry')).toHaveCount(1);
  await page.locator('[data-filter="untagged"]').click();
  await expect(page.locator('.entry')).toHaveCount(2);

  // Tag from the ledger, reload, still tagged.
  await page.locator('[data-filter="all"]').click();
  const untagged = page.locator('.entry').filter({ hasNot: page.locator('.misconception') }).last();
  await untagged.locator('summary').click();
  await untagged.locator('[data-class="recall"]').click();
  await page.reload();
  await expect(page.locator('[data-class-count="recall"] .bar-n')).toHaveText('1');

  // Weakness drill launched from the Patterns panel starts on a missed question.
  await page.locator('#drill-weak').click();
  const first = byStem(await page.locator('#stem').textContent());
  expect(['5.4', '5.5', '5.2']).toContain(first.objective);
});

test('three misses on one objective trigger a reteach card before more questions on it', async ({ page }) => {
  // Practise objective 2.4 only (it has more than three questions) and miss three in a row.
  await page.goto('/#/study/2');
  await page.locator('[data-practise="2.4"]').click();
  for (const confidence of ['sure', 'unsure', 'sure']) {
    await answer(page, { right: false, confidence });
    await page.locator('#next-btn').click();
  }

  // Third miss reached: the next 2.4 question is held behind the reteach card.
  const card = page.locator('[data-reteach="2.4"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Missed 3 times');
  await expect(page.locator('#stem')).toHaveCount(0);
  await expect(page.locator('#reteach-done')).toBeDisabled();
  await page.locator('#teach-back').fill('Short.');
  await expect(page.locator('#reteach-done')).toBeDisabled();
  await page.locator('#teach-back').fill('The controller stays accountable to data subjects, so I check who decides purposes first. For SSDs I purge with sanitise or crypto erase, never degauss.');
  await page.locator('#reteach-done').click();
  await expect(page.locator('#stem')).toBeVisible();
  await noOverflow(page);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cissp-cc')));
  expect(stored.reteach['2.4'].teachBack).toContain('controller');

  // The Ledger shows no reteach due any more.
  await page.goto('/#/ledger');
  await expect(page.locator('[data-due]')).toHaveCount(0);
});

test('the Ledger lists reteach due and links to it; exam modes are not interrupted', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#do-next')).toBeVisible(); // let the app finish its first write before seeding
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cissp-cc'));
    const base = { domain: 2, objective: '2.4', subtopic: 'Data roles', difficulty: 4, kind: 'wrong', confidence: 'sure', mode: 'practice',
      stem: 'x', selected: [0], correctAnswer: [2], yourAnswer: ['a'], rightAnswer: ['c'], whyWrong: [], missed: [], mentalModel: 'm',
      concept: 'c', trap: 't', managerLens: 'l', gap: 'g', followUpId: null, errorClass: null, qid: 'd2-001' };
    s.ledger = [1, 2, 3].map((i) => ({ ...base, id: `x:${i}`, sessionId: 'x', at: `2027-01-0${i}T00:00:00.000Z` }));
    localStorage.setItem('cissp-cc', JSON.stringify(s));
  });
  await page.goto('/#/ledger');
  await page.reload(); // a hash change alone does not reload the seeded state
  await page.locator('[data-due="2.4"] a').click();
  await expect(page).toHaveURL(/#\/reteach\/2\.4/);
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Ledger' })).toHaveAttribute('aria-current', 'page');

  // A mini exam is exam conditions: no reteach interruption.
  await page.goto('/#/questions');
  await page.locator('#mode-mini button').click();
  await expect(page.locator('#stem')).toBeVisible();
  await expect(page.locator('[data-reteach]')).toHaveCount(0);
});
