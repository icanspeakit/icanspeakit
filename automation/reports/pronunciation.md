# Run report: `pronunciation`

Run: 2026-10-30 (one run, no earlier attempt). Branch `content`. **Build not confirmed green: it timed out twice (see “Build”), so the result is PARTIAL and the queue item is not ticked.**

## What was done

| Commit | What |
|---|---|
| `2aa4c7e` | **`ausspracheregeln.json`** (rule column of `/aussprache`): 14 English rules in the 14 old rule ids, with `match` regexes tested on English words. `AusspracheRegeln.astro`: rule text marked `lang="en"`, and the example-audio lookup strips *a/an/the* as well as *der/die/das*. |
| `1927974` | **`aussprache-check.json`**: 26 English sentences A1–B1 in the old ids (the six question slots stay questions). **`src/lib/ausspracheTipps.js`**: English sound tips with English focus ids. |
| `1f00c1f` | The check scores and speaks **en-GB** (`LANG`, browser voice prefers en-GB, then any `en` voice) in `ausspracheCheck.js`, `ausspracheFuerDich.js`, `ausspracheCheckFuerDich.js`. `satzmelodie.js`: English wh-words for the melody type, English melody tips. All visible messages in `ausspracheCheck.js` (status, errors, score names, tips) are English. Practice text on the check, tongue-twister and drill pages is marked `lang="en"`. |
| `f5384a1` | **`zungenbrecher.json`**: 22 traditional English tongue twisters, Easy/Medium/Hard. `minis.js`: animal sounds in English. |
| `3e4f138` | **`satzmelodie.json`** (`/satzmelodie`): 10 sentence families, 10 sentence-stress items, 7 rules. en.json rule texts, echo-question caveat, topic names and teacher tip are English. The page uses an en-GB voice. Maze feedback (`melodieLabyrinth.js`) is English. `check-satzmelodie.mjs` checks English wh-words. |
| `8540c95` | **`aussprache-muttersprache.json`**: 18 drills for 12 first languages. The pronunciation entries of **`fehler-nach-sprache.json`** are rewritten to match. **`patterns.ts`**: English detection rules. en.json `ac.find.*` synced. |
| `6924ef6` | content-plan §5.6 records the state. |
| (this commit) | This report. |

## Decisions

### Rules, check sentences, sound tips

- **British English** (content-plan §1.1). The r rule teaches non-rhotic r and mentions that US English says every r.
- **Rule topics** follow the plan's list (§5.6): th, w/v, ship/sheep, schwa, silent letters, *-ed*, word stress, weak forms. I added magic *e*, s-clusters, *-s* endings, voiced final consonants, h and linking, because the old slots had room for them. Weak forms are part of the schwa rule (*a cup of tea* = /ə kʌp əv tiː/).
- **Regexes stay narrow.** English spelling is irregular, so a rule is only highlighted when its pattern is reliable:
  - The magic-e rule skips *-re* words (*here, more*).
  - The *-ed* rule skips *hundred, naked, wicked, sacred*.
  - The s-cluster rule skips *sc* before *e/i/y* (*science*).
  - The schwa rule only fires on *-er/-or* after a consonant in a word of two or more syllables.
  - I tested every regex on positive and negative words.
- **Sound tips** (`ausspracheTipps.js`):
  - New ids: `th`, `w-v`, `i-ee`, `ae`, `ed`, `s-cluster`, `h`, `r`, `ng`, `end`.
  - Without a focus, the narrow tests run first: *walked* gets the *-ed* tip, not the w tip.
  - The *th* tip tells /ð/ (*this, mother*) from /θ/ (*think*).
  - The *-ed* tip tells /t/, /d/ and /ɪd/ apart.
  - The *a* tip leaves out British long-a words (*class, fast, bath, can't*) and *w/qu* + a (*wash, what*).
  - The r tip says the r is silent after a vowel.
- **Check sentences.** Questions that will be checked for a rising voice are genuine yes/no questions without *please* (*Can you send me the bill by email?*). In British English a polite request with *please* often falls, and the checker would then mark a natural reading as wrong.
- **`audio: false` everywhere** (check, twisters). There are no English recordings (`public/audio` does not exist in this repo). The old `true` flags would have pointed at missing files. The pages fall back to the browser voice, which is now en-GB. The generator scripts set the flag again once recordings exist.

### Tongue twisters

- **Only traditional folk twisters** (public domain), for example:
  - *Red lorry, yellow lorry*;
  - *She sells seashells*;
  - *Peter Piper*;
  - *Betty Botter*;
  - *Whether the weather*;
  - *The sixth sick sheikh's sixth sheep's sick*.
- **22 instead of 25.** The slots `hamster-hannes`, `dackel-dieter` and `igel-ingo` are dropped. They were the three twisters written around a crew mascot, and no traditional English twister fits them. Their best scores (`zb.best`) simply no longer show.
- **No hyphenated words.** The scorer splits the text on spaces, and I could not check how a provider tokenises *seventy-seven*. So *Seventy-seven benevolent elephants* and *thirty-three thieves* were replaced.
- **Mascots.** No traditional twister is about a dachshund, hedgehog, hamster or frog, so no twister has `mascot`. Two have a `mini`: fish (*Fresh fried fish*) and snail (*Six slippery snails*).
- **Dialect take dropped.** The Bavarian take (`dialect`) is gone; there is none in English.
- **Level names** are now `Easy` / `Medium` / `Hard`. They are only displayed; no code keys off them.

### Sentence melody

- **Same five line types.** The families keep them: statement, yes/no, wh-, echo question (*You're coming tomorrow?*) and exclamation.
- **English yes/no rule.** It is "starts with a helping verb (are, do, can, have …)" instead of "verb in position 1".
- **Topics.** Each `topic` is now a one-word English name, and its en.json key follows it (`satzmelodie.topic.plans` …). The ten German topic keys are removed.
- **Teacher review needed.** The stress item *The jumper costs twenty pounds* asks *How much…?* and expects the stress on *twenty* (the German item had *zwanzig*). I think this is right, because "pounds" is given information. Please check this one.

### Drills by first language (the biggest call)

- **Why another item's file changed.** `aussprache-muttersprache.json`, `patterns.ts` and `fehler-nach-sprache.json` point at each other: an error's `drill`, a drill's `fehler`, a language's drill list. `pnpm check:aussprache` checks them. The German drills (ü/ö, ach-Laut, palatalisation) have no English meaning, so I could not change one side alone. I therefore rewrote **only the `area: "aussprache"` entries** of `fehler-nach-sprache.json` (36 lines). The other areas (spelling, grammar, words), the strengths and the quiz are still German and belong to `idioms-mistakes`.
- **Drill ids.**
  - Kept wherever the slot still names an English problem: `p-b`, `e-i-o-u`, `sp-st`, `h`, `auslaut`, `ende`, `endkonsonanten`, `cluster`, `verbendungen`, `r-l`, `kurz-lang` (= ship/sheep), `w-b` (= v/b, the same contrast as German w/b), `betonung`, `kein-e`, `s` (= the buzzing z).
  - New: `th`, `w-v`, `ae`.
  - Dropped: `ue-oe`, `ch`, `hart`, `g-h`, `z-w`.
  - Old `?drill=` URLs with a dropped id just show no drill. Drill ids are not stored in localStorage.
- **Error ids** were kept where the drill stayed. Where the sound changed, they got new English-named ids: `persisch-w-v`, `russisch-w-v`, `russisch-auslaut`, `ukrainisch-th`, `polnisch-w-v`, `polnisch-ae`, `franzoesisch-th`, `spanisch-kurz-lang`, `vietnamesisch-th`, `tagalog-ae`, `tagalog-th`. Removed:
  - `persisch-ue-oe` (Persian has /æ/; I gave it w/v instead);
  - `russisch-hart`, `polnisch-hart`, `ukrainisch-g-h`;
  - `ukrainisch-auslaut`: Ukrainian keeps final consonants voiced, so this is not an English problem for Ukrainian speakers;
  - `italienisch-doppelkonsonant`, `spanisch-ue-oe`, `vietnamesisch-ue-oe`, `tagalog-ue-oe`, `franzoesisch-ch`, `tagalog-ch`;
  - `englisch-z-w`.
  These ids were only `#anchors` on `/kultur/fehler`.
- **The `englisch` language slot** now has no drills and no pronunciation mistake: English speakers don't learn English pronunciation here. `idioms-mistakes` should make it German speakers (`deutsch`). The drills `w-v`, `th` and `auslaut` are ready for them. See content-plan §5.6.
- **Every pair is checked.** Each drill sentence contains one word of every minimal pair, as the check requires. Both words of a pair are real English words. The first word is the target.
- **`patterns.ts`** now models English words:
  - *sh, ch, th, ph, ck, ng, tch, dge* count as one consonant;
  - a silent final *e* is ignored;
  - a final *r, w, y, h* is not an ending that can be lost;
  - the function words are English;
  - the verb-ending rule looks at *-ed* and at *-s* after *he/she/it*.
  I ran a small test of 13 scored takes (*bike* ending lost, *sitreet*, *he work*, *hour* not flagged for h, …); all came out as intended.

## Checks run

- `node scripts/check-satzmelodie.mjs`: ok (10 families, 10 stress items, 7 rules, 67 audio lines).
- `node scripts/check-aussprache.mjs`: all links ok. Its one "problem" is that 177 drill texts have no mp3. That is expected: the German mp3s were never copied either, and this check is not part of the build (`check:content` / prebuild).
- Small node test of `patterns.ts` and `ausspracheTipps.js` with sample words (described above).

## Build

- **1st attempt** (`timeout 1500 pnpm build 2>&1 | tail -40`): the tool moves foreground commands to the background after 600 s. The tool's background limit then killed it after about 20 minutes, with no output, because `tail` buffers until the end.
- **2nd attempt** (same command, in the background with a 1,600 s tool limit):
  - Astro prerendered every page without an error ("✓ Completed in 16m 27s", page step 11m 59s).
  - Then it was still in the `base-language` integration (`astro:build:done`) when `timeout 1500` stopped it. `dist/satzmelodie/index.html` was rewritten at 04:29, after the page step ended at 04:27.
  - `sitemap`, `llms-txt` and postbuild (`check-paid-leak`, `check-lehrwerk-leak`) never ran: there is no `dist/sitemap-index.xml` or `dist/llms.txt`.
- **What this shows:** my changes compile and render. The built pages contain the new English content (*Red lorry, yellow lorry* on /zungenbrecher, *Are you coming tomorrow?* on /satzmelodie, *I'd like two cheese sandwiches* on /aussprache-check, *Short i or long ee* on /aussprache). But the full pipeline did not finish inside 1,500 s.
- **Why it is slow:** the prompt expects 2–4 minutes, while the page step alone took 12 minutes here. I can't tell whether the machine was busy (other sessions run in parallel; I could not list processes without approval) or whether something got slower. Nothing in this run touches the build integrations, and the files I changed are small data and lib files.
- **Edgar:** please run `pnpm build` once on a quiet machine. If it is green, tick `pronunciation` in automation/QUEUE.md (the content work itself is complete).

## Left open / for Edgar to review

- **Teacher review:** all of it is `reviewed: false` / unreviewed. Above all:
  - the per-language claims in `fehler-nach-sprache.json` (pronunciation entries only), e.g. Polish and Tagalog with /æ/, Vietnamese and Tagalog with th, Russian final devoicing;
  - the stress answer *twenty* in *The jumper costs twenty pounds*.
- **Audio:** no English recordings. The generator scripts (`scripts/generate-aussprache-check-audio.mjs`, `-zungenbrecher-`, `-satzmelodie-`, `-muttersprache-`) still carry German voice settings. They need English voices once a TTS provider is wired (`BACKEND.speech`).
- **German fallback text in JS:** a few `t(key, "German fallback")` calls in `ausspracheFuerDich.js`, `ausspracheCheckFuerDich.js` and the inline script of `satzmelodie.astro` still have German fallbacks. Their en.json keys exist and are English, so the page shows English. Only the fallback strings are German. Left for a UI sweep.
- **Not touched:** `/satzmelodie/pruefen` (a dev-only review sheet, still German), the German onomatopoeia comments, and the `/aussprache` lexicon trainer itself (vocabulary items).
- **Other runs:** `idioms-mistakes` owns the rest of `fehler-nach-sprache.json`, including the `englisch` → German-speakers slot.
