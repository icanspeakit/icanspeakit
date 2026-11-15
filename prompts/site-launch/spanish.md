# Lane: spanish (icanspeak.it/spanish/), after English is live

Run only after the English release. Copy what apps/english did (its token mapping block, header,
footer, home page) instead of solving it again; the branding is identical, only the pill says "español".
When done, deploy it yourself after Edgar's ok: `pnpm --filter @icanspeak/spanish deploy`, add the
Spanish route to DEPLOY.md and set spanish live in apps/hub/src/data/courses.ts (and redeploy the hub).

You own `apps/spanish/**`. The Spanish course is finished (overclaude queue done, merged on
2026-11-07, base path `/spanish`, Cloudflare config in `wrangler.jsonc`). This lane only puts it in the
new brand and checks it is deployable.

## Tier 1: check it still builds
`pnpm --filter @icanspeak/spanish build` (with the lock), `check:base`, `cf:prepare` →
`cf-dist/spanish/`. Count the files (must stay under 20,000). Fix anything broken first, as its own commit.

## Tier 2: the new brand
Same as `english.md` tier 4, for apps/spanish: kit files per MANIFEST, token mapping in global.css
(the app still wears the deutschacademy teal/orange tokens it inherited), fonts, header/footer with the
wordmark and the yellow course pill "español", home page in the tile world following
`design/english-landing/D-canspeak-tiles.dc.html` with Spanish copy (Castilian, tú; the text exists in
the app's current home and es strings: reuse it, don't invent claims), five-languages glass band,
placement band. Sweep hard-coded teal/orange. 6 page types: home, a grammar topic, vocabulary, a DELE
page, a game, the placement test.

## Tier 3
README "Deploy" section up to date (it exists from the overclaude run: check it), browser checks,
done file, commit.
