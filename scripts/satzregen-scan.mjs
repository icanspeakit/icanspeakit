// Regis Satzregen, Tier 0: what sentences do we already have for a word-order game?
//
// Pulls every clean German sentence from the sources that hold whole, checked sentences —
// the lexicon's example sentences (voiced: public/audio/saetze/<satzSlug>.mp3), the grammar
// topics' `build` exercises (src/data/grammatik/*.json) and Lindenau's build/say tasks —
// sorts them by a rough guess into the game's four modes and prints the counts. With --out
// it writes the candidates to a JSON file, the raw material that was then chunked by hand
// into scripts/satzregen/quelle.txt (see scripts/build-satzregen.mjs).
//
//   node scripts/satzregen-scan.mjs                 counts per mode, level and source
//   node scripts/satzregen-scan.mjs --out <file>    + every candidate
//
// The mode guess is a heuristic for the inventory only; nothing it says goes into the game
// unchecked.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { select } from "../src/lib/lexicon.js";
import { satzSlug } from "../src/lib/audioSlug.js";
import { AREAS } from "../src/lib/lindenau/quests.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : null;
const LEVELS = new Set(["A1", "A2", "B1"]);

const W =
  /^(wer|wen|wem|wessen|was|wo|wohin|woher|wann|wie|warum|wieso|weshalb|welche[rnms]?)\b/i;
const SUB =
  /,\s*(weil|dass|wenn|obwohl|ob|als|damit|bevor|nachdem|während|bis|seit|seitdem|falls|sodass)\b/i;
const MODAL =
  /\b(kann|kannst|können|könnt|muss|musst|müssen|müsst|will|willst|wollen|wollt|darf|darfst|dürfen|dürft|soll|sollst|sollen|sollt|möchte|möchtest|möchten|möchtet)\b/i;
const PERFEKT =
  /\b(habe|hast|hat|haben|habt|bin|bist|ist|sind|seid)\b.*\bge\w+(t|en)[.!?]$/i;

function guessMode(text) {
  const t = text.trim();
  if (SUB.test(t)) return "nebensatz";
  if (t.endsWith("?")) return W.test(t) ? "v2" : "janein";
  if (MODAL.test(t) || PERFEKT.test(t)) return "klammer";
  return "v2";
}
const words = (t) => t.split(/\s+/).filter(Boolean).length;

/** Every candidate sentence: { text, level, source, mode, audio? }, first source wins. */
export function collect() {
  const all = [];
  const add = (text, level, source, extra = {}) => {
    text = String(text || "")
      .replace(/\s+([.,!?])/g, "$1")
      .trim();
    if (!text || !LEVELS.has(level)) return;
    if (!/[.?]$/.test(text) || words(text) < 3 || words(text) > 14) return; // one sentence, game-sized
    if ((text.match(/[.?!]/g) || []).length > 1) return; // two sentences
    all.push({ text, level, source, mode: guessMode(text), ...extra });
  };

  // 1. Lexicon example sentences (most of them voiced).
  for (const e of select({ has: "example" })) {
    const slug = satzSlug(e.example);
    const audio = existsSync(
      path.join(ROOT, "public", "audio", "saetze", `${slug}.mp3`),
    )
      ? slug
      : null;
    add(e.example, e.level, `lex:${e.id}`, { audio });
  }

  // 2. Grammar topics: `build` sentences (word tiles in the right order).
  const gdir = path.join(ROOT, "src", "data", "grammatik");
  for (const f of readdirSync(gdir).filter((f) => f.endsWith(".json"))) {
    const j = JSON.parse(readFileSync(path.join(gdir, f), "utf8"));
    for (const ex of j.exercises || []) {
      if (ex.type !== "build") continue;
      for (const s of ex.sentences || [])
        add((s.correct || []).join(" "), j.level, `g:${j.id}/${s.id}`, {
          status: j.status || null,
        });
    }
  }

  // 3. Lindenau's build and say tasks.
  for (const area of AREAS || []) {
    for (const q of area.quests || []) {
      for (const turn of q.dialogue || q.turns || []) {
        const t = turn.task;
        if (t && (t.type === "build" || t.type === "say"))
          add(t.words.join(" "), "A1", `ld:${q.id}`);
      }
    }
  }

  const seen = new Set();
  return all.filter((s) =>
    seen.has(s.text) ? false : (seen.add(s.text), true),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const uniq = collect();

  const table = {};
  for (const s of uniq) {
    const src = s.source.split(":")[0];
    const k = `${s.mode} ${s.level}`;
    table[k] ??= { lex: 0, g: 0, ld: 0, audio: 0 };
    table[k][src]++;
    if (s.audio) table[k].audio++;
  }
  console.log(
    `${uniq.length} candidate sentences (A1–B1, one sentence, 3–14 words)`,
  );
  console.table(Object.fromEntries(Object.entries(table).sort()));
  if (OUT) {
    writeFileSync(OUT, JSON.stringify(uniq, null, 1));
    console.log(`→ ${OUT}`);
  }
}
