// Display names of the exams behind the generic practice sets. The slot ids stay goethe/telc
// (routes and storage keys); the exams they hold are Cambridge English and Trinity ISE
// (docs/content-plan.md §2). Kept apart from saetze.js so the /progress registry can use
// the names without bundling the sets.
export const EXAM_NAMES = { goethe: "Cambridge English", telc: "Trinity ISE" };

/** The exam's own name for one level, e.g. "B1 Preliminary", "ISE I". */
const LEVEL_NAMES = {
  goethe: { A2: "A2 Key", B1: "B1 Preliminary", B2: "B2 First", C1: "C1 Advanced" },
  telc: { A2: "ISE Foundation", B1: "ISE I", B2: "ISE II", C1: "ISE III" },
};

/** "Cambridge B1 Preliminary", "Trinity ISE I"; falls back to "<exam> <level>". */
export function examLabel(set) {
  const own = LEVEL_NAMES[set.exam]?.[set.level];
  if (!own) return `${EXAM_NAMES[set.exam] ?? set.exam} ${set.level}`;
  return set.exam === "goethe" ? `Cambridge ${own}` : `Trinity ${own}`;
}
