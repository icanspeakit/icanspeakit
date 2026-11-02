// What the class sees in the Einstieg step of /teachers/lesson, for a teacher who
// brings nothing: the plan's Ablauf text is an instruction for the teacher, so it goes into
// the notes, and the screen shows material made from data the site already has.
//
//   Bildimpuls        the block's photo + three questions + sentence starters
//   Wortigel / Frage  the question + a word web around the topic
//   Blitzlicht        model sentences from last Stunde's topic pages, then "your turn"
//   Drei Fragen       three gap sentences from last Stunde's exercises, answers on tap
//   Wiederholung      (last Stunde) one card per topic, each with an example sentence
//
// `themen` is { [topic href]: { name, ex: [sentence], quiz: [{ prompt, answer }] } }, built
// at build time from src/data/grammatik/*.json (aktiv.listen and the first fill exercise).
// Pure; seite.js draws the result.

/** The question in an Ablauf text: "Question to the group: What comes to mind …?" → "What comes to mind …?" */
export function bigQuestion(text) {
  const q = String(text ?? "").split(/(?<=[.!?])\s+/).find((s) => s.trim().endsWith("?"));
  return q ? q.replace(/^[^:“]*:\s*/, "").trim() : null;
}

const BILD = {
  fragen: ["Who is in the photo?", "Where are the people?", "What are they doing or saying?"],
  redemittel: ["I can see …", "In the photo there is/are …", "I think they are saying: “…”"],
};
const WORTIGEL = { redemittel: ["I'm thinking of …", "The word … fits the topic.", "In my language it's called …"] };

/**
 * @param {{ phase: { text: string }, lesson: object, prev: object | null, block: object,
 *           bild: object | null, themen: object, linksOf: (lesson) => Array<{name, href}> }} p
 *   linksOf: the grammar topic links a Stunde teaches (its Grammatik phase)
 */
export function einstiegInhalt({ phase, lesson, prev, block, bild, themen, linksOf }) {
  const text = phase.text;
  const topic = (l) => ({ name: l.name, ...(themen[l.href] ?? { ex: [], quiz: [] }) });

  if (lesson.final) {
    const links = linksOf(lesson).slice(0, 2);
    return {
      kind: "wiederholung",
      titel: "Explain to each other:",
      karten: links.map((l) => { const t = topic(l); return { name: t.name, beispiel: t.ex[0] ?? null }; }),
      redemittel: ["We use … when …", "For example: …", "My sentence: …"],
      bild: null,
    };
  }
  if (prev && /^Quick round/.test(text)) {
    const ex = linksOf(prev).flatMap((l) => topic(l).ex.slice(0, 2)).slice(0, 3);
    return {
      kind: "blitzlicht",
      titel: `Quick round: one sentence with ${prev.focus}`,
      untertitel: ex.length ? "This is how it sounds – now everyone says a sentence of their own." : "Everyone says a sentence of their own.",
      beispiele: ex,
      bild: null,
    };
  }
  if (prev && /^Three questions/.test(text)) {
    const quiz = linksOf(prev).flatMap((l) => topic(l).quiz).slice(0, 3);
    const ex = quiz.length ? [] : linksOf(prev).flatMap((l) => topic(l).ex.slice(0, 1)).slice(0, 3);
    return {
      kind: "fragen",
      titel: "Three questions about the last lesson",
      untertitel: quiz.length ? "What is missing? Answer together – then reveal." : `Do you remember? ${prev.focus}`,
      quiz,
      beispiele: ex,
      bild: null,
    };
  }
  if (/^Photo prompt/.test(text) && bild) {
    return { kind: "bild", titel: "What can you see in the photo?", untertitel: block.thema, fragen: BILD.fragen, redemittel: BILD.redemittel, bild };
  }
  // Wortigel, or a Bildimpuls without a photo: the topic in the middle, words around it.
  return {
    kind: "wortigel",
    titel: bigQuestion(text) ?? `What comes to mind when you think of “${block.thema}”?`,
    mitte: block.thema,
    redemittel: WORTIGEL.redemittel,
    bild,
  };
}
