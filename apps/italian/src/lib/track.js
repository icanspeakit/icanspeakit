// Page scripts import { track } from here. Offline build: forwards to the analytics stand-in,
// which records nothing (set localStorage "ea-debug-track" in dev to log events).
//
// analytics.js is loaded lazily, never imported statically: ad blockers block files named
// analytics*.js, and a blocked static import takes down every module that imports this one
// (2026-11-14: the placement test showed an empty card). Events sent before it has loaded
// wait in a queue; if it never loads, they are dropped and the page works as before.
/** @type {Array<[string, Record<string, unknown> | undefined]> | null} */
let queue = [];
/** @type {((event: string, props?: Record<string, unknown>) => void) | null} */
let send = null;
import("./analytics.js")
  .then((m) => {
    send = m.track;
    for (const [event, props] of queue ?? []) {
      try { send(event, props); } catch {}
    }
  })
  .catch(() => {})
  .finally(() => { queue = null; });

/** @param {string} event @param {Record<string, unknown>} [props] */
export function track(event, props) {
  if (send) {
    try { send(event, props); } catch {}
  } else if (queue) {
    if (queue.length < 50) queue.push([event, props]);
  }
}
