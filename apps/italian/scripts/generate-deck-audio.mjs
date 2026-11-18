#!/usr/bin/env node
// Voices what the flashcard decks outside the lexicon need (Azure it-IT-ElsaNeural), one mp3 each:
//   berufe      own words of src/data/berufe, patente, business-italian  -> public/audio/berufe/<id>.mp3
//   saetze      their example sentences (and any ref's own example)      -> public/audio/saetze/<satzSlug>.mp3
//   redemittel  src/data/redemittel.json phrases                         -> public/audio/redemittel/<satzSlug>.mp3
//   idioms      src/data/redewendungen.json phrase + examples            -> public/audio/redewendungen/<id>[-bsp-n].mp3
//   phrases     src/data/wortschatz.json (pronunciation page phrases)    -> public/audio/aussprache/<slug>.mp3
// Existing files are skipped; rerun after adding content.
//
//   node apps/italian/scripts/generate-deck-audio.mjs [berufe|saetze|redemittel|idioms|phrases|all] [--limit N] [--force] [--concurrency 4]
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
const CONCURRENCY = Math.min(4, Number(opt("concurrency") ?? 4));
const VOICE = "it-IT-ElsaNeural";

const readJson = (rel) => JSON.parse(readFileSync(path.join(APP, rel), "utf8"));
const out = (...p) => path.join(APP, "public", "audio", ...p);
const xml = (s) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
const spoken = (w) => (w.pos === "noun" && w.gender && !w.pluralOnly ? `${w.gender}${/['’]$/.test(w.gender) ? "" : " "}${w.lemma}` : w.lemma);

const jobs = new Map();
const add = (file, text, rate = "-5%") => { if (text && !jobs.has(file)) jobs.set(file, { text, rate }); };

const dirJson = (d) => readdirSync(path.join(APP, d)).filter((f) => f.endsWith(".json")).sort().map((f) => readJson(`${d}/${f}`));
const decks = [...dirJson("src/data/berufe"), ...dirJson("src/data/patente"), ...dirJson("src/data/business-italian").map((u) => ({ groups: [{ words: u.words ?? [] }] }))];
const deckWords = decks.flatMap((d) => (d.groups ?? []).flatMap((g) => g.words ?? []));

if (part === "berufe" || part === "all")
  for (const w of deckWords) if (!w.ref && w.id && w.lemma) add(out("berufe", `${w.id}.mp3`), spoken(w), "-10%");
if (part === "saetze" || part === "all")
  for (const w of deckWords) if (w.example) add(out("saetze", `${satzSlug(w.example)}.mp3`), w.example);
if (part === "redemittel" || part === "all")
  for (const s of readJson("src/data/redemittel.json").sets) for (const p of s.phrases) add(out("redemittel", `${satzSlug(p.de)}.mp3`), p.de);
if (part === "idioms" || part === "all")
  for (const e of readJson("src/data/redewendungen.json").eintraege) {
    add(out("redewendungen", `${e.id}.mp3`), e.de);
    (e.bsp ?? []).forEach((b, i) => add(out("redewendungen", `${e.id}-bsp-${i + 1}.mp3`), b));
  }
if (part === "phrases" || part === "all")
  for (const w of readJson("src/data/wortschatz.json")) add(out("aussprache", `${slugify(w.front)}.mp3`), w.front);

for (const f of jobs.keys()) mkdirSync(path.dirname(f), { recursive: true });
const todo = [...jobs].filter(([f]) => FORCE || !existsSync(f)).slice(0, LIMIT);
console.log(`${part}: ${jobs.size} files, ${todo.length} to voice with ${VOICE}`);
if (!todo.length) process.exit(0);

for (const line of readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: REGION } = process.env;
if (!KEY || !REGION) { console.error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION missing in .env.local"); process.exit(1); }

async function tts({ text, rate }) {
  const ssml = `<speak version="1.0" xml:lang="it-IT"><voice name="${VOICE}"><prosody rate="${rate}">${xml(text)}</prosody></voice></speak>`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": KEY, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "italian-deck-audio" },
      body: ssml,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if ((res.status === 429 || res.status >= 500) && attempt < 6) { await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); continue; }
    throw new Error(`${res.status} ${await res.text()}`);
  }
}

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
    catch (err) { failed.push(file); console.error(`x ${path.basename(file)} (${job.text}): ${err.message}`); }
    if (++done % 100 === 0 || done === todo.length) console.log(`${done}/${todo.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
if (failed.length) { console.error(`${failed.length} failed`); process.exit(1); }
