import './verify.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

// Publish only browser assets; local tools and editorial notes stay in the repository.
const output = new URL('../dist/', import.meta.url);
const assets = [
  'index.html', 'style.css', 'integration.css', 'reading.css', 'unit-one.css',
  'app.js', 'marin-data.js', 'integration.js', 'review.js', 'lessons.js', 'unit-one.js', 'reading.js',
  'marin-original.md'
];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of assets) {
  let contents = await readFile(new URL(name, import.meta.url), 'utf8');
  if (name === 'index.html') contents = contents.replace('data-prototype="true"', 'data-prototype="false"');
  await writeFile(new URL(name, output), contents);
}
const html = await readFile(new URL('index.html', output), 'utf8');
assert.match(html, /data-prototype="false"/);
for (const [, path] of html.matchAll(/(?:src|href)="\/([^"?#]+)"/g)) {
  assert.ok(assets.includes(path), `Missing deployed asset: ${path}`);
}
assert.deepEqual((await readdir(output)).sort(), [...assets].sort());
console.log(`Production build: ${assets.length} public assets in dist/`);
