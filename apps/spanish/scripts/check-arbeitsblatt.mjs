// The teacher material in Spanish: tandem extras (src/data/arbeitsblatt/*.json) and partner
// sheets (src/data/partneruebungen/*.json).
//
//   node scripts/check-arbeitsblatt.mjs            errors only
//   node scripts/check-arbeitsblatt.mjs --tiles    also lists every tile the answer changes
//
// Checks: the file carries variety es-ES; a question opens with ¿ and closes with ?; the blue verb
// is one of the answer's tiles; no English sentence is left in what the learners say or write;
// every partner sheet passes its schema. A tile may differ from the answer on purpose (dictionary
// form: the blue infinitive, hablar → hablo, an adjective to agree). --tiles prints those so a
// reader can check that the difference is the point of the task and not a slip.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSheet } from "../src/lib/partneruebungen/schema.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEETS = path.join(ROOT, "src/data/arbeitsblatt");
const PARTNER = path.join(ROOT, "src/data/partneruebungen");
const showTiles = process.argv.includes("--tiles");

const errors = [];
const tileNotes = [];
const say = (file, where, msg) => errors.push(`${file} ${where}: ${msg}`);

// Words that are English and not Spanish. Short on purpose: it catches a sentence left behind.
const ENGLISH = /\b(the|and|you|your|what|where|when|why|who|does|did|with|have|she|they|this|that|from|want|would|should|please|there)\b/i;
const isEnglish = (s) => ENGLISH.test(String(s).replace(/\*|_/g, ""));
const isQuestion = (s) => /¿[^?]*\?/.test(s);
const norm = (s) => String(s).toLowerCase().replace(/[¿?¡!.,;:«»“”"()…]/g, " ").replace(/\s+/g, " ").trim();

function checkPair(file, where, { frage, kacheln, antwort, infinitiv, frageKacheln }) {
  if (typeof frage !== "string" || !isQuestion(frage)) say(file, where, `question needs ¿…?: ${frage}`);
  if (typeof antwort !== "string" || !/[.!?…]$/.test(antwort)) say(file, where, `answer needs a closing mark: ${antwort}`);
  if (!Array.isArray(kacheln) || kacheln.length < 2) say(file, where, "at least two answer tiles");
  if (frageKacheln != null && (!Array.isArray(frageKacheln) || frageKacheln.length < 2)) say(file, where, "at least two question tiles");
  if (!kacheln?.includes(infinitiv)) say(file, where, `blue verb "${infinitiv}" is not an answer tile`);
  for (const text of [frage, antwort, ...(kacheln ?? []), ...(frageKacheln ?? [])]) {
    if (isEnglish(text)) say(file, where, `English left: ${text}`);
  }
  // Tiles the answer doesn't hold as written, apart from the blue verb and a person in brackets.
  const answer = ` ${norm(antwort)} `;
  const changed = (kacheln ?? []).filter((t) => t !== infinitiv && !/^\(.*\)$/.test(t) && !answer.includes(` ${norm(t)} `));
  if (changed.length) tileNotes.push(`${file} ${where}: ${changed.join(" | ")} → ${antwort}`);
}

/* ---- tandem extras ---- */
const files = readdirSync(SHEETS).filter((f) => f.endsWith(".json")).sort();
for (const f of files) {
  const d = JSON.parse(readFileSync(path.join(SHEETS, f), "utf8"));
  if (d.variety !== "es-ES") say(f, "(top)", 'variety must be "es-ES"');
  const b = d.tandemFrageBeispiel;
  if (b) {
    checkPair(f, "example", { frage: b.frage, kacheln: b.antwortKacheln, antwort: b.antwort, infinitiv: b.infinitiv, frageKacheln: b.kacheln });
  }
  if (!Array.isArray(d.tandemFragen) || d.tandemFragen.length < 4) say(f, "tandemFragen", "at least four");
  (d.tandemFragen ?? []).forEach((q, i) => checkPair(f, `tandemFragen[${i}]`, q));
  (d.tandemRedemittel ?? []).forEach((r, i) => {
    for (const k of ["p1", "p2", "p3"]) if (r[k] && isEnglish(r[k])) say(f, `tandemRedemittel[${i}].${k}`, `English left: ${r[k]}`);
  });
  if (d.tandemSoGehts && (!Array.isArray(d.tandemSoGehts) || d.tandemSoGehts.length < 2)) say(f, "tandemSoGehts", "at least two steps");
}

/* ---- partner sheets ---- */
const spoken = (spec) => {
  const out = [];
  for (const r of spec.intro?.redemittel ?? []) out.push(r.p1, r.p2, r.p3);
  for (const k of spec.karten ?? []) {
    for (const s of k.schritte ?? []) {
      for (const it of s.items ?? []) out.push(it.loesung, it.frage, ...(it.kacheln ?? []), ...(it.frageKacheln ?? []));
      for (const x of s.redemittel ?? []) out.push(x);
      for (const q of s.fragen ?? []) out.push(q.frage, ...(q.kacheln ?? []));
      for (const x of s.kacheln ?? []) out.push(x);
    }
  }
  for (const l of spec.loesungen ?? []) out.push(l.antwort);
  for (const x of spec.zusammen?.wortkarten ?? []) out.push(x);
  return out.filter(Boolean);
};
const partner = readdirSync(PARTNER).filter((f) => f.endsWith(".json")).sort();
for (const f of partner) {
  const spec = JSON.parse(readFileSync(path.join(PARTNER, f), "utf8"));
  for (const e of validateSheet(spec)) say(f, "schema", e);
  if (spec.id !== f.replace(/\.json$/, "")) say(f, "id", "does not match the file name");
  if (spec.variety !== "es-ES") say(f, "(top)", 'variety must be "es-ES"');
  if (spec.quelle?.geprueft !== false) say(f, "quelle.geprueft", "stays false until Edgar has reviewed the sheet (content-plan §5.10)");
  for (const text of spoken(spec)) if (isEnglish(text)) say(f, "text", `English left: ${text}`);
}

for (const e of errors) console.error(`  ERROR ${e}`);
if (showTiles) for (const n of tileNotes) console.log(`  tile ${n}`);
console.log(`arbeitsblatt: ${files.length} tandem extras, ${partner.length} partner sheets, ${errors.length} errors, ${tileNotes.length} answers with changed tiles`);
if (errors.length) process.exit(1);
