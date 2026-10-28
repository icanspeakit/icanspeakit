// The verb tables behind /grammatik/verben (the "Mini-Grammatik") and the search lens's
// "Verbtabelle" hits. Data: src/data/verbtabellen.json.
//
// A regular verb is stored as `regular: true` and its forms are worked out here. Every form
// that differs from what the regular pattern would give is flagged `x`, so the table can
// highlight exactly the part a learner has to memorise (du fährst, er hat, ich ging).
import data from "../data/verbtabellen.json";
import { all } from "./lexicon.js";

export const PERSONS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];
const AUX = {
  haben: ["habe", "hast", "hat", "haben", "habt", "haben"],
  sein: ["bin", "bist", "ist", "sind", "seid", "sind"],
};

const stemOf = (inf) => inf.replace(/e?n$/, "");
// arbeit-e-st, find-e-t; heiß-t, sitz-t.
export function regularPraes(inf) {
  const s = stemOf(inf);
  const e = /[td]$/.test(s) ? "e" : "";
  const du = /[sßzx]$/.test(s) ? "t" : `${e}st`;
  return [`${s}e`, `${s}${du}`, `${s}${e}t`, inf, `${s}${e}t`, inf];
}
export function regularPraet(inf) {
  const s = stemOf(inf);
  const t = /[td]$/.test(s) ? "ete" : "te";
  return [`${s}${t}`, `${s}${t}st`, `${s}${t}`, `${s}${t}n`, `${s}${t}t`, `${s}${t}n`];
}
export const regularP2 = (inf) => `ge${stemOf(inf)}${/[td]$/.test(stemOf(inf)) ? "et" : "t"}`;

const split = (s) => s.split(",").map((f) => f.trim());

const glossOf = (() => {
  let map;
  return (inf) => {
    map ??= new Map(all().filter((w) => w.pos === "verb").map((w) => [w.lemma, w]));
    return map.get(inf);
  };
})();

function build(v) {
  const praes = v.regular ? regularPraes(v.inf) : split(v.praes);
  const praet = v.regular ? regularPraet(v.inf) : split(v.praet);
  const aux = v.aux ?? "haben";
  const p2 = v.p2 ?? regularP2(v.inf);
  // A separable verb is compared on its base verb: "stehe auf" against stehen.
  const prefix = v.group === "trennbar" ? praes[0].split(" ")[1] : "";
  const base = prefix ? v.inf.slice(prefix.length) : v.inf;
  const head = (f) => f.split(" ")[0];
  const rp = regularPraes(base);
  const rt = regularPraet(base);
  const lex = glossOf(v.inf);
  return {
    ...v,
    id: v.inf.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss"),
    en: lex?.en ?? "",
    level: lex?.level ?? "",
    lex,
    aux,
    p2,
    rows: PERSONS.map((pron, i) => ({
      pron,
      praes: { f: praes[i], x: head(praes[i]) !== rp[i] },
      praet: { f: praet[i], x: head(praet[i]) !== rt[i] },
      perf: { f: `${AUX[aux][i]} ${p2}`, x: aux === "sein" || p2 !== prefix + regularP2(base) },
    })),
    futur: `werde ${v.inf}`,
  };
}

export const groups = data.groups;
export const verbs = data.verbs.map(build);

export const verbHref = (v) => `/grammatik/verben#${v.id}`;
