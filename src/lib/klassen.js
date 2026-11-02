// Klassen: a teacher's classes and the students who joined them with a code
// (KLASSEN-TIERED-PROMPT.md). The only module that talks to the tables in
// supabase/migrations/*_klassen.sql. Browser only.
//
// What protects what: RLS, not this file. A teacher reads the members of their own classes
// only; a student reads their own memberships and the name of the class, never the other
// members. Joining is the klasse_beitreten() function (rate-limited, never a direct insert)
// and the code is made by the database. So the functions here are conveniences; none of
// them is a check.
import { createBrowserSupabase } from "./supabase/browser.js";

export const MAX_MITGLIEDER = 60;
export const MAX_KLASSEN = 20;
export const NIVEAUS = ["A1", "A2", "B1", "B2", "C1", "C2"];
// The 31 characters a code is made of: no 0/O, 1/I/L.
const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/;

let client = null;
const sb = () => (client ??= createBrowserSupabase());

// versucheSenden.js caches "is this account in a class?" per tab; a join or a leave makes
// that answer stale.
const forgetMembership = () => { try { sessionStorage.removeItem("da_klassen_mitglied"); } catch {} };

async function uid() {
  // The session in this browser: the id only fills in own rows, and RLS checks it anyway.
  const { data } = await sb().auth.getSession();
  return data?.session?.user?.id ?? null;
}

/** "abc-def" / " ABC DEF " → "ABCDEF". Does not say whether it is valid; see isCode. */
export const normCode = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
export const isCode = (s) => CODE_RE.test(normCode(s));

/** The link a student opens (or the QR code encodes). */
export const joinLink = (code, origin = location.origin) => `${origin}/join?code=${encodeURIComponent(code)}`;

/* ------------------------------------------------------------------ teacher ---- */

/**
 * The signed-in teacher's classes, newest first, each with `mitglieder` (count).
 * Filtered on owner: RLS would also return classes this account merely joined.
 */
export async function meineKlassen() {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await sb()
    .from("klassen")
    .select("id, name, code, niveau, archiviert, created_at, klassen_mitglieder(count)")
    .eq("owner", me)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ klassen_mitglieder, ...k }) => ({ ...k, mitglieder: klassen_mitglieder?.[0]?.count ?? 0 }));
}

/** Members of one of the teacher's classes, by name. */
export async function mitglieder(klasseId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(klasseId ?? ""))) return [];
  const { data, error } = await sb()
    .from("klassen_mitglieder")
    .select("user_id, anzeigename, beigetreten_at")
    .eq("klasse_id", klasseId)
    .order("anzeigename");
  if (error) throw error;
  return data ?? [];
}

/** Turns a Postgres error into "limit" (20 active classes) or rethrows it. */
function limitOr(error) {
  if (String(error?.message ?? "").includes("klassen_limit")) {
    const e = new Error("limit");
    e.code = "limit";
    throw e;
  }
  throw error;
}

/** New class. Resolves to the row, code included. Throws { code: "limit" } at 20 active. */
export async function klasseAnlegen({ name, niveau = null }) {
  const row = { name: String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 80), niveau: NIVEAUS.includes(niveau) ? niveau : null };
  const { data, error } = await sb().from("klassen").insert(row).select("id, name, code, niveau, archiviert, created_at").single();
  if (error) limitOr(error);
  return { ...data, mitglieder: 0 };
}

/** Archive (true) or bring back (false). Bringing back can throw { code: "limit" }. */
export async function klasseArchivieren(klasseId, an) {
  const { error } = await sb().from("klassen").update({ archiviert: !!an }).eq("id", klasseId);
  if (error) limitOr(error);
}

/** Deletes the class and every membership in it (cascade). */
export async function klasseLoeschen(klasseId) {
  const { error } = await sb().from("klassen").delete().eq("id", klasseId);
  if (error) throw error;
}

/** A new code; the old one stops working at once. Resolves to the new code. */
export async function codeErneuern(klasseId) {
  const { data, error } = await sb().rpc("klasse_code_erneuern", { p_klasse: klasseId });
  if (error) throw error;
  return data;
}

export async function mitgliedEntfernen(klasseId, userId) {
  const { error } = await sb().from("klassen_mitglieder").delete().eq("klasse_id", klasseId).eq("user_id", userId);
  if (error) throw error;
}

/* ------------------------------------------------------------------ student ---- */

/** The classes the signed-in account joined: [{ klasse_id, anzeigename, beigetreten_at, klasse: { name, niveau, archiviert } }]. */
export async function meineMitgliedschaften() {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await sb()
    .from("klassen_mitglieder")
    .select("klasse_id, anzeigename, beigetreten_at, klasse:klassen(name, niveau, archiviert)")
    .eq("user_id", me)
    .order("beigetreten_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Join with a code. Resolves to { ok: true, klasse_id, name, niveau, schon } or
 * { ok: false, fehler } with fehler "anmelden" | "limit" | "code" | "voll" | "name" —
 * or "netz" when the request itself failed.
 */
export async function beitreten(code, name) {
  try {
    const { data, error } = await sb().rpc("klasse_beitreten", { p_code: normCode(code), p_name: String(name ?? "") });
    if (error) return { ok: false, fehler: "netz" };
    if (data?.ok) forgetMembership();
    return data;
  } catch {
    return { ok: false, fehler: "netz" };
  }
}

/** Leave a class. The teacher's view of this student ends at once (RLS). */
export async function verlassen(klasseId) {
  const me = await uid();
  if (!me) return;
  const { error } = await sb().from("klassen_mitglieder").delete().eq("klasse_id", klasseId).eq("user_id", me);
  if (error) throw error;
  forgetMembership();
}

/* ---------------------------------------------------------------- dashboard ---- */

/**
 * One of the signed-in teacher's classes, or null. Filtered on owner like meineKlassen():
 * a class this account merely joined is not a dashboard it may open. Another teacher's id
 * returns null too — RLS hands back no row, there is nothing to check here.
 */
export async function meineKlasse(klasseId) {
  const me = await uid();
  if (!me || !/^[0-9a-f-]{36}$/i.test(String(klasseId ?? ""))) return null;
  const { data, error } = await sb()
    .from("klassen")
    .select("id, name, code, niveau, archiviert")
    .eq("id", klasseId)
    .eq("owner", me)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const VERSUCH_COLS = "user_id, uebung_ref, skill, richtig, gesamt, gestartet_at, beendet_at, dauer_ms, quelle, hinweise";
const PAGE = 1000; // PostgREST's default max rows per request

/**
 * The attempts of these students since `seit` (Date), newest first. RLS already limits a
 * teacher to rows from after a student joined one of their classes; the dashboard narrows
 * that to *this* class's join date itself. Paged, because a class of 25 can pass 1000 rows
 * in a month.
 */
export async function versucheDerKlasse(userIds, seit) {
  if (!userIds.length) return [];
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb().from("uebung_versuche").select(VERSUCH_COLS).in("user_id", userIds);
    if (seit) q = q.gte("beendet_at", seit.toISOString());
    const { data, error } = await q.order("beendet_at", { ascending: false }).order("id", { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

/* ----------------------------------------------------------------- aufgaben ---- */

const AUFGABE_COLS = "id, klasse_id, uebung_ref, titel, faellig_at, min_richtig_prozent, created_at";

/** The tasks of one of the teacher's classes, by due date. */
export async function aufgabenDerKlasse(klasseId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(klasseId ?? ""))) return [];
  const { data, error } = await sb().from("aufgaben").select(AUFGABE_COLS).eq("klasse_id", klasseId).order("faellig_at");
  if (error) throw error;
  return data ?? [];
}

/** `faellig_at`: an instant (see aufgabenStatus.berlinTagesende). Throws { code: "limit" } at 200. */
export async function aufgabeStellen({ klasseId, ref, titel, faelligAt, minProzent = null }) {
  const row = {
    klasse_id: klasseId,
    uebung_ref: ref,
    titel: String(titel ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
    faellig_at: faelligAt,
    min_richtig_prozent: minProzent ? Math.max(1, Math.min(100, Math.round(minProzent))) : null,
  };
  const { data, error } = await sb().from("aufgaben").insert(row).select(AUFGABE_COLS).single();
  if (error) {
    if (String(error.message).includes("aufgaben_limit")) throw Object.assign(new Error("limit"), { code: "limit" });
    throw error;
  }
  return data;
}

export async function aufgabeLoeschen(id) {
  const { error } = await sb().from("aufgaben").delete().eq("id", id);
  if (error) throw error;
}

/**
 * The signed-in student's tasks in the classes they joined (not ones they set as a
 * teacher), with the class name, and their own attempts since the oldest of them.
 * Resolves to null when the account is in no class: then nothing else was asked.
 */
export async function meineAufgaben() {
  const me = await uid();
  if (!me) return null;
  const { data: ms, error: e1 } = await sb().from("klassen_mitglieder").select("klasse_id").eq("user_id", me);
  if (e1) throw e1;
  if (!ms?.length) return null;
  const { data: tasks, error: e2 } = await sb()
    .from("aufgaben")
    .select(`${AUFGABE_COLS}, klasse:klassen(name)`)
    .in("klasse_id", ms.map((m) => m.klasse_id))
    .order("faellig_at");
  if (e2) throw e2;
  if (!tasks.length) return { tasks, rows: [] };
  const since = tasks.reduce((a, t) => (t.created_at < a ? t.created_at : a), tasks[0].created_at);
  const { data: rows, error: e3 } = await sb()
    .from("uebung_versuche")
    .select("uebung_ref, richtig, gesamt, beendet_at")
    .eq("user_id", me)
    .gte("beendet_at", since)
    .order("beendet_at", { ascending: false })
    .limit(1000);
  if (e3) throw e3;
  return { tasks, rows };
}
