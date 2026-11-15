# Lane worksheets: done (2026-11-15)

## What I found (Tier 1)
- `/english/teachers/worksheets/` already existed, inherited from deutschacademy and already
  translated: 180 grammar sheet routes, 164 vocabulary sheets, partner/tandem sheets, the pack
  (`folder`). The data in `src/data/grammatik/*.json` and `src/data/arbeitsblatt/*.json` is English
  (only the file names and ids are German). SHARED.md's note that `arbeitsblatt/*` is German content is
  out of date.
- Sheets are built from the same exercise data as the trainers (`src/lib/arbeitsblatt/grammatik.js`),
  so they stay in sync. Answer key on its own printed page and `teacher_tool_use` on print were
  already there. Missing: "New version", Letter paper, search titles/JSON-LD, a clear link text on
  the topic pages. deutschacademy has no "New version" either.

## What changed
- **New version** (`apps/english/src/lib/worksheet/version.js`, used by
  `src/pages/teachers/worksheets/grammar/[id].astro`): reorders items, matching columns (with new
  letters), word boxes and word tiles on the sheet **and** the answer key, from `?v=<1–9999>`
  (seed.js shuffle, so the same on every device and build). The version is printed in both headers
  and in the footer URL. "Original order" goes back. Fires `teacher_tool_use`
  `{tool: worksheet_grammar, action: new_version}` through `intent()` (consent-gated, never blocks;
  `track.js` loads analytics lazily).
- **SEO, grammar sheets:** title `<Topic> worksheet (<level>) – free PDF with answers` (≤72 chars,
  shortened at `:`/`—`/`?`/`(`), description with the sheet's own counts, JSON-LD `LearningResource`
  (`learningResourceType: worksheet`, `educationalLevel`, `isAccessibleForFree`, teacher audience,
  `isBasedOn` = topic page). Breadcrumb comes from Layout.
- **SEO, index:** title "Free English grammar worksheets A1–B2 with answers (PDF)", H1 "Free English
  worksheets", counts from data, JSON-LD `CollectionPage` + `ItemList` (70 sheets).
- **Tier 3, vocabulary sheets** (`vocabulary/[unit].astro`): same title/description/JSON-LD pattern.
  The data supports it (160 sets + 4 whole levels).
- **Paper fixes:** match hints "Tap/Click X, then Y" (trainer wording) become "Write the letter of the
  matching item in the box." on paper (`paperHint` in grammatik.js); table header default "Answer"
  (was the German "Lösung"); answer key match rows `text → d` (was `text.: d`).
- **Print:** `@page` no longer forces A4, so A4 and US Letter both fit (checked as PDF in both).
- **Topic pages:** the GrammarActions button says "Printable worksheet" (was "Print / PDF"), with a
  title. `/teachers` already links the worksheets.
- **Bug fix:** `AbOrigin.astro` didn't strip `/english`, so after a reload a sheet showed "Back to:
  <this same sheet>".
- i18n: `ab.newVersion`, `ab.newVersionTitle`, `ab.original`, `ga.worksheet`, `ga.worksheet.title` in
  all six UI files (only my lines staged). en `ab.index.title`/`ab.index.lead` reworded.
- Sitemap and llms.txt: the sitemap is built from the HTML, so it picks up every indexable sheet
  automatically. llms.txt lists the index (`/teachers/worksheets`, added by the indexing lane). The
  sheets themselves are left out to stay under the 10 KB budget; the index page lists them all.

## URLs (from the build)
- 70 indexable grammar worksheets: `https://icanspeak.it/english/teachers/worksheets/grammar/<slug>`
  (e.g. `present-perfect`, `past-simple`, `articles`, `prepositions-of-movement`).
- 164 vocabulary worksheets: `…/teachers/worksheets/vocabulary/<set>` (160 sets + a1/a2/b1/b2).
- Index: `https://icanspeak.it/english/teachers/worksheets`.
- 96 redirect stubs (old German-key URLs → English slugs), unchanged.

## Minimum and skipped topics
- Minimum 12 items: every topic with free exercises has 23–61, so none were skipped for size.
- 14 sheets stay **noindex** because their topic is a draft (`"status": "entwurf"`) and only appear
  in the index once Edgar reviews the topic: adjectives, conditionals, formal-linkers, like-doing,
  modals-of-deduction, numbers, phrasal-verbs, polite-requests, some-any, so-such-too-enough,
  there-is-there-are, two-objects, was-were, word-order.
- C1 topics (11) have no free exercises in `src/data`, so they have no sheet.

## Checks
- `pnpm --filter ./apps/english build` ok (lock file used); `check:base` ok;
  `check:i18n-keys` ok.
- `check:links`: 2 failures, neither from this lane: `https://icanspeak.it/espanol/` and
  `/francais/` linked from `/english/` (sibling courses outside `/english`, so the checker can't
  follow them).
- Playwright (system Chrome) at 1280×800 and 390×844: no horizontal scroll on the index, 3 sheets,
  `/teachers` and a topic page. No console errors apart from a site-wide dev-only 404 for
  `/fonts/fredoka-latin.woff2` (requested without the `/english` base; not from this lane).
- Print (PDF, A4 + Letter) of present-perfect `?v=3781`, prepositions-of-movement, articles: toolbar
  hidden, answer key starts a new page, nothing cut off, footer shows the URL with `?v`.
- `?v=3781` reloaded gives the identical order; sheet, key and matching letters agree.
- Screenshots/PDFs: `_tmp_screens/traction-worksheets/` (not committed).

## For Spanish / French (copy recipe)
- The pages and libs are the same files in `apps/spanish` / `apps/french` (same architecture). Copy
  `src/lib/worksheet/version.js`, the `data-ws-*` markup + SEO block of `grammar/[id].astro`, the
  index/vocabulary SEO blocks, `paperHint` in `lib/arbeitsblatt/grammatik.js`, the `@page` change and
  the AbOrigin fix. Translate the fixed English strings that sit on the paper or in SEO:
  `TAIL` (" worksheet (…) – free PDF with answers"), the description template, the index title,
  `PAPER_MATCH`, "Answer", " · Version {v}", and the 5 i18n keys.
- Their paper strings in the data are already in the course language. Check their `paperHint`
  regex against their own hint wording ("Toca/Haz clic …", "Touche/Clique …").

## For Edgar
- Nothing to click for this lane. Optional: review the 14 draft topics (set `"status": "geprueft"` in
  `apps/english/src/data/grammatik/<id>.json`) to publish their sheets too.
- Not mine, seen on the way: the 404 page's `<title>` is still German ("Seite nicht gefunden").

## Commits
- `9f514a99` fix(english): worksheet "Back to" link no longer points at the sheet itself
- `fbdaf9ab` feat(english): grammar worksheets get "New version", SEO and a clearer topic link
- (this file) docs: worksheets lane done file
