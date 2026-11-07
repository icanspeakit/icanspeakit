// The Hören recordings of the exam sets (Start Deutsch 1, DTZ), made by
// scripts/generate-exam-hoeren-audio.mjs into public/audio/pruefungen/<set>/<clip>.mp3.
// Build time only: a page asks for its clips, and a clip that has not been generated is
// simply absent — the item then keeps just its transcript, as before.
import { existsSync } from "node:fs";
import path from "node:path";

/** `/audio/pruefungen/<set>/<clip>.mp3` if that file exists, else null. */
export function examClip(set, clip) {
  const href = `/audio/pruefungen/${set}/${clip}.mp3`;
  return existsSync(path.join(process.cwd(), "public", href)) ? href : null;
}

/** { clip: href } for the clips of `set` that exist. */
export function examClips(set, clips) {
  return Object.fromEntries(clips.map((c) => [c, examClip(set, c)]).filter(([, href]) => href));
}
