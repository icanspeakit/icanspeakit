// @ts-check
/* Renders every built page in the base language (src/lib/languages.js: BASE = "en").
 *
 * The components carry their visible text twice: as server text (often still the German
 * wording inherited from englishacademy) and as a data-i18n key into public/i18n/en.json.
 * In the browser src/lib/i18n.js paints the dictionary over the server text; this step does
 * the same at build time, with the same translateHtml() the entry pages use, so the HTML that
 * search engines, link previews and no-JS visitors get is English too, and nothing flashes.
 *
 * It also sets <html lang> to the base language. Runs before entry-pages and the sitemap. */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateHtml } from './entry-pages.mjs';
import { BASE } from '../lib/languages.js';
import { rebaseHtml, absoluteUrl, SITE_ORIGIN } from '../lib/paths.js';

const CANONICAL_RE = new RegExp(`(<link rel="canonical" href=")${SITE_ORIGIN.replace(/\./g, '\\.')}(/[^"]*)(")`, 'g');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

/** @param {string} root the built site @param {{ info?: Function }} [logger] */
export async function renderBaseLanguage(root, logger = console) {
  const dict = JSON.parse(await readFile(path.join(ROOT, 'public', 'i18n', `${BASE}.json`), 'utf8'));
  let n = 0;
  for await (const file of htmlFiles(root)) {
    const html = await readFile(file, 'utf8');
    // rebaseHtml: the dictionary strings may carry links; they move under the base path here.
    const out = rebaseHtml(translateHtml(html, dict))
      // Redirect stubs write <link rel="canonical"> as origin + destination without the base.
      .replace(CANONICAL_RE, (_, pre, p, post) => pre + absoluteUrl(p) + post)
      .replace(/<html\b([^>]*?)\slang="[^"]*"/i, `<html$1 lang="${BASE}"`);
    if (out !== html) { await writeFile(file, out); n++; }
  }
  logger.info?.(`base-language: ${n} pages rendered in "${BASE}"`);
  return n;
}

/** @returns {import('astro').AstroIntegration} */
export default function baseLanguage() {
  return {
    name: 'base-language',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => { await renderBaseLanguage(fileURLToPath(dir), logger); },
    },
  };
}
