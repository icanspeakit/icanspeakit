# Run report: `vocab-b1`

Run: 2026-10-30 (one run, no earlier attempt). Branch `content`. Build green at the end
(`pnpm build`, 2,267 pages, postbuild checks ok). `node scripts/validate-lexicon.mjs`: 0 errors,
0 warnings.

## What was done

| Commit | What |
|---|---|
| `dc0058a` | `content/program.json`: English B1 level title (“Intermediate vocabulary”), subtitle and the 15 planned module titles. B1 stays `status: "planned"` with no placed units, as before (see Decisions). |
| `14c54ec` | **`src/content/lexicon/b1.json` is English**: 46 units × 25 words = 1,150, same unit ids and topic slugs, British English, the conventions of content-plan §1.4 as set by `vocab-a1`/`vocab-a2`. German translations in `i18n/de.json`. Every entry keyed by an old German B1 id removed from all other sidecars (ar, es, fa … vi). `de-fill.json` and `de-syn.json` had no B1 entries. |
| `f6c19f2` | `public/i18n/en.json`: the 46 B1 deck headings (`ws.set.b1-*`) equal the new unit titles. The `ws.module.b1-*` headings (the topic groups from `BEREICHE` in `src/lib/lernsets.js`) were already English and still fit. |
| `49151ff` | `wort-bilder.json`: the 44 German B1 ids removed, 35 English B1 ids added (only emoji that already have a local OpenMoji SVG). German B2+ ids stay. |
| `9705778` | One definition fix (*tie*). |
| `9b38f47` | `uebersetzungen/woerter-uk.json`: 2 Ukrainian glosses moved to the English B1 id with the same meaning (*thought*, *rise*); 4 without a B1 match dropped (maschine, geraet, buchstabe, einpacken). |
| `dc2e0fa` | `data/lernsets/` review export regenerated (`node scripts/extract-lernsets.mjs`). |
| `7c6eb0a` | `docs/content-plan.md` §1.4/§5.2 and `i18n/README.md` record the B1 state (ids, ranks, pictures). |

### The B1 units

Employment rights & leaving a job · Health & healthcare · Renting & tenants' rights · Visas &
official documents · Education & further training · Environment & energy · Money & finances ·
Roads & traffic · Media & the news · Conversation & discussion · Society & community · Law &
contracts · Technology & digital life · Free time & clubs · Travel & journeys · Diet & food
shopping · Moving to a new country · Politics & government · The economy & the job market ·
Culture & traditions · Thoughts & feelings · Body & movement · Family & bringing up children ·
Shopping & consumer rights · Town & neighbourhood · Nature & landscape · Weather & climate ·
Language & learning · Clothes & style · Time & planning · Science & research · Working life &
career · Hospital & care · Furnishing a home & household bills · Applications & benefits ·
School & qualifications · Budgeting & saving · Road safety · Information & trust · Conflict &
agreement · Volunteering & helping others · Police & crime · Tools & the workshop · Sport & the
outdoors · Directions & finding your way · Eating out.

Mix: 732 nouns (137 uncountable with `some`, 27 plural-only), 265 verbs (29 phrasal verbs with
`separable`), 150 adjectives, 3 phrases (*give notice*, *at short notice*, *in advance*). No B1
lemma repeats an A1/A2 lemma (checked by script, including near-repeats like *traffic light* vs
A1 *traffic lights*).

## How it was made

Five writers drafted the units in parallel from one brief (`_tmp_b1v_brief.md`, not committed),
using the German B1 units only for their themes. A merge script then checked the format, a/an,
plurals, verb forms, definitions that give away their word, duplicates across units and repeats
of A1/A2. 92 cross-unit duplicates and 11 A1/A2 repeats were replaced, and 31 definitions were
rewritten. Then two separate readers went through every line (IPA, forms, articles,
definitions, examples, German) and fixed 35 lines. Examples include *minimum wage* → uncountable,
*frost* → uncountable, *academic* not gradable, an American “emergency room” → A&E, and two
examples that leaned on national stereotypes. I spot-checked about 130 IPA transcriptions
myself and found no errors.

## Decisions

- **Same unit ids, topics and themes as the German B1.** The German units were about life in
  Germany. The English ones keep the theme and use the British reality: *notice period*,
  *redundancy*, *employment tribunal*, *council tax*, *Universal Credit*, *GP*, *A&E*, *MOT*,
  *sixth form*, *allotment*, *letting agent*, *level crossing*. German-only concepts (works
  council, rent index, Bürgeramt) were not translated. Titles changed where the German one
  didn't fit English (b1-04 “Behörden & Aufenthalt” → *Visas & official documents*, b1-17
  “Ankommen & Integration” → *Moving to a new country*, b1-39 → *Information & trust*).
- **The overlapping German units stay separate but were given distinct angles**: b1-02 health
  vs b1-33 hospital & care, b1-08 roads & traffic vs b1-38 road safety, b1-06 environment &
  energy vs b1-34 furnishing & household bills.
- **program.json B1 stays “planned” with no units placed.** The picker groups B1 by topic
  (`BEREICHE` in `lernsets.js`), and placing 46 units into modules would be a course-structure
  decision beyond this item. Only the titles were translated.
- **Fields of the German B1 that A1/A2 don't use were dropped**: `grammar_anchor` (90 words),
  `ipaVariants`, `morphSource`, `aux`, `reflexive`. They pointed at German grammar and German
  sources. The validator only checks them when present, and nothing outside the validator and
  the German Berufe data reads them.
- **Ids.** Slug of the lemma. Three slugs are still used by German B2+ words, so they got `-en`:
  `global-en`, `promotion-en`, `allergen-en`. A repeated spelling as another word got a suffix:
  `live-adj` (*a live broadcast*, A1 has *live* the verb), `make-up-verb` (*to become friends
  again*, A2 has *make-up* the noun), `volunteer-verb` (the noun *volunteer* is in the same unit).
- **19 ids exist in both the old German and the new English B1** (*journalist, podcast, legal,
  software, inflation, experiment, buffet …*). The meaning is the same except for **`argument`**
  (German *Argument* = a point in a debate, English *argument* = a quarrel). German modules can't
  resolve their ids into English levels (`ENGLISH_LEVELS`), so this is low risk. Still, it's
  worth a look in the module items that own `synonyme.json`, `wortfallen.json` and the games.
- **`rank: null` for all 1,150 words**, same reason as A1/A2 (the `en_50k` download needs network).
  As a result, the B1 words are out of the frequency rounds, and the build has 2,267 pages instead
  of 2,339. The units themselves are complete.
- **Sidecars:** like A1/A2, only `de.json` has B1 entries (German translation, nouns with
  article).
- **Pictures:** 35 concrete words (tent-type things, tools, clothes, *wheelchair*, *ferry*, *lorry*
  …). Left out: stand-ins that could mislead (*basket* 🧺 is a laundry basket, *thunder* would
  repeat *thunderstorm*), and 10 emoji whose OpenMoji SVG isn't local (microscope, robot,
  crutches, x-ray, lightning, rainbow, helmet, tape measure, zip, button).

## Open / for Edgar

1. **Attach the English ranks** (needs network), now for three levels:
   `node scripts/attach-ranks.mjs a1`, `… a2`, `… b1`, then `node scripts/validate-lexicon.mjs`,
   `node scripts/haeufigste-woerter.mjs`, `node scripts/extract-lernsets.mjs`.
2. **Review the content**: 1,150 words, drafted and cross-read by AI, with no human reader yet.
   Worth a look:
   - level: some words are probably B2 but useful in the UK for their unit (*constituency,
     biometric, consulate, worship, proverb, arrears, inventory, enforce, dissertation, tax
     return, caseworker, misinformation, allergen-en, bypass*);
   - plural-only choices: *media*, *criteria*, *utilities*, *resources*, *emissions*, *glasses*,
     *trainers*, *directions*, *customs*, *terms and conditions*;
   - *round trip* (British English often says *return trip*); *butcher's* with plural *butchers*;
   - German translations of UK-only things (*sixth form*, *council tax*, *Universal Credit*) are
     approximations.
3. **Card UI still German for English words** (same as noted by `vocab-a2`): the phrasal-verb chip
   (“trennbares Verb”) and the German part-of-speech labels. These now affect A1–B1.
4. **Modules that still use German B1 ids** (each handled by its own queue item, and the build is
   fine because missing ids are skipped): profession decks (`english-for-work`, which loses its
   B1 refs now), `hochstapler/themen.json`, `artikel-haeufigkeit.json`, `synonyme.json`,
   `wortfallen.json`, `kultur-insider.json`, `wortgeschichte/*`.
5. The `-en` ids (A1–B1) can lose the suffix once B2 is English, before real learner progress
   exists (SRS progress is keyed by id).
