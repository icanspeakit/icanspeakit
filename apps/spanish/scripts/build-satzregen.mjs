// Regis Satzregen: builds src/data/satzregen/saetze.json from the hand-chunked source
// src/data/satzregen/quelle.txt (format in its header).
//
// For every sentence it
//   - parses the chunks and their marks (finite verb, subject, verb parts, locked chunks),
//   - finds where the sentence comes from: the same text in the lexicon's examples, a grammar
//     topic's build exercise or Lindenau (scripts/satzregen-scan.mjs) – else "eigen",
//   - links the voiced file public/audio/saetze/<satzSlug>.mp3 when there is one,
//   - validates: canonical order passes the checker, every alt passes, an Aussagesatz has
//     its finite verb in position 2 (a Ja/Nein-Frage in position 1), slots 3–6, no
//     duplicate sentence,
//   - and with --vorfeld prints every Vorfeld variant the checker will accept, for review.
//
//   node scripts/build-satzregen.mjs              build + validate
//   node scripts/build-satzregen.mjs --vorfeld    + list the accepted variants
//   node scripts/build-satzregen.mjs --check      validate only, write nothing (exit 1 on error)
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { satzSlug } from "../src/lib/audioSlug.js";
import { acceptedOrders, isCorrect, sentenceText, vorfeldVariants } from "../src/lib/satzregen/check.js";
import { collect } from "./satzregen-scan.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src", "data", "satzregen", "quelle.txt");
const OUT = path.join(ROOT, "src", "data", "satzregen", "saetze.json");
const argv = process.argv.slice(2);
const SHOW_VORFELD = argv.includes("--vorfeld");
const CHECK_ONLY = argv.includes("--check");

const MODES = ["v2", "janein", "klammer", "nebensatz"];
const errors = [];
const err = (line, msg) => errors.push(`Zeile ${line}: ${msg}`);

/** {free 1<2 3-4}: every order of n chunks with chunk 1 before 2 and 3 right before 4, canonical left out. */
function freeOrders(n, conds) {
  const rules = conds.map((c) => c.match(/^(\d+)([<-])(\d+)$/));
  const out = [];
  const walk = (order, left) => {
    if (left.length) return left.forEach((x) => walk([...order, x], left.filter((y) => y !== x)));
    const canon = order.every((x, i) => x === i);
    if (!canon && rules.every(([, a, how, b]) => {
      const d = order.indexOf(Number(b)) - order.indexOf(Number(a));
      return how === "<" ? d > 0 : d === 1;
    })) out.push(order);
  };
  walk([], [...Array(n).keys()]);
  return out;
}

/** One source line → sentence object (or null). */
export function parseLine(raw, mode, level, lineNo) {
  let text = raw;
  const flags = {};
  text = text.replace(/\{([^}]*)\}/g, (_, f) => {
    const [k, ...rest] = f.trim().split(/\s+/);
    if (k === "nv") flags.nv = true;
    else if (k === "alt") (flags.a ??= []).push(rest.map(Number));
    else if (k === "rule") flags.rule = rest.join(" ");
    else if (k === "free") flags.free = rest;
    else if (k === "es419") flags.es419 = { note: rest.join(" ") };
    else err(lineNo, `unbekanntes Flag {${f}}`);
    return "";
  });
  const [left, gloss] = text.split(" = ");
  if (!gloss) return err(lineNo, "Übersetzung fehlt (` = …`)"), null;
  const m = left.trim().match(/^(.*\S)\s+([.?])$/);
  if (!m) return err(lineNo, "Satzende „ .“ oder „ ?“ fehlt"), null;
  const parts = m[1].split(" / ").map((p) => p.trim());
  const s = { mode, level, c: [], v: -1, s: -1, vp: [], f: [], e: m[2], en: gloss.trim() };
  parts.forEach((p, i) => {
    let t = p;
    while (/^[*^~!]/.test(t)) {
      const k = t[0];
      t = t.slice(1);
      if (k === "*") s.v = i;
      else if (k === "^") s.s = i;
      else if (k === "~") s.vp.push(i);
      else if (k === "!") s.f.push(i);
    }
    if (!t) err(lineNo, `leerer Chunk ${i + 1}`);
    s.c.push(t);
  });
  if (flags.nv) s.nv = true;
  if (flags.free) flags.a = [...(flags.a ?? []), ...freeOrders(parts.length, flags.free)];
  if (flags.a) s.a = flags.a;
  if (flags.rule) s.rule = flags.rule;
  if (flags.es419) s.es419 = flags.es419;
  return s;
}

function validate(s, lineNo) {
  const n = s.c.length;
  if (n < 3 || n > 6) err(lineNo, `${n} Chunks (erlaubt 3–6)`);
  if (s.v < 0) err(lineNo, "kein konjugiertes Verb (*)");
  if (s.mode === "janein" && s.v !== 0) err(lineNo, "Ja/Nein-Frage: Verb nicht auf Platz 1");
  if (s.mode === "v2" && s.v !== 1) err(lineNo, "verb not in slot 2");
  // A2 mode: the object pronoun stands right before the verb (me lo ha dado).
  if (s.mode === "klammer" && !/^(me|te|lo|la|le|nos|os|los|las|les|se|se lo|se la)$/.test(s.c[s.v - 1] ?? ""))
    err(lineNo, "object pronoun not right before the verb");
  // B1 mode: indirect questions (¿Puedes decirme / dónde / está / la estación?): an accented
  // question word or si, and the verb behind it.
  if (s.mode === "nebensatz" && !s.c.some((c) => /^(dónde|adónde|cuándo|cómo|qué|quién|cuánto|por qué|a qué hora|de qué( \S+)?|si)$/.test(c)))
    err(lineNo, "indirect question without question word / si chunk");
  if (s.mode === "nebensatz" && s.v < 2) err(lineNo, "indirect question: verb before the question word");
  for (const a of s.a || []) {
    const sorted = [...a].sort((x, y) => x - y);
    if (a.length !== n || sorted.some((x, i) => x !== i)) err(lineNo, `alt ${a.join(" ")} ist keine Umstellung aller ${n} Chunks`);
    else if (!isCorrect(s, a.map((i) => s.c[i]))) err(lineNo, `alt ${a.join(" ")} wird nicht angenommen`);
  }
  if (!isCorrect(s, s.c)) err(lineNo, "Grundform wird nicht angenommen");
}

const lines = readFileSync(SRC, "utf8").split(/\r?\n/);
const known = new Map(collect().map((k) => [k.text, k]));
const out = [];
const texts = new Set();
let mode = null;
let level = null;
const counter = {};
lines.forEach((raw, i) => {
  const lineNo = i + 1;
  const line = raw.trim();
  if (!line || line.startsWith("#")) return;
  const head = line.match(/^@(\w+)\s+(A1|A2|B1)$/);
  if (head) {
    [, mode, level] = head;
    if (!MODES.includes(mode)) err(lineNo, `unbekannter Modus ${mode}`);
    return;
  }
  if (!mode) return err(lineNo, "Satz vor dem ersten @modus");
  const s = parseLine(line, mode, level, lineNo);
  if (!s) return;
  validate(s, lineNo);
  const full = sentenceText(s.c, s.e);
  if (texts.has(full)) err(lineNo, `doppelt: ${full}`);
  texts.add(full);
  const k = known.get(full);
  s.src = k ? k.source : "eigen";
  if (k && k.level && k.level !== s.level) s.lv = k.level; // the source's own level, for the record
  const slug = satzSlug(full);
  if (existsSync(path.join(ROOT, "public", "audio", "saetze", `${slug}.mp3`))) s.au = slug;
  counter[mode] = (counter[mode] || 0) + 1;
  s.id = `${mode}-${String(counter[mode]).padStart(3, "0")}`;
  out.push(s);
  if (SHOW_VORFELD) {
    const vs = vorfeldVariants(s).map((o) => sentenceText(o.map((j) => s.c[j]), s.e)).filter((t) => t !== full);
    const alts = acceptedOrders(s).length;
    console.log(`${s.id}  ${full}${vs.length ? `\n        ${vs.join("\n        ")}` : ""}${alts > 1 ? "" : "  (nur Grundform)"}`);
  }
});

// Compact keys, empty fields dropped: the list is inlined into the page.
const clean = out.map(({ id, mode, level, c, v, s, vp, f, a, e, nv, en, au, src, rule, lv, es419 }) => {
  const o = { id, mode, level, c, v, s, e, en };
  if (vp.length) o.vp = vp;
  if (f.length) o.f = f;
  if (a) o.a = a;
  if (nv) o.nv = true;
  if (au) o.au = au;
  if (rule) o.rule = rule;
  if (es419) o.es419 = es419;
  o.src = src;
  if (lv) o.lv = lv;
  return o;
});

const stats = MODES.map((m) => {
  const ms = clean.filter((s) => s.mode === m);
  return `${m}: ${ms.length} (Quelle: ${ms.filter((s) => s.src !== "eigen").length}, Audio: ${ms.filter((s) => s.au).length})`;
});
console.log(stats.join("\n"));
if (errors.length) {
  console.error(`\n${errors.length} Fehler:\n${errors.join("\n")}`);
  process.exit(1);
}
if (!CHECK_ONLY) {
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(clean, null, 0).replace(/\},\{/g, "},\n{") + "\n");
  console.log(`→ ${path.relative(ROOT, OUT)} (${clean.length} Sätze)`);
}
