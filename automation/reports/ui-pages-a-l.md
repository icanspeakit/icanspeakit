# Run report: `ui-pages-a-l`

Run: 2026-10-29, `content` branch, unattended. Scope: `src/pages`, files and folders starting
a–l (80 files). Not touched: `datenschutz`, `impressum` (legal pages → `ui-pages-m-z`),
`design-system` (internal), `fuehrerschein/**` (dropped by `cleanup`). Data files were not
changed; UI strings went into `public/i18n/en.json`.

## Resume note

At the start the worktree had uncommitted `en.json` edits (made at 08:05, two minutes after the
`ui-components` run finished): `fortschritt.tab.quiz`, `fortschritt.quiz.*`, `aussprache.end.*`,
`grammatik.tf.*`, `grammatik.vb.*` and ~45 `kt.t.*` keys, exactly the missing page keys listed
in the `ui-components` report, and a `_tmp_*` scan script. I took this for an earlier run of this
item that was stopped before its first commit (the automation commit `d2d1509` about build limits
came right after). I reviewed the values (correct English, no German-course wording) and committed
them with my first commit (`04792a4`). If that was another session's work, that commit is where it went.

## What I did

**Page titles, descriptions, breadcrumbs, JSON-LD** of every page in scope are English
(`04792a4`, `8c8384a`), written for the target course per content-plan: `/akkusativ` → object
pronouns, `/goethe` → Cambridge English, `/dtz` → Trinity ISE I, `/leben-in-deutschland` →
Life in the UK test, `/kultur` → UK culture, `/berufe` → English for work, worksheet/game/teacher
pages for “the English class”. Dynamic titles keep their data part (`deck.title`, `topic.name`
…) and only the wrapper words changed (“– exercises B1”, “Worksheet: …”, “– Listening A2”).

**Missing keys** (German showed): `lk.kt.*`, `lk.vf.*` (/lehrkraefte cards), plus the adopted keys
above, `aussprache.nextSet`. A loose scan of every quoted `prefix.key` in the a–l pages now finds no
missing key (only `qb.group.*`, which the page never renders; its optgroup labels are now English).

**Unkeyed German text** (gap check above baseline): `/entdecken`, `/entdecken/filme` (+ the ten
film step lists), `/grammatik/typische-fehler`, `/lehrkraefte/karten/*` (photo word lists, card
sets), quiz builder, class tests, `/account` (already English, marked `lang="en"`). Older baseline
gaps also fixed: homepage footer exam links (now Cambridge / IELTS / Trinity ISE / Life in the UK
and their practice sets), culture hub cards, insider “simple English” links, tandem sheet
switches, live-quiz buttons, pronunciation rule toggle, domino type “a / an / some” (§1.4).

**German-only pages made English-only** (`lang="de"` → `lang="en"`, text in the markup, no keys,
same as `KursTimeline`/`KursProgression`/`LkWegweiser` in the last run): `/kursinhalte`,
`/kursinhalte/[level]`, `/lehrkraefte/stundenplan` (incl. the plan table built in the page script;
the codes EA/PA/GA/PL display as Ind/PW/GW/WC), `/lehrkraefte/unterricht`, `/lehrkraefte/karten/*`.

**Strings built in page scripts**: pronunciation recorder messages, typische-fehler feedback,
tandem print title/footer, worksheet-pack empty state, Life in the UK `ExamApp` brand/unit. Most
other script strings are `t(key, fallback)` with an existing English key, so they already show English.

**`src/lib/vorschau.js`** (the demo “Preview” presenter card; its STEPS also feed `/entdecken/filme`):
step titles, pitches, buttons in English.

**en.json values that described the German course** on these pages (~60): homepage hero/value
cards/footer blurb (“Learn German”, “Everyday German”, “German from A1 to B2”), culture hub and
insider leads, exam-page headings and who-is-it-for texts (Cambridge, ISE I, Life in the UK),
teacher tools (“Do you teach German?” → English, live-quiz modes “English → translation”,
bingo/explain-the-word “in English”), listening/reading hub leads, placement-test level blurbs.

**Gap baseline** (`scripts/i18n-luecken-baseline.json`): lowered/removed only for a–l pages
(incl. the stale `konto` and `live-fragestunde` entries, files no longer exist). Other files untouched.

## Decisions

1. **Keys vs. hardcoded English.** Shared chrome got `data-i18n` keys (new keys: `fi.*`,
   `entdecken.lead`, `tf.*`, `kultur.extra.*`, `kultur.mascot.*`, `insider.*`, `pu.sw.*`,
   `pu.shot`, `lq.b.next`, `lq.keep.*`, `sp.domino.article`, `home.footer.exam.*`,
   `home.footer.practice.*`, `home.footer.link.cancel/withdraw`, `pr.pack.*`, `dtzMock.exam/mock`,
   `nr.empty`, `qb.ed.chapterShow`, `lk.merch`). Teacher tools that had no keys at all (card sets,
   lesson plan, lesson, syllabus) are English-only with `lang="en"`, like the last run's decision 5.
   Elements whose text a script rewrites (counters, “Sentence 1”) are marked `lang="en"` instead of
   keyed, so a language switch can't paint stale text over the script's.
2. **Exam facts only where I'm sure.** I wrote general, stable facts (Cambridge exams are one level
   each and the certificates don't expire; ISE I is B1 with two modules; Life in the UK is needed for
   settlement/citizenship). For ISE I and visas I wrote “check the current rules” instead of a claim
   (content-plan §2 asks to verify SELT status first).
3. **Practice-set specifics left for `exams`** (they describe data that `exams` will replace, so any
   English number now would be invented): `dtzSet.*`, `dtzMock.hero`, `dtz.format.note`,
   `lid.test.hero`, `lid.facts.*`, `lid.format.note`, `lid.fk.*`, `intro.fkEasy*`,
   `goethe.moreLevels.text`, `goethe.a1.*`, `exam.joint.label`, `exam.lid.*` rest. They still mention
   DTZ/Goethe/telc/BAMF/federal states.
4. **Content-owned text left alone**: the akkusativ rule box (`akk.regel.*`, `grammar-a1`), the
   separable-verb legend on `/grammatik/[ref]` (“an|rufen = trennt hier”, `grammar-structure`),
   `quiz.crosslink.passiv` (grammar quiz data), `lid.fsLink` (links to the dropped driving-licence
   module, `cleanup` must remove it), `ab.lang.de` “In German” (a worksheet translation language,
   still valid per §1.4).
5. Server text behind a key stays German where I didn't otherwise touch the element (last run's
   decision 2: the build renders the English value). Where I edited an element, I wrote English.

## Left / uncertain

- **`lang="de"` on data-driven parts** of `/grammatik/typische-fehler`, `/grammatik/verben`,
  `/grammatik/wortarten`, `[id]`, worksheets, `/kultur/insider/[id]` etc. marks the German
  placeholder content. The content items must remove those `lang="de"` when the data becomes English.
- **`src/lib` code behind these pages is still German**: `lib/vokabelFoto/page.js` (card-set
  editor), `lib/unterricht/seite.js` (lesson step screens), `lib/stundenplan.js` (phase names and
  activities: `teachers` item), `lib/liveQuiz/*`. Not page files, so outside this item; worth a
  `ui-lib` item or folding into `teachers`.
- `kl.a.form.dueHint` “until 23:59 German time”: the deadline logic may really use Berlin time;
  check the code before changing the wording.
- The `/dtz` slot is labelled Trinity ISE I and `/telc` Trinity ISE; both B1 practice links in the
  homepage footer therefore say “ISE I” (mock test vs. practice set). Revisit once `exams` decides.
- `scripts/validate-i18n.mjs` crashes (expects `public/i18n/de.json`); inherited, not part of the build.
- **Edgar, please check:** the homepage hero lead no longer claims “every exercise was taught in a
  real class” (true for the German course only); the culture `sourcingNote` still distinguishes
  “From class” topics, which only stays true if the culture run keeps that kind of topic.

## Verification

- `timeout 1500 pnpm build`: passed (2438 pages, postbuild leak checks ok) at commit `24519e0`.
  The one later commit (`8c8384a`) only changes two title strings.
- `node scripts/check-i18n-luecken.mjs`: no page a–l listed (remaining entries are m–z pages).
- Built HTML spot check: titles of /lehrkraefte, /kultur, /goethe, /dtz, /leben-in-deutschland,
  /kursinhalte, /lehrkraefte/stundenplan, /grammatik/typische-fehler are English; keyed text renders English.
