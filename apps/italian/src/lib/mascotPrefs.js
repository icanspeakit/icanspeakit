// "Maskottchen anzeigen" — one switch that turns the whole crew off: the mascots on
// pages, the milestone celebrations and the little feedback animations.
//
// Two stores, one truth per situation:
// - localStorage["da-mascots"] is what every page reads, before first paint (the inline
//   script in Layout.astro sets <html data-mascots>). It works signed out too.
// - For a signed-in learner the choice is also kept on the account, in Supabase
//   user_metadata.mascots, so it follows them to another browser. No table needed:
//   user_metadata is the user's own, writable with their own session.
// On sign-in syncFromAccount() copies the account value down; setMascotsEnabled() writes
// both. The account wins when both exist, because it is the one the learner set on
// purpose (the local value may be a default nobody chose).
import { createBrowserSupabase } from "./supabase/browser.js";

const STORAGE_KEY = "da-mascots";
const EVENT = "da:mascots-change";

export function mascotsEnabled() {
  if (typeof document !== "undefined" && document.documentElement.dataset.mascots) {
    return document.documentElement.dataset.mascots !== "off";
  }
  try { return localStorage.getItem(STORAGE_KEY) !== "off"; } catch { return true; }
}

function applyLocal(on) {
  try { localStorage.setItem(STORAGE_KEY, on ? "on" : "off"); } catch {}
  document.documentElement.dataset.mascots = on ? "on" : "off";
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { on } }));
}

/** Set the preference here and, when signed in, on the account. Resolves to whether the account write succeeded (null = not signed in). */
export async function setMascotsEnabled(on) {
  applyLocal(on);
  try {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return null;
    const { error } = await supabase.auth.updateUser({ data: { mascots: on ? "on" : "off" } });
    return !error;
  } catch {
    return false;
  }
}

/** Copy the account's choice into this browser, if the account has one. Safe to call on every page. */
export async function syncFromAccount(user) {
  const v = user?.user_metadata?.mascots;
  if (v !== "on" && v !== "off") return;
  if ((v === "on") !== mascotsEnabled()) applyLocal(v === "on");
}

export function onMascotsChange(fn) {
  window.addEventListener(EVENT, (e) => fn(e.detail.on));
}
