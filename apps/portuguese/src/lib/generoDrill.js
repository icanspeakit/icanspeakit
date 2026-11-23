// Which lexicon nouns a gender drill may ask about, and the article of their plural.
// Browser-safe (no imports): the trainer, Bruno Kart and the domino all use it.
//
// A drill needs one right answer. So out go: common-gender person nouns ("o/a estudante"),
// plural-only nouns (no singular article to ask for), and the nouns below, which take either
// article with a different meaning (o capital = money / a capital = capital city, o guia = the
// guide (person) / a guia = the form, o polícia = the police officer / a polícia = the police), or
// which speakers really say both ways (o/a personagem, o/a diabetes). They stay in the lexicon,
// just not in a drill.
export const AMBIGUOUS = new Set([
  "capital", "cabeça", "caixa", "guia", "guarda", "polícia", "rádio", "moral", "cura", "final",
  "grama", "cólera", "coma", "lente", "personagem", "diabetes", "praça", "modelo", "cisma",
  "crisma", "sentinela", "omelete", "lama",
]);

/** May this noun be asked as "o or a?" */
export const isDrillNoun = (e) =>
  (e.gender === "o" || e.gender === "a") && !e.pluralOnly && !AMBIGUOUS.has(e.lemma);

/** os or as: from the singular article (o dia → os dias, a mão → as mãos). */
export const pluralArticle = (e) => ((e.article ?? e.gender) === "a" ? "as" : "os");
