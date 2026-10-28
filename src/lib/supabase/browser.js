// Offline stand-in for the Supabase browser client (see src/lib/backend.js).
//
// Same shape as the real client for every call the site makes: auth reports "nobody signed
// in", queries resolve to { data: null, error: OFFLINE }, realtime channels never connect.
// Callers already handle the signed-out and the error case, so they degrade on their own.
import { OFFLINE } from "../backend.js";

const result = () => Promise.resolve({ data: null, error: OFFLINE, count: null, status: 503 });

/** A query builder: every filter/modifier returns itself, awaiting it gives the offline result. */
function query() {
  const q = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return (res, rej) => result().then(res, rej);
      if (prop === "catch") return (fn) => result().catch(fn);
      if (prop === "finally") return (fn) => result().finally(fn);
      return () => q;
    },
    apply() {
      return q;
    },
  });
  return q;
}

function channel() {
  const ch = {
    on: () => ch,
    subscribe: (cb) => {
      try { cb?.("CHANNEL_ERROR", OFFLINE); } catch {}
      return ch;
    },
    send: () => Promise.resolve("error"),
    track: () => Promise.resolve("error"),
    untrack: () => Promise.resolve("error"),
    presenceState: () => ({}),
    unsubscribe: () => Promise.resolve("ok"),
  };
  return ch;
}

const noSession = () => Promise.resolve({ data: { session: null, user: null, claims: null }, error: null });
const refused = () => Promise.resolve({ data: { session: null, user: null, url: null }, error: OFFLINE });

const client = {
  auth: {
    getSession: noSession,
    getUser: noSession,
    getClaims: noSession,
    refreshSession: noSession,
    onAuthStateChange: (_fn) => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: refused,
    signInWithOtp: refused,
    signInWithOAuth: refused,
    signInWithIdToken: refused,
    signUp: refused,
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: refused,
    updateUser: refused,
    exchangeCodeForSession: refused,
    verifyOtp: refused,
  },
  from: () => query(),
  rpc: () => query(),
  channel: () => channel(),
  removeChannel: () => Promise.resolve("ok"),
  removeAllChannels: () => Promise.resolve([]),
  functions: { invoke: result },
  storage: { from: () => ({ upload: result, download: result, remove: result, getPublicUrl: () => ({ data: { publicUrl: "" } }), createSignedUrl: result }) },
};

export function createBrowserSupabase() {
  return client;
}
