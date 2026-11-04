// The pairs of /grammar/common-mistakes (src/data/typische-fehler.json) and their gaps,
// read the same way by the page, its worksheet and Tandembogen (arbeitsblatt/nachschlagen.js)
// and its live-quiz chapter (liveQuiz/chapters.js), so all four ask the same thing.
import data from "../data/typische-fehler.json";

export const fehlerGroups = data.groups;
export const fehlerPairs = data.groups.flatMap((g) => g.pairs);

// The gap's two choices: the words themselves, without their article (der Mann → Mann).
const bare = (w) => w.replace(/^(der|die|das) /, "");
export const optionsOf = (p) => p.check.options ?? [bare(p.a.w), bare(p.b.w)];
export const answerOf = (p) => optionsOf(p)[p.check.answer === "a" ? 0 : 1];
export const wrongOf = (p) => optionsOf(p)[p.check.answer === "a" ? 1 : 0];
