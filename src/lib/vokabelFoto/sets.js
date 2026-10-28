// „Vokabeln vom Foto“: a teacher's saved card sets (table vokabel_sets, own rows only via
// RLS, supabase/migrations/*_vokabel_sets.sql). Browser only (/lehrkraefte/karten…).
//
// Saved word: { lemma, pos?, article?, plural?, translation?, lexId?, checked, reflexive?, separable? }
// lexId = the word is in our lexicon (card, audio and translations come from there).
// checked = a lexicon word, or a word the teacher confirmed in the review table.
import { createBrowserSupabase } from "../supabase/browser.js";

export { currentUser, isTeacher, setTeacher } from "../liveQuiz/custom.js";

export const MAX_WORDS = 80;
export const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const TABLE = "vokabel_sets";
const COLS = "id, name, level, words, share_token, updated_at";
const POS = new Set(["noun", "verb", "adj", "adv", "prep", "conj", "pron", "num", "phrase", "other"]);

let client = null;
const sb = () => (client ??= createBrowserSupabase());

const clip = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** One word as it may be stored, or null when nothing usable is left. */
export function cleanWord(w) {
  const lemma = clip(w?.lemma, 80);
  if (!lemma) return null;
  const out = { lemma };
  if (POS.has(w.pos)) out.pos = w.pos;
  if (["der", "die", "das"].includes(w.article)) out.article = w.article;
  const plural = clip(w.plural, 80);
  if (plural) out.plural = plural;
  const translation = clip(w.translation, 120);
  if (translation) out.translation = translation;
  // Translations the teacher added per language (from our data or Azure Translator).
  const tr = Object.entries(w.translations ?? {}).filter(([k, v]) => /^[a-z]{2,3}$/.test(k) && clip(v, 120));
  if (tr.length) out.translations = Object.fromEntries(tr.slice(0, 25).map(([k, v]) => [k, clip(v, 120)]));
  if (typeof w.lexId === "string" && /^[a-z0-9-]{1,80}$/.test(w.lexId)) out.lexId = w.lexId;
  out.checked = Boolean(out.lexId || w.checked);
  if (w.reflexive) out.reflexive = true;
  if (w.separable) out.separable = true;
  return out;
}

/** The key two rows count as the same word by: article + lemma, case and umlaut spelling ignored. */
export const wordKey = (w) =>
  `${w.article ?? ""} ${String(w.lemma ?? "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z]/g, "")}`;

export async function listSets() {
  const { data, error } = await sb().from(TABLE).select(COLS).order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSet(id) {
  const { data, error } = await sb().from(TABLE).select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Inserts (no id) or updates a set. Resolves to the saved row. */
export async function saveSet({ id, name, level, words }) {
  const row = {
    name: clip(name, 80) || "Meine Wörter",
    level: LEVELS.includes(level) ? level : null,
    words: (words ?? []).map(cleanWord).filter(Boolean).slice(0, MAX_WORDS),
  };
  const q = id ? sb().from(TABLE).update(row).eq("id", id) : sb().from(TABLE).insert(row);
  const { data, error } = await q.select(COLS).single();
  if (error) throw error;
  return data;
}

/** The set's share token, made on first use: 24 random a–z0–9. Resolves to the token. */
export async function shareToken(set) {
  if (set.share_token) return set.share_token;
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  const token = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => abc[b % abc.length]).join("");
  const { error } = await sb().from(TABLE).update({ share_token: token }).eq("id", set.id);
  if (error) throw error;
  set.share_token = token;
  return token;
}

/** Sharing off: the link (and any class task using it) stops working. */
export async function unshare(set) {
  const { error } = await sb().from(TABLE).update({ share_token: null }).eq("id", set.id);
  if (error) throw error;
  set.share_token = null;
}

export const shareUrl = (token) => `${location.origin}/kartenset?t=${token}`;

/** A shared set, for students (no account): { name, level, words } or null. */
export async function getSharedSet(token) {
  const res = await fetch(`/api/wortschatz/set?t=${encodeURIComponent(token)}`);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`set ${res.status}`);
  return res.json();
}

/** Azure Translator for words our data has no translation for. Throws an Error for the teacher. */
export async function translateWords(words, to) {
  return (await askTranslator({ to, words })).translations;
}

// What goes to the translator: a noun with the indefinite article. „der Schrank“ alone came back
// as a government cabinet, „ein Schrank“ as a cupboard; „eine Leiter“ (ladder) ≠ „ein Leiter“.
export const machineText = (w) =>
  w.article ? `${w.article === "die" ? "eine" : "ein"} ${w.lemma}` : [w.reflexive ? "sich" : null, w.lemma].filter(Boolean).join(" ");
// …and the article that comes back with it („a cupboard“, „un armario“) is dropped again.
const LEAD = { en: /^(a|an)\s+/i, es: /^(un|una)\s+/i, fr: /^(un|une)\s+/i, pt: /^(um|uma)\s+/i, ro: /^(un|o)\s+/i };
export const stripArticle = (text, lang) => text.replace(LEAD[lang] ?? /^$/, "").trim();

/** German synonym candidates from Azure's dictionary, per word ({ lemma, pos }) best first. */
export async function synonymWords(words) {
  return (await askTranslator({ to: ["de"], words })).synonyms;
}

async function askTranslator(body) {
  // One quiet retry when the answer is not the route's own JSON: a dropped connection or a
  // server error page means the request never reached the route (in `astro dev` the local
  // Workers runtime restarts on every file change), so nothing was metered. A JSON error
  // (limit, translator trouble) is the route's answer and is not retried.
  const call = async () => {
    try {
      const res = await fetch("/api/wortschatz/uebersetzen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      return /json/.test(res.headers.get("content-type") ?? "") ? res : null;
    } catch {
      return null;
    }
  };
  const res = (await call()) ?? (await new Promise((r) => setTimeout(r, 800)).then(call));
  if (!res) throw new Error("Keine Verbindung zum Server. Bitte versuchen Sie es gleich noch einmal.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Die Übersetzung hat gerade nicht geklappt.");
  return data;
}

export async function deleteSet(id) {
  const { error } = await sb().from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

/** Shrinks a photo in the browser before upload: longest side ≤ 2000 px, JPEG. Phone photos are 3–8 MB; Azure F0 takes ≤ 4 MB. */
export async function shrinkPhoto(file, max = 2000) {
  if (!/^image\//.test(file.type)) return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // e.g. HEIC in a browser that can't decode it: send as is, the server says no
  }
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 3.5e6 && /jpe?g|png|webp/.test(file.type)) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file;
}

/** Photos and/or text lines (from PDF, Word, text: dateien.js) → word list via /api/wortschatz/foto. Throws an Error whose message is for the teacher. */
export async function readPhotos(files, lines = []) {
  const body = new FormData();
  for (const f of files) body.append("foto", f);
  if (lines.length) body.append("zeilen", JSON.stringify(lines));
  let res;
  try {
    res = await fetch("/api/wortschatz/foto", { method: "POST", body });
  } catch {
    throw new Error("Keine Verbindung. Prüfen Sie das Internet und versuchen Sie es noch einmal.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Das Foto konnte gerade nicht ausgewertet werden.");
  return data;
}
