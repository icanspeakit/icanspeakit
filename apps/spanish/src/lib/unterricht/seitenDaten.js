// What the lesson pages embed for the browser, built at build time: the teacher's
// /teachers/lesson and the learner's /lesson make the very same Stunde from it.
//   levels      planLevels(): per level its blocks, grammar links, Wortliste, game, videos
//   bilder      Einstieg photos: niveau → per block { src (without -<width>.<ext>), alt, credit } or null
//   themen      per grammar topic href: up to three example sentences (aktiv.listen), three gap
//               sentences (first fill exercise) and `total`, its checkable tasks (Üben's goal)
//   wortfelder  Wortschatz step: per Wortfeld a task and its words, with article, plural and
//               example where the A1 list has them (src/data/unterricht-wortschatz.json)
import { planLevels } from "../stundenplanLinks.js";
import { totalOf } from "../liveUebung/protocol.js";
import { topicPath } from "../routes.js";
import einstiegBilder from "../../data/einstieg-bilder.json";
import szenen from "../../data/wortschatz-szenen.manifest.json";
import wortfelderRoh from "../../data/unterricht-wortschatz.json";
import lexA1 from "../../content/lexicon/a1.json";

const LIBRARIES = { pexels: "Pexels", pixabay: "Pixabay" };

export function unterrichtDaten() {
  const levels = planLevels();
  const bilder = Object.fromEntries(
    Object.entries(einstiegBilder).filter(([k]) => !k.startsWith("_")).map(([niveau, ids]) => [
      niveau,
      ids.map((id) => {
        const b = id ? szenen[id] : null;
        if (!b) return null;
        const lib = b.source ? LIBRARIES[b.source] : null;
        return {
          src: `/assets/szenen/opt/${id}`,
          alt: b.alt,
          credit: lib ? { label: b.photographer ? `${b.photographer} / ${lib}` : lib, href: b.pageURL ?? "" } : null,
        };
      }),
    ]),
  );

  const workspaces = Object.values(import.meta.glob("../../data/grammatik/*.json", { eager: true })).map((m) => m.default ?? m);
  const hrefs = new Set(levels.flatMap((l) => l.blocks.flatMap((b) => b.grammar.flat().map((x) => x.href))));
  const themen = Object.fromEntries(workspaces.filter((w) => hrefs.has(topicPath(w.slug ?? w.id))).map((w) => {
    const fill = (w.exercises ?? []).find((e) => e.type === "fill" && e.items?.length);
    return [topicPath(w.slug ?? w.id), {
      ex: (w.aktiv?.listen ?? []).map((x) => x.text).filter(Boolean).slice(0, 3),
      quiz: (fill?.items ?? []).filter((i) => String(i.prompt).includes("___") && i.answer?.length)
        .slice(0, 3).map((i) => ({ prompt: i.prompt, answer: i.answer[0] })),
      total: (w.exercises ?? []).reduce((n, e) => n + totalOf(e), 0),
    }];
  }));

  const lexikon = new Map(lexA1.units.flatMap((u) => u.words).map((w) => [w.lemma, w]));
  const wortfelder = Object.fromEntries(Object.entries(wortfelderRoh).filter(([, f]) => f?.woerter).map(([feld, f]) => [feld, {
    aufgabe: f.aufgabe,
    woerter: f.woerter.map((t) => {
      // "la carta": a noun written with its article. The article is split off only when the rest
      // is an A1 word, so phrases like "una botella de agua" or "la semana pasada" stay whole.
      const [, artikel, wort] = /^(el|la|los|las) (\S.*)$/.exec(t) ?? [, null, t];
      const w = lexikon.get(t) ?? lexikon.get(wort);
      return w
        ? { text: w.lemma, artikel: w.gender ?? artikel, plural: w.plural ?? null, beispiel: w.example ?? null }
        : { text: t, artikel: null };
    }),
  }]));

  return { levels, bilder, themen, wortfelder };
}
