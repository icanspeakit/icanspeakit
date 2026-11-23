// Bruno Kart: turns words.json and the lexicon's nouns into the questions the word gates ask. One
// question = a prompt, three lane labels and the index of the right lane.
// Articles: the prompt is a noun, usually singular (mão → A), about one gate in three plural
// (mãos → AS). The lanes stay where the learner expects them: masculine left, feminine in the
// middle, and on the right a third box, an article of the wrong number. A two-way choice would
// leave a lane with no box; fixed per number, the third box can't give the gender away.
// Plural: "o pão" → os pães / as pães / os pãos: the form and os or as at once.
// Verb options are shuffled per gate. The small label above the prompt is UI text (t()).

import { t } from "../uiText.js";
import { seeded } from "./rng.js";
import { pluralArticle } from "../generoDrill.js";

export const MODES = {
  artikel: { label: "Articles", key: "sprint.mode.artikel", hint: "o, a, os or as?", hintKey: "sprint.hint.artikel" },
  plural: { label: "Plural", key: "sprint.mode.plural", hint: "os or as, and which plural?", hintKey: "sprint.hint.plural" },
  verb: { label: "Verbs", key: "sprint.mode.verb", hint: "Which form fits?", hintKey: "sprint.hint.verb" },
};
export const LEVELS = ["A1", "A2", "B1"];
const SINGULAR_LANES = ["o", "a", "os"];
const PLURAL_LANES = ["os", "as", "o"];
// The five-lane road of a race room: every definite article, plus "um", the indefinite one, which
// is never the answer (the question is always the definite article).
const WIDE_LANES = ["o", "a", "os", "as", "um"];
/** How many article gates ask for the plural article. */
const PLURAL_SHARE = 1 / 3;

/** `n` options: the given ones, topped up from made-up forms that are not among them. */
function topUp(options, candidates, n, rnd) {
  if (options.length >= n) return options.slice(0, n);
  const extra = shuffle([...new Set(candidates)].filter((c) => c && !options.includes(c)), rnd);
  return [...options, ...extra.slice(0, n - options.length)];
}
// Plausible but made up, after the plural patterns learners mix up (-ão → -ões / -ães / -ãos,
// -l → -is, -m → -ns, -r / -z → -es, the bare singular): for the lexicon's nouns, which carry no
// hand-made pluralWrong. build() filters out the one that is the real plural.
// A generic tail (w + s / es / is / ns) tops up the five-lane road of a race room.
const fakePlurals = (w) => {
  const tail = [w + "s", w + "es", w + "is", w + "ns"];
  if (w.endsWith("ão")) { const s = w.slice(0, -2); return [s + "ões", s + "ães", s + "ãos", w, ...tail]; }
  if (w.endsWith("m")) return [w + "s", w.slice(0, -1) + "ns", w, ...tail];
  if (/[aeiouáéíóú]l$/.test(w)) return [w + "s", w + "es", w.slice(0, -1) + "is", w, ...tail];
  if (/[rz]$/.test(w)) return [w + "s", w + "es", w, ...tail];
  if (w.endsWith("s")) return [w + "es", w + "ses", w, ...tail];
  return [w + "s", w + "es", w, ...tail];
};
// For the five-lane road: forms a verb does not have, or another person's.
const SHORT_VERBS = {
  ir: ["iam", "ido", "vais", "vão", "iremos"],
  ser: ["sou", "somos", "sido", "sejas", "fomos"],
  ver: ["vês", "viu", "vemos", "viam", "vido"],
  ter: ["tem", "tenho", "tido", "tinha", "tenemos"],
  vir: ["vem", "vens", "vindo", "vinha", "viemos"],
  "pôr": ["põe", "pomos", "punha", "porá", "ponho"],
  dar: ["dou", "dá", "dado", "deu", "damos"],
};
const fakeForms = (inf) => {
  if (SHORT_VERBS[inf]) return SHORT_VERBS[inf];
  const stem = inf.replace(/(ar|er|ir)$/, "");
  return [inf, stem + "o", stem + "as", stem + "es", stem + "a", stem + "am", stem + "em"];
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
 * and the progress count), `say` (what the browser's Portuguese voice reads after a miss), `audio`
 * (none: there are no pt-PT recordings yet) and `key` (names the item, so a miss can be dealt again).
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
  const los = pluralArticle(item);
  if (mode === "artikel") {
    // Always one draw from rnd, so a seed stays the same track for everyone.
    const wantPlural = rnd() < PLURAL_SHARE;
    // o lápis, a crise → as crises is fine, but o lápis / os lápis: the plural looks like the
    // singular, so the prompt could not say which is meant.
    const asPlural = wantPlural && item.plural && item.plural !== item.word;
    const right = asPlural ? los : item.article;
    const lanes = n === 5 ? WIDE_LANES : asPlural ? PLURAL_LANES : SINGULAR_LANES;
    const prompt = asPlural ? item.plural : item.word;
    const full = `${right} ${prompt}`;
    return {
      kind: "artikel",
      prompt,
      tag: t("sprint.hint.artikel", "o, a, os or as?"),
      english: item.english,
      options: lanes.map((x) => x.toUpperCase()),
      answer: lanes.indexOf(right),
      full,
      ...extras(item, `${right} ${prompt}`, "artikel"),
    };
  }
  if (mode === "plural") {
    const other = los === "os" ? "as" : "os";
    const right = `${los} ${item.plural}`;
    const form = (f) => `${los} ${f}`;
    const handMade = shuffle(item.pluralWrong ?? [], rnd).map(form);
    const fakes = fakePlurals(item.word).filter((f) => f !== item.plural).map(form);
    // Always one box with the wrong article and the right form: that is the os / as gate.
    const options = shuffle(topUp([right, `${other} ${item.plural}`, ...handMade], fakes, n, rnd), rnd);
    return {
      kind: "plural",
      prompt: `${item.article} ${item.word}`,
      tag: t("sprint.tag.plural", "Plural?"),
      english: item.english,
      options,
      answer: options.indexOf(right),
      full: `${item.article} ${item.word} → ${right}`,
      ...extras(item, right, "plural"),
    };
  }
  const options = shuffle(topUp(item.options, fakeForms(item.infinitive), n, rnd), rnd);
  const tense = item.tense ?? "presente";
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
    .filter((it) => it.level === level && (mode !== "plural" || it.plural));
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
