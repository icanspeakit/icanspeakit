// Display names of the exams behind the generic practice sets. The slot ids stay goethe/telc
// (routes and storage keys); the `goethe` slot holds the DELF (A1–B2) and the DALF (C1, C2),
// the `telc` slot holds practice by level for the TCF (docs/content-plan.md §2). Kept apart
// from saetze.js so the /progress registry can use the names without bundling the sets.
export const EXAM_NAMES = { goethe: "DELF", telc: "TCF" };

/** "DELF B1", "DALF C1", "TCF B1". The diploma changes its name at C1. */
export function examLabel(set) {
  if (set.exam === "goethe") return `${/^C/.test(set.level) ? "DALF" : "DELF"} ${set.level}`;
  return `${EXAM_NAMES[set.exam] ?? set.exam} ${set.level}`;
}
