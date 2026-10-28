// Zitat des Tages (/wissen/zitate): which quote belongs to which date, and the week's best
// for the Monday mail. Pure, so the page (browser, local date), the mail (server, Berlin
// date) and the build agree on the same quote for the same day.
//
// Every calendar day has a fixed place: 1 January is quote 0, 31 December quote 364. 29
// February gets quote 365 (the 366th, for the leap day; the /merch calendar has all 366),
// so a leap year does not shift the rest of the year. With fewer quotes than days the list
// simply repeats (index modulo length), and 29 February shares 28 February's quote.

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** 0–364 for a "YYYY-MM-DD" date, the same in every year. */
export function daySlot(ymd) {
  const [, m, d] = ymd.split("-").map(Number);
  return MONTH_START[m - 1] + Math.min(d, m === 2 ? 28 : d) - 1;
}

/** "YYYY-MM-DD" of a Date in the browser's local time. */
export function localYmd(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" in Berlin (for the mail). */
export function berlinYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(date);
}

/** "YYYY-MM-DD" n days after `ymd` (n may be negative). */
export function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Index into `quotes` for a date. */
export const indexFor = (ymd, count) => (ymd.endsWith("-02-29") && count > 365 ? 365 : daySlot(ymd) % count);

/**
 * The seven days before `ymd` (not including it), oldest first, with their quotes.
 * @template Q
 * @param {Q[]} quotes
 * @param {string} ymd
 * @returns {{ date: string, quote: Q }[]}
 */
export function pastWeek(quotes, ymd) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(ymd, i - 7);
    return { date, quote: quotes[indexFor(date, quotes.length)] };
  });
}

/**
 * The best of those days: highest `rank`; on a tie the shorter quote (it reads better in a
 * mail), then the later day.
 * @param {{ date: string, quote: { rank?: number, text: string } }[]} days
 */
export function bestOf(days) {
  return [...days].sort((a, b) =>
    (b.quote.rank ?? 3) - (a.quote.rank ?? 3) || a.quote.text.length - b.quote.text.length || b.date.localeCompare(a.date),
  )[0];
}

/** "9. Oktober" */
export const formatDe = (ymd) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "long", timeZone: "UTC" });
