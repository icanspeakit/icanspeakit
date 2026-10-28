// The sentences of the `zimmer` exercise (src/lib/zimmerUebung.js), without the room: shared
// with meldungRef.js and scripts that must not pull in the DOM side.
//
// A gap is written [answer|distractor|…]; the pills are shown in alphabetical order, so the
// answer's place is not a pattern.

/** "Das Bett [steht|liegt] [in der|in die] Ecke." → text parts and gaps. */
export function parseSentence(s) {
  const parts = [];
  let last = 0;
  for (const m of String(s).matchAll(/\[([^\]]+)\]/g)) {
    if (m.index > last) parts.push({ text: s.slice(last, m.index) });
    const opts = m[1].split("|").map((o) => o.trim());
    parts.push({ gap: true, answer: opts[0], options: [...opts].sort((a, b) => a.localeCompare(b, "de")) });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ text: s.slice(last) });
  return parts;
}

export const gapsOf = (parts) => parts.filter((p) => p.gap);
/** The sentence with the learner's picks in its gaps ("___" where none). */
export const filled = (parts, picks) => { let g = 0; return parts.map((p) => (p.gap ? picks[g++] ?? "___" : p.text)).join(""); };
export const solved = (parts) => parts.map((p) => (p.gap ? p.answer : p.text)).join("");

/** The two sentences of every round (a = Wohin?, b = Wo?), for "Problem melden" and the slot count. */
export function zimmerItems(ex) {
  return (ex.rounds ?? []).flatMap((r, i) => ["a", "b"].map((key) => {
    const parts = parseSentence(key === "a" ? r.wohin : r.wo);
    return { key: `${i}${key}`, part: `${i + 1}${key}`, prompt: filled(parts, []), answer: solved(parts) };
  }));
}
