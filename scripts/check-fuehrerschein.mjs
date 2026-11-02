// Checks the Führerschein section before every build (package.json → prebuild):
//
//   node scripts/check-fuehrerschein.mjs
//
// What it guards (FUEHRERSCHEIN-TIERED-PROMPT.md, Tier 1):
//   - the research file: every entry has value, source, stand and a status;
//   - lessons, questions, scenes, steps and translations: schema, unique ids, keys in range;
//   - every {{fakt:…}} resolves to an `ok` research entry — an UNVERIFIED value or a missing
//     key stops the build here, before any page could print it;
//   - every Verkehrszeichen used has its file in public/img/verkehrszeichen/ and an `ok`
//     licence entry;
//   - every fs.* i18n key the section's markup uses exists in public/i18n/de.json.
// Reports every problem at once, then exits 1 if there was any.
import fs from "node:fs";
import path from "node:path";
import { RESEARCH, fillDeep, citedDeep, fakt } from "../src/lib/fuehrerschein.js";
import { checkSzene } from "../src/lib/fahrSzene.js";
import regeln from "../src/data/fuehrerschein/regeln.json" with { type: "json" };
import fragen from "../src/data/fuehrerschein/fragen.json" with { type: "json" };
import szenen from "../src/data/fuehrerschein/szenen.json" with { type: "json" };
import ablauf from "../src/data/fuehrerschein/ablauf.json" with { type: "json" };
import wortschatz from "../src/data/fuehrerschein/wortschatz.json" with { type: "json" };
import help from "../src/data/uebersetzungen/fuehrerschein.json" with { type: "json" };

const problems = [];
const bad = (where, msg) => problems.push(`${where}: ${msg}`);

// --- Research file -----------------------------------------------------------------------
const SKIP = new Set(["_note", "stand", "bilder"]);
for (const [sec, entries] of Object.entries(RESEARCH)) {
  if (SKIP.has(sec) || typeof entries !== "object") continue;
  for (const [k, e] of Object.entries(entries)) {
    if (!e || typeof e !== "object" || !("status" in e)) { bad(`fakten ${sec}.${k}`, "kein Eintrag mit status"); continue; }
    if (!["ok", "UNVERIFIED"].includes(e.status)) bad(`fakten ${sec}.${k}`, `status „${e.status}“`);
    if (!e.stand) bad(`fakten ${sec}.${k}`, "ohne stand");
    if (e.status === "ok" && !e.source?.url) bad(`fakten ${sec}.${k}`, "ok, aber ohne Quelle (source.url)");
  }
}

// --- Signs --------------------------------------------------------------------------------
const signOk = (k) => {
  const z = RESEARCH.bilder.zeichen[k];
  return !!z && z.status === "ok" && !k.includes("+") && fs.existsSync(path.join("public/img/verkehrszeichen", `${k}.svg`));
};

/** Resolve every placeholder in `v`; report instead of throwing. */
function resolves(where, v) {
  for (const key of citedDeep(v)) {
    try { fakt(key); } catch (e) { bad(where, e.message); }
  }
  try { fillDeep(v); } catch (e) { bad(where, e.message); }
}

// --- Scenes ------------------------------------------------------------------------------
const sceneIds = new Set();
for (const s of szenen.scenes) {
  if (sceneIds.has(s.id)) bad(`szenen ${s.id}`, "id doppelt");
  sceneIds.add(s.id);
  for (const e of checkSzene(s, signOk)) bad(`szenen ${s.id}`, e);
  resolves(`szenen ${s.id}`, s);
}

// --- Lessons -----------------------------------------------------------------------------
const groups = new Set(regeln.groups.map((g) => g.id));
const lessonIds = new Set();
for (const l of regeln.lessons) {
  const w = `regeln ${l.id}`;
  if (lessonIds.has(l.id)) bad(w, "id doppelt");
  lessonIds.add(l.id);
  for (const f of ["title", "eyebrow", "level", "intro", "introEasy", "facts", "card"]) if (!l[f] || (Array.isArray(l[f]) && !l[f].length)) bad(w, `Feld „${f}“ fehlt`);
  if (!groups.has(l.group)) bad(w, `Gruppe „${l.group}“ unbekannt`);
  if (!["A2", "B1"].includes(l.level)) bad(w, `level „${l.level}“ — erwartet A2 oder B1`);
  if (l.factsEasy && l.factsEasy.length !== l.facts.length) bad(w, "factsEasy hat nicht so viele Einträge wie facts");
  if (l.bild?.zeichen && !signOk(l.bild.zeichen)) bad(w, `Kartenbild-Zeichen „${l.bild.zeichen}“ ohne Datei/Lizenz`);
  if (l.bild?.emoji === undefined && !l.bild?.zeichen) bad(w, "ohne Kartenbild (bild.zeichen oder bild.emoji)");
  for (const z of l.signs ?? []) if (!signOk(z)) bad(w, `Zeichen „${z}“ ohne Datei/Lizenz`);
  for (const s of l.scenes ?? []) if (!sceneIds.has(s)) bad(w, `Szene „${s}“ gibt es nicht`);
  for (const t of [l.introEasy, ...(l.factsEasy ?? [])]) if (/\{[^{]/.test(String(t).replace(/\{\{fakt:[^}]+\}\}/g, ""))) bad(w, `Einfache Sprache mit Begriff-Klammern: „${String(t).slice(0, 50)}…“`);
  for (const p of l.comic?.panels ?? []) for (const side of [p.left, p.right]) if (!["bruno", "regi", "hamsti", "quaki"].includes(side?.name)) bad(w, "Comic: unbekannte Figur");
  resolves(w, l);
}

// --- Questions ---------------------------------------------------------------------------
const qIds = new Set();
const perTopic = {};
const lessonN = {};
let zusatz = 0;
for (const q of fragen.questions) {
  const w = `fragen ${q.id}`;
  if (qIds.has(q.id)) bad(w, "id doppelt");
  qIds.add(q.id);
  if (!lessonIds.has(q.topic)) bad(w, `Thema „${q.topic}“ gibt es nicht`);
  perTopic[q.topic] = (perTopic[q.topic] ?? 0) + 1;
  if (q.inLesson) lessonN[q.topic] = (lessonN[q.topic] ?? 0) + 1;
  if (q.stoff === "zusatz") zusatz++;
  else if (q.stoff !== "grund") bad(w, `stoff „${q.stoff}“`);
  if (!(q.points >= 2 && q.points <= 5 && Number.isInteger(q.points))) bad(w, `points ${q.points} — erwartet 2–5`);
  if (!q.prompt || !q.explain) bad(w, "prompt oder explain fehlt");
  if (q.origin !== "eigen") bad(w, "origin muss „eigen“ sein");
  if (q.sign && !signOk(q.sign)) bad(w, `Zeichen „${q.sign}“ ohne Datei/Lizenz`);
  if (q.scene && !sceneIds.has(q.scene)) bad(w, `Szene „${q.scene}“ gibt es nicht`);
  if (q.type === "zahl") {
    if (q.options) bad(w, "zahl ohne options erwartet");
    try { const a = fillDeep(String(q.answer)); if (!/^-?\d+([.,]\d+)?$/.test(a)) bad(w, `zahl-Antwort „${a}“ ist keine Zahl`); } catch (e) { bad(w, e.message); }
  } else if (["mc1", "mcN", "bild"].includes(q.type)) {
    if (!Array.isArray(q.options) || q.options.length !== 3) bad(w, "genau 3 Antworten erwartet");
    const n = q.options?.length ?? 0;
    if (q.type === "mcN") {
      if (!Array.isArray(q.answer) || q.answer.length < 2) bad(w, "mcN braucht mindestens 2 richtige");
      else if (q.answer.some((i) => !(i >= 0 && i < n)) || new Set(q.answer).size !== q.answer.length) bad(w, "mcN-Antwort außerhalb oder doppelt");
    } else if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < n)) bad(w, `answer ${JSON.stringify(q.answer)} außerhalb`);
    if (q.type === "bild") for (const z of q.options ?? []) if (!signOk(z)) bad(w, `Bild-Antwort „${z}“ ohne Datei/Lizenz`);
  } else bad(w, `type „${q.type}“ unbekannt`);
  resolves(w, q);
}
const MIN_PER_TOPIC = 25;
for (const id of lessonIds) {
  if ((perTopic[id] ?? 0) < MIN_PER_TOPIC) bad(`fragen ${id}`, `nur ${perTopic[id] ?? 0} Fragen — Ziel ≥ ${MIN_PER_TOPIC}`);
  const n = lessonN[id] ?? 0;
  if (n < 5 || n > 8) bad(`fragen ${id}`, `${n} Lektionsfragen (inLesson) — erwartet 5–8`);
}
const rules = {
  zusatz: fakt("theorie.aufteilungGrundstoffZusatzstoff.zusatzstoffB").value,
  grund: fakt("theorie.aufteilungGrundstoffZusatzstoff.grundstoff").value,
};
if (zusatz < rules.zusatz) bad("fragen", `nur ${zusatz} Zusatzstoff-Fragen — die Simulation braucht ${rules.zusatz}`);
if (fragen.questions.length - zusatz < rules.grund) bad("fragen", `zu wenige Grundstoff-Fragen für die Simulation`);

// --- Ablauf, translations, Lernset --------------------------------------------------------
resolves("ablauf", { steps: ablauf.steps, comics: ablauf.comics });
for (const s of ablauf.steps) for (const k of [...(s.keys ?? []), ...(s.cost ?? []), ...(s.bringKey ? [s.bringKey] : [])]) {
  try { fakt(k); } catch (e) { bad(`ablauf ${s.id}`, e.message); }
}
for (const [id, e] of Object.entries(help.entries ?? {})) {
  if (!lessonIds.has(id)) bad(`übersetzungen ${id}`, "Lektion gibt es nicht");
  const l = regeln.lessons.find((x) => x.id === id);
  for (const lang of ["en", "tr", "uk", "ar"]) if (l && e.facts?.[lang] && e.facts[lang].length !== l.facts.length) bad(`übersetzungen ${id}`, `${lang}: facts-Anzahl passt nicht`);
  resolves(`übersetzungen ${id}`, e);
}
const vIds = new Set();
for (const g of wortschatz.groups) for (const v of g.words) {
  if (vIds.has(v.id)) bad(`wortschatz ${v.id}`, "id doppelt");
  vIds.add(v.id);
  for (const l of ["en", "tr", "uk", "ar"]) if (!v.translations?.[l]) bad(`wortschatz ${v.id}`, `Übersetzung ${l} fehlt`);
  if (v.pos === "noun" && !v.gender && !v.pluralOnly) bad(`wortschatz ${v.id}`, "Nomen ohne Artikel");
  if (!v.example) bad(`wortschatz ${v.id}`, "ohne Beispielsatz");
}

// --- i18n keys ----------------------------------------------------------------------------
const de = JSON.parse(fs.readFileSync("public/i18n/de.json", "utf8"));
const files = [
  ...fs.readdirSync("src/pages/fuehrerschein", { recursive: true }).map((f) => path.join("src/pages/fuehrerschein", String(f))),
  ...fs.readdirSync("src/components/fuehrerschein").map((f) => path.join("src/components/fuehrerschein", f)),
  "src/components/FahrSzene.astro", "src/lib/fahrQuiz.js", "src/lib/fahrSzene.js",
].filter((f) => /\.(astro|js)$/.test(f));
const used = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/data-i18n(?:-html)?="(fs\.[\w.-]+)"/g)) used.add(m[1]);
  for (const m of src.matchAll(/\b(?:t|tx)\("(fs\.[\w.-]+)"/g)) used.add(m[1]);
  for (const m of src.matchAll(/aria-label:(fs\.[\w.-]+)/g)) used.add(m[1]);
}
for (const l of regeln.lessons) used.add(`fs.lesson.${l.id}.card`);
for (const g of regeln.groups) used.add(`fs.group.${g.id}`);
for (const k of used) if (!(k in de)) bad("i18n", `Schlüssel „${k}“ fehlt in public/i18n/de.json`);

// --- Ids for /progress -------------------------------------------------------------------
// The registry (src/lib/exam/registry.js) is bundled into the /progress page script, so it
// reads this small index instead of the whole bank. Written only when it changed.
const index = {
  _note: "Erzeugt von scripts/check-fuehrerschein.mjs — nicht von Hand ändern.",
  maxFehlerpunkte: fakt("theorie.maxFehlerpunkteBestehen").value,
  modules: regeln.lessons.map((l) => ({ key: l.id, label: l.title, ids: fragen.questions.filter((q) => q.topic === l.id).map((q) => q.id) })),
};
const indexPath = "src/data/fuehrerschein/fragen-index.json";
const indexJson = JSON.stringify(index, null, 2) + "\n";
if (!fs.existsSync(indexPath) || fs.readFileSync(indexPath, "utf8") !== indexJson) fs.writeFileSync(indexPath, indexJson);

// --- Report -------------------------------------------------------------------------------
const n = { lessons: regeln.lessons.length, questions: fragen.questions.length, scenes: szenen.scenes.length, words: vIds.size, keys: used.size };
if (problems.length) {
  console.error(`check:fuehrerschein — ${problems.length} Problem(e):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`check:fuehrerschein — ${n.lessons} Lektionen, ${n.questions} Fragen (${zusatz} Zusatzstoff), ${n.scenes} Szenen, ${n.words} Wörter, ${n.keys} i18n-Schlüssel: alles in Ordnung`);
