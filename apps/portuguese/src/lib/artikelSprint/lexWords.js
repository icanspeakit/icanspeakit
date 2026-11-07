// Bruno Kart, build time only: what the game takes from the lexicon.
//   lexNouns(level)  the level's nouns that fit an answer box (woerter-<level>.json)
//   enrich(words)    words.json's hand-picked items plus the lexicon id and voice clip they match
//   glossesFor(lang) { <lexicon id>: meaning } for every A1–B1 noun and verb (gloss-<lang>.json)
// words.json keeps the verbs (a person, three hand-made forms) and the nouns with hand-made wrong
// plurals; the lexicon brings the volume. Short single words only, so a word fits a box on the beam.
import { select } from "../lexicon.js";
import { glossTable } from "../glossen.js";
import { isDrillNoun } from "../generoDrill.js";

export const LEVELS = ["A1", "A2", "B1"];
/** Languages with a meaning in the lexicon (inline or as a sidecar) and a UI. English ships with the word. */
export const GLOSS_LANGS = ["de", "fr", "pt", "it"];

// el / la nouns with one right article (generoDrill.js); short single words, accents allowed. A noun
// with no plural in the lexicon only joins the article gates (questions.js).
const WORD = /^[a-záéíóúüñ]{2,12}$/;
const PLURAL = /^[a-záéíóúüñ]{2,14}$/;
const fits = (e) => isDrillNoun(e) && e.en && WORD.test(e.lemma) && (!e.plural || PLURAL.test(e.plural));

export function lexNouns(level) {
  return select({ level, pos: "noun" })
    .filter(fits)
    .map((e) => ({ id: e.id, word: e.lemma, article: e.gender, ...(e.genus ? { genus: e.genus } : {}), plural: e.plural ?? null, english: String(e.en).split(";")[0].trim(), level }));
}

/** Count of nouns the game can deal per level, for the level buttons. */
export const nounCount = (words, level) => {
  const have = new Set(words.nouns.filter((n) => n.level === level).map((n) => n.word));
  return new Set([...have, ...lexNouns(level).map((n) => n.word)]).size;
};

export function enrich(words) {
  const nouns = select({ pos: "noun", level: LEVELS });
  const verbs = select({ pos: "verb", level: LEVELS });
  return {
    nouns: words.nouns.map((n) => {
      const e = nouns.find((x) => x.lemma === n.word && x.gender === n.article);
      return e ? { ...n, id: e.id } : n;
    }),
    verbs: words.verbs.map((v) => {
      const e = verbs.find((x) => x.lemma === v.infinitive);
      return e ? { ...v, id: e.id } : v;
    }),
  };
}

export function glossesFor(lang) {
  const table = glossTable(lang);
  const out = {};
  for (const e of select({ level: LEVELS })) {
    if (e.pos !== "noun" && e.pos !== "verb") continue;
    const g = e[lang] ?? table[e.id];
    if (g) out[e.id] = String(g).split(/\s*[;,]\s*/)[0].trim() || g;
  }
  return out;
}
