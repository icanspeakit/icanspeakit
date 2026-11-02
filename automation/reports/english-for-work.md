# Run report: `english-for-work`

Run: 2026-11-02, one run (no earlier attempt). Branch `content`. Build green at the end
(`pnpm build`: 1,636 pages, postbuild checks OK). `node scripts/check-berufe.mjs`: 10 decks,
0 errors, 0 warnings.

## What was done

| Commit | What |
|---|---|
| `a88bec5` | **Code follows the English conventions.** `berufeCore.js`: `GENDERS` = a/an/some, verbs need English forms, no `aux`. `berufeRows.js`: `liveDeck` now drops lexicon refs that are *not* in an English level (it was the other way round while the decks were German); plural-only nouns say "some". `berufeWortschatz.js`: the same, and `samplesOf` returns the English definition (`meaning`). Pages `/berufe` and `/berufe/[beruf]`: deck text marked `lang="en"`; samples show the English definition instead of the German hint; the pflegeplace.com line on the hub card only shows when a deck has `external`. **Restaurants & kitchens** deck. |
| `78d8f66` | Electrical, plumbing & heating · Childcare & nursery · Care work (one short group). |
| `56e9c18` | Hotels · Retail · Office & admin. |
| `9754d94` | Warehouse & logistics · Driving & delivery · Construction & trades. |
| (this commit) | Report, `docs/content-plan.md` §5.12 and §9. |

| Deck | Entries | own / ref |
|---|---|---|
| gastronomie: Restaurants & kitchens | 85 | 48 / 37 |
| hotel: Hotels: reception & housekeeping | 89 | 38 / 51 |
| lager-logistik: Warehouse & logistics | 85 | 58 / 27 |
| kraftfahrer: Driving & delivery | 83 | 41 / 42 |
| bau-handwerk: Construction & trades | 88 | 50 / 38 |
| elektro-technik: Electrical, plumbing & heating | 85 | 35 / 50 |
| einzelhandel: Retail & sales | 91 | 30 / 61 |
| buero: Office & admin | 94 | 32 / 62 |
| kita: Childcare & nursery | 86 | 50 / 36 |
| pflege: Care work: the basics | 30 | 17 / 13 |

That makes 816 entries in total (the German decks had ~1,200; per content-plan §8.6 a smaller,
correct set beats filler). Every deck keeps its group ids (they are progress keys) and has
English group titles, intro, easy intro, UK job titles and 3 tips about English at that job.

## Decisions

- **Fields.** An own word has `gender` a/an/some, an English `plural` (`null` for
  uncountables), `forms` = 3rd person · past simple · past participle (phrasal verbs
  `separable: true`), and no `aux`. `translations` holds only `en`, a short definition in
  simple English with no commas (the only language registered for the `berufe` surface; the old
  ar/uk/tr/… glosses explained German words and were removed, and the trainer shows only tabs
  every card has). `deHint` = **German translation** (nouns with article), so the "German" tab
  works like the lexicon's `de.json`. `morphSource: "authored"`.
- **Refs.** A word already in the English A1–B2 lexicon (same part of speech) is a ref with a
  job-specific example, so learners meet the same card id in both places. Every ref was checked
  against the lexicon definition. Where the lexicon sense is a different one, the deck uses
  another lemma: *top up a glass* (lexicon *top up* = money), *site supervisor* (lexicon
  *supervisor* = a research supervisor), *electrical fault* (lexicon *fault* = blame),
  *do a headcount* (lexicon *headcount* = staff numbers), *drop-off time* at the nursery
  (the driving deck's *drop off* is the verb), *photocopier* instead of a document *scanner*
  (the warehouse *scanner* reads barcodes). Shared safety words (first aid kit, fire
  extinguisher, safety boots …) are defined once and the other decks point at them.
- **Dropped:** the `fs-…` refs and the link to the Führerschein section (dropped per §4), and
  the pflegeplace.com box (`external: null`): it is a German-course site.
- **Care work** stays one short group (30 words), as before; adding groups would add new
  progress ids, and the brief was "same 10 sectors".
- **Facts:** tips stay general (no driving-hour, ratio or legal numbers). UK facts used:
  Challenge 25, DBS check, GDPR, 10p carrier bags, 999.
- **How it was written:** a small generator (not committed, `_tmp_berufe/gen.mjs`) turned
  hand-written entries into the deck format, made refs automatically and flagged problems.
  The other nine decks were drafted by three helper sessions in parallel (three each), from one
  brief with the restaurant deck as the model. I read every own word, every ref sense and every cross-deck ref,
  and fixed what is listed above plus some comma splices and German translations.

## Open / for Edgar

1. **No second reader.** `reviewed: false` on all decks. Worth a look:
   - BrE trade words: *first fix / second fix*, *snagging list*, *builder's skip*, *consumer
     unit*, *stopcock*, *night auditor*, *tail lift*, *walkaround check*, *eighty-six*
     (kitchen slang, maybe drop it).
   - German terms I'm least sure of: *Bezugserzieherin* (key worker), *Gruppenleitung* (room
     leader), *Endausbau* (second fix), *Night auditor = Nachtportier mit Tagesabschluss*,
     DBS check (*Überprüfung im Strafregister*).
2. **`scripts/generate-berufe-pdf.mjs` is still German** (column labels, cover texts "German
   for work…"). No berufe PDF is on disk, so nothing broken shows; rewrite it before running
   `pnpm generate:berufe-pdf`.
3. Leftover German UI text: the fallback text in `components/berufe/BerufeLink.astro` and
   `LernsetPicker.astro` (`tool.berufe.title` renders in English from `en.json`). The
   `berufe.pflege.*` / `berufe.card.pflege` keys in `en.json` are unused now; I didn't
   touch `en.json` because other sessions edit it. The `ui-*` or `cleanup` item can remove them.
4. The route stays `/berufe` until `routes` moves it to `/english-for-work` (§6).
5. Audio: no `public/audio/berufe/*.mp3`; the cards have no play button until TTS exists.
