// The one seam between the site and any backend (auth, database, payments, e-mail, analytics,
// error monitoring, speech services).
//
// icanspeak Spanish ships with NO integrations: every page is static, progress lives in the
// learner's browser (localStorage), and nothing leaves the device. The modules that used to
// talk to a service (src/lib/supabase/browser.js, analytics.js, monitoring.js, api.js) are
// kept as offline stand-ins with the same exports, so every feature still compiles and
// behaves as "signed out, everything free".
//
// To add a real backend later: flip the switch below for that service and replace the
// stand-in module's body. Nothing else should need to know.
export const BACKEND = {
  auth: false, // accounts + cloud sync (was Supabase)
  payments: false, // checkout + entitlements (was Stripe)
  email: false, // newsletters + transactional mail (was Brevo)
  analytics: false, // product analytics (was PostHog + GA4)
  monitoring: false, // error reporting (was Sentry)
  speech: false, // pronunciation scoring + TTS + OCR (was Azure)
  languageTool: false, // "Correct my text" on /writing also asks api.languagetool.org (schreibKorrektur.js)
  realtime: false, // live quiz / classes rooms (was Supabase Realtime)
};

/** Thrown/returned by every stand-in so callers can tell "offline by design" from a bug. */
export const OFFLINE = { message: "icanspeak Spanish: no backend configured (see src/lib/backend.js)", code: "offline" };
