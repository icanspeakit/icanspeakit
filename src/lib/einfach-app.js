/* Einfach lernen (/einfach) — the brain: which unit comes next, what the learner can do,
 * and the little state that is only this mode's.
 *
 * Started as a UX study (one thing at a time, no totals, progress as something the
 * learner can *do*). EINFACH-LERNEN-TIERED-PROMPT.md turned it into the easy mode: the
 * units are the curated path in src/data/einfach-pfad.json (Tier 2), mistakes come back
 * on a box schedule (Tier 3), and since Tier 4 it is one learner, one record — every
 * answer goes through src/lib/progress.js, so the dashboard counts it and there is one
 * weekly goal. `da_einfach_v1` keeps only what no other page needs: the finished units
 * (path position and postcards), where the path starts, and the mistake boxes.
 */
import { recordAttempt, recordSession, getProgress, getWeeklyCount, getWeeklyGoal } from "./progress.js";

const STORE_KEY = "da_einfach_v1";

/* ---------------------------------------------------------------- content

   The units come from the curated path (src/data/einfach-pfad.json), resolved at build time
   by src/lib/einfach-content.js and handed to setUnits() by the page. A unit is still the
   "sitting" the prototype was built around: five to seven tasks, one or two can-do claims.
*/

let UNITS = [];

/** Install the playable units, in path order. */
export function setUnits(list) {
  UNITS = list || [];
}

/** The units, in path order. */
export const units = () => UNITS;

export const unitById = (id) => UNITS.find((u) => u.id === id);

/* ------------------------------------------------------------------ state

   { done: [unit ids], start: unit id | null, placed: bool, boxes: { ref: { box, due } } }
   Everything else — answers, days, the week — lives in progress.js. */

const blank = () => ({ done: [], start: null, placed: false, boxes: {} });

/** Before the rename (Tier 0) the state lived under the prototype's key. Moved once. */
const OLD_KEY = "da_" + "leicht_v1";
/** Fields of the prototype's own tally, now kept by progress.js. Dropped on load. */
const RETIRED = ["answered", "right", "days", "streak", "log", "weekGoal", "goalWeek"];

export function loadState() {
  try {
    if (localStorage.getItem(STORE_KEY) === null && localStorage.getItem(OLD_KEY) !== null) {
      localStorage.setItem(STORE_KEY, localStorage.getItem(OLD_KEY));
      localStorage.removeItem(OLD_KEY);
    }
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return blank();
    const s = migrateMissed({ ...blank(), ...JSON.parse(raw) });
    for (const k of RETIRED) delete s[k];
    // Someone who had already played before placement existed does not get asked.
    if (s.done.length) s.placed = true;
    return s;
  } catch {
    return blank();
  }
}

export function saveState(s) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {}
}

export function resetState() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {}
}

/** Local date as YYYY-MM-DD: a sitting at 23:30 belongs to today, not to UTC's tomorrow. */
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => ymd(new Date());

/** The site's weekly goal — the same count and goal the dashboard shows. */
export function weekProgress() {
  const done = getWeeklyCount();
  const goal = getWeeklyGoal();
  return { done, goal, reached: done >= goal };
}

/** Whole days since the learner last practised anywhere on the site, or null if never. */
export function daysAway() {
  const last = getProgress().lastActiveDate;
  if (!last) return null;
  return Math.round((new Date(today() + "T12:00") - new Date(last + "T12:00")) / 86400000);
}

/* Which progress.js skill a task counts toward, as the full-site trainers count it. */
const SKILL = {
  wort: "wortschatz",
  artikel: "grammatik",
  luecke: "grammatik",
  satz: "grammatik",
  hoeren: "hoeren",
  redemittel: "wortschatz",
};

/** One graded answer, into the shared record. Speaking is a session, not an answer. */
export function recordTask(task, ok) {
  if (task.type === "sprechen") {
    recordSession("sprechen");
    return;
  }
  const skill = SKILL[task.type];
  if (!skill) return;
  const vocab = task.type === "wort" || task.type === "artikel";
  recordAttempt({
    skill,
    correct: ok,
    id: task.type === "wort" ? task.front : task.type === "artikel" ? task.noun : task.ref,
    trackVocab: vocab,
    topic: task.topic || undefined,
  });
}

/** Finish a sitting: one session in the shared record, and the unit marked done once. */
export function completeSitting(state, id) {
  recordSession(unitById(id)?.grammar ? "grammatik" : "wortschatz");
  // The mistakes sitting is not a unit of the path.
  if (id === "fehler" || state.done.includes(id)) return state;
  return { ...state, done: [...state.done, id] };
}

/** Everything the learner has bought so far, in their words. */
export function capabilities(state) {
  return UNITS.filter((s) => state.done.includes(s.id)).flatMap((s) =>
    s.claims.map((text) => ({ text, from: s.title }))
  );
}

/** The postcards collected so far: one per finished sitting, in the order they came. */
export function postcards(state) {
  return state.done
    .map((id) => unitById(id))
    .filter((s) => s?.postcard)
    .map((s) => ({ ...s.postcard, from: s.title }));
}

/** The one thing to offer next: the first open unit from where placement started the path,
    then any open one before it, then (all done) the first. Never a list. */
export function nextSitting(state) {
  const from = Math.max(0, UNITS.findIndex((u) => u.id === state.start));
  const order = [...UNITS.slice(from), ...UNITS.slice(0, from)];
  return order.find((s) => !state.done.includes(s.id)) || UNITS[0];
}

/* ------------------------------------------------------------- placement

   First visit: "Where do you want to start?" The quick check is the A1 set of einstufung.json (six
   items). Its result picks the unit the path starts at and is told as a sentence. */

let PLACEMENT = [];
export function setPlacement(items) {
  PLACEMENT = items || [];
}
export const placementItems = () => PLACEMENT;

/** Right answers → where to start. The quick check only asks A1, so the ceiling is mid-A1:
 *  5–6 right skips be, articles, plurals, possessives and the present simple; 3–4 skips the
 *  first three. */
export function placementStart(right) {
  const at = right >= 5 ? "a1-cafe" : right >= 3 ? "a1-familie" : UNITS[0]?.id;
  return unitById(at) ? at : UNITS[0]?.id;
}

export function placementSentence(right, startId) {
  const u = unitById(startId);
  const lead =
    right >= 5 ? "You already know quite a lot." : right >= 3 ? "You already know a little." : "We'll start at the beginning — no rush.";
  return u && u.id !== UNITS[0]?.id ? `${lead} We'll start with “${u.title}”.` : lead;
}

/* ------------------------------------------------------------- mistakes

   Mistakes come back on a box schedule (Tier 3), never shown as a number:
     miss            → box 1, due tomorrow
     right when due  → box 1 → 2 (due in 3 days), 2 → 3 (due in 7 days), 3 → retired
     right, not due  → nothing changes (it was just seen in its own unit)
     miss in any box → back to box 1
   `state.boxes` is { ref: { box, due } }. Speaking is never scored, so it never lands here.
*/

const GAP = { 1: 1, 2: 3, 3: 7 };

function addDays(ymdStr, n) {
  const d = new Date(ymdStr + "T12:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** A "Practise your mistakes" sitting appears once this many items are due. */
export const MISTAKES_MIN = 5;
/** A normal unit mixes in at most this many due items. */
export const REVIEW_PER_UNIT = 2;

/** Note an answer against the box schedule. `day` is for tests; it defaults to today. */
export function noteAnswer(state, ref, ok, day = today()) {
  if (!ref) return state;
  const boxes = { ...(state.boxes || {}) };
  const cur = boxes[ref];
  if (!ok) {
    boxes[ref] = { box: 1, due: addDays(day, GAP[1]) };
  } else if (cur && cur.due <= day) {
    if (cur.box >= 3) delete boxes[ref];
    else boxes[ref] = { box: cur.box + 1, due: addDays(day, GAP[cur.box + 1]) };
  }
  return { ...state, boxes };
}

/** The first real-content build kept a plain list of missed refs; they start in box 1, due today. */
export function migrateMissed(state) {
  if (!state.missed?.length) return state;
  const boxes = { ...(state.boxes || {}) };
  for (const r of state.missed) if (!boxes[r]) boxes[r] = { box: 1, due: today() };
  const { missed, ...rest } = state;
  return { ...rest, boxes };
}

const taskByRef = () => new Map(UNITS.flatMap((u) => u.tasks.map((t) => [t.ref, t])));

/** Due tasks, oldest first, marked as reviews. */
export function dueTasks(state, day = today()) {
  const byRef = taskByRef();
  return Object.entries(state.boxes || {})
    .filter(([ref, b]) => b.due <= day && byRef.has(ref))
    .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : 0))
    .map(([ref]) => ({ ...byRef.get(ref), review: true }));
}

/** A unit with up to two due items mixed in — as the 3rd and 5th task, never first. */
export function withReviews(state, unit) {
  const own = new Set(unit.tasks.map((t) => t.ref));
  const extra = dueTasks(state).filter((t) => !own.has(t.ref)).slice(0, REVIEW_PER_UNIT);
  const tasks = unit.tasks.slice();
  extra.forEach((t, k) => tasks.splice(Math.min(2 + k * 2, tasks.length), 0, t));
  return { ...unit, tasks };
}

/** The mistakes as one sitting — or null while fewer than MISTAKES_MIN are due. */
export function mistakeUnit(state) {
  const due = dueTasks(state);
  if (due.length < MISTAKES_MIN) return null;
  return { id: "fehler", icon: "🔁", title: "Practise your mistakes", level: "", minutes: 2, claims: [], postcard: null, tasks: due.slice(0, 6) };
}

/** Units the learner could pick instead of the next one: up to three, not yet done first. */
export function otherUnits(state, page = 0) {
  const next = nextSitting(state);
  const rest = UNITS.filter((u) => u.id !== next?.id);
  const ordered = [...rest.filter((u) => !state.done.includes(u.id)), ...rest.filter((u) => state.done.includes(u.id))];
  if (!ordered.length) return { list: [], more: false };
  const start = (page * 3) % ordered.length;
  const list = ordered.slice(start, start + 3);
  return { list, more: ordered.length > 3 };
}
