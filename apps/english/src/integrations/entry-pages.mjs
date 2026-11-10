// @ts-check
/* Entry pages with their own URL per language (SPRACHEN-REICHWEITE-TIERED-PROMPT.md, Tier 5).
 *
 * The site switches languages in the browser on the German URL, so Google only ever sees
 * German. For the entry pages listed in src/data/entry-pages.json this step writes a copy per
 * language with a URL of its own, /es/, /pt-br/preise, /hi/berufe/pflege …, rendered in that
 * language at build time: every [data-i18n], [data-i18n-html] and [data-i18n-attr] filled from
 * public/i18n/<code>.json exactly as src/lib/i18n.js would do it in the browser, <html lang>
 * and dir, <title>, description, Open Graph, canonical, and an intro written for that audience
 * on the home page. No second component tree: the copies are made from the German HTML the
 * build just produced, so they can never drift from it.
 *
 * Both sides get <link rel="alternate" hreflang> for all languages plus x-default (German);
 * the sitemap reads them from the HTML (src/integrations/sitemap.mjs), so this step runs
 * before it. A visit to a copy sets da_lang, so the rest of the site continues in that
 * language; choosing another language on a page that has these links goes to the sibling URL
 * (setLang in src/lib/i18n.js). `<meta name="google" content="notranslate">` stays.
 *
 * `buildEntryPages(root, site)` is exported so the step can also run on its own after a local
 * build, where the Vercel adapter's hook fails before this one (scripts/build-entry-pages.mjs). */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entryLanguages, BASE } from '../lib/languages.js';
import { absoluteUrl, rebaseHtml } from '../lib/paths.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OG_LOCALE = { es: 'es_LA', pt: 'pt_BR', vi: 'vi_VN', hi: 'hi_IN', id: 'id_ID' };

const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escText(s).replace(/"/g, '&quot;');
const decode = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const interpolate = (str, vars) => (vars ? str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : str);
const attrOf = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decode(m[1]) : null;
};
function setAttr(tag, name, value) {
  const re = new RegExp(`(\\s${name}=")[^"]*(")`);
  if (re.test(tag)) return tag.replace(re, `$1${escAttr(value)}$2`);
  return tag.replace(/\s*\/?>$/, (end) => ` ${name}="${escAttr(value)}"${end}`);
}
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Index just past the closing tag of the element whose opening tag ends at `from`. */
function closeOf(html, name, from) {
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1;
  for (let m; (m = re.exec(html)); ) {
    if (m[1]) depth--;
    else if (!m[0].endsWith('/>')) depth++;
    if (depth === 0) return { start: m.index, end: m.index + m[0].length };
  }
  return null;
}

/** The [data-i18n…] pass of src/lib/i18n.js, on an HTML string. */
export function translateHtml(html, dict) {
  // Script and style bodies are set aside first: they may contain markup in strings.
  const stash = [];
  html = html.replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (all, open, _n, body, close) => {
    stash.push(body);
    return `${open}\u0000${stash.length - 1}\u0000${close}`;
  });
  let globals = {};
  try { globals = JSON.parse(attrOf(html.match(/<html\b[^>]*>/i)?.[0] ?? '', 'data-i18n-globals') || '{}'); } catch {}

  // One forward pass, writing into `out`: an element whose content is replaced is skipped
  // whole (any data-i18n inside it would be overwritten by its parent anyway), so the work
  // is linear in the page size even on the large data pages.
  const out = [];
  let pos = 0;
  const openRe = /<([a-zA-Z][\w-]*)(\s[^>]*)?>/g;
  for (let m; (m = openRe.exec(html)); ) {
    if (!/\sdata-i18n(-html|-attr)?="/.test(m[0])) continue;
    const name = m[1].toLowerCase();
    let tag = m[0];
    const start = m.index;
    const tagEnd = start + m[0].length;
    const vars = (() => { const v = attrOf(tag, 'data-i18n-vars'); try { return v ? { ...globals, ...JSON.parse(v) } : globals; } catch { return globals; } })();
    const attrSpec = attrOf(tag, 'data-i18n-attr');
    if (attrSpec) {
      for (const pair of attrSpec.split(';')) {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (attr && key && dict[key] != null) tag = setAttr(tag, attr, interpolate(dict[key], globals));
      }
    }
    const textKey = attrOf(tag, 'data-i18n');
    const htmlKey = attrOf(tag, 'data-i18n-html');
    const key = textKey ?? htmlKey;
    let inner = null;
    if (key && dict[key] != null && !VOID.has(name)) inner = textKey ? escText(interpolate(dict[key], vars)) : interpolate(dict[key], vars);
    out.push(html.slice(pos, start), tag);
    pos = tagEnd;
    if (inner == null) continue;
    const close = closeOf(html, name, tagEnd);
    if (!close) continue;
    out.push(inner);
    pos = close.start;
    openRe.lastIndex = close.start;
  }
  out.push(html.slice(pos));
  html = out.join('');
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);
}

const setMeta = (html, re, value) => html.replace(re, (tag) => tag.replace(/content="[^"]*"/, `content="${escAttr(value)}"`));

/** The German URL of a page and its copy in one language: home with a trailing slash, the rest without. */
const deUrl = (_site, page) => absoluteUrl(page.src);
const langUrl = (_site, page, l) => absoluteUrl(`/${l.urlPrefix}/${page.slug}`);

function alternatesHtml(site, page, langs) {
  const de = deUrl(site, page);
  return [`<link rel="alternate" hreflang="${BASE}" href="${de}">`,
    ...langs.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${langUrl(site, page, l)}">`),
    `<link rel="alternate" hreflang="x-default" href="${de}">`].join('');
}
const withAlternates = (html, alt) => html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, '').replace('</head>', `${alt}</head>`);

function introHtml(intro, l) {
  const links = intro.links.map(([label, href]) => `<li><a href="${escAttr(href)}" rel="noopener" target="_blank">${escText(label)}</a></li>`).join('');
  return `<section class="ep-intro" lang="${l.hreflang}" aria-labelledby="ep-intro-h">`
    + `<style>.ep-intro{max-width:760px;margin:24px auto;padding:20px 20px 16px;border:1px solid var(--border,#e7e9ee);border-radius:16px;background:var(--surface-card,#fff);color:var(--ink,#1a2230)}.ep-intro h2{margin:0 0 10px;font-size:1.25rem}.ep-intro p{margin:0 0 10px;line-height:1.55}.ep-intro ul{margin:0;padding-left:18px}.ep-intro li{margin:4px 0}.ep-intro a{color:var(--brand-blue-dark,#0f766e)}@media (max-width:600px){.ep-intro{margin:16px;padding:16px}}</style>`
    + `<h2 id="ep-intro-h">${escText(intro.heading)}</h2>`
    + intro.paragraphs.map((p) => `<p>${escText(p)}</p>`).join('')
    + `<ul>${links}</ul></section>`;
}

/** Writes the language copies of the entry pages into `root` (the built site). */
export async function buildEntryPages(root, site, logger = console) {
  const cfg = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'entry-pages.json'), 'utf8'));
  const langs = entryLanguages().filter((l) => l.surfaces.ui && cfg.langs?.[l.code]);
  // Only the base language so far: no copies to write, and no hreflang alternates to add.
  if (!langs.length) return 0;
  const de = JSON.parse(await readFile(path.join(ROOT, 'public', 'i18n', `${BASE}.json`), 'utf8'));
  const dicts = Object.fromEntries(await Promise.all(langs.map(async (l) => [l.code, { ...de, ...JSON.parse(await readFile(path.join(ROOT, 'public', 'i18n', `${l.code}.json`), 'utf8')) }])));
  const fileOf = (p) => path.join(root, p === '/' ? 'index.html' : path.join(p.replace(/^\//, ''), 'index.html'));
  let written = 0;
  for (const page of cfg.pages) {
    const src = fileOf(page.src);
    if (!existsSync(src)) { logger.warn?.(`entry-pages: ${page.src} not built, skipped`); continue; }
    const german = await readFile(src, 'utf8');
    const alt = alternatesHtml(site, page, langs);
    await writeFile(src, withAlternates(german, alt));
    for (const l of langs) {
      const own = cfg.langs[l.code];
      const [title, description, h1] = own.meta[page.src] ?? [];
      let html = translateHtml(german, dicts[l.code]);
      const href = langUrl(site, page, l);
      html = html
        .replace(/<html\b[^>]*>/i, (tag) => setAttr(setAttr(setAttr(tag, 'lang', l.hreflang), 'dir', l.dir), 'data-entry-lang', l.code))
        .replace(/<head>/i, `<head><script>try{localStorage.setItem("da_lang",${JSON.stringify(l.code)})}catch(e){}</script>`)
        .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${href}">`);
      html = setMeta(html, /<meta property="og:url"[^>]*>/, href);
      html = setMeta(html, /<meta property="og:locale"[^>]*>/, OG_LOCALE[l.code] ?? l.hreflang);
      if (title) {
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${escText(title)}</title>`);
        html = setMeta(html, /<meta property="og:title"[^>]*>/, title);
        html = setMeta(html, /<meta name="twitter:title"[^>]*>/, title);
      }
      if (description) {
        html = setMeta(html, /<meta name="description"[^>]*>/, description);
        html = setMeta(html, /<meta property="og:description"[^>]*>/, description);
        html = setMeta(html, /<meta name="twitter:description"[^>]*>/, description);
      }
      // An H1 that is data rather than a dictionary key (a deck title) gets its own line.
      if (h1) html = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/, (tag) => tag.replace(/\slang="de"/, '').replace(/>[\s\S]*<\/h1>$/, `>${escText(h1)}</h1>`));
      // The home page: an intro for this audience, after the hero.
      if (page.src === '/' && own.intro) {
        const hero = html.match(/<section class="fr-page fr-page--home"[^>]*>/);
        const close = hero ? closeOf(html, 'section', (hero.index ?? 0) + hero[0].length) : null;
        if (close) html = html.slice(0, close.end) + introHtml(own.intro, l) + html.slice(close.end);
        else logger.warn?.('entry-pages: home hero not found, intro skipped');
      }
      html = rebaseHtml(withAlternates(html, alt));
      const out = fileOf(`/${l.urlPrefix}${page.slug ? `/${page.slug}` : ''}`);
      await mkdir(path.dirname(out), { recursive: true });
      await writeFile(out, html);
      written++;
    }
  }
  logger.info?.(`entry-pages: ${written} pages in ${langs.map((l) => l.urlPrefix).join(', ')}`);
  return written;
}

/** @returns {import('astro').AstroIntegration} */
export default function entryPages() {
  /** @type {URL | undefined} */
  let site;
  return {
    name: 'entry-pages',
    hooks: {
      'astro:config:done': ({ config }) => { site = config.site ? new URL(config.site) : undefined; },
      'astro:build:done': async ({ dir, logger }) => {
        if (!site) return;
        await buildEntryPages(fileURLToPath(dir), site, logger);
      },
    },
  };
}
