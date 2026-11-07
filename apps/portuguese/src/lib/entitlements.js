// Who has what — the pure part. Safe on the server and in the browser; no I/O here.
//
// Rows come from public.entitlements (supabase/migrations/*_entitlements.sql). A row is
// active when it is not revoked and not expired. `premium` includes every exam pack
// (produkte.json: "includes": ["pack_*"]), so an exam check never has to know about
// subscriptions.
import produkte from "../data/produkte.json";

/** @typedef {{ product: string, expires_at?: string|null, revoked_at?: string|null }} EntitlementRow */

/**
 * The product ids a user can use right now.
 * @param {EntitlementRow[]} rows
 * @param {Date} [now]
 * @returns {Set<string>}
 */
export function activeProducts(rows, now = new Date()) {
  const out = new Set();
  for (const r of rows ?? []) {
    if (!r || r.revoked_at) continue;
    if (r.expires_at && new Date(r.expires_at) <= now) continue;
    out.add(r.product);
  }
  return out;
}

/**
 * Does this set of active products unlock `product`? Handles `includes` wildcards
 * ("pack_*") so Premium opens every pack.
 * @param {Iterable<string>} active
 * @param {string} product
 */
export function covers(active, product) {
  const set = active instanceof Set ? active : new Set(active);
  if (set.has(product)) return true;
  for (const p of produkte) {
    if (!set.has(p.id) || !p.includes) continue;
    for (const pattern of p.includes) {
      if (pattern === product) return true;
      if (pattern.endsWith("*") && product.startsWith(pattern.slice(0, -1))) return true;
    }
  }
  return false;
}

/** The product that unlocks an exam's paid sets, e.g. "dtz" → "pack_dtz". */
export function productForExam(exam) {
  return produkte.find((p) => p.exam === exam)?.id ?? `pack_${exam}`;
}

/** Product metadata by id. */
export function product(id) {
  return produkte.find((p) => p.id === id) ?? null;
}

/**
 * Latest expiry per active product, for display ("gültig bis …").
 * @param {EntitlementRow[]} rows
 * @returns {Record<string, string|null>}
 */
export function validUntil(rows, now = new Date()) {
  const out = {};
  for (const r of rows ?? []) {
    if (!activeProducts([r], now).size) continue;
    const prev = out[r.product];
    if (r.expires_at == null) out[r.product] = null;
    else if (prev !== null && (!prev || r.expires_at > prev)) out[r.product] = r.expires_at;
  }
  return out;
}
