// A grammar worksheet for one topic, built from that topic's own exercises in
// src/data/grammatik/*.json — the same items the topic page asks online. Each exercise
// type becomes the paper form closest to it:
//
//   fill  → sentences with a gap line          table → term | gap, two columns
//   match → numbered left, lettered right      build → scrambled words, write the sentence
//   story → gap text with a word box
//
// Nothing is invented here: prompts, answers and alternatives are the data's. A gap
// accepts every alternative the data accepts (answers may be a list).
import { shuffle, LETTERS, answersOf } from "./seed.js";
import { isReviewed } from "../topicStatus.js";
import { refTopics } from "./nachschlagen.js";

const mods = import.meta.glob("../../data/grammatik/*.json", { eager: true });
/** Every topic with a worksheet, drafts included: a draft's page has its „Drucken / PDF“
    like any topic, so its sheet can be checked on paper too. Paid exercises (C1) are not
    in src/data/ and so not on a worksheet. The Nachschlagewerk pages come along as topics
    of their own (nachschlagen.js). */
export const sheetTopics = [...Object.values(mods).map((m) => m.default ?? m), ...refTopics]
  .filter((t) => (t.exercises ?? []).some((ex) => !ex.paid))
  .sort((a, b) => a.level.localeCompare(b.level) || a.name.localeCompare(b.name, "es"));
/** The ones the worksheet index offers: reviewed only (topicStatus.js). */
export const grammarTopics = sheetTopics.filter(isReviewed);

export const topicSlug = (t) => t.slug ?? t.id;

/** "Wir haben ___ gesehen." → ["Wir haben ", " gesehen."]; no gap → the gap goes last. */
function splitGap(prompt) {
  const parts = String(prompt).split(/_{2,}|…{1}(?=\s|$)/);
  return parts.length > 1 ? [parts[0], parts.slice(1).join("___")] : [String(prompt) + " ", ""];
}

/** "Ich habe den Film gesehen ." → "Ich habe den Film gesehen." */
export const joinWords = (words) => words.join(" ").replace(/\s+([.,!?;:])/g, "$1").replace(/([¿¡])\s+/g, "$1");

function section(ex, i, topicId) {
  const base = { type: ex.type, title: ex.title ?? "", hint: ex.hint ?? "", n: i + 1 };
  const box = (list) => (ex.choices?.length ? shuffle(ex.choices, `${topicId}:${i}:box`) : list ? shuffle([...new Set(list)], `${topicId}:${i}:box`) : null);

  switch (ex.type) {
    case "fill":
      return {
        ...base,
        items: (ex.items ?? []).map((it) => {
          const [before, after] = splitGap(it.prompt);
          return { before, after, hint: it.hint ?? "", answers: answersOf(it.answer) };
        }),
        box: box(null),
      };
    case "table":
      return {
        ...base,
        columns: ex.columns ?? ["", "Lösung"],
        items: (ex.rows ?? []).map((r) => ({ term: r.term, answers: answersOf(r.answer) })),
        box: box(null),
      };
    case "match": {
      const pairs = ex.pairs ?? [];
      const order = shuffle(pairs.map((_, k) => k), `${topicId}:${i}:match`);
      return {
        ...base,
        left: pairs.map((p) => p.q),
        right: order.map((pi, k) => ({ letter: LETTERS[k], text: pairs[pi].a })),
        answers: pairs.map((_, k) => LETTERS[order.indexOf(k)]),
      };
    }
    case "build":
      return {
        ...base,
        items: (ex.sentences ?? []).map((s) => ({
          hint: s.hint ?? "",
          words: s.shuffled ?? shuffle(s.correct, `${topicId}:${s.id}`),
          answers: [joinWords(s.correct)],
        })),
      };
    case "story": {
      const segs = ex.segments ?? [];
      const blanks = segs.filter((s) => s.blank != null);
      return {
        ...base,
        segments: segs.map((s) => (s.blank != null ? { blank: true, answers: answersOf(s.answer) } : { text: s.text })),
        box: box(blanks.map((b) => answersOf(b.answer)[0])),
      };
    }
    default:
      return null;
  }
}

// Hand-made extras for a sheet, by topic id (src/data/arbeitsblatt/<id>.json): a picture
// with its own exercises, a mascot comic, a Wo/Wohin rule. Only topics that have one.
const extraMods = import.meta.glob("../../data/arbeitsblatt/*.json", { eager: true });
const EXTRAS = Object.fromEntries(
  Object.entries(extraMods).map(([p, m]) => [p.match(/([^/]+)\.json$/)[1], m.default ?? m]),
);
/** A topic's hand-made extras, or null. */
export const sheetExtra = (id) => EXTRAS[id] ?? null;

export function grammarSheet(topic) {
  const c = topic.concept ?? {};
  return {
    topic,
    extra: EXTRAS[topic.id] ?? null,
    rule: {
      subtitle: topic.subtitle ?? "",
      example: c.exampleHtml ?? "",
      // Compact on purpose: a worksheet reminds, the topic page explains.
      points: (c.qa ?? []).slice(0, 4).map((q) => q.html ?? q.text ?? ""),
    },
    sections: (topic.exercises ?? []).map((ex, i) => (ex.paid ? null : section(ex, i, topic.id))).filter(Boolean),
  };
}
