// Re-attaches corpus frequency ranks to src/content/lexicon/*.json in place.
//   node scripts/attach-ranks.mjs            # all levels
//   node scripts/attach-ranks.mjs a1 a2      # just these
//
// `rank` drives level banding and within-unit ordering and is never hand-typed — run this
// after adding words, then `node scripts/validate-lexicon.mjs`.
//
// Source: OpenSubtitles 2018 lists (hermitdave/FrequencyWords, MIT; data from the OPUS
// OpenSubtitles corpus): the English list for levels already migrated to English (their nouns
// carry a / an / some, docs/content-plan.md §1.4), the German list for the levels still in
// German. It is a WORDFORM list, so a lemma only matches when its citation form happens to
// appear — multi-word phrases ("get up", "bus stop") and rarer compounds stay null, which is
// correct: a missing rank is honest, a guessed one is not.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const FREQ_URL = (lang) => `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${lang}/${lang}_50k.txt`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CACHE = (lang) => path.join(ROOT, "node_modules", ".cache", `${lang}_50k.txt`);

const levels = process.argv.slice(2).length
  ? process.argv.slice(2).map((l) => l.toLowerCase())
  : ["a1", "a2", "b1", "b2", "c1", "c2"];

const lists = new Map();
async function frequencyList(lang) {
  if (lists.has(lang)) return lists.get(lang);
  const cache = CACHE(lang);
  if (!existsSync(cache)) {
    console.log(`Downloading ${FREQ_URL(lang)} …`);
    const res = await fetch(FREQ_URL(lang));
    if (!res.ok) throw new Error(`Frequency list download failed: ${res.status} ${res.statusText}`);
    mkdirSync(path.dirname(cache), { recursive: true });
    writeFileSync(cache, await res.text(), "utf8");
  }
  const map = new Map();
  readFileSync(cache, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const word = line.split(" ")[0];
      if (word && !map.has(word)) map.set(word, i + 1);
    });
  lists.set(lang, map);
  return map;
}

/** English once the level's nouns use the English article values. */
const langOf = (data) =>
  (data.units ?? []).some((u) => (u.words ?? []).some((w) => ["a", "an", "some"].includes(w.gender))) ? "en" : "de";

for (const level of levels) {
  const file = path.join(ROOT, "src/content/lexicon", `${level}.json`);
  if (!existsSync(file)) {
    console.warn(`skip ${level}: no such file`);
    continue;
  }
  const data = JSON.parse(readFileSync(file, "utf8"));
  const lang = langOf(data);

  let total = 0;
  let ranked = 0;
  for (const unit of data.units ?? []) {
    for (const word of unit.words ?? []) total++;
  }
  if (!total) {
    console.log(`${level}: empty, nothing to rank`);
    continue;
  }

  const freq = await frequencyList(lang);
  for (const unit of data.units ?? []) {
    for (const word of unit.words ?? []) {
      word.rank = freq.get(word.lemma.toLowerCase()) ?? null;
      if (word.rank) ranked++;
    }
  }
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`${level} (${lang}): ${ranked}/${total} ranked (${Math.round((ranked / total) * 100)}%)`);
}
