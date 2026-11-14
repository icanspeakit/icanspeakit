// Error patterns in a scored take — the step from "this word scored 54" to "the u of
// tu came out as ou, which is typical when your first language is Spanish".
//
// Provider-neutral: it only reads the shapes in ./types.ts (word score, word error, the
// per-phoneme scores in spoken order, the inserted words), never anything vendor-specific.
// Phoneme *names* are not needed (not every provider and language gives them), only their
// order: "the last one or two sounds of the word scored low" is enough to say the ending was lost.
//
// A rule belongs to a drill of src/data/aussprache-muttersprache.json. Only the drills of the
// learner's first language are tried, in that language's order, so an English speaker hears
// about the r and a German speaker about nasal vowels — the same low score reads differently
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

// French letters stay as they are: an accent is part of the word.
const VOWELS = "aeiouyàâéèêëîïôùûüœ";
const norm = (w: string) => w.toLowerCase().replace(/[^a-zàâçéèêëîïôùûüœ]/g, "");
// A final consonant that is usually not said, or the whole -ent/-er/-ez of a verb.
const silentEnd = (w: string) => /(t|s|d|x|p|z|g)$|[^aeiouyàâéèêëîïôùûü]ent$|er$|ez$/.test(norm(w));
const syllables = (w: string) => (norm(w).match(/[aeiouyàâéèêëîïôùûüœ]+/g) || []).length;
// Small words said fast and unstressed: a low score there says little about one sound, so
// only the `specific` rules look at them.
const FUNCTION_WORDS = new Set(
  "a à au aux de du des le la les un une et ou où en dans sur sous par pour avec sans que qui ne se me te ce ces mon ma mes ton ta tes son sa ses je tu il elle on nous vous ils elles y est ai as ont suis es sont".split(" "),
);
// Words that usually link to a vowel after them (liaison): determiners, subject pronouns, short adverbs.
const LIAISON_WORDS = new Set(
  "les des ces mes tes ses nous vous ils elles un mon ton son très dans en chez plus bien trois deux aux".split(" "),
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

/** Heard "ou" where "u" was expected: the speech recogniser stands in a neighbour vowel. */
const swappedUOu = (ref: string, heard: string | null) => {
  if (!heard) return false;
  const r = norm(ref), h = norm(heard);
  return h !== r && h.replace(/ou/g, "u") === r.replace(/ou/g, "u");
};
/** Heard "bonne" for "bon": the reference with an n pushed after a nasal vowel. */
const nasalLost = (ref: string, heard: string | null) => {
  if (!heard) return false;
  const r = norm(ref), h = norm(heard);
  return h.length > r.length && h.startsWith(r) && /^[nm]/.test(h.slice(r.length));
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

const contains = (re: RegExp, part: "start" | "end" | "any", key: string, message: string): DrillPattern => ({
  applies: (word) => re.test(norm(word)),
  wrong: (w) => weak(w, part),
  key,
  message,
});

/** One rule per drill in src/data/aussprache-muttersprache.json (checked by pnpm check:aussprache). */
export const DRILL_PATTERNS: Record<string, DrillPattern> = {
  r: contains(/r/, "any", "ac.find.r", "“{word}” has r: say it at the back of the mouth, with friction, and keep the tip of your tongue down. Not the English r, not a roll."),
  "u-ou": {
    applies: (word) => /ou|où|[ûù]|(^|[^aeoqg])u/.test(norm(word)),
    wrong: (w, ctx) => swappedUOu(w.word, ctx.heardInstead) || weak(w, "any"),
    key: "ac.find.uou",
    message: "“{word}”: u is “ee” with round lips (tongue forward), ou is “oo” with the tongue back. tu is not tout.",
  },
  nasal: {
    applies: (word) => /(an|am|en|em|on|om|in|im|un|um)($|[^aeiouyàâéèêëîïôùûühnm])/.test(norm(word)),
    wrong: (w, ctx) => nasalLost(w.word, ctx.heardInstead) || weak(w, "any"),
    key: "ac.find.nasal",
    message: "“{word}”: the vowel is nasal. Let the air go through your nose, and don't say a closing n or “g”.",
  },
  eu: contains(/eu|œu/, "any", "ac.find.eu", "“{word}” has eu: say é and round your lips. It is not ou (deux ≠ doux)."),
  "e-muet": contains(/e$|es$|[^aeiou]ent$|^[bcdjlmnpqrstv]e[^aeiouyéèêr]/, "any", "ac.find.emuet", "In “{word}” the e is silent or weak. Don't give it a full vowel: table sounds like “tabl”."),
  liaison: {
    specific: true,
    applies: (word, ctx) => {
      const prev = ctx.words[ctx.i - 1];
      return ctx.i > 0 && !!prev && LIAISON_WORDS.has(norm(prev.word)) && /^[aeiouyàâéèêëîïôùûüœ]/.test(norm(word));
    },
    wrong: (w) => weak(w, "start"),
    key: "ac.find.liaison",
    message: "“{word}” follows a word that links to it: the last letter before it is said (s as z, n as n), and it joins the vowel.",
  },
  enchainement: {
    specific: true,
    applies: (word, ctx) => /^h?[aeiouyàâéèêëîïôùûüœ]/.test(norm(word)) && ctx.i > 0,
    wrong: (w) => weak(w, "start"),
    key: "ac.find.enchainement",
    message: "“{word}” follows straight on from the word before. No small stop in your throat: the consonant before it slides on to the vowel.",
  },
  silent: {
    applies: (word) => silentEnd(word),
    wrong: (w, ctx) => weak(w, "end") || (!!ctx.heardInstead && norm(ctx.heardInstead).length > norm(w.word).length),
    key: "ac.find.silent",
    message: "In “{word}” the last letter is silent. Don't say it.",
  },
  "s-z": contains(/[aeiouyàâéèêëîïôùûü]s[aeiouyàâéèêëîïôùûü]|ss|ç|^z|c[eiéèy]/, "any", "ac.find.sz", "“{word}”: s between two vowels is z, a double ss is s, and ç is s. Keep your voice on for z."),
  "ch-j": contains(/ch|j|g[eiéèy]/, "any", "ac.find.chj", "“{word}”: ch is sh as in “shop”, and j (or g before e, i) is the voiced sound in “measure”. Not “dj”, not a rasp."),
  "b-v": contains(/[bv]/, "any", "ac.find.bv", "“{word}”: b uses both lips, v uses your top teeth on your bottom lip, with voice. vin is not bain."),
  aspiration: contains(/^[ptk]|^c[aouâôû]|^qu/, "start", "ac.find.aspiration", "“{word}” has p, t or k. Say it with no puff of air."),
  stress: {
    applies: (word) => syllables(word) >= 2,
    wrong: (w) => weak(w, "any"),
    key: "ac.find.stress",
    message: "“{word}”: keep the syllables even. Don't push a syllable inside the word; the end of the group is a little longer.",
  },
  double: contains(/([bcdfgklmnprstvz])\1/, "any", "ac.find.double", "“{word}” has a double letter. Say one short consonant, don't hold it."),
  "voiced-final": contains(/(b|d|g|v|z|j|ge|be|de|ve|ze)$/, "end", "ac.find.voiced", "In “{word}” keep your voice on until the end of the last consonant. It must not turn into p, t, k or s."),
  "p-b": contains(/[pb]/, "any", "ac.find.pb", "“{word}” has p or b: p has no voice and no puff of air; for b your voice is on from the start."),
  vowels: {
    applies: (word) => syllables(word) >= 2,
    wrong: (w) => weak(w, "any"),
    key: "ac.find.vowels",
    message: "“{word}”: keep every vowel pure and full. No glide (é is not “ay”), no weak “uh”.",
  },
  h: contains(/^h/, "start", "ac.find.h", "The h in “{word}” is silent. Start straight on the next vowel."),
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
