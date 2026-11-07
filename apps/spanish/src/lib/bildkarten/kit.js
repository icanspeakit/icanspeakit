// Shared bits for the Bildkarten drawings (src/lib/bildkarten/*.js, merged into
// src/lib/bildwoerter.js). Same house style as the Bildwörter: 100×100 grid, the crew's ink
// as a thick round outline (set by bildBody, so never write stroke="#1a2230" yourself),
// flat fills, one white highlight. Things have no faces; the Mini-Crew (miniAt) act out
// verbs, adjectives and the little words.
export const INK = "#1a2230";
/** The white highlight stroke, as on the apple: `<path d="…" ${HI} />`. */
export const HI = `stroke="#fff" fill="none" stroke-width="4" opacity=".85"`;
export { miniAt } from "../minis.js";
