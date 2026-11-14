// The verb tables behind /grammar/verbs (the "mini grammar"), the search lens's verb hits, the
// worksheet and the live quiz. Data: src/data/verbtabellen.json. Generator:
// src/lib/verbtabellenCore.js, which has no Vite imports so the checker can run it too.
import data from "../data/verbtabellen.json";
import { all } from "./lexicon.js";
import { buildAll } from "./verbtabellenCore.js";

export { PERSONS, regularPraes, regularPraet, regularFut, regularP2, subjectFor } from "./verbtabellenCore.js";

const glossOf = (() => {
  let map;
  return (inf) => {
    map ??= new Map(all().filter((w) => w.pos === "verb").map((w) => [w.lemma, w]));
    return map.get(inf);
  };
})();

export const groups = data.groups;
export const verbs = buildAll(data.verbs).map((v) => {
  const lex = glossOf(v.inf);
  return { ...v, en: v.en ?? lex?.en ?? "", level: v.level ?? lex?.level ?? "", lex };
});

/** The rows to show: all of them. French has no row that a Canada mode would hide (content-plan §1.5). */
export const visibleRows = (v) => v.rows;

export const verbHref = (v) => `/grammar/verbs#${v.id}`;
