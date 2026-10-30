// Writes src/data/haeufigste-woerter.json: the 30 most frequent English word forms and how
// much of all running text the top 10 / 100 / 1 000 cover. The grammar books open with this
// as a chart: the most frequent words of English are almost all grammar words, which is the
// best argument there is for learning the grammar chapters first.
//   node scripts/attach-ranks.mjs a1   # once: downloads node_modules/.cache/en_50k.txt
//   node scripts/haeufigste-woerter.mjs
//
// Source: OpenSubtitles 2018 English (hermitdave/FrequencyWords, MIT), a lowercased WORDFORM
// list of spoken film English. Written once and committed, because the list lives in
// node_modules/.cache, which a build does not have.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "node_modules", ".cache", "en_50k.txt");
const OUT = path.join(ROOT, "src", "data", "haeufigste-woerter.json");

if (!existsSync(CACHE)) {
  console.error("Frequency list missing. Run `node scripts/attach-ranks.mjs a1` once to download it.");
  process.exit(1);
}

const rows = readFileSync(CACHE, "utf8").split("\n").map((l) => l.split(" ")).filter(([w, n]) => w && n).map(([w, n]) => [w, Number(n)]);
const total = rows.reduce((s, [, n]) => s + n, 0);
const share = (k) => Math.round((rows.slice(0, k).reduce((s, [, n]) => s + n, 0) / total) * 1000) / 10;

// Which kind of grammar word each one is (the group names are the chart's keys). A word no
// group covers (so, here, yes) gets no group and draws grey.
const GROUP = {
  i: "pronomen", you: "pronomen", it: "pronomen", me: "pronomen", we: "pronomen", he: "pronomen",
  she: "pronomen", they: "pronomen", my: "pronomen", your: "pronomen", him: "pronomen", her: "pronomen",
  this: "pronomen", that: "pronomen",
  the: "artikel", a: "artikel", an: "artikel",
  is: "verb", be: "verb", have: "verb", do: "verb", are: "verb", was: "verb", "'s": "verb", can: "verb", will: "verb", know: "verb", get: "verb", go: "verb",
  not: "negation", no: "negation", "don't": "negation", "n't": "negation",
  what: "frage", how: "frage", who: "frage", where: "frage", why: "frage",
  to: "praeposition", of: "praeposition", in: "praeposition", for: "praeposition", on: "praeposition", with: "praeposition", at: "praeposition",
  and: "konnektor", but: "konnektor", or: "konnektor", if: "konnektor",
};

const out = {
  source: "OpenSubtitles 2018 (hermitdave/FrequencyWords, MIT): word forms, spoken English",
  coverage: { 10: share(10), 100: share(100), 1000: share(1000) },
  top: rows.slice(0, 30).map(([word, count]) => ({ word, count, group: GROUP[word] ?? null })),
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`${OUT}: top ${out.top.length}, coverage`, out.coverage);
