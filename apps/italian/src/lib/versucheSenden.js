// Sends the queued rows of ./versuche.js to uebung_versuche. Loaded on demand, and only
// for a visitor with a session, so the Supabase client never lands on the page of a
// signed-out learner because of the log.
//
// vorbereiten() finds out once per tab session whether this account logs: it is in a class
// (one head-only count on klassen_mitglieder) or holds an active Einladung (entitlements with
// source 'einladung'). Cached in sessionStorage; ./klassen.js clears the cache on join and
// leave, /einladung after redeeming. It also keeps the access token at hand, so that senden() can
// start its fetch synchronously in pagehide: an await there would lose the request.
//
// The insert is a plain PostgREST POST with `fetch(…, { keepalive })`. sendBeacon can't
// carry the Authorization header, and supabase-js has no keepalive option.
// on_conflict=client_id + resolution=ignore-duplicates turns a repeated row into a no-op.
import { createBrowserSupabase } from "./supabase/browser.js";
import { readQueue, writeQueue } from "./versuche.js";

export const MITGLIED_KEY = "da_klassen_mitglied";
const URL_ = import.meta.env.PUBLIC_SUPABASE_URL;
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const CHUNK = 50; // keepalive bodies are capped at 64 KB per page; 50 rows are ~15 KB

let token = null;
let uid = null;
// Rows on their way. A pagehide send must not wait for an earlier one, but must not send
// the same rows twice either (the server would ignore them; this saves the bytes).
const inflight = new Set();

/** Resolves to true (in a class), false (not), or null (unknown: offline, signed out). */
export async function vorbereiten() {
  const sb = createBrowserSupabase();
  const { data } = await sb.auth.getSession();
  const session = data?.session;
  if (!session) return null;
  token = session.access_token;
  uid = session.user.id;
  sb.auth.onAuthStateChange((_e, s) => {
    token = s?.access_token ?? null;
    if (s && s.user.id !== uid) {
      // Another account signed in on this tab: rows queued for the old one must not be
      // sent under the new one's name.
      uid = s.user.id;
      writeQueue([]);
    }
  });

  try {
    const cached = JSON.parse(sessionStorage.getItem(MITGLIED_KEY) ?? "null");
    if (cached?.uid === uid) return cached.member;
  } catch {}
  const { count, error } = await sb
    .from("klassen_mitglieder")
    .select("klasse_id", { count: "exact", head: true })
    .eq("user_id", uid);
  if (error) return null;
  let member = (count ?? 0) > 0;
  if (!member) {
    // Accounts that took an Einladung log too: /einladung says so before the button, and
    // /intern/admin shows it. Own rows only (RLS on entitlements).
    const { data: inv, error: invErr } = await sb
      .from("entitlements")
      .select("expires_at, revoked_at")
      .eq("source", "einladung");
    if (invErr) return null;
    member = (inv ?? []).some((r) => !r.revoked_at && (!r.expires_at || new Date(r.expires_at) > new Date()));
  }
  try { sessionStorage.setItem(MITGLIED_KEY, JSON.stringify({ uid, member })); } catch {}
  return member;
}

/** Sends what is queued. Never throws; failures stay in the queue for the next try. */
export function senden({ keepalive = false } = {}) {
  if (!token) return;
  const queue = readQueue().filter((r) => !inflight.has(r.client_id));
  if (!queue.length) return;
  queue.forEach((r) => inflight.add(r.client_id));
  const chunks = [];
  for (let i = 0; i < queue.length; i += CHUNK) chunks.push(queue.slice(i, i + CHUNK));
  const requests = chunks.map((rows) =>
    fetch(`${URL_}/rest/v1/uebung_versuche?on_conflict=client_id`, {
      method: "POST",
      keepalive,
      headers: {
        apikey: KEY,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    })
      .then((res) => {
        // Accepted, or refused for good (a bad row, RLS, the daily cap): either way it leaves
        // the queue, or it would be retried forever. Auth, timeouts, rate limits and
        // server errors stay and are tried again.
        const done = res.ok || (res.status >= 400 && res.status < 500 && ![401, 408, 429].includes(res.status));
        if (!res.ok && done) console.warn("[versuche] rows refused", res.status);
        return done ? rows.map((r) => r.client_id) : [];
      })
      .catch(() => []),
  );
  Promise.all(requests).then((sent) => {
    const gone = new Set(sent.flat());
    writeQueue(readQueue().filter((r) => !gone.has(r.client_id)));
    queue.forEach((r) => inflight.delete(r.client_id));
  });
}
