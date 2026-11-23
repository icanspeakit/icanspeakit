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

/** The legal pages (components/LegalTranslation.astro): German is the binding text and what `astro dev`
 *  renders; in the built page the base language's translation goes into the markup and the German
 *  original into the blob (as `de`), where the component's script finds it for German and for the
 *  "Show German version" toggle. Only pages whose blob has a translation in `lang` are touched.
 *  A key may sit on several elements (a repeated table cell): every one is replaced. */
export function legalToBase(html, lang) {
  const BLOB = /(<script type="application\/json" data-legal-tx>)([\s\S]*?)(<\/script>)/;
  const m = BLOB.exec(html);
  if (!m) return html;
  let blob;
  try { blob = JSON.parse(m[2]); } catch { return html; }
  let out = html;
  for (const [key, langs] of Object.entries(blob)) {
    if (!langs[lang] || langs.de) continue;
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(<([a-z0-9]+)(?:\\s[^>]*?)?\\sdata-lx="${esc}"[^>]*>)([\\s\\S]*?)(</\\2>)`, 'g');
    out = out.replace(re, (_all, open, _tag, inner, close) => {
      langs.de ??= inner;
      return open + langs[lang] + close;
    });
  }
  const json = JSON.stringify(blob).replace(/</g, '\\u003c');
  return out
    .replace(BLOB, (_all, a, _b, c) => a + json + c)
    .replace(/(<div class="legal-lang" data-legal-note)\s+hidden/, '$1')
    .replace('<main class="legal-main"', `<main class="legal-main" lang="${lang}"`);
}

/** @param {string} root the built site @param {{ info?: Function }} [logger] */
export async function renderBaseLanguage(root, logger = console) {
  const dict = JSON.parse(await readFile(path.join(ROOT, 'public', 'i18n', `${BASE}.json`), 'utf8'));
  let n = 0;
  for await (const file of htmlFiles(root)) {
    const html = await readFile(file, 'utf8');
    // rebaseHtml: the dictionary strings may carry links; they move under the base path here.
    const out = rebaseHtml(legalToBase(translateHtml(html, dict), BASE))
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
