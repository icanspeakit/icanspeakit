// The learner's Stunde (/stunde): the same Stunde as the teacher's (build() from the five
// plan keys), walked alone, step by step, across as many days as it takes. Pure parts here
// (tests/unterricht/lernen.test.mjs); the page is lernseite.js, the bar leiste.js in its
// learner mode, the wiring lernstunde.js.
//
// The clock is timer.js unchanged (a soft guide per step, never red). Beside it, in the
// session's `extra`, what the clock does not know:
//   status: { [step]: "fertig" | "uebersprungen" }   no entry = offen
//   seen:   { [step]: { [what]: true|false } }        the step's events so far (see record)
//   texte:  { [step]: string }                         what the learner typed in the step
//   goals:  { [step]: goal }                           what finishes the step (goalOf)
// Goals travel with the session, so the bar on a topic page can tell a step is finished
// without the plan data that only /stunde has.
import { newer } from "./timer.js";

export const LERN_KEY = "da:lernstunde";
/** Other Stunden started on this device, by plan key, to come back to (Tier 4: /fortschritt). */
export const ARCHIV_KEY = "da:lernstunden";
/** A self-learner has no teacher's plan: a block is 3 Stunden of 90 minutes. */
export const DEFAULT = { stunden: 3, minuten: 90 };

export const keyText = (k) => `${k.niveau}/${k.block}/${k.stunden}/${k.stunde}/${k.minuten}`;
export const stundeHref = (k, extra = "") =>
  `/stunde?niveau=${k.niveau}&block=${k.block}&stunden=${k.stunden}&stunde=${k.stunde}&min=${k.minuten}${extra}`;

/** The plan key from /stunde's URL; `stunden` and `min` default (DEFAULT). Null if unusable. */
export function lernKeyFromParams(q) {
  const k = {
    niveau: q.get("niveau") ?? "",
    block: Number(q.get("block")),
    stunden: Number(q.get("stunden") || DEFAULT.stunden),
    stunde: Number(q.get("stunde") || 1),
    minuten: Number(q.get("min") || DEFAULT.minuten),
  };
  const ok = /^[abc][12](-[12])?$/.test(k.niveau) && k.block >= 1 && k.stunden >= 1 && k.stunden <= 8
    && k.stunde >= 1 && k.stunde <= k.stunden && k.minuten >= 30 && k.minuten <= 240;
  return ok ? k : null;
}

/* --------------------------------------------------------------- goals ---- */

/** Answers that make a Kurztest (the block's topics as a self-test). */
export const TEST_ANSWERS = 10;
/** Üben asks for every task of its pages, but at most this many per planned minute. */
export const TASKS_PER_MIN = 2;

/**
 * What finishes a step, from its phase and the plan's data:
 *   { kind: "fertig" }                           the learner says so („Fertig“)
 *   { kind: "karten" }                           one finished round of word cards
 *   { kind: "decks", topics: [href] }            every presentation seen to its end (or its rule)
 *   { kind: "aufgaben", topics: { href: n } }    every task of these topic pages answered once
 *   { kind: "anzahl", n, topics: [href] }        n answers on these pages (Kurztest)
 *   { kind: "set" }                              an exam part to its result
 * ctx: { topics: [href] the step's topic pages, totals: { href: tasks }, blockTopics: [href],
 *        words: bool (the level has a Wortliste), exams: bool (the step has exam parts),
 *        minutes: the step's planned minutes (caps Üben) }
 * A goal that has nothing to count falls back to „Fertig“.
 */
export function goalOf(phaseId, ctx) {
  const topics = ctx.topics ?? [];
  if (phaseId === "wortschatz" && ctx.words) return { kind: "karten" };
  if (phaseId === "grammatik" && topics.length) return { kind: "decks", topics };
  if (phaseId === "uebung") {
    const have = topics.filter((h) => ctx.totals?.[h] > 0);
    // All tasks of the pages, but no more than fit the step: TASKS_PER_MIN per planned
    // minute, shared by the pages in proportion (two pages of 83 tasks in 20 minutes → 40).
    const sum = have.reduce((n, h) => n + ctx.totals[h], 0);
    const cap = ctx.minutes ? Math.max(have.length, ctx.minutes * TASKS_PER_MIN) : sum;
    const t = Object.fromEntries(have.map((h) => [h, Math.max(1, Math.min(ctx.totals[h], Math.round((cap * ctx.totals[h]) / sum)))]));
    if (have.length) return { kind: "aufgaben", topics: t };
  }
  if (phaseId === "test" && ctx.blockTopics?.length) return { kind: "anzahl", n: TEST_ANSWERS, topics: ctx.blockTopics };
  if (phaseId === "pruefung" && ctx.exams) return { kind: "set" };
  return { kind: "fertig" };
}

/**
 * How far a step is: { have, need, right, answered, done }. `seen` is the step's events:
 * "a:<href>|<ex>/<item>" → ok, "k" (a card round), "d:<href>" (a deck), "s" (an exam part).
 */
export function progressOf(goal, seen = {}) {
  const keys = Object.keys(seen);
  const answers = keys.filter((k) => k.startsWith("a:"));
  const right = answers.filter((k) => seen[k] === true).length;
  const base = { right, answered: answers.length };
  if (goal.kind === "karten") return { ...base, have: seen.k ? 1 : 0, need: 1, done: !!seen.k };
  if (goal.kind === "set") return { ...base, have: seen.s ? 1 : 0, need: 1, done: !!seen.s };
  if (goal.kind === "decks") {
    const have = goal.topics.filter((h) => seen[`d:${h}`]).length;
    return { ...base, have, need: goal.topics.length, done: have >= goal.topics.length };
  }
  if (goal.kind === "aufgaben") {
    const need = Object.values(goal.topics).reduce((n, x) => n + x, 0);
    const have = Object.entries(goal.topics).reduce((n, [h, max]) =>
      n + Math.min(max, answers.filter((k) => k.startsWith(`a:${h}|`)).length), 0);
    return { ...base, have, need, done: have >= need };
  }
  if (goal.kind === "anzahl") {
    const have = answers.filter((k) => goal.topics.some((h) => k.startsWith(`a:${h}|`))).length;
    return { ...base, have: Math.min(have, goal.n), need: goal.n, done: have >= goal.n };
  }
  return { ...base, have: 0, need: 1, done: false };
}

/* --------------------------------------------------------------- status ---- */

const RANK = { offen: 0, uebersprungen: 1, fertig: 2 };
export const statusOf = (extra, i) => extra?.status?.[i] ?? "offen";
const stronger = (a = "offen", b = "offen") => (RANK[b] > RANK[a] ? b : a);

export const emptyExtra = (goals = {}) => ({ status: {}, seen: {}, texte: {}, goals });

/** „Fertig“ by hand. */
export const finish = (extra, i) => ({ ...extra, status: { ...extra.status, [i]: "fertig" } });
/** „Überspringen“: shows as skipped, never as done; a later „fertig“ still wins. */
export const skip = (extra, i) => statusOf(extra, i) === "fertig" ? extra : ({ ...extra, status: { ...extra.status, [i]: "uebersprungen" } });
export const setText = (extra, i, text) => ({ ...extra, texte: { ...extra.texte, [i]: String(text).slice(0, 2000) } });

/**
 * An event from a page while step i runs → the new extra (the same object if nothing
 * changed). ev: { type: "answer", topic: "/dativ", key: "0/3", ok } | { type: "karten" }
 *            | { type: "deck", topic: "/dativ" } | { type: "set" }
 * Only events that count for the step's goal are kept; the step turns „fertig“ once the
 * goal is reached, and never back.
 */
export function record(extra, i, ev) {
  const goal = extra.goals?.[i];
  if (!goal || goal.kind === "fertig") return extra;
  let k = null;
  let v = true;
  if (ev.type === "answer" && (goal.kind === "aufgaben" ? ev.topic in goal.topics : goal.kind === "anzahl" && goal.topics.includes(ev.topic))) {
    k = `a:${ev.topic}|${ev.key}`;
    v = !!ev.ok;
  } else if (ev.type === "karten" && goal.kind === "karten") k = "k";
  else if (ev.type === "deck" && goal.kind === "decks" && goal.topics.includes(ev.topic)) k = `d:${ev.topic}`;
  else if (ev.type === "set" && goal.kind === "set") k = "s";
  if (!k) return extra;
  const before = extra.seen?.[i] ?? {};
  if (before[k] === v) return extra;
  const seen = { ...before, [k]: v };
  const done = progressOf(goal, seen).done;
  return {
    ...extra,
    seen: { ...extra.seen, [i]: seen },
    status: done ? { ...extra.status, [i]: stronger(statusOf(extra, i), "fertig") } : extra.status,
  };
}

/**
 * Two copies of a learner's extra (two tabs; later: device and server) → one. Per step the
 * stronger status wins (fertig > übersprungen > offen); events are joined, the later copy's
 * result per answer wins; texts and goals come from `b` where it has them.
 */
export function mergeExtra(a, b) {
  if (!a) return b;
  if (!b) return a;
  const status = { ...a.status };
  for (const [i, s] of Object.entries(b.status ?? {})) status[i] = stronger(status[i], s);
  const seen = { ...a.seen };
  for (const [i, s] of Object.entries(b.seen ?? {})) seen[i] = { ...seen[i], ...s };
  return { status, seen, texte: { ...a.texte, ...b.texte }, goals: { ...a.goals, ...b.goals } };
}

/** The step a returning learner should see: the first one neither done nor skipped. */
export function firstOpen(extra, count) {
  for (let i = 0; i < count; i++) if (statusOf(extra, i) === "offen") return i;
  return count - 1;
}

/** "ca. 10 Min." – the learner's clock never says more than that. */
export const about = (minutes) => `about ${Math.max(5, Math.round(minutes / 5) * 5)} min`;

/* ---------------------------------------------------------------- texts ---- */

/**
 * Shown when a phase's template has no reviewed learner text yet (production) – short and
 * neutral on purpose, so nothing unreviewed reaches a learner.
 */
export const FALLBACK = {
  einstieg: "Look at what today's lesson is about. Then move on.",
  wortschatz: "Learn the words with the flashcards.",
  grammatik: "Watch the presentation to the end.",
  uebung: "Do the exercises. Check every answer.",
  anwendung: "Use what you have learned: write a few sentences.",
  pruefung: "Do the exam part through to the result.",
  test: "Test yourself with 10 questions.",
  abschluss: "Look back: what can you do now?",
};

const andList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const q = (s) => `“${s}”`;

/**
 * The learner's text for a phase: { text, bruno, entwurf }. `texte` is
 * src/data/lernstunde-texte.json as the page embeds it (production: reviewed ones only).
 * ctx: { thema, grammatik: [name], woerter: [word], ziele: [goal], vorher, pruefung: [part] }
 */
export function lernText(phase, ctx, texte = {}) {
  const t = texte[phase.variant];
  if (!t?.text) return { text: FALLBACK[phase.id] ?? "", bruno: "", entwurf: false };
  const fill = {
    thema: ctx.thema ?? "",
    grammatik: andList((ctx.grammatik ?? []).map(q)),
    grammatik3: andList((ctx.grammatik ?? []).slice(0, 3).map(q)),
    woerter: (ctx.woerter ?? []).join(", "),
    woerter3: (ctx.woerter ?? []).slice(0, 3).join(", "),
    ziele: (ctx.ziele ?? []).map(q).join(" "),
    vorher: ctx.vorher ?? "",
    pruefung: (ctx.pruefung ?? []).join(" · "),
  };
  const text = t.text.replace(/\{(\w+)\}/g, (m, k) => (k in fill ? fill[k] : m)).replace(/\s+/g, " ").trim();
  return { text, bruno: t.bruno ?? "", entwurf: !t.geprueft };
}

/* ---------------------------------------------------------- server (Tier 2) ---- */
// The same Stunde on the device (a snapshot: { id, key, row, extra }) and on the server
// (a row of public.lernstunden, supabase/migrations/20261027120000_lernstunden.sql).
// What the learner typed (extra.texte) never leaves the device; "parked" („Später weiter“)
// is the device's own state too.

const ROW_COLS = ["current_step", "step_ms", "running_since", "last_active_at", "status", "completed_at"];

/** A snapshot → the columns of public.lernstunden. `klasseId`: the class it is for, or null. */
export function toServer(snap, klasseId = null) {
  const x = snap.extra ?? {};
  const row = Object.fromEntries(ROW_COLS.filter((c) => snap.row?.[c] !== undefined).map((c) => [c, snap.row[c]]));
  return {
    id: snap.id,
    niveau: snap.key.niveau, block: snap.key.block, stunden: snap.key.stunden, stunde: snap.key.stunde, minuten: snap.key.minuten,
    ...(klasseId ? { klasse_id: klasseId } : {}),
    ...row,
    step_status: x.status ?? {},
    // The steps' names travel along, so the teacher's table (Tier 3) needs no plan data.
    fortschritt: { seen: x.seen ?? {}, goals: x.goals ?? {}, ...(snap.steps?.length ? { steps: snap.steps.map((st) => ({ id: st.id, name: st.name })) } : {}) },
  };
}

/** A row of public.lernstunden → { id, key, klasse, row, extra } (no texts: they stay on the device). */
export function fromServer(r) {
  return {
    id: r.id,
    key: { niveau: r.niveau, block: Number(r.block), stunden: Number(r.stunden), stunde: Number(r.stunde), minuten: Number(r.minuten) },
    klasse: r.klasse_id ?? null,
    row: Object.fromEntries(ROW_COLS.map((c) => [c, r[c] ?? null])),
    extra: { status: r.step_status ?? {}, seen: r.fortschritt?.seen ?? {}, texte: {}, goals: r.fortschritt?.goals ?? {} },
  };
}

const later = (a, b) => ((Date.parse(a ?? "") || 0) >= (Date.parse(b ?? "") || 0) ? a : b);

/**
 * The device's copy and the server's of one Stunde → one snapshot. The furthest step wins,
 * a "fertig" is never lost (mergeExtra), each step keeps the longer time, and a completed
 * copy makes the Stunde completed. The clock's running state comes from the newer copy
 * (timer.js newer). The server's id names the result, so both point at one row; texts and
 * "parked" are the device's.
 */
export function mergeLern(local, server) {
  if (!server) return local;
  if (!local) return server;
  const base = newer(local.row, server.row);
  const stepMs = { ...local.row.step_ms };
  for (const [id, v] of Object.entries(server.row.step_ms ?? {})) stepMs[id] = Math.max(stepMs[id] ?? 0, v);
  const done = local.row.status === "completed" || server.row.status === "completed";
  const row = {
    ...base,
    current_step: Math.max(Number(local.row.current_step) || 0, Number(server.row.current_step) || 0),
    step_ms: stepMs,
    last_active_at: later(local.row.last_active_at, server.row.last_active_at),
    ...(done ? { status: "completed", running_since: null, completed_at: local.row.completed_at ?? server.row.completed_at ?? later(local.row.last_active_at, server.row.last_active_at) } : {}),
  };
  const extra = mergeExtra(local.extra, server.extra);
  return {
    ...local,
    id: server.id ?? local.id,
    klasse: local.klasse ?? server.klasse ?? null,
    row,
    extra: { ...extra, texte: { ...server.extra?.texte, ...local.extra?.texte }, ...(local.extra && "parked" in local.extra ? { parked: local.extra.parked } : {}) },
  };
}

/** The Aufgabe ref of a Stunde (aufgaben.uebung_ref, versuche.js): "st:a1-1/1/3/1/90". */
export const stundeRef = (k) => `st:${keyText(k)}`;
/** "st:a1-1/1/3/1/90" → the plan key, or null. */
export function keyFromRef(ref) {
  const m = /^st:([abc][12](?:-[12])?)\/(\d+)\/(\d+)\/(\d+)\/(\d+)$/.exec(String(ref ?? ""));
  if (!m) return null;
  return lernKeyFromParams(new URLSearchParams(`niveau=${m[1]}&block=${m[2]}&stunden=${m[3]}&stunde=${m[4]}&min=${m[5]}`));
}

/**
 * The teacher's table for one Stunde (Tier 3): per class member how far they got, and per
 * step fertig / übersprungen / offen with the answers counted in it (self-reported).
 * rows: lernstunden rows of the class (newest first; the newest per member counts),
 * members: [{ user_id, anzeigename }], key: the Stunde's plan key.
 * → { steps: [{ id, name }], people: [{ name, started, done, reached, cells: [{ status, right, answered }] }] }
 */
export function stundenStand(rows, members, key) {
  const k = keyText(key);
  const mine = rows.filter((r) => keyText(fromServer(r).key) === k);
  const byUser = new Map();
  for (const r of mine) if (!byUser.has(r.user_id)) byUser.set(r.user_id, r);
  const steps = mine.find((r) => r.fortschritt?.steps?.length)?.fortschritt.steps ?? [];
  const people = members.map((m) => {
    const r = byUser.get(m.user_id);
    if (!r) return { name: m.anzeigename, started: false, done: false, reached: -1, cells: steps.map(() => ({ status: "offen", right: 0, answered: 0 })) };
    const cells = steps.map((_, i) => {
      const seen = r.fortschritt?.seen?.[i] ?? {};
      const answers = Object.entries(seen).filter(([e]) => e.startsWith("a:"));
      return { status: r.step_status?.[i] ?? "offen", right: answers.filter(([, ok]) => ok === true).length, answered: answers.length };
    });
    return { name: m.anzeigename, started: true, done: r.status === "completed", reached: Number(r.current_step) || 0, cells };
  });
  people.sort((a, b) => Number(b.started) - Number(a.started) || a.name.localeCompare(b.name, "de"));
  return { steps, people };
}

/* ------------------------------------------------- Tier 4: /fortschritt card ---- */

/** The learner's placement ("A1" … "C1", da-einstufung / da_level) → the first part of that level. */
export const startNiveau = (cefr) => {
  const c = String(cefr ?? "").toLowerCase();
  if (!/^[abc][12]$/.test(c)) return "a1-1";
  return c === "c1" || c === "c2" ? "c1" : `${c}-1`;
};

/**
 * The one Stunde the /fortschritt card points at:
 *   { kind: "weiter", key, step }   a Stunde begun and not finished (the most recent one)
 *   { kind: "naechste", key }       the one after the most recently finished
 *   { kind: "start", key }          none yet: Stunde 1 of block 1 of the learner's level
 *   null                            the last Stunde of the last level is done
 * snaps: the device's and the server's Stunden ({ key, row }), any order.
 * order: the plan's parts in course order, [{ niveau, blocks: n }] (from planLevels()).
 */
export function naechsteStunde(snaps, order, cefr) {
  const when = (s) => Date.parse(s.row?.last_active_at ?? "") || 0;
  const latest = [...snaps].filter((s) => s?.key && s.row).sort((a, b) => when(b) - when(a))[0];
  if (!latest) return { kind: "start", key: { niveau: startNiveau(cefr), block: 1, ...DEFAULT, stunde: 1 } };
  const k = latest.key;
  if (latest.row.status !== "completed") return { kind: "weiter", key: k, step: Number(latest.row.current_step) || 0 };
  if (k.stunde < k.stunden) return { kind: "naechste", key: { ...k, stunde: k.stunde + 1 } };
  const at = order.findIndex((o) => o.niveau === k.niveau);
  if (at >= 0 && k.block < order[at].blocks) return { kind: "naechste", key: { ...k, block: k.block + 1, stunde: 1 } };
  const next = order[at + 1];
  return next ? { kind: "naechste", key: { niveau: next.niveau, block: 1, stunden: k.stunden, stunde: 1, minuten: k.minuten } } : null;
}
