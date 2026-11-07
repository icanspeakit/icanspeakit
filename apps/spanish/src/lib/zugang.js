// The browser's copy of "what has this learner bought" — a HINT, not a key.
//
// localStorage["da-zugang"] = { products: [...], until: {...}, at: <ms> }
//
// It exists so pages can draw the right lock state before first paint (the inline script
// in src/layouts/Layout.astro reads it, like da-theme and da_lang). Anyone can edit it in
// the dev tools, and that is fine: paid content and metered features are refused by the
// server regardless of what this says. Only soft locks (features that cost nothing and
// touch only the learner's own data) trust it — see docs/monetization-gating-ideas-v1.md.
import { apiFetch } from "./api.js";

const KEY = "da-zugang";
const MAX_AGE_MS = 10 * 60_000;
let inflight = null;

/** @returns {{ products: string[], until: Record<string,string|null>, at: number } | null} */
export function readZugang() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && Array.isArray(v.products) ? v : null;
  } catch {
    return null;
  }
}

export function clearZugang() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  document.documentElement.dataset.plan = "anon";
  window.dispatchEvent(new CustomEvent("da:zugang", { detail: null }));
}

function planOf(products) {
  if (products.includes("premium")) return "premium";
  if (products.some((p) => p.startsWith("pack_"))) return "pack";
  return "free";
}

/**
 * Bring the hint up to date with the account. Called by AuthStatus once the session is
 * known (it is on every page). Signed out → cleared. Signed in → refetched at most every
 * ten minutes, or at once with `force` (after a purchase).
 * @param {object|null} user - the Supabase user, or null
 * @param {{ force?: boolean }} [opts]
 */
export function syncZugang(user, { force = false } = {}) {
  if (!user) {
    if (readZugang()) clearZugang();
    else document.documentElement.dataset.plan = "anon";
    return Promise.resolve(null);
  }
  const cached = readZugang();
  if (!force && cached && Date.now() - cached.at < MAX_AGE_MS) {
    document.documentElement.dataset.plan = planOf(cached.products);
    return Promise.resolve(cached);
  }
  if (inflight) return inflight;
  inflight = apiFetch("/api/konto/zugang", { credentials: "same-origin" })
    .then(async (res) => {
      if (res.status === 401) {
        clearZugang();
        return null;
      }
      if (!res.ok) return cached;
      const body = await res.json();
      const value = { products: body.products ?? [], until: body.until ?? {}, at: Date.now() };
      try {
        localStorage.setItem(KEY, JSON.stringify(value));
      } catch {}
      document.documentElement.dataset.plan = planOf(value.products);
      window.dispatchEvent(new CustomEvent("da:zugang", { detail: value }));
      return value;
    })
    .catch(() => cached)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
