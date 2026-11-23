#!/usr/bin/env node
// Audit: every audio file a course app references vs. what exists under apps/<app>/public/audio.
//
//   node scripts/audit-audio.mjs [app ...] [--no-write]
//
// Per app it collects references from
//   - the lexicon (words[].audio -> wortschatz, words[].example -> saetze via the app's satzSlug)
//   - the feature data files (aussprache-check, zungenbrecher, redemittel, redewendungen,
//     wortfallen, hoeren), using the same file-name rules as the pages and generator scripts
//   - literal "/audio/....mp3" paths anywhere in src (components, pages, lib, JSON), reported as
//     feature "other" unless a feature rule already covers the path
// and reports the ones with no file. The full lists go to reports/missing-<app>.txt.
// Note: several pages fall back to the browser voice when a clip is missing, so "missing" means
// "not voiced yet", not necessarily "404".
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPS = ["english", "spanish", "french", "italian", "portuguese"];
const FEATURES = ["vocab", "sentences", "pronunciation", "tongue-twisters", "phrases", "idioms", "word-traps", "listening", "grammar", "other"];

const argv = process.argv.slice(2);
const NO_WRITE = argv.includes("--no-write");
const apps = argv.filter((a) => !a.startsWith("--"));
if (!apps.length) apps.push(...APPS);

const readJson = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

// The German-origin slug for tongue-twister dialect clips (pages/tongue-twisters.astro).
const dialectSlug = (s) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function auditApp(app) {
  const appDir = path.join(ROOT, "apps", app);
  const src = path.join(appDir, "src");
  const data = path.join(src, "data");
  const pub = path.join(appDir, "public");
  const refs = new Map(); // url path -> { feature, from }
  const add = (feature, url, from) => {
    if (!refs.has(url)) refs.set(url, { feature, from });
  };

  const slugMod = await import(new URL(`../apps/${app}/src/lib/audioSlug.js`, import.meta.url).href);
  const { satzSlug } = slugMod;

  // vocab + sentences
  const lexDir = path.join(src, "content", "lexicon");
  if (existsSync(lexDir))
    for (const f of readdirSync(lexDir).filter((f) => f.endsWith(".json"))) {
      const lex = readJson(path.join(lexDir, f));
      for (const unit of lex.units ?? [])
        for (const e of unit.words ?? []) {
          if (e.audio) add("vocab", `/audio/wortschatz/${e.audio}.mp3`, `lexicon/${f}:${e.lemma}`);
          if (e.example) add("sentences", `/audio/saetze/${satzSlug(e.example)}.mp3`, `lexicon/${f}:${e.lemma}`);
        }
    }

  // pronunciation check
  for (const lv of readJson(path.join(data, "aussprache-check.json"))?.levels ?? [])
    for (const s of lv.sentences ?? []) add("pronunciation", `/audio/aussprache-check/${s.id}.mp3`, `aussprache-check.json:${s.id}`);

  // tongue twisters
  for (const lv of readJson(path.join(data, "zungenbrecher.json"))?.levels ?? [])
    for (const s of lv.sentences ?? []) {
      add("tongue-twisters", `/audio/zungenbrecher/${s.id}.mp3`, `zungenbrecher.json:${s.id}`);
      add("tongue-twisters", `/audio/zungenbrecher/${s.id}-langsam.mp3`, `zungenbrecher.json:${s.id}`);
      if (s.dialect?.name) add("tongue-twisters", `/audio/zungenbrecher/${s.id}-${dialectSlug(s.dialect.name)}.mp3`, `zungenbrecher.json:${s.id}`);
    }

  // phrases (Redemittel)
  for (const set of readJson(path.join(data, "redemittel.json"))?.sets ?? [])
    for (const p of set.phrases ?? []) add("phrases", `/audio/redemittel/${satzSlug(p.de)}.mp3`, `redemittel.json:${set.id}`);

  // idioms: <id>.mp3 and <id>-bsp-<n>.mp3
  for (const e of readJson(path.join(data, "redewendungen.json"))?.eintraege ?? []) {
    add("idioms", `/audio/redewendungen/${e.id}.mp3`, `redewendungen.json:${e.id}`);
    (e.bsp ?? []).forEach((_, i) => add("idioms", `/audio/redewendungen/${e.id}-bsp-${i + 1}.mp3`, `redewendungen.json:${e.id}`));
  }

  // word traps: <group>-q<n>.mp3 (the page only uses it once the group's `audio` flag is set)
  for (const g of readJson(path.join(data, "wortfallen.json"))?.groups ?? [])
    (g.quiz ?? []).forEach((_, n) => add("word-traps", `/audio/wortfallen/${g.id}-q${n + 1}.mp3`, `wortfallen.json:${g.id}`));

  // listening
  for (const t of readJson(path.join(data, "hoeren.json"))?.texts ?? []) add("listening", `/audio/hoeren/${t.id}.mp3`, `hoeren.json:${t.id}`);

  // literal paths anywhere in src (string literals, JSON values, markdown)
  const lit = /\/audio\/[A-Za-z0-9_\-./%]+?\.(?:mp3|ogg|wav|m4a)\b/g;
  for (const f of walk(src)) {
    if (!/\.(astro|js|mjs|ts|tsx|json|md|mdx|svelte|css)$/.test(f)) continue;
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(lit)) {
      const u = decodeURI(m[0]);
      add(u.startsWith("/audio/grammatik/") ? "grammar" : "other", u, path.relative(appDir, f).replaceAll("\\", "/"));
    }
  }

  const exists = (url) => existsSync(path.join(pub, url.replace(/^\//, "")));
  const stats = Object.fromEntries(FEATURES.map((f) => [f, { total: 0, missing: 0 }]));
  const missing = [];
  for (const [url, { feature, from }] of refs) {
    stats[feature].total++;
    if (!exists(url)) {
      stats[feature].missing++;
      missing.push({ feature, url, from });
    }
  }
  return { app, stats, missing, total: refs.size };
}

const results = [];
for (const app of apps) {
  if (!existsSync(path.join(ROOT, "apps", app))) {
    console.error(`no such app: ${app}`);
    continue;
  }
  const r = await auditApp(app);
  results.push(r);
  console.log(`\n${app}: ${r.total} references, ${r.missing.length} missing`);
  for (const f of FEATURES) {
    const s = r.stats[f];
    if (s.total) console.log(`  ${f.padEnd(16)} ${String(s.missing).padStart(6)} missing / ${s.total}`);
  }
  if (!NO_WRITE) {
    const dir = path.join(ROOT, "reports");
    mkdirSync(dir, { recursive: true });
    const lines = r.missing.sort((a, b) => a.feature.localeCompare(b.feature) || a.url.localeCompare(b.url)).map((m) => `${m.feature}\t${m.url}\t${m.from}`);
    writeFileSync(path.join(dir, `missing-${app}.txt`), `# ${app}: ${r.missing.length} missing of ${r.total} referenced (feature<TAB>url<TAB>referenced from)\n${lines.join("\n")}\n`);
  }
}
process.exitCode = results.some((r) => r.missing.length) ? 1 : 0;
