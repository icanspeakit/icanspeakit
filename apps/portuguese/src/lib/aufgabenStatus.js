// Whether an Aufgabe is done (KLASSEN-TIERED-PROMPT.md, Tier 4). Computed, never stored:
// a task counts as done when an attempt with its uebung_ref (or a sub-mode of it,
// "g:artikel/diktat" for "g:artikel") ended after the task was set, and reached
// min_richtig_prozent when the teacher set one. Pure functions, used by the teacher
// dashboard and the students' card alike, so both always agree.
//
// Due dates are days in Europe/Berlin. A task due "Freitag, 10.10." is due until
// 23:59:59.999 Berlin time that day, wherever the browser is and whether or not the
// clocks changed that week.

const TZ = "Europe/Berlin";

// Berlin's offset from UTC at an instant, in ms (+1 h in winter, +2 h in summer).
function berlinOffset(ms) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}

/** "2026-10-10" → the instant 23:59:59.999 on that day in Berlin, as an ISO string. */
export function berlinTagesende(day) {
  const [y, m, d] = String(day).split("-").map(Number);
  const nextMidnightUtc = Date.UTC(y, m - 1, d + 1);
  // The offset at Berlin's next midnight, not at UTC midnight: the night the clocks change,
  // the two differ.
  const guess = nextMidnightUtc - berlinOffset(nextMidnightUtc);
  return new Date(nextMidnightUtc - berlinOffset(guess) - 1).toISOString();
}

/** The Berlin calendar day of an instant, "2026-10-10". */
export const berlinTag = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

/** "Fr., 10.10." in Berlin time. */
export const berlinDatum = (iso, locale = "de-DE") =>
  new Intl.DateTimeFormat(locale, { timeZone: TZ, weekday: "short", day: "numeric", month: "numeric" }).format(new Date(iso));

/** Does this attempt count for this task? */
export function zaehlt(task, row) {
  const ref = row.uebung_ref;
  if (ref !== task.uebung_ref && !ref.startsWith(task.uebung_ref + "/")) return false;
  if (Date.parse(row.beendet_at) < Date.parse(task.created_at)) return false;
  if (task.min_richtig_prozent == null) return true;
  return !!row.gesamt && (row.richtig / row.gesamt) * 100 >= task.min_richtig_prozent;
}

/**
 * "erledigt" | "verspaetet" (done after the due time) | "offen" | "ueberfaellig".
 * @returns {{ status: string, am: string|null }} am = when it was first done
 */
export function aufgabenStatus(task, rows, now = Date.now()) {
  let first = null;
  for (const r of rows) if (zaehlt(task, r) && (!first || Date.parse(r.beendet_at) < Date.parse(first))) first = r.beendet_at;
  const due = Date.parse(task.faellig_at);
  if (first) return { status: Date.parse(first) > due ? "verspaetet" : "erledigt", am: first };
  return { status: now > due ? "ueberfaellig" : "offen", am: null };
}
