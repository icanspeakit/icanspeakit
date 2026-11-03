// „▶ Vorschau“ in the demo dock (DemoDock.astro): the ten best things on the site, one page
// each, for showing the project to investors. Start writes the demo record first (the same as
// „✱ Demo-Daten“), so progress, streaks and mistakes are filled in where a page shows them.
//
// A small presenter card, bottom right, on every page while it runs: step n/10, what the
// feature is and why it matters, what to tap, ‹ Zurück · Weiter › · ✕. The step lives in
// sessionStorage („da-vorschau“), so it survives the page changes and ends with the tab.
// Only where the dock is (our own devices): mountVorschau is called from the dock's script.
//
// The list is the one place to change the ten.
import { withBase, currentPath } from "./paths.js";

const KEY = "da-vorschau";

export const STEPS = [
  {
    href: "/step-by-step",
    title: "Step by step",
    pitch: "One step per screen, for complete beginners. No menu, no choices – Bruno leads the way.",
    tap: "Tap the first step and show how little is on the screen.",
  },
  {
    href: "/two-objects",
    title: "Grammar: rule and exercises",
    pitch: "Every topic as a short rule with examples, then exercises with instant feedback – from A1 to C1.",
    tap: "Fill a gap wrongly: the explanation appears at once.",
  },
  {
    href: "/vocabulary/a1-04",
    title: "Vocabulary in your own language",
    pitch: "Flashcards with a picture, audio and a translation into your first language, A1 to B2, with spaced repetition.",
    tap: "Turn a card over, then choose another language at the top.",
  },
  {
    href: "/pronunciation-check",
    title: "Pronunciation check",
    pitch: "Say a sentence and see at once which words sound right and which don't yet. Runs in the browser, no app.",
    tap: "Tap the microphone and say a sentence.",
  },
  {
    href: "/exams",
    title: "Exam practice: DELE, SIELE, CCSE",
    pitch: "Practice sets in the format of the real exams, with a timer and a score – the reason many people come.",
    tap: "Open an exam and show how it is built.",
  },
  {
    href: "/progress",
    title: "Progress",
    pitch: "Every number comes from real practice: streak, topics, common mistakes. Filled with demo data here.",
    tap: "Point to the list of mistakes: it becomes the next exercise.",
  },
  {
    href: "/teachers/quiz",
    title: "Live quiz for the class",
    pitch: "The teacher shows the code on the projector, the class plays on their phones – from any chapter, no account for learners.",
    tap: "Choose a chapter and start the quiz.",
  },
  {
    href: "/teachers/timetable",
    title: "Lesson plan and lesson",
    pitch: "A whole lesson planned in stages, with a timer, slides and exercises – click through it step by step in class.",
    tap: "Tap “Start the lesson” and show the timer.",
  },
  {
    href: "/teachers/surveys",
    title: "Polls and tests via QR code",
    pitch: "The class says anonymously what they want to learn, or takes a test – live results, scored without marking.",
    tap: "Bruno shows how it works in three steps.",
  },
  {
    href: "/teachers/worksheets",
    title: "Worksheets and games to print",
    pitch: "Ready-made worksheets for the grammar topics and games for the group – to print or as a PDF.",
    tap: "Open a sheet and show the print view.",
  },
];

// The pages' one-time intros (each stores "1" once seen; „✦ Tour neu“ clears them). A
// Vorschau marks them all seen, so no tour bubble cuts into the presenter's flow. A new
// tour joins this list (keys end in -seen or -peek).
const TOURS = [
  "da-artikel-hint-seen", "da-artikel-rule-peek", "da-aussprache-regel-peek", "da-ex-rule-peek",
  "da-fakten-easy-seen", "da-grammatik-ex-rule-peek", "da-grammatik-rule-peek", "da-lq-help-seen",
  "da-lq-lernsets-seen", "da-lu-fold-seen", "da-praep-rule-peek", "da-pruefung-info-seen",
  "da-satzmelodie-tour-seen", "da-stufen-foldtab-seen", "da-ut-leiste-seen", "da-vb-rule-seen",
  "da-wortschatz-lernsets-seen",
];
const quietTours = () => { try { TOURS.forEach((k) => localStorage.setItem(k, "1")); } catch {} };

const read = () => { try { const v = sessionStorage.getItem(KEY); return v == null ? null : Number(v); } catch { return null; } };
const write = (i) => { try { i == null ? sessionStorage.removeItem(KEY) : sessionStorage.setItem(KEY, String(i)); } catch {} };

function go(i) {
  write(i);
  location.assign(withBase(STEPS[i].href));
}

/** From the dock's „▶ Vorschau“: demo data in (seed), then step 1. */
export function startVorschau(seed) {
  seed();
  quietTours();
  go(0);
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** On every page with the dock: the presenter card, while a Vorschau runs. */
export function mountVorschau() {
  const i = read();
  if (i == null || !STEPS[i]) return;
  quietTours(); // again: „✦ Tour neu“ may have been pressed mid-run
  const s = STEPS[i];
  const last = i === STEPS.length - 1;
  const card = document.createElement("aside");
  card.className = "vs-card";
  card.setAttribute("aria-label", "Preview");
  card.innerHTML = `
    <div class="vs-top">
      <span class="vs-step">Preview · ${i + 1}/${STEPS.length}</span>
      <button type="button" class="vs-x" data-vs-end aria-label="End preview" title="End preview">✕</button>
    </div>
    <ol class="vs-dots" aria-hidden="true">${STEPS.map((_, k) => `<li class="${k === i ? "is-on" : k < i ? "is-done" : ""}"></li>`).join("")}</ol>
    <h2 class="vs-title">${esc(s.title)}</h2>
    <p class="vs-pitch">${esc(s.pitch)}</p>
    <p class="vs-tap"><span aria-hidden="true">👆</span> ${esc(s.tap)}</p>
    <div class="vs-nav">
      <button type="button" class="vs-btn" data-vs-prev ${i === 0 ? "hidden" : ""}>‹ Back</button>
      <button type="button" class="vs-btn vs-btn--main" data-vs-next>${last ? "Done" : "Next ›"}</button>
    </div>`;
  document.body.append(card);
  // a page reached by hand (not this step's): one tap back to the step's page
  if (currentPath().replace(/\/$/, "") !== s.href) {
    const back = document.createElement("a");
    back.className = "vs-here";
    back.href = withBase(s.href);
    back.textContent = "Go to this step's page";
    card.querySelector(".vs-tap").after(back);
  }
  const end = () => { write(null); card.remove(); };
  card.querySelector("[data-vs-end]").addEventListener("click", end);
  card.querySelector("[data-vs-prev]").addEventListener("click", () => go(i - 1));
  card.querySelector("[data-vs-next]").addEventListener("click", () => (last ? end() : go(i + 1)));
}
