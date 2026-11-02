# Run report: `idioms-mistakes`

Date: 2026-10-30 · Branch: `content` · Result: **done**, build green (2 min 29 s, 2,131 pages).

No earlier run had started this item, so this run started from scratch and followed
`docs/content-plan.md` §5.7.

## What changed (one commit per file)

| Commit | File(s) | What |
|---|---|---|
| `497489a` | `umgangssprache.json`, `/wissen/umgangssprache` | Informal British English: short forms (gonna, dunno, cos, ain't), everyday words (cheers, mate, fancy, knackered, cuppa, posh), money words (quid, fiver/tenner, p, grand, “oh” for zero), young people's slang (innit, bruv, sick, gutted, skint, cringe, salty, no cap), rude words in three strengths (damn, bloody … crap, shit, pissed, piss off … the F-word as “f***”), polite swaps, UK law note. Page: `lang="de"` removed, English quotes. |
| `9c7bd66` | `typische-fehler.json`, `wortarten.json`, worksheet/live-quiz/search labels, `/grammatik/typische-fehler` | 32 pairs in the same 5 group ids: homophones (its/it's, your/you're, there/their, to/too, whose/who's, hear/here, buy/by), capital letters (I, English, Monday, summer, Mum), near look-alikes (then/than, lose/loose, quiet/quite, advice/advise, accept/except, live/leave, dessert/desert, felt/fell, of/off), fixed expressions (I'm cold, I'm 20, I agree, take a photo, you're right, for three years, information, explain to me), behind / at the back / in front of / opposite. New its/it's comic. The part-of-speech cards on `/grammatik/wortarten` now link a pair (numbers: none). |
| `ad5203a` | `synonyme.json` | 128 synonym groups A1–B2, same shape; only emoji that have a local OpenMoji SVG. |
| `85e13b0` | `wortfallen.json`, `en.json`, `/wissen/wortfallen` | 17 traps: look-alikes (kitchen/chicken, ship/sheep, hungry/angry, walk/work, fun/funny, borrow/lend, receipt/recipe) and false friends (become, gift, actual, eventually, sensible, embarrassed, library, chef, handy, factory/fabric). `en.json` `wortfallen.<id>.*` re-keyed (the build renders those keys over the HTML). |
| `3d4c657` | `fehler-nach-sprache.json`, `aussprache-muttersprache.json`, `langMark.js` | Typical English mistakes for 13 first languages: strengths, grammar/writing/word mistakes, note and the 9-question quiz in English. The `area: "aussprache"` entries from the `pronunciation` run were kept as they were. |
| `71a87b3` | `redewendungen.json`, idiom pages and libs, `en.json` | 60 English idioms and proverbs, B1–C1. |
| this commit | `docs/content-plan.md`, this report, `automation/QUEUE.md` | Plan records the state; item ticked. |

## Decisions

- **Idioms, quality over quantity:** 60 entries instead of 150 (6 idioms per theme in the 8
  theme slots, 12 proverbs). Every entry cites its Wiktionary page. I checked all 60 titles
  through the Wiktionary API, so none of the links is dead. An **origin is told only where the
  Wiktionary etymology (read on 2026-10-30) supports it** (19 entries, e.g. *back to the
  drawing board* = Peter Arno cartoon 1941, *steal someone's thunder* = John Dennis, *it's all
  Greek to me* = Julius Caesar, *at the eleventh hour* = Matthew 20, *learn the ropes* and
  *under the weather* = sailing). Popular but unproven stories are named as such (*spill the
  beans*, *pinch of salt*, *break a leg*). Everything else says “Nobody knows for sure …” with
  `certainty: unklar`. All entries are `status: entwurf`, as the German ones were.
- **Idiom field meanings:** `de` holds the English idiom; `en` is now a plain-English paraphrase,
  and the heading changed from “In English” to “In plain words” (page and `rw.facts.en`).
  `gapWord()` (the “Complete” exercise) and the sort order in `redewendungenData.js` now work on
  English (skip list of small words; checked by hand on all 60).
- **Slang:** the plan says “no offensive slang”. The page needs its folded “Rude” section, so
  it keeps swear words a learner will hear (mild to strong) but no slurs and no insults
  about groups of people. The strongest word is written as “the F-word (f***)”.
- **Word traps (`wortfallen`):** the page title already promises “look-alikes and false
  friends”, so the set mixes both. Group ids are **new English ids** (`kitchen`, `become` …),
  because they are only page anchors, en.json keys and audio file names, and no audio exists.
  The live-quiz `src` keys (`g:wortfallen#<id>-<n>`) change with them. `audio` is `false`
  everywhere until English recordings exist.
- **Mistakes by first language:** the slot `englisch` (English speakers learning German) is now
  `deutsch` (German speakers learning English), as the pronunciation report proposed, with the
  drills `w-v`, `th`, `auslaut` linked both ways. `pnpm check:aussprache` shows only the known
  “drill texts without audio” problem from before.
- **Translations:** `tr`/`regelTr` in `typische-fehler.json` are `{}`. They explained German
  pairs, and English is the only help language; `field({})` returns null, so nothing shows.
- **Icons:** only emoji with an SVG already in `public/img/openmoji` (no download). Where the
  best icon was missing (chicken, ship, butterfly, ice cube …), a near one was used
  (🐥, ⛴️, 😬 + 🌸, ❄️).

## For Edgar to review

1. **Idioms**: the 60 entries are drafts. Please read the 19 origin texts in particular.
2. **Swear words** on `/wissen/umgangssprache` (folded by default): is the list right for the
   site's tone?
3. **UK law line**: “Swearing is not a crime in itself … threatening or abusive words that cause
   harassment, alarm or distress can be an offence under the Public Order Act 1986.” This is my
   summary, not legal advice; please check it, or cut it to a softer line.
4. **First-language facts** (`fehler-nach-sprache.json`): written from standard contrastive
   knowledge (the note cites Swan & Smith, *Learner English*), not checked line by line against
   a source. Least sure: the Tagalog “open the light” and the Turkish/Ukrainian question items.
5. Stored first language `englisch` in a browser no longer matches a tab (it falls back to
   “All”). There are no real users yet, so I added no migration.

## Left / not in this item

- German UI fallbacks inside page scripts (e.g. “Hoppla – reingefallen!” on `/wissen/wortfallen`,
  “Muttersprache wählen” on `/kultur/fehler`) are covered by `data-i18n` keys, so the built
  HTML is English. Cleaning the source fallbacks is UI work.
- `kalender-saetze.json` has its own `redewendungen` list (culture item).
- The menu's culture quiz titles are still German (“Du oder Sie?”), which belongs to `culture`.
- Audio for word traps, idioms and drills: not generated (no TTS provider).
- `REDEWENDUNGEN_LIVE` stays `false`: the idiom pages build, but they are noindex and not linked
  until Edgar releases them.
