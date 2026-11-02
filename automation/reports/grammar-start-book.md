# Run report: `grammar-start-book`

Runs: 2026-10-29 (first run, stopped before it committed anything) and 2026-10-29/30 (this run,
which resumed from it). Branch `content`.

## What was done

| Commit | What |
|---|---|
| `d9a68c1` | `src/data/grammatik-start/en.json` is the English base book, **“English Grammar Start A1–B1 – The 10 most important chapters”**. The first run wrote it but never committed it; this run found it uncommitted in the worktree, reviewed it and committed it. |
| `da71f48` | The generator (`scripts/generate-grammatik-start-pdf.mjs`), the check (`scripts/check-grammatik-start.mjs`) and the download page (`src/lib/downloads.js`, `src/pages/wissen.astro`) read `en.json` instead of `de.json`. English cover line, slogan and running head. English catalogue entry (`src/data/downloads.json`), book cover words (`BookCover.astro`), teaser (`GrammatikStartTeaser.astro`, `gs.teaser.*` and `wissen.file.grammatik-start.desc` in `public/i18n/en.json`). |
| `b55282b` | Removed the 16 help-language files (ar, es, fa, hi, id, kmr, pl, ps, pt, ro, ru, tg, tl, tr, uk, vi). |
| `e5cbe37` | `de.json` is now the **German edition**: German explanations of the English chapters (draft). The cover title shrinks to fit on one line. |
| `d250fc2` | `docs/content-plan.md` §3 side files: notes on the new shape. |

### The book (en.json)

Same schema as the German book (`id`, `title`, `subtitle`, `source`, `notes`, `ui`, `chapters[]`
with `id/nr/level/priority/titleDe/topic/mascot/bubble/comic/blocks`); block ids `k1-…`–`k10-…`.
Each chapter links to the matching English topic page:

| # | Level | Chapter | Topic page |
|---|---|---|---|
| 1 | A1 | The verb be and subject pronouns | `/personalpronomen` |
| 2 | A1 | Present simple | `/praesens` |
| 3 | A1 | Word order and questions | `/w-fragen` |
| 4 | A1 | Nouns and articles: a, an, the | `/artikel` |
| 5 | A2 | Present continuous | `/konjugation` |
| 6 | A2 | Past simple | `/perfekt` |
| 7 | A1/A2 | Modal verbs: can, must, have to, should | `/modalverben` |
| 8 | A2/B1 | The future: will and going to | `/futur` |
| 9 | B1 | Present perfect | `/zusammengesetzte-verben` |
| 10 | B1 | B1 toolkit: conditionals, relative clauses, the passive | `/konditionalsaetze` |

Every chapter has rules, tables, examples, a Remember box, a typical mistake, a three-panel comic
and 2–4 exercise sets with answers. British English, US differences noted (“US: on vacation”).
Answer fields use straight apostrophes and list the alternatives (`'s sleeping / is sleeping`).
I read all ten chapters and found nothing to correct.

The English PDF was generated as a check (36 pages) and its text was read back with pdfjs: cover,
contents with page numbers, chapters, answers and back page are all English. A test copy of the
German edition (38 pages) also rendered correctly. The PDFs were then deleted again, because
`public/downloads/` is not tracked.

## Decisions

1. **Resumed rather than restarted.** The first run's `en.json` was complete and good, so I kept it.
2. **Removed the 16 help-language files** instead of keeping them. They explained the *German*
   chapters (word order with the verb in position 2, Dativ, Wechselpräpositionen…). Content plan
   §1.4 says: “Never leave a stale German-based translation next to English content.” Also, the
   site registers no help language except English (`src/lib/languages.js`), so they could not
   be built anyway. To look at them again: `git checkout da71f48 -- src/data/grammatik-start/<code>.json`.
3. **German is the only help language written.** Plan §3 calls German speakers “a real audience”,
   and I can write German reliably. Where it helps, the German text names the typical problem for
   German speakers (*mustn't* ≠ „muss nicht“, *will* ≠ „will“, „seit“ = *for/since* + present perfect,
   no comma before relative clauses). Status `draft`, so the cover says the explanations have not
   been checked by a teacher. I wrote no other languages: they would not be built, and the plan says
   to write them only where they can be trusted.
4. **The German edition is not built yet.** The generator builds an edition for every registry
   language that has a file. `de` is not in `LANGUAGE_REGISTRY`, so `pnpm generate:grammatik-start-pdf`
   builds only the English book. Adding German to the registry would be a site-wide change, so I left
   it out of this item. `downloads.json` lists `"editions": ["de"]`; that is harmless until then,
   because unknown codes are filtered out.
5. **`titleDe` kept as the key** for the chapter title (plan §1.3/§1.4: keep keys). It holds English
   text; `notes` in `en.json` says so.
6. **The check script now checks for leftover English** (words like *the, and, is, you*) in the
   translations instead of German, and keeps the English form headings (`be`, `work`, `can`,
   `will + verb` …). Its language list is now every file on disk except `en.json`.

## For Edgar to review

- **The German explanations in `de.json`.** I wrote them myself; no teacher has checked them.
  Set `"status": "reviewed"` once you have read them, and the draft line disappears from the cover.
- Do you want German as a help language (a `de` entry in `src/lib/languages.js`)? Only then is
  `grammatik-start-de.pdf` built and offered on /wissen.
- The back page and the “Practise:” lines still link to German slugs (`/grammatik`, `/wortschatz`,
  `/einstufungstest`, `/pruefungen`, `/praesens` …). The `routes` item renames these with
  redirects, so the links will keep working.
- Chapter 10 links to `/konditionalsaetze`, a topic still marked `entwurf`. Its page is built and
  shows the draft notice.
- `src/data/suche-seiten.json` still has German search words for the /wissen page (“grammatik-start
  a1–b1 – die 10 wichtigsten kapitel”). That is a generated search index covering the whole page,
  so I left it to the search/UI runs.

## Build

`timeout 1500 pnpm build`: passed (2439 pages, 4 min 33 s; postbuild leak checks OK).
`node scripts/check-grammatik-start.mjs`: ✓ de.
