// Klassentests: the only module that talks to the tables in
// supabase/migrations/*_klassentests.sql. Browser only. RLS and the two database functions
// are what protect anything; these are conveniences.
//
// Teacher side: their own tests and the results of them. Student side: klassentest_laden
// (the questions without answers) and klassentest_abgeben (graded in the database), which
// need no account. The phone's `geraet` token is shared with Umfragen: random, kept on the
// phone, only there so a phone hands in a test once.
import { createBrowserSupabase } from "../supabase/browser.js";
import { withBase } from "../paths.js";
import { geraet } from "../umfrage/daten.js";

export { isCode, normCode } from "../umfrage/daten.js";
import { normCode } from "../umfrage/daten.js";

export const MAX_TESTS = 50;
export const ANZAHLEN = [5, 10, 15, 20, 30];
/** Einstufungstest: questions per level. */
export const PRO_NIVEAU = [3, 4, 5, 6];

let client = null;
const sb = () => (client ??= createBrowserSupabase());

/** The link a student opens (or the QR code encodes). */
export const testLink = (code, origin = location.origin) => `${origin}${withBase("/test")}?c=${encodeURIComponent(code)}`;

/* ------------------------------------------------------------------ teacher ---- */

async function uid() {
  const { data } = await sb().auth.getSession();
  return data?.session?.user?.id ?? null;
}

const COLS = "id, titel, niveau, art, code, offen, created_at, fragen, material";

/** The teacher's tests, newest first, each with `ergebnisse` (count). */
export async function meineTests() {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await sb()
    .from("klassentests")
    .select(`${COLS}, klassentest_ergebnisse(count)`)
    .eq("owner", me)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ klassentest_ergebnisse, ...k }) => ({ ...k, ergebnisse: klassentest_ergebnisse?.[0]?.count ?? 0 }));
}

/** One of the teacher's tests, or null. */
export async function test(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id ?? ""))) return null;
  const { data, error } = await sb().from("klassentests").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** The results of one test: [{ name, antworten, korrekt, richtig, gesamt, created_at }]. */
export async function ergebnisse(id) {
  const { data, error } = await sb()
    .from("klassentest_ergebnisse")
    .select("name, antworten, korrekt, richtig, gesamt, created_at, bewertung")
    .eq("test_id", id)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

/** New test. Resolves to the row, code included. Throws { code: "limit" } at 50. */
export async function testAnlegen({ titel, niveau, art = "thema", fragen, material = {} }) {
  const row = { titel: String(titel ?? "").replace(/\s+/g, " ").trim().slice(0, 120), niveau: niveau || null, art, fragen, material };
  const { data, error } = await sb().from("klassentests").insert(row).select(COLS).single();
  if (error) {
    if (String(error.message ?? "").includes("klassentests_limit")) {
      const e = new Error("limit");
      e.code = "limit";
      throw e;
    }
    throw error;
  }
  return data;
}

export async function testOffen(id, offen) {
  const { error } = await sb().from("klassentests").update({ offen: !!offen }).eq("id", id);
  if (error) throw error;
}

export async function testLoeschen(id) {
  const { error } = await sb().from("klassentests").delete().eq("id", id);
  if (error) throw error;
}

/** Removes one student's result (a test run, a name typed wrong): they can then hand in again. */
export async function ergebnisLoeschen(id, created_at, name) {
  const { error } = await sb().from("klassentest_ergebnisse").delete().eq("test_id", id).eq("created_at", created_at).eq("name", name);
  if (error) throw error;
}

/** The teacher's reading of one student's written text: { punkte: [bool], niveau }. */
export async function bewertungSpeichern(id, created_at, name, bewertung) {
  const { error } = await sb().from("klassentest_ergebnisse").update({ bewertung }).eq("test_id", id).eq("created_at", created_at).eq("name", name);
  if (error) throw error;
}

/* ------------------------------------------------------------------ student ---- */

/** { titel, niveau, art, offen, fragen (no answers) } or null for an unknown code. */
export async function laden(code) {
  const { data, error } = await sb().rpc("klassentest_laden", { p_code: normCode(code) });
  if (error) throw error;
  return data ?? null;
}

/** { status: "ok" | "schon" | "code" | "zu" | "voll" | "ungueltig", richtig?, gesamt?, korrekt? } */
export async function abgeben(code, name, antworten) {
  const { data, error } = await sb().rpc("klassentest_abgeben", {
    p_code: normCode(code),
    p_geraet: geraet(),
    p_name: String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 40),
    p_antworten: antworten,
  });
  if (error) throw error;
  return data ?? { status: "ungueltig" };
}
