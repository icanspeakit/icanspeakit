// The ready-made questions of a class poll (Umfrage), in blocks the teacher ticks on
// /lehrkraefte/umfragen. A poll stores the questions it was made with (umfragen.fragen), so
// changing this file never changes a poll that already runs.
//
// A stored question is
//   { id, typ: "multi" | "single" | "text", frage, k?, max?, optionen?: [{ id, text, k?, emoji? }], wenn? }
// `frage` and `text` are the German; `k` the i18n key a phone shows instead, in the student's
// interface language (scaffolding is translated, German content is not: grammar topic names
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
    titel: "Grammatik wiederholen",
    k: "uf.b.grammatik",
    info: "Die Grammatikthemen deines Niveaus. Du wählst unten, welche zur Auswahl stehen.",
    infoK: "uf.b.grammatik.info",
    fragen: () => [q("grammatik", "multi", "Welche Grammatik möchtest du wiederholen?", { max: 3 })],
  },
  {
    id: "fertigkeit",
    titel: "Sprechen und Schreiben",
    k: "uf.b.fertigkeit",
    info: "Was sie mehr üben wollen und welche Art von Sprechen und Schreiben.",
    infoK: "uf.b.fertigkeit.info",
    fragen: () => [
      q("fertigkeit", "single", "Was möchtest du mehr üben?", {
        optionen: [o("sprechen", "Sprechen", "🗣️"), o("schreiben", "Schreiben", "✍️"), o("beides", "Beides gleich", "⚖️")],
      }),
      q("sprechen-art", "multi", "Welches Sprechen möchtest du üben?", {
        max: 3,
        wenn: { id: "fertigkeit", in: ["sprechen", "beides"] },
        optionen: [
          o("rollenspiel", "Alltagsgespräche und Rollenspiele (Arzt, Amt, Einkaufen)"),
          o("erzaehlen", "Von mir erzählen"),
          o("meinung", "Meinung sagen und diskutieren"),
          o("praesentation", "Kurze Präsentation halten"),
          o("telefonieren", "Telefonieren"),
          o("aussprache", "Aussprache"),
          o("pruefung-m", "Mündliche Prüfung üben"),
        ],
      }),
      q("schreiben-art", "multi", "Was möchtest du schreiben üben?", {
        max: 3,
        wenn: { id: "fertigkeit", in: ["schreiben", "beides"] },
        optionen: [
          o("nachricht", "E-Mails und Nachrichten"),
          o("formular", "Formulare ausfüllen"),
          o("formell", "Formelle Briefe (Amt, Vermieter, Firma)"),
          o("beitrag", "Meinung schreiben (Forum, Beitrag)"),
          o("bewerbung", "Bewerbung und Lebenslauf"),
          o("pruefung-s", "Schriftliche Prüfung üben"),
        ],
      }),
    ],
  },
  {
    id: "themen",
    titel: "Themen und Wortschatz",
    k: "uf.b.themen",
    info: "Über welche Themen sie sprechen und Wörter lernen wollen.",
    infoK: "uf.b.themen.info",
    fragen: () => [
      q("themen", "multi", "Über welche Themen möchtest du sprechen und Wörter lernen?", {
        max: 3,
        optionen: [
          o("arbeit", "Arbeit und Beruf", "💼"),
          o("wohnen", "Wohnen und Nachbarn", "🏠"),
          o("gesundheit", "Gesundheit und Arzt", "🩺"),
          o("aemter", "Ämter und Formulare", "🏛️"),
          o("einkaufen", "Einkaufen und Geld", "🛒"),
          o("familie", "Familie, Kinder, Schule", "👨‍👩‍👧"),
          o("freizeit", "Freizeit und Hobbys", "⚽"),
          o("reisen", "Reisen und Verkehr", "🚆"),
          o("essen", "Essen und Kochen", "🍲"),
          o("gesellschaft", "Nachrichten und Gesellschaft", "📰"),
        ],
      }),
    ],
  },
  {
    id: "lernformen",
    titel: "Wie sie gern lernen",
    k: "uf.b.lernformen",
    info: "Spiele, Partnerarbeit, Tafel, Arbeitsblätter …",
    infoK: "uf.b.lernformen.info",
    fragen: () => [
      q("lernformen", "multi", "Wie lernst du im Kurs am liebsten?", {
        max: 3,
        optionen: [
          o("spiele", "Spiele und Quiz", "🎲"),
          o("partner", "Mit einer Partnerin oder einem Partner", "👥"),
          o("gruppe", "In der Gruppe", "🧑‍🤝‍🧑"),
          o("tafel", "Die Lehrkraft erklärt an der Tafel", "🧑‍🏫"),
          o("blatt", "Allein mit Arbeitsblättern", "📝"),
          o("medien", "Mit Videos und Liedern", "🎬"),
          o("texte", "Texte lesen und hören", "🎧"),
        ],
      }),
    ],
  },
  {
    id: "kurs",
    titel: "Tempo, Niveau, Hausaufgaben",
    k: "uf.b.kurs",
    info: "Drei kurze Fragen: Wie geht es ihnen im Kurs?",
    infoK: "uf.b.kurs.info",
    fragen: () => [
      q("tempo", "single", "Wie ist das Tempo im Kurs?", {
        optionen: [o("tempo-langsam", "Zu langsam", "🐢"), o("tempo-gut", "Genau richtig", "👍"), o("tempo-schnell", "Zu schnell", "🐇")],
      }),
      q("schwierigkeit", "single", "Wie schwer ist der Kurs für dich?", {
        optionen: [o("schwer-leicht", "Zu leicht", "😴"), o("schwer-gut", "Genau richtig", "🙂"), o("schwer-schwer", "Zu schwer", "😰")],
      }),
      q("hausaufgaben", "single", "Wie viele Hausaufgaben möchtest du?", {
        optionen: [o("ha-weniger", "Weniger", "⬇️"), o("ha-gut", "So ist es gut", "👌"), o("ha-mehr", "Mehr", "⬆️")],
      }),
    ],
  },
  {
    id: "wunsch",
    titel: "Freier Wunsch",
    k: "uf.b.wunsch",
    info: "Ein Textfeld: Was wünschst du dir noch? Antworten erscheinen ohne Namen.",
    infoK: "uf.b.wunsch.info",
    fragen: () => [q("wunsch", "text", "Was wünschst du dir noch für den Kurs?")],
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
