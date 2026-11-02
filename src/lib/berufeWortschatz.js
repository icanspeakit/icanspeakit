// The profession decks as pages see them: every src/data/berufe/*.json, found by Vite at build
// time, with each `{ ref }` resolved into the same flashcard shape the lexicon and the
// Fahrschul-Wortschatz build — so VokabelTrainer, its language tabs and its audio work
// unchanged. Rules of the format: src/lib/berufeCore.js. Build check: scripts/check-berufe.mjs.
//
// Audio: public/audio/berufe/<id>.mp3 (FACHVOKABULAR Tier 3). A card carries `audioSrc` only
// when the file is on disk, checked at build time, so a play button never points at a 404.
import { existsSync } from "node:fs";
import path from "node:path";
import { BERUFE, LANGS, entryCount, refKind } from "./berufeCore.js";
import { byId as lexiconById, toVokabelCards } from "./lexicon.js";
import { toCard as fsCard, GROUPS as FS_GROUPS } from "./fuehrerscheinWortschatz.js";
import { rowOf, liveDeck } from "./berufeRows.js";

const modules = import.meta.glob("../data/berufe/*.json", { eager: true, import: "default" });

/** slug → deck, in hub order. Refs into English lexicon levels are dropped (liveDeck). */
export const DECKS = Object.fromEntries(
  BERUFE.map((b) => [b.slug, Object.values(modules).find((d) => d?.beruf === b.slug)]).filter(([, d]) => d).map(([s, d]) => [s, liveDeck(d)])
);

export { LANGS, entryCount };

/** What the voice says: nouns with their article (a / an / some), everything else as written. */
const spoken = (w) => (w.pos === "noun" && w.gender ? `${w.gender} ${w.lemma}` : w.pluralOnly ? `some ${w.lemma}` : w.lemma);
const audioFile = (id) => path.join(process.cwd(), "public", "audio", "berufe", `${id}.mp3`);

/** A word the deck defines itself → card. Same shape as fuehrerscheinWortschatz.toCard. */
function ownCard(w) {
  const translations = { ...w.translations };
  if (w.deHint) translations.de = w.deHint;
  const card = {
    front: w.lemma,
    note: w.example ?? "",
    translations,
    pos: w.pos === "adverb" ? "adv" : w.pos,
    example: w.example,
    ...(w.separable ? { separable: true } : {}),
  };
  if (w.pos === "noun") Object.assign(card, { gender: w.gender ?? (w.pluralOnly ? "some" : null), plural: w.plural ?? null, pluralOnly: !!w.pluralOnly });
  if (existsSync(audioFile(w.id))) Object.assign(card, { audioSrc: `/audio/berufe/${w.id}.mp3`, spoken: spoken(w) });
  return card;
}

const allOwn = new Map(
  Object.values(DECKS).flatMap((d) => d.groups.flatMap((g) => g.words.filter((w) => !w.ref).map((w) => [w.id, w])))
);
const fsWords = new Map(FS_GROUPS.flatMap((g) => g.words.map((w) => [w.id, w])));

/** Any entry → card. A ref is shown as its source shows it; the check guarantees it resolves.
 *  A ref may carry its own `deHint` and `example` for this job (the lexicon's „Hier kocht man.“
 *  or „Ich hole dich am Bahnhof ab.“ is not what the word means at work); those win. */
export function toCard(w) {
  if (!w.ref) return ownCard(w);
  return withOverrides(refCard(w.ref), w);
}

function refCard(ref) {
  const kind = refKind(ref);
  if (kind === "berufe") return ownCard(allOwn.get(ref));
  if (kind === "fuehrerschein") return fsCard(fsWords.get(ref));
  const row = lexiconById(ref);
  // A lexicon row without an English gloss has no card (toVokabelCards skips it); fall back to
  // the bare word so the deck never silently loses an entry.
  return toVokabelCards([row])[0] ?? { front: row.lemma, note: row.example ?? "", translations: {}, pos: row.pos };
}

function withOverrides(card, w) {
  if (!w.deHint && !w.example) return card;
  const out = { ...card, translations: { ...card.translations } };
  if (w.deHint) out.translations.de = w.deHint;
  if (w.example) Object.assign(out, { example: w.example, note: w.example });
  return out;
}

export const groupsOf = (slug) => (DECKS[slug]?.groups ?? []).filter((g) => g.words.length > 0);
export const cardsOf = (slug, groupId = null) =>
  groupsOf(slug).filter((g) => !groupId || g.id === groupId).flatMap((g) => g.words.map(toCard));
export const rowsOf = (slug, groupId = null) =>
  groupsOf(slug).filter((g) => !groupId || g.id === groupId).flatMap((g) => g.words.map(rowOf));

/** The decks that have words: these get pages. Pflege also gets its page while empty, because
 *  that page carries the pflegeplace.com box (see the Pflege rule in the prompt). */
export const hasPage = (slug) => entryCount(DECKS[slug] ?? {}) > 0 || slug === "pflege";

/** A few of the deck's own example sentences for the profession page ("What it sounds like at
 *  work", with the simple English definition as `meaning`): real sentences from the cards, not text written for the page. One per group
 *  first, so the sample spreads across the deck. */
export function samplesOf(slug, n = 3) {
  const per = groupsOf(slug).map((g) => g.words.filter((w) => !w.ref && w.example));
  const out = [];
  for (let i = 0; out.length < n && per.some((ws) => ws[i]); i++)
    for (const ws of per) if (ws[i] && out.length < n) out.push({ lemma: ws[i].lemma, gender: ws[i].gender ?? null, example: ws[i].example, deHint: ws[i].deHint, meaning: ws[i].translations?.en ?? null });
  return out;
}
