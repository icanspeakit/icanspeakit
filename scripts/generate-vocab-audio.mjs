#!/usr/bin/env node
// Voices every lexicon word with Azure neural TTS:
//   apps/<app>/src/content/lexicon/*.json  →  apps/<app>/public/audio/wortschatz/<audio>.mp3
// The text is spokenForm() from src/lib/lexicon.js: nouns with their article ("a name",
// "el nombre"), everything else the bare lemma. Files that already exist are skipped, so
// the script can be stopped and rerun.
//
// Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in the repo-root .env.local.
//
//   node scripts/generate-vocab-audio.mjs english [--limit 20] [--force] [--voice en-GB-RyanNeural]
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VOICES = {
  english: { lang: "en-GB", voice: "en-GB-SoniaNeural" },
  spanish: { lang: "es-ES", voice: "es-ES-ElviraNeural" },
};

const args = process.argv.slice(2);
const app = args.find((a) => !a.startsWith("--"));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = Number(opt("limit") ?? Infinity);
const FORCE = args.includes("--force");
const CONCURRENCY = Number(opt("concurrency") ?? 4);

if (!VOICES[app]) {
  console.error(`usage: generate-vocab-audio.mjs <${Object.keys(VOICES).join("|")}> [--limit N] [--force] [--voice NAME]`);
  process.exit(1);
}
const { lang } = VOICES[app];
const voice = opt("voice") ?? VOICES[app].voice;

// .env.local: no dependency for a two-line file.
for (const line of readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
if (!KEY || !REGION) {
  console.error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION missing in .env.local");
  process.exit(1);
}

const spokenForm = (e) => (e.pos === "noun" && e.gender ? `${e.gender} ${e.lemma}` : e.lemma);
const xml = (s) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

const lexDir = path.join(ROOT, "apps", app, "src", "content", "lexicon");
const outDir = path.join(ROOT, "apps", app, "public", "audio", "wortschatz");
mkdirSync(outDir, { recursive: true });

// One job per audio file; the first entry with a given slug wins (a few English slugs repeat).
const jobs = new Map();
for (const f of readdirSync(lexDir).filter((f) => f.endsWith(".json")).sort()) {
  const lex = JSON.parse(readFileSync(path.join(lexDir, f), "utf8"));
  for (const unit of lex.units ?? [])
    for (const e of unit.words ?? [])
      if (e.audio && !jobs.has(e.audio)) jobs.set(e.audio, spokenForm(e));
}

const todo = [...jobs].filter(([slug]) => FORCE || !existsSync(path.join(outDir, `${slug}.mp3`))).slice(0, LIMIT);
console.log(`${app}: ${jobs.size} words, ${todo.length} to voice with ${voice}`);

async function tts(text) {
  const ssml = `<speak version="1.0" xml:lang="${lang}"><voice name="${voice}"><prosody rate="-5%">${xml(text)}</prosody></voice></speak>`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "vocab-audio",
      },
      body: ssml,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${res.status} ${await res.text()}`);
  }
}

// Azure pads ~0.2 s before and ~0.9 s after the word; trim both to a short, even margin so
// chained clips (word, then example) follow each other quickly. Skipped without ffmpeg.
const { spawnSync } = await import("node:child_process");
const HAS_FFMPEG = spawnSync("ffmpeg", ["-version"]).status === 0;
const TRIM = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=60:all=1,apad=pad_dur=0.2";
function trim(mp3) {
  if (!HAS_FFMPEG) return mp3;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", "pipe:0", "-af", TRIM, "-ac", "1", "-ar", "24000", "-b:a", "48k", "-f", "mp3", "pipe:1"], { input: mp3, maxBuffer: 1 << 24 });
  return r.status === 0 && r.stdout.length > 1000 ? r.stdout : mp3;
}
if (!HAS_FFMPEG) console.warn("ffmpeg not found: files keep Azure's silence");

let done = 0;
const failed = [];
let next = 0;
async function worker() {
  while (next < todo.length) {
    const [slug, text] = todo[next++];
    try {
      writeFileSync(path.join(outDir, `${slug}.mp3`), trim(await tts(text)));
    } catch (err) {
      failed.push(slug);
      console.error(`✗ ${slug} (${text}): ${err.message}`);
    }
    if (++done % 100 === 0 || done === todo.length) console.log(`${done}/${todo.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
if (failed.length) {
  console.error(`${failed.length} failed: ${failed.slice(0, 20).join(", ")}${failed.length > 20 ? " …" : ""}`);
  process.exit(1);
}
