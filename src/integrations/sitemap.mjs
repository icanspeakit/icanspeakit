// @ts-check
/* /sitemap.xml, written after the build from the HTML that was actually produced.
 *
 * Why not @astrojs/sitemap: it decides from the URL alone, but whether a page may be indexed
 * is decided inside the page — a grammar draft (`"status": "entwurf"`), /newfont and
 * /design-system all build to a public URL and carry <meta name="robots" content="noindex">
 * from Layout.astro. A URL filter would have to repeat that logic and drift from it. Reading
 * the built files instead means the sitemap can never list a page that tells Google to go
 * away, and a draft that gets published shows up on the next build with no change here.
 *
 * Left out on purpose:
 *   - pages with a robots noindex meta (drafts, prototypes)
 *   - redirect stubs (meta refresh: /dashboard, /leicht, the legacy flat URLs)
 *   - 404, and the routes that render on demand (/anmelden, /konto, /api …), which leave no
 *     HTML file behind and so are never seen
 * URLs are written without a trailing slash, the form every link on the site uses and the
 * one Layout.astro puts in <link rel="canonical">. No <lastmod>: a build date on every URL
 * is a false signal, and Google ignores the field when it is not accurate.
 *
 * Website build only — the Android app build (PUBLIC_TARGET=app) does not add this. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { absoluteUrl } from '../lib/paths.js';

export const NOINDEX = /<meta\s[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i;
export const REFRESH = /<meta\s[^>]*http-equiv=["']refresh["']/i;

/** @param {string} root */
export async function htmlFiles(root) {
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith('.html')) out.push(path.join(entry.parentPath, entry.name));
  }
  return out;
}

/** @param {string} rel  path of an .html file relative to the output folder */
export function toPathname(rel) {
  const p = rel.split(path.sep).join('/');
  if (p === 'index.html') return '/';
  if (p.endsWith('/index.html')) return '/' + p.slice(0, -'/index.html'.length);
  return '/' + p.slice(0, -'.html'.length);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Writes sitemap.xml for the built site in `root`. A page that lists language versions
 *  (<link rel="alternate" hreflang>, the entry pages of src/integrations/entry-pages.mjs) is
 *  written under its canonical URL with those versions as xhtml:link, so Google pairs them. */
export async function writeSitemap(root, site, logger = console) {
  const entries = [];
  let skipped = 0;
  for (const file of await htmlFiles(root)) {
    const pathname = toPathname(path.relative(root, file));
    if (pathname === '/404' || pathname.startsWith('/_')) continue;
    const html = await readFile(file, 'utf8');
    const head = html.slice(0, html.indexOf('</head>') + 1 || 20000);
    if (NOINDEX.test(head) || REFRESH.test(head)) { skipped++; continue; }
    const alts = [...head.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => [m[1], m[2]]);
    const canonical = alts.length ? head.match(/<link rel="canonical" href="([^"]+)">/)?.[1] : null;
    // Site path → https://icanspeak.it/spanish/… (src/lib/paths.js); `site` only says one is set.
    entries.push({ loc: canonical ?? absoluteUrl(pathname), alts });
  }
  entries.sort((a, b) => a.loc.length - b.loc.length || a.loc.localeCompare(b.loc));
  const any = entries.some((e) => e.alts.length);
  const NL = String.fromCharCode(10);
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' + NL +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${any ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : ''}>` + NL +
    entries.map((e) => `  <url><loc>${esc(e.loc)}</loc>${e.alts.map(([h, u]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${esc(u)}"/>`).join('')}</url>`).join(NL) +
    NL + '</urlset>' + NL;
  await writeFile(path.join(root, 'sitemap.xml'), xml);
  logger.info(`sitemap.xml: ${entries.length} URLs (${skipped} noindex/redirect pages left out, ${entries.filter((e) => e.alts.length).length} with language versions)`);
}

/** @returns {import('astro').AstroIntegration} */
export default function sitemap() {
  /** @type {URL | undefined} */
  let site;
  return {
    name: 'icanspeak-sitemap',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site ? new URL(config.site) : undefined;
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (!site) {
          logger.warn('`site` is not set in astro.config.mjs — no sitemap written.');
          return;
        }
        await writeSitemap(fileURLToPath(dir), site, logger);
      },
    },
  };
}
