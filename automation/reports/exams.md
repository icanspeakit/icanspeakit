# Run report: `exams`

Date: 2026-10-30 · Branch: `content` · Result: done (build green)

## What was done

The exam hub now holds English exams per content-plan §2. Every slot has its format and one
practice set of our own material. Ids, slugs, file names and storage keys are unchanged.

| Slot (id) | Now | Files |
|---|---|---|
| `goethe-a2/b1/b2` (formats) | Cambridge A2 Key, B1 Preliminary, B2 First | `formate-a2-c1.research.json`, `goethe-formate.json` |
| `telc-a2/b1/b2` (formats) | Trinity ISE Foundation, ISE I, ISE II | `formate-a2-c1.research.json`, `telc-formate.json` |
| `goethe-a2-1`, `goethe-b1-1`, `goethe-b2-1` | One full practice set per Cambridge exam (all papers, real part numbers, British listening scripts) | `saetze/` |
| `telc-a2-1`, `telc-b1-1`, `telc-b2-1` | One practice set per ISE level (Tasks 1–4, independent listening, topic/conversation/collaborative) | `saetze/` |
| `start-deutsch-1` | A1 English practice test (unbranded, 60 % = our convention) | `start-deutsch-1/uebungssatz-1.json` |
| `testdaf` | IELTS Academic: 3 reading passages (30 questions) + Writing Task 1 | `testdaf/uebungssatz-1.json`, `testdaf-formate.json` |
| `dtz` | B1 skills mock (listening, reading, writing) at ISE I level | `dtz/uebungssatz-1.json` |
| `sprachbausteine` | B2 Use of English gap fills (word box, multiple choice) | `sprachbausteine/satz-1.json`, `satz-2.json` |
| `leben-in-deutschland` | Life in the UK bank: 39 UK-wide questions, 4 nations × 5–6 | `leben-in-deutschland.json`, `uebersetzungen/leben-in-deutschland.json` |
| `fallen` | 12 B1 exam traps in English, each tied to a real task | `fallen.json` |

Code/UI touched (only where the exam data needed it):
- `src/lib/exam/names.js` (new): `EXAM_NAMES` (goethe = Cambridge English, telc = Trinity ISE) and
  `examLabel()` ("Cambridge B1 Preliminary", "Trinity ISE I"). Kept apart from `saetze.js` so the
  `/fortschritt` registry doesn't bundle the sets. Used by `PruefungSatz.astro` (titles, h1,
  schema) and `registry.js`.
- `pruefungEngine.js`: write-in parts may sit in a gap text (open cloze, word formation); the
  gap shows the typed word. `check-pruefungen.mjs` checks those gaps are placed.
- `registry.js`: all titles, pass notes and module labels English; Life in the UK default nation
  = first entry (England) instead of `bayern`.
- `dtzTrainer.js`: true/false and "none" buttons in English, B1 level/topic for "My mistakes".
- `leben-in-deutschland/test.astro` (facts box from gov.uk), `fakten.astro` (default nation),
  `dtz/uebungssatz.astro` (heading), `pruefungen/fallen.astro` (chips, `lang="en"`).
- `public/i18n/en.json`: 82 exam values rewritten (DTZ/BAMF/Goethe/telc/federal-state wording).
- `docs/content-plan.md` §2: status note.

Commits: `b639a48` … `fe5410f` (24 commits, `git log --oneline --grep "content(exams)"`), plus the
report commit.

## Decisions

1. **Formats checked against official sources (2026-10-30).** Trinity ISE I and ISE II from the
   official test-overview PDFs (task question ranges, word counts 100–130 / 150–180, S&L 18 / 20
   min, listening procedure). ISE Foundation only from the resources page (2 h; S&L about 13
   min, also "12 min plus admin" for video conference); its reading task details are taken from
   ISE I/II and listed as unverified. Cambridge A2 Key from the 2026 *Information for
   candidates* PDF (60 min R&W, 7 parts/32 questions; Listening about 30 min, 5 parts/25; Speaking
   8–10 min, 2 parts; scale 120–150). B1 Preliminary and B2 First from the handbook facts I am
   confident of — the live cambridgeenglish.org exam-format pages returned 404, so the research
   file marks them "not re-checked live". Unconfirmed points are in each entry's `unverified`.
2. **Engine adaptations, stated on the page.** ISE "five of eight statements are true" is judged
   as eight true/false items; ISE spoken listening answers become written short answers or
   multiple choice; Cambridge picture options become text options; B2 First Part 4 is 1 point
   here (2 in the real exam). The research file `items` are the counts of OUR sets, so the
   validator still matches.
3. **Pass lines.** Cambridge and Trinity sets say what the real result system is and that 60 % is
   our own guide. IELTS keeps "no pass mark". The B1 mock keeps the trainer's 33/20-of-45 bands
   but they are now labelled "our guide" (en.json `dtz.stufe.*`, `dtzSet.*`, `dtz.scoringNote`).
4. **`/dtz` slot = B1 skills mock, not an ISE mock.** The DTZ trainer's 9-part shape can't hold
   the ISE task structure without code changes; the ISE I-format set is `/telc/b1`. Content-plan
   asked for "Trinity ISE I full mock" — Edgar, please confirm this compromise (or plan a trainer
   change).
5. **Life in the UK.** Real test: 24 questions, 45 min, pass 18 (75 %), no nation-specific part —
   the page now says so; our 4 nation sets are extra practice. Own questions from public facts;
   the Crown-copyright handbook is not copied. Voting age left out on purpose (a bill to lower it
   to 16 was going through Parliament; not confirmed). Help-language translations were emptied
   (they explained the German test); pages fall back to English.
6. **Traps** keep their ids (reel anchors) although some ids name the old German trap
   (`wenn-als`, `verb-nach-der-luecke`) — `routes` can rename them with redirects.
7. Writing was parallelised (one writer per set); I reviewed samples of every set (answers
   against texts, numbering, level) and ran `check-pruefungen` (ok: 8 sets + 4 DTZ sets, 648
   scored items) and `check-inhalte` (no errors in exam files; a few "longest answer" warnings
   remain in listening items and one Life in the UK question).

## Left / for Edgar to review

- **Paid content still German:** `src/paid/pruefungen/saetze/goethe-c1-1.json`, `telc-c1-1.json`
  (and their `goethe-c1`/`telc-c1` research entries), `src/paid/pruefungen/dtz/uebungssatz-2..4.json`.
  They show up as paid entries ("Übungssatz 1 … C1" in the `/goethe` list). Suggest a queue item
  `exams-paid` (Cambridge C1 Advanced, ISE III, B1 mocks 2–4) or hide them until then.
- **Life in the UK downloads:** `/leben-in-deutschland/fakten` still links the German Bavaria
  PDFs (`fakten.astro:62-68`, `downloads.js`), and `scripts/generate-bundesland-pdf.mjs` /
  `generate-fakten-pdf.mjs` are German. `LidGrafik.astro` draws only the old German topic ids, so
  no topic graphics show. `lid.fsLink` still links the dropped driving licence (`cleanup`).
  German server text remains in `leben-in-deutschland/index.astro` (`:62`), rendered English via
  keys where keyed.
- **Führerschein** entry in `registry.js` untouched (dropped module, `cleanup`).
- **Orphan i18n keys:** old `format.t.<hash>` and `telcSb.t.*` values describe the German tables;
  they no longer match anything (harmless; `cleanup` can remove them).
- **Fact spot-checks wanted:** IELTS passage 2 dates (railway time 1840/1847, 1880 law); B1/B2
  Cambridge scale bands; ISE Foundation subject area "Travel".
- **Native-speaker read-through** recommended for all sets (written by AI, checked by sampling),
  especially B2 First Part 1/4 distractors and ISE true/false items.
- **Audio:** 59 listening clips have scripts and en-GB voice names but no mp3 (needs the TTS
  provider). Pages show the transcript meanwhile.
- `src/lib/dtzTrainer.js` still parses German part labels (`Hören · Teil 1`) from the data, so
  those stay German in `dtz/uebungssatz-1.json`; the registry translates them for display.

## Verification

- `node scripts/check-pruefungen.mjs`: ok (8 sets + 4 DTZ sets, 648 scored items, 59 clips).
- `timeout 1500 pnpm build`: passed twice (2131 pages, postbuild leak checks ok), at `da22739` and
  again at `fe5410f` (last content commit; only this report and the content-plan note follow).
- Built HTML: `/goethe/b1` "Cambridge B1 Preliminary practice test", `/telc/b2`, `/goethe`,
  `/telc`, `/leben-in-deutschland/test`, `/pruefungen/fallen`, `/testdaf/uebungssatz`,
  `/start-deutsch-1` have English titles/headings and no German exam words in visible text
  (except the paid C1 list entry).
