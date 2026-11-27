// Live üben, the results after "End": their panel, and the small button in the corner that
// brings them back after "Close".
//
// The finished sheet is kept in sessionStorage: this tab only, so it survives a reload and the
// way to the next page, and is gone with the tab. Not localStorage, because a classroom PC is
// shared and the sheet holds the learners' names. The button's × removes it sooner. On every
// page with the site nav through auswertungNav.js, which loads this file only if there is one.
import { t } from "../uiText.js";
import { currentPath, withBase } from "../paths.js";
import { topicPath } from "../routes.js";
import "../../styles/live-uebung.css";

export const AUSWERTUNG_KEY = "da-lu-auswertung";
// The teacher's room (lehrkraft.js) and the wish to reopen it after the page has loaded ([id].astro).
export const ROOM_KEY = "da-lu-raum";
const WEITER_KEY = "da-lu-weiter";

/**
 * "Back to the QR code": the same room again, same PIN. The phones stayed in it and come back on
 * the board by themselves (schueler.js). Through a page load, because it needs that topic's
 * page, and the results' button can be on any page.
 */
function reopenRound(sheet) {
  try {
    localStorage.setItem(ROOM_KEY, JSON.stringify({ pin: sheet.pin, at: Date.now() }));
    sessionStorage.setItem(WEITER_KEY, sheet.topic);
  } catch {}
  const path = topicPath(sheet.topic);
  if (currentPath().replace(/\/+$/, "") === path) location.reload();
  else location.assign(withBase(path));
}

/** Asked by a topic page: reopen the round here? Asks once. */
export function reopenAsked(topic) {
  try {
    if (sessionStorage.getItem(WEITER_KEY) !== topic) return false;
    sessionStorage.removeItem(WEITER_KEY);
    return true;
  } catch { return false; }
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function read() {
  try {
    const s = JSON.parse(sessionStorage.getItem(AUSWERTUNG_KEY) ?? "null");
    return s && typeof s.html === "string" ? s : null;
  } catch { return null; }
}
const keep = (sheet) => { try { sessionStorage.setItem(AUSWERTUNG_KEY, JSON.stringify(sheet)); } catch {} };
const drop = () => { try { sessionStorage.removeItem(AUSWERTUNG_KEY); } catch {} };

/** The corner button, if a sheet is kept; `pop` when it has just been closed into it. */
export function showChip({ pop = false } = {}) {
  document.querySelector(".lu-evalchip")?.remove();
  const sheet = read();
  if (!sheet) return null;
  const chip = document.createElement("div");
  chip.className = "lu-evalchip";
  chip.innerHTML = `
    <button type="button" class="lu-evalchip-open" data-lu-eval-open>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 20v-7M12 20V5M19 20v-10"/></svg>
      <span class="lu-evalchip-t"><b>${t("lu.e.title", "Results")}</b><small>${esc(sheet.title)}</small></span>
    </button>
    <button type="button" class="lu-evalchip-x" data-lu-eval-drop aria-label="${t("lu.e.delete", "Delete the results")}" title="${t("lu.e.delete", "Delete the results")}">×</button>`;
  chip.querySelector("[data-lu-eval-open]").addEventListener("click", () => openAuswertung());
  chip.querySelector("[data-lu-eval-drop]").addEventListener("click", () => { drop(); chip.remove(); });
  document.body.append(chip);
  if (pop && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    chip.animate([{ transform: "scale(.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.22, 1.4, .36, 1)" });
  }
  return chip;
}

/**
 * The results panel. Without `sheet`: the kept one.
 * @param sheet  { title, date, html, pin, topic } of a round that has just ended
 */
export function openAuswertung(sheet) {
  if (sheet) keep(sheet);
  else sheet = read();
  if (!sheet) return;
  document.querySelector(".lu-evalchip")?.remove();
  document.querySelector(".lu-panel--eval")?.remove();
  const fromLesson = new URLSearchParams(location.search).get("ut") === "1";
  const panel = document.createElement("div");
  panel.className = "lu-panel lu-panel--eval";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", t("lu.e.title", "Results"));
  panel.innerHTML = `
    <header class="lu-head">
      <div class="lu-head-t"><b>${t("lu.e.title", "Results")}</b><span>${esc(sheet.title)} · ${esc(sheet.date)}</span></div>
      ${sheet.pin && sheet.topic ? `<button type="button" class="lu-btn" data-lu-reopen>${t("lu.e.reopen", "‹ Back to the QR code and the board")}</button>` : ""}
      <button type="button" class="lu-btn" data-lu-print>${t("lu.e.print", "Print / save as PDF")}</button>
      <button type="button" class="lu-btn${fromLesson ? "" : " lu-btn--main"}" data-lu-close>${t("lu.e.close", "Close")}</button>
      ${fromLesson ? `<button type="button" class="lu-btn lu-btn--main" data-lu-lesson>${t("lu.t.toLesson", "‹ Back to the lesson")}</button>` : ""}
    </header>
    <div class="lu-eval">${sheet.html}</div>`;
  document.body.append(panel);

  const close = () => {
    panel.remove();
    showChip({ pop: true })?.querySelector("[data-lu-eval-open]").focus();
  };
  // Printed, every "Why?" is open: the sheet is for later, nobody can click on paper.
  panel.querySelector("[data-lu-print]").addEventListener("click", () => {
    panel.querySelectorAll(".lu-why").forEach((d) => { d.open = true; });
    print();
  });
  panel.querySelector("[data-lu-reopen]")?.addEventListener("click", () => reopenRound(sheet));
  panel.querySelector("[data-lu-close]").addEventListener("click", close);
  panel.querySelector("[data-lu-lesson]")?.addEventListener("click", () => {
    close();
    import("../unterricht/zurueck.js").then(({ toLesson }) => toLesson());
  });
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  panel.querySelector(fromLesson ? "[data-lu-lesson]" : "[data-lu-close]").focus();
}
