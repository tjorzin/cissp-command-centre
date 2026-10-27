import { test, expect } from '@playwright/test';
import { noOverflow } from './helpers.js';

test('Study lists all eight domains with 2024 weights by default', async ({ page }) => {
  await page.goto('/#/study');
  await expect(page.locator('.domain-link')).toHaveCount(8);
  const d1 = page.locator('[data-domain="1"]');
  await expect(d1).toContainText('Security and Risk Management');
  await expect(d1).toContainText('16%');
  await expect(page.locator('[data-domain="8"]')).toContainText('10%');
});

test('a domain page shows its objectives, topics and the 2027 changes', async ({ page }) => {
  await page.goto('/#/study');
  await page.locator('[data-domain="3"]').click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Domain 3: Security Architecture and Engineering');
  await expect(page.locator('.objective')).toHaveCount(10);

  const crypto = page.locator('[data-objective="3.6"]');
  await expect(crypto.locator('.topics').first()).toContainText('Quantum key distribution');
  await crypto.locator('.changes summary').click();
  await expect(crypto.locator('.chg.add')).toContainText(['Post-quantum cryptography']);
  await expect(crypto.locator('.chg.drop')).toContainText(['Quantum cryptography', 'Quantum key distribution']);

  await noOverflow(page);

  await page.getByRole('link', { name: '‹ All domains' }).click();
  await expect(page.locator('.domain-link')).toHaveCount(8);
});

test('a target date from 15 April 2027 switches Study to the 2027 outline', async ({ page }) => {
  await page.goto('/#/more');
  await page.locator('#target-date').fill('2027-05-01');
  await page.locator('#target-date').dispatchEvent('change');
  await page.goto('/#/study');
  const d1 = page.locator('[data-domain="1"]');
  await expect(d1).toContainText('Security Governance and Risk Management');
  await expect(d1).toContainText('13.6%');

  await page.goto('/#/study/8');
  const dev = page.locator('[data-objective="8.2"] .topics').first();
  await expect(dev).toContainText('Memory-safe languages');
  await expect(dev).not.toContainText('IAST');
});

test('unknown domain number falls back to the list', async ({ page }) => {
  await page.goto('/#/study/99');
  await expect(page.locator('.domain-link')).toHaveCount(8);
});
