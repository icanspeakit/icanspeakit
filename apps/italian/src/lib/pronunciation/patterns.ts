// Error patterns in a scored take — the step from "this word scored 54" to "the last
// consonant of carro was held too short, which is typical when your first language is French".
//
// Provider-neutral: it only reads the shapes in ./types.ts (word score, word error, the
// per-phoneme scores in spoken order, the inserted words), never anything vendor-specific.
// Phoneme *names* are not needed (not every provider and language gives them), only their
// order: "the first one or two sounds of the word scored low" is enough to say the start was off.
//
// A rule belongs to a drill of src/data/aussprache-muttersprache.json. Only the drills of the
// learner's first language are tried, in that language's order, so a German speaker hears
// about st- and sp- and a French speaker about the r — the same low score reads differently
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

// Italian letters stay as they are: an accent is part of the word.
const norm = (w: string) => w.toLowerCase().replace(/[^a-zàèéìíòóùú]/g, "");
const syllables = (w: string) => (norm(w).match(/[aeiouàèéìíòóùú]+/g) || []).length;
// Small words said fast and unstressed: a low score there says little about one sound, so
// only the `specific` rules look at them.
const FUNCTION_WORDS = new Set(
  "a al di del dei il lo la i gli le un uno una e o in con per tra fra su da che se non mi ti si ci vi ne è sono io tu lui lei noi voi ha ho hai ma più già".split(" "),
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
  doppie: contains(/([bcdfglmnprstvz])\1/, "any", "ac.find.doppie", "“{word}” has a double consonant: hold it about twice as long, and keep the vowel before it short."),
  vocali: {
    applies: (word) => syllables(word) >= 2,
    wrong: (w) => weak(w, "any"),
    key: "ac.find.vocali",
    message: "“{word}”: keep every vowel short and clear, the last one too. No glide, no weak “uh”.",
  },
  "e-o": contains(/[eèéoòó]/, "any", "ac.find.eo", "In “{word}” listen to the stressed e or o: open or closed. è is open, perché is closed."),
  r: contains(/r/, "any", "ac.find.r", "“{word}” has r: a single r is one quick tap of the tongue tip, rr and a first r are several. caro is not carro."),
  "c-g": contains(/c[eiéèìí]|g[eiéèìí]|ch|gh|ci[aou]|gi[aou]/, "any", "ac.find.cg", "“{word}”: ce, ci and ge, gi are soft (like “church”, “jam”); che, chi and ghe, ghi are hard: k and g."),
  sc: contains(/sc[eiéèìí]|sch/, "any", "ac.find.sc", "“{word}”: sce and sci are like sh in “ship”; sche and schi are s + k."),
  "gn-gl": contains(/gn|gli/, "any", "ac.find.gngl", "“{word}” has gn or gli: one sound, with the middle of your tongue against the roof of your mouth. Not g + n, not g + l."),
  z: contains(/z/, "any", "ac.find.z", "“{word}” has z: a ts or a dz, the tongue at your teeth with a hiss. Not a buzz, not th."),
  s: contains(/s[bdglmnrv]/, "any", "ac.find.s", "In “{word}”, s before b, d, g, l, m, n, r or v is voiced, like z in “zoo”."),
  "b-v": contains(/[bv]/, "any", "ac.find.bv", "“{word}”: b closes both lips; v touches the top teeth to your lower lip. They are two different sounds."),
  qu: contains(/qu/, "any", "ac.find.qu", "“{word}” has qu: say k + w, you hear the u."),
  aspiration: contains(/^[pt]|^c[aouàòóùú]|^k|^qu/, "start", "ac.find.aspiration", "“{word}” has p, t or k. Say it with no puff of air."),
  h: contains(/^h/, "start", "ac.find.h", "The h in “{word}” is silent. Start straight on the next vowel."),
  "st-sp": contains(/^s[ptcbdgmnlrvf]/, "start", "ac.find.stsp", "“{word}” starts with s + a consonant: start straight on a clean s, with no vowel in front."),
  nasal: contains(/[aeiouàèéìòóùú][nm]($|[^aeiouàèéìòóùúnm])/, "any", "ac.find.nasal", "“{word}”: keep the vowel clean, with no air through your nose, then say a real n or m."),
  u: contains(/(^|[^q])[uùú]/, "any", "ac.find.u", "“{word}” has u: round your lips and pull your tongue back, like the “ou” of French “vous”."),
  "ti-di": contains(/[td]i/, "any", "ac.find.tidi", "“{word}”: t and d stay plain before i, no “ch” and no “j”."),
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
