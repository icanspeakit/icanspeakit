// Offline stand-in for error monitoring (was Sentry; see src/lib/backend.js).
export const MONITORING_ON = false;
export const SENTRY_DSN = undefined;
export const monitoringConfigured = false;
export const TUNNEL = null;
export function scrub(event) { return event; }
export function baseOptions() { return {}; }
export const errorsOnly = (defaults) => defaults;
