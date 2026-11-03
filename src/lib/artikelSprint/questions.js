// Artikel-Flitzer: turns words.json into the questions the word gates ask. One question =
// a prompt, three lane labels and the index of the right lane. Artikel keeps A / AN / SOME
// in that order on every gate (the lanes stay where the learner expects them); plural and
// verb options are shuffled per gate. The small label above the prompt is UI text (t()); the
// verb label names the base form and the tense in English, as the grammar pages do.

import { t } from "../uiText.js";
import { seeded } from "./rng.js";

export const MODES = {
  artikel: { label: "Articles", key: "sprint.mode.artikel", hint: "a, an or some?", hintKey: "sprint.hint.artikel" },
  plural: { label: "Plural", key: "sprint.mode.plural", hint: "Which plural is right?", hintKey: "sprint.hint.plural" },
  verb: { label: "Verbs", key: "sprint.mode.verb", hint: "Which form fits?", hintKey: "sprint.hint.verb" },
};
export const LEVELS = ["A1", "A2", "B1"];
const ARTICLES = ["a", "an", "some"];
// The five-lane road of a race room: two more boxes, never the answer to "a, an or some?".
const TRAPS = ["the", "any"];

/** `n` options: the given ones, topped up from made-up forms that are not among them. */
function topUp(options, candidates, n, rnd) {
  if (options.length >= n) return options.slice(0, n);
  const extra = shuffle([...new Set(candidates)].filter((c) => c && !options.includes(c)), rnd);
  return [...options, ...extra.slice(0, n - options.length)];
}
// Plausible but made up ("boxs", "citys", "knifes", the greengrocer's "apple's"); topUp drops the
// one that is the real plural.
const fakePlurals = (w) => {
  const y = /[^aeiou]y$/.test(w) ? [w.slice(0, -1) + "ies", w + "es"] : [];
  const f = /fe?$/.test(w) ? [w.replace(/fe?$/, "ves")] : [];
  return [w + "s", w + "es", ...y, ...f, w + "en", w, w + "'s", w + "ses"];
};
const fakeForms = (inf) => [inf, inf + "s", inf + "es", inf + "ed", inf + "ing", inf + "en"];

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
 * and the progress count), `say` (what is read out after a miss), `audio` (none: the English
 * lexicon's clips say the bare word, "apple", while the answer is "an apple", so the voice reads `say`)
 * and `key` (names the item, so a miss can be dealt again).
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

function build(item, mode, rnd, n = 3) {
  if (mode === "artikel") {
    return {
      kind: "artikel",
      prompt: item.word,
      tag: t("sprint.hint.artikel", "a, an or some?"),
      english: item.english,
      options: (n === 5 ? [...ARTICLES, ...TRAPS] : ARTICLES).map((a) => a.toUpperCase()),
      answer: ARTICLES.indexOf(item.article),
      full: `${item.article} ${item.word}`,
      ...extras(item, `${item.article} ${item.word}`, "artikel"),
    };
  }
  if (mode === "plural") {
    const options = shuffle(topUp([item.plural, ...(item.pluralWrong ?? [])], fakePlurals(item.word), n, rnd), rnd);
    return {
      kind: "plural",
      prompt: `${item.article} ${item.word}`,
      tag: t("sprint.tag.plural", "Plural?"),
      english: item.english,
      options,
      answer: options.indexOf(item.plural),
      full: `${item.article} ${item.word} → two ${item.plural}`,
      ...extras(item, `two ${item.plural}`, "plural"),
    };
  }
  const options = shuffle(topUp(item.options, fakeForms(item.infinitive), n, rnd), rnd);
  return {
    kind: "verb",
    prompt: `${item.person} ___`,
    tag: `${item.infinitive}${item.tense ? ` · ${item.tense}` : " · present simple"}`,
    english: item.english,
    options,
    answer: options.indexOf(item.answer),
    full: `${item.person} ${item.answer} (${item.infinitive}${item.tense ? `, ${item.tense}` : ""})`,
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
  // Plural deals only nouns that have one (some = uncountable: no plural, article gates only).
  const pool = (mode === "verb" ? data.verbs : data.nouns)
    .filter((it) => it.level === level && (mode !== "plural" || (it.article !== "some" && it.plural)));
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
