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

// Portuguese letters stay as they are: an accent, tilde or ç is part of the word.
const V = "aeiouáàâãéêíóôõú";
const norm = (w: string) => w.toLowerCase().replace(/[^a-záàâãçéêíóôõú]/g, "");
const syllables = (w: string) => (norm(w).match(new RegExp(`[${V}]+`, "g")) || []).length;
// Small words said fast and unstressed: a low score there says little about one sound, so
// only the `specific` rules look at them.
const FUNCTION_WORDS = new Set(
  "a o as os e é de do da dos das um uma uns umas em no na nos nas com por para sem que se me te lhe vos mas ou eu tu ele ela já não mais ao aos à às".split(" "),
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

/* ----------------------------------------------------------------- rules ---- */

export interface DrillPattern {
  /** Tried before the language's own order: a narrower rule should win over a broad one
      that also matches the word. */
  specific?: boolean;
  /** Does the word contain what this drill practises? */
  applies(word: string, ctx: Ctx): boolean;
  /** Did that part go wrong in this take? */
  wrong(w: ScoredWord, ctx: Ctx): boolean;
  /** i18n key + English text, with {word}. */
  key: string;
  message: string;
}

const contains = (re: RegExp, part: "start" | "end" | "any", key: string, message: string): DrillPattern => ({
  applies: (word) => re.test(norm(word)),
  wrong: (w) => weak(w, part),
  key,
  message,
});

const R = contains;

/** One rule per drill in src/data/aussprache-muttersprache.json (checked by pnpm check:aussprache). */
export const DRILL_PATTERNS: Record<string, DrillPattern> = {
  reducao: R(/e/, "any", "ac.find.reducao", "“{word}”: an unstressed e is very weak (a short “ɨ” or nothing at all). Don't say a full e. pequeno is nearly “p'keno”."),
  "o-u": R(/[o]s?$/, "end", "ac.find.ou", "“{word}” ends in o: an unstressed final o sounds like u. livro is “livru”."),
  "aberta-fechada": R(/[éêóô]/, "any", "ac.find.abertas", "“{word}”: listen to the accent. é and ó are open, ê and ô are closed. avó and avô are different people."),
  nasal: R(/ã|õ|[aeiou][nm]($|[^aeiouáàâãéêíóôõú])/, "any", "ac.find.nasal", "“{word}”: the vowel is nasal. Let the air go through your nose, and don't finish with a clear n or m."),
  ao: R(/ão|ãe|õe|ã/, "any", "ac.find.ao", "“{word}” has a nasal diphthong. Start with the nasal vowel and glide on to a short w or y, with no real n."),
  "s-sh": R(/s($|[^aeiouáàâãéêíóôõús])|z$/, "any", "ac.find.ssh", "“{word}”: s before a consonant or at the end of a word sounds like sh (like the s in “measure” before b, d, g, m, n, l, r, v). luz is “loosh”."),
  "s-z": R(/[aeiouáàâãéêíóôõú]s[aeiouáàâãéêíóôõú]|ss|ç|^z|z[aeiou]/, "any", "ac.find.sz", "“{word}”: s between vowels buzzes like z; ss and ç are a sharp s. casa is not caça."),
  "r-rr": R(/r/, "any", "ac.find.rr", "“{word}” has r: a single r between vowels is one quick tap; rr and a first r are the strong r at the back of the mouth. caro is not carro."),
  "lh-nh": R(/lh|nh/, "any", "ac.find.lhnh", "“{word}” has lh or nh: one sound each, made with the middle of the tongue against the roof of the mouth, like “million” or “canyon”."),
  "j-g": R(/j|g[eiéíê]/, "any", "ac.find.jg", "“{word}”: j, and g before e or i, is like the s in “measure”. Not a rasp, and not the j of “jam”."),
  ch: R(/ch/, "any", "ac.find.ch", "“{word}” has ch: it is sh, as in “shop”. Not ch as in “church”, and not k."),
  doble: R(/[aeiouáàâãéêíóôõú][bcdfgmnpstz][aeiouáàâãéêíóôõú]/, "any", "ac.find.doble", "“{word}”: the consonants are short. Don't hold them; move straight on to the next vowel."),
  "l-final": R(/l($|[^aeiouáàâãéêíóôõúh])/, "any", "ac.find.lfinal", "“{word}”: l at the end of a syllable is dark, said with the back of the tongue raised, almost like a short “w”."),
  h: R(/^h/, "start", "ac.find.h", "The h in “{word}” is silent. Start straight on the next vowel."),
  enlace: {
    specific: true,
    applies: (word, ctx) => {
      if (!/^h?[aeiouáàâãéêíóôõú]/.test(norm(word)) || ctx.i === 0) return false;
      return /[aeiouáàâãéêíóôõúsrlz]$/.test(norm(ctx.words[ctx.i - 1].word));
    },
    wrong: (w) => weak(w, "start"),
    key: "ac.find.enlace",
    message: "“{word}” follows straight on from the word before. No small stop in your throat.",
  },
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
