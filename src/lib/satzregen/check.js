// Regis Satzregen: is this order of chunks a correct sentence? (English since the games run:
// only the canonical order and the listed alts count, see VORFELD_MODES below.)
//
// A sentence (src/data/satzregen/saetze.json, built by scripts/build-satzregen.mjs) is a list
// of chunks in their canonical order plus what the checker needs to know about them:
//   c    chunks as they stand inside a sentence ("am Montag", "ich", "Pizza", ", weil");
//        the chunk in slot 1 is capitalised for display only
//   v    index of the finite verb (always 1 in an Aussagesatz or W-Frage, 0 in a Ja/Nein-Frage)
//   s    index of the subject, or -1
//   vp   indices of the other verb parts (infinitive, participle, separable prefix): never
//        moved to the front
//   f    indices that may not stand in position 1 although the rule would allow it
//   a    other correct orders, as index lists
//   e    "." or "?"
//   nv   true = no Vorfeld variants for this sentence (only canonical + alts count)
//
// What counts as correct: the canonical order, every alt, and for an Aussagesatz (e ".",
// modes v2 and klammer) every Vorfeld variant: one chunk that is not a verb part moved to
// position 1, the finite verb in position 2, the subject right behind it, then unstressed
// pronouns, everything else in its canonical order. Pronoun objects, "nicht", "kein …" and particles never go to
// position 1 ("Nicht komme ich" is not German), see NEVER_FIRST. Chunks compare by their
// text, so two "ich" tiles are interchangeable.

/** Chunks that never start an Aussagesatz in this game, even when the rule would allow it. */
const NEVER_FIRST = /^(nicht|nichts|kein\w*|auch|doch|mal|denn|ja|noch|schon|sehr|es|sich|mich|dich|uns|euch|ihn|ihm|ihr|mir|dir|ihnen|Ihnen|einander)(\s|$)/;

/** Unstressed pronouns (and "das" as a pronoun) stand right behind the subject in the
 *  Mittelfeld: "Man muss sich nach dem Umzug ummelden", not "… nach dem Umzug sich …". */
const PRONOUN = /^(es|das|sich|mich|dich|uns|euch|ihn|ihm|ihr|mir|dir|ihnen|Ihnen)$/;

// English has no verb-second rule: no mode gets automatic Vorfeld variants (moving a chunk to
// the front would give "On Monday work I"). The sentences list the other correct orders as
// alts instead (src/data/satzregen/quelle.txt). The German modes were ["v2", "klammer"].
const VORFELD_MODES = new Set([]);

/** Does this sentence get Vorfeld variants? */
export function hasVorfeld(s) {
  return !s.nv && s.e === "." && VORFELD_MODES.has(s.mode) && s.v === 1;
}

/** May chunk i stand in position 1 of a Vorfeld variant? */
export function frontable(s, i) {
  if (i === s.v || (s.vp || []).includes(i) || (s.f || []).includes(i)) return false;
  if (i === s.s) return true; // the subject always can ("Es regnet", "Ihr kommt")
  return !NEVER_FIRST.test(s.c[i]);
}

/** Every Vorfeld variant as an index list (canonical excluded). */
export function vorfeldVariants(s) {
  if (!hasVorfeld(s)) return [];
  const out = [];
  for (let x = 0; x < s.c.length; x++) {
    if (!frontable(s, x)) continue;
    const order = [x, s.v];
    if (s.s >= 0 && s.s !== x) order.push(s.s);
    for (let i = 0; i < s.c.length; i++) if (!order.includes(i) && PRONOUN.test(s.c[i])) order.push(i);
    for (let i = 0; i < s.c.length; i++) if (!order.includes(i)) order.push(i);
    out.push(order);
  }
  return out;
}

/** All correct orders as lists of chunk texts, without duplicates. Canonical first. */
export function acceptedOrders(s) {
  const canon = s.c.map((_, i) => i);
  const lists = [canon, ...(s.a || []), ...vorfeldVariants(s)];
  const seen = new Set();
  const out = [];
  for (const l of lists) {
    const texts = l.map((i) => s.c[i]);
    const key = texts.join("\u0001");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(texts);
  }
  return out;
}

const cache = new WeakMap();
const accepted = (s) => {
  let a = cache.get(s);
  if (!a) cache.set(s, (a = acceptedOrders(s)));
  return a;
};

/** order: the chunk texts as the player placed them, slot 1 first. */
export function isCorrect(s, order) {
  return accepted(s).some((a) => a.length === order.length && a.every((t, i) => t === order[i]));
}

/** Which slots are wrong: compared with the correct order that matches the most slots.
 *  Returns { wrong: boolean[], best: string[] } — best is that closest correct order. */
export function wrongMarks(s, order) {
  let best = accepted(s)[0];
  let bestHits = -1;
  for (const a of accepted(s)) {
    const hits = a.reduce((n, t, i) => n + (t === order[i] ? 1 : 0), 0);
    if (hits > bestHits) (best = a), (bestHits = hits);
  }
  return { wrong: order.map((t, i) => t !== best[i]), best };
}

/** The finished sentence as text: chunks joined, "," glued to the word before, the first
 *  letter capitalised, the end mark added. */
export function sentenceText(order, end) {
  let t = "";
  for (const c of order) t += t && !c.startsWith(",") ? ` ${c}` : c;
  return (t.charAt(0).toUpperCase() + t.slice(1)).trim() + (end || "");
}

/** A chunk as shown in slot `i`: capitalised in slot 1. */
export const chunkLabel = (text, i) => (i === 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text);
