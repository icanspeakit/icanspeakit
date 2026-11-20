// Display names of the exams behind the generic practice sets. The slot id stays goethe
// (routes and storage keys); the exams it holds are the CAPLE certificates, one per level
// (docs/content-plan.md §2). The telc slot (SIELE by band) was removed by `exams-caple`.
// Kept apart from saetze.js so the /progress registry can use the names without bundling the sets.
export const EXAM_NAMES = { goethe: "CAPLE" };

/** The CAPLE certificate of each CEFR level. */
export const CAPLE_BY_LEVEL = {
  A1: "ACESSO",
  A2: "CIPLE",
  B1: "DEPLE",
  B2: "DIPLE",
  C1: "DAPLE",
  C2: "DUPLE",
};

/** "CIPLE A2", "DEPLE B1": each CAPLE certificate is named after its level. */
export function examLabel(set) {
  const name = CAPLE_BY_LEVEL[set.level] ?? EXAM_NAMES[set.exam] ?? set.exam;
  return `${name} ${set.level}`;
}
