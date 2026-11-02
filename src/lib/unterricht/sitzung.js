// Lesson sessions on the server: the table public.unterrichtssitzungen (supabase/migrations/
// 20261026120000_unterrichtssitzungen.sql). Browser only. The clock is timer.js, the local
// copy, the saver and the key helpers are speichern.js.
//
// RLS is the check (own sessions, own classes only); nothing here guards anything.
import { createBrowserSupabase } from "../supabase/browser.js";
import { isId } from "./speichern.js";

const TABLE = "unterrichtssitzungen";
const COLS = "id, klasse_id, niveau, block, stunden, stunde, minuten, current_step, step_ms, running_since, last_active_at, status, started_at, updated_at, completed_at";

let client = null;
const sb = () => (client ??= createBrowserSupabase());

/** The open (not completed) session of a class for this Stunde, or null. */
export async function offeneSitzung(klasseId, k) {
  const { data, error } = await sb().from(TABLE).select(COLS)
    .eq("klasse_id", klasseId).eq("niveau", k.niveau).eq("block", k.block)
    .eq("stunden", k.stunden).eq("stunde", k.stunde).neq("status", "completed")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** New session for a class and Stunde; resolves to the stored row. */
export async function sitzungAnlegen(klasseId, k, row) {
  const { data, error } = await sb().from(TABLE)
    .insert({ klasse_id: klasseId, niveau: k.niveau, block: k.block, stunden: k.stunden, stunde: k.stunde, minuten: k.minuten, ...row })
    .select(COLS).single();
  if (error) throw error;
  return data;
}

/** One session with its class's name, or null (not found or not this teacher's). */
export async function sitzungLaden(id) {
  if (!isId(id)) return null;
  const { data, error } = await sb().from(TABLE).select(`${COLS}, klassen(name)`).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { klassen, ...row } = data;
  return { ...row, gruppe: klassen?.name ?? "" };
}

export async function sitzungSpeichern(id, row) {
  const { error } = await sb().from(TABLE).update(row).eq("id", id);
  if (error) throw error;
}

/**
 * The teacher's sessions for one plan (all its Stunden), newest first, each with its
 * class's name: the progress lines on /teachers/timetable.
 */
export async function planFortschritt(k) {
  const { data, error } = await sb().from(TABLE).select(`${COLS}, klassen(name, archiviert)`)
    .eq("niveau", k.niveau).eq("block", k.block).eq("stunden", k.stunden)
    .order("updated_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).filter((r) => !r.klassen?.archiviert)
    .map(({ klassen, ...r }) => ({ ...r, gruppe: klassen?.name ?? "" }));
}

/** The class's lessons taught to the end since `seit` (Date), newest first: what the class
 *  page offers to release for absent students („Für Abwesende freigeben“, Tier 3). */
export async function beendeteSitzungen(klasseId, seit) {
  const { data, error } = await sb().from(TABLE).select(COLS).eq("klasse_id", klasseId).eq("status", "completed")
    .gte("completed_at", seit.toISOString()).order("completed_at", { ascending: false }).limit(20);
  if (error) throw error;
  return data ?? [];
}
