// Live üben: the class does a topic page's own exercises on their phones while the teacher
// watches the progress on the projector (lehrkraft.js) – opened from the „Live üben“ button,
// which a topic page shows in teaching mode (?ut=1, or while a lesson runs).
//
// Like the live quiz it is a Supabase Realtime channel and nothing else: no table, no
// account, nothing stored on a server. The phones (schueler.js) send their own summary,
// whole, after every answer and whenever the teacher's tab says "hallo" – so a reloaded
// teacher tab has the full board back within a second, and a lost broadcast costs nothing.
//
// Self-reported, like everything scored in the browser: it shows who is where and roughly
// how it goes, and proves nothing.
//
// Pure helpers here (tests/unterricht/liveUebung.test.mjs); the wiring is in the two views.
import { slotsOf } from "../grammarTasks.js";

export const channelName = (pin) => `lu:${pin}`;
export const PIN_RE = /^[1-9][0-9]{5}$/;

/** Six digits, never starting with 0 (read aloud in class, a leading zero gets dropped). */
export function makePin() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** A name as the board shows it: trimmed, single-spaced, at most 24 characters. */
export function cleanName(raw) {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 24);
}

/** Gradeable answers in one exercise; slotsOf() leaves out the two newer renderers. */
export function totalOf(ex) {
  const n = slotsOf(ex);
  if (n) return n;
  if (ex?.type === "mcgap") return ex.items?.length ?? 0;
  if (ex?.type === "wordbank") return (ex.segments ?? []).filter((s) => s.blank !== undefined).length;
  return 0;
}

/**
 * One phone's answers → what it sends: per exercise [right, answered].
 * answers: { "<ex>/<item>": true|false }, the last result of each item.
 */
export function summarize(answers) {
  const ex = {};
  for (const [key, ok] of Object.entries(answers)) {
    const i = key.split("/")[0];
    const s = (ex[i] ??= [0, 0]);
    s[1] += 1;
    if (ok) s[0] += 1;
  }
  return ex;
}

/**
 * The exercises the teacher gave the class (sent in "hallo" and the host's presence):
 * sorted, unique indices below `n`, or null for all of them – also for anything malformed
 * or empty, so a phone never ends up with nothing to do.
 */
export function pickOf(raw, n) {
  if (!Array.isArray(raw)) return null;
  const pick = [...new Set(raw.filter((i) => Number.isInteger(i) && i >= 0 && i < n))].sort((a, b) => a - b);
  return pick.length && pick.length < n ? pick : null;
}

/**
 * A row of the board from a phone's summary and the exercises' totals; with `pick`, only
 * those exercises (one cell each, in that order) count.
 */
export function rowOf(summary, totals, pick = null) {
  let right = 0;
  let answered = 0;
  const cells = (pick ?? totals.map((_, i) => i)).map((i) => {
    const total = totals[i] ?? 0;
    const [r, a] = summary?.[i] ?? [0, 0];
    const done = Math.min(a, total);
    right += Math.min(r, done);
    answered += done;
    return { right: Math.min(r, done), answered: done, total };
  });
  const total = cells.reduce((n, c) => n + c.total, 0);
  return { cells, right, answered, total };
}

/** Right share of what was answered → the cell's colour band. */
export function band(right, answered) {
  if (!answered) return "leer";
  const q = right / answered;
  return q >= 0.8 ? "gut" : q >= 0.5 ? "mittel" : "schwach";
}

// ── Auswertung (when the teacher ends the round) ─────────────────────────────────────
// Besides the counts, each phone sends the items it currently has wrong ("f"): what it typed,
// what was expected, the prompt – for the typed exercises; a choice exercise sends the key
// only. Capped, because the whole summary goes out after every answer.
const F_MAX = 60;
const F_LEN = 60;
const clip = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, F_LEN) : "");

/** A phone's wrong items for the payload: { "<ex>/<item>": { g, e, p } }, capped. */
export function wrongOf(wrong) {
  const out = {};
  for (const [k, v] of Object.entries(wrong ?? {}).slice(-F_MAX)) {
    out[k] = { g: clip(v?.g), e: clip(v?.e), p: clip(v?.p) };
  }
  return out;
}

/** The same, read back on the teacher's side from an untrusted payload. */
export function readWrong(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(raw).slice(0, F_MAX)) {
    if (/^\d{1,3}\/[\w.-]{1,40}$/.test(k)) out[k] = { g: clip(v?.g), e: clip(v?.e), p: clip(v?.p) };
  }
  return out;
}

/**
 * The end-of-round evaluation from the phones on this page.
 * phones: [{ name, ex: summary, f: wrong items }]; totals: answers per exercise;
 * pick: the exercises the class had (null = all); titles: the exercises' titles.
 */
export function auswertung(phones, totals, pick = null, titles = []) {
  const shown = (pick ?? totals.map((_, i) => i)).filter((i) => totals[i] > 0);
  const students = phones.map((p) => {
    const r = rowOf(p.ex, totals, shown);
    return { name: p.name, right: r.right, answered: r.answered, total: r.total };
  }).sort((a, b) => (a.answered ? a.right / a.answered : 2) - (b.answered ? b.right / b.answered : 2) || a.name.localeCompare(b.name, "de"));
  const exercises = shown.map((i) => {
    let right = 0, answered = 0;
    for (const p of phones) {
      const [r, a] = p.ex?.[i] ?? [0, 0];
      const done = Math.min(a, totals[i]);
      answered += done;
      right += Math.min(r, done);
    }
    return { index: i, title: titles[i] ?? `Exercise ${i + 1}`, right, answered, possible: totals[i] * phones.length };
  });
  const byItem = new Map();
  for (const p of phones) {
    for (const [k, v] of Object.entries(p.f ?? {})) {
      const ex = Number(k.split("/")[0]);
      if (!shown.includes(ex)) continue;
      const m = byItem.get(k) ?? { key: k, ex, item: k.slice(k.indexOf("/") + 1), n: 0, prompt: "", expected: "", given: new Map(), names: [] };
      m.n += 1;
      m.names.push(p.name);
      m.prompt ||= v.p;
      m.expected ||= v.e;
      // A typed exercise left blank still shows as such; a choice exercise sends nothing.
      const g = v.g || (v.e ? "(leer)" : "");
      if (g) m.given.set(g, (m.given.get(g) ?? 0) + 1);
      byItem.set(k, m);
    }
  }
  const mistakes = [...byItem.values()]
    .sort((a, b) => b.n - a.n || a.ex - b.ex)
    .map((m) => ({ ...m, given: [...m.given.entries()].sort((a, b) => b[1] - a[1]) }));
  const right = students.reduce((n, s) => n + s.right, 0);
  const answered = students.reduce((n, s) => n + s.answered, 0);
  const possible = students.reduce((n, s) => n + s.total, 0);
  return { count: phones.length, right, answered, possible, students, exercises, mistakes };
}
