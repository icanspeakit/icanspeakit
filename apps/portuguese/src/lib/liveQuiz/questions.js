// Builds a game's questions from the lexicon. Host only: imported lazily by host.js, so
// the lexicon (~2 MB of JSON) is fetched by the projector's browser when a teacher opens
// the quiz, never by a student's phone. Phones get only the four options of the question
// on screen, with their meanings — see protocol.js.
import { byId, select, spokenForm } from "../lexicon.js";
import { MEANING_LANGS } from "./protocol.js";
import { sameMeaning } from "../sameMeaning.js";
import synonyme from "../../data/synonyme.json";
import { emojiSrc, wortBild } from "../wortBild.js";
import { berufeUnit, berufeUnitRows } from "../berufeRows.js";
import { cohort } from "../lernsets.js";

const QUIZ_LEVELS = ["A1", "A2", "B1", "B2"];

/** Words that can be asked: a meaning in every one of the four languages. */
function pool(level) {
  return select({ level: level ? [level] : QUIZ_LEVELS }).filter((e) => MEANING_LANGS.every((l) => e[l]));
}

/** A unit's words: a Lernset from the lexicon, or a Berufe group (`berufe-<beruf>-<gruppe>`). */
// A unit with its own word list, not a Lernset id on each word: a Berufe group, or a
// frequency round ("haeufigkeit-003") whose words come from many Lernsets.
const ownRows = (unit) => (berufeUnit(unit) ? berufeUnitRows(unit) : cohort(unit)?.items ?? null);
const unitWords = (unit) => ownRows(unit) ?? select({ unit });

const meaning = (e) => Object.fromEntries(MEANING_LANGS.map((l) => [l, e[l]]));

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Three wrong options for `word`: the same part of speech from the same level where
 * there are enough, so the answer cannot be spotted by its shape (a verb among nouns,
 * an article on the only noun). Never a word whose German or English reads the same —
 * two options that both mean "to drive" would make a right answer count as wrong.
 */
function distractors(word, candidates) {
  const taken = new Set([word.lemma.toLowerCase(), word.en.toLowerCase()]);
  // Same meaning, not just the same spelling: synonyms (Abfall / Müll) and words whose
  // translations overlap ("waste" / "rubbish, waste") would both be right.
  const shape = (e) => ({ de: e.lemma, syn: e.syn, glosses: MEANING_LANGS.map((l) => e[l]) });
  const asked = shape(word);
  const tiers = [
    candidates.filter((e) => e.pos === word.pos && e.level === word.level),
    candidates.filter((e) => e.pos === word.pos),
    candidates,
  ];
  const out = [];
  for (const tier of tiers) {
    for (const e of shuffle(tier)) {
      if (out.length === 3) return out;
      const keys = [e.lemma.toLowerCase(), e.en.toLowerCase()];
      if (keys.some((k) => taken.has(k)) || sameMeaning(asked, shape(e))) continue;
      keys.forEach((k) => taken.add(k));
      out.push(e);
    }
  }
  return out;
}

/* ---- German → German: synonyms ------------------------------------------------------
   One word of a group on screen, another word of the same group among three words from
   other groups, with the group's picture where it has one (`emoji` in synonyme.json). A
   group may share a word with another (nötig ~ notwendig ~ erforderlich),
   so "a synonym" is taken two steps wide: nothing reachable through a shared word is
   ever a wrong option. */
const groups = synonyme.groups;
const groupsOf = new Map();
for (const g of groups) for (const w of g.words) (groupsOf.get(w) ?? groupsOf.set(w, []).get(w)).push(g);
const near = (w) => new Set((groupsOf.get(w) ?? []).flatMap((g) => g.words));
function related(w) {
  const out = new Set();
  for (const n of near(w)) for (const m of near(n)) out.add(m.toLowerCase());
  return out;
}

function synonymQuestions(level, count) {
  const asked = shuffle(groups.filter((g) => g.level === level)).slice(0, count);
  return asked.map((g) => {
    const [prompt, answer] = shuffle(g.words);
    const banned = related(prompt);
    const out = [];
    const tiers = [
      groups.filter((o) => o.pos === g.pos && o.level === g.level),
      groups.filter((o) => o.pos === g.pos),
      groups,
    ];
    for (const tier of tiers) {
      for (const o of shuffle(tier)) {
        if (out.length === 3) break;
        const w = shuffle(o.words)[0];
        if (banned.has(w.toLowerCase())) continue;
        related(w).forEach((x) => banned.add(x));
        out.push(w);
      }
    }
    const options = shuffle([answer, ...out]);
    // The group's picture shows the meaning both words share, never one of the words.
    return { prompt: { de: prompt }, options: options.map((de) => ({ de })), correct: options.indexOf(answer), img: emojiSrc(g.emoji) };
  });
}

/* ---- German → German for one Lernset -------------------------------------------------
   With a Lernset chosen, the level-wide synonym list above asked words from anywhere in the
   level ("Umwelt & Müll" picked, „sprechen ~ reden“ asked). So a Lernset is asked from its
   own words, German on both sides:
     a word with a real synonym (de-syn.json)   „der Abfall“ → which one means the same? „der Müll“
     every other word with a German hint        „Geld, das man für leere Flaschen zurückbekommt.“
                                                 → which word is it? „das Pfand“
   The wrong options are other words of the same set (same part of speech first), and never
   one that is itself a synonym of the prompt. Gap hints („Ich habe … vor Hunden.“) are left
   out: their answer is an inflected form, not a word the options could show. */
function unitGermanQuestions(unit, count) {
  const words = unitWords(unit);
  const label = (e) => spokenForm(e);
  const out = [];
  for (const word of shuffle(words)) {
    const near = new Set([label(word), ...(word.syn ?? [])].map((x) => x.toLowerCase()));
    const others = (pick) => {
      const tiers = [words.filter((e) => e.pos === word.pos), words];
      const res = [];
      const seen = new Set(near);
      for (const tier of tiers) for (const e of shuffle(tier)) {
        if (res.length === 3) return res;
        if (e.id === word.id) continue;
        const v = pick(e);
        if (!v || seen.has(v.toLowerCase()) || (e.syn ?? []).some((x) => near.has(x.toLowerCase()))) continue;
        seen.add(v.toLowerCase());
        res.push(v);
      }
      return res;
    };
    let prompt, answer;
    if (word.syn?.length) {
      prompt = label(word);
      answer = shuffle(word.syn)[0];
    } else if (word.deHint && !word.deHint.includes("…")) {
      prompt = word.deHint;
      answer = label(word);
    } else continue;
    const wrong = others(label);
    if (wrong.length < 2) continue;
    const options = shuffle([answer, ...wrong]);
    out.push({ syn: !!word.syn?.length, q: { prompt: { de: prompt }, options: options.map((de) => ({ de })), correct: options.indexOf(answer), img: wortBild(word.id) } });
  }
  // Synonym questions first: they are the ones the mode is named for.
  const ranked = [...out.filter((x) => x.syn), ...out.filter((x) => !x.syn)];
  return shuffle(ranked.slice(0, count).map((x) => x.q));
}

/** How many German → German questions a Lernset can give. */
export function unitGermanSize(unit) {
  return unitWords(unit).filter((e) => e.syn?.length || (e.deHint && !e.deHint.includes("…"))).length;
}

/**
 * @param {{ level: string, unit: string | null, mode: "meaning-de" | "de-meaning" | "synonym", count: number }} opts
 * @returns {{ prompt: object, options: object[], correct: number }[]} with `correct` the
 *   index into `options` — kept on the host, never sent before the reveal.
 */
export function buildQuestions({ level, unit, mode, count }) {
  if (mode === "synonym") {
    // A Lernset with too few German hints (B1/B2 for now) keeps the level's synonym list.
    if (unit && unitGermanSize(unit) >= 4) return unitGermanQuestions(unit, count);
    return synonymQuestions(level, count);
  }
  // A Berufe group is asked from its own words that carry every meaning language; one with
  // too few of those (its own Fachwörter are not in every language) is asked in German.
  if (ownRows(unit)) {
    const own = unitWords(unit).filter((e) => MEANING_LANGS.every((l) => e[l]));
    if (own.length < 4) return unitGermanQuestions(unit, count);
  }
  const all = ownRows(unit) ? unitWords(unit).filter((e) => MEANING_LANGS.every((l) => e[l])) : pool(level);
  const asked = shuffle(unit && !ownRows(unit) ? all.filter((e) => e.unit === unit) : all).slice(0, count);
  const everyone = pool(null);
  return asked.map((word) => {
    const options = shuffle([word, ...distractors(word, everyone.filter((e) => e.id !== word.id))]);
    const correct = options.indexOf(word);
    const img = wortBild(word.id);
    return mode === "meaning-de"
      ? { prompt: meaning(word), options: options.map((e) => ({ de: spokenForm(e) })), correct, img }
      : { prompt: { de: spokenForm(word) }, options: options.map(meaning), correct, img };
  });
}

/** How many askable words a unit (or a whole level) has — the most questions it can give. */
export function poolSize(level, unit) {
  if (ownRows(unit)) return unitWords(unit).filter((e) => MEANING_LANGS.every((l) => e[l])).length;
  const all = pool(level);
  return unit ? all.filter((e) => e.unit === unit).length : all.length;
}

/**
 * One word of a teacher's own quiz (src/lib/liveQuiz/custom.js) as a question, with
 * distractors drawn the same way as above. Null when the word is gone from the lexicon
 * or lacks a language.
 */
export function wordQuestion(id, dir) {
  const word = byId(id);
  if (!word || !MEANING_LANGS.every((l) => word[l])) return null;
  const options = shuffle([word, ...distractors(word, pool(null).filter((e) => e.id !== word.id))]);
  const correct = options.indexOf(word);
  const img = wortBild(word.id);
  return dir === "meaning-de"
    ? { prompt: meaning(word), options: options.map((e) => ({ de: spokenForm(e) })), correct, img }
    : { prompt: { de: spokenForm(word) }, options: options.map(meaning), correct, img };
}
