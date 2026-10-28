// How much of each surface exists in each language, against German. `pnpm lang:coverage`.
//
// Prints a language × surface table and writes docs/lang-coverage.json, which
// src/lib/languages.js reads: a surface with a gate there (GATES, e.g. ui 98 %) only offers a
// language whose number in that file reaches it. Run it after every batch of translations
// and commit the JSON with them; the build does not run it.
//
// What a "key" is per surface:
//   ui            keys of public/i18n/<code>.json that de.json has, with a non-empty value
//   cards, sheets lexicon words (all levels) with a gloss in that language — inline in the
//                 lexicon, or in its sidecar src/content/lexicon/i18n/<code>.json for the
//                 languages whose glosses are fetched on demand (src/lib/glossen.js)
//   help, legal   translation blocks in src/data/uebersetzungen/*.json: every object that
//                 carries at least one language code of the registry as a key
//   berufe        the decks' own words (not refs) with a translation
//   fuehrerschein Fahrschul-Wortschatz words + blocks of uebersetzungen/fuehrerschein.json
// German is the source, so it is 100 % wherever it is registered.
//
// `--check` exits 1 when a language registered on a gated surface is below the gate.
import fs from "node:fs";
import path from "node:path";
import { LANGUAGE_REGISTRY, SURFACES, GATES } from "../src/lib/languages.js";
import { all } from "../src/lib/lexicon.js";

const ROOT = process.cwd();
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), "utf8"));
const CODES = LANGUAGE_REGISTRY.map((l) => l.code).filter((c) => c !== "de");
const filled = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);

/** Every object in a JSON tree that carries a translation: one with a language code key. */
function blocks(node, out = []) {
  if (Array.isArray(node)) for (const v of node) blocks(v, out);
  else if (node && typeof node === "object") {
    if (CODES.some((c) => c in node)) out.push(node);
    else for (const v of Object.values(node)) blocks(v, out);
  }
  return out;
}

const HELP_FILES = ["grammatik", "grammatik-ui", "grammatik-themen", "hoeren", "kultur", "leben-in-deutschland", "lesen", "schreiben", "sprechen"];
const helpBlocks = Object.fromEntries(HELP_FILES.map((f) => [f, blocks(readJson("src", "data", "uebersetzungen", `${f}.json`))]));
const legalBlocks = blocks(readJson("src", "data", "uebersetzungen", "rechtliches.json"));

const uiBase = Object.keys(readJson("public", "i18n", "de.json"));
const lexicon = all();
const berufeWords = fs
  .readdirSync(path.join(ROOT, "src", "data", "berufe"))
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => readJson("src", "data", "berufe", f).groups.flatMap((g) => g.words ?? []))
  .filter((w) => !w.ref);
const fsWords = readJson("src", "data", "fuehrerschein", "wortschatz.json").groups.flatMap((g) => g.words);
const fsBlocks = blocks(readJson("src", "data", "uebersetzungen", "fuehrerschein.json"));

/** The sidecar of a fetched flashcard language (lexicon.js does not join those). */
function sidecar(code) {
  const file = path.join(ROOT, "src", "content", "lexicon", "i18n", `${code}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

function uiCount(code) {
  const file = path.join(ROOT, "public", "i18n", `${code}.json`);
  if (!fs.existsSync(file)) return 0;
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  return uiBase.filter((k) => filled(dict[k])).length;
}

/** [have, total] per surface for one language. */
function measure(code) {
  const isDe = code === "de";
  const inBlocks = (list) => [isDe ? list.length : list.filter((b) => filled(b[code])).length, list.length];
  const allHelp = Object.values(helpBlocks).flat();
  const side = isDe ? {} : sidecar(code);
  const lex = [isDe ? lexicon.length : lexicon.filter((e) => filled(e[code]) || filled(side[e.id])).length, lexicon.length];
  return {
    ui: [isDe ? uiBase.length : uiCount(code), uiBase.length],
    cards: lex,
    help: inBlocks(allHelp),
    legal: inBlocks(legalBlocks),
    sheets: lex,
    berufe: [isDe ? berufeWords.length : berufeWords.filter((w) => filled(w.translations?.[code])).length, berufeWords.length],
    fuehrerschein: (() => {
      const words = isDe ? fsWords.length : fsWords.filter((w) => filled(w.translations?.[code])).length;
      const [b, bt] = inBlocks(fsBlocks);
      return [words + b, fsWords.length + bt];
    })(),
  };
}

const pct = ([have, total]) => (total ? Math.floor((have / total) * 1000) / 10 : 0);

const langs = {};
const detail = {};
for (const l of LANGUAGE_REGISTRY) {
  const m = measure(l.code);
  langs[l.code] = Object.fromEntries(SURFACES.map((s) => [s, pct(m[s])]));
  detail[l.code] = m;
}

// The table: registered surfaces plain, unregistered ones in brackets, below-gate ones marked.
const failures = [];
const cell = (l, s) => {
  const p = langs[l.code][s];
  const reg = !!l.surfaces[s];
  const gate = GATES[s];
  const low = reg && gate != null && l.code !== "de" && p < gate;
  if (low) failures.push(`${l.code} ${s}: ${p} % < ${gate} %`);
  const txt = `${p.toFixed(1)}${low ? "!" : ""}`;
  return reg ? txt : `(${txt})`;
};
const W = 14;
console.log(["lang".padEnd(6), ...SURFACES.map((s) => s.padStart(W))].join(""));
for (const l of LANGUAGE_REGISTRY) console.log([l.code.padEnd(6), ...SURFACES.map((s) => cell(l, s).padStart(W))].join(""));
console.log(`\n(…) = not registered on that surface · ! = below the gate (${Object.entries(GATES).map(([s, g]) => `${s} ${g} %`).join(", ")})`);

// Help per file — the stand-in for the spec's page rule (100 % of a page's blocks).
console.log("\nhelp per file (blocks with the language / all blocks):");
for (const [f, list] of Object.entries(helpBlocks)) {
  const row = CODES.filter((c) => LANGUAGE_REGISTRY.find((l) => l.code === c).surfaces.help)
    .map((c) => {
      const n = list.filter((b) => filled(b[c])).length;
      return `${c} ${n}/${list.length}${n < list.length ? "!" : ""}`;
    })
    .join("  ");
  console.log(`  ${f.padEnd(22)} ${row}`);
}

const out = {
  _note: "Written by scripts/lang-coverage.mjs (pnpm lang:coverage). % of the German keys/words per language and surface; src/lib/languages.js gates on it. Do not edit by hand.",
  langs,
};
fs.writeFileSync(path.join(ROOT, "docs", "lang-coverage.json"), JSON.stringify(out, null, 2) + "\n");
console.log("\nwrote docs/lang-coverage.json");

if (failures.length) {
  console.log(`\nbelow the gate:\n  ${failures.join("\n  ")}`);
  if (process.argv.includes("--check")) process.exit(1);
}
