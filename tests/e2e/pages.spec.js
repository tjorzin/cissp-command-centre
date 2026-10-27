import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { buildSite } from '../../tools/build-site.js';

// GitHub Pages serves a project site from a subpath (/<repo>/). Build the site exactly as
// the workflow does, serve it under a subpath, and check it installs and runs offline.
const SUB = '/cissp-command-centre/';
let server;
let base;

test.beforeAll(async () => {
  const out = buildSite('test-results/pages-site');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!path.startsWith(SUB)) { res.writeHead(404).end(); return; }
    const rel = path.slice(SUB.length) || 'index.html';
    try {
      const body = await readFile(join(out, rel));
      res.writeHead(200, { 'Content-Type': types[extname(rel)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}${SUB}`;
  for (const f of ['tests', 'tools', 'docs', 'node_modules', 'package.json']) expect(existsSync(join(out, f)), f).toBe(false);
});

test.afterAll(() => server?.close());

test('the published site works from a subpath and offline', async ({ page, context }) => {
  await page.goto(base);
  await expect(page.locator('#do-next')).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  expect(manifest.start_url).toBe('./#/home');

  await context.setOffline(true);
  await page.goto(`${base}#/car`);
  await page.reload(); // a full load, served by the service worker
  await expect(page.locator('#car-line')).not.toBeEmpty();
  await page.goto(`${base}#/questions`);
  await expect(page.locator('#mode-practice')).toBeVisible();
  await expect(page.locator('#offline-pill')).toBeVisible();
  await context.setOffline(false);
});
