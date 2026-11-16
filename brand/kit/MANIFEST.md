# Where the kit goes

Copy, don't link: each app is deployed on its own and must stay self-contained. Keep the old logo
files until no page references them, then delete them in the same commit as the last reference.

| Kit file | hub | english / spanish (/french, /portuguese, /italian) | linguistics |
|---|---|---|---|
| `logos/*.svg`, `logos/*.png` | `apps/hub/public/logos/` | `apps/<lang>/public/logos/` | `apps/linguistics/public/logos/` |
| `icons/favicon.svg` | `public/favicon.svg` | `public/favicon.svg` (add the `<link>`, the course Layout has none yet) | `public/favicon.svg` |
| `icons/favicon.ico` | `public/favicon.ico` | `public/favicon.ico` | `public/favicon.ico` |
| `icons/favicon-16.png`, `-32.png` | `public/favicon-32.png` | `public/favicon-16x16.png`, `public/favicon-32x32.png` (names the Layout uses) | `public/favicon-16.png`, `public/favicon-32.png` |
| `icons/apple-touch-icon.png` | `public/apple-touch-icon.png` | `public/apple-touch-icon.png` | `public/apple-touch-icon.png` |
| `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | – | `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` + `site.webmanifest` | – |
| `icons/og-default.png` | `public/og-default.png` | `public/og/og-default.png` (keep page-specific OG images) | `public/og-default.png` |
| `fonts/*.woff2` + `fonts.css` rules | `public/fonts/icanspeak/` | `public/fonts/icanspeak/` | `public/fonts/icanspeak/` |
| `tokens.css` | import in `src/styles/hub.css` | import at the top of `src/styles/global.css`, then map the app's tokens | import in `src/styles/global.css` |
| `tiles.css` | `src/styles/tiles.css` | `src/styles/tiles.css` | only if a page uses tiles |
| `BRAND.md` | – | replaces `docs/brand/BRAND.md` (keep a line "copied from brand/kit/BRAND.md on <date>") | – |

Bump the favicon cache key (`?v=2` → `?v=3`) in every Layout that uses one.
Under a base path, build every URL with the app's base-aware helper (`u()` in linguistics,
the courses' URL helpers): never a root-absolute `/logos/…` in apps/english, apps/spanish or apps/linguistics.
