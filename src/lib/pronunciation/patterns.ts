// Error patterns in a scored take — the step from "this word scored 54" to "the last
// consonant of hablar went missing, which is typical when your first language is Chinese".
//
// Provider-neutral: it only reads the shapes in ./types.ts (word score, word error, the
// per-phoneme scores in spoken order, the inserted words), never anything vendor-specific.
// Phoneme *names* are not needed (not every provider and language gives them), only their
// order: "the last one or two sounds of the word scored low" is enough to say the ending was lost.
//
// A rule belongs to a drill of src/data/aussprache-muttersprache.json. Only the drills of the
// learner's first language are tried, in that language's order, so a Chinese speaker hears
// about word endings and a French speaker about the r — the same low score reads differently
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

// Spanish letters stay as they are: an accent or ñ is part of the word.
const VOWELS = "aeiouáéíóúü";
const norm = (w: string) => w.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
// Letters to sounds, roughly: ch, ll, rr and qu count as one consonant each.
const skeleton = (w: string) => norm(w).replace(/ch/g, "C").replace(/ll/g, "L").replace(/rr/g, "R").replace(/qu/g, "Q");
const isCons = (c: string) => !!c && !VOWELS.includes(c);
// A final y belongs to the vowel (hoy, muy): it isn't an ending that can get lost.
const endsInConsonant = (w: string) => {
  const s = skeleton(w);
  const last = s[s.length - 1];
  return s.length > 1 && isCons(last) && last !== "y";
};
const startCluster = (w: string) => /^(pl|pr|bl|br|fl|fr|gl|gr|cl|cr|tr|dr)/.test(norm(w));
const innerCluster = (w: string) => /(pl|pr|bl|br|fl|fr|gl|gr|cl|cr|tr|dr)/.test(norm(w).slice(1));
const syllables = (w: string) => (norm(w).match(/[aeiouáéíóúü]+/g) || []).length;
// Small words said fast and unstressed: a low score there says little about one sound, so
// only the `specific` rules look at them.
const FUNCTION_WORDS = new Set(
  "a al de del el la los las lo un una unos unas y e o u en con por para sin que si no me te se le les nos os mi mis tu tus su sus es son yo tú él ella hay ya muy más".split(" "),
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
  /** A short extra word heard just before this one (a helper vowel). */
  insertedBefore: string | null;
}

/** Heard "habla" where "hablar" was expected: the reference minus its final consonants. */
const lostEnding = (ref: string, heard: string | null) => {
  if (!heard) return false;
  const r = norm(ref), h = norm(heard);
  return h.length >= 2 && h.length < r.length && r.startsWith(h) && [...r.slice(h.length)].every((c) => isCons(c));
};
/** Heard "teren" for "tren": the reference with a vowel pushed into its consonants. */
const vowelInserted = (ref: string, heard: string | null) => {
  if (!heard) return false;
  const r = norm(ref), h = norm(heard);
  if (h.length !== r.length + 1 && h.length !== r.length + 2) return false;
  for (let k = 0; k < h.length; k++) {
    if (!VOWELS.includes(h[k])) continue;
    const without = h.slice(0, k) + h.slice(k + 1);
    if (without === r || without.slice(1) === r) return true;
  }
  return false;
};

/* ----------------------------------------------------------------- rules ---- */

export interface DrillPattern {
  /** Tried before the language's own order: a narrower rule (a stop before a vowel)
      should win over a broad one that also matches the word. */
  specific?: boolean;
  /** Does the word contain what this drill practises? */
  applies(word: string, ctx: Ctx): boolean;
  /** Did that part go wrong in this take? */
  wrong(w: ScoredWord, ctx: Ctx): boolean;
  /** i18n key + English text, with {word}. */
  key: string;
  message: string;
}

const finalConsonant = (key: string, message: string): DrillPattern => ({
  applies: (word) => endsInConsonant(word),
  wrong: (w, ctx) => lostEnding(w.word, ctx.heardInstead) || weak(w, "end"),
  key,
  message,
});

const cluster = (key: string, message: string): DrillPattern => ({
  applies: (word) => startCluster(word) || innerCluster(word),
  wrong: (w, ctx) =>
    vowelInserted(w.word, ctx.heardInstead) ||
    (!!ctx.insertedBefore && norm(ctx.insertedBefore).length <= 2) ||
    weak(w, "any"),
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
  ende: finalConsonant("ac.find.final", "In “{word}” the last sound got lost. Say the ending so it can be heard."),
  cluster: cluster("ac.find.cluster", "In “{word}” two consonants come straight after each other. No vowel between them."),
  enlace: {
    specific: true,
    applies: (word, ctx) => {
      if (!/^h?[aeiouáéíóú]/.test(norm(word)) || ctx.i === 0) return false;
      return /[aeiouáéíóúy]$/.test(norm(ctx.words[ctx.i - 1].word));
    },
    wrong: (w) => weak(w, "start"),
    key: "ac.find.enlace",
    message: "“{word}” follows straight on from the word before. No small stop in your throat.",
  },
  "r-rr": contains(/r/, "any", "ac.find.rr", "“{word}” has r: a single r is one quick tap of the tongue tip, rr and a first r are several. pero is not perro."),
  "r-l": contains(/[rl]/, "any", "ac.find.rl", "In “{word}” listen carefully to r and l: for l your tongue stays up behind your top teeth, for r it taps once and goes."),
  "ce-zi": contains(/z|c[eiéí]/, "any", "ac.find.cz", "“{word}”: z, and c before e or i, are like th in “think” in Spain: tongue tip between your teeth. Not ts, not ch, no buzz."),
  "j-g": contains(/j|g[eiéí]/, "any", "ac.find.jg", "“{word}”: j, and g before e or i, are a rasp at the back of your mouth, like ch in Scottish “loch”."),
  "b-v": contains(/[bv]/, "any", "ac.find.bv", "“{word}”: b and v are one sound. Use only your lips; your top teeth don't touch your lip."),
  vokale: {
    applies: (word) => syllables(word) >= 2,
    wrong: (w) => weak(w, "any"),
    key: "ac.find.vokale",
    message: "“{word}”: keep every vowel short and clear, stressed or not. No glide, no weak “uh”.",
  },
  aspiration: contains(/^[pt]|^c[aouáóú]|^k|^qu/, "start", "ac.find.aspiration", "“{word}” has p, t or k. Say it with no puff of air."),
  "d-suave": contains(/[^nl]d/, "any", "ac.find.dsuave", "The d in “{word}” is soft, like th in “this”. The tongue only just touches your teeth."),
  "ll-y": contains(/ll|y[aeiouáéíóú]/, "any", "ac.find.lly", "“{word}”: ll and y sound like y in “yes” in most of Spain. Never an l."),
  nasal: contains(/[aeiouáéíóú][nm]($|[^aeiouáéíóúnm])/, "any", "ac.find.nasal", "“{word}”: keep the vowel clean, with no air through your nose, then say a real n or m."),
  u: contains(/(^|[^qg])[uú]/, "any", "ac.find.u", "“{word}” has u: round your lips and pull your tongue back, like the “ou” of French “vous”."),
  ch: contains(/ch/, "any", "ac.find.ch", "“{word}” has ch, as in “church”. Not sh, not k."),
  doble: contains(/[aeiouáéíóú][bcdfgmnpstz][aeiouáéíóú]/, "any", "ac.find.doble", "“{word}”: the consonants are short. Don't hold them; move straight on to the next vowel."),
  s: contains(/[aeiouáéíóú]s[aeiouáéíóú]|^s[aeiouáéíóú]/, "any", "ac.find.s", "“{word}” has an s. Keep it sharp, as in “sun”, with no buzz."),
  h: contains(/^h/, "start", "ac.find.h", "The h in “{word}” is silent. Start straight on the next vowel."),
  g: contains(/g[aouáóúlr]|gu[eiéí]/, "any", "ac.find.g", "“{word}” has g as in “go”, made at the back of your mouth. Not h."),
  "p-b": contains(/[pbv]/, "any", "ac.find.pb", "“{word}” has p or b: p has no puff of air and no voice; for b your voice is on from the start."),
  "e-i-o-u": contains(/[eiouéíóú]/, "any", "ac.find.eiou", "In “{word}” listen to the vowel: e is not i, o is not u."),
  betonung: {
    applies: (word) => syllables(word) >= 2,
    wrong: (w) => weak(w, "any"),
    key: "ac.find.betonung",
    message: "“{word}”: one syllable is strong. Listen for it again, and follow the written accent if there is one.",
  },
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
