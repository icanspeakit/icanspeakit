// Which lexicon nouns a gender drill may ask about, and the article of their plural.
// Browser-safe (no imports): the trainer, Bruno Kart and the domino all use it.
//
// A drill needs one right answer. So out go: common-gender person nouns ("el/la"), plural-only
// nouns (no singular article to ask for), and the nouns below, which take either article, or
// change meaning with it, or which Spain really says both ways (la final / el final,
// el parte / la parte, el azúcar / la azúcar). They stay in the lexicon, just not in a drill.
export const AMBIGUOUS = new Set([
  "azúcar", "internet", "mar", "maratón", "parte", "final", "terminal", "editorial", "moral",
  "orden", "margen", "cometa", "pendiente", "corte", "coma", "frente", "capital", "cura",
  "guía", "modelo", "cólera", "papa", "AMPA",
]);

/** May this noun be asked as "el or la?" */
export const isDrillNoun = (e) =>
  (e.gender === "el" || e.gender === "la") && !e.pluralOnly && !AMBIGUOUS.has(e.lemma);

/** los or las: comes from the gender, not from the singular article (el agua → las aguas). */
export const pluralArticle = (e) => ((e.article ?? e.gender) === "la" || e.genus === "f" ? "las" : "los");
