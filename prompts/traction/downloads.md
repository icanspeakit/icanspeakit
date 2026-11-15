# Lane: downloads (step 1)

You own the English course's free-material page and its PDFs: `apps/english/src/pages/knowledge*`,
`apps/english/src/data/downloads.json`, `apps/english/public/downloads/**`, the PDF generator
scripts in `apps/english/scripts/`, and new routes you add for localized download pages.
The `worksheets` lane owns `/teachers/worksheets/**` in the same app; don't touch it, but link to it.

This is deutschacademy's `/wissen` (631 ChatGPT sessions in 30 days) and its `/<lang>/downloads`
pages (~170), rebuilt for learners of **English**.

## Tier 1: what is there
- Read `deutschacademy/src/pages/wissen.astro`, `deutschacademy/src/data/downloads.json`,
  `deutschacademy/src/lib/downloads.js`, `deutschacademy/scripts/generate-*-pdf.mjs` and
  `check-downloads.mjs`, and find how deutschacademy builds `/es/downloads`, `/pt-br/downloads` …
  (grep for `downloads` in its `src/pages`, `src/integrations` and `astro.config.mjs`).
- Inventory `apps/english`: `src/pages/knowledge.astro`, `src/data/downloads.json` (lists German files
  like `grammatik-a1.pdf`), `public/downloads/` (`leben-in-deutschland-*.pdf`). Which entries are
  German leftovers, which are English already, which link to things that don't exist? Write it down.

## Tier 2: English material that is ours
- Remove the German leftovers from what `/knowledge` lists (keep the files only if something else
  links them; check with `check:links`).
- Generate English PDFs from the course's own data, the way deutschacademy generates its own from
  the trainers' data: at least
  - English grammar A1–C1, one PDF per level plus a complete one (from the English grammar topics);
  - the "Grammar start" PDF (the course already has `src/data/grammatik-start/` and
    `scripts/generate-grammatik-start-pdf.mjs`: check whether it is English);
  - irregular verbs list; most frequent words by level (if the lexicon data allows);
  - Life in the UK facts (the English course has `/life-in-the-uk/`), if the data is English.
- Each PDF: brand look (`brand/kit/BRAND.md`), footer with the URL of the matching page, file size
  shown on `/knowledge`.
- Official free sample papers (Cambridge English, IELTS, Trinity, and others the exam pages
  mention): **linked** in the lower half of `/knowledge`, never re-hosted. Check each URL returns 200.
- `/knowledge`: clear heading and intro that say what it is ("Free English learning PDFs and
  official sample papers, A1–C1"), a short FAQ that answers what people ask ChatGPT ("Where can I
  download free English grammar PDFs?"), JSON-LD (`CollectionPage` / `ItemList`, `FAQPage` only if
  the FAQ is visible). This is the page ChatGPT should cite.

## Tier 3: download pages in the learner's language
- Like deutschacademy's `/<lang>/downloads`: one page per UI language the English course supports
  (read `src/lib/languages.js`; at least es, pt(-br), and any of hi, vi, id, tr, ar, uk it has):
  `/english/<lang>/downloads`. Headline, intro and FAQ in that language (from i18n, not hard-coded),
  the PDFs listed, and the "Grammar start" PDF in that language if the generator supports it
  (deutschacademy does it in 10 languages: `GRAMMATIK-START-10-SPRACHEN-TIERED-PROMPT.md` there).
- `hreflang` between `/knowledge` and its language versions. In the sitemap and `llms.txt`.
- Native-quality text: write it carefully, keep it short. Flag anything you are unsure of in the
  done file rather than guessing.

## Tier 4: checks
- `pnpm --filter englishacademy check:base` and `check:links`; build once (lock file, SHARED.md).
- Browser: `/knowledge` and two language pages at both sizes; open three PDFs.
- Done file: list of PDFs (name, pages, size), URLs added, what Spanish/French need to copy this.
