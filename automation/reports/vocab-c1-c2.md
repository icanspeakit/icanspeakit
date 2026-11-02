# Run report: `vocab-c1-c2`

Run: 2026-11-02 (one run, no earlier attempt). Branch `content`. Build green at the end
(`pnpm build`, 1,758 pages, postbuild checks ok). `node scripts/validate-lexicon.mjs`: 5,000
words, 200 units, 0 errors, 0 warnings.

## What was done

| Commit | What |
|---|---|
| `c425276` | `content/program.json`: C1/C2 level title, subtitle and all 26 planned module titles in English. German-only modules were mapped to English counterparts (see Decisions). Both levels stay `status: "planned"` with no placed units, like B1/B2. |
| `e3ae195` | `public/i18n/en.json`: deck headings `ws.set.c1-01…c2-16`, group names `ws.module.c1-*`/`c2-*` (same Bereiche as B2), and `level.name.C1` “Refining” / `level.name.C2` “Mastering” (the picker shows them once a level is live). `src/lib/unitIcon.js`: one icon per C1/C2 set, no clash inside a group. `src/lib/lernsetKeywords.js`: C1/C2 sets added to the nav search themes, plus 9 new themes (idioms, register/slang, word building/loanwords, phrasal verbs, argument, character/praise/criticism, confusables, movement, psychology). |
| `6c6032f` | **`src/content/lexicon/c1.json` and `c2.json` are English.** Both were empty in the scaffold. C1 has 24 units and C2 has 16, each of 25 words, so 1,000 words in all, in British English with the schema of content-plan §1.4. The German translations are in `i18n/de.json` (1,000 new keys, sorted like the rest). |
| `811b864` | `data/lernsets/` review export regenerated (`node scripts/extract-lernsets.mjs`; new `lernsets.c1.json`, `lernsets.c2.json`). |
| `ec7749e` | `docs/content-plan.md` §1.1, §1.4, §5.2, §9 and `lexicon/i18n/README.md` record the C1/C2 state. |

### The units

**C1:**
- c1-01 Argument & reasoning
- c1-02 Academic writing & research
- c1-03 Linking words & discourse markers
- c1-04 Formal & informal register
- c1-05 Word building: prefixes & suffixes
- c1-06 Phrasal verbs for discussion & work
- c1-07 Idioms & fixed expressions
- c1-08 Cause, change & trends
- c1-09 Business strategy & corporate life
- c1-10 Finance & the economy
- c1-11 Management & the workplace
- c1-12 Law & regulation
- c1-13 Government & policy-making
- c1-14 Crime & security
- c1-15 Medicine & treatment
- c1-16 The mind & behaviour
- c1-17 Inequality & social issues
- c1-18 Character & personality
- c1-19 Attitudes & emotions
- c1-20 The arts & literary criticism
- c1-21 Energy & environmental policy
- c1-22 Technology & computing
- c1-23 Journalism & the media
- c1-24 Communication & persuasion

**C2:**
- c2-01 Idioms & proverbs
- c2-02 Rhetoric & style
- c2-03 Literary & elevated words
- c2-04 Loanwords in English
- c2-05 Philosophy & ideas
- c2-06 Informal British English
- c2-07 Formal & legal language
- c2-08 Power, history & conflict
- c2-09 Describing people precisely
- c2-10 Praise & criticism
- c2-11 Abstract qualities
- c2-12 Ways of speaking
- c2-13 Ways of moving & looking
- c2-14 Economics & high finance
- c2-15 The natural world & science
- c2-16 Easily confused words

**Word mix:**

| | C1 (600) | C2 (400) |
|---|---|---|
| Nouns | 255 | 135 |
| Verbs | 164 | 127 |
| Adjectives | 128 | 105 |
| Phrases | 29 | 28 |
| Adverbs | 12 | 4 |
| Conjunctions | 6 | 0 |
| Prepositions | 6 | 1 |

| | C1 | C2 |
|---|---|---|
| Nouns with `some` | 78 | 56 |
| Plural-only nouns | 2 | 1 |
| Separable phrasal verbs | 17 | 2 |
| Verbs with a dependent `prep` | 19 | 27 |

No C1/C2 lemma or id repeats an A1–B2 one, and no lemma repeats inside C1/C2. Both were checked by script.

## How it was made

1. Eight writers drafted five related units each in parallel, all from one brief (`_tmp_cv_brief.md`, not committed). Each writer checked its lemmas against a list of all A1–B2 lemmas.
2. A merge script (`_tmp_cv_build.mjs`, not committed) checked:
   - format, a/an/some, plurals and verb forms;
   - phrasal-verb particles in the forms;
   - commas in definitions and definitions that give away their stem;
   - examples that contain the word;
   - US spellings;
   - duplicates within C1/C2 and against A1–B2.
3. The first check found 43 duplicates between units and 3 ids already taken in A1–B2 (*rota*, *carbon neutral*, *tip-off*). I decided which unit keeps each word, usually the one where it fits the theme best. For example *prescribe*, *allude*, *apprise*, *depreciate* and *illicit* stay in c2-16 (confusable pairs), and *melancholy* and *yearn* stay in c1-19.
4. Four separate reviewers then read all 1,000 lines against a checklist (level, definition, example, grammar data, IPA, German, British usage) and made the replacements in place. Their changes went beyond the duplicates:
   - Words that were too easy were swapped out: *database, spreadsheet, processor, user-friendly, antibiotic*, and *organism, flora, fauna, prey, carnivore, camouflage* in C2.
   - Words not used in the UK were swapped out: *federal, federation, municipality, folks*.
   - *embezzle* and *launder* were swapped out because they repeat the meaning of c1-14.
   - The German was corrected in a few places.
5. I fixed the last five problems by hand:
   - *pursuant to* had ended up in two units; c1-04 got *erstwhile* instead.
   - *plug-in*'s id is taken in A2; it became *workaround*.
   - *acclaim* sits next to the existing *acclaimed*; it became *excoriate*.
   - *languor* was a third word on one stem in c2-03, with *languid* and *languish*; it became *halcyon*.
   - *municipality* became *rubber-stamp*.
   - Two definitions gave away their word and were reworded (*writ*, *money laundering*).
6. I spot-read about 110 lines across all units (every 9th word), checking IPA, forms, examples and facts. Those checks are separate from the 1,000-line review in step 4.

## Decisions

- **Size: 1,000 words, not the 2,300 + 1,500 in `program.json`'s `targetWords`.** The item asks for quality over quantity. 40 well-themed units at 25 words keep the deck format of A1–B2. `targetWords` is left as it was, because it is a plan figure and not shown as a promise.
- **New unit ids (`c1-01`…, `c2-01`…).** There were no German C1/C2 units to keep ids from. The themes follow the German `program.json` module plan where an English counterpart exists.
- **German-only modules were mapped to English counterparts:**
  - *Partikeln & Abtönung* → Phrasal verbs.
  - *Regionale Varianten (DE/AT/CH)* → Varieties of English (UK, US, Ireland, Australia). There are no units for this yet.
  - *Anglizismen & Fremdwörter* → Loanwords in English.
  - *Nominalstil & Funktionsverbgefüge* → Formal style & noun phrases.
- **Units are not placed into `program.json` modules**, the same as B1/B2. They are grouped by their topic slugs (`lernsets.js` Bereiche), so the picker shows C1/C2 under the same English group names as B2. All 40 sets landed in named groups and none in “More sets”.
- **Topics:** a life-area slug comes first, because that slug decides the group. The C1-style slugs (`konnektoren`, `idiomatik`, `stilebene`, `wortbildung`, `fachsprache`, `person`, `gefuehle`) come second.
- **Idioms and proverbs are `pos: "phrase"`** with the article in the lemma where English uses it (*a blessing in disguise*, *the elephant in the room*). The ids are their slugs (`a-blessing-in-disguise`).
- **Accented loanwords** keep the accent in the lemma (*déjà vu, blasé, doppelgänger*). They get an explicit `id`/`audio` without it (`deja-vu`, `blase`, `doppelganger`), because `slugify` would turn é into a hyphen and ä into “ae”.
- **Register tags** begin the definition: “(formal)”, “(informal)”, “(literary)”, “(disapproving)”. This matters at C1/C2, and the card has no separate register field.
- **`rank: null`** for all 1,000 words, as for A1–B2: the `en_50k` list needs network.
- **Sidecars:** only `de.json`, as for A1–B2. The other language files stay empty.
- **No pictures** in `wort-bilder.json` for C1/C2. The words are abstract, and a loose emoji stand-in would mislead.

## Open / for Edgar

1. **Review the content.** All 1,000 words were drafted and cross-read by AI, and no human has read them yet. Worth a look:
   - **Level borderline (maybe B2):** *spike, plateau, lull, tumour, transplant, implication, exclusive, shrewd, naive, cynical, glance, gaze, glare, mutter, murmur, grumble, serene, uninterested, untapped, centralised*.
   - **Specialist or dated:** *lien, writ, affidavit, quango, abode* (tagged formal/humorous), *naff, dosh, miffed*.
   - **US-leaning:** *indict* (kept with a Crown Court example), *on the back burner*.
   - **Close pairs inside one unit**, separated by definition and example: *glare/glower*, *repress/suppress*, *solvency/insolvency*, *precipitate/precipitous*, *axiom/axiomatic*, *privilege/privileged*, *devolve/devolution*.
   - **c2-16** has *flaunt* without *flout*, because *flout* is already in B2.
2. **IPA:** written by hand, and I spot-checked about 110 entries. A full IPA pass against a dictionary would be worth doing before audio is generated.
3. **Ranks:** run `node scripts/attach-ranks.mjs c1 c2` (with network), together with A1–B2 (see the `vocab-b2` report).
4. **`program.json` placement:** C1/C2 are “planned” with English module titles and no units. To show the course structure instead of the topic groups, place units into the modules. Not every module has units, for example *Varieties of English* and *Text types*.
5. **The card UI is still German for English words**: part-of-speech labels and the “trennbares Verb” chip. This is already noted in the A2–B2 reports.
6. **`wusstest-du.json`** (“Did you know” facts per set) has no C1/C2 entries. The sets work without them.
