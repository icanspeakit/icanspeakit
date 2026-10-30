// Redewendungen & Sprichwörter (/wissen/redewendungen): the entries from
// src/data/redewendungen.json with their theme attached, in page order. Build side only (it
// imports the whole JSON); the browser gets what it needs as data attributes.
//
// Order: by theme as listed in `themen`, inside a theme by the phrase, ignoring a leading
// article or „jemandem“ so „die Nase voll haben“ sorts under N.
import { existsSync } from "node:fs";
import path from "node:path";
import data from "../data/redewendungen.json";

import { REDEWENDUNGEN_LIVE } from "./redewendungenLive.js";

/** Released yet (src/lib/redewendungenLive.js)? */
export const LIVE = REDEWENDUNGEN_LIVE;

export const LEVELS = ["B1", "B2", "C1"];
export const TYP = { redewendung: "Idiom", sprichwort: "Proverb" };
export const REGISTER = { neutral: "Neutral", umgang: "Colloquial" };
export const CERTAINTY = { sicher: "Origin certain", wahrscheinlich: "Origin probable", unklar: "Origin unclear" };

export const themen = data.themen;
export const themaById = Object.fromEntries(themen.map((t) => [t.id, t]));

const sortKey = (de) =>
  de.toLowerCase().replace(/^[“"]/, "").replace(/^(a|an|the|it's|not|be|get|have|keep)\s+/, "");

const order = Object.fromEntries(themen.map((t, i) => [t.id, i]));
export const eintraege = data.eintraege
  .map((e) => ({ ...e, themaInfo: themaById[e.thema] }))
  .sort((a, b) => order[a.thema] - order[b.thema] || sortKey(a.de).localeCompare(sortKey(b.de), "en"));

export const byId = Object.fromEntries(eintraege.map((e) => [e.id, e]));

/** The entries of one theme, in page order. */
export const ofThema = (id) => eintraege.filter((e) => e.thema === id);

/** Related entries: the ones the entry names (`aehnlich`), else up to three of its theme. */
export function related(e, n = 3) {
  const named = (e.aehnlich ?? []).map((id) => byId[id]).filter(Boolean);
  if (named.length) return named;
  return ofThema(e.thema).filter((o) => o.id !== e.id).slice(0, n);
}

/** Previous and next entry within the theme (wrapping). */
export function prevNext(e) {
  const list = ofThema(e.thema);
  const i = list.findIndex((o) => o.id === e.id);
  return { prev: list[(i - 1 + list.length) % list.length], next: list[(i + 1) % list.length] };
}

export const hrefOf = (e) => `/wissen/redewendungen/${e.id}`;
export const emojiSrc = (code) => `/img/openmoji/${code}.svg`;

/** The key word to gap in „Complete“: the longest word that carries the picture, leaving
 *  out small and placeholder words. “It's raining cats and dogs.” → “raining”,
 *  “kill two birds with one stone” → “birds”. */
const GAP_SKIP = new Set("a an the and of in on to by for with your my his her its it's not be get have keep there's there someone someone's something won't wasn't don't where through before about around just".split(" "));
export function gapWord(de) {
  const words = de.replace(/[„“"!?.,:;]/g, " ").split(/\s+/).filter(Boolean);
  const pool = words.filter((w) => !GAP_SKIP.has(w.toLowerCase()) && w.length > 2);
  return [...(pool.length ? pool : words)].sort((a, b) => b.length - a.length)[0] ?? words[0];
}

/** What the browser needs for the practice and the daily card, per entry (kept small). */
export const itemsOf = (list) =>
  list.map((e) => ({ id: e.id, de: e.de, bed: e.bedeutung, bsp: e.bsp[0], bild: e.bild, props: e.comic?.props ?? [], t: e.thema, lv: e.level, gap: gapWord(e.de) }));

/** The recording of a phrase (`slug` = id) or example (`<id>-bsp-<n>`), when it is on disk
 *  (scripts/generate-redewendungen-audio.mjs); null = the play button uses the browser's voice. */
export function audioOf(slug) {
  const src = `/audio/redewendungen/${slug}.mp3`;
  return existsSync(path.join(process.cwd(), "public", src)) ? src : null;
}
