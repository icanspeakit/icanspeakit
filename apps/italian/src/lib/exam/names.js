// Display names of the exams behind the generic practice sets. The slot ids stay goethe/telc
// (routes and storage keys); the exams they hold are CILS (goethe slot) and CELI (telc slot) by
// level (docs/content-plan.md §2). Kept apart from saetze.js so the /progress registry can use
// the names without bundling the sets.
export const EXAM_NAMES = { goethe: "CILS", telc: "CELI" };

// CELI numbering by CEFR level: Impatto = A1, CELI 1 = A2, CELI 2 = B1, CELI 3 = B2, CELI 4 = C1,
// CELI 5 = C2 (to verify on the official CVCL pages).
const CELI_NUMBER = { A2: "CELI 1", B1: "CELI 2", B2: "CELI 3", C1: "CELI 4", C2: "CELI 5" };

/** "CILS B1", "CELI 2 (B1)". Each CILS certificate is named after its level, each CELI after its number. */
export function examLabel(set) {
  if (set.exam === "telc" && CELI_NUMBER[set.level]) return CELI_NUMBER[set.level] + " (" + set.level + ")";
  return (EXAM_NAMES[set.exam] ?? set.exam) + " " + set.level;
}
