// One static file per fetched flashcard language: { "<word id>": "<gloss>" } for every
// lexicon word. The trainer loads it the first time the language is chosen — see
// src/lib/glossen.js for why these languages are not inlined into the deck pages.
import type { APIRoute, GetStaticPaths } from "astro";
import { all } from "../../../lib/lexicon.js";
import { FETCHED_GLOSS_LANGS, glossTable } from "../../../lib/glossen.js";

export const getStaticPaths: GetStaticPaths = () => FETCHED_GLOSS_LANGS.map((lang) => ({ params: { lang } }));

export const GET: APIRoute = ({ params }) => {
  const table = glossTable(params.lang as string);
  const out: Record<string, string> = {};
  for (const e of all() as { id: string }[]) if (table[e.id]) out[e.id] = table[e.id];
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
