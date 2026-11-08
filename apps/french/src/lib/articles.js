// The article of a noun, for French (docs/content-plan.md §1.4), with the Spanish values still
// in the data as legacy until every level and deck has been converted (§1.6 rule 2).
//
// In French the article can hide the gender: l'école is feminine, l'hôtel masculine, and les
// says nothing. So a noun carries `gender` = the article as the learner says it, and `genus`
// where that article doesn't tell:
//
//   gender  "le" | "la" | "l'" | "les" (plural-only) | "le/la" (true common gender)
//   genus   "m" | "f" | "mf"; required with "l'" and "les", absent otherwise
//   hAspire true on a noun that starts with a vowel letter or h yet takes le/la (le héros)
//
// Legacy (Spanish data, until `vocab-c1-c2` / `french-for-work`): gender "el" | "la" | "el/la",
// genus only "f" on el (el agua). The helpers return what they returned before for those words.
//
// Plain ESM with no imports: pages, client scripts (no lexicon bundle) and the validators
// (scripts/validate-lexicon.mjs, src/lib/berufeCore.js) all use it. src/lib/lexicon.js
// re-exports the helpers.

export const FR_GENDERS = ["le", "la", "l'", "les", "le/la"];
export const FR_GENUS = ["m", "f", "mf"];
/** Spanish values still in unconverted data. Dropped by the last vocabulary/deck item. */
export const LEGACY_GENDERS = ["el", "la", "el/la"];
/** Everything a validator accepts during the migration. */
export const GENDERS = [...new Set([...FR_GENDERS, ...LEGACY_GENDERS])];

/**
 * A legacy (Spanish) entry: its article is el or el/la, or it is still marked es-ES / es-419.
 * "la" exists in both languages; every Spanish lexicon word and deck entry carries
 * `variety: "es-ES"`, so the variety decides. A "la" word without variety counts as French.
 */
export const legacyEntry = (e) =>
  e?.gender === "el" || e?.gender === "el/la" || e?.variety === "es-ES" || e?.variety === "es-419";

/** Starts with a vowel letter or h: the place where le/la elide to l' (unless h aspiré). */
export const startsElidable = (s) => /^[aeiouyhàâäæéèêëîïôöœùûüÿ]/i.test(String(s ?? "").trim());

const textOf = (e) => e?.lemma ?? e?.front ?? e?.word ?? "";

/** "m", "f" or "mf", from `genus` or the article. null when neither tells (no gender). */
export function genderOf(e) {
  if (!e) return null;
  if (FR_GENUS.includes(e.genus)) return e.genus;
  switch (e.gender) {
    case "le": case "el": return "m";
    case "la": return "f";
    case "le/la": case "el/la": return "mf";
    default: return null;
  }
}

/**
 * The noun with its definite article: l'école (no space after l'), le livre, la maison,
 * les lunettes, le/la journaliste. Bare text when the entry has no article. Legacy Spanish
 * entries: "<gender> <lemma>", as before.
 */
export function withArticle(e) {
  const text = textOf(e);
  const g = e?.gender;
  if (!g) return text;
  if (g === "l'") return `l'${text}`;
  if (g === "les") return `les ${e.pluralOnly && e.plural ? e.plural : text}`;
  return `${g} ${text}`;
}

/** un / une (French); un / una for a legacy Spanish entry. Elided nouns are drilled through this. */
export function indefinite(e) {
  const legacy = legacyEntry(e);
  if (e?.gender === "les") return "des";
  if (legacy && e?.gender === "el") return "un"; // un agua, un aula: stressed a- takes un too
  const g = genderOf(e);
  if (g === "f") return legacy ? "una" : "une";
  if (g === "mf") return legacy ? "un/una" : "un/une";
  return g === "m" ? "un" : "";
}

/** The plural article: always les in French. Legacy Spanish: las / los (el agua → las aguas). */
export function pluralArticle(e) {
  if (!legacyEntry(e)) return "les";
  return e?.genus === "f" || e?.gender === "la" ? "las" : "los";
}

/**
 * Article problems of one noun, as messages (empty = fine). French rules per §1.4; legacy
 * Spanish values pass with their old rule (genus "f" only on el).
 */
export function genderProblems(w) {
  const out = [];
  if (!w || typeof w !== "object") return out;
  const g = w.gender;
  if (g == null) {
    if (w.genus != null) out.push("genus without gender");
    if (w.hAspire != null) out.push("hAspire without gender");
    return out;
  }
  if (!GENDERS.includes(g)) {
    out.push(`gender must be one of ${FR_GENDERS.join(", ")} (legacy: ${LEGACY_GENDERS.join(", ")}), got ${JSON.stringify(g)}`);
    return out;
  }
  if (legacyEntry(w)) {
    if (!LEGACY_GENDERS.includes(g)) out.push(`gender ${g} on an entry still marked ${w.variety}: set variety to fr-FR`);
    // Legacy rule: genus "f" only on el (stressed a-/ha-: el agua, el aula).
    if (w.genus != null && !(w.genus === "f" && g === "el")) out.push(`genus "f" only on nouns with gender "el" (el agua)`);
    if (w.hAspire != null) out.push("hAspire is for French nouns only");
    return out;
  }
  if (g === "l'" || g === "les") {
    if (!FR_GENUS.includes(w.genus)) out.push(`gender "${g}" needs genus m, f or mf`);
  } else if (w.genus != null) {
    out.push(`genus only with gender l' or les (the article ${g} already tells)`);
  }
  if (w.hAspire != null && w.hAspire !== true) out.push("hAspire must be true (omit it otherwise)");
  const text = textOf(w);
  if (g === "les" && !w.pluralOnly) out.push(`gender "les" only on plural-only nouns (pluralOnly: true)`);
  if (g === "l'") {
    if (!startsElidable(text)) out.push(`l' before a consonant: ${text}`);
    if (w.hAspire) out.push(`l' with hAspire: an h aspiré takes le/la (${text})`);
  } else if (g === "le" || g === "la") {
    if (startsElidable(text) && !w.hAspire) out.push(`${g} before a vowel or h: l'${text}, or set hAspire: true`);
    if (w.hAspire && !startsElidable(text)) out.push(`hAspire on a word that doesn't start with a vowel or h: ${text}`);
  } else if (w.hAspire) {
    out.push(`hAspire only with le or la`);
  }
  return out;
}
