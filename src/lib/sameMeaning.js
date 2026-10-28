// Do two words mean the same thing? For multiple-choice word quizzes (Wortschatz „Lernen“,
// the Live-Quiz): a wrong option must never be a right answer too. "waste" asked, with
// „der Abfall“ correct and „der Müll“ offered as a distractor, marks a learner wrong for
// a word that is just as right — so a word whose meaning overlaps is not used as one.
//
// Two words count as the same when either is listed as the other's synonym (de-syn.json,
// `syn` on a lexicon entry or card), or when their translations in one language share a
// meaning: "waste" and "rubbish, waste" share "waste".

const stripArticle = (s) => s.replace(/^(der|die|das)\s+/i, "");
const norm = (s) => stripArticle(String(s).trim()).toLocaleLowerCase("de");

/** The single meanings in a translation: "rubbish, waste (bin)" → rubbish, waste. */
export function glossParts(gloss) {
  if (!gloss) return [];
  return String(gloss)
    .replace(/\([^)]*\)/g, " ")
    .split(/[,;/·]| oder | or /)
    .map((p) => p.trim().toLocaleLowerCase().replace(/^to\s+/, "").replace(/\s+/g, " "))
    .filter((p) => p.length > 1);
}

/**
 * @param {{ de: string, syn?: string[], glosses?: string[] }} a
 * @param {{ de: string, syn?: string[], glosses?: string[] }} b
 *   `glosses`: the translations to compare, in the same order of languages for both.
 */
export function sameMeaning(a, b) {
  const aDe = norm(a.de), bDe = norm(b.de);
  if (aDe === bDe) return true;
  if ((a.syn ?? []).some((s) => norm(s) === bDe) || (b.syn ?? []).some((s) => norm(s) === aDe)) return true;
  const ga = a.glosses ?? [], gb = b.glosses ?? [];
  for (let i = 0; i < Math.min(ga.length, gb.length); i++) {
    const pa = new Set(glossParts(ga[i]));
    if (pa.size && glossParts(gb[i]).some((p) => pa.has(p))) return true;
  }
  return false;
}
