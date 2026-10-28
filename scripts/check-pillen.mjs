// Hunts for pill exercises where the check says something wrong about a right answer, or
// something right about a wrong one. Covers fill, table and story in src/data/grammatik.
//
//   node scripts/check-pillen.mjs          report, exit 1 on errors
//   node scripts/check-pillen.mjs --json   the same as JSON
//
// Two kinds of finding:
//
//   FEHLER   doppelt-richtig — a pill that is not the answer, but the answer check
//            (src/lib/answerMatch.js, the same code the page runs) counts it as right.
//            On /possessivartikel „ihr“ and „Ihr“ were both marked right for both rows.
//            doppelte-pille — two pills on one item the check cannot tell apart
//            („Als“ and „als“): one of them is always a second right answer.
//
//   PRÜFEN   plural-gleich — the blank sits before a der/das noun whose plural looks the
//            same (Schlüssel, Lehrer, Zimmer, Mädchen). „Ich suche ___ Schlüssel“ takes
//            „meinen“ (one key) and „meine“ (several), so a pill the check marks wrong is
//            right too. Needs a person: give the answer both forms, or change the noun.
import fs from "node:fs";
import path from "node:path";
import { accepts, normalize, distinctOptions } from "../src/lib/answerMatch.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const DIR = process.env.PILLEN_DIR ?? path.join(ROOT, "src/data/grammatik"); // PILLEN_DIR: test data
const LEX = ["a1", "a2", "b1", "b2", "c1", "c2"].flatMap((l) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, `src/content/lexicon/${l}.json`), "utf8")).units.flatMap((u) => u.words));

// Same limits as the page (src/lib/grammarWorkspace.js): above them each item gets its own
// short multiple choice, built to leave out anything `accepts` would also take.
const INLINE_MAX = 8;
const STORY_ROW_OPTIONS = 5;

const list = (a) => (Array.isArray(a) ? a : [a]).map(String);
const optionSet = (ex, answers) => distinctOptions(Array.isArray(ex.choices) && ex.choices.length
  ? ex.choices
  : answers.map((a) => (Array.isArray(a) ? a[0] : a)).filter((a) => a != null && String(a).trim() !== "").map(String));

// Nouns whose plural is spelled like the singular. The lexicon decides where it knows
// the word; -chen and -lein always qualify; -er, -el, -en usually do (Vater → Väter does
// not), so those are only a guess and say so.
const lexNoun = new Map(LEX.filter((w) => w.pos === "noun").map((w) => [w.lemma, w]));
function samePlural(noun, article) {
  const w = lexNoun.get(noun);
  if (w) return w.gender !== "die" && w.plural === w.lemma ? "lexikon" : null;
  // Not in the lexicon: only trust the ending when the hint names it as der/das, so a
  // plural like „Kinder“ in the sentence is not mistaken for a singular.
  if (article !== "der" && article !== "das") return null;
  if (/(chen|lein)$/.test(noun)) return "endung";
  if (/(er|el|en)$/.test(noun)) return "vermutlich";
  return null;
}
// Only gaps that hold the word in front of the noun (article, possessive, kein-, dies-),
// where singular and plural really take different forms.
const DETERMINER = /^(k?ein|mein|dein|sein|ihr|unser|eue?r|dies|jed|welch|manch|all|der|die|das|den|dem|des)[a-z]*$/i;
// The noun a blank stands before: „der Schlüssel“ in the hint, or the capitalised word
// right after the gap in the sentence.
function nounOf(item, sentence) {
  const fromHint = String(item.hint ?? item.term ?? "").match(/\b(der|das|die)\s+([A-ZÄÖÜ][a-zäöüß]+)/);
  if (fromHint) return { article: fromHint[1], noun: fromHint[2] };
  const after = String(sentence ?? "").match(/_{2,}\s+([A-ZÄÖÜ][a-zäöüß]+)/);
  return after ? { article: null, noun: after[1] } : null;
}
// A pill shares the answer's stem but has a different ending (meinen / meine): that is
// the pill a plural reading would make right.
const stem = (w) => normalize(w).slice(0, Math.max(3, normalize(w).length - 2));
const kin = (a, o) => normalize(o).startsWith(stem(a)) || normalize(a).startsWith(stem(o));
const pluralRivals = (answer, options) =>
  options.filter((o) => !list(answer).includes(o) && !accepts(answer, o) && list(answer).some((a) => kin(a, o)));

const findings = [];
const add = (kind, level, file, ex, ei, where, text, msg) =>
  findings.push({ kind, level, file, exercise: ei + 1, title: ex.title ?? "", where, text, msg });

function checkItem(file, ex, ei, where, text, answer, options, item) {
  // The same word in another case („wie“ for „Wie“ at a sentence start) is the answer;
  // anything else the check takes (ß/ss, ä/ae, ihr/Ihr) is a second right pill.
  const sameWord = (o) => list(answer).some((a) => a.toLowerCase() === o.toLowerCase());
  for (const o of options) {
    if (!list(answer).includes(o) && !sameWord(o) && accepts(answer, o)) {
      add("doppelt-richtig", "FEHLER", file, ex, ei, where, text,
        `Pille „${o}“ wird als richtig gewertet, Antwort ist „${list(answer).join(" / ")}“`);
    }
  }
  const twins = options.filter((o, i) => options.some((p, j) => j !== i && p !== o && accepts(p, o)));
  if (twins.length) {
    add("doppelte-pille", "FEHLER", file, ex, ei, where, text,
      `Pillen, die die Prüfung nicht unterscheidet: „${twins.join("“, „")}“`);
  }
  if (!list(answer).every((a) => DETERMINER.test(a))) return;
  // Already settled: the hint says singular („der Schlüssel (Sg.)“), or the verb does („Er ist ___ Lehrer“).
  if (/\b(Sg\.|Singular)/.test(String(item.hint ?? "")) || /\bist\s+_{2,}/.test(String(text))) return;
  const n = nounOf(item, text);
  if (!n) return;
  const why = samePlural(n.noun, n.article);
  if (!why) return;
  const rivals = pluralRivals(answer, options);
  if (rivals.length) {
    add("plural-gleich", "PRÜFEN", file, ex, ei, where, text,
      `„${n.noun}“ hat den gleichen Plural (${why}): auch „${rivals.join("“, „")}“ könnte richtig sein, Antwort ist nur „${list(answer).join(" / ")}“`);
  }
}

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".json")).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  (data.exercises ?? []).forEach((ex, ei) => {
    if (ex.type === "fill" || ex.type === "table") {
      const items = ex.type === "fill" ? ex.items : ex.rows;
      if (!Array.isArray(items)) return; // paid placeholder: only `slots`, no content here
      const pool = optionSet(ex, items.map((it) => it.answer));
      items.forEach((it, i) => {
        const own = Array.isArray(it.choices) && it.choices.length ? it.choices.map(String) : null;
        const options = own ?? (pool.length > INLINE_MAX ? [] : pool);
        checkItem(f, ex, ei, `${ex.type === "fill" ? "Satz" : "Zeile"} ${i + 1}`, it.prompt ?? it.term, it.answer, options, it);
      });
    } else if (ex.type === "story" && Array.isArray(ex.segments)) {
      const blanks = ex.segments.filter((s) => s.blank !== undefined);
      const pool = optionSet(ex, blanks.map((b) => b.answer));
      const options = pool.length <= STORY_ROW_OPTIONS ? pool : [];
      ex.segments.forEach((s, si) => {
        if (s.blank === undefined) return;
        const before = ex.segments[si - 1]?.text ?? "";
        const after = ex.segments[si + 1]?.text ?? "";
        checkItem(f, ex, ei, `Lücke ${s.blank + 1}`, `${before.slice(-40)}___${after.slice(0, 40)}`, s.answer, options, {});
      });
    }
  });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  const errors = findings.filter((x) => x.level === "FEHLER");
  for (const x of findings) {
    console.log(`${x.level.padEnd(7)} ${x.file} · Übung ${x.exercise} „${x.title}“ · ${x.where}\n        ${String(x.text).trim()}\n        → ${x.msg}`);
  }
  console.log(`\n${errors.length} Fehler, ${findings.length - errors.length} zum Prüfen.`);
}
process.exitCode = findings.some((x) => x.level === "FEHLER") ? 1 : 0;
