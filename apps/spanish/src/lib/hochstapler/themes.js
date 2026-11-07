// Bruno sucht den Hochstapler: the word sets, built from the lexicon at build time (the
// woerter-[level].json endpoint) — never in the browser, which only fetches one level.
//
// A word as the game uses it: { id, de: "la nevera", img, en, ... } (`de` holds the Spanish word
// with el/la; the key name is kept from the German game).
// A1/A2 are hand-picked themes (src/data/hochstapler/themen.json): the theme is the
// Hochstapler's only hint, and the lexicon's topic tags are too loose for that.
import { byId, spokenForm, TRANSLATION_LANGS } from "../lexicon.js";
import { wortBild } from "../wortBild.js";
import themen from "../../data/hochstapler/themen.json" with { type: "json" };

export const LEVELS = ["A1", "A2"];

/** A lexicon noun in the game's shape, or null. */
export function gameWord(id) {
  const e = byId(id);
  if (!e || e.pos !== "noun") return null;
  // "la nevera", "el coche", "el/la estudiante"; plural-only nouns as they are said: "las tijeras".
  const de = e.pluralOnly && e.plural ? spokenForm(e) : `${e.gender} ${e.lemma}`;
  const w = { id: e.id, de, img: wortBild(e.id) };
  for (const l of TRANSLATION_LANGS) if (e[l]) w[l] = e[l];
  return w;
}

/** The themes of one level, each with its words in the game's shape. */
export function themesFor(level) {
  return (themen[level] ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    words: t.words.map(gameWord).filter(Boolean),
  }));
}
