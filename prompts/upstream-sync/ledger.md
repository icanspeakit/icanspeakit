# Upstream sync ledger
upstream_head: 6f8d4ac   triaged: 2026-11-26

Upstream = `C:/Users/Edgar/Projects/deutschacademy`, branch `main`. icanspeakit was scaffolded from it on
2026-10-28 21:27 UTC (`e3dffc92`), so upstream work before that moment is already here (Satzregen Tier 1,
Knigge prototype, games "Problem melden", sound switch).

How this triage was read (first run, 2026-11-26): `git` on the upstream repo needs approval in the unattended
runner, so the commit list came from the upstream reflog `.git/logs/refs/heads/main` (lines 1239–2404,
2026-10-28 → 2026-11-26, ~1,100 commit entries). Hashes are the 8-char commit ids from that reflog. Gaps:
(1) commits that reached `main` by fast-forward from a worktree or a pull show up only as one empty reflog
entry, so their individual messages are missing (e.g. the base of Verbinden + Schreibtafel came in via
`merge integration/schreibtafel-verbinden` → `177aed5e`); (2) a handful of very long messages were cut.
Each port run must read the real upstream files, not just the listed commits.
(3) port runs: `git show` / `git log -1` on upstream are refused too. Find the subjects in the reflog, then
Grep/Read the upstream working-tree files for the matching code and comments.

Classes: PORT = shared engine/fix, ADAPT = engine useful but content German, SKIP = German-only/internal,
ALREADY = icanspeakit has it. status: open | done | blocked | needs-edgar | -

## PORT / ADAPT (queue order = value order)

| id | feature | upstream commits | class | status | icanspeakit commit | note |
|----|---------|------------------|-------|--------|--------------------|------|
| port-fix-exercise-ux | exercise/grammar UI fixes from session replays | 8590aa7f, 0721f245, 34a791bc, db0a219d, 86a334f5, e6c65480, f419e070, b262c5b8, bb2a01b3, feee5657, c7ab8122, 6c8c5c33, d56c029b, add5e261 | PORT | done | 82beaf08 | all 5 courses; 8590aa7f (picker crash) was already here; ported from upstream working-tree files (git diffs refused), quick check only, not built |
| port-fix-cards-audio-ux | vocab cards / audio / RTL fixes | 42a5c6d5, 6336f706, dc34fd53, e69cc3d3, 0f32cdd7, 9fb35020, 0532d0d3, bfad7330, 9701db2d, 90c37ee2, 8b50ea31, 0467e2e0 | PORT | done | a787ff8f | all 5 courses; 0f32cdd7 not ported (upstream's later tab switch no longer has it); signed-out lock stays off while BACKEND.speech is false; ported from upstream working-tree files (git show refused), quick check only, not built |
| port-fix-layout-compat | layout, nav and old-browser fixes | 946e9eda, 2a33e644, 9cbcb735, d2907904, 29f6221e, 646e54fe, e2f896fd, cf0b7629, 57474b75, 11e1b924, 244b8331, 26eb0d32, c2db835d | PORT | done | b7e072c1 | all 5 courses (+ cssTarget in hub, linguistics); 11e1b924 + 26eb0d32 already here; c2db835d n/a (no regex on /syllabus); 29f6221e/646e54fe only `max-width: none` (the 1760px cap answered upstream's streak badge, which icanspeak lacks); full build passed |
| port-fix-progress | progress page fixes | b0dfc3e9, 03ec72c3, 4bf707ae, 0fddfcf0, f5433be8, 0c522ffd, 42e425fe, ca6b5b06, 71ab61c9 | PORT | done | 610c2edc | all 5 courses; streak, local days, round down, tab jump, sticky level row, empty card, class median, pass notes + quiz tab translated. Practice-set pass notes (saetze) stay English: later. 42e425fe n/a (no ar/tr/uk here) |
| port-fix-grammar-engine | grammar exercise engine: numbering + "Why?" | 74acf507, e49507be, d4859040, ce24bc49, 474e6a7a, 51c6630b | ADAPT | done | 17d313a1 | engine in all 5 courses (numbers, "Exercise N" badge, Why? after right answers too); ce24bc49/474e6a7a/51c6630b are German why-texts, not ported: filling items without a "why" in English is content for later; quick check only, not built |
| port-persona-ux-fixes | UX fixes from persona test runs | 36137cf9, 4be42c33, 526ef98e, d799970b, 44bb6bc2, f7f281d8, 1b81d471, e135f191, 575d902f, 21e7c2db, 088894d9, d0c4ffa4 | PORT | done | fa2b1dbd | all 5 courses (+ banner padding in hub/linguistics); "three consent buttons in one row" n/a (icanspeak has two buttons); search entries in English like the rest of the index. Was: tour stops on typing, cookie banner one row, live-quiz links same tab, early menu tap, search finds live quiz, feedback 1.1 s, listening colours, audio loading ring, teacher buttons folded on phones, placement score |
| port-fix-live-quiz | live quiz robustness + small features | 48437dfd, 8aa8b6ce, b73a5b71, 7563fa6b, 42ede768, 76a60bd8 | PORT | done | 8e2b41d6 | all 5 courses: staggered reconnect, change answer while time runs, phones follow screen language (the five meaning languages only; upstream's machine-drafted extra projector languages not here), teacher renames in lobby. Upstream's name chips (suggestAnimals) not part of this item |
| port-live-quiz-report-mixed | live quiz: report a problem, mixed + flip direction | 2661384b, c29dda38, dff3f8f1, e5edce81, 3f326c29, 1c61f17b, 697b3971, 77e174a5 | PORT | open | | uses existing meldung.js |
| port-live-ueben-fixes | live practice (class) fixes | ef9285da, b8002147, 84b24059, 68684c25, a2b7bf19, 2f3c12ba, 4275f487, 6312806a, aaffb92b, 6fad5651 | PORT | open | | no tab ping-pong, Check in phone bar, submit for class, animal names, evaluation with numbered mistakes, deselect all |
| port-live-ueben-join | /live join page with PIN + copy link/QR | 5992f51b, f993c4a7, 718b8282, 04c2beab | PORT | open | | english has no /live page yet; route name in English per URL rule |
| port-games-hub | games overview page + nav + search | e219f2c0, 04a3ff07, 716dab21, c2527db9, f3522fa6 | PORT | open | | english has no /games index; catalogue only lists games the course has |
| port-game-volume | volume slider for all games + live quiz | 3fcde7f6, 372dbc09 | PORT | open | | english has spieleEinstellungen.js already |
| port-satzregen-polish | Sentence Rain: look, sound, daily round, share | 9517ec48, 1fc03f4b, 9ea4a8f5, ec6df0cf, 299afd95, bdd98354, 99641a59, 18ea7d4e, 7cc23159, 6c24e5ab | PORT | open | | english has Tier 1 only (no board/modes/sound/bestenliste files) |
| port-satzregen-modes | Sentence Rain: game modes | 72eef42a, 6fb27f54 | ADAPT | open | | German modes (position 2, Satzklammer, Nebensatz); English needs its own word-order modes (questions, adverb position, relative clauses) |
| port-nussnacht-update | Nut Night: feel, aim, areas, music | 4b7d3834, e3a5ecf4, 90c28245, c27c6ac0, 4493dcb4 | PORT | open | | |
| port-quaki-update | Quaki Jumps: physics v2, birds, music | 7bc3c737, f674f30d, eb6bb0ef, 9f328374 | PORT | open | | |
| port-small-game-fixes | small game fixes | 6f7ef28e, bf848c7a, b2c69be0, 54c754b6 | PORT | open | | Brambleford double jump, Listening Safari late click, Impostor rule 4, report link always visible |
| port-topicbar | topic bar + topic list UX | 1abcc401, e4bfd91d, 9c9964a2, 8b71f290, 4778466c, efc61528 | PORT | open | | collapsible topic bar, back on scroll-up, "Done with this topic?" next-topic card, ring progress in topic list |
| port-grammar-actions-menu | "Teaching ▾" menu on topic pages | 418c5ca4, 96c03cf4, a7baac28, 0a124785, 297d7078 | PORT | open | | Present button, live tools under one menu, print as icon |
| port-print-grid | site print stylesheet + gridBalance | ac37412b, 9fcc1e77, 13420f62 | PORT | open | | logo + URL on printouts, no lonely last card in grids, check:grid |
| port-kurzfilm-standard | explainer films: play once, replay, dismissable guides | 6f44454d, 30b510b9, 1f3ecc11 | PORT | open | | "How it works" can be hidden; account setting via user_metadata.guides |
| port-guided-run-weekplan | guided run per lesson + weekly plan | 5f7cad98, 398e94a4, 0d4a5edc, d82107da, 055e6d11, cb83791d, de19f657, 51a765cb, 7f93539f, 97d0fa8f, 5d30e21b | PORT | open | | english has step-by-step + grammarRun.js; may split into run + week plan |
| port-ausfuehrlich-ueben | "Practise in depth": extra exercises folded | e4f73b5f | PORT | open | | engine + account setting; English topics get `zusatz` markers later |
| port-unterricht-clock | lesson clock + picture prompt fixes | 1fc07090, 98fa2645, d835bd69, e04d63ad | PORT | open | | |
| port-stundenplan-layout | teacher timetable: calmer layout, units, groups | 2051a22f, aa88e4f4, be130ef1, f80d5951, e80c701a, ef79f751, 5743952f, 9f6c1854, 74e01363, 1ce8daca | PORT | open | | |
| port-stundenplan-words | teacher timetable: word list picker, word drawer, own vocab | db58f2a3, b40f222c, 22a3f5f8, 87cc4690, b84fdf19, 3454ab94, 345b48c7, 8bf1184c, 959227e4 | PORT | open | | |
| port-teachers-hub | teacher hub pages, signpost, cards with films | 8c007011, 279c92a8, 30b163c7, c809c5cb, 294e1e6c, 8dc40af8, 9fa0f45f, 4d601583, e6c02a58, 1624cf25, 5776e2ed, 0f7afc93 | PORT | open | | english has LkWegweiser + teachers/index |
| port-teachers-material | teachers: material page, breadcrumbs, classes film | 7e02b7a9, 294d9c40, ab9456be, 7d96b25e, 088b98db, f837caca | PORT | open | | |
| port-verbinden | Connect (matching lines) game + live with class | 0ee1a08e, 791764b9, 72773b43, b6c22179, ad1c5cb6, f72c9dac, 94812d07, 66249d05, 14bd0ea6, 9b7b3796, 1841545b, 7809d8f7 | ADAPT | open | | base came via fast-forward `177aed5e`; English pairs (opposites, grammar) need writing; custom sets use migration 20261115120000_verbinden_sets.sql → needs-edgar for that part |
| port-schreibtafel | Writing board for class (live) | 9375227d, 781db7d7, 1b131d98, 825f6d4e, 650d83ce, 23c01ab1, 166009dc, 62d6622f, 0d700dbf, d5a2428f, ffac0427 | PORT | open | | Supabase Realtime only, no migration; self-check list must be English grammar points |
| port-vokabel-foto | vocab from photo: crop, screenshot cleanup, save, add language | 9668cc32, e0e7cac5, 7d514573, 8d122579, d2f35acc, 79f92c9f | PORT | open | | english has vokabelFoto/ |
| port-dice-tools | dice tool + dice speaking game | df63ba22, 490c14c6, 000f50ed, e2f30ecb, 561c5ab8, a9e9b5bf, 3f95cfb8 | ADAPT | open | | dice = PORT; speaking board topics need English prompts; breakout rooms after |
| port-lernzaehler | anonymous practice counter + own time + badge | 76b341aa, 8e5137d2, fc5a8650, 22c2a892, 853a7715 | PORT | open | | needs migrations lern_zaehler + lern_tage → write files, needs-edgar to apply; thresholds before numbers show |
| port-group-games | class games: Pictionary, job guessing, explain/domino online | ecaea4ee, fb1d8ae1, a53a2e02, 4441d1dc, 48d737e1, f3d93ff1, e79ef042, e7957721, dcde4a8a | ADAPT | open | | engines PORT, word pools English; one game per run |
| port-gruppenplakat-bilderkiste | group poster + picture box (live) | 03ee0271, 721faeea, da422281 | PORT | open | | Realtime only |
| port-search-ux | search: dedupe, sections, partner exercises | cd743c80, 7ff12711, 442fc59a, 38da6d96 | PORT | open | | |
| port-brief-zeilen | "In short" subtitles as lines | 2807a6a2 | PORT | open | | |
| port-hub-photos | hub photos whole, faces on top | c559cb4d, f05b909a, 5ddc1090 | PORT | open | | |
| port-konjugation | conjugation trainer + verb cards | e49c8da4, f7aa37df, 73ac5c1a, 767b62a0, 543c8b23, e97aecac, 29dee1ad, 6b824361, 93faef0b | ADAPT | open | | German verb engine; English needs its own (irregular verbs, tenses) |
| port-alphabet-numbers | alphabet + numbers listening pages | 11f0e7d9, fb42007c | ADAPT | open | | English alphabet/NATO spelling + numbers; audio needs TTS → needs-edgar for audio |
| port-wege | directions (maps) + breakout version | 7956755a, 92d13cbb | ADAPT | open | | maps reusable, phrases English; audio needs TTS |
| port-front-desk-update | Front Desk (Bürgeramt) layout, film, tap-to-translate | de1ef7e9, 587029e8, f7e6d3ab, 8963332f, 9a50118f | ADAPT | open | | english front-desk is an adapted copy; port layout/film only |
| port-stufenleiter | level ladder + neighbours on topic pages | b2bb0573, 85fcc768, 9d7577b1, cb907501 | ADAPT | open | | engine + English topic families data |
| port-einfach-regel | "Simple" switch on the big rule view | bf3a7311 | ADAPT | open | | |
| port-partner-worksheets | partner worksheets: photos, linked from topics | 1e291b06, 9aebf28c | ADAPT | open | | engine; English worksheet content later |

## needs-edgar

| id | feature | upstream commits | class | status | icanspeakit commit | note |
|----|---------|------------------|-------|--------|--------------------|------|
| edgar-homepage | new homepage "Exercise first" + country spinner | 13df4df1, 5762132b, e19063cc, ec32993c, b0ea0739 | ADAPT | needs-edgar | | Product decision: should the English course home switch to the exercise-first layout? |
| edgar-kaufmomente | purchase moments (upsell cards) | 6fcc98e5 … | SKIP | needs-edgar | | Pricing/Stripe: does icanspeak sell premium yet? |
| edgar-klassen-privacy | classes privacy section, export, retention, DPA template | (merge, Tier 7) | SKIP | needs-edgar | | Legal text: wanted for icanspeak classes? |
| edgar-lieblingswort | favourite word forum + "My why" saved in account | 0567387a, 451c5080, b2534620 | ADAPT | needs-edgar | | Needs Supabase migrations (lieblingswort_forum, lern_warum) and moderation; build? |
| edgar-elevenlabs | ElevenLabs as TTS provider, re-voiced audio | 3840f6be… | SKIP | needs-edgar | | Paid service; icanspeak audio stays on current provider unless you say so |
| edgar-serien-beruehmt | "Learn with series", "They learnt German" | 5c8d5187, 82c60c8d | ADAPT | needs-edgar | | English equivalents need new research + image rights; worth it? |

## ALREADY

| id | feature | upstream commits | class | status | icanspeakit commit | note |
|----|---------|------------------|-------|--------|--------------------|------|
| - | Satzregen Tier 1 | 36f841c4 | ALREADY | - | scaffold | /games/sentence-rain |
| - | Knigge simulator (manners) | 743f69b8 … 96573b7c | ALREADY | - | scaffold | /games/manners |
| - | "Report a problem" in games + thank-you card | a1d390b2, 78416dad | ALREADY | - | scaffold | spielMelden.js, meldungDanke.js |
| - | one sound switch for all games | a2559553 | ALREADY | - | scaffold | spieleEinstellungen.js |
| - | animated jump bars | 8a2771d5 | ALREADY | - | scaffold | jumpNav.js, segSwitch.js |
| - | slang page | 135a8839 | ALREADY | - | | /knowledge/slang |
| - | new navbar + footer (compact nav) | 54ee4cf0, 4b2c36ac | ALREADY | - | hand copy 2026-11-15 | nav-flach.css, NavMenubar |
| - | account sign-in + per-course progress | (auth/progress) | ALREADY | - | b4187269, c0e5b2f6 | icanspeak's own |

## SKIP

| id | feature | upstream commits | class | status | icanspeakit commit | note |
|----|---------|------------------|-------|--------|--------------------|------|
| - | German grammar topics + tandem sheets (new topics, reviews, why-texts) | many feat/fix(grammatik), (tandem) | SKIP | - | | German content |
| - | German vocab, Redemittel, Berufe Medizin/Pflege, phone drills | (wortschatz), (redemittel), (berufe) | SKIP | - | | German content |
| - | Wissen: Umgangssprache, Redewendungen, Dialekte, Wurstkarte, FKK, "Wie Deutsch funktioniert", Wortleitern | (wissen), (redewendungen), (dialekte), (kultur) | SKIP | - | | German culture/language content |
| - | Leben in Deutschland, DTZ, Goethe/telc, Einbürgerung | (leben-in-deutschland), (pruefungen), (dtz) | SKIP | - | | German exams/brands |
| - | CRM, outreach, intern/admin, personas bot, replays, meldungen-Claude, Sentry tab, ux-bot | (crm), (intern), (admin), (persona), (replay[s]), (meldungen), (ux-bot) | SKIP | - | | internal tools for Edgar's business |
| - | partner programme, /teacher, /viktoria | (partner) | SKIP | - | | deutschacademy business |
| - | logo + design study, start/nav/landing experiments | 9df22c2e, b84fdf19…, (experimente), (start) /start-a* | SKIP | - | | deutschacademy branding / studies |
| - | Lehrertraining, Über mich, Kursinhalte Lehrwerke/covers | (lehrertraining), (ueber-mich), (kursinhalte) | SKIP | - | | Edgar's person / German publishers |
| - | Russian UI for deutschacademy | 47e81e8c | SKIP | - | | icanspeak has its own ru |
| - | docs, prompts, marketing | docs: … | SKIP | - | | about upstream itself |
| - | Vorfahrt, Hamstis Wachtelhuhn, Bruno Kart | (vorfahrt) | SKIP | - | | German driving content / not in icanspeak |
| - | vocab quiz (B1+–C1, medicine) | d1af84a9 | SKIP | - | | German word lists |
