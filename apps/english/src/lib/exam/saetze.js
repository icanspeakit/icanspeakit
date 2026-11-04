// The Übungssätze built on the generic engine (src/lib/exam/pruefungEngine.js): one JSON file
// per set in src/data/pruefungen/saetze/, named <exam>-<level>-<n>.json. Adding a file is the
// whole integration — its page (/cambridge/<slug>, /trinity/<slug>), the lists on the exam pages
// and the /progress registry all read this module. Plan: PRUEFUNGEN-A2-C1-TIERED-PROMPT.md.
//
// Paid sets (C1) are NOT in that folder: they live in src/paid/pruefungen/saetze/ and only
// their outline is here, from src/data/pruefungen/paid-manifest.json (title, modules, counts —
// no questions; scripts/build-paid-manifest.mjs). Such an entry has `paid: true` and no
// parts; its page loads the set from /inhalt/ after the lock check (PruefungSatz.astro).
import paidManifest from "../../data/pruefungen/paid-manifest.json";
import { examPath } from "../routes.js";

const files = import.meta.glob("../../data/pruefungen/saetze/*.json", { eager: true, import: "default" });

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const saetze = [...Object.values(files), ...paidManifest.saetze].sort(
  (a, b) => a.exam.localeCompare(b.exam) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.slug.localeCompare(b.slug),
);

export { EXAM_NAMES, examLabel } from "./names.js";

export const saetzeOf = (exam) => saetze.filter((s) => s.exam === exam);
export const hrefOf = (set) => `${examPath(set.exam)}/${set.slug}`;

/** Every part of a set, flattened, with its module beside it. */
export const partsOf = (set) => set.modules.flatMap((m) => m.parts.map((p) => ({ module: m, part: p })));

/** The ids a part scores (or, for Schreiben/Sprechen, marks as done). */
export function idsOfPart(part) {
  if (part.type === "schreiben" || part.type === "sprechen") return part.tasks.map((t) => t.id);
  return part.items.map((i) => i.id);
}

export const isScored = (part) => part.type !== "schreiben" && part.type !== "sprechen";
