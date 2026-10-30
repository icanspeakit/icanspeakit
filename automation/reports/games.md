# Run report: `games`

Date: 2026-10-30 · Branch: `content` · First run of this item (nothing to resume).

## What was done

| Commit | What |
|---|---|
| `3c8e33b` | **Countable sprint** (`/spiele/artikel-sprint`, Bruno Kart): `words.json` in English, code adapted |
| `dc74e21` | **Quaki jumps** (`/spiele/quaki-springt`): English question pools, tower texts, game text table |
| `a0bdfc5` | **Impostor** (`/spiele/hochstapler`): English themes and sentence starters, game strings |
| `bf40453` | **Sentence rain** (`/spiele/satzregen`): English sentences, checker and builder adapted, game strings |
| `454bd0c` | **a / an / some trainer** (`/artikel`): `artikel.json`, `artikel-packs.json`, `artikel-haeufigkeit.json`, trainer explanations, `ap.ex.*` keys |
| (this commit) | report, content-plan §5.9 status, two new queue items |

### Countable sprint (`src/data/artikel-sprint/words.json`, `src/lib/artikelSprint/`)
- 60 hand-picked nouns (20 per level): *an* before vowel sounds (*an hour, an umbrella*),
  consonant sounds spelt with a vowel (*a university, a uniform, a European, a user, a euro*),
  irregular plurals (*children, feet, teeth, mice, sheep, knives, halves, crises, series*),
  uncountables as `some` (*water, advice, information, furniture, luggage, accommodation*).
  `pluralWrong` holds typical learner errors (*childs, mouses, potatos, knifes*). `english`
  is a short definition (content-plan §1.4).
- 30 verbs: A1 present simple (*she goes, he has, Mei studies, I am*), A2 past simple
  (*went, bought, stopped, tried, was/were*), B1 past participles after *has/have*
  (*written, taken, gone, chosen, fallen, begun, taught*) and irregular past (*brought,
  thought, caught*). `tense` holds `past simple` / `past participle`; no tense = present simple.
- Code: lanes are A / AN / SOME (THE and ANY as the two trap boxes of the five-lane race room),
  colours mapped to the old hues, made-up English plurals and verb forms for topping up
  (incl. the greengrocer's *apple's*), the Plural mode leaves out nouns without a plural
  (uncountables), the lexicon's a/an/some nouns join per level (`lexWords.js`), the miss is
  read out as *an apple* / *two apples* by a British voice. The lexicon clips say the bare
  word, so the game no longer plays them for the article answer.
- Checked with a script: every deck (3 modes × 3 levels × 3 and 5 lanes, incl. lexicon
  nouns) deals questions with a valid answer and no duplicate options.

### Quaki jumps (`src/data/quakiSpringt/fragen.json`, `turm.json`)
- Own question pools: A1 30, A2 24, B1 20, B2 16, C1 16 (was 48/41/32/28/28 German).
  Topics: *be*, a/an/some, in/on/at, present simple, wh-words, there is/are, plurals,
  past simple, present perfect with *never/yet/since/for*, comparatives, modals, verb
  patterns (*look forward to -ing, suggest -ing*), conditionals, relative pronouns, passive,
  inversion (*Hardly had we…, Seldom have I…*), cleft sentences. Each item has exactly one
  correct option among its answers and a one-line rule. Ids are new (`qs-a1-01` …): the old
  ones named German topics (`a1-dativ-01`) and nothing outside the file uses them.
- Only the A1 tower exists (`turm.json`), so for now players see the A1 pool only.
  `node scripts/quaki-turm.mjs` passes.
- The game's text table (`TXT` in `src/lib/quakiSpringt/main.js`) was German: translated;
  questions are marked `lang="en"`.

### Impostor (`src/data/hochstapler/`, `src/lib/hochstapler/`)
- 13 A1 + 13 A2 themes, built from English lexicon ids (all resolve; checked with
  `themesFor`). Theme ids kept (`essen`, `kueche` …), names English. A2 `obst-gemuese` is
  now **Cooking**, because the English lexicon has too few fruit and vegetable nouns.
- Cards show *a fridge, an egg*; uncountables bare (*bread*, not *some bread*). The key is
  still `de` (code shape kept).
- Sentence starters for the clue and discussion rounds A1–C1 in British English.
- `strings.js` translated, plus 17 class-mode keys that had **no text at all** before
  (`rename`, `kick`, `voteOnPhones`, `quitSure` …: the projector screen showed the key names).
- The clue check that holds back a clue naming the word now strips *a/an* instead of
  taking the last word (so *post office* is checked as a whole).
- `node --test tests/hochstapler/game.test.mjs`: 6/6 pass.

### Sentence rain (`src/data/satzregen/quelle.txt` → `saetze.json`)
- 109 own sentences (was 373 German): `v2` A1 statements and wh-questions 39, `janein` A1
  yes/no questions 25, `klammer` A2 auxiliaries and modals 25, `nebensatz` B1 indirect
  questions 20. Mode ids kept; meanings in content-plan §5.9 and in the file header.
- **Checker:** English has no verb-second rule. The automatic "Vorfeld variants" would
  accept *On Saturdays plays Tom football*, so `VORFELD_MODES` is now empty and every other
  correct order is listed as `{alt …}` (time phrase at the front: *On Saturdays Tom plays
  football*). Place before time is the canonical order.
- `en` (shown under a solved line) now names the pattern (*subject + verb + object + time*)
  instead of a translation of the same sentence.
- Builder: the B1 check looks for a question word / if / whether chunk instead of a German
  comma conjunction. `node scripts/build-satzregen.mjs` builds without errors.
- Only mode `v2` is offered in the game UI (as before); the other three are data for later.
- Game strings (`STR`) translated; rule lines for all four modes.

### a / an / some trainer (`/artikel`) and `artikel*.json`
- Answer options a / an / some. Explanations after an answer say why, by first **sound**:
  vowel sound → *an*, consonant sound → *a*, vowel letter with a "you"/"w" sound → *a*
  (*a university*), silent h or letter name → *an* (*an hour, an X-ray*), uncountable → *some*,
  plural-only → *some*; each with a very simple (Leicht) version. The 24 German `ap.ex.*`
  keys in `en.json` were replaced by 14 English ones (only lines in that block changed).
- Rule packs: *some: you can't count it*, *an + vowel sound*, *a + consonant sound*; the
  exceptions pack (B1/B2, ≥ 5 words) holds *a university, an hour, a uniform, an MP, an X-ray,
  a euphemism, a username*. `artikelPacks.js` got first-letter matching (`prefixes`,
  `countableOnly`, `uncountable`). Topic pack names English (lexicon topic ids are still German).
- `artikel.json` (only counted on the pronunciation and exam cards): 31 English nouns.
- `artikel-haeufigkeit.json` emptied: it held German subtitle counts keyed by German ids, some
  of which are now English ids too (`name`). `scripts/artikel-haeufigkeit.mjs` reads `en_50k`;
  run it after `node scripts/attach-ranks.mjs` once the English ranks exist.

## Decisions
1. **Scope.** The item names four games; I did those plus the `/artikel` trainer data
   (content-plan gives `artikel*.json` to `games`). The other §5.9 games keep their German
   word lists, rules and dialogue **inside their code**, not in data files, so they need a
   rewrite each. They are new queue items (before `teachers`):
   - `games-arcade`: Nut night (bosses with der/die/das rules, compound splitting, upgrade
     texts) and Listening safari (needs heard *a/an + noun*; no English audio yet).
   - `games-dialogue`: front desk sim (Bürgeramt), manners simulator (Knigge, ~70 KB of
     dialogue), Lindenau → Brambleford (~170 KB).
2. **Code changes** were limited to what the English content needs (article lists, plural
   and verb-form generators, voice language, the Vorfeld switch, the indirect-question check,
   rule-pack matching). Data shapes, keys and ids stayed, except the Quaki question ids and
   the rule-pack ids (both had German meaning and no outside references; the old rule-pack
   progress belonged to German nouns that no longer exist).
3. **UI string tables inside game code** (Quaki, Sentence rain, Impostor) were German, so the
   games would have shown German around English content. I translated them in place rather
   than moving them to `en.json` (each file says it is ready to move to `sr.*`/`hst.*` keys).
4. All game content is written for the games, so nothing needed a licence note.
   British English throughout (*colour, practise, flat, lorry, queue*).

## Left open / for Edgar to review
- **Review the content as a teacher**, especially the B2/C1 Quaki items (inversion, cleft
  sentences) and the Sentence rain alts: a learner who puts *in the summer* before *me* gets
  "wrong", although a few variants are marginal English. I kept the sentences short to avoid
  such cases.
- Quaki shows only the A1 pool until more tower levels exist.
- Sentence rain offers only the A1 mode in its UI; turning on the other three is one line
  each in `STR.modes` (`src/lib/satzregen/game.js`).
- `scripts/test-satzregen.mjs` needs a Playwright browser that is not installed here; not run.
- `ArtikelTrainer.astro` and `ArtikelPicker.astro` still have German code comments and some
  German fallback strings (the page renders the English `en.json` keys). `/artikel` has no
  frequency view until ranks are attached.
- The "Wörter gelernt" progress topic for the sprint's present-simple verbs is still
  `praesens` (the slot id, renamed only by `routes`).

## Verification
- `timeout 1500 pnpm build`: **passed** (1637 pages, postbuild leak checks ok) after commit
  `454bd0c`. Spot checks in `dist/`: `/spiele/hochstapler/woerter-a1.json` has English themes,
  `/spiele/artikel-sprint/woerter-a2.json` 333 a/an/some nouns, `/artikel` shows the English rule packs.
