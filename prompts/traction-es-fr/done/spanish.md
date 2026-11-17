# Lane spanish: done (2026-11-17)

App `apps/spanish`, live at https://icanspeak.it/espanol/. Nothing pushed, merged or deployed.

## Inventory before changing anything (Tier 1)
- `downloads.json` listed 19 entries (`grammatik-*`, `wortschatz-*`, ten `berufe-*`); only
  `grammatik-start.pdf` and `grammatik-start-de.pdf` existed on disk, so the page showed two files.
- The generators were the German course's: German shell ("Wortliste", "Niveau", "Inhalt"), teal look,
  levels A1-B2 only, German file names, `generate:pdfs` also ran the German partner generator.
  Grammar Start was already English-explained and good; its logo was the old `assets/logo.png`, its
  QR code teal, its files named `grammatik-start*`.
- `/conocimientos`: title "Spanish grammar & word lists as free PDFs", H1 "Books and lists to
  download", no FAQ, no JSON-LD, German fragment ids (`#grammatik-start`, `#einstieg`), book covers
  saying "Grammatik" / "Wortliste" / "komplett", file sizes with a German decimal comma, `lang: "de"` in
  the download tracking.
- Language copies existed (`/espanol/{de,fr,it,pt}/conocimientos`) with title/description only.
- Worksheets (`/profesores/fichas/**`): 70 grammar sheets, 164 vocabulary sheets, partner/tandem
  sheets, the folder. Missing against English: "New version", search titles/JSON-LD, Letter paper,
  paper wording for match hints, a clear link text on the topic pages, `/espanol` in the printed
  footer (it printed `icanspeak.it/spanish...`, a dead path). The AbOrigin fix was already in
  (it uses `stripBase`).

## What shipped
### PDFs (`apps/spanish/public/downloads/`, 18 files, 1,285 pages, ~7.4 MB)
| File | Pages | Size |
|---|---|---|
| gramatica-espanola-inicio / -inicio-de (Grammar Start, English / German explanations) | 46 / 47 | 630 / 692 KB |
| gramatica-espanola-a1 / a2 / b1 / b2 / c1 | 65 / 82 / 130 / 54 / 24 | 438 / 507 / 669 / 409 / 300 KB |
| gramatica-espanola-a1-c1-completa | 357 | 1.44 MB |
| conjugacion-verbos-espanoles (69 verbs, 6 persons, 8 tenses + imperative) | 70 | 268 KB |
| verbos-irregulares-espanol / lista-de-verbos-reflexivos-espanol / verbos-con-preposiciones-espanol | 7 / 6 / 4 | 128 / 128 / 122 KB |
| vocabulario-espanol-a1 / a2 / b1 / b2 / c1 / c2 (all 5,000 words) | 46 / 52 / 88 / 122 / 51 / 34 | 233 / 260 / 372 / 482 / 271 / 218 KB |

- New generators: `generate-grammar-pdf`, `generate-wordlist-pdf`, `generate-reference-pdf`,
  `generate-conjugation-pdf` (new, from `verbtabellen.json` + `verbtabellenCore.js`, the same data as
  `/gramatica/verbos`), voice in `scripts/lib/pdf-copy.mjs`, brand look from `scripts/lib/pdf-brand.mjs`
  (copied from English, so navy/sun, wordmark, footer URL of the matching page). Old
  `generate-grammatik-pdf` and `generate-wortschatz-pdf` removed. `pnpm generate:pdfs` runs all.
- Word lists print el/la, plural, feminine form, verb forms (yo, indefinido, participle), IPA,
  English meaning, Spanish example, and the Latin American note where the lexicon has one.
- Grammar books print only reviewed topics (78 across A1-C1, same rule as the site).

### `/espanol/conocimientos`
- Title "Free Spanish learning PDFs and official exam material, A1-C2", same H1, lead with counts from
  the data, visible FAQ (6 questions), JSON-LD `CollectionPage` + `ItemList` (17 `DigitalDocument`) +
  `FAQPage`, only entries with a file on disk (17 cards + the German edition).
- Spanish file ids and fragments (`#gramatica-inicio`, `#gramatica-a1`, `#vocabulario-b1`, `#empezar`,
  `#oficial`, `#faq`), Spanish covers ("Gramatica", "Vocabulario", "Conjugacion"), contents lines per
  book, size "1.4 MB".
- Official links (all answer 200 in `check:downloads`; the two RAE ones 403 to a script and load in a
  browser): Instituto Cervantes DELE and CCSE pages, the CCSE preparation manual (PDF), SIELE site and
  the SIELE free demo exam, RAE DLE and DPD, DGT.
- Language copies `/espanol/{de,fr,it,pt}/conocimientos` with their own title, H1, FAQ and JSON-LD
  (the FAQ and page nodes are rebuilt in the copy's language, `entry-pages.mjs` `localizeLd`),
  hreflang for all versions plus x-default, in the sitemap; `/profesores/fichas` added to `llms.txt`.

### Worksheets
- "New version" (`src/lib/worksheet/version.js`, `?v=1-9999`, printed in both headers and in the footer
  URL, "Original order" button, `teacher_tool_use` through `intent()`), search titles
  ("Spanish <topic> worksheet (B1) – free PDF with answers"), descriptions with the sheet's own counts,
  `LearningResource` JSON-LD for grammar and vocabulary sheets, `CollectionPage` for the index,
  `paperHint`, "Answer" column, `@page` without a fixed size (A4 and Letter), topic-page button
  "Printable worksheet", footers print `icanspeak.it/espanol/...`.
- Counts from the build: 70 indexable grammar worksheets, 164 vocabulary worksheets (160 sets + a1-b2
  levels), 1 index; 14 more grammar sheets stay noindex because their topic is a draft.
- i18n: 18 file descriptions, 8 link notes, 6 FAQ pairs, shelf names/blurbs, `ab.newVersion*`,
  `ab.original`, `ga.worksheet*`, `ab.index.title/lead` in all six UI files; `check:i18n-keys` added.

## Decisions that differ from the brief (please check)
1. **Page and sheet titles are English, not Spanish.** The course's interface and every rule, hint and
   word meaning is English (Spanish is the subject, English is the base language, other UI languages are
   translations). A Spanish title over an English page and English instructions would mismatch what
   a searcher then finds, and the topic names are English phrases ("Adverbs: -mente; bien or bueno").
   So titles are shaped for English searches that contain "Spanish" ("Spanish present perfect worksheet
   (B1) – free PDF with answers"). File names, URLs, fragments, cover words and running heads are
   Spanish. To switch to Spanish titles, change `TAIL`/`pageTitle` in the three worksheet pages and the
   title in `conocimientos.astro`; the exercise text would need Spanish instructions first.
2. **Language-copy slug stays `conocimientos`, not `downloads`.** The copies already existed at
   `/espanol/<lang>/conocimientos`, and the target-language-URL rule (memory 2026-11-15) wins over the
   English naming; no redirect needed.
3. **PDF shell voice is English** for the same reason as 1 (labels like "The rule", "Exercise" sit
   next to English explanations); Spanish carries the title line of the running head, the file name and
   everything taught.
4. **Spanish as an interface/entry language** (`/espanol/es/...`) is not offered by the registry and I
   did not add it: that would be the real Spanish-language page for Spanish-speaking searchers.

## Skipped, and why
- Ten "Spanish for work" booklets (`espanol-para-el-trabajo-*.pdf`): all ten decks are
  `reviewed: false`. The generator is fixed (file names, `/espanol` URLs) and works; run
  `pnpm generate:berufe-pdf` and add the entries to `downloads.json` after the decks are reviewed.
- Grammar Start in fr/it/pt/es: only `en.json` and `de.json` exist for the Spanish book; no
  translation written, none invented.
- A complete A1-C2 word list (5,000 words, ~500 pages): not built, six level files instead.
- Partner PDF generator left out of `generate:pdfs` (its output is German-shelled); no checked partner
  sheets exist, so `check:downloads` lists 0.
- Official DELE sample exams: the Cervantes site was rebuilt and the old exam-model URLs redirect to
  its landing page, so I could not verify a direct link. DELE is linked to the official page, SIELE to its
  free demo exam, CCSE to the official manual. Add direct DELE model links if you find the new URLs.

## Checks
| Check | Result |
|---|---|
| `pnpm --filter ./apps/spanish build` (lock used, 2m48s) | ok, postbuild leak checks ok |
| `check:base` | ok, 3495 files, every URL under /espanol/ |
| `check:links` | ok, 1697 internal links |
| `check:i18n-keys` | ok, 6368 keys in all six UI files |
| `check:downloads` | 17 files ok, 8 links: 6 x 200, 2 x 403 (RAE, bot block; both load in Chrome) |
| `check-grammatik-start` | ok |
| `seo:jsonld` | fails with 44 problems, all "nested page without BreadcrumbList" (language copies, DGT print pages); not from this lane, not fixed |
| llms.txt | 11.4 KB, warning "over 10 KB" (was already over; one line added) |
| Browser (Chrome, Playwright, 1280x800 and 390x844): material page, de/fr/it/pt copies, worksheet index, 4 sheets, a topic page | no console errors, no 404, no horizontal scroll; the topic page `/preterito-indefinido` once measured 8-25 px wider (a reference table and the rule column, not the new button) and is unchanged by this lane |
| Download sheet: opens from `#vocabulario-b1`, download button saves `vocabulario-espanol-b1.pdf`, "what next" appears | ok at both sizes |
| Print (PDF, A4 and Letter) of 3 sheets (`ser-y-estar-avanzado?v=3781`, `articulos`, vocabulary a1-01) | answer key starts on its own page every time; `?v` printed in header and footer; one blemish: `articulos` on Letter puts only the footer on page 3 |
| PDFs read: A1 grammar chapter 2 (pages 6-7), word list A1 pages 2-3, conjugation pages 14-15 (also seen in Chrome's viewer); every page of all 18 files has text (no blank pages) | ok |
| Dev server | ran on 4541, stopped; a temporary static server on 4549 for the built copies, stopped |

The Chrome used for localhost was the "deutschacademy" profile (only one connected; localhost is fine
with any profile).

## Open wording doubts
- de/fr/it/pt texts are machine drafts by me, not read by a native speaker (as `entry-pages.json` says).
  pt is Brazilian (the app's pt). Worth a read: the FAQ answers and the shelf blurbs.
- "Gramatica inicio" on the Grammar Start cover reads as Spanish with an English tagline; fine?
- "Spanish <topic> worksheet" titles: topic names that already start with "Spanish" or "ser and estar"
  read a little repetitive.
- The word-list cell prints verb forms as "me llamo · se llamo · llamado" under the headword; the legend
  is on the cover only.

## For Edgar
- Read the machine-translated de/fr/it/pt texts of the page (`public/i18n/*.json`, keys `wissen.faq.*`,
  `wissen.cat.*`, `wissen.file.*`).
- Decide on English vs Spanish titles (decision 1) and on a Spanish entry language (decision 4).
- Review the ten Spanish-for-work decks (`apps/spanish/src/data/berufe/*.json`, set `"reviewed": true`),
  then `pnpm --filter ./apps/spanish generate:berufe-pdf` and add the cards.
- In Bing Webmaster Tools / outreach: submit `https://icanspeak.it/espanol/conocimientos` once the release is live.

## Commits
- `2c661e01` feat(spanish): free Spanish PDFs from the course's own data, in the brand look
- `a1524f1c` feat(spanish): /conocimientos as the page for free Spanish PDFs and official exam material
- `bf1ffc32` feat(spanish): grammar worksheets get "New version", search titles and JSON-LD
- `3d756f39` feat(spanish): llms.txt lists the worksheet index
- (this file) docs: spanish lane done file
