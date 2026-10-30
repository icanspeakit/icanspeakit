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
// Grammar words: a closed set of English words the learner chooses among by grammar alone.
// Checked word by word, lower case, curly apostrophes made straight ("in the", "doesn't", "-ing").
const GRAMMAR_WORD = new RegExp(`^(?:${[
  "-?(?:s|es|ed|d|ing|er|est|ly|ier|iest)",
  "a|an|the|some|any|no|this|that|these|those|each|every|all|both|either|neither|enough|much|many|few|little|more|most|less|least|fewer|other|another",
  "i|me|my|mine|myself|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|we|us|our|ours|ourselves|they|them|their|theirs|themselves|one|someone|somebody|something|anyone|anybody|anything|nobody|nothing|everyone|everything",
  "who|whom|whose|which|what|where|when|why|how|whoever|whatever|whichever|wherever|whenever|however",
  "in|on|at|to|for|from|of|with|without|by|about|into|onto|over|under|since|until|till|during|before|after|between|among|through|across|behind|opposite|near|next|above|below|against|towards|around|up|down|off|out|away|back|like",
  "and|or|but|so|because|although|though|if|unless|while|whereas|despite|spite|whether|as|than|then|nor|not|only|also|even|too|yet|still|already|just|ever|never|once|otherwise|therefore",
  "am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|done|doing|will|would|shall|should|can|could|may|might|must|ought|need|used|going|get|got|gotten",
  "'s|'re|'m|'ve|'d|'ll|(?:is|are|was|were|has|have|had|do|does|did|wo|would|ca|could|should|must|need|might)n't|can't|won't|shan't",
].join("|")})$`);
const grammarOnly = (o) => String(o).toLowerCase().replace(/[’‘]/g, "'").split(/\s+/).every((w) => GRAMMAR_WORD.test(w));
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
 * the other gaps' answers, which only works when they are all grammar words (a/an/the,
 * in/on/at, him/her, does/did, -ed/-ing): then grammar decides. When they are other words —
 * for "drink" the past participle row would offer drunk, spoken, bought, eaten; for "see"
 * saw, read, was — the answer is found by meaning, so the gap is left out. */

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
