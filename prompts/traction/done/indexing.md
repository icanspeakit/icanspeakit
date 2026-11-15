# Done: lane indexing

## What changed
**Hub (`apps/hub`), commit c2b6f175.** All generated from `src/data/courses.ts` (`live: true`), so a course going live shows up by itself.
- `/robots.txt` (`src/pages/robots.txt.ts`): Disallow lines of every live course under its base (`design-system`, `newfont`, `inhalt/`), `Content-Signal: search=yes, ai-input=yes, ai-train=no`, search/answer bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User, Bingbot, Googlebot) allowed, training bots blocked, one `Sitemap:` line for the index and one per live course.
- `/sitemap.xml` = sitemap index: `/sitemap-hub.xml` (home) + `/english|espanol|francais/sitemap.xml`. Linguistics has no sitemap yet (see Open); once it has, add its slug to `SECTIONS_WITH_SITEMAP` in `courses.ts`.
- `/llms.txt`: what icanspeak is, one line per live course linking that course's `llms.txt`, and a link to linguistics.
- Verification tags on the home page (`Brand.astro`): `msvalidate.01` and `google-site-verification`, from `PUBLIC_BING_VERIFICATION` / `PUBLIC_GOOGLE_VERIFICATION` (env at build time) or by editing `src/data/verification.ts`. Empty = no tag.
- IndexNow: key file `apps/hub/public/00efb5e51d6717a1ceb470fb989cb504.txt`, key in `verification.ts`, `scripts/indexnow.mjs`. Dry run by default; `--send` submits to api.indexnow.org. Reads the live sitemap index. deutschacademy has no IndexNow script, so this is new.
  **Deviation:** the sitemaps have no `<lastmod>`, so `--since <git ref>` cannot work. Instead: `--prefix /english/downloads` (repeatable) for a section just shipped, `--new` for URLs never submitted (state in `scripts/.indexnow-state.json`, gitignored), `--origin` to read sitemaps from another origin (tested against a local copy of the hub build).
- Hub build and `check:base` pass.

**English (`apps/english`), commit 9ba96183.**
- Bug fixed: `Layout.astro` compared the path including `/english` with `"/"`, so the course home never emitted Organization/WebSite JSON-LD and section pages never got a BreadcrumbList. Now uses `stripBase`. Verified in a build: home has Organization + WebSite, `/cambridge/b1` has the right breadcrumb.
- `llms-txt.mjs`: section headings were German ("Einstieg", "Prüfungen" …), now English. Added "For teachers" → `/teachers/worksheets` and "Free downloads" → `/downloads` and `/<lang>/downloads` (skipped until those pages are built). 9.2 KB, under the 10 KB budget.

## For the downloads and worksheets lanes
- **Sitemap: no hook needed.** `src/integrations/sitemap.mjs` reads the built HTML; any new indexable page is in the next build's `/english/sitemap.xml` automatically (a `noindex` meta or meta-refresh keeps it out).
- **llms.txt:** the downloads lane's pages are picked up if they are `/english/downloads` or `/english/<lang>/downloads`; any other path needs a line in `SECTIONS` in `llms-txt.mjs`. Do NOT add `/teachers/worksheets/*`: that section already has ~300 pages and would take llms.txt to ~90 KB. Only the index is listed.
- `check:links` currently fails on `https://icanspeak.it/francais/ (outside /english) <- /english/` (the language switcher link to another course app, not from my lane). `pnpm --filter englishacademy build` was also failing at `check:content` at ~12:30 with missing i18n keys `ab.newVersion`, `ab.newVersionTitle`, `ab.original`, `ga.worksheet`, `ga.worksheet.title` in de/es/pt/fr/it: the worksheets lane's work in progress.

## Tier 3 spot check (live pages, 11 URLs)
All have canonical (correct, no trailing slash), `lang`, one `<h1>`; descriptions all ≤ 160 except `/teachers/timetable` (188). hreflang only on entry pages (home, knowledge, grammar, placement-test: 13 each), by design. Titles over 60 characters, left for Edgar because they are copy decisions:
- `/english` 72: "icanspeak English – practise English for free: Cambridge, IELTS, Trinity" (default in `Layout.astro`)
- `/english/knowledge` 65, `/english/grammar/verbs` 67, `/english/ielts` 68, `/english/de/knowledge` 74, `/english/teachers/timetable` 67 (description 188 too).
- Top-level section pages (`/grammar`, `/ielts`, `/teachers`, `/exams`) have no JSON-LD at all (no parent, so no breadcrumb). Not added.
- Old-brand leftovers inside the Organization JSON-LD now that it is emitted on the home: `email: hello@englishacademy.com` and `sameAs` instagram.com/englishacademy_com (`src/lib/seo/jsonld.ts`, `src/lib/legal.js`). Check that these are really icanspeak's.

## Cloudflare robots.txt override
Not verifiable before deploy. Before this, the hub had no robots.txt and the Cloudflare managed text was served. With a file on the origin, Cloudflare's "Manage robots.txt" **prepends** its managed block (Content-Signals, and AI-bot Disallow lines if "Block AI bots" is on) to ours instead of replacing it. After the release lane deploys, run `curl -s https://icanspeak.it/robots.txt`: our `User-agent: *` block and the `Sitemap:` lines must be there, and no `Disallow: /` for OAI-SearchBot / ChatGPT-User / Bingbot.

## ⛔ EDGAR
1. Bing Webmaster Tools → Add site → import from Google Search Console (easiest, after item 2), or "HTML Meta Tag": copy the `content` value into `BING_VERIFICATION` in `apps/hub/src/data/verification.ts` (or `PUBLIC_BING_VERIFICATION` at build), release, then Verify. Then Sitemaps → submit `https://icanspeak.it/sitemap.xml`.
2. Google Search Console → Add property → Domain `icanspeak.it` → copy the TXT record → Cloudflare → icanspeak.it → DNS → Add record (TXT, name `@`) → Verify → Sitemaps → submit `https://icanspeak.it/sitemap.xml`.
3. After the release: Cloudflare → icanspeak.it → Security → Settings (or AI Crawl Control) → "Manage robots.txt" / "Block AI bots": check the live robots.txt as described above; switch the managed block off if it contradicts ours.
4. After the release: `node scripts/indexnow.mjs` (dry run), then `node scripts/indexnow.mjs --send` (run by the release lane with you).

## Open (not mine)
- Linguistics has no sitemap and no robots lines (`/linguistics/sitemap*.xml` and `/linguistics/robots.txt` are 404), so it is not in the index. A sitemap integration in `apps/linguistics` would fix it; then add `'linguistics'` to `SECTIONS_WITH_SITEMAP`.
- `apps/portuguese` and `apps/italian` `robots.txt` templates still say `/spanish/` (copy-paste). Fix when those courses go live.

## Commits
c2b6f175 feat(hub): root robots.txt, sitemap index, llms.txt, verification tags and IndexNow
9ba96183 fix(english): home Organization/WebSite JSON-LD and breadcrumbs under /english; English llms.txt headings
