# Run report: `culture`

Date: 2026-10-30 · Branch: `content` · Result: done (build green), map pages split off

## What was done

The culture and knowledge hub is English and UK-first (content-plan §5.8). Ids, slugs and file
names are unchanged.

| File | Now | Commit |
|---|---|---|
| `kultur.json` | 23 UK topics in the old slots, A1–C2: first names and Mr/Ms, queuing, Sunday trading, tipping UK vs US, the four nations, bank holidays, recycling and bin day, booking appointments, first steps (GP, NI number), the NHS, renting, the school system, finding a job, apprenticeships and university, notice periods, the BBC and the TV licence, clubs and volunteering, devolution, National Insurance and the welfare state, general elections, Remembrance, the uncodified constitution, trade unions. 4 quiz questions each (92), 3-panel mascot comic each, phrases to learn, `sourceNote` with source and "as of". `sourcingNote` in English. | 08ebfc1 |
| `uebersetzungen/kultur.json` | `entries` emptied: every entry translated the German topic of its slot. No help block shows until it is refilled. | 08ebfc1 |
| `public/i18n/en.json` | the 22 `kultur.<id>.cardIntro` (they override the card text) = first sentence of each new intro; hub texts that still said Germany or "real classroom discussions" (`tool.kultur.desc`, `kultur.hero.subtitle`, `kultur.moreNote`, `fortschritt.item.kultur.lead`, `kultur.quiz.headerTitle`, `kultur.level.*`, `nav.kultur.auto*`) | 08ebfc1, 9302516 |
| `kultur-insider.json` ("The UK from the inside") | **13 topics** instead of 37 (see decisions) | 9302516 |
| `wusstest-du.json` | 3 English "Did you know?" facts for each of the 160 word sets, at the set's level, matched to the English set titles | 8a7fcb2 |
| `kalender-saetze.json` | 39 English proverbs and 52 idioms with simple meanings | 8a7fcb2 |
| `zitate.json` | 131 English quotations by 43 public-domain authors (work and place given; plain-English `meaning`; 3 words with a/an/some, easy definition, tr/uk/ar/ru/fa glosses) | e99424b |
| `uebersetzungen/zitate.json` | every `langs.<lang>.quotes` emptied (stale German-based translations) | e99424b |
| `kultur-bilder.json` | queuing 👥, tipping 🧾, Sunday shops 🏪 (no 💶); insider map trimmed to the 13 ids | 08ebfc1, 9302516 |
| `src/lib/kulturKeywords.js`, `searchIndex.js` | English search keywords for all kept topics; insider label "The UK from the inside" | 4fceee4, 9302516 |
| Pages | `/kultur/[id]` and `/kultur/insider/*`: share titles, "Reality check", "Facts and figures", "Sources", "As of", mascot lines, `lang="en"`; no empty Sources heading for topics without sources. `ZitatCard.astro`: `lang="en"`, ", plural: …" instead of ", die …" | 3c62405, 9302516, e99424b |
| `src/lib/knigge/scenes.js` | two "more" links to dropped insider topics (`date-knigge`, `nein-ist-nein`) now go to `erstes-date` | 9302516 |
| `docs/content-plan.md` §5.8, `automation/QUEUE.md` | status note; new item `accents-languages` | (this commit) |

## Decisions

- **All topics `sourcing: "sachwissen"`.** The `"unterricht"` kind meant "from a real class
  discussion at the German school"; that is not true of the English texts.
- **Eyebrows** are five English categories. Their slugs (`kultur.eyebrow.<slug>`) have no en.json
  key, so the page shows the data text, which is already English. The old German-slug keys
  (`kultur.eyebrow.*`, `kultur.linkLabel.*`) are now unused; left for `cleanup`.
- **`marked` on `duzen-siezen`** now marks the forms of address ({Mr}, {Ms}, {Dr}, …); the build
  check in `kulturMarks.js` passes.
- **Insider: 13 instead of 37 topics** (content-plan §8.6). Kept: `hallo-sagen`, `naehe-abstand`,
  `hoefliche-notluegen`, `puenktlichkeit`, `zusammen-oder-getrennt`, `leute-kennenlernen`,
  `freunde-finden`, `arbeit-finden`, `deutschland-und-das-auto`, `gleichberechtigung`,
  `erstes-date`, `direktheit`, `vertrauen`. Dropped: 24 topics built on German dating/gender
  surveys, German elections and German foreign aid; a UK version would need statistics we could
  not verify. Etiquette topics have no statistics, so `sources: []`, and they say they describe
  common practice. Old URLs of dropped topics 404 until `routes` adds redirects (suggest → `/kultur/insider`).
  Old quiz reports `k:insider/<dropped id>/qN` in learners' localStorage point at removed topics.
- **Quotes: 131, not 366.** `src/lib/zitate.js` picks the day's quote modulo the list length, so
  fewer verified quotes beat 366 shaky ones. No author portraits (the card shows initials); the
  German portraits stay on disk under `public/zitate/personen/` (for `cleanup`).
- **Split off `accents-languages`.** `/wissen/dialekte` and `/wissen/sprachen` need new map
  geometry (UK/Ireland accent areas; English-speaking countries) produced with geo packages that are
  not installed (`world-atlas`, `d3-geo`, Natural Earth admin-1), plus ~260 prose keys in en.json.
  That is a job of its own; the plan allows hiding the accent map if outlines can't be made offline.
  These pages are still German-course content until then.

## For Edgar to review

Facts the writers flagged as least certain (all carry "as of" where they change):
- Prescription charge £9.90 (England, 2025); tuition fee £9,535 (2025/26); TV licence £174.50
  (April 2025); National Living Wage £12.21 (April 2025, the 2026 rate is not given); union
  membership "around a fifth, roughly 22 %"; voter photo ID "Great Britain since 2023".
- Employment Rights Act 2025 is only mentioned as "being phased in" (unfair dismissal, notice).
- Senedd "closed list system from 2026": the May 2026 result is not stated.
- `wusstest-du`: MOT at three years, 15 national parks, Ben Nevis 1,345 m, 14 allergens, 5.6 weeks'
  holiday, 14-day cooling-off, Oxford teaching since 1096. Draft, not teacher-reviewed.
- Quotes: some chapter numbers were cited from memory (Frankenstein ch. 5/20, Northanger Abbey
  ch. 5, Great Expectations ch. 40, Middlemarch Book 6 ch. 3, Wollstonecraft ch. 4) and Franklin's
  almanac years. A quick check against the texts is worth doing.
- Insider: gov.uk URLs `/vehicles-can-drive` and `/marriages-civil-partnerships` were written from
  memory; the ONS pay-gap figures (13.1 % all / 7.0 % full-time, April 2024) match the ONS bulletin.
- `kultur.json` links point to `/leben-in-deutschland/test` and `/fakten` (the Life in the UK
  slot); they follow the `routes` rename.

## Left / uncertain

- `uebersetzungen/kultur.json` and `uebersetzungen/zitate.json` are empty: help-language
  translations of the new texts are open (no queue item).
- `/spiele/knigge` scene texts are still German (games item).
- `catalog.js` still has German fallback titles (`Deutschland von innen`, `Deutschland und das
  Auto`) behind i18n keys that are English; the `/politik` entry stays until `cleanup`.
- Build: `pnpm build` green, 1,637 pages, postbuild checks ok.
