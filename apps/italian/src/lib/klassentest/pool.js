// Klassentest: the questions a teacher's test can draw from, built once at build time and
// served as /insegnanti/test/fragen.json (the teacher's page fetches it when it opens).
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
// Grammar words: a closed set of Italian words the learner chooses among by grammar alone.
// Checked word by word, lower case ("nella", "perché", "-ando"). Elided forms (l', dell', c'è)
// count as one word.
const GRAMMAR_WORD = new RegExp(`^(?:${[
  "-?(?:o|a|i|e|are|ere|ire|ato|ata|ati|ate|ito|ita|iti|ite|uto|uta|uti|ute|ando|endo|mente|issimo|issima|issimi|issime)",
  "il|lo|la|l'|i|gli|le|un|uno|una|un'|del|dello|della|dell'|dei|degli|delle|al|allo|alla|all'|ai|agli|alle|dal|dallo|dalla|dall'|dai|dagli|dalle|nel|nello|nella|nell'|nei|negli|nelle|sul|sullo|sulla|sull'|sui|sugli|sulle|col|coi",
  "questo|questa|questi|queste|quello|quella|quelli|quelle|quel|quei|quegli|quell'|ogni|tutto|tutta|tutti|tutte|altro|altra|altri|altre|molto|molta|molti|molte|poco|poca|pochi|poche|tanto|tanta|tanti|tante|troppo|troppa|troppi|troppe|più|meno|così|alcuni|alcune|qualche|nessun|nessuno|nessuna|ciascuno|ciascuna|entrambi|entrambe|parecchi|parecchie",
  "io|tu|lui|lei|noi|voi|loro|mi|ti|si|ci|vi|li|ne|me|te|se|ce|ve|sé|glielo|gliela|glieli|gliele|gliene|mio|mia|miei|mie|tuo|tua|tuoi|tue|suo|sua|suoi|sue|nostro|nostra|nostri|nostre|vostro|vostra|vostri|vostre|qualcuno|qualcosa|niente|nulla",
  "che|chi|cosa|quale|quali|dove|quando|come|quanto|quanta|quanti|quante|perché|cui",
  "di|a|da|in|con|su|per|tra|fra|senza|verso|durante|dopo|prima|sopra|sotto|davanti|dietro|accanto|vicino|lontano|dentro|fuori|contro|presso|qui|qua|lì|là",
  "e|ed|o|oppure|ma|però|anche|né|quindi|allora|mentre|inoltre|neanche|nemmeno|già|ancora|sempre|mai|non|bene|male|meglio|peggio|migliore|peggiore|maggiore|minore|invece|cioè|poi",
  "sono|sei|è|siamo|siete|ero|eri|era|eravamo|eravate|erano|fui|fosti|fu|fummo|foste|furono|sia|siano|fossi|fosse|fossimo|fossero|sarò|sarà|sarei|sarebbe|stato|stata|stati|state|ho|hai|ha|abbiamo|avete|hanno|avevo|avevi|aveva|avevamo|avevate|avevano|abbia|abbiano|avessi|avesse|avrò|avrà|avrei|avrebbe|avuto|sto|stai|sta|stiamo|stanno|stavo|stava|vado|vai|va|andiamo|andate|vanno|c'è",
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
