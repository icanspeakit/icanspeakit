// The verb tables behind /grammatik/verben (the "mini grammar") and the search lens's
// verb-table hits. Data: src/data/verbtabellen.json.
//
// A regular verb is stored as `regular: true` and its forms are worked out here. Every form
// that differs from what the regular pattern would give is flagged `x`, so the table can
// highlight exactly the part a learner has to memorise (he has, I went, she has gone).
import data from "../data/verbtabellen.json";
import { all } from "./lexicon.js";

export const PERSONS = ["I", "you", "he/she/it", "we", "you", "they"];
const AUX = {
  have: ["have", "have", "has", "have", "have", "have"],
};

// he/she/it: -es after s, sh, ch, x, z, o (watches, goes); consonant + y → -ies (studies).
export const thirdPerson = (inf) =>
  /[^aeiou]y$/.test(inf) ? `${inf.slice(0, -1)}ies` : /(s|sh|ch|x|z|o)$/.test(inf) ? `${inf}es` : `${inf}s`;
// -ed: -e → -d (liked); consonant + y → -ied (studied); one vowel + one consonant in a
// one-syllable verb doubles it (stopped); British English doubles a final l after a single
// vowel (travelled). Verbs with stress-driven doubling (prefer) are not stored as regular.
export function pastEd(inf) {
  if (/e$/.test(inf)) return `${inf}d`;
  if (/[^aeiou]y$/.test(inf)) return `${inf.slice(0, -1)}ied`;
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(inf) || /[^aeiou][aeiou]l$/.test(inf)) return `${inf}${inf.slice(-1)}ed`;
  return `${inf}ed`;
}
export function regularPraes(inf) {
  return [inf, inf, thirdPerson(inf), inf, inf, inf];
}
export function regularPraet(inf) {
  return Array(6).fill(pastEd(inf));
}
export const regularP2 = (inf) => pastEd(inf);

const split = (s) => s.split(",").map((f) => f.trim());

const glossOf = (() => {
  let map;
  return (inf) => {
    map ??= new Map(all().filter((w) => w.pos === "verb").map((w) => [w.lemma, w]));
    return map.get(inf);
  };
})();

function build(v) {
  // A phrasal verb is compared on its verb: "gets up" against get. The particle is
  // everything after the first word.
  const [base, ...rest] = v.inf.split(" ");
  const particle = v.group === "trennbar" ? rest.join(" ") : "";
  const verb = particle ? base : v.inf;
  const withParticle = (f) => (particle ? `${f} ${particle}` : f);
  const praes = v.regular ? regularPraes(verb).map(withParticle) : split(v.praes);
  const praet = v.regular ? regularPraet(verb).map(withParticle) : split(v.praet);
  const aux = v.aux ?? "have";
  const p2 = v.p2 ?? withParticle(regularP2(verb));
  const rp = regularPraes(verb).map(withParticle);
  const rt = regularPraet(verb).map(withParticle);
  const lex = glossOf(v.inf);
  return {
    ...v,
    id: v.inf.toLowerCase().replace(/\s+/g, "-"),
    en: lex?.en ?? "",
    level: lex?.level ?? "",
    lex,
    aux,
    p2,
    rows: PERSONS.map((pron, i) => ({
      pron,
      praes: { f: praes[i], x: praes[i] !== rp[i] },
      praet: { f: praet[i], x: praet[i] !== rt[i] },
      perf: { f: `${AUX[aux][i]} ${p2}`, x: p2 !== withParticle(regularP2(verb)) },
    })),
    futur: `will ${v.inf}`,
  };
}

export const groups = data.groups;
export const verbs = data.verbs.map(build);

export const verbHref = (v) => `/grammatik/verben#${v.id}`;
