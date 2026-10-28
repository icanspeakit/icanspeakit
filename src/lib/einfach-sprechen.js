/* Einfach lernen — the speaking task (Quaki), on top of the Aussprache-Check.
 *
 * Loaded by einfach-view.js only when the learner taps „Sprechen", so the speech SDK is
 * never downloaded and the microphone is never asked for before that tap. It reuses the
 * Aussprache-Check's own pieces (src/lib/ausspracheCheck.js): the microphone check, the
 * word alignment and the German messages, and the provider-neutral scoring in
 * src/lib/pronunciation/. What it adds is the easy-mode reading of the result: every word
 * gets a friendly colour, and at most one tip — for the weakest word, if it needs one.
 */
import { checkMicrophone, alignWords, MSG } from "./ausspracheCheck.js";
import { tipFor } from "./ausspracheTipps.js";
import { pronunciationProvider as provider, PronunciationError } from "./pronunciation/index.ts";

const band = (s) => (s >= 80 ? "good" : s >= 60 ? "ok" : "bad");

/**
 * Listen to the learner read `task.text`.
 * @returns {{ words: {display: string, band: string}[], good: boolean, tip: {word: string, text: string} | null }}
 */
export async function assessSentence(task, { onListening } = {}) {
  const stream = await checkMicrophone();
  try {
    const assessment = await provider.assess({ referenceText: task.text, language: "de-DE", onListening });
    const words = alignWords(task.text, assessment);
    const weakest = words.filter((w) => w.word).sort((a, b) => a.score - b.score)[0];
    const tip = weakest && weakest.score < 80 ? { word: weakest.word, text: tipFor(weakest.word, task.focus).text } : null;
    return {
      words: words.map((w) => ({ display: w.display, band: band(w.score) })),
      good: assessment.overall >= 80,
      tip,
    };
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

/* Whatever went wrong, the learner keeps „Jetzt nicht sprechen" — the message only says
   why, in the Aussprache-Check's words where it has them. */
export function messageFor(err) {
  const code = err instanceof PronunciationError ? err.code : "failed";
  if (code === "auth") return "Zum Sprechen musst du angemeldet sein. Du kannst die Aufgabe auch auslassen.";
  return MSG[code] || MSG.failed;
}
