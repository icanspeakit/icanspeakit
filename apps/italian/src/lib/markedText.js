// The word a task asks about, marked in the exercise data with <u>…</u>:
//   "Keine Angst, du findest <u>schon</u> eine Stelle."  (Welche Wirkung hat die Partikel?)
// Wherever a sentence asks about one small part of it — a particle, an ending, one word —
// that part is underlined, so nobody has to guess which word is meant. <u> is the only
// tag allowed through; everything else in the string is shown as text.

const MARK = /<u>([\s\S]*?)<\/u>/g;
const STRAY = /<\/?u>/g;

/** The string without its marks: for speech, comparisons, fingerprints and plain text. */
export const unmark = (s) => String(s ?? "").replace(STRAY, "");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** HTML with every other character escaped and each mark as <u class="q-mark">. */
export function markedHtml(s) {
  let out = "";
  let last = 0;
  const str = String(s ?? "");
  for (const m of str.matchAll(MARK)) {
    out += escapeHtml(unmark(str.slice(last, m.index))) + `<u class="q-mark">${escapeHtml(unmark(m[1]))}</u>`;
    last = m.index + m[0].length;
  }
  return out + escapeHtml(unmark(str.slice(last)));
}

/** Fills `el` with the string as text nodes and <u class="q-mark"> elements (no innerHTML). */
export function setMarked(el, s) {
  const str = String(s ?? "");
  const parts = [];
  let last = 0;
  for (const m of str.matchAll(MARK)) {
    parts.push(unmark(str.slice(last, m.index)));
    const u = document.createElement("u");
    u.className = "q-mark";
    u.textContent = unmark(m[1]);
    parts.push(u);
    last = m.index + m[0].length;
  }
  parts.push(unmark(str.slice(last)));
  el.replaceChildren(...parts.filter((p) => p !== ""));
}
