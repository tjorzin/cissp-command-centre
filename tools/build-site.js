// Copies only the app's static files into a folder for publishing (GitHub Pages).
// Usage: node tools/build-site.js [outDir]   (default: _site)
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE_FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'data', 'icons'];

export function buildSite(outDir) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const out = resolve(root, outDir);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const f of SITE_FILES) cpSync(join(root, f), join(out, f), { recursive: true });
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Site written to ${buildSite(process.argv[2] || '_site')}`);
}
