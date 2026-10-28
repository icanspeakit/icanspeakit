// What the site actually has, counted from the data — the one source for every number a
// page promises. A claim like "60+ Grammatikthemen" drifted away from the repo because it
// was typed into copy; these are derived at build time, so they grow as content is added.
//
// grammarTopicCount: every topic in grammarCatalog, plus Akkusativ, which has its own page
// (/akkusativ) and so sits outside the catalogue. Deduplicated by key: Passiv and
// Präpositionen exist both as a workspace and as a grammatik.json entry.
import { grammarCatalog } from "./grammarCatalog.js";

const lexicon = import.meta.glob("../content/lexicon/*.json", { eager: true, import: "default" });

const BESPOKE = ["akkusativ"];

export const grammarTopicCount = new Set([...grammarCatalog.map((t) => t.key), ...BESPOKE]).size;

/** Words per level, e.g. { A1: 650, A2: 700, … }. Not rendered yet. */
export const wordCount = Object.fromEntries(
  Object.values(lexicon)
    .filter((l) => l?.level && Array.isArray(l.units))
    .map((l) => [l.level.toUpperCase(), l.units.reduce((n, u) => n + (u.words?.length ?? 0), 0)]),
);

/** Values every data-i18n string may use as {placeholders}, on every page. */
export const i18nGlobals = { grammarTopics: grammarTopicCount };
