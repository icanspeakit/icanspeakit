// Checks the links between the typical mistakes (src/data/fehler-nach-sprache.json) and the
// pronunciation drills (src/data/aussprache-muttersprache.json). They point at each other —
// an error's `drill`, a drill's `fehler`, a language's drill list — and /culture/mistakes and
// the Aussprache-Check build their "Jetzt üben" / "Warum passiert das?" links from them, so
// a typo here is a dead link there.
//   pnpm check:aussprache
// Exits non-zero on any problem.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DRILL_PATTERNS } from "../src/lib/pronunciation/patterns.ts";
import { drillSlug, drillTexts } from "../src/lib/drillAudio.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));
const fehler = read("src/data/fehler-nach-sprache.json");
const md = read("src/data/aussprache-muttersprache.json");

const problems = [];
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

// Audio: every text a drill speaks has its mp3 (else the page falls back to the browser voice).
const missing = Object.values(drills)
  .flatMap(drillTexts)
  .filter((t) => !existsSync(path.join(ROOT, "public/audio/muttersprache", `${drillSlug(t)}.mp3`)));
if (missing.length) problems.push(`${missing.length} drill text(s) without audio — run scripts/generate-muttersprache-audio.mjs: ${[...new Set(missing)].slice(0, 5).join(" · ")}${missing.length > 5 ? " …" : ""}`);

if (problems.length) {
  console.error(`check:aussprache — ${problems.length} problem(s):`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`check:aussprache ok: ${errors.size} errors with id, ${Object.keys(drills).length} drills, ${Object.keys(md.languages).length} languages.`);
