// A bridge for the grammar items, until `beginner-path` rewrites src/data/einfach-pfad.json:
//
//   node scripts/repoint-einfach-grammar.mjs nomen artikel plural …
//
// The path's `gram:` tasks name an exercise item by position and checksum, with answer options
// written on the task. When a grammar item replaces a topic with its Spanish version, those
// refs stop resolving and the build fails (scripts/check-einfach-pfad.mjs, the /step-by-step
// page). For each topic named, this points every task at an item of the new topic: `satz` at a
// build sentence, `luecke` at a fill or table item with its own `choices`, the path's own hints
// dropped (they talk about the old item; the resolver falls back to the item's or exercise's
// hint). It writes the checksum itself and leaves every other task line as it is.
//
// It keeps the path valid and the unit's grammar theme right. It does not make the path good:
// that is `beginner-path`, which deletes this script.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checksum } from "../src/lib/einfach-content.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "src/data/einfach-pfad.json");
const topics = new Set(process.argv.slice(2));
if (!topics.size) { console.error("usage: repoint-einfach-grammar.mjs <topic> …"); process.exit(2); }

const list = (a) => [].concat(a).map(String);
const usable = (it) => !it.es419?.skip;
function candidates(topic) {
  const data = JSON.parse(readFileSync(path.join(ROOT, `src/data/grammatik/${topic}.json`), "utf8"));
  const gaps = [];
  const builds = [];
  data.exercises.forEach((ex, e) => {
    if (ex.type === "build") {
      ex.sentences.forEach((s, i) => {
        if (usable(s)) builds.push({ ref: `gram:${topic}/${e}/${i}@${checksum(s.correct.join(" "))}` });
      });
    }
    if (ex.type !== "fill" && ex.type !== "table") return;
    (ex.type === "fill" ? ex.items : ex.rows).forEach((it, i) => {
      const options = it.choices ?? ex.choices;
      if (!usable(it) || !options?.length || options.length > 4) return;
      if (!options.some((o) => list(it.answer).includes(o))) return;
      if (ex.type === "fill" && !it.prompt.includes("___")) return;
      const text = ex.type === "fill" ? `${it.prompt}|${list(it.answer).join("/")}` : `${it.term}|${it.answer}`;
      gaps.push({ ref: `gram:${topic}/${e}/${i}@${checksum(text)}`, options });
    });
  });
  return { gaps, builds, g: 0, b: 0 };
}

const pools = new Map();
let changed = 0;
const out = readFileSync(FILE, "utf8").split("\n").map((line) => {
  const m = /^(\s*)\{\s*"type":\s*"(luecke|satz)",\s*"ref":\s*"gram:([\w-]+)\/.*?\}(,?)\s*$/.exec(line);
  if (!m || !topics.has(m[3])) return line;
  const [, indent, type, topic, comma] = m;
  if (!pools.has(topic)) pools.set(topic, candidates(topic));
  const pool = pools.get(topic);
  if (!pool.gaps.length) throw new Error(`${topic}: no fill or table item with choices to point at`);
  changed++;
  if (type === "satz" && pool.builds.length) {
    const c = pool.builds[pool.b++ % pool.builds.length];
    return `${indent}{ "type": "satz", "ref": ${JSON.stringify(c.ref)} }${comma}`;
  }
  const c = pool.gaps[pool.g++ % pool.gaps.length];
  return `${indent}{ "type": "luecke", "ref": ${JSON.stringify(c.ref)}, "options": ${JSON.stringify(c.options)} }${comma}`;
});
writeFileSync(FILE, out.join("\n"));
console.log(`repointed ${changed} task(s) in ${pools.size} topic(s)`);
