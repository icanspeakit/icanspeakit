# beginner-path: run report (2026-10-29)

Item: the “Einfach lernen” beginner path (`src/data/einfach-pfad.json`, page `/einfach`,
English target route `/step-by-step`) for English, A1–B1 (content-plan §5.1).

## What I did

- **A1: 12 units rewritten in English.** All ids kept. The units now follow the English
  grammar topics in the lehrplan order: be/pronouns → articles → plurals → possessives →
  present simple → yes/no questions → wh- questions → object pronouns → imperatives →
  prepositions of time → imperatives again → was/were.
- **A2: 8 units, now playable** (they were titled outlines with `"draft": true`). Topics:
  present continuous, past simple, negatives, modals, polite requests, prepositions of place,
  two objects (to/for), phrasal verbs.
- **B1: 8 units, now playable.** Topics: narrative tenses, used to, future forms, verb + -ing / to,
  relative clauses, indirect questions, verbs + prepositions, adjective order.
- Total: 28 units, 194 tasks. `pnpm check:einfach` is clean. `pnpm build` succeeds.
- Each unit has an English title, 1–2 claims (≤ 10 words, in simple English), 6–7 tasks, an
  English hint on every task (plus a `why` where the source's general hint did not explain the
  item), and a UK postcard.
- `src/lib/einfach-app.js`: the placement quick check jumped to hard-coded unit ids
  (`a1-einkaufen` for 5–6 right, `a1-kennenlernen` for 3–4). In the new order those land at the
  wrong spots (the stronger learner would have started earlier). It now starts at `a1-cafe`
  (unit 6) or `a1-familie` (unit 4). That is the only code change.

Commits: `9d03f13` (A1 + outlines), `133e7d6` (A2), `d13eb0f` (placement), `bd6aa68` (B1),
plus this report and the queue tick.

## Decisions

1. **Only English sources.** A task never copies text. It points at a source item by ref. Of
   the sources, only the grammar topics and `akkusativ.json` (object pronouns) are English so
   far. The lexicon (`lex:`), Redemittel, listening (`hoeren:`), pronunciation (`aussprache:`)
   and culture (`kultur:`) are still German until their queue items run. So every unit now has
   only `luecke` (gap) and `satz` (sentence builder) tasks. The `wort`, `artikel`, `redemittel`,
   `hoeren` and `sprechen` tasks were removed rather than left as German items in an English
   course (plan §8.7).
2. **`artikel` tasks are gone for good.** They test der/die/das, which has no English
   equivalent. The task type stays in the code. Articles (a/an/the) are taught through the
   `artikel` grammar topic instead.
3. **Units re-themed to their grammar.** The German units had a situation (“Im Café”) plus a
   German grammar slot. I kept the unit ids but gave every unit the English grammar topic of
   its level, and titles and claims that say what the tasks actually train. Examples:
   `a1-kleidung` is now “Say what you like” (object pronouns). `a1-amt` is now “Say where you
   were” (was/were). `a1-koerper` is now “At the doctor's” (imperatives). Ids no longer match
   their titles in some places; the `routes` item can rename them (localStorage progress keys
   are by id).
4. **Unit order changed** so that grammar builds up (lehrplan order). The `grammar` field of
   each unit (it links to “more in the course”) now names the English topic slot.
5. **Item choice.** I avoided source items with two right answers that the options could not
   rule out. Examples: *who/that*, *look at/for a flat*, *watched/was watching*, *must/have to*.
   I also avoided table items whose answer contains a comma, because the resolver splits
   answers on commas. I avoided sentence-initial gaps with a lowercase answer. Distractors are
   real learner errors (*childs, stoped, Did you used to, I'll to carry, a wooden old table*).
6. **Postcards** are UK places (one per unit, no repeats), written as short facts in simple
   English, all with `"source": "neu"`, so the checker lists them for review.

## For Edgar to review

- **The 28 postcard facts** (`pnpm check:einfach` lists them). I only used facts I am sure of,
  but please check these ones in particular:
  - Windsor: “the oldest and largest castle in the world that people still live in”
  - Loch Ness: “holds more water than all the lakes in England and Wales together”
  - Manchester: “In 1948, one of the first computers ran its first program”
  - Giant's Causeway: “about 40,000 stone columns”

  Once checked, switch `"neu"` to `"geprüft"`.
- **Postcard UI language.** The postcard header is built in the view (“Post von Bruno aus …”),
  so it reads as German around an English fact. See the next point.

## Left open / uncertain

- **The /einfach UI is still German.** `src/lib/einfach-view.js` (Bruno's lines, buttons,
  headings, the placement screen), `src/lib/einfach-app.js` (placement sentences, “Fehler
  wiederholen”), `src/lib/einfach-content.js` (“Tipp:”, “Es heißt:”, the default speaking hint,
  the der/die/das rule hints) and the noscript text in `src/pages/einfach.astro` were not part
  of the `ui-*` items and are not data. I did not touch them in this content item. I added a
  queue item `beginner-path-ui` right after this one. Bruno's lines have `de`/`en` pairs; on
  the English site the `de` line is the one shown, so that run has to decide what the pair
  means here.
- **Task variety is narrower than the German path.** For now there are only gap and
  sentence-builder tasks. When `vocab-a1`…`vocab-b1`, `speaking`, `listening`, `pronunciation`
  and `culture` have made their sources English, add back:
  - one `wort` task per unit (English lemma from the unit's vocab topic)
  - `redemittel` situation tasks
  - `hoeren` and `sprechen` tasks
  - `kultur:` postcard refs

  `checkUnits` allows 5–7 tasks, so a unit can take one or two more.
- `einfach.astro` still loads the A1 lexicon, `artikel-packs.json` (der/die/das rules) and
  the German sources into `resolvePath`. They are unused now and harmless. The `cleanup` item
  can drop them.
- `docs/easy-mode-tier1-v1.md` (authoring guide) describes the German unit recipe (word +
  article + phrase). It was not updated.
