// File names for the Ausspracheübungen nach Muttersprache (/culture/mistakes): one mp3 per
// word or sentence, shared between the drills that use it. Plain ESM with no imports, so
// scripts/generate-muttersprache-audio.mjs and the page compute the same name.
export const DRILL_AUDIO_DIR = "/audio/muttersprache";

// An accent changes an Italian word (papa, papà; e, è; da, dà), so it stays in the name: a
// recording of one must never be played for the other. è/é and ò/ó get their own codes.
const ACCENTED = { à: "a1", è: "e1", é: "e2", ì: "i1", í: "i2", ò: "o1", ó: "o2", ù: "u1", ú: "u2" };

export function drillSlug(text) {
  const base = text
    .toLowerCase()
    .replace(/[àèéìíòóùú]/g, (c) => ACCENTED[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  // A capitalised word gets its own name: a name is read differently from a word.
  return /^[A-ZÀÈÉÌÒÙ]/.test(text) ? `${base}-c` : base;
}

/** Every text a drill speaks: both words of each pair, the single words, the sentence. */
export function drillTexts(drill) {
  return [...(drill.pairs ?? []).flat(), ...(drill.words ?? []), drill.sentence].filter(Boolean);
}
