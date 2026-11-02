# Run report: `listening`

Run: 2026-10-30 (one run, no earlier attempt). Branch `content`. Build green at the end
(`pnpm build`, 2,221 pages, postbuild checks ok).

## What was done

| Commit | What |
|---|---|
| `d02c050` | **`src/data/hoeren.json` is English**: the 16 texts are new British English scripts with UK settings. They keep the same ids, levels, types and speaker keys, so links, the guided path and the class test still resolve. Titles, blurbs, questions, options and explanations are all English. `types` labels, `voices` and `note` are English too. `public/i18n/en.json`: the 16 `hoeren.<id>.blurb` keys equal the new blurbs. The build renders these keys over the data, so they had to change as well. `uebersetzungen/hoeren.json` is emptied to `entries: {}` (see Decisions). |
| `695e219` | `src/pages/hoeren/[id].astro`: the speed buttons read `0.75×` / `1.25×` (they used German `0,75×`). |
| `9401d9b` | `docs/content-plan.md` §5.3 records the English listening state. |

### The texts

| Level | Id | English text | Questions |
|---|---|---|---|
| A1 | `a1-ansage-bahnhof` | Station announcement: train to Manchester, 10 min late, platform change 4 → 7 | 3 |
| A1 | `a1-anruf-arzt` | Voicemail from the surgery: doctor ill, new appointment, call back | 4 |
| A1 | `a1-supermarkt` | Where's the milk / bread; no bread rolls today | 3 |
| A1 | `a1-verabredung` | Mei and Amira change the time (4 → 6) and the place (café → flat) | 3 |
| A2 | `a2-amt-termin` | Council customer services: moving a parking-permit appointment; documents to bring | 4 |
| A2 | `a2-wohnungsbesichtigung` | Flat viewing: £950 rent, water and internet included, £1,000 deposit, free from 1 June | 4 |
| A2 | `a2-radio-wetter-verkehr` | West Midlands weather, ice warning; M6 northbound queue, broken-down lorry | 4 |
| A2 | `a2-paketdienst` | Two voicemails: parcel at a shop (photo ID); boiler engineer on Tuesday unless you text | 4 |
| B1 | `b1-krankmeldung` | Calling HR: 7 days of self-certification, then a fit note; phone on day one before the shift | 5 |
| B1 | `b1-elterngespraech` | Parents' evening: good at maths, weak at writing in English; free writing club | 5 |
| B1 | `b1-radio-muelltrennung` | Council recycling: only plastic *packaging* in the blue bin, no plastic bags, fortnightly black bin | 5 |
| B1 | `b1-durchsage-ersatzverkehr` | Signalling problem, rail replacement buses, airport change, tickets valid | 5 |
| B2 | `b2-diskussion-homeoffice` | Team meeting: three positions, compromise (up to 3 days at home, 1 office day, review) | 5 |
| B2 | `b2-interview-anerkennung` | Recognition of foreign qualifications: regulated professions, "comparable, not identical", start early | 5 |
| B2 | `b2-beschwerde-versicherung` | Insurance claim turned down ("slow leak" vs burst hose); reopen, written confirmation, Financial Ombudsman | 5 |
| B2 | `b2-vortrag-ehrenamt` | Talk on volunteering in the UK: short-term projects, unequal spread, lower the barriers | 5 |

That makes 68 questions in total. I wrote the scripts myself and did not translate the German ones. Where the German
text was about a German rule (Kaltmiete/Nebenkosten, gelbe Tonne and Pfand, AU-Bescheinigung,
Ausländerbehörde, Anerkennung), I kept the listening task and swapped in the matching UK situation.

## Decisions

- **Fictional places and firms** (*Westbridge Council, Kingsford, Ashby Green, Oakfield Medical
  Centre, Swiftline Deliveries, Hartley Plumbing*). Bin colours, council procedures and rail
  routes vary from town to town in the UK. A made-up town cannot misquote a real local rule.
  The real names used are Manchester, the West Midlands and the M6, and only as settings.
- **UK rules stated as fact, checked in this run:**
  - Self-certification covers the first 7 days off sick; after that the employer can ask for a fit note (NHS GP practice pages, gov.uk SC2 form).
  - You have 6 months from the firm's final response to go to the Financial Ombudsman Service (FOS time-limit pages, FCA Handbook DISP 2.8).
  - The B2 interview names only stable, general points: regulated professions need registration with the professional body, and recognition is voluntary otherwise.
  - The volunteering talk gives no statistics, because I could not verify current UK figures in this run. The German text had one ("28 million").
- **Phone number** `0121 496 0324`: this is in Ofcom's range reserved for drama (0121 496 0000–0999), so it reaches nobody.
- **Numbers in scripts are spelled out** ("twelve twenty", "four eight nine two"), as in the
  German data, so TTS reads them the way a person would. In options, prices, dates and times use
  digits in UK style (`£950 a month`, `18 March at 10.30`, `From 1 June`).
- **Answer fields use the straight apostrophe** (content-plan §1.2). Explanations use typographic quotes.
- **Option lengths were kept balanced**, so that the longest option is not always the right one. The
  `raten.laengste-antwort` rule of `scripts/check-inhalte.mjs` passes for all 68 questions. The
  answer is first in the data, as before; `quiz.js` shows the options in a seeded shuffle.
- **`seconds`** is a fresh estimate from word count (A1 2.0, A2 2.2, B1 2.5, B2 2.6 words/s), used
  until a real clip exists. Most texts are a little shorter than the German ones.
- **`voices`**:
  - Azure names are `en-GB` neural voices (Sonia, Libby, Hollie, Ryan, Thomas).
  - The `id` fields hold ElevenLabs premade British voices from memory: Alice, Lily, Daniel, George.
  - `frau2` has `id: ""`, because I was not sure of a second young British female voice.
- **`uebersetzungen/hoeren.json` emptied** (shape kept, `_note` explains why). Every entry
  translated the German scripts. English is the only help language registered
  (`src/lib/languages.js`), so an `en` entry would just repeat the transcript under each turn. With
  no entry, the page shows no help bar. This is the same handling `grammar-structure` used for
  `uebersetzungen/grammatik.json`.

## Left open / for Edgar to review

- **Voice ids**: check the four ElevenLabs ids against the provider's voice list, and pick one for
  `frau2`, before the first render. There is no audio generator script in `scripts/` at the moment.
  `pnpm generate:hoeren` is mentioned in German fallback text only.
- **Read-through**: the scripts have not been reviewed by a second person. I would most like an eye on the B2 texts (register) and on the A2 flat viewing. Is "water and the internet included" plausible enough for a UK let? It was picked to give a clean question.
- **Help-language transcripts**: if more help languages are registered later, the sidecar needs
  new translations of the English scripts. That has no queue item.
- **Not touched (owned by other items):**
  - The German fallback strings in `src/lib/catalog.js` (`Fragen`, `Hörtexte`) and in the pending notes of `src/pages/hoeren/*.astro`. en.json overrides them in the build.
  - The `/hoeren` → `/listening` slug, which belongs to `routes`.
  - `examHoeren.js` and the exam listening parts, which belong to `exams`.
