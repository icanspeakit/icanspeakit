// The one guard for `next` (where to land after signing in). `next` arrives in the URL, so
// it is attacker-controlled. Checking "starts with / but not //" is not enough: browsers
// read "/\evil.example" as "//evil.example", and strip tabs and newlines before parsing.
// So parse it the way a browser would, against a fixed origin, and keep it only if it is
// still on that origin; return the rebuilt path, never the raw string.

const BASE = "https://same-origin.invalid";

/**
 * @param {unknown} raw
 * @param {string} [fallback]
 * @returns {string} a path on this site, or `fallback`
 */
export function safeNext(raw, fallback = "/") {
  if (typeof raw !== "string" || !raw.startsWith("/")) return fallback;
  try {
    const u = new URL(raw, BASE);
    return u.origin === BASE ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
