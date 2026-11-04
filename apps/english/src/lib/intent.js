// Intent events (TRAFFIC-BASELINE-TIERED-PROMPT.md, Tier 2): what visitors *do* that says
// they would pay — exam practice, the level they test at, sign-ups, teacher tools, and the
// "shadow paywall" (would_lock): how often a learner reaches a limit that PREMIUM-FEATURES
// would enforce, while PUBLIC_PAYWALL is still off and nothing is locked.
//
// Rules, because these go into PostHog:
//   - Only after "Akzeptieren". track() alone is not enough: with "Ablehnen" PostHog runs
//     cookieless and would still take custom events. This checks da_consent itself, and
//     writes nothing to the device either until the answer is yes.
//   - Ids and numbers only in properties. No e-mail, no free text, no answers.
//   - Never in the Android app (it loads no analytics; nothing is stored for it either).
//   - Never blocks or changes anything the learner sees.
import { track } from "./track.js";
import { APP, PAYWALL, can, feature } from "./access.js";
import { today } from "./srs.js";

function consented() {
  try {
    return localStorage.getItem("da_consent") === "granted";
  } catch {
    return false;
  }
}

/** track(), but only with consent and never in the app. `beacon`: on pagehide, sent at once
 *  through PostHog's sendBeacon transport (the lazy import in track.js may not land in time). */
export function intent(event, props, { beacon = false } = {}) {
  if (APP || !consented()) return;
  if (beacon) {
    try {
      window.posthog?.capture(event, props, { transport: "sendBeacon" });
    } catch {}
    return;
  }
  track(event, props);
}

/* --------------------------------------------------------------- shadow paywall -- */

// localStorage["da_meter_<feature>_<YYYY-MM-DD>"] = { fired: true }
// One key per feature and Berlin day (the server meter's day, src/lib/srs.js); older days of
// the same feature are dropped on write. It counts nothing: the meters themselves count
// (srs.js reviewsToday(), the Fehler list, the plan's weeks, the server's usage_daily for
// Aussprache). This only makes would_lock fire once per feature per day.
const meterKey = (id, day = today()) => `da_meter_${id}_${day}`;

function readMeter(id) {
  try {
    return JSON.parse(localStorage.getItem(meterKey(id)) || "null") ?? {};
  } catch {
    return {};
  }
}

function writeMeter(id, value) {
  try {
    const key = meterKey(id);
    const prefix = `da_meter_${id}_`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix) && k !== key)
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** The free limit of a feature (src/data/premium-features.json), whatever PAYWALL says. */
export const freeLimit = (id) => feature(id).free.limit;

/**
 * Report that the free meter of `id` would lock right now. The caller decides that with the
 * same check its real lock uses (reviewsToday() >= limit, list longer than the limit, …);
 * this only adds "not for someone who has really unlocked it" and "once a day".
 * @param {string} id - a premium-features.json id
 * @param {boolean} lockedNow
 */
export function wouldLock(id, lockedNow) {
  if (!lockedNow || APP || !consented()) return;
  if (PAYWALL && can(id)) return; // paid and unlocked: there is no lock to hit
  const m = readMeter(id);
  if (m.fired) return;
  writeMeter(id, { ...m, fired: true });
  track("would_lock", { feature: id });
}

/* ------------------------------------------------------------------ sign-up -- */

const SIGNUP_KEY = "da_signup_tracked";
const SIGNUP_WINDOW_MS = 24 * 60 * 60_000;

/**
 * account_signup: the first time a brand-new account (created in the last 24 h) is seen
 * signed in on this device. Called by AuthStatus once the session is known. `method` is
 * Supabase's provider ("google", "email" — the latter for password and magic link alike).
 * @param {{ id: string, created_at?: string, app_metadata?: { provider?: string } } | null} user
 */
export function noteSignup(user) {
  if (!user?.created_at || APP || !consented()) return;
  if (Date.now() - new Date(user.created_at).getTime() > SIGNUP_WINDOW_MS) return;
  try {
    if (localStorage.getItem(SIGNUP_KEY) === user.id) return;
    localStorage.setItem(SIGNUP_KEY, user.id);
  } catch {
    return;
  }
  track("account_signup", { method: user.app_metadata?.provider ?? "unknown" });
}
