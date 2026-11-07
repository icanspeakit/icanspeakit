// Business Spanish (docs/content-plan.md §4.3): the units in src/data/business-spanish/<id>.json.
//
// Plain ESM with no Vite imports, so the build check (scripts/check-business-spanish.mjs) and the
// pages share one set of rules. Pages get the units through src/lib/businessSpanishData.js.
//
// A unit: { id, level, title, variety, reviewed, intro, introEasy, phrases, models, tips, words,
// exercises }. Its `words` are berufe deck entries, so businessDeck() folds all units into one
// deck ("business"), one group per unit: the flashcard trainer, the print sheet and the live quiz
// then work as they do for a sector deck, and word ids are bv-business-<slug of the lemma>.
import { varietyProblems } from "./variety.js";

/** Hub and reading order: from everyday tasks at B1 up to negotiating at C1. */
export const UNIT_IDS = ["correos", "llamadas", "curriculum", "entrevista", "reuniones", "negociacion"];

export const REGISTERS = ["formal", "neutral", "informal"];
const LEVELS = ["B1", "B2", "C1"];

export const byOrder = (units) =>
  [...units].sort((a, b) => UNIT_IDS.indexOf(a.id) - UNIT_IDS.indexOf(b.id));

/** All units as one deck in the berufe format (src/lib/berufeCore.js). */
export function businessDeck(units) {
  const sorted = byOrder(units);
  return {
    beruf: "business",
    title: "Business Spanish",
    level: "B1–C1",
    reviewed: sorted.length > 0 && sorted.every((u) => u.reviewed === true),
    intro: "The words for emails, phone calls, CVs, interviews, meetings and negotiating.",
    groups: sorted.map((u) => ({ id: u.id, title: u.title, words: u.words ?? [] })),
  };
}

/** The phrases of a unit in their groups, in order of first appearance: [{ use, phrases }]. */
export function phraseGroups(unit) {
  const groups = new Map();
  for (const p of unit.phrases ?? []) {
    if (!groups.has(p.use)) groups.set(p.use, []);
    groups.get(p.use).push(p);
  }
  return [...groups].map(([use, phrases]) => ({ use, phrases }));
}

const text = (s) => typeof s === "string" && s.trim().length > 0;

/** Every rule of a unit file except its words (check-berufe covers those). Returns a list of errors. */
export function validateUnits(files) {
  const errors = [];
  const seenExercises = new Map();
  const seen = new Set();

  for (const { file, unit } of files) {
    const at = (msg) => errors.push(`${file}: ${msg}`);
    if (!unit || typeof unit !== "object") { at("not a JSON object"); continue; }
    if (`${unit.id}.json` !== file) at(`id "${unit.id}" must match the file name`);
    if (!UNIT_IDS.includes(unit.id)) at(`"${unit.id}" is not in UNIT_IDS (src/lib/businessSpanish.js)`);
    seen.add(unit.id);
    if (!LEVELS.includes(unit.level)) at(`level must be one of ${LEVELS.join(", ")}`);
    for (const k of ["title", "intro", "introEasy"]) if (!text(unit[k])) at(`no ${k}`);
    if (typeof unit.reviewed !== "boolean") at(`"reviewed" must be true or false`);
    for (const p of varietyProblems(unit)) at(p);

    if (!Array.isArray(unit.phrases) || unit.phrases.length === 0) at("no phrases");
    for (const p of unit.phrases ?? []) {
      const where = `phrase „${p.es ?? "?"}"`;
      for (const k of ["use", "es", "en"]) if (!text(p[k])) at(`${where}: no ${k}`);
      if (!REGISTERS.includes(p.register)) at(`${where}: register must be one of ${REGISTERS.join(", ")}`);
      if (!p.variety) at(`${where}: no variety`);
      for (const v of varietyProblems(p)) at(`${where}: ${v}`);
    }

    if (!Array.isArray(unit.models) || unit.models.length === 0) at("no model texts");
    for (const m of unit.models ?? []) {
      if (!text(m.title) || !text(m.text)) at(`model „${m.title ?? "?"}": needs title and text`);
      if (!Array.isArray(m.notes) || !m.notes.every(text)) at(`model „${m.title ?? "?"}": notes must be a list of texts`);
    }

    if (!Array.isArray(unit.tips) || !unit.tips.every(text)) at("tips must be a list of texts");
    if (!Array.isArray(unit.words) || unit.words.length === 0) at("no words");

    if (!Array.isArray(unit.exercises) || unit.exercises.length === 0) at("no exercises");
    for (const q of unit.exercises ?? []) {
      const where = `exercise ${q.id ?? "?"}`;
      if (!q.id || !q.id.startsWith(`${unit.id}-`)) at(`${where}: id must start with "${unit.id}-"`);
      if (seenExercises.has(q.id)) at(`${where}: id also in ${seenExercises.get(q.id)}`);
      seenExercises.set(q.id, file);
      if ((q.prompt?.match(/___/g) ?? []).length !== 1) at(`${where}: the prompt needs exactly one ___`);
      if (!Array.isArray(q.options) || q.options.length < 2) at(`${where}: needs at least 2 options`);
      else {
        if (new Set(q.options).size !== q.options.length) at(`${where}: an option appears twice`);
        if (!q.options.includes(q.answer)) at(`${where}: the answer is not among the options`);
        // The practice workspace writes an option into a data-opt="…" attribute.
        if (q.options.some((o) => /["<>]/.test(o))) at(`${where}: an option has ", < or >`);
      }
      if (!text(q.explain)) at(`${where}: no explain`);
      for (const v of varietyProblems(q)) at(`${where}: ${v}`);
    }
  }

  for (const id of UNIT_IDS) if (!seen.has(id)) errors.push(`src/data/business-spanish/${id}.json is missing`);
  return errors;
}
