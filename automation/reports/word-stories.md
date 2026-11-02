# Run report: `word-stories`

Run date: 2026-11-02. Branch `content`. Status: **done** (first batch). All 30 stories are
drafts and need Edgar's review before they go public.

## What was done

**30 English word stories** in `src/content/wortgeschichte/`. Each has a new file named by the
English lemma and uses the same schema as before (root, stages, history 80–140 words,
historyEinfach, synonyms, relatives, elsewhere, tree, sources, checkedBy/checkedAt):

| Word | Level | Story | Replaces | publishOn |
|---|---|---|---|---|
| house | A1 | hūs → house (Great Vowel Shift), House of Windsor/Commons | haus | 2027-07-02 |
| bread | A1 | hlāf/loaf was the old word; lord = loaf-guard, lady = loaf-kneader | brot | 2027-01-05 |
| window | A1 | Old Norse vindauga "wind-eye"; ventana (wind), окно (eye) | fenster | 2026-10-03 |
| egg | A1 | Norse egg vs southern ey/eyren, Caxton 1490 | ei | 2027-04-13 |
| sky | A1 | Norse ský "cloud"; heaven | (new) | 2027-10-02 |
| Wednesday | A1 | Woden's day, translation of dies Mercurii | mittwoch | 2026-11-11 |
| Thursday | A1 | Thunor/Thor = thunder; dies Iovis | donnerstag | 2026-11-12 |
| Saturday | A1 | the only Roman god; Sabbath names elsewhere; Welsh day names | samstag | 2026-11-14 |
| cow | A1 | cow/beef, pig/pork: Norman meat words; *gʷṓws | kuh | 2027-07-20 |
| coffee | A1 | qahwa → kahve → caffè → koffie; kahvaltı | kaffee | 2026-10-02 |
| tea | A1 | Hokkien tê (sea) vs chá (land); chai, char | tee | 2026-12-05 |
| sugar | A1 | Sanskrit śarkarā → Arabic → Italian/French; azúcar, candy | zucker | 2026-10-06 |
| money | A1 | Juno Moneta; mint borrowed earlier; Münze | geld | 2027-07-30 |
| school | A1 | Greek skholē "free time"; school of fish is another word | schule | 2027-08-03 |
| holiday | A1 | holy day; UK holiday vs US vacation, bank holiday | urlaub | 2027-05-01 |
| friend | A1 | "a loving one"; fiend = "a hating one"; Freund/Feind | freund | 2027-04-05 |
| husband | A1 | Norse húsbóndi; wife = woman, midwife | (new) | 2027-10-03 |
| nice | A1 | Latin nescius "not knowing" → foolish → fussy → pleasant | (new) | 2027-10-04 |
| breakfast | A1 | break + fast; dinner, desayuno, déjeuner | (new) | 2027-10-05 |
| bus | A1 | Latin omnibus "for all", Shillibeer 1829 | bus | 2026-10-29 |
| taxi | A1 | taximeter < German Taxameter; cab < cabriolet | taxi | 2027-08-16 |
| hotel | A1 | hostel and hotel (same word borrowed twice), hospital | hotel | 2027-01-21 |
| sandwich | A1 | the 4th Earl; Sandwīc = trading town on sandy ground | (new) | 2027-10-06 |
| tomato | A2 | Nahuatl tomatl; -o from potato; pomodoro | tomate | 2027-03-16 |
| potato | A1 | Taíno batata (sweet potato); papa; earth apple, Kartoffel | kartoffel | 2027-01-23 |
| chocolate | A2 | a drink first; disputed Nahuatl source; Fry's 1847 | schokolade | 2026-12-15 |
| knife | A1 | Norse knífr; silent k; French canif from Middle English | messer | 2026-11-04 |
| boss | A1 | Dutch baas via New Amsterdam; Liverpool "boss" | chef | 2027-10-01 |
| dog | A1 | docga: origin unknown; hound/Hund | hund | 2027-03-22 |
| shampoo | A2 | Hindi chā̃po "press!", Sake Dean Mahomed in Brighton | (new) | 2027-10-07 |

24 German counterparts were deleted in the same commits, as content-plan §5.11 says. The other
342 German stories stay until `cleanup`.

**Page code** (commit 8dd7d87; no change to the shape of the data):
- `LANG_NAMES` (`wortgeschichteCore.js`) are now in English. New codes: enm, fro, xno, ota, nah, tnq, nan, fy, dum.
- `formsOf` prints English forms for words from the English lexicon levels: *a house · houses*,
  *some bread · no plural*, verbs as base · -s · past · participle, adjectives as *nice · nicer · nicest*.
  The German branch is still there for the remaining German stories.
- New `entryLang(entry)` / `quoteIn(lang)`: an English story renders with `lang="en"` and ‘…’
  quotes, a German one with `lang="de"` and ‚…‘. This is used in WortEntry, WortTree,
  WortDesTagesCard, WortRecent and pruefen.
- The headword shows *a/an/some* as the article (`.wg-art`), and synonym matching strips them.

## Decisions

- **All 30 are `status: "entwurf"`.** The validator refuses `geprueft` while `checkedBy` names
  Claude, and the plan only allows "reviewed" after a human check. So none of the stories is
  public in a production build until Edgar sets `geprueft` (and his name in `checkedBy`).
- **Fact-check:** three separate model passes compared every story with English Wiktionary
  (and Wikipedia for historical facts). Their corrections are in commits 1df5e61 and 828a93d.
  **Etymonline returned HTTP 403** to every fetch. It is still listed in `sources`, because the
  stories follow its standard accounts, but it was not read in this run. `checkedBy` says so:
  "Claude (AI draft, compared with Wiktionary; Etymonline could not be fetched) – needs Edgar's review".
- **`publishOn`:** a replacement reuses the date of the German story it replaces. Several of
  these dates are already past (coffee 2026-10-02, window 10-03, sugar 10-06, bus 10-29,
  knife 11-04). When Edgar approves them, they go live at once. The new words use 2027-10-02 … 07.
- **Choice of words:** I picked words with a documented story that teaches something about
  English: the Norse layer (window, egg, sky, husband, knife), the Norman layer (beef in cow,
  hotel, money), meaning change (nice, holiday, school), and world borrowings (tea, coffee,
  sugar, tomato, potato, chocolate, shampoo, boss). The weekdays are limited to the three with
  distinct gods. Words not in the lexicon (pig, beef, girl, orange, hello) could not be used:
  the validator requires the lemma in the lexicon.
- **`elsewhere` blocks** are for the learner's own language: German, Spanish, French, Russian,
  Ukrainian, Turkish, Arabic, Hindi, Dutch, Welsh, Swedish/Danish, Japanese, Greek, Icelandic.
  `kind: "parallele"` marks the same picture without a shared word (ventana/окно for window,
  desayuno for breakfast, jueves for Thursday). `kind: "entlehnt"` is also used for the source
  word itself (Arabic qahwa, Nahuatl tomatl, Latin hospes). The schema has no "source" kind;
  the fact-checker flagged this as loose.
- **`relatives.family` is always given by hand**, using lexicon words only. Without it, the
  computed family takes substrings (bus → business, robust).
- **"no plural"** is printed for uncountable nouns (*some bread*), in line with the a/an/some
  convention of content-plan §1.4.

## Checks

- `node scripts/validate-wortgeschichte.mjs`: no errors on any of the 30 English files (only
  the "draft" warning). The script as a whole still fails, with about 860 errors, all from German
  stories whose lemmas are no longer in the now-English lexicon. It is not part of `prebuild`.
  `cleanup` should re-enable it once the German stories are gone.
- `timeout 1500 pnpm build`: passes (1,636 pages, see the end of the run).
- In this unattended run I could not render the draft pages: a build with
  `WORTGESCHICHTE_VORSCHAU=1` and `astro dev` both needed approval. Instead I called the page
  helpers (`entryLang`, `formsOf`, `headword`, `synonymsOf`, `familyOf`, `glossesOf`) in node
  on the English stories. They give the expected English output. WortEntry itself is rendered
  in the normal build for the German stories that are already published.

## For Edgar to review

1. **Read and approve the 30 stories** (`/wissen/wortgeschichte/pruefen` in dev, or each page
   `/wissen/wortgeschichte/<word>` in `astro dev`). Points the checkers could only confirm from
   memory:
   - Grosley's "24 hours at the card table" (sandwich)
   - Shillibeer 1829 and 'bus 1830s
   - first London coffee house 1652; chocolate houses in the 1650s
   - taxi/taxicab 1907
   - hotel = large town house in the 1640s, inn from the 1760s
   - Thursday shaped by Norse Þórsdagr ("probably")
   - Liverpool "boss"
   - the "master" motive behind American boss ("probably")
   - Saxons named after the seax (said to be uncertain in the text)
2. **Published German stories:** about 30 German stories with past `publishOn` are live in the
   production build (word of the day, archive). The replaced ones (coffee, window, sugar, bus,
   knife …) are gone, so the word of the day is now the newest remaining German one. Consider
   having `cleanup` (or a quick decision) remove or unpublish the remaining German stories before
   launch. Otherwise the English site shows German etymology.
3. **Audio:** every story points to `/audio/wortschatz/<word>.mp3` through the lexicon. These
   files don't exist until TTS is wired (content-plan §9).
4. **Translations of the gloss** (ar/uk/ru/tr) come from the lexicon sidecars. The stories
   themselves are English only.

## Left / next

- More batches: the remaining 342 German slots → English stories (or deletion by `cleanup`).
  Good candidates already in the lexicon: Tuesday, Friday, month, salad, sister, daughter,
  city, bank, jeans, weekend, dinner, cash.
- Optional: a validator mode that checks only English stories, so `check:wortgeschichte` can
  go back into `check:content` before `cleanup`.
