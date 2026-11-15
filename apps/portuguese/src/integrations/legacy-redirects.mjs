// @ts-check
/* Real 301s for the old English addresses (src/data/legacy-redirects.json), as a Cloudflare
 * `_redirects` file in dist/.
 *
 * astro.config.mjs lists the same addresses in `redirects`, but without an adapter Astro writes
 * those as small HTML pages with <meta http-equiv="refresh">: they answer 200, so search engines
 * treat them as soft redirects. Workers static assets read `_redirects` at the root of the assets
 * directory (scripts/cf-hoist-headers.mjs moves it there from cf-dist/espanol/) and answer a real
 * 301 before any file is looked up. Rule paths are public URLs, so they carry the base path.
 * Limits: 2,000 static and 100 dynamic rules, 1,000 characters per line; both are checked here.
 *
 * ~1,700 addresses would be 3,400 lines (with and without the trailing slash), over the static
 * limit. Where at least GROUP addresses share the same folder pair and the same last segment
 * (/vocabulary/a1-01 -> /vocabulario/a1-01, 400 of them), they become one `:placeholder` rule.
 * The explicit rules come first; Cloudflare uses the first match. */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBase } from '../lib/paths.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GROUP = 20;
const dir = (p) => p.slice(0, p.lastIndexOf('/'));
const last = (p) => p.slice(p.lastIndexOf('/') + 1);

/** @param {string} dist @param {{ info?: Function }} [logger] */
export async function writeLegacyRedirects(dist, logger = console) {
  const map = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'legacy-redirects.json'), 'utf8'));
  const groups = new Map();
  for (const [from, to] of Object.entries(map)) {
    if (last(from) !== last(to) || !dir(from)) continue;
    const k = dir(from) + ' ' + dir(to);
    (groups.get(k) ?? groups.set(k, []).get(k)).push(from);
  }
  const collapsed = new Set();
  const patterns = [];
  for (const [k, list] of groups) {
    if (list.length < GROUP) continue;
    const [f, t] = k.split(' ');
    patterns.push([`${f}/:p`, `${t}/:p`]);
    for (const from of list) collapsed.add(from);
  }
  const lines = [];
  for (const [from, to] of Object.entries(map)) {
    if (collapsed.has(from)) continue;
    lines.push(`${withBase(from)} ${withBase(to)} 301`, `${withBase(from)}/ ${withBase(to)} 301`);
  }
  const statics = lines.length;
  for (const [from, to] of patterns) lines.push(`${withBase(from)} ${withBase(to)} 301`);
  const dynamics = patterns.length;
  if (statics > 2000 || dynamics > 100) throw new Error(`legacy-redirects: ${statics} static / ${dynamics} dynamic rules exceed the Cloudflare limits (2000 / 100)`);
  const file = path.join(dist, '_redirects');
  const before = existsSync(file) ? (await readFile(file, 'utf8')).trimEnd() + '\n\n' : '';
  await writeFile(file, before + '# Old English addresses (src/data/legacy-redirects.json)\n' + lines.join('\n') + '\n');
  logger.info?.(`legacy-redirects: ${statics} static + ${dynamics} dynamic rules in _redirects`);
}

/** @returns {import('astro').AstroIntegration} */
export default function legacyRedirects() {
  return {
    name: 'legacy-redirects',
    hooks: { 'astro:build:done': async ({ dir, logger }) => { await writeLegacyRedirects(fileURLToPath(dir), logger); } },
  };
}
