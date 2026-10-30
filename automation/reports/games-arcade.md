# Run report: `games-arcade`

Date: 2026-10-30 · Branch: `content` · First run of this item (nothing to resume; split off by `games`).

## What was done

| Commit | What |
|---|---|
| `2e749bf` | **Nut night** (`/spiele/nussnacht`, `src/lib/nussnacht/`) in English |
| `a1a8e34` | **Listening safari** (`/spiele/hoer-safari`, `src/lib/hoerSafari/`) in English |
| (this commit) | report, content-plan §5.9 status, queue tick |

### Nut night
- **Shots are a / an / some** (index 0/1/2 where it was der/die/das; colours and CSS class
  names `nn-art--der/die/das` kept). Word pools come from the lexicon's `gender` a/an/some:
  A1 345, A2 401, B1 682 nouns. Lemmas: lower case, at most one space or hyphen, ≤ 16
  characters (Monday, TV, T-shirt stay out). Plural-only nouns stay out.
- **25 bosses** (`bosse.js`), all confirmed against the lexicon at build time (no misses):
  first sound ≠ first letter (*an hour, a hotel, a university, an uncle, a year, an island,
  a uniform, an onion*) and uncountables (*advice, information, luggage, homework, money,
  bread, work, rubbish, furniture, accommodation, equipment, knowledge, progress, news,
  research, evidence, software*). Each rule card is one plain-English sentence.
  A1 meets 14, A2 21, B1 25.
- **Radar**: the German ending radar (-ung, -chen …) became a **first-sound radar**:
  level 1 a/e/i/o words that take *an*, level 2 consonant words that take *a*, level 3 the
  h- and u-words in whichever article they take (*an hour / a hotel, an uncle / a university*).
  A word only glows if its real article matches, so it never teaches anything wrong.
- **Plural popper**: plural creatures now take *some* (was *die*); only countable nouns
  carry a plural.
- **No German compound splitting.** The compound upgrade (`kompositum`, id kept) is now the
  **Two-word cracker**: open compounds from the lexicon (*bus stop, email address, shop
  assistant*; A1 15, A2 49, B1 90). The seam is the space, nothing is guessed; the pop-up
  shows *a shop | assistant*, the point being that the first word's sound decides a/an.
  Only a/an two-word nouns get `h`.
- Upgrade names and texts, the game's text table (`TXT` in `main.js`), the canvas article
  labels, "Plopp" → "Pop", comments and the page's frontmatter comment are English.
- `node scripts/nussnacht-sim-test.mjs --level A1|B1 --minutes 3`: replay identical, bot
  survives 3:00 on both (A1 224 right / 13 wrong, B1 327 / 22).

### Listening safari
- **Audio decision:** `public/audio/wortschatz/` is empty, and the lexicon clips would say
  the bare noun anyway, while the game is about hearing *a / an + noun*. So `say()` now uses
  the **browser's British English voice** (speechSynthesis, en-GB preferred, rate 0.9), the
  same approach as Bruno Kart's `speak.js`. It says *a fork*, *an egg*, the hidden finds and
  the hit birds. A browser without speech shows the word in the hint button right away so
  the round can still be played by reading. The `a` (clip slug) key is kept in the word
  rows for when English recordings exist; the comment in `say()` marks where they go.
- **Words:** only *a / an* nouns with a picture (239: A1 144, A2 58, B1+B2 37; 18 take *an*).
  Uncountables are left out, as content-plan §5.9 says "hear a/an + noun".
  The page no longer requires an audio slug (none exist).
- Reload quiz: options *a / an* (two bubbles; the layout takes any number), prompt matches
  the existing en.json key `hs.q.article` "a or an?".
- Hidden finds: *a windmill, a signpost, a hot-air balloon* (were German).
- `levels.js` fallback names/news and the extra-balloon labels in `scene.js` are English
  (the shown texts already came from `hs.*` keys in `en.json`, which were English; all 157
  keys the game uses exist in `en.json`, checked with a script).

## Decisions
1. Shapes kept: word rows `{ id, w, g, a, pl, h }`, upgrade ids (`kompositum`, `radar` …),
   boss shape `{ w, g, lv, regel }`, level shape, storage keys. Only the meaning of `g`
   changed (0 a, 1 an, 2 some) and `h` now marks the second word of an open compound.
2. Safari keeps only a/an nouns instead of adding *some*: the plan names a/an, and *some bread*
   as a listening target would mostly test the noun, not the article.
3. No en.json change was needed (the `hs.*` block was already English), so no shared-file
   conflicts.

## Left open / for Edgar to review
- **Lexicon quirks show up in Nut night** (not fixed here; lexicon is another item's file):
  e.g. *some minimum wage*, *some sick pay* (English would use *the* / no article), and
  *a toast* is tagged countable. Worth a pass on the lexicon's `gender: "some"` for B1
  workplace nouns.
- Boss rule texts are mine; please read them as a teacher (esp. *some knowledge of English*:
  *a good knowledge of* also exists).
- The safari voice depends on the device's speech engine; quality varies (Windows/Android
  usually have an en-GB voice). Recorded clips of *a fork* would be better; that needs audio
  production, which is outside this run.
- `hoer-safari.astro` still has German fallback text inside `data-i18n` elements and some
  `t()` fallbacks in `game.js`/`board.js` are German; the build replaces them with `en.json`
  text (checked: build renders 1633 pages in "en"), so users do not see them.
- Not tested in a real browser (no Playwright browser here); the sim test covers Nut night's
  logic, not the safari.

## Verification
- `timeout 1500 pnpm build`: **passed** (1637 pages, postbuild leak checks ok), no
  `[nussnacht] Bosse ohne Lexikon-Treffer` warning.
