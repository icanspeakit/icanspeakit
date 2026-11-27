// Live üben, results: a common mistake shown with its task, not just "30 years (plural)".
// From the topic's own exercise data (the teacher's tab has it whole) and the item key the
// phones send (protocol.js), this rebuilds the practice sentence with the right answer in the
// gap, and the "Why?" behind it: the item's own `why` where the data has one, otherwise the
// exercise's rule (its `hint`), shown as "Rule" so nobody takes it for an explanation of this
// one sentence. Many hints are only instructions for the task ("Type the verb in brackets"):
// ruleOf() leaves those out, so "Rule" never shows one.
//
// Pure: tests/unterricht/liveUebung.test.mjs.
import { unmark } from "../markedText.js";

const first = (a) => (Array.isArray(a) ? a[0] : a);
const clean = (s) => unmark(s ?? "").replace(/\s+/g, " ").trim();
const GAP = /_{2,}/;

// A sentence ends at . ! ? or : before a space – not the dot of a date or ordinal ("1. November").
const END = /(?<!\d)[.!?:](?=\s|$)/g;
function lastEnd(t) {
  let at = -1;
  for (const m of t.matchAll(END)) if (m.index + 1 < t.length) at = m.index;
  return at;
}
const firstEnd = (t) => t.search(/(?<!\d)[.!?](?=\s|$)/);

/** A story's text up to the sentence ends around one blank: [before, after]. */
function sentenceAround(segments, at) {
  const text = (s) => (s.blank !== undefined ? first(s.answer) : s.text ?? "");
  let before = "";
  for (let i = at - 1; i >= 0; i--) {
    const t = text(segments[i]);
    const end = segments[i].blank === undefined ? lastEnd(t) : -1;
    if (end >= 0) { before = t.slice(end + 2) + before; break; }
    before = t + before;
  }
  let after = "";
  for (let i = at + 1; i < segments.length; i++) {
    const t = text(segments[i]);
    const end = segments[i].blank === undefined ? firstEnd(t) : -1;
    if (end >= 0) { after += t.slice(0, end + 1); break; }
    after += t;
  }
  return [clean(before), clean(after)];
}

const tidy = (words) => words.join(" ").replace(/\s+([.,!?;:])/g, "$1");

// A sentence that says how to do the task, not why the answer is right. The hints are written in
// English here; the German words of the original stay for data that was not translated.
const TASK_WORD = /eintippen|klammer|bracket|^(type|tap|click|put|write|fill|complete|match|choose|pick|select|build|order|form|make|mark|underline|correct|rewrite|read|look|listen|drag|tippen|klick|setzen|schreiben|ergänzen|verbinden|wählen|bauen|ordnen|bilden|markieren|korrigieren|formulieren|lesen|schauen|achten|fragen|each (line|sentence|gap)|jede[rs]? (zeile|satz))\b/i;
const CARRIES_RULE = /[→=]/;

/** What is left of an exercise's hint once the sentences about the task itself are gone. */
export function ruleOf(hint) {
  const sentences = clean(hint).split(/(?<!\d\.|\b(?:z|B|d|h|Pl|bzw|usw|ca|e|g|etc|vs)\.)(?<=[.!?])\s+/);
  const kept = sentences.filter((s) => s && (CARRIES_RULE.test(s) || !TASK_WORD.test(s)));
  // A question left at the end ("Which auxiliary …?") only makes sense with the task.
  while (kept.at(-1)?.endsWith("?")) kept.pop();
  return kept.join(" ");
}

/**
 * The task behind one item: { before, gap, after, why, hint, rule } – the sentence split around
 * the answer (gap), the item's own explanation (why) or the exercise's rule. null when the item
 * is not in the data (a key from an older page).
 * gapLabel(n): the label of a numbered choice gap ("Gap 3"), in the UI language.
 */
export function kontextOf(ex, item, gapLabel = (n) => `Gap ${n}`) {
  if (!ex || item == null) return null;
  const rule = ex.hint ? ruleOf(ex.hint) : "";
  const out = (before, gap, after, why, hint = "") => ({ before, gap: clean(gap), after, why: why ? clean(why) : "", hint: clean(hint), rule });
  const i = Number(item);

  if (ex.type === "fill") {
    const it = ex.items?.[i];
    if (!it) return null;
    const answer = first(it.answer);
    const [b, a] = GAP.test(it.prompt) ? it.prompt.split(GAP) : [`${it.prompt} →`, ""];
    return out(clean(b), answer, clean(a ?? ""), it.why, it.hint);
  }
  if (ex.type === "table") {
    const row = ex.rows?.[i];
    if (!row) return null;
    const [b, a] = GAP.test(row.term) ? row.term.split(GAP) : [`${row.term} →`, ""];
    return out(clean(b), first(row.answer), clean(a ?? ""), row.why);
  }
  if (ex.type === "story" || ex.type === "wordbank") {
    const segs = ex.segments ?? [];
    const at = segs.findIndex((s) => String(s.blank) === String(item));
    if (at < 0) return null;
    const [b, a] = sentenceAround(segs, at);
    return out(b, first(segs[at].answer), a, segs[at].why);
  }
  if (ex.type === "build") {
    const s = ex.sentences?.find((x) => String(x.id) === String(item));
    if (!s) return null;
    return out("", tidy(s.correct ?? []), "", s.why, s.hint);
  }
  if (ex.type === "match") {
    const p = ex.pairs?.[i];
    if (!p) return null;
    return out(`${clean(p.q)} →`, p.a, "", p.why);
  }
  if (ex.type === "mcgap") {
    const it = ex.items?.[i];
    if (!it) return null;
    return out(`${gapLabel(i + 1)} →`, it.options?.[it.correct] ?? "", "", it.why);
  }
  return null;
}
