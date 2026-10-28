// The Fahrschul-Wortschatz (src/data/fuehrerschein/wortschatz.json) as flashcards for the
// shared trainer (VokabelTrainer.astro) — the same card shape lexicon.js builds, so the
// trainer, its tabs („Auf Deutsch", the translations, „Alle Sprachen") and its audio work
// unchanged. Not in the lexicon on purpose: these are Fachwörter of one situation (the
// Fahrstunde, the Prüfung, the Amt), with ids of their own (fs-…), not level vocabulary.
//
// Audio: scripts/generate-fuehrerschein-audio.mjs voices each word into
// public/audio/fuehrerschein/<id>.mp3 and each example sentence into public/audio/saetze/
// (where the trainer looks for every example). A card carries `audioSrc` only when the file
// is on disk, checked at build time — a play button never points at a 404.
import { existsSync } from "node:fs";
import path from "node:path";
import wortschatz from "../data/fuehrerschein/wortschatz.json" with { type: "json" };
import { langsFor } from "./languages.js";

export const GROUPS = wortschatz.groups;
export const SLUG = { auto: "auto", strasse: "strasse", anweisungen: "anweisungen", pruefung: "pruefung" };

/** What the voice says: nouns with their article, everything else as written. */
export const spoken = (w) => (w.pos === "noun" && w.gender ? `${w.gender} ${w.lemma}` : w.pluralOnly ? `die ${w.lemma}` : w.lemma);

const audioFile = (id) => path.join(process.cwd(), "public", "audio", "fuehrerschein", `${id}.mp3`);

export function toCard(w) {
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
  if (w.pos === "noun") Object.assign(card, { gender: w.gender ?? (w.pluralOnly ? "die" : null), plural: w.plural ?? null, pluralOnly: !!w.pluralOnly });
  if (existsSync(audioFile(w.id))) Object.assign(card, { audioSrc: `/audio/fuehrerschein/${w.id}.mp3`, spoken: spoken(w) });
  return card;
}

export const cardsOf = (groupId) => (groupId ? GROUPS.filter((g) => g.id === groupId) : GROUPS).flatMap((g) => g.words.map(toCard));
// "de" is the German hint tab („Auf Deutsch"), the rest the registry's surface "fuehrerschein".
export const LANGS = ["de", ...langsFor("fuehrerschein")];
