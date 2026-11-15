// Which lexicon nouns an article drill may ask about, and the article of their plural.
// Browser-safe; its one import is the shared Italian article helper (articles.js, no imports).
// The trainer, Bruno Kart and the domino all use it.
//
// A drill needs one right answer. Out go: common-gender person nouns ("il/la": il/la turista),
// plural-only nouns (no singular article to ask for) and the nouns below, which take either
// article, change meaning with it, or are said both ways in everyday Italian (il/lo yogurt).
// They stay in the lexicon, just not in a drill.
import { pluralArticle as itPlural } from "./articles.js";

/** The singular articles a drill asks for. */
export const DRILL_ARTICLES = ["il", "lo", "la", "l'"];

export const AMBIGUOUS = new Set([
  "yogurt", "pneumatico", "gnocco", "yoga", "gnomo", "pseudonimo", "capitale", "fine", "fronte",
  "orecchio", "ginocchio", "braccio", "dito", "uovo", "lenzuolo", "labbro", "osso", "paio",
  "miglio", "centinaio", "migliaio",
]);

/** May this noun be asked as "il, lo, la or l'?" (l' needs its genus to name the plural.) */
export const isDrillNoun = (e) =>
  DRILL_ARTICLES.includes(e.gender) && !e.pluralOnly && !AMBIGUOUS.has(e.lemma) &&
  (e.gender !== "l'" || e.genus === "m" || e.genus === "f");

/** i, gli or le, from the article and the genus (l'amico → gli amici, l'amica → le amiche). */
export const pluralArticle = (e) => (e.pluralGender === "f" ? "le" : itPlural(e.article ?? e.gender, e.genus));
