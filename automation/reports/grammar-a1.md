# Run report: `grammar-a1`

Run date: 2026-10-29 (unattended, `automation/run-next.ps1`). Branch `content`. Not pushed.

## What was done

All A1 slots of `docs/content-plan.md` §3 (19 topic files + the `akkusativ` slot) are now English
A1 grammar topics, same ids and same schema. Every exercise, the `aktiv` part (listen / hear /
speak), the rule cards, reference tables and boxes were written new in English (British English,
simple A1–A2 explanations, varied international names). No German is left in these files.

| Slot | English topic | `status` (unchanged) | Exercises (German → English) | aktiv |
|---|---|---|---|---|
| `nomen` | Nouns: people, things, places | geprueft | 5 → 5 | — |
| `artikel` | Articles: a, an, the | (none) | 5 → 5 | yes |
| `personalpronomen` | Subject pronouns and the verb be | geprueft | 12 → 9 | yes |
| `praesens` | Present simple | (none) | 6 → 6 | yes |
| `verb-position-2` | Word order: subject, verb, object | entwurf | 7 → 7 | yes |
| `w-fragen` | Wh- questions: what, where, when, who | (none) | 11 → 8 | yes |
| `ja-nein-fragen` | Yes/no questions and short answers | (none) | 4 → 4 | yes |
| `plural` | Plural nouns | (none) | 5 → 5 | yes |
| `possessivartikel` | Possessive adjectives: my, your, his, her | (none) | 10 → 8 | yes |
| `imperativ` | Imperatives | (none) | 10 → 9 | yes |
| `temporale-praepositionen` | Prepositions of time: in, on, at | geprueft | 6 → 7 | yes |
| `aduso` | Linking words: and, but, or, so | geprueft | 7 → 7 | yes |
| `adjektive-nach-sein` | Adjectives: a big house, the house is big | entwurf | 6 → 6 | yes |
| `berufe-mit-in` | There is / there are | entwurf | 7 → 8 | yes |
| `gern` | like, love, hate + -ing | entwurf | 6 → 7 | yes |
| `praeteritum-sein-haben` | Past of be: was and were | entwurf | 6 → 6 | yes |
| `wortarten` | Parts of speech: noun, verb, adjective … | geprueft | 5 → 5 | — |
| `zahlen` | Numbers, prices and time | entwurf | 7 → 8 | yes |
| `welcher-dieser` | This, that, these, those (level A2 → **A1**, per plan) | geprueft | 7 → 7 | yes |
| `akkusativ` | Object pronouns (`akkusativ.json`, its `grammatik.json` quiz, `/akkusativ` page) | — | 15 items | — |

Commits (all `content(grammar-a1): …`):

| Commit | What |
|---|---|
| `b4e0581` | Object pronouns: `akkusativ.json` (15 items, same ids/tiers), `grammatik.json` akkusativ entry, `/akkusativ` title, tag, rule box (subject/object table), `akk.regel.*`/`akk.tbl.*` keys in `en.json` |
| `cd302b5` | `docs/content-plan.md` §1.4: grammar topics keep their review status (see decision 1) |
| `12a1c42` | personalpronomen, praeteritum-sein-haben, berufe-mit-in |
| `41d5e81` | nomen, wortarten, plural, artikel, zahlen |
| `3bd9e69` | praesens, ja-nein-fragen, w-fragen |
| `9ff44c4` | possessivartikel, welcher-dieser, adjektive-nach-sein, gern |
| `4aa0105` | imperativ, temporale-praepositionen, aduso, verb-position-2 |
| `c1ca7e6` | `einfach-pfad.json`: the beginner path's 32 grammar tasks re-pointed at English items |
| `1b8e65d` | `ConjTable.astro` English headers; `PositionTable.astro` without `lang="de"` |

Build: `pnpm build` succeeded (2438 pages; post-build leak checks OK).

## How it was checked

- A throwaway validator (not committed) compared every file with its German original: same key
  paths except the allowed differences below, `id`/`level`/`status`, audio path pattern, build tiles
  an exact permutation of the sentence, `hoeren.correct` in range, unique match pairs, story blank
  numbering, no full-stop abbreviations in stories (they split story rows), straight apostrophes in
  answer fields, every answer present in its choices with exactly one right pill (same
  `accepts()` as the page). 0 errors on all 19 files.
- `scripts/check-pillen.mjs`: 0 errors, 0 to check.
- `scripts/check-einfach-pfad.mjs`: only the 31 "audio file does not exist" findings remain. They
  were there before this run; there is no `public/audio` yet.
- Every file was read item by item. Fixed during review: "find the mistake" options that were
  also correct sentences, story gaps where *is* and *isn't* both fit (context added), a too-easy
  *'s / s'* exercise (now per-item apostrophe choices), a phone-number gap that contradicted the
  topic's own digit-by-digit rule, *pullover* → *jumper*, "works **at** a university",
  "Don't let's …" as a wrong option (it is valid BrE), "A1:" prefixes in exercise titles.

## Decisions

1. **`status` kept per file (deviation from content-plan §1.4, plan updated in `cd302b5`).** The
   plan says new content enters as draft unless checked against sources. Setting `entwurf` takes a
   topic out of the catalogue, menus, guided run, search and PDFs, so flipping all 19 would have
   emptied A1 grammar. The files keep what they had: 5 `geprueft`, 7 without status (= reviewed),
   7 `entwurf`. **Edgar: the "reviewed" ones were reviewed in German, not in English.**
2. **Allowed shape differences** (validator warnings, all intended): `answer` string ↔ array
   (for alternatives such as *isn't / is not*); per-item `choices` added or dropped; `why` and
   `hint` added or dropped on some items; build `alt` orders added where a second order is just as
   natural (*Two years ago I was in Belfast.*); `briefMarks` added to `zahlen` and `aduso`;
   `irregular` flags removed from `imperativ` (English imperatives are regular; kept only on *be*);
   **`concept.pictures` removed from `verb-position-2`** (it draws the German verb bracket).
3. `artikel`'s rule-box exercise (`rule.groups[].artikel/endungen`) now groups **a** (consonant
   sound), **an** (vowel sound), **the** (uses); the disclaimer explains *an hour / a university*.
4. `wortarten`: the German "separable verb" exercise (anchor `trennbar`, kept as an id) is now
   "Noun or verb? The same word, two jobs" (*a drink / I drink*).
5. `praeteritum-sein-haben` is about *was / were*; *had* appears only as a bonus card.
   `berufe-mit-in` holds *there is / there are* as the plan says.
6. Audio paths follow `/audio/grammatik/<id>/<kebab-text>.mp3` (answers `--a`). The files don't
   exist yet (TTS later, plan §9).
7. **`einfach-pfad.json` was touched, though it belongs to `beginner-path`**: its tasks reference
   grammar items by index + checksum and the build fails if one no longer resolves. Each A1 ref now
   points at an English item in the same topic (same kind: fill/table for *luecke*, build for
   *satz*). The task's German `options`, `hint` and `why` were replaced with English ones from the
   source exercise. The unit titles, claims, postcards and the other (lexicon, culture) tasks are
   still German, which is `beginner-path`'s job. The unit themes (e.g. *a1-arzt*) no longer match
   their grammar items closely, so that run should choose items again.
8. `ConjTable` and `PositionTable` are used only by A1 topics (`praesens`, `aduso`), so their
   German header labels / `lang="de"` were fixed here.

## Left / for Edgar to review

- **Review all 19 topics and the object-pronoun page in English**, especially the 12 that count
  as reviewed (decision 1). If you want them out of the course until then, set `"status": "entwurf"`.
- Items to look at: `welcher-dieser` phone items (*Hello, this is Mei.* / *Is that Priya?*, which
  is BrE usage; US speakers also say *Is this Priya?*); `aduso` bonus item *I'm tired, ___ I go to bed*
  (so); `adjektive-nach-sein` note suggests *inexpensive* (above A1).
- **Stories with many different verbs** (`praesens`, `imperativ`, `verb-position-2`) draw their
  pills from the story's other answers, so the wrong pills are other verbs, not wrong forms of the
  same verb. That is easier than intended. The engine has no per-gap choices for stories; a code
  change (`choices` per blank) would make these exercises better.
- **Code outside this item, still German / German-specific** (not changed):
  - `src/lib/aktivMode.js` speaks with a **de-DE** voice. When an `audio` path is set but the file
    is missing, the line stays **silent** (no fallback to speech synthesis). Every topic has audio
    paths and no files exist, so listen/speak mode is currently silent. A fix is needed: an en-GB voice, plus a fallback to speech synthesis on `onerror`.
  - `src/pages/[id].astro` and `src/lib/practiceWorkspace.js` mark data parts `lang="de"`. These are
    shared with the A2–C1 topics that are still German, so it is better to remove them once the last grammar item is done.
  - `grammarWorkspace.js` build exercise: the clause-swap helper uses German pronoun/conjunction
    lists (harmless for English, it just never fires).
  - `/akkusativ`: the page slug, breadcrumb links and `akk-*` ids stay (`routes` item). Unused keys
    `akk.tbl.case/m/f/n/pl` were removed from `en.json` and replaced by `akk.tbl.subject/object/example`.
- `pnpm check:grammatik-ui` will now report the A1 topics above their baseline: the help
  translations in `uebersetzungen/grammatik-ui.json` are keyed by the old German strings
  (`grammar-structure` owns those files).
- `grammatik-lehrplan.json` / `grammatik-verwandt.json` still order and link the A1 slots as before.
  `welcher-dieser` moved to A1, so `grammar-structure` should place it in the A1 syllabus.

Status: item complete (see the review points above).
