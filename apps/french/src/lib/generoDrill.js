// Which lexicon nouns a gender drill may ask about, and how it asks (docs/content-plan.md §5.9).
// Browser-safe (only articles.js, which has no imports): the trainer, Bruno Kart, the dictation,
// the domino and the worksheets all use it.
//
// In French the definite article can hide the gender: l'école is feminine, l'hôtel masculine, and
// les is the same for both. So a drill asks:
//   - a noun that starts with a consonant or an h aspiré (le livre, la maison, le héros): le / la
//   - a noun that elides to l' (lexicon gender "l'", genus m or f): un / une (une école, un hôtel)
// l' itself is taught as a rule (l'école, not la école), never as a gender choice.
//
// A drill needs one right answer. So out go: common-gender person nouns ("le/la"), plural-only
// nouns ("les"), l' nouns of either gender (genus "mf": l'élève), and the nouns below, whose
// meaning changes with the gender (le livre / la livre, le tour / la tour) or which French uses
// both ways (l'après-midi, les amours, les gens). They stay in the lexicon, just not in a drill.
import { pluralArticle } from "./articles.js";

export const AMBIGUOUS = new Set([
  "livre", "tour", "poste", "mode", "voile", "manche", "mémoire", "vase", "moule", "somme",
  "solde", "physique", "critique", "pendule", "aide", "gens", "après-midi", "amour",
]);

/** Lexicon `genderAlt` marks a noun said with both articles; such a noun is never drilled. */
const fixed = (e) => !e.pluralOnly && !e.genderAlt && !AMBIGUOUS.has(e.lemma);

/** Asked as "le or la?": a consonant or h aspiré noun with one gender. */
export const isDefiniteDrillNoun = (e) => (e.gender === "le" || e.gender === "la") && fixed(e);

/** Asked as "un or une?": a noun that elides to l', masculine or feminine. */
export const isElidedDrillNoun = (e) => e.gender === "l'" && (e.genus === "m" || e.genus === "f") && fixed(e);

/** May this noun be asked in a gender drill at all (either way)? */
export const isDrillNoun = (e) => isDefiniteDrillNoun(e) || isElidedDrillNoun(e);

/**
 * How a drill asks the noun: `{ options, answer, kind }`. kind "def" = le / la, kind "indef" =
 * un / une (the elided nouns). null for a noun the drill doesn't take.
 */
export function drillChoice(e) {
  if (isDefiniteDrillNoun(e)) return { kind: "def", options: ["le", "la"], answer: e.gender };
  if (isElidedDrillNoun(e)) return { kind: "indef", options: ["un", "une"], answer: e.genus === "f" ? "une" : "un" };
  return null;
}

/** "m" or "f" of a drill noun. */
export const drillGenus = (e) => (e.gender === "l'" ? e.genus : e.gender === "la" ? "f" : "m");

/** The plural article: always les in French (articles.js). Re-exported for the old callers. */
export { pluralArticle };
