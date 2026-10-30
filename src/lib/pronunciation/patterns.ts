// Error patterns in a scored take — the step from "this word scored 54" to "the last
// consonant of bike went missing, which is typical when your first language is Vietnamese".
//
// Provider-neutral: it only reads the shapes in ./types.ts (word score, word error, the
// per-phoneme scores in spoken order, the inserted words), never anything vendor-specific.
// Phoneme *names* are not needed (not every provider and language gives them), only their
// order: "the last one or two sounds of the word scored low" is enough to say the ending was lost.
//
// A rule belongs to a drill of src/data/aussprache-muttersprache.json. Only the drills of the
// learner's first language are tried, in that language's order, so a Vietnamese speaker hears
// about word endings and a French speaker about the h — the same low score reads differently
// depending on where it most likely comes from. Without a language nothing is diagnosed.
//
// Pure and synchronous, so scripts/check-aussprache.mjs and a quick test can import it.
import type { AssessedPhoneme, WordError } from "./types";

/** A reference word after alignment (see alignWords in src/lib/ausspracheShared.js). */
export interface ScoredWord {
  display: string;
  word: string;
  score: number;
  error: WordError;
  phonemes: AssessedPhoneme[];
}

/** A word that was heard but is not in the reference, and the reference word it came before. */
export interface InsertedWord {
  before: number;
  word: string;
}

export interface Finding {
  /** The matching entry in fehler-nach-sprache.json for this language, if there is one. */
  errorId: string | null;
  drillId: string;
  word: string;
  message: string;
  /** How badly the word went (0–100), for ranking. */
  score: number;
}

export interface PatternInput {
  words: ScoredWord[];
  inserted?: InsertedWord[];
  /** The learner's language's drills, in priority order. */
  drills: string[];
  /** drill id → error id for this language (from the data files). */
  errorFor?: Record<string, string | undefined>;
}

type Translate = (key: string, fallback: string, vars?: Record<string, string>) => string;
const english: Translate = (_k, fallback, vars) =>
  fallback.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m));

/* ------------------------------------------------------------ word shape ---- */

const norm = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");
// Letters to sounds, roughly: sh, ch, th, ph, ck, ng, tch, dge count as one consonant each,
// and a silent final e after a consonant (make, five) is dropped.
const skeleton = (w: string) =>
  norm(w)
    .replace(/tch/g, "C").replace(/dge/g, "J").replace(/sh/g, "S").replace(/ch/g, "C").replace(/th/g, "T")
    .replace(/ph/g, "F").replace(/ck/g, "K").replace(/ng/g, "N").replace(/qu/g, "Q")
    .replace(/([^aeiouy])e$/, "$1");
const CONS = "bcdfghjklmnpqrstvwxzSCTFKNQJ";
const isCons = (c: string) => CONS.includes(c);
// A final r is silent in British English (car, teacher), and a final w, y or h belongs to the
// vowel (new, day, oh): none of them is an ending that can get lost.
const endsInConsonant = (w: string) => {
  const s = skeleton(w);
  const last = s[s.length - 1];
  return s.length > 1 && isCons(last) && !"rwyh".includes(last);
};
const startCluster = (w: string) => { const s = skeleton(w); return s.length > 2 && isCons(s[0]) && isCons(s[1]) && !/^(wh|wr|kn|gn)/.test(norm(w)); };
const innerCluster = (w: string) => /[bcdfgjklmnpqstvxzSCTFKNQJ]{3,}/.test(skeleton(w));
const syllables = (w: string) => (norm(w).replace(/([^aeiouy])e$/, "$1").match(/[aeiouy]+/g) || []).length;
const PRONOUN_BEFORE_VERB = new Set(["he", "she", "it"]);
// Small words said fast and unstressed: a low score there says little about one sound, so
// only the narrow rules (verb ending, sp/st) look at them.
const FUNCTION_WORDS = new Set(
  "a an the and or but so in on at to of for from by with as is am are was were be been it he she we they you i me him her us them my your his its our their this that these those do does did not no can will would".split(" "),
);

/* ----------------------------------------------------------- went wrong? ---- */

const LOW = 60; // a phoneme below this is a sound that did not come out
const WEAK = 75; // a word below this is worth a finding

/** Did the part of the word the pattern is about go wrong? Uses phoneme order when there is some. */
function weak(w: ScoredWord, part: "start" | "end" | "any"): boolean {
  if (w.error === "omission") return false;
  const ph = w.phonemes;
  if (ph.length >= 3) {
    if (part === "end") return Math.min(...ph.slice(-2).map((p) => p.score)) < LOW;
    if (part === "start") return Math.min(...ph.slice(0, 2).map((p) => p.score)) < LOW;
    return w.score < WEAK || ph.some((p) => p.score < LOW - 10);
  }
  return w.score < WEAK || w.error === "mispronunciation";
}

interface Ctx {
  i: number;
  words: ScoredWord[];
  /** Heard text standing in for this word, when the word itself was not recognised. */
  heardInstead: string | null;
  /** A short extra word heard just before this one (a helper vowel: "e school"). */
  insertedBefore: string | null;
}

/** Heard "bi" where "bike" was expected: the reference minus its final consonants. */
const lostEnding = (ref: string, heard: string | null) => {
  if (!heard) return false;
  const r = norm(ref).replace(/([^aeiouy])e$/, "$1"), h = norm(heard);
  return h.length >= 2 && h.length < r.length && r.startsWith(h) && [...r.slice(h.length)].every((c) => isCons(c));
};
/** Heard "sitreet" for "street": the reference with a vowel pushed into its consonants. */
const vowelInserted = (ref: string, heard: string | null) => {
  if (!heard) return false;
  const r = norm(ref), h = norm(heard);
  if (h.length !== r.length + 1 && h.length !== r.length + 2) return false;
  for (let k = 0; k < h.length; k++) {
    if (!"aeiouy".includes(h[k])) continue;
    const without = h.slice(0, k) + h.slice(k + 1);
    if (without === r || without.slice(1) === r) return true;
  }
  return false;
};

/* ----------------------------------------------------------------- rules ---- */

export interface DrillPattern {
  /** Tried before the language's own order: a narrower rule ("du kommst" → verb ending)
      should win over a broad one that also matches ("kommst" ends in consonants). */
  specific?: boolean;
  /** Does the word contain what this drill practises? */
  applies(word: string, ctx: Ctx): boolean;
  /** Did that part go wrong in this take? */
  wrong(w: ScoredWord, ctx: Ctx): boolean;
  /** i18n key + German text, with {word}. */
  key: string;
  message: string;
}

const finalConsonant = (key: string, message: string): DrillPattern => ({
  applies: (word) => endsInConsonant(word),
  wrong: (w, ctx) => lostEnding(w.word, ctx.heardInstead) || weak(w, "end"),
  key,
  message,
});

const cluster = (key: string, message: string, onlyStart = false): DrillPattern => ({
  applies: (word) => startCluster(word) || (!onlyStart && innerCluster(word)),
  wrong: (w, ctx) =>
    vowelInserted(w.word, ctx.heardInstead) ||
    (!!ctx.insertedBefore && norm(ctx.insertedBefore).length <= 2) ||
    weak(w, onlyStart ? "start" : "any"),
  key,
  message,
});

const contains = (re: RegExp, part: "start" | "end" | "any", key: string, message: string): DrillPattern => ({
  applies: (word) => re.test(norm(word)),
  wrong: (w) => weak(w, part),
  key,
  message,
});

/** One rule per drill in src/data/aussprache-muttersprache.json (checked by pnpm check:aussprache). */
export const DRILL_PATTERNS: Record<string, DrillPattern> = {
  endkonsonanten: finalConsonant("ac.find.final", "In “{word}” the last sound got lost. Say the ending so it can be heard."),
  ende: finalConsonant("ac.find.final", "In “{word}” the last sound got lost. Say the ending so it can be heard."),
  auslaut: {
    applies: (word) => /[bdgvz]$/.test(skeleton(word)),
    wrong: (w, ctx) => lostEnding(w.word, ctx.heardInstead) || weak(w, "end"),
    key: "ac.find.auslaut",
    message: "“{word}” ends in a voiced sound. Keep your voice on at the end: bag is not back, prize is not price.",
  },
  "kein-e": finalConsonant("ac.find.keinE", "“{word}” ends in a consonant. Stop on it: don't add an “e” or “a”."),
  cluster: cluster("ac.find.cluster", "In “{word}” consonants come straight after each other. No vowel between them."),
  "sp-st": {
    specific: true,
    ...cluster("ac.find.spst", "“{word}” starts with s + consonant. Start with the s straight away, with no vowel before it.", true),
    applies: (word) => /^s(p|t|k|m|n|l|w|c(?![eiy]))/.test(norm(word)),
  },
  verbendungen: {
    specific: true,
    applies: (word, ctx) =>
      (/[^e]ed$/.test(norm(word)) && norm(word).length > 4) ||
      (/[^s]s$/.test(norm(word)) && ctx.i > 0 && PRONOUN_BEFORE_VERB.has(norm(ctx.words[ctx.i - 1].word))),
    wrong: (w, ctx) => lostEnding(w.word, ctx.heardInstead) || weak(w, "end"),
    key: "ac.find.verb",
    message: "In “{word}” the ending was missing. The ending shows who and when: he works, she lived.",
  },
  th: contains(/th/, "any", "ac.find.th", "“{word}” has th: the tip of your tongue between your teeth. Not s, t, f, d or z."),
  "w-v": contains(/^w[aeiouy]|^wh[aeiy]|v/, "any", "ac.find.wv", "“{word}”: for w round your lips, as for “oo”; for v your top teeth touch your bottom lip."),
  ae: contains(/^[^aeiou]*a[bcdfgklmnpstvxz]{1,2}$/, "any", "ac.find.ae", "“{word}” has the a of “cat”: open your mouth wide, tongue low and forward."),
  h: contains(/^h(?!our|onest|onour)/, "start", "ac.find.h", "“{word}” starts with h. Breathe it out softly, as if you were breathing on a cold window."),
  "r-l": contains(/[rl]/, "any", "ac.find.rl", "In “{word}” listen carefully to r and l: for l your tongue touches behind your top teeth, for r it touches nothing."),
  "kurz-lang": contains(/ee|ea|i[^aeiouyr]/, "any", "ac.find.kurzlang", "In “{word}” listen to the vowel: short i (ship) or long ee (sheep)? The length changes the word."),
  "p-b": contains(/[pb]/, "any", "ac.find.pb", "“{word}” has p or b: p comes with a small puff of air."),
  "e-i-o-u": contains(/^[^aeiou]*[eiou][^aeiou]*$/, "any", "ac.find.eiou", "In “{word}” listen to the vowel: e is not i, o is not u."),
  "w-b": contains(/[vb]/, "any", "ac.find.wb", "“{word}”: for v your top teeth touch your bottom lip, for b both lips close."),
  betonung: {
    applies: (word) => syllables(word) >= 2,
    wrong: (w) => weak(w, "any"),
    key: "ac.find.betonung",
    message: "“{word}”: one syllable is strong, the others are weak. Listen again for the strong one.",
  },
  s: contains(/z|[aeiou]s(y|ic|ie)/, "any", "ac.find.s", "“{word}” has a buzzing z sound. Use your voice, like a bee."),
};

/* ---------------------------------------------------------------- detect ---- */

/**
 * The findings for one take, worst first, at most `max` (one per drill, one per word).
 * Only the drills of the learner's language are tried.
 */
export function detectPatterns(input: PatternInput, { t = english, max = 2 }: { t?: Translate; max?: number } = {}): Finding[] {
  const { words, inserted = [], drills, errorFor = {} } = input;
  const found: Finding[] = [];
  const order = [...drills.filter((d) => DRILL_PATTERNS[d]?.specific), ...drills.filter((d) => !DRILL_PATTERNS[d]?.specific)];
  words.forEach((w, i) => {
    const near = inserted.filter((x) => x.before === i || x.before === i + 1);
    // An omitted word with something else heard in its place: that is what was said instead.
    const heardInstead = w.error === "omission" ? near.map((x) => x.word).find((x) => norm(x).length >= 2) ?? null : null;
    const insertedBefore = inserted.find((x) => x.before === i)?.word ?? null;
    if (w.error === "omission" && !heardInstead) return; // not said at all: the page lists those
    const ctx: Ctx = { i, words, heardInstead, insertedBefore };
    for (const d of order) {
      const rule = DRILL_PATTERNS[d];
      if (!rule || (!rule.specific && FUNCTION_WORDS.has(norm(w.word)))) continue;
      if (!rule.applies(w.word, ctx) || !rule.wrong(w, ctx)) continue;
      found.push({
        errorId: errorFor[d] ?? null,
        drillId: d,
        word: w.word,
        message: t(rule.key, rule.message, { word: w.word }),
        score: heardInstead ? 0 : w.score,
      });
      break;
    }
  });
  const out: Finding[] = [];
  for (const f of found.sort((a, b) => a.score - b.score)) {
    if (out.length >= max) break;
    if (out.some((o) => o.drillId === f.drillId || o.word === f.word)) continue;
    out.push(f);
  }
  return out;
}
