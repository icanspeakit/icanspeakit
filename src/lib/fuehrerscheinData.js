// The Führerschein section's content, joined: lessons (regeln.json), the own question bank
// (fragen.json), the steps (ablauf.json) and the Lernset (wortschatz.json). Pages, the
// catalog, the /progress registry and scripts/check-fuehrerschein.mjs all read through
// here, so a count on the hub is the count of what exists.
import regeln from "../data/fuehrerschein/regeln.json" with { type: "json" };
import fragen from "../data/fuehrerschein/fragen.json" with { type: "json" };
import wortschatz from "../data/fuehrerschein/wortschatz.json" with { type: "json" };
import { iconFile } from "./wortBild.js";
import { citedDeep, sourcesFor, zeichen } from "./fuehrerschein.js";

export const groups = regeln.groups;
export const lessons = regeln.lessons;
export const questions = fragen.questions;
export const vocab = wortschatz;
export const vocabCount = (wortschatz.groups ?? []).reduce((n, g) => n + g.words.length, 0);

export const lessonHref = (id) => `/fuehrerschein/regeln/${id}`;
export const lessonById = (id) => lessons.find((l) => l.id === id) ?? null;
export const questionsOf = (topic) => questions.filter((q) => q.topic === topic);
export const lessonQuiz = (topic) => questionsOf(topic).filter((q) => q.inLesson);

/** topic id → { title, href } — for quiz feedback and the simulation's result. */
export const lessonLinks = Object.fromEntries(lessons.map((l) => [l.id, { title: l.title, href: lessonHref(l.id) }]));

/** The card picture of a lesson: a Verkehrszeichen or an OpenMoji. */
export function lessonPic(l) {
  if (l.bild?.zeichen) return { src: zeichen(l.bild.zeichen).src, sign: true };
  if (l.bild?.emoji) return { src: `/img/openmoji/${iconFile(l.bild.emoji)}.svg`, sign: false };
  return null;
}

/** Every source a lesson page cites: its facts and its questions, then its own extra rows. */
export function lessonSources(l) {
  const keys = citedDeep([l, questionsOf(l.id)]);
  return [...sourcesFor([...keys]), ...(l.sources ?? [])];
}
