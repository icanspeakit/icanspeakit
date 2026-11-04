// The way back from a page the lesson opened (a topic, the Wortliste, the presentation) to
// the lesson itself: „Zurück zur Stunde“ in the deck, „Zurück zum Schritt“ in the bar.
//
// It switches to the lesson's tab and leaves this one as it is, so the presentation (or the
// page) is still there, in its own tab, when the teacher comes back to it. The lesson page
// names its window (LESSON_WINDOW, seite.js), and window.open("", name) finds that tab
// without reloading it. No such tab any more (closed): the lesson opens in it instead.
import { readLocal, sessionHref } from "./speichern.js";

export const LESSON_WINDOW = "da-unterricht";
/** The one tab the lesson's material opens in, so a second click does not stack tabs. */
export const MATERIAL_WINDOW = "da-unterricht-material";
/** The learner's Stunde (/lesson) and the tab its word cards open in: the same way back. */
export const LERN_WINDOW = "da-stunde";
export const LERN_MATERIAL_WINDOW = "da-stunde-material";

export function toLesson() {
  const local = readLocal();
  toTab(LESSON_WINDOW, local ? sessionHref(local.id) : "/teachers/lesson");
}

/** Switches to the tab named `name`, or opens `href` in it when that tab is gone. */
export function toTab(name, href) {
  // This tab is the lesson's own (the page was opened in it): just go back there.
  if (window.name === name) { location.assign(href); return; }
  let w = null;
  try { w = window.open("", name); } catch {}
  if (!w) { location.assign(href); return; } // a blocked popup: this tab goes instead
  try { if (w.location.href === "about:blank") w.location.replace(href); } catch {}
  w.focus();
}
