// The quotes with their authors attached, for the /knowledge/quotes pages and the mail.
// Build/server side: imports the whole src/data/zitate.json.
//
// Translations (machine drafts, reviewed: false) live beside it in
// src/data/uebersetzungen/zitate.json: per help language the quote (`text`, behind the
// „Übersetzung zeigen“ button), the explanation (`meaning`, shown in the UI language by
// itself) and, for languages the word data lacks, the three word glosses.
import data from "../data/zitate.json";
import tl from "../data/uebersetzungen/zitate.json";

const TL = /** @type {Record<string, { quotes: Record<string, { text: string, meaning: string, words?: string[] }> }>} */ (tl.langs);

function withTranslations(q) {
  const t = Object.fromEntries(Object.entries(TL).flatMap(([lang, l]) => (l.quotes[q.id] ? [[lang, { text: l.quotes[q.id].text, meaning: l.quotes[q.id].meaning }]] : [])));
  const words = q.words.map((w, i) => {
    const tr = { ...w.tr };
    for (const [lang, l] of Object.entries(TL)) {
      const g = l.quotes[q.id]?.words?.[i];
      if (g && !tr[lang]) tr[lang] = g;
    }
    return { ...w, tr };
  });
  return { ...q, words, tl: t };
}

export const authors = data.authors;
export const quotes = data.quotes.map((q) => withTranslations({ ...q, who: data.authors[q.author], disputed: Boolean(q.disputed) }));
export const quoteById = Object.fromEntries(quotes.map((q) => [q.id, q]));

/** "JWG" → "JG": up to two initials of the capitalised name parts, for the bio badge. */
export const initials = (name) => name.split(" ").filter((p) => /^[A-ZÄÖÜ]/.test(p)).map((p) => p[0]).slice(0, 2).join("");

/** The last name, for sorting the archive: "von Goethe" sorts under G. */
export const lastName = (name) => name.split(" ").at(-1);

/** Quote text on one line (verse breaks " / " become spaces). */
export const oneLine = (text) => text.replaceAll(" / ", " ");
