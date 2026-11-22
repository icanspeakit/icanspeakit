// The article of a noun, for French (docs/content-plan.md §1.4).
//
// In French the article can hide the gender: l'école is feminine, l'hôtel masculine, and les
// says nothing. So a noun carries `gender` = the article as the learner says it, and `genus`
// where that article doesn't tell:
//
//   gender  "le" | "la" | "l'" | "les" (plural-only) | "le/la" (true common gender)
//   genus   "m" | "f" | "mf"; required with "l'" and "les", absent otherwise
//   hAspire true on a noun that starts with a vowel letter or h yet takes le/la (le héros)
//
// The Spanish values (el / la / el/la, genus "f" on el) were accepted as legacy during the
// migration; `cleanup` removed that branch, so they are errors now.
//
// Plain ESM with no imports: pages, client scripts (no lexicon bundle) and the validators
// (scripts/validate-lexicon.mjs, src/lib/berufeCore.js) all use it. src/lib/lexicon.js
// re-exports the helpers.

export const FR_GENDERS = ["le", "la", "l'", "les", "le/la"];
export const FR_GENUS = ["m", "f", "mf"];
/** Everything a validator accepts. */
export const GENDERS = FR_GENDERS;

/** Starts with a vowel letter or h: the place where le/la elide to l' (unless h aspiré). */
export const startsElidable = (s) => /^[aeiouyhàâäæéèêëîïôöœùûüÿ]/i.test(String(s ?? "").trim());

const textOf = (e) => e?.lemma ?? e?.front ?? e?.word ?? "";

/** "m", "f" or "mf", from `genus` or the article. null when neither tells (no gender). */
export function genderOf(e) {
  if (!e) return null;
  if (FR_GENUS.includes(e.genus)) return e.genus;
  switch (e.gender) {
    case "le": return "m";
    case "la": return "f";
    case "le/la": return "mf";
    default: return null;
  }
}

/**
 * The noun with its definite article: l'école (no space after l'), le livre, la maison,
 * les lunettes, le/la journaliste. Bare text when the entry has no article.
 */
export function withArticle(e) {
  const text = textOf(e);
  const g = e?.gender;
  if (!g) return text;
  if (g === "l'") return `l'${text}`;
  if (g === "les") return `les ${e.pluralOnly && e.plural ? e.plural : text}`;
  return `${g} ${text}`;
}

/** un / une / un/une, des for a plural-only noun. Elided nouns are drilled through this. */
export function indefinite(e) {
  if (e?.gender === "les") return "des";
  const g = genderOf(e);
  if (g === "f") return "une";
  if (g === "mf") return "un/une";
  return g === "m" ? "un" : "";
}

/** The plural article: always les in French. */
export function pluralArticle() {
  return "les";
}

/** Article problems of one noun, as messages (empty = fine). Rules per §1.4. */
export function genderProblems(w) {
  const out = [];
  if (!w || typeof w !== "object") return out;
  const g = w.gender;
  if (g == null) {
    if (w.genus != null) out.push("genus without gender");
    if (w.hAspire != null) out.push("hAspire without gender");
    return out;
  }
  if (!FR_GENDERS.includes(g)) {
    out.push(`gender must be one of ${FR_GENDERS.join(", ")}, got ${JSON.stringify(g)}`);
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
