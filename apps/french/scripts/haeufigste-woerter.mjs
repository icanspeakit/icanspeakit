// Writes src/data/haeufigste-woerter.json: the 30 most frequent French word forms and how
// much of all running text the top 10 / 100 / 1 000 cover. The grammar books open with this
// as a chart: the most frequent words of French are almost all grammar words, which is the
// best argument there is for learning the grammar chapters first.
//   node scripts/attach-ranks.mjs a1   # once: downloads node_modules/.cache/fr_50k.txt
//   node scripts/haeufigste-woerter.mjs
//
// Source: OpenSubtitles 2018 French (hermitdave/FrequencyWords; licence to verify), a lowercased
// WORDFORM list of spoken film French, France and Canada mixed (elided forms appear as j, l, c, n, d, qu). Written once and committed, because the list lives in
// node_modules/.cache, which a build does not have.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "node_modules", ".cache", "fr_50k.txt");
const OUT = path.join(ROOT, "src", "data", "haeufigste-woerter.json");

if (!existsSync(CACHE)) {
  console.error("Frequency list missing. Run `node scripts/attach-ranks.mjs a1` once to download it.");
  process.exit(1);
}

const rows = readFileSync(CACHE, "utf8").split("\n").map((l) => l.split(" ")).filter(([w, n]) => w && n).map(([w, n]) => [w, Number(n)]);
const total = rows.reduce((s, [, n]) => s + n, 0);
const share = (k) => Math.round((rows.slice(0, k).reduce((s, [, n]) => s + n, 0) / total) * 1000) / 10;

// Which kind of grammar word each one is (the group names are the chart's keys). A word no
// group covers (bien, oui, là) gets no group and draws grey.
const GROUP = {
  je: "pronomen", j: "pronomen", tu: "pronomen", il: "pronomen", elle: "pronomen", on: "pronomen", nous: "pronomen", vous: "pronomen",
  ils: "pronomen", me: "pronomen", te: "pronomen", se: "pronomen", moi: "pronomen", toi: "pronomen", lui: "pronomen", ça: "pronomen",
  ce: "pronomen", c: "pronomen", mon: "pronomen", ma: "pronomen", ton: "pronomen", y: "pronomen", en: "pronomen",
  le: "artikel", la: "artikel", les: "artikel", l: "artikel", un: "artikel", une: "artikel", des: "artikel", du: "artikel", au: "artikel",
  est: "verb", suis: "verb", es: "verb", ai: "verb", a: "verb", as: "verb", va: "verb", vais: "verb", fait: "verb", sais: "verb", peux: "verb", veux: "verb",
  ne: "negation", pas: "negation", n: "negation", non: "negation", rien: "negation", jamais: "negation",
  qui: "frage", quoi: "frage", où: "frage", comment: "frage", pourquoi: "frage", quand: "frage",
  de: "praeposition", à: "praeposition", d: "praeposition", dans: "praeposition", pour: "praeposition", avec: "praeposition", sur: "praeposition", par: "praeposition",
  et: "konnektor", ou: "konnektor", mais: "konnektor", que: "konnektor", qu: "konnektor", si: "konnektor", parce: "konnektor",
};

const out = {
  source: "OpenSubtitles 2018 (hermitdave/FrequencyWords; licence to verify): word forms, spoken French",
  coverage: { 10: share(10), 100: share(100), 1000: share(1000) },
  top: rows.slice(0, 30).map(([word, count]) => ({ word, count, group: GROUP[word] ?? null })),
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`${OUT}: top ${out.top.length}, coverage`, out.coverage);
