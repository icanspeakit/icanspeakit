// Spanish variety of a content item (docs/content-plan.md §1.5).
//
// Castilian Spanish (Spain) is the course standard. Vocabulary, grammar and audio items carry
// `variety: "es-ES"`; where Latin American usage differs, an optional `es419` note records it:
//
//   "variety": "es-ES",
//   "es419": { "note": "In most of Latin America: la computadora.", "form": "computadora", "gender": "la" }
//
// so a LatAm mode can be switched on later without rewriting content. Until then nothing is
// shown for es419: LATAM_MODE is false and the read helpers below return the Spain text.
//
// Plain ESM without Vite imports: scripts/check-variety.mjs and the lexicon/berufe validators
// share these rules with the pages.

/** The course standard. An item without `variety` (and without a parent that has one) is es-ES. */
export const DEFAULT_VARIETY = "es-ES";

/** Allowed `variety` values. "es-419" is reserved for future Latin-America-only items. */
export const VARIETIES = ["es-ES", "es-419"];

/** Off until a later item builds a LatAm mode. While false, es419 notes stay invisible. */
export const LATAM_MODE = false;

/** Keys allowed inside `es419`. `note` is required. */
export const ES419_KEYS = ["note", "form", "gender", "skip"];
export const ES419_NOTE_MAX = 160;
/** `es419.gender`: the article of the Latin American noun when it differs. */
export const ES419_GENDERS = ["el", "la"];

/** The item's variety: its own `variety`, else the parent's (topic, pack, file), else es-ES. */
export function varietyOf(item, parent) {
  return item?.variety ?? parent?.variety ?? DEFAULT_VARIETY;
}

/** The item's es419 note object, or null when Latin American usage is the same. */
export function es419Of(item) {
  const n = item?.es419;
  return n && typeof n === "object" && !Array.isArray(n) ? n : null;
}

/** Text to show for an item's main field: the es419 `form` in LatAm mode, the Spain text otherwise. */
export function textFor(item, text, latam = LATAM_MODE) {
  const form = latam ? es419Of(item)?.form : undefined;
  return form ?? text;
}

/** True when the item is Spain-only and should be left out in LatAm mode (never while it is off). */
export function skippedFor(item, latam = LATAM_MODE) {
  return Boolean(latam && es419Of(item)?.skip === true);
}

/** Verb tables and drills show the vosotros row only in the Spain standard. */
export function showsVosotros(latam = LATAM_MODE) {
  return !latam;
}

/**
 * Shape problems of one object's `variety` / `es419` fields, as messages (empty = fine).
 * `opts.noun`: the item is a lexicon/deck noun, so `es419.gender` is allowed.
 */
export function varietyProblems(obj, opts = {}) {
  const out = [];
  if (!obj || typeof obj !== "object") return out;
  if ("variety" in obj && !VARIETIES.includes(obj.variety)) {
    out.push(`variety must be one of ${VARIETIES.join(", ")}, got ${JSON.stringify(obj.variety)}`);
  }
  if (!("es419" in obj)) return out;
  const n = obj.es419;
  if (!n || typeof n !== "object" || Array.isArray(n)) {
    out.push("es419 must be an object { note, form?, gender?, skip? }");
    return out;
  }
  const unknown = Object.keys(n).filter((k) => !ES419_KEYS.includes(k));
  if (unknown.length) out.push(`es419: unknown key(s) ${unknown.join(", ")} (allowed: ${ES419_KEYS.join(", ")})`);
  if (typeof n.note !== "string" || !n.note.trim()) out.push("es419.note is required (plain English)");
  else if (n.note.length > ES419_NOTE_MAX) out.push(`es419.note is ${n.note.length} characters, max ${ES419_NOTE_MAX}`);
  if ("form" in n && (typeof n.form !== "string" || !n.form.trim())) out.push("es419.form must be a non-empty string");
  if ("gender" in n) {
    if (!ES419_GENDERS.includes(n.gender)) out.push(`es419.gender must be el or la, got ${JSON.stringify(n.gender)}`);
    else if (opts.noun === false) out.push("es419.gender is only for nouns");
  }
  if ("skip" in n && n.skip !== true) out.push("es419.skip must be true (omit it otherwise)");
  if (obj.variety === "es-419") out.push("an es-419 item carries no es419 note (the note describes how LatAm differs from es-ES)");
  return out;
}
