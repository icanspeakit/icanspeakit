# icanspeak.it courses: handoff
*Last updated: November 4, 2026*

## What this is

Since November 3, 2026, icanspeak.it is also the **umbrella for language courses**. Two full
courses are being built, each in its own repo, mounted under this site:

| URL | Repo (C:\Users\Edgar\Projects\…) | What |
|---|---|---|
| `icanspeak.it/` | `icanspeakit` (this repo) | stays as it is: magazine, word cards, speech exercises, dashboard |
| `icanspeak.it/english/` | `icanspeak-english` | English course (was `englishacademy`, renamed) |
| `icanspeak.it/spanish/` | `icanspeak-spanish` | Spanish course, copied from icanspeak-english |

Both courses are the **deutschacademy** architecture: Astro 7, static, about 1,700 pages, grammar,
vocabulary with SRS, exams, skills, games, teacher material and a placement test. All
integrations are removed (no Supabase, Stripe, analytics or Azure); every service goes through
`src/lib/backend.js` and is off. See `ARCHITECTURE.md` in each repo.

This changes the context of open decision 3 in `handoff.md`: icanspeak is no longer only the
etymology magazine. It is now also the brand the courses live under.

## How the three repos fit together

- **Each course repo is independent:** its own build, its own deploy (a static Vercel project, no
  adapter) and no shared code. This repo does not import anything from them, and they do not
  import from it.
- **Base paths:** each course sets `site: 'https://icanspeak.it'` and `base: '/english'` or
  `'/spanish'`. Links, assets, fetches, canonicals, the sitemap and llms.txt are all built under
  the base. `pnpm check:base` fails the build if a URL escapes it.
- **UI languages** come after the base: `/spanish/de/`, `/spanish/fr/` and so on. English is the
  base dictionary.
- **Still to do in this repo, at go-live:** add two rewrites to `vercel.json`, once both course
  projects are deployed on Vercel:
  ```json
  { "rewrites": [
    { "source": "/english/:path*", "destination": "https://<english-project>.vercel.app/english/:path*" },
    { "source": "/spanish/:path*", "destination": "https://<spanish-project>.vercel.app/spanish/:path*" }
  ] }
  ```
  `/english` and `/spanish` don't collide with any route here (checked: about, blog, dashboard,
  de, exercises, former-site, study, words). Also add links to the courses on this site's home
  and in its nav.
- **Domain:** icanspeak.it stays. Google treats `.it` as Italy-targeted; Edgar accepted that.
  icanspeakit.com could be added later as a redirect.

## Brand

The courses use this site's identity, copied into each repo so they stay independent:

- `public/logos/`:
  - course wordmarks "icanspeak english" and "icanspeak spanish", with the amber dot over the
    "i" of the course name, the same gesture as "icanspeak ıt";
  - marks "en" and "es", app icons and favicons;
  - the umbrella logos from this repo, redrawn as outlines. The originals here load Literata
    from Google, so inside an `<img>` they fall back to Georgia. **Worth swapping here too.**
- `public/fonts/icanspeak/`: Fraunces, Inter and Literata, self-hosted.
- `docs/brand/`: `BRAND.md` (tokens from `src/styles/global.css` here, type, logo use) and a copy
  of `design/design-system/`.
- Every course page has a footer row "part of icanspeak.it" linking to `https://icanspeak.it/`.

If the palette or type changes here, copy the change into both course repos'
`docs/brand/BRAND.md` and `global.css`. Nothing syncs automatically.

## Spanish course: decisions

- **Variety:** Castilian Spanish (Spain) is the standard: vosotros, Spain vocabulary, distinción
  and RAE spelling. Every item has a `variety` field (`es-ES`) plus an `es419` note where Latin
  American usage differs, so a LatAm mode can be switched on later without a rewrite.
  `LATAM_MODE` is in `src/lib/variety.js`, and `pnpm check:variety` checks it.
- **Exams:** DELE (A1–C2) and SIELE, with a "DELE or SIELE?" page. Practice material is original
  only. Exam facts a run wasn't sure of are marked "to verify" in its report.
- **Germany-specific modules are converted:**
  - Leben in Deutschland → CCSE
  - DTZ → DELE A2 for nationality
  - Bürgeramt sim → Extranjería sim (NIE/TIE, empadronamiento, arraigo, the 2026 extraordinary
    regularisation)
  - Führerschein → DGT vocabulary
- **New modules:** a verb-conjugation trainer and Business Spanish.
- **Audience:** adults worldwide, A1–C1, with a strong group of immigrants and residents in Spain.
- **UI languages:** English base, plus German, French, Portuguese and Italian. Arabic later.
- The map from every module to its Spanish version: `docs/content-plan.md` in icanspeak-spanish.

## How the work runs: overclaude

The content is written by **overclaude** (`C:\Users\Edgar\Projects\overclaude`), a local tool
that runs headless Claude Code item by item within Edgar's Max usage caps. It has a tray icon and
an app window at localhost:4455.

- **Project folders:** `overclaude\projects\icanspeak-spanish` and `…\icanspeak-english`. Each
  has `QUEUE.md` (the tasks), `PROMPT.md` (the rules for every task), `project.json` and
  `reports\` (one report per task, with decisions and open points).
- **Branches:** runs work on a branch in a worktree (`overclaude\work\<id>`) and never push.
  - Spanish: branch `content`.
  - English: branch `umbrella`.
  - `main` is only changed by hand (it holds the brand kit commits).
- **Pause marker:** an item ending in `[pause]` makes the runner stop after it for review.
- **One runner at a time:** English starts after Spanish, or when Spanish is stopped.

## Status (November 4, 2026, 19:30)

**icanspeak-spanish: 14 of 51 items done, running.**
- Done: `content-plan`, `base-path-and-brand`, `brand-theme`, `variety-schema`, the UI text
  items, `placement-test`, grammar A1–C1, `grammar-structure`.
- Running now: `grammar-start-book`.
- Then: verb conjugation, beginner path, vocabulary A1–C2, skills, exams, CCSE and the other
  conversions, culture, games, teachers, Business Spanish, routes, cleanup, four UI languages,
  `deploy-readme`.
- Builds are green and `check:base` is ok. Nothing is merged into `main` yet.

**icanspeak-english: 0 of 11, waiting.** Its queue moves it under `/english/`:
1. `base-path`
2. `link-check`
3. `brand`
4. `brand-theme`
5. `ui-lang-routing`
6. UI languages de, es, pt, fr, it
7. `deploy-readme`

Its earlier content migration from German to English is finished and merged; the old queue is
archived as `QUEUE-content.md`.

## Future courses: French, Portuguese, Italian

Queued in overclaude (November 4, 2026), not started: `projects\icanspeak-french`,
`icanspeak-portuguese` and `icanspeak-italian`, about 50 items each. Each starts after the Spanish
queue is done and merged, as a copy of icanspeak-spanish (clone, remove origin; don't use "Init
git"), with its course logos made on `main` first. Setup steps are at the top of each `QUEUE.md`.

- Base paths `/french`, `/portuguese`, `/italian`; branch `content`; preview ports 4323–4325.
- Varieties: fr-FR with fr-CA notes; **pt-PT (European)** with pt-BR notes; it-IT with regional
  notes only.
- Exams: DELF/DALF + TCF/TEF; CAPLE (CIPLE A2 for nationality); CILS/CELI/PLIDA/CERT.IT.
- Life modules: Préfecture sim; AIMA and Finanças sim; Questura and Comune sim, plus each
  country's civic test and driving vocabulary.
- UI languages: English base plus the other four of de, es, fr, pt, it.
- At go-live each needs its own Vercel project and rewrite, like `/english` and `/spanish`.

## Open

1. Review the Spanish branch (`content`) once its queue is done, then merge into `main`.
   Spot-check the reports for "to verify" exam and immigration facts.
2. Run the English queue, review, and merge.
3. Create the two Vercel projects (static, output `dist/`) and add the two rewrites above to this
   repo's `vercel.json`.
4. Link the courses from this site (home and nav).
5. Optional: swap the outlined logo SVGs into this repo (see Brand).
6. Audio: both courses use the browser voice only. Real TTS needs a provider behind
   `BACKEND.speech`.
