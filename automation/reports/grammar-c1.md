# Run report: `grammar-c1`

Run date: 2026-10-29 (unattended, `automation/run-next.ps1`), one run. Branch `content`. Not pushed.

## What was done

All 11 C1 slots of `docs/content-plan.md` §3 are now English C1 grammar topics. This covers
both halves of each paid topic:
- the free shell in `src/data/grammatik/<id>.json` (name, rules, reference, `aktiv`, exercise titles and hints, `slots`);
- the exercise items in `src/paid/grammatik/<id>.json`.

Ids, `level` (`C1`), `status` and the schema are unchanged. Everything was written new in
English: British English, B2-level explanations, C1 structures, and register notes (formal or written vs spoken).

| Slot | English topic | `status` (unchanged) | Exercises (German → English) |
|---|---|---|---|
| `konjunktiv-1` | Distancing: *is said to, is believed to have, it is thought that* | geprueft | 6 → 6 |
| `subjektive-modalverben` | Modal perfects: *should have, needn't have, could have* | geprueft | 6 → 6 |
| `futur-2` | Future continuous and future perfect | geprueft | 7 → 7 |
| `es-korrelat` | Cleft sentences and preparatory *it* | geprueft | 6 → 6 |
| `passiversatz` | Inversion: *Never have I…, Not only did she…* | geprueft | 6 → 6 |
| `irreale-vergleiche` | Unreal past: *as if, it's time, would rather* | geprueft | 6 → 6 |
| `partizipialattribute` | Participle clauses: *Having finished…, The man sitting there…* | geprueft | 6 → 6 |
| `nominale-praepositionen` | Formal prepositions: *due to, owing to, in view of, regardless of* | geprueft | 6 → 6 |
| `nominalisierung` | Nominalisation in formal writing | geprueft | 6 → 6 |
| `textkohaerenz` | Cohesion: reference, substitution, ellipsis | entwurf | 6 → 6 |
| `verbpraefixe` | Verb prefixes: *over-, under-, out-, re-, mis-* | geprueft | 6 → 6 |

The exercise types and their order are kept. Item counts moved slightly, mostly by −1/−2 and
some by +1. Story gaps are 6–8 per topic, and every build exercise has 4–5 sentences.
`src/data/grammatik.json` has no C1 quick quizzes, so there was nothing to change there.

Commits (all `content(grammar-c1): …`):

| Commit | What |
|---|---|
| `d151e13` | konjunktiv-1, subjektive-modalverben, futur-2 |
| `8e9a160` | es-korrelat, passiversatz, irreale-vergleiche, partizipialattribute |
| `3661360` | nominale-praepositionen, nominalisierung, textkohaerenz, verbpraefixe |

Build: `pnpm build` succeeded. It built 2438 pages, and `check-paid-leak` passed (48 probes,
no hits). `check-lehrwerk-leak` passed too.

## How it was done and checked

- **Paid split.**
  - `_tmp_c1merge.mjs` merged each German shell with its paid items into one full topic in `_tmp_c1orig/<id>.json`, the shape template.
  - The agents wrote complete English topics to `src/data/grammatik/`.
  - `node scripts/build-paid-manifest.mjs --split-grammar` (the documented way, see `src/paid/README.md`) moved the items back to `src/paid/grammatik/`.
- **Writing.** Four parallel sub-agents wrote the topics (3/3/3/2). They used the shared brief `_tmp_c1brief.md`: the B1/B2 brief plus a C1 addendum with a scope table for each slot and C1 quality traps. None of the agents had shell access, so I ran the audio script, the validator and the pill check myself.
- **Checks** (run on the merged full topics, before and after the split):
  - `_tmp_c1check.mjs`: 0 errors on all 11. The 20 warnings are intended:
    - the English word *Verb* in headers;
    - build ids extended;
    - one double right pill in `futur-2`: *will have worked / will have been working* with *for ten years*, where both are right.
  - `scripts/check-pillen.mjs`: 0 errors, 0 to check.
  - Every `noteHtml` link points to an existing topic or page.
- **I read every topic item by item** and fixed these:
  - konjunktiv-1, story: two cleaners "left the building just before the fire" and were then "taken to hospital" while "nobody was inside". They are now two firefighters who "are reported to have suffered minor injuries". Also, "The museum is known to hold ten thousand books" → "The library…".
  - subjektive-modalverben, story: "I needn't have bought sandwiches, because a kind woman gave us tea and cake" → "…invited us in for lunch", so the logic holds.
  - futur-2: removed the answer variant "the party'll have ended".
  - es-korrelat:
    - The story answer "What" in the middle of a sentence (after *and*) → "what".
    - "I'd appreciate it if people explained things before they act" → "acted".
    - Removed a note sentence that linked *I'd appreciate it if you could* to conditionals; that was a weak connection.
  - partizipialattribute: rewrote a garbled last note sentence about *(Being) tired* and *knowing*.
  - verbpraefixe, speaking: "I oversleep on Monday" (unnatural present) → "Tom oversleeps again" → "Tom overslept again".
  - nominalisierung:
    - Typical mistake "made an investigation" (which is actually used) → "a demand of housing → a demand for housing".
    - In the story, "the reduction of waiting times" → "in waiting times", to match the rule the topic teaches.

## Decisions

1. **`status` kept per file**, as content-plan §1.4 says: 10 `geprueft`, `textkohaerenz` `entwurf`. **Edgar: "geprueft" means reviewed in German, not in English.**
2. **Scope per the plan.** Each topic links its neighbour instead of reteaching it:
   - deduction (*must have / can't have*) stays in B2 `/modalsaetze`;
   - *wish / if only* stays in `/konjunktiv2`;
   - basic future forms stay in `/futur`;
   - *it is said that* as an intro stays in `/passiv`;
   - *although / however* stays in `/konnektoren-grund-gegengrund`;
   - noun suffixes stay in `/wortbildung-nomen`.

   German-only parts were dropped: Konjunktiv I forms, *sein + zu / -bar / sich lassen*, separable or inseparable prefixes, the extended attributes before a noun, and *es* as a placeholder in German word order.
3. **No keys removed or added at topic level.** The originals had no German-only drawings. Some fills gained `instant: true`, a key that already exists in other topics. Every fill item now has its own `choices`.
4. **Distractors in `verbpraefixe`** include some non-words (*outslept, oversleeped, reheard*). They are never the right answer, and the `why` says so.

## Left / for Edgar to review

- **Review all 11 topics in English**, especially the 10 marked `geprueft`. To hide one until then, set `"status": "entwurf"` in `src/data/grammatik/<id>.json`.
- **Worth a second look:**
  - irreale-vergleiche fill 1: "he behaves as if he ___ the boss" accepts only *were/was*. That is right for an unreal comparison, but some teachers also allow the present.
  - subjektive-modalverben: "You didn't tell me about the party! You ___ told me" accepts *should / could / might have*, but only *should have* is a pill.
  - konjunktiv-1: some gaps rely on a time clue (*last night*, *at the moment*). I checked them, but they are the core of the topic.
  - nominale-praepositionen: the note says the strict *due to* (only after *be*) vs *owing to* rule is not followed in real BrE. That is true, but it is a style judgement.
  - verbpraefixe: the stress note ("stress usually on the root") is a simplification.
- **Still German, outside this item:** `src/data/uebersetzungen/grammatik.json` (owned by `grammar-structure`) and the worksheets in `src/data/arbeitsblatt/<id>.json` (owned by `teachers`).
- **Throwaway tools** (gitignored, not committed): `_tmp_c1brief.md`, `_tmp_c1check.mjs` (merges paid items before checking), `_tmp_c1merge.mjs`, `_tmp_c1list.mjs`, and `_tmp_c1orig/` (the German merged originals).

Status: item complete (see the review points above).
