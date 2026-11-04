// Everything in the Nachschlagewerk as one flat list of entries, for the search box on
// /reference and the "Nachschlagewerk" hits in the nav search (searchIndex.js).
//
// An entry is [label, sub, href, kind, keys]: what the row says, a short preview, where it
// goes, which page it belongs to (KINDS), and extra words it is found by ("ging" for gehen),
// "|"-joined. Rows are arrays for the same reason as the lexicon rows in /suche.json.
//
// Each page is linked where it can open on the entry itself: a verb table on its #anchor,
// a noun on its case table (?wort=), a verb list filtered to the verb (?q=, read by
// grammatik/[ref].astro), a word class or a Typische-Fehler pair on its card (#id).
import { verbs, verbHref } from "./verbtabellen.js";
import { refPath } from "./routes.js";
import { fehlerPairs } from "./typischeFehler.js";
import wortarten from "../data/wortarten.json";
import starkSchwach from "../data/nachschlagen/starke-schwache-verben.json";
import trennbar from "../data/nachschlagen/trennbare-verben.json";
import verbPraep from "../data/nachschlagen/verben-mit-praepositionen.json";

export const KINDS = {
  verb: "Verb table",
  nomen: "Nouns",
  stark: "Regular and irregular verbs",
  trennbar: "Reflexive and pronominal verbs",
  praep: "Verbs with prepositions",
  wortart: "Parts of speech",
  fehler: "Common mistakes",
};

const LISTS = [
  ["stark", "starke-schwache-verben", starkSchwach],
  ["trennbar", "trennbare-verben", trennbar],
  ["praep", "verben-mit-praepositionen", verbPraep],
];
// "[an]|rufen" → "anrufen": the stress and split marks are for the list's own display.
const plain = (s) => s.replace(/[[\]|]/g, "");
const strip = (s) => s.replace(/<[^>]+>/g, "");

/** Verbs, reference lists, parts of speech and common mistakes. (The noun rows pointed at the
 *  German declension tables, dropped by the `cleanup` run; `opts` is kept for old callers.) */
export function nachschlagenEntries(_opts = {}) {
  const out = [];
  for (const v of verbs) {
    out.push([v.inf, `${v.rows[2].praes.f} · ${v.rows[2].praet.f} · ${v.rows[2].perf.f}`, verbHref(v), "verb", v.forms.join("|")]);
  }
  for (const [kind, ref, data] of LISTS) {
    for (const s of data.sections) {
      for (const it of s.items) {
        if (typeof it === "string") continue;
        const label = plain(it[0]);
        out.push([label, it[1] ?? "", `${refPath(ref)}?q=${encodeURIComponent(label)}`, kind, ""]);
      }
    }
  }
  for (const c of wortarten.classes) {
    out.push([c.name, c.also ?? "", `/grammar/parts-of-speech#${c.id}`, "wortart", c.also ?? ""]);
  }
  for (const p of fehlerPairs) {
    out.push([`${p.a.w} or ${p.b.w}`, strip(p.why ?? ""), `/grammar/common-mistakes#${p.id}`, "fehler", ""]);
  }
  return out;
}
