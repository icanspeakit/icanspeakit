# Translations of the lexicon

> **Spanish levels (since 2026-11-04, `vocab-a1`).** A level whose nouns carry `el` / `la` is
> Spanish (`SPANISH_LEVELS` in `src/lib/lexicon.js`; A1, A2, B1 and B2 so far). For those words every sidecar is
> **Spanish → that language**, written with the Spanish word in front of the writer, never from
> the English gloss: `de.json` (nouns with their article, „das Haus“), `fr.json`, `pt.json`
> (European Portuguese: *comboio, autocarro, telemóvel*, because the course's Portuguese readers
> live in Europe) and `it.json`. Status: machine draft, no native speaker has reviewed them.
> `scripts/lexicon-import.mjs` writes them. `de` is joined as `deHint` and shown as the German
> tab; `fr`, `pt`, `it` appear once their `ui-lang-*` item registers the language for `cards`
> with `fetch: true` (`src/lib/glossen.js` reads the file by name). A level still English keeps
> its German glosses keyed by English ids, until its `vocab-*` item runs. `es.json` is empty and
> `cleanup` deletes it; the other language files stay empty until someone can write them reliably.
>
> The rest of this file describes the German-course setup; no level uses it any more.

One file per language, `{ "<word id>": "<translation>" }`, keyed by the `id` of a word in
`src/content/lexicon/<level>.json`. `en` is **not** here: it ships inline with the word,
because it is part of how the lexicon was compiled.

## Why a sidecar and not another field on the word

The word records are sourced — gender, plural, verb forms and IPA each came from a named
source and are checked against it. These glosses are not: they are a translation of the
lemma, written to make the flashcard trainer usable for learners who do not read English.
Mixing the two in one file would make "sourced" mean less than it does today, and would
make a corrected translation land in the same diff as morphology it did not touch.

A sidecar also means a language can be half-finished without breaking anything: a word
with no entry simply has no translation, and `langsIn()` in `src/lib/lexicon.js` drops a
language tab unless *every* card in the deck has it — so the trainer never offers a
language and then shows "Übersetzung folgt" on the third card.

## Adding to them

`node scripts/merge-translations.mjs <lang> <file.tsv>` — the TSV is `id<TAB>translation`,
one per line. Re-running with the same id overwrites; ids the lexicon does not know are
reported and skipped, which is the check that catches a drifted or misspelled key.

## `de.json` — German explanations, not a translation

An explanation in simple German, keyed by word id like the others. `lexicon.js` joins it as
`deHint` and keeps it out of `TRANSLATION_LANGS`; the flashcard trainer offers it as the
„Auf Deutsch“ tab (its face is called „Erklärung“), which appears on a deck once every card
has one (`langsOf()` in `lexicon.js`). All 4,000 words A1–B2 have one, so every Lernset up to
B2 has the tab.

Since 2026-10-21 an explanation is always a whole sentence: capital first letter, a finite
verb, a full stop; 6 to 14 words; simple German at the word's level (A1 very simple, B2 may
use more). Synonyms and opposites go into the sentence („Der Zug fährt los und verlässt den
Bahnhof.“ for *abfahren*), never as a label („Gegenteil: ankommen“). It must never contain the
word itself, its stem or its forms, not even inside a longer word: the card hides the word.
No dashes, arrows, brackets; no two words of one Lernset share an explanation.
`node scripts/check-erklaerungen.mjs` (`npm run check:erklaerungen`) checks all of this, and
`--file drafts.tsv` checks new drafts before they are merged.

The gap sentences („Die Wohnung ist klein, … schön.“) are the one exception and stay as they
are: `de-fill.json` holds what goes in the gap, and the card shows and reads them solved.

History: A1 written 2026-09-30, A2 2026-10-07 (then partly fragments and bare synonyms);
on 2026-10-21 the 646 A1/A2 entries that were not sentences were rewritten, and B1 (1,150
words) and B2 (1,500 words) were written new. Status: machine draft, not reviewed by a
teacher yet.

Audio: `node --env-file=.env.local scripts/generate-satz-audio.mjs --only erklaerung` voices
every explanation that is a sentence (not the gap sentences) into
`public/audio/erklaerung/<satzSlug>.mp3`; the card shows its speaker only where the file
exists. Changing an explanation means a new file name, so re-run the generator after edits.

## `de-syn.json` — synonyms

Real everyday synonyms per word id, as an array (nouns with their article: `"abfall": ["der Müll"]`).
`lexicon.js` joins them as `syn`; the flashcard shows them as „oder auch: …“ on the German side,
the Wortliste and the print sheet list them, and the live quiz's Synonyme mode asks them for a
chosen Lernset. A1 and A2 so far (2026-10-07), machine draft, not yet reviewed. Only words that
can stand in for each other in an everyday sentence — no near-synonyms, no umbrella terms.

## `uk.json` — Ukrainisch

All 4,000 words, added 2026-09-30 so Ukrainian learners are never sent to the Russian tab.
Machine draft (not yet reviewed by a native speaker), written from the German word with the
English and Russian glosses only to pin down the sense; German institutions without a
Ukrainian counterpart (Bürgergeld, Minijob, Ordnungsamt …) are described, not calqued.
