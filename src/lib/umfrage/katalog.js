// The ready-made questions of a class poll (Umfrage), in blocks the teacher ticks on
// /lehrkraefte/umfragen. A poll stores the questions it was made with (umfragen.fragen), so
// changing this file never changes a poll that already runs.
//
// A stored question is
//   { id, typ: "multi" | "single" | "text", frage, k?, max?, optionen?: [{ id, text, k?, emoji? }], wenn? }
// `frage` and `text` are the English base text (the same as the en.json value of `k`); `k` the
// i18n key a phone shows instead, in the student's interface language (grammar topic names
// have no key). `max` caps a multi choice. `wenn: { id, in: [...] }` shows the question only
// when the answer to question `id` is one of those options (or was skipped).
//
// Grammar options are the site's grammar topics at the poll's level (and the level below,
// for repeating), handed in by the page, which reads them from catalog.js at build time.

export const NIVEAUS = ["A1", "A2", "B1", "B2", "C1"];
export const MAX_EIGENE = 5;
export const MAX_OPTIONEN = 8;
export const MAX_GRAMMATIK = 20;

const o = (id, text, emoji) => ({ id, text, k: `uf.o.${id}`, ...(emoji ? { emoji } : {}) });
const q = (id, typ, frage, rest = {}) => ({ id, typ, frage, k: `uf.q.${id}`, ...rest });

/** The blocks, in the order a poll asks them. `grammatik` gets its options from the page. */
export const BLOECKE = [
  {
    id: "grammatik",
    titel: "Revise grammar",
    k: "uf.b.grammatik",
    info: "The grammar topics of your level. Below you choose which ones are offered.",
    infoK: "uf.b.grammatik.info",
    fragen: () => [q("grammatik", "multi", "Which grammar would you like to revise?", { max: 3 })],
  },
  {
    id: "fertigkeit",
    titel: "Speaking and writing",
    k: "uf.b.fertigkeit",
    info: "What they want to practise more and which kind of speaking and writing.",
    infoK: "uf.b.fertigkeit.info",
    fragen: () => [
      q("fertigkeit", "single", "What would you like to practise more?", {
        optionen: [o("sprechen", "Speaking", "🗣️"), o("schreiben", "Writing", "✍️"), o("beides", "Both equally", "⚖️")],
      }),
      q("sprechen-art", "multi", "Which kind of speaking would you like to practise?", {
        max: 3,
        wenn: { id: "fertigkeit", in: ["sprechen", "beides"] },
        optionen: [
          o("rollenspiel", "Everyday conversations and role plays (doctor, office, shopping)"),
          o("erzaehlen", "Talking about myself"),
          o("meinung", "Giving my opinion and discussing"),
          o("praesentation", "Giving a short presentation"),
          o("telefonieren", "Phone calls"),
          o("aussprache", "Pronunciation"),
          o("pruefung-m", "Practise the speaking exam"),
        ],
      }),
      q("schreiben-art", "multi", "What would you like to practise writing?", {
        max: 3,
        wenn: { id: "fertigkeit", in: ["schreiben", "beides"] },
        optionen: [
          o("nachricht", "Emails and messages"),
          o("formular", "Filling in forms"),
          o("formell", "Formal letters (office, landlord, company)"),
          o("beitrag", "Writing my opinion (forum, post)"),
          o("bewerbung", "Job application and CV"),
          o("pruefung-s", "Practise the writing exam"),
        ],
      }),
    ],
  },
  {
    id: "themen",
    titel: "Topics and vocabulary",
    k: "uf.b.themen",
    info: "Which topics they want to talk about and learn words for.",
    infoK: "uf.b.themen.info",
    fragen: () => [
      q("themen", "multi", "Which topics would you like to talk about and learn words for?", {
        max: 3,
        optionen: [
          o("arbeit", "Work and jobs", "💼"),
          o("wohnen", "Housing and neighbours", "🏠"),
          o("gesundheit", "Health and the doctor", "🩺"),
          o("aemter", "Offices and forms", "🏛️"),
          o("einkaufen", "Shopping and money", "🛒"),
          o("familie", "Family, children, school", "👨‍👩‍👧"),
          o("freizeit", "Free time and hobbies", "⚽"),
          o("reisen", "Travel and transport", "🚆"),
          o("essen", "Food and cooking", "🍲"),
          o("gesellschaft", "News and society", "📰"),
        ],
      }),
    ],
  },
  {
    id: "lernformen",
    titel: "How they like to learn",
    k: "uf.b.lernformen",
    info: "Games, partner work, board, worksheets …",
    infoK: "uf.b.lernformen.info",
    fragen: () => [
      q("lernformen", "multi", "How do you like to learn in class best?", {
        max: 3,
        optionen: [
          o("spiele", "Games and quizzes", "🎲"),
          o("partner", "With a partner", "👥"),
          o("gruppe", "In a group", "🧑‍🤝‍🧑"),
          o("tafel", "The teacher explains on the board", "🧑‍🏫"),
          o("blatt", "Alone with worksheets", "📝"),
          o("medien", "With videos and songs", "🎬"),
          o("texte", "Reading and listening to texts", "🎧"),
        ],
      }),
    ],
  },
  {
    id: "kurs",
    titel: "Pace, level, homework",
    k: "uf.b.kurs",
    info: "Three short questions: How are they doing in the course?",
    infoK: "uf.b.kurs.info",
    fragen: () => [
      q("tempo", "single", "How is the pace in the course?", {
        optionen: [o("tempo-langsam", "Too slow", "🐢"), o("tempo-gut", "Just right", "👍"), o("tempo-schnell", "Too fast", "🐇")],
      }),
      q("schwierigkeit", "single", "How difficult is the course for you?", {
        optionen: [o("schwer-leicht", "Too easy", "😴"), o("schwer-gut", "Just right", "🙂"), o("schwer-schwer", "Too difficult", "😰")],
      }),
      q("hausaufgaben", "single", "How much homework would you like?", {
        optionen: [o("ha-weniger", "Less", "⬇️"), o("ha-gut", "It's fine as it is", "👌"), o("ha-mehr", "More", "⬆️")],
      }),
    ],
  },
  {
    id: "wunsch",
    titel: "Free wish",
    k: "uf.b.wunsch",
    info: "A text field: What else do you wish for? Answers appear without names.",
    infoK: "uf.b.wunsch.info",
    fragen: () => [q("wunsch", "text", "What else do you wish for in the course?")],
  },
];

/** The level below `niveau` (A2 → A1), for "auch wiederholen". */
export const niveauDavor = (niveau) => NIVEAUS[NIVEAUS.indexOf(niveau) - 1] ?? null;

const clean = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * The questions a new poll stores.
 *   bloecke   ids of the ticked blocks
 *   grammatik [{ id, name }] the topics the teacher kept for the grammar question
 *   eigene    [{ frage, typ: "single" | "multi" | "text", optionen: [string] }]
 */
export function buildFragen({ bloecke, grammatik = [], eigene = [] }) {
  const out = [];
  for (const b of BLOECKE) {
    if (!bloecke.includes(b.id)) continue;
    for (const f of b.fragen()) {
      if (f.id === "grammatik") {
        if (!grammatik.length) continue;
        f.optionen = grammatik.slice(0, MAX_GRAMMATIK).map((t) => ({ id: t.id, text: t.name }));
      }
      out.push(f);
    }
  }
  eigene.forEach((e, i) => {
    const frage = clean(e.frage, 200);
    if (!frage) return;
    const f = { id: `eigen-${i + 1}`, typ: e.typ, frage };
    if (e.typ !== "text") {
      f.optionen = e.optionen.map((t) => clean(t, 80)).filter(Boolean).slice(0, MAX_OPTIONEN).map((text, j) => ({ id: `e${i + 1}-${j + 1}`, text }));
      if (f.optionen.length < 2) return;
      if (e.typ === "multi") f.max = Math.min(3, f.optionen.length);
    }
    out.push(f);
  });
  return out;
}

/** Whether `f` is asked, given the answers so far (see `wenn` above). */
export function sichtbar(f, antworten) {
  if (!f.wenn) return true;
  const a = antworten[f.wenn.id];
  if (a == null || (Array.isArray(a) && !a.length)) return true;
  return [a].flat().some((v) => f.wenn.in.includes(v));
}
