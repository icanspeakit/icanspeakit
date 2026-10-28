// Error patterns in a scored take — the step from "this word scored 54" to "the last
// consonant of Hund went missing, which is typical when your first language is Vietnamese".
//
// Provider-neutral: it only reads the shapes in ./types.ts (word score, word error, the
// per-phoneme scores in spoken order, the inserted words), never anything vendor-specific.
// Phoneme *names* are not needed — Azure gives none for de-DE — only their order: "the last
// one or two sounds of the word scored low" is enough to say the ending was lost.
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
const german: Translate = (_k, fallback, vars) =>
  fallback.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m));

/* ------------------------------------------------------------ word shape ---- */

const norm = (w: string) => w.toLowerCase().replace(/[^a-zäöüß]/g, "");
// Letters to sounds, roughly: sch, ch, ck, pf, tz count as one consonant each.
const skeleton = (w: string) =>
  norm(w).replace(/sch/g, "S").replace(/ch/g, "C").replace(/ck/g, "K").replace(/pf/g, "F").replace(/tz/g, "Z").replace(/qu/g, "Q");
const CONS = "bcdfghjklmnpqrstvwxzßSCKFZQ";
const isCons = (c: string) => CONS.includes(c);
// A final r (wir, der, Lehrer) is spoken as a vowel, and an h after a vowel (froh) is silent:
// neither is an ending that can get lost.
const endsInConsonant = (w: string) => {
  const s = skeleton(w);
  const last = s[s.length - 1];
  return s.length > 1 && isCons(last) && last !== "r" && last !== "h";
};
const startCluster = (w: string) => { const s = skeleton(w); return s.length > 2 && isCons(s[0]) && isCons(s[1]); };
const innerCluster = (w: string) => /[bcdfghjklmnpqrstvwxzßSCKFZQ]{3,}/.test(skeleton(w));
const syllables = (w: string) => (norm(w).match(/[aeiouäöüy]+/g) || []).length;
const PRONOUN_BEFORE_VERB = new Set(["du", "er", "sie", "es", "ihr", "man"]);
// Small words said fast and unstressed: a low score there says little about one sound, so
// only the narrow rules (verb ending, sp/st) look at them.
const FUNCTION_WORDS = new Set(
  "der die das den dem des ein eine einen einem einer und oder in im am an auf zu zum zur ist bin sind es er sie wir ihr du ich mit von vom bei aus noch nicht so wie was wo".split(" "),
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
  /** A short extra word heard just before this one (a helper vowel: "e Straße"). */
  insertedBefore: string | null;
}

/** Heard "hun" where "Hund" was expected: the reference minus its final consonants. */
const lostEnding = (ref: string, heard: string | null) => {
  if (!heard) return false;
  const r = norm(ref), h = norm(heard);
  return h.length >= 2 && h.length < r.length && r.startsWith(h) && [...r.slice(h.length)].every((c) => isCons(c));
};
/** Heard "sitraße" for "Straße": the reference with a vowel pushed into its consonants. */
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
  endkonsonanten: finalConsonant("ac.find.final", "Bei „{word}“ ging der letzte Laut verloren. Sprich das Ende hörbar mit."),
  ende: finalConsonant("ac.find.final", "Bei „{word}“ ging der letzte Laut verloren. Sprich das Ende hörbar mit."),
  auslaut: finalConsonant("ac.find.auslaut", "Bei „{word}“ klang das Ende weich. Am Wortende wird es hart: d → t, g → k, b → p."),
  "kein-e": finalConsonant("ac.find.keinE", "„{word}“ endet mit einem Konsonanten — hänge kein „e“ an."),
  cluster: cluster("ac.find.cluster", "In „{word}“ stehen Konsonanten direkt nacheinander. Kein Vokal dazwischen."),
  "sp-st": {
    specific: true,
    ...cluster("ac.find.spst", "„{word}“ beginnt mit sp oder st: sprich „schp“ oder „scht“ — ohne Vokal davor.", true),
    applies: (word) => /^(sp|st)/.test(norm(word)),
  },
  verbendungen: {
    specific: true,
    applies: (word, ctx) => /(st|t)$/.test(norm(word)) && ctx.i > 0 && PRONOUN_BEFORE_VERB.has(norm(ctx.words[ctx.i - 1].word)),
    wrong: (w, ctx) => lostEnding(w.word, ctx.heardInstead) || weak(w, "end"),
    key: "ac.find.verb",
    message: "Bei „{word}“ fehlte die Endung. Die Endung zeigt, wer es tut: du …st, er …t, ihr …t.",
  },
  ch: contains(/(^|[^s])ch/, "any", "ac.find.ch", "„{word}“ hat ein ch. Nach a, o, u, au rau wie in „Bach“, sonst weich wie in „ich“."),
  "ue-oe": contains(/[üö]/, "any", "ac.find.ueoe", "„{word}“ hat ü oder ö: Zunge wie bei i oder e, Lippen rund."),
  h: contains(/^h/, "start", "ac.find.h", "„{word}“ beginnt mit h. Hauche es hörbar — wie wenn du auf eine Brille atmest."),
  "r-l": contains(/[rl]/, "any", "ac.find.rl", "Bei „{word}“ hör genau auf r und l: l mit der Zunge oben, r hinten im Hals."),
  "kurz-lang": contains(/(tt|mm|nn|ll|ss|ck|tz|ff|pp|ie|ah|eh|oh|uh|aa|ee|oo)/, "any", "ac.find.kurzlang", "Bei „{word}“ hör auf die Länge: vor zwei Konsonanten kurz, vor h oder bei ie lang."),
  "p-b": contains(/[pb]/, "any", "ac.find.pb", "„{word}“ hat p oder b: Beim p kommt ein kleiner Luftstoß."),
  "e-i-o-u": contains(/^[^aeiouäöü]*[eiou][^aeiouäöü]*$/, "any", "ac.find.eiou", "Bei „{word}“ hör auf den Vokal: e ist nicht i, o ist nicht u."),
  hart: contains(/[bdtnlm][ei]/, "any", "ac.find.hart", "Bei „{word}“ bleibt der Konsonant vor e und i hart — kein „j“ dazwischen."),
  "g-h": contains(/^g/, "start", "ac.find.gh", "„{word}“ beginnt mit g — nicht mit h. Die Zunge stößt hinten an."),
  "z-w": contains(/[zw]/, "any", "ac.find.zw", "„{word}“: z klingt wie „ts“, w wie „v“."),
  "w-b": contains(/[wb]/, "any", "ac.find.wb", "„{word}“: w mit Zähnen auf der Unterlippe, b mit beiden Lippen."),
  betonung: {
    applies: (word) => syllables(word) >= 2,
    wrong: (w) => weak(w, "any"),
    key: "ac.find.betonung",
    message: "„{word}“: Betone die erste Silbe — die meisten deutschen Wörter beginnen stark.",
  },
  s: contains(/^s[aeiouäöü]/, "start", "ac.find.s", "„{word}“ beginnt mit s vor einem Vokal: weich und summend, wie eine Biene."),
};

/* ---------------------------------------------------------------- detect ---- */

/**
 * The findings for one take, worst first, at most `max` (one per drill, one per word).
 * Only the drills of the learner's language are tried.
 */
export function detectPatterns(input: PatternInput, { t = german, max = 2 }: { t?: Translate; max?: number } = {}): Finding[] {
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
