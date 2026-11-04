// The profession decks as lexicon-shaped rows (lemma, gender, plural, example, deHint and the
// meanings flat: en, ar, …) — what reads lexicon rows rather than cards: the print sheet
// (berufeWortschatz.rowsOf) and the live quiz (liveQuiz/questions.js). No node: imports, so
// the quiz host can load it in the browser. A deck's unit id is `berufe-<beruf>-<gruppe>`,
// the same id VokabelTrainer gets as its deck.
import { BERUFE, refKind } from "./berufeCore.js";
import { byId as lexiconById, ENGLISH_LEVELS, SPANISH_LEVELS } from "./lexicon.js";

const modules = import.meta.glob("../data/berufe/*.json", { eager: true, import: "default" });

/** The decks point at lexicon ids. A ref into a word that is gone drops out rather than leaving
 *  a hole in the deck: while the vocab items run, a deck's English A1 refs do that, until
 *  `spanish-for-work` points them at Spanish ids. */
const resolves = (w) => {
  if (!w.ref || refKind(w.ref) !== "lexicon") return true;
  const row = lexiconById(w.ref);
  return !!row && (SPANISH_LEVELS.has(row.level) || ENGLISH_LEVELS.has(row.level));
};
export const liveDeck = (deck) => ({ ...deck, groups: (deck.groups ?? []).map((g) => ({ ...g, words: (g.words ?? []).filter(resolves) })) });

const decks = Object.fromEntries(
  BERUFE.map((b) => [b.slug, Object.values(modules).find((d) => d?.beruf === b.slug)]).filter(([, d]) => d).map(([s, d]) => [s, liveDeck(d)])
);

const own = new Map(
  Object.values(decks).flatMap((d) => d.groups.flatMap((g) => g.words.filter((w) => !w.ref).map((w) => [w.id, w])))
);

const ownRow = (w) => ({
  id: w.id,
  lemma: w.lemma,
  pos: w.pos === "adverb" ? "adv" : w.pos,
  gender: w.gender ?? (w.pluralOnly ? "some" : null),
  plural: w.plural ?? null,
  pluralOnly: !!w.pluralOnly,
  example: w.example,
  deHint: w.deHint,
  ...w.translations,
});

/** Any deck entry → row. A ref is shown as its source has it, with the deck's own hint and
 *  example winning, as on the cards; a lexicon gap answer belongs to the hint it replaced. */
export function rowOf(w) {
  if (!w.ref) return ownRow(w);
  const kind = refKind(w.ref);
  const row = kind === "berufe" ? ownRow(own.get(w.ref)) : { ...lexiconById(w.ref) };
  if (w.deHint) { row.deHint = w.deHint; delete row.deFill; }
  if (w.example) row.example = w.example;
  return row;
}

/** `berufe-hotel-taetigkeiten` → { slug, group } or null. */
export function berufeUnit(unit) {
  if (!unit?.startsWith("berufe-")) return null;
  for (const [slug, deck] of Object.entries(decks)) {
    if (!unit.startsWith(`berufe-${slug}-`)) continue;
    const group = deck.groups.find((g) => unit === `berufe-${slug}-${g.id}`);
    if (group) return { slug, deck, group };
  }
  return null;
}

/** The rows of one group, by unit id; [] for anything else. */
export const berufeUnitRows = (unit) => berufeUnit(unit)?.group.words.map(rowOf) ?? [];
