// The Redemittel sets (src/data/redemittel.json: Zustimmen, Widersprechen, Trösten …) as
// flashcard decks for the shared trainer (VokabelTrainer.astro), one per speech act, so
// the Redemittel pane of the Wortschatz side nav has sets to open — not only the curated
// deck at /wortschatz. The Aussprache page uses the same file for its „Sätze & Redemittel“.
//
// Audio: scripts/generate-satz-audio.mjs voices every phrase into
// public/audio/redemittel/<satzSlug>.mp3. A card carries `audioSrc` only when the file is on
// disk (checked at build time), so a play button never points at a 404.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import redemittel from "../data/redemittel.json" with { type: "json" };
import { satzSlug } from "./audioSlug.js";
import { emojiSrc } from "./wortBild.js";
import { languagesFor } from "./languages.js";

export const SETS = redemittel.sets;

const audioOf = (de) => {
  const src = `/audio/redemittel/${satzSlug(de)}.mp3`;
  return existsSync(path.join(process.cwd(), "public", src)) ? src : null;
};

/** A phrase's `bild`: an emoji (drawn as OpenMoji) or a path of its own (/img/bildposition/…). */
const bildSrc = (bild) => (!bild ? null : bild.startsWith("/") ? bild : emojiSrc(bild));

/** Every card language, the fetched ones too: a set is a dozen sentences, so all of them
 *  ride inline in the page instead of in /wortschatz/glossen/. */
const CARD_LANGS = languagesFor("cards", { fetched: true }).map((l) => l.code);

/** The languages beyond the five in redemittel.json: src/data/redemittel-i18n/<code>.json,
 *  `{ "<German phrase>": "<translation>" }`. Drafts until a native speaker has read them. */
const SIDECARS = Object.fromEntries(CARD_LANGS.map((code) => {
  const file = path.join(process.cwd(), "src", "data", "redemittel-i18n", `${code}.json`);
  return [code, existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {}];
}));

export function toCard(phrase) {
  const { de, bild, ...inline } = phrase;
  const translations = { ...inline };
  for (const code of CARD_LANGS) if (!translations[code] && SIDECARS[code][de]) translations[code] = SIDECARS[code][de];
  const audioSrc = audioOf(de);
  const img = bildSrc(bild);
  // The picture says what the sentence is for („Im Vordergrund …“ = the lower band), so it
  // shows beside every translation, not only on „Auf Deutsch“ like a word's picture.
  return { front: de, note: "", translations, ...(img ? { img, imgAlways: true } : {}), ...(audioSrc ? { audioSrc, spoken: de } : {}) };
}

/** A set with `bildRaten` (Wo ist der Ball?): the picture alone is the question, the
 *  German sentence the answer — a translation would give the preposition away. */
export function cardsOf(setId) {
  const set = SETS.find((s) => s.id === setId);
  return (set?.phrases ?? []).map(toCard).map((c) => (set.bildRaten && c.img ? { ...c, imgOnly: true } : c));
}

/** The card languages every phrase of the set carries (no German hint yet; uk since 2026-10-28). */
export const langsOf = (cards) => CARD_LANGS.filter((l) => cards.every((c) => c.translations?.[l]));
