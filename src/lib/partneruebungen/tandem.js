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
      const ask = want && !/^(lösung|antwort|endung)$/i.test(want) ? ` (${want})` : "";
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
  return { kopf: ["Aufgabe", "Lösung"], positionen: items.slice(0, 2).map((p) => [p.task, p.answer]) };
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
    formel: rolle === "A" ? "Sie beginnen: Sie stellen Frage 1." : "Ihr Partner fragt zuerst. Sie antworten mit den Kärtchen.",
    // No example line when the worked pair stands as its own row under task 1 (Bsp.):
    // the Tipp would show the very same question a few lines above it.
    beispiel: items[0].frageKacheln && bsp
      ? (bsp.antwortKacheln ? null : `Beispiel: ${bsp.kacheln.join(" + ")} = *${bsp.frage}*`)
      : ((p) => `${p.task} → …`)(items.find((_, i) => mine(i)) ?? items[0]),
    hinweise: [
      items[0].frageKacheln
        ? "„Sie fragen“? Bauen Sie die Frage: Verb konjugieren, Wörter ordnen. Ihr Partner baut die Antwort."
        : "„Sie fragen“? Lesen Sie die Frage vor. Ihr Partner baut die Antwort.",
      "„Sie antworten“? Hören Sie die Frage und bauen Sie den Satz: Verb konjugieren, Artikel anpassen!",
      "Die Lösungen stehen auf dem Lösungsblatt. Vergleichen Sie am Ende.",
    ],
  },
  schritte: [{
    typ: "tabelle",
    anweisung: "Fragen und antworten Sie abwechselnd. Am Ende kontrollieren Sie mit dem Lösungsblatt.",
    spalten: ["Frage", "Antwort"],
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
    formel: rolle === "A" ? "Sie beginnen: Aufgabe 1." : "Ihr Partner beginnt. Sie antworten auf Aufgabe 1.",
    beispiel: ((p) => `${p.task} → …`)(items.find((_, i) => mine(i)) ?? items[0]),
    hinweise: [
      "„Sie lesen vor“? Lesen Sie die Aufgabe vor. Ihr Partner antwortet.",
      "„Sie antworten“? Antworten Sie und schreiben Sie die Antwort auf die Linie.",
      "Die Lösungen stehen auf dem Lösungsblatt. Vergleichen Sie am Ende.",
    ],
  },
  schritte: [{
    typ: "tabelle",
    anweisung: rolle === "A"
      ? "Sie beginnen: Lesen Sie Aufgabe 1 vor. Dann antworten Sie auf Aufgabe 2. Immer abwechselnd."
      : "Ihr Partner beginnt: Antworten Sie auf Aufgabe 1. Dann lesen Sie Aufgabe 2 vor. Immer abwechselnd.",
    spalten: ["Aufgabe", "Lösung"],
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
    titel: `${name}: Tandembogen`,
    untertitel: "Fragen, antworten, am Ende mit dem Lösungsblatt vergleichen",
    niveau: topic.level,
    thema: "Grammatik",
    grammatik: [name],
    format: "infogap-ab",
    modus: "paar",
    personen: 2,
    dauerMin: 15,
    intro: {
      grammatik: { ...positions(topic, items), regel: plain(topic.subtitle) || name },
      redemittel: [
        { p1: "Nummer 1: … Was ist richtig?", p2: "Ich glaube: …" },
        { p1: "Ich glaube: … Und du?", p2: "Ich habe: …" },
        { p1: "Wie bitte? Noch einmal, bitte.", p2: "Nummer 2: …" },
      ],
      soGehts: [
        "Schneiden Sie die Karten in der Mitte durch. Partner A nimmt die linke Hälfte, Partner B die rechte.",
        "A liest Aufgabe 1 vor. B antwortet und schreibt die Antwort auf.",
        "Dann liest B Aufgabe 2 vor, A antwortet. Immer abwechselnd.",
        "Am Ende bekommen Sie das Lösungsblatt. Vergleichen Sie zusammen: Was war richtig?",
        "Zum Schluss: Tauschen Sie die Karten und machen Sie alles noch einmal – schneller.",
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
    spec.untertitel = "Fragen stellen, Sätze bauen, am Ende mit dem Lösungsblatt vergleichen";
    // The topic's own steps and phrases (`tandemSoGehts`, `tandemRedemittel`), else generic ones.
    spec.intro.soGehts = extra.tandemSoGehts ?? [
      "Schneiden Sie die Karten in der Mitte durch. Partner A nimmt die linke Hälfte, Partner B die rechte.",
      `A liest Frage 1 vor: „${items[0].task}“`,
      "B hat nur Kärtchen mit Wörtern in der Grundform. B baut daraus die Antwort – Verb konjugieren, Wörter in die richtige Reihenfolge!",
      "Dann fragt B Frage 2, A antwortet. Immer abwechselnd. Am Ende vergleichen Sie mit dem Lösungsblatt.",
      "Zum Schluss: Karten tauschen und alles noch einmal – schneller.",
    ];
    spec.intro.redemittel = extra.tandemRedemittel ?? [
      { p1: "Nummer 1: …?", p2: "Moment … Ich glaube: …" },
      { p1: "Stimmt das so?", p2: "Ich glaube, ja. / Nein, besser: …" },
      { p1: "Wie bitte? Noch einmal, bitte.", p2: "Nummer 2: …?" },
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
