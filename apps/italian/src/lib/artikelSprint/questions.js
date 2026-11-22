// Bruno Kart: turns words.json and the lexicon's nouns into the questions the word gates ask. One
// question = a prompt, three lane labels and the index of the right lane.
// Articles: the prompt is a noun, usually singular (zaino → LO), about one gate in three plural
// (zaini → GLI). Three lanes, always in the same places: singular il | lo (l' before a vowel) | la,
// plural i | gli | le. The middle box is the sound-rule box: LO before z, s+consonant, gn, ps; L'
// before a vowel, whatever the gender (l'amico, l'amica). So the lanes teach the sound as well as
// the gender.
// Plural: "il libro" → i libri / gli libri / i libre: the form and i, gli or le at once.
// Verb options are shuffled per gate. The small label above the prompt is UI text (t()).

import { t } from "../uiText.js";
import { seeded } from "./rng.js";
import { pluralArticle } from "../generoDrill.js";

export const MODES = {
  artikel: { label: "Articles", key: "sprint.mode.artikel", hint: "il, lo, la or l'?", hintKey: "sprint.hint.artikel" },
  plural: { label: "Plural", key: "sprint.mode.plural", hint: "i, gli or le, and which plural?", hintKey: "sprint.hint.plural" },
  verb: { label: "Verbs", key: "sprint.mode.verb", hint: "Which form fits?", hintKey: "sprint.hint.verb" },
};
export const LEVELS = ["A1", "A2", "B1"];
const SINGULAR_LANES = ["il", "lo", "la"];
const SINGULAR_VOWEL_LANES = ["il", "l'", "la"];
const PLURAL_LANES = ["i", "gli", "le"];
// The five-lane road of a race room: every article of that number, plus two of the other number.
const WIDE_SINGULAR = ["il", "lo", "la", "l'", "i"];
const WIDE_PLURAL = ["i", "gli", "le", "il", "la"];
/** How many article gates ask for the plural article. */
const PLURAL_SHARE = 1 / 3;

/** `n` options: the given ones, topped up from made-up forms that are not among them. */
function topUp(options, candidates, n, rnd) {
  if (options.length >= n) return options.slice(0, n);
  const extra = shuffle([...new Set(candidates)].filter((c) => c && !options.includes(c)), rnd);
  return [...options, ...extra.slice(0, n - options.length)];
}
// Plausible but made up (amichi, libre, the bare singular): for the lexicon's nouns, which carry no
// hand-made pluralWrong. build() filters out the one that is the real plural.
const fakePlurals = (w) => {
  const stem = w.slice(0, -1);
  const last = w.slice(-1);
  const wrong = last === "o" ? [stem + "e", stem + "a"] : last === "a" ? [stem + "i", stem + "o"] : last === "e" ? [stem + "a", stem + "o"] : [w + "i", w + "e"];
  return [...wrong, w];
};
// For the five-lane road: forms a verb does not have, or another person's.
const SHORT_VERBS = { andare: ["vado", "vai", "va", "andiamo", "vanno"], essere: ["sono", "sei", "è", "siamo", "siete"], avere: ["ho", "hai", "ha", "abbiamo", "avete"], fare: ["faccio", "fai", "fa", "facciamo", "fanno"] };
const fakeForms = (inf) => {
  if (SHORT_VERBS[inf]) return SHORT_VERBS[inf];
  const stem = inf.replace(/(are|ere|ire)$/, "");
  return [inf, stem + "o", stem + "i", stem + "a", stem + "iamo", stem + "ate", stem + "ono"];
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
 * and the progress count), `say` (what the browser's Italian voice reads after a miss), `audio`
 * (none: there are no Italian recordings yet) and `key` (names the item, so a miss can be dealt again).
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
  const say = (art, w) => (art.endsWith("'") ? art + w : `${art} ${w}`);
  if (mode === "artikel") {
    // Always one draw from rnd, so a seed stays the same track for everyone.
    const wantPlural = rnd() < PLURAL_SHARE;
    // città, caffè: the plural looks like the singular, so the prompt could not say which is meant.
    const asPlural = wantPlural && item.plural && item.plural !== item.word;
    const right = asPlural ? los : item.article;
    const lanes = n === 5 ? (asPlural ? WIDE_PLURAL : WIDE_SINGULAR) : asPlural ? PLURAL_LANES : item.article === "l'" ? SINGULAR_VOWEL_LANES : SINGULAR_LANES;
    const prompt = asPlural ? item.plural : item.word;
    // l'amica → le amiche: the plural shows the gender that l' hides, so a miss on either form sees both.
    const full = item.article === "l'" && item.plural ? `${say(item.article, item.word)}, ${say(los, item.plural)}` : say(right, prompt);
    return {
      kind: "artikel",
      prompt,
      tag: t("sprint.hint.artikel", "il, lo, la or l'?"),
      english: item.english,
      options: lanes.map((x) => x.toUpperCase()),
      answer: lanes.indexOf(right),
      full,
      ...extras(item, say(right, prompt), "artikel"),
    };
  }
  if (mode === "plural") {
    const other = los === "gli" ? "i" : "gli";
    const right = say(los, item.plural);
    const form = (f) => say(los, f);
    const handMade = shuffle(item.pluralWrong ?? [], rnd).map(form);
    const fakes = fakePlurals(item.word).filter((f) => f !== item.plural).map(form);
    // Always one box with the wrong article and the right form: that is the i / gli / le gate.
    const options = shuffle(topUp([right, say(other, item.plural), ...handMade], fakes, n, rnd), rnd);
    return {
      kind: "plural",
      prompt: say(item.article, item.word),
      tag: t("sprint.tag.plural", "Plural?"),
      english: item.english,
      options,
      answer: options.indexOf(right),
      full: `${say(item.article, item.word)} → ${right}`,
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
