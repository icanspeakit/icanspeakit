// When does a learner's pick count as the answer? Shared by the grammar workspaces
// (src/lib/grammarWorkspace.js) and the checker that hunts for pills the check would
// wrongly mark right (scripts/check-pillen.mjs), so both always judge the same way.
//
// French rules (content-plan §1.2, grammar-a1 run 2026-11-08):
// - case is forgiven, accents are not (a/à, ou/où, la/là, sur/sûr are different words);
// - a curly apostrophe counts as the straight one the data uses (l’école = l'école);
// - a non-breaking or narrow space counts as a plain space, runs of spaces as one;
// - typed oe / ae for the ligatures œ / æ are simply accepted (cœur = coeur).

export function normalize(s) {
  return String(s || "")
    .replace(/[’‘ʼ]/g, "'")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

/**
 * An answer may be a single string or an array of accepted strings — several topics have
 * slots where more than one form is genuinely right (Est-ce que tu viens ? / Tu viens ?;
 * the 1990 spelling next to the traditional one). The first entry is the model answer.
 */
export function accepts(answer, value) {
  const list = Array.isArray(answer) ? answer : [answer];
  return list.some((a) => normalize(a) === normalize(value));
}

/**
 * In French an accent can change the word (a/à, ou/où, du/dû, la/là, sur/sûr), so `accepts`
 * never folds accents away (content-plan §1.2). This says whether a wrong answer differs from
 * a right one ONLY in its accents, so the page can add "Check the accent." to the verdict.
 * The cedilla counts as an accent (ca/ça, francais/français). The tilde is left out: it is no
 * French accent, and in the Spanish data still waiting for its item ñ is a letter of its own.
 */
const ACCENT_MARKS = /[̧̀́̂̈]/g; // grave, acute, circumflex, diaeresis, cedilla
const withoutAccents = (s) => normalize(s).normalize("NFD").replace(ACCENT_MARKS, "").normalize("NFC");
export function accentOnly(answer, value) {
  if (!String(value || "").trim() || accepts(answer, value)) return false;
  const list = Array.isArray(answer) ? answer : [answer];
  return list.some((a) => withoutAccents(a) === withoutAccents(value));
}

/** One pill per word: "Est" (a sentence start) and "est" are the same answer to the check,
 *  so showing both only offers two right pills. Keeps the lower-case form when both occur. */
export function distinctOptions(options) {
  const byKey = new Map();
  for (const o of options) {
    const key = normalize(o);
    const had = byKey.get(key);
    if (had === undefined || (had !== had.toLowerCase() && o === o.toLowerCase())) byKey.set(key, o);
  }
  return [...byKey.values()];
}
