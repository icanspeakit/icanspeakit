// Offline stand-in: no analytics, no consent banner, no third-party scripts
// (see src/lib/backend.js). Same exports as the PostHog/GA4 version it replaces.
export const analyticsConfigured = false;
export function getConsent() { return "denied"; }
export function setConsent(_value) {}
export function resetConsent() {}
export function onConsentChange(_fn) { return () => {}; }
export function initAnalytics() {}
/** @param {string} _event @param {Record<string, unknown>} [_props] */
export function track(_event, _props) {
  if (import.meta.env.DEV && typeof localStorage !== "undefined" && localStorage.getItem("ea-debug-track")) {
    console.debug("[track]", _event, _props ?? {});
  }
}
