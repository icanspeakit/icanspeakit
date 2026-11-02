// Umfragen: the only module that talks to the tables in supabase/migrations/*_umfragen.sql.
// Browser only. RLS and the two database functions are what protect anything; these are
// conveniences.
//
// Teacher side: their own polls and the answers to them. Student side: umfrage_laden and
// umfrage_abstimmen, which need no account and never learn who is asking. The phone's
// `geraet` token is random and stays on the phone (localStorage); it only keeps one answer
// per phone per poll.
import { createBrowserSupabase } from "../supabase/browser.js";
import { ZEITEN } from "./zeit.js";

const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/;
export const MAX_UMFRAGEN = 30;

let client = null;
const sb = () => (client ??= createBrowserSupabase());

/** "abc-def" / " ABC DEF " → "ABCDEF". */
export const normCode = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
export const isCode = (s) => CODE_RE.test(normCode(s));

/** The link a student opens (or the QR code encodes). */
export const umfrageLink = (code, origin = location.origin) => `${origin}/survey?c=${encodeURIComponent(code)}`;

/* ------------------------------------------------------------------ teacher ---- */

async function uid() {
  // The session in this browser: the id only fills in own rows, and RLS checks it anyway.
  const { data } = await sb().auth.getSession();
  return data?.session?.user?.id ?? null;
}

/** The teacher's polls, newest first, each with `antworten` (count). */
export async function meineUmfragen() {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await sb()
    .from("umfragen")
    .select("id, titel, niveau, code, offen, zeit, created_at, fragen, umfrage_antworten(count)")
    .eq("owner", me)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ umfrage_antworten, ...u }) => ({ ...u, antworten: umfrage_antworten?.[0]?.count ?? 0 }));
}

/** One of the teacher's polls, or null. */
export async function umfrage(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id ?? ""))) return null;
  const { data, error } = await sb().from("umfragen").select("id, titel, niveau, code, offen, zeit, created_at, fragen").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** The answers to one poll: [{ antworten, tag }]. Never the phone token. */
export async function antworten(id) {
  const { data, error } = await sb().from("umfrage_antworten").select("antworten, tag").eq("umfrage_id", id).limit(1000);
  if (error) throw error;
  return data ?? [];
}

/** New poll. Resolves to the row, code included. Throws { code: "limit" } at 30.
 *  `zeit`: minutes for the whole poll, shared out per question (zeit.js), or null for no limit. */
export async function umfrageAnlegen({ titel, niveau, fragen, zeit = null }) {
  const row = { titel: String(titel ?? "").replace(/\s+/g, " ").trim().slice(0, 120), niveau: niveau || null, fragen };
  if (ZEITEN.includes(zeit)) row.zeit = zeit;
  const { data, error } = await sb().from("umfragen").insert(row).select("id, titel, niveau, code, offen, zeit, created_at, fragen").single();
  if (error) {
    if (String(error.message ?? "").includes("umfragen_limit")) {
      const e = new Error("limit");
      e.code = "limit";
      throw e;
    }
    throw error;
  }
  return data;
}

export async function umfrageOffen(id, offen) {
  const { error } = await sb().from("umfragen").update({ offen: !!offen }).eq("id", id);
  if (error) throw error;
}

export async function umfrageLoeschen(id) {
  const { error } = await sb().from("umfragen").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ student ---- */

const GERAET_KEY = "da_umfrage_geraet";
const MEINE_KEY = (code) => `da_umfrage_${code}`;

/** This phone's random token, made once. Not tied to an account. */
export function geraet() {
  try {
    let g = localStorage.getItem(GERAET_KEY);
    if (!g || !/^[A-Za-z0-9_-]{16,64}$/.test(g)) {
      const b = crypto.getRandomValues(new Uint8Array(18));
      g = btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      localStorage.setItem(GERAET_KEY, g);
    }
    return g;
  } catch {
    // Private mode without storage: a token for this visit only.
    return (geraet.fallback ??= Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join(""));
  }
}

/** What this phone answered last time, kept on the phone so it can change it. */
export function meineAntwort(code) {
  try { return JSON.parse(localStorage.getItem(MEINE_KEY(code)) ?? "null"); } catch { return null; }
}
function merken(code, a) {
  try { localStorage.setItem(MEINE_KEY(code), JSON.stringify(a)); } catch {}
}

/** { titel, niveau, fragen, offen, zeit } or null for an unknown code. */
export async function laden(code) {
  const { data, error } = await sb().rpc("umfrage_laden", { p_code: normCode(code) });
  if (error) throw error;
  return data ?? null;
}

/** "ok" | "code" | "zu" | "voll" | "ungueltig". */
export async function abstimmen(code, a) {
  const { data, error } = await sb().rpc("umfrage_abstimmen", { p_code: normCode(code), p_geraet: geraet(), p_antworten: a });
  if (error) throw error;
  if (data === "ok") merken(normCode(code), a);
  return data;
}
