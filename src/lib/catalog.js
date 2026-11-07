/* The one catalogue behind every "what can I practise here?" surface.
 *
 * /exercises and / used to carry their own copy of the same thirteen entries, which is how
 * the homepage ended up advertising "31 Nomen" for a trainer that had read 864 out of the
 * lexicon for a week. Counts are derived here, once, from the same data the tools load.
 *
 * `group` is what makes the ask-first picker possible: five buckets in the learner's words
 * ("Wörter"), not the product's ("Wortschatz & Redemittel"). Everything keeps its i18n key,
 * so the German strings below stay the pre-translation fallback, not the only version.
 */
import { REDEWENDUNGEN_LIVE } from "./redewendungenLive.js";
import { counts, asArtikelRows } from "./lexicon.js";
import { taskCountOf } from "./grammarTasks.js";
import { isReviewed } from "./topicStatus.js";
import { topicPath, itemPath } from "./routes.js";
import { lernsets } from "./lernsets.js";
import { published as publishedWords } from "./wortgeschichte.js";
import artikel from "../data/artikel.json";
import einstufung from "../data/einstufung.json";
import grammatik from "../data/grammatik.json";
import wortschatz from "../data/wortschatz.json";
import sprechen from "../data/sprechen.json";
import sprechenB1B2 from "../data/sprechen-b1b2.json";
import lesen from "../data/lesen.json";
import hoeren from "../data/hoeren.json";
// The index files, not src/lib/fertigkeiten.js: that module imports NAV_LEVELS from here,
// and the nav only ever needs what an index already carries — id, level, title, type. The
// resolved content (the borrowed DTZ texts, the pictures) is the pages' business.
import lesenIndex from "../data/fertigkeiten/lesen.json";
import schreibenIndex from "../data/fertigkeiten/schreiben.json";
import sprechenIndex from "../data/fertigkeiten/sprechen.json";
import kultur from "../data/kultur.json";
import fehlerNachSprache from "../data/fehler-nach-sprache.json";
import kulturInsider from "../data/kultur-insider.json";
import downloads from "../data/downloads.json";
import lid from "../data/leben-in-deutschland.json";
import verbenPraepositionen from "../data/grammatik/verben-praepositionen.json";
import praepTrainer from "../data/praepositionen-trainer.json";

// The grammar catalogue has two pools and the hub tiles have to count both of them.
// src/data/grammatik/*.json are full workspaces (a concept card plus up to five exercise
// types); grammatik.json holds the quiz-only topics still waiting for one. A workspace
// shadows the quiz entry with the same id.
const workspaceModules = import.meta.glob("../data/grammatik/*.json", { eager: true });
// Deutsch für den Beruf (FACHVOKABULAR-TIERED-PROMPT.md, Tier 3): the word count over every
// profession deck, refs included — the number the /english-for-work hub shows.
const berufeDecks = Object.values(import.meta.glob("../data/berufe/*.json", { eager: true, import: "default" }));
const berufeWordCount = berufeDecks.reduce((n, d) => n + (d.groups ?? []).reduce((m, g) => m + (g.words ?? []).length, 0), 0);
const workspaces = Object.values(workspaceModules).map((m) => m.default ?? m).filter(isReviewed);
const workspaceIds = new Set(workspaces.map((w) => w.id));

const grammarQuestionCount = grammatik.reduce((sum, t) => sum + t.questions.length, 0);
// Every gradeable answer behind the Grammatik tile. It used to advertise the 7 quiz
// topics alone — "7 Themen · 37 Fragen" — while the page behind it listed 28, so the 21
// workspaces (Wechselpräpositionen among them) were invisible from the hub and looked
// like they did not exist. taskCountOf is the same arithmetic the topic pages and the
// dashboard use, so the three cannot disagree.
const grammarTopicCount = workspaces.length + grammatik.filter((t) => !workspaceIds.has(t.id)).length;
const grammarTaskCount =
  workspaces.reduce((n, w) => n + taskCountOf(w), 0) +
  grammatik.filter((t) => !workspaceIds.has(t.id)).reduce((n, t) => n + t.questions.length, 0);
const readingQuestionCount = lesen.groups.reduce((sum, g) => sum + g.questions.length, 0);
const hoerenQuestionCount = hoeren.texts.reduce((sum, t) => sum + t.questions.length, 0);
export const prepositionVerbCount = verbenPraepositionen.concept.reference.boxes.reduce((n, b) => n + b.items.length, 0);

// Präpositionen were spread across the catalogue: Wechselpräpositionen sat unlisted
// behind the Grammatik tile, "Verben mit Präpositionen" had a tile of its own, and a
// learner asking "wo sind die Präpositionen?" found neither from /exercises. They get one
// area instead — see src/pages/praepositionen.astro — and this is the list it
// and the tile above it both read.
const PRAEPOSITION_IDS = ["wechselpraepositionen", "praepositionen"];
export const praepositionTopics = PRAEPOSITION_IDS
  .map((id) => workspaces.find((w) => w.id === id))
  .filter(Boolean)
  .map((w) => ({
    id: w.id,
    name: w.name,
    level: w.level,
    subtitle: w.subtitle,
    href: topicPath(w.slug ?? w.id),
    exercises: w.exercises.length,
    tasks: taskCountOf(w),
  }));
const praepositionTaskCount = praepositionTopics.reduce((n, t) => n + t.tasks, 0);
const praepTrainerTasks = praepTrainer.packs.reduce((n, p) => n + p.questions.length, 0);

const kulturTopicCount = kultur.topics.length;
const kulturQuizCount = kultur.topics.reduce((n, t) => n + t.quiz.length, 0);

/* The menu quotes the sitting, not the pile.
   "A1 · 650 Wörter" and "der/die/das-Trainer · 864 Nomen" are both true and both the wrong
   number to put on a button: nobody sits down to 650 of anything, and a learner reading it
   decides they cannot. What they actually get when they click is 25 cards (the trainer runs
   the level in parts of PART_SIZE) or 25 nouns (one Artikel-Runde), and 25 is a number you
   can look at and think "that, I can do". The totals are not hidden — they are on the deck
   pages and in the picker, where someone asking "how big is A1?" goes looking. */
const PART_SIZE = 25;
const ARTIKEL_ROUND = 25; // SESSION_SIZE in components/ArtikelTrainer.astro

/** How many sittings a pile of `n` breaks into. "Runde" rather than "Teil": Teil is taken
    — a Portion route (a1-teil-03) is a named 20-word cut of a level — and Runde is already
    the word this site uses for one sitting, on the Artikel-Trainer's "Neue Runde". */
const parts = (n) => Math.max(1, Math.ceil(n / PART_SIZE));

export const lexiconCounts = counts();

export const tools = [
  { id: "artikel", group: "grammatik", href: "/articles", icon: "target",
    titleKey: "tool.artikel.title", title: "der/die/das-Trainer", shortKey: "group.short.artikel", short: "Artikel",
    descKey: "tool.artikel.desc", desc: "Artikel gezielt üben, mit sofortigem Feedback.",
    countKey: "tool.artikel.round", countVars: { n: ARTIKEL_ROUND }, count: `${ARTIKEL_ROUND} Nomen pro Übung` },
  { id: "grammatik", group: "grammatik", href: "/grammar", icon: "book",
    titleKey: "tool.grammatik.title", title: "Grammatik", shortKey: "tool.grammatik.title", short: "Grammatik",
    // Inside the Grammatik column of the menu, "Grammatik" was the row under a heading of
    // the same word pointing at the same URL — two controls, one destination, one nested
    // in the other. There the row's job is to say what it is beside its two siblings:
    // they each drill one thing, this is the whole set. Standalone (the /exercises card
    // grid mixes subjects, the exam pages list it among five tools) it stays "Grammatik",
    // because "Alle Themen" with no Grammatik above it names nothing.
    menuTitleKey: "tool.grammatik.allTopics", menuTitle: "Alle Themen",
    descKey: "tool.grammatik.desc", desc: "Themen nach Niveau: Akkusativ, Dativ, Passiv und mehr.",
    countKey: "tool.grammatik.count", countVars: { n: grammarTopicCount, q: grammarTaskCount }, count: `${grammarTopicCount} Themen · ${grammarTaskCount} Aufgaben` },
  // The tile opens the Präpositionen trainer (A1–B2 topics plus the Wechselpräpositionen);
  // the two full grammar topics are linked from inside it. Counts are the trainer's.
  { id: "praep", group: "grammatik", href: "/prepositions", icon: "link",
    titleKey: "tool.praepositionen.title", title: "Präpositionen", shortKey: "group.short.praep", short: "Präpositionen",
    descKey: "tool.praepositionen.desc", desc: "Von mit, für und am bis aufgrund und darauf — A1 bis B2, mit den Wechselpräpositionen.",
    countKey: "tool.praepositionen.count", countVars: { n: praepTrainer.packs.length, q: praepTrainerTasks },
    count: `${praepTrainer.packs.length} Themen · ${praepTrainerTasks} Aufgaben` },
  { id: "wortschatz", group: "woerter", href: "/vocabulary", icon: "folder",
    titleKey: "tool.wortschatz.title", title: "Wortschatz & Redemittel", shortKey: "group.short.wortschatz", short: "Wortschatz",
    descKey: "tool.wortschatz.desc", desc: "Karteikarten zum Umdrehen und Wiederholen.",
    countKey: "tool.wortschatz.count", countVars: { n: wortschatz.length }, count: `${wortschatz.length} Karten` },
  { id: "aussprache", group: "woerter", href: "/pronunciation", icon: "volume",
    titleKey: "tool.aussprache.title", title: "Aussprache-Training", shortKey: "group.short.aussprache", short: "Aussprache",
    descKey: "tool.aussprache.desc", desc: "Wörter anhören und im Langsam-Modus üben.",
    countKey: "tool.aussprache.count", countVars: { n: wortschatz.length + artikel.length }, count: `${wortschatz.length + artikel.length} Wörter` },
  { id: "berufe", group: "woerter", href: "/english-for-work", icon: "target",
    titleKey: "tool.berufe.title", title: "Spanish for work", shortKey: "group.short.berufe", short: "Work",
    descKey: "tool.berufe.desc", desc: "Job vocabulary for Spain: care work, bars and restaurants, cleaning, farm work, construction and more.",
    countKey: "tool.berufe.count", countVars: { n: berufeWordCount }, count: `${berufeWordCount} words`,
    keywords: "work job jobs trabajo empleo workplace vocabulary spanish for work care carer cuidador cuidadora residencia hostelería hospitality bar restaurant kitchen camarero cocina cleaning limpieza empleada de hogar domestic farm campo agriculture invernadero temporero recogida construction obra albañil shop supermarket supermercado cajero warehouse almacén logistics carretilla delivery reparto repartidor driver camión hotel camarera de pisos recepción office oficina administrativo" },
  { id: "hoeren", group: "fertigkeiten", href: "/listening", icon: "volume",
    titleKey: "tool.hoeren.title", title: "Hörverstehen", shortKey: "group.short.hoeren", short: "Hören",
    descKey: "tool.hoeren.desc", desc: "Durchsagen, Telefonate und Gespräche — mit Transkript und Tempo-Regler.",
    countKey: "tool.hoeren.count", countVars: { n: hoeren.texts.length, q: hoerenQuestionCount },
    count: `${hoeren.texts.length} Hörtexte · ${hoerenQuestionCount} Fragen` },
  { id: "sprechen", group: "fertigkeiten", href: "/speaking/", icon: "mic",
    titleKey: "tool.sprechen.title", title: "Sprechen", shortKey: "group.short.sprechen", short: "Sprechen",
    descKey: "tool.sprechen.desc", desc: "Vorstellen, Bild beschreiben, Kurzvortrag — mit Timer.",
    countKey: "tool.sprechen.count", countVars: { n: sprechenIndex.tasks.length },
    count: `${sprechenIndex.tasks.length} Aufgaben` },
  { id: "lesen", group: "fertigkeiten", href: "/reading", icon: "book-open",
    titleKey: "tool.lesen.title", title: "Leseverstehen", shortKey: "group.short.lesen", short: "Lesen",
    descKey: "tool.lesen.desc", desc: "Schilder, Anzeigen, E-Mails und Artikel — A1 bis B2.",
    countKey: "tool.lesen.count", countVars: { n: lesenIndex.texts.length },
    count: `${lesenIndex.texts.length} Lesetexte` },
  { id: "schreiben", group: "fertigkeiten", href: "/writing", icon: "pencil",
    titleKey: "skill.schreiben", title: "Schreiben", shortKey: "skill.schreiben", short: "Schreiben",
    descKey: "tool.schreiben.desc", desc: "Formulare, Nachrichten und Briefe — mit Modelltext.",
    countKey: "tool.sprechen.count", countVars: { n: schreibenIndex.tasks.length },
    count: `${schreibenIndex.tasks.length} Aufgaben` },
  { id: "kultur", group: "kultur", href: "/culture", icon: "map-pin",
    titleKey: "tool.kultur.title", title: "Kulturwissen", shortKey: "group.short.kultur", short: "Kultur",
    descKey: "tool.kultur.desc", desc: "Wie Deutschland im Alltag funktioniert — mit Quiz.",
    countKey: "tool.kultur.count", countVars: { n: kulturTopicCount, q: kulturQuizCount },
    count: `${kulturTopicCount} Themen · ${kulturQuizCount} Fragen` },
];

/* The landing grid.
 * ---------------------------------------------------------------------------
 * `tools` is the full inventory: one entry per trainer, which is what the nav menus, the
 * PracticePicker and ExamPractice all need — they look things up by id and they list
 * what exists.
 *
 * A landing page is not an inventory. Ten tiles is a wall a visitor reads as "a lot of
 * things" rather than as an offer, and five of the ten were one tile's worth of idea
 * split five ways: Aussprache and Hören are both "listen to German", and Sprechen, Lesen
 * and Schreiben are the three halves of the same exam that /skills already
 * presents together. Nobody arrives wanting "Schreiben" specifically; they arrive wanting
 * to know whether the four Fertigkeiten are covered.
 *
 * So the grid quotes seven, and the five merged trainers keep their own pages, their own
 * nav entries and their own ids — nothing is removed, one tap moved.
 */
/** The count line for a merged tile. Not the parts' own lines concatenated: strung
 *  together they repeat a word ("20 Aufgaben · 11 Lesetexte · 8 Aufgaben") and run to
 *  three numbers, which is a paragraph on a 200px tile. One number per thing, named by
 *  the thing, in the order the title names them. */
const sumCount = (...parts) => parts.join(" · ");

export const landingTools = (() => {
  const t = Object.fromEntries(tools.map((x) => [x.id, x]));
  const merged = {
    hoerenAussprache: {
      id: "hoeren-aussprache", group: "fertigkeiten", href: "/skills#hoeren", icon: "volume",
      titleKey: "tool.hoerenAussprache.title", title: "Hören & Aussprache",
      shortKey: "group.short.hoeren", short: "Hören",
      descKey: "tool.hoerenAussprache.desc",
      desc: "Durchsagen, Telefonate und Gespräche mit Transkript — und einzelne Wörter im Langsam-Modus.",
      countKey: "tool.hoerenAussprache.count",
      countVars: { n: hoeren.texts.length, w: wortschatz.length + artikel.length },
      count: sumCount(`${hoeren.texts.length} Hörtexte`, `${wortschatz.length + artikel.length} Wörter`),
    },
    fertigkeiten: {
      id: "fertigkeiten", group: "fertigkeiten", href: "/skills#sprechen", icon: "mic",
      titleKey: "tool.fertigkeiten.title", title: "Sprechen, Lesen & Schreiben",
      shortKey: "group.short.sprechen", short: "Fertigkeiten",
      descKey: "tool.fertigkeiten.desc",
      desc: "Die drei Prüfungsteile am Stück: Bild beschreiben, Texte verstehen, Briefe schreiben.",
      countKey: "tool.fertigkeiten.count",
      countVars: {
        s: sprechenIndex.tasks.length,
        l: lesenIndex.texts.length,
        w: schreibenIndex.tasks.length,
      },
      count: sumCount(
        `${sprechenIndex.tasks.length} Sprechen`,
        `${lesenIndex.texts.length} Lesen`,
        `${schreibenIndex.tasks.length} Schreiben`,
      ),
    },
    // The eighth tile: the placement test had no way in from the hub, and "welches Niveau
    // bin ich?" is the question in front of every other tile here.
    einstufung: {
      id: "einstufung", group: "grammatik", href: "/placement-test", icon: "bars",
      titleKey: "tool.einstufung.title", title: "Einstufungstest",
      shortKey: "tool.einstufung.title", short: "Einstufung",
      descKey: "tool.einstufung.desc", desc: "Where do you stand? A few questions per level, A1 to C1.",
      countKey: "tool.einstufung.count",
      // What a learner answers, not the size of the bank: two questions per level
      // (PER_LEVEL in src/pages/einstufungstest.astro), so at most 10 for A1–C1.
      countVars: { n: 2 * Object.values(einstufung.levels).filter((l) => l.length > 0).length },
      count: `up to ${2 * Object.values(einstufung.levels).filter((l) => l.length > 0).length} questions`,
    },
  };
  // Order matters: grammar first (what most people come for), then words, then the two
  // skill tiles, then Landeskunde — and the placement test last, as the way in for anyone
  // who does not know where to start. Eight, so the four-column grid closes in two rows.
  return [
    t.artikel, t.grammatik, t.praep, t.wortschatz,
    merged.hoerenAussprache, merged.fertigkeiten, t.kultur, merged.einstufung,
  ];
})();

export const exams = [
  // Exam names per docs/content-plan.md §2 (ids are the old slots; hrefs renamed by `routes`).
  { id: "telc", group: "pruefungen", href: "/trinity", icon: "document", title: "SIELE by level", short: "SIELE levels", count: "A2–C1" },
  { id: "goethe", group: "pruefungen", href: "/cambridge", icon: "landmark", title: "DELE", short: "DELE", count: "A1–C2" },
  { id: "testdaf", group: "pruefungen", href: "/ielts", icon: "graduation-cap", title: "SIELE", short: "SIELE", count: "A1–C1" },
  { id: "dtz", group: "pruefungen", href: "/trinity/ise-1", icon: "book-open", title: "DELE A2 for nationality", short: "DELE A2", count: "A2" },
  { id: "lid", group: "pruefungen", href: "/life-in-the-uk", icon: "map-pin", titleKey: "exam.lid.name", title: "CCSE nationality test", short: "CCSE",
    keywords: "ccse nacionalidad nationality citizenship naturalisation constitución constitution spain",
    countKey: "group.count.bundeslaender", countVars: { n: lid.bundeslaender.length }, count: `${lid.bundeslaender.length} regions` },
];

export const groups = [
  { id: "grammatik", icon: "book", nameKey: "group.grammatik.name", name: "Grammatik", blurbKey: "group.grammatik.blurb", blurb: "Artikel, Fälle, Zeiten" },
  { id: "woerter", icon: "folder", nameKey: "group.woerter.name", name: "Wörter & Aussprache", blurbKey: "group.woerter.blurb", blurb: "Vokabeln hören und behalten" },
  { id: "fertigkeiten", icon: "mic", nameKey: "group.fertigkeiten.name", name: "Sprechen, Lesen & Schreiben", blurbKey: "group.fertigkeiten.blurb", blurb: "Prüfungsteile am Stück üben" },
  { id: "kultur", icon: "map-pin", nameKey: "group.kultur.name", name: "Landeskunde", blurbKey: "group.kultur.blurb", blurb: "Alltag und Kultur in Deutschland" },
  { id: "pruefungen", icon: "graduation-cap", nameKey: "nav.exams", name: "Prüfungen", blurbKey: "group.pruefungen.blurb", blurb: "DELE, SIELE and the CCSE" },
];

export const entries = [...tools, ...exams];
export const total = entries.length;

export function itemsOf(groupId) {
  // `menuTitle` wins here and only here: these items are rendered under their group's
  // own heading, which supplies the context a standalone card does not have.
  return entries
    .filter((e) => e.group === groupId)
    .map((e) => (e.menuTitle ? { ...e, title: e.menuTitle, titleKey: e.menuTitleKey } : e));
}

// ---------------------------------------------------------------------------
// The nav's subject-focused shape
// ---------------------------------------------------------------------------
// The menu used to mirror the URL tree — "Übungen" and "Prüfungen" — which asked a
// learner to know which bucket a tool lives in before they could find it. It now names
// subjects instead (Grammatik, Wortschatz, Sprechen, Prüfungen) plus the two entries
// that are about the learner rather than the material: Niveaus and Profil.
//
// Landeskunde rode along under Sprechen while it was a single topic — one tool does not
// earn its own menu. With fifteen topics and a quiz over all of them it does, so it is
// its own section now. It keeps its group in `groups` above, which is what /exercises
// and the picker read.


/* --- Niveaus --------------------------------------------------------------- */

// A1–B2 only. C1/C2 exist in the lexicon's level list but have no topic and no words
// yet, and a menu that opens onto four empty levels teaches the wrong thing about the
// site. They join the moment `levels` below finds content for them.
export const NAV_LEVELS = ["A1", "A2", "B1", "B2"];

// Landeskunde reaches further than the trainers do. A cultural topic can be written at C1
// without the lexicon having a single C1 word, so it gets its own list rather than waiting
// for grammar and vocabulary to catch up — and NAV_LEVELS stays the honest answer to
// "which levels can I practise at?".
// Grammar is the first trainer to reach C1 (GRAMMAR-PROMPT.md, Tier 3). A level joins the
// grammar menus the moment it has a reviewed topic — drafts are filtered out above, so C1
// stays invisible until Edgar has checked one. NAV_LEVELS is untouched: vocabulary and the
// skills still stop at B2.
export const GRAMMAR_LEVELS = ["A1", "A2", "B1", "B2", "C1"].filter(
  (level) => NAV_LEVELS.includes(level) || workspaces.some((w) => w.level === level),
);

export const KULTUR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Every grammar topic that has a page — workspaces first, so a level leads with its
    fullest topic rather than with a bare quiz. */
export const grammarTopics = [
  ...workspaces.map((w) => ({
    id: w.id, name: w.name, level: w.level,
    href: topicPath(w.slug ?? w.id),
  })),
  ...grammatik
    .filter((t) => !workspaceIds.has(t.id))
    .map((t) => ({ id: t.id, name: t.name, level: t.level, href: topicPath(t.id) })),
];

/* --- The Grammatik-Werkstatt ------------------------------------------------
 *
 * The 21 workspaces on their own, with enough on each to render a card: level, one line
 * of what it is, an icon and how many answers it asks for. /exercises had no way to reach
 * a single one of them — the Grammatik tile led to a level index, and the tile's own
 * count did not include them — so the hub now lists them as their own Bereich.
 *
 * The icons lived in uebungen/grammatik.astro and are shared from here now, because two
 * surfaces drawing the same topic with two different pictures is how a catalogue starts
 * to look like two catalogues.
 */
export const GRAMMAR_ICON = {
  akkusativ: "🎯",
  artikel: "🏷️",
  "w-fragen": "❓",
  "ja-nein-fragen": "🙋",
  "verb-position-2": "🟰",
  praesens: "🏃",
  plural: "👥",
  possessivartikel: "👜",
  imperativ: "📣",
  aduso: "🔗",
  wortarten: "🏷️",
  nomen: "🔤",
  dativ: "🤝",
  modalverben: "🔑",
  "trennbare-verben": "🚶",
  satzstellung: "📊",
  wechselpraepositionen: "🧭",
  negation: "🚫",
  perfekt: "⏪",
  konjugation: "📋",
  praepositionen: "🔗",
  adjektivdeklination: "🎨",
  "adjektivdeklination-a2": "💨",
  "als-oder-wenn": "🎁",
  passiv: "🔄",
  "passiv-b1": "⏮️",
  "zusammengesetzte-verben": "📅",
  "wortbildung-nomen": "🧬",
  "welcher-dieser": "👈",
  "ordinalzahlen": "🔢",
  "zahlen": "💯",
  "adjektive-nach-sein": "🧩",
  "gern": "😊",
  "praeteritum-sein-haben": "🌿",
  "berufe-mit-in": "📦",
  "konjunktiv2-hoeflich": "🙏",
  "komposita": "🎬",
  "positionsadverbien": "🔁",
  "temporale-praepositionen-b1": "⏰",
  "infinitiv-ohne-zu": "🔀",
  "positionsverben": "🤕",
  "adjektive-als-nomen": "✨",
  "funktionen-von-werden": "🤔",
  relativpronomen: "🧩",
  "zweiteilige-konnektoren": "🤨",
  konditionalsaetze: "🚦",
  konsekutivsaetze: "⛰️",
  "zumal-wohingegen": "📢",
  modalsaetze: "🌈",
  "infinitiv-mit-zu": "🌀",
  "indirekte-fragen": "🗣️",
  "n-deklination": "🎞️",
  genitiv: "🎒",
  "praeteritum-plusquamperfekt": "📜",
  irgend: "😬",
  konjunktiv2: "💭",
  negationswoerter: "🎲",
  "partizip-als-adjektiv": "🔐",
  "nomen-verb-verbindungen": "🧱",
  fokuspartikeln: "🦋",
  "reflexive-verben": "🪞",
  "nebensaetze-weil-dass": "💬",
  "komparativ-superlativ": "📈",
  "lokale-praepositionen": "📍",
  personalpronomen: "👤",
  indefinitpronomen: "🕵️",
  "temporale-praepositionen": "🕒",
  futur: "🔮",
  "temporale-nebensaetze": "⏳",
  "da-wo-woerter": "🫵",
  lassen: "🧲",
  modalpartikeln: "🧂",
  "adjektive-mit-praepositionen": "📎",
  "konnektoren-grund-gegengrund": "⚖️",
  finalsaetze: "🏹",
  zustandspassiv: "🗓️",
  "relativsaetze-was-wo": "🪢",
  "konjunktiv-1": "🕰️",
  "subjektive-modalverben": "🪄",
  passiversatz: "🚧",
  partizipialattribute: "📑",
  nominalisierung: "🏛️",
  "nominale-praepositionen": "📰",
  "irreale-vergleiche": "🎭",
  "futur-2": "✂️",
  "es-korrelat": "📌",
  textkohaerenz: "🧵",
  verbpraefixe: "🧷",
  "nutzen-benutzen": "🧠",
  "verben-als-nomen": "🌠",
  "artikel-oder-nicht": "❔",
};

export const grammarWorkspaces = workspaces
  .map((w) => ({
    id: w.id,
    name: w.name,
    level: w.level,
    subtitle: w.subtitle,
    href: topicPath(w.slug ?? w.id),
    icon: GRAMMAR_ICON[w.id] ?? "📚",
    exercises: w.exercises.length,
    tasks: taskCountOf(w),
  }))
  .sort((a, b) => a.level.localeCompare(b.level) || a.name.localeCompare(b.name, "de"));

/** The workspaces cut by level, for any surface that lists them as a Bereich. */
export const grammarWorkspaceLevels = GRAMMAR_LEVELS
  .map((level) => ({ level, topics: grammarWorkspaces.filter((t) => t.level === level) }))
  .filter((row) => row.topics.length > 0);

const LEVEL_BLURB = {
  A1: "First sentences",
  A2: "Everyday Spanish",
  B1: "Speaking independently",
  B2: "Arguing with confidence",
  C1: "Saying it precisely",
  C2: "Effortless and exact",
};

export const levels = NAV_LEVELS.map((level) => {
  const slug = level.toLowerCase();
  const grammar = grammarTopics.filter((t) => t.level === level);
  const words = lexiconCounts[level]?.words ?? 0;
  const genderedNouns = asArtikelRows({ level }).length;

  // Only tools that can genuinely be scoped to this level are listed. A level the
  // lexicon has not reached yet shows its grammar and says the words are coming,
  // rather than offering a "Wortschatz B1" that quietly hands back the A1 deck.
  const vocab = [];
  if (genderedNouns) {
    vocab.push({ id: "artikel", icon: "target", title: "der/die/das-Trainer",
      titleKey: "tool.artikel.title",
      href: `/articles?niveau=${level}`, count: `${ARTIKEL_ROUND} Nomen pro Übung`,
      countKey: "tool.artikel.round", countVars: { n: ARTIKEL_ROUND } });
  }
  if (words) {
    vocab.push({ id: "wortschatz", icon: "folder", title: `Wortliste ${level}`,
      titleKey: "nav.vocab.listLevel", titleVars: { level },
      href: `/vocabulary/${slug}`, count: `${parts(words)} Runden · je ${PART_SIZE} Wörter`,
      countKey: "sets.rounds", countVars: { n: parts(words), size: PART_SIZE } });
  }

  return {
    id: level,
    level,
    slug,
    blurbKey: `level.${slug}.blurb`,
    blurb: LEVEL_BLURB[level],
    href: `/grammar#niveau-${slug}`,
    grammar,
    vocab,
    words,
  };
});

const notSelf = (href, list) => list.filter((i) => i.href !== href);

// ---------------------------------------------------------------------------
// Level-tiled subject menus
// ---------------------------------------------------------------------------
// Grammatik, Wortschatz and Fertigkeiten all answer the same question — "what is here for
// me, at my level?" — so all three now use the shape the Niveaus menu already proved: A1–B2
// tiles across the top that switch the list underneath them, with no page load in between.
//
// A level view is a list of columns; a column may end in a "more" link and may declare
// itself empty. The empty states are load-bearing rather than filler. There is no Hören
// material on the site at all and no A1 Leseverstehen, and four tiles that each promise
// content would be a menu lying about the catalogue.

/** One row in a level view. `count` is optional — a grammar topic has nothing to count. */
/* `count` is the German line the server renders; `meta` is what the client i18n pass uses
   to rebuild it. It is split into a type key and a count template because the task type
   ("Durchsage", "Zeitungsartikel") and the numbers translate from different keys, and a
   data-i18n-vars payload is static JSON that cannot itself reference another key.
   Titles carry no key on purpose — a Hörtext or Lesetext title names the situation in the
   language being learnt and stays German. */
const levelRow = (title, href, count, meta) => ({ title, href, count, meta });

const levelHead = (level) => ({
  level,
  slug: level.toLowerCase(),
  blurbKey: `level.${level.toLowerCase()}.blurb`,
  blurb: LEVEL_BLURB[level],
});

/* --- Grammatik -------------------------------------------------------------- */

const grammarLevelView = (level) => {
  const head = levelHead(level);
  const rows = grammarTopics
    .filter((t) => t.level === level)
    .map((t) => levelRow(t.name, t.href));
  // Two balanced columns, not one long one: B1 has eleven topics and a single column of
  // eleven pushes the panel's footer off the bottom of a laptop screen.
  const half = Math.ceil(rows.length / 2);

  return {
    ...head,
    metaKey: "nav.level.topicCount", metaVars: { n: rows.length }, meta: `${rows.length} Themen`,
    cols: [
      { id: "a", items: rows.slice(0, half) },
      { id: "b", items: rows.slice(half) },
    ],
    more: {
      href: `/grammar#niveau-${head.slug}`,
      labelKey: "nav.level.allTopics", labelVars: { n: rows.length }, label: `Alle ${rows.length} Themen`,
    },
  };
};

/* --- Wortschatz ------------------------------------------------------------- */

// A level has 26–46 Lernsets. Five is what fits beside the word lists without the panel
// growing a scrollbar; the rest are one click away on the level's own deck page, which
// carries the full picker at the bottom.
const VOCAB_SETS_PREVIEW = 5;

const vocabLevelView = (level) => {
  const head = levelHead(level);
  const words = lexiconCounts[level]?.words ?? 0;
  const nouns = asArtikelRows({ level }).length;
  const sets = lernsets({ level, status: "built" });

  // Only what this level can actually open. A level the lexicon has not reached says the
  // words are coming rather than handing back another level's deck.
  const lists = [];
  if (words) {
    lists.push({ ...levelRow(`Wortliste ${level}`, `/vocabulary/${head.slug}`,
      `${parts(words)} Runden · je ${PART_SIZE} Wörter`),
      titleKey: "nav.vocab.listLevel", titleVars: { level },
      countKey: "sets.rounds", countVars: { n: parts(words), size: PART_SIZE } });
  }
  if (nouns) {
    lists.push({ ...levelRow(`el / la · ${level}`, `/articles?niveau=${level}`,
      `${ARTIKEL_ROUND} Nomen pro Übung`),
      countKey: "tool.artikel.round", countVars: { n: ARTIKEL_ROUND } });
  }

  return {
    ...head,
    // Just the count on the tile: "26 Sets · je 25 Wörter" wrapped to two lines and made
    // every tile taller. The rows under it carry the size.
    metaKey: "nav.level.setCount", metaVars: { n: sets.length },
    meta: `${sets.length} Lernsets`,
    cols: [
      {
        id: "listen", name: "Wortlisten", nameKey: "nav.vocab.lists", icon: "folder",
        items: lists,
        empty: "Wortlisten für dieses Niveau folgen.", emptyKey: "nav.level.vocabSoon",
      },
      {
        id: "sets", name: "Lernsets", nameKey: "nav.vocab.sets", icon: "layers",
        items: sets.slice(0, VOCAB_SETS_PREVIEW)
          .map((s) => ({ ...levelRow(s.title, `/vocabulary/${s.id}`, `${s.words} Wörter`),
            titleKey: `ws.set.${s.id}`, countKey: "tool.aussprache.count", countVars: { n: s.words } })),
        more: sets.length > VOCAB_SETS_PREVIEW
          ? {
              href: `/vocabulary/${head.slug}`,
              labelKey: "nav.vocab.allSets", labelVars: { n: sets.length }, label: `Alle ${sets.length} Lernsets`,
            }
          : null,
        empty: "Lernsets für dieses Niveau folgen.", emptyKey: "nav.vocab.setsSoon",
      },
    ],
  };
};

/* --- Landeskunde ------------------------------------------------------------ */

/* The Landeskunde menu's entries: the quiz first, because it is the one thing that
   spans every topic, then the topics in the hub's own order. No i18n keys — topic
   titles live in kultur.json and are not translated yet, so they render as written. */
const kulturQuizItem = {
  id: "kultur-quiz", href: "/culture/quiz", icon: "target",
  title: "Quiz über alle Themen", titleKey: "nav.kultur.quizAll", count: `${kulturQuizCount} Fragen`,
  countKey: "grammatik.card.questions", countVars: { n: kulturQuizCount },
};

/* The two Landeskunde pages that are not topics of kultur.json: they have their own data
   files and their own shape, so they sit beside the quiz rather than in a level group. */
const fehlerCount = fehlerNachSprache.languages.length;
const kulturFehlerItem = {
  id: "kultur-fehler", href: "/culture/mistakes", icon: "pencil",
  title: "Typische Fehler nach Muttersprache", titleKey: "nav.kultur.fehler",
  count: `${fehlerCount} Sprachen`,
  countKey: "nav.kultur.fehlerCount", countVars: { n: fehlerCount },
};
const insiderCount = kulturInsider.topics.length;
const kulturInsiderItem = {
  id: "kultur-insider", href: "/culture/insider", icon: "landmark",
  title: "Deutschland von innen", titleKey: "nav.kultur.insider",
  count: `${insiderCount} Themen`,
  countKey: "nav.kultur.insiderCount", countVars: { n: insiderCount },
};
/* Fakten über Deutschland: the Einbürgerungstest's fact pages, listed under Landeskunde too.
   The same facts serve both: a learner reading about Germany meets the exam, and one
   preparing for the exam is reading Landeskunde anyway. */
const kulturLidFaktenItem = {
  id: "kultur-lid-fakten", href: "/life-in-the-uk/facts", icon: "graduation-cap",
  title: "Facts about Spain", titleKey: "nav.kultur.lidFakten",
  count: "CCSE nationality test", countKey: "nav.kultur.lidFaktenHint",
};
const kulturFeatures = [kulturQuizItem, kulturFehlerItem, kulturInsiderItem];

/* `level: false` drops the level out of the count line: inside a level section the heading
   already says it, and "B1 · B1 · 4 Fragen" is what the learner would be reading. The flat
   list below has no heading over it, so there it stays. */
const kulturItem = (t, { level = true } = {}) => ({
  id: `kultur-${t.id}`,
  href: itemPath("/culture", t.id),
  icon: t.icon,
  title: t.title,
  count: level ? `${t.level} · ${t.quiz.length} Fragen` : `${t.quiz.length} Fragen`,
  countKey: level ? "nav.kultur.levelQuestions" : "grammatik.card.questions",
  countVars: level ? { level: t.level, n: t.quiz.length } : { n: t.quiz.length },
});

/* Fifteen topics in one list is a wall: the menu needed a scrollbar in both directions and
   nothing in it could be found by scanning. Both cuts below fix that; they just answer to
   different constraints, so the desktop panel and the drawer no longer share one.

   Desktop keeps the subject cut — Wohnen, Ämter, Umgang, Bildung, Land. Five tabs fit in
   one row, each tab names something a learner recognises, and the panel's height is one
   group's worth however many topics land later. Two levels as two columns looked thinner
   than the catalogue is.

   The drawer gets the level cut. There are no tabs on a phone, the pane scrolls, and under
   a heading that says "A2" a learner can tell at a glance which rows are meant for them —
   which is the one thing a stacked subject list cannot say.

   `group` and `level` both live on the topic in kultur.json; neither view is derived from
   the other. */
const KULTUR_GROUPS = [
  { id: "wohnen", name: "Wohnen & Alltag", nameKey: "nav.kultur.wohnen" },
  { id: "aemter", name: "Ämter & Versicherung", nameKey: "nav.kultur.aemter" },
  { id: "umgang", name: "Umgang & Gewohnheiten", nameKey: "nav.kultur.umgang" },
  { id: "bildung", name: "Schule & Ausbildung", nameKey: "nav.kultur.bildung" },
  { id: "land", name: "Land & Kalender", nameKey: "nav.kultur.land" },
];

// Ordered by how soon a newcomer meets them, not alphabetically — registering with the
// Amt comes before joining a Verein.
const kulturNavGroups = KULTUR_GROUPS.map((g) => ({
  ...g,
  items: kultur.topics.filter((t) => t.group === g.id).map((t) => kulturItem(t)),
}));

// The drawer's cut. Full lists, no preview: the pane scrolls, so every topic is right
// there under its heading.
// The Kultur levels are named by what their topics are about, not by the course's level
// names: "Erste Sätze" is right for grammar and words, but the A1 culture topics are Du/Sie,
// Pfand and Sonntagsruhe — a heading promising sentences misled.
const KULTUR_LEVEL_NAME = {
  A1: "Du, Sie & erste Regeln",
  A2: "Land & Alltag",
  B1: "Ämter, Wohnen, Schule",
  B2: "Arbeit & Gesellschaft",
  C1: "Staat & Sozialsystem",
  C2: "Recht & Geschichte",
};

const kulturLevelGroups = KULTUR_LEVELS
  .map((level) => ({
    id: level.toLowerCase(),
    slug: level.toLowerCase(),
    level,
    name: level,
    blurbKey: `kultur.level.${level.toLowerCase()}`,
    blurb: KULTUR_LEVEL_NAME[level],
    items: kultur.topics.filter((t) => t.level === level).map((t) => kulturItem(t, { level: false })),
  }))
  .filter((g) => g.items.length);

/** The same cut, for the hub page — which wants the level's blurb as a heading. */
export const kulturLevels = kulturLevelGroups;

// Loud rather than silent: a topic added to kultur.json without a known `group` would
// otherwise just quietly stop appearing in the desktop menu.
const ungrouped = kultur.topics.filter((t) => !KULTUR_GROUPS.some((g) => g.id === t.group));
if (ungrouped.length) {
  throw new Error(`kultur.json: kein bekanntes group-Feld für ${ungrouped.map((t) => t.id).join(", ")}`);
}

// Loud rather than silent: a topic whose level is outside A1–B2 would otherwise just
// quietly stop appearing in the menu.
const offLevel = kultur.topics.filter((t) => !KULTUR_LEVELS.includes(t.level));
if (offLevel.length) {
  throw new Error(`kultur.json: Niveau außerhalb ${KULTUR_LEVELS.join("/")} bei ${offLevel.map((t) => t.id).join(", ")}`);
}

const kulturNavItems = [...kulturFeatures, ...kultur.topics.map((t) => kulturItem(t))];

/* --- Fertigkeiten ----------------------------------------------------------- */

// Four skills, each with its own A1–B2 row, and each row holds exactly what exists: the
// Leseverstehen and the three Schreibaufgaben are the B1 DTZ simulation, Sprechen is the
// DTZ picture task plus the telc B1/B2 three-stage task, and Hören is src/data/hoeren.json
// — sixteen scripts written for this site and voiced with generated TTS, four per level.
//
// A skill still says "folgt" for a level it has nothing at, and that is the point: Lesen
// and Schreiben genuinely stop at B1 today, and a menu that pretended otherwise would be
// the one thing worse than a thin menu.
// Every skill now reads from a per-exercise index in src/data/fertigkeiten/, the way Hören
// has from the start. Before that, Lesen and Schreiben were two and three anchors on one
// B1 page, so the menu said "2 Übungen" where Hören said "16" — the same number counting
// two different things. `byLevelFrom` is what makes them comparable again.
const indexLevels = (items, row) =>
  Object.fromEntries(
    NAV_LEVELS.map((level) => [level, items.filter((i) => i.level === level).map(row)]),
  );

const SKILLS = [
  {
    id: "hoeren", name: "Hören", nameKey: "nav.skill.hoeren", icon: "volume",
    href: "/listening",
    // The count line names the task type rather than the topic, because that is what a DTZ
    // or telc Hörteil actually varies between items. The three skills below follow it.
    byLevel: indexLevels(hoeren.texts, (t) =>
      levelRow(t.title, itemPath("/listening", t.id),
        `${hoeren.types[t.type]} · ${t.questions.length} Fragen`,
        { typeKey: `type.hoeren.${t.type}`, typeText: hoeren.types[t.type],
          countKey: "grammatik.card.questions", countVars: { n: t.questions.length },
          countText: `${t.questions.length} Fragen` })),
  },
  {
    id: "lesen", name: "Lesen", nameKey: "nav.skill.lesen", icon: "book-open",
    href: "/reading",
    byLevel: indexLevels(lesenIndex.texts, (t) =>
      levelRow(t.title, itemPath("/reading", t.id),
        `${lesenIndex.types[t.type]} · ca. ${t.minutes} Min.`,
        { typeKey: `type.lesen.${t.type}`, typeText: lesenIndex.types[t.type],
          countKey: "meta.min", countVars: { m: t.minutes },
          countText: `ca. ${t.minutes} Min.` })),
  },
  {
    id: "schreiben", name: "Schreiben", nameKey: "nav.skill.schreiben", icon: "pencil",
    href: "/writing",
    byLevel: indexLevels(schreibenIndex.tasks, (t) =>
      levelRow(t.title, itemPath("/writing", t.id),
        `${schreibenIndex.types[t.type]} · ca. ${t.minutes} Min.`,
        { typeKey: `type.schreiben.${t.type}`, typeText: schreibenIndex.types[t.type],
          countKey: "meta.min", countVars: { m: t.minutes },
          countText: `ca. ${t.minutes} Min.` })),
  },
  {
    id: "sprechen", name: "Sprechen", nameKey: "nav.skill.sprechen", icon: "mic",
    href: "/speaking/",
    byLevel: indexLevels(sprechenIndex.tasks, (t) =>
      levelRow(t.title, itemPath("/speaking", t.id),
        `${sprechenIndex.types[t.type]} · ${t.seconds} Sek.`,
        { typeKey: `type.sprechen.${t.type}`, typeText: sprechenIndex.types[t.type],
          countKey: "meta.sek", countVars: { s: t.seconds },
          countText: `${t.seconds} Sek.` })),
  },
];

export const skills = SKILLS.map((skill) => ({
  ...skill,
  levels: NAV_LEVELS.map((level) => ({
    ...levelHead(level),
    items: skill.byLevel[level] ?? [],
    empty: skill.soon ? skill.soonText : "Übungen für dieses Niveau folgen.",
    emptyKey: skill.soon ? skill.soonKey : "nav.skill.soon",
  })),
  // Distinct pages, not rows: the picture task counting twice because it spans two levels
  // would put a "4" on a skill with two trainers behind it.
  total: new Set(Object.values(skill.byLevel).flat().map((i) => i.href)).size,
}));

// ---------------------------------------------------------------------------
// The nav's subject menus
// ---------------------------------------------------------------------------
// A section renders one of four ways, checked in this order: `skills` (skill tabs, each
// with its own level row), `levels` (level tiles), `groups` (sub-headings, or tabs past
// TAB_AT of them), or a flat `items` list.
//
// `items` stays a flat union whatever the shape — the noscript fallback and anything else
// that only wants "what is in here" reads it — and `badge` is what the drawer's home row
// counts, because for a level-tiled section the useful number is four levels, not the 135
// Lernsets behind them.
//
// No section lists a link to its own page: the panel footer already goes there. "Grammatik ›
// Grammatik" was the same URL three times in one menu (the menu button, the row, and
// "Übersicht"), which reads as a bug even when it works.

const grammatikTrainer = notSelf("/grammar", itemsOf("grammatik"));

/** The Bruno Kart game (/games/countable-sprint): listed under Spiele in both menus.
 *  Not in `tools`, which feeds the landing grid and the counts. */
const sprintItem = { id: "artikel-sprint", href: "/games/countable-sprint", icon: "sparkle",
  titleKey: "sprint.name", title: "Bruno Kart",
  hintKey: "nav.hint.game", hint: "Spiel, auch mit Freunden",
  countKey: "nav.hint.game", count: "Spiel, auch mit Freunden" };
const wortschatzItems = notSelf("/vocabulary", itemsOf("woerter"));

/** Spiele: the real games, gathered in one place in both menus. There is no /games hub
 *  page, so the section has no href — the desktop head is a label and the drawer pane has
 *  no "Alle …" row. */
const spieleItems = [
  { id: "lindenau", href: "/games/brambleford", icon: "landmark",
    titleKey: "nav.spiele.lindenau", title: "The Legend of Villabruno",
    hintKey: "nav.spiele.lindenauHint", hint: "Role-play in town, A1",
    countKey: "nav.spiele.lindenauHint", count: "Role-play in town, A1" },
  { id: "hoer-safari", href: "/games/listening-safari", icon: "volume",
    titleKey: "nav.spiele.hoerSafari", title: "Hamsti’s Bird Safari",
    hintKey: "nav.spiele.hoerSafariHint", hint: "Hear the word, hit the bird, A1–B1",
    countKey: "nav.spiele.hoerSafariHint", count: "Hear the word, hit the bird, A1–B1" },
  sprintItem,
];

export const navSections = [
  { id: "grammatik", icon: "book", href: "/grammar",
    nameKey: "nav.subject.grammatik", name: "Grammatik",
    blurbKey: "group.grammatik.blurb", blurb: "Artikel, Fälle, Zeiten",
    // Spans the levels rather than sitting inside one: the trainer draws its nouns from
    // A1 and A2 together, so it belongs above the tiles, not under one of them.
    features: [grammatikTrainer[0]],
    levels: GRAMMAR_LEVELS.map(grammarLevelView),
    badge: GRAMMAR_LEVELS.length,
    items: [...grammatikTrainer, ...grammarTopics.map((t) => levelRow(t.name, t.href))] },

  { id: "wortschatz", icon: "folder", href: "/vocabulary",
    nameKey: "nav.subject.wortschatz", name: "Wortschatz",
    blurbKey: "group.woerter.blurb", blurb: "Vokabeln hören und behalten",
    // Not level-scoped — it reads every deck at once — so it sits above the tiles too.
    // Deutsch für den Beruf rides along: it is vocabulary too, just not level-scoped.
    features: [wortschatzItems[0], ...wortschatzItems.filter((e) => e.id === "berufe")],
    levels: NAV_LEVELS.map(vocabLevelView),
    badge: NAV_LEVELS.length,
    items: wortschatzItems },

  // Was "Sprechen", which was simply not true of the second entry in it: "Lesen & Schreiben"
  // is a reading and writing trainer. "Fertigkeiten" is the word the Lehrwerke and the
  // Integrationskurse use for exactly this set of four.
  // The subject's own page, not /speaking: clicking "Fertigkeiten" used to land
  // the learner inside the Bildbeschreibung trainer — one of the four skills — with the
  // other three only reachable by reopening the menu.
  { id: "fertigkeiten", icon: "mic", href: "/skills",
    nameKey: "nav.subject.fertigkeiten", name: "Fertigkeiten",
    blurbKey: "nav.subject.fertigkeiten.blurb", blurb: "Hören, Lesen, Schreiben, Sprechen",
    skills,
    // Not a fifth skill (no exam tests it on its own), so the drawer lists these under
    // the four rather than as peers. The desktop menu carries the same two rows —
    // see the Fertigkeiten column of `navUebenMenu`.
    extras: [
      { href: "/pronunciation", icon: "volume", titleKey: "nav.skill.aussprache", title: "Aussprache" },
      { href: "/pronunciation-check", icon: "mic", titleKey: "nav.skill.ausspracheCheck", title: "Aussprache-Check" },
      { href: "/tongue-twisters", icon: "mic", titleKey: "nav.skill.zungenbrecher", title: "Zungenbrecher" },
      { href: "/intonation", icon: "volume", titleKey: "nav.skill.satzmelodie", title: "Satzmelodie" },
    ],
    badge: skills.length,
    items: notSelf("/skills", itemsOf("fertigkeiten")) },

  { id: "landeskunde", icon: "map-pin", href: "/culture",
    nameKey: "group.kultur.name", name: "Landeskunde",
    blurbKey: "group.kultur.blurb", blurb: "Alltag und Kultur in Deutschland",
    // The two pages that are not kultur.json topics sit above the groups. The quiz is not
    // here: on a phone it closes the Kulturwissen pane (NavDrawer), like the desktop column.
    features: [kulturFehlerItem, kulturInsiderItem, kulturLidFaktenItem],
    quiz: kulturQuizItem,
    groups: kulturNavGroups,
    // The phone gets the same topics cut by level instead — see the note above.
    drawerGroups: kulturLevelGroups,
    items: kulturNavItems },

  { id: "spiele", icon: "sparkle",
    nameKey: "nav.subject.spiele", name: "Spiele",
    blurbKey: "nav.subject.spiele.blurb", blurb: "A town role-play, Quaki, Bruno Kart and more",
    badge: spieleItems.length,
    items: spieleItems },

  { id: "pruefungen", icon: "graduation-cap", href: "/exams",
    nameKey: "nav.exams", name: "Prüfungen",
    blurbKey: "group.pruefungen.blurb", blurb: "telc, Goethe, TestDaF, DTZ",
    // The Führerschein simulation has no row of its own: it is one of the hub's actions.
    items: notSelf("/exams", itemsOf("pruefungen")) },
];

// ---------------------------------------------------------------------------
// The "Üben" mega menu
// ---------------------------------------------------------------------------
// Eight top-level items, six of them dropdowns, mixing three kinds of thing: four content
// subjects, a cross-cutting filter (Niveaus) and two account/utility links. The bar was
// wide enough to run into the logo, and a learner deciding where to click had to hold all
// eight in mind.
//
// The four subjects are one decision, not four — "what do I practise" — so they become
// four columns of one menu. Each column is that subject's own trainers and hubs, with its
// overview page at the foot.
//
// What a column deliberately does NOT carry is the deep tree the old per-subject panels
// held: every grammar topic per level, every Lernset, every skill × level cross-product.
// Four columns cannot hold several hundred links, and the reason to merge the menus was
// that there were too many things in them. Every one of those routes is still reachable —
// one click further, from the hub the column links to, which is the page built to list
// them. The level chips below the columns are the other way in.
//
// `navSections` stays exactly as it was: the drawer and PracticeHeader still read it, and
// the per-subject panels it describes are what the section pages themselves render.
const skillColumnItems = skills.map((s) => ({
  id: s.id, icon: s.icon, href: s.href,
  titleKey: s.nameKey, title: s.name,
  countKey: s.total ? "nav.skill.count" : undefined,
  countVars: s.total ? { n: s.total } : undefined,
  count: s.total ? `${s.total} Übungen` : "folgt",
}));

export const navUeben = {
  id: "ueben",
  href: "/exercises",
  nameKey: "nav.subject.ueben",
  name: "Üben",
  columns: [
    { id: "grammatik", icon: "book", href: "/grammar",
      nameKey: "nav.subject.grammatik", name: "Grammatik",
      items: itemsOf("grammatik") },
    { id: "wortschatz", icon: "folder", href: "/vocabulary",
      nameKey: "nav.subject.wortschatz", name: "Wortschatz",
      items: itemsOf("woerter") },
    { id: "fertigkeiten", icon: "mic", href: "/skills",
      nameKey: "nav.subject.fertigkeiten", name: "Fertigkeiten",
      items: skillColumnItems },
    { id: "landeskunde", icon: "map-pin", href: "/culture",
      nameKey: "group.kultur.name", name: "Landeskunde",
      items: [...itemsOf("kultur"), ...kulturFeatures] },
  ],
  // A CEFR level is a filter over all four columns, not a fifth column and not a
  // destination of its own — which is what "Niveaus" as a top-level menu made it, a
  // second copy of the whole content tree. One chip row under the columns says the same
  // thing in one line.
  levels: levels.map((lv) => ({
    level: lv.level,
    slug: lv.slug,
    href: `/grammar#niveau-${lv.slug}`,
    blurbKey: lv.blurbKey,
    blurb: lv.blurb,
  })),
};

// ---------------------------------------------------------------------------
// The "Üben" mega menu as it renders — five columns
// ---------------------------------------------------------------------------
// `navUeben` above was four subject columns with a level chip row at the foot. Its
// Grammatik column mixed three kinds of thing as peers — one drill (der/die/das), the
// whole hub (Alle Themen) and a two-topic subset (Präpositionen) — so a beginner could not
// tell where to start; the level entry sat last, and counts like "1029 Aufgaben" read as a
// wall rather than an offer.
//
// This one opens with "Wo anfangen?" — the four levels as the first column. A subject
// column leads with its hub as the one prominent link (`primary`), then a thin rule, then
// the short ways in. No counts anywhere: a subtitle is a plain-language hint or nothing.
// Every href is one the old menu already linked to, plus the per-level Wortlisten.

/** The short drills under Grammatik. A new one (Konjugation, Plural) is one more row. */
export const quickTrainers = [
  { id: "artikel", href: "/articles",
    titleKey: "tool.artikel.title", title: "der/die/das-Trainer",
    hintKey: "nav.hint.fiveMin", hint: "ca. 5 Min" },
  { id: "praepositionen", href: "/prepositions",
    titleKey: "tool.praepositionen.title", title: "Präpositionen",
    hintKey: "nav.hint.fiveMin", hint: "ca. 5 Min" },
  { id: "konjugation", href: "/grammar/conjugation",
    titleKey: "tool.konjugation.title", title: "Conjugation trainer",
    hintKey: "nav.hint.fiveMin", hint: "ca. 5 Min" },
];

const LEVEL_NAMES = { A1: "Einsteiger", A2: "Grundlagen", B1: "Mittelstufe", B2: "Fortgeschritten" };

export const navUebenMenu = {
  start: {
    nameKey: "nav.ueben.start", name: "Wo anfangen?",
    levels: navUeben.levels.map((lv) => ({
      level: lv.level,
      href: lv.href,
      nameKey: `nav.level.${lv.slug}.name`,
      name: LEVEL_NAMES[lv.level],
    })),
    // The placement test exists (src/pages/einstufungstest.astro), so the link is real.
    placement: { href: "/placement-test", titleKey: "nav.ueben.placement", title: "Mein Niveau testen" },
    // A Stunde alone, step by step (src/pages/stunde.astro): bare /lesson goes on to the next one.
    stunde: { href: "/lesson", titleKey: "nav.ueben.stunde", title: "Meine Stunde",
      hintKey: "nav.ueben.stundeHint", hint: "Schritt für Schritt, in deinem Tempo" },
  },
  columns: [
    { id: "grammatik", icon: "book", href: "/grammar",
      nameKey: "nav.subject.grammatik", name: "Grammatik",
      primary: { href: "/grammar",
        titleKey: "nav.grammatik.all", title: "Alle Grammatik-Themen",
        hintKey: "nav.grammatik.allHint", hint: "nach Niveau sortiert" },
      // The Nachschlagewerk (verb tables, cases, word classes) as one row: it is grammar
      // you look up, and as a strip under the Wissen panel it made that panel too tall.
      items: [...quickTrainers,
        { href: "/reference", titleKey: "nav.wissen.nachschlagen", title: "Nachschlagewerk",
          hintKey: "nav.wissen.nachschlagenAllHint", hint: "Verben und Wortarten auf einen Blick" }] },
    // The same shape as Grammatik: the deck hub first, then one Wortliste per level the
    // lexicon has reached — what "Wortschatz" means to someone who knows their level, and
    // what the column had nothing of when it was a single row.
    { id: "wortschatz", icon: "folder", href: "/vocabulary",
      nameKey: "nav.subject.wortschatz", name: "Wortschatz",
      primary: { href: "/vocabulary",
        titleKey: "nav.wortschatz.all", title: "Wortschatz & Redemittel",
        hintKey: "nav.wortschatz.allHint", hint: "Karteikarten zum Wiederholen" },
      items: [
        ...NAV_LEVELS.filter((level) => lexiconCounts[level]?.words).map((level) => ({
          href: `/vocabulary/${level.toLowerCase()}`,
          titleKey: "nav.vocab.listLevel", titleVars: { level }, title: `Wortliste ${level}`,
        })),
        // Not a level: the profession decks (/english-for-work), A2–B1, for learners who work.
        { href: "/english-for-work", titleKey: "tool.berufe.title", title: "Spanish for work",
          hintKey: "nav.wortschatz.berufeHint", hint: "Words for your job" },
        // Not a level either: the driving words (/dgt-vocabulary).
        { href: "/dgt-vocabulary", titleKey: "dgt.title", title: "DGT driving vocabulary",
          hintKey: "dgt.navHint", hint: "Car, road, signs, exam and paperwork" },
      ] },
    { id: "fertigkeiten", icon: "mic", href: "/skills",
      nameKey: "nav.subject.fertigkeiten", name: "Fertigkeiten",
      items: [
        // Sprechen names its main exercise, so it doesn't read like the pronunciation
        // rows under it.
        ...skills.map((sk) => sk.id === "sprechen"
          ? { href: sk.href, titleKey: "nav.skill.sprechenMenu", title: "Sprechen (Bildbeschreibung)" }
          : { href: sk.href, titleKey: sk.nameKey, title: sk.name }),
        // Pronunciation is speaking practice, not vocabulary: it hangs under Sprechen.
        { href: "/pronunciation", titleKey: "nav.skill.aussprache", title: "Aussprache", nested: true },
        { href: "/pronunciation-check", titleKey: "nav.skill.ausspracheCheck", title: "Aussprache-Check", nested: true },
        { href: "/tongue-twisters", titleKey: "nav.skill.zungenbrecher", title: "Zungenbrecher", nested: true },
        { href: "/intonation", titleKey: "nav.skill.satzmelodie", title: "Satzmelodie", nested: true },
      ] },
    { id: "spiele", icon: "sparkle",
      nameKey: "nav.subject.spiele", name: "Spiele",
      items: spieleItems },
  ],
};

// ---------------------------------------------------------------------------
// The "Wissen" menu
// ---------------------------------------------------------------------------
// Landeskunde left Üben: it is knowledge about the country, not a skill drill, and the
// phone drawer already filed it under Wissen. Three columns, the same three the drawer
// shows: Landeskunde (the two pages that are not kultur.json topics), Kulturwissen (the
// topics by level, with the quiz over all of them at the foot) and Bücher (the PDF library).
// /knowledge/languages and its sections — the desktop Wissen panel and the phone drawer both
// read this, so the two list the same rows.
export const navSprachen = {
  href: "/knowledge/languages",
  sections: [
    { id: "karte", titleKey: "sprachen.map.title", title: "Where Spanish is spoken" },
    { id: "familie", titleKey: "sprachen.tree.title", title: "The language family" },
    { id: "vergleich", titleKey: "sprachen.cmp.title", title: "How close is your language?" },
    { id: "decoder", titleKey: "sprachen.dec.title", title: "English → Spanish: the word decoder" },
  ],
};

// Wortgeschichte (WORTGESCHICHTE-TIERED-PROMPT.md): a fifth row in the Sprachen column, beside
// the Wort-Decoder — same family of idea, where words come from. Its own page, so its own
// href. null until a first word is really published (approved and its day has come), so
// the menus never point at an empty page; the drawer (NavDrawer.astro) reads it too.
export const navWortgeschichte = publishedWords().length
  ? { href: "/knowledge/word-stories", titleKey: "nav.wissen.wortgeschichte", title: "Wortgeschichte: Wort des Tages",
      hintKey: "nav.wissen.wortgeschichteHint", hint: "Woher unsere Wörter kommen" }
  : null;

// „So lernst du mit uns" (/knowledge/learning): how learning works, told by the mascots. One
// page, listed under Bücher in the Wissen panel (the learning material and how to learn
// with it) and as its own row in the phone drawer (NavDrawer.astro).
export const navLernen = { href: "/knowledge/learning", titleKey: "nav.wissen.lernen", title: "So lernst du mit uns",
  hintKey: "nav.wissen.lernenHint", hint: "Warum Fehler beim Lernen helfen" };

// „Wortfallen" (/knowledge/false-friends): Küche, Kuchen, Koch — words that sound alike and get
// mixed up, with a quiz. A row in the Sprachen column and in the phone drawer.
export const navWortfallen = { href: "/knowledge/false-friends", titleKey: "nav.wissen.wortfallen", title: "False friends: embarazada, éxito, carpeta",
  hintKey: "nav.wissen.wortfallenHint", hint: "Words that are easy to mix up" };

// „Bildkarten" (/knowledge/picture-dictionary): the 100 most important words as picture cards, all
// at once or one after another. Our own drawings; the top ten are prints on /merch. In the
// Sprachen column beside Wortfallen. No i18n keys yet: the menu shows the German title.
export const navBildwoerterbuch = { href: "/knowledge/picture-dictionary", titleKey: "nav.wissen.bildwoerterbuch", title: "Bildkarten: die 100 wichtigsten Wörter",
  hintKey: "nav.wissen.bildwoerterbuchHint", hint: "Ein Bild, ein Wort" };

// „Zitat des Tages“ (/knowledge/quotes): one famous sentence a day, with its words and the life
// of the person who said it. In the Sprachen column and in the phone drawer. No i18n keys
// yet: the menu shows the German title.
export const navZitate = { href: "/knowledge/quotes", titleKey: "nav.wissen.zitate", title: "Zitat des Tages",
  hintKey: "nav.wissen.zitateHint", hint: "Ein Satz, drei Wörter, ein Leben" };

// /knowledge/accents: the accent map of Spain. In the Sprachen column, under the sections of
// "Spanish around the world", whose map it zooms into.
export const navDialekte = { href: "/knowledge/accents", titleKey: "nav.wissen.dialekte", title: "Accents: the map",
  hintKey: "nav.wissen.dialekteHint", hint: "From Andalusian to Canarian" };

// /knowledge/slang: tío, mola, joder — how Spanish is spoken in Spain, with the standard
// word beside it and where it is fine. In the Sprachen column under Dialekte and in the
// phone drawer. No i18n keys yet: the menu shows the German title.
export const navUmgangssprache = { href: "/knowledge/slang", titleKey: "nav.wissen.umgangssprache", title: "Informal Spanish & slang",
  hintKey: "nav.wissen.umgangsspracheHint", hint: "Tío, mola, currar – and what never to say" };

// /knowledge/idioms: Redewendungen & Sprichwörter, each with its picture, meaning and
// origin. In the Sprachen column under Umgangssprache and in the phone drawer, once released
// (src/lib/redewendungenLive.js); null until then, like navWortgeschichte.
export const navRedewendungen = REDEWENDUNGEN_LIVE
  ? { href: "/knowledge/idioms", titleKey: "nav.wissen.redewendungen", title: "Idioms & Proverbs",
      hintKey: "nav.wissen.redewendungenHint", hint: "Puzzled by “estar en las nubes”? Look here" }
  : null;

// /merch: an interest page for shirts, mugs and caps with the crew and the Wortfallen (no
// shop yet). In the Wissen menu beside Wortfallen and on the phone drawer's first screen.
export const navMerch = { href: "/merch", titleKey: "nav.merch", title: "Merch: Shirts & Tassen",
  hintKey: "nav.merchHint", hint: "Bald: die Crew zum Anziehen" };

// „Entdecken“: the extras that are not lessons – the crew, the live hour, the films of how it
// all works, merch – as picture cards in their own menu (desktop) and group (phone drawer),
// so they are not buried a column deep in Wissen. Each card carries its crew member
// (mascotSvg in NavMenubar, with an optional prop `extra`). „Entdecken“ itself opens
// /explore, the same four cards as a page. Zitat des Tages made room for the films; it
// stays in Wissen › Sprachen and in the drawer. Only the films card has i18n keys so far; the
// other three show in German.
export const navEntdecken = {
  href: "/explore", nameKey: "nav.entdecken", name: "Entdecken",
  items: [
    { href: "/mascots", titleKey: "nav.entdecken.crew", title: "Bruno & die Crew",
      hintKey: "nav.entdecken.crewHint", hint: "Unsere Maskottchen: wer sie sind und wo sie helfen", mascot: "bruno", expr: "happy", icon: "🐶" },
    { href: "/explore/films", titleKey: "nav.entdecken.filme", title: "So funktioniert’s: Filmchen",
      hintKey: "nav.entdecken.filmeHint", hint: "Zehn Funktionen, je 15 Sekunden", mascot: "quaki", expr: "happy", extra: "zeigestock", icon: "🎬" },
    { ...navMerch, mascot: "hamsti", expr: "celebrate", icon: "👕", shop: true },
  ],
};

export const navWissenMenu = {
  href: "/knowledge",
  columns: [
    // Each row carries its count, so the column stands as tall as the two beside it
    // instead of two bare lines over empty space. The quiz sits here too: it quizzes
    // Landeskunde, and it keeps the Kulturwissen column down to its levels.
    { id: "landeskunde", icon: "map-pin", href: "/knowledge/country-and-culture",
      nameKey: "group.kultur.name", name: "Landeskunde",
      // The column's head page as a green box, like the other columns' „Alle …“ boxes:
      // the lobby that shows every area and every topic of the section.
      primary: { href: "/knowledge/country-and-culture", titleKey: "nav.kultur.landUndKultur", title: "Land und Kultur",
        hintKey: "nav.kultur.landUndKulturHint", hint: "Alle Themen auf einen Blick" },
      items: [
        ...[kulturInsiderItem, kulturFehlerItem, kulturLidFaktenItem, { ...kulturQuizItem, titleKey: "nav.kultur.quiz", title: "Landeskunde-Quiz" }]
          .map((it) => ({ href: it.href, titleKey: it.titleKey, title: it.title,
            hintKey: it.countKey, hintVars: it.countVars, hint: it.count })),
        // One insider topic by name: everyday driving in Spain.
        { href: "/culture/insider/cars-and-driving", titleKey: "nav.kultur.auto", title: "Deutschland und das Auto",
          hintKey: "nav.kultur.autoHint", hint: "Auto, Tempolimit, Führerschein" },
      ] },
    // The levels as one-line rows (badge + blurb), the way "Wo anfangen?" lists them in
    // the Üben panel: six two-line rows made this column twice the height of the others.
    { id: "kulturwissen", icon: "book", href: "/culture",
      nameKey: "tool.kultur.title", name: "Kulturwissen",
      primary: { href: "/culture",
        titleKey: "nav.kultur.allTopics", title: "Alle Themen",
        hintKey: "tool.kultur.count", hintVars: { n: kulturTopicCount }, hint: `${kulturTopicCount} Themen` },
      items: kulturLevelGroups.map((g) => ({
        href: `/culture#niveau-${g.slug}`, level: g.level, titleKey: g.blurbKey, title: g.blurb,
      })) },
    { id: "buecher", icon: "document", href: "/knowledge",
      nameKey: "nav.wissen.books", name: "Bücher",
      primary: { href: "/knowledge",
        titleKey: "nav.wissen.booksAll", title: "Alle Bücher",
        hintKey: "nav.subject.wissen.blurb", hint: "Bücher und Listen als PDF" },
      items: [
        ...downloads.categories.map((c) => ({ href: `/knowledge#${c.id}`, titleKey: `wissen.cat.${c.id}.name`, title: c.name })),
        { href: "/knowledge#offiziell", titleKey: "wissen.official.title", title: "Offizielle Materialien" },
        { href: navLernen.href, titleKey: navLernen.titleKey, title: navLernen.title },
      ] },
    // "Spanish around the world" (/knowledge/languages): one page. Only its map section gets a row;
    // the other three sections sit behind the green box, so the column stays at six rows
    // (the panel ran past the foot of a laptop screen, 2026-10-23). Merch left this column
    // then too: it is in the footer and the phone drawer.
    { id: "sprachen", icon: "globe", href: navSprachen.href,
      nameKey: "nav.wissen.sprachen", name: "Languages",
      primary: { href: navSprachen.href,
        titleKey: "nav.wissen.sprachenAll", title: "Spanish around the world",
        hintKey: "nav.wissen.sprachenHint", hint: "Map, language family, comparison" },
      items: [
        ...navSprachen.sections.filter((s) => s.id === "karte").map((s) => ({ href: `${navSprachen.href}#${s.id}`, titleKey: s.titleKey, title: s.title })),
        { href: navDialekte.href, titleKey: navDialekte.titleKey, title: navDialekte.title },
        { href: navUmgangssprache.href, titleKey: navUmgangssprache.titleKey, title: navUmgangssprache.title },
        ...(navRedewendungen ? [{ href: navRedewendungen.href, titleKey: navRedewendungen.titleKey, title: navRedewendungen.title }] : []),
        ...(navWortgeschichte ? [{ href: navWortgeschichte.href, titleKey: navWortgeschichte.titleKey, title: navWortgeschichte.title }] : []),
        { href: navWortfallen.href, titleKey: navWortfallen.titleKey, title: navWortfallen.title },
        { href: navBildwoerterbuch.href, titleKey: navBildwoerterbuch.titleKey, title: navBildwoerterbuch.title },
        { href: navZitate.href, titleKey: navZitate.titleKey, title: navZitate.title },
      ] },
    // The grammar pages you look things up in rather than practise: shared with the phone
    // drawer (navNachschlagen), so both list the same pages.
    // The label and the green box lead to /reference, the overview of these pages,
    // the way „Alle Themen" leads to /culture.
    { id: "nachschlagen", icon: "book-open", href: "/reference",
      nameKey: "nav.wissen.nachschlagen", name: "Nachschlagewerk",
      primary: { href: "/reference",
        titleKey: "nav.wissen.nachschlagenAll", title: "Alles nachschlagen",
        hintKey: "nav.wissen.nachschlagenAllHint", hint: "Verben und Wortarten auf einen Blick" },
      items: [
        { href: "/grammar/verbs", titleKey: "nav.wissen.verben", title: "Verbtabellen",
          hintKey: "nav.wissen.verbenHint", hint: "Präsens, Präteritum, Perfekt mit Regeln" },
        { href: "/grammar/irregular-verbs", titleKey: "nav.wissen.stark", title: "Starke und schwache Verben",
          hintKey: "nav.wissen.starkHint", hint: "Vokalreihen, Präteritum, Partizip" },
        { href: "/grammar/phrasal-verbs-list", titleKey: "nav.wissen.trennbar", title: "Trennbare und untrennbare Verben",
          hintKey: "nav.wissen.trennbarHint", hint: "anrufen, verstehen, übersetzen" },
        { href: "/grammar/verbs-with-prepositions", titleKey: "nav.wissen.verbPraep", title: "Verben mit Präpositionen",
          hintKey: "nav.wissen.verbPraepHint", hint: "warten auf, sich freuen über" },
        { href: "/grammar/parts-of-speech", titleKey: "nav.wissen.wortarten", title: "Wortarten",
          hintKey: "nav.wissen.wortartenHint", hint: "Nomen, Verb, Adjektiv und Co." },
        { href: "/grammar/common-mistakes", titleKey: "nav.wissen.typischeFehler", title: "Common mistakes",
          hintKey: "nav.wissen.typischeFehlerHint", hint: "tú or tu, por or para" },
      ] },
  ],
};

export const navNachschlagen = navWissenMenu.columns.find((c) => c.id === "nachschlagen");

// ---------------------------------------------------------------------------
// The "Für Lehrkräfte" menu
// ---------------------------------------------------------------------------
// The teacher section's own pages, shared by the desktop panel (NavMenubar) and the
// phone drawer (NavDrawer) so the two never list different things. "Mitspielen" is the
// student side of the live quiz: a teacher projecting the menu can point the class at it.
export const navLehrkraefte = {
  href: "/teachers",
  name: "Für Lehrkräfte",
  nameKey: "nav.subject.lehrkraefte",
  // The section page itself, heading the panel the way "Alle Themen" and "Alle Bücher"
  // head the Wissen columns.
  primary: { href: "/teachers", titleKey: "nav.lk.all", title: "Alle Materialien",
    hintKey: "nav.lk.allHint", hint: "Quiz, Arbeitsblätter, Spiele" },
  // The desktop panel shows the items in these three columns, side by side (one list of
  // eleven was taller than the screen); the phone drawer lists them in the same order.
  groups: [
    { id: "unterricht", name: "Im Unterricht", nameKey: "nav.lk.g.unterricht" },
    { id: "material", name: "Material", nameKey: "nav.lk.g.material" },
    { id: "kurs", name: "Kurs & Klassen", nameKey: "nav.lk.g.kurs" },
  ],
  items: [
    { group: "unterricht", href: "/teachers/quiz", icon: "sparkle", title: "Live-Quiz", titleKey: "lk.quiz.title", hint: "Ganze Gruppe, per QR-Code", hintKey: "nav.lk.quizHint" },
    { group: "unterricht", href: "/teachers/surveys", icon: "bars", title: "Umfrage", titleKey: "nav.lk.uf", hint: "Anonym fragen, was die Klasse lernen will", hintKey: "nav.lk.ufHint" },
    { group: "unterricht", href: "/game", icon: "user", title: "Mitspielen (für Lernende)", titleKey: "lk.quiz.join", hint: "Mit PIN einem Quiz beitreten", hintKey: "nav.lk.joinHint" },
    { group: "material", href: "/teachers/worksheets", icon: "document", title: "Arbeitsblätter", titleKey: "lk.ab.title", hint: "Drucken oder online ausfüllen", hintKey: "nav.lk.abHint" },
    { group: "material", href: "/teachers/games", icon: "grid", title: "Spiele zum Ausdrucken", titleKey: "lk.sp.title", hint: "Bingo, Domino, Wörter erklären", hintKey: "nav.lk.spHint" },
    { group: "material", href: "/teachers/cards/photo", icon: "camera", title: "Vokabeln vom Foto", titleKey: "nav.lk.foto", hint: "Wortliste fotografieren → Karteikarten", hintKey: "nav.lk.fotoHint" },
    { group: "material", href: "/teachers/cards", icon: "layers", title: "Meine Kartensets", titleKey: "nav.lk.sets", hint: "Üben, drucken, teilen, als Aufgabe", hintKey: "nav.lk.setsHint" },
    { group: "kurs", href: "/teachers/classes", icon: "user", title: "Klassen", titleKey: "nav.lk.kl", hint: "Sehen, wer übt, Aufgaben stellen", hintKey: "nav.lk.klHint" },
    { group: "kurs", href: "/teachers/tests", icon: "target", title: "Einstufungstest", titleKey: "nav.lk.kt", hint: "Niveau jeder Person per QR-Code, auch Thementests", hintKey: "nav.lk.ktHint" },
    // A lesson plan for one block of the course plan (src/pages/lehrkraefte/stundenplan.astro).
    { group: "kurs", href: "/teachers/timetable", icon: "pencil", title: "Stundenplan-Generator", titleKey: "nav.lk.stundenplan", hint: "Unterricht für einen Themenblock planen", hintKey: "nav.lk.stundenplanHint" },
    // What each course level teaches, A1.1 → C1 (src/pages/kursinhalte.astro).
    { group: "kurs", href: "/syllabus", icon: "book-open", title: "Kursinhalte A1–C1", titleKey: "nav.lk.kursinhalte", hint: "Was du in welchem Kurs lernst", hintKey: "nav.lk.kursinhalteHint" },
  ],
};
