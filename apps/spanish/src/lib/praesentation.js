// Present mode for grammar topic pages (?mode=present, src/lib/praesentationDeck.js): the
// rule and the example sentences of a topic, in large type, one block per screen: the
// explanation first, then the examples. Built here at build time from the topic's JSON
// (src/data/grammatik/*.json) without writing anything new: what the data does not have,
// the deck does not show. scripts/audit-praesentation.mjs uses the same function to list
// the topics where something is missing or does not fit a slide.
//
// Deck = {
//   examples: [{ html, audio? }]          aktiv.listen (plain sentences with a recording);
//                                         else the parts of concept.exampleHtml
//   rules: [ { kind: "flow", items: [{ text, variant? }] }
//          | { kind: "table", caption?, head: [], rows: [[]] }
//          | { kind: "text", html, label, level } ]   one screen of a rule card, ≤ 20 words
//   brief: [{ kind: "text", html, label: "Kurz erklärt", level }]
// }
// level: the CEFR level a screen is for (from the card's tag or an "A2: …" in the text);
// the deck leaves out what is above the group. The cutting and layout is src/lib/folien.js.
import { slidesOfHtml, MAX_WORDS, overLimit } from "./folien.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** "A2 · Dativ" → "A2", "ab B1 · …" → "B1", "Endungen" → null (for every level). */
export function tagLevel(tag) {
  const m = /^(?:ab\s+)?(A1|A2|B1|B2|C1|C2)\b/.exec(String(tag ?? "").trim());
  return m ? m[1] : null;
}

/** Whether a card for `cardLevel` belongs in a deck for a group at `level`. */
export const fitsLevel = (cardLevel, level) => !cardLevel || !LEVELS.includes(level) || LEVELS.indexOf(cardLevel) <= LEVELS.indexOf(level);

/** Links become their text on a slide: there is nothing to click on the projector. */
const unlink = (html) => String(html ?? "").replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
/** The marks of the conjugation table: "arbeit|{e}st" → "arbeitest". */
const plainForm = (f) => String(f ?? "").replace(/\|/g, "").replace(/[{}]/g, "");

function tables(concept) {
  const out = [];
  if (concept?.positionTable?.rows?.length) {
    const t = concept.positionTable;
    out.push({ kind: "table", head: (t.labels ?? []).map((l) => l.text ?? String(l)), rows: t.rows });
  }
  if (concept?.table?.rows?.length) {
    const t = concept.table;
    const verbs = (t.verbs ?? []).filter((v) => !v.irregular).slice(0, 2);
    out.push({
      kind: "table",
      caption: t.caption,
      head: ["", "Endung", ...verbs.map((v) => v.inf)],
      rows: t.rows.map((r, i) => [r.pron, r.end, ...verbs.map((v) => plainForm(v.forms?.[i]))]),
    });
  }
  return out;
}

export function deckOf(w) {
  const c = w?.concept ?? {};
  const listen = (w?.aktiv?.listen ?? []).filter((x) => x?.text);
  const examples = listen.length
    ? listen.map((x) => ({ html: escapeHtml(x.text), audio: x.audio || null }))
    : String(c.exampleHtml ?? "").split(/\s+[·—]\s+/).map((s) => s.trim()).filter(Boolean).map((html) => ({ html: unlink(html) }));
  const rules = [];
  if (c.flow?.length) rules.push({ kind: "flow", items: c.flow.map((f) => ({ text: f.text, variant: f.variant ?? null })) });
  rules.push(...tables(c));
  for (const q of c.qa ?? []) {
    if (!q?.html) continue;
    // "A2 · Dativ" → "Dativ": the level is the screen's, the label is the topic.
    const label = String(q.tag ?? "Die Regel").replace(/^(?:abs+)?(?:A1|A2|B1|B2|C1|C2)s*·s*/, "") || "Die Regel";
    for (const sl of slidesOfHtml(unlink(q.html), tagLevel(q.tag))) rules.push({ kind: "text", label, ...sl });
  }
  const brief = slidesOfHtml(unlink(w?.briefHtml ?? markWords(escapeHtml(w?.subtitle ?? ""), w?.briefMarks))).map((sl) => ({ kind: "text", label: "Kurz erklärt", ...sl }));
  return { examples, rules, brief };
}

/** The words the text talks about (briefMarks: "hätte", "um … zu") in bold, wherever they
 *  stand as whole words, exactly as written: "könnte" marks "könnte", not "Könnten". */
function markWords(html, marks) {
  const list = (marks ?? []).filter(Boolean).map((m) => escapeHtml(m)).sort((a, b) => b.length - a.length);
  if (!list.length) return html;
  const alt = list.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")).join("|");
  return html.replace(new RegExp(`(?<![\\p{L}-])(?:${alt})(?![\\p{L}])`, "gu"), "<strong>$&</strong>");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

/**
 * What keeps a topic from presenting cleanly at `level`, in German, for the audit list.
 * Empty when the deck is fine.
 */
export function deckIssues(w, level) {
  const issues = [];
  const c = w?.concept ?? {};
  const d = deckOf(w);
  if (!w?.aktiv?.listen?.length) {
    issues.push(d.examples.length
      ? "keine Hörbeispiele (aktiv.listen) – Beispiele kommen aus concept.exampleHtml"
      : "keine Beispielsätze (weder aktiv.listen noch concept.exampleHtml)");
  }
  const cards = d.rules.filter((r) => r.kind === "text");
  const fitting = cards.filter((r) => fitsLevel(r.level, level));
  if (!cards.length && !d.rules.length) issues.push("keine Regel (concept.qa, flow und Tabellen fehlen) – nur der Kurztext");
  else if (cards.length && !fitting.length) issues.push(`keine Regelkarte für ${level} (alle concept.qa-Karten sind für ein höheres Niveau markiert)`);
  for (const q of c.qa ?? []) {
    if (!fitsLevel(tagLevel(q.tag), level)) continue;
    const label = q.tag ? `„${q.tag}“` : "ohne Tag";
    if (/<table\b/i.test(q.html ?? "")) issues.push(`Regelkarte ${label} enthält eine Tabelle im HTML`);
    if (/<a\b/i.test(q.html ?? "")) issues.push(`Regelkarte ${label} enthält Links (werden zu Text)`);
  }
  for (const sl of [...d.brief, ...cards]) {
    if (fitsLevel(sl.level, level) && overLimit(sl)) issues.push(`Folie „${sl.label}“ hat ${sl.words} Wörter (höchstens ${MAX_WORDS}) – der Satz lässt sich nicht teilen`);
  }
  if (!c.qa?.length && !c.flow?.length && !c.table && !c.positionTable) issues.push("Regel nur als Fließtext (subtitle/briefHtml)");
  return issues;
}
