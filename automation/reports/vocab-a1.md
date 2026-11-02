# Run report: `vocab-a1`

Run: 2026-10-30 (one run, no earlier attempt). Branch `content`. Build green at the end
(`pnpm build`, 2,387 pages, postbuild checks ok).

## What was done

| Commit | What |
|---|---|
| `adcf157` | **`src/content/lexicon/a1.json` is English**: 26 units × 25 words = 650, same unit ids and topic slugs, British English. German translations in `i18n/de.json`. Every entry keyed by an old German A1 id removed from all 23 sidecars. `scripts/validate-lexicon.mjs` accepts `a/an/some` and `ipaSource: "authored"`. |
| `6015155` | `content/program.json`: English A1 level title, subtitle, 8 module titles, 26 unit titles. `wortschatz-szenen.json`: English titles and alt texts for the A1 scene photos. The alt texts were also copied into `wortschatz-szenen.manifest.json` (only the `alt` fields; that is what `hubs:build` would write, and the page reads the manifest). Dev seed title. |
| `a3bb822` | `wort-bilder.json`: the 224 German A1 ids removed, 215 English A1 ids added (all with an existing OpenMoji SVG). German A2+ ids stay. |
| `43d4d33` | `wortschatz.json` (15 phrase cards): English phrases, `note` = short usage tip in simple English, `en` = plain-English paraphrase, `de` = German translation; ar/uk/ru/tr rewritten for the English phrase. |
| `eef704b` | `scripts/attach-ranks.mjs` ranks an English level against the English list (`en_50k`) and a German level against `de_50k`. `scripts/haeufigste-woerter.mjs` builds the English top 30. **Neither was run** (see “Open”). |
| `989514f` | `bildkarten.json` (picture-card page `/wissen/bildwoerterbuch`): English A1 ids, 100 cards, plus a `drawings` map, because the drawings in `src/lib/bildwoerter.js` are still named by German id. The page now uses that map and marks words `lang="en"`. |
| `e708992` | `uebersetzungen/woerter-uk.json`: 79 Ukrainian glosses moved from German A1 ids to the English A1 id with the same meaning (a few narrowed to the English sense). 10 without an A1 match dropped (einkaufen, werden, holen, kennen, ärgern, wohin, woher, an, stellen, setzen). |
| `a95adde` | `data/lernsets/` review export regenerated (`node scripts/extract-lernsets.mjs`). The A2–B2 parts change too, because the export was already out of date before this run. |
| `a5f18a5` | **Build fix.** The German profession decks (`src/data/berufe/*.json`) point at German lexicon ids with `ref`. 96 refs pointed at old A1 ids, and the build crashed. `src/lib/lexicon.js` now exports `ENGLISH_LEVELS` (levels whose nouns carry a/an/some). `berufeRows.js` / `berufeWortschatz.js` drop a lexicon ref that is gone or resolves into an English level. |
| `0fb10a6` | `docs/content-plan.md` §1.4, §4, §5.2 and `i18n/README.md` record the conventions below. `check-erklaerungen.mjs` skips English levels. |
| `70eb91b` | Unit a1-09 renamed “Body & how you feel” (it repeated its module title). |

### The A1 units

Personal details & introductions · Family & relationships · Feelings · House & rooms ·
Furniture & household · Food & drink · Shopping & prices · Clothes & colours · Body & how you
feel · At the doctor's · Daily routine · Work & jobs · School & learning · Free time & hobbies ·
Town & places · Transport & directions · Travel & holidays · Numbers, time & dates · Weather &
seasons · Animals & nature · Everyday verbs I · Everyday verbs II · Adjectives: opposites ·
Prepositions & places · Function words & linking words · Forms & offices.

Mix: 365 nouns, 137 verbs (incl. 15 phrasal verbs), 77 adjectives, 28 adverbs, 23 prepositions,
6 conjunctions, 6 pronouns, 4 numbers and 4 phrases (*how much, have a shower, go to bed,
would like*).

## Decisions

- **Fields (content-plan §1.4).** `gender` = `a` / `an` / `some` (`some` = uncountable or
  plural-only: *some advice, some luggage, some trousers*). The A1 set teaches the a/an sound rule
  on purpose (*an hour, a university, an ID card, an uncle*). Uncountable nouns have no
  `plural` key, like the German data had for nouns without a plural. `en` = short learner
  definition in simple English, with **no commas or semicolons**, because `artikelSprint`
  cuts `en` at the first comma. US forms are a note in `en` (“(US: apartment)”). `forms` =
  3rd person, past simple, past participle. Phrasal verbs use `separable: true` with split forms.
  `comparative`/`superlative` are English. `aux`, `case` and `reflexive` are not used. `prep`
  holds a dependent preposition (*wait for, listen to, look at, talk to, apply for*).
- **IPA**: written by hand in modern Standard Southern British (`ipaSource: "authored"`), no
  slashes, like the German data.
- **`rank`: null for all 650 words.** The English frequency list could not be downloaded in this
  run (download needs approval, which nobody could give). A guessed rank would be worse than
  none. Effect: until ranks are attached, the A1 words are not in the “by frequency” rounds of
  `lernsets.js`. The units themselves are complete.
- **Ids**: the slug of the English lemma. Noun/verb pairs with one spelling: `work` / `work-noun`,
  `love` / `love-noun`, `rain-verb`, `snow-verb`, `cold-noun`, `clean-verb`, `change-noun`,
  `answer-noun`, `book-verb`, `watch-noun`. `café` → id `cafe`. Five English slugs are still
  used by German words in A2/B1, so they got `-en`: `computer-en`, `station-en`, `tablet-en`,
  `patient-en`, `jeans-en` (ids are unique across all levels, and the sidecars are keyed by id).
- **Sidecars**: only `en` is a registered language, and decks hide a language tab unless every
  card has it, so ar/ru/uk/tr/… have no A1 entries now. Nothing is missing on screen, and no
  stale German-based glosses remain. `de.json` holds a German translation of each English word
  (nouns with article) for the “German” tab.
- **`de-fill.json`, `de-syn.json`** (content-plan §4): they serve only German words. Their A1
  entries are gone. The files stay while A2–B2 are German and go with the last German level
  (or `cleanup`).
- **`artikel*.json`** were not needed for A1 and stay with `games`.

## Open / for Edgar

1. **Attach the English ranks** (one command, needs network): `node scripts/attach-ranks.mjs a1`,
   then `node scripts/validate-lexicon.mjs`. It downloads `en_50k.txt` into
   `node_modules/.cache/`. Then run `node scripts/haeufigste-woerter.mjs` to replace the still
   German `src/data/haeufigste-woerter.json` (only the grammar PDF script reads it), and
   `node scripts/extract-lernsets.mjs`. Commit all of them. Multi-word lemmas (*get up, bus stop*)
   will stay `null`, which is correct.
2. **Review the content**: 650 words written by hand without a second reader. Worth a look:
   - plural-only nouns shown with “some” (*some stairs, some traffic lights*);
   - *sun* and *weather* as `some` (uncountable);
   - BrE choices: *learnt, spelt*, *flat, jumper, cooker, bin, car park, chemist's, postcode, queue*.
3. **Profession decks lost 96 cards** until `english-for-work` rewrites them: buero 11,
   einzelhandel 11, gastronomie 12, hotel 14, kita 16, kraftfahrer 13, bau-handwerk 6,
   lager-logistik 6, elektro-technik 4, pflege 3 (`scripts/check-berufe.mjs`, opt-in, will report
   the dangling refs).
4. **Games still use German ids** (`games` item): `hochstapler/themen.json` (missing words are
   skipped, but a German id that now names an English word, e.g. `hand`, `bus`, `hotel`, shows
   the English word in a German theme). `nussnacht` logs “Bosse ohne Lexikon-Treffer” during
   the build (warning only). Article colours (`--der/--die/--das`) do not exist for a/an/some, so
   those articles show in the plain text colour on the picture cards and the print sheets.
5. **Picture cards**: the 100 are the German set's pictures mapped to English, plus 9 food/kitchen
   nouns that already had drawings. Re-pick by English frequency once ranks exist. The drawing
   names in `src/lib/bildkarten/*` are still German (internal only).
6. **Scene-photo manifest**: I edited only the `alt` fields of `wortschatz-szenen.manifest.json`
   by hand. A later `pnpm hubs:build --set szenen` writes the same values.
7. The ids with `-en` can lose the suffix once A2/B1 are English. This must happen before any
   real learner progress exists, because SRS progress is keyed by id.

RESULT of this run: item done. The rank attachment is a one-command follow-up that needs network
access, so it is listed above rather than kept as an open queue item (a re-run would hit the same
download block).
