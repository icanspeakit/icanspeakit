// A partner or group worksheet as HTML, drawn at build time: the library sheets
// (lehrkraefte/arbeitsblaetter/partner/[id].astro) and the Tandembögen (…/tandem/[id].astro). Layout from the skill `partner-arbeitsblatt` §2, in the brand's
// colours (src/styles/partner-sheet.css):
//
//   page 1  Intro: name line, title, Grammatik box (position table), Redemittel, So geht's
//   page 2  the cards with a cut line: Partner A | Partner B (a group: A | B, then C | D);
//           each card opens with its yellow Tipp box
//   page 3  what follows the work alone: questions to the partner, game rules, gap table
//   page 4  together: group result, word cards to cut out, „Und Sie?“ — when there is only
//           „Und Sie?“, it closes page 1 instead of taking a page of its own
//   last    Lösungen
//
// Inline marks in the texts: *Wort* = the grammar's key word (red), _Wort_ = verb (blue).
import { FORMAT_NAMES, itemsByLetter, tileOrder } from "./schema.js";
import { iconSvg } from "./icons.js";
import { shuffle } from "../arbeitsblatt/seed.js";
import { mascotSvg } from "../mascots.js";
import { zimmerSvg, DIFFS } from "../arbeitsblatt/zimmerSzene.js";
import { kuecheSvg } from "../arbeitsblatt/kuecheSzene.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** Escaped text with the two marks turned into coloured spans. */
export const fmt = (s) => esc(s)
  .replace(/\*([^*]+)\*/g, '<b class="pu-k">$1</b>')
  .replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, '$1<b class="pu-v">$2</b>');
/** The marks removed, for places that show plain text. */
export const unmark = (s) => String(s ?? "").replace(/\*([^*]+)\*/g, "$1").replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, "$1$2");

/* What the learners practise besides the grammar, read off the sheet: every partner sheet is
   spoken and heard; reading and writing only when its cards ask for them. Shown next to the
   level at the top of page 1 (here and in scripts/generate-partner-pdf.mjs) and in the list. */
const READ = new Set(["rolle", "bild", "raster", "wuerfel", "regeln"]);
const WRITE = new Set(["allein", "schreiben", "interview", "tabelle"]);
export function skills(spec) {
  const types = new Set(spec.karten.flatMap((k) => k.schritte.map((s) => s.typ)));
  const has = (set) => [...types].some((t) => set.has(t));
  return ["Speaking", "Listening", ...(has(READ) ? ["Reading"] : []), ...(has(WRITE) ? ["Writing"] : [])];
}
/** Level and skills in one strip, the first thing on the sheet. */
export const topStrip = (spec) => `<div class="pu-top"><span class="pu-level">${esc(spec.niveau)}</span>
  <span class="pu-skills">${skills(spec).map((x) => `<span class="pu-skill">${x}</span>`).join("")}</span></div>`;

const SYMBOLS = ["■", "▲", "●"];
const roleLabel = (spec, r) => (spec.modus === "gruppe" ? `Person ${r}` : `Partner ${r}`);

// The tile that opens the sentence `satz` is printed with a capital, as in the sentence itself
// ("ich" → "Ich"): the tile the sentence starts with, else the verb tile closest to the
// conjugated first word (kommen → Kommst, können → Kann, anrufen → Rufst … an). A choice tile
// („ja / nein / doch“) opens the sentence when one of its options does.
// English (the site's language): tiles are base-form verbs (be, have, go), the sentence may open
// with a conjugated form (Is, Has, Does, Went …), with a contraction (He's, What's), with an
// auxiliary that is no tile at all (Do you like tea? from you / like / tea: then nothing is
// capitalised), or with another case of a pronoun tile (he → Him). "I" stays "I".
// The German branches below only run when GERMAN is switched on: on English tiles they misfire
// (the "declined word" test would capitalise a tile "dog" for "Does …").
const GERMAN = false;
const EN_IRREGULAR = {
  be: /^(am|is|are|was|were|isn't|aren't|wasn't|weren't|being|been)$/,
  have: /^(has|had|hasn't|haven't|hadn't|having)$/,
  do: /^(does|did|doesn't|didn't|don't|doing|done)$/,
  go: /^(goes|went|gone|going)$/,
  get: /^(gets|got|getting)$/,
  come: /^(comes|came|coming)$/,
  take: /^(takes|took|taken|taking)$/,
  make: /^(makes|made|making)$/,
  buy: /^(buys|bought|buying)$/,
  eat: /^(eats|ate|eaten|eating)$/,
  see: /^(sees|saw|seen|seeing)$/,
  say: /^(says|said|saying)$/,
  leave: /^(leaves|left|leaving)$/,
  meet: /^(meets|met|meeting)$/,
  can: /^(can't|cannot)$/,
};
const EN_CASES = { i: ["my", "me", "mine"], he: ["him", "his"], she: ["her", "hers"], we: ["us", "our", "ours"], they: ["them", "their", "theirs"], you: ["your", "yours"], it: ["its"] };
/** Regular forms of a base word: -s, -es, -ed, -ing (stop → stopped, make → making, study → studies). */
function enForms(w) {
  const last = w.slice(-1);
  return [w + "s", w + "es", w + "ed", w + "d", w + "ing", w.replace(/e$/, "") + "ing", w.replace(/y$/, "ies"), w.replace(/y$/, "ied"), w + last + "ed", w + last + "ing"];
}
function openerEn(list, first) {
  const lc = (w) => w.toLowerCase();
  const pron = Object.keys(EN_CASES).find((p) => EN_CASES[p].includes(first) && list.some((w) => lc(w) === p));
  if (pron) return list.find((w) => lc(w) === pron);
  for (const w of list) {
    if (/ \/ /.test(w) || !/^[a-z]/.test(w)) continue; // choice tiles and names / "I" are matched by the sentence start
    const head = w.split(" ")[0];
    if (EN_IRREGULAR[head]?.test(first) || (head.length >= 2 && enForms(head).includes(first))) return w;
  }
  return null;
}
const IRREGULAR = { sein: /^(bin|bist|ist|sind|seid|war|warst|waren|wart)$/, wissen: /^(weiß|weißt|wisst|wusste|wusstest)$/, nehmen: /^(nimm|nimmst|nimmt)$/, geben: /^(gib|gibst|gibt)$/ };
const PREFIX = /^(sich |an|auf|ab|aus|ein|mit|nach|vor|zu|zurück|weg|herein|her|hin|los|fest)(?=\S)/;
function opener(list, satz) {
  const low = String(satz ?? "").replace(/<[^>]+>/g, "").replace(/\*/g, "").trim().toLowerCase();
  if (!low) return null;
  // After the tile: a space, punctuation, the end, or an apostrophe (He's, What's, Tom's).
  const opens = (w) => w.toLowerCase().split(" / ").some((o) => low.startsWith(o) && /^[\s,.?!']?$/.test(low.charAt(o.length)));
  const starts = list.filter(opens);
  if (starts.length) return starts.sort((a, b) => b.length - a.length)[0];
  const first = low.split(/[\s,]/)[0];
  if (!GERMAN) return openerEn(list, first);
  const pron = Object.keys(CASES).find((p) => CASES[p].includes(first) && list.includes(p));
  if (pron) return pron;
  // A declined word: wer → Wem, welcher Zug → Welchen Zug, irgend → Irgendjemand.
  const declined = list.find((w) => {
    const head = w.split(" ")[0];
    return /^[a-zäöü]/.test(w) && head.length >= 3 && first.startsWith(head.slice(0, -1));
  });
  if (declined) return declined;
  // Only verb tiles from here on: lower case, ending in -n, maybe with sich or a separable prefix
  // („haustier“ in Nomen is lower case on purpose). Letters in common from the start, or
  // consonants only, so a changed vowel still matches: müssen → Muss, essen → Isst.
  const same = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };
  const skel = (w) => w.replace(/[aeiouyäöü]/g, "");
  let best = null, n = 1;
  for (const w of list.filter((x) => /^[a-zäöü].*n$/.test(x) && !x.includes(" / "))) {
    const forms = [w, w.replace(/^sich /, "").replace(PREFIX, "")];
    if (forms.some((f) => IRREGULAR[f]?.test(first))) return w;
    const i = Math.max(...forms.map((f) => Math.max(same(f, first), same(skel(f), skel(first)))));
    if (i > n) [best, n] = [w, i];
  }
  return best;
}
// A pronoun tile in the nominative, when the sentence opens with another case (ich → Mir).
const CASES = { ich: ["mir", "mich"], du: ["dir", "dich"], er: ["ihm", "ihn"], wir: ["uns"], ihr: ["euch"] };
const cap = (w) => w.split(" / ").map((o) => o.charAt(0).toUpperCase() + o.slice(1)).join(" / ");

function tiles(list, inf = [], order, satz) {
  let top = opener(list, satz); // once, though a word may be on two tiles (ich … ich)
  return `<div class="pu-tiles">${order.map((w) => `<span class="pu-tile${inf.includes(w) ? " pu-tile--inf" : ""}">${esc(w === top ? ((top = null), cap(w)) : w)}</span>`).join("")}</div>`;
}
const lines = (n, cls = "pu-line") => Array.from({ length: n }, () => `<div class="${cls}"></div>`).join("");
const letter = (l) => `<span class="pu-nr">${esc(l)}</span>`;
const stepHead = (n, text) => `<h3 class="pu-step"><span class="pu-step-n">${n}</span><span>${fmt(text)}</span></h3>`;

function stmt(item) {
  return `<div class="pu-stmt">${item.icon ? iconSvg(item.icon) : ""}<span>${fmt(item.situation)}</span></div>`;
}

function stepAllein(spec, s) {
  return s.items.map((it) => `
    <div class="pu-item">${letter(it.buchstabe)}<div class="pu-item-body">${stmt(it)}${tiles(it.kacheln, it.infinitive ?? [], tileOrder(spec.id, it.buchstabe, it.kacheln, it.loesung))}</div></div>
    ${lines(it.zeilen ?? 2)}`).join("");
}

function stepZusammen(spec, s) {
  const by = itemsByLetter(spec);
  return s.fragenAn.map((l) => {
    const it = by.get(l).item;
    return `
    <div class="pu-item">${letter(l)}<div class="pu-item-body">${stmt(it)}${tiles(it.frageKacheln, it.frageInfinitive ?? [], tileOrder(spec.id, `${l}?`, it.frageKacheln, it.frage))}</div></div>
    <div class="pu-wline"><span class="pu-wl"></span>?</div>
    <div class="pu-wline">… <span class="pu-wl"></span>.</div>`;
  }).join("");
}

function stepTabelle(s) {
  return `<table class="pu-table"><thead><tr>${s.spalten.map((c) => `<th>${fmt(c)}</th>`).join("")}</tr></thead><tbody>${s.zeilen.map((r) => `<tr>${r.map((c) => (c == null ? '<td class="pu-gap"></td>' : `<td>${fmt(c)}</td>`)).join("")}</tr>`).join("")}</tbody></table>`;
}

function stepRolle(s) {
  return `<div class="pu-role">
    <p class="pu-role-name">Your role: <b>${fmt(s.rolle)}</b></p>
    <p><b>Your goal:</b> ${fmt(s.ziel)}</p>
    <p class="pu-label">What you know:</p><ul>${s.infos.map((i) => `<li>${fmt(i)}</li>`).join("")}</ul>
    <p class="pu-label">What you can say:</p><div class="pu-chips">${s.redemittel.map((r) => `<span>${fmt(r)}</span>`).join("")}</div>
    ${s.situationen ? `<p class="pu-label">Situations:</p><ol class="pu-sits">${s.situationen.map((x) => `<li>${fmt(x)}</li>`).join("")}</ol>` : ""}
  </div>`;
}

// A pair ticks yes or no; in a group the field takes the name of whoever said yes.
function stepRaster(spec, s) {
  const foot = spec.modus === "gruppe" ? '<span class="pu-cell-name">Name: <i></i></span>' : '<span class="pu-cell-name">☐ yes &nbsp; ☐ no</span>';
  return `<div class="pu-grid">${s.felder.map((f) => `<div class="pu-cell"><span>${fmt(f)}</span>${foot}</div>`).join("")}</div>`;
}

function stepBild(s) {
  return `<div class="pu-scene">${s.szene.map((o) => `<span class="pu-obj" style="left:${o.x}%;top:${o.y}%;--s:${o.groesse ?? 1}">${iconSvg(o.icon)}${o.text ? `<em>${esc(o.text)}</em>` : ""}</span>`).join("")}</div>`;
}

function stepWuerfel(s) {
  return `<table class="pu-table pu-dice"><tbody>${s.regel.map((r) => `<tr><th>${iconSvg("wuerfel", { cls: "pu-ic pu-ic--sm" })} ${esc(r.wurf)}</th><td>${fmt(r.form)}</td></tr>`).join("")}</tbody></table>
    <ol class="pu-fields">${s.felder.map((f) => `<li>${fmt(f)}</li>`).join("")}</ol>`;
}

const stepRegeln = (s) => `<ol class="pu-rules">${s.schritte.map((r) => `<li>${fmt(r)}</li>`).join("")}</ol>`;

function stepSchreiben(spec, s, k, si) {
  return `${s.vorgabe ? `<div class="pu-vorgabe">${fmt(s.vorgabe)}</div>` : ""}
    ${s.kacheln ? tiles(s.kacheln, s.infinitive ?? [], shuffle(s.kacheln, `${spec.id}:${k.rolle}:${si}`)) : ""}
    ${lines(s.zeilen)}`;
}

function stepInterview(spec, s, k, si) {
  return `<table class="pu-table pu-iv"><thead><tr><th>Question</th><th>${spec.modus === "gruppe" ? "Answer" : "Partner"}</th></tr></thead><tbody>${s.fragen.map((q, qi) => `<tr><td>${q.kacheln ? tiles(q.kacheln, q.infinitive ?? [], shuffle(q.kacheln, `${spec.id}:${k.rolle}:${si}:${qi}`)) + '<div class="pu-wline"><span class="pu-wl"></span>?</div>' : fmt(q.frage)}</td><td class="pu-gap"></td></tr>`).join("")}</tbody></table>
    ${s.bericht ? `<div class="pu-wline pu-report">${fmt(s.bericht)} <span class="pu-wl"></span></div><div class="pu-wline"><span class="pu-wl"></span></div>` : ""}`;
}

/* A Tandembogen's card (tandem.js): one row per task. The learner reads their own tasks aloud and
   answers the partner's on a line. No answers on the cards: they are on the Lösungsblatt. */
function stepTandem(spec, s, k) {
  if (s.qa) return stepTandemQa(spec, s, k);
  return `<ol class="pu-td">${s.zeilen.map(([task, sol]) => {
    const [, n, text] = String(task).match(/^(\d+)\.\s*(.*)$/) ?? [null, "", task];
    return sol == null
      ? `<li class="pu-td-row pu-td-row--ans"><span class="pu-td-n">${esc(n)}</span><span class="pu-td-task">${fmt(text)}</span><span class="pu-td-do">You answer</span><span class="pu-td-line"></span></li>`
      : `<li class="pu-td-row pu-td-row--read"><span class="pu-td-n">${esc(n)}</span><span class="pu-td-task">${fmt(text)}</span><span class="pu-td-do">You read aloud</span></li>`;
  }).join("")}</ol>`;
}

/* The question-and-answer form: the asker has the whole question and the answer; the answerer
   has the infinitive (blue) and the sentence parts in dictionary form, shuffled, and a line. */
// The worked pair runs across the cut: A asks, B answers on the same row (as in task 1). Each
// card shows only its own half — both halves on both cards repeated the same pair twice.
function stepTandemQa(spec, s, k) {
  const b = s.beispiel;
  const inf = b ? [b.infinitiv ?? ""] : [];
  const bspQ = b
    ? `<li class="pu-td-row pu-td-row--bsp"><span class="pu-td-n pu-td-n--bsp">Ex.</span><span class="pu-td-do">You ask: build the question</span><span class="pu-td-task">${tiles(b.kacheln, inf, b.kacheln, b.frage)}</span><span class="pu-td-line pu-td-line--filled">${fmt(b.frage)}</span></li>`
    : "";
  const bspA = b
    ? `<li class="pu-td-row pu-td-row--bsp"><span class="pu-td-n pu-td-n--bsp">Ex.</span><span class="pu-td-do">You answer: build the sentence</span><span class="pu-td-task">${tiles(b.antwortKacheln, inf, b.antwortKacheln, b.antwort)}</span><span class="pu-td-line pu-td-line--filled">${fmt(b.antwort)}</span></li>`
    : "";
  const bsp = k?.rolle === "B" ? bspA : bspQ;
  return `<ol class="pu-td pu-td--qa">${bsp}${s.qa.map((q) => q.ask
    ? (q.frageKacheln
      ? `<li class="pu-td-row pu-td-row--read pu-td-row--build"><span class="pu-td-n">${q.n}</span><span class="pu-td-do">You ask: build the question</span><span class="pu-td-task">${tiles(q.frageKacheln, [q.infinitiv], shuffle(q.frageKacheln, `${spec.id}:qa:${q.n}?`), q.frage)}</span><span class="pu-td-line pu-td-line--q"><span class="pu-td-wl"></span><b class="pu-td-end">?</b></span></li>`
      : `<li class="pu-td-row pu-td-row--read"><span class="pu-td-n">${q.n}</span><span class="pu-td-do">You ask</span><span class="pu-td-task pu-td-q">${fmt(q.frage)}</span></li>`)
    : `<li class="pu-td-row pu-td-row--ans"><span class="pu-td-n">${q.n}</span><span class="pu-td-do">You answer: build the sentence</span><span class="pu-td-task">${tiles(q.kacheln, [q.infinitiv], shuffle(q.kacheln, `${spec.id}:qa:${q.n}`), q.antwort)}</span><span class="pu-td-line"></span></li>`).join("")}</ol>`;
}

function step(spec, k, s, si, n) {
  if (spec.tandem && s.typ === "tabelle") return `<div class="pu-stepblock pu-stepblock--tandem">${stepHead(n, s.anweisung)}${stepTandem(spec, s, k)}</div>`;
  const body = {
    allein: () => stepAllein(spec, s),
    zusammen: () => stepZusammen(spec, s),
    tabelle: () => stepTabelle(s),
    rolle: () => stepRolle(s),
    raster: () => stepRaster(spec, s),
    bild: () => stepBild(s),
    wuerfel: () => stepWuerfel(s),
    regeln: () => stepRegeln(s),
    schreiben: () => stepSchreiben(spec, s, k, si),
    interview: () => stepInterview(spec, s, k, si),
  }[s.typ]();
  return `<div class="pu-stepblock pu-stepblock--${s.typ}">${stepHead(n, s.anweisung)}${body}</div>`;
}

function tipp(t) {
  return `<div class="pu-tipp"><b class="pu-tipp-h">💡 Tip</b>
    <div class="pu-formel">${fmt(t.formel)}</div>
    ${t.beispiel ? `<div class="pu-bsp">${fmt(t.beispiel)}</div>` : ""}
    ${t.hinweise?.length ? `<ul>${t.hinweise.map((h) => `<li>${fmt(h)}</li>`).join("")}</ul>` : ""}</div>`;
}

/* A card's steps print on up to two pages. What the learner does alone (order tiles, look at
   the picture, read the role) comes first; what follows it — the questions to the partner, the
   game rules, the gap table — goes on a second card page. A card that is all on one page and
   too tall for it would otherwise be pushed whole onto the next sheet, leaving a page that
   holds only the cut line. */
const FIRST = new Set(["allein", "bild"]);
const LATER = new Set(["zusammen", "regeln", "tabelle"]);
export const isLater = (k, s) => LATER.has(s.typ) && k.schritte.some((x) => FIRST.has(x.typ));
export const hasLater = (spec) => spec.karten.some((k) => k.schritte.some((s) => isLater(k, s)));

/** One card for one of the two card pages (`later` = the second). */
function card(spec, k, later) {
  const group = spec.modus === "gruppe";
  // Steps are numbered across both pages, so the second page goes on from the first.
  const parts = [];
  k.schritte.forEach((s, si) => {
    if (isLater(k, s) === later) parts.push(step(spec, k, s, si, si + 1));
  });
  if (!parts.length) return "";
  const last = later || !hasLater(spec);
  const extra = last && group ? `<p class="pu-rot">${fmt(spec.gruppe.rotation)}</p>` : "";
  const undSie = last && k.undSie ? `<div class="pu-undsie"><b>And you?</b> ${fmt(k.undSie)}</div>` : "";
  const fig = spec.tandem ? `<span class="pu-card-fig" data-mascot-part>${mascotSvg({ name: ROLE_MASCOT[k.rolle] ?? "quaki", expr: "happy", view: "three", size: 40, label: "" })}</span>` : "";
  // A Tandembogen's two cards share their rows (subgrid, partner-sheet.css), so task 1 on A
  // sits level with task 1 on B however tall either one is: header, Tipp, then per step its
  // heading and one row per task.
  const sub = spec.tandem && !extra && !undSie && k.schritte.every((s) => s.typ === "tabelle")
    ? ` pu-card--sub" style="--rows:${2 + k.schritte.reduce((n, s) => n + 1 + s.zeilen.length + (s.beispiel ? 2 : 0), 0)}`
    : "";
  return `<div class="pu-card pu-card--${esc(k.rolle)}${sub}"><div class="pu-card-h">${fig}${roleLabel(spec, k.rolle)}</div>${tipp(k.tipp)}${parts.join("")}${extra}${undSie}</div>`;
}

// Who stands for whom on a Tandembogen: Bruno is Partner A, Regi Partner B.
const ROLE_MASCOT = { A: "bruno", B: "regi" };

const CUT = '<div class="pu-cut">✂ - - - - - - - - - - cut here - - - - - - - - - - ✂</div>';

/** The card pages: a pair side by side; a group two cards per page (A|B, then C|D), so every
    printed page cuts into whole cards. Three persons share one page in three columns. */
function cardPages(spec, later) {
  const cards = spec.karten.map((k) => card(spec, k, later));
  const rows = spec.personen === 4 ? [cards.slice(0, 2), cards.slice(2)] : [cards];
  return rows.map((r) => `<section class="pu-page pu-page--cards">${CUT}<div class="pu-cards pu-cards--${r.length}">${r.join("")}</div></section>`).join("");
}

/** „Und Sie?“ alone fits under the intro; a page for three questions wastes paper. */
export const ownTogetherPage = (spec) => !!spec.gruppe || !!spec.zusammen?.wortkarten?.length || !!spec.zusammen?.regeln?.length;
export const freeTitle = (t) => {
  const own = String(t ?? "").replace(/^(Zusammen|Together):?\s*/, "");
  return own && !/^(Und Sie|And you)\??$/i.test(own) ? `${own} – And you?` : "And you? Ask and answer.";
};
const freeBox = (z) => (z?.freiFragen?.length ? `<div class="pu-box"><b class="pu-box-h">${esc(freeTitle(z.titel))}</b><ul>${z.freiFragen.map((q) => `<li>${fmt(q)}</li>`).join("")}</ul></div>` : "");

/* The round in three pictures, before the written steps: A reads, B answers, A checks. */
function tandemStrip(spec) {
  const first = spec.karten[0]?.schritte[0]?.zeilen?.[0] ?? ["", ""];
  const task = String(first[0]).replace(/^\d+\.\s*/, "");
  const panel = (name, expr, role, say, cap) => `<div class="pu-ts-step pu-ts-step--${role}">
      <span class="pu-ts-fig" data-mascot-part>${mascotSvg({ name, expr, view: "three", size: 64, label: "" })}</span>
      <p class="pu-ts-say" lang="en">${say}</p>
      <p class="pu-ts-cap">${cap}</p></div>`;
  return `<div class="pu-ts">
    ${panel("bruno", "happy", "A", `Number 1: ${esc(task)}`, "<b>A</b> reads out")}
    ${panel("regi", "thinking", "B", "I think: …", "<b>B</b> answers")}
    ${panel("regi", "happy", "B", "Number 2: …", "Then <b>B</b> reads out")}
    ${panel("bruno", "thinking", "A", "I think: …", "<b>A</b> answers")}
  </div>`;
}

/** The position/movement rule (keys wo / wohin) as two colour cards (a topic's sheet extras, src/data/arbeitsblatt). */
function woWohinBox(r) {
  const c = (k, x) => `<div class="pu-ww pu-ww--${k}"><p class="pu-ww-q"><b>${esc(x.frage)}</b> → ${esc(x.kasus)}</p><p class="pu-ww-was">${esc(x.was)}</p><p class="pu-ww-verbs">${x.verben.map((v) => `<span>${esc(v)}</span>`).join("")}</p><p class="pu-ww-ex">${x.beispiel}</p></div>`;
  return `<div class="pu-wwgrid">${c("wo", r.wo)}${c("wohin", r.wohin)}</div><p class="pu-ww-nine">${r.neun.map((p) => `<b>${esc(p)}</b>`).join("")}</p>`;
}

function intro(spec) {
  const g = spec.intro.grammatik;
  const mark = (i) => (g.markiere?.verb?.includes(i) ? " pu-pv" : g.markiere?.schluessel?.includes(i) ? " pu-pk" : "");
  const pos = `<table class="pu-pos">${g.kopf ? `<tr>${g.kopf.map((h, i) => `<th class="${mark(i)}">${esc(h)}</th>`).join("")}</tr>` : ""}${g.positionen.map((r) => `<tr>${r.map((c, i) => `<td class="${mark(i)}">${fmt(c)}</td>`).join("")}</tr>`).join("")}</table>`;
  const conj = g.tabelle ? `<table class="pu-pos pu-conj"><tr>${g.tabelle.kopf.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${g.tabelle.zeilen.map((r) => `<tr>${r.map((c) => `<td>${fmt(c)}</td>`).join("")}</tr>`).join("")}</table>` : "";
  const red = spec.intro.redemittel.map((r) => `<li>${["p1", "p2", "p3"].filter((p) => r[p]).map((p, i) => `<span><b class="pu-sym">${SYMBOLS[i]}</b> ${fmt(r[p])}</span>`).join("")}</li>`).join("");
  return `<section class="pu-page pu-page--intro">
    <div class="pu-name">Name: <span></span></div>
    ${topStrip(spec)}
    <p class="pu-eyebrow">${esc(FORMAT_NAMES[spec.format])} · ${spec.modus === "gruppe" ? `Group (${spec.personen})` : "Pair"} · about ${spec.dauerMin} min.</p>
    <h1 class="pu-title">${esc(spec.titel)}</h1>
    <p class="pu-sub">${fmt(spec.untertitel)}</p>
    ${spec.tandem ? tandemStrip(spec) : ""}
    <div class="pu-box pu-box--gram"><b class="pu-box-h">Grammar: ${esc(spec.grammatik.join(", "))}</b>${spec.woWohin ? woWohinBox(spec.woWohin) : `${pos}<p>${fmt(g.regel)}</p>`}${conj}</div>
    <div class="pu-box"><b class="pu-box-h">Useful phrases</b><ul class="pu-red">${red}</ul></div>
    <div class="pu-box"><b class="pu-box-h">How it works</b><ol>${spec.intro.soGehts.map((s) => `<li>${fmt(s)}</li>`).join("")}</ol></div>
    ${ownTogetherPage(spec) ? "" : freeBox(spec.zusammen)}
  </section>`;
}

function together(spec) {
  const z = spec.zusammen;
  const g = spec.gruppe;
  if (!ownTogetherPage(spec)) return "";
  const result = g ? `<div class="pu-box"><b class="pu-box-h">Group result</b>
    <table class="pu-table"><thead><tr><th>Person</th>${g.ergebnis.spalten.map((c) => `<th>${fmt(c)}</th>`).join("")}</tr></thead>
    <tbody>${spec.karten.map((k) => `<tr><td>${k.rolle}</td>${g.ergebnis.spalten.map(() => '<td class="pu-gap"></td>').join("")}</tr>`).join("")}</tbody></table>
    <div class="pu-wline pu-report">${fmt(g.ergebnis.bericht)} <span class="pu-wl"></span></div></div>` : "";
  const rules = z?.regeln?.length ? `<div class="pu-box"><b class="pu-box-h">Game rules</b><ol>${z.regeln.map((r) => `<li>${fmt(r)}</li>`).join("")}</ol></div>` : "";
  const cards = z?.wortkarten?.length ? `<p class="pu-label">Word cards ✂</p><div class="pu-wk">${shuffle(z.wortkarten, `${spec.id}:wk`).map((w) => `<div>${fmt(w)}</div>`).join("")}</div>` : "";
  const free = freeBox({ freiFragen: z?.freiFragen });
  return `<section class="pu-page pu-page--together"><h2 class="pu-h2">${esc(z?.titel ?? "Together")}</h2>${result}${rules}${cards}${free}</section>`;
}

function solutions(spec) {
  const withQ = spec.loesungen.some((l) => l.frage);
  return `<section class="pu-page pu-page--sol"><h2 class="pu-h2">Answers</h2>
    <table class="pu-table pu-sol"><thead><tr><th></th>${withQ ? "<th>Question</th>" : ""}<th>Answer</th></tr></thead><tbody>
    ${spec.loesungen.map((l) => `<tr><td class="pu-c">${esc(l.buchstabe ?? "")}</td>${withQ ? `<td>${fmt(l.frage ?? "")}</td>` : ""}<td>${fmt(l.antwort)}</td></tr>`).join("")}
    </tbody></table></section>`;
}

/* Round 2 of a Tandembogen with a picture: „Unterschiede finden". A and B each get a room
   (zimmerSzene.js, variants a and b) and describe it without showing it; five things differ. */
function bildTandem(spec) {
  const b = spec.bildTandem;
  if (!b) return "";
  const half = (r, variant) => `<div class="pu-card pu-card--${r} pu-bt-half">
      <div class="pu-card-h"><span class="pu-card-fig" data-mascot-part>${mascotSvg({ name: ROLE_MASCOT[r], expr: "happy", view: "three", size: 40, label: "" })}</span>Partner ${r} · Your picture</div>
      <div class="pu-bt-pic">${zimmerSvg({ variant, nums: false, label: `Partner ${r}'s room` })}</div>
      <p class="pu-bt-note">Don't show your picture! Differences: ${Array.from({ length: DIFFS.length }, () => '<span class="pu-bt-box"></span>').join("")}</p>
    </div>`;
  return `<section class="pu-page pu-page--bild">
    <h2 class="pu-h2"><span class="pu-step-n pu-step-n--big">2</span> ${esc(b.title)}</h2>
    <p class="pu-sub">${fmt(b.hint)}</p>
    <div class="pu-chips pu-bt-red">${b.redemittel.map((r) => `<span>${fmt(r)}</span>`).join("")}</div>
    ${half("A", "a")}${CUT}${half("B", "b")}
  </section>`;
}

const bildKey = (spec) => (spec.bildTandem
  ? `<h3 class="pu-h3">Spot the differences</h3><table class="pu-table pu-sol"><thead><tr><th>Partner A</th><th>Partner B</th></tr></thead><tbody>${DIFFS.map((d) => `<tr><td>${esc(d.a)}</td><td>${esc(d.b)}</td></tr>`).join("")}</tbody></table>`
  : "");

/* Round 3 of a Tandembogen with the kitchen (kuecheSzene.js): an information gap. A has the
   picture with arrows and knows where everything goes; B sees only the mess, asks by number
   (Wohin? Akkusativ) and writes the answers down; then A asks where things are now and B
   answers from those notes (Wo? Dativ). Each partner's half is a page of its own, so
   „Nur Partner A/B" prints just one. Third person throughout (Bruno), no imperative. */
function kuecheTandem(spec) {
  const k = spec.kuecheTandem;
  if (!k) return "";
  const head = (r, sub) => `<div class="pu-card-h"><span class="pu-card-fig" data-mascot-part>${mascotSvg({ name: ROLE_MASCOT[r], expr: "happy", view: "three", size: 40, label: "" })}</span>Partner ${r} · ${sub}</div>`;
  const top = `<h2 class="pu-h2"><span class="pu-step-n pu-step-n--big">3</span> ${esc(k.title)}</h2>
    <p class="pu-sub">${fmt(k.hint)}</p>
    <div class="pu-chips pu-bt-red">${k.redemittel.map((r) => `<span>${fmt(r)}</span>`).join("")}</div>`;
  const a = `<section class="pu-page pu-page--kueche pu-page--for-A">${top}
    <div class="pu-card pu-card--A pu-bt-half">${head("A", "Your picture with arrows")}
      <div class="pu-bt-pic">${kuecheSvg({ moves: true, label: "Partner A's kitchen: arrows show where Bruno puts things." })}</div>
      <ol class="pu-kt-steps">
        <li><b>${fmt(k.teil1)}</b> Follow the arrow with that number and answer with “He …”.</li>
        <li><b>${fmt(k.teil2)}</b> Ask: “Where is … now?” Check with your picture.</li>
      </ol>
    </div>
  </section>`;
  // B builds the question from ["where", verb, "Bruno", thing]; B adds does (Where does Bruno put the pot?).
  const rows = k.items.map((it) => { const t = ["where", it.verb, "Bruno", it.ding]; return `<li class="pu-td-row pu-td-row--ans"><span class="pu-td-n">${it.n}</span><span class="pu-td-task">${tiles(t, [it.verb], shuffle(t, `${spec.id}:kt:${it.n}`), it.frage)}</span><span class="pu-td-line"></span></li>`; }).join("");
  const b = `<section class="pu-page pu-page--kueche pu-page--for-B">${top}
    <div class="pu-card pu-card--B pu-bt-half">${head("B", "Your picture without arrows")}
      <div class="pu-bt-pic">${kuecheSvg({ moves: false, label: "Partner B's kitchen: nine things lie around, no arrows." })}</div>
      <p class="pu-kt-teil"><b>${fmt(k.teil1)}</b> Build the question from the tiles (add does). Write down A's answer.</p>
      <ol class="pu-td pu-td--qa">${rows}</ol>
      <p class="pu-kt-teil"><b>${fmt(k.teil2)}</b> Answer from your notes: “He puts the pot on the hob” becomes “The pot is on the hob”.</p>
    </div>
  </section>`;
  return a + b;
}

const kuecheKey = (spec) => (spec.kuecheTandem
  ? `<h3 class="pu-h3">${esc(spec.kuecheTandem.title)}</h3><table class="pu-table pu-sol"><thead><tr><th></th><th>Part 1: Where to?</th><th>Part 2: Where?</th></tr></thead><tbody>${spec.kuecheTandem.items.map((it) => `<tr><td class="pu-c">${it.n}</td><td>${esc(it.frage)} ${esc(it.wohin)}</td><td>${esc(it.woFrage)} ${esc(it.wo)}</td></tr>`).join("")}</tbody></table>`
  : "");

/** Every page but the answers: intro, cards, together. One <section> per printed page. */
export const renderBody = (spec) => `${intro(spec)}${cardPages(spec, false)}${hasLater(spec) ? cardPages(spec, true) : ""}${bildTandem(spec)}${kuecheTandem(spec)}${together(spec)}`;
/** The answer page alone: the library page prints it as the sheet's answer key (.ab-key). */
export const renderKey = (spec) => solutions(spec).replace(/<\/section>$/, `${bildKey(spec)}${kuecheKey(spec)}</section>`);

/** The whole sheet as one <article>, answers last. */
export function renderSheet(spec) {
  return `<article class="pu-sheet" lang="en">${renderBody(spec)}${renderKey(spec)}</article>`;
}
