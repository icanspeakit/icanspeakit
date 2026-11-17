# Lane french: done (2026-11-17)

## What was there (Tier 1)
- `/savoirs` listed 19 catalogue entries; only `grammatik-start.pdf` and `-de.pdf` existed on disk. The rest
  (grammar A1-B2, word lists, ten "French for work" booklets) were dead entries. The booklet entries were
  Spanish content under French names ("terraza", "Agriculture" behind `berufe-elektro-technik`).
- The old generators (`generate-grammatik-pdf.mjs`, `generate-wortschatz-pdf.mjs`) carried German-era copy, no IPA,
  no C1/C2, teal colours. `downloads.js`, `entry-pages.mjs`, `savoirs.astro` were still the German course's
  versions: no FAQ, no JSON-LD, German strings in the contents code.
- Grammar Start was English-explained French with the old logo, teal QR code and `/grammar`-style back-page links.
- Worksheets: 70 indexable grammar sheets, 164 vocabulary sheets, 14 draft sheets (noindex). Missing: "New version",
  Letter paper, search titles and JSON-LD, the "Printable worksheet" label. The origin ("Back to") fix was already there.

## What changed
- **PDFs** (`apps/french/public/downloads/`, sizes from `manifest.json`): 16 files, all via `pnpm generate:pdfs`.

  | File | Pages | Size |
  |---|---|---|
  | grammaire-francaise-a1 / a2 / b1 / b2 / c1 | 75 / 92 / 126 / 59 / 34 | 473 / 549 / 659 / 422 / 326 KB |
  | grammaire-francaise-a1-c1-complet | 386 | 1.6 MB |
  | grammaire-francaise-essentiel (+ -de) | 46 (47) | ~640 / ~680 KB |
  | verbes-irreguliers / liste-verbes-pronominaux / verbes-avec-prepositions | 7 / 6 / 4 | 132 / 128 / 122 KB |
  | vocabulaire-francais-a1 ... c2 | see `manifest.json` (650 to 1,500 words per level) | 210-470 KB |

  Only reviewed topics are printed (15 draft topics are left out, like on the site).
- **Generators**: `generate-grammar-pdf.mjs`, `generate-wordlist-pdf.mjs`, `generate-reference-pdf.mjs` copied from
  English, copy in `scripts/lib/pdf-copy.mjs`, brand in `pdf-brand.mjs` (English's, navy/sun). Old generators deleted.
  Word lists show `le`/`la`/`l'`, gender, plural and IPA.
- **`/francais/savoirs`**: title/H1 "Free French learning PDFs and official sample papers, A1-C2", 5-question FAQ,
  JSON-LD `CollectionPage` + `ItemList` (16 `DigitalDocument`) + `FAQPage`; only entries with a file; 7 exam links
  plus 3 helpful ones; texts in all six UI languages.
- **Official sample papers (linked, not hosted)**: DELF A1/A2/B1/B2 (`.../niveau-xx/exemples-sujets`), DALF C1/C2
  (`/diplome/dalf/exemples-sujets`), TCF (`/test/exemples-epreuves-tcf`), TEF candidate page.
- **Download pages**: `/francais/{de,es,pt,it}/downloads` (entry-pages slug `downloads`), hreflang to all versions,
  localized JSON-LD; old `/xx/knowledge` redirect there. In `sitemap.xml`; `llms.txt` lists `/savoirs` only.
- **Worksheets**: "New version" (`src/lib/worksheet/version.js`), titles "Fiche : <topic> (B1) - PDF gratuit avec
  corrigé" (shortened to 72 chars), "Fiche vocabulaire : ...", descriptions with the sheet's own counts, JSON-LD
  `LearningResource`; index title "Fiches de grammaire de français A1-B2 avec corrigé (PDF)" with `CollectionPage` +
  `ItemList`; `@page` without a size; matching tasks say "Write the letter ..." (`paperHint`: French hints never start
  with Tap/Click, so the instruction is put in front of match hints); table header "Answer"; key rows `text → d`;
  button "Printable worksheet"; five i18n keys in all six files.

## URLs
- https://icanspeak.it/francais/savoirs
- https://icanspeak.it/francais/{de,es,pt,it}/downloads
- https://icanspeak.it/francais/downloads/<file>.pdf (16 files)
- 70 indexable grammar sheets `/francais/enseignants/fiches/grammaire/<slug>`, 164 vocabulary sheets
  `/francais/enseignants/fiches/vocabulaire/<set>`, index `/francais/enseignants/fiches`. 14 draft sheets stay noindex.

## Skipped
- Work booklets (`berufe-*`): the content is Spanish-derived, so the catalogue entries are gone. `generate-berufe-pdf.mjs` is untouched.
- Complete word list A1-C2 in one book, translated word-list editions (old generator): not rebuilt.
- Grammar Start in es/pt/it/fr: only `en` and `de` have translation files.
- Index chips stay A1-B2; the C1 sheets exist and are in the sitemap but not in the index list.
- TEF "written comprehension" page: redirect loop, not linked.

## Checks
- `check:downloads`: all 16 files present, all 10 links 200 (FEI answers 200 for every path behind a bot challenge;
  I opened the 6 sample-paper pages in a real browser and the titles were right; TV5MONDE `/fr` loaded in the browser too).
- `check:base`, `check:links` (1,911 links, 153 routes), `validate:i18n` ok; `check-i18n-luecken` no new gaps.
- One build under the lock: ok, 1,593 pages; postbuild leak checks ok. `llms.txt` is over its 10 KB budget
  (12.8 KB before I removed the per-language entries; the Exams section is the big one, not mine).
- Chrome 1280x800 and 390x844 on dev (`/savoirs`, index, 3 grammar sheets, 1 vocabulary sheet) and on the build
  (`/savoirs`, `/de/downloads`, `/es/downloads`, one sheet): no horizontal scroll, no console errors, no 404s.
- "New version": order changes, same `?v=` reloads to the same order, version shows in header and footer.
  Print to PDF A4 and Letter (3 sheets): key starts on its own page.
- PDFs: pages of the A1 grammar book, B1 word list, irregular verbs list and Grammar Start read as extracted text.
  Not seen as rendered pages (no poppler here).
- Not run: the rendered look of the PDFs; the `llms.txt` change after the last build (list shrinks, no rebuild).

## Open wording doubts
- Page and PDF titles are English with French names in brackets; the grammar data explains in English, so the paper's
  instructions are English too. Worksheet titles mix French framing with English topic names ("Fiche : Passé composé with avoir (A2) ...").
- French UI texts and the de/es/pt/it versions of the FAQ, file descriptions and notes are machine drafts.
- `/francais/fr/downloads` does not exist (`fr` has no `urlPrefix` in the language registry).

## For Edgar
- Check the French titles and the five FAQ answers in `apps/french/src/data/downloads.json`.
- Still printed with `icanspeak.it/french`: `kontoDel.web.1` in the i18n files, `WortschatzDruck.astro`.

## Commits
- `8bc20626` PDFs and generators
- `25b498dc` /savoirs, downloads pages, i18n
- `70971f0c` worksheets
- `94731acf` footer URLs, TEF link
- `edb37b9f` llms.txt
- (this file) docs
