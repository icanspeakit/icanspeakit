// File names for the Ausspracheübungen nach Muttersprache (/culture/mistakes): one mp3 per
// word or sentence, shared between the drills that use it. Plain ESM with no imports, so
// scripts/generate-muttersprache-audio.mjs and the page compute the same name.
export const DRILL_AUDIO_DIR = "/audio/muttersprache";

export function drillSlug(text) {
  const base = text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  // Case matters in German ("Rad" vs "rad" does not occur here, but "Arm"/"arm" would),
  // so a capitalised word gets its own name.
  return /^[A-ZÄÖÜ]/.test(text) ? `${base}-c` : base;
}

/** Every text a drill speaks: both words of each pair, the single words, the sentence. */
export function drillTexts(drill) {
  return [...(drill.pairs ?? []).flat(), ...(drill.words ?? []), drill.sentence].filter(Boolean);
}
