// Hamstis Nussnacht, build time only: the word creatures' pools from the lexicon.
//
//   woerterFuer(level)  { words, low } for the page: the level's nouns and the level below
//
// A word is { id, w, g, a, pl, pa, h }: lemma, article index (ARTS), audio slug, and for the
// creatures of the L' popper (sim.js kind 1, upgrade id "plural") the text they carry and the
// shot that hits them. In French:
//   - a le / la noun (consonant or h aspiré) is a normal creature: g 0 le, 1 la;
//   - a noun that elides to l' is only an L' popper creature: g and pa 2 un / 3 une, pl "l'école".
//     l' hides the gender, so the indefinite article asks it (generoDrill.js isElidedDrillNoun).
//     sim.js keeps these rows out of the normal pools (pickWord takes g 0 and 1 only).
//   - French plurals don't carry a creature of their own: the plural article is always les, so a
//     plural can't ask the gender (content-plan §13, games-arcade).
// `h` marks a verb + noun compound (le tire-bouchon): the index of its hyphen, where it cracks.
// Only nouns a drill may ask (generoDrill.js: one right article, a singular) and a lemma that fits
// on a creature's belly in one line: lower case, at most one space or hyphen (so no acronyms).
import { select } from "../lexicon.js";
import { isDefiniteDrillNoun, isElidedDrillNoun } from "../generoDrill.js";

export const LEVELS = ["A1", "A2", "B1"];
export const ARTS = ["le", "la", "un", "une"];
// The level below, mixed in at a third of the weight (sim.js), so A2 and B1 start with words
// the learner has seen. A1 has none.
const BELOW = { A1: null, A2: "A1", B1: "A2" };

const L = "a-zàâäçéèêëîïôöùûüÿœæ";
const WORD = new RegExp(`^[${L}]+(?:[ -][${L}]+)?$`);
const shape = (e) => WORD.test(e.lemma) && e.lemma.length <= 16;

// The compound cracker: verb + noun compounds (porte + monnaie). The lesson is that they are
// masculine even when the noun inside is feminine: le lave-vaisselle (la vaisselle). Only ones
// that start with a consonant (l'ouvre-boîte, l'essuie-glace would need un / une) and only ones
// that are masculine whoever is meant (le / la porte-parole is out).
const COMPOUNDS = new Set([
  "porte-monnaie", "sèche-cheveux", "lave-vaisselle", "gratte-ciel", "tire-bouchon", "grille-pain",
  "casse-tête", "pare-brise", "pare-chocs", "lave-linge", "sèche-linge", "porte-avions",
  "compte-gouttes", "porte-bagages", "casse-noix", "porte-clés", "chasse-neige",
]);
// The ones the lexicon does not have at A1 to B1: the cracker needs more than the four it would
// find at A2 and B1, and these are everyday things. They join at B1, where the cracker can be picked.
const EXTRA_AT_B1 = [
  "tire-bouchon", "grille-pain", "casse-tête", "pare-brise", "pare-chocs", "lave-linge", "sèche-linge",
  "porte-avions", "compte-gouttes", "porte-bagages", "casse-noix", "porte-clés", "chasse-neige",
];

const row = (e) => {
  const out = { id: e.id, w: e.lemma, g: ARTS.indexOf(e.gender) };
  if (e.audio) out.a = e.audio;
  if (COMPOUNDS.has(e.lemma)) out.h = e.lemma.indexOf("-");
  return out;
};
const elidedRow = (e) => {
  const g = e.genus === "f" ? 3 : 2;
  // typographic apostrophe on the creature, as in the upgrade texts
  const out = { id: e.id, w: e.lemma, g, pl: `l’${e.lemma}`, pa: g };
  if (e.audio) out.a = e.audio;
  return out;
};

export function woerterFuer(level) {
  const nouns = (lv) => {
    const all = select({ level: lv, pos: "noun" }).filter(shape);
    return [
      ...all.filter(isDefiniteDrillNoun).map(row),
      ...all.filter(isElidedDrillNoun).map(elidedRow),
    ];
  };
  const words = nouns(level);
  if (level === "B1") {
    const have = new Set(select({ level: LEVELS, pos: "noun" }).map((e) => e.lemma));
    for (const w of EXTRA_AT_B1) if (!have.has(w)) words.push({ id: `comp-${w}`, w, g: 0, h: w.indexOf("-") });
  }
  return { words, low: BELOW[level] ? nouns(BELOW[level]) : [] };
}
