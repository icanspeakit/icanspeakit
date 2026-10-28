// Checks the translations of „Grammatik-Start A1–B1“ (src/data/grammatik-start/<code>.json)
// against the German original (de.json): every explaining block is there, nothing is empty,
// and nothing is still German.
//
//   node scripts/check-grammatik-start.mjs            all languages
//   node scripts/check-grammatik-start.mjs tr fa      some
//   node scripts/check-grammatik-start.mjs --skeleton ro   writes ro.json with the German
//                                                          text in every slot, to translate
//
// What gets translated (the book rule): the explaining blocks — intro, why, h, rule, merke,
// mistake — plus chapter titles, mascot bubbles, the UI strings, table headings that
// describe (not the German forms: ich, lernen, maskulin, Nominativ …), the columns a table
// lists in `explain`, and the titles of example lists and tables. Examples, word lists,
// table contents, exercises and solutions stay German: German is the subject.
// Words in *stars* are German examples inside an explanation and stay German.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src", "data", "grammatik-start");
const de = JSON.parse(readFileSync(path.join(dir, "de.json"), "utf8"));

export const LANGS = ["en", "ar", "uk", "tr", "ru", "fa", "ps", "kmr", "pl", "ro", "tg", "es", "pt", "vi", "hi", "id", "tl"];

// Table headings that are German forms or the German grammar terms the book teaches: kept.
export const KEEP_HEAD = new Set([
  "ich", "du", "er", "sie", "es", "wir", "ihr", "sie / Sie", "sie/Sie", "er / sie / es", "er/sie/es",
  "lernen", "wohnen", "sein", "haben", "werden", "müssen", "können", "wollen", "dürfen", "sollen", "möchten",
  "maskulin", "feminin", "neutrum", "Plural", "Nominativ", "Akkusativ", "Dativ", "Infinitiv", "Perfekt",
  "haben: hätte", "sein: wäre", "werden: würde", "Präposition + Artikel", "Kurzform", "Endung",
]);

/** The slots a translation has to fill, from the German: id → { field: German }. */
export function units() {
  const u = { ui: { ...de.ui }, chapters: {}, blocks: {} };
  delete u.ui.draft; // German has none; each translation says it is a draft
  u.ui.draft = "Die Erklärungen in dieser Sprache sind ein Entwurf und noch nicht von einer Lehrkraft geprüft.";
  for (const c of de.chapters) {
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

// German words that do not exist (as words) in the other ten languages: three of them
// outside *stars* and quotes in one text means it was not translated.
const GERMAN = /\b(und|ist|nicht|oder|wird|werden|dem|eine|einen|auch|immer|steht|bleibt|wenn|weil|dass|sich|kein|deshalb|fast|sehr)\b/gi;
const strip = (s) => String(s).replace(/\*[^*]*\*/g, " ").replace(/[„"«][^“"»]*[“"»]/g, " ").replace(/\([^)]*\)/g, " ");

function check(code) {
  const file = path.join(dir, `${code}.json`);
  if (!existsSync(file)) return [`${code}.json fehlt`];
  const tr = JSON.parse(readFileSync(file, "utf8"));
  const want = units();
  const errs = [];
  const text = (where, got, ger) => {
    if (typeof got !== "string" || !got.trim()) { errs.push(`${where}: leer`); return; }
    const hits = strip(got).match(GERMAN) ?? [];
    if (hits.length >= 3) errs.push(`${where}: noch Deutsch? (${hits.slice(0, 4).join(", ")})`);
    else if (ger && got.trim() === ger.trim() && ger.split(" ").length > 2) errs.push(`${where}: unverändert Deutsch`);
    // German examples in stars must survive the translation.
    const stars = (ger?.match(/\*[^*]+\*/g) ?? []).length;
    if (stars && (got.match(/\*[^*]+\*/g) ?? []).length < Math.min(stars, 1)) errs.push(`${where}: *Beispielwörter* fehlen`);
  };
  if (!["draft", "reviewed"].includes(tr.status)) errs.push(`status: "draft" oder "reviewed" fehlt`);
  if (tr.lang !== code) errs.push(`lang: "${code}" fehlt`);
  for (const [k, v] of Object.entries(want.ui)) {
    if (k === "draft" && tr.status === "reviewed") continue;
    text(`ui.${k}`, tr.ui?.[k], v);
    for (const ph of v.match(/\{\w+\}/g) ?? []) if (!tr.ui?.[k]?.includes(ph)) errs.push(`ui.${k}: Platzhalter ${ph} fehlt`);
  }
  for (const [id, v] of Object.entries(want.chapters)) {
    text(`${id}.title`, tr.chapters?.[id]?.title, v.title);
    text(`${id}.bubble`, tr.chapters?.[id]?.bubble, v.bubble);
  }
  for (const [id, slot] of Object.entries(want.blocks)) {
    const got = tr.blocks?.[id];
    if (!got) { errs.push(`${id}: fehlt`); continue; }
    if (slot.text != null) text(`${id}.text`, got.text, slot.text);
    if (slot.title != null) text(`${id}.title`, got.title, slot.title);
    if (slot.head) {
      if (!Array.isArray(got.head) || got.head.length !== slot.head.length) errs.push(`${id}.head: ${slot.head.length} Spalten erwartet`);
      else slot.head.forEach((h, i) => { if (h != null && !String(got.head[i] ?? "").trim()) errs.push(`${id}.head[${i}]: leer`); });
    }
    if (slot.cells) {
      if (!Array.isArray(got.cells) || got.cells.length !== slot.cells.length) errs.push(`${id}.cells: ${slot.cells.length} Zeilen erwartet`);
      else slot.cells.forEach((r, ri) => r.forEach((c, ci) => { if (!String(got.cells[ri]?.[ci] ?? "").trim()) errs.push(`${id}.cells[${ri}][${ci}]: leer`); }));
    }
  }
  for (const id of Object.keys(tr.blocks ?? {})) if (!want.blocks[id]) errs.push(`${id}: gibt es im Deutschen nicht`);
  return errs;
}

const args = process.argv.slice(2);
if (args[0] === "--skeleton") {
  const code = args[1];
  const u = units();
  const out = { lang: code, status: "draft", ...u };
  writeFileSync(path.join(dir, `${code}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`src/data/grammatik-start/${code}.json geschrieben (deutsche Platzhalter)`);
} else if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let bad = 0;
  for (const code of args.length ? args : LANGS) {
    const errs = check(code);
    if (errs.length) { bad++; console.log(`✗ ${code}: ${errs.length} Probleme`); errs.slice(0, 40).forEach((e) => console.log(`   ${e}`)); }
    else console.log(`✓ ${code}`);
  }
  process.exit(bad ? 1 : 0);
}
