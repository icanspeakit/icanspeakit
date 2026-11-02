# Run report: `grammar-a2`

Run date: 2026-10-29 (unattended, `automation/run-next.ps1`). Branch `content`. Not pushed.

## What was done

All 19 A2 slots of `docs/content-plan.md` §3 are now English A2 grammar topics. They keep the
same ids and schema. (`welcher-dieser` moved to A1 and was done by `grammar-a1`.) Every rule
card, reference table, box, comic, the `aktiv` part (listen / hear / speak) and every exercise
was written new in English. The explanations are in British English at A1–A2 level, with
varied international names. The `grammatik.json` quick quizzes for `dativ` and
`trennbare-verben` are English too, and so is the UI of the "furnish a room" exercise.

| Slot | English topic | `status` (unchanged) | Exercises (German → English) | Types |
|---|---|---|---|---|
| `konjugation` | Present continuous (and simple vs continuous) | (none) | 5 → 5 | table, table, table, fill, match |
| `perfekt` | Past simple | (none) | 5 → 6 | table, table, match, fill, story, build |
| `modalverben` | Modal verbs: can, must, have to, should | (none) | 5 → 6 | fill, match, table, table, story, build |
| `komparativ-superlativ` | Comparatives and superlatives | geprueft | 7 → 7 | table, table, fill, fill, match, story, build |
| `lokale-praepositionen` | Prepositions of place | geprueft | 6 → 6 | table, table, fill, match, story, build |
| `wechselpraepositionen` | Prepositions of movement | (none) | 7 → 7 | fill, table, fill, match, story, build, zimmer |
| `dativ` | Verbs with two objects | entwurf | 8 → 8 | table, fill, table, fill, fill, match, story, build |
| `indefinitpronomen` | some, any, no and somebody, anything, nowhere | entwurf | 7 → 6 | fill, table, fill, match, story, build |
| `satzstellung` | Countable and uncountable: much, many, a few, a little | (none) | 4 → 5 | build, fill, table, table, match |
| `negation` | Negatives | (none) | 4 → 6 | fill, table, table, fill, build, match |
| `nebensaetze-weil-dass` | because, so and that | geprueft | 6 → 6 | fill, table, match, table, story, build |
| `konjunktiv2-hoeflich` | Polite requests and offers | entwurf | 6 → 7 | fill, fill, fill, match, table, story, build |
| `positionsadverbien` | Adverbs of frequency | geprueft | 7 → 7 | fill, match, table, fill, fill, story, build |
| `adjektivdeklination-a2` | Adverbs of manner | geprueft | 5 → 5 | fill, match, table, story, build |
| `artikel-oder-nicht` | *the* or no article | geprueft | 6 → 6 | fill, match, table, story, build, fill |
| `reflexive-verben` | Reflexive pronouns and *each other* | geprueft | 6 → 6 | table, fill, match, table, story, build |
| `trennbare-verben` | Phrasal verbs: the basics | entwurf | 7 → 7 | fill, match, table, table, table, story, build |
| `komposita` | Compound nouns | geprueft | 6 → 7 | table, match, fill, fill, fill, story, build |
| `ordinalzahlen` | Ordinal numbers and dates | geprueft | 6 → 7 | fill, table, fill, fill, table, story, build |

Commits (all `content(grammar-a2): …`):

| Commit | What |
|---|---|
| `a8f77de` | `grammatik.json`: quick quizzes for `dativ` (two objects) and `trennbare-verben` (phrasal verbs) |
| `82e7d2b` | `zimmerUebung.js` / `zimmerSaetze.js`: English thing names, "Where to?" / "Where?" labels, English fallbacks, no `lang="de"`; 15 `zi.*` keys in `en.json` |
| `8bd1ebb` | konjugation, perfekt, negation |
| `3bc1eb6` | komparativ-superlativ, adjektivdeklination-a2, positionsadverbien |
| `3ffe863` | modalverben, konjunktiv2-hoeflich, nebensaetze-weil-dass |
| `51e356c` | indefinitpronomen, satzstellung, artikel-oder-nicht |
| `8ca4cf2` | reflexive-verben, trennbare-verben, komposita, ordinalzahlen |
| `4a2e0a2` | lokale-praepositionen, wechselpraepositionen (incl. the `zimmer` rounds), dativ |

Build: `pnpm build` succeeded (2438 pages; post-build leak checks OK).

## How it was done and checked

- The 19 files were written by six parallel sub-agents, three or four files each, from one
  shared brief (schema rules, how pills and stories work, quality checklist, content-plan §1/§3/§8).
  The sub-agents had no shell access. I ran every check myself and read every file item by
  item in a compact dump.
- A throwaway validator (`_tmp_a2check.mjs`, not committed, gitignored) compared each file
  with its German original at `02588e8`. It checks:
  - the same `id`/`level`/`status`;
  - all top-level, `concept.*` and `aktiv.*` keys present, except the allowed drops below;
  - the audio path pattern;
  - fill prompts with exactly one `___`;
  - every answer among its pills, and at least one right pill with the page's own `accepts()`;
  - unique match pairs;
  - story blank numbering, and no full-stop abbreviations (they split story rows);
  - build `shuffled` and `alt` as permutations;
  - the `zimmer` groups;
  - balanced `{}` marks;
  - straight apostrophes in answers;
  - a German-word heuristic.

  The result is 0 errors on all 19 files. The remaining warnings are intended: build ids
  extended with new ids of the same prefix, listed alternatives, meaning-choice hearing items,
  and the English word "Verb" caught by the German regex.
- Audio paths were regenerated from the text with `_tmp_a2audio.mjs` (same convention as A1:
  `/audio/grammatik/<id>/<kebab>.mp3`, answers `--a`). The files don't exist yet (TTS later).
- `scripts/check-pillen.mjs`: 0 errors, 0 to check. `scripts/check-einfach-pfad.mjs`: only
  the 31 known "audio file does not exist" findings (the A2 units of the path are draft
  outlines without tasks, so no refs broke).
- Fixed during my review:
  - perfekt: "the food was too hot" → "too spicy".
  - modalverben: "They must enter here" → "You must open the door"; the build "Can you help me please" (no comma) → "Can you please help me?".
  - konjunktiv2-hoeflich: speaker labels (Guest / Receptionist) in the hotel dialogue story; a build without its comma.
  - nebensaetze-weil-dass: the message story rewritten, because "sad because of the job" was unnatural; now "busy because of the summer sale". Clearer hint.
  - positionsadverbien: "I can always call you" → "You can always call me".
  - indefinitpronomen: unnatural "He went nowhere / We saw nobody / They are going nowhere" replaced.
  - satzstellung: "They've got some children → How many children…" replaced.
  - artikel-oder-nicht: a mid-sentence gap answered "The" → "the".
  - trennbare-verben: a missing space before a gap; "at once" → "straight away"; "sit down on this chair" → "bench"; a wrong build hint.
  - ordinalzahlen: a hint that promised figures the prompts didn't have; a contradictory build hint; an awkward comic line.

## Decisions

1. **`status` kept per file**, as in content-plan §1.4 (changed by `grammar-a1`): 9
   `geprueft`, 5 `entwurf`, 5 without status (= reviewed). **Edgar: the "reviewed" ones
   were reviewed in German, not in English.**
2. **Keys removed** (German-only drawings or hard-coded German labels):
   - `wechselpraepositionen`: `concept.pictures` ("verbpaare"), `concept.caseMap` (Venn diagram labelled "immer Dativ"), `concept.comicRule` (renders "Wohin?/Wo?").
   - `satzstellung`: `concept.pictures` ("satzrahmen").
   - `adjektivdeklination-a2`: `concept.signal` and `subtitleMarked`.
   - `artikel-oder-nicht`: `briefHtml` was kept but rewritten without `lang="de"`; `scenes` keep their `variant` CSS values (`none`/`ein`/`der`) with forms "—", "a/an", "the".
   - `komposita` and `ordinalzahlen` gained a `concept.exampleHtml`.
   - `wechselpraepositionen` table 1 keeps its `cases` tint (column colours only).
3. **The `zimmer` exercise** (furnish a room) stays on `wechselpraepositionen`. The rounds keep their `item` keys, order and placements. They are now "I [put|hang] the sofa [under|above] the window." and "The sofa [is|are] [under|above] the window." The code shows "Where to?" and "Where?". The coloured dot before a thing's name now marks singular (`sg`, no colour) or plural (`pl`) for *is / are*, instead of German gender.
4. Topic-specific choices:
   - `dativ`: "give me it" appears only as a typical mistake.
   - `trennbare-verben`: *look for* is taught as never split.
   - `satzstellung`: *a lot of* is listed as an alternative in negatives and questions, and impossible after *How*.
   - `komparativ-superlativ`: two-syllable adjectives with two forms (cleverer / more clever) are only in the note.
5. `noteHtml` cross-links use the current slot ids (`/praesens`, `/modalverben`, …); `routes` renames them later.
6. Where a gap has more than one right answer, all of them are in `answer` (*must / have to*, *can / could*, *someone / somebody*, *round / around*, *further / farther*).

## Left / for Edgar to review

- **Review all 19 topics in English**, especially the 14 that count as reviewed (decision 1).
  To take one out of the course until then, set `"status": "entwurf"`.
- **Important, outside this item: the help translations are now wrong.**
  `src/data/uebersetzungen/grammatik.json` (`entries[<id>].intro / qa[i] / note`, shown under
  each rule card by `GrammarHelpText`) still explains the **German** grammar. The built
  `/wechselpraepositionen` shows "Wohin? in + das = ins …" under the English cards, and the
  A1 topics have the same problem. These entries are matched by index, so they now sit
  under unrelated cards. `grammar-structure` owns this file. The quickest fix is to delete
  the entries of every converted topic until English help translations exist.
- Exercises that are easy because most pills are right: `konjunktiv2-hoeflich` ex 2 (*Can /
  Could / Would*). In three items only *Would* is wrong. It is correct, but weak. A per-item
  design with one clearly wrong form would be better.
- Gaps that rely on context, worth a second look: the `modalverben` swimming-pool story; the
  `indefinitpronomen` offer "Would you like ___ coffee?", which accepts only *some* (*any* is
  possible but rare); `lokale-praepositionen` in/at with buildings (avoided as gaps, explained
  in the note); `wechselpraepositionen` "past" (ex 3); `reflexive-verben` "I wash myself every
  morning", marked unusual and replaced by "I have a shower".
- `satzstellung` (now *much / many*) and `dativ` (now two objects) no longer match their
  German slot names. That is expected per the plan; `routes` gives them English slugs.
- **Code outside this item, still German:**
  - `src/lib/searchIndex.js` `KEYWORDS` lists German search terms for every grammar slot (A1 too).
  - `src/pages/praepositionen.astro` links "Wechselpräpositionen – …" (`praep.more.*` keys).
  - `src/pages/grammatik/verben.astro` has "Regel und Übungen: Konjugation".
  - `src/lib/arbeitsblatt/zimmerSzene.js` (worksheet room, `teachers`).
  - As noted by `grammar-a1`: the de-DE voice in `aktivMode.js`, and `lang="de"` on data parts in `[id].astro` and `practiceWorkspace.js`.
- `grammatik-lehrplan.json` / `grammatik-verwandt.json` still order and link the slots as in
  German (`grammar-structure`).
- The throwaway tools `_tmp_a2check.mjs`, `_tmp_a2audio.mjs`, `_tmp_a2dump.mjs` and
  `_tmp_a2brief.md` are left in the worktree (gitignored) for the B1–C1 runs to reuse: change
  the id list in `_tmp_a2check.mjs`.

Status: item complete (see the review points above).
