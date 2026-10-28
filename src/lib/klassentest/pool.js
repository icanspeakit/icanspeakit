// Klassentest: the questions a teacher's test can draw from, built once at build time and
// served as /lehrkraefte/tests/fragen.json (the teacher's page fetches it when it opens).
//
// Every question is a single gap from a reviewed grammar workspace (src/data/grammatik/*.json):
// the `fill` items and the `table` rows, free exercises only. The options come from where
// the topic page takes them (grammarWorkspace.js): the item's own `choices`, else the
// exercise's distinct answers. Unlike the topic page, a test keeps the same number of
// options on every question: here each question gets the answer and the (up to) three
// options that look most like it, in that order, and the teacher's page trims the whole
// test to 4 or 3 (lehrkraft.js). Gaps with only two options (sein or haben?) are left out:
// they cannot match the others. Unshuffled, so the build is stable; the phone shuffles.
//
// A question: { id, q (the sentence with ___), h (hint), x (the exercise's instruction),
// o (options), a (accepted answers, first = model answer) }. Grouped by topic:
// { id, name, level, href, fragen: [...] }.
import { accepts, distinctOptions } from "../answerMatch.js";
import { isReviewed } from "../topicStatus.js";

const workspaceMods = import.meta.glob("../../data/grammatik/*.json", { eager: true });
const workspaces = Object.values(workspaceMods).map((m) => m.default ?? m).filter(isReviewed);

const MAX_OPTIONS = 4;
// Grammar words: a closed set the learner chooses among by grammar alone. Checked word by
// word, lower case („in die“, „zum“, „-en“).
const GRAMMAR_WORD = new RegExp(`^(?:${[
  "-?(?:e|en|em|er|es|n|s|st|t|te|ten|test|tet)",
  "d(?:er|ie|as|em|en|es)|dass",
  "(?:k?ein|mein|dein|sein|ihr|unser|euer|eur|welch)(?:e|en|em|er|es)?",
  "ich|du|er|sie|es|wir|ihr|mich|dich|ihn|uns|euch|mir|dir|ihm|ihnen|sich|man|wer|wen|wem|wessen|was",
  "(?:da|dar|wo|wor)(?:auf|an|in|über|unter|mit|von|für|zu|um|vor|nach|bei|aus|durch|gegen|neben|hinter|zwischen)",
  "in|an|auf|aus|bei|mit|nach|von|zu|zum|zur|beim|vom|im|am|ins|ans|für|um|durch|gegen|ohne|über|unter|vor|hinter|neben|zwischen|seit|ab|bis|wegen|trotz|während|statt|anstatt|außer|gegenüber",
  "und|oder|aber|denn|sondern|weil|da|wenn|als|ob|obwohl|damit|bevor|nachdem|sobald|seitdem|deshalb|deswegen|darum|trotzdem|also|dann|doch|ja|nein|nicht|nie|niemand|nichts|nirgends|noch|schon|mehr|nur|auch|sogar|so|wie|wo|wohin|woher|wann|warum",
  "bin|bist|ist|sind|seid|sei|war|warst|waren|wart|gewesen|wäre|wärst|wären|wärt",
  "habe|hast|hat|haben|habt|hatte|hattest|hatten|hattet|gehabt|hätte|hättest|hätten|hättet",
  "werde|wirst|wird|werden|werdet|wurde|wurdest|wurden|wurdet|worden|geworden|würde|würdest|würden|würdet",
  "(?:muss|kann|darf|soll|will|mag)(?:t|st)?|(?:müss|könn|dürf|soll|woll|mög)(?:en|t)|(?:muss|konn|durf|soll|woll|moch)te(?:st|n|t)?|(?:müss|könn|dürf|möcht)te?(?:st|n|t)?|möchte(?:st|n|t)?",
  "irgend[a-zäöüß]*",
].join("|")})$`);
const grammarOnly = (o) => String(o).toLowerCase().split(/\s+/).every((w) => GRAMMAR_WORD.test(w));
export const MIN_OPTIONS = 3;
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const first = (a) => String(Array.isArray(a) ? a[0] : a);
const fold = (w) => String(w).toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");

function editDistance(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

/* A wrong option has to be one a learner could really pick for this gap. The item's own
 * `choices` and the exercise's `choices` were written for that. Otherwise the options are
 * the other gaps' answers, which only works when they are all grammar words (dem/den/der,
 * weil/dass, mich/mir, -e/-en): then grammar decides. When they are other words — for
 * „trinken“ the Partizip-II row would offer getrunken, gesprochen, bekommen, gekauft; for
 * „sehen“ sah, las, war — the answer is found by meaning, so the gap is left out. */

/** The answer first, then the options that look most like it — the near misses are the ones
 *  worth telling apart. At most MAX_OPTIONS. */
function optionsFor(item, ex, pool) {
  const own = Array.isArray(item.choices) && item.choices.length;
  const from = own ? distinctOptions(item.choices.map(String)) : pool;
  const curated = own || (Array.isArray(ex.choices) && ex.choices.length);
  if (!curated && !pool.every(grammarOnly)) return [first(item.answer)];
  const target = fold(first(item.answer));
  return [
    first(item.answer),
    ...from
      .filter((o) => !accepts(item.answer, o))
      .map((o) => ({ o, d: editDistance(target, fold(o)) }))
      .sort((x, y) => x.d - y.d || x.o.localeCompare(y.o, "de"))
      .slice(0, MAX_OPTIONS - 1)
      .map((x) => x.o),
  ];
}

function questionsOf(w) {
  const out = [];
  (w.exercises ?? []).forEach((ex, e) => {
    if (ex.paid || ex.choiceArt || (ex.type !== "fill" && ex.type !== "table")) return;
    const items = (ex.type === "fill" ? ex.items : ex.rows) ?? [];
    const pool = Array.isArray(ex.choices) && ex.choices.length
      ? distinctOptions(ex.choices.map(String))
      : distinctOptions(items.map((it) => it.answer).filter((a) => a != null && String(a).trim() !== "").map(first));
    items.forEach((it, i) => {
      const q = plain(ex.type === "fill" ? it.prompt : it.term);
      if (!q || it.answer == null || String(first(it.answer)).trim() === "") return;
      const o = optionsFor(it, ex, pool).map(plain).filter(Boolean);
      // Enough options to match the rest of the test, and exactly one way to be right among
      // them — else the check would mark a second pill right too.
      if (o.length < MIN_OPTIONS || o.filter((x) => accepts(it.answer, x)).length !== 1) return;
      out.push({
        id: `${w.id}/${e}/${i}`,
        q,
        h: plain(it.hint),
        x: plain(ex.title),
        o,
        a: [it.answer].flat().map(String),
      });
    });
  });
  return out;
}

/** Topics with at least a few questions, in level order, then by name. */
export function klassentestPool() {
  const ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return workspaces
    .map((w) => ({ id: w.id, name: w.name, level: w.level, href: `/${w.slug ?? w.id}`, fragen: questionsOf(w) }))
    .filter((tp) => tp.fragen.length >= 3)
    .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level) || a.name.localeCompare(b.name, "de"));
}
