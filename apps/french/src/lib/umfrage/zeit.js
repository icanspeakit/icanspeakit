// Time to answer a class poll (umfragen.zeit). The teacher sets one time for the whole poll;
// each question gets its share of it by how long it takes to answer:
//   reading   the words of the question and of its answers, at the class's reading pace
//   deciding  a few seconds to choose, more when several answers may be picked
//   writing   a free-text answer, slower the lower the level
// The same weights give the teacher a recommendation (lehrkraft.js) and the phone each
// question's clock (abstimmen.js). Both read the German as stored: a phone that shows the
// question in the student's language reads about as much.

/** Minutes a teacher can give a poll (null = no limit). Within the column's 1–60. */
export const ZEITEN = [2, 3, 4, 5, 6, 8, 10, 12, 15];

// Words a learner reads per second, and seconds to write a short free answer, per level.
const LESEN = { A1: 1.0, A2: 1.3, B1: 1.7, B2: 2.1, C1: 2.5 };
const SCHREIBEN = { A1: 60, A2: 50, B1: 45, B2: 40, C1: 35 };
const WAEHLEN = { single: 5, multi: 8 };
/** No question is given less than this, however short the poll. */
export const MIN_SEK = 8;

const woerter = (s) => String(s ?? "").split(/\s+/).filter(Boolean).length;

/** Seconds a question takes at `niveau`: its weight in the poll's time. */
export function sekunden(f, niveau) {
  const lesen = LESEN[niveau] ?? LESEN.A2;
  const n = woerter(f.frage) + (f.optionen ?? []).reduce((s, o) => s + woerter(o.text), 0);
  const tun = f.typ === "text" ? SCHREIBEN[niveau] ?? SCHREIBEN.A2 : WAEHLEN[f.typ] ?? WAEHLEN.single;
  return tun + n / lesen;
}

/** Each question's share of `minuten`, in whole seconds, in the order of `fragen`.
 *  Shares are of every stored question, so one hidden by an earlier answer just goes unused. */
export function verteilung(fragen, niveau, minuten) {
  const w = fragen.map((f) => sekunden(f, niveau));
  const sum = w.reduce((s, x) => s + x, 0) || 1;
  return w.map((x) => Math.max(MIN_SEK, Math.round((minuten * 60 * x) / sum)));
}

/** The time to recommend: what the questions take at this level, rounded up to a choice. */
export function empfehlung(fragen, niveau) {
  const sek = fragen.reduce((s, f) => s + sekunden(f, niveau), 0);
  return ZEITEN.find((m) => m * 60 >= sek) ?? ZEITEN[ZEITEN.length - 1];
}
