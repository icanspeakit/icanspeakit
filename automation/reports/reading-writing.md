# Run report: `reading-writing`

Run: 2026-10-30 (one run, no earlier attempt). Branch `content`. Build green at the end
(`pnpm build`, 2,221 pages, postbuild checks ok).

## What was done

| Commit | What |
|---|---|
| `804a92a` | **Reading and writing content is English.** `src/data/lesen.json` (the B1 simulation: 5 reading groups, form task, writing prompt, error hunt), `src/data/fertigkeiten/lesen.json` (11 reading texts A1–B2) and `src/data/fertigkeiten/schreiben.json` (8 writing tasks A1–B2). Ids, levels, `type`, `kind`, `from` links and the field shapes are unchanged. `src/lib/fertigkeiten.js`: the generic checklists that the three borrowed B1 writing tasks get (`FORM_CHECK`, `BRIEF_CHECK`, `ERROR_CHECK`) are English. `public/i18n/en.json`: every `lesen.<id>.blurb`, `schreiben.<id>.blurb`, `schreiben.check.<id>.<n>`, `lesenSim.*` key, plus `lesen.hero.subtitle`, `dtzMock.title`, `dtzMock.hero`, now equals the data. The build renders these keys over the data, so they had to change as well. |
| `c058acf` | `uebersetzungen/lesen.json` and `uebersetzungen/schreiben.json` are emptied to `entries: {}`, with an English `_note`. |
| `d5aad15` | `src/lib/schreibKorrektur.js` ("Correct my text") now checks English. See Decisions. |
| `4c1594f` | The A2 neighbour email model was cut to 56 words to fit its 50–60 range. |
| `6345f15` | Paired straight quotes in prose, explanations and checklists are now typographic “…” (content-plan §1.2). Answer fields are unchanged. en.json re-synced. |
| (this commit) | `docs/content-plan.md` §5.4 records the state; this report. |

### Reading texts (`/lesen/[id]`)

| Level | Id | English text | Qs |
|---|---|---|---|
| A1 | `a1-schilder-im-haus` | Six notices in a block of flats (laundry room, bike store, post, bins, caretaker) | 4 |
| A1 | `a1-nachricht-einladung` | Mira's birthday texts: 7 pm, Flat 3, doorbell broken so phone, bring music | 4 |
| A2 | `a2-wohnungsanzeigen` | Four flat/room adverts (£ per month, furnished six-month studio, ground floor with garden, house share) | 4 |
| A2 | `a2-email-kurs-absage` | Language school email: teacher ill, new teacher, Room 2.14 *instead of* 1.03, make-up Saturday | 4 |
| B1 | `b1-digitales-buero` … `b1-interview` | From `lesen.json` (below) | 3/5/5/4/4 |
| B2 | `b2-artikel-homeoffice` | The working-from-home debate: two studies (one confirms part, one limits it), UK legal position | 5 |
| B2 | `b2-kommentare-innenstadt` | Five readers' comments on a car-free centre in (made-up) Kingsford | 5 |

**B1 simulation (`lesen.json`):**
- Topic: *learning as an adult* at the made-up *Westbridge Adult Learning*. That is the German "online lessons" topic without the integration-course framing.
- Parts: task 1 matches six course adverts to five people, task 2 is a true/false article, task 3 is four forum posts (*who says this?*) and task 4 an interview.
- Also in the file: the paperless-office staff notice, an enrolment-confirmation form task, a reply to David (he is visiting your town) and the landlord letter for the error hunt.

### Writing tasks (`/schreiben/[id]`)

| Level | Id | Task |
|---|---|---|
| A1 | `a1-formular-anmeldung` | Leisure-centre form from a short self-introduction (10 fields, UK date order, postcode) |
| A1 | `a1-nachricht-absage` | Text to Mira: can't come, reason, happy birthday, new day (30–40 words) |
| A2 | `a2-email-nachbarn` | Email to a neighbour: *Could you …? / Would you mind …ing?* (50–60 words) |
| A2 | `a2-formular-arztpraxis` | Phone call to a GP surgery → appointment form (spoken date and phone number, one inferred field) |
| B1 | `b1-formular-vhs`, `b1-brief-david`, `b1-fehlerjagd` | From `lesen.json` |
| B2 | `b2-beschwerde-reiseveranstalter` | Complaint to a holiday company (180–200 words), model 183 words |

## Decisions

- **Same slots, new tasks.**
  - Where the German task taught a German point, the slot now teaches the matching English point.
  - *Sie* vs *du* (A2 neighbour email) became polite requests (*Could you …?*, *Would you mind + -ing*) and register in the sign-off.
  - German date format became the British day/month order.
  - Health-insurance fields became doctor/contact number.
  - The World Cup prompt became a friend's visit, because the 2026 World Cup is over.
- **No exam brand in the simulation titles** ("B1 reading, task 1: …" rather than "DTZ-Simulation"). The tasks follow the content-plan list (notices/adverts matching, article true/false, forum *who says this?*, interview). I did not claim they copy the real ISE I format. `dtzMock.hero` says "in the style of the Trinity ISE I reading tasks and written for this site". Before, it said "from real DTZ teaching material", which was no longer true.
- **The one legal fact** (B2 article) was checked against what I know to be current. There is no legal right to work from home in the UK. Employees can make a flexible-working request (a day-one right since April 2024). Employers must handle it reasonably, and they can refuse for business reasons. I wrote it without dates or numbers so it does not go stale quickly. The two studies are unnamed on purpose: the German text named real institutes with findings I could not verify.
- **Fictional data:**
  - Phone numbers are from the Ofcom drama ranges (`0121 496 0731`, `07700 900 482`, `07700 900 315`).
  - Emails use `example.com` / `example.co.uk`.
  - The postcode `WB3 7QT` uses a non-existent postcode area.
  - Towns, centres and firms are made up (Westbridge, Kingsford, Oakfield Medical Centre). The comment that names Ghent, Pontevedra and Groningen is an opinion, with no figures.
- **Form answers** (`fields[].answer`):
  - Plain hyphen and straight characters, because the page compares them with what the learner types. It gives "near" for case, spacing, leading zeros and `/ . -`.
  - UK formats: `04/03/1996`, `3.30 pm`, `£45`, `6-8 pm`.
  - `Vera Salieva` comes from the email's "Ms Salieva" plus the article. The German answer was "Frau Salieva (Veronika Salieva)", which no one could type exactly.
- **Quiz options** stay in data order with the answer anywhere. `quiz.js` shows them in a seeded shuffle. `scripts/check-inhalte.mjs` reports no error or warning for the three files; its only notes were straight quotes, which are fixed now.
- **`schreibKorrektur.js`** had German-only rules and called LanguageTool with `de-DE`, which would have marked every English word as misspelt. It now:
  - sends `en-GB`;
  - drops the comma-before-*weil/dass* and verb-at-the-end rules;
  - flags a lower-case *i*, a question without `?` (English question starters; *Have/Do/Will* left out so "Have a great trip." passes), three sentences in a row starting with *I*, and a missing English greeting or sign-off in messages, emails and letters;
  - reads the word range from "(30–40 words)";
  - writes its findings in English.
  The three model texts give no findings, and a test text with typical errors gets the expected ones.
- **Sidecars emptied**: every entry translated the German texts, and English is the only registered help language. The pages handle a missing entry (`help?.…`) and show no help bar or word list. This is the same handling as `listening`.

## Error hunt: the mistakes in the model letter (for teachers; the page has no key on purpose)

1. *there is a big problem … since two weeks* → *there has been a big problem … for two weeks*
2. *nobody of my neighbours clean them* → *none of my neighbours cleans/clean them*
3. *I have spoke* → *I have spoken* (or *I spoke*)
4. *I putted a notice* → *I put up a notice*
5. *The neighbours doesn't care* → *don't care*
6. *is not working good* → *is not working well* / *properly*
7. *take this problem serious* → *seriously*
8. *should also be make* → *made*
9. *I look forward to hear from you* → *to hearing from you*
10. *Dear Mr Hughes … Yours faithfully* → *Yours sincerely* (named person)

(*Also there are other problems* → *There are also other problems* is a style point.)

## Left open / for Edgar to review

- **LanguageTool is an integration outside `src/lib/backend.js`.** `schreibKorrektur.js` calls `api.languagetool.org` straight from the browser when a learner clicks "Correct my text", and the privacy pages mention it. I only switched the language. I did not add a `BACKEND` flag or remove the call, because that changes the privacy text and the button behaviour. Decide whether it stays (then it probably belongs behind a flag) or goes.
- **Read-through**: no second person has checked the texts. I would most like a second look at the B2 article (register, and the flexible-working sentence) and at the B2 complaint model.
- **`docs/inhalte-qa/`** (untracked, not committed by me): running `node scripts/check-inhalte.mjs` rewrote `befunde.json` and `bericht.md` in that folder. If another session had a report there, it is now the current one.
- **Not touched (owned by other items):**
  - German fallback strings in `src/pages/lesen*`, `schreiben/*` and `catalog.js`/`LearnShell.astro` (en.json overrides them in the build).
  - The nav menu's German culture topics.
  - The `/lesen` → `/reading`, `/schreiben` → `/writing` and `/lesen-schreiben` slugs (`routes`).
  - The `/dtz` page and the exam practice sets (`exams`).
  - The German comments in `src/pages/dtz/mock-test.astro`.
