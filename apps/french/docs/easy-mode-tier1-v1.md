# Step by step (/step-by-step): how to write a French unit

Recipe for adding or changing a unit of the beginner path in `src/data/einfach-pfad.json`.
Rewritten 2026-11-08 by the `beginner-path-ui` run for the French course. It replaces the
Spanish version. The path is standard French of France, A1 to B1, for adults, many of whom live
in France (content-plan §1.1).

Related files:

- `src/data/einfach-pfad.json`: the path (levels → units → tasks)
- `src/lib/einfach-content.js`: how a ref is looked up and turned into a task
- `src/lib/einfach-view.js`: the screens and Bruno's lines
- `src/lib/einfach-fixtures.js`: three hand-written French sittings for testing (`?fixtures`)
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
  "postcard": { "city": "Paris", "fact": "…", "source": "neu" },
  "tasks": [ … ]
}
```

| Field | Rule |
|---|---|
| `id` | Keep existing ids, even the German ones and the ones whose topic changed (`a1-who-where` is être/avoir now). Learners' progress is stored by id (`da_einfach_v1`). New units get English kebab-case ids with the level prefix (`a1-not`, `b1-y-en`). |
| `title` | What the learner does, in simple English, 2–5 words: *Introduce yourself*, *Book the préfecture*. Not the grammar name. |
| `grammar` | The grammar topic slot (file name in `src/data/grammatik/`). The page turns it into the "More about this in the course" link with `topicPath()`, so the link follows the topic's slug. |
| `claims` | 1–2 sentences, **≤ 10 words** (checked), simple English, starting with *You …*: *You say no with ne … pas.* Say what the tasks really train. Don't claim more than that. The first claim is also shown as "Coming next" on the What you can do screen. |
| `minutes` | 2 (3 for a 7-task B1 unit). |
| `postcard` | One place in France per unit, no repeats on the path (Paris is on it twice for now: `a1-vorstellen` and `a1-cafe`; change one when you touch either). `fact`: 1–2 short sentences in simple English, a fact you are sure of. `source`: `"neu"` (written here, not yet checked) → Edgar switches it to `"geprüft"` after checking. A `kultur:topic#n@sum` ref instead takes the fact from `kultur.json` once that file is French. |

## 2. Tasks

A task never copies text. It points at a reviewed source item by **ref**, and
`einfach-content.js` builds the screen from that item. Every task needs a **`hint`** in
English (Bruno says it when tapped; checked). Add a **`why`** when the source's own
explanation does not explain *this* item. It is shown after a wrong answer.

| Type | Screen | Source (ref) | Usable now? |
|---|---|---|---|
| `luecke` | Sentence with a gap, 2–3 options | `gram:<topic>/<exercise>/<item>@<sum>` (fill or table item), `akk:<id>` (object pronouns) | **yes** |
| `satz` | Build the sentence from word chips | `gram:<topic>/<exercise>/<item>@<sum>` (build item) | **yes** |
| `artikel` | `___ gare` with *le / la*, or `___ école` with *un / une* | `lex:<unit>/<lemma>` (see "Article tasks" below), or a grammar table with placeholder `le / la`, `le / la / l'`, `le / la / l' / les`, `un / une` or `un / une / des` | lexicon: after `vocab-a1`. Grammar tables: **yes**, a `luecke` on such a row turns into this screen automatically. |
| `wort` | Word card: front `la maison` (+ `les maisons`), `l'école` (+ `les écoles`), back = the lexicon's English gloss | `lex:<unit>/<lemma>` (a1, a2 and b1 lexicons) | after `vocab-a1`…`vocab-b1` |
| `redemittel` | "What do you say?" situation, 3 phrases | `redemittel:<set>#<n>@<sum>` + exactly 2 `distractors` from other sets + `situation` | after `speaking` |
| `hoeren` | Listen, then answer | `hoeren:<text>/<q>@<sum>` | after `listening` (needs the mp3) |
| `sprechen` | Read a sentence aloud | `aussprache:<id>` | after `pronunciation` |

Until those items have made their sources French, a unit uses only `luecke`, `satz` and
`artikel` rows from grammar tables. Don't point a task at a source that is still Spanish:
a `lex:` ref to a word with `el` / `el/la` or `variety: "es-ES"` / `"es-419"` fails the build.

### Article tasks (content-plan §1.4, §5.9)

In French the article can hide the gender: *l'école* gives nothing away, and *les* is the
same for every noun. So the resolver asks:

| Lexicon noun | Screen | Answer |
|---|---|---|
| `gender: "le"` or `"la"` (also with `hAspire`: *le héros*) | `___ gare`, *le / la* | the gender |
| `gender: "l'"` with `genus: "m"` or `"f"` | `___ école`, *un / une* | `un` for m, `une` for f; the `why` adds *(and l'école)* |
| `gender: "l'"` with `genus: "mf"` (*l'élève*), `"les"`, `"le/la"`, `pluralOnly`, no gender | — | build error: there is nothing to ask |

*L'* itself is a rule (*l'école, not la école*), taught in the grammar topics and in `luecke`
items whose options show it whole (`l'école / la école`), never as a gender choice.

Grammar-table rows: the answer is joined to the noun as French writes it, so an `l'` row reads
*l'école* in the verdict (no space after the apostrophe). A `le / la / l' / les` table has four
options, so a path task on it must bring three `options` itself (for example `["le", "la", "l'"]`
for a singular noun).

### What the resolver reads

- **Options:** the task's `options`, else the item's `choices` if there are 2–3, else the
  table's placeholder if it lists 2–3. A screen shows three at most, so a longer `choices`
  list (`le / la / l' / les`) needs `options` on the task.
- **Why:** the task's `why`, else the item's `why`, else the exercise's hint (for a build
  item, its title).
- **Build items:** the marks at the very end become the closing mark. A comma inside the
  sentence stays on the word before it (`Bonjour,`). A tile never splits at the apostrophe
  (`J'ai`, `l'école`, `qu'il`), so write them as one word in the source. Every `alt` order
  counts as right too, without regard to capitals or commas (*Demain, je travaille* /
  *Je travaille demain*).
- **Table rows:** a term with `___` is the sentence with its gap. A term `elle · finir` shows
  as `elle ___ (finir)`, so write **person · verb**, never verb · person. Any other term shows
  as `term → ___`.

### Choosing items

- **One right answer only.** Avoid items where a second option is also correct French
  (*passé composé / imparfait* in a free sentence, *le / un* where both fit the situation,
  *tu / vous* without a clear speaker). The options must rule it out.
- **Options:** 2–3, the right one plus real learner errors (*à le*, *je suis 25 ans*,
  *la problème*, *le école*). The right answer must be one of the source's accepted answers.
  Otherwise the build fails.
- **Table answers with a comma** are split into several accepted answers. Avoid them unless that is what you want.
- **Accents and capitals:** an option differs from its neighbour by more than an accent unless
  the accent is the point (*ou / où*, *a / à*, *du / dû*). `accepts` ignores case, so never offer
  *lundi / Lundi*.
- **French spacing** is the screen's job: it writes a no-break space before `?`, `!`, `;`, `:`
  and `»`, none before `.` and `,`, and none after an apostrophe or `«`. Write the source the
  usual French way (*Tu viens ?*); a gap at the very start of a sentence needs a capitalised
  answer.
- **No ref twice** in a unit, and not in the unit directly before (checked).
- **Standard French of France** (content-plan §1.1): metropolitan vocabulary, every accent,
  traditional spelling first. Where Québec usage differs (*courriel, magasiner,
  déjeuner/dîner/souper*), the item's `frCA` note says so; the path never asks a choice that
  only one of the two varieties gets right.

### Hints and whys

- A hint helps the learner find the answer. It does not give the answer away:
  *"Oksana is talking about herself."*, *"Look at the end of the verb."*
- ≤ 12 words, simple English, no grammar terms the learner hasn't met at this level. Hints are
  English: a beginner has to understand them. The only French hint is the fallback on a `wort`
  card with no hint of its own, the lexicon's example sentence.
- Default hints when a task has none: an article task on a consonant noun points at the ending
  when it is a telling one (*-tion, -té, -ette, -ure* / *-ment, -age, -eau, -isme*), an elided
  noun says *"L' hides the gender. Un or une?"*, and a set with *des* or *les* asks *"One thing
  or more?"*. A fill item uses the source's hint as *"Tip: …"*. Still write your own: the
  checker wants a hint on every task, and a hint written for the item is better.
- `why` (after a wrong answer): the rule in one or two short sentences, with the example:
  *"la gare → à la gare. Only à + le joins: au."*

## 3. Order and level

Units follow the grammar order of `grammatik-lehrplan.json` (pronouns and être/avoir first,
ne … pas and questions in A1, partitive and imperative in A2, depuis / il y a and y / en in B1;
content-plan §13 "Decisions by beginner-path"). A unit uses only grammar from its own unit and
earlier ones. The placement quick check (`einfach-app.js`, `placementStart`) jumps to fixed unit
ids: `a1-weg` (il y a / c'est) for 5–6 right, `a1-describe` (agreement) for 3–4. If you reorder
A1, check those two still sit after the topics the six A1 placement items test (*être, avoir*,
the *-er* present, *le / la*, *ne … pas*, *est-ce que*, adjective agreement).

Topics the path uses are append-only: adding an exercise at the end keeps every ref valid,
inserting one moves them. If a source item changes on purpose, its checksum breaks the build:
look at the task, fix it by hand and re-sign. (There is no repoint script any more.)

## 4. Workflow

1. Write the unit in `einfach-pfad.json` with refs **without** `@checksum` (`gram:praesens/2/3`).
2. `node scripts/check-einfach-pfad.mjs --sign` adds the checksums (gram, kultur, hoeren,
   redemittel refs). If a source item changes later, its checksum stops matching and the
   build fails. Look at the item again before re-signing.
3. `pnpm check:einfach`: fix every error. It also lists the postcards still marked `"neu"`.
4. Play it: `/french/step-by-step#/uebung/<unit-id>` on the dev server (or
   `/french/step-by-step?fixtures` for three hand-written test sittings).
5. Commit the path change on its own.

## 5. Bruno's voice (UI lines)

Bruno's lines live in `BRUNO_LINES` in `einfach-view.js`: ≤ 8 words, warm, never blaming, never
about missed days.

- **Reactions are simple French** (*Très bien !*, *Presque ! Regarde encore.*, *Ce n'est pas
  grave.*), written `fr("…", "…")` with the English as `help`. He says *tu*, as a friend would.
  Write the space before `!` and `?` as the no-break `${NB}`. A small `EN` tag on the bubble
  shows that a tap translates the line (it then reads `FR`); a second tap goes back. The verdict
  under the task always says right or wrong in English, so nothing depends on understanding
  Bruno or on the mascots being on.
- **What the learner must understand is English:** the first hello (*Bonjour ! I'm Bruno …*),
  the hints, the no-hint line. A line is `{ text }`, plus `lang` if it isn't English.
- Task hints use the same bubble. A task may carry `hintLang` (language of the hint) and
  `hintEn` (its `help`).

Spoken audio is `fr-FR`: a task's mp3 if it has one, otherwise the browser's French voice. French
text on screen carries `lang="fr"`, so screen readers and voices pronounce it as French.
