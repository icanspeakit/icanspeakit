/**
 * Base-aware URLs. This app is served at icanspeak.it/linguistics/ (base in astro.config.mjs),
 * so every root-relative path in the site goes through u(): u('/blog/') → '/linguistics/blog/'.
 * Idempotent: a path that already carries the base is returned as is, so values passed through
 * several components (altHref, hrefs from data files) never get the prefix twice.
 * Works in frontmatter and in bundled client <script>s (Vite inlines BASE_URL); not in
 * is:inline scripts.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

export function u(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (!BASE) return path;
  if (path === BASE || path.startsWith(`${BASE}/`)) return path;
  return `${BASE}${path}`;
}

/** The path inside this app, without the base: strip('/linguistics/de/') → '/de/'. */
export function strip(pathname: string): string {
  if (BASE && (pathname === BASE || pathname.startsWith(`${BASE}/`))) return pathname.slice(BASE.length) || '/';
  return pathname;
}
