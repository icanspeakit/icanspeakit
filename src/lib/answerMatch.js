// When does a learner's pick count as the answer? Shared by the grammar workspaces
// (src/lib/grammarWorkspace.js) and the checker that hunts for pills the check would
// wrongly mark right (scripts/check-pillen.mjs), so both always judge the same way.

export function normalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

/**
 * An answer may be a single string or an array of accepted strings — several topics have
 * slots where more than one form is genuinely right (e.g. "Nach dem Frühstück müssen/sollen
 * sie das Geschirr einsammeln"). The first entry is the one shown as the model answer.
 */
export function accepts(answer, value) {
  const list = Array.isArray(answer) ? answer : [answer];
  return list.some((a) => normalize(a) === normalize(value) && !politeClash(a, value));
}
/* Case is otherwise forgiven ("Wäre" at a sentence start, "wäre" in the pill), but for the
 * Sie-forms it is the meaning: "ihr" (her / you all) and "Ihr" (your, polite) are two
 * pills on /possessives, and either one used to be marked right for both rows. */
const POLITE = /^(sie|ihr|ihre|ihrem|ihren|ihrer|ihres|ihnen)$/i;
function politeClash(a, value) {
  const x = String(a).trim();
  const y = String(value || "").trim();
  return x !== y && POLITE.test(x);
}

/** One pill per word: „Als“ (a sentence start) and „als“ are the same answer to the check,
 *  so showing both only offers two right pills. Keeps the lower-case form when both occur.
 *  The Sie-forms stay apart (ihr ≠ Ihr), as in `accepts`. */
export function distinctOptions(options) {
  const byKey = new Map();
  for (const o of options) {
    const key = POLITE.test(String(o).trim()) ? `=${String(o).trim()}` : normalize(o);
    const had = byKey.get(key);
    if (had === undefined || (had !== had.toLowerCase() && o === o.toLowerCase())) byKey.set(key, o);
  }
  return [...byKey.values()];
}
