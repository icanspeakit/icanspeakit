// The learner's first language for pronunciation help — one setting shared by the
// Aussprache-Check and /culture/mistakes. Pick it on one page and the other follows: the tab on
// /culture/mistakes and the picker on the Check both read and write it here.
//
// Not the UI language (src/lib/i18n.js): that is the language the site talks in (de, en,
// ar, tr, uk). This is the language someone grew up with — "vietnamesisch", "arabisch" … —
// and decides which sounds are worth drilling. Ids are those of fehler-nach-sprache.json.
//
// Stored like the mascot switch (src/lib/mascotPrefs.js): localStorage for every visitor,
// and Supabase user_metadata.muttersprache for a signed-in learner, so it follows them to
// another browser. The local value wins when both exist (see syncMutterspracheFromAccount).
import { createBrowserSupabase } from "./supabase/browser.js";

const KEY = "da-muttersprache";
const EVENT = "da:muttersprache-change";

export function getMuttersprache() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

function applyLocal(id) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id } }));
}

/** Set it here and, when signed in, on the account. `id` null clears it. */
export async function setMuttersprache(id) {
  if (id !== getMuttersprache()) applyLocal(id);
  try {
    const supabase = createBrowserSupabase();
    // getUser(), not the stored session: the comparison needs the account's current value,
    // which another device may have changed. Runs on a change only, not per page view.
    const { data } = await supabase.auth.getUser();
    if (data?.user && data.user.user_metadata?.muttersprache !== id) {
      await supabase.auth.updateUser({ data: { muttersprache: id ?? null } });
    }
  } catch {}
}

/** Called with the new id whenever it changes — on this page or in another tab. */
export function onMutterspracheChange(fn) {
  window.addEventListener(EVENT, (e) => fn(e.detail.id));
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) fn(e.newValue || null);
  });
}

/**
 * A browser without a choice takes the account's (signed in on a new device). A browser that
 * has one keeps it: every change here is written to the account too, so the two only differ
 * while such a write is still on its way — and then the local one is the newer.
 */
export async function syncMutterspracheFromAccount() {
  if (getMuttersprache()) return;
  try {
    const supabase = createBrowserSupabase();
    // getUser(): the value another device set. Runs only while this browser has no choice.
    const { data } = await supabase.auth.getUser();
    const v = data?.user?.user_metadata?.muttersprache;
    if (typeof v === "string" && v && !getMuttersprache()) applyLocal(v);
  } catch {}
}

/**
 * ?lang=<id> in the address wins over the stored choice and is stored, because a link that
 * names a language ("Aussprache-Check mit Vietnamesisch-Profil") is someone choosing it.
 * Returns the id in effect, or null.
 */
export function mutterspracheFromUrl(known) {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && known.includes(q)) {
    // Not awaited: the local value is set at once, the account write finishes later.
    setMuttersprache(q);
    return q;
  }
  const saved = getMuttersprache();
  return saved && known.includes(saved) ? saved : null;
}
