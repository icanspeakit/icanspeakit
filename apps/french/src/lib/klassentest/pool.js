// Klassentest: the questions a teacher's test can draw from, built once at build time and
// served as /teachers/tests/fragen.json (the teacher's page fetches it when it opens).
//
// Every question is a single gap from a reviewed grammar workspace (src/data/grammatik/*.json):
// the `fill` items and the `table` rows, free exercises only. The options come from where
// the topic page takes them (grammarWorkspace.js): the item's own `choices`, else the
// exercise's distinct answers. Unlike the topic page, a test keeps the same number of
// options on every question: here each question gets the answer and the (up to) three
// options that look most like it, in that order, and the teacher's page trims the whole
// test to 4 or 3 (lehrkraft.js). Gaps with only two options (avoir or être?) are left out:
// they cannot match the others. Unshuffled, so the build is stable; the phone shuffles.
//
// A question: { id, q (the sentence with ___), h (hint), x (the exercise's instruction),
// o (options), a (accepted answers, first = model answer) }. Grouped by topic:
// { id, name, level, href, fragen: [...] }.
import { accepts, distinctOptions } from "../answerMatch.js";
import { isReviewed } from "../topicStatus.js";
import { topicPath } from "../routes.js";

const workspaceMods = import.meta.glob("../../data/grammatik/*.json", { eager: true });
const workspaces = Object.values(workspaceMods).map((m) => m.default ?? m).filter(isReviewed);

const MAX_OPTIONS = 4;
// Grammar words: a closed set of French words the learner chooses among by grammar alone.
// Checked word by word, lower case ("à la", "est-ce que", "-ent").
const GRAMMAR_WORD = new RegExp(`^(?:${[
  "-?(?:e|es|s|x|ent|ons|ez|ais|ait|aient|ions|iez|ai|a|as|é|ée|és|ées|i|ie|is|it|u|ue|us|ant|ment|er|ir|re|aux|al|ale|eux|euse|if|ive)",
  "le|la|l'|les|un|une|des|du|de|d'|au|aux|ce|cet|cette|ces|ça|cela|ceci|quel|quelle|quels|quelles|chaque|tout|toute|tous|toutes|autre|autres|même|mêmes|plusieurs|quelques|aucun|aucune|beaucoup|peu|trop|assez|très|plus|moins|aussi|si|tant|autant|certains|certaines",
  "je|j'|tu|il|elle|on|nous|vous|ils|elles|me|m'|te|t'|se|s'|lui|leur|leurs|y|en|moi|toi|soi|eux|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|mien|mienne|miens|miennes|tien|tienne|tiens|tiennes|sien|sienne|siens|siennes|nôtre|nôtres|vôtre|vôtres|celui|celle|ceux|celles|celui-ci|celle-ci|celui-là|celle-là|quelqu'un|quelque|chose|personne|rien|lequel|laquelle|lesquels|lesquelles|auquel|auxquels|auxquelles|duquel|desquels|desquelles",
  "qui|que|qu'|quoi|où|dont|quand|comment|combien|pourquoi|est-ce",
  "à|chez|dans|sur|sous|devant|derrière|avant|après|avec|sans|pour|par|contre|entre|depuis|pendant|vers|jusqu'à|jusque|côté|face|près|loin|ici|là|dessus|dessous|dedans|dehors|au-dessus|au-dessous|malgré|selon",
  "et|ou|mais|donc|or|ni|car|parce|puisque|lorsque|quoique|bien|mal|mieux|pire|meilleur|meilleure|meilleurs|meilleures|pourtant|cependant|alors|ainsi|ne|n'|pas|jamais|toujours|souvent|déjà|encore|non|oui",
  "suis|es|est|sommes|êtes|sont|étais|était|étions|étiez|étaient|été|serai|sera|sois|soit|soyons|soyez|soient|ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient|eu|aurai|aura|aie|aies|ait|ayons|ayez|aient|vais|vas|va|allons|allez|vont|allais|allait|allé|allée|allés|allées",
].join("|")})$`);
const grammarOnly = (o) => String(o).toLowerCase().split(/\s+/).every((w) => GRAMMAR_WORD.test(w));
export const MIN_OPTIONS = 3;
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const first = (a) => String(Array.isArray(a) ? a[0] : a);
const fold = (w) => String(w).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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
 * the other gaps' answers, which only works when they are all grammar words (le/la/les,
 * à/de/en, le/lui, est/a): then grammar decides. When they are other words — for "boire" the
 * participle row would offer bu, parlé, acheté, mangé — the answer is found by
 * meaning, so the gap is left out. */

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
      .sort((x, y) => x.d - y.d || x.o.localeCompare(y.o, "fr"))
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
    .map((w) => ({ id: w.id, name: w.name, level: w.level, href: topicPath(w.slug ?? w.id), fragen: questionsOf(w) }))
    .filter((tp) => tp.fragen.length >= 3)
    .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level) || a.name.localeCompare(b.name, "fr"));
}
