# Run report: `vocab-a2`

Run: 2026-10-30 (one run, no earlier attempt). Branch `content`. Build green at the end
(`pnpm build`, 2,339 pages, postbuild checks ok). `node scripts/validate-lexicon.mjs`: 0 errors,
0 warnings.

## What was done

| Commit | What |
|---|---|
| `92b9e46` | **`src/content/lexicon/a2.json` is English**: 28 units × 25 words = 700, same unit ids and topics, British English, the conventions of content-plan §1.4 as set by `vocab-a1`. German translations in `i18n/de.json`. Every entry keyed by an old German A2 id removed from all other sidecars (ar, es, fa … vi, `de-fill.json`, `de-syn.json`). |
| `20de8f8` | `content/program.json`: English A2 level title (“Elementary vocabulary”), subtitle, 9 module titles, 28 unit titles. |
| `6c9745d` | `wort-bilder.json`: the 108 German A2 ids removed, 83 English A2 ids added (only emoji that already have a local OpenMoji SVG). German B1+ ids stay. |
| `f198c90` | `uebersetzungen/woerter-uk.json`: 5 Ukrainian glosses moved to the English A2 id with the same meaning (invite, recommend, order, move out, tomato); 8 without an A2 match dropped (abnehmen, mitkommen, automat, reservieren, einschlafen, studieren, teilnehmen, interessieren). |
| `f7613ba`, `dfc44af` | `data/lernsets/` review export regenerated (`node scripts/extract-lernsets.mjs`). |
| `85495d4` | `public/i18n/en.json`: the A2 deck and module headings (`ws.set.a2-*`, `ws.module.a2-*`) match the new titles. They were English translations of the German titles, and the page heading reads them. |
| `45217bc` | **A1 fix found on the way:** 10 A1 headings in `en.json` still described the German units (e.g. “Person & introductions” for a1-01). Now equal to `program.json`. |
| `9749b80` | `docs/content-plan.md` §1.4/§5.2 and `i18n/README.md` record the A2 state (ids, ranks, pictures). |
| `04fce1c` | 19 definitions rewritten so they don't give away their own word (*noisy*, *salty*, *sender*, *singer*, *car insurance* …). |

### The A2 units

Finding a flat & renting · Neighbours & living together · Housework & repairs · Food & cooking ·
At the restaurant · Health & illness · At the chemist's: medicine · Personal care · Applying for
a job & your CV · At work: tasks & colleagues · Training & courses · Bank & money · Post office &
official tasks · Insurance & paperwork · Phone calls & email · The internet & devices · Complaints
& returns · Public transport & tickets · Cars & driving · Travel: hotels & booking ·
Celebrations & festivals · Sport & exercise · Music, film & books · Character & personality ·
Feelings & opinions · Environment & recycling · Phrasal verbs · Useful phrases: requests,
suggestions, appointments.

Mix: 423 nouns, 159 verbs (incl. 25 phrasal verbs in a2-27 and 19 more in the topic units),
84 adjectives, 6 adverbs, 1 pronoun (*each other*), 27 phrases (*on time*, *cheers* and the 25
phrases of a2-28). No word repeats an A1 lemma (checked by the build script); the A2 units build
on A1 (*bill*, *deposit*, *landlord* after A1 *rent*, *flat*, *neighbour*).

## Decisions

- **Same unit ids, topics and themes as the German A2.** The German units were about everyday
  life in Germany; the English ones keep the theme and use the British version (*council*,
  *GP*, *surgery*, *job centre*, *bank holiday*, *recorded delivery*, *bottle bank*). Titles
  that only made sense for German changed: a2-27 “Trennbare Verben” → *Phrasal verbs* (matches
  the grammar slot `trennbare-verben` → phrasal verbs in content-plan §2), a2-14
  “Versicherungen” → *Insurance & paperwork* (insurance alone is too thin at A2; forms, *tick*,
  *capital letters*, *witness* fit there), a2-21 “Feste & Feiertage” → *Celebrations &
  festivals*.
- **a2-28 keeps the German shape of its phrase entries**: `lemma`, `pos: "phrase"`, `en`, `note`,
  `rank`, `audio`; no IPA, no example, like the German data. `en` = what the phrase does in
  simple English, `note` = a usage tip (*“I'm afraid” makes a no softer. It does not mean that you
  are scared.*), `de.json` = German equivalent.
- **Ids.** Slug of the lemma. Nine slugs are still used by German B1/B2 words, so they got
  `-en`: `snack-en`, `vegan-en`, `virus-en`, `interview-en`, `budget-en`, `sender-en`, `ring-en`,
  `fit-en`, `fair-en`. A word that repeats an A1 lemma in another part of speech got a suffix,
  like A1 did: `break-noun`, `order-noun`, `text-verb`, `park-verb`, `train-verb`, `dry-verb`,
  `fine-noun`, `play-noun`, `fit-adj`, `patient-adj`, `post-online`, `university-degree`
  (*degree* the temperature unit is A1).
- **16 ids exist in both the old German and the new English A2** (*hammer, laptop, team, app,
  yoga, band, recycling …*). I checked each: the meaning is the same, so a German module that
  still points at one of them (and `ENGLISH_LEVELS` already stops the profession decks from
  doing so) cannot show a word with a different meaning.
- **`rank: null` for all 700 words**, same reason as A1 (the `en_50k` download needs network
  approval, which an unattended run can't get). Effect: the A2 words are out of the “by
  frequency” rounds; the build has 59 rounds left and 48 fewer pages (2,339 instead of 2,387).
  The units themselves are complete.
- **Sidecars:** like A1, only `de.json` has A2 entries (German translation, nouns with article).
  The other languages have none, so no stale German-based gloss is left. `de-fill.json` is now
  only its `_note`; it and `de-syn.json` go when the last German level is migrated.
- **Pictures:** 11 more A2 words would have a good emoji (chips, purse, tap, hole, cheers,
  tennis, basketball, cycling, skiing, sailing, drums), but their OpenMoji SVG is not in
  `public/img/openmoji/` and fetching it needs network. Left out rather than shown broken.

## Open / for Edgar

1. **Attach the English ranks** (needs network), now for both levels:
   `node scripts/attach-ranks.mjs a1`, `node scripts/attach-ranks.mjs a2`, then
   `node scripts/validate-lexicon.mjs`, `node scripts/haeufigste-woerter.mjs`,
   `node scripts/extract-lernsets.mjs`. Multi-word lemmas stay `null`.
2. **Review the content**: 700 words written by hand without a second reader. Worth a look:
   - uncountable/plural-only choices: *some tax*, *some fault* (“my fault”), *some staff*,
     *some deodorant*, *some lipstick*, *some cream*, *some savings*, *some regards*,
     *some congratulations*, *some chips*;
   - the a2-28 phrase notes (usage tips, written for learners, slightly longer than the German ones);
   - `ipa` is authored (SSB), e.g. *garage* ˈɡærɑːʒ (ˈɡærɪdʒ is also common).
3. **Optional pictures:** `node scripts/fetch-openmoji.mjs` (network) for the 11 emoji listed
   above, then add them to `wort-bilder.json`.
4. **Card UI is still German for English words** (not a vocab-data problem, so not changed here):
   the flashcard chip in `src/lib/wortschatz-app.js` calls an English phrasal verb (`separable:
   true`) a “trennbares Verb” and says “Der Anfang steht im Satz am Ende.”, and the part-of-speech
   labels are German on purpose (“Nomen”, “Verb”). This affects A1 and A2. Suggest a small UI item:
   English labels for English levels, and a phrasal-verb line such as “A verb + a small word
   (up, out, off). Together they have their own meaning.”
5. **Modules that still use German A2 ids** (handled by their own queue items; the build is fine
   because missing ids are skipped): profession decks (`english-for-work`; they lose their
   A2 refs now, see `scripts/check-berufe.mjs`), `hochstapler/themen.json` and
   `artikel-haeufigkeit.json` (`games`), `synonyme.json`, `wortfallen.json`, `kultur-insider.json`
   (`idioms-mistakes`, `culture`), `wortgeschichte/*` (`word-stories`).
6. Ids with `-en` can lose the suffix once B1/B2 are English, before real learner progress
   exists (SRS progress is keyed by id).
