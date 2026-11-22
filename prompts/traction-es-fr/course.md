# Lane: one course (`spanish` or `french`)

Your start message names your app (`apps/spanish` or `apps/french`) and your port. You own that app
only. Reference: `apps/english` (read-only).

## Tier 1: what is there
- The free-material page (`src/pages/conocimientos.astro` / `savoirs.astro`), `src/data/downloads.json`
  (lists `grammatik-*.pdf`, `wortschatz-*.pdf`, `berufe-*.pdf`; only `grammatik-start*.pdf` exist on
  disk), `public/downloads/`, `scripts/generate-*-pdf.mjs`, `check-downloads.mjs`,
  `src/data/entry-pages.json`, `src/integrations/entry-pages.mjs`.
- Open what the generators produce today: is the shell German or English where it should be the
  course language? Which catalogue entries are dead?
- The teacher worksheets (`src/pages/profesores/fichas/**` / `enseignants/fiches/**`,
  `src/lib/arbeitsblatt/`): what exists, what the English lane added that is missing here.
- Write the inventory down in the done file before changing anything.

## Tier 2: PDFs that are ours
From the course's own data, like `apps/english/scripts/generate-grammar-pdf.mjs`,
`generate-wordlist-pdf.mjs`, `generate-reference-pdf.mjs`, `lib/pdf-copy.mjs`, `lib/pdf-brand.mjs`:
- grammar, one PDF per level the course has, plus a complete one;
- word lists per level (the lexicon has 5,000 words in 200 units);
- reference lists the data supports (verb tables / irregular verbs, conjugation; say what you skipped);
- "Grammar start" in the course language shell and in the UI languages the generator supports;
- the work booklets (`berufe-*`) only if the generator's output is in the course language and reads well.
- Each PDF: brand look (`brand/kit/BRAND.md`), footer with the URL of the matching page, size shown
  on the page. `pnpm generate:pdfs` runs them all; `check-downloads.mjs` passes.

## Tier 3: the page ChatGPT should cite
- The free-material page: title and H1 that say what it is, in the course language (the Spanish
  equivalent of "Free English learning PDFs and official sample papers, A1–C1"), a visible FAQ of
  about 5 questions people really ask, JSON-LD `CollectionPage` + `ItemList` + `FAQPage`.
- Only entries with a file on disk. Official sample papers linked in the lower half (see SHARED.md).
- Download pages per UI language through `entry-pages.json` with slug `downloads`, as English does
  (`/espanol/<lang>/downloads`, `/francais/<lang>/downloads`), with hreflang. In sitemap and `llms.txt`.

## Tier 4: worksheets
Copy what `prompts/traction/done/worksheets.md` lists under "For Spanish / French": "New version"
(`src/lib/worksheet/version.js` and the `data-ws-*` markup), search titles, descriptions and JSON-LD
for grammar sheets, vocabulary sheets and the index, `paperHint` (check the regex against this
course's own hint wording), the `@page` change, the AbOrigin fix, the i18n keys in all UI files.
Titles in the course language, the way a teacher of that language searches
(Spanish: "ficha … (B1) – PDF gratis con soluciones"; French: "fiche … (B1) – PDF gratuit avec corrigé";
check the wording teachers use before settling).

## Tier 5: checks
- `check:base`, `check:links` if the app has it, `check:downloads`, `check:i18n-keys`; one build
  (lock file). Every official link 200.
- Browser at 1280×800 and 390×844: the material page, two language download pages, the worksheet
  index, three worksheets; print preview (A4 and Letter) with the answer key on its own page. Open
  three PDFs and read a page of each.
- Done file: PDFs (name, pages, size), URLs added, counts of worksheet URLs, skipped things and why,
  open doubts about wording, what is left for Edgar, commit hashes.
