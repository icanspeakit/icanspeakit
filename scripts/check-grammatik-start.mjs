// Checks the translations of „English Grammar Start A1–B1“ (src/data/grammatik-start/<code>.json)
// against the English original (en.json): every explaining block is there, nothing is empty,
// and nothing is still English.
//
//   node scripts/check-grammatik-start.mjs            every translation file
//   node scripts/check-grammatik-start.mjs de         some
//   node scripts/check-grammatik-start.mjs --skeleton ro   writes ro.json with the English
//                                                          text in every slot, to translate
//
// What gets translated (the book rule): the explaining blocks — intro, why, h, rule, merke,
// mistake — plus chapter titles, mascot bubbles, the UI strings, table headings that
// describe (not the English forms: be, work, can, will + verb …), the columns a table
// lists in `explain`, and the titles of example lists and tables. Examples, word lists,
// table contents, exercises and solutions stay English: English is the subject.
// Words in *stars* are English examples inside an explanation and stay English.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src", "data", "grammatik-start");
export const BASE = "en";
const base = JSON.parse(readFileSync(path.join(dir, `${BASE}.json`), "utf8"));

// Every translation on disk. A language is only added once its explanations can be trusted
// (docs/content-plan.md §1.4): fewer editions beat wrong ones.
export const LANGS = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).filter((c) => c !== BASE).sort();

// Table headings that are English forms the book teaches: kept.
export const KEEP_HEAD = new Set([
  "be", "work", "live", "go", "can", "should", "have to", "verb-ing",
  "if + present simple", "will + verb", "if + past simple", "would + verb",
]);

/** The slots a translation has to fill, from the English: id → { field: English }. */
export function units() {
  const u = { ui: { ...base.ui }, chapters: {}, blocks: {} };
  // English has none; each translation says it is a draft until a teacher has read it.
  u.ui.draft = "The explanations in this language are a draft and have not yet been checked by a teacher.";
  for (const c of base.chapters) {
    u.chapters[c.id] = { title: c.titleDe, bubble: c.bubble };
    for (const b of c.blocks) {
      const slot = {};
      if (["intro", "why", "h", "rule", "merke", "mistake"].includes(b.type)) slot.text = b.text;
      if (b.title && b.type !== "exercise") slot.title = b.title;
      if (b.type === "table") {
        if (b.head.some((h) => !KEEP_HEAD.has(h))) slot.head = b.head.map((h) => (KEEP_HEAD.has(h) ? null : h));
        if (b.explain?.length) slot.cells = b.rows.map((r) => b.explain.map((i) => r[i]));
      }
      if (Object.keys(slot).length) u.blocks[b.id] = slot;
    }
  }
  return u;
}

// English words that are not words in the help languages: three of them outside *stars*,
// quotes and brackets in one text means it was not translated.
const ENGLISH = /\b(the|and|is|are|not|with|you|this|they|when|use|after|before|verb|always|only)\b/gi;
const strip = (s) => String(s).replace(/\*[^*]*\*/g, " ").replace(/[„"«“][^“"»”]*[“"»”]/g, " ").replace(/\([^)]*\)/g, " ");

function check(code) {
  const file = path.join(dir, `${code}.json`);
  if (!existsSync(file)) return [`${code}.json missing`];
  const tr = JSON.parse(readFileSync(file, "utf8"));
  const want = units();
  const errs = [];
  const text = (where, got, eng) => {
    if (typeof got !== "string" || !got.trim()) { errs.push(`${where}: empty`); return; }
    const hits = strip(got).match(ENGLISH) ?? [];
    if (hits.length >= 3) errs.push(`${where}: still English? (${hits.slice(0, 4).join(", ")})`);
    else if (eng && got.trim() === eng.trim() && eng.split(" ").length > 2) errs.push(`${where}: unchanged English`);
    // English examples in stars must survive the translation.
    const stars = (eng?.match(/\*[^*]+\*/g) ?? []).length;
    if (stars && (got.match(/\*[^*]+\*/g) ?? []).length < Math.min(stars, 1)) errs.push(`${where}: *example words* missing`);
  };
  if (!["draft", "reviewed"].includes(tr.status)) errs.push(`status: "draft" or "reviewed" missing`);
  if (tr.lang !== code) errs.push(`lang: "${code}" missing`);
  for (const [k, v] of Object.entries(want.ui)) {
    if (k === "draft" && tr.status === "reviewed") continue;
    text(`ui.${k}`, tr.ui?.[k], v);
    for (const ph of v.match(/\{\w+\}/g) ?? []) if (!tr.ui?.[k]?.includes(ph)) errs.push(`ui.${k}: placeholder ${ph} missing`);
  }
  for (const [id, v] of Object.entries(want.chapters)) {
    text(`${id}.title`, tr.chapters?.[id]?.title, v.title);
    text(`${id}.bubble`, tr.chapters?.[id]?.bubble, v.bubble);
  }
  for (const [id, slot] of Object.entries(want.blocks)) {
    const got = tr.blocks?.[id];
    if (!got) { errs.push(`${id}: missing`); continue; }
    if (slot.text != null) text(`${id}.text`, got.text, slot.text);
    if (slot.title != null) text(`${id}.title`, got.title, slot.title);
    if (slot.head) {
      if (!Array.isArray(got.head) || got.head.length !== slot.head.length) errs.push(`${id}.head: ${slot.head.length} columns expected`);
      else slot.head.forEach((h, i) => { if (h != null && !String(got.head[i] ?? "").trim()) errs.push(`${id}.head[${i}]: empty`); });
    }
    if (slot.cells) {
      if (!Array.isArray(got.cells) || got.cells.length !== slot.cells.length) errs.push(`${id}.cells: ${slot.cells.length} rows expected`);
      else slot.cells.forEach((r, ri) => r.forEach((c, ci) => { if (!String(got.cells[ri]?.[ci] ?? "").trim()) errs.push(`${id}.cells[${ri}][${ci}]: empty`); }));
    }
  }
  for (const id of Object.keys(tr.blocks ?? {})) if (!want.blocks[id]) errs.push(`${id}: not in the English book`);
  return errs;
}

const args = process.argv.slice(2);
if (args[0] === "--skeleton") {
  const code = args[1];
  const u = units();
  const out = { lang: code, status: "draft", ...u };
  writeFileSync(path.join(dir, `${code}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`src/data/grammatik-start/${code}.json written (English placeholders)`);
} else if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let bad = 0;
  for (const code of args.length ? args : LANGS) {
    const errs = check(code);
    if (errs.length) { bad++; console.log(`✗ ${code}: ${errs.length} problems`); errs.slice(0, 40).forEach((e) => console.log(`   ${e}`)); }
    else console.log(`✓ ${code}`);
  }
  process.exit(bad ? 1 : 0);
}
