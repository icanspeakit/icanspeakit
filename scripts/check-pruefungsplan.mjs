// Tests for buildPlan() (src/lib/pruefungsplan.js). Runs in prebuild; `pnpm check:pruefungsplan`.
//   - 7 days out: one sitting, 3–5 days before the exam, not on the last day
//   - 8 weeks out: at most one sitting per week, the last one 3–5 days before
//   - a date in the past (and today): refused politely, no days
//   - every planned href is one of the inputs — the plan never invents an item
import assert from "node:assert/strict";
import { buildPlan, planToIcs } from "../src/lib/pruefungsplan.js";

const exam = {
  key: "dtz", label: "DTZ", level: "B1",
  sets: [{ label: "Übungssatz 1", href: "/trinity/ise-1/practice-set" }, { label: "Übungssatz 2", href: "/trinity/ise-1/practice-set#uebungssatz-2", paid: true }],
  grammar: { A2: [{ name: "Perfekt", href: "/past-simple" }], B1: [{ name: "Passiv", href: "/passive" }, { name: "Konjunktiv II", href: "/konjunktiv-2" }] },
  lernsets: { A2: [{ title: "Arbeit", href: "/vocabulary/a2-01" }], B1: [{ title: "Wohnen", href: "/vocabulary/b1-01" }] },
};
const known = new Set(["/pronunciation-check", ...exam.sets.map((s) => s.href), ...Object.values(exam.grammar).flat().map((g) => g.href), ...Object.values(exam.lernsets).flat().map((w) => w.href)]);
const today = "2026-10-05";
const daysBefore = (plan, d) => Math.round((Date.parse(plan.examDate) - Date.parse(d.date)) / 86_400_000);

// 7 days out
let p = buildPlan({ exam, date: "2026-10-12", minutesPerDay: 30, level: "A2", today });
assert.equal(p.days.length, 7);
let sit = p.days.filter((d) => d.items.some((i) => i.kind === "sitting"));
assert.equal(sit.length, 1, "7 days: one sitting");
assert.ok(daysBefore(p, sit[0]) >= 3 && daysBefore(p, sit[0]) <= 5, "7 days: sitting 3–5 days before");
assert.ok(!p.days.at(-1).items.some((i) => i.kind === "sitting"), "never on the last day");
assert.ok(p.days.every((d) => d.items.every((i) => known.has(i.href))), "7 days: only known items");
assert.ok(p.days.some((d) => d.items.some((i) => i.href === "/past-simple")), "starts at the learner's level");

// 8 weeks out
p = buildPlan({ exam, date: "2026-11-30", minutesPerDay: 60, level: "B1", today });
sit = p.days.filter((d) => d.items.some((i) => i.kind === "sitting"));
assert.ok(sit.length <= 8 && sit.length >= 7, `8 weeks: ${sit.length} sittings`);
for (let w = 1; w <= Math.max(...p.days.map((d) => d.week)); w++) {
  assert.ok(sit.filter((d) => d.week === w).length <= 1, `week ${w}: at most one sitting`);
}
assert.ok(daysBefore(p, sit.at(-1)) >= 3 && daysBefore(p, sit.at(-1)) <= 5, "8 weeks: last sitting 3–5 days before");
assert.ok(p.days.filter((d) => !d.items.some((i) => i.kind === "sitting")).every((d) => d.items.length === 3), "60 min: three items a day");
assert.ok(p.days.every((d) => d.items.every((i) => known.has(i.href))), "8 weeks: only known items");
assert.ok(sit.some((d) => d.items[0].paid) && sit.every((d) => !d.items[0].paid || d.items[0].fallback), "paid sets carry a free fallback");

// past and today
assert.deepEqual(buildPlan({ exam, date: "2026-10-01", minutesPerDay: 30, today }), { error: "past" });
assert.deepEqual(buildPlan({ exam, date: today, minutesPerDay: 30, today }), { error: "past" });
assert.deepEqual(buildPlan({ exam, date: "bald", minutesPerDay: 30, today }), { error: "date" });

// calendar file
const ics = planToIcs(buildPlan({ exam, date: "2026-10-12", minutesPerDay: 15, today }), { examLabel: "DTZ" });
assert.ok(ics.startsWith("BEGIN:VCALENDAR") && ics.includes("SUMMARY:Prüfung: DTZ") && ics.trim().endsWith("END:VCALENDAR"));
assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 8, "7 study days + the exam");
assert.ok(ics.split("\r\n").every((l) => Buffer.byteLength(l) <= 75), "lines folded to 75 octets");

console.log("check:pruefungsplan ok");
