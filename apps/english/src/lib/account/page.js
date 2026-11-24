// The account page (src/components/AccountCard.astro): sign in with Google or an email
// link, see who is signed in, sign out. Both ways come back to this same page; supabase-js
// finishes the sign-in from the ?code= in the URL (PKCE). The same file in every course app.
import { getClient } from "./client.js";
import { startSync, flush, forget } from "./sync.js";
import { markSlots, displayName } from "./nav.js";
import { retranslate } from "../i18n.js";

const FALLBACK = {
  "auth.error.google": "Could not sign in with Google. Please try again.",
  "auth.error.email": "The email could not be sent. Is the address correct?",
  "auth.error.callback": "Sign-in was cancelled. Please try again.",
};

export async function initAccountPage(root) {
  if (!root) return;
  const $ = (sel) => root.querySelector(sel);
  const show = (view) => root.querySelectorAll("[data-view]").forEach((v) => (v.hidden = v.dataset.view !== view));
  const error = (key) => {
    const el = $("[data-acct-error]");
    el.hidden = !key;
    if (key) {
      el.setAttribute("data-i18n", key);
      el.textContent = FALLBACK[key] || key;
      retranslate().catch(() => {});
    }
  };
  const busy = (btn, on) => {
    btn.disabled = on;
    btn.querySelector(".da-auth-spinner")?.toggleAttribute("hidden", !on);
  };
  const here = () => location.origin + location.pathname;

  const params = new URLSearchParams(location.search);
  const failed = params.has("error") || params.has("error_description");

  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  const user = data?.session?.user;

  // Drop ?code= / ?error= from the address bar once they have been used.
  if (params.has("code") || failed) history.replaceState(null, "", here() + location.hash);

  if (user) {
    $("[data-acct-name]").textContent = displayName(user);
    $("[data-acct-email]").textContent = user.email || "";
    show("in");
    markSlots(user);
    startSync(sb, user);
  } else {
    show("out");
    if (failed) error("auth.error.callback");
  }

  $("[data-acct-google]").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    error(null);
    busy(btn, true);
    const { error: err } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: here() } });
    if (err) {
      busy(btn, false);
      error("auth.error.google");
    }
  });

  $("[data-acct-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("[data-acct-send]");
    const email = String($("[data-acct-input]").value || "").trim();
    error(null);
    if (!email) return $("[data-acct-input]").focus();
    busy(btn, true);
    const { error: err } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: here(), shouldCreateUser: true } });
    busy(btn, false);
    if (err) return error("auth.error.email");
    $("[data-acct-sent-to]").textContent = email;
    show("sent");
  });

  $("[data-acct-back]").addEventListener("click", () => {
    show("out");
    $("[data-acct-input]").focus();
  });

  $("[data-acct-signout]").addEventListener("click", async (e) => {
    busy(e.currentTarget, true);
    await flush().catch(() => {});
    await sb.auth.signOut().catch(() => {});
    forget();
    markSlots(null);
    show("out");
    busy(e.currentTarget, false);
  });
}
