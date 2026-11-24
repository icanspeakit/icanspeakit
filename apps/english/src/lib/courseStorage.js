// One course per key: every course runs on the same origin (icanspeak.it/english,
// /espanol, /francais …), so they all share one localStorage. Learning state (progress,
// SRS, mistakes, levels, exam drafts …) is kept apart per course by a `:<course>` suffix on
// the key; the few shared keys (theme, consent, display name, device, interface language …)
// stay as they are, so the hub and linguistics keep reading them.
//
// The suffix is added in ONE place, src/components/CourseStorage.astro, the first script in
// <head>: it wraps Storage.prototype.getItem/setItem/removeItem, so the rest of the code keeps
// using plain keys and needs no change. This module carries the rules that script follows
// (as data it is handed), plus helpers for the few places that list localStorage keys
// themselves: key(i) and Object.keys(localStorage) return the raw stored names.
//
// The same file in every course app; only BASE_PATH (src/lib/paths.js) differs.
import { BASE_PATH } from "./paths.js";

/** Every course's URL segment = its storage suffix. */
export const COURSES = ["english", "espanol", "francais", "portugues", "italiano"];

/** This course's suffix, e.g. "english". */
export const COURSE = BASE_PATH.replace(/^\/+|\/+$/g, "");

/** Keys shared by every course (and by the hub / linguistics on the same origin). */
export const SHARED_KEYS = [
  "da-theme",
  "da_consent",
  "da_display_name",
  "da-device-v1",
  "da_lang",
  "da_lang_recent",
  "da_lang_offer",
  "da-muttersprache",
  "da-vt-lang",
  "vf.trLangs",
  "da-leichte-sprache",
  "da-mascots",
  "da-zugang",
  "da_internal",
  "ea-debug-track",
  "da_signup_tracked",
  "da_meldung_client",
  "da_meldung_dev",
  "da_meldung_queue",
];

/** Key prefixes owned by others: PostHog, Supabase auth, the linguistics app. */
export const SHARED_PREFIXES = ["ph_", "__ph", "posthog", "sb-", "icanspeakit:", "__course_migrated"];

const SUFFIX = new RegExp(`:(${COURSES.join("|")})$`);

/** True for keys every course shares. @param {string} k */
export const isSharedKey = (k) => SHARED_KEYS.includes(k) || SHARED_PREFIXES.some((p) => k.startsWith(p));

/** The stored name of a key for this course. @param {string} k */
export const courseKey = (k) => (isSharedKey(k) || SUFFIX.test(k) ? k : `${k}:${COURSE}`);

/** True when a raw stored name belongs to another course. @param {string} k */
export const isOtherCourseKey = (k) => SUFFIX.test(k) && !k.endsWith(`:${COURSE}`);

/** A raw stored name without this course's suffix (what the code calls the key). @param {string} k */
export const plainKey = (k) => (k.endsWith(`:${COURSE}`) ? k.slice(0, -COURSE.length - 1) : k);
