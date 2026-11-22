# icanspeak English: is ChatGPT citing us? Monthly check v1 (2026-11-15)

Why: on deutschacademy, ChatGPT search brings more visitors than Google and Bing together
(1,767 sessions with `utm_source=chatgpt.com` in 30 days, measured 2026-11-14), and it lands
people on free material: `/wissen`, the `/<lang>/downloads` pages, exam practice sets, single
worksheets. ChatGPT search leans on Bing's index. This file is the hand check that tells us
whether the same starts happening for https://icanspeak.it/english/.

No browser login or tool is needed beyond a ChatGPT account. Takes about 20 minutes a month.

## How to run the check (first Monday of the month)

1. Open ChatGPT in a private window (or a fresh chat with memory off), turn on **Search**.
2. Paste each question below exactly as written, one new chat per question.
3. Note in the table for that month:
   - `cited` = icanspeak.it appears as a source link, `named` = mentioned without link, `–` = not there.
   - Which icanspeak URL was cited (if any).
   - The first two other sites it cited (that is who we compete with for this question).
4. Same question in Bing (bing.com, private window). Note the position of icanspeak.it on page 1,
   or `–`. Bing position is the leading signal: ChatGPT usually follows a few weeks later.
5. Cross-check in PostHog (project 344818, eu.posthog.com): Web analytics → filter
   `utm_source = chatgpt.com` and path contains `/english/`, last 30 days. Write the number in
   the "Sessions" row at the bottom.

Do not "train" ChatGPT by asking it to remember icanspeak or by clicking thumbs up on answers
that cite us; that changes nothing for other users and spoils the baseline.

## Before the first check

The pages in column "icanspeak page" marked *(after release)* are being built in this batch by
the `downloads` and `worksheets` lanes. Run the baseline once anyway (it shows the starting
point), then again about four weeks after the release and after Bing has the sitemap
(`prompts/traction/indexing.md`, EDGAR step 1).

## The 15 questions

| # | Lang | Question (paste exactly) | Who asks | deutschacademy equivalent | icanspeak page that should answer |
|---|---|---|---|---|---|
| 1 | EN | free English grammar pdf A1 to C1 download | learner | `/wissen` (631 ChatGPT sessions / 30 days) | `/english/knowledge` |
| 2 | EN | free English grammar worksheets B1 pdf with answers | teacher | `/lehrkraefte/arbeitsblaetter/grammatik/<topic>` | `/english/teachers/worksheets/` *(after release)* |
| 3 | EN | present perfect vs past simple worksheet printable with answer key | teacher | `/lehrkraefte/arbeitsblaetter/grammatik/praeteritum-plusquamperfekt` | `/english/teachers/worksheets/grammar/<topic>` *(after release)* |
| 4 | EN | irregular verbs list pdf free | learner | verb lists on `/wissen` | `/english/knowledge` (irregular verbs PDF *(after release)*) |
| 5 | EN | free Cambridge B2 First practice test online with answers | learner | `/goethe/b2` | `/english/cambridge/b2` |
| 6 | EN | free IELTS reading and listening practice test online | learner | `/telc/b1` | `/english/ielts/practice-set` |
| 7 | EN | Life in the UK test practice questions free | learner | `/leben-in-deutschland/test` | `/english/life-in-the-uk/test` |
| 8 | EN | free online English placement test CEFR level no sign up | learner, teacher | `/einstufungstest` | `/english/placement-test` |
| 9 | EN | free ESL classroom quiz like Kahoot with ready-made grammar questions | teacher | `/lehrkraefte/quiz` | `/english/teachers/quiz` |
| 10 | ES | ejercicios de gramática inglesa B1 pdf gratis con soluciones | learner (Spain, LatAm) | `/es/downloads` | `/english/knowledge`, later `/english/es/downloads` if the downloads lane adds it |
| 11 | ES | simulacro examen Cambridge B1 Preliminary gratis online | learner (Spain) | `/goethe/b2` | `/english/cambridge/b1` |
| 12 | PT | apostila de inglês grátis pdf gramática básica | learner (Brazil) | `/pt-br/downloads` | `/english/knowledge`, later `/english/pt/downloads` if added |
| 13 | HI | English grammar PDF free download in Hindi | learner (India, typed in Hinglish as people do) | `/hi/downloads` | `/english/knowledge` (no Hindi page planned yet) |
| 14 | VI | tài liệu ngữ pháp tiếng Anh PDF miễn phí từ A1 đến B2 | learner (Vietnam) | `/vi/downloads` | `/english/knowledge` (no Vietnamese page planned yet) |
| 15 | ID | latihan soal IELTS gratis online dengan kunci jawaban | learner (Indonesia) | `/id/downloads` | `/english/ielts/practice-set` |

Notes on the questions:
- 1–9 are in English because most English learners search in English once they are past A2;
  10–15 are the deutschacademy pattern (people asking for German material in their own
  language), applied to English.
- 13: Indian learners rarely type Devanagari for this; "in Hindi" in Latin script is how the
  query is usually written. If we ever add a Hindi download page, add the Devanagari variant
  `अंग्रेज़ी ग्रामर PDF मुफ़्त` as question 16.
- 13 and 14 can only be won by `/english/knowledge` while the English course has no Hindi or
  Vietnamese interface (`apps/english/src/lib/languages.js`: English only). They are in the list
  to show whether ChatGPT cites an English page for these questions at all; on deutschacademy it
  cites the page in the asker's language.

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
| 13 | | | | |
| 14 | | | | |
| 15 | | | | |
| Sessions | PostHog `utm_source=chatgpt.com`, `/english/`, last 30 days: | | | |

## What to do with the results

- A question where ChatGPT cites a competitor but not us: open the competitor page it cited and
  compare with ours (does ours answer the question in the first screen? is the PDF/worksheet one
  click away? is the page in the sitemap and `llms.txt`?). Write the gap into the next batch.
- A question where Bing has us on page 1 but ChatGPT does not cite us: wait one more month.
- A question where Bing has nothing from us: check Bing Webmaster Tools → URL Inspection for
  the page in the last column; if it is not indexed, submit it there (or via IndexNow,
  `scripts/indexnow.mjs`, which the indexing lane adds).
