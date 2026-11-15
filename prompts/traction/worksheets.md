# Lane: worksheets (step 1)

You own new teacher worksheet pages in the English course: `apps/english/src/pages/teachers/worksheets/**`,
`apps/english/src/lib/worksheet/**` (or the existing `arbeitsblatt` lib if you adapt it) and the
worksheet data. The `downloads` lane owns `/knowledge` and PDFs; link to each other, don't edit theirs.

On deutschacademy these pages are what Google and Bing send teachers to:
`/lehrkraefte/arbeitsblaetter/grammatik/<topic>` (genitiv 19, als-oder-wenn 18,
praeteritum-plusquamperfekt 17, personalpronomen 16 … search sessions in 30 days). One topic, one
URL, printable, free, with answer key.

## Tier 1: understand the original and the gap
- Read `deutschacademy/src/pages/lehrkraefte/arbeitsblaetter/` (index, `grammatik/[id].astro`,
  `wortschatz/`, `mappe.astro`) and `deutschacademy/src/lib/arbeitsblatt/` (`grammatik.js`,
  `printable.js`, `client.js`, `seed.js`): how a worksheet is generated from exercise data, how
  print/PDF works, the seed for "new version", the answer key, the `teacher_tool_use` event.
- In `apps/english`: `src/data/arbeitsblatt/*.json` are **German** topics (adjektivdeklination,
  als-oder-wenn …) inherited from deutschacademy. Find the English grammar topics and their exercise
  data (`src/data/grammar*`, `src/lib/catalog.js`, `/grammar/` pages). That is the source.
- Check `apps/english/src/pages/teachers/` (cards, games, quiz …) so the new section fits in.

## Tier 2: build `/english/teachers/worksheets/`
- `/teachers/worksheets/grammar/<topic>` for every English grammar topic that has enough exercise
  items (decide a minimum, e.g. 12; list skipped topics in the done file). Generated from the same
  data the trainers use, so they stay in sync.
- Each worksheet: title and level, short rule box, 2–3 exercise blocks of different types, answer
  key on a separate printed page, "New version" (seeded shuffle, seed in the URL query so a printed
  sheet can be reproduced), "Print / save as PDF" with clean print CSS (A4 and Letter, no nav,
  footer with the page URL). Fires `teacher_tool_use` via `track()` (never blocking if analytics
  is blocked).
- Index `/teachers/worksheets/`: by level and by topic, searchable/filterable like deutschacademy's.
  Link it from `/teachers/` and from each matching grammar page ("Printable worksheet for this topic").
- SEO per page: title like "Present perfect vs past simple worksheet (B1) – free PDF with answers",
  meta description, canonical, JSON-LD (`LearningResource` with `educationalLevel`,
  `learningResourceType: worksheet`, `isAccessibleForFree: true`). In sitemap and `llms.txt`.

## Tier 3: vocabulary worksheets (if Tier 2 is done and solid)
- Same for vocabulary by topic/level if the English lexicon data supports it (deutschacademy:
  `wortschatz/`). Skip with a note if the data isn't there.

## Tier 4: checks
- Print preview of 3 worksheets (A4), answer key on its own page, nothing cut off.
- `check:base`, `check:links`, one build (lock file, SHARED.md), browser at both sizes.
- Done file: count of worksheet URLs, skipped topics and why, what Spanish/French need to copy this.
