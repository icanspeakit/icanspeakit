# Run report: `speaking`

Run: 2026-10-30 (one run, no earlier attempt). Branch `content`. Build green at the end
(`pnpm build`, 2,221 pages, postbuild checks ok).

## What was done

| Commit | What |
|---|---|
| `94432f3` | **`sprechen.json`** (3 A2 picture tasks: gardening together, people on a bus, a young man helps an older woman) and **`sprechen-b1b2.json`** (6 three-stage topics) are English. `src/lib/fertigkeiten.js`: the prompts and bullets it builds for borrowed tasks are English. en.json `sprechenB1B2.*` keys synced. |
| `36377ad` | **`fertigkeiten/sprechen.json`**: the speaking hub, 21 tasks A1–B2, 4 picture series. Same ids, levels, types, sets, `seconds`, `from`/`index`/`stage`, images. `src/pages/sprechen/[id].astro`: `EXAM_KEYS` is keyed by the new English exam lines. en.json blurbs, checklists, set titles and type names synced (82 keys). |
| `46d2003` | `uebersetzungen/sprechen.json` emptied to `entries: {}` with an English `_note`, as for listening and reading. |
| `f999716` | **`redemittel.json`**: 14 English phrase sets (117 phrases). The 16 `redemittel-i18n/*.json` sidecars are re-keyed to the English phrases. en.json `rm.set.*` names synced. |
| `c742210` | Fix: `ws.redemittel.note.0–2` in en.json still held the German-deck tips ("the verb goes to the end", "plain *Ja*", "du form"). They overrode the English notes of the first three `/wortschatz` cards. They now equal `wortschatz.json`. |
| (this commit) | content-plan §5.5 records the state; this report. |

## Decisions

### Speaking tasks

- **Model answers describe the photos that are actually on disk.**
  - I looked at every photo in `public/assets/sprechen/`.
  - Several German models described a different scene from the photo. *Bewerbungsgespräch* talked about "two interviewers" (the photo has one). *Bürgeramt* had a waiting area with a number board (the photo shows two women at a front desk). *Baustelle* had a shop sign "Wir haben geöffnet" (there is no shop in the photo). *Videokonferenz* had four people on screen (the photo shows a speaker with a microphone and one person on screen). *Wartezimmer* had six patients (the photo shows one woman and a doctor).
  - The English models and `imageNeeded` follow the photos.
  - The station photo is Stockholm Central. The A1 model doesn't name the city, so the task stays about *a* station.
- **UK settings, without facts that could go stale:**
  - *Bürgeramt* became **At the front desk** (council: parking permit, council tax).
  - *Werkstatt* is about apprenticeships: work, earn and study, for example at a college. I gave no duration, because the minimum length changed in 2025 and I could not check the current rule.
  - *Wertstoffhof* became **At the recycling centre**. The model describes the speaker's own council's bins. It does not claim one national system, because bin rules differ by council. The only general claim is that glass and metal can be recycled again and again and paper several times.
  - *Wartezimmer*: the German "you need your insurance card" became a question about what you do when you are ill.
- **B1/B2 format** (content-plan §5.5):
  - Stage 1 is a 60-second photo long turn, as in Cambridge B1 Preliminary/B2 First Part 2.
  - Stage 2 is an IELTS Part 2 topic card: one minute of notes, then a 120-second talk. Each `topic` ends in "You should say:" and is followed by three points, the last one "and explain …". The resolver capitalises the points and drops that "and" when it turns them into bullets on `/sprechen/b2-vortrag-ehrenamt`.
  - Stage 3 is a 240-second discussion.
  - The note says the topics are written for this site and not taken from an exam paper.
  - The hub task `b2-vortrag-ehrenamt` keeps 180 s (= 60 + 120).
  - I replaced the German topic 6 discussion ("Should newcomers be required to take a language course?") with "What is the best way for a town to help newcomers feel welcome?", to keep politics out (§1.1).
- **Checklists** ("What an examiner listens for") now teach English points:
  - is + -ing for what is happening now;
  - a/an before a job;
  - "because";
  - "I'd guess that …" and "might";
  - the past in "When I applied …";
  - polite *would/could* in the planning task;
  - "The real question is not whether …, but how …".
  The number of items per task is unchanged, so every en.json key still exists.

### Useful phrases (`redemittel.json`)

- **The key `de` holds the English phrase.** It is the content key (front of the card, audio slug, sidecar key, beginner-path checksum). Content-plan §1.4 says to keep keys. `en` is now a plain-English paraphrase or usage note ("An answer to thank you: it was nothing."), the same as `wortschatz.json` after `vocab-a1`.
- **Same set ids and phrase order.** `src/lib/einfach-content.js` addresses phrases as `redemittel:<set>#<index>` with a checksum of the phrase. The beginner path doesn't use any phrase tasks yet, and `check-einfach-pfad` passes. Future phrase tasks need the checksum of the English phrase.
- **Translations kept, not rewritten.** I picked each English phrase as the natural equivalent of the German one, so the existing `ar/uk/ru/tr` drafts and the 16 sidecars still translate the right meaning. For example, *Da hast du recht* → *You're right.* and *Darf ich kurz stören?* → *Sorry to bother you.* They stay `reviewed: false`. No sidecar language is registered right now (`src/lib/languages.js` has only `en`), so learners don't see them yet.
- British choices: *Sorry?* (not *Pardon?*), *Do you fancy …?*, *Have you got a minute?*, *Cheer up!*, *It'll be all right.*
- The last set is **Where's the ball? (prepositions)**: in, on, under, above, next to, in front of, behind, between, on (the wall). The images are unchanged. Two cards are "on" in English (German *auf* and *an*). That is correct, and the picture is the question.
- Set names: *Asking back* became *Checking you understand*, and "&" became "and". The `rm.set.*` keys follow the data.

## Left open / for Edgar to review

- **No audio** for the English phrases (`public/audio/redemittel/` doesn't exist). The player falls back to the browser voice. Audio comes with the TTS provider.
- **Out of scope here, still German or DTZ-flavoured** (UI or other queue items):
  - `src/pages/aussprache.astro` note "Noch ohne Aufnahme — dein Browser liest vor." (`pronunciation`);
  - the German labels and leads with i18n keys in `LearnShell.astro` / `oldux/LearnShell.astro` (rendered from en.json, so not visible);
  - en.json `sprechen.hero.*`, `sprechen.startTimer` (no page uses them any more) and `dtz.fmt.speak.*` (`exams`);
  - `hochstapler/redemittel.json` (`games`);
  - shared nav entries for Berufe/culture (`english-for-work`, `culture`).
- `sets.redemittel.tip` / `ws.redemittel.sub` say "4 languages". That is true for the inline drafts but not visible while only English is registered.
- Worth a native-speaker read: the B2 models (about 200–250 words each), and the `uk/ru/tr/ar` drafts against the English phrases (they were written for the German ones).
- The A1 introduction model uses *Amir Sadat from Herat, now in Leeds* (kept from the German model, town changed). Change it if you'd rather not have Afghanistan in it.

RESULT of this item: done.
