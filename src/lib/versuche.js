// The attempt log for Klassen (KLASSEN-TIERED-PROMPT.md, Tier 2): one row per finished
// exercise set of a learner who is in a class, written to uebung_versuche, which the
// teacher reads.
//
// WHAT IS LOGGED, AND WHEN
// - Only when the learner is signed in AND is a member of at least one class, or took an
//   Einladung (/einladung says so; Edgar reads it on /intern/admin). A signed-out
//   visitor never even loads the sender (no auth cookie → nothing happens here); a
//   signed-in learner in no class costs one membership check per tab session and never
//   sends a request to uebung_versuche.
// - progress.js calls in here from recordAttempt() / recordSession(). The answers of one
//   exercise (one `uebung_ref`, see pageRef() and setRef()) are collected into one "set".
//   Answers are keyed per item, and a re-check of the same item replaces its earlier
//   result, so "Prüfen" twice doesn't count twice. The set becomes a row when it ends:
//     - the engine says so (endSet(): quiz done, exam result shown, …)
//     - the learner moves on to another exercise on the same page
//     - 200 items are reached
//     - the page is left (pagehide)
//   If a tab dies without pagehide, the set is kept in sessionStorage and written on the
//   next page load in that tab.
// - A row: uebung_ref, skill, richtig/gesamt (both empty for practice without a score),
//   start and end time, duration, and the Hinweis counts from ./hinweise.js.
// - Einfach (/step-by-step, refs "e:") is never logged: the join page promises that
//   (KlassenConsent.astro).
//
// TRUST: these rows are "selbst gemeldet" (quelle = 'client'). They are scored in this
// browser and anyone with devtools can send any numbers they like. They show who practises
// and roughly how it goes; they prove nothing. Do not sell them as more.
//
// Rows wait in localStorage (da_versuche_queue, at most 200) until the sender has them
// accepted. Each row carries a client_id and the insert ignores duplicates, so a retry after
// an uncertain send can't count a set twice.
import { answerTimed, startHinweise, takeHinweise } from "./hinweise.js";
import { germanPath } from "./routes.js";

const QUEUE_KEY = "da_versuche_queue";
const OPEN_KEY = "da_versuche_offen";
const MAX_QUEUE = 200;
const MAX_ITEMS = 200;
const FLUSH_MS = 3000;
const REF_RE = /^[a-z]{1,2}:[a-z0-9][a-z0-9._/+:-]{0,77}$/;
const APP = import.meta.env.PUBLIC_TARGET === "app";

let disabled = false; // set once the sender knows this account is in no class
let open = null; // { ref, skill, items: {key: bool}, seq, scored, started, last }
let currentRef = null;
let itemHint = null;
let sender = null; // the loaded ./versucheSenden.js
let flushTimer = 0;
let inited = false;

/* ------------------------------------------------------------- storage ---- */

const ls = {
  get(k, store = localStorage) { try { return JSON.parse(store.getItem(k) ?? "null"); } catch { return null; } },
  set(k, v, store = localStorage) { try { v == null ? store.removeItem(k) : store.setItem(k, JSON.stringify(v)); } catch {} },
};
export const readQueue = () => (Array.isArray(ls.get(QUEUE_KEY)) ? ls.get(QUEUE_KEY) : []);
export const writeQueue = (q) => ls.set(QUEUE_KEY, q.length ? q.slice(-MAX_QUEUE) : null);

/* --------------------------------------------------------------- refs ---- */

const clean = (ref) => {
  const r = String(ref ?? "").toLowerCase().replace(/[^a-z0-9._/+:-]+/g, "-").slice(0, 80);
  return REF_RE.test(r) && !r.startsWith("e:") ? r : null;
};

/**
 * The exercise a page is about, from its URL (docs/klassen-tier0-v1.md §6). Pages that
 * hold several exercises call setRef() when the learner switches. null = not logged.
 */
export function pageRef(path = location.pathname) {
  // Refs stayed German when the URLs became English (src/lib/routes.js): map back first.
  const s = germanPath(path.replace(/\/+$/, "")).split("/").filter(Boolean);
  const [a, b, c] = s;
  switch (a) {
    case undefined: case "einfach": return null;
    case "wortschatz": return `w:${b ?? "redemittel"}`;
    // A teacher's shared card set: the class task for it carries the same ref.
    case "kartenset": {
      const t = new URLSearchParams(location.search).get("t");
      return t ? `vs:${t}` : null;
    }
    case "berufe": return b && c ? `w:berufe-${b}-${c}` : null;
    case "hoeren": return b ? `h:${b}` : null;
    case "lesen": return b ? `l:${b}` : null;
    case "lesen-schreiben": return "l:ls";
    case "kultur": return b === "insider" ? (c ? `k:insider/${c}` : null) : b ? `k:${b}` : null;
    case "schreiben": return b ? `s:${b}` : null;
    case "sprechen": return b ? `sp:${b}` : null;
    case "sprechen-b1b2": return "sp:b1b2";
    case "aussprache": return "a:aussprache";
    case "dtz": return b ? `x:dtz/${b === "uebungssatz" ? "uebungssatz-1" : b}` : null;
    case "grammatik": return b === "quiz" ? "g:quiz" : b === "lauf" ? "g:lauf" : null;
  }
  // Root-level grammar topics (/past-simple, /object-pronouns, /prepositions, …).
  const key = document.getElementById("vp-page")?.dataset.topicKey;
  return s.length === 1 ? `g:${key || a}` : null;
}

/** For pages with several exercises: the one the learner is on now. Ends a set of another. */
export function setRef(ref) {
  currentRef = clean(ref);
  if (open && currentRef && open.ref !== currentRef) finish();
}

/** The item the next answer belongs to, for engines whose callers don't pass an id. */
export function hintItem(key) {
  itemHint = key == null ? null : String(key);
}

/* ---------------------------------------------------------------- sets ---- */

// Signed in at all? The website's session is a cookie that @supabase/ssr writes as
// sb-<project>-auth-token (possibly chunked .0/.1); the app keeps it in Preferences.
const mightLog = () => !disabled && typeof document !== "undefined" && (APP || /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie));

function init() {
  if (inited) return;
  inited = true;
  startHinweise();
  // A set this tab left open on the previous page (no pagehide, e.g. a killed tab).
  const left = ls.get(OPEN_KEY, sessionStorage);
  if (left?.ref) {
    open = { ...left };
    finish();
  }
  addEventListener("pagehide", () => {
    finish();
    flush({ keepalive: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush({ keepalive: true });
  });
  addEventListener("online", () => flush());
  prepare();
}

// Loads the sender early, so pagehide can send synchronously with a token in hand.
function prepare() {
  if (sender) return Promise.resolve(sender);
  return import("./versucheSenden.js")
    .then(async (m) => {
      const member = await m.vorbereiten();
      if (member === false) {
        // Signed in, but in no class: stop collecting and forget anything queued.
        disabled = true;
        open = null;
        ls.set(OPEN_KEY, null, sessionStorage);
        writeQueue([]);
        return null;
      }
      sender = m;
      if (readQueue().length) m.senden({});
      return m;
    })
    .catch(() => null);
}

function begin(ref, skill) {
  const now = Date.now();
  open = { ref, skill, items: {}, seq: 0, scored: false, started: now, last: now };
}

function mirror() {
  ls.set(OPEN_KEY, open, sessionStorage);
}

// crypto.randomUUID needs a secure context; getRandomValues does not.
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The open set becomes a queued row. */
function finish() {
  if (!open) return;
  const set = open;
  open = null;
  ls.set(OPEN_KEY, null, sessionStorage);
  const results = Object.values(set.items);
  const row = {
    client_id: uuid(),
    uebung_ref: set.ref,
    skill: set.skill,
    richtig: set.scored ? results.filter(Boolean).length : null,
    gesamt: set.scored ? results.length : null,
    gestartet_at: new Date(set.started).toISOString(),
    beendet_at: new Date(set.last).toISOString(),
    dauer_ms: Math.max(0, Math.min(set.last - set.started, 86_400_000)),
    hinweise: takeHinweise(),
  };
  if (set.scored && !row.gesamt) return;
  writeQueue([...readQueue(), row]);
  schedule();
}

/** Ends the open set now (the engine knows the set is over). */
export function endSet(ref) {
  if (open && (!ref || clean(ref) === open.ref)) finish();
}

/* ------------------------------------------------- from progress.js ---- */

/** One graded answer. `item` keys it within the set; a repeat of the same item replaces it. */
export function logAttempt({ skill, correct, ref, item } = {}) {
  try {
    if (!skill || !mightLog()) return;
    init();
    answerTimed(skill);
    const r = clean(ref) ?? currentRef ?? clean(pageRef());
    const key = item ?? itemHint;
    itemHint = null;
    if (!r) return;
    if (open && open.ref !== r) finish();
    if (!open) begin(r, skill);
    open.items[key == null ? `#${open.seq++}` : String(key)] = !!correct;
    open.scored = true;
    open.last = Date.now();
    if (Object.keys(open.items).length >= MAX_ITEMS) finish();
    else mirror();
  } catch {}
}

/** Practice without right/wrong (Sprechen, Schreiben, Aussprache): the set counts as "geübt". */
export function logSession({ skill, ref } = {}) {
  try {
    if (!skill || !mightLog()) return;
    init();
    const r = clean(ref) ?? currentRef ?? clean(pageRef());
    if (!r) return;
    if (open && open.ref !== r) finish();
    if (!open) begin(r, skill);
    open.last = Date.now();
    mirror();
  } catch {}
}

/* -------------------------------------------------------------- flush ---- */

function schedule() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flush(), FLUSH_MS);
}

function flush({ keepalive = false } = {}) {
  clearTimeout(flushTimer);
  if (disabled || !readQueue().length) return;
  if (sender) sender.senden({ keepalive });
  else if (!keepalive) prepare().then((m) => m?.senden({}));
}

// Signed in: get ready on page load, not at the first answer. The sender has to be loaded
// while the page is online; an import that first runs offline fails and stays failed, and
// the set would then wait for the next page. It shares the Supabase chunk the header's
// sign-in badge loads anyway. This also sends rows left from an earlier page and closes a
// set this tab left open.
if (typeof window !== "undefined" && mightLog()) init();
