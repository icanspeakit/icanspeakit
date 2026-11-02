// Hinweis counters for the attempt log (KLASSEN-TIERED-PROMPT.md, Tier 2). They are hints
// for a teacher, never verdicts: the dashboard shows them as a neutral icon with
// "kann harmlos sein", and they never change a score. Only counts are kept: no text, no
// time per event, nothing about which field it happened in.
//
//   paste    text pasted into an answer field (input, textarea, contenteditable)
//   blur     the learner left the tab and came back. It is counted on the return,
//            because the last "hidden" of a visit is just leaving the page.
//   schnell  an answer came faster than the floor for its skill (SCHNELL_MS below)
//
// Listeners are attached only when versuche.js decides a learner might be logged (signed
// in), so a signed-out visitor never runs any of this.

// Fastest plausible time between two answers, per skill, in ms. Below it, the answer was
// probably not read; above it, it may still have been looked up. The values are rough on
// purpose: they decide whether a hint icon appears, nothing else.
const SCHNELL_MS = {
  // A flashcard is self-assessed with one tap; under ~0.4 s nobody has looked at the word.
  wortschatz: 400,
  // Grammar gaps: read a sentence, pick or type a form. Under ~1.2 s the sentence was
  // not read.
  grammatik: 1200,
  // Short multiple-choice questions about a topic text.
  kultur: 1200,
  // Questions about a text you have to read or listen to first.
  hoeren: 1500,
  lesen: 2000,
  // Exam items are longer than practice items.
  pruefungen: 2500,
};
const DEFAULT_MS = 1000;

let counts = { paste: 0, blur: 0, schnell: 0 };
let attached = false;
let lastAnswerAt = 0;

/** Starts counting on this page. Idempotent. */
export function startHinweise() {
  if (attached || typeof document === "undefined") return;
  attached = true;
  document.addEventListener(
    "paste",
    (e) => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.matches("input, textarea") || t.isContentEditable)) counts.paste += 1;
    },
    true,
  );
  let wasHidden = false;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") wasHidden = true;
    else if (wasHidden) {
      wasHidden = false;
      counts.blur += 1;
    }
  });
}

/** Call once per graded answer. The first answer of a page has no "before" and never counts. */
export function answerTimed(skill) {
  const now = Date.now();
  if (lastAnswerAt && now - lastAnswerAt < (SCHNELL_MS[skill] ?? DEFAULT_MS)) counts.schnell += 1;
  lastAnswerAt = now;
}

/** The counts since the last take, then back to zero. Keys with 0 are left out. */
export function takeHinweise() {
  const out = Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0));
  counts = { paste: 0, blur: 0, schnell: 0 };
  return out;
}
