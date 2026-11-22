// Klassentest: the questions a teacher's test can draw from, built once at build time and
// served as /professores/testes/fragen.json (the teacher's page fetches it when it opens).
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
// Grammar words: a closed set of Portuguese words the learner chooses among by grammar alone
// (articles and their contractions, pronouns, prepositions, linkers, ser/estar/ter/haver/ir).
// Checked word by word, lower case ("na", "por que", "-ando").
const GRAMMAR_WORD = new RegExp(`^(?:${[
  "-?(?:o|a|os|as|e|es|s|m|ns|is|ar|er|ir|ado|ada|ados|adas|ido|ida|idos|idas|ando|endo|indo|mente|íssimo|íssima|ão|ões|ães|ãos|inho|inha|zinho|zinha)",
  "o|a|os|as|um|uma|uns|umas|ao|aos|à|às|do|da|dos|das|no|na|nos|nas|num|numa|nuns|numas|dum|duma|pelo|pela|pelos|pelas",
  "este|esta|estes|estas|isto|esse|essa|esses|essas|isso|aquele|aquela|aqueles|aquelas|aquilo|deste|desta|destes|destas|disto|desse|dessa|desses|dessas|disso|daquele|daquela|daqueles|daquelas|daquilo|neste|nesta|nestes|nestas|nisto|nesse|nessa|nesses|nessas|nisso|naquele|naquela|naqueles|naquelas|naquilo|àquele|àquela|àqueles|àquelas|àquilo",
  "cada|todo|toda|todos|todas|tudo|outro|outra|outros|outras|muito|muita|muitos|muitas|pouco|pouca|poucos|poucas|bastante|bastantes|demasiado|demasiada|demasiados|demasiadas|mais|menos|tão|tanto|tanta|tantos|tantas|algum|alguma|alguns|algumas|nenhum|nenhuma|nenhuns|nenhumas|vários|várias|ambos|ambas|qualquer|quaisquer",
  "eu|tu|ele|ela|você|nós|vós|eles|elas|vocês|me|te|se|nos|vos|lhe|lhes|lo|la|los|las|mo|ma|mos|to|ta|lho|lha|lhos|lhas|mim|ti|si|comigo|contigo|consigo|connosco|convosco",
  "meu|minha|meus|minhas|teu|tua|teus|tuas|seu|sua|seus|suas|nosso|nossa|nossos|nossas|vosso|vossa|vossos|vossas|dele|dela|deles|delas|alguém|ninguém|algo|nada",
  "que|quê|quem|qual|quais|onde|aonde|donde|quando|como|quanto|quanta|quantos|quantas|porque|porquê|cujo|cuja|cujos|cujas",
  "ante|após|até|com|contra|de|desde|durante|em|entre|para|perante|por|sem|sob|sobre|trás|atrás|cima|baixo|debaixo|frente|diante|perto|longe|dentro|fora|lado|aqui|aí|ali|lá|cá",
  "e|ou|mas|porém|contudo|embora|nem|pois|portanto|então|assim|logo|enquanto|além|também|já|ainda|sempre|nunca|jamais|não|sim|bem|mal|melhor|pior|maior|menor|caso|conforme|tal",
  "sou|és|é|somos|sois|são|era|eras|éramos|éreis|eram|fui|foste|foi|fomos|fostes|foram|seja|sejas|sejamos|sejais|sejam|estou|estás|está|estamos|estais|estão|estava|estavas|estávamos|estáveis|estavam|estive|estiveste|esteve|estivemos|estivestes|estiveram|esteja|estejas|estejamos|estejam",
  "tenho|tens|tem|temos|tendes|têm|tinha|tinhas|tínhamos|tínheis|tinham|tive|tiveste|teve|tivemos|tivestes|tiveram|há|houve|havia|hei|hás|hão|vou|vais|vai|vamos|ides|vão|ia|ias|íamos|íeis|iam",
].join("|")})$`);
const grammarOnly = (o) => String(o).toLowerCase().split(/\s+/).every((w) => GRAMMAR_WORD.test(w));
export const MIN_OPTIONS = 3;
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const first = (a) => String(Array.isArray(a) ? a[0] : a);
// Accents off for the look-alike ranking (\u00e1 \u00e0 \u00e2 \u00e3 \u00e9 \u00ea \u00ed \u00f3 \u00f4 \u00f5 \u00fa \u00fc \u00e7 \u2192 plain letters).
const fold = (w) => String(w).toLowerCase().normalize("NFD").replace(/[\u0300-\u0308\u0327]/g, "");

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
 * the other gaps' answers, which only works when they are all grammar words (o/a/os,
 * no/na/ao, o/lhe, é/está): then grammar decides. When they are other words — for "beber" the
 * participle row would offer bebido, falado, comprado, comido — the answer is found by
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
      .sort((x, y) => x.d - y.d || x.o.localeCompare(y.o, "pt"))
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
    .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level) || a.name.localeCompare(b.name, "pt"));
}
