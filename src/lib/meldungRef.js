// Item refs and fingerprints for "Problem melden" (docs/problem-melden-tier0-v1.md §2).
//
//   ref          "<prefix>:<set>/<item>", e.g. g:als-oder-wenn/2/5, k:insider/dating/q1,
//                x:lid/q12, f:vorfahrt-01. 1-based indices; "q<n>" marks a question index.
//   fingerprint  checksum(prompt + "␟" + answer), 6 hex (the Einfach tripwire), so a
//                report can be matched to its item after the JSON was edited or reordered.
//
// Pure: no DOM, no fs. The button (browser), the API route (regex only), the content check
// and the export scripts (Node) all build and check refs here, so they agree.
import { checksum } from "./einfach-content.js";
import { zimmerItems } from "./zimmerSaetze.js";

export const REF_RE = /^[a-z]{1,2}:[a-z0-9][a-z0-9._/+:-]{0,117}$/;
export const FP_RE = /^[0-9a-f]{6}$/;
export const GRUENDE = Object.freeze(["antwort_falsch", "unklar", "fehler_deutsch", "technisch", "sonstiges", "flag"]);

const SEP = "␟";

/** A path segment: lowercase, only ref characters. */
const seg = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9._+-]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Joins a prefix and parts into a ref, or null if the result is not a valid ref.
 * @param {string} prefix - "g", "k", "x", …
 * @param {...(string|number)} parts - set and item path; numbers are taken as they are
 */
export function makeRef(prefix, ...parts) {
  const r = `${prefix}:${parts.map(seg).filter(Boolean).join("/")}`;
  return REF_RE.test(r) ? r : null;
}

/**
 * Any ref string made safe: lowercase, umlauts spelled out, other characters → "-".
 * Every ref goes through this before it is sent or looked up, so ids with capitals or
 * umlauts (lexicon nouns, Bundesländer) match between the browser and the scripts.
 */
export function cleanRef(ref) {
  const r = String(ref ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9._/+:-]+/g, "-")
    .slice(0, 120);
  return REF_RE.test(r) ? r : null;
}

/** "q" + 1-based index, for question refs. */
export const q = (i0) => `q${Number(i0) + 1}`;

// <u>…</u> only marks the word a task asks about (src/lib/markedText.js): not part of
// the fingerprint, nor of the text a report shows.
const unmark = (s) => String(s ?? "").replace(/<\/?u>/g, "");
const text = (v) => unmark(Array.isArray(v) ? v.join(" ") : v).replace(/\s+/g, " ").trim();

/** The fingerprint of one item from its prompt and its expected answer. */
export function fingerprint(prompt, answer) {
  return checksum(text(prompt) + SEP + text(answer));
}

/**
 * Prompt and answer of a data item, by item shape. Covers every shape in the Tier 0
 * inventory: quiz {prompt,answer}, table row {term,answer}, match {q,a}, build
 * {hint,correct[]}, story blank {blank,answer}, exam {question|statement, correct}.
 */
export function promptAnswer(item) {
  if (!item || typeof item !== "object") return { prompt: "", answer: "" };
  if (Array.isArray(item.correct) && !item.question) return { prompt: item.hint ?? item.id ?? "", answer: item.correct.join(" ") };
  const prompt = item.prompt ?? item.term ?? item.q ?? item.question ?? item.statement ?? item.text ?? "";
  let answer = item.answer ?? item.a ?? item.correct ?? "";
  if (typeof answer === "number" && Array.isArray(item.options)) {
    const o = item.options[answer];
    answer = typeof o === "object" ? o?.text ?? o?.name ?? answer : o ?? answer;
  }
  return { prompt, answer };
}

/** fingerprint() of a data item. */
export const itemFingerprint = (item) => {
  const { prompt, answer } = promptAnswer(item);
  return fingerprint(prompt, answer);
};

/**
 * The answerable items of one grammar exercise (src/data/grammatik/*.json, telc
 * Sprachbausteine), in the engine's own keys:
 *   [{ key, part, prompt, answer, options? }]
 * `key` is what grammarWorkspace.js uses internally (0-based index, blank number, or the
 * build sentence id); `part` is the ref segment (1-based, or the build id).
 * A story/wordbank/mcgap blank's prompt is the text around the gap ("… vor ___ nach …").
 */
export function grammarItems(ex) {
  if (!ex || typeof ex !== "object") return [];
  const n = (i) => String(i + 1);
  const around = (segs, blank) => {
    const i = segs.findIndex((s) => s.blank === blank);
    const before = segs.slice(0, i).filter((s) => s.text !== undefined).map((s) => s.text).join("").slice(-60);
    const after = segs.slice(i + 1).filter((s) => s.text !== undefined).map((s) => s.text).join("").slice(0, 60);
    return text(`${before}___${after}`);
  };
  switch (ex.type) {
    case "fill":
      return (ex.items ?? []).map((it, i) => ({ key: i, part: n(i), prompt: it.prompt + (it.hint ? ` (${it.hint})` : ""), answer: it.answer }));
    case "table":
      return (ex.rows ?? []).map((r, i) => ({ key: i, part: n(i), prompt: unmark(r.term), answer: r.answer, options: r.choices }));
    case "match":
      return (ex.pairs ?? []).map((p, i) => ({ key: i, part: n(i), prompt: unmark(p.q), answer: unmark(p.a) }));
    case "build":
      return (ex.sentences ?? []).map((s) => ({ key: s.id, part: String(s.id), prompt: s.hint ?? "", answer: (s.correct ?? []).join(" ") }));
    case "story":
      return (ex.segments ?? []).filter((s) => s.blank !== undefined).map((s) => ({ key: s.blank, part: n(s.blank), prompt: around(ex.segments, s.blank), answer: s.answer }));
    case "wordbank":
      return (ex.segments ?? []).filter((s) => s.blank !== undefined).map((s) => ({ key: s.blank, part: n(s.blank), prompt: around(ex.segments, s.blank), answer: `${s.answer}) ${ex.letters?.[s.answer] ?? ""}` }));
    case "mcgap":
      return (ex.items ?? []).map((it, i) => ({ key: i, part: n(i), prompt: around(ex.segments ?? [], i), answer: it.options?.[it.correct] ?? "", options: it.options }));
    case "zimmer":
      return zimmerItems(ex);
    default:
      return [];
  }
}

/** fingerprint() of a whole grammar exercise: title + every answer. */
export function exerciseFingerprint(ex) {
  return fingerprint(ex?.title ?? "", grammarItems(ex).map((it) => text(it.answer)).join(SEP));
}
