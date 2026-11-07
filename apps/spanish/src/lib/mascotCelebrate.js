// The mascot crew cheering at milestones — a round finished, a streak day, the weekly
// goal — and a small hop next to right/wrong feedback.
//
//   import { celebrate, mascotHop } from "../lib/mascotCelebrate.js";
//   celebrate({ title: "Geschafft!", body: "Runde beendet: 9 von 10 richtig." });
//
// Everything here is a no-op when the learner switched the mascots off
// (src/lib/mascotPrefs.js), so callers never have to check. The overlay is a status
// message, not a dialog: it never takes focus, never blocks the page, closes itself
// after a few seconds and on any click or Esc. Reduced motion gets the same card
// without the bounce and confetti. Styles: src/styles/mascot-celebrate.css (imported
// by Layout.astro, so every page has them).
import { mascotSvg } from "./mascots.js";
import { mascotsEnabled, setMascotsEnabled } from "./mascotPrefs.js";

const SHOW_MS = 3800;
const CONFETTI = ["#f97316", "#0d9488", "#f2a900", "#14b8a6", "#fb923c", "#5eead4"];
let current = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function close() {
  if (!current) return;
  const el = current;
  current = null;
  el.classList.add("mc-leave");
  setTimeout(() => el.remove(), 260);
}

/**
 * Show the milestone celebration.
 * @param {{ title: string, body?: string, crew?: string[], lead?: string }} opts
 *   `lead` is the mascot in front (Bruno by default, cheering); `crew` are the ones
 *   hopping alongside.
 */
// `optOut` adds a quiet „Maskottchen ausblenden" under the cheer (Einfach lernen), with the
// way back in its own words — the overlay is the moment someone decides the mascots are
// too much, so that is where the switch has to be findable.
// `expr` other than "celebrate" (e.g. "oops" after a failed Führerschein-Simulation) shows the
// lead in that mood and leaves the confetti out.
export function celebrate({ title, body = "", lead = "bruno", crew = ["regi", "hamsti", "quaki"], optOut = false, expr = "celebrate" } = {}) {
  if (typeof document === "undefined" || !mascotsEnabled()) return;
  if (current) current.remove();

  const confetti = Array.from({ length: expr === "celebrate" ? 18 : 0 }, (_, i) => {
    const left = Math.round((i / 18) * 100 + Math.random() * 5);
    const delay = (Math.random() * 0.35).toFixed(2);
    const rot = Math.round(Math.random() * 360);
    return `<i style="left:${left}%;background:${CONFETTI[i % CONFETTI.length]};animation-delay:${delay}s;--r:${rot}deg"></i>`;
  }).join("");

  const side = crew.slice(0, 3).map((n, i) =>
    `<span class="mc-crew-item" style="--i:${i}">${mascotSvg({ name: n, size: 56, label: "" })}</span>`).join("");

  const el = document.createElement("div");
  el.className = "mc-celebrate";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <div class="mc-card">
      <div class="mc-confetti" aria-hidden="true">${confetti}</div>
      <div class="mc-lead">${mascotSvg({ name: lead, expr, size: 112, label: "" })}</div>
      <p class="mc-title">${esc(title)}</p>
      ${body ? `<p class="mc-body">${esc(body)}</p>` : ""}
      <div class="mc-crew" aria-hidden="true">${side}</div>
      ${optOut ? `<button type="button" class="mc-optout" data-mc-optout>Maskottchen ausblenden · wieder an unter Konto → Einstellungen</button>` : ""}
    </div>`;
  document.body.appendChild(el);
  current = el;

  const timer = setTimeout(close, SHOW_MS);
  const dismiss = () => { clearTimeout(timer); close(); removeListeners(); };
  const onKey = (e) => { if (e.key === "Escape") dismiss(); };
  const removeListeners = () => { document.removeEventListener("keydown", onKey); };
  el.addEventListener("click", dismiss);
  el.querySelector("[data-mc-optout]")?.addEventListener("click", () => setMascotsEnabled(false));
  document.addEventListener("keydown", onKey);
}

/**
 * A small mascot hopping in next to an answer's feedback.
 * @param {Element} anchor  the feedback element; the mascot is placed at its start
 * @param {boolean} correct cheers on right, looks "oops" on wrong
 * @param {string} [name]   which mascot — Bruno by default, Regi in the grammar exercises
 */
export function mascotHop(anchor, correct, name = "bruno") {
  if (!anchor || !mascotsEnabled()) return;
  anchor.querySelector(":scope > .mc-hop")?.remove();
  const span = document.createElement("span");
  span.className = `mc-hop ${correct ? "mc-hop--ok" : "mc-hop--err"}`;
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = mascotSvg({ name, expr: correct ? "celebrate" : "oops", size: 40, label: "" });
  anchor.prepend(span);
}

// Milestones that belong to the learner rather than to one trainer: a streak length
// worth marking, and the weekly goal reached. progress.js raises them as `da:milestone`;
// Layout.astro loads this module on the first one and hands it over, so pages that never
// hit a milestone never download the mascot drawings.
export function celebrateMilestone(m = {}) {
  // Einfach lernen has no daily streak (EINFACH-LERNEN-TIERED-PROMPT.md): its one number is
  // the weekly goal, so a streak milestone reached there stays quiet.
  const einfach = document.documentElement.hasAttribute("data-einfach");
  if (m.type === "streak" && einfach) return;
  if (m.type === "weekly-goal" && einfach) {
    celebrate({ title: "Wochenziel geschafft! Wurst für alle!", body: `${m.goal} Aufgaben diese Woche.`, lead: "bruno", crew: ["quaki", "hamsti", "regi"], optOut: true });
    return;
  }
  if (m.type === "streak") {
    celebrate({ title: `${m.streak} Tage in Folge!`, body: "Deine Serie wächst. Bis morgen!" });
  } else if (m.type === "weekly-goal") {
    celebrate({ title: "Wochenziel geschafft!", body: `${m.goal} Antworten diese Woche. Stark!`, lead: "bruno", crew: ["quaki", "hamsti", "regi"] });
  }
}

/** End of a round in any trainer: the score decides how loud the cheer is. */
export function celebrateRound(score, total) {
  if (!total) return;
  // Every finished exercise round passes through here, so this is where the page hears
  // about it — the onboarding hints listen (src/lib/touchpoints.js), mascots on or off.
  try { dispatchEvent(new CustomEvent("da:round", { detail: { kind: "uebung", score, total } })); } catch {}
  const ratio = score / total;
  const title = ratio === 1 ? "Alles richtig!" : ratio >= 0.8 ? "Super gemacht!" : "Geschafft!";
  const body = ratio >= 0.5 ? `${score} von ${total} richtig.` : `${score} von ${total} richtig. Nochmal? Du schaffst das!`;
  celebrate({ title, body });
}
