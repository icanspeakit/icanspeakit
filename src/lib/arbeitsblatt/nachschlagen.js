// The Nachschlagewerk pages as worksheet topics: the verb tables (/grammar/verbs) and the
// lists of /grammar/<ref> (src/data/nachschlagen/*.json) put into the shape of a grammar
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
import { refPath } from "../routes.js";
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

/* ---- /grammar/verbs ---------------------------------------------------------------- */
function verbTopic() {
  const pools = verbGroupList.map((g) => verbList.filter((v) => v.group === g.id));
  // A verb with gaps in its table (haber, soler) hardly uses the indefinido, so it is asked in
  // the present only.
  const past = pools.map((l) => l.filter((v) => !v.defective));
  const pick = (skip, lists = past) => roundRobin(lists, ROWS, skip);
  const g = Object.fromEntries(verbGroupList.map((x) => [x.id, x]));
  return {
    id: "verbtabellen",
    slug: "verbtabellen",
    name: "Verb tables: the most important verbs",
    level: "A1",
    subtitle: "Presente, indefinido and pretérito perfecto of the most important verbs",
    reference: "/grammar/verbs",
    concept: {
      qa: [g.regelmaessig?.regel?.[0], g.unregelmaessig?.regel?.[0], g["stem-change"]?.regel?.[0], g.hilfsverb?.regel?.[2]]
        .filter(Boolean).map((r) => ({ html: ruleHtml(r) })),
    },
    exercises: [
      {
        type: "table",
        title: "Presente: write the verb form.",
        hint: "Careful with the yo form and with stem changes: tengo, pienso, pensamos.",
        columns: ["Person + verb", "Presente"],
        // The person whose form breaks the pattern (tengo, tienes), else él/ella.
        rows: pick(0, pools).map((v) => {
          const x = v.rows.findIndex((r) => r.praes.x);
          const p = x === -1 ? 2 : x;
          return { term: `${v.rows[p].pron} · ${v.inf}`, answer: v.rows[p].praes.f };
        }),
      },
      {
        type: "table",
        title: "Indefinido: write the yo form.",
        columns: ["Verb", "yo (indefinido)"],
        rows: pick(ROWS).map((v) => ({ term: v.inf, answer: v.rows[0].praet.f })),
      },
      {
        type: "table",
        title: "Pretérito perfecto: haber + participle.",
        columns: ["Verb", "él/ella (pretérito perfecto)"],
        rows: pick(2 * ROWS).map((v) => ({ term: v.inf, answer: v.rows[2].perf.f })),
      },
    ],
  };
}

/* ---- /grammar/irregular-verbs ------------------------------------------------- */
function starkTopic(file, data) {
  const sec = (id) => data.sections.find((s) => s.id === id)?.regel ?? [];
  // forms: "tengo · tuvo · tenido" (yo presente · él indefinido · participio)
  const pools = data.sections.map((sec) => rowsOf(sec).filter((r) => String(r.forms).split(" · ").length === 3));
  const form = (r, k) => String(r.forms).split(" · ")[k].trim();
  return {
    rules: [sec("schwach")[0], sec("stark")[0], sec("stark")[1], sec("gemischt")[0]],
    exercises: [
      {
        type: "table",
        title: "Indefinido: regular or irregular? Write the él/ella form.",
        columns: ["Verb", "él/ella (indefinido)"],
        rows: roundRobin(pools, ROWS).map((r) => ({ term: bareVerb(r.verb), answer: form(r, 1) })),
      },
      {
        type: "table",
        title: "Participle: write the form.",
        columns: ["Verb", "Participle"],
        rows: roundRobin(pools, ROWS, ROWS).map((r) => ({ term: bareVerb(r.verb), answer: form(r, 2) })),
      },
    ],
  };
}

/* ---- /grammar/phrasal-verbs-list (reflexive and pronominal verbs) ------------------------------------------------------- */
function trennbarTopic(file, data) {
  const sec = (id) => rowsOf(data.sections.find((s) => s.id === id) ?? {});
  const trennbar = sec("trennbar");
  const untrennbar = sec("untrennbar");
  // forms: "me levanto · se levantó · levantado"; the yo form comes first.
  const yo = (r) => String(r.forms).split(" · ")[0].trim();
  const built = trennbar.filter((r) => r.example && tokens(r.example).length <= 9).slice(0, 8);
  const regel = (id) => data.sections.find((s) => s.id === id)?.regel ?? [];
  return {
    rules: [regel("trennbar")[0], regel("trennbar")[1], regel("untrennbar")[0], regel("untrennbar")[2]],
    exercises: [
      {
        type: "build",
        title: "Build the sentence. Where does the pronoun go?",
        sentences: built.map((r) => {
          const correct = tokens(r.example);
          return { id: `tv-${r.i}`, hint: bareVerb(r.verb), correct, shuffled: shuffle(correct, `${file}:${r.i}`) };
        }),
      },
      {
        type: "table",
        title: "Present: write the yo form with its pronoun.",
        columns: ["Verb", "yo (present)"],
        rows: roundRobin([trennbar.filter((r) => !built.includes(r)), untrennbar], ROWS).map((r) => ({ term: bareVerb(r.verb), answer: yo(r) })),
      },
    ],
  };
}

/* ---- /grammar/verbs-with-prepositions ---------------------------------------------- */
function praepTopic(file, data) {
  // The example with its preposition blanked; rows whose preposition is merged (al, del) or
  // missing in the example are left out — their gap would be ambiguous.
  const gapped = data.sections.map((sec) => rowsOf(sec).map((r) => {
    const re = new RegExp(`(^|[^\\p{L}])${sec.name}(?![\\p{L}])`, "iu");
    if (!r.example || !re.test(r.example)) return null;
    const verb = String(r.verb).endsWith(` ${sec.name}`) ? String(r.verb).slice(0, -sec.name.length - 1) : String(r.verb);
    return { ...r, prep: sec.name, verb, prompt: r.example.replace(re, "$1___") };
  }).filter(Boolean));
  const fill = roundRobin(gapped, 12);
  return {
    exercises: [
      {
        type: "fill",
        title: "Which preposition is right?",
        hint: "Learn the verb and its preposition together.",
        choices: [...new Set(fill.map((r) => r.prep))].sort((a, b) => a.localeCompare(b, "es")),
        items: fill.map((r) => ({ prompt: r.prompt, hint: r.verb, answer: r.prep })),
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
    reference: refPath(file),
    concept: { qa },
    exercises: exercises.map((ex) => ({ ...ex, ...(ex.rows ? { rows: ex.rows.filter((r) => r.term && r.answer) } : {}) }))
      .filter((ex) => (ex.rows ?? ex.items ?? ex.sentences ?? []).length >= 4),
  };
}

/* ---- /grammar/common-mistakes -------------------------------------------------------
   One exercise per group of the page: each pair's gap sentence, its two words as the
   choices. The rule box: the difference of the first pairs. */
function fehlerTopic() {
  return {
    id: "typische-fehler",
    slug: "typische-fehler",
    name: "Common mistakes: words people mix up",
    level: "A1",
    subtitle: "its or it's, then or than, your or you're",
    reference: "/grammar/common-mistakes",
    concept: { qa: fehlerGroups.map((g) => g.pairs[0]).map((p) => ({ html: ruleHtml(`*${p.a.w}* ≠ *${p.b.w}*: ${p.why}`) })) },
    exercises: fehlerGroups.map((g) => ({
      type: "table",
      title: `${g.title}: Which word fits?`,
      hint: g.lead,
      // The two words in the task itself, so the Tandembogen (which reads only the task) has them too.
      columns: ["Sentence", "Answer"],
      rows: g.pairs.map((p) => ({ term: `${p.check.gap} (${optionsOf(p).join(" / ")})`, answer: answerOf(p) })),
    })),
  };
}

/** The Nachschlagewerk pages that make a worksheet, as grammar-topic-shaped objects. */
export const refTopics = [verbTopic(), ...Object.keys(BUILDERS).map(listTopic), fehlerTopic()]
  .filter((t) => t && t.exercises.length);
