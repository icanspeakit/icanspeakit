# Content migration queue

One item per scheduled run (automation/run-next.ps1), top to bottom. A run takes the first
unchecked item, works on it on the `content` branch and ticks it when finished. To skip an
item, tick it by hand; to redo one, untick it. Add, remove or reorder items freely.

- [ ] `content-plan`: Write docs/content-plan.md, the map from every German module to its English-course equivalent (levels, exam targets, slugs to rename, modules to drop). Every later run follows it.
- [ ] `ui-components`: English page titles, descriptions and leftover German UI text in src/layouts and src/components (not the data). New strings go into public/i18n/en.json.
- [ ] `ui-pages-a-l`: Same for src/pages, files and folders starting a–l.
- [ ] `ui-pages-m-z`: Same for src/pages, files and folders starting m–z, plus the legal pages.
- [ ] `placement-test`: Placement test (src/data/einstufung.json) as an English test, A1–C1.
- [ ] `grammar-a1`: A1 grammar topics (src/data/grammatik, level A1) as English grammar topics, same schema.
- [ ] `grammar-a2`: A2 grammar topics.
- [ ] `grammar-b1`: B1 grammar topics.
- [ ] `grammar-b2`: B2 grammar topics.
- [ ] `grammar-c1`: C1 grammar topics (src/paid/grammatik included).
- [ ] `grammar-structure`: Grammar order, syllabus, related topics, reference tables (grammatik.json, grammatik-lehrplan.json, grammatik-verwandt.json, nachschlagen/).
- [ ] `beginner-path`: The "Einfach lernen" beginner path (einfach-pfad.json) for English.
- [ ] `vocab-a1`: Lexicon and word decks, A1 (src/content/lexicon, wortschatz.json).
- [ ] `vocab-a2`: Lexicon and word decks, A2.
- [ ] `vocab-b1`: Lexicon and word decks, B1.
- [ ] `vocab-b2`: Lexicon and word decks, B2.
- [ ] `listening`: Listening texts (hoeren.json): English scripts (audio comes later, with a TTS provider).
- [ ] `reading-writing`: Reading and writing tasks (lesen.json, schreiben pages).
- [ ] `speaking`: Speaking tasks and phrases (sprechen.json, sprechen-b1b2.json, redemittel.json).
- [ ] `pronunciation`: Pronunciation rules, tongue twisters, sentence melody for English.
- [ ] `idioms-mistakes`: Idioms, typical mistakes, false friends, slang, synonyms.
- [ ] `exams`: Exam hub mapped to English exams per content-plan (e.g. Cambridge, IELTS): formats, one practice set each.
- [ ] `culture`: Culture and knowledge hub for English-speaking countries.
- [ ] `games`: Game data (satzregen, quakiSpringt, hochstapler, artikel-sprint → English equivalents).
- [ ] `teachers`: Worksheets, partner exercises, printable games for English.
- [ ] `word-stories`: Word stories (src/content/wortgeschichte) as English etymology stories, first batch.
- [ ] `routes`: Rename German routes/slugs to English per content-plan, with redirects from the old ones.
- [ ] `cleanup`: Remove modules content-plan marked as dropped; re-enable content validators in prebuild.
