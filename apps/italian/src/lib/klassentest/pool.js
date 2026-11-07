// Klassentest: the questions a teacher's test can draw from, built once at build time and
// served as /teachers/tests/fragen.json (the teacher's page fetches it when it opens).
//
// Every question is a single gap from a reviewed grammar workspace (src/data/grammatik/*.json):
// the `fill` items and the `table` rows, free exercises only. The options come from where
// the topic page takes them (grammarWorkspace.js): the item's own `choices`, else the
// exercise's distinct answers. Unlike the topic page, a test keeps the same number of
// options on every question: here each question gets the answer and the (up to) three
// options that look most like it, in that order, and the teacher's page trims the whole
// test to 4 or 3 (lehrkraft.js). Gaps with only two options (ser or estar?) are left out:
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
// Grammar words: a closed set of Spanish words the learner chooses among by grammar alone.
// Checked word by word, lower case ("en la", "por qué", "-ando").
const GRAMMAR_WORD = new RegExp(`^(?:${[
  "-?(?:o|a|os|as|e|es|s|n|ar|er|ir|ado|ada|ido|ida|ando|iendo|mente|ísimo|ísima)",
  "el|la|los|las|lo|un|una|unos|unas|al|del|este|esta|estos|estas|esto|ese|esa|esos|esas|eso|aquel|aquella|aquellos|aquellas|aquello|cada|todo|toda|todos|todas|otro|otra|otros|otras|mucho|mucha|muchos|muchas|poco|poca|pocos|pocas|muy|bastante|bastantes|demasiado|demasiada|demasiados|demasiadas|más|menos|tan|tanto|tanta|tantos|tantas|algún|alguno|alguna|algunos|algunas|ningún|ninguno|ninguna|varios|varias|ambos|ambas",
  "yo|tú|él|ella|usted|nosotros|nosotras|vosotros|vosotras|ellos|ellas|ustedes|me|te|se|nos|os|le|les|mí|ti|sí|conmigo|contigo|consigo|mi|mis|tu|tus|su|sus|nuestro|nuestra|nuestros|nuestras|vuestro|vuestra|vuestros|vuestras|mío|mía|míos|mías|tuyo|tuya|tuyos|tuyas|suyo|suya|suyos|suyas|alguien|nadie|algo|nada",
  "qué|quién|quiénes|cuál|cuáles|dónde|adónde|cuándo|cómo|cuánto|cuánta|cuántos|cuántas|que|quien|quienes|cual|cuales|cuyo|cuya|cuyos|cuyas|donde|cuando|como|cuanto",
  "a|ante|bajo|con|contra|de|desde|durante|en|entre|hacia|hasta|mediante|para|por|según|sin|sobre|tras|encima|debajo|delante|detrás|enfrente|cerca|lejos|dentro|fuera|lado|aquí|ahí|allí|allá",
  "y|e|o|u|pero|sino|porque|aunque|si|ni|pues|así|luego|mientras|además|también|tampoco|embargo|ya|todavía|aún|siempre|nunca|jamás|no|bien|mal|mejor|peor|mayor|menor",
  "soy|eres|es|somos|sois|son|era|eras|éramos|erais|eran|fui|fuiste|fue|fuimos|fuisteis|fueron|sea|seas|seamos|seáis|sean|estoy|estás|está|estamos|estáis|están|estaba|estabas|estábamos|estabais|estaban|estuve|estuviste|estuvo|estuvimos|estuvisteis|estuvieron|esté|estés|estén|he|has|ha|hemos|habéis|han|había|habías|habíamos|habíais|habían|hay|hubo|voy|vas|va|vamos|vais|van|iba|ibas|íbamos|ibais|iban",
].join("|")})$`);
const grammarOnly = (o) => String(o).toLowerCase().split(/\s+/).every((w) => GRAMMAR_WORD.test(w));
export const MIN_OPTIONS = 3;
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const first = (a) => String(Array.isArray(a) ? a[0] : a);
const fold = (w) => String(w).toLowerCase().normalize("NFD").replace(/[\u0301\u0308]/g, "");

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
 * the other gaps' answers, which only works when they are all grammar words (el/la/los,
 * en/a/de, lo/le, es/está): then grammar decides. When they are other words — for "beber" the
 * participle row would offer bebido, hablado, comprado, comido — the answer is found by
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
      .sort((x, y) => x.d - y.d || x.o.localeCompare(y.o, "es"))
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
    .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level) || a.name.localeCompare(b.name, "es"));
}
