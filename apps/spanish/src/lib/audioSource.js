// Where an audio file actually comes from. The one resolver for every "/audio/…" path
// (ANDROID-APP-TIERED-PROMPT.md, Tier 2). Next to audioSlug.js, which names the files.
//
// On the website every path is served by the site itself, so the answer is always the path
// as given.
//
// In the Android app (PUBLIC_TARGET=app), in this order:
//   1. bundled    — in the app itself (/audio-manifest.json, written by scripts/build-app.mjs:
//                   A1 words and sentences, everything that is not lexicon audio);
//   2. downloaded — in an audio pack the learner downloaded (src/lib/audioPacks.js);
//   3. network    — https://icanspeak.it/spanish, same path. Works online; offline it fails the
//                   way a missing file always has, and the players fall back to speech.
// src/lib/appShell.js routes every audio source a page sets through audioUrl(), so no page
// has to know.
import { downloadedUrl, initPacks } from "./audioPacks.js";
import { withBase } from "./paths.js";

const APP = import.meta.env.PUBLIC_TARGET === "app";
const SITE = "https://icanspeak.it/spanish";

/** @type {Set<string> | null} null until the manifest is loaded (or when it cannot be). */
let bundled = null;

/** Loads the app's list of bundled audio and the pack state. Called once at app start. */
export async function loadAudioManifest() {
  if (!APP) return;
  try {
    const res = await fetch(withBase("/audio-manifest.json"));
    if (res.ok) bundled = new Set(await res.json());
  } catch {}
  await initPacks();
}

/**
 * The URL to play for a site audio path such as "/audio/wortschatz/der-hund.mp3".
 * Anything that is not an "/audio/" path is returned unchanged.
 * @param {string} path
 */
export function audioUrl(path) {
  if (!APP) return withBase(path);
  if (typeof path !== "string" || !path.startsWith("/audio/")) return path;
  const clean = path.split(/[?#]/)[0];
  // Before the manifest has loaded, assume the file is in the app: most are.
  if (!bundled || bundled.has(clean)) return path;
  return downloadedUrl(clean) ?? SITE + path;
}
