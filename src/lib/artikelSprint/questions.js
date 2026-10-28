// Artikel-Flitzer: turns words.json into the questions the word gates ask. One question =
// a prompt, three lane labels and the index of the right lane. Artikel keeps DER / DIE / DAS
// in that order on every gate (the lanes stay where the learner expects them); plural and
// verb options are shuffled per gate. The small label above the prompt is UI text (t()); the
// verb label names the infinitive and the tense in German on purpose, as the grammar pages do.

import { t } from "../uiText.js";
import { seeded } from "./rng.js";

export const MODES = {
  artikel: { label: "Artikel", key: "sprint.mode.artikel", hint: "der, die oder das?", hintKey: "sprint.hint.artikel" },
  plural: { label: "Plural", key: "sprint.mode.plural", hint: "Welcher Plural stimmt?", hintKey: "sprint.hint.plural" },
  verb: { label: "Verben", key: "sprint.mode.verb", hint: "Welche Form passt?", hintKey: "sprint.hint.verb" },
};
export const LEVELS = ["A1", "A2", "B1"];
const ARTICLES = ["der", "die", "das"];
// The five-lane road of a race room: two more boxes, never right for the nominative on the beam.
const TRAPS = ["den", "dem"];

const umlaut = (w) => w.replace(/^(.*?)(au|Au|a|o|u|A|O|U)([^aouAOU]*)$/, (_, a, v, b) => a + ({ au: "äu", Au: "Äu", a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" })[v] + b);

/** `n` options: the given ones, topped up from made-up forms that are not among them. */
function topUp(options, candidates, n, rnd) {
  if (options.length >= n) return options.slice(0, n);
  const extra = shuffle([...new Set(candidates)].filter((c) => c && !options.includes(c)), rnd);
  return [...options, ...extra.slice(0, n - options.length)];
}
// Plausible but made up („Tischer“, „Zugen“). A word on -e takes -n/-s/-r endings, never a second e.
const fakePlurals = (w) => (/e$/.test(w)
  ? [w + "n", w + "s", w + "r", umlaut(w), umlaut(w) + "n", w]
  : [w + "e", w + "en", w + "n", w + "er", w + "s", umlaut(w) + "e", umlaut(w) + "er", umlaut(w), w]);
const fakeForms = (inf) => {
  const stem = inf.replace(/e?n$/, "");
  return ["e", "st", "t", "en", "et", "est"].map((e) => stem + e).concat(inf);
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
 * and the progress count), `say` (what is read out after a miss), `audio` (the lexicon's recording of
 * "der Tisch", only where the answer is exactly that: the Artikel mode) and `key` (names the item, so
 * a miss can be dealt again).
 */
function extras(item, say, kind) {
  return {
    id: item.id,
    say,
    audio: kind === "artikel" ? item.audio : undefined,
    key: `${kind}:${item.word ?? `${item.infinitive}/${item.person}/${item.answer}`}`,
    item,
  };
}

function build(item, mode, rnd, n = 3) {
  if (mode === "artikel") {
    return {
      kind: "artikel",
      prompt: item.word,
      tag: t("sprint.hint.artikel", "der, die oder das?"),
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
      full: `${item.article} ${item.word} → die ${item.plural}`,
      ...extras(item, `die ${item.plural}`, "plural"),
    };
  }
  const options = shuffle(topUp(item.options, fakeForms(item.infinitive), n, rnd), rnd);
  return {
    kind: "verb",
    prompt: `${item.person} ___`,
    tag: `${item.infinitive}${item.tense ? ` · ${item.tense}` : " · Präsens"}`,
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
  const pool = (mode === "verb" ? data.verbs : data.nouns).filter((it) => it.level === level);
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
