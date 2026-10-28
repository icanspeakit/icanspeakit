// The Nachschlagewerk pages as worksheet topics: the verb tables (/grammatik/verben) and the
// lists of /grammatik/<ref> (src/data/nachschlagen/*.json) put into the shape of a grammar
// topic, so the worksheet (…/arbeitsblaetter/grammatik/<slug>) and the Tandembogen
// (…/arbeitsblaetter/tandem/<slug>) are built for them exactly as for a topic.
//
// Nothing is invented: every task is a row of the list and every answer the form the list
// gives. A list is far longer than a sheet, so each exercise takes a few rows from every
// section in turn (A1 rows first), and the exercises of one sheet take different rows.
//
// Slugs: `verbtabellen`, `typische-fehler`, and `nachschlagen-<file>` for the lists — the live quiz's chapter
// keys (liveQuiz/chapters.js), and never a grammar topic's slug (there is a topic
// trennbare-verben too).
import { shuffle } from "./seed.js";
import { groups as verbGroupList, verbs as verbList } from "../verbtabellen.js";
import { fehlerGroups, optionsOf, answerOf } from "../typischeFehler.js";

const refMods = import.meta.glob("../../data/nachschlagen/*.json", { eager: true });
const refLists = Object.fromEntries(Object.entries(refMods).map(([p, m]) => [p.split("/").pop().replace(/\.json$/, ""), m.default ?? m]));

const ROWS = 10;
const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const byLevel = (a, b) => LEVEL_ORDER.indexOf(a.level ?? "C2") - LEVEL_ORDER.indexOf(b.level ?? "C2");
// *…* in a Regel line marks an example (as on the Nachschlagewerk pages).
const ruleHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*([^*]+)\*/g, "<em>$1</em>");
const bareVerb = (v) => String(v).replace(/[[\]|]/g, "");

/** Rows of a list section as objects; "# …" sub-headings dropped, the easiest first. */
const rowsOf = (sec) => (sec.items ?? [])
  .filter(Array.isArray)
  .map(([verb, forms, example, level], i) => ({ verb, forms, example, level, i }))
  .sort((a, b) => byLevel(a, b) || a.i - b.i);

/** Up to n rows, one from each list in turn, skipping the first `skip` rounds' worth. */
function roundRobin(lists, n, skip = 0) {
  const out = [];
  let taken = 0;
  for (let i = 0; out.length < n && lists.some((l) => i < l.length); i++) {
    for (const l of lists) {
      if (i >= l.length || out.length >= n) continue;
      if (taken++ < skip) continue;
      out.push(l[i]);
    }
  }
  return out;
}

/** "Der Zug fährt um acht Uhr ab." → ["Der", "Zug", …, "ab", "."] */
const tokens = (s) => String(s).match(/[\p{L}\p{N}’'-]+|[.,!?]/gu) ?? [];

/* ---- /grammatik/verben ---------------------------------------------------------------- */
function verbTopic() {
  const pools = verbGroupList.map((g) => verbList.filter((v) => v.group === g.id));
  // A verb with a note has no past of its own (möchten: „Für die Vergangenheit nimmt man
  // wollen“), so it is asked in the Präsens only.
  const past = pools.map((l) => l.filter((v) => !v.note));
  const pick = (skip, lists = past) => roundRobin(lists, ROWS, skip);
  const g = Object.fromEntries(verbGroupList.map((x) => [x.id, x]));
  return {
    id: "verbtabellen",
    slug: "verbtabellen",
    name: "Verbtabellen: die wichtigsten Verben",
    level: "A1",
    subtitle: "Präsens, Präteritum und Perfekt der wichtigsten Verben",
    reference: "/grammatik/verben",
    concept: {
      qa: [g.regelmaessig?.regel?.[0], g.unregelmaessig?.regel?.[1], g.regelmaessig?.regel?.[2], g.hilfsverb?.regel?.[1]]
        .filter(Boolean).map((r) => ({ html: ruleHtml(r) })),
    },
    exercises: [
      {
        type: "table",
        title: "Präsens: Schreiben Sie die Verbform.",
        hint: "Vorsicht bei du und er/sie/es: oft ändert sich der Vokal.",
        columns: ["Person + Verb", "Präsens"],
        // du or er/sie/es, taking turns, but the one the verb changes (the one worth
        // asking) where only one of them does.
        rows: pick(0, pools).map((v, i) => {
          const turn = i % 2 ? [2, 1] : [1, 2];
          const p = turn.find((k) => v.rows[k].praes.x) ?? turn[0];
          return { term: `${v.rows[p].pron} · ${v.inf}`, answer: v.rows[p].praes.f };
        }),
      },
      {
        type: "table",
        title: "Präteritum: Wie heißt die Form für „ich“?",
        columns: ["Verb", "ich (Präteritum)"],
        rows: pick(ROWS).map((v) => ({ term: v.inf, answer: v.rows[0].praet.f })),
      },
      {
        type: "table",
        title: "Perfekt: haben oder sein – und das Partizip.",
        columns: ["Verb", "er/sie/es (Perfekt)"],
        rows: pick(2 * ROWS).map((v) => ({ term: v.inf, answer: v.rows[2].perf.f })),
      },
    ],
  };
}

/* ---- /grammatik/starke-schwache-verben ------------------------------------------------- */
function starkTopic(file, data) {
  const sec = (id) => data.sections.find((s) => s.id === id)?.regel ?? [];
  // forms: "fährt · fuhr · ist gefahren"
  const pools = data.sections.map((sec) => rowsOf(sec).filter((r) => String(r.forms).split(" · ").length === 3));
  const form = (r, k) => String(r.forms).split(" · ")[k].trim();
  return {
    rules: [sec("schwach")[0], sec("stark")[0], sec("stark")[1], sec("gemischt")[0]],
    exercises: [
      {
        type: "table",
        title: "Präteritum: stark, schwach oder gemischt? Schreiben Sie die Form.",
        columns: ["Verb", "er/sie/es (Präteritum)"],
        rows: roundRobin(pools, ROWS).map((r) => ({ term: bareVerb(r.verb), answer: form(r, 1) })),
      },
      {
        type: "table",
        title: "Perfekt: haben oder sein – und das Partizip.",
        columns: ["Verb", "er/sie/es (Perfekt)"],
        rows: roundRobin(pools, ROWS, ROWS).map((r) => ({ term: bareVerb(r.verb), answer: form(r, 2) })),
      },
    ],
  };
}

/* ---- /grammatik/trennbare-verben ------------------------------------------------------- */
function trennbarTopic(file, data) {
  const sec = (id) => rowsOf(data.sections.find((s) => s.id === id) ?? {});
  const trennbar = sec("trennbar");
  const untrennbar = sec("untrennbar");
  // forms: "fährt … ab · ist abgefahren"; the Perfekt is the last part.
  const perf = (r) => String(r.forms).split(" · ").pop().trim();
  const built = trennbar.filter((r) => r.example && tokens(r.example).length <= 9).slice(0, 8);
  const regel = (id) => data.sections.find((s) => s.id === id)?.regel ?? [];
  return {
    rules: [regel("trennbar")[0], regel("trennbar")[1], regel("untrennbar")[0], regel("untrennbar")[2]],
    exercises: [
      {
        type: "build",
        title: "Bauen Sie den Satz. Wohin kommt das Präfix?",
        sentences: built.map((r) => {
          const correct = tokens(r.example);
          return { id: `tv-${r.i}`, hint: bareVerb(r.verb), correct, shuffled: shuffle(correct, `${file}:${r.i}`) };
        }),
      },
      {
        type: "table",
        title: "Perfekt: trennbar oder nicht? Wo steht ge-?",
        columns: ["Verb", "er/sie/es (Perfekt)"],
        rows: roundRobin([trennbar.filter((r) => !built.includes(r)), untrennbar], ROWS).map((r) => ({ term: bareVerb(r.verb), answer: perf(r) })),
      },
    ],
  };
}

/* ---- /grammatik/verben-mit-praepositionen ---------------------------------------------- */
function praepTopic(file, data) {
  // The example with its preposition blanked; rows whose preposition is merged (zur, vom,
  // worum) or missing in the example are left out — their gap would be ambiguous.
  const gapped = data.sections.map((sec) => rowsOf(sec).map((r) => {
    const re = new RegExp(`(^|[^\\p{L}])${sec.name}(?![\\p{L}])`, "iu");
    if (!r.example || !re.test(r.example)) return null;
    const verb = String(r.verb).endsWith(` ${sec.name}`) ? String(r.verb).slice(0, -sec.name.length - 1) : String(r.verb);
    return { ...r, prep: sec.name, verb, prompt: r.example.replace(re, "$1___") };
  }).filter(Boolean));
  const fill = roundRobin(gapped, 12);
  // The cases that have to be learnt: an, auf, in, über, vor take both.
  const both = data.sections.filter((s) => ["an", "auf", "in", "über", "vor"].includes(s.name))
    .map((sec) => rowsOf(sec).filter((r) => /Akkusativ|Dativ/.test(String(r.forms))));
  return {
    exercises: [
      {
        type: "fill",
        title: "Welche Präposition passt?",
        hint: "Verb und Präposition lernt man zusammen.",
        choices: [...new Set(fill.map((r) => r.prep))].sort((a, b) => a.localeCompare(b, "de")),
        items: fill.map((r) => ({ prompt: r.prompt, hint: r.verb, answer: r.prep })),
      },
      {
        type: "table",
        title: "Akkusativ oder Dativ?",
        hint: "Bei an, auf, in, über und vor muss man den Kasus mitlernen.",
        columns: ["Verb + Präposition", "Kasus"],
        rows: roundRobin(both, ROWS).map((r) => {
          const kasus = /Akkusativ/.test(String(r.forms)) ? "Akkusativ" : "Dativ";
          return { term: String(r.verb), answer: [kasus, kasus.slice(0, 3) + ".", kasus.slice(0, 3)] };
        }),
      },
    ],
  };
}

const BUILDERS = {
  "starke-schwache-verben": { level: "A2", build: starkTopic },
  "trennbare-verben": { level: "A1", build: trennbarTopic },
  "verben-mit-praepositionen": { level: "A2", build: praepTopic },
};

function listTopic(file) {
  const data = refLists[file];
  const b = BUILDERS[file];
  if (!data || !b) return null;
  const { exercises, rules, subtitle } = b.build(file, data);
  const qa = (rules ?? data.regel ?? []).filter(Boolean).slice(0, 4).map((r) => ({ html: ruleHtml(r) }));
  return {
    id: `nachschlagen-${file}`,
    slug: `nachschlagen-${file}`,
    name: data.title,
    level: b.level,
    // A list's lead says what the list holds, not a rule: the sheet's rule box is the rules.
    subtitle: subtitle ?? "",
    reference: `/grammatik/${file}`,
    concept: { qa },
    exercises: exercises.map((ex) => ({ ...ex, ...(ex.rows ? { rows: ex.rows.filter((r) => r.term && r.answer) } : {}) }))
      .filter((ex) => (ex.rows ?? ex.items ?? ex.sentences ?? []).length >= 4),
  };
}

/* ---- /grammatik/typische-fehler -------------------------------------------------------
   One exercise per group of the page: each pair's gap sentence, its two words as the
   choices. The rule box: the difference of the first pairs. */
function fehlerTopic() {
  return {
    id: "typische-fehler",
    slug: "typische-fehler",
    name: "Typische Fehler: Wörter, die man verwechselt",
    level: "A1",
    subtitle: "man oder Mann, das oder dass, seid oder seit",
    reference: "/grammatik/typische-fehler",
    concept: { qa: fehlerGroups.map((g) => g.pairs[0]).map((p) => ({ html: ruleHtml(`*${p.a.w}* ≠ *${p.b.w}*: ${p.why}`) })) },
    exercises: fehlerGroups.map((g) => ({
      type: "table",
      title: `${g.title}: Welches Wort passt?`,
      hint: g.lead,
      // The two words in the task itself, so the Tandembogen (which reads only the task) has them too.
      columns: ["Satz", "Lösung"],
      rows: g.pairs.map((p) => ({ term: `${p.check.gap} (${optionsOf(p).join(" / ")})`, answer: answerOf(p) })),
    })),
  };
}

/** The Nachschlagewerk pages that make a worksheet, as grammar-topic-shaped objects. */
export const refTopics = [verbTopic(), ...Object.keys(BUILDERS).map(listTopic), fehlerTopic()]
  .filter((t) => t && t.exercises.length);
