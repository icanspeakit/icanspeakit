# Report: `content-plan`

Date: 2026-10-28 · Branch: `content`

## What was done

- **Run 1** (commit `77fc2bf`) wrote `docs/content-plan.md`. It maps every German module to its
  English-course equivalent: global decisions (learner, variety, typography, ids, German-only
  fields), an exam map, a grammar slot map for all 90 topic files plus the 11 paid C1 files,
  the modules to drop, a module map for everything else, route renames, a queue item → files
  lookup, quality rules and open gaps.
- **Run 2** (this one) picked up the item where run 1 stopped: the plan was committed, but the
  report, the build check and the queue tick were missing. This run:
  - checked that every file in `src/data/grammatik/` and `src/paid/grammatik/` has a slot in §3
    (none missing),
  - ran `pnpm build`: it passed (2438 pages, postbuild leak checks ok),
  - wrote this report and ticked the item in `automation/QUEUE.md`.

## Key decisions (details and reasons are in the plan)

- **British English** by default; American English only appears as explicit notes.
- **No content run renames ids, slugs or files.** English content goes into the existing German
  ids. Only the `routes` item renames, once, with redirects. The new slugs are listed in §3 and §6.
  The one exception is word stories: a new file per English lemma.
- German-only fields keep their keys with a new meaning. The most important one: noun `gender`
  (der/die/das) becomes `a` / `an` / `some`, so the article trainers turn into a/an/uncountable trainers.
- Exams: Start Deutsch 1 → an unbranded A1 test; Goethe → Cambridge (A2 Key / B1 Preliminary / B2 First);
  telc → Trinity ISE; telc Sprachbausteine → B2 First Use of English; DTZ → Trinity ISE I mock;
  TestDaF → IELTS Academic; Leben in Deutschland → Life in the UK.
- Dropped: Führerschein and the driving games, politics, tax havens, the beer map, and the
  German case/declension pages and chart.

## For Edgar to review

1. Trinity ISE for the telc and DTZ slots (§2). The alternative is to drop the telc slot.
2. British English as the default (§1.1).
3. The fictional town name *Brambleford* for the Lindenau RPG (§5.9).
4. Dropping Führerschein and politics (§4).
5. Gaps with no queue item yet: the C1/C2 lexicon and English for work (`data/berufe/`). §9
   suggests the items `vocab-c1` and `english-for-work`.

## Uncertain / left open

- Before anything about Trinity ISE's SELT (UK visa) status goes on a page, the `exams` run
  must check it against trinitycollege.com.
- `welcher-dieser` sits in the A2 table but its new level is A1 (*this/that*). `grammar-a1`
  owns it, because items are assigned by new level (§7).
