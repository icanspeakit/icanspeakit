#!/usr/bin/env node
// Fails when built HTML/CSS links to a root-relative path outside this app's base.
// Every app on icanspeak.it is its own Worker behind a path route, so a link like
// href="/blog/" from /linguistics would land on another app (or the picker's 404).
//   node scripts/check-base.mjs <dist dir> <base> [other allowed bases …]
//   e.g. node ../../scripts/check-base.mjs dist /linguistics
// The hub (base "/") lists the bases it may link to: / /english /linguistics …
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const [dir = 'dist', base = '/', ...allowed] = process.argv.slice(2);
const norm = (b) => b.replace(/\/+$/, '');
const bases = [base, ...allowed].map(norm);
const attr = /\b(?:href|src|action|poster)=["'](\/(?!\/)[^"']*)["']|url\(\s*["']?(\/(?!\/)[^)"']*)/g;
const under = (path, b) => path === b || path.startsWith(`${b}/`);
// The hub (base "/") owns every path no other app claims: a link there must either go to one
// of the allowed app bases or to a file this build actually produced.
const existsHere = (path) => {
  const p = decodeURIComponent(path).replace(/^\//, '');
  return [p, `${p}/index.html`, `${p}.html`].some((c) => existsSync(join(dir, c)));
};
const ok = (url) => {
  const path = url.split(/[?#]/)[0];
  if (norm(base) === '') return path === '/' || allowed.map(norm).some((b) => under(path, b)) || existsHere(path);
  return bases.some((b) => under(path, b));
};

const bad = new Map();
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (!['_worker.js', 'server', '.wrangler'].includes(f)) walk(p); continue; }
    if (!['.html', '.css'].includes(extname(f))) continue;
    for (const m of readFileSync(p, 'utf8').matchAll(attr)) {
      const url = m[1] ?? m[2];
      if (!ok(url)) bad.set(url, (bad.get(url) ?? 0) + 1);
    }
  }
};
walk(dir);
if (bad.size) {
  console.error(`check:base: ${bad.size} root-relative URL(s) outside ${bases.map((b) => b || '/').join(', ')}:`);
  for (const [u, n] of [...bad].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.error(`  ${n}x ${u}`);
  process.exit(1);
}
console.log(`check:base: ok (${bases.map((b) => b || '/').join(', ')})`);
