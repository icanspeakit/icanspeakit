// Klassentest, ausführliche Einstufung: the reading, listening and writing material a test
// can take, built at build time and served as /teachers/tests/fertigkeiten.json.
//
// All of it is the site's own: the Lesen texts (src/lib/fertigkeiten.js resolves the ones
// borrowed from the DTZ file), the Hörtexte with their recorded clips (src/data/hoeren.json,
// /audio/hoeren/<id>.mp3) and the Schreiben tasks of the „prompt“ kind (a situation and the
// points to cover). Forms and the Fehlerjagd are left out: they test something else.
//
// Lesen and Hören are graded like the grammar (their questions have one right option);
// Schreiben is read by the teacher, who gets the task's points, the examiner checklist and
// the model text for it on the results page.
import hoeren from "../../data/hoeren.json";
import { lesen, schreiben } from "../fertigkeiten.js";
import { clipHref } from "../hoeren.js";

const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const byLevel = (a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level);

/** A text's or clip's questions in the test's shape: { q, o, a }. One right option each. */
const fragenOf = (questions) =>
  (questions ?? [])
    .filter((x) => Array.isArray(x.options) && x.options.length >= 2 && x.options.includes(x.answer))
    .map((x) => ({ q: plain(x.prompt), o: x.options.map(String), a: [String(x.answer)] }));

export function fertigkeitenPool() {
  return {
    lesen: lesen.texts
      .map((x) => ({ id: x.id, level: x.level, title: x.title, text: x.text, fragen: fragenOf(x.questions) }))
      .filter((x) => x.text && x.fragen.length)
      .sort(byLevel),
    hoeren: hoeren.texts
      .filter((x) => !x.paid)
      .map((x) => ({ id: x.id, level: x.level, title: x.title, src: clipHref(x.id), seconds: x.seconds, fragen: fragenOf(x.questions) }))
      .filter((x) => x.fragen.length)
      .sort(byLevel),
    schreiben: schreiben.tasks
      .filter((x) => x.kind === "prompt" && x.situation)
      .map((x) => ({
        id: x.id, level: x.level, title: x.title, situation: x.situation, source: x.source ?? "",
        points: x.points ?? [], model: x.model ?? "", check: x.check ?? [],
      }))
      .sort(byLevel),
  };
}
