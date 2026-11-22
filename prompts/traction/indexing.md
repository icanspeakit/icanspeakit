# Lane: indexing (step 1)

You own `apps/hub/**` (it serves https://icanspeak.it/ and everything no other Worker claims) and
the robots/sitemap/llms lines of the course apps. Goal: Bing, Google and ChatGPT can find every
course page, and Edgar can verify the site in Bing and Google in two clicks.

## Tier 1: root robots.txt and sitemap index
- Find out what serves `https://icanspeak.it/robots.txt` today (`curl -s`; it is Cloudflare's
  managed Content-Signals text, with no `User-agent` rules and no `Sitemap:` line). Check
  `apps/hub` (public/, wrangler config, routes) and `DEPLOY.md`.
- Give the hub a real `public/robots.txt`, built from the course templates
  (`apps/*/public/robots.txt` say they are "the template for the /<base> lines to merge there"):
  the Disallow lines of every live course under its base, the same AI policy as
  `deutschacademy/public/robots.txt` (search and answers yes, training no:
  `Content-Signal: search=yes, ai-input=yes, ai-train=no`; OAI-SearchBot, ChatGPT-User,
  PerplexityBot, Bingbot, Googlebot allowed), and one `Sitemap:` line per live app.
- Add a root `sitemap.xml` (sitemap index) on the hub listing the hub's own sitemap and
  `https://icanspeak.it/english/sitemap.xml`, `/espanol/sitemap.xml`, `/francais/sitemap.xml`,
  `/linguistics/…` (whatever is live; read `apps/hub/src/data/courses.ts`). Generate it from that
  data, not by hand, so a new course shows up by itself.
- Root `llms.txt` on the hub: what icanspeak is, one section per live course linking its `llms.txt`.
- Note in your done file whether Cloudflare's managed robots.txt overrides a file served by the
  Worker (Cloudflare dashboard → Security → Bots / AI Crawl Control → "Manage robots.txt"). If it
  does, that is an ⛔ EDGAR click; write the exact path.

## Tier 2: verification and IndexNow
- Bing: add support for a `msvalidate.01` meta tag on the hub home page (value from an env var
  or one constant, empty = no tag). Same for `google-site-verification`. Look at how
  `deutschacademy/src/layouts/Layout.astro` does it. Domain-level verification is enough, so only
  the hub needs the tag.
- IndexNow (Bing, Yandex, Seznam; Bing feeds ChatGPT search): a key file on the hub
  (`/<key>.txt`) and `scripts/indexnow.mjs` at the repo root that reads the live sitemaps and
  submits changed URLs (`--since <git ref>` or all) to `https://api.indexnow.org/indexnow`.
  Don't run it against production yet; dry-run prints what it would send. The release lane runs it.
- Check `deutschacademy` for an existing IndexNow script and reuse its approach if there is one.

## Tier 3: per-page signals on the English course
- Spot-check 10 English course pages (home, /knowledge, a grammar topic, an exam page, a teacher
  page): canonical, hreflang (if the app emits it), JSON-LD, title ≤ 60 chars, description
  ≤ 160 chars, `lang` attribute. Fix what is broken in `apps/english` only if it is small and
  clearly yours; list the rest in the done file.
- Make sure the new routes the `downloads` and `worksheets` lanes add land in the sitemap and
  `llms.txt` automatically (read `apps/english/src/integrations/sitemap.mjs` and the llms
  integration). If they need a hook, add it and tell those lanes in your done file.

## ⛔ EDGAR (list them in the done file, don't wait for them)
1. Bing Webmaster Tools → Add site → import from Google Search Console, or meta-tag verification
   with the value to put into the constant/env var. Then Sitemaps → submit `https://icanspeak.it/sitemap.xml`.
2. Google Search Console → Domain property `icanspeak.it` (DNS TXT in Cloudflare) → submit the sitemap.
3. Cloudflare robots.txt setting, if Tier 1 found it overrides ours.
