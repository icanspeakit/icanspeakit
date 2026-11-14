// File names for the Ausspracheübungen nach Muttersprache (/culture/mistakes): one mp3 per
// word or sentence, shared between the drills that use it. Plain ESM with no imports, so
// scripts/generate-muttersprache-audio.mjs and the page compute the same name.
export const DRILL_AUDIO_DIR = "/audio/muttersprache";

// An accent changes a French word (pêcheur, pécheur; a, à; ou, où), so it stays in the name: a
// recording of one must never be played for the other.
const ACCENTED = { à: "a1", â: "a2", é: "e1", è: "e2", ê: "e3", ë: "e4", î: "i1", ï: "i2", ô: "o1", ù: "u1", û: "u2", ü: "u3", ç: "c1", œ: "oe", æ: "ae" };

export function drillSlug(text) {
  const base = text
    .toLowerCase()
    .replace(/[àâéèêëîïôùûüçœæ]/g, (c) => ACCENTED[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  // A capitalised word gets its own name: a name is read differently from a word.
  return /^[A-ZÀÂÇÉÈÊËÎÏÔÙÛŒ]/.test(text) ? `${base}-c` : base;
}

/** Every text a drill speaks: both words of each pair, the single words, the sentence. */
export function drillTexts(drill) {
  return [...(drill.pairs ?? []).flat(), ...(drill.words ?? []), drill.sentence].filter(Boolean);
}
