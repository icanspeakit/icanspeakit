// Page scripts import { track } from here. Offline build: forwards to the analytics stand-in,
// which records nothing (set localStorage "ea-debug-track" in dev to log events).
import { track as t } from "./analytics.js";
/** @param {string} event @param {Record<string, unknown>} [props] */
export function track(event, props) {
  try { t(event, props); } catch {}
}
