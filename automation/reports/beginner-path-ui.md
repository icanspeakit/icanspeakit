# beginner-path-ui: run report (2026-10-29)

Item: the /einfach ("Step by step") screens in English, plus the English unit recipe
(`docs/easy-mode-tier1-v1.md`). Split off by `beginner-path`.

## What I did

- **`src/lib/einfach-view.js`**: every screen in English: Today, the first-visit screen
  ("Where do you want to start?"), the quick check ("Quick check", "What fits?", "Just
  guess. Nothing is wrong here."), What next? / Another topic, the runner (task labels,
  buttons, verdicts), Done (claims, weekly goal sentence, "More about this in the course"),
  the postcard header ("A postcard from Bruno in York" / "A postcard from York" with the
  mascots off) and What you can do. Small counts use singular/plural ("1 task", "2 minutes").
  Speech synthesis now speaks `en-GB` (it was `de-DE`).
- **Bruno's lines** rewritten in A1 English, ≤ 8 words, same moods (right, wrong, first
  visit, back after a break, hello, no hint, review item, skipped, spoke).
- **`src/lib/einfach-app.js`**: placement result sentences ("You already know quite a lot.
  We'll start with “…”.") and the mistakes sitting title ("Practise your mistakes").
- **`src/lib/einfach-content.js`**: "Tip: …", "We say: an apple.", the default speaking hint,
  the Redemittel why line. The German der/die/das rule hints (from `artikel-packs.json`) are
  replaced by an English a/an/some hint that names the questions to ask ("Does it start with a
  vowel sound?", plus "Can you count it?" when *some* is an option) without giving the answer.
- **`src/lib/einfach-sprechen.js`**: speaking assessment language `en-GB`, login message in English.
- **`src/pages/einfach.astro`**: hidden h1 and noscript text in English. The unused
  `artikel-packs.json` import is gone (also from `scripts/check-einfach-pfad.mjs`).
- **`docs/easy-mode-tier1-v1.md`**: new. It did not exist in this repo (the German original
  was never copied over), so I wrote the English recipe from the code, the checker and the
  `beginner-path` report: unit fields, task types and which are usable now, how to choose
  items, how to write hints and whys, order, the workflow (`--sign`, `check:einfach`).

Commits: `398deaa` (view), `6c5e97d` (app/content/page/speaking), `4e3e254` (doc), plus this
report and the queue tick. `pnpm check:einfach` is clean (28 units, 194 tasks). `pnpm build`
succeeds. `dist/einfach/index.html` has no "Deutsch lernen" left.

## Decisions

1. **Bruno's de/en pairs → `{ text, help }`.** On the German site the bubble showed German
   and a tap showed English. Here the bubble shows English (the target language). The tap
   shows `help`, a translation into the learner's language, if one exists. None exists yet:
   the learners have no common first language, and I didn't want to guess one. So a tap on
   Bruno's own lines does nothing for now. A task's `hintEn` (only used by the fixtures)
   becomes its `help`. The CSS colour for the tapped state follows (`data-showing="help"`).
2. **English hard-coded in the JS-built screens**, not i18n keys. Same convention as the
   `ui-components` run (decision 5 there): the view had no keys before, and there is one UI
   language.
3. **Article tasks are a / an / some** (content-plan §1.4). The `artikel` screen now offers
   `a / an / some` for lexicon nouns, or the pair a grammar table brings. It is labelled with
   its options ("a or an?"). Grammar tables with placeholder `a / an` or `a / an / some` now turn
   into this screen, as `der / die / das` tables did on the German site. That changes four
   existing A1 tasks in `a1-wohnung` (*old house, big house, apple, hour*). They used to show
   "apple → ___" under the label "Sentence". Now they show "___ apple" under "a or an?". Same
   answer, same hints and whys. They now also count as vocabulary attempts (`trackVocab`), as
   article rows always did.
4. **"Check" in the sentence builder is no longer `disabled`** before all words are placed
   (CLAUDE.md rule). It uses `waitAttrs` and says "Tap 2 more words first.", and the word
   pool pulses. "Speak" stays `disabled` while it is recording, because that is a busy state.
5. **Hash screen names stay German** (`#/heute`, `#/uebung/…`, `#/fehler`), as do the unit
   ids and the localStorage key. Renaming them is the `routes` item's job.
6. "Situation" became **"topic"** (Another topic, What do you want to get better at?). After
   `beginner-path`, units are grammar-led, not situation-led.

## For Edgar to review

- The tone of Bruno's lines and the screen texts. I kept them short and A1. The one I'm least
  sure about is the Today greeting "A walk? English first!" (German: "Gassi gehen? Erst Deutsch!").
- Do you want a help language for Bruno's bubble (e.g. the site's chosen help language from
  i18n)? The mechanism is there; only the translations are missing.
- The postcard facts from the `beginner-path` report are still marked `"neu"`.

## Left open

- **`src/lib/einfach-fixtures.js`** (`/einfach?fixtures`, the prototype's three hand-written
  test sittings) is still German content (Hamburg, der Bahnhof …). It is test-only and not in
  this item's list. Rewrite it in English or drop it in `cleanup`.
- **Speaking error messages** come from `MSG` in `src/lib/ausspracheCheck.js`, which is still
  German, as is its `LANG = "de-DE"`. They belong to the `pronunciation` item. No unit has a
  speaking task yet, so the learner can't see them today.
- `einfach.astro` still loads the German lexicon, `kultur`, `hoeren`, `aussprache-check` and
  `redemittel` sources for `resolvePath`. They are unused until those items make them English
  (see `beginner-path` report).
- Code comments in the files still use the German screen names in places (heute, waehlen).
  They match the function names.
