// Italian articles, written once (docs/content-plan.md §1.4, §1.6).
//
// The singular definite article depends on gender AND on the first sound of the word:
//   masculine: il (default) · lo (z-, s+consonant, gn-, ps-, pn-, x-, y-, i+vowel) · l' (vowel)
//   feminine:  la (default) · l' (vowel)
// Plural: il → i, lo → gli, l' + m → gli, la → le, l' + f → le.
// The validator, the trainers and the games use these helpers so the rule is not repeated.
// Plain ESM, no imports: scripts/ load it directly.

const V = "aeiouàèéìòóù";
const VOWEL_START = new RegExp(`^[${V}]`);
// lo-sounds: z, s+consonant, gn, ps, pn, x, y, i+vowel (lo iato, lo iodio)
const LO_START = new RegExp(`^(z|s[^${V}]|gn|ps|pn|x|y|i[aeouàèòù])`);

const norm = (lemma) => String(lemma).trim().toLowerCase().replace(/^h(?=[aeiou])/, "");

/** The masculine singular article the sound asks for: "il", "lo" or "l'". */
export function articleMasc(lemma) {
  const w = norm(lemma);
  if (VOWEL_START.test(w)) return "l'";
  if (LO_START.test(w)) return "lo";
  return "il";
}

/** The feminine singular article: "la" or "l'". */
export function articleFem(lemma) {
  return VOWEL_START.test(norm(lemma)) ? "l'" : "la";
}

/** The article for a lemma and its genus ("m" | "f"). */
export function articleFor(lemma, genus) {
  return genus === "f" ? articleFem(lemma) : articleMasc(lemma);
}

/** Lemmas written once, as most often heard (content-plan §1.4): il or lo are both accepted. */
const EITHER = new Set(["yogurt", "pneumatico", "gnocco", "yoga"]);

/** True when `article` (il | lo | la | l' | il/la | lo/la) fits the lemma. */
export function articleFits(lemma, article, genus) {
  const w = String(lemma).toLowerCase();
  if (article === "il/la" || article === "lo/la") return articleMasc(lemma) === article.split("/")[0] || EITHER.has(w);
  if (article === "la") return articleFem(lemma) === "la";
  if (article === "l'") return VOWEL_START.test(norm(lemma));
  if (article === "il" || article === "lo") return articleMasc(lemma) === article || EITHER.has(w);
  return false;
}

/** The plural article from the singular one: i, gli or le. `genus` is needed for l'. */
export function pluralArticle(article, genus) {
  if (article === "il" || article === "il/la") return "i";
  if (article === "la") return "le";
  if (article === "l'") return genus === "f" ? "le" : "gli";
  return "gli"; // lo, lo/la
}

/** What the voice and the cards print: article + lemma, no space after l'. */
export function withArticle(article, lemma) {
  return article.endsWith("'") ? `${article}${lemma}` : `${article} ${lemma}`;
}
