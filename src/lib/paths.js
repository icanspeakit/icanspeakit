// @ts-check
/* The one place that knows where the site lives: https://icanspeak.it/spanish/.
 *
 * icanspeak Spanish is served under a base path (`base: '/spanish'` in astro.config.mjs);
 * the domain root belongs to another site. So no URL in this repo may be root-absolute on
 * its own: every link, asset, fetch, canonical, hreflang, sitemap and llms.txt URL goes
 * through this file. Plain JS with no Astro or Vite imports, so astro.config.mjs, the build
 * integrations, node scripts and browser modules can all import it.
 *
 *   withBase("/grammar")        → "/spanish/grammar"
 *   withBase("/")               → "/spanish/"
 *   withBase("/spanish/x")      → "/spanish/x"        (idempotent)
 *   stripBase("/spanish/grammar") → "/grammar"        (for comparing location.pathname)
 *   currentPath()               → location.pathname without the base
 *   absoluteUrl("/grammar")     → "https://icanspeak.it/spanish/grammar"
 *   langPath("de", "/grammar")  → "/spanish/de/grammar" (UI-language prefix after the base)
 *   rebaseHtml(html)            → every root-absolute href/src/action/srcset/url()/refresh
 *                                 in an HTML string moved under the base
 *
 * Change the base here (and nowhere else); astro.config.mjs reads it from this file.
 * `pnpm check:base` (scripts/check-base.mjs) fails the build output on any root-absolute URL
 * outside the base. */

/** The domain, no trailing slash. */
export const SITE_ORIGIN = 'https://icanspeak.it';
/** The base path, no trailing slash. */
export const BASE_PATH = '/spanish';
/** The base language of the interface (src/lib/languages.js BASE); it has no URL prefix. */
const BASE_LANG = 'en';

/** @param {string} p */
const isBased = (p) =>
  p === BASE_PATH || p.startsWith(BASE_PATH + '/') || p.startsWith(BASE_PATH + '?') || p.startsWith(BASE_PATH + '#');

/** A root-absolute path ("/x", not "//host" or "x" or "https://…"). @param {unknown} p */
export const isRootPath = (p) => typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');

/**
 * The path under the base. Leaves anything that is not root-absolute alone (full URLs,
 * relative paths, "#top", "mailto:"), and a path that already carries the base.
 * @template T @param {T} path @returns {T}
 */
export function withBase(path) {
  if (!isRootPath(path)) return path;
  const p = /** @type {string} */ (/** @type {unknown} */ (path));
  if (isBased(p)) return path;
  return /** @type {T} */ (/** @type {unknown} */ (BASE_PATH + p));
}

/** The site path of a pathname that may carry the base: "/spanish/grammar" → "/grammar",
 *  "/spanish" and "/spanish/" → "/". Anything else comes back unchanged. @param {string} pathname */
export function stripBase(pathname) {
  if (typeof pathname !== 'string') return pathname;
  if (pathname === BASE_PATH || pathname === BASE_PATH + '/') return '/';
  if (pathname.startsWith(BASE_PATH + '/')) return pathname.slice(BASE_PATH.length);
  return pathname;
}

/** location.pathname without the base (browser only; "/" elsewhere). */
export function currentPath() {
  return typeof location === 'undefined' ? '/' : stripBase(location.pathname);
}

/** The full public URL of a site path. @param {string} path */
export function absoluteUrl(path = '/') {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  return SITE_ORIGIN + withBase(isRootPath(path) ? path : '/' + path);
}

/**
 * A site path in one interface language: the base language has no prefix, every other one
 * a prefix after the base (`urlPrefix` in src/lib/languages.js, usually the code).
 * @param {string} lang @param {string} [path]
 */
export function langPath(lang, path = '/') {
  const p = stripBase(path.startsWith('/') ? path : '/' + path);
  if (!lang || lang === BASE_LANG) return withBase(p);
  return withBase(`/${lang}${p === '/' ? '/' : p}`);
}

/* rebaseHtml: the attributes a browser resolves as URLs. data-* attributes are not touched;
 * scripts that navigate with one pass it through withBase() themselves. */
const ATTR_RE = /(\s(?:href|src|action|formaction|poster|xlink:href)\s*=\s*)(["'])(\/(?!\/)[^"']*)\2/gi;
const SRCSET_RE = /(\s(?:srcset|imagesrcset)\s*=\s*)(["'])([^"']*)\2/gi;
const CSS_URL_RE = /url\(\s*(&quot;|["']?)(\/(?!\/)[^)"'&]*)\1\s*\)/gi;
const REFRESH_RE = /(<meta\s[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*?url=)(\/(?!\/)[^"']*)/gi;

/** Moves every root-absolute URL in an HTML (or CSS) string under the base. Idempotent.
 *  @param {string} html */
export function rebaseHtml(html) {
  if (typeof html !== 'string' || !html.includes('/')) return html;
  return html
    .replace(ATTR_RE, (_, pre, q, url) => `${pre}${q}${withBase(url)}${q}`)
    .replace(SRCSET_RE, (_, pre, q, list) =>
      `${pre}${q}${list.replace(/(^|,\s*)(\/(?!\/)\S*)/g, (/** @type {string} */ m, /** @type {string} */ sep, /** @type {string} */ u) => sep + withBase(u))}${q}`)
    .replace(CSS_URL_RE, (_, q, url) => `url(${q}${withBase(url)}${q})`)
    .replace(REFRESH_RE, (_, pre, url) => pre + withBase(url));
}
