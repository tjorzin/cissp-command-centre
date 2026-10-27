import { test, expect } from '@playwright/test';
import { noOverflow } from './helpers.js';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../../data/tracks.json', import.meta.url)));

// Headless Chromium has no voices, so a stand-in speechSynthesis records what is spoken
// and finishes each utterance after 20 ms. The real pauses between lines still apply.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__spoken = [];
    const voices = [{ name: 'Zed US', lang: 'en-US' }, { name: 'Amy UK', lang: 'en-GB' }];
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    let current = null;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => voices,
        addEventListener: () => {},
        speak(u) {
          current = u;
          window.__spoken.push({ text: u.text, rate: u.rate, voice: u.voice?.name || null });
          setTimeout(() => { if (current === u) { current = null; u.onend?.(); } }, 20);
        },
        cancel() { const u = current; current = null; u?.onerror?.({ error: 'canceled' }); }
      }
    });
  });
});

test('car mode speaks line by line with pauses, saves the position and resumes after a reload', async ({ page }) => {
  await page.goto('/#/study');
  await page.locator('#car-link').click();
  await expect(page).toHaveURL(/#\/car/);
  await expect(page.locator('#car-voice option').nth(1)).toHaveText('Amy UK (en-GB)'); // British voices first
  await page.locator('#car-voice').selectOption('Amy UK');
  await page.locator('#car-rate').selectOption('1.25');
  await noOverflow(page);

  const d1 = data.tracks[0];
  await page.locator('#car-play').click();
  await expect(page.locator('#car-play')).toHaveText('Pause');
  await expect(page.locator('#car-line')).toHaveText(d1.lines[0].t);
  // The first line's pause is real: the second line is not spoken straight away.
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__spoken.length)).toBe(1);
  await expect(page.locator('#car-progress')).toHaveText(`Line 2 of ${d1.lines.length}`, { timeout: 4000 });
  await page.locator('#car-play').click(); // pause
  await expect(page.locator('#car-play')).toHaveText('Resume');

  const spoken = await page.evaluate(() => window.__spoken);
  expect(spoken[0]).toEqual({ text: d1.lines[0].t, rate: 1.25, voice: 'Amy UK' });
  expect(spoken[1].text).toBe(d1.lines[1].t);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cissp-cc')).car);
  expect(stored).toMatchObject({ track: 'car-d1', line: 1, voice: 'Amy UK', rate: 1.25 });

  await page.reload();
  await expect(page.locator('#car-line')).toHaveText(d1.lines[1].t);
  await expect(page.locator('#car-voice')).toHaveValue('Amy UK');
  await expect(page.locator('#car-play')).toHaveText('Resume');

  // Skip and back move one line; changing track starts it from the top.
  await page.locator('#car-next').click();
  await expect(page.locator('#car-line')).toHaveText(d1.lines[2].t);
  await page.locator('#car-prev').click();
  await expect(page.locator('#car-line')).toHaveText(d1.lines[1].t);
  await page.locator('#car-track').selectOption(String(data.tracks.length - 1));
  await expect(page.locator('#car-title')).toHaveText(data.tracks.at(-1).title);
  await expect(page.locator('#car-progress')).toHaveText(/^Line 1 of/);
});

test('leaving car mode stops speech', async ({ page }) => {
  await page.goto('/#/car');
  await page.locator('#car-play').click();
  await expect(page.locator('#car-play')).toHaveText('Pause');
  await page.goto('/#/home');
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => window.__spoken.length)).toBe(1);
});

test('all scripts download as one text file', async ({ page }) => {
  await page.goto('/#/car');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#car-download').click()]);
  expect(dl.suggestedFilename()).toBe('cissp-car-scripts.txt');
  const text = readFileSync(await dl.path(), 'utf8');
  for (const t of data.tracks) expect(text).toContain(t.title);
  expect(text).toContain('[Pause and answer]');
});
