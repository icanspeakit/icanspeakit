// Bruno Kart: turns words.json and the lexicon's nouns into the questions the word gates ask. One
// question = a prompt, three lane labels and the index of the right lane.
// Articles (content-plan §5.9): the prompt is a singular noun. A noun that starts with a consonant
// or an h aspiré asks LE / LA, and the third box is L', which is never right before a consonant
// (that is the elision rule as a trap). A noun that elides to l' (école) asks UN / UNE, because
// l'école hides the gender; its third box is DES, of the wrong number. Masculine stays left,
// feminine in the middle. Nouns whose plural is the singular (le prix, le bras) stay out of the
// article gates, because "les prix" would be right too.
// Plural: "le cheval" → les chevaux / les chevals / les chevaus: always les, so the gate asks the form.
// Verb options are shuffled per gate. The small label above the prompt is UI text (t()).

import { t } from "../uiText.js";
import { seeded } from "./rng.js";
import { pluralArticle, drillChoice } from "../generoDrill.js";
import { startsElidable } from "../articles.js";

export const MODES = {
  artikel: { label: "Articles", key: "sprint.mode.artikel", hint: "le or la? un or une?", hintKey: "sprint.hint.artikel" },
  plural: { label: "Plural", key: "sprint.mode.plural", hint: "Which plural?", hintKey: "sprint.hint.plural" },
  verb: { label: "Verbs", key: "sprint.mode.verb", hint: "Which form fits?", hintKey: "sprint.hint.verb" },
};
export const LEVELS = ["A1", "A2", "B1"];
const DEF_LANES = ["le", "la", "l'"];
const INDEF_LANES = ["un", "une", "des"];
// The five-lane road of a race room. Consonant nouns: the plural articles are of the wrong number.
// Elided nouns: le and la are wrong before a vowel (le école), so they are traps there.
const DEF_WIDE = ["le", "la", "l'", "les", "des"];
const INDEF_WIDE = ["un", "une", "des", "le", "la"];
// French has one plural article (les), so no article gate asks the plural; build() still takes
// one draw per gate from the seeded stream, as the Spanish game did, so a seed's track stays put.

/** `n` options: the given ones, topped up from made-up forms that are not among them. */
function topUp(options, candidates, n, rnd) {
  if (options.length >= n) return options.slice(0, n);
  const extra = shuffle([...new Set(candidates)].filter((c) => c && !options.includes(c)), rnd);
  return [...options, ...extra.slice(0, n - options.length)];
}
// Plausible but made up (chevals, bijous, journals, the bare singular): for the lexicon's nouns,
// which carry no hand-made pluralWrong. build() filters out the one that is the real plural.
// French plurals are mostly written, not heard, so the wrong ones are the classic spelling slips.
function fakePlurals(w) {
  const out = [w + "s", w + "x", w];
  if (/al$/.test(w)) out.push(w.slice(0, -2) + "aux");
  if (/ail$/.test(w)) out.push(w.slice(0, -3) + "aux");
  if (/(eau|eu|au)$/.test(w)) out.push(w + "s");
  if (/[sxz]$/.test(w)) out.push(w + "es");
  return out;
}
// For the five-lane road: forms a verb does not have, or another person's.
const SHORT_VERBS = {
  aller: ["allons", "allez", "vont", "va", "allé"],
  être: ["es", "êtes", "sont", "été", "suis"],
  avoir: ["ai", "as", "avons", "ont", "eu"],
  faire: ["fais", "faisons", "font", "fait", "faites"],
};
const fakeForms = (inf) => {
  if (SHORT_VERBS[inf]) return SHORT_VERBS[inf];
  const stem = inf.replace(/(er|ir|re|oir)$/, "");
  return [inf, stem + "e", stem + "es", stem + "ons", stem + "ez", stem + "ent", stem + "é"];
};

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * What the game does with a question besides asking it: `id` (lexicon id, for the word help's meaning
 * and the progress count), `say` (what the browser's French voice reads after a miss), `audio`
 * (none: there are no French recordings yet) and `key` (names the item, so a miss can be dealt again).
 */
function extras(item, say, kind) {
  return {
    id: item.id,
    say,
    audio: undefined,
    key: `${kind}:${item.word ?? `${item.infinitive}/${item.person}/${item.answer}`}`,
    item,
  };
}

/** "le livre", "l'école": the singular as a dictionary gives it. */
const definite = (item) => (item.article === "l'" ? `l'${item.word}` : `${item.article} ${item.word}`);

/** May the article gates deal this noun? Not when the plural looks like the singular (le prix). */
export const articleGateNoun = (item) => !!drillChoice({ gender: item.article, genus: item.genus, lemma: item.word }) && item.plural !== item.word;

function build(item, mode, rnd, n = 3) {
  const les = pluralArticle(item);
  if (mode === "artikel") {
    // Always one draw from rnd, so a seed stays the same track for everyone.
    rnd();
    const choice = drillChoice({ gender: item.article, genus: item.genus, lemma: item.word });
    const indef = choice?.kind === "indef" || (item.article === "l'" && startsElidable(item.word));
    const right = choice?.answer ?? item.article;
    const lanes = n === 5 ? (indef ? INDEF_WIDE : DEF_WIDE) : indef ? INDEF_LANES : DEF_LANES;
    // une école: a miss shows the definite form too, which is how the learner will meet it.
    const full = indef ? `${right} ${item.word} (${definite(item)})` : definite(item);
    return {
      kind: "artikel",
      prompt: item.word,
      tag: t("sprint.hint.artikel", "le or la? un or une?"),
      english: item.english,
      options: lanes.map((x) => x.toUpperCase()),
      answer: lanes.indexOf(right),
      full,
      ...extras(item, `${right} ${item.word}`, "artikel"),
    };
  }
  if (mode === "plural") {
    const right = `${les} ${item.plural}`;
    const form = (f) => `${les} ${f}`;
    const handMade = shuffle(item.pluralWrong ?? [], rnd).map(form);
    const fakes = fakePlurals(item.word).filter((f) => f !== item.plural).map(form);
    const options = shuffle(topUp([right, ...handMade], fakes, n, rnd), rnd);
    return {
      kind: "plural",
      prompt: definite(item),
      tag: t("sprint.tag.plural", "Plural?"),
      english: item.english,
      options,
      answer: options.indexOf(right),
      full: `${definite(item)} → ${right}`,
      ...extras(item, right, "plural"),
    };
  }
  const options = shuffle(topUp(item.options, fakeForms(item.infinitive), n, rnd), rnd);
  const tense = item.tense ?? "présent";
  return {
    kind: "verb",
    prompt: `${item.person} ___`,
    tag: `${item.infinitive} · ${tense}`,
    english: item.english,
    options,
    answer: options.indexOf(item.answer),
    full: `${item.person} ${item.answer} (${item.infinitive}, ${tense})`,
    ...extras(item, `${item.person} ${item.answer}`, "verb"),
  };
}

/**
 * A deck that deals every item of the level once before any repeats, never the same item twice in a row.
 * `rnd` is a seeded stream (rng.js) for a run others replay; Math.random otherwise.
 *
 * Learn from mistakes: `miss(q)` (the game calls it for a wrong answer) puts that item back in,
 * 3–5 questions later; missed again, 6–9 questions later; then it is left alone (twice at most).
 * A returning question has `again: true` and does not use up an item of the shuffled pool.
 * Determinism: the pool order and the option order come from `rnd` and are the same for everybody
 * on one seed, whatever they answer. The returning questions get their own stream (`rr`, one
 * draw from `rnd` at the start, so the same for everybody too) and only add questions between
 * the shared ones. So a challenge link or a room round still deals the same words in the same
 * order; a player who made mistakes just gets extra questions in between.
 */
export function createDeck(data, mode, level, rnd = Math.random, n = 3) {
  // Plural deals only nouns that have one; the others only join the article gates.
  const pool = (mode === "verb" ? data.verbs : data.nouns)
    .filter((it) => it.level === level && (mode !== "plural" || it.plural) && (mode !== "artikel" || articleGateNoun(it)));
  const rr = seeded(Math.floor(rnd() * 4294967296));
  let queue = [];
  let last = null;
  let count = 0;
  /** Missed items waiting to come back: { item, due, tries }. */
  let waiting = [];
  let lastKey = "";
  const gap = (tries) => (tries === 0 ? 3 + Math.floor(rr() * 3) : 6 + Math.floor(rr() * 4));
  return {
    size: pool.length,
    next() {
      count += 1;
      const back = waiting.find((w) => w.due <= count && w.key !== lastKey);
      let q;
      if (back) {
        waiting = waiting.filter((w) => w !== back);
        q = { ...build(back.item, mode, rr, n), again: true };
      } else {
        if (!queue.length) {
          queue = shuffle(pool, rnd);
          if (queue.length > 1 && queue[queue.length - 1] === last) queue.unshift(queue.pop());
        }
        last = queue.pop();
        q = build(last, mode, rnd, n);
      }
      q.tries = back ? back.tries : 0;
      lastKey = q.key;
      return q;
    },
    /** The question `q` was answered wrong. */
    miss(q) {
      if (!q?.item || q.tries >= 2 || waiting.some((w) => w.key === q.key)) return;
      waiting.push({ item: q.item, key: q.key, tries: q.tries + 1, due: count + gap(q.tries) });
    },
  };
}
