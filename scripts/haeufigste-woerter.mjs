// Writes src/data/haeufigste-woerter.json: the 30 most frequent Spanish word forms and how
// much of all running text the top 10 / 100 / 1 000 cover. The grammar books open with this
// as a chart: the most frequent words of Spanish are almost all grammar words, which is the
// best argument there is for learning the grammar chapters first.
//   node scripts/attach-ranks.mjs a1   # once: downloads node_modules/.cache/es_50k.txt
//   node scripts/haeufigste-woerter.mjs
//
// Source: OpenSubtitles 2018 Spanish (hermitdave/FrequencyWords; licence to verify), a lowercased
// WORDFORM list of spoken film Spanish, Spain and Latin America mixed. Written once and committed, because the list lives in
// node_modules/.cache, which a build does not have.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "node_modules", ".cache", "es_50k.txt");
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
  yo: "pronomen", tú: "pronomen", tu: "pronomen", te: "pronomen", me: "pronomen", se: "pronomen", lo: "pronomen", le: "pronomen",
  él: "pronomen", ella: "pronomen", mi: "pronomen", su: "pronomen", nos: "pronomen", eso: "pronomen", esto: "pronomen",
  el: "artikel", la: "artikel", los: "artikel", las: "artikel", un: "artikel", una: "artikel", al: "artikel", del: "artikel",
  es: "verb", está: "verb", estoy: "verb", soy: "verb", ha: "verb", he: "verb", hay: "verb", son: "verb", voy: "verb", tengo: "verb",
  no: "negation", ni: "negation",
  qué: "frage", cómo: "frage", quién: "frage", dónde: "frage", cuándo: "frage",
  de: "praeposition", a: "praeposition", en: "praeposition", por: "praeposition", para: "praeposition", con: "praeposition", sin: "praeposition",
  y: "konnektor", o: "konnektor", pero: "konnektor", que: "konnektor", si: "konnektor", porque: "konnektor",
};

const out = {
  source: "OpenSubtitles 2018 (hermitdave/FrequencyWords; licence to verify): word forms, spoken Spanish",
  coverage: { 10: share(10), 100: share(100), 1000: share(1000) },
  top: rows.slice(0, 30).map(([word, count]) => ({ word, count, group: GROUP[word] ?? null })),
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`${OUT}: top ${out.top.length}, coverage`, out.coverage);
