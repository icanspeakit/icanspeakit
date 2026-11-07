// Slides for present mode (src/lib/praesentation.js → praesentationDeck.js): the running text
// of a topic's "Kurz erklärt" and rule cards, cut into screens of at most MAX_WORDS words and
// laid out for the projector. Nothing is written new; text is only split, grouped, dropped
// (parts for higher levels, a few filler sentences) and set as lines, chips or tables.
//
//   splitUnits(html)  sentences (and <br>, "A2:" level labels) as units, tags kept balanced
//   formatUnit(html)  one unit as a line, an example line, chips or a table
//   pack(units)       units into slides of ≤ MAX_WORDS words, one level per slide
//
// Words are counted in running text. A short-form table (ich → mir, der → den) counts one
// word per row; ✗ → ✓ corrections are whole sentences and count fully, so they are cut
// into rows and spread over slides.
import { rulePairsHtml } from "./examplePairs.js";

export const MAX_WORDS = 20;
// Longest rest after „Rule:" that is set as the big answer line; longer stays running text.
const ANSWER_WORDS = 8;
// A rule that ends in „…:" may take its example along over the limit by this much: a slide
// ending in a colon with the example alone on the next one was worse than a fuller slide.
const COLON_SLACK = 8;
// … but only a short example (a few words): a long one on its own slide reads fine.
const SHORT_EXAMPLE = 5;
const LEVEL_RE = /^(?:ab\s+)?(A1|A2|B1|B2|C1|C2):\s*/;
// Sentences that tell the learner something about the topic rather than the topic itself.
// Only these exact kinds are dropped; anything else stays.
const FILLER = /\b(brauchen Sie (jeden Tag|oft|immer|ständig)|Am besten auswendig|Keine Angst|Das ist (ganz )?(einfach|leicht|wichtig)\b)/i;
const INLINE = new Set(["em", "strong", "b", "i", "span", "mark", "u", "small", "sub", "sup"]);
const CUT = "\u0001";

export const textOf = (html) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
// "ich → mich" is one entry of a pairs table, so one word.
const count = (text) => text.replace(/(\S+)\s*→\s*(\S+)/g, "§").split(" ").filter((w) => /[\p{L}\p{N}§]/u.test(w)).length;
/** Words of running text: marks are not words; a pairs table is one word per row. */
export function words(html) {
  let n = 0;
  const rest = String(html ?? "").replace(/<table class="ex-pairs">[\s\S]*?<\/table>/g, (t) => {
    n += (t.match(/<tr>/g) ?? []).length;
    return " ";
  });
  return n + count(textOf(rest));
}

/** Html with CUT marks (and block tags) → pieces, every inline tag closed and reopened
 *  across a cut, so each piece is balanced html on its own. */
function cutAtMarks(src) {
  const units = [];
  const stack = [];
  let cur = "";
  const flush = () => {
    const html = (cur + stack.slice().reverse().map((t) => `</${t.name}>`).join("")).trim();
    if (textOf(html)) units.push(html);
    cur = stack.map((t) => t.open).join("");
  };
  for (const tok of src.match(/<[^>]+>|[^<]+/g) ?? []) {
    const tag = /^<(\/?)([a-z0-9]+)\b[^>]*>$/i.exec(tok);
    if (tag) {
      const [, close, raw] = tag;
      const name = raw.toLowerCase();
      if (!INLINE.has(name)) { flush(); continue; } // <br>, <p>, <li>, <ul> …: a boundary
      if (close) {
        const at = stack.map((t) => t.name).lastIndexOf(name);
        if (at >= 0) stack.splice(at, 1);
        cur += tok;
      } else {
        stack.push({ name, open: tok });
        cur += tok;
      }
      continue;
    }
    const parts = tok.split(CUT);
    parts.forEach((p, k) => {
      cur += p;
      if (k < parts.length - 1) flush();
    });
  }
  flush();
  return units;
}

// Where an over-long sentence may be cut further, tried in this order.
const CLAUSE = [
  /(\s+[—–])\s+/g,
  /(;)\s+/g,
  /(:)\s+/g,
  /(,)\s+(?=(?:<[^>]+>)*(?:aber|denn|weil|dass|wenn|sondern|als|ob|damit|obwohl|während|bevor|nachdem|deshalb|deswegen|trotzdem|also|und|oder)\b)/g,
  /(,)\s+/g,
];
/** A unit over MAX_WORDS, cut at the first kind of clause boundary that brings it under. */
function shorten(html, from = 0) {
  if (words(html) <= MAX_WORDS || /<table/.test(html)) return [html];
  for (let k = from; k < CLAUSE.length; k++) {
    const pieces = cutAtMarks(html.replace(CLAUSE[k], `$1${CUT}`));
    if (pieces.length < 2) continue;
    // Glue small neighbours back together while they fit, then shorten what is still long.
    const glued = [];
    for (const p of pieces) {
      const last = glued.at(-1);
      if (last != null && words(last) + words(p) <= MAX_WORDS) glued[glued.length - 1] = `${last} ${p}`;
      else glued.push(p);
    }
    return glued.flatMap((p) => shorten(p, k + 1));
  }
  return [html];
}

/** The html of a rule card or brief as units: [{ html, level }] (level from "A2: …", else null). */
export function splitUnits(html) {
  const src = String(html ?? "")
    // A sentence ends before a capital, a quote, a ✗/✓ or a bracket — also across tags.
    // The full stop may sit inside the tag: "<em>Ich bin gefahren.</em> So erzählt man …".
    .replace(/([.!?…])((?:<\/(?:em|strong|b|i|span)>)*)\s+(?=(?:<(?:em|strong|b|i|span)\b[^>]*>)*[A-ZÄÖÜ„"✗✓(])/g, `$1$2${CUT}`)
    // A level label starts a new unit: "… A1: mich, dich … A2: zwei Pronomen …".
    .replace(/\s+(?=(?:<[^>]+>)*(?:ab\s+)?(?:A1|A2|B1|B2|C1|C2):\s)/g, CUT)
    // An example after a colon is its own line: "… der man etwas tut: <em>Wem …?</em>".
    .replace(/:\s+(?=<em>[^<→]*[.!?]<\/em>)/g, `:${CUT}`)
    // Corrections "✗ a → ✓ b · ✗ c → ✓ d": one unit per pair.
    .replace(/\s+·\s+(?=✗)/g, CUT);
  const units = cutAtMarks(src);

  const out = [];
  // A level label holds until the next one: "A2: … Satz. Noch ein Satz." is all A2.
  let held = null;
  for (let u of units.flatMap((x) => shorten(x))) {
    // Empty pairs left behind by a cut ("<em></em>") and stray spaces.
    u = u.replace(/<(em|strong|b|i|span)\b[^>]*>\s*<\/\1>/g, "").trim()
      // A cut at a dash leaves it hanging at one end or the other.
      .replace(/^((?:<[^>]+>)*)\s*[—–]\s*,?\s*/, "$1")
      .replace(/\s*[—–]\s*((?:<\/[^>]+>)*)$/, "$1");
    const t = textOf(u);
    if (!t) continue;
    const m = LEVEL_RE.exec(t);
    if (m) held = m[1];
    const level = held;
    if (m) u = u.replace(/^((?:<[^>]+>)*)\s*(?:ab\s+)?(?:A1|A2|B1|B2|C1|C2):\s*/, "$1");
    if (FILLER.test(t) && !/<(em|strong)\b/.test(u)) continue;
    out.push({ html: u, level });
  }
  // "Woher? Wohin? Wo?" were three sentences; they belong together.
  const merged = [];
  for (const u of out) {
    const prev = merged.at(-1);
    const q = /^\S+\?$/.test(textOf(u.html));
    if (q && prev?.questions && prev.level === u.level) { prev.html += ` ${u.html}`; continue; }
    merged.push({ ...u, questions: q });
  }
  return merged.map(({ html, level }) => ({ html, level }));
}

/** Chips in an even grid: as many columns as make the rows full (6 → 3 × 2, 8 → 4 × 2). */
function chips(items) {
  const n = items.length;
  const cols = n <= 4 ? n : n % 3 === 0 ? 3 : n % 4 === 0 ? 4 : n <= 6 ? 3 : 4;
  return `<div class="pr-chips" style="--cols:${cols}">${items.map((i) => `<span>${i}</span>`).join("")}</div>`;
}

/** "mich, dich, ihn (Akkusativ) und mir, dir, ihm (Dativ)": short lists, each named in
 *  brackets → a table with the names as column heads, the lists side by side. Or null. */
function groupTable(t) {
  const groups = [...t.replace(/\.$/, "").matchAll(/\s*(?:und|oder|,|;|·)?\s*([^()]+?)\s*\(([^)]+)\)/g)]
    .map(([, list, head]) => ({ head: head.trim(), items: list.split(/,\s*/).map((x) => x.trim()).filter(Boolean) }));
  if (groups.length < 2 || groups.length > 4) return null;
  if (groups.map((g) => `${g.items.join(", ")} (${g.head})`).join(" ").length < t.replace(/\.$/, "").length * 0.8) return null;
  if (!groups.every((g) => g.items.length >= 2 && g.items.every((i) => i.split(" ").length <= 2))) return null;
  const rows = Math.max(...groups.map((g) => g.items.length));
  return `<table class="pr-grid"><thead><tr>${groups.map((g) => `<th>${g.head}</th>`).join("")}</tr></thead><tbody>${
    Array.from({ length: rows }, (_, r) => `<tr>${groups.map((g) => `<td>${g.items[r] ?? ""}</td>`).join("")}</tr>`).join("")
  }</tbody></table>`;
}

/** One unit, laid out. */
export function formatUnit(html) {
  const t = textOf(html);
  // Named short lists side by side: a table with column heads.
  const grid = groupTable(t);
  if (grid) return grid;
  // Question words only: chips.
  if (/^(\S+\?\s*){2,}$/.test(t)) {
    return chips(t.split(/\s+/));
  }
  // ✗ wrong → ✓ right, · separated: a two-column table.
  if (t.includes("✗") && t.includes("✓")) {
    const rows = html.split(/\s*·\s*/).map((r) => r.split(/\s*→\s*/)).filter((r) => r.length === 2);
    if (rows.length) {
      const clean = (s) => s.replace(/[✗✓]\s*/g, "").trim();
      return `<table class="pr-fix"><tbody>${rows.map(([a, b]) => `<tr><td class="pr-fix-no"><i aria-label="falsch">✗</i>${clean(a)}</td><td class="pr-fix-yes"><i aria-label="richtig">✓</i>${clean(b)}</td></tr>`).join("")}</tbody></table>`;
    }
  }
  // Two or more "a → b" pairs: the site's pairs table.
  if ((t.match(/→/g) ?? []).length >= 2) {
    const tab = rulePairsHtml(html);
    if (tab !== html) return `<div class="pr-line">${tab}</div>`;
  }
  // A whole example sentence (the cards set them in <em>): an example line. Also a short
  // exchange of them: "<em>Wem …?</em> — <em>Meiner Oma.</em>".
  const ex = /^<em>([\s\S]*)<\/em>([.!?]?)$/.exec(html.trim());
  if (ex && !ex[1].includes("<em>")) return `<p class="pr-ex">${ex[1]}${ex[2]}</p>`;
  if (/^(?:\s*<em>[^<]*(?:<(?:strong|b)>[^<]*<\/(?:strong|b)>[^<]*)*<\/em>\s*[—–-]?)+[.!?]?$/.test(html.trim())) {
    return `<p class="pr-ex">${html.replace(/<\/?em>/g, "")}</p>`;
  }
  // "Head: a, b, c und d." with short items: the head as a line, the items as chips.
  const colon = /^([^<]*?(?:<(?:strong|b|em)>[^<]*<\/(?:strong|b|em)>[^<]*?)*:)\s*(.+?)\.?$/.exec(html);
  if (colon && !colon[2].includes("→") && !colon[2].includes("<table")) {
    // A list set in one <em> as a whole: unwrap, and set each chip in it again.
    const whole = /^<(em|strong)>([^<]*)<\/(?:em|strong)>$/.exec(colon[2].trim());
    const list = whole ? whole[2] : colon[2];
    const wrap = (i) => (whole ? `<${whole[1]}>${i}</${whole[1]}>` : i);
    const items = list.split(/,\s+|\s+(?:und|oder)\s+/).map((x) => x.trim()).filter(Boolean);
    if (items.length >= 3 && items.every((i) => words(i) <= 4 && balanced(i))) {
      return `<p class="pr-line">${colon[1]}</p>${chips(items.map(wrap))}`;
    }
  }
  // "Rule: answer." — the colon ends the line, the answer gets its own line: an example line
  // when it is a sentence of its own, else an answer line. A colon in brackets stays.
  const cut = colonCut(html);
  if (cut) {
    const [head, rest] = cut;
    const r = textOf(rest);
    // An example sentence only when it is one: nothing but example text, no rule words around
    // it ("Stamm + Endung. <em>ich lern-e …</em>" is a rule with an example in it).
    const ruleWords = textOf(rest.replace(/<em>[\s\S]*?<\/em>/g, " "));
    const sentence = /^[„"]?[A-ZÄÖÜ]/.test(r) && /[.!?]["“]?$/.test(r) && (!/<em>/.test(rest) || words(ruleWords) === 0);
    if (sentence) return `<p class="pr-line">${head}</p><p class="pr-ex">${rest.replace(/<\/?em>/g, "")}</p>`;
    // The big answer line is for a short answer („werden + Infinitiv."); a longer explanation
    // in it read as a shouted paragraph. That stays running text under its head.
    if (words(rest) <= ANSWER_WORDS) return `<p class="pr-line">${head}</p><p class="pr-ans">${rest}</p>`;
    return `<p class="pr-line">${head}</p><p class="pr-line pr-more">${rest}</p>`;
  }
  return `<p class="pr-line">${html}</p>`;
}

/** [head ending in ":", rest] at the first colon outside brackets that is followed by
 *  at least two words, both halves balanced html; or null. */
function colonCut(html) {
  let depth = 0;
  let inTag = false;
  for (let k = 0; k < html.length; k++) {
    const ch = html[k];
    if (ch === "<") inTag = true;
    else if (ch === ">") inTag = false;
    else if (!inTag && ch === "(") depth++;
    else if (!inTag && ch === ")") depth = Math.max(0, depth - 1);
    else if (!inTag && depth === 0 && ch === ":" && /^(?:<\/[^>]+>)*\s/.test(html.slice(k + 1))) {
      // A colon inside <strong>…:</strong> leaves an empty pair at the start of the rest.
      const pieces = cutAtMarks(`${html.slice(0, k + 1)}${CUT}${html.slice(k + 1)}`)
        .map((p) => p.replace(/<(em|strong|b|i|span)\b[^>]*>\s*<\/\1>/g, "").trim());
      if (pieces.length === 2 && words(pieces[1]) >= 2 && words(pieces[0]) >= 1) return pieces;
      return null;
    }
  }
  return null;
}

/** Whether every tag opened in a bit of html is closed in it again. */
function balanced(html) {
  const st = [];
  for (const [, close, name] of html.matchAll(/<(\/?)([a-z]+)\b[^>]*>/gi)) {
    if (!close) st.push(name);
    else if (st.pop() !== name) return false;
  }
  return st.length === 0;
}

const LV = ["A1", "A2", "B1", "B2", "C1", "C2"];
const higher = (a, b) => (!a ? b : !b ? a : LV.indexOf(a) >= LV.indexOf(b) ? a : b);
/** May two parts share a slide? Same level, or both for everybody (no label or A1): every
 *  group sees both, so a slide of them is never half hidden. */
const together = (a, b) => a === b || ((!a || a === "A1") && (!b || b === "A1"));

/** Units into slides: [{ html, level, words, carried? }]. A unit over the limit gets a slide
 *  alone. `carried`: the words of a short example kept after its rule's colon (COLON_SLACK) –
 *  a slide is only too long by what is left without it (overLimit). */
export function pack(units, max = MAX_WORDS) {
  const slides = [];
  const isEx = (h) => /^<em>[\s\S]*<\/em>[.!?]?$/.test(h.trim());
  units.forEach((u, k) => {
    const w = words(u.html);
    const cur = slides.at(-1);
    // A run of examples stays together: if the whole run does not fit after the rule,
    // it starts the next slide rather than leaving one example behind.
    let need = w;
    if (isEx(u.html) && !(k > 0 && isEx(units[k - 1].html))) {
      for (let j = k + 1; j < units.length && isEx(units[j].html) && units[j].level === u.level; j++) need += words(units[j].html);
      if (need > max) need = w; // a run longer than a slide splits anyway
    }
    const afterColon = isEx(u.html) && w <= SHORT_EXAMPLE && /:\s*(?:<\/[^>]+>\s*)*$/.test(cur?.parts.at(-1) ?? "");
    if (cur && together(cur.level, u.level) && cur.words + need <= max + (afterColon ? COLON_SLACK : 0)) {
      // Over the limit only by the example it was allowed to keep: `carried` says how much.
      if (cur.words + need > max) cur.carried = (cur.carried ?? 0) + w;
      cur.parts.push(u.html);
      cur.words += w;
      cur.level = higher(cur.level, u.level);
    } else {
      slides.push({ parts: [u.html], level: u.level, words: w });
    }
  });
  return slides.map((s) => ({
    // Correction rows come out as one table each; rows on the same slide are one table.
    html: s.parts.map(formatUnit).join("").replace(/<\/tbody><\/table><table class="pr-fix"><tbody>/g, ""),
    level: s.level,
    words: s.words,
    ...(s.carried ? { carried: s.carried } : {}),
  }));
}

/** Rule card or brief html → slides, the card's own level as the floor. */
export function slidesOfHtml(html, level = null) {
  return pack(splitUnits(html).map((u) => ({ ...u, level: higher(u.level, level) })));
}

/** Whether a slide is longer than MAX_WORDS, not counting an example it was allowed to keep. */
export const overLimit = (sl) => sl.words - (sl.carried ?? 0) > MAX_WORDS;
