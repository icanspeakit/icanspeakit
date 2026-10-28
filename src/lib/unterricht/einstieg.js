// What the class sees in the Einstieg step of /lehrkraefte/unterricht, for a teacher who
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

/** The question in an Ablauf text: "Frage an die Gruppe: Was fällt euch …?" → "Was fällt euch …?" */
export function bigQuestion(text) {
  const q = String(text ?? "").split(/(?<=[.!?])\s+/).find((s) => s.trim().endsWith("?"));
  return q ? q.replace(/^[^:„]*:\s*/, "").trim() : null;
}

const BILD = {
  fragen: ["Wer ist auf dem Foto?", "Wo sind die Personen?", "Was machen oder sagen sie?"],
  redemittel: ["Ich sehe …", "Auf dem Foto ist/sind …", "Ich glaube, sie sagen: „…“"],
};
const WORTIGEL = { redemittel: ["Ich denke an …", "Das Wort … passt zum Thema.", "Auf Deutsch heißt das …"] };

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
      titel: "Erklärt euch gegenseitig:",
      karten: links.map((l) => { const t = topic(l); return { name: t.name, beispiel: t.ex[0] ?? null }; }),
      redemittel: ["Bei … sagt man …", "Zum Beispiel: …", "Mein Satz: …"],
      bild: null,
    };
  }
  if (prev && /^Blitzlicht/.test(text)) {
    const ex = linksOf(prev).flatMap((l) => topic(l).ex.slice(0, 2)).slice(0, 3);
    return {
      kind: "blitzlicht",
      titel: `Blitzlicht: Ein Satz mit ${prev.focus}`,
      untertitel: ex.length ? "So klingt das – jetzt sagt jede Person einen eigenen Satz." : "Jede Person sagt einen eigenen Satz.",
      beispiele: ex,
      bild: null,
    };
  }
  if (prev && /^Drei Fragen/.test(text)) {
    const quiz = linksOf(prev).flatMap((l) => topic(l).quiz).slice(0, 3);
    const ex = quiz.length ? [] : linksOf(prev).flatMap((l) => topic(l).ex.slice(0, 1)).slice(0, 3);
    return {
      kind: "fragen",
      titel: "Drei Fragen zur letzten Stunde",
      untertitel: quiz.length ? "Was fehlt? Antwortet im Plenum – dann aufdecken." : `Erinnert ihr euch? ${prev.focus}`,
      quiz,
      beispiele: ex,
      bild: null,
    };
  }
  if (/^Bildimpuls/.test(text) && bild) {
    return { kind: "bild", titel: "Was seht ihr auf dem Foto?", untertitel: block.thema, fragen: BILD.fragen, redemittel: BILD.redemittel, bild };
  }
  // Wortigel, or a Bildimpuls without a photo: the topic in the middle, words around it.
  return {
    kind: "wortigel",
    titel: bigQuestion(text) ?? `Was fällt euch zum Thema „${block.thema}“ ein?`,
    mitte: block.thema,
    redemittel: WORTIGEL.redemittel,
    bild,
  };
}
