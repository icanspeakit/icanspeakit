// Einstufungstest: where a student stands, from their answers. Shared by the teacher's
// results page and the phone, so both say the same.
//
// Every question of an Einstufungstest carries its level (`l`, lehrkraft.js). A level counts
// as reached with at least SCHWELLE of its questions right; the student's level is the
// highest one reached with every level below it reached too — a lucky B2 guess on top of a
// missed A2 does not make B2. None reached: „unter {first level}“. Questions without a level
// (the teacher's own) count for the score, not for the level.
//
// The ausführliche Einstufung does this per part: grammar, Lesen, Hören (graded), and
// Schreiben, which the teacher rates (bewertung.niveau). The overall level is the highest
// one that at least half of the parts reach: one weak part does not pull a student down to
// it, one strong part does not lift them.

export const SCHWELLE = 0.6;
export const ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const TEILE = ["grammatik", "lesen", "hoeren", "schreiben"];
export const teilOf = (f) => f.teil ?? "grammatik";

/** The levels a test asks, in order. */
export const stufenOf = (fragen) => ORDER.filter((l) => fragen.some((f) => f.l === l));

/** The parts a test has, in TEILE order. */
export const teileOf = (fragen) => TEILE.filter((t) => fragen.some((f) => teilOf(f) === t));

/** Per level { l, r, g } for one student's `korrekt`, over one part's questions. */
export function proStufe(fragen, korrekt, teil = "grammatik") {
  return stufenOf(fragen.filter((f) => teilOf(f) === teil)).map((l) => {
    const idx = fragen.map((f, i) => (f.l === l && teilOf(f) === teil ? i : -1)).filter((i) => i >= 0);
    return { l, r: idx.filter((i) => korrekt?.[i] === true).length, g: idx.length };
  });
}

/** { niveau: "A2" | null, unter: "A1" | null } for one part — null niveau means below its first level. */
export function einstufen(fragen, korrekt, teil = "grammatik") {
  let niveau = null;
  const stufen = proStufe(fragen, korrekt, teil);
  for (const s of stufen) {
    if (s.g && s.r / s.g >= SCHWELLE) niveau = s.l;
    else break;
  }
  return { niveau, unter: niveau ? null : stufen[0]?.l ?? null };
}

/** A level as a number to compare: „unter A1“ is -1, a missing rating undefined. */
const rang = (x) => (x == null ? undefined : x.niveau ? ORDER.indexOf(x.niveau) : -1);

/**
 * Every part's level and the overall one: { teile: { grammatik, lesen, hoeren, schreiben },
 * gesamt }, each { niveau, unter } (or null for Schreiben the teacher has not rated yet).
 * The overall level leaves an unrated Schreiben out.
 */
export function profil(fragen, korrekt, bewertung) {
  const teile = {};
  for (const teil of teileOf(fragen)) {
    if (teil === "schreiben") {
      const n = bewertung?.niveau;
      teile.schreiben = n ? (n === "unter" ? { niveau: null, unter: stufenOf(fragen)[0] ?? "A1" } : { niveau: n, unter: null }) : null;
    } else {
      teile[teil] = einstufen(fragen, korrekt, teil);
    }
  }
  const raenge = Object.values(teile).map(rang).filter((x) => x !== undefined).sort((a, b) => b - a);
  const g = raenge.length ? raenge[Math.ceil(raenge.length / 2) - 1] : undefined;
  const gesamt = g === undefined ? null : g < 0 ? { niveau: null, unter: stufenOf(fragen)[0] ?? "A1" } : { niveau: ORDER[g], unter: null };
  return { teile, gesamt };
}
