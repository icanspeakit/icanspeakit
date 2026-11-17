// Italian variety of a content item (docs/content-plan.md §1.5).
//
// Standard Italian (italiano standard) is the course standard. Vocabulary, grammar and audio
// items carry `variety: "it-IT"`; where a learner will meet a regional difference in daily life,
// an optional `regional` note records it:
//
//   "variety": "it-IT",
//   "regional": { "note": "Central Italy and the south say cocomero.", "area": "general",
//                 "form": "cocomero", "gender": "il" }
//
// Italian has no second standard to switch to, so there is no alternate mode: the read helpers
// below always return the standard text, and regional notes are not shown anywhere yet (a later
// item). The field and its validators stay so content can carry the notes from the start.
//
// Legacy: the Spanish course's `variety: "es-ES"` and `es419` notes. Since residual-audit
// (2026-11-17) every module is converted and listed as strict in scripts/check-variety.mjs, so
// both are errors everywhere (opts.strict). Outside a strict module (none today) an es-ES item
// would still be tolerated; `es419` on an Italian item is always an error.
//
// Plain ESM without Vite imports: scripts/check-variety.mjs and the lexicon/berufe validators
// share these rules with the pages.

/** The course standard. An item without `variety` (and without a parent that has one) is it-IT. */
export const DEFAULT_VARIETY = "it-IT";

/** Allowed `variety` values. "it-CH" (Swiss Italian) is reserved for future Ticino-only items. */
export const VARIETIES = ["it-IT", "it-CH"];

/** The Spanish course's values, tolerated on not-yet-converted content only (see above). */
export const LEGACY_VARIETIES = ["es-ES", "es-419"];

/** Kept so no import breaks; inert. Italian has no alternate mode and no helper reads this. */
export const LATAM_MODE = false;

/** Keys allowed inside `regional`. `note` is required. There is no `skip` (no second mode). */
export const REGIONAL_KEYS = ["note", "area", "form", "gender"];
export const REGIONAL_NOTE_MAX = 160;
/** `regional.area`: where the regional usage is met. */
export const REGIONAL_AREAS = ["north", "centre", "south", "islands", "ch", "general"];
/** `regional.gender`: the article of the regional noun when it differs (nouns only). */
export const REGIONAL_GENDERS = ["il", "lo", "la", "l'"];

/** True for the variety a whole file or set must carry: it-IT. Since residual-audit (2026-11-17)
 *  every module is Italian, so es-ES is no longer accepted. */
export function isCourseStandard(v) {
  return v === DEFAULT_VARIETY;
}

/** The item's variety: its own `variety`, else the parent's (topic, pack, file), else it-IT. */
export function varietyOf(item, parent) {
  return item?.variety ?? parent?.variety ?? DEFAULT_VARIETY;
}

/** The item's regional note object, or null when the item is used throughout Italy. */
export function regionalOf(item) {
  const n = item?.regional;
  return n && typeof n === "object" && !Array.isArray(n) ? n : null;
}

/** Text to show for an item's main field: always the standard text (no alternate mode). */
export function textFor(_item, text) {
  return text;
}

/** True when an item should be left out for a region: never (there is no second mode). */
export function skippedFor(_item) {
  return false;
}

/**
 * Shape problems of one object's `variety` / `regional` fields, as messages (empty = fine).
 * `opts.noun`: false when the item is known not to be a noun (then `regional.gender` is an error).
 * `opts.strict`: the object sits in a converted module, so es-ES and `es419` are errors.
 */
export function varietyProblems(obj, opts = {}) {
  const out = [];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
  const legacyItem = LEGACY_VARIETIES.includes(obj.variety);
  if ("variety" in obj) {
    if (legacyItem) {
      if (opts.strict) out.push(`variety ${JSON.stringify(obj.variety)} is the Spanish course's; use ${DEFAULT_VARIETY}`);
    } else if (!VARIETIES.includes(obj.variety)) {
      out.push(`variety must be one of ${VARIETIES.join(", ")}, got ${JSON.stringify(obj.variety)}`);
    }
  }

  if ("es419" in obj) {
    if (opts.strict || ("variety" in obj && !legacyItem) || "regional" in obj) {
      out.push("es419 is the Spanish course's note: convert it to `regional` or drop it");
    } else {
      const n = obj.es419;
      if (!n || typeof n !== "object" || Array.isArray(n) || typeof n.note !== "string" || !n.note.trim()) {
        out.push("es419 (legacy) must be an object with a note");
      }
    }
  }

  if (!("regional" in obj)) return out;
  if (legacyItem) out.push("regional belongs on Italian items, not on an es-ES item");
  const n = obj.regional;
  if (!n || typeof n !== "object" || Array.isArray(n)) {
    out.push("regional must be an object { note, area?, form?, gender? }");
    return out;
  }
  const unknown = Object.keys(n).filter((k) => !REGIONAL_KEYS.includes(k));
  if (unknown.length) out.push(`regional: unknown key(s) ${unknown.join(", ")} (allowed: ${REGIONAL_KEYS.join(", ")})`);
  if (typeof n.note !== "string" || !n.note.trim()) out.push("regional.note is required (plain English)");
  else if (n.note.length > REGIONAL_NOTE_MAX) out.push(`regional.note is ${n.note.length} characters, max ${REGIONAL_NOTE_MAX}`);
  if ("area" in n && !REGIONAL_AREAS.includes(n.area)) {
    out.push(`regional.area must be one of ${REGIONAL_AREAS.join(", ")}, got ${JSON.stringify(n.area)}`);
  }
  if ("form" in n && (typeof n.form !== "string" || !n.form.trim())) out.push("regional.form must be a non-empty string");
  if ("gender" in n) {
    if (!REGIONAL_GENDERS.includes(n.gender)) out.push(`regional.gender must be one of ${REGIONAL_GENDERS.join(", ")}, got ${JSON.stringify(n.gender)}`);
    else if (opts.noun === false) out.push("regional.gender is only for nouns");
  }
  return out;
}
