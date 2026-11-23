# Step by step (/step-by-step): how to write a Portuguese unit

Recipe for adding or changing a unit of the beginner path in `src/data/einfach-pfad.json`.
Rewritten 2026-11-17 by the `beginner-path-ui` run for the Portuguese course. The path is
European Portuguese (Portugal), A1 to B1, for adults, many of whom live in Portugal.

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
  "claims": ["You say hello and say your name."],
  "postcard": { "city": "Lisboa", "fact": "…", "source": "neu" },
  "tasks": [ … ]
}
```

| Field | Rule |
|---|---|
| `id` | Keep existing ids, even the German ones. Learners' progress is stored by id (`da_einfach_v1`). New units get English kebab-case ids with the level prefix (`a1-who-where`). |
| `title` | What the learner does, in simple English, 2–5 words: *Introduce yourself*, *Register at the Junta*. Not the grammar name. |
| `grammar` | The grammar topic slot (file name in `src/data/grammatik/`). The page turns it into the "More about this in the course" link with `topicPath()`, so the link follows the topic's slug. |
| `claims` | 1–2 sentences, **≤ 10 words** (checked), simple English, starting with *You …*: *You ask where things are.* Say what the tasks really train. Don't claim more than that. The first claim is also shown as "Coming next" on the What you can do screen. |
| `minutes` | 2 (3 for a 7-task B1 unit). |
| `postcard` | One place in Portugal per unit, no repeats on the path. `fact`: 1–2 short sentences in simple English, a fact you are sure of. `source`: `"neu"` (written here, not yet checked) → Edgar switches it to `"geprüft"` after checking. A `kultur:topic#n@sum` ref instead takes the fact from `kultur.json` once that file is Portuguese. |

## 2. Tasks

A task never copies text. It points at a reviewed source item by **ref**, and
`einfach-content.js` builds the screen from that item. Every task needs a **`hint`** in
English (Bruno says it when tapped; checked). Add a **`why`** when the source's own
explanation does not explain *this* item. It is shown after a wrong answer.

| Type | Screen | Source (ref) | Usable now? |
|---|---|---|---|
| `luecke` | Sentence with a gap, 2–3 options | `gram:<topic>/<exercise>/<item>@<sum>` (fill or table item), `akk:<id>` (object pronouns) | **yes** |
| `satz` | Build the sentence from word chips | `gram:<topic>/<exercise>/<item>@<sum>` (build item) | **yes** |
| `artikel` | `___ mesa` with *o / a* | `lex:<unit>/<lemma>` (noun with `gender` = `o` or `a`, not `o/a`), or a grammar table with placeholder `o / a`, `o / a / os / as`, `um / uma` or `um / uma / uns / umas` | lexicon: after `vocab-a1`. Grammar tables: **yes**, a `luecke` on such a row turns into this screen automatically. |
| `wort` | Word card: front `a casa` (+ `as casas`), back = the lexicon's English gloss | `lex:<unit>/<lemma>` (a1, a2 and b1 lexicons) | after `vocab-a1`…`vocab-b1` |
| `redemittel` | "What do you say?" situation, 3 phrases | `redemittel:<set>#<n>@<sum>` + exactly 2 `distractors` from other sets + `situation` | after `speaking` |
| `hoeren` | Listen, then answer | `hoeren:<text>/<q>@<sum>` | after `listening` (needs the mp3) |
| `sprechen` | Read a sentence aloud | `aussprache:<id>` | after `pronunciation` |

Until those items have made their sources Portuguese, a unit uses only `luecke`, `satz` and
`artikel` rows from grammar tables. Don't point a task at a source that is still Spanish or English.
(The article code still reads the old Spanish `el`/`la` genders so unconverted lexicons don't
break the build; once `vocab-a1` has run they all hold `o`/`a`.)

### What the resolver reads

- **Options:** the task's `options`, else the item's `choices` if there are 2–3, else the
  table's placeholder if it lists 2–3. A screen shows three at most, so a longer `choices`
  list (`o / a / os / as`) needs `options` on the task.
- **Why:** the task's `why`, else the item's `why`, else the exercise's hint (for a build
  item, its title).
- **Build items:** the marks at the very end become the closing mark. A comma inside the
  sentence stays on the word before it (`Olá,`). Every `alt` order counts as right too, without
  regard to capitals or commas, so word order the source accepts is accepted here.
- **Table rows:** a term with `___` is the sentence with its gap. A term `ela · viver` shows
  as `ela ___ (viver)`, so write **person · verb**, never verb · person. Any other term shows
  as `term → ___`.

### Choosing items

- **One right answer only.** Avoid items where a second option is also correct Portuguese
  (*tu / você* in a free sentence, *fui / tenho ido*, *por / para* where both fit, enclisis vs.
  proclisis after a word that triggers it, *a / em* with some places). The options must rule it out.
- **Options:** 2–3, the right one plus real learner errors (*a o*, *sou cansado*, *os mãos*,
  *a problema*, *estou a ser / estou ser*). The right answer must be one of the source's accepted
  answers. Otherwise the build fails.
- **Table answers with a comma** are split into several accepted answers. Avoid them unless that is what you want.
- **Accents and capitals:** an option differs from its neighbour by more than an accent unless
  the accent is the point (*à / a*, *há / a*, *pôr / por*). `accepts` ignores case, so never offer
  *segunda / Segunda*.
- **A gap may follow an opening mark** or sit before a comma or full stop; the screen writes it
  without a stray space. A gap at the very start of a sentence needs a capitalised answer.
- **No ref twice** in a unit, and not in the unit directly before (checked).
- **European Portuguese** (content-plan §1.1): *autocarro, comboio, telemóvel, pequeno-almoço,
  casa de banho*, *tu* / *você* / *o senhor* as used in Portugal, *estar a + infinitive*, enclisis
  by default (*Diga-me*, *Chamo-me*), the 1990 spelling as used in Portugal (*facto, receção*). No
  Brazilian forms (*ônibus, celular, estou fazendo*). A task whose source carries a `ptBR` note
  needs a look before a Brazil mode is switched on: see the plan's open points.

### Hints and whys

- A hint helps the learner find the answer. It does not give the answer away:
  *"Oksana is talking about herself."*, *"Look at the end of the verb: -o."*
- ≤ 12 words, simple English, no grammar terms the learner hasn't met at this level. Hints are
  English: a beginner has to understand them. The only Portuguese hint is the fallback on a `wort`
  card with no hint of its own, the lexicon's example sentence.
- Default hints when a task has none: an article task points at the ending (*"-o is often o,
  -a is often a"*) or asks *"Is it one thing or more?"* when a plural is an option. A fill item
  uses the source's hint as *"Tip: …"*. Still write your own: the checker wants a hint on every
  task, and a hint written for the item is better.
- `why` (after a wrong answer): the rule in one or two short sentences, with the example:
  *"The ending -o belongs to eu: vivo."*

## 3. Order and level

Units follow the grammar order of `grammatik-lehrplan.json`, except that *ser/estar* comes
before the plural + adjective unit. A unit uses only grammar from its own unit and earlier ones.
The placement quick check (`einfach-app.js`, `placementStart`) jumps to fixed unit ids
(`a1-cafe` for 5–6 right, `a1-who-where` for 3–4). If you reorder A1, check those two still
sit after the topics the six A1 placement items test (*ser, estar, há, o/a*, the regular
present, *gostar de*).

Topics the path uses are append-only: adding an exercise at the end keeps every ref valid,
inserting one moves them. If a source item changes on purpose, its checksum breaks the build:
look at the task, fix it by hand and re-sign.

## 4. Workflow

1. Write the unit in `einfach-pfad.json` with refs **without** `@checksum` (`gram:praesens/2/3`).
2. `node scripts/check-einfach-pfad.mjs --sign` adds the checksums (gram, kultur, hoeren,
   redemittel refs). If a source item changes later, its checksum stops matching and the
   build fails. Look at the item again before re-signing.
3. `pnpm check:einfach`: fix every error. It also lists the postcards still marked `"neu"`.
4. Play it: `/portuguese/step-by-step#/uebung/<unit-id>` on the dev server (or
   `/portuguese/step-by-step?fixtures` for three hand-written test sittings).
5. Commit the path change on its own.

## 5. Bruno's voice (UI lines)

Bruno's lines live in `BRUNO_LINES` in `einfach-view.js`: ≤ 8 words, warm, never blaming, never
about missed days.

- **Reactions are simple European Portuguese** (*Muito bem!*, *Quase! Olha outra vez.*, with
  *tu* forms: Bruno is a friend), written `pt("…", "…")` with the English as `help`. A small `EN`
  tag on the bubble shows that a tap translates the line; a second tap goes back. The verdict
  under the task always says right or wrong in English, so nothing depends on understanding
  Bruno or on the mascots being on.
- **What the learner must understand is English:** the first hello (*Olá! I'm Bruno …*), the
  hints, the no-hint line. A line is `{ text }`, plus `lang` if it isn't English.
- Task hints use the same bubble. A task may carry `hintLang` (language of the hint) and
  `hintEn` (its `help`).

Spoken audio is `pt-PT`: a task's mp3 if it has one, otherwise the browser's voice for
`sprechen` sentences. Browsers often only have a Brazilian (`pt-BR`) voice; `pt-PT` then falls
back to it, which is a known limit until a pt-PT voice is wired (content-plan §1.2). Portuguese
text on screen carries `lang="pt-PT"`, so screen readers and voices pronounce it as European
Portuguese.
