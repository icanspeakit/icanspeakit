# Run report: `placement-test`

Run date: 2026-10-29. Branch `content`. Follows docs/content-plan.md §5.1.

## What I did

1. **`src/data/einstufung.json`**: replaced the 24 German items (A1–B2) with 30 English
   items, six per level, **A1–C1**. Same schema (`note`, `levels.<LEVEL>[] = {prompt, options,
   answer}`), three options each, one correct. The `note` is now English and documents the
   design. Features tested, one per item:
   - **A1**: *be* (is), present simple 3rd person *-s*, *an* before a vowel sound, *Do* questions,
     irregular plural (*children*), *What is your name?*
   - **A2**: past simple with *last summer*, comparative *bigger*, *going to* for evidence,
     *on Monday*, *any* in questions, present continuous
   - **B1**: present perfect + *since*, first conditional, second conditional, past passive,
     relative *who*, *used to*
   - **B2**: third conditional, reported question word order, *must have* (past deduction),
     *wish* + past perfect, *so … that*, *be used to* + *-ing*
   - **C1**: negative inversion (*Never have I seen*), *what*-cleft, perfect participle clause,
     mixed conditional, distancing (*is said to have lost*), *it's high time* + past
2. **`src/pages/einstufungstest.astro`**: the test now climbs to C1. It used `NAV_LEVELS`
   (A1–B2, the menu levels); it now uses its own list `A1…C1`, filtered by levels that have
   items. Max ten questions. English title/description ("A1 to C1"), English fallback text,
   C1 result blurb.
3. **`public/i18n/en.json`**: `placement.lead.C1` (new), `placement.intro` and
   `fold.unsureTest` say "ten questions", `tool.einstufung.desc` says "A1 to C1".
4. **`src/lib/catalog.js`**, **`src/components/LevelFold.astro`**: English fallbacks for the
   same strings (the count itself is computed from the data: 2 × 5 = 10).

## Decisions

- **Distractors are real learner errors** (*a idea, more big, If I would have, use to,
  I'm not used to drive, did I live* in reported questions), as in the German version.
- **Avoided options a native speaker could accept** in some context: no *some* in the
  *any* question, no *that* next to *who*, no un-backshifted reported statement, no zero
  conditional option next to *will stay*, no *the* next to *an*.
- **Straight apostrophe** everywhere (the page compares the clicked text with the answer
  exactly; content-plan §1.2).
- **A1 set stays six items**: `/einfach` uses the whole A1 set as its quick check.
- British English (*holiday, flat*-style vocabulary; *drive on the left*), no names of
  real companies or people.

## Checks

- Every answer is in its options, no duplicate options (node one-liner).
- `node scripts/check-inhalte.mjs`: no findings for `einstufung`.
- `pnpm build`: succeeded (2438 pages, postbuild leak checks ok). Built
  `/einstufungstest` contains banks A1–C1 and `data-levels` A1–C1.

## For Edgar to review / left over

- **C1 result links**: "Start grammar" → `/grammatik#niveau-c1` (C1 topics exist, still
  German until `grammar-c1`), "Start vocabulary" → `/wortschatz/c1` (lexicon C1 is still
  German until `vocab-c1-c2`). Both links resolve; the content behind them is not English yet.
- **`src/data/quakiSpringt/fragen.json`** has copies of the old German placement items
  (`id: einstufung-*`, `src: "einstufung"`). Not touched: that file belongs to the `games`
  item, which should replace them (it can copy from the new `einstufung.json`).
- The class placement test for teachers (`src/lib/klassentest/*`, `art: "einstufung"`) does
  not read `einstufung.json`; its question source is the `teachers`/grammar data.
- `nextStep.js` / `lernen.js` read `da-einstufung` and already handle `C1`; nothing changed
  there. Pages that show only A1–B2 (NAV_LEVELS) still do; a C1 result shows correctly on
  the result screen but there is no C1 chip in the menu.
- Not native-speaker reviewed; I checked each item for a single correct answer, but a quick
  read by a teacher is worth it, especially B2/C1.
