// French variety of a content item (docs/content-plan.md §1.5).
//
// Standard French of France is the course standard. Vocabulary, grammar and audio items carry
// `variety: "fr-FR"`; where Québec usage differs in a way a learner would notice, an optional
// `frCA` note records it:
//
//   "variety": "fr-FR",
//   "frCA": { "note": "In Québec: le courriel (France: le mail, un e-mail).", "form": "courriel", "gender": "le" },
//   "regional": "Belgium and Switzerland: septante, nonante."
//
// so a Canada mode can be switched on later without rewriting content. Until then nothing is
// shown for frCA: CANADA_MODE is false and the read helpers below return the France text.
// `regional` (Belgium, Switzerland, Africa) is a plain note, bound to no mode.
//
// The Spanish course's `variety: "es-ES"` and `es419` notes were accepted as legacy while the
// queue converted module by module; `cleanup` removed that branch, so they are errors now.
//
// Plain ESM without Vite imports: scripts/check-variety.mjs and the lexicon/berufe validators
// share these rules with the pages.

/** The course standard. An item without `variety` (and without a parent that has one) is fr-FR. */
export const DEFAULT_VARIETY = "fr-FR";

/** Allowed `variety` values. "fr-CA" is reserved for future Québec-only items; no run writes it now. */
export const VARIETIES = ["fr-FR", "fr-CA"];

/** Off until a later item builds a Canada mode. While false, frCA notes stay invisible. */
export const CANADA_MODE = false;

/** Keys allowed inside `frCA`. `note` is required. */
export const FRCA_KEYS = ["note", "form", "gender", "skip"];
export const FRCA_NOTE_MAX = 160;
/** `frCA.gender`: the article of the Québec noun when it differs (une job vs un job). */
export const FRCA_GENDERS = ["le", "la", "l'"];
/** `regional`: Belgium, Switzerland, Africa, where it matters. Plain English. */
export const REGIONAL_MAX = 160;

/** The item's variety: its own `variety`, else the parent's (topic, pack, file), else fr-FR. */
export function varietyOf(item, parent) {
  return item?.variety ?? parent?.variety ?? DEFAULT_VARIETY;
}

/** The item's frCA note object, or null when Québec usage is the same. */
export function frCAOf(item) {
  const n = item?.frCA;
  return n && typeof n === "object" && !Array.isArray(n) ? n : null;
}

/** Text to show for an item's main field: the frCA `form` in Canada mode, the France text otherwise. */
export function textFor(item, text, canada = CANADA_MODE) {
  const form = canada ? frCAOf(item)?.form : undefined;
  return form ?? text;
}

/** True when the item is France-only and should be left out in Canada mode (never while it is off). */
export function skippedFor(item, canada = CANADA_MODE) {
  return Boolean(canada && frCAOf(item)?.skip === true);
}

function noteProblems(n, key, genders, opts) {
  const out = [];
  if (!n || typeof n !== "object" || Array.isArray(n)) {
    out.push(`${key} must be an object { note, form?, gender?, skip? }`);
    return out;
  }
  const unknown = Object.keys(n).filter((k) => !FRCA_KEYS.includes(k));
  if (unknown.length) out.push(`${key}: unknown key(s) ${unknown.join(", ")} (allowed: ${FRCA_KEYS.join(", ")})`);
  if (typeof n.note !== "string" || !n.note.trim()) out.push(`${key}.note is required (plain English)`);
  else if (n.note.length > FRCA_NOTE_MAX) out.push(`${key}.note is ${n.note.length} characters, max ${FRCA_NOTE_MAX}`);
  if ("form" in n && (typeof n.form !== "string" || !n.form.trim())) out.push(`${key}.form must be a non-empty string`);
  if ("gender" in n) {
    if (!genders.includes(n.gender)) out.push(`${key}.gender must be ${genders.join(", ")}, got ${JSON.stringify(n.gender)}`);
    else if (opts.noun === false) out.push(`${key}.gender is only for nouns`);
  }
  if ("skip" in n && n.skip !== true) out.push(`${key}.skip must be true (omit it otherwise)`);
  return out;
}

/**
 * Shape problems of one object's `variety` / `frCA` / `regional` fields, as messages (empty = fine).
 * `opts.noun`: the item is a lexicon/deck noun, so `frCA.gender` is allowed.
 * A leftover Spanish-course `es419` note or `variety: "es-ES"` is an error.
 */
export function varietyProblems(obj, opts = {}) {
  const out = [];
  if (!obj || typeof obj !== "object") return out;
  if ("variety" in obj && !VARIETIES.includes(obj.variety)) {
    out.push(`variety must be one of ${VARIETIES.join(", ")}, got ${JSON.stringify(obj.variety)}`);
  }
  if ("regional" in obj) {
    if (typeof obj.regional !== "string" || !obj.regional.trim()) out.push("regional must be a non-empty string (plain English)");
    else if (obj.regional.length > REGIONAL_MAX) out.push(`regional is ${obj.regional.length} characters, max ${REGIONAL_MAX}`);
  }
  if ("frCA" in obj) {
    out.push(...noteProblems(obj.frCA, "frCA", FRCA_GENDERS, opts));
    if (obj.variety === "fr-CA") out.push("a fr-CA item carries no frCA note (the note describes how Québec differs from fr-FR)");
  }
  if ("es419" in obj) out.push("es419 is a Spanish-course note: use frCA (docs/content-plan.md §1.5)");
  return out;
}
