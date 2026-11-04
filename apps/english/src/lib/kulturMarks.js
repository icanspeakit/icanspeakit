// „Du oder Sie?" is hard to read when the words being taught are also the words doing the
// talking: „Du sagst du zu Freunden." Only one of those two is the word to learn. So a topic
// in kultur.json can carry `marked`: the same texts with the taught words in braces —
// „Du sagst {du} zu Freunden." — and the page shows those as coloured word chips.
//
// The braces never go into the texts themselves: Einfach lernen quotes Landeskunde facts
// word for word, with a checksum (src/lib/einfach-content.js). So `marked` is a second copy,
// and markHtml() refuses a copy that no longer matches its text once the braces are gone —
// an edit to one without the other fails the build instead of showing the old sentence.

/** Which chip a marked word gets. du and its forms one colour, Sie and its forms the other. */
const KIND = { du: "du", dir: "du", dich: "du", dein: "du", sie: "sie", ihnen: "sie", ihr: "sie" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** `{du}` → a chip; everything else escaped. For text that has no plain twin (the comic).
 *  Punctuation right after a chip stays on its line: a lone „?" under „Ihnen" read badly.
 *  `kind` gives every chip the same colour — a grammar comic marks forms („schneller",
 *  „am liebsten"), not one side of the du/Sie pair. A chip right after a letter is an
 *  ending („alt{e}"): it gets the tight `ku-term--tail`, so the word still reads as one. */
export function marksToHtml(marked, kind = null) {
  return esc(marked).replace(/\{([^{}]+)\}([?!.,:;“]*)/g, (_, w, p, at, all) => {
    const tail = /\p{L}/u.test(all[at - 1] ?? "") ? " ku-term--tail" : "";
    const chip = `<b class="ku-term ku-term--${kind ?? KIND[w.toLowerCase()] ?? "du"}${tail}">${w}</b>`;
    return p ? `<span class="ku-nb">${chip}${p}</span>` : chip;
  });
}

/**
 * The HTML for `raw`, with its marked twin's chips when there is one. `where` names the
 * field for the error message.
 */
export function markHtml(raw, marked, where = "") {
  if (marked == null) return esc(raw);
  if (marked.replace(/[{}]/g, "") !== raw) {
    throw new Error(`kultur.json marked${where ? `.${where}` : ""}: passt nicht mehr zum Text.\n  Text:     ${raw}\n  markiert: ${marked}`);
  }
  return marksToHtml(marked);
}
