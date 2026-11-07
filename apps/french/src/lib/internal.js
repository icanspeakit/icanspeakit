// "Is this one of Edgar's own devices?" — one answer for analytics and the demo dock.
//
// local:    a dev server (localhost, a LAN IP, *.local).
// internal: this browser was opened once with ?intern=1 (stored as da_internal);
//           ?intern=0 forgets it. The flag is read and written here, on the same load.
//
// Self-contained on purpose (no imports, no outer variables): DemoDock.astro inlines its
// source with `${internalDevice}` so the dock is decided before first paint, while
// analytics.js imports the very same function.
export function internalDevice() {
  if (typeof location === "undefined") return { local: false, internal: false };
  const h = location.hostname;
  const local =
    /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(h) ||
    /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) ||
    h.endsWith(".local");
  let internal = false;
  try {
    const flag = new URLSearchParams(location.search).get("intern");
    if (flag === "1") {
      localStorage.setItem("da_internal", "1");
      localStorage.setItem("va-disable", "true"); // Vercel Web Analytics' own opt-out
    } else if (flag === "0") {
      localStorage.removeItem("da_internal");
      localStorage.removeItem("va-disable");
    }
    internal = localStorage.getItem("da_internal") === "1";
  } catch {}
  return { local, internal };
}

/** True on a dev server or a browser flagged with ?intern=1. */
export function isInternalDevice() {
  const d = internalDevice();
  return d.local || d.internal;
}
