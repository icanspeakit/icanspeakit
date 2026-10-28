// The lexicon's flashcards per level, for a teacher's saved card set (Vokabeln vom Foto):
// /lehrkraefte/karten/lernen loads the set at runtime and takes each known word's card from
// here, so it plays exactly like the public decks (audio, picture, every language, SRS by id).
//   /lehrkraefte/karten/lexikon/index.json   { <lexicon id>: "a1" | … }
//   /lehrkraefte/karten/lexikon/a1.json      { <lexicon id>: card }
// Public data only (the same cards /wortschatz/<level> ships); no set is read at build time.
import type { APIRoute } from "astro";
import { existsSync } from "node:fs";
import path from "node:path";
import { LEVELS, asVokabelCards } from "../../../../lib/lexicon.js";
import { satzSlug, solvedHint } from "../../../../lib/audioSlug.js";

export function getStaticPaths() {
  return [{ params: { level: "index" } }, ...LEVELS.map((l) => ({ params: { level: l.toLowerCase() } }))];
}

// Same audio checks as VokabelTrainer.astro (example, solved gap sentence, „Auf Deutsch“
// explanation): a play button only where the file exists.
const onDisk = (dir: string, text: string) => {
  const src = `/audio/${dir}/${satzSlug(text)}.mp3`;
  return existsSync(path.join(process.cwd(), "public", src)) ? src : null;
};
function withAudio(c: any) {
  const exampleAudio = c.example ? onDisk("saetze", c.example) : null;
  const solved = c.deFill && c.translations?.de ? solvedHint(c.translations.de, c.deFill) : null;
  const solvedAudio = solved ? onDisk("saetze", solved) : null;
  const de = c.translations?.de;
  const deAudio = de && !de.includes("…") ? onDisk("erklaerung", de) : null;
  return {
    ...c,
    ...(exampleAudio ? { exampleAudio } : {}),
    ...(solvedAudio ? { solvedAudio } : {}),
    ...(deAudio ? { deAudio } : {}),
  };
}

export const GET: APIRoute = ({ params }) => {
  const body =
    params.level === "index"
      ? Object.fromEntries(LEVELS.flatMap((l) => asVokabelCards({ level: l }).map((c: any) => [c.id, l.toLowerCase()])))
      : Object.fromEntries(asVokabelCards({ level: String(params.level).toUpperCase() }).map((c: any) => [c.id, withAudio(c)]));
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
};
