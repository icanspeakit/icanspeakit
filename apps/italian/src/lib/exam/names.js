// Display names of the exams behind the generic practice sets. The slot ids stay goethe/telc
// (routes and storage keys); the exams they hold are the DELE and practice for the SIELE by
// level (docs/content-plan.md §2). Kept apart from saetze.js so the /progress registry can use
// the names without bundling the sets.
export const EXAM_NAMES = { goethe: "DELE", telc: "SIELE" };

/** "DELE B1", "SIELE B1". Each DELE diploma is named after its level. */
export function examLabel(set) {
  return `${EXAM_NAMES[set.exam] ?? set.exam} ${set.level}`;
}
