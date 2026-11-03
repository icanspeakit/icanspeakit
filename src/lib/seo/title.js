// Page titles for templated pages (SEO-BRAND-TIERED-PROMPT.md, Tier 2).
//
// Pattern: "<topic> – <section> – icanspeak Spanish", at most ~60 characters so Google shows it
// whole. Pass the candidates from most to least detailed; the first that fits wins. If none
// fits (the topic alone is long), the shortest candidate is used. The first " – " segment
// must stay the topic: src/lib/progress.js names the "Weitermachen" card after it.
export const BRAND = "icanspeak Spanish";
export const MAX_TITLE = 60;

export function fitTitle(...candidates) {
  const full = candidates.filter(Boolean).map((c) => `${c} – ${BRAND}`);
  return full.find((t) => t.length <= MAX_TITLE) ?? full[full.length - 1];
}
