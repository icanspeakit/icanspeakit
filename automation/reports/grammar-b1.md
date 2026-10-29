# Run report: `grammar-b1`

Run date: 2026-10-29 (unattended, `automation/run-next.ps1`), in two runs. Branch `content`. Not pushed.

## What was done

All 28 B1 slots of `docs/content-plan.md` §3 are now English B1 grammar topics. They keep the
same ids and schema. Every rule card, reference table, box, comic, the `aktiv` part (listen / hear /
speak) and every exercise was written new in English: British English, explanations at A2–B1
level, varied international names, no brands.

| Slot | English topic | `status` (unchanged) | Exercises (German → English) |
|---|---|---|---|
| `futur` | Future forms: will, going to, present continuous | geprueft | 6 → 6 |
| `zusammengesetzte-verben` | Present perfect vs past simple | geprueft | 6 → 6 |
| `zustandspassiv` | Present perfect continuous (level **B2 → B1**) | geprueft | 6 → 6 |
| `praeteritum-plusquamperfekt` | Narrative tenses: past continuous and past perfect | (none) | 5 → 5 |
| `n-deklination` | *used to* and *would* | (none) | 5 → 5 |
| `konditionalsaetze` | Zero, first and second conditional (level **B2 → B1**) | entwurf | 6 → 6 |
| `passiv-b1` | The passive: present and past simple | geprueft | 6 → 6 |
| `relativpronomen` | Defining relative clauses: who, which, that | geprueft | 7 → 7 |
| `funktionen-von-werden` | Reported speech | geprueft | 6 → 6 |
| `indirekte-fragen` | Indirect questions | (none) | 4 → 5 |
| `infinitiv-mit-zu` | Verb patterns: -ing or to + verb | (none) | 5 → 5 |
| `verben-als-nomen` | Gerunds: *Swimming is fun* | geprueft | 6 → 6 |
| `infinitiv-ohne-zu` | make, let and help | geprueft | 5 → 5 |
| `lassen` | have / get something done | geprueft | 7 → 7 |
| `finalsaetze` | Purpose: to, in order to, so that | geprueft | 6 → 6 |
| `temporale-nebensaetze` | Time clauses: when, while, before, after, as soon as, until | geprueft | 6 → 6 |
| `als-oder-wenn` | when or if | (none) | 5 → 5 |
| `temporale-praepositionen-b1` | for, since, during, ago, until, by | geprueft | 6 → 6 |
| `konnektoren-grund-gegengrund` | Contrast: although, despite, however | geprueft | 6 → 6 |
| `genitiv` | *'s* or *of* | geprueft | 6 → 6 |
| `adjektivdeklination` | Order of adjectives | (none) | 5 → 5 |
| `partizip-als-adjektiv` | -ed and -ing adjectives (level B2 → B1 in the first run) | (none) | 5 → 5 |
| `verben-praepositionen` | Verbs + prepositions | (none) | 4 → 4 |
| `da-wo-woerter` | Prepositions at the end (*What are you waiting for?*) | geprueft | 6 → 6 |
| `nutzen-benutzen` | make or do | geprueft | 6 → 6 |
| `positionsverben` | Confusing verbs: say/tell, lie/lay, rise/raise, borrow/lend | geprueft | 6 → 6 |
| `wortbildung-nomen` | Noun suffixes: -tion, -ment, -ness, -er/-or, -ity | geprueft | 8 → 8 |
| `adjektive-als-nomen` | *the* + adjective, *one / ones* | geprueft | 6 → 6 |

(Exercise counts: the number of exercises stayed the same except `indirekte-fragen` (+1), with the same types in roughly the same
order. Item counts per exercise changed; see the git diff.)

Commits (all `content(grammar-b1): …`):

| Commit | What |
|---|---|
| `cdf02b9` | (first run) `grammatik.json` quick quizzes for verbs + prepositions and relative clauses |
| `bc77adf` | (first run) level fold: the B2 entry topic is the passive, `partizip-als-adjektiv` moves to B1 |
| `5077804` | futur, n-deklination, als-oder-wenn, temporale-praepositionen-b1 |
| `6e82265` | funktionen-von-werden, indirekte-fragen, infinitiv-ohne-zu, lassen |
| `a6966fe` | adjektivdeklination, partizip-als-adjektiv, verben-praepositionen, da-wo-woerter |
| `76fa602` | for/since/ago: one unnatural build order removed |
| `6ecb762` | `src/lib/grammarWorkspace.js`: the build exercise takes the word case from the `alt` order (see decision 4) |
| `b084af2` | konditionalsaetze, relativpronomen, infinitiv-mit-zu, verben-als-nomen |
| `a645b6b` | finalsaetze, temporale-nebensaetze, konnektoren-grund-gegengrund, genitiv |
| `bf36f10` | zusammengesetzte-verben, zustandspassiv, praeteritum-plusquamperfekt, passiv-b1 |
| `8b535fd` | nutzen-benutzen, positionsverben, wortbildung-nomen, adjektive-als-nomen. Its message also names review fixes in relative clauses, 's or of and purpose, but those fixes are already in `b084af2` and `a645b6b`. |

Build: `pnpm build` succeeded (2438 pages, post-build leak checks OK).

## How it was done and checked

- **First run.** It did the `grammatik.json` quick quizzes and the level fold. It wrote 12 topic
  files, but it stopped before it committed them, and it wrote no report.
- **This run** found those 12 files uncommitted in the worktree. The timestamps were right after
  the first run's commits. This run checked them, fixed one broken build item in `futur`, and
  committed them.
- **The other 16 files** were written by four parallel sub-agents, four files each. They worked
  from the first run's shared brief, `_tmp_b1brief.md`, with an addendum on build `alt` tokens and
  commas. Three of the four agents had no shell access. I ran the audio script and the validator
  for them.
- **The validator** is `_tmp_b1check.mjs`, a throwaway copy of the A2 one. It compares each file
  with the German original at `02588e8` and checks keys, level, status, audio paths, pills, stories,
  build permutations and German leftovers. This run made one change to it: `alt` orders are now
  compared without case, because the page itself compares without case.
- **Result:** 0 real errors on all 28 files.
  - The only remaining "errors" are the audio paths of `verben-praepositionen`. Its internal `id` is
    `praepositionen`, as in the German original, so its audio folder is `praepositionen/`. The
    validator expects the filename instead.
  - The warnings are intended: build ids extended, two right pills where both are listed as right,
    tense-name hearing items in narrative tenses, and the English word "Verb" caught by the German
    regex.
- **Other checks:**
  - `scripts/check-pillen.mjs`: 0 errors, 0 to check.
  - `scripts/check-einfach-pfad.mjs`: only the 31 known "audio file does not exist" findings.
  - Every `noteHtml` link points to an existing topic id (`_tmp_b1links.mjs`).
- **I read every topic item by item** in a compact dump (`_tmp_b1dump.mjs`) and fixed:
  - futur: a build `alt` with the token `"arrive,"`, which can never match the tiles. Removed.
  - temporale-praepositionen-b1: the alt "I'll wait until six o'clock here", which is unnatural. Removed.
  - relativpronomen: the match exercise had two right answers (the book / the jacket "was only ten pounds"). The jacket now "doesn't fit me any more".
  - finalsaetze: "a party in the yard" → "in the courtyard".
  - genitiv: "The two neighbours' garden" → "Her two neighbours' garden".
  - zusammengesetzte-verben: "Don't tell me the ending! I've already seen the film twice" was self-contradictory → "Let's watch something else. I've ___ seen this film twice." "The baby has ___ fallen asleep" now also accepts *already*.
  - zustandspassiv: "You are very brown" → "You are sunburnt".
  - passiv-b1: "in the market / in the post office" → "at the market / at the post office".
  - positionsverben: "lays old newspaper" → "old newspapers".
  - wortbildung-nomen: two exercise hints promised a base word "below each sentence" that is not shown, so they were rewritten. "The ___ is due on Friday" also accepted the distractor *pay*, which is a noun too, so that item pair is now *argue / argument*.
  - adjektive-als-nomen: "The young are waiting outside" (*the* + adjective is for a group in general, not for particular people) → "The young are often online" / "The young ___ often the first to try new things."

## Decisions

1. **`status` kept per file**, as content-plan §1.4 says: 19 `geprueft`, 1 `entwurf`
   (`konditionalsaetze`), 8 without status. **Edgar: the "reviewed" ones were reviewed in German,
   not in English.**
2. **Level:** `zustandspassiv` and `konditionalsaetze` were B2 in German and are now B1. The
   first run did the same for `partizip-als-adjektiv`. `grammar-structure` fixes the syllabus
   order.
3. **Keys:**
   - Removed: `nutzen-benutzen` lost `concept.pictures` ("euler", a German drawing), its table
     exercise with `choiceArt: "euler"` and one `also` field. The Euler table was replaced by a
     "Fix the mistake" table.
   - Added: `concept.exampleHtml` (in `zusammengesetzte-verben`, `passiv-b1` and
     `adjektivdeklination`) and `concept.reference.boxes`. Both already exist in other topics.
4. **Code change in `src/lib/grammarWorkspace.js` (build exercise):**
   - The problem: an `alt` order moves the first word into the middle of the sentence, but the
     tile keeps its capital. "Every morning **He** waits for the bus" looked wrong. The code
     only lower-cases German pronouns and conjunctions.
   - The fix: the strip now takes the case of each word from the right order the learner is
     following, so it shows "Every morning he waits". When no order matches, it falls back to the
     old behaviour, so German data is not affected.
   - Tested with a throwaway script (`_tmp_gwtest.mjs`).
5. **Scope limits, as in the plan:**
   - The conditionals stop at the second conditional (the third is B2). *If I were you* is there,
     with *was* noted as informal.
   - for/since is explained in full only in `temporale-praepositionen-b1`.
   - stop/remember/try is only a note.
   - Non-defining relative clauses are only a note.
   - lie/lay/lain appears in gaps only in clearly marked forms.
6. **US notes** appear only where usage really differs:
   - the past simple with *just / already* (`zusammengesetzte-verben`);
   - *pay rise / pay raise* (`positionsverben`).

## Left / for Edgar to review

- **Review all 28 topics in English**, especially the 27 that count as reviewed (19 `geprueft` + 8 without status). To take one out
  until then, set `"status": "entwurf"`.
- **Still wrong, outside this item (already reported by `grammar-a2`):**
  `src/data/uebersetzungen/grammatik.json` still explains the German grammar, and it shows under
  the English cards. For example, the built `/zustandspassiv` page shows "werden + past participle =
  process passive (Vorgangspassiv) … Die Wohnung wird gerade gestrichen". `grammar-structure` owns
  this file. The quickest fix is to delete the entries of all converted topics.
- **Items that depend on context; a second look is worthwhile:**
  - conditionals story, gap 2: "I ___ dinner". The distractor *would buy* is wrong only because of the plan/dream framing.
  - gerunds story, last gap: "I look forward to ___ you". The distractor *inviting* fits the grammar; only the meaning rules it out.
  - narrative tenses ex 2: past continuous / past perfect items where a colloquial past simple is arguably possible. The `why` text explains the preferred form.
  - make/let/help: *help (to)* is accepted with and without *to*.
  - contrast: "I like the flat, ___ it's very small" accepts *but* and *although*.
- **Contrast build `k5`** ("It rained all day . However, we had fun .") has a full-stop tile in
  the middle. It works, but it looks unusual in the strip.
- **No longer matching their German slot names:** `n-deklination` (used to), `zustandspassiv`
  (present perfect continuous) and `funktionen-von-werden` (reported speech). This is expected;
  `routes` gives them English slugs.
- **Still German, outside this item:** `src/lib/searchIndex.js` `KEYWORDS`, and `grammarWorkspace.js`'s own German
  `SUBORD`/`PRON` sets and swapClauses for clause swapping. That code never fires for English, so
  English data relies on `alt`.
- **Throwaway tools** (gitignored, not committed), left for the B2/C1 runs:
  - `_tmp_b1check.mjs`, `_tmp_b1audio.mjs`, `_tmp_b1dump.mjs`, `_tmp_b1list.mjs`, `_tmp_b1brief.md`
  - `_tmp_b1links.mjs`, `_tmp_schema.mjs`, `_tmp_gwtest.mjs`

Status: item complete (see the review points above).
