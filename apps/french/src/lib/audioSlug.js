// French letters (docs/content-plan.md §1.2): accents folded, ç → c, œ → oe, æ → ae; apostrophe
// and space become "-" below (aujourd'hui → aujourd-hui, s'appeler → s-appeler).
// ñ → ny stays while Spanish lexicon levels remain (their ids are slugs of the lemma: año is anyo);
// French has no ñ, so it changes nothing for French words. The German ones stay for leftovers.
const LETTER_MAP = {
  à: "a", â: "a", é: "e", è: "e", ê: "e", ë: "e", î: "i", ï: "i", ô: "o", ù: "u", û: "u", ÿ: "y", ç: "c",
  À: "A", Â: "A", É: "E", È: "E", Ê: "E", Ë: "E", Î: "I", Ï: "I", Ô: "O", Ù: "U", Û: "U", Ÿ: "Y", Ç: "C",
  œ: "oe", Œ: "Oe", æ: "ae", Æ: "Ae",
  á: "a", í: "i", ó: "o", ú: "u", ü: "u", ñ: "ny", Á: "A", Í: "I", Ó: "O", Ú: "U", Ü: "U", Ñ: "Ny",
  ä: "ae", ö: "oe", Ä: "Ae", Ö: "Oe", ß: "ss",
};
const LETTERS = new RegExp(`[${Object.keys(LETTER_MAP).join("")}]`, "g");

/** A sentence's file name: its slug, cut to 70 characters, plus a short hash of the full
 *  text — two long sentences that start alike must not share a file. Used by
 *  scripts/generate-satz-audio.mjs and the Aussprache page to find the same file. */
export function satzSlug(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return `${slugify(text).slice(0, 70).replace(/-+$/, "")}-${(h >>> 0).toString(36).slice(0, 5)}`;
}

export function slugify(text) {
  const transliterated = text.replace(LETTERS, (ch) => LETTER_MAP[ch]);
  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A gap sentence solved: "Es ist kalt. … dir bitte die Jacke an!" + "Zieh" →
 *  "Es ist kalt. Zieh dir bitte die Jacke an!". The flashcard shows it on the German answer
 *  face and its speaker reads it after the word, so the script that voices it
 *  (generate-satz-audio.mjs, part "geloest") and the page that finds the file must build the
 *  same text — hence one function. A gap right before the full stop leaves no space behind. */
export function solvedHint(hint, fill) {
  const at = hint.indexOf("…");
  if (at < 0 || !fill) return null;
  return hint.slice(0, at) + fill + hint.slice(at + 1).replace(/^ (?=[.!?])/, "");
}
