// Writes src/data/haeufigste-woerter.json: the 30 most frequent German word forms and how
// much of all running text the top 10 / 100 / 1 000 cover. The Grammatik books open with
// this as a chart — the most frequent words of German are almost all grammar words, which
// is the best argument there is for learning the grammar chapters first.
//   node scripts/haeufigste-woerter.mjs
//
// Same source and same caveat as scripts/artikel-haeufigkeit.mjs: OpenSubtitles 2018
// (hermitdave/FrequencyWords, MIT), a lowercased WORDFORM list of spoken film German — "die"
// counts article and pronoun alike. Written once and committed, because the list lives in
// node_modules/.cache, which a build does not have.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "node_modules", ".cache", "de_50k.txt");
const OUT = path.join(ROOT, "src", "data", "haeufigste-woerter.json");

if (!existsSync(CACHE)) {
  console.error("Frequency list missing. Run `node scripts/attach-ranks.mjs` once to download it.");
  process.exit(1);
}

const rows = readFileSync(CACHE, "utf8").split("\n").map((l) => l.split(" ")).filter(([w, n]) => w && n).map(([w, n]) => [w, Number(n)]);
const total = rows.reduce((s, [, n]) => s + n, 0);
const share = (k) => Math.round((rows.slice(0, k).reduce((s, [, n]) => s + n, 0) / total) * 1000) / 10;

// Which chapter of the book each word belongs to. A word no chapter covers (so, hier, ja as
// a particle) gets no group and draws grey.
const GROUP = {
  ich: "pronomen", sie: "pronomen", du: "pronomen", es: "pronomen", wir: "pronomen", er: "pronomen",
  mir: "pronomen", mich: "pronomen", dich: "pronomen", ihr: "pronomen",
  das: "artikel", die: "artikel", der: "artikel", ein: "artikel", den: "artikel", eine: "artikel",
  ist: "verb", hat: "verb", haben: "verb", sind: "verb", war: "verb", habe: "verb",
  nicht: "negation", nein: "negation",
  was: "frage", wie: "frage",
  zu: "praeposition", in: "praeposition", mit: "praeposition", auf: "praeposition", "für": "praeposition", von: "praeposition", an: "praeposition",
  und: "konnektor", aber: "konnektor", dass: "konnektor", wenn: "konnektor",
};

const out = {
  source: "OpenSubtitles 2018 (hermitdave/FrequencyWords, MIT) — Wortformen, gesprochenes Deutsch",
  coverage: { 10: share(10), 100: share(100), 1000: share(1000) },
  top: rows.slice(0, 30).map(([word, count]) => ({ word, count, group: GROUP[word] ?? null })),
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`${OUT}: top ${out.top.length}, coverage`, out.coverage);
