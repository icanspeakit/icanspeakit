// Progress sync for signed-in learners: one row per learner and course in
// public.course_progress (user_id, course, data, updated_at), protected by row-level security.
//
// `data` is a snapshot of this course's learning state: every localStorage key that carries
// this course's suffix (":english", ":francais" … see src/lib/courseStorage.js), minus the
// bookkeeping keys that start with "__". Shared keys (theme, consent, display name) are not
// part of it; the display name travels in the account's user_metadata instead.
//
// On page load: pull this course's row and compare.
//   - no row yet                      -> push what this browser has
//   - row not newer than our last sync -> push if this browser changed since
//   - row newer (another device)       -> take it; if this browser changed too, keep per key
//                                         the longer value (the one with more recorded
//                                         activity), then push the merged state
// After that: push every 30 s and when the page is hidden, if anything changed.
//
// The same file in every course app.
import { COURSE } from "../courseStorage.js";

const TABLE = "course_progress";
const SUF = ":" + COURSE;
const TS = "__acct_ts" + SUF; // updated_at of the row as of our last sync
const HASH = "__acct_hash" + SUF; // hash of the snapshot as of our last sync
const OWNER = "__acct_user" + SUF; // whose account that sync state belongs to
const MAX_VALUE = 300_000; // characters; anything bigger stays on the device

let sb = null;
let user = null;
let started = false;
let busy = false;

// The unwrapped Storage methods (src/components/CourseStorage.astro exposes them), so the
// suffixed names are read and written as they are stored.
const R = typeof Storage !== "undefined" ? Storage.prototype.__raw : null;
const raw = {
  key: (i) => R.key.call(localStorage, i),
  get: (k) => R.get.call(localStorage, k),
  set: (k, v) => R.set.call(localStorage, k, v),
  del: (k) => R.del.call(localStorage, k),
};

function courseKeys() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = raw.key(i);
    if (k && k.endsWith(SUF) && !k.startsWith("__")) out.push(k);
  }
  return out;
}

/** This course's learning state, keyed by the plain (unsuffixed) name. */
export function snapshot() {
  /** @type {Record<string, string>} */
  const data = {};
  for (const k of courseKeys()) {
    const v = raw.get(k);
    if (v != null && v.length <= MAX_VALUE) data[k.slice(0, -SUF.length)] = v;
  }
  return data;
}

/** @param {Record<string, string>} data */
function hash(data) {
  const s = JSON.stringify(Object.keys(data).sort().map((k) => [k, data[k]]));
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36) + "." + s.length;
}

/** Replace this course's learning state with `data`. @param {Record<string, string>} data */
function apply(data) {
  for (const k of courseKeys()) if (!(k.slice(0, -SUF.length) in data)) raw.del(k);
  for (const [k, v] of Object.entries(data)) if (typeof v === "string") raw.set(k + SUF, v);
}

/** Per key, the longer of the two values wins. */
function merge(remote, local) {
  const out = { ...remote };
  for (const [k, v] of Object.entries(local)) if (!(k in out) || v.length > String(out[k]).length) out[k] = v;
  return out;
}

const time = (iso) => (iso ? Date.parse(iso) || 0 : 0);

async function push(data = snapshot()) {
  const updated_at = new Date().toISOString();
  const { error } = await sb.from(TABLE).upsert({ user_id: user.id, course: COURSE, data, updated_at });
  if (error) {
    console.warn("[account] push failed", error.message);
    return false;
  }
  raw.set(TS, updated_at);
  raw.set(HASH, hash(data));
  return true;
}

async function reconcile() {
  const { data: row, error } = await sb.from(TABLE).select("data, updated_at").eq("course", COURSE).maybeSingle();
  if (error) throw error;
  const local = snapshot();
  const localHash = hash(local);
  const localChanged = localHash !== raw.get(HASH);

  if (!row) {
    if (Object.keys(local).length) await push(local);
    return;
  }
  if (time(row.updated_at) <= time(raw.get(TS))) {
    if (localChanged) await push(local);
    return;
  }
  const next = localChanged ? merge(row.data || {}, local) : row.data || {};
  apply(next);
  raw.set(TS, row.updated_at);
  raw.set(HASH, hash(row.data || {}));
  if (localChanged) await push(snapshot());
  else raw.set(HASH, hash(snapshot()));

  // The page has already rendered from the old state: show the synced one, once per tab.
  const once = "__acct_reloaded" + SUF;
  if (hash(snapshot()) !== localHash && !sessionStorage.getItem(once)) {
    sessionStorage.setItem(once, "1");
    location.reload();
  } else {
    sessionStorage.removeItem(once);
  }
}

async function tick() {
  if (!sb || busy) return;
  busy = true;
  try {
    const data = snapshot();
    if (hash(data) !== raw.get(HASH)) await push(data);
    syncName();
  } finally {
    busy = false;
  }
}

/** The display name is shared by every course: it lives in the account, not in a row. */
function syncName() {
  let name = null;
  try { name = localStorage.getItem("da_display_name"); } catch {}
  const meta = user?.user_metadata || {};
  if (name && name !== meta.display_name) {
    meta.display_name = name;
    sb.auth.updateUser({ data: { display_name: name } }).catch(() => {});
  }
}

/** Once per page, for a signed-in learner. */
export async function startSync(client, signedIn) {
  if (started || !R || !client || !signedIn) return;
  started = true;
  sb = client;
  user = signedIn;
  // Another account signed in on this browser: its sync state starts fresh.
  if (raw.get(OWNER) !== user.id) {
    raw.del(TS);
    raw.del(HASH);
    raw.set(OWNER, user.id);
  }
  try {
    const meta = user.user_metadata || {};
    if (!localStorage.getItem("da_display_name") && (meta.display_name || meta.full_name || meta.name)) {
      localStorage.setItem("da_display_name", String(meta.display_name || meta.full_name || meta.name).split(" ")[0]);
    }
  } catch {}
  busy = true;
  try {
    await reconcile();
  } catch (e) {
    console.warn("[account] sync failed", e?.message || e);
  } finally {
    busy = false;
  }
  setInterval(tick, 30_000);
  addEventListener("visibilitychange", () => document.visibilityState === "hidden" && tick());
  addEventListener("pagehide", tick);
}

/** Push now (before signing out). */
export function flush() {
  return tick();
}

/** Forget whose sync state this is, so the next account to sign in starts fresh. */
export function forget() {
  if (!R) return;
  raw.del(TS);
  raw.del(HASH);
  raw.del(OWNER);
}
