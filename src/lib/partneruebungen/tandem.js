// The Tandembogen: a pair sheet made from a grammar topic's own exercises, with no model and no
// account — built at build time for every topic (lehrkraefte/arbeitsblaetter/tandem/[id].astro).
// The classic form: both partners see the same numbered tasks; on each card half of the
// solutions are printed (to check the partner) and the other half are gaps (to answer).
// A reads 1, B answers, A checks; B reads 2, A answers, B checks; and so on.
//
// Nothing is invented: tasks and answers are the topic's (fill, table, build, match items —
// the same ones the topic page asks online). Paid exercises are left out, as on the grammar
// worksheets. The result is an ordinary spec, drawn by render.js and checked by validateSheet.
import { sheetTopics, topicSlug, joinWords, sheetExtra } from "../arbeitsblatt/grammatik.js";
import { answersOf } from "../arbeitsblatt/seed.js";
import { LEVELS, validateSheet } from "./schema.js";
import { isReviewed } from "../topicStatus.js";

const MAX_ITEMS = 10;
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\*/g, "").replace(/\s+/g, " ").trim();
// Short enough for half a page: a task line and its solution side by side.
const fits = (p) => p.task.length >= 2 && p.task.length <= 110 && p.answer.length >= 1 && p.answer.length <= 70;

/** Task/answer pairs of one exercise. */
function pairs(ex) {
  switch (ex.type) {
    case "fill":
      return (ex.items ?? []).map((it) => ({ task: plain(it.prompt), answer: plain(answersOf(it.answer)[0]) }));
    case "table":
    {
      // A table's second column names what to make („Dativ“, „Perfekt“): the task needs it.
      const want = plain(ex.columns?.[1] ?? "");
      const ask = want && !/^(lösung|antwort|endung|answer|solution)$/i.test(want) ? ` (${want})` : "";
      return (ex.rows ?? []).map((r) => ({ task: plain(r.term) + ask, answer: plain(answersOf(r.answer)[0]) }));
    }
    case "build":
      return (ex.sentences ?? []).map((s) => ({ task: plain((s.shuffled ?? []).filter((w) => /\w/.test(w)).join(" / ")), answer: plain(joinWords(s.correct ?? [])) }));
    case "match":
      return (ex.pairs ?? []).map((p) => ({ task: plain(p.q), answer: plain(p.a) }));
    default:
      return [];
  }
}

/** Up to MAX_ITEMS pairs, taken in turn from each exercise, so the sheet mixes them. */
function pick(topic) {
  const lists = (topic.exercises ?? []).filter((ex) => !ex.paid).map((ex) => pairs(ex).filter(fits));
  const out = [];
  for (let i = 0; out.length < MAX_ITEMS && lists.some((l) => i < l.length); i++) {
    for (const l of lists) if (i < l.length && out.length < MAX_ITEMS) out.push(l[i]);
  }
  return out.length % 2 ? out.slice(0, -1) : out;
}

/** The rule's flow as the position table, when it has one; else two examples. */
function positions(topic, items) {
  const flow = (topic.concept?.flow ?? []).map((f) => plain(f.text)).filter(Boolean);
  if (flow.length >= 2) {
    const verb = (topic.concept.flow ?? []).map((f, i) => (f.variant === "verb" ? i : -1)).filter((i) => i >= 0);
    return { positionen: [flow], ...(verb.length ? { markiere: { verb } } : {}) };
  }
  return { kopf: ["Task", "Answer"], positionen: items.slice(0, 2).map((p) => [p.task, p.answer]) };
}

/* Question and answer (a topic's sheet extras, `tandemFragen`): one partner asks a whole
   question and sees the answer; the other hears it and builds the answer from cards — the
   verb in the infinitive, the nouns with their dictionary article — so conjugating and the
   case are the answerer's job. */
// With `frageKacheln` the asker builds the question too (question word, infinitive, parts),
// and the Tipp shows one built question that is not on the cards (`tandemFrageBeispiel`).
const qaCard = (rolle, items, mine, bsp) => ({
  rolle,
  tipp: {
    formel: rolle === "A" ? "You start: you ask question 1." : "Your partner asks first. You answer with the cards.",
    // No example line when the worked pair stands as its own row under task 1 (Bsp.):
    // the Tipp would show the very same question a few lines above it.
    beispiel: items[0].frageKacheln && bsp
      ? (bsp.antwortKacheln ? null : `Example: ${bsp.kacheln.join(" + ")} = *${bsp.frage}*`)
      : ((p) => `${p.task} → …`)(items.find((_, i) => mine(i)) ?? items[0]),
    hinweise: [
      items[0].frageKacheln
        ? "“You ask”? Build the question: put the words in order and the verb in the right form. Your partner builds the answer."
        : "“You ask”? Read the question aloud. Your partner builds the answer.",
      "“You answer”? Listen to the question and build the sentence: put the blue verb in the right form!",
      "The answers are on the answer sheet. Compare at the end.",
    ],
  },
  schritte: [{
    typ: "tabelle",
    anweisung: "Take turns to ask and answer. At the end, check with the answer sheet.",
    spalten: ["Question", "Answer"],
    zeilen: items.map((p, i) => [`${i + 1}. ${p.task}`, mine(i) ? p.answer : null]),
    qa: items.map((p, i) => ({ n: i + 1, ask: mine(i), frage: p.task, antwort: p.answer, kacheln: p.kacheln, infinitiv: p.infinitiv, frageKacheln: p.frageKacheln })),
    // A worked pair above row 1, the same on both cards: tiles turned into a question and an
    // answer (der Tisch becomes unter dem Tisch). Not one of the items, so it gives nothing away.
    beispiel: items[0].frageKacheln && bsp?.antwortKacheln ? bsp : null,
  }],
});

const card = (rolle, items, mine, bsp) => (items[0]?.kacheln ? qaCard(rolle, items, mine, bsp) : {
  rolle,
  tipp: {
    formel: rolle === "A" ? "You start: task 1." : "Your partner starts. You answer task 1.",
    beispiel: ((p) => `${p.task} → …`)(items.find((_, i) => mine(i)) ?? items[0]),
    hinweise: [
      "“You read”? Read the task aloud. Your partner answers.",
      "“You answer”? Answer and write your answer on the line.",
      "The answers are on the answer sheet. Compare at the end.",
    ],
  },
  schritte: [{
    typ: "tabelle",
    anweisung: rolle === "A"
      ? "You start: read task 1 aloud. Then answer task 2. Take turns."
      : "Your partner starts: answer task 1. Then read task 2 aloud. Take turns.",
    spalten: ["Task", "Answer"],
    zeilen: items.map((p, i) => [`${i + 1}. ${p.task}`, mine(i) ? p.answer : null]),
  }],
});

/** The sheet for one topic, or null when the topic has too few short items or no fitting level. */
export function tandemSpec(topic) {
  if (!LEVELS.includes(topic.level)) return null;
  const extra = sheetExtra(topic.id);
  const qa = extra?.tandemFragen;
  const items = qa?.length
    ? qa.map((q) => ({ task: q.frage, answer: q.antwort, kacheln: q.kacheln, infinitiv: q.infinitiv, frageKacheln: q.frageKacheln }))
    : pick(topic);
  if (items.length < 4) return null;
  const slug = topicSlug(topic);
  const name = plain(topic.name);
  const spec = {
    id: `pa-${topic.level.toLowerCase()}-tandem-${slug}`,
    titel: `${name}: tandem sheet`,
    untertitel: "Ask, answer, and compare with the answer sheet at the end",
    niveau: topic.level,
    thema: "Grammar",
    grammatik: [name],
    format: "infogap-ab",
    modus: "paar",
    personen: 2,
    dauerMin: 15,
    intro: {
      grammatik: { ...positions(topic, items), regel: plain(topic.subtitle) || name },
      redemittel: [
        { p1: "Número 1: … ¿Qué es correcto?", p2: "Creo que es: …" },
        { p1: "Yo creo que es: … ¿Y tú?", p2: "Mi respuesta es: …" },
        { p1: "¿Perdona? ¿Puedes repetir, por favor?", p2: "Número 2: …" },
      ],
      soGehts: [
        "Cut the cards down the middle. Partner A takes the left half, Partner B the right half.",
        "A reads task 1 aloud. B answers and writes the answer down.",
        "Then B reads task 2 aloud and A answers. Take turns.",
        "At the end you get the answer sheet. Compare together: what was right?",
        "Finally, swap cards and do it all again – faster.",
      ],
    },
    // A holds the solutions of the odd numbers (1, 3, …), which A reads; B those of the even ones.
    karten: [card("A", items, (i) => i % 2 === 0, extra?.tandemFrageBeispiel), card("B", items, (i) => i % 2 === 1, extra?.tandemFrageBeispiel)],
    loesungen: items.map((p) => ({ frage: p.task, antwort: p.answer })),
    quelle: { veraenderung: 2, geprueft: false },
    // Drawn as a Tandembogen (render.js): role colours, the mascots' "So geht's", task rows.
    tandem: true,
  };
  // A topic with hand-made sheet extras (src/data/arbeitsblatt/<id>.json) brings its Wo/Wohin
  // rule and, with a picture, a second round: „Unterschiede finden" on rooms A and B.
  if (qa?.length) {
    spec.untertitel = "Ask questions, build sentences, and compare with the answer sheet at the end";
    // The topic's own steps and phrases (`tandemSoGehts`, `tandemRedemittel`), else generic ones.
    spec.intro.soGehts = extra.tandemSoGehts ?? [
      "Cut the cards down the middle. Partner A takes the left half, Partner B the right half.",
      `A reads question 1 aloud: “${items[0].task}”`,
      "B only has cards with words in their base form. B builds the answer from them – verb in the right form, words in the right order!",
      "Then B asks question 2 and A answers. Take turns. At the end, compare with the answer sheet.",
      "Finally, swap cards and do it all again – faster.",
    ];
    spec.intro.redemittel = extra.tandemRedemittel ?? [
      { p1: "Número 1: ¿…?", p2: "Un momento … Creo que: …" },
      { p1: "¿Está bien?", p2: "Creo que sí. / No, mejor: …" },
      { p1: "¿Perdona? ¿Puedes repetir, por favor?", p2: "Número 2: ¿…?" },
    ];
  }
  if (extra?.regel) spec.woWohin = extra.regel;
  if (extra?.tandemBild) spec.bildTandem = extra.tandemBild;
  if (extra?.tandemKueche) spec.kuecheTandem = extra.tandemKueche;
  return validateSheet(spec).length ? null : { slug, name, level: topic.level, reviewed: isReviewed(topic), spec };
}

/** Every topic that makes a Tandembogen (built once per build, then reused). */
let cache = null;
export const tandemSheets = () => (cache ??= sheetTopics.map(tandemSpec).filter(Boolean));
export const tandemFor = (slug) => tandemSheets().find((t) => t.slug === slug) ?? null;
