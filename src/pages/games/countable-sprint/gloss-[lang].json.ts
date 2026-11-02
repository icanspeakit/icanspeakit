// Bruno Kart: the meaning of every A1–B1 noun and verb in one language, { "<lexicon id>": "<meaning>" },
// for the word help and the game-over list. Loaded once when the interface language is not
// German or English (English ships with each word). Machine drafts like the rest of the lexicon's glosses.
import type { APIRoute } from "astro";
import { GLOSS_LANGS, glossesFor } from "../../../lib/artikelSprint/lexWords.js";

export function getStaticPaths() {
  return GLOSS_LANGS.map((lang: string) => ({ params: { lang } }));
}

export const GET: APIRoute = ({ params }) => {
  return new Response(JSON.stringify(glossesFor(String(params.lang))), { headers: { "content-type": "application/json; charset=utf-8" } });
};
