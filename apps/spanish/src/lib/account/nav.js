// The account slot in the nav (src/components/AccountSlot.astro). Signed out it is a plain
// "Sign in" link rendered at build time; this only runs for a stored session: it shows the
// learner's first name and starts the progress sync (./sync.js). The same file in every
// course app.
import { getClient, hasSession } from "./client.js";
import { startSync } from "./sync.js";
import { retranslate } from "../i18n.js";
import { BACKEND } from "../backend.js";

/** First name for the nav: the one the learner typed on the dashboard, else Google's. */
export function displayName(user) {
  let name = null;
  try { name = localStorage.getItem("da_display_name"); } catch {}
  const meta = user?.user_metadata || {};
  name ||= meta.display_name || meta.full_name || meta.name || "";
  return String(name).trim().split(/\s+/)[0] || user?.email || "";
}

/** Show the slots as signed in (or, with null, as signed out again). */
export function markSlots(user) {
  document.querySelectorAll("[data-acct-label]").forEach((el) => {
    if (user) {
      el.removeAttribute("data-i18n");
      el.textContent = displayName(user);
    } else {
      el.setAttribute("data-i18n", "auth.nav.signIn");
      el.textContent = "Sign in";
    }
  });
  document.querySelectorAll("[data-acct-sub]").forEach((el) => {
    el.setAttribute("data-i18n", user ? "auth.nav.signedIn" : "auth.nav.signIn.sub");
    el.textContent = user ? "Signed in" : "Progress on every device";
  });
  document.querySelectorAll("[data-acct-slot]").forEach((el) => el.toggleAttribute("data-signed-in", !!user));
  retranslate().catch(() => {});
}

export async function initAccountNav() {
  if (!BACKEND.accounts || !hasSession()) return;
  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  const user = data?.session?.user;
  if (!user) return;
  markSlots(user);
  startSync(sb, user);
}
