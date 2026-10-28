// The Führerschein section's one door to its facts.
//
// Every figure that can change — km/h, ‰, €, Punkte, the number of questions, the reform —
// lives in src/data/fuehrerschein/fakten.research.json with a source and a Stand, and only
// there (FUEHRERSCHEIN-TIERED-PROMPT.md, rule 2). Page copy, lessons and questions cite it as
// `{{fakt:<bereich>.<key>}}` and this module fills the value in at build time. A key that is
// missing, or whose entry is not `status: "ok"`, throws: the build stops rather than print an
// unchecked number. scripts/check-fuehrerschein.mjs runs the same resolver over every data file
// in prebuild, so the error shows up before Astro starts.
//
// Forms of the placeholder:
//   {{fakt:regeln.tempoInnerorts}}                 → "50 km/h"     (value + unit)
//   {{fakt:regeln.tempoInnerorts|zahl}}            → "50"          (value only)
//   {{fakt:regeln.promille05Sanktion.bussgeld}}    → "500"         (a field of an object value)
//   {{fakt:kosten.gesamtkosten}}                   → "2.500–4.500 €" (a {min,max} range)
//
// Plain JS with import attributes, like lexicon.js, so node scripts can load it too.
import research from "../data/fuehrerschein/fakten.research.json" with { type: "json" };

export const RESEARCH = research;

const UNIT = { EUR: "€", Promille: "‰", "km/h": "km/h", m: "m", mm: "mm", Jahre: "Jahre", Monate: "Monate", Tage: "Tage", Minuten: "Minuten", Wochen: "Wochen", Fragen: "Fragen", Punkte: "Punkte", Fehlerpunkte: "Fehlerpunkte", Doppelstunden: "Doppelstunden" };

/** German number format: 0.5 → "0,5", 2500 → "2.500", 24.99 → "24,99". */
export function zahl(n) {
  if (typeof n !== "number") return String(n);
  const dec = Number.isInteger(n) ? 0 : (String(n).split(".")[1]?.length ?? 0);
  return n.toLocaleString("de-DE", { minimumFractionDigits: Math.min(dec, 2), maximumFractionDigits: 2 });
}

/** The unit as a page prints it: only the first word of „Fahrstunden à 45 Minuten" etc. is
 *  shown when it is a known short unit; anything longer prints as written. */
function unitOf(entry) {
  const u = entry.unit;
  if (!u) return "";
  if (UNIT[u]) return UNIT[u];
  const first = u.split(" ")[0];
  return UNIT[first] && /^(EUR|Promille)$/.test(first) ? UNIT[first] : u;
}

/** The raw entry for "bereich.key" (or "bilder.zeichen.205"), or null. */
export function faktEntry(path) {
  const parts = path.split(".");
  let node = research;
  for (let i = 0; i < parts.length; i++) {
    if (node == null) return null;
    // Keys may themselves contain dots ("zeichen.325.1"): try the longest match first.
    let hit = null;
    for (let j = parts.length; j > i; j--) {
      const k = parts.slice(i, j).join(".");
      if (node[k] !== undefined) { hit = { k, j }; break; }
    }
    if (!hit) return null;
    node = node[hit.k];
    if (node && typeof node === "object" && "status" in node && "value" in node) {
      return { entry: node, rest: parts.slice(hit.j) };
    }
    i = hit.j - 1;
  }
  return null;
}

/** Throws unless `path` names an `ok` entry. Returns { entry, value } with sub-paths applied. */
export function fakt(path) {
  const found = faktEntry(path);
  if (!found) throw new Error(`fakt: unbekannter Schlüssel „${path}“ (fakten.research.json)`);
  const { entry, rest } = found;
  if (entry.status !== "ok") throw new Error(`fakt: „${path}“ ist ${entry.status} — darf nicht auf eine Seite`);
  let value = entry.value;
  for (const r of rest) {
    if (value == null || typeof value !== "object" || !(r in value)) throw new Error(`fakt: „${path}“ — Feld „${r}“ fehlt`);
    value = value[r];
  }
  return { entry, value, sub: rest.length > 0 };
}

/** The printed form of one fact. */
export function faktText(path, form = "") {
  const { entry, value, sub } = fakt(path);
  const unit = sub ? "" : unitOf(entry);
  let out;
  if (value && typeof value === "object" && !Array.isArray(value) && ("min" in value || "max" in value)) {
    const { min, max } = value;
    out = min != null && max != null && min !== max ? `${zahl(min)}–${zahl(max)}` : zahl(min ?? max);
    if (min == null && max != null) out = `bis ${zahl(max)}`;
    if (max == null && min != null) out = `ab ${zahl(min)}`;
  } else if (typeof value === "number") {
    out = zahl(value);
  } else if (typeof value === "string") {
    out = value;
  } else {
    throw new Error(`fakt: „${path}“ hat keinen druckbaren Wert — ein Feld angeben (z. B. ${path}.bussgeld)`);
  }
  if (form === "zahl" || !unit) return out;
  return `${out} ${unit}`;
}

const RE = /\{\{fakt:([^}|]+)(?:\|(\w+))?\}\}/g;

/** Every `{{fakt:…}}` in `text` filled in. */
export function fillFakten(text) {
  if (typeof text !== "string") return text;
  return text.replace(RE, (_, path, form) => faktText(path.trim(), form ?? ""));
}

/** The keys a text cites, for source lists and the check script. */
export function citedKeys(text) {
  if (typeof text !== "string") return [];
  return [...text.matchAll(RE)].map((m) => m[1].trim());
}

/** Deep copy of any JSON value with every string filled in. */
export function fillDeep(v) {
  if (typeof v === "string") return fillFakten(v);
  if (Array.isArray(v)) return v.map(fillDeep);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillDeep(x)]));
  return v;
}

/** Every key cited anywhere inside a JSON value. */
export function citedDeep(v, out = new Set()) {
  if (typeof v === "string") citedKeys(v).forEach((k) => out.add(k));
  else if (Array.isArray(v)) v.forEach((x) => citedDeep(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => citedDeep(x, out));
  return out;
}

/** The source rows for a set of cited keys, deduplicated by URL, research order kept. */
export function sourcesFor(keys) {
  const seen = new Map();
  for (const k of keys) {
    const { entry } = fakt(k);
    const s = entry.source;
    if (!s?.url) continue;
    if (!seen.has(s.url)) seen.set(s.url, { label: s.label, href: s.url, stand: entry.stand });
  }
  return [...seen.values()];
}

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
/** „2026-10-01" → „Oktober 2026" — the „Stand:" every page shows. */
export function standMonat(iso = research.stand) {
  const [y, m] = String(iso).split("-");
  return `${MONATE[Number(m) - 1]} ${y}`;
}

/** „2027-07-01" → „1. Juli 2027". */
export function datum(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return `${d}. ${MONATE[m - 1]} ${y}`;
}

/** A Verkehrszeichen's picture and its licence row; throws for a sign without an `ok` entry. */
export function zeichen(key) {
  const z = research.bilder.zeichen[key];
  if (!z || z.status !== "ok" || key.includes("+")) throw new Error(`zeichen: „${key}“ hat keinen geprüften Lizenz-Eintrag`);
  return { key, name: z.name, src: `/img/verkehrszeichen/${key}.svg`, page: z.page, licence: z.licence, author: z.author ?? null };
}

// ---------------------------------------------------------------------------
// Questions, prepared for the browser (fahrQuiz.js)
// ---------------------------------------------------------------------------
import { szeneFigureHtml } from "./fahrSzene.js";
import szenen from "../data/fuehrerschein/szenen.json" with { type: "json" };

/** A scene with every {{fakt:…}} filled in — what pages render and embed. */
export function szene(id) {
  const s = szenen.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`Szene „${id}“ gibt es nicht (szenen.json)`);
  return fillDeep(s);
}

/** {{fakt}} filled, braces of marked terms dropped — text for places that show no chips. */
export const plain = (s) => fillFakten(String(s ?? "")).replace(/\{([^{}]+)\}/g, "$1");

/**
 * One question of fragen.json in the shape fahrQuiz.js reads. `lessons` maps topic id →
 * { title, href } so feedback can link back to the lesson.
 */
export function prepareQuestion(q, lessons = {}, { inlineScene = true } = {}) {
  const out = {
    id: q.id,
    topic: q.topic,
    topicTitle: lessons[q.topic]?.title ?? null,
    lessonHref: lessons[q.topic]?.href ?? null,
    stoff: q.stoff,
    type: q.type,
    points: q.points,
    prompt: fillFakten(q.prompt),
    explain: q.explain ? fillFakten(q.explain) : "",
    explainEasy: q.explainEasy ? fillFakten(q.explainEasy) : "",
  };
  if (q.type === "zahl") {
    out.answer = fillFakten(String(q.answer));
    out.unit = q.unit ?? "";
  } else if (q.type === "bild") {
    out.options = q.options.map((k) => { const z = zeichen(k); return { src: z.src, name: z.name }; });
    out.answer = q.answer;
  } else {
    out.options = q.options.map((o) => ({ text: fillFakten(o) }));
    out.answer = q.answer;
  }
  if (q.sign) { const z = zeichen(q.sign); out.sign = { src: z.src, name: z.name }; }
  if (q.scene) {
    out.scene = q.scene;
    if (inlineScene) Object.assign(out, sceneHtml(q.scene));
  }
  return out;
}

/** A scene as the two pictures a question shows: before the answer and after it. */
export function sceneHtml(id) {
  const s = szene(id);
  return { sceneBare: szeneFigureHtml(s, { bare: true }), sceneFull: szeneFigureHtml(s, { compact: true }) };
}

/** The pass rule of the real test, read from the research file. */
export function passRules() {
  return {
    maxFehlerpunkte: fakt("theorie.maxFehlerpunkteBestehen").value,
    zweiFuenfer: true,
    anzahl: fakt("theorie.anzahlFragenErsterwerbB").value,
    grund: fakt("theorie.aufteilungGrundstoffZusatzstoff.grundstoff").value,
    zusatz: fakt("theorie.aufteilungGrundstoffZusatzstoff.zusatzstoffB").value,
  };
}
