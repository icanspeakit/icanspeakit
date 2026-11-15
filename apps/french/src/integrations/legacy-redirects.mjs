// @ts-check
/* Real 301s for the old English addresses (legacy-redirects.json), as a Cloudflare
 * `_redirects` file in dist/.
 *
 * astro.config.mjs already lists the same addresses in `redirects`, but without an adapter
 * Astro writes those as small HTML pages with <meta http-equiv="refresh">: they answer 200,
 * so search engines treat them as soft redirects. Workers static assets read `_redirects`
 * at the root of the assets directory (scripts/cf-hoist-headers.mjs moves it there from
 * cf-dist/francais/) and answer a real 301 before any file is looked up. The rule paths are
 * public URLs, so they carry the base path. Limits: 2,000 static and 100 dynamic rules,
 * 1,000 characters per line; both are checked here. */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBase } from '../lib/paths.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const colon = (p) => p.replace(/\[\.\.\.(\w+)\]/g, ':$1').replace(/\[(\w+)\]/g, ':$1');

/** @param {string} dist @param {{ info?: Function }} [logger] */
export async function writeLegacyRedirects(dist, logger = console) {
  const { patterns, redirects } = JSON.parse(await readFile(path.join(ROOT, 'legacy-redirects.json'), 'utf8'));
  const lines = [];
  for (const [from, to] of Object.entries(redirects)) {
    lines.push(`${withBase(from)} ${withBase(to)} 301`, `${withBase(from)}/ ${withBase(to)} 301`);
  }
  for (const [from, to] of Object.entries(patterns)) lines.push(`${withBase(colon(from))} ${withBase(colon(to))} 301`);
  const statics = lines.filter((l) => !l.includes(':')).length;
  const dynamics = lines.length - statics;
  if (statics > 2000 || dynamics > 100) throw new Error(`legacy-redirects: ${statics} static / ${dynamics} dynamic rules exceed the Cloudflare limits (2000 / 100)`);
  const file = path.join(dist, '_redirects');
  const before = existsSync(file) ? (await readFile(file, 'utf8')).trimEnd() + '\n\n' : '';
  await writeFile(file, before + '# Old English addresses (legacy-redirects.json)\n' + lines.join('\n') + '\n');
  logger.info?.(`legacy-redirects: ${statics} static + ${dynamics} dynamic rules in _redirects`);
}

/** @returns {import('astro').AstroIntegration} */
export default function legacyRedirects() {
  return {
    name: 'legacy-redirects',
    hooks: { 'astro:build:done': async ({ dir, logger }) => { await writeLegacyRedirects(fileURLToPath(dir), logger); } },
  };
}
