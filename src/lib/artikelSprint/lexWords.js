// Bruno Kart, build time only: what the game takes from the lexicon.
//   lexNouns(level)  the level's nouns that fit an answer box (woerter-<level>.json)
//   enrich(words)    words.json's hand-picked items plus the lexicon id and voice clip they match
//   glossesFor(lang) { <lexicon id>: meaning } for every A1–B1 noun and verb (gloss-<lang>.json)
// words.json keeps the verbs (a person, three hand-made forms) and the nouns with hand-made wrong
// plurals; the lexicon brings the volume. Short single words only, so a word fits a box on the beam.
import { select } from "../lexicon.js";
import { glossTable } from "../glossen.js";

export const LEVELS = ["A1", "A2", "B1"];
/** Languages with a meaning in the lexicon (inline or as a sidecar) and a UI. English ships with the word. */
export const GLOSS_LANGS = ["ar", "uk", "tr", "es", "hi", "id", "pt", "tl", "vi"];

const fits = (e) => ["der", "die", "das"].includes(e.gender) && e.plural && !e.pluralOnly && e.en
  && /^[A-ZÄÖÜ][a-zäöüß]{1,12}$/.test(e.lemma) && /^[A-ZÄÖÜ][a-zäöüß]{1,14}$/.test(e.plural);

export function lexNouns(level) {
  return select({ level, pos: "noun" })
    .filter(fits)
    .map((e) => ({ id: e.id, word: e.lemma, article: e.gender, plural: e.plural, english: String(e.en).split(/[;,]/)[0].trim(), level, audio: e.audio ?? undefined }));
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
      return e ? { ...n, id: e.id, audio: e.audio ?? undefined } : n;
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
