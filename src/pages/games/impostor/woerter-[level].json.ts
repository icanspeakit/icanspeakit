// The word sets of Bruno sucht den Hochstapler, one static file per level, written at build
// time from the lexicon (src/lib/hochstapler/themes.js). Party mode and the projector fetch
// the level they play, once.
import type { APIRoute, GetStaticPaths } from "astro";
import { LEVELS, themesFor } from "../../../lib/hochstapler/themes.js";

export const getStaticPaths: GetStaticPaths = () =>
  LEVELS.map((level: string) => ({ params: { level: level.toLowerCase() }, props: { level } }));

export const GET: APIRoute = ({ props }) => {
  const level = (props as { level: string }).level;
  return new Response(JSON.stringify({ level, themes: themesFor(level) }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
