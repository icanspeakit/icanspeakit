// When does a learner's pick count as the answer? Shared by the grammar workspaces
// (src/lib/grammarWorkspace.js) and the checker that hunts for pills the check would
// wrongly mark right (scripts/check-pillen.mjs), so both always judge the same way.

export function normalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    // The typographic apostrophe a phone keyboard types is the straight one the content stores
    // (l’amico = l'amico, content-plan §1.2). Spaces are not touched: l' amico stays wrong.
    .replace(/[’‘ʼ`´]/g, "'")
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
/* Case is otherwise forgiven ("Dove" at a sentence start, "dove" in the pill), but for the
 * polite subject pronoun it is the meaning: "lei" (she) and "Lei" (you, polite) can be two
 * pills on one item (/subject-pronouns). Only Lei: the object forms La/Le are also plain
 * articles at a sentence start ("La casa…"), so they are judged without case. Content never
 * puts lei/Lei at the start of a gap sentence. */
const POLITE = /^lei$/i;
function politeClash(a, value) {
  const x = String(a).trim();
  const y = String(value || "").trim();
  return x !== y && POLITE.test(x);
}

/**
 * In Italian an accent changes the word (e/è, da/dà, la/là, si/sì, ne/né, parlo/parlò), so
 * `accepts` never folds accents away (content-plan §1.2). This says whether a wrong answer
 * differs from a right one ONLY in its accents (missing, or grave for acute: perchè/perché),
 * so the page can add "check the accent" to the verdict.
 */
const ACCENT_MARKS = /\p{Mn}/gu; // combining marks after NFD: the grave and acute of à è é ì ò ù
const withoutAccents = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(ACCENT_MARKS, "").normalize("NFC");
export function accentOnly(answer, value) {
  if (!String(value || "").trim() || accepts(answer, value)) return false;
  const list = Array.isArray(answer) ? answer : [answer];
  return list.some((a) => withoutAccents(a) === withoutAccents(value));
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
