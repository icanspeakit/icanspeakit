// One chapter's ready-made quiz questions for the builder (/teachers/quiz/create),
// written at build time — the same one-small-file-per-choice idea as the printable games'
// woerter-<level>.json. See src/lib/liveQuiz/chapters.js for what is in it.
import type { APIRoute, GetStaticPaths } from "astro";
import { chapterItems, chapterList } from "../../../lib/liveQuiz/chapters.js";

export const getStaticPaths: GetStaticPaths = () =>
  chapterList().map((c: { slug: string; name: string; level: string; kind: string }) => ({ params: { slug: c.slug }, props: c }));

export const GET: APIRoute = ({ props }) => {
  const c = props as { slug: string; name: string; level: string; kind: string };
  const body = { slug: c.slug, name: c.name, level: c.level, kind: c.kind, groups: chapterItems(c.slug) };
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
