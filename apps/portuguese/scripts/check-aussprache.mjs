// Checks the links between the typical mistakes (src/data/fehler-nach-sprache.json) and the
// pronunciation drills (src/data/aussprache-muttersprache.json). They point at each other —
// an error's `drill`, a drill's `fehler`, a language's drill list — and /culture/mistakes and
// the Aussprache-Check build their "Jetzt üben" / "Warum passiert das?" links from them, so
// a typo here is a dead link there. Also: each sentence's focus sounds and stress words, and
// each pronunciation rule's match against its own examples.
//   pnpm check:aussprache            (add --audio to require every drill recording)
// Exits non-zero on any problem.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DRILL_PATTERNS } from "../src/lib/pronunciation/patterns.ts";
import { drillSlug, drillTexts } from "../src/lib/drillAudio.js";
import { SOUNDS } from "../src/lib/ausspracheTipps.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));
const fehler = read("src/data/fehler-nach-sprache.json");
const md = read("src/data/aussprache-muttersprache.json");

const problems = [];
// Rule examples that show the contrast, so they are meant not to fit the rule's match.
const NOT_MATCHING = new Set(["sch-st-sp/cosa", "ig/gato", "e-ende/dos", "e-ende/donde"]);
const drills = md.drills;
const langs = new Map(fehler.languages.map((l) => [l.id, l]));
const errors = new Map();

// Every pronunciation error has a unique id; ids are also anchors (#id), so keep them simple.
for (const l of fehler.languages) {
  for (const [i, m] of l.mistakes.entries()) {
    if (m.area === "aussprache" && !m.id) problems.push(`${l.id}: pronunciation mistake ${i} has no id`);
    if (!m.id) continue;
    if (!/^[a-z0-9-]+$/.test(m.id)) problems.push(`${l.id}: id "${m.id}" is not a plain slug`);
    if (errors.has(m.id)) problems.push(`duplicate error id ${m.id}`);
    errors.set(m.id, { ...m, lang: l.id });
  }
}

// error.drill → the drill exists and is in that language's drill list (the link opens it there).
for (const [id, e] of errors) {
  if (!e.drill) continue;
  if (!drills[e.drill]) problems.push(`${id}: drill "${e.drill}" does not exist`);
  else if (!(md.languages[e.lang] ?? []).includes(e.drill)) problems.push(`${id}: drill "${e.drill}" is not in the drill list of ${e.lang}`);
  if (!(drills[e.drill]?.fehler ?? []).includes(id)) problems.push(`${id}: drill "${e.drill}" does not list it back in its "fehler"`);
}

// drill.fehler → each id exists and points back at this drill.
for (const [d, drill] of Object.entries(drills)) {
  for (const id of drill.fehler ?? []) {
    if (!errors.has(id)) problems.push(`drill ${d}: error "${id}" does not exist`);
    else if (errors.get(id).drill !== d) problems.push(`drill ${d}: error "${id}" points at drill "${errors.get(id).drill}"`);
  }
  if (!drill.sentence) problems.push(`drill ${d}: no sentence`);
  // The sentence practises what the Hörtest asks: one word of every minimal pair, as written.
  const said = new Set((drill.sentence ?? "").toLowerCase().match(/[\p{L}]+/gu) ?? []);
  for (const pair of drill.pairs ?? []) {
    if (!pair.some((w) => said.has(w.toLowerCase()))) problems.push(`drill ${d}: sentence has neither "${pair.join('" nor "')}"`);
  }
  // A drill the detector cannot recognise can still be practised, but the Check would never
  // suggest it — worth knowing.
  if (!DRILL_PATTERNS[d]) problems.push(`drill ${d}: no rule in src/lib/pronunciation/patterns.ts`);
}

// Language drill lists → languages and drills that exist.
for (const [lang, list] of Object.entries(md.languages)) {
  if (!langs.has(lang)) problems.push(`drill list for unknown language "${lang}"`);
  for (const d of list) if (!drills[d]) problems.push(`${lang}: drill "${d}" does not exist`);
}

// Focus chips: a sentence's sound ids exist, and a word of the sentence really has the sound.
const sentences = [
  ...read("src/data/aussprache-check.json").levels.flatMap((l) => l.sentences.map((x) => ({ ...x, file: "aussprache-check" }))),
  ...read("src/data/zungenbrecher.json").levels.flatMap((l) => l.sentences.map((x) => ({ ...x, file: "zungenbrecher" }))),
];
const soundById = new Map(SOUNDS.map((s) => [s.id, s]));
const wordsOf = (t) => t.toLowerCase().match(/[\p{L}]+/gu) ?? [];
for (const x of sentences) {
  for (const f of x.focus ?? []) {
    const sound = soundById.get(f);
    if (!sound) problems.push(`${x.file} ${x.id}: unknown focus "${f}"`);
    else if (!wordsOf(x.text).some((w) => sound.test(w))) problems.push(`${x.file} ${x.id}: no word has the focus sound "${f}"`);
  }
  // `stress` keys are looked up by the word as written.
  const said = new Set((x.text.match(/[\p{L}-]+/gu) ?? []));
  for (const w of Object.keys(x.stress ?? {})) if (!said.has(w)) problems.push(`${x.file} ${x.id}: stress word "${w}" is not in the sentence`);
}

// Rules: `match` compiles and fits the rule's own examples (one word only: multi-word examples
// never reach it); a `mark` is part of its word.
for (const r of read("src/data/ausspracheregeln.json").rules) {
  let re = null;
  if (r.match) {
    try { re = new RegExp(r.match); } catch (e) { problems.push(`rule ${r.id}: bad match: ${e.message}`); }
  }
  for (const ex of r.examples) {
    if (ex.mark && !ex.w.toLowerCase().includes(ex.mark.toLowerCase())) problems.push(`rule ${r.id}: mark "${ex.mark}" is not in "${ex.w}"`);
    // ch-less examples that show the opposite on purpose are spelled out in NOT_MATCHING.
    if (re && !/\s/.test(ex.w) && !re.test(ex.w.toLowerCase()) && !NOT_MATCHING.has(`${r.id}/${ex.w}`)) problems.push(`rule ${r.id}: example "${ex.w}" does not fit its match`);
  }
}

// Audio: the page falls back to the browser voice, so a missing mp3 is only a note until es-ES
// recordings exist (content-plan §5.6). With --audio it is a problem.
const missing = Object.values(drills)
  .flatMap(drillTexts)
  .filter((t) => !existsSync(path.join(ROOT, "public/audio/muttersprache", `${drillSlug(t)}.mp3`)));
if (missing.length) {
  const line = `${new Set(missing).size} drill text(s) without audio: ${[...new Set(missing)].slice(0, 5).join(" · ")}${missing.length > 5 ? " …" : ""}`;
  if (process.argv.includes("--audio")) problems.push(line);
  else console.log(`check:aussprache note: ${line}`);
}

if (problems.length) {
  console.error(`check:aussprache — ${problems.length} problem(s):`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`check:aussprache ok: ${errors.size} errors with id, ${Object.keys(drills).length} drills, ${Object.keys(md.languages).length} languages.`);
