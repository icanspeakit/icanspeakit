# Content migration queue

One item per scheduled run (automation/run-next.ps1), top to bottom. A run takes the first
unchecked item, works on it on the `content` branch and ticks it when finished. To skip an
item, tick it by hand; to redo one, untick it. Add, remove or reorder items freely.

- [x] `content-plan`: Write docs/content-plan.md, the map from every German module to its English-course equivalent (levels, exam targets, slugs to rename, modules to drop). Every later run follows it.
- [x] `ui-components`: English page titles, descriptions and leftover German UI text in src/layouts and src/components (not the data). New strings go into public/i18n/en.json.
- [x] `ui-pages-a-l`: Same for src/pages, files and folders starting a–l.
- [x] `ui-pages-m-z`: Same for src/pages, files and folders starting m–z, plus the legal pages.
- [x] `placement-test`: Placement test (src/data/einstufung.json) as an English test, A1–C1.
- [x] `grammar-a1`: A1 grammar topics (src/data/grammatik, level A1) as English grammar topics, same schema.
- [x] `grammar-a2`: A2 grammar topics.
- [x] `grammar-b1`: B1 grammar topics.
- [x] `grammar-b2`: B2 grammar topics.
- [x] `grammar-c1`: C1 grammar topics (src/paid/grammatik included).
- [x] `grammar-structure`: Grammar order, syllabus, related topics, reference tables (grammatik.json, grammatik-lehrplan.json, grammatik-verwandt.json, nachschlagen/).
- [x] `beginner-path`: The "Einfach lernen" beginner path (einfach-pfad.json) for English.
- [x] `beginner-path-ui`: The /einfach screens in English: src/lib/einfach-view.js (Bruno's de/en lines, buttons, headings, placement screen, postcard header), einfach-app.js (placement sentences, "Fehler wiederholen"), einfach-content.js ("Tipp:", "Es heißt:", speaking hint), noscript text in src/pages/einfach.astro; docs/easy-mode-tier1-v1.md recipe for English units (split off by `beginner-path`, see its report).
- [x] `grammar-start-book`: The free starter grammar book (src/data/grammatik-start/*, scripts/generate-grammatik-start-pdf.mjs) as "English Grammar Start A1–B1": English base content (examples, tables, exercises), generator reads it instead of de.json, explanations in the help languages only where reliable (see content-plan §3 side files; split off by `grammar-structure`).
- [x] `vocab-a1`: Lexicon and word decks, A1 (src/content/lexicon, wortschatz.json).
- [x] `vocab-a2`: Lexicon and word decks, A2.
- [x] `vocab-b1`: Lexicon and word decks, B1.
- [x] `vocab-b2`: Lexicon and word decks, B2.
- [x] `listening`: Listening texts (hoeren.json): English scripts (audio comes later, with a TTS provider).
- [x] `reading-writing`: Reading and writing tasks (lesen.json, schreiben pages).
- [x] `speaking`: Speaking tasks and phrases (sprechen.json, sprechen-b1b2.json, redemittel.json).
- [x] `pronunciation`: Pronunciation rules, tongue twisters, sentence melody for English.
- [x] `idioms-mistakes`: Idioms, typical mistakes, false friends, slang, synonyms.
- [x] `exams`: Exam hub mapped to English exams per content-plan (e.g. Cambridge, IELTS): formats, one practice set each.
- [x] `culture`: Culture and knowledge hub for English-speaking countries.
- [x] `games`: Game data (satzregen, quakiSpringt, hochstapler, artikel-sprint → English equivalents).
- [x] `games-arcade`: Nut night (src/lib/nussnacht: a/an/some instead of der/die/das, English bosses and rules, no German compound splitting, upgrade texts) and Listening safari (src/lib/hoerSafari: hear a/an + noun, English level texts; decide what to do while no English audio exists), per content-plan §5.9 (split off by `games`, see its report).
- [ ] `games-dialogue`: Front desk sim (buergeramt: UK council office customers and rules), manners simulator (knigge scenes in the UK) and the Lindenau RPG as Brambleford, per content-plan §5.9 (split off by `games`, see its report).
- [ ] `teachers`: Worksheets, partner exercises, printable games for English.
- [ ] `word-stories`: Word stories (src/content/wortgeschichte) as English etymology stories, first batch.
- [ ] `english-for-work`: English for work (src/data/berufe, /berufe): the 10 sectors per content-plan §5.12, workplace phrases and vocabulary in British English.
- [ ] `vocab-c1-c2`: Lexicon and word decks, C1 and C2 (src/content/lexicon/c1.json, c2.json), per content-plan §1.4 and §5.2.
- [ ] `accents-languages`: /wissen/dialekte as accents of English in the British Isles and /wissen/sprachen as where English is spoken (dialekte.json, sprachen-welt.json, their map geometry and the dialekte.*/sprachen.* texts in en.json), per content-plan §5.8 (split off by `culture`, see its report).
- [ ] `routes`: Rename German routes/slugs to English per content-plan, with redirects from the old ones.
- [ ] `cleanup`: Remove modules content-plan marked as dropped; re-enable content validators in prebuild.
