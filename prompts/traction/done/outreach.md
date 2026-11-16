# Done: outreach (step 1)

## What changed
- `docs/marketing/README.md`: new index (file, purpose, date), same format as deutschacademy's.
- `docs/marketing/outreach-english-v1.md` has these sections:
  - Tracking table with 31 English-course targets. Columns: target, language, contact, last update seen, proposed page, status, date sent, answer.
  - List page URL for each target. All returned HTTP 200 on 2026-11-15, and the contact addresses of the top targets were checked against the live pages.
  - One draft per target in the editor's language: de, en, es, ca, fr, it, pt-PT. Each is under 120 words and contains no numbers.
  - A 14-day follow-up in seven languages.
  - 9 Spanish and 7 French targets, marked "later".
  - The "⛔ before sending" checks: which pages must be live first.
- `docs/marketing/ai-visibility-english-v1.md` has 15 questions. Nine are in English, and one or two each in Spanish, Portuguese, Hindi (Hinglish), Vietnamese and Indonesian. Each lists the deutschacademy equivalent, the icanspeak page that should answer it, the monthly check routine (ChatGPT with search, Bing position, PostHog `utm_source=chatgpt.com`), and an empty baseline table.
- No app code touched, no dev server started (not needed for this lane).

## Decisions
- No counts in the drafts: the downloads/worksheets pages are still being built. Edgar adds a count from the live page on the day he sends, if he wants one.
- Most drafts propose `/english/knowledge` (learner lists, library guides). The teacher-facing lists get `/english/teachers/worksheets/`. Council ESOL pages get `/english/life-in-the-uk/test`, and the KU Eichstätt IELTS shelf gets `/english/ielts/practice-set`.
- National portals in Spain, Portugal, Brazil and Italy (Procomún, INTEF, Escola Digital, Nova Escola, Portal do Professor) were dropped: they host their own material and take no outside-link suggestions. Nothing usable was found for Brazil or Australia.
- Drafts in Catalan (#20, #29, #30) and European Portuguese (#10) should be read by a native speaker. The file says so next to each.

## Depends on other lanes (send only after the release)
- `downloads`: `/english/knowledge` without the German leftovers, with English grammar A1–C1 PDFs, the irregular verbs PDF and links to the official sample papers. Several drafts mention the irregular verbs list; if it doesn't ship, delete that half-sentence.
- `worksheets`: English topics on `/english/teachers/worksheets/` with the answer key on its own page and a "new version" button. Live today it still shows the German topics.
- `indexing` + Edgar: the sitemap is submitted in Bing.

## ⛔ EDGAR: sending (after the release, about one or two a week so each one can be answered)
1. **#1 Deutscher Bildungsserver, Englisch → Caroline.Hartmann@fwu.de.** She listed deutschacademy's `/wissen` in October. That listing is the proven source of ~40 sessions a month, and the mail can refer to it. Open `outreach-english-v1.md` → "### 1." and send from the icanspeak address.
2. **#2 USAHello → form https://forms.gle/57nhsPkc1NiDDF137.** The page explicitly asks "Is there a free resource we should add?". It has a large learner audience and was updated in June 2026. Paste the text under "### 2." into the form.
3. **#6 St. Louis CC library → Sharon Fox, sfox@stlcc.edu.** A named librarian, and the guide was updated on 9 Nov 2026. Section "### 6.".
4. **#7 Cal State Fullerton library → John Hickok, jhickok@fullerton.edu.** A teacher-facing TESOL guide with a named owner, updated Sep 2026. It is the first test of the worksheets page with teachers. Section "### 7.".
5. **#4 ConnTESOL → webmaster@conntesol.org.** A TESOL affiliate page that asks for updates and already lists printable-worksheet sites. Section "### 4.".

After each mail: put the date in the "Date sent" column. After 14 days without an answer, send the follow-up once (same file, "Follow-up after 14 days").

Monthly from the first Monday after the release: run the 15 questions in `ai-visibility-english-v1.md` (about 20 minutes). Fill in the baseline the first time.

Check in a real browser (scripts were blocked): The Bell Foundation's free ESOL resources page (possibly a strong UK target), TV5MONDE enseigner, Brown DELF page, Université de Genève FLE.

## Commits
- `af7757c2` docs: outreach drafts for the English course and a monthly ChatGPT/Bing visibility check
- this done file (next commit)
