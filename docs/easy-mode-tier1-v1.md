# Step by step (/einfach): how to write an English unit

Recipe for adding or changing a unit of the beginner path in `src/data/einfach-pfad.json`.
Written 2026-10-29 by the `beginner-path-ui` run for the English site. The German
original of this guide (word + der/die/das + phrase per unit) is not in this repo; this is
the English version, and it replaces it.

Related files:

- `src/data/einfach-pfad.json`: the path (levels → units → tasks)
- `src/lib/einfach-content.js`: how a ref is looked up and turned into a task
- `src/lib/einfach-view.js`: the screens and Bruno's lines
- `scripts/check-einfach-pfad.mjs`: the checker (`pnpm check:einfach`). The page build runs the same checks.

## 1. What a unit is

One sitting of about two minutes: **5–7 tasks**, one screen each, and at the end
**1–2 claims** ("Now you can: …") and **a postcard**. The learner never sees a total. The
claims are their progress.

```json
{
  "id": "a1-vorstellen",
  "icon": "👋",
  "title": "Introduce yourself",
  "minutes": 2,
  "grammar": "personalpronomen",
  "claims": ["You say who you are and where you are from."],
  "postcard": { "city": "London", "fact": "…", "source": "neu" },
  "tasks": [ … ]
}
```

| Field | Rule |
|---|---|
| `id` | Keep existing ids. Learners' progress is stored by id (`da_einfach_v1`). Only the `routes` item renames them. New units get English kebab-case ids with the level prefix (`a2-at-the-station`). |
| `title` | What the learner does, in A1 English, 2–5 words: *Introduce yourself*, *Say where you were*. Not the grammar name. |
| `grammar` | The grammar topic slot (file name in `src/data/grammatik/`). It becomes the "More about this in the course" link. |
| `claims` | 1–2 sentences, **≤ 10 words** (checked), simple English, starting with *You …*: *You ask where things are.* Say what the tasks really train. Don't claim more than that. The first claim is also shown as "Coming next" on the What you can do screen. |
| `minutes` | 2 (3 for a 7-task B1 unit). |
| `postcard` | One UK place per unit, no repeats on the path. `fact`: 1–2 short sentences at A2 or below, a fact you are sure of. `source`: `"neu"` (written here, not yet checked) → Edgar switches it to `"geprüft"` after checking. A `kultur:topic#n@sum` ref instead takes the fact from `kultur.json` once that file is English. |

## 2. Tasks

A task never copies text. It points at a reviewed source item by **ref**, and
`einfach-content.js` builds the screen from that item. Every task needs a **`hint`** in
English (Bruno says it when tapped; checked). Add a **`why`** when the source's own
explanation does not explain *this* item. It is shown after a wrong answer.

| Type | Screen | Source (ref) | Usable now? |
|---|---|---|---|
| `luecke` | Sentence with a gap, 2–3 options | `gram:<topic>/<exercise>/<item>@<sum>` (fill or table item), `akk:<id>` (object pronouns) | **yes** |
| `satz` | Build the sentence from word chips | `gram:<topic>/<exercise>/<item>@<sum>` (build item) | **yes** |
| `artikel` | `___ apple` with *a / an / some* | `lex:<unit>/<lemma>` (noun with `gender` = `a`/`an`/`some`), or a grammar table with placeholder `a / an` or `a / an / some` | lexicon: after `vocab-a1`. Grammar tables: **yes**, a `luecke` on such a row turns into this screen automatically. |
| `wort` | Word card: front `an apple` (+ `two apples`), back = the lexicon's simple definition | `lex:<unit>/<lemma>` | after `vocab-a1`…`vocab-b1` |
| `redemittel` | "What do you say?" situation, 3 phrases | `redemittel:<set>#<n>@<sum>` + exactly 2 `distractors` from other sets + `situation` | after `speaking` |
| `hoeren` | Listen, then answer | `hoeren:<text>/<q>@<sum>` | after `listening` (needs the mp3) |
| `sprechen` | Read a sentence aloud | `aussprache:<id>` | after `pronunciation` |

Until those items have made their sources English, a unit uses only `luecke` and `satz`
(and `artikel` rows from the `artikel` grammar topic). Don't point a task at a German source.

### Choosing items

- **One right answer only.** Avoid items where a second option is also correct English
  (*who/that*, *must/have to*, *watched/was watching*, *look at/for*). The options must rule it out.
- **Options:** 2–3, the right one plus real learner errors (*childs, stoped, Did you used to,
  a wooden old table*). Straight apostrophe `'` in options (*don't*). The right answer must
  be one of the source's accepted answers. Otherwise the build fails.
- **Table answers with a comma** are split into several accepted answers. Avoid them unless that is what you want.
- **No gap at the start of a sentence** whose answer is lowercase.
- **No ref twice** in a unit, and not in the unit directly before (checked).
- **British English** (content-plan §1.1): *flat, mum, colour*.

### Hints and whys

- A hint helps the learner find the answer. It does not give the answer away:
  *"Priya and Liam are two people."*, *"Say “hour”. Do you hear the h?"*
- ≤ 12 words, A1 English, no grammar terms the learner hasn't met at this level.
- Default hints when a task has none: an article task asks *"Does it start with a vowel
  sound?"* (plus *"Can you count it?"* when *some* is an option). A fill item uses the
  source's hint as *"Tip: …"*. Still write your own: the checker wants a hint on every task,
  and a hint written for the item is better.
- `why` (after a wrong answer): the rule in one or two short sentences, with the example:
  *"The h in hour is silent. The first sound is a vowel, so: an hour."*

## 3. Order and level

Units follow the grammar order of `grammatik-lehrplan.json` (A1: be → articles → plurals →
possessives → present simple → yes/no questions → wh- questions → object pronouns →
imperatives → prepositions of time → was/were). A unit uses only grammar from its own unit and
earlier ones. The placement quick check (`einfach-app.js`, `placementStart`) jumps to fixed
unit ids (`a1-cafe` for 5–6 right, `a1-familie` for 3–4). If you reorder A1, check those
two still sit after the topics the six A1 placement items test.

## 4. Workflow

1. Write the unit in `einfach-pfad.json` with refs **without** `@checksum` (`gram:praesens/2/3`).
2. `node scripts/check-einfach-pfad.mjs --sign` adds the checksums (gram, kultur, hoeren,
   redemittel refs). If a source item changes later, its checksum stops matching and the
   build fails. Look at the item again before re-signing.
3. `pnpm check:einfach`: fix every error. It also lists the postcards still marked `"neu"`.
4. Play it: `/einfach#/uebung/<unit-id>` on the dev server (or `/einfach?fixtures` for the
   prototype's hand-written test sittings, still German).
5. Commit the path change on its own.

## 5. Bruno's voice (UI lines)

Bruno's lines live in `BRUNO_LINES` in `einfach-view.js`: ≤ 8 words, A1 English, warm,
never blaming, never about missed days. A line is `{ text }`. An optional `help` is a
translation a tap on the bubble shows. On the German site that was the English line. Here
no line has one yet. Task hints use the same bubble (`hintEn` on a task becomes its `help`).
