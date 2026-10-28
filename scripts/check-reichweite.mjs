// Checks the translations of the entry-page languages (SPRACHEN-REICHWEITE-TIERED-PROMPT.md):
// es, pt, vi, hi, id — every registry language with a `urlPrefix`. Runs after
// validate-i18n.mjs in `pnpm validate:i18n`.
//
// Against the source of each text — de.json for the interface, the English text of a block
// in src/data/uebersetzungen/*.json for the help texts (the blocks carry no German) — it
// checks what a machine draft most often breaks:
//   • placeholders {x} — the same set
//   • **bold** — the same number of markers
//   • HTML tags (<strong>, <em> …) — the same tags, in any order
//   • German in „…" — a key or block whose source quotes German must quote the same German:
//     the words being taught are never translated
//   • no empty strings
//   • direction: these languages are left-to-right, so no Arabic or Hebrew letters
// A language without public/i18n/<code>.json yet is skipped for the interface; a block
// without the language is skipped for the help texts (coverage is lang-coverage.mjs's job).
import fs from "node:fs";
import path from "node:path";
import { entryLanguages } from "../src/lib/languages.js";

const ROOT = process.cwd();
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), "utf8"));
const LANGS = entryLanguages();
const problems = [];

const tokens = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const bolds = (s) => (String(s).match(/\*\*/g) ?? []).length;
const tags = (s) => [...String(s).matchAll(/<\/?([a-z][a-z0-9]*)\b/gi)].map((m) => m[0].toLowerCase()).sort().join(",");
const quoted = (s) => [...String(s).matchAll(/„([^“]+)“/g)].map((m) => m[1]);
const UI_LABELS = new Set(Object.values(readJson("public", "i18n", "de.json")).filter((v) => typeof v === "string" && v.length <= 40).map((v) => v.trim()));
const RTL =/[֐-ࣿיִ-﷿ﹰ-﻿]/;

function compare(where, src, out, code) {
  if (typeof out !== "string") return;
  if (!out.trim()) { problems.push(`${where}: empty`); return; }
  if (tokens(src) !== tokens(out)) problems.push(`${where}: placeholders {${tokens(src)}} → {${tokens(out)}}`);
  if (bolds(src) !== bolds(out)) problems.push(`${where}: **bold** markers ${bolds(src)} → ${bolds(out)}`);
  if (tags(src) !== tags(out)) problems.push(`${where}: HTML tags differ (${tags(src)} → ${tags(out)})`);
  for (const q of quoted(src)) {
    // Only German in quotes counts: a source quoting its own (English) words may translate them.
    if (!/[äöüßÄÖÜ]|\b(der|die|das|ich|ist|nicht|und|ein|eine)\b/.test(q)) continue;
    // A quoted button or tab name („Hören 1“, „Stufe wählen“) is interface, not German being
    // taught: it follows the translated label.
    if (UI_LABELS.has(q.trim())) continue;
    if (!out.includes(q)) problems.push(`${where}: German „${q}“ not kept verbatim`);
  }
  if (RTL.test(out)) problems.push(`${where}: right-to-left letters in a ${code} text`);
}

// Interface: public/i18n/<code>.json against de.json.
const de = readJson("public", "i18n", "de.json");
for (const l of LANGS) {
  if (l.dir !== "ltr") problems.push(`${l.code}: registry says dir "${l.dir}", expected ltr`);
  const file = path.join(ROOT, "public", "i18n", `${l.code}.json`);
  if (!fs.existsSync(file)) continue;
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [k, v] of Object.entries(dict)) if (k in de) compare(`ui ${l.code} ${k}`, de[k], v, l.code);
}

// Help texts: every block of src/data/uebersetzungen/*.json against its English.
const codes = LANGS.map((l) => l.code);
function walk(node, where, file) {
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${where}[${i}]`, file));
  else if (node && typeof node === "object") {
    if (typeof node.en === "string" && codes.some((c) => c in node)) {
      for (const c of codes) if (c in node) compare(`help ${c} ${file}${where}`, node.en, node[c], c);
      return;
    }
    for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`, file);
  }
}
const DIR = path.join(ROOT, "src", "data", "uebersetzungen");
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) walk(readJson("src", "data", "uebersetzungen", f), "", f);

if (problems.length) {
  console.error(`reichweite: ${problems.length} problem(s) in ${codes.join(", ")}\n`);
  for (const p of problems.slice(0, 200)) console.error("  " + p);
  if (problems.length > 200) console.error(`  … and ${problems.length - 200} more`);
  process.exit(1);
}
console.log(`reichweite: ${codes.join(", ")} — placeholders, **bold**, tags, quoted German, direction all fine`);
