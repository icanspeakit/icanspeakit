/* One description of every exam trainer on the site: its parts, how many scored items
 * each part holds, and where its answers live.
 *
 * Until now each trainer page built that list inline, in its own module script, which is
 * fine while a page only has to know about itself. A cross-exam "Mein Fortschritt" view
 * cannot work that way — it would have to re-derive six pages' section lists — so the
 * counts move here, derived from the same JSON the trainers load. The trainers keep
 * owning how a part is *rendered*; this file owns what a part *is*.
 *
 * Two storage shapes exist and both are read as-is rather than migrated:
 *   store "exam" → "da-exam-v1:<key>", { answers: { id: {given, correct} } }
 *                  (src/lib/exam/state.js — A1 practice test, IELTS, Life in the UK)
 *   store "dtz"  → "da-dtz-v1:<key>",  same answers plus a schreiben object
 *                  (src/lib/dtzTrainer.js — the B1 skills mock in the /dtz slot)
 * The ids (start-deutsch-1, testdaf, leben-in-deutschland, dtz) are storage keys from the
 * German course and stay; only the texts are English (docs/content-plan.md §2).
 *
 * A module is `scored: false` when a human marks it (a form, a free text). It still
 * carries ids so "done" survives a reload, but it stays out of every point total.
 */
import sd1 from "../../data/pruefungen/start-deutsch-1/uebungssatz-1.json";
import tdaf from "../../data/pruefungen/testdaf/uebungssatz-1.json";
import lid from "../../data/leben-in-deutschland.json";
import dtz1 from "../../data/pruefungen/dtz/uebungssatz-1.json";
// Ids only, written by scripts/check-fuehrerschein.mjs, for the same reason as saetze-index.
import fsIndex from "../../data/fuehrerschein/fragen-index.json";
import { qidsOfPart } from "../dtzTrainer.js";
// Ids only, written by scripts/check-pruefungen.mjs: the full sets stay out of this bundle.
import saetzeIndex from "../../data/pruefungen/saetze-index.json";
import { examLabel } from "./names.js";

const idsOf = (part) => part.items.map((i) => i.id);

/* Leben in Deutschland numbers its federal questions positionally, exactly as
   test.astro does; the state questions depend on the Bundesland the learner picked,
   which only the browser knows — hence `idsFrom`, resolved client-side. */
const lidFederalIds = lid.questions.map((_, i) => "bund-" + (i + 1));

export const examRegistry = [
  {
    id: "start-deutsch-1",
    title: "A1 English practice test",
    subtitle: "Listening · Reading · Writing",
    level: "A1",
    href: "/start-deutsch-1",
    overview: "/telc",
    store: { kind: "exam", key: "start-deutsch-1" },
    // No official exam behind this test (content-plan §2): 60 % is our own convention.
    passNote: "Our own guide: 60 % of the Listening and Reading points. This is not an official exam.",
    passPct: 60,
    modules: [
      { key: "hoeren1", label: "Listening · Part 1", ids: idsOf(sd1.hoeren.teil1) },
      { key: "hoeren2", label: "Listening · Part 2", ids: idsOf(sd1.hoeren.teil2) },
      { key: "hoeren3", label: "Listening · Part 3", ids: idsOf(sd1.hoeren.teil3) },
      { key: "lesen1", label: "Reading · Part 1", ids: idsOf(sd1.lesen.teil1) },
      { key: "lesen2", label: "Reading · Part 2", ids: idsOf(sd1.lesen.teil2) },
      { key: "lesen3", label: "Reading · Part 3", ids: idsOf(sd1.lesen.teil3) },
      { key: "schreiben", label: "Writing", ids: ["s-formular", "s-nachricht"], scored: false },
    ],
  },
  {
    id: "testdaf",
    title: "IELTS Academic",
    subtitle: "Reading · Writing",
    level: "Band 5–7",
    href: "/testdaf/uebungssatz",
    overview: "/testdaf",
    store: { kind: "exam", key: "testdaf" },
    // Deliberately no pass percentage: IELTS gives a band score per skill and every
    // institution sets its own requirement, so a line here would be invented.
    passNote: "No pass mark: IELTS gives each skill a band score from 0 to 9, and each university or employer sets the band it needs.",
    passPct: null,
    modules: [
      { key: "lesen1", label: "Reading · Passage 1", ids: idsOf(tdaf.leseverstehen.aufgabe1) },
      { key: "lesen2", label: "Reading · Passage 2", ids: idsOf(tdaf.leseverstehen.aufgabe2) },
      { key: "lesen3", label: "Reading · Passage 3", ids: idsOf(tdaf.leseverstehen.aufgabe3) },
      { key: "schreiben", label: "Writing", ids: ["tdaf-schreiben"], scored: false },
    ],
  },
  {
    id: "leben-in-deutschland",
    title: "Leben in Deutschland",
    subtitle: "Einbürgerungstest",
    level: "Wissenstest",
    href: "/leben-in-deutschland/test",
    overview: "/leben-in-deutschland",
    store: { kind: "exam", key: "leben-in-deutschland" },
    passNote: `Bestanden ab ${lid.meta.passScore} von ${lid.meta.totalQuestions} Fragen.`,
    passPct: Math.round((lid.meta.passScore / lid.meta.totalQuestions) * 100),
    modules: [
      { key: "bund", label: "Bundesweit", ids: lidFederalIds },
      // The ids depend on the Bundesland stored in "da-lid-land"; only the browser
      // knows which one, so the client resolves this. The count shown until then is
      // Bayern's, the default the trainer itself falls back to.
      { key: "land", label: "Mein Bundesland", idsFrom: "lid-land" },
    ],
  },
  {
    id: "dtz",
    title: "DTZ",
    subtitle: dtz1.label,
    level: "A2 / B1",
    href: "/dtz/uebungssatz",
    overview: "/dtz",
    store: { kind: "dtz", key: dtz1.id },
    passNote: "Hören und Lesen zählen zusammen: ab 20 Punkten Stufe A2, ab 33 Stufe B1.",
    passPct: Math.round((33 / 45) * 100),
    modules: [
      ...dtz1.parts.map((part, i) => ({
        key: "teil-" + (i + 1),
        label: part.label,
        ids: qidsOfPart(part),
      })),
      // The DTZ trainer keeps its writing task outside `answers`, in its own
      // { task, text, selfRate } object, so "done" is the self-rating being set
      // rather than an id being present. `doneFrom` tells the client that.
      { key: "schreiben", label: "Schreiben", ids: [], scored: false, doneFrom: "dtz-schreiben" },
    ],
  },
  // Führerschein: the own question bank, one module per lesson. Üben and the
  // Übungssimulation both write their answers here (src/lib/fahrQuiz.js). No pass percentage:
  // the real test counts Fehlerpunkte, not a share of right answers.
  {
    id: "fuehrerschein",
    title: "Führerschein",
    subtitle: "Theorie Klasse B · eigene Fragen",
    level: "Wissenstest",
    href: "/fuehrerschein/ueben",
    overview: "/fuehrerschein",
    store: { kind: "exam", key: "fuehrerschein" },
    passNote: `Prüfung: bestanden mit höchstens ${fsIndex.maxFehlerpunkte} Fehlerpunkten, nie mit zwei falschen 5-Punkte-Fragen. Die Simulation prüft genau das.`,
    passPct: null,
    modules: fsIndex.modules,
  },
  // The Übungssätze on the generic engine (src/data/pruefungen/saetze/): one entry per file.
  ...saetzeIndex.map((set) => ({
    id: set.id,
    title: examLabel(set),
    subtitle: set.title,
    level: set.level,
    href: `/${set.exam}/${set.slug}`,
    overview: `/${set.exam}`,
    store: { kind: "exam", key: set.id },
    passNote: set.scoring?.note ?? "",
    passPct: set.scoring?.passPct ?? 60,
    modules: set.modules.flatMap((m) =>
      m.parts.map((p) => ({ key: `${m.key}-${p.teil}`, label: `${m.name} · Part ${p.teil}`, ids: p.ids, scored: p.scored })),
    ),
  })),
];

/** The Bundesland question ids for one state, in the trainer's own numbering. */
export function lidLandIds(landId) {
  const land = lid.bundeslaender.find((l) => l.id === landId) ?? lid.bundeslaender[0];
  return land.stateQuestions.map((_, i) => "land-" + land.id + "-" + (i + 1));
}

/** Bayern is the trainer's fallback, so it is what the registry counts until the
 *  browser says otherwise. */
export const lidDefaultLandIds = lidLandIds("bayern");

export function examById(id) {
  return examRegistry.find((e) => e.id === id) ?? null;
}

/** Scored ids only — what a points total is allowed to be built from. */
export function scoredIdsOf(exam, resolve = () => []) {
  return exam.modules
    .filter((m) => m.scored !== false)
    .flatMap((m) => (m.idsFrom ? resolve(m.idsFrom) : m.ids));
}
