// Bruno Kart: a word's meaning in the learner's interface language (the header menu is the only
// language control). English ships with every word; for the other interface languages the lexicon's
// meanings come as one file per language (gloss-<lang>.json, lexWords.js) and are fetched once.
// German and any language without a file get English.

import { getLang } from "../i18n.js";
import { isRtl } from "../languages.js";

const tables = new Map();

/** The language the meanings are shown in: the interface language, or "en". */
export function glossLang() {
  const l = getLang();
  return l === "de" ? "en" : l;
}

/** Loads the meanings for `lang`; resolves with {} for English or when the file is missing. */
export function loadGloss(lang) {
  if (lang === "en") return Promise.resolve({});
  if (!tables.has(lang)) {
    tables.set(lang, fetch(`/spiele/artikel-sprint/gloss-${lang}.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})));
  }
  return tables.get(lang);
}

/** `{ text, lang, dir }` for an item with `id` and `english`: the loaded meaning, else English. */
export function meaningOf(item, lang, table) {
  const own = lang !== "en" && item?.id ? table?.[item.id] : null;
  return own
    ? { text: own, lang, dir: isRtl(lang) ? "rtl" : "ltr" }
    : { text: item?.english ?? "", lang: "en", dir: "ltr" };
}
