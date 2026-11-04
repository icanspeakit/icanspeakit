# Step by step (/step-by-step): how to write a Spanish unit

Recipe for adding or changing a unit of the beginner path in `src/data/einfach-pfad.json`.
Rewritten 2026-11-04 by the `beginner-path-ui` run for the Spanish course. It replaces the
English version. The path is Castilian Spanish, A1 to B1, for adults, many of whom live in Spain.

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
  "postcard": { "city": "Madrid", "fact": "…", "source": "neu" },
  "tasks": [ … ]
}
```

| Field | Rule |
|---|---|
| `id` | Keep existing ids, even the German ones. Learners' progress is stored by id (`da_einfach_v1`). New units get English kebab-case ids with the level prefix (`a1-who-where`). |
| `title` | What the learner does, in simple English, 2–5 words: *Introduce yourself*, *Book the padrón*. Not the grammar name. |
| `grammar` | The grammar topic slot (file name in `src/data/grammatik/`). The page turns it into the "More about this in the course" link with `topicPath()`, so the link follows the topic's slug. |
| `claims` | 1–2 sentences, **≤ 10 words** (checked), simple English, starting with *You …*: *You ask where things are.* Say what the tasks really train. Don't claim more than that. The first claim is also shown as "Coming next" on the What you can do screen. |
| `minutes` | 2 (3 for a 7-task B1 unit). |
| `postcard` | One place in Spain per unit, no repeats on the path. `fact`: 1–2 short sentences in simple English, a fact you are sure of. `source`: `"neu"` (written here, not yet checked) → Edgar switches it to `"geprüft"` after checking. A `kultur:topic#n@sum` ref instead takes the fact from `kultur.json` once that file is Spanish. |

## 2. Tasks

A task never copies text. It points at a reviewed source item by **ref**, and
`einfach-content.js` builds the screen from that item. Every task needs a **`hint`** in
English (Bruno says it when tapped; checked). Add a **`why`** when the source's own
explanation does not explain *this* item. It is shown after a wrong answer.

| Type | Screen | Source (ref) | Usable now? |
|---|---|---|---|
| `luecke` | Sentence with a gap, 2–3 options | `gram:<topic>/<exercise>/<item>@<sum>` (fill or table item), `akk:<id>` (object pronouns) | **yes** |
| `satz` | Build the sentence from word chips | `gram:<topic>/<exercise>/<item>@<sum>` (build item) | **yes** |
| `artikel` | `___ mesa` with *el / la* | `lex:<unit>/<lemma>` (noun with `gender` = `el` or `la`, not `el/la`), or a grammar table with placeholder `el / la`, `el / la / los / las`, `un / una` or `un / una / unos / unas` | lexicon: after `vocab-a1`. Grammar tables: **yes**, a `luecke` on such a row turns into this screen automatically. |
| `wort` | Word card: front `la casa` (+ `las casas`), back = the lexicon's English gloss | `lex:<unit>/<lemma>` (a1, a2 and b1 lexicons) | after `vocab-a1`…`vocab-b1` |
| `redemittel` | "What do you say?" situation, 3 phrases | `redemittel:<set>#<n>@<sum>` + exactly 2 `distractors` from other sets + `situation` | after `speaking` |
| `hoeren` | Listen, then answer | `hoeren:<text>/<q>@<sum>` | after `listening` (needs the mp3) |
| `sprechen` | Read a sentence aloud | `aussprache:<id>` | after `pronunciation` |

Until those items have made their sources Spanish, a unit uses only `luecke`, `satz` and
`artikel` rows from grammar tables. Don't point a task at a source that is still English.

### What the resolver reads

- **Options:** the task's `options`, else the item's `choices` if there are 2–3, else the
  table's placeholder if it lists 2–3. A screen shows three at most, so a longer `choices`
  list (`el / la / los / las`) needs `options` on the task.
- **Why:** the task's `why`, else the item's `why`, else the exercise's hint (for a build
  item, its title).
- **Build items:** the marks at the very end become the closing mark. A comma inside the
  sentence stays on the word before it (`Hola,`). Every `alt` order counts as right too, without
  regard to capitals or commas, so word order the source accepts is accepted here.
- **Table rows:** a term with `___` is the sentence with its gap. A term `ella · vivir` shows
  as `ella ___ (vivir)`, so write **person · verb**, never verb · person. Any other term shows
  as `term → ___`.

### Choosing items

- **One right answer only.** Avoid items where a second option is also correct Spanish
  (*he ido / fui*, *por / para* in a free sentence, *lo / le* for a man, which leísmo allows).
  The options must rule it out.
- **Options:** 2–3, the right one plus real learner errors (*a el*, *soy cansado*, *los manos*,
  *la problema*). The right answer must be one of the source's accepted answers.
  Otherwise the build fails.
- **Table answers with a comma** are split into several accepted answers. Avoid them unless that is what you want.
- **Accents and capitals:** an option differs from its neighbour by more than an accent unless
  the accent is the point (*esta / está*, *tú / tu*). `accepts` ignores case, so never offer
  *lunes / Lunes*.
- **A gap may follow `¿` or `¡`** (`¿___ vives?`); the screen writes it without a space. A gap
  at the very start of a sentence needs a capitalised answer.
- **No ref twice** in a unit, and not in the unit directly before (checked).
- **Castilian Spanish** (content-plan §1.1): *vosotros, piso, móvil, coche*, with ¿ ¡ and every
  accent. A task whose source has an `es419.skip` needs a look before a LatAm mode: see the
  plan's open points.

### Hints and whys

- A hint helps the learner find the answer. It does not give the answer away:
  *"Oksana is talking about herself."*, *"Look at the end of the verb: -o."*
- ≤ 12 words, simple English, no grammar terms the learner hasn't met at this level. Hints are
  English: a beginner has to understand them. The only Spanish hint is the fallback on a `wort`
  card with no hint of its own, the lexicon's example sentence.
- Default hints when a task has none: an article task points at the ending (*"-o is often el,
  -a is often la"*) or asks *"Is it one thing or more?"* when a plural is an option. A fill item
  uses the source's hint as *"Tip: …"*. Still write your own: the checker wants a hint on every
  task, and a hint written for the item is better.
- `why` (after a wrong answer): the rule in one or two short sentences, with the example:
  *"The ending -o belongs to yo: vivo."*

## 3. Order and level

Units follow the grammar order of `grammatik-lehrplan.json`, except that *ser/estar* comes
before the plural + adjective unit. A unit uses only grammar from its own unit and earlier ones.
The placement quick check (`einfach-app.js`, `placementStart`) jumps to fixed unit ids
(`a1-cafe` for 5–6 right, `a1-who-where` for 3–4). If you reorder A1, check those two still
sit after the topics the six A1 placement items test (*ser, estar, hay, el/la*, the regular
present, *gustar*).

Topics the path uses are append-only: adding an exercise at the end keeps every ref valid,
inserting one moves them. If a source item changes on purpose, its checksum breaks the build:
look at the task, fix it by hand and re-sign.

## 4. Workflow

1. Write the unit in `einfach-pfad.json` with refs **without** `@checksum` (`gram:praesens/2/3`).
2. `node scripts/check-einfach-pfad.mjs --sign` adds the checksums (gram, kultur, hoeren,
   redemittel refs). If a source item changes later, its checksum stops matching and the
   build fails. Look at the item again before re-signing.
3. `pnpm check:einfach`: fix every error. It also lists the postcards still marked `"neu"`.
4. Play it: `/spanish/step-by-step#/uebung/<unit-id>` on the dev server (or
   `/spanish/step-by-step?fixtures` for three hand-written test sittings).
5. Commit the path change on its own.

## 5. Bruno's voice (UI lines)

Bruno's lines live in `BRUNO_LINES` in `einfach-view.js`: ≤ 8 words, warm, never blaming, never
about missed days.

- **Reactions are simple Spanish** (*¡Muy bien!*, *¡Casi! Mira otra vez.*), written `es("…", "…")`
  with the English as `help`. A small `EN` tag on the bubble shows that a tap translates the
  line; a second tap goes back. The verdict under the task always says right or wrong in
  English, so nothing depends on understanding Bruno or on the mascots being on.
- **What the learner must understand is English:** the first hello (*¡Hola! I'm Bruno …*), the
  hints, the no-hint line. A line is `{ text }`, plus `lang` if it isn't English.
- Task hints use the same bubble. A task may carry `hintLang` (language of the hint) and
  `hintEn` (its `help`).

Spoken audio is `es-ES`: a task's mp3 if it has one, otherwise the browser's voice for
`sprechen` sentences. Spanish text on screen carries `lang="es"`, so screen readers and voices
pronounce it as Spanish.
