// Klassenansicht (KARTENSPRACHE-PICKER-TIERED-PROMPT.md, Tier 4): the flashcards with two to four
// languages on one card, for a class in front of one screen. It replaces the learners' old
// „Alle Sprachen" tab, which put every language the page shipped on the card for everyone.
//
// A teacher tool: the button ships `hidden` and shows for a teacher account (the same check as
// „Als Live-Quiz für die Klasse", LiveQuizLink.astro) or in teaching mode (?ut=1, or a lesson
// running — as „Live üben" on the grammar topics). The trainer (wortschatz-app.js) owns the
// dialog and the card; this module is what the button, the trainer and the migration share.
//
// Saved per class when the teacher has classes (src/lib/klassen.js) and chooses one in the
// dialog, else per browser. The classes table has no language column, so "per class" is a
// localStorage key per class id, on this browser; nothing goes to the server.

const ON_KEY = "da-vt-klassenansicht";   // { codes, klasse } while it is on
const LAST_CLASS_KEY = "da-vt-klasse-zuletzt";
const langsKey = (klasse) => (klasse ? `da-vt-klasse-sprachen:${klasse}` : "da-vt-klasse-sprachen");

export const KLASS_MIN = 2;
export const KLASS_MAX = 6;
export const KLASS_EVENT = "da:klassenansicht";

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
const codesOf = (v) => (Array.isArray(v) ? v.filter((c) => typeof c === "string").slice(0, KLASS_MAX) : []);

/** The Klassenansicht that is on in this browser, or null: { codes, klasse }. */
export function klassOn() {
  try {
    const v = JSON.parse(get(ON_KEY) || "null");
    const codes = codesOf(v?.codes);
    return codes.length >= KLASS_MIN ? { codes, klasse: typeof v.klasse === "string" ? v.klasse : null } : null;
  } catch {
    return null;
  }
}

export function setKlassOn(codes, klasse = null) {
  if (!codes) return set(ON_KEY, null);
  set(ON_KEY, JSON.stringify({ codes: codesOf(codes), klasse }));
  saveKlassLangs(codes, klasse);
}

/** The languages last chosen for a class (or for this browser), [] when none. */
export function klassLangs(klasse = null) {
  try {
    return codesOf(JSON.parse(get(langsKey(klasse)) || "[]"));
  } catch {
    return [];
  }
}

export function saveKlassLangs(codes, klasse = null) {
  set(langsKey(klasse), JSON.stringify(codesOf(codes)));
  set(LAST_CLASS_KEY, klasse);
}

export const lastKlasse = () => get(LAST_CLASS_KEY);

/** Teaching mode: opened from a lesson (?ut=1) or a lesson is running (src/lib/unterricht/). */
export function teachingMode() {
  if (new URLSearchParams(location.search).get("ut") === "1") return true;
  return !!get("da:unterricht");
}

const AUTH_COOKIE = /(^|;\s*)sb-[^=]*-auth-token[^=]*=/;
let teacher = null;
/** A teacher account? Only asked when a Supabase auth cookie exists (LiveQuizLink.astro does
 *  the same), so a signed-out learner downloads nothing extra. */
export function isTeacherHere() {
  if (!AUTH_COOKIE.test(document.cookie)) return Promise.resolve(false);
  teacher ??= import("./liveQuiz/custom.js")
    .then(async ({ currentUser, isTeacher }) => isTeacher(await currentUser()))
    .catch(() => false);
  return teacher;
}

/** Whether to offer the Klassenansicht on this page. */
export const mayUseKlass = () => (teachingMode() ? Promise.resolve(true) : isTeacherHere());

/** The group of the lesson running in this browser (its name, speichern.js), or null. */
function lessonGroup() {
  try { return JSON.parse(get("da:unterricht") || "null")?.gruppe || null; } catch { return null; }
}

/** The teacher's classes for the dialog's „Für" select, [] for anyone else or on failure.
 *  Only while a lesson runs (Stundenplan → Unterricht): there the languages belong to that
 *  group, preselected (`lesson: true`). Anywhere else the choice is per browser, no select. */
export async function teacherClasses() {
  const group = lessonGroup();
  if (!group || !(await isTeacherHere())) return [];
  try {
    const { meineKlassen } = await import("./klassen.js");
    return (await meineKlassen()).filter((k) => !k.archiviert).map((k) => ({ id: k.id, name: k.name, lesson: k.name === group }));
  } catch {
    return [];
  }
}
