// Portuguese variety of a content item (docs/content-plan.md §1.5).
//
// European Portuguese (Portugal) is the course standard. Vocabulary, grammar and audio items carry
// `variety: "pt-PT"`; where Brazilian usage differs in a way a learner would notice, an optional
// `ptBR` note records it:
//
//   "variety": "pt-PT",
//   "ptBR": { "note": "In Brazil: o ônibus. Autocarro is the Portugal word.", "form": "ônibus", "gender": "o" }
//
// so a Brazil mode can be switched on later without rewriting content. Until then nothing is
// shown for ptBR: BRAZIL_MODE is false and the read helpers below return the Portugal text.
//
// Transition: the data still holds the Spanish course's `variety: "es-ES"` and `es419` notes
// until each module's Portuguese item has run. Those legacy values are accepted (with the old
// Spanish rules) while LEGACY_ALLOWED is true; scripts/check-variety.mjs counts them and makes
// them errors in modules already converted (its STRICT list). `cleanup` sets LEGACY_ALLOWED to
// false once no Spanish value is left.
//
// Plain ESM without Vite imports: scripts/check-variety.mjs and the lexicon/berufe/business
// validators share these rules with the pages.

/** The course standard. An item without `variety` (and without a parent that has one) is pt-PT. */
export const DEFAULT_VARIETY = "pt-PT";

/** Allowed `variety` values. "pt-BR" is reserved for future Brazil-only items; no run writes it now. */
export const VARIETIES = ["pt-PT", "pt-BR"];

/** Off until a later item builds a Brazil mode. While false, ptBR notes stay invisible. */
export const BRAZIL_MODE = false;

/** Keys allowed inside `ptBR`. `note` is required. */
export const PTBR_KEYS = ["note", "form", "gender", "skip"];
export const PTBR_NOTE_MAX = 160;
/** `ptBR.gender`: the article of the Brazilian noun when it differs (o autocarro → o ônibus keeps "o"). */
export const PTBR_GENDERS = ["o", "a"];

/** Spanish-course values still in unconverted data (see the header). */
export const LEGACY_ALLOWED = true;
export const LEGACY_VARIETIES = ["es-ES", "es-419"];
export const LEGACY_NOTE_KEY = "es419";
const LEGACY_GENDERS = ["el", "la"];

/** True when the object still carries a Spanish-course variety value or es419 note. */
export function isLegacy(obj) {
  return Boolean(obj && typeof obj === "object" && (LEGACY_VARIETIES.includes(obj.variety) || LEGACY_NOTE_KEY in obj));
}

/** True for the course standard: "pt-PT", and during the transition the Spanish "es-ES". The
 *  module validators (verb tables, conjugation sets, worksheets, word traps) require it. */
export function isStandardVariety(v) {
  return v === DEFAULT_VARIETY || (LEGACY_ALLOWED && v === LEGACY_VARIETIES[0]);
}

/** The item's variety: its own `variety`, else the parent's (topic, pack, file), else pt-PT. */
export function varietyOf(item, parent) {
  return item?.variety ?? parent?.variety ?? DEFAULT_VARIETY;
}

/** The item's ptBR note object, or null when Brazilian usage is the same. */
export function ptBROf(item) {
  const n = item?.ptBR;
  return n && typeof n === "object" && !Array.isArray(n) ? n : null;
}

/** Text to show for an item's main field: the ptBR `form` in Brazil mode, the Portugal text otherwise. */
export function textFor(item, text, brazil = BRAZIL_MODE) {
  const form = brazil ? ptBROf(item)?.form : undefined;
  return form ?? text;
}

/** True when the item is Portugal-only and should be left out in Brazil mode (never while it is off). */
export function skippedFor(item, brazil = BRAZIL_MODE) {
  return Boolean(brazil && ptBROf(item)?.skip === true);
}

/** Verb tables and drills show the vós row only in the Portugal standard (content-plan §4.1). */
export function showsVos(brazil = BRAZIL_MODE) {
  return !brazil;
}

// Shape of one note object (ptBR, or the legacy es419), as messages.
function noteProblems(key, n, genders, opts) {
  const out = [];
  if (!n || typeof n !== "object" || Array.isArray(n)) {
    out.push(`${key} must be an object { note, form?, gender?, skip? }`);
    return out;
  }
  const unknown = Object.keys(n).filter((k) => !PTBR_KEYS.includes(k));
  if (unknown.length) out.push(`${key}: unknown key(s) ${unknown.join(", ")} (allowed: ${PTBR_KEYS.join(", ")})`);
  if (typeof n.note !== "string" || !n.note.trim()) out.push(`${key}.note is required (plain English)`);
  else if (n.note.length > PTBR_NOTE_MAX) out.push(`${key}.note is ${n.note.length} characters, max ${PTBR_NOTE_MAX}`);
  if ("form" in n && (typeof n.form !== "string" || !n.form.trim())) out.push(`${key}.form must be a non-empty string`);
  if ("gender" in n) {
    if (!genders.includes(n.gender)) out.push(`${key}.gender must be ${genders.join(" or ")}, got ${JSON.stringify(n.gender)}`);
    else if (opts.noun === false) out.push(`${key}.gender is only for nouns`);
  }
  if ("skip" in n && n.skip !== true) out.push(`${key}.skip must be true (omit it otherwise)`);
  return out;
}

/**
 * Shape problems of one object's `variety` / `ptBR` fields (and, during the transition, the
 * legacy `es419`), as messages (empty = fine).
 * `opts.noun`: the item is a lexicon/deck noun, so `ptBR.gender` is allowed.
 * `opts.legacy`: accept the Spanish-course values (default LEGACY_ALLOWED; check-variety passes
 * false for modules that are already Portuguese).
 */
export function varietyProblems(obj, opts = {}) {
  const out = [];
  if (!obj || typeof obj !== "object") return out;
  const legacy = opts.legacy ?? LEGACY_ALLOWED;
  if ("variety" in obj) {
    const ok = VARIETIES.includes(obj.variety) || (legacy && LEGACY_VARIETIES.includes(obj.variety));
    if (!ok) out.push(`variety must be one of ${VARIETIES.join(", ")}, got ${JSON.stringify(obj.variety)}`);
  }
  if (LEGACY_NOTE_KEY in obj) {
    if (!legacy) out.push(`${LEGACY_NOTE_KEY} is the Spanish course's note: convert it to ptBR (or drop it)`);
    else out.push(...noteProblems(LEGACY_NOTE_KEY, obj.es419, LEGACY_GENDERS, opts));
    if ("ptBR" in obj) out.push(`an item carries ptBR or ${LEGACY_NOTE_KEY}, not both`);
  }
  if (!("ptBR" in obj)) return out;
  out.push(...noteProblems("ptBR", obj.ptBR, PTBR_GENDERS, opts));
  if (obj.variety === "pt-BR") out.push("a pt-BR item carries no ptBR note (the note describes how Brazil differs from pt-PT)");
  if (LEGACY_VARIETIES.includes(obj.variety)) out.push(`a ptBR note on a ${obj.variety} item: set variety to pt-PT when the item is converted`);
  return out;
}
