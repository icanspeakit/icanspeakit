// The learner's Stunden on the server: public.lernstunden (supabase/migrations/
// 20261027120000_lernstunden.sql). Browser only, and only loaded for a signed-in browser
// (hasAuthCookie): a signed-out learner's Stunde stays in localStorage (lernstunde.js) and
// is merged in here after login (syncAll).
//
// RLS is the check (own rows; a teacher reads members' rows of their class, never writes);
// nothing here guards anything. Every query still filters on the learner's own id, because
// a teacher's select would otherwise also return their students' rows.
import { createBrowserSupabase } from "../supabase/browser.js";
import { fromServer, keyText, mergeLern, toServer } from "./lernen.js";

const TABLE = "lernstunden";
const COLS = "id, klasse_id, niveau, block, stunden, stunde, minuten, current_step, step_status, step_ms, fortschritt, running_since, last_active_at, status, started_at, updated_at, completed_at";
// After login, the device's Stunden are merged in once per account on this device.
const SYNCED_KEY = "da:lernstunden-sync";

let client = null;
const sb = () => (client ??= createBrowserSupabase());

/** Same test as LiveQuizLink.astro: whether a Supabase session cookie exists (a hint only). */
export const hasAuthCookie = () => /(^|;\s*)sb-[^=]*-auth-token[^=]*=/.test(document.cookie);

let uidP = null;
/** The signed-in learner's id, or null. */
export function myId() {
  uidP ??= sb().auth.getSession().then(({ data }) => data?.session?.user?.id ?? null).catch(() => null);
  return uidP;
}

const byKey = (q, k) => q.eq("niveau", k.niveau).eq("block", k.block).eq("stunden", k.stunden).eq("stunde", k.stunde).eq("minuten", k.minuten);

/** The learner's copy of this Stunde: the open one, else the latest completed; null if none. */
export async function serverLernstunde(k) {
  const uid = await myId();
  if (!uid) return null;
  const { data, error } = await byKey(sb().from(TABLE).select(COLS).eq("user_id", uid), k)
    .order("updated_at", { ascending: false }).limit(5);
  if (error) throw error;
  const rows = data ?? [];
  const open = rows.find((r) => r.status !== "completed");
  return open ?? rows[0] ?? null;
}

/**
 * Saves a snapshot: update by id, insert if the row is not there yet. Resolves to the stored
 * id, or null for a signed-out browser. An insert that clashes with an open row made on
 * another device (one open row per Stunde) merges into that row instead.
 */
export async function saveLernstunde(snap, klasseId = null) {
  const uid = await myId();
  if (!uid) return null;
  const row = toServer(snap, klasseId ?? snap.klasse ?? null);
  const { id, niveau, block, stunden, stunde, minuten, ...changes } = row;
  const upd = await sb().from(TABLE).update(changes).eq("id", id).eq("user_id", uid).select("id");
  if (upd.error) throw upd.error;
  if (upd.data?.length) return id;
  const ins = await sb().from(TABLE).insert(row).select("id");
  if (!ins.error) return id;
  if (ins.error.code !== "23505") throw ins.error;
  const other = await serverLernstunde(snap.key);
  if (!other) throw ins.error;
  const merged = mergeLern(snap, fromServer(other));
  const { id: _, niveau: a, block: b, stunden: c, stunde: d, minuten: e, ...rest } = toServer(merged, klasseId ?? merged.klasse ?? null);
  const again = await sb().from(TABLE).update(rest).eq("id", other.id).eq("user_id", uid);
  if (again.error) throw again.error;
  return other.id;
}

/** The learner's Stunden, newest first (Tier 4: /progress), as snapshots. */
export async function meineLernstunden(limit = 30) {
  const uid = await myId();
  if (!uid) return [];
  const { data, error } = await sb().from(TABLE).select(COLS).eq("user_id", uid).order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(fromServer);
}

/**
 * After login: the Stunden this device kept while signed out (the running one and the
 * archive) are merged into the server, once per account and device. Resolves to the number
 * merged. `snaps`: the device's snapshots (lernstunde.js deviceSnapshots()).
 */
export async function syncAll(snaps) {
  const uid = await myId();
  if (!uid) return 0;
  try { if (localStorage.getItem(SYNCED_KEY) === uid) return 0; } catch {}
  let n = 0;
  const seen = new Set();
  for (const snap of snaps) {
    const k = keyText(snap.key);
    if (seen.has(k)) continue;
    seen.add(k);
    try {
      const server = await serverLernstunde(snap.key);
      // A completed server copy and an older device copy: nothing to add.
      const merged = mergeLern(snap, server ? fromServer(server) : null);
      await saveLernstunde(merged);
      n++;
    } catch {}
  }
  try { localStorage.setItem(SYNCED_KEY, uid); } catch {}
  return n;
}

/** A teacher's view: the Stunden their class's members walk for this class (RLS lets a teacher
 *  read exactly those, from members who had joined before starting), newest first. */
export async function lernstundenDerKlasse(klasseId) {
  const { data, error } = await sb().from(TABLE).select(`${COLS}, user_id`).eq("klasse_id", klasseId)
    .order("updated_at", { ascending: false }).limit(1000);
  if (error) throw error;
  return data ?? [];
}
