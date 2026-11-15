# Lane downloads: done

*2026-11-15. Free English PDFs and the official sample papers on https://icanspeak.it/english/knowledge,
plus one copy of that page per UI language at `/english/<lang>/downloads`.*

## What was there (Tier 1)

- `/knowledge` listed 25 catalogue entries; only the 6 Life in the UK PDFs existed on disk, the
  rest (grammar, word lists, the ten "English for work" booklets, Grammar Start) were dead
  entries that `downloads.js` silently dropped.
- The 6 existing PDFs (`leben-in-deutschland-*.pdf`) had English facts inside a **German** shell:
  "DEUTSCHACADEMY · PRÜFUNGSVORBEREITUNG", "Leben in Deutschland (Einbürgerungstest)",
  "16 Bundesländer", German test rules.
- The generators were the German course's: German book copy ("Jetzt üben Sie", "Merke",
  a page of "the 30 most frequent **German** words"), teal colours, levels A1–B2 only, German
  editions logic. Grammar Start was already English but linked to German routes
  (`/grammatik`, `/wortschatz`, `/einstufungstest`, `/pruefungen`) and to topic **ids**
  (`/personalpronomen`) instead of slugs (404s), and carried the old "für Dich" logo.
- Official links pointed to Cambridge "exam format" pages, not to the sample papers.
- Language copies existed as `/english/<lang>/knowledge` (entry-pages integration), with an
  English FAQ-less page and English JSON-LD.
- deutschacademy builds `/es/downloads` etc. the same way: its entry-pages integration copies
  `/wissen` to slug `downloads` per language (`src/data/entry-pages.json`).

## What changed

*Filled in afterwards by the worksheets lane (2026-11-15, at Edgar's request): the downloads
session stopped before writing this part. Reconstructed from commit `18494454` and the English
build of 13:48 in `apps/english/dist`; nothing below was re-run by the downloads lane itself.*

- **PDFs** (`apps/english/public/downloads/`, sizes from `manifest.json`): the 6
  `leben-in-deutschland-*.pdf` are deleted and replaced by 27 English PDFs:

  | File | Pages | Size |
  |---|---|---|
  | english-grammar-a1 / a2 / b1 / b2 / c1 | 73 / 88 / 135 / 49 / 33 | 473 / 529 / 706 / 403 / 324 KB |
  | english-grammar-a1-c1-complete | 381 | 1.57 MB |
  | english-grammar-start (+ -de -es -fr -it -pt) | 36 (38 each translated) | ~630 KB each |
  | english-irregular-verbs | 7 | 132 KB |
  | english-phrasal-verbs-list | 5 | 127 KB |
  | english-verbs-with-prepositions | 5 | 126 KB |
  | english-word-list-a1 … c2 | 46 / 51 / 84 / 112 / 46 / 32 | 239–470 KB |
  | life-in-the-uk-facts / -facts-simple | 8 / 7 | 134 / 131 KB |
  | life-in-the-uk-england / -scotland / -wales / -northern-ireland | 11 each | ~134 KB each |

- **Generators** (`apps/english/scripts/`): the German course's `generate-grammatik-pdf`,
  `generate-wortschatz-pdf`, `generate-fakten-pdf`, `generate-bundesland-pdf` are removed; new
  `generate-grammar-pdf`, `generate-wordlist-pdf`, `generate-reference-pdf`,
  `generate-life-in-the-uk-pdf`, shared copy in `scripts/lib/pdf-copy.mjs`, brand in
  `scripts/lib/pdf-brand.mjs`. `generate-grammatik-start-pdf` now links English routes/slugs and
  builds 6 languages (new `src/data/grammatik-start/{es,fr,it,pt}.json`). `pnpm generate:pdfs`
  runs them all; `check-downloads.mjs` updated.
- **`/english/knowledge`** (`src/pages/knowledge.astro`, `src/data/downloads.json`,
  `src/lib/downloads.js`): 19 entries, all with a file on disk (the dead German catalogue entries are
  gone). Title and H1 "Free English learning PDFs and official sample papers, A1–C1"; visible FAQ (5
  questions); JSON-LD `CollectionPage` + `ItemList` (19 `DigitalDocument`) + `FAQPage`.
- **Official sample papers, linked not hosted** (11): Cambridge Key, Preliminary, First, Advanced,
  Proficiency (each exam's `/preparation/` page), IELTS sample test questions, Trinity ISE A2/B1/B2/C1,
  gov.uk Life in the UK test.
- **Language pages:** `/english/{de,es,fr,it,pt}/downloads`, built by
  `src/integrations/entry-pages.mjs` from `/knowledge` + `public/i18n/<lang>.json` + titles in
  `src/data/entry-pages.json`. Each has its own title/H1 in that language, hreflang to all six
  versions plus x-default, and lists the Grammar start PDF in all six languages.
- Sitemap and `llms.txt` contain the downloads pages (checked in the 13:48 build).

## URLs
- https://icanspeak.it/english/knowledge
- https://icanspeak.it/english/{de,es,fr,it,pt}/downloads
- https://icanspeak.it/english/downloads/<file>.pdf (27 files, list above)

## Not verified / open
- The downloads lane's own checks (`check:links`, the browser check at both sizes, opening three
  PDFs, a 200 for every official link) are not recorded anywhere. Release should run them in its Tier 1.
- The language-page texts are marked "machine draft, not yet read by a native speaker"
  (`entry-pages.json` `_note`).
- `src/data/entry-pages.json` still holds `vi`, `hi`, `id`, `tl` blocks copied from the German
  course ("Học tiếng Đức…", Goethe/telc). They are not built (those languages have no `urlPrefix` in
  `src/lib/languages.js`), but must be rewritten or deleted before anyone adds those languages.

## For Edgar
- Nothing to click for this lane.

## For Spanish / French
- Same files in `apps/spanish` / `apps/french`: copy the four generators + `scripts/lib/pdf-copy.mjs`,
  rewrite `downloads.json` (their own PDFs, DELE/DELF official links), and add `/knowledge` to their
  `entry-pages.json` with slug `downloads`.

## Commits
- `18494454` feat: English downloads, worksheets and courses on target-language URLs (mixed commit:
  also Spanish/French/Italian/Portuguese slug changes, hub, prompts; not made by this lane)
- (this file) docs: downloads lane done file, filled in from the commit
