# icanspeak French: is ChatGPT citing us? Monthly check v1 (2026-11-17)

Why: on deutschacademy, ChatGPT search brings more visitors than Google and Bing together (1,767 sessions with
`utm_source=chatgpt.com` in 30 days, measured 2026-11-14), and it lands people on free material: `/wissen`, the
`/<lang>/downloads` pages, exam practice sets, single worksheets. ChatGPT search leans on Bing's index. This file
is the hand check that tells us whether the same starts happening for https://icanspeak.it/francais/. Twin of
`ai-visibility-english-v1.md`; the Spanish course has `ai-visibility-spanish-v1.md`.

No browser login or tool is needed beyond a ChatGPT account. Takes about 15 minutes a month.

## How to run the check (first Monday of the month)

1. Open ChatGPT in a private window (or a fresh chat with memory off), turn on **Search**.
2. Paste each question below exactly as written, one new chat per question.
3. Note in the table for that month:
   - `cited` = icanspeak.it appears as a source link, `named` = mentioned without link, `–` = not there.
   - Which icanspeak URL was cited (if any).
   - The first two other sites it cited (that is who we compete with for this question).
4. Same question in Bing (bing.com, private window). Note the position of icanspeak.it on page 1, or `–`. Bing
   position is the leading signal: ChatGPT usually follows a few weeks later.
5. Cross-check in PostHog (project 344818, eu.posthog.com): Web analytics, filter `utm_source = chatgpt.com` and
   path contains `/francais/`, last 30 days. Write the number in the "Sessions" row at the bottom.

Do not "train" ChatGPT by asking it to remember icanspeak or by clicking thumbs up on answers that cite us; that
changes nothing for other users and spoils the baseline.

## Before the first check

The pages in the last column marked *(after release)* are being built in this batch by the `french` lane. Run the
baseline once anyway (it shows the starting point), then again about four weeks after the release and after Bing
has the sitemap (`prompts/traction/indexing.md`, step 1 of the English batch). The `/francais/` pages that already
exist today (`/francais/delf-dalf`, `/francais/tcf`, `/francais/tef`, `/francais/examen-civique`,
`/francais/test-de-niveau`) answered 200 on 2026-11-17.

## The 12 questions

Page codes: **K** `/francais/savoirs`, **F** `/francais/enseignants/fiches/`, **P** `/francais/test-de-niveau`,
**D** `/francais/delf-dalf`, **E** `/francais/examen-civique`. The per-language download pages are the ones the
`french` lane adds through `entry-pages.json` (UI languages in the app today: German, Spanish, Portuguese,
Italian); check the exact path on the live site before the first run.

| # | Lang | Question (paste exactly) | Who asks | deutschacademy equivalent | icanspeak page that should answer |
|---|---|---|---|---|---|
| 1 | FR | grammaire française pdf gratuit A1 A2 B1 à télécharger | learner | `/wissen` (631 ChatGPT sessions / 30 days) | K *(after release)* |
| 2 | FR | fiches de grammaire FLE à imprimer avec corrigé | teacher | `/lehrkraefte/arbeitsblaetter/grammatik/<topic>` | F *(after release)* |
| 3 | FR | exercices passé composé ou imparfait pdf avec corrigé | teacher, learner | `/lehrkraefte/arbeitsblaetter/grammatik/praeteritum-plusquamperfekt` | `/francais/enseignants/fiches/grammaire/<thème>` *(after release)* |
| 4 | FR | sujet DELF B1 gratuit en ligne avec corrigé | learner | `/goethe/b2` | D |
| 5 | FR | test de niveau français gratuit CECRL sans inscription | learner, teacher | `/einstufungstest` | P |
| 6 | FR | examen civique carte de résident test entraînement gratuit | learner (residence permit applicants) | `/leben-in-deutschland/test` | E |
| 7 | EN | free printable French grammar worksheets with answer key | teacher | `/lehrkraefte/arbeitsblaetter/grammatik/<topic>` | F *(after release)* |
| 8 | EN | free DELF B1 practice test online | learner | `/goethe/b2` | D |
| 9 | DE | Französisch Grammatik PDF kostenlos Download A1 A2 | learner (Germany) | `/wissen` | `/francais/de/…` download page *(after release)*, else K |
| 10 | ES | gramática francesa pdf gratis A1 A2 para descargar | learner (Spain, LatAm) | `/es/downloads` | `/francais/es/…` download page *(after release)*, else K |
| 11 | PT | apostila de francês grátis pdf gramática básica | learner (Brazil, Portugal) | `/pt-br/downloads` | `/francais/pt/…` download page *(after release)*, else K |
| 12 | IT | grammatica francese pdf gratis A1 A2 da scaricare | learner (Italy) | `/es/downloads` | `/francais/it/…` download page *(after release)*, else K |

Notes on the questions:
- 1–6 are in French because that is how the people who need DELF, the civic exam and printable FLE material
  search; 7 and 8 are the English-speaking teacher and learner; 9–12 are the deutschacademy pattern (people asking
  for the course language's material in their own language).
- 3: pick a topic the course really has a sheet for on the day of the check (passé composé / imparfait is the
  most common search; if there is no sheet, replace it with the closest topic and note it).
- 6: the French civic exam (examen civique) is part of the residence and naturalisation path; the page
  `/francais/examen-civique` exists today. Re-check the wording of the question against what the page calls it.
- 8: DELF B1 is the level most often asked for; if ChatGPT answers with DELF B2 pages, run B2 as an extra and note it.
- English and German questions are expected to be won by the big sites (Lingolia, TV5MONDE, Le Point du FLE, France
  Éducation international); they are in the list to show whether a French-course page is cited at all.
- The UI-language download pages do not exist yet. If the `french` lane names them differently, correct the last
  column once.

## Results

Copy this block once per month. Baseline (first run) left empty for Edgar.

### Baseline: date ____

| # | ChatGPT | icanspeak URL cited | Other sites cited (first two) | Bing position |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |
| 9 | | | | |
| 10 | | | | |
| 11 | | | | |
| 12 | | | | |
| Sessions | PostHog `utm_source=chatgpt.com`, `/francais/`, last 30 days: | | | |

## What to do with the results

- A question where ChatGPT cites a competitor but not us: open the competitor page it cited and compare with ours
  (does ours answer the question in the first screen? is the PDF or worksheet one click away? is the page in the
  sitemap and `llms.txt`?). Write the gap into the next batch.
- A question where Bing has us on page 1 but ChatGPT does not cite us: wait one more month.
- A question where Bing has nothing from us: check Bing Webmaster Tools, URL Inspection, for the page in the last
  column; if it is not indexed, submit it there (or via IndexNow, `scripts/indexnow.mjs`, which the indexing lane
  adds).
- Questions 4 and 8 (DELF) are the ones where a competitor is usually an official site (France Éducation
  international). Do not try to beat it; the aim is to be the practice page next to it.
