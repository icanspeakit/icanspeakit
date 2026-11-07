// The Business Spanish units as pages see them: every src/data/business-spanish/*.json, found by
// Vite at build time, in reading order. Rules of the format: src/lib/businessSpanish.js.
import { byOrder, businessDeck } from "./businessSpanish.js";

const modules = import.meta.glob("../data/business-spanish/*.json", { eager: true, import: "default" });

export const UNITS = byOrder(Object.values(modules));
export const unitById = (id) => UNITS.find((u) => u.id === id);
/** The berufe-format deck the trainer and the print sheet read. */
export const BUSINESS_DECK = businessDeck(UNITS);
