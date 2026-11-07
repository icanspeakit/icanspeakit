// Rules and examples are written as running text: "der → den, die → die, das → das",
// "du kommst → Komm! · ihr kommt → Kommt!". Read aloud that is fine; on screen it wraps
// wherever the card ends and the pairs stop lining up. These helpers find such runs and
// hand back a small table instead — source | → | result — so the pairs read as a list.
// Anything that does not split cleanly into "a → b" pairs is left exactly as written.

/** "a → b, c → d" / "a → b · c → d" / "a → b! c → d!" → [[a, b], [c, d]], or null. */
function splitPairs(text) {
  let parts = text.includes(" · ") ? text.split(" · ") : text.split(/,\s+/);
  if (parts.length < 2) parts = text.split(/(?<=!)\s+/);
  if (parts.length < 2) return null;
  const pairs = parts.map((p) => p.trim().split(/\s*→\s*/));
  return pairs.every((p) => p.length === 2 && p[0] && p[1]) ? pairs : null;
}

/** The table itself. `head` is [left, right] column labels, `caption` a label above both. */
function pairsTable(pairs, { head, caption } = {}) {
  return `<table class="ex-pairs">${caption ? `<caption>${caption}</caption>` : ""}${
    head ? `<thead><tr><th>${head[0]}</th><th></th><th>${head[1]}</th></tr></thead>` : ""
  }<tbody>${pairs
    .map(([a, b]) => `<tr><td class="ex-a">${a}</td><td class="ex-arr" aria-hidden="true">→</td><td class="ex-b">${b}</td></tr>`)
    .join("")}</tbody></table>`;
}

/** A rule's html with every run of two or more pairs inside <em>/<strong> made a table.
 *  Runs in parentheses stay inline: they are asides, and a table there breaks the sentence. */
export function rulePairsHtml(html) {
  return html.replace(/(\()?<(em|strong)>((?:(?!<\/\2>).)*)<\/\2>(\.)?/g, (whole, paren, _tag, inner) => {
    if (paren || (inner.match(/→/g) ?? []).length < 2) return whole;
    const pairs = splitPairs(inner);
    return pairs ? pairsTable(pairs) : whole;
  });
}

/** An example line or a topic intro as tables plus notes, or null when it is not made of
 *  pairs. "Nominativ → Akkusativ: der → den, …" becomes a table headed Nominativ | Akkusativ;
 *  "Dativpronomen: ich→mir, …" one captioned "Dativpronomen"; other sentences stay text. */
export function examplePairsHtml(text) {
  if (!text || (text.match(/→/g) ?? []).length < 2) return null;
  if (text.includes(" · ")) {
    const pairs = splitPairs(text);
    return pairs ? pairsTable(pairs) : null;
  }
  let tables = 0;
  const out = text.split(/(?<=\.)\s+(?=[A-ZÄÖÜ„"])/).map((sentence) => {
    const m = sentence.replace(/\.$/, "").match(/^([^:]+):\s*(.+)$/);
    const pairs = m && splitPairs(m[2]);
    if (!pairs) return `<p class="ex-note">${sentence}</p>`;
    tables++;
    const label = m[1].split(/\s*→\s*/);
    return pairsTable(pairs, label.length === 2 ? { head: label } : { caption: m[1] });
  });
  return tables ? out.join("") : null;
}
