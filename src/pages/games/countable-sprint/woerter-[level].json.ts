// Bruno Kart: the lexicon's nouns for a level, the volume behind Artikel and Plural (solo, daily
// round, challenge links and race rooms alike; words.json adds its hand-picked items on top).
//   /games/countable-sprint/woerter-a1.json  →  { nouns: [{ id, word, article, plural, english, level, audio }] }
// Loaded by main.js for the level; the wrong plural boxes are made up per gate
// (questions.js fakePlurals). Short single words only, so they fit a box on the beam
// (the filter is in src/lib/artikelSprint/lexWords.js).
import type { APIRoute } from "astro";
import { LEVELS, lexNouns } from "../../../lib/artikelSprint/lexWords.js";

export function getStaticPaths() {
  return LEVELS.map((l: string) => ({ params: { level: l.toLowerCase() } }));
}

export const GET: APIRoute = ({ params }) => {
  const nouns = lexNouns(String(params.level).toUpperCase());
  return new Response(JSON.stringify({ nouns }), { headers: { "content-type": "application/json" } });
};
