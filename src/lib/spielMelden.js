// "Problem melden" in the games (docs/problem-melden-tier0-v1.md): one quiet link on the pause
// and end screens, ref s:<game>. A round has no single item to point at, so the snapshot
// carries the round (level, mode, the last word, what was missed) and the learner names the
// word in the comment, as meldung.js asks everywhere else.
import { meldenLink } from "./meldung.js";
import { cleanRef } from "./meldungRef.js";

const target = (game, context) => ({
  ref: cleanRef(`s:${game}`),
  snapshot: () => ({ spiel: game, ...(context?.() ?? {}) }),
});

/** The link in its row, for screens painted with innerHTML. */
export function spielMeldenRow(game, context) {
  const row = document.createElement("div");
  row.className = "mf-row mf-row--spiel";
  row.append(meldenLink(() => target(game, context)));
  return row;
}

/** Fills every empty [data-melden] slot inside `root` with the link. */
export function spielMelden(root, game, context) {
  for (const slot of root.querySelectorAll("[data-melden]")) {
    if (!slot.firstChild) slot.replaceWith(spielMeldenRow(game, context));
  }
}
