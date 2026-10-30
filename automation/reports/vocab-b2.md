# Run report: `vocab-b2`

Run: 2026-10-30 (one run, no earlier attempt). Branch `content`. Build green at the end
(`pnpm build`, 2,221 pages, postbuild checks ok). `node scripts/validate-lexicon.mjs`: 4,000
words, 0 errors, 0 warnings.

## What was done

| Commit | What |
|---|---|
| `09710f9` | `content/program.json`: English B2 level title (“Upper-intermediate vocabulary”), subtitle and the 14 planned module titles. B2 stays `status: "planned"` with no placed units, like B1. |
| `c914f0e` | **`src/content/lexicon/b2.json` is English**: 60 units × 25 words = 1,500, same unit ids and topic slugs, British English, conventions of content-plan §1.4 as set by `vocab-a1`…`vocab-b1`. German translations in `i18n/de.json`. Every entry keyed by an old German B2 id removed from all other sidecars (ar, es, fa … vi). Those files are now empty `{}`: they only ever held German-course glosses. `de-fill.json` and `de-syn.json` had no B2 entries. |
| `e8e26e1` | `public/i18n/en.json`: the 60 B2 deck headings (`ws.set.b2-*`) equal the new unit titles. The `ws.module.b2-*` group headings were already English and still fit. |
| `8e9cf4e` | `wort-bilder.json`: the 5 German B2 ids removed, 7 English B2 ids added (*trophy, castle, lung, yarn, vaccine, ballot, national park*; only emoji with a local OpenMoji SVG). The file now holds English ids only. |
| `e3b36f9` | `uebersetzungen/woerter-uk.json`: had no B2 entries; only its note updated. |
| `e6d450b` | `data/lernsets/` review export regenerated (`node scripts/extract-lernsets.mjs`). |
| `4d3eec2` | **Build fix** in `src/components/ArtikelPicker.astro` (see Decisions). |
| `c534aaa` | `docs/content-plan.md` §1.4/§5.2 and `i18n/README.md` record the B2 state. |

### The B2 units

Leadership & organisation · Markets & globalisation · Contracts & liability · Parliament & the
state · Social change & population · Climate policy & resources · Digital technology & security ·
Research methods & evidence · The press & public debate · University & degree study · Public
health & prevention · Behaviour & mental health · Refugees & belonging · The arts & heritage ·
Style & register · Urban development & housing · Conservation & land use · Investments &
personal wealth · Transport & infrastructure · Official procedures & appeals · Health and safety
& working patterns · Food production & safety · Clubs & organised sport · Family life & caring
for relatives · Equal chances in education · Negotiation & persuasion · Motivation & group
behaviour · Advertising & marketing · Energy & manufacturing · Starting a business & accounts ·
Patients' rights & care · Climate adaptation & emergencies · The rule of law & accountability ·
Social work & local support · Skilled migration & working abroad · Foreign policy &
international relations · Research ethics · Water & soil · Music & film · Parenting &
generations · Fashion & the textile industry · Forecasts & extreme weather · Identity & life
story · Moods & emotions · Retail & consumer protection · Movement & the body · Deadlines &
scheduling · Travel plans & things going wrong · Owning a home & repairs · Architecture &
heritage · Local government & elections · Science & the public · The economy & employment ·
Criminal justice & the courts · Waste & recycling · Exams & assessment · Automation & AI ·
Social media & online platforms · Handling conflict & meetings · Multilingualism & learning
languages.

The mix is 896 nouns, 356 verbs, 247 adjectives and 1 phrase (*work from home*).
- Of the nouns, 307 take `some`; 21 of those are plural-only.
- Of the verbs, 25 are separable phrasal verbs with `separable` and 50 have a dependent `prep`.

No B2 lemma repeats an A1, A2 or B1 lemma, and no lemma repeats inside B2. Both were checked by script.

## How it was made

Six writers drafted 10 related units each in parallel from one brief (`_tmp_b2v_brief.md`, not
committed). The German B2 units were used for their themes only. Related units went to the same
writer: law and politics, economy and money, environment, science and education, health and
family, media and culture. That split was meant to keep cross-unit duplicates down.

A merge script (`_tmp_b2v_build.mjs`) then checked:
- format, a/an, plurals and verb forms;
- definitions that give away their word, and commas in definitions;
- duplicates across units, and repeats of A1–B1 lemmas.

The writers could not run scripts, so the first check found a lot:
- 42 repeats of A1–B1 lemmas (*parliament, MP, refugee, jury* … are already B1);
- 119 duplicate pairs across units;
- 44 definitions that gave away their word.

I decided which unit keeps each duplicate. The default was the earlier unit, with 23 overrides where the later unit is the natural home (e.g. *accountability* → b2-33, *stamp duty/leasehold/freehold* → b2-49, *viral/clickbait/disinformation* → b2-58). Fix agents then replaced or rewrote every flagged line. I fixed the last nine collisions by hand, including the American *semester* → *open day*.

After that, three separate readers went through all 1,500 lines (IPA, forms, articles, definitions, examples, German, level, British usage) and changed 107 lines. Logs are in `_tmp_b2v_review1-3.txt`, not committed. Typical fixes:
- German: *plea* had become das Plädoyer and *nest egg* das Notgroschen.
- Countability: *sense of belonging* and *gig economy*.
- Definitions that still held their stem: *stepparent, payroll, billboard, timescale* and others.
- Doubtful claims about UK rules removed from examples: cabinet meeting days, the dissolution timing, the naturalisation period, euthanasia law.
- Examples that leaned on stereotypes about teenagers and salesmen.

I spot-checked about 150 IPA transcriptions and fixed one stress (*look up to*). The validator also caught *outplay* wrongly marked as a phrasal verb.

## Decisions

- **Same unit ids, topics and themes as the German B2.** The German units were about Germany.
  The English ones keep the theme and use the British reality instead: *hung parliament, backbencher, by-election, borough, barrister,
  magistrate, legal aid, leasehold, stamp duty, conveyancing, ISA, sole trader, VAT, zero-hours
  contract, sick note, pupil premium, grammar school, catchment area, weather warning, hosepipe
  ban, green belt, fly-tipping, wheelie bin, invigilator, mock exam*. German-only concepts were not translated (works agreement,
  Bürgergeld, notary appointment, building savings contract, rent cap, clock-face timetable).
  Some titles changed to fit English, for example b2-13 “Flucht & Teilhabe” → *Refugees & belonging*,
  b2-20 “Verwaltungsverfahren” → *Official procedures & appeals*, b2-57 → *Automation & AI*.
- **Unit titles in en.json changed** where the earlier translation of the German title didn't
  fit the new content. Some examples are *Skilled-worker immigration* → *Skilled migration & working abroad*
  and *Rule of law & oversight* → *The rule of law & accountability*.
- **program.json B2 stays “planned” with no units placed**, as with B1. Only the titles were translated.
- **German-only fields were dropped**: `grammar_anchor` (145), `ipaVariants`, `morphSource`, `aux`,
  `reflexive`. `pluralOnly` and `separable` are kept with their English meaning.
- **Ids: no suffix needed.** No German lexicon level is left (C1/C2 are empty), and no B2
  lemma repeats an A1–B1 lemma, so every id is the plain slug of the lemma.
- **18 ids exist in both the old German and the new English B2**: *delegation, norm,
  depression, trauma, nuance, regeneration, hygiene, influencer, transparent, diaspora,
  bilateral, neutral, frustration, reflex, petition, lobby, revision, viral*. Two of these have a different meaning:
  - **`revision`**: German *Revision* is an appeal on points of law; English *revision* is studying before an exam.
  - **`regeneration`**: German *Regeneration* is recovery after training; English *regeneration* is urban regeneration.

  German modules can't resolve their ids into English levels (`ENGLISH_LEVELS`), so this is low risk.
- **`rank: null` for all 1,500 words**, for the same reason as A1–B1: the `en_50k` download needs network. B2
  was the last level with ranks, so now **no word in the lexicon is ranked**. The frequency
  rounds are gone (`/wortschatz/haeufigkeit-*`, 46 pages: 2,221 instead of 2,267). The build
  then crashed in `/artikel`, because `ArtikelPicker.astro` read `freq.rounds[0]`. I added a guard: the
  „Nach Häufigkeit“ rail entry and pane are left out while there are no rounds, and come back
  by themselves once ranks exist. The client script already handled a missing chart.
- **Sidecars:** like A1–B1, only `de.json` has B2 entries (a German translation; nouns carry their article).
  The 20 other language files are now empty, and the UI drops a language tab unless every card has it.
- **Pictures:** 7 words only. Some candidates were left out as loose stand-ins (*statue* 🗽, *skull* 💀, *denim* 👖,
  *drone*, *robotics* 🦾). Five had no local SVG (*thread, hashtag, emoji, fist, hurricane*).

## Open / for Edgar

1. **Attach the English ranks** (needs network). This now matters more: all four levels are
   unranked, so `/wortschatz` has no frequency rounds and `/artikel` has no frequency view.
   Run `node scripts/attach-ranks.mjs a1` (then `a2`, `b1`, `b2`), followed by `node scripts/validate-lexicon.mjs`,
   `node scripts/haeufigste-woerter.mjs` and `node scripts/extract-lernsets.mjs`.
2. **Review the content.** All 1,500 words were drafted and cross-read by AI, and no human has read them yet. Worth a look:
   - **Level.** Some body, sport and family words are below B2. They are in because A1–B1 don't have them and the unit needs them: *lung, skull, rib, heel, palm, fist, jaw, calf, grandchild, sibling, captain, trophy, league, castle, ceiling, airline, crop, harvest*. Others are specialist but common in UK news: *hustings, hung parliament, backbencher, subsidence, conveyancing, abattoir, viva, pupil premium*.
   - **Plural-only choices:** *sanctions, values, roots, origins, minutes, lyrics,
     renewables, assets, overheads, remittances, damages, hustings*.
   - **Acronyms:** *ISA* (`an`, IPA ˈaɪsə), *VAT* and *GDP* (`some`, spelt-out IPA).
   - **German for UK-only things** (*pupil premium, ground rent, stamp duty, by-election,
     hustings, grammar school*) is approximate.
   - **Weaker unit fits:** *hardware* and *cloud computing* (b2-57), *marking* (b2-56),
     *lapse* (b2-23, membership lapsing), *trait* (b2-40).
3. **The `-en` ids in A1–B1** (`computer-en` … `allergen-en`) could lose the suffix now that no
   German level is left. Do it before real learner progress exists: SRS progress is keyed by id, and
   the sidecars and `wort-bilder.json` would need the same rename. I left it alone, because it is
   a cross-level rename beyond this item.
4. **`src/data/suche-seiten.json`** (the nav search's extra pages) still lists 99
   `/wortschatz/haeufigkeit-*` pages that no longer exist. Most were already gone after A1–B1. It is a
   snapshot built by `scripts/build-suche-seiten.mjs` against a running dev server, so re-run it
   after the ranks are attached (or now, to drop the dead links).
5. **The card UI is still German for English words**, as already noted by `vocab-a2`/`b1`: the
   “trennbares Verb” chip and the German part-of-speech labels. This now affects every level.
6. **German modules that read the lexicon now find no German words at all.** The profession
   decks (`english-for-work`), `hochstapler/themen.json`, `artikel-haeufigkeit.json`,
   `synonyme.json`, `wortfallen.json`, `kultur-insider.json`, `wortgeschichte/*`, and the
   der/die/das games (`/artikel`, Nussnacht, Bruno Kart, domino, worksheets) are affected. The build is fine (missing ids are skipped,
   pools are empty), and each is handled by its own queue item (`games`, `teachers`,
   `english-for-work`, `cleanup`). `de-fill.json`/`de-syn.json` can go in `cleanup`.
