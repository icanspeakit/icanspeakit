# icanspeak Spanish: is ChatGPT citing us? Monthly check v1 (2026-11-17)

Why: on deutschacademy, ChatGPT search brings more visitors than Google and Bing together (1,767 sessions with
`utm_source=chatgpt.com` in 30 days, measured 2026-11-14), and it lands people on free material: `/wissen`, the
`/<lang>/downloads` pages, exam practice sets, single worksheets. ChatGPT search leans on Bing's index. This file
is the hand check that tells us whether the same starts happening for https://icanspeak.it/espanol/. Twin of
`ai-visibility-english-v1.md`; the French course has `ai-visibility-french-v1.md`.

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
   path contains `/espanol/`, last 30 days. Write the number in the "Sessions" row at the bottom.

Do not "train" ChatGPT by asking it to remember icanspeak or by clicking thumbs up on answers that cite us; that
changes nothing for other users and spoils the baseline.

## Before the first check

The pages in the last column marked *(after release)* are being built in this batch by the `spanish` lane. Run the
baseline once anyway (it shows the starting point), then again about four weeks after the release and after Bing
has the sitemap (`prompts/traction/indexing.md`, step 1 of the English batch). The `/espanol/` pages that already
exist today (`/espanol/dele`, `/espanol/siele`, `/espanol/ccse`, `/espanol/prueba-de-nivel`) answered 200 on
2026-11-17.

## The 12 questions

Page codes: **K** `/espanol/conocimientos`, **F** `/espanol/profesores/fichas/`, **P** `/espanol/prueba-de-nivel`,
**D** `/espanol/dele`, **C** `/espanol/ccse`. The per-language download pages are the ones the `spanish` lane adds
through `entry-pages.json` (UI languages in the app today: German, French, Portuguese, Italian); check the exact
path on the live site before the first run.

| # | Lang | Question (paste exactly) | Who asks | deutschacademy equivalent | icanspeak page that should answer |
|---|---|---|---|---|---|
| 1 | ES | gramática española pdf gratis A1 a B2 para descargar | learner | `/wissen` (631 ChatGPT sessions / 30 days) | K *(after release)* |
| 2 | ES | fichas de gramática ELE para imprimir con soluciones B1 | teacher | `/lehrkraefte/arbeitsblaetter/grammatik/<topic>` | F *(after release)* |
| 3 | ES | ejercicios de ser y estar pdf con soluciones imprimible | teacher, learner | `/lehrkraefte/arbeitsblaetter/grammatik/als-oder-wenn` | `/espanol/profesores/fichas/gramatica/<tema>` *(after release)* |
| 4 | ES | modelo de examen DELE B1 gratis online con respuestas | learner | `/goethe/b2` | D |
| 5 | ES | prueba de nivel de español gratis online MCER sin registro | learner, teacher | `/einstufungstest` | P |
| 6 | ES | examen CCSE test de práctica gratis nacionalidad española | learner (applicants for Spanish nationality) | `/leben-in-deutschland/test` | C |
| 7 | EN | free Spanish grammar pdf A1 to B2 download | learner | `/wissen` | K *(after release)* |
| 8 | EN | free printable Spanish grammar worksheets with answer key | teacher | `/lehrkraefte/arbeitsblaetter/grammatik/<topic>` | F *(after release)* |
| 9 | EN | free DELE B1 practice test online | learner | `/goethe/b2` | D |
| 10 | DE | Spanisch Grammatik PDF kostenlos Download A1 A2 | learner (Germany) | `/wissen` | `/espanol/de/…` download page *(after release)*, else K |
| 11 | PT | apostila de espanhol grátis pdf gramática | learner (Brazil, Portugal) | `/pt-br/downloads` | `/espanol/pt/…` download page *(after release)*, else K |
| 12 | IT | grammatica spagnola pdf gratis A1 A2 da scaricare | learner (Italy) | `/es/downloads` | `/espanol/it/…` download page *(after release)*, else K |

Notes on the questions:
- 1–6 are in Spanish because that is how the people who need DELE, CCSE and printable ELE material search; 7–9
  are the English-speaking learner and teacher; 10–12 are the deutschacademy pattern (people asking for the
  course language's material in their own language).
- 3: pick a topic the course really has a sheet for on the day of the check (`ser`/`estar` is the most common
  search; if there is no sheet, replace it with the closest topic and note it).
- 6: the CCSE is the knowledge exam for Spanish nationality; the page `/espanol/ccse` exists today.
- English and German questions are expected to be won by the big sites (SpanishDict, Lingolia, Instituto
  Cervantes); they are in the list to show whether a Spanish-course page is cited at all.
- The UI-language download pages do not exist yet. If the `spanish` lane names them differently, correct the
  last column once.

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
| Sessions | PostHog `utm_source=chatgpt.com`, `/espanol/`, last 30 days: | | | |

## What to do with the results

- A question where ChatGPT cites a competitor but not us: open the competitor page it cited and compare with ours
  (does ours answer the question in the first screen? is the PDF or worksheet one click away? is the page in the
  sitemap and `llms.txt`?). Write the gap into the next batch.
- A question where Bing has us on page 1 but ChatGPT does not cite us: wait one more month.
- A question where Bing has nothing from us: check Bing Webmaster Tools, URL Inspection, for the page in the last
  column; if it is not indexed, submit it there (or via IndexNow, `scripts/indexnow.mjs`, which the indexing lane
  adds).
- Questions 4 and 6 (DELE, CCSE) are the ones where a competitor is usually an official site. Do not try to beat
  the Instituto Cervantes; the aim is to be the practice page next to it.
