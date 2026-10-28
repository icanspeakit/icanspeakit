// Can this visitor use this feature? — the one place that answers it.
//
// Two sources, never confused:
//   - In the browser: the `da-zugang` hint (src/lib/zugang.js). Good enough for SOFT locks
//     only — features that cost nothing per use and touch only the learner's own data.
//   - On the server: the entitlements rows, read as the user (src/lib/usage.ts, the paid
//     content routes). Everything that costs money or is paid content is decided there.
//
// PUBLIC_PAYWALL is the kill switch: anything but exactly "on" means every gate is open
// and no price is shown anywhere — so gated features can ship before payments do. Read it
// here and nowhere else.
//
// Keep `plan()` and planOf() in src/lib/zugang.js in sync with the inline first-paint script
// in src/layouts/Layout.astro.
import features from "../data/premium-features.json";
import { covers } from "./entitlements.js";
import { readZugang } from "./zugang.js";

export const PAYWALL = import.meta.env.PUBLIC_PAYWALL === "on";
export const APP = import.meta.env.PUBLIC_TARGET === "app";

/** @param {string} id */
export function feature(id) {
  const f = features.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown premium feature "${id}" — add it to src/data/premium-features.json`);
  return f;
}

/** Does a set of product ids unlock this feature? Server and browser. */
export function unlocks(products, featureId) {
  const f = feature(featureId);
  const set = products instanceof Set ? products : new Set(products);
  return f.unlockedBy.some((p) => {
    if (!p.endsWith("*")) return covers(set, p);
    // "pack_*": any pack held directly, or a product that includes packs (Premium's
    // `"includes": ["pack_*"]` matches the pattern itself in covers()).
    const prefix = p.slice(0, -1);
    return [...set].some((have) => have.startsWith(prefix)) || covers(set, p);
  });
}

/** "anon" | "free" | "pack" | "premium" — browser only. */
export function plan() {
  if (typeof document === "undefined") return "anon";
  return document.documentElement.dataset.plan || "anon";
}

/**
 * Soft-lock check in the browser. True when the paywall is off, or the hint says the
 * learner holds a product that unlocks the feature.
 * @param {string} featureId
 */
export function can(featureId) {
  if (!PAYWALL) return true;
  const z = readZugang();
  return !!z && unlocks(new Set(z.products), featureId);
}

/**
 * The limit that applies: the paid one when unlocked, else the free one.
 * @param {string} featureId
 * @param {Iterable<string>} [products] - server side: the user's active products
 */
export function limitFor(featureId, products) {
  const f = feature(featureId);
  const has = products ? unlocks(new Set(products), featureId) : can(featureId);
  if (!PAYWALL) return { ...f.paid, limit: null };
  return has ? f.paid : f.free;
}
