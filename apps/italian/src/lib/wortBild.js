// A picture for a word, where a concrete one exists: src/data/wort-bilder.json maps
// lexicon ids to emoji, drawn as self-hosted OpenMoji SVGs so every device shows the
// same icon (system emoji differ between Android, iOS and Windows).
import bilder from "../data/wort-bilder.json" with { type: "json" };

/** The OpenMoji file name for an emoji: its code points in hex, FE0F dropped. */
export function iconFile(emoji) {
  return [...emoji]
    .map((c) => c.codePointAt(0))
    .filter((cp) => cp !== 0xfe0f)
    .map((cp) => cp.toString(16).toUpperCase())
    .join("-");
}

/** `/img/openmoji/1F45F.svg` for a lexicon id with a picture, else null. */
export function wortBild(id) {
  const emoji = bilder.words[id];
  return emoji ? `/img/openmoji/${iconFile(emoji)}.svg` : null;
}

/** `/img/openmoji/<code>.svg` for any emoji, or null — for the hub pictures. */
export const emojiSrc = (emoji) => (emoji ? `/img/openmoji/${iconFile(emoji)}.svg` : null);
