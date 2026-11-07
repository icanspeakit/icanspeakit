/* Which browser is this? A readable name ("Chrome · Windows") and a stable id per browser.
 *
 * Why: progress lives in localStorage, so it belongs to one browser on one device. The
 * notice "Nur in diesem Browser gespeichert" is true but abstract — people with a phone and
 * a laptop don't know which "this" is meant. Naming it ("… (Chrome · Windows)") makes the
 * limit concrete. The id is the first step of the account sync (AUTH-SSO-TIERED-PROMPT.md,
 * Tier 2): once progress is mirrored to Supabase, each write can say which browser made it,
 * so /konto can later list "Chrome · Windows, zuletzt heute" and the merge can tell two
 * devices apart.
 *
 * Nothing here is fingerprinting: the name comes only from what the browser openly reports
 * (User-Agent Client Hints, else the user-agent string), the id is a random UUID made here
 * and kept in this browser's own storage, and neither leaves the device in this step.
 */

const DEVICE_KEY = "da-device-v1";

function detectBrowser(ua, brands) {
  const has = (name) => brands.some((b) => b.brand === name);
  // Order matters: Edge, Opera and Samsung also say "Chrome" and "Safari" in their UA.
  if (has("Microsoft Edge") || /Edg(e|A|iOS)?\//.test(ua)) return "Edge";
  if (has("Opera") || /OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser\//.test(ua)) return "Samsung Internet";
  if (typeof navigator !== "undefined" && navigator.brave) return "Brave";
  if (/Firefox\/|FxiOS\//.test(ua)) return "Firefox";
  if (has("Google Chrome") || /Chrome\/|CriOS\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  if (has("Chromium")) return "Chromium";
  return "Browser";
}

function detectOs(ua, platform) {
  const p = (platform || "").toLowerCase();
  if (/iPhone/.test(ua)) return "iPhone";
  // iPadOS 13+ reports itself as a Mac; a touch screen gives it away.
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
  if (p === "android" || /Android/.test(ua)) return "Android";
  if (p === "windows" || /Windows/.test(ua)) return "Windows";
  if (p === "macos" || /Mac OS X|Macintosh/.test(ua)) return "Mac";
  if (p === "chrome os" || /CrOS/.test(ua)) return "ChromeOS";
  if (p === "linux" || /Linux/.test(ua)) return "Linux";
  return "";
}

function isNativeApp() {
  try {
    return !!window.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** { browser, os, label } — e.g. { "Chrome", "Windows", "Chrome · Windows" }. */
export function browserName() {
  if (typeof navigator === "undefined") return { browser: "Browser", os: "", label: "Browser" };
  const ua = navigator.userAgent || "";
  const hints = navigator.userAgentData;
  const brands = hints?.brands ?? [];
  const os = detectOs(ua, hints?.platform);
  // Inside the Android app the "browser" is our own WebView; call it what the learner sees.
  const browser = isNativeApp() ? "icanspeak-spanish-App" : detectBrowser(ua, brands);
  return { browser, os, label: os ? `${browser} · ${os}` : browser };
}

/** This browser's own record: a random id made once, and the name it had then. */
export function thisDevice() {
  const now = browserName();
  let rec = null;
  try {
    rec = JSON.parse(localStorage.getItem(DEVICE_KEY) || "null");
  } catch { /* private mode or broken JSON: make a new one */ }
  if (!rec?.id) {
    const id = globalThis.crypto?.randomUUID?.() ?? `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    rec = { id, name: now.label, created: new Date().toISOString() };
  }
  // A browser update can change what we detect ("Chromium" → "Chrome"): keep the id, refresh the name.
  if (rec.name !== now.label) rec.name = now.label;
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(rec));
  } catch { /* storage off: the name still shows, the id just won't persist */ }
  return rec;
}

/* Every "Nur in diesem Browser gespeichert" notice on the page gets this browser's name.
   It swaps the i18n key rather than the text, so a later language switch keeps the name. */
export async function nameLocalOnlyNotices() {
  const els = document.querySelectorAll('[data-i18n="fortschritt.localOnly"]');
  if (!els.length) return;
  const { name } = thisDevice();
  const vars = JSON.stringify({ browser: name });
  for (const el of els) {
    el.setAttribute("data-i18n", "fortschritt.localOnlyNamed");
    el.setAttribute("data-i18n-vars", vars);
    el.setAttribute("data-i18n-attr", "title:fortschritt.localOnlyTitle");
    el.textContent = `Nur in diesem Browser gespeichert (${name})`;
    el.title = "Dein Fortschritt liegt nur in diesem Browser. In einem anderen Browser oder auf einem anderen Gerät siehst du ihn noch nicht.";
  }
  // The page's language may already be painted; repaint just these in it.
  try {
    const { loadDict, getLang, translate } = await import("./i18n.js");
    const dict = await loadDict(getLang());
    for (const el of els) {
      if (dict["fortschritt.localOnlyNamed"]) el.textContent = translate(dict, "fortschritt.localOnlyNamed", { browser: name });
      if (dict["fortschritt.localOnlyTitle"]) el.title = dict["fortschritt.localOnlyTitle"];
    }
  } catch { /* German stays */ }
}
