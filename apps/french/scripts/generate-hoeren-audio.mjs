// Renders the listening clips in src/data/hoeren.json to public/audio/hoeren/<id>.mp3 with
// Azure neural TTS (ported from the deutschacademy generator; ElevenLabs is deliberately not
// used here).
//
// Why one request per turn: a dialogue has two speakers and Azure takes one voice per
// request. Each turn is rendered with its speaker's voice (hoeren.json `voices[speaker].azure`)
// and the turns are joined with a short silence, which is what makes a dialogue sound like
// two people instead of one person reading a script. The join is ffmpeg's concat demuxer with
// `-c copy`: every clip comes back from Azure in the same format and the silence is made to
// match, so nothing is re-encoded.
//
// The page (src/lib/hoeren.js) reads public/audio/hoeren/manifest.json for the real length,
// so it never advertises a duration the file does not have. A partial run still writes the
// manifest for the clips it finished.
//
//   pnpm generate:hoeren                      # only texts that have no mp3 yet
//   pnpm generate:hoeren -- --force           # re-render everything
//   pnpm generate:hoeren -- --only a1-ansage-bahnhof
//   pnpm generate:hoeren -- --dry             # no API calls: print what it would cost
//
// Needs AZURE_SPEECH_KEY / AZURE_SPEECH_REGION (the script reads ../../.env.local via
// `node --env-file`) and ffmpeg + ffprobe on PATH.
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import hoeren from "../src/data/hoeren.json" with { type: "json" };

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY = args.includes("--dry");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
// The free F0 tier allows 20 requests a minute, so calls go one at a time, spaced apart.
// Set AZURE_TTS_INTERVAL_MS lower on a paid S0 resource.
const INTERVAL_MS = Number(process.env.AZURE_TTS_INTERVAL_MS) || 3100;
// Same format the silence below is built in, so the concat can stay `-c copy`.
const FORMAT = "audio-24khz-48kbitrate-mono-mp3";
// Long enough to hear the speaker change, short enough that a short Ansage is not padded.
const GAP_SECONDS = 0.45;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "audio", "hoeren");

const texts = hoeren.texts.filter((t) => !ONLY || t.id === ONLY);
if (ONLY && !texts.length) {
  console.error(`No text with id "${ONLY}". Known ids:\n  ${hoeren.texts.map((t) => t.id).join("\n  ")}`);
  process.exit(1);
}

const pending = texts.filter((t) => FORCE || !existsSync(path.join(outDir, `${t.id}.mp3`)));
const charsOf = (t) => t.script.reduce((m, s) => m + s.text.length, 0);
const chars = pending.reduce((n, t) => n + charsOf(t), 0);

console.log(`${texts.length} texts, ${pending.length} to render, ${chars} characters (Azure, free up to 500,000 a month).`);
if (DRY) {
  for (const t of pending) console.log(`  ${t.id.padEnd(30)} ${String(t.script.length).padStart(2)} turns  ${String(charsOf(t)).padStart(5)} chars`);
  process.exit(0);
}
if (!pending.length) {
  console.log("Nothing to do. --force re-renders everything.");
  process.exit(0);
}
if (!KEY || !REGION) {
  console.error("Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION in .env.local.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const xml = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let last = 0;
let charsSent = 0;
async function synthesise(text, voice, attempt = 0) {
  const wait = last + INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  // Normal speed: this is exam practice, and an announcement at the real pace is the point.
  const ssml = `<speak version="1.0" xml:lang="fr-FR"><voice name="${voice}"><prosody rate="0%">${xml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": FORMAT,
      "User-Agent": "icanspeak-hoeren-audio",
    },
    body: ssml,
  });
  if (res.status === 429 && attempt < 5) {
    await sleep(5000 * 2 ** attempt);
    return synthesise(text, voice, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Azure TTS ${res.status}: ${body.slice(0, 300)}`);
  }
  charsSent += text.length;
  return Buffer.from(await res.arrayBuffer());
}

const ffmpeg = (a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a]);
const seconds = (file) =>
  Math.round(
    parseFloat(
      execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]).toString().trim(),
    ),
  );

const tmp = path.join(os.tmpdir(), `ics-hoeren-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const silence = path.join(tmp, "gap.mp3");
ffmpeg(["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", String(GAP_SECONDS), "-b:a", "48k", silence]);

const manifestPath = path.join(outDir, "manifest.json");
const durations = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

let done = 0;
try {
  for (const text of pending) {
    process.stdout.write(`${text.id} (${text.script.length} turns) `);
    const parts = [];
    for (const [i, turn] of text.script.entries()) {
      const voice = hoeren.voices[turn.speaker]?.azure;
      if (!voice) throw new Error(`${text.id}: speaker "${turn.speaker}" has no azure voice in hoeren.json`);
      const file = path.join(tmp, `${text.id}-${String(i).padStart(2, "0")}.mp3`);
      writeFileSync(file, await synthesise(turn.text, voice));
      parts.push(file);
      process.stdout.write(".");
    }
    // The concat demuxer wants `file '<path>'` lines, single quotes escaped.
    const listFile = path.join(tmp, `${text.id}.txt`);
    const withGaps = parts.flatMap((p, i) => (i ? [silence, p] : [p]));
    const quote = (p) => `file '${p.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`;
    writeFileSync(listFile, withGaps.map(quote).join("\n"));
    const outPath = path.join(outDir, `${text.id}.mp3`);
    ffmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outPath]);
    durations[text.id] = seconds(outPath);
    console.log(` ok ${durations[text.id]}s`);
    done++;
  }
} catch (err) {
  console.log(" FAILED");
  console.error(err.message);
  process.exitCode = 1;
} finally {
  writeFileSync(manifestPath, JSON.stringify(durations, null, 2) + "\n");
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n${done} texts rendered to public/audio/hoeren/, ${charsSent} characters sent to Azure.`);
