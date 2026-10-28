// Every set that has a printable sheet, with the page that holds it — what the Arbeitsmappe
// (/lehrkraefte/arbeitsblaetter/mappe) can lay into one PDF and what the Live-Quiz's
// „Als Arbeitsblatt drucken“ can send there. Build time only.
//
//   w  a Lernset          → the teachers' worksheet (…/arbeitsblaetter/wortschatz/<id>)
//      a whole level (a1) → the same, words from the whole level
//      a frequency round  → the learners' print page (/wortschatz/drucken/<id>)
//      a Berufe group     → its print page (/berufe/<beruf>/<gruppe>/drucken)
//   g  a grammar topic    → the teachers' worksheet (…/arbeitsblaetter/grammatik/<slug>)
//   p  a partner or group sheet, checked ones only (…/arbeitsblaetter/partner/<id>)
//
// Ids are the Live-Quiz's: a set's id after "unit:", a chapter's key after "g-".
import { worksheetUnits, worksheetLevels } from "./wortschatz.js";
import { sheetTopics, topicSlug } from "./grammatik.js";
import { cohorts } from "../lernsets.js";
import { BERUFE } from "../berufeCore.js";
import { DECKS as BERUF_DECKS, groupsOf as berufGroups } from "../berufeWortschatz.js";
import { publicSheets } from "../partneruebungen/index.js";

let all = null;

export function printableSets() {
  all ??= [
    ...worksheetUnits().map((u) => ({ kind: "w", id: u.id, name: u.title ?? u.id, level: u.level, path: `/lehrkraefte/arbeitsblaetter/wortschatz/${u.id}` })),
    ...worksheetLevels.map((id) => ({ kind: "w", id, name: `Ganze Stufe ${id.toUpperCase()}, gemischt`, level: id.toUpperCase(), path: `/lehrkraefte/arbeitsblaetter/wortschatz/${id}` })),
    ...cohorts().map((c) => ({ kind: "w", id: c.id, name: c.lead.join(" · "), level: c.levels.join("–"), path: `/wortschatz/drucken/${c.id}` })),
    ...BERUFE.flatMap((b) => berufGroups(b.slug).map((g) => ({
      kind: "w",
      id: `berufe-${b.slug}-${g.id}`,
      name: `${g.title} (${BERUF_DECKS[b.slug]?.title.split(":")[0] ?? b.slug})`,
      level: "Beruf",
      path: `/berufe/${b.slug}/${g.id}/drucken`,
    }))),
    ...sheetTopics.map((t) => ({ kind: "g", id: topicSlug(t), name: t.name, level: t.level, path: `/lehrkraefte/arbeitsblaetter/grammatik/${topicSlug(t)}` })),
    ...publicSheets().map((s) => ({ kind: "p", id: s.id, name: s.titel, level: s.niveau, path: `/lehrkraefte/arbeitsblaetter/partner/${s.id}` })),
  ];
  return all;
}
