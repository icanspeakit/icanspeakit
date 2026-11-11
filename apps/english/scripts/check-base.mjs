#!/usr/bin/env node
// @ts-check
/* pnpm check:base — every URL in the build output stays under the base path.
 *
 * icanspeak English lives at https://icanspeak.it/english/ (src/lib/paths.js); the domain
 * root is another site. A root-absolute link that does not start with /english/ leaves the
 * course (or 404s), so this fails on any of them in dist/:
 *
 *   - HTML: href, src, action, formaction, poster, xlink:href, srcset/imagesrcset entries,
 *     CSS url() (style attributes and <style>), <meta http-equiv="refresh"> targets
 *   - CSS files: url()
 *   - site.webmanifest: icon src, start_url, scope
 *   - absolute URLs on the own domain (https://icanspeak.it/…) in HTML, sitemap.xml and
 *     llms.txt that are not under /english (the bare domain root is allowed: a link to the
 *     umbrella site)
 *   - _headers: rule paths (Cloudflare matches them against the public URL) and line length
 *
 * Run after `pnpm build`. Exit code 1 lists the offenders (file, count, first examples).
 * Usage: node scripts/check-base.mjs [distDir]   (pnpm check:base:strict; pnpm check:base is the
 * shared, looser monorepo check ../../scripts/check-base.mjs) */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_PATH, SITE_ORIGIN } from '../src/lib/paths.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(process.argv[2] ?? path.join(ROOT, 'dist'));

if (!existsSync(DIST)) {
  console.error(`check:base: ${DIST} does not exist — run pnpm build first.`);
  process.exit(2);
}

const based = (u) => u === BASE_PATH || /^[/?#]/.test(u.slice(BASE_PATH.length)) && u.startsWith(BASE_PATH);
const rootAbs = (u) => u.startsWith('/') && !u.startsWith('//');
const bad = (u) => rootAbs(u) && !based(u);

const ATTR = /\s(?:href|src|action|formaction|poster|xlink:href)\s*=\s*(["'])(\/(?!\/)[^"']*)\1/gi;
const SRCSET = /\s(?:srcset|imagesrcset)\s*=\s*(["'])([^"']*)\1/gi;
const CSS_URL = /url\(\s*(&quot;|["']?)(\/(?!\/)[^)"'&]*)\1\s*\)/gi;
const REFRESH = /<meta\s[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*?url=([^"']*)/gi;
const ORIGIN_RE = new RegExp(SITE_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(/[^\\s"\'<>)]*)?', 'g');

/** @param {string} text @param {boolean} html */
function offenders(text, html) {
  const out = [];
  if (html) {
    for (const m of text.matchAll(ATTR)) if (bad(m[2])) out.push(m[2]);
    for (const m of text.matchAll(SRCSET)) {
      for (const part of m[2].split(',')) {
        const u = part.trim().split(/\s+/)[0] ?? '';
        if (bad(u)) out.push(u);
      }
    }
    for (const m of text.matchAll(REFRESH)) if (bad(m[1])) out.push(m[1]);
  }
  for (const m of text.matchAll(CSS_URL)) if (bad(m[2])) out.push(`url(${m[2]})`);
  return out;
}

/** Own-domain absolute URLs outside the base. @param {string} text */
function originOffenders(text) {
  const out = [];
  for (const m of text.matchAll(ORIGIN_RE)) {
    const p = m[1] ?? '';
    if (p === '' || p === '/') continue;
    if (!based(p)) out.push(m[0]);
  }
  return out;
}

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** @type {Map<string, string[]>} */
const report = new Map();
let files = 0;
for await (const file of walk(DIST)) {
  const ext = path.extname(file).toLowerCase();
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  let found = [];
  if (ext === '.html') {
    const text = await readFile(file, 'utf8');
    found = [...offenders(text, true), ...originOffenders(text)];
  } else if (ext === '.css') {
    found = offenders(await readFile(file, 'utf8'), false);
  } else if (ext === '.webmanifest') {
    const m = JSON.parse(await readFile(file, 'utf8'));
    found = [m.start_url, m.scope, ...(m.icons ?? []).map((i) => i.src)].filter((u) => typeof u === 'string' && bad(u));
  } else if (ext === '.xml' || rel === 'llms.txt' || rel === 'robots.txt') {
    const text = await readFile(file, 'utf8');
    found = originOffenders(text);
    if (rel === 'robots.txt') {
      for (const m of text.matchAll(/^(?:Allow|Disallow):\s*(\/\S*)/gim)) if (bad(m[1]) && m[1] !== '/') found.push(m[0]);
    }
  } else if (rel === '_headers') {
    // Rules match the public URL: one without the base path never applies, and nothing says so.
    const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
    found = lines.filter((l) => l.startsWith('/') && !based(l.trim().split(/\s+/)[0]));
    const tooLong = lines.filter((l) => l.length > 2000);
    if (tooLong.length) found.push(`line over the 2,000-character limit: ${tooLong[0].slice(0, 60)}…`);
  } else continue;
  files++;
  if (found.length) report.set(rel, found);
}

const total = [...report.values()].reduce((n, l) => n + l.length, 0);
if (!total) {
  console.log(`check:base: ok — ${files} files in ${path.relative(ROOT, DIST) || DIST}, every URL under ${BASE_PATH}/`);
  process.exit(0);
}

// The most common offending URLs first: usually one template writes the same link everywhere.
const byUrl = new Map();
for (const list of report.values()) for (const u of list) byUrl.set(u, (byUrl.get(u) ?? 0) + 1);
console.error(`check:base: ${total} URLs outside ${BASE_PATH}/ in ${report.size} files.`);
console.error('\nMost common:');
for (const [u, n] of [...byUrl].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.error(`  ${String(n).padStart(5)}  ${u}`);
console.error('\nFiles:');
for (const [rel, list] of [...report].slice(0, 40)) console.error(`  ${rel}: ${list.length} (${[...new Set(list)].slice(0, 3).join(', ')})`);
if (report.size > 40) console.error(`  … and ${report.size - 40} more files`);
console.error('\nBuild these URLs with withBase()/absoluteUrl() from src/lib/paths.js.');
process.exit(1);
