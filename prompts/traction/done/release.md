# Lane release: done (2026-11-15)

*Run from the worksheets session at Edgar's "go". Tier 1 by a background agent, Tier 2 here.*

## Tier 1 (verify): all pass
- Hub and English build; english `check:base`, `check:links` (2,212 URLs, 0 broken), `check:downloads`;
  `check:parity` no new errors (the 106 are Portuguese/Italian, not live).
- The 11 official sample-paper links answer 200. 27 PDFs on disk match the manifest.
- Playwright at 1280×800 and 390×844: no horizontal scroll on `/english/knowledge`, the worksheet
  index and three worksheets. Screenshots: `_tmp_screens/traction-release/` (not committed).

## Tier 2 (merge and deploy): already done by another session
- `origin/main` was at `28da2334` (21:16), which contains the whole batch (`3e4d5ebe` included).
  Only `e7815ca4` (another session's nav style) is on `monorepo` but not on `main`; not pushed by me.
- `icanspeak-english` was deployed 2026-11-15 21:30 UTC (version `ef89977d`), by another session.
  `icanspeak-hub` last deployed 13:21 UTC; its robots/sitemap/llms are live, so no hub redeploy was
  needed for this batch. The hub has two later commits that are not live (`18494454` hub part:
  `/italiano`, `/portugues` slugs and redirects; `4a0b4ee6` favicon). Not deployed by me: not part
  of this batch.
- Live check, one request each: worksheet present-perfect (new title, "New version" button),
  `/english/knowledge`, `/english/es/downloads`, a PDF, `/sitemap.xml`, `/llms.txt`, the IndexNow key
  file: all 200 and current. `robots.txt`: Cloudflare's block disallows only training bots
  (GPTBot, ClaudeBot, CCBot …); OAI-SearchBot, ChatGPT-User, Bingbot, Googlebot are allowed.

## IndexNow
- 590 URLs (`/english/knowledge`, `/english/{de,es,fr,it,pt}/downloads`, everything under
  `/english/teachers`) sent to `https://www.bing.com/indexnow`: 200 OK.
- `api.indexnow.org` (the endpoint in `scripts/indexnow.mjs`) resets the connection from this
  machine; Bing's endpoint shares submissions with the other IndexNow engines. Worth an
  `--endpoint` option in the script.
- In Git Bash, `--prefix /english/...` gets turned into a Windows path (0 URLs). Run with
  `MSYS_NO_PATHCONV=1` or from PowerShell.

## For Edgar (each one line)
1. Bing Webmaster Tools → Add site → import from Search Console or verify with the meta tag → Sitemaps → submit `https://icanspeak.it/sitemap.xml`.
2. Google Search Console → Add property → Domain `icanspeak.it` → TXT record in Cloudflare DNS (name `@`) → Sitemaps → same URL.
3. Outreach: send #1 Deutscher Bildungsserver first, then one or two a week (`prompts/traction/done/outreach.md`).
4. Decide: deploy the hub (`pnpm --filter @icanspeak/hub run deploy`) to ship `/italiano`, `/portugues` redirects and the new favicon.
5. Optional: publish the 14 draft worksheets (`"status": "geprueft"` in each topic file).
6. Fix someday: 404 page title is German; English `llms.txt` is 10.8 KB (over its 10 KB budget); Organization JSON-LD still has `englishacademy` email/Instagram.

## Re-measure
- 2026-12-13 (4 weeks): PostHog project 344818, `utm_source = chatgpt.com` and referring domain bing/google, for `/english/knowledge`, `/english/*/downloads`, `/english/teachers/worksheets/*`.

## Update (later the same evening, worksheets session)
- The 21:30 English deploy (`ef89977d`) was incomplete: a second English build rewrote `dist` while
  it uploaded (e.g. `/english/audio/hoeren/*.mp3` 404). Redeployed from one clean build
  (`check:base` and `check:links` ok): `icanspeak-english` `ea9ecafa-184c-4182-b318-29e31cf3be5d`,
  1,676 missing assets uploaded.
- Hub deployed too: `icanspeak-hub` `3d24b17a-63b0-4af2-a56e-e62182c67c87` (`check:base` ok), so
  item 4 above is done (`/italiano`, `/portugues` redirects and the new favicon are live).
- `main` pushed to `e7815ca4` (= what is deployed).
- IndexNow sent once more, 582 URLs under worksheets/knowledge/downloads, Bing 200 OK.
- Live check after both deploys, one request each: `/`, worksheet, `/english/knowledge`, a PDF, a
  listening MP3, `/robots.txt`, `/sitemap.xml`, `/llms.txt`: 200; a missing page: 404.
