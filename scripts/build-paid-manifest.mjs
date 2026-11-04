// Paid content: keep it out of the page HTML, publish it as static JSON (prebuild).
//
//   node scripts/build-paid-manifest.mjs                  manifest + public/inhalt/ (prebuild)
//   node scripts/build-paid-manifest.mjs --split-grammar  move the exercises of every paid-level
//                                                         grammar topic into src/paid/grammatik/
//
// Why (STRIPE-PREMIUM-CLI-PROMPT.md, Tier 4): a static page cannot hide anything it carries,
// and Google indexes what it carries — "Goethe C1 Übungssatz Lösungen" is exactly what people
// search for. So paid questions and answers live in src/paid/, which no page imports, and
// reach the browser only as /inhalt/**.json, fetched after the lock check (src/lib/access.js).
//
// AGREED TRADE-OFF: the lock is client-side. Someone who opens /inhalt/… directly gets the
// file. Search engines are kept out three ways: Disallow in robots.txt, an X-Robots-Tag
// header (vercel.json), and no <a href> to these files anywhere.
//
// Writes:
//   src/data/pruefungen/paid-manifest.json  what the pages may know about paid sets: title,
//                                           modules, counts, minutes — never a question
//   public/inhalt/**                        a copy of src/paid/** (gitignored, rebuilt each run;
//                                           exam sets get their audio map added)
// Fails when a grammar topic of a paid level still carries its exercises in src/data/.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { examMinutes } from "../src/lib/exam/minutes.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PAID_LEVELS } from "../src/lib/premium.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAID = path.join(ROOT, "src/paid");
const OUT = path.join(ROOT, "public/inhalt");
const GRAMMAR = path.join(ROOT, "src/data/grammatik");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const jsonIn = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : []);
const problems = [];

// What a topic page renders itself for each exercise (title, hint, its rule box); everything
// else — the items and their answers — is the paid part.
const SKELETON = ["type", "title", "titleKey", "hint", "rule"];
const slotsOf = (ex) =>
  ex.type === "fill" ? ex.items.length
  : ex.type === "match" ? ex.pairs.length
  : ex.type === "table" ? ex.rows.length
  : ex.type === "story" ? ex.segments.filter((s) => s.blank !== undefined).length
  : ex.type === "build" ? ex.sentences.length
  : 0;

// ── 1. Grammar: split (on request) and check ─────────────────────────────────────────────
for (const file of jsonIn(GRAMMAR)) {
  const p = path.join(GRAMMAR, file);
  const topic = read(p);
  if (!PAID_LEVELS.includes(topic.level) || !Array.isArray(topic.exercises)) continue;
  const open = topic.exercises.filter((ex) => !ex.paid);
  if (!open.length) continue;
  if (!process.argv.includes("--split-grammar")) {
    problems.push(`src/data/grammatik/${file}: ${topic.level}-Übungen stehen noch im Seiten-HTML — node scripts/build-paid-manifest.mjs --split-grammar`);
    continue;
  }
  const paidPart = topic.exercises.map((ex) => Object.fromEntries(Object.entries(ex).filter(([k]) => !SKELETON.includes(k))));
  write(path.join(PAID, "grammatik", `${topic.id}.json`), { id: topic.id, level: topic.level, ...(topic.variety ? { variety: topic.variety } : {}), exercises: paidPart });
  topic.exercises = topic.exercises.map((ex) => ({
    ...Object.fromEntries(Object.entries(ex).filter(([k]) => SKELETON.includes(k))),
    slots: slotsOf(ex),
    paid: true,
  }));
  write(p, topic);
  console.log(`  ${file}: Übungen nach src/paid/grammatik/ verschoben.`);
}

// ── 2. Manifest of the paid exam sets ────────────────────────────────────────────────────
const isScored = (part) => part.type !== "schreiben" && part.type !== "sprechen";
function audioMap(set) {
  const audio = {};
  for (const m of set.modules) for (const p of m.parts) for (const c of p.clips ?? []) {
    audio[c.id] = existsSync(path.join(ROOT, "public", "audio", "pruefungen", set.id, `${c.id}.mp3`));
  }
  return audio;
}

const saetze = jsonIn(path.join(PAID, "pruefungen/saetze")).map((f) => {
  const set = read(path.join(PAID, "pruefungen/saetze", f));
  return {
    id: set.id,
    slug: set.slug,
    exam: set.exam,
    level: set.level,
    title: set.title,
    sourcing: set.sourcing,
    // The page's structure table reads the official format and the scoring rule (no tasks).
    ...(set.formatRef ? { formatRef: set.formatRef } : {}),
    ...(set.scoring ? { scoring: set.scoring } : {}),
    paid: true,
    feature: set.level === "C1" ? "c1" : "pruefungssaetze",
    scoredItems: set.modules.flatMap((m) => m.parts.filter(isScored).flatMap((p) => p.items)).length,
    minutes: examMinutes(set.modules),
    modules: set.modules.map((m) => ({ key: m.key, name: m.name, minutes: m.minutes ?? 0, ...(m.timerLabel ? { timerLabel: m.timerLabel } : {}), parts: m.parts.length })),
  };
});

const dtz = jsonIn(path.join(PAID, "pruefungen/dtz")).map((f) => {
  const set = read(path.join(PAID, "pruefungen/dtz", f));
  return {
    id: f.replace(/\.json$/, ""),
    label: set.label ?? set.meta?.title ?? f.replace(/\.json$/, ""),
    paid: true,
    feature: "pruefungssaetze",
    parts: (set.parts ?? []).length,
    // Scored items, counted like dtzTrainer.js's qidsOfPart: items, dialog groups, texts.
    items: (set.parts ?? []).reduce(
      (n, p) => n + (p.items?.length ?? (p.groups ?? p.texts ?? []).reduce((m, g) => m + (g.questions?.length ?? 0), 0)),
      0,
    ),
  };
});

const manifestPath = path.join(ROOT, "src/data/pruefungen/paid-manifest.json");
const manifest = JSON.stringify({ saetze, dtz }, null, 2) + "\n";
if (!existsSync(manifestPath) || readFileSync(manifestPath, "utf8") !== manifest) {
  writeFileSync(manifestPath, manifest);
  console.log("  paid-manifest.json aktualisiert.");
}

// ── 3. Publish src/paid/** as public/inhalt/** ───────────────────────────────────────────
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(PAID, OUT, { recursive: true, filter: (src) => !src.endsWith(".md") });
for (const f of jsonIn(path.join(OUT, "pruefungen/saetze"))) {
  const p = path.join(OUT, "pruefungen/saetze", f);
  const set = read(p);
  writeFileSync(p, JSON.stringify({ ...set, audio: audioMap(set) }));
}

// DTZ sets: the same audio fields src/pages/dtz/uebungssatz.astro adds to the free set
// (withAudio there): public/audio/pruefungen/dtz-<NN>/<part>-<id>.mp3, Teil 3 per dialogue.
for (const f of jsonIn(path.join(OUT, "pruefungen/dtz"))) {
  const p = path.join(OUT, "pruefungen/dtz", f);
  const s = read(p);
  const dir = `dtz-${s.id.replace(/\D/g, "").padStart(2, "0")}`;
  let all = true;
  const put = (obj, clip) => {
    const href = `/audio/pruefungen/${dir}/${clip}.mp3`;
    if (existsSync(path.join(ROOT, "public", href))) obj.audio = href;
    else all = false;
  };
  for (const part of s.parts.filter((x) => x.group === "Hören")) {
    if (part.type === "dialog") part.groups.forEach((g, i) => put(g, `${part.key}-dialog-${i + 1}`));
    else {
      if (part.example) put(part.example, `${part.key}-bsp`);
      part.items.forEach((it) => put(it, `${part.key}-${it.id}`));
    }
  }
  s.hasAllAudio = all;
  writeFileSync(p, JSON.stringify(s));
}

if (problems.length) {
  console.error("build-paid-manifest:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`build-paid-manifest ok: ${saetze.length} Übungssätze, ${dtz.length} DTZ-Sätze, ${jsonIn(path.join(PAID, "grammatik")).length} Grammatikthemen → public/inhalt/`);
