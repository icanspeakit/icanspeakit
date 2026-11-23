#!/usr/bin/env node
// Voices three groups of French text with Azure neural TTS (fr-FR-DeniseNeural), one mp3 each:
//   saetze    the flashcard example sentences  -> public/audio/saetze/<satzSlug(text)>.mp3
//   check     /verification-prononciation sentences    -> public/audio/aussprache-check/<id>.mp3
//   mock      the five landing-page demo clips -> public/audio/aussprache/<slug>.mp3
//   twisters  /virelangues                   -> public/audio/zungenbrecher/<id>.mp3 and <id>-langsam.mp3 (slow)
// Files that already exist are skipped, so it can be stopped and rerun. For `check` and
// `twisters` it also sets "audio": true in the data file once the files exist (the pages only
// offer the recorded voice then; until then the browser voice reads the text).
//
//   node apps/french/scripts/generate-sentence-audio.mjs [saetze|check|twisters|mock|redemittel|redewendungen|all] [--limit N] [--force] [--concurrency 8]
// Needs AZURE_SPEECH_KEY / AZURE_SPEECH_REGION in the repo-root .env.local and ffmpeg on PATH.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { satzSlug, slugify } from "../src/lib/audioSlug.js";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(APP, "..", "..");
const args = process.argv.slice(2);
const part = args.find((a) => !a.startsWith("--") && isNaN(Number(a))) ?? "all";
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const LIMIT = Number(opt("limit") ?? Infinity);
const FORCE = args.includes("--force");
const CONCURRENCY = Number(opt("concurrency") ?? 8);
const VOICE = "fr-FR-DeniseNeural";

for (const line of readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: REGION } = process.env;
if (!KEY || !REGION) { console.error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION missing in .env.local"); process.exit(1); }

const readJson = (rel) => JSON.parse(readFileSync(path.join(APP, rel), "utf8"));
const xml = (s) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
const out = (...p) => path.join(APP, "public", "audio", ...p);

// jobs: file -> { text, rate }
const jobs = new Map();
const add = (file, text, rate = "-5%") => { if (text && !jobs.has(file)) jobs.set(file, { text, rate }); };

if (part === "saetze" || part === "all") {
  const dir = path.join(APP, "src", "content", "lexicon");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort())
    for (const u of JSON.parse(readFileSync(path.join(dir, f), "utf8")).units ?? [])
      for (const e of u.words ?? []) add(out("saetze", `${satzSlug(e.example ?? "")}.mp3`), e.example);
}
// The five landing-page demo clips in src/components/mocks/UebungenMock.astro (PRON).
if (part === "mock" || part === "all")
  for (const [slug, text] of [["a-mon-avis", "À mon avis,"], ["tu-tout", "tu, tout"], ["merci", "Merci"], ["le-pain", "le pain"], ["ca-va", "Ça va ?"]])
    add(out("aussprache", `${slug}.mp3`), text);
// The hand-picked phrases on /prononciation (src/data/wortschatz.json) -> public/audio/aussprache/<slugify(front)>.mp3
if (part === "mock" || part === "all")
  for (const w of readJson("src/data/wortschatz.json")) add(out("aussprache", `${slugify(w.front)}.mp3`), w.front);
// Redemittel phrases -> public/audio/redemittel/<satzSlug(phrase)>.mp3
if (part === "redemittel" || part === "all")
  for (const set of readJson("src/data/redemittel.json").sets)
    for (const p of set.phrases) add(out("redemittel", `${satzSlug(p.de)}.mp3`), p.de);
// Idioms (/savoirs/expressions): <id>.mp3 for the phrase, <id>-bsp-<n>.mp3 for each example (n from 1)
if (part === "redewendungen" || part === "all")
  for (const e of readJson("src/data/redewendungen.json").eintraege) {
    add(out("redewendungen", `${e.id}.mp3`), e.de);
    (e.bsp ?? []).forEach((b, i) => add(out("redewendungen", `${e.id}-bsp-${i + 1}.mp3`), b));
  }
const sentencesOf = (data) => data.levels.flatMap((l) => l.sentences);
// Word traps (/savoirs/faux-amis): <id>-falsch, <id>-richtig and <id>-q<n> (quiz sentence with the right option filled in)
const wfText = (t) => t.replace(/\*/g, "");
if (part === "wortfallen" || part === "all")
  for (const g of readJson("src/data/wortfallen.json").groups) {
    add(out("wortfallen", `${g.id}-falsch.mp3`), wfText(g.oops));
    add(out("wortfallen", `${g.id}-richtig.mp3`), wfText(g.right));
    g.quiz.forEach((q, n) => add(out("wortfallen", `${g.id}-q${n + 1}.mp3`), q.s.replace("___", q.a)));
  }
if (part === "check" || part === "all")
  for (const s of sentencesOf(readJson("src/data/aussprache-check.json"))) add(out("aussprache-check", `${s.id}.mp3`), s.text);
if (part === "twisters" || part === "all")
  for (const s of sentencesOf(readJson("src/data/zungenbrecher.json"))) {
    add(out("zungenbrecher", `${s.id}.mp3`), s.text, "-5%");
    add(out("zungenbrecher", `${s.id}-langsam.mp3`), s.text, "-40%");
  }

for (const f of jobs.keys()) mkdirSync(path.dirname(f), { recursive: true });
const todo = [...jobs].filter(([f]) => FORCE || !existsSync(f)).slice(0, LIMIT);
console.log(`${part}: ${jobs.size} files, ${todo.length} to voice with ${VOICE}`);

async function tts({ text, rate }) {
  const ssml = `<speak version="1.0" xml:lang="fr-FR"><voice name="${VOICE}"><prosody rate="${rate}">${xml(text)}</prosody></voice></speak>`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": KEY, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "french-sentence-audio" },
      body: ssml,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if ((res.status === 429 || res.status >= 500) && attempt < 6) { await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); continue; }
    throw new Error(`${res.status} ${await res.text()}`);
  }
}

// Trim Azure's leading and trailing silence to a short, even margin (same filter as generate-vocab-audio.mjs).
const HAS_FFMPEG = spawnSync("ffmpeg", ["-version"]).status === 0;
const TRIM = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=60:all=1,apad=pad_dur=0.2";
const trim = (mp3) => {
  if (!HAS_FFMPEG) return mp3;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", "pipe:0", "-af", TRIM, "-ac", "1", "-ar", "24000", "-b:a", "48k", "-f", "mp3", "pipe:1"], { input: mp3, maxBuffer: 1 << 24 });
  return r.status === 0 && r.stdout.length > 1000 ? r.stdout : mp3;
};

let done = 0, next = 0;
const failed = [];
async function worker() {
  while (next < todo.length) {
    const [file, job] = todo[next++];
    try { writeFileSync(file, trim(await tts(job))); }
    catch (err) { failed.push(file); console.error(`✗ ${path.basename(file)} (${job.text}): ${err.message}`); }
    if (++done % 100 === 0 || done === todo.length) console.log(`${done}/${todo.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Mark the data files: "audio": true for every entry whose files now exist. A text replace on
// the id's own object keeps the files' layout (no reformatting diff).
function stamp(rel, files) {
  const file = path.join(APP, rel);
  let src = readFileSync(file, "utf8");
  let n = 0;
  for (const s of sentencesOf(JSON.parse(src))) {
    if (!files(s).every(existsSync)) continue;
    const re = new RegExp(`("id":\\s*"${s.id}"(?:(?!"id"\\s*:)[\\s\\S])*?"audio":\\s*)false`);
    if (re.test(src)) { src = src.replace(re, "$1true"); n++; }
  }
  writeFileSync(file, src);
  console.log(`${rel}: ${n} entries marked audio:true`);
}
if (part === "check" || part === "all") stamp("src/data/aussprache-check.json", (s) => [out("aussprache-check", `${s.id}.mp3`)]);
if (part === "twisters" || part === "all") stamp("src/data/zungenbrecher.json", (s) => [out("zungenbrecher", `${s.id}.mp3`), out("zungenbrecher", `${s.id}-langsam.mp3`)]);
if (part === "wortfallen" || part === "all") {
  const file = path.join(APP, "src/data/wortfallen.json");
  let src = readFileSync(file, "utf8"), n = 0;
  for (const g of JSON.parse(src).groups) {
    const files = [`${g.id}-falsch`, `${g.id}-richtig`, ...g.quiz.map((_, i) => `${g.id}-q${i + 1}`)].map((f) => out("wortfallen", `${f}.mp3`));
    if (!files.every(existsSync)) continue;
    const re = new RegExp(`("id":\\s*"${g.id}"(?:(?!"id"\\s*:)[\\s\\S])*?"audio":\\s*)false`);
    if (re.test(src)) { src = src.replace(re, "$1true"); n++; }
  }
  writeFileSync(file, src);
  console.log(`src/data/wortfallen.json: ${n} groups marked audio:true`);
}

if (failed.length) { console.error(`${failed.length} failed`); process.exit(1); }
