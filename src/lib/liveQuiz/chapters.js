// The chapters a teacher can build a live quiz from (/teachers/quiz/create), and
// the ready-made questions each one offers. Build time only: the page gets the list in
// its markup and each chapter's questions from /teachers/quiz-chapters/<slug>.json.
//
// Two kinds of chapter:
//   g:<key>  a grammar topic — its fill-in, table and matching items turned into
//            multiple choice. The wrong options are other answers of the same exercise
//            (werde / wirst / wird / werden), so they are always forms a learner could
//            plausibly mix up, never random words.
//   g:verbtabellen  the verb tables of /grammar/verbs: a form of each verb in Präsens,
//            Präteritum and Perfekt, the wrong options being the same verb's other forms
//            and the form the regular pattern would wrongly give (du fahrst, ich gehte).
//   w:<id>   a Wortschatz Lernset — its words, asked German → translation by default.
//            Stored as a reference ({ t: "word", id }) and turned into a question on the
//            projector, where the lexicon is loaded anyway: that is what lets every
//            phone see the translation in its own language, as in the vocabulary quiz.
//
// The "story" and "build" exercises are left out: a blank in the middle of a running text
// or a word-order task does not fit a 20-second, four-button question.
import { grammarCatalog } from "../grammarCatalog.js";
import { byPlan } from "../lehrplan.js";
import grammatik from "../../data/grammatik.json";
import wortfallen from "../../data/wortfallen.json";
import { fehlerGroups, answerOf, wrongOf } from "../typischeFehler.js";
import { units, byUnit, spokenForm } from "../lexicon.js";
import { MEANING_LANGS } from "./protocol.js";
import { groups as verbGroupList, verbs as verbList, PERSONS, regularPraes, regularPraet, regularP2 } from "../verbtabellen.js";

const workspaceMods = import.meta.glob("../../data/grammatik/*.json", { eager: true });
const workspaces = Object.values(workspaceMods).map((m) => m.default ?? m);
const dataOf = (key) =>
  workspaces.find((w) => (w.slug ?? w.id) === key) ?? grammatik.find((t) => (t.slug ?? t.id) === key) ?? null;

const QUIZ_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

/** Plain text: the old quiz topics carry a little HTML (<em>(der Computer)</em>). */
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
/** Plain text that keeps the <u>…</u> marking the word a task asks about (src/lib/markedText.js). */
const marked = (s) => plain(String(s ?? "").replace(/<(\/?)u>/g, "\u0001$1\u0002")).replace(/\u0001(\/?)\u0002/g, "<$1u>");
const accepted = (a) => [].concat(a ?? []).map((x) => plain(x)).filter(Boolean);

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Prompt/answer pairs → questions with up to three wrong options from the same pool.
 * An item whose pool has no other answer is dropped: one option is not a question.
 * `correct` is always 0 here; the projector shuffles the options before asking.
 */
function toChoices(pairs, kind, src, extraPool = []) {
  const pool = [];
  const seen = new Set();
  for (const a of [...pairs.map((p) => p.answers[0]), ...extraPool]) {
    if (!a || seen.has(a.toLowerCase())) continue;
    seen.add(a.toLowerCase());
    pool.push(a);
  }
  const out = [];
  pairs.forEach((p, i) => {
    const right = new Set(p.answers.map((a) => a.toLowerCase()));
    // A row with its own choices (a table row with 3–4 options) keeps them: they are the
    // mistakes that row was written to catch, and the same shape as its answer.
    const own = (p.choices ?? []).filter((a) => a && !right.has(a.toLowerCase()));
    const wrong = shuffle(own.length ? own : pool.filter((a) => !right.has(a.toLowerCase()))).slice(0, 3);
    if (!wrong.length || !p.prompt) return;
    out.push({ t: "mc", prompt: p.prompt.slice(0, 200), options: [p.answers[0], ...wrong].map((o) => o.slice(0, 80)), correct: 0, kind: kind.slice(0, 120), src: `${src}-${i}` });
  });
  return out;
}

/** The verb tables (/grammar/verbs) as questions, one group per verb group. Per verb:
 *  a Präsens form (the first irregular one of du / er, else du), the Präteritum of ich and
 *  the Perfekt of er/sie/es. */
// The Wortfallen of /knowledge/false-friends (Küche, Kuchen, Koch): each trap's gap sentences,
// the wrong options being the words it is mixed up with. Not a grammar topic, so like the
// verb tables it stays out of the Aufgaben catalog.
const WF_KEY = "wortfallen";
function wortfallenGroups() {
  return wortfallen.groups.map((g) => {
    const title = g.words.map((w) => w.w.replace(/^(der|die|das) /, "")).join(" · ");
    const items = g.quiz.map((q, i) => mcq(q.s, q.a, q.o.filter((o) => o !== q.a), "Which word fits?", `g:${WF_KEY}#${g.id}-${i}`));
    return { title, items: items.filter(Boolean) };
  }).filter((g) => g.items.length);
}

// Typische Fehler (/grammar/common-mistakes): each pair's gap, the wrong option its
// look-alike. Two buttons, not four: the pair is the question. Built here rather than with
// mcq(), whose case-blind de-duplication would drop Essen / essen, the very point of a pair.
const TF_KEY = "typische-fehler";
function fehlerQuizGroups() {
  return fehlerGroups.map((g) => ({
    title: g.title,
    items: g.pairs.map((p) => ({ t: "mc", prompt: p.check.gap, options: [answerOf(p), wrongOf(p)], correct: 0, kind: "Which word fits?", src: `g:${TF_KEY}#${p.id}` })),
  }));
}

const VERB_KEY = "verbtabellen";
function verbGroups() {
  const uniq = (right, list) => {
    const seen = new Set([right.toLowerCase()]);
    return list.filter((f) => f && !seen.has(f.toLowerCase()) && seen.add(f.toLowerCase()));
  };
  const q = (prompt, right, wrong, kind, src) => {
    const opts = uniq(right, shuffle(wrong)).slice(0, 3);
    return opts.length ? { t: "mc", prompt, options: [right, ...opts], correct: 0, kind, src } : null;
  };
  return verbGroupList.map((g) => {
    const items = [];
    for (const v of verbList.filter((x) => x.group === g.id)) {
      // A phrasal verb's regular pattern is its verb's, with the particle after it.
      const [base, ...rest] = v.inf.split(" ");
      const particle = v.group === "trennbar" ? rest.join(" ") : "";
      const verb = particle ? base : v.inf;
      const sep = (f) => (particle ? `${f} ${particle}` : f);
      const praes = v.rows.map((r) => r.praes.f);
      const praet = v.rows.map((r) => r.praet.f);
      // The person whose form breaks the pattern (I am, he has), else he/she/it.
      const pi = v.rows.findIndex((r) => r.praes.x);
      const p = pi === -1 ? 2 : pi;
      items.push(q(`${PERSONS[p]} ___ (${v.inf}) · present simple`, praes[p], [sep(regularPraes(verb)[p]), ...praes], g.name, `g:${VERB_KEY}#${v.id}-praes`));
      items.push(q(`I ___ (${v.inf}) · past simple`, praet[0], [sep(regularPraet(verb)[0]), v.p2, ...praet], g.name, `g:${VERB_KEY}#${v.id}-praet`));
      const regP2 = sep(regularP2(verb));
      items.push(q(`he ___ (${v.inf}) · present perfect`, `has ${v.p2}`, [`have ${v.p2}`, `has ${regP2}`, `has ${praet[2]}`, `has ${v.inf}`], g.name, `g:${VERB_KEY}#${v.id}-perf`));
    }
    return { title: g.name, items: items.filter(Boolean) };
  }).filter((g) => g.items.length);
}

/* ---- The Nachschlagewerk lists (/grammar/<ref>, src/data/nachschlagen/*.json) ------
   Chapter g-nachschlagen-<file>, one group per section of the list. Rows are
   [verb, forms, example, level]; a "# …" string is a sub-heading and is skipped.
     starke-schwache-verben     él indefinido and participle of each verb; wrong: the other
                                forms, the regular pattern (tenió, hacido)
     trennbare-verben           yo present of the pronominal verb; wrong: no pronoun, another pronoun
     verben-mit-praepositionen  the preposition in the example sentence; wrong: the others */
const REF_PREFIX = "nachschlagen-";
const refMods = import.meta.glob("../../data/nachschlagen/*.json", { eager: true });
const refLists = Object.fromEntries(Object.entries(refMods).map(([path, m]) => [path.split("/").pop().replace(/\.json$/, ""), m.default ?? m]));
// Which level a whole list sits at in the quiz picker: where its first rows start.
const REF_LEVEL = { "starke-schwache-verben": "A1", "trennbare-verben": "A1", "verben-mit-praepositionen": "A2" };
const rowsOf = (sec) => (sec.items ?? []).filter((it) => Array.isArray(it));
const bareVerb = (v) => String(v).replace(/[[\]|]/g, "");
// The form a learner guesses from the regular pattern: wrong for an irregular verb.
const regularEl = (inf) => inf.replace(/ar$/, "ó").replace(/(er|ir|ír)$/, "ió");
const regularPart = (inf) => inf.replace(/ar$/, "ado").replace(/(er|ir|ír)$/, "ido");
const mcq = (prompt, right, wrong, kind, src) => {
  const seen = new Set([right.toLowerCase()]);
  const opts = shuffle(wrong).filter((w) => w && !seen.has(w.toLowerCase()) && seen.add(w.toLowerCase())).slice(0, 3);
  return opts.length ? { t: "mc", prompt: prompt.slice(0, 200), options: [right, ...opts].map((o) => o.slice(0, 80)), correct: 0, kind: kind.slice(0, 120), src } : null;
};

function refGroups(file) {
  const data = refLists[file];
  if (!data) return [];
  const src = (sec, i, part) => `g:${REF_PREFIX}${file}#${sec.id}-${i}${part ? `-${part}` : ""}`;
  return data.sections.map((sec) => {
    const items = [];
    rowsOf(sec).forEach((row, i) => {
      const [v, forms, example] = row;
      const inf = bareVerb(v);
      if (file === "starke-schwache-verben") {
        // "tengo · tuvo · tenido": yo presente · él indefinido · participio
        const [yo, past, p2] = String(forms).split(" · ").map((f) => f.trim());
        if (!past || !p2) return;
        items.push(mcq(`Ayer ella ___ (${inf}) · indefinido`, past, [regularEl(inf), yo, p2, inf], sec.name, src(sec, i, "praet")));
        items.push(mcq(`Ella ha ___ (${inf}) · perfecto`, p2, [regularPart(inf), past, inf, yo], sec.name, src(sec, i, "perf")));
      } else if (file === "trennbare-verben") {
        // The yo form with its pronoun; wrong: no pronoun, or the pronoun of another person.
        const yo = String(forms).split(" · ")[0].trim();
        if (!yo.startsWith("me ")) return;
        const bare = yo.slice(3);
        items.push(mcq(`Yo ___ (${inf}) · presente`, yo, [bare, `se ${bare}`, `te ${bare}`], sec.name, src(sec, i)));
      } else if (file === "verben-mit-praepositionen") {
        const prep = sec.name;
        const verb = String(v).endsWith(` ${prep}`) ? String(v).slice(0, -prep.length - 1) : String(v);
        const re = new RegExp(`(^|[^\\p{L}])${prep}(?![\\p{L}])`, "iu");
        // The example with its preposition blanked; where it is merged (al, del) or absent, the
        // verb with what follows it instead.
        const prompt = example && re.test(example) ? example.replace(re, "$1___") : `${verb} ___ (${forms})`;
        // Never a preposition the same verb also takes (hablar con / de, quedar con / en).
        const own = new Set(data.sections.filter((x) => rowsOf(x).some((r) => String(r[0]) === `${verb} ${x.name}`)).map((x) => x.name));
        const others = data.sections.map((x) => x.name).filter((n) => !own.has(n));
        items.push(mcq(prompt, prep, others, "Which preposition is right?", src(sec, i)));
      }
    });
    return { title: sec.name, items: items.filter(Boolean) };
  }).filter((g) => g.items.length);
}

/** Every askable item of one grammar topic, grouped by the exercise it comes from. */
function grammarGroups(key) {
  if (key === VERB_KEY) return verbGroups();
  if (key === WF_KEY) return wortfallenGroups();
  if (key === TF_KEY) return fehlerQuizGroups();
  if (key.startsWith(REF_PREFIX)) return refGroups(key.slice(REF_PREFIX.length));
  const data = dataOf(key);
  if (!data) return [];
  const groups = [];
  const exercises = data.exercises ?? [];
  // Answers of every fill/table exercise of the chapter: the fallback pool for an
  // exercise whose items all have the same answer (only of the same length in words, so a
  // one-word gap never offers a whole clause).
  const chapterPool = exercises.flatMap((e) =>
    e.type === "fill" ? (e.items ?? []).map((it) => accepted(it.answer)[0]) :
    e.type === "table" ? (e.rows ?? []).map((r) => accepted(r.answer)[0]) : []).filter(Boolean);
  const words = (s) => s.split(/\s+/).length;

  exercises.forEach((e, ei) => {
    let pairs = null;
    if (e.type === "fill") pairs = (e.items ?? []).map((it) => ({ prompt: marked(it.prompt) + (it.hint ? ` (${plain(it.hint)})` : ""), answers: accepted(it.answer), choices: accepted(it.choices) }));
    // A table row alone ("Aus Passau.") is not a question: on the page the column head
    // says what to write. So the prompt carries it: "Aus Passau. → Fragewort?"
    else if (e.type === "table") {
      const ask = plain(e.columns?.[1] ?? "");
      pairs = (e.rows ?? []).map((r) => ({ prompt: marked(r.term) + (ask ? ` → ${ask}?` : ""), answers: accepted(r.answer), choices: accepted(r.choices) }));
    }
    else if (e.type === "match") pairs = (e.pairs ?? []).map((p) => ({ prompt: marked(p.q), answers: accepted(p.a) }));
    if (!pairs?.length) return;
    pairs = pairs.filter((p) => p.answers.length);
    const own = new Set(pairs.map((p) => p.answers[0].toLowerCase()));
    // An exercise's own answers are the right set of choices even when there are only two
    // (haben / sein): forms from another exercise of the chapter would be nonsense there.
    // Only an exercise whose items all share one answer borrows from the chapter.
    const extra = e.type === "match" || own.size >= 2 ? [] : chapterPool.filter((a) => words(a) === words(pairs[0].answers[0]));
    const items = toChoices(pairs, plain(e.title) || "Which answer fits?", `g:${key}#${ei}`, extra);
    if (items.length) groups.push({ title: plain(e.title), items });
  });

  // The older quiz-only topics: one list of questions, no exercises.
  if (!exercises.length && Array.isArray(data.questions)) {
    const pairs = data.questions.map((q) => ({ prompt: plain(q.prompt), answers: accepted(q.answer) }));
    const items = toChoices(pairs, "Which word fits the gap?", `g:${key}#q`);
    if (items.length) groups.push({ title: "Gap sentences", items });
  }
  return groups;
}

/** A Lernset's words that have a translation in every quiz language. */
function wordGroups(id) {
  const words = byUnit(id).filter((e) => MEANING_LANGS.every((l) => e[l]));
  if (!words.length) return [];
  return [{
    title: "Words",
    items: words.map((e) => ({ t: "word", id: e.id, dir: "de-meaning", de: spokenForm(e), en: e.en, src: `w:${e.id}` })),
  }];
}

/** Every chapter with at least one askable item: [{ slug, kind, level, name, count }]. */
export function chapterList() {
  const out = [];
  const grammar = [...grammarCatalog];
  // Akkusativ has its own page and so is not in the catalog, but its questions are fine.
  if (!grammar.some((t) => t.key === "akkusativ") && dataOf("akkusativ")) {
    const a = dataOf("akkusativ");
    grammar.push({ key: "akkusativ", name: a.name, level: a.level });
    grammar.sort(byPlan((t) => [t.key])).sort((x, y) => QUIZ_LEVELS.indexOf(x.level) - QUIZ_LEVELS.indexOf(y.level));
  }
  // The verb tables are a reference page (/grammar/verbs), not a topic in the catalog.
  // `assign: false` keeps it out of the Aufgaben catalog, which counts what a student
  // finished from the topic pages' scored exercises. Last of A1 (the sort is stable).
  grammar.push({ key: VERB_KEY, name: "Verb tables: the most important verbs", level: "A1", assign: false });
  // The other Nachschlagewerk lists, the same way (refGroups above).
  for (const [file, data] of Object.entries(refLists)) {
    grammar.push({ key: `${REF_PREFIX}${file}`, name: data.title, level: REF_LEVEL[file] ?? "A2", assign: false });
  }
  grammar.push({ key: WF_KEY, name: "Word traps: kitchen or chicken?", level: "A2", assign: false });
  grammar.push({ key: TF_KEY, name: "Typical mistakes: your or you're, its or it's", level: "A1", assign: false });
  grammar.sort((x, y) => QUIZ_LEVELS.indexOf(x.level) - QUIZ_LEVELS.indexOf(y.level));
  for (const t of grammar) {
    if (!QUIZ_LEVELS.includes(t.level)) continue;
    const count = grammarGroups(t.key).reduce((n, g) => n + g.items.length, 0);
    if (count) out.push({ slug: `g-${t.key}`, kind: "grammatik", level: t.level, name: t.name, count, ...(t.assign === false ? { assign: false } : {}) });
  }
  for (const u of units()) {
    if (!QUIZ_LEVELS.includes(u.level)) continue;
    const count = wordGroups(u.id)[0]?.items.length ?? 0;
    if (count >= 2) out.push({ slug: `w-${u.id}`, kind: "wortschatz", level: u.level, name: u.title ?? u.id, count });
  }
  return out;
}

// chapterList() walks every topic and Lernset; the chapter pages ask once each (hundreds
// of pages per build), so the answer is computed on the first question and kept.
let slugs = null;

/** Whether `slug` (g-<key> / w-<unit>) is a chapter the builder offers. Build time only. */
export function hasChapter(slug) {
  slugs ??= new Set(chapterList().map((c) => c.slug));
  return slugs.has(slug);
}

/** One chapter's ready-made questions, grouped by exercise. */
export function chapterItems(slug) {
  if (slug.startsWith("g-")) return grammarGroups(slug.slice(2));
  if (slug.startsWith("w-")) return wordGroups(slug.slice(2));
  return [];
}
