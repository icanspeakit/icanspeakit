// The Prüfungsplan: a day-by-day plan up to the exam date (PREMIUM-FEATURES Tier 4).
//
// buildPlan() is a pure function — no DOM, no storage, no clock it does not get handed —
// so scripts/check-pruefungsplan.mjs can test it in Node. Every item it plans comes from
// the `exam` object the page builds from data in the repo (src/pages/pruefungsplan.astro):
// the exam's Übungssätze, the Lehrplan's grammar topics, the Lernsets, the Aussprache-Check.
// It never invents an item.
//
// Rules:
//   - One full sitting per week at most; the last 3–5 days before the exam (4 if it fits),
//     never on the last day before it. Free sets first; paid sets carry `paid: true` and the
//     plan still works without them (a week whose set is paid gets a free one again).
//   - Every other day: 1, 2 or 3 short items for 15, 30 or 60 minutes — grammar of the
//     learner's level (then the target level), a Lernset, and every third day Aussprache.
//   - The exam day itself is not a study day; it is the plan's last entry.

const DAY = 86_400_000;
const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const parse = (s) => new Date(`${s}T12:00:00Z`).getTime();
export const ITEMS_PER_DAY = { 15: 1, 30: 2, 60: 3 };

/**
 * @param {{
 *   exam: { key: string, label: string, level: string,
 *           sets: { label: string, href: string, paid?: boolean }[],
 *           grammar: Record<string, { name: string, href: string }[]>,
 *           lernsets: Record<string, { title: string, href: string }[]> },
 *   date: string,            // exam date, YYYY-MM-DD
 *   minutesPerDay: 15 | 30 | 60,
 *   level?: string,          // the learner's level now (Einstufungstest), default: exam level
 *   today: string,           // YYYY-MM-DD
 * }} input
 * @returns {{ error: "past" | "date" } | { days: { date: string, week: number, items: object[] }[], examDate: string, sittings: number }}
 */
export function buildPlan({ exam, date, minutesPerDay, level, today }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return { error: "date" };
  const start = parse(today);
  const end = parse(date);
  const span = Math.round((end - start) / DAY); // study days before the exam day
  if (span < 1) return { error: "past" };

  // Full sittings, counted back from the exam: the last one 4 days before (3 if the plan is
  // shorter, none on the last day), then one every 7 days while there is room.
  const sittingAt = new Set();
  const last = span >= 5 ? span - 4 : span >= 4 ? span - 3 : -1;
  for (let d = last; d >= 0; d -= 7) sittingAt.add(d);
  const sittingDays = [...sittingAt].sort((a, b) => a - b);

  // Which set each sitting uses: the free ones first, paid ones after; a learner without
  // the paid ones gets a free set again (the page shows the lock on paid items).
  const free = exam.sets.filter((s) => !s.paid);
  const paid = exam.sets.filter((s) => s.paid);
  const order = [...free, ...paid];

  // Grammar from the learner's level up to the exam's, in Lehrplan order; Lernsets likewise.
  const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
  const from = Math.max(0, LEVELS.indexOf(level || exam.level));
  const to = Math.max(from, LEVELS.indexOf(exam.level));
  const levels = LEVELS.slice(from, to + 1);
  const grammar = levels.flatMap((l) => (exam.grammar[l] ?? []).map((g) => ({ ...g, level: l })));
  const words = levels.flatMap((l) => exam.lernsets[l] ?? []);
  let gi = 0, wi = 0;
  const per = ITEMS_PER_DAY[minutesPerDay] ?? 2;

  const days = [];
  for (let d = 0; d < span; d++) {
    const items = [];
    if (sittingAt.has(d)) {
      const n = sittingDays.indexOf(d);
      const set = order[n % Math.max(1, order.length)] ?? null;
      if (set) items.push({ kind: "sitting", label: `${exam.label}: ${set.label}`, href: set.href, paid: !!set.paid, fallback: set.paid && free[0] ? free[n % free.length] : null });
    }
    if (!items.length) {
      const pool = [];
      if (grammar.length) pool.push(() => ({ kind: "grammar", label: grammar[gi % grammar.length].name, href: grammar[gi++ % grammar.length].href }));
      if (words.length) pool.push(() => ({ kind: "words", label: `Wortschatz: ${words[wi % words.length].title}`, href: words[wi++ % words.length].href }));
      if (d % 3 === 2) pool.push(() => ({ kind: "aussprache", label: "Aussprache-Check: 5 Sätze laut lesen", href: "/aussprache-check" }));
      for (let k = 0; k < per && pool.length; k++) items.push(pool[k % pool.length]());
    }
    days.push({ date: ymd(start + d * DAY), week: Math.floor(d / 7) + 1, items });
  }
  return { days, examDate: date, sittings: sittingDays.length };
}

/** An .ics calendar: one all-day event per study day, the exam as its own event. */
export function planToIcs(plan, { examLabel, site = "https://englishacademy.com" }) {
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const d8 = (s) => s.replaceAll("-", "");
  const next = (s) => ymd(parse(s) + DAY);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  // RFC 5545: lines of at most 75 octets (not characters — umlauts are two), continued
  // with a leading space.
  const fold = (line) => {
    const out = [];
    let cur = "", bytes = 0;
    for (const ch of line) {
      const n = new TextEncoder().encode(ch).length;
      if (bytes + n > (out.length ? 74 : 75)) {
        out.push(cur);
        cur = "";
        bytes = 0;
      }
      cur += ch;
      bytes += n;
    }
    return [...out, cur].join("\r\n ");
  };
  const ev = (date, summary, description, uid) =>
    ["BEGIN:VEVENT", `UID:${uid}@englishacademy.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d8(date)}`, `DTEND;VALUE=DATE:${d8(next(date))}`, fold(`SUMMARY:${esc(summary)}`), fold(`DESCRIPTION:${esc(description)}`), "TRANSP:TRANSPARENT", "END:VEVENT"].join("\r\n");
  const events = plan.days
    .filter((d) => d.items.length)
    .map((d) => ev(d.date, `Deutsch: ${d.items.map((i) => i.label).join(" · ")}`, d.items.map((i) => `${i.label}: ${site}${i.href}`).join("\n"), `plan-${d.date}`));
  events.push(ev(plan.examDate, `Prüfung: ${examLabel}`, "Viel Erfolg!", `exam-${plan.examDate}`));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EnglishAcademy//Pruefungsplan//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events, "END:VCALENDAR", ""].join("\r\n");
}
