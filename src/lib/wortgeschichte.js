// The Wortgeschichte entries as Astro pages and API routes see them: every
// src/content/wortgeschichte/*.json, found by Vite at build time. All logic lives in
// wortgeschichteCore.js (plain ESM, also used by the validator under node).
//
// PREVIEW lifts the publish gates (status, publishOn) so drafts can be reviewed on their
// real page: always in `astro dev`, and in a build only with WORTGESCHICHTE_VORSCHAU=1
// (e.g. a Vercel preview deployment). Production never sets it.
import * as core from "./wortgeschichteCore.js";

const modules = import.meta.glob("../content/wortgeschichte/*.json", { eager: true, import: "default" });

/** @type {any[]} */
export const ENTRIES = Object.values(modules);

export const PREVIEW =
  Boolean(import.meta.env.DEV) ||
  (typeof process !== "undefined" && process.env?.WORTGESCHICHTE_VORSCHAU === "1");

/** The Berlin date the build (or this request) runs on. */
export const today = () => core.berlinDate();

export const wordOfTheDay = (day = today()) => core.wordOfTheDay(ENTRIES, day, PREVIEW);
export const archive = (day = today()) => core.archive(ENTRIES, day, PREVIEW);
/** Published for real — what nav, homepage and mail may point at. Ignores PREVIEW. */
export const published = (day = today()) => core.archive(ENTRIES, day, false);
export const week = (day = today()) => core.week(ENTRIES, day);
export const bufferAhead = (day = today()) => core.bufferAhead(ENTRIES, day);
export const dailyOpen = (day = today()) => core.bufferAhead(ENTRIES, day) >= core.DAILY_BUFFER;
export const bySlug = (slug) => ENTRIES.find((e) => core.slugOf(e) === slug) ?? null;

export * from "./wortgeschichteCore.js";
