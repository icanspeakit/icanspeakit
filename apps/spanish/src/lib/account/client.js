// The real Supabase client, for sign-in and progress sync only.
//
// Everything else that used to talk to Supabase (classes, live quiz, realtime rooms) still
// goes through the offline stand-in in src/lib/supabase/browser.js: those tables don't exist
// in the new project, so switching them on would only produce errors.
//
// supabase-js is loaded on demand: a signed-out visitor on an ordinary page never downloads
// it (hasSession() reads one localStorage key), only the account page and signed-in
// learners do. The same file in every course app.
import { SUPABASE_URL, SUPABASE_KEY, SESSION_KEY } from "./config.js";

let client;

/** Cheap check before loading anything: is a session stored in this browser? */
export function hasSession() {
  try {
    return !!localStorage.getItem(SESSION_KEY);
  } catch {
    return false;
  }
}

/** @returns {Promise<import("@supabase/supabase-js").SupabaseClient>} */
export function getClient() {
  return (client ||= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: SESSION_KEY,
      },
    }),
  ));
}
