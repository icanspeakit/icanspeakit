# Run report: `grammar-b2`

Run date: 2026-10-29 (unattended, `automation/run-next.ps1`), one run. Branch `content`. Not pushed.

## What was done

All 13 B2 slots of `docs/content-plan.md` §3 are now English B2 grammar topics. They keep the
same ids, `level` (`B2`), `status` and schema. Every rule card, reference table, box, the `aktiv`
part (listen / hear / speak) and every exercise was written new in English: British English,
explanations at B1–B2 level, varied international names, no brands.

| Slot | English topic | `status` (unchanged) | Exercises (German → English) |
|---|---|---|---|
| `konjunktiv2` | Third and mixed conditionals; *wish / if only* | geprueft | 6 → 6 |
| `passiv` | The passive: all tenses, modals, *it is said that* | (none) | 5 → 5 |
| `relativsaetze-was-wo` | Non-defining relative clauses; *whose, where, when*; *which* for a whole clause; *what* | geprueft | 6 → 6 |
| `modalsaetze` | Modals of deduction: *must, might, can't* (+ *have* + past participle) | entwurf | 7 → 7 |
| `konsekutivsaetze` | *so … that, such … that, too, enough* | entwurf | 6 → 6 |
| `zweiteilige-konnektoren` | Paired conjunctions: *both … and, either … or, neither … nor, not only … but also* | (none) | 4 → 4 |
| `zumal-wohingegen` | Formal linkers: *whereas, while, since, as, given that* | entwurf | 6 → 5 |
| `negationswoerter` | Negative words: *no, none, nobody, never*; no double negatives | (none) | 5 → 5 |
| `irgend` | *-ever* words: *whatever, whoever, wherever* … | (none) | 4 → 4 |
| `fokuspartikeln` | Focus adverbs: *only, even, also, too* | (none) | 4 → 4 |
| `modalpartikeln` | Discourse markers in speech: *actually, anyway, well, by the way* … | geprueft | 6 → 6 |
| `adjektive-mit-praepositionen` | Adjectives + prepositions | geprueft | 6 → 6 |
| `nomen-verb-verbindungen` | Verb + noun collocations (*make a decision, take a risk, pay attention*) | (none) | 4 → 4 |

`src/data/grammatik.json`: the two B2 quick quizzes that exist there (`passiv`, `konjunktiv2`)
are now English. The other B2 slots have no quick quiz, in German or English.

Commits (all `content(grammar-b2): …`):

| Commit | What |
|---|---|
| `224910b` | `grammatik.json` quick quizzes: the passive (all tenses, modals), third conditional / wish |
| `e0918dc` | konsekutivsaetze, zweiteilige-konnektoren, zumal-wohingegen |
| `a9121f2` | negationswoerter, irgend, fokuspartikeln |
| `c33eb53` | modalpartikeln, adjektive-mit-praepositionen, nomen-verb-verbindungen |
| `a697907` | konjunktiv2, passiv, relativsaetze-was-wo, modalsaetze |

Build: `pnpm build` succeeded (2438 pages, post-build leak checks OK).

## How it was done and checked

- **Workflow.** I used the B1 run's workflow. The shared brief `_tmp_b2brief.md` is the B1 brief
  plus a B2 addendum: a slot → topic table with scope limits for each slot, the links that are
  allowed, and B2 quality traps. Four parallel sub-agents wrote the files, three or four each.
- **Checks were run by me.** None of the four agents had shell access, so I ran the audio script,
  the validator and the pill check for them.
- **Validator** (`_tmp_b2check.mjs`, compares with the German original at `02588e8`):
  0 real errors on all 13 files.
  - The only "errors" are 8 items in `modalpartikeln`, exercise 4 ("Marker or not?"). It is a
    classification fill: the prompt has no `___`, and the learner picks *Marker* / *Not a marker*.
    The German original has exactly the same shape ("Modalpartikel oder andere Funktion?").
    The page shows such a prompt as plain text, as it did for German. So the validator rule does
    not fit this exercise type.
  - The warnings are intended: "German?" hits on the English word *Verb* and on *die*; build ids
    extended; hoeren meaning choices; right pills where both answers really are right
    (*different from / to*, *take / have a break*, *have / take a look*, *only / just*,
    *too / as well*).
- **Other checks:**
  - `scripts/check-pillen.mjs`: 0 errors, 0 to check.
  - Every `noteHtml` link points to an existing topic or page (`_tmp_b2links.mjs`).
- **I read every topic item by item** in the compact dump and fixed:
  - konsekutivsaetze: "the café was too busy to find a table" (the café cannot find a table) →
    "too busy for them to find a table".
  - zweiteilige-konnektoren: the story says they will take a tent or a caravan, then mentions
    "the cabin". It is now "the campsite". The build alt "Either today or tomorrow we can go" was
    unnatural, so I removed it.
  - zumal-wohingegen: "Given that the flat is so small, the rent is high" did not make sense →
    "the rent seems high". The tense in the typical mistake "Given the weather is bad, we left" →
    "was bad".
  - fokuspartikeln: "He did not do the smallest polite thing" (unnatural) → "He was very rude: not one word."
  - irgend: "Whoever calls, tell him I'm out" → "tell them".
  - modalpartikeln: the story's reply did not follow from the question; it now says "I forgot to ask her yesterday".
  - adjektive-mit-praepositionen: a confusing note ("Do not mix up the adjective and the verb …")
    was rewritten: "The verb often takes the same preposition: I'm worried about = I worry about".
  - nomen-verb-verbindungen: "Six verbs" listed seven. "Don't park there. You're breaking the law"
    (they have not parked yet) → "You'd be breaking the law".
  - konjunktiv2: in the story the shoes got wet, so "warmer shoes" → "proper boots".
  - relativsaetze-was-wo: "can not" → "cannot". "the abbey, which was built in the 15th century"
    (an unsure fact) → "which is more than 500 years old".
  - modalsaetze: "Perhaps it might have been Olga" (double hedge) → "It might have been Olga, who
    loves chocolate, but I'm not sure". "Perhaps Liam missed the bus. He ___ missed the bus"
    (the gap repeated the clue) → "Liam is late. I'm not sure why. He ___ missed the bus". "The lights are
    still on, so they can't have gone to bed" (weak evidence) → "I can hear them laughing and
    talking". The match pair "They might be out" overlapped with "She can't be at home" →
    "They might be in the garden".

## Decisions

1. **`status` kept per file**, as content-plan §1.4 says: 4 `geprueft`, 3 `entwurf`, 6 without
   status. **Edgar: the "reviewed" ones were reviewed in German, not in English.** The `entwurf` ones
   (`modalsaetze`, `konsekutivsaetze`, `zumal-wohingegen`) stay hidden from the catalogue as before.
2. **Scope per the plan.** Each topic stays inside its scope and links its neighbour instead:
   - 0/1/2 conditionals stay in B1 `/konditionalsaetze`. *should have* for regret is only a note.
   - The passive basics stay in `/passiv-b1`.
   - Defining relative clauses stay in `/relativpronomen`.
   - *although / however / despite* stay in `/konnektoren-grund-gegengrund`.
   - *make / do* stays in `/nutzen-benutzen`.
   - *Not only* + inversion and *whom* appear only as notes.
   - German-only parts of the originals were dropped: *zwar … aber*, *je … desto*,
     *insofern … als*, *un-/-los* word formation, and case-ending tables.
3. **Keys:**
   - Added: `briefMarks` in `konsekutivsaetze` and `modalsaetze`, and `concept.flow` in
     `konjunktiv2`. These keys already exist in other topics.
   - Removed: in `nomen-verb-verbindungen`, one `also` field on a fill item.
   - Exercises: `zumal-wohingegen` has one fill fewer. The German *while*: time or contrast
     exercise only tested an ambiguity that a pill exercise cannot resolve cleanly.
4. **Alternatives in answers:**
   - Reason linkers accept all fitting forms (*since / as / given that / seeing that*), and the
     contrast items accept *whereas / while*.
   - Deduction "possible" gaps accept *might / may / could*.
   - *were / was* after *wish / if* is accepted.
5. **US notes** appear only where usage differs: *different than*, *take a look / take a break*,
   *take a decision* (BrE).

## Left / for Edgar to review

- **Review all 13 topics in English**, especially the 10 that count as reviewed (4 `geprueft` + 6
  without status). To take one out until then, set `"status": "entwurf"`.
- **Still wrong, outside this item (reported by `grammar-a2` and `grammar-b1`):**
  `src/data/uebersetzungen/grammatik.json` still explains the German grammar under the English
  cards, and this also applies to the B2 pages. `grammar-structure` owns that file.
- **Items that depend on context; a second look is worthwhile:**
  - konjunktiv2 match: "If I had known about the strike," / "If I had eaten breakfast," fit their
    endings only by meaning ("I would have taken a taxi" / "I wouldn't be so hungry now").
  - modalpartikeln: the story has only 3 gaps (*actually, by the way, anyway*); other markers would
    overlap in a shared pool. The "Typical mistakes" card has only one mistake (*actually* ≠ *currently*).
  - nomen-verb-verbindungen note: "In British English you can say *take a decision*". This is true
    (BrE, mostly formal) but worth a glance.
  - fokuspartikeln speaking: "He drank only water" is the model answer; "He only drank water"
    (more common in speech) is explained in a card but not accepted as a second answer.
  - zweiteilige-konnektoren speaking: "She hasn't got a car…" → "She has neither a car nor a bike"
    (*have got* → *have*).
- **Validator rule:** the "prompt needs ___" check flags classification fills (see above). A
  future validator should allow a fill without a gap when the German original had none.
- **Throwaway tools** (gitignored, not committed), left for the C1 run: `_tmp_b2brief.md`,
  `_tmp_b2check.mjs`, `_tmp_b2list.mjs`, `_tmp_b2links.mjs`, `_tmp_b2fix1.mjs`,
  `_tmp_b2fix3.mjs` (literal replacements from a JSON file), `_tmp_fix_*.json`, `_tmp_mp_de.json`,
  plus the B1 ones (`_tmp_b1audio.mjs`, `_tmp_b1dump.mjs`).

Status: item complete (see the review points above).
